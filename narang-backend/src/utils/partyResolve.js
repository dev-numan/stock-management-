import { ApiError } from './ApiError.js';

export function normalizePhone(phone) {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '');
}

/**
 * Find an existing party by normalized phone (any list), then exact name (any list).
 */
export async function findPartyByIdentity(tx, { phone, name }) {
  const phoneKey = normalizePhone(phone);
  if (phoneKey) {
    const withPhone = await tx.party.findMany({
      where: { phone: { not: null } },
    });
    const byPhone = withPhone.find((p) => normalizePhone(p.phone) === phoneKey);
    if (byPhone) return byPhone;
  }

  const trimmedName = name?.trim();
  if (trimmedName) {
    const byName = await tx.party.findFirst({
      where: { name: { equals: trimmedName, mode: 'insensitive' } },
    });
    if (byName) return byName;
  }

  return null;
}

/**
 * Return existing party if phone/name matches; otherwise create once with partyType.
 * Never changes partyType on an existing row.
 */
export async function resolveOrCreateParty(
  tx,
  { name, phone, address, partyType = 'CUSTOMER' }
) {
  const trimmedName = name?.trim();
  if (!trimmedName) {
    throw new ApiError(400, 'Name is required');
  }

  const existing = await findPartyByIdentity(tx, { phone, name: trimmedName });
  if (existing) return existing;

  const type = partyType === 'SUPPLIER' ? 'SUPPLIER' : 'CUSTOMER';
  return tx.party.create({
    data: {
      name: trimmedName,
      phone: phone?.trim() || null,
      address: address?.trim() || null,
      partyType: type,
    },
  });
}
