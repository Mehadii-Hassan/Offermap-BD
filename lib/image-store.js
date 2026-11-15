// Image storage helper: convert accepted images to webp and store them in the
// public Supabase bucket "offer-images" at offers/<id>.webp.
//
// Node-only (uses sharp). Import from scripts and API routes only — never from
// a client component, because it needs the service role key.
//
// Self-contained: builds its own service-role client from env, loading
// .env.local if present (so plain Node scripts work without setup).

import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createClient } from "@supabase/supabase-js";

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

export const IMAGE_BUCKET = "offer-images";
export const MAX_WIDTH = 1200;
export const WEBP_QUALITY = 80;

function client() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// Download an image and save it to the bucket as webp at offers/<id>.webp.
// Returns { publicUrl, saved } or { saved: false } on any failure.
export async function storeImage(id, sourceUrl) {
  const sharp = (await import("sharp")).default;
  try {
    const res = await fetch(sourceUrl, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { saved: false };
    const buf = await res.arrayBuffer();
    const webp = await sharp(Buffer.from(buf))
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    const path = `offers/${id}.webp`;
    const supabase = client();
    const { error } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(path, webp, { upsert: true, contentType: "image/webp" });
    if (error) return { saved: false };

    const { data: pub } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
    return { saved: true, publicUrl: pub.publicUrl };
  } catch {
    return { saved: false };
  }
}

// Remove a stored image from the bucket if it looks like our internal URL.
// Safe to call with null or a foreign (non-supabase) URL.
export async function deleteStoredImage(urlStr) {
  try {
    if (!urlStr) return;
    const u = new URL(urlStr);
    if (!u.hostname.includes(".supabase")) return;
    const seg = urlStr.split("/");
    const filename = seg[seg.length - 1];
    const supabase = client();
    await supabase.storage.from(IMAGE_BUCKET).remove([filename]);
  } catch {
    /* ignore */
  }
}