import { body } from 'express-validator';
import { PRODUCT_CATEGORIES } from '../../constants/productCategories.js';

const units = ['KG', 'BAG', 'LITRE', 'PIECE', 'BOTTLE'];

export const createProductValidator = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('category')
    .trim()
    .isIn(PRODUCT_CATEGORIES)
    .withMessage('Valid category is required'),
  body('unit').optional().isIn(units).withMessage('Invalid unit'),
  body('alternateSaleUnit').optional({ nullable: true }).isIn(units).withMessage('Invalid alternate unit'),
  body('unitsPerStockUnit').optional({ nullable: true }).isFloat({ min: 0.01 }),
  body('costPrice').isFloat({ min: 0 }).withMessage('Valid cost price is required'),
  body('salePrice').isFloat({ min: 0 }).withMessage('Valid sale price is required'),
  body('currentStock').optional().isFloat({ min: 0 }),
  body('minStockAlert').optional().isFloat({ min: 0 }),
  body('expiryDate').optional({ nullable: true }).isISO8601().withMessage('Expiry date must be YYYY-MM-DD'),
  body('supplierId').optional({ nullable: true }).isUUID(),
];

export const updateProductValidator = [
  body('name').optional().trim().notEmpty(),
  body('category').optional().trim().isIn(PRODUCT_CATEGORIES),
  body('unit').optional().isIn(units),
  body('alternateSaleUnit').optional({ nullable: true }).isIn(units).withMessage('Invalid alternate unit'),
  body('unitsPerStockUnit').optional({ nullable: true }).isFloat({ min: 0.01 }),
  body('costPrice').optional().isFloat({ min: 0 }),
  body('salePrice').optional().isFloat({ min: 0 }),
  body('currentStock').optional().isFloat({ min: 0 }),
  body('minStockAlert').optional().isFloat({ min: 0 }),
  body('expiryDate').optional({ nullable: true }).isISO8601().withMessage('Expiry date must be YYYY-MM-DD'),
  body('supplierId').optional({ nullable: true }).isUUID(),
];
