'use client';

import { useCallback, useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface FileDropzoneProps {
  onFileParsed: (data: Record<string, string>[], fileName: string) => void;
  disabled?: boolean;
}

export function FileDropzone({ onFileParsed, disabled }: FileDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const parseFile = useCallback(async (file: File) => {
    setError(null);
    setParsing(true);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();

      if (ext === 'csv') {
        const Papa = (await import('papaparse')).default;
        const text = await file.text();
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            setParsing(false);
            if (results.errors.length > 0 && results.data.length === 0) {
              setError(`CSV parse error: ${results.errors[0].message}`);
              return;
            }
            onFileParsed(results.data as Record<string, string>[], file.name);
          },
          error: (err: Error) => {
            setParsing(false);
            setError(`CSV parse error: ${err.message}`);
          },
        });
      } else if (ext === 'xlsx' || ext === 'xls') {
        const XLSX = await import('xlsx');
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<Record<string, string>>(firstSheet, { defval: '' });
        setParsing(false);
        onFileParsed(data, file.name);
      } else {
        setParsing(false);
        setError('Unsupported file type. Please upload .csv, .xlsx, or .xls');
      }
    } catch (e) {
      setParsing(false);
      setError(`Error reading file: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }, [onFileParsed]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }, [disabled, parseFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
    if (inputRef.current) inputRef.current.value = '';
  }, [parseFile]);

  return (
    <div
      className={cn(
        'rounded-lg border-2 border-dashed p-12 text-center transition-colors',
        dragging ? 'border-primary bg-primary/5' : 'border-border',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={handleFileInput}
        disabled={disabled}
      />
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        {parsing ? (
          <svg className="h-6 w-6 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="h-6 w-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        )}
      </div>

      {parsing ? (
        <p className="text-sm font-medium text-primary">Parsing file...</p>
      ) : (
        <>
          <p className="text-sm font-medium">
            {dragging ? 'Drop your file here' : 'Click or drag a file here to upload'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Supports .csv, .xlsx, .xls files
          </p>
        </>
      )}

      {error && (
        <p className="mt-3 text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
