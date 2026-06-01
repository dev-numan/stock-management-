import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createProductValidator, updateProductValidator } from './product.validator.js';
import * as productController from './product.controller.js';

const router = Router();

router.use(authenticate);

const idParam = [param('id').isUUID().withMessage('Valid product ID is required')];

router.get('/', productController.getAllProducts);
router.get('/:id', idParam, validate, productController.getProductById);
router.post('/', createProductValidator, validate, productController.createProduct);
router.put('/:id', idParam, updateProductValidator, validate, productController.updateProduct);
router.post(
  '/:id/stock',
  idParam,
  [
    body('quantity').isFloat({ min: 0.01 }).withMessage('Valid quantity is required'),
    body('supplierId').optional({ nullable: true }).isUUID(),
    body('supplierName').optional().trim().isLength({ min: 1, max: 200 }),
    body('notes').optional().trim(),
  ],
  validate,
  productController.addProductStock
);
router.delete('/:id', idParam, authorize('ADMIN'), validate, productController.deleteProduct);

export default router;
