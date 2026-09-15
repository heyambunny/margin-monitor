'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/providers/ThemeProvider';
import { Search, X, RefreshCw, ChevronLeft, ChevronRight, FileText, DollarSign, Building2, Calendar } from 'lucide-react';
import { API_URL } from '@/lib/api';

export default function BilledPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [bills, setBills] = useState<any[]>([]);
  const [filteredBills, setFilteredBills] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterClient, setFilterClient] = useState('');
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
  }, [bills, searchTerm, filterClient]);

  const fetchData = async () => {
    setIsFetching(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const res = await fetch(`${API_URL}/api/billed`, { headers });
      const data = await res.json();
      
      const billsData = Array.isArray(data) ? data : [];
      setBills(billsData);
      
      const uniqueClients = [...new Set(billsData.map((b: any) => b.client_name).filter(Boolean))];
      setClients(uniqueClients);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
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
        b.invoice_no?.toLowerCase().includes(term) ||
        b.id?.toString().includes(term)
      );
    }
    
    if (filterClient) {
      filtered = filtered.filter(b => b.client_name === filterClient);
    }
    
    setFilteredBills(filtered);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterClient('');
  };

  const totalPages = Math.ceil(filteredBills.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBills = filteredBills.slice(startIndex, endIndex);

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

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const totalAmount = filteredBills.reduce((sum, b) => sum + (b.amount || 0), 0);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-2xl font-semibold ${textMain}`}>Billed Invoices</h1>
            <p className={`text-sm ${textMuted}`}>View all billed invoices</p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 ${isDark ? 'bg-white/5' : 'bg-gray-100'} rounded-lg`}>
            <FileText className="h-4 w-4 text-blue-400" />
            <span className={`text-xs ${textMuted}`}>{filteredBills.length} invoices</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className={`p-3 ${isDark ? 'bg-white/5' : 'bg-gray-50'} rounded-lg border ${borderLight}`}>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-400" />
            <span className={`text-xs ${textMuted}`}>Total</span>
          </div>
          <p className={`text-base font-semibold ${textMain}`}>{filteredBills.length}</p>
        </div>
        <div className={`p-3 ${isDark ? 'bg-white/5' : 'bg-gray-50'} rounded-lg border ${borderLight}`}>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-purple-400" />
            <span className={`text-xs ${textMuted}`}>Total Amount</span>
          </div>
          <p className={`text-base font-semibold ${textMain}`}>₹{totalAmount.toLocaleString()}</p>
        </div>
        <div className={`p-3 ${isDark ? 'bg-white/5' : 'bg-gray-50'} rounded-lg border ${borderLight}`}>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-green-400" />
            <span className={`text-xs ${textMuted}`}>Clients</span>
          </div>
          <p className={`text-base font-semibold ${textMain}`}>{clients.length}</p>
        </div>
        <div className={`p-3 ${isDark ? 'bg-white/5' : 'bg-gray-50'} rounded-lg border ${borderLight}`}>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-yellow-400" />
            <span className={`text-xs ${textMuted}`}>Avg Amount</span>
          </div>
          <p className={`text-base font-semibold ${textMain}`}>
            ₹{(filteredBills.length > 0 ? (totalAmount / filteredBills.length) : 0).toFixed(0)}
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className={`${bgCard} ${cardBorder} border rounded-lg p-3 mb-6`}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[180px] relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${textMuted}`} />
            <input
              type="text"
              placeholder="Search by ID, client, invoice..."
              className={`w-full pl-9 pr-3 py-1.5 text-sm ${inputBg} ${inputBorder} border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${inputText} ${placeholder}`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className={`px-3 py-1.5 text-sm ${inputBg} ${inputBorder} border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${inputText}`}
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
          >
            <option value="">All Clients</option>
            {clients.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {(searchTerm || filterClient) && (
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
                <th className={`px-3 py-2 text-left text-xs font-medium ${tableHeader}`}>ID</th>
                <th className={`px-3 py-2 text-left text-xs font-medium ${tableHeader}`}>Invoice #</th>
                <th className={`px-3 py-2 text-left text-xs font-medium ${tableHeader}`}>Client</th>
                <th className={`px-3 py-2 text-left text-xs font-medium ${tableHeader}`}>Amount</th>
                <th className={`px-3 py-2 text-left text-xs font-medium ${tableHeader}`}>Month</th>
                <th className={`px-3 py-2 text-left text-xs font-medium ${tableHeader}`}>Date</th>
                <th className={`px-3 py-2 text-left text-xs font-medium ${tableHeader}`}>Status</th>
              </tr>
            </thead>
            <tbody>
              {currentBills.length === 0 ? (
                <tr>
                  <td colSpan={7} className={`px-4 py-6 text-center ${textMuted} text-sm`}>
                    No billed invoices found
                  </td>
                </tr>
              ) : (
                currentBills.map((b) => (
                  <tr key={b.id} className={`${hoverBg} transition-colors`}>
                    <td className={`px-3 py-2 text-xs ${tableTextMuted}`}>#{b.id}</td>
                    <td className={`px-3 py-2 text-xs ${tableText}`}>{b.invoice_no || '-'}</td>
                    <td className={`px-3 py-2 text-xs ${tableText}`}>{b.client_name}</td>
                    <td className={`px-3 py-2 text-xs font-medium ${tableText}`}>₹{b.amount?.toLocaleString()}</td>
                    <td className={`px-3 py-2 text-xs ${tableTextMuted}`}>{b.invoice_month}</td>
                    <td className={`px-3 py-2 text-xs ${tableTextMuted}`}>{b.invoice_date || '-'}</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400">
                        Billed
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
              {startIndex + 1}-{Math.min(endIndex, filteredBills.length)} of {filteredBills.length}
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
