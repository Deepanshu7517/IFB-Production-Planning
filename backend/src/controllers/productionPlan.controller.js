// import ProductionPlan from '../models/productionPlan.model.js';
// import { Matrix } from '../models/master.model.js';
// import { buildFreshEntries, recomputeBacklog, isoWeekDates } from '../models/productionPlan.model.js';
// import { DailyEntry } from './dailyEntry.controller.js';
// import { uploadToFtp, downloadFromFtp, TEMP_PATH, cleanupTemp } from '../lib/ftp.js';
// import fs from 'fs';
// import path from 'path';

// // =============================================================================
// // SHARED UTILS
// // =============================================================================

// function entrySummary(plan) {
//   const entered = plan.dailyEntries.filter(e => e.actual !== null);
//   const totalActual = entered.reduce((s, e) => s + (e.actual ?? 0), 0);
//   const totalPlan = plan.dailyEntries.reduce((s, e) => s + e.planned, 0);
//   return {
//     totalPlanned: totalPlan,
//     totalActual,
//     weekCapacity: plan.capacity,
//     adherence: totalPlan > 0 ? Math.round((totalActual / totalPlan) * 100) : 0,
//     daysEntered: entered.length,
//     daysRemaining: plan.dailyEntries.filter(e => e.actual === null).length,
//     backlog: totalPlan - totalActual,
//   };
// }

// // =============================================================================
// // SYNC HELPER
// // =============================================================================
// async function syncDailyEntriesToCollection(plan, entries, userId) {
//   if (!entries || entries.length === 0) return;

//   const planId = plan._id;
//   const baseFields = {
//     week: plan.week,
//     year: plan.year,
//     plant: {
//       plantId: plan.model?.assemblyLine?.plant?.plantId ?? '',
//       plantName: plan.model?.assemblyLine?.plant?.plantName ?? '',
//     },
//     assemblyLine: {
//       assemblyLineId: plan.model?.assemblyLine?.assemblyLineId ?? '',
//       assemblyLineName: plan.model?.assemblyLine?.assemblyLineName ?? '',
//     },
//     model: {
//       modelId: plan.model?.modelId ?? '',
//       modelName: plan.model?.modelName ?? '',
//     },
//     part: {
//       partNumber: plan.bom?.partNumber ?? '',
//       partName: plan.bom?.partName ?? '',
//     },
//     enteredBy: userId ?? null,
//   };

//   const ops = entries.map(entry => ({
//     updateOne: {
//       filter: { planId, date: entry.date },
//       update: {
//         $set: {
//           ...baseFields,
//           planId,
//           date: entry.date,
//           planned: entry.planned,
//         },
//         $setOnInsert: {
//           actual: null,
//           notes: '',
//           shift: 'day',
//         },
//       },
//       upsert: true,
//     },
//   }));

//   await DailyEntry.bulkWrite(ops, { ordered: false });
// }

// // =============================================================================
// // CREATE
// // =============================================================================
// export const createProductionPlan = async (req, res) => {
//   try {
//     const { matrixId, week, year, workingDays, capacity, status, notes } = req.body;

//     if (!matrixId || !week) {
//       return res.status(400).json({ success: false, message: 'matrixId and week are required' });
//     }

//     const matrix = await Matrix.findById(matrixId).lean();
//     if (!matrix) {
//       return res.status(404).json({ success: false, message: `Matrix not found: ${matrixId}` });
//     }

//     const planYear = year || new Date().getFullYear();
//     const planCapacity = capacity != null ? capacity : (matrix.model?.assemblyLine?.capacity ?? 0);
//     const planDays = workingDays ?? 6;

//     const exists = await ProductionPlan.exists({ matrixRef: matrixId, week, year: planYear });
//     if (exists) {
//       return res.status(400).json({
//         success: false,
//         message: `A production plan already exists for this Matrix entry in ${week} ${planYear}`,
//       });
//     }

//     const plan = await ProductionPlan.create({
//       week,
//       year: planYear,
//       workingDays: planDays,
//       capacity: planCapacity,
//       matrixRef: matrixId,
//       model: matrix.model,
//       bom: matrix.bom,
//       shift: matrix.shift,
//       status: status || 'PLANNED',
//       notes: notes || '',
//       createdBy: req.user?._id,
//     });

//     res.status(201).json({
//       success: true,
//       data: plan,
//       message: `Production plan created with ${plan.dailyEntries.length} daily entries`,
//     });
//   } catch (err) {
//     console.error('createProductionPlan:', err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

// // =============================================================================
// // GET ALL
// // =============================================================================
// export const getAllProductionPlans = async (req, res) => {
//   try {
//     const {
//       week, year, plantId, assemblyLineId, modelId, status,
//       page = 1, limit = 50, sortBy = 'createdAt', sortOrder = 'desc',
//     } = req.query;

//     const query = {};
//     if (week) query.week = week;
//     if (year) query.year = parseInt(year);
//     if (plantId) query['model.assemblyLine.plant.plantId'] = plantId;
//     if (assemblyLineId) query['model.assemblyLine.assemblyLineId'] = assemblyLineId;
//     if (modelId) query['model.modelId'] = modelId;
//     if (status) query.status = status;

//     const skip = (parseInt(page) - 1) * parseInt(limit);
//     const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

//     const [plans, total] = await Promise.all([
//       ProductionPlan.find(query).sort(sort).skip(skip).limit(parseInt(limit)),
//       ProductionPlan.countDocuments(query),
//     ]);

//     res.status(200).json({
//       success: true,
//       data: plans,
//       pagination: {
//         page: parseInt(page),
//         limit: parseInt(limit),
//         total,
//         pages: Math.ceil(total / parseInt(limit)),
//       },
//     });
//   } catch (err) {
//     console.error('getAllProductionPlans:', err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

// // =============================================================================
// // GET ONE
// // =============================================================================
// export const getProductionPlanById = async (req, res) => {
//   try {
//     const plan = await ProductionPlan.findById(req.params.id);
//     if (!plan) return res.status(404).json({ success: false, message: 'Production plan not found' });
//     res.status(200).json({ success: true, data: plan });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

// // =============================================================================
// // UPDATE
// // =============================================================================
// export const updateProductionPlan = async (req, res) => {
//   try {
//     const plan = await ProductionPlan.findById(req.params.id);
//     if (!plan) return res.status(404).json({ success: false, message: 'Production plan not found' });

//     const { matrixId, capacity, workingDays, status, notes } = req.body;
//     let needsRegenerate = false;

//     if (matrixId && matrixId !== plan.matrixRef?.toString()) {
//       const matrix = await Matrix.findById(matrixId).lean();
//       if (!matrix) return res.status(404).json({ success: false, message: `Matrix not found: ${matrixId}` });
//       plan.matrixRef = matrixId;
//       plan.model = matrix.model;
//       plan.bom = matrix.bom;
//       plan.shift = matrix.shift;
//       needsRegenerate = true;
//     }

//     if (capacity != null && capacity !== plan.capacity) { plan.capacity = capacity; needsRegenerate = true; }
//     if (workingDays != null && workingDays !== plan.workingDays) { plan.workingDays = workingDays; needsRegenerate = true; }
//     if (status !== undefined) plan.status = status;
//     if (notes !== undefined) plan.notes = notes;
//     plan.updatedBy = req.user?._id;

//     if (needsRegenerate) {
//       plan.dailyEntries = buildFreshEntries(plan.capacity, plan.workingDays, plan.week, plan.year);
//     }

//     await plan.save();

//     res.status(200).json({
//       success: true,
//       data: plan,
//       message: needsRegenerate
//         ? 'Production plan updated — daily entries regenerated'
//         : 'Production plan updated',
//     });
//   } catch (err) {
//     console.error('updateProductionPlan:', err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

// // =============================================================================
// // DELETE
// // =============================================================================
// export const deleteProductionPlan = async (req, res) => {
//   try {
//     const plan = await ProductionPlan.findByIdAndDelete(req.params.id);
//     if (!plan) return res.status(404).json({ success: false, message: 'Production plan not found' });
//     res.status(200).json({ success: true, message: 'Production plan deleted successfully' });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

