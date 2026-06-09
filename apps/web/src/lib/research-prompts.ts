export type ResearchMode = 'brief' | 'full';

export const SYSTEM_INDIVIDUAL = `You are a senior research analyst producing a structured intelligence report on a named individual for a Singapore government relationship manager. Output only the report content — no conversational language, no offers to help further, no meta-commentary, no closing remarks, no phrases like "If you want", "I can also", "Let me know", "Feel free to", or "Would you like". The report ends when the last section is complete. Nothing else.`;

export const SYSTEM_ORGANISATION = `You are a senior research analyst producing a structured intelligence report on a Singapore-based organisation for a government relationship manager. Output only the report content — no conversational language, no offers to help further, no meta-commentary, no closing remarks, no phrases like "If you want", "I can also", "Let me know", "Feel free to", or "Would you like". The report ends when the last section is complete. Nothing else.`;

// ── Individual ───────────────────────────────────────────────────────────────

export function buildIndividualPrompt(
  name: string,
  org: string | null,
  handle: string | null,
  mode: ResearchMode
): string {
  const identifierLines = [`- Full name: ${name}`, '- Based in Singapore'];
  if (org) identifierLines.push(`- Organisation: ${org}`);
  if (handle) identifierLines.push(`- LinkedIn profile: https://www.linkedin.com/in/${handle}`);
  const identifiers = identifierLines.join('\n');

  if (mode === 'brief') {
    return `Produce a concise intelligence brief on the following individual for a Singapore government relationship manager:
${identifiers}

Maximum 250 words. Use exactly these 5 sections — no others, no padding, no prose between sections.

## Who
One sentence: current role, organisation, and what makes them notable.

## Known For
3 bullet points — specific interests, public positions, or achievements with concrete examples. No generic filler.

## Talking Points
3–5 bullet points — specific, grounded conversation hooks a relationship manager can use immediately. Tie each to a real activity or interest of this person.

## Watch Out
1–2 bullet points of risk flags, sensitivities, or topics to handle carefully. If none are found, write exactly: None identified.

## Recommended Next Step
One concrete action — an event to invite them to, an introduction to make, or a collaboration to propose. Be specific.

---
Focus strictly on ${name} as an individual. Every point must be traceable to this specific person.`;
  }

  // Full report — 8 high-signal sections
  return `Conduct a thorough research profile on the following individual:
${identifiers}

Produce a comprehensive personal profile with the sections below. Be specific — cite actual facts, dates, roles, and quotes where available. Do not pad sections with generic industry information.

---

## 1. Personal Overview
Brief summary of who this person is — current role, organisation, location, why they are notable or relevant. Include any significant awards or media presence worth knowing.

## 2. Career & Professional Background
- Full career trajectory: current and past roles, organisations, and dates where available
- Board memberships, advisory roles, or directorships held personally
- Professional certifications, licences, or credentials
- Key career achievements or milestones

## 3. Community & Civic Engagement
- Grassroots roles (e.g. People's Association, Residents' Committee, constituency-level involvement)
- Volunteer work and community service activities
- Leadership roles in non-profit organisations, charities, or NGOs
- Participation in national-level committees, working groups, or advisory panels

## 4. Interest Areas & Personal Advocacy
Specific evidence of personal interest or involvement — only include areas with actual evidence:
- **Sustainability & Environment** — initiatives, campaigns, or public statements
- **Mental Wellbeing** — advocacy, programmes, or personal sharing
- **Arts, Culture & Heritage** — involvement in arts groups, cultural events, or heritage projects
- **Youth Development** — mentorship, youth programmes, or related roles
- **Other notable interests** — sports, technology, entrepreneurship, social causes, etc.

## 5. Government Agency Collaborations & Partnerships
Only include what is specifically attributable to this individual, not their employer in general:
- Agencies collaborated with (e.g. MCCY, NYC, MOE, MSF, PA, MHA, MINDEF, MOH, MTI, MAS, EDB, ESG, SportSG, NAC, NHB, NParks, NEA, SSG, SNDGO)
- Nature of the collaboration (e.g. advisory panel member, grant recipient, programme partner, speaker at government event, co-organiser, ambassador)
- Specific programmes, initiatives, or projects they were involved in
- If no government collaborations are found, state that clearly

## 6. Network & Key Affiliations
- Notable professional or personal associations
- Alumni networks and active alumni engagement
- Industry bodies or professional associations they are members of
- Any publicly known mentors, sponsors, or influential connections

## 7. Reputation & Risk Signals
- Any public controversies, negative press, or reputational concerns
- Known sensitivities or topics to handle carefully
- If no concerns found, state that clearly

## 8. Engagement Strategy & Talking Points
Based on everything above, provide:
- **5–7 specific talking points** grounded in their actual interests and activities
- **Recommended engagement approach** — communication style, topics to lead with
- **Topics to avoid or handle with care**
- **Suggested next step** — e.g. event to invite them to, introduction to make, collaboration to propose

---
Focus strictly on ${name} as an individual. Every point should be traceable to this specific person.`;
}

