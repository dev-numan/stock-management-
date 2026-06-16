import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  getPurchases,
  createPurchase as createPurchaseApi,
  deletePurchase as deletePurchaseApi,
} from '../api/purchases.api';
import { getFriendlyErrorMessage } from '../utils/apiErrors';
import { getIsOnline } from './networkStore';
import { useSyncStore } from './syncStore';
import { queueOrRun } from '../services/offlineMutation';
import { createClientRequestId } from '../utils/clientRequestId';
import { useProductsStore } from './productsStore';
import { useSuppliersStore } from './suppliersStore';
import { zustandStorage, isStale } from './storage';
import { roundMoney } from '../utils/money';

export const usePurchasesStore = create(
  persist(
    (set, get) => ({
      purchases: [],
      lastFetched: null,
      loading: false,
      error: null,

      fetchPurchases: async (force = false) => {
        const { purchases, lastFetched } = get();
        if (!force && purchases.length && !isStale(lastFetched)) {
          return purchases;
        }
        if (!getIsOnline()) {
          return purchases;
        }
        try {
          set({ loading: true, error: null });
          const { data } = await getPurchases();
          const list = data.data || [];
          set({ purchases: list, lastFetched: Date.now(), loading: false });
          return list;
        } catch (err) {
          set({
            loading: false,
            error: getFriendlyErrorMessage(err, 'Could not load purchases. Pull down to refresh.'),
          });
          return purchases;
        }
      },

      createPurchase: (rawPayload) => {
        const localId = `local-purchase-${Date.now()}`;
        // Stamp once so an online attempt and any offline replay share the key.
        const payload = { ...rawPayload, clientRequestId: createClientRequestId('purchase') };
        const total = (payload.items || []).reduce(
          (sum, i) => sum + Number(i.quantity || 0) * Number(i.costPrice || 0),
          0
        );
        return queueOrRun({
          online: async () => {
            const { data } = await createPurchaseApi(payload);
            return data.data;
          },
          type: 'CREATE_PURCHASE',
          payload,
          localId,
          optimistic: () => {
            // A purchase adds stock and raises the supplier's payable balance.
            // On reconnect the server result + cache refresh replaces these
            // optimistic figures, so there's no double counting.
            const products = useProductsStore.getState();
            (payload.items || []).forEach((i) => {
              const p = products.getById(i.productId);
              if (p) {
                products.patchProduct(i.productId, {
                  currentStock: Number(p.currentStock ?? 0) + Number(i.quantity || 0),
                });
              }
            });
            if (payload.supplierId) {
              useSuppliersStore.getState().applyLedgerDelta(payload.supplierId, { purchase: total });
            }
            set({
              purchases: [
                { id: localId, ...payload, totalAmount: roundMoney(total), createdAt: new Date().toISOString(), _local: true },
                ...get().purchases,
              ],
            });
          },
        });
      },

      deletePurchase: (id, { supplierId, amount = 0 } = {}) => {
        if (!getIsOnline() || String(id).startsWith('local-')) {
          const cancelledLocal = useSyncStore.getState().removeByLocalId(id);
          if (!cancelledLocal) {
            useSyncStore.getState().enqueue({ type: 'DELETE_PURCHASE', payload: { id } });
          }
          // Reversing a purchase lowers the supplier's payable balance.
          if (supplierId) {
            useSuppliersStore.getState().applyLedgerDelta(supplierId, { payment: amount });
          }
          set({ purchases: get().purchases.filter((p) => p.id !== id) });
          return Promise.resolve({ queued: !cancelledLocal });
        }
        return deletePurchaseApi(id).then(() => {
          set({ purchases: get().purchases.filter((p) => p.id !== id) });
          return { queued: false };
        });
      },
    }),
    {
      name: 'narang-purchases',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        purchases: state.purchases,
        lastFetched: state.lastFetched,
      }),
    }
  )
);
