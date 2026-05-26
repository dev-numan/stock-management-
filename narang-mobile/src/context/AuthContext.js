import React, { createContext, useContext, useEffect, useState } from 'react';
import { login as loginApi } from '../api/auth.api';
import { getToken, setToken, getUser, setUser, clearAuth } from '../utils/storage';
import { useProductsStore } from '../stores/productsStore';
import { useCategoriesStore } from '../stores/categoriesStore';
import { useCustomersStore } from '../stores/customersStore';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const token = await getToken();
        const storedUser = await getUser();
        if (token && storedUser) {
          setUserState(storedUser);
          await Promise.all([
            useProductsStore.getState().fetchProducts(true),
            useCategoriesStore.getState().fetchCategories(true),
            useCustomersStore.getState().fetchCustomers(true),
          ]);
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
      useCategoriesStore.getState().fetchCategories(true),
      useCustomersStore.getState().fetchCustomers(true),
    ]);
    return userData;
  };

  const logout = async () => {
    await clearAuth();
    setUserState(null);
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
