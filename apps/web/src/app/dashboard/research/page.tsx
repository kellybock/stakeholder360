'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { exportToCSV, exportToPDF, exportToWord } from '@/lib/export-research';

const CHAT_PATTERNS = [
  /^if you('d| would)? (want|like|need|have)/i,
  /^i can also/i,
  /^i could also/i,
  /^let me know/i,
  /^feel free to/i,
  /^would you like/i,
  /^please (let me know|don't hesitate)/i,
  /^don't hesitate/i,
  /^is there anything (else|more)/i,
  /^should you (want|need|require)/i,
  /^if (there are|you have) (any|further)/i,
];

function stripConversational(text: string): string {
  const lines = text.split('\n');
  let end = lines.length;
  while (end > 0) {
    const line = lines[end - 1].trim();
    if (!line || CHAT_PATTERNS.some(p => p.test(line))) end--;
    else break;
  }
  return lines.slice(0, end).join('\n');
}

function renderMarkdown(content: string) {
  const renderInline = (text: string): React.ReactNode[] => {
    const tokens = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
    return tokens.map((token, j) => {
      if (token.startsWith('**') && token.endsWith('**'))
        return <strong key={j}>{token.slice(2, -2)}</strong>;
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        const isCitationNumber = /^\d+$/.test(linkMatch[1]);
        return isCitationNumber ? (
          <a key={j} href={linkMatch[2]} target="_blank" rel="noopener noreferrer"
            className="text-sky-600 hover:text-sky-800 font-medium no-underline align-super text-[10px]">
            [{linkMatch[1]}]
          </a>
        ) : (
          <a key={j} href={linkMatch[2]} target="_blank" rel="noopener noreferrer"
            className="text-sky-600 underline underline-offset-2 hover:text-sky-800 break-all">
            {linkMatch[1]}
          </a>
        );
      }
      return token;
    });
  };
  return content.split('\n').map((line, i) => {
    if (line.startsWith('## '))  return <h2 key={i} className="mt-5 mb-2 text-base font-semibold border-b border-sky-200 pb-1">{renderInline(line.slice(3))}</h2>;
    if (line.startsWith('### ')) return <h3 key={i} className="mt-3 mb-1 text-sm font-semibold">{renderInline(line.slice(4))}</h3>;
    if (line.startsWith('# '))   return <h1 key={i} className="mt-4 mb-2 text-lg font-bold">{renderInline(line.slice(2))}</h1>;
    if (line.startsWith('- '))   return <li key={i} className="ml-4 list-disc">{renderInline(line.slice(2))}</li>;
    if (/^\d+\.\s/.test(line))   return <li key={i} className="ml-4 list-decimal text-xs">{renderInline(line.replace(/^\d+\.\s/, ''))}</li>;
    if (line.startsWith('---'))  return <hr key={i} className="my-3" />;
    if (line.trim() === '')      return <br key={i} />;
    return <p key={i} className="my-1">{renderInline(line)}</p>;
  });
}

function ExportButtons({ content, title }: { content: string; title: string }) {
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (fmt: 'word' | 'csv' | 'pdf') => {
    setBusy(fmt);
    try {
      if (fmt === 'word') await exportToWord(content, title);
      else if (fmt === 'csv') exportToCSV(content, title);
      else exportToPDF(content, title);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {(['word', 'csv', 'pdf'] as const).map(fmt => (
        <button
          key={fmt}
          onClick={() => run(fmt)}
          disabled={!!busy}
          className={cn(
            'rounded px-2 py-0.5 text-[10px] font-semibold border transition-colors',
            busy === fmt
              ? 'border-sky-200 bg-sky-100 text-sky-400 cursor-wait'
              : 'border-sky-300 text-sky-700 hover:bg-sky-100 disabled:opacity-40'
          )}
        >
          {busy === fmt ? '…' : fmt === 'word' ? 'Word' : fmt.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export default function ResearchPage() {
  const [activeTab, setActiveTab] = useState<'individual' | 'organisation'>('individual');

  // Individual state
  const [name, setName] = useState('');
  const [organisation, setOrganisation] = useState('');
  const [linkedinHandle, setLinkedinHandle] = useState('');
  const [indMode, setIndMode] = useState<'brief' | 'full'>('brief');
  const [indLoading, setIndLoading] = useState(false);
  const [indResult, setIndResult] = useState('');
  const [indResultMode, setIndResultMode] = useState<'brief' | 'full'>('brief');
  const [indError, setIndError] = useState('');

  // Organisation state
  const [orgName, setOrgName] = useState('');
  const [website, setWebsite] = useState('');
  const [sector, setSector] = useState('');
  const [orgMode, setOrgMode] = useState<'brief' | 'full'>('brief');
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgResult, setOrgResult] = useState('');
  const [orgResultMode, setOrgResultMode] = useState<'brief' | 'full'>('brief');
  const [orgError, setOrgError] = useState('');

  const handleIndividual = async () => {
    if (!name.trim()) return;
    setIndLoading(true);
    setIndResult('');
    setIndError('');
    const modeSnapshot = indMode;
    try {
      const res = await fetch('/api/ai/research/general', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), organisation: organisation.trim(), linkedinHandle: linkedinHandle.trim(), mode: modeSnapshot }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Research failed');
      setIndResult(stripConversational(data.content ?? ''));
      setIndResultMode(modeSnapshot);
    } catch (err) {
      setIndError(err instanceof Error ? err.message : 'Research failed');
    } finally {
      setIndLoading(false);
    }
  };

  const handleOrganisation = async () => {
    if (!orgName.trim()) return;
    setOrgLoading(true);
    setOrgResult('');
    setOrgError('');
    const modeSnapshot = orgMode;
    try {
      const res = await fetch('/api/ai/research/organisation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgName: orgName.trim(), website: website.trim(), sector: sector.trim(), mode: modeSnapshot }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Research failed');
      setOrgResult(stripConversational(data.content ?? ''));
      setOrgResultMode(modeSnapshot);
    } catch (err) {
      setOrgError(err instanceof Error ? err.message : 'Research failed');
    } finally {
      setOrgLoading(false);
    }
  };

  const indCanSubmit = name.trim().length > 0 && !indLoading;
  const orgCanSubmit = orgName.trim().length > 0 && !orgLoading;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold">Research</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search for public information using AI web search.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-0 border-b border-border">
        {(['individual', 'organisation'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'whitespace-nowrap border-b-2 px-5 py-2.5 text-sm font-medium capitalize transition-colors',
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Individual tab ─────────────────────────────────────────────── */}
      {activeTab === 'individual' && (
        <>
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="ind-name">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="ind-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && indCanSubmit) handleIndividual(); }}
                placeholder="e.g. Tan Wei Ming"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="ind-org">
                  Organisation <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                </label>
                <input
                  id="ind-org"
                  type="text"
                  value={organisation}
                  onChange={e => setOrganisation(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && indCanSubmit) handleIndividual(); }}
                  placeholder="e.g. National Youth Council"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="ind-linkedin">
                  LinkedIn Handle <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">@</span>
                  <input
                    id="ind-linkedin"
                    type="text"
                    value={linkedinHandle}
                    onChange={e => setLinkedinHandle(e.target.value.replace(/^@/, ''))}
                    onKeyDown={e => { if (e.key === 'Enter' && indCanSubmit) handleIndividual(); }}
                    placeholder="tanweiming"
                    className="w-full rounded-lg border border-border bg-background pl-7 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            </div>
            {/* Mode toggle */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Report type</span>
              <div className="inline-flex rounded-lg border border-border bg-muted p-0.5">
                {(['brief', 'full'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setIndMode(m)}
                    className={cn(
                      'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                      indMode === m ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {m === 'brief' ? 'Quick Brief' : 'Full Report'}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground">
                {indMode === 'brief' ? '~250 words · 5 key sections' : '8 sections · detailed'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-muted-foreground">
                Searches the web for publicly available information about this individual.
              </p>
              <button
                onClick={handleIndividual}
                disabled={!indCanSubmit}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  indCanSubmit ? 'bg-sky-500 text-white hover:bg-sky-600' : 'bg-muted text-muted-foreground cursor-not-allowed'
                )}
              >
                {indLoading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Researching...
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center justify-center rounded bg-white/20 px-1 text-[10px] font-bold">P</span>
                    Research
                  </>
                )}
              </button>
            </div>
          </div>

          {indError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{indError}</div>
          )}

          {(indResult || indLoading) && (
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-6">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="inline-flex shrink-0 items-center justify-center rounded bg-sky-500 px-1.5 py-0.5 text-[10px] font-bold text-white">P</span>
                  <span className="text-sm font-semibold text-sky-700 truncate">
                    {name}
                    {organisation && <span className="font-normal text-sky-600"> · {organisation}</span>}
                  </span>
                  <span className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
                    indResultMode === 'brief' ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-500'
                  )}>
                    {indResultMode === 'brief' ? 'Quick Brief' : 'Full Report'}
                  </span>
                </div>
                {indResult && <ExportButtons content={indResult} title={name} />}
              </div>
              {indResult ? (
                <div className="text-sm prose prose-sm max-w-none">{renderMarkdown(indResult)}</div>
              ) : (
                <div className="flex h-20 items-center justify-center">
                  <svg className="h-6 w-6 animate-spin text-sky-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Organisation tab ───────────────────────────────────────────── */}
      {activeTab === 'organisation' && (
        <>
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="org-name">
                Organisation Name <span className="text-red-500">*</span>
              </label>
              <input
                id="org-name"
                type="text"
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && orgCanSubmit) handleOrganisation(); }}
                placeholder="e.g. National Youth Council"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="org-website">
                  Website <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                </label>
                <input
                  id="org-website"
                  type="text"
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && orgCanSubmit) handleOrganisation(); }}
                  placeholder="e.g. nyc.gov.sg"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="org-sector">
                  Sector <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                </label>
                <input
                  id="org-sector"
                  type="text"
                  value={sector}
                  onChange={e => setSector(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && orgCanSubmit) handleOrganisation(); }}
                  placeholder="e.g. youth development, social services"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
            {/* Mode toggle */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Report type</span>
              <div className="inline-flex rounded-lg border border-border bg-muted p-0.5">
                {(['brief', 'full'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setOrgMode(m)}
                    className={cn(
                      'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                      orgMode === m ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {m === 'brief' ? 'Quick Brief' : 'Full Report'}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground">
                {orgMode === 'brief' ? '~250 words · 5 key sections' : '8 sections · detailed'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-muted-foreground">
                Searches the web for publicly available information about this organisation.
              </p>
              <button
                onClick={handleOrganisation}
                disabled={!orgCanSubmit}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  orgCanSubmit ? 'bg-sky-500 text-white hover:bg-sky-600' : 'bg-muted text-muted-foreground cursor-not-allowed'
                )}
              >
                {orgLoading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Researching...
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center justify-center rounded bg-white/20 px-1 text-[10px] font-bold">P</span>
                    Research
                  </>
                )}
              </button>
            </div>
          </div>

          {orgError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{orgError}</div>
          )}

          {(orgResult || orgLoading) && (
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-6">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="inline-flex shrink-0 items-center justify-center rounded bg-sky-500 px-1.5 py-0.5 text-[10px] font-bold text-white">P</span>
                  <span className="text-sm font-semibold text-sky-700 truncate">
                    {orgName}
                    {sector && <span className="font-normal text-sky-600"> · {sector}</span>}
                  </span>
                  <span className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
                    orgResultMode === 'brief' ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-500'
                  )}>
                    {orgResultMode === 'brief' ? 'Quick Brief' : 'Full Report'}
                  </span>
                </div>
                {orgResult && <ExportButtons content={orgResult} title={orgName} />}
              </div>
              {orgResult ? (
                <div className="text-sm prose prose-sm max-w-none">{renderMarkdown(orgResult)}</div>
              ) : (
                <div className="flex h-20 items-center justify-center">
                  <svg className="h-6 w-6 animate-spin text-sky-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
