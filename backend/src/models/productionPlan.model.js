// // // import { localhostConn } from '../lib/db.js';
// // // import mongoose from 'mongoose';

// // // // =============================================================================
// // // // PURE HELPERS  (exported — used by controller too)
// // // // =============================================================================

// // // /** Monday Date of ISO week `weekNum` in `year`. */
// // // export function isoWeekMonday(weekNum, year) {
// // //   const jan1 = new Date(year, 0, 1);
// // //   const dow  = jan1.getDay() || 7;
// // //   const monday = new Date(jan1);
// // //   monday.setDate(jan1.getDate() + (weekNum - 1) * 7 + (dow <= 1 ? 1 - dow : 8 - dow));
// // //   return monday;
// // // }

// // // /** All 7 YYYY-MM-DD strings for ISO week label "W6" in year. */
// // // export function isoWeekDates(weekLabel, year) {
// // //   const weekNum = parseInt(weekLabel.replace('W', ''));
// // //   const monday  = isoWeekMonday(weekNum, year);
// // //   return Array.from({ length: 7 }, (_, i) => {
// // //     const d = new Date(monday);
// // //     d.setDate(monday.getDate() + i);
// // //     return d.toISOString().split('T')[0];
// // //   });
// // // }

// // // /**
// // //  * Build fresh daily entries (actual = null) for a plan.
// // //  *
// // //  * capacity ÷ n days = base per day; last day absorbs modulo remainder.
// // //  * fixedDates  — provide exact ["YYYY-MM-DD"] list (Excel uploads).
// // //  *               Omit to derive from the ISO week Monday.
// // //  */
// // // export function buildFreshEntries(capacity, workingDays, weekLabel, year, fixedDates) {
// // //   const days = fixedDates ?? (() => {
// // //     const weekNum = parseInt(weekLabel.replace('W', ''));
// // //     const monday  = isoWeekMonday(weekNum, year);
// // //     return Array.from({ length: workingDays }, (_, i) => {
// // //       const d = new Date(monday);
// // //       d.setDate(monday.getDate() + i);
// // //       return d.toISOString().split('T')[0];
// // //     });
// // //   })();

// // //   const n         = days.length;
// // //   const base      = Math.floor(capacity / n);
// // //   const remainder = capacity % n;

// // //   return days.map((date, i) => ({
// // //     date,
// // //     planned: i === n - 1 ? base + remainder : base,
// // //     actual:  null,
// // //     notes:   '',
// // //     shift:   'day',
// // //   }));
// // // }

// // // /**
// // //  * Recompute planned values after an actual is recorded.
// // //  *
// // //  * BACKLOG RULE (rolling carry-forward):
// // //  *   • After each completed day, shortfall (planned − actual) is carried
// // //  *     into the NEXT day only: next_day.planned = base + carryover
// // //  *   • Surplus (actual > planned) reduces the next day's target.
// // //  *   • Base is always capacity ÷ workingDays (last day absorbs remainder).
// // //  *   • Only entries with actual === null are mutated.
// // //  *
// // //  * This mirrors how week planning works:
// // //  *   week_plan ÷ workingDays = daily_base, backlog of day N → day N+1.
// // //  */
// // // export function recomputeBacklog(entries, capacity) {
// // //   const sorted      = [...entries].sort((a, b) => a.date.localeCompare(b.date));
// // //   const n           = sorted.length;
// // //   const base        = Math.floor(capacity / n);
// // //   const lastRemainder = capacity % n;

// // //   let carryover = 0;

// // //   for (let i = 0; i < n; i++) {
// // //     const entry    = sorted[i];
// // //     const thisBase = i === n - 1 ? base + lastRemainder : base;

// // //     if (entry.actual !== null) {
// // //       // Completed day → compute carryover for next day
// // //       carryover = thisBase + carryover - entry.actual; // +ve = shortfall, -ve = surplus
// // //     } else {
// // //       // Future day → apply carryover, then reset (carry only propagates ONE day)
// // //       const newPlanned = Math.max(thisBase + carryover, 0);
// // //       const orig = entries.find(e => e.date === entry.date);
// // //       if (orig) orig.planned = newPlanned;
// // //       carryover = 0; // carryover consumed; next future day gets fresh base
// // //     }
// // //   }

// // //   return entries;
// // // }

// // // // =============================================================================
// // // // SCHEMA
// // // // =============================================================================

// // // const childPartSchema = new mongoose.Schema({
// // //   partCode:    { type: String, required: true },
// // //   description: { type: String, required: true },
// // //   qty:         { type: Number, required: true, min: 0 },
// // //   unit:        { type: String, required: true },
// // // }, { _id: false });

// // // const dailyEntrySchema = new mongoose.Schema({
// // //   date:    { type: String, required: true },   // "YYYY-MM-DD"
// // //   planned: { type: Number, required: true, min: 0 },
// // //   actual:  { type: Number, default: null, min: 0 },
// // //   notes:   { type: String, default: '', maxlength: 500 },
// // //   shift:   { type: String, enum: ['day', 'night', 'both'], default: 'day' },
// // // }, { _id: false });

