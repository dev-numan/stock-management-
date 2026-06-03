import { Router } from 'express';
import { param } from 'express-validator';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createSaleValidator } from './sale.validator.js';
import * as saleController from './sale.controller.js';

const router = Router();

router.use(authenticate);

const idParam = [param('id').isUUID().withMessage('Valid sale ID is required')];

router.get('/', saleController.getAllSales);
router.get('/:id', idParam, validate, saleController.getSaleById);
router.post('/', createSaleValidator, validate, saleController.createSale);
router.delete('/:id', idParam, authorize('ADMIN'), validate, saleController.deleteSale);

export default router;
