// Scrape script: Tavily web search -> Gemini offer extraction -> Nominatim
// geocoding -> Supabase upsert. Offers missing any required field (title,
// shop_name, discount_text, valid_till today-or-later, valid lat/lng) are
// SKIPPED. Valid offers are auto-published with status='approved'. Supports
// DRY_RUN and an auto-advancing query pool.
//
// Run: node scripts/scrape.js   (or SCRAPE_DRY_RUN=true node scripts/scrape.js)
// Env vars: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY, TAVILY_API_KEY,
//           GEMINI_API_KEY, SCRAPE_DRY_RUN
// Optional:  MAX_QUERIES_PER_RUN (default 30; 3 for a quick test),
//            MAX_PAGES_PER_RUN (default 60, Gemini free-tier cap),
//            SCRAPE_QUERY_START (manual pool-override), SCRAPE_RESULTS.

import { readFileSync, writeFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createClient } from "@supabase/supabase-js";
import { isInsideBangladesh, districtInfo } from "../lib/bd-locations.js";

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
const DRY_RUN = ["1", "true", "yes"].includes(
  String(process.env.DRY_RUN === undefined ? process.env.SCRAPE_DRY_RUN : process.env.DRY_RUN).toLowerCase()
);
const REPORT_FILE = join(tmpdir(), "scrape-report.json");
// Real runs default to 30 queries; MAX_QUERIES_PER_RUN=3 is a quick test.
const MAX_QUERIES_PER_RUN = Number(
  process.env.MAX_QUERIES_PER_RUN || process.env.SCRAPE_BATCH_SIZE || 30
);
const MAX_PAGES_PER_RUN = Number(process.env.MAX_PAGES_PER_RUN || 60);
const RESULTS_PER_QUERY = Number(process.env.SCRAPE_RESULTS || 5);
const GEMINI_DELAY_MS = Number(process.env.SCRAPE_GEMINI_DELAY_MS || 1100);
// Tavily depth: "basic" (1 credit/search) by default; only "advanced" (more
// credits) if TAVILY_DEPTH=advanced is set.
const TAVILY_DEPTH = process.env.TAVILY_DEPTH === "advanced" ? "advanced" : "basic";
// Each basic search = 1 credit. A monthly estimate warns when too high.
const TAVILY_CREDITS_PER_SEARCH = TAVILY_DEPTH === "advanced" ? 2 : 1;
const TAVILY_MONTHLY_BUDGET = Number(process.env.TAVILY_MONTHLY_BUDGET || 900);

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

// --- Query pool, built programmatically ---
// Categories with an English keyword and a Bengali keyword.
const CATEGORIES = [
  { en: "restaurant", bn: "রেস্টুরেন্ট" },
  { en: "fashion & clothing", bn: "ফ্যাশন পোশাক" },
  { en: "electronics", bn: "ইলেকট্রনিক্স" },
  { en: "salon & beauty", bn: "সেলুন বিউটি" },
  { en: "grocery", bn: "মুদি" },
  { en: "movies entertainment", bn: "সিনেমা বিনোদন" },
  { en: "travel & hotels", bn: "ভ্রমণ হোটেল" },
  { en: "mobile & gadgets", bn: "মোবাইল গ্যাজেট" },
  { en: "health & fitness", bn: "স্বাস্থ্য ফিটনেস" },
  { en: "education & courses", bn: "কোর্স শিক্ষা" },
  { en: "online shopping", bn: "অনলাইন কেনাকাটা" },
  { en: "bank card offers", bn: "ব্যাংক কার্ড অফার" },
  { en: "bkash nagad cashback", bn: "বিকাশ নগদ ক্যাশব্যাক" },
];

