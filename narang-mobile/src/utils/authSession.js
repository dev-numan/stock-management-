import { clearAuth } from './storage';

let onSessionExpired = null;

/** Register handler (AuthProvider) to clear in-memory user when API returns 401. */
export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler;
}

export async function handleSessionExpired() {
  await clearAuth();
  onSessionExpired?.();
}
