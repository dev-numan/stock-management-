import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from './storage';

export const profitReportKey = (mode, year, month, day) => {
  if (mode === 'all') return 'all';
  if (mode === 'year') return `year-${year}`;
  if (mode === 'month') return `month-${year}-${month}-${day}`;
  return `day-${year}-${month}-${day}`;
};

export const reportPeriodKey = (mode, year, month, day) => {
  if (mode === 'all') return 'all';
  if (mode === 'year') return `year-${year}`;
  if (mode === 'month') return `month-${year}-${month}`;
  return `day-${year}-${month}-${day}`;
};

export const useOfflineCacheStore = create(
  persist(
    (set, get) => ({
      advanceEntriesByPartyId: {},
      supplierLedgerByPartyId: {},
      salesById: {},
      creditSales: [],
      profitReportsByKey: {},
      reportsByPeriodKey: {},
      stockValuation: null,
      lastBootstrapAt: null,

      applyBootstrap: (payload) => {
        const salesById = {};
        for (const sale of payload.sales || []) {
          if (sale?.id) salesById[sale.id] = sale;
        }
        set({
          advanceEntriesByPartyId: payload.advanceEntriesByPartyId || {},
          supplierLedgerByPartyId: payload.supplierLedgerByPartyId || {},
          salesById,
          creditSales: payload.creditSales || [],
          profitReportsByKey: payload.profitReports || {},
          reportsByPeriodKey: payload.reportsByPeriodKey || {},
          stockValuation: payload.stockValuation ?? null,
          lastBootstrapAt: payload.syncedAt || new Date().toISOString(),
        });
      },

      appendAdvanceEntry: (partyId, entry) => {
        const current = get().advanceEntriesByPartyId[partyId] || [];
        get().setAdvanceEntries(partyId, [entry, ...current]);
      },

      removeAdvanceEntry: (partyId, entryId) => {
        const current = get().advanceEntriesByPartyId[partyId] || [];
        get().setAdvanceEntries(
          partyId,
          current.filter((e) => e.id !== entryId)
        );
      },

      appendSupplierLedgerEntry: (partyId, entry) => {
        const current = get().supplierLedgerByPartyId[partyId] || [];
        get().patchSupplierLedger(partyId, [entry, ...current]);
      },

      removeSupplierLedgerEntry: (partyId, entryId) => {
        const current = get().supplierLedgerByPartyId[partyId] || [];
        get().patchSupplierLedger(
          partyId,
          current.filter((e) => e.id !== entryId)
        );
      },

      getReportsBundle: (periodKey) => get().reportsByPeriodKey[periodKey] || null,

      setReportsBundle: (periodKey, bundle) =>
        set({
          reportsByPeriodKey: { ...get().reportsByPeriodKey, [periodKey]: bundle },
        }),

      getStockValuation: () => get().stockValuation,

      getAdvanceEntries: (partyId) => get().advanceEntriesByPartyId[partyId] || [],

      setAdvanceEntries: (partyId, entries) =>
        set({
          advanceEntriesByPartyId: {
            ...get().advanceEntriesByPartyId,
            [partyId]: entries,
          },
        }),

      getSupplierLedger: (partyId) => get().supplierLedgerByPartyId[partyId] || [],

      patchSupplierLedger: (partyId, ledger) =>
        set({
          supplierLedgerByPartyId: {
            ...get().supplierLedgerByPartyId,
            [partyId]: ledger,
          },
        }),

      getSaleById: (id) => get().salesById[id] || null,

      upsertSale: (sale) => {
        if (!sale?.id) return;
        set({ salesById: { ...get().salesById, [sale.id]: sale } });
      },

      removeSale: (id) => {
        const next = { ...get().salesById };
        delete next[id];
        set({ salesById: next });
      },

      getCreditSales: () => get().creditSales,

      getProfitReport: (key) => get().profitReportsByKey[key] || null,

      setProfitReport: (key, report) =>
        set({
          profitReportsByKey: { ...get().profitReportsByKey, [key]: report },
        }),

      clear: () =>
        set({
          advanceEntriesByPartyId: {},
          supplierLedgerByPartyId: {},
          salesById: {},
          creditSales: [],
          profitReportsByKey: {},
          reportsByPeriodKey: {},
          stockValuation: null,
          lastBootstrapAt: null,
        }),
    }),
    {
      name: 'narang-offline-cache',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
