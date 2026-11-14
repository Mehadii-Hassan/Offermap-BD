// Backfill-images script: for existing offers with no image, try to find one
// from the source page (og:image then twitter:image), validate it, and save it.
//
// - Only processes offers that have a source_url and an empty image.
// - At most 100 per run, ~1 request/second (polite).
// - Validated images must be https, return image/*, and not be a logo/favicon.
//
// Run: node scripts/backfill-images.js

import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createClient } from "@supabase/supabase-js";

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

if (!url || !serviceKey) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const USER_AGENT = "OfferMapBD/1.0 (offer scraper; mailto:contact@offermap-bd.example.com)";
const MAX = 100;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function isValid(u) {
  if (!/^https:\/\//i.test(u)) return false;
  const low = u.toLowerCase();
  return !(low.includes("logo") || low.includes("favicon"));
}

function resolveRelative(u, base) {
  try {
    return new URL(u, base).href;
  } catch {
    return "";
  }
}

function metaImageFromHtml(html, base) {
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  const tw = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
  const raw = (og && og[1]) || (tw && tw[1]) || "";
  if (!raw) return "";
  const out = resolveRelative(raw, base);
  return isValid(out) ? out : "";
}

async function fetchHtml(src) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(src, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
      signal: ctrl.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") || "").toLowerCase();
    if (!type.includes("text/html") && !type.includes("application/xhtml")) return null;
    const text = await res.text();
    return text.length > 1_000_000 ? text.slice(0, 1_000_000) : text;
  } catch {
    return null;
  }
}

async function validateImage(u) {
  try {
    const res = await fetch(u, { method: "GET", headers: { "User-Agent": USER_AGENT }, redirect: "follow" });
    if (!res.ok) return false;
    const type = (res.headers.get("content-type") || "").toLowerCase();
    if (!type.startsWith("image/")) return false;
    const len = res.headers.get("content-length");
    if (len && Number(len) < 2048) return false;
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log("🖼️ Backfilling images for offers without one...");

  const { data: rows, error } = await supabase
    .from("offers")
    .select("id, title, source_url, image")
    .is("image", null)
    .not("source_url", "is", null)
    .limit(MAX);
  if (error) {
    console.error("❌ Read failed:", error.message);
    process.exit(1);
  }

  const candidates = rows || [];
  console.log(`Found ${candidates.length} offers to backfill (max ${MAX}).`);
  if (candidates.length === 0) {
    console.log("✅ Nothing to do.");
    return;
  }

  let updated = 0;
  for (let i = 0; i < candidates.length; i++) {
    const row = candidates[i];
    await sleep(1000); // 1 request/second
    const html = await fetchHtml(row.source_url);
    const img = html ? metaImageFromHtml(html, row.source_url) : "";
    if (img && (await validateImage(img))) {
      const { error: upErr } = await supabase
        .from("offers")
        .update({ image: img })
        .eq("id", row.id);
      if (upErr) {
        console.error(`❌ Update failed for ${row.id}:`, upErr.message);
      } else {
        updated += 1;
        console.log(`   - ${row.title.slice(0, 40)}: ${img}`);
      }
    } else {
      console.log(`   - (no image) ${row.title.slice(0, 40)}`);
    }
  }
  console.log(`✅ Done. Updated ${updated}/${candidates.length} offer(s).`);
}

main().catch((e) => {
  console.error("❌ Unexpected error:", e.message);
  process.exit(1);
});