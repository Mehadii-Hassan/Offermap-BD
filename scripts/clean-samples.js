// Clean-samples script: deletes ONLY the 30 seeded fictional sample offers
// (whatever is currently in data/offers.json) and nothing else.
//
// It matches rows by normalized title + shop_name against the sample file, so
// community-submitted and auto-scraped offers are never touched.
//
// Run: node scripts/clean-samples.js

import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const envFile = join(root, ".env.local");
if (existsSync(envFile)) {
  const lines = readFileSync(envFile, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const norm = (s) => String(s || "").trim().toLowerCase();
const titleOf = (o) => o.title || o.title_value || "";
const shopOf = (o) => o.shopName || o.shop_name || "";
const keyOf = (o) => `${norm(titleOf(o))}|${norm(shopOf(o))}`;

// Sample file exists? Read the seeded sample offers.
const sampleFile = join(root, "data", "offers.json");
if (!existsSync(sampleFile)) {
  console.error("❌ data/offers.json not found — nothing to clean.");
  process.exit(1);
}

const samples = JSON.parse(readFileSync(sampleFile, "utf8"));
const sampleKeys = new Set(samples.map((o) => keyOf({ title: o.title, shopName: o.shopName })));

async function main() {
  console.log(`🧹 Cleaning ${samples.length} seeded sample offers...`);

  let all = [];
  let from = 0;
  const pageSize = 500;
  for (;;) {
    const { data, error } = await supabase
      .from("offers")
      .select("id, title, shop_name, dedupe_key")
      .range(from, from + pageSize - 1);
    if (error) {
      console.error("❌ Read failed:", error.message);
      process.exit(1);
    }
    all = all.concat(data || []);
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  const toDelete = all.filter((row) => sampleKeys.has(keyOf(row)));
  console.log(`Found ${toDelete.length} matching sample offers to delete.`);

  if (toDelete.length === 0) {
    console.log("✅ Nothing to delete.");
    return;
  }

  for (const row of toDelete) {
    const { error } = await supabase.from("offers").delete().eq("id", row.id);
    if (error) {
      console.error(`❌ Delete failed for ${row.title}:`, error.message);
    } else {
      console.log(`   - deleted: ${row.shop_name} — ${row.title}`);
    }
  }
  console.log(`✅ Done. Deleted ${toDelete.length} sample offer(s).`);
}

main().catch((e) => {
  console.error("❌ Unexpected error:", e.message);
  process.exit(1);
});