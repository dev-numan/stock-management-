import { Router } from 'express';
import { param } from 'express-validator';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createPurchaseValidator } from './purchase.validator.js';
import * as purchaseController from './purchase.controller.js';

const router = Router();

router.use(authenticate);

const idParam = [param('id').isUUID().withMessage('Valid purchase ID is required')];

router.get('/', purchaseController.getAllPurchases);
router.get('/:id', idParam, validate, purchaseController.getPurchaseById);
router.post('/', createPurchaseValidator, validate, purchaseController.createPurchase);
router.delete('/:id', idParam, authorize('ADMIN'), validate, purchaseController.deletePurchase);

export default router;
