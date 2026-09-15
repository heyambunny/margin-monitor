'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/providers/ThemeProvider';
import {
  DollarSign, Receipt, Clock, AlertTriangle, RefreshCw,
  Filter, X, Download, CheckCircle2, Building2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { API_URL } from '@/lib/api';

// Minimal blue shades for avatars - matches the rest of the app
const BLUE_SHADES = ['#3b82f6', '#60a5fa', '#93c5fd', '#2563eb', '#1d4ed8', '#bfdbfe', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7'];

const MONTH_ABBR: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

const AGING_ORDER = ['Current', '1 Month Overdue', '2+ Months Overdue'];

function parseInvoiceMonth(val: string): { year: number; month: number } | null {
  if (!val || typeof val !== 'string') return null;
  const [abbr, yy] = val.split('-');
  const month = MONTH_ABBR[abbr];
  if (month === undefined || !yy) return null;
  const year = 2000 + parseInt(yy, 10);
  if (Number.isNaN(year)) return null;
  return { year, month };
}

function getAgingBucket(year: number, month: number, currentYear: number, currentMonth: number) {
  const diff = (currentYear - year) * 12 + (currentMonth - month);
  if (diff === 0) return 'Current';
  if (diff === 1) return '1 Month Overdue';
  return '2+ Months Overdue';
}

const agingBadgeClass = (bucket: string, isDark: boolean) => {
  if (bucket === 'Current') return isDark ? 'bg-green-500/15 text-green-400' : 'bg-green-100 text-green-700';
  if (bucket === '1 Month Overdue') return isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-100 text-amber-700';
  return isDark ? 'bg-red-500/15 text-red-400' : 'bg-red-100 text-red-700';
};

const agingRowTint = (bucket: string, isDark: boolean) => {
  if (bucket === 'Current') return isDark ? 'bg-green-500/[0.04]' : 'bg-green-50/50';
  if (bucket === '1 Month Overdue') return isDark ? 'bg-amber-500/[0.04]' : 'bg-amber-50/50';
  return isDark ? 'bg-red-500/[0.04]' : 'bg-red-50/50';
};

export default function FinancePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [records, setRecords] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState('');

  const [clientFilter, setClientFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [agingFilter, setAgingFilter] = useState('all');

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
      const headers = { Authorization: `Bearer ${token}` };

      const res = await fetch(`${API_URL}/api/finance-dashboard`, { headers });
      if (!res.ok) {
        throw new Error(`Failed to fetch finance data: ${res.status}`);
      }
      const result = await res.json();
      setRecords(Array.isArray(result) ? result : []);
    } catch (err: any) {
      console.error('Finance dashboard error:', err);
      setError(err.message || 'Failed to load data');
      setRecords([]);
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

  const bgColor = isDark ? 'bg-[#0b0e1a]' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-[#131726]' : 'bg-white';
  const borderColor = isDark ? 'border-white/5' : 'border-gray-200';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const hoverBg = isDark ? 'hover:bg-white/5' : 'hover:bg-muted/50';

  if (loading || isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className={textMuted}>{error}</p>
        <Button onClick={fetchData} variant="outline" className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  // ── Build pending billing dataset ──────────────────────────
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  // Pending = Active status (already filtered server-side) + expense_type_id 1 (projected / not yet billed)
  const pending = records
    .filter((r: any) => r.expense_type_id === 1)
    .map((r: any) => ({ ...r, _parsed: parseInvoiceMonth(r.invoice_month) }))
    .filter((r: any) => {
      if (!r._parsed) return false;
      const { year, month } = r._parsed;
      // drop future months
      return year < currentYear || (year === currentYear && month <= currentMonth);
    })
    .map((r: any) => ({
      ...r,
      aging_bucket: getAgingBucket(r._parsed.year, r._parsed.month, currentYear, currentMonth),
    }));

  const uniqueClients = Array.from(new Set(pending.map((r: any) => r.client_name).filter(Boolean))).sort() as string[];
  const uniqueCategories = Array.from(new Set(pending.map((r: any) => r.category_name).filter(Boolean))).sort() as string[];

  const filtered = pending.filter((r: any) => {
    if (clientFilter !== 'all' && r.client_name !== clientFilter) return false;
    if (categoryFilter !== 'all' && r.category_name !== categoryFilter) return false;
    if (agingFilter !== 'all' && r.aging_bucket !== agingFilter) return false;
    return true;
  });

  const totalAmount = filtered.reduce((sum: number, r: any) => sum + (r.client_billed_amount || 0), 0);
  const totalBills = filtered.length;
  const currentAmount = filtered.filter((r: any) => r.aging_bucket === 'Current').reduce((sum: number, r: any) => sum + (r.client_billed_amount || 0), 0);
  const overdueAmount = filtered.filter((r: any) => r.aging_bucket !== 'Current').reduce((sum: number, r: any) => sum + (r.client_billed_amount || 0), 0);

  const clientSummaryMap: Record<string, { client_name: string; amount: number; bills: number }> = {};
  filtered.forEach((r: any) => {
    const name = r.client_name || 'Unknown';
    if (!clientSummaryMap[name]) clientSummaryMap[name] = { client_name: name, amount: 0, bills: 0 };
    clientSummaryMap[name].amount += r.client_billed_amount || 0;
    clientSummaryMap[name].bills += 1;
  });
  const clientSummary = Object.values(clientSummaryMap).sort((a, b) => b.amount - a.amount);
  const maxClientAmount = Math.max(...clientSummary.map((c) => c.amount), 1);

  const agingSummaryMap: Record<string, { bucket: string; amount: number; bills: number }> = {};
  AGING_ORDER.forEach((b) => (agingSummaryMap[b] = { bucket: b, amount: 0, bills: 0 }));
  filtered.forEach((r: any) => {
    const b = r.aging_bucket;
    if (!agingSummaryMap[b]) agingSummaryMap[b] = { bucket: b, amount: 0, bills: 0 };
    agingSummaryMap[b].amount += r.client_billed_amount || 0;
    agingSummaryMap[b].bills += 1;
  });
  const agingSummary = AGING_ORDER.map((b) => agingSummaryMap[b]).filter((a) => a.bills > 0);

  const detailRows = [...filtered].sort((a: any, b: any) => (b.client_billed_amount || 0) - (a.client_billed_amount || 0));

  const hasActiveFilters = clientFilter !== 'all' || categoryFilter !== 'all' || agingFilter !== 'all';
  const clearFilters = () => {
    setClientFilter('all');
    setCategoryFilter('all');
    setAgingFilter('all');
  };

  const downloadCsv = () => {
    const headers = ['ID', 'Client', 'Program', 'Category', 'Amount', 'Month', 'Aging'];
    const rows = detailRows.map((r: any) => [
      r.id, r.client_name, r.program_name, r.category_name, r.client_billed_amount, r.invoice_month, r.aging_bucket,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pending_billing_details.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`min-h-screen ${bgColor} transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className={`text-lg font-semibold ${textColor}`}>Finance Dashboard</h1>
            <p className={`text-xs ${textMuted}`}>Pending billing overview · Active accounts not yet billed</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] ${textMuted}`}>As of {today.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              className={`h-8 w-8 p-0 ${cardBg} ${borderColor} border`}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${textMuted}`} />
            </Button>
          </div>
        </div>

        {pending.length === 0 ? (
          <Card className={`${cardBg} ${borderColor} border`}>
            <CardContent className="p-10 flex flex-col items-center gap-2">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <p className={`text-sm font-medium ${textColor}`}>No pending billing 🎉</p>
              <p className={`text-xs ${textMuted}`}>Everything due has been billed.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Filters */}
            <Card className={`${cardBg} ${borderColor} border`}>
              <CardContent className="p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`flex items-center gap-1 text-[10px] font-medium ${textMuted}`}>
                    <Filter className="h-3 w-3" /> Filters
                  </span>
                  <Select value={clientFilter} onValueChange={setClientFilter}>
                    <SelectTrigger className={`w-[150px] h-7 text-xs ${cardBg} ${borderColor} border`}>
                      <SelectValue placeholder="Client" />
                    </SelectTrigger>
                    <SelectContent className={cardBg}>
                      <SelectItem value="all" className="text-xs">All Clients</SelectItem>
                      {uniqueClients.map((c) => (
                        <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className={`w-[150px] h-7 text-xs ${cardBg} ${borderColor} border`}>
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent className={cardBg}>
                      <SelectItem value="all" className="text-xs">All Categories</SelectItem>
                      {uniqueCategories.map((c) => (
                        <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={agingFilter} onValueChange={setAgingFilter}>
                    <SelectTrigger className={`w-[150px] h-7 text-xs ${cardBg} ${borderColor} border`}>
                      <SelectValue placeholder="Aging Bucket" />
                    </SelectTrigger>
                    <SelectContent className={cardBg}>
                      <SelectItem value="all" className="text-xs">All Buckets</SelectItem>
                      {AGING_ORDER.map((b) => (
                        <SelectItem key={b} value={b} className="text-xs">{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className={`flex items-center gap-1 text-[10px] ${textMuted} hover:text-red-400 transition-colors`}
                    >
                      <X className="h-3 w-3" /> Clear
                    </button>
                  )}
                  <div className="ml-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadCsv}
                      disabled={detailRows.length === 0}
                      className={`h-7 text-[10px] gap-1 ${cardBg} ${borderColor} border`}
                    >
                      <Download className="h-3 w-3" /> Export CSV
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {filtered.length === 0 ? (
              <Card className={`${cardBg} ${borderColor} border`}>
                <CardContent className="p-8 text-center">
                  <p className={`text-sm ${textMuted}`}>No records match the selected filters.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card className={`${cardBg} ${borderColor} border`}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-1.5 text-xs">
                        <div className="p-1 bg-blue-500/10 rounded"><DollarSign className="h-3 w-3 text-blue-500" /></div>
                        <span className={textMuted}>Total Pending</span>
                      </div>
                      <p className={`text-base font-bold ${textColor} mt-1`}>
                        <AnimatedNumber value={totalAmount} duration={1000} format={(val) => formatCurrency(val)} />
                      </p>
                    </CardContent>
                  </Card>
                  <Card className={`${cardBg} ${borderColor} border`}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-1.5 text-xs">
                        <div className="p-1 bg-indigo-500/10 rounded"><Receipt className="h-3 w-3 text-indigo-500" /></div>
                        <span className={textMuted}>Total Bills</span>
                      </div>
                      <p className={`text-base font-bold ${textColor} mt-1`}>
                        <AnimatedNumber value={totalBills} duration={800} />
                      </p>
                    </CardContent>
                  </Card>
                  <Card className={`${cardBg} ${borderColor} border`}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-1.5 text-xs">
                        <div className="p-1 bg-green-500/10 rounded"><Clock className="h-3 w-3 text-green-500" /></div>
                        <span className={textMuted}>Current</span>
                      </div>
                      <p className="text-base font-bold text-green-500 mt-1">
                        <AnimatedNumber value={currentAmount} duration={1000} format={(val) => formatCurrency(val)} />
                      </p>
                    </CardContent>
                  </Card>
                  <Card className={`${cardBg} ${borderColor} border`}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-1.5 text-xs">
                        <div className="p-1 bg-red-500/10 rounded"><AlertTriangle className="h-3 w-3 text-red-500" /></div>
                        <span className={textMuted}>Overdue</span>
                      </div>
                      <p className="text-base font-bold text-red-500 mt-1">
                        <AnimatedNumber value={overdueAmount} duration={1000} format={(val) => formatCurrency(val)} />
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Client Summary & Aging Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <Card className={`lg:col-span-2 ${cardBg} ${borderColor} border`}>
                    <CardHeader className="p-3 pb-1">
                      <CardTitle className={`text-xs font-medium ${textColor}`}>Client-wise Pending Summary</CardTitle>
                      <CardDescription className={`text-[10px] ${textMuted}`}>Sorted by pending amount</CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <div className="max-h-[280px] overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className={`border-b ${borderColor} hover:bg-transparent`}>
                              <TableHead className={`text-[9px] py-1.5 ${textMuted}`}>Client</TableHead>
                              <TableHead className={`text-[9px] text-right py-1.5 ${textMuted}`}>Pending Amount</TableHead>
                              <TableHead className={`text-[9px] text-right py-1.5 ${textMuted}`}>Bills</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {clientSummary.map((c, idx) => (
                              <TableRow key={c.client_name} className={`${hoverBg} transition-colors border-b ${borderColor}`}>
                                <TableCell className={`text-[10px] py-1.5 ${textColor}`}>
                                  <div className="flex items-center gap-1.5">
                                    <div
                                      className="flex items-center justify-center w-5 h-5 rounded-full text-[8px] font-bold text-white shrink-0"
                                      style={{ backgroundColor: BLUE_SHADES[idx % BLUE_SHADES.length] }}
                                    >
                                      {c.client_name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="truncate max-w-[160px]" title={c.client_name}>{c.client_name}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="relative text-right py-1.5">
                                  <div
                                    className={`absolute inset-y-1 right-0 rounded-l ${isDark ? 'bg-blue-500/10' : 'bg-blue-100/70'}`}
                                    style={{ width: `${Math.min((c.amount / maxClientAmount) * 100, 100)}%` }}
                                  />
                                  <span className={`relative text-[10px] font-medium pr-1 ${textColor}`}>{formatCurrency(c.amount)}</span>
                                </TableCell>
                                <TableCell className={`text-[10px] text-right py-1.5 ${textMuted}`}>{c.bills}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={`${cardBg} ${borderColor} border`}>
                    <CardHeader className="p-3 pb-1">
                      <CardTitle className={`text-xs font-medium ${textColor}`}>Aging Summary</CardTitle>
                      <CardDescription className={`text-[10px] ${textMuted}`}>Current vs. overdue</CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 space-y-2">
                      {agingSummary.map((a) => (
                        <div key={a.bucket} className={`p-2.5 rounded-lg border ${borderColor} ${agingRowTint(a.bucket, isDark)}`}>
                          <div className="flex items-center justify-between">
                            <span className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${agingBadgeClass(a.bucket, isDark)}`}>
                              {a.bucket}
                            </span>
                            <span className={`text-[9px] ${textMuted}`}>{a.bills} bills</span>
                          </div>
                          <p className={`text-sm font-bold ${textColor} mt-1`}>{formatCurrency(a.amount)}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                {/* Detail Table */}
                <Card className={`${cardBg} ${borderColor} border`}>
                  <CardHeader className="p-3 pb-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className={`text-xs font-medium ${textColor}`}>Pending Billing Details</CardTitle>
                        <CardDescription className={`text-[10px] ${textMuted}`}>{detailRows.length} {detailRows.length === 1 ? 'record' : 'records'}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="max-h-[400px] overflow-y-auto rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow className={`sticky top-0 z-10 ${isDark ? 'bg-[#171b2c]' : 'bg-gray-50'} border-b ${borderColor} hover:bg-transparent`}>
                            <TableHead className={`text-[9px] uppercase tracking-wide py-2 ${textMuted}`}>Client</TableHead>
                            <TableHead className={`text-[9px] uppercase tracking-wide py-2 ${textMuted}`}>Program</TableHead>
                            <TableHead className={`text-[9px] uppercase tracking-wide py-2 ${textMuted}`}>Category</TableHead>
                            <TableHead className={`text-[9px] uppercase tracking-wide text-right py-2 ${textMuted}`}>Amount</TableHead>
                            <TableHead className={`text-[9px] uppercase tracking-wide text-center py-2 ${textMuted}`}>Month</TableHead>
                            <TableHead className={`text-[9px] uppercase tracking-wide text-right py-2 pr-2 ${textMuted}`}>Aging</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detailRows.map((r: any, idx: number) => (
                            <TableRow key={r.id ?? idx} className={`border-b ${borderColor} ${agingRowTint(r.aging_bucket, isDark)} hover:${isDark ? 'bg-white/5' : 'bg-blue-50/60'} transition-colors`}>
                              <TableCell className={`text-[10px] py-1.5 ${textColor}`}>
                                <div className="flex items-center gap-1.5">
                                  <Building2 className={`h-3 w-3 shrink-0 ${textMuted}`} />
                                  <span className="truncate max-w-[140px]" title={r.client_name}>{r.client_name}</span>
                                </div>
                              </TableCell>
                              <TableCell className={`text-[10px] py-1.5 ${textMuted}`}>
                                <span className="truncate max-w-[120px] inline-block" title={r.program_name}>{r.program_name}</span>
                              </TableCell>
                              <TableCell className={`text-[10px] py-1.5 ${textMuted}`}>
                                <span className="truncate max-w-[120px] inline-block" title={r.category_name}>{r.category_name}</span>
                              </TableCell>
                              <TableCell className={`text-[10px] text-right py-1.5 font-medium ${textColor}`}>
                                {formatCurrency(r.client_billed_amount)}
                              </TableCell>
                              <TableCell className={`text-[10px] text-center py-1.5 ${textMuted}`}>{r.invoice_month}</TableCell>
                              <TableCell className="text-right py-1.5 pr-2">
                                <span className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${agingBadgeClass(r.aging_bucket, isDark)}`}>
                                  {r.aging_bucket}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
