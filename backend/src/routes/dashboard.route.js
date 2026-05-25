import express from 'express';
const router = express.Router();
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
  getProductionPlansByRange
} from '../controllers/productionPlan.controller.js';

import {
  getDashboardData,
  getDashboardFilters,
  getCalendarHeatMap
} from '../controllers/dashboard.controller.js';

// Dashboard routes
router.get('/dashboard', getDashboardData);
router.get('/dashboard/filters', getDashboardFilters);
router.get('/dashboard/calendar', getCalendarHeatMap);

// Analytics routes (place before :id routes to avoid conflicts)
router.get('/analytics/weekly-summary', getWeeklySummary);
router.get('/analytics/annual-overview', getAnnualOverview);
router.get('/analytics/plant-summary', getPlantSummary);

// Range query route
router.get('/range', getProductionPlansByRange);

// Bulk operations
router.post('/bulk', bulkCreateProductionPlans);

// CRUD routes
router.route('/')
  .get(getAllProductionPlans)
  .post(createProductionPlan);

router.route('/:id')
  .get(getProductionPlanById)
  .put(updateProductionPlan)
  .delete(deleteProductionPlan);

export default router;