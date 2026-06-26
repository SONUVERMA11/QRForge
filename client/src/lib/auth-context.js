'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('qrforge_token');
      if (!token) { setLoading(false); return; }
      const res = await api.getMe();
      setUser(res.user);
    } catch {
      localStorage.removeItem('qrforge_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const login = async (email, password) => {
    const res = await api.login({ email, password });
    localStorage.setItem('qrforge_token', res.token);
    setUser(res.user);
    return res;
  };

  const register = async (data) => {
    const res = await api.register(data);
    localStorage.setItem('qrforge_token', res.token);
    setUser(res.user);
    return res;
  };

  const logout = async () => {
    await api.logout().catch(() => {});
    localStorage.removeItem('qrforge_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
