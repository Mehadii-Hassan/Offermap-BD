// reset-scraped script: deletes ALL auto-scraped offers (source = 'scraper')
// and clears the scrape_log table, so those pages can be processed again.
//
// It never touches offers with source = 'user' (or any other source).
// Safety: run WITHOUT --yes to preview; pass --yes to actually delete.
//
// Run: node scripts/reset-scraped.js          # preview (prints what would be deleted)
//      node scripts/reset-scraped.js --yes     # actually deletes

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

// The scraper writes source = 'scraper' (not 'user'). This is the value we reset.
const SCRAPE_SOURCE = "scraper";
const CONFIRM = process.argv.includes("--yes");

async function countScrapedOffers() {
  const { count, error } = await supabase
    .from("offers")
    .select("id", { count: "exact", head: true })
    .eq("source", SCRAPE_SOURCE);
  if (error) throw error;
  return count ?? 0;
}

async function countScrapeLog() {
  const { count, error } = await supabase
    .from("scrape_log")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

async function deleteScrapedOffers() {
  const { data, error } = await supabase
    .from("offers")
    .delete()
    .eq("source", SCRAPE_SOURCE)
    .select("id");
  if (error) throw error;
  return (data || []).length;
}

async function clearScrapeLog() {
  const { error } = await supabase.from("scrape_log").delete().neq("url", "__none__");
  if (error) throw error;
}

async function main() {
  const offerCount = await countScrapedOffers();
  const logCount = await countScrapeLog();
  console.log(`🔍 Would delete ${offerCount} scraped offer(s) (source='${SCRAPE_SOURCE}') and clear ${logCount} scrape_log row(s).`);

  if (!CONFIRM) {
    console.log("ℹ️ Preview only. Re-run with --yes to actually delete.");
    return;
  }

  const deleted = await deleteScrapedOffers();
  await clearScrapeLog();
  console.log(`✅ Deleted ${deleted} scraped offer(s) and cleared scrape_log.`);
}

main().catch((e) => {
  console.error("❌ reset-scraped failed:", e.message);
  process.exit(1);
});