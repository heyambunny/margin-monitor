'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { Receipt, IndianRupee, Building2, TrendingUp, ArrowRightLeft, CheckCircle2, CalendarDays, Hash, Filter, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_URL } from '@/lib/api';
import { formatINR } from '@/lib/format';
import {
  useUi, PageHeader, RefreshButton, StatGrid, FilterBar, SearchInput, FilterSelect, ClearFiltersButton,
  TableShell, THead, Th, Tr, TdAccent, EmptyRow, Pagination, EntityCell, Chip, SidePanel, Alert, Field,
  MobileList, MobileCard, EmptyState,
  GradientButton, GhostButton, Spinner, PageSkeleton,
} from '@/components/app/ui';
import { VendorRows, type VendorRow } from '@/components/app/VendorRows';

type SortKey = 'id' | 'amount' | 'client_name';

const today = () => new Date().toISOString().split('T')[0];

export default function ConvertBillingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const ui = useUi();

  const [projections, setProjections] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [filteredProjections, setFilteredProjections] = useState<any[]>([]);
  const [selectedProjection, setSelectedProjection] = useState<any>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [clients, setClients] = useState<string[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [formData, setFormData] = useState({
    amount: 0 as number | string,
    status: 'Active',
    delete_reason: '',
    funnel_number: '',
    invoice_no: '',
    invoice_date: today(),
  });

  const [vendorRows, setVendorRows] = useState<VendorRow[]>([{ vendor_id: '', amount: '' }]);
  // "Deleted" drops the projection instead of billing it, so none of the invoice fields apply.
  const isDeleting = formData.status === 'Deleted';

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
  }, [projections, searchTerm, filterClient, filterMonth, sortKey, sortDir]);

  const fetchData = async () => {
    setIsFetching(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [projRes, vendRes] = await Promise.all([
        fetch(`${API_URL}/api/projections/pending`, { headers }),
        fetch(`${API_URL}/api/vendors`, { headers }),
      ]);

      const projectionsData = await projRes.json();
      const vendorsData = await vendRes.json();

      const data = Array.isArray(projectionsData) ? projectionsData : [];
      setProjections(data);

      const uniqueClients = [...new Set<string>(data.map((p: any) => p.client_name).filter(Boolean))];
      const uniqueMonths = [...new Set<string>(data.map((p: any) => p.invoice_month).filter(Boolean))];
      setClients(uniqueClients.sort());
      setMonths(uniqueMonths);
      setVendors(Array.isArray(vendorsData) ? vendorsData : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load pending projections');
    } finally {
      setIsFetching(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...projections];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.client_name?.toLowerCase().includes(term) ||
        p.program_name?.toLowerCase().includes(term) ||
        p.invoice_description?.toLowerCase().includes(term) ||
        p.id?.toString().includes(term.replace(/^#/, ''))
      );
    }

    if (filterClient) filtered = filtered.filter(p => p.client_name === filterClient);
    if (filterMonth) filtered = filtered.filter(p => p.invoice_month === filterMonth);

    filtered.sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });

    setFilteredProjections(filtered);
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
    setFilterMonth('');
  };

  const totalPages = Math.ceil(filteredProjections.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProjections = filteredProjections.slice(startIndex, endIndex);
  const totalAmount = filteredProjections.reduce((sum, p) => sum + (p.amount || 0), 0);

  const handleRowSelect = (projection: any) => {
    setSelectedId(projection.id);
    setSelectedProjection(projection);
    setFormData({
      amount: projection.amount || 0,
      status: 'Active',
      delete_reason: '',
      funnel_number: '',
      invoice_no: '',
      invoice_date: today(),
    });
    setVendorRows([{ vendor_id: '', amount: '' }]);
    setError('');
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    if (submitting) return;
    setIsDialogOpen(false);
    setSelectedProjection(null);
    setSelectedId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedId) {
      setError('No projection selected');
      return;
    }

    if (isDeleting && !formData.delete_reason.trim()) {
      setError('Please give a reason for deleting this projection');
      return;
    }

    setSubmitting(true);

    const payload = {
      projection_id: selectedId,
      amount: parseFloat(String(formData.amount)),
      status: formData.status,
      delete_reason: formData.delete_reason || '',
      funnel_number: formData.funnel_number,
      invoice_no: formData.invoice_no,
      invoice_date: formData.invoice_date,
      vendors: vendorRows
        .filter(v => v.vendor_id && v.amount && parseFloat(v.amount) > 0)
        .map(v => ({
          vendor_id: parseInt(v.vendor_id),
          amount: parseFloat(v.amount)
        }))
    };

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/billing/convert/${selectedId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Conversion failed');
      }

      toast.success(
        isDeleting
          ? `Projection #${selectedId} deleted`
          : `Invoice ${formData.invoice_no} billed for ${selectedProjection?.client_name}`
      );
      setProjections(projections.filter(p => p.id !== selectedId));
      setSubmitting(false);
      setIsDialogOpen(false);
      setSelectedProjection(null);
      setSelectedId(null);
      setVendorRows([{ vendor_id: '', amount: '' }]);
    } catch (err: any) {
      setError(err.message || 'Failed to convert');
      setSubmitting(false);
    }
  };

  if (isFetching && projections.length === 0) {
    return <PageSkeleton />;
  }

  const sortProps = { activeSortKey: sortKey, sortDir, onSort: toggleSort };
  const amount = Number(formData.amount) || 0;

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        icon={ArrowRightLeft}
        title="Convert to Billing"
        subtitle="Pick a projection to bill it with an invoice and funnel number"
        gradient="from-blue-500 to-cyan-500"
        actions={<RefreshButton onClick={fetchData} loading={isFetching} />}
      />

      <StatGrid
        stats={[
          { label: 'Pending', value: filteredProjections.length, icon: Receipt, color: 'blue' },
          { label: 'Total Amount', value: totalAmount, icon: IndianRupee, color: 'purple', money: true },
          { label: 'Clients', value: new Set(filteredProjections.map((p) => p.client_name)).size, icon: Building2, color: 'emerald' },
          { label: 'Avg Amount', value: filteredProjections.length ? totalAmount / filteredProjections.length : 0, icon: TrendingUp, color: 'amber', money: true },
        ]}
      />

      <FilterBar>
        <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search by ID, client, program or description…" />
        <FilterSelect value={filterClient} onChange={setFilterClient}>
          <option value="">All Clients</option>
          {clients.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </FilterSelect>
        <FilterSelect value={filterMonth} onChange={setFilterMonth}>
          <option value="">All Months</option>
          {months.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </FilterSelect>
        <ClearFiltersButton show={Boolean(searchTerm || filterClient || filterMonth)} onClick={clearFilters} />
      </FilterBar>

      <TableShell
        footer={
          <Pagination
            currentPage={currentPage} totalPages={totalPages} startIndex={startIndex} endIndex={endIndex}
            total={filteredProjections.length} onPage={setCurrentPage}
          />
        }
        mobile={
          <MobileList empty={<EmptyState title={projections.length === 0 ? 'Nothing waiting to be billed' : 'No projections match your filters'} />}>
            {currentProjections.map((p, i) => (
              <MobileCard key={p.id} index={i} onClick={() => handleRowSelect(p)}>
                <div className="flex items-start justify-between gap-3">
                  <EntityCell name={p.client_name} sub={p.program_name} />
                  <span className={`text-sm font-semibold ${ui.text} tabular-nums whitespace-nowrap`}>{formatINR(p.amount)}</span>
                </div>
                {p.invoice_description && <p className={`pl-11 text-xs ${ui.textSoft} line-clamp-2`}>{p.invoice_description}</p>}
                <div className="flex items-center gap-2 pl-11 text-xs">
                  <span className={`font-mono ${ui.muted}`}>#{p.id}</span>
                  {p.invoice_month && <Chip>{p.invoice_month}</Chip>}
                  <span className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-blue-400 bg-blue-500/10">
                    <ArrowRightLeft className="h-3 w-3" /> Bill it
                  </span>
                </div>
              </MobileCard>
            ))}
          </MobileList>
        }
      >
        <THead>
          <Th sortKey="id" {...sortProps}>ID</Th>
          <Th sortKey="client_name" {...sortProps}>Client / Program</Th>
          <Th>Category</Th>
          <Th>Description</Th>
          <Th>Month</Th>
          <Th sortKey="amount" align="right" {...sortProps}>Amount</Th>
          <Th />
        </THead>
        <tbody>
          {currentProjections.length === 0 ? (
            <EmptyRow
              colSpan={7}
              title={projections.length === 0 ? 'Nothing waiting to be billed' : 'No projections match your filters'}
              hint={projections.length === 0 ? 'Every projection has been converted.' : undefined}
              action={(searchTerm || filterClient || filterMonth) ? <button onClick={clearFilters} className="text-xs text-blue-400 hover:underline">Clear filters</button> : undefined}
            />
          ) : (
            currentProjections.map((p, i) => (
              <Tr key={p.id} index={i} onClick={() => handleRowSelect(p)} className={selectedId === p.id ? (ui.isDark ? 'bg-blue-500/10' : 'bg-blue-50') : ''}>
                <TdAccent className={`text-xs font-mono ${ui.textSoft}`}>#{p.id}</TdAccent>
                <td className="px-4 py-3"><EntityCell name={p.client_name} sub={p.program_name} /></td>
                <td className={`px-4 py-3 text-xs ${ui.textSoft} whitespace-nowrap`}>{p.category_name || '-'}</td>
                <td className={`px-4 py-3 text-xs ${ui.textSoft} max-w-[260px]`}>
                  <span className="block truncate" title={p.invoice_description || ''}>{p.invoice_description || '-'}</span>
                </td>
                <td className="px-4 py-3">{p.invoice_month ? <Chip>{p.invoice_month}</Chip> : <span className={ui.textSoft}>-</span>}</td>
                <td className={`px-4 py-3 text-right text-sm font-semibold ${ui.text} whitespace-nowrap tabular-nums`}>{formatINR(p.amount)}</td>
                <td className="px-4 py-3 text-right">
                  <span className="touch-show inline-flex items-center gap-1 px-2.5 py-1 text-xs text-blue-400 bg-blue-500/10 rounded-md opacity-60 group-hover:opacity-100 group-hover:bg-blue-500/20 transition whitespace-nowrap">
                    <ArrowRightLeft className="h-3 w-3" />
                    Bill it
                  </span>
                </td>
              </Tr>
            ))
          )}
        </tbody>
      </TableShell>

      <SidePanel
        open={isDialogOpen && Boolean(selectedProjection)}
        onClose={closeDialog}
        avatarName={selectedProjection?.client_name}
        title={isDeleting ? 'Delete Projection' : 'Convert to Billing'}
        subtitle={selectedProjection ? `${selectedProjection.client_name} · ${selectedProjection.program_name}` : undefined}
        badge={<span className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${ui.subtle} ${ui.muted}`}>#{selectedId}</span>}
        footer={
          <>
            <span className={`hidden sm:inline text-[11px] ${ui.muted}`}>Esc to close</span>
            <div className="flex items-center gap-2">
              <GhostButton onClick={closeDialog} disabled={submitting}>Cancel</GhostButton>
              {isDeleting ? (
                <GradientButton type="submit" form="convert-form" variant="danger" disabled={submitting || !formData.delete_reason.trim()}>
                  {submitting ? <Spinner /> : <Trash2 className="h-4 w-4" />}
                  {submitting ? 'Deleting…' : 'Delete projection'}
                </GradientButton>
              ) : (
                <GradientButton type="submit" form="convert-form" variant="success" disabled={submitting}>
                  {submitting ? <Spinner /> : <CheckCircle2 className="h-4 w-4" />}
                  {submitting ? 'Billing…' : 'Convert to billing'}
                </GradientButton>
              )}
            </div>
          </>
        }
      >
        {selectedProjection && (
          <form id="convert-form" onSubmit={handleSubmit} className="space-y-5">
            {error && <Alert tone="error">{error}</Alert>}

            <div className={`rounded-xl border ${ui.border} ${ui.subtle} p-4 space-y-3`}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className={`text-[11px] ${ui.muted}`}>Category</p>
                  <p className={`text-sm ${ui.text}`}>{selectedProjection.category_name || '-'}</p>
                </div>
                <div>
                  <p className={`text-[11px] ${ui.muted}`}>Invoice Month</p>
                  <p className={`text-sm ${ui.text}`}>{selectedProjection.invoice_month || '-'}</p>
                </div>
              </div>
              <div>
                <p className={`text-[11px] ${ui.muted}`}>Description</p>
                <p className={`text-sm ${ui.text}`}>{selectedProjection.invoice_description || '-'}</p>
              </div>
            </div>

            <Field label="What do you want to do?">
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['Active', 'Bill it', CheckCircle2, 'border-emerald-500 bg-emerald-500/10 text-emerald-400 ring-emerald-500/40'],
                  ['Deleted', 'Delete projection', Trash2, 'border-red-500 bg-red-500/10 text-red-400 ring-red-500/40'],
                ] as const).map(([value, label, Icon, activeCls]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => { setFormData({ ...formData, status: value }); setError(''); }}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 text-sm rounded-lg border transition ${
                      formData.status === value ? `${activeCls} ring-1` : `${ui.border} ${ui.textSoft} ${ui.hoverBtn}`
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </Field>

            {isDeleting ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                <Alert tone="error">
                  This projection ({formatINR(selectedProjection.amount)}) will be marked as deleted and removed from
                  projections, reports and the dashboard. No invoice or funnel number is needed.
                </Alert>
                <Field label="Reason for deleting *" hint={`${formData.delete_reason.length} chars`}>
                  <textarea
                    className={`w-full px-3 py-2 text-sm ${ui.input} resize-y min-h-[90px]`}
                    value={formData.delete_reason}
                    onChange={(e) => setFormData({ ...formData, delete_reason: e.target.value })}
                    placeholder="e.g. Duplicate entry, client cancelled the program…"
                    required
                    autoFocus
                  />
                </Field>
              </div>
            ) : (
              <div className="space-y-5 animate-in fade-in slide-in-from-top-1 duration-200">
                <Field
                  label="Billed Amount *"
                  hint={amount !== (selectedProjection.amount || 0) && (
                    <span className={`font-medium ${amount > (selectedProjection.amount || 0) ? 'text-emerald-400' : 'text-red-400'}`}>
                      Projected {formatINR(selectedProjection.amount)}
                    </span>
                  )}
                >
                  <div className="relative">
                    <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-lg ${ui.muted}`}>₹</span>
                    <input
                      type="number"
                      step="0.01"
                      className={`w-full pl-8 pr-3 py-2.5 text-lg font-semibold tabular-nums ${ui.input}`}
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                    />
                  </div>
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Invoice Number *" icon={Hash}>
                    <input
                      type="text"
                      className={`w-full px-3 py-2 text-sm ${ui.input}`}
                      value={formData.invoice_no}
                      onChange={(e) => setFormData({ ...formData, invoice_no: e.target.value })}
                      placeholder="INV-001"
                      required
                      autoFocus
                    />
                  </Field>
                  <Field label="Funnel Number *" icon={Filter}>
                    <input
                      type="text"
                      className={`w-full px-3 py-2 text-sm ${ui.input}`}
                      value={formData.funnel_number}
                      onChange={(e) => setFormData({ ...formData, funnel_number: e.target.value })}
                      placeholder="F-001"
                      required
                    />
                  </Field>
                </div>

                <Field label="Invoice Date *" icon={CalendarDays}>
                  <input
                    type="date"
                    className={`w-full px-3 py-2 text-sm ${ui.input}`}
                    value={formData.invoice_date}
                    onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                    required
                  />
                </Field>

                <VendorRows rows={vendorRows} onChange={setVendorRows} vendors={vendors} amount={amount} />
              </div>
            )}
          </form>
        )}
      </SidePanel>
    </div>
  );
}
