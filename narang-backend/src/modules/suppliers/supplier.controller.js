import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import * as supplierService from './supplier.service.js';

export const getAllSuppliers = asyncHandler(async (req, res) => {
  const suppliers = await supplierService.getAllSuppliers({ search: req.query.search });
  return res.json(new ApiResponse(200, suppliers, 'Suppliers fetched'));
});

export const getSupplierById = asyncHandler(async (req, res) => {
  const supplier = await supplierService.getSupplierById(req.params.id);
  return res.json(new ApiResponse(200, supplier, 'Supplier fetched'));
});

export const createSupplier = asyncHandler(async (req, res) => {
  const supplier = await supplierService.createSupplier(req.body);
  return res.json(new ApiResponse(201, supplier, 'Supplier created'));
});

export const updateSupplier = asyncHandler(async (req, res) => {
  const supplier = await supplierService.updateSupplier(req.params.id, req.body);
  return res.json(new ApiResponse(200, supplier, 'Supplier updated'));
});

export const deleteSupplier = asyncHandler(async (req, res) => {
  const result = await supplierService.deleteSupplier(req.params.id);
  return res.json(new ApiResponse(200, result, 'Supplier deleted'));
});
