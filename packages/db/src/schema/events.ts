import { pgTable, uuid, varchar, text, date, timestamp, index } from 'drizzle-orm/pg-core';
import { profiles } from './profiles';

export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  nricHash: varchar('nric_hash', { length: 64 }).notNull().references(() => profiles.nricHash),
  eventTitle: varchar('event_title', { length: 500 }).notNull(),
  startDate: date('start_date'),
  endDate: date('end_date'),
  description: text('description'),
  organizerAgency: varchar('organizer_agency', { length: 100 }),
  partners: text('partners'),
  eventType: varchar('event_type', { length: 100 }),
  aoiForEvent: varchar('aoi_for_event', { length: 255 }),
  roleOfYouth: varchar('role_of_youth', { length: 255 }),
  attendance: varchar('attendance', { length: 50 }),
  briefNotes: text('brief_notes'),
  additionalNotes: text('additional_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_events_nric').on(table.nricHash),
  index('idx_events_dates').on(table.startDate, table.endDate),
  index('idx_events_agency').on(table.organizerAgency),
]);
