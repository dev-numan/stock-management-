import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import * as settingsController from './settings.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', settingsController.getSettings);
router.put(
  '/',
  authorize('ADMIN'),
  body('address').optional().trim(),
  body('phone').optional().trim(),
  body('showLowStockAlert').optional().isBoolean(),
  body('showExpiryAlert').optional().isBoolean(),
  body('expiryAlertMonths').optional().isInt({ min: 1, max: 12 }),
  validate,
  settingsController.updateSettings
);

export default router;
