import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from './storage';

export const useSyncStore = create(
  persist(
    (set, get) => ({
      queue: [],
      syncing: false,
      lastSyncError: null,
      lastSyncAt: null,

      enqueue: (item) => {
        const entry = {
          id: item.id || `sync-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          type: item.type,
          payload: item.payload,
          localId: item.localId ?? null,
          createdAt: new Date().toISOString(),
          retries: 0,
          error: null,
        };
        set({ queue: [...get().queue, entry], lastSyncError: null });
        return entry.id;
      },

      remove: (id) => set({ queue: get().queue.filter((q) => q.id !== id) }),

      updateItem: (id, patch) =>
        set({
          queue: get().queue.map((q) => (q.id === id ? { ...q, ...patch } : q)),
        }),

      setSyncing: (syncing) => set({ syncing }),

      setLastSyncError: (lastSyncError) => set({ lastSyncError }),

      setLastSyncAt: (lastSyncAt) => set({ lastSyncAt }),

      clearQueue: () => set({ queue: [] }),

      pendingCount: () => get().queue.length,
    }),
    {
      name: 'narang-sync-queue',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        queue: state.queue,
        lastSyncAt: state.lastSyncAt,
      }),
    }
  )
);
