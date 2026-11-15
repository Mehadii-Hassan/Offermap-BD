// seed-outlet-test.js — BATCH H5/H7: insert an approved chain offer with a few
// outlets near Uttara (23.8759, 90.3795) so the outlet UI + e2e tests have real
// data. Idempotent: updates the same row by dedupe_key and replaces its outlets.

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
if (existsSync(join(root, ".env.local"))) {
  for (const l of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
    const t = l.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}
const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "");
const sb = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const SHOP = "Pizza Party Chain";
const DEDUPE = "ombd-test-pizza-party-chain-uttara";
const today = new Date().toISOString().slice(0, 10);

const OUTLETS = [
  { name: "Uttara Sector 10", lat: 23.8759, lng: 90.3795, area: "Uttara Sector 10, Dhaka", address: "House 10, Sector 10, Uttara, Dhaka" },
  { name: "Gulshan 2", lat: 23.7925, lng: 90.4064, area: "Gulshan 2, Dhaka", address: "Road 2, Gulshan, Dhaka" },
  { name: "Banani", lat: 23.7937, lng: 90.4066, area: "Banani, Dhaka", address: "Bir Uttam, Banani, Dhaka" },
];

async function main() {
  const row = {
    title: "30% OFF All Pizzas",
    shop_name: SHOP,
    category: "Restaurant",
    division: "Dhaka",
    district: "Dhaka",
    area: "Uttara Sector 10, Dhaka",
    address: "Uttara Sector 10, Dhaka",
    lat: 23.8759,
    lng: 90.3795,
    discount_text: "30% OFF",
    description: "Test chain offer with outlets near Dhaka.",
    valid_till: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    payment_method: "Any",
    is_ongoing: false,
    is_featured: false,
    nationwide: true,
    location_precision: "exact",
    hot_score: 90,
    status: "approved",
    source: "test",
    source_url: "https://example.com",
    dedupe_key: DEDUPE,
    worked_count: 0,
    not_worked_count: 0,
    created_at: new Date().toISOString(),
  };
  const { data, error } = await sb.from("offers").upsert(row, { onConflict: "dedupe_key" }).select("id").single();
  if (error) { console.error("upsert failed:", error.message); process.exit(1); }
  const offerId = data.id;
  console.log("offer:", offerId);

  const { error: delErr } = await sb.from("offer_outlets").delete().eq("offer_id", offerId);
  if (delErr) console.warn("clear outlets:", delErr.message);

  for (const o of OUTLETS) {
    const { error: insErr } = await sb.from("offer_outlets").insert({
      offer_id: offerId,
      name: o.name,
      lat: o.lat,
      lng: o.lng,
      address: o.address,
      area: o.area,
      source: "test",
    });
    if (insErr) console.warn("outlet insert:", insErr.message);
  }
  console.log(`Seeded ${SHOP} with ${OUTLETS.length} outlets near Uttara.`);
}
main().catch((e) => { console.error("seed failed:", e.message); process.exit(1); });