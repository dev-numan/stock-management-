import { Prisma } from '@prisma/client';
import { db, TRANSACTION_OPTS } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';

const toNum = (v) => Number(v ?? 0);

export async function computeSupplierPayable(supplierId) {
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
  return toNum(purchaseAgg._sum.totalAmount) - toNum(paymentAgg._sum.amount);
}

function buildDateFilter(from, to) {
  if (!from && !to) return undefined;
  const createdAt = {};
  if (from) createdAt.gte = new Date(from);
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    createdAt.lte = end;
  }
  return createdAt;
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

  const withBalance = await Promise.all(
    suppliers.map(async (s) => ({
      ...s,
      payableBalance: await computeSupplierPayable(s.id),
    }))
  );

  return withBalance;
};

export const getSupplierById = async (id) => {
  const supplier = await db.supplier.findUnique({ where: { id } });
  if (!supplier) throw new ApiError(404, 'Supplier not found');
  const payableBalance = await computeSupplierPayable(id);
  return { ...supplier, payableBalance };
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
