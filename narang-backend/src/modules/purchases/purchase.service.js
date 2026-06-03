import { Prisma } from '@prisma/client';
import { db, TRANSACTION_OPTS } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { resolveSupplierId } from '../../utils/supplierResolve.js';
import { createdAtRange } from '../../utils/dateRange.js';

const decimal = (v) => new Prisma.Decimal(v);

export const getAllPurchases = async ({ from, to, supplierId }) => {
  const where = {};

  if (supplierId) {
    where.supplierId = supplierId;
  }

  const range = createdAtRange(from, to);
  if (range) where.createdAt = range;

  return db.purchase.findMany({
    where,
    include: {
      supplier: true,
      items: { include: { product: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const getPurchaseById = async (id) => {
  const purchase = await db.purchase.findUnique({
    where: { id },
    include: {
      supplier: true,
      items: { include: { product: true } },
    },
  });
  if (!purchase) throw new ApiError(404, 'Purchase not found');
  return purchase;
};

export const createPurchase = async (purchaseData) => {
  const { items, supplierId, supplierName, notes } = purchaseData;

  if (!items?.length) {
    throw new ApiError(400, 'Purchase must have at least one item');
  }

  const productIds = [...new Set(items.map((i) => i.productId))];

  return db.$transaction(async (tx) => {
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

    const resolvedSupplierId = await resolveSupplierId(tx, { supplierId, supplierName });

    const purchase = await tx.purchase.create({
      data: {
        supplierId: resolvedSupplierId,
        totalAmount,
        notes: notes || null,
        items: { create: purchaseItemsData },
      },
      include: {
        supplier: true,
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

    return purchase;
  }, TRANSACTION_OPTS);
};

export const deletePurchase = async (id) => {
  return db.$transaction(async (tx) => {
    const purchase = await tx.purchase.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!purchase) throw new ApiError(404, 'Purchase not found');

    await Promise.all(
      purchase.items.map((item) =>
        tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { decrement: item.quantity } },
        })
      )
    );

    await tx.purchase.delete({ where: { id } });
    return { id, supplierId: purchase.supplierId };
  }, TRANSACTION_OPTS);
};
