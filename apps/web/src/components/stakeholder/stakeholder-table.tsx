'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

interface StakeholderRow {
  id: string;
  nricMasked: string;
  fullName: string;
  caseStatus: string | null;
  email: string | null;
  employerOrg: string | null;
  crossAgencyCount: number;
  agencies: string[];
  lastContactDate: string | null;
  interactionCount: number;
  eventCount: number;
}

interface StakeholderTableProps {
  data: StakeholderRow[];
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const STATUS_COLORS: Record<string, string> = {
  Nominated: 'bg-blue-100 text-blue-700',
  Active: 'bg-green-100 text-green-700',
  Champion: 'bg-purple-100 text-purple-700',
  Advocate: 'bg-amber-100 text-amber-700',
  Dormant: 'bg-gray-100 text-gray-500',
};

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function ContactIndicator({ date }: { date: string | null }) {
  const days = daysSince(date);
  if (days === null) return <span className="text-xs text-muted-foreground">No contact</span>;

  let color = 'bg-green-500';
  if (days > 120) color = 'bg-red-500';
  else if (days > 60) color = 'bg-amber-500';

  return (
    <div className="flex items-center gap-2">
      <span className={cn('h-2 w-2 rounded-full', color)} />
      <span className="text-xs">{days}d ago</span>
    </div>
  );
}

export function StakeholderTable({ data, total, page, totalPages, onPageChange }: StakeholderTableProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No stakeholders found. Upload data to get started.
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">NRIC</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Organisation</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">Agencies</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">Interactions</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">Events</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Last Contact</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.id} className="border-b border-border transition-colors hover:bg-muted/30">
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/stakeholders/${row.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {row.fullName}
                  </Link>
                  {row.email && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{row.email}</p>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {row.nricMasked}
                </td>
                <td className="px-4 py-3">
                  {row.caseStatus && (
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-medium',
                      STATUS_COLORS[row.caseStatus] ?? 'bg-gray-100 text-gray-600'
                    )}>
                      {row.caseStatus}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground max-w-32 truncate">
                  {row.employerOrg || '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  {row.crossAgencyCount >= 2 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      {row.crossAgencyCount} agencies
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">{row.crossAgencyCount}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center text-xs">{row.interactionCount}</td>
                <td className="px-4 py-3 text-center text-xs">{row.eventCount}</td>
                <td className="px-4 py-3">
                  <ContactIndicator date={row.lastContactDate} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <p className="text-xs text-muted-foreground">
          Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
        </p>
        <div className="flex gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="rounded-md border border-border px-3 py-1 text-xs hover:bg-muted disabled:opacity-50"
          >
            Previous
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            const p = page <= 3 ? i + 1 : page + i - 2;
            if (p < 1 || p > totalPages) return null;
            return (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={cn(
                  'rounded-md px-3 py-1 text-xs',
                  p === page ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-muted'
                )}
              >
                {p}
              </button>
            );
          })}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="rounded-md border border-border px-3 py-1 text-xs hover:bg-muted disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
