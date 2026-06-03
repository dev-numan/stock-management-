const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** ISO instant from mobile, or legacy yyyy-MM-dd (UTC calendar day). */
function parseBound(value, edge) {
  const str = String(value).trim();
  if (DATE_ONLY.test(str)) {
    const d = new Date(`${str}T00:00:00.000Z`);
    if (edge === 'end') d.setUTCHours(23, 59, 59, 999);
    return d;
  }
  return new Date(str);
}

/** Parse range from client (prefer full ISO = device-local period bounds). */
export function createdAtRange(from, to) {
  if (!from && !to) return undefined;
  const createdAt = {};
  if (from) createdAt.gte = parseBound(from, 'start');
  if (to) createdAt.lte = parseBound(to, 'end');
  return createdAt;
}
