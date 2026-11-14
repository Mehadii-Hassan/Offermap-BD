import { supabase, mapOffer } from "./supabase";
import {
  DIVISIONS,
  DHAKA_AREAS,
  districtNames,
  AREA_COORDS,
} from "./bd-locations";
import { distanceToOffer, formatDistance } from "./distance";
import { ACTIVE_CATEGORIES } from "./categories";

// Re-export distance helpers and AREA_COORDS so existing imports from "@/lib/offers" keep working.
export { distanceToOffer, formatDistance, AREA_COORDS };

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
  return all.slice(0, limit).map(mapOffer);
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
  return mapOffer(data);
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