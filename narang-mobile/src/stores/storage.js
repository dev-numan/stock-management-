import AsyncStorage from '@react-native-async-storage/async-storage';

export const zustandStorage = {
  getItem: async (name) => AsyncStorage.getItem(name),
  setItem: async (name, value) => AsyncStorage.setItem(name, value),
  removeItem: async (name) => AsyncStorage.removeItem(name),
};

export const STALE_MS = 5 * 60 * 1000;

export const isStale = (lastFetched) => !lastFetched || Date.now() - lastFetched > STALE_MS;
