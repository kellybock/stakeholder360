import { NextResponse } from 'next/server';
import { getHydratedStore } from '@/lib/store';
import { getScoreForStakeholder } from '@/lib/engagement';

type Recommendation = {
  type: 'action' | 'connection' | 'event' | 'alert';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const dataStore = await getHydratedStore();
  const profile = dataStore.profiles.find(p => p.id === id);
  if (!profile) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const engagement = await getScoreForStakeholder(id);
  const interactions = dataStore.interactions.filter(i => i.nricHash === profile.nricHash);
  const events = dataStore.events.filter(e => e.nricHash === profile.nricHash);
  const awards = dataStore.awards.filter(a => a.nricHash === profile.nricHash);
  const community = dataStore.community.filter(c => c.nricHash === profile.nricHash);
  const aois = dataStore.areasOfInterest.filter(a => a.nricHash === profile.nricHash);

  const recommendations: Recommendation[] = [];

  if (engagement) {
    if (engagement.daysSinceContact !== null && engagement.daysSinceContact > 90) {
      recommendations.push({
        type: 'action',
        priority: 'high',
        title: 'Schedule a catch-up meeting',
        description: `Last contact was ${engagement.daysSinceContact} days ago. Reach out to maintain the relationship before it goes dormant.`,
      });
    }

    if (engagement.segment === 'Rising Star') {
      recommendations.push({
        type: 'action',
        priority: 'medium',
        title: 'Consider for Champion nomination',
        description: `${profile.fullName} shows strong engagement (score: ${engagement.totalScore}). They could be a candidate for Champion status with a bit more involvement.`,
      });
    }

    if (engagement.segment === 'Dormant') {
      recommendations.push({
        type: 'action',
        priority: 'high',
        title: 'Re-engagement outreach needed',
        description: `This stakeholder has become dormant. Consider inviting them to an upcoming event or scheduling a 1-on-1 to understand their current priorities.`,
      });
    }

    if (engagement.segment === 'Champion' && awards.length === 0) {
      recommendations.push({
        type: 'action',
        priority: 'medium',
        title: 'Nominate for an award',
        description: `${profile.fullName} is a Champion-level stakeholder but hasn't received any awards yet. Consider nominating them for recognition.`,
      });
    }
  }

  if (aois.length > 0) {
    const stakeholderAOIs = aois.map(a => a.areaOfInterest);
    const similarStakeholders = dataStore.profiles
      .filter(p => p.id !== id)
      .filter(p => {
        const theirAOIs = dataStore.areasOfInterest
          .filter(a => a.nricHash === p.nricHash)
          .map(a => a.areaOfInterest);
        return theirAOIs.some(a => stakeholderAOIs.includes(a));
      })
      .slice(0, 3);

    if (similarStakeholders.length > 0) {
      recommendations.push({
        type: 'connection',
        priority: 'medium',
        title: 'Connect with similar stakeholders',
        description: `Stakeholders with shared interests: ${similarStakeholders.map(s => s.fullName).join(', ')}. Consider facilitating introductions.`,
      });
    }
  }

  if (events.length > 0 && community.length === 0) {
    recommendations.push({
      type: 'action',
      priority: 'low',
      title: 'Encourage community involvement',
      description: `${profile.fullName} has attended ${events.length} events but has no community roles. Suggest joining a youth committee or advisory group.`,
    });
  }

  const stakeholderAgencies = new Set<string>();
  interactions.forEach(i => { if (i.agency) stakeholderAgencies.add(i.agency); });
  events.forEach(e => { if (e.organizerAgency) stakeholderAgencies.add(e.organizerAgency); });
  aois.forEach(a => { if (a.agency) stakeholderAgencies.add(a.agency); });

  if (stakeholderAgencies.size >= 3) {
    recommendations.push({
      type: 'alert',
      priority: 'medium',
      title: 'Cross-agency coordination recommended',
      description: `This stakeholder is connected to ${stakeholderAgencies.size} agencies. Consider coordinating engagement to avoid duplication or conflicting outreach.`,
    });
  }

  if (interactions.length > 0) {
    const agencies = new Set(interactions.map(i => i.agency).filter(Boolean));
    if (agencies.size >= 2) {
      recommendations.push({
        type: 'alert',
        priority: 'low',
        title: 'Multiple agencies engaging',
        description: `Interactions logged by: ${Array.from(agencies).map(a => (a ?? '').match(/\(([^)]+)\)/)?.[1] ?? a).join(', ')}. Ensure coordinated messaging.`,
      });
    }
  }

  if (profile.areasOfInterest) {
    const interests = profile.areasOfInterest.split(';').map(a => a.trim()).filter(Boolean);
    const upcomingEvents = dataStore.events
      .filter(e => {
        if (!e.startDate) return false;
        const eventDate = new Date(e.startDate);
        const now = new Date();
        return eventDate > now;
      })
      .filter(e => {
        const eventAOI = e.aoiForEvent ?? '';
        return interests.some(i => eventAOI.toLowerCase().includes(i.toLowerCase()));
      })
      .slice(0, 2);

    if (upcomingEvents.length > 0) {
      recommendations.push({
        type: 'event',
        priority: 'medium',
        title: 'Relevant upcoming events',
        description: `Consider inviting to: ${upcomingEvents.map(e => e.eventTitle).join(', ')}`,
      });
    }
  }

  recommendations.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });

  return NextResponse.json({ recommendations });
}
