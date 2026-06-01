import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from './storage';
import { translate } from '../i18n/translations';

export const useLanguageStore = create(
  persist(
    (set, get) => ({
      locale: 'en',
      setLocale: (locale) => set({ locale }),
      t: (key, params) => translate(get().locale, key, params),
    }),
    {
      name: 'app-language',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({ locale: state.locale }),
    }
  )
);

export const getLocale = () => useLanguageStore.getState().locale;

export const getT = () => useLanguageStore.getState().t;
