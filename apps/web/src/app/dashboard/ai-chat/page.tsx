'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type Conversation = {
  id: string;
  title: string;
  provider: string;
  messages: Message[];
  stakeholderIds: string[];
  createdAt: string;
};

type AIProvider = {
  provider: string;
  label: string;
  hasKey: boolean;
  enabled: boolean;
  model: string;
};

const FALLBACK_PROVIDERS = [
  { provider: 'claude', label: 'Anthropic Claude', hasKey: false, enabled: false, model: 'claude-sonnet-4-6-20250715' },
  { provider: 'openai', label: 'OpenAI', hasKey: false, enabled: false, model: 'gpt-4o' },
  { provider: 'gemini', label: 'Google Gemini', hasKey: false, enabled: false, model: 'gemini-2.0-flash' },
];

const MODEL_OPTIONS: Record<string, { value: string; label: string }[]> = {
  claude: [
    { value: 'claude-opus-4-7-20250715', label: 'Opus 4.7' },
    { value: 'claude-opus-4-6-20250611', label: 'Opus 4.6' },
    { value: 'claude-sonnet-4-6-20250715', label: 'Sonnet 4.6' },
    { value: 'claude-sonnet-4-20250514', label: 'Sonnet 4.0' },
    { value: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5' },
    { value: 'claude-3-5-haiku-20241022', label: 'Haiku 3.5' },
  ],
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'o3', label: 'o3' },
  ],
  gemini: [
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  ],
};

