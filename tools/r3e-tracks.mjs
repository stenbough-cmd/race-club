#!/usr/bin/env node
/*
 * Race Club: saves the store's details and pictures for every RaceRoom track.
 * Run by the GitHub workflow (daily) after the picture sync and the car details. See .github/workflows/r3e-sync.yml.
 *
 * A "track" here is exactly what RaceRoom's data file calls a track (and what the store sells): Brands Hatch Indy and
 * Brands Hatch Grand Prix are two tracks with one layout each; Watkins Glen is one track with four layouts.
 *
 * Saved into assets/r3e/:
 *   tracks.json                    per track: venue, country, location, description, type, opened, racedIn, layouts, picture counts
 *   tracks/<track id>/<n>.webp     the store's pictures of the track (1, 2, 3 ...)
 *   layouts/<layout id>.svg        each layout's map
 *   venues/<venue id>.webp         the venue's logo (one per venue, shared by its tracks)
 *   tracks-report.json             what we have, and tracks the store has no page for
 *
 * Store pages are drawn by JavaScript, so each is opened in a hidden browser (Playwright). The address of each page is
 * taken from the store's track list; if a track is not found there, it is built from its name.
 *
 *   node tools/r3e-tracks.mjs               tracks we do not have yet (or that had a network problem last time)
 *   node tools/r3e-tracks.mjs --refresh     every track again (the workflow does this on Mondays)
 *   --recheck-missing  also try tracks whose page was not found last time
 *   --out <folder> (assets)  --data <file> (raceroom-data/r3e-data.json)  --limit <n>
 *   --site <address> (https://game.raceroomracing.com)   --cdn <address> (<site>/cdn/apex-production/)   --spaces <address> (the store's picture storage)
 *
 * Nothing is saved when the store looks blocked (the first 5 pages all fail), so a broken run never saves junk.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const opts = { spaces: 'https://fra1.digitaloceanspaces.com/apex-production/', out: 'assets', data: 'raceroom-data/r3e-data.json', site: 'https://game.raceroomracing.com', cdn: '', refresh: false, recheck: false, limit: 0 };
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i], next = () => process.argv[++i];
  if (a === '--out') opts.out = next(); else if (a === '--data') opts.data = next(); else if (a === '--site') opts.site = next(); else if (a === '--cdn') opts.cdn = next(); else if (a === '--spaces') opts.spaces = next();
  else if (a === '--refresh') opts.refresh = true; else if (a === '--recheck-missing') opts.recheck = true; else if (a === '--limit') opts.limit = Number(next());
  else { console.error('Unknown option: ' + a); process.exit(2); }
}
opts.site = opts.site.replace(/\/+$/, '');
if (!opts.cdn) opts.cdn = opts.site + '/cdn/apex-production/';
if (!opts.cdn.endsWith('/')) opts.cdn += '/';
if (!opts.spaces.endsWith('/')) opts.spaces += '/';   // the store's own unhashed originals
const MAX_GALLERY = 8;

/* ---------- reading one page's text ---------- */
const STOPS = new Set(['TRACK', 'OPENED', 'RACED HERE', 'PRICE', 'INCLUDED IN', 'ADD TO CART', 'LAYOUT', 'NEWS', 'LEADERBOARDS', 'COMPETITIONS', 'STORE', 'PROFILE']);
const num = (s) => { const m = /\d+/.exec(s || ''); return m ? Number(m[0]) : null; };
export function parseTrackText(text) {
  const lines = String(text).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const at = (label) => lines.indexOf(label);
  const iTrack = at('TRACK'), iOpened = at('OPENED');
  if (iTrack < 3 || iOpened < 0) return null;                                 // not a track page
  const val = (label) => { const i = at(label); const v = i >= 0 ? lines[i + 1] : ''; return v === undefined || STOPS.has(v) ? '' : v; };
  const middle = lines.slice(2, iTrack);                                       // location, [version names], description
  const description = middle.length ? middle[middle.length - 1] : '';
  const location = middle.length > 1 ? middle[0] : '';
  const versions = middle.length > 2 ? middle.slice(1, -1) : [];
  const lay = lines.map((l) => /^(\d+) LAYOUTS?$/.exec(l)).filter(Boolean)[0];
  return { venue: lines[0], country: lines[1], location, versions, description, type: val('TRACK'), opened: num(val('OPENED')), racedIn: val('RACED HERE'), layoutCount: lay ? Number(lay[1]) : null };
}
export const slug = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
/* the address from a track's name: "Brands Hatch Circuit - Indy" -> brands-hatch-circuit/indy/2519 ; "Watkins Glen International" -> watkins-glen-international/watkins-glen-international/9176 */
export function guessPath(track) {
  const parts = String(track.Name).split(' - ');
  const venue = parts[0], version = parts.length > 1 ? parts.slice(1).join(' - ') : parts[0];
  return slug(venue) + '/' + slug(version) + '/' + track.Id;
}
/* what the page's own HTML names for this track: gallery pictures, layout maps and the venue logo, with their version tags */
export function findAssets(html, trackId, layoutIds) {
  const out = { gallery: {}, maps: {}, venue: null };
  const g = /Track:(\d+):image_(\d+)_1440p\.webp(\?v=[0-9a-f]+)?/g; let m;
  while ((m = g.exec(html))) if (Number(m[1]) === Number(trackId) && !out.gallery[m[2]]) out.gallery[m[2]] = m[3] || '';
  const l = /TrackLayout:(\d+):map\.svg(\?v=[0-9a-f]+)?/g;
  while ((m = l.exec(html))) if (layoutIds.includes(Number(m[1])) && !out.maps[m[1]]) out.maps[m[1]] = m[2] || '';
  const v = /VenueLogo:(\d+):on_dark_small\.webp(\?v=[0-9a-f]+)?/g; out.venueIds = [];
  while ((m = v.exec(html))) { if (!out.venue) out.venue = { id: Number(m[1]), tag: m[2] || '' }; if (!out.venueIds.includes(Number(m[1]))) out.venueIds.push(Number(m[1])); }
  return out;
}

