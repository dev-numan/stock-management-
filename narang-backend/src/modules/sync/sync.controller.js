import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import * as syncService from './sync.service.js';

export const getBootstrap = asyncHandler(async (req, res) => {
  // Profit/report data is ADMIN-only (see report.routes.js) — don't leak it to
  // CASHIER devices via the offline bootstrap.
  const payload = await syncService.getBootstrapPayload({
    isAdmin: req.user?.role === 'ADMIN',
  });
  return res.json(new ApiResponse(200, payload, 'Offline bootstrap fetched'));
});
