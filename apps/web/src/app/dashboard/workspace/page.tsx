'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type StakeholderSummary = {
  id: string;
  fullName: string;
  caseStatus: string | null;
  employerOrg: string | null;
  segment: string;
  totalScore: number;
  churnRisk: number;
  lastContact: string | null;
  daysSinceContact: number | null;
  ragStatus: 'green' | 'amber' | 'red' | 'grey';
};

type WorkspaceData = {
  total: number;
  overdue: StakeholderSummary[];
  atRisk: StakeholderSummary[];
  pipeline: Record<string, StakeholderSummary[]>;
  summary: { green: number; amber: number; red: number; grey: number };
};

type DeconflictionAlert = {
  stakeholderId: string;
  fullName: string;
  agencyCount: number;
  agencies: string[];
  recentTouchpoints: number;
  lastDate: string;
};

type IntroRequest = {
  id: string;
  fromRM: string;
  toRM: string;
  stakeholderName: string;
  stakeholderId: string;
  reason: string;
  status: string;
  createdAt: string;
};

const RAG_COLORS = {
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  grey: 'bg-gray-300',
};

const PIPELINE_STAGES = ['Nominated', 'Active', 'Champion', 'Advocate', 'Dormant'];
const STAGE_COLORS: Record<string, string> = {
  Nominated: 'border-t-blue-500',
  Active: 'border-t-green-500',
  Champion: 'border-t-purple-500',
  Advocate: 'border-t-amber-500',
  Dormant: 'border-t-gray-400',
};

