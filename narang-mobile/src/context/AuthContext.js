import React, { createContext, useContext, useEffect, useState } from 'react';
import { login as loginApi } from '../api/auth.api';
import { getToken, setToken, getUser, setUser, clearAuth } from '../utils/storage';

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
