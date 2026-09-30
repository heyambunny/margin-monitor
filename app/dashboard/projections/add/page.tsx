'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { Save, Tag, Store, Building2, Briefcase, PlusCircle, CheckCircle2, Circle, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_URL } from '@/lib/api';
import { formatINR } from '@/lib/format';
import {
  useUi, PageHeader, StatGrid, Card, Alert, Field, GradientButton, GhostButton, Spinner, Avatar, Chip, Badge,
} from '@/components/app/ui';
import { VendorRows, type VendorRow } from '@/components/app/VendorRows';

const EMPTY_FORM = {
  client_id: '',
  program_id: '',
  category_id: '',
  description: '',
  amount: '',
  invoice_month: '',
  financial_year: '',
};

export default function AddProjectionPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const ui = useUi();

  const [clients, setClients] = useState<any[]>([]);
  const [allPrograms, setAllPrograms] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [vendorRows, setVendorRows] = useState<VendorRow[]>([{ vendor_id: '', amount: '' }]);

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
            fetch(`${API_URL}/api/clients`, { headers }),
            fetch(`${API_URL}/api/programs`, { headers }),
            fetch(`${API_URL}/api/categories`, { headers }),
            fetch(`${API_URL}/api/vendors`, { headers }),
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

  const selectMonth = (val: string) => {
    let fy = '';
    if (val) {
      const month = val.split('-')[0];
      const year = parseInt('20' + val.split('-')[1]);
      if (['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].includes(month)) {
        fy = `FY ${year}-${year + 1}`;
      } else {
        fy = `FY ${year - 1}-${year}`;
      }
    }
    setFormData(prev => ({ ...prev, invoice_month: val, financial_year: fy }));
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setVendorRows([{ vendor_id: '', amount: '' }]);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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
      const response = await fetch(`${API_URL}/api/projection`, {
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

      toast.success(`Projection added for ${selectedClient?.client_name ?? 'client'} · ${formatINR(payload.amount)}`);
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Failed to add projection');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedClient = clients.find((c: any) => String(c.id) === formData.client_id);
  const selectedProgram = allPrograms.find((p: any) => String(p.id) === formData.program_id);
  const selectedCategory = categories.find((c: any) => String(c.id) === formData.category_id);
  const amount = formData.amount ? parseFloat(formData.amount) || 0 : 0;
  const vendorTotal = vendorRows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);
  const margin = amount - vendorTotal;
  const marginPct = amount > 0 ? (margin / amount) * 100 : 0;

  const checklist = [
    ['Client', Boolean(formData.client_id)],
    ['Program', Boolean(formData.program_id)],
    ['Category', Boolean(formData.category_id)],
    ['Description', Boolean(formData.description.trim())],
    ['Amount', amount > 0],
    ['Invoice month', Boolean(formData.invoice_month)],
  ] as const;
  const doneCount = checklist.filter(([, ok]) => ok).length;
  const isDirty = JSON.stringify(formData) !== JSON.stringify(EMPTY_FORM) || vendorRows.some(v => v.vendor_id || v.amount);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-blue-500">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        icon={PlusCircle}
        title="Add Projection"
        subtitle="Create a new projection entry"
        actions={<Chip>{currentFinancialYear}</Chip>}
      />

      <StatGrid
        stats={[
          { label: 'Your Clients', value: clients.length, icon: Building2, color: 'blue' },
          { label: 'Mapped Programs', value: mappedPrograms.length, icon: Briefcase, color: 'purple' },
          { label: 'Categories', value: categories.length, icon: Tag, color: 'amber' },
          { label: 'Vendors', value: vendors.length, icon: Store, color: 'emerald' },
        ]}
      />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Form */}
        <div className="lg:col-span-2 space-y-4">
          {error && <Alert tone="error">{error}</Alert>}

          <Section step={1} title="Who is it for?" done={Boolean(formData.client_id && formData.program_id && formData.category_id)}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Client *">
                <select
                  className={`w-full px-3 py-2 text-sm ${ui.input}`}
                  style={ui.colorScheme}
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value, program_id: '' })}
                  required
                >
                  <option value="">Select client</option>
                  {clients.map((c: any) => (
                    <option key={c.id} value={String(c.id)}>{c.client_name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Program *" hint={formData.client_id ? `${filteredPrograms.length} available` : undefined}>
                <select
                  className={`w-full px-3 py-2 text-sm ${ui.input} disabled:opacity-50`}
                  style={ui.colorScheme}
                  value={formData.program_id}
                  onChange={(e) => setFormData({ ...formData, program_id: e.target.value })}
                  required
                  disabled={!formData.client_id}
                >
                  <option value="">{!formData.client_id ? 'Select client first' : 'Select program'}</option>
                  {filteredPrograms.map((p: any) => (
                    <option key={p.id} value={String(p.id)}>{p.program_name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Category *">
                <select
                  className={`w-full px-3 py-2 text-sm ${ui.input}`}
                  style={ui.colorScheme}
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={String(c.id)}>{c.category_name}</option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>

          <Section step={2} title="What and when?" done={Boolean(formData.description.trim() && amount > 0 && formData.invoice_month)}>
            <Field label="Description *" hint={`${formData.description.length} chars`}>
              <textarea
                className={`w-full px-3 py-2 text-sm ${ui.input} resize-y min-h-[80px]`}
                rows={3}
                placeholder="Enter invoice description…"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Amount *">
                <div className="relative">
                  <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-lg ${ui.muted}`}>₹</span>
                  <input
                    type="number"
                    step="0.01"
                    className={`w-full pl-8 pr-3 py-2 text-lg font-semibold tabular-nums ${ui.input}`}
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    min="0"
                    placeholder="0"
                  />
                </div>
              </Field>
              <Field label="Invoice Month *" hint={formData.financial_year || undefined}>
                <select
                  className={`w-full px-3 py-2.5 text-sm ${ui.input}`}
                  style={ui.colorScheme}
                  value={formData.invoice_month}
                  onChange={(e) => selectMonth(e.target.value)}
                  required
                >
                  <option value="">Select month</option>
                  {monthOptions.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Quick month picker */}
            <div className="flex flex-wrap gap-1.5">
              {monthOptions.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => selectMonth(m)}
                  className={`px-2.5 py-1 text-[11px] rounded-full border transition ${
                    formData.invoice_month === m
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 border-transparent text-white shadow shadow-blue-500/30'
                      : `${ui.border} ${ui.textSoft} ${ui.hoverBtn}`
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </Section>

          <Section step={3} title="Vendor costs" optional>
            <VendorRows
              rows={vendorRows}
              onChange={setVendorRows}
              vendors={vendors}
              amount={0 /* margin is shown in the preview card */}
              title="Vendor Expenses"
              note="Add the vendor costs associated with this projection."
            />
          </Section>
        </div>

        {/* Live summary */}
        <div className="lg:sticky lg:top-4 space-y-4">
          <Card className="overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className={`text-xs uppercase tracking-wide ${ui.muted}`}>Preview</span>
                <Badge tone="amber">Projected</Badge>
              </div>

              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={selectedClient?.client_name || '?'} size="lg" />
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${ui.text} truncate`}>{selectedClient?.client_name || 'Select a client'}</p>
                  <p className={`text-xs ${ui.textSoft} truncate`}>{selectedProgram?.program_name || 'Program'}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {selectedCategory && <Chip>{selectedCategory.category_name}</Chip>}
                {formData.invoice_month && <Chip>{formData.invoice_month}</Chip>}
                {formData.financial_year && <Chip>{formData.financial_year}</Chip>}
              </div>

              <div>
                <p className={`text-[11px] ${ui.muted}`}>Amount</p>
                <p className={`text-2xl font-bold ${ui.text} tabular-nums transition-all`}>{formatINR(amount)}</p>
              </div>

              {amount > 0 && (
                <div className="space-y-1.5 animate-in fade-in">
                  <div className="flex justify-between text-xs">
                    <span className={ui.muted}>Vendor costs</span>
                    <span className={`${ui.text} tabular-nums`}>{formatINR(vendorTotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className={ui.muted}>Estimated margin</span>
                    <span className={`font-semibold tabular-nums ${margin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatINR(margin)} ({marginPct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className={`h-1.5 rounded-full ${ui.isDark ? 'bg-white/10' : 'bg-gray-200'} overflow-hidden`}>
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${margin >= 0 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(100, Math.max(0, Math.abs(marginPct)))}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Required fields checklist */}
              <div className={`pt-3 border-t ${ui.border}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs ${ui.muted}`}>Required fields</span>
                  <span className={`text-xs font-medium ${doneCount === checklist.length ? 'text-emerald-400' : ui.textSoft}`}>
                    {doneCount}/{checklist.length}
                  </span>
                </div>
                <div className={`h-1 rounded-full ${ui.isDark ? 'bg-white/10' : 'bg-gray-200'} overflow-hidden mb-3`}>
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                    style={{ width: `${(doneCount / checklist.length) * 100}%` }}
                  />
                </div>
                <ul className="grid grid-cols-2 gap-1.5">
                  {checklist.map(([label, ok]) => (
                    <li key={label} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-emerald-400' : ui.muted}`}>
                      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                      {label}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <GhostButton onClick={resetForm} disabled={!isDirty || submitting} className="flex items-center gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Clear
                </GhostButton>
                <GradientButton type="submit" disabled={submitting || doneCount < checklist.length} className="flex-1">
                  {submitting ? <Spinner /> : <Save className="h-4 w-4" />}
                  {submitting ? 'Saving…' : 'Save'}
                </GradientButton>
              </div>
            </div>
          </Card>
        </div>

        {/* Phones: keep Save within reach while scrolling the form */}
        <div
          className={`lg:hidden fixed inset-x-0 bottom-0 z-30 px-3 pt-3 border-t backdrop-blur-md ${ui.isDark ? 'bg-[#0b0e1a]/90 border-white/10' : 'bg-white/90 border-gray-200'}`}
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
        >
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className={`text-[11px] ${ui.muted}`}>{doneCount}/{checklist.length} required · margin {amount > 0 ? `${marginPct.toFixed(1)}%` : '-'}</p>
              <p className={`text-base font-bold ${ui.text} tabular-nums truncate`}>{formatINR(amount)}</p>
            </div>
            <GradientButton type="submit" disabled={submitting || doneCount < checklist.length}>
              {submitting ? <Spinner /> : <Save className="h-4 w-4" />}
              {submitting ? 'Saving…' : 'Save'}
            </GradientButton>
          </div>
        </div>
        <div className="lg:hidden h-20" aria-hidden />
      </form>
    </div>
  );
}

function Section({ step, title, done, optional, children }: { step: number; title: string; done?: boolean; optional?: boolean; children: ReactNode }) {
  const ui = useUi();
  return (
    <Card className="p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 fill-mode-both" >
      <div className="flex items-center gap-3">
        <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
          done ? 'bg-emerald-500 text-white' : 'bg-gradient-to-br from-blue-500 to-purple-500 text-white'
        }`}>
          {done ? <CheckCircle2 className="h-4 w-4" /> : step}
        </div>
        <h2 className={`text-sm font-semibold ${ui.text}`}>{title}</h2>
        {optional && <span className={`text-[11px] ${ui.muted}`}>Optional</span>}
      </div>
      {children}
    </Card>
  );
}
