import express from "express";
import multer from "multer";
import xlsx from "xlsx";
import path from "path";
import fs from "fs";
import {
  Plant,
  AssemblyLine,
  Model,
  BOM,
  Matrix,
  AppUser,
} from "../models/master.model.js";
import {
  uploadToFtp,
  downloadFromFtp,
  TEMP_PATH,
  cleanupTemp,
} from "../lib/ftp.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
// import express from "express";
// import multer from "multer";
// import xlsx from "xlsx";
// import { Plant, AssemblyLine, Model, BOM, Matrix, AppUser } from "../models/master.model.js";

// const router = express.Router();
// const upload = multer({ storage: multer.memoryStorage() });

// =============================================================================
// UTILITY — auto-generate human-readable IDs
// =============================================================================
const generateId = async (MongooseModel, idField, prefix) => {
  const last = await MongooseModel.findOne()
    .sort({ [idField]: -1 })
    .lean();
  if (!last || !last[idField]) return `${prefix}001`;
  const n = parseInt(last[idField].replace(prefix, ""), 10);
  return `${prefix}${(n + 1).toString().padStart(3, "0")}`;
};

// =============================================================================
// SNAPSHOT BUILDERS
// Each builder fetches the parent from DB and returns the denormalized
// snapshot to embed in the child document.
// =============================================================================

/** Snapshot embedded inside AssemblyLine */
const buildPlantSnapshot = async (plantObjId) => {
  const p = await Plant.findById(plantObjId).lean();
  if (!p) return null;
  return { _id: p._id, plantId: p.plantId, plantName: p.plantName };
};

/** Snapshot (with plant inside) embedded inside Model */
const buildAssemblyLineSnapshot = async (assemblyLineObjId) => {
  const al = await AssemblyLine.findById(assemblyLineObjId).lean();
  if (!al) return null;
  return {
    _id: al._id,
    assemblyLineId: al.assemblyLineId,
    assemblyLineName: al.assemblyLineName,
    capacity: al.capacity,
    plant: al.plant, // already-built snapshot stored inside AssemblyLine
  };
};

/** Snapshot (with full ancestry) embedded inside BOM */
const buildModelSnapshot = async (modelObjId) => {
  const m = await Model.findById(modelObjId).lean();
  if (!m) return null;
  return {
    _id: m._id,
    modelId: m.modelId,
    modelName: m.modelName,
    assemblyLine: m.assemblyLine, // already-built snapshot stored inside Model
  };
};

/**
 * BOM snapshot embedded inside Matrix.
 * plantCode intentionally excluded — plant context comes from model.assemblyLine.plant.
 */
const buildBomSnapshot = async (partNumber) => {
  const b = await BOM.findOne({ partNumber }).lean();
  if (!b) return null;
  return {
    _id: b._id,
    partNumber: b.partNumber,
    partName: b.partName,
    // price: b.price ?? 0,
    childPartList: b.childPartList ?? [],
  };
};
const buildBomSnapshotFromDoc = (b) => ({
  _id: b._id,
  partNumber: b.partNumber,
  partName: b.partName,
  childPartList: b.childPartList ?? [],
});

// const buildMatrixRow = (bomDoc, matrixDoc = null) => ({
//   _id: matrixDoc?._id ?? bomDoc._id,
//   matrixId: matrixDoc?._id ?? null,
//   bomId: bomDoc._id,
//   model: bomDoc.model,
//   bom: buildBomSnapshotFromDoc(bomDoc),
//   shift: matrixDoc?.shift ?? "",
//   manpowerAvailability: matrixDoc?.manpowerAvailability ?? 0,
//   isAutoMapped: true,
//   createdAt: matrixDoc?.createdAt ?? bomDoc.createdAt,
//   updatedAt: matrixDoc?.updatedAt ?? bomDoc.updatedAt,
// });
const buildMatrixRow = (bomDoc, matrixDoc = null) => ({
  _id: bomDoc._id,
  matrixId: matrixDoc?._id ?? null,
  bomId: bomDoc._id,
  model: bomDoc.model,
  bom: buildBomSnapshotFromDoc(bomDoc),
  shift: matrixDoc?.shift || "A",
  manpowerAvailability: matrixDoc?.manpowerAvailability ?? 0,
  isAutoMapped: true,
  createdAt: matrixDoc?.createdAt ?? bomDoc.createdAt,
  updatedAt: matrixDoc?.updatedAt ?? bomDoc.updatedAt,
});
// const getAutoMappedMatrixRows = async () => {
//   const [bomDocs, matrixDocs] = await Promise.all([
//     BOM.find({ "model.modelId": { $exists: true, $ne: "" } }).lean(),
//     Matrix.find().lean(),
//   ]);

