import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { profiles } from './profiles';

export const areasOfInterest = pgTable('areas_of_interest', {
  id: uuid('id').primaryKey().defaultRandom(),
  nricHash: varchar('nric_hash', { length: 64 }).notNull().references(() => profiles.nricHash),
  aoiId: varchar('aoi_id', { length: 50 }),
  areaOfInterest: varchar('area_of_interest', { length: 255 }).notNull(),
  alignment: varchar('alignment', { length: 255 }),
  levelOfInterest: varchar('level_of_interest', { length: 50 }),
  levelOfInfluence: varchar('level_of_influence', { length: 50 }),
  agency: varchar('agency', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_aoi_nric').on(table.nricHash),
  index('idx_aoi_area').on(table.areaOfInterest),
  index('idx_aoi_agency').on(table.agency),
]);
