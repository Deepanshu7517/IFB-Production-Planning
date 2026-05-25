// import ProductionPlan from '../models/productionPlan.model.js';
// import { DailyEntry } from './dailyEntry.controller.js';

// // =============================================================================
// // HELPERS
// // =============================================================================

// /**
//  * ISO week number from a Date object.
//  * Uses the proper ISO 8601 algorithm (week starts Monday, first week has Thursday).
//  */
// const getISOWeekNumber = (date) => {
//   const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
//   const dayNum = d.getUTCDay() || 7; // Mon=1 … Sun=7
//   d.setUTCDate(d.getUTCDate() + 4 - dayNum); // nearest Thursday
//   const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
//   return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
// };

// /**
//  * Monday of ISO week `weekNum` in `year`.
//  */
// const getMondayOfISOWeek = (weekNum, year) => {
//   const jan1  = new Date(Date.UTC(year, 0, 1));
//   const dow   = jan1.getUTCDay() || 7; // ISO: Mon=1
//   const monday = new Date(jan1);
//   monday.setUTCDate(jan1.getUTCDate() + (weekNum - 1) * 7 + (dow <= 1 ? 1 - dow : 8 - dow));
//   return monday;
// };

// /**
//  * Returns { monday, sunday } UTC dates for a given ISO week label "W10" and year.
//  */
// const getWeekBounds = (weekLabel, year) => {
//   const weekNum = parseInt(weekLabel.replace('W', ''));
//   const monday  = getMondayOfISOWeek(weekNum, year);
//   const sunday  = new Date(monday);
//   sunday.setUTCDate(monday.getUTCDate() + 6);
//   return { monday, sunday };
// };

// // =============================================================================
// // @desc    Get full dashboard data — aggregated or filtered
// // @route   GET /api/production-plans/dashboard
// // @query   year, week?, plantId?, modelId?, assemblyLineId?
// //
// // KEY FIXES vs old version:
// //  ✅ Uses real DailyEntry actuals (no more Math.random() mock)
// //  ✅ Correct schema field paths (model.assemblyLine.plant.plantId etc.)
// //  ✅ Defaults to current ISO week when no week/date range given
// //  ✅ No duplicate dates when merging multi-workingDays groups
// //  ✅ hasActual flag added to every chartData item
// //  ✅ Per-plan breakdown included for left-panel aggregation cards
// //  ✅ Backlog carry-forward only touches PENDING (future) days
// // =============================================================================
// export const getDashboardData = async (req, res) => {
//   try {
//     const { year, week, plantId, modelId, assemblyLineId } = req.query;

//     const targetYear = year ? parseInt(year) : new Date().getFullYear();

//     // ── Determine which week(s) to show ─────────────────────────────────────
//     // If a specific week is given → show that week.
//     // Otherwise → show the current ISO week.
//     const today      = new Date();
//     const currentWeekNum = getISOWeekNumber(today);
//     const targetWeek = week ?? `W${currentWeekNum}`;

//     // ── Build Mongo query ────────────────────────────────────────────────────
//     // Schema paths from productionPlan.model.js (NEW schema — nested under model.assemblyLine)
//     const query = { year: targetYear, week: targetWeek };
//     if (plantId)        query['model.assemblyLine.plant.plantId']  = plantId;
//     if (assemblyLineId) query['model.assemblyLine.assemblyLineId'] = assemblyLineId;
//     if (modelId)        query['model.modelId']                     = modelId;

//     const plans = await ProductionPlan.find(query).lean();

//     // ── Empty state ──────────────────────────────────────────────────────────
//     if (plans.length === 0) {
//       return res.status(200).json({
//         success: true,
//         data: {
//           week:        targetWeek,
//           year:        targetYear,
//           summary:     { totalPlanned: 0, totalActual: 0, adherence: 0, deficit: 0, totalCapacity: 0 },
//           chartData:   [],
//           planBreakdown: [],
//         },
//       });
//     }

//     // ── Fetch all DailyEntry actuals for these plans in one query ────────────
//     const planIds   = plans.map(p => p._id);
//     const { monday, sunday } = getWeekBounds(targetWeek, targetYear);
//     const mondayStr = monday.toISOString().split('T')[0];
//     const sundayStr = sunday.toISOString().split('T')[0];

//     const dailyEntries = await DailyEntry.find({
//       planId: { $in: planIds },
//       date:   { $gte: mondayStr, $lte: sundayStr },
//     }).lean();

//     // ── Build fast lookup: "planId_date" → full DailyEntry doc ─────────────────
//     // Stores the complete entry so we can pull shift, notes, enteredBy per day.
//     const entryMap = new Map();
//     for (const e of dailyEntries) {
//       entryMap.set(`${e.planId}_${e.date}`, e);
//     }

//     // ── Build day-keyed aggregation map ──────────────────────────────────────
//     // Each key = YYYY-MM-DD.
//     // For aggregated view we sum planned/actual across all plans for that date,
//     // and collect shift + notes from every DailyEntry that has data.
//     const dayMap = new Map();

//     for (const plan of plans) {
//       if (!plan.dailyEntries || plan.dailyEntries.length === 0) continue;

//       for (const entry of plan.dailyEntries) {
//         if (entry.date < mondayStr || entry.date > sundayStr) continue;

//         const saved     = entryMap.get(`${plan._id}_${entry.date}`);
//         const actualVal = saved?.actual ?? null;

//         if (!dayMap.has(entry.date)) {
//           dayMap.set(entry.date, {
//             date:        entry.date,
//             basePlanned: 0,
//             actual:      null,
//             hasActual:   false,
//             // Collect shift values and notes across all plans for this date
//             shifts:      [],   // e.g. ['day', 'night'] when multiple plans run
//             notes:       [],   // non-empty notes per plan-day
//           });
//         }

