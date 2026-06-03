import { create } from 'zustand';
import { getSuppliers, createSupplier as apiCreateSupplier, deleteSupplier as deleteSupplierApi } from '../api/suppliers.api';
import { getFriendlyErrorMessage } from '../utils/apiErrors';
import { getT } from './languageStore';

export const useSuppliersStore = create((set, get) => ({
  suppliers: [],
  loading: false,
  error: null,

  fetchSuppliers: async (force = false) => {
    if (!force && get().suppliers.length > 0 && !get().error) return;
    try {
      set({ loading: true, error: null });
      const { data } = await getSuppliers();
      set({ suppliers: data.data || [], loading: false });
    } catch (err) {
      set({
        suppliers: [],
        loading: false,
        error: getFriendlyErrorMessage(err, getT()('supplier.loadFailed')),
      });
    }
  },

  createSupplier: async (payload) => {
    const { data } = await apiCreateSupplier(payload);
    const created = data.data;
    set({ suppliers: [...get().suppliers, { ...created, payableBalance: 0 }] });
    return created;
  },

  /**
   * Insert or update a single supplier in the cached list. Used by the detail
   * screen so the list/summary reflect new balances immediately (e.g. after a
   * purchase/payment is added or deleted) without waiting for a refetch.
   */
  upsertSupplier: (supplier) => {
    if (!supplier?.id) return;
    const existing = get().suppliers;
    const found = existing.some((s) => s.id === supplier.id);
    set({
      suppliers: found
        ? existing.map((s) => (s.id === supplier.id ? { ...s, ...supplier } : s))
        : [...existing, supplier],
    });
  },

  removeSupplier: (id) =>
    set({ suppliers: get().suppliers.filter((s) => s.id !== id) }),

  deleteSupplier: async (id) => {
    await deleteSupplierApi(id);
    get().removeSupplier(id);
    return { id };
  },
}));
