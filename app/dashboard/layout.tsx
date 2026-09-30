'use client';

import { useAuth } from '@/lib/providers/AuthProvider';
import { useRouter, usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Sidebar, pageTitleFor } from '@/components/Sidebar';
import { IosInstallHint } from '@/components/PwaSetup';
import { Menu, Gem } from 'lucide-react';
import { SessionManager } from '@/components/SessionManager';
import { SessionProvider } from '@/lib/providers/SessionProvider';
import { useTheme } from '@/lib/providers/ThemeProvider';
import { isPageAllowed, getHomeForRole } from '@/lib/roles';
import { Toaster } from 'react-hot-toast';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Sidebar collapsed state is remembered per browser.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem('sidebarCollapsed') === '1');
    } catch {}
  }, []);
  // Below lg (1024px) the sidebar turns into a slide-in drawer.
  const [isDesktop, setIsDesktop] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => { setIsDesktop(mq.matches); if (mq.matches) setMobileOpen(false); };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  useEffect(() => { setMobileOpen(false); }, [pathname]);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      try { localStorage.setItem('sidebarCollapsed', c ? '0' : '1'); } catch {}
      return !c;
    });
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  // Each role only gets a subset of pages (mirrors the old app's per-role
  // tabs). This is UI-level convenience - the backend enforces the same
  // rules for real on every API call, so this just avoids landing a user
  // on a page that will only ever show them 403s.
  useEffect(() => {
    if (!loading && user && !isPageAllowed(user.role_id, pathname)) {
      router.replace(getHomeForRole(user.role_id));
    }
  }, [loading, user, pathname, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  // Don't flash the disallowed page's content while the redirect above is in flight.
  if (!isPageAllowed(user.role_id, pathname)) return null;

  const bgColor = isDark ? 'bg-[#0b0e1a]' : 'bg-gray-50';

  return (
    <SessionProvider>
      <div className={`flex min-h-screen ${bgColor} transition-colors duration-300`}>
        <SessionManager />
        <IosInstallHint />
        <Toaster
          position={isDesktop ? 'bottom-right' : 'top-center'}
          toastOptions={{
            style: isDark
              ? { background: '#1b2033', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', fontSize: 13 }
              : { fontSize: 13 },
          }}
        />
        <Sidebar
          onLogout={logout}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
          isDesktop={isDesktop}
          mobileOpen={mobileOpen}
          onCloseMobile={closeMobile}
        />

        {/* Mobile top bar */}
        <header
          className={`lg:hidden fixed inset-x-0 top-0 z-30 border-b backdrop-blur-md ${isDark ? 'bg-[#0b0e1a]/85 border-white/5' : 'bg-white/85 border-gray-200'}`}
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="h-14 flex items-center gap-3 px-3">
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className={`p-2 -ml-1 rounded-lg ${isDark ? 'text-white hover:bg-white/5' : 'text-gray-900 hover:bg-gray-100'} transition`}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Gem className="h-4 w-4 text-white" />
            </div>
            <span className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{pageTitleFor(pathname)}</span>
          </div>
        </header>

        <main
          className={`flex-1 min-w-0 ml-0 ${collapsed ? 'lg:ml-[72px]' : 'lg:ml-64'} px-3 sm:px-4 pt-[calc(env(safe-area-inset-top)+4.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)] lg:p-4 transition-[margin] duration-300 ease-out`}
        >
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </SessionProvider>
  );
}
