'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ComponentType } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from '@/lib/providers/ThemeProvider';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useSession } from '@/lib/providers/SessionProvider';
import { ROLE_PAGES, ROLE_NAMES } from '@/lib/roles';
import { avatarColor } from '@/lib/format';
import {
  LayoutDashboard, PlusCircle, ArrowRightLeft, Receipt, Pencil, FileBarChart, Wallet, LayoutGrid, UserCog,
  CloudUpload, History, Mail, LogOut, Gem, Sun, Moon, Search, ChevronsLeft, ChevronsRight, ShieldCheck, CornerDownLeft,
} from 'lucide-react';

type Item = { name: string; href: string; icon: ComponentType<{ className?: string }>; keywords?: string };

// Grouped navigation. Each role only sees the items in its ROLE_PAGES list,
// and a group with no visible items is hidden entirely.
const NAV_GROUPS: { label: string; items: Item[] }[] = [
  {
    label: 'Insights',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, keywords: 'home revenue margin' },
      { name: 'Overview', href: '/dashboard/overview', icon: LayoutGrid, keywords: 'supervisor performance' },
      { name: 'Finance', href: '/dashboard/finance', icon: Wallet, keywords: 'pending aging overdue' },
      { name: 'Reports', href: '/dashboard/reports', icon: FileBarChart, keywords: 'export csv vendor' },
    ],
  },
  {
    label: 'Projections',
    items: [
      { name: 'Add Projection', href: '/dashboard/projections/add', icon: PlusCircle, keywords: 'new create' },
      { name: 'Edit Projection', href: '/dashboard/projections/edit', icon: Pencil, keywords: 'update change date' },
      { name: 'Bulk Upload', href: '/dashboard/bulk-upload', icon: CloudUpload, keywords: 'excel csv import' },
    ],
  },
  {
    label: 'Billing',
    items: [
      { name: 'Convert to Billing', href: '/dashboard/billing/convert', icon: ArrowRightLeft, keywords: 'invoice bill' },
      { name: 'Billed', href: '/dashboard/billing', icon: Receipt, keywords: 'invoices unbill' },
      { name: 'Email Center', href: '/dashboard/email-center', icon: Mail, keywords: 'send reminder' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { name: 'Clients', href: '/dashboard/clients', icon: UserCog, keywords: 'users access permissions' },
      { name: 'Audit Logs', href: '/dashboard/audit-logs', icon: History, keywords: 'history changes' },
    ],
  },
];

const SESSION_SECONDS = 15 * 60;

export function pageTitleFor(pathname: string) {
  for (const g of NAV_GROUPS) for (const i of g.items) if (i.href === pathname) return i.name;
  return 'Margin Monitor';
}

