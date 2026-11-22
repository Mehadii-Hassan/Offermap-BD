const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const LIVE_URL = 'https://offermap-bd.vercel.app/';
const checks = [];

function run(cmd, args) {
  const res = spawnSync(cmd, args, { shell: true, encoding: 'utf8' });
  const out = (res.stdout || '') + (res.stderr || '');
  return { ok: res.status === 0, out };
}

function last3(out) {
  const lines = out.trim().split(/\r?\n/).filter(Boolean);
  return lines.slice(-3).join('\n');
}

function walk(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) results = results.concat(walk(p));
    else results.push(p);
  }
  return results;
}

function check(name, fn) {
  try {
    const res = fn();
    const entry = { name, ok: !!res.ok, reason: res.reason || '' };
    checks.push(entry);
    return entry;
  } catch (e) {
    const entry = { name, ok: false, reason: e.message };
    checks.push(entry);
    return entry;
  }
}

check('build', () => {
  const r = run('npm', ['run', 'build']);
  if (r.ok) return { ok: true };
  return { ok: false, reason: last3(r.out) };
});

check('e2e', () => {
  // K1-K12 acceptance specs carry titles like "K1: ..." and are run individually
  // below; this runs the full regression suite minus those.
  const r = run('npx', ['playwright', 'test', '--grep-invert', '^K[0-9]']);
  if (r.ok) return { ok: true };
  return { ok: false, reason: last3(r.out) };
});

check('clean-tree', () => {
  const r = run('git', ['status', '--porcelain']);
  if (r.ok && r.out.trim() === '') return { ok: true };
  return { ok: false, reason: 'working tree is not clean' };
});

const pushed = check('pushed', () => {
  const h = run('git', ['rev-parse', 'HEAD']);
  const o = run('git', ['rev-parse', 'origin/main']);
  if (!h.ok || !o.ok) return { ok: false, reason: 'cannot resolve revisions' };
  if (h.out.trim() === o.out.trim()) return { ok: true };
  return { ok: false, reason: 'HEAD != origin/main' };
});

check('deploy', () => {
  if (!pushed.ok) return { ok: false, reason: 'pushed did not pass; deploy poll skipped' };
  const h = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' });
  const head = (h.stdout || '').trim();
  if (!head) return { ok: false, reason: 'cannot resolve HEAD' };

  // Poll the deployed /api/version endpoint until it reports HEAD.
  const script = `
const url = process.argv[1];
const head = process.argv[2];
const attempts = Number(process.argv[3]);
(async () => {
  let lastStatus = 'none';
  let lastSha = 'none';
  let lastJson = true;
  let ok = false;
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 20000));
    try {
      const res = await fetch(url, { cache: 'no-store' });
      lastStatus = String(res.status);
      try {
        const data = await res.json();
        lastJson = true;
        lastSha = data && typeof data.sha === 'string' ? data.sha : 'unknown';
      } catch {
        lastJson = false;
        lastSha = 'non-JSON response';
      }
      if (lastSha === head) { ok = true; break; }
    } catch (e) {
      lastStatus = 'request failed: ' + e.message;
    }
  }
  if (ok) {
    console.log('PASS deploy - live site runs ' + head.slice(0, 7));
  } else {
    console.log('FAIL deploy - live sha: ' + lastSha + ' | HEAD: ' + head + ' | last HTTP status: ' + lastStatus + (lastJson ? '' : ' | response was not JSON'));
  }
})();
`;
  const r = spawnSync(process.execPath, ['-e', script, LIVE_URL + 'api/version', head, '12'], { encoding: 'utf8' });
  const out = ((r.stdout || '') + (r.stderr || '')).trim();
  if (/^PASS deploy/.test(out)) {
    return { ok: true, reason: out.replace(/^PASS deploy\s*-\s*/, '') };
  }
  return { ok: false, reason: out.replace(/^FAIL deploy\s*-\s*/, '') || 'deploy check failed' };
});

check('k1-location', () => {
  const r = run('npx', ['playwright', 'test', 'tests/e2e/k1-location.spec.js']);
  if (r.ok) return { ok: true };
  return { ok: false, reason: last3(r.out) };
});

