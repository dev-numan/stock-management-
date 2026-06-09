import { ApiError } from './ApiError.js';
import { findPartyByIdentity } from './partyResolve.js';

/** Find or create party for a supplier link inside a Prisma transaction. */
export async function resolveSupplierId(tx, { supplierId, supplierName, supplierPhone }) {
  if (supplierId) {
    const party = await tx.party.findUnique({ where: { id: supplierId } });
    if (!party) throw new ApiError(404, 'Supplier not found');
    return supplierId;
  }

  const name = supplierName?.trim();
  if (!name) return null;

  const existing = await findPartyByIdentity(tx, { phone: supplierPhone, name });
  if (existing) return existing.id;

  const created = await tx.party.create({
    data: { name, partyType: 'SUPPLIER' },
  });
  return created.id;
}

export function mapPurchaseWithSupplier(purchase) {
  if (!purchase) return purchase;
  const { party, partyId, ...rest } = purchase;
  return {
    ...rest,
    supplierId: partyId,
    supplier: party,
    party,
    partyId,
  };
}