//         const d = dayMap.get(entry.date);
//         d.basePlanned += entry.planned;

//         if (actualVal !== null) {
//           d.actual    = (d.actual ?? 0) + actualVal;
//           d.hasActual = true;
//         }

//         // Collect shift from DailyEntry (authoritative) or fall back to plan-level shift
//         const shift = saved?.shift ?? plan.shift ?? null;
//         if (shift && !d.shifts.includes(shift)) d.shifts.push(shift);

//         // Collect non-empty notes from DailyEntry
//         const note = saved?.notes?.trim();
//         if (note) d.notes.push(note);
//       }
//     }

//     // ── Sort days, compute rolling backlog ────────────────────────────────────
//     const sortedDays = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));

//     let cumulativeBacklog = 0;
//     const chartData = sortedDays.map(day => {
//       const adjustedPlanned = day.hasActual
//         ? day.basePlanned
//         : Math.max(day.basePlanned + cumulativeBacklog, 0);

//       let dayBacklog = 0;
//       if (day.hasActual) {
//         dayBacklog        = adjustedPlanned - (day.actual ?? 0);
//         cumulativeBacklog += dayBacklog;
//       }

//       let performanceStatus = 'pending';
//       if (day.hasActual) {
//         const actual = day.actual ?? 0;
//         if      (actual >= adjustedPlanned)        performanceStatus = 'ahead';
//         else if (actual >= adjustedPlanned * 0.9)  performanceStatus = 'on-track';
//         else                                       performanceStatus = 'behind';
//       }

//       return {
//         date:              day.date,
//         dayName:           new Date(day.date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short' }),
//         basePlanned:       day.basePlanned,
//         adjustedPlanned,
//         actual:            day.actual ?? 0,
//         hasActual:         day.hasActual,
//         backlog:           dayBacklog,
//         cumulativeBacklog: day.hasActual ? cumulativeBacklog : 0,
//         performanceStatus,
//         // ── NEW: per-day shift & notes from DailyEntry ───────────────────────
//         // shift: collapsed to a single string when all plans agree, or
//         //        'mixed' when different shifts are running on the same date.
//         shift:  day.shifts.length === 0 ? null
//               : day.shifts.length === 1 ? day.shifts[0]
//               : 'mixed',
//         shifts: day.shifts,                // raw list for tooltip detail
//         notes:  day.notes.join(' | '),     // combined notes string (empty = '')
//         notesList: day.notes,              // raw array if frontend needs it
//       };
//     });

//     // ── Summary stats ─────────────────────────────────────────────────────────
//     const enteredDays   = chartData.filter(d => d.hasActual);
//     const totalActual   = enteredDays.reduce((s, d) => s + d.actual,       0);
//     const totalPlanned  = enteredDays.reduce((s, d) => s + d.basePlanned,  0);
//     const totalCapacity = plans.reduce((s, p) => s + (p.capacity ?? 0),    0);
//     const adherence     = totalPlanned > 0
//       ? parseFloat(((totalActual / totalPlanned) * 100).toFixed(1))
//       : 0;

//     // ── NEW: status breakdown ─────────────────────────────────────────────────
//     // Count how many plans are in each status for this week/filter.
//     const statusBreakdown = plans.reduce((acc, p) => {
//       const s = p.status ?? 'PLANNED';
//       acc[s] = (acc[s] ?? 0) + 1;
//       return acc;
//     }, {});
//     // Guarantee all four keys are always present (makes frontend destructuring safe)
//     const statusCounts = {
//       PLANNED:     statusBreakdown.PLANNED     ?? 0,
//       IN_PROGRESS: statusBreakdown.IN_PROGRESS ?? 0,
//       COMPLETED:   statusBreakdown.COMPLETED   ?? 0,
//       CANCELLED:   statusBreakdown.CANCELLED   ?? 0,
//     };

//     // ── Per-plan breakdown ────────────────────────────────────────────────────
//     const planBreakdown = plans.map(p => {
//       const planEntries = (p.dailyEntries ?? []).map(e => {
//         const saved = entryMap.get(`${p._id}_${e.date}`);
//         return {
//           ...e,
//           actual: saved?.actual ?? null,
//           shift:  saved?.shift  ?? p.shift ?? null,
//           notes:  saved?.notes  ?? '',
//         };
//       });
//       const entered     = planEntries.filter(e => e.actual !== null);
//       const planActual  = entered.reduce((s, e) => s + (e.actual ?? 0), 0);
//       const planPlanned = entered.reduce((s, e) => s + e.planned,        0);

//       // Day-level performance counts for this plan
//       const aheadDays   = entered.filter(e => e.actual >= e.planned).length;
//       const behindDays  = entered.filter(e => e.actual <  e.planned * 0.9).length;
//       const onTrackDays = entered.length - aheadDays - behindDays;

//       return {
//         planId:        p._id,
//         week:          p.week,
//         year:          p.year,
//         status:        p.status,
//         isPartialWeek: p.isPartialWeek ?? false,
//         notes:         p.notes ?? '',
//         plant:         p.model?.assemblyLine?.plant?.plantName   ?? '—',
//         plantId:       p.model?.assemblyLine?.plant?.plantId     ?? '—',
//         assemblyLine:  p.model?.assemblyLine?.assemblyLineName   ?? '—',
//         assemblyLineId:p.model?.assemblyLine?.assemblyLineId     ?? '—',
//         model:         p.model?.modelName                        ?? '—',
//         modelId:       p.model?.modelId                          ?? '—',
//         partNumber:    p.bom?.partNumber                         ?? '—',
//         partName:      p.bom?.partName                           ?? '—',
//         capacity:      p.capacity,
//         workingDays:   p.workingDays,
//         totalActual:   planActual,
//         totalPlanned:  planPlanned,
//         adherence:     planPlanned > 0 ? Math.round((planActual / planPlanned) * 100) : 0,
//         deficit:       Math.max(0, planPlanned - planActual),
//         daysEntered:   entered.length,
//         daysRemaining: planEntries.filter(e => e.actual === null).length,
//         // Day-level counts
//         aheadDays,
//         onTrackDays,
//         behindDays,
//         // Full daily entries with actuals + shift + notes merged in
//         dailyEntries:  planEntries,
//       };
//     });

