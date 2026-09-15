'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/lib/providers/ThemeProvider';
import { useAuth } from '@/lib/providers/AuthProvider';
import { ROLE_PAGES, ROLE_NAMES } from '@/lib/roles';
import {
  LayoutDashboard,
  PlusCircle,
  Receipt,
  FileText,
  Edit,
  BarChart3,
  TrendingUp,
  Users,
  Upload,
  History,
  Mail,
  LogOut,
  Gem,
  Eye,
  Sun,
  Moon,
} from 'lucide-react';

interface SidebarProps {
  onLogout: () => void;
}

const menuItems = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Add Projection', href: '/dashboard/projections/add' },
  { name: 'Convert to Billing', href: '/dashboard/billing/convert' },
  { name: 'Billed', href: '/dashboard/billing' },
  { name: 'Edit Projection', href: '/dashboard/projections/edit' },
  { name: 'Reports', href: '/dashboard/reports' },
  { name: 'Finance', href: '/dashboard/finance' },
  { name: 'Overview', href: '/dashboard/overview' },
  { name: 'Clients', href: '/dashboard/clients' },
  { name: 'Bulk Upload', href: '/dashboard/bulk-upload' },
  { name: 'Audit Logs', href: '/dashboard/audit-logs' },
  { name: 'Email Center', href: '/dashboard/email-center' },
];

const iconMap: Record<string, any> = {
  '/dashboard': LayoutDashboard,
  '/dashboard/projections/add': PlusCircle,
  '/dashboard/billing/convert': Receipt,
  '/dashboard/billing': FileText,
  '/dashboard/projections/edit': Edit,
  '/dashboard/reports': BarChart3,
  '/dashboard/finance': TrendingUp,
  '/dashboard/overview': Eye,
  '/dashboard/clients': Users,
  '/dashboard/bulk-upload': Upload,
  '/dashboard/audit-logs': History,
  '/dashboard/email-center': Mail,
};

export function Sidebar({ onLogout }: SidebarProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === 'dark';

  const allowedPages = user ? (ROLE_PAGES[user.role_id] || []) : [];
  const visibleMenuItems = menuItems.filter((item) => allowedPages.includes(item.href));

  const bgColor = isDark ? 'bg-[#131726]' : 'bg-white';
  const borderColor = isDark ? 'border-white/5' : 'border-gray-200';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const hoverBg = isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100';
  // Blue theme instead of purple
  const activeBg = isDark ? 'bg-blue-500/20' : 'bg-blue-50';
  const activeText = isDark ? 'text-blue-400' : 'text-blue-600';
  const iconColor = isDark ? 'text-gray-400' : 'text-gray-500';
  const logoBg = isDark ? 'bg-blue-500/20' : 'bg-blue-100';
  const logoText = isDark ? 'text-blue-400' : 'text-blue-600';

  const getIcon = (href: string) => {
    return iconMap[href] || LayoutDashboard;
  };

  return (
    <div className={`w-64 h-screen ${bgColor} ${borderColor} border-r flex flex-col fixed left-0 top-0 z-50 transition-colors duration-300`}>
      {/* Logo */}
      <div className={`flex items-center gap-2.5 px-4 py-4 border-b ${borderColor}`}>
        <div className={`w-8 h-8 ${logoBg} rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20`}>
          <Gem className={`h-4 w-4 ${logoText}`} />
        </div>
        <span className={`text-sm font-bold ${textColor}`}>Margin Monitor</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto">
        {visibleMenuItems.map((item) => {
          const Icon = getIcon(item.href);
          const active = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                active
                  ? `${activeBg} ${activeText}`
                  : `${textColor} ${hoverBg}`
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? activeText : iconColor}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User & Theme */}
      <div className={`px-3 py-4 border-t ${borderColor} space-y-2`}>
        <div className={`flex items-center gap-2.5 px-2 py-2 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
          <div className={`w-8 h-8 rounded-full ${logoBg} flex items-center justify-center text-xs font-medium ${logoText}`}>
            {user?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-medium ${textColor} truncate`}>{user?.name || 'User'}</p>
            <p className={`text-[10px] ${textMuted} truncate`}>{ROLE_NAMES[user?.role_id ?? 0] || 'User'}</p>
          </div>
        </div>

        <div className="flex gap-1">
          <button
            onClick={toggleTheme}
            className={`flex items-center justify-center gap-1.5 flex-1 px-3 py-1.5 text-xs rounded-lg transition-all duration-200 ${hoverBg} ${textColor}`}
          >
            {isDark ? (
              <>
                <Sun className="h-3.5 w-3.5" />
                Light
              </>
            ) : (
              <>
                <Moon className="h-3.5 w-3.5" />
                Dark
              </>
            )}
          </button>
          <button
            onClick={onLogout}
            className={`flex items-center justify-center px-3 py-1.5 text-xs rounded-lg transition-all duration-200 text-red-400 hover:bg-red-500/10`}
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
