'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  status: 'active' | 'revoked';
  createdByName: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  revokedAt: string | null;
};

type AIProvider = {
  provider: string;
  label: string;
  apiKey: string;
  hasKey: boolean;
  enabled: boolean;
  model: string;
};

type AIConfig = {
  defaultProvider: string;
  providers: AIProvider[];
};

const MODEL_OPTIONS: Record<string, { value: string; label: string }[]> = {
  claude: [
    { value: 'claude-opus-4-7-20250715', label: 'Opus 4.7 — Most capable, latest flagship model' },
    { value: 'claude-opus-4-6-20250611', label: 'Opus 4.6 — Previous Opus release' },
    { value: 'claude-sonnet-4-6-20250715', label: 'Sonnet 4.6 — Latest balanced model, fast and intelligent' },
    { value: 'claude-sonnet-4-20250514', label: 'Sonnet 4.0 — Previous Sonnet release' },
    { value: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5 — Latest fast and cost-effective model' },
    { value: 'claude-3-5-haiku-20241022', label: 'Haiku 3.5 — Previous Haiku release' },
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

const PROVIDER_ICONS: Record<string, string> = {
  claude: 'A',
  openai: 'O',
  gemini: 'G',
};

const PROVIDER_COLORS: Record<string, string> = {
  claude: 'bg-orange-500',
  openai: 'bg-emerald-600',
  gemini: 'bg-blue-500',
};

const AVAILABLE_SCOPES = [
  { value: 'read', label: 'Read', description: 'Read stakeholder data and analytics' },
  { value: 'write', label: 'Write', description: 'Create and update records' },
  { value: 'admin', label: 'Admin', description: 'Full administrative access' },
  { value: 'ai', label: 'AI', description: 'Access AI chat and search endpoints' },
  { value: 'export', label: 'Export', description: 'Export data and reports' },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<'data' | 'ai' | 'apikeys'>('data');

  // Data Mode state
  const [dataMode, setDataMode] = useState<'test' | 'live'>('test');
  const [dataModeLoading, setDataModeLoading] = useState(true);
  const [dataModeSwitching, setDataModeSwitching] = useState(false);
  const [dataModeInfo, setDataModeInfo] = useState<{ lastChangedAt: string | null; lastChangedBy: string | null }>({ lastChangedAt: null, lastChangedBy: null });

  // AI Settings state
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [aiSaving, setAiSaving] = useState(false);
  const [aiSuccess, setAiSuccess] = useState('');
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  // API Keys state
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [keysLoading, setKeysLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['read']);
  const [expiry, setExpiry] = useState('90');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokeConfirm, setRevokeConfirm] = useState<ApiKey | null>(null);

  const fetchDataMode = useCallback(() => {
    setDataModeLoading(true);
    fetch('/api/admin/data-mode')
      .then(r => r.json())
      .then(d => {
        setDataMode(d.mode);
        setDataModeInfo({ lastChangedAt: d.lastChangedAt, lastChangedBy: d.lastChangedBy });
      })
      .catch(() => {})
      .finally(() => setDataModeLoading(false));
  }, []);

  const fetchAI = useCallback(() => {
    setAiLoading(true);
    fetch('/api/admin/ai-settings')
      .then(r => r.json())
      .then(d => setAiConfig(d))
      .catch(() => {})
      .finally(() => setAiLoading(false));
  }, []);

  const fetchKeys = useCallback(() => {
    setKeysLoading(true);
    fetch('/api/admin/api-keys')
      .then(r => r.json())
      .then(d => setKeys(d.keys ?? []))
      .catch(() => {})
      .finally(() => setKeysLoading(false));
  }, []);

  useEffect(() => { fetchDataMode(); fetchAI(); fetchKeys(); }, [fetchDataMode, fetchAI, fetchKeys]);

  async function handleDataModeToggle(newMode: 'test' | 'live') {
    if (newMode === dataMode || dataModeSwitching) return;
    setDataModeSwitching(true);
    try {
      await fetch('/api/admin/data-mode', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode }),
      });
      setDataMode(newMode);
      setAiSuccess(`Switched to ${newMode === 'test' ? 'Test' : 'Live'} Data mode`);
      setTimeout(() => setAiSuccess(''), 3000);
      fetchDataMode();
    } catch {}
    setDataModeSwitching(false);
  }

  async function saveAIKey(provider: string) {
    setAiSaving(true);
    setAiSuccess('');
    await fetch('/api/admin/ai-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, apiKey: keyInput, enabled: !!keyInput }),
    });
    setEditingProvider(null);
    setKeyInput('');
    setAiSaving(false);
    setAiSuccess(`${provider} API key saved`);
    setTimeout(() => setAiSuccess(''), 3000);
    fetchAI();
  }

  async function removeAIKey(provider: string) {
    setAiSaving(true);
    await fetch('/api/admin/ai-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, apiKey: '', enabled: false }),
    });
    setAiSaving(false);
    setAiSuccess(`${provider} API key removed`);
    setTimeout(() => setAiSuccess(''), 3000);
    fetchAI();
  }

  async function toggleProvider(provider: string, enabled: boolean) {
    await fetch('/api/admin/ai-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, enabled }),
    });
    fetchAI();
  }

  async function changeModel(provider: string, model: string) {
    await fetch('/api/admin/ai-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, model }),
    });
    fetchAI();
  }

  async function changeDefault(defaultProvider: string) {
    await fetch('/api/admin/ai-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ defaultProvider }),
    });
    fetchAI();
  }

  // API Key handlers
  async function handleCreateKey() {
    if (!name.trim()) { setFormError('Name is required'); return; }
    if (scopes.length === 0) { setFormError('Select at least one scope'); return; }
    setCreating(true);
    setFormError('');
    try {
      const expiresAt = expiry === 'never' ? null : new Date(Date.now() + parseInt(expiry) * 86400000).toISOString();
      const res = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), scopes, expiresAt }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      const data = await res.json();
      setNewRawKey(data.rawKey);
      setShowCreate(false);
      setName('');
      setScopes(['read']);
      setExpiry('90');
      fetchKeys();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke() {
    if (!revokeConfirm) return;
    await fetch('/api/admin/api-keys', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: revokeConfirm.id, action: 'revoke' }),
    });
    setRevokeConfirm(null);
    fetchKeys();
  }

  function copyKey() {
    if (newRawKey) {
      navigator.clipboard.writeText(newRawKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function toggleScope(scope: string) {
    setScopes(prev => prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]);
  }

  const activeKeys = keys.filter(k => k.status === 'active');
  const enabledProviders = aiConfig?.providers.filter(p => p.hasKey && p.enabled).length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure data sources, AI providers, and manage API keys</p>
      </div>

      {/* Success banner */}
      {aiSuccess && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-xs text-green-700 font-medium">
          {aiSuccess}
        </div>
      )}

      {/* New key banner */}
      {newRawKey && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <p className="text-sm font-semibold text-green-600">API Key Created Successfully</p>
          <p className="text-xs text-green-700 mb-3 mt-1">Copy your API key now. You won&apos;t be able to see it again.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg border border-green-200 bg-white px-3 py-2 text-xs font-mono break-all">{newRawKey}</code>
            <button onClick={copyKey} className={cn('rounded-lg px-3 py-2 text-xs font-medium', copied ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200')}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <button onClick={() => setNewRawKey(null)} className="mt-3 text-xs text-green-600 hover:text-green-800 underline">Dismiss</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground">Data Mode</p>
          <p className={cn('mt-1 text-2xl font-bold', dataMode === 'test' ? 'text-amber-600' : 'text-blue-600')}>
            {dataMode === 'test' ? 'Test' : 'Live'}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground">AI Providers</p>
          <p className="mt-1 text-2xl font-bold">{enabledProviders} <span className="text-sm font-normal text-muted-foreground">/ 3 configured</span></p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground">Active API Keys</p>
          <p className="mt-1 text-2xl font-bold">{activeKeys.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground">Default AI</p>
          <p className="mt-1 text-2xl font-bold capitalize">{aiConfig?.defaultProvider ?? '—'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {([
          { key: 'data' as const, label: 'Data Mode' },
          { key: 'ai' as const, label: 'AI Configuration' },
          { key: 'apikeys' as const, label: 'API Keys' },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Data Mode Tab */}
      {tab === 'data' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold mb-1">Data Source Mode</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Choose whether the dashboard shows seeded test data from the database or only data uploaded by your team.
            </p>

            {dataModeLoading ? (
              <div className="flex h-24 items-center justify-center">
                <svg className="h-6 w-6 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => handleDataModeToggle('test')}
                  disabled={dataModeSwitching}
                  className={cn(
                    'flex-1 rounded-xl border-2 p-4 text-left transition-colors',
                    dataMode === 'test' ? 'border-amber-500 bg-amber-50' : 'border-border hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <ellipse cx="12" cy="5" rx="9" ry="3" />
                      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                    </svg>
                    <span className="text-sm font-semibold">Test Dataset</span>
                    {dataMode === 'test' && (
                      <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pre-seeded demo data from PostgreSQL — 44 profiles, 158 events, 132 interactions, and more. Ideal for demonstrations and testing.
                  </p>
                </button>

                <button
                  onClick={() => handleDataModeToggle('live')}
                  disabled={dataModeSwitching}
                  className={cn(
                    'flex-1 rounded-xl border-2 p-4 text-left transition-colors',
                    dataMode === 'live' ? 'border-blue-500 bg-blue-50' : 'border-border hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span className="text-sm font-semibold">Live Dataset</span>
                    {dataMode === 'live' && (
                      <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Only data uploaded through the portal by your team. Dashboard starts empty until you upload stakeholder data.
                  </p>
                </button>
              </div>
            )}

            {dataModeSwitching && (
              <p className="mt-3 text-xs text-amber-600 font-medium">Switching data mode...</p>
            )}
            {dataModeInfo.lastChangedAt && (
              <p className="mt-3 text-[10px] text-muted-foreground">
                Last changed {new Date(dataModeInfo.lastChangedAt).toLocaleString()}
                {dataModeInfo.lastChangedBy ? ` by ${dataModeInfo.lastChangedBy}` : ''}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <h3 className="text-sm font-semibold text-amber-800 mb-1">Important</h3>
            <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
              <li>Switching modes clears all in-memory data and resets dashboard analytics.</li>
              <li>In <span className="font-semibold">Live Data</span> mode, the dashboard starts empty until you upload data.</li>
              <li>Data uploaded in one mode is not preserved when switching to the other mode.</li>
            </ul>
          </div>
        </div>
      )}

      {/* AI Configuration Tab */}
      {tab === 'ai' && (
        <div className="space-y-4">
          {/* Default provider selector */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold mb-1">Default AI Provider</h3>
            <p className="text-xs text-muted-foreground mb-3">
              The default provider for AI chat when users don&apos;t specify one. Users can override per-conversation.
            </p>
            <div className="flex gap-2">
              {aiConfig?.providers.map(p => (
                <button
                  key={p.provider}
                  onClick={() => changeDefault(p.provider)}
                  disabled={!p.hasKey}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors',
                    aiConfig.defaultProvider === p.provider
                      ? 'border-primary bg-primary/5 text-primary'
                      : p.hasKey
                        ? 'border-border hover:bg-muted/50'
                        : 'border-border opacity-40 cursor-not-allowed'
                  )}
                >
                  <span className={cn('flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white', PROVIDER_COLORS[p.provider])}>
                    {PROVIDER_ICONS[p.provider]}
                  </span>
                  {p.label}
                  {aiConfig.defaultProvider === p.provider && (
                    <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Provider cards */}
          {aiLoading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Loading AI configuration...</div>
          ) : (
            aiConfig?.providers.map(p => (
              <div key={p.provider} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white', PROVIDER_COLORS[p.provider])}>
                      {PROVIDER_ICONS[p.provider]}
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold">{p.label}</h3>
                      <p className="text-[10px] text-muted-foreground">
                        {p.hasKey ? `Key configured · Model: ${p.model}` : 'No API key configured'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {p.hasKey && (
                      <button
                        onClick={() => toggleProvider(p.provider, !p.enabled)}
                        className={cn(
                          'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                          p.enabled ? 'bg-primary' : 'bg-muted'
                        )}
                      >
                        <span className={cn(
                          'inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform',
                          p.enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
                        )} />
                      </button>
                    )}
                    <span className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
                      p.hasKey && p.enabled
                        ? 'bg-green-100 text-green-700'
                        : p.hasKey
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-500'
                    )}>
                      <span className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        p.hasKey && p.enabled ? 'bg-green-500' : p.hasKey ? 'bg-amber-500' : 'bg-gray-400'
                      )} />
                      {p.hasKey && p.enabled ? 'Active' : p.hasKey ? 'Disabled' : 'Not configured'}
                    </span>
                  </div>
                </div>

                <div className="px-5 py-4 space-y-3">
                  {/* API Key row */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">API Key</label>
                    {editingProvider === p.provider ? (
                      <div className="mt-1 flex gap-2">
                        <input
                          type="text"
                          value={keyInput}
                          onChange={e => setKeyInput(e.target.value)}
                          placeholder={`Enter your ${p.label} API key`}
                          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
                          autoFocus
                        />
                        <button
                          onClick={() => saveAIKey(p.provider)}
                          disabled={aiSaving || !keyInput.trim()}
                          className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                          {aiSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => { setEditingProvider(null); setKeyInput(''); }}
                          className="rounded-lg border border-border px-3 py-2 text-xs hover:bg-muted"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="mt-1 flex items-center gap-2">
                        {p.hasKey ? (
                          <>
                            <code className="flex-1 rounded-lg border border-border bg-muted px-3 py-2 text-xs font-mono">
                              {showKey[p.provider] ? p.apiKey : '••••••••••••••••••••••••'}
                            </code>
                            <button
                              onClick={() => setShowKey(prev => ({ ...prev, [p.provider]: !prev[p.provider] }))}
                              className="rounded-lg border border-border px-2.5 py-2 text-xs hover:bg-muted"
                              title={showKey[p.provider] ? 'Hide' : 'Show masked key'}
                            >
                              {showKey[p.provider] ? (
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                              ) : (
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              )}
                            </button>
                            <button
                              onClick={() => { setEditingProvider(p.provider); setKeyInput(''); }}
                              className="rounded-lg border border-border px-2.5 py-2 text-xs hover:bg-muted"
                            >
                              Change
                            </button>
                            <button
                              onClick={() => removeAIKey(p.provider)}
                              className="rounded-lg border border-red-200 px-2.5 py-2 text-xs text-red-600 hover:bg-red-50"
                            >
                              Remove
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => { setEditingProvider(p.provider); setKeyInput(''); }}
                            className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                          >
                            + Add API Key
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Model selector */}
                  {p.hasKey && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Model</label>
                      <select
                        value={p.model}
                        onChange={e => changeModel(p.provider, e.target.value)}
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm sm:w-auto"
                      >
                        {(MODEL_OPTIONS[p.provider] ?? []).map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Help text */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold mb-2">Getting API Keys</h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-bold text-white', PROVIDER_COLORS['claude'])}>A</span>
                <p><span className="font-medium text-foreground">Anthropic Claude</span> — Get your key at console.anthropic.com under API Keys</p>
              </div>
              <div className="flex items-start gap-2">
                <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-bold text-white', PROVIDER_COLORS['openai'])}>O</span>
                <p><span className="font-medium text-foreground">OpenAI</span> — Get your key at platform.openai.com/api-keys</p>
              </div>
              <div className="flex items-start gap-2">
                <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-bold text-white', PROVIDER_COLORS['gemini'])}>G</span>
                <p><span className="font-medium text-foreground">Google Gemini</span> — Get your key at aistudio.google.com/apikey</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API Keys Tab */}
      {tab === 'apikeys' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div>
                <h3 className="text-sm font-semibold">Portal API Keys</h3>
                <p className="text-[10px] text-muted-foreground">Manage programmatic access to the Youth360 API</p>
              </div>
              <button
                onClick={() => { setShowCreate(true); setFormError(''); }}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                + Create Key
              </button>
            </div>

            {keysLoading ? (
              <div className="px-4 py-12 text-center text-sm text-muted-foreground">Loading...</div>
            ) : keys.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <p className="text-sm text-muted-foreground">No API keys yet</p>
                <p className="text-xs text-muted-foreground mt-1">Create a key to enable programmatic access</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Key</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Scopes</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Expires</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keys.map(key => (
                      <tr key={key.id} className={cn('border-b border-border last:border-0', key.status === 'revoked' && 'opacity-50')}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-xs">{key.name}</p>
                          <p className="text-[10px] text-muted-foreground">by {key.createdByName}</p>
                        </td>
                        <td className="px-4 py-3">
                          <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{key.prefix}</code>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {key.scopes.map(s => (
                              <span key={s} className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium">{s}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
                            key.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          )}>
                            <span className={cn('h-1.5 w-1.5 rounded-full', key.status === 'active' ? 'bg-green-500' : 'bg-red-500')} />
                            {key.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(key.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{key.expiresAt ? new Date(key.expiresAt).toLocaleDateString() : 'Never'}</td>
                        <td className="px-4 py-3 text-right">
                          {key.status === 'active' ? (
                            <button onClick={() => setRevokeConfirm(key)} className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50">Revoke</button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">{key.revokedAt ? new Date(key.revokedAt).toLocaleDateString() : ''}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Usage Guide */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold mb-2">API Usage</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Include your API key in the <code className="bg-muted px-1 py-0.5 rounded text-[10px]">Authorization</code> header:
            </p>
            <div className="rounded-lg bg-muted p-3">
              <code className="text-xs font-mono text-foreground">
                curl -H &quot;Authorization: Bearer y360_your_api_key&quot; \<br />
                &nbsp;&nbsp;https://youth360.gov.sg/api/stakeholders
              </code>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { endpoint: 'GET /api/stakeholders', scope: 'read', desc: 'List stakeholders' },
                { endpoint: 'GET /api/stakeholders/:id/360', scope: 'read', desc: 'Full 360 profile' },
                { endpoint: 'GET /api/engagement', scope: 'read', desc: 'Engagement scores' },
                { endpoint: 'GET /api/network', scope: 'read', desc: 'Network graph data' },
                { endpoint: 'POST /api/upload', scope: 'write', desc: 'Upload CSV data' },
                { endpoint: 'POST /api/ai/chat', scope: 'ai', desc: 'AI chat completion' },
              ].map(ep => (
                <div key={ep.endpoint} className="rounded-lg border border-border p-2.5">
                  <code className="text-[10px] font-mono font-medium">{ep.endpoint}</code>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[10px] text-muted-foreground">{ep.desc}</p>
                    <span className="rounded bg-secondary px-1 py-0.5 text-[9px] font-medium">{ep.scope}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create API Key Modal */}
      {showCreate && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setShowCreate(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
              <h3 className="text-lg font-semibold">Create API Key</h3>
              <p className="text-xs text-muted-foreground mb-4">Generate a new key for programmatic API access</p>
              {formError && (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{formError}</div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Key Name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="e.g. Production API" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Scopes</label>
                  <div className="mt-1 space-y-1.5">
                    {AVAILABLE_SCOPES.map(scope => (
                      <label key={scope.value} className={cn('flex items-center gap-3 rounded-lg border p-2.5 cursor-pointer transition-colors', scopes.includes(scope.value) ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50')}>
                        <input type="checkbox" checked={scopes.includes(scope.value)} onChange={() => toggleScope(scope.value)} className="rounded" />
                        <div>
                          <p className="text-xs font-medium">{scope.label}</p>
                          <p className="text-[10px] text-muted-foreground">{scope.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Expiration</label>
                  <select value={expiry} onChange={e => setExpiry(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                    <option value="30">30 days</option>
                    <option value="90">90 days</option>
                    <option value="180">180 days</option>
                    <option value="365">1 year</option>
                    <option value="never">Never</option>
                  </select>
                </div>
              </div>
              <div className="mt-5 flex gap-2 justify-end">
                <button onClick={() => setShowCreate(false)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">Cancel</button>
                <button onClick={handleCreateKey} disabled={creating} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create Key'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Revoke Confirmation Modal */}
      {revokeConfirm && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setRevokeConfirm(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-amber-600">Revoke API Key</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Are you sure you want to revoke <span className="font-medium text-foreground">{revokeConfirm.name}</span>?
                Applications using this key will lose access immediately.
              </p>
              <div className="mt-5 flex gap-2 justify-end">
                <button onClick={() => setRevokeConfirm(null)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">Cancel</button>
                <button onClick={handleRevoke} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700">Revoke Key</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