// // =============================================================================
// // DAILY ENTRIES — GET
// // =============================================================================
// export const getDailyEntries = async (req, res) => {
//   try {
//     const plan = await ProductionPlan.findById(req.params.id);
//     if (!plan) return res.status(404).json({ success: false, message: 'Production plan not found' });

//     res.status(200).json({
//       success: true,
//       data: {
//         plan: {
//           _id: plan._id,
//           week: plan.week,
//           year: plan.year,
//           capacity: plan.capacity,
//           workingDays: plan.workingDays,
//           shift: plan.shift,
//           status: plan.status,
//           isPartialWeek: plan.isPartialWeek,
//           plant: plan.model?.assemblyLine?.plant,
//           assemblyLine: {
//             assemblyLineId: plan.model?.assemblyLine?.assemblyLineId,
//             assemblyLineName: plan.model?.assemblyLine?.assemblyLineName,
//           },
//           model: { modelId: plan.model?.modelId, modelName: plan.model?.modelName },
//           bom: plan.bom,
//         },
//         entries: plan.dailyEntries,
//         summary: entrySummary(plan),
//       },
//     });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

// // =============================================================================
// // DAILY ENTRIES — UPDATE ONE DAY (With Surplus & Shortfall Redistribution)
// // =============================================================================
// export const updateDailyEntry = async (req, res) => {
//   try {
//     const { id, date } = req.params;
//     const { actual, notes, shift, redistribution } = req.body;

//     if (actual !== null && (actual === undefined || actual < 0)) {
//       return res.status(400).json({ success: false, message: 'actual must be null or a non-negative number' });
//     }

//     const plan = await ProductionPlan.findById(id);
//     if (!plan) return res.status(404).json({ success: false, message: 'Production plan not found' });

//     const idx = plan.dailyEntries.findIndex(e => e.date === date);
//     if (idx === -1) {
//       return res.status(404).json({ success: false, message: `No daily entry for date ${date}` });
//     }

//     plan.dailyEntries[idx].actual = actual !== null ? parseInt(actual) : null;
//     if (notes !== undefined) plan.dailyEntries[idx].notes = notes;
//     if (shift) plan.dailyEntries[idx].shift = shift;

//     const shortfall = actual !== null ? plan.dailyEntries[idx].planned - parseInt(actual) : 0;

//     if (actual === null || shortfall === 0) {
//       recomputeBacklog(plan.dailyEntries, plan.capacity);
//     } else if (redistribution && Array.isArray(redistribution)) {
//       plan.dailyEntries[idx].backlog = shortfall;

//       for (const dist of redistribution) {
//         const fIdx = plan.dailyEntries.findIndex(e => e.date === dist.date);
//         if (fIdx !== -1) {
//           plan.dailyEntries[fIdx].planned += dist.addedPlanned;
//           if (plan.dailyEntries[fIdx].planned < 0) {
//              plan.dailyEntries[fIdx].planned = 0;
//           }
//         }
//       }
//     } else {
//       recomputeBacklog(plan.dailyEntries, plan.capacity);
//     }

//     const allDone = plan.dailyEntries.every(e => e.actual !== null);
//     if (allDone) plan.status = 'COMPLETED';
//     else if (plan.status === 'PLANNED' && plan.dailyEntries.some(e => e.actual !== null)) plan.status = 'IN_PROGRESS';

//     plan.updatedBy = req.user?._id;
//     await plan.save();

//     const daysToUpdate = plan.dailyEntries.filter(e => e.date >= date);

//     for (const d of daysToUpdate) {
//       await DailyEntry.findOneAndUpdate(
//         { planId: plan._id, date: d.date },
//         {
//           $set: {
//             planId: plan._id,
//             date: d.date,
//             week: plan.week,
//             year: plan.year,
//             planned: d.planned,
//             actual: d.actual,
//             notes: d.notes ?? '',
//             shift: d.shift ?? 'day',
//             plant: {
//               plantId: plan.model?.assemblyLine?.plant?.plantId ?? '',
//               plantName: plan.model?.assemblyLine?.plant?.plantName ?? '',
//             },
//             assemblyLine: {
//               assemblyLineId: plan.model?.assemblyLine?.assemblyLineId ?? '',
//               assemblyLineName: plan.model?.assemblyLine?.assemblyLineName ?? '',
//             },
//             model: {
//               modelId: plan.model?.modelId ?? '',
//               modelName: plan.model?.modelName ?? '',
//             },
//             part: {
//               partNumber: plan.bom?.partNumber ?? '',
//               partName: plan.bom?.partName ?? '',
//             },
//             enteredBy: req.user?._id ?? null,
//           },
//         },
//         { upsert: true, new: true }
//       );
//     }

//     res.status(200).json({
//       success: true,
//       data: {
//         entry: plan.dailyEntries[idx],
//         entries: plan.dailyEntries,
//         summary: entrySummary(plan),
//         status: plan.status,
//       },
//       message: 'Daily entry updated',
//     });
//   } catch (err) {
//     console.error('updateDailyEntry:', err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

// // =============================================================================
// // ANALYTICS
// // =============================================================================
// export const getWeeklySummary = async (req, res) => {
//   try {
//     const { week, year } = req.query;
//     if (!week) return res.status(400).json({ success: false, message: 'week is required' });

//     const y = year ? parseInt(year) : new Date().getFullYear();
//     const summary = await ProductionPlan.getWeeklySummary(week, y);

//     res.status(200).json({
//       success: true,
//       data: summary[0] ?? {
//         _id: week, totalPlans: 0, totalCapacity: 0, totalValue: 0,
//         plants: [], assemblyLines: [], models: [],
//       },
//     });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

// export const getAnnualOverview = async (req, res) => {
//   try {
//     const y = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();
//     const overview = await ProductionPlan.getAnnualOverview(y);

//     const weeklyData = Array.from({ length: 52 }, (_, i) => {
//       const label = `W${i + 1}`;
//       const weekData = overview.find(d => d._id === label);
//       return {
//         week: label,
//         totalPlans: weekData?.totalPlans || 0,
//         totalCapacity: weekData?.totalCapacity || 0,
//         totalValue: weekData?.totalValue || 0,
//         plants: weekData?.plants || [],
//         statuses: weekData?.statuses || [],
//       };
//     });

//     res.status(200).json({ success: true, data: weeklyData, year: y });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

// export const getPlantSummary = async (req, res) => {
//   try {
//     const { plantId, year } = req.query;
//     if (!plantId) return res.status(400).json({ success: false, message: 'plantId is required' });

//     const y = year ? parseInt(year) : new Date().getFullYear();
//     const summary = await ProductionPlan.getPlantSummary(plantId, y);
//     res.status(200).json({ success: true, data: summary });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

// export const getProductionPlansByRange = async (req, res) => {
//   try {
//     const { startWeek, endWeek, year, plantId } = req.query;
//     if (!startWeek || !endWeek) {
//       return res.status(400).json({ success: false, message: 'startWeek and endWeek are required' });
//     }

//     const y = year ? parseInt(year) : new Date().getFullYear();
//     const start = parseInt(startWeek.substring(1));
//     const end = parseInt(endWeek.substring(1));
//     const weeks = Array.from({ length: end - start + 1 }, (_, i) => `W${start + i}`);

//     const query = { week: { $in: weeks }, year: y };
//     if (plantId) query['model.assemblyLine.plant.plantId'] = plantId;

//     const plans = await ProductionPlan.find(query).sort({ week: 1 });
//     res.status(200).json({ success: true, data: plans, count: plans.length });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

// export const bulkCreateProductionPlans = async (req, res) => {
//   try {
//     const { plans } = req.body;
//     if (!Array.isArray(plans) || plans.length === 0) {
//       return res.status(400).json({ success: false, message: 'Provide an array of plans' });
//     }

//     const matrixIds = [...new Set(plans.map(p => p.matrixId))];
//     const matrices = await Matrix.find({ _id: { $in: matrixIds } }).lean();
//     const matrixMap = Object.fromEntries(matrices.map(m => [m._id.toString(), m]));

