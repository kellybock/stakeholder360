'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ProfileHeader } from '@/components/stakeholder/profile-header';
import { Timeline } from '@/components/stakeholder/timeline';
import { EngagementTimeline } from '@/components/stakeholder/engagement-timeline';
import { exportToCSV, exportToPDF, exportToWord } from '@/lib/export-research';

type Stakeholder360 = {
  profile: Record<string, unknown>;
  interactions: Record<string, unknown>[];
  events: Record<string, unknown>[];
  awards: Record<string, unknown>[];
  community: Record<string, unknown>[];
  overseas: Record<string, unknown>[];
  areasOfInterest: Record<string, unknown>[];
  timeline: { id: string; type: string; date: string; title: string; description: string | null; agency: string | null }[];
  crossAgencyCount: number;
  agencies: string[];
  engagement: {
    totalScore: number;
    recencyScore: number;
    frequencyScore: number;
    depthScore: number;
    breadthScore: number;
    segment: string;
    churnRisk: number;
    lastContactDate: string | null;
    daysSinceContact: number | null;
  } | null;
  canViewContact?: boolean;
  assignedRM?: { name: string; email: string; agency: string } | null;
};

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'interactions', label: 'Interactions' },
  { key: 'events', label: 'Events' },
  { key: 'awards', label: 'Awards' },
  { key: 'community', label: 'Community' },
  { key: 'overseas', label: 'Overseas' },
  { key: 'aoi', label: 'Areas of Interest' },
  { key: 'ai', label: 'AI Insights' },
];

const INTEREST_COLORS: Record<string, string> = {
  High: 'bg-green-100 text-green-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low: 'bg-gray-100 text-gray-600',
};

