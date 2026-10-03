'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { HandCoins, IndianRupee, AlertTriangle, CircleDashed, Wallet, Download, Check, Minus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_URL } from '@/lib/api';
import { formatDate, formatINR } from '@/lib/format';
import {
  useUi, PageHeader, RefreshButton, StatGrid, FilterBar, SearchInput, FilterSelect, ClearFiltersButton,
  TableShell, THead, Th, Tr, TdAccent, EmptyRow, Pagination, EntityCell, Badge, MobileList, MobileCard,
  EmptyState, PageSkeleton,
} from '@/components/app/ui';
import { PaymentPanel, PAYMENT_STATUS_TONE, type ReceivableInvoice } from '@/components/app/PaymentPanel';
import { BulkPaymentPanel } from '@/components/app/BulkPaymentPanel';

type Row = ReceivableInvoice & { invoice_month: string; last_payment_date: string | null; payment_count: number; days_since_invoice: number | null };
type SortKey = 'outstanding' | 'invoice_date' | 'client_name' | 'billed_amount' | 'days_since_invoice';

const AGE_BUCKETS: Record<string, (d: number) => boolean> = {
  '0-30': (d) => d <= 30,
  '31-60': (d) => d > 30 && d <= 60,
  '60+': (d) => d > 60,
};

