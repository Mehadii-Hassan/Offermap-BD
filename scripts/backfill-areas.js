// backfill-areas.js - improve area/address for offers whose area is only
// "Bangladesh" (or empty) using Nominatim reverse geocoding (1 req/s, proper
// User-Agent). Resumable: re-run until 0 rows remain. At most 150 per run.
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = "OfferMapBD/1.0 (offer backfill; mailto:contact@offermap-bd.example.com)";
const LIMIT = Number(process.env.MAX || 150);

// Compose a nice neighbourhood-level area from Nominatim address parts.
function composeArea(addr) {
  const pick = (k) => (addr && addr[k]) || "";
  return (
    pick("suburb") ||
    pick("neighbourhood") ||
    pick("quarter") ||
    pick("city_district") ||
    pick("town") ||
    pick("city") ||
    ""
  );
}

async function reverse(lat, lng) {
  try {
    const u = new URL("https://nominatim.openstreetmap.org/reverse");
    u.searchParams.set("lat", String(lat));
    u.searchParams.set("lon", String(lng));
    u.searchParams.set("zoom", "16");
    u.searchParams.set("format", "json");
    const res = await fetch(u, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function main() {
  const { data, error } = await sb
    .from("offers")
    .select("id, lat, lng, area, address, district, division")
    .or(`area.eq.Bangladesh,area.eq.,area.ilike.%bangladesh%`)
    .limit(LIMIT);
  if (error) { console.error("Read failed:", error.message); process.exit(1); }
  const rows = data || [];
  console.log(`Found ${rows.length} offer(s) to improve (max ${LIMIT}).`);
  let updated = 0;
  for (const r of rows) {
    await sleep(1100);
    if (r.lat == null || r.lng == null) continue;
    const geo = await reverse(r.lat, r.lng);
    const area = geo && composeArea(geo.address);
    const nice = area || r.district || "";
    const fullAddress = geo && geo.display_name ? geo.display_name : r.address;
    if (!nice) { console.log(`   skip (nothing): ${r.id}`); continue; }
    const { error: upErr } = await sb.from("offers").update({ area: nice, address: fullAddress }).eq("id", r.id);
    if (!upErr) { updated += 1; console.log(`   - ${r.id}: ${nice}`); }
    else console.error("Update failed", r.id, upErr.message);
  }
  console.log(`Done. Updated ${updated}/${rows.length}.`);
}
main().catch((e) => { console.error("Failed:", e.message); process.exit(1); });