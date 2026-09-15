'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/providers/ThemeProvider';
import { 
  Mail, Send, Eye, Search, RefreshCw, 
  CheckCircle, Clock, AlertCircle, Sparkles
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { API_URL } from '@/lib/api';

export default function EmailCenterPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [invoiceId, setInvoiceId] = useState('');
  const [invoice, setInvoice] = useState<any>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<number | null>(null);
  const [remarks, setRemarks] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const bgColor = isDark ? 'bg-[#0b0e1a]' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-[#131726]' : 'bg-white';
  const borderColor = isDark ? 'border-white/5' : 'border-gray-200';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const inputBg = isDark ? 'bg-white/5' : 'bg-gray-50';
  const inputBorder = isDark ? 'border-white/10' : 'border-gray-200';
  const inputText = isDark ? 'text-white' : 'text-gray-800';
  const placeholder = isDark ? 'placeholder-white/20' : 'placeholder-gray-400';

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
        setEmailLogs(data || []);
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
    setSuccess('');

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
      setSuccess(data.message || 'Email sent successfully!');
      
      fetchEmailLogs(invoiceId);
      setIsPreviewOpen(false);
      
      setTimeout(() => setSuccess(''), 5000);
      
    } catch (err: any) {
      setError(err.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'sent': 'bg-green-500/20 text-green-400',
      'pending': 'bg-yellow-500/20 text-yellow-400',
      'failed': 'bg-red-500/20 text-red-400',
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400';
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'sent': return <CheckCircle className="h-3.5 w-3.5 text-green-400" />;
      case 'pending': return <Clock className="h-3.5 w-3.5 text-yellow-400" />;
      case 'failed': return <AlertCircle className="h-3.5 w-3.5 text-red-400" />;
      default: return <Clock className="h-3.5 w-3.5 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgColor} transition-colors duration-300`}>
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h1 className={`text-lg font-semibold ${textColor}`}>Email Center</h1>
            <p className={`text-xs ${textMuted}`}>Send and manage invoice emails</p>
          </div>
        </div>

        {error && (
          <div className="mb-3 p-2 text-sm bg-red-500/10 border border-red-500/20 rounded text-red-400">
            ❌ {error}
          </div>
        )}

        {success && (
          <div className="mb-3 p-2 text-sm bg-green-500/10 border border-green-500/20 rounded text-green-400">
            ✅ {success}
          </div>
        )}

        {/* Search Invoice */}
        <Card className={`${cardBg} ${borderColor} border mb-4`}>
          <CardHeader className="p-3 pb-1">
            <CardTitle className={`text-xs font-medium ${textColor}`}>Find Invoice</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Enter Invoice ID"
                value={invoiceId}
                onChange={(e) => setInvoiceId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchInvoice()}
                className={`h-8 text-xs ${inputBg} ${inputBorder} border ${inputText} ${placeholder}`}
              />
              <Button 
                size="sm" 
                onClick={fetchInvoice} 
                disabled={loadingInvoice}
                className="h-8 text-xs gap-1"
              >
                {loadingInvoice ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Search className="h-3.5 w-3.5" />
                )}
                Load
              </Button>
            </div>
          </CardContent>
        </Card>

        {invoice && (
          <>
            {/* Invoice Details */}
            <Card className={`${cardBg} ${borderColor} border mb-4`}>
              <CardHeader className="p-3 pb-1">
                <CardTitle className={`text-xs font-medium ${textColor}`}>
                  Invoice #{invoice.invoice?.invoice_no || invoiceId}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div>
                    <p className={`text-[10px] ${textMuted}`}>Client</p>
                    <p className={`text-xs font-medium ${textColor}`}>{invoice.client?.name}</p>
                  </div>
                  <div>
                    <p className={`text-[10px] ${textMuted}`}>Program</p>
                    <p className={`text-xs ${textMuted}`}>{invoice.program?.name}</p>
                  </div>
                  <div>
                    <p className={`text-[10px] ${textMuted}`}>Amount</p>
                    <p className={`text-xs font-medium ${textColor}`}>
                      ₹{invoice.invoice?.invoice_amount?.toLocaleString() || '0'}
                    </p>
                  </div>
                  <div>
                    <p className={`text-[10px] ${textMuted}`}>Status</p>
                    <Badge className="text-[10px] px-2 py-0 bg-green-500/20 text-green-400 border-0">
                      {invoice.invoice?.status || 'Active'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Email Form */}
            <Card className={`${cardBg} ${borderColor} border mb-4`}>
              <CardHeader className="p-3 pb-1">
                <div className="flex items-center justify-between">
                  <CardTitle className={`text-xs font-medium ${textColor}`}>Compose Email</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={handlePreview} 
                      disabled={previewLoading || !selectedIssue}
                      className={`h-8 text-xs gap-1 ${cardBg} ${borderColor} border`}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Preview
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={handleSend} 
                      disabled={sending || !selectedIssue}
                      className="h-8 text-xs gap-1"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Send
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 space-y-3">
                {/* Recipients */}
                <div>
                  <p className={`text-[10px] font-medium ${textMuted} mb-1`}>To</p>
                  <div className="flex flex-wrap gap-1">
                    {invoice.to && invoice.to.length > 0 ? (
                      invoice.to.map((recipient: any) => (
                        <span key={recipient.id} className={`px-2 py-0.5 text-xs ${isDark ? 'bg-blue-500/10' : 'bg-blue-50'} border border-blue-500/20 rounded text-blue-400`}>
                          {recipient.name}
                        </span>
                      ))
                    ) : (
                      <span className={`text-xs ${textMuted}`}>No recipients</span>
                    )}
                  </div>
                </div>

                <div>
                  <p className={`text-[10px] font-medium ${textMuted} mb-1`}>CC</p>
                  <div className="flex flex-wrap gap-1">
                    {invoice.cc && invoice.cc.length > 0 ? (
                      invoice.cc.map((recipient: any) => (
                        <span key={recipient.id} className={`px-2 py-0.5 text-xs ${isDark ? 'bg-gray-500/10' : 'bg-gray-50'} border border-gray-500/20 rounded text-gray-400`}>
                          {recipient.name}
                        </span>
                      ))
                    ) : (
                      <span className={`text-xs ${textMuted}`}>No CC</span>
                    )}
                  </div>
                </div>

                {/* Issue Type - Fixed dropdown */}
                <div>
                  <label className={`text-[10px] font-medium ${textMuted} mb-1 block`}>Issue Type</label>
                  <Select 
                    value={selectedIssue?.toString()} 
                    onValueChange={(v) => setSelectedIssue(parseInt(v))}
                  >
                    <SelectTrigger className={`h-8 text-xs ${inputBg} ${inputBorder} border ${inputText}`}>
                      <SelectValue placeholder="Select issue type" />
                    </SelectTrigger>
                    <SelectContent className={cardBg}>
                      {invoice.issue_types && invoice.issue_types.map((issue: any) => (
                        <SelectItem key={issue.id} value={issue.id.toString()} className="text-xs">
                          {issue.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Remarks */}
                <div>
                  <label className={`text-[10px] font-medium ${textMuted} mb-1 block`}>Remarks</label>
                  <Textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter remarks..."
                    className={`h-16 text-xs ${inputBg} ${inputBorder} border ${inputText} ${placeholder} resize-none`}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Email Logs */}
            {emailLogs.length > 0 && (
              <Card className={`${cardBg} ${borderColor} border`}>
                <CardHeader className="p-3 pb-1">
                  <CardTitle className={`text-xs font-medium ${textColor} flex items-center gap-2`}>
                    <Mail className="h-3.5 w-3.5" />
                    Email History
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  <div className="space-y-1.5">
                    {emailLogs.map((log, idx) => (
                      <div key={idx} className={`flex items-center justify-between p-2 ${isDark ? 'bg-white/5' : 'bg-gray-50'} border ${borderColor} rounded`}>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(log.status)}
                          <div>
                            <p className={`text-xs ${textColor}`}>{log.recipient}</p>
                            <p className={`text-[10px] ${textMuted}`}>
                              {log.sent_at ? new Date(log.sent_at).toLocaleString() : 'N/A'}
                            </p>
                          </div>
                        </div>
                        <Badge className={`text-[9px] px-1.5 py-0 border-0 ${getStatusBadge(log.status)}`}>
                          {log.status || 'pending'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {!invoice && !loadingInvoice && (
          <Card className={`${cardBg} ${borderColor} border`}>
            <CardContent className="p-8 text-center">
              <Mail className={`h-8 w-8 mx-auto ${textMuted} mb-2`} />
              <p className={`text-sm ${textMuted}`}>Enter an Invoice ID to get started</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Preview Dialog - Full size */}
      {isPreviewOpen && previewData && (
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className={`max-w-4xl max-h-[90vh] overflow-y-auto ${cardBg} ${borderColor} border p-0`}>
            <DialogHeader className="p-4 border-b border-gray-200 dark:border-white/5">
              <DialogTitle className={textColor}>Email Preview</DialogTitle>
            </DialogHeader>
            <div 
              className="p-6 preview-content"
              dangerouslySetInnerHTML={{ __html: previewData.html || '' }}
            />
            <DialogFooter className="p-4 border-t border-gray-200 dark:border-white/5">
              <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                Close
              </Button>
              <Button onClick={handleSend} disabled={sending}>
                <Send className="h-4 w-4 mr-2" />
                Send Email
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
