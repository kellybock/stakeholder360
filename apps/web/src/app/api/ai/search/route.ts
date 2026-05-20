import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/lib/store';

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(t => t.length > 2);
}

function scoreMatch(query: string, text: string): number {
  const qTokens = tokenize(query);
  const tTokens = new Set(tokenize(text));
  if (qTokens.length === 0) return 0;

  let matches = 0;
  for (const qt of qTokens) {
    for (const tt of tTokens) {
      if (tt.includes(qt) || qt.includes(tt)) { matches++; break; }
    }
  }
  const exactMatch = text.toLowerCase().includes(query.toLowerCase()) ? 0.3 : 0;
  return matches / qTokens.length + exactMatch;
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim();
  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') ?? 10), 50);

  if (!q) {
    return NextResponse.json({ error: 'Query parameter q is required' }, { status: 400 });
  }

  const scored = dataStore.profiles.map(p => {
    const searchableText = [
      p.fullName,
      p.employerOrg,
      p.designation,
      p.areasOfInterest,
      p.writeUp,
      p.reasonForNomination,
      p.caseStatus,
    ].filter(Boolean).join(' ');

    const aois = dataStore.areasOfInterest
      .filter(a => a.nricHash === p.nricHash)
      .map(a => `${a.areaOfInterest} ${a.alignment ?? ''}`)
      .join(' ');

    const communityText = dataStore.community
      .filter(c => c.nricHash === p.nricHash)
      .map(c => `${c.role ?? ''} ${c.orgGroupName ?? ''} ${c.description ?? ''}`)
      .join(' ');

    const interactionText = dataStore.interactions
      .filter(i => i.nricHash === p.nricHash)
      .map(i => `${i.interactionDetails ?? ''} ${i.briefNotes ?? ''}`)
      .join(' ');

    const fullText = `${searchableText} ${aois} ${communityText} ${interactionText}`;
    const score = scoreMatch(q, fullText);

    return { profile: p, score };
  });

  const results = scored
    .filter(s => s.score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => {
      const p = s.profile;
      const interactionCount = dataStore.interactions.filter(i => i.nricHash === p.nricHash).length;
      const eventCount = dataStore.events.filter(e => e.nricHash === p.nricHash).length;
      const aois = dataStore.areasOfInterest
        .filter(a => a.nricHash === p.nricHash)
        .map(a => a.areaOfInterest);

      return {
        id: p.id,
        fullName: p.fullName,
        caseStatus: p.caseStatus,
        employerOrg: p.employerOrg,
        designation: p.designation,
        areasOfInterest: aois,
        interactionCount,
        eventCount,
        relevanceScore: Math.round(s.score * 100),
      };
    });

  return NextResponse.json({ query: q, results, total: results.length });
}
