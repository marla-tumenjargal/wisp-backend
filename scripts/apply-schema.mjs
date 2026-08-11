/**
 * Apply supabase/bootstrap.sql to the linked Supabase Postgres database.
 *
 * Usage:
 *   SUPABASE_DB_PASSWORD=your-db-password npm run db:bootstrap
 *   # or
 *   DATABASE_URL=postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres npm run db:bootstrap
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const PROJECT_REF = "hsjyskyggqgjevnlryui";
const SITE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

function connectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;

  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) return null;

  return `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(password)}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;
}

async function main() {
  const sqlPath = resolve(process.cwd(), "supabase/bootstrap.sql");
  const sql = readFileSync(sqlPath, "utf8");
  const conn = connectionString();

  if (!conn) {
    console.error(`
Missing database credentials.

1. Open Supabase → Project Settings → Database → Database password
2. Run one of:

   SUPABASE_DB_PASSWORD='your-password' npm run db:bootstrap

   # or paste the full URI:
   DATABASE_URL='postgresql://postgres.[ref]:[password]@aws-0-....pooler.supabase.com:6543/postgres' npm run db:bootstrap

3. Or paste supabase/bootstrap.sql into the SQL Editor:
   ${SITE_URL?.replace('.supabase.co', '') ? `https://supabase.com/dashboard/project/${PROJECT_REF}/sql` : `https://supabase.com/dashboard/project/${PROJECT_REF}/sql`}
`);
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: conn,
    ssl: { rejectUnauthorized: false },
  });

  console.log("Applying supabase/bootstrap.sql …");
  await client.connect();
  try {
    await client.query(sql);
    const check = await client.query(
      `select
         to_regclass('public.profiles') as profiles,
         to_regclass('public.interest_tags') as interest_tags,
         to_regclass('public.user_interest_preferences') as prefs,
         (select count(*)::int from public.interest_tags) as tag_count`,
    );
    console.log("Schema OK:", check.rows[0]);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Bootstrap failed:", err.message);
  console.error(`
If the pooler host is wrong, use the connection string from:
Supabase → Project Settings → Database → Connection string (URI)
`);
  process.exit(1);
});
