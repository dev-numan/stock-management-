import React, { createContext, useContext, useEffect, useState } from 'react';
import { login as loginApi, getMe } from '../api/auth.api';
import { getToken, setToken, getUser, setUser, clearAuth, migrateLegacyAuth } from '../utils/storage';
import { setSessionExpiredHandler } from '../utils/authSession';
import { useProductsStore } from '../stores/productsStore';
import { useCustomersStore } from '../stores/customersStore';
import { useDashboardStore } from '../stores/dashboardStore';

const AuthContext = createContext(null);

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

        try {
          const { data } = await getMe();
          const userData = data.data;
          await setUser(userData);
          setUserState(userData);
          await Promise.all([
            useProductsStore.getState().fetchProducts(true),
            useCustomersStore.getState().fetchCustomers(true),
          ]);
        } catch {
          await clearAuth();
          setUserState(null);
        }
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
    await Promise.all([
      useProductsStore.getState().fetchProducts(true),
      useCustomersStore.getState().fetchCustomers(true),
    ]);
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
