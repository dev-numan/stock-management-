import { body } from 'express-validator';

const units = ['KG', 'BAG', 'LITRE', 'PIECE', 'BOTTLE'];

export const createProductValidator = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('categoryId').isUUID().withMessage('Valid category is required'),
  body('unit').optional().isIn(units).withMessage('Invalid unit'),
  body('costPrice').isFloat({ min: 0 }).withMessage('Valid cost price is required'),
  body('salePrice').isFloat({ min: 0 }).withMessage('Valid sale price is required'),
  body('currentStock').optional().isFloat({ min: 0 }),
  body('minStockAlert').optional().isFloat({ min: 0 }),
  body('supplierId').optional({ nullable: true }).isUUID(),
];

export const updateProductValidator = [
  body('name').optional().trim().notEmpty(),
  body('categoryId').optional().isUUID(),
  body('unit').optional().isIn(units),
  body('costPrice').optional().isFloat({ min: 0 }),
  body('salePrice').optional().isFloat({ min: 0 }),
  body('currentStock').optional().isFloat({ min: 0 }),
  body('minStockAlert').optional().isFloat({ min: 0 }),
  body('supplierId').optional({ nullable: true }).isUUID(),
];
