import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import * as syncService from './sync.service.js';

export const getBootstrap = asyncHandler(async (_req, res) => {
  const payload = await syncService.getBootstrapPayload();
  return res.json(new ApiResponse(200, payload, 'Offline bootstrap fetched'));
});
