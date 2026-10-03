'use client';

import { useEffect, useState } from 'react';
import { HandCoins, Pencil, Trash2, Save, CalendarDays, Hash, Landmark, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_URL } from '@/lib/api';
import { formatDate, formatINR } from '@/lib/format';
import { useUi, SidePanel, Field, Alert, Badge, GradientButton, GhostButton, Spinner, type BadgeTone } from '@/components/app/ui';

export const PAYMENT_MODES = ['NEFT', 'RTGS', 'IMPS', 'Cheque', 'UPI', 'Other'];

export const PAYMENT_STATUS_TONE: Record<string, BadgeTone> = {
  Unpaid: 'red',
  'Partially Paid': 'amber',
  Paid: 'green',
  Overpaid: 'purple',
  'No Dues': 'gray',
};

export type ReceivableInvoice = {
  id: number;
  invoice_no: string;
  client_name: string;
  program_name?: string;
  invoice_date?: string | null;
  billed_amount: number;
  credit_notes: number;
  due: number;
  received: number;
  tds: number;
  outstanding: number;
  excess: number;
  payment_status: string;
};

type Payment = {
  id: number;
  payment_date: string;
  amount: number;
  tds_amount: number;
  payment_mode: string;
  reference_no: string;
  remarks: string | null;
  recorded_by: string | null;
  updated_by: string | null;
  batch_id: string | null;
  batch_invoices: number | null;
  batch_total: number | null;
};

const today = () => new Date().toISOString().split('T')[0];
const EMPTY = { payment_date: today(), amount: '', tds_amount: '', payment_mode: 'NEFT', reference_no: '', remarks: '' };

const round2 = (n: number) => Math.round(n * 100) / 100;
const TDS_RATES = [1, 2, 10];

const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

