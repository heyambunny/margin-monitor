'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { HandCoins, IndianRupee, AlertTriangle, CircleDashed, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_URL } from '@/lib/api';
import { formatDate, formatINR } from '@/lib/format';
import {
  useUi, PageHeader, RefreshButton, StatGrid, FilterBar, SearchInput, FilterSelect, ClearFiltersButton,
  TableShell, THead, Th, Tr, TdAccent, EmptyRow, Pagination, EntityCell, Badge, MobileList, MobileCard,
  EmptyState, PageSkeleton,
} from '@/components/app/ui';
import { PaymentPanel, PAYMENT_STATUS_TONE, type ReceivableInvoice } from '@/components/app/PaymentPanel';

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
        subtitle="Track payments received against billed invoices"
        gradient="from-emerald-500 to-cyan-500"
        actions={<RefreshButton onClick={fetchData} loading={isFetching} />}
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
              <MobileCard key={r.id} index={i} onClick={() => setSelectedId(r.id)}>
                <div className="flex items-start justify-between gap-3">
                  <EntityCell name={r.client_name} sub={r.invoice_no} />
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
              colSpan={8}
              title="No invoices match"
              hint={filterStatus === 'open' && !term && !filterClient && !filterAge ? 'Nothing is waiting for payment.' : undefined}
              action={hasFilters ? <button onClick={clearFilters} className="text-xs text-blue-400 hover:underline">Clear filters</button> : undefined}
            />
          ) : (
            pageRows.map((r, i) => {
              const pct = r.due > 0 ? Math.min(100, ((r.received + r.tds) / r.due) * 100) : 0;
              return (
                <Tr key={r.id} index={i} onClick={() => setSelectedId(r.id)}>
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
    </div>
  );
}