//     const enriched = plans.map(p => {
//       const matrix = matrixMap[p.matrixId];
//       if (!matrix) throw new Error(`Matrix not found: ${p.matrixId}`);
//       const planCapacity = p.capacity ?? matrix.model?.assemblyLine?.capacity ?? 0;
//       const planDays = p.workingDays || 6;
//       const planYear = p.year || new Date().getFullYear();
//       return {
//         week: p.week,
//         year: planYear,
//         workingDays: planDays,
//         capacity: planCapacity,
//         matrixRef: p.matrixId,
//         model: matrix.model,
//         bom: matrix.bom,
//         shift: matrix.shift,
//         status: p.status || 'PLANNED',
//         notes: p.notes || '',
//         dailyEntries: buildFreshEntries(planCapacity, planDays, p.week, planYear),
//         createdBy: req.user?._id,
//       };
//     });

//     const created = await ProductionPlan.insertMany(enriched, { ordered: false });
//     res.status(201).json({ success: true, data: created, count: created.length });
//   } catch (err) {
//     if (err.code === 11000) {
//       return res.status(400).json({ success: false, message: 'Some plans already exist (duplicate key)' });
//     }
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

// // =============================================================================
// // UPLOAD MONTHLY PLAN FROM EXCEL (Optimized & Timezone-Proofed)
// // =============================================================================
// export const uploadMonthlyPlan = async (req, res) => {
//   const tempInput = path.join(TEMP_PATH, `monthly_${Date.now()}_${Math.random().toString(36).slice(2)}.xlsx`);

//   try {
//     if (!req.file) {
//       return res.status(400).json({ success: false, message: 'No file uploaded' });
//     }

//     const year = req.body.year ? parseInt(req.body.year) : new Date().getFullYear();
//     const manpower = req.body.manpower ? JSON.parse(req.body.manpower) : {};

//     fs.writeFileSync(tempInput, req.file.buffer);
//     const ftpFileName = `monthly_plan_${year}_${Date.now()}.xlsx`;
//     await uploadToFtp(tempInput, ftpFileName);
//     console.log(`[FTP] Monthly plan saved: ${ftpFileName}`);

//     const xlsx = await import('xlsx');
//     const workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true });
//     const sheetName = workbook.SheetNames[0];
//     const sheet = workbook.Sheets[sheetName];
//     const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

//     if (rawRows.length < 2) {
//       return res.status(400).json({ success: false, message: 'File is empty or missing data rows.' });
//     }

//     const headerRow = rawRows[0];
//     const dateCols = [];

//     // SAFE CUSTOM WEEK INFO - STRICT UTC
//     const getCustomWeekInfo = (dateObjUTC) => {
//       const d = new Date(dateObjUTC.valueOf());
//       const dayNum = d.getUTCDay() || 7;
//       d.setUTCDate(d.getUTCDate() + 4 - dayNum);
//       const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
//       let weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

//       weekNum = weekNum - 1;
//       let weekYear = d.getUTCFullYear();

//       if (weekNum === 0) {
//         weekNum = 52;
//         weekYear -= 1;
//       }

//       return { weekLabel: `W${weekNum}`, weekYear };
//     };

//     // MANUAL PARSE TO PREVENT LOCAL TIMEZONE SHIFT
//     for (let c = 3; c < headerRow.length; c++) {
//       const rawHeader = headerRow[c];
//       if (!rawHeader) continue;

//       let y, m, d;

//       if (rawHeader instanceof Date && !isNaN(rawHeader.getTime())) {
//         // ALWAYS use UTC getters to extract from Date object generated by xlsx
//         y = rawHeader.getUTCFullYear();
//         m = rawHeader.getUTCMonth();
//         d = rawHeader.getUTCDate();
//       } else {
//         const rawStr = String(rawHeader).trim();
//         if (!rawStr) continue;

//         const dmyMatch = rawStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
//         const ymdMatch = rawStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
//         const serialMatch = !dmyMatch && !ymdMatch && /^\d{5}$/.test(rawStr);

//         if (dmyMatch) {
//           y = +dmyMatch[3]; m = +dmyMatch[2] - 1; d = +dmyMatch[1];
//         } else if (ymdMatch) {
//           y = +ymdMatch[1]; m = +ymdMatch[2] - 1; d = +ymdMatch[3];
//         } else if (serialMatch) {
//           const excelEpoch = new Date(Date.UTC(1899, 11, 30));
//           excelEpoch.setUTCDate(excelEpoch.getUTCDate() + parseInt(rawStr));
//           y = excelEpoch.getUTCFullYear();
//           m = excelEpoch.getUTCMonth();
//           d = excelEpoch.getUTCDate();
//         } else {
//           continue;
//         }
//       }

//       // Safe ISO string manually padded (Guarantees no offset shift)
//       const isoDateString = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

//       // Build a pure UTC date for week calculation
//       const utcDate = new Date(Date.UTC(y, m, d));
//       const { weekLabel, weekYear } = getCustomWeekInfo(utcDate);

//       dateCols.push({ colIndex: c, dateStr: isoDateString, weekLabel, weekYear });
//     }

//     if (dateCols.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'No valid date columns found. Expected date values in the header row starting from Column D.',
//       });
//     }

//     const allMatrices = await Matrix.find({}).lean();
//     const matrixMap = new Map();

//     for (const mx of allMatrices) {
//       const partNo = mx.bom?.partNumber?.trim();
//       if (!partNo) continue;
//       if (!matrixMap.has(partNo)) matrixMap.set(partNo, []);
//       matrixMap.get(partNo).push(mx);
//     }

//     let createdCount = 0;
//     let updatedCount = 0;
//     let skippedCount = 0;
//     const errors = [];
//     const notFound = [];
//     const processed = [];

//     for (let r = 1; r < rawRows.length; r++) {
//       const row = rawRows[r];
//       if (!row || row.every(cell => cell === '' || cell == null)) continue;

//       const partNumber = String(row[1] ?? '').trim();
//       const partName = String(row[2] ?? '').trim();
//       if (!partNumber) continue;

//       const matchedMatrices = matrixMap.get(partNumber);
//       if (!matchedMatrices || matchedMatrices.length === 0) {
//         notFound.push({ partNumber, partName });
//         continue;
//       }

//       const weeklyData = new Map();

//       for (const col of dateCols) {
//         const rawQty = row[col.colIndex];
//         const qty = rawQty === '' || rawQty == null ? 0 : (parseFloat(rawQty) || 0);
//         const weekKey = `${col.weekLabel}-${col.weekYear}`;

//         if (!weeklyData.has(weekKey)) {
//           weeklyData.set(weekKey, { weekLabel: col.weekLabel, weekYear: col.weekYear, entries: [] });
//         }

//         weeklyData.get(weekKey).entries.push({
//           date: col.dateStr,
//           planned: qty,
//           actual: null,
//           notes: '',
//           shift: 'day',
//         });
//       }

//       const weeksProcessedForPart = new Set();
//       const splitWeeksForPart = new Set();

//       for (const [weekKey, weekData] of weeklyData.entries()) {
//         const { weekLabel, weekYear, entries } = weekData;

//         const totalUploadedCapacity = entries.reduce((sum, e) => sum + e.planned, 0);
//         const isSplitWeek = entries.length < 7;

//         if (totalUploadedCapacity === 0 && !isSplitWeek) { skippedCount++; continue; }

//         if (isSplitWeek) splitWeeksForPart.add(weekLabel);
//         weeksProcessedForPart.add(weekLabel);

//         const weekManpowerVal = manpower[weekLabel] ?? null;

//         for (const matrix of matchedMatrices) {
//           try {
//             let plan = await ProductionPlan.findOne({
//               matrixRef: matrix._id,
//               week: weekLabel,
//               year: weekYear,
//             });

//             if (plan) {
//               const existingEntriesMap = new Map(plan.dailyEntries.map(e => [e.date, e.toObject()]));

