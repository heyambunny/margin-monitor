'use client';

// Shared building blocks for the dashboard's inner pages (everything except
// the main /dashboard page), so they all share one look: gradient page
// header, animated stat cards, filter bar with a "/" search shortcut,
// hoverable tables, pagination, empty/loading states and a slide-over panel.

import { useEffect, useRef, type ReactNode, type ComponentType } from 'react';
import { Search, X, RefreshCw, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Inbox, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useTheme } from '@/lib/providers/ThemeProvider';
import { getPageNumbers } from '@/lib/pagination';
import { avatarColor, formatINR } from '@/lib/format';
import { AnimatedNumber } from '@/components/ui/animated-number';

type IconType = ComponentType<{ className?: string }>;

export function useUi() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  return {
    isDark,
    card: isDark ? 'bg-[#131726]' : 'bg-white',
    border: isDark ? 'border-white/5' : 'border-gray-200',
    rowBorder: isDark ? 'border-white/5' : 'border-gray-100',
    subtle: isDark ? 'bg-white/5' : 'bg-gray-50',
    text: isDark ? 'text-white' : 'text-gray-900',
    textSoft: isDark ? 'text-white/70' : 'text-gray-600',
    muted: isDark ? 'text-white/50' : 'text-gray-500',
    label: isDark ? 'text-white/50' : 'text-gray-600',
    input: `${isDark ? 'bg-white/5 border-white/10 text-white placeholder-white/20' : 'bg-gray-50 border-gray-300 text-gray-800 placeholder-gray-400'} border rounded-lg focus:ring-2 focus:ring-blue-500/60 focus:border-transparent outline-none transition`,
    hoverRow: isDark ? 'hover:bg-blue-500/[0.06]' : 'hover:bg-blue-50/60',
    hoverBtn: isDark ? 'hover:bg-white/5 hover:text-white' : 'hover:bg-gray-100 hover:text-gray-900',
    colorScheme: { colorScheme: isDark ? 'dark' : 'light' } as const,
  };
}

export function PageHeader({
  icon: Icon, title, subtitle, actions, gradient = 'from-blue-500 to-purple-500',
}: { icon: IconType; title: string; subtitle?: ReactNode; actions?: ReactNode; gradient?: string }) {
  const ui = useUi();
  return (
    <div className="mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-3 sm:gap-4 animate-in fade-in slide-in-from-top-1 duration-300">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg shadow-blue-500/20`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className={`text-xl sm:text-2xl font-semibold ${ui.text}`}>{title}</h1>
          {subtitle && <p className={`text-xs sm:text-sm ${ui.muted}`}>{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = '', padded = false }: { children: ReactNode; className?: string; padded?: boolean }) {
  const ui = useUi();
  return <div className={`${ui.card} ${ui.border} border rounded-xl ${padded ? 'p-4' : ''} ${className}`}>{children}</div>;
}

export function RefreshButton({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
  const ui = useUi();
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs ${ui.muted} ${ui.subtle} border ${ui.border} rounded-lg ${ui.hoverBtn} transition disabled:opacity-60`}
    >
      <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
      Refresh
    </button>
  );
}

export function GradientButton({
  children, onClick, disabled, type = 'button', className = '', variant = 'primary', form,
}: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; type?: 'button' | 'submit';
  className?: string; variant?: 'primary' | 'success' | 'warning' | 'danger'; form?: string;
}) {
  const colors = {
    primary: 'from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-blue-500/20',
    success: 'from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-500/20',
    warning: 'from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/20',
    danger: 'from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 shadow-red-500/20',
  }[variant];
  return (
    <button
      type={type}
      form={form}
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-1.5 px-4 py-2 whitespace-nowrap bg-gradient-to-r ${colors} text-white text-sm font-medium rounded-lg shadow-lg active:scale-[0.98] transition disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, onClick, disabled, className = '' }: { children: ReactNode; onClick?: () => void; disabled?: boolean; className?: string }) {
  const ui = useUi();
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`px-4 py-2 text-sm rounded-lg ${ui.muted} ${ui.hoverBtn} transition disabled:opacity-50 ${className}`}>
      {children}
    </button>
  );
}

export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return <div className={`animate-spin ${className} border-2 border-current border-t-transparent rounded-full`} />;
}

// ---------------- Stats ----------------