export default function WorkspacePage() {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [alerts, setAlerts] = useState<DeconflictionAlert[]>([]);
  const [intros, setIntros] = useState<IntroRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIntroForm, setShowIntroForm] = useState(false);
  const [introForm, setIntroForm] = useState({ toRM: '', stakeholderName: '', stakeholderId: '', reason: '' });

  useEffect(() => {
    Promise.all([
      fetch('/api/workspace').then(r => r.json()),
      fetch('/api/workspace/alerts').then(r => r.json()),
      fetch('/api/workspace/intros').then(r => r.json()),
    ])
      .then(([workspace, alertsData, introsData]) => {
        setData(workspace);
        setAlerts(alertsData.alerts ?? []);
        setIntros(introsData.requests ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function submitIntro() {
    if (!introForm.toRM || !introForm.stakeholderName) return;
    try {
      const res = await fetch('/api/workspace/intros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromRM: 'Current RM', ...introForm }),
      });
      if (res.ok) {
        const intro = await res.json();
        setIntros(prev => [...prev, intro]);
        setShowIntroForm(false);
        setIntroForm({ toRM: '', stakeholderName: '', stakeholderId: '', reason: '' });
      }
    } catch {}
  }

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Workspace</h1>
        <p className="text-sm text-muted-foreground">
          Your assigned stakeholders, reminders, and journey pipeline
        </p>
      </div>

      {/* Contact Status Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'On Track', count: data.summary.green, color: 'text-green-600', bg: 'bg-green-50', sub: '≤60 days' },
          { label: 'Due Soon', count: data.summary.amber, color: 'text-amber-600', bg: 'bg-amber-50', sub: '61-90 days' },
          { label: 'Overdue', count: data.summary.red, color: 'text-red-600', bg: 'bg-red-50', sub: '>90 days' },
          { label: 'No Contact', count: data.summary.grey, color: 'text-gray-500', bg: 'bg-gray-50', sub: 'No record' },
        ].map(s => (
          <div key={s.label} className={cn('rounded-xl border border-border p-4', s.bg)}>
            <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
            <p className={cn('mt-1 text-2xl font-bold', s.color)}>{s.count}</p>
            <p className="text-[10px] text-muted-foreground">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Cross-Agency Deconfliction Alerts */}
      {alerts.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🔔</span>
            <h3 className="text-sm font-semibold text-amber-800">Cross-Agency Deconfliction Alerts</h3>
            <span className="rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">{alerts.length}</span>
          </div>
          <p className="text-xs text-amber-700 mb-3">
            These stakeholders are being engaged by multiple agencies within the last 30 days. Consider coordinating outreach.
          </p>
          <div className="space-y-2">
            {alerts.slice(0, 5).map(a => (
              <Link
                key={a.stakeholderId}
                href={`/dashboard/stakeholders/${a.stakeholderId}`}
                className="flex items-center justify-between rounded-lg border border-amber-200 bg-white p-2.5 hover:bg-amber-50/50 transition-colors"
              >
                <div>
                  <p className="text-xs font-medium">{a.fullName}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {a.agencies.join(', ')} · {a.recentTouchpoints} touchpoints
                  </p>
                </div>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                  {a.agencyCount} agencies
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Journey Pipeline Kanban */}
      <div>
        <h2 className="text-sm font-semibold mb-3">Journey Pipeline</h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {PIPELINE_STAGES.map(stage => {
            const items = data.pipeline[stage] ?? [];
            return (
              <div key={stage} className={cn('min-w-48 sm:min-w-56 flex-1 rounded-xl border border-border border-t-4 bg-card', STAGE_COLORS[stage])}>
                <div className="p-3 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold">{stage}</h3>
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">{items.length}</span>
                  </div>
                </div>
                <div className="p-2 space-y-1.5 max-h-72 overflow-y-auto">
                  {items.slice(0, 10).map(s => (
                    <Link
                      key={s.id}
                      href={`/dashboard/stakeholders/${s.id}`}
                      className="block rounded-lg border border-border bg-background p-2 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn('h-2 w-2 rounded-full', RAG_COLORS[s.ragStatus])} />
                        <span className="text-xs font-medium truncate">{s.fullName}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Score: {s.totalScore}</span>
                        <span>{s.daysSinceContact !== null ? `${s.daysSinceContact}d ago` : 'No contact'}</span>
                      </div>
                    </Link>
                  ))}
                  {items.length > 10 && (
                    <p className="text-center text-[10px] text-muted-foreground py-1">
                      +{items.length - 10} more
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Overdue Contacts */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-red-600">Overdue Contacts</h3>
          <p className="text-[10px] text-muted-foreground mb-3">90+ days since last contact</p>
          {data.overdue.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">All on track</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {data.overdue.map(s => (
                <Link
                  key={s.id}
                  href={`/dashboard/stakeholders/${s.id}`}
                  className="flex items-center justify-between rounded-lg border border-border p-2 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <div className={cn('h-2 w-2 rounded-full', RAG_COLORS[s.ragStatus])} />
                    <div>
                      <p className="text-xs font-medium">{s.fullName}</p>
                      <p className="text-[10px] text-muted-foreground">{s.employerOrg ?? ''}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-red-600">{s.daysSinceContact}d</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* At-Risk */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-amber-600">At-Risk Stakeholders</h3>
          <p className="text-[10px] text-muted-foreground mb-3">High churn risk</p>
          {data.atRisk.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No at-risk stakeholders</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {data.atRisk.map(s => (
                <Link
                  key={s.id}
                  href={`/dashboard/stakeholders/${s.id}`}
                  className="flex items-center justify-between rounded-lg border border-border p-2 hover:bg-muted/50"
                >
                  <div>
                    <p className="text-xs font-medium">{s.fullName}</p>
                    <p className="text-[10px] text-muted-foreground">{s.segment}</p>
                  </div>
                  <span className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                    s.churnRisk >= 70 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  )}>
                    {s.churnRisk}%
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Warm Introduction Requests */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold">Warm Introductions</h3>
              <p className="text-[10px] text-muted-foreground">Request intros from other RMs</p>
            </div>
            <button
              onClick={() => setShowIntroForm(!showIntroForm)}
              className="rounded-lg bg-primary px-2.5 py-1 text-[10px] font-medium text-primary-foreground hover:bg-primary/90"
            >
              + New Request
            </button>
          </div>

          {showIntroForm && (
            <div className="mb-3 rounded-lg border border-border bg-background p-3 space-y-2">
              <input
                type="text"
                value={introForm.toRM}
                onChange={e => setIntroForm(p => ({ ...p, toRM: e.target.value }))}
                placeholder="To RM (name or agency)"
                className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
              />
              <input
                type="text"
                value={introForm.stakeholderName}
                onChange={e => setIntroForm(p => ({ ...p, stakeholderName: e.target.value }))}
                placeholder="Stakeholder name"
                className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
              />
              <input
                type="text"
                value={introForm.reason}
                onChange={e => setIntroForm(p => ({ ...p, reason: e.target.value }))}
                placeholder="Reason for introduction"
                className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
              />
              <div className="flex gap-2">
                <button
                  onClick={submitIntro}
                  className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Send Request
                </button>
                <button
                  onClick={() => setShowIntroForm(false)}
                  className="rounded border border-border px-3 py-1 text-xs hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {intros.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No pending requests</p>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {intros.map(i => (
                <div key={i.id} className="rounded-lg border border-border p-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium">{i.stakeholderName}</p>
                    <span className={cn(
                      'rounded-full px-1.5 py-0.5 text-[9px] font-medium',
                      i.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      i.status === 'accepted' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    )}>
                      {i.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">To: {i.toRM}</p>
                  {i.reason && <p className="text-[10px] text-muted-foreground">{i.reason}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
