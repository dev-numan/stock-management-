import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getSales, deleteSale as deleteSaleApi } from '../api/sales.api';
import { isInstantInLocalRange } from '../utils/formatDate';
import { getIsOnline } from './networkStore';
import { useSyncStore } from './syncStore';
import { queueOrRun } from '../services/offlineMutation';
import { useOfflineCacheStore } from './offlineCacheStore';
import { useProductsStore } from './productsStore';
import { useCustomersStore } from './customersStore';
import { getStockDeduction } from '../utils/productUnits';
import { zustandStorage, isStale } from './storage';

export const ALL_SALES_KEY = '__all__';

const cacheKey = (params) => JSON.stringify(params || {});

export const useSalesStore = create(
  persist(
    (set, get) => ({
      pendingSales: [],
      salesByKey: {},
      lastFetchedByKey: {},

      setAllSales: (sales) => {
        set({
          salesByKey: { ...get().salesByKey, [ALL_SALES_KEY]: sales },
          lastFetchedByKey: { ...get().lastFetchedByKey, [ALL_SALES_KEY]: Date.now() },
        });
      },

      getAllSalesCached: () => get().salesByKey[ALL_SALES_KEY] || [],

      getSalesForCustomer: (customerId, { from, to } = {}) => {
        const all = get().getAllSalesCached();
        return all.filter((s) => {
          const cid = s.customerId || s.partyId || s.customer?.id;
          if (cid !== customerId) return false;
          if (from && new Date(s.createdAt) < new Date(from)) return false;
          if (to && new Date(s.createdAt) > new Date(to)) return false;
          return true;
        });
      },

      findSaleById: (id) => {
        if (!id) return null;
        const pending = get().pendingSales.find((s) => s.id === id || s.localId === id);
        if (pending) return pending;
        const all = get().getAllSalesCached();
        return all.find((s) => s.id === id) || null;
      },

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
          const all = get().getAllSalesCached();
          if (all.length) {
            let list = all;
            if (params.from || params.to) {
              list = all.filter((s) => {
                const t = new Date(s.createdAt);
                if (params.from && t < new Date(params.from)) return false;
                if (params.to && t > new Date(params.to)) return false;
                return true;
              });
            }
            if (params.customerId) {
              list = list.filter(
                (s) =>
                  s.customerId === params.customerId ||
                  s.partyId === params.customerId ||
                  s.customer?.id === params.customerId
              );
            }
            if (params.paymentMethod) {
              list = list.filter((s) => s.paymentMethod === params.paymentMethod);
            }
            return get().mergeWithPending(list, params);
          }
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

      removeSaleFromCache: (saleId) => {
        const { salesByKey } = get();
        const next = {};
        for (const [key, list] of Object.entries(salesByKey)) {
          next[key] = list.filter((s) => s.id !== saleId);
        }
        set({ salesByKey: next });
      },

      // Undo a sale's effect on local caches when it is deleted. Mirrors the
      // server's deleteSale: stock that was deducted goes back, and a credit
      // sale's debt is reversed on the customer's running balance.
      reverseSaleEffects: (sale, { reverseBalance } = {}) => {
        for (const item of sale?.items || []) {
          const product =
            useProductsStore.getState().getById(item.productId) || item.product;
          const deduction = getStockDeduction(
            product,
            item.soldUnit,
            Number(item.quantity)
          );
          // applyStockDelta subtracts its arg, so a negative delta adds stock back.
          if (deduction) {
            useProductsStore.getState().applyStockDelta(item.productId, -deduction);
          }
        }
        if (reverseBalance && sale?.paymentMethod === 'CREDIT') {
          const customerId = sale.customerId || sale.partyId || sale.customer?.id;
          if (customerId) {
            useCustomersStore
              .getState()
              .adjustAdvance(customerId, Number(sale.totalAmount ?? 0));
          }
        }
      },

      deleteSale: async (sale) => {
        const id = sale?.id;
        if (sale?.pendingSync) {
          const localId = sale.localId || id;
          // Give back the stock this pending sale optimistically deducted. A
          // pending credit sale never touched the balance on creation, so don't
          // reverse it here.
          get().reverseSaleEffects(sale, { reverseBalance: false });
          // Cancel the queued CREATE_SALE so it doesn't upload a ghost sale.
          useSyncStore.getState().removeByLocalId(localId);
          get().removePendingSale(localId);
          return { id };
        }
        const { queued, result } = await queueOrRun({
          online: async () => {
            const { data } = await deleteSaleApi(id);
            get().removeSaleFromCache(id);
            useOfflineCacheStore.getState().removeSale(id);
            get().invalidateAll();
            // Reflect the server-side stock/balance reversal locally so lists
            // are right immediately, before the next fetch reconciles.
            get().reverseSaleEffects(sale, { reverseBalance: true });
            return data.data;
          },
          type: 'DELETE_SALE',
          payload: { id },
          optimistic: () => {
            get().removeSaleFromCache(id);
            useOfflineCacheStore.getState().removeSale(id);
            // Offline: restore stock and reverse the credit-sale balance locally
            // so the numbers stay right until the next bootstrap.
            get().reverseSaleEffects(sale, { reverseBalance: true });
          },
        });
        return queued ? { id } : result;
      },
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
