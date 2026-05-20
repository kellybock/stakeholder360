import { NextRequest, NextResponse } from 'next/server';

type IntroRequest = {
  id: string;
  fromRM: string;
  toRM: string;
  stakeholderName: string;
  stakeholderId: string;
  reason: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
};

const globalIntros = globalThis as unknown as { __introRequests?: IntroRequest[] };
if (!globalIntros.__introRequests) globalIntros.__introRequests = [];

export async function GET() {
  return NextResponse.json({ requests: globalIntros.__introRequests ?? [] });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { fromRM, toRM, stakeholderName, stakeholderId, reason } = body;

  if (!fromRM || !toRM || !stakeholderName || !stakeholderId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const intro: IntroRequest = {
    id: crypto.randomUUID(),
    fromRM,
    toRM,
    stakeholderName,
    stakeholderId,
    reason: reason ?? '',
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  globalIntros.__introRequests!.push(intro);

  return NextResponse.json(intro, { status: 201 });
}
