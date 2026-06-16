import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  getProducts,
  createProduct as createProductApi,
  updateProduct as updateProductApi,
  deleteProduct as deleteProductApi,
  addProductStock as addProductStockApi,
} from '../api/products.api';
import { getFriendlyErrorMessage } from '../utils/apiErrors';
import { getT } from './languageStore';
import { getIsOnline } from './networkStore';
import { useSyncStore } from './syncStore';
import { queueOrRun } from '../services/offlineMutation';
import { createClientRequestId } from '../utils/clientRequestId';
import { useDashboardStore } from './dashboardStore';
import { zustandStorage, isStale } from './storage';
import { filterAndSortProducts } from '../utils/productListFilters';

/** Mark the dashboard stale so inventory stats refetch on next focus. */
const invalidateDashboard = () => useDashboardStore.getState().invalidate();

export const useProductsStore = create(
  persist(
    (set, get) => ({
      products: [],
      lastFetched: null,
      loading: false,
      error: null,

      getFiltered: ({ search = '', filter = 'all', sort = 'newest', lowStock = false } = {}) => {
        const resolvedFilter = lowStock ? 'lowStock' : filter;
        return filterAndSortProducts(get().products, {
          search,
          filter: resolvedFilter,
          sort,
        });
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
        if (!force && products.length > 0 && !isStale(lastFetched)) {
          set({ loading: false });
          return products;
        }
        if (!getIsOnline()) {
          if (products.length) {
            set({ loading: false });
            return products;
          }
          set({ error: 'Offline — showing cached products when available', loading: false });
          return products;
        }

        const isInitialLoad = products.length === 0;
        set({ loading: isInitialLoad, error: null });
        try {
          const { data } = await getProducts({ search: '' });
          const list = data.data || [];
          set({ products: list, lastFetched: Date.now(), loading: false, error: null });
          return list;
        } catch (err) {
          const message = getFriendlyErrorMessage(err, getT()('products.loadFailedRefresh'));
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
          invalidateDashboard();
          return { id, ...data };
        }
        const { data: res } = await updateProductApi(id, data);
        get().patchProduct(id, res.data);
        set({ lastFetched: Date.now() });
        invalidateDashboard();
        return res.data;
      },

      addProductStock: async (productId, { quantity, supplierId, supplierName, notes, costPrice, salePrice }) => {
        const body = {
          quantity, supplierId, supplierName, notes, costPrice, salePrice,
          clientRequestId: createClientRequestId('stock'),
        };
        const { queued, result } = await queueOrRun({
          online: async () => {
            const { data: res } = await addProductStockApi(productId, body);
            const updated = res.data?.product;
            if (updated) {
              get().patchProduct(productId, updated);
              set({ lastFetched: Date.now() });
              invalidateDashboard();
            }
            return updated;
          },
          type: 'ADD_PRODUCT_STOCK',
          payload: { productId, body },
          optimistic: () => {
            // Reflect the incoming stock (and any new prices) immediately. Stock
            // is a count, not money — do not round it.
            const p = get().getById(productId);
            const patch = { currentStock: Number(p?.currentStock ?? 0) + Number(quantity) };
            if (costPrice != null) patch.costPrice = costPrice;
            if (salePrice != null) patch.salePrice = salePrice;
            get().patchProduct(productId, patch);
            invalidateDashboard();
          },
        });
        return queued ? get().getById(productId) : result;
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
          invalidateDashboard();
          return local;
        }
        const { data: res } = await createProductApi(data);
        set({
          products: [res.data, ...get().products.filter((p) => p.id !== res.data.id)],
          lastFetched: Date.now(),
        });
        invalidateDashboard();
        return res.data;
      },

      deleteProduct: async (id) => {
        if (!getIsOnline()) {
          useSyncStore.getState().enqueue({
            type: 'DELETE_PRODUCT',
            payload: { id },
          });
          get().removeProduct(id);
          invalidateDashboard();
          return;
        }
        await deleteProductApi(id);
        get().removeProduct(id);
        invalidateDashboard();
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
