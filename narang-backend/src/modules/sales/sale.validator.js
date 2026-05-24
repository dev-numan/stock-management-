import { body } from 'express-validator';

export const createSaleValidator = [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.productId').isUUID().withMessage('Valid product ID is required'),
  body('items.*.quantity').isFloat({ min: 0.01 }).withMessage('Valid quantity is required'),
  body('items.*.unitPrice').optional().isFloat({ min: 0 }),
  body('customerId').optional({ nullable: true }).isUUID(),
  body('discount').optional().isFloat({ min: 0 }),
  body('paymentMethod').optional().isIn(['CASH', 'CREDIT']),
  body('notes').optional().trim(),
];
