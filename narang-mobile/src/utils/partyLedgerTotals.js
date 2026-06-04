import { computeCustomerLedgerTotals } from './creditData';
import { getEffectiveAdvanceBalance } from './customerBalance';
import { computeSupplierBalanceTotals } from './supplierLedger';

/**
 * Combined top summary: sum of each party's you'll give / you'll get balances.
 * - you'll give = customer give (positive advance) + supplier give (payable owed)
 * - you'll get = customer get (they owe you) + supplier get (advance/overpayment)
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