// Side panel to see an invoice's payments and record / edit / delete them.
export function PaymentPanel({
  invoice, onClose, onChanged, canEdit = true,
}: {
  invoice: ReceivableInvoice | null;
  onClose: () => void;
  onChanged: () => void;
  canEdit?: boolean;
}) {
  const ui = useUi();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  // Full: amount received is always "what's outstanding minus TDS" and
  // recalculates as TDS changes. Partial: the user types the amount.
  const [payType, setPayType] = useState<'full' | 'partial'>('full');

  const load = async (id: number) => {
    setLoadingList(true);
    try {
      const res = await fetch(`${API_URL}/api/receivables/${id}/payments`, { headers: authHeaders() });
      const data = await res.json();
      setPayments(Array.isArray(data) ? data : []);
    } finally {
      setLoadingList(false);
    }
  };

  // Fresh form for a new payment: full payment of what's outstanding, prefilled.
  const freshForm = (inv: ReceivableInvoice) => {
    const full = inv.outstanding > 0;
    setPayType(full ? 'full' : 'partial');
    setForm({ ...EMPTY, payment_date: today(), amount: full ? String(round2(inv.outstanding)) : '' });
  };

  useEffect(() => {
    if (!invoice) return;
    freshForm(invoice);
    setEditingId(null);
    setError('');
    setConfirmDelete(null);
    load(invoice.id);
  }, [invoice?.id]);

  if (!invoice) return null;

  const editing = payments.find((p) => p.id === editingId);
  // Outstanding before this entry (when editing, add the edited payment back).
  const baseOutstanding = invoice.due - invoice.received - invoice.tds + (editing ? editing.amount + editing.tds_amount : 0);
  const amount = Number(form.amount) || 0;
  const tds = Number(form.tds_amount) || 0;
  const after = baseOutstanding - amount - tds;
  const afterStatus = amount + tds <= 0 ? null : after > 0.5 ? 'Partially Paid' : after < -0.5 ? 'Overpaid' : 'Paid';

  const fullAmountFor = (tdsValue: number) => round2(Math.max(baseOutstanding - tdsValue, 0));

  const setTds = (value: string) => {
    const next = { ...form, tds_amount: value };
    if (payType === 'full') next.amount = String(fullAmountFor(Number(value) || 0));
    setForm(next);
  };

  // TDS as a % of the billed amount (net of credit notes).
  const applyTdsRate = (pct: number) => setTds(String(round2((invoice.due * pct) / 100)));

  const choosePayType = (type: 'full' | 'partial') => {
    setPayType(type);
    setForm({ ...form, amount: type === 'full' ? String(fullAmountFor(tds)) : '' });
  };

  const startEdit = (p: Payment) => {
    setPayType('partial');
    setEditingId(p.id);
    setForm({
      payment_date: p.payment_date,
      amount: String(p.amount),
      tds_amount: p.tds_amount ? String(p.tds_amount) : '',
      payment_mode: p.payment_mode,
      reference_no: p.reference_no,
      remarks: p.remarks || '',
    });
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    freshForm(invoice);
    setError('');
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (amount + tds <= 0) return setError('Enter the amount received');
    if (!form.reference_no.trim()) return setError('Reference number is required');
    setSaving(true);
    try {
      const body = JSON.stringify({ ...form, amount, tds_amount: tds, remarks: form.remarks || null });
      const res = editingId
        ? await fetch(`${API_URL}/api/payments/${editingId}`, { method: 'PUT', headers: authHeaders(), body })
        : await fetch(`${API_URL}/api/receivables/${invoice.id}/payments`, { method: 'POST', headers: authHeaders(), body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Could not save the payment');
      toast.success(editingId ? `Payment updated for ${invoice.invoice_no}` : `${formatINR(amount)} recorded against ${invoice.invoice_no}`);
      // Done with this invoice: close the panel and refresh the list behind it.
      onChanged();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/payments/${id}`, { method: 'DELETE', headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Could not delete the payment');
      toast.success('Payment deleted');
      setConfirmDelete(null);
      if (editingId === id) cancelEdit();
      await load(invoice.id);
      onChanged();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const stat = (label: string, value: string, cls = ui.text) => (
    <div className="min-w-0">
      <p className={`text-[11px] ${ui.muted}`}>{label}</p>
      <p className={`text-sm font-semibold tabular-nums truncate ${cls}`}>{value}</p>
    </div>
  );

  return (
    <SidePanel
      open
      onClose={onClose}
      avatarName={invoice.client_name}
      title={invoice.invoice_no}
      subtitle={`${invoice.client_name}${invoice.program_name ? ` · ${invoice.program_name}` : ''}`}
      badge={<Badge tone={PAYMENT_STATUS_TONE[invoice.payment_status] || 'gray'} dot>{invoice.payment_status}</Badge>}
      footer={canEdit ? (
        <>
          {editingId ? (
            <GhostButton onClick={cancelEdit} disabled={saving}>Cancel edit</GhostButton>
          ) : (
            <span className={`hidden sm:inline text-[11px] ${ui.muted}`}>Esc to close</span>
          )}
          <GradientButton type="submit" form="payment-form" variant="success" disabled={saving}>
            {saving ? <Spinner /> : editingId ? <Save className="h-4 w-4" /> : <HandCoins className="h-4 w-4" />}
            {editingId ? 'Save changes' : 'Record payment'}
          </GradientButton>
        </>
      ) : undefined}
    >
      {/* Summary */}
      <div className={`rounded-xl border ${ui.border} ${ui.subtle} p-4 space-y-3`}>
        <div className="grid grid-cols-3 gap-3">
          {stat('Billed', formatINR(invoice.billed_amount))}
          {stat('Received', formatINR(invoice.received), 'text-emerald-400')}
          {stat(invoice.excess > 0 ? 'Excess' : 'Outstanding', formatINR(invoice.excess > 0 ? invoice.excess : invoice.outstanding), invoice.excess > 0 ? 'text-purple-400' : invoice.outstanding > 0 ? 'text-amber-400' : 'text-emerald-400')}
        </div>
        {(invoice.credit_notes > 0 || invoice.tds > 0) && (
          <div className={`flex flex-wrap gap-x-4 gap-y-1 text-[11px] ${ui.muted}`}>
            {invoice.credit_notes > 0 && <span>Credit notes {formatINR(invoice.credit_notes)}</span>}
            {invoice.tds > 0 && <span>TDS {formatINR(invoice.tds)}</span>}
          </div>
        )}
        <div className={`h-1.5 rounded-full ${ui.isDark ? 'bg-white/10' : 'bg-gray-200'} overflow-hidden`}>
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700"
            style={{ width: `${invoice.due > 0 ? Math.min(100, ((invoice.received + invoice.tds) / invoice.due) * 100) : 0}%` }}
          />
        </div>
        {invoice.invoice_date && <p className={`text-[11px] ${ui.muted}`}>Invoice date {formatDate(invoice.invoice_date)}</p>}
      </div>

      {/* Record / edit form */}
      {canEdit && (
        <form id="payment-form" onSubmit={save} className={`rounded-xl border ${editingId ? 'border-blue-500/50' : ui.border} p-4 space-y-4`}>
          <div className="flex items-center justify-between">
            <h3 className={`text-sm font-semibold ${ui.text}`}>{editingId ? 'Edit payment' : 'Record a payment'}</h3>
          </div>
          {error && <Alert tone="error">{error}</Alert>}

          {/* Full / partial */}
          <div className={`grid grid-cols-2 p-1 rounded-lg ${ui.subtle} border ${ui.border}`}>
            {([['full', 'Full payment'], ['partial', 'Partial payment']] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => choosePayType(value)}
                disabled={value === 'full' && baseOutstanding <= 0}
                className={`py-1.5 text-xs font-medium rounded-md transition disabled:opacity-40 ${
                  payType === value ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow' : `${ui.muted} ${ui.hoverBtn}`
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <Field
            label="TDS deducted"
            hint={
              <span className="flex items-center gap-1">
                {TDS_RATES.map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => applyTdsRate(pct)}
                    className={`px-1.5 py-0.5 rounded border ${ui.border} ${ui.hoverBtn} text-[11px]`}
                    title={`${pct}% of ${formatINR(invoice.due)}`}
                  >
                    {pct}%
                  </button>
                ))}
                {tds > 0 && (
                  <button type="button" onClick={() => setTds('')} className="px-1.5 py-0.5 text-[11px] text-red-400">Clear</button>
                )}
              </span>
            }
          >
            <div className="relative">
              <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${ui.muted}`}>₹</span>
              <input
                type="number" step="0.01" min="0" inputMode="decimal"
                className={`w-full pl-7 pr-3 py-2 text-sm tabular-nums ${ui.input}`}
                value={form.tds_amount}
                onChange={(e) => setTds(e.target.value)}
                placeholder="0"
              />
            </div>
            {tds > 0 && invoice.due > 0 && (
              <p className={`mt-1 text-[11px] ${ui.muted}`}>{round2((tds / invoice.due) * 100)}% of {formatINR(invoice.due)}</p>
            )}
          </Field>

          <Field
            label="Amount received *"
            hint={payType === 'full' ? <span className="text-emerald-400">Outstanding − TDS, auto-filled</span> : undefined}
          >
            <div className="relative">
              <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${ui.muted}`}>₹</span>
              <input
                type="number" step="0.01" min="0" inputMode="decimal"
                className={`w-full pl-7 pr-3 py-2.5 text-base font-semibold tabular-nums ${ui.input} ${payType === 'full' ? 'ring-1 ring-emerald-500/30' : ''}`}
                value={form.amount}
                onChange={(e) => {
                  // Typing your own amount means it's a partial payment.
                  setPayType('partial');
                  setForm({ ...form, amount: e.target.value });
                }}
                placeholder="0"
              />
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Received on *" icon={CalendarDays}>
              <input
                type="date"
                max={today()}
                className={`w-full px-3 py-2 text-sm ${ui.input}`}
                style={ui.colorScheme}
                value={form.payment_date}
                onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                required
              />
            </Field>
            <Field label="Payment mode *" icon={Landmark}>
              <select
                className={`w-full px-3 py-2 text-sm ${ui.input}`}
                style={ui.colorScheme}
                value={form.payment_mode}
                onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}
              >
                {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Reference number *" icon={Hash} hint="UTR / cheque no. / transaction ID">
            <input
              className={`w-full px-3 py-2 text-sm ${ui.input}`}
              value={form.reference_no}
              onChange={(e) => setForm({ ...form, reference_no: e.target.value })}
              placeholder="e.g. UTR number"
              required
            />
          </Field>

          <Field label="Remarks">
            <textarea
              rows={2}
              className={`w-full px-3 py-2 text-sm ${ui.input} resize-y`}
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              placeholder="Optional"
            />
          </Field>

          {afterStatus && (
            <div className={`flex items-center justify-between text-xs p-2.5 rounded-lg ${ui.subtle} animate-in fade-in`}>
              <span className={ui.muted}>After this payment</span>
              <span className="flex items-center gap-2">
                <span className={`tabular-nums ${ui.text}`}>
                  {after < -0.5 ? `${formatINR(-after)} excess` : `${formatINR(Math.max(after, 0))} outstanding`}
                </span>
                <Badge tone={PAYMENT_STATUS_TONE[afterStatus]} dot>{afterStatus}</Badge>
              </span>
            </div>
          )}
          {afterStatus === 'Overpaid' && (
            <p className="text-[11px] text-purple-400">This is more than what's outstanding. That's fine if the client paid extra (for example GST on top), just double-check the amount.</p>
          )}
        </form>
      )}

      {/* History */}
      <div>
        <h3 className={`text-sm font-semibold ${ui.text} mb-2 flex items-center gap-2`}>
          <Receipt className="h-4 w-4" /> Payments received
          {loadingList && <Spinner className="h-3 w-3" />}
        </h3>
        {payments.length === 0 ? (
          <p className={`text-xs ${ui.muted} italic`}>No payments recorded yet.</p>
        ) : (
          <ol className="space-y-2">
            {payments.map((p) => (
              <li key={p.id} className={`p-3 rounded-xl border ${editingId === p.id ? 'border-blue-500/50 bg-blue-500/5' : ui.border} animate-in fade-in`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${ui.text} tabular-nums`}>
                      {formatINR(p.amount)}
                      {p.tds_amount > 0 && <span className={`ml-1.5 text-xs font-normal ${ui.muted}`}>+ {formatINR(p.tds_amount)} TDS</span>}
                    </p>
                    <p className={`text-xs ${ui.textSoft}`}>{formatDate(p.payment_date)} · {p.payment_mode} · <span className="font-mono">{p.reference_no}</span></p>
                    {p.batch_id && (p.batch_invoices ?? 0) > 1 && (
                      <p className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] text-blue-400 bg-blue-500/10">
                        Part of one transfer for {p.batch_invoices} invoices · {formatINR(p.batch_total || 0)} total
                      </p>
                    )}
                    {p.remarks && <p className={`text-xs ${ui.muted} mt-0.5`}>{p.remarks}</p>}
                    <p className={`text-[11px] ${ui.muted} mt-0.5`}>
                      Recorded by {p.recorded_by || '—'}{p.updated_by ? ` · edited by ${p.updated_by}` : ''}
                    </p>
                  </div>
                  {canEdit && (
                    confirmDelete === p.id ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => remove(p.id)} disabled={saving} className="px-2 py-1 text-xs rounded-md text-white bg-red-500 hover:bg-red-600">Delete</button>
                        <button onClick={() => setConfirmDelete(null)} className={`px-2 py-1 text-xs rounded-md ${ui.muted} ${ui.hoverBtn}`}>Keep</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button onClick={() => startEdit(p)} title="Edit" className={`p-1.5 rounded-md ${ui.muted} ${ui.hoverBtn}`}><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setConfirmDelete(p.id)} title="Delete" className="p-1.5 rounded-md text-red-400 hover:bg-red-500/10"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    )
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </SidePanel>
  );
}