export type Stat = {
  label: string;
  value: number;
  icon: IconType;
  color?: 'blue' | 'purple' | 'emerald' | 'amber' | 'rose' | 'cyan';
  money?: boolean;
  suffix?: string;
  decimals?: number;
};

const STAT_COLORS = {
  blue: ['from-blue-500/20', 'text-blue-400'],
  purple: ['from-purple-500/20', 'text-purple-400'],
  emerald: ['from-emerald-500/20', 'text-emerald-400'],
  amber: ['from-amber-500/20', 'text-amber-400'],
  rose: ['from-rose-500/20', 'text-rose-400'],
  cyan: ['from-cyan-500/20', 'text-cyan-400'],
};

export function StatGrid({ stats }: { stats: Stat[] }) {
  const ui = useUi();
  const cols = stats.length >= 4 ? 'lg:grid-cols-4' : stats.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2';
  return (
    <div className={`grid grid-cols-2 ${cols} gap-2.5 sm:gap-3 mb-4 sm:mb-6`}>
      {stats.map((s, i) => {
        const [gradient, iconColor] = STAT_COLORS[s.color || 'blue'];
        const scale = s.decimals ? 10 ** s.decimals : 1;
        return (
          <div
            key={s.label}
            className={`relative overflow-hidden p-3 sm:p-4 ${ui.card} rounded-xl border ${ui.border} hover:-translate-y-0.5 hover:shadow-lg ${ui.isDark ? 'hover:shadow-black/30' : 'hover:shadow-gray-200'} transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 fill-mode-both`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} to-transparent pointer-events-none`} />
            <div className="relative flex items-center gap-2 mb-1.5">
              <s.icon className={`h-4 w-4 ${iconColor}`} />
              <span className={`text-xs ${ui.muted}`}>{s.label}</span>
            </div>
            <AnimatedNumber
              value={Math.round(s.value * scale)}
              duration={700}
              format={(v) => (s.money ? formatINR(v / scale) : (v / scale).toLocaleString('en-IN', { maximumFractionDigits: s.decimals || 0 })) + (s.suffix || '')}
              className={`relative block text-base sm:text-lg font-semibold ${ui.text} truncate`}
            />
          </div>
        );
      })}
    </div>
  );
}

// ---------------- Filters ----------------

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <Card className="p-3 mb-4">
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </Card>
  );
}

// Search input; "/" anywhere on the page focuses it.
export function SearchInput({ value, onChange, placeholder = 'Search…' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const ui = useUi();
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(el?.tagName) || el?.isContentEditable;
      if (e.key === '/' && !typing) {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div className="basis-full sm:basis-auto flex-1 sm:min-w-[220px] relative">
      <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${ui.muted}`} />
      <input
        ref={ref}
        type="text"
        placeholder={placeholder}
        className={`w-full pl-9 pr-10 py-2 text-sm ${ui.input}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value ? (
        <button onClick={() => onChange('')} className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded ${ui.muted} hover:text-red-400 transition`}>
          <X className="h-3.5 w-3.5" />
        </button>
      ) : (
        <kbd className={`hidden sm:block absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] rounded border ${ui.border} ${ui.muted}`}>/</kbd>
      )}
    </div>
  );
}

export function FilterSelect({
  value, onChange, children, className = '',
}: { value: string; onChange: (v: string) => void; children: ReactNode; className?: string }) {
  const ui = useUi();
  return (
    <select className={`flex-1 sm:flex-none min-w-0 px-3 py-2 text-sm ${ui.input} ${className}`} style={ui.colorScheme} value={value} onChange={(e) => onChange(e.target.value)}>
      {children}
    </select>
  );
}

export function ClearFiltersButton({ show, onClick }: { show: boolean; onClick: () => void }) {
  if (!show) return null;
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2.5 py-2 text-xs text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition animate-in fade-in zoom-in-95"
    >
      <X className="h-3.5 w-3.5" />
      Clear filters
    </button>
  );
}

// ---------------- Table ----------------

