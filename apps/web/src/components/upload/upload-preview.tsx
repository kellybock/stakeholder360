'use client';

import { cn } from '@/lib/utils';

interface ValidationDetail {
  row: number;
  field: string;
  level: 'error' | 'warning';
  message: string;
}

interface UploadPreviewProps {
  data: Record<string, string>[];
  fileName: string;
  validationResult: {
    totalRows: number;
    validRows: number;
    warningRows: number;
    errorRows: number;
    details: ValidationDetail[];
  } | null;
  isValidating: boolean;
}

export function UploadPreview({ data, fileName, validationResult, isValidating }: UploadPreviewProps) {
  if (data.length === 0) return null;

  const columns = Object.keys(data[0]);
  const previewRows = data.slice(0, 50);
  const errorRowSet = new Set(validationResult?.details.filter(d => d.level === 'error').map(d => d.row) ?? []);
  const warnRowSet = new Set(validationResult?.details.filter(d => d.level === 'warning').map(d => d.row) ?? []);

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-4 text-sm">
          <span className="font-medium">{fileName}</span>
          <span className="text-muted-foreground">{data.length} rows</span>
          <span className="text-muted-foreground">{columns.length} columns</span>
        </div>
        {isValidating && (
          <span className="flex items-center gap-2 text-xs text-primary">
            <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Validating...
          </span>
        )}
      </div>

      {/* Validation summary */}
      {validationResult && (
        <div className="flex gap-3">
          <div className="rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
            {validationResult.validRows} valid
          </div>
          {validationResult.warningRows > 0 && (
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
              {validationResult.warningRows} warnings
            </div>
          )}
          {validationResult.errorRows > 0 && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {validationResult.errorRows} errors
            </div>
          )}
        </div>
      )}

      {/* Validation errors */}
      {validationResult && validationResult.details.length > 0 && (
        <div className="max-h-40 overflow-y-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-3 py-2 text-left font-medium">Row</th>
                <th className="px-3 py-2 text-left font-medium">Field</th>
                <th className="px-3 py-2 text-left font-medium">Level</th>
                <th className="px-3 py-2 text-left font-medium">Message</th>
              </tr>
            </thead>
            <tbody>
              {validationResult.details.slice(0, 50).map((detail, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-3 py-1.5">{detail.row}</td>
                  <td className="px-3 py-1.5 font-mono">{detail.field}</td>
                  <td className="px-3 py-1.5">
                    <span className={cn(
                      'rounded px-1.5 py-0.5 text-[10px] font-medium',
                      detail.level === 'error' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    )}>
                      {detail.level}
                    </span>
                  </td>
                  <td className="px-3 py-1.5">{detail.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Data preview table */}
      <div className="max-h-96 overflow-auto rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-muted">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">#</th>
              {columns.map(col => (
                <th key={col} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, i) => (
              <tr
                key={i}
                className={cn(
                  'border-b border-border last:border-0',
                  errorRowSet.has(i + 1) && 'bg-red-50',
                  warnRowSet.has(i + 1) && !errorRowSet.has(i + 1) && 'bg-amber-50',
                )}
              >
                <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                {columns.map(col => (
                  <td key={col} className="px-3 py-1.5 max-w-48 truncate">
                    {row[col]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length > 50 && (
          <div className="border-t border-border bg-muted/50 px-3 py-2 text-center text-xs text-muted-foreground">
            Showing first 50 of {data.length} rows
          </div>
        )}
      </div>
    </div>
  );
}
