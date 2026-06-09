/** Normalize phone for matching (Pakistan-friendly: last 10 digits). */
export function normalizePhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}
