import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useNetworkStore } from '../stores/networkStore';
import { processSyncQueue } from '../services/syncService';
import { useProductsStore } from '../stores/productsStore';
import { useCategoriesStore } from '../stores/categoriesStore';
import { useCustomersStore } from '../stores/customersStore';
import { getToken } from '../utils/storage';

const computeOnline = (state) =>
  Boolean(state.isConnected && state.isInternetReachable !== false);

export function useNetworkSync() {
  const setOnline = useNetworkStore((s) => s.setOnline);

  useEffect(() => {
    const refreshCaches = async () => {
      const token = await getToken();
      if (!token) return;
      await Promise.all([
        useProductsStore.getState().fetchProducts(true),
        useCategoriesStore.getState().fetchCategories(true),
        useCustomersStore.getState().fetchCustomers(true),
      ]);
    };

    const handleOnline = async (online) => {
      setOnline(online);
      if (online) {
        await processSyncQueue();
        await refreshCaches();
      }
    };

    const unsub = NetInfo.addEventListener((state) => {
      handleOnline(computeOnline(state));
    });

    NetInfo.fetch().then((state) => handleOnline(computeOnline(state)));

    return () => unsub();
  }, [setOnline]);
}
