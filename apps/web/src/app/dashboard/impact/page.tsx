'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

type ImpactData = {
  totalStakeholders: number;
  crossAgencyRate: number;
  avgEngagement: number;
  pipeline: Record<string, number>;
  agencyBreakdown: { agency: string; stakeholders: number; interactions: number; events: number; avgScore: number }[];
  funnelData: { stage: string; count: number }[];
};

const FUNNEL_COLORS = ['#3b82f6', '#22c55e', '#8b5cf6', '#f59e0b', '#6b7280'];

export default function ImpactDashboardPage() {
  const [data, setData] = useState<ImpactData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard').then(r => r.json()),
      fetch('/api/engagement').then(r => r.json()),
      fetch('/api/workspace').then(r => r.json()),
    ])
      .then(([dashboard, engagement, workspace]) => {
        const scores = engagement.scores as { nricHash: string; totalScore: number }[];

        const agencyInteractions = new Map<string, number>();
        const agencyEvents = new Map<string, number>();
        const agencyStakeholders = new Map<string, Set<string>>();
        const agencyScores = new Map<string, number[]>();

        (dashboard.agencyDistribution as { name: string; value: number }[]).forEach(a => {
          agencyStakeholders.set(a.name, new Set());
        });

        fetch('/api/stakeholders?limit=200').then(r => r.json()).then((stakeholders) => {
          const pipeline = workspace.pipeline as Record<string, { id: string }[]>;
          const funnelData = ['Nominated', 'Active', 'Champion', 'Advocate'].map(stage => ({
            stage,
            count: (pipeline[stage] ?? []).length,
          }));

          setData({
            totalStakeholders: dashboard.totalStakeholders,
            crossAgencyRate: Math.round((dashboard.crossAgencyOverlap / Math.max(1, dashboard.totalStakeholders)) * 100),
            avgEngagement: dashboard.avgEngagementScore,
            pipeline: Object.fromEntries(
              Object.entries(pipeline).map(([k, v]) => [k, (v as unknown[]).length])
            ),
            agencyBreakdown: (dashboard.agencyDistribution as { name: string; value: number }[]).map(a => ({
              agency: a.name,
              stakeholders: a.value,
              interactions: 0,
              events: 0,
              avgScore: engagement.summary.averageScore,
            })),
            funnelData,
          });
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <svg className="h-8 w-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Impact Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Whole-of-government stakeholder engagement KPIs
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground">Total Stakeholders</p>
          <p className="mt-1 text-2xl font-bold">{data.totalStakeholders}</p>
          <p className="mt-1 text-xs text-muted-foreground">Across all agencies</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground">Cross-Agency Rate</p>
          <p className="mt-1 text-2xl font-bold">{data.crossAgencyRate}%</p>
          <p className="mt-1 text-xs text-muted-foreground">Known to 2+ agencies</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground">Avg Engagement</p>
          <p className="mt-1 text-2xl font-bold">{data.avgEngagement}</p>
          <p className="mt-1 text-xs text-muted-foreground">Portfolio average</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground">Funnel Conversion</p>
          <p className="mt-1 text-2xl font-bold">
            {data.funnelData.length >= 2 && data.funnelData[0].count > 0
              ? `${Math.round(((data.funnelData[2]?.count ?? 0) + (data.funnelData[3]?.count ?? 0)) / data.totalStakeholders * 100)}%`
              : '—'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Champion + Advocate</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Journey Funnel */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Journey Funnel</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.funnelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="stage" tick={{ fontSize: 10 }} width={80} />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {data.funnelData.map((_, i) => (
                    <Cell key={i} fill={FUNNEL_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pipeline Breakdown */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Pipeline Breakdown</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={Object.entries(data.pipeline).map(([name, value]) => ({ name, value }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name} (${value})`}
                >
                  {Object.keys(data.pipeline).map((_, i) => (
                    <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Agency Comparison */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold mb-4">Agency Comparison</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.agencyBreakdown}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="agency" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="stakeholders" fill="#1e40af" radius={[4, 4, 0, 0]} name="Stakeholders" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