// // // const productionPlanSchema = new mongoose.Schema(
// // //   {
// // //     // ── Scheduling ────────────────────────────────────────────────────────────
// // //     week: {
// // //       type:     String,
// // //       required: true,
// // //       validate: {
// // //         validator: v => /^W([1-9]|[1-4][0-9]|5[0-2])$/.test(v),
// // //         message:   p => `${p.value} is not a valid week (W1–W52)`,
// // //       },
// // //     },
// // //     year:        { type: Number, required: true, default: () => new Date().getFullYear() },
// // //     workingDays: { type: Number, required: true, min: 1, max: 7, default: 6 },

// // //     // True while a split-week awaits the adjacent month's upload
// // //     isPartialWeek: { type: Boolean, default: false },

// // //     // ── Capacity ──────────────────────────────────────────────────────────────
// // //     capacity: { type: Number, required: true, min: 0 },

// // //     // ── Matrix snapshot (captured at plan-creation time) ─────────────────────
// // //     matrixRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Matrix' },

// // //     model: {
// // //       _id: mongoose.Schema.Types.ObjectId,
// // //       modelId: String, modelName: String,
// // //       assemblyLine: {
// // //         _id: mongoose.Schema.Types.ObjectId,
// // //         assemblyLineId: String, assemblyLineName: String, capacity: Number,
// // //         plant: {
// // //           _id: mongoose.Schema.Types.ObjectId,
// // //           plantId: String, plantName: String,
// // //         },
// // //       },
// // //     },

// // //     bom: {
// // //       _id:           mongoose.Schema.Types.ObjectId,
// // //       partNumber:    String,
// // //       partName:      String,
// // //       price:         Number,
// // //       childPartList: [childPartSchema],
// // //     },

// // //     shift: { type: String, enum: ['A', 'B', 'C'] },

// // //     // ── Status & meta ─────────────────────────────────────────────────────────
// // //     status: {
// // //       type:    String,
// // //       enum:    ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
// // //       default: 'PLANNED',
// // //     },
// // //     notes:     { type: String, maxlength: 500 },
// // //     createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
// // //     updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

// // //     // ── Daily entries (source of truth — never regenerated client-side) ───────
// // //     dailyEntries: [dailyEntrySchema],
// // //   },
// // //   { timestamps: true }
// // // );

// // // // ── Indexes ───────────────────────────────────────────────────────────────────
// // // // Unique plan per matrix row × week × year
// // // productionPlanSchema.index({ matrixRef: 1, week: 1, year: 1 }, { unique: true });
// // // productionPlanSchema.index({ week: 1, year: 1 });
// // // productionPlanSchema.index({ 'model.assemblyLine.plant.plantId': 1 });
// // // productionPlanSchema.index({ 'model.assemblyLine.assemblyLineId': 1 });
// // // productionPlanSchema.index({ 'model.modelId': 1 });
// // // productionPlanSchema.index({ 'bom.partNumber': 1 });
// // // productionPlanSchema.index({ status: 1 });
// // // productionPlanSchema.index({ isPartialWeek: 1 });
// // // productionPlanSchema.index({ createdAt: -1 });

// // // // ── Virtuals ──────────────────────────────────────────────────────────────────
// // // productionPlanSchema.virtual('totalValue').get(function () {
// // //   return (this.bom?.price ?? 0) * this.capacity;
// // // });

// // // productionPlanSchema.virtual('month').get(function () {
// // //   const n = parseInt(this.week.substring(1));
// // //   return ['January','February','March','April','May','June',
// // //           'July','August','September','October','November','December'][
// // //     Math.min(Math.floor((n - 1) / 4.33), 11)
// // //   ];
// // // });

// // // productionPlanSchema.set('toJSON',   { virtuals: true });
// // // productionPlanSchema.set('toObject', { virtuals: true });

// // // // ── Pre-save: generate entries when plan is first created ─────────────────────
// // // productionPlanSchema.pre('save', function (next) {
// // //   if (this.isNew && (!this.dailyEntries || this.dailyEntries.length === 0)) {
// // //     this.dailyEntries = buildFreshEntries(
// // //       this.capacity, this.workingDays, this.week, this.year
// // //     );
// // //   }
// // //   next();
// // // });

// // // // ── Statics ───────────────────────────────────────────────────────────────────
// // // productionPlanSchema.statics.getWeeklySummary = async function (week, year) {
// // //   return this.aggregate([
// // //     { $match: { week, year } },
// // //     {
// // //       $group: {
// // //         _id:           '$week',
// // //         totalPlans:    { $sum: 1 },
// // //         totalCapacity: { $sum: '$capacity' },
// // //         totalValue:    { $sum: { $multiply: ['$bom.price', '$capacity'] } },
// // //         plants:        { $addToSet: '$model.assemblyLine.plant.plantName' },
// // //         assemblyLines: { $addToSet: '$model.assemblyLine.assemblyLineName' },
// // //         models:        { $addToSet: '$model.modelName' },
// // //       },
// // //     },
// // //   ]);
// // // };

