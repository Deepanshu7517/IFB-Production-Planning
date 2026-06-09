import '../env.js'; // ensures dotenv runs before anything else
import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { BOM } from '../models/master.model.js';

// ── Folder to watch ───────────────────────────────────────────────────────────
// In production (pkg binary), watch folder next to the exe
// In dev, watch a local folder in the project
export const WATCH_FOLDER = process.pkg
  ? path.join(path.dirname(process.execPath), 'bom-uploads')
  : path.join(process.cwd(), 'bom-uploads');

export const PROCESSED_FOLDER = process.pkg
  ? path.join(path.dirname(process.execPath), 'bom-processed')
  : path.join(process.cwd(), 'bom-processed');

// Ensure folders exist
if (!fs.existsSync(WATCH_FOLDER))     fs.mkdirSync(WATCH_FOLDER,     { recursive: true });
if (!fs.existsSync(PROCESSED_FOLDER)) fs.mkdirSync(PROCESSED_FOLDER, { recursive: true });

// Processing lock — prevents double-processing if two files arrive at once
let isProcessing = false;
let watcherInstance = null;
let latestProcessingResult = null;
const retryTimers = new Map();

const scheduleRetry = (watcher, filePath, delayMs, reason) => {
  if (retryTimers.has(filePath)) return;

  console.warn(`[WATCHER] ${reason}. Retrying ${path.basename(filePath)} in ${Math.round(delayMs / 1000)}s.`);
  const timer = setTimeout(() => {
    retryTimers.delete(filePath);
    if (fs.existsSync(filePath)) watcher.emit('add', filePath);
  }, delayMs);

  retryTimers.set(filePath, timer);
};

// ── Process a single BOM Excel file ──────────────────────────────────────────
async function processBomFile(filePath) {
  const fileName = path.basename(filePath);
  console.log(`\n[WATCHER] Processing: ${fileName}`);

  try {
    const workbook  = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const rawRows   = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1, defval: '',
    });

    if (rawRows.length < 2) {
      console.log(`[WATCHER] Skipping ${fileName} — no data rows`);
      latestProcessingResult = { success: false, file: fileName, message: 'No data rows' };
      return latestProcessingResult;
    }

    const bomMap = {};
    let skipped  = 0;

    for (let i = 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || row.every(c => c === '' || c == null)) { skipped++; continue; }

      const partNumber  = String(row[1] ?? '').trim();
      const partName    = String(row[2] ?? '').trim();
      const partCode    = String(row[4] ?? '').trim();
      const qty         = parseFloat(row[5]) || 0;
      const unit        = String(row[6] ?? '').trim() || 'EA';
      const description = String(row[7] ?? '').trim();

      if (!partNumber) { skipped++; continue; }

      if (!bomMap[partNumber]) {
        bomMap[partNumber] = { partNumber, partName, childPartList: [] };
      } else {
        if (!bomMap[partNumber].partName && partName) bomMap[partNumber].partName = partName;
      }

      if (partCode) {
        const dup = bomMap[partNumber].childPartList.some(
          c => c.partCode === partCode && c.qty === qty
        );
        if (!dup) bomMap[partNumber].childPartList.push({ partCode, description, qty, unit });
      }
    }

    const incoming = Object.values(bomMap);
    if (incoming.length === 0) {
      latestProcessingResult = { success: false, file: fileName, message: 'No valid BOM data found' };
      return latestProcessingResult;
    }

    const childHash = list =>
      [...list]
        .sort((a, b) => a.partCode.localeCompare(b.partCode) || a.qty - b.qty)
        .map(c => `${c.partCode}|${c.description}|${c.qty}|${c.unit}`)
        .join(';;');

    let created = 0, updated = 0, unchanged = 0;

    for (const inc of incoming) {
      const existing = await BOM.findOne({ partNumber: inc.partNumber });

      if (!existing) {
        await BOM.create({ ...inc, price: 0, lastUpdated: new Date() });
        created++;
      } else {
        const nameChanged     = existing.partName !== inc.partName;
        const childrenChanged = childHash(existing.childPartList ?? []) !== childHash(inc.childPartList);

        if (nameChanged || childrenChanged) {
          await BOM.findByIdAndUpdate(existing._id, {
            partName:      inc.partName,
            childPartList: inc.childPartList,
            lastUpdated:   new Date(),
          });
          updated++;
        } else {
          unchanged++;
        }
      }
    }

    // Move processed file to processed folder with timestamp
    const timestamp    = new Date().toISOString().replace(/[:.]/g, '-');
    const destFileName = `${timestamp}_${fileName}`;
    const destPath     = path.join(PROCESSED_FOLDER, destFileName);
    fs.renameSync(filePath, destPath);

    const result = {
      success:   true,
      file:      fileName,
      created,
      updated,
      unchanged,
      total:     incoming.length,
      skipped,
      processed: new Date().toISOString(),
    };

    console.log(`[WATCHER] Done: created=${created} updated=${updated} unchanged=${unchanged}`);
    console.log(`[WATCHER] Moved to processed: ${destFileName}`);

    // Write a result log next to the processed file
    fs.writeFileSync(
      path.join(PROCESSED_FOLDER, `${timestamp}_result.json`),
      JSON.stringify(result, null, 2)
    );

    latestProcessingResult = result;
    return result;

  } catch (err) {
    console.error(`[WATCHER] Error processing ${fileName}:`, err.message);

    // Move to processed folder even on error so it doesn't get re-processed
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      fs.renameSync(filePath, path.join(PROCESSED_FOLDER, `${timestamp}_ERROR_${fileName}`));
    } catch { /* silent */ }

    latestProcessingResult = { success: false, file: fileName, error: err.message };
    return latestProcessingResult;
  }
}

