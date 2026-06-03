/** Normalize phone for matching (Pakistan-friendly: last 10 digits). */
export const normalizePhone = (phone) => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
};

export const formatPhoneDisplay = (phone) => {
  const n = normalizePhone(phone);
  if (!n) return '';
  if (n.length === 10) return `0${n}`;
  return String(phone).trim();
};

/** WhatsApp API: country code + number, no + sign (Pakistan → 92…). */
export const toWhatsAppPhone = (phone) => {
  const n = normalizePhone(phone);
  if (!n) return '';
  return `92${n}`;
};

/** E.164 without plus, e.g. 923001234567 — reliable for smsto:/sms: on Android. */
export const toInternationalPhoneDigits = (phone) => toWhatsAppPhone(phone);
