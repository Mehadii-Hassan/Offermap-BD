// crawl-direct.js — fetch Bangladeshi offer LISTING pages DIRECTLY (no Tavily
// credits) from data/sources.json, extract offers with Gemini, and upsert them.
//
// Rules (G1a): 40+ sources, 15 per run in daily rotation, respects robots.txt,
// 1 request/second, one page returns MANY offers, follow up to 5 pagination
// pages. Inserted offers flow through the normal image + precision logic.
//
// Run: node scripts/crawl-direct.js   (DRY_RUN=true for a dry run)

import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { tmpdir } from "os";
import { createClient } from "@supabase/supabase-js";
import { isInsideBangladesh, districtInfo } from "../lib/bd-locations.js";
import { insertOutletsForOffer } from "./outlet-utils.js";

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
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const DRY_RUN = ["1", "true", "yes"].includes(
  String(process.env.DRY_RUN === undefined ? process.env.SCRAPE_DRY_RUN : process.env.DRY_RUN).toLowerCase()
);

if (!url || !serviceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
if (!GEMINI_API_KEY) {
  console.error("Missing GEMINI_API_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PER_RUN = 15; // sources per run
const MAX_PAGES_PER_SOURCE = 5; // pagination pages (incl. first page)
const SOURCES_FILE = join(root, "data", "sources.json");
const STATE_FILE = join(tmpdir(), "crawl-direct-state.json"); // resumable rotation
const USER_AGENT = "OfferMapBD/1.0 (offer crawler; mailto:contact@offermap-bd.example.com)";
const APP_CATEGORIES = [
  "Restaurant", "Fashion & Clothing", "Bank Card Offers", "Electronics",
  "Salon & Beauty", "Grocery", "Travel & Hotels", "Mobile & Gadgets",
  "Health & Fitness", "Education & Courses", "Online Shopping", "Cashback & Wallet", "Other",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function nowISO() { return new Date().toISOString(); }
function todayDateStr() { return new Date().toISOString().slice(0, 10); }
function addDays(iso, days) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function buildDedupeKey(shop, discount, area, sourceUrl) {
  const s = [(shop || ""), (discount || ""), (area || ""), sourceUrl || ""]
    .map((x) => String(x).toLowerCase().trim())
    .join("|");
  return `ombd-${s}`.slice(0, 200);
}
function resolveRelative(u, base) {
  try { return new URL(u, base).href; } catch { return ""; }
}

// --- rotation/resumable state: pick PER_RUN sources per calendar day ---
function loadSources() {
  try { return JSON.parse(readFileSync(SOURCES_FILE, "utf8")); }
  catch { return []; }
}
function dayIdx() { return Math.floor(Date.now() / 86400000); }
function pickBatch(sources) {
  let state = {};
  try { state = JSON.parse(readFileSync(STATE_FILE, "utf8")); } catch { /* none */ }
  if (!sources.length) return [];
  if (state.day !== dayIdx()) { state = { day: dayIdx(), offset: 0 }; }
  const offset = state.offset % sources.length;
  const batch = [];
  for (let i = 0; i < PER_RUN && batch.length < sources.length; i++) {
    batch.push(sources[(offset + i) % sources.length]);
  }
  return batch;
}

async function robotsAllows(u) {
  try {
    const base = `${u.protocol}//${u.host}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`${base}/robots.txt`, { headers: { "User-Agent": USER_AGENT }, signal: ctrl.signal, redirect: "follow" });
    clearTimeout(timer);
    if (!res.ok) return true;
    const txt = await res.text();
    const path = u.pathname;
    let apply = false;
    for (const line of txt.split(/\r?\n/)) {
      const t = line.trim().toLowerCase();
      if (t.startsWith("user-agent: *")) apply = true;
      else if (t.startsWith("user-agent:")) apply = false;
      else if (apply && t.startsWith("disallow:")) {
        const dis = t.slice("disallow:".length).trim();
        if (dis === "/" || (dis && path.startsWith(dis))) return false;
      }
    }
    return true;
  } catch { return true; }
}

async function fetchPage(sourceUrl) {
  if (!sourceUrl || !/^https:\/\//i.test(sourceUrl)) return null;
  if (!(await robotsAllows(sourceUrl))) return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(sourceUrl, { headers: { "User-Agent": USER_AGENT, Accept: "text/html,*/*;q=0.8" }, signal: ctrl.signal, redirect: "follow" });
    clearTimeout(timer);
    if (!res.ok) return null;
    const text = await res.text();
    return text.length > 1_000_000 ? text.slice(0, 1_000_000) : text;
  } catch { return null; }
}

function chunkText(text, maxLen = 150000) {
  const out = [];
  for (let i = 0; i < text.length; i += maxLen) out.push(text.slice(i, i + maxLen));
  return out;
}

// BATCH H3 small caps for the LIVE direct crawl: at most MAX_GEMINI_CALLS.
const MAX_GEMINI_CALLS = Number(process.env.MAX_GEMINI_CALLS || 40);
let geminiCalls = 0;

async function extractOffers(pageUrl, html) {
  if (!html) return [];
  const all = [];
  for (const chunk of chunkText(html)) {
    if (geminiCalls >= MAX_GEMINI_CALLS) {
      console.warn(`⚠️ Reached MAX_GEMINI_CALLS (${MAX_GEMINI_CALLS}) — stopping extraction this run.`);
      break;
    }
    geminiCalls += 1;
    const prompt = `You are an offer intelligence agent for OfferMap BD (deals in Bangladesh). Today is ${todayDateStr()}.
Source page URL: ${pageUrl}
Listing page content:
${chunk}
Extract ALL unique offers/deals. Return a JSON array. For each offer ONLY these fields:
- title, shopName, discountText, description
- category: ONE of exactly: ${APP_CATEGORIES.join(", ")} (use "Other" if none fit)
- division, district, address (only if known, else empty string)
- paymentMethod: Any or one of City Bank Card, bKash, Nagad, Rocket
- validTill: END date YYYY-MM-DD or null (convert Bengali/English/relative dates; today ${todayDateStr()}; NEVER invent one)
- ongoing: true only if explicitly ongoing/limited-time/while-stock-lasts with no end date; else false
- outdated: true ONLY if about a PAST season/year; else false
- nationwide: true ONLY if valid across all Bangladesh (bank/wallet/telecom/Daraz-type/large chain); else false
- bangladesh_offer: true ONLY if clearly for Bangladesh customers (BD shop/bank/wallet, BDT/৳/Tk) — false for foreign/global sites priced in $/£/€; else false
- outlets: an array of site/branch addresses if this page lists the brand's outlets, partner merchants or "our outlets"/branch locations (bank card/wallet/telecom partner lists, a chain's branches). Each listed branch/partner address is one string. If the page lists no addresses, return [].
- imageUrl: best https image if available, else empty string
Return ONLY a valid JSON array (no markdown). If nothing usable, return [].`;
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
        }),
      }
    );
    if (!res.ok) {
      if (res.status === 429) { console.warn("⚠️ Gemini 429 — stopping extraction this run."); break; }
      console.warn(`⚡ Gemini call failed (${res.status}).`);
      continue;
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    let parsed = [];
    try { parsed = JSON.parse(cleaned || "[]"); } catch { parsed = []; }
    if (Array.isArray(parsed)) {
      for (const o of parsed) {
        if (o && typeof o === "object") {
          delete o.lat; delete o.lng; delete o.latitude; delete o.longitude;
          if (!o.sourceUrl) o.sourceUrl = pageUrl;
          all.push(o);
        }
      }
    }
  }
  return all;
}

// Follow pagination (up to 5 pages) and collect all offers from a source.
async function crawlSource(baseUrl) {
  let offers = [];
  let nextUrl = baseUrl;
  for (let p = 0; p < MAX_PAGES_PER_SOURCE && nextUrl; p++) {
    await sleep(1000); // 1 request/second
    const html = await fetchPage(nextUrl);
    if (!html) break;
    offers = offers.concat(await extractOffers(nextUrl, html));
    const rel = html.match(/<link[^>]+rel=["']next["'][^>]+href=["']([^"']+)["']/i);
    let m = html.match(/<a[^>]+href=["']([^"']+)["'][^>]*>.*?next/i);
    if (!m) m = html.match(/<a[^>]+href=["']([^"']+page=(\d+))["']/i);
    const found = rel?.[1] || m?.[1];
    nextUrl = found ? resolveRelative(found, baseUrl) : null;
  }
  return offers;
}

function resolveValidity(o) {
  o.isOngoing = false;
  const raw = String(o.validTill || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    if (raw < todayDateStr()) return "expired";
    o.validTill = raw;
    return null;
  }
  if (o.ongoing === true) { o.validTill = addDays(todayDateStr(), 21); o.isOngoing = true; return null; }
  return "no end date";
}

function invalidReason(o) {
  if (!String(o.title || "").trim() || !String(o.shopName || "").trim() || !String(o.discountText || "").trim()) return "missing field";
  if (o.bangladesh_offer === false) return "not Bangladesh";
  if (o.outdated === true) return "outdated";
  return null;
}

async function resolveLocation(o) {
  const district = String(o.district || "").trim();
  const address = String(o.address || "").trim();
  const shop = String(o.shopName || "").trim();
  if (o.nationwide === true) {
    // Nationwide offers still need a valid coordinate for the map: use BD center.
    return { lat: 23.6850, lng: 90.3563, area: o.area || "Bangladesh", nationwide: true };
  }
  // Nominatim (max 1 req/s with proper UA).
  await sleep(1000);
  const trySearch = async (q) => {
    const params = new URLSearchParams({ q, format: "jsonv2", countrycodes: "bd", limit: "5" });
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) return null;
    for (const r of await res.json()) {
      const lat = Number(r.lat), lng = Number(r.lon);
      if (Number.isFinite(lat) && Number.isFinite(lng) && isInsideBangladesh(lat, lng)) {
        return { lat, lng, displayName: r.display_name || "", addressApproximate: false };
      }
    }
    return null;
  };
  const q1 = [shop, address, district, "Bangladesh"].filter(Boolean).join(", ");
  let hit = q1 ? await trySearch(q1) : null;
  if (!hit && address) hit = await trySearch([address, district, "Bangladesh"].filter(Boolean).join(", "));
  if (hit) return hit;
  const dInfo = district ? districtInfo(district) : null;
  if (!dInfo) return { skip: "unknown district" };
  return { lat: dInfo.lat, lng: dInfo.lng, displayName: "", area: district, division: dInfo.division, addressApproximate: true };
}

async function main() {
  const sources = loadSources();
  console.log(`📡 direct crawl (${DRY_RUN ? "DRY RUN" : "LIVE"}) — ${sources.length} total sources, ${PER_RUN}/run.`);
  const batch = pickBatch(sources);
  console.log(`Processing ${batch.length} sources today.`);

  const report = { mode: DRY_RUN ? "dry_run" : "live", sources: batch, offersFound: 0, inserted: 0, skipped: 0, skipReasons: {} };
  let totalInserted = 0;
  let totalSkipped = 0;

  for (const src of batch) {
    await sleep(1000); // 1 request/second between sources
    const offers = await crawlSource(src);
    console.log(`   → ${src} — ${offers.length} offer(s)`);
    report.offersFound += offers.length;
    for (const o of offers) {
      const reason = invalidReason(o);
      if (reason) { report.skipReasons[reason] = (report.skipReasons[reason] || 0) + 1; totalSkipped += 1; continue; }
      const vtReason = resolveValidity(o);
      if (vtReason) { report.skipReasons[vtReason] = (report.skipReasons[vtReason] || 0) + 1; totalSkipped += 1; continue; }
      const loc = await resolveLocation(o);
      if (loc.skip) { report.skipReasons[loc.skip] = (report.skipReasons[loc.skip] || 0) + 1; totalSkipped += 1; continue; }

      // full URL for inserted image / source
      const sourceUrl = o.sourceUrl || src;
      const row = {
        title: String(o.title).trim(),
        shop_name: String(o.shopName).trim(),
        category: o.category,
        area: loc.area || o.area || (o.district || ""),
        division: o.division || loc.division || null,
        district: o.district || null,
        address: o.address || "",
        lat: loc.lat,
        lng: loc.lng,
        discount_text: String(o.discountText).trim(),
        description: o.description,
        valid_till: String(o.validTill).trim(),
        payment_method: o.paymentMethod || "Any",
        image: o.imageUrl || null,
        is_ongoing: o.isOngoing === true,
        is_featured: false,
        nationwide: loc.nationwide === true || o.nationwide === true,
        location_precision: loc.addressApproximate ? "district" : "exact",
        hot_score: Math.floor(Math.random() * 50) + 40,
        status: "approved",
        source: "scraper",
        source_url: sourceUrl || null,
        dedupe_key: buildDedupeKey(o.shopName, o.discountText, o.area, sourceUrl),
        worked_count: 0,
        not_worked_count: 0,
        created_at: nowISO(),
      };
      if (DRY_RUN) { totalInserted += 1; continue; }
      const { data, error } = await supabase.from("offers").upsert(row, { onConflict: "dedupe_key" }).select("id").single();
      if (error) { console.warn(`   ⚠️ upsert failed: ${error.message}`); totalSkipped += 1; continue; }
      // Branch/partner addresses become offer_outlets (BATCH H3).
      if (data?.id && Array.isArray(o.outlets) && o.outlets.length) {
        try {
          const { saved: savedOutlets } = await insertOutletsForOffer(supabase, data.id, o.outlets);
          if (savedOutlets) {
            await supabase.from("offers").update({ location_precision: "exact" }).eq("id", data.id);
          }
        } catch (e) { /* non-fatal */ }
      }
      totalInserted += 1;
    }
  }
  report.inserted = totalInserted;
  report.skipped = totalSkipped;

  // Save rotation state (only after a LIVE run marks the batch as done).
  if (!DRY_RUN) {
    let state = {};
    try { state = JSON.parse(readFileSync(STATE_FILE, "utf8")); } catch { /* none */ }
    if (state.day !== dayIdx()) state = { day: dayIdx(), offset: 0 };
    state.offset = (state.offset + PER_RUN) % Math.max(1, sources.length);
    writeFileSync(STATE_FILE, JSON.stringify(state));
  }
  const reportFile = join(tmpdir(), "crawl-direct-report.json");
  writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(`✅ Done. Found ${report.offersFound} · Inserted ${totalInserted} · Skipped ${totalSkipped} · ${JSON.stringify(report.skipReasons)}`);
  console.log(`Report: ${reportFile}`);
}

main().catch((e) => { console.error("crawl-direct failed:", e.message); process.exit(1); });