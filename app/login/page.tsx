'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useTheme } from '@/lib/providers/ThemeProvider';
import { Eye, EyeOff, ArrowRight, TrendingUp, Sun, Moon, Mail, X, ShieldAlert } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
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
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setContactEmail(email || '');
    setShowContactModal(true);
  };

  const handleContactSubmit = () => {
    alert(`Password reset request sent to admin for ${contactEmail || 'your email'}`);
    setShowContactModal(false);
    setContactEmail('');
    setContactMessage('');
  };

  // Theme styles
  const bgColor = isDark ? 'bg-[#0b0e1a]' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-[#131726]' : 'bg-white';
  const cardBorder = isDark ? 'border-white/10' : 'border-gray-200';
  const cardShadow = isDark ? '' : 'shadow-xl';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-white/40' : 'text-gray-500';
  const inputBg = isDark ? 'bg-white/5' : 'bg-gray-50';
  const inputBorder = isDark ? 'border-white/10' : 'border-gray-200';
  const inputText = isDark ? 'text-white' : 'text-gray-900';
  const placeholder = isDark ? 'placeholder-white/20' : 'placeholder-gray-400';
  const rightBg = isDark ? 'bg-gradient-to-br from-blue-600/10 to-blue-800/10' : 'bg-gradient-to-br from-blue-50 to-indigo-50';
  const rightText = isDark ? 'text-white' : 'text-gray-900';
  const rightSubtext = isDark ? 'text-white/40' : 'text-gray-600';
  const divider = isDark ? 'border-white/10' : 'border-gray-200';
  const dividerText = isDark ? 'text-white/20' : 'text-gray-400';
  const featureText = isDark ? 'text-white/60' : 'text-gray-600';
  const modalBg = isDark ? 'bg-[#131726]' : 'bg-white';
  const modalBorder = isDark ? 'border-white/10' : 'border-gray-200';

  return (
    <div className={`min-h-screen flex ${bgColor} transition-colors duration-300 relative`}>
      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className={`fixed top-4 right-4 z-50 p-2.5 rounded-xl ${
          isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
        } transition-all duration-300 backdrop-blur-sm`}
      >
        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      {/* Left Side - Login Form */}
      <div className="w-full lg:w-3/5 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className={`font-semibold ${textColor}`}>Margin Monitor</span>
          </div>

          {/* Login Card with Border */}
          <div className={`${cardBg} ${cardBorder} border ${cardShadow} rounded-2xl p-8 transition-colors duration-300`}>
            <h1 className={`text-2xl font-bold ${textColor}`}>Welcome Back</h1>
            <p className={`text-sm ${textMuted} mt-1 mb-6`}>Sign in to your account</p>

            {loggedOutReason && (
              <div className="mb-4 flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-500 text-sm">
                <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{loggedOutReason}</span>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-white/60' : 'text-gray-700'} mb-1.5`}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-4 py-3 ${inputBg} ${inputBorder} border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${inputText} ${placeholder}`}
                  placeholder="you@company.com"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-white/60' : 'text-gray-700'} mb-1.5`}>Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full px-4 py-3 ${inputBg} ${inputBorder} border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${inputText} ${placeholder} pr-12`}
                    placeholder="Enter your password"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/30 hover:text-white/60' : 'text-gray-400 hover:text-gray-600'} transition`}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <div className="flex justify-end mt-1.5">
                  <button 
                    type="button" 
                    onClick={handleForgotPassword}
                    className="text-sm text-blue-400 hover:text-blue-300 transition"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className={`w-4 h-4 rounded ${isDark ? 'bg-white/5 border-white/10' : 'border-gray-300 text-blue-600'} focus:ring-2 focus:ring-blue-500`}
                  />
                  <span className={`text-sm ${isDark ? 'text-white/40' : 'text-gray-600'}`}>Remember me</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium py-3 rounded-xl transition shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  'Signing in...'
                ) : (
                  <>
                    Sign In
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div className={`flex items-center gap-3 mt-6`}>
              <div className={`flex-1 h-px ${divider}`} />
              <span className={`text-xs ${dividerText}`}>Secure JWT Login</span>
              <div className={`flex-1 h-px ${divider}`} />
            </div>

            <p className={`text-center text-sm ${isDark ? 'text-white/40' : 'text-gray-500'} mt-6`}>
              Don't have an account?{' '}
              <button type="button" className="text-blue-400 hover:text-blue-300 transition">
                Contact Admin
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Platform Info */}
      <div className={`hidden lg:flex lg:w-2/5 ${rightBg} items-center justify-center p-8 transition-colors duration-300`}>
        <div className="max-w-sm">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-2xl shadow-blue-500/20">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <h2 className={`text-2xl font-bold ${rightText}`}>Billing &amp; Finance Platform</h2>
          <p className={`text-sm ${rightSubtext} mt-3 leading-relaxed`}>
            Manage your billing, track projections, and gain financial insights all in one place.
          </p>

          <div className={`mt-8 pt-8 border-t ${divider}`}>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className={`text-sm ${featureText}`}>Real-time financial insights</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <span className={`text-sm ${featureText}`}>Automated billing &amp; invoicing</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-purple-400" />
                <span className={`text-sm ${featureText}`}>Enterprise-grade security</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Admin Modal for Forgot Password */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className={`${modalBg} ${modalBorder} border rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl transition-colors duration-300`}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className={`text-lg font-semibold ${textColor}`}>Contact Admin</h3>
                  <p className={`text-sm ${textMuted}`}>Request password reset</p>
                </div>
              </div>
              <button
                onClick={() => setShowContactModal(false)}
                className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'} transition`}
              >
                <X className={`w-5 h-5 ${isDark ? 'text-white/60' : 'text-gray-500'}`} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-white/60' : 'text-gray-700'} mb-1.5`}>Email</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className={`w-full px-4 py-2.5 ${inputBg} ${inputBorder} border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${inputText} ${placeholder}`}
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-white/60' : 'text-gray-700'} mb-1.5`}>Message</label>
                <textarea
                  rows={3}
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  className={`w-full px-4 py-2.5 ${inputBg} ${inputBorder} border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${inputText} ${placeholder} resize-none`}
                  placeholder="I need help resetting my password..."
                />
              </div>

              <button
                onClick={handleContactSubmit}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium py-2.5 rounded-xl transition"
              >
                Send Request
              </button>

              <p className={`text-center text-xs ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                An admin will contact you shortly
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
