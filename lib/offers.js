import rawOffers from "@/data/offers.json";

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

// Dhaka center reference point for default "Near Me" fallback
export const DHAKA_CENTER = { lat: 23.8103, lng: 90.4125 };

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

export function getAllOffers() {
  return rawOffers;
}

export function getOfferById(id) {
  return rawOffers.find((o) => String(o.id) === String(id)) || null;
}

export function getFeaturedOffers() {
  return rawOffers.filter((o) => o.isFeatured);
}

export function getOffersByCategory(category) {
  if (!category || category === "All") return rawOffers;
  return rawOffers.filter((o) => o.category === category);
}

export function getEndingSoon(limit = 8) {
  return [...rawOffers]
    .sort((a, b) => new Date(a.validTill) - new Date(b.validTill))
    .slice(0, limit);
}

export function getHotOffers(limit = 8) {
  return [...rawOffers].sort((a, b) => b.hotScore - a.hotScore).slice(0, limit);
}

export function getTodayTopFive() {
  return [...rawOffers].sort((a, b) => b.viewsToday - a.viewsToday).slice(0, 5);
}

// distance in km between user coords and an offer
export function distanceToOffer(offer, userLat, userLng) {
  return haversine(userLat, userLng, offer.lat, offer.lng);
}

// returns offers sorted by distance from given coords, each with .distanceKm
export function getNearbyOffers(userLat, userLng, limit = 10) {
  return [...rawOffers]
    .map((o) => ({
      ...o,
      distanceKm: distanceToOffer(o, userLat, userLng),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

// discount percentage extracted from discountText for sorting
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
  return `https://www.messenger.com/share/sharer.php?quote=${encodeURIComponent(
    text
  )}`;
}

export function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}