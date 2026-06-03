import { db } from '../../config/db.js';
import { clampExpiryAlertMonths } from '../../utils/parseExpiryDate.js';
import { getStockDeduction } from '../../utils/productUnits.js';
import { createdAtRange } from '../../utils/dateRange.js';

const toNumber = (d) => Number(d ?? 0);

const dateRange = (from, to) => createdAtRange(from, to);

const todayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { gte: start, lte: end };
};

function expiryCutoffDate(months) {
  const cutoff = new Date();
  cutoff.setHours(23, 59, 59, 999);
  cutoff.setMonth(cutoff.getMonth() + clampExpiryAlertMonths(months));
  return cutoff;
}

export const getDashboard = async () => {
  const today = todayRange();
  const settings = await db.settings.findUnique({ where: { id: 1 } });
  const showLowStockAlert = settings?.showLowStockAlert ?? true;
  const showExpiryAlert = settings?.showExpiryAlert ?? true;
  const expiryAlertMonths = clampExpiryAlertMonths(settings?.expiryAlertMonths ?? 3);

  const [todaySales, todaySalesDetailed, products, recentSales, lowStockProducts, lowStockCountRow, expiringProducts, expiringCount] =
    await Promise.all([
      db.sale.aggregate({
        where: { createdAt: today },
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
      db.sale.findMany({
        where: { createdAt: today },
        include: { items: { include: { product: true } } },
      }),
      db.product.count(),
      db.sale.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          items: {
            take: 3,
            include: { product: { select: { id: true, name: true, unit: true } } },
          },
        },
      }),
      showLowStockAlert
        ? db.$queryRaw`
            SELECT id, name, "currentStock", "minStockAlert", unit
            FROM "Product"
            WHERE "currentStock" <= "minStockAlert"
            ORDER BY "currentStock" ASC
            LIMIT 10
          `
        : Promise.resolve([]),
      db.$queryRaw`
        SELECT COUNT(*)::int AS count
        FROM "Product"
        WHERE "currentStock" <= "minStockAlert"
      `,
      showExpiryAlert
        ? db.product.findMany({
            where: {
              expiryDate: { not: null, lte: expiryCutoffDate(expiryAlertMonths) },
            },
            select: { id: true, name: true, expiryDate: true, unit: true, currentStock: true },
            orderBy: { expiryDate: 'asc' },
            take: 10,
          })
        : Promise.resolve([]),
      showExpiryAlert
        ? db.product.count({
            where: {
              expiryDate: { not: null, lte: expiryCutoffDate(expiryAlertMonths) },
            },
          })
        : Promise.resolve(0),
    ]);

  const todayGrossProfit = todaySalesDetailed.reduce((sum, sale) => {
    const cogs = sale.items.reduce((itemSum, item) => {
      const product = item.product;
      const soldUnit = item.soldUnit || product.unit;
      const deduction = getStockDeduction(product, soldUnit, Number(item.quantity));
      return itemSum + toNumber(product.costPrice) * deduction;
    }, 0);
    return sum + toNumber(sale.totalAmount) - cogs;
  }, 0);

  return {
    todaySalesTotal: toNumber(todaySales._sum.totalAmount),
    todaySalesCount: todaySales._count._all ?? 0,
    todayGrossProfit,
    totalProducts: products,
    lowStockCount: lowStockCountRow[0]?.count ?? 0,
    lowStockProducts: showLowStockAlert ? lowStockProducts : [],
    showLowStockAlert,
    showExpiryAlert,
    expiryAlertMonths,
    expiringCount: showExpiryAlert ? expiringCount : 0,
    expiringProducts: showExpiryAlert ? expiringProducts : [],
    recentSales,
  };
};

export const getSalesSummary = async ({ from, to }) => {
  const createdAt = dateRange(from, to);

  const sales = await db.sale.findMany({
    where: createdAt ? { createdAt } : undefined,
    include: { items: true },
  });

  const totalSales = sales.reduce((sum, s) => sum + toNumber(s.totalAmount), 0);
  const cashSales = sales
    .filter((s) => s.paymentMethod === 'CASH')
    .reduce((sum, s) => sum + toNumber(s.totalAmount), 0);
  const creditSales = sales
    .filter((s) => s.paymentMethod === 'CREDIT')
    .reduce((sum, s) => sum + toNumber(s.totalAmount), 0);

  return {
    totalSales,
    salesCount: sales.length,
    cashSales,
    creditSales,
    sales,
  };
};

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad2 = (n) => String(n).padStart(2, '0');
const formatYmd = (year, month, day) => `${year}-${pad2(month)}-${pad2(day)}`;

