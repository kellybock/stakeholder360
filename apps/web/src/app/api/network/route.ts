import { NextRequest, NextResponse } from 'next/server';
import { getHydratedStore } from '@/lib/store';
import { getEngagementScores } from '@/lib/engagement';

type GraphNode = {
  id: string;
  fullName: string;
  caseStatus: string | null;
  segment: string;
  score: number;
  agencyCount: number;
};

type GraphEdge = {
  source: string;
  target: string;
  type: string;
  label: string;
  weight: number;
  labels: { type: string; name: string }[];
};

export async function GET(request: NextRequest) {
  const dataStore = await getHydratedStore();
  const agencyFilter = request.nextUrl.searchParams.get('agency') ?? '';
  const aoiFilter = request.nextUrl.searchParams.get('aoi') ?? '';
  const edgeType = request.nextUrl.searchParams.get('edgeType') ?? '';
  const minConnections = Number(request.nextUrl.searchParams.get('minConnections') ?? 1);

  const scores = await getEngagementScores();
  const scoreMap = new Map(scores.map(s => [s.stakeholderId, s]));

  let profiles = dataStore.profiles;
  if (agencyFilter) {
    const agencyNrics = new Set<string>();
    dataStore.interactions.forEach(i => {
      if (i.agency?.includes(agencyFilter)) agencyNrics.add(i.nricHash);
    });
    dataStore.events.forEach(e => {
      if (e.organizerAgency?.includes(agencyFilter)) agencyNrics.add(e.nricHash);
    });
    dataStore.areasOfInterest.forEach(a => {
      if (a.agency?.includes(agencyFilter)) agencyNrics.add(a.nricHash);
    });
    profiles = profiles.filter(p => agencyNrics.has(p.nricHash));
  }

  if (aoiFilter) {
    const aoiNrics = new Set(
      dataStore.areasOfInterest
        .filter(a => a.areaOfInterest === aoiFilter)
        .map(a => a.nricHash)
    );
    profiles = profiles.filter(p => aoiNrics.has(p.nricHash));
  }

  const profileMap = new Map(profiles.map(p => [p.nricHash, p]));

  const edgeMap = new Map<string, GraphEdge>();

  function addEdge(nric1: string, nric2: string, type: string, label: string) {
    if (nric1 === nric2) return;
    const p1 = profileMap.get(nric1);
    const p2 = profileMap.get(nric2);
    if (!p1 || !p2) return;

    const pairKey = [p1.id, p2.id].sort().join('-');
    const existing = edgeMap.get(pairKey);

    if (existing) {
      const alreadyHas = existing.labels.some(l => l.type === type && l.name === label);
      if (!alreadyHas) {
        existing.labels.push({ type, name: label });
        existing.weight = existing.labels.length;
      }
    } else {
      edgeMap.set(pairKey, {
        source: p1.id,
        target: p2.id,
        type,
        label,
        weight: 1,
        labels: [{ type, name: label }],
      });
    }
  }

  if (!edgeType || edgeType === 'event') {
    const eventAttendees = new Map<string, string[]>();
    dataStore.events.forEach(e => {
      const title = e.eventTitle;
      if (!eventAttendees.has(title)) eventAttendees.set(title, []);
      if (profileMap.has(e.nricHash)) {
        eventAttendees.get(title)!.push(e.nricHash);
      }
    });
    eventAttendees.forEach((attendees, eventTitle) => {
      if (attendees.length < 2 || attendees.length > 20) return;
      for (let i = 0; i < attendees.length; i++) {
        for (let j = i + 1; j < attendees.length; j++) {
          addEdge(attendees[i], attendees[j], 'event', eventTitle);
        }
      }
    });
  }

  if (!edgeType || edgeType === 'aoi') {
    const aoiMembers = new Map<string, string[]>();
    dataStore.areasOfInterest.forEach(a => {
      if (!aoiMembers.has(a.areaOfInterest)) aoiMembers.set(a.areaOfInterest, []);
      if (profileMap.has(a.nricHash) && !aoiMembers.get(a.areaOfInterest)!.includes(a.nricHash)) {
        aoiMembers.get(a.areaOfInterest)!.push(a.nricHash);
      }
    });
    aoiMembers.forEach((members, aoiName) => {
      if (members.length < 2 || members.length > 50) return;
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          addEdge(members[i], members[j], 'aoi', aoiName);
        }
      }
    });
  }

  if (!edgeType || edgeType === 'org') {
    const orgMembers = new Map<string, string[]>();
    dataStore.community.forEach(c => {
      if (!c.orgGroupName) return;
      if (!orgMembers.has(c.orgGroupName)) orgMembers.set(c.orgGroupName, []);
      if (profileMap.has(c.nricHash)) {
        orgMembers.get(c.orgGroupName)!.push(c.nricHash);
      }
    });
    orgMembers.forEach((members, orgName) => {
      if (members.length < 2) return;
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          addEdge(members[i], members[j], 'org', orgName);
        }
      }
    });
  }

  const edges = Array.from(edgeMap.values());

  const connectionCounts = new Map<string, number>();
  edges.forEach(e => {
    connectionCounts.set(e.source, (connectionCounts.get(e.source) ?? 0) + 1);
    connectionCounts.set(e.target, (connectionCounts.get(e.target) ?? 0) + 1);
  });

  const connectedIds = new Set<string>();
  connectionCounts.forEach((count, id) => {
    if (count >= minConnections) connectedIds.add(id);
  });

  const filteredEdges = edges.filter(e => connectedIds.has(e.source) && connectedIds.has(e.target));

  const nodeIds = new Set<string>();
  filteredEdges.forEach(e => { nodeIds.add(e.source); nodeIds.add(e.target); });

  const nodes: GraphNode[] = [];
  for (const profile of profiles) {
    if (!nodeIds.has(profile.id)) continue;
    const eng = scoreMap.get(profile.id);
    const agencySet = new Set<string>();
    dataStore.interactions.filter(i => i.nricHash === profile.nricHash).forEach(i => { if (i.agency) agencySet.add(i.agency); });
    dataStore.events.filter(e => e.nricHash === profile.nricHash).forEach(e => { if (e.organizerAgency) agencySet.add(e.organizerAgency); });

    nodes.push({
      id: profile.id,
      fullName: profile.fullName,
      caseStatus: profile.caseStatus,
      segment: eng?.segment ?? 'Unknown',
      score: eng?.totalScore ?? 0,
      agencyCount: agencySet.size,
    });
  }

  const allAOIs = [...new Set(dataStore.areasOfInterest.map(a => a.areaOfInterest))].sort();

  return NextResponse.json({
    nodes,
    edges: filteredEdges,
    nodeCount: nodes.length,
    edgeCount: filteredEdges.length,
    filters: { aois: allAOIs },
  });
}
