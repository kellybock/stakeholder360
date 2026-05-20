import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getApiKeys, createApiKey, revokeApiKey, deleteApiKey } from '@/lib/api-keys';
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

  const keys = getApiKeys().map(k => ({
    id: k.id,
    name: k.name,
    prefix: k.prefix,
    scopes: k.scopes,
    status: k.status,
    createdByName: k.createdByName,
    lastUsedAt: k.lastUsedAt,
    expiresAt: k.expiresAt,
    createdAt: k.createdAt,
    revokedAt: k.revokedAt,
  }));

  return NextResponse.json({ keys });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  const denied = requireAdmin(session);
  if (denied) return denied;

  const body = await request.json();
  const { name, scopes, expiresAt } = body;

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const { key, rawKey } = createApiKey({
    name,
    createdBy: session!.userId,
    createdByName: session!.fullName,
    scopes: scopes ?? ['read'],
    expiresAt: expiresAt ?? null,
  });

  addAuditEntry({
    action: 'apikey.created',
    actorId: session!.userId,
    actorName: session!.fullName,
    actorEmail: session!.email,
    targetType: 'apikey',
    targetId: key.id,
    targetLabel: key.name,
    details: { scopes: key.scopes, expiresAt: key.expiresAt },
    ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
  });

  return NextResponse.json({
    key: {
      id: key.id,
      name: key.name,
      prefix: key.prefix,
      scopes: key.scopes,
      status: key.status,
      createdAt: key.createdAt,
      expiresAt: key.expiresAt,
    },
    rawKey,
  }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  const denied = requireAdmin(session);
  if (denied) return denied;

  const body = await request.json();
  const { id, action } = body;

  if (!id || action !== 'revoke') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const key = revokeApiKey(id);
  if (!key) {
    return NextResponse.json({ error: 'Key not found or already revoked' }, { status: 404 });
  }

  addAuditEntry({
    action: 'apikey.revoked',
    actorId: session!.userId,
    actorName: session!.fullName,
    actorEmail: session!.email,
    targetType: 'apikey',
    targetId: key.id,
    targetLabel: key.name,
    details: null,
    ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  const denied = requireAdmin(session);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing key ID' }, { status: 400 });
  }

  const deleted = deleteApiKey(id);
  if (!deleted) {
    return NextResponse.json({ error: 'Key not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
