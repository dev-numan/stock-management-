import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useNetworkStore } from '../stores/networkStore';
import { useSyncStore } from '../stores/syncStore';
import { processSyncQueue } from '../services/syncService';
import { useProductsStore } from '../stores/productsStore';
import { useCustomersStore } from '../stores/customersStore';
import { usePartiesStore } from '../stores/partiesStore';
import { getToken } from '../utils/storage';
import { pingHealth } from '../api/health.api';

const computeOnline = (state) =>
  Boolean(state.isConnected && state.isInternetReachable !== false);

export function useNetworkSync() {
  const setOnline = useNetworkStore((s) => s.setOnline);

  useEffect(() => {
    useSyncStore.getState().hydrate();

    const refreshCaches = async () => {
      const token = await getToken();
      if (!token) return;
      await Promise.all([
        useProductsStore.getState().fetchProducts(true),
        useCustomersStore.getState().fetchCustomers(true),
        usePartiesStore.getState().fetchParties(true),
      ]);
    };

    const handleOnline = async (netOnline) => {
      setOnline(netOnline);
      if (!netOnline) return;

      try {
        await pingHealth();
      } catch {
        return;
      }

      await processSyncQueue();
      await refreshCaches();
    };

    const unsub = NetInfo.addEventListener((state) => {
      handleOnline(computeOnline(state));
    });

    NetInfo.fetch().then((state) => handleOnline(computeOnline(state)));

    return () => unsub();
  }, [setOnline]);
}
