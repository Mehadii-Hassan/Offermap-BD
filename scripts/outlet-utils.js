// outlet-utils.js — shared helpers for BATCH H3: when a source page lists branch
// addresses or partner merchants (bank/wallet/telecom partner lists, brand
// "our outlets" pages), the scraper produces one offer per merchant/brand and
// geocodes its listed addresses into offer_outlets (Nominatim, 1 req/s, bounded
// to Bangladesh) instead of one vague nationwide offer.
//
// Imported by scripts/scrape.js and scripts/crawl-direct.js.

import { isInsideBangladesh } from "../lib/bd-locations.js";

const UA = "OfferMapBD/1.0 (outlet geocoder; mailto:contact@offermap-bd.example.com)";
let lastRequest = 0;

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// Nominatim geocoder: max 1 request/second, results bounded to Bangladesh.
export async function geocodeOutletAddress(address) {
  if (!address) return null;
  const wait = Math.max(0, 1050 - (Date.now() - lastRequest));
  if (wait > 0) await sleep(wait);
  lastRequest = Date.now();
  const params = new URLSearchParams({
    q: `${address}, Bangladesh`,
    format: "jsonv2",
    countrycodes: "bd",
    limit: "5",
  });
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { "User-Agent": UA },
    });
    if (!res.ok) return null;
    const results = await res.json();
    for (const r of results) {
      const lat = Number(r.lat);
      const lng = Number(r.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isInsideBangladesh(lat, lng)) continue;
      const a = r.address || {};
      return {
        lat,
        lng,
        address: String(r.display_name || address),
        area: a.suburb || a.neighbourhood || a.city_district || a.town || a.city || a.state_district || "",
        source: "page",
      };
    }
    return null;
  } catch {
    return null;
  }
}

// Insert outlet rows for an offer. Accepts an array of address strings; each is
// geocoded (1 req/s) and saved to offer_outlets. Keeps the first 300 outlets.
// Returns { saved, failed } counts.
export async function insertOutletsForOffer(supabase, offerId, addresses, maxOutlets = 300) {
  if (!Array.isArray(addresses) || !addresses.length) return { saved: 0, failed: 0 };
  let saved = 0;
  let failed = 0;
  for (const addr of addresses) {
    if (saved >= maxOutlets) break;
    if (!addr || !String(addr).trim()) continue;
    const geocoded = await geocodeOutletAddress(String(addr).trim());
    if (!geocoded) { failed += 1; continue; }
    const { error } = await supabase.from("offer_outlets").insert({
      offer_id: offerId,
      name: geocoded.area || String(addr).trim().slice(0, 80),
      lat: geocoded.lat,
      lng: geocoded.lng,
      address: geocoded.address,
      area: geocoded.area || null,
      source: geocoded.source,
    });
    if (error) { failed += 1; continue; }
    saved += 1;
  }
  return { saved, failed };
}