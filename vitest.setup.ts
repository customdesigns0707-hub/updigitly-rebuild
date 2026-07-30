// Loads .env.local into process.env for tests run outside Next's own dev/build
// pipeline (Next does this automatically; a plain vitest process does not).
// Deliberately dependency-free (no dotenv) — same minimal parser style used by
// this project's own ad-hoc verification scripts.
import fs from 'node:fs';
import path from 'node:path';

const envPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    let value = rawValue.trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
