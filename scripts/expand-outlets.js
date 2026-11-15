// expand-outlets.js — BATCH H2: for every live offer that is nationwide OR that
// looks like a chain brand, query Overpass for its outlets in Bangladesh and save
// them into offer_outlets (up to 300 per brand). Brands already processed are
// skipped via a small local cache file (brands.json) — not a new table.
//
// Polite: 1 Overpass request every 2 seconds, 60s timeout, proper User-Agent.
// Resumable: re-run to process newly added/eligible offers.
//
// Run: node scripts/expand-outlets.js   (DRY_RUN=true previews only, no writes)

import { readFileSync, existsSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import https from "https";
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
const MAX_OUTLETS = Number(process.env.MAX_OUTLETS || 300);
const LIMIT = Number(process.env.MAX || 50);

if (!url || !serviceKey) { console.error("Missing env"); process.exit(1); }
const sb = createClient(url, serviceKey, { auth: { persistSession: false } });
const UA = "OfferMapBD/1.0 (outlet expansion; mailto:contact@offermap-bd.example.com)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CACHE_FILE = join(__dirname, "..", ".outlet-brands.json");

// Suffixes that don't change who the brand is (case-insensitive, stripped).
const BRAND_SUFFIXES = ["restaurant", "outlet", "branch", "store", "shop", "kitchen",
  "express", "cafe", "bank", "fast food", "fine dining", "and", "the",
  "bangladesh", "bangla", "bd", "plc", "ltd", "limited", "co", "corp", "group"];

// Normalise a string for matching: lowercase, strip punctuation, collapse spaces.
function norm(s) {
  return String(s || "").toLowerCase()
    .replace(/\./g, "")
    .replace(/[\u00b7\u2022]/g, " ")
    .replace(/[&]\s?/g, " and ")
    .replace(/\s+/g, " ")
    .trim();
}

// Reduce a shop_name to its brand key: strip trailing generic suffixes.
function brandKey(shopName) {
  let b = norm(shopName);
  let changed = true;
  while (changed) {
    changed = false;
    for (const suf of BRAND_SUFFIXES) {
      const re = new RegExp(`\\s+${suf}$`);
      if (re.test(b)) {
        b = b.replace(re, "");
        changed = true;
        break;
      }
      // also drop commas/apostrophes that may wrap the suffix
      const re2 = new RegExp(`[,\\s]+${suf}[,\\s]*$`);
      if (re2.test(b)) {
        b = b.replace(re2, "");
        changed = true;
        break;
      }
    }
  }
  return b;
}

function loadCache() {
  if (existsSync(CACHE_FILE)) {
    try { return JSON.parse(readFileSync(CACHE_FILE, "utf8")); } catch { /* ignore */ }
  }
  return { brands: {} };
}
function saveCache(c) {
  writeFileSync(CACHE_FILE, JSON.stringify(c, null, 2), "utf8");
}

// Wrap the Overpass regex brand into a query. Helpers for quality.
const GENERIC_BRANDS = new Set(["bay", "the", "and", "hotel", "restaurant", "bazaar", "market", "shop"]);
function isGenericBrand(b) {
  if (b.length < 3) return true;
  return GENERIC_BRANDS.has(b);
}

// Overpass: match the brand across Bangladesh by querying a few regional bboxes
// (kept light to stay responsive on the slow Overpass mirrors), using nwr with
// brand/name/name:en/name:bn/operator. Accept an element when its tag contains
// the brand as a whole word (case-insensitive), including suffix variants like
// "KFC Uttara" or "Aarong Dhanmondi". Endpoint fallback; one request per 2s.
const OVERPASS_ENDPOINTS = [
  "https://overpass.osm.ch/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

// Regional boxes that together cover Bangladesh (s, w, n, e).
const DIVISION_BBOXES = [
  "(23.50,88.00,26.70,92.70)", // north + Dhaka
  "(20.50,88.00,23.60,92.70)", // south (Khulna/Barishal/Chattogram/Sylhet belt)
];

function overpassPost(endpoint, body, timeoutMs) {
  return new Promise((resolve) => {
    const u = new URL(endpoint);
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA },
      },
      (res) => {
        let d = "";
        res.on("data", (c) => { d += c; });
        res.on("end", () => resolve({ ok: true, status: res.statusCode, body: d }));
        res.on("error", () => resolve({ ok: false }));
      }
    );
    req.on("error", () => resolve({ ok: false }));
    req.on("timeout", () => { req.destroy(); resolve({ ok: false }); });
    req.setTimeout(timeoutMs);
    req.write("data=" + encodeURIComponent(body));
    req.end();
  });
}

