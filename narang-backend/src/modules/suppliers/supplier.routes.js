import { Router } from 'express';
import { body, param } from 'express-validator';
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

const ledgerEntryBody = [
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount is required'),
  body('notes').optional().trim(),
];

router.get('/', supplierController.getAllSuppliers);
router.get('/:id/ledger', supplierController.getSupplierLedger);
router.get(
  '/:id/deletion-blockers',
  [param('id').isUUID()],
  validate,
  authorize('ADMIN'),
  supplierController.getSupplierDeletionBlockers
);
router.post('/:id/payments', ledgerEntryBody, validate, supplierController.addSupplierPayment);
router.delete(
  '/:id/payments/:paymentId',
  [param('id').isUUID(), param('paymentId').isUUID()],
  validate,
  authorize('ADMIN'),
  supplierController.deleteSupplierPayment
);
router.post('/:id/purchases', ledgerEntryBody, validate, supplierController.addSupplierPurchase);
router.get('/:id', supplierController.getSupplierById);
router.post('/', supplierBody, validate, supplierController.createSupplier);
router.put('/:id', supplierBody, validate, supplierController.updateSupplier);
router.delete('/:id', authorize('ADMIN'), supplierController.deleteSupplier);

export default router;
