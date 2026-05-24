import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import * as authService from './auth.service.js';

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  return res.json(new ApiResponse(200, result, 'Login successful'));
});

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  return res.json(new ApiResponse(201, result, 'User registered'));
});
