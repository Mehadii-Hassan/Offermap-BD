// expand-outlets-pages.js — BATCH H fallback (step 4): for eligible chain
// brands that still have no outlets, find the brand's own "outlets / branches /
// store locator" page via one Tavily search, fetch it directly, extract branch
// names + addresses with Gemini, geocode each with Nominatim (Bangladesh only),
// and save them as offer_outlets with source 'brand-page'.
//
// Caps: max 15 brands/run, max 30 Gemini calls/run, Nominatim 1 req/s.
// On a 429 the affected API is stopped for the rest of the run.
//
// Run: node scripts/expand-outlets-pages.js

import { readFileSync, writeFileSync, existsSync } from "fs";
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
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const DRY_RUN = ["1", "true", "yes"].includes(String(process.env.DRY_RUN || "").toLowerCase());
const MAX_BRANDS = Number(process.env.MAX_BRANDS || 15);
const MAX_GEMINI = Number(process.env.MAX_GEMINI_CALLS || 30);

if (!url || !serviceKey || !TAVILY_API_KEY || !GEMINI_API_KEY) {
  console.error("Missing env (SUPABASE_URL/SERVICE_ROLE/TAVILY_API_KEY/GEMINI_API_KEY)");
  process.exit(1);
}
const sb = createClient(url, serviceKey, { auth: { persistSession: false } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CACHE_FILE = join(__dirname, "..", ".outlet-pages.json");

const BRAND_SUFFIXES = ["restaurant", "outlet", "branch", "store", "shop", "kitchen",
  "express", "cafe", "bank", "fast food", "fine dining", "and", "the",
  "bangladesh", "bangla", "bd", "plc", "ltd", "limited", "co", "corp", "group"];
function norm(s) {
  return String(s || "").toLowerCase().replace(/\./g, "")
    .replace(/[\u00b7\u2022]/g, " ").replace(/[&]\s?/g, " and ")
    .replace(/\s+/g, " ").trim();
}
function brandKey(shopName) {
  let b = norm(shopName);
  let changed = true;
  while (changed) {
    changed = false;
    for (const suf of BRAND_SUFFIXES) {
      const re = new RegExp(`[,\\s]+${suf}[,\\s]*$`);
      if (re.test(b)) { b = b.replace(re, ""); changed = true; break; }
    }
  }
  return b;
}
function loadCache() { try { return JSON.parse(readFileSync(CACHE_FILE, "utf8")); } catch { return { brands: {} }; } }
function saveCache(c) { writeFileSync(CACHE_FILE, JSON.stringify(c, null, 2), "utf8"); }
const today = new Date().toISOString().slice(0, 10);

// --- one Tavily search per brand (basic depth) ---
let tavilyLimited = false;
async function sureSearch(brand) {
  if (tavilyLimited) return [];
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${TAVILY_API_KEY}` },
      body: JSON.stringify({ api_key: TAVILY_API_KEY, query: `${brand} outlets branches store locator Bangladesh`, depth: "basic", max_results: 5, include_raw_content: false }),
    });
    if (res.status === 429) { tavilyLimited = true; console.warn("⚠️ Tavily 429 — stopping Tavily this run."); return []; }
    if (!res.ok) return [];
    const d = await res.json();
    return (d.results || []).map((r) => ({ url: r.url, title: r.title || "", content: r.content || "" })).filter((r) => r.url);
  } catch { return []; }
}

// --- direct page fetch (respect robots, UA, timeout) ---
async function robotsAllows(u) {
  try {
    const base = `${u.protocol}//${u.host}`;
    const res = await fetch(`${base}/robots.txt`, { headers: { "User-Agent": "OfferMapBD/1.0 (offer crawler; mailto:contact@offermap-bd.example.com)" }, signal: AbortSignal.timeout(8000) });
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
async function fetchPage(uri) {
  if (!/^https:\/\//i.test(uri)) return null;
  try { if (!(await robotsAllows(new URL(uri)))) return null; } catch { return null; }
  try {
    const res = await fetch(uri, { headers: { "User-Agent": "OfferMapBD/1.0 (offer crawler; mailto:contact@offermap-bd.example.com)", Accept: "text/html,*/*;q=0.8" }, signal: AbortSignal.timeout(10000), redirect: "follow" });
    if (!res.ok) return null;
    const txt = await res.text();
    return txt.length > 1_000_000 ? txt.slice(0, 1_000_000) : txt;
  } catch { return null; }
}
function chunkText(t, n = 150000) { const out = []; for (let i = 0; i < t.length; i += n) out.push(t.slice(i, i + n)); return out; }

// --- Gemini extraction (max MAX_GEMINI calls total) ---
let geminiCalls = 0;
let geminiLimited = false;
async function geminiExtractOutlets(brand, url, html) {
  if (geminiLimited || geminiCalls >= MAX_GEMINI) return [];
  geminiCalls += 1;
  const chunks = chunkText(html);
  const all = [];
  for (const chunk of chunks) {
    if (geminiCalls >= MAX_GEMINI) break;
    const prompt = `You are extracting Bangladeshi retail outlet/branch locations for the brand "${brand}". Today is ${today}.
Page URL: ${url}
Page content:
${chunk}
Return a JSON array of branch locations for "${brand}". For each: {"name": branch/shop name, "address": branch address (street, area, city) in Bangladesh}. If the page lists no branches or is unrelated, return []. Only real Bangladesh addresses. Return ONLY valid JSON.`;
    geminiCalls += 1;
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${GEMINI_API_KEY}`,
      { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 4096 } }) }
    );
    if (res.status === 429) { geminiLimited = true; console.warn("⚠️ Gemini 429 — stopping Gemini this run."); return all; }
    if (!res.ok) continue;
    const d = await res.json();
    const text = d.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    try {
      const arr = JSON.parse(cleaned || "[]");
      if (Array.isArray(arr)) for (const o of arr) if (o && o.address) all.push({ name: String(o.name || brand), address: String(o.address) });
    } catch { /* ignore */ }
    if (chunks.length > 1) await sleep(1100);
  }
  return all;
}

// --- Nominatim geocode (BD only, 1 req/s) ---
let lastNom = 0;
async function geocodeAddr(address) {
  const wait = Math.max(0, 1050 - (Date.now() - lastNom));
  if (wait > 0) await sleep(wait);
  lastNom = Date.now();
  const params = new URLSearchParams({ q: `${address}, Bangladesh`, format: "jsonv2", countrycodes: "bd", limit: "3" });
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { "User-Agent": "OfferMapBD/1.0 (offer crawler; mailto:contact@offermap-bd.example.com)" } });
    if (res.status === 429) return "limited";
    if (!res.ok) return null;
    for (const r of await res.json()) {
      const lat = Number(r.lat), lng = Number(r.lon);
      if (Number.isFinite(lat) && Number.isFinite(lng) && isInsideBangladesh(lat, lng)) {
        const a = r.address || {};
        return { lat, lng, address: String(r.display_name || address), area: a.suburb || a.neighbourhood || a.city_district || a.town || a.city || "" };
      }
    }
    return null;
  } catch { return null; }
}

async function main() {
  const { data } = await sb.from("offers").select("id, shop_name, district, nationwide, status, valid_till, is_ongoing").eq("status", "approved");
  const live = (data || []).filter((o) => o.is_ongoing || !o.valid_till || o.valid_till >= today);
  const distByBrand = {};
  for (const o of live) { const k = brandKey(o.shop_name); if (k) { distByBrand[k] = distByBrand[k] || new Set(); if (o.district) distByBrand[k].add(o.district); if (o.nationwide) distByBrand[k].add("*"); } }
  const brandOffers = {};
  let generic = 0;
  for (const o of live) {
    const k = brandKey(o.shop_name);
    if (!k) continue;
    const chain = o.nationwide === true || (distByBrand[k] && distByBrand[k].size >= 2);
    if (!chain) continue;
    if (k.length < 3) continue;
    brandOffers[k] = brandOffers[k] || [];
    brandOffers[k].push(o.id);
  }
  // Prefer real, recognisable chain brands for this fallback run.
  const PREFERRED = ["kfc", "pizza hut", "aarong", "bata", "pran", "shwapno", "meena bazar",
    "grameenphone", "robi", "banglalink", "dhaka bank", "brac bank", "domino", "burger king", "starbucks"];
  const keys = Object.keys(brandOffers);
  const ordered = [...PREFERRED.filter((p) => keys.includes(p)), ...keys.filter((k) => !PREFERRED.includes(k))].slice(0, MAX_BRANDS);

  const cache = loadCache();
  console.log(`Fallback pages: ${ordered.length} brand(s), caps: MAX_BRANDS=${MAX_BRANDS}, MAX_GEMINI=${MAX_GEMINI}`);
  let brandsMatched = 0, saved = 0, failed = 0;
  for (const brand of ordered) {
    if (cache.brands[brand] && cache.brands[brand].done) { console.log(`  skip (done): ${brand}`); continue; }
    console.log(`\n${brand}: Tavily search…`);
    const results = await sureSearch(brand);
    if (tavilyLimited) break;
    let pageUrl = null;
    for (const r of results) {
      const h = String(r.title + " " + r.content).toLowerCase();
      const host = (() => { try { return new URL(r.url).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; } })();
      if (host.includes("facebook.com") || host.includes("youtube.com")) continue;
      if (/outlet|branch|store.locator|our.store|find.us|locat/i.test(h)) { pageUrl = r.url; break; }
    }
    if (!pageUrl) { console.log(`  no outlet page found`); cache.brands[brand] = { done: true, outlets: 0 }; if (!DRY_RUN) saveCache(cache); await sleep(3000); continue; }
    console.log(`  fetching ${pageUrl}`);
    const html = await fetchPage(pageUrl);
    if (!html) { console.log(`  fetch failed`); cache.brands[brand] = { done: true, outlets: 0 }; if (!DRY_RUN) saveCache(cache); await sleep(3000); continue; }
    const branches = await geminiExtractOutlets(brand, pageUrl, html);
    if (geminiLimited) break;
    console.log(`  branches found: ${branches.length}`);
    if (!branches.length) { cache.brands[brand] = { done: true, outlets: 0 }; if (!DRY_RUN) saveCache(cache); continue; }
    let brandSaved = 0, brandFailed = 0;
    for (const offerId of brandOffers[brand]) {
      if (DRY_RUN) continue;
      for (const b of branches.slice(0, 300)) {
        const geo = await geocodeAddr(b.address);
        if (geo === "limited") { console.warn("⚠️ Nominatim 429 — stopping Nominatim this run."); return; }
        if (!geo) { brandFailed++; continue; }
        const { error } = await sb.from("offer_outlets").insert({ offer_id: offerId, name: b.name || brand, lat: geo.lat, lng: geo.lng, address: geo.address, area: geo.area || null, source: "brand-page" });
        if (error) brandFailed++; else { brandSaved++; if (brandSaved >= 300) break; }
      }
    }
brandsMatched += 1; saved += brandSaved; failed += brandFailed;
    console.log(`  ✓ ${brand}: ${branches.length} branches, saved ${brandSaved} (failed ${brandFailed})`);
    // Only mark done if outlets were actually saved; otherwise leave undone so
    // the next (resumable) run can retry (e.g. if geocoding failed transiently).
    if (brandSaved > 0) { cache.brands[brand] = { done: true, outlets: brandSaved }; if (!DRY_RUN) saveCache(cache); }
    await sleep(3000);
  }
  console.log(`\nDONE. Brands matched: ${brandsMatched}, outlets saved: ${saved}, failed: ${failed}, geminiCalls: ${geminiCalls}`);
}
main().catch((e) => { console.error("fallback failed:", e.message); process.exit(1); });


