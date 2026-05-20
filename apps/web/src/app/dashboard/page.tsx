'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

type DashboardData = {
  totalStakeholders: number;
  activeThisMonth: number;
  crossAgencyOverlap: number;
  avgEngagementScore: number;
  statusDistribution: { name: string; value: number }[];
  agencyDistribution: { name: string; value: number }[];
  recentActivity: { type: string; title: string; date: string; stakeholder: string }[];
};

const STATUS_COLORS: Record<string, string> = {
  Nominated: 'bg-blue-500',
  Active: 'bg-green-500',
  Champion: 'bg-purple-500',
  Advocate: 'bg-amber-500',
  Dormant: 'bg-gray-400',
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  const kpis = [
    { label: 'Total Stakeholders', value: data?.totalStakeholders ?? '—', sub: 'Across all agencies' },
    { label: 'Active This Month', value: data?.activeThisMonth ?? '—', sub: 'Interactions + events' },
    { label: 'Cross-Agency Overlap', value: data?.crossAgencyOverlap ?? '—', sub: 'Known to 2+ agencies' },
    { label: 'Avg Engagement Score', value: data?.avgEngagementScore ?? '—', sub: 'Portfolio average' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of stakeholder engagement across agencies
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
            <p className="mt-1 text-2xl font-bold">{kpi.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Status Distribution */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Status Distribution</h3>
          {data?.statusDistribution && data.statusDistribution.length > 0 ? (
            <div className="mt-4 space-y-3">
              {data.statusDistribution
                .sort((a, b) => b.value - a.value)
                .map(s => {
                  const total = data.totalStakeholders || 1;
                  const pct = Math.round((s.value / total) * 100);
                  return (
                    <div key={s.name}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{s.name}</span>
                        <span className="text-muted-foreground">{s.value} ({pct}%)</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-muted">
                        <div
                          className={cn('h-2 rounded-full', STATUS_COLORS[s.name] ?? 'bg-primary')}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="mt-4 flex h-48 items-center justify-center text-sm text-muted-foreground">
              Upload data to see distribution
            </div>
          )}
        </div>

        {/* Agency Distribution */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Stakeholders by Agency</h3>
          {data?.agencyDistribution && data.agencyDistribution.length > 0 ? (
            <div className="mt-4 space-y-3">
              {data.agencyDistribution
                .sort((a, b) => b.value - a.value)
                .map(a => {
                  const max = Math.max(...data.agencyDistribution.map(d => d.value));
                  const pct = Math.round((a.value / max) * 100);
                  return (
                    <div key={a.name}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{a.name}</span>
                        <span className="text-muted-foreground">{a.value}</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="mt-4 flex h-48 items-center justify-center text-sm text-muted-foreground">
              Upload data to see distribution
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold">Recent Activity</h3>
        {data?.recentActivity && data.recentActivity.length > 0 ? (
          <div className="mt-4 divide-y divide-border">
            {data.recentActivity.map((a, i) => (
              <div key={i} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="text-sm">{a.type === 'interaction' ? '💬' : '📅'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.stakeholder}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{a.date}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 flex h-32 items-center justify-center text-sm text-muted-foreground">
            Activity feed will appear after data upload
          </div>
        )}
      </div>
    </div>
  );
}
