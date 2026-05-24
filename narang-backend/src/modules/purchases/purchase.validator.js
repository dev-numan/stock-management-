import { body } from 'express-validator';

export const createPurchaseValidator = [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.productId').isUUID().withMessage('Valid product ID is required'),
  body('items.*.quantity').isFloat({ min: 0.01 }).withMessage('Valid quantity is required'),
  body('items.*.costPrice').optional().isFloat({ min: 0 }),
  body('supplierId').optional({ nullable: true }).isUUID(),
  body('notes').optional().trim(),
];
