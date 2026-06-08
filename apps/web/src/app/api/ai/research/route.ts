import { NextRequest } from 'next/server';
import { getHydratedStore } from '@/lib/store';
import { getProviderApiKey } from '@/lib/ai-settings';

export async function POST(request: NextRequest) {
  const dataStore = await getHydratedStore();
  const { stakeholderId } = await request.json();

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

  const apiKey = getProviderApiKey('perplexity') ?? undefined;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: 'PERPLEXITY_API_KEY is not configured. Add your Perplexity API key in Admin > Settings.',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const name = profile.fullName;
  const org = profile.employerOrg ?? null;

  const identifierLines = [`- Full name: ${name}`, '- Based in Singapore'];
  if (org) identifierLines.push(`- Organisation: ${org}`);

  const system = `You are a senior research analyst producing a structured due-diligence report on a named individual for a Singapore government relationship manager. Output only the report content — no conversational language, no offers to help further, no meta-commentary, no closing remarks, no phrases like "If you want", "I can also", "Let me know", "Feel free to", or "Would you like". The report ends when the last section is complete. Nothing else.`;

  const prompt = `Conduct a thorough due-diligence research profile on the following individual:
${identifierLines.join('\n')}

Produce a comprehensive personal profile with the following sections. Be specific — cite actual facts, dates, roles, and quotes where available. Do not pad sections with generic industry information.

---

## 1. Personal Overview
Brief summary of who this person is — current role, organisation, location, and why they are notable or relevant.

## 2. Career & Professional Background
- Full career trajectory: current and past roles, organisations, and dates where available
- Board memberships, advisory roles, or directorships held personally
- Professional certifications, licences, or credentials
- Key career achievements or milestones

## 3. Education
- Academic qualifications (degrees, diplomas, certifications)
- Institutions attended and graduation years where known
- Scholarships, academic awards, or notable achievements during studies

## 4. LinkedIn & Online Presence
- Summary of their LinkedIn profile and recent posts or articles they have written
- Presence on other platforms (Twitter/X, Facebook, Instagram, personal website, podcast appearances)
- Themes or topics they consistently engage with online

## 5. Media & Public Profile
- News articles, interviews, or features about this person
- Quotes or public statements they have made
- Speaking engagements, panel appearances, or conferences they have participated in
- Any published writing (op-eds, reports, books, academic papers)

## 6. Community & Civic Engagement
- Grassroots roles (e.g. People's Association, Residents' Committee, constituency-level involvement)
- Volunteer work and community service activities
- Leadership roles in non-profit organisations, charities, or NGOs
- Participation in national-level committees, working groups, or advisory panels

## 7. Interest Areas & Personal Advocacy
Specific evidence of personal interest or involvement in each area below — only include areas with actual evidence:
- **Sustainability & Environment** — initiatives, campaigns, or public statements
- **Mental Wellbeing** — advocacy, programmes, or personal sharing
- **Arts, Culture & Heritage** — involvement in arts groups, cultural events, or heritage projects
- **Youth Development** — mentorship, youth programmes, or related roles
- **Other notable interests** — sports, technology, entrepreneurship, social causes, etc.

## 8. Awards & Recognition
- Personal awards, honours, or commendations received
- National awards (e.g. National Day Awards, President's Volunteerism & Philanthropy Award)
- Industry or community recognition

## 9. Government Agency Collaborations & Partnerships
Identify any known collaborations, partnerships, or engagements with Singapore government agencies or statutory boards — only include what is specifically attributable to this individual, not their employer in general:
- Agencies collaborated with (e.g. MCCY, NYC, MOE, MSF, PA, MHA, MINDEF, MOH, MTI, MAS, EDB, ESG, SportSG, NAC, NHB, NParks, NEA, SSG, SNDGO)
- Nature of the collaboration (e.g. advisory panel member, grant recipient, programme partner, speaker at government event, co-organiser, ambassador)
- Specific programmes, initiatives, or projects they were involved in
- Any government-funded projects or grants awarded to them personally or to organisations they lead
- If no government collaborations are found, state that clearly

## 10. Network & Key Affiliations
- Notable professional or personal associations
- Alumni networks and active alumni engagement
- Industry bodies or professional associations they are members of
- Any publicly known mentors, sponsors, or influential connections

## 11. Reputation & Risk Signals
- Any public controversies, negative press, or reputational concerns
- Known sensitivities or topics to handle carefully
- If no concerns found, state that clearly

## 12. Engagement Strategy & Talking Points
Based on everything above, provide:
- **5–7 specific talking points** grounded in their actual interests and activities
- **Recommended engagement approach** — communication style, topics to lead with
- **Topics to avoid or handle with care**
- **Suggested next step** — e.g. event to invite them to, introduction to make, collaboration to propose

---
Focus strictly on ${name} as an individual. Every point should be traceable to this specific person.`;

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
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
        max_tokens: 8192,
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

  const data = await perplexityRes.json() as {
    choices: { message: { content: string } }[];
    citations?: string[];
  };

  let content = data.choices[0]?.message?.content ?? '';
  const citations: string[] = data.citations ?? [];

  // Replace inline [n] markers with clickable links to the cited source
  citations.forEach((url, i) => {
    content = content.replace(new RegExp(`\\[${i + 1}\\]`, 'g'), `[${i + 1}](${url})`);
  });

  // Append a references section with the full URLs
  if (citations.length > 0) {
    content += '\n\n## References\n';
    citations.forEach((url, i) => {
      content += `- **[${i + 1}]** [${url}](${url})\n`;
    });
  }

  return Response.json({ content });
}

export const maxDuration = 60;