interface SidebarProps {
  onLogout: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  // Below the lg breakpoint the sidebar is a slide-in drawer instead.
  isDesktop: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ onLogout, collapsed: collapsedPref, onToggleCollapsed, isDesktop, mobileOpen, onCloseMobile }: SidebarProps) {
  // The icon-only mode is a desktop thing; the mobile drawer always shows labels.
  const collapsed = collapsedPref && isDesktop;
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { secondsUntilLogout, isWarning, isApp } = useSession();
  const isDark = theme === 'dark';
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Hover label for the collapsed sidebar, rendered fixed so the scrolling nav can't clip it.
  const [tip, setTip] = useState<{ label: string; top: number } | null>(null);

  const allowedPages = user ? (ROLE_PAGES[user.role_id] || []) : [];
  const groups = NAV_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((i) => allowedPages.includes(i.href)) }))
    .filter((g) => g.items.length > 0);
  const allItems = groups.flatMap((g) => g.items);

  // Ctrl/Cmd+K opens the page switcher; [ toggles the sidebar width.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(el?.tagName) || el?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      } else if (e.key === '[' && !typing && !e.metaKey && !e.ctrlKey && isDesktop) {
        onToggleCollapsed();
      } else if (e.key === 'Escape' && !isDesktop) {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onToggleCollapsed, onCloseMobile, isDesktop]);

  const bg = isDark ? 'bg-[#10131f]' : 'bg-white';
  const border = isDark ? 'border-white/5' : 'border-gray-200';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const muted = isDark ? 'text-white/45' : 'text-gray-500';
  const hover = isDark ? 'hover:bg-white/5 hover:text-white' : 'hover:bg-gray-100 hover:text-gray-900';

  const sessionUrgent = isWarning || secondsUntilLogout <= 60;
  const sessionCaution = secondsUntilLogout <= 5 * 60;
  const sessionPct = Math.max(0, Math.min(100, (secondsUntilLogout / SESSION_SECONDS) * 100));
  const sessionColor = sessionUrgent ? 'bg-red-500' : sessionCaution ? 'bg-amber-500' : 'bg-gradient-to-r from-blue-500 to-purple-500';
  const mins = Math.floor(secondsUntilLogout / 60);
  const secs = String(secondsUntilLogout % 60).padStart(2, '0');

  return (
    <>
      {/* Mobile drawer backdrop */}
      {!isDesktop && mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 lg:hidden" onClick={onCloseMobile} />
      )}
      <aside
        className={`${collapsed ? 'w-[72px]' : 'w-[min(18rem,85vw)] lg:w-64'} h-[100dvh] ${bg} ${border} border-r flex flex-col fixed left-0 top-0 z-50 lg:z-40 transition-[width,transform,background-color] duration-300 ease-out ${
          mobileOpen ? 'translate-x-0 shadow-2xl lg:shadow-none' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-hidden={!isDesktop && !mobileOpen}
      >
        {/* Brand */}
        <div className={`flex items-center gap-3 h-16 px-4 border-b ${border} shrink-0`}>
          <div className="relative h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Gem className="h-[18px] w-[18px] text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0 animate-in fade-in duration-300">
              <p className={`text-sm font-bold ${text} leading-tight truncate`}>Margin Monitor</p>
              <p className={`text-[10px] ${muted} truncate`}>Billing & finance</p>
            </div>
          )}
        </div>

        {/* Jump-to search */}
        <div className="px-3 pt-3 shrink-0">
          <button
            onClick={() => setPaletteOpen(true)}
            title="Jump to a page (Ctrl/⌘ K)"
            className={`w-full flex items-center gap-2 ${collapsed ? 'justify-center px-0' : 'px-3'} py-2 rounded-lg border ${border} ${isDark ? 'bg-white/[0.03]' : 'bg-gray-50'} ${muted} ${hover} transition text-xs`}
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Jump to…</span>
                {isDesktop && <kbd className={`px-1.5 py-0.5 rounded border ${border} text-[10px] font-sans`}>⌘K</kbd>}
              </>
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav
          className="flex-1 px-3 py-3 overflow-y-auto overflow-x-hidden"
          style={{ colorScheme: isDark ? 'dark' : 'light', scrollbarWidth: 'thin' }}
          onScroll={() => setTip(null)}
        >
          {groups.map((group, gi) => (
            <div key={group.label} className={gi > 0 ? 'mt-4' : ''}>
              {collapsed ? (
                gi > 0 && <div className={`mx-3 mb-3 border-t ${border}`} />
              ) : (
                <p className={`px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider ${muted}`}>{group.label}</p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-label={item.name}
                      onClick={() => !isDesktop && onCloseMobile()}
                      onMouseEnter={(e) => {
                        if (!collapsed) return;
                        const r = e.currentTarget.getBoundingClientRect();
                        setTip({ label: item.name, top: r.top + r.height / 2 });
                      }}
                      onMouseLeave={() => setTip(null)}
                      className={`group relative flex items-center gap-3 ${collapsed ? 'justify-center px-0' : 'px-3'} py-2.5 lg:py-2 rounded-lg text-sm transition-all duration-200 ${
                        active
                          ? `${isDark ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/10 text-white' : 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700'} font-medium`
                          : `${isDark ? 'text-white/70' : 'text-gray-600'} ${hover}`
                      }`}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-gradient-to-b from-blue-400 to-purple-500" />
                      )}
                      <Icon
                        className={`h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                          active ? (isDark ? 'text-blue-400' : 'text-blue-600') : ''
                        }`}
                      />
                      {!collapsed && <span className="truncate">{item.name}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer: user, session, theme, logout */}
        <div className={`p-3 border-t ${border} space-y-2 shrink-0`}>
          <div className={`flex items-center gap-2.5 ${collapsed ? 'justify-center' : 'p-2'} rounded-xl ${collapsed ? '' : isDark ? 'bg-white/[0.04]' : 'bg-gray-50'}`}>
            <div
              className={`relative h-9 w-9 shrink-0 rounded-full bg-gradient-to-br ${avatarColor(user?.name || '')} flex items-center justify-center text-sm font-semibold text-white`}
              title={collapsed ? `${user?.name ?? ''} · ${ROLE_NAMES[user?.role_id ?? 0] ?? ''}` : undefined}
            >
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
              <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 ${isDark ? 'border-[#10131f]' : 'border-white'} ${!isApp && sessionUrgent ? 'bg-red-500' : !isApp && sessionCaution ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${text} truncate`}>{user?.name || 'User'}</p>
                <p className={`text-[11px] ${muted} truncate`}>{ROLE_NAMES[user?.role_id ?? 0] || 'User'}</p>
              </div>
            )}
          </div>

          {/* Session countdown (web only - the installed app stays signed in) */}
          {!collapsed && !isApp && (
            <div title="Time left before you're logged out for inactivity" className="px-1">
              <div className={`flex items-center justify-between text-[10px] mb-1 ${sessionUrgent ? 'text-red-400' : sessionCaution ? 'text-amber-400' : muted}`}>
                <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" />Session</span>
                <span className="tabular-nums">{mins}:{secs}</span>
              </div>
              <div className={`h-1 rounded-full ${isDark ? 'bg-white/10' : 'bg-gray-200'} overflow-hidden`}>
                <div className={`h-full rounded-full ${sessionColor} transition-all duration-1000 ease-linear`} style={{ width: `${sessionPct}%` }} />
              </div>
            </div>
          )}

          <div className={`flex ${collapsed ? 'flex-col' : ''} items-center gap-1`}>
            {/* Theme switch */}
            <button
              onClick={toggleTheme}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className={`relative flex items-center ${collapsed ? 'justify-center w-full py-2' : 'flex-1 p-0.5'} rounded-lg border ${border} ${isDark ? 'bg-white/[0.03]' : 'bg-gray-50'} transition`}
            >
              {collapsed ? (
                isDark ? <Sun className={`h-4 w-4 ${muted}`} /> : <Moon className={`h-4 w-4 ${muted}`} />
              ) : (
                <>
                  <span
                    className={`absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-md shadow transition-all duration-300 ${
                      isDark ? 'left-[calc(50%)] bg-white/10' : 'left-0.5 bg-white'
                    }`}
                  />
                  <span className={`relative z-10 flex-1 flex items-center justify-center gap-1 py-1 text-[11px] ${!isDark ? 'text-amber-500 font-medium' : muted}`}>
                    <Sun className="h-3.5 w-3.5" /> Light
                  </span>
                  <span className={`relative z-10 flex-1 flex items-center justify-center gap-1 py-1 text-[11px] ${isDark ? 'text-blue-300 font-medium' : muted}`}>
                    <Moon className="h-3.5 w-3.5" /> Dark
                  </span>
                </>
              )}
            </button>
            <button
              onClick={onLogout}
              title="Log out"
              className={`flex items-center justify-center ${collapsed ? 'w-full' : ''} px-2.5 py-2 rounded-lg text-red-400 hover:bg-red-500/10 transition`}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={onToggleCollapsed}
            title={collapsed ? 'Expand sidebar ([)' : 'Collapse sidebar ([)'}
            className={`hidden lg:flex w-full items-center ${collapsed ? 'justify-center' : 'gap-2 px-2'} py-1.5 rounded-lg text-[11px] ${muted} ${hover} transition`}
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /> Collapse</>}
          </button>
        </div>
      </aside>

      {collapsed && tip && (
        <div
          className={`fixed left-[80px] z-50 -translate-y-1/2 px-2.5 py-1 rounded-md text-xs whitespace-nowrap shadow-lg pointer-events-none animate-in fade-in slide-in-from-left-1 duration-150 ${
            isDark ? 'bg-[#1b2033] text-white border border-white/10' : 'bg-gray-900 text-white'
          }`}
          style={{ top: tip.top }}
        >
          {tip.label}
        </div>
      )}

      {paletteOpen && <CommandPalette items={allItems} isDark={isDark} onClose={() => setPaletteOpen(false)} />}
    </>
  );
}

