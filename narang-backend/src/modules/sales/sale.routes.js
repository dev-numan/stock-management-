import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createSaleValidator } from './sale.validator.js';
import * as saleController from './sale.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', saleController.getAllSales);
router.get('/:id', saleController.getSaleById);
router.post('/', createSaleValidator, validate, saleController.createSale);

export default router;
