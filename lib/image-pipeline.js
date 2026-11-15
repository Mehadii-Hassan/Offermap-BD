// Image quality pipeline used by the scraper and backfill.
// Node-only (uses probe-image-size for dimensions).

const REJECT = /logo|icon|favicon|avatar|sprite|placeholder/i;
const MAX_BYTES = 5 * 1024 * 1024;

export function isRejectedUrl(url) {
  return !/^https:\/\//i.test(url) || REJECT.test(url);
}

// Validate an image URL: status 200, image/*, size, dimensions, aspect ratio.
// maxWidth: for og:image allow >=600 wide; others >=800.
export async function validateImage(url, { maxWidth = 800, maxHeight = 450 } = {}) {
  if (isRejectedUrl(url)) return { ok: false, reason: "url" };
  let res;
  try {
    res = await fetch(url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(15000) });
  } catch {
    return { ok: false, reason: "fetch" };
  }
  if (!res.ok) return { ok: false, reason: "http " + res.status };
  const len = Number(res.headers.get("content-length") || 0);
  if (len && len > MAX_BYTES) return { ok: false, reason: "too-big" };
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  if (!ct.startsWith("image/")) return { ok: false, reason: "not-image" };
  // Optional dimension check via probe-image-size.
  try {
    const probe = (await import("probe-image-size")).default;
    const info = await probe(url, { timeout: 10000 });
    if (info.width && info.width < maxWidth) return { ok: false, reason: "narrow" };
    if (info.height && info.height < (info.height === info.width ? info.width : maxHeight)) return { ok: false, reason: "short" };
    if (info.width && info.height) {
      const ratio = info.width / info.height;
      if (ratio < 1 || ratio > 2.4) return { ok: false, reason: "ratio" };
    }
  } catch {
    // dimension probe failed; accept based on headers if plausible
  }
  return { ok: true, url };
}

// Pick the best accepted image from an ordered candidate list.
export async function pickImage(candidates, opts) {
  for (const c of candidates) {
    if (!c) continue;
    const r = await validateImage(c, opts);
    if (r.ok) return c;
  }
  return null;
}