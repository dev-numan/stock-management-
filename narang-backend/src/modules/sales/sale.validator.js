import { body } from 'express-validator';

const units = ['KG', 'BAG', 'LITRE', 'PIECE', 'BOTTLE'];

export const createSaleValidator = [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.productId').isUUID().withMessage('Valid product ID is required'),
  body('items.*.quantity').isFloat({ min: 0.01 }).withMessage('Valid quantity is required'),
  body('items.*.soldUnit').optional().isIn(units).withMessage('Invalid sold unit'),
  body('items.*.unitPrice').optional().isFloat({ min: 0 }),
  body('customerId').optional({ nullable: true }).isUUID(),
  body('discount').optional().isFloat({ min: 0 }),
  body('paymentMethod').optional().isIn(['CASH', 'CREDIT']),
  body().custom((_value, { req }) => {
    if (req.body.paymentMethod === 'CREDIT' && !req.body.customerId) {
      throw new Error('Customer is required for credit sales');
    }
    return true;
  }),
  body('notes').optional().trim(),
  body('clientRequestId')
    .optional()
    .trim()
    .isLength({ min: 8, max: 128 })
    .withMessage('clientRequestId must be 8–128 characters'),
];
