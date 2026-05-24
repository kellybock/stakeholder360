'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ProfileHeader } from '@/components/stakeholder/profile-header';
import { Timeline } from '@/components/stakeholder/timeline';
import { EngagementTimeline } from '@/components/stakeholder/engagement-timeline';

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
};

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'linkedin', label: 'LinkedIn' },
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
  const [recommendations, setRecommendations] = useState<{ type: string; priority: string; title: string; description: string }[]>([]);
  type LinkedinEducation = { school: string; degree: string; fieldOfStudy: string; startYear: string; endYear: string };
  type LinkedinExperience = { title: string; company: string; location: string; startDate: string; endDate: string; description: string };
  const [linkedinData, setLinkedinData] = useState<{
    headline: string;
    summary: string;
    location: string;
    education: LinkedinEducation[];
    experiences: LinkedinExperience[];
    skills: string[];
    linkedinUrl: string;
    updatedAt: string;
  } | null>(null);
  const [linkedinLoading, setLinkedinLoading] = useState(false);
  const [linkedinSaving, setLinkedinSaving] = useState(false);
  const [linkedinEditing, setLinkedinEditing] = useState(false);
  const [linkedinForm, setLinkedinForm] = useState({
    headline: '',
    summary: '',
    location: '',
    linkedinUrl: '',
    education: [] as LinkedinEducation[],
    experiences: [] as LinkedinExperience[],
    skills: '',
  });

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

    fetch(`/api/stakeholders/${id}/linkedin`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.data) setLinkedinData(d.data); })
      .catch(() => {});
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
        profile={p as never}
        crossAgencyCount={data.crossAgencyCount}
        agencies={data.agencies}
        engagement={data.engagement}
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
              <p className="text-[10px] text-muted-foreground">Engagement</p>
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

        {tab === 'linkedin' && (
          <div className="space-y-6">
            {/* Header with edit/save controls */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">LinkedIn Profile</h3>
                <p className="text-xs text-muted-foreground">
                  {linkedinData?.updatedAt ? `Last updated: ${new Date(linkedinData.updatedAt).toLocaleDateString()}` : 'Add education, experience, and skills manually'}
                </p>
              </div>
              {!linkedinEditing ? (
                <button
                  onClick={() => {
                    setLinkedinEditing(true);
                    setLinkedinForm({
                      headline: linkedinData?.headline ?? '',
                      summary: linkedinData?.summary ?? '',
                      location: linkedinData?.location ?? '',
                      linkedinUrl: linkedinData?.linkedinUrl ?? (p.linkedinHandle as string ?? ''),
                      education: linkedinData?.education ?? [],
                      experiences: linkedinData?.experiences ?? [],
                      skills: linkedinData?.skills.join(', ') ?? '',
                    });
                  }}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  {linkedinData ? 'Edit' : '+ Add Details'}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setLinkedinEditing(false)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setLinkedinSaving(true);
                      try {
                        const res = await fetch(`/api/stakeholders/${id}/linkedin`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            ...linkedinForm,
                            skills: linkedinForm.skills.split(',').map(s => s.trim()).filter(Boolean),
                          }),
                        });
                        if (res.ok) {
                          const json = await res.json();
                          setLinkedinData(json.data);
                          setLinkedinEditing(false);
                        }
                      } finally {
                        setLinkedinSaving(false);
                      }
                    }}
                    disabled={linkedinSaving}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {linkedinSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>

            {/* Edit Mode */}
            {linkedinEditing && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Headline / Title</label>
                    <input type="text" value={linkedinForm.headline} onChange={e => setLinkedinForm(f => ({ ...f, headline: e.target.value }))} placeholder="e.g. Youth Advocate & Community Leader" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Location</label>
                    <input type="text" value={linkedinForm.location} onChange={e => setLinkedinForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Singapore" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">LinkedIn URL</label>
                  <input type="text" value={linkedinForm.linkedinUrl} onChange={e => setLinkedinForm(f => ({ ...f, linkedinUrl: e.target.value }))} placeholder="e.g. linkedin.com/in/username" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Summary / About</label>
                  <textarea value={linkedinForm.summary} onChange={e => setLinkedinForm(f => ({ ...f, summary: e.target.value }))} placeholder="Brief professional summary..." rows={3} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none" />
                </div>

                {/* Experience section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-muted-foreground">Experience</label>
                    <button onClick={() => setLinkedinForm(f => ({ ...f, experiences: [...f.experiences, { title: '', company: '', location: '', startDate: '', endDate: '', description: '' }] }))} className="text-xs text-primary hover:underline">+ Add</button>
                  </div>
                  <div className="space-y-3">
                    {linkedinForm.experiences.map((exp, i) => (
                      <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="grid grid-cols-2 gap-2 flex-1">
                            <input type="text" value={exp.title} onChange={e => { const exps = [...linkedinForm.experiences]; exps[i] = { ...exps[i], title: e.target.value }; setLinkedinForm(f => ({ ...f, experiences: exps })); }} placeholder="Job title" className="rounded-md border border-border bg-background px-2 py-1.5 text-xs" />
                            <input type="text" value={exp.company} onChange={e => { const exps = [...linkedinForm.experiences]; exps[i] = { ...exps[i], company: e.target.value }; setLinkedinForm(f => ({ ...f, experiences: exps })); }} placeholder="Company" className="rounded-md border border-border bg-background px-2 py-1.5 text-xs" />
                          </div>
                          <button onClick={() => setLinkedinForm(f => ({ ...f, experiences: f.experiences.filter((_, j) => j !== i) }))} className="ml-2 text-xs text-red-500 hover:text-red-700">Remove</button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <input type="text" value={exp.location} onChange={e => { const exps = [...linkedinForm.experiences]; exps[i] = { ...exps[i], location: e.target.value }; setLinkedinForm(f => ({ ...f, experiences: exps })); }} placeholder="Location" className="rounded-md border border-border bg-background px-2 py-1.5 text-xs" />
                          <input type="text" value={exp.startDate} onChange={e => { const exps = [...linkedinForm.experiences]; exps[i] = { ...exps[i], startDate: e.target.value }; setLinkedinForm(f => ({ ...f, experiences: exps })); }} placeholder="Start (e.g. 2022-01)" className="rounded-md border border-border bg-background px-2 py-1.5 text-xs" />
                          <input type="text" value={exp.endDate} onChange={e => { const exps = [...linkedinForm.experiences]; exps[i] = { ...exps[i], endDate: e.target.value }; setLinkedinForm(f => ({ ...f, experiences: exps })); }} placeholder="End (or Present)" className="rounded-md border border-border bg-background px-2 py-1.5 text-xs" />
                        </div>
                        <textarea value={exp.description} onChange={e => { const exps = [...linkedinForm.experiences]; exps[i] = { ...exps[i], description: e.target.value }; setLinkedinForm(f => ({ ...f, experiences: exps })); }} placeholder="Description (optional)" rows={2} className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs resize-none" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Education section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-muted-foreground">Education</label>
                    <button onClick={() => setLinkedinForm(f => ({ ...f, education: [...f.education, { school: '', degree: '', fieldOfStudy: '', startYear: '', endYear: '' }] }))} className="text-xs text-primary hover:underline">+ Add</button>
                  </div>
                  <div className="space-y-3">
                    {linkedinForm.education.map((edu, i) => (
                      <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                        <div className="flex justify-between items-start">
                          <input type="text" value={edu.school} onChange={e => { const edus = [...linkedinForm.education]; edus[i] = { ...edus[i], school: e.target.value }; setLinkedinForm(f => ({ ...f, education: edus })); }} placeholder="School / University" className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs" />
                          <button onClick={() => setLinkedinForm(f => ({ ...f, education: f.education.filter((_, j) => j !== i) }))} className="ml-2 text-xs text-red-500 hover:text-red-700">Remove</button>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <input type="text" value={edu.degree} onChange={e => { const edus = [...linkedinForm.education]; edus[i] = { ...edus[i], degree: e.target.value }; setLinkedinForm(f => ({ ...f, education: edus })); }} placeholder="Degree" className="rounded-md border border-border bg-background px-2 py-1.5 text-xs" />
                          <input type="text" value={edu.fieldOfStudy} onChange={e => { const edus = [...linkedinForm.education]; edus[i] = { ...edus[i], fieldOfStudy: e.target.value }; setLinkedinForm(f => ({ ...f, education: edus })); }} placeholder="Field of study" className="rounded-md border border-border bg-background px-2 py-1.5 text-xs" />
                          <input type="text" value={edu.startYear} onChange={e => { const edus = [...linkedinForm.education]; edus[i] = { ...edus[i], startYear: e.target.value }; setLinkedinForm(f => ({ ...f, education: edus })); }} placeholder="Start year" className="rounded-md border border-border bg-background px-2 py-1.5 text-xs" />
                          <input type="text" value={edu.endYear} onChange={e => { const edus = [...linkedinForm.education]; edus[i] = { ...edus[i], endYear: e.target.value }; setLinkedinForm(f => ({ ...f, education: edus })); }} placeholder="End year" className="rounded-md border border-border bg-background px-2 py-1.5 text-xs" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Skills */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Skills (comma-separated)</label>
                  <input type="text" value={linkedinForm.skills} onChange={e => setLinkedinForm(f => ({ ...f, skills: e.target.value }))} placeholder="e.g. Public Speaking, Community Engagement, Project Management" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                </div>
              </div>
            )}

            {/* View Mode */}
            {!linkedinEditing && linkedinData && (
              <>
                {/* Profile summary */}
                {(linkedinData.headline || linkedinData.summary || linkedinData.location || linkedinData.linkedinUrl) && (
                  <div className="rounded-lg border border-border p-4">
                    {linkedinData.headline && <p className="text-sm font-medium">{linkedinData.headline}</p>}
                    {linkedinData.location && <p className="mt-0.5 text-xs text-muted-foreground">{linkedinData.location}</p>}
                    {linkedinData.linkedinUrl && (
                      <p className="mt-0.5 text-xs text-primary">
                        <a href={linkedinData.linkedinUrl.startsWith('http') ? linkedinData.linkedinUrl : `https://${linkedinData.linkedinUrl}`} target="_blank" rel="noopener noreferrer" className="hover:underline">{linkedinData.linkedinUrl}</a>
                      </p>
                    )}
                    {linkedinData.summary && <p className="mt-2 text-sm text-muted-foreground">{linkedinData.summary}</p>}
                  </div>
                )}

                {/* Experience */}
                {linkedinData.experiences.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Experience</h4>
                    <div className="space-y-2">
                      {linkedinData.experiences.map((exp, i) => (
                        <div key={i} className="rounded-lg border border-border p-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-medium">{exp.title}</p>
                              <p className="text-xs text-muted-foreground">{exp.company}{exp.location ? ` • ${exp.location}` : ''}</p>
                            </div>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {exp.startDate || ''} — {exp.endDate || 'Present'}
                            </span>
                          </div>
                          {exp.description && <p className="mt-1.5 text-xs text-muted-foreground line-clamp-3">{exp.description}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education */}
                {linkedinData.education.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Education</h4>
                    <div className="space-y-2">
                      {linkedinData.education.map((edu, i) => (
                        <div key={i} className="rounded-lg border border-border p-3">
                          <p className="text-sm font-medium">{edu.school}</p>
                          <p className="text-xs text-muted-foreground">
                            {[edu.degree, edu.fieldOfStudy].filter(Boolean).join(' in ') || 'Degree not specified'}
                          </p>
                          {(edu.startYear || edu.endYear) && (
                            <p className="text-[10px] text-muted-foreground">{edu.startYear || '?'} — {edu.endYear || 'Present'}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skills */}
                {linkedinData.skills.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Skills</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {linkedinData.skills.map(skill => (
                        <span key={skill} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs">{skill}</span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Empty state */}
            {!linkedinEditing && !linkedinData && !linkedinLoading && (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                No LinkedIn profile data yet. Click &ldquo;+ Add Details&rdquo; to add education, experience, and skills.
              </div>
            )}
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
