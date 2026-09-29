'use client';

import { useState, useEffect, Fragment } from 'react';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import {
  History, AlertCircle, AlertTriangle, Info, ChevronDown, ArrowRight, Database, CalendarDays, ListChecks,
} from 'lucide-react';
import { API_URL } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import {
  useUi, PageHeader, RefreshButton, StatGrid, FilterBar, SearchInput, FilterSelect, ClearFiltersButton,
  TableShell, THead, Th, Tr, EmptyRow, Pagination, Avatar, Badge, Chip, Alert, PageSkeleton, type BadgeTone,
} from '@/components/app/ui';

const ACTION_TONE: Record<string, BadgeTone> = { INSERT: 'green', UPDATE: 'blue', DELETE: 'red' };
const IMPACT_TONE: Record<string, BadgeTone> = { HIGH: 'red', MEDIUM: 'amber', LOW: 'green' };
const MODULE_LABEL: Record<string, string> = {
  projection: 'Projection', billing: 'Billing', bulk_upload: 'Bulk Upload', user_management: 'User Management',
};

const ImpactIcon = ({ impact }: { impact: string }) => {
  switch (impact) {
    case 'HIGH': return <AlertCircle className="h-3.5 w-3.5 text-red-400" />;
    case 'MEDIUM': return <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />;
    default: return <Info className="h-3.5 w-3.5 text-blue-400" />;
  }
};

// "2 min ago", "3 h ago", "5 d ago"
const timeAgo = (value?: string) => {
  if (!value) return '';
  const diff = (Date.now() - new Date(value).getTime()) / 1000;
  if (isNaN(diff)) return '';
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  return `${Math.floor(diff / 86400)} d ago`;
};

