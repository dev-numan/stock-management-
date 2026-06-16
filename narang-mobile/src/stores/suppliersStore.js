import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  getSuppliers,
  createSupplier as apiCreateSupplier,
  deleteSupplier as deleteSupplierApi,
  addSupplierPayment as addSupplierPaymentApi,
  addSupplierPurchase as addSupplierPurchaseApi,
  deleteSupplierPayment as deleteSupplierPaymentApi,
} from '../api/suppliers.api';
import { getFriendlyErrorMessage } from '../utils/apiErrors';
import { getT } from './languageStore';
import { getIsOnline } from './networkStore';
import { useSyncStore } from './syncStore';
import { queueOrRun } from '../services/offlineMutation';
import { createClientRequestId } from '../utils/clientRequestId';
import { usePartiesStore } from './partiesStore';
import { removePartyEverywhere } from '../utils/partyStoreActions';
import { zustandStorage, isStale } from './storage';
import { roundMoney } from '../utils/money';
import { mergeServerWithLocal, pendingLocalsFromQueue } from '../utils/mergeLocalEntities';
import { validatePartyPhoneUnique } from '../utils/offlineValidation';

const syncToPartiesStore = (suppliers) => {
  const parties = usePartiesStore.getState().parties;
  const others = parties.filter((p) => p.partyType !== 'SUPPLIER');
  const merged = [
    ...others,
    ...suppliers.map((s) => ({ ...s, partyType: 'SUPPLIER' })),
  ];
  usePartiesStore.setState({ parties: merged, lastFetched: Date.now() });
};

export const useSuppliersStore = create(
  persist(
    (set, get) => ({
      suppliers: [],
      lastFetched: null,
      loading: false,
      error: null,

      fetchSuppliers: async (force = false) => {
        const { suppliers, lastFetched } = get();
        if (!force && suppliers.length > 0 && !isStale(lastFetched) && !get().error) {
          return suppliers;
        }
        if (!getIsOnline()) {
          return suppliers;
        }
        try {
          set({ loading: true, error: null });
          const { data } = await getSuppliers();
          const serverList = data.data || [];
          const merged = mergeServerWithLocal(serverList, suppliers, {
            pendingFromQueue: pendingLocalsFromQueue(['CREATE_SUPPLIER', 'CREATE_PARTY']),
          });
          set({ suppliers: merged, lastFetched: Date.now(), loading: false });
          syncToPartiesStore(merged);
          return merged;
        } catch (err) {
          set({
            loading: false,
            error: getFriendlyErrorMessage(err, getT()('supplier.loadFailed')),
          });
          return suppliers;
        }
      },

      getById: (id) => get().suppliers.find((s) => s.id === id),

      // Patch a supplier's running balances so the list/detail reflect a
      // purchase or payment immediately, even offline. Purchases raise the
      // payable balance; payments lower it. Money values are rounded; never
      // round counts here (there are none).
      applyLedgerDelta: (supplierId, { purchase = 0, payment = 0 }) => {
        const next = get().suppliers.map((s) => {
          if (s.id !== supplierId) return s;
          return {
            ...s,
            totalPurchases: roundMoney(Number(s.totalPurchases ?? 0) + Number(purchase)),
            totalPayments: roundMoney(Number(s.totalPayments ?? 0) + Number(payment)),
            payableBalance: roundMoney(
              Number(s.payableBalance ?? 0) + Number(purchase) - Number(payment)
            ),
          };
        });
        set({ suppliers: next });
        syncToPartiesStore(next);
      },

      createSupplier: async (payload) => {
        validatePartyPhoneUnique(payload.phone);

        const clientRequestId = createClientRequestId('party');
        const body = { ...payload, partyType: 'SUPPLIER', clientRequestId };

        if (!getIsOnline()) {
          const localId = `local-supplier-${Date.now()}`;
          const local = {
            id: localId,
            ...body,
            payableBalance: 0,
            partyType: 'SUPPLIER',
            clientRequestId,
            _local: true,
          };
          useSyncStore.getState().enqueue({ type: 'CREATE_SUPPLIER', payload: body, localId });
          const next = [...get().suppliers, local];
          set({ suppliers: next });
          syncToPartiesStore(next);
          usePartiesStore.getState().upsertParty(local);
          return local;
        }
        const { data } = await apiCreateSupplier(body);
        const created = data.data;
        const next = [...get().suppliers.filter((s) => s.id !== created.id), { ...created, payableBalance: created.payableBalance ?? 0, partyType: 'SUPPLIER' }];
        set({ suppliers: next, lastFetched: Date.now() });
        syncToPartiesStore(next);
        return created;
      },

      upsertSupplier: (supplier) => {
        if (!supplier?.id) return;
        const existing = get().suppliers;
        const found = existing.some((s) => s.id === supplier.id);
        const next = found
          ? existing.map((s) => (s.id === supplier.id ? { ...s, ...supplier } : s))
          : [...existing, supplier];
        set({ suppliers: next });
        syncToPartiesStore(next);
        usePartiesStore.getState().upsertParty({ ...supplier, partyType: 'SUPPLIER' });
      },

      removeSupplier: (id) => {
        removePartyEverywhere(id);
      },

      deleteSupplier: async (id) => {
        if (!getIsOnline() || String(id).startsWith('local-')) {
          const cancelledLocal = useSyncStore.getState().removeByLocalId(id);
          if (!cancelledLocal) {
            useSyncStore.getState().enqueue({ type: 'DELETE_SUPPLIER', payload: { id } });
          }
          get().removeSupplier(id);
          return { id };
        }
        await deleteSupplierApi(id);
        get().removeSupplier(id);
        return { id };
      },

      addPayment: (supplierId, { amount, notes }) => {
        // One key, reused across retries → the server applies this once even if
        // a successful request's response is lost and the op is replayed.
        const body = { amount, notes, clientRequestId: createClientRequestId('pay') };
        return queueOrRun({
          online: async () => {
            const { data } = await addSupplierPaymentApi(supplierId, body);
            // Keep the suppliers list/dashboard balance in sync immediately,
            // not only via the detail screen's reload.
            get().applyLedgerDelta(supplierId, { payment: amount });
            return data.data;
          },
          type: 'ADD_SUPPLIER_PAYMENT',
          payload: { supplierId, body },
          optimistic: () => get().applyLedgerDelta(supplierId, { payment: amount }),
        });
      },

      addPurchase: (supplierId, { amount, notes }) => {
        const body = { amount, notes, clientRequestId: createClientRequestId('purch') };
        return queueOrRun({
          online: async () => {
            const { data } = await addSupplierPurchaseApi(supplierId, body);
            get().applyLedgerDelta(supplierId, { purchase: amount });
            return data.data;
          },
          type: 'ADD_SUPPLIER_PURCHASE',
          payload: { supplierId, body },
          optimistic: () => get().applyLedgerDelta(supplierId, { purchase: amount }),
        });
      },

      deletePayment: (supplierId, paymentId, amount = 0) =>
        queueOrRun({
          online: async () => {
            await deleteSupplierPaymentApi(supplierId, paymentId);
            // Reversing a payment raises the payable balance back up.
            get().applyLedgerDelta(supplierId, { purchase: amount });
            return { id: paymentId };
          },
          type: 'DELETE_SUPPLIER_PAYMENT',
          payload: { supplierId, paymentId },
          optimistic: () => get().applyLedgerDelta(supplierId, { purchase: amount }),
        }),
    }),
    {
      name: 'narang-suppliers',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        suppliers: state.suppliers,
        lastFetched: state.lastFetched,
      }),
    }
  )
);
