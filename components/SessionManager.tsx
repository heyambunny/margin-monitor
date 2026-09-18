'use client';

import { useAuth } from '@/lib/providers/AuthProvider';
import { useSession } from '@/lib/providers/SessionProvider';
import { useTheme } from '@/lib/providers/ThemeProvider';
import { ShieldAlert } from 'lucide-react';

export function SessionManager() {
  const { logout } = useAuth();
  const { isWarning, secondsUntilLogout, stayLoggedIn } = useSession();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!isWarning) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div
        className={`w-full max-w-sm rounded-xl p-6 text-center shadow-2xl ${
          isDark ? 'bg-[#131726] ring-1 ring-white/10' : 'bg-white ring-1 ring-gray-200'
        }`}
      >
        <div
          className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
            isDark ? 'bg-yellow-500/10' : 'bg-yellow-100'
          }`}
        >
          <ShieldAlert className={`h-6 w-6 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
        </div>
        <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Are you still there?
        </h2>
        <p className={`mt-1.5 text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
          For your security, you will be logged out due to inactivity in
        </p>
        <p className={`mt-2 text-3xl font-bold tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {secondsUntilLogout}s
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => logout('inactivity')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              isDark ? 'text-white/60 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Log Out Now
          </button>
          <button
            onClick={stayLoggedIn}
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
          >
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  );
}
