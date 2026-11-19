#!/usr/bin/env node
/*
 * Race Club: keeps the site's RaceRoom pictures complete and current.
 *
 * Run by the GitHub workflow .github/workflows/r3e-sync.yml (daily, or by hand from the Actions tab).
 * It can also be run on a computer with Node 18 or newer:
 *   node tools/r3e-sync.mjs
 *
 * What it does, in order
 *   1. Refreshes raceroom-data/r3e-data.json from RaceRoom's public GitHub repo (only if it changed).
 *   2. For every livery, class and manufacturer in that file, makes sure ONE picture exists in assets/r3e/,
 *      named by its ID. Anything missing is downloaded from the RaceRoom store. Nothing is ever downloaded twice.
 *   3. Writes assets/r3e/index.json (a small lookup the website uses: which car, class and brand an ID belongs to).
 *   4. Writes assets/r3e/report.json (what we have, and which IDs the store does not have).
 *
 * Pictures kept (one file per ID, so a brand logo or a class picture is stored once, not once per car):
 *   assets/r3e/liveries/small/<livery id>.webp      every livery
 *   assets/r3e/liveries/full/<livery id>.webp       the default livery of every car (the big car picture)
 *   assets/r3e/classes/<class id>.webp
 *   assets/r3e/manufacturers/<manufacturer id>.webp
 *
 * Options
 *   --out <folder>        where the "r3e" folder goes (default: assets)
 *   --data <file>         our copy of r3e-data.json (default: raceroom-data/r3e-data.json)
 *   --data-url <address>  where the original is (default: RaceRoom's repo)
 *   --no-refresh          do not fetch a new r3e-data.json first
 *   --recheck-missing     ask the store again about IDs it did not have last time (otherwise they are skipped)
 *   --from <folder>       an older folder of scraped pictures (named Livery:ID:small.webp etc.) to copy from first
 *   --base <address>      the store's picture address (default: the RaceRoom store)
 *   --delay <ms>          pause between downloads (default 150)
 *   --dry-run             count only, change nothing
 *
 * It exits with an error (and writes nothing) when the store looks blocked, so a broken run never commits junk.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const SOURCE = 'r3e';   // later sources (for example custom liveries) get their own folder and their own address
const STORE = 'https://game.raceroomracing.com/cdn/apex-production/';
const DATA_URL = 'https://raw.githubusercontent.com/kwstudios-sweden/r3e-spectator-overlay/master/r3e-data.json';

/* ---------- options ---------- */
const opts = { out: 'assets', data: 'raceroom-data/r3e-data.json', dataUrl: DATA_URL, refresh: true, recheck: false, from: '', base: STORE, delay: 150, dry: false };
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i], next = () => process.argv[++i];
  if (a === '--out') opts.out = next();
  else if (a === '--data') opts.data = next();
  else if (a === '--data-url') opts.dataUrl = next();
  else if (a === '--no-refresh') opts.refresh = false;
  else if (a === '--recheck-missing') opts.recheck = true;
  else if (a === '--from') opts.from = next();
  else if (a === '--base') opts.base = next();
  else if (a === '--delay') opts.delay = Number(next());
  else if (a === '--dry-run') opts.dry = true;
  else { console.error('Unknown option: ' + a); process.exit(2); }
}
if (!opts.base.endsWith('/')) opts.base += '/';
if (typeof fetch !== 'function') { console.error('This needs Node 18 or newer. Run: node --version'); process.exit(2); }
const OUT = path.join(path.resolve(opts.out), SOURCE);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- 1. refresh the data file ---------- */
async function loadData() {
  const file = path.resolve(opts.data);
  let current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (opts.refresh) {
    try {
      const res = await fetch(opts.dataUrl);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const text = await res.text();
      const d = JSON.parse(text);
      const ok = d && d.cars && d.liveries && d.classes && d.manufacturers &&
        Object.keys(d.cars).length > 100 && Object.keys(d.liveries).length > 1000;
      if (!ok) throw new Error('the file does not look like r3e-data.json');
      if (text !== current) {
        if (!opts.dry) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); }
        console.log('r3e-data.json: updated (' + Object.keys(d.liveries).length + ' liveries).');
        current = text;
      } else console.log('r3e-data.json: already current.');
    } catch (e) {
      if (!current) throw new Error('Could not fetch r3e-data.json and there is no saved copy: ' + e.message);
      console.log('r3e-data.json: could not refresh (' + e.message + '), using the saved copy.');
    }
  }
  return JSON.parse(current);
}
const data = await loadData();

/* ---------- 2. what we need ---------- */
const jobs = [];   // { kind, id, storeName, file }
const seen = new Set();
function want(kind, id, storeName, rel) {
  const key = kind + ':' + id;
  if (seen.has(key)) return;
  seen.add(key);
  jobs.push({ kind, id: String(id), storeName, file: path.join(OUT, rel) });
}
for (const l of Object.values(data.liveries)) want('liveries-small', l.Id, 'Livery:' + l.Id + ':small.webp', 'liveries/small/' + l.Id + '.webp');
for (const c of Object.values(data.cars)) if (c.DefaultLivery) want('liveries-full', c.DefaultLivery, 'Livery:' + c.DefaultLivery + ':full.webp', 'liveries/full/' + c.DefaultLivery + '.webp');
for (const c of Object.values(data.classes)) want('classes', c.Id, 'CarClass:' + c.Id + ':small.webp', 'classes/' + c.Id + '.webp');
for (const m of Object.values(data.manufacturers)) want('manufacturers', m.Id, 'CarManufactor:' + m.Id + ':on_dark_big.webp', 'manufacturers/' + m.Id + '.webp');

