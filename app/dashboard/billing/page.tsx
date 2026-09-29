'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { FileText, IndianRupee, Building2, TrendingUp, Undo2, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_URL } from '@/lib/api';
import { formatDate, formatINR } from '@/lib/format';
import {
  useUi, PageHeader, RefreshButton, StatGrid, FilterBar, SearchInput, FilterSelect, ClearFiltersButton,
  TableShell, THead, Th, Tr, TdAccent, EmptyRow, Pagination, EntityCell, Chip, Badge, Modal, Alert,
  GradientButton, GhostButton, Spinner, PageSkeleton,
} from '@/components/app/ui';

type SortKey = 'id' | 'amount' | 'invoice_date' | 'client_name';

export default function BilledPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const ui = useUi();

  const [bills, setBills] = useState<any[]>([]);
  const [filteredBills, setFilteredBills] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [clients, setClients] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [currentPage, setCurrentPage] = useState(1);
  const isAdmin = user?.role_id === 1;
  const [unbillTarget, setUnbillTarget] = useState<any | null>(null);
  const [unbilling, setUnbilling] = useState(false);
  const [unbillError, setUnbillError] = useState('');
  const [itemsPerPage] = useState(10);

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
    applyFilters();
  }, [bills, searchTerm, filterClient, sortKey, sortDir]);

  const fetchData = async () => {
    setIsFetching(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const res = await fetch(`${API_URL}/api/billed`, { headers });
      const data = await res.json();

      const billsData = Array.isArray(data) ? data : [];
      setBills(billsData);

      const uniqueClients = [...new Set<string>(billsData.map((b: any) => b.client_name).filter(Boolean))];
      setClients(uniqueClients.sort());
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load billed invoices');
    } finally {
      setIsFetching(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...bills];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(b =>
        b.client_name?.toLowerCase().includes(term) ||
        b.program_name?.toLowerCase().includes(term) ||
        b.invoice_no?.toLowerCase().includes(term) ||
        b.id?.toString().includes(term.replace(/^#/, ''))
      );
    }

    if (filterClient) {
      filtered = filtered.filter(b => b.client_name === filterClient);
    }

    filtered.sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });

    setFilteredBills(filtered);
    setCurrentPage(1);
  };

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key as SortKey);
      setSortDir(key === 'client_name' ? 'asc' : 'desc');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterClient('');
  };

  const totalPages = Math.ceil(filteredBills.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBills = filteredBills.slice(startIndex, endIndex);

  const closeUnbill = () => {
    if (unbilling) return;
    setUnbillTarget(null);
    setUnbillError('');
  };

  const confirmUnbill = async () => {
    if (!unbillTarget) return;
    setUnbilling(true);
    setUnbillError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/billed/${unbillTarget.id}/unbill`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to move back to projected');
      }
      const remaining = bills.filter(b => b.id !== unbillTarget.id);
      setBills(remaining);
      setClients([...new Set<string>(remaining.map((b: any) => b.client_name).filter(Boolean))].sort());
      toast.success(`Invoice ${unbillTarget.invoice_no} moved back to projected`);
      setUnbillTarget(null);
    } catch (err: any) {
      setUnbillError(err.message || 'Failed to move back to projected');
    } finally {
      setUnbilling(false);
    }
  };

  if (isFetching && bills.length === 0) {
    return <PageSkeleton />;
  }

  const totalAmount = filteredBills.reduce((sum, b) => sum + (b.amount || 0), 0);
  const visibleClients = new Set(filteredBills.map(b => b.client_name)).size;
  const sortProps = { activeSortKey: sortKey, sortDir, onSort: toggleSort };
  const colCount = isAdmin ? 7 : 6;

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        icon={Receipt}
        title="Billed Invoices"
        subtitle="Every invoice that has been billed"
        gradient="from-emerald-500 to-teal-500"
        actions={<RefreshButton onClick={fetchData} loading={isFetching} />}
      />

      <StatGrid
        stats={[
          { label: 'Invoices', value: filteredBills.length, icon: FileText, color: 'blue' },
          { label: 'Total Billed', value: totalAmount, icon: IndianRupee, color: 'emerald', money: true },
          { label: 'Clients', value: visibleClients, icon: Building2, color: 'purple' },
          { label: 'Avg Invoice', value: filteredBills.length ? totalAmount / filteredBills.length : 0, icon: TrendingUp, color: 'amber', money: true },
        ]}
      />

      <FilterBar>
        <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search by ID, client, program or invoice #…" />
        <FilterSelect value={filterClient} onChange={setFilterClient}>
          <option value="">All Clients</option>
          {clients.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </FilterSelect>
        <ClearFiltersButton show={Boolean(searchTerm || filterClient)} onClick={clearFilters} />
      </FilterBar>

      <TableShell
        footer={
          <Pagination
            currentPage={currentPage} totalPages={totalPages} startIndex={startIndex} endIndex={endIndex}
            total={filteredBills.length} onPage={setCurrentPage}
          />
        }
      >
        <THead>
          <Th sortKey="id" {...sortProps}>ID</Th>
          <Th>Invoice #</Th>
          <Th sortKey="client_name" {...sortProps}>Client / Program</Th>
          <Th>Month</Th>
          <Th sortKey="invoice_date" {...sortProps}>Invoice Date</Th>
          <Th sortKey="amount" align="right" {...sortProps}>Amount</Th>
          {isAdmin && <Th align="right">Actions</Th>}
        </THead>
        <tbody>
          {currentBills.length === 0 ? (
            <EmptyRow
              colSpan={colCount}
              title="No billed invoices found"
              action={(searchTerm || filterClient) ? <button onClick={clearFilters} className="text-xs text-blue-400 hover:underline">Clear filters</button> : undefined}
            />
          ) : (
            currentBills.map((b, i) => (
              <Tr key={b.id} index={i}>
                <TdAccent className={`text-xs font-mono ${ui.textSoft}`}>#{b.id}</TdAccent>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${ui.text}`}>{b.invoice_no || '-'}</span>
                    <Badge tone="green" dot>Billed</Badge>
                  </div>
                </td>
                <td className="px-4 py-3"><EntityCell name={b.client_name} sub={b.program_name} /></td>
                <td className="px-4 py-3">{b.invoice_month ? <Chip>{b.invoice_month}</Chip> : <span className={ui.textSoft}>-</span>}</td>
                <td className={`px-4 py-3 text-xs ${ui.textSoft} whitespace-nowrap`}>{formatDate(b.invoice_date)}</td>
                <td className={`px-4 py-3 text-right text-sm font-semibold ${ui.text} whitespace-nowrap tabular-nums`}>{formatINR(b.amount)}</td>
                {isAdmin && (
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setUnbillTarget(b)}
                      title="Move back to projected"
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md text-amber-400 bg-amber-500/10 opacity-60 group-hover:opacity-100 hover:bg-amber-500/20 transition"
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                      Unbill
                    </button>
                  </td>
                )}
              </Tr>
            ))
          )}
        </tbody>
      </TableShell>

      {/* Unbill confirmation (Admin only) */}
      <Modal
        open={Boolean(unbillTarget)}
        onClose={closeUnbill}
        title="Move back to projected?"
        footer={
          <>
            <GhostButton onClick={closeUnbill} disabled={unbilling}>Cancel</GhostButton>
            <GradientButton variant="warning" onClick={confirmUnbill} disabled={unbilling}>
              {unbilling ? <Spinner /> : <Undo2 className="h-4 w-4" />}
              Move to projected
            </GradientButton>
          </>
        }
      >
        {unbillTarget && (
          <>
            {unbillError && <Alert tone="error">{unbillError}</Alert>}
            <div className={`flex items-center justify-between gap-3 p-3 rounded-lg ${ui.subtle} border ${ui.border}`}>
              <EntityCell name={unbillTarget.client_name} sub={`Invoice ${unbillTarget.invoice_no}`} />
              <span className={`text-sm font-semibold ${ui.text} tabular-nums`}>{formatINR(unbillTarget.amount)}</span>
            </div>
            <p className={`text-xs ${ui.muted}`}>
              The invoice number, invoice date and funnel number are cleared so it can be converted again.
              The amount and vendor costs stay as they are. This is recorded in the audit log.
            </p>
          </>
        )}
      </Modal>
    </div>
  );
}