export default function ReceivablesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const ui = useUi();

  const [rows, setRows] = useState<Row[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterStatus, setFilterStatus] = useState('open');
  const [filterAge, setFilterAge] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('outstanding');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // Invoices ticked for one payment covering several invoices.
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterClient, filterStatus, filterAge, sortKey, sortDir]);

  const fetchData = async () => {
    setIsFetching(true);
    try {
      const res = await fetch(`${API_URL}/api/receivables`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to load receivables');
      setRows(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load receivables');
    } finally {
      setIsFetching(false);
    }
  };

  const clients = [...new Set(rows.map((r) => r.client_name).filter(Boolean))].sort();

  const term = searchTerm.trim().toLowerCase();
  const filtered = rows
    .filter((r) => !term || [r.invoice_no, r.client_name, r.program_name, String(r.id)].some((v) => (v || '').toLowerCase().includes(term.replace(/^#/, ''))))
    .filter((r) => !filterClient || r.client_name === filterClient)
    .filter((r) => {
      if (!filterStatus) return true;
      if (filterStatus === 'open') return r.payment_status === 'Unpaid' || r.payment_status === 'Partially Paid';
      return r.payment_status === filterStatus;
    })
    .filter((r) => !filterAge || (r.days_since_invoice !== null && AGE_BUCKETS[filterAge](r.days_since_invoice)))
    .sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key as SortKey);
      setSortDir(key === 'client_name' ? 'asc' : 'desc');
    }
  };
  const clearFilters = () => {
    setSearchTerm('');
    setFilterClient('');
    setFilterStatus('open');
    setFilterAge('');
  };

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageRows = filtered.slice(startIndex, endIndex);

  const outstanding = filtered.reduce((s, r) => s + r.outstanding, 0);
  const received = filtered.reduce((s, r) => s + r.received, 0);
  const overdue = filtered.filter((r) => r.outstanding > 0 && (r.days_since_invoice ?? 0) > 60).reduce((s, r) => s + r.outstanding, 0);
  const partial = filtered.filter((r) => r.payment_status === 'Partially Paid').length;

  const selected = rows.find((r) => r.id === selectedId) || null;

  // Only invoices with something left to collect can be ticked.
  const selectable = (r: Row) => r.outstanding > 0;
  const toggle = (id: number) => setChecked((c) => {
    const next = new Set(c);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const selectableFiltered = filtered.filter(selectable);
  const allChecked = selectableFiltered.length > 0 && selectableFiltered.every((r) => checked.has(r.id));
  const someChecked = selectableFiltered.some((r) => checked.has(r.id));
  const toggleAll = () => setChecked((c) => {
    const next = new Set(c);
    if (allChecked) selectableFiltered.forEach((r) => next.delete(r.id));
    else selectableFiltered.forEach((r) => next.add(r.id));
    return next;
  });
  const checkedRows = rows.filter((r) => checked.has(r.id) && selectable(r));
  const checkedOutstanding = checkedRows.reduce((s, r) => s + r.outstanding, 0);

  // CSV of the invoices with money still due, respecting the current filters.
  const exportOutstanding = () => {
    const data = filtered.filter((r) => r.outstanding > 0);
    if (data.length === 0) {
      toast('No outstanding invoices in the current view');
      return;
    }
    const esc = (v: unknown) => {
      const t = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    };
    const header = ['Invoice No', 'Client', 'Program', 'Invoice Date', 'Invoice Month', 'Billed', 'Credit Notes', 'Received', 'TDS',
      'Outstanding', 'Payment Status', 'Days Since Invoice', 'Last Payment Date'];
    const lines = data.map((r) => [r.invoice_no, r.client_name, r.program_name, r.invoice_date, r.invoice_month, r.billed_amount,
      r.credit_notes, r.received, r.tds, r.outstanding, r.payment_status, r.days_since_invoice, r.last_payment_date].map(esc).join(','));
    const total = data.reduce((s, r) => s + r.outstanding, 0);
    const csv = [header.join(','), ...lines, ['TOTAL', '', '', '', '', '', '', '', '', Math.round(total * 100) / 100].join(',')].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `outstanding_invoices_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${data.length} outstanding invoice${data.length === 1 ? '' : 's'}`);
  };

  const CheckBox = ({ on, partial = false, onClick, disabled = false, label }: { on: boolean; partial?: boolean; onClick: () => void; disabled?: boolean; label: string }) => (
    <button
      type="button"
      role="checkbox"
      aria-checked={partial ? 'mixed' : on}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`h-5 w-5 shrink-0 rounded-md border flex items-center justify-center transition ${
        on || partial ? 'bg-emerald-500 border-emerald-500 text-white' : `${ui.border} ${ui.isDark ? 'bg-white/5' : 'bg-white'} hover:border-emerald-500/60`
      } disabled:opacity-25 disabled:cursor-not-allowed`}
    >
      {on ? <Check className="h-3.5 w-3.5" /> : partial ? <Minus className="h-3.5 w-3.5" /> : null}
    </button>
  );
  const hasFilters = Boolean(searchTerm || filterClient || filterStatus !== 'open' || filterAge);
  const sortProps = { activeSortKey: sortKey, sortDir, onSort: toggleSort };

  if (isFetching && rows.length === 0) return <PageSkeleton />;

  const ageChip = (d: number | null, out: number) => {
    if (d === null) return <span className={ui.muted}>—</span>;
    const cls = out <= 0 ? ui.muted : d > 60 ? 'text-red-400' : d > 30 ? 'text-amber-400' : ui.textSoft;
    return <span className={`text-xs tabular-nums ${cls}`}>{d} d</span>;
  };

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        icon={HandCoins}
        title="Receivables"
        subtitle="Track payments received · tick several invoices to record one transfer covering them"
        gradient="from-emerald-500 to-cyan-500"
        actions={
          <>
            <RefreshButton onClick={fetchData} loading={isFetching} />
            <button
              onClick={exportOutstanding}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-600 active:scale-[0.98] transition"
            >
              <Download className="h-3.5 w-3.5" />
              Export outstanding
            </button>
          </>
        }
      />

      <StatGrid
        stats={[
          { label: 'Outstanding', value: outstanding, icon: Wallet, color: 'amber', money: true },
          { label: 'Received', value: received, icon: IndianRupee, color: 'emerald', money: true },
          { label: 'Overdue (60+ days)', value: overdue, icon: AlertTriangle, color: 'rose', money: true },
          { label: 'Partially paid', value: partial, icon: CircleDashed, color: 'blue' },
        ]}
      />

      <FilterBar>
        <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search by invoice #, client, program or ID…" />
        <FilterSelect value={filterClient} onChange={setFilterClient}>
          <option value="">All Clients</option>
          {clients.map((c) => <option key={c} value={c}>{c}</option>)}
        </FilterSelect>
        <FilterSelect value={filterStatus} onChange={setFilterStatus}>
          <option value="open">Unpaid + partly paid</option>
          <option value="">All statuses</option>
          <option value="Unpaid">Unpaid</option>
          <option value="Partially Paid">Partially paid</option>
          <option value="Paid">Paid</option>
          <option value="Overpaid">Overpaid</option>
          <option value="No Dues">No dues</option>
        </FilterSelect>
        <FilterSelect value={filterAge} onChange={setFilterAge}>
          <option value="">Any age</option>
          <option value="0-30">0–30 days</option>
          <option value="31-60">31–60 days</option>
          <option value="60+">60+ days</option>
        </FilterSelect>
        <ClearFiltersButton show={hasFilters} onClick={clearFilters} />
      </FilterBar>

      <TableShell
        footer={<Pagination currentPage={currentPage} totalPages={totalPages} startIndex={startIndex} endIndex={endIndex} total={filtered.length} onPage={setCurrentPage} />}
        mobile={
          <MobileList empty={<EmptyState title="No invoices match" hint={filterStatus === 'open' ? 'Nothing is waiting for payment.' : undefined} />}>
            {pageRows.map((r, i) => (
              <MobileCard key={r.id} index={i} onClick={() => setSelectedId(r.id)} highlight={checked.has(r.id)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {selectable(r) && <CheckBox on={checked.has(r.id)} onClick={() => toggle(r.id)} label={`Select ${r.invoice_no}`} />}
                    <EntityCell name={r.client_name} sub={r.invoice_no} />
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-semibold tabular-nums ${r.outstanding > 0 ? 'text-amber-400' : ui.text}`}>{formatINR(r.outstanding)}</p>
                    <p className={`text-[11px] ${ui.muted}`}>of {formatINR(r.due)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pl-11 text-xs">
                  <Badge tone={PAYMENT_STATUS_TONE[r.payment_status] || 'gray'} dot>{r.payment_status}</Badge>
                  <span className={ui.muted}>{formatDate(r.invoice_date)}</span>
                  <span className="ml-auto">{ageChip(r.days_since_invoice, r.outstanding)}</span>
                </div>
              </MobileCard>
            ))}
          </MobileList>
        }
      >
        <THead>
          <Th className="w-10 !pr-0">
            <CheckBox on={allChecked} partial={!allChecked && someChecked} onClick={toggleAll} disabled={selectableFiltered.length === 0}
              label={allChecked ? 'Clear selection' : `Select all ${selectableFiltered.length} invoices with money due`} />
          </Th>
          <Th sortKey="client_name" {...sortProps}>Invoice / Client</Th>
          <Th sortKey="invoice_date" {...sortProps}>Invoice Date</Th>
          <Th sortKey="billed_amount" align="right" {...sortProps}>Billed</Th>
          <Th align="right">Received</Th>
          <Th sortKey="outstanding" align="right" {...sortProps}>Outstanding</Th>
          <Th>Status</Th>
          <Th sortKey="days_since_invoice" align="right" {...sortProps}>Age</Th>
          <Th />
        </THead>
        <tbody>
          {pageRows.length === 0 ? (
            <EmptyRow
              colSpan={9}
              title="No invoices match"
              hint={filterStatus === 'open' && !term && !filterClient && !filterAge ? 'Nothing is waiting for payment.' : undefined}
              action={hasFilters ? <button onClick={clearFilters} className="text-xs text-blue-400 hover:underline">Clear filters</button> : undefined}
            />
          ) : (
            pageRows.map((r, i) => {
              const pct = r.due > 0 ? Math.min(100, ((r.received + r.tds) / r.due) * 100) : 0;
              return (
                <Tr key={r.id} index={i} onClick={() => setSelectedId(r.id)} highlight={checked.has(r.id)}>
                  <td className="pl-4 py-3 w-10">
                    {selectable(r) && <CheckBox on={checked.has(r.id)} onClick={() => toggle(r.id)} label={`Select ${r.invoice_no}`} />}
                  </td>
                  <TdAccent>
                    <EntityCell name={r.client_name} sub={<span className="font-mono">{r.invoice_no}</span>} />
                  </TdAccent>
                  <td className={`px-4 py-3 text-xs ${ui.textSoft} whitespace-nowrap`}>{formatDate(r.invoice_date)}</td>
                  <td className={`px-4 py-3 text-right text-sm ${ui.text} tabular-nums whitespace-nowrap`}>{formatINR(r.due)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <p className="text-sm text-emerald-400 tabular-nums">{formatINR(r.received + r.tds)}</p>
                    <div className={`ml-auto mt-1 h-1 w-20 rounded-full ${ui.isDark ? 'bg-white/10' : 'bg-gray-200'} overflow-hidden`}>
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                    </div>
                  </td>
                  <td className={`px-4 py-3 text-right text-sm font-semibold tabular-nums whitespace-nowrap ${r.outstanding > 0 ? 'text-amber-400' : ui.textSoft}`}>
                    {r.excess > 0 ? <span className="text-purple-400">+{formatINR(r.excess)}</span> : formatINR(r.outstanding)}
                  </td>
                  <td className="px-4 py-3"><Badge tone={PAYMENT_STATUS_TONE[r.payment_status] || 'gray'} dot>{r.payment_status}</Badge></td>
                  <td className="px-4 py-3 text-right">{ageChip(r.days_since_invoice, r.outstanding)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="touch-show inline-flex items-center gap-1 px-2.5 py-1 text-xs text-emerald-400 bg-emerald-500/10 rounded-md opacity-60 group-hover:opacity-100 transition whitespace-nowrap">
                      <HandCoins className="h-3 w-3" /> {r.outstanding > 0 ? 'Record' : 'View'}
                    </span>
                  </td>
                </Tr>
              );
            })
          )}
        </tbody>
      </TableShell>

      <PaymentPanel invoice={selected} onClose={() => setSelectedId(null)} onChanged={fetchData} />

      {/* Selection bar: one payment covering several invoices */}
      {checkedRows.length > 0 && !bulkOpen && (
        <div
          className="fixed inset-x-3 lg:left-auto lg:right-6 z-30 animate-in fade-in slide-in-from-bottom-4 duration-200"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
        >
          <div className={`flex flex-wrap items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border ${
            ui.isDark ? 'bg-[#1b2033] border-white/10' : 'bg-white border-gray-200'
          }`}>
            <span className={`text-sm ${ui.text}`}>
              <span className="font-semibold">{checkedRows.length}</span> selected ·{' '}
              <span className="text-amber-400 font-semibold tabular-nums">{formatINR(checkedOutstanding)}</span>
              <span className={ui.muted}> outstanding</span>
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => setChecked(new Set())} className={`flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg ${ui.muted} ${ui.hoverBtn}`}>
                <X className="h-3.5 w-3.5" /> Clear
              </button>
              <button
                onClick={() => setBulkOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg text-white bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition"
              >
                <HandCoins className="h-4 w-4" /> Record payment
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkOpen && (
        <BulkPaymentPanel
          invoices={checkedRows}
          onClose={() => setBulkOpen(false)}
          onDone={() => { setChecked(new Set()); fetchData(); }}
        />
      )}
    </div>
  );
}
