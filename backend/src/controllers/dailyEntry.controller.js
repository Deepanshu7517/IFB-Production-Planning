// import { localhostConn } from '../lib/db.js';
// import mongoose from 'mongoose';
// import ProductionPlan from '../models/productionPlan.model.js';

// // ─── Daily Entry Schema ───────────────────────────────────────────────────────
// // Each document = one day's actual production entry for a given plan
// const dailyEntrySchema = new mongoose.Schema({
//   planId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionPlan', required: true },
//   date: { type: String, required: true },  // "YYYY-MM-DD"
//   week: { type: String, required: true },  // "W8"
//   year: { type: Number, required: true },
//   planned: { type: Number, required: true, min: 0 },  // auto-calc: capacity / workingDays
//   actual: { type: Number, default: null, min: 0 },
//   notes: { type: String, default: '', maxlength: 500 },
//   shift: { type: String, enum: ['day', 'night', 'both'], default: 'day' },
//   // Denormalized from plan for fast queries
//   plant: { plantId: String, plantName: String },
//   assemblyLine: { assemblyLineId: String, assemblyLineName: String },
//   model: { modelId: String, modelName: String },
//   part: { partNumber: String, partName: String },
//   enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
// }, { timestamps: true });

// dailyEntrySchema.index({ planId: 1, date: 1 }, { unique: true });
// dailyEntrySchema.index({ date: 1 });
// dailyEntrySchema.index({ week: 1, year: 1 });
// dailyEntrySchema.index({ 'plant.plantId': 1, date: 1 });

// const DailyEntry = localhostConn.model('DailyEntry', dailyEntrySchema);

// // ─── Helper: get Monday of ISO week ──────────────────────────────────────────
// function getMondayOfWeek(weekNum, year) {
//   const jan1 = new Date(year, 0, 1);
//   const dow = jan1.getDay(); // 0 = Sun
//   const monday = new Date(jan1);
//   monday.setDate(jan1.getDate() + (weekNum - 1) * 7 + (dow <= 1 ? 1 - dow : 8 - dow));
//   return monday;
// }

// // ─── Helper: compute daily dates + planned capacity from plan ─────────────────
// // This is the core auto-divide logic: capacity / workingDays per day
// function computeDaySlots(plan) {
//   const weekNum = parseInt(plan.week.replace('W', ''));
//   const monday = getMondayOfWeek(weekNum, plan.year);
//   const base = Math.floor(plan.capacity / plan.workingDays);
//   const remainder = plan.capacity % plan.workingDays;

//   return Array.from({ length: plan.workingDays }, (_, i) => {
//     const d = new Date(monday);
//     d.setDate(monday.getDate() + i);
//     return {
//       date: d.toISOString().split('T')[0],
//       // Last day absorbs remainder so sum always = plan.capacity
//       planned: i === plan.workingDays - 1 ? base + remainder : base,
//     };
//   });
// }

// // ─── GET /api/production-plans/:planId/daily-entries ─────────────────────────
// // Returns all working days for a plan with auto-generated planned capacity.
// // Merges with any saved actual entries from DB.
// // When a plan is first created, there are NO actual entries — caller gets
// // the full skeleton with actual = null.
// export const getDailyEntries = async (req, res) => {
//   try {
//     const { planId } = req.params;
//     const plan = await ProductionPlan.findById(planId);
//     if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

//     // Compute all day slots auto-divided from plan
//     const slots = computeDaySlots(plan);

//     // Load any saved actuals for this plan
//     const saved = await DailyEntry.find({ planId }).sort({ date: 1 });
//     const savedMap = {};
//     saved.forEach(e => { savedMap[e.date] = e; });

//     // Merge: slot gets actual from DB (or null if not entered yet)
//     const entries = slots.map(slot => {
//       const db = savedMap[slot.date];
//       return {
//         date: slot.date,
//         planned: slot.planned,
//         actual: db?.actual ?? null,
//         notes: db?.notes ?? '',
//         shift: db?.shift ?? 'day',
//         _id: db?._id ?? null,
//       };
//     });

//     const enteredDays = entries.filter(e => e.actual !== null);
//     const totalActual = enteredDays.reduce((s, e) => s + (e.actual ?? 0), 0);
//     const totalPlanned = entries.reduce((s, e) => s + e.planned, 0);

//     res.status(200).json({
//       success: true,
//       data: {
//         plan: {
//           _id: plan._id,
//           week: plan.week,
//           year: plan.year,
//           capacity: plan.capacity,
//           workingDays: plan.workingDays,
//           plant: plan.plant,
//           assemblyLine: plan.assemblyLine,
//           model: plan.model,
//           part: {
//             partNumber: plan.part.partNumber,
//             partName: plan.part.partName,
//             price: plan.part.price,
//             childPartList: plan.part.childPartList,
//           },
//           status: plan.status,
//         },
//         entries,
//         summary: {
//           totalPlanned,
//           totalActual,
//           weekCapacity: plan.capacity,
//           adherence: totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0,
//           daysEntered: enteredDays.length,
//           daysRemaining: entries.filter(e => e.actual === null).length,
//           backlog: totalPlanned - totalActual,
//         }
//       }
//     });
//   } catch (err) {
//     console.error('getDailyEntries error:', err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