// Ctrl/Cmd+K page switcher: type to filter, arrows to move, Enter to go.
function CommandPalette({ items, isDark, onClose }: { items: Item[]; isDark: boolean; onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = query.trim().toLowerCase();
  const results = items.filter((i) => !q || `${i.name} ${i.keywords ?? ''}`.toLowerCase().includes(q));

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const go = (item?: Item) => {
    if (!item) return;
    router.push(item.href);
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    else if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(results[index]); }
  };

  const border = isDark ? 'border-white/10' : 'border-gray-200';
  const muted = isDark ? 'text-white/45' : 'text-gray-500';

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150" onClick={onClose} />
      <div className={`relative w-full max-w-lg rounded-2xl border ${border} ${isDark ? 'bg-[#151a2b]' : 'bg-white'} shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200`}>
        <div className={`flex items-center gap-3 px-4 border-b ${border}`}>
          <Search className={`h-4 w-4 ${muted}`} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setIndex(0); }}
            onKeyDown={onKeyDown}
            placeholder="Jump to a page…"
            className={`flex-1 py-4 bg-transparent text-sm outline-none ${isDark ? 'text-white placeholder-white/30' : 'text-gray-900 placeholder-gray-400'}`}
          />
          <kbd className={`px-1.5 py-0.5 rounded border ${border} text-[10px] ${muted}`}>Esc</kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? (
            <li className={`px-3 py-6 text-center text-sm ${muted}`}>No pages match “{query}”</li>
          ) : (
            results.map((item, i) => {
              const Icon = item.icon;
              const selected = i === index;
              return (
                <li key={item.href}>
                  <button
                    onMouseEnter={() => setIndex(i)}
                    onClick={() => go(item)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition ${
                      selected
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                        : isDark ? 'text-white/80' : 'text-gray-700'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{item.name}</span>
                    {pathname === item.href && <span className={`text-[10px] ${selected ? 'text-white/80' : muted}`}>Current</span>}
                    {selected && <CornerDownLeft className="h-3.5 w-3.5 text-white/80" />}
                  </button>
                </li>
              );
            })
          )}
        </ul>
        <div className={`flex items-center gap-4 px-4 py-2 border-t ${border} text-[10px] ${muted}`}>
          <span>↑↓ to move</span>
          <span>↵ to open</span>
          <span>[ to collapse the sidebar</span>
        </div>
      </div>
    </div>
  );
}
