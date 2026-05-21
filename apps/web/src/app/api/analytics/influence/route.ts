import { NextRequest, NextResponse } from 'next/server';
import { getHydratedStore } from '@/lib/store';

const LEVEL_MAP: Record<string, number> = { High: 3, Medium: 2, Low: 1 };

export async function GET(request: NextRequest) {
  const dataStore = await getHydratedStore();
  const agency = request.nextUrl.searchParams.get('agency') ?? '';
  const aoi = request.nextUrl.searchParams.get('aoi') ?? '';

  let records = dataStore.areasOfInterest;
  if (agency) records = records.filter(a => a.agency?.includes(agency));
  if (aoi) records = records.filter(a => a.areaOfInterest === aoi);

  const stakeholderMap = new Map<string, {
    nricHash: string;
    interest: number;
    influence: number;
    aois: string[];
    agencies: Set<string>;
  }>();

  for (const r of records) {
    const existing = stakeholderMap.get(r.nricHash);
    const interest = LEVEL_MAP[r.levelOfInterest ?? ''] ?? 0;
    const influence = LEVEL_MAP[r.levelOfInfluence ?? ''] ?? 0;

    if (existing) {
      existing.interest = Math.max(existing.interest, interest);
      existing.influence = Math.max(existing.influence, influence);
      if (!existing.aois.includes(r.areaOfInterest)) existing.aois.push(r.areaOfInterest);
      if (r.agency) existing.agencies.add(r.agency);
    } else {
      stakeholderMap.set(r.nricHash, {
        nricHash: r.nricHash,
        interest,
        influence,
        aois: [r.areaOfInterest],
        agencies: new Set(r.agency ? [r.agency] : []),
      });
    }
  }

  const points = Array.from(stakeholderMap.values()).map(s => {
    const profile = dataStore.profiles.find(p => p.nricHash === s.nricHash);
    return {
      id: profile?.id ?? '',
      fullName: profile?.fullName ?? 'Unknown',
      caseStatus: profile?.caseStatus ?? null,
      interest: s.interest,
      influence: s.influence,
      aois: s.aois,
      agencyCount: s.agencies.size,
      quadrant: s.interest >= 2 && s.influence >= 2 ? 'Key Player'
        : s.interest >= 2 ? 'Keep Informed'
        : s.influence >= 2 ? 'Keep Satisfied'
        : 'Monitor',
    };
  });

  const allAOIs = [...new Set(dataStore.areasOfInterest.map(a => a.areaOfInterest))].sort();
  const allAgencies = [...new Set(dataStore.areasOfInterest.map(a => a.agency).filter(Boolean) as string[])].sort();

  const quadrantCounts: Record<string, number> = {};
  points.forEach(p => { quadrantCounts[p.quadrant] = (quadrantCounts[p.quadrant] || 0) + 1; });

  return NextResponse.json({
    points,
    filters: { aois: allAOIs, agencies: allAgencies },
    quadrantCounts,
    total: points.length,
  });
}
