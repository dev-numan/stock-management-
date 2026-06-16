import { useSyncStore } from '../stores/syncStore';

export const isLocalEntityId = (id) => typeof id === 'string' && id.startsWith('local-');

export const isLocalEntity = (entity) => Boolean(entity?._local || isLocalEntityId(entity?.id));

/**
 * Keep offline-created rows visible after a server refresh replaces the list.
 * @param {object[]} serverList - rows from API
 * @param {object[]} currentList - persisted local store rows
 * @param {{ getId?: (row: object) => string, pendingFromQueue?: object[] }} [opts]
 */
export function mergeServerWithLocal(serverList, currentList, opts = {}) {
  const getId = opts.getId ?? ((row) => row.id);
  const serverIds = new Set(serverList.map(getId));

  const pendingLocals = [
    ...currentList.filter((item) => isLocalEntity(item) && !serverIds.has(getId(item))),
    ...(opts.pendingFromQueue ?? []).filter(
      (item) => item?.id && !serverIds.has(getId(item)) && !currentList.some((c) => getId(c) === getId(item))
    ),
  ];

  const merged = [...serverList];
  for (const local of pendingLocals) {
    if (!merged.some((row) => getId(row) === getId(local))) {
      merged.push(local);
    }
  }
  return merged;
}

const QUEUE_TYPE_TO_PARTY = {
  CREATE_PARTY: (item) => ({
    id: item.localId,
    ...item.payload,
    advanceBalance: 0,
    payableBalance: 0,
    _local: true,
  }),
  CREATE_CUSTOMER: (item) => ({
    id: item.localId,
    ...item.payload,
    partyType: 'CUSTOMER',
    advanceBalance: 0,
    _local: true,
  }),
  CREATE_SUPPLIER: (item) => ({
    id: item.localId,
    ...item.payload,
    partyType: 'SUPPLIER',
    payableBalance: 0,
    _local: true,
  }),
  CREATE_PRODUCT: (item) => ({
    id: item.localId,
    ...item.payload,
    _local: true,
  }),
  CREATE_PURCHASE: (item) => {
    const total = (item.payload.items || []).reduce(
      (sum, i) => sum + Number(i.quantity || 0) * Number(i.costPrice || 0),
      0
    );
    return {
      id: item.localId,
      ...item.payload,
      totalAmount: total,
      createdAt: item.createdAt || new Date().toISOString(),
      _local: true,
    };
  },
  CREATE_EXPENSE: (item) => ({
    id: item.localId,
    ...item.payload,
    date: item.payload.date || item.createdAt || new Date().toISOString(),
    _local: true,
  }),
};

/** Reconstruct local-only rows from the sync queue when the list store was overwritten. */
export function pendingLocalsFromQueue(types) {
  const allowed = new Set(types);
  const queue = useSyncStore.getState().queue;
  const seen = new Set();
  const out = [];

  for (const item of queue) {
    if (item.blocked || !item.localId || !allowed.has(item.type)) continue;
    const build = QUEUE_TYPE_TO_PARTY[item.type];
    if (!build || seen.has(item.localId)) continue;
    seen.add(item.localId);
    out.push(build(item));
  }
  return out;
}
