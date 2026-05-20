import { pgTable, uuid, varchar, text, date, timestamp, index } from 'drizzle-orm/pg-core';
import { profiles } from './profiles';
import { users } from './users';

export const interactions = pgTable('interactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  nricHash: varchar('nric_hash', { length: 64 }).notNull().references(() => profiles.nricHash),
  interactionDetails: text('interaction_details'),
  meetingDate: date('meeting_date'),
  agency: varchar('agency', { length: 100 }),
  pocStaffName: varchar('poc_staff_name', { length: 255 }),
  pocStaffEmail: varchar('poc_staff_email', { length: 255 }),
  briefNotes: text('brief_notes'),
  attachmentUrls: text('attachment_urls').array(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => users.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_interactions_nric').on(table.nricHash),
  index('idx_interactions_meeting_date').on(table.meetingDate),
  index('idx_interactions_agency').on(table.agency),
]);
