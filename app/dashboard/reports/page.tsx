'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/providers/ThemeProvider';
import { FileText, IndianRupee, TrendingUp, BarChart3, Download, FileBarChart } from 'lucide-react';
import { API_URL } from '@/lib/api';
import {
  useUi, PageHeader, RefreshButton, StatGrid, FilterBar, SearchInput, FilterSelect, ClearFiltersButton,
  TableShell, THead, Th, Tr, EmptyRow, Pagination, Badge, Chip, PageSkeleton,
} from '@/components/app/ui';

export default function ReportsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [reports, setReports] = useState<any[]>([]);
  const [filteredReports, setFilteredReports] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterType, setFilterType] = useState('');
  const [clients, setClients] = useState<string[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const bgCard = isDark ? 'bg-[#131726]' : 'bg-white';
  const borderLight = isDark ? 'border-white/5' : 'border-gray-200';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-white/50' : 'text-gray-500';
  const inputBg = isDark ? 'bg-white/5' : 'bg-gray-50';
  const inputBorder = isDark ? 'border-white/10' : 'border-gray-300';
  const inputText = isDark ? 'text-white' : 'text-gray-800';
  const placeholder = isDark ? 'placeholder-white/20' : 'placeholder-gray-400';
  const tableText = isDark ? 'text-white' : 'text-gray-800';
  const tableTextMuted = isDark ? 'text-white/60' : 'text-gray-600';
  const tableHeader = isDark ? 'text-white/40' : 'text-gray-500';
  const hoverBg = isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50';
  const cardBorder = isDark ? 'border-white/5' : 'border-gray-200';
  const rowBorder = isDark ? 'border-white/5' : 'border-gray-100';
  // ID stays pinned while the wide report table scrolls sideways.
  const stickyCol = `sticky left-0 z-10 ${bgCard} ${isDark ? 'shadow-[1px_0_0_rgba(255,255,255,0.05)]' : 'shadow-[1px_0_0_#e5e7eb]'}`;

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
  }, [reports, searchTerm, filterClient, filterType]);

  const fetchData = async () => {
    setIsFetching(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const res = await fetch(`${API_URL}/api/reports`, { headers });
      const data = await res.json();
      
      const reportsData = Array.isArray(data) ? data : [];
      setReports(reportsData);
      
      const uniqueClients = [...new Set(reportsData.map((r: any) => r.client_name).filter(Boolean))];
      setClients(uniqueClients);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
    } finally {
      setIsFetching(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...reports];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.id?.toString() === term.replace(/^#/, '') ||
        [r.client_name, r.program_name, r.invoice_no, r.funnel_number, r.invoice_description,
          r.vendor1name, r.vendor2name, r.vendor3name, r.vendor4name, r.vendor5name]
          .some((v) => v?.toLowerCase().includes(term))
      );
    }
    
    if (filterClient) {
      filtered = filtered.filter(r => r.client_name === filterClient);
    }
    
    if (filterType) {
      filtered = filtered.filter(r => (r.expense_type_name || 'Projected') === filterType);
    }
    
    setFilteredReports(filtered);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterClient('');
    setFilterType('');
  };

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentReports = filteredReports.slice(startIndex, endIndex);


  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const exportCSV = () => {
    if (filteredReports.length === 0) return;

    const escape = (v: unknown) => {
      const text = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const headers = reportColumns.map(c => c.label);
    const rows = filteredReports.map(r => reportColumns.map(c => escape(c.csv(r))));

    const csv = [headers.map(escape).join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reports_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatCurrency = (value: number) => {
    if (!value) return '₹0';
    return `₹${value.toLocaleString()}`;
  };

  const marginPct = (r: any) =>
    r.client_billed_amount ? ((r.gross_margin || 0) / r.client_billed_amount) * 100 : null;

  // Vendor slots shown: at least 2, more if any filtered entry has more
  // vendors (the API returns up to 5 per entry).
  const vendorSlots = Math.max(
    2,
    ...filteredReports.map(r => [1, 2, 3, 4, 5].filter(i => r[`vendor${i}name`]).length)
  );

  type ReportColumn = {
    label: string;
    csv: (r: any) => unknown;
    cell: (r: any) => React.ReactNode;
    className?: string;
  };

  const text = (key: string, className = tableTextMuted): ReportColumn['cell'] =>
    (r) => <span className={className}>{r[key] || '-'}</span>;
  const money = (get: (r: any) => number | null | undefined): ReportColumn['cell'] =>
    (r) => {
      const v = get(r);
      return <span className={tableText}>{v === null || v === undefined ? '-' : formatCurrency(v)}</span>;
    };

  const reportColumns: ReportColumn[] = [
    { label: 'ID', csv: r => r.id, cell: r => <span className={tableTextMuted}>#{r.id}</span> },
    { label: 'Client', csv: r => r.client_name, cell: text('client_name', tableText) },
    { label: 'Program', csv: r => r.program_name, cell: text('program_name') },
    { label: 'Category', csv: r => r.category_name, cell: text('category_name') },
    {
      label: 'Description',
      csv: r => r.invoice_description,
      cell: r => (
        <span className={`block max-w-[240px] truncate ${tableTextMuted}`} title={r.invoice_description || ''}>
          {r.invoice_description || '-'}
        </span>
      ),
    },
    {
      label: 'Type',
      csv: r => r.expense_type_name || 'Projected',
      cell: r => (
        <Badge tone={r.expense_type_name === 'Billed' ? 'blue' : 'amber'}>{r.expense_type_name || 'Projected'}</Badge>
      ),
    },
    {
      label: 'Status',
      csv: r => r.status || 'Active',
      cell: r => (
        <Badge dot tone={(r.status || 'Active') === 'Active' ? 'green' : r.status === 'Billed' ? 'blue' : 'gray'}>{r.status || 'Active'}</Badge>
      ),
    },
    { label: 'Month', csv: r => r.invoice_month, cell: r => (r.invoice_month ? <Chip>{r.invoice_month}</Chip> : <span className={tableTextMuted}>-</span>) },
    { label: 'FY', csv: r => r.financial_year, cell: text('financial_year') },
    { label: 'Projection Date', csv: r => r.projection_date, cell: text('projection_date') },
    { label: 'Funnel #', csv: r => r.funnel_number, cell: text('funnel_number') },
    { label: 'Invoice #', csv: r => r.invoice_no, cell: text('invoice_no', tableText) },
    { label: 'Invoice Date', csv: r => r.invoice_date, cell: text('invoice_date') },
    {
      label: 'Amount',
      csv: r => r.client_billed_amount ?? 0,
      cell: r => <span className={`font-medium ${tableText}`}>{formatCurrency(r.client_billed_amount)}</span>,
    },
    ...Array.from({ length: vendorSlots }, (_, i) => i + 1).flatMap((n): ReportColumn[] => [
      { label: `Vendor ${n}`, csv: r => r[`vendor${n}name`], cell: text(`vendor${n}name`) },
      { label: `Vendor ${n} Amount`, csv: r => r[`vendor${n}amount`], cell: money(r => r[`vendor${n}amount`]) },
    ]),
    { label: 'Total Vendor Cost', csv: r => r.total_vendor ?? 0, cell: money(r => r.total_vendor ?? 0) },
    { label: 'Credit Note', csv: r => r.total_credit_note ?? 0, cell: money(r => r.total_credit_note ?? 0) },
    {
      label: 'Margin',
      csv: r => r.gross_margin ?? 0,
      cell: r => (
        <span className={`font-medium ${(r.gross_margin || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {formatCurrency(r.gross_margin)}
        </span>
      ),
    },
    {
      label: 'Margin %',
      csv: r => { const m = marginPct(r); return m === null ? '' : m.toFixed(1); },
      cell: r => {
        const m = marginPct(r);
        return (
          <span className={m === null ? tableTextMuted : m >= 0 ? 'text-green-400' : 'text-red-400'}>
            {m === null ? '-' : `${m.toFixed(1)}%`}
          </span>
        );
      },
    },
    { label: 'Created By', csv: r => r.created_by, cell: text('created_by') },
    { label: 'Reason', csv: r => r.reason, cell: text('reason') },
  ];

  if (isFetching && reports.length === 0) {
    return <PageSkeleton />;
  }

  const totalRevenue = filteredReports.reduce((sum, r) => sum + (r.client_billed_amount || 0), 0);
  const totalMargin = filteredReports.reduce((sum, r) => sum + (r.gross_margin || 0), 0);

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        icon={FileBarChart}
        title="Reports"
        subtitle="Every billing entry with vendors, margins and invoice details"
        gradient="from-indigo-500 to-blue-500"
        actions={
          <>
            <RefreshButton onClick={fetchData} loading={isFetching} />
            <button
              onClick={exportCSV}
              disabled={filteredReports.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/20 hover:from-blue-600 hover:to-purple-600 active:scale-[0.98] transition disabled:opacity-40 disabled:shadow-none"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </>
        }
      />

      <StatGrid
        stats={[
          { label: 'Revenue', value: totalRevenue, icon: IndianRupee, color: 'blue', money: true },
          { label: 'Margin', value: totalMargin, icon: TrendingUp, color: 'emerald', money: true },
          { label: 'Avg Margin', value: totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0, icon: BarChart3, color: 'purple', suffix: '%', decimals: 1 },
          { label: 'Records', value: filteredReports.length, icon: FileText, color: 'amber' },
        ]}
      />

      <FilterBar>
        <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search by ID, client, program, invoice, vendor…" />
        <FilterSelect value={filterClient} onChange={setFilterClient}>
          <option value="">All Clients</option>
          {clients.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </FilterSelect>
        <FilterSelect value={filterType} onChange={setFilterType}>
          <option value="">All Types</option>
          <option value="Billed">Billed</option>
          <option value="Projected">Projected</option>
        </FilterSelect>
        <ClearFiltersButton show={Boolean(searchTerm || filterClient || filterType)} onClick={clearFilters} />
      </FilterBar>

      <TableShell
        footer={
          <Pagination
            currentPage={currentPage} totalPages={totalPages} startIndex={startIndex} endIndex={endIndex}
            total={filteredReports.length} onPage={setCurrentPage}
          />
        }
      >
        <THead>
          {reportColumns.map((c) => (
            <Th key={c.label} className={c.label === 'ID' ? stickyCol : ''}>{c.label}</Th>
          ))}
        </THead>
        <tbody>
          {currentReports.length === 0 ? (
            <EmptyRow
              colSpan={reportColumns.length}
              title="No report entries found"
              action={(searchTerm || filterClient || filterType) ? <button onClick={clearFilters} className="text-xs text-blue-400 hover:underline">Clear filters</button> : undefined}
            />
          ) : (
            currentReports.map((r, i) => (
              <Tr key={r.id} index={i}>
                {reportColumns.map((c) => (
                  <td key={c.label} className={`px-4 py-3 text-xs whitespace-nowrap ${c.label === 'ID' ? `${stickyCol} font-mono` : ''}`}>
                    {c.cell(r)}
                  </td>
                ))}
              </Tr>
            ))
          )}
        </tbody>
      </TableShell>
    </div>
  );
}
