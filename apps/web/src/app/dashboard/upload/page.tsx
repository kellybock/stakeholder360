'use client';

import { useState, useCallback, useEffect } from 'react';
import { FileDropzone } from '@/components/upload/file-dropzone';
import { TableSelector } from '@/components/upload/table-selector';
import { UploadPreview } from '@/components/upload/upload-preview';
import { UploadHistory } from '@/components/upload/upload-history';

interface ValidationResult {
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  details: { row: number; field: string; level: 'error' | 'warning'; message: string }[];
}

interface UploadRecord {
  id: string;
  fileName: string;
  tableTarget: string;
  rowCount: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsFailed: number;
  status: string;
  createdAt: string;
}

export default function UploadPage() {
  const [tableTarget, setTableTarget] = useState('profiles');
  const [parsedData, setParsedData] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null);
  const [history, setHistory] = useState<UploadRecord[]>([]);

  useEffect(() => {
    fetch('/api/upload/history')
      .then(r => r.json())
      .then(d => setHistory(d.history ?? []))
      .catch(() => {});
  }, []);

  const handleFileParsed = useCallback(async (data: Record<string, string>[], name: string) => {
    setParsedData(data);
    setFileName(name);
    setUploadResult(null);
    setValidationResult(null);

    if (data.length === 0) return;

    setIsValidating(true);
    try {
      const res = await fetch('/api/upload/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableTarget, rows: data }),
      });
      const result = await res.json();
      setValidationResult(result);
    } catch {
      setValidationResult(null);
    } finally {
      setIsValidating(false);
    }
  }, [tableTarget]);

  async function handleUpload() {
    if (parsedData.length === 0) return;
    setIsUploading(true);
    setUploadResult(null);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableTarget, rows: parsedData, fileName }),
      });
      const result = await res.json();

      if (res.ok) {
        setUploadResult({
          success: true,
          message: `Uploaded successfully: ${result.rowsInserted} inserted, ${result.rowsUpdated} updated${result.rowsFailed > 0 ? `, ${result.rowsFailed} failed` : ''}`,
        });
        // Refresh history
        const histRes = await fetch('/api/upload/history');
        const histData = await histRes.json();
        setHistory(histData.history ?? []);
      } else {
        setUploadResult({ success: false, message: result.error ?? 'Upload failed' });
      }
    } catch {
      setUploadResult({ success: false, message: 'Network error during upload' });
    } finally {
      setIsUploading(false);
    }
  }

  function handleReset() {
    setParsedData([]);
    setFileName('');
    setValidationResult(null);
    setUploadResult(null);
  }

  const canUpload = parsedData.length > 0 && !isValidating && !isUploading &&
    (!validationResult || validationResult.validRows > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Upload Data</h1>
        <p className="text-sm text-muted-foreground">
          Import CSV or Excel files to update stakeholder data across 8 tables
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main upload area */}
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-6">
            <TableSelector
              value={tableTarget}
              onChange={(v) => { setTableTarget(v); handleReset(); }}
              disabled={isUploading}
            />

            <div className="mt-4">
              <FileDropzone
                onFileParsed={handleFileParsed}
                disabled={isUploading}
              />
            </div>
          </div>

          {/* Preview */}
          {parsedData.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Data Preview</h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleReset}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={!canUpload}
                    className="rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {isUploading ? 'Uploading...' : 'Confirm Upload'}
                  </button>
                </div>
              </div>

              {/* Upload result */}
              {uploadResult && (
                <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${uploadResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {uploadResult.message}
                </div>
              )}

              <UploadPreview
                data={parsedData}
                fileName={fileName}
                validationResult={validationResult}
                isValidating={isValidating}
              />
            </div>
          )}
        </div>

        {/* Upload history sidebar */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Upload History</h3>
          <div className="mt-4">
            <UploadHistory history={history} />
          </div>
        </div>
      </div>
    </div>
  );
}
