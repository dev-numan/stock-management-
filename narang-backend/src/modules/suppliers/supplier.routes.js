import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import * as supplierController from './supplier.controller.js';

const router = Router();

router.use(authenticate);

const supplierBody = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('phone').optional().trim(),
  body('address').optional().trim(),
];

const paymentBody = [
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount is required'),
  body('notes').optional().trim(),
];

router.get('/', supplierController.getAllSuppliers);
router.get('/:id/ledger', supplierController.getSupplierLedger);
router.post('/:id/payments', paymentBody, validate, supplierController.addSupplierPayment);
router.get('/:id', supplierController.getSupplierById);
router.post('/', supplierBody, validate, supplierController.createSupplier);
router.put('/:id', supplierBody, validate, supplierController.updateSupplier);
router.delete('/:id', authorize('ADMIN'), supplierController.deleteSupplier);

export default router;
