import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';
import * as reportController from './report.controller.js';

const router = Router();

router.use(authenticate);

router.get('/dashboard', reportController.getDashboard);
router.get('/sales-trend', reportController.getSalesTrend);
router.get('/sales-summary', authorize('ADMIN'), reportController.getSalesSummary);
router.get('/profit-loss', authorize('ADMIN'), reportController.getProfitLoss);
router.get('/stock-valuation', authorize('ADMIN'), reportController.getStockValuation);

export default router;
