import { NextRequest } from 'next/server';
import { createLLMProvider, type LLMMessage } from '@youth360/ai';
import { dataStore, getHydratedStore } from '@/lib/store';
import { getProviderApiKey } from '@/lib/ai-settings';
import { getEngagementScores } from '@/lib/engagement';

const SYSTEM_PROMPT = `You are Youth360 AI, an intelligent assistant for Singapore government Relationship Managers (RMs) who manage youth stakeholder engagement across agencies (MCCY, NYC, PA, MOE, MSF).

You help RMs with:
- Finding and understanding stakeholder profiles
- Analysing engagement patterns and cross-agency connections
- Preparing meeting briefs and talking points
- Identifying stakeholders with shared interests or complementary skills
- Suggesting next-best-actions for stakeholder engagement

You have FULL ACCESS to the stakeholder database. A summary of the database is provided below, along with any relevant stakeholder details matching the user's query.

When answering, be specific and cite stakeholder names, dates, and agencies where relevant. Use Singapore English conventions. Format responses with markdown for readability.`;

async function buildDatabaseSummary(): Promise<string> {
  const profiles = dataStore.profiles;
  const interactions = dataStore.interactions;
  const events = dataStore.events;
  const awards = dataStore.awards;
  const community = dataStore.community;
  const overseas = dataStore.overseasRepresentation;
  const aois = dataStore.areasOfInterest;
  const scores = await getEngagementScores();

  const agencyCounts = new Map<string, number>();
  interactions.forEach(i => {
    if (i.agency) {
      const short = i.agency.match(/\(([^)]+)\)/)?.[1] ?? i.agency;
      agencyCounts.set(short, (agencyCounts.get(short) ?? 0) + 1);
    }
  });

  const statusCounts = new Map<string, number>();
  profiles.forEach(p => {
    const s = p.caseStatus ?? 'Unknown';
    statusCounts.set(s, (statusCounts.get(s) ?? 0) + 1);
  });

  const segmentCounts = new Map<string, number>();
  scores.forEach(s => {
    segmentCounts.set(s.segment, (segmentCounts.get(s.segment) ?? 0) + 1);
  });

  const aoiCounts = new Map<string, number>();
  aois.forEach(a => {
    if (a.areaOfInterest) {
      aoiCounts.set(a.areaOfInterest, (aoiCounts.get(a.areaOfInterest) ?? 0) + 1);
    }
  });
  const topAois = [...aoiCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);

  const uniqueEvents = new Set(events.map(e => e.eventTitle)).size;

  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((sum, s) => sum + s.totalScore, 0) / scores.length)
    : 0;

  const topStakeholders = scores
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 10)
    .map(s => `${s.fullName} (score: ${s.totalScore}, segment: ${s.segment}, churn risk: ${s.churnRisk}%)`);

  const atRisk = scores
    .filter(s => s.churnRisk >= 70)
    .sort((a, b) => b.churnRisk - a.churnRisk)
    .slice(0, 10)
    .map(s => `${s.fullName} (churn risk: ${s.churnRisk}%, last contact: ${s.lastContactDate ?? 'never'}, segment: ${s.segment})`);

  return `

---
DATABASE SUMMARY (live data):
- Total stakeholders: ${profiles.length}
- Total interactions: ${interactions.length}
- Total events attended: ${events.length} (${uniqueEvents} unique events)
- Total awards: ${awards.length}
- Community roles: ${community.length}
- Overseas representations: ${overseas.length}
- Areas of interest records: ${aois.length}

Status breakdown: ${[...statusCounts.entries()].map(([s, c]) => `${s}: ${c}`).join(', ')}
Engagement segments: ${[...segmentCounts.entries()].map(([s, c]) => `${s}: ${c}`).join(', ')}
Average engagement score: ${avgScore}/100
Agency interactions: ${[...agencyCounts.entries()].sort((a, b) => b[1] - a[1]).map(([a, c]) => `${a}: ${c}`).join(', ')}

Top areas of interest: ${topAois.map(([a, c]) => `${a} (${c})`).join(', ')}

Top 10 engaged stakeholders:
${topStakeholders.map(s => `- ${s}`).join('\n')}

Top 10 at-risk stakeholders (high churn):
${atRisk.length > 0 ? atRisk.map(s => `- ${s}`).join('\n') : '- None with churn risk >= 70%'}
---`;
}

