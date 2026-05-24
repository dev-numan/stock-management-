import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getDashboard, getSalesTrend } from '../api/reports.api';
import { getIsOnline } from './networkStore';
import { useSalesStore } from './salesStore';
import { zustandStorage, isStale } from './storage';

const trendKey = (mode, year) => `${mode}-${year}`;

export const useDashboardStore = create(
  persist(
    (set, get) => ({
      dashboard: null,
      lastFetched: null,
      trendByKey: {},
      trendLastFetched: {},
      loading: false,
      trendLoading: false,
      error: null,

      fetchDashboard: async (force = false) => {
        const { dashboard, lastFetched } = get();
        if (!force && dashboard && !isStale(lastFetched)) {
          return get().enrichDashboard(dashboard);
        }
        if (!getIsOnline()) {
          if (dashboard) return get().enrichDashboard(dashboard);
          set({ error: 'Offline — connect to load dashboard' });
          return null;
        }

        set({ loading: true, error: null });
        try {
          const { data } = await getDashboard();
          const raw = data.data;
          set({ dashboard: raw, lastFetched: Date.now(), loading: false });
          return get().enrichDashboard(raw);
        } catch (err) {
          set({
            loading: false,
            error: err.response?.data?.message || 'Failed to load dashboard',
          });
          return dashboard ? get().enrichDashboard(dashboard) : null;
        }
      },

      enrichDashboard: (data) => {
        if (!data) return null;
        const pending = useSalesStore.getState().pendingSales;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayPending = pending.filter((s) => new Date(s.createdAt) >= today);
        const pendingTotal = todayPending.reduce(
          (sum, s) => sum + Number(s.totalAmount || 0),
          0
        );
        const pendingRecent = todayPending.slice(0, 5);
        const recentSales = [...pendingRecent, ...(data.recentSales || [])].slice(0, 5);

        return {
          ...data,
          todaySalesTotal: Number(data.todaySalesTotal || 0) + pendingTotal,
          todaySalesCount: (data.todaySalesCount || 0) + todayPending.length,
          recentSales,
        };
      },

      fetchSalesTrend: async (mode, year, force = false) => {
        const key = trendKey(mode, year);
        const { trendByKey, trendLastFetched } = get();
        const cached = trendByKey[key];
        const last = trendLastFetched[key];

        if (!force && cached && !isStale(last)) {
          return cached;
        }
        if (!getIsOnline()) {
          return cached || null;
        }

        set({ trendLoading: true });
        try {
          const { data } = await getSalesTrend({ mode, year });
          const trend = data.data;
          set({
            trendByKey: { ...get().trendByKey, [key]: trend },
            trendLastFetched: { ...get().trendLastFetched, [key]: Date.now() },
            trendLoading: false,
          });
          return trend;
        } catch {
          set({ trendLoading: false });
          return cached || null;
        }
      },

      invalidate: () => set({ lastFetched: null }),
    }),
    {
      name: 'narang-dashboard',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        dashboard: state.dashboard,
        lastFetched: state.lastFetched,
        trendByKey: state.trendByKey,
        trendLastFetched: state.trendLastFetched,
      }),
    }
  )
);
