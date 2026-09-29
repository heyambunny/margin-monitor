'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useTheme } from '@/lib/providers/ThemeProvider';
import {
  Eye, EyeOff, ArrowRight, Sun, Moon, Mail, Lock, ShieldAlert, ShieldCheck, Gem, AlertCircle,
  TrendingUp, Receipt, Wallet, Info, KeyRound,
} from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState<'forgot' | 'account' | null>(null);
  const [loggedOutReason, setLoggedOutReason] = useState('');
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    const reason = sessionStorage.getItem('logoutReason');
    if (reason === 'inactivity') {
      setLoggedOutReason('You were logged out due to inactivity. Please sign in again.');
      sessionStorage.removeItem('logoutReason');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
      setShake((n) => n + 1);
    } finally {
      setLoading(false);
    }
  };

  const text = isDark ? 'text-white' : 'text-gray-900';
  const muted = isDark ? 'text-white/50' : 'text-gray-500';
  const label = isDark ? 'text-white/70' : 'text-gray-700';
  const border = isDark ? 'border-white/10' : 'border-gray-200';
  const input = `${isDark ? 'bg-white/[0.04] border-white/10 text-white placeholder-white/25' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'} border rounded-xl focus:ring-2 focus:ring-blue-500/60 focus:border-transparent outline-none transition`;

  return (
    <div className={`min-h-screen flex ${isDark ? 'bg-[#0b0e1a]' : 'bg-gray-50'} transition-colors duration-300`}>
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-[46%] relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white">
        {/* Soft animated glows */}
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-cyan-400/30 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-fuchsia-500/30 blur-3xl animate-pulse [animation-delay:1.5s]" />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '22px 22px' }}
        />

        <div className="relative z-10 flex flex-col justify-between w-full p-12">
          <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center ring-1 ring-white/25">
              <Gem className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold leading-tight">Margin Monitor</p>
              <p className="text-xs text-white/70">Billing & finance platform</p>
            </div>
          </div>

          {/* Floating preview cards */}
          <div className="relative h-72 my-10">
            <div className="absolute left-0 top-2 w-64 rounded-2xl bg-white/10 backdrop-blur-md ring-1 ring-white/20 p-4 shadow-2xl animate-in fade-in slide-in-from-left-4 duration-700">
              <div className="flex items-center gap-2 text-xs text-white/75">
                <TrendingUp className="h-3.5 w-3.5" /> Margin trend
              </div>
              <div className="mt-2 h-5 w-20 rounded-md bg-white/25" />
              <svg viewBox="0 0 200 50" className="w-full h-12 mt-2">
                <defs>
                  <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="white" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="white" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0 40 L25 34 L50 36 L75 26 L100 29 L125 18 L150 21 L175 10 L200 6 L200 50 L0 50 Z" fill="url(#spark)" />
                <path d="M0 40 L25 34 L50 36 L75 26 L100 29 L125 18 L150 21 L175 10 L200 6" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="absolute right-4 top-24 w-56 rounded-2xl bg-white/10 backdrop-blur-md ring-1 ring-white/20 p-4 shadow-2xl animate-in fade-in slide-in-from-right-4 duration-700 [animation-delay:150ms] fill-mode-both">
              <div className="flex items-center gap-2 text-xs text-white/75">
                <Receipt className="h-3.5 w-3.5" /> Invoice billed
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center">
                  <Receipt className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 w-24 rounded bg-white/30" />
                  <div className="h-2 w-14 rounded bg-white/20" />
                </div>
              </div>
            </div>
            <div className="absolute left-10 bottom-0 w-60 rounded-2xl bg-white/10 backdrop-blur-md ring-1 ring-white/20 p-4 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700 [animation-delay:300ms] fill-mode-both">
              <div className="flex items-center gap-2 text-xs text-white/75">
                <Wallet className="h-3.5 w-3.5" /> Billed vs projected
              </div>
              <div className="mt-3 h-2 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full w-3/5 rounded-full bg-white" />
              </div>
              <div className="flex justify-between text-[11px] text-white/75 mt-1.5">
                <span>Billed</span><span>Projected</span>
              </div>
            </div>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
            <h2 className="text-3xl font-bold leading-tight">Every projection, invoice<br />and margin in one place.</h2>
            <p className="text-sm text-white/75 mt-3 max-w-md">
              Plan projections, convert them to billing, and keep an eye on margins and pending amounts across every client.
            </p>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className={`absolute top-5 right-5 p-2.5 rounded-xl border ${border} ${isDark ? 'bg-white/5 hover:bg-white/10 text-white/80' : 'bg-white hover:bg-gray-100 text-gray-600'} transition`}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* Compact brand for small screens */}
          <div className="flex lg:hidden items-center gap-2.5 mb-8">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Gem className="h-4 w-4 text-white" />
            </div>
            <span className={`font-semibold ${text}`}>Margin Monitor</span>
          </div>

          <h1 className={`text-3xl font-bold ${text}`}>Welcome back 👋</h1>
          <p className={`text-sm ${muted} mt-1.5 mb-7`}>Sign in to continue to your dashboard.</p>

          {loggedOutReason && (
            <div className="mb-4 flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 text-sm animate-in fade-in slide-in-from-top-1">
              <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{loggedOutReason}</span>
            </div>
          )}

          {error && (
            <div
              key={shake}
              className="mb-4 flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm animate-[shake_0.4s_ease-in-out]"
            >
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className={`block text-sm font-medium ${label} mb-1.5`}>Email</label>
              <div className="relative">
                <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 ${muted}`} />
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 text-sm ${input}`}
                  placeholder="you@company.com"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className={`text-sm font-medium ${label}`}>Password</label>
                <button
                  type="button"
                  onClick={() => setShowHelp(showHelp === 'forgot' ? null : 'forgot')}
                  className="text-xs text-blue-400 hover:text-blue-300 transition"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 ${muted}`} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={(e) => setCapsLock(e.getModifierState('CapsLock'))}
                  onKeyDown={(e) => setCapsLock(e.getModifierState('CapsLock'))}
                  onBlur={() => setCapsLock(false)}
                  className={`w-full pl-10 pr-11 py-3 text-sm ${input}`}
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded ${isDark ? 'text-white/40 hover:text-white/80' : 'text-gray-400 hover:text-gray-700'} transition`}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {capsLock && (
                <p className="flex items-center gap-1 text-xs text-amber-500 mt-1.5 animate-in fade-in">
                  <KeyRound className="h-3 w-3" /> Caps Lock is on
                </p>
              )}
            </div>

            {showHelp === 'forgot' && (
              <HelpNote isDark={isDark}>
                Password resets are handled by your administrator. Ask them to set a new password for{' '}
                <span className="font-medium">{email || 'your account'}</span>, then sign in with it here.
              </HelpNote>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="group w-full relative overflow-hidden bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium py-3 rounded-xl transition shadow-lg shadow-blue-500/30 active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className={`flex-1 h-px ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
            <span className={`flex items-center gap-1.5 text-[11px] ${muted}`}>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Secure sign-in
            </span>
            <div className={`flex-1 h-px ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
          </div>

          <p className={`text-center text-sm ${muted}`}>
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => setShowHelp(showHelp === 'account' ? null : 'account')}
              className="text-blue-400 hover:text-blue-300 font-medium transition"
            >
              Contact your admin
            </button>
          </p>
          {showHelp === 'account' && (
            <div className="mt-3">
              <HelpNote isDark={isDark}>
                Accounts are created by an administrator from the Client Access page. Ask them to add you and share your login details.
              </HelpNote>
            </div>
          )}

          <p className={`text-center text-[11px] ${muted} mt-10`}>© {new Date().getFullYear()} Evolve Brands Pvt Ltd</p>
        </div>
      </div>
    </div>
  );
}

function HelpNote({ isDark, children }: { isDark: boolean; children: React.ReactNode }) {
  return (
    <div className={`flex items-start gap-2 p-3 rounded-xl text-xs leading-relaxed border animate-in fade-in slide-in-from-top-1 duration-200 ${
      isDark ? 'bg-blue-500/10 border-blue-500/20 text-blue-200' : 'bg-blue-50 border-blue-100 text-blue-800'
    }`}>
      <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
