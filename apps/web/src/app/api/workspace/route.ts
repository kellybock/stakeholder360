import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/store';
import { getEngagementScores } from '@/lib/engagement';

export async function GET() {
  const scores = getEngagementScores();
  const scoreMap = new Map(scores.map(s => [s.nricHash, s]));

  const profiles = dataStore.profiles;
  const now = new Date();

  const stakeholders = profiles.map(p => {
    const eng = scoreMap.get(p.nricHash);
    const lastInteraction = dataStore.interactions
      .filter(i => i.nricHash === p.nricHash && i.meetingDate)
      .sort((a, b) => (b.meetingDate ?? '').localeCompare(a.meetingDate ?? ''))
      [0];

    const lastContact = lastInteraction?.meetingDate ?? null;
    const daysSince = lastContact
      ? Math.max(0, Math.floor((now.getTime() - new Date(lastContact).getTime()) / 86400000))
      : null;

    let ragStatus: 'green' | 'amber' | 'red' | 'grey' = 'grey';
    if (daysSince !== null) {
      if (daysSince <= 60) ragStatus = 'green';
      else if (daysSince <= 90) ragStatus = 'amber';
      else ragStatus = 'red';
    }

    return {
      id: p.id,
      fullName: p.fullName,
      caseStatus: p.caseStatus,
      employerOrg: p.employerOrg,
      segment: eng?.segment ?? 'Unknown',
      totalScore: eng?.totalScore ?? 0,
      churnRisk: eng?.churnRisk ?? 0,
      lastContact,
      daysSinceContact: daysSince,
      ragStatus,
    };
  });

  const overdue = stakeholders
    .filter(s => s.ragStatus === 'red')
    .sort((a, b) => (b.daysSinceContact ?? 0) - (a.daysSinceContact ?? 0));

  const atRisk = stakeholders
    .filter(s => s.segment === 'At-Risk' || s.segment === 'Dormant')
    .sort((a, b) => b.churnRisk - a.churnRisk);

  const pipeline: Record<string, typeof stakeholders> = {
    Nominated: stakeholders.filter(s => s.caseStatus === 'Nominated'),
    Active: stakeholders.filter(s => s.caseStatus === 'Active'),
    Champion: stakeholders.filter(s => s.caseStatus === 'Champion'),
    Advocate: stakeholders.filter(s => s.caseStatus === 'Advocate'),
    Dormant: stakeholders.filter(s => s.caseStatus === 'Dormant'),
  };

  return NextResponse.json({
    total: stakeholders.length,
    overdue: overdue.slice(0, 15),
    atRisk: atRisk.slice(0, 15),
    pipeline,
    summary: {
      green: stakeholders.filter(s => s.ragStatus === 'green').length,
      amber: stakeholders.filter(s => s.ragStatus === 'amber').length,
      red: stakeholders.filter(s => s.ragStatus === 'red').length,
      grey: stakeholders.filter(s => s.ragStatus === 'grey').length,
    },
  });
}
