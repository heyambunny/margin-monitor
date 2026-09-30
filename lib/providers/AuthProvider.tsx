'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { getHomeForRole } from '@/lib/roles';
import { API_URL } from '@/lib/api';
import { isStandalone, refreshSession, saveToken, clearToken, isAuthRejection, userFromStoredToken } from '@/lib/pwa';

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
      // Validates the saved session and renews it in one call, so the
      // installed app stays signed in as long as it's opened now and then.
      refreshSession()
        .then((u) => setUser(u))
        .catch((err) => {
          if (isAuthRejection(err)) {
            clearToken();
            return;
          }
          // Couldn't reach the server: keep the session and carry on with the
          // identity in the (unexpired) token rather than signing the user out.
          const cached = userFromStoredToken();
          if (cached) setUser(cached as User);
          else clearToken();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await axios.post(`${API_URL}/api/login`, { email, password, app: isStandalone() });
    const { access_token, user } = res.data;
    saveToken(access_token);
    setUser(user);
    router.push(getHomeForRole(user.role_id));
  };

  const logout = (reason?: 'inactivity') => {
    clearToken();
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