/* IDs the store did not have last time: skipped unless --recheck-missing */
const reportFile = path.join(OUT, 'report.json');
const knownMissing = new Set();
if (!opts.recheck && fs.existsSync(reportFile)) {
  try {
    const r = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
    for (const k of Object.keys(r.notInStore || {})) for (const id of r.notInStore[k]) knownMissing.add(k + ':' + id);
  } catch (e) { /* an unreadable report just means we ask the store about everything */ }
}

/* an older folder of scraped pictures (optional) */
const old = new Map();
if (opts.from && fs.existsSync(opts.from)) {
  for (const dir of fs.readdirSync(opts.from, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const p = path.join(opts.from, dir.name);
    for (const f of fs.readdirSync(p)) if (/^(Livery|CarClass|CarManufactor):\d+:\w+\.webp$/.test(f) && !old.has(f)) old.set(f, path.join(p, f));
  }
}

/* ---------- 3. get the missing pictures ---------- */
const isWebp = (b) => b.length > 500 && b.slice(0, 4).toString('latin1') === 'RIFF' && b.slice(8, 12).toString('latin1') === 'WEBP';
async function download(name) {
  const url = opts.base + name;
  let last = '';
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (res.status === 404 || res.status === 410) return { state: 'not-in-store' };
      if (!res.ok) last = 'HTTP ' + res.status;
      else {
        const buf = Buffer.from(await res.arrayBuffer());
        return isWebp(buf) ? { state: 'downloaded', buf } : { state: 'not-in-store' };   // an answer that is not a picture means there is none
      }
    } catch (e) { last = String((e && e.cause && e.cause.code) || (e && e.message) || e); }
    await sleep(800 * attempt);
  }
  return { state: 'failed', detail: last };
}
function save(file, buf) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.part';
  fs.writeFileSync(tmp, buf);
  fs.renameSync(tmp, file);
}

const run = { copied: 0, downloaded: 0, skippedKnownMissing: 0, wouldDownload: 0, failed: [] };
const notInStore = {};
let tried = 0, worked = 0, stopping = false;
process.on('SIGINT', () => { stopping = true; console.log('\nStopping after this file. Run the same command again to carry on.'); });
for (const j of jobs) {
  if (stopping) break;
  if (fs.existsSync(j.file)) continue;
  const fromOld = old.get(j.storeName);
  if (fromOld) { if (!opts.dry) save(j.file, fs.readFileSync(fromOld)); run.copied++; continue; }
  if (knownMissing.has(j.kind + ':' + j.id)) { (notInStore[j.kind] = notInStore[j.kind] || []).push(Number(j.id)); run.skippedKnownMissing++; continue; }
  if (opts.dry) { run.wouldDownload++; continue; }
  const r = await download(j.storeName);
  tried++;
  if (r.state === 'downloaded') { save(j.file, r.buf); run.downloaded++; worked++; }
  else if (r.state === 'not-in-store') { (notInStore[j.kind] = notInStore[j.kind] || []).push(Number(j.id)); worked++; }
  else run.failed.push(j.kind + ':' + j.id + ' (' + r.detail + ')');
  if (tried === 25 && worked === 0) {
    console.error('\nSTOPPED: the first 25 requests all failed (' + (run.failed[0] || '') + '). The store looks blocked or unreachable from here. Nothing was changed.');
    process.exit(1);
  }
  if (tried % 100 === 0) console.log('...' + tried + ' store requests so far');
  await sleep(opts.delay);
}

/* ---------- 4. the lookup file and the report (the same text every time when nothing changed) ---------- */
const byNumber = (a, b) => Number(a) - Number(b);
function sortedObject(o) { const out = {}; for (const k of Object.keys(o).sort(byNumber)) out[k] = o[k]; return out; }
const index = { v: 1, source: SOURCE, liveries: {}, cars: {}, classes: {}, manufacturers: {} };
for (const l of Object.values(data.liveries)) index.liveries[l.Id] = [l.Car, l.Name || '', l.TeamName || ''];
for (const c of Object.values(data.cars)) index.cars[c.Id] = [c.Name, c.CarManufacturer, c.Class, c.DefaultLivery];
for (const c of Object.values(data.classes)) index.classes[c.Id] = c.Name;
for (const m of Object.values(data.manufacturers)) index.manufacturers[m.Id] = m.Name;
for (const k of ['liveries', 'cars', 'classes', 'manufacturers']) index[k] = sortedObject(index[k]);

const report = { source: SOURCE, totals: {}, have: {}, notInStore: {} };
for (const j of jobs) {
  report.totals[j.kind] = (report.totals[j.kind] || 0) + 1;
  if (fs.existsSync(j.file) || (opts.dry && old.has(j.storeName))) report.have[j.kind] = (report.have[j.kind] || 0) + 1;
}
for (const k of Object.keys(notInStore)) report.notInStore[k] = [...new Set(notInStore[k])].sort(byNumber);

if (!opts.dry) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index));
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 1) + '\n');
}

console.log('\nDone' + (opts.dry ? ' (dry run: nothing was written)' : '') + '.');
console.log('  copied from the old folder: ' + run.copied + '   downloaded: ' + run.downloaded + '   would download: ' + run.wouldDownload +
  '   skipped (store did not have them last time): ' + run.skippedKnownMissing + '   failed: ' + run.failed.length);
for (const k of Object.keys(report.totals)) console.log('  ' + k.padEnd(15) + ' have ' + (report.have[k] || 0) + ' of ' + report.totals[k] + (report.notInStore[k] ? ' (store has no picture for ' + report.notInStore[k].length + ')' : ''));
if (run.failed.length) { console.log('  Network problems on ' + run.failed.length + ' files. They are tried again next time.'); process.exitCode = 0; }
