import { NextResponse } from 'next/server';
import { getHydratedStore } from '@/lib/store';
import { getScoreForStakeholder } from '@/lib/engagement';
import { getSession } from '@/lib/auth';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  const isAdmin = session?.role === 'admin';
  const dataStore = await getHydratedStore();
  const profile = dataStore.profiles.find(p => p.id === id);

  if (!profile) {
    return NextResponse.json({ error: 'Stakeholder not found' }, { status: 404 });
  }

  const nricHash = profile.nricHash;

  const interactions = dataStore.interactions
    .filter(i => i.nricHash === nricHash)
    .sort((a, b) => (b.meetingDate ?? '').localeCompare(a.meetingDate ?? ''));

  const events = dataStore.events
    .filter(e => e.nricHash === nricHash)
    .sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''));

  const awards = dataStore.awards
    .filter(a => a.nricHash === nricHash)
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0));

  const community = dataStore.community
    .filter(c => c.nricHash === nricHash)
    .sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''));

  const overseas = dataStore.overseasRepresentation
    .filter(o => o.nricHash === nricHash)
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0));

  const areasOfInterest = dataStore.areasOfInterest
    .filter(a => a.nricHash === nricHash);

  // Cross-agency count
  const agencies = new Set<string>();
  interactions.forEach(i => { if (i.agency) agencies.add(i.agency); });
  events.forEach(e => { if (e.organizerAgency) agencies.add(e.organizerAgency); });
  areasOfInterest.forEach(a => { if (a.agency) agencies.add(a.agency); });

  // Build timeline
  const timeline: { id: string; type: string; date: string; title: string; description: string | null; agency: string | null }[] = [];

  interactions.forEach(i => {
    timeline.push({
      id: i.id, type: 'interaction',
      date: i.meetingDate ?? '',
      title: i.interactionDetails ?? 'Interaction',
      description: i.briefNotes,
      agency: i.agency,
    });
  });

  events.forEach(e => {
    timeline.push({
      id: e.id, type: 'event',
      date: e.startDate ?? '',
      title: e.eventTitle,
      description: e.briefNotes,
      agency: e.organizerAgency,
    });
  });

  awards.forEach(a => {
    timeline.push({
      id: a.id, type: 'award',
      date: a.year ? `${a.year}-01-01` : '',
      title: a.awardName,
      description: a.description,
      agency: null,
    });
  });

  community.forEach(c => {
    timeline.push({
      id: c.id, type: 'community',
      date: c.startDate ?? '',
      title: `${c.role ?? 'Member'} at ${c.orgGroupName ?? 'Organisation'}`,
      description: c.description,
      agency: null,
    });
  });

  overseas.forEach(o => {
    timeline.push({
      id: o.id, type: 'overseas',
      date: o.year ? `${o.year}-01-01` : '',
      title: 'Overseas Representation',
      description: o.description,
      agency: null,
    });
  });

  timeline.sort((a, b) => b.date.localeCompare(a.date));

  const assignedRM = dataStore.relationshipManagers.find(rm => rm.nricHash === nricHash);

  return NextResponse.json({
    profile: {
      id: profile.id,
      nricMasked: isAdmin ? profile.nricMasked : profile.nricMasked.replace(/[A-Z0-9](?=.{4})/g, '•'),
      fullName: profile.fullName,
      caseId: profile.caseId,
      caseStatus: profile.caseStatus,
      race: profile.race,
      sex: profile.sex,
      email: isAdmin ? profile.email : null,
      mobileNumber: isAdmin ? profile.mobileNumber : null,
      residentialStatus: profile.residentialStatus,
      yearOfBirth: profile.yearOfBirth,
      employerOrg: profile.employerOrg,
      designation: profile.designation,
      dataConsent: profile.dataConsent,
      linkedinHandle: isAdmin ? profile.linkedinHandle : null,
      writeUp: profile.writeUp,
      reasonForNomination: profile.reasonForNomination,
      areasOfInterest: profile.areasOfInterest,
      rmDetails: profile.rmDetails,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    },
    interactions,
    events,
    awards,
    community,
    overseas,
    areasOfInterest,
    timeline,
    crossAgencyCount: agencies.size,
    agencies: Array.from(agencies),
    engagement: (await getScoreForStakeholder(id)) ?? null,
    canViewContact: isAdmin,
    assignedRM: assignedRM ? { name: assignedRM.name, email: assignedRM.email, agency: assignedRM.agency } : null,
  });
}