const emptyBucket = () => ({ revenue: 0, cogs: 0, expenses: 0 });

const itemCogs = (item) => {
  const product = item.product;
  const soldUnit = item.soldUnit || product.unit;
  const deduction = getStockDeduction(product, soldUnit, Number(item.quantity));
  return toNumber(product.costPrice) * deduction;
};

const saleCogs = (sale) => sale.items.reduce((sum, item) => sum + itemCogs(item), 0);

const bucketFromSale = (date, breakdown) => {
  const d = new Date(date);
  if (breakdown === 'year') return d.getFullYear();
  if (breakdown === 'month') return d.getMonth() + 1;
  if (breakdown === 'day') return d.getDate();
  return 0;
};

const bucketFromExpense = (date, breakdown) => bucketFromSale(date, breakdown);

const buildProfitSummary = (sales, expenses) => {
  const revenue = sales.reduce((sum, s) => sum + toNumber(s.totalAmount), 0);
  const cogs = sales.reduce((sum, s) => sum + saleCogs(s), 0);
  const expenseTotal = expenses.reduce((sum, e) => sum + toNumber(e.amount), 0);
  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - expenseTotal;
  return { revenue, cogs, grossProfit, expenses: expenseTotal, netProfit };
};

export const getProfitLoss = async ({ from, to }) => {
  const createdAt = dateRange(from, to);
  const saleWhere = createdAt ? { createdAt } : undefined;
  const expenseWhere = createdAt ? { date: createdAt } : undefined;

  const [sales, expenses] = await Promise.all([
    db.sale.findMany({
      where: saleWhere,
      include: { items: { include: { product: true } } },
    }),
    db.expense.findMany({ where: expenseWhere }),
  ]);

  return buildProfitSummary(sales, expenses);
};

/** @param {'all'|'day'|'month'|'year'} mode */
export const getProfitReport = async ({
  mode = 'month',
  year,
  month,
  day,
  from: fromQuery,
  to: toQuery,
}) => {
  const y = Number(year) || new Date().getFullYear();
  const m = Number(month) || new Date().getMonth() + 1;
  const d = Number(day) || new Date().getDate();

  let from = fromQuery;
  let to = toQuery;
  let breakdown = null;

  if (mode === 'all') {
    breakdown = 'year';
  } else {
    if (mode === 'year') breakdown = 'month';
    else if (mode === 'month') breakdown = 'day';
    else if (mode === 'day') breakdown = null;

    if (!from && !to) {
      if (mode === 'year') {
        from = `${y}-01-01`;
        to = `${y}-12-31`;
      } else if (mode === 'month') {
        from = formatYmd(y, m, 1);
        to = formatYmd(y, m, new Date(y, m, 0).getDate());
      } else if (mode === 'day') {
        from = formatYmd(y, m, d);
        to = from;
      }
    }
  }

  const createdAt = dateRange(from, to);
  const saleWhere = createdAt ? { createdAt } : undefined;
  const expenseWhere = createdAt ? { date: createdAt } : undefined;

  const [sales, expenses] = await Promise.all([
    db.sale.findMany({
      where: saleWhere,
      include: { items: { include: { product: true } } },
    }),
    db.expense.findMany({ where: expenseWhere }),
  ]);

  const summary = buildProfitSummary(sales, expenses);

  if (!breakdown) {
    return { mode, summary, breakdown: [] };
  }

  const buckets = new Map();

  const touch = (key) => {
    if (!buckets.has(key)) buckets.set(key, emptyBucket());
    return buckets.get(key);
  };

  for (const sale of sales) {
    const key = bucketFromSale(sale.createdAt, breakdown);
    const bucket = touch(key);
    bucket.revenue += toNumber(sale.totalAmount);
    for (const item of sale.items) {
      bucket.cogs += itemCogs(item);
    }
  }

  for (const expense of expenses) {
    const key = bucketFromExpense(expense.date, breakdown);
    const bucket = touch(key);
    bucket.expenses += toNumber(expense.amount);
  }

  const formatLabel = (key) => {
    if (breakdown === 'year') return String(key);
    if (breakdown === 'month') return MONTH_LABELS[key - 1] ?? String(key);
    return String(key);
  };

  let keys;
  if (breakdown === 'day') {
    const days = new Date(y, m, 0).getDate();
    keys = Array.from({ length: days }, (_, i) => i + 1);
  } else if (breakdown === 'month') {
    keys = Array.from({ length: 12 }, (_, i) => i + 1);
  } else {
    keys = [...buckets.keys()].sort((a, b) => a - b);
  }

  const breakdownRows = keys.map((key) => {
    const bucket = buckets.get(key) ?? emptyBucket();
    const grossProfit = bucket.revenue - bucket.cogs;
    const netProfit = grossProfit - bucket.expenses;
    return {
      key,
      label: formatLabel(key),
      revenue: bucket.revenue,
      cogs: bucket.cogs,
      grossProfit,
      expenses: bucket.expenses,
      netProfit,
    };
  });

  return { mode, summary, breakdown: breakdownRows };
};

