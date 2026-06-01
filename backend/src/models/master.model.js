import { localhostConn } from "../lib/db.js";
import mongoose from "mongoose";

// =============================================================================
// HIERARCHY
//   Plant  ──►  AssemblyLine  ──►  Model  ──►  BOM
//
// Each level stores:
//   (a) its own auto-generated human-readable ID  (PLT001, ASL001, MDL001)
//   (b) a proper ObjectId ref to its direct parent
//   (c) a denormalized snapshot of the full parent chain
//       so a single GET returns complete context without joins
//
// Snapshot strategy:
//   AssemblyLine.plant    → { _id, plantId, plantName }
//   Model.assemblyLine    → { _id, assemblyLineId, assemblyLineName, capacity, plant:{…} }
//   BOM.model             → { _id, modelId, modelName, assemblyLine:{…} }
//
// The route layer keeps snapshots fresh whenever a parent is updated (cascade).
// =============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// 1. PLANT
// ─────────────────────────────────────────────────────────────────────────────
const plantSchema = new mongoose.Schema(
  {
    plantId: { type: String, unique: true }, // auto-generated: PLT001, PLT002…
    plantName: { type: String, required: true },
  },
  { timestamps: true },
);

// ─────────────────────────────────────────────────────────────────────────────
// 2. ASSEMBLY LINE
//    Parent: Plant
// ─────────────────────────────────────────────────────────────────────────────
const assemblyLineSchema = new mongoose.Schema(
  {
    assemblyLineId: { type: String, unique: true }, // auto-generated: ASL001…
    assemblyLineName: { type: String, required: true },
    capacity: { type: Number, required: true }, // shift throughput (8 hrs)

    // Parent ObjectId ref
    plantRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plant",
      required: true,
    },

    // Denormalized parent snapshot — kept in sync by route on every save/update
    plant: {
      _id: mongoose.Schema.Types.ObjectId,
      plantId: String,
      plantName: String,
    },
  },
  { timestamps: true },
);

// ─────────────────────────────────────────────────────────────────────────────
// 3. MODEL
//    Parent: AssemblyLine (which already carries its Plant snapshot)
// ─────────────────────────────────────────────────────────────────────────────
const modelSchema = new mongoose.Schema(
  {
    modelId: { type: String, unique: true }, // auto-generated: MDL001…
    modelName: { type: String, required: true },

    // Parent ObjectId ref
    assemblyLineRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AssemblyLine",
      required: true,
    },

    // Denormalized snapshot: AssemblyLine + its Plant
    assemblyLine: {
      _id: mongoose.Schema.Types.ObjectId,
      assemblyLineId: String,
      assemblyLineName: String,
      capacity: Number,
      plant: {
        _id: mongoose.Schema.Types.ObjectId,
        plantId: String,
        plantName: String,
      },
    },
  },
  { timestamps: true },
);

// ─────────────────────────────────────────────────────────────────────────────
// 4. BOM
//    Parent: Model (which carries AssemblyLine + Plant)
//
//    Excel-sourced (refreshed on every upload):
//      partNumber · partName · childPartList
//
//    Manually entered via Edit modal (NEVER overwritten on re-upload):
//      price · model (ref + full snapshot)
//
//    NOTE: The raw plant column from the Excel sheet is intentionally ignored.
//          Plant context comes exclusively from the Model → AssemblyLine → Plant
//          hierarchy selected in the Edit modal.
// ─────────────────────────────────────────────────────────────────────────────
const childBomSchema = new mongoose.Schema({
  partCode: String,
  description: String,
  qty: Number,
  unit: { type: String, default: "EA" },
});

const bomSchema = new mongoose.Schema(
  {
    // ── From Excel ────────────────────────────────────────────────────────────
    partNumber: { type: String, required: true, unique: true },
    partName: String,
    childPartList: [childBomSchema],

    // ── Manually set via Edit modal — NEVER overwritten on re-upload ──────────
    // price: { type: Number, default: 0 },

    // Parent ObjectId ref
    modelRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Model",
    },

    // Denormalized snapshot: Model → AssemblyLine → Plant
    // Populated when the user selects a Model in the Edit modal.
    // Auto-cascaded when any ancestor is renamed/updated.
    model: {
      _id: mongoose.Schema.Types.ObjectId,
      modelId: String,
      modelName: String,
      assemblyLine: {
        _id: mongoose.Schema.Types.ObjectId,
        assemblyLineId: String,
        assemblyLineName: String,
        capacity: Number,
        plant: {
          _id: mongoose.Schema.Types.ObjectId,
          plantId: String,
          plantName: String,
        },
      },
    },

    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// ─────────────────────────────────────────────────────────────────────────────
// 5. MATRIX
//    Operational config linking a Model + BOM for shift planning.
//    Fully self-contained: stores snapshots of both at creation time.
// ─────────────────────────────────────────────────────────────────────────────
const matrixSchema = new mongoose.Schema(
  {
    // Full Model snapshot (includes AssemblyLine → Plant chain)
    model: {
      _id: mongoose.Schema.Types.ObjectId,
      modelId: String,
      modelName: String,
      assemblyLine: {
        _id: mongoose.Schema.Types.ObjectId,
        assemblyLineId: String,
        assemblyLineName: String,
        capacity: Number,
        plant: {
          _id: mongoose.Schema.Types.ObjectId,
          plantId: String,
          plantName: String,
        },
      },
    },

    // BOM snapshot — only the fields needed for production planning
    // plantCode intentionally excluded (Excel raw string is not meaningful here)
    bom: {
      _id: mongoose.Schema.Types.ObjectId,
      partNumber: String,
      partName: String,
      // price: Number,
      childPartList: [childBomSchema],
    },

    // shift: {
    //   type: String,
    //   enum: ["A", "B", "C"],
    //   required: true,
    // },
    // Replace the existing shift property in matrixSchema with this:
    shift: {
      type: [String],
      enum: ["A", "B", "C"],
      default: ["A"],
    },
    manpowerAvailability: Number,
  },
  { timestamps: true },
);

// ─────────────────────────────────────────────────────────────────────────────
// 6. APP USER
// ─────────────────────────────────────────────────────────────────────────────
const appUserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    employeeId: { type: String, required: true },
    role: { type: String, required: true },
    department: { type: String, required: true },
    password: { type: String, required: true },
  },
  { timestamps: true },
);

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────
export const Plant = localhostConn.model("Plant", plantSchema);
export const AssemblyLine = localhostConn.model(
  "AssemblyLine",
  assemblyLineSchema,
);
export const Model = localhostConn.model("Model", modelSchema);
export const BOM = localhostConn.model("BOM", bomSchema);
export const Matrix = localhostConn.model("Matrix", matrixSchema);
export const AppUser = localhostConn.model("AppUser", appUserSchema);
