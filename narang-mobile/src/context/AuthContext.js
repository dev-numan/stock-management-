import React, { createContext, useContext, useEffect, useState } from 'react';
import { login as loginApi, getMe } from '../api/auth.api';
import { getToken, setToken, getUser, setUser, clearAuth, migrateLegacyAuth } from '../utils/storage';
import { setSessionExpiredHandler } from '../utils/authSession';
import { useProductsStore } from '../stores/productsStore';
import { useCustomersStore } from '../stores/customersStore';
import { usePartiesStore } from '../stores/partiesStore';
import { useDashboardStore } from '../stores/dashboardStore';

const AuthContext = createContext(null);

// Force-refresh the core caches without blocking navigation. Screens already
// render from persisted store state, so the user lands instantly and fresh
// data fills in when (and if) the network responds.
const refreshDataInBackground = () => {
  useProductsStore.getState().fetchProducts(true);
  useCustomersStore.getState().fetchCustomers(true);
  usePartiesStore.getState().fetchParties(true);
};

export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSessionExpiredHandler(() => setUserState(null));
    return () => setSessionExpiredHandler(null);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        await migrateLegacyAuth();
        const token = await getToken();
        const storedUser = await getUser();
        if (!token || !storedUser) return;

        // Stay logged in: render the app immediately from the stored session
        // and persisted store data, even with no/slow internet. We do NOT wait
        // on the network here and we never log the user out on a network error
        // — only a genuine 401 (handled by the axios interceptor) clears auth.
        setUserState(storedUser);

        // Refresh profile + caches in the background; failures are non-fatal.
        getMe()
          .then(async ({ data }) => {
            const userData = data.data;
            await setUser(userData);
            setUserState(userData);
          })
          .catch(() => {});
        refreshDataInBackground();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const login = async (email, password) => {
    const { data } = await loginApi({ email, password });
    const { token, user: userData } = data.data;
    await setToken(token);
    await setUser(userData);
    setUserState(userData);
    // Don't block entry into the app on the initial data load — refresh in the
    // background so login feels instant even on a slow connection.
    refreshDataInBackground();
    return userData;
  };

  const logout = async () => {
    await clearAuth();
    setUserState(null);
    useDashboardStore.setState({ dashboard: null, error: null, lastFetched: null });
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
