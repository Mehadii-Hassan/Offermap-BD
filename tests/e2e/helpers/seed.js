// Seed/cleanup helpers for e2e tests. Inserts deterministic "e2e" offers so the
// outlet + precision specs have real data instead of depending on leftover rows.
// Service-role key is read from .env.local and never printed.
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { createClient } from "@supabase/supabase-js";
import { districtInfo } from "../../../lib/bd-locations";

function loadEnv() {
  const root = process.cwd();
  const envFile = join(root, ".env.local");
  if (!existsSync(envFile)) return;
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

function adminClient() {
  loadEnv();
  const url = (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ""
  ).replace(/\/rest\/v1\/?$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return createClient(url, key, { auth: { persistSession: false } });
}

function todayPlus14() {
  return new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
}

// Delete every offer (and its outlets) created by a previous e2e run.
export async function cleanupE2E() {
  const sb = adminClient();
  const { data } = await sb.from("offers").select("id").eq("source", "e2e");
  const ids = (data || []).map((r) => r.id);
  if (ids.length) {
    await sb.from("offer_outlets").delete().in("offer_id", ids);
    await sb.from("offers").delete().in("id", ids);
  }
  return ids.length;
}

// Clean up, then insert the two deterministic offers the specs rely on.
// Returns { chainId, districtId }.
export async function seedE2E() {
  const sb = adminClient();
  await cleanupE2E();

  const common = {
    status: "approved",
    source: "e2e",
    valid_till: todayPlus14(),
    category: "Restaurant",
    discount_text: "20% OFF",
    payment_method: "Any",
    is_ongoing: false,
    is_featured: false,
    image: null,
    hot_score: 90,
  };

  const dhaka = districtInfo("Dhaka") || { lat: 23.8103, lng: 90.4125 };

  // (a) Nationwide chain with two outlets (Uttara + Sylhet).
  const { data: chain, error: chainErr } = await sb
    .from("offers")
    .insert({
      ...common,
      title: "E2E Chain Offer",
      shop_name: "E2E Test Chain",
      division: "Dhaka",
      district: "Dhaka",
      area: "Uttara Sector 10",
      address: "Uttara Sector 10, Dhaka",
      lat: 23.8759,
      lng: 90.3795,
      description: "E2E chain offer with outlets near Uttara and in Sylhet.",
      nationwide: true,
      location_precision: "exact",
    })
    .select("id")
    .single();
  if (chainErr) throw new Error("seed chain offer failed: " + chainErr.message);
  const chainId = chain.id;

  const outlets = [
    { name: "Uttara Sector 10", lat: 23.8759, lng: 90.3795, area: "Uttara Sector 10", address: "Sector 10, Uttara, Dhaka" },
    { name: "Sylhet", lat: 24.9017, lng: 91.8706, area: "Sylhet", address: "Sylhet city" },
  ];
  for (const o of outlets) {
    const { error } = await sb.from("offer_outlets").insert({
      offer_id: chainId,
      name: o.name,
      lat: o.lat,
      lng: o.lng,
      address: o.address,
      area: o.area,
      source: "e2e",
    });
    if (error) throw new Error("seed outlet failed: " + error.message);
  }

  // (b) District-precision offer pinned to the Dhaka district centre.
  const { data: district, error: distErr } = await sb
    .from("offers")
    .insert({
      ...common,
      title: "E2E District Offer",
      shop_name: "E2E District Shop",
      division: "Dhaka",
      district: "Dhaka",
      area: "Dhaka",
      address: "Dhaka",
      lat: dhaka.lat,
      lng: dhaka.lng,
      description: "E2E district-precision offer pinned to the Dhaka centre.",
      nationwide: false,
      location_precision: "district",
    })
    .select("id")
    .single();
  if (distErr) throw new Error("seed district offer failed: " + distErr.message);
  const districtId = district.id;

  return { chainId, districtId };
}