'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ZAxis, ReferenceLine, Cell,
} from 'recharts';

type InfluencePoint = {
  id: string;
  fullName: string;
  caseStatus: string | null;
  interest: number;
  influence: number;
  aois: string[];
  agencyCount: number;
  quadrant: string;
};

type InfluenceData = {
  points: InfluencePoint[];
  filters: { aois: string[]; agencies: string[] };
  quadrantCounts: Record<string, number>;
  total: number;
};

const QUADRANT_COLORS: Record<string, string> = {
  'Key Player': '#8b5cf6',
  'Keep Informed': '#3b82f6',
  'Keep Satisfied': '#f59e0b',
  Monitor: '#6b7280',
};

export default function InfluenceMapPage() {
  const [data, setData] = useState<InfluenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [aoiFilter, setAoiFilter] = useState('');
  const [agencyFilter, setAgencyFilter] = useState('');
  const [selectedQuadrant, setSelectedQuadrant] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (aoiFilter) params.set('aoi', aoiFilter);
    if (agencyFilter) params.set('agency', agencyFilter);

    fetch(`/api/analytics/influence?${params}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [aoiFilter, agencyFilter]);

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

  const chartData = data.points.map(p => ({
    x: p.interest + (Math.random() - 0.5) * 0.3,
    y: p.influence + (Math.random() - 0.5) * 0.3,
    z: p.agencyCount + 1,
    ...p,
  }));

  const filteredPoints = selectedQuadrant
    ? data.points.filter(p => p.quadrant === selectedQuadrant)
    : data.points;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Influence Mapping</h1>
        <p className="text-sm text-muted-foreground">
          Interest vs. Influence quadrant analysis across areas of interest
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={aoiFilter}
          onChange={e => setAoiFilter(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">All Areas of Interest</option>
          {data.filters.aois.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select
          value={agencyFilter}
          onChange={e => setAgencyFilter(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">All Agencies</option>
          {data.filters.agencies.map(a => (
            <option key={a} value={a}>{a.match(/\(([^)]+)\)/)?.[1] ?? a}</option>
          ))}
        </select>
      </div>

      {/* Quadrant summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {['Key Player', 'Keep Informed', 'Keep Satisfied', 'Monitor'].map(q => (
          <button
            key={q}
            onClick={() => setSelectedQuadrant(q === selectedQuadrant ? '' : q)}
            className={cn(
              'rounded-xl border p-4 text-left transition-colors',
              selectedQuadrant === q ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/50'
            )}
          >
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: QUADRANT_COLORS[q] }} />
              <p className="text-xs font-medium text-muted-foreground">{q}</p>
            </div>
            <p className="mt-1 text-2xl font-bold">{data.quadrantCounts[q] ?? 0}</p>
          </button>
        ))}
      </div>

      {/* Scatter Plot */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold mb-1">Interest vs Influence Quadrant</h3>
        <p className="text-[10px] text-muted-foreground mb-4">
          High = 3, Medium = 2, Low = 1 | Bubble size = number of agencies
        </p>
        <div className="h-[450px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 30, left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                type="number"
                dataKey="x"
                domain={[0.5, 3.5]}
                tick={{ fontSize: 10 }}
                ticks={[1, 2, 3]}
                tickFormatter={v => v === 1 ? 'Low' : v === 2 ? 'Medium' : 'High'}
                label={{ value: 'Interest Level', position: 'bottom', fontSize: 11 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                domain={[0.5, 3.5]}
                tick={{ fontSize: 10 }}
                ticks={[1, 2, 3]}
                tickFormatter={v => v === 1 ? 'Low' : v === 2 ? 'Medium' : 'High'}
                label={{ value: 'Influence Level', angle: -90, position: 'insideLeft', fontSize: 11 }}
              />
              <ZAxis type="number" dataKey="z" range={[40, 200]} />
              <ReferenceLine x={2} stroke="#d1d5db" strokeDasharray="6 3" />
              <ReferenceLine y={2} stroke="#d1d5db" strokeDasharray="6 3" />
              <Tooltip content={({ payload }) => {
                if (!payload?.[0]) return null;
                const d = payload[0].payload;
                return (
                  <div className="rounded-lg border border-border bg-card p-2.5 shadow text-xs max-w-52">
                    <p className="font-semibold">{d.fullName}</p>
                    <p className="text-muted-foreground">{d.quadrant}</p>
                    <p className="mt-1">AOIs: {d.aois.slice(0, 3).join(', ')}</p>
                    <p>Agencies: {d.agencyCount}</p>
                  </div>
                );
              }} />
              <Scatter data={chartData} fillOpacity={0.7}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={QUADRANT_COLORS[entry.quadrant] ?? '#6b7280'} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stakeholder List */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold mb-3">
          {selectedQuadrant ? `${selectedQuadrant} Stakeholders` : 'All Stakeholders'} ({filteredPoints.length})
        </h3>
        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border">
                <th className="px-2 py-2 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-2 py-2 text-center font-medium text-muted-foreground">Interest</th>
                <th className="px-2 py-2 text-center font-medium text-muted-foreground">Influence</th>
                <th className="px-2 py-2 text-center font-medium text-muted-foreground">Quadrant</th>
                <th className="px-2 py-2 text-left font-medium text-muted-foreground">Areas of Interest</th>
                <th className="px-2 py-2 text-center font-medium text-muted-foreground">Agencies</th>
              </tr>
            </thead>
            <tbody>
              {filteredPoints.slice(0, 50).map(p => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-2 py-1.5">
                    <Link href={`/dashboard/stakeholders/${p.id}`} className="font-medium text-primary hover:underline">
                      {p.fullName}
                    </Link>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {p.interest === 3 ? 'High' : p.interest === 2 ? 'Medium' : 'Low'}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {p.influence === 3 ? 'High' : p.influence === 2 ? 'Medium' : 'Low'}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
                      style={{ backgroundColor: QUADRANT_COLORS[p.quadrant] }}
                    >
                      {p.quadrant}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-muted-foreground truncate max-w-40">
                    {p.aois.join(', ')}
                  </td>
                  <td className="px-2 py-1.5 text-center">{p.agencyCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
