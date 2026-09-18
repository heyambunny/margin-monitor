'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Cookies from 'js-cookie';
import { getHomeForRole } from '@/lib/roles';
import { API_URL } from '@/lib/api';

interface User {
  id: number;
  name: string;
  email: string;
  role_id: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: (reason?: 'inactivity') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get(`${API_URL}/api/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        setUser(res.data);
      })
      .catch(() => {
        localStorage.removeItem('token');
        Cookies.remove('token');
      })
      .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await axios.post(`${API_URL}/api/login`, { email, password });
    const { access_token, user } = res.data;
    localStorage.setItem('token', access_token);
    Cookies.set('token', access_token);
    setUser(user);
    router.push(getHomeForRole(user.role_id));
  };

  const logout = (reason?: 'inactivity') => {
    localStorage.removeItem('token');
    Cookies.remove('token');
    // sessionStorage rather than a ?reason= query param: setUser(null) here
    // also triggers the dashboard layout's own "no user -> /login" redirect,
    // which races this push and would otherwise strip the query string.
    if (reason) {
      sessionStorage.setItem('logoutReason', reason);
    }
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
