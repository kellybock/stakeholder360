'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

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
    if (!line || CHAT_PATTERNS.some(p => p.test(line))) {
      end--;
    } else {
      break;
    }
  }
  return lines.slice(0, end).join('\n');
}

export default function ResearchPage() {
  const [name, setName] = useState('');
  const [organisation, setOrganisation] = useState('');
  const [linkedinHandle, setLinkedinHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const handleResearch = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setResult('');
    setError('');

    try {
      const res = await fetch('/api/ai/research/general', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), organisation: organisation.trim(), linkedinHandle: linkedinHandle.trim() }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Research failed');
      setResult(stripConversational(data.content ?? ''));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Research failed');
    } finally {
      setLoading(false);
    }
  };

  const renderMarkdown = (content: string) => {
    const renderInline = (text: string): React.ReactNode[] => {
      // Handle **bold** and [text](url) links together
      const tokens = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
      return tokens.map((token, j) => {
        if (token.startsWith('**') && token.endsWith('**')) {
          return <strong key={j}>{token.slice(2, -2)}</strong>;
        }
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
      if (line.startsWith('## ')) return <h2 key={i} className="mt-5 mb-2 text-base font-semibold border-b border-sky-200 pb-1">{renderInline(line.slice(3))}</h2>;
      if (line.startsWith('### ')) return <h3 key={i} className="mt-3 mb-1 text-sm font-semibold">{renderInline(line.slice(4))}</h3>;
      if (line.startsWith('# ')) return <h1 key={i} className="mt-4 mb-2 text-lg font-bold">{renderInline(line.slice(2))}</h1>;
      if (line.startsWith('- ')) return <li key={i} className="ml-4 list-disc">{renderInline(line.slice(2))}</li>;
      if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-xs">{renderInline(line.replace(/^\d+\.\s/, ''))}</li>;
      if (line.startsWith('---')) return <hr key={i} className="my-3" />;
      if (line.trim() === '') return <br key={i} />;
      return <p key={i} className="my-1">{renderInline(line)}</p>;
    });
  };

  const canSubmit = name.trim().length > 0 && !loading;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold">Individual Research</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search for public information on any individual using AI web search.
        </p>
      </div>

      {/* Input form */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="name">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && canSubmit) handleResearch(); }}
            placeholder="e.g. Tan Wei Ming"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="organisation">
              Organisation <span className="text-muted-foreground text-xs font-normal">(optional)</span>
            </label>
            <input
              id="organisation"
              type="text"
              value={organisation}
              onChange={e => setOrganisation(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && canSubmit) handleResearch(); }}
              placeholder="e.g. National Youth Council"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="linkedin">
              LinkedIn Handle <span className="text-muted-foreground text-xs font-normal">(optional)</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">@</span>
              <input
                id="linkedin"
                type="text"
                value={linkedinHandle}
                onChange={e => setLinkedinHandle(e.target.value.replace(/^@/, ''))}
                onKeyDown={e => { if (e.key === 'Enter' && canSubmit) handleResearch(); }}
                placeholder="tanweiming"
                className="w-full rounded-lg border border-border bg-background pl-7 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">
            Searches the web for publicly available information about this individual.
          </p>
          <button
            onClick={handleResearch}
            disabled={!canSubmit}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              canSubmit
                ? 'bg-sky-500 text-white hover:bg-sky-600'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            {loading ? (
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

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Results */}
      {(result || loading) && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex items-center justify-center rounded bg-sky-500 px-1.5 py-0.5 text-[10px] font-bold text-white">P</span>
            <span className="text-sm font-semibold text-sky-700">
              Research results for {name}
              {organisation && <span className="font-normal text-sky-600"> · {organisation}</span>}
            </span>
          </div>
          {result ? (
            <div className="text-sm prose prose-sm max-w-none">
              {renderMarkdown(result)}
            </div>
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
    </div>
  );
}
