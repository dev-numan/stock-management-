/** Sum purchase and payment totals across all suppliers for list summary. */
export function computeSupplierLedgerTotals(suppliers) {
  let totalPurchases = 0;
  let totalPayments = 0;
  for (const s of suppliers) {
    totalPurchases += Number(s.totalPurchases ?? 0);
    totalPayments += Number(s.totalPayments ?? 0);
  }
  return { totalPurchases, totalPayments };
}

/** Sum payable balances: you'll give (owe) and you'll get (advance). */
export function computeSupplierBalanceTotals(suppliers) {
  let youWillGet = 0;
  let youWillGive = 0;
  for (const s of suppliers) {
    const balance = Number(s.payableBalance ?? 0);
    if (balance < 0) youWillGet += Math.abs(balance);
    else if (balance > 0) youWillGive += balance;
  }
  return { youWillGet, youWillGive };
}

/** Unique product names from purchase ledger entries. */
export function collectSupplierProductNames(ledgerEntries) {
  const names = new Set();
  for (const entry of ledgerEntries) {
    if (entry.type !== 'PURCHASE' || !entry.purchase?.items) continue;
    for (const item of entry.purchase.items) {
      const name = item.product?.name;
      if (name) names.add(name);
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

export function filterSuppliersByName(suppliers, query, limit = 6) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return suppliers
    .filter((s) => s.name.toLowerCase().includes(q))
    .slice(0, limit);
}

/** Full list for picker modal — all suppliers when search empty, filtered when typing. */
export function filterSuppliersForPicker(suppliers, query) {
  const q = query.trim().toLowerCase();
  const sorted = [...suppliers].sort((a, b) => a.name.localeCompare(b.name));
  if (!q) return sorted;
  const qDigits = q.replace(/\D/g, '');
  return sorted.filter((s) => {
    const name = s.name.toLowerCase();
    const phone = (s.phone || '').replace(/\D/g, '');
    return name.includes(q) || (qDigits.length > 0 && phone.includes(qDigits));
  });
}

export function findSupplierByExactName(suppliers, name) {
  const q = name.trim().toLowerCase();
  if (!q) return null;
  return suppliers.find((s) => s.name.trim().toLowerCase() === q) || null;
}
