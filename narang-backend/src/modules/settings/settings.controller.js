import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import * as settingsService from './settings.service.js';

export const getSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.getSettings();
  return res.json(new ApiResponse(200, settings, 'Settings fetched'));
});

export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.updateSettings(req.body);
  return res.json(new ApiResponse(200, settings, 'Settings updated'));
});
