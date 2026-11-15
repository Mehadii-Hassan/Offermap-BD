// migrate.js - run pending SQL migrations in /supabase/migrations using the
// DATABASE_URL from .env.local (local Postgres only). Never logs the URL/key.
//
// Usage: npm run migrate

import { readFileSync, existsSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const migrationsDir = join(root, "supabase", "migrations");

// Load .env.local (only fills keys not already present; never printed).
const envFile = join(root, ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim();
    if (k === "DATABASE_URL" && !process.env.DATABASE_URL) process.env.DATABASE_URL = v;
  }
}

if (!process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL in .env.local");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20000,
});

async function ensureMigrationsTable() {
  await client.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       name text PRIMARY KEY,
       applied_at timestamptz DEFAULT now()
     )`
  );
}

async function appliedNames() {
  const { rows } = await client.query("SELECT name FROM schema_migrations");
  return new Set(rows.map((r) => r.name));
}

async function main() {
  if (!existsSync(migrationsDir)) {
    console.error("No migrations directory:", migrationsDir);
    process.exit(1);
  }
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("No migrations to run.");
    process.exit(0);
  }

  await client.connect();
  await ensureMigrationsTable();
  const applied = await appliedNames();

  let ran = 0;
  for (const f of files) {
    if (applied.has(f)) {
      console.log(`skip ${f} (already applied)`);
      continue;
    }
    const sql = readFileSync(join(migrationsDir, f), "utf8");
    console.log(`apply ${f}`);
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations(name) VALUES($1)", [f]);
      await client.query("COMMIT");
      ran += 1;
    } catch (err) {
      await client.query("ROLLBACK");
      throw new Error(`Migration ${f} failed: ${err.message}`);
    }
  }
  console.log(`Done. Applied ${ran} migration(s).`);
  await client.end();
}

main().catch((e) => {
  console.error("Migrate failed:", e.message);
  process.exit(1);
});