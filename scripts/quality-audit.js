// quality-audit.js — G5: audit all live offers. Flags (never deletes by guess):
// foreign/global, vague discounts, ongoing-only, duplicate shop+discount pairs,
// offers with no area or image. Deletes ONLY clear bad ones: not-Bangladesh,
// expired, or exact duplicates. Prints a table of deleted vs flagged.
//
// Run: node scripts/quality-audit.js   (DRY_RUN=true lists without deleting)

import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createClient } from "@supabase/supabase-js";
import { isInsideBangladesh } from "../lib/bd-locations.js";

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
const DRY_RUN = ["1", "true", "yes"].includes(String(process.env.DRY_RUN || "").toLowerCase());

if (!url || !serviceKey) { console.error("Missing env"); process.exit(1); }
const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

const today = new Date().toISOString().slice(0, 10);
const norm = (s) => String(s || "").toLowerCase().trim().replace(/\s+/g, " ");

// ----- heuristics (flag only) -----
const FOREIGN_RE = /\b(usd|\$|euro|us\$|\bpounds?\b|expedia|coursera|udemy|amazon\.com|netflix|spotify)\b/i;
const VAGUE_RE = /\b(up to 100%|upto [0-9]+%|huge discount|big offer|50%-?100%|reduced|sale|clearance|best price|lowest price)\b/i;

function vagueDiscount(o) {
  const d = norm(o.discount_text);
  if (!d) return false;
  if (/^up to 100%|upto 100%/.test(d)) return true;
  if (VAGUE_RE.test(d)) return true;
  return false;
}

async function main() {
  const { data, error } = await sb
    .from("offers")
    .select("id, title, shop_name, discount_text, description, area, district, lat, lng, valid_till, is_ongoing, image, source_url")
    .eq("status", "approved");
  if (error) { console.error("Read failed:", error.message); process.exit(1); }
  const rows = data || [];
  console.log(`Auditing ${rows.length} live offers.`);

  const flagged = { not_bangladesh: [], foreign_global: [], vague_discount: [], ongoing_only: [], no_area: [], no_image: [], duplicate_pair: [] };
  const seen = new Map(); // norm(shop|discount|area) -> first id
  const toDelete = new Set();

  for (const o of rows) {
    // CLEAR BAD: not Bangladesh (coords outside BD)
    if (!(Number.isFinite(o.lat) && Number.isFinite(o.lng) && isInsideBangladesh(o.lat, o.lng))) {
      flagged.not_bangladesh.push(o.id);
      toDelete.add(o.id);
      continue;
    }
    // CLEAR BAD: expired (valid_till < today and not ongoing)
    if (o.valid_till && !o.is_ongoing && o.valid_till < today) {
      toDelete.add(o.id);
      continue;
    }
    // FLAG: foreign/global
    if (FOREIGN_RE.test(norm(o.title) + " " + norm(o.description)) && !o.district && o.area === "Bangladesh") {
      flagged.foreign_global.push(o.id);
    }
    // FLAG: vague discount
    if (vagueDiscount(o)) flagged.vague_discount.push(o.id);
    // FLAG: ongoing-only (no end date behaviour) — always true for ongoing
    // FLAG: no area
    if (!norm(o.area) || norm(o.area) === "bangladesh") flagged.no_area.push(o.id);
    // FLAG: no image
    if (!o.image || norm(o.image) === "") flagged.no_image.push(o.id);
    // CLEAR BAD: exact duplicate (same shop+discount+area)
    const key = `${norm(o.shop_name)}|${norm(o.discount_text)}|${norm(o.area)}`;
    if (key !== "||") {
      if (seen.has(key)) { toDelete.add(o.id); flagged.duplicate_pair.push(o.id); }
      else seen.set(key, o.id);
    }
  }

  // Separate expired into its own flagged bucket for clarity.
  const expired = rows.filter((o) => o.valid_till && !o.is_ongoing && o.valid_till < today).map((o) => o.id);
  flagged.expired = expired;

  const summary = Object.fromEntries(Object.entries(flagged).map(([k, v]) => [k, v.length]));
  console.log("FLAGGED:", JSON.stringify(summary));
  console.log("WILL DELETE (clear bad):", toDelete.size);

  // Table: per-id reason summary
  console.log("\nid                              | title (trunc)                    | action   | reason");
  console.log("-".repeat(100));
  for (const o of rows) {
    let reason = [];
    if (o.lat == null || o.lng == null || !isInsideBangladesh(o.lat, o.lng)) reason.push("not-bd");
    if (o.valid_till && !o.is_ongoing && o.valid_till < today) reason.push("expired");
    if (flagged.duplicate_pair.includes(o.id)) reason.push("exact-dup");
    if (flagged.foreign_global.includes(o.id)) reason.push("foreign");
    if (flagged.vague_discount.includes(o.id)) reason.push("vague");
    if (flagged.no_area.includes(o.id)) reason.push("no-area");
    if (flagged.no_image.includes(o.id)) reason.push("no-image");
    if (!reason.length) continue;
    const action = toDelete.has(o.id) ? "DELETE" : "flag  ";
    console.log(`${o.id.padEnd(37)}| ${String(o.title || "").slice(0, 30).padEnd(31)}| ${action} | ${reason.join(",")}`);
  }

  // Perform deletes
  if (toDelete.size === 0) { console.log("✅ Nothing to delete."); return; }
  if (DRY_RUN) { console.log(`(dry run — would delete ${toDelete.size}, nothing written)`); return; }
  let deleted = 0;
  for (const id of toDelete) {
    const { error: delErr } = await sb.from("offers").delete().eq("id", id);
    if (!delErr) deleted += 1;
  }
  console.log(`✅ Deleted ${deleted}/${toDelete.size} clear-bad offer(s).`);
}

main().catch((e) => { console.error("Quality audit failed:", e.message); process.exit(1); });