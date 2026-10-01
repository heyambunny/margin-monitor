'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import {
  Pencil, Save, Plus, Trash2, FileText, IndianRupee, Building2, TrendingUp, Lock, CalendarDays, Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { API_URL } from '@/lib/api';
import { formatDate, formatINR } from '@/lib/format';
import {
  useUi, PageHeader, RefreshButton, StatGrid, FilterBar, SearchInput, FilterSelect, ClearFiltersButton,
  TableShell, THead, Th, Tr, TdAccent, EmptyRow, Pagination, EntityCell, Chip, SidePanel, Alert, Field,
  MobileList, MobileCard, EmptyState,
  GradientButton, GhostButton, Spinner, PageSkeleton,
} from '@/components/app/ui';

type SortKey = 'id' | 'amount' | 'projection_date' | 'client_name';

// Financial year runs Apr-Mar. Same "FY 2026-2027" format the backend writes.
const FY_ORDER = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
const fyStartOf = (invoiceMonth?: string | null) => {
  const [m, yy] = (invoiceMonth || '').split('-');
  const year = 2000 + Number(yy);
  if (!m || Number.isNaN(year)) return null;
  return FY_ORDER.indexOf(m) <= 8 ? year : year - 1; // Apr..Dec -> same year
};
const fyLabel = (start: number) => `FY ${start}-${start + 1}`;

// Invoice month choices: the current financial year only. An entry whose
// saved month lies outside it keeps that month as an option so the field can
// still show (and leave) its existing value.
function invoiceMonthGroups(current?: string | null) {
  const now = new Date();
  const thisFy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const groups = [{
    label: fyLabel(thisFy),
    months: FY_ORDER.map((m, i) => `${m}-${String(i <= 8 ? thisFy : thisFy + 1).slice(-2)}`),
  }];
  if (current && !groups[0].months.includes(current)) {
    groups.unshift({ label: 'Saved month (outside current FY)', months: [current] });
  }
  return groups;
}

