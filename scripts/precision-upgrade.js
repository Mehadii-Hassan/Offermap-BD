// precision-upgrade.js — G3: resolve district-precision offers to exact
// coordinates, in order: (1) Nominatim bounded to the district, (2) Overpass
// named-match, (3) geocode a mentioned address/area. Reverse-geocodes the area
// label, sets location_precision, and marks chains (3+ outlets) nationwide.
//
// Resumable: processes offers with location_precision='district' & !nationwide.
// Polite: Nominatim 1 req/s, Overpass 1 req/2s, proper User-Agent.
//
// Run: node scripts/precision-upgrade.js   (DRY_RUN=true previews only, no writes)

import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createClient } from "@supabase/supabase-js";
import { isInsideBangladesh, districtInfo, DHAKA_AREAS } from "../lib/bd-locations.js";

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
const UA = "OfferMapBD/1.0 (precision backfill; mailto:contact@offermap-bd.example.com)";
const LIMIT = Number(process.env.MAX || 60);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function norm(s) {
  return String(s || "").toLowerCase()
    .replace(/\./g, "").replace(/[\u00b7\u2022]/g, " ")
    .replace(/[&]\s?/g, " and ").replace(/\s+/g, " ").trim();
}
function similarity(a, b) {
  const A = norm(a), B = norm(b);
  if (!A || !B) return 0;
  const min = Math.min(A.length, B.length) || 1;
  let match = 0, i = 0, j = 0;
  while (i < A.length && j < B.length) {
    if (A[i] === B[j]) { match++; i++; j++; }
    else if (A.length >= B.length) i++;
    else j++;
  }
  if (match / min >= 0.5) return match / min;
  // also check substring containment for short names
  if (A.includes(B) || B.includes(A)) return 0.8;
  return match / min;
}

async function nominatimSearch(query, near, opts = {}) {
  await sleep(1000); // 1 req/s
  const params = new URLSearchParams({ q: query, format: "jsonv2", countrycodes: "bd", limit: "6", "accept-language": "en" });
  if (near) {
    const d = opts.span || 0.6;
    params.set("viewbox", `${near.lng - d},${near.lat + d},${near.lng + d},${near.lat - d}`);
    params.set("bounded", "1");
  }
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { "User-Agent": UA } });
  if (!res.ok) return [];
  try { return await res.json(); } catch { return []; }
}

async function reverseArea(lat, lng) {
  await sleep(1000); // 1 req/s
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, { headers: { "User-Agent": UA } });
    if (!res.ok) return "";
    const data = await res.json();
    const a = data.address || {};
    return a.suburb || a.neighbourhood || a.quarter || a.city_district || a.town || a.city || "";
  } catch { return ""; }
}

async function overpassMatch(shopName, near) {
  // 1 request per 2 seconds with proper UA; named nodes/ways whose name matches.
  await sleep(2000);
  const d = 0.6;
  const out = shopName;
  const query = `[out:json][timeout:25];(node["name"~"${out.replace(/"/g,'\\"')}",i](${near.lat - d},${near.lng - d},${near.lat + d},${near.lng + d});way["name"~"${out.replace(/"/g,'\\"')}",i](${near.lat - d},${near.lng - d},${near.lat + d},${near.lng + d}););out center 20;`;
  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA },
      body: "data=" + encodeURIComponent(query),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const outArr = [];
    for (const el of data.elements || []) {
      const lat = el.lat ?? el.center?.lat;
      const lng = el.lon ?? el.center?.lon;
      if (Number.isFinite(lat) && Number.isFinite(lng) && isInsideBangladesh(lat, lng)) {
        outArr.push({ lat, lng, name: el.tags?.name || "" });
      }
    }
    return outArr;
  } catch { return []; }
}

// Try to match a keyword from Bangladesh areas in the offer text, then use that.
function areaKeywordMatch(title, desc, address) {
  const blob = norm((title || "") + " " + (desc || "") + " " + (address || ""));
  for (const a of DHAKA_AREAS) {
    for (const key of [a.name, a.bn]) {
      if (key && blob.includes(norm(key))) return { lat: a.lat, lng: a.lng, name: a.name };
    }
  }
  return null;
}

