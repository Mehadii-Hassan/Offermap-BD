// /api/geo — approximate location from Vercel's per-request IP headers.
// Returns { lat, lng, city, approximate: true } or {} when no headers are present.
// Never logs the raw headers or any secret.

export function GET(req) {
  const h = (k) => req.headers.get(k);
  const lat = h("x-vercel-ip-latitude");
  const lng = h("x-vercel-ip-longitude");
  const city = h("x-vercel-ip-city");

  if (!lat && !lng && !city) {
    return Response.json({});
  }

  // city may be URL-encoded (e.g. "Dhaka%20%20%E0%A6%A2%E0%A6%BE%E0%A6%95%E0%A6%BE").
  let decodedCity = city || "";
  try {
    decodedCity = city ? decodeURIComponent(city) : "";
  } catch {
    /* keep raw */
  }

  return Response.json({
    lat: lat != null ? Number(lat) : null,
    lng: lng != null ? Number(lng) : null,
    city: decodedCity,
    approximate: true,
  });
}