import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// PostgreSQL connection with SSL for Render
export const queryClient = postgres(connectionString, {
  ssl: 'require',
  max: 5,
  connect_timeout: 10,
  idle_timeout: 20,
});

export const db = drizzle(queryClient, { schema });

export type Database = typeof db;
export type Transaction = Parameters<
  Parameters<Database['transaction']>[0]
>[0];
