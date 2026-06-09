import { create } from 'zustand';
import {
  getSuppliers,
  createSupplier as apiCreateSupplier,
  deleteSupplier as deleteSupplierApi,
} from '../api/suppliers.api';
import { getFriendlyErrorMessage } from '../utils/apiErrors';
import { getT } from './languageStore';
import { usePartiesStore } from './partiesStore';

const syncToPartiesStore = (suppliers) => {
  const parties = usePartiesStore.getState().parties;
  const others = parties.filter((p) => p.partyType !== 'SUPPLIER');
  const merged = [
    ...others,
    ...suppliers.map((s) => ({ ...s, partyType: 'SUPPLIER' })),
  ];
  usePartiesStore.setState({ parties: merged, lastFetched: Date.now() });
};

export const useSuppliersStore = create((set, get) => ({
  suppliers: [],
  loading: false,
  error: null,

  fetchSuppliers: async (force = false) => {
    if (!force && get().suppliers.length > 0 && !get().error) return;
    try {
      set({ loading: true, error: null });
      const { data } = await getSuppliers();
      const list = data.data || [];
      set({ suppliers: list, loading: false });
      syncToPartiesStore(list);
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
    const next = [...get().suppliers, { ...created, payableBalance: 0, partyType: 'SUPPLIER' }];
    set({ suppliers: next });
    syncToPartiesStore(next);
    return created;
  },

  upsertSupplier: (supplier) => {
    if (!supplier?.id) return;
    const existing = get().suppliers;
    const found = existing.some((s) => s.id === supplier.id);
    const next = found
      ? existing.map((s) => (s.id === supplier.id ? { ...s, ...supplier } : s))
      : [...existing, supplier];
    set({ suppliers: next });
    syncToPartiesStore(next);
    usePartiesStore.getState().upsertParty({ ...supplier, partyType: 'SUPPLIER' });
  },

  removeSupplier: (id) => {
    const next = get().suppliers.filter((s) => s.id !== id);
    set({ suppliers: next });
    syncToPartiesStore(next);
    usePartiesStore.getState().removeParty(id);
  },

  deleteSupplier: async (id) => {
    await deleteSupplierApi(id);
    get().removeSupplier(id);
    return { id };
  },
}));
