import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  getCustomers,
  createCustomer as createCustomerApi,
  updateCustomer as updateCustomerApi,
  deleteCustomer as deleteCustomerApi,
  addCustomerAdvance as addCustomerAdvanceApi,
  addCustomerCreditCharge as addCustomerCreditChargeApi,
  deleteCustomerAdvanceEntry as deleteCustomerAdvanceEntryApi,
} from '../api/customers.api';
import { getFriendlyErrorMessage } from '../utils/apiErrors';
import { normalizePhone } from '../utils/phone';
import { getIsOnline } from './networkStore';
import { useSyncStore } from './syncStore';
import { queueOrRun } from '../services/offlineMutation';
import { createClientRequestId } from '../utils/clientRequestId';
import { usePartiesStore } from './partiesStore';
import { removePartyEverywhere } from '../utils/partyStoreActions';
import { zustandStorage, isStale } from './storage';
import { roundMoney } from '../utils/money';

const syncToPartiesStore = (customers) => {
  const parties = usePartiesStore.getState().parties;
  const others = parties.filter((p) => p.partyType !== 'CUSTOMER');
  const merged = [
    ...others,
    ...customers.map((c) => ({ ...c, partyType: 'CUSTOMER' })),
  ];
  usePartiesStore.setState({ parties: merged, lastFetched: Date.now() });
};