//     return res.status(200).json({
//       success: true,
//       data: {
//         week:    targetWeek,
//         year:    targetYear,
//         summary: {
//           totalPlanned,
//           totalActual,
//           adherence,
//           deficit:       Math.max(0, totalPlanned - totalActual),
//           totalCapacity,
//           plansCount:    plans.length,
//           daysEntered:   enteredDays.length,
//           daysRemaining: chartData.filter(d => !d.hasActual).length,
//           // ── NEW: status breakdown ─────────────────────────────────────────
//           statusCounts,
//           // Quick-read day counts across all plans
//           aheadDays:   chartData.filter(d => d.performanceStatus === 'ahead').length,
//           onTrackDays: chartData.filter(d => d.performanceStatus === 'on-track').length,
//           behindDays:  chartData.filter(d => d.performanceStatus === 'behind').length,
//           pendingDays: chartData.filter(d => d.performanceStatus === 'pending').length,
//         },
//         chartData,      // each item now includes shift, shifts[], notes, notesList[]
//         planBreakdown,  // each plan now includes dailyEntries[], aheadDays, behindDays, etc.
//       },
//     });
//   } catch (error) {
//     console.error('getDashboardData error:', error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// // =============================================================================
// // @desc    Get filter options — queried from actual plan data, not master collections
// // @route   GET /api/production-plans/dashboard/filters
// //
// // FIX: Old version queried Plant/AssemblyLine/Model master collections.
// //      Those may not match what's actually in plans. Now uses $group on ProductionPlan.
// // =============================================================================
// export const getDashboardFilters = async (req, res) => {
//   try {
//     const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();

//     const [plants, assemblyLines, models, weeks] = await Promise.all([
//       // Distinct plants that actually have plans
//       ProductionPlan.aggregate([
//         { $match: { year } },
//         { $group: {
//             _id:       '$model.assemblyLine.plant.plantId',
//             plantName: { $first: '$model.assemblyLine.plant.plantName' },
//         }},
//         { $project: { _id: 0, plantId: '$_id', plantName: 1 } },
//         { $sort: { plantName: 1 } },
//       ]),

//       // Distinct assembly lines
//       ProductionPlan.aggregate([
//         { $match: { year } },
//         { $group: {
//             _id:              '$model.assemblyLine.assemblyLineId',
//             assemblyLineName: { $first: '$model.assemblyLine.assemblyLineName' },
//         }},
//         { $project: { _id: 0, assemblyLineId: '$_id', assemblyLineName: 1 } },
//         { $sort: { assemblyLineName: 1 } },
//       ]),

//       // Distinct models
//       ProductionPlan.aggregate([
//         { $match: { year } },
//         { $group: {
//             _id:       '$model.modelId',
//             modelName: { $first: '$model.modelName' },
//         }},
//         { $project: { _id: 0, modelId: '$_id', modelName: 1 } },
//         { $sort: { modelName: 1 } },
//       ]),

//       // Available weeks for the year
//       ProductionPlan.aggregate([
//         { $match: { year } },
//         { $group: { _id: '$week' } },
//         { $sort: { _id: 1 } },
//         { $project: { _id: 0, week: '$_id' } },
//       ]),
//     ]);

//     res.status(200).json({
//       success: true,
//       data: { plants, assemblyLines, models, weeks: weeks.map(w => w.week) },
//     });
//   } catch (error) {
//     console.error('getDashboardFilters error:', error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// // =============================================================================
// // @desc    Calendar heat map — real actuals from DailyEntry
// // @route   GET /api/production-plans/dashboard/calendar
// // @query   year, month, plantId?, modelId?, assemblyLineId?
// // =============================================================================
// export const getCalendarHeatMap = async (req, res) => {
//   try {
//     const { year, month, plantId, modelId, assemblyLineId } = req.query;

//     const targetYear  = year  ? parseInt(year)  : new Date().getFullYear();
//     const targetMonth = month ? parseInt(month) - 1 : new Date().getMonth();

//     const firstDay = new Date(targetYear, targetMonth, 1);
//     const lastDay  = new Date(targetYear, targetMonth + 1, 0);
//     const firstStr = firstDay.toISOString().split('T')[0];
//     const lastStr  = lastDay.toISOString().split('T')[0];

//     // Weeks that overlap this month
//     const startWeek = getISOWeekNumber(firstDay);
//     const endWeek   = getISOWeekNumber(lastDay);
//     const weeks     = Array.from({ length: endWeek - startWeek + 1 }, (_, i) => `W${startWeek + i}`);

//     // Correct schema paths
//     const planQuery = { year: targetYear, week: { $in: weeks } };
//     if (plantId)        planQuery['model.assemblyLine.plant.plantId']  = plantId;
//     if (modelId)        planQuery['model.modelId']                     = modelId;
//     if (assemblyLineId) planQuery['model.assemblyLine.assemblyLineId'] = assemblyLineId;

//     const plans   = await ProductionPlan.find(planQuery).lean();
//     const planIds = plans.map(p => p._id);

