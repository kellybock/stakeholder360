import { pgTable, uuid, varchar, text, date, timestamp, index } from 'drizzle-orm/pg-core';
import { profiles } from './profiles';

export const community = pgTable('community', {
  id: uuid('id').primaryKey().defaultRandom(),
  nricHash: varchar('nric_hash', { length: 64 }).notNull().references(() => profiles.nricHash),
  startDate: date('start_date'),
  endDate: date('end_date'),
  orgGroupName: varchar('org_group_name', { length: 500 }),
  role: varchar('role', { length: 255 }),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_community_nric').on(table.nricHash),
  index('idx_community_org').on(table.orgGroupName),
]);
