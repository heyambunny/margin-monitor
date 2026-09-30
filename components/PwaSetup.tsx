'use client';

import { useEffect, useState } from 'react';
import { Share, PlusSquare, X } from 'lucide-react';
import { useTheme } from '@/lib/providers/ThemeProvider';
import { isStandalone } from '@/lib/pwa';

// Registers the service worker (production only) and keeps the browser/OS
// status-bar colour in step with the app theme.
export function PwaSetup() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {});
    } else {
      // Keep dev free of a stale worker left over from a production build.
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
    }
  }, []);

  useEffect(() => {
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = isDark ? '#0b0e1a' : '#f9fafb';
  }, [isDark]);

  return null;
}

// One-time "Add to Home Screen" hint for iPhone/iPad Safari users, which has
// no install prompt of its own. Hidden once installed or dismissed.
export function IosInstallHint() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
    let dismissed = false;
    try { dismissed = localStorage.getItem('iosInstallHintDismissed') === '1'; } catch {}
    setShowIosHint(isIos && !isStandalone() && !dismissed);
  }, []);

  if (!showIosHint) return null;

  const dismiss = () => {
    setShowIosHint(false);
    try { localStorage.setItem('iosInstallHintDismissed', '1'); } catch {}
  };

  return (
    <div
      className="fixed inset-x-3 z-[70] animate-in fade-in slide-in-from-bottom-4 duration-300"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
    >
      <div className={`relative flex items-start gap-3 p-4 rounded-2xl shadow-2xl border ${
        isDark ? 'bg-[#1b2033] border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'
      }`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" className="h-11 w-11 rounded-xl shrink-0" />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold">Install Margin Monitor</p>
          <p className={`mt-0.5 text-xs leading-relaxed ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
            Tap <Share className="inline h-3.5 w-3.5 -mt-0.5" /> Share, then{' '}
            <span className="whitespace-nowrap"><PlusSquare className="inline h-3.5 w-3.5 -mt-0.5" /> Add to Home Screen</span>{' '}
            to open it like an app and stay signed in.
          </p>
        </div>
        <button onClick={dismiss} aria-label="Dismiss" className={`p-1 -m-1 rounded-lg ${isDark ? 'text-white/50' : 'text-gray-400'}`}>
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
