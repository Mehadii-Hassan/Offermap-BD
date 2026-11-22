// scripts/check-rls.mjs
// Uses ONLY the public anon key to prove RLS blocks:
//   - reading pending/rejected offers
//   - reading site_visits, activity_log, scrape_runs, scrape_log
//   - insert/update/delete on offers
// Prints PASS/FAIL for each assertion.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function attempt(label, fn) {
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
    const r = await attempt(t.label, t.fn);
    let pass, detail;
    if (r.kind === "error") {
      // RLS blocked the read.
      pass = true;
      detail = `blocked (${r.status || "error"}) ${r.error}`;
    } else if (r.kind === "ok" && r.count > 0) {
      // Read returned data — RLS is NOT blocking.
      pass = false;
      detail = `returned ${r.count} rows`;
    } else {
      // Empty result — can't tell if RLS blocked or table is empty.
      pass = null;
      detail = "empty (inconclusive)";
    }
    results.push({ label: t.label, pass, detail });
  }

  // Writes that MUST be refused.
  const writeTests = [
    { label: "insert on offers refused", fn: () => sb.from("offers").insert({ title: "rls check", shop_name: "x", discount_text: "10% OFF", category: "Other", area: "x", division: "Dhaka", district: "Dhaka", lat: 23.81, lng: 90.41, valid_till: "2099-12-31", source: "user" }) },
    { label: "update on offers refused", fn: () => sb.from("offers").update({ title: "rls check" }).eq("id", "00000000-0000-0000-0000-000000000000") },
    { label: "delete on offers refused", fn: () => sb.from("offers").delete().eq("id", "00000000-0000-0000-0000-000000000000") },
  ];

  for (const t of writeTests) {
    const r = await attempt(t.label, t.fn);
    const pass = r.kind === "error";
    results.push({ label: t.label, pass, detail: pass ? `refused (${r.status || "error"}) ${r.error}` : `NOT refused: ${JSON.stringify(r)}` });
  }

  console.log("\n=== RLS check (public anon key) ===\n");
  let allPass = true;
  let inconclusive = 0;
  for (const res of results) {
    if (res.pass === null) {
      inconclusive++;
      console.log(`  [? ] ${res.label}`);
      console.log(`         ${res.detail}`);
      continue;
    }
    const mark = res.pass ? "PASS" : "FAIL";
    if (!res.pass) allPass = false;
    console.log(`  [${mark}] ${res.label}`);
    console.log(`         ${res.detail}`);
  }
  console.log(`\n${inconclusive > 0 ? `NOTE: ${inconclusive} read check(s) inconclusive (empty tables).` : ""}`);
  console.log(`${allPass && inconclusive === 0 ? "ALL RLS CHECKS PASSED" : "SOME RLS CHECKS FAILED OR INCONCLUSIVE"}\n`);
  process.exit(allPass && inconclusive === 0 ? 0 : 1);
}

main();