// // ─── PUT /api/production-plans/:planId/daily-entries/:date ───────────────────
// // Upserts an actual entry for one specific day.
// // Body: { actual: number, notes?: string, shift?: 'day'|'night'|'both' }
// export const upsertDailyEntry = async (req, res) => {
//   try {
//     const { planId, date } = req.params;
//     const { actual, notes = '', shift = 'day' } = req.body;

//     if (actual === undefined || actual === null || actual < 0) {
//       return res.status(400).json({ success: false, message: 'actual must be a non-negative number' });
//     }

//     const plan = await ProductionPlan.findById(planId);
//     if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

//     // Validate the date belongs to this plan's working days
//     const validSlots = computeDaySlots(plan);
//     const slot = validSlots.find(s => s.date === date);
//     if (!slot) {
//       return res.status(400).json({
//         success: false,
//         message: `Date ${date} is not a working day for ${plan.week}. Valid dates: ${validSlots.map(s => s.date).join(', ')}`
//       });
//     }

//     const entry = await DailyEntry.findOneAndUpdate(
//       { planId, date },
//       {
//         $set: {
//           planId,
//           date,
//           week: plan.week,
//           year: plan.year,
//           planned: slot.planned,
//           actual: parseInt(actual),
//           notes,
//           shift,
//           plant: { plantId: plan.plant.plantId, plantName: plan.plant.plantName },
//           assemblyLine: { assemblyLineId: plan.assemblyLine.assemblyLineId, assemblyLineName: plan.assemblyLine.assemblyLineName },
//           model: { modelId: plan.model.modelId, modelName: plan.model.modelName },
//           part: { partNumber: plan.part.partNumber, partName: plan.part.partName },
//           enteredBy: req.user?._id,
//         }
//       },
//       { upsert: true, new: true, runValidators: true }
//     );

//     res.status(200).json({ success: true, data: entry, message: 'Daily entry saved' });
//   } catch (err) {
//     console.error('upsertDailyEntry error:', err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

// // ─── GET /api/production-plans/daily-entries/range ───────────────────────────
// // For dashboard: get all actual entries across plans in a date range.
// // Query: startDate, endDate, plantId?, assemblyLineId?
// export const getDailyEntriesByRange = async (req, res) => {
//   try {
//     const { startDate, endDate, plantId, assemblyLineId } = req.query;
//     const query = {};
//     if (startDate && endDate) query.date = { $gte: startDate, $lte: endDate };
//     if (plantId) query['plant.plantId'] = plantId;
//     if (assemblyLineId) query['assemblyLine.assemblyLineId'] = assemblyLineId;

//     const entries = await DailyEntry.find(query).sort({ date: 1 });
//     res.status(200).json({ success: true, data: entries, count: entries.length });
//   } catch (err) {
//     console.error('getDailyEntriesByRange error:', err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

// export { DailyEntry };

import { localhostConn } from '../lib/db.js';
import mongoose from 'mongoose';
import ProductionPlan from '../models/productionPlan.model.js';
import { recomputeBacklog } from '../models/productionPlan.model.js';

