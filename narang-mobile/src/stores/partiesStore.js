import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  getParties,
  createParty as createPartyApi,
  updateParty as updatePartyApi,
  deleteParty as deletePartyApi,
  convertParty as convertPartyApi,
} from '../api/parties.api';
import { getFriendlyErrorMessage } from '../utils/apiErrors';
import { normalizePhone } from '../utils/phone';
import { getIsOnline } from './networkStore';
import { useSyncStore } from './syncStore';
import { queueOrRun } from '../services/offlineMutation';
import { zustandStorage, isStale } from './storage';
import { removePartyEverywhere } from '../utils/partyStoreActions';
import { mergeServerWithLocal, pendingLocalsFromQueue } from '../utils/mergeLocalEntities';
import { validatePartyPhoneUnique } from '../utils/offlineValidation';
import { createClientRequestId } from '../utils/clientRequestId';
import { useCustomersStore } from './customersStore';
import { useSuppliersStore } from './suppliersStore';

export const usePartiesStore = create(
  persist(
    (set, get) => ({
      parties: [],
      lastFetched: null,
      loading: false,
      error: null,

      fetchParties: async (force = false) => {
        const { parties, lastFetched } = get();
        if (!force && parties.length && !isStale(lastFetched)) {
          return parties;
        }
        if (!getIsOnline()) {
          return parties;
        }

        set({ loading: true, error: null });
        try {
          const { data } = await getParties();
          const serverList = data.data || [];
          const merged = mergeServerWithLocal(serverList, parties, {
            pendingFromQueue: pendingLocalsFromQueue(['CREATE_PARTY', 'CREATE_CUSTOMER', 'CREATE_SUPPLIER']),
          });
          set({ parties: merged, lastFetched: Date.now(), loading: false });
          return merged;
        } catch (err) {
          set({
            loading: false,
            error: getFriendlyErrorMessage(err, 'Could not load parties. Pull down to refresh.'),
          });
          return parties;
        }
      },

      getByType: (type) =>
        get().parties.filter((p) => p.partyType === (type === 'SUPPLIER' ? 'SUPPLIER' : 'CUSTOMER')),

      findByPhone: (phone) => {
        const key = normalizePhone(phone);
        if (!key) return null;
        return get().parties.find((p) => normalizePhone(p.phone) === key) ?? null;
      },

      patchParty: (party) => {
        if (!party?.id) return;
        set({
          parties: get().parties.map((p) => (p.id === party.id ? { ...p, ...party } : p)),
        });
      },

      upsertParty: (party) => {
        if (!party?.id) return;
        const existing = get().parties;
        const found = existing.some((p) => p.id === party.id);
        set({
          parties: found
            ? existing.map((p) => (p.id === party.id ? { ...p, ...party } : p))
            : [...existing, party],
        });
      },

      removeParty: (id) =>
        set({
          parties: get().parties.filter((p) => p.id !== id),
          lastFetched: Date.now(),
        }),

      createParty: async ({ name, phone, address, partyType = 'CUSTOMER' }) => {
        validatePartyPhoneUnique(phone);

        const clientRequestId = createClientRequestId('party');
        const body = {
          name,
          partyType,
          clientRequestId,
          ...(phone ? { phone } : {}),
          ...(address ? { address } : {}),
        };

        if (!getIsOnline()) {
          const localId = `local-party-${Date.now()}`;
          const local = {
            id: localId,
            name,
            phone: phone || null,
            address: address || null,
            partyType,
            clientRequestId,
            advanceBalance: 0,
            payableBalance: 0,
            _local: true,
          };
          useSyncStore.getState().enqueue({
            type: 'CREATE_PARTY',
            payload: body,
            localId,
          });
          set({ parties: [...get().parties, local] });
          return local;
        }

        const { data } = await createPartyApi(body);
        const created = data.data;
        set({
          parties: [...get().parties.filter((p) => p.id !== created.id), created],
          lastFetched: Date.now(),
        });
        return created;
      },

      updateParty: async (id, data) => {
        if (data.phone != null) {
          validatePartyPhoneUnique(data.phone, id);
        }
        const body = { ...data };
        const { queued, result } = await queueOrRun({
          online: async () => {
            const { data: res } = await updatePartyApi(id, body);
            const updated = res.data;
            set({
              parties: get().parties.map((p) => (p.id === id ? { ...p, ...updated } : p)),
              lastFetched: Date.now(),
            });
            return updated;
          },
          type: 'UPDATE_PARTY',
          payload: { id, body },
          optimistic: () => {
            set({
              parties: get().parties.map((p) => (p.id === id ? { ...p, ...body } : p)),
            });
          },
        });
        return queued ? get().parties.find((p) => p.id === id) : result;
      },

      convertPartyType: async (id, partyType) => {
        const party = get().parties.find((p) => p.id === id);
        const applyLocalConvert = () => {
          if (!party) return;
          const updated = { ...party, partyType };
          set({
            parties: get().parties.map((p) => (p.id === id ? updated : p)),
          });
          if (partyType === 'CUSTOMER') {
            useSuppliersStore.setState({
              suppliers: useSuppliersStore.getState().suppliers.filter((s) => s.id !== id),
            });
            useCustomersStore.getState().patchCustomer(updated);
          } else {
            useCustomersStore.setState({
              customers: useCustomersStore.getState().customers.filter((c) => c.id !== id),
            });
            useSuppliersStore.getState().upsertSupplier({
              ...updated,
              payableBalance: updated.payableBalance ?? 0,
            });
          }
        };

        if (!getIsOnline() || String(id).startsWith('local-')) {
          applyLocalConvert();
          useSyncStore.getState().enqueue({
            type: 'CONVERT_PARTY',
            payload: { id, partyType },
          });
          return get().parties.find((p) => p.id === id);
        }
        const { data } = await convertPartyApi(id, partyType);
        const updated = data.data;
        set({
          parties: get().parties.map((p) => (p.id === id ? { ...p, ...updated } : p)),
          lastFetched: Date.now(),
        });
        if (partyType === 'CUSTOMER') {
          useSuppliersStore.setState({
            suppliers: useSuppliersStore.getState().suppliers.filter((s) => s.id !== id),
          });
          useCustomersStore.getState().patchCustomer(updated);
        } else {
          useCustomersStore.setState({
            customers: useCustomersStore.getState().customers.filter((c) => c.id !== id),
          });
          useSuppliersStore.getState().upsertSupplier({
            ...updated,
            payableBalance: updated.payableBalance ?? 0,
          });
        }
        return updated;
      },

      deleteParty: async (id) => {
        if (!getIsOnline() || String(id).startsWith('local-')) {
          const cancelledLocal = useSyncStore.getState().removeByLocalId(id);
          if (!cancelledLocal) {
            useSyncStore.getState().enqueue({ type: 'DELETE_PARTY', payload: { id } });
          }
          removePartyEverywhere(id);
          return { id };
        }
        await deletePartyApi(id);
        removePartyEverywhere(id);
        return { id };
      },
    }),
    {
      name: 'narang-parties',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        parties: state.parties,
        lastFetched: state.lastFetched,
      }),
    }
  )
);
