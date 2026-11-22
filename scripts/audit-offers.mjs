// Read-only offer audit script for L3 data quality.
// Self-contained: creates the Supabase admin client directly.
// Prints a table of issues, deletes only clear bad ones (e2e/sample leftovers,
// exact shop+discount duplicates, expired offers), and lists what was only
// flagged (area/district mismatch, category outside canonical list).
//
// Usage: node scripts/audit-offers.mjs
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TODAY = new Date().toISOString().slice(0, 10);

const CATEGORY_KEYS = [
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

function isSample(o) {
  const hay = `${o.title || ""} ${o.shopName || ""} ${o.description || ""}`.toLowerCase();
  return /sample|test offer|demo offer|dummy|placeholder/.test(hay);
}

function areaMatchesDistrict(o) {
  if (!o.district || !o.area) return true;
  const a = String(o.area).trim().toLowerCase();
  const d = String(o.district).trim().toLowerCase();
  return a === d || a.includes(d) || d.includes(a);
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    console.error("audit: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const sb = createClient(SUPABASE_URL.replace(/\/rest\/v1\/?$/, ""), SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: rows, error } = await sb.from("offers").select("*").order("created_at", { ascending: false });
  if (error) {
    console.error("audit: fetch failed", error.message);
    process.exit(1);
  }

  const offers = (rows || []).map((r) => ({
    id: r.id,
    title: r.title,
    shopName: r.shop_name,
    category: r.category,
    district: r.district,
    area: r.area,
    discountText: r.discount_text,
    validTill: r.valid_till,
    isOngoing: !!r.is_ongoing,
    source: r.source,
    createdAt: r.created_at,
  }));

  const validCategory = new Set(CATEGORY_KEYS);
  const issues = [];
  const toDelete = new Set();
  const seenPairs = new Map();

  for (const o of offers) {
    const reasons = [];

    if (o.source === "e2e") {
      reasons.push("source=e2e");
      toDelete.add(o.id);
    }
    if (isSample(o)) {
      reasons.push("sample data");
      toDelete.add(o.id);
    }
    const expired = !o.isOngoing && o.validTill && o.validTill < TODAY;
    if (expired) {
      reasons.push("expired");
      toDelete.add(o.id);
    }
    if (!o.title || !o.shopName || !o.discountText) {
      reasons.push("missing title/shop/discount");
    }
    if (!areaMatchesDistrict(o)) {
      reasons.push(`area/district mismatch (${o.area} vs ${o.district})`);
    }
    if (o.category && !validCategory.has(o.category)) {
      reasons.push(`category '${o.category}' not canonical`);
    }

    const pairKey = `${String(o.shopName || "").trim().toLowerCase()}|${String(o.discountText || "").trim().toLowerCase()}`;
    if (pairKey && pairKey !== "||") {
      if (seenPairs.has(pairKey)) {
        reasons.push("duplicate shop+discount");
        toDelete.add(o.id);
      } else {
        seenPairs.set(pairKey, o.id);
      }
    }

    if (reasons.length) {
      issues.push({ id: o.id, shop: o.shopName, area: o.area, district: o.district, reasons });
    }
  }

  console.log(`\nOffer audit — ${offers.length} total offers\n`);
  console.log(`${"ID".padEnd(10)} ${"Shop".padEnd(30)} ${"Area".padEnd(20)} ${"Reasons"}`);
  console.log("-".repeat(100));
  for (const iss of issues) {
    console.log(
      `${iss.id.slice(0, 8).padEnd(10)} ${(iss.shop || "").slice(0, 28).padEnd(30)} ${(iss.area || "").slice(0, 18).padEnd(20)} ${iss.reasons.join("; ")}`
    );
  }

  const onlyFlagged = issues.filter((i) => !toDelete.has(i.id));
  const toDeleteList = issues.filter((i) => toDelete.has(i.id));

  console.log(`\n--- Summary ---`);
  console.log(`Total offers: ${offers.length}`);
  console.log(`Flagged issues: ${issues.length}`);
  console.log(`To delete (clear bad): ${toDeleteList.length}`);
  console.log(`Only flagged (no delete): ${onlyFlagged.length}`);

  if (toDeleteList.length) {
    console.log(`\n--- To delete (clear bad): ---`);
    for (const iss of toDeleteList) {
      console.log(`  ${iss.id} ${iss.shop || ""} — ${iss.reasons.join("; ")}`);
    }
  }

  if (onlyFlagged.length) {
    console.log(`\n--- Only flagged (review manually): ---`);
    for (const iss of onlyFlagged) {
      console.log(`  ${iss.id} ${iss.shop || ""} — ${iss.reasons.join("; ")}`);
    }
  }

  let deleted = 0;
  for (const id of toDelete) {
    try {
      await sb.from("offers").delete().eq("id", id);
      deleted++;
    } catch (e) {
      console.error(`  delete failed ${id}:`, e.message);
    }
  }
  console.log(`\nDeleted ${deleted} clear bad offers.`);
}

main();