// Locations: Bangladesh-wide, the 8 divisions, and ~20 major districts/cities.
const LOCATIONS = [
  "Bangladesh", "Dhaka", "Chattogram", "Sylhet", "Khulna", "Rajshahi",
  "Rangpur", "Mymensingh", "Barishal", "Cox's Bazar", "Gazipur",
  "Narayanganj", "Cumilla", "Bogura", "Jashore", "Dinajpur", "Pabna",
  "Tangail", "Feni", "Narsingdi", "Savar", "Uttara", "Gulshan", "Banani",
  "Motijheel", "Mirpur", "Dhanmondi", "Kushtia", "Sirajganj", "Moulvibazar",
];

// A tiny deterministic PRNG so the shuffle is the same every run.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Build one query per category, with a mix of English and Bengali keywords.
function buildQueries() {
  const queries = [];
  for (let c = 0; c < CATEGORIES.length; c++) {
    const cat = CATEGORIES[c];
    for (let l = 0; l < LOCATIONS.length; l++) {
      const loc = LOCATIONS[l];
      // English: "<category> offer discount <location>"
      queries.push(`${cat.en} offer discount ${loc}`);
      // Bengali: "<category> অফার ছাড় <location>"
      queries.push(`${cat.bn} অফার ছাড় ${loc}`);
    }
  }
  // Shuffle once with a FIXED seed so order is stable across runs.
  const rand = mulberry32(20241107);
  for (let i = queries.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = queries[i];
    queries[i] = queries[j];
    queries[j] = tmp;
  }
  // De-duplicate (some English place names duplicate) and keep ordering.
  const seen = new Set();
  const uniq = [];
  for (const q of queries) {
    if (seen.has(q)) continue;
    seen.add(q);
    uniq.push(q);
  }
  return uniq;
}

const QUERY_ROTATION = buildQueries();

// Free-tier safety counters.
let tavilySearches = 0;
let geminiCalls = 0;
let geminiRateLimited = false;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

function addDays(iso, days) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Resolve the final valid_till from Gemini's validTill + ongoing + Tavily's
// published_date. Mutates o.validTill // o.isOngoing and returns a skip reason.
function resolveValidity(o, publishedDate) {
  // Default: not flagged until we invent a date.
  o.isOngoing = false;
  const raw = String(o.validTill || "").trim();
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    if (raw < todayDateStr()) return "expired"; // expired
    o.validTill = raw;
    return null;
  }
  // No usable explicit end date.
  const ongoing = o.ongoing === true;
  if (!ongoing) {
    return "no end date";
  }
  // ongoing, published within 30 days OR unknown date -> today + 21 days.
  if (publishedDate) {
    const publishedDay = String(publishedDate).slice(0, 10);
    const daysSince = Math.floor((Date.now() - new Date(publishedDay + "T00:00:00Z").getTime()) / 86400000);
    if (daysSince > 30) {
      return "no end date"; // ongoing but page is stale (older than 30 days)
    }
  }
  o.validTill = addDays(todayDateStr(), 21);
  o.isOngoing = true; // date was set by our rule, not a real page end date
  return null;
}