async function resolveOffer(o) {
  const shop = String(o.shop_name || "").trim();
  const district = String(o.district || "").trim();
  const address = String(o.address || "").trim();
  const districtObj = district ? districtInfo(district) : null;

  // 1) Nominatim bounded to the district center.
  if (shop && districtObj) {
    const q = [shop, address, district, "Bangladesh"].filter(Boolean).join(", ");
    const hits = await nominatimSearch(q, districtObj);
    for (const h of hits) {
      const lat = Number(h.lat), lng = Number(h.lon);
      if (Number.isFinite(lat) && Number.isFinite(lng) && isInsideBangladesh(lat, lng)) {
        return { lat, lng, exact: true };
      }
    }
  }

  // 2) Overpass named match inside the district bbox.
  if (shop && districtObj) {
    const matches = await overpassMatch(shop, districtObj);
    for (const m of matches) {
      if (similarity(shop, m.name || shop) >= 0.45) {
        return { lat: m.lat, lng: m.lng, exact: true };
      }
    }
  }

  // 3) Address/area keyword geocode (Dhaka areas).
  const kw = areaKeywordMatch(o.title, o.description, address);
  if (kw) return { lat: kw.lat, lng: kw.lng, exact: true };

  return null;
}

async function exactCount() {
  const { data, error } = await sb.from("offers").select("location_precision");
  if (error) return null;
  const c = { exact: 0, area: 0, district: 0 };
  for (const r of data) c[r.location_precision || "district"] = (c[r.location_precision || "district"] || 0) + 1;
  return c;
}

async function main() {
  const before = await exactCount();
  console.log(`BEFORE -> ${JSON.stringify(before)}`);

  const { data, error } = await sb
    .from("offers")
    .select("id, title, description, shop_name, district, address, area, lat, lng, location_precision, nationwide")
    .eq("location_precision", "district")
    .limit(LIMIT);
  if (error) { console.error("Read failed:", error.message); process.exit(1); }
  const rows = (data || []).filter((o) => o.nationwide !== true);
  console.log(`Resolving ${rows.length} district-precision offer(s) (max ${LIMIT}).`);
  if (!rows.length) { const aft = await exactCount(); console.log(`AFTER -> ${JSON.stringify(aft)}`); return; }

  const chainMap = {}; // shop_name(lower) -> Set of district
  let upgraded = 0;
  for (const o of rows) {
    const hit = await resolveOffer(o);
    if (!hit) { console.log(`   - (unchanged) ${(o.shop_name || "").slice(0, 30)}`); continue; }
    const area = await reverseArea(hit.lat, hit.lng);
    if (DRY_RUN) {
      console.log(`   ~ (dry) ${(o.shop_name || "").slice(0, 30)} -> ${hit.lat.toFixed(4)},${hit.lng.toFixed(4)} area=${area}`);
    } else {
      const { error: upErr } = await sb
        .from("offers")
        .update({ lat: hit.lat, lng: hit.lng, address: o.address || "", area: area || o.area || o.district, location_precision: "exact" })
        .eq("id", o.id);
      if (upErr) { console.error("   ⚠️ update failed", o.id, upErr.message); continue; }
      console.log(`   ✓ ${(o.shop_name || "").slice(0, 30)} -> ${hit.lat.toFixed(4)},${hit.lng.toFixed(4)} area=${area}`);
    }
    if (o.shop_name) {
      const k = norm(o.shop_name);
      chainMap[k] = chainMap[k] || new Set();
      chainMap[k].add(o.district || "");
    }
    upgraded += 1;
  }

  // Chain detection: shop with >=3 matched outlets in different districts = nationwide.
  if (!DRY_RUN) {
    let chained = 0;
    for (const k of Object.keys(chainMap)) {
      const distinct = [...chainMap[k]].filter(Boolean);
      if (distinct.length >= 3) {
        // find the offers we upgraded for this shop and mark nationwide
        for (const o of rows) {
          if (norm(o.shop_name) === k && o.district && chainMap[k].has(o.district)) {
            const { error: upErr } = await sb.from("offers").update({ nationwide: true }).eq("id", o.id);
            if (!upErr) chained += 1;
          }
        }
        console.log(`   ⚠ chain: ${k} -> nationwide (${distinct.length} districts)`);
      }
    }
    console.log(`Chained nationwide: ${chained} offer(s).`);
  }

  const after = await exactCount();
  console.log(`AFTER -> ${JSON.stringify(after)}`);
  console.log(`Upgraded ${upgraded} offer(s) to exact.`);
}

main().catch((e) => { console.error("Precision upgrade failed:", e.message); process.exit(1); });