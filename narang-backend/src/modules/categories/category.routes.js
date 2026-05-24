import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import * as categoryController from './category.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', categoryController.getAllCategories);
router.post(
  '/',
  authorize('ADMIN'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  validate,
  categoryController.createCategory
);
router.delete('/:id', authorize('ADMIN'), categoryController.deleteCategory);

export default router;
