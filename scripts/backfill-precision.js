// backfill-precision.js - compute and persist location_precision for offers
// that don't have it yet. Resumable, processes in pages.
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
if (existsSync(join(root, ".env.local"))) {
  for (const l of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
    const t = l.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}
const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "");
const sb = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function getPrecision(offer) {
  if (offer && offer.location_precision) {
    const p = String(offer.location_precision).toLowerCase();
    if (["exact", "area", "district"].includes(p)) return p;
  }
  const area = String(offer.area || "").trim().toLowerCase();
  const addr = String(offer.address || "").trim().toLowerCase();
  if (addr.includes("(approximate location)")) return "district";
  if (
    addr &&
    addr !== "bangladesh" &&
    (addr.includes(",") || offer.district)
  ) {
    return "exact";
  }
  if (area && area !== "bangladesh" && area !== String(offer.district || "").toLowerCase() && area !== String(offer.division || "").toLowerCase()) {
    return "area";
  }
  return "district";
}

async function main() {
  const { data, error } = await sb
    .from("offers")
    .select("id, area, address, district, division, lat, lng, location_precision")
    .is("location_precision", null);
  if (error) { console.error("Read failed:", error.message); process.exit(1); }
  const rows = data || [];
  console.log(`Found ${rows.length} offer(s) without location_precision.`);
  let updated = 0;
  for (const r of rows) {
    const p = getPrecision(r);
    const { error: upErr } = await sb.from("offers").update({ location_precision: p }).eq("id", r.id);
    if (upErr) { console.error("Update failed", r.id, upErr.message); continue; }
    updated += 1;
  }
  console.log(`Done. Updated ${updated}/${rows.length}.`);
}
main().catch((e) => { console.error("Failed:", e.message); process.exit(1); });