// Distance helpers using the Haversine formula (Earth radius in km).

const EARTH_RADIUS_KM = 6371;

// Return the great-circle distance in kilometers between two lat/lng points.
export function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

// Helper accepting an offer-like object with lat/lng and a user point.
// If the offer has outlets, the distance is to the NEAREST outlet.
export function distanceToOffer(offer, userLat, userLng) {
  if (
    offer == null ||
    userLat == null ||
    userLng == null
  ) {
    return null;
  }
  const nearest = nearestOutlet(offer, userLat, userLng);
  if (nearest) return nearest.distanceKm;
  if (offer.lat == null || offer.lng == null) return null;
  return haversineKm(userLat, userLng, offer.lat, offer.lng);
}

// Return the nearest outlet object for an offer that has outlets (null otherwise).
// The returned object includes distanceKm to the given user point.
export function nearestOutlet(offer, userLat, userLng) {
  if (offer == null || userLat == null || userLng == null) return null;
  const outlets = Array.isArray(offer.outlets) ? offer.outlets : [];
  if (!outlets.length) return null;
  let best = null;
  let bestD = Infinity;
  for (const ot of outlets) {
    if (ot.lat == null || ot.lng == null) continue;
    const d = haversineKm(userLat, userLng, ot.lat, ot.lng);
    if (d < bestD) {
      bestD = d;
      best = ot;
    }
  }
  if (!best) return null;
  return { ...best, distanceKm: bestD };
}

// Human-friendly distance: meters under 1 km, otherwise km.
export function formatDistance(km) {
  if (km == null) return "";
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}