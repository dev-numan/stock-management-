import { Prisma } from '@prisma/client';
import { db, TRANSACTION_OPTS } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';

const decimal = (v) => new Prisma.Decimal(v);

export const getAllPurchases = async ({ from, to }) => {
  const where = {};

  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

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
  const { items, supplierId, notes } = purchaseData;

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

    const purchase = await tx.purchase.create({
      data: {
        supplierId: supplierId || null,
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