export const useCustomersStore = create(
  persist(
    (set, get) => ({
      customers: [],
      lastFetched: null,
      loading: false,
      error: null,

      fetchCustomers: async (force = false) => {
        const { customers, lastFetched } = get();
        if (!force && customers.length && !isStale(lastFetched)) {
          return customers;
        }
        if (!getIsOnline()) {
          return customers;
        }

        set({ loading: true, error: null });
        try {
          const { data } = await getCustomers();
          const list = data.data || [];
          set({ customers: list, lastFetched: Date.now(), loading: false });
          syncToPartiesStore(list);
          return list;
        } catch (err) {
          set({
            loading: false,
            error: getFriendlyErrorMessage(err, 'Could not load customers. Pull down to refresh.'),
          });
          return customers;
        }
      },

      addCustomerLocal: (customer) => {
        const next = [...get().customers, customer];
        set({ customers: next });
        syncToPartiesStore(next);
      },

      findByPhone: (phone) => {
        const key = normalizePhone(phone);
        if (!key) return null;
        return get().customers.find((c) => normalizePhone(c.phone) === key) ?? null;
      },

      updateCustomer: async (id, data) => {
        if (!getIsOnline() || String(id).startsWith('local-')) {
          const next = get().customers.map((c) => (c.id === id ? { ...c, ...data } : c));
          set({ customers: next });
          syncToPartiesStore(next);
          // Queue the edit so it reaches the server on reconnect. For a still-
          // local contact the id resolves to its server id once its CREATE syncs.
          useSyncStore.getState().enqueue({
            type: 'UPDATE_CUSTOMER',
            payload: { id, body: data },
          });
          return next.find((c) => c.id === id);
        }
        const { data: res } = await updateCustomerApi(id, data);
        const updated = res.data;
        const next = get().customers.map((c) => (c.id === id ? updated : c));
        set({ customers: next, lastFetched: Date.now() });
        syncToPartiesStore(next);
        usePartiesStore.getState().patchParty({ ...updated, partyType: 'CUSTOMER' });
        return updated;
      },

      // Shift a customer's running account balance so the ledger reflects a
      // payment/charge immediately, even offline. advanceBalance: positive =
      // they've prepaid; negative = they owe us. A recorded payment raises it;
      // a credit charge lowers it.
      adjustAdvance: (id, delta) => {
        const next = get().customers.map((c) =>
          c.id === id
            ? { ...c, advanceBalance: roundMoney(Number(c.advanceBalance ?? 0) + Number(delta)) }
            : c
        );
        set({ customers: next });
        syncToPartiesStore(next);
        const updated = next.find((c) => c.id === id);
        if (updated) usePartiesStore.getState().patchParty({ ...updated, partyType: 'CUSTOMER' });
        return updated;
      },

      addAdvance: (id, { amount, notes }) => {
        // Same key on every retry so the server records this payment once.
        const body = { amount, notes, clientRequestId: createClientRequestId('adv') };
        return queueOrRun({
          online: async () => {
            const { data } = await addCustomerAdvanceApi(id, body);
            get().patchCustomer(data.data);
            return data.data;
          },
          type: 'ADD_CUSTOMER_ADVANCE',
          payload: { customerId: id, body },
          optimistic: () => get().adjustAdvance(id, Number(amount)),
        });
      },

      addCreditCharge: (id, { amount, notes }) => {
        const body = { amount, notes, clientRequestId: createClientRequestId('credit') };
        return queueOrRun({
          online: async () => {
            const { data } = await addCustomerCreditChargeApi(id, body);
            get().patchCustomer(data.data);
            return data.data;
          },
          type: 'ADD_CUSTOMER_CREDIT_CHARGE',
          payload: { customerId: id, body },
          optimistic: () => get().adjustAdvance(id, -Number(amount)),
        });
      },

      deleteAdvanceEntry: (customerId, entryId, reversalDelta = 0) =>
        queueOrRun({
          online: async () => {
            const { data } = await deleteCustomerAdvanceEntryApi(customerId, entryId);
            if (data?.data) get().patchCustomer(data.data);
            return data?.data ?? { id: entryId };
          },
          type: 'DELETE_CUSTOMER_ADVANCE_ENTRY',
          payload: { customerId, entryId },
          // reversalDelta undoes the entry's effect on the balance (caller knows
          // whether it was a payment or a charge).
          optimistic: () => {
            if (reversalDelta) get().adjustAdvance(customerId, Number(reversalDelta));
          },
        }),

      patchCustomer: (customer) => {
        if (!customer?.id) return;
        const next = get().customers.map((c) =>
          c.id === customer.id ? { ...c, ...customer } : c
        );
        set({ customers: next });
        syncToPartiesStore(next);
        usePartiesStore.getState().patchParty({ ...customer, partyType: 'CUSTOMER' });
      },

      removeCustomer: (id) => {
        removePartyEverywhere(id);
      },

      deleteCustomer: async (id) => {
        if (!getIsOnline() || String(id).startsWith('local-')) {
          // If it was only ever local, just cancel its pending CREATE instead of
          // creating-then-deleting on the server. Otherwise queue the delete.
          const cancelledLocal = useSyncStore.getState().removeByLocalId(id);
          if (!cancelledLocal) {
            useSyncStore.getState().enqueue({ type: 'DELETE_CUSTOMER', payload: { id } });
          }
          get().removeCustomer(id);
          return { id };
        }
        await deleteCustomerApi(id);
        get().removeCustomer(id);
        return { id };
      },

      createCustomer: async ({ name, phone, address }) => {
        const body = { name, ...(phone ? { phone } : {}), ...(address ? { address } : {}) };

        if (!getIsOnline()) {
          const localId = `local-customer-${Date.now()}`;
          const local = {
            id: localId,
            name,
            phone: phone || null,
            address: address || null,
            partyType: 'CUSTOMER',
            _local: true,
          };
          useSyncStore.getState().enqueue({
            type: 'CREATE_PARTY',
            payload: { ...body, partyType: 'CUSTOMER' },
            localId,
          });
          get().addCustomerLocal(local);
          return local;
        }

        const { data } = await createCustomerApi(body);
        const created = data.data;
        const next = [...get().customers.filter((c) => c.id !== created.id), created];
        set({ customers: next, lastFetched: Date.now() });
        syncToPartiesStore(next);
        return created;
      },
    }),
    {
      name: 'narang-customers',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        customers: state.customers,
        lastFetched: state.lastFetched,
      }),
    }
  )
);
