import { localDataService } from './localDataService';
import { clearIdMap } from './syncService';
import { useSyncStore } from '../stores/syncStore';
import { useOfflineCacheStore } from '../stores/offlineCacheStore';
import { useProductsStore } from '../stores/productsStore';
import { useCustomersStore } from '../stores/customersStore';
import { useSuppliersStore } from '../stores/suppliersStore';
import { usePartiesStore } from '../stores/partiesStore';
import { usePurchasesStore } from '../stores/purchasesStore';
import { useExpensesStore } from '../stores/expensesStore';
import { useSalesStore } from '../stores/salesStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useDashboardStore } from '../stores/dashboardStore';
import { useCategoriesStore } from '../stores/categoriesStore';

/** Wipe persisted business data on logout (keeps language preference). */
export async function clearSessionData() {
  useSyncStore.getState().clearQueue();
  clearIdMap();
  await localDataService.savePendingWrites([]);
  await localDataService.setMeta({ idMap: {}, lastSyncAt: null });
  await localDataService.clearReadCaches();

  useOfflineCacheStore.getState().clear();

  useProductsStore.setState({ products: [], lastFetched: null, loading: false, error: null });
  useCustomersStore.setState({ customers: [], lastFetched: null, loading: false, error: null });
  useSuppliersStore.setState({ suppliers: [], lastFetched: null, loading: false, error: null });
  usePartiesStore.setState({ parties: [], lastFetched: null, loading: false, error: null });
  usePurchasesStore.setState({ purchases: [], lastFetched: null, loading: false, error: null });
  useExpensesStore.setState({ expenses: [], lastFetched: null, loading: false, error: null });
  useCategoriesStore.setState({ categories: [], lastFetched: null, loading: false, error: null });
  useSalesStore.setState({ pendingSales: [], salesByKey: {}, lastFetchedByKey: {} });
  useSettingsStore.setState({ settings: useSettingsStore.getState().settings, lastFetched: null });
  useDashboardStore.setState({
    dashboard: null,
    error: null,
    lastFetched: null,
    trendByKey: {},
    trendLastFetched: {},
  });
}
