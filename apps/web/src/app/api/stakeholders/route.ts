import { NextRequest, NextResponse } from 'next/server';
import { getHydratedStore } from '@/lib/store';

export async function GET(request: NextRequest) {
  const dataStore = await getHydratedStore();
  const { searchParams } = request.nextUrl;
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = parseInt(searchParams.get('limit') ?? '20');
  const search = searchParams.get('search')?.toLowerCase() ?? '';
  const agency = searchParams.get('agency') ?? '';
  const status = searchParams.get('status') ?? '';

  let filtered = dataStore.profiles;

  if (search) {
    filtered = filtered.filter(p =>
      p.fullName.toLowerCase().includes(search) ||
      p.email?.toLowerCase().includes(search) ||
      p.employerOrg?.toLowerCase().includes(search)
    );
  }
  if (agency) {
    filtered = filtered.filter(p => p.sourceAgency === agency);
  }
  if (status) {
    filtered = filtered.filter(p => p.caseStatus === status);
  }

  const total = filtered.length;
  const start = (page - 1) * limit;
  const data = filtered.slice(start, start + limit).map(p => {
    const agencies = new Set<string>();
    dataStore.interactions.filter(i => i.nricHash === p.nricHash).forEach(i => { if (i.agency) agencies.add(i.agency); });
    dataStore.events.filter(e => e.nricHash === p.nricHash).forEach(e => { if (e.organizerAgency) agencies.add(e.organizerAgency); });
    dataStore.areasOfInterest.filter(a => a.nricHash === p.nricHash).forEach(a => { if (a.agency) agencies.add(a.agency); });

    const lastInteraction = dataStore.interactions
      .filter(i => i.nricHash === p.nricHash && i.meetingDate)
      .sort((a, b) => (b.meetingDate ?? '').localeCompare(a.meetingDate ?? ''))[0];

    return {
      ...p,
      crossAgencyCount: agencies.size,
      agencies: Array.from(agencies),
      lastContactDate: lastInteraction?.meetingDate ?? null,
      interactionCount: dataStore.interactions.filter(i => i.nricHash === p.nricHash).length,
      eventCount: dataStore.events.filter(e => e.nricHash === p.nricHash).length,
    };
  });

  return NextResponse.json({
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}
