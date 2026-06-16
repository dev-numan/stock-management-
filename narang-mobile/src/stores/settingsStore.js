import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getSettings as getSettingsApi, updateSettings as updateSettingsApi } from '../api/settings.api';
import { getIsOnline } from './networkStore';
import { zustandStorage } from './storage';
import { SHOP_NAME, INVOICE_PREFIX } from '../constants/branding';

const defaults = () => ({
  shopName: SHOP_NAME,
  address: '',
  phone: '',
  taxPercent: 0,
  invoicePrefix: INVOICE_PREFIX,
  showLowStockAlert: true,
  showExpiryAlert: true,
  expiryAlertMonths: 3,
});

export const useSettingsStore = create(
  persist(
    (set, get) => ({
      settings: defaults(),
      lastFetched: null,

      applyFromBootstrap: (settings) => {
        if (!settings) return;
        set({ settings: { ...defaults(), ...settings }, lastFetched: Date.now() });
      },

      fetchSettings: async (force = false) => {
        const { settings, lastFetched } = get();
        if (!force && lastFetched && settings?.shopName) {
          return settings;
        }
        if (!getIsOnline()) {
          return settings;
        }
        try {
          const { data } = await getSettingsApi();
          const next = data.data || defaults();
          set({ settings: next, lastFetched: Date.now() });
          return next;
        } catch {
          return settings;
        }
      },

      updateSettings: async (body) => {
        if (!getIsOnline()) {
          set({ settings: { ...get().settings, ...body } });
          return get().settings;
        }
        const { data } = await updateSettingsApi(body);
        set({ settings: data.data, lastFetched: Date.now() });
        return data.data;
      },
    }),
    {
      name: 'narang-settings',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        settings: state.settings,
        lastFetched: state.lastFetched,
      }),
    }
  )
);

/** Convenience for invoice/PDF/reminders — works offline after bootstrap. */
export const getCachedSettings = () => useSettingsStore.getState().settings;
