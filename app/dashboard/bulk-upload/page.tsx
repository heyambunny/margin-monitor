'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/providers/ThemeProvider';
import { 
  Upload, FileSpreadsheet, Check, X, AlertCircle, Download, RefreshCw, Trash2, ChevronDown, ChevronUp
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { API_URL } from '@/lib/api';

export default function BulkUploadPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [expandedErrors, setExpandedErrors] = useState(true);
  const [progress, setProgress] = useState(0);

  const bgColor = isDark ? 'bg-[#0b0e1a]' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-[#131726]' : 'bg-white';
  const borderColor = isDark ? 'border-white/5' : 'border-gray-200';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const inputBg = isDark ? 'bg-white/5' : 'bg-gray-50';
  const inputBorder = isDark ? 'border-white/10' : 'border-gray-300';
  const inputText = isDark ? 'text-white' : 'text-gray-800';
  const placeholder = isDark ? 'placeholder-white/20' : 'placeholder-gray-400';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      if (!validTypes.includes(selectedFile.type)) {
        setError('Please upload a CSV or Excel file');
        return;
      }
      setFile(selectedFile);
      setError('');
      setResult(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      if (!validTypes.includes(droppedFile.type)) {
        setError('Please upload a CSV or Excel file');
        return;
      }
      setFile(droppedFile);
      setError('');
      setResult(null);
    }
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
  };

  const downloadSample = () => {
    const headers = [
      'Client', 'Program', 'Category', 'InvoiceMonth', 'InvoiceDescription',
      'ClientBilledAmount', 'Projection Added By', 'Vendor1Name', 'Vendor1Amount',
      'Vendor2Name', 'Vendor2Amount', 'Vendor3Name', 'Vendor3Amount'
    ];
    
    const sampleRow = [
      'V-Guard', 'Loyalty', 'Reward', 'Apr-26', 'Campaign Launch',
      '50000', 'Himanshu', 'Vendor A', '20000', 'Vendor B', '15000', '', ''
    ];
    
    const csv = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_upload_sample.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const totalProcessed = (result?.inserted || 0) + (result?.failed || 0);

  return (
    <div className={`min-h-screen ${bgColor} transition-colors duration-300`}>
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h1 className={`text-lg font-semibold ${textColor}`}>Bulk Upload</h1>
            <p className={`text-xs ${textMuted}`}>Upload multiple projections via Excel/CSV</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={downloadSample}
            className={`h-8 gap-1.5 ${cardBg} ${borderColor} border`}
          >
            <Download className="h-3.5 w-3.5" />
            Sample
          </Button>
        </div>

        {error && (
          <div className="mb-3 p-2 text-sm bg-red-500/10 border border-red-500/20 rounded text-red-400">
            ❌ {error}
          </div>
        )}

        {/* Upload Area */}
        <Card className={`${cardBg} ${borderColor} border`}>
          <CardHeader className="p-3 pb-1">
            <CardTitle className={`text-xs font-medium ${textColor}`}>Upload File</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive ? 'border-blue-500 bg-blue-500/10' : borderColor
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="flex flex-col items-center">
                  <FileSpreadsheet className={`h-8 w-8 text-green-500 mb-2`} />
                  <p className={`text-sm font-medium ${textColor}`}>{file.name}</p>
                  <p className={`text-xs ${textMuted}`}>
                    {(file.size / 1024).toFixed(1)} KB · {file.type || 'Unknown type'}
                  </p>
                  <button
                    onClick={handleClear}
                    className="mt-2 text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </button>
                </div>
              ) : (
                <>
                  <Upload className={`h-8 w-8 mx-auto ${textMuted} mb-2`} />
                  <p className={`text-sm ${textColor}`}>Drop your file here</p>
                  <p className={`text-xs ${textMuted}`}>or click to browse</p>
                  <p className={`text-[10px] ${textMuted} mt-1`}>CSV, Excel (.xlsx, .xls)</p>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-block mt-3 px-3 py-1 text-xs bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600 transition-colors"
                  >
                    Choose File
                  </label>
                </>
              )}
            </div>

            {file && (
              <div className="mt-3">
                {uploading && progress > 0 && (
                  <div className="mb-2">
                    <Progress value={progress} className="h-1.5" />
                    <p className={`text-[10px] ${textMuted} mt-1`}>{progress}%</p>
                  </div>
                )}
                <Button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="w-full h-8 text-xs gap-1.5"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />
                      Upload File
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <Card className={`${cardBg} ${borderColor} border mt-4`}>
            <CardHeader className="p-3 pb-1">
              <CardTitle className={`text-xs font-medium ${textColor}`}>Upload Results</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className={`p-2 ${isDark ? 'bg-green-500/10' : 'bg-green-50'} border border-green-500/20 rounded text-center`}>
                  <p className={`text-[10px] ${textMuted}`}>Inserted</p>
                  <p className={`text-sm font-bold text-green-500`}>{result.inserted || 0}</p>
                </div>
                <div className={`p-2 ${isDark ? 'bg-red-500/10' : 'bg-red-50'} border border-red-500/20 rounded text-center`}>
                  <p className={`text-[10px] ${textMuted}`}>Failed</p>
                  <p className={`text-sm font-bold text-red-500`}>{result.failed || 0}</p>
                </div>
                <div className={`p-2 ${isDark ? 'bg-blue-500/10' : 'bg-blue-50'} border border-blue-500/20 rounded text-center`}>
                  <p className={`text-[10px] ${textMuted}`}>Total</p>
                  <p className={`text-sm font-bold text-blue-500`}>{totalProcessed}</p>
                </div>
              </div>

              {result.errors && result.errors.length > 0 && (
                <div>
                  <button
                    onClick={() => setExpandedErrors(!expandedErrors)}
                    className="flex items-center justify-between w-full text-left p-2 bg-red-500/10 border border-red-500/20 rounded text-xs"
                  >
                    <span className="text-red-400 font-medium">
                      {result.errors.length} error{result.errors.length > 1 ? 's' : ''}
                    </span>
                    {expandedErrors ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                  {expandedErrors && (
                    <div className="mt-1 max-h-[150px] overflow-y-auto space-y-0.5">
                      {result.errors.map((err: string, idx: number) => {
                        const match = err.match(/Row (\d+): (.+)/);
                        const rowNum = match ? match[1] : '';
                        const errorMsg = match ? match[2] : err;
                        return (
                          <div key={idx} className={`p-1.5 text-xs ${isDark ? 'bg-red-500/5' : 'bg-red-50'} border border-red-500/10 rounded flex items-start gap-1`}>
                            <X className="h-3 w-3 text-red-400 mt-0.5 flex-shrink-0" />
                            {rowNum && <span className="font-medium text-red-400">Row {rowNum}:</span>}
                            <span className="text-red-400/80">{errorMsg}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {result.errors && result.errors.length === 0 && result.inserted > 0 && (
                <div className="flex items-center gap-2 text-green-400 text-xs">
                  <Check className="h-4 w-4" />
                  All {result.inserted} records uploaded successfully!
                </div>
              )}

              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleClear} 
                className={`mt-3 h-7 text-xs ${cardBg} ${borderColor} border`}
              >
                Upload Another
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
