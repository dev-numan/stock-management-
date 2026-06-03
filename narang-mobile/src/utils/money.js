/**
 * Money helpers. All monetary values are in rupees with at most 2 decimals.
 * Use these wherever a price/total is computed so display, local storage, and
 * the server-side amount stay consistent (avoids floating-point drift like
 * 0.1 + 0.2 = 0.30000000000000004 or 1000 / 3 = 333.33333...).
 */

/** Coerce to a finite number, falling back to 0 for null/undefined/NaN. */
export const safeNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/** Round a monetary amount to 2 decimal places (half-up), NaN-safe. */
export const roundMoney = (value) => {
  const n = safeNumber(value);
  // + Number.EPSILON nudges values like 1.005 so they round up correctly.
  return Math.round((n + Number.EPSILON) * 100) / 100;
};

/** Sum an array to a rounded money total, ignoring non-numeric entries. */
export const sumMoney = (values) =>
  roundMoney(values.reduce((acc, v) => acc + safeNumber(v), 0));
