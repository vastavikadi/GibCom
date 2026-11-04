import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

// For query purposes
export const queryClient = postgres(connectionString || 'postgresql://postgres:123456@localhost:5432/gibcom', { max: 10, connect_timeout: 5, idle_timeout: 20 });
export const db = drizzle(queryClient, { schema });

export type Database = typeof db;
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