/* ---------- downloading ---------- */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isWebp = (b) => b.length > 500 && b.slice(0, 4).toString('latin1') === 'RIFF' && b.slice(8, 12).toString('latin1') === 'WEBP';
const isSvg = (b) => b.length > 100 && /<svg[\s>]/.test(b.slice(0, 2000).toString('utf8'));
/* the first address that gives a real picture: 'ok', or 'none' (all said not found), or 'error' (network trouble: try again later) */
async function firstGood(urls, check) {
  let trouble = false;
  for (const url of urls) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000) });
        if (res.status === 404 || res.status === 410 || res.status === 403) break;
        if (!res.ok) { trouble = true; await sleep(600 * attempt); continue; }
        const buf = Buffer.from(await res.arrayBuffer());
        if (check(buf)) return { state: 'ok', buf };
        break;
      } catch (e) { trouble = true; await sleep(600 * attempt); }
    }
  }
  return { state: trouble ? 'error' : 'none' };
}
function save(file, buf) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file + '.part', buf); fs.renameSync(file + '.part', file); }

/* ---------- the run ---------- */
async function main() {
  const data = JSON.parse(fs.readFileSync(path.resolve(opts.data), 'utf8'));
  const OUT = path.join(path.resolve(opts.out), 'r3e');
  const tracksFile = path.join(OUT, 'tracks.json'), repFile = path.join(OUT, 'tracks-report.json');
  const have = fs.existsSync(tracksFile) ? JSON.parse(fs.readFileSync(tracksFile, 'utf8')).tracks || {} : {};
  const lastMissing = new Set(!opts.recheck && fs.existsSync(repFile) ? (JSON.parse(fs.readFileSync(repFile, 'utf8')).notFound || []).map(String) : []);
  const tracks = JSON.parse(JSON.stringify(have));
  for (const id of Object.keys(tracks)) if (!data.tracks[id]) delete tracks[id];

  let list = Object.values(data.tracks).filter((t) => opts.refresh || !have[t.Id] || have[t.Id].retry).filter((t) => !lastMissing.has(String(t.Id)));
  if (opts.limit) list = list.slice(0, opts.limit);
  const notFound = new Set(lastMissing);
  console.log('Tracks to open: ' + list.length + ' (have ' + Object.keys(have).length + ' of ' + Object.keys(data.tracks).length + ').');

  if (list.length) {
    let chromium;
    try { chromium = (await import('playwright')).chromium; }
    catch (e) { chromium = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || 'playwright').chromium; }
    const browser = await chromium.launch();
    const page = await browser.newPage();

    /* the store's own list of tracks: track id -> page address */
    const links = {};
    try {
      await page.goto(opts.site + '/store/tracks', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForFunction(() => document.querySelectorAll('a[href*="/store/tracks/"]').length > 3, null, { timeout: 20000 });
      for (let i = 0; i < 25; i++) { await page.mouse.wheel(0, 4000); await page.waitForTimeout(400); }
      const hrefs = await page.evaluate(() => [...document.querySelectorAll('a[href*="/store/tracks/"]')].map((a) => a.getAttribute('href')));
      for (const h of hrefs) { const m = /\/store\/tracks\/[^?#]+\/(\d+)\/?$/.exec(h); if (m) links[m[1]] = h.startsWith('http') ? h : opts.site + h; }
    } catch (e) { console.log('Could not read the store track list (' + String(e.message).split('\n')[0] + '). Using addresses built from the track names.'); }
    console.log('Track pages found in the store list: ' + Object.keys(links).length);

    let opened = 0, ok = 0, added = 0;
    for (const t of list) {
      const layoutIds = t.layouts.map((l) => l.Id);
      const urls = [links[t.Id], opts.site + '/store/tracks/' + guessPath(t)].filter((u, i, a) => u && a.indexOf(u) === i);
      let parsed = null, html = '', err = '';
      for (const url of urls) {
        for (let attempt = 1; attempt <= 2 && !parsed; attempt++) {
          try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForFunction(() => /\bOPENED\b/.test(document.body.innerText) || /not found/i.test(document.body.innerText), null, { timeout: 20000 });
            await page.waitForTimeout(1200);                       // let the pictures be added to the page
            parsed = parseTrackText(await page.evaluate(() => document.body.innerText));
            if (parsed) html = await page.content(); else { err = 'no track details on the page'; break; }
          } catch (e) { err = String(e.message || e).split('\n')[0]; }
        }
        if (parsed) break;
      }
      opened++;
      if (!parsed) {
        notFound.add(String(t.Id)); console.log('  no page for ' + t.Name + ' (' + t.Id + '): ' + err);
      } else {
        ok++;
        const assets = findAssets(html, t.Id, layoutIds);
        let retry = false;
        /* gallery: 1, 2, 3 ... until two in a row are missing */
        let gallery = 0, misses = 0;
        for (let n = 1; n <= MAX_GALLERY && misses < 2; n++) {
          const file = path.join(OUT, 'tracks', String(t.Id), n + '.webp');
          if (fs.existsSync(file)) { gallery = n; misses = 0; continue; }
          const tag = assets.gallery[n];
          const r = await firstGood([tag !== undefined ? opts.cdn + 'Track:' + t.Id + ':image_' + n + '_1440p.webp' + tag : '', opts.cdn + 'Track:' + t.Id + ':image_' + n + '_1440p.webp', opts.spaces + 'Track:' + t.Id + ':image_' + n + '.webp'].filter(Boolean), isWebp);
          if (r.state === 'ok') { save(file, r.buf); gallery = n; misses = 0; } else { misses++; if (r.state === 'error') retry = true; }
        }
        /* layout maps */
        const maps = [];
        for (const l of t.layouts) {
          const file = path.join(OUT, 'layouts', l.Id + '.svg');
          if (fs.existsSync(file)) { maps.push(l.Id); continue; }
          const tag = assets.maps[l.Id];
          const r = await firstGood([tag !== undefined ? opts.cdn + 'TrackLayout:' + l.Id + ':map.svg' + tag : '', opts.cdn + 'TrackLayout:' + l.Id + ':map.svg', opts.spaces + 'TrackLayout:' + l.Id + ':map.svg'].filter(Boolean), isSvg);
          if (r.state === 'ok') { save(file, r.buf); maps.push(l.Id); } else if (r.state === 'error') retry = true;
        }
        /* venue logo (shared by the venue's tracks) */
        let venueId = null;
        if (assets.venueIds && assets.venueIds.length > 1) console.log('  note: ' + t.Name + ' page names ' + assets.venueIds.length + ' venue logos; using the first (' + assets.venue.id + ')');
        if (assets.venue) {
          venueId = assets.venue.id;
          const file = path.join(OUT, 'venues', venueId + '.webp');
          if (!fs.existsSync(file)) {
            const r = await firstGood([opts.cdn + 'VenueLogo:' + venueId + ':on_dark_small.webp' + assets.venue.tag, opts.cdn + 'VenueLogo:' + venueId + ':on_dark_small.webp'], isWebp);
            if (r.state === 'ok') save(file, r.buf); else { venueId = r.state === 'error' ? venueId : null; if (r.state === 'error') retry = true; }
          }
        }
        if (!tracks[t.Id]) added++;
        tracks[t.Id] = Object.assign({ venueId: venueId, layouts: t.layouts.map((l) => ({ id: l.Id, name: l.Name, maxCars: l.MaxNumberOfVehicles, map: maps.includes(l.Id) })), pictures: gallery }, parsed);
        if (retry) tracks[t.Id].retry = true;
        notFound.delete(String(t.Id));
      }
      if (opened === 5 && ok === 0) { await browser.close(); console.error('\nSTOPPED: the first 5 pages all failed. The store looks blocked or has changed. Nothing was changed.'); process.exit(1); }
      if (opened % 10 === 0) console.log('...' + opened + ' tracks opened');
      await sleep(400);
    }
    await browser.close();
    console.log('Opened ' + opened + ', got details for ' + ok + ', new ' + added + '.');
  }

  const sorted = {}; for (const k of Object.keys(tracks).sort((a, b) => a - b)) sorted[k] = tracks[k];
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(tracksFile, JSON.stringify({ v: 1, tracks: sorted }));
  const count = (dir, ext) => fs.existsSync(path.join(OUT, dir)) ? fs.readdirSync(path.join(OUT, dir), { recursive: true }).filter((f) => String(f).endsWith(ext)).length : 0;
  fs.writeFileSync(repFile, JSON.stringify({ total: Object.keys(data.tracks).length, have: Object.keys(sorted).length, trackPictures: count('tracks', '.webp'), layoutMaps: count('layouts', '.svg'), venueLogos: count('venues', '.webp'), notFound: [...notFound].map(Number).sort((a, b) => a - b), retryNextTime: Object.keys(sorted).filter((k) => sorted[k].retry).map(Number) }, null, 1) + '\n');
  console.log('tracks.json: ' + Object.keys(sorted).length + ' of ' + Object.keys(data.tracks).length + ' tracks. Store has no page for ' + notFound.size + '.');
}
if (isMain) await main();
