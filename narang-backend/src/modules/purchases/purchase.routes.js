import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createPurchaseValidator } from './purchase.validator.js';
import * as purchaseController from './purchase.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', purchaseController.getAllPurchases);
router.get('/:id', purchaseController.getPurchaseById);
router.post('/', createPurchaseValidator, validate, purchaseController.createPurchase);

export default router;