// ── Get the latest result for API status endpoint ─────────────────────────────
export function getLatestProcessingResult() {
  if (latestProcessingResult) return latestProcessingResult;

  try {
    const files = fs.readdirSync(PROCESSED_FOLDER)
      .filter(f => f.endsWith('_result.json'))
      .sort()
      .reverse();

    if (files.length === 0) return null;
    return JSON.parse(fs.readFileSync(path.join(PROCESSED_FOLDER, files[0]), 'utf8'));
  } catch {
    return null;
  }
}

// ── Start watching the folder ─────────────────────────────────────────────────
export function startFolderWatcher() {
  if (watcherInstance) {
    console.log('[WATCHER] Folder watcher already running');
    return watcherInstance;
  }

  console.log(`[WATCHER] Watching for BOM files in: ${WATCH_FOLDER}`);
  console.log(`[WATCHER] Processed files go to:     ${PROCESSED_FOLDER}`);

  const watcher = chokidar.watch(WATCH_FOLDER, {
    persistent:    true,
    ignoreInitial: false,      // Process files already in folder on startup
    awaitWriteFinish: {        // Wait for file to finish writing before processing
      stabilityThreshold: 2000,
      pollInterval:        100,
    },
    ignored: /(^|[\/\\])\../,  // Ignore hidden files
  });

  watcher.on('add', async filePath => {
    if (!/\.(xlsx|xls)$/i.test(filePath)) return;
    if (!fs.existsSync(filePath)) return;
    if (BOM.db.readyState !== 1) {
      scheduleRetry(watcher, filePath, 5000, 'Database is not connected');
      return;
    }
    if (isProcessing) {
      console.log(`[WATCHER] Already processing — queuing ${path.basename(filePath)}`);
      // Wait and retry
      scheduleRetry(watcher, filePath, 3000, 'Another BOM file is being processed');
      return;
    }
    isProcessing = true;
    try {
      await processBomFile(filePath);
    } finally {
      isProcessing = false;
    }
  });

  watcher.on('error', err => console.error('[WATCHER] Error:', err));
  watcher.on('ready', () => console.log('[WATCHER] Ready'));

  watcherInstance = watcher;
  return watcher;
}
