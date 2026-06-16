import { useSyncStore } from '../stores/syncStore';

/** Merge queued customer advance/credit ops into cached entries (survives app restart). */
export function mergePendingAdvanceEntries(partyId, entries = []) {
  const queue = useSyncStore.getState().queue;
  const removedIds = new Set();
  const pending = [];

  for (const item of queue) {
    if (item.blocked) continue;
    const cid = item.payload?.customerId;
    if (cid !== partyId) continue;

    if (item.type === 'DELETE_CUSTOMER_ADVANCE_ENTRY') {
      removedIds.add(item.payload.entryId);
      continue;
    }

    if (item.type === 'ADD_CUSTOMER_ADVANCE') {
      pending.push({
        id: `queue-${item.id}`,
        amount: Number(item.payload.body?.amount ?? 0),
        notes: item.payload.body?.notes?.trim() || null,
        createdAt: item.createdAt,
        _pending: true,
      });
    }

    if (item.type === 'ADD_CUSTOMER_CREDIT_CHARGE') {
      pending.push({
        id: `queue-${item.id}`,
        amount: -Number(item.payload.body?.amount ?? 0),
        notes: item.payload.body?.notes?.trim() || null,
        createdAt: item.createdAt,
        _pending: true,
      });
    }
  }

  const kept = entries.filter((e) => !removedIds.has(e.id));
  const existingIds = new Set(kept.map((e) => e.id));
  const extra = pending.filter((p) => !existingIds.has(p.id));
  return [...extra, ...kept].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/** Merge queued supplier payment/purchase ops into cached ledger rows. */
export function mergePendingSupplierLedger(supplierId, ledger = []) {
  const queue = useSyncStore.getState().queue;
  const removedIds = new Set();
  const pending = [];

  for (const item of queue) {
    if (item.blocked) continue;

    if (item.type === 'ADD_SUPPLIER_PAYMENT' && item.payload.supplierId === supplierId) {
      pending.push({
        id: `queue-${item.id}`,
        type: 'PAYMENT',
        amount: Number(item.payload.body?.amount ?? 0),
        notes: item.payload.body?.notes?.trim() || null,
        createdAt: item.createdAt,
        _pending: true,
      });
    }

    if (item.type === 'ADD_SUPPLIER_PURCHASE' && item.payload.supplierId === supplierId) {
      pending.push({
        id: `queue-${item.id}`,
        type: 'PURCHASE',
        amount: Number(item.payload.body?.amount ?? 0),
        notes: item.payload.body?.notes?.trim() || null,
        createdAt: item.createdAt,
        _pending: true,
      });
    }

    if (item.type === 'DELETE_SUPPLIER_PAYMENT' && item.payload.supplierId === supplierId) {
      removedIds.add(item.payload.paymentId);
    }

    if (item.type === 'DELETE_PURCHASE') {
      removedIds.add(item.payload.id);
    }
  }

  const kept = ledger.filter((e) => !removedIds.has(e.id));
  const existingIds = new Set(kept.map((e) => e.id));
  const extra = pending.filter((p) => !existingIds.has(p.id));
  return [...extra, ...kept].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