//     // Real actuals from DailyEntry collection
//     const entries = await DailyEntry.find({
//       planId: { $in: planIds },
//       date:   { $gte: firstStr, $lte: lastStr },
//     }).lean();

//     // Build actual map: date → { actual, planId }
//     const actualMap = new Map();
//     for (const e of entries) {
//       if (!actualMap.has(e.date)) actualMap.set(e.date, { actual: 0, count: 0 });
//       if (e.actual !== null) {
//         const d = actualMap.get(e.date);
//         d.actual += e.actual;
//         d.count  += 1;
//       }
//     }

//     // Build planned map from plan dailyEntries
//     const plannedMap = new Map();
//     for (const plan of plans) {
//       for (const entry of (plan.dailyEntries ?? [])) {
//         if (entry.date < firstStr || entry.date > lastStr) continue;
//         if (!plannedMap.has(entry.date)) plannedMap.set(entry.date, 0);
//         plannedMap.set(entry.date, plannedMap.get(entry.date) + (entry.planned ?? 0));
//       }
//     }

//     // Assemble calendar array
//     const calendar = [];
//     const cursor   = new Date(firstDay);
//     while (cursor <= lastDay) {
//       const dateStr  = cursor.toISOString().split('T')[0];
//       const planned  = plannedMap.get(dateStr) ?? 0;
//       const actualObj = actualMap.get(dateStr);
//       const actual   = actualObj?.actual ?? null;

//       let status = 'normal';
//       if (planned > 0 && actual !== null) {
//         if      (actual >= planned)       status = 'ahead';
//         else if (actual >= planned * 0.9) status = 'on-track';
//         else                              status = 'behind';
//       } else if (planned > 0) {
//         status = 'pending';
//       }

//       calendar.push({
//         date:    dateStr,
//         day:     cursor.getDate(),
//         planned,
//         actual,
//         status,
//       });

//       cursor.setDate(cursor.getDate() + 1);
//     }

//     res.status(200).json({
//       success: true,
//       data: { month: targetMonth + 1, year: targetYear, calendar },
//     });
//   } catch (error) {
//     console.error('getCalendarHeatMap error:', error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };



import ProductionPlan from '../models/productionPlan.model.js';
import { DailyEntry } from './dailyEntry.controller.js';

// =============================================================================
// HELPERS
// =============================================================================
const toLocalDateString = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseLocalDateString = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const getWeekdayShort = (dateStr) =>
  parseLocalDateString(dateStr).toLocaleDateString('en-IN', { weekday: 'short' });

/**
 * ISO week number from a Date object.
 * Uses the proper ISO 8601 algorithm (week starts Monday, first week has Thursday).
 */
const getISOWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // Mon=1 … Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // nearest Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

/**
 * Monday of ISO week `weekNum` in `year`.
 *
 * FIX: The previous UTC-based implementation had an off-by-one error — it
 * returned W(n+1)'s Monday when asked for W(n).  Root cause: the algorithm
 * needs the *local* Jan-1 day-of-week, not the UTC one (they can differ by a
 * day in IST / UTC+5:30 timezones).
 *
 * New approach: scan forward from Jan 1 until we land on the first day whose
 * ISO week number equals weekNum.  Simple, correct, timezone-safe.
 */
const getMondayOfISOWeek = (weekNum, year) => {
  // Start from Jan 4 — guaranteed to always be in W1 by ISO 8601 definition
  const jan4 = new Date(year, 0, 4);
  const dow = jan4.getDay() || 7; // Mon=1 … Sun=7
  // Back up to Monday of W1
  const w1Monday = new Date(jan4);
  w1Monday.setDate(jan4.getDate() - (dow - 1));
  // Jump forward (weekNum-1) full weeks
  const result = new Date(w1Monday);
  result.setDate(w1Monday.getDate() + (weekNum - 1) * 7);
  return result;
};

/**
 * Returns { mondayStr, sundayStr } "YYYY-MM-DD" strings for ISO week label "W10".
 * Dates are built in local time so they always match the dates stored in dailyEntries.
 */
const getWeekBounds = (weekLabel, year) => {
  const weekNum = parseInt(weekLabel.replace('W', ''));
  const monday = getMondayOfISOWeek(weekNum, year);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  // Use local date parts — avoids UTC shift turning Mar 9 into Mar 8
  const toLocalStr = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  return { mondayStr: toLocalStr(monday), sundayStr: toLocalStr(sunday) };
};

