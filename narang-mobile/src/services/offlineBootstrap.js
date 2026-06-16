import { getBootstrap } from '../api/sync.api';
import { getIsOnline } from '../stores/networkStore';
import { useProductsStore } from '../stores/productsStore';
import { useCustomersStore } from '../stores/customersStore';
import { useSuppliersStore } from '../stores/suppliersStore';
import { usePartiesStore } from '../stores/partiesStore';
import { usePurchasesStore } from '../stores/purchasesStore';
import { useExpensesStore } from '../stores/expensesStore';
import { useDashboardStore } from '../stores/dashboardStore';
import { useSalesStore } from '../stores/salesStore';
import { useOfflineCacheStore } from '../stores/offlineCacheStore';
import { useSettingsStore } from '../stores/settingsStore';
import { mergeServerWithLocal, pendingLocalsFromQueue } from '../utils/mergeLocalEntities';

let bootstrapPromise = null;

const syncPartiesFromLists = (customers, suppliers) => {
  const customerParties = customers.map((c) => ({ ...c, partyType: 'CUSTOMER' }));
  const supplierParties = suppliers.map((s) => ({ ...s, partyType: 'SUPPLIER' }));
  usePartiesStore.setState({
    parties: [...customerParties, ...supplierParties],
    lastFetched: Date.now(),
  });
};

/**
 * Download the full working dataset for offline use (lists, sales, ledgers, reports).
 * Safe to call on login, reconnect, and after a successful sync upload.
 */
export async function bootstrapOfflineCache({ force = true } = {}) {
  if (!getIsOnline()) {
    return { offline: true, skipped: true };
  }

  if (bootstrapPromise && !force) {
    return bootstrapPromise;
  }

  bootstrapPromise = (async () => {
    const { data } = await getBootstrap();
    const payload = data.data;

    const products = mergeServerWithLocal(payload.products || [], useProductsStore.getState().products, {
      pendingFromQueue: pendingLocalsFromQueue(['CREATE_PRODUCT']),
    });
    useProductsStore.setState({ products, lastFetched: Date.now(), loading: false, error: null });

    const customers = mergeServerWithLocal(
      payload.customers || [],
      useCustomersStore.getState().customers,
      { pendingFromQueue: pendingLocalsFromQueue(['CREATE_PARTY', 'CREATE_CUSTOMER']) }
    );
    useCustomersStore.setState({ customers, lastFetched: Date.now(), loading: false });

    const suppliers = mergeServerWithLocal(
      payload.suppliers || [],
      useSuppliersStore.getState().suppliers,
      { pendingFromQueue: pendingLocalsFromQueue(['CREATE_SUPPLIER', 'CREATE_PARTY']) }
    );
    useSuppliersStore.setState({ suppliers, lastFetched: Date.now(), loading: false });

    syncPartiesFromLists(customers, suppliers);

    usePurchasesStore.setState({
      purchases: mergeServerWithLocal(payload.purchases || [], usePurchasesStore.getState().purchases, {
        pendingFromQueue: pendingLocalsFromQueue(['CREATE_PURCHASE']),
      }),
      lastFetched: Date.now(),
      loading: false,
    });

    useExpensesStore.setState({
      expenses: mergeServerWithLocal(payload.expenses || [], useExpensesStore.getState().expenses, {
        pendingFromQueue: pendingLocalsFromQueue(['CREATE_EXPENSE']),
      }),
      lastFetched: Date.now(),
      loading: false,
    });

    if (payload.dashboard) {
      useDashboardStore.setState({
        dashboard: payload.dashboard,
        lastFetched: Date.now(),
        loading: false,
      });
    }

    if (payload.salesTrends) {
      useDashboardStore.setState({
        trendByKey: { ...useDashboardStore.getState().trendByKey, ...payload.salesTrends },
        trendLastFetched: Object.fromEntries(
          Object.keys(payload.salesTrends).map((k) => [k, Date.now()])
        ),
      });
    }

    useSalesStore.getState().setAllSales(payload.sales || []);
    useSettingsStore.getState().applyFromBootstrap(payload.settings);
    useOfflineCacheStore.getState().applyBootstrap(payload);

    return { ok: true, syncedAt: payload.syncedAt };
  })();

  try {
    return await bootstrapPromise;
  } finally {
    bootstrapPromise = null;
  }
}
