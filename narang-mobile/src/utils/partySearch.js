import { normalizePhone } from './phone';

export function getPartyIdFromRow(row) {
  if (row?.rawParty?.id) return row.rawParty.id;
  if (row?.raw?.id) return row.raw.id;
  if (typeof row?.id === 'string' && row.id.startsWith('app-')) return row.id.slice(4);
  if (row?.id && row.source !== 'contact') return row.id;
  return null;
}

/** Match list/picker rows by name, address, phone digits, or party id. */
export function matchesPartySearch(row, query) {
  const q = query.trim();
  if (!q) return true;

  const qLower = q.toLowerCase();
  const qDigits = q.replace(/\D/g, '');

  if (row.name?.toLowerCase().includes(qLower)) return true;
  if (row.address?.toLowerCase().includes(qLower)) return true;
  if (row.phone?.toLowerCase().includes(qLower)) return true;

  const phoneNorm = normalizePhone(row.phone);
  if (qDigits.length >= 3 && phoneNorm) {
    const needle = qDigits.length >= 10 ? qDigits.slice(-10) : qDigits;
    if (phoneNorm.includes(needle)) return true;
  }

  const partyId = getPartyIdFromRow(row);
  if (partyId && partyId.toLowerCase().includes(qLower)) return true;

  return false;
}

export function findExistingPartyByPhone(parties, phone) {
  const key = normalizePhone(phone);
  if (!key) return null;
  return parties.find((p) => normalizePhone(p.phone) === key) ?? null;
}

export function findExistingPartyById(parties, id) {
  const q = String(id || '').trim().toLowerCase();
  if (!q) return null;
  return parties.find((p) => p.id.toLowerCase() === q) ?? null;
}

/** Block duplicate create when phone or full party id already exists. */
export function findDuplicateParty(parties, { phone, partyId, excludeId } = {}) {
  if (partyId) {
    const byId = findExistingPartyById(parties, partyId);
    if (byId && byId.id !== excludeId) return byId;
  }
  if (phone) {
    const byPhone = findExistingPartyByPhone(parties, phone);
    if (byPhone && byPhone.id !== excludeId) return byPhone;
  }
  return null;
}
