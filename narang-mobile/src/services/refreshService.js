import { useDashboardStore } from '../stores/dashboardStore';
import { useProductsStore } from '../stores/productsStore';
import { useCustomersStore } from '../stores/customersStore';
import { usePartiesStore } from '../stores/partiesStore';
import { useSalesStore } from '../stores/salesStore';
import { localDataService } from './localDataService';
import { getIsOnline } from '../stores/networkStore';
import { bootstrapOfflineCache } from './offlineBootstrap';

/** Clear stale read caches and refetch from server (does not delete pending writes). */
export async function refreshAllData() {
  const dashboard = useDashboardStore.getState();
  dashboard.invalidate();
  dashboard.invalidateTrends();

  useProductsStore.setState({ lastFetched: null });
  usePartiesStore.setState({ lastFetched: null });
  useSalesStore.getState().invalidateAll();

  await localDataService.clearReadCaches();

  if (!getIsOnline()) {
    return { offline: true };
  }

  await Promise.all([
    dashboard.fetchDashboard(true),
    useProductsStore.getState().fetchProducts(true),
    useCustomersStore.getState().fetchCustomers(true),
    usePartiesStore.getState().fetchParties(true),
    bootstrapOfflineCache({ force: true }),
  ]);

  return { offline: false };
}