export default function StakeholderProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<Stakeholder360 | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [briefContent, setBriefContent] = useState('');
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefProvider, setBriefProvider] = useState('claude');
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
  const [researchContent, setResearchContent] = useState('');
  const [researchLoading, setResearchLoading] = useState(false);
  const [orgResearchContent, setOrgResearchContent] = useState('');
  const [orgResearchLoading, setOrgResearchLoading] = useState(false);
  const [researchMode, setResearchMode] = useState<'brief' | 'full'>('brief');
  const [orgResearchMode, setOrgResearchMode] = useState<'brief' | 'full'>('brief');
  const [exportBusy, setExportBusy] = useState<string | null>(null);
  const [orgExportBusy, setOrgExportBusy] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<{ type: string; priority: string; title: string; description: string }[]>([]);

  useEffect(() => {
    fetch(`/api/stakeholders/${id}/360`)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));

    fetch(`/api/stakeholders/${id}/recommendations`)
      .then(r => r.ok ? r.json() : { recommendations: [] })
      .then(d => setRecommendations(d.recommendations ?? []))
      .catch(() => {});

    fetch('/api/ai/status')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setAiAvailable(d.available); })
      .catch(() => setAiAvailable(false));

  }, [id]);

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

  if (!data) {
    return (
      <div className="space-y-4">
        <button onClick={() => router.back()} className="text-sm text-primary hover:underline">&larr; Back</button>
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Stakeholder not found
        </div>
      </div>
    );
  }

  const p = data.profile as Record<string, string | number | boolean | null>;

  return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="text-sm text-primary hover:underline">&larr; Back to Directory</button>

      <ProfileHeader
        profile={{ ...p, id: p.id as string } as never}
        crossAgencyCount={data.crossAgencyCount}
        agencies={data.agencies}
        engagement={data.engagement}
        canViewContact={data.canViewContact ?? true}
        assignedRM={data.assignedRM}
      />

      {/* Engagement Timeline Chart */}
      <EngagementTimeline
        interactions={data.interactions}
        events={data.events}
        awards={data.awards}
        community={data.community}
        agencyCount={data.crossAgencyCount}
      />

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-0 overflow-x-auto">
          {TABS.map(t => {
            let count = 0;
            if (t.key === 'interactions') count = data.interactions.length;
            else if (t.key === 'events') count = data.events.length;
            else if (t.key === 'awards') count = data.awards.length;
            else if (t.key === 'community') count = data.community.length;
            else if (t.key === 'overseas') count = data.overseas.length;
            else if (t.key === 'aoi') count = data.areasOfInterest.length;
            else if (t.key === 'timeline') count = data.timeline.length;

            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                  tab === t.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {t.label}
                {count > 0 && <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Engagement Score Bar */}
      {data.engagement && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{data.engagement.totalScore}</p>
              <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                Engagement
                <span className="relative group">
                  <svg className="h-3 w-3 text-muted-foreground/60 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeWidth="2" />
                    <path strokeWidth="2" strokeLinecap="round" d="M12 16v-4m0-4h.01" />
                  </svg>
                  <span className="fixed hidden group-hover:block z-[9999] w-56 rounded-md bg-foreground px-3 py-2 text-[10px] leading-relaxed text-background shadow-lg mt-1">
                    <span className="font-semibold block mb-1">Engagement Score (0–100)</span>
                    Weighted composite of:<br/>
                    • Recency (30%) — days since last contact<br/>
                    • Frequency (25%) — interactions in last 12 months<br/>
                    • Depth (25%) — roles, awards, overseas representation<br/>
                    • Breadth (20%) — distinct AOIs and agencies
                  </span>
                </span>
              </p>
            </div>
            <div className="flex-1 grid grid-cols-4 gap-3">
              {[
                { label: 'Recency', value: data.engagement.recencyScore },
                { label: 'Frequency', value: data.engagement.frequencyScore },
                { label: 'Depth', value: data.engagement.depthScore },
                { label: 'Breadth', value: data.engagement.breadthScore },
              ].map(m => (
                <div key={m.label}>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">{m.label}</span>
                    <span className="font-medium">{m.value}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted">
                    <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.min(100, m.value)}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <span className={cn(
                'rounded-full px-2.5 py-1 text-xs font-medium',
                data.engagement.segment === 'Champion' ? 'bg-purple-100 text-purple-700' :
                data.engagement.segment === 'Rising Star' ? 'bg-blue-100 text-blue-700' :
                data.engagement.segment === 'Active' ? 'bg-green-100 text-green-700' :
                data.engagement.segment === 'At-Risk' ? 'bg-amber-100 text-amber-700' :
                'bg-gray-100 text-gray-500'
              )}>
                {data.engagement.segment}
              </span>
              {data.engagement.churnRisk >= 50 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
                  Churn risk: {data.engagement.churnRisk}%
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab content */}
      <div className="rounded-xl border border-border bg-card p-6">
        {tab === 'overview' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold mb-3">Personal Details</h3>
              <dl className="space-y-2 text-sm">
                {[
                  ['Race', p.race],
                  ['Sex', p.sex],
                  ['Year of Birth', p.yearOfBirth],
                  ['Residential Status', p.residentialStatus],
                  ['Data Consent', p.dataConsent ? 'Yes' : 'No'],
                ].map(([label, value]) => value && (
                  <div key={String(label)} className="flex gap-3">
                    <dt className="w-32 text-muted-foreground">{String(label)}</dt>
                    <dd>{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div>
              {p.writeUp && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold mb-2">Write-up</h3>
                  <p className="text-sm text-muted-foreground">{String(p.writeUp)}</p>
                </div>
              )}
              {p.reasonForNomination && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold mb-2">Reason for Nomination</h3>
                  <p className="text-sm text-muted-foreground">{String(p.reasonForNomination)}</p>
                </div>
              )}
              {p.areasOfInterest && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Areas of Interest</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {String(p.areasOfInterest).split(';').map(a => a.trim()).filter(Boolean).map(a => (
                      <span key={a} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs">{a}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'timeline' && <Timeline entries={data.timeline} />}

        {tab === 'interactions' && (
          <div className="space-y-3">
            {data.interactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No interactions recorded</p>
            ) : data.interactions.map((i: Record<string, unknown>) => (
              <div key={String(i.id)} className="rounded-lg border border-border p-4">
                <div className="flex items-start justify-between">
                  <p className="text-sm font-medium">{String(i.interactionDetails ?? 'Interaction')}</p>
                  <span className="text-xs text-muted-foreground">{String(i.meetingDate ?? '')}</span>
                </div>
                {i.pocStaffName ? <p className="mt-1 text-xs text-muted-foreground">POC: {String(i.pocStaffName)}</p> : null}
                {i.briefNotes ? <p className="mt-2 text-xs text-muted-foreground">{String(i.briefNotes)}</p> : null}
              </div>
            ))}
          </div>
        )}

        {tab === 'events' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Event</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Date</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Organizer</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Role</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {data.events.map((e: Record<string, unknown>) => (
                  <tr key={String(e.id)} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-medium">{String(e.eventTitle)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{String(e.startDate ?? '')}</td>
                    <td className="px-3 py-2 text-xs">{String(e.organizerAgency ?? '').match(/\(([^)]+)\)/)?.[1] ?? String(e.organizerAgency ?? '')}</td>
                    <td className="px-3 py-2 text-xs">{String(e.roleOfYouth ?? '')}</td>
                    <td className="px-3 py-2">
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium',
                        String(e.attendance) === 'Attended' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      )}>{String(e.attendance ?? '')}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'awards' && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {data.awards.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8 col-span-2">No awards recorded</p>
            ) : data.awards.map((a: Record<string, unknown>) => (
              <div key={String(a.id)} className="rounded-lg border border-border p-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏆</span>
                  <div>
                    <p className="text-sm font-medium">{String(a.awardName)}</p>
                    {a.year ? <p className="text-xs text-muted-foreground">Year: {String(a.year)}</p> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'community' && (
          <div className="space-y-3">
            {data.community.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No community roles recorded</p>
            ) : data.community.map((c: Record<string, unknown>) => (
              <div key={String(c.id)} className="rounded-lg border border-border p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">{String(c.role ?? 'Member')} at {String(c.orgGroupName ?? 'Organisation')}</p>
                    {c.description ? <p className="mt-1 text-xs text-muted-foreground">{String(c.description)}</p> : null}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {String(c.startDate ?? '')} — {String(c.endDate ?? 'Present')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'overseas' && (
          <div className="space-y-3">
            {data.overseas.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No overseas representation recorded</p>
            ) : data.overseas.map((o: Record<string, unknown>) => (
              <div key={String(o.id)} className="rounded-lg border border-border p-4">
                <div className="flex items-center gap-3">
                  <span className="text-lg">🌏</span>
                  <div>
                    <p className="text-sm font-medium">Year: {String(o.year ?? 'N/A')}</p>
                    {o.description ? <p className="mt-1 text-xs text-muted-foreground">{String(o.description)}</p> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'aoi' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Area of Interest</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Alignment</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">Interest</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">Influence</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Agency</th>
                </tr>
              </thead>
              <tbody>
                {data.areasOfInterest.map((a: Record<string, unknown>) => (
                  <tr key={String(a.id)} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-medium">{String(a.areaOfInterest)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{String(a.alignment ?? '')}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', INTEREST_COLORS[String(a.levelOfInterest)] ?? '')}>
                        {String(a.levelOfInterest ?? '')}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', INTEREST_COLORS[String(a.levelOfInfluence)] ?? '')}>
                        {String(a.levelOfInfluence ?? '')}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {String(a.agency ?? '').match(/\(([^)]+)\)/)?.[1] ?? String(a.agency ?? '')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}


        {tab === 'ai' && aiAvailable === false && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <svg className="h-6 w-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m-4-6a8 8 0 1116 0c0 3.5-2 5-4 6.5V17a2 2 0 01-2 2h-4a2 2 0 01-2-2v-.5C6 15 4 13.5 4 10z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold">AI Features Unavailable</h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm">
              No AI provider API key is configured. Add an API key in{' '}
              <a href="/dashboard/admin/settings" className="text-primary hover:underline">Admin &gt; API Keys &amp; Settings</a>{' '}
              to enable brief generation.
            </p>
          </div>
        )}

        {tab === 'ai' && aiAvailable !== false && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">AI Meeting Brief</h3>
                <p className="text-xs text-muted-foreground">Generate an AI-powered meeting preparation brief for this stakeholder</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={briefProvider}
                  onChange={e => setBriefProvider(e.target.value)}
                  className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                >
                  <option value="claude">Claude</option>
                  <option value="openai">ChatGPT</option>
                  <option value="gemini">Gemini</option>
                </select>
                <button
                  onClick={async () => {
                    setBriefLoading(true);
                    setBriefContent('');
                    try {
                      const res = await fetch('/api/ai/brief', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ stakeholderId: id, provider: briefProvider }),
                      });
                      if (!res.ok) {
                        const err = await res.json();
                        throw new Error(err.error || 'Brief generation failed');
                      }
                      const reader = res.body?.getReader();
                      if (!reader) throw new Error('No stream');
                      const decoder = new TextDecoder();
                      let acc = '';
                      while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        const text = decoder.decode(value, { stream: true });
                        for (const line of text.split('\n')) {
                          if (!line.startsWith('data: ')) continue;
                          try {
                            const parsed = JSON.parse(line.slice(6));
                            if (parsed.error) throw new Error(parsed.error);
                            if (parsed.text) { acc += parsed.text; setBriefContent(acc); }
                          } catch (e) { if (!(e instanceof SyntaxError)) throw e; }
                        }
                      }
                    } catch (err) {
                      setBriefContent(`**Error:** ${err instanceof Error ? err.message : 'Failed to generate brief'}`);
                    } finally {
                      setBriefLoading(false);
                    }
                  }}
                  disabled={briefLoading}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                    briefLoading ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  )}
                >
                  {briefLoading ? 'Generating...' : 'Generate Brief'}
                </button>
              </div>
            </div>

            {briefContent ? (
              <div className="rounded-lg border border-border bg-background p-4 text-sm prose prose-sm max-w-none dark:prose-invert">
                {briefContent.split('\n').map((line, i) => {
                  const renderInline = (text: string) => {
                    const parts = text.split(/\*\*(.+?)\*\*/g);
                    return parts.map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part);
                  };
                  if (line.startsWith('## ')) return <h2 key={i} className="mt-4 mb-1 text-base font-semibold">{renderInline(line.slice(3))}</h2>;
                  if (line.startsWith('### ')) return <h3 key={i} className="mt-3 mb-1 text-sm font-semibold">{renderInline(line.slice(4))}</h3>;
                  if (line.startsWith('# ')) return <h1 key={i} className="mt-4 mb-2 text-lg font-bold">{renderInline(line.slice(2))}</h1>;
                  if (line.startsWith('- ')) return <li key={i} className="ml-4 list-disc">{renderInline(line.slice(2))}</li>;
                  if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal">{renderInline(line.replace(/^\d+\.\s/, ''))}</li>;
                  if (line.startsWith('---')) return <hr key={i} className="my-3" />;
                  if (line.trim() === '') return <br key={i} />;
                  return <p key={i} className="my-1">{renderInline(line)}</p>;
                })}
              </div>
            ) : !briefLoading ? (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                Click &ldquo;Generate Brief&rdquo; to create an AI meeting preparation brief
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center">
                <svg className="h-6 w-6 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}

            {/* Web Research */}
            <div className="border-t border-border pt-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-1.5">
                    <span className="inline-flex items-center justify-center rounded bg-sky-500 px-1.5 py-0.5 text-[10px] font-bold text-white">P</span>
                    Web Research
                  </h3>
                  <p className="text-xs text-muted-foreground">Search the web for public information about this person</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-lg border border-border bg-muted p-0.5">
                    {(['brief', 'full'] as const).map(m => (
                      <button
                        key={m}
                        onClick={() => setResearchMode(m)}
                        className={cn(
                          'rounded-md px-2.5 py-0.5 text-[10px] font-medium transition-colors',
                          researchMode === m ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {m === 'brief' ? 'Quick Brief' : 'Full'}
                      </button>
                    ))}
                  </div>
                  <button
                  onClick={async () => {
                    setResearchLoading(true);
                    setResearchContent('');
                    try {
                      const res = await fetch('/api/ai/research', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ stakeholderId: id, mode: researchMode }),
                      });
                      const data = await res.json();
                      if (!res.ok || data.error) throw new Error(data.error || 'Research failed');
                      const CHAT = [
                        /^if you('d| would)? (want|like|need|have)/i,
                        /^i can also/i, /^i could also/i, /^let me know/i,
                        /^feel free to/i, /^would you like/i,
                        /^please (let me know|don't hesitate)/i,
                        /^don't hesitate/i, /^is there anything (else|more)/i,
                        /^should you (want|need|require)/i,
                        /^if (there are|you have) (any|further)/i,
                      ];
                      const lines = (data.content ?? '').split('\n');
                      let end = lines.length;
                      while (end > 0 && (!lines[end-1].trim() || CHAT.some((p: RegExp) => p.test(lines[end-1].trim())))) end--;
                      setResearchContent(lines.slice(0, end).join('\n'));
                    } catch (err) {
                      setResearchContent(`**Error:** ${err instanceof Error ? err.message : 'Research failed'}`);
                    } finally {
                      setResearchLoading(false);
                    }
                  }}
                  disabled={researchLoading}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                    researchLoading ? 'bg-muted text-muted-foreground' : 'bg-sky-500 text-white hover:bg-sky-600'
                  )}
                >
                  {researchLoading ? 'Researching...' : 'Research Person'}
                </button>
                </div>
              </div>

              {researchContent && (
                <div className="flex items-center justify-end gap-1 -mt-2">
                  {(['word', 'csv', 'pdf'] as const).map(fmt => (
                    <button
                      key={fmt}
                      onClick={async () => {
                        setExportBusy(fmt);
                        try {
                          const personName = String(p.name ?? p.fullName ?? 'Person');
                          if (fmt === 'word') await exportToWord(researchContent, personName);
                          else if (fmt === 'csv') exportToCSV(researchContent, personName);
                          else exportToPDF(researchContent, personName);
                        } finally { setExportBusy(null); }
                      }}
                      disabled={!!exportBusy}
                      className={cn(
                        'rounded px-2 py-0.5 text-[10px] font-semibold border transition-colors',
                        exportBusy === fmt
                          ? 'border-sky-200 bg-sky-100 text-sky-400 cursor-wait'
                          : 'border-sky-300 text-sky-700 hover:bg-sky-100 disabled:opacity-40'
                      )}
                    >
                      {exportBusy === fmt ? '…' : fmt === 'word' ? 'Word' : fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
              {researchContent ? (
                <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm prose prose-sm max-w-none dark:prose-invert">
                  {researchContent.split('\n').map((line, i) => {
                    const renderInline = (text: string): React.ReactNode[] => {
                      const tokens = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
                      return tokens.map((token, j) => {
                        if (token.startsWith('**') && token.endsWith('**')) return <strong key={j}>{token.slice(2, -2)}</strong>;
                        const lm = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
                        if (lm) {
                          const isCitationNum = /^\d+$/.test(lm[1]);
                          return isCitationNum
                            ? <a key={j} href={lm[2]} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:text-sky-800 font-medium no-underline align-super text-[10px]">[{lm[1]}]</a>
                            : <a key={j} href={lm[2]} target="_blank" rel="noopener noreferrer" className="text-sky-600 underline underline-offset-2 hover:text-sky-800 break-all">{lm[1]}</a>;
                        }
                        return token;
                      });
                    };
                    if (line.startsWith('## ')) return <h2 key={i} className="mt-5 mb-2 text-base font-semibold border-b border-sky-200 pb-1">{renderInline(line.slice(3))}</h2>;
                    if (line.startsWith('### ')) return <h3 key={i} className="mt-3 mb-1 text-sm font-semibold">{renderInline(line.slice(4))}</h3>;
                    if (line.startsWith('# ')) return <h1 key={i} className="mt-4 mb-2 text-lg font-bold">{renderInline(line.slice(2))}</h1>;
                    if (line.startsWith('- ')) return <li key={i} className="ml-4 list-disc">{renderInline(line.slice(2))}</li>;
                    if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-xs">{renderInline(line.replace(/^\d+\.\s/, ''))}</li>;
                    if (line.startsWith('---')) return <hr key={i} className="my-3" />;
                    if (line.trim() === '') return <br key={i} />;
                    return <p key={i} className="my-1">{renderInline(line)}</p>;
                  })}
                </div>
              ) : !researchLoading ? (
                <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-sky-200 text-sm text-muted-foreground">
                  Click &ldquo;Research Person&rdquo; to search for public information
                </div>
              ) : (
                <div className="flex h-24 items-center justify-center">
                  <svg className="h-6 w-6 animate-spin text-sky-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Organisation Research */}
            <div className="border-t border-border pt-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-1.5">
                    <span className="inline-flex items-center justify-center rounded bg-sky-500 px-1.5 py-0.5 text-[10px] font-bold text-white">P</span>
                    Organisation Research
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {p.employerOrg
                      ? <>Research <span className="font-medium text-foreground">{String(p.employerOrg)}</span> using AI web search</>
                      : 'No employer organisation on record'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-lg border border-border bg-muted p-0.5">
                    {(['brief', 'full'] as const).map(m => (
                      <button
                        key={m}
                        onClick={() => setOrgResearchMode(m)}
                        className={cn(
                          'rounded-md px-2.5 py-0.5 text-[10px] font-medium transition-colors',
                          orgResearchMode === m ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {m === 'brief' ? 'Quick Brief' : 'Full'}
                      </button>
                    ))}
                  </div>
                  <button
                  onClick={async () => {
                    if (!p.employerOrg) return;
                    setOrgResearchLoading(true);
                    setOrgResearchContent('');
                    try {
                      const res = await fetch('/api/ai/research/organisation', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orgName: String(p.employerOrg), mode: orgResearchMode }),
                      });
                      const data = await res.json();
                      if (!res.ok || data.error) throw new Error(data.error || 'Research failed');
                      const CHAT = [
                        /^if you('d| would)? (want|like|need|have)/i,
                        /^i can also/i, /^i could also/i, /^let me know/i,
                        /^feel free to/i, /^would you like/i,
                        /^please (let me know|don't hesitate)/i,
                        /^don't hesitate/i, /^is there anything (else|more)/i,
                        /^should you (want|need|require)/i,
                        /^if (there are|you have) (any|further)/i,
                      ];
                      const lines = (data.content ?? '').split('\n');
                      let end = lines.length;
                      while (end > 0 && (!lines[end-1].trim() || CHAT.some((p: RegExp) => p.test(lines[end-1].trim())))) end--;
                      setOrgResearchContent(lines.slice(0, end).join('\n'));
                    } catch (err) {
                      setOrgResearchContent(`**Error:** ${err instanceof Error ? err.message : 'Research failed'}`);
                    } finally {
                      setOrgResearchLoading(false);
                    }
                  }}
                  disabled={orgResearchLoading || !p.employerOrg}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                    !p.employerOrg
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : orgResearchLoading
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-sky-500 text-white hover:bg-sky-600'
                  )}
                >
                  {orgResearchLoading ? 'Researching...' : 'Research Organisation'}
                </button>
                </div>
              </div>

              {orgResearchContent && (
                <div className="flex items-center justify-end gap-1 -mt-2">
                  {(['word', 'csv', 'pdf'] as const).map(fmt => (
                    <button
                      key={fmt}
                      onClick={async () => {
                        setOrgExportBusy(fmt);
                        try {
                          const orgTitle = String(p.employerOrg ?? 'Organisation');
                          if (fmt === 'word') await exportToWord(orgResearchContent, orgTitle);
                          else if (fmt === 'csv') exportToCSV(orgResearchContent, orgTitle);
                          else exportToPDF(orgResearchContent, orgTitle);
                        } finally { setOrgExportBusy(null); }
                      }}
                      disabled={!!orgExportBusy}
                      className={cn(
                        'rounded px-2 py-0.5 text-[10px] font-semibold border transition-colors',
                        orgExportBusy === fmt
                          ? 'border-sky-200 bg-sky-100 text-sky-400 cursor-wait'
                          : 'border-sky-300 text-sky-700 hover:bg-sky-100 disabled:opacity-40'
                      )}
                    >
                      {orgExportBusy === fmt ? '…' : fmt === 'word' ? 'Word' : fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}

              {orgResearchContent ? (
                <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm prose prose-sm max-w-none dark:prose-invert">
                  {orgResearchContent.split('\n').map((line, i) => {
                    const renderInline = (text: string): React.ReactNode[] => {
                      const tokens = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
                      return tokens.map((token, j) => {
                        if (token.startsWith('**') && token.endsWith('**')) return <strong key={j}>{token.slice(2, -2)}</strong>;
                        const lm = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
                        if (lm) {
                          const isCitationNum = /^\d+$/.test(lm[1]);
                          return isCitationNum
                            ? <a key={j} href={lm[2]} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:text-sky-800 font-medium no-underline align-super text-[10px]">[{lm[1]}]</a>
                            : <a key={j} href={lm[2]} target="_blank" rel="noopener noreferrer" className="text-sky-600 underline underline-offset-2 hover:text-sky-800 break-all">{lm[1]}</a>;
                        }
                        return token;
                      });
                    };
                    if (line.startsWith('## ')) return <h2 key={i} className="mt-5 mb-2 text-base font-semibold border-b border-sky-200 pb-1">{renderInline(line.slice(3))}</h2>;
                    if (line.startsWith('### ')) return <h3 key={i} className="mt-3 mb-1 text-sm font-semibold">{renderInline(line.slice(4))}</h3>;
                    if (line.startsWith('# ')) return <h1 key={i} className="mt-4 mb-2 text-lg font-bold">{renderInline(line.slice(2))}</h1>;
                    if (line.startsWith('- ')) return <li key={i} className="ml-4 list-disc">{renderInline(line.slice(2))}</li>;
                    if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-xs">{renderInline(line.replace(/^\d+\.\s/, ''))}</li>;
                    if (line.startsWith('---')) return <hr key={i} className="my-3" />;
                    if (line.trim() === '') return <br key={i} />;
                    return <p key={i} className="my-1">{renderInline(line)}</p>;
                  })}
                </div>
              ) : !orgResearchLoading ? (
                <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-sky-200 text-sm text-muted-foreground">
                  {p.employerOrg
                    ? <>Click &ldquo;Research Organisation&rdquo; to search for public information on {String(p.employerOrg)}</>
                    : 'No employer organisation on record for this stakeholder'}
                </div>
              ) : (
                <div className="flex h-24 items-center justify-center">
                  <svg className="h-6 w-6 animate-spin text-sky-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Next Best Actions */}
            {recommendations.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3">Next Best Actions</h3>
                <div className="space-y-2">
                  {recommendations.map((r, i) => (
                    <div key={i} className={cn(
                      'rounded-lg border p-3',
                      r.priority === 'high' ? 'border-red-200 bg-red-50' :
                      r.priority === 'medium' ? 'border-amber-200 bg-amber-50' :
                      'border-border bg-background'
                    )}>
                      <div className="flex items-start gap-2">
                        <span className="text-sm">
                          {r.type === 'action' ? '⚡' : r.type === 'connection' ? '🤝' : r.type === 'event' ? '📅' : '🔔'}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold">{r.title}</p>
                            <span className={cn(
                              'rounded-full px-1.5 py-0.5 text-[9px] font-medium',
                              r.priority === 'high' ? 'bg-red-100 text-red-700' :
                              r.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                              'bg-gray-100 text-gray-600'
                            )}>
                              {r.priority}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">{r.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
