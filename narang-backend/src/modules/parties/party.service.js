import { Prisma } from '@prisma/client';
import { db, TRANSACTION_OPTS } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { createdAtRange } from '../../utils/dateRange.js';
import { resolveOrCreateParty } from '../../utils/partyResolve.js';

const toNum = (v) => Number(v ?? 0);

function partyWhere(type, search) {
  const where = {};
  if (type === 'CUSTOMER' || type === 'SUPPLIER') {
    where.partyType = type;
  }
  if (search?.trim()) {
    where.OR = [
      { name: { contains: search.trim(), mode: 'insensitive' } },
      { phone: { contains: search.trim(), mode: 'insensitive' } },
    ];
  }
  return where;
}

async function getPartySupplierTotals(partyId) {
  const [purchaseAgg, paymentAgg] = await Promise.all([
    db.purchase.aggregate({
      where: { partyId },
      _sum: { totalAmount: true },
    }),
    db.partyPayment.aggregate({
      where: { partyId },
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

function mapGroupTotals(groups, idField, sumField) {
  const map = new Map();
  for (const g of groups) {
    const id = g[idField];
    if (id) map.set(id, toNum(g._sum[sumField]));
  }
  return map;
}

export function enrichParty(party, supplierTotals = null) {
  const totals = supplierTotals ?? {
    totalPurchases: 0,
    totalPayments: 0,
    payableBalance: 0,
  };
  return {
    ...party,
    ...totals,
    advanceBalance: toNum(party.advanceBalance),
  };
}

export const getAllParties = async ({ type, search }) => {
  const parties = await db.party.findMany({
    where: partyWhere(type, search),
    orderBy: { name: 'asc' },
  });

  if (parties.length === 0) return [];

  const ids = parties.map((p) => p.id);
  const [purchaseGroups, paymentGroups] = await Promise.all([
    db.purchase.groupBy({
      by: ['partyId'],
      where: { partyId: { in: ids } },
      _sum: { totalAmount: true },
    }),
    db.partyPayment.groupBy({
      by: ['partyId'],
      where: { partyId: { in: ids } },
      _sum: { amount: true },
    }),
  ]);

  const purchaseMap = mapGroupTotals(purchaseGroups, 'partyId', 'totalAmount');
  const paymentMap = mapGroupTotals(paymentGroups, 'partyId', 'amount');

  return parties.map((p) =>
    enrichParty(p, {
      totalPurchases: purchaseMap.get(p.id) ?? 0,
      totalPayments: paymentMap.get(p.id) ?? 0,
      payableBalance: (purchaseMap.get(p.id) ?? 0) - (paymentMap.get(p.id) ?? 0),
    })
  );
};

export const getPartyById = async (id) => {
  const party = await db.party.findUnique({ where: { id } });
  if (!party) throw new ApiError(404, 'Party not found');
  const totals = await getPartySupplierTotals(id);
  return enrichParty(party, totals);
};

export const createParty = async (data) =>
  resolveOrCreateParty(db, {
    name: data.name,
    phone: data.phone,
    address: data.address,
    partyType: data.partyType,
  });

export const updateParty = async (id, data) => {
  await getPartyById(id);
  return db.party.update({
    where: { id },
    data: {
      name: data.name,
      phone: data.phone ?? null,
      address: data.address ?? null,
    },
  });
};

export const convertPartyType = async (id, partyType) => {
  if (partyType !== 'CUSTOMER' && partyType !== 'SUPPLIER') {
    throw new ApiError(400, 'partyType must be CUSTOMER or SUPPLIER');
  }
  await getPartyById(id);
  const updated = await db.party.update({
    where: { id },
    data: { partyType },
  });
  const totals = await getPartySupplierTotals(id);
  return enrichParty(updated, totals);
};

export const deleteParty = async (id) => {
  const blockers = await getPartyDeletionBlockers(id);
  if (!blockers.canDelete) {
    throw new ApiError(409, 'Party is linked to existing records', {
      code: 'PARTY_IN_USE',
      ...blockers,
    });
  }
  await db.party.delete({ where: { id } });
  return { id };
};

export const getPartyDeletionBlockers = async (id) => {
  await getPartyById(id);

  const [sales, products, purchases] = await Promise.all([
    db.sale.findMany({
      where: { partyId: id },
      select: { id: true, invoiceNumber: true, createdAt: true, totalAmount: true },
      orderBy: { createdAt: 'desc' },
    }),
    db.product.findMany({
      where: { partyId: id },
      select: { id: true, name: true, currentStock: true },
      orderBy: { name: 'asc' },
    }),
    db.purchase.findMany({
      where: { partyId: id },
      select: { id: true, totalAmount: true, createdAt: true, notes: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    canDelete: sales.length === 0 && products.length === 0 && purchases.length === 0,
    sales,
    products,
    purchases,
  };
};

export const getPartyAdvanceEntries = async (partyId) => {
  await getPartyById(partyId);
  return db.partyAdvanceEntry.findMany({
    where: { partyId },
    include: { sale: { select: { id: true, invoiceNumber: true } } },
    orderBy: { createdAt: 'desc' },
  });
};

export const deletePartyAdvanceEntry = async (partyId, entryId) => {
  return db.$transaction(async (tx) => {
    const entry = await tx.partyAdvanceEntry.findFirst({
      where: { id: entryId, partyId },
    });
    if (!entry) throw new ApiError(404, 'Payment entry not found');
    if (entry.saleId) {
      throw new ApiError(
        400,
        'This payment is linked to a sale. Delete the sale from Sales History first.'
      );
    }

    await tx.partyAdvanceEntry.delete({ where: { id: entryId } });
    return tx.party.update({
      where: { id: partyId },
      data: { advanceBalance: { decrement: entry.amount } },
    });
  }, TRANSACTION_OPTS);
};

export const addPartyAdvance = async (partyId, { amount, notes }) => {
  const value = new Prisma.Decimal(amount);
  if (value.lte(0)) throw new ApiError(400, 'Amount must be greater than zero');

  return db.$transaction(async (tx) => {
    const party = await tx.party.findUnique({ where: { id: partyId } });
    if (!party) throw new ApiError(404, 'Party not found');

    await tx.partyAdvanceEntry.create({
      data: {
        partyId,
        amount: value,
        notes: notes?.trim() || null,
      },
    });

    return tx.party.update({
      where: { id: partyId },
      data: { advanceBalance: { increment: value } },
    });
  }, TRANSACTION_OPTS);
};

export const addPartyCreditCharge = async (partyId, { amount, notes }) => {
  const value = new Prisma.Decimal(amount);
  if (value.lte(0)) throw new ApiError(400, 'Amount must be greater than zero');

  return db.$transaction(async (tx) => {
    const party = await tx.party.findUnique({ where: { id: partyId } });
    if (!party) throw new ApiError(404, 'Party not found');

    await tx.partyAdvanceEntry.create({
      data: {
        partyId,
        amount: value.neg(),
        notes: notes?.trim() || null,
      },
    });

    return tx.party.update({
      where: { id: partyId },
      data: { advanceBalance: { decrement: value } },
    });
  }, TRANSACTION_OPTS);
};

export async function getPartySupplierLedger(partyId, { from, to, search } = {}) {
  await getPartyById(partyId);
  const dateFilter = createdAtRange(from, to);

  const [purchases, payments] = await Promise.all([
    db.purchase.findMany({
      where: {
        partyId,
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    db.partyPayment.findMany({
      where: {
        partyId,
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
        (e.notes && e.notes.toLowerCase().includes(q)) || String(e.amount).includes(q)
    );
  }

  return filtered.reverse();
}

export const addPartyPayment = async (partyId, { amount, notes }) => {
  const value = new Prisma.Decimal(amount);
  if (value.lte(0)) throw new ApiError(400, 'Amount must be greater than zero');

  return db.$transaction(async (tx) => {
    const party = await tx.party.findUnique({ where: { id: partyId } });
    if (!party) throw new ApiError(404, 'Party not found');

    const payment = await tx.partyPayment.create({
      data: {
        partyId,
        amount: value,
        notes: notes?.trim() || null,
      },
    });

    const { payableBalance } = await getPartySupplierTotals(partyId);
    return { payment, payableBalance };
  }, TRANSACTION_OPTS);
};

export const addPartyPurchase = async (partyId, { amount, notes }) => {
  const value = new Prisma.Decimal(amount);
  if (value.lte(0)) throw new ApiError(400, 'Amount must be greater than zero');

  return db.$transaction(async (tx) => {
    const party = await tx.party.findUnique({ where: { id: partyId } });
    if (!party) throw new ApiError(404, 'Party not found');

    const purchase = await tx.purchase.create({
      data: {
        partyId,
        totalAmount: value,
        notes: notes?.trim() || null,
      },
    });

    const { payableBalance } = await getPartySupplierTotals(partyId);
    return { purchase, payableBalance };
  }, TRANSACTION_OPTS);
};

export const deletePartyPayment = async (partyId, paymentId) => {
  return db.$transaction(async (tx) => {
    const payment = await tx.partyPayment.findFirst({
      where: { id: paymentId, partyId },
    });
    if (!payment) throw new ApiError(404, 'Payment not found');

    await tx.partyPayment.delete({ where: { id: paymentId } });
    const { payableBalance } = await getPartySupplierTotals(partyId);
    return { id: paymentId, payableBalance };
  }, TRANSACTION_OPTS);
};

export function asCustomer(party) {
  if (!party) return null;
  const { partyType, ...rest } = party;
  return rest;
}

export function mapSaleWithCustomer(sale) {
  if (!sale) return sale;
  const { party, partyId, ...rest } = sale;
  return {
    ...rest,
    customerId: partyId,
    customer: asCustomer(party),
    party,
    partyId,
  };
}
