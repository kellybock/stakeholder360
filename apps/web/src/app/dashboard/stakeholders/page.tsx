'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { StakeholderTable } from '@/components/stakeholder/stakeholder-table';

const STATUSES = ['', 'Nominated', 'Active', 'Champion', 'Advocate', 'Dormant'];

type AISearchResult = {
  id: string;
  fullName: string;
  caseStatus: string | null;
  employerOrg: string | null;
  designation: string | null;
  areasOfInterest: string[];
  interactionCount: number;
  eventCount: number;
  relevanceScore: number;
};

const STATUS_COLORS: Record<string, string> = {
  Nominated: 'bg-blue-100 text-blue-700',
  Active: 'bg-green-100 text-green-700',
  Champion: 'bg-purple-100 text-purple-700',
  Advocate: 'bg-amber-100 text-amber-700',
  Dormant: 'bg-gray-100 text-gray-500',
};

export default function StakeholdersPage() {
  const [data, setData] = useState<{ data: never[]; total: number; page: number; totalPages: number }>({
    data: [], total: 0, page: 1, totalPages: 0,
  });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchMode, setSearchMode] = useState<'standard' | 'ai'>('standard');
  const [aiResults, setAiResults] = useState<AISearchResult[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (search) params.set('search', search);
    if (status) params.set('status', status);

    try {
      const res = await fetch(`/api/stakeholders?${params}`);
      const json = await res.json();
      setData(json);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    if (searchMode === 'standard') fetchData();
  }, [fetchData, searchMode]);

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  const runAISearch = useCallback(async () => {
    if (!search.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch(`/api/ai/search?q=${encodeURIComponent(search)}&limit=20`);
      const json = await res.json();
      setAiResults(json.results ?? []);
    } catch {
      setAiResults([]);
    } finally {
      setAiLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (searchMode === 'ai' && search.trim()) {
      const timer = setTimeout(runAISearch, 500);
      return () => clearTimeout(timer);
    }
    if (searchMode === 'ai' && !search.trim()) {
      setAiResults([]);
    }
  }, [search, searchMode, runAISearch]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stakeholder Directory</h1>
          <p className="text-sm text-muted-foreground">
            {data.total > 0 ? `${data.total} stakeholders across all agencies` : 'Browse, search, and manage youth stakeholder profiles'}
          </p>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-64">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" strokeWidth={2} />
            <path d="m21 21-4.35-4.35" strokeLinecap="round" strokeWidth={2} />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchMode === 'ai' ? 'AI search: e.g. "youth leaders in climate action"...' : 'Search by name, email, or organisation...'}
            className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Search mode toggle */}
        <div className="flex rounded-lg border border-border">
          <button
            onClick={() => setSearchMode('standard')}
            className={cn(
              'px-3 py-2 text-xs font-medium transition-colors',
              searchMode === 'standard' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            )}
          >
            Standard
          </button>
          <button
            onClick={() => setSearchMode('ai')}
            className={cn(
              'px-3 py-2 text-xs font-medium transition-colors',
              searchMode === 'ai' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            )}
          >
            🤖 AI Search
          </button>
        </div>

        {searchMode === 'standard' && (
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">All Statuses</option>
            {STATUSES.filter(Boolean).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
      </div>

      {/* Results */}
      <div className="rounded-xl border border-border bg-card">
        {searchMode === 'standard' ? (
          loading ? (
            <div className="flex h-64 items-center justify-center">
              <svg className="h-6 w-6 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : (
            <StakeholderTable
              data={data.data}
              total={data.total}
              page={data.page}
              totalPages={data.totalPages}
              onPageChange={setPage}
            />
          )
        ) : (
          aiLoading ? (
            <div className="flex h-64 items-center justify-center">
              <svg className="h-6 w-6 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : aiResults.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              {search.trim() ? 'No matching stakeholders found' : 'Type a query to search stakeholders using AI'}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {aiResults.map(r => (
                <Link
                  key={r.id}
                  href={`/dashboard/stakeholders/${r.id}`}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {r.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{r.fullName}</span>
                      {r.caseStatus && (
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', STATUS_COLORS[r.caseStatus] ?? 'bg-gray-100')}>
                          {r.caseStatus}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.employerOrg && `${r.designation ? r.designation + ' at ' : ''}${r.employerOrg}`}
                      {r.areasOfInterest.length > 0 && ` · ${r.areasOfInterest.slice(0, 3).join(', ')}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{r.interactionCount} interactions</span>
                    <span>{r.eventCount} events</span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      {r.relevanceScore}% match
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
