import { Prisma } from '@prisma/client';
import { db, TRANSACTION_OPTS } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { resolveSupplierId, mapPurchaseWithSupplier } from '../../utils/supplierResolve.js';
import { createdAtRange } from '../../utils/dateRange.js';
import { runIdempotent } from '../../utils/idempotency.js';

const decimal = (v) => new Prisma.Decimal(v);

export const getAllPurchases = async ({ from, to, supplierId, partyId }) => {
  const where = {};
  const pid = partyId || supplierId;
  if (pid) where.partyId = pid;

  const range = createdAtRange(from, to);
  if (range) where.createdAt = range;

  const purchases = await db.purchase.findMany({
    where,
    include: {
      party: true,
      items: { include: { product: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return purchases.map(mapPurchaseWithSupplier);
};

export const getPurchaseById = async (id) => {
  const purchase = await db.purchase.findUnique({
    where: { id },
    include: {
      party: true,
      items: { include: { product: true } },
    },
  });
  if (!purchase) throw new ApiError(404, 'Purchase not found');
  return mapPurchaseWithSupplier(purchase);
};

export const createPurchase = async (purchaseData) => {
  const { items, supplierId, partyId, supplierName, notes, clientRequestId } = purchaseData;

  if (!items?.length) {
    throw new ApiError(400, 'Purchase must have at least one item');
  }

  const productIds = [...new Set(items.map((i) => i.productId))];

  return runIdempotent(db, clientRequestId, async (tx) => {
    const products = await tx.product.findMany({ where: { id: { in: productIds } } });
    const productMap = new Map(products.map((p) => [p.id, p]));

    let totalAmount = decimal(0);
    const purchaseItemsData = [];

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new ApiError(404, `Product not found: ${item.productId}`);
      }

      const costPrice = decimal(item.costPrice ?? product.costPrice);
      const qty = decimal(item.quantity);
      const lineTotal = costPrice.mul(qty);
      totalAmount = totalAmount.add(lineTotal);

      purchaseItemsData.push({
        productId: item.productId,
        quantity: qty,
        costPrice,
      });
    }

    const resolvedPartyId = await resolveSupplierId(tx, {
      supplierId: partyId || supplierId,
      supplierName,
    });

    const purchase = await tx.purchase.create({
      data: {
        partyId: resolvedPartyId,
        totalAmount,
        notes: notes || null,
        items: { create: purchaseItemsData },
      },
      include: {
        party: true,
        items: { include: { product: true } },
      },
    });

    await Promise.all(
      items.map((item) => {
        const product = productMap.get(item.productId);
        return tx.product.update({
          where: { id: item.productId },
          data: {
            currentStock: { increment: decimal(item.quantity) },
            ...(item.costPrice !== undefined && {
              costPrice: decimal(item.costPrice),
            }),
          },
        });
      })
    );

    return mapPurchaseWithSupplier(purchase);
  }, () => ({ duplicate: true }), TRANSACTION_OPTS);
};

export const deletePurchase = async (id) => {
  return db.$transaction(async (tx) => {
    const purchase = await tx.purchase.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!purchase) return { id, alreadyDeleted: true };

    // Reversing a purchase removes the stock it added. Guard in the WHERE clause
    // so we never drive stock negative when some of it was already sold — a
    // zero-row match means the reversal isn't possible.
    for (const item of purchase.items) {
      const { count } = await tx.product.updateMany({
        where: { id: item.productId, currentStock: { gte: item.quantity } },
        data: { currentStock: { decrement: item.quantity } },
      });
      if (count === 0) {
        throw new ApiError(
          400,
          'Cannot delete this purchase: some of its stock has already been sold.'
        );
      }
    }

    await tx.purchase.delete({ where: { id } });
    return { id, supplierId: purchase.partyId, partyId: purchase.partyId };
  }, TRANSACTION_OPTS);
};
