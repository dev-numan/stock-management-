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
  validate,
  settingsController.updateSettings
);

export default router;
