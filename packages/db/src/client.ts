import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

const liveClient = postgres(connectionString);
export const db = drizzle(liveClient, { schema });

const testClient = postgres(connectionString, {
  connection: { search_path: 'test' },
});
export const dbTest = drizzle(testClient, { schema });

export function getDb(mode: 'live' | 'test') {
  return mode === 'test' ? dbTest : db;
}

export type Database = typeof db;
