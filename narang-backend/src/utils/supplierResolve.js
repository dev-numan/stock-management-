import { ApiError } from './ApiError.js';

/** Find or create supplier party inside a Prisma transaction. */
export async function resolveSupplierId(tx, { supplierId, supplierName }) {
  if (supplierId) {
    const party = await tx.party.findUnique({ where: { id: supplierId } });
    if (!party) throw new ApiError(404, 'Supplier not found');
    return supplierId;
  }

  const name = supplierName?.trim();
  if (!name) return null;

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
