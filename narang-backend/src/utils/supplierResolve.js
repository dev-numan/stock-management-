import { ApiError } from './ApiError.js';

/** Find or create supplier party inside a Prisma transaction. */
export async function resolveSupplierId(tx, { supplierId, supplierName }) {
  if (supplierId) {
    const party = await tx.party.findUnique({ where: { id: supplierId } });
    if (!party) throw new ApiError(404, 'Supplier not found');
    if (party.partyType !== 'SUPPLIER') {
      throw new ApiError(400, 'Party must be a supplier. Move to supplier list first.');
    }
    return supplierId;
  }

  const name = supplierName?.trim();
  if (!name) return null;

  const existing = await tx.party.findFirst({
    where: {
      partyType: 'SUPPLIER',
      name: { equals: name, mode: 'insensitive' },
    },
  });
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
