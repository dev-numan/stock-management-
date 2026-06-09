import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  getCustomers,
  createCustomer as createCustomerApi,
  updateCustomer as updateCustomerApi,
  deleteCustomer as deleteCustomerApi,
} from '../api/customers.api';
import { getFriendlyErrorMessage } from '../utils/apiErrors';
import { normalizePhone } from '../utils/phone';
import { getIsOnline } from './networkStore';
import { useSyncStore } from './syncStore';
import { usePartiesStore } from './partiesStore';
import { zustandStorage, isStale } from './storage';

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
        const next = get().customers.filter((c) => c.id !== id);
        set({ customers: next, lastFetched: Date.now() });
        syncToPartiesStore(next);
        usePartiesStore.getState().removeParty(id);
      },

      deleteCustomer: async (id) => {
        if (!getIsOnline() || String(id).startsWith('local-')) {
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
