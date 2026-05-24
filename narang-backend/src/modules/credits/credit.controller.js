import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import * as creditService from './credit.service.js';

export const listCredits = asyncHandler(async (_req, res) => {
  const data = await creditService.getCreditSales();
  res.json(new ApiResponse(200, data, 'Credit sales retrieved'));
});
