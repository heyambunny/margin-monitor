'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/providers/ThemeProvider';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { AnimatedProgress } from '@/components/ui/animated-progress';
import { 
  TrendingUp, DollarSign, Users, Receipt, RefreshCw, 
  BarChart3, PieChart, Activity, Zap, Clock,
  TrendingDown, Building2, Calendar
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Minimal blue shades for charts
const BLUE_SHADES = ['#3b82f6', '#60a5fa', '#93c5fd', '#2563eb', '#1d4ed8', '#bfdbfe', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7'];
const PIE_COLORS = ['#3b82f6', '#93c5fd'];

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [dashboardData, setDashboardData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expenseFilter, setExpenseFilter] = useState('all');

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
      const res = await fetch('http://localhost:8000/api/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch dashboard data: ${res.status}`);
      }

      const data = await res.json();
      setDashboardData(Array.isArray(data) ? data : []);
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
        quarterlyClientData: [],
        quarterlyTotals: {
          billed: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
          billedGM: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
          projected: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
          projectedGM: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
          totalBilled: 0,
          totalGM: 0,
        },
      };
    }

    const billed = dashboardData.filter((d: any) => d.expense_type_id !== 1);
    const projected = dashboardData.filter((d: any) => d.expense_type_id === 1);

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
      if (d.expense_type_id === 1) {
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

    // Quarterly Client Data - Billed/GM/Projected/Gm broken down by quarter per client
    const quarterlyClientMap: Record<string, any> = {};
    dashboardData.forEach((d: any) => {
      const name = d.client_name || 'Unknown';
      const rawMonth = d.invoice_month || 'Unknown';
      const month = rawMonth.split('-')[0];
      const monthMap: Record<string, string> = {
        'Apr': 'Q1', 'May': 'Q1', 'Jun': 'Q1',
        'Jul': 'Q2', 'Aug': 'Q2', 'Sep': 'Q2',
        'Oct': 'Q3', 'Nov': 'Q3', 'Dec': 'Q3',
        'Jan': 'Q4', 'Feb': 'Q4', 'Mar': 'Q4'
      };
      const quarter = monthMap[month];
      if (!quarter) return;

      if (!quarterlyClientMap[name]) {
        quarterlyClientMap[name] = {
          client_name: name,
          billed: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
          billedGM: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
          projected: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
          projectedGM: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
        };
      }

      const amt = d.client_billed_amount || 0;
      const margin = amt - (d.vendor_cost || 0) - (d.credit_note || 0);
      const bucket = quarterlyClientMap[name];

      if (d.expense_type_id === 1) {
        bucket.projected[quarter] += amt;
        bucket.projectedGM[quarter] += margin;
      } else {
        bucket.billed[quarter] += amt;
        bucket.billedGM[quarter] += margin;
      }
    });

    const quarterlyClientData = Object.values(quarterlyClientMap)
      .map((c: any) => {
        const totalBilled = c.billed.Q1 + c.billed.Q2 + c.billed.Q3 + c.billed.Q4;
        const totalGM = c.billedGM.Q1 + c.billedGM.Q2 + c.billedGM.Q3 + c.billedGM.Q4
          + c.projectedGM.Q1 + c.projectedGM.Q2 + c.projectedGM.Q3 + c.projectedGM.Q4;
        return { ...c, totalBilled, totalGM };
      })
      .sort((a: any, b: any) => b.totalBilled - a.totalBilled);

    const quarterlyTotals = quarterlyClientData.reduce((acc: any, c: any) => {
      (['Q1', 'Q2', 'Q3', 'Q4'] as const).forEach((q) => {
        acc.billed[q] += c.billed[q];
        acc.billedGM[q] += c.billedGM[q];
        acc.projected[q] += c.projected[q];
        acc.projectedGM[q] += c.projectedGM[q];
      });
      acc.totalBilled += c.totalBilled;
      acc.totalGM += c.totalGM;
      return acc;
    }, {
      billed: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
      billedGM: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
      projected: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
      projectedGM: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
      totalBilled: 0,
      totalGM: 0,
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
      quarterlyClientData,
      quarterlyTotals,
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
    quarterlyClientData,
    quarterlyTotals,
  } = processData();

  const currentYear = new Date().getFullYear();

  const tooltipStyle = {
    backgroundColor: tooltipBg,
    borderColor: tooltipBorder,
    color: tooltipText,
    fontSize: '10px',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 text-center ${textColor}`}>
        <p className="text-red-500">{error}</p>
        <button
          onClick={fetchData}
          className={`mt-2 text-sm ${textMuted} hover:text-white/80 transition`}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgColor} transition-colors duration-300 p-4`}>
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-lg font-semibold ${textColor}`}>Margin Monitor</h1>
            <p className={`text-xs ${textMuted}`}>Billing & Finance Platform · Management Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1 px-2 py-1 ${isDark ? 'bg-white/5' : 'bg-gray-100'} rounded-lg`}>
              <Clock className={`h-3.5 w-3.5 ${textMuted}`} />
              <span className={`text-xs ${textMuted}`}>Updated: Just now</span>
            </div>
            <div className={`flex items-center gap-1 px-2 py-1 ${isDark ? 'bg-white/5' : 'bg-gray-100'} rounded-lg`}>
              <Calendar className="h-3.5 w-3.5 text-blue-400" />
              <span className={`text-xs ${textMuted}`}>FY 2026-27</span>
            </div>
            <button
              onClick={fetchData}
              className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'} transition-colors`}
            >
              <RefreshCw className={`h-4 w-4 ${textMuted}`} />
            </button>
          </div>
        </div>

        {/* Total Revenue - TOP */}
        <Card className={`${cardBg} ${borderColor} border overflow-hidden relative`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500/10 rounded-xl">
                    <DollarSign className="h-7 w-7 text-blue-500" />
                  </div>
                  <div>
                    <p className={`text-sm ${textMuted}`}>Total Projected Billing</p>
                    <p className={`text-3xl font-bold ${textColor}`}>
                      <AnimatedNumber
                        value={total.amt}
                        duration={1500}
                        format={(val) => formatCurrency(val)}
                      />
                    </p>
                    <p className={`text-xs ${textMuted}`}>Margin <AnimatedNumber value={total.pct} duration={1200} format={(val) => val.toFixed(1)} />%</p>
                  </div>
                </div>
                <div className="mt-3">
                  <AnimatedProgress value={total.mar} max={total.amt} color="bg-blue-500" duration={1500} />
                </div>
              </div>
              <div className="flex items-center gap-6 ml-6">
                <div className="text-right">
                  <p className={`text-xs ${textMuted}`}>Total Records</p>
                  <p className={`text-sm font-semibold ${textColor}`}>
                    <AnimatedNumber value={totalRecords} duration={1000} />
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3 Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className={`${cardBg} ${borderColor} border`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[9px] rounded shrink-0">A</span>
                    <p className={`text-xs ${textMuted}`}>Billed</p>
                  </div>
                  <div className={`space-y-1.5 text-xs ${textColor}`}>
                    <div className="flex justify-between items-center">
                      <span className={textMuted}>Revenue</span>
                      <span className="font-medium truncate ml-2">
                        <AnimatedNumber value={billed.amt} duration={1000} format={(val) => formatCurrency(val)} />
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={textMuted}>Vendor Cost</span>
                      <span className="font-medium truncate ml-2">
                        <AnimatedNumber value={billed.ven} duration={1000} format={(val) => formatCurrency(val)} />
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={textMuted}>Margin</span>
                      <span className="font-medium text-blue-500 truncate ml-2">
                        <AnimatedNumber value={billed.mar} duration={1000} format={(val) => formatCurrency(val)} />
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-2 bg-blue-500/10 rounded-lg shrink-0 ml-2">
                  <Receipt className="h-4 w-4 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${cardBg} ${borderColor} border`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-1.5 py-0.5 bg-blue-300/20 text-blue-300 text-[9px] rounded shrink-0">B</span>
                    <p className={`text-xs ${textMuted}`}>Projected</p>
                  </div>
                  <div className={`space-y-1.5 text-xs ${textColor}`}>
                    <div className="flex justify-between items-center">
                      <span className={textMuted}>Revenue</span>
                      <span className="font-medium truncate ml-2">
                        <AnimatedNumber value={projected.amt} duration={1000} format={(val) => formatCurrency(val)} />
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={textMuted}>Vendor Cost</span>
                      <span className="font-medium truncate ml-2">
                        <AnimatedNumber value={projected.ven} duration={1000} format={(val) => formatCurrency(val)} />
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={textMuted}>Margin</span>
                      <span className="font-medium text-blue-500 truncate ml-2">
                        <AnimatedNumber value={projected.mar} duration={1000} format={(val) => formatCurrency(val)} />
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-2 bg-blue-300/10 rounded-lg shrink-0 ml-2">
                  <BarChart3 className="h-4 w-4 text-blue-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${cardBg} ${borderColor} border`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-1.5 py-0.5 bg-blue-700/20 text-blue-400 text-[9px] rounded shrink-0">C</span>
                    <p className={`text-xs ${textMuted}`}>Total</p>
                  </div>
                  <div className={`space-y-1.5 text-xs ${textColor}`}>
                    <div className="flex justify-between items-center">
                      <span className={textMuted}>Revenue</span>
                      <span className="font-medium truncate ml-2">
                        <AnimatedNumber value={total.amt} duration={1000} format={(val) => formatCurrency(val)} />
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={textMuted}>Vendor Cost</span>
                      <span className="font-medium truncate ml-2">
                        <AnimatedNumber value={total.ven} duration={1000} format={(val) => formatCurrency(val)} />
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={textMuted}>Margin</span>
                      <span className="font-medium text-blue-500 truncate ml-2">
                        <AnimatedNumber value={total.mar} duration={1000} format={(val) => formatCurrency(val)} />
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-2 bg-blue-700/10 rounded-lg shrink-0 ml-2">
                  <Activity className="h-4 w-4 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className={`${cardBg} ${borderColor} border`}>
            <CardContent className="p-3">
              <p className={`text-[9px] ${textMuted}`}>Revenue</p>
              <p className={`text-sm font-bold ${textColor}`}>
                <AnimatedNumber value={total.amt} duration={1000} format={(val) => formatCurrency(val)} />
              </p>
            </CardContent>
          </Card>
          <Card className={`${cardBg} ${borderColor} border`}>
            <CardContent className="p-3">
              <p className={`text-[9px] ${textMuted}`}>Margin</p>
              <p className={`text-sm font-bold text-blue-500`}>
                <AnimatedNumber value={total.mar} duration={1000} format={(val) => formatCurrency(val)} />
              </p>
            </CardContent>
          </Card>
          <Card className={`${cardBg} ${borderColor} border`}>
            <CardContent className="p-3">
              <p className={`text-[9px] ${textMuted}`}>Margin %</p>
              <p className={`text-sm font-bold ${textColor}`}>
                <AnimatedNumber value={total.pct} duration={1000} format={(val) => val.toFixed(1)} />%
              </p>
            </CardContent>
          </Card>
          <Card className={`${cardBg} ${borderColor} border`}>
            <CardContent className="p-3">
              <p className={`text-[9px] ${textMuted}`}>Billed Margin %</p>
              <p className={`text-sm font-bold text-blue-500`}>
                <AnimatedNumber value={billed.pct} duration={1000} format={(val) => val.toFixed(1)} />%
              </p>
            </CardContent>
          </Card>
          <Card className={`${cardBg} ${borderColor} border`}>
            <CardContent className="p-3">
              <p className={`text-[9px] ${textMuted}`}>Projected Margin %</p>
              <p className={`text-sm font-bold text-blue-400`}>
                <AnimatedNumber value={projected.pct} duration={1000} format={(val) => val.toFixed(1)} />%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue vs Margin Area Chart */}
        <Card className={`${cardBg} ${borderColor} border`}>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className={`text-sm font-medium ${textColor}`}>Revenue vs Margin</CardTitle>
                <CardDescription className={`text-xs ${textMuted}`}>Monthly trend</CardDescription>
              </div>
              <div className={`flex items-center gap-1 px-2 py-0.5 ${isDark ? 'bg-white/5' : 'bg-gray-100'} rounded-lg`}>
                <Zap className="h-3 w-3 text-blue-500" />
                <span className={`text-[10px] ${textMuted}`}>FY 2026-27</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 200 }}>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="fillMargin" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#93c5fd" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#93c5fd" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={chartGridColor} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={6} tick={{ fontSize: 9, fill: chartTickColor }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: chartTickColor }} width={30} tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => `₹${(Number(value) / 100000).toFixed(2)}L`} />
                  <Area dataKey="revenue" type="monotone" fill="url(#fillRevenue)" stroke="#3b82f6" strokeWidth={2} />
                  <Area dataKey="margin" type="monotone" fill="url(#fillMargin)" stroke="#93c5fd" strokeWidth={2} />
                  <Legend wrapperStyle={{ fontSize: '9px' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Client Performance & Revenue Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Top 10 Clients by Margin */}
          <Card className={`lg:col-span-2 ${cardBg} ${borderColor} border`}>
            <CardHeader className="p-3 pb-1">
              <CardTitle className={`text-xs font-medium ${textColor}`}>Top 10 Clients by Margin</CardTitle>
              <CardDescription className={`text-[10px] ${textMuted}`}>Vendor Cost · Gross Margin · Margin %</CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 300 }}>
                  <ComposedChart data={top10Clients} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 8, fill: chartTickColor }} angle={-30} textAnchor="end" height={60} />
                    <YAxis yAxisId="left" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: chartTickColor }} tickFormatter={(value) => formatChartValue(value)} />
                    <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#60a5fa' }} tickFormatter={(value) => `${value}%`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: any, name: string) => name === 'margin_pct' ? `${value}%` : formatCurrency(Number(value))} />
                    <Legend wrapperStyle={{ fontSize: '9px' }} />
                    <Bar yAxisId="left" dataKey="vendor" name="Vendor Cost" stackId="a" fill="#93c5fd" />
                    <Bar yAxisId="left" dataKey="margin" name="Gross Margin" stackId="a" fill="#3b82f6" />
                    <Line yAxisId="right" type="monotone" dataKey="margin_pct" name="Margin %" stroke="#1d4ed8" strokeWidth={2} dot={{ fill: '#1d4ed8', r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Split - Donut Chart */}
          <Card className={`${cardBg} ${borderColor} border`}>
            <CardHeader className="p-3 pb-1">
              <CardTitle className={`text-xs font-medium ${textColor}`}>Revenue Split</CardTitle>
              <CardDescription className={`text-[10px] ${textMuted}`}>Billed vs Projected</CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 400, height: 240 }}>
                  <RePieChart>
                    <Pie
                      data={revenueSplit}
                      cx="50%"
                      cy="50%"
                      innerRadius="55%"
                      outerRadius="80%"
                      dataKey="amount"
                      nameKey="stage"
                      label={({ percent, cx, cy, midAngle, innerRadius, outerRadius, index }: any) => {
                        if (!percent) return null;
                        const RADIAN = Math.PI / 180;
                        const radius = Number(innerRadius) + (Number(outerRadius) - Number(innerRadius)) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        return (
                          <text
                            x={x}
                            y={y}
                            fill={index === 0 ? '#ffffff' : '#1e3a8a'}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize={11}
                            fontWeight={600}
                          >
                            {`${(percent * 100).toFixed(0)}%`}
                          </text>
                        );
                      }}
                      labelLine={false}
                    >
                      {revenueSplit.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => `₹${(Number(value) / 100000).toFixed(2)}L`} />
                    <Legend wrapperStyle={{ fontSize: '9px' }} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <div className="text-center mt-0.5">
                <p className={`text-[10px] ${textMuted}`}>Total Revenue</p>
                <p className={`text-xs font-bold ${textColor}`}>
                  <AnimatedNumber value={total.amt} duration={1000} format={(val) => formatCurrency(val)} />
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Vendor Distribution & Revenue Contribution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className={`${cardBg} ${borderColor} border`}>
            <CardHeader className="p-3 pb-1">
              <CardTitle className={`text-xs font-medium ${textColor}`}>Vendor Distribution</CardTitle>
              <CardDescription className={`text-[10px] ${textMuted}`}>Vendor cost share</CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 400, height: 240 }}>
                  <RePieChart>
                    <Pie
                      data={vendorData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={false}
                      labelLine={false}
                    >
                      {vendorData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={BLUE_SHADES[index % BLUE_SHADES.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: any, name: any, props: any) => [formatCurrency(Number(value)), props.payload.name]} />
                    <Legend wrapperStyle={{ fontSize: '9px' }} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className={`${cardBg} ${borderColor} border`}>
            <CardHeader className="p-3 pb-1">
              <CardTitle className={`text-xs font-medium ${textColor}`}>Client Contribution</CardTitle>
              <CardDescription className={`text-[10px] ${textMuted}`}>Revenue share — top 10 clients</CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 400, height: 240 }}>
                  <RePieChart>
                    <Pie
                      data={top10Clients.map(c => ({ name: c.client_name, value: c.revenue || c.total_revenue }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={false}
                      labelLine={false}
                    >
                      {top10Clients.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={BLUE_SHADES[index % BLUE_SHADES.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: any, name: any, props: any) => [formatCurrency(Number(value)), props.payload.name]} />
                    <Legend wrapperStyle={{ fontSize: '9px' }} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quarterly Performance - 4 KPI Boxes */}
        <Card className={`${cardBg} ${borderColor} border`}>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className={`text-sm font-medium ${textColor}`}>Quarterly Performance</CardTitle>
                <CardDescription className={`text-xs ${textMuted}`}>Revenue, Margin &amp; QoQ Growth</CardDescription>
              </div>
              <div className={`flex items-center gap-1 px-2 py-0.5 ${isDark ? 'bg-white/5' : 'bg-gray-100'} rounded-lg`}>
                <Calendar className="h-3 w-3 text-blue-400" />
                <span className={`text-[10px] ${textMuted}`}>FY 2026-27</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(() => {
                const maxMargin = Math.max(...quarterlyData.map((x: any) => x.margin || 0), 1);
                return quarterlyData.map((q: any, idx: number) => {
                  const isFirst = idx === 0;
                  const growth = q.growth || 0;
                  const isPositive = growth >= 0;
                  const growthClass = isFirst ? textMuted : isPositive ? 'text-green-400' : 'text-red-400';
                  const isBest = q.margin > 0 && q.margin === maxMargin;
                  const GrowthIcon = isPositive ? TrendingUp : TrendingDown;

                  return (
                    <div
                      key={idx}
                      className={`relative p-4 rounded-xl border transition-colors ${
                        isBest
                          ? isDark
                            ? 'border-blue-500/40 bg-blue-500/[0.06]'
                            : 'border-blue-300 bg-blue-50/60'
                          : `${borderColor} ${isDark ? 'bg-white/[0.02]' : 'bg-gray-50/70'}`
                      }`}
                    >
                      {isBest && (
                        <span className="absolute top-2.5 right-2.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 text-[9px] font-medium">
                          <Zap className="h-2.5 w-2.5" /> Best
                        </span>
                      )}

                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-md text-[9px] font-bold ${isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                          {q.quarter}
                        </span>
                        <span className={`text-[10px] ${textMuted}`}>Margin</span>
                      </div>

                      <p className={`text-xl font-bold ${textColor} mt-2 leading-none`}>
                        <AnimatedNumber value={q.margin} duration={1000} format={(val) => formatCurrencyShort(val)} />
                      </p>

                      <div className="flex items-center justify-between mt-1.5">
                        <p className={`text-[10px] ${textMuted}`}>
                          Rev <span className={`font-medium ${textColor}`}>{formatCurrencyShort(q.revenue)}</span>
                        </p>
                        <p className={`text-[10px] font-semibold ${growthClass} flex items-center gap-0.5`}>
                          {!isFirst && <GrowthIcon className="h-2.5 w-2.5" />}
                          {isFirst ? 'Baseline' : `${Math.abs(growth).toFixed(1)}%`}
                        </p>
                      </div>

                      <div className="mt-3">
                        <AnimatedProgress
                          value={Math.max(q.margin, 0)}
                          max={maxMargin}
                          color={isBest ? 'bg-blue-500' : 'bg-blue-400/60'}
                          duration={1200}
                        />
                        <p className={`text-[9px] ${textMuted} mt-1 text-right`}>
                          {q.margin_pct.toFixed(1)}% margin
                        </p>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </CardContent>
        </Card>

        {/* All Clients Table - Without Status Column */}
        <Card className={`${cardBg} ${borderColor} border`}>
          <CardHeader className="p-3 pb-1">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className={`text-xs font-medium ${textColor}`}>Detailed Client Performance</CardTitle>
                <CardDescription className={`text-[10px] ${textMuted}`}>Revenue, Margin &amp; Vendor Cost</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className={`hidden sm:inline text-[10px] ${textMuted}`}>
                  {clientData.length} {clientData.length === 1 ? 'client' : 'clients'}
                </span>
                <Select value={expenseFilter} onValueChange={setExpenseFilter}>
                  <SelectTrigger className="w-[120px] h-7 text-xs">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="billed">Billed</SelectItem>
                    <SelectItem value="projected">Projected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="overflow-x-auto max-h-[340px] overflow-y-auto rounded-lg">
              <table className="w-full text-xs border-separate border-spacing-0">
                <thead className={`sticky top-0 z-10 ${isDark ? 'bg-[#171b2c]' : 'bg-gray-50'}`}>
                  <tr>
                    <th className={`text-[9px] uppercase tracking-wide text-left py-2 pl-2 ${textMuted} border-b ${borderColor}`}>#</th>
                    <th className={`text-[9px] uppercase tracking-wide text-left py-2 ${textMuted} border-b ${borderColor}`}>Client</th>
                    <th className={`text-[9px] uppercase tracking-wide text-right py-2 ${textMuted} border-b ${borderColor}`}>Revenue</th>
                    <th className={`text-[9px] uppercase tracking-wide text-right py-2 ${textMuted} border-b ${borderColor}`}>Vendor Cost</th>
                    <th className={`text-[9px] uppercase tracking-wide text-right py-2 ${textMuted} border-b ${borderColor}`}>Margin</th>
                    <th className={`text-[9px] uppercase tracking-wide text-right py-2 pr-2 ${textMuted} border-b ${borderColor}`}>Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  {clientData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className={`text-center py-8 ${textMuted}`}>
                        <div className="flex flex-col items-center gap-1.5">
                          <Users className="h-5 w-5 opacity-40" />
                          <span className="text-xs">No client data available</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      const maxRevenue = Math.max(...clientData.map((c: any) => c.revenue || 0), 1);
                      return clientData.map((client: any, idx: number) => {
                        const pct = client.margin_pct || 0;
                        const isPositive = (client.margin || 0) >= 0;
                        const revenueShare = Math.min(((client.revenue || 0) / maxRevenue) * 100, 100);
                        const pctBadgeClass = pct >= 20
                          ? (isDark ? 'bg-green-500/15 text-green-400' : 'bg-green-100 text-green-700')
                          : pct >= 0
                            ? (isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-100 text-amber-700')
                            : (isDark ? 'bg-red-500/15 text-red-400' : 'bg-red-100 text-red-700');
                        const GrowthIcon = isPositive ? TrendingUp : TrendingDown;

                        return (
                          <tr
                            key={idx}
                            className={`group border-b ${borderColor} ${idx % 2 === 1 ? (isDark ? 'bg-white/[0.02]' : 'bg-gray-50/50') : ''} hover:${isDark ? 'bg-white/5' : 'bg-blue-50/60'} transition-colors`}
                          >
                            <td className={`text-[9px] py-2 pl-2 ${textMuted}`}>{idx + 1}</td>
                            <td className={`py-2 ${textColor}`}>
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className="flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold text-white shrink-0"
                                  style={{ backgroundColor: BLUE_SHADES[idx % BLUE_SHADES.length] }}
                                >
                                  {(client.client_name || '?').charAt(0).toUpperCase()}
                                </div>
                                <span className="text-[10px] truncate max-w-[160px]" title={client.client_name}>
                                  {client.client_name}
                                </span>
                              </div>
                            </td>
                            <td className="relative text-right py-2">
                              <div
                                className={`absolute inset-y-1.5 right-0 rounded-l ${isDark ? 'bg-blue-500/10' : 'bg-blue-100/70'}`}
                                style={{ width: `${revenueShare}%` }}
                              />
                              <span className={`relative text-[10px] font-medium pr-2 ${textColor}`}>
                                <AnimatedNumber value={client.revenue || 0} duration={600} format={(val) => formatCurrencyShort(val)} />
                              </span>
                            </td>
                            <td className={`text-[10px] text-right py-2 ${textMuted}`}>
                              <AnimatedNumber value={client.vendor || 0} duration={600} format={(val) => formatCurrencyShort(val)} />
                            </td>
                            <td className={`text-[10px] text-right py-2 font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                              <span className="inline-flex items-center gap-0.5">
                                <GrowthIcon className="h-2.5 w-2.5" />
                                <AnimatedNumber value={client.margin || 0} duration={600} format={(val) => formatCurrencyShort(val)} />
                              </span>
                            </td>
                            <td className="text-right py-2 pr-2">
                              <span className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${pctBadgeClass}`}>
                                <AnimatedNumber value={pct} duration={600} format={(val) => val.toFixed(1)} />%
                              </span>
                            </td>
                          </tr>
                        );
                      });
                    })()
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Quarterly Client Breakdown - Billed / GM / Projected / Gm */}
        <Card className={`${cardBg} ${borderColor} border`}>
          <CardHeader className="p-3 pb-1">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className={`text-xs font-medium ${textColor}`}>Quarterly Client Breakdown</CardTitle>
                <CardDescription className={`text-[10px] ${textMuted}`}>Billed &amp; Projected revenue with Gross Margin (GM) by quarter</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className={`flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded ${isDark ? 'bg-orange-500/10 text-orange-300' : 'bg-orange-100 text-orange-700'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-orange-400' : 'bg-orange-500'}`} /> Billed
                </span>
                <span className={`flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded ${isDark ? 'bg-green-500/10 text-green-300' : 'bg-green-100 text-green-700'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-green-400' : 'bg-green-500'}`} /> Projected
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className={`text-[9px] ${textMuted} mb-1.5 sm:hidden`}>Scroll horizontally to see all quarters →</p>
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto rounded-lg border-collapse">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 z-20">
                  <tr>
                    <th rowSpan={2} className={`sticky left-0 z-30 text-[9px] text-left py-2 pl-2 pr-3 align-bottom ${cardBg} ${textMuted} border-b border-r ${borderColor}`}>Client</th>
                    <th colSpan={4} className={`text-[9px] text-center py-1.5 ${textColor} font-semibold border-b border-l-2 ${borderColor} ${isDark ? 'bg-orange-500/15 border-l-orange-400/60' : 'bg-orange-100 border-l-orange-400'}`}>
                      <span className="inline-flex items-center gap-1"><Receipt className="h-2.5 w-2.5" /> Billed</span>
                    </th>
                    <th colSpan={4} className={`text-[9px] text-center py-1.5 ${textColor} font-semibold border-b ${borderColor} ${isDark ? 'bg-orange-500/25' : 'bg-orange-200/70'}`}>
                      <span className="inline-flex items-center gap-1"><TrendingUp className="h-2.5 w-2.5" /> GM</span>
                    </th>
                    <th colSpan={4} className={`text-[9px] text-center py-1.5 ${textColor} font-semibold border-b border-l-2 ${borderColor} ${isDark ? 'bg-green-500/15 border-l-green-400/60' : 'bg-green-100 border-l-green-400'}`}>
                      <span className="inline-flex items-center gap-1"><BarChart3 className="h-2.5 w-2.5" /> Projected</span>
                    </th>
                    <th colSpan={4} className={`text-[9px] text-center py-1.5 ${textColor} font-semibold border-b ${borderColor} ${isDark ? 'bg-green-500/25' : 'bg-green-200/70'}`}>
                      <span className="inline-flex items-center gap-1"><TrendingUp className="h-2.5 w-2.5" /> GM</span>
                    </th>
                    <th rowSpan={2} className={`text-[9px] text-right py-2 px-2 align-bottom border-b border-l-2 ${borderColor} ${isDark ? 'bg-blue-500/10 text-blue-300 border-l-blue-400/60' : 'bg-blue-50 text-blue-700 border-l-blue-400'}`}>Total Billed</th>
                    <th rowSpan={2} className={`text-[9px] text-right py-2 px-2 align-bottom border-b ${borderColor} ${isDark ? 'bg-blue-500/10 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>Total GM</th>
                  </tr>
                  <tr>
                    {['Q1', 'Q2', 'Q3', 'Q4'].map((q, i) => (
                      <th key={`b-${q}`} className={`text-[9px] text-right py-1 px-2 font-normal ${textMuted} border-b ${i === 0 ? 'border-l-2' : ''} ${borderColor} ${isDark ? `bg-orange-500/10 ${i === 0 ? 'border-l-orange-400/60' : ''}` : `bg-orange-50 ${i === 0 ? 'border-l-orange-400' : ''}`}`}>{q}</th>
                    ))}
                    {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => (
                      <th key={`bg-${q}`} className={`text-[9px] text-right py-1 px-2 font-normal ${textMuted} ${isDark ? 'bg-orange-500/15' : 'bg-orange-100/70'} border-b ${borderColor}`}>{q}</th>
                    ))}
                    {['Q1', 'Q2', 'Q3', 'Q4'].map((q, i) => (
                      <th key={`p-${q}`} className={`text-[9px] text-right py-1 px-2 font-normal ${textMuted} border-b ${i === 0 ? 'border-l-2' : ''} ${borderColor} ${isDark ? `bg-green-500/10 ${i === 0 ? 'border-l-green-400/60' : ''}` : `bg-green-50 ${i === 0 ? 'border-l-green-400' : ''}`}`}>{q}</th>
                    ))}
                    {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => (
                      <th key={`pg-${q}`} className={`text-[9px] text-right py-1 px-2 font-normal ${textMuted} ${isDark ? 'bg-green-500/15' : 'bg-green-100/70'} border-b ${borderColor}`}>{q}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {quarterlyClientData.length === 0 ? (
                    <tr>
                      <td colSpan={18} className={`text-center py-8 ${textMuted}`}>
                        <div className="flex flex-col items-center gap-1.5">
                          <Users className="h-5 w-5 opacity-40" />
                          <span className="text-xs">No client data available</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    quarterlyClientData.map((client: any, idx: number) => {
                      const rowBg = idx % 2 === 1 ? (isDark ? '#161a2b' : '#fafafa') : (isDark ? '#131726' : '#ffffff');
                      const fmt = (v: number) => (v ? formatCurrencyShort(v) : '–');
                      return (
                        <tr key={idx} className={`border-b ${borderColor} hover:${isDark ? 'bg-white/5' : 'bg-blue-50/50'} transition-colors`}>
                          <td
                            className={`sticky left-0 z-10 text-[10px] py-1.5 pl-2 pr-3 whitespace-nowrap ${textColor} border-r ${borderColor}`}
                            style={{ backgroundColor: rowBg }}
                          >
                            <div className="flex items-center gap-1.5">
                              <div
                                className="flex items-center justify-center w-4 h-4 rounded-full text-[8px] font-bold text-white shrink-0"
                                style={{ backgroundColor: BLUE_SHADES[idx % BLUE_SHADES.length] }}
                              >
                                {(client.client_name || '?').charAt(0).toUpperCase()}
                              </div>
                              <span className="truncate max-w-[130px]" title={client.client_name}>{client.client_name}</span>
                            </div>
                          </td>
                          {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((q, i) => (
                            <td key={`b-${q}`} className={`text-[10px] text-right py-1.5 px-2 ${textColor} ${i === 0 ? 'border-l-2' : ''} ${i === 0 ? (isDark ? 'border-l-orange-400/30' : 'border-l-orange-300') : ''} ${isDark ? 'bg-orange-500/5' : 'bg-orange-50/40'}`}>
                              {fmt(client.billed[q])}
                            </td>
                          ))}
                          {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((q) => (
                            <td key={`bg-${q}`} className={`text-[10px] text-right py-1.5 px-2 font-medium ${client.billedGM[q] > 0 ? 'text-green-400' : client.billedGM[q] < 0 ? 'text-red-400' : textMuted} ${isDark ? 'bg-orange-500/10' : 'bg-orange-100/40'}`}>
                              {fmt(client.billedGM[q])}
                            </td>
                          ))}
                          {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((q, i) => (
                            <td key={`p-${q}`} className={`text-[10px] text-right py-1.5 px-2 ${textColor} ${i === 0 ? 'border-l-2' : ''} ${i === 0 ? (isDark ? 'border-l-green-400/30' : 'border-l-green-300') : ''} ${isDark ? 'bg-green-500/5' : 'bg-green-50/40'}`}>
                              {fmt(client.projected[q])}
                            </td>
                          ))}
                          {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((q) => (
                            <td key={`pg-${q}`} className={`text-[10px] text-right py-1.5 px-2 font-medium ${client.projectedGM[q] > 0 ? 'text-green-400' : client.projectedGM[q] < 0 ? 'text-red-400' : textMuted} ${isDark ? 'bg-green-500/10' : 'bg-green-100/40'}`}>
                              {fmt(client.projectedGM[q])}
                            </td>
                          ))}
                          <td className={`text-[10px] text-right py-1.5 px-2 font-semibold border-l-2 ${isDark ? 'border-l-blue-400/30 bg-blue-500/5' : 'border-l-blue-300 bg-blue-50/50'} ${textColor}`}>
                            {fmt(client.totalBilled)}
                          </td>
                          <td className={`text-[10px] text-right py-1.5 px-2 font-semibold ${isDark ? 'bg-blue-500/5' : 'bg-blue-50/50'} ${client.totalGM > 0 ? 'text-green-400' : client.totalGM < 0 ? 'text-red-400' : textMuted}`}>
                            {fmt(client.totalGM)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {quarterlyClientData.length > 0 && (
                  <tfoot>
                    <tr className="sticky bottom-0 z-10 font-semibold">
                      <td className={`sticky left-0 z-10 text-[10px] py-2 pl-2 pr-3 border-r border-white/10 ${isDark ? 'bg-[#1a1f33]' : 'bg-gray-900'} text-white`}>Total</td>
                      {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((q) => (
                        <td key={`tb-${q}`} className={`text-[10px] text-right py-2 px-2 text-white ${isDark ? 'bg-[#1a1f33]' : 'bg-gray-900'}`}>
                          {formatCurrencyShort(quarterlyTotals.billed[q])}
                        </td>
                      ))}
                      {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((q) => (
                        <td key={`tbg-${q}`} className={`text-[10px] text-right py-2 px-2 text-white ${isDark ? 'bg-[#1a1f33]' : 'bg-gray-900'}`}>
                          {formatCurrencyShort(quarterlyTotals.billedGM[q])}
                        </td>
                      ))}
                      {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((q) => (
                        <td key={`tp-${q}`} className={`text-[10px] text-right py-2 px-2 text-white ${isDark ? 'bg-[#1a1f33]' : 'bg-gray-900'}`}>
                          {formatCurrencyShort(quarterlyTotals.projected[q])}
                        </td>
                      ))}
                      {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((q) => (
                        <td key={`tpg-${q}`} className={`text-[10px] text-right py-2 px-2 text-white ${isDark ? 'bg-[#1a1f33]' : 'bg-gray-900'}`}>
                          {formatCurrencyShort(quarterlyTotals.projectedGM[q])}
                        </td>
                      ))}
                      <td className={`text-[10px] text-right py-2 px-2 text-blue-300 ${isDark ? 'bg-[#1a1f33]' : 'bg-gray-900'}`}>
                        {formatCurrencyShort(quarterlyTotals.totalBilled)}
                      </td>
                      <td className={`text-[10px] text-right py-2 px-2 text-blue-300 ${isDark ? 'bg-[#1a1f33]' : 'bg-gray-900'}`}>
                        {formatCurrencyShort(quarterlyTotals.totalGM)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className={`text-center py-6 text-[10px] ${textMuted} border-t ${borderColor}`}>
          Protected by 256-bit encryption · © 2025 Evolve Brands Pvt Ltd
        </div>
      </div>
    </div>
  );
}