export const getSalesTrend = async ({ mode = 'month', year, from: fromQuery, to: toQuery }) => {
  const y = Number(year) || new Date().getFullYear();
  const breakdown = mode === 'year' ? 'year' : 'month';

  let from = fromQuery;
  let to = toQuery;
  let labels;
  let keys;

  if (mode === 'year') {
    const startYear = y - 4;
    if (!from) from = `${startYear}-01-01`;
    if (!to) to = `${y}-12-31`;
    keys = [];
    for (let yr = startYear; yr <= y; yr += 1) keys.push(yr);
    labels = keys.map(String);
  } else {
    if (!from) from = `${y}-01-01`;
    if (!to) to = `${y}-12-31`;
    labels = [...MONTH_LABELS];
    keys = Array.from({ length: 12 }, (_, i) => i + 1);
  }

  const createdAt = dateRange(from, to);
  const expenseDate = dateRange(from, to);

  const [sales, expenses] = await Promise.all([
    db.sale.findMany({
      where: { createdAt },
      include: { items: { include: { product: true } } },
    }),
    db.expense.findMany({ where: { date: expenseDate } }),
  ]);

  const buckets = new Map();
  const touch = (key) => {
    if (!buckets.has(key)) buckets.set(key, emptyBucket());
    return buckets.get(key);
  };

  for (const sale of sales) {
    const key = bucketFromSale(sale.createdAt, breakdown);
    const bucket = touch(key);
    bucket.revenue += toNumber(sale.totalAmount);
    for (const item of sale.items) {
      bucket.cogs += itemCogs(item);
    }
  }

  for (const expense of expenses) {
    const key = bucketFromExpense(expense.date, breakdown);
    touch(key).expenses += toNumber(expense.amount);
  }

  const values = keys.map((key) => (buckets.get(key) ?? emptyBucket()).revenue);
  const grossProfitValues = keys.map((key) => {
    const b = buckets.get(key) ?? emptyBucket();
    return b.revenue - b.cogs;
  });
  const profitValues = keys.map((key) => {
    const b = buckets.get(key) ?? emptyBucket();
    return b.revenue - b.cogs - b.expenses;
  });

  const total = values.reduce((sum, v) => sum + v, 0);
  const grossProfitTotal = grossProfitValues.reduce((sum, v) => sum + v, 0);
  const profitTotal = profitValues.reduce((sum, v) => sum + v, 0);

  return {
    mode: mode === 'year' ? 'year' : 'month',
    year: y,
    labels,
    values,
    total,
    /** Gross margin from sales (revenue − COGS); used for dashboard chart. */
    profitValues: grossProfitValues,
    profitTotal: grossProfitTotal,
    netProfitValues: profitValues,
    netProfitTotal: profitTotal,
  };
};

export const getStockValuation = async () => {
  const products = await db.product.findMany();

  const items = products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    currentStock: toNumber(p.currentStock),
    costPrice: toNumber(p.costPrice),
    salePrice: toNumber(p.salePrice),
    costValue: toNumber(p.currentStock) * toNumber(p.costPrice),
    saleValue: toNumber(p.currentStock) * toNumber(p.salePrice),
  }));

  const totalCostValue = items.reduce((sum, i) => sum + i.costValue, 0);
  const totalSaleValue = items.reduce((sum, i) => sum + i.saleValue, 0);

  return {
    products: items,
    totalCostValue,
    totalSaleValue,
  };
};