// // // productionPlanSchema.statics.getAnnualOverview = async function (year) {
// // //   return this.aggregate([
// // //     { $match: { year } },
// // //     {
// // //       $group: {
// // //         _id:           '$week',
// // //         totalPlans:    { $sum: 1 },
// // //         totalCapacity: { $sum: '$capacity' },
// // //         totalValue:    { $sum: { $multiply: ['$bom.price', '$capacity'] } },
// // //         plants:        { $addToSet: '$model.assemblyLine.plant.plantName' },
// // //         statuses:      { $push: '$status' },
// // //       },
// // //     },
// // //     { $sort: { _id: 1 } },
// // //   ]);
// // // };

// // // productionPlanSchema.statics.getPlantSummary = async function (plantId, year) {
// // //   return this.aggregate([
// // //     { $match: { 'model.assemblyLine.plant.plantId': plantId, year } },
// // //     {
// // //       $group: {
// // //         _id:           { week: '$week', assemblyLine: '$model.assemblyLine.assemblyLineName' },
// // //         totalCapacity: { $sum: '$capacity' },
// // //         totalValue:    { $sum: { $multiply: ['$bom.price', '$capacity'] } },
// // //         planCount:     { $sum: 1 },
// // //       },
// // //     },
// // //     { $sort: { '_id.week': 1 } },
// // //   ]);
// // // };

// // // const ProductionPlan = localhostConn.model('ProductionPlan', productionPlanSchema);
// // // export default ProductionPlan;


// // import { localhostConn } from '../lib/db.js';
// // import mongoose from 'mongoose';

// // // =============================================================================
// // // PURE HELPERS  (exported — used by controller too)
// // // =============================================================================

// // /** Monday Date of ISO week `weekNum` in `year`. */
// // export function isoWeekMonday(weekNum, year) {
// //   const jan1 = new Date(year, 0, 1);
// //   const dow = jan1.getDay() || 7;
// //   const monday = new Date(jan1);
// //   monday.setDate(jan1.getDate() + (weekNum - 1) * 7 + (dow <= 1 ? 1 - dow : 8 - dow));
// //   return monday;
// // }

// // /** All 7 YYYY-MM-DD strings for ISO week label "W6" in year. */
// // export function isoWeekDates(weekLabel, year) {
// //   const weekNum = parseInt(weekLabel.replace('W', ''));
// //   const monday = isoWeekMonday(weekNum, year);
// //   return Array.from({ length: 7 }, (_, i) => {
// //     const d = new Date(monday);
// //     d.setDate(monday.getDate() + i);
// //     return d.toISOString().split('T')[0];
// //   });
// // }

// // /**
// //  * Build fresh daily entries (actual = null, backlog = 0) for a plan.
// //  *
// //  * capacity ÷ n days = base per day; last day absorbs modulo remainder.
// //  * fixedDates  — provide exact ["YYYY-MM-DD"] list (Excel uploads).
// //  *               Omit to derive from the ISO week Monday.
// //  */
// // export function buildFreshEntries(capacity, workingDays, weekLabel, year, fixedDates) {
// //   const days = fixedDates ?? (() => {
// //     const weekNum = parseInt(weekLabel.replace('W', ''));
// //     const monday = isoWeekMonday(weekNum, year);
// //     return Array.from({ length: workingDays }, (_, i) => {
// //       const d = new Date(monday);
// //       d.setDate(monday.getDate() + i);
// //       return d.toISOString().split('T')[0];
// //     });
// //   })();

// //   const n = days.length;
// //   const base = Math.floor(capacity / n);
// //   const remainder = capacity % n;

// //   return days.map((date, i) => ({
// //     date,
// //     planned: i === n - 1 ? base + remainder : base,
// //     actual: null,
// //     backlog: 0,   // ← NEW: starts at 0, updated by recomputeBacklog after actuals are entered
// //     notes: '',
// //     shift: 'day',
// //   }));
// // }

// // /**
// //  * Recompute planned values AND backlog after an actual is recorded.
// //  *
// //  * BACKLOG RULE (rolling carry-forward):
// //  *   • After each completed day, shortfall (planned − actual) is carried
// //  *     into the NEXT day only: next_day.planned = base + carryover
// //  *   • Surplus (actual > planned) reduces the next day's target.
// //  *   • Base is always capacity ÷ workingDays (last day absorbs remainder).
// //  *   • Only entries with actual === null have their planned mutated.
// //  *
// //  * BACKLOG FIELD:
// //  *   • For completed days (actual !== null): backlog = planned − actual
// //  *     (+ve = shortfall behind target, -ve = surplus ahead of target)
// //  *   • For pending days (actual === null): backlog = 0 (not yet known)
// //  */
// // export function recomputeBacklog(entries, capacity) {
// //   const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
// //   const n = sorted.length;
// //   const base = Math.floor(capacity / n);
// //   const lastRemainder = capacity % n;

