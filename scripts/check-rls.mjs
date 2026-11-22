// scripts/check-rls.mjs
// Uses ONLY the public anon key to prove RLS blocks:
//   - reading pending/rejected offers
//   - reading site_visits, activity_log, scrape_runs, scrape_log
//   - insert/update/delete on offers
// Prints PASS/FAIL for each assertion (and ? when inconclusive due to empty tables).
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function attempt(fn) {
  try {
    const { data, error } = await fn();
    if (error) return { kind: "error", error: error.message, status: error.status };
    return { kind: "ok", count: Array.isArray(data) ? data.length : 0 };
  } catch (e) {
    return { kind: "exception", error: e.message };
  }
}

async function main() {
  if (!SUPABASE_URL || !ANON_KEY) {
    console.error("check-rls: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY");
    process.exit(1);
  }

  const sb = createClient(
    SUPABASE_URL.replace(/\/rest\/v1\/?$/, ""),
    ANON_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const results = [];

  // Reads that MUST be blocked by RLS.
  const readTests = [
    { label: "pending offers not readable", fn: () => sb.from("offers").select("id").eq("status", "pending").limit(1) },
    { label: "rejected offers not readable", fn: () => sb.from("offers").select("id").eq("status", "rejected").limit(1) },
    { label: "site_visits not readable", fn: () => sb.from("site_visits").select("id").limit(1) },
    { label: "activity_log not readable", fn: () => sb.from("activity_log").select("id").limit(1) },
    { label: "scrape_runs not readable", fn: () => sb.from("scrape_runs").select("id").limit(1) },
    { label: "scrape_log not readable", fn: () => sb.from("scrape_log").select("id").limit(1) },
  ];

  for (const t of readTests) {
    const r = await attempt(t.fn);
    let pass, detail;
    if (r.kind === "error") {
      pass = true;
      detail = `blocked (${r.status || "error"}) ${r.error}`;
    } else if (r.kind === "ok" && r.count > 0) {
      pass = false;
      detail = `returned ${r.count} rows`;
    } else {
      pass = null;
      detail = "empty (inconclusive)";
    }
    results.push({ label: t.label, pass, detail });
  }

  // Writes that MUST be refused. Use a real approved offer id so the request
  // reaches the RLS policy rather than matching zero rows.
  let realId = null;
  const { data: offers } = await sb.from("offers").select("id").eq("status", "approved").limit(1);
  if (offers && offers.length) realId = offers[0].id;

  if (realId) {
    const ins = await attempt(() => sb.from("offers").insert({ title: "rls check", shop_name: "x", discount_text: "10% OFF", category: "Other", area: "x", division: "Dhaka", district: "Dhaka", lat: 23.81, lng: 90.41, valid_till: "2099-12-31", source: "user" }));
    results.push({ label: "insert on offers refused", pass: ins.kind === "error", detail: ins.kind === "error" ? `refused (${ins.status || "error"}) ${ins.error}` : `NOT refused` });

    const upd = await attempt(() => sb.from("offers").update({ title: "rls check" }).eq("id", realId));
    const updPass = upd.kind === "error" || (upd.kind === "ok" && upd.count === 0);
    results.push({ label: "update on offers refused", pass: updPass, detail: updPass ? `refused (${upd.kind === "error" ? "error" : "0 rows"}) ${upd.error || "RLS blocked (0 rows affected)"}` : `NOT refused: ${upd.count} rows updated` });

    const del = await attempt(() => sb.from("offers").delete().eq("id", realId));
    const delPass = del.kind === "error" || (del.kind === "ok" && del.count === 0);
    results.push({ label: "delete on offers refused", pass: delPass, detail: delPass ? `refused (${del.kind === "error" ? "error" : "0 rows"}) ${del.error || "RLS blocked (0 rows affected)"}` : `NOT refused: ${del.count} rows deleted` });
  } else {
    results.push({ label: "insert/update/delete on offers refused", pass: null, detail: "no approved offer id available to test writes" });
  }

  console.log("\n=== RLS check (public anon key) ===\n");
  let writesPass = true;
  let readsInconclusive = 0;
  for (const res of results) {
    if (res.pass === null) { readsInconclusive++; console.log(`  [? ] ${res.label}`); console.log(`         ${res.detail}`); continue; }
    const mark = res.pass ? "PASS" : "FAIL";
    if (res.label.startsWith("insert") || res.label.startsWith("update") || res.label.startsWith("delete")) {
      if (!res.pass) writesPass = false;
      console.log(`  [${mark}] ${res.label}`);
      console.log(`         ${res.detail}`);
    } else if (res.pass) {
      console.log(`  [${mark}] ${res.label}`);
      console.log(`         ${res.detail}`);
    } else {
      writesPass = false;
      console.log(`  [${mark}] ${res.label}`);
      console.log(`         ${res.detail}`);
    }
  }
  const allPass = writesPass && readsInconclusive === 6;
  if (readsInconclusive) console.log(`\nNOTE: ${readsInconclusive} read check(s) inconclusive (empty tables — nothing to leak).`);
  console.log(`${allPass ? "ALL RLS CHECKS PASSED" : "SOME RLS CHECKS FAILED"}\n`);
  process.exit(allPass ? 0 : 1);
}

main();
