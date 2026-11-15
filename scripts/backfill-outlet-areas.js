// backfill-outlet-areas.js — BATCH H4: reverse geocode offer_outlets that have
// no area yet (Nominatim, 1 req/s, max 150 per run, resumable). Prefers outlets
// inside Dhaka, Chattogram, Sylhet, Rajshahi, Khulna first so the most useful
// city areas get labels before farther ones.
//
// Run: node scripts/backfill-outlet-areas.js   (DRY_RUN=true previews only)

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
const UA = "OfferMapBD/1.0 (outlet area backfill; mailto:contact@offermap-bd.example.com)";
const LIMIT = Number(process.env.MAX || 150);
const DRY_RUN = ["1", "true", "yes"].includes(String(process.env.DRY_RUN || "").toLowerCase());

// Prefer these cities first; rows are picked roughly by proximity to their centers.
const PRIORITY = [
  { city: "Dhaka", lat: 23.8103, lng: 90.4125 },
  { city: "Chattogram", lat: 22.3569, lng: 91.7832 },
  { city: "Sylhet", lat: 24.9045, lng: 91.8611 },
  { city: "Rajshahi", lat: 24.3745, lng: 88.6042 },
  { city: "Khulna", lat: 22.8456, lng: 89.5403 },
];

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

// Pick rows with no area, preferring outlets nearest to the priority cities.
async function pickRows() {
  const { data, error } = await sb
    .from("offer_outlets")
    .select("id, lat, lng, area")
    .or("area.is.null,area.eq.,area.eq.Bangladesh")
    .limit(500);
  if (error) throw error;
  const rows = (data || []).filter((r) => r.lat != null && r.lng != null);
  return rows
    .map((r) => {
      const d = Math.min(...PRIORITY.map((p) => Math.hypot(r.lat - p.lat, r.lng - p.lng)));
      return { ...r, d };
    })
    .sort((a, b) => a.d - b.d)
    .slice(0, LIMIT);
}

async function main() {
  const rows = await pickRows();
  console.log(`Found ${rows.length} outlet(s) without an area (max ${LIMIT}, priority: Dhaka/Chattogram/Sylhet/Rajshahi/Khulna).`);
  let updated = 0;
  for (const r of rows) {
    await sleep(1100); // 1 req/s
    const geo = await reverse(r.lat, r.lng);
    const area = geo && composeArea(geo.address);
    if (!area) { console.log(`   skip (nothing): ${r.id}`); continue; }
    if (DRY_RUN) { console.log(`   ~ (dry) ${r.id}: ${area}`); updated += 1; continue; }
    const { error: upErr } = await sb.from("offer_outlets").update({ area }).eq("id", r.id);
    if (!upErr) { updated += 1; console.log(`   - ${r.id}: ${area}`); }
    else console.error("Update failed", r.id, upErr.message);
  }
  console.log(`Done. Updated ${updated}/${rows.length}.`);
}

main().catch((e) => { console.error("Backfill outlet areas failed:", e.message); process.exit(1); });