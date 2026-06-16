import { db } from '../../config/db.js';
import * as productService from '../products/product.service.js';
import * as partyService from '../parties/party.service.js';
import * as saleService from '../sales/sale.service.js';
import * as purchaseService from '../purchases/purchase.service.js';
import * as expenseService from '../expenses/expense.service.js';
import * as reportService from '../reports/report.service.js';
import { mapSaleWithCustomer } from '../parties/party.service.js';

const toNum = (v) => Number(v ?? 0);

function groupBy(arr, keyFn) {
  const map = {};
  for (const item of arr) {
    const key = keyFn(item);
    if (!key) continue;
    if (!map[key]) map[key] = [];
    map[key].push(item);
  }
  return map;
}

async function buildSupplierLedgersByPartyId() {
  const [purchases, payments] = await Promise.all([
    db.purchase.findMany({
      where: { partyId: { not: null } },
      include: { items: { include: { product: { select: { name: true } } } } },
      orderBy: { createdAt: 'asc' },
    }),
    db.partyPayment.findMany({
      where: { partyId: { not: null } },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const entriesByParty = {};

  const push = (partyId, entry) => {
    if (!entriesByParty[partyId]) entriesByParty[partyId] = [];
    entriesByParty[partyId].push(entry);
  };

  for (const p of purchases) {
    const productNames = (p.items || [])
      .map((i) => i.product?.name)
      .filter(Boolean)
      .join(', ');
    push(p.partyId, {
      id: p.id,
      type: 'PURCHASE',
      amount: toNum(p.totalAmount),
      notes: p.notes?.trim() || productNames || null,
      createdAt: p.createdAt,
    });
  }

  for (const pay of payments) {
    push(pay.partyId, {
      id: pay.id,
      type: 'PAYMENT',
      amount: toNum(pay.amount),
      notes: pay.notes?.trim() || null,
      createdAt: pay.createdAt,
    });
  }

  for (const partyId of Object.keys(entriesByParty)) {
    const sorted = entriesByParty[partyId].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
    let running = 0;
    const withBalance = sorted.map((e) => {
      if (e.type === 'PURCHASE') running += e.amount;
      else running -= e.amount;
      return { ...e, balanceAfter: running };
    });
    entriesByParty[partyId] = withBalance.reverse();
  }

  return entriesByParty;
}

/** One-shot payload so the mobile app can work fully offline after login. */
export const getBootstrapPayload = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  const [
    settings,
    products,
    parties,
    sales,
    purchases,
    expenses,
    dashboard,
    advanceRows,
    supplierLedgerByPartyId,
    creditSales,
    salesTrendMonth,
    salesTrendYear,
    profitMonth,
    profitYear,
    profitAll,
    salesSummaryAll,
    profitLossAll,
    stockValuation,
  ] = await Promise.all([
    db.settings.findUnique({ where: { id: 1 } }),
    productService.getAllProducts({ search: '' }),
    partyService.getAllParties({}),
    saleService.getAllSales({}),
    purchaseService.getAllPurchases({}),
    expenseService.getAllExpenses({}),
    reportService.getDashboard(),
    db.partyAdvanceEntry.findMany({
      include: { sale: { select: { id: true, invoiceNumber: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    buildSupplierLedgersByPartyId(),
    db.sale.findMany({
      where: { paymentMethod: 'CREDIT' },
      include: {
        party: { select: { id: true, name: true, phone: true, partyType: true } },
        items: { include: { product: { select: { id: true, name: true, unit: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    }).then((rows) => rows.map(mapSaleWithCustomer)),
    reportService.getSalesTrend({ mode: 'month', year, month }),
    reportService.getSalesTrend({ mode: 'year', year }),
    reportService.getProfitReport({ mode: 'month', year, month, day }),
    reportService.getProfitReport({ mode: 'year', year }),
    reportService.getProfitReport({ mode: 'all' }),
    reportService.getSalesSummary({}),
    reportService.getProfitLoss({}),
    reportService.getStockValuation(),
  ]);

  const customers = parties.filter((p) => p.partyType === 'CUSTOMER');
  const suppliers = parties.filter((p) => p.partyType === 'SUPPLIER');

  const advanceEntriesByPartyId = groupBy(advanceRows, (e) => e.partyId);

  return {
    syncedAt: new Date().toISOString(),
    settings,
    products,
    customers,
    suppliers,
    parties,
    sales,
    purchases,
    expenses,
    dashboard,
    advanceEntriesByPartyId,
    supplierLedgerByPartyId,
    creditSales,
    salesTrends: {
      [`month-${year}`]: salesTrendMonth,
      [`year-${year}`]: salesTrendYear,
    },
    profitReports: {
      [`month-${year}-${month}-${day}`]: profitMonth,
      [`year-${year}`]: profitYear,
      all: profitAll,
    },
    reportsByPeriodKey: {
      all: { summary: salesSummaryAll, profitLoss: profitLossAll },
    },
    stockValuation,
  };
};
