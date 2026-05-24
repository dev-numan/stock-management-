import { create } from 'zustand';

export const useNetworkStore = create((set) => ({
  isOnline: true,
  setOnline: (isOnline) => set({ isOnline }),
}));

export const getIsOnline = () => useNetworkStore.getState().isOnline;
