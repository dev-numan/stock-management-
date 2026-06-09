import { computeCustomerLedgerTotals } from './creditData';
import { getEffectiveAdvanceBalance } from './customerBalance';
import { computeSupplierBalanceTotals } from './supplierLedger';

/**
 * Combined top summary from party rows (one record per person).
 */
export function computeCombinedLedgerSummaryFromParties(parties = []) {
  const customers = parties.filter((p) => p.partyType === 'CUSTOMER');
  const suppliers = parties.filter((p) => p.partyType === 'SUPPLIER');
  return computeCombinedLedgerSummary(customers, suppliers);
}

/**
 * Combined top summary: sum of each party's you'll give / you'll get balances.
 */
export function computeCombinedLedgerSummary(customers = [], suppliers = []) {
  const { youWillGet: customerGet, youWillGive: customerGive } =
    computeCustomerLedgerTotals(customers);
  const { youWillGet: supplierGet, youWillGive: supplierGive } =
    computeSupplierBalanceTotals(suppliers);

  return {
    youWillGive: customerGive + supplierGive,
    youWillGet: customerGet + supplierGet,
  };
}

/** Build list rows from unified parties (preferred). */
export function buildPartyRows(parties = []) {
  return parties.map((p) => ({
    partyType: p.partyType === 'SUPPLIER' ? 'supplier' : 'customer',
    activeType: p.partyType === 'SUPPLIER' ? 'supplier' : 'customer',
    id: p.id,
    name: p.name,
    phone: p.phone,
    address: p.address,
    createdAt: p.createdAt,
    _local: p._local,
    raw: p,
  }));
}

/** Legacy: merge separate customer + supplier arrays (may duplicate same person). */
export function buildCombinedPartyRows(customers = [], suppliers = []) {
  const customerRows = customers.map((c) => ({
    partyType: 'customer',
    activeType: 'customer',
    id: c.id,
    name: c.name,
    phone: c.phone,
    address: c.address,
    createdAt: c.createdAt,
    _local: c._local,
    raw: { ...c, partyType: 'CUSTOMER' },
  }));

  const supplierRows = suppliers.map((s) => ({
    partyType: 'supplier',
    activeType: 'supplier',
    id: s.id,
    name: s.name,
    phone: s.phone,
    createdAt: s.createdAt,
    raw: { ...s, partyType: 'SUPPLIER' },
  }));

  return [...customerRows, ...supplierRows];
}

export function getPartyRowBalance(row) {
  const raw = row.raw;
  if (row.activeType === 'supplier' || raw?.partyType === 'SUPPLIER') {
    return Number(raw.payableBalance ?? 0);
  }
  return getEffectiveAdvanceBalance(raw);
}
