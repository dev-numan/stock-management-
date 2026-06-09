import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import * as partyController from './party.controller.js';

const router = Router();

router.use(authenticate);

const partyBody = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('phone').optional().trim(),
  body('address').optional().trim(),
  body('partyType').optional().isIn(['CUSTOMER', 'SUPPLIER']),
];

const advanceBody = [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than zero'),
  body('notes').optional().trim(),
];

const convertBody = [body('partyType').isIn(['CUSTOMER', 'SUPPLIER'])];

router.get(
  '/',
  [query('type').optional().isIn(['CUSTOMER', 'SUPPLIER', 'customer', 'supplier'])],
  validate,
  partyController.getAllParties
);
router.get('/:id', [param('id').isUUID()], validate, partyController.getPartyById);
router.get(
  '/:id/deletion-blockers',
  [param('id').isUUID()],
  validate,
  authorize('ADMIN'),
  partyController.getPartyDeletionBlockers
);
router.get('/:id/advance', [param('id').isUUID()], validate, partyController.getPartyAdvanceEntries);
router.get('/:id/customer-ledger', [param('id').isUUID()], validate, partyController.getPartyAdvanceEntries);
router.get('/:id/supplier-ledger', [param('id').isUUID()], validate, partyController.getPartySupplierLedger);
router.get('/:id/ledger', [param('id').isUUID()], validate, partyController.getPartySupplierLedger);
router.post('/:id/advance', [param('id').isUUID(), ...advanceBody], validate, partyController.addPartyAdvance);
router.post('/:id/credit-charge', [param('id').isUUID(), ...advanceBody], validate, partyController.addPartyCreditCharge);
router.post('/:id/payments', [param('id').isUUID(), ...advanceBody], validate, partyController.addPartyPayment);
router.post('/:id/purchases', [param('id').isUUID(), ...advanceBody], validate, partyController.addPartyPurchase);
router.post('/:id/convert', [param('id').isUUID(), ...convertBody], validate, partyController.convertParty);
router.delete(
  '/:id/advance/:entryId',
  [param('id').isUUID(), param('entryId').isUUID()],
  validate,
  authorize('ADMIN'),
  partyController.deletePartyAdvanceEntry
);
router.delete(
  '/:id/payments/:paymentId',
  [param('id').isUUID(), param('paymentId').isUUID()],
  validate,
  authorize('ADMIN'),
  partyController.deletePartyPayment
);
router.post('/', partyBody, validate, partyController.createParty);
router.put('/:id', partyBody, validate, partyController.updateParty);
router.delete('/:id', authorize('ADMIN'), partyController.deleteParty);

export default router;
