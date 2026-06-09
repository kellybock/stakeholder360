import { NextRequest } from 'next/server';
import { getProviderApiKey } from '@/lib/ai-settings';
import { buildIndividualPrompt, SYSTEM_INDIVIDUAL, type ResearchMode } from '@/lib/research-prompts';

export async function POST(request: NextRequest) {
  const { name, organisation, linkedinHandle, mode = 'full' } = await request.json();

  if (!name?.trim()) {
    return Response.json({ error: 'Name is required' }, { status: 400 });
  }

  const apiKey = getProviderApiKey('perplexity') ?? undefined;
  if (!apiKey) {
    return Response.json(
      { error: 'PERPLEXITY_API_KEY is not configured. Add your Perplexity API key in Admin > Settings.' },
      { status: 400 }
    );
  }

  const personName = name.trim();
  const org = organisation?.trim() || null;
  const handle = linkedinHandle?.trim().replace(/^@/, '') || null;
  const researchMode = (mode === 'brief' ? 'brief' : 'full') as ResearchMode;

  const prompt = buildIndividualPrompt(personName, org, handle, researchMode);

  let perplexityRes: Response;
  try {
    perplexityRes = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          { role: 'system', content: SYSTEM_INDIVIDUAL },
          { role: 'user', content: prompt },
        ],
        max_tokens: researchMode === 'brief' ? 2000 : 8192,
        temperature: 0.2,
      }),
    });
  } catch {
    return Response.json({ error: 'Failed to reach Perplexity API' }, { status: 502 });
  }

  if (!perplexityRes.ok) {
    const body = await perplexityRes.text();
    return Response.json({ error: `Perplexity error: ${body}` }, { status: perplexityRes.status });
  }

  const data = (await perplexityRes.json()) as {
    choices: { message: { content: string } }[];
    citations?: string[];
  };

  let content = data.choices[0]?.message?.content ?? '';
  const citations: string[] = data.citations ?? [];

  citations.forEach((url, i) => {
    content = content.replace(new RegExp(`\\[${i + 1}\\]`, 'g'), `[${i + 1}](${url})`);
  });

  if (citations.length > 0) {
    content += '\n\n## References\n';
    citations.forEach((url, i) => {
      content += `- **[${i + 1}]** [${url}](${url})\n`;
    });
  }

  return Response.json({ content });
}

export const maxDuration = 60;