// //   let carryover = 0;

// //   for (let i = 0; i < n; i++) {
// //     const entry = sorted[i];
// //     const thisBase = i === n - 1 ? base + lastRemainder : base;

// //     if (entry.actual !== null) {
// //       // Completed day → compute backlog (shortfall/surplus) and carryover for next day
// //       const dayBacklog = thisBase + carryover - entry.actual; // +ve = shortfall, -ve = surplus
// //       const orig = entries.find(e => e.date === entry.date);
// //       if (orig) orig.backlog = dayBacklog;
// //       carryover = dayBacklog; // pass this day's backlog to the next
// //     } else {
// //       // Future day → apply carryover to planned, reset backlog to 0
// //       const newPlanned = Math.max(thisBase + carryover, 0);
// //       const orig = entries.find(e => e.date === entry.date);
// //       if (orig) {
// //         orig.planned = newPlanned;
// //         orig.backlog = 0; // pending day: backlog not yet realized
// //       }
// //       carryover = 0; // carryover consumed; next future day gets fresh base
// //     }
// //   }

// //   return entries;
// // }

// // // =============================================================================
// // // SCHEMA
// // // =============================================================================

// // const childPartSchema = new mongoose.Schema({
// //   partCode: { type: String, required: true },
// //   description: { type: String, required: true },
// //   qty: { type: Number, required: true, min: 0 },
// //   unit: { type: String, required: true },
// // }, { _id: false });

// // const dailyEntrySchema = new mongoose.Schema({
// //   date: { type: String, required: true },   // "YYYY-MM-DD"
// //   planned: { type: Number, required: true, min: 0 },
// //   actual: { type: Number, default: null, min: 0 },
// //   // ── NEW: backlog per day ────────────────────────────────────────────────────
// //   // For completed days: planned − actual (+ve = shortfall, -ve = surplus)
// //   // For pending days:   always 0 (not yet realized)
// //   backlog: { type: Number, default: 0 },
// //   notes: { type: String, default: '', maxlength: 500 },
// //   shift: { type: String, enum: ['day', 'night', 'both'], default: 'day' },
// // }, { _id: false });

// // const productionPlanSchema = new mongoose.Schema(
// //   {
// //     // ── Scheduling ────────────────────────────────────────────────────────────
// //     week: {
// //       type: String,
// //       required: true,
// //       validate: {
// //         validator: v => /^W([1-9]|[1-4][0-9]|5[0-2])$/.test(v),
// //         message: p => `${p.value} is not a valid week (W1–W52)`,
// //       },
// //     },
// //     year: { type: Number, required: true, default: () => new Date().getFullYear() },
// //     workingDays: { type: Number, required: true, min: 1, max: 7, default: 6 },

// //     // True while a split-week awaits the adjacent month's upload
// //     isPartialWeek: { type: Boolean, default: false },

// //     // ── Capacity ──────────────────────────────────────────────────────────────
// //     capacity: { type: Number, required: true, min: 0 },

// //     // ── Matrix snapshot (captured at plan-creation time) ─────────────────────
// //     matrixRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Matrix' },

// //     model: {
// //       _id: mongoose.Schema.Types.ObjectId,
// //       modelId: String, modelName: String,
// //       assemblyLine: {
// //         _id: mongoose.Schema.Types.ObjectId,
// //         assemblyLineId: String, assemblyLineName: String, capacity: Number,
// //         plant: {
// //           _id: mongoose.Schema.Types.ObjectId,
// //           plantId: String, plantName: String,
// //         },
// //       },
// //     },

// //     bom: {
// //       _id: mongoose.Schema.Types.ObjectId,
// //       partNumber: String,
// //       partName: String,
// //       price: Number,
// //       childPartList: [childPartSchema],
// //     },

// //     shift: { type: String, enum: ['A', 'B', 'C'] },

// //     // ── Status & meta ─────────────────────────────────────────────────────────
// //     status: {
// //       type: String,
// //       enum: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
// //       default: 'PLANNED',
// //     },
// //     notes: { type: String, maxlength: 500 },
// //     createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
// //     updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

// //     // ── Daily entries (source of truth — never regenerated client-side) ───────
// //     dailyEntries: [dailyEntrySchema],
// //   },
// //   { timestamps: true }
// // );

