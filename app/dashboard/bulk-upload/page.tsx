'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import {
  Upload, FileSpreadsheet, Check, X, Download, Trash2, ChevronDown, CheckCircle2, XCircle, Layers, CloudUpload,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { API_URL } from '@/lib/api';
import { useUi, PageHeader, Card, Alert, GradientButton, GhostButton, Spinner, Chip } from '@/components/app/ui';
import { AnimatedNumber } from '@/components/ui/animated-number';

const TEMPLATE_COLUMNS = [
  'Client', 'Program', 'Category', 'InvoiceMonth', 'InvoiceDescription',
  'ClientBilledAmount', 'Projection Added By', 'Vendor1Name', 'Vendor1Amount',
  'Vendor2Name', 'Vendor2Amount', 'Vendor3Name', 'Vendor3Amount',
];

const VALID_TYPES = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
// Some browsers report an empty or generic MIME type for .csv files, so the extension counts too.
const isSpreadsheet = (f: File) => VALID_TYPES.includes(f.type) || /\.(csv|xlsx|xls)$/i.test(f.name);

export default function BulkUploadPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const ui = useUi();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [expandedErrors, setExpandedErrors] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  const pickFile = (selected?: File | null) => {
    if (!selected) return;
    if (!isSpreadsheet(selected)) {
      setError('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
      return;
    }
    setFile(selected);
    setError('');
    setResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    pickFile(e.dataTransfer.files?.[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setError('');
    setResult(null);
    setProgress(10);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');

      setProgress(30);

      const response = await fetch(`${API_URL}/api/bulk-upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      setProgress(70);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Upload failed');
      }

      setProgress(100);
      setResult(data);
      if ((data.failed || 0) === 0) {
        toast.success(`${data.inserted || 0} projections uploaded`);
      } else {
        toast(`${data.inserted || 0} uploaded, ${data.failed} failed`, { icon: '⚠️' });
      }
      setTimeout(() => setProgress(0), 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setResult(null);
    setError('');
    setProgress(0);
    if (inputRef.current) inputRef.current.value = '';
  };

  const downloadSample = () => {
    const sampleRow = [
      'V-Guard', 'Loyalty', 'Reward', 'Apr-26', 'Campaign Launch',
      '50000', 'Himanshu', 'Vendor A', '20000', 'Vendor B', '15000', '', ''
    ];

    const csv = [TEMPLATE_COLUMNS.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_upload_sample.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const totalProcessed = (result?.inserted || 0) + (result?.failed || 0);
  const successRate = totalProcessed ? ((result?.inserted || 0) / totalProcessed) * 100 : 0;
  const step = result ? 3 : file ? 2 : 1;

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        icon={CloudUpload}
        title="Bulk Upload"
        subtitle="Upload many projections at once from a CSV or Excel file"
        gradient="from-sky-500 to-indigo-500"
        actions={
          <button
            onClick={downloadSample}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs ${ui.muted} ${ui.subtle} border ${ui.border} rounded-lg ${ui.hoverBtn} transition`}
          >
            <Download className="h-3.5 w-3.5" />
            Download template
          </button>
        }
      />

      {/* Steps */}
      <div className="flex items-center gap-2 mb-5">
        {['Choose a file', 'Upload', 'Review results'].map((label, i) => {
          const n = i + 1;
          const state = n < step ? 'done' : n === step ? 'active' : 'todo';
          return (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                state === 'done' ? 'bg-emerald-500 text-white'
                  : state === 'active' ? 'bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/30 scale-110'
                  : `${ui.subtle} ${ui.muted} border ${ui.border}`
              }`}>
                {state === 'done' ? <Check className="h-4 w-4" /> : n}
              </div>
              <span className={`text-xs whitespace-nowrap ${state === 'active' ? '' : 'hidden sm:inline'} ${state === 'todo' ? ui.muted : ui.text}`}>{label}</span>
              {n < 3 && <div className={`h-px flex-1 ${n < step ? 'bg-emerald-500' : ui.isDark ? 'bg-white/10' : 'bg-gray-200'} transition-colors`} />}
            </div>
          );
        })}
      </div>

      {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <Card className="lg:col-span-2 p-5">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => pickFile(e.target.files?.[0])}
            className="hidden"
          />
          {file ? (
            <div className="animate-in fade-in zoom-in-95 duration-200">
              <div className={`flex items-center gap-4 p-4 rounded-xl border ${ui.border} ${ui.subtle}`}>
                <div className="h-12 w-12 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                  <FileSpreadsheet className="h-6 w-6 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${ui.text} truncate`}>{file.name}</p>
                  <p className={`text-xs ${ui.muted}`}>{(file.size / 1024).toFixed(1)} KB · {file.type || 'spreadsheet'}</p>
                </div>
                {!uploading && (
                  <button onClick={handleClear} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-400 rounded-lg hover:bg-red-500/10 transition">
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                )}
              </div>

              {uploading && (
                <div className="mt-4">
                  <div className={`h-2 rounded-full ${ui.isDark ? 'bg-white/10' : 'bg-gray-200'} overflow-hidden`}>
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                  <p className={`text-[11px] ${ui.muted} mt-1.5`}>Processing rows… {progress}%</p>
                </div>
              )}

              {!result && (
                <GradientButton onClick={handleUpload} disabled={uploading} className="w-full mt-4 !py-2.5">
                  {uploading ? <Spinner /> : <Upload className="h-4 w-4" />}
                  {uploading ? 'Uploading…' : 'Upload file'}
                </GradientButton>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
              onDrop={handleDrop}
              className={`w-full border-2 border-dashed rounded-xl px-6 py-12 text-center transition-all group ${
                dragActive
                  ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
                  : `${ui.isDark ? 'border-white/10 hover:border-blue-500/50' : 'border-gray-300 hover:border-blue-400'} hover:bg-blue-500/5`
              }`}
            >
              <div className={`mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-3 transition-transform ${dragActive ? 'scale-110 -translate-y-1' : 'group-hover:-translate-y-1'}`}>
                <Upload className="h-7 w-7 text-blue-400" />
              </div>
              <p className={`text-sm font-medium ${ui.text}`}>{dragActive ? 'Drop it!' : 'Drop your file here, or click to browse'}</p>
              <p className={`text-xs ${ui.muted} mt-1`}>CSV or Excel (.csv, .xlsx, .xls)</p>
            </button>
          )}

          {/* Results */}
          {result && (
            <div className={`mt-5 pt-5 border-t ${ui.border} animate-in fade-in slide-in-from-bottom-2`}>
              <div className="flex items-center gap-5 mb-4">
                <div className="relative h-20 w-20 shrink-0">
                  <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="3" className={ui.isDark ? 'stroke-white/10' : 'stroke-gray-200'} />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none" strokeWidth="3" strokeLinecap="round"
                      className={successRate === 100 ? 'stroke-emerald-500' : 'stroke-amber-500'}
                      strokeDasharray={`${successRate} 100`}
                      style={{ transition: 'stroke-dasharray 1s ease' }}
                    />
                  </svg>
                  <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${ui.text}`}>{Math.round(successRate)}%</span>
                </div>
                <div className="grid grid-cols-3 gap-3 flex-1">
                  {[
                    { label: 'Inserted', value: result.inserted || 0, icon: CheckCircle2, cls: 'text-emerald-400 bg-emerald-500/10' },
                    { label: 'Failed', value: result.failed || 0, icon: XCircle, cls: 'text-red-400 bg-red-500/10' },
                    { label: 'Total rows', value: totalProcessed, icon: Layers, cls: 'text-blue-400 bg-blue-500/10' },
                  ].map((s) => (
                    <div key={s.label} className={`p-3 rounded-xl ${s.cls}`}>
                      <div className="flex items-center gap-1.5 text-[11px] opacity-80">
                        <s.icon className="h-3.5 w-3.5" />
                        {s.label}
                      </div>
                      <AnimatedNumber value={s.value} duration={700} className="text-xl font-bold" />
                    </div>
                  ))}
                </div>
              </div>

              {result.errors && result.errors.length > 0 && (
                <div className="rounded-xl border border-red-500/20 overflow-hidden">
                  <button
                    onClick={() => setExpandedErrors(!expandedErrors)}
                    className="flex items-center justify-between w-full text-left px-3 py-2 bg-red-500/10 text-xs"
                  >
                    <span className="text-red-400 font-medium">
                      {result.errors.length} row{result.errors.length > 1 ? 's' : ''} need attention
                    </span>
                    <ChevronDown className={`h-4 w-4 text-red-400 transition-transform ${expandedErrors ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedErrors && (
                    <div className="max-h-[220px] overflow-y-auto divide-y divide-red-500/10" style={ui.colorScheme}>
                      {result.errors.map((err: string, idx: number) => {
                        const match = err.match(/Row (\d+): (.+)/);
                        const rowNum = match ? match[1] : '';
                        const errorMsg = match ? match[2] : err;
                        return (
                          <div key={idx} className="px-3 py-2 text-xs flex items-start gap-2 animate-in fade-in">
                            <X className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                            {rowNum && <span className="font-mono font-medium text-red-400 shrink-0">Row {rowNum}</span>}
                            <span className={ui.textSoft}>{errorMsg}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {result.errors && result.errors.length === 0 && result.inserted > 0 && (
                <Alert tone="success">All {result.inserted} records uploaded successfully!</Alert>
              )}

              <GhostButton onClick={handleClear} className={`mt-4 border ${ui.border}`}>Upload another file</GhostButton>
            </div>
          )}
        </Card>

        {/* Template help */}
        <Card className="p-5 h-fit">
          <h2 className={`text-sm font-semibold ${ui.text} mb-1`}>File format</h2>
          <p className={`text-xs ${ui.muted} mb-3`}>
            One projection per row, with these column headers. Vendor columns are optional.
          </p>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {TEMPLATE_COLUMNS.map((c) => <Chip key={c}>{c}</Chip>)}
          </div>
          <p className={`text-xs ${ui.muted} mb-3`}>
            <span className={ui.text}>InvoiceMonth</span> uses the <span className="font-mono">Mmm-YY</span> format, e.g. <span className="font-mono">Apr-26</span>.
          </p>
          <button
            onClick={downloadSample}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition"
          >
            <Download className="h-3.5 w-3.5" />
            Download sample CSV
          </button>
        </Card>
      </div>
    </div>
  );
}
