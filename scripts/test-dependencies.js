#!/usr/bin/env node
/**
 * Test esy dependency manifests in order of increasing transitive deps.
 *
 * Usage:
 *   node scripts/test-dependencies.js [--dir esy-dependencies] [--mode fetch|default|package] [--limit N] [--dry]
 *
 * - mode:
 *   - fetch   -> runs `./bale fetch` in each manifest dir (default; fastest)
 *   - default -> runs `./bale` (publishes to local registry + runs e2e) [slow]
 *   - package -> runs `./bale package`
 * - dry: only print sorted order without running commands
 */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function getDirs(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(dir, d.name));
}

function buildGraph(rootDir) {
  const nodes = new Map(); // name -> { name, dir, deps: Set(name) }
  for (const d of getDirs(rootDir)) {
    const manifestPath = path.join(d, 'esy.json');
    if (!fs.existsSync(manifestPath)) continue;
    const m = readJSON(manifestPath);
    const name = m.name;
    const deps = new Set(Object.keys((m.override && m.override.dependencies) || {}));
    nodes.set(name, { name, dir: d, deps });
  }
  return nodes;
}

function transitiveSize(name, nodes, memo, visiting) {
  if (memo.has(name)) return memo.get(name);
  if (visiting.has(name)) return 0; // break cycles defensively
  visiting.add(name);
  const node = nodes.get(name);
  let total = 0;
  if (node) {
    for (const dep of node.deps) {
      total += 1 + transitiveSize(dep, nodes, memo, visiting);
    }
  }
  visiting.delete(name);
  memo.set(name, total);
  return total;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { dir: 'esy-dependencies', mode: 'fetch', limit: Infinity, dry: false, continueOnError: true, outDir: 'dependency-test-results' };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--dir') opts.dir = args[++i];
    else if (a === '--mode') opts.mode = args[++i];
    else if (a === '--limit') opts.limit = parseInt(args[++i], 10);
    else if (a === '--dry') opts.dry = true;
    else if (a === '--no-continue') opts.continueOnError = false;
    else if (a === '--out') opts.outDir = args[++i];
  }
  return opts;
}

function run(cmd, cwd) {
  console.log(`\n>>> ${cmd} (cwd=${cwd})`);
  const started = Date.now();
  try {
    const out = cp.execSync(cmd, { cwd, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, DEBUG: process.env.DEBUG || 'bale*' } });
    const ended = Date.now();
    return { ok: true, stdout: out.toString(), stderr: '', durationMs: ended - started };
  } catch (e) {
    const ended = Date.now();
    return { ok: false, error: e, stdout: (e.stdout || Buffer.alloc(0)).toString(), stderr: (e.stderr || Buffer.alloc(0)).toString(), durationMs: ended - started };
  }
}

function main() {
  const opts = parseArgs();
  const root = path.resolve(opts.dir);
  if (!fs.existsSync(root)) {
    console.error(`Directory not found: ${root}`);
    process.exit(1);
  }
  const nodes = buildGraph(root);
  // Compute transitive sizes within known nodes
  const memo = new Map();
  const visiting = new Set();
  const items = Array.from(nodes.values()).map((n) => {
    const size = transitiveSize(n.name, nodes, memo, visiting);
    return { name: n.name, dir: n.dir, size, direct: n.deps.size };
  });
  // Sort: fewest transitive deps first, then fewer direct deps, then name
  items.sort((a, b) => a.size - b.size || a.direct - b.direct || a.name.localeCompare(b.name));

  console.log('Planned order (least transitive deps first):');
  for (const it of items) {
    console.log(`- ${it.name} (transitive=${it.size}, direct=${it.direct})`);
  }

  if (opts.dry) return;

  const mode = opts.mode;
  const bin = path.resolve('./bale');
  const outRoot = path.resolve(opts.outDir);
  fs.mkdirSync(outRoot, { recursive: true });
  let count = 0;
  const results = [];
  for (const [idx, it] of items.entries()) {
    if (count >= opts.limit) break;
    let res;
    if (mode === 'fetch') res = run(`${bin} fetch`, it.dir);
    else if (mode === 'default') res = run(`${bin}`, it.dir);
    else if (mode === 'package') res = run(`${bin} package`, it.dir);
    else throw new Error(`Unknown mode: ${mode}`);
    const safeName = it.name.replace(/[^a-zA-Z0-9_.-]+/g, '-');
    const outDir = path.join(outRoot, `${String(idx + 1).padStart(2, '0')}-${safeName}`);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'stdout.log'), res.stdout || '');
    fs.writeFileSync(path.join(outDir, 'stderr.log'), res.stderr || '');
    const meta = { name: it.name, dir: it.dir, transitive: it.size, direct: it.direct, ok: res.ok, durationMs: res.durationMs, mode };
    fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify(meta, null, 2));
    results.push(meta);
    if (!res.ok && !opts.continueOnError) {
      break;
    }
    count++;
  }
  // Write a markdown summary
  const lines = [];
  lines.push(`# Dependency Test Report`);
  lines.push('');
  lines.push(`Mode: ${mode}`);
  lines.push('');
  lines.push(`| # | Name | Result | Transitive | Direct | Duration (s) |`);
  lines.push(`|---|------|--------|------------|--------|--------------|`);
  results.forEach((r, i) => {
    lines.push(`| ${i + 1} | ${r.name} | ${r.ok ? 'OK' : 'FAIL'} | ${r.transitive} | ${r.direct} | ${(r.durationMs/1000).toFixed(1)} |`);
  });
  fs.writeFileSync(path.join(outRoot, 'REPORT.md'), lines.join('\n'));
  fs.writeFileSync(path.join(outRoot, 'report.json'), JSON.stringify({ mode, results }, null, 2));
  console.log(`\nSummary written to ${path.join(outRoot, 'REPORT.md')}`);
}

main();
