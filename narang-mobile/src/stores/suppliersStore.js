import { create } from 'zustand';
import { getSuppliers, createSupplier as apiCreateSupplier } from '../api/suppliers.api';
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
}));
