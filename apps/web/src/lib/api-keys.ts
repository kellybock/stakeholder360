export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  hashedKey: string;
  createdBy: string;
  createdByName: string;
  scopes: string[];
  status: 'active' | 'revoked';
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

const g = globalThis as unknown as { __apiKeys?: ApiKey[] };
if (!g.__apiKeys) g.__apiKeys = [];

function generateKey(): { raw: string; prefix: string; hashed: string } {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const raw = 'y360_' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const prefix = raw.slice(0, 12) + '...';
  const hashed = Array.from(new Uint8Array(32)).map(() => Math.random().toString(36)[2]).join('');
  return { raw, prefix, hashed };
}

export function getApiKeys(): ApiKey[] {
  return g.__apiKeys!;
}

export function createApiKey(data: {
  name: string;
  createdBy: string;
  createdByName: string;
  scopes: string[];
  expiresAt: string | null;
}): { key: ApiKey; rawKey: string } {
  const { raw, prefix, hashed } = generateKey();
  const key: ApiKey = {
    id: crypto.randomUUID(),
    name: data.name,
    prefix,
    hashedKey: hashed,
    createdBy: data.createdBy,
    createdByName: data.createdByName,
    scopes: data.scopes,
    status: 'active',
    lastUsedAt: null,
    expiresAt: data.expiresAt,
    createdAt: new Date().toISOString(),
    revokedAt: null,
  };
  g.__apiKeys!.push(key);
  return { key, rawKey: raw };
}

export function revokeApiKey(id: string): ApiKey | null {
  const key = g.__apiKeys!.find(k => k.id === id);
  if (!key || key.status === 'revoked') return null;
  key.status = 'revoked';
  key.revokedAt = new Date().toISOString();
  return key;
}

export function deleteApiKey(id: string): boolean {
  const idx = g.__apiKeys!.findIndex(k => k.id === id);
  if (idx === -1) return false;
  g.__apiKeys!.splice(idx, 1);
  return true;
}
