import { getEffectiveAdvanceBalance } from './customerBalance';

/**
 * Combined khata for one party.
 * advanceBalance < 0 → they owe you (from sales/credit).
 * payableBalance > 0 → you owe them (from purchases).
 * netBalance > 0 → they owe you net; netBalance < 0 → you owe them net.
 */
export function computePartyNetBalance(party, options = {}) {
  const advanceBalance = getEffectiveAdvanceBalance(party, options);
  const payableBalance = Number(party?.payableBalance ?? 0);
  const netBalance = -advanceBalance - payableBalance;

  const customerReceivable = advanceBalance < 0 ? Math.abs(advanceBalance) : 0;
  const customerPayable = advanceBalance > 0 ? advanceBalance : 0;
  const supplierPayable = payableBalance > 0 ? payableBalance : 0;
  const supplierAdvance = payableBalance < 0 ? Math.abs(payableBalance) : 0;

  return {
    advanceBalance,
    payableBalance,
    netBalance,
    customerReceivable,
    customerPayable,
    supplierPayable,
    supplierAdvance,
    youWillGet: netBalance > 0 ? netBalance : 0,
    youWillGive: netBalance < 0 ? Math.abs(netBalance) : 0,
    hasCustomerActivity: advanceBalance !== 0 || customerReceivable > 0,
    hasSupplierActivity: payableBalance !== 0 || supplierPayable > 0,
  };
}

/** Matches advanceBalance sign: negative = they owe you (you'll get). */
export function getPartyNetDisplayBalance(party, options = {}) {
  return -computePartyNetBalance(party, options).netBalance;
}
