import { formatDate } from './formatDate';
import { getT } from '../stores/languageStore';

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
  const t = getT();
  if (days < 0) return t('expiry.expired', { date: formatDate(expiryDate) });
  if (days === 0) return t('expiry.today');
  if (days === 1) return t('expiry.tomorrow');
  if (days <= 60) return t('expiry.inDays', { days });
  return t('expiry.onDate', { date: formatDate(expiryDate) });
}

export function expiryTone(expiryDate) {
  const days = daysUntilExpiry(expiryDate);
  if (days === null) return 'default';
  if (days < 0) return 'error';
  if (days <= 30) return 'warning';
  return 'default';
}
