const fs = require('node:fs');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
async function main() {
  const url = process.env.DATABASE_URL;
  if (url) {
    const u = new URL(url);
    console.log('Database endpoint:', u.hostname, u.pathname);
    const sql = require('postgres')(url, { connect_timeout: 5, max: 1 });
    try {
      console.log('Database:', await sql`select current_database(), version()`);
      console.log('Tables:', await sql`select tablename from pg_tables where schemaname='public'`);
      console.log('Extensions:', await sql`select name, installed_version from pg_available_extensions where name='vector'`);
    } catch (e) { console.log('Database connection:', e.code || e.name); }
    await sql.end({ timeout: 1 });
  }
  console.log('AI configuration:', {
    endpoint: process.env.META_AI_BASE_URL,
    model: process.env.META_AI_MODEL_ID,
    embeddingModel: process.env.EMBEDDING_MODEL_ID,
    keyLooksPlaceholder: /your|placeholder|example|changeme/i.test(process.env.META_AI_API_KEY || ''),
  });
  for (const url of ['https://llama.developer.meta.com/docs/api-reference/', 'https://www.llama.com/docs/api-reference/', 'https://raw.githubusercontent.com/meta-llama/llama-api-python/main/api.md']) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
      const body = await response.text();
      console.log('Official documentation:', url, response.status, response.url, body.slice(0, 300));
      if (response.ok) { fs.mkdirSync('docs/references', { recursive: true }); fs.writeFileSync('docs/references/meta-' + (url.includes('github') ? 'api.md' : 'docs.html'), body); }
    } catch (e) { console.log('Documentation access:', url, e.cause?.code || e.name); }
  }
}
main().catch(e => { console.error(e.name); process.exitCode = 1; });
