import { ApiError } from './ApiError.js';

/** @param {string|null|undefined} value - ISO date string YYYY-MM-DD or empty */
export function parseExpiryDate(value) {
  if (value === null || value === undefined || value === '') return null;
  const d = new Date(`${String(value).trim()}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    throw new ApiError(400, 'Invalid expiry date');
  }
  return d;
}

export function clampExpiryAlertMonths(months) {
  const n = Number(months);
  if (Number.isNaN(n)) return 3;
  return Math.min(12, Math.max(1, Math.round(n)));
}
