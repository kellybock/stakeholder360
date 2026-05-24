import { NextRequest, NextResponse } from 'next/server';
import { getHydratedStore } from '@/lib/store';
import { getDb } from '@youth360/db';
import * as schema from '@youth360/db';
import { eq } from 'drizzle-orm';
import { getDataMode } from '@/lib/data-mode';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const dataStore = await getHydratedStore();
  const profile = dataStore.profiles.find(p => p.id === id);

  if (!profile) {
    return NextResponse.json({ error: 'Stakeholder not found' }, { status: 404 });
  }

  const db = getDb(getDataMode());
  const rows = await db.select().from(schema.linkedinProfiles).where(eq(schema.linkedinProfiles.profileId, id));

  if (rows.length === 0) {
    return NextResponse.json({ data: null });
  }

  const row = rows[0];
  return NextResponse.json({
    data: {
      headline: row.headline ?? '',
      summary: row.summary ?? '',
      location: row.location ?? '',
      linkedinUrl: row.linkedinUrl ?? '',
      education: row.education ?? [],
      experiences: row.experiences ?? [],
      skills: row.skills ?? [],
      updatedAt: row.updatedAt.toISOString(),
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const dataStore = await getHydratedStore();
  const profile = dataStore.profiles.find(p => p.id === id);

  if (!profile) {
    return NextResponse.json({ error: 'Stakeholder not found' }, { status: 404 });
  }

  const body = await request.json();
  const { headline, summary, location, linkedinUrl, education, experiences, skills } = body;

  const db = getDb(getDataMode());
  const existing = await db.select().from(schema.linkedinProfiles).where(eq(schema.linkedinProfiles.profileId, id));

  const data = {
    linkedinUrl: linkedinUrl || '',
    headline: headline || null,
    summary: summary || null,
    location: location || null,
    education: education ?? [],
    experiences: experiences ?? [],
    skills: skills ?? [],
    posts: [],
    rawResponse: null,
    fetchedAt: new Date(),
    updatedAt: new Date(),
  };

  if (existing.length > 0) {
    await db.update(schema.linkedinProfiles).set(data).where(eq(schema.linkedinProfiles.profileId, id));
  } else {
    await db.insert(schema.linkedinProfiles).values({ profileId: id, ...data });
  }

  return NextResponse.json({
    data: {
      headline: data.headline ?? '',
      summary: data.summary ?? '',
      location: data.location ?? '',
      linkedinUrl: data.linkedinUrl,
      education: data.education,
      experiences: data.experiences,
      skills: data.skills,
      updatedAt: data.updatedAt.toISOString(),
    },
  });
}