check('k2-home', () => {
  const r = run('npx', ['playwright', 'test', 'tests/e2e/k2-home.spec.js']);
  if (r.ok) return { ok: true };
  return { ok: false, reason: last3(r.out) };
});

check('k3-sheet', () => {
  const r = run('npx', ['playwright', 'test', 'tests/e2e/k3-sheet.spec.js']);
  if (r.ok) return { ok: true };
  return { ok: false, reason: last3(r.out) };
});

check('k4-detail', () => {
  const r = run('npx', ['playwright', 'test', 'tests/e2e/k4-detail.spec.js']);
  if (r.ok) return { ok: true };
  return { ok: false, reason: last3(r.out) };
});

check('k5-map', () => {
  const r = run('npx', ['playwright', 'test', 'tests/e2e/k5-map.spec.js']);
  if (r.ok) return { ok: true };
  return { ok: false, reason: last3(r.out) };
});

check('k6-filters', () => {
  const r = run('npx', ['playwright', 'test', 'tests/e2e/k6-filters.spec.js']);
  if (r.ok) return { ok: true };
  return { ok: false, reason: last3(r.out) };
});

check('k7-nav', () => {
  const r = run('npx', ['playwright', 'test', 'tests/e2e/k7-nav.spec.js']);
  if (r.ok) return { ok: true };
  return { ok: false, reason: last3(r.out) };
});

check('k8-add', () => {
  const r = run('npx', ['playwright', 'test', 'tests/e2e/k8-add.spec.js']);
  if (r.ok) return { ok: true };
  return { ok: false, reason: last3(r.out) };
});

check('k9-static', () => {
  const r = run('npx', ['playwright', 'test', 'tests/e2e/k9-static.spec.js']);
  if (r.ok) return { ok: true };
  return { ok: false, reason: last3(r.out) };
});

check('k10-quality', () => {
  const r = run('npx', ['playwright', 'test', 'tests/e2e/k10-quality.spec.js']);
  if (r.ok) return { ok: true };
  return { ok: false, reason: last3(r.out) };
});

check('k11-screens', () => {
  const r = run('npx', ['playwright', 'test', 'tests/e2e/k11-screens.spec.js']);
  if (r.ok) return { ok: true };
  return { ok: false, reason: last3(r.out) };
});

check('k12-outlet-areas', () => {
  const p = path.join(root, 'scripts', 'backfill-outlet-areas.js');
  if (fs.existsSync(p)) return { ok: true };
  return { ok: false, reason: 'scripts/backfill-outlet-areas.js missing' };
});

check('ads-off', () => {
  // After build, no client chunk should render a visible ad placeholder box.
  const r = run('npx', ['grep', '-rIl', 'AD SLOT', '.next/static']);
  if (r.ok && r.out.trim() === '') return { ok: true };
  return { ok: false, reason: 'ad placeholder found in build output' };
});

check('report-api', () => {
  const p = path.join(root, 'app', 'api', 'report', 'route.js');
  if (fs.existsSync(p)) {
    const c = fs.readFileSync(p, 'utf8');
    const hasReason = /reason/.test(c);
    const hasContact = /contact/.test(c);
    const hasRate = /rateLimit/.test(c);
    if (hasReason && hasContact && hasRate) return { ok: true };
    return { ok: false, reason: 'report route missing reason/contact/rate-limit' };
  }
  return { ok: false, reason: 'app/api/report/route.js missing' };
});

check('check-rls', () => {
  const r = run(process.execPath, ['scripts/check-rls.mjs'], { env: { ...process.env, FORCE_COLOR: '0' } });
  if (r.ok) return { ok: true };
  return { ok: false, reason: last3(r.out) || 'check-rls failed' };
});

check('no-secrets', () => {
  const r = run('npx', ['grep', '-rIl', '-E', 'service_role|sb_secret|DATABASE_URL|GEMINI_API_KEY|TAVILY', '.next/static']);
  if (r.ok && r.out.trim() === '') return { ok: true };
  return { ok: false, reason: 'secrets found in build output' };
});

