import { pgTable, uuid, varchar, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { profiles } from './profiles';

export const linkedinProfiles = pgTable('linkedin_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id').notNull().references(() => profiles.id).unique(),
  linkedinUrl: varchar('linkedin_url', { length: 500 }).notNull(),
  headline: varchar('headline', { length: 500 }),
  summary: text('summary'),
  location: varchar('location', { length: 255 }),
  education: jsonb('education').$type<LinkedinEducation[]>(),
  experiences: jsonb('experiences').$type<LinkedinExperience[]>(),
  posts: jsonb('posts').$type<LinkedinPost[]>(),
  skills: jsonb('skills').$type<string[]>(),
  rawResponse: jsonb('raw_response'),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type LinkedinEducation = {
  school: string;
  degree: string | null;
  fieldOfStudy: string | null;
  startYear: number | null;
  endYear: number | null;
};

export type LinkedinExperience = {
  title: string;
  company: string;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
};

export type LinkedinPost = {
  text: string;
  postedAt: string | null;
  numLikes: number | null;
  numComments: number | null;
  url: string | null;
};
