import { getIsOnline } from '../stores/networkStore';

/** Backend messages we intentionally show as-is */
const SAFE_SERVER_PATTERNS = [
  /^invalid email or password/i,
  /^invalid credentials/i,
  /^database unavailable/i,
  /^database is busy/i,
  /^database connection lost/i,
  /^a record with this value already exists/i,
  /^record not found/i,
  /^related record not found/i,
  /^user not found/i,
  /^token expired/i,
  /^invalid token/i,
  /^insufficient stock/i,
  /^out of stock/i,
  /already saved in the list/i,
  /with this phone/i,
];

const TECHNICAL_PATTERNS = [
  /prisma/i,
  /PrismaClient/i,
  /ECONNREFUSED/i,
  /ENOTFOUND/i,
  /ETIMEDOUT/i,
  /ECONNRESET/i,
  /network error/i,
  /internal server error/i,
  /unique constraint failed/i,
  /foreign key constraint/i,
  /invocation in/i,
  /at \/Users\//i,
  /at \/home\//i,
  /ngrok/i,
  /localhost:\d+/i,
  /cannot reach the api/i,
  /npm run dev/i,
  /npx expo/i,
  /cd narang-backend/i,
  /connection pool/i,
  /getaddrinfo/i,
  /socket hang up/i,
  /ssl/i,
  /sqlstate/i,
];

const STATUS_FALLBACKS = {
  400: 'Please check your input and try again.',
  401: 'Invalid email or password.',
  403: 'You do not have permission to do this.',
  404: 'The requested item was not found.',
  409: 'This record already exists or conflicts with another.',
  503: 'Service is temporarily unavailable. Please try again shortly.',
  500: 'Something went wrong. Please try again.',
};

export function isTechnicalMessage(message) {
  if (!message || typeof message !== 'string') return true;
  const text = message.trim();
  if (!text) return true;
  if (text.length > 200) return true;
  if (SAFE_SERVER_PATTERNS.some((p) => p.test(text))) return false;
  return TECHNICAL_PATTERNS.some((p) => p.test(text));
}

/** Sanitize text already stored in state (validation messages pass through). */
export function sanitizeDisplayMessage(message, fallback = 'Something went wrong. Please try again.') {
  if (!message) return null;
  if (typeof message !== 'string') return fallback;
  if (isTechnicalMessage(message)) return fallback;
  return message.trim();
}

function networkMessage(error) {
  if (getIsOnline() === false) {
    return 'No internet connection. Check your network and try again.';
  }
  if (error?.code === 'ECONNABORTED') {
    return 'The request took too long. Check your connection and try again.';
  }
  return 'Cannot reach the server. Check your internet connection and try again.';
}

/**
 * Map API / network errors to short, user-facing text.
 * @param {unknown} error - axios error or Error
 * @param {string} fallback - context-specific default
 */
export function getFriendlyErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;

  if (error.friendlyMessage) return error.friendlyMessage;

  if (typeof error === 'string') {
    return sanitizeDisplayMessage(error, fallback);
  }

  if (!error.response) {
    const raw = error.message;
    if (raw && !isTechnicalMessage(raw) && !/cannot reach|tunnel|ngrok|npm run/i.test(raw)) {
      return raw;
    }
    return networkMessage(error);
  }

  const status = error.response?.status;
  const serverMsg = error.response?.data?.message;

  if (serverMsg && !isTechnicalMessage(serverMsg)) {
    return String(serverMsg).trim();
  }

  if (status && STATUS_FALLBACKS[status]) {
    return STATUS_FALLBACKS[status];
  }

  if (status >= 500) return STATUS_FALLBACKS[500];

  return fallback;
}
