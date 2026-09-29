export const formatINR = (value: number | null | undefined) =>
  `₹${Math.round(Number(value) || 0).toLocaleString('en-IN')}`;

// "2026-08-17" -> "17 Aug 2026"; anything unparseable is returned as-is.
export const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return isNaN(d.getTime()) ? value : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const d = new Date(value);
  return isNaN(d.getTime())
    ? value
    : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// Stable accent colour per name, so the same client/user always gets the same avatar.
const AVATAR_COLORS = [
  'from-blue-500 to-cyan-400', 'from-purple-500 to-pink-400', 'from-emerald-500 to-teal-400',
  'from-orange-500 to-amber-400', 'from-rose-500 to-red-400', 'from-indigo-500 to-violet-400',
];
export const avatarColor = (name = '') =>
  AVATAR_COLORS[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % AVATAR_COLORS.length];
