import express from 'express';
import multer from 'multer';
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

import {
  createProductionPlan,
  getAllProductionPlans,
  getProductionPlanById,
  updateProductionPlan,
  deleteProductionPlan,
  getWeeklySummary,
  getAnnualOverview,
  getPlantSummary,
  bulkCreateProductionPlans,
  getProductionPlansByRange,
  getDailyEntries,
  updateDailyEntry,
  uploadMonthlyPlan,
} from '../controllers/productionPlan.controller.js';

import {
  getDashboardData,
  getDashboardFilters,
  getCalendarHeatMap,
} from '../controllers/dashboard.controller.js';

// ── Dashboard ──────────────────────────────────────────────────────────────────
router.get('/dashboard', getDashboardData);
router.get('/dashboard/filters', getDashboardFilters);
router.get('/dashboard/calendar', getCalendarHeatMap);

// ── Analytics (before /:id to avoid param conflict) ───────────────────────────
router.get('/analytics/weekly-summary', getWeeklySummary);
router.get('/analytics/annual-overview', getAnnualOverview);
router.get('/analytics/plant-summary', getPlantSummary);

// ── Range + Bulk ───────────────────────────────────────────────────────────────
router.get('/range', getProductionPlansByRange);
router.post('/bulk', bulkCreateProductionPlans);

// ── Monthly Excel Upload ────────────────────────────────────────────────────
// Multipart: file (xlsx) + matrixId + manpower (JSON) + year
router.post('/upload-monthly-excel', upload.single('file'), uploadMonthlyPlan);

// ── CRUD ───────────────────────────────────────────────────────────────────────
router.route('/')
  .get(getAllProductionPlans)
  .post(createProductionPlan);

router.route('/:id')
  .get(getProductionPlanById)
  .put(updateProductionPlan)
  .delete(deleteProductionPlan);

// ── Daily entry sub-routes ─────────────────────────────────────────────────────
router.get('/:id/daily-entries', getDailyEntries);
router.put('/:id/daily-entries/:date', updateDailyEntry);

export default router;