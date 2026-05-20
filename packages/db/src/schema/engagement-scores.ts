import { pgTable, uuid, varchar, numeric, timestamp, index } from 'drizzle-orm/pg-core';
import { profiles } from './profiles';

export const engagementScores = pgTable('engagement_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  nricHash: varchar('nric_hash', { length: 64 }).notNull().references(() => profiles.nricHash).unique(),
  totalScore: numeric('total_score', { precision: 5, scale: 2 }).notNull(),
  recencyScore: numeric('recency_score', { precision: 5, scale: 2 }),
  frequencyScore: numeric('frequency_score', { precision: 5, scale: 2 }),
  depthScore: numeric('depth_score', { precision: 5, scale: 2 }),
  breadthScore: numeric('breadth_score', { precision: 5, scale: 2 }),
  segment: varchar('segment', { length: 50 }),
  churnRisk: numeric('churn_risk', { precision: 5, scale: 2 }),
  calculatedAt: timestamp('calculated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_engagement_segment').on(table.segment),
  index('idx_engagement_score').on(table.totalScore),
]);