// // // ── Indexes ───────────────────────────────────────────────────────────────────
// // productionPlanSchema.index({ matrixRef: 1, week: 1, year: 1 }, { unique: true });
// // productionPlanSchema.index({ week: 1, year: 1 });
// // productionPlanSchema.index({ 'model.assemblyLine.plant.plantId': 1 });
// // productionPlanSchema.index({ 'model.assemblyLine.assemblyLineId': 1 });
// // productionPlanSchema.index({ 'model.modelId': 1 });
// // productionPlanSchema.index({ 'bom.partNumber': 1 });
// // productionPlanSchema.index({ status: 1 });
// // productionPlanSchema.index({ isPartialWeek: 1 });
// // productionPlanSchema.index({ createdAt: -1 });

// // // ── Virtuals ──────────────────────────────────────────────────────────────────
// // productionPlanSchema.virtual('totalValue').get(function () {
// //   return (this.bom?.price ?? 0) * this.capacity;
// // });

// // productionPlanSchema.virtual('month').get(function () {
// //   const n = parseInt(this.week.substring(1));
// //   return ['January', 'February', 'March', 'April', 'May', 'June',
// //     'July', 'August', 'September', 'October', 'November', 'December'][
// //     Math.min(Math.floor((n - 1) / 4.33), 11)
// //   ];
// // });

// // productionPlanSchema.set('toJSON', { virtuals: true });
// // productionPlanSchema.set('toObject', { virtuals: true });

// // // ── Pre-save: generate entries when plan is first created ─────────────────────
// // productionPlanSchema.pre('save', function (next) {
// //   if (this.isNew && (!this.dailyEntries || this.dailyEntries.length === 0)) {
// //     this.dailyEntries = buildFreshEntries(
// //       this.capacity, this.workingDays, this.week, this.year
// //     );
// //   }
// //   next();
// // });

// // // ── Statics ───────────────────────────────────────────────────────────────────
// // productionPlanSchema.statics.getWeeklySummary = async function (week, year) {
// //   return this.aggregate([
// //     { $match: { week, year } },
// //     {
// //       $group: {
// //         _id: '$week',
// //         totalPlans: { $sum: 1 },
// //         totalCapacity: { $sum: '$capacity' },
// //         totalValue: { $sum: { $multiply: ['$bom.price', '$capacity'] } },
// //         plants: { $addToSet: '$model.assemblyLine.plant.plantName' },
// //         assemblyLines: { $addToSet: '$model.assemblyLine.assemblyLineName' },
// //         models: { $addToSet: '$model.modelName' },
// //       },
// //     },
// //   ]);
// // };

// // productionPlanSchema.statics.getAnnualOverview = async function (year) {
// //   return this.aggregate([
// //     { $match: { year } },
// //     {
// //       $group: {
// //         _id: '$week',
// //         totalPlans: { $sum: 1 },
// //         totalCapacity: { $sum: '$capacity' },
// //         totalValue: { $sum: { $multiply: ['$bom.price', '$capacity'] } },
// //         plants: { $addToSet: '$model.assemblyLine.plant.plantName' },
// //         statuses: { $push: '$status' },
// //       },
// //     },
// //     { $sort: { _id: 1 } },
// //   ]);
// // };

// // productionPlanSchema.statics.getPlantSummary = async function (plantId, year) {
// //   return this.aggregate([
// //     { $match: { 'model.assemblyLine.plant.plantId': plantId, year } },
// //     {
// //       $group: {
// //         _id: { week: '$week', assemblyLine: '$model.assemblyLine.assemblyLineName' },
// //         totalCapacity: { $sum: '$capacity' },
// //         totalValue: { $sum: { $multiply: ['$bom.price', '$capacity'] } },
// //         planCount: { $sum: 1 },
// //       },
// //     },
// //     { $sort: { '_id.week': 1 } },
// //   ]);
// // };

// // const ProductionPlan = localhostConn.model('ProductionPlan', productionPlanSchema);
// // export default ProductionPlan;
// import { localhostConn } from '../lib/db.js';
// import mongoose from 'mongoose';

// // =============================================================================
// // PURE HELPERS  (exported — used by controller too)
// // =============================================================================

// export function isoWeekMonday(weekNum, year) {
//   const jan1 = new Date(Date.UTC(year, 0, 1));
//   const dow = jan1.getUTCDay() || 7;
//   const monday = new Date(jan1);
//   monday.setUTCDate(jan1.getUTCDate() + (weekNum - 1) * 7 + (dow <= 1 ? 1 - dow : 8 - dow));
//   return monday;
// }

// export function isoWeekDates(weekLabel, year) {
//   const weekNum = parseInt(weekLabel.replace('W', ''));
//   const monday = isoWeekMonday(weekNum, year);
//   return Array.from({ length: 7 }, (_, i) => {
//     const d = new Date(monday);
//     d.setUTCDate(monday.getUTCDate() + i);
//     return d.toISOString().split('T')[0];
//   });
// }

// export function buildFreshEntries(capacity, workingDays, weekLabel, year, fixedDates) {
//   const days = fixedDates ?? (() => {
//     const weekNum = parseInt(weekLabel.replace('W', ''));
//     const monday = isoWeekMonday(weekNum, year);
//     return Array.from({ length: workingDays }, (_, i) => {
//       const d = new Date(monday);
//       d.setUTCDate(monday.getUTCDate() + i);
//       return d.toISOString().split('T')[0];
//     });
//   })();