// =============================================================================
// @desc    Get full dashboard data — aggregated or filtered
// @route   GET /api/production-plans/dashboard
// @query   year, week?, plantId?, modelId?, assemblyLineId?
//
// KEY FIXES vs old version:
//  ✅ Uses real DailyEntry actuals (no more Math.random() mock)
//  ✅ Correct schema field paths (model.assemblyLine.plant.plantId etc.)
//  ✅ Defaults to current ISO week when no week/date range given
//  ✅ No duplicate dates when merging multi-workingDays groups
//  ✅ hasActual flag added to every chartData item
//  ✅ Per-plan breakdown included for left-panel aggregation cards
//  ✅ Backlog carry-forward only touches PENDING (future) days
// =============================================================================
export const getDashboardData = async (req, res) => {
  try {
    const { year, week, plantId, modelId, assemblyLineId } = req.query;

    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    // ── Determine which week(s) to show ─────────────────────────────────────
    // If a specific week is given → show that week.
    // Otherwise → show the current ISO week.
    const today = new Date();
    const currentWeekNum = getISOWeekNumber(today);
    const targetWeek = week ?? `W${currentWeekNum}`;

    // ── Build Mongo query ────────────────────────────────────────────────────
    // Schema paths from productionPlan.model.js (NEW schema — nested under model.assemblyLine)
    const query = { year: targetYear, week: targetWeek };
    if (plantId) query['model.assemblyLine.plant.plantId'] = plantId;
    if (assemblyLineId) query['model.assemblyLine.assemblyLineId'] = assemblyLineId;
    if (modelId) query['model.modelId'] = modelId;

    const plans = await ProductionPlan.find(query).lean();

    // ── Empty state ──────────────────────────────────────────────────────────
    if (plans.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          week: targetWeek,
          year: targetYear,
          summary: { totalPlanned: 0, totalActual: 0, adherence: 0, deficit: 0, totalCapacity: 0 },
          chartData: [],
          planBreakdown: [],
        },
      });
    }

    // ── Fetch all DailyEntry actuals for these plans in one query ────────────
    const planIds = plans.map(p => p._id);
    const { mondayStr, sundayStr } = getWeekBounds(targetWeek, targetYear);

    const dailyEntries = await DailyEntry.find({
      planId: { $in: planIds },
      date: { $gte: mondayStr, $lte: sundayStr },
    }).lean();

    // ── Build fast lookup: "planId_date" → full DailyEntry doc ─────────────────
    // Stores the complete entry so we can pull shift, notes, enteredBy per day.
    const entryMap = new Map();
    for (const e of dailyEntries) {
      entryMap.set(`${e.planId}_${e.date}`, e);
    }

    // ── Build day-keyed aggregation map ──────────────────────────────────────
    // Each key = YYYY-MM-DD.
    // For aggregated view we sum planned/actual across all plans for that date,
    // and collect shift + notes from every DailyEntry that has data.
    const dayMap = new Map();

    for (const plan of plans) {
      if (!plan.dailyEntries || plan.dailyEntries.length === 0) continue;

      for (const entry of plan.dailyEntries) {
        if (entry.date < mondayStr || entry.date > sundayStr) continue;

        const saved = entryMap.get(`${plan._id}_${entry.date}`);
        const actualVal = saved?.actual ?? null;

        if (!dayMap.has(entry.date)) {
          dayMap.set(entry.date, {
            date: entry.date,
            basePlanned: 0,
            actual: null,
            hasActual: false,
            // Collect shift values and notes across all plans for this date
            shifts: [],   // e.g. ['day', 'night'] when multiple plans run
            notes: [],   // non-empty notes per plan-day
          });
        }

        const d = dayMap.get(entry.date);
        d.basePlanned += entry.planned;

        if (actualVal !== null) {
          d.actual = (d.actual ?? 0) + actualVal;
          d.hasActual = true;
        }

        // Collect shift from DailyEntry (authoritative) or fall back to plan-level shift
        const shift = saved?.shift ?? plan.shift ?? null;
        if (shift && !d.shifts.includes(shift)) d.shifts.push(shift);

        // Collect non-empty notes from DailyEntry
        const note = saved?.notes?.trim();
        if (note) d.notes.push(note);
      }
    }

    // ── Sort days, compute rolling backlog ────────────────────────────────────
    const sortedDays = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    let cumulativeBacklog = 0;
    const chartData = sortedDays.map(day => {
      const adjustedPlanned = day.hasActual
        ? day.basePlanned
        : Math.max(day.basePlanned + cumulativeBacklog, 0);

      let dayBacklog = 0;
      if (day.hasActual) {
        dayBacklog = adjustedPlanned - (day.actual ?? 0);
        cumulativeBacklog += dayBacklog;
      }

      let performanceStatus = 'pending';
      if (day.hasActual) {
        const actual = day.actual ?? 0;
        if (actual >= adjustedPlanned) performanceStatus = 'ahead';
        else if (actual >= adjustedPlanned * 0.9) performanceStatus = 'on-track';
        else performanceStatus = 'behind';
      }

      return {
        date: day.date,
        // dayName:           new Date(day.date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short' }),
        dayName: getWeekdayShort(day.date),
        basePlanned: day.basePlanned,
        adjustedPlanned,
        actual: day.actual ?? 0,
        hasActual: day.hasActual,
        backlog: dayBacklog,
        cumulativeBacklog: day.hasActual ? cumulativeBacklog : 0,
        performanceStatus,
        // ── NEW: per-day shift & notes from DailyEntry ───────────────────────
        // shift: collapsed to a single string when all plans agree, or
        //        'mixed' when different shifts are running on the same date.
        shift: day.shifts.length === 0 ? null
          : day.shifts.length === 1 ? day.shifts[0]
            : 'mixed',
        shifts: day.shifts,                // raw list for tooltip detail
        notes: day.notes.join(' | '),     // combined notes string (empty = '')
        notesList: day.notes,              // raw array if frontend needs it
      };
    });

    // ── Summary stats ─────────────────────────────────────────────────────────
    const enteredDays = chartData.filter(d => d.hasActual);
    const totalActual = enteredDays.reduce((s, d) => s + d.actual, 0);
    const totalPlanned = enteredDays.reduce((s, d) => s + d.basePlanned, 0);
    const totalCapacity = plans.reduce((s, p) => s + (p.capacity ?? 0), 0);
    const adherence = totalPlanned > 0
      ? parseFloat(((totalActual / totalPlanned) * 100).toFixed(1))
      : 0;

    // ── NEW: status breakdown ─────────────────────────────────────────────────
    // Count how many plans are in each status for this week/filter.
    const statusBreakdown = plans.reduce((acc, p) => {
      const s = p.status ?? 'PLANNED';
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    }, {});
    // Guarantee all four keys are always present (makes frontend destructuring safe)
    const statusCounts = {
      PLANNED: statusBreakdown.PLANNED ?? 0,
      IN_PROGRESS: statusBreakdown.IN_PROGRESS ?? 0,
      COMPLETED: statusBreakdown.COMPLETED ?? 0,
      CANCELLED: statusBreakdown.CANCELLED ?? 0,
    };

    // ── Per-plan breakdown ────────────────────────────────────────────────────
    const planBreakdown = plans.map(p => {
      const planEntries = (p.dailyEntries ?? []).map(e => {
        const saved = entryMap.get(`${p._id}_${e.date}`);
        return {
          ...e,
          actual: saved?.actual ?? null,
          shift: saved?.shift ?? p.shift ?? null,
          notes: saved?.notes ?? '',
        };
      });
      const entered = planEntries.filter(e => e.actual !== null);
      const planActual = entered.reduce((s, e) => s + (e.actual ?? 0), 0);
      const planPlanned = entered.reduce((s, e) => s + e.planned, 0);

      // Day-level performance counts for this plan
      const aheadDays = entered.filter(e => e.actual >= e.planned).length;
      const behindDays = entered.filter(e => e.actual < e.planned * 0.9).length;
      const onTrackDays = entered.length - aheadDays - behindDays;

      return {
        planId: p._id,
        week: p.week,
        year: p.year,
        status: p.status,
        isPartialWeek: p.isPartialWeek ?? false,
        notes: p.notes ?? '',
        plant: p.model?.assemblyLine?.plant?.plantName ?? '—',
        plantId: p.model?.assemblyLine?.plant?.plantId ?? '—',
        assemblyLine: p.model?.assemblyLine?.assemblyLineName ?? '—',
        assemblyLineId: p.model?.assemblyLine?.assemblyLineId ?? '—',
        model: p.model?.modelName ?? '—',
        modelId: p.model?.modelId ?? '—',
        partNumber: p.bom?.partNumber ?? '—',
        partName: p.bom?.partName ?? '—',
        capacity: p.capacity,
        workingDays: p.workingDays,
        totalActual: planActual,
        totalPlanned: planPlanned,
        adherence: planPlanned > 0 ? Math.round((planActual / planPlanned) * 100) : 0,
        deficit: Math.max(0, planPlanned - planActual),
        daysEntered: entered.length,
        daysRemaining: planEntries.filter(e => e.actual === null).length,
        // Day-level counts
        aheadDays,
        onTrackDays,
        behindDays,
        // Full daily entries with actuals + shift + notes merged in
        dailyEntries: planEntries,
      };
    });

    // ── Hierarchy grouping ────────────────────────────────────────────────────
    // Builds Plant → AssemblyLine → Model → Plan tree so the frontend can
    // render drill-down cards at whatever level the user is currently at.
    //
    // Each level exposes: planned, actual, backlog, adherence, capacity
    // so the UI can show a consistent stats card regardless of drill depth.

    // Helper: aggregate stats from an array of planBreakdown items
    const aggregateStats = (items) => {
      const totalCap = items.reduce((s, p) => s + (p.capacity ?? 0), 0);
      const totalPlan = items.reduce((s, p) => s + p.totalPlanned, 0);
      const totalAct = items.reduce((s, p) => s + p.totalActual, 0);
      const totalBacklog = items.reduce((s, p) => s + p.deficit, 0);
      return {
        capacity: totalCap,
        planned: totalPlan,
        actual: totalAct,
        backlog: totalBacklog,
        adherence: totalPlan > 0 ? parseFloat(((totalAct / totalPlan) * 100).toFixed(1)) : 0,
        plansCount: items.length,
      };
    };

    // Group plans by plant
    const plantMap = new Map();
    for (const p of planBreakdown) {
      if (!plantMap.has(p.plantId)) {
        plantMap.set(p.plantId, {
          plantId: p.plantId,
          plantName: p.plant,
          plans: [],
        });
      }
      plantMap.get(p.plantId).plans.push(p);
    }

    const hierarchyData = Array.from(plantMap.values()).map(plant => {
      // Group this plant's plans by assembly line
      const lineMap = new Map();
      for (const p of plant.plans) {
        if (!lineMap.has(p.assemblyLineId)) {
          lineMap.set(p.assemblyLineId, {
            assemblyLineId: p.assemblyLineId,
            assemblyLineName: p.assemblyLine,
            plans: [],
          });
        }
        lineMap.get(p.assemblyLineId).plans.push(p);
      }

      const assemblyLines = Array.from(lineMap.values()).map(line => {
        // Group this line's plans by model
        const modelMap = new Map();
        for (const p of line.plans) {
          if (!modelMap.has(p.modelId)) {
            modelMap.set(p.modelId, {
              modelId: p.modelId,
              modelName: p.model,
              plans: [],
            });
          }
          modelMap.get(p.modelId).plans.push(p);
        }

        const models = Array.from(modelMap.values()).map(mdl => ({
          modelId: mdl.modelId,
          modelName: mdl.modelName,
          stats: aggregateStats(mdl.plans),
          // Leaf plans (without heavy dailyEntries array to keep response lean)
          plans: mdl.plans.map(p => ({
            planId: p.planId,
            status: p.status,
            partNumber: p.partNumber,
            partName: p.partName,
            capacity: p.capacity,
            workingDays: p.workingDays,
            totalPlanned: p.totalPlanned,
            totalActual: p.totalActual,
            adherence: p.adherence,
            deficit: p.deficit,
            daysEntered: p.daysEntered,
            daysRemaining: p.daysRemaining,
            aheadDays: p.aheadDays,
            onTrackDays: p.onTrackDays,
            behindDays: p.behindDays,
          })),
        }));

        return {
          assemblyLineId: line.assemblyLineId,
          assemblyLineName: line.assemblyLineName,
          stats: aggregateStats(line.plans),
          models,
        };
      });

      return {
        plantId: plant.plantId,
        plantName: plant.plantName,
        stats: aggregateStats(plant.plans),
        assemblyLines,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        week: targetWeek,
        year: targetYear,
        summary: {
          totalPlanned,
          totalActual,
          adherence,
          deficit: Math.max(0, totalPlanned - totalActual),
          totalCapacity,
          plansCount: plans.length,
          daysEntered: enteredDays.length,
          daysRemaining: chartData.filter(d => !d.hasActual).length,
          statusCounts,
          aheadDays: chartData.filter(d => d.performanceStatus === 'ahead').length,
          onTrackDays: chartData.filter(d => d.performanceStatus === 'on-track').length,
          behindDays: chartData.filter(d => d.performanceStatus === 'behind').length,
          pendingDays: chartData.filter(d => d.performanceStatus === 'pending').length,
        },
        chartData,
        planBreakdown,
        // ── NEW: hierarchyData ────────────────────────────────────────────────
        // Shape: Plant[] → assemblyLines[] → models[] → plans[]
        // Each level has a `stats` object with planned/actual/backlog/adherence.
        // Frontend uses this to render drill-down cards.
        hierarchyData,
      },
    });
  } catch (error) {
    console.error('getDashboardData error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =============================================================================
// @desc    Get filter options — queried from actual plan data, not master collections
// @route   GET /api/production-plans/dashboard/filters
//
// FIX: Old version queried Plant/AssemblyLine/Model master collections.
//      Those may not match what's actually in plans. Now uses $group on ProductionPlan.
// =============================================================================
// export const getDashboardFilters = async (req, res) => {
//   try {
//     const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();

//     const [plants, assemblyLines, models, weeks] = await Promise.all([
//       // Distinct plants that actually have plans
//       ProductionPlan.aggregate([
//         { $match: { year } },
//         { $group: {
//             _id:       '$model.assemblyLine.plant.plantId',
//             plantName: { $first: '$model.assemblyLine.plant.plantName' },
//         }},
//         { $project: { _id: 0, plantId: '$_id', plantName: 1 } },
//         { $sort: { plantName: 1 } },
//       ]),

//       // Distinct assembly lines
//       ProductionPlan.aggregate([
//         { $match: { year } },
//         { $group: {
//             _id:              '$model.assemblyLine.assemblyLineId',
//             assemblyLineName: { $first: '$model.assemblyLine.assemblyLineName' },
//         }},
//         { $project: { _id: 0, assemblyLineId: '$_id', assemblyLineName: 1 } },
//         { $sort: { assemblyLineName: 1 } },
//       ]),

//       // Distinct models
//       ProductionPlan.aggregate([
//         { $match: { year } },
//         { $group: {
//             _id:       '$model.modelId',
//             modelName: { $first: '$model.modelName' },
//         }},
//         { $project: { _id: 0, modelId: '$_id', modelName: 1 } },
//         { $sort: { modelName: 1 } },
//       ]),

//       // Available weeks for the year
//       ProductionPlan.aggregate([
//         { $match: { year } },
//         { $group: { _id: '$week' } },
//         { $sort: { _id: 1 } },
//         { $project: { _id: 0, week: '$_id' } },
//       ]),
//     ]);

//     res.status(200).json({
//       success: true,
//       data: { plants, assemblyLines, models, weeks: weeks.map(w => w.week) },
//     });
//   } catch (error) {
//     console.error('getDashboardFilters error:', error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };
export const getDashboardFilters = async (req, res) => {
  try {
    const year = req.query.year ? parseInt(req.query.year, 10) : new Date().getFullYear();

    const [plants, assemblyLines, models, rawWeeks] = await Promise.all([
      ProductionPlan.aggregate([
        { $match: { year } },
        {
          $group: {
            _id: '$model.assemblyLine.plant.plantId',
            plantName: { $first: '$model.assemblyLine.plant.plantName' },
          },
        },
        { $project: { _id: 0, plantId: '$_id', plantName: 1 } },
        { $sort: { plantName: 1 } },
      ]),
      ProductionPlan.aggregate([
        { $match: { year } },
        {
          $group: {
            _id: '$model.assemblyLine.assemblyLineId',
            assemblyLineName: { $first: '$model.assemblyLine.assemblyLineName' },
          },
        },
        { $project: { _id: 0, assemblyLineId: '$_id', assemblyLineName: 1 } },
        { $sort: { assemblyLineName: 1 } },
      ]),
      ProductionPlan.aggregate([
        { $match: { year } },
        {
          $group: {
            _id: '$model.modelId',
            modelName: { $first: '$model.modelName' },
          },
        },
        { $project: { _id: 0, modelId: '$_id', modelName: 1 } },
        { $sort: { modelName: 1 } },
      ]),
      ProductionPlan.distinct('week', { year }),
    ]);

    const weeks = rawWeeks
      .filter(Boolean)
      .sort((a, b) => parseInt(a.replace('W', ''), 10) - parseInt(b.replace('W', ''), 10));

    res.status(200).json({
      success: true,
      data: { plants, assemblyLines, models, weeks },
    });
  } catch (error) {
    console.error('getDashboardFilters error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =============================================================================
// @desc    Calendar heat map — real actuals from DailyEntry
// @route   GET /api/production-plans/dashboard/calendar
// @query   year, month, plantId?, modelId?, assemblyLineId?
// =============================================================================
// export const getCalendarHeatMap = async (req, res) => {
//   try {
//     const { year, month, plantId, modelId, assemblyLineId } = req.query;

//     const targetYear  = year  ? parseInt(year)  : new Date().getFullYear();
//     const targetMonth = month ? parseInt(month) - 1 : new Date().getMonth();

//     const firstDay = new Date(targetYear, targetMonth, 1);
//     const lastDay  = new Date(targetYear, targetMonth + 1, 0);
//     // Use local date parts to avoid UTC shift (e.g. Mar 1 local → Feb 28 UTC in IST)
//     const toLocalStr = (d) => {
//       const y = d.getFullYear();
//       const m = String(d.getMonth() + 1).padStart(2, '0');
//       const day = String(d.getDate()).padStart(2, '0');
//       return `${y}-${m}-${day}`;
//     };
//     const firstStr = toLocalStr(firstDay);
//     const lastStr  = toLocalStr(lastDay);

//     // Weeks that overlap this month
//     const startWeek = getISOWeekNumber(firstDay);
//     const endWeek   = getISOWeekNumber(lastDay);
//     const weeks     = Array.from({ length: endWeek - startWeek + 1 }, (_, i) => `W${startWeek + i}`);

//     // Correct schema paths
//     const planQuery = { year: targetYear, week: { $in: weeks } };
//     if (plantId)        planQuery['model.assemblyLine.plant.plantId']  = plantId;
//     if (modelId)        planQuery['model.modelId']                     = modelId;
//     if (assemblyLineId) planQuery['model.assemblyLine.assemblyLineId'] = assemblyLineId;

//     const plans   = await ProductionPlan.find(planQuery).lean();
//     const planIds = plans.map(p => p._id);

//     // Real actuals from DailyEntry collection
//     const entries = await DailyEntry.find({
//       planId: { $in: planIds },
//       date:   { $gte: firstStr, $lte: lastStr },
//     }).lean();

//     // Build actual map: date → { actual, planId }
//     const actualMap = new Map();
//     for (const e of entries) {
//       if (!actualMap.has(e.date)) actualMap.set(e.date, { actual: 0, count: 0 });
//       if (e.actual !== null) {
//         const d = actualMap.get(e.date);
//         d.actual += e.actual;
//         d.count  += 1;
//       }
//     }

//     // Build planned map from plan dailyEntries
//     const plannedMap = new Map();
//     for (const plan of plans) {
//       for (const entry of (plan.dailyEntries ?? [])) {
//         if (entry.date < firstStr || entry.date > lastStr) continue;
//         if (!plannedMap.has(entry.date)) plannedMap.set(entry.date, 0);
//         plannedMap.set(entry.date, plannedMap.get(entry.date) + (entry.planned ?? 0));
//       }
//     }

//     // Assemble calendar array
//     const calendar = [];
//     const cursor   = new Date(firstDay);
//     while (cursor <= lastDay) {
//       const dateStr  = toLocalStr(cursor);
//       const planned  = plannedMap.get(dateStr) ?? 0;
//       const actualObj = actualMap.get(dateStr);
//       const actual   = actualObj?.actual ?? null;

//       let status = 'normal';
//       if (planned > 0 && actual !== null) {
//         if      (actual >= planned)       status = 'ahead';
//         else if (actual >= planned * 0.9) status = 'on-track';
//         else                              status = 'behind';
//       } else if (planned > 0) {
//         status = 'pending';
//       }

//       calendar.push({
//         date:    dateStr,
//         day:     cursor.getDate(),
//         planned,
//         actual,
//         status,
//       });

//       cursor.setDate(cursor.getDate() + 1);
//     }

//     res.status(200).json({
//       success: true,
//       data: { month: targetMonth + 1, year: targetYear, calendar },
//     });
//   } catch (error) {
//     console.error('getCalendarHeatMap error:', error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };
export const getCalendarHeatMap = async (req, res) => {
  try {
    const { year, month, plantId, modelId, assemblyLineId } = req.query;

    const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();
    const targetMonth = month ? parseInt(month, 10) - 1 : new Date().getMonth();

    const firstDay = new Date(targetYear, targetMonth, 1);
    const lastDay = new Date(targetYear, targetMonth + 1, 0);

    const firstStr = toLocalDateString(firstDay);
    const lastStr = toLocalDateString(lastDay);

    const match = {
      date: { $gte: firstStr, $lte: lastStr },
    };

    if (plantId) match['plant.plantId'] = plantId;
    if (modelId) match['model.modelId'] = modelId;
    if (assemblyLineId) match['assemblyLine.assemblyLineId'] = assemblyLineId;

    const aggregated = await DailyEntry.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$date',
          planned: { $sum: { $ifNull: ['$planned', 0] } },
          actual: { $sum: { $ifNull: ['$actual', 0] } },
          actualCount: {
            $sum: {
              $cond: [{ $ne: ['$actual', null] }, 1, 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const dateMap = new Map(
      aggregated.map((row) => [
        row._id,
        {
          planned: row.planned ?? 0,
          actual: row.actualCount > 0 ? row.actual : null,
          hasActual: row.actualCount > 0,
        },
      ])
    );

    const calendar = [];
    const cursor = new Date(firstDay);

    while (cursor <= lastDay) {
      const dateStr = toLocalDateString(cursor);
      const agg = dateMap.get(dateStr) ?? {
        planned: 0,
        actual: null,
        hasActual: false,
      };

      let status = 'normal';
      if (agg.planned > 0 && agg.hasActual) {
        if (agg.actual >= agg.planned) status = 'ahead';
        else if (agg.actual >= agg.planned * 0.9) status = 'on-track';
        else status = 'behind';
      } else if (agg.planned > 0) {
        status = 'pending';
      }

      calendar.push({
        date: dateStr,
        day: cursor.getDate(),
        planned: agg.planned,
        actual: agg.actual,
        status,
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    res.status(200).json({
      success: true,
      data: {
        month: targetMonth + 1,
        year: targetYear,
        calendar,
      },
    });
  } catch (error) {
    console.error('getCalendarHeatMap error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