// Whole-word, case-insensitive containment of brand in a tag value.
function tagMatches(tagValue, brand) {
  const hay = String(tagValue || "");
  const needle = String(brand);
  const re = new RegExp(`(^|[^a-z0-9])${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`, "i");
  return re.test(hay);
}

// Query one division bbox; returns matched elements or a rateLimited flag.
async function queryBbox(bbox, brand) {
  const escape = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const keys = ["brand", "name", "name:en", "name:bn", "operator"];
  const parts = keys.map((k) => `nwr["${k}"~"${escape(brand)}",i]${bbox}`).join(";");
  const query = `[out:json][timeout:90];(${parts});out center 300;`;
  let last429 = false;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    const res = await overpassPost(endpoint, query, 30000);
    if (res.ok && res.status === 200) {
      let elements = [];
      try { elements = JSON.parse(res.body).elements || []; } catch { }
      return { rateLimited: false, elements };
    }
    if (res.ok && (res.status === 429 || res.status === 504)) last429 = true;
    // slow/error mirrors: stop trying after a couple to keep the run responsive
    if (endpoint === OVERPASS_ENDPOINTS[1]) break;
  }
  return { rateLimited: last429, elements: [] };
}

function elementPoint(el) {
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (!isInsideBangladesh(lat, lng)) return null;
  return { lat, lng };
}