//   const n = days.length;
//   const base = Math.floor(capacity / n);
//   const remainder = capacity % n;

//   return days.map((date, i) => ({
//     date,
//     planned: i === n - 1 ? base + remainder : base,
//     actual: null,
//     backlog: 0,
//     notes: '',
//     shift: 'day',
//   }));
// }

// export function recomputeBacklog(entries, capacity) {
//   const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
//   const n = sorted.length;
//   const base = Math.floor(capacity / n);
//   const lastRemainder = capacity % n;

//   let carryover = 0;

//   for (let i = 0; i < n; i++) {
//     const entry = sorted[i];
//     const thisBase = i === n - 1 ? base + lastRemainder : base;

//     if (entry.actual !== null) {
//       const dayBacklog = thisBase + carryover - entry.actual; 
//       const orig = entries.find(e => e.date === entry.date);
//       if (orig) orig.backlog = dayBacklog;
//       carryover = dayBacklog; 
//     } else {
//       const newPlanned = Math.max(thisBase + carryover, 0);
//       const orig = entries.find(e => e.date === entry.date);
//       if (orig) {
//         orig.planned = newPlanned;
//         orig.backlog = 0; 
//       }
//       carryover = 0; 
//     }
//   }

//   return entries;
// }

// // =============================================================================
// // SCHEMA
// // =============================================================================

// const childPartSchema = new mongoose.Schema({
//   partCode: { type: String, required: true },
//   description: { type: String, required: true },
//   qty: { type: Number, required: true, min: 0 },
//   unit: { type: String, required: true },
// }, { _id: false });

// const dailyEntrySchema = new mongoose.Schema({
//   date: { type: String, required: true },
//   planned: { type: Number, required: true, min: 0 },
//   actual: { type: Number, default: null, min: 0 },
//   backlog: { type: Number, default: 0 },
//   notes: { type: String, default: '', maxlength: 500 },
//   shift: { type: String, enum: ['day', 'night', 'both'], default: 'day' },
// }, { _id: false });

// const productionPlanSchema = new mongoose.Schema(
//   {
//     week: {
//       type: String,
//       required: true,
//       validate: {
//         validator: v => /^W([1-9]|[1-4][0-9]|5[0-2])$/.test(v),
//         message: p => `${p.value} is not a valid week (W1–W52)`,
//       },
//     },
//     year: { type: Number, required: true, default: () => new Date().getFullYear() },
//     workingDays: { type: Number, required: true, min: 1, max: 7, default: 6 },
//     isPartialWeek: { type: Boolean, default: false },
//     capacity: { type: Number, required: true, min: 0 },
//     matrixRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Matrix' },

//     model: {
//       _id: mongoose.Schema.Types.ObjectId,
//       modelId: String, modelName: String,
//       assemblyLine: {
//         _id: mongoose.Schema.Types.ObjectId,
//         assemblyLineId: String, assemblyLineName: String, capacity: Number,
//         plant: {
//           _id: mongoose.Schema.Types.ObjectId,
//           plantId: String, plantName: String,
//         },
//       },
//     },

//     bom: {
//       _id: mongoose.Schema.Types.ObjectId,
//       partNumber: String,
//       partName: String,
//       price: Number,
//       childPartList: [childPartSchema],
//     },

//     shift: { type: String, enum: ['A', 'B', 'C'] },
//     status: {
//       type: String,
//       enum: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
//       default: 'PLANNED',
//     },
//     notes: { type: String, maxlength: 500 },
//     createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
//     updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
//     dailyEntries: [dailyEntrySchema],
//   },
//   { timestamps: true }
// );

// productionPlanSchema.index({ matrixRef: 1, week: 1, year: 1 }, { unique: true });
// productionPlanSchema.index({ week: 1, year: 1 });
// productionPlanSchema.index({ 'model.assemblyLine.plant.plantId': 1 });
// productionPlanSchema.index({ 'model.assemblyLine.assemblyLineId': 1 });
// productionPlanSchema.index({ 'model.modelId': 1 });
// productionPlanSchema.index({ 'bom.partNumber': 1 });
// productionPlanSchema.index({ status: 1 });
// productionPlanSchema.index({ isPartialWeek: 1 });
// productionPlanSchema.index({ createdAt: -1 });

// productionPlanSchema.virtual('totalValue').get(function () {
//   return (this.bom?.price ?? 0) * this.capacity;
// });

// productionPlanSchema.virtual('month').get(function () {
//   const n = parseInt(this.week.substring(1));
//   return ['January', 'February', 'March', 'April', 'May', 'June',
//     'July', 'August', 'September', 'October', 'November', 'December'][
//     Math.min(Math.floor((n - 1) / 4.33), 11)
//   ];
// });

