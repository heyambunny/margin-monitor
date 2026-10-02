'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { IndianRupee, Receipt, Clock, AlertTriangle, Download, CheckCircle2, Wallet, HandCoins, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { API_URL } from '@/lib/api';
import {
  useUi, PageHeader, RefreshButton, StatGrid, FilterBar, FilterSelect, ClearFiltersButton, Card,
  TableShell, THead, Th, Tr, TdAccent, EmptyRow, EmptyState, Pagination, EntityCell, Chip, Badge, Avatar,
  PageSkeleton, MobileList, MobileCard, type BadgeTone,
} from '@/components/app/ui';

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

const AGING_TONE: Record<string, BadgeTone> = {
  Current: 'green',
  '1 Month Overdue': 'amber',
  '2+ Months Overdue': 'red',
};

const AGING_ACCENT: Record<string, string> = {
  Current: 'from-emerald-500/20',
  '1 Month Overdue': 'from-amber-500/20',
  '2+ Months Overdue': 'from-red-500/20',
};

export default function FinancePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const ui = useUi();

  const [records, setRecords] = useState<any[]>([]);
  const [collection, setCollection] = useState<{ outstanding: number; invoices: number; overdue: number } | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState('');

  const [clientFilter, setClientFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [agingFilter, setAgingFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  useEffect(() => {
    setCurrentPage(1);
  }, [clientFilter, categoryFilter, agingFilter]);

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

      // Invoiced but not yet paid - summary for the "pending collection" strip.
      fetch(`${API_URL}/api/receivables`, { headers })
        .then((r) => (r.ok ? r.json() : []))
        .then((rows) => {
          const open = (Array.isArray(rows) ? rows : []).filter((x: any) => x.outstanding > 0);
          setCollection({
            outstanding: open.reduce((s: number, x: any) => s + x.outstanding, 0),
            invoices: open.length,
            overdue: open.filter((x: any) => (x.days_since_invoice ?? 0) > 60).reduce((s: number, x: any) => s + x.outstanding, 0),
          });
        })
        .catch(() => setCollection(null));
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
    return `₹${Math.round(value).toLocaleString('en-IN')}`;
  };

  if (loading || (isFetching && records.length === 0 && !error)) {
    return <PageSkeleton />;
  }

  if (error) {
    return (
      <Card className="p-10">
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load finance data"
          hint={error}
          action={<button onClick={fetchData} className="mt-1 text-xs text-blue-400 hover:underline">Try again</button>}
        />
      </Card>
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

  const totalPages = Math.ceil(detailRows.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageRows = detailRows.slice(startIndex, endIndex);
  const toggle = (current: string, value: string, set: (v: string) => void) => set(current === value ? 'all' : value);

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        icon={Wallet}
        title="Finance Dashboard"
        subtitle={`Pending billing · active projections not yet billed · as of ${today.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`}
        gradient="from-emerald-500 to-cyan-500"
        actions={
          <>
            <RefreshButton onClick={fetchData} loading={isFetching} />
            <button
              onClick={downloadCsv}
              disabled={detailRows.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/20 hover:from-blue-600 hover:to-purple-600 active:scale-[0.98] transition disabled:opacity-40 disabled:shadow-none"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </>
        }
      />

      {collection && (
        <Link
          href="/dashboard/receivables"
          className={`group mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 p-4 rounded-xl border ${ui.border} ${ui.card} hover:border-emerald-500/40 transition animate-in fade-in`}
        >
          <span className="flex items-center gap-2.5">
            <span className="h-9 w-9 rounded-lg bg-emerald-500/15 flex items-center justify-center"><HandCoins className="h-4 w-4 text-emerald-400" /></span>
            <span>
              <span className={`block text-sm font-semibold ${ui.text}`}>Pending collection</span>
              <span className={`block text-[11px] ${ui.muted}`}>Invoiced but not yet paid</span>
            </span>
          </span>
          <span className="tabular-nums">
            <span className={`block text-[11px] ${ui.muted}`}>Outstanding</span>
            <span className="text-base font-bold text-amber-400">{formatCurrency(collection.outstanding)}</span>
          </span>
          <span className="tabular-nums">
            <span className={`block text-[11px] ${ui.muted}`}>Invoices</span>
            <span className={`text-base font-bold ${ui.text}`}>{collection.invoices}</span>
          </span>
          <span className="tabular-nums">
            <span className={`block text-[11px] ${ui.muted}`}>Overdue 60+ days</span>
            <span className="text-base font-bold text-rose-400">{formatCurrency(collection.overdue)}</span>
          </span>
          <span className="ml-auto flex items-center gap-1 text-xs text-emerald-400">
            Open Receivables <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      )}

      {pending.length === 0 ? (
        <Card className="p-12">
          <EmptyState icon={CheckCircle2} title="No pending billing 🎉" hint="Everything due has been billed." />
        </Card>
      ) : (
        <>
          <StatGrid
            stats={[
              { label: 'Total Pending', value: totalAmount, icon: IndianRupee, color: 'blue', money: true },
              { label: 'Pending Bills', value: totalBills, icon: Receipt, color: 'purple' },
              { label: 'Current', value: currentAmount, icon: Clock, color: 'emerald', money: true },
              { label: 'Overdue', value: overdueAmount, icon: AlertTriangle, color: 'rose', money: true },
            ]}
          />

          <FilterBar>
            <FilterSelect value={clientFilter} onChange={setClientFilter}>
              <option value="all">All Clients</option>
              {uniqueClients.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </FilterSelect>
            <FilterSelect value={categoryFilter} onChange={setCategoryFilter}>
              <option value="all">All Categories</option>
              {uniqueCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </FilterSelect>
            <FilterSelect value={agingFilter} onChange={setAgingFilter}>
              <option value="all">All Aging Buckets</option>
              {AGING_ORDER.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </FilterSelect>
            <ClearFiltersButton show={hasActiveFilters} onClick={clearFilters} />
            <span className={`ml-auto text-[11px] ${ui.muted} hidden md:block`}>Tip: click a client or aging bucket to filter</span>
          </FilterBar>

          {filtered.length === 0 ? (
            <Card className="p-10">
              <EmptyState
                title="No records match the selected filters"
                action={<button onClick={clearFilters} className="text-xs text-blue-400 hover:underline">Clear filters</button>}
              />
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                {/* Client summary */}
                <Card className="lg:col-span-2 p-4">
                  <div className="flex items-baseline justify-between mb-3">
                    <h2 className={`text-sm font-semibold ${ui.text}`}>Pending by Client</h2>
                    <span className={`text-[11px] ${ui.muted}`}>{clientSummary.length} clients · sorted by amount</span>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto pr-1 space-y-1" style={ui.colorScheme}>
                    {clientSummary.map((c, idx) => {
                      const active = clientFilter === c.client_name;
                      return (
                        <button
                          key={c.client_name}
                          onClick={() => toggle(clientFilter, c.client_name, setClientFilter)}
                          className={`w-full relative flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition overflow-hidden animate-in fade-in slide-in-from-left-1 fill-mode-both ${
                            active ? 'ring-1 ring-blue-500/60 bg-blue-500/10' : ui.hoverRow
                          }`}
                          style={{ animationDelay: `${Math.min(idx, 12) * 30}ms` }}
                        >
                          <div
                            className={`absolute inset-y-0 left-0 ${ui.isDark ? 'bg-blue-500/10' : 'bg-blue-100/70'} transition-all duration-700`}
                            style={{ width: `${Math.min((c.amount / maxClientAmount) * 100, 100)}%` }}
                          />
                          <div className="relative"><Avatar name={c.client_name} size="sm" /></div>
                          <span className={`relative flex-1 min-w-0 text-sm ${ui.text} truncate`} title={c.client_name}>{c.client_name}</span>
                          <span className={`relative hidden sm:inline text-[11px] ${ui.muted} whitespace-nowrap`}>{c.bills} {c.bills === 1 ? 'bill' : 'bills'}</span>
                          <span className={`relative text-sm font-semibold ${ui.text} tabular-nums sm:w-24 text-right whitespace-nowrap`}>{formatCurrency(c.amount)}</span>
                        </button>
                      );
                    })}
                  </div>
                </Card>

                {/* Aging summary */}
                <Card className="p-4">
                  <div className="flex items-baseline justify-between mb-3">
                    <h2 className={`text-sm font-semibold ${ui.text}`}>Aging</h2>
                    <span className={`text-[11px] ${ui.muted}`}>Current vs overdue</span>
                  </div>
                  <div className="space-y-2">
                    {agingSummary.map((a, idx) => {
                      const active = agingFilter === a.bucket;
                      const share = totalAmount > 0 ? (a.amount / totalAmount) * 100 : 0;
                      return (
                        <button
                          key={a.bucket}
                          onClick={() => toggle(agingFilter, a.bucket, setAgingFilter)}
                          className={`relative w-full overflow-hidden text-left p-3 rounded-xl border ${ui.border} transition hover:-translate-y-0.5 animate-in fade-in slide-in-from-right-1 fill-mode-both ${
                            active ? 'ring-1 ring-blue-500/60' : ''
                          }`}
                          style={{ animationDelay: `${idx * 60}ms` }}
                        >
                          <div className={`absolute inset-0 bg-gradient-to-br ${AGING_ACCENT[a.bucket]} to-transparent pointer-events-none`} />
                          <div className="relative flex items-center justify-between">
                            <Badge tone={AGING_TONE[a.bucket]} dot>{a.bucket}</Badge>
                            <span className={`text-[11px] ${ui.muted}`}>{a.bills} bills</span>
                          </div>
                          <div className="relative flex items-end justify-between mt-2">
                            <p className={`text-lg font-bold ${ui.text} tabular-nums`}>{formatCurrency(a.amount)}</p>
                            <span className={`text-[11px] ${ui.muted}`}>{share.toFixed(0)}%</span>
                          </div>
                          <div className={`relative mt-2 h-1 rounded-full ${ui.isDark ? 'bg-white/10' : 'bg-gray-200'} overflow-hidden`}>
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${
                                a.bucket === 'Current' ? 'bg-emerald-500' : a.bucket === '1 Month Overdue' ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${share}%` }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </Card>
              </div>

              <div className="flex items-baseline justify-between mb-2 px-1">
                <h2 className={`text-sm font-semibold ${ui.text}`}>Pending Billing Details</h2>
                <span className={`text-[11px] ${ui.muted}`}>{detailRows.length} {detailRows.length === 1 ? 'record' : 'records'} · largest first</span>
              </div>
              <TableShell
                footer={
                  <Pagination
                    currentPage={currentPage} totalPages={totalPages} startIndex={startIndex} endIndex={endIndex}
                    total={detailRows.length} onPage={setCurrentPage}
                  />
                }
                mobile={
                  <MobileList empty={<EmptyState title="No records" />}>
                    {pageRows.map((r: any, idx: number) => (
                      <MobileCard key={r.id ?? idx} index={idx}>
                        <div className="flex items-start justify-between gap-3">
                          <EntityCell name={r.client_name} sub={r.program_name} />
                          <span className={`text-sm font-semibold ${ui.text} tabular-nums whitespace-nowrap`}>{formatCurrency(r.client_billed_amount)}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pl-11 text-xs">
                          <Badge tone={AGING_TONE[r.aging_bucket] || 'gray'} dot>{r.aging_bucket}</Badge>
                          {r.invoice_month && <Chip>{r.invoice_month}</Chip>}
                          <span className={`truncate ${ui.muted}`}>{r.category_name}</span>
                        </div>
                      </MobileCard>
                    ))}
                  </MobileList>
                }
              >
                <THead>
                  <Th>ID</Th>
                  <Th>Client / Program</Th>
                  <Th>Category</Th>
                  <Th>Month</Th>
                  <Th>Aging</Th>
                  <Th align="right">Amount</Th>
                </THead>
                <tbody>
                  {pageRows.length === 0 ? (
                    <EmptyRow colSpan={6} title="No records" />
                  ) : (
                    pageRows.map((r: any, idx: number) => (
                      <Tr key={r.id ?? idx} index={idx}>
                        <TdAccent className={`text-xs font-mono ${ui.textSoft}`}>#{r.id}</TdAccent>
                        <td className="px-4 py-3"><EntityCell name={r.client_name} sub={r.program_name} /></td>
                        <td className={`px-4 py-3 text-xs ${ui.textSoft} whitespace-nowrap`}>{r.category_name || '-'}</td>
                        <td className="px-4 py-3">{r.invoice_month ? <Chip>{r.invoice_month}</Chip> : '-'}</td>
                        <td className="px-4 py-3"><Badge tone={AGING_TONE[r.aging_bucket] || 'gray'} dot>{r.aging_bucket}</Badge></td>
                        <td className={`px-4 py-3 text-right text-sm font-semibold ${ui.text} whitespace-nowrap tabular-nums`}>{formatCurrency(r.client_billed_amount)}</td>
                      </Tr>
                    ))
                  )}
                </tbody>
              </TableShell>
            </>
          )}
        </>
      )}
    </div>
  );
}