export default function EditProjectionPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const ui = useUi();

  const [projections, setProjections] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [filteredProjections, setFilteredProjections] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingData, setEditingData] = useState<any>(null);
  const [originalData, setOriginalData] = useState<any>(null);
  const [vendorRows, setVendorRows] = useState<{vendor_id: string, amount: string}[]>([{ vendor_id: '', amount: '' }]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recentlyUpdatedId, setRecentlyUpdatedId] = useState<number | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [clients, setClients] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const deleteColor = ui.isDark ? 'text-gray-400 hover:text-red-400' : 'text-gray-500 hover:text-red-500';

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
  }, [projections, searchTerm, filterClient, sortKey, sortDir]);

  // Cmd/Ctrl+S saves while the editor is open (Esc is handled by SidePanel).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's' && isDialogOpen) {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const fetchData = async () => {
    setIsFetching(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [projRes, vendRes] = await Promise.all([
        fetch(`${API_URL}/api/projections/active`, { headers }),
        fetch(`${API_URL}/api/vendors`, { headers }),
      ]);

      const projectionsData = await projRes.json();
      const vendorsData = await vendRes.json();

      setProjections(Array.isArray(projectionsData) ? projectionsData : []);
      setVendors(Array.isArray(vendorsData) ? vendorsData : []);

      const uniqueClients = [...new Set<string>(projectionsData.map((p: any) => p.client_name).filter(Boolean))];
      setClients(uniqueClients.sort());
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load projections');
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
        p.description?.toLowerCase().includes(term) ||
        p.id?.toString().includes(term.replace(/^#/, ''))
      );
    }

    if (filterClient) {
      filtered = filtered.filter(p => p.client_name === filterClient);
    }

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
  };

  const totalPages = Math.ceil(filteredProjections.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProjections = filteredProjections.slice(startIndex, endIndex);
  const totalAmount = filteredProjections.reduce((sum, p) => sum + (p.amount || 0), 0);
  const visibleClientCount = new Set(filteredProjections.map(p => p.client_name)).size;

  const startEdit = (projection: any) => {
    const data = {
      id: projection.id,
      description: projection.description || '',
      amount: projection.amount || 0,
      projection_date: projection.projection_date || '',
      invoice_month_edit: projection.invoice_month || '',
      client_name: projection.client_name,
      program_name: projection.program_name,
      category_name: projection.category_name,
      invoice_month: projection.invoice_month,
      financial_year: projection.financial_year,
    };
    setEditingId(projection.id);
    setEditingData(data);
    setOriginalData(data);
    setVendorRows([{ vendor_id: '', amount: '' }]);
    setError('');
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    if (saving) return;
    setIsDialogOpen(false);
    setEditingId(null);
    setEditingData(null);
    setOriginalData(null);
    setVendorRows([{ vendor_id: '', amount: '' }]);
  };

  const addVendorRow = () => {
    setVendorRows([...vendorRows, { vendor_id: '', amount: '' }]);
  };

  const removeVendorRow = (index: number) => {
    if (vendorRows.length > 1) {
      setVendorRows(vendorRows.filter((_, i) => i !== index));
    }
  };

  const filledVendors = vendorRows.filter(v => v.vendor_id && v.amount && parseFloat(v.amount) > 0);
  const newVendorTotal = filledVendors.reduce((sum, v) => sum + parseFloat(v.amount), 0);
  const editAmount = Number(editingData?.amount) || 0;
  const amountDelta = editingData && originalData ? editAmount - (Number(originalData.amount) || 0) : 0;
  const previewMargin = editAmount - newVendorTotal;
  const previewMarginPct = editAmount > 0 ? (previewMargin / editAmount) * 100 : 0;

  const isDirty = useMemo(() => {
    if (!editingData || !originalData) return false;
    return (
      editingData.description !== originalData.description ||
      Number(editingData.amount) !== Number(originalData.amount) ||
      editingData.invoice_month_edit !== originalData.invoice_month_edit ||
      filledVendors.length > 0
    );
  }, [editingData, originalData, filledVendors.length]);

  const handleSave = async () => {
    setError('');

    if (!editingData || saving || !isDirty) return;
    if (!(editAmount > 0)) {
      setError('Amount must be greater than zero');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        description: editingData.description,
        amount: editAmount,
        status: 'Active',
        invoice_month: editingData.invoice_month_edit || null,
        vendors: filledVendors.map(v => ({
          vendor_id: parseInt(v.vendor_id),
          amount: parseFloat(v.amount)
        }))
      };

      const response = await fetch(`${API_URL}/api/edit-projection/${editingId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to update');
      }

      const updatedId = editingId;
      setSaving(false);
      closeDialog();
      toast.success(`Projection #${updatedId} updated`);

      // Refresh the list and briefly highlight the row that changed
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(`${API_URL}/api/projections/active`, { headers });
      const data = await res.json();
      setProjections(Array.isArray(data) ? data : []);
      setRecentlyUpdatedId(updatedId);
      setTimeout(() => setRecentlyUpdatedId(null), 2500);
    } catch (err: any) {
      setError(err.message || 'Failed to update projection');
      setSaving(false);
    }
  };

  if (isFetching && projections.length === 0) {
    return <PageSkeleton />;
  }

  const sortProps = { activeSortKey: sortKey, sortDir, onSort: toggleSort };

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        icon={Pencil}
        title="Edit Projections"
        subtitle="Click any projection to update its amount, invoice month, description or vendors"
        actions={<RefreshButton onClick={fetchData} loading={isFetching} />}
      />

      <StatGrid
        stats={[
          { label: 'Active Projections', value: filteredProjections.length, icon: FileText, color: 'blue' },
          { label: 'Total Value', value: totalAmount, icon: IndianRupee, color: 'purple', money: true },
          { label: 'Clients', value: visibleClientCount, icon: Building2, color: 'emerald' },
          { label: 'Avg per Projection', value: filteredProjections.length ? totalAmount / filteredProjections.length : 0, icon: TrendingUp, color: 'amber', money: true },
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
        <ClearFiltersButton show={Boolean(searchTerm || filterClient)} onClick={clearFilters} />
      </FilterBar>

      <TableShell
        footer={
          <Pagination
            currentPage={currentPage} totalPages={totalPages} startIndex={startIndex} endIndex={endIndex}
            total={filteredProjections.length} onPage={setCurrentPage}
          />
        }
        mobile={
          <MobileList empty={<EmptyState title="No active projections found" />}>
            {currentProjections.map((p, i) => (
              <MobileCard key={p.id} index={i} onClick={() => startEdit(p)} highlight={recentlyUpdatedId === p.id}>
                <div className="flex items-start justify-between gap-3">
                  <EntityCell name={p.client_name} sub={p.program_name} />
                  <span className={`text-sm font-semibold ${ui.text} tabular-nums whitespace-nowrap`}>{formatINR(p.amount)}</span>
                </div>
                <div className="flex items-center gap-2 pl-11 text-xs">
                  <span className={`font-mono ${ui.muted}`}>#{p.id}</span>
                  {p.invoice_month && <Chip>{p.invoice_month}</Chip>}
                  <span className={ui.muted}>{formatDate(p.projection_date)}</span>
                  <Pencil className="ml-auto h-3.5 w-3.5 text-blue-400" />
                </div>
              </MobileCard>
            ))}
          </MobileList>
        }
      >
        <THead>
          <Th sortKey="id" {...sortProps}>ID</Th>
          <Th sortKey="client_name" {...sortProps}>Client / Program</Th>
          <Th>Month</Th>
          <Th sortKey="projection_date" {...sortProps}>Projection Date</Th>
          <Th sortKey="amount" align="right" {...sortProps}>Amount</Th>
          <Th />
        </THead>
        <tbody>
          {currentProjections.length === 0 ? (
            <EmptyRow
              colSpan={6}
              title="No active projections found"
              action={(searchTerm || filterClient) ? <button onClick={clearFilters} className="text-xs text-blue-400 hover:underline">Clear filters</button> : undefined}
            />
          ) : (
            currentProjections.map((p, i) => (
              <Tr key={p.id} index={i} onClick={() => startEdit(p)} highlight={recentlyUpdatedId === p.id}>
                <TdAccent highlight={recentlyUpdatedId === p.id} className={`text-xs font-mono ${ui.textSoft}`}>#{p.id}</TdAccent>
                <td className="px-4 py-3"><EntityCell name={p.client_name} sub={p.program_name} /></td>
                <td className="px-4 py-3">{p.invoice_month ? <Chip>{p.invoice_month}</Chip> : <span className={ui.textSoft}>-</span>}</td>
                <td className={`px-4 py-3 text-xs ${ui.textSoft} whitespace-nowrap`}>{formatDate(p.projection_date)}</td>
                <td className={`px-4 py-3 text-right text-sm font-semibold ${ui.text} whitespace-nowrap tabular-nums`}>{formatINR(p.amount)}</td>
                <td className="px-4 py-3 text-right">
                  <span className="touch-show inline-flex items-center gap-1 px-2.5 py-1 text-xs text-blue-400 bg-blue-500/10 rounded-md opacity-60 group-hover:opacity-100 group-hover:bg-blue-500/20 transition">
                    <Pencil className="h-3 w-3" />
                    Edit
                  </span>
                </td>
              </Tr>
            ))
          )}
        </tbody>
      </TableShell>

      <SidePanel
        open={isDialogOpen && Boolean(editingData)}
        onClose={closeDialog}
        avatarName={editingData?.client_name}
        title={editingData?.client_name}
        subtitle={editingData?.program_name}
        badge={<span className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${ui.subtle} ${ui.muted}`}>#{editingId}</span>}
        footer={
          <>
            <span className={`text-[11px] ${ui.muted}`}>
              {isDirty ? (
                <span className="inline-flex items-center gap-1.5 text-amber-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Unsaved changes
                </span>
              ) : (
                <span className="hidden sm:inline">Esc to close · ⌘/Ctrl S to save</span>
              )}
            </span>
            <div className="flex items-center gap-2">
              <GhostButton onClick={closeDialog} disabled={saving}>Cancel</GhostButton>
              <GradientButton onClick={handleSave} disabled={saving || !isDirty}>
                {saving ? <Spinner /> : <Save className="h-4 w-4" />}
                {saving ? 'Saving…' : 'Save changes'}
              </GradientButton>
            </div>
          </>
        }
      >
        {editingData && (
          <>
            {error && <Alert tone="error">{error}</Alert>}

            {/* Read-only details */}
            <div className={`rounded-xl border ${ui.border} ${ui.subtle} p-4`}>
              <div className={`flex items-center gap-1.5 mb-3 text-[11px] uppercase tracking-wide ${ui.muted}`}>
                <Lock className="h-3 w-3" />
                Locked details
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {[
                  ['Client', editingData.client_name],
                  ['Program', editingData.program_name],
                  ['Category', editingData.category_name],
                  ['Projection Date', formatDate(editingData.projection_date)],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <p className={`text-[11px] ${ui.muted}`}>{label}</p>
                    <p className={`text-sm ${ui.text} truncate`} title={value || ''}>{value || '-'}</p>
                  </div>
                ))}
              </div>
            </div>

            <Field
              label="Amount"
              hint={amountDelta !== 0 && (
                <span className={`font-medium animate-in fade-in ${amountDelta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {amountDelta > 0 ? '+' : '−'}{formatINR(Math.abs(amountDelta))} vs current
                </span>
              )}
            >
              <div className="relative">
                <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-lg ${ui.muted}`}>₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={`w-full pl-8 pr-3 py-2.5 text-lg font-semibold tabular-nums ${ui.input}`}
                  value={editingData.amount}
                  onChange={(e) => setEditingData({ ...editingData, amount: e.target.value })}
                />
              </div>
            </Field>

            <Field
              label="Invoice Month"
              icon={CalendarDays}
              hint={(() => {
                const start = fyStartOf(editingData.invoice_month_edit);
                if (start === null) return undefined;
                const changed = editingData.invoice_month_edit !== originalData?.invoice_month_edit;
                const fyChanged = changed && fyStartOf(originalData?.invoice_month_edit) !== start;
                return (
                  <span className={fyChanged ? 'text-amber-400 font-medium' : ''}>
                    {fyLabel(start)}{fyChanged ? ' (financial year changes)' : ''}
                  </span>
                );
              })()}
            >
              <select
                className={`w-full px-3 py-2.5 text-sm ${ui.input}`}
                style={ui.colorScheme}
                value={editingData.invoice_month_edit || ''}
                onChange={(e) => setEditingData({ ...editingData, invoice_month_edit: e.target.value })}
              >
                {!editingData.invoice_month_edit && <option value="">Select month</option>}
                {invoiceMonthGroups(originalData?.invoice_month_edit).map((g) => (
                  <optgroup key={g.label} label={g.label}>
                    {g.months.map((m) => <option key={m} value={m}>{m}</option>)}
                  </optgroup>
                ))}
              </select>
              {editingData.invoice_month_edit !== originalData?.invoice_month_edit && (
                <p className={`mt-1.5 text-[11px] ${ui.muted} animate-in fade-in`}>
                  {originalData?.invoice_month_edit || '-'} → <span className={`font-medium ${ui.text}`}>{editingData.invoice_month_edit}</span>
                </p>
              )}
            </Field>

            <Field label="Description" hint={`${(editingData.description || '').length} chars`}>
              <textarea
                className={`w-full px-3 py-2 text-sm ${ui.input} resize-y min-h-[80px]`}
                rows={3}
                value={editingData.description || ''}
                onChange={(e) => setEditingData({ ...editingData, description: e.target.value })}
              />
            </Field>

            {/* Vendors */}
            <div className={`rounded-xl border ${ui.border} p-4`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-medium ${ui.text}`}>Vendor Expenses</span>
                <button
                  type="button"
                  onClick={addVendorRow}
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1 rounded-md transition"
                >
                  <Plus className="h-3 w-3" />
                  Add vendor
                </button>
              </div>
              <p className={`flex items-start gap-1.5 text-[11px] ${ui.muted} mb-3`}>
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                Leave empty to keep the existing vendors. Adding vendors here replaces all existing vendors on this projection.
              </p>

              <div className="space-y-2">
                {vendorRows.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <select
                      className={`flex-1 min-w-0 px-2.5 py-2 text-sm ${ui.input}`}
                      value={row.vendor_id}
                      onChange={(e) => {
                        const newRows = [...vendorRows];
                        newRows[idx] = { ...newRows[idx], vendor_id: e.target.value };
                        setVendorRows(newRows);
                      }}
                    >
                      <option value="">Select vendor</option>
                      {vendors.map((v: any) => (
                        <option key={v.id} value={String(v.id)}>{v.vendor_name}</option>
                      ))}
                    </select>
                    <div className="relative w-32">
                      <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 text-sm ${ui.muted}`}>₹</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0"
                        className={`w-full pl-6 pr-2 py-2 text-sm tabular-nums ${ui.input}`}
                        value={row.amount}
                        onChange={(e) => {
                          const newRows = [...vendorRows];
                          newRows[idx] = { ...newRows[idx], amount: e.target.value };
                          setVendorRows(newRows);
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeVendorRow(idx)}
                      className={`p-1.5 rounded-md ${deleteColor} transition disabled:opacity-30 disabled:pointer-events-none`}
                      disabled={vendorRows.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Live margin preview when new vendors are entered */}
              {filledVendors.length > 0 && (
                <div className={`mt-4 pt-3 border-t ${ui.border} space-y-2 animate-in fade-in`}>
                  <div className="flex items-center justify-between text-xs">
                    <span className={ui.muted}>New vendor total</span>
                    <span className={`${ui.text} tabular-nums`}>{formatINR(newVendorTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className={ui.muted}>Margin</span>
                    <span className={`font-semibold tabular-nums ${previewMargin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatINR(previewMargin)} ({previewMarginPct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className={`h-1.5 rounded-full ${ui.isDark ? 'bg-white/10' : 'bg-gray-200'} overflow-hidden`}>
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${previewMargin >= 0 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(100, Math.max(0, Math.abs(previewMarginPct)))}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </SidePanel>
    </div>
  );
}
