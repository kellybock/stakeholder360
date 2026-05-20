import { pgTable, uuid, varchar, text, integer, boolean, timestamp, index, customType } from 'drizzle-orm/pg-core';
import { users } from './users';

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return 'bytea';
  },
});

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  caseId: varchar('case_id', { length: 50 }).unique(),
  caseStatus: varchar('case_status', { length: 50 }),
  nricHash: varchar('nric_hash', { length: 64 }).notNull().unique(),
  nricEncrypted: bytea('nric_encrypted').notNull(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  race: varchar('race', { length: 50 }),
  sex: varchar('sex', { length: 10 }),
  email: varchar('email', { length: 255 }),
  mobileNumber: varchar('mobile_number', { length: 20 }),
  residentialStatus: varchar('residential_status', { length: 50 }),
  yearOfBirth: integer('year_of_birth'),
  employerOrg: varchar('employer_org', { length: 255 }),
  designation: varchar('designation', { length: 255 }),
  dataConsent: boolean('data_consent').default(false),
  linkedinHandle: varchar('linkedin_handle', { length: 255 }),
  writeUp: text('write_up'),
  reasonForNomination: text('reason_for_nomination'),
  rmDetails: text('rm_details'),
  sourceAgency: varchar('source_agency', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => users.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid('updated_by').references(() => users.id),
}, (table) => [
  index('idx_profiles_case_status').on(table.caseStatus),
  index('idx_profiles_source_agency').on(table.sourceAgency),
]);
