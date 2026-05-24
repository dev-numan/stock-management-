import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import * as expenseService from './expense.service.js';

export const getAllExpenses = asyncHandler(async (req, res) => {
  const expenses = await expenseService.getAllExpenses({
    month: req.query.month,
    year: req.query.year,
  });
  return res.json(new ApiResponse(200, expenses, 'Expenses fetched'));
});

export const createExpense = asyncHandler(async (req, res) => {
  const expense = await expenseService.createExpense(req.body);
  return res.json(new ApiResponse(201, expense, 'Expense created'));
});

export const deleteExpense = asyncHandler(async (req, res) => {
  const result = await expenseService.deleteExpense(req.params.id);
  return res.json(new ApiResponse(200, result, 'Expense deleted'));
});
