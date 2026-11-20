// deploy-check.js - verify the Vercel (GitHub) deployment for HEAD succeeded.
// Prints "SUCCESS <environment_url>" and exits 0 on success, otherwise prints a
// FAIL reason and exits non-zero. Never prints secrets (no token required).
//
// Usage: node scripts/deploy-check.js  (called by scripts/verify.js)

const { execSync } = require("child_process");

const REPO = "Mehadii-Hassan/Offermap-BD";
const MAX_TRIES = 8;
const WAIT_MS = 20000;

function headSha() {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "offermap-verify",
      ...(process.env.GITHUB_TOKEN
        ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
        : {}),
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  return res.json();
}

function fail(msg) {
  console.log(`FAIL deploy - ${msg}`);
  process.exit(1);
}

async function main() {
  const sha = headSha();
  if (!sha) fail("cannot resolve HEAD");

  const deployments = await getJson(
    `https://api.github.com/repos/${REPO}/deployments?sha=${sha}`
  );
  if (!Array.isArray(deployments) || deployments.length === 0) {
    fail("no deployment found for HEAD (check the Vercel Git integration)");
  }

  const newest = deployments[0];
  const statusesUrl =
    newest.statuses_url ||
    `https://api.github.com/repos/${REPO}/deployments/${newest.id}/statuses`;

  let last = null;
  for (let i = 0; i < MAX_TRIES; i++) {
    const statuses = await getJson(statusesUrl);
    if (Array.isArray(statuses) && statuses.length) {
      last = statuses[0];
      if (last.state === "success") {
        const env = last.environment_url || "";
        console.log(`SUCCESS ${env}`.trim());
        process.exit(0);
      }
      if (last.state === "failure" || last.state === "error") {
        fail(`state ${last.state} (${last.log_url || "no log_url"})`);
      }
    }
    if (i < MAX_TRIES - 1) await sleep(WAIT_MS);
  }

  const state = last ? last.state : "no-status";
  const log = last && last.log_url ? last.log_url : "no log_url";
  fail(`state ${state} (${log})`);
}

main().catch((e) => fail(e.message));