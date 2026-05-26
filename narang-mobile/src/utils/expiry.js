import { formatDate } from './formatDate';

/** Days from today (local midnight) to expiry date. Negative = expired. */
export function daysUntilExpiry(expiryDate) {
  if (!expiryDate) return null;
  const exp = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp - today) / 86400000);
}

export function formatExpiryLabel(expiryDate) {
  if (!expiryDate) return null;
  const days = daysUntilExpiry(expiryDate);
  if (days === null) return null;
  if (days < 0) return `Expired · ${formatDate(expiryDate)}`;
  if (days === 0) return 'Expires today';
  if (days === 1) return 'Expires tomorrow';
  if (days <= 60) return `Expires in ${days} days`;
  return `Expires ${formatDate(expiryDate)}`;
}

export function expiryTone(expiryDate) {
  const days = daysUntilExpiry(expiryDate);
  if (days === null) return 'default';
  if (days < 0) return 'error';
  if (days <= 30) return 'warning';
  return 'default';
}
