/**
 * Stable idempotency key for an offline-queued write. Generated once when the
 * op is created and reused on every sync retry, so a write whose response was
 * lost is recognized by the server and applied at most once. The `prefix` is
 * cosmetic (the server only needs uniqueness).
 */
export function createClientRequestId(prefix = 'req') {
  const a = Math.random().toString(36).slice(2, 10);
  const b = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${a}${b}`;
}
