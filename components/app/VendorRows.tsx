'use client';

import { type ReactNode } from 'react';
import { Plus, Trash2, Info } from 'lucide-react';
import { formatINR } from '@/lib/format';
import { useUi } from '@/components/app/ui';

export type VendorRow = { vendor_id: string; amount: string };

// Vendor expense rows (vendor + amount) with a live margin preview against `amount`.
export function VendorRows({
  rows, onChange, vendors, amount, note, title = 'Vendor Expenses',
}: {
  rows: VendorRow[];
  onChange: (rows: VendorRow[]) => void;
  vendors: { id: number; vendor_name: string }[];
  amount: number;
  note?: ReactNode;
  title?: string;
}) {
  const ui = useUi();
  const deleteColor = ui.isDark ? 'text-gray-400 hover:text-red-400' : 'text-gray-500 hover:text-red-500';

  const update = (idx: number, patch: Partial<VendorRow>) =>
    onChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const vendorTotal = rows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  const margin = amount - vendorTotal;
  const marginPct = amount > 0 ? (margin / amount) * 100 : 0;

  return (
    <div className={`rounded-xl border ${ui.border} p-4`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-sm font-medium ${ui.text}`}>{title}</span>
        <button
          type="button"
          onClick={() => onChange([...rows, { vendor_id: '', amount: '' }])}
          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1 rounded-md transition"
        >
          <Plus className="h-3 w-3" />
          Add vendor
        </button>
      </div>
      {note && (
        <p className={`flex items-start gap-1.5 text-[11px] ${ui.muted} mb-1`}>
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          {note}
        </p>
      )}

      <div className="space-y-2 mt-3">
        {rows.map((row, idx) => (
          <div key={idx} className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <select
              className={`flex-1 min-w-0 px-2.5 py-2 text-sm ${ui.input}`}
              value={row.vendor_id}
              onChange={(e) => update(idx, { vendor_id: e.target.value })}
            >
              <option value="">Select vendor</option>
              {vendors.map((v) => (
                <option key={v.id} value={String(v.id)}>{v.vendor_name}</option>
              ))}
            </select>
            <div className="relative w-32">
              <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 text-sm ${ui.muted}`}>₹</span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                className={`w-full pl-6 pr-2 py-2 text-sm tabular-nums ${ui.input}`}
                value={row.amount}
                onChange={(e) => update(idx, { amount: e.target.value })}
              />
            </div>
            <button
              type="button"
              onClick={() => rows.length > 1 && onChange(rows.filter((_, i) => i !== idx))}
              className={`p-1.5 rounded-md ${deleteColor} transition disabled:opacity-30 disabled:pointer-events-none`}
              disabled={rows.length === 1}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {amount > 0 && (
        <div className={`mt-4 pt-3 border-t ${ui.border} space-y-2`}>
          <div className="flex items-center justify-between text-xs">
            <span className={ui.muted}>Vendor total</span>
            <span className={`${ui.text} tabular-nums`}>{formatINR(vendorTotal)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className={ui.muted}>Margin</span>
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
    </div>
  );
}
