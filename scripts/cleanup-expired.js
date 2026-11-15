// cleanup-expired.js - deletes expired offers and prunes old scrape_log rows.
// - "Expired" = valid_till is before today in Bangladesh time (UTC+6).
// - Ongoing offers (valid_till set ~21 days out) are removed once past today.
// - Deletes stored Supabase Storage images for each removed offer.
// - Logs 'expired_deleted' events into activity_log.
// - Removes scrape_log rows older than 60 days.
//
// Run: node scripts/cleanup-expired.js

import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const envFile = join(root, ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || serviceKey;

if (!url || !serviceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Bangladesh today (UTC+6) as YYYY-MM-DD.
const bdToday = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString().slice(0, 10);

async function logEvent(event, offerId, detail) {
  try {
    await supabase.from("activity_log").insert({ event, offer_id: offerId, detail });
  } catch (e) {
    /* non-fatal */
  }
}

// Delete a stored image path from the offer-images bucket if it looks internal.
async function deleteStoredImage(urlStr) {
  try {
    if (!urlStr) return;
    const u = new URL(urlStr);
    if (!u.hostname.includes(".supabase")) return;
    const seg = urlStr.split("/");
    const filename = seg[seg.length - 1];
    await supabase.storage.from("offer-images").remove([filename]);
  } catch {
    /* ignore */
  }
}

async function main() {
  console.log(`🧹 Cleaning expired offers (BD date ${bdToday})...`);

  const { data: rows, error } = await supabase
    .from("offers")
    .select("id, image, source_image_url, title")
    .lt("valid_till", bdToday);
  if (error) {
    console.error("Read failed:", error.message);
    process.exit(1);
  }
  const expired = rows || [];
  console.log(`Found ${expired.length} expired offer(s).`);

  for (const o of expired) {
    await deleteStoredImage(o.image);
    const { error: delErr } = await supabase.from("offers").delete().eq("id", o.id);
    if (delErr) {
      console.error(`Delete failed for ${o.id}:`, delErr.message);
      continue;
    }
    await logEvent("expired_deleted", o.id, `auto-expired ${o.title || ""}`.trim());
  }

  // Remove scrape_log rows older than 60 days.
  const cutoff = new Date(Date.now() - 60 * 86400000).toISOString();
  const { data: logData, error: logErr } = await supabase
    .from("scrape_log")
    .select("id")
    .lt("scraped_at", cutoff);
  if (!logErr && logData) {
    for (const r of logData) {
      await supabase.from("scrape_log").delete().eq("id", r.id);
    }
    console.log(`Pruned ${logData.length} old scrape_log row(s).`);
  }

  console.log(`✅ Done. Deleted ${expired.length} expired offer(s).`);
}

main().catch((e) => {
  console.error("Cleanup failed:", e.message);
  process.exit(1);
});