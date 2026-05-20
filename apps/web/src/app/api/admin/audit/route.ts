import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAuditLog, type AuditAction } from '@/lib/audit';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') as AuditAction | null;
  const actorId = searchParams.get('actorId');
  const targetType = searchParams.get('targetType');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200);
  const offset = parseInt(searchParams.get('offset') ?? '0');

  let entries = getAuditLog();

  if (action) entries = entries.filter(e => e.action === action);
  if (actorId) entries = entries.filter(e => e.actorId === actorId);
  if (targetType) entries = entries.filter(e => e.targetType === targetType);

  const total = entries.length;
  const data = entries.slice(offset, offset + limit);

  return NextResponse.json({ entries: data, total, limit, offset });
}