//               for (const newEntry of entries) {
//                 if (existingEntriesMap.has(newEntry.date)) {
//                   const existing = existingEntriesMap.get(newEntry.date);
//                   existing.planned = newEntry.planned;
//                   existingEntriesMap.set(newEntry.date, existing);
//                 } else {
//                   existingEntriesMap.set(newEntry.date, newEntry);
//                 }
//               }

//               const mergedEntries = Array.from(existingEntriesMap.values())
//                 .sort((a, b) => a.date.localeCompare(b.date));

//               const newCapacity = mergedEntries.reduce((sum, e) => sum + (e.planned || 0), 0);
//               const activeDays = mergedEntries.filter(e => e.planned > 0).length;
//               const allWeekDates = isoWeekDates(weekLabel, weekYear);
//               const coveredDates = new Set(mergedEntries.map(e => e.date));
//               const isStillPartial = !allWeekDates.every(d => coveredDates.has(d));

//               plan.dailyEntries = mergedEntries;
//               plan.capacity = newCapacity;
//               plan.workingDays = isStillPartial ? 7 : Math.max(activeDays, 1);
//               plan.isPartialWeek = isStillPartial;
//               if (weekManpowerVal !== null) plan.notes = `Manpower: ${weekManpowerVal}`;
//               plan.updatedBy = req.user?._id;

//               await plan.save();

//               await syncDailyEntriesToCollection(plan, plan.dailyEntries, req.user?._id);

//               updatedCount++;

//             } else {
//               const activeDays = entries.filter(e => e.planned > 0).length;
//               const workingDays = isSplitWeek ? 7 : Math.max(activeDays, 1);

//               const newPlan = await ProductionPlan.create({
//                 week: weekLabel,
//                 year: weekYear,
//                 workingDays,
//                 capacity: totalUploadedCapacity,
//                 isPartialWeek: isSplitWeek,
//                 matrixRef: matrix._id,
//                 model: matrix.model,
//                 bom: matrix.bom,
//                 shift: matrix.shift,
//                 status: 'PLANNED',
//                 notes: weekManpowerVal !== null ? `Manpower: ${weekManpowerVal}` : '',
//                 dailyEntries: entries,
//                 createdBy: req.user?._id,
//               });

//               await syncDailyEntriesToCollection(newPlan, newPlan.dailyEntries, req.user?._id);

//               createdCount++;
//             }
//           } catch (error) {
//             errors.push({ partNumber, week: weekLabel, error: error.message });
//           }
//         }
//       }

//       processed.push({
//         partNumber,
//         partName,
//         matrixCount: matchedMatrices.length,
//         weeks: Array.from(weeksProcessedForPart),
//         splitWeeks: Array.from(splitWeeksForPart),
//       });
//     }

//     const allSplitWeeks = Array.from(
//       new Set(processed.flatMap(p => p.splitWeeks))
//     ).sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));

//     return res.status(201).json({
//       success: true,
//       message: `Import complete. Created: ${createdCount}, Updated: ${updatedCount}.`,
//       summary: {
//         created: createdCount,
//         updated: updatedCount,
//         skipped: skippedCount,
//         errors,
//         processed,
//         notFound,
//         splitWeeks: allSplitWeeks,
//         datesFound: dateCols.length,
//         rowsInFile: rawRows.length - 1,
//       },
//     });

//   } catch (err) {
//     console.error('uploadMonthlyPlan Error:', err);
//     return res.status(500).json({ success: false, message: err.message });
//   } finally {
//     cleanupTemp(tempInput);
//   }
// };import ProductionPlan from '../models/productionPlan.model.js';import ProductionPlan from '../models/productionPlan.model.js';
import ProductionPlan from "../models/productionPlan.model.js";
import { Matrix } from "../models/master.model.js";
import {
  buildFreshEntries,
  recomputeBacklog,
  isoWeekDates,
} from "../models/productionPlan.model.js";
import { DailyEntry } from "./dailyEntry.controller.js";
import {
  uploadToFtp,
  downloadFromFtp,
  TEMP_PATH,
  cleanupTemp,
} from "../lib/ftp.js";
import fs from "fs";
import path from "path";
import * as xlsx from "xlsx";

// =============================================================================
// SHARED UTILS
// =============================================================================

function entrySummary(plan) {
  const entered = plan.dailyEntries.filter((e) => e.actual !== null);
  const totalActual = entered.reduce((s, e) => s + (e.actual ?? 0), 0);
  const totalPlan = plan.dailyEntries.reduce((s, e) => s + e.planned, 0);
  return {
    totalPlanned: totalPlan,
    totalActual,
    weekCapacity: plan.capacity,
    adherence: totalPlan > 0 ? Math.round((totalActual / totalPlan) * 100) : 0,
    daysEntered: entered.length,
    daysRemaining: plan.dailyEntries.filter((e) => e.actual === null).length,
    backlog: totalPlan - totalActual,
  };
}

// =============================================================================
// SYNC HELPER
// =============================================================================
async function syncDailyEntriesToCollection(plan, entries, userId) {
  if (!entries || entries.length === 0) return;

  const planId = plan._id;
  const baseFields = {
    week: plan.week,
    year: plan.year,
    plant: {
      plantId: plan.model?.assemblyLine?.plant?.plantId ?? "",
      plantName: plan.model?.assemblyLine?.plant?.plantName ?? "",
    },
    assemblyLine: {
      assemblyLineId: plan.model?.assemblyLine?.assemblyLineId ?? "",
      assemblyLineName: plan.model?.assemblyLine?.assemblyLineName ?? "",
    },
    model: {
      modelId: plan.model?.modelId ?? "",
      modelName: plan.model?.modelName ?? "",
    },
    part: {
      partNumber: plan.bom?.partNumber ?? "",
      partName: plan.bom?.partName ?? "",
    },
    enteredBy: userId ?? null,
  };

  const ops = entries.map((entry) => ({
    updateOne: {
      filter: { planId, date: entry.date },
      update: {
        $set: {
          ...baseFields,
          planId,
          date: entry.date,
          planned: entry.planned,
        },
        $setOnInsert: {
          actual: null,
          notes: "",
          shift: "day",
        },
      },
      upsert: true,
    },
  }));

  await DailyEntry.bulkWrite(ops, { ordered: false });
}