// ── Organisation ─────────────────────────────────────────────────────────────

export function buildOrgPrompt(
  orgName: string,
  site: string | null,
  sec: string | null,
  mode: ResearchMode
): string {
  const identifierLines = [`- Organisation name: ${orgName}`, '- Country: Singapore'];
  if (site) identifierLines.push(`- Website: ${site}`);
  if (sec) identifierLines.push(`- Sector / industry: ${sec}`);
  const identifiers = identifierLines.join('\n');

  if (mode === 'brief') {
    return `Produce a concise intelligence brief on the following organisation for a Singapore government relationship manager:
${identifiers}

Maximum 250 words. Use exactly these 5 sections — no others, no padding, no prose between sections.

## What They Do
One sentence: mission, organisation type (IPC / charity / statutory board / private), and what makes them notable in Singapore.

## Known For
3 bullet points — flagship programmes, key achievements, or impact data with concrete examples.

## Partnership Hooks
3–5 bullet points — specific angles a Singapore government agency can use to engage or collaborate with them. Tie each to a real programme or priority of this organisation.

## Watch Out
1–2 bullet points of risk flags, governance concerns, or sensitivities. If none are found, write exactly: None identified.

## Recommended Next Step
One concrete action — an event to invite them to, an MOU to propose, a programme to co-develop, or an introduction to make. Be specific.

---
Focus strictly on ${orgName} as an organisation. Every point must be traceable to this specific entity.`;
  }

  // Full report — 8 high-signal sections
  return `Conduct a thorough research profile on the following organisation:
${identifiers}

Produce a comprehensive organisation profile with the sections below. Be specific — cite actual facts, programme names, dates, figures, and quotes where available. Do not pad sections with generic industry commentary.

---

## 1. Organisation Overview
Mission, vision, founding year, legal entity type (IPC / charity / social enterprise / statutory board / private), size (staff, volunteers), headquarters, and why they are notable or relevant in Singapore. Include any significant awards, recognition, or strategic priorities worth knowing.

## 2. Leadership & Governance
- Executive Director / CEO and key senior leadership
- Board composition: chairs, directors, and any notable board members
- Governance structure and any publicly known governance milestones (e.g. charity ratings, transparency awards)

## 3. Core Programs & Initiatives
- Flagship programmes and current major initiatives
- Key services or products offered
- Target beneficiaries and communities served
- Quantified outcomes: beneficiaries served, lives impacted, geographic coverage
- Noteworthy partnerships with other organisations or businesses

## 4. Youth Development Focus
Specific evidence of youth-related work — only include areas with actual evidence:
- **Youth programmes and schemes** — names, duration, participant numbers, age groups served
- **Mentorship and leadership development** — structured programmes for youth leadership
- **Skills and employability** — training, internships, apprenticeships, or career preparation
- **Youth mental wellbeing** — counselling, support services, or awareness campaigns
- **Collaboration with youth agencies** — NYC, MOE, MSF, MCCY, SSG or related statutory boards
- **Other youth-focused work** — advocacy, research, policy engagement on youth issues
- If no youth-specific work is found, state that clearly

## 5. Government Partnerships & Collaborations
Identify specific engagements with Singapore government agencies or statutory boards:
- Agencies collaborated with (e.g. MCCY, NYC, MOE, MSF, PA, MHA, MINDEF, MOH, MTI, MAS, EDB, ESG, SportSG, NAC, NHB, NParks, NEA, SSG, SNDGO, SkillsFuture)
- Nature of each collaboration (e.g. grant recipient, co-organiser, service provider, policy advisory, ambassador programme, MOU signatory)
- Specific programmes, initiatives, or projects they were involved in
- If no government collaborations are found, state that clearly

## 6. Community Impact & Reach
- Quantified outcomes: beneficiaries served, lives impacted, geographic coverage
- National or regional scale of operations
- Case studies or success stories published
- Impact reports or evaluation data available publicly

## 7. Reputation & Risk Signals
- Any public controversies, governance concerns, or negative press
- Known sensitivities or reputational issues
- Staff or volunteer-related incidents reported publicly
- If no concerns are found, state that clearly

## 8. Partnership Engagement Strategy
Based on everything above, provide:
- **5–7 specific talking points** grounded in the organisation's actual programmes and priorities
- **Recommended engagement approach** — framing, tone, and topics to lead with
- **Alignment opportunities** — where their work intersects with government agency mandates
- **Topics to avoid or handle with care**
- **Suggested next step** — e.g. event to invite them to, MOU to propose, programme to co-develop, introduction to make

---
Focus strictly on ${orgName} as an organisation. Every point should be traceable to this specific entity.`;
}
