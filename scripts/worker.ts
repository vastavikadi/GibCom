import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
async function main() {
  const { runNextJob } = await import('../src/lib/ingestion/pipeline');
  const { queryClient } = await import('../src/lib/db');
  const once = process.argv.includes('--once');
  let stopping = false;
  process.on('SIGINT', () => { stopping = true; }); process.on('SIGTERM', () => { stopping = true; });
  console.log('Brain ingestion worker started');
  do { const processed = await runNextJob(); if (once) break; if (!processed) await new Promise(resolve => setTimeout(resolve, 1500)); } while (!stopping);
  await queryClient.end();
}
main().catch(error => { console.error(error); process.exitCode = 1; });
