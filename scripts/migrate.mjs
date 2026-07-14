/**
 * Applies db/schema.sql to DATABASE_URL. Idempotent — run any time.
 *   node --env-file=.env.local scripts/migrate.mjs
 * (Node 20.6+ supports --env-file; otherwise export DATABASE_URL first.)
 */
import postgres from 'postgres';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}
const local = /localhost|127\.0\.0\.1/.test(url);
const sql = postgres(url, { ssl: local ? false : 'require', prepare: false, max: 1 });
const schema = readFileSync(join(__dirname, '..', 'db', 'schema.sql'), 'utf8');

try {
  await sql.unsafe(schema);
  const [{ count }] = await sql`
    select count(*)::int as count from information_schema.tables
    where table_schema = 'public'
      and table_name in ('enrollments','disclosure_acceptances','stage_events','ghl_sync_state','contact_messages')`;
  console.log(`Schema applied. ${count}/5 core tables present.`);
} catch (err) {
  console.error('Migration failed:', err);
  process.exitCode = 1;
} finally {
  await sql.end();
}
