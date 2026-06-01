import fs from 'fs';
import path from 'path';
import { STORAGE_PATH } from './ftp.js';
import { processMonthlyExcelBuffer } from '../controllers/productionPlan.controller.js';

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // Checks every 5 minutes

export function startSapAutomator() {
  console.log(`[SAP Automator] Started. Watching FTP storage for new plans...`);

  // Create archive directory if it doesn't exist to prevent infinite loops
  const archivePath = path.join(STORAGE_PATH, 'archive');
  if (!fs.existsSync(archivePath)) {
    fs.mkdirSync(archivePath, { recursive: true });
  }

  setInterval(async () => {
    try {
      const files = fs.readdirSync(STORAGE_PATH);
      
      // Look for Excel files that are specifically formatted/dropped by SAP
      // Adjust the prefix 'sap_' if SAP drops files with a specific naming convention
      const excelFiles = files.filter(f => 
        (f.endsWith('.xlsx') || f.endsWith('.xls')) && 
        fs.statSync(path.join(STORAGE_PATH, f)).isFile()
      );

      for (const file of excelFiles) {
        const filePath = path.join(STORAGE_PATH, file);
        console.log(`[SAP Automator] Found new plan from SAP: ${file}. Processing...`);

        try {
          const fileBuffer = fs.readFileSync(filePath);
          const currentYear = new Date().getFullYear();
          const defaultManpower = {}; 

          // System automated sync implies no specific userId, pass null or a system ID
          const result = await processMonthlyExcelBuffer(fileBuffer, currentYear, defaultManpower, null);
          
          if (result.success) {
            console.log(`[SAP Automator] Successfully processed ${file}: Created ${result.summary.created}, Updated ${result.summary.updated}`);
            
            // Move file to archive to prevent reprocessing
            const archiveFilePath = path.join(archivePath, `${Date.now()}_${file}`);
            fs.renameSync(filePath, archiveFilePath);
          }
        } catch (fileErr) {
          console.error(`[SAP Automator] Failed to process file ${file}:`, fileErr.message);
          // If the file is corrupted, move it to an error folder so it doesn't block the queue
          const errorPath = path.join(STORAGE_PATH, 'error');
          if (!fs.existsSync(errorPath)) fs.mkdirSync(errorPath);
          fs.renameSync(filePath, path.join(errorPath, `${Date.now()}_${file}`));
        }
      }
    } catch (err) {
      console.error('[SAP Automator] Directory sweep error:', err.message);
    }
  }, CHECK_INTERVAL_MS);
}