export default function AIChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [provider, setProvider] = useState('claude');
  const [selectedModel, setSelectedModel] = useState('');
  const [aiProviders, setAiProviders] = useState<AIProvider[]>(FALLBACK_PROVIDERS);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [stakeholderSearch, setStakeholderSearch] = useState('');
  const [stakeholderResults, setStakeholderResults] = useState<{ id: string; fullName: string; caseStatus: string }[]>([]);
  const [pinnedStakeholders, setPinnedStakeholders] = useState<{ id: string; fullName: string }[]>([]);
  const [showPinSearch, setShowPinSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeConv = conversations.find(c => c.id === activeConvId) ?? null;

  useEffect(() => {
    fetch('/api/admin/ai-settings')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        setAiProviders(d.providers);
        if (d.defaultProvider) setProvider(d.defaultProvider);
        const defaultP = d.providers.find((p: AIProvider) => p.provider === d.defaultProvider);
        if (defaultP?.model) setSelectedModel(defaultP.model);
      })
      .catch(() => {});
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [activeConv?.messages.length, scrollToBottom]);

  useEffect(() => {
    if (!stakeholderSearch.trim()) {
      setStakeholderResults([]);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/stakeholders?search=${encodeURIComponent(stakeholderSearch)}&limit=5`)
        .then(r => r.json())
        .then(d => setStakeholderResults(d.data?.map((s: Record<string, unknown>) => ({
          id: s.id, fullName: s.fullName, caseStatus: s.caseStatus,
        })) ?? []))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [stakeholderSearch]);

  function newConversation() {
    const conv: Conversation = {
      id: crypto.randomUUID(),
      title: 'New Conversation',
      provider,
      messages: [],
      stakeholderIds: pinnedStakeholders.map(s => s.id),
      createdAt: new Date().toISOString(),
    };
    setConversations(prev => [conv, ...prev]);
    setActiveConvId(conv.id);
  }

  async function sendMessage() {
    if (!input.trim() || isStreaming) return;

    let conv = activeConv;
    if (!conv) {
      const newConv: Conversation = {
        id: crypto.randomUUID(),
        title: input.trim().slice(0, 50),
        provider,
        messages: [],
        stakeholderIds: pinnedStakeholders.map(s => s.id),
        createdAt: new Date().toISOString(),
      };
      setConversations(prev => [newConv, ...prev]);
      setActiveConvId(newConv.id);
      conv = newConv;
    }

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: input.trim() };
    const assistantMsg: Message = { id: crypto.randomUUID(), role: 'assistant', content: '' };

    const updatedMessages = [...conv.messages, userMsg, assistantMsg];
    const convId = conv.id;

    setConversations(prev => prev.map(c =>
      c.id === convId
        ? { ...c, messages: updatedMessages, title: c.messages.length === 0 ? input.trim().slice(0, 50) : c.title }
        : c
    ));
    setInput('');
    setIsStreaming(true);

    try {
      const apiMessages = [...conv.messages, userMsg].map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          provider,
          stakeholderIds: pinnedStakeholders.map(s => s.id),
          stream: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Chat request failed');
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.text) {
              accumulated += parsed.text;
              setConversations(prev => prev.map(c =>
                c.id === convId
                  ? {
                      ...c,
                      messages: c.messages.map(m =>
                        m.id === assistantMsg.id ? { ...m, content: accumulated } : m
                      ),
                    }
                  : c
              ));
            }
            if (parsed.done) break;
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }
    } catch (err) {
      const errorText = err instanceof Error ? err.message : 'An error occurred';
      setConversations(prev => prev.map(c =>
        c.id === convId
          ? {
              ...c,
              messages: c.messages.map(m =>
                m.id === assistantMsg.id ? { ...m, content: `**Error:** ${errorText}` } : m
              ),
            }
          : c
      ));
    } finally {
      setIsStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Assistant</h1>
        <p className="text-sm text-muted-foreground">
          Ask questions about stakeholders, generate briefs, and get recommendations
        </p>
      </div>

      <div className="flex flex-1 overflow-hidden rounded-xl border border-border bg-card">
        {/* Sidebar - conversations */}
        <div className="flex w-64 flex-col border-r border-border">
          <div className="p-3">
            <button
              onClick={newConversation}
              className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              + New Conversation
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {conversations.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
                No conversations yet
              </div>
            ) : (
              conversations.map(c => (
                <button
                  key={c.id}
                  onClick={() => setActiveConvId(c.id)}
                  className={cn(
                    'w-full rounded-lg px-3 py-2 text-left text-xs transition-colors',
                    c.id === activeConvId
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  <p className="truncate font-medium">{c.title}</p>
                  <p className="mt-0.5 text-[10px] opacity-60">
                    {aiProviders.find(p => p.provider === c.provider)?.label.split(' ')[0] ?? c.provider}
                    {' · '}
                    {c.messages.filter(m => m.role === 'user').length} messages
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex flex-1 flex-col">
          {/* Top bar: LLM selector + pinned stakeholders */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
            <span className="text-xs font-medium text-muted-foreground">Provider:</span>
            <select
              value={provider}
              onChange={e => {
                setProvider(e.target.value);
                const p = aiProviders.find(ap => ap.provider === e.target.value);
                if (p?.model) setSelectedModel(p.model);
              }}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs"
            >
              {aiProviders.map(p => (
                <option key={p.provider} value={p.provider} disabled={!p.hasKey || !p.enabled}>
                  {p.label}{!p.hasKey ? ' (no key)' : !p.enabled ? ' (disabled)' : ''}
                </option>
              ))}
            </select>
            <span className="text-xs font-medium text-muted-foreground">Model:</span>
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs"
            >
              {(MODEL_OPTIONS[provider] ?? []).map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>

            <div className="mx-2 h-4 w-px bg-border" />

            <div className="flex items-center gap-1.5">
              {pinnedStakeholders.map(s => (
                <span key={s.id} className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {s.fullName.split(' ')[0]}
                  <button onClick={() => setPinnedStakeholders(prev => prev.filter(p => p.id !== s.id))} className="hover:text-red-500">×</button>
                </span>
              ))}
              <div className="relative">
                <button
                  onClick={() => setShowPinSearch(!showPinSearch)}
                  className="rounded-full border border-dashed border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:border-primary hover:text-primary"
                >
                  + Pin stakeholder
                </button>
                {showPinSearch && (
                  <div className="absolute top-8 left-0 z-50 w-64 rounded-lg border border-border bg-card p-2 shadow-lg">
                    <input
                      type="text"
                      value={stakeholderSearch}
                      onChange={e => setStakeholderSearch(e.target.value)}
                      placeholder="Search stakeholders..."
                      className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
                      autoFocus
                    />
                    <div className="mt-1 max-h-32 overflow-y-auto">
                      {stakeholderResults.map(s => (
                        <button
                          key={s.id}
                          onClick={() => {
                            if (!pinnedStakeholders.find(p => p.id === s.id)) {
                              setPinnedStakeholders(prev => [...prev, { id: s.id, fullName: s.fullName }]);
                            }
                            setShowPinSearch(false);
                            setStakeholderSearch('');
                          }}
                          className="w-full rounded px-2 py-1 text-left text-xs hover:bg-muted"
                        >
                          {s.fullName} <span className="text-muted-foreground">({s.caseStatus})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {!activeConv || activeConv.messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div className="text-4xl">🤖</div>
                <div>
                  <p className="text-sm font-medium">Youth360 AI Assistant</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ask about stakeholders, request meeting briefs, or explore engagement patterns
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    'Who are our most active youth leaders?',
                    'Find stakeholders interested in climate action',
                    'Summarise cross-agency engagement trends',
                    'Which stakeholders are at risk of disengagement?',
                  ].map(q => (
                    <button
                      key={q}
                      onClick={() => { setInput(q); inputRef.current?.focus(); }}
                      className="rounded-lg border border-border p-2.5 text-left text-muted-foreground hover:border-primary hover:text-primary"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {activeConv.messages.map(m => (
                  <div
                    key={m.id}
                    className={cn(
                      'flex gap-3',
                      m.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {m.role === 'assistant' && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        AI
                      </div>
                    )}
                    <div
                      className={cn(
                        'max-w-[75%] rounded-lg px-3.5 py-2.5 text-sm',
                        m.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      {m.role === 'assistant' ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                          {m.content ? (
                            <MarkdownContent content={m.content} />
                          ) : (
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:200ms]" />
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:400ms]" />
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      )}
                    </div>
                    {m.role === 'user' && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold">
                        RM
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border p-3">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about stakeholders..."
                rows={1}
                className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isStreaming}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  input.trim() && !isStreaming
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                )}
              >
                {isStreaming ? (
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="mt-3 mb-1 text-sm font-semibold">{formatInline(line.slice(4))}</h3>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="mt-4 mb-1 text-base font-semibold">{formatInline(line.slice(3))}</h2>);
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="mt-4 mb-2 text-lg font-bold">{formatInline(line.slice(2))}</h1>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={i} className="my-1 ml-4 list-disc space-y-0.5">
          {items.map((item, j) => <li key={j}>{formatInline(item)}</li>)}
        </ul>
      );
      continue;
    } else if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      elements.push(
        <ol key={i} className="my-1 ml-4 list-decimal space-y-0.5">
          {items.map((item, j) => <li key={j}>{formatInline(item)}</li>)}
        </ol>
      );
      continue;
    } else if (line.trim() === '') {
      // skip
    } else if (line.startsWith('---')) {
      elements.push(<hr key={i} className="my-3 border-border" />);
    } else {
      elements.push(<p key={i} className="my-1">{formatInline(line)}</p>);
    }
    i++;
  }

  return <>{elements}</>;
}

function formatInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*)|(`(.+?)`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      parts.push(<strong key={match.index}>{match[2]}</strong>);
    } else if (match[4]) {
      parts.push(<code key={match.index} className="rounded bg-muted px-1 py-0.5 text-xs">{match[4]}</code>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}