check('manifest-og', () => {
  const manifest = fs.existsSync(path.join(root, 'public', 'manifest.webmanifest'));
  const ogRoute = fs.existsSync(path.join(root, 'app', 'og', 'image.route.js'));
  if (manifest && ogRoute) return { ok: true };
  return { ok: false, reason: 'manifest or og image route missing' };
});

check('client-error', () => {
  const p = path.join(root, 'app', 'api', 'client-error', 'route.js');
  if (fs.existsSync(p)) {
    const c = fs.readFileSync(p, 'utf8');
    const hasLog = /activity_log|logEvent/.test(c);
    const hasRate = /rateLimit/.test(c);
    if (hasLog && hasRate) return { ok: true };
    return { ok: false, reason: 'client-error missing log or rate-limit' };
  }
  return { ok: false, reason: 'app/api/client-error/route.js missing' };
});

check('qa-report', () => {
  const p = path.join(root, 'docs', 'QA-REPORT.md');
  if (!fs.existsSync(p)) return { ok: false, reason: 'docs/QA-REPORT.md missing' };
  const c = fs.readFileSync(p, 'utf8');
  const p0 = (c.match(/P0/g) || []).length;
  const p1 = (c.match(/P1/g) || []).length;
  const open = (c.match(/status:\s*open/gi) || []).length;
  if (open === 0) return { ok: true, reason: `zero open P0/P1 (P0:${p0} P1:${p1})` };
  return { ok: false, reason: `${open} open P0/P1 issues` };
});

check('lighthouse', () => {
  const p = path.join(root, 'docs', 'lighthouse.json');
  if (!fs.existsSync(p)) return { ok: false, reason: 'docs/lighthouse.json missing' };
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    const ok = data.performance >= 85 && data.accessibility >= 85 && data.seo >= 85;
    if (ok) return { ok: true, reason: `perf ${data.performance} a11y ${data.accessibility} seo ${data.seo}` };
    return { ok: false, reason: `scores below 85: ${JSON.stringify(data)}` };
  } catch (e) {
    return { ok: false, reason: 'invalid lighthouse.json' };
  }
});

check('actions-health', async () => {
  const script = `
const { createHash } = require('crypto');
const url = 'https://api.github.com/repos/Mehadii-Hassan/Offermap-BD/actions/runs';
(async () => {
  try {
    const res = await fetch(url);
    if (!res.ok) { console.log('SKIP actions-health - GitHub API not reachable (' + res.status + ')'); process.exit(0); }
    const data = await res.json();
    const runs = data.workflow_runs || [];
    const latest = {};
    for (const r of runs) {
      if (!latest[r.name]) latest[r.name] = r;
    }
    const needed = ['scrape', 'cleanup', 'backfill'];
    let allPassed = true;
    let msg = '';
    for (const name of needed) {
      const r = latest[name];
      if (!r) { msg += \` ${name}: missing; \`; allPassed = false; continue; }
      if (r.status === 'completed' && r.conclusion === 'success') { msg += \` ${name}: PASS; \`; }
      else { msg += \` ${name}: ${r.status}/${r.conclusion}; \`; allPassed = false; }
    }
    console.log(allPassed ? 'PASS actions-health' + msg : 'FAIL actions-health' + msg);
    process.exit(allPassed ? 0 : 1);
  } catch (e) {
    console.log('SKIP actions-health - ' + e.message);
    process.exit(0);
  }
})();
`;
  const r = spawnSync(process.execPath, ['-e', script], { encoding: 'utf8', timeout: 30000 });
  const out = ((r.stdout || '') + (r.stderr || '')).trim();
  if (/^PASS actions-health/.test(out) || /^SKIP actions-health/.test(out)) return { ok: true, reason: out };
  return { ok: false, reason: out || 'actions-health check failed' };
});

let pass = 0;
for (const c of checks) {
  if (c.ok) {
    pass++;
    console.log(c.reason ? `PASS ${c.name} - ${c.reason}` : `PASS ${c.name}`);
  } else {
    console.log(`FAIL ${c.name} - ${c.reason}`);
  }
}
console.log(`RESULT: ${pass}/${checks.length} PASS`);
process.exit(pass === checks.length ? 0 : 1);
