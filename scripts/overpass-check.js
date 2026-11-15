// overpass-check.js — DIAGNOSE why expand-outlets found 0 OSM matches.
// One query per brand: union brand/name/name:en/operator matches in a Dhaka
// bbox, count matched elements client-side (by which variant matched), with
// endpoint fallback + retry. Prints a table. Prioritizes overpass.osm.ch
// (the only mirror that was reliable in earlier checks).
import https from "https";

const ENDPOINTS = [
  "https://overpass.osm.ch/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];
const UA = "OfferMapBD/1.0 (diagnostic; mailto:contact@offermap-bd.example.com)";
const BBOX = "(23.65,90.30,23.95,90.55)"; // Dhaka
const BRANDS = ["KFC", "Pizza Hut", "Aarong", "Bata", "Agora", "Shwapno", "Domino's",
  "Burger King", "Starbucks", "Dhaka Bank", "Brac Bank", "Grameenphone", "Robi",
  "Banglalink", "Pran", "Meena Bazar", "Lotto", "Apex", "Yellow", "Sailor", "Richman"];
const VARIANTS = ["brand", "name", "name:en", "operator"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function esc(s) { return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"'); }
function post(endpoint, body, ms) {
  return new Promise((resolve) => {
    const u = new URL(endpoint);
    const req = https.request(
      { hostname: u.hostname, path: u.pathname, method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA } },
      (res) => {
        let d = "";
        res.on("data", (c) => { d += c; if (d.length > 4_000_000) req.destroy(); });
        res.on("end", () => resolve({ ok: true, status: res.statusCode, body: d }));
        res.on("error", () => resolve({ ok: false }));
      }
    );
    req.on("error", () => resolve({ ok: false }));
    req.on("timeout", () => { req.destroy(); resolve({ ok: false }); });
    req.setTimeout(ms);
    req.write("data=" + encodeURIComponent(body));
    req.end();
  });
}

function hasWholeWord(text, brand) {
  const hay = String(text || "").toLowerCase();
  const needle = String(brand).toLowerCase();
  return new RegExp(`(^|[^a-z0-9])${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`, "i").test(hay);
}

async function checkBrand(brand) {
  const escaped = esc(brand);
  const all = VARIANTS.map((tag) => `nwr["${tag}"~"${escaped}",i]${BBOX};`).join("");
  const query = `[out:json][timeout:90];(${all});out center 300;`;
  let lastStatus = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    for (const ep of ENDPOINTS) {
      const r = await post(ep, query, 40000);
      lastStatus = r.ok ? r.status : "ERR";
      if (r.ok && r.status === 200) {
        const counts = { brand: 0, name: 0, "name:en": 0, operator: 0 };
        let seen = 0;
        try {
          for (const el of JSON.parse(r.body).elements || []) {
            const t = el.tags || {};
            let hit = false;
            for (const v of VARIANTS) if (hasWholeWord(t[v], brand)) { counts[v]++; hit = true; }
            if (hit) seen++;
          }
        } catch {}
        return { counts, status: r.status, total: seen };
      }
      if (r.ok && (r.status === 429 || r.status === 504)) {
        console.log(`  ${brand}: ${r.status} on ${ep} — retry in 30s`);
        await sleep(30000);
        return await checkBrand(brand); // single retry via recursion
      }
    }
    await sleep(2000);
  }
  return { counts: {}, status: lastStatus ?? "FAILED", total: null };
}

async function main() {
  console.log(`brand | brand | name | name:en | operator | total | status`);
  for (const brand of BRANDS) {
    const r = await checkBrand(brand);
    const c = r.counts;
    console.log(`${brand} | ${c.brand} | ${c.name} | ${c["name:en"]} | ${c.operator} | ${r.total} | ${r.status}`);
    await sleep(2000);
  }
}
main().catch((e) => { console.error("check failed:", e.message); process.exit(1); });