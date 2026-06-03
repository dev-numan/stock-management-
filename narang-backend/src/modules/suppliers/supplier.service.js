import { Prisma } from '@prisma/client';
import { db, TRANSACTION_OPTS } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { createdAtRange } from '../../utils/dateRange.js';

const toNum = (v) => Number(v ?? 0);

async function getSupplierTotals(supplierId) {
  const [purchaseAgg, paymentAgg] = await Promise.all([
    db.purchase.aggregate({
      where: { supplierId },
      _sum: { totalAmount: true },
    }),
    db.supplierPayment.aggregate({
      where: { supplierId },
      _sum: { amount: true },
    }),
  ]);
  const totalPurchases = toNum(purchaseAgg._sum.totalAmount);
  const totalPayments = toNum(paymentAgg._sum.amount);
  return {
    totalPurchases,
    totalPayments,
    payableBalance: totalPurchases - totalPayments,
  };
}

export async function computeSupplierPayable(supplierId) {
  const { payableBalance } = await getSupplierTotals(supplierId);
  return payableBalance;
}

function mapGroupTotals(groups, idField, sumField) {
  const map = new Map();
  for (const g of groups) {
    const id = g[idField];
    if (id) map.set(id, toNum(g._sum[sumField]));
  }
  return map;
}

function buildDateFilter(from, to) {
  return createdAtRange(from, to);
}

export async function getSupplierLedger(supplierId, { from, to, search } = {}) {
  await getSupplierById(supplierId);
  const dateFilter = buildDateFilter(from, to);

  const [purchases, payments] = await Promise.all([
    db.purchase.findMany({
      where: {
        supplierId,
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    db.supplierPayment.findMany({
      where: {
        supplierId,
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const entries = [];

  for (const p of purchases) {
    const productNames = (p.items || [])
      .map((i) => i.product?.name)
      .filter(Boolean)
      .join(', ');
    entries.push({
      id: p.id,
      type: 'PURCHASE',
      amount: toNum(p.totalAmount),
      notes: p.notes?.trim() || productNames || null,
      createdAt: p.createdAt,
      purchase: p,
    });
  }

  for (const pay of payments) {
    entries.push({
      id: pay.id,
      type: 'PAYMENT',
      amount: toNum(pay.amount),
      notes: pay.notes?.trim() || null,
      createdAt: pay.createdAt,
    });
  }

  entries.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  let running = 0;
  const withBalance = entries.map((e) => {
    if (e.type === 'PURCHASE') running += e.amount;
    else running -= e.amount;
    return { ...e, balanceAfter: running };
  });

  let filtered = withBalance;
  if (search?.trim()) {
    const q = search.trim().toLowerCase();
    filtered = withBalance.filter(
      (e) =>
        (e.notes && e.notes.toLowerCase().includes(q)) ||
        String(e.amount).includes(q)
    );
  }

  return filtered.reverse();
}

export const getAllSuppliers = async ({ search }) => {
  const suppliers = await db.supplier.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined,
    orderBy: { name: 'asc' },
  });

  if (suppliers.length === 0) return [];

  const ids = suppliers.map((s) => s.id);
  const [purchaseGroups, paymentGroups] = await Promise.all([
    db.purchase.groupBy({
      by: ['supplierId'],
      where: { supplierId: { in: ids } },
      _sum: { totalAmount: true },
    }),
    db.supplierPayment.groupBy({
      by: ['supplierId'],
      where: { supplierId: { in: ids } },
      _sum: { amount: true },
    }),
  ]);

  const purchaseMap = mapGroupTotals(purchaseGroups, 'supplierId', 'totalAmount');
  const paymentMap = mapGroupTotals(paymentGroups, 'supplierId', 'amount');

  return suppliers.map((s) => {
    const totalPurchases = purchaseMap.get(s.id) ?? 0;
    const totalPayments = paymentMap.get(s.id) ?? 0;
    return {
      ...s,
      totalPurchases,
      totalPayments,
      payableBalance: totalPurchases - totalPayments,
    };
  });
};

export const getSupplierById = async (id) => {
  const supplier = await db.supplier.findUnique({ where: { id } });
  if (!supplier) throw new ApiError(404, 'Supplier not found');
  const totals = await getSupplierTotals(id);
  return { ...supplier, ...totals };
};

export const createSupplier = async (data) => {
  return db.supplier.create({ data });
};

export const updateSupplier = async (id, data) => {
  const exists = await db.supplier.findUnique({ where: { id } });
  if (!exists) throw new ApiError(404, 'Supplier not found');
  return db.supplier.update({ where: { id }, data });
};

export const deleteSupplier = async (id) => {
  const exists = await db.supplier.findUnique({ where: { id } });
  if (!exists) throw new ApiError(404, 'Supplier not found');
  await db.supplier.delete({ where: { id } });
  return { id };
};

export const addSupplierPayment = async (supplierId, { amount, notes }) => {
  const value = new Prisma.Decimal(amount);
  if (value.lte(0)) {
    throw new ApiError(400, 'Amount must be greater than zero');
  }

  return db.$transaction(async (tx) => {
    const supplier = await tx.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) throw new ApiError(404, 'Supplier not found');

    const payment = await tx.supplierPayment.create({
      data: {
        supplierId,
        amount: value,
        notes: notes?.trim() || null,
      },
    });

    const payableBalance =
      toNum(
        (
          await tx.purchase.aggregate({
            where: { supplierId },
            _sum: { totalAmount: true },
          })
        )._sum.totalAmount
      ) -
      toNum(
        (
          await tx.supplierPayment.aggregate({
            where: { supplierId },
            _sum: { amount: true },
          })
        )._sum.amount
      );

    return { payment, payableBalance };
  }, TRANSACTION_OPTS);
};

/** Manual purchase on supplier ledger (no stock / line items). */
export const addSupplierPurchase = async (supplierId, { amount, notes }) => {
  const value = new Prisma.Decimal(amount);
  if (value.lte(0)) {
    throw new ApiError(400, 'Amount must be greater than zero');
  }

  return db.$transaction(async (tx) => {
    const supplier = await tx.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) throw new ApiError(404, 'Supplier not found');

    const purchase = await tx.purchase.create({
      data: {
        supplierId,
        totalAmount: value,
        notes: notes?.trim() || null,
      },
    });

    const payableBalance =
      toNum(
        (
          await tx.purchase.aggregate({
            where: { supplierId },
            _sum: { totalAmount: true },
          })
        )._sum.totalAmount
      ) -
      toNum(
        (
          await tx.supplierPayment.aggregate({
            where: { supplierId },
            _sum: { amount: true },
          })
        )._sum.amount
      );

    return { purchase, payableBalance };
  }, TRANSACTION_OPTS);
};

export const deleteSupplierPayment = async (supplierId, paymentId) => {
  return db.$transaction(async (tx) => {
    const payment = await tx.supplierPayment.findFirst({
      where: { id: paymentId, supplierId },
    });
    if (!payment) throw new ApiError(404, 'Payment not found');

    await tx.supplierPayment.delete({ where: { id: paymentId } });

    const payableBalance =
      toNum(
        (
          await tx.purchase.aggregate({
            where: { supplierId },
            _sum: { totalAmount: true },
          })
        )._sum.totalAmount
      ) -
      toNum(
        (
          await tx.supplierPayment.aggregate({
            where: { supplierId },
            _sum: { amount: true },
          })
        )._sum.amount
      );

    return { id: paymentId, payableBalance };
  }, TRANSACTION_OPTS);
};