function buildStakeholderContext(stakeholderIds: string[]): string {
  if (stakeholderIds.length === 0) return '';

  const contexts: string[] = [];
  for (const id of stakeholderIds.slice(0, 5)) {
    const profile = dataStore.profiles.find(p => p.id === id);
    if (!profile) continue;

    const interactions = dataStore.interactions.filter(i => i.nricHash === profile.nricHash);
    const events = dataStore.events.filter(e => e.nricHash === profile.nricHash);
    const awards = dataStore.awards.filter(a => a.nricHash === profile.nricHash);
    const community = dataStore.community.filter(c => c.nricHash === profile.nricHash);
    const aoiList = dataStore.areasOfInterest.filter(a => a.nricHash === profile.nricHash);

    contexts.push(`### ${profile.fullName} (${profile.caseStatus ?? 'Unknown status'})
- Organisation: ${profile.employerOrg ?? 'N/A'} | ${profile.designation ?? 'N/A'}
- Areas of Interest: ${aoiList.map(a => `${a.areaOfInterest} (${a.levelOfInterest})`).join(', ') || profile.areasOfInterest || 'None listed'}
- Interactions: ${interactions.length} (latest: ${interactions[0]?.meetingDate ?? 'N/A'})
- Events: ${events.length} attended (${events.map(e => e.eventTitle).join(', ') || 'none'})
- Awards: ${awards.map(a => `${a.awardName} (${a.year})`).join(', ') || 'None'}
- Community roles: ${community.map(c => `${c.role} at ${c.orgGroupName}`).join(', ') || 'None'}
- Write-up: ${profile.writeUp ?? 'None'}
- Nomination reason: ${profile.reasonForNomination ?? 'None'}`);
  }

  return contexts.length > 0
    ? `\n\nPINNED STAKEHOLDER DETAILS:\n${contexts.join('\n\n')}`
    : '';
}

function buildSearchContext(query: string): string {
  const tokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  if (tokens.length === 0) return '';

  const scored = dataStore.profiles.map(p => {
    let score = 0;
    const searchable = [
      p.fullName,
      p.employerOrg,
      p.areasOfInterest,
      p.writeUp,
      p.designation,
      p.caseStatus,
      p.reasonForNomination,
    ].filter(Boolean).join(' ').toLowerCase();

    const aoiTexts = dataStore.areasOfInterest
      .filter(a => a.nricHash === p.nricHash)
      .map(a => a.areaOfInterest?.toLowerCase() ?? '');
    const communityTexts = dataStore.community
      .filter(c => c.nricHash === p.nricHash)
      .map(c => `${c.orgGroupName ?? ''} ${c.role ?? ''}`.toLowerCase());
    const allText = searchable + ' ' + aoiTexts.join(' ') + ' ' + communityTexts.join(' ');

    for (const token of tokens) {
      if (allText.includes(token)) score++;
    }
    return { profile: p, score };
  })
  .filter(r => r.score > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, 10);

  if (scored.length === 0) return '';

  const summaries = scored.map(({ profile: p }) => {
    const interactionCount = dataStore.interactions.filter(i => i.nricHash === p.nricHash).length;
    const eventCount = dataStore.events.filter(e => e.nricHash === p.nricHash).length;
    const aoiList = dataStore.areasOfInterest.filter(a => a.nricHash === p.nricHash).map(a => a.areaOfInterest).join(', ');
    const communityRoles = dataStore.community.filter(c => c.nricHash === p.nricHash).map(c => `${c.role} at ${c.orgGroupName}`).join(', ');
    return `- ${p.fullName} (${p.caseStatus}): ${p.employerOrg ?? 'N/A'}, ${p.designation ?? 'N/A'}, ${interactionCount} interactions, ${eventCount} events, AOIs: ${aoiList || 'N/A'}, Community: ${communityRoles || 'N/A'}`;
  });

  return `\n\nSTAKEHOLDERS MATCHING QUERY:\n${summaries.join('\n')}`;
}

export async function POST(request: NextRequest) {
  await getHydratedStore();
  const body = await request.json();
  const {
    messages,
    provider: providerName = 'claude',
    stakeholderIds = [],
    stream = true,
  } = body as {
    messages: { role: string; content: string }[];
    provider?: string;
    stakeholderIds?: string[];
    stream?: boolean;
  };

  if (!messages || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'Messages are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

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

  const dbSummary = await buildDatabaseSummary();
  const stakeholderContext = buildStakeholderContext(stakeholderIds);
  const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content ?? '';
  const searchContext = buildSearchContext(lastUserMessage);

  const systemMessage = SYSTEM_PROMPT + dbSummary + stakeholderContext + searchContext;
  const llmMessages: LLMMessage[] = [
    { role: 'system', content: systemMessage },
    ...messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ];

  if (stream) {
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of llm.chatStream({ messages: llmMessages, maxTokens: 2048 })) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk.text, done: chunk.done })}\n\n`));
            if (chunk.done) break;
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Stream error';
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

  try {
    const response = await llm.chat({ messages: llmMessages, maxTokens: 2048 });
    return new Response(JSON.stringify({ content: response }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Chat failed';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