export function Th({
  children, align = 'left', sortKey, activeSortKey, sortDir, onSort, className = '',
}: {
  children?: ReactNode; align?: 'left' | 'right' | 'center'; className?: string;
  sortKey?: string; activeSortKey?: string; sortDir?: 'asc' | 'desc'; onSort?: (key: string) => void;
}) {
  const ui = useUi();
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  const active = sortKey && sortKey === activeSortKey;
  return (
    <th className={`px-4 py-2.5 ${alignClass} text-[11px] font-medium uppercase tracking-wide whitespace-nowrap ${ui.isDark ? 'text-white/40' : 'text-gray-500'} ${className}`}>
      {sortKey && onSort ? (
        <button
          onClick={() => onSort(sortKey)}
          className={`inline-flex items-center gap-1 uppercase tracking-wide transition ${ui.isDark ? 'hover:text-white/80' : 'hover:text-gray-800'} ${active ? (ui.isDark ? 'text-white/80' : 'text-gray-800') : ''}`}
        >
          {children}
          {active
            ? (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)
            : <ChevronDown className="h-3 w-3 opacity-30" />}
        </button>
      ) : children}
    </th>
  );
}

// Table on md+ screens. Pass `mobile` (usually a <MobileList>) to show cards
// instead of the table on phones; without it the table scrolls sideways.
export function TableShell({ children, footer, mobile }: { children: ReactNode; footer?: ReactNode; mobile?: ReactNode }) {
  const ui = useUi();
  return (
    <Card className="overflow-hidden">
      {mobile && <div className="md:hidden">{mobile}</div>}
      <div className={`${mobile ? 'hidden md:block' : ''} overflow-x-auto`} style={ui.colorScheme}>
        <table className="w-full text-sm">{children}</table>
      </div>
      {footer}
    </Card>
  );
}

// Phone-sized list of tappable cards (used as TableShell's `mobile` view).
export function MobileList({ children, empty }: { children: ReactNode; empty?: ReactNode }) {
  const ui = useUi();
  const items = Array.isArray(children) ? children.filter(Boolean) : children;
  if (empty && Array.isArray(items) && items.length === 0) return <div className="px-4 py-12">{empty}</div>;
  return <div className={`divide-y ${ui.isDark ? 'divide-white/5' : 'divide-gray-100'}`}>{items}</div>;
}