async function overpassOutlets(brand, shouldStop) {
  if (isGenericBrand(brand)) return { rateLimited: false, elements: [] };
  const seen = new Set();
  const out = [];
  let rateLimited = false;
  for (const bbox of DIVISION_BBOXES) {
    if (shouldStop && shouldStop()) break;
    const r = await queryBbox(bbox, brand);
    if (r.rateLimited) { rateLimited = true; break; }
    for (const el of r.elements) {
      const p = elementPoint(el);
      if (!p) continue;
      const t = el.tags || {};
      // whole-word match across any brand/name/operator tag
      const brandName = t["brand"] || t["name"] || t["brand:en"] || t["name:en"] || t["name:bn"] || t["operator"] || brand;
      if (!(tagMatches(t.brand, brand) || tagMatches(t.name, brand) ||
            tagMatches(t["name:en"], brand) || tagMatches(t["name:bn"], brand) ||
            tagMatches(t.operator, brand))) continue;
      const key = `${p.lat.toFixed(4)}:${p.lng.toFixed(4)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const address = [t["addr:street"], t["addr:housenumber"]].filter(Boolean).join(", ");
      const suburb = t["addr:suburb"] || t["addr:city"] || t["addr:district"] || "";
      out.push({
        lat: p.lat,
        lng: p.lng,
        name: brandName,
        address: (address || t["addr:full"] || "").trim(),
        area: suburb,
        source: "osm",
      });
      if (out.length >= MAX_OUTLETS) return { rateLimited: false, elements: out };
    }
    await sleep(2000); // one request per 2 seconds
  }
  return { rateLimited, elements: out };
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);

  // 1) Collect live, eligible offers (nationwide OR chain-looking brand).
  const { data, error } = await sb
    .from("offers")
    .select("id, shop_name, district, nationwide, status, valid_till, is_ongoing")
    .eq("status", "approved")
    .limit(5000);
  if (error) { console.error("Read failed:", error.message); process.exit(1); }
  const live = (data || []).filter((o) =>
    o.is_ongoing || !o.valid_till || o.valid_till >= today
  );

  // Count brands across distinct districts to detect chains.
  const brandDistricts = {}; // brandKey -> Set(district)
  for (const o of live) {
    const k = brandKey(o.shop_name);
    if (!k) continue;
    brandDistricts[k] = brandDistricts[k] || new Set();
    if (o.district) brandDistricts[k].add(o.district);
    if (o.nationwide === true) brandDistricts[k].add("*"); // nationwide flag counts
  }

  // 2) Brand -> offer ids mapping (a brand may be shared by several offers).
  const brandOffers = {}; // brandKey -> [offer ids]
  for (const o of live) {
    const k = brandKey(o.shop_name);
    if (!k) continue;
    const isChain = o.nationwide === true || (brandDistricts[k] && brandDistricts[k].size >= 2);
    if (!isChain) continue;
    brandOffers[k] = brandOffers[k] || [];
    brandOffers[k].push(o.id);
  }

  const cache = loadCache();
  const brandKeys = Object.keys(brandOffers).sort();
  console.log(`Eligible chain brands: ${brandKeys.length}`);
  console.log(`DRY_RUN=${DRY_RUN}  MAX_OUTLETS=${MAX_OUTLETS}  LIMIT=${LIMIT}`);

  let brandsMatched = 0;
  let outletsSaved = 0;
  let processed = 0;
  let rateLimited = false;

  for (const brand of brandKeys) {
    if (processed >= LIMIT) {
      console.log(`Reached per-run LIMIT (${LIMIT}); rerun to continue.`);
      break;
    }
    if (cache.brands[brand] && cache.brands[brand].done) {
      console.log(`  skip (done): ${brand}`);
      continue;
    }
    if (isGenericBrand(brand)) {
      console.log(`  skip (generic brand, low value): "${brand}"`);
      cache.brands[brand] = { done: true, offers: brandOffers[brand], outlets: 0 };
      if (!DRY_RUN) saveCache(cache);
      continue;
    }
    processed += 1;
    const offerIds = brandOffers[brand];
    console.log(`\n${brand} -> ${offerIds.length} offer(s), querying Overpass…`);
    const res = await overpassOutlets(brand);
    if (res.rateLimited) {
      rateLimited = true;
      console.log(`  429 — stopping to avoid the limit. Rerun later.`);
      cache.brands[brand] = { done: false, offers: offerIds };
      if (!DRY_RUN) saveCache(cache);
      break;
    }
    await sleep(2000); // one request per 2 seconds

    const valid = res.elements.slice(0, MAX_OUTLETS);
    if (!valid.length) {
      console.log(`  no matches for "${brand}"`);
      cache.brands[brand] = { done: true, offers: offerIds, outlets: 0 };
      if (!DRY_RUN) saveCache(cache);
      continue;
    }

    // Save the same outlet list for every offer that shares this brand.
    let saved = 0;
    for (const offerId of offerIds) {
      if (DRY_RUN) {
        saved = valid.length;
        console.log(`  ~ (dry) offer ${offerId}: would save ${valid.length} outlet(s)`);
        continue;
      }
      const rows = valid.map((v) => ({
        offer_id: offerId,
        name: v.name || brand,
        lat: v.lat,
        lng: v.lng,
        address: v.address || null,
        area: v.area || null,
        source: v.source || "osm",
      }));
      const { error: insErr } = await sb.from("offer_outlets").insert(rows);
      if (insErr) {
        console.error(`  ⚠ insert failed for ${offerId}: ${insErr.message}`);
        continue;
      }
      saved += valid.length;
    }
    brandsMatched += 1;
    outletsSaved += saved;
    console.log(`  ✓ ${brand}: ${valid.length} outlet(s) (saved ${saved})`);
    cache.brands[brand] = { done: true, offers: offerIds, outlets: valid.length };
    if (!DRY_RUN) saveCache(cache);
  }

  console.log(`\nDONE. Brands matched: ${brandsMatched}, outlets saved: ${outletsSaved}, processed ${processed}.`);
  if (rateLimited) console.log("Ended early due to a 429 (rate limit). Progress was saved; rerun with no limit to continue.");
}

main().catch((e) => { console.error("Expand outlets failed:", e.message); process.exit(1); });