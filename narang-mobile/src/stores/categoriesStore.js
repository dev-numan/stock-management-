import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getCategories } from '../api/categories.api';
import { getIsOnline } from './networkStore';
import { zustandStorage, isStale } from './storage';

export const useCategoriesStore = create(
  persist(
    (set, get) => ({
      categories: [],
      lastFetched: null,
      loading: false,
      error: null,

      fetchCategories: async (force = false) => {
        const { categories, lastFetched } = get();
        if (!force && categories.length && !isStale(lastFetched)) {
          return categories;
        }
        if (!getIsOnline()) {
          return categories;
        }

        set({ loading: true, error: null });
        try {
          const { data } = await getCategories();
          const list = data.data || [];
          set({ categories: list, lastFetched: Date.now(), loading: false });
          return list;
        } catch (err) {
          set({
            loading: false,
            error: err.response?.data?.message || 'Failed to load categories',
          });
          return categories;
        }
      },
    }),
    {
      name: 'narang-categories',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        categories: state.categories,
        lastFetched: state.lastFetched,
      }),
    }
  )
);
