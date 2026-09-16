'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/providers/ThemeProvider';
import { Search, X, RefreshCw, ChevronLeft, ChevronRight, FileText, DollarSign, TrendingUp, BarChart3, Download } from 'lucide-react';
import { API_URL } from '@/lib/api';

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
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalMargin: 0,
    avgMargin: 0,
    totalRecords: 0,
  });

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
      
      // Calculate stats
      const totalRevenue = reportsData.reduce((sum: number, r: any) => sum + (r.client_billed_amount || 0), 0);
      const totalMargin = reportsData.reduce((sum: number, r: any) => sum + (r.gross_margin || 0), 0);
      const avgMargin = reportsData.length > 0 ? (totalMargin / reportsData.length) : 0;
      
      setStats({
        totalRevenue,
        totalMargin,
        avgMargin,
        totalRecords: reportsData.length,
      });
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
        r.client_name?.toLowerCase().includes(term) ||
        r.program_name?.toLowerCase().includes(term) ||
        r.invoice_no?.toLowerCase().includes(term)
      );
    }
    
    if (filterClient) {
      filtered = filtered.filter(r => r.client_name === filterClient);
    }
    
    if (filterType) {
      filtered = filtered.filter(r => r.expense_type === filterType);
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

  const exportCSV = () => {
    if (filteredReports.length === 0) return;
    
    const headers = ['Client', 'Program', 'Category', 'Amount', 'Month', 'Vendor Cost', 'Margin', 'Type', 'Status'];
    const rows = filteredReports.map(r => [
      r.client_name || '',
      r.program_name || '',
      r.category_name || '',
      r.client_billed_amount || 0,
      r.invoice_month || '',
      r.total_vendor || 0,
      r.gross_margin || 0,
      r.expense_type || '',
      r.status || 'Active'
    ]);
    
    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
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

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-2xl font-semibold ${textMain}`}>Reports</h1>
            <p className={`text-sm ${textMuted}`}>View and analyze billing reports</p>
          </div>
          <button
            onClick={exportCSV}
            disabled={filteredReports.length === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition ${
              filteredReports.length === 0 
                ? 'opacity-50 cursor-not-allowed' 
                : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
            }`}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className={`p-3 ${isDark ? 'bg-white/5' : 'bg-gray-50'} rounded-lg border ${borderLight}`}>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-blue-400" />
            <span className={`text-xs ${textMuted}`}>Revenue</span>
          </div>
          <p className={`text-base font-semibold ${textMain}`}>{formatCurrency(stats.totalRevenue)}</p>
        </div>
        <div className={`p-3 ${isDark ? 'bg-white/5' : 'bg-gray-50'} rounded-lg border ${borderLight}`}>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-400" />
            <span className={`text-xs ${textMuted}`}>Margin</span>
          </div>
          <p className={`text-base font-semibold ${textMain}`}>{formatCurrency(stats.totalMargin)}</p>
        </div>
        <div className={`p-3 ${isDark ? 'bg-white/5' : 'bg-gray-50'} rounded-lg border ${borderLight}`}>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-purple-400" />
            <span className={`text-xs ${textMuted}`}>Avg Margin</span>
          </div>
          <p className={`text-base font-semibold ${textMain}`}>
            {stats.totalRevenue > 0 ? ((stats.totalMargin / stats.totalRevenue) * 100).toFixed(1) : 0}%
          </p>
        </div>
        <div className={`p-3 ${isDark ? 'bg-white/5' : 'bg-gray-50'} rounded-lg border ${borderLight}`}>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-yellow-400" />
            <span className={`text-xs ${textMuted}`}>Records</span>
          </div>
          <p className={`text-base font-semibold ${textMain}`}>{stats.totalRecords}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className={`${bgCard} ${cardBorder} border rounded-lg p-3 mb-6`}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[180px] relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${textMuted}`} />
            <input
              type="text"
              placeholder="Search by client, program..."
              className={`w-full pl-9 pr-3 py-1.5 text-sm ${inputBg} ${inputBorder} border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${inputText} ${placeholder}`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className={`px-3 py-1.5 text-sm ${inputBg} ${inputBorder} border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${inputText}`}
            style={{ colorScheme: isDark ? 'dark' : 'light' }}
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
          >
            <option value="">All Clients</option>
            {clients.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            className={`px-3 py-1.5 text-sm ${inputBg} ${inputBorder} border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${inputText}`}
            style={{ colorScheme: isDark ? 'dark' : 'light' }}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="Billed">Billed</option>
            <option value="Projected">Projected</option>
          </select>

          {(searchTerm || filterClient || filterType) && (
            <button onClick={clearFilters} className={`p-1.5 ${textMuted} hover:text-white/80 transition`}>
              <X className="h-4 w-4" />
            </button>
          )}

          <button
            onClick={fetchData}
            className={`p-1.5 ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'} rounded-lg transition ${textMuted}`}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className={`${bgCard} ${cardBorder} border rounded-lg overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b ${borderLight}`}>
                <th className={`px-3 py-2 text-left text-xs font-medium ${tableHeader}`}>Client</th>
                <th className={`px-3 py-2 text-left text-xs font-medium ${tableHeader}`}>Program</th>
                <th className={`px-3 py-2 text-left text-xs font-medium ${tableHeader}`}>Category</th>
                <th className={`px-3 py-2 text-left text-xs font-medium ${tableHeader}`}>Amount</th>
                <th className={`px-3 py-2 text-left text-xs font-medium ${tableHeader}`}>Margin</th>
                <th className={`px-3 py-2 text-left text-xs font-medium ${tableHeader}`}>Month</th>
                <th className={`px-3 py-2 text-left text-xs font-medium ${tableHeader}`}>Type</th>
                <th className={`px-3 py-2 text-left text-xs font-medium ${tableHeader}`}>Status</th>
              </tr>
            </thead>
            <tbody>
              {currentReports.length === 0 ? (
                <tr>
                  <td colSpan={8} className={`px-4 py-6 text-center ${textMuted} text-sm`}>
                    No reports found
                  </td>
                </tr>
              ) : (
                currentReports.map((r, idx) => (
                  <tr key={idx} className={`${hoverBg} transition-colors`}>
                    <td className={`px-3 py-2 text-xs ${tableText}`}>{r.client_name}</td>
                    <td className={`px-3 py-2 text-xs ${tableTextMuted}`}>{r.program_name}</td>
                    <td className={`px-3 py-2 text-xs ${tableTextMuted}`}>{r.category_name}</td>
                    <td className={`px-3 py-2 text-xs font-medium ${tableText}`}>{formatCurrency(r.client_billed_amount)}</td>
                    <td className={`px-3 py-2 text-xs font-medium ${(r.gross_margin || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(r.gross_margin)}
                    </td>
                    <td className={`px-3 py-2 text-xs ${tableTextMuted}`}>{r.invoice_month}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        r.expense_type === 'Billed' 
                          ? 'bg-blue-500/20 text-blue-400' 
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {r.expense_type || 'Projected'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        r.status === 'Active' 
                          ? 'bg-green-500/20 text-green-400' 
                          : r.status === 'Billed' 
                          ? 'bg-blue-500/20 text-blue-400' 
                          : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {r.status || 'Active'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className={`px-3 py-2 border-t ${borderLight} flex items-center justify-between`}>
            <span className={`text-xs ${textMuted}`}>
              {startIndex + 1}-{Math.min(endIndex, filteredReports.length)} of {filteredReports.length}
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
                    className={`px-2.5 py-0.5 text-xs rounded transition ${
                      currentPage === page
                        ? 'bg-blue-500 text-white'
                        : `${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'} ${textMuted}`
                    }`}
                  >
                    {page}
                  </button>
                ) : (
                  <span key={index} className={`px-1 text-xs ${textMuted}`}>…</span>
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
  );
}
