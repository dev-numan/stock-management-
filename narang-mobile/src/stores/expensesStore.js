import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  getExpenses,
  createExpense as createExpenseApi,
  deleteExpense as deleteExpenseApi,
} from '../api/expenses.api';
import { getFriendlyErrorMessage } from '../utils/apiErrors';
import { getIsOnline } from './networkStore';
import { useSyncStore } from './syncStore';
import { queueOrRun } from '../services/offlineMutation';
import { createClientRequestId } from '../utils/clientRequestId';
import { useDashboardStore } from './dashboardStore';
import { zustandStorage, isStale } from './storage';
import { mergeServerWithLocal, pendingLocalsFromQueue } from '../utils/mergeLocalEntities';

export const useExpensesStore = create(
  persist(
    (set, get) => ({
      expenses: [],
      lastFetched: null,
      loading: false,
      error: null,

      fetchExpenses: async (force = false) => {
        const { expenses, lastFetched } = get();
        if (!force && expenses.length && !isStale(lastFetched)) {
          return expenses;
        }
        if (!getIsOnline()) {
          return expenses;
        }
        try {
          set({ loading: true, error: null });
          const { data } = await getExpenses({
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
          });
          const list = data.data || [];
          const merged = mergeServerWithLocal(list, expenses, {
            pendingFromQueue: pendingLocalsFromQueue(['CREATE_EXPENSE']),
          });
          set({ expenses: merged, lastFetched: Date.now(), loading: false });
          return merged;
        } catch (err) {
          set({
            loading: false,
            error: getFriendlyErrorMessage(err, 'Could not load expenses. Pull down to refresh.'),
          });
          return expenses;
        }
      },

      createExpense: (rawPayload) => {
        const localId = `local-expense-${Date.now()}`;
        const payload = { ...rawPayload, clientRequestId: createClientRequestId('expense') };
        return queueOrRun({
          online: async () => {
            const { data } = await createExpenseApi(payload);
            const created = data.data;
            // A duplicate replay returns { duplicate: true } (no id) — don't
            // insert that sentinel into the list.
            if (created?.id) {
              set({ expenses: [created, ...get().expenses.filter((e) => e.id !== created.id)] });
            }
            useDashboardStore.getState().invalidate();
            return created;
          },
          type: 'CREATE_EXPENSE',
          payload,
          localId,
          optimistic: () => {
            const local = {
              id: localId,
              ...payload,
              date: payload.date || new Date().toISOString(),
              _local: true,
            };
            set({ expenses: [local, ...get().expenses] });
            useDashboardStore.getState().invalidate();
          },
        });
      },

      deleteExpense: (id) => {
        if (!getIsOnline() || String(id).startsWith('local-')) {
          const cancelledLocal = useSyncStore.getState().removeByLocalId(id);
          if (!cancelledLocal) {
            useSyncStore.getState().enqueue({ type: 'DELETE_EXPENSE', payload: { id } });
          }
          set({ expenses: get().expenses.filter((e) => e.id !== id) });
          useDashboardStore.getState().invalidate();
          return Promise.resolve({ queued: !cancelledLocal });
        }
        return deleteExpenseApi(id).then(() => {
          set({ expenses: get().expenses.filter((e) => e.id !== id) });
          useDashboardStore.getState().invalidate();
          return { queued: false };
        });
      },
    }),
    {
      name: 'narang-expenses',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        expenses: state.expenses,
        lastFetched: state.lastFetched,
      }),
    }
  )
);
