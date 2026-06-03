import { computeCustomerLedgerTotals } from './creditData';
import { getEffectiveAdvanceBalance } from './customerBalance';
import { computeSupplierLedgerTotals } from './supplierLedger';

/**
 * Combined top summary for customers + suppliers:
 * - you'll give = supplier purchases + customer prepaid (you will give)
 * - you'll get = supplier payments + customer receivable (you will get)
 */
export function computeCombinedLedgerSummary(customers = [], suppliers = []) {
  const { youWillGet: customerGet, youWillGive: customerGive } =
    computeCustomerLedgerTotals(customers);
  const { totalPurchases, totalPayments } = computeSupplierLedgerTotals(suppliers);

  return {
    youWillGive: totalPurchases + customerGive,
    youWillGet: totalPayments + customerGet,
  };
}

export function buildCombinedPartyRows(customers = [], suppliers = []) {
  const customerRows = customers.map((c) => ({
    partyType: 'customer',
    id: c.id,
    name: c.name,
    phone: c.phone,
    address: c.address,
    createdAt: c.createdAt,
    _local: c._local,
    raw: c,
  }));

  const supplierRows = suppliers.map((s) => ({
    partyType: 'supplier',
    id: s.id,
    name: s.name,
    phone: s.phone,
    createdAt: s.createdAt,
    raw: s,
  }));

  return [...customerRows, ...supplierRows];
}

export function getPartyRowBalance(row) {
  if (row.partyType === 'customer') {
    return getEffectiveAdvanceBalance(row.raw);
  }
  return Number(row.raw.payableBalance ?? 0);
}
