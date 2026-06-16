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
import { mapSaleWithCustomer } from '../parties/party.service.js';

const decimal = (v) => new Prisma.Decimal(v);
const round2 = (v) => decimal(v).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

const saleInclude = {
  party: true,
  items: { include: { product: true } },
  createdBy: { select: { id: true, name: true, email: true } },
};

export const getAllSales = async ({ from, to, customerId, partyId, paymentMethod }) => {
  const where = {};
  const range = createdAtRange(from, to);
  if (range) where.createdAt = range;
  const pid = partyId || customerId;
  if (pid) where.partyId = pid;
  if (paymentMethod) where.paymentMethod = paymentMethod;

  const sales = await db.sale.findMany({
    where,
    include: saleInclude,
    orderBy: { createdAt: 'desc' },
  });
  return sales.map(mapSaleWithCustomer);
};

export const getSaleById = async (id) => {
  const sale = await db.sale.findUnique({
    where: { id },
    include: saleInclude,
  });
  if (!sale) throw new ApiError(404, 'Sale not found');
  return mapSaleWithCustomer(sale);
};

export const createSale = async (saleData, userId) => {
  const {
    items,
    customerId,
    partyId: rawPartyId,
    discount = 0,
    paymentMethod = 'CASH',
    notes,
    clientRequestId: rawClientRequestId,
  } = saleData;

  const partyId = rawPartyId || customerId || null;

  if (!items?.length) {
    throw new ApiError(400, 'Sale must have at least one item');
  }

  if (paymentMethod === 'CREDIT' && !partyId) {
    throw new ApiError(400, 'Customer is required for credit sales');
  }

  if (partyId && paymentMethod === 'CREDIT') {
    const party = await db.party.findUnique({ where: { id: partyId } });
    if (!party) throw new ApiError(404, 'Customer not found');
  }

  const clientRequestId = rawClientRequestId?.trim() || null;

  if (clientRequestId) {
    const existing = await db.sale.findUnique({
      where: { clientRequestId },
      include: saleInclude,
    });
    if (existing) return mapSaleWithCustomer(existing);
  }

  const productIds = [...new Set(items.map((i) => i.productId))];

  try {
    return await db.$transaction(async (tx) => {
      if (clientRequestId) {
        const race = await tx.sale.findUnique({
          where: { clientRequestId },
          include: saleInclude,
        });
        if (race) return mapSaleWithCustomer(race);
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
      if (discountDec.greaterThan(subtotal)) {
        throw new ApiError(400, 'Discount cannot be greater than the subtotal');
      }
      const totalAmount = round2(subtotal.sub(discountDec));

      const sale = await tx.sale.create({
        data: {
          clientRequestId,
          invoiceNumber,
          partyId: partyId || null,
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

      // Decrement atomically with a guard in the WHERE clause. This is a single
      // conditional UPDATE per product, so two concurrent sales of the same
      // item can't both pass an earlier read-time check and oversell — the
      // second sees the already-decremented stock and matches zero rows. The
      // pre-loop check above is just an early, friendly error; this is the real
      // guarantee that stock can never go negative.
      for (const [productId, deduction] of stockDeductions.entries()) {
        const { count } = await tx.product.updateMany({
          where: { id: productId, currentStock: { gte: deduction } },
          data: { currentStock: { decrement: deduction } },
        });
        if (count === 0) {
          const p = productMap.get(productId);
          throw new ApiError(400, `Insufficient stock for ${p?.name || productId}`);
        }
      }

      if (partyId && paymentMethod === 'CREDIT') {
        await tx.partyAdvanceEntry.create({
          data: {
            partyId,
            saleId: sale.id,
            amount: totalAmount.neg(),
            notes: `Credit sale ${invoiceNumber}`,
          },
        });
        await tx.party.update({
          where: { id: partyId },
          data: { advanceBalance: { decrement: totalAmount } },
        });
        const updatedParty = await tx.party.findUnique({ where: { id: partyId } });
        return mapSaleWithCustomer({ ...sale, party: updatedParty });
      }

      return mapSaleWithCustomer(sale);
    }, TRANSACTION_OPTS);
  } catch (err) {
    if (clientRequestId && err?.code === 'P2002') {
      const existing = await db.sale.findUnique({
        where: { clientRequestId },
        include: saleInclude,
      });
      if (existing) return mapSaleWithCustomer(existing);
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
    if (!sale) return { id, alreadyDeleted: true };

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

    if (sale.partyId && sale.paymentMethod === 'CREDIT') {
      await tx.party.update({
        where: { id: sale.partyId },
        data: { advanceBalance: { increment: sale.totalAmount } },
      });
    }

    await tx.partyAdvanceEntry.deleteMany({ where: { saleId: sale.id } });
    await tx.sale.delete({ where: { id } });

    return { id, customerId: sale.partyId, partyId: sale.partyId };
  }, TRANSACTION_OPTS);
};
