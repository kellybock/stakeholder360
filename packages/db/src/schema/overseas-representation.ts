import { pgTable, uuid, varchar, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { profiles } from './profiles';

export const overseasRepresentation = pgTable('overseas_representation', {
  id: uuid('id').primaryKey().defaultRandom(),
  nricHash: varchar('nric_hash', { length: 64 }).notNull().references(() => profiles.nricHash),
  year: integer('year'),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_overseas_nric').on(table.nricHash),
]);
