'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis,
} from 'recharts';

type EngagementData = {
  scores: {
    stakeholderId: string;
    fullName: string;
    totalScore: number;
    recencyScore: number;
    frequencyScore: number;
    depthScore: number;
    breadthScore: number;
    segment: string;
    churnRisk: number;
    daysSinceContact: number | null;
  }[];
  summary: {
    total: number;
    averageScore: number;
    averageChurnRisk: number;
    segments: Record<string, number>;
    scoreDistribution: { high: number; medium: number; low: number };
  };
};

const SEGMENT_COLORS: Record<string, string> = {
  Champion: '#8b5cf6',
  'Rising Star': '#3b82f6',
  Active: '#22c55e',
  'At-Risk': '#f59e0b',
  Dormant: '#6b7280',
};

const PIE_COLORS = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#6b7280'];

export default function EngagementAnalyticsPage() {
  const [data, setData] = useState<EngagementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [segmentFilter, setSegmentFilter] = useState('');

  useEffect(() => {
    fetch('/api/engagement?refresh=true')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <svg className="h-8 w-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (!data) return null;

  const { summary, scores } = data;

  const histogramData = (() => {
    const bins = Array.from({ length: 10 }, (_, i) => ({
      range: `${i * 10}-${i * 10 + 9}`,
      count: 0,
    }));
    scores.forEach(s => {
      const bin = Math.min(9, Math.floor(s.totalScore / 10));
      bins[bin].count++;
    });
    return bins;
  })();

  const pieData = Object.entries(summary.segments).map(([name, value]) => ({ name, value }));

  const scatterData = scores.map(s => ({
    x: s.frequencyScore,
    y: s.recencyScore,
    z: s.totalScore,
    name: s.fullName,
    segment: s.segment,
    id: s.stakeholderId,
  }));

  const filteredScores = segmentFilter
    ? scores.filter(s => s.segment === segmentFilter)
    : scores;

  const churnRisk = scores
    .filter(s => s.churnRisk >= 50)
    .sort((a, b) => b.churnRisk - a.churnRisk)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Engagement Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Engagement scores, segmentation, and churn risk analysis
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground">Avg Engagement Score</p>
          <p className="mt-1 text-2xl font-bold">{summary.averageScore}</p>
          <p className="mt-1 text-xs text-muted-foreground">out of 100</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground">Champions</p>
          <p className="mt-1 text-2xl font-bold text-purple-600">{summary.segments['Champion'] ?? 0}</p>
          <p className="mt-1 text-xs text-muted-foreground">highest engagement</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground">At-Risk + Dormant</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">
            {(summary.segments['At-Risk'] ?? 0) + (summary.segments['Dormant'] ?? 0)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">need attention</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground">Avg Churn Risk</p>
          <p className="mt-1 text-2xl font-bold">{summary.averageChurnRisk}%</p>
          <p className="mt-1 text-xs text-muted-foreground">portfolio risk</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Score Distribution Histogram */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Score Distribution</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histogramData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#1e40af" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Segmentation Pie */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Segment Distribution</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name} (${value})`}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={entry.name} fill={SEGMENT_COLORS[entry.name] ?? PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recency vs Frequency Scatter */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Recency vs Frequency</h3>
          <p className="text-[10px] text-muted-foreground">Bubble size = total engagement score</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" dataKey="x" name="Frequency" tick={{ fontSize: 10 }} label={{ value: 'Frequency', position: 'bottom', fontSize: 10 }} />
                <YAxis type="number" dataKey="y" name="Recency" tick={{ fontSize: 10 }} label={{ value: 'Recency', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                <ZAxis type="number" dataKey="z" range={[20, 200]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ payload }) => {
                  if (!payload?.[0]) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-lg border border-border bg-card p-2 shadow text-xs">
                      <p className="font-medium">{d.name}</p>
                      <p>Score: {d.z} | {d.segment}</p>
                    </div>
                  );
                }} />
                <Scatter data={scatterData} fill="#1e40af" fillOpacity={0.6} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Churn Risk Table */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">High Churn Risk</h3>
          <p className="text-[10px] text-muted-foreground">Top 10 stakeholders at risk of disengagement</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-2 py-1.5 text-center font-medium text-muted-foreground">Score</th>
                  <th className="px-2 py-1.5 text-center font-medium text-muted-foreground">Churn Risk</th>
                  <th className="px-2 py-1.5 text-center font-medium text-muted-foreground">Days Since Contact</th>
                </tr>
              </thead>
              <tbody>
                {churnRisk.map(s => (
                  <tr key={s.stakeholderId} className="border-b border-border last:border-0">
                    <td className="px-2 py-1.5">
                      <Link href={`/dashboard/stakeholders/${s.stakeholderId}`} className="font-medium text-primary hover:underline">
                        {s.fullName}
                      </Link>
                    </td>
                    <td className="px-2 py-1.5 text-center">{s.totalScore}</td>
                    <td className="px-2 py-1.5 text-center">
                      <span className={cn(
                        'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                        s.churnRisk >= 70 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      )}>
                        {s.churnRisk}%
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-center text-muted-foreground">
                      {s.daysSinceContact !== null ? `${s.daysSinceContact}d` : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Stakeholder Engagement Table */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">All Stakeholder Scores</h3>
          <div className="flex gap-1.5">
            <button
              onClick={() => setSegmentFilter('')}
              className={cn(
                'rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors',
                !segmentFilter ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
              )}
            >
              All ({summary.total})
            </button>
            {Object.entries(summary.segments).map(([seg, count]) => (
              <button
                key={seg}
                onClick={() => setSegmentFilter(seg === segmentFilter ? '' : seg)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors',
                  segmentFilter === seg ? 'text-white' : 'bg-muted hover:bg-muted/80'
                )}
                style={segmentFilter === seg ? { backgroundColor: SEGMENT_COLORS[seg] } : {}}
              >
                {seg} ({count})
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border">
                <th className="px-2 py-2 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-2 py-2 text-center font-medium text-muted-foreground">Total</th>
                <th className="px-2 py-2 text-center font-medium text-muted-foreground">Recency</th>
                <th className="px-2 py-2 text-center font-medium text-muted-foreground">Frequency</th>
                <th className="px-2 py-2 text-center font-medium text-muted-foreground">Depth</th>
                <th className="px-2 py-2 text-center font-medium text-muted-foreground">Breadth</th>
                <th className="px-2 py-2 text-center font-medium text-muted-foreground">Segment</th>
                <th className="px-2 py-2 text-center font-medium text-muted-foreground">Churn</th>
              </tr>
            </thead>
            <tbody>
              {filteredScores.slice(0, 50).map(s => (
                <tr key={s.stakeholderId} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-2 py-1.5">
                    <Link href={`/dashboard/stakeholders/${s.stakeholderId}`} className="font-medium text-primary hover:underline">
                      {s.fullName}
                    </Link>
                  </td>
                  <td className="px-2 py-1.5 text-center font-bold">{s.totalScore}</td>
                  <td className="px-2 py-1.5 text-center">{s.recencyScore}</td>
                  <td className="px-2 py-1.5 text-center">{s.frequencyScore}</td>
                  <td className="px-2 py-1.5 text-center">{s.depthScore}</td>
                  <td className="px-2 py-1.5 text-center">{s.breadthScore}</td>
                  <td className="px-2 py-1.5 text-center">
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
                      style={{ backgroundColor: SEGMENT_COLORS[s.segment] ?? '#6b7280' }}
                    >
                      {s.segment}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <span className={cn(
                      'text-[10px] font-medium',
                      s.churnRisk >= 70 ? 'text-red-600' : s.churnRisk >= 40 ? 'text-amber-600' : 'text-green-600'
                    )}>
                      {s.churnRisk}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
