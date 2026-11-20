const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = process.cwd();
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
    checks.push({ name, ok: !!res.ok, reason: res.reason || '' });
  } catch (e) {
    checks.push({ name, ok: false, reason: e.message });
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

check('pushed', () => {
  const h = run('git', ['rev-parse', 'HEAD']);
  const o = run('git', ['rev-parse', 'origin/main']);
  if (!h.ok || !o.ok) return { ok: false, reason: 'cannot resolve revisions' };
  if (h.out.trim() === o.out.trim()) return { ok: true };
  return { ok: false, reason: 'HEAD != origin/main' };
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

check('j6-screens', () => {
  const dp = path.join(root, 'docs', 'screens');
  if (!fs.existsSync(dp)) return { ok: false, reason: 'docs/screens missing' };
  const pngs = fs.readdirSync(dp).filter(f => f.toLowerCase().endsWith('.png'));
  if (pngs.length >= 20) return { ok: true };
  return { ok: false, reason: `only ${pngs.length} .png files` };
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
    console.log(`PASS ${c.name}`);
  } else {
    console.log(`FAIL ${c.name} - ${c.reason}`);
  }
}
console.log(`RESULT: ${pass}/${checks.length} PASS`);
process.exit(pass === checks.length ? 0 : 1);
