import { NextResponse } from 'next/server';
import { getHydratedStore } from '@/lib/store';

export async function GET() {
  const dataStore = await getHydratedStore();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);

  const recentByStakeholder = new Map<string, { agencies: Set<string>; details: { agency: string; date: string; type: string }[] }>();

  dataStore.interactions
    .filter(i => i.meetingDate && i.meetingDate >= thirtyDaysAgo && i.agency)
    .forEach(i => {
      if (!recentByStakeholder.has(i.nricHash)) {
        recentByStakeholder.set(i.nricHash, { agencies: new Set(), details: [] });
      }
      const entry = recentByStakeholder.get(i.nricHash)!;
      entry.agencies.add(i.agency!);
      entry.details.push({
        agency: i.agency!.match(/\(([^)]+)\)/)?.[1] ?? i.agency!,
        date: i.meetingDate!,
        type: 'interaction',
      });
    });

  dataStore.events
    .filter(e => e.startDate && e.startDate >= thirtyDaysAgo && e.organizerAgency)
    .forEach(e => {
      if (!recentByStakeholder.has(e.nricHash)) {
        recentByStakeholder.set(e.nricHash, { agencies: new Set(), details: [] });
      }
      const entry = recentByStakeholder.get(e.nricHash)!;
      entry.agencies.add(e.organizerAgency!);
      entry.details.push({
        agency: e.organizerAgency!.match(/\(([^)]+)\)/)?.[1] ?? e.organizerAgency!,
        date: e.startDate!,
        type: 'event',
      });
    });

  const alerts = Array.from(recentByStakeholder.entries())
    .filter(([, v]) => v.agencies.size >= 2)
    .map(([nricHash, v]) => {
      const profile = dataStore.profiles.find(p => p.nricHash === nricHash);
      return {
        stakeholderId: profile?.id ?? '',
        fullName: profile?.fullName ?? 'Unknown',
        agencyCount: v.agencies.size,
        agencies: Array.from(v.agencies).map(a => a.match(/\(([^)]+)\)/)?.[1] ?? a),
        recentTouchpoints: v.details.length,
        lastDate: v.details.sort((a, b) => b.date.localeCompare(a.date))[0]?.date ?? '',
      };
    })
    .sort((a, b) => b.agencyCount - a.agencyCount || b.recentTouchpoints - a.recentTouchpoints)
    .slice(0, 10);

  return NextResponse.json({ alerts, total: alerts.length });
}
