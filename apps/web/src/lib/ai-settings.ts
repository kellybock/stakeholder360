export interface AIProviderConfig {
  provider: 'claude' | 'openai' | 'gemini' | 'ollama';
  label: string;
  envVar: string;
  apiKey: string;
  enabled: boolean;
  model: string;
}

export interface AISettings {
  defaultProvider: string;
  providers: AIProviderConfig[];
}

const g = globalThis as unknown as { __aiSettings?: AISettings };

function defaults(): AISettings {
  return {
    defaultProvider: 'claude',
    providers: [
      {
        provider: 'claude',
        label: 'Anthropic Claude',
        envVar: 'ANTHROPIC_API_KEY',
        apiKey: process.env.ANTHROPIC_API_KEY ?? '',
        enabled: !!process.env.ANTHROPIC_API_KEY,
        model: 'claude-sonnet-4-6-20250715',
      },
      {
        provider: 'openai',
        label: 'OpenAI',
        envVar: 'OPENAI_API_KEY',
        apiKey: process.env.OPENAI_API_KEY ?? '',
        enabled: !!process.env.OPENAI_API_KEY,
        model: 'gpt-4o',
      },
      {
        provider: 'gemini',
        label: 'Google Gemini',
        envVar: 'GOOGLE_AI_API_KEY',
        apiKey: process.env.GOOGLE_AI_API_KEY ?? '',
        enabled: !!process.env.GOOGLE_AI_API_KEY,
        model: 'gemini-2.0-flash',
      },
      {
        provider: 'ollama',
        label: 'Ollama (Local AI)',
        envVar: 'OLLAMA_BASE_URL',
        // apiKey field stores the base URL for Ollama (no real API key needed)
        apiKey: process.env.OLLAMA_BASE_URL ?? '',
        enabled: !!process.env.OLLAMA_BASE_URL,
        model: process.env.OLLAMA_MODEL ?? 'phi3:mini',
      },
    ],
  };
}

export function getAISettings(): AISettings {
  if (!g.__aiSettings) g.__aiSettings = defaults();
  return g.__aiSettings;
}

export function updateAIProvider(
  provider: string,
  data: Partial<{ apiKey: string; enabled: boolean; model: string }>,
): AIProviderConfig | null {
  const settings = getAISettings();
  const p = settings.providers.find(c => c.provider === provider);
  if (!p) return null;

  if (data.apiKey !== undefined) p.apiKey = data.apiKey;
  if (data.enabled !== undefined) p.enabled = data.enabled;
  if (data.model !== undefined) p.model = data.model;

  return p;
}

export function setDefaultProvider(provider: string): void {
  const settings = getAISettings();
  settings.defaultProvider = provider;
}

export function getProviderApiKey(provider: string): string | null {
  const settings = getAISettings();
  const p = settings.providers.find(c => c.provider === provider);
  if (!p) return null;
  return p.apiKey || null;
}

export function isProviderEnabled(provider: string): boolean {
  const settings = getAISettings();
  const p = settings.providers.find(c => c.provider === provider);
  return !!p?.enabled && !!p.apiKey;
}

export function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '••••••••';
  return key.slice(0, 4) + '••••••••' + key.slice(-4);
}