export default function AuditLogsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const ui = useUi();

  const [logs, setLogs] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState('');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState('All');
  const [filterAction, setFilterAction] = useState('All');
  const [filterImpact, setFilterImpact] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user) {
      fetchLogs();
    }
  }, [user, currentPage, filterModule, filterAction, filterImpact, startDate, endDate]);

  // Back to page 1 whenever a server-side filter changes.
  useEffect(() => {
    setCurrentPage(1);
  }, [filterModule, filterAction, filterImpact, startDate, endDate]);

  const fetchLogs = async () => {
    setIsFetching(true);
    setError('');
    try {
      const token = localStorage.getItem('token');

      const payload: any = {
        module: filterModule || 'All',
        action: filterAction || 'All',
        impact: filterImpact || 'All',
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage
      };

      if (startDate && endDate) {
        payload.date_range = [startDate, endDate];
      }

      const response = await fetch(`${API_URL}/api/audit-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const data = await response.json();
      setLogs(data.data || []);
      setTotalItems(data.total || 0);
      setExpandedRow(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load audit logs');
      setLogs([]);
    } finally {
      setIsFetching(false);
      setHasLoaded(true);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterModule('All');
    setFilterAction('All');
    setFilterImpact('All');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  // Search narrows the page that's loaded (the API has no text search).
  const term = searchTerm.trim().toLowerCase();
  const visibleLogs = term
    ? logs.filter((l) =>
        [l.username, l.module_name, l.table_name, String(l.record_id), l.action_type,
          ...(l.changes || []).flatMap((c: any) => [c.column, c.old, c.new])]
          .some((v) => String(v ?? '').toLowerCase().includes(term))
      )
    : logs;

  if (!hasLoaded) {
    return <PageSkeleton />;
  }

  const hasFilters = filterModule !== 'All' || filterAction !== 'All' || filterImpact !== 'All' || Boolean(startDate || endDate || searchTerm);
  const partialDateRange = Boolean(startDate) !== Boolean(endDate);

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        icon={History}
        title="Audit Logs"
        subtitle="Every change made in the system, who made it and when"
        gradient="from-slate-500 to-slate-700"
        actions={<RefreshButton onClick={fetchLogs} loading={isFetching} />}
      />

      {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}

      <StatGrid
        stats={[
          { label: 'Matching logs', value: totalItems, icon: ListChecks, color: 'blue' },
          { label: 'High impact (this page)', value: logs.filter(l => l.impact_level === 'HIGH').length, icon: AlertCircle, color: 'rose' },
          { label: 'Updates (this page)', value: logs.filter(l => l.action_type === 'UPDATE').length, icon: Database, color: 'purple' },
          { label: 'Fields changed (this page)', value: logs.reduce((n, l) => n + (l.changes?.length || 0), 0), icon: History, color: 'amber' },
        ]}
      />

      <FilterBar>
        <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search this page by user, table, record #, field or value…" />
        <FilterSelect value={filterModule} onChange={setFilterModule}>
          <option value="All">All Modules</option>
          {Object.entries(MODULE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </FilterSelect>
        <FilterSelect value={filterAction} onChange={setFilterAction}>
          <option value="All">All Actions</option>
          <option value="INSERT">Insert</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
        </FilterSelect>
        <FilterSelect value={filterImpact} onChange={setFilterImpact}>
          <option value="All">All Impact</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </FilterSelect>
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border ${partialDateRange ? 'border-amber-500/50' : ui.border}`} title={partialDateRange ? 'Pick both dates to filter by date' : undefined}>
          <CalendarDays className={`h-3.5 w-3.5 ${ui.muted}`} />
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={ui.colorScheme}
            className={`bg-transparent text-xs outline-none ${ui.text}`} />
          <span className={`text-xs ${ui.muted}`}>→</span>
          <input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} style={ui.colorScheme}
            className={`bg-transparent text-xs outline-none ${ui.text}`} />
        </div>
        <ClearFiltersButton show={hasFilters} onClick={clearFilters} />
      </FilterBar>

      <TableShell
        footer={
          <Pagination
            currentPage={currentPage} totalPages={totalPages} startIndex={startIndex} endIndex={endIndex}
            total={totalItems} onPage={setCurrentPage}
          />
        }
      >
        <THead>
          <Th>User</Th>
          <Th>Action</Th>
          <Th>Module</Th>
          <Th>Record</Th>
          <Th>Impact</Th>
          <Th>When</Th>
          <Th />
        </THead>
        <tbody className={isFetching ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
          {visibleLogs.length === 0 ? (
            <EmptyRow
              colSpan={7}
              title={term ? 'No logs on this page match your search' : 'No audit logs found'}
              action={hasFilters ? <button onClick={clearFilters} className="text-xs text-blue-400 hover:underline">Clear filters</button> : undefined}
            />
          ) : (
            visibleLogs.map((log, index) => {
              const expandable = log.changes && log.changes.length > 0;
              const isOpen = expandedRow === index;
              return (
                <Fragment key={`${log.record_id}-${log.changed_at}-${index}`}>
                  <Tr index={index} onClick={expandable ? () => setExpandedRow(isOpen ? null : index) : undefined}
                    className={isOpen ? (ui.isDark ? 'bg-blue-500/[0.06]' : 'bg-blue-50/60') : ''}>
                    <td className={`px-4 py-3 border-l-2 ${isOpen ? 'border-blue-500' : 'border-transparent group-hover:border-blue-500'} transition-colors`}>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={log.username} size="sm" />
                        <span className={`text-sm ${ui.text}`}>{log.username || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge tone={ACTION_TONE[log.action_type] || 'gray'}>{log.action_type}</Badge></td>
                    <td className="px-4 py-3"><Chip>{MODULE_LABEL[log.module_name] || log.module_name || '-'}</Chip></td>
                    <td className={`px-4 py-3 text-xs ${ui.textSoft} whitespace-nowrap`}>
                      <span className="font-mono">{log.table_name}</span> <span className={ui.text}>#{log.record_id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        <ImpactIcon impact={log.impact_level} />
                        <Badge tone={IMPACT_TONE[log.impact_level] || 'gray'}>{log.impact_level}</Badge>
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className={`text-xs ${ui.text}`}>{timeAgo(log.changed_at)}</p>
                      <p className={`text-[11px] ${ui.muted}`}>{formatDateTime(log.changed_at)}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {expandable && (
                        <span className={`inline-flex items-center gap-1 text-xs ${ui.muted} group-hover:text-blue-400 transition`}>
                          {log.changes.length} {log.changes.length === 1 ? 'change' : 'changes'}
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </span>
                      )}
                    </td>
                  </Tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={7} className={`px-4 py-3 ${ui.isDark ? 'bg-white/[0.02]' : 'bg-gray-50'}`}>
                        <div className="pl-9 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                          {log.changes.map((change: any, idx: number) => (
                            <div key={idx} className={`flex flex-wrap items-center gap-3 p-2.5 rounded-lg border ${ui.border} ${ui.card}`}>
                              <span className={`text-xs font-mono font-medium ${ui.text} min-w-[140px]`}>{change.column}</span>
                              <span className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded line-through decoration-red-400/40 break-all">
                                {change.old ?? 'NULL'}
                              </span>
                              <ArrowRight className={`h-3.5 w-3.5 ${ui.muted}`} />
                              <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded break-all">
                                {change.new ?? 'NULL'}
                              </span>
                            </div>
                          ))}
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
