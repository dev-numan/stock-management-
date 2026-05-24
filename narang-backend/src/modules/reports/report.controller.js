import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import * as reportService from './report.service.js';

export const getDashboard = asyncHandler(async (req, res) => {
  const data = await reportService.getDashboard();
  return res.json(new ApiResponse(200, data, 'Dashboard data fetched'));
});

export const getSalesSummary = asyncHandler(async (req, res) => {
  const data = await reportService.getSalesSummary({
    from: req.query.from,
    to: req.query.to,
  });
  return res.json(new ApiResponse(200, data, 'Sales summary fetched'));
});

export const getProfitLoss = asyncHandler(async (req, res) => {
  const data = await reportService.getProfitLoss({
    from: req.query.from,
    to: req.query.to,
  });
  return res.json(new ApiResponse(200, data, 'Profit/loss report fetched'));
});

export const getSalesTrend = asyncHandler(async (req, res) => {
  const mode = req.query.mode === 'year' ? 'year' : 'month';
  const data = await reportService.getSalesTrend({
    mode,
    year: req.query.year,
  });
  return res.json(new ApiResponse(200, data, 'Sales trend fetched'));
});

export const getStockValuation = asyncHandler(async (req, res) => {
  const data = await reportService.getStockValuation();
  return res.json(new ApiResponse(200, data, 'Stock valuation fetched'));
});
