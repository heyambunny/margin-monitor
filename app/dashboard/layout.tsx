'use client';

import { useAuth } from '@/lib/providers/AuthProvider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { SessionManager } from '@/components/SessionManager';
import { SessionProvider } from '@/lib/providers/SessionProvider';
import { useTheme } from '@/lib/providers/ThemeProvider';
import { isPageAllowed, getHomeForRole } from '@/lib/roles';

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
        <Sidebar onLogout={logout} />
        <main className="flex-1 min-w-0 ml-64 p-4">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </SessionProvider>
  );
}
