import { loadEnvConfig } from '@next/env';
import postgres from 'postgres';
import { readFile } from 'node:fs/promises';
loadEnvConfig(process.cwd());
async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const client = postgres(process.env.DATABASE_URL, { max: 1 });
  try {
    await client`create table if not exists brain_migrations (name text primary key, applied_at timestamptz not null default now())`;
    for (const name of ['0001_init.sql','0002_trust_and_jobs.sql']) {
      const applied = await client`select name from brain_migrations where name=${name}`;
      if (applied.length) continue;
      if (name === '0001_init.sql') {
        const existing = await client`select to_regclass('public.organizations') as found`;
        if (existing[0].found) { await client`insert into brain_migrations(name) values(${name})`; console.log('Adopted existing initial schema'); continue; }
      }
      const content = await readFile(`drizzle/${name}`, 'utf8');
      await client.begin(async tx => { await tx.unsafe(content); await tx`insert into brain_migrations(name) values(${name})`; });
      console.log('Applied', name);
    }
  } finally { await client.end(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
