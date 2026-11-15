// Precision classification for an offer's location.
// - 'exact':   geocoded to the shop/address (a real address, not approximate).
// - 'area':    a neighbourhood-level area (but not an exact street address).
// - 'district': falls back to a district centre / unknown exact address.
import { DISTRICTS } from "./bd-locations";

export function getPrecision(offer) {
  if (!offer) return "district";
  // An offer with real outlets has exact coordinates -> counts as precise.
  if (Array.isArray(offer.outlets) && offer.outlets.length) return "exact";
  if (offer.locationPrecision) {
    const p = String(offer.locationPrecision).toLowerCase();
    if (["exact", "area", "district"].includes(p)) return p;
  }
  const area = String(offer.area || "").trim().toLowerCase();
  const addr = String(offer.address || "").trim().toLowerCase();
  if (addr.includes("(approximate location)")) return "district";
  // Exact match to a district centre -> 'district'.
  if (offer.lat != null && offer.lng != null) {
    for (const d of DISTRICTS) {
      if (
        Math.abs(d.lat - offer.lat) < 0.0001 &&
        Math.abs(d.lng - offer.lng) < 0.0001
      ) {
        return "district";
      }
    }
  }
  // A real street/place address that includes a comma or a neighbourhood.
  if (addr && addr !== "bangladesh" && (addr.includes(",") || offer.district)) {
    return "exact";
  }
  // Neighbourhood-level area (not just the district/division/Bangladesh).
  if (
    area &&
    area !== "bangladesh" &&
    area !== String(offer.district || "").toLowerCase() &&
    area !== String(offer.division || "").toLowerCase()
  ) {
    return "area";
  }
  return "district";
}