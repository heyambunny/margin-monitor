'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/providers/ThemeProvider';
import { 
  Search, X, RefreshCw, ChevronLeft, ChevronRight,
  User, Clock, Database, AlertCircle, CheckCircle, AlertTriangle, Info
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { API_URL } from '@/lib/api';

export default function AuditLogsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [logs, setLogs] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(true);
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

  const bgColor = isDark ? 'bg-[#0b0e1a]' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-[#131726]' : 'bg-white';
  const borderColor = isDark ? 'border-white/5' : 'border-gray-200';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const inputBg = isDark ? 'bg-white/5' : 'bg-gray-50';
  const inputBorder = isDark ? 'border-white/10' : 'border-gray-200';
  const inputText = isDark ? 'text-white' : 'text-gray-800';
  const placeholder = isDark ? 'placeholder-white/20' : 'placeholder-gray-400';
  const hoverBg = isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50';

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

  const fetchLogs = async () => {
    setIsFetching(true);
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
    } catch (err: any) {
      setError(err.message || 'Failed to load audit logs');
      setLogs([]);
    } finally {
      setIsFetching(false);
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

  const toggleExpand = (id: number) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const total = totalPages;
    const current = currentPage;
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
        range.push(i);
      }
    }

    range.forEach((i) => {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    });

    return rangeWithDots;
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      'INSERT': 'bg-green-500/20 text-green-400',
      'UPDATE': 'bg-blue-500/20 text-blue-400',
      'DELETE': 'bg-red-500/20 text-red-400',
    };
    return colors[action] || 'bg-gray-500/20 text-gray-400';
  };

  const getImpactBadge = (impact: string) => {
    const colors: Record<string, string> = {
      'HIGH': 'bg-red-500/20 text-red-400',
      'MEDIUM': 'bg-yellow-500/20 text-yellow-400',
      'LOW': 'bg-green-500/20 text-green-400',
    };
    return colors[impact] || 'bg-gray-500/20 text-gray-400';
  };

  const getImpactIcon = (impact: string) => {
    switch(impact) {
      case 'HIGH': return <AlertCircle className="h-3.5 w-3.5 text-red-400" />;
      case 'MEDIUM': return <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />;
      default: return <Info className="h-3.5 w-3.5 text-blue-400" />;
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgColor} transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h1 className={`text-lg font-semibold ${textColor}`}>Audit Logs</h1>
            <p className={`text-xs ${textMuted}`}>Track all system activities and changes</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchLogs} 
            className={`h-8 w-8 p-0 ${cardBg} ${borderColor} border`}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${textMuted}`} />
          </Button>
        </div>

        {error && (
          <div className="mb-3 p-2 text-sm bg-red-500/10 border border-red-500/20 rounded text-red-400">
            ❌ {error}
          </div>
        )}

        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className={`p-3 ${cardBg} border ${borderColor} rounded-lg`}>
            <p className={`text-[10px] ${textMuted}`}>Total Logs</p>
            <p className={`text-sm font-bold ${textColor}`}>{totalItems}</p>
          </div>
          <div className={`p-3 ${cardBg} border ${borderColor} rounded-lg`}>
            <p className={`text-[10px] ${textMuted}`}>Today</p>
            <p className={`text-sm font-bold text-blue-400`}>
              {logs.filter(l => l.changed_at && new Date(l.changed_at).toDateString() === new Date().toDateString()).length}
            </p>
          </div>
          <div className={`p-3 ${cardBg} border ${borderColor} rounded-lg`}>
            <p className={`text-[10px] ${textMuted}`}>This Week</p>
            <p className={`text-sm font-bold text-green-400`}>
              {logs.filter(l => {
                if (!l.changed_at) return false;
                const date = new Date(l.changed_at);
                const now = new Date();
                const weekAgo = new Date(now.setDate(now.getDate() - 7));
                return date >= weekAgo;
              }).length}
            </p>
          </div>
          <div className={`p-3 ${cardBg} border ${borderColor} rounded-lg`}>
            <p className={`text-[10px] ${textMuted}`}>High Impact</p>
            <p className={`text-sm font-bold text-red-400`}>
              {logs.filter(l => l.impact_level === 'HIGH').length}
            </p>
          </div>
        </div>

        <div className={`${cardBg} border ${borderColor} rounded-lg p-3 mb-4`}>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex-1 min-w-[140px] relative">
              <Search className={`absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${textMuted}`} />
              <Input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`pl-7 h-8 text-xs ${inputBg} border ${inputBorder} rounded ${inputText} ${placeholder} focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition`}
              />
            </div>

            <Select value={filterModule} onValueChange={setFilterModule}>
              <SelectTrigger className={`w-[110px] h-8 text-xs ${inputBg} border ${inputBorder} rounded ${inputText} focus:ring-2 focus:ring-blue-500`}>
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent className={cardBg}>
                <SelectItem value="All" className="text-xs">All Modules</SelectItem>
                <SelectItem value="billing" className="text-xs">Billing</SelectItem>
                <SelectItem value="vendor" className="text-xs">Vendor</SelectItem>
                <SelectItem value="auth" className="text-xs">Auth</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className={`w-[100px] h-8 text-xs ${inputBg} border ${inputBorder} rounded ${inputText} focus:ring-2 focus:ring-blue-500`}>
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent className={cardBg}>
                <SelectItem value="All" className="text-xs">All Actions</SelectItem>
                <SelectItem value="INSERT" className="text-xs">INSERT</SelectItem>
                <SelectItem value="UPDATE" className="text-xs">UPDATE</SelectItem>
                <SelectItem value="DELETE" className="text-xs">DELETE</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterImpact} onValueChange={setFilterImpact}>
              <SelectTrigger className={`w-[100px] h-8 text-xs ${inputBg} border ${inputBorder} rounded ${inputText} focus:ring-2 focus:ring-blue-500`}>
                <SelectValue placeholder="Impact" />
              </SelectTrigger>
              <SelectContent className={cardBg}>
                <SelectItem value="All" className="text-xs">All Impact</SelectItem>
                <SelectItem value="LOW" className="text-xs">LOW</SelectItem>
                <SelectItem value="MEDIUM" className="text-xs">MEDIUM</SelectItem>
                <SelectItem value="HIGH" className="text-xs">HIGH</SelectItem>
              </SelectContent>
            </Select>

            {(filterModule !== 'All' || filterAction !== 'All' || filterImpact !== 'All' || startDate || endDate || searchTerm) && (
              <button onClick={clearFilters} className={`p-1 ${textMuted} hover:text-white/80 transition`}>
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            <Button size="sm" onClick={fetchLogs} className="h-8 text-xs">
              Apply
            </Button>
          </div>
        </div>

        <div className={`${cardBg} border ${borderColor} rounded-lg overflow-hidden`}>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className={`border-b ${borderColor}`}>
                  <TableHead className={`text-[10px] py-2 ${textMuted}`}>User</TableHead>
                  <TableHead className={`text-[10px] py-2 ${textMuted}`}>Action</TableHead>
                  <TableHead className={`text-[10px] py-2 ${textMuted}`}>Module</TableHead>
                  <TableHead className={`text-[10px] py-2 ${textMuted}`}>Entity</TableHead>
                  <TableHead className={`text-[10px] py-2 ${textMuted}`}>Impact</TableHead>
                  <TableHead className={`text-[10px] py-2 ${textMuted}`}>Time</TableHead>
                  <TableHead className={`text-[10px] py-2 ${textMuted}`}>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className={`text-center py-6 text-sm ${textMuted}`}>
                      No audit logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log, index) => (
                    <>
                      <TableRow key={index} className={`${hoverBg} transition-colors border-b ${borderColor}`}>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-6 h-6 rounded-full ${isDark ? 'bg-white/5' : 'bg-gray-100'} flex items-center justify-center text-[10px] font-medium ${textColor}`}>
                              {log.username?.charAt(0) || 'U'}
                            </div>
                            <span className={`text-xs ${textColor}`}>{log.username}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 border-0 ${getActionBadge(log.action_type)}`}>
                            {log.action_type}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-xs ${textMuted} py-2`}>{log.module_name}</TableCell>
                        <TableCell className={`text-xs ${textMuted} py-2`}>
                          {log.table_name} #{log.record_id}
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-1">
                            {getImpactIcon(log.impact_level)}
                            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 border-0 ${getImpactBadge(log.impact_level)}`}>
                              {log.impact_level}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className={`text-xs ${textMuted} py-2`}>
                          {log.changed_at ? new Date(log.changed_at).toLocaleString() : '-'}
                        </TableCell>
                        <TableCell className="py-2">
                          <button
                            onClick={() => toggleExpand(index)}
                            className={`text-xs ${textMuted} hover:text-white/80 transition`}
                          >
                            {expandedRow === index ? 'Hide' : 'View'}
                          </button>
                        </TableCell>
                      </TableRow>
                      {expandedRow === index && log.changes && log.changes.length > 0 && (
                        <TableRow className={`${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                          <TableCell colSpan={7} className="py-2 px-4">
                            <div className="space-y-1">
                              <p className={`text-[10px] font-medium ${textMuted}`}>Changes:</p>
                              {log.changes.map((change: any, idx: number) => (
                                <div key={idx} className={`p-2 ${isDark ? 'bg-white/5' : 'bg-white'} border ${borderColor} rounded text-xs`}>
                                  <p className={`font-medium ${textColor}`}>{change.column}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded text-[10px]">
                                      {change.old || 'NULL'}
                                    </span>
                                    <span className={textMuted}>→</span>
                                    <span className="text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded text-[10px]">
                                      {change.new || 'NULL'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className={`flex items-center justify-between px-4 py-2 border-t ${borderColor}`}>
              <span className={`text-[10px] ${textMuted}`}>
                {startIndex + 1}-{endIndex} of {totalItems}
              </span>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1}
                  className={`p-1 rounded ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'} disabled:opacity-30 transition`}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {getPageNumbers().map((page, index) => (
                  typeof page === 'number' ? (
                    <button
                      key={index}
                      onClick={() => goToPage(page)}
                      className={`px-2.5 py-0.5 text-[10px] rounded transition ${
                        currentPage === page
                          ? 'bg-blue-500 text-white'
                          : `${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'} ${textMuted}`
                      }`}
                    >
                      {page}
                    </button>
                  ) : (
                    <span key={index} className={`px-1 text-[10px] ${textMuted}`}>…</span>
                  )
                ))}
                <button
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className={`p-1 rounded ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'} disabled:opacity-30 transition`}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
