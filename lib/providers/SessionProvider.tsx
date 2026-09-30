'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useAuth } from '@/lib/providers/AuthProvider';
import { isStandalone, refreshSession, isAuthRejection } from '@/lib/pwa';

// Web only: log out after 15 idle minutes. While the user is active the
// 30-minute token is renewed every REFRESH_EVERY_MS, so only real inactivity
// ends a session. The installed app has no idle logout - like a mobile app it
// stays signed in, renewing its 30-day token whenever it's brought back.
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const REFRESH_EVERY_MS = 10 * 60 * 1000;
const APP_REFRESH_EVERY_MS = 60 * 60 * 1000;
const WARNING_SECONDS = 60;
const WARNING_AT_MS = IDLE_TIMEOUT_MS - WARNING_SECONDS * 1000;

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'] as const;

interface SessionContextType {
  secondsUntilLogout: number;
  isWarning: boolean;
  stayLoggedIn: () => void;
  isApp: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  const lastActivityRef = useRef(Date.now());
  const warningRef = useRef(false);
  const [secondsUntilLogout, setSecondsUntilLogout] = useState(IDLE_TIMEOUT_MS / 1000);
  const [isWarning, setIsWarning] = useState(false);
  const [isApp, setIsApp] = useState(false);
  const lastRefreshRef = useRef(Date.now());

  useEffect(() => {
    setIsApp(isStandalone());
  }, []);

  // Renew the token; if the session can't be renewed (expired, account
  // deactivated) sign out rather than leave pages failing silently.
  const renew = useCallback(() => {
    lastRefreshRef.current = Date.now();
    refreshSession().catch((err) => {
      // Only a rejected session signs out; a network blip just retries later.
      if (isAuthRejection(err)) logout();
      else lastRefreshRef.current = Date.now() - REFRESH_EVERY_MS + 60 * 1000; // retry in a minute
    });
  }, [logout]);

  const stayLoggedIn = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningRef.current = false;
    setIsWarning(false);
    setSecondsUntilLogout(IDLE_TIMEOUT_MS / 1000);
  }, []);

  // Installed app: no idle logout, renew when the app returns to the foreground.
  useEffect(() => {
    if (!user || !isApp) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastRefreshRef.current > APP_REFRESH_EVERY_MS) {
        renew();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [user, isApp, renew]);

  useEffect(() => {
    if (!user || isApp) return;

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
        return;
      }

      // Active in the last few minutes and the token is getting old: renew it.
      if (!warningRef.current && idle < 60 * 1000 && Date.now() - lastRefreshRef.current > REFRESH_EVERY_MS) {
        renew();
      }
    }, 1000);

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, handleActivity));
      clearInterval(interval);
    };
  }, [user, isApp, logout, stayLoggedIn, renew]);

  return (
    <SessionContext.Provider value={{ secondsUntilLogout, isWarning, stayLoggedIn, isApp }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within SessionProvider');
  return context;
};
