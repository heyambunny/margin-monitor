'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/providers/ThemeProvider';
import { AnimatedNumber } from '@/components/ui/animated-number';
import {
  TrendingUp, IndianRupee, Users, Receipt, RefreshCw, BarChart3, Activity, Zap, Clock,
  TrendingDown, Calendar, Search, X, ChevronUp, ChevronDown, Sparkles, AlertTriangle, HandCoins, Wallet,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Bar,
  BarChart,
  Pie,
  PieChart as RePieChart,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line
} from 'recharts';
import { API_URL } from '@/lib/api';
import { useUi, Card, Avatar, Badge, EmptyState, PageSkeleton, type BadgeTone } from '@/components/app/ui';

// Minimal blue shades for charts
const BLUE_SHADES = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#64748b'];
const PIE_COLORS = ['#3b82f6', '#a855f7'];
const pctTone = (pct: number): BadgeTone => (pct >= 20 ? 'green' : pct >= 0 ? 'amber' : 'red');

// Animated counter that keeps decimals (the stock one floors to an integer).
const Pct = ({ value, className = '' }: { value: number; className?: string }) => (
  <AnimatedNumber value={Math.round((value || 0) * 10)} duration={900} format={(v) => `${(v / 10).toFixed(1)}%`} className={className} />
);
// Financial year month order (Apr through Mar)
const FY_MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'] as const;

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [dashboardData, setDashboardData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expenseFilter, setExpenseFilter] = useState('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [trendMode, setTrendMode] = useState<'both' | 'revenue' | 'margin' | 'collected'>('both');
  const [clientSearch, setClientSearch] = useState('');
  const [clientSort, setClientSort] = useState<{ key: 'client_name' | 'revenue' | 'vendor' | 'margin' | 'margin_pct'; dir: 'asc' | 'desc' }>({ key: 'revenue', dir: 'desc' });
  const [monthlySearch, setMonthlySearch] = useState('');
  const [activeVendor, setActiveVendor] = useState<number | null>(null);
  const [activeClient, setActiveClient] = useState<number | null>(null);
  const [collections, setCollections] = useState<{ month: string; received: number; tds: number }[]>([]);
  const ui = useUi();

  const bgColor = isDark ? 'bg-[#0b0e1a]' : 'bg-gray-50';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-[#131726]' : 'bg-white';
  const borderColor = isDark ? 'border-white/10' : 'border-gray-200';
  const chartGridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const chartTickColor = isDark ? '#94a3b8' : '#64748b';
  const tooltipBg = isDark ? '#131726' : '#ffffff';
  const tooltipBorder = isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0';
  const tooltipText = isDark ? '#ffffff' : '#000000';

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch dashboard data: ${res.status}`);
      }

      const data = await res.json();
      setDashboardData(Array.isArray(data) ? data : []);
      setLastUpdated(new Date());

      // Monthly payments received (for the trend chart); not fatal if it fails.
      fetch(`${API_URL}/api/dashboard/collections`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : []))
        .then((c) => setCollections(Array.isArray(c) ? c : []))
        .catch(() => setCollections([]));
    } catch (err: any) {
      console.error('Dashboard error:', err);
      setError(err.message || 'Failed to load dashboard');
      setDashboardData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (!value) return '₹0';
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    return `₹${value.toLocaleString()}`;
  };

  const formatCurrencyShort = (value: number) => {
    if (!value) return '₹0';
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    return `₹${value.toLocaleString()}`;
  };

  const formatChartValue = (value: number) => {
    if (!value) return '₹0';
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
    return `₹${value}`;
  };

  const processData = () => {
    if (!Array.isArray(dashboardData) || dashboardData.length === 0) {
      return {
        billed: { amt: 0, ven: 0, mar: 0, pct: 0 },
        projected: { amt: 0, ven: 0, mar: 0, pct: 0 },
        total: { amt: 0, ven: 0, mar: 0, pct: 0 },
        chartData: [],
        totalRecords: 0,
        clientData: [],
        revenueSplit: [],
        quarterlyData: [],
        top10Clients: [],
        vendorData: [],
        monthlyClientData: [],
        monthlyTotals: {
          billed: {}, billedGM: {}, projected: {}, projectedGM: {},
          totalBilled: 0,
          totalBilledGM: 0,
          totalProjected: 0,
          totalProjectedGM: 0,
        },
      };
    }

    const billed = dashboardData.filter((d: any) => d.is_billed);
    const projected = dashboardData.filter((d: any) => !d.is_billed);

    const calc = (items: any[]) => {
      const amt = items.reduce((sum, d) => sum + (d.client_billed_amount || 0), 0);
      const ven = items.reduce((sum, d) => sum + (d.vendor_cost || 0), 0);
      const mar = items.reduce((sum, d) => sum + ((d.client_billed_amount || 0) - (d.vendor_cost || 0) - (d.credit_note || 0)), 0);
      const pct = amt > 0 ? (mar / amt) * 100 : 0;
      return { amt, ven, mar, pct };
    };

    const b = calc(billed);
    const p = calc(projected);
    const t = {
      amt: b.amt + p.amt,
      ven: b.ven + p.ven,
      mar: b.mar + p.mar,
      pct: (b.amt + p.amt) > 0 ? ((b.mar + p.mar) / (b.amt + p.amt)) * 100 : 0,
    };

    // Monthly chart data - Updated to handle "Apr-24" format
    const monthOrder = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    const monthlyMap: Record<string, any> = {};
    
    dashboardData.forEach((d: any) => {
      // Extract month from "Apr-24" format
      const rawMonth = d.invoice_month || 'Unknown';
      const month = rawMonth.split('-')[0]; // Takes "Apr" from "Apr-24"
      
      if (!monthlyMap[month]) {
        monthlyMap[month] = { month, revenue: 0, margin: 0 };
      }
      monthlyMap[month].revenue += d.client_billed_amount || 0;
      monthlyMap[month].margin += (d.client_billed_amount || 0) - (d.vendor_cost || 0) - (d.credit_note || 0);
    });

    const chartData = Object.values(monthlyMap).sort((a: any, b: any) => {
      return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
    });

    // Quarterly Data - Updated to handle "Apr-24" format
    const quarterMap: Record<string, any> = {
      'Q1': { quarter: 'Q1', revenue: 0, margin: 0 },
      'Q2': { quarter: 'Q2', revenue: 0, margin: 0 },
      'Q3': { quarter: 'Q3', revenue: 0, margin: 0 },
      'Q4': { quarter: 'Q4', revenue: 0, margin: 0 },
    };
    
    dashboardData.forEach((d: any) => {
      // Extract month from "Apr-24" format
      const rawMonth = d.invoice_month || 'Unknown';
      const month = rawMonth.split('-')[0]; // Takes "Apr" from "Apr-24"
      
      const monthMap: Record<string, string> = {
        'Apr': 'Q1', 'May': 'Q1', 'Jun': 'Q1',
        'Jul': 'Q2', 'Aug': 'Q2', 'Sep': 'Q2',
        'Oct': 'Q3', 'Nov': 'Q3', 'Dec': 'Q3',
        'Jan': 'Q4', 'Feb': 'Q4', 'Mar': 'Q4'
      };
      const quarter = monthMap[month] || 'Unknown';
      
      if (quarterMap[quarter]) {
        quarterMap[quarter].revenue += d.client_billed_amount || 0;
        quarterMap[quarter].margin += (d.client_billed_amount || 0) - (d.vendor_cost || 0) - (d.credit_note || 0);
      }
    });

    const quarterlyData = Object.values(quarterMap).sort((a: any, b: any) => {
      const order = ['Q1', 'Q2', 'Q3', 'Q4'];
      return order.indexOf(a.quarter) - order.indexOf(b.quarter);
    });

    let prevMargin = 0;
    quarterlyData.forEach((q: any) => {
      q.growth = prevMargin > 0 ? ((q.margin - prevMargin) / prevMargin) * 100 : 0;
      q.margin_pct = q.revenue > 0 ? (q.margin / q.revenue) * 100 : 0;
      prevMargin = q.margin;
    });

    // Client Data
    const clientMap: Record<string, any> = {};
    dashboardData.forEach((d: any) => {
      const name = d.client_name || 'Unknown';
      if (!clientMap[name]) {
        clientMap[name] = { 
          client_name: name, 
          billed_revenue: 0, 
          projected_revenue: 0,
          billed_margin: 0,
          projected_margin: 0,
          billed_vendor: 0,
          projected_vendor: 0,
        };
      }
      if (!d.is_billed) {
        clientMap[name].projected_revenue += d.client_billed_amount || 0;
        clientMap[name].projected_margin += (d.client_billed_amount || 0) - (d.vendor_cost || 0) - (d.credit_note || 0);
        clientMap[name].projected_vendor += d.vendor_cost || 0;
      } else {
        clientMap[name].billed_revenue += d.client_billed_amount || 0;
        clientMap[name].billed_margin += (d.client_billed_amount || 0) - (d.vendor_cost || 0) - (d.credit_note || 0);
        clientMap[name].billed_vendor += d.vendor_cost || 0;
      }
    });

    const clientData = Object.values(clientMap)
      .map((c: any) => ({
        ...c,
        total_revenue: c.billed_revenue + c.projected_revenue,
        total_margin: c.billed_margin + c.projected_margin,
        total_vendor: c.billed_vendor + c.projected_vendor,
        billed_margin_pct: c.billed_revenue > 0 ? (c.billed_margin / c.billed_revenue) * 100 : 0,
        projected_margin_pct: c.projected_revenue > 0 ? (c.projected_margin / c.projected_revenue) * 100 : 0,
        total_margin_pct: (c.billed_revenue + c.projected_revenue) > 0 ? ((c.billed_margin + c.projected_margin) / (c.billed_revenue + c.projected_revenue)) * 100 : 0,
      }))
      .sort((a: any, b: any) => b.total_margin - a.total_margin); // Sorted by margin

    // Filter client data based on expense filter
    const filteredClientData = clientData.map((c: any) => {
      if (expenseFilter === 'billed') {
        return {
          ...c,
          revenue: c.billed_revenue,
          margin: c.billed_margin,
          vendor: c.billed_vendor,
          margin_pct: c.billed_margin_pct,
        };
      } else if (expenseFilter === 'projected') {
        return {
          ...c,
          revenue: c.projected_revenue,
          margin: c.projected_margin,
          vendor: c.projected_vendor,
          margin_pct: c.projected_margin_pct,
        };
      } else {
        return {
          ...c,
          revenue: c.total_revenue,
          margin: c.total_margin,
          vendor: c.total_vendor,
          margin_pct: c.total_margin_pct,
        };
      }
    });

    // Monthly Client Data - Billed/GM/Projected/GM broken down by month per
    // client, financial year order (Apr through Mar).
    const monthlyClientMap: Record<string, any> = {};
    const zeroByMonth = () => Object.fromEntries(monthOrder.map((m) => [m, 0]));
    dashboardData.forEach((d: any) => {
      const name = d.client_name || 'Unknown';
      const rawMonth = d.invoice_month || 'Unknown';
      const month = rawMonth.split('-')[0];
      if (!monthOrder.includes(month)) return;

      if (!monthlyClientMap[name]) {
        monthlyClientMap[name] = {
          client_name: name,
          billed: zeroByMonth(),
          billedGM: zeroByMonth(),
          projected: zeroByMonth(),
          projectedGM: zeroByMonth(),
        };
      }

      const amt = d.client_billed_amount || 0;
      const margin = amt - (d.vendor_cost || 0) - (d.credit_note || 0);
      const bucket = monthlyClientMap[name];

      if (!d.is_billed) {
        bucket.projected[month] += amt;
        bucket.projectedGM[month] += margin;
      } else {
        bucket.billed[month] += amt;
        bucket.billedGM[month] += margin;
      }
    });

    const monthlyClientData = Object.values(monthlyClientMap)
      .map((c: any) => {
        const totalBilled = monthOrder.reduce((sum, m) => sum + c.billed[m], 0);
        const totalBilledGM = monthOrder.reduce((sum, m) => sum + c.billedGM[m], 0);
        const totalProjected = monthOrder.reduce((sum, m) => sum + c.projected[m], 0);
        const totalProjectedGM = monthOrder.reduce((sum, m) => sum + c.projectedGM[m], 0);
        return { ...c, totalBilled, totalBilledGM, totalProjected, totalProjectedGM };
      })
      .sort((a: any, b: any) => b.totalBilled - a.totalBilled);

    const monthlyTotals = monthlyClientData.reduce((acc: any, c: any) => {
      monthOrder.forEach((m) => {
        acc.billed[m] += c.billed[m];
        acc.billedGM[m] += c.billedGM[m];
        acc.projected[m] += c.projected[m];
        acc.projectedGM[m] += c.projectedGM[m];
      });
      acc.totalBilled += c.totalBilled;
      acc.totalBilledGM += c.totalBilledGM;
      acc.totalProjected += c.totalProjected;
      acc.totalProjectedGM += c.totalProjectedGM;
      return acc;
    }, {
      billed: zeroByMonth(),
      billedGM: zeroByMonth(),
      projected: zeroByMonth(),
      projectedGM: zeroByMonth(),
      totalBilled: 0,
      totalBilledGM: 0,
      totalProjected: 0,
      totalProjectedGM: 0,
    });

    // Top 10 Clients by Margin
    const top10Clients = clientData.slice(0, 10).map((c: any) => ({
      ...c,
      label: c.client_name.replace(/\b(Limited|Pvt Ltd|Ltd|Private|Industries|Solutions|Systems|India)\b/g, '').trim().replace(/\.$/, ''),
      vendor: c.total_vendor,
      margin: c.total_margin,
      margin_pct: c.total_margin_pct,
    }));

    // Vendor Distribution - Using invoice_description as vendor identifier
    // Since we don't have vendor_name directly, we'll use what we have
    // const vendorData = clientData.map((c: any) => ({
    //   name: c.vendor_name || 'Unknown Vendor',
    //   value: c.vendor_cost || 0,
    // }));

    const vendorMap: Record<string, number> = {};
    dashboardData.forEach((d: any) => {
      const vendorName = d.vendor_name || 'Unknown Vendor';
      if (!vendorMap[vendorName]) {
        vendorMap[vendorName] = 0;  
      }
      vendorMap[vendorName] += d.vendor_cost || 0;
    });

    const vendorData = Object.entries(vendorMap)
      .map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);

    return {
      billed: b,
      projected: p,
      total: t,
      chartData,
      totalRecords: dashboardData.length,
      clientData: filteredClientData,
      revenueSplit: [
        { stage: 'Billed', amount: b.amt },
        { stage: 'Projected', amount: p.amt },
      ],
      quarterlyData,
      top10Clients,
      vendorData,
      monthlyClientData,
      monthlyTotals,
    };
  };

  const {
    billed,
    projected,
    total,
    chartData,
    totalRecords,
    clientData,
    revenueSplit,
    quarterlyData,
    top10Clients,
    vendorData,
    monthlyClientData,
    monthlyTotals,
  } = processData();

  const now = new Date();
  const currentYear = now.getFullYear();
  const fyStartYear = now.getMonth() >= 3 ? currentYear : currentYear - 1;
  const fyLabel = `FY ${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`;

  // Billed columns cover the FY-to-date (past + current month); Projected
  // columns cover the rest of the year (current + future months). FY_MONTHS
  // starts at Apr, so shift JS's Jan-based month index (0-11) by 9.
  const currentFYMonthIndex = (now.getMonth() + 9) % 12;
  const billedMonths = FY_MONTHS.slice(0, currentFYMonthIndex + 1);
  const projectedMonths = FY_MONTHS.slice(currentFYMonthIndex);

  const tickStyle = { fontSize: 11, fill: chartTickColor };
  const tooltipStyle = {
    backgroundColor: isDark ? '#1b2033' : tooltipBg,
    borderColor: tooltipBorder,
    color: tooltipText,
    fontSize: '12px',
    borderRadius: '10px',
    boxShadow: '0 8px 24px -8px rgba(0, 0, 0, 0.35)',
  };
  const legendText = (value: ReactNode) => <span style={{ color: chartTickColor }}>{value}</span>;
  const cursorFill = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';

  if (isLoading && dashboardData.length === 0) {
    return <PageSkeleton stats={4} rows={6} />;
  }

  if (error) {
    return (
      <Card className="p-10">
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load the dashboard"
          hint={error}
          action={<button onClick={fetchData} className="mt-1 text-xs text-blue-400 hover:underline">Try again</button>}
        />
      </Card>
    );
  }

  const billedShare = total.amt > 0 ? (billed.amt / total.amt) * 100 : 0;

  // Collections: payments (incl. TDS) against billed entries, and what's left
  // to collect (billed - credit notes - received), per entry and per client.
  const sixtyDaysAgo = Date.now() - 60 * 24 * 3600 * 1000;
  const collection = { collected: 0, outstanding: 0, overdue: 0 };
  const clientCollections: Record<string, { collected: number; outstanding: number }> = {};
  dashboardData.forEach((d: any) => {
    if (!d.is_billed) return;
    const settled = (d.received || 0) + (d.tds_received || 0);
    const left = Math.max((d.client_billed_amount || 0) - (d.credit_note || 0) - settled, 0);
    collection.collected += settled;
    collection.outstanding += left;
    if (d.invoice_date && new Date(d.invoice_date).getTime() < sixtyDaysAgo) collection.overdue += left;
    const c = (clientCollections[d.client_name || 'Unknown'] ||= { collected: 0, outstanding: 0 });
    c.collected += settled;
    c.outstanding += left;
  });
  const collectedShare = collection.collected + collection.outstanding > 0
    ? (collection.collected / (collection.collected + collection.outstanding)) * 100 : 0;
  const trendData = chartData.map((m: any) => {
    const c = collections.find((x) => x.month === m.month);
    return { ...m, collected: c ? c.received + c.tds : 0 };
  });

  // Detailed client table: search + sort on top of the Billed/Projected/All filter.
  const clientRows = clientData
    .filter((c: any) => !clientSearch || (c.client_name || '').toLowerCase().includes(clientSearch.toLowerCase()))
    .sort((a: any, b: any) => {
      const av = a[clientSort.key] ?? 0;
      const bv = b[clientSort.key] ?? 0;
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return clientSort.dir === 'asc' ? cmp : -cmp;
    });
  const maxRevenue = Math.max(...clientRows.map((c: any) => c.revenue || 0), 1);
  const sortBy = (key: typeof clientSort.key) =>
    setClientSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }));

  const monthlyRows = monthlyClientData.filter(
    (c: any) => !monthlySearch || (c.client_name || '').toLowerCase().includes(monthlySearch.toLowerCase())
  );

  const clientShare = top10Clients.map((c: any) => ({ name: c.client_name, value: c.revenue || c.total_revenue || 0 }));
  const clientShareTotal = clientShare.reduce((s: number, c: any) => s + c.value, 0) || 1;
  const vendorTotal = vendorData.reduce((s: number, v: any) => s + v.value, 0) || 1;

  const maxMargin = Math.max(...quarterlyData.map((x: any) => x.margin || 0), 1);

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-300">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className={`text-xl sm:text-2xl font-semibold ${textColor}`}>
              {now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening'}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
            </h1>
            <p className={`text-xs sm:text-sm ${textMuted}`}>Here&apos;s how billing and margins are tracking this financial year</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs ${ui.subtle} border ${ui.border} ${textMuted}`}>
            <Clock className="h-3.5 w-3.5" />
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : 'Loading…'}
          </span>
          <span className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs ${ui.subtle} border ${ui.border} ${textMuted}`}>
            <Calendar className="h-3.5 w-3.5 text-blue-400" />
            {fyLabel}
          </span>
          <button
            onClick={fetchData}
            disabled={isLoading}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs ${textMuted} ${ui.subtle} border ${ui.border} rounded-lg ${ui.hoverBtn} transition disabled:opacity-60`}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Hero: total projected billing */}
      <div className="relative overflow-hidden rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-500/20 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="flex items-center gap-2 text-sm text-white/80">
              <IndianRupee className="h-4 w-4" />
              Total Projected Billing · {fyLabel}
            </p>
            <AnimatedNumber value={total.amt} duration={1500} format={(v) => formatCurrency(v)} className="block text-3xl sm:text-4xl font-bold mt-1 tracking-tight" />
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-2 text-xs sm:text-sm text-white/85">
              <span>Margin <AnimatedNumber value={total.mar} duration={1200} format={(v) => formatCurrency(v)} className="font-semibold text-white" /></span>
              <span>Margin % <Pct value={total.pct} className="font-semibold text-white" /></span>
              <span>Vendor cost <span className="font-semibold text-white">{formatCurrency(total.ven)}</span></span>
              <span className="text-white/60">{totalRecords.toLocaleString('en-IN')} entries</span>
            </div>
          </div>
          <div className="w-full md:w-80">
            <div className="flex justify-between text-xs text-white/80 mb-1.5">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-white" />Billed {billedShare.toFixed(0)}%</span>
              <span className="flex items-center gap-1.5">Projected {(100 - billedShare).toFixed(0)}%<span className="h-2 w-2 rounded-full bg-white/40" /></span>
            </div>
            <div className="h-2.5 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full rounded-full bg-white transition-all duration-1000" style={{ width: `${billedShare}%` }} />
            </div>
            <div className="flex justify-between text-xs mt-1.5">
              <span className="font-medium">{formatCurrencyShort(billed.amt)}</span>
              <span className="font-medium">{formatCurrencyShort(projected.amt)}</span>
            </div>
            <div className="flex justify-between text-xs text-white/80 mt-3 mb-1.5">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-300" />Collected {collectedShare.toFixed(0)}%</span>
              <span className="flex items-center gap-1.5">Outstanding {(100 - collectedShare).toFixed(0)}%<span className="h-2 w-2 rounded-full bg-white/40" /></span>
            </div>
            <div className="h-2.5 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-300 transition-all duration-1000" style={{ width: `${collectedShare}%` }} />
            </div>
            <div className="flex justify-between text-xs mt-1.5">
              <span className="font-medium">{formatCurrencyShort(collection.collected)}</span>
              <span className="font-medium">{formatCurrencyShort(collection.outstanding)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Billed / Projected / Total */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Billed', sub: 'Invoiced so far', data: billed, icon: Receipt, ring: '#3b82f6', accent: 'from-blue-500/20' },
          { label: 'Projected', sub: 'Still to be billed', data: projected, icon: BarChart3, ring: '#a855f7', accent: 'from-purple-500/20' },
          { label: 'Total', sub: 'Billed + projected', data: total, icon: Activity, ring: '#10b981', accent: 'from-emerald-500/20' },
        ].map((c, i) => {
          const pct = Math.max(0, Math.min(100, c.data.pct || 0));
          return (
            <div
              key={c.label}
              className={`relative overflow-hidden p-5 rounded-xl border ${ui.border} ${cardBg} hover:-translate-y-0.5 hover:shadow-lg ${isDark ? 'hover:shadow-black/30' : 'hover:shadow-gray-200'} transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 fill-mode-both`}
              style={{ animationDelay: `${100 + i * 70}ms` }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${c.accent} to-transparent pointer-events-none`} />
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={`flex items-center gap-1.5 text-sm font-medium ${textColor}`}>
                    <c.icon className="h-4 w-4" style={{ color: c.ring }} />
                    {c.label}
                  </p>
                  <p className={`text-[11px] ${textMuted}`}>{c.sub}</p>
                  <AnimatedNumber value={c.data.amt} duration={1000} format={(v) => formatCurrency(v)} className={`block text-2xl font-bold mt-2 ${textColor}`} />
                </div>
                {/* Margin % ring */}
                <div className="relative h-16 w-16 shrink-0">
                  <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="3.2" className={isDark ? 'stroke-white/10' : 'stroke-gray-200'} />
                    <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="3.2" strokeLinecap="round" stroke={c.ring}
                      strokeDasharray={`${pct} 100`} style={{ transition: 'stroke-dasharray 1.2s ease' }} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                    <Pct value={c.data.pct} className={`text-[11px] font-bold ${textColor}`} />
                    <span className={`text-[8px] ${textMuted} mt-0.5`}>margin</span>
                  </div>
                </div>
              </div>
              <div className={`relative grid grid-cols-2 gap-3 mt-4 pt-3 border-t ${ui.border} text-xs`}>
                <div>
                  <p className={textMuted}>Vendor cost</p>
                  <p className={`font-semibold ${textColor} tabular-nums`}>{formatCurrency(c.data.ven)}</p>
                </div>
                <div>
                  <p className={textMuted}>Margin</p>
                  <p className={`font-semibold tabular-nums ${c.data.mar >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(c.data.mar)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Collections */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Collected', sub: 'Payments + TDS received', value: collection.collected, icon: HandCoins, cls: 'text-emerald-400', accent: 'from-emerald-500/15' },
          { label: 'Outstanding', sub: 'Billed, not yet received', value: collection.outstanding, icon: Wallet, cls: 'text-amber-400', accent: 'from-amber-500/15' },
          { label: 'Overdue', sub: 'Outstanding, invoiced 60+ days ago', value: collection.overdue, icon: AlertTriangle, cls: 'text-rose-400', accent: 'from-rose-500/15' },
        ].map((c, i) => (
          <div
            key={c.label}
            className={`relative overflow-hidden p-4 rounded-xl border ${ui.border} ${cardBg} animate-in fade-in slide-in-from-bottom-2 fill-mode-both`}
            style={{ animationDelay: `${250 + i * 60}ms` }}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${c.accent} to-transparent pointer-events-none`} />
            <p className={`relative flex items-center gap-1.5 text-xs ${textMuted}`}><c.icon className={`h-4 w-4 ${c.cls}`} />{c.label}</p>
            <AnimatedNumber value={c.value} duration={1000} format={(v) => formatCurrency(v)} className={`relative block text-xl font-bold mt-1 ${textColor}`} />
            <p className={`relative text-[11px] ${textMuted}`}>{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue vs Margin trend */}
      <Section
        title="Revenue vs Margin"
        subtitle={`Monthly trend · ${fyLabel}`}
        right={
          <Segmented
            value={trendMode}
            onChange={(v) => setTrendMode(v as typeof trendMode)}
            options={[['both', 'All'], ['revenue', 'Revenue'], ['margin', 'Margin'], ['collected', 'Collected']]}
          />
        }
      >
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 260 }}>
            <AreaChart data={trendData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="fillCollected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="fillMargin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={chartGridColor} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tick={tickStyle} />
              <YAxis tickLine={false} axisLine={false} tick={tickStyle} width={50} tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: chartTickColor, strokeDasharray: '3 3' }} formatter={(value) => `₹${(Number(value) / 100000).toFixed(2)}L`} />
              {(trendMode === 'both' || trendMode === 'revenue') && (
                <Area dataKey="revenue" name="Revenue" type="monotone" fill="url(#fillRevenue)" stroke="#3b82f6" strokeWidth={2.5} activeDot={{ r: 5 }} />
              )}
              {(trendMode === 'both' || trendMode === 'margin') && (
                <Area dataKey="margin" name="Margin" type="monotone" fill="url(#fillMargin)" stroke="#a855f7" strokeWidth={2.5} activeDot={{ r: 5 }} />
              )}
              {(trendMode === 'both' || trendMode === 'collected') && (
                <Area dataKey="collected" name="Collected (by payment month)" type="monotone" fill="url(#fillCollected)" stroke="#10b981" strokeWidth={2.5} activeDot={{ r: 5 }} />
              )}
              <Legend wrapperStyle={{ fontSize: 12 }} formatter={legendText} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* Top clients + revenue split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section className="lg:col-span-2" title="Top 10 Clients by Margin" subtitle="Vendor cost + gross margin (stacked) · margin % line">
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 320 }}>
              <ComposedChart data={top10Clients} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: chartTickColor }} angle={-30} textAnchor="end" height={64} interval={0} />
                <YAxis yAxisId="left" tickLine={false} axisLine={false} tick={tickStyle} width={55} tickFormatter={(value) => formatChartValue(value)} />
                <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#f59e0b' }} tickFormatter={(value) => `${value}%`} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: cursorFill }} formatter={(value, name) => name === 'Margin %' ? `${Number(value).toFixed(1)}%` : formatCurrency(Number(value))} />
                <Legend wrapperStyle={{ fontSize: 12 }} formatter={legendText} />
                <Bar yAxisId="left" dataKey="vendor" name="Vendor Cost" stackId="a" fill="#93c5fd" />
                <Bar yAxisId="left" dataKey="margin" name="Gross Margin" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="margin_pct" name="Margin %" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} activeDot={{ r: 5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Revenue Split" subtitle="Billed vs projected">
          <div className="relative h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 400, height: 220 }}>
              <RePieChart>
                <Pie data={revenueSplit} cx="50%" cy="50%" innerRadius="62%" outerRadius="88%" paddingAngle={2} dataKey="amount" nameKey="stage" stroke="none">
                  {revenueSplit.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatCurrency(Number(value))} />
              </RePieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className={`text-[11px] ${textMuted}`}>Total</span>
              <span className={`text-lg font-bold ${textColor}`}>{formatCurrencyShort(total.amt)}</span>
            </div>
          </div>
          <div className="space-y-2 mt-2">
            {revenueSplit.map((r, i) => {
              const share = total.amt > 0 ? (r.amount / total.amt) * 100 : 0;
              return (
                <div key={r.stage} className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                  <span className={`flex-1 ${textColor}`}>{r.stage}</span>
                  <span className={`${textMuted} tabular-nums`}>{share.toFixed(1)}%</span>
                  <span className={`font-semibold ${textColor} tabular-nums w-20 text-right`}>{formatCurrencyShort(r.amount)}</span>
                </div>
              );
            })}
          </div>
        </Section>
      </div>

      {/* Vendor distribution + client contribution: donut + hoverable ranked list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { title: 'Vendor Distribution', subtitle: 'Top 10 vendors by cost', data: vendorData, sum: vendorTotal, active: activeVendor, setActive: setActiveVendor },
          { title: 'Client Contribution', subtitle: 'Revenue share · top 10 clients', data: clientShare, sum: clientShareTotal, active: activeClient, setActive: setActiveClient },
        ].map((block) => (
          <Section key={block.title} title={block.title} subtitle={block.subtitle}>
            {block.data.length === 0 ? (
              <div className="py-10"><EmptyState title="No data yet" /></div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="relative h-[150px] w-[150px] xl:h-[180px] xl:w-[180px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 150, height: 150 }}>
                    <RePieChart>
                      <Pie
                        data={block.data}
                        cx="50%" cy="50%" innerRadius="58%" outerRadius="92%" paddingAngle={1.5}
                        dataKey="value" stroke="none"
                        onMouseEnter={(_, i) => block.setActive(i)}
                        onMouseLeave={() => block.setActive(null)}
                      >
                        {block.data.map((_: any, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={BLUE_SHADES[index % BLUE_SHADES.length]}
                            opacity={block.active === null || block.active === index ? 1 : 0.25}
                            style={{ transition: 'opacity 150ms' }}
                          />
                        ))}
                      </Pie>
                    </RePieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-6 text-center">
                    {block.active !== null && block.data[block.active] ? (
                      <>
                        <span className={`text-lg font-bold ${textColor}`}>{((block.data[block.active].value / block.sum) * 100).toFixed(1)}%</span>
                        <span className={`text-[10px] ${textMuted} leading-tight line-clamp-2`}>{block.data[block.active].name}</span>
                      </>
                    ) : (
                      <>
                        <span className={`text-[10px] ${textMuted}`}>Total</span>
                        <span className={`text-sm font-bold ${textColor}`}>{formatCurrencyShort(block.sum)}</span>
                      </>
                    )}
                  </div>
                </div>
                <ul className="w-full sm:flex-1 min-w-0 space-y-0.5 max-h-[200px] overflow-y-auto" style={ui.colorScheme}>
                  {block.data.map((d: any, i: number) => (
                    <li
                      key={d.name + i}
                      onMouseEnter={() => block.setActive(i)}
                      onMouseLeave={() => block.setActive(null)}
                      className={`flex items-center gap-2 px-2 py-1 rounded-md text-xs cursor-default transition-colors ${block.active === i ? (isDark ? 'bg-white/5' : 'bg-gray-100') : ''}`}
                    >
                      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: BLUE_SHADES[i % BLUE_SHADES.length] }} />
                      <span className={`flex-1 min-w-0 truncate ${textColor}`} title={d.name}>{d.name}</span>
                      <span className={`${textMuted} tabular-nums`}>{((d.value / block.sum) * 100).toFixed(0)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Section>
        ))}
      </div>

      {/* Quarterly performance */}
      <Section title="Quarterly Performance" subtitle={`Margin, revenue and quarter-on-quarter growth · ${fyLabel}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quarterlyData.map((q: any, idx: number) => {
            const isFirst = idx === 0;
            const growth = q.growth || 0;
            const isPositive = growth >= 0;
            const isBest = q.margin > 0 && q.margin === maxMargin;
            const GrowthIcon = isPositive ? TrendingUp : TrendingDown;
            const bar = Math.max(0, Math.min(100, (Math.max(q.margin, 0) / maxMargin) * 100));
            return (
              <div
                key={q.quarter}
                className={`relative overflow-hidden p-4 rounded-xl border transition-all hover:-translate-y-0.5 animate-in fade-in slide-in-from-bottom-2 fill-mode-both ${
                  isBest ? 'border-blue-500/40 bg-gradient-to-br from-blue-500/15 to-purple-500/10' : `${ui.border} ${isDark ? 'bg-white/[0.02]' : 'bg-gray-50/70'}`
                }`}
                style={{ animationDelay: `${idx * 70}ms` }}
              >
                {isBest && (
                  <span className="absolute top-3 right-3 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-medium">
                    <Zap className="h-3 w-3" /> Best
                  </span>
                )}
                <span className={`inline-flex items-center justify-center h-6 px-2 rounded-md text-[11px] font-bold ${isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                  {q.quarter}
                </span>
                <p className={`text-[11px] ${textMuted} mt-3`}>Margin</p>
                <AnimatedNumber value={q.margin} duration={1000} format={(v) => formatCurrencyShort(v)} className={`block text-2xl font-bold ${textColor} leading-tight`} />
                <div className="flex items-center justify-between mt-1 text-[11px]">
                  <span className={textMuted}>Rev <span className={`font-medium ${textColor}`}>{formatCurrencyShort(q.revenue)}</span></span>
                  <span className={`font-semibold flex items-center gap-0.5 ${isFirst ? textMuted : isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {!isFirst && <GrowthIcon className="h-3 w-3" />}
                    {isFirst ? 'Baseline' : `${Math.abs(growth).toFixed(1)}%`}
                  </span>
                </div>
                <div className={`mt-3 h-1.5 rounded-full ${isDark ? 'bg-white/10' : 'bg-gray-200'} overflow-hidden`}>
                  <div className={`h-full rounded-full transition-all duration-1000 ${isBest ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-blue-400/60'}`} style={{ width: `${bar}%` }} />
                </div>
                <p className={`text-[10px] ${textMuted} mt-1 text-right`}>{(q.margin_pct || 0).toFixed(1)}% margin</p>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Detailed client performance */}
      <Section
        title="Detailed Client Performance"
        subtitle={`${clientRows.length} ${clientRows.length === 1 ? 'client' : 'clients'} · sorted by ${({ client_name: 'name', revenue: 'revenue', vendor: 'vendor cost', margin: 'margin', margin_pct: 'margin %' })[clientSort.key]}`}
        right={
          <div className="flex flex-wrap items-center gap-2">
            <MiniSearch value={clientSearch} onChange={setClientSearch} placeholder="Find client…" />
            <Segmented
              value={expenseFilter}
              onChange={setExpenseFilter}
              options={[['all', 'All'], ['billed', 'Billed'], ['projected', 'Projected']]}
            />
          </div>
        }
        flush
      >
        {/* Phones: cards */}
        <div className={`md:hidden max-h-[480px] overflow-y-auto divide-y ${isDark ? 'divide-white/5' : 'divide-gray-100'}`} style={ui.colorScheme}>
          {clientRows.length === 0 ? (
            <div className="py-12"><EmptyState icon={Users} title={clientSearch ? 'No clients match your search' : 'No client data available'} /></div>
          ) : (
            clientRows.map((client: any, idx: number) => {
              const pct = client.margin_pct || 0;
              const revenueShare = Math.min(((client.revenue || 0) / maxRevenue) * 100, 100);
              return (
                <div key={client.client_name} className="px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`text-[11px] w-4 ${textMuted}`}>{idx + 1}</span>
                      <Avatar name={client.client_name} size="sm" />
                      <span className={`text-sm ${textColor} truncate`}>{client.client_name}</span>
                    </div>
                    <Badge tone={pctTone(pct)}>{pct.toFixed(1)}%</Badge>
                  </div>
                  <div className={`h-1.5 rounded-full ${isDark ? 'bg-white/10' : 'bg-gray-200'} overflow-hidden ml-6`}>
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500" style={{ width: `${revenueShare}%` }} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 ml-6 text-[11px]">
                    <div><p className={textMuted}>Revenue</p><p className={`font-semibold ${textColor} tabular-nums`}>{formatCurrencyShort(client.revenue || 0)}</p></div>
                    <div><p className={textMuted}>Vendor</p><p className={`${textColor} tabular-nums`}>{formatCurrencyShort(client.vendor || 0)}</p></div>
                    <div><p className={textMuted}>Margin</p><p className={`font-semibold tabular-nums ${(client.margin || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrencyShort(client.margin || 0)}</p></div>
                  </div>
                  {clientCollections[client.client_name] && (
                    <div className="grid grid-cols-3 gap-2 ml-6 text-[11px]">
                      <div><p className={textMuted}>Collected</p><p className="text-emerald-400 tabular-nums">{formatCurrencyShort(clientCollections[client.client_name].collected)}</p></div>
                      <div><p className={textMuted}>Outstanding</p><p className={`tabular-nums ${clientCollections[client.client_name].outstanding > 0 ? 'text-amber-400 font-semibold' : textMuted}`}>{formatCurrencyShort(clientCollections[client.client_name].outstanding)}</p></div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        <div className="hidden md:block overflow-x-auto max-h-[380px] overflow-y-auto" style={ui.colorScheme}>
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead className={`sticky top-0 z-10 ${isDark ? 'bg-[#171b2c]' : 'bg-gray-50'}`}>
              <tr>
                <th className={`px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide ${textMuted} border-b ${ui.border}`}>#</th>
                {([
                  ['client_name', 'Client', 'left'],
                  ['revenue', 'Revenue', 'right'],
                  ['vendor', 'Vendor Cost', 'right'],
                  ['margin', 'Margin', 'right'],
                  ['margin_pct', 'Margin %', 'right'],
                ] as const).map(([key, label, align]) => (
                  <th key={key} className={`px-4 py-2.5 text-${align} text-[11px] font-medium uppercase tracking-wide whitespace-nowrap ${textMuted} border-b ${ui.border}`}>
                    <button onClick={() => sortBy(key)} className={`inline-flex items-center gap-1 uppercase tracking-wide transition ${isDark ? 'hover:text-white/80' : 'hover:text-gray-800'} ${clientSort.key === key ? (isDark ? 'text-white/80' : 'text-gray-800') : ''}`}>
                      {label}
                      {clientSort.key === key
                        ? (clientSort.dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)
                        : <ChevronDown className="h-3 w-3 opacity-30" />}
                    </button>
                  </th>
                ))}
                <th className={`px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wide whitespace-nowrap ${textMuted} border-b ${ui.border}`}>Collected</th>
                <th className={`px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wide whitespace-nowrap ${textMuted} border-b ${ui.border}`}>Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {clientRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12"><EmptyState icon={Users} title={clientSearch ? 'No clients match your search' : 'No client data available'} /></td>
                </tr>
              ) : (
                clientRows.map((client: any, idx: number) => {
                  const pct = client.margin_pct || 0;
                  const isPositive = (client.margin || 0) >= 0;
                  const revenueShare = Math.min(((client.revenue || 0) / maxRevenue) * 100, 100);
                  const GrowthIcon = isPositive ? TrendingUp : TrendingDown;
                  return (
                    <tr key={client.client_name} className={`group ${ui.hoverRow} transition-colors`}>
                      <td className={`px-4 py-2.5 text-xs ${textMuted} border-b ${ui.rowBorder} border-l-2 border-l-transparent group-hover:border-l-blue-500 transition-colors`}>{idx + 1}</td>
                      <td className={`px-4 py-2.5 border-b ${ui.rowBorder}`}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar name={client.client_name} size="sm" />
                          <span className={`text-sm ${textColor} truncate max-w-[220px]`} title={client.client_name}>{client.client_name}</span>
                        </div>
                      </td>
                      <td className={`relative px-4 py-2.5 text-right border-b ${ui.rowBorder}`}>
                        <div className={`absolute inset-y-2 right-0 rounded-l ${isDark ? 'bg-blue-500/10' : 'bg-blue-100/70'} transition-all duration-700`} style={{ width: `${revenueShare}%` }} />
                        <span className={`relative text-sm font-semibold ${textColor} tabular-nums`}>{formatCurrencyShort(client.revenue || 0)}</span>
                      </td>
                      <td className={`px-4 py-2.5 text-right text-sm ${textMuted} tabular-nums border-b ${ui.rowBorder}`}>{formatCurrencyShort(client.vendor || 0)}</td>
                      <td className={`px-4 py-2.5 text-right text-sm font-semibold tabular-nums border-b ${ui.rowBorder} ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                        <span className="inline-flex items-center gap-0.5">
                          <GrowthIcon className="h-3 w-3" />
                          {formatCurrencyShort(client.margin || 0)}
                        </span>
                      </td>
                      <td className={`px-4 py-2.5 text-right border-b ${ui.rowBorder}`}><Badge tone={pctTone(pct)}>{pct.toFixed(1)}%</Badge></td>
                      <td className={`px-4 py-2.5 text-right text-sm text-emerald-400 tabular-nums border-b ${ui.rowBorder}`}>{formatCurrencyShort(clientCollections[client.client_name]?.collected || 0)}</td>
                      <td className={`px-4 py-2.5 text-right text-sm tabular-nums border-b ${ui.rowBorder} ${(clientCollections[client.client_name]?.outstanding || 0) > 0 ? 'text-amber-400 font-semibold' : textMuted}`}>{formatCurrencyShort(clientCollections[client.client_name]?.outstanding || 0)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Monthly client breakdown - Billed (FY-to-date) / Projected (current + future) */}
      <Section
        title="Monthly Client Breakdown"
        subtitle="Billed through the current month, projected for the rest of the FY (Apr–Mar)"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <MiniSearch value={monthlySearch} onChange={setMonthlySearch} placeholder="Find client…" />
            <span className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md ${isDark ? 'bg-orange-500/10 text-orange-300' : 'bg-orange-100 text-orange-700'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" /> Billed
            </span>
            <span className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md ${isDark ? 'bg-emerald-500/10 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Projected
            </span>
          </div>
        }
        flush
      >
        <p className={`text-[11px] ${textMuted} px-4 pb-2 sm:hidden`}>Scroll horizontally to see all months →</p>
        <div className="overflow-x-auto max-h-[460px] overflow-y-auto" style={ui.colorScheme}>
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 z-20">
              <tr>
                <th rowSpan={3} className={`sticky left-0 z-30 text-[11px] text-left py-2 pl-4 pr-3 align-bottom ${cardBg} ${textMuted} border-b border-r ${borderColor}`}>Client</th>
                <th colSpan={billedMonths.length * 2 + 2} className={`text-[11px] text-center py-1.5 ${textColor} font-semibold border-b border-l-2 ${borderColor} ${isDark ? 'bg-orange-500/10 border-l-orange-400/60' : 'bg-orange-50 border-l-orange-400'}`}>
                  <span className="inline-flex items-center gap-1"><Receipt className="h-3 w-3" /> Billed</span>
                </th>
                <th colSpan={projectedMonths.length * 2 + 2} className={`text-[11px] text-center py-1.5 ${textColor} font-semibold border-b border-l-2 ${borderColor} ${isDark ? 'bg-emerald-500/10 border-l-emerald-400/60' : 'bg-emerald-50 border-l-emerald-400'}`}>
                  <span className="inline-flex items-center gap-1"><BarChart3 className="h-3 w-3" /> Projected</span>
                </th>
              </tr>
              <tr>
                {billedMonths.map((m, i) => (
                  <th key={`bm-${m}`} colSpan={2} className={`text-[11px] text-center py-1 px-2 font-medium ${textMuted} border-b ${i === 0 ? 'border-l-2' : 'border-l'} ${borderColor} ${isDark ? `bg-orange-500/10 ${i === 0 ? 'border-l-orange-400/60' : ''}` : `bg-orange-50 ${i === 0 ? 'border-l-orange-400' : ''}`}`}>{m}</th>
                ))}
                <th rowSpan={2} className={`text-[11px] text-right py-2 px-2 align-bottom border-b border-l ${borderColor} ${isDark ? 'bg-orange-500/10 text-orange-300' : 'bg-orange-50 text-orange-700'}`}>Total Billed</th>
                <th rowSpan={2} className={`text-[11px] text-right py-2 px-2 align-bottom border-b ${borderColor} ${isDark ? 'bg-orange-500/10 text-orange-300' : 'bg-orange-50 text-orange-700'}`}>Total GM</th>
                {projectedMonths.map((m, i) => (
                  <th key={`pm-${m}`} colSpan={2} className={`text-[11px] text-center py-1 px-2 font-medium ${textMuted} border-b ${i === 0 ? 'border-l-2' : 'border-l'} ${borderColor} ${isDark ? `bg-emerald-500/10 ${i === 0 ? 'border-l-emerald-400/60' : ''}` : `bg-emerald-50 ${i === 0 ? 'border-l-emerald-400' : ''}`}`}>{m}</th>
                ))}
                <th rowSpan={2} className={`text-[11px] text-right py-2 px-2 align-bottom border-b border-l ${borderColor} ${isDark ? 'bg-emerald-500/10 text-emerald-300' : 'bg-emerald-50 text-emerald-700'}`}>Total Projected</th>
                <th rowSpan={2} className={`text-[11px] text-right py-2 px-2 align-bottom border-b ${borderColor} ${isDark ? 'bg-emerald-500/10 text-emerald-300' : 'bg-emerald-50 text-emerald-700'}`}>Total GM</th>
              </tr>
              <tr>
                {billedMonths.flatMap((m, i) => [
                  <th key={`bl-${m}-billed`} className={`text-[10px] text-right py-1 px-2 font-normal ${textMuted} border-b ${i === 0 ? 'border-l-2' : 'border-l'} ${borderColor} ${isDark ? `bg-orange-500/10 ${i === 0 ? 'border-l-orange-400/60' : ''}` : `bg-orange-50 ${i === 0 ? 'border-l-orange-400' : ''}`}`}>Billed</th>,
                  <th key={`bl-${m}-gm`} className={`text-[10px] text-right py-1 px-2 font-normal ${textMuted} ${isDark ? 'bg-orange-500/10' : 'bg-orange-50'} border-b ${borderColor}`}>GM</th>,
                ])}
                {projectedMonths.flatMap((m, i) => [
                  <th key={`pl-${m}-projected`} className={`text-[10px] text-right py-1 px-2 font-normal ${textMuted} border-b ${i === 0 ? 'border-l-2' : 'border-l'} ${borderColor} ${isDark ? `bg-emerald-500/10 ${i === 0 ? 'border-l-emerald-400/60' : ''}` : `bg-emerald-50 ${i === 0 ? 'border-l-emerald-400' : ''}`}`}>Projected</th>,
                  <th key={`pl-${m}-gm`} className={`text-[10px] text-right py-1 px-2 font-normal ${textMuted} ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'} border-b ${borderColor}`}>GM</th>,
                ])}
              </tr>
            </thead>
            <tbody>
              {monthlyRows.length === 0 ? (
                <tr>
                  <td colSpan={billedMonths.length * 2 + projectedMonths.length * 2 + 5} className="py-12">
                    <EmptyState icon={Users} title={monthlySearch ? 'No clients match your search' : 'No client data available'} />
                  </td>
                </tr>
              ) : (
                monthlyRows.map((client: any, idx: number) => {
                  const rowBg = idx % 2 === 1 ? (isDark ? '#161a2b' : '#fafafa') : (isDark ? '#131726' : '#ffffff');
                  const fmt = (v: number) => (v ? formatCurrencyShort(v) : '–');
                  const gmCls = (v: number) => (v > 0 ? 'text-emerald-400' : v < 0 ? 'text-red-400' : textMuted);
                  return (
                    <tr key={client.client_name} className={`group border-b ${borderColor} ${isDark ? 'hover:bg-blue-500/[0.06]' : 'hover:bg-blue-50/60'} transition-colors`}>
                      <td
                        className={`sticky left-0 z-10 text-xs py-2 pl-4 pr-3 whitespace-nowrap ${textColor} border-r ${borderColor}`}
                        style={{ backgroundColor: rowBg }}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar name={client.client_name} size="sm" />
                          <span className="truncate max-w-[150px]" title={client.client_name}>{client.client_name}</span>
                        </div>
                      </td>
                      {billedMonths.flatMap((m, i) => [
                        <td key={`b-${m}`} className={`text-xs text-right py-2 px-2 tabular-nums ${textColor} ${i === 0 ? 'border-l-2' : ''} ${i === 0 ? (isDark ? 'border-l-orange-400/30' : 'border-l-orange-300') : ''} ${isDark ? 'bg-orange-500/5' : 'bg-orange-50/40'}`}>
                          {fmt(client.billed[m])}
                        </td>,
                        <td key={`bg-${m}`} className={`text-xs text-right py-2 px-2 tabular-nums font-medium ${gmCls(client.billedGM[m])} ${isDark ? 'bg-orange-500/5' : 'bg-orange-50/40'}`}>
                          {fmt(client.billedGM[m])}
                        </td>,
                      ])}
                      <td className={`text-xs text-right py-2 px-2 tabular-nums font-semibold border-l ${isDark ? 'bg-orange-500/10' : 'bg-orange-50'} ${textColor}`}>{fmt(client.totalBilled)}</td>
                      <td className={`text-xs text-right py-2 px-2 tabular-nums font-semibold ${isDark ? 'bg-orange-500/10' : 'bg-orange-50'} ${gmCls(client.totalBilledGM)}`}>{fmt(client.totalBilledGM)}</td>
                      {projectedMonths.flatMap((m, i) => [
                        <td key={`p-${m}`} className={`text-xs text-right py-2 px-2 tabular-nums ${textColor} ${i === 0 ? 'border-l-2' : ''} ${i === 0 ? (isDark ? 'border-l-emerald-400/30' : 'border-l-emerald-300') : ''} ${isDark ? 'bg-emerald-500/5' : 'bg-emerald-50/40'}`}>
                          {fmt(client.projected[m])}
                        </td>,
                        <td key={`pg-${m}`} className={`text-xs text-right py-2 px-2 tabular-nums font-medium ${gmCls(client.projectedGM[m])} ${isDark ? 'bg-emerald-500/5' : 'bg-emerald-50/40'}`}>
                          {fmt(client.projectedGM[m])}
                        </td>,
                      ])}
                      <td className={`text-xs text-right py-2 px-2 tabular-nums font-semibold border-l ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'} ${textColor}`}>{fmt(client.totalProjected)}</td>
                      <td className={`text-xs text-right py-2 px-2 tabular-nums font-semibold ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'} ${gmCls(client.totalProjectedGM)}`}>{fmt(client.totalProjectedGM)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {monthlyClientData.length > 0 && (
              <tfoot>
                <tr className="sticky bottom-0 z-10 font-semibold">
                  <td className={`sticky left-0 z-10 text-xs py-2.5 pl-4 pr-3 border-r border-white/10 ${isDark ? 'bg-[#1f2540]' : 'bg-gray-900'} text-white`}>Total (all clients)</td>
                  {billedMonths.flatMap((m) => [
                    <td key={`tb-${m}`} className={`text-xs text-right py-2.5 px-2 tabular-nums text-white ${isDark ? 'bg-[#1f2540]' : 'bg-gray-900'}`}>{formatCurrencyShort(monthlyTotals.billed[m])}</td>,
                    <td key={`tbg-${m}`} className={`text-xs text-right py-2.5 px-2 tabular-nums text-white/80 ${isDark ? 'bg-[#1f2540]' : 'bg-gray-900'}`}>{formatCurrencyShort(monthlyTotals.billedGM[m])}</td>,
                  ])}
                  <td className={`text-xs text-right py-2.5 px-2 tabular-nums text-orange-300 border-l border-white/10 ${isDark ? 'bg-[#1f2540]' : 'bg-gray-900'}`}>{formatCurrencyShort(monthlyTotals.totalBilled)}</td>
                  <td className={`text-xs text-right py-2.5 px-2 tabular-nums text-orange-300 ${isDark ? 'bg-[#1f2540]' : 'bg-gray-900'}`}>{formatCurrencyShort(monthlyTotals.totalBilledGM)}</td>
                  {projectedMonths.flatMap((m) => [
                    <td key={`tp-${m}`} className={`text-xs text-right py-2.5 px-2 tabular-nums text-white ${isDark ? 'bg-[#1f2540]' : 'bg-gray-900'}`}>{formatCurrencyShort(monthlyTotals.projected[m])}</td>,
                    <td key={`tpg-${m}`} className={`text-xs text-right py-2.5 px-2 tabular-nums text-white/80 ${isDark ? 'bg-[#1f2540]' : 'bg-gray-900'}`}>{formatCurrencyShort(monthlyTotals.projectedGM[m])}</td>,
                  ])}
                  <td className={`text-xs text-right py-2.5 px-2 tabular-nums text-emerald-300 border-l border-white/10 ${isDark ? 'bg-[#1f2540]' : 'bg-gray-900'}`}>{formatCurrencyShort(monthlyTotals.totalProjected)}</td>
                  <td className={`text-xs text-right py-2.5 px-2 tabular-nums text-emerald-300 ${isDark ? 'bg-[#1f2540]' : 'bg-gray-900'}`}>{formatCurrencyShort(monthlyTotals.totalProjectedGM)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Section>

      {/* Footer */}
      <div className={`text-center py-6 text-[11px] ${textMuted} border-t ${ui.border}`}>
        Protected by 256-bit encryption · © {currentYear} Evolve Brands Pvt Ltd
      </div>
    </div>
  );
}

// Card with a title row; `flush` drops the body padding for edge-to-edge tables.
function Section({
  title, subtitle, right, children, className = '', flush = false,
}: { title: string; subtitle?: string; right?: ReactNode; children: ReactNode; className?: string; flush?: boolean }) {
  const ui = useUi();
  return (
    <Card className={`${flush ? 'overflow-hidden' : 'p-4'} animate-in fade-in slide-in-from-bottom-2 fill-mode-both ${className}`}>
      <div className={`flex flex-wrap items-center justify-between gap-2 ${flush ? 'px-4 pt-4 pb-3' : 'mb-3'} [&>*:last-child:not(:first-child)]:w-full sm:[&>*:last-child:not(:first-child)]:w-auto`}>
        <div>
          <h2 className={`text-sm font-semibold ${ui.text}`}>{title}</h2>
          {subtitle && <p className={`text-[11px] ${ui.muted}`}>{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </Card>
  );
}

function Segmented({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: (readonly [string, string])[] }) {
  const ui = useUi();
  return (
    <div className={`inline-flex p-0.5 rounded-lg ${ui.subtle} border ${ui.border}`}>
      {options.map(([v, label]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`px-3 py-1 text-xs rounded-md transition-all ${
            value === v ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow' : `${ui.muted} ${ui.isDark ? 'hover:text-white' : 'hover:text-gray-900'}`
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function MiniSearch({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const ui = useUi();
  return (
    <div className="relative flex-1 sm:flex-none min-w-[140px]">
      <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${ui.muted}`} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full sm:w-44 pl-8 pr-7 py-1.5 text-xs ${ui.input}`}
      />
      {value && (
        <button onClick={() => onChange('')} className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 ${ui.muted} hover:text-red-400`}>
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
