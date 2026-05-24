import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import * as productService from './product.service.js';

export const getAllProducts = asyncHandler(async (req, res) => {
  const products = await productService.getAllProducts({
    search: req.query.search,
    categoryId: req.query.categoryId,
    lowStock: req.query.lowStock,
  });
  return res.json(new ApiResponse(200, products, 'Products fetched'));
});

export const getProductById = asyncHandler(async (req, res) => {
  const product = await productService.getProductById(req.params.id);
  return res.json(new ApiResponse(200, product, 'Product fetched'));
});

export const createProduct = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.body);
  return res.json(new ApiResponse(201, product, 'Product created'));
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.params.id, req.body);
  return res.json(new ApiResponse(200, product, 'Product updated'));
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const result = await productService.deleteProduct(req.params.id);
  return res.json(new ApiResponse(200, result, 'Product deleted'));
});
