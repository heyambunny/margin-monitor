'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/providers/ThemeProvider';
import {
  Search, X, RefreshCw, ChevronLeft, ChevronRight,
  Pencil, Save, X as XIcon, Plus, Trash2, FileText, DollarSign, Building2
} from 'lucide-react';
import { API_URL } from '@/lib/api';

export default function EditProjectionPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [projections, setProjections] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [filteredProjections, setFilteredProjections] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingData, setEditingData] = useState<any>(null);
  const [vendorRows, setVendorRows] = useState<{vendor_id: string, amount: string}[]>([{ vendor_id: '', amount: '' }]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [clients, setClients] = useState<string[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const bgCard = isDark ? 'bg-[#131726]' : 'bg-white';
  const borderLight = isDark ? 'border-white/5' : 'border-gray-200';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-white/50' : 'text-gray-500';
  const textLabel = isDark ? 'text-white/50' : 'text-gray-600';
  const inputBg = isDark ? 'bg-white/5' : 'bg-gray-50';
  const inputBorder = isDark ? 'border-white/10' : 'border-gray-300';
  const inputText = isDark ? 'text-white' : 'text-gray-800';
  const placeholder = isDark ? 'placeholder-white/20' : 'placeholder-gray-400';
  const vendorBg = isDark ? 'bg-white/5' : 'bg-gray-50';
  const vendorBorder = isDark ? 'border-white/5' : 'border-gray-200';
  const deleteColor = isDark ? 'text-gray-400 hover:text-red-400' : 'text-gray-500 hover:text-red-500';
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
  }, [projections, searchTerm, filterClient]);

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
      
      const uniqueClients = [...new Set(projectionsData.map((p: any) => p.client_name).filter(Boolean))];
      setClients(uniqueClients);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
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
        p.id?.toString().includes(term)
      );
    }
    
    if (filterClient) {
      filtered = filtered.filter(p => p.client_name === filterClient);
    }
    
    setFilteredProjections(filtered);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterClient('');
  };

  const totalPages = Math.ceil(filteredProjections.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProjections = filteredProjections.slice(startIndex, endIndex);

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

  const startEdit = (projection: any) => {
    setEditingId(projection.id);
    setEditingData({
      id: projection.id,
      description: projection.description || '',
      amount: projection.amount || 0,
    });
    setVendorRows([{ vendor_id: '', amount: '' }]);
    setError('');
    setSuccess('');
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setEditingData(null);
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

  const handleSave = async () => {
    setError('');
    setSuccess('');
    
    if (!editingData) return;
    
    try {
      const token = localStorage.getItem('token');
      const payload = {
        description: editingData.description,
        amount: parseFloat(editingData.amount),
        status: 'Active',
        vendors: vendorRows
          .filter(v => v.vendor_id && v.amount && parseFloat(v.amount) > 0)
          .map(v => ({
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
      
      setSuccess('Projection updated successfully!');
      closeDialog();
      
      // Refresh the list
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(`${API_URL}/api/projections/active`, { headers });
      const data = await res.json();
      setProjections(Array.isArray(data) ? data : []);
      
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (err: any) {
      setError(err.message || 'Failed to update projection');
    }
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
            <h1 className={`text-2xl font-semibold ${textMain}`}>Edit Projections</h1>
            <p className={`text-sm ${textMuted}`}>View and edit active projections</p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 ${isDark ? 'bg-white/5' : 'bg-gray-100'} rounded-lg`}>
            <FileText className="h-4 w-4 text-blue-400" />
            <span className={`text-xs ${textMuted}`}>{filteredProjections.length} active</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className={`p-3 ${isDark ? 'bg-white/5' : 'bg-gray-50'} rounded-lg border ${borderLight}`}>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-400" />
            <span className={`text-xs ${textMuted}`}>Active</span>
          </div>
          <p className={`text-base font-semibold ${textMain}`}>{filteredProjections.length}</p>
        </div>
        <div className={`p-3 ${isDark ? 'bg-white/5' : 'bg-gray-50'} rounded-lg border ${borderLight}`}>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-purple-400" />
            <span className={`text-xs ${textMuted}`}>Total Amount</span>
          </div>
          <p className={`text-base font-semibold ${textMain}`}>
            ₹{filteredProjections.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString()}
          </p>
        </div>
        <div className={`p-3 ${isDark ? 'bg-white/5' : 'bg-gray-50'} rounded-lg border ${borderLight}`}>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-green-400" />
            <span className={`text-xs ${textMuted}`}>Clients</span>
          </div>
          <p className={`text-base font-semibold ${textMain}`}>{clients.length}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className={`${bgCard} ${cardBorder} border rounded-lg p-3 mb-6`}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[180px] relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${textMuted}`} />
            <input
              type="text"
              placeholder="Search by ID, client, program..."
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
                <th className={`px-3 py-2 text-left text-xs font-medium ${tableHeader}`}>Client</th>
                <th className={`px-3 py-2 text-left text-xs font-medium ${tableHeader}`}>Program</th>
                <th className={`px-3 py-2 text-left text-xs font-medium ${tableHeader}`}>Amount</th>
                <th className={`px-3 py-2 text-left text-xs font-medium ${tableHeader}`}>Status</th>
                <th className={`px-3 py-2 text-left text-xs font-medium ${tableHeader}`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {currentProjections.length === 0 ? (
                <tr>
                  <td colSpan={6} className={`px-4 py-6 text-center ${textMuted} text-sm`}>
                    No active projections found
                  </td>
                </tr>
              ) : (
                currentProjections.map((p) => (
                  <tr key={p.id} className={`${hoverBg} transition-colors`}>
                    <td className={`px-3 py-2 text-xs ${tableTextMuted}`}>#{p.id}</td>
                    <td className={`px-3 py-2 text-xs ${tableText}`}>{p.client_name}</td>
                    <td className={`px-3 py-2 text-xs ${tableTextMuted}`}>{p.program_name}</td>
                    <td className={`px-3 py-2 text-xs font-medium ${tableText}`}>₹{p.amount?.toLocaleString()}</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400">
                        {p.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => startEdit(p)}
                        className="flex items-center gap-1 px-3 py-0.5 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 rounded transition"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </button>
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
              {startIndex + 1}-{Math.min(endIndex, filteredProjections.length)} of {filteredProjections.length}
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

      {/* Edit Dialog */}
      {isDialogOpen && editingData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={closeDialog}>
          <div className={`${bgCard} rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4 border ${cardBorder}`} onClick={(e) => e.stopPropagation()}>
            <div className={`px-5 py-3 border-b ${borderLight} flex items-center justify-between sticky top-0 ${bgCard} z-10`}>
              <div>
                <h2 className={`text-base font-semibold ${textMain}`}>Edit Projection #{editingId}</h2>
                <p className={`text-xs ${textMuted}`}>Update projection details</p>
              </div>
              <button onClick={closeDialog} className={`p-1 ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'} rounded transition`}>
                <XIcon className={`h-5 w-5 ${textMuted}`} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className={`block text-xs font-medium ${textLabel} mb-1`}>Description</label>
                <textarea
                  className={`w-full px-3 py-1.5 text-sm ${inputBg} ${inputBorder} border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${inputText} ${placeholder} resize-none`}
                  rows={3}
                  value={editingData.description || ''}
                  onChange={(e) => setEditingData({ ...editingData, description: e.target.value })}
                />
              </div>

              <div>
                <label className={`block text-xs font-medium ${textLabel} mb-1`}>Amount</label>
                <input
                  type="number"
                  step="0.01"
                  className={`w-full px-3 py-1.5 text-sm ${inputBg} ${inputBorder} border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${inputText} ${placeholder}`}
                  value={editingData.amount || 0}
                  onChange={(e) => setEditingData({ ...editingData, amount: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className={`p-2 ${isDark ? 'bg-white/5' : 'bg-gray-50'} rounded border ${borderLight}`}>
                <p className={`text-xs ${textMuted}`}>
                  Status: <span className="font-medium text-green-400">Active</span>
                </p>
                <p className={`text-xs ${textMuted} mt-0.5`}>Status cannot be changed from here</p>
              </div>

              <div className={`pt-3 border-t ${borderLight}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-medium ${textMain}`}>Vendor Expenses</span>
                  <button
                    type="button"
                    onClick={addVendorRow}
                    className="text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-0.5 rounded transition"
                  >
                    + Add
                  </button>
                </div>

                <div className="space-y-1.5">
                  {vendorRows.map((row, idx) => (
                    <div key={idx} className={`flex items-center gap-2 p-1.5 ${vendorBg} ${vendorBorder} border rounded`}>
                      <select
                        className={`flex-1 px-2 py-1 text-xs ${inputBg} ${inputBorder} border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${inputText}`}
                        style={{ colorScheme: isDark ? 'dark' : 'light' }}
                        value={row.vendor_id}
                        onChange={(e) => {
                          const newRows = [...vendorRows];
                          newRows[idx].vendor_id = e.target.value;
                          setVendorRows(newRows);
                        }}
                      >
                        <option value="">Select Vendor</option>
                        {vendors.map((v: any) => (
                          <option key={v.id} value={String(v.id)}>{v.vendor_name}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Amount"
                        className={`w-20 px-2 py-1 text-xs ${inputBg} ${inputBorder} border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${inputText} ${placeholder}`}
                        value={row.amount}
                        onChange={(e) => {
                          const newRows = [...vendorRows];
                          newRows[idx].amount = e.target.value;
                          setVendorRows(newRows);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeVendorRow(idx)}
                        className={`p-0.5 ${deleteColor} transition disabled:opacity-30`}
                        disabled={vendorRows.length === 1}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`flex items-center justify-end gap-2 pt-3 border-t ${borderLight}`}>
                <button
                  type="button"
                  onClick={closeDialog}
                  className={`px-4 py-1.5 text-sm ${textMuted} hover:${isDark ? 'text-white/60' : 'text-gray-700'} transition`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white text-sm font-medium rounded transition"
                >
                  <Save className="h-3.5 w-3.5" />
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
