// Fix-categories script: normalizes every row in the offers table so its
// category matches the exact canonical label from /lib/categories.js. Old or
// unknown values (e.g. "Mobile Wallet Cashback", "Health", lowercase/Bengali)
// are mapped to the correct key (unknown -> "Other").
//
// Run: node scripts/fix-categories.js   (requires SUPABASE_URL /
// SUPABASE_SERVICE_ROLE_KEY in .env.local)

import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

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

// Canonical categories, mirroring /lib/categories.js (no "Mobile Wallet
// Cashback" — it maps to "Cashback & Wallet").
const CANONICAL = [
  "Restaurant",
  "Fashion & Clothing",
  "Bank Card Offers",
  "Electronics",
  "Salon & Beauty",
  "Grocery",
  "Entertainment",
  "Travel & Hotels",
  "Mobile & Gadgets",
  "Health & Fitness",
  "Education & Courses",
  "Online Shopping",
  "Cashback & Wallet",
  "Other",
];

// Legacy/alternate (case-insensitive) values -> canonical key.
const ALIASES = {
  "mobile wallet cashback": "Cashback & Wallet",
  "mobile wallets": "Cashback & Wallet",
  "mobile wallet": "Cashback & Wallet",
  "wallet cashback": "Cashback & Wallet",
  cashback: "Cashback & Wallet",
  wallet: "Cashback & Wallet",
  "cashback & wallet": "Cashback & Wallet",
  health: "Health & Fitness",
};

function normalizeCategory(input) {
  const raw = String(input || "").trim();
  if (!raw) return "Other";
  const low = raw.toLowerCase();
  for (let i = 0; i < CANONICAL.length; i++) {
    if (CANONICAL[i].toLowerCase() === low) return CANONICAL[i];
  }
  if (ALIASES[low]) return ALIASES[low];
  return "Other";
}

async function main() {
  console.log("🔧 Fixing offer categories...");

  let all = [];
  let from = 0;
  const pageSize = 500;
  for (;;) {
    const { data, error } = await supabase
      .from("offers")
      .select("id, category")
      .range(from, from + pageSize - 1);
    if (error) {
      console.error("❌ Read failed:", error.message);
      process.exit(1);
    }
    all = all.concat(data || []);
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  let updated = 0;
  for (let i = 0; i < all.length; i++) {
    const row = all[i];
    const canonical = normalizeCategory(row.category);
    if (String(row.category || "") !== canonical) {
      const { error } = await supabase
        .from("offers")
        .update({ category: canonical })
        .eq("id", row.id);
      if (error) {
        console.error(`❌ Update failed for ${row.id}:`, error.message);
      } else {
        updated += 1;
        console.log(`   - ${row.id}: "${row.category}" -> "${canonical}"`);
      }
    }
  }

  console.log(`✅ Done. Checked ${all.length} rows, updated ${updated}.`);
}

main().catch((e) => {
  console.error("❌ Unexpected error:", e.message);
  process.exit(1);
});