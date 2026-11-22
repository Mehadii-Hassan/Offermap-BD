// scripts/verify.js - split, non-blocking verification checks.
//
//   npm run verify:fast   (< 3 min) git state + live HTTP checks
//   npm run verify:rls    runs scripts/check-rls.mjs
//   npm run verify:secrets greps .next build output for secrets
//   npm run verify:e2e    runs local Playwright suite in background
//   npm run verify          fast + rls + secrets, then tells you to run verify:e2e
//
// Each check can fail. No step blocks longer than ~2.5 minutes.

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const LIVE_URL = (process.env.LIVE_URL || "https://offermap-bd.vercel.app").replace(/\/$/, "");
const LOGS_DIR = path.join(root, "logs");
const { execSync } = require("child_process");

function ensureLogsDir() {
  if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
}

function lastN(out, n = 6) {
  const lines = (out || "").trim().split(/\r?\n/).filter(Boolean);
  return lines.slice(-n).join("\n");
}

function execHead() {
  try { return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim(); } catch (e) { return null; }
}
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function fetchWithTimeout(url, opts = {}, ms = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    const text = await res.text();
    return { status: res.status, headers: Object.fromEntries(res.headers.entries()), text };
  } catch (e) {
    return { error: e.message };
  } finally {
    clearTimeout(timer);
  }
}

// ---------- fast checks ----------

function gitCleanAndPushed() {
  let clean = "";
  try { clean = execSync("git status --porcelain", { encoding: "utf8" }); } catch (e) { return { ok: false, reason: "git status failed" }; }
  if (clean.trim() !== "") return { ok: false, reason: "working tree not clean" };
  let local, remote;
  try { local = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim(); } catch (e) { return { ok: false, reason: "cannot resolve HEAD" }; }
  try { remote = execSync("git rev-parse origin/main", { encoding: "utf8" }).trim(); } catch (e) { return { ok: false, reason: "cannot resolve origin/main" }; }
  if (local !== remote) return { ok: false, reason: "HEAD != origin/main" };
  return { ok: true };
}

async function deployCheck() {
  const head = execHead();
  if (!head) return { ok: false, reason: "cannot resolve HEAD" };
  let last = "none";
  for (let i = 0; i < 6; i++) {
    if (i > 0) await sleep(15000);
    const r = await fetchWithTimeout(`${LIVE_URL}/api/version`, {}, 20000);
    if (r.error) { last = "request failed: " + r.error; continue; }
    try {
      const data = JSON.parse(r.text);
      if (data && data.sha === head) return { ok: true, reason: `live runs ${head.slice(0,7)}` };
      last = `live sha ${String(data.sha).slice(0,7)} != head ${head.slice(0,7)}`;
    } catch (e) { last = `non-JSON (${r.status})`; }
  }
  return { ok: false, reason: last };
}

async function adsTxt404() {
  const r = await fetchWithTimeout(`${LIVE_URL}/ads.txt`, {}, 20000);
  if (r.error) return { ok: false, reason: "request failed: " + r.error };
  if (r.status === 404) return { ok: true };
  return { ok: false, reason: `/ads.txt returned ${r.status}, expected 404 (ads off)` };
}

async function terms200() {
  const r = await fetchWithTimeout(`${LIVE_URL}/terms`, {}, 20000);
  if (r.error) return { ok: false, reason: "request failed: " + r.error };
  if (r.status === 200) return { ok: true };
  return { ok: false, reason: `/terms returned ${r.status}` };
}

async function noAdPlaceholderHome() {
  const r = await fetchWithTimeout(`${LIVE_URL}/`, {}, 20000);
  if (r.error) return { ok: false, reason: "request failed: " + r.error };
  const low = r.text.toLowerCase();
  if (low.includes("adsbygoogle") || low.includes("data-ad-slot") || low.includes("adslot")) {
    return { ok: false, reason: "home HTML contains an ad placeholder" };
  }
  return { ok: true };
}

async function securityHeaders() {
  const r = await fetchWithTimeout(`${LIVE_URL}/`, {}, 20000);
  if (r.error) return { ok: false, reason: "request failed: " + r.error };
  const h = r.headers;
  const missing = [];
  if (!h["x-content-type-options"]) missing.push("X-Content-Type-Options");
  if (!h["referrer-policy"]) missing.push("Referrer-Policy");
  if (missing.length) return { ok: false, reason: "missing headers: " + missing.join(", ") };
  return { ok: true };
}

async function manifest200() {
  const r = await fetchWithTimeout(`${LIVE_URL}/manifest.webmanifest`, {}, 20000);
  if (r.error) return { ok: false, reason: "request failed: " + r.error };
  if (r.status === 200) return { ok: true };
  return { ok: false, reason: `manifest returned ${r.status}` };
}

async function ppGeolocationSelf() {
  const r = await fetchWithTimeout(`${LIVE_URL}/`, {}, 20000);
  if (r.error) return { ok: false, reason: "request failed: " + r.error };
  const pp = r.headers["permissions-policy"] || "";
  if (!/geolocation=\(self\)/i.test(pp)) return { ok: false, reason: `Permissions-Policy missing geolocation=(self): ${pp}` };
  return { ok: true };
}

async function ogFor(page) {
  const r = await fetchWithTimeout(`${LIVE_URL}${page.path}`, {}, 25000);
  if (r.error) return { ok: false, reason: `${page.name}: request failed: ${r.error}` };
  const html = r.text;
  const title = /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i.exec(html);
  const image = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i.exec(html);
  const desc = /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i.exec(html);
  const missing = [];
  if (!title) missing.push("og:title");
  if (!image) missing.push("og:image");
  if (!desc) missing.push("og:description");
  if (missing.length) return { ok: false, reason: `${page.name}: missing ${missing.join(", ")}` };
  return { ok: true, reason: `${page.name}: og ok` };
}

