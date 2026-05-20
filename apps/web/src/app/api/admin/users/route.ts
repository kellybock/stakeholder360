import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDemoUsers, addUser, updateUser, deleteUser } from '@/lib/demo-users';
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

  const users = await getDemoUsers();
  return NextResponse.json({
    users: users.map(u => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      agency: u.agency,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  const denied = requireAdmin(session);
  if (denied) return denied;

  const body = await request.json();
  const { email, fullName, agency, role, password } = body;

  if (!email || !fullName || !agency || !role) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const user = await addUser({
      email,
      fullName,
      agency,
      role,
      password: password || 'demo1234',
    });

    addAuditEntry({
      action: 'user.created',
      actorId: session!.userId,
      actorName: session!.fullName,
      actorEmail: session!.email,
      targetType: 'user',
      targetId: user.id,
      targetLabel: user.fullName,
      details: { email: user.email, role: user.role, agency: user.agency },
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        agency: user.agency,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 409 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  const denied = requireAdmin(session);
  if (denied) return denied;

  const body = await request.json();
  const { id, ...data } = body;

  if (!id) {
    return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
  }

  try {
    const user = await updateUser(id, data);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const changes: Record<string, unknown> = {};
    for (const key of Object.keys(data)) {
      if (key !== 'password') changes[key] = data[key];
    }
    if (data.password) changes.passwordChanged = true;

    addAuditEntry({
      action: 'user.updated',
      actorId: session!.userId,
      actorName: session!.fullName,
      actorEmail: session!.email,
      targetType: 'user',
      targetId: user.id,
      targetLabel: user.fullName,
      details: changes,
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        agency: user.agency,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 409 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  const denied = requireAdmin(session);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
  }

  if (id === session!.userId) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
  }

  const users = await getDemoUsers();
  const target = users.find(u => u.id === id);

  const deleted = await deleteUser(id);
  if (!deleted) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  addAuditEntry({
    action: 'user.deleted',
    actorId: session!.userId,
    actorName: session!.fullName,
    actorEmail: session!.email,
    targetType: 'user',
    targetId: id,
    targetLabel: target?.fullName ?? 'Unknown',
    details: { email: target?.email, role: target?.role },
    ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
  });

  return NextResponse.json({ success: true });
}
