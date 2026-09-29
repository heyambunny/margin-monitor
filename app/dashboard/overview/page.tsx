'use client';

import { useState, useEffect, Fragment } from 'react';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import {
  Users, Building2, IndianRupee, TrendingUp, ArrowUp, ArrowDown, Receipt, Wallet, ChevronDown, Percent, LayoutGrid, AlertTriangle,
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
import { API_URL } from '@/lib/api';
import {
  useUi, PageHeader, RefreshButton, StatGrid, Card, TableShell, THead, Th, Tr, EmptyRow, EmptyState, Avatar, Badge,
  PageSkeleton, type BadgeTone,
} from '@/components/app/ui';

const pctTone = (pct: number): BadgeTone => (pct >= 20 ? 'green' : pct >= 0 ? 'amber' : 'red');

export default function OverviewPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const ui = useUi();
  const isDark = ui.isDark;

  const [data, setData] = useState<any>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState('');
  const [expandedSupervisor, setExpandedSupervisor] = useState<number | null>(null);

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
      const response = await fetch(`${API_URL}/api/overview`, {
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

  if (isFetching && !data) {
    return <PageSkeleton />;
  }

  if (error) {
    return (
      <Card className="p-10">
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load the overview"
          hint={error}
          action={<button onClick={fetchData} className="mt-1 text-xs text-blue-400 hover:underline">Try again</button>}
        />
      </Card>
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

  const tick = { fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' };
  const tooltipStyle = {
    backgroundColor: isDark ? '#1b2033' : '#fff',
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
    borderRadius: 10,
    color: isDark ? '#fff' : '#000',
    fontSize: 12,
  };
  const gridStroke = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const maxBilling = Math.max(...supervisors.map((s: any) => s.billing || 0), 1);

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        icon={LayoutGrid}
        title="Overview"
        subtitle="Supervisor performance at a glance · click a supervisor to see their clients"
        gradient="from-violet-500 to-fuchsia-500"
        actions={<RefreshButton onClick={fetchData} loading={isFetching} />}
      />

      <StatGrid
        stats={[
          { label: 'Billing', value: summary.totalBilling, icon: IndianRupee, color: 'blue', money: true },
          { label: 'Total Margin', value: summary.totalMargin, icon: TrendingUp, color: 'emerald', money: true },
          { label: 'Margin %', value: summary.avgMarginPct || 0, icon: Percent, color: 'amber', suffix: '%', decimals: 1 },
          { label: 'Vendor Cost', value: summary.totalVendor, icon: Wallet, color: 'purple', money: true },
        ]}
      />
      <div className="grid grid-cols-3 gap-3 -mt-3 mb-6">
        {[
          { label: 'Supervisors', value: summary.totalSupervisors, icon: Users },
          { label: 'Clients', value: summary.totalClients, icon: Building2 },
          { label: 'Credit Notes', value: formatCurrencyShort(summary.totalCreditNotes), icon: Receipt },
        ].map((m) => (
          <div key={m.label} className={`flex items-center justify-between px-4 py-2.5 rounded-xl border ${ui.border} ${ui.card}`}>
            <span className={`flex items-center gap-2 text-xs ${ui.muted}`}>
              <m.icon className="h-3.5 w-3.5" />
              {m.label}
            </span>
            <span className={`text-sm font-semibold ${ui.text} tabular-nums`}>{m.value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="p-4 animate-in fade-in slide-in-from-bottom-2 fill-mode-both">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className={`text-sm font-semibold ${ui.text}`}>Billing vs Margin</h2>
            <span className={`text-[11px] ${ui.muted}`}>₹ lakh · margin % on right</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 300 }}>
              <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="billingFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.5} />
                  </linearGradient>
                  <linearGradient id="marginFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity={0.5} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="name" tickLine={false} tickMargin={6} axisLine={false} tick={tick} />
                <YAxis yAxisId="left" tickFormatter={(value) => `₹${value}L`} tickLine={false} axisLine={false} tick={tick} width={58} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} tick={tick} width={35} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} formatter={(value) => <span style={{ color: tick.fill }}>{value}</span>} />
                <Bar yAxisId="left" dataKey="billing" fill="url(#billingFill)" name="Billing (L)" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="margin" fill="url(#marginFill)" name="Margin (L)" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="marginPct" stroke="#f59e0b" name="Margin %" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4 animate-in fade-in slide-in-from-bottom-2 fill-mode-both" >
          <div className="flex items-baseline justify-between mb-2">
            <h2 className={`text-sm font-semibold ${ui.text}`}>Expense Breakdown</h2>
            <span className={`text-[11px] ${ui.muted}`}>₹ lakh</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 300 }}>
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="name" tickLine={false} tickMargin={6} axisLine={false} tick={tick} />
                <YAxis tickFormatter={(value) => `₹${value}L`} tickLine={false} axisLine={false} tick={tick} width={58} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}
                  formatter={(value) => `₹${Number(value).toFixed(1)}L`}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} formatter={(value) => <span style={{ color: tick.fill }}>{value}</span>} />
                <Bar dataKey="vendor" fill="#f59e0b" name="Vendor Cost" stackId="a" />
                <Bar dataKey="creditNotes" fill="#ef4444" name="Credit Notes" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="flex items-baseline justify-between mb-2 px-1">
        <h2 className={`text-sm font-semibold ${ui.text}`}>Supervisor Performance</h2>
        <span className={`text-[11px] ${ui.muted}`}>
          {supervisors.length} {supervisors.length === 1 ? 'supervisor' : 'supervisors'}
        </span>
      </div>
      <TableShell>
        <THead>
          <Th>Supervisor</Th>
          <Th align="right">Clients</Th>
          <Th align="right">Billing</Th>
          <Th align="right">Vendor Cost</Th>
          <Th align="right">Credit Notes</Th>
          <Th align="right">Margin</Th>
          <Th align="right">Margin %</Th>
          <Th />
        </THead>
        <tbody>
          {supervisors.length === 0 ? (
            <EmptyRow colSpan={8} title="No supervisors found" />
          ) : (
            supervisors.map((s: any, idx: number) => {
              const isExpanded = expandedSupervisor === s.id;
              const isPositive = (s.margin || 0) >= 0;
              const pct = s.margin_pct || 0;
              const billingShare = Math.min(((s.billing || 0) / maxBilling) * 100, 100);
              const TrendIcon = isPositive ? ArrowUp : ArrowDown;

              return (
                <Fragment key={s.id ?? idx}>
                  <Tr index={idx} onClick={() => toggleExpand(s.id)} className={isExpanded ? (isDark ? 'bg-blue-500/[0.06]' : 'bg-blue-50/60') : ''}>
                    <td className={`px-4 py-3 border-l-2 ${isExpanded ? 'border-blue-500' : 'border-transparent group-hover:border-blue-500'} transition-colors`}>
                      <div className="flex items-center gap-3">
                        <Avatar name={s.name} />
                        <span className={`text-sm font-medium ${ui.text} truncate max-w-[180px]`} title={s.name}>{s.name}</span>
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-right text-sm ${ui.text} tabular-nums`}>{s.clients}</td>
                    <td className="relative px-4 py-3 text-right">
                      <div
                        className={`absolute inset-y-2 right-0 rounded-l ${isDark ? 'bg-blue-500/10' : 'bg-blue-100/70'} transition-all duration-700`}
                        style={{ width: `${billingShare}%` }}
                      />
                      <span className={`relative text-sm font-semibold ${ui.text} tabular-nums`}>{formatCurrencyShort(s.billing)}</span>
                    </td>
                    <td className={`px-4 py-3 text-right text-sm ${ui.textSoft} tabular-nums`}>{formatCurrencyShort(s.vendor)}</td>
                    <td className={`px-4 py-3 text-right text-sm ${ui.textSoft} tabular-nums`}>{formatCurrencyShort(s.credit_notes)}</td>
                    <td className={`px-4 py-3 text-right text-sm font-semibold tabular-nums ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                      <span className="inline-flex items-center gap-0.5">
                        <TrendIcon className="h-3 w-3" />
                        {formatCurrencyShort(s.margin)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right"><Badge tone={pctTone(pct)}>{pct.toFixed(1)}%</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <ChevronDown className={`h-4 w-4 ${ui.muted} transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    </td>
                  </Tr>
                  {isExpanded && s.client_breakdown && s.client_breakdown.length > 0 && (
                    <tr>
                      <td colSpan={8} className={`p-0 ${isDark ? 'bg-white/[0.02]' : 'bg-gray-50'}`}>
                        <div className="p-4 pl-14 animate-in fade-in slide-in-from-top-1 duration-200">
                          <p className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${ui.muted} mb-2`}>
                            <Building2 className="h-3 w-3" /> Clients of {s.name}
                          </p>
                          <div className={`rounded-lg border ${ui.border} overflow-hidden ${ui.card}`}>
                            <table className="w-full text-sm">
                              <thead>
                                <tr className={`border-b ${ui.border}`}>
                                  {['Client', 'Billing', 'Vendor', 'Credit Notes', 'Margin', 'Margin %'].map((h, i) => (
                                    <th key={h} className={`px-3 py-2 text-[11px] font-medium ${ui.muted} ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {s.client_breakdown.map((client: any, cIdx: number) => {
                                  const cPct = client.margin_pct || 0;
                                  return (
                                    <tr key={cIdx} className={`border-b last:border-b-0 ${ui.rowBorder} ${ui.hoverRow} transition-colors`}>
                                      <td className="px-3 py-2">
                                        <div className="flex items-center gap-2">
                                          <Avatar name={client.client_name} size="sm" />
                                          <span className={`text-xs ${ui.text}`}>{client.client_name}</span>
                                        </div>
                                      </td>
                                      <td className={`px-3 py-2 text-right text-xs ${ui.text} tabular-nums`}>{formatCurrencyShort(client.billing)}</td>
                                      <td className={`px-3 py-2 text-right text-xs ${ui.textSoft} tabular-nums`}>{formatCurrencyShort(client.vendor)}</td>
                                      <td className={`px-3 py-2 text-right text-xs ${ui.textSoft} tabular-nums`}>{formatCurrencyShort(client.credit_notes)}</td>
                                      <td className={`px-3 py-2 text-right text-xs font-medium tabular-nums ${client.margin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {formatCurrencyShort(client.margin)}
                                      </td>
                                      <td className="px-3 py-2 text-right"><Badge tone={pctTone(cPct)}>{cPct.toFixed(1)}%</Badge></td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })
          )}
        </tbody>
      </TableShell>
    </div>
  );
}
