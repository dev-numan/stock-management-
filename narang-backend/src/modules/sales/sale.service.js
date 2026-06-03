import { Prisma } from '@prisma/client';
import { db, TRANSACTION_OPTS } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { generateInvoiceNumber } from '../../utils/invoiceNumber.js';
import { createdAtRange } from '../../utils/dateRange.js';
import {
  getStockDeduction,
  getUnitPrice,
  resolveSoldUnit,
} from '../../utils/productUnits.js';

const decimal = (v) => new Prisma.Decimal(v);
/** Round a Decimal money value to 2 places (half-up), matching the mobile client. */
const round2 = (v) => decimal(v).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

export const getAllSales = async ({ from, to, customerId, paymentMethod }) => {
  const where = {};

  const range = createdAtRange(from, to);
  if (range) where.createdAt = range;
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

const saleInclude = {
  customer: true,
  items: { include: { product: true } },
  createdBy: { select: { id: true, name: true, email: true } },
};

export const createSale = async (saleData, userId) => {
  const {
    items,
    customerId,
    discount = 0,
    paymentMethod = 'CASH',
    notes,
    clientRequestId: rawClientRequestId,
  } = saleData;

  if (!items?.length) {
    throw new ApiError(400, 'Sale must have at least one item');
  }

  if (paymentMethod === 'CREDIT' && !customerId) {
    throw new ApiError(400, 'Customer is required for credit sales');
  }

  const clientRequestId = rawClientRequestId?.trim() || null;

  if (clientRequestId) {
    const existing = await db.sale.findUnique({
      where: { clientRequestId },
      include: saleInclude,
    });
    if (existing) return existing;
  }

  const productIds = [...new Set(items.map((i) => i.productId))];

  try {
    return await db.$transaction(async (tx) => {
    if (clientRequestId) {
      const race = await tx.sale.findUnique({
        where: { clientRequestId },
        include: saleInclude,
      });
      if (race) return race;
    }
    const [invoiceNumber, products] = await Promise.all([
      generateInvoiceNumber(tx),
      tx.product.findMany({ where: { id: { in: productIds } } }),
    ]);

    const productMap = new Map(products.map((p) => [p.id, p]));

    let subtotal = decimal(0);
    const saleItemsData = [];
    const stockDeductions = new Map();

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new ApiError(404, `Product not found: ${item.productId}`);
      }

      const soldUnit = resolveSoldUnit(product, item.soldUnit);
      if (!soldUnit) {
        throw new ApiError(400, `Invalid sale unit for ${product.name}`);
      }

      const qty = decimal(item.quantity);
      const deduction = decimal(getStockDeduction(product, soldUnit, Number(item.quantity)));
      const prevDeduction = stockDeductions.get(item.productId) ?? decimal(0);
      const totalDeduction = prevDeduction.add(deduction);

      if (Number(product.currentStock) < Number(totalDeduction)) {
        throw new ApiError(400, `Insufficient stock for ${product.name}`);
      }
      stockDeductions.set(item.productId, totalDeduction);

      // Always price server-side from the product — never trust a client-sent
      // unitPrice (otherwise a tampered client could set any price).
      const unitPrice = round2(getUnitPrice(product, soldUnit));
      const lineTotal = round2(unitPrice.mul(qty));
      subtotal = subtotal.add(lineTotal);

      saleItemsData.push({
        productId: item.productId,
        soldUnit,
        quantity: qty,
        unitPrice,
        total: lineTotal,
      });
    }

    subtotal = round2(subtotal);
    const discountDec = round2(discount);
    // A discount cannot exceed the subtotal — otherwise the total goes negative
    // and a "sale" would credit the customer instead of charging them.
    if (discountDec.greaterThan(subtotal)) {
      throw new ApiError(400, 'Discount cannot be greater than the subtotal');
    }
    const totalAmount = round2(subtotal.sub(discountDec));

    const sale = await tx.sale.create({
      data: {
        clientRequestId,
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
      include: saleInclude,
    });

    // The DB decrement is atomic and the row lock serialises concurrent sales,
    // so re-checking the post-decrement value here catches an oversell race
    // (two cashiers selling the last units at once) and rolls the sale back.
    const decrementedProducts = await Promise.all(
      [...stockDeductions.entries()].map(([productId, deduction]) =>
        tx.product.update({
          where: { id: productId },
          data: { currentStock: { decrement: deduction } },
        })
      )
    );
    for (const p of decrementedProducts) {
      if (decimal(p.currentStock).lessThan(0)) {
        throw new ApiError(400, `Insufficient stock for ${p.name}`);
      }
    }

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
  } catch (err) {
    if (clientRequestId && err?.code === 'P2002') {
      const existing = await db.sale.findUnique({
        where: { clientRequestId },
        include: saleInclude,
      });
      if (existing) return existing;
    }
    throw err;
  }
};

export const deleteSale = async (id) => {
  return db.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    });
    if (!sale) throw new ApiError(404, 'Sale not found');

    const stockAdditions = new Map();

    for (const item of sale.items) {
      const product = item.product;
      if (!product) continue;
      const addition = decimal(getStockDeduction(product, item.soldUnit, Number(item.quantity)));
      const prev = stockAdditions.get(item.productId) ?? decimal(0);
      stockAdditions.set(item.productId, prev.add(addition));
    }

    await Promise.all(
      [...stockAdditions.entries()].map(([productId, addition]) =>
        tx.product.update({
          where: { id: productId },
          data: { currentStock: { increment: addition } },
        })
      )
    );

    if (sale.customerId && sale.paymentMethod === 'CREDIT') {
      await tx.customer.update({
        where: { id: sale.customerId },
        data: { advanceBalance: { increment: sale.totalAmount } },
      });
    }

    await tx.customerAdvanceEntry.deleteMany({ where: { saleId: sale.id } });
    await tx.sale.delete({ where: { id } });

    return { id, customerId: sale.customerId };
  }, TRANSACTION_OPTS);
};
