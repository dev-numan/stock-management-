import { useDashboardStore } from '../stores/dashboardStore';
import { useProductsStore } from '../stores/productsStore';
import { useCustomersStore } from '../stores/customersStore';
import { useSalesStore } from '../stores/salesStore';
import { localDataService } from './localDataService';
import { getIsOnline } from '../stores/networkStore';

/** Clear stale read caches and refetch from server (does not delete pending writes). */
export async function refreshAllData() {
  const dashboard = useDashboardStore.getState();
  dashboard.invalidate();
  dashboard.invalidateTrends();

  useProductsStore.setState({ lastFetched: null });
  useCustomersStore.setState({ lastFetched: null });
  useSalesStore.getState().invalidateAll();

  await localDataService.clearReadCaches();

  if (!getIsOnline()) {
    return { offline: true };
  }

  await Promise.all([
    dashboard.fetchDashboard(true),
    useProductsStore.getState().fetchProducts(true),
    useCustomersStore.getState().fetchCustomers(true),
  ]);

  return { offline: false };
}
