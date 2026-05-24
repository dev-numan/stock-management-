import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import * as purchaseService from './purchase.service.js';

export const getAllPurchases = asyncHandler(async (req, res) => {
  const purchases = await purchaseService.getAllPurchases({
    from: req.query.from,
    to: req.query.to,
  });
  return res.json(new ApiResponse(200, purchases, 'Purchases fetched'));
});

export const getPurchaseById = asyncHandler(async (req, res) => {
  const purchase = await purchaseService.getPurchaseById(req.params.id);
  return res.json(new ApiResponse(200, purchase, 'Purchase fetched'));
});

export const createPurchase = asyncHandler(async (req, res) => {
  const purchase = await purchaseService.createPurchase(req.body);
  return res.json(new ApiResponse(201, purchase, 'Purchase created'));
});
