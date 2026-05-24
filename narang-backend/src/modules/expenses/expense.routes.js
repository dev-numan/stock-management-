import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import * as expenseController from './expense.controller.js';

const router = Router();

router.use(authenticate);

const expenseBody = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Valid amount is required'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('notes').optional().trim(),
];

router.get('/', expenseController.getAllExpenses);
router.post('/', expenseBody, validate, expenseController.createExpense);
router.delete('/:id', authorize('ADMIN'), expenseController.deleteExpense);

export default router;
