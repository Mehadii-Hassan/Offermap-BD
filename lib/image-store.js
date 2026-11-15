// Image storage helper: convert accepted images to webp and store them in the
// public Supabase bucket "offer-images" at offers/<id>.webp.
//
// Node-only (uses sharp). Import from scripts and API routes only — never from
// a client component, because it needs the service role key.

import { supabaseAdmin } from "./supabaseAdmin";

export const IMAGE_BUCKET = "offer-images";
export const MAX_WIDTH = 1200;
export const WEBP_QUALITY = 80;

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
    const { error } = await supabaseAdmin.storage
      .from(IMAGE_BUCKET)
      .upload(path, webp, { upsert: true, contentType: "image/webp" });
    if (error) return { saved: false };

    const { data: pub } = supabaseAdmin.storage.from(IMAGE_BUCKET).getPublicUrl(path);
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
    await supabaseAdmin.storage.from(IMAGE_BUCKET).remove([filename]);
  } catch {
    /* ignore */
  }
}