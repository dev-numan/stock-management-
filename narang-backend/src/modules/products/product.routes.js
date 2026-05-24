import { Router } from 'express';
import { param } from 'express-validator';
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
router.delete('/:id', idParam, authorize('ADMIN'), validate, productController.deleteProduct);

export default router;
