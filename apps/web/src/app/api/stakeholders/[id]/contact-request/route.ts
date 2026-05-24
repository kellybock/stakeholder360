import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getHydratedStore } from '@/lib/store';
import { getContactRequests, addContactRequest } from '@/lib/contact-requests';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.role === 'admin') {
    return NextResponse.json({ error: 'Admins have direct access' }, { status: 400 });
  }

  const { id } = await params;
  const { reason } = await request.json().catch(() => ({ reason: '' }));

  const dataStore = await getHydratedStore();
  const profile = dataStore.profiles.find(p => p.id === id);
  if (!profile) {
    return NextResponse.json({ error: 'Stakeholder not found' }, { status: 404 });
  }

  const assignedRM = dataStore.relationshipManagers.find(rm => rm.nricHash === profile.nricHash);

  const contactRequest = addContactRequest({
    stakeholderId: id,
    stakeholderName: profile.fullName,
    requestedBy: session.userId,
    requestedByName: session.fullName,
    requestedByEmail: session.email,
    requestedByAgency: session.agency,
    rmName: assignedRM?.name ?? null,
    rmEmail: assignedRM?.email ?? null,
    reason: reason || '',
  });

  return NextResponse.json({
    success: true,
    request: contactRequest,
    message: assignedRM
      ? `Contact request sent to RM: ${assignedRM.name} (${assignedRM.email})`
      : 'Contact request submitted. An admin will follow up.',
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const requests = getContactRequests(id);

  const filtered = session.role === 'admin'
    ? requests
    : requests.filter(r => r.requestedBy === session.userId);

  return NextResponse.json({ requests: filtered });
}
