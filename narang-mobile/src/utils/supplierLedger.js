/** Aggregate supplier balances for list summary (you owe / you're owed). */
export function computeSupplierLedgerTotals(suppliers) {
  let youWillGive = 0;
  let youWillGet = 0;
  for (const s of suppliers) {
    const balance = Number(s.payableBalance ?? 0);
    if (balance > 0) youWillGive += balance;
    else if (balance < 0) youWillGet += Math.abs(balance);
  }
  return { youWillGive, youWillGet };
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

export function findSupplierByExactName(suppliers, name) {
  const q = name.trim().toLowerCase();
  if (!q) return null;
  return suppliers.find((s) => s.name.trim().toLowerCase() === q) || null;
}
