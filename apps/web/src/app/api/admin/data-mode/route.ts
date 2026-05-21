import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDataModeSettings, setDataMode } from '@/lib/data-mode';
import { dataStore } from '@/lib/store';
import { clearEngagementCache } from '@/lib/engagement';
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

  return NextResponse.json(getDataModeSettings());
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  const denied = requireAdmin(session);
  if (denied) return denied;

  const body = await request.json();
  const { mode } = body;

  if (mode !== 'test' && mode !== 'live') {
    return NextResponse.json({ error: 'Invalid mode. Must be "test" or "live".' }, { status: 400 });
  }

  const prev = getDataModeSettings().mode;
  if (mode === prev) {
    return NextResponse.json(getDataModeSettings());
  }

  dataStore.reset();
  clearEngagementCache();
  setDataMode(mode, session!.fullName);

  addAuditEntry({
    action: 'settings.changed',
    actorId: session!.userId,
    actorName: session!.fullName,
    actorEmail: session!.email,
    targetType: 'data-mode',
    targetId: null,
    targetLabel: 'Data Mode',
    details: { previousMode: prev, newMode: mode },
    ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
  });

  return NextResponse.json(getDataModeSettings());
}
