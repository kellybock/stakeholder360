import { NextRequest } from 'next/server';
import { createLLMProvider } from '@youth360/ai';
import { getHydratedStore } from '@/lib/store';
import { getProviderApiKey } from '@/lib/ai-settings';

export async function POST(request: NextRequest) {
  const dataStore = await getHydratedStore();
  const { stakeholderId, provider: providerName = 'claude' } = await request.json();

  if (!stakeholderId) {
    return new Response(JSON.stringify({ error: 'stakeholderId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const profile = dataStore.profiles.find(p => p.id === stakeholderId);
  if (!profile) {
    return new Response(JSON.stringify({ error: 'Stakeholder not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const interactions = dataStore.interactions
    .filter(i => i.nricHash === profile.nricHash)
    .sort((a, b) => (b.meetingDate ?? '').localeCompare(a.meetingDate ?? ''));

  const events = dataStore.events
    .filter(e => e.nricHash === profile.nricHash)
    .sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''));

  const awards = dataStore.awards.filter(a => a.nricHash === profile.nricHash);
  const community = dataStore.community.filter(c => c.nricHash === profile.nricHash);
  const overseas = dataStore.overseasRepresentation.filter(o => o.nricHash === profile.nricHash);
  const aois = dataStore.areasOfInterest.filter(a => a.nricHash === profile.nricHash);

  const agencies = new Set<string>();
  interactions.forEach(i => { if (i.agency) agencies.add(i.agency); });
  events.forEach(e => { if (e.organizerAgency) agencies.add(e.organizerAgency); });
  aois.forEach(a => { if (a.agency) agencies.add(a.agency); });

  const stakeholderData = `
STAKEHOLDER PROFILE:
- Name: ${profile.fullName}
- NRIC (masked): ${profile.nricMasked}
- Status: ${profile.caseStatus ?? 'Unknown'}
- Organisation: ${profile.employerOrg ?? 'N/A'} | Designation: ${profile.designation ?? 'N/A'}
- Race: ${profile.race ?? 'N/A'} | Sex: ${profile.sex ?? 'N/A'} | YOB: ${profile.yearOfBirth ?? 'N/A'}
- Email: ${profile.email ?? 'N/A'} | Mobile: ${profile.mobileNumber ?? 'N/A'}
- Areas of Interest: ${profile.areasOfInterest ?? 'None listed'}
- Write-up: ${profile.writeUp ?? 'None'}
- Nomination reason: ${profile.reasonForNomination ?? 'None'}
- Known to ${agencies.size} agencies: ${Array.from(agencies).map(a => a.match(/\(([^)]+)\)/)?.[1] ?? a).join(', ')}

INTERACTION HISTORY (${interactions.length} total):
${interactions.slice(0, 10).map(i => `- [${i.meetingDate}] ${i.interactionDetails} (POC: ${i.pocStaffName}, ${i.agency ? i.agency.match(/\(([^)]+)\)/)?.[1] ?? i.agency : 'N/A'})${i.briefNotes ? ` — ${i.briefNotes}` : ''}`).join('\n')}

EVENT PARTICIPATION (${events.length} total):
${events.slice(0, 10).map(e => `- [${e.startDate}] ${e.eventTitle} (${e.organizerAgency ? e.organizerAgency.match(/\(([^)]+)\)/)?.[1] ?? e.organizerAgency : 'N/A'}) — Role: ${e.roleOfYouth ?? 'N/A'}, Attendance: ${e.attendance ?? 'N/A'}`).join('\n')}

AWARDS (${awards.length}):
${awards.map(a => `- ${a.awardName} (${a.year ?? 'N/A'})`).join('\n') || 'None'}

COMMUNITY INVOLVEMENT (${community.length}):
${community.map(c => `- ${c.role ?? 'Member'} at ${c.orgGroupName ?? 'N/A'} (${c.startDate ?? '?'} — ${c.endDate ?? 'Present'})`).join('\n') || 'None'}

OVERSEAS REPRESENTATION (${overseas.length}):
${overseas.map(o => `- Year ${o.year}: ${o.description ?? 'N/A'}`).join('\n') || 'None'}

AREAS OF INTEREST (detailed):
${aois.map(a => `- ${a.areaOfInterest}: Interest=${a.levelOfInterest ?? 'N/A'}, Influence=${a.levelOfInfluence ?? 'N/A'}, Agency=${a.agency ? a.agency.match(/\(([^)]+)\)/)?.[1] ?? a.agency : 'N/A'}`).join('\n') || 'None'}`;

  const prompt = `You are Youth360 AI, preparing a meeting brief for a Singapore government Relationship Manager.

Based on the following stakeholder data, generate a comprehensive meeting preparation brief in markdown format:

${stakeholderData}

Generate the brief with these sections:
1. **Executive Summary** — 2-3 sentence overview of who this stakeholder is and why they matter
2. **Key Facts** — Quick-reference bullet points (name, org, status, key dates)
3. **Engagement History** — Summary of interaction pattern, frequency, recent touchpoints
4. **Cross-Agency Connections** — Which agencies they're connected to and through what
5. **Strengths & Contributions** — Awards, community roles, overseas representation
6. **Areas of Interest** — What they care about, interest/influence levels
7. **Suggested Talking Points** — 3-5 specific conversation starters based on their profile
8. **Recommended Next Actions** — 2-3 concrete next steps for the RM

Keep it actionable and specific. Use Singapore English.`;

  let llm;
  try {
    const apiKey = getProviderApiKey(providerName) ?? undefined;
    llm = createLLMProvider(providerName, apiKey);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to create LLM provider';
    const hint = msg.includes('not set')
      ? `${msg}. Configure your API key in Admin > Settings to enable AI features.`
      : msg;
    return new Response(JSON.stringify({ error: hint }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of llm.chatStream({
          messages: [{ role: 'user', content: prompt }],
          maxTokens: 3000,
        })) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk.text, done: chunk.done })}\n\n`));
          if (chunk.done) break;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Brief generation failed';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg, done: true })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
