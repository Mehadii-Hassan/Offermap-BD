import { createClient } from "@supabase/supabase-js";
import { normalizeCategory } from "./categories";

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "");
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Public client — safe to use in the browser and on the server.
// It uses the anon key, so it can only read rows the RLS policy allows
// (status = 'approved', valid_till >= today).
export const supabase = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false },
});

// Deterministic fake "views today" from the id (the DB has no such column,
// this keeps the existing UI's "🔥 X people viewed today" working).
function fakeViewsToday(id) {
  let h = 0;
  const s = String(id || "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000;
  return 80 + (h % 420);
}

// Map a Supabase row (snake_case) to the camelCase shape the UI uses.
export function mapOffer(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    shopName: row.shop_name,
    category: normalizeCategory(row.category),
    division: row.division,
    district: row.district,
    area: row.area,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    discountText: row.discount_text,
    description: row.description,
    validTill: row.valid_till,
    paymentMethod: row.payment_method,
    image: row.image,
    isFeatured: !!row.is_featured,
    isOngoing: !!row.is_ongoing,
    hotScore: row.hot_score ?? 0,
    status: row.status,
    source: row.source,
    sourceUrl: row.source_url,
    workedCount: row.worked_count ?? 0,
    notWorkedCount: row.not_worked_count ?? 0,
    viewsToday: fakeViewsToday(row.id),
    createdAt: row.created_at,
  };
}

// Map a camelCase offer to the snake_case shape for inserts/updates.
// Pure mapping helper, safe to keep here (no secrets involved).
export function unmapOffer(offer) {
  const u = {
    title: offer.title,
    shop_name: offer.shopName,
    category: offer.category,
    division: offer.division,
    district: offer.district,
    area: offer.area,
    address: offer.address,
    lat: offer.lat,
    lng: offer.lng,
    discount_text: offer.discountText,
    description: offer.description,
    valid_till: offer.validTill,
    payment_method: offer.paymentMethod,
    image: offer.image,
    is_featured: offer.isFeatured,
    is_ongoing: offer.isOngoing,
    hot_score: offer.hotScore,
    source: offer.source,
    source_url: offer.sourceUrl,
  };
  return u;
}