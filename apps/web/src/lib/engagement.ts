import { getHydratedStore, type StoredProfile } from './store';
import { ENGAGEMENT_WEIGHTS } from '@youth360/shared';

export interface EngagementScore {
  nricHash: string;
  stakeholderId: string;
  fullName: string;
  totalScore: number;
  recencyScore: number;
  frequencyScore: number;
  depthScore: number;
  breadthScore: number;
  segment: string;
  churnRisk: number;
  lastContactDate: string | null;
  daysSinceContact: number | null;
}

// Module-level reference set by hydration; helper functions use this.
let dataStore: Awaited<ReturnType<typeof getHydratedStore>>;

function daysBetween(d1: string, d2: Date): number {
  return Math.floor((d2.getTime() - new Date(d1).getTime()) / 86400000);
}

function computeRecency(profile: StoredProfile, now: Date): { score: number; lastContact: string | null; days: number | null } {
  const dates: string[] = [];

  dataStore.interactions
    .filter(i => i.nricHash === profile.nricHash && i.meetingDate)
    .forEach(i => dates.push(i.meetingDate!));

  dataStore.events
    .filter(e => e.nricHash === profile.nricHash && e.startDate)
    .forEach(e => dates.push(e.startDate!));

  if (dates.length === 0) return { score: 0, lastContact: null, days: null };

  dates.sort((a, b) => b.localeCompare(a));
  const lastContact = dates[0];
  const days = daysBetween(lastContact, now);
  const score = Math.min(100, Math.max(0, 100 - (days / 365) * 100));
  return { score, lastContact, days: Math.max(0, days) };
}

function computeFrequency(profile: StoredProfile): number {
  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 365 * 86400000).toISOString().slice(0, 10);

  const interactionsLast12m = dataStore.interactions
    .filter(i => i.nricHash === profile.nricHash && i.meetingDate && i.meetingDate >= oneYearAgo)
    .length;

  const eventsLast12m = dataStore.events
    .filter(e => e.nricHash === profile.nricHash && e.startDate && e.startDate >= oneYearAgo)
    .length;

  return Math.min(100, interactionsLast12m * 10 + eventsLast12m * 8);
}

function computeDepth(profile: StoredProfile): number {
  let score = 0;

  const communityRoles = dataStore.community.filter(c => c.nricHash === profile.nricHash).length;
  if (communityRoles > 0) score += 25;

  const awards = dataStore.awards.filter(a => a.nricHash === profile.nricHash);
  score += Math.min(30, awards.length * 15);

  const overseas = dataStore.overseasRepresentation.filter(o => o.nricHash === profile.nricHash);
  score += Math.min(30, overseas.length * 20);

  const events = dataStore.events.filter(e => e.nricHash === profile.nricHash);
  const roles = new Set(events.map(e => e.roleOfYouth).filter(Boolean));
  if (roles.size > 1) score += 15;

  return Math.min(100, score);
}

function computeBreadth(profile: StoredProfile): number {
  const aois = dataStore.areasOfInterest.filter(a => a.nricHash === profile.nricHash);
  const distinctAOIs = new Set(aois.map(a => a.areaOfInterest)).size;

  const agencies = new Set<string>();
  dataStore.interactions.filter(i => i.nricHash === profile.nricHash).forEach(i => { if (i.agency) agencies.add(i.agency); });
  dataStore.events.filter(e => e.nricHash === profile.nricHash).forEach(e => { if (e.organizerAgency) agencies.add(e.organizerAgency); });
  aois.forEach(a => { if (a.agency) agencies.add(a.agency); });

  return Math.min(100, distinctAOIs * 15 + agencies.size * 20);
}

function determineSegment(totalScore: number, recencyScore: number, frequencyScore: number, daysSinceContact: number | null): string {
  if (daysSinceContact !== null && daysSinceContact > 180) return 'Dormant';
  if (totalScore >= 75 && recencyScore >= 50) return 'Champion';
  if (totalScore >= 50 && (frequencyScore >= 30 || recencyScore >= 60)) return 'Rising Star';
  if (recencyScore < 40 || (daysSinceContact !== null && daysSinceContact > 90)) return 'At-Risk';
  return 'Active';
}

function computeChurnRisk(daysSinceContact: number | null, frequencyScore: number): number {
  if (daysSinceContact === null) return 80;
  if (daysSinceContact > 180) return 95;
  if (daysSinceContact > 120) return 70;
  if (daysSinceContact > 90) return 50;
  if (daysSinceContact > 60) return 30;
  if (frequencyScore < 20) return 40;
  return 10;
}

const globalScores = globalThis as unknown as { __engagementScores?: EngagementScore[] };

export function clearEngagementCache(): void {
  globalScores.__engagementScores = undefined;
}

export async function calculateAllScores(): Promise<EngagementScore[]> {
  dataStore = await getHydratedStore();
  const now = new Date();
  const scores: EngagementScore[] = [];

  for (const profile of dataStore.profiles) {
    const { score: recencyScore, lastContact, days } = computeRecency(profile, now);
    const frequencyScore = computeFrequency(profile);
    const depthScore = computeDepth(profile);
    const breadthScore = computeBreadth(profile);

    const totalScore = Math.round(
      recencyScore * ENGAGEMENT_WEIGHTS.recency +
      frequencyScore * ENGAGEMENT_WEIGHTS.frequency +
      depthScore * ENGAGEMENT_WEIGHTS.depth +
      breadthScore * ENGAGEMENT_WEIGHTS.breadth
    );

    const segment = determineSegment(totalScore, recencyScore, frequencyScore, days);
    const churnRisk = computeChurnRisk(days, frequencyScore);

    scores.push({
      nricHash: profile.nricHash,
      stakeholderId: profile.id,
      fullName: profile.fullName,
      totalScore,
      recencyScore: Math.round(recencyScore),
      frequencyScore: Math.round(frequencyScore),
      depthScore: Math.round(depthScore),
      breadthScore: Math.round(breadthScore),
      segment,
      churnRisk,
      lastContactDate: lastContact,
      daysSinceContact: days,
    });
  }

  globalScores.__engagementScores = scores;
  return scores;
}

export async function getEngagementScores(): Promise<EngagementScore[]> {
  if (globalScores.__engagementScores && globalScores.__engagementScores.length > 0) {
    return globalScores.__engagementScores;
  }
  return calculateAllScores();
}

export async function getScoreForStakeholder(stakeholderId: string): Promise<EngagementScore | undefined> {
  return (await getEngagementScores()).find(s => s.stakeholderId === stakeholderId);
}
