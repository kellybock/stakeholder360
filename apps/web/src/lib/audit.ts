export type AuditAction =
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.login'
  | 'user.logout'
  | 'apikey.created'
  | 'apikey.revoked'
  | 'data.uploaded'
  | 'stakeholder.viewed'
  | 'settings.changed';

export interface AuditEntry {
  id: string;
  action: AuditAction;
  actorId: string;
  actorName: string;
  actorEmail: string;
  targetType: string | null;
  targetId: string | null;
  targetLabel: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  timestamp: string;
}

const g = globalThis as unknown as { __auditLog?: AuditEntry[] };
if (!g.__auditLog) g.__auditLog = [];

export function getAuditLog(): AuditEntry[] {
  return g.__auditLog!;
}

export function addAuditEntry(
  entry: Omit<AuditEntry, 'id' | 'timestamp'>,
): AuditEntry {
  const full: AuditEntry = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  g.__auditLog!.unshift(full);
  if (g.__auditLog!.length > 1000) g.__auditLog!.length = 1000;
  return full;
}
