// Seed script: reads /data/offers.json and inserts all offers into Supabase
// with status 'approved'. Uses the service role key (server-side only).
//
// Run: node scripts/seed.js
// It loads SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY from .env.local.

import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Load .env.local into process.env if not already set
const envFile = join(root, ".env.local");
if (existsSync(envFile)) {
  const lines = readFileSync(envFile, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const raw = JSON.parse(readFileSync(join(root, "data", "offers.json"), "utf8"));

  const rows = raw.map((o) => ({
    title: o.title,
    shop_name: o.shopName,
    category: o.category,
    area: o.area,
    lat: o.lat,
    lng: o.lng,
    discount_text: o.discountText,
    description: o.description,
    valid_till: o.validTill,
    payment_method: o.paymentMethod,
    image: o.image,
    is_featured: !!o.isFeatured,
    hot_score: o.hotScore ?? 0,
    status: "approved",
    worked_count: 0,
    not_worked_count: 0,
  }));

  console.log(`Seeding ${rows.length} offers...`);

  const { data, error } = await supabase.from("offers").insert(rows).select("id, title");
  if (error) {
    console.error("❌ Insert failed:", error.message);
    process.exit(1);
  }
  console.log(`✅ Inserted ${data.length} offers:`);
  data.forEach((r) => console.log(`   - ${r.title}`));
}

main().catch((e) => {
  console.error("❌ Unexpected error:", e.message);
  process.exit(1);
});