import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import * as categoryService from './category.service.js';

export const getAllCategories = asyncHandler(async (req, res) => {
  const categories = await categoryService.getAllCategories();
  return res.json(new ApiResponse(200, categories, 'Categories fetched'));
});

export const createCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.createCategory(req.body);
  return res.json(new ApiResponse(201, category, 'Category created'));
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const result = await categoryService.deleteCategory(req.params.id);
  return res.json(new ApiResponse(200, result, 'Category deleted'));
});