// Return a reason string if the offer is NOT publishable, else null.
function invalidOfferReason(o) {
  if (!o || !String(o.title || "").trim()) return "missing field";
  if (!String(o.shopName || "").trim()) return "missing field";
  if (!String(o.discountText || "").trim()) return "missing field";

  const lat = Number(o.lat);
  const lng = Number(o.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "missing field";
  if (!isInsideBangladesh(lat, lng)) return "lat/lng outside Bangladesh";

  const vt = String(o.validTill || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(vt)) return "no end date";
  if (vt < todayDateStr()) return "expired";

  return null;
}

async function tavilySearch(query) {
  tavilySearches += 1;
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TAVILY_API_KEY}`,
    },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,
      query,
      depth: TAVILY_DEPTH,
      start_url: "https://www.google.com/maps",
      include_answer: false,
      include_raw_content: false,
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
      published_date: r.published_date || "",
    }))
    .filter((r) => r.title && r.content);
}

async function geminiExtract(query, results) {
  if (geminiRateLimited || geminiCalls >= MAX_PAGES_PER_RUN) return [];

  geminiCalls += 1;
  // Small delay so calls stay inside the free tier limit.
  if (GEMINI_DELAY_MS > 0) await sleep(GEMINI_DELAY_MS);

  const prompt = `You are an offer intelligence agent for OfferMap BD, a platform listing deals and offers in Bangladesh.
Note: you must NEVER return coordinates (lat/lng). Location is resolved separately by our geocoder.
Today's date is ${todayDateStr()}.

Query: ${query}

Web results (each may include a published_date):
${JSON.stringify(results, null, 2)}

Extract at most 3 unique deals from these results. For each deal return a JSON object with ONLY these fields:
- title: short offer title
- shopName: business name
- category: one of Restaurant, Fashion & Clothing, Bank Card Offers, Electronics, Salon & Beauty, Grocery, Entertainment, Travel & Hotels, Mobile & Gadgets, Health, Education & Courses, Online Shopping, Mobile Wallet Cashback
- division: division name in Bangladesh if known, else empty string
- district: district name in Bangladesh if known, else empty string
- address: street/area address if known, else empty string
- discountText: e.g. "30% OFF", "Buy 1 Get 1 Free"
- description: one or two sentence description
- paymentMethod: Any or one of City Bank Card, bKash, Nagad, Rocket
- validTill: the offer END date as YYYY-MM-DD, or null (see rules below)
- ongoing: true if the page says the offer is ongoing / limited time / while stock lasts / "চলছে" / "চলমান" with no fixed end date; otherwise false
- bangladesh_offer: true ONLY if the offer is clearly for customers in Bangladesh — a Bangladeshi shop/brand/outlet, a Bangladeshi bank or wallet (bKash/Nagad/Rocket/City/DBBL...), a Bangladeshi website, or prices in BDT/৳/Tk. FALSE for foreign sites and global booking/travel/software/course platforms (e.g. Expedia, Hotwire, Coursera, Scrimba) or anything priced in $, £, € only or with US/UK-only terms.
- imageUrl: the best product/offer image url if available, else empty string
- sourceUrl: the source url

validTill rules (use today ${todayDateStr()} as the reference date):
- Convert Bengali dates and numerals (e.g. "৩০ নভেম্বর ২০২৬") and English formats ("30 Nov", "Nov 30, 2026") into YYYY-MM-DD. If the year is missing, pick the nearest upcoming match.
- Convert relative dates ("this Friday", "till end of month", "by Eid") into a concrete YYYY-MM-DD using today's date.
- If there is NO end date, set validTill to null.
- NEVER invent an end date. If the page supports an ongoing offer (no end date but "ongoing"/"limited time"/"while stock lasts"/"চলছে"/"চলমান"), set validTill null and ongoing true.
- If there is no end date and no ongoing sign, set validTill null and ongoing false.

Bangladesh rules:
- Set bangladesh_offer=true ONLY as described above. A generic article or listicle that is not one Bangladeshi shop's offer is NOT a valid offer.
- Discount sanity: a discount of more than 90% is suspicious — mark it invalid unless it is a clear "Buy 1 Get 1" / BOGO style. Return discountText as written, and we will sanity-check it.

Return ONLY valid JSON (no markdown) as an array of objects. If nothing usable is found, return [].

JSON response format:
[
  {
    "title": "...",
    "shopName": "...",
    "category": "...",
    "division": "...",
    "district": "...",
    "address": "...",
    "discountText": "...",
    "description": "...",
    "paymentMethod": "...",
    "validTill": "YYYY-MM-DD",
    "ongoing": false,
    "bangladesh_offer": true,
    "imageUrl": "...",
    "sourceUrl": "..."
  }
]`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${GEMINI_API_KEY}`,
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
    if (res.status === 429) {
      geminiRateLimited = true;
      console.warn(
        `⚠️ Gemini rate limit (429). Stopping Gemini calls this run; ${geminiCalls - 1} calls already made.`
      );
      return [];
    }
    throw new Error(`Gemini failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned || "[]");
  } catch (e) {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  // Gemini must never influence coordinates: drop any lat/lng key if present.
  for (const o of parsed) {
    if (o && typeof o === "object") {
      delete o.lat;
      delete o.lng;
      delete o.latitude;
      delete o.longitude;
    }
  }
  return parsed;
}

async function nominatimSearch(query) {
  // Strictly max 1 request/second, with a proper User-Agent.
  await sleep(1000);
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    countrycodes: "bd",
    limit: "5",
  });
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    { headers: { "User-Agent": "OfferMapBD/1.0 (contact@offermap-bd.example.com)" } }
  );
  if (!res.ok) return [];
  return res.json();
}

function firstInBounds(results) {
  for (const r of results) {
    const lat = Number(r.lat);
    const lng = Number(r.lon);
    if (Number.isFinite(lat) && Number.isFinite(lng) && isInsideBangladesh(lat, lng)) {
      return { lat, lng, displayName: r.display_name || "" };
    }
  }
  return null;
}

// Resolve an offer's coordinates WITHOUT trusting Gemini.
// Returns { lat, lng, displayName, area, addressApproximate, skip } or skip.
async function resolveLocation(o) {
  const district = String(o.district || "").trim();
  const address = String(o.address || "").trim();
  const shop = String(o.shopName || "").trim();

  // (a) Nominatim: "<shop_name>, <address>, <district>, Bangladesh"
  if (shop || address) {
    const parts = [shop, address, district, "Bangladesh"].filter(Boolean);
    const hit = firstInBounds(await nominatimSearch(parts.join(", ")));
    if (hit) return { ...hit, addressApproximate: false };
  }
  // (b) Nominatim: "<address>, <district>, Bangladesh"
  if (address) {
    const parts = [address, district, "Bangladesh"].filter(Boolean);
    const hit = firstInBounds(await nominatimSearch(parts.join(", ")));
    if (hit) return { ...hit, addressApproximate: false };
  }
  // Skip if district is unknown or not in /lib/bd-locations.js.
  const dInfo = district ? districtInfo(district) : null;
  if (!dInfo) {
    return { skip: "unknown district" };
  }
  // (c) Fallback to district center, flagged as approximate.
  return {
    lat: dInfo.lat,
    lng: dInfo.lng,
    displayName: "",
    area: district,
    division: dInfo.division,
    addressApproximate: true,
    districtBn: dInfo.bn,
  };
}

// Sanity checks for Bangladesh-only + believable discounts. Returns a skip
// reason or null.
function sanityCheckOffer(o) {
  // Must clearly be a Bangladesh offer.
  if (o.bangladesh_offer !== true) return "not Bangladesh";
  const discountText = String(o.discountText || "").toLowerCase();
  const m = discountText.match(/(\d+)\s*%/);
  const pct = m ? parseInt(m[1], 10) : 0;
  const isBogo = /buy 1 get 1|bogo|b1g1|get one free|2 for 1/i.test(discountText);
  if (pct > 90 && !isBogo) return "bad discount";
  // Skip generic articles / lists that aren't one shop's offer.
  const titleShop = `${o.title} ${o.shopName}`.toLowerCase();
  if (/(top \d+|best \d+|roundup|round-up|listicle|ultimate guide|checklist|n things|ways to|how to choose)/.test(titleShop)) {
    return "bad discount";
  }
  return null;
}

async function scrapeQuery(query) {
  if (geminiRateLimited || geminiCalls >= MAX_PAGES_PER_RUN) {
    return { offers: [], skipped: [], stopped: geminiRateLimited ? "rate_limited" : "budget_exhausted" };
  }
  const results = await tavilySearch(query);
  const rawOffers = await geminiExtract(query, results);
  const publishedByUrl = {};
  for (const r of results) {
    if (r.url && r.published_date) publishedByUrl[r.url] = r.published_date;
  }
  const offers = [];
  const skipped = [];

  for (const o of rawOffers) {
    const loc = await resolveLocation(o);
    if (loc.skip) {
      skipped.push({
        title: o.title,
        shopName: o.shopName,
        url: o.sourceUrl,
        rawValidTill: o.validTill,
        ongoing: o.ongoing === true,
        reason: loc.skip,
      });
      continue;
    }
    // Bangladesh-only + discount sanity checks.
    const sanitySkip = sanityCheckOffer(o);
    if (sanitySkip) {
      skipped.push({
        title: o.title,
        shopName: o.shopName,
        url: o.sourceUrl,
        rawValidTill: o.validTill,
        ongoing: o.ongoing === true,
        reason: sanitySkip,
      });
      continue;
    }
    // Resolve validity BEFORE we mutate validTill, so we can report raw values.
    const publishedDate = publishedByUrl[o.sourceUrl] || "";
    const validitySkip = resolveValidity(o, publishedDate);
    if (validitySkip) {
      skipped.push({
        title: o.title,
        shopName: o.shopName,
        url: o.sourceUrl,
        rawValidTill: o.validTill,
        ongoing: o.ongoing === true,
        reason: validitySkip,
      });
      continue;
    }
    // Address text; mark approximate when we fell back to the district center.
    let addressText = String(o.address || loc.displayName || "").trim();
    if (loc.addressApproximate) {
      if (addressText) addressText += " ";
      addressText += "(approximate location)";
    }
    offers.push({
      ...o,
      lat: loc.lat,
      lng: loc.lng,
      area: loc.area || o.district || loc.displayName || o.division || "",
      division: o.division || loc.division || "",
      district: o.district || "",
      address: addressText,
      displayName: loc.displayName || "",
      addressApproximate: loc.addressApproximate,
      sourceUrl: o.sourceUrl || "",
      source: "scraper",
    });
  }
  return { offers, skipped, stopped: null };
}

async function urlIsProcessed(sourceUrl) {
  if (!sourceUrl) return false;
  const { data, error } = await supabase
    .from("scrape_log")
    .select("id")
    .eq("url", sourceUrl)
    .maybeSingle();
  if (error) return false;
  return Boolean(data);
}

async function logProcessedUrl(sourceUrl) {
  if (!sourceUrl) return;
  await supabase
    .from("scrape_log")
    .upsert(
      {
        url: sourceUrl,
        scraped_at: nowISO(),
      },
      { onConflict: "url" }
    );
}

async function upsertOffers(offersToInsert) {
  const results = [];
  const skipped = [];
  let exact = 0;
  let districtCenter = 0;

  for (const o of offersToInsert) {
    const reason = invalidOfferReason(o);
    if (reason) {
      skipped.push({
        title: o.title,
        shopName: o.shopName,
        url: o.sourceUrl,
        rawValidTill: o.validTill,
        ongoing: o.ongoing === true,
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
        rawValidTill: o.validTill,
        ongoing: o.ongoing === true,
        reason: "duplicate",
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
      address: o.address || "",
      lat: Number(o.lat),
      lng: Number(o.lng),
      discount_text: String(o.discountText).trim(),
      description: o.description,
      valid_till: String(o.validTill).trim(),
      payment_method: o.paymentMethod,
      image: o.imageUrl || null,
      is_ongoing: o.isOngoing === true,
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
      if (o.addressApproximate) districtCenter += 1;
      else exact += 1;
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
    await logProcessedUrl(o.sourceUrl);
    if (o.addressApproximate) districtCenter += 1;
    else exact += 1;
    results.push({ ...row, id: data?.id, status: "inserted" });
  }

  return { results, skipped, exact, districtCenter };
}

async function main() {
  console.log(
    `🚀 Scrape run started (mode: ${DRY_RUN ? "DRY RUN (nothing is saved)" : "LIVE"}, queries: ${MAX_QUERIES_PER_RUN})`
  );

  // Auto-advance the query pool daily, with no DB table and no required env.
  const dayNumber = Math.floor(Date.now() / 86400000);
  const poolLength = QUERY_ROTATION.length;
  const autoStart = (dayNumber * MAX_QUERIES_PER_RUN) % poolLength;
  const poolStart = process.env.SCRAPE_QUERY_START !== undefined
    ? Number(process.env.SCRAPE_QUERY_START)
    : autoStart;
  const rotationDays = Math.ceil(poolLength / MAX_QUERIES_PER_RUN);

  // Take MAX_QUERIES_PER_RUN queries from poolStart, wrapping around the end.
  const queries = [];
  for (let i = 0; i < MAX_QUERIES_PER_RUN; i++) {
    queries.push(QUERY_ROTATION[(poolStart + i) % poolLength]);
  }

  const report = {
    startedAt: nowISO(),
    mode: DRY_RUN ? "dry_run" : "live",
    rotation: {
      poolTotal: poolLength,
      todayPoolStart: poolStart,
      queriesPerRun: MAX_QUERIES_PER_RUN,
      daysPerFullRotation: rotationDays,
    },
    runStats: {
      queriesRun: 0,
      tavilySearches: 0,
      geminiCalls: 0,
      geminiRateLimited: false,
      tavily: {
        depth: TAVILY_DEPTH,
        creditsPerSearch: TAVILY_CREDITS_PER_SEARCH,
        creditsUsedThisRun: 0,
        monthlyBudget: TAVILY_MONTHLY_BUDGET,
        monthlyEstimate: 0,
        overBudget: false,
      },
    },
    location: {
      offersFound: 0,
      offersInserted: 0,
      skipped: 0,
      skipReasons: { "no end date": 0, expired: 0, "unknown district": 0, "missing field": 0, duplicate: 0, "not Bangladesh": 0, "bad discount": 0 },
      exactLocation: 0,
      districtCenter: 0,
    },
    queriesRun: [],
    inserted: [],
    skipped: [],
    failed: [],
    errors: [],
    completedAt: nowISO(),
  };

  console.log(
    `🧮 Query pool: ${poolLength} total · today's start: ${poolStart} · full rotation: ${rotationDays} day(s), ${MAX_QUERIES_PER_RUN} per run`
  );

  for (const q of queries) {
    if (geminiRateLimited || geminiCalls >= MAX_PAGES_PER_RUN) {
      console.warn(
        `⏹ Stopping early: Gemini budget/rate-limit reached (${geminiCalls}/${MAX_PAGES_PER_RUN} calls).`
      );
      break;
    }
    console.log(`🔎 Query: ${q}`);
    try {
      const { offers, skipped, stopped } = await scrapeQuery(q);
      const { results, skipped: skipped2, exact, districtCenter } = await upsertOffers(offers);
      const ok = results.filter((r) => r.status === "inserted");
      const dry = results.filter((r) => r.status === "dry_run");

      report.queriesRun.push({
        query: q,
        offersFound: offers.length,
        skipped: skipped.length + skipped2.length,
      });
      report.location.offersFound += offers.length;

      // Location/validity skips (unknown district / no end date / expired).
      for (const s of skipped) {
        report.skipped.push(s);
        report.location.skipped += 1;
        const bucket = s.reason in report.location.skipReasons ? s.reason : "missing field";
        report.location.skipReasons[bucket] += 1;
      }
      // Validation / duplicate skips from upsert.
      for (const s of skipped2) {
        report.skipped.push(s);
        report.location.skipped += 1;
        const bucket = s.reason in report.location.skipReasons ? s.reason : "missing field";
        report.location.skipReasons[bucket] += 1;
      }

      // Count offers that made it through (inserted or would-insert in dry run).
      const toInsert = ok.length ? ok : dry;
      report.location.offersInserted += toInsert.length;
      report.location.exactLocation += exact;
      report.location.districtCenter += districtCenter;

      if (ok.length) report.inserted.push(...ok);
      if (dry.length) report.inserted.push(...dry);
      console.log(`   → ${ok.length ? ok.length + " auto-published" : "0 published"} (${offers.length} found, ${skipped.length + skipped2.length} skipped)`);
      if (stopped) {
        console.warn(`⏹ Query pool stopped (${stopped}).`);
        break;
      }
    } catch (err) {
      console.error(`❌ Query failed: ${q}`, err.message);
      report.failed.push({ query: q, error: err.message });
      report.errors.push({ query: q, error: err.message });
    }
  }

  report.runStats.queriesRun = report.queriesRun.length;
  report.runStats.tavilySearches = tavilySearches;
  report.runStats.geminiCalls = geminiCalls;
  report.runStats.geminiRateLimited = geminiRateLimited;

  // Tavily cost estimate: this run's credits + a rough 30-day projection.
  const creditsThisRun = tavilySearches * TAVILY_CREDITS_PER_SEARCH;
  const monthlyEstimate = MAX_QUERIES_PER_RUN * 30 * TAVILY_CREDITS_PER_SEARCH;
  const overBudget = monthlyEstimate > TAVILY_MONTHLY_BUDGET;
  report.runStats.tavily.creditsUsedThisRun = creditsThisRun;
  report.runStats.tavily.monthlyEstimate = monthlyEstimate;
  report.runStats.tavily.overBudget = overBudget;
  if (overBudget) {
    console.warn(
      `⚠️ Tavily budget warning: ~${creditsThisRun} credits this run; rough 30-day estimate ${monthlyEstimate} credits is ABOVE your budget of ${TAVILY_MONTHLY_BUDGET} (depth=${TAVILY_DEPTH}, ${TAVILY_CREDITS_PER_SEARCH} cr/search). Lower MAX_QUERIES_PER_RUN or use basic depth.`
    );
  }

  writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));

  // Print the first 5 offers (dry-run "would-inserted" ones) to the console.
  console.log("👇 First 5 offers:");
  const firstFive = report.inserted.slice(0, 5);
  if (!firstFive.length) {
    console.log("   (none)");
  }
  for (const o of firstFive) {
    console.log(
      `   - ${o.title} · ${o.shop_name || o.shopName} · ${o.discount_text || o.discountText} · ` +
      `${o.district || ""} · ${o.valid_till || o.validTill} · ${o.lat}, ${o.lng}`
    );
  }

  // Print up to 5 SKIPPED offers so you can see why they were skipped.
  console.log("⏭ Up to 5 skipped offers:");
  const skippedFive = report.skipped.slice(0, 5);
  if (!skippedFive.length) {
    console.log("   (none)");
  }
  for (const s of skippedFive) {
    console.log(
      `   - ${s.title || "(no title)"} · ${s.shopName || ""} · rawValidTill=${s.rawValidTill ?? "-"} · ongoing=${s.ongoing ? "true" : "false"} · reason=${s.reason}`
    );
  }

  const sums = report.location.skipReasons;
  console.log("🗂 Skip reasons:", Object.keys(sums).map((k) => `${k}=${sums[k]}`).join(", "));
  console.log(`✅ Report written to ${REPORT_FILE}`);
  console.log(
    `✅ Done. Found: ${report.location.offersFound} · Inserted: ${report.location.offersInserted} · Skipped: ${report.location.skipped} · Tavily: ${tavilySearches} (${creditsThisRun} cr) · Gemini: ${geminiCalls} · Exact: ${report.location.exactLocation} · District-center: ${report.location.districtCenter}`
  );
}

main().catch((e) => {
  console.error("❌ Scrape failed:", e);
  process.exit(1);
});
