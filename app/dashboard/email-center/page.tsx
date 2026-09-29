'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { Mail, Send, Eye, Search, CheckCircle, Clock, AlertCircle, MailOpen, Inbox } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_URL } from '@/lib/api';
import { formatDateTime, formatINR } from '@/lib/format';
import {
  useUi, PageHeader, Card, Alert, Avatar, Badge, EmptyState, Modal, Field, GradientButton, GhostButton, Spinner,
  type BadgeTone,
} from '@/components/app/ui';

const STATUS_TONE: Record<string, BadgeTone> = { sent: 'green', pending: 'amber', failed: 'red' };

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'sent': return <CheckCircle className="h-4 w-4 text-emerald-400" />;
    case 'failed': return <AlertCircle className="h-4 w-4 text-red-400" />;
    default: return <Clock className="h-4 w-4 text-amber-400" />;
  }
};

export default function EmailCenterPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const ui = useUi();

  const [invoiceId, setInvoiceId] = useState('');
  const [invoice, setInvoice] = useState<any>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<number | null>(null);
  const [remarks, setRemarks] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  const fetchInvoice = async () => {
    if (!invoiceId) {
      setError('Please enter an Invoice ID');
      return;
    }

    setLoadingInvoice(true);
    setError('');
    setInvoice(null);
    setEmailLogs([]);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/email/invoice/${invoiceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to fetch invoice');
      }

      const data = await response.json();
      setInvoice(data);

      if (data.issue_types && data.issue_types.length > 0) {
        setSelectedIssue(data.issue_types[0].id);
      }

      fetchEmailLogs(invoiceId);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch invoice');
    } finally {
      setLoadingInvoice(false);
    }
  };

  const fetchEmailLogs = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/email/logs/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setEmailLogs(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch email logs:', err);
    }
  };

  const handlePreview = async () => {
    if (!invoiceId || !selectedIssue) {
      setError('Please select an issue type');
      return;
    }

    setPreviewLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/email/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          invoice_id: parseInt(invoiceId),
          issue_type_id: selectedIssue,
          remarks: remarks
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to generate preview');
      }

      const data = await response.json();
      setPreviewData(data);
      setIsPreviewOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to generate preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSend = async () => {
    if (!invoiceId || !selectedIssue) {
      setError('Please select an issue type');
      return;
    }

    setSending(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          invoice_id: parseInt(invoiceId),
          issue_type_id: selectedIssue,
          remarks: remarks
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to send email');
      }

      const data = await response.json();
      toast.success(data.message || 'Email sent successfully!');

      fetchEmailLogs(invoiceId);
      setIsPreviewOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-blue-500">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const inv = invoice?.invoice;

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        icon={Mail}
        title="Email Center"
        subtitle="Look up an invoice, then preview and send an issue email to its contacts"
        gradient="from-orange-500 to-pink-500"
      />

      {/* Find invoice */}
      <Card className="p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <Field label="Invoice ID">
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${ui.muted}`} />
                <input
                  type="number"
                  placeholder="Enter an invoice ID"
                  value={invoiceId}
                  onChange={(e) => setInvoiceId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchInvoice()}
                  className={`w-full pl-9 pr-3 py-2 text-sm ${ui.input}`}
                  autoFocus
                />
              </div>
            </Field>
          </div>
          <GradientButton onClick={fetchInvoice} disabled={loadingInvoice || !invoiceId}>
            {loadingInvoice ? <Spinner /> : <Search className="h-4 w-4" />}
            Load invoice
          </GradientButton>
        </div>
        <p className={`text-[11px] ${ui.muted} mt-2`}>Press Enter to load.</p>
      </Card>

      {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}

      {loadingInvoice && (
        <Card className="p-6 space-y-3">
          {[0, 1, 2].map(i => <div key={i} className={`h-4 rounded ${ui.subtle} animate-pulse`} style={{ width: `${90 - i * 20}%` }} />)}
        </Card>
      )}

      {invoice && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="lg:col-span-2 space-y-4">
            {/* Invoice summary */}
            <Card className="overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500" />
              <div className="p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={invoice.client?.name} size="lg" />
                  <div className="min-w-0">
                    <p className={`text-base font-semibold ${ui.text} truncate`}>{invoice.client?.name}</p>
                    <p className={`text-xs ${ui.textSoft} truncate`}>{invoice.program?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div>
                    <p className={`text-[11px] ${ui.muted}`}>Invoice</p>
                    <p className={`text-sm font-medium ${ui.text}`}>#{inv?.invoice_no || invoiceId}</p>
                  </div>
                  <div>
                    <p className={`text-[11px] ${ui.muted}`}>Amount</p>
                    <p className={`text-lg font-bold ${ui.text} tabular-nums`}>{formatINR(inv?.invoice_amount)}</p>
                  </div>
                  <Badge tone="green" dot>{inv?.status || 'Active'}</Badge>
                </div>
              </div>
            </Card>

            {/* Compose */}
            <Card className="p-5 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className={`text-sm font-semibold ${ui.text}`}>Compose email</h2>
              </div>

              <div className="space-y-3">
                <RecipientRow label="To" people={invoice.to} tone="blue" empty="No recipients mapped" />
                <RecipientRow label="CC" people={invoice.cc} tone="gray" empty="No CC" />
              </div>

              <Field label="Issue type">
                {invoice.issue_types && invoice.issue_types.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {invoice.issue_types.map((issue: any) => (
                      <button
                        key={issue.id}
                        type="button"
                        onClick={() => setSelectedIssue(issue.id)}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition ${
                          selectedIssue === issue.id
                            ? 'border-blue-500 bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/40'
                            : `${ui.border} ${ui.textSoft} ${ui.hoverBtn}`
                        }`}
                      >
                        {issue.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className={`text-xs ${ui.muted}`}>No issue types configured.</p>
                )}
              </Field>

              <Field label="Remarks" hint={`${remarks.length} chars`}>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add a note for the recipient…"
                  rows={4}
                  className={`w-full px-3 py-2 text-sm ${ui.input} resize-y`}
                />
              </Field>

              <div className={`flex items-center justify-end gap-2 pt-4 border-t ${ui.border}`}>
                <GhostButton onClick={handlePreview} disabled={previewLoading || !selectedIssue} className={`flex items-center gap-1.5 border ${ui.border}`}>
                  {previewLoading ? <Spinner /> : <Eye className="h-4 w-4" />}
                  Preview
                </GhostButton>
                <GradientButton onClick={handleSend} disabled={sending || !selectedIssue}>
                  {sending ? <Spinner /> : <Send className="h-4 w-4" />}
                  {sending ? 'Sending…' : 'Send email'}
                </GradientButton>
              </div>
            </Card>
          </div>

          {/* History */}
          <Card className="p-5 h-fit">
            <h2 className={`text-sm font-semibold ${ui.text} flex items-center gap-2 mb-4`}>
              <MailOpen className="h-4 w-4" />
              Email history
            </h2>
            {emailLogs.length === 0 ? (
              <div className="py-6">
                <EmptyState icon={Inbox} title="No emails sent yet" hint="Emails you send for this invoice show up here." />
              </div>
            ) : (
              <ol className="relative space-y-4">
                <div className={`absolute left-[7px] top-2 bottom-2 w-px ${ui.isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
                {emailLogs.map((log, idx) => (
                  <li key={idx} className="relative flex gap-3 animate-in fade-in slide-in-from-right-1 fill-mode-both" style={{ animationDelay: `${idx * 40}ms` }}>
                    <div className={`relative z-10 mt-0.5 rounded-full ${ui.card}`}><StatusIcon status={log.status} /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm ${ui.text} truncate`}>{log.recipient}</p>
                        <Badge tone={STATUS_TONE[log.status] || 'amber'}>{log.status || 'pending'}</Badge>
                      </div>
                      <p className={`text-[11px] ${ui.muted}`}>{log.sent_at ? formatDateTime(log.sent_at) : 'N/A'}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      )}

      {!invoice && !loadingInvoice && (
        <Card className="p-14">
          <EmptyState icon={Mail} title="Enter an Invoice ID to get started" hint="You'll see the recipients, pick an issue type, preview and send." />
        </Card>
      )}

      {/* Preview: rendered in a sandboxed frame so the email's own styles can't leak into the app */}
      <Modal
        open={isPreviewOpen && Boolean(previewData)}
        onClose={() => !sending && setIsPreviewOpen(false)}
        title="Email preview"
        width="max-w-4xl"
        footer={
          <>
            <GhostButton onClick={() => setIsPreviewOpen(false)} disabled={sending}>Close</GhostButton>
            <GradientButton onClick={handleSend} disabled={sending}>
              {sending ? <Spinner /> : <Send className="h-4 w-4" />}
              Send email
            </GradientButton>
          </>
        }
      >
        <iframe
          title="Email preview"
          sandbox="allow-same-origin"
          srcDoc={previewData?.html || ''}
          className="w-full h-[60vh] rounded-lg border border-gray-200 bg-white"
        />
      </Modal>
    </div>
  );
}

function RecipientRow({ label, people, tone, empty }: { label: string; people?: any[]; tone: BadgeTone; empty: string }) {
  const ui = useUi();
  const ring = tone === 'blue' ? 'bg-blue-500/10 ring-blue-500/25' : `${ui.subtle} ring-gray-500/20`;
  return (
    <div className="flex items-start gap-3">
      <span className={`w-8 pt-1 text-[11px] font-medium ${ui.muted}`}>{label}</span>
      <div className="flex flex-wrap gap-1.5 flex-1">
        {people && people.length > 0 ? (
          people.map((p: any) => (
            <span key={p.id} className={`inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full text-xs ring-1 ring-inset ${ring}`} title={p.email || p.name}>
              <Avatar name={p.name} size="sm" />
              <span className={ui.text}>{p.name}</span>
            </span>
          ))
        ) : (
          <span className={`text-xs ${ui.muted} pt-1`}>{empty}</span>
        )}
      </div>
    </div>
  );
}