// ─── Daily Entry Schema ───────────────────────────────────────────────────────
const dailyEntrySchema = new mongoose.Schema({
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionPlan', required: true },
  date: { type: String, required: true }, 
  week: { type: String, required: true },  
  year: { type: Number, required: true },
  planned: { type: Number, required: true, min: 0 }, 
  actual: { type: Number, default: null, min: 0 },
  notes: { type: String, default: '', maxlength: 500 },
  shift: { type: String, enum: ['day', 'night', 'both'], default: 'day' },
  plant: { plantId: String, plantName: String },
  assemblyLine: { assemblyLineId: String, assemblyLineName: String },
  model: { modelId: String, modelName: String },
  part: { partNumber: String, partName: String },
  enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

dailyEntrySchema.index({ planId: 1, date: 1 }, { unique: true });
dailyEntrySchema.index({ date: 1 });
dailyEntrySchema.index({ week: 1, year: 1 });
dailyEntrySchema.index({ 'plant.plantId': 1, date: 1 });

const DailyEntry = localhostConn.model('DailyEntry', dailyEntrySchema);

// =============================================================================
// SHARED UTILS
// =============================================================================
function entrySummary(plan) {
  const entered = plan.dailyEntries.filter(e => e.actual !== null);
  const totalActual = entered.reduce((s, e) => s + (e.actual ?? 0), 0);
  const totalPlan = plan.dailyEntries.reduce((s, e) => s + e.planned, 0);
  return {
    totalPlanned: totalPlan,
    totalActual,
    weekCapacity: plan.capacity,
    adherence: totalPlan > 0 ? Math.round((totalActual / totalPlan) * 100) : 0,
    daysEntered: entered.length,
    daysRemaining: plan.dailyEntries.filter(e => e.actual === null).length,
    backlog: totalPlan - totalActual,
  };
}

// ─── GET /api/production-plans/:planId/daily-entries ─────────────────────────
export const getDailyEntries = async (req, res) => {
  try {
    const { planId } = req.params;
    const plan = await ProductionPlan.findById(planId);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

    // FIX: Use EXACT mapped dates saved in the database
    const entries = plan.dailyEntries.map(e => e.toObject());

    res.status(200).json({
      success: true,
      data: {
        plan: {
          _id: plan._id,
          week: plan.week,
          year: plan.year,
          capacity: plan.capacity,
          workingDays: plan.workingDays,
          plant: plan.plant,
          assemblyLine: plan.assemblyLine,
          model: plan.model,
          part: {
            partNumber: plan.bom?.partNumber,
            partName: plan.bom?.partName,
            price: plan.bom?.price,
            childPartList: plan.bom?.childPartList,
          },
          status: plan.status,
        },
        entries,
        summary: entrySummary(plan)
      }
    });
  } catch (err) {
    console.error('getDailyEntries error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/production-plans/:planId/daily-entries/:date ───────────────────
export const upsertDailyEntry = async (req, res) => {
  try {
    const { planId, date } = req.params;
    const { actual, notes, shift, redistribution } = req.body;

    if (actual !== null && (actual === undefined || actual < 0)) {
      return res.status(400).json({ success: false, message: 'actual must be null or a non-negative number' });
    }

    const plan = await ProductionPlan.findById(planId);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

    const idx = plan.dailyEntries.findIndex(e => e.date === date);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: `No daily entry mapped for date ${date}` });
    }

    plan.dailyEntries[idx].actual = actual !== null ? parseInt(actual) : null;
    if (notes !== undefined) plan.dailyEntries[idx].notes = notes;
    if (shift) plan.dailyEntries[idx].shift = shift;

    const shortfall = actual !== null ? plan.dailyEntries[idx].planned - parseInt(actual) : 0;

    if (actual === null || shortfall === 0) {
      recomputeBacklog(plan.dailyEntries, plan.capacity);
    } else if (redistribution && Array.isArray(redistribution)) {
      plan.dailyEntries[idx].backlog = shortfall; 
      
      for (const dist of redistribution) {
        const fIdx = plan.dailyEntries.findIndex(e => e.date === dist.date);
        if (fIdx !== -1) {
          plan.dailyEntries[fIdx].planned += dist.addedPlanned;
          if (plan.dailyEntries[fIdx].planned < 0) {
             plan.dailyEntries[fIdx].planned = 0;
          }
        }
      }
    } else {
      recomputeBacklog(plan.dailyEntries, plan.capacity);
    }

    const allDone = plan.dailyEntries.every(e => e.actual !== null);
    if (allDone) plan.status = 'COMPLETED';
    else if (plan.status === 'PLANNED' && plan.dailyEntries.some(e => e.actual !== null)) plan.status = 'IN_PROGRESS';

    plan.updatedBy = req.user?._id;
    await plan.save();

    const daysToUpdate = plan.dailyEntries.filter(e => e.date >= date);
    for (const d of daysToUpdate) {
      await DailyEntry.findOneAndUpdate(
        { planId: plan._id, date: d.date },
        {
          $set: {
            planId: plan._id,
            date: d.date,
            week: plan.week,
            year: plan.year,
            planned: d.planned,
            actual: d.actual,
            notes: d.notes ?? '',
            shift: d.shift ?? 'day',
            plant: {
              plantId: plan.model?.assemblyLine?.plant?.plantId ?? '',
              plantName: plan.model?.assemblyLine?.plant?.plantName ?? '',
            },
            assemblyLine: {
              assemblyLineId: plan.model?.assemblyLine?.assemblyLineId ?? '',
              assemblyLineName: plan.model?.assemblyLine?.assemblyLineName ?? '',
            },
            model: {
              modelId: plan.model?.modelId ?? '',
              modelName: plan.model?.modelName ?? '',
            },
            part: {
              partNumber: plan.bom?.partNumber ?? '',
              partName: plan.bom?.partName ?? '',
            },
            enteredBy: req.user?._id ?? null,
          },
        },
        { upsert: true, new: true }
      );
    }

    res.status(200).json({
      success: true,
      data: {
        entry: plan.dailyEntries[idx],
        entries: plan.dailyEntries,
        summary: entrySummary(plan),
        status: plan.status,
      },
      message: 'Daily entry updated',
    });
  } catch (err) {
    console.error('upsertDailyEntry error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getDailyEntriesByRange = async (req, res) => {
  try {
    const { startDate, endDate, plantId, assemblyLineId } = req.query;
    const query = {};
    if (startDate && endDate) query.date = { $gte: startDate, $lte: endDate };
    if (plantId) query['plant.plantId'] = plantId;
    if (assemblyLineId) query['assemblyLine.assemblyLineId'] = assemblyLineId;

    const entries = await DailyEntry.find(query).sort({ date: 1 });
    res.status(200).json({ success: true, data: entries, count: entries.length });
  } catch (err) {
    console.error('getDailyEntriesByRange error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export { DailyEntry };