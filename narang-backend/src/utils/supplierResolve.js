import { ApiError } from './ApiError.js';

/** Find or create supplier inside a Prisma transaction. */
export async function resolveSupplierId(tx, { supplierId, supplierName }) {
  if (supplierId) {
    const supplier = await tx.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) throw new ApiError(404, 'Supplier not found');
    return supplierId;
  }

  const name = supplierName?.trim();
  if (!name) return null;

  const existing = await tx.supplier.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
  });
  if (existing) return existing.id;

  const created = await tx.supplier.create({ data: { name } });
  return created.id;
}
