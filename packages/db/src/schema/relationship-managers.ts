import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { profiles } from './profiles';
import { users } from './users';

export const relationshipManagers = pgTable('relationship_managers', {
  id: uuid('id').primaryKey().defaultRandom(),
  nricHash: varchar('nric_hash', { length: 64 }).notNull().references(() => profiles.nricHash),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  agency: varchar('agency', { length: 100 }).notNull(),
  userId: uuid('user_id').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_rm_nric').on(table.nricHash),
  index('idx_rm_agency').on(table.agency),
]);
