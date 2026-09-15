'use client';

import { useState, useEffect, Fragment } from 'react';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/providers/ThemeProvider';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { 
  Users, Building2, DollarSign, TrendingUp, 
  RefreshCw, User, BarChart3, PieChart,
  ArrowUp, ArrowDown, Calendar, Receipt,
  CreditCard, Wallet, ChevronDown
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from 'recharts';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Minimal blue shades for avatars - matches the main dashboard palette
const BLUE_SHADES = ['#3b82f6', '#60a5fa', '#93c5fd', '#2563eb', '#1d4ed8', '#bfdbfe', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7'];

export default function OverviewPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [data, setData] = useState<any>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState('');
  const [expandedSupervisor, setExpandedSupervisor] = useState<number | null>(null);

  const bgColor = isDark ? 'bg-[#0b0e1a]' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-[#131726]' : 'bg-white';
  const borderColor = isDark ? 'border-white/5' : 'border-gray-200';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';

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
    setIsFetching(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/overview', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch overview data');
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setIsFetching(false);
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

  const toggleExpand = (id: number) => {
    setExpandedSupervisor(expandedSupervisor === id ? null : id);
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
        <Button onClick={fetchData} variant="outline" className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  const supervisors = data?.supervisors || [];
  const summary = data?.summary || { 
    totalSupervisors: 0, 
    totalClients: 0, 
    totalBilling: 0,
    totalVendor: 0,
    totalCreditNotes: 0,
    totalMargin: 0,
    avgMargin: 0,
    avgMarginPct: 0
  };

  const chartData = supervisors.map((s: any) => ({
    name: s.name.split(' ')[0],
    billing: s.billing / 100000,
    margin: s.margin / 100000,
    marginPct: s.margin_pct || 0,
    vendor: s.vendor / 100000,
    creditNotes: s.credit_notes / 100000,
  }));

  return (
    <div className={`min-h-screen ${bgColor} transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h1 className={`text-lg font-semibold ${textColor}`}>Overview</h1>
            <p className={`text-xs ${textMuted}`}>Supervisor performance dashboard</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchData} 
            className={`h-8 w-8 p-0 ${cardBg} ${borderColor} border`}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${textMuted}`} />
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-7 gap-2 mb-4">
          <div className={`p-2 ${cardBg} border ${borderColor} rounded-lg`}>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 text-blue-400" />
              <span className={`text-[8px] ${textMuted}`}>Supervisors</span>
            </div>
            <p className={`text-sm font-bold ${textColor} mt-0.5`}>
              <AnimatedNumber value={summary.totalSupervisors} duration={800} />
            </p>
          </div>
          <div className={`p-2 ${cardBg} border ${borderColor} rounded-lg`}>
            <div className="flex items-center gap-1">
              <Building2 className="h-3 w-3 text-green-400" />
              <span className={`text-[8px] ${textMuted}`}>Clients</span>
            </div>
            <p className={`text-sm font-bold ${textColor} mt-0.5`}>
              <AnimatedNumber value={summary.totalClients} duration={800} />
            </p>
          </div>
          <div className={`p-2 ${cardBg} border ${borderColor} rounded-lg`}>
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-purple-400" />
              <span className={`text-[8px] ${textMuted}`}>Billing</span>
            </div>
            <p className={`text-sm font-bold ${textColor} mt-0.5`}>
              <AnimatedNumber
                value={summary.totalBilling}
                duration={1000}
                format={(val) => formatCurrencyShort(val)}
              />
            </p>
          </div>
          <div className={`p-2 ${cardBg} border ${borderColor} rounded-lg`}>
            <div className="flex items-center gap-1">
              <Wallet className="h-3 w-3 text-orange-400" />
              <span className={`text-[8px] ${textMuted}`}>Vendor Cost</span>
            </div>
            <p className={`text-sm font-bold ${textColor} mt-0.5`}>
              <AnimatedNumber
                value={summary.totalVendor}
                duration={1000}
                format={(val) => formatCurrencyShort(val)}
              />
            </p>
          </div>
          <div className={`p-2 ${cardBg} border ${borderColor} rounded-lg`}>
            <div className="flex items-center gap-1">
              <Receipt className="h-3 w-3 text-red-400" />
              <span className={`text-[8px] ${textMuted}`}>Credit Notes</span>
            </div>
            <p className={`text-sm font-bold ${textColor} mt-0.5`}>
              <AnimatedNumber
                value={summary.totalCreditNotes}
                duration={1000}
                format={(val) => formatCurrencyShort(val)}
              />
            </p>
          </div>
          <div className={`p-2 ${cardBg} border ${borderColor} rounded-lg`}>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-amber-400" />
              <span className={`text-[8px] ${textMuted}`}>Margin %</span>
            </div>
            <p className={`text-sm font-bold ${textColor} mt-0.5`}>
              <AnimatedNumber value={summary.avgMarginPct || 0} duration={800} format={(val) => val.toFixed(1)} />%
            </p>
          </div>
          <div className={`p-2 ${cardBg} border ${borderColor} rounded-lg`}>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-400" />
              <span className={`text-[8px] ${textMuted}`}>Total Margin</span>
            </div>
            <p className={`text-sm font-bold text-green-400 mt-0.5`}>
              <AnimatedNumber
                value={summary.totalMargin}
                duration={1000}
                format={(val) => formatCurrencyShort(val)}
              />
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <Card className={`${cardBg} ${borderColor} border`}>
            <CardHeader className="p-3 pb-1">
              <CardTitle className={`text-xs font-medium ${textColor}`}>Billing vs Margin</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 300 }}>
                  <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                    <XAxis 
                      dataKey="name" 
                      tickLine={false}
                      tickMargin={6}
                      axisLine={false}
                      tick={{ fontSize: 9, fill: isDark ? '#94a3b8' : '#64748b' }}
                    />
                    <YAxis 
                      yAxisId="left"
                      tickFormatter={(value) => `₹${value}L`}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 9, fill: isDark ? '#94a3b8' : '#64748b' }}
                      width={35}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      tickFormatter={(value) => `${value}%`}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 9, fill: isDark ? '#94a3b8' : '#64748b' }}
                      width={30}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? '#131726' : '#fff',
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
                        color: isDark ? '#fff' : '#000',
                        fontSize: '9px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '9px' }} />
                    <Bar yAxisId="left" dataKey="billing" fill="#3b82f6" name="Billing (L)" radius={[3, 3, 0, 0]} />
                    <Bar yAxisId="left" dataKey="margin" fill="#60a5fa" name="Margin (L)" radius={[3, 3, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="marginPct" stroke="#f59e0b" name="Margin %" strokeWidth={2} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className={`${cardBg} ${borderColor} border`}>
            <CardHeader className="p-3 pb-1">
              <CardTitle className={`text-xs font-medium ${textColor}`}>Expense Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 300 }}>
                  <BarChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                    <XAxis 
                      dataKey="name" 
                      tickLine={false}
                      tickMargin={6}
                      axisLine={false}
                      tick={{ fontSize: 9, fill: isDark ? '#94a3b8' : '#64748b' }}
                    />
                    <YAxis 
                      tickFormatter={(value) => `₹${value}L`}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 9, fill: isDark ? '#94a3b8' : '#64748b' }}
                      width={35}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? '#131726' : '#fff',
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
                        color: isDark ? '#fff' : '#000',
                        fontSize: '9px',
                      }}
                      formatter={(value: any) => `₹${(Number(value)).toFixed(1)}L`}
                    />
                    <Legend wrapperStyle={{ fontSize: '9px' }} />
                    <Bar dataKey="vendor" fill="#f59e0b" name="Vendor Cost" stackId="a" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="creditNotes" fill="#ef4444" name="Credit Notes" stackId="a" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Supervisor Table with Client Breakdown */}
        <Card className={`${cardBg} ${borderColor} border`}>
          <CardHeader className="p-3 pb-1">
            <div className="flex items-center justify-between">
              <CardTitle className={`text-xs font-medium ${textColor}`}>Supervisor Performance</CardTitle>
              <span className={`text-[10px] ${textMuted}`}>
                {supervisors.length} {supervisors.length === 1 ? 'supervisor' : 'supervisors'}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="overflow-x-auto rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className={`border-b ${borderColor} ${isDark ? 'bg-white/[0.03]' : 'bg-gray-50'} hover:bg-transparent`}>
                    <TableHead className={`text-[9px] uppercase tracking-wide py-2 ${textMuted}`}>Supervisor</TableHead>
                    <TableHead className={`text-[9px] uppercase tracking-wide text-right py-2 ${textMuted}`}>Clients</TableHead>
                    <TableHead className={`text-[9px] uppercase tracking-wide text-right py-2 ${textMuted}`}>Billing</TableHead>
                    <TableHead className={`text-[9px] uppercase tracking-wide text-right py-2 ${textMuted}`}>Vendor Cost</TableHead>
                    <TableHead className={`text-[9px] uppercase tracking-wide text-right py-2 ${textMuted}`}>Credit Notes</TableHead>
                    <TableHead className={`text-[9px] uppercase tracking-wide text-right py-2 ${textMuted}`}>Margin</TableHead>
                    <TableHead className={`text-[9px] uppercase tracking-wide text-right py-2 ${textMuted}`}>Margin %</TableHead>
                    <TableHead className="w-8 py-2" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supervisors.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={8} className={`text-center py-8 ${textMuted}`}>
                        <div className="flex flex-col items-center gap-1.5">
                          <Users className="h-5 w-5 opacity-40" />
                          <span className="text-xs">No supervisors found</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    (() => {
                      const maxBilling = Math.max(...supervisors.map((s: any) => s.billing || 0), 1);
                      return supervisors.map((s: any, idx: number) => {
                        const isExpanded = expandedSupervisor === s.id;
                        const isPositive = (s.margin || 0) >= 0;
                        const pct = s.margin_pct || 0;
                        const pctBadgeClass = pct >= 20
                          ? (isDark ? 'bg-green-500/15 text-green-400' : 'bg-green-100 text-green-700')
                          : pct >= 0
                            ? (isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-100 text-amber-700')
                            : (isDark ? 'bg-red-500/15 text-red-400' : 'bg-red-100 text-red-700');
                        const billingShare = Math.min(((s.billing || 0) / maxBilling) * 100, 100);
                        const TrendIcon = isPositive ? ArrowUp : ArrowDown;

                        return (
                          <Fragment key={idx}>
                            <TableRow
                              className={`border-b ${borderColor} ${isExpanded ? (isDark ? 'bg-blue-500/5' : 'bg-blue-50/40') : idx % 2 === 1 ? (isDark ? 'bg-white/[0.015]' : 'bg-gray-50/40') : ''} hover:${isDark ? 'bg-white/5' : 'bg-blue-50/60'} transition-colors cursor-pointer`}
                              onClick={() => toggleExpand(s.id)}
                            >
                              <TableCell className={`text-[10px] py-2 font-medium ${textColor}`}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                                    style={{ backgroundColor: BLUE_SHADES[idx % BLUE_SHADES.length] }}
                                  >
                                    {(s.name || '?').charAt(0).toUpperCase()}
                                  </div>
                                  <span className="truncate max-w-[140px]" title={s.name}>{s.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className={`text-[10px] text-right py-2 ${textColor}`}>
                                <AnimatedNumber value={s.clients} duration={800} />
                              </TableCell>
                              <TableCell className="relative text-right py-2">
                                <div
                                  className={`absolute inset-y-1.5 right-0 rounded-l ${isDark ? 'bg-blue-500/10' : 'bg-blue-100/70'}`}
                                  style={{ width: `${billingShare}%` }}
                                />
                                <span className={`relative text-[10px] font-medium pr-1 ${textColor}`}>
                                  <AnimatedNumber value={s.billing} duration={1000} format={(val) => formatCurrencyShort(val)} />
                                </span>
                              </TableCell>
                              <TableCell className={`text-[10px] text-right py-2 ${textMuted}`}>
                                <AnimatedNumber value={s.vendor} duration={1000} format={(val) => formatCurrencyShort(val)} />
                              </TableCell>
                              <TableCell className={`text-[10px] text-right py-2 ${textMuted}`}>
                                <AnimatedNumber value={s.credit_notes} duration={1000} format={(val) => formatCurrencyShort(val)} />
                              </TableCell>
                              <TableCell className={`text-[10px] text-right py-2 font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                                <span className="inline-flex items-center gap-0.5">
                                  <TrendIcon className="h-2.5 w-2.5" />
                                  <AnimatedNumber value={s.margin} duration={1000} format={(val) => formatCurrencyShort(val)} />
                                </span>
                              </TableCell>
                              <TableCell className="text-right py-2">
                                <span className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${pctBadgeClass}`}>
                                  <AnimatedNumber value={pct} duration={800} format={(val) => val.toFixed(1)} />%
                                </span>
                              </TableCell>
                              <TableCell className="py-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleExpand(s.id); }}
                                  className={`p-1 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-200'} transition-colors`}
                                  aria-label={isExpanded ? 'Collapse client details' : 'Expand client details'}
                                >
                                  <ChevronDown className={`h-3.5 w-3.5 ${textMuted} transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                </button>
                              </TableCell>
                            </TableRow>
                            {isExpanded && s.client_breakdown && s.client_breakdown.length > 0 && (
                              <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={8} className={`p-0 ${isDark ? 'bg-white/[0.03]' : 'bg-gray-50'}`}>
                                  <div className="p-3 pl-10">
                                    <p className={`flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide ${textMuted} mb-2`}>
                                      <Building2 className="h-2.5 w-2.5" /> Client Details
                                    </p>
                                    <div className={`rounded-lg border ${borderColor} overflow-hidden`}>
                                      <Table>
                                        <TableHeader>
                                          <TableRow className={`border-b ${borderColor} hover:bg-transparent`}>
                                            <TableHead className={`text-[8px] py-1.5 pl-2 ${textMuted}`}>Client</TableHead>
                                            <TableHead className={`text-[8px] text-right py-1.5 ${textMuted}`}>Billing</TableHead>
                                            <TableHead className={`text-[8px] text-right py-1.5 ${textMuted}`}>Vendor</TableHead>
                                            <TableHead className={`text-[8px] text-right py-1.5 ${textMuted}`}>Credit Notes</TableHead>
                                            <TableHead className={`text-[8px] text-right py-1.5 ${textMuted}`}>Margin</TableHead>
                                            <TableHead className={`text-[8px] text-right py-1.5 pr-2 ${textMuted}`}>Margin %</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {s.client_breakdown.map((client: any, cIdx: number) => {
                                            const cPct = client.margin_pct || 0;
                                            const cPctBadgeClass = cPct >= 20
                                              ? (isDark ? 'bg-green-500/15 text-green-400' : 'bg-green-100 text-green-700')
                                              : cPct >= 0
                                                ? (isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-100 text-amber-700')
                                                : (isDark ? 'bg-red-500/15 text-red-400' : 'bg-red-100 text-red-700');
                                            return (
                                              <TableRow key={cIdx} className={`border-b ${borderColor} last:border-b-0 hover:${isDark ? 'bg-white/5' : 'bg-white'}`}>
                                                <TableCell className={`text-[9px] py-1.5 pl-2 ${textColor}`}>{client.client_name}</TableCell>
                                                <TableCell className={`text-[9px] text-right py-1.5 ${textColor}`}>{formatCurrencyShort(client.billing)}</TableCell>
                                                <TableCell className={`text-[9px] text-right py-1.5 ${textMuted}`}>{formatCurrencyShort(client.vendor)}</TableCell>
                                                <TableCell className={`text-[9px] text-right py-1.5 ${textMuted}`}>{formatCurrencyShort(client.credit_notes)}</TableCell>
                                                <TableCell className={`text-[9px] text-right py-1.5 font-medium ${client.margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                  {formatCurrencyShort(client.margin)}
                                                </TableCell>
                                                <TableCell className="text-right py-1.5 pr-2">
                                                  <span className={`inline-block px-1.5 py-0.5 rounded-full text-[8px] font-semibold ${cPctBadgeClass}`}>
                                                    {cPct.toFixed(1)}%
                                                  </span>
                                                </TableCell>
                                              </TableRow>
                                            );
                                          })}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </Fragment>
                        );
                      });
                    })()
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
