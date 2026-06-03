/** Build customer account ledger rows with running balance (newest first). */
export function buildCustomerAccountHistory(entries = []) {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  );

  let running = 0;
  const withBalance = sorted.map((entry) => {
    running += Number(entry.amount ?? 0);
    const linkedSale = entry.saleId || entry.sale?.id;
    let entryType = 'payment';
    if (linkedSale) entryType = 'sale';
    else if (Number(entry.amount) < 0) entryType = 'credit';

    return {
      ...entry,
      balanceAfter: running,
      entryType,
      linkedSaleId: linkedSale || null,
    };
  });

  return withBalance.reverse();
}
