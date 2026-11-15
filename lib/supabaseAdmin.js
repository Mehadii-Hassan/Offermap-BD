import { createClient } from "@supabase/supabase-js";
import { mapOffer } from "./supabase";

// Service role client — SERVER-ONLY. This file must never be imported from a
// client component or from anywhere that runs in the browser, because the
// service role key is a secret and createClient would throw if it's missing
// in the client bundle. Import it only from API routes and scripts.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/rest\/v1\/?$/, ""),
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);

export function hasAdminEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// --- Admin reads/writes (service role, bypasses RLS) ---

export async function adminGetAllOffers(limit = 500) {
  if (!hasAdminEnv()) return [];
  const { data, error } = await supabaseAdmin
    .from("offers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map(mapOffer);
}

export async function adminUpdateOffer(id, updates) {
  const { error } = await supabaseAdmin
    .from("offers")
    .update(updates)
    .eq("id", id);
  if (error) throw error;
}

export async function adminGetOfferById(id) {
  const { data, error } = await supabaseAdmin
    .from("offers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return mapOffer(data);
}

// Call the dashboard_overview() RPC and return its JSON payload.
export async function adminDashboard() {
  const { data, error } = await supabaseAdmin.rpc("dashboard_overview");
  if (error) throw error;
  return data;
}

export async function adminDeleteOffer(id) {
  const { error } = await supabaseAdmin
    .from("offers")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function adminInsertOffer(row) {
  const { data, error } = await supabaseAdmin
    .from("offers")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function adminIncrementVote(id, column) {
  // Try an RPC first if one exists; otherwise read + update.
  const { error } = await supabaseAdmin.rpc("increment_offer_count", {
    offer_id: id,
    col: column,
  });
  if (!error) return;
  const { data, error: readErr } = await supabaseAdmin
    .from("offers")
    .select("worked_count, not_worked_count")
    .eq("id", id)
    .single();
  if (readErr) throw readErr;
  const next =
    column === "worked_count"
      ? (data.worked_count ?? 0) + 1
      : (data.not_worked_count ?? 0) + 1;
  await adminUpdateOffer(id, { [column]: next });
}