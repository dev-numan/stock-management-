import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  getProducts,
  createProduct as createProductApi,
  updateProduct as updateProductApi,
  deleteProduct as deleteProductApi,
} from '../api/products.api';
import { getIsOnline } from './networkStore';
import { useSyncStore } from './syncStore';
import { zustandStorage, isStale } from './storage';

export const useProductsStore = create(
  persist(
    (set, get) => ({
      products: [],
      lastFetched: null,
      loading: false,
      error: null,

      getFiltered: ({ search = '', lowStock = false } = {}) => {
        let list = get().products;
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          list = list.filter((p) => p.name?.toLowerCase().includes(q));
        }
        if (lowStock) {
          list = list.filter(
            (p) => Number(p.currentStock) <= Number(p.minStockAlert)
          );
        }
        return list;
      },

      getById: (id) => get().products.find((p) => p.id === id),

      setProducts: (products) => set({ products, lastFetched: Date.now(), error: null }),

      patchProduct: (id, patch) =>
        set({
          products: get().products.map((p) =>
            p.id === id ? { ...p, ...patch } : p
          ),
        }),

      removeProduct: (id) =>
        set({ products: get().products.filter((p) => p.id !== id) }),

      applyStockDelta: (productId, deltaQty) => {
        const p = get().products.find((x) => x.id === productId);
        if (!p) return;
        const next = Math.max(0, Number(p.currentStock) - Number(deltaQty));
        get().patchProduct(productId, { currentStock: next });
      },

      fetchProducts: async (force = false) => {
        const { products, lastFetched } = get();
        if (!force && products.length && !isStale(lastFetched)) {
          return products;
        }
        if (!getIsOnline()) {
          if (products.length) return products;
          set({ error: 'Offline — showing cached products when available' });
          return products;
        }

        set({ loading: true, error: null });
        try {
          const { data } = await getProducts({ search: '' });
          const list = data.data || [];
          set({ products: list, lastFetched: Date.now(), loading: false, error: null });
          return list;
        } catch (err) {
          const message = err.response?.data?.message || 'Failed to load products';
          set({ loading: false, error: products.length ? null : message });
          return products;
        }
      },

      saveProduct: async (id, data) => {
        if (!getIsOnline()) {
          useSyncStore.getState().enqueue({
            type: 'UPDATE_PRODUCT',
            payload: { id, body: data },
          });
          get().patchProduct(id, data);
          return { id, ...data };
        }
        const { data: res } = await updateProductApi(id, data);
        get().patchProduct(id, res.data);
        set({ lastFetched: Date.now() });
        return res.data;
      },

      createProduct: async (data) => {
        if (!getIsOnline()) {
          const localId = `local-product-${Date.now()}`;
          const local = {
            id: localId,
            ...data,
            _local: true,
            costPrice: data.costPrice,
            salePrice: data.salePrice,
            currentStock: data.currentStock,
            minStockAlert: data.minStockAlert,
          };
          useSyncStore.getState().enqueue({
            type: 'CREATE_PRODUCT',
            payload: data,
            localId,
          });
          set({ products: [local, ...get().products] });
          return local;
        }
        const { data: res } = await createProductApi(data);
        set({
          products: [res.data, ...get().products.filter((p) => p.id !== res.data.id)],
          lastFetched: Date.now(),
        });
        return res.data;
      },

      deleteProduct: async (id) => {
        if (!getIsOnline()) {
          useSyncStore.getState().enqueue({
            type: 'DELETE_PRODUCT',
            payload: { id },
          });
          get().removeProduct(id);
          return;
        }
        await deleteProductApi(id);
        get().removeProduct(id);
      },
    }),
    {
      name: 'narang-products',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        products: state.products,
        lastFetched: state.lastFetched,
      }),
    }
  )
);
