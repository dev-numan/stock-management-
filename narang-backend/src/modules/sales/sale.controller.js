import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import * as saleService from './sale.service.js';

export const getAllSales = asyncHandler(async (req, res) => {
  const sales = await saleService.getAllSales({
    from: req.query.from,
    to: req.query.to,
    customerId: req.query.customerId,
    paymentMethod: req.query.paymentMethod,
  });
  return res.json(new ApiResponse(200, sales, 'Sales fetched'));
});

export const getSaleById = asyncHandler(async (req, res) => {
  const sale = await saleService.getSaleById(req.params.id);
  return res.json(new ApiResponse(200, sale, 'Sale fetched'));
});

export const createSale = asyncHandler(async (req, res) => {
  const sale = await saleService.createSale(req.body, req.user.id);
  return res.json(new ApiResponse(201, sale, 'Sale created'));
});

export const deleteSale = asyncHandler(async (req, res) => {
  const result = await saleService.deleteSale(req.params.id);
  return res.json(new ApiResponse(200, result, 'Sale deleted'));
});
