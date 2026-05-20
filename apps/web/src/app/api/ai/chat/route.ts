import { NextRequest } from 'next/server';
import { createLLMProvider, type LLMMessage } from '@youth360/ai';
import { dataStore } from '@/lib/store';
import { getProviderApiKey } from '@/lib/ai-settings';

const SYSTEM_PROMPT = `You are Youth360 AI, an intelligent assistant for Singapore government Relationship Managers (RMs) who manage youth stakeholder engagement across agencies (MCCY, NYC, PA, MOE, MSF).

You help RMs with:
- Finding and understanding stakeholder profiles
- Analysing engagement patterns and cross-agency connections
- Preparing meeting briefs and talking points
- Identifying stakeholders with shared interests or complementary skills
- Suggesting next-best-actions for stakeholder engagement

When answering, be specific and cite stakeholder names, dates, and agencies where relevant. Use Singapore English conventions. Format responses with markdown for readability.

If stakeholder context is provided below, use it to inform your answers.`;

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
    const aois = dataStore.areasOfInterest.filter(a => a.nricHash === profile.nricHash);

    contexts.push(`### ${profile.fullName} (${profile.caseStatus ?? 'Unknown status'})
- Organisation: ${profile.employerOrg ?? 'N/A'} | ${profile.designation ?? 'N/A'}
- Areas of Interest: ${aois.map(a => a.areaOfInterest).join(', ') || profile.areasOfInterest || 'None listed'}
- Interactions: ${interactions.length} (latest: ${interactions[0]?.meetingDate ?? 'N/A'})
- Events: ${events.length} attended
- Awards: ${awards.map(a => a.awardName).join(', ') || 'None'}
- Community roles: ${community.map(c => `${c.role} at ${c.orgGroupName}`).join(', ') || 'None'}
- Write-up: ${profile.writeUp ?? 'None'}
- Nomination reason: ${profile.reasonForNomination ?? 'None'}`);
  }

  return contexts.length > 0
    ? `\n\n---\nPINNED STAKEHOLDER CONTEXT:\n${contexts.join('\n\n')}`
    : '';
}

function buildSearchContext(query: string): string {
  const lower = query.toLowerCase();
  const matchedProfiles = dataStore.profiles
    .filter(p =>
      p.fullName.toLowerCase().includes(lower) ||
      (p.employerOrg && p.employerOrg.toLowerCase().includes(lower)) ||
      (p.areasOfInterest && p.areasOfInterest.toLowerCase().includes(lower)) ||
      (p.writeUp && p.writeUp.toLowerCase().includes(lower))
    )
    .slice(0, 5);

  if (matchedProfiles.length === 0) return '';

  const summaries = matchedProfiles.map(p => {
    const interactionCount = dataStore.interactions.filter(i => i.nricHash === p.nricHash).length;
    const eventCount = dataStore.events.filter(e => e.nricHash === p.nricHash).length;
    return `- ${p.fullName} (${p.caseStatus}): ${p.employerOrg ?? 'N/A'}, ${interactionCount} interactions, ${eventCount} events, interests: ${p.areasOfInterest ?? 'N/A'}`;
  });

  return `\n\nRELEVANT STAKEHOLDERS FOUND:\n${summaries.join('\n')}`;
}

export async function POST(request: NextRequest) {
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

  const stakeholderContext = buildStakeholderContext(stakeholderIds);
  const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content ?? '';
  const searchContext = buildSearchContext(lastUserMessage);

  const systemMessage = SYSTEM_PROMPT + stakeholderContext + searchContext;
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
