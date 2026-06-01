/** Parse ISO range from client (local day/month/year boundaries). */
export function createdAtRange(from, to) {
  if (!from && !to) return undefined;
  const createdAt = {};
  if (from) createdAt.gte = new Date(from);
  if (to) createdAt.lte = new Date(to);
  return createdAt;
}