// productionPlanSchema.set('toJSON', { virtuals: true });
// productionPlanSchema.set('toObject', { virtuals: true });

// productionPlanSchema.pre('save', function (next) {
//   if (this.isNew && (!this.dailyEntries || this.dailyEntries.length === 0)) {
//     this.dailyEntries = buildFreshEntries(
//       this.capacity, this.workingDays, this.week, this.year
//     );
//   }
//   next();
// });

// productionPlanSchema.statics.getWeeklySummary = async function (week, year) {
//   return this.aggregate([
//     { $match: { week, year } },
//     {
//       $group: {
//         _id: '$week',
//         totalPlans: { $sum: 1 },
//         totalCapacity: { $sum: '$capacity' },
//         totalValue: { $sum: { $multiply: ['$bom.price', '$capacity'] } },
//         plants: { $addToSet: '$model.assemblyLine.plant.plantName' },
//         assemblyLines: { $addToSet: '$model.assemblyLine.assemblyLineName' },
//         models: { $addToSet: '$model.modelName' },
//       },
//     },
//   ]);
// };

// productionPlanSchema.statics.getAnnualOverview = async function (year) {
//   return this.aggregate([
//     { $match: { year } },
//     {
//       $group: {
//         _id: '$week',
//         totalPlans: { $sum: 1 },
//         totalCapacity: { $sum: '$capacity' },
//         totalValue: { $sum: { $multiply: ['$bom.price', '$capacity'] } },
//         plants: { $addToSet: '$model.assemblyLine.plant.plantName' },
//         statuses: { $push: '$status' },
//       },
//     },
//     { $sort: { _id: 1 } },
//   ]);
// };

// productionPlanSchema.statics.getPlantSummary = async function (plantId, year) {
//   return this.aggregate([
//     { $match: { 'model.assemblyLine.plant.plantId': plantId, year } },
//     {
//       $group: {
//         _id: { week: '$week', assemblyLine: '$model.assemblyLine.assemblyLineName' },
//         totalCapacity: { $sum: '$capacity' },
//         totalValue: { $sum: { $multiply: ['$bom.price', '$capacity'] } },
//         planCount: { $sum: 1 },
//       },
//     },
//     { $sort: { '_id.week': 1 } },
//   ]);
// };

// const ProductionPlan = localhostConn.model('ProductionPlan', productionPlanSchema);
// export default ProductionPlan;
import { localhostConn } from '../lib/db.js';
import mongoose from 'mongoose';

// =============================================================================
// PURE HELPERS  (exported — used by controller too)
// =============================================================================

export function isoWeekMonday(weekNum, year) {
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const dow = jan1.getUTCDay() || 7;
  const monday = new Date(jan1);
  monday.setUTCDate(jan1.getUTCDate() + (weekNum - 1) * 7 + (dow <= 1 ? 1 - dow : 8 - dow));
  return monday;
}

export function isoWeekDates(weekLabel, year) {
  const weekNum = parseInt(weekLabel.replace('W', ''));
  const monday = isoWeekMonday(weekNum, year);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return d.toISOString().split('T')[0];
  });
}

export function buildFreshEntries(capacity, workingDays, weekLabel, year, fixedDates) {
  const days = fixedDates ?? (() => {
    const weekNum = parseInt(weekLabel.replace('W', ''));
    const monday = isoWeekMonday(weekNum, year);
    return Array.from({ length: workingDays }, (_, i) => {
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() + i);
      return d.toISOString().split('T')[0];
    });
  })();

  const n = days.length;
  const base = Math.floor(capacity / n);
  const remainder = capacity % n;

  return days.map((date, i) => ({
    date,
    planned: i === n - 1 ? base + remainder : base,
    actual: null,
    backlog: 0,
    notes: '',
    shift: 'day',
  }));
}

export function recomputeBacklog(entries, capacity) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const n = sorted.length;
  const base = Math.floor(capacity / n);
  const lastRemainder = capacity % n;

  let carryover = 0;

  for (let i = 0; i < n; i++) {
    const entry = sorted[i];
    const thisBase = i === n - 1 ? base + lastRemainder : base;

    if (entry.actual !== null) {
      const dayBacklog = thisBase + carryover - entry.actual; 
      const orig = entries.find(e => e.date === entry.date);
      if (orig) orig.backlog = dayBacklog;
      carryover = dayBacklog; 
    } else {
      const newPlanned = Math.max(thisBase + carryover, 0);
      const orig = entries.find(e => e.date === entry.date);
      if (orig) {
        orig.planned = newPlanned;
        orig.backlog = 0; 
      }
      carryover = 0; 
    }
  }

  return entries;
}

// =============================================================================
// SCHEMA
// =============================================================================

const childPartSchema = new mongoose.Schema({
  partCode: { type: String, required: true },
  description: { type: String, required: true },
  qty: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true },
}, { _id: false });

