import { supabase, mapOffer } from "./supabase";

export const CATEGORIES = [
  "Restaurant",
  "Fashion & Clothing",
  "Bank Card Offers",
  "Electronics",
  "Salon & Beauty",
  "Grocery",
  "Entertainment",
];

export const AREAS = [
  "Dhanmondi",
  "Gulshan",
  "Banani",
  "Uttara",
  "Mirpur",
  "Mohammadpur",
  "Old Dhaka",
];

export const PAYMENT_METHODS = [
  "Any",
  "City Bank Card",
  "bKash",
];

// Center coordinates per Dhaka area — used for auto lat/lng on submissions.
export const AREA_COORDS = {
  Dhanmondi: { lat: 23.7461, lng: 90.3762 },
  Gulshan: { lat: 23.7925, lng: 90.4064 },
  Banani: { lat: 23.7937, lng: 90.4066 },
  Uttara: { lat: 23.8759, lng: 90.3795 },
  Mirpur: { lat: 23.8101, lng: 90.3559 },
  Mohammadpur: { lat: 23.7657, lng: 90.3567 },
  "Old Dhaka": { lat: 23.7100, lng: 90.4100 },
};

export const DHAKA_CENTER = { lat: 23.8103, lng: 90.4125 };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// --- Async reads against Supabase (public client — RLS + valid_till filter) ---

export async function getAllOffers(limit = 300) {
  const today = todayISO();
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("status", "approved")
    .gte("valid_till", today)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map(mapOffer);
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
  return [...all].sort((a, b) => new Date(a.validTill) - new Date(b.validTill)).slice(0, limit);
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

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function distanceToOffer(offer, userLat, userLng) {
  return haversine(userLat, userLng, offer.lat, offer.lng);
}

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

export function formatDistance(km) {
  if (km == null) return "";
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

export function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}