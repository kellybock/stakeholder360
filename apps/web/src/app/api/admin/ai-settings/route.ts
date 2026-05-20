import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAISettings, updateAIProvider, setDefaultProvider, maskKey } from '@/lib/ai-settings';
import { addAuditEntry } from '@/lib/audit';

function requireAdmin(session: { role: string } | null) {
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const session = await getSession();
  const denied = requireAdmin(session);
  if (denied) return denied;

  const settings = getAISettings();

  return NextResponse.json({
    defaultProvider: settings.defaultProvider,
    providers: settings.providers.map(p => ({
      provider: p.provider,
      label: p.label,
      apiKey: maskKey(p.apiKey),
      hasKey: !!p.apiKey,
      enabled: p.enabled,
      model: p.model,
    })),
  });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  const denied = requireAdmin(session);
  if (denied) return denied;

  const body = await request.json();
  const { provider, apiKey, enabled, model, defaultProvider: newDefault } = body;

  if (newDefault) {
    setDefaultProvider(newDefault);
    addAuditEntry({
      action: 'settings.changed',
      actorId: session!.userId,
      actorName: session!.fullName,
      actorEmail: session!.email,
      targetType: 'ai-settings',
      targetId: null,
      targetLabel: 'Default AI Provider',
      details: { defaultProvider: newDefault },
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
    });
  }

  if (provider) {
    const updated = updateAIProvider(provider, {
      apiKey: apiKey !== undefined ? apiKey : undefined,
      enabled: enabled !== undefined ? enabled : undefined,
      model: model !== undefined ? model : undefined,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    const changes: Record<string, unknown> = { provider };
    if (apiKey !== undefined) changes.apiKeyChanged = true;
    if (enabled !== undefined) changes.enabled = enabled;
    if (model !== undefined) changes.model = model;

    addAuditEntry({
      action: 'settings.changed',
      actorId: session!.userId,
      actorName: session!.fullName,
      actorEmail: session!.email,
      targetType: 'ai-settings',
      targetId: provider,
      targetLabel: updated.label,
      details: changes,
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
    });
  }

  const settings = getAISettings();
  return NextResponse.json({
    defaultProvider: settings.defaultProvider,
    providers: settings.providers.map(p => ({
      provider: p.provider,
      label: p.label,
      apiKey: maskKey(p.apiKey),
      hasKey: !!p.apiKey,
      enabled: p.enabled,
      model: p.model,
    })),
  });
}