// =============================================================================
// CREATE
// =============================================================================
export const createProductionPlan = async (req, res) => {
  try {
    const { matrixId, week, year, workingDays, capacity, status, notes } =
      req.body;

    if (!matrixId || !week) {
      return res
        .status(400)
        .json({ success: false, message: "matrixId and week are required" });
    }

    const matrix = await Matrix.findById(matrixId).lean();
    if (!matrix) {
      return res
        .status(404)
        .json({ success: false, message: `Matrix not found: ${matrixId}` });
    }

    const planYear = year || new Date().getFullYear();
    const planCapacity =
      capacity != null ? capacity : (matrix.model?.assemblyLine?.capacity ?? 0);
    const planDays = workingDays ?? 6;

    const exists = await ProductionPlan.exists({
      matrixRef: matrixId,
      week,
      year: planYear,
    });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: `A production plan already exists for this Matrix entry in ${week} ${planYear}`,
      });
    }

    const plan = await ProductionPlan.create({
      week,
      year: planYear,
      workingDays: planDays,
      capacity: planCapacity,
      matrixRef: matrixId,
      model: matrix.model,
      bom: matrix.bom,
      shift: matrix.shift,
      status: status || "PLANNED",
      notes: notes || "",
      createdBy: req.user?._id,
    });

    res.status(201).json({
      success: true,
      data: plan,
      message: `Production plan created with ${plan.dailyEntries.length} daily entries`,
    });
  } catch (err) {
    console.error("createProductionPlan:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// =============================================================================
// GET ALL
// =============================================================================
export const getAllProductionPlans = async (req, res) => {
  try {
    const {
      week,
      year,
      plantId,
      assemblyLineId,
      modelId,
      status,
      page = 1,
      limit = 50,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query = {};
    if (week) query.week = week;
    if (year) query.year = parseInt(year);
    if (plantId) query["model.assemblyLine.plant.plantId"] = plantId;
    if (assemblyLineId)
      query["model.assemblyLine.assemblyLineId"] = assemblyLineId;
    if (modelId) query["model.modelId"] = modelId;
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const [plans, total] = await Promise.all([
      ProductionPlan.find(query).sort(sort).skip(skip).limit(parseInt(limit)),
      ProductionPlan.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: plans,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("getAllProductionPlans:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// =============================================================================
// GET ONE
// =============================================================================
export const getProductionPlanById = async (req, res) => {
  try {
    const plan = await ProductionPlan.findById(req.params.id);
    if (!plan)
      return res
        .status(404)
        .json({ success: false, message: "Production plan not found" });
    res.status(200).json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// =============================================================================
// UPDATE
// =============================================================================
export const updateProductionPlan = async (req, res) => {
  try {
    const plan = await ProductionPlan.findById(req.params.id);
    if (!plan)
      return res
        .status(404)
        .json({ success: false, message: "Production plan not found" });

    const { matrixId, capacity, workingDays, status, notes } = req.body;
    let needsRegenerate = false;

    if (matrixId && matrixId !== plan.matrixRef?.toString()) {
      const matrix = await Matrix.findById(matrixId).lean();
      if (!matrix)
        return res
          .status(404)
          .json({ success: false, message: `Matrix not found: ${matrixId}` });
      plan.matrixRef = matrixId;
      plan.model = matrix.model;
      plan.bom = matrix.bom;
      plan.shift = matrix.shift;
      needsRegenerate = true;
    }

    if (capacity != null && capacity !== plan.capacity) {
      plan.capacity = capacity;
      needsRegenerate = true;
    }
    if (workingDays != null && workingDays !== plan.workingDays) {
      plan.workingDays = workingDays;
      needsRegenerate = true;
    }
    if (status !== undefined) plan.status = status;
    if (notes !== undefined) plan.notes = notes;
    plan.updatedBy = req.user?._id;

    if (needsRegenerate) {
      plan.dailyEntries = buildFreshEntries(
        plan.capacity,
        plan.workingDays,
        plan.week,
        plan.year,
      );
    }

    await plan.save();

    res.status(200).json({
      success: true,
      data: plan,
      message: needsRegenerate
        ? "Production plan updated — daily entries regenerated"
        : "Production plan updated",
    });
  } catch (err) {
    console.error("updateProductionPlan:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// =============================================================================
// DELETE
// =============================================================================
export const deleteProductionPlan = async (req, res) => {
  try {
    const plan = await ProductionPlan.findByIdAndDelete(req.params.id);
    if (!plan)
      return res
        .status(404)
        .json({ success: false, message: "Production plan not found" });
    res
      .status(200)
      .json({ success: true, message: "Production plan deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// =============================================================================
// DAILY ENTRIES — GET
// =============================================================================
export const getDailyEntries = async (req, res) => {
  try {
    const plan = await ProductionPlan.findById(req.params.id);
    if (!plan)
      return res
        .status(404)
        .json({ success: false, message: "Production plan not found" });

    res.status(200).json({
      success: true,
      data: {
        plan: {
          _id: plan._id,
          week: plan.week,
          year: plan.year,
          capacity: plan.capacity,
          workingDays: plan.workingDays,
          shift: plan.shift,
          status: plan.status,
          isPartialWeek: plan.isPartialWeek,
          plant: plan.model?.assemblyLine?.plant,
          assemblyLine: {
            assemblyLineId: plan.model?.assemblyLine?.assemblyLineId,
            assemblyLineName: plan.model?.assemblyLine?.assemblyLineName,
          },
          model: {
            modelId: plan.model?.modelId,
            modelName: plan.model?.modelName,
          },
          bom: plan.bom,
        },
        entries: plan.dailyEntries, // Directly uses EXACT mapping from DB
        summary: entrySummary(plan),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// =============================================================================
// DAILY ENTRIES — UPDATE ONE DAY (With Surplus & Shortfall Redistribution)
// =============================================================================
// RESTORED IN THIS FILE TO FIX THE EXPORT ERROR
export const updateDailyEntry = async (req, res) => {
  try {
    const { id, date } = req.params;
    const { actual, notes, shift, redistribution } = req.body;

    if (actual !== null && (actual === undefined || actual < 0)) {
      return res.status(400).json({
        success: false,
        message: "actual must be null or a non-negative number",
      });
    }

    const plan = await ProductionPlan.findById(id);
    if (!plan)
      return res
        .status(404)
        .json({ success: false, message: "Production plan not found" });

    const idx = plan.dailyEntries.findIndex((e) => e.date === date);
    if (idx === -1) {
      return res.status(404).json({
        success: false,
        message: `No daily entry mapped for date ${date}`,
      });
    }

    plan.dailyEntries[idx].actual = actual !== null ? parseInt(actual) : null;
    if (notes !== undefined) plan.dailyEntries[idx].notes = notes;
    if (shift) plan.dailyEntries[idx].shift = shift;

    const shortfall =
      actual !== null ? plan.dailyEntries[idx].planned - parseInt(actual) : 0;

    if (actual === null || shortfall === 0) {
      recomputeBacklog(plan.dailyEntries, plan.capacity);
    } else if (redistribution && Array.isArray(redistribution)) {
      plan.dailyEntries[idx].backlog = shortfall;

      for (const dist of redistribution) {
        const fIdx = plan.dailyEntries.findIndex((e) => e.date === dist.date);
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

    const allDone = plan.dailyEntries.every((e) => e.actual !== null);
    if (allDone) plan.status = "COMPLETED";
    else if (
      plan.status === "PLANNED" &&
      plan.dailyEntries.some((e) => e.actual !== null)
    )
      plan.status = "IN_PROGRESS";

    plan.updatedBy = req.user?._id;
    await plan.save();

    const daysToUpdate = plan.dailyEntries.filter((e) => e.date >= date);

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
            notes: d.notes ?? "",
            shift: d.shift ?? "day",
            plant: {
              plantId: plan.model?.assemblyLine?.plant?.plantId ?? "",
              plantName: plan.model?.assemblyLine?.plant?.plantName ?? "",
            },
            assemblyLine: {
              assemblyLineId: plan.model?.assemblyLine?.assemblyLineId ?? "",
              assemblyLineName:
                plan.model?.assemblyLine?.assemblyLineName ?? "",
            },
            model: {
              modelId: plan.model?.modelId ?? "",
              modelName: plan.model?.modelName ?? "",
            },
            part: {
              partNumber: plan.bom?.partNumber ?? "",
              partName: plan.bom?.partName ?? "",
            },
            enteredBy: req.user?._id ?? null,
          },
        },
        { upsert: true, new: true },
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
      message: "Daily entry updated",
    });
  } catch (err) {
    console.error("upsertDailyEntry error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// =============================================================================
// ANALYTICS
// =============================================================================
export const getWeeklySummary = async (req, res) => {
  try {
    const { week, year } = req.query;
    if (!week)
      return res
        .status(400)
        .json({ success: false, message: "week is required" });

    const y = year ? parseInt(year) : new Date().getFullYear();
    const summary = await ProductionPlan.getWeeklySummary(week, y);

    res.status(200).json({
      success: true,
      data: summary[0] ?? {
        _id: week,
        totalPlans: 0,
        totalCapacity: 0,
        totalValue: 0,
        plants: [],
        assemblyLines: [],
        models: [],
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAnnualOverview = async (req, res) => {
  try {
    const y = req.query.year
      ? parseInt(req.query.year)
      : new Date().getFullYear();
    const overview = await ProductionPlan.getAnnualOverview(y);

    const weeklyData = Array.from({ length: 52 }, (_, i) => {
      const label = `W${i + 1}`;
      const weekData = overview.find((d) => d._id === label);
      return {
        week: label,
        totalPlans: weekData?.totalPlans || 0,
        totalCapacity: weekData?.totalCapacity || 0,
        totalValue: weekData?.totalValue || 0,
        plants: weekData?.plants || [],
        statuses: weekData?.statuses || [],
      };
    });

    res.status(200).json({ success: true, data: weeklyData, year: y });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getPlantSummary = async (req, res) => {
  try {
    const { plantId, year } = req.query;
    if (!plantId)
      return res
        .status(400)
        .json({ success: false, message: "plantId is required" });

    const y = year ? parseInt(year) : new Date().getFullYear();
    const summary = await ProductionPlan.getPlantSummary(plantId, y);
    res.status(200).json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getProductionPlansByRange = async (req, res) => {
  try {
    const { startWeek, endWeek, year, plantId } = req.query;
    if (!startWeek || !endWeek) {
      return res.status(400).json({
        success: false,
        message: "startWeek and endWeek are required",
      });
    }

    const y = year ? parseInt(year) : new Date().getFullYear();
    const start = parseInt(startWeek.substring(1));
    const end = parseInt(endWeek.substring(1));
    const weeks = Array.from(
      { length: end - start + 1 },
      (_, i) => `W${start + i}`,
    );

    const query = { week: { $in: weeks }, year: y };
    if (plantId) query["model.assemblyLine.plant.plantId"] = plantId;

    const plans = await ProductionPlan.find(query).sort({ week: 1 });
    res.status(200).json({ success: true, data: plans, count: plans.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const bulkCreateProductionPlans = async (req, res) => {
  try {
    const { plans } = req.body;
    if (!Array.isArray(plans) || plans.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Provide an array of plans" });
    }

    const matrixIds = [...new Set(plans.map((p) => p.matrixId))];
    const matrices = await Matrix.find({ _id: { $in: matrixIds } }).lean();
    const matrixMap = Object.fromEntries(
      matrices.map((m) => [m._id.toString(), m]),
    );

    const enriched = plans.map((p) => {
      const matrix = matrixMap[p.matrixId];
      if (!matrix) throw new Error(`Matrix not found: ${p.matrixId}`);
      const planCapacity =
        p.capacity ?? matrix.model?.assemblyLine?.capacity ?? 0;
      const planDays = p.workingDays || 6;
      const planYear = p.year || new Date().getFullYear();
      return {
        week: p.week,
        year: planYear,
        workingDays: planDays,
        capacity: planCapacity,
        matrixRef: p.matrixId,
        model: matrix.model,
        bom: matrix.bom,
        shift: matrix.shift,
        status: p.status || "PLANNED",
        notes: p.notes || "",
        dailyEntries: buildFreshEntries(
          planCapacity,
          planDays,
          p.week,
          planYear,
        ),
        createdBy: req.user?._id,
      };
    });

    const created = await ProductionPlan.insertMany(enriched, {
      ordered: false,
    });
    res
      .status(201)
      .json({ success: true, data: created, count: created.length });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Some plans already exist (duplicate key)",
      });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// =============================================================================
// UPLOAD MONTHLY PLAN FROM EXCEL (Exact Date Mapping & Timezone-Proofed)
// =============================================================================
// const getCustomWeekInfo = (dateObjUTC) => {
//   const d = new Date(dateObjUTC.valueOf());
//   const dayNum = d.getUTCDay() || 7;
//   d.setUTCDate(d.getUTCDate() + 4 - dayNum);
//   const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));

//   let weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
//   weekNum -= 1;

//   let weekYear = d.getUTCFullYear();

//   if (weekNum === 0) {
//     weekNum = 52;
//     weekYear -= 1;
//   }

//   return { weekLabel: `W${weekNum}`, weekYear };
// };
const getCustomWeekInfo = (dateObjUTC) => {
  const d = new Date(
    Date.UTC(
      dateObjUTC.getUTCFullYear(),
      dateObjUTC.getUTCMonth(),
      dateObjUTC.getUTCDate(),
    ),
  );

  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);

  const weekYear = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(weekYear, 0, 1));
  const weekNum = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );

  return {
    weekLabel: `W${weekNum}`,
    weekYear,
  };
};

const parseExcelSerialDate = (serial, date1904 = false) => {
  if (!Number.isFinite(serial)) return null;

  const wholeDays = Math.floor(serial);
  const baseUtc = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 31);

  // Excel 1900 date system includes the fake date 1900-02-29
  const adjustedDays = date1904
    ? wholeDays
    : wholeDays > 59
      ? wholeDays - 1
      : wholeDays;

  const utcDate = new Date(baseUtc + adjustedDays * 86400000);

  return {
    y: utcDate.getUTCFullYear(),
    m: utcDate.getUTCMonth(),
    d: utcDate.getUTCDate(),
  };
};

const parseHeaderDateCell = (cell, date1904 = false) => {
  if (!cell) return null;

  if (typeof cell.v === "number" && Number.isFinite(cell.v)) {
    return parseExcelSerialDate(cell.v, date1904);
  }

  const text = String(cell.w ?? cell.v ?? "").trim();
  if (!text) return null;

  // const dmyMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  const dmyMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    return {
      y: Number(dmyMatch[3]),
      m: Number(dmyMatch[2]) - 1,
      d: Number(dmyMatch[1]),
    };
  }

  // const ymdMatch = text.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  const ymdMatch = text.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (ymdMatch) {
    return {
      y: Number(ymdMatch[1]),
      m: Number(ymdMatch[2]) - 1,
      d: Number(ymdMatch[3]),
    };
  }

  if (/^\d{5,6}(\.\d+)?$/.test(text)) {
    return parseExcelSerialDate(Number(text), date1904);
  }

  return null;
};

const toPlainDailyEntry = (entry) => {
  if (!entry) return entry;
  return typeof entry.toObject === "function" ? entry.toObject() : { ...entry };
};

// export const uploadMonthlyPlan = async (req, res) => {
//   const tempInput = path.join(
//     TEMP_PATH,
//     `monthly_${Date.now()}_${Math.random().toString(36).slice(2)}.xlsx`,
//   );

//   try {
//     if (!req.file) {
//       return res
//         .status(400)
//         .json({ success: false, message: "No file uploaded" });
//     }

//     const parsedYear = req.body.year
//       ? Number.parseInt(req.body.year, 10)
//       : new Date().getFullYear();

//     if (!Number.isInteger(parsedYear)) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Invalid year value" });
//     }

//     let manpower = {};
//     if (req.body.manpower) {
//       try {
//         manpower =
//           typeof req.body.manpower === "string"
//             ? JSON.parse(req.body.manpower)
//             : req.body.manpower;
//       } catch {
//         return res.status(400).json({
//           success: false,
//           message: "Invalid manpower JSON format",
//         });
//       }
//     }

//     fs.writeFileSync(tempInput, req.file.buffer);

//     const ftpFileName = `monthly_plan_${parsedYear}_${Date.now()}.xlsx`;
//     await uploadToFtp(tempInput, ftpFileName);
//     console.log(`[FTP] Monthly plan saved: ${ftpFileName}`);

//     const workbook = xlsx.read(req.file.buffer, {
//       type: "buffer",
//       cellDates: false,
//     });

//     const sheetName = workbook.SheetNames?.[0];
//     if (!sheetName) {
//       return res.status(400).json({
//         success: false,
//         message: "No worksheet found in the uploaded file.",
//       });
//     }

//     const sheet = workbook.Sheets[sheetName];
//     if (!sheet) {
//       return res.status(400).json({
//         success: false,
//         message: "Unable to read the first worksheet.",
//       });
//     }

//     const rawRows = xlsx.utils.sheet_to_json(sheet, {
//       header: 1,
//       defval: "",
//       raw: true,
//     });

//     if (rawRows.length < 2) {
//       return res.status(400).json({
//         success: false,
//         message: "File is empty or missing data rows.",
//       });
//     }

//     const sheetRange = sheet["!ref"]
//       ? xlsx.utils.decode_range(sheet["!ref"])
//       : null;
//     if (!sheetRange) {
//       return res.status(400).json({
//         success: false,
//         message: "Sheet has no readable range.",
//       });
//     }

//     const date1904 = Boolean(workbook.Workbook?.WBProps?.date1904);
//     const dateCols = [];
//     const headerDaysPerWeek = new Map();

//     for (let c = 3; c <= sheetRange.e.c; c += 1) {
//       const cellAddress = xlsx.utils.encode_cell({ r: 0, c });
//       const parsedDate = parseHeaderDateCell(sheet[cellAddress], date1904);
//       if (!parsedDate) continue;

//       const { y, m, d } = parsedDate;
//       const isoDateString = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
//       const utcDate = new Date(Date.UTC(y, m, d));
//       const { weekLabel, weekYear } = getCustomWeekInfo(utcDate);

//       dateCols.push({
//         colIndex: c,
//         dateStr: isoDateString,
//         weekLabel,
//         weekYear,
//       });
//     }

//     if (dateCols.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "No valid date columns found. Expected date values in the header row starting from Column D.",
//       });
//     }

//     const allMatrices = await Matrix.find({}).lean();
//     const matrixMap = new Map();

//     for (const mx of allMatrices) {
//       const partNo = String(mx.bom?.partNumber ?? "").trim();
//       if (!partNo) continue;

//       if (!matrixMap.has(partNo)) {
//         matrixMap.set(partNo, []);
//       }

//       matrixMap.get(partNo).push(mx);
//     }

//     let createdCount = 0;
//     let updatedCount = 0;
//     let skippedCount = 0;

//     const errors = [];
//     const notFound = [];
//     const processed = [];

//     for (let r = 1; r < rawRows.length; r += 1) {
//       const row = rawRows[r];
//       if (!row || row.every((cell) => cell === "" || cell == null)) continue;

//       const partNumber = String(row[1] ?? "").trim();
//       const partName = String(row[2] ?? "").trim();

//       if (!partNumber) continue;

//       const matchedMatrices = matrixMap.get(partNumber);
//       if (!matchedMatrices || matchedMatrices.length === 0) {
//         notFound.push({ partNumber, partName });
//         continue;
//       }

//       const weeklyData = new Map();

//       for (const col of dateCols) {
//         const rawQty = row[col.colIndex];
//         const qty =
//           rawQty === "" || rawQty == null
//             ? 0
//             : Number.parseFloat(String(rawQty).replace(/,/g, "")) || 0;

//         if (qty <= 0) continue;

//         const weekKey = `${col.weekLabel}-${col.weekYear}`;

//         if (!weeklyData.has(weekKey)) {
//           weeklyData.set(weekKey, {
//             weekLabel: col.weekLabel,
//             weekYear: col.weekYear,
//             entries: [],
//           });
//         }

//         weeklyData.get(weekKey).entries.push({
//           date: col.dateStr,
//           planned: qty,
//           actual: null,
//           notes: "",
//           shift: "day",
//         });
//       }

//       const weeksProcessedForPart = new Set();
//       const splitWeeksForPart = new Set();

//       for (const [weekKey, weekData] of weeklyData.entries()) {
//         const { weekLabel, weekYear, entries } = weekData;

//         const totalUploadedCapacity = entries.reduce(
//           (sum, entry) => sum + entry.planned,
//           0,
//         );
//         const headerDaysInWeek = headerDaysPerWeek.get(weekKey) ?? 0;
//         const isSplitWeek = headerDaysInWeek < 7;

//         if (totalUploadedCapacity === 0 && !isSplitWeek) {
//           skippedCount += 1;
//           continue;
//         }

//         if (isSplitWeek) splitWeeksForPart.add(weekLabel);
//         weeksProcessedForPart.add(weekLabel);

//         const weekManpowerVal = manpower[weekLabel] ?? null;

//         for (const matrix of matchedMatrices) {
//           try {
//             let plan = await ProductionPlan.findOne({
//               matrixRef: matrix._id,
//               week: weekLabel,
//               year: weekYear,
//             });

//             if (plan) {
//               const existingEntriesMap = new Map(
//                 (plan.dailyEntries ?? []).map((entry) => [
//                   entry.date,
//                   toPlainDailyEntry(entry),
//                 ]),
//               );

//               for (const newEntry of entries) {
//                 if (existingEntriesMap.has(newEntry.date)) {
//                   const existing = existingEntriesMap.get(newEntry.date);
//                   existing.planned = newEntry.planned;
//                   existingEntriesMap.set(newEntry.date, existing);
//                 } else {
//                   existingEntriesMap.set(newEntry.date, newEntry);
//                 }
//               }

//               const mergedEntries = Array.from(
//                 existingEntriesMap.values(),
//               ).sort((a, b) => String(a.date).localeCompare(String(b.date)));

//               const newCapacity = mergedEntries.reduce(
//                 (sum, entry) => sum + (entry.planned || 0),
//                 0,
//               );
//               const activeDays = mergedEntries.filter(
//                 (entry) => entry.planned > 0,
//               ).length;

//               plan.dailyEntries = mergedEntries;
//               plan.capacity = newCapacity;
//               plan.workingDays = Math.max(activeDays, 1);
//               plan.isPartialWeek = isSplitWeek;

//               if (weekManpowerVal !== null) {
//                 plan.notes = `Manpower: ${weekManpowerVal}`;
//               }

//               plan.updatedBy = req.user?._id;

//               await plan.save();
//               await syncDailyEntriesToCollection(
//                 plan,
//                 plan.dailyEntries,
//                 req.user?._id,
//               );

//               updatedCount += 1;
//             } else {
//               const activeDays = entries.filter(
//                 (entry) => entry.planned > 0,
//               ).length;
//               const workingDays = Math.max(activeDays, 1);

//               const newPlan = await ProductionPlan.create({
//                 week: weekLabel,
//                 year: weekYear,
//                 workingDays,
//                 capacity: totalUploadedCapacity,
//                 isPartialWeek: isSplitWeek,
//                 matrixRef: matrix._id,
//                 model: matrix.model,
//                 bom: matrix.bom,
//                 shift: matrix.shift,
//                 status: "PLANNED",
//                 notes:
//                   weekManpowerVal !== null
//                     ? `Manpower: ${weekManpowerVal}`
//                     : "",
//                 dailyEntries: entries,
//                 createdBy: req.user?._id,
//               });

//               await syncDailyEntriesToCollection(
//                 newPlan,
//                 newPlan.dailyEntries,
//                 req.user?._id,
//               );
//               createdCount += 1;
//             }
//           } catch (error) {
//             errors.push({
//               partNumber,
//               week: weekLabel,
//               error: error.message,
//             });
//           }
//         }
//       }

//       processed.push({
//         partNumber,
//         partName,
//         matrixCount: matchedMatrices.length,
//         weeks: Array.from(weeksProcessedForPart),
//         splitWeeks: Array.from(splitWeeksForPart),
//       });
//     }

//     const allSplitWeeks = Array.from(
//       new Set(processed.flatMap((item) => item.splitWeeks)),
//     ).sort(
//       (a, b) =>
//         Number.parseInt(a.slice(1), 10) - Number.parseInt(b.slice(1), 10),
//     );

//     return res.status(201).json({
//       success: true,
//       message: `Import complete. Created: ${createdCount}, Updated: ${updatedCount}.`,
//       summary: {
//         created: createdCount,
//         updated: updatedCount,
//         skipped: skippedCount,
//         errors,
//         processed,
//         notFound,
//         splitWeeks: allSplitWeeks,
//         datesFound: dateCols.length,
//         rowsInFile: rawRows.length - 1,
//       },
//     });
//   } catch (err) {
//     console.error("uploadMonthlyPlan Error:", err);
//     return res.status(500).json({
//       success: false,
//       message: err.message || "Failed to upload monthly plan",
//     });
//   } finally {
//     cleanupTemp(tempInput);
//   }
// };
// =============================================================================
// CORE EXCEL PROCESSING LOGIC (Decoupled for Automation & Manual Upload)
// =============================================================================
export const processMonthlyExcelBuffer = async (fileBuffer, parsedYear, manpower, userId) => {
  const workbook = xlsx.read(fileBuffer, {
    type: "buffer",
    cellDates: false,
  });

  const sheetName = workbook.SheetNames?.[0];
  if (!sheetName) throw new Error("No worksheet found in the file.");

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error("Unable to read the first worksheet.");

  const rawRows = xlsx.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: true,
  });

  if (rawRows.length < 2) throw new Error("File is empty or missing data rows.");

  const sheetRange = sheet["!ref"] ? xlsx.utils.decode_range(sheet["!ref"]) : null;
  if (!sheetRange) throw new Error("Sheet has no readable range.");

  const date1904 = Boolean(workbook.Workbook?.WBProps?.date1904);
  const dateCols = [];
  const headerDaysPerWeek = new Map();

  for (let c = 3; c <= sheetRange.e.c; c += 1) {
    const cellAddress = xlsx.utils.encode_cell({ r: 0, c });
    const parsedDate = parseHeaderDateCell(sheet[cellAddress], date1904);
    if (!parsedDate) continue;

    const { y, m, d } = parsedDate;
    const isoDateString = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const utcDate = new Date(Date.UTC(y, m, d));
    const { weekLabel, weekYear } = getCustomWeekInfo(utcDate);

    dateCols.push({ colIndex: c, dateStr: isoDateString, weekLabel, weekYear });
  }

  if (dateCols.length === 0) {
    throw new Error("No valid date columns found starting from Column D.");
  }

  const allMatrices = await Matrix.find({}).lean();
  const matrixMap = new Map();

  for (const mx of allMatrices) {
    const partNo = String(mx.bom?.partNumber ?? "").trim();
    if (!partNo) continue;
    if (!matrixMap.has(partNo)) matrixMap.set(partNo, []);
    matrixMap.get(partNo).push(mx);
  }

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  const errors = [];
  const notFound = [];
  const processed = [];

  for (let r = 1; r < rawRows.length; r += 1) {
    const row = rawRows[r];
    if (!row || row.every((cell) => cell === "" || cell == null)) continue;

    const partNumber = String(row[1] ?? "").trim();
    const partName = String(row[2] ?? "").trim();
    if (!partNumber) continue;

    const matchedMatrices = matrixMap.get(partNumber);
    if (!matchedMatrices || matchedMatrices.length === 0) {
      notFound.push({ partNumber, partName });
      continue;
    }

    const weeklyData = new Map();

    for (const col of dateCols) {
      const rawQty = row[col.colIndex];
      const qty = rawQty === "" || rawQty == null ? 0 : Number.parseFloat(String(rawQty).replace(/,/g, "")) || 0;
      if (qty <= 0) continue;

      const weekKey = `${col.weekLabel}-${col.weekYear}`;
      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, { weekLabel: col.weekLabel, weekYear: col.weekYear, entries: [] });
      }

      weeklyData.get(weekKey).entries.push({
        date: col.dateStr,
        planned: qty,
        actual: null,
        notes: "",
        shift: "day",
      });
    }

    const weeksProcessedForPart = new Set();
    const splitWeeksForPart = new Set();

    for (const [weekKey, weekData] of weeklyData.entries()) {
      const { weekLabel, weekYear, entries } = weekData;
      const totalUploadedCapacity = entries.reduce((sum, entry) => sum + entry.planned, 0);
      const headerDaysInWeek = headerDaysPerWeek.get(weekKey) ?? 0;
      const isSplitWeek = headerDaysInWeek < 7;

      if (totalUploadedCapacity === 0 && !isSplitWeek) {
        skippedCount += 1;
        continue;
      }

      if (isSplitWeek) splitWeeksForPart.add(weekLabel);
      weeksProcessedForPart.add(weekLabel);

      const weekManpowerVal = manpower[weekLabel] ?? null;

      for (const matrix of matchedMatrices) {
        try {
          let plan = await ProductionPlan.findOne({ matrixRef: matrix._id, week: weekLabel, year: weekYear });

          if (plan) {
            const existingEntriesMap = new Map((plan.dailyEntries ?? []).map((entry) => [entry.date, toPlainDailyEntry(entry)]));

            for (const newEntry of entries) {
              if (existingEntriesMap.has(newEntry.date)) {
                const existing = existingEntriesMap.get(newEntry.date);
                existing.planned = newEntry.planned;
                existingEntriesMap.set(newEntry.date, existing);
              } else {
                existingEntriesMap.set(newEntry.date, newEntry);
              }
            }

            const mergedEntries = Array.from(existingEntriesMap.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)));
            const newCapacity = mergedEntries.reduce((sum, entry) => sum + (entry.planned || 0), 0);
            const activeDays = mergedEntries.filter((entry) => entry.planned > 0).length;

            plan.dailyEntries = mergedEntries;
            plan.capacity = newCapacity;
            plan.workingDays = Math.max(activeDays, 1);
            plan.isPartialWeek = isSplitWeek;
            if (weekManpowerVal !== null) plan.notes = `Manpower: ${weekManpowerVal}`;
            plan.updatedBy = userId;

            await plan.save();
            await syncDailyEntriesToCollection(plan, plan.dailyEntries, userId);
            updatedCount += 1;
          } else {
            const activeDays = entries.filter((entry) => entry.planned > 0).length;
            const workingDays = Math.max(activeDays, 1);

            const newPlan = await ProductionPlan.create({
              week: weekLabel,
              year: weekYear,
              workingDays,
              capacity: totalUploadedCapacity,
              isPartialWeek: isSplitWeek,
              matrixRef: matrix._id,
              model: matrix.model,
              bom: matrix.bom,
              shift: matrix.shift,
              status: "PLANNED",
              notes: weekManpowerVal !== null ? `Manpower: ${weekManpowerVal}` : "",
              dailyEntries: entries,
              createdBy: userId,
            });

            await syncDailyEntriesToCollection(newPlan, newPlan.dailyEntries, userId);
            createdCount += 1;
          }
        } catch (error) {
          errors.push({ partNumber, week: weekLabel, error: error.message });
        }
      }
    }

    processed.push({
      partNumber,
      partName,
      matrixCount: matchedMatrices.length,
      weeks: Array.from(weeksProcessedForPart),
      splitWeeks: Array.from(splitWeeksForPart),
    });
  }

  const allSplitWeeks = Array.from(new Set(processed.flatMap((item) => item.splitWeeks))).sort((a, b) => Number.parseInt(a.slice(1), 10) - Number.parseInt(b.slice(1), 10));

  return {
    success: true,
    message: `Import complete. Created: ${createdCount}, Updated: ${updatedCount}.`,
    summary: {
      created: createdCount,
      updated: updatedCount,
      skipped: skippedCount,
      errors,
      processed,
      notFound,
      splitWeeks: allSplitWeeks,
      datesFound: dateCols.length,
      rowsInFile: rawRows.length - 1,
    },
  };
};

// =============================================================================
// UPLOAD MONTHLY PLAN FROM EXCEL (HTTP Route Wrapper)
// =============================================================================
export const uploadMonthlyPlan = async (req, res) => {
  const tempInput = path.join(TEMP_PATH, `monthly_${Date.now()}_${Math.random().toString(36).slice(2)}.xlsx`);

  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

    const parsedYear = req.body.year ? Number.parseInt(req.body.year, 10) : new Date().getFullYear();
    if (!Number.isInteger(parsedYear)) return res.status(400).json({ success: false, message: "Invalid year value" });

    let manpower = {};
    if (req.body.manpower) {
      try { manpower = typeof req.body.manpower === "string" ? JSON.parse(req.body.manpower) : req.body.manpower; } 
      catch { return res.status(400).json({ success: false, message: "Invalid manpower JSON format" }); }
    }

    fs.writeFileSync(tempInput, req.file.buffer);
    const ftpFileName = `monthly_plan_${parsedYear}_${Date.now()}.xlsx`;
    await uploadToFtp(tempInput, ftpFileName);

    const result = await processMonthlyExcelBuffer(req.file.buffer, parsedYear, manpower, req.user?._id);
    return res.status(201).json(result);

  } catch (err) {
    console.error("uploadMonthlyPlan Error:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to upload monthly plan" });
  } finally {
    cleanupTemp(tempInput);
  }
};