const dailyEntrySchema = new mongoose.Schema({
  date: { type: String, required: true },
  planned: { type: Number, required: true, min: 0 },
  actual: { type: Number, default: null, min: 0 },
  backlog: { type: Number, default: 0 },
  notes: { type: String, default: '', maxlength: 500 },
  shift: { type: String, enum: ['day', 'night', 'both'], default: 'day' },
}, { _id: false });

const productionPlanSchema = new mongoose.Schema(
  {
    week: {
      type: String,
      required: true,
      validate: {
        validator: v => /^W([1-9]|[1-4][0-9]|5[0-2])$/.test(v),
        message: p => `${p.value} is not a valid week (W1–W52)`,
      },
    },
    year: { type: Number, required: true, default: () => new Date().getFullYear() },
    workingDays: { type: Number, required: true, min: 1, max: 7, default: 6 },
    isPartialWeek: { type: Boolean, default: false },
    capacity: { type: Number, required: true, min: 0 },
    matrixRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Matrix' },

    model: {
      _id: mongoose.Schema.Types.ObjectId,
      modelId: String, modelName: String,
      assemblyLine: {
        _id: mongoose.Schema.Types.ObjectId,
        assemblyLineId: String, assemblyLineName: String, capacity: Number,
        plant: {
          _id: mongoose.Schema.Types.ObjectId,
          plantId: String, plantName: String,
        },
      },
    },

    bom: {
      _id: mongoose.Schema.Types.ObjectId,
      partNumber: String,
      partName: String,
      price: Number,
      childPartList: [childPartSchema],
    },

    shift: { type: [String], enum: ['A', 'B', 'C'] },
    status: {
      type: String,
      enum: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
      default: 'PLANNED',
    },
    notes: { type: String, maxlength: 500 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    dailyEntries: [dailyEntrySchema],
  },
  { timestamps: true }
);

productionPlanSchema.index({ matrixRef: 1, week: 1, year: 1 }, { unique: true });
productionPlanSchema.index({ week: 1, year: 1 });
productionPlanSchema.index({ 'model.assemblyLine.plant.plantId': 1 });
productionPlanSchema.index({ 'model.assemblyLine.assemblyLineId': 1 });
productionPlanSchema.index({ 'model.modelId': 1 });
productionPlanSchema.index({ 'bom.partNumber': 1 });
productionPlanSchema.index({ status: 1 });
productionPlanSchema.index({ isPartialWeek: 1 });
productionPlanSchema.index({ createdAt: -1 });

productionPlanSchema.virtual('totalValue').get(function () {
  return (this.bom?.price ?? 0) * this.capacity;
});

productionPlanSchema.virtual('month').get(function () {
  const n = parseInt(this.week.substring(1));
  return ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'][
    Math.min(Math.floor((n - 1) / 4.33), 11)
  ];
});

productionPlanSchema.set('toJSON', { virtuals: true });
productionPlanSchema.set('toObject', { virtuals: true });

productionPlanSchema.pre('save', function (next) {
  if (this.isNew && (!this.dailyEntries || this.dailyEntries.length === 0)) {
    this.dailyEntries = buildFreshEntries(
      this.capacity, this.workingDays, this.week, this.year
    );
  }
  next();
});

productionPlanSchema.statics.getWeeklySummary = async function (week, year) {
  return this.aggregate([
    { $match: { week, year } },
    {
      $group: {
        _id: '$week',
        totalPlans: { $sum: 1 },
        totalCapacity: { $sum: '$capacity' },
        totalValue: { $sum: { $multiply: ['$bom.price', '$capacity'] } },
        plants: { $addToSet: '$model.assemblyLine.plant.plantName' },
        assemblyLines: { $addToSet: '$model.assemblyLine.assemblyLineName' },
        models: { $addToSet: '$model.modelName' },
      },
    },
  ]);
};

productionPlanSchema.statics.getAnnualOverview = async function (year) {
  return this.aggregate([
    { $match: { year } },
    {
      $group: {
        _id: '$week',
        totalPlans: { $sum: 1 },
        totalCapacity: { $sum: '$capacity' },
        totalValue: { $sum: { $multiply: ['$bom.price', '$capacity'] } },
        plants: { $addToSet: '$model.assemblyLine.plant.plantName' },
        statuses: { $push: '$status' },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

productionPlanSchema.statics.getPlantSummary = async function (plantId, year) {
  return this.aggregate([
    { $match: { 'model.assemblyLine.plant.plantId': plantId, year } },
    {
      $group: {
        _id: { week: '$week', assemblyLine: '$model.assemblyLine.assemblyLineName' },
        totalCapacity: { $sum: '$capacity' },
        totalValue: { $sum: { $multiply: ['$bom.price', '$capacity'] } },
        planCount: { $sum: 1 },
      },
    },
    { $sort: { '_id.week': 1 } },
  ]);
};

const ProductionPlan = localhostConn.model('ProductionPlan', productionPlanSchema);
export default ProductionPlan;