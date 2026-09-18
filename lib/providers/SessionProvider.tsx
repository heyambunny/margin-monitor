'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useAuth } from '@/lib/providers/AuthProvider';

// Kept comfortably under the backend's 30-minute JWT expiry (see
// backend/auth/jwt_handler.py) so the warning always has time to show
// before the token itself would go stale.
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const WARNING_SECONDS = 60;
const WARNING_AT_MS = IDLE_TIMEOUT_MS - WARNING_SECONDS * 1000;

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'] as const;

interface SessionContextType {
  secondsUntilLogout: number;
  isWarning: boolean;
  stayLoggedIn: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  const lastActivityRef = useRef(Date.now());
  const warningRef = useRef(false);
  const [secondsUntilLogout, setSecondsUntilLogout] = useState(IDLE_TIMEOUT_MS / 1000);
  const [isWarning, setIsWarning] = useState(false);

  const stayLoggedIn = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningRef.current = false;
    setIsWarning(false);
    setSecondsUntilLogout(IDLE_TIMEOUT_MS / 1000);
  }, []);

  useEffect(() => {
    if (!user) return;

    stayLoggedIn();

    // Once the warning is up, activity elsewhere on the page no longer
    // resets the clock - the user has to explicitly choose to stay, same
    // as a bank's session-timeout prompt.
    const handleActivity = () => {
      if (!warningRef.current) {
        lastActivityRef.current = Date.now();
      }
    };

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, handleActivity, { passive: true }));

    const interval = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current;
      const remaining = Math.max(0, Math.ceil((IDLE_TIMEOUT_MS - idle) / 1000));
      setSecondsUntilLogout(remaining);

      if (!warningRef.current && idle >= WARNING_AT_MS) {
        warningRef.current = true;
        setIsWarning(true);
      }

      if (remaining <= 0) {
        logout('inactivity');
      }
    }, 1000);

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, handleActivity));
      clearInterval(interval);
    };
  }, [user, logout, stayLoggedIn]);

  return (
    <SessionContext.Provider value={{ secondsUntilLogout, isWarning, stayLoggedIn }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within SessionProvider');
  return context;
};
