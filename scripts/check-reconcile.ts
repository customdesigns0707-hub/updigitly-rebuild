/**
 * Runs the real getReconciliationReport() (src/lib/repo.ts) against whatever
 * DATABASE_URL is in the environment and prints the result as JSON — the same
 * drift check /api/admin/reconcile and the daily /api/sync cron run, but
 * queryable directly without a deployed route or SYNC_SECRET.
 *
 * repo.ts's import chain pulls in the 'server-only' guard package, which
 * throws unconditionally outside Next's webpack build, so this needs a
 * loader hook that no-ops it:
 *
 *   node --env-file=.env.local --import "data:text/javascript,import{register}from'node:module';import{pathToFileURL}from'node:url';register(pathToFileURL('./scripts/server-only-stub-loader.mjs'));" scripts/check-reconcile.ts
 *
 * Swap --env-file for whichever DATABASE_URL you want to point at (e.g. a
 * pulled .env.production.local) — never commit that file; .env* is gitignored.
 * Not wired into package.json — deliberately a manual, explicit-invocation tool.
 */
import { getReconciliationReport } from '../src/lib/repo';

const report = await getReconciliationReport();
console.log(JSON.stringify(report, null, 2));
