import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/store';
import { getEngagementScores } from '@/lib/engagement';

export async function GET() {
  const profiles = dataStore.profiles;
  const interactions = dataStore.interactions;
  const events = dataStore.events;

  const totalStakeholders = profiles.length;

  // Active this month: stakeholders with interactions or events in the last 30 days
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);
  const recentNrics = new Set<string>();
  interactions.forEach(i => {
    if (i.meetingDate && i.meetingDate >= thirtyDaysAgo) recentNrics.add(i.nricHash);
  });
  events.forEach(e => {
    if (e.startDate && e.startDate >= thirtyDaysAgo) recentNrics.add(e.nricHash);
  });

  // Cross-agency overlap: stakeholders known to 2+ agencies
  const stakeholderAgencies = new Map<string, Set<string>>();
  interactions.forEach(i => {
    if (!i.agency) return;
    if (!stakeholderAgencies.has(i.nricHash)) stakeholderAgencies.set(i.nricHash, new Set());
    stakeholderAgencies.get(i.nricHash)!.add(i.agency);
  });
  events.forEach(e => {
    if (!e.organizerAgency) return;
    if (!stakeholderAgencies.has(e.nricHash)) stakeholderAgencies.set(e.nricHash, new Set());
    stakeholderAgencies.get(e.nricHash)!.add(e.organizerAgency);
  });
  dataStore.areasOfInterest.forEach(a => {
    if (!a.agency) return;
    if (!stakeholderAgencies.has(a.nricHash)) stakeholderAgencies.set(a.nricHash, new Set());
    stakeholderAgencies.get(a.nricHash)!.add(a.agency);
  });
  let crossAgencyCount = 0;
  stakeholderAgencies.forEach(agencies => {
    if (agencies.size >= 2) crossAgencyCount++;
  });

  // Status distribution
  const statusCounts: Record<string, number> = {};
  profiles.forEach(p => {
    const s = p.caseStatus || 'Unknown';
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });

  // Agency distribution
  const agencyCounts: Record<string, number> = {};
  stakeholderAgencies.forEach(agencies => {
    agencies.forEach(a => {
      const short = a.match(/\(([^)]+)\)/)?.[1] ?? a.slice(0, 10);
      agencyCounts[short] = (agencyCounts[short] || 0) + 1;
    });
  });

  // Recent activity feed (last 10 interactions/events)
  const recentActivity: { type: string; title: string; date: string; stakeholder: string }[] = [];
  interactions
    .filter(i => i.meetingDate)
    .sort((a, b) => (b.meetingDate ?? '').localeCompare(a.meetingDate ?? ''))
    .slice(0, 5)
    .forEach(i => {
      const profile = profiles.find(p => p.nricHash === i.nricHash);
      recentActivity.push({
        type: 'interaction',
        title: i.interactionDetails ?? 'Interaction',
        date: i.meetingDate!,
        stakeholder: profile?.fullName ?? 'Unknown',
      });
    });
  events
    .filter(e => e.startDate)
    .sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''))
    .slice(0, 5)
    .forEach(e => {
      const profile = profiles.find(p => p.nricHash === e.nricHash);
      recentActivity.push({
        type: 'event',
        title: e.eventTitle,
        date: e.startDate!,
        stakeholder: profile?.fullName ?? 'Unknown',
      });
    });
  recentActivity.sort((a, b) => b.date.localeCompare(a.date));

  const engagementScores = getEngagementScores();
  const avgEngagement = engagementScores.length > 0
    ? Math.round(engagementScores.reduce((sum, s) => sum + s.totalScore, 0) / engagementScores.length)
    : 0;

  return NextResponse.json({
    totalStakeholders,
    activeThisMonth: recentNrics.size,
    crossAgencyOverlap: crossAgencyCount,
    avgEngagementScore: avgEngagement,
    statusDistribution: Object.entries(statusCounts).map(([name, value]) => ({ name, value })),
    agencyDistribution: Object.entries(agencyCounts).map(([name, value]) => ({ name, value })),
    recentActivity: recentActivity.slice(0, 8),
  });
}
