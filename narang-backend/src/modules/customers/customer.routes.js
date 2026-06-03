import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import * as customerController from './customer.controller.js';

const router = Router();

router.use(authenticate);

const customerBody = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('phone').optional().trim(),
  body('address').optional().trim(),
];

const advanceBody = [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than zero'),
  body('notes').optional().trim(),
];

router.get('/', customerController.getAllCustomers);
router.get('/:id', customerController.getCustomerById);
router.get('/:id/advance', customerController.getCustomerAdvanceEntries);
router.post('/:id/advance', advanceBody, validate, customerController.addCustomerAdvance);
router.delete(
  '/:id/advance/:entryId',
  [
    param('id').isUUID(),
    param('entryId').isUUID(),
  ],
  validate,
  authorize('ADMIN'),
  customerController.deleteCustomerAdvanceEntry
);
router.post('/', customerBody, validate, customerController.createCustomer);
router.put('/:id', customerBody, validate, customerController.updateCustomer);
router.delete('/:id', authorize('ADMIN'), customerController.deleteCustomer);

export default router;
