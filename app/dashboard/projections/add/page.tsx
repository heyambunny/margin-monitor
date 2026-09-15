'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/providers/ThemeProvider';
import { Plus, Trash2, Save, Tag, Store, Calendar, Building2, Briefcase, Sparkles } from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/animated-number';

export default function AddProjectionPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [clients, setClients] = useState<any[]>([]);
  const [allPrograms, setAllPrograms] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    client_id: '',
    program_id: '',
    category_id: '',
    description: '',
    amount: '',
    invoice_month: '',
    financial_year: '',
  });

  const [vendorRows, setVendorRows] = useState([{ vendor_id: '', amount: '' }]);

  const bgCard = isDark ? 'bg-[#131726]' : 'bg-white';
  const border = isDark ? 'border-white/5' : 'border-gray-200';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-white/50' : 'text-gray-500';
  const textLabel = isDark ? 'text-white/50' : 'text-gray-600';
  const inputBg = isDark ? 'bg-white/5' : 'bg-gray-50';
  const inputBorder = isDark ? 'border-white/10' : 'border-gray-300';
  const inputText = isDark ? 'text-white' : 'text-gray-800';
  const placeholder = isDark ? 'placeholder-white/20' : 'placeholder-gray-400';
  const footerBg = isDark ? 'bg-white/5' : 'bg-gray-50';

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        try {
          const token = localStorage.getItem('token');
          const headers = { Authorization: `Bearer ${token}` };
          
          const [clientsRes, programsRes, categoriesRes, vendorsRes] = await Promise.all([
            fetch('http://localhost:8000/api/clients', { headers }),
            fetch('http://localhost:8000/api/programs', { headers }),
            fetch('http://localhost:8000/api/categories', { headers }),
            fetch('http://localhost:8000/api/vendors', { headers }),
          ]);

          const clientsData = await clientsRes.json();
          const programsData = await programsRes.json();
          const categoriesData = await categoriesRes.json();
          const vendorsData = await vendorsRes.json();

          setClients(Array.isArray(clientsData) ? clientsData : []);
          setAllPrograms(Array.isArray(programsData) ? programsData : []);
          setCategories(Array.isArray(categoriesData) ? categoriesData : []);
          setVendors(Array.isArray(vendorsData) ? vendorsData : []);
        } catch (err) {
          console.error('Error fetching data:', err);
          setClients([]);
          setAllPrograms([]);
          setCategories([]);
          setVendors([]);
        }
      };
      fetchData();
    }
  }, [user]);

  const filteredPrograms = allPrograms.filter(
    (p: any) => p.client_id === parseInt(formData.client_id)
  );

  // /api/programs returns every program system-wide, not just this user's
  // clients - so the "mapped programs" stat needs its own client-side filter
  // against the (already role-scoped) client list, same idea as filteredPrograms above.
  const accessibleClientIds = new Set(clients.map((c: any) => c.id));
  const mappedPrograms = allPrograms.filter((p: any) => accessibleClientIds.has(p.client_id));

  // Financial year runs Apr-Mar, so Jan/Feb/Mar fall in the calendar year
  // AFTER the FY's start year (e.g. FY 2026-27 -> Jan-27, Feb-27, Mar-27).
  const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
  const now = new Date();
  const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const currentFinancialYear = `FY ${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`;
  const monthOptions = months.map((m, idx) => {
    const year = idx < 9 ? fyStartYear : fyStartYear + 1;
    return `${m}-${String(year).slice(-2)}`;
  });

  const addVendorRow = () => {
    setVendorRows([...vendorRows, { vendor_id: '', amount: '' }]);
  };

  const removeVendorRow = (index: number) => {
    if (vendorRows.length > 1) {
      setVendorRows(vendorRows.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setSubmitting(true);

    if (!formData.client_id || !formData.program_id || !formData.category_id || 
        !formData.description || !formData.amount || !formData.invoice_month) {
      setError('Please fill in all required fields');
      setSubmitting(false);
      return;
    }

    const payload = {
      client_id: parseInt(formData.client_id),
      program_id: parseInt(formData.program_id),
      category_id: parseInt(formData.category_id),
      description: formData.description.trim(),
      amount: parseFloat(formData.amount),
      invoice_month: formData.invoice_month,
      financial_year: formData.financial_year || currentFinancialYear,
      vendors: vendorRows
        .filter(v => v.vendor_id && v.amount && parseFloat(v.amount) > 0)
        .map(v => ({
          vendor_id: parseInt(v.vendor_id),
          amount: parseFloat(v.amount)
        }))
    };

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/projection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to add projection');
      }

      setSuccess(true);
      setFormData({
        client_id: '',
        program_id: '',
        category_id: '',
        description: '',
        amount: '',
        invoice_month: '',
        financial_year: '',
      });
      setVendorRows([{ vendor_id: '', amount: '' }]);

      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to add projection');
    } finally {
      setSubmitting(false);
    }
  };

  const totalVendor = vendorRows.reduce((sum, row) => {
    return sum + (row.amount ? parseFloat(row.amount) : 0);
  }, 0);
  const amount = formData.amount ? parseFloat(formData.amount) : 0;
  const margin = amount - totalVendor;
  const marginPercentage = amount > 0 ? (margin / amount) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-0 w-32 h-32 bg-blue-400/5 rounded-full blur-2xl" />
      </div>

      <div className="relative mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className={`text-2xl font-semibold ${textMain}`}>Add Projection</h1>
            <p className={`text-sm ${textMuted}`}>Create a new projection entry</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className={`flex items-center gap-2 px-3 py-1.5 ${isDark ? 'bg-white/5' : 'bg-gray-100'} rounded-lg`}>
              <Sparkles className="h-3.5 w-3.5 text-blue-400" />
              <span className={`text-xs ${textMuted}`}>New Entry</span>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 ${isDark ? 'bg-white/5' : 'bg-gray-100'} rounded-lg`}>
              <Calendar className="h-3.5 w-3.5 text-purple-400" />
              <span className={`text-xs ${textMuted}`}>{currentFinancialYear}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className={`relative p-3 ${isDark ? 'bg-white/5' : 'bg-gray-50'} rounded-lg border ${border}`}>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/10 rounded-lg shrink-0">
              <Building2 className="h-3.5 w-3.5 text-blue-400" />
            </div>
            <span className={`text-xs ${textMuted}`}>Your Clients</span>
          </div>
          <p className={`text-lg font-semibold ${textMain} mt-1.5`}>
            <AnimatedNumber value={clients.length} duration={800} />
          </p>
        </div>
        <div className={`relative p-3 ${isDark ? 'bg-white/5' : 'bg-gray-50'} rounded-lg border ${border}`}>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-500/10 rounded-lg shrink-0">
              <Briefcase className="h-3.5 w-3.5 text-purple-400" />
            </div>
            <span className={`text-xs ${textMuted}`}>Mapped Programs</span>
          </div>
          <p className={`text-lg font-semibold ${textMain} mt-1.5`}>
            <AnimatedNumber value={mappedPrograms.length} duration={800} />
          </p>
        </div>
        <div className={`relative p-3 ${isDark ? 'bg-white/5' : 'bg-gray-50'} rounded-lg border ${border}`}>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500/10 rounded-lg shrink-0">
              <Tag className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <span className={`text-xs ${textMuted}`}>Categories</span>
          </div>
          <p className={`text-lg font-semibold ${textMain} mt-1.5`}>
            <AnimatedNumber value={categories.length} duration={800} />
          </p>
        </div>
        <div className={`relative p-3 ${isDark ? 'bg-white/5' : 'bg-gray-50'} rounded-lg border ${border}`}>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-green-500/10 rounded-lg shrink-0">
              <Store className="h-3.5 w-3.5 text-green-400" />
            </div>
            <span className={`text-xs ${textMuted}`}>Vendors</span>
          </div>
          <p className={`text-lg font-semibold ${textMain} mt-1.5`}>
            <AnimatedNumber value={vendors.length} duration={800} />
          </p>
        </div>
      </div>

      {success && (
        <div className="relative mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
          ✅ Projection added successfully!
        </div>
      )}

      {error && (
        <div className="relative mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          ❌ {error}
        </div>
      )}

      <div className={`relative ${bgCard} ${border} border rounded-xl overflow-hidden transition-colors duration-300 shadow-xl`}>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={`block text-xs font-medium ${textLabel} mb-1`}>Client *</label>
                <select
                  className={`w-full px-3 py-2 text-sm ${inputBg} ${inputBorder} border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${inputText} appearance-none`}
                  value={formData.client_id}
                  onChange={(e) => {
                    setFormData({ ...formData, client_id: e.target.value, program_id: '' });
                  }}
                  required
                >
                  <option value="" className={isDark ? 'bg-[#131726]' : 'bg-white'}>Select Client</option>
                  {clients.map((c: any) => (
                    <option key={c.id} value={String(c.id)} className={isDark ? 'bg-[#131726]' : 'bg-white'}>{c.client_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-xs font-medium ${textLabel} mb-1`}>Program *</label>
                <select
                  className={`w-full px-3 py-2 text-sm ${inputBg} ${inputBorder} border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${inputText} appearance-none disabled:opacity-50`}
                  value={formData.program_id}
                  onChange={(e) => setFormData({ ...formData, program_id: e.target.value })}
                  required
                  disabled={!formData.client_id}
                >
                  <option value="" className={isDark ? 'bg-[#131726]' : 'bg-white'}>
                    {!formData.client_id ? 'Select client first' : 'Select Program'}
                  </option>
                  {filteredPrograms.map((p: any) => (
                    <option key={p.id} value={String(p.id)} className={isDark ? 'bg-[#131726]' : 'bg-white'}>{p.program_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-xs font-medium ${textLabel} mb-1`}>Category *</label>
                <select
                  className={`w-full px-3 py-2 text-sm ${inputBg} ${inputBorder} border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${inputText} appearance-none`}
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  required
                >
                  <option value="" className={isDark ? 'bg-[#131726]' : 'bg-white'}>Select Category</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={String(c.id)} className={isDark ? 'bg-[#131726]' : 'bg-white'}>{c.category_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={`block text-xs font-medium ${textLabel} mb-1`}>Description *</label>
              <textarea
                className={`w-full px-3 py-2 text-sm ${inputBg} ${inputBorder} border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${inputText} ${placeholder} resize-none`}
                rows={3}
                placeholder="Enter invoice description..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={`block text-xs font-medium ${textLabel} mb-1`}>Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  className={`w-full px-3 py-2 text-sm ${inputBg} ${inputBorder} border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${inputText} ${placeholder}`}
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  min="0"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className={`block text-xs font-medium ${textLabel} mb-1`}>Invoice Month *</label>
                <select
                  className={`w-full px-3 py-2 text-sm ${inputBg} ${inputBorder} border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${inputText} appearance-none`}
                  value={formData.invoice_month}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ ...formData, invoice_month: val });
                    if (val) {
                      const month = val.split('-')[0];
                      const year = parseInt('20' + val.split('-')[1]);
                      let fy;
                      if (['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].includes(month)) {
                        fy = `FY ${year}-${year + 1}`;
                      } else {
                        fy = `FY ${year - 1}-${year}`;
                      }
                      setFormData(prev => ({ ...prev, financial_year: fy }));
                    }
                  }}
                  required
                >
                  <option value="" className={isDark ? 'bg-[#131726]' : 'bg-white'}>Select Month</option>
                  {monthOptions.map((m) => (
                    <option key={m} value={m} className={isDark ? 'bg-[#131726]' : 'bg-white'}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-xs font-medium ${textLabel} mb-1`}>Financial Year</label>
                <input
                  type="text"
                  className={`w-full px-3 py-2 text-sm ${inputBg} ${inputBorder} border rounded-lg ${textMuted} cursor-not-allowed`}
                  value={formData.financial_year || 'Select month first'}
                  disabled
                />
              </div>
            </div>

            <div className={`pt-4 border-t ${border}`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className={`text-sm font-medium ${textMain}`}>Vendor Expenses</h3>
                  <p className={`text-xs ${textMuted}`}>Add vendor costs associated with this projection</p>
                </div>
                <button
                  type="button"
                  onClick={addVendorRow}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Vendor
                </button>
              </div>

              <div className="space-y-2">
                {vendorRows.map((row, idx) => (
                  <div key={idx} className={`flex items-center gap-2 p-2 ${isDark ? 'bg-white/5' : 'bg-gray-50'} ${border} border rounded-lg`}>
                    <select
                      className={`flex-1 px-3 py-1.5 text-sm ${inputBg} ${inputBorder} border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${inputText} appearance-none`}
                      value={row.vendor_id}
                      onChange={(e) => {
                        const newRows = [...vendorRows];
                        newRows[idx].vendor_id = e.target.value;
                        setVendorRows(newRows);
                      }}
                    >
                      <option value="" className={isDark ? 'bg-[#131726]' : 'bg-white'}>Select Vendor</option>
                      {vendors.map((v: any) => (
                        <option key={v.id} value={String(v.id)} className={isDark ? 'bg-[#131726]' : 'bg-white'}>{v.vendor_name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Amount"
                      className={`w-24 px-3 py-1.5 text-sm ${inputBg} ${inputBorder} border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${inputText} ${placeholder}`}
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
                      className={`p-1.5 text-gray-400 hover:text-red-400 transition disabled:opacity-30`}
                      disabled={vendorRows.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {(amount > 0 || totalVendor > 0) && (
                <div className={`mt-3 p-3 ${isDark ? 'bg-white/5' : 'bg-gray-50'} ${border} border rounded-lg`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${textMuted}`}>Estimated Margin</span>
                    <div className="text-right">
                      <span className={`text-sm font-medium ${margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ₹{margin.toFixed(2)}
                      </span>
                      <span className={`text-xs ml-2 ${marginPercentage >= 0 ? 'text-green-400/60' : 'text-red-400/60'}`}>
                        ({marginPercentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={`px-6 py-4 ${footerBg} ${border} border-t flex items-center justify-end gap-3`}>
            <button
              type="button"
              onClick={() => {
                setFormData({
                  client_id: '',
                  program_id: '',
                  category_id: '',
                  description: '',
                  amount: '',
                  invoice_month: '',
                  financial_year: '',
                });
                setVendorRows([{ vendor_id: '', amount: '' }]);
              }}
              className={`px-4 py-2 text-sm ${textMuted} hover:${isDark ? 'text-white/60' : 'text-gray-700'} transition`}
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
            >
              {submitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Projection
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
