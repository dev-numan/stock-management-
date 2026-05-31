/** Stable idempotency key for createSale — reuse on retry/backup sync. */
export function createClientRequestId() {
  const a = Math.random().toString(36).slice(2, 10);
  const b = Math.random().toString(36).slice(2, 10);
  return `sale-${Date.now()}-${a}${b}`;
}
