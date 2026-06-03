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
import { zustandStorage, isStale } from './storage';

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
          return list;
        } catch (err) {
          set({
            loading: false,
            error: getFriendlyErrorMessage(err, 'Could not load customers. Pull down to refresh.'),
          });
          return customers;
        }
      },

      addCustomerLocal: (customer) =>
        set({ customers: [...get().customers, customer] }),

      findByPhone: (phone) => {
        const key = normalizePhone(phone);
        if (!key) return null;
        return get().customers.find((c) => normalizePhone(c.phone) === key) ?? null;
      },

      updateCustomer: async (id, data) => {
        if (!getIsOnline() || String(id).startsWith('local-')) {
          set({
            customers: get().customers.map((c) =>
              c.id === id ? { ...c, ...data } : c
            ),
          });
          return get().customers.find((c) => c.id === id);
        }
        const { data: res } = await updateCustomerApi(id, data);
        const updated = res.data;
        set({
          customers: get().customers.map((c) => (c.id === id ? updated : c)),
          lastFetched: Date.now(),
        });
        return updated;
      },

      patchCustomer: (customer) => {
        if (!customer?.id) return;
        set({
          customers: get().customers.map((c) => (c.id === customer.id ? { ...c, ...customer } : c)),
        });
      },

      removeCustomer: (id) =>
        set({
          customers: get().customers.filter((c) => c.id !== id),
          lastFetched: Date.now(),
        }),

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
          const local = { id: localId, name, phone: phone || null, address: address || null, _local: true };
          useSyncStore.getState().enqueue({
            type: 'CREATE_CUSTOMER',
            payload: body,
            localId,
          });
          get().addCustomerLocal(local);
          return local;
        }

        const { data } = await createCustomerApi(body);
        const created = data.data;
        set({
          customers: [...get().customers.filter((c) => c.id !== created.id), created],
          lastFetched: Date.now(),
        });
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
