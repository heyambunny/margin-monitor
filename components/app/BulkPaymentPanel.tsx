'use client';

import { useEffect, useState } from 'react';
import { HandCoins, CalendarDays, Hash, Landmark, Layers, CheckCircle2, AlertTriangle, Split } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_URL } from '@/lib/api';
import { formatDate, formatINR } from '@/lib/format';
import { useUi, SidePanel, Field, Alert, GradientButton, GhostButton, Spinner, Avatar } from '@/components/app/ui';
import { PAYMENT_MODES, type ReceivableInvoice } from '@/components/app/PaymentPanel';

type Row = { id: number; amount: string; tds: string; full: boolean };

const round2 = (n: number) => Math.round(n * 100) / 100;
const today = () => new Date().toISOString().split('T')[0];
const TDS_RATES = [1, 2, 10];

// One bank transfer covering several invoices: shared date / mode / reference,
// a full (editable) amount and TDS per invoice, and an optional bank amount
// that can be split across invoices oldest-first.
export function BulkPaymentPanel({
  invoices, onClose, onDone,
}: {
  invoices: (ReceivableInvoice & { invoice_date?: string | null })[];
  onClose: () => void;
  onDone: () => void;
}) {
  const ui = useUi();
  const [rows, setRows] = useState<Row[]>([]);
  const [paymentDate, setPaymentDate] = useState(today());
  const [mode, setMode] = useState('NEFT');
  const [reference, setReference] = useState('');
  const [remarks, setRemarks] = useState('');
  const [bankAmount, setBankAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Oldest invoice first - also the order a lot is distributed in.
  const ordered = [...invoices].sort((a, b) => String(a.invoice_date || '').localeCompare(String(b.invoice_date || '')) || a.id - b.id);

  useEffect(() => {
    setRows(ordered.map((inv) => ({ id: inv.id, amount: String(round2(inv.outstanding)), tds: '', full: true })));
    setError('');
  }, [invoices.map((i) => i.id).join(',')]);

  if (invoices.length === 0) return null;

  const byId = Object.fromEntries(invoices.map((i) => [i.id, i]));
  const update = (id: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  // Changing TDS on a "full" row keeps it full: amount = outstanding - TDS.
  const setRowTds = (id: number, tds: string) => {
    const r = rows.find((x) => x.id === id)!;
    update(id, { tds, ...(r.full ? { amount: String(round2(Math.max(byId[id].outstanding - (Number(tds) || 0), 0))) } : {}) });
  };

  const applyTdsRateToAll = (pct: number) =>
    setRows((rs) => rs.map((r) => {
      const inv = byId[r.id];
      const tds = round2((inv.due * pct) / 100);
      return { ...r, tds: tds ? String(tds) : '', ...(r.full ? { amount: String(round2(Math.max(inv.outstanding - tds, 0))) } : {}) };
    }));

  const clearTds = () =>
    setRows((rs) => rs.map((r) => ({ ...r, tds: '', ...(r.full ? { amount: String(round2(byId[r.id].outstanding)) } : {}) })));

  // Spread the bank amount across invoices, oldest first (each up to its
  // outstanding net of TDS). Whatever's left over lands on the last invoice.
  // Computed from the current rows (not inside a state updater, which React
  // may run twice) so the running balance is only consumed once.
  const distribute = () => {
    let left = Number(bankAmount) || 0;
    const next = rows.map((r, i) => {
      const cap = Math.max(byId[r.id].outstanding - (Number(r.tds) || 0), 0);
      const take = i === rows.length - 1 ? left : Math.min(cap, left);
      left = round2(left - take);
      return { ...r, amount: String(round2(Math.max(take, 0))), full: false };
    });
    setRows(next);
  };

  const totalAmount = round2(rows.reduce((s, r) => s + (Number(r.amount) || 0), 0));
  const totalTds = round2(rows.reduce((s, r) => s + (Number(r.tds) || 0), 0));
  const totalOutstanding = round2(invoices.reduce((s, i) => s + i.outstanding, 0));
  const bank = Number(bankAmount) || 0;
  const bankDiff = bankAmount ? round2(bank - totalAmount) : 0;
  const active = rows.filter((r) => (Number(r.amount) || 0) + (Number(r.tds) || 0) > 0);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!reference.trim()) return setError('Reference number is required');
    if (active.length === 0) return setError('Enter an amount for at least one invoice');
    if (bankAmount && Math.abs(bankDiff) > 0.5) return setError(`The amounts add up to ${formatINR(totalAmount)} but the bank amount is ${formatINR(bank)}. Adjust the rows or use Distribute.`);
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/receivables/bulk-payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({
          payment_date: paymentDate,
          payment_mode: mode,
          reference_no: reference,
          remarks: remarks || null,
          allocations: active.map((r) => ({ billing_entry_id: r.id, amount: Number(r.amount) || 0, tds_amount: Number(r.tds) || 0 })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Could not record the payment');
      toast.success(`${formatINR(data.total)} recorded against ${active.length} invoice${active.length === 1 ? '' : 's'}`);
      onDone();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SidePanel
      open
      onClose={onClose}
      width="max-w-2xl"
      title={`Record payment for ${invoices.length} invoice${invoices.length === 1 ? '' : 's'}`}
      subtitle="One bank transfer covering several invoices"
      footer={
        <>
          <span className={`text-xs ${ui.muted}`}>
            Total <span className={`font-semibold ${ui.text} tabular-nums`}>{formatINR(totalAmount)}</span>
            {totalTds > 0 && <> + {formatINR(totalTds)} TDS</>}
          </span>
          <div className="flex items-center gap-2">
            <GhostButton onClick={onClose} disabled={saving}>Cancel</GhostButton>
            <GradientButton type="submit" form="bulk-payment-form" variant="success" disabled={saving}>
              {saving ? <Spinner /> : <HandCoins className="h-4 w-4" />}
              Record payment
            </GradientButton>
          </div>
        </>
      }
    >
      <form id="bulk-payment-form" onSubmit={save} className="space-y-5">
        {error && <Alert tone="error">{error}</Alert>}

        {/* Shared details */}
        <div className={`rounded-xl border ${ui.border} p-4 space-y-4`}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Received on *" icon={CalendarDays}>
              <input type="date" max={today()} className={`w-full px-3 py-2 text-sm ${ui.input}`} style={ui.colorScheme}
                value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required />
            </Field>
            <Field label="Payment mode *" icon={Landmark}>
              <select className={`w-full px-3 py-2 text-sm ${ui.input}`} style={ui.colorScheme} value={mode} onChange={(e) => setMode(e.target.value)}>
                {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Reference number *" icon={Hash} hint="Same UTR / cheque no. for the whole lot">
            <input className={`w-full px-3 py-2 text-sm ${ui.input}`} value={reference} onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. UTR number" required autoFocus />
          </Field>
          <Field label="Bank amount received" icon={Layers} hint="Optional - checks the rows add up">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${ui.muted}`}>₹</span>
                <input type="number" step="0.01" min="0" inputMode="decimal" className={`w-full pl-7 pr-3 py-2 text-sm font-semibold tabular-nums ${ui.input}`}
                  value={bankAmount} onChange={(e) => setBankAmount(e.target.value)} placeholder={String(totalAmount)} />
              </div>
              <button type="button" onClick={distribute} disabled={!bank}
                className="flex items-center gap-1.5 px-3 text-xs rounded-lg text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 disabled:opacity-40 transition whitespace-nowrap"
                title="Split the bank amount across invoices, oldest first">
                <Split className="h-3.5 w-3.5" /> Distribute
              </button>
            </div>
            {bankAmount && (
              Math.abs(bankDiff) <= 0.5 ? (
                <p className="mt-1.5 flex items-center gap-1 text-[11px] text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" /> Matches the invoices below</p>
              ) : (
                <p className="mt-1.5 flex items-center gap-1 text-[11px] text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {bankDiff > 0 ? `${formatINR(bankDiff)} more than the rows below` : `${formatINR(-bankDiff)} less than the rows below`} - adjust or use Distribute
                </p>
              )
            )}
          </Field>
          <Field label="Remarks">
            <input className={`w-full px-3 py-2 text-sm ${ui.input}`} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional" />
          </Field>
        </div>

        {/* Per-invoice allocation */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h3 className={`text-sm font-semibold ${ui.text}`}>Invoices ({invoices.length}) · {formatINR(totalOutstanding)} outstanding</h3>
            <span className={`flex items-center gap-1 text-[11px] ${ui.muted}`}>
              TDS for all:
              {TDS_RATES.map((p) => (
                <button key={p} type="button" onClick={() => applyTdsRateToAll(p)} className={`px-1.5 py-0.5 rounded border ${ui.border} ${ui.hoverBtn}`}>{p}%</button>
              ))}
              {totalTds > 0 && <button type="button" onClick={clearTds} className="px-1.5 py-0.5 text-red-400">Clear</button>}
            </span>
          </div>
          <div className="space-y-2">
            {rows.map((r) => {
              const inv = byId[r.id];
              if (!inv) return null;
              const amt = Number(r.amount) || 0;
              const tds = Number(r.tds) || 0;
              const left = round2(inv.outstanding - amt - tds);
              return (
                <div key={r.id} className={`p-3 rounded-xl border ${ui.border} space-y-2`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={inv.client_name} size="sm" />
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${ui.text} truncate`}><span className="font-mono">{inv.invoice_no}</span></p>
                        <p className={`text-[11px] ${ui.muted} truncate`}>{inv.client_name}{inv.invoice_date ? ` · ${formatDate(inv.invoice_date)}` : ''}</p>
                      </div>
                    </div>
                    <span className={`text-xs tabular-nums whitespace-nowrap ${ui.muted}`}>Outstanding <span className="text-amber-400 font-semibold">{formatINR(inv.outstanding)}</span></span>
                  </div>
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                    <div className="relative">
                      <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 text-xs ${ui.muted}`}>₹</span>
                      <input type="number" step="0.01" min="0" inputMode="decimal" aria-label={`Amount for ${inv.invoice_no}`}
                        className={`w-full pl-6 pr-2 py-1.5 text-sm font-semibold tabular-nums ${ui.input}`}
                        value={r.amount} onChange={(e) => update(r.id, { amount: e.target.value, full: false })} placeholder="0" />
                    </div>
                    <div className="relative">
                      <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] ${ui.muted}`}>TDS</span>
                      <input type="number" step="0.01" min="0" inputMode="decimal" aria-label={`TDS for ${inv.invoice_no}`}
                        className={`w-full pl-9 pr-2 py-1.5 text-sm tabular-nums ${ui.input}`}
                        value={r.tds} onChange={(e) => setRowTds(r.id, e.target.value)} placeholder="0" />
                    </div>
                    <span className={`text-[11px] w-24 text-right tabular-nums ${left > 0.5 ? 'text-amber-400' : left < -0.5 ? 'text-purple-400' : 'text-emerald-400'}`}>
                      {amt + tds <= 0 ? 'skipped' : left > 0.5 ? `${formatINR(left)} left` : left < -0.5 ? `${formatINR(-left)} extra` : 'fully paid'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className={`mt-2 text-[11px] ${ui.muted}`}>Each invoice gets its own payment entry under the same reference. Leave an amount at 0 to skip that invoice.</p>
        </div>
      </form>
    </SidePanel>
  );
}
