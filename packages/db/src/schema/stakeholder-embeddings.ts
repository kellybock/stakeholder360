import { pgTable, uuid, varchar, text, timestamp, index, uniqueIndex, customType } from 'drizzle-orm/pg-core';
import { profiles } from './profiles';

const vector = customType<{ data: number[] }>({
  dataType() {
    return 'vector(1536)';
  },
});

export const stakeholderEmbeddings = pgTable('stakeholder_embeddings', {
  id: uuid('id').primaryKey().defaultRandom(),
  nricHash: varchar('nric_hash', { length: 64 }).notNull().references(() => profiles.nricHash),
  contentType: varchar('content_type', { length: 50 }).notNull(),
  sourceId: uuid('source_id').notNull(),
  contentText: text('content_text').notNull(),
  embedding: vector('embedding').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_embeddings_nric').on(table.nricHash),
  uniqueIndex('idx_embeddings_source_type').on(table.sourceId, table.contentType),
]);
