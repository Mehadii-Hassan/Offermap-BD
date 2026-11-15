import { supabase, mapOffer } from "./supabase";
import {
  DIVISIONS,
  DHAKA_AREAS,
  districtNames,
  AREA_COORDS,
} from "./bd-locations";
import { distanceToOffer, formatDistance, nearestOutlet } from "./distance";
import { ACTIVE_CATEGORIES } from "./categories";

// Re-export distance helpers and AREA_COORDS so existing imports from "@/lib/offers" keep working.
export { distanceToOffer, formatDistance, nearestOutlet, AREA_COORDS };

// Categories come from /lib/categories.js (the single source of truth).
export const CATEGORIES = ACTIVE_CATEGORIES.map((c) => c.key);

// Division + District helpers (by default Dhaka's districts for quick pick).
// The FILTERS use Division → District across all of Bangladesh.
export const AREAS = districtNames("Dhaka"); // default suggestions (e.g. Dhaka district)

export const PAYMENT_METHODS = [
  "Any",
  "City Bank Card",
  "bKash",
  "Nagad",
  "Rocket",
];

// Re-export division/district helpers for use across the app.
export { DIVISIONS, DHAKA_AREAS, districtNames };

export const DHAKA_CENTER = { lat: 23.8103, lng: 90.4125 };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// --- Async reads against Supabase (public client — RLS + valid_till filter) ---

// Fetch all offer_outlets rows (public RLS already restricts to approved offers),
// returned as a Map from offer_id -> array of outlet rows (camelCased).
async function fetchOutlets(offerIds) {
  const map = new Map();
  if (!offerIds || !offerIds.length) return map;
  const page = 500;
  for (let i = 0; i < offerIds.length; i += page) {
    const chunk = offerIds.slice(i, i + page);
    const { data, error } = await supabase
      .from("offer_outlets")
      .select("id, offer_id, name, lat, lng, address, area, source")
      .in("offer_id", chunk);
    if (error) throw error;
    for (const r of data || []) {
      const key = r.offer_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({
        id: r.id,
        offerId: r.offer_id,
        name: r.name,
        lat: r.lat,
        lng: r.lng,
        address: r.address,
        area: r.area,
        source: r.source,
      });
    }
  }
  return map;
}

export async function getAllOffers(limit = Number.MAX_SAFE_INTEGER) {
  const today = todayISO();
  const all = [];
  const page = 1000;
  let from = 0;
  // Page through all approved, not-expired offers in chunks of 1000.
  for (;;) {
    const { data, error } = await supabase
      .from("offers")
      .select("*")
      .eq("status", "approved")
      .gte("valid_till", today)
      .order("created_at", { ascending: false })
      .range(from, from + page - 1);
    if (error) throw error;
    const rows = data || [];
    all.push(...rows);
    if (rows.length < page) break;
    from += page;
    if (from >= limit) break;
  }
  const sliced = all.slice(0, limit);
  const offers = sliced.map(mapOffer);
  const outlets = await fetchOutlets(sliced.map((r) => r.id));
  return offers.map((o) => ({ ...o, outlets: outlets.get(o.id) || [] }));
}

export async function getOfferById(id) {
  const today = todayISO();
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("id", id)
    .eq("status", "approved")
    .gte("valid_till", today)
    .maybeSingle();
  if (error) throw error;
  const offer = mapOffer(data);
  if (!offer) return null;
  const outlets = await fetchOutlets([id]);
  return { ...offer, outlets: outlets.get(id) || [] };
}

export async function getFeaturedOffers() {
  const all = await getAllOffers();
  return all.filter((o) => o.isFeatured);
}

export async function getOffersByCategory(category) {
  const all = await getAllOffers();
  if (!category || category === "All") return all;
  return all.filter((o) => o.category === category);
}

export async function getEndingSoon(limit = 8) {
  const all = await getAllOffers();
  return [...all]
    .filter((o) => !o.isOngoing)
    .sort((a, b) => new Date(a.validTill) - new Date(b.validTill))
    .slice(0, limit);
}

export async function getHotOffers(limit = 8) {
  const all = await getAllOffers();
  return [...all].sort((a, b) => b.hotScore - a.hotScore).slice(0, limit);
}

export async function getTodayTopFive() {
  const all = await getAllOffers();
  return [...all].sort((a, b) => (b.viewsToday ?? 0) - (a.viewsToday ?? 0)).slice(0, 5);
}

export async function getNearbyOffers(userLat, userLng, limit = 10) {
  const all = await getAllOffers();
  return [...all]
    .map((o) => ({ ...o, distanceKm: distanceToOffer(o, userLat, userLng) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

// --- Pure helpers (synchronous, used across the app) ---

export function discountValue(offer) {
  const match = String(offer.discountText).match(/(\d+)\s*%/);
  return match ? parseInt(match[1], 10) : 0;
}

export function getDirectionsUrl(offer) {
  return `https://www.google.com/maps/dir/?api=1&destination=${offer.lat},${offer.lng}`;
}

export function whatsappShareUrl(offer) {
  const text = `${offer.title} at ${offer.shopName} — ${offer.discountText} (OfferMap BD)`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function messengerShareUrl(offer) {
  const text = `${offer.title} at ${offer.shopName} — ${offer.discountText} (OfferMap BD)`;
  return `https://www.messenger.com/share/sharer.php?quote=${encodeURIComponent(text)}`;
}

export function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// formatDistance and distanceToOffer re-exported from ./distance.