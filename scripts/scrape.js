// Scrape script: Tavily web search -> Gemini offer extraction -> Nominatim
// geocoding -> Supabase upsert. Offers missing any required field (title,
// shop_name, discount_text, valid_till today-or-later, valid lat/lng) are
// SKIPPED. Valid offers are auto-published with status='approved'. Supports
// DRY_RUN and query rotation with a stable report.
//
// Run: node scripts/scrape.js   (or SCRAPE_DRY_RUN=true node scripts/scrape.js)
// Env vars: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY, TAVILY_API_KEY,
//           GEMINI_API_KEY, SCRAPE_DRY_RUN.

import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createClient } from "@supabase/supabase-js";
import { isInsideBangladesh } from "../lib/bd-locations.js";

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
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const DRY_RUN = process.env.SCRAPE_DRY_RUN === "true";
const REPORT_FILE = "/tmp/scrape-report.json";
const BATCH_SIZE = Number(process.env.SCRAPE_BATCH_SIZE || 3);
const RESULTS_PER_QUERY = Number(process.env.SCRAPE_RESULTS || 5);

if (!url || !serviceKey) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
if (!TAVILY_API_KEY) {
  console.error("❌ Missing TAVILY_API_KEY in .env.local");
  process.exit(1);
}
if (!GEMINI_API_KEY) {
  console.error("❌ Missing GEMINI_API_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Stable query rotation pool. Round-robin per run.
const QUERY_ROTATION = [
  "best restaurant deals dhaka bangladesh",
  "dhaka fashion discount coupons bangladesh",
  "buy one get one free dhaka",
  "bangladesh bank card cash back offers",
  "dhaka electronics discount sale bangladesh",
  "dhaka salon beauty discount coupon",
  "dhaka grocery store savings bangladesh",
  "dhaka travel hotel offers bangladesh",
];

function nowISO() {
  return new Date().toISOString();
}

function buildDedupeKey(shopName, discountText, area, sourceUrl) {
  const source = sourceUrl ? sourceUrl.toString().trim().toLowerCase() : "";
  const discount = (discountText || "").toString().trim().toLowerCase();
  const shop = (shopName || "").toString().trim().toLowerCase();
  const areaName = (area || "").toString().trim().toLowerCase();
  return `ombd-${shop}-${discount}-${areaName}-${source}`.slice(0, 200);
}

const todayDateStr = () => new Date().toISOString().slice(0, 10);

// Return a reason string if the offer is NOT publishable, else null.
function invalidOfferReason(o) {
  if (!o || !String(o.title || "").trim()) return "missing title";
  if (!String(o.shopName || "").trim()) return "missing shop_name";
  if (!String(o.discountText || "").trim()) return "missing discount_text";

  const lat = Number(o.lat);
  const lng = Number(o.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "invalid lat/lng";
  if (!isInsideBangladesh(lat, lng)) return "lat/lng outside Bangladesh";

  const vt = String(o.validTill || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(vt)) return "missing valid_till";
  if (vt < todayDateStr()) return "expired valid_till";

  return null;
}

async function tavilySearch(query) {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TAVILY_API_KEY}`,
    },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,
      query,
      depth: 2,
      start_url: "https://www.google.com/maps",
      include_answer: false,
      max_results: RESULTS_PER_QUERY,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Tavily failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const results = data.results || [];
  return results
    .map((r) => ({
      url: r.url,
      title: r.title || "",
      content: r.content || "",
    }))
    .filter((r) => r.title && r.content);
}

async function geminiExtract(query, results) {
  const prompt = `You are an offer intelligence agent for OfferMap BD, a platform listing deals and offers in Bangladesh (especially Dhaka).

Query: ${query}

Web results:
${JSON.stringify(results, null, 2)}

Extract at most 3 unique deals from these results. For each deal return a JSON object with:
- title: short offer title
- shopName: business name
- discountText: e.g. "30% OFF", "Buy 1 Get 1 Free"
- category: one of Restaurant, Fashion & Clothing, Bank Card Offers, Electronics, Salon & Beauty, Grocery, Entertainment, Travel & Hotels, Mobile & Gadgets, Health, Education & Courses, Online Shopping, Mobile Wallet Cashback
- area: a short area/neighbourhood in Bangladesh if known, else ""
- description: one or two sentence description
- paymentMethod: Any or one of City Bank Card, bKash, Nagad, Rocket
- validTill: an ISO date string (YYYY-MM-DD) in the future, or null
- sourceUrl: the source url

Return ONLY valid JSON (no markdown) as an array of objects. If nothing usable is found, return [].

JSON response format:
[
  {
    "title": "...",
    "shopName": "...",
    "discountText": "...",
    "category": "...",
    "area": "...",
    "description": "...",
    "paymentMethod": "...",
    "validTill": "...",
    "sourceUrl": "..."
  }
]`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
      }),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(cleaned || "[]");
  return Array.isArray(parsed) ? parsed : [];
}

async function nominatimReverse(lat, lng) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18`,
    { headers: { "User-Agent": "OfferMapBD/1.0 (contact@offermap-bd.example.com)" } }
  );
  if (!res.ok) return null;
  return res.json();
}

async function scrapeQuery(query) {
  const results = await tavilySearch(query);
  const rawOffers = await geminiExtract(query, results);
  const offers = [];

  for (const o of rawOffers) {
    const lat = parseFloat(o.lat);
    const lng = parseFloat(o.lng);
    let finalArea = o.area || "";
    let finalDisplayName = "";
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      const geo = await nominatimReverse(lat, lng);
      finalDisplayName = geo?.display_name || "";
      finalArea = finalDisplayName.split(",").pop()?.trim() || o.area || "";
    }
    offers.push({
      ...o,
      lat: Number.isNaN(lat) ? null : lat,
      lng: Number.isNaN(lng) ? null : lng,
      area: finalArea,
      sourceUrl: o.sourceUrl || "",
      source: "scraper",
      displayName: finalDisplayName,
    });
  }
  return offers;
}

async function urlIsProcessed(sourceUrl) {
  if (!sourceUrl) return false;
  const { data, error } = await supabase
    .from("scrape_log")
    .select("id")
    .eq("source_url", sourceUrl)
    .maybeSingle();
  if (error) return false;
  return Boolean(data);
}

async function logProcessedUrl(sourceUrl, offerId, success) {
  if (!sourceUrl) return;
  await supabase
    .from("scrape_log")
    .upsert(
      {
        source_url: sourceUrl,
        offer_id: offerId || null,
        processed_at: nowISO(),
        success,
      },
      { onConflict: "source_url" }
    )
    .select("id")
    .maybeSingle();
}

async function upsertOffers(offersToInsert) {
  const results = [];
  const skipped = [];

  for (const o of offersToInsert) {
    const reason = invalidOfferReason(o);
    if (reason) {
      skipped.push({
        title: o.title,
        shopName: o.shopName,
        url: o.sourceUrl,
        reason,
      });
      console.log(`   ⏭ skipped: ${o.title || "(no title)"} — ${reason}`);
      continue;
    }

    if (await urlIsProcessed(o.sourceUrl)) {
      skipped.push({
        title: o.title,
        shopName: o.shopName,
        url: o.sourceUrl,
        reason: "already processed (scrape_log)",
      });
      console.log(`   ⏭ skipped: ${o.title} — URL already processed`);
      continue;
    }

    const row = {
      title: String(o.title).trim(),
      shop_name: String(o.shopName).trim(),
      category: o.category,
      area: o.area,
      division: o.division || "",
      district: o.district || "",
      address: o.displayName || o.area || "",
      lat: Number(o.lat),
      lng: Number(o.lng),
      discount_text: String(o.discountText).trim(),
      description: o.description,
      valid_till: String(o.validTill).trim(),
      payment_method: o.paymentMethod,
      image: null,
      is_featured: false,
      hot_score: Math.floor(Math.random() * 50) + 40,
      status: "approved",
      source: o.source || "scraper",
      source_url: o.sourceUrl || null,
      dedupe_key: buildDedupeKey(o.shopName, o.discountText, o.area, o.sourceUrl),
      worked_count: 0,
      not_worked_count: 0,
      created_at: nowISO(),
    };

    if (DRY_RUN) {
      results.push({ ...row, status: "dry_run" });
      continue;
    }

    const { data, error } = await supabase
      .from("offers")
      .upsert(row, { onConflict: "dedupe_key" })
      .select("id, title, dedupe_key")
      .single();
    if (error) {
      throw new Error(`Upsert failed: ${error.message}`);
    }
    await logProcessedUrl(o.sourceUrl, data?.id, true);
    results.push({ ...row, id: data?.id, status: "inserted" });
  }

  return { results, skipped };
}

async function main() {
  console.log(
    `🚀 Scrape run started (mode: ${DRY_RUN ? "DRY_RUN" : "LIVE"}, batch: ${BATCH_SIZE})`
  );

  const report = {
    startedAt: nowISO(),
    mode: DRY_RUN ? "dry_run" : "live",
    queriesRun: [],
    inserted: [],
    skipped: [],
    failed: [],
    errors: [],
    completedAt: nowISO(),
  };

  const poolStart = Number(process.env.SCRAPE_QUERY_START || 0);
  const queries = QUERY_ROTATION.slice(
    poolStart,
    poolStart + BATCH_SIZE
  );

  for (const q of queries) {
    console.log(`🔎 Query: ${q}`);
    try {
      const offers = await scrapeQuery(q);
      const { results, skipped } = await upsertOffers(offers);
      const ok = results.filter((r) => r.status === "inserted");
      const dry = results.filter((r) => r.status === "dry_run");
      report.queriesRun.push({ query: q, offersFound: offers.length, skipped: skipped.length });
      if (skipped.length) report.skipped.push(...skipped);
      if (ok.length) report.inserted.push(...ok);
      if (dry.length) report.inserted.push(...dry);
      console.log(`   → ${ok.length ? ok.length + " auto-published" : "0 published"} (${offers.length} found, ${skipped.length} skipped)`);
    } catch (err) {
      console.error(`❌ Query failed: ${q}`, err.message);
      report.failed.push({ query: q, error: err.message });
      report.errors.push({ query: q, error: err.message });
    }
  }

  writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
  console.log(`✅ Report written to ${REPORT_FILE}`);
  console.log(
    `✅ Done. Auto-published: ${report.inserted.length}, Skipped: ${report.skipped.length}, Failed: ${report.failed.length}`
  );
}

main().catch((e) => {
  console.error("❌ Scrape failed:", e);
  process.exit(1);
});