export function MobileCard({
  children, onClick, index = 0, highlight = false,
}: { children: ReactNode; onClick?: () => void; index?: number; highlight?: boolean }) {
  const ui = useUi();
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 flex flex-col gap-2 transition-colors ${onClick ? `${ui.isDark ? 'active:bg-white/5' : 'active:bg-gray-100'}` : ''} ${
        highlight ? (ui.isDark ? 'bg-emerald-500/10' : 'bg-emerald-50') : ''
      } animate-in fade-in slide-in-from-bottom-1 fill-mode-both`}
      style={{ animationDelay: `${Math.min(index, 12) * 25}ms` }}
    >
      {children}
    </Tag>
  );
}

export function THead({ children }: { children: ReactNode }) {
  const ui = useUi();
  return (
    <thead>
      <tr className={`border-b ${ui.border} ${ui.isDark ? 'bg-white/[0.02]' : 'bg-gray-50/60'}`}>{children}</tr>
    </thead>
  );
}

// Row with hover highlight, a left accent bar and a staggered fade-in.
export function Tr({
  children, index = 0, onClick, highlight = false, className = '',
}: { children: ReactNode; index?: number; onClick?: () => void; highlight?: boolean; className?: string }) {
  const ui = useUi();
  return (
    <tr
      onClick={onClick}
      className={`group border-b last:border-b-0 ${ui.rowBorder} transition-colors duration-150 ${ui.hoverRow} ${onClick ? 'cursor-pointer' : ''} ${
        highlight ? (ui.isDark ? 'bg-emerald-500/10' : 'bg-emerald-50') : ''
      } animate-in fade-in slide-in-from-bottom-1 fill-mode-both ${className}`}
      style={{ animationDelay: `${Math.min(index, 15) * 25}ms` }}
    >
      {children}
    </tr>
  );
}

// First cell of a row: shows the accent bar on hover.
export function TdAccent({ children, highlight = false, className = '' }: { children: ReactNode; highlight?: boolean; className?: string }) {
  return (
    <td className={`px-4 py-3 border-l-2 ${highlight ? 'border-emerald-400' : 'border-transparent group-hover:border-blue-500'} transition-colors ${className}`}>
      {children}
    </td>
  );
}

export function EmptyRow({ colSpan, title = 'Nothing found', hint, action }: { colSpan: number; title?: string; hint?: string; action?: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-14">
        <EmptyState title={title} hint={hint} action={action} />
      </td>
    </tr>
  );
}

export function EmptyState({ title, hint, action, icon: Icon = Inbox }: { title: string; hint?: string; action?: ReactNode; icon?: IconType }) {
  const ui = useUi();
  return (
    <div className="flex flex-col items-center gap-2 text-center animate-in fade-in">
      <div className={`h-12 w-12 rounded-full ${ui.subtle} flex items-center justify-center`}>
        <Icon className={`h-6 w-6 ${ui.muted}`} />
      </div>
      <p className={`text-sm font-medium ${ui.text}`}>{title}</p>
      {hint && <p className={`text-xs ${ui.muted}`}>{hint}</p>}
      {action}
    </div>
  );
}

export function Pagination({
  currentPage, totalPages, startIndex, endIndex, total, onPage,
}: { currentPage: number; totalPages: number; startIndex: number; endIndex: number; total: number; onPage: (p: number) => void }) {
  const ui = useUi();
  if (totalPages <= 1) return null;
  const go = (p: number) => onPage(Math.max(1, Math.min(p, totalPages)));
  return (
    <div className={`px-4 py-2.5 border-t ${ui.border} flex items-center justify-between gap-2`}>
      <span className={`text-xs ${ui.muted}`}>
        <span className="hidden sm:inline">Showing </span><span className={ui.text}>{startIndex + 1}-{Math.min(endIndex, total)}</span> of {total}
      </span>
      <div className="flex items-center gap-0.5">
        <button onClick={() => go(currentPage - 1)} disabled={currentPage === 1} aria-label="Previous page" className={`p-2 sm:p-1 rounded ${ui.muted} ${ui.hoverBtn} disabled:opacity-30 transition`}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className={`sm:hidden px-2 text-xs ${ui.text} tabular-nums`}>{currentPage} / {totalPages}</span>
        <span className="hidden sm:contents">
        {getPageNumbers(currentPage, totalPages).map((page, index) =>
          typeof page === 'number' ? (
            <button
              key={index}
              onClick={() => go(page)}
              className={`min-w-7 px-2 py-0.5 text-xs rounded-md transition ${
                currentPage === page ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow shadow-blue-500/30' : `${ui.muted} ${ui.hoverBtn}`
              }`}
            >
              {page}
            </button>
          ) : (
            <span key={index} className={`px-1 text-xs ${ui.muted}`}>…</span>
          )
        )}
        </span>
        <button onClick={() => go(currentPage + 1)} disabled={currentPage === totalPages} aria-label="Next page" className={`p-2 sm:p-1 rounded ${ui.muted} ${ui.hoverBtn} disabled:opacity-30 transition`}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ---------------- Bits ----------------

export function Avatar({ name, size = 'md' }: { name?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const dims = size === 'sm' ? 'h-6 w-6 text-[10px]' : size === 'lg' ? 'h-10 w-10 text-sm' : 'h-8 w-8 text-xs';
  return (
    <div className={`${dims} shrink-0 rounded-full bg-gradient-to-br ${avatarColor(name || '')} flex items-center justify-center font-semibold text-white`}>
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

// Avatar + two-line name/sub-label, used for client/program and user cells.
export function EntityCell({ name, sub }: { name?: string | null; sub?: ReactNode }) {
  const ui = useUi();
  return (
    <div className="flex items-center gap-3 min-w-0">
      <Avatar name={name} />
      <div className="min-w-0">
        <p className={`text-sm font-medium ${ui.text} truncate`}>{name || '-'}</p>
        {sub && <p className={`text-xs ${ui.textSoft} truncate`}>{sub}</p>}
      </div>
    </div>
  );
}

const BADGE_TONES = {
  green: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/20',
  blue: 'bg-blue-500/15 text-blue-400 ring-blue-500/20',
  amber: 'bg-amber-500/15 text-amber-400 ring-amber-500/20',
  red: 'bg-red-500/15 text-red-400 ring-red-500/20',
  purple: 'bg-purple-500/15 text-purple-400 ring-purple-500/20',
  gray: 'bg-gray-500/15 text-gray-400 ring-gray-500/20',
};
export type BadgeTone = keyof typeof BADGE_TONES;

export function Badge({ children, tone = 'gray', dot = false }: { children: ReactNode; tone?: BadgeTone; dot?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-full ring-1 ring-inset whitespace-nowrap ${BADGE_TONES[tone]}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  const ui = useUi();
  return <span className={`px-2 py-0.5 text-[11px] rounded-full ${ui.subtle} border ${ui.border} ${ui.textSoft} whitespace-nowrap`}>{children}</span>;
}

export function Alert({ tone, children }: { tone: 'error' | 'success'; children: ReactNode }) {
  const Icon = tone === 'error' ? AlertCircle : CheckCircle2;
  const cls = tone === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
  return (
    <div className={`flex items-start gap-2 p-3 text-sm border rounded-lg ${cls} animate-in fade-in slide-in-from-top-1`}>
      <Icon className="h-4 w-4 mt-0.5 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Field({ label, hint, children, icon: Icon }: { label: string; hint?: ReactNode; children: ReactNode; icon?: IconType }) {
  const ui = useUi();
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className={`flex items-center gap-1.5 text-xs font-medium ${ui.label}`}>
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {label}
        </label>
        {hint && <span className={`text-[11px] ${ui.muted}`}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function PageSkeleton({ stats = 4, rows = 8 }: { stats?: number; rows?: number }) {
  const ui = useUi();
  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className={`h-10 w-10 rounded-xl ${ui.subtle} animate-pulse`} />
        <div className="space-y-2">
          <div className={`h-6 w-52 rounded-lg ${ui.subtle} animate-pulse`} />
          <div className={`h-3.5 w-72 rounded ${ui.subtle} animate-pulse`} />
        </div>
      </div>
      {stats > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {Array.from({ length: stats }).map((_, i) => <div key={i} className={`h-20 rounded-xl ${ui.subtle} animate-pulse`} />)}
        </div>
      )}
      <Card className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`h-8 w-8 rounded-full ${ui.subtle} animate-pulse`} />
            <div className={`h-4 flex-1 rounded ${ui.subtle} animate-pulse`} />
            <div className={`h-4 w-24 rounded ${ui.subtle} animate-pulse`} />
          </div>
        ))}
      </Card>
    </div>
  );
}

// ---------------- Overlays ----------------

// Slide-over panel from the right. Esc closes it.
export function SidePanel({
  open, onClose, title, subtitle, avatarName, badge, footer, children, width = 'max-w-xl',
}: {
  open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; avatarName?: string;
  badge?: ReactNode; footer?: ReactNode; children: ReactNode; width?: string;
}) {
  const ui = useUi();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      <div className={`relative h-[100dvh] w-full ${width} ${ui.card} border-l ${ui.border} shadow-2xl flex flex-col animate-in slide-in-from-right duration-300`} style={ui.colorScheme}>
        <div className={`px-4 sm:px-6 py-4 border-b ${ui.border} flex items-start justify-between gap-4 pt-[calc(env(safe-area-inset-top)+1rem)] sm:pt-4`}>
          <div className="flex items-center gap-3 min-w-0">
            {avatarName !== undefined && <Avatar name={avatarName} size="lg" />}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className={`text-base font-semibold ${ui.text} truncate`}>{title}</h2>
                {badge}
              </div>
              {subtitle && <p className={`text-xs ${ui.muted} truncate`}>{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${ui.muted} ${ui.hoverBtn} transition`} title="Close (Esc)">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-5 space-y-5">{children}</div>
        {footer && (
          <div className={`px-4 sm:px-6 py-3 border-t ${ui.border} flex flex-wrap items-center justify-between gap-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:pb-3`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// Centered confirm/info dialog. Esc closes it.
export function Modal({
  open, onClose, title, children, footer, width = 'max-w-md',
}: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; width?: string }) {
  const ui = useUi();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      <div className={`relative w-full ${width} max-h-[92dvh] sm:max-h-[90vh] flex flex-col ${ui.card} rounded-t-2xl sm:rounded-xl border ${ui.border} shadow-2xl animate-in fade-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200`} style={ui.colorScheme}>
        <div className={`px-5 py-3.5 border-b ${ui.border} flex items-center justify-between`}>
          <h2 className={`text-base font-semibold ${ui.text}`}>{title}</h2>
          <button onClick={onClose} className={`p-1 rounded-lg ${ui.muted} ${ui.hoverBtn} transition`}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto">{children}</div>
        {footer && (
          <div className={`px-5 py-3 border-t ${ui.border} flex items-center justify-end gap-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:pb-3`}>{footer}</div>
        )}
      </div>
    </div>
  );
}
