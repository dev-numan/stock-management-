import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getSales } from '../api/sales.api';
import { isInstantInLocalRange } from '../utils/formatDate';
import { getIsOnline } from './networkStore';
import { zustandStorage, isStale } from './storage';

const cacheKey = (params) => JSON.stringify(params || {});

export const useSalesStore = create(
  persist(
    (set, get) => ({
      pendingSales: [],
      salesByKey: {},
      lastFetchedByKey: {},

      addPendingSale: (sale) =>
        set({ pendingSales: [sale, ...get().pendingSales] }),

      removePendingSale: (localId) =>
        set({
          pendingSales: get().pendingSales.filter(
            (s) => s.localId !== localId && s.id !== localId
          ),
        }),

      getPendingForRange: (from, to) =>
        get().pendingSales.filter((sale) =>
          isInstantInLocalRange(sale.createdAt, from, to)
        ),

      fetchSales: async (params = {}, force = false) => {
        const key = cacheKey(params);
        const { salesByKey, lastFetchedByKey } = get();
        const cached = salesByKey[key];
        const lastFetched = lastFetchedByKey[key];

        if (!force && cached && !isStale(lastFetched)) {
          return get().mergeWithPending(cached, params);
        }

        if (!getIsOnline()) {
          const pending = get().getPendingForRange(params.from, params.to);
          return [...pending, ...(cached || [])];
        }

        try {
          const { data } = await getSales(params);
          const list = data.data || [];
          set({
            salesByKey: { ...get().salesByKey, [key]: list },
            lastFetchedByKey: { ...get().lastFetchedByKey, [key]: Date.now() },
          });
          return get().mergeWithPending(list, params);
        } catch {
          const pending = get().getPendingForRange(params.from, params.to);
          return [...pending, ...(cached || [])];
        }
      },

      mergeWithPending: (apiSales, params) => {
        const pending = get().getPendingForRange(params.from, params.to);
        const apiIds = new Set(apiSales.map((s) => s.id));
        const apiClientRequestIds = new Set(
          apiSales.map((s) => s.clientRequestId).filter(Boolean)
        );
        const uniquePending = pending.filter((p) => {
          if (apiIds.has(p.id)) return false;
          if (p.clientRequestId && apiClientRequestIds.has(p.clientRequestId)) return false;
          return true;
        });
        return [...uniquePending, ...apiSales].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
      },

      /** Merge API sales with pending for a customer (detail/history). */
      mergePendingForCustomer: (apiSales, customerId) => {
        const pending = get().pendingSales.filter(
          (s) => s.customerId === customerId || s.customer?.id === customerId
        );
        const apiIds = new Set(apiSales.map((s) => s.id));
        const apiClientRequestIds = new Set(
          apiSales.map((s) => s.clientRequestId).filter(Boolean)
        );
        const uniquePending = pending.filter((p) => {
          if (apiIds.has(p.id)) return false;
          if (p.clientRequestId && apiClientRequestIds.has(p.clientRequestId)) return false;
          return true;
        });
        return [...uniquePending, ...apiSales].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
      },

      invalidateAll: () => set({ salesByKey: {}, lastFetchedByKey: {} }),
    }),
    {
      name: 'narang-sales',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        pendingSales: state.pendingSales,
        salesByKey: state.salesByKey,
        lastFetchedByKey: state.lastFetchedByKey,
      }),
    }
  )
);
