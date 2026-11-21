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
  const r = run('npx', ['playwright', 'test']);
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

check('j1-header', () => {
  const p = path.join(root, 'next.config.js');
  const s = fs.readFileSync(p, 'utf8');
  if (s.includes('geolocation=(self)')) return { ok: true };
  return { ok: false, reason: 'next.config.js missing geolocation=(self)' };
});

check('j1-geo-route', () => {
  for (const ext of ['js', 'ts']) {
    const p = path.join(root, 'app', 'api', 'geo', `route.${ext}`);
    if (fs.existsSync(p)) return { ok: true };
  }
  return { ok: false, reason: 'app/api/geo/route.js(.ts) missing' };
});

check('j1-inapp', () => {
  for (const d of ['components', 'lib']) {
    const dp = path.join(root, d);
    if (!fs.existsSync(dp)) continue;
    for (const f of walk(dp)) {
      try {
        if (fs.readFileSync(f, 'utf8').includes('FBAN')) return { ok: true };
      } catch {}
    }
  }
  return { ok: false, reason: 'no FBAN in components/ or lib/' };
});

check('j2-bangla-font', () => {
  const dir = path.join(root, 'app');
  for (const e of fs.readdirSync(dir)) {
    if (!e.startsWith('layout.')) continue;
    const p = path.join(dir, e);
    if (fs.readFileSync(p, 'utf8').includes('Hind_Siliguri')) return { ok: true };
  }
  return { ok: false, reason: 'app/layout.* missing Hind_Siliguri' };
});

check('j2-tokens', () => {
  const css = fs.readFileSync(path.join(root, 'app', 'globals.css'), 'utf8');
  const rootBlock = (css.match(/:root\s*\{[\s\S]*?\}/) || [''])[0];
  const lightBlock = (css.match(/html\.light\s*\{[\s\S]*?\}/) || [''])[0];
  const core = ['--background', '--surface', '--surface-2', '--border', '--text', '--text-muted', '--accent', '--gradient'];
  for (const v of core) {
    if (!rootBlock.includes(v + ':')) return { ok: false, reason: `${v} missing in :root` };
    if (!lightBlock.includes(v + ':')) return { ok: false, reason: `${v} missing in html.light` };
  }
  for (const v of ['--radius', '--shadow-sm', '--shadow-md', '--shadow-lg', '--space-1', '--space-4']) {
    if (!rootBlock.includes(v + ':')) return { ok: false, reason: `${v} missing in :root` };
  }
  return { ok: true };
});

check('j2-primitives', () => {
  const names = ['Button', 'Chip', 'Badge', 'Card', 'Sheet', 'Skeleton', 'Toast'];
  const uiDir = path.join(root, 'components', 'ui');
  for (const n of names) {
    if (!fs.existsSync(path.join(uiDir, `${n}.jsx`))) {
      return { ok: false, reason: `components/ui/${n}.jsx missing` };
    }
  }
  const files = []
    .concat(walk(path.join(root, 'components')))
    .concat(walk(path.join(root, 'app')));
  for (const n of names) {
    let imported = false;
    for (const f of files) {
      if (!/\.(jsx?|tsx?)$/.test(f)) continue;
      if (f === path.join(uiDir, `${n}.jsx`)) continue;
      const s = fs.readFileSync(f, 'utf8');
      if (s.includes(`ui/${n}`) || new RegExp(`from\\s+["']\\./${n}["']`).test(s)) {
        imported = true;
        break;
      }
    }
    if (!imported) return { ok: false, reason: `components/ui/${n} imported nowhere` };
  }
  return { ok: true };
});

check('j2-no-overflow', () => {
  const r = run('npx', ['playwright', 'test', 'tests/e2e/j2-overflow.spec.js']);
  if (r.ok) return { ok: true };
  return { ok: false, reason: last3(r.out) };
});

check('j6-screens', () => {
  const dp = path.join(root, 'docs', 'screens');
  if (!fs.existsSync(dp)) return { ok: false, reason: 'docs/screens missing' };
  const pngs = fs.readdirSync(dp).filter(f => f.toLowerCase().endsWith('.png'));
  if (pngs.length >= 20) return { ok: true };
  return { ok: false, reason: `only ${pngs.length} .png files` };
});

// ---- J3: home + offer card redesign ----

check('j3-hero', () => {
  const r = run('npx', ['playwright', 'test', 'tests/e2e/j3.spec.js', '-g', 'j3: hero']);
  if (r.ok) return { ok: true };
  return { ok: false, reason: last3(r.out) };
});

check('j3-sticky-bar', () => {
  const r = run('npx', ['playwright', 'test', 'tests/e2e/j3.spec.js', '-g', 'j3: sticky']);
  if (r.ok) return { ok: true };
  return { ok: false, reason: last3(r.out) };
});

check('j3-cards', () => {
  const r = run('npx', ['playwright', 'test', 'tests/e2e/j3.spec.js', '-g', 'j3: cards']);
  if (r.ok) return { ok: true };
  return { ok: false, reason: last3(r.out) };
});

check('j3-no-overflow-390', () => {
  const r = run('npx', ['playwright', 'test', 'tests/e2e/j3.spec.js', '-g', 'j3: no-overflow']);
  if (r.ok) return { ok: true };
  return { ok: false, reason: last3(r.out) };
});

check('j3-screens', () => {
  const dp = path.join(root, 'docs', 'screens');
  const names = ['home-390-dark.png', 'home-390-light.png', 'home-1440-dark.png', 'home-1440-light.png'];
  const missing = [];
  let small = 0;
  for (const n of names) {
    const p = path.join(dp, n);
    if (!fs.existsSync(p)) { missing.push(n); continue; }
    if (fs.statSync(p).size <= 30 * 1024) small++;
  }
  if (missing.length) return { ok: false, reason: 'missing ' + missing.join(', ') };
  if (small) return { ok: false, reason: `${small} screenshot(s) <= 30 KB` };
  return { ok: true };
});

check('j6-lighthouse', () => {
  const p = path.join(root, 'docs', 'lighthouse.json');
  if (fs.existsSync(p)) return { ok: true };
  return { ok: false, reason: 'docs/lighthouse.json missing' };
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