//   const matrixByPartNumber = new Map(
//     matrixDocs
//       .filter((m) => m.bom?.partNumber)
//       .map((m) => [m.bom.partNumber, m]),
//   );

//   return bomDocs.map((bomDoc) =>
//     buildMatrixRow(bomDoc, matrixByPartNumber.get(bomDoc.partNumber)),
//   );
// };
const getAutoMappedMatrixRows = async () => {
  const bomDocs = await BOM.find({
    "model.modelId": { $exists: true, $ne: "" },
  }).lean();

  const activePartNumbers = bomDocs.map((b) => b.partNumber);

  // Remove Matrix rows whose BOM no longer exists or no longer has a Model
  await Matrix.deleteMany({
    "bom.partNumber": { $nin: activePartNumbers },
  });

  const rows = [];

  for (const bomDoc of bomDocs) {
    const existingMatrix = await Matrix.findOne({
      "bom.partNumber": bomDoc.partNumber,
    }).lean();

    const matrixDoc = await Matrix.findOneAndUpdate(
      { "bom.partNumber": bomDoc.partNumber },
      {
        $set: {
          model: bomDoc.model,
          bom: buildBomSnapshotFromDoc(bomDoc),
          shift: existingMatrix?.shift || "A",
          manpowerAvailability: existingMatrix?.manpowerAvailability ?? 0,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    ).lean();

    rows.push(buildMatrixRow(bomDoc, matrixDoc));
  }

  return rows;
};
const upsertMatrixShift = async ({ bomPartNumber, shift }) => {
  const selectedShift = shift || "A";
  if (!["A", "B", "C"].includes(selectedShift)) {
    const err = new Error("Shift must be A, B, or C");
    err.statusCode = 400;
    throw err;
  }

  const bomDoc = await BOM.findOne({ partNumber: bomPartNumber }).lean();

  if (!bomDoc) {
    const err = new Error(`BOM not found: ${bomPartNumber}`);
    err.statusCode = 400;
    throw err;
  }

  if (!bomDoc.model?.modelId) {
    const err = new Error(
      `BOM "${bomPartNumber}" has no Model assigned yet. Edit the BOM first to set its Model.`,
    );
    err.statusCode = 400;
    throw err;
  }

  const matrixDoc = await Matrix.findOneAndUpdate(
    { "bom.partNumber": bomPartNumber },
    {
      $set: {
        model: bomDoc.model,
        bom: buildBomSnapshotFromDoc(bomDoc),
        // shift,
        shift: selectedShift,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();

  return buildMatrixRow(bomDoc, matrixDoc);
};
// =============================================================================
// GET /api/masters/hierarchy
// Returns the full Plant → AssemblyLine → Model → BOM tree in one call.
// Useful for tree-view UIs or bulk reads.
// =============================================================================
router.get("/hierarchy", async (req, res) => {
  try {
    const [plants, assemblyLines, models, boms] = await Promise.all([
      Plant.find().lean(),
      AssemblyLine.find().lean(),
      Model.find().lean(),
      BOM.find().lean(),
    ]);

    const tree = plants.map((plant) => {
      const plantLines = assemblyLines.filter(
        (al) => al.plant?._id?.toString() === plant._id.toString(),
      );

      return {
        _id: plant._id,
        plantId: plant.plantId,
        plantName: plant.plantName,

        assemblyLines: plantLines.map((al) => {
          const lineModels = models.filter(
            (m) => m.assemblyLine?._id?.toString() === al._id.toString(),
          );

          return {
            _id: al._id,
            assemblyLineId: al.assemblyLineId,
            assemblyLineName: al.assemblyLineName,
            capacity: al.capacity,

            models: lineModels.map((m) => {
              const modelBoms = boms.filter(
                (b) => b.model?._id?.toString() === m._id.toString(),
              );

              return {
                _id: m._id,
                modelId: m.modelId,
                modelName: m.modelName,

                boms: modelBoms.map((b) => ({
                  _id: b._id,
                  partNumber: b.partNumber,
                  partName: b.partName,
                  // price: b.price,
                  childPartList: b.childPartList,
                  lastUpdated: b.lastUpdated,
                })),
              };
            }),
          };
        }),
      };
    });

    res.json({ success: true, data: tree });
  } catch (err) {
    console.error("Hierarchy Error:", err.message);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

router.post("/BOM/upload-excel", upload.single("file"), async (req, res) => {
  const tempInput = path.join(
    TEMP_PATH,
    `bom_upload_${Date.now()}_${Math.random().toString(36).slice(2)}.xlsx`,
  );
  const tempMaster = path.join(TEMP_PATH, `bom_master_${Date.now()}.xlsx`);

  try {
    console.log(
      "\n████████████  BOM UPLOAD (NEW FORMAT) — START  ████████████",
    );

    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    if (!/\.(xlsx|xls)$/i.test(req.file.originalname || ""))
      return res.status(400).json({
        success: false,
        message: "Invalid file type — upload .xlsx or .xls",
      });

    // Write uploaded buffer to temp file
    fs.writeFileSync(tempInput, req.file.buffer);

    // Try to download existing master BOM file from FTP
    const masterExists = await downloadFromFtp("bom_master.xlsx", tempMaster);
    console.log(
      `[FTP] Existing master: ${masterExists ? "found" : "not found (first upload)"}`,
    );

    // Parse the newly uploaded file
    const workbook = xlsx.readFile(tempInput);
    const sheetName = workbook.SheetNames[0];
    const rawRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: "",
    });

    console.log("[INFO] Sheet:", sheetName, "| total rows:", rawRows.length);

    if (rawRows.length < 2)
      return res
        .status(400)
        .json({ success: false, message: "File has no data rows" });

    // ── NEW FORMAT COLUMN MAP ─────────────────────────────────────────────────
    // Col 0  Model Name      → auto-lookup in DB, attach snapshot if found
    // Col 1  Material        → FG Part Number
    // Col 2  FG Description  → FG Part Name
    // Col 3  Material        → Child Part Code
    // Col 4  Quantity        → Child Part Qty
    // Col 5  Unit            → Child Part Unit (default "EA")
    // Col 6  Description     → Child Part Description
    // ─────────────────────────────────────────────────────────────────────────

    // Pre-load all Models from DB once for fast lookup
    const allModels = await Model.find().lean();
    // Build a map: modelName (trimmed, lowercased) → model doc
    const modelNameMap = new Map(
      allModels.map((m) => [m.modelName.trim().toLowerCase(), m]),
    );

    const bomMap = {}; // partNumber → { partNumber, partName, modelNameHint, childPartList }
    let skipped = 0;

    for (let i = 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || row.every((c) => c === "" || c == null)) {
        skipped++;
        continue;
      }

      const modelNameHint = String(row[0] ?? "").trim(); // Col 0 — Model name hint
      const partNumber = String(row[1] ?? "").trim(); // Col 1 — FG Part Number
      const partName = String(row[2] ?? "").trim(); // Col 2 — FG Part Name
      const partCode = String(row[3] ?? "").trim(); // Col 3 — Child Part Code
      const qty = parseFloat(row[4]) || 0; // Col 4 — Quantity
      const unit = String(row[5] ?? "").trim() || "EA"; // Col 5 — Unit
      const description = String(row[6] ?? "").trim(); // Col 6 — Child Description

      if (!partNumber) {
        skipped++;
        continue;
      }

      if (!bomMap[partNumber]) {
        bomMap[partNumber] = {
          partNumber,
          partName,
          modelNameHint,
          childPartList: [],
        };
      } else {
        if (!bomMap[partNumber].partName && partName)
          bomMap[partNumber].partName = partName;
        // Keep first non-empty modelNameHint seen for this part
        if (!bomMap[partNumber].modelNameHint && modelNameHint) {
          bomMap[partNumber].modelNameHint = modelNameHint;
        }
      }

      if (partCode) {
        const dup = bomMap[partNumber].childPartList.some(
          (c) => c.partCode === partCode && c.qty === qty,
        );
        if (!dup)
          bomMap[partNumber].childPartList.push({
            partCode,
            description,
            qty,
            unit,
          });
      }
    }

    // const incoming = Object.values(bomMap);
    // console.log("[PARSED] Unique FG parts:", incoming.length, "| skipped rows:", skipped);

    // if (incoming.length === 0)
    //   return res.status(400).json({ success: false, message: "No valid BOM data found in file" });

    // const childHash = (list) =>
    //   [...list]
    //     .sort((a, b) => a.partCode.localeCompare(b.partCode) || a.qty - b.qty)
    //     .map((c) => `${c.partCode}|${c.description}|${c.qty}|${c.unit}`)
    //     .join(";;");

    // let created = 0, updated = 0, unchanged = 0;
    // const modelNotFound = []; // parts where modelNameHint didn't match any DB model

    // for (const inc of incoming) {
    //   // ── Try to auto-resolve Model from hint ─────────────────────────────────
    //   let resolvedModel = null;
    //   let resolvedModelRef = null;

    //   if (inc.modelNameHint) {
    //     const matchedModel = modelNameMap.get(inc.modelNameHint.toLowerCase());
    //     if (matchedModel) {
    //       // Build the same snapshot format used elsewhere
    //       resolvedModelRef = matchedModel._id;
    //       resolvedModel = {
    //         _id: matchedModel._id,
    //         modelId: matchedModel.modelId,
    //         modelName: matchedModel.modelName,
    //         assemblyLine: matchedModel.assemblyLine, // already has plant nested
    //       };
    //     } else {
    //       modelNotFound.push({ partNumber: inc.partNumber, modelHint: inc.modelNameHint });
    //     }
    //   }

    //   const existing = await BOM.findOne({ partNumber: inc.partNumber });

    //   if (!existing) {
    //     // New record — create with auto-resolved model (or empty if not found)
    //     const createData = {
    //       partNumber: inc.partNumber,
    //       partName: inc.partName,
    //       childPartList: inc.childPartList,
    //       price: 0,
    //       lastUpdated: new Date(),
    //     };
    //     if (resolvedModel) {
    //       createData.model = resolvedModel;
    //       createData.modelRef = resolvedModelRef;
    //     }
    //     await BOM.create(createData);
    //     created++;
    //     console.log(`  [CREATE] ${inc.partNumber} | model: ${resolvedModel?.modelName ?? '— not found'}`);
    //     continue;
    //   }

    //   // Existing record — check what changed
    //   const nameChanged     = existing.partName !== inc.partName;
    //   const childrenChanged = childHash(existing.childPartList ?? []) !== childHash(inc.childPartList);

    //   // Only update model if:
    //   //   a) resolved a model from the new sheet AND
    //   //   b) existing record has NO model set yet (don't overwrite manual edits)
    //   const shouldUpdateModel = resolvedModel && !existing.model?.modelId;

    //   if (nameChanged || childrenChanged || shouldUpdateModel) {
    //     const updatePayload = {
    //       partName: inc.partName,
    //       childPartList: inc.childPartList,
    //       lastUpdated: new Date(),
    //     };
    //     if (shouldUpdateModel) {
    //       updatePayload.model = resolvedModel;
    //       updatePayload.modelRef = resolvedModelRef;
    //     }
    //     await BOM.findByIdAndUpdate(existing._id, updatePayload);
    //     updated++;
    //     console.log(`  [UPDATE] ${inc.partNumber} | model: ${resolvedModel?.modelName ?? '(preserved)'}`);
    //   } else {
    //     unchanged++;
    //     console.log(`  [SKIP]   ${inc.partNumber}`);
    //   }
    // }

    // // Save the uploaded file to FTP as the new master
    // await uploadToFtp(tempInput, 'bom_master.xlsx');
    // console.log('[FTP] Master BOM file updated on FTP server');

    // console.log(`[DONE] Created:${created} Updated:${updated} Unchanged:${unchanged}`);
    // if (modelNotFound.length > 0) {
    //   console.log(`[WARN] ${modelNotFound.length} parts had unmatched model hints:`,
    //     modelNotFound.map(x => `${x.partNumber} → "${x.modelHint}"`).join(', '));
    // }
    // console.log("████████████  BOM UPLOAD (NEW FORMAT) — END  ████████████\n");

    // return res.json({
    //   success: true,
    //   message: `Import complete: ${created} created, ${updated} updated, ${unchanged} unchanged`,
    //   summary: {
    //     created, updated, unchanged,
    //     total: incoming.length,
    //     skippedRows: skipped,
    //     modelNotFound: modelNotFound.length,
    //     modelNotFoundDetails: modelNotFound, // frontend can show warnings
    //   },
    // });
    const incoming = Object.values(bomMap);

    console.log(
      "[PARSED] Unique FG parts:",
      incoming.length,
      "| skipped rows:",
      skipped,
    );

    if (incoming.length === 0)
      return res.status(400).json({
        success: false,
        message: "No valid BOM data found in file",
      });

    // =============================================================================
    // CLIENT REQUIREMENT:
    // FULL REPLACEMENT IMPORT
    // Old BOM data is COMPLETELY deleted before inserting new upload.
    // No merge, no preservation, no backtracking.
    // =============================================================================

    console.log("[RESET] Removing old BOM data...");

    // Optional but strongly recommended:
    // remove Matrix entries because they contain embedded BOM snapshots
    // await Matrix.deleteMany({});

    // Remove all existing BOMs
    await BOM.deleteMany({});

    console.log("[RESET] Old BOM data removed");

    // Build fresh BOM documents
    const newBomDocs = [];

    const modelNotFound = [];

    for (const inc of incoming) {
      let resolvedModel = null;
      let resolvedModelRef = null;

      if (inc.modelNameHint) {
        const matchedModel = modelNameMap.get(inc.modelNameHint.toLowerCase());

        if (matchedModel) {
          resolvedModelRef = matchedModel._id;

          resolvedModel = {
            _id: matchedModel._id,
            modelId: matchedModel.modelId,
            modelName: matchedModel.modelName,
            assemblyLine: matchedModel.assemblyLine,
          };
        } else {
          modelNotFound.push({
            partNumber: inc.partNumber,
            modelHint: inc.modelNameHint,
          });
        }
      }

      const bomDoc = {
        partNumber: inc.partNumber,
        partName: inc.partName,
        childPartList: inc.childPartList,
        // price: 0,
        lastUpdated: new Date(),
      };

      if (resolvedModel) {
        bomDoc.model = resolvedModel;
        bomDoc.modelRef = resolvedModelRef;
      }

      newBomDocs.push(bomDoc);
    }

    // Bulk insert for much faster upload
    await BOM.insertMany(newBomDocs);
    await getAutoMappedMatrixRows();
    console.log(`[INSERTED] ${newBomDocs.length} BOM records`);

    // Save uploaded master file to FTP
    await uploadToFtp(tempInput, "bom_master.xlsx");

    console.log("[FTP] Master BOM updated");

    console.log("████████████  BOM FULL REPLACEMENT COMPLETE  ████████████\n");

    return res.json({
      success: true,
      message: `BOM replaced successfully with ${newBomDocs.length} records`,
      summary: {
        totalInserted: newBomDocs.length,
        skippedRows: skipped,
        modelNotFound: modelNotFound.length,
        modelNotFoundDetails: modelNotFound,
      },
    });
  } catch (err) {
    console.error("BOM Upload Error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    cleanupTemp(tempInput);
    cleanupTemp(tempMaster);
  }
});

// GET /api/masters/BOM/download-master
router.get("/BOM/download-master", async (req, res) => {
  const tempFile = path.join(TEMP_PATH, `bom_download_${Date.now()}.xlsx`);
  try {
    const exists = await downloadFromFtp("bom_master.xlsx", tempFile);
    if (!exists) {
      return res.status(404).json({
        success: false,
        message: "No master BOM file found yet. Upload one first.",
      });
    }
    res.download(tempFile, "bom_master.xlsx", () => cleanupTemp(tempFile));
  } catch (err) {
    cleanupTemp(tempFile);
    res.status(500).json({ success: false, message: err.message });
  }
});

// =============================================================================
// PATCH /api/masters/BOM/:id/meta
// Updates ONLY the two manually-managed fields: price and model.
// Called from the BOM Edit modal — never touches Excel-sourced fields.
// Rebuilds the full Model → AssemblyLine → Plant snapshot on every save.
//
// Body: { price?: number, modelObjId?: string | null }
// =============================================================================
router.patch("/BOM/:id/meta", async (req, res) => {
  try {
    // const { price, modelObjId } = req.body;
    const { modelObjId } = req.body;
    const update = { lastUpdated: new Date() };

    // if (price !== undefined) update.price = parseFloat(price) || 0;

    if (modelObjId) {
      const snapshot = await buildModelSnapshot(modelObjId);
      if (!snapshot)
        return res
          .status(400)
          .json({ message: `Model not found: ${modelObjId}` });
      update.modelRef = modelObjId;
      update.model = snapshot;
    } else if (modelObjId === null || modelObjId === "") {
      update.modelRef = null;
      update.model = {};
    }

    const updated = await BOM.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });
    if (!updated) return res.status(404).json({ message: "BOM not found" });

    console.log(
      // `[BOM META] ${updated.partNumber} → price=${updated.price} | model=${updated.model?.modelName || "—"}`,
      `[BOM META] ${updated.partNumber} | model=${updated.model?.modelName || "—"}`,
    );
    // res.json({ success: true, data: updated });
    await getAutoMappedMatrixRows();

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("BOM META Error:", err.message);
    res.status(500).json({ message: err.message });
  }
});
router.patch("/matrix/:partNumber/shift", async (req, res) => {
  try {
    const row = await upsertMatrixShift({
      bomPartNumber: req.params.partNumber,
      shift: req.body.shift,
    });

    res.json({ success: true, data: row });
  } catch (err) {
    console.error("Matrix Shift Error:", err.message);
    res.status(err.statusCode || 500).json({ message: err.message });
  }
});
// =============================================================================
// GET /api/masters/:type
// =============================================================================
router.get("/:type", async (req, res) => {
  try {
    const type = req.params.type.toLowerCase();
    if (type === "matrix") {
      return res.json(await getAutoMappedMatrixRows());
    }
    const M = getModelByType(req.params.type);
    if (!M) return res.status(404).json({ message: "Unknown type" });
    res.json(await M.find().lean());
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

// =============================================================================
// POST /api/masters/:type  — create
// =============================================================================
router.post("/:type", async (req, res) => {
  try {
    const type = req.params.type.toLowerCase();

    // ── PLANT ────────────────────────────────────────────────────────────────
    if (type === "plant") {
      const plantId = await generateId(Plant, "plantId", "PLT");
      const doc = await Plant.create({
        plantId,
        plantName: req.body.plantName,
      });
      return res.status(201).json(doc);
    }

    // ── ASSEMBLY LINE ────────────────────────────────────────────────────────
    if (type === "assemblyline") {
      const { assemblyLineName, capacity, plantObjId } = req.body;

      const plantSnap = await buildPlantSnapshot(plantObjId);
      if (!plantSnap)
        return res
          .status(400)
          .json({ message: `Plant not found: ${plantObjId}` });

      const assemblyLineId = await generateId(
        AssemblyLine,
        "assemblyLineId",
        "ASL",
      );
      const doc = await AssemblyLine.create({
        assemblyLineId,
        assemblyLineName,
        capacity,
        plantRef: plantObjId,
        plant: plantSnap,
      });
      return res.status(201).json(doc);
    }

    // ── MODEL ────────────────────────────────────────────────────────────────
    if (type === "model") {
      const { modelName, assemblyLineObjId } = req.body;

      const alSnap = await buildAssemblyLineSnapshot(assemblyLineObjId);
      if (!alSnap)
        return res
          .status(400)
          .json({ message: `AssemblyLine not found: ${assemblyLineObjId}` });

      const modelId = await generateId(Model, "modelId", "MDL");
      const doc = await Model.create({
        modelId,
        modelName,
        assemblyLineRef: assemblyLineObjId,
        assemblyLine: alSnap,
      });
      return res.status(201).json(doc);
    }

    // ── MATRIX ───────────────────────────────────────────────────────────────
    // Model is NOT selected separately — it is derived from the BOM.
    // BOM already carries a full Model → AssemblyLine → Plant snapshot
    // set via the BOM Edit modal. Matrix only needs: BOM part + Shift.
    if (type === "matrix") {
      const { bomPartNumber, shift, manpowerAvailability } = req.body;

      const bomSnap = await buildBomSnapshot(bomPartNumber);
      if (!bomSnap)
        return res
          .status(400)
          .json({ message: `BOM not found: ${bomPartNumber}` });

      // Pull the full model snapshot straight from the BOM document
      const bomDoc = await BOM.findOne({ partNumber: bomPartNumber }).lean();
      if (!bomDoc?.model?.modelId) {
        return res.status(400).json({
          message: `BOM "${bomPartNumber}" has no Model assigned yet. Edit the BOM first to set its Model.`,
        });
      }
      const modelSnap = bomDoc.model;

      const doc = await Matrix.create({
        model: modelSnap,
        bom: bomSnap,
        shift,
        manpowerAvailability,
      });
      return res.status(201).json(doc);
    }

    // ── USERS ────────────────────────────────────────────────────────────────
    if (type === "users") {
      const { name, username, email, employeeId, role, department, password } =
        req.body;
      try {
        const doc = await AppUser.create({
          name,
          username,
          email,
          employeeId,
          role,
          department,
          password,
        });
        return res.status(201).json(doc);
      } catch (err) {
        if (err.code === 11000) {
          const field = Object.keys(err.keyPattern)[0];
          return res
            .status(400)
            .json({ message: `A user with that ${field} already exists.` });
        }
        throw err;
      }
    }

    return res.status(404).json({ message: "Unknown type" });
  } catch (err) {
    console.error("POST Error:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

// =============================================================================
// PUT /api/masters/:type/:id  — update + cascade snapshots
// =============================================================================
router.put("/:type/:id", async (req, res) => {
  try {
    const type = req.params.type.toLowerCase();

    // ── PLANT ────────────────────────────────────────────────────────────────
    if (type === "plant") {
      const updated = await Plant.findByIdAndUpdate(
        req.params.id,
        { plantName: req.body.plantName },
        { new: true },
      );
      if (!updated) return res.status(404).json({ message: "Plant not found" });

      const snap = {
        _id: updated._id,
        plantId: updated.plantId,
        plantName: updated.plantName,
      };

      // Cascade down the full hierarchy
      await AssemblyLine.updateMany({ plantRef: updated._id }, { plant: snap });
      await Model.updateMany(
        { "assemblyLine.plant._id": updated._id },
        { "assemblyLine.plant": snap },
      );
      await BOM.updateMany(
        { "model.assemblyLine.plant._id": updated._id },
        { "model.assemblyLine.plant": snap },
      );

      console.log(
        `[CASCADE] Plant ${updated.plantId} → refreshed AssemblyLines, Models, BOMs`,
      );
      return res.json(updated);
    }

    // ── ASSEMBLY LINE ────────────────────────────────────────────────────────
    if (type === "assemblyline") {
      const { assemblyLineName, capacity, plantObjId } = req.body;

      const plantSnap = await buildPlantSnapshot(plantObjId);
      if (!plantSnap)
        return res
          .status(400)
          .json({ message: `Plant not found: ${plantObjId}` });

      const updated = await AssemblyLine.findByIdAndUpdate(
        req.params.id,
        { assemblyLineName, capacity, plantRef: plantObjId, plant: plantSnap },
        { new: true },
      );
      if (!updated)
        return res.status(404).json({ message: "AssemblyLine not found" });

      const alSnap = {
        _id: updated._id,
        assemblyLineId: updated.assemblyLineId,
        assemblyLineName: updated.assemblyLineName,
        capacity: updated.capacity,
        plant: plantSnap,
      };

      // Cascade down
      await Model.updateMany(
        { assemblyLineRef: updated._id },
        { assemblyLine: alSnap },
      );
      await BOM.updateMany(
        { "model.assemblyLine._id": updated._id },
        { "model.assemblyLine": alSnap },
      );

      console.log(
        `[CASCADE] AssemblyLine ${updated.assemblyLineId} → refreshed Models, BOMs`,
      );
      return res.json(updated);
    }

    // ── MODEL ────────────────────────────────────────────────────────────────
    if (type === "model") {
      const { modelName, assemblyLineObjId } = req.body;

      const alSnap = await buildAssemblyLineSnapshot(assemblyLineObjId);
      if (!alSnap)
        return res
          .status(400)
          .json({ message: `AssemblyLine not found: ${assemblyLineObjId}` });

      const updated = await Model.findByIdAndUpdate(
        req.params.id,
        { modelName, assemblyLineRef: assemblyLineObjId, assemblyLine: alSnap },
        { new: true },
      );
      if (!updated) return res.status(404).json({ message: "Model not found" });

      const modelSnap = {
        _id: updated._id,
        modelId: updated.modelId,
        modelName: updated.modelName,
        assemblyLine: alSnap,
      };

      // Cascade down to BOMs
      await BOM.updateMany({ modelRef: updated._id }, { model: modelSnap });

      console.log(`[CASCADE] Model ${updated.modelId} → refreshed BOMs`);
      return res.json(updated);
    }

    // ── MATRIX ───────────────────────────────────────────────────────────────
    if (type === "matrix") {
      const { bomPartNumber, shift, manpowerAvailability } = req.body;

      const bomSnap = await buildBomSnapshot(bomPartNumber);
      if (!bomSnap)
        return res
          .status(400)
          .json({ message: `BOM not found: ${bomPartNumber}` });

      const bomDoc = await BOM.findOne({ partNumber: bomPartNumber }).lean();
      if (!bomDoc?.model?.modelId) {
        return res.status(400).json({
          message: `BOM "${bomPartNumber}" has no Model assigned yet. Edit the BOM first to set its Model.`,
        });
      }
      const modelSnap = bomDoc.model;

      const updated = await Matrix.findByIdAndUpdate(
        req.params.id,
        { model: modelSnap, bom: bomSnap, shift, manpowerAvailability },
        { new: true },
      );
      if (!updated)
        return res.status(404).json({ message: "Matrix not found" });
      return res.json(updated);
    }

    // ── USERS ────────────────────────────────────────────────────────────────
    if (type === "users") {
      const { name, username, email, employeeId, role, department, password } =
        req.body;
      const update = { name, username, email, employeeId, role, department };
      if (password) update.password = password; // only update password if provided
      try {
        const updated = await AppUser.findByIdAndUpdate(req.params.id, update, {
          new: true,
          runValidators: true,
        });
        if (!updated)
          return res.status(404).json({ message: "User not found" });
        return res.json(updated);
      } catch (err) {
        if (err.code === 11000) {
          const field = Object.keys(err.keyPattern)[0];
          return res
            .status(400)
            .json({ message: `A user with that ${field} already exists.` });
        }
        throw err;
      }
    }

    return res.status(404).json({ message: "Unknown type" });
  } catch (err) {
    console.error("PUT Error:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

// =============================================================================
// DELETE /api/masters/:type/:id
// =============================================================================
router.delete("/:type/:id", async (req, res) => {
  try {
    const M = getModelByType(req.params.type);
    if (!M) return res.status(404).json({ message: "Unknown type" });
    const deleted = await M.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Item not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});

// =============================================================================
// Helper — map URL type string → Mongoose model
// =============================================================================
const getModelByType = (type) => {
  const map = {
    plant: Plant,
    assemblyline: AssemblyLine,
    model: Model,
    bom: BOM,
    matrix: Matrix,
    users: AppUser,
  };
  return map[type.toLowerCase()] ?? null;
};

export default router;
