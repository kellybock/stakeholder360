import { pgTable, uuid, varchar, integer, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const uploadHistory = pgTable('upload_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  fileName: varchar('file_name', { length: 500 }).notNull(),
  tableTarget: varchar('table_target', { length: 50 }).notNull(),
  fileSizeBytes: integer('file_size_bytes'),
  rowCount: integer('row_count'),
  rowsInserted: integer('rows_inserted'),
  rowsUpdated: integer('rows_updated'),
  rowsFailed: integer('rows_failed'),
  errors: jsonb('errors'),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_upload_user').on(table.userId),
  index('idx_upload_status').on(table.status),
]);
