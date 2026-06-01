import { useSalesStore } from '../stores/salesStore';
import { getEffectiveAdvanceBalance } from './customerBalance';

export function computeCustomerLedgerTotals(customers) {
  let youWillGet = 0;
  let youWillGive = 0;

  for (const customer of customers) {
    const balance = getEffectiveAdvanceBalance(customer);
    if (balance < 0) {
      youWillGet += Math.abs(balance);
    } else if (balance > 0) {
      youWillGive += balance;
    }
  }

  return { youWillGet, youWillGive };
}

/** Total customers owe (matches dashboard “You will get”), includes pending offline credit. */
export function computeTotalCreditOutstanding(customers) {
  return computeCustomerLedgerTotals(customers).youWillGet;
}

/** Merge server credit sales with unsynced local credit sales. */
export function mergeCreditSalesWithPending(apiSales = []) {
  const pending = useSalesStore
    .getState()
    .pendingSales.filter((s) => s.pendingSync && s.paymentMethod === 'CREDIT');

  const apiIds = new Set(apiSales.map((s) => s.id));
  const apiClientRequestIds = new Set(
    apiSales.map((s) => s.clientRequestId).filter(Boolean)
  );

  const uniquePending = pending
    .filter((p) => {
      if (apiIds.has(p.id)) return false;
      if (p.clientRequestId && apiClientRequestIds.has(p.clientRequestId)) return false;
      return true;
    })
    .map((p) => ({
      ...p,
      customer: p.customer || (p.customerId ? { id: p.customerId, name: 'Customer' } : null),
    }));

  return [...uniquePending, ...apiSales].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
}