// ---------- rls ----------
function checkRls() {
  const rlspath = path.join(root, "scripts", "check-rls.mjs");
  if (!fs.existsSync(rlspath)) return { ok: false, reason: "scripts/check-rls.mjs missing" };
  try {
    const out = execSync(`node --env-file=.env.local ${rlspath}`, { encoding: "utf8", timeout: 120000, env: { ...process.env, FORCE_COLOR: "0" } });
    if (/ALL RLS CHECKS PASSED/.test(out)) return { ok: true, reason: lastN(out) };
    return { ok: false, reason: lastN(out) || "check-rls did not report pass" };
  } catch (e) {
    return { ok: false, reason: lastN(e.stdout || e.stderr || "") || e.message };
  }
}

// ---------- secrets ----------
function walkFiles(dir) {
  let results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) results = results.concat(walkFiles(p));
      else results.push(p);
    }
  } catch (e) { /* ignore */ }
  return results;
}

function noSecrets() {
  const nextDir = path.join(root, ".next");
  if (!fs.existsSync(nextDir)) {
    return { ok: false, reason: ".next missing; run `npm run build` first, then verify:secrets" };
  }
  const patterns = [/service_role/i, /sb_secret/i, /DATABASE_URL/i, /GEMINI_API_KEY/i, /TAVILY/i];
  const found = [];
  const dirs = [path.join(nextDir, "static")];
  for (const d of dirs) {
    if (!fs.existsSync(d)) continue;
    for (const file of walkFiles(d)) {
      try {
        const content = fs.readFileSync(file, "utf8");
        for (const pat of patterns) {
          if (pat.test(content)) found.push(`${path.relative(root, file)}: matches ${pat}`);
        }
      } catch (e) { /* skip binary/unreadable */ }
    }
  }
  if (found.length) return { ok: false, reason: "secrets found in build output:\n" + found.slice(0, 20).join("\n") };
  return { ok: true };
}

// ---------- e2e ----------
function runE2E() {
  ensureLogsDir();
  const logFile = path.join(LOGS_DIR, "e2e.txt");
  const child = spawn("npx", ["playwright", "test", "--reporter=line"], {
    cwd: root, stdio: ["ignore", "pipe", "pipe"],
  });
  const out = fs.createWriteStream(logFile, { flags: "w" });
  child.stdout.pipe(out, { end: false });
  child.stderr.pipe(out, { end: false });
  child.on("close", (code) => {
    out.end();
    fs.appendFileSync(logFile, `\n\nEXIT CODE: ${code}\n`);
    console.log(`verify:e2e finished with exit code ${code}; see logs/e2e.txt`);
  });
  console.log(`verify:e2e started in background; logging to logs/e2e.txt`);
}

// ---------- main ----------
async function runFast() {
  const results = [];
  const run = (name, fn) => {
    try { const res = fn(); results.push({ name, ...res }); console.log(res.ok ? `PASS ${name}` : `FAIL ${name} - ${res.reason}`); return res; }
    catch (e) { results.push({ name, ok: false, reason: e.message }); console.log(`FAIL ${name} - ${e.message}`); return { ok: false, reason: e.message }; }
  };
  const asyncRun = async (name, fn) => {
    try { const res = await fn(); results.push({ name, ...res }); console.log(res.ok ? `PASS ${name}` : `FAIL ${name} - ${res.reason}`); return res; }
    catch (e) { results.push({ name, ok: false, reason: e.message }); console.log(`FAIL ${name} - ${e.message}`); return { ok: false, reason: e.message }; }
  };

  await asyncRun("git-clean-and-pushed", gitCleanAndPushed);
  await asyncRun("deploy", deployCheck);
  await asyncRun("ads-off-ads-txt-404", adsTxt404);
  await asyncRun("terms-200", terms200);
  await asyncRun("no-ad-placeholder-home", noAdPlaceholderHome);
  await asyncRun("security-headers", securityHeaders);
  await asyncRun("manifest-200", manifest200);
  await asyncRun("pp-geolocation-self", ppGeolocationSelf);
  await asyncRun("og-home", () => ogFor({ name: "home", path: "/" }));
  await asyncRun("og-offers-dhaka", () => ogFor({ name: "offers/dhaka", path: "/offers/dhaka" }));

  const pass = results.filter(r => r.ok).length;
  console.log(`\nverify:fast RESULT: ${pass}/${results.length} PASS`);
  return results.every(r => r.ok);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("e2e")) { runE2E(); return; }

  let allOk = true;
  if (args.includes("rls") || args.length === 0) {
    const r = checkRls();
    console.log(r.ok ? `PASS check-rls` : `FAIL check-rls - ${r.reason}`);
    if (!r.ok) allOk = false;
  }
  if (args.includes("secrets") || args.length === 0) {
    const r = noSecrets();
    console.log(r.ok ? `PASS no-secrets` : `FAIL no-secrets - ${r.reason}`);
    if (!r.ok) allOk = false;
  }
  if (args.includes("fast") || args.length === 0) {
    const fastOk = await runFast();
    if (!fastOk) allOk = false;
  }

  if (args.length === 0) {
    console.log("\nfast + rls + secrets done.");
    if (allOk) {
      console.log("All non-e2e checks PASS. Run `npm run verify:e2e` for the full e2e suite.");
    } else {
      console.log("Fix failures above, then run `npm run verify:e2e`.");
      process.exit(1);
    }
  } else {
    process.exit(allOk ? 0 : 1);
  }
}

main();
