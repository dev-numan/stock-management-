import { create } from 'zustand';
import { localDataService } from '../services/localDataService';

export const useSyncStore = create((set, get) => ({
  queue: [],
  syncing: false,
  lastSyncError: null,
  lastSyncAt: null,
  hydrated: false,

  hydrate: async () => {
    const writes = await localDataService.init();
    const meta = await localDataService.getMeta();
    set({
      queue: writes,
      lastSyncAt: meta.lastSyncAt ?? null,
      hydrated: true,
    });
    return writes;
  },

  setQueue: (queue) => {
    set({ queue });
    localDataService.savePendingWrites(queue).catch(() => {});
  },

  enqueue: (item) => {
    const { queue } = get();

    if (item.type === 'CREATE_SALE' && item.payload?.localSaleId) {
      const existing = queue.find(
        (q) =>
          q.type === 'CREATE_SALE' && q.payload?.localSaleId === item.payload.localSaleId
      );
      if (existing) return existing.id;
    }

    const entry = {
      id: item.id || `sync-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type: item.type,
      payload: item.payload,
      localId: item.localId ?? null,
      createdAt: new Date().toISOString(),
      retries: 0,
      error: null,
      synced: false,
    };

    const next = [...queue, entry];
    get().setQueue(next);
    set({ lastSyncError: null });
    return entry.id;
  },

  remove: (id) => {
    const next = get().queue.filter((q) => q.id !== id);
    get().setQueue(next);
  },

  // Drop every queued op tied to an offline-created entity. Used when a
  // local-only entity (never synced) is deleted/cancelled: there's no point
  // creating it on the server just to delete it. Returns true if anything
  // was removed (i.e. a pending CREATE existed for this localId).
  removeByLocalId: (localId) => {
    if (!localId) return false;
    const { queue } = get();
    const next = queue.filter((q) => q.localId !== localId);
    if (next.length === queue.length) return false;
    get().setQueue(next);
    return true;
  },

  updateItem: (id, patch) => {
    const next = get().queue.map((q) => (q.id === id ? { ...q, ...patch } : q));
    get().setQueue(next);
  },

  setSyncing: (syncing) => set({ syncing }),

  setLastSyncError: (lastSyncError) => set({ lastSyncError }),

  setLastSyncAt: (lastSyncAt) => {
    set({ lastSyncAt });
    localDataService.setMeta({ lastSyncAt }).catch(() => {});
  },

  clearQueue: () => get().setQueue([]),

  pendingCount: () => get().queue.length,
}));
