import { Prisma } from '@prisma/client';
import { db, TRANSACTION_OPTS } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { generateInvoiceNumber } from '../../utils/invoiceNumber.js';

const decimal = (v) => new Prisma.Decimal(v);

export const getAllSales = async ({ from, to, customerId, paymentMethod }) => {
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
  if (customerId) where.customerId = customerId;
  if (paymentMethod) where.paymentMethod = paymentMethod;

  return db.sale.findMany({
    where,
    include: {
      customer: true,
      createdBy: { select: { id: true, name: true, email: true } },
      items: { include: { product: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const getSaleById = async (id) => {
  const sale = await db.sale.findUnique({
    where: { id },
    include: {
      customer: true,
      createdBy: { select: { id: true, name: true, email: true } },
      items: { include: { product: true } },
    },
  });
  if (!sale) throw new ApiError(404, 'Sale not found');
  return sale;
};

export const createSale = async (saleData, userId) => {
  const { items, customerId, discount = 0, paymentMethod = 'CASH', notes } = saleData;

  if (!items?.length) {
    throw new ApiError(400, 'Sale must have at least one item');
  }

  const productIds = [...new Set(items.map((i) => i.productId))];

  return db.$transaction(async (tx) => {
    const [invoiceNumber, products] = await Promise.all([
      generateInvoiceNumber(tx),
      tx.product.findMany({ where: { id: { in: productIds } } }),
    ]);

    const productMap = new Map(products.map((p) => [p.id, p]));

    let subtotal = decimal(0);
    const saleItemsData = [];

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new ApiError(404, `Product not found: ${item.productId}`);
      }
      if (Number(product.currentStock) < Number(item.quantity)) {
        throw new ApiError(400, `Insufficient stock for ${product.name}`);
      }

      const unitPrice = decimal(item.unitPrice ?? product.salePrice);
      const qty = decimal(item.quantity);
      const lineTotal = unitPrice.mul(qty);
      subtotal = subtotal.add(lineTotal);

      saleItemsData.push({
        productId: item.productId,
        quantity: qty,
        unitPrice,
        total: lineTotal,
      });
    }

    const discountDec = decimal(discount);
    const totalAmount = subtotal.sub(discountDec);

    const sale = await tx.sale.create({
      data: {
        invoiceNumber,
        customerId: customerId || null,
        subtotal,
        taxPercent: 0,
        taxAmount: 0,
        discount: discountDec,
        totalAmount,
        paymentMethod,
        notes: notes || null,
        createdById: userId,
        items: { create: saleItemsData },
      },
      include: {
        customer: true,
        items: { include: { product: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    await Promise.all(
      items.map((item) =>
        tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { decrement: decimal(item.quantity) } },
        })
      )
    );

    if (customerId && paymentMethod === 'CREDIT') {
      await tx.customerAdvanceEntry.create({
        data: {
          customerId,
          saleId: sale.id,
          amount: totalAmount.neg(),
          notes: `Credit sale ${invoiceNumber}`,
        },
      });
      await tx.customer.update({
        where: { id: customerId },
        data: { advanceBalance: { decrement: totalAmount } },
      });
      const updatedCustomer = await tx.customer.findUnique({ where: { id: customerId } });
      return { ...sale, customer: updatedCustomer };
    }

    return sale;
  }, TRANSACTION_OPTS);
};
