#!/usr/bin/env node
/*
 * Race Club: saves the store's details for every RaceRoom car into assets/r3e/cars.json
 * (description, engine, aspiration, drivetrain, shifting, gears, downforce, difficulty, raced in, power, torque, weight, top speed).
 *
 * Run by the GitHub workflow after the picture sync. The store pages are drawn by JavaScript, so this opens each page in a
 * hidden browser (Playwright) and reads the text. Only cars we do not have yet are opened, unless --refresh is given.
 *
 *   node tools/r3e-cars.mjs                 add details for cars we do not have yet
 *   node tools/r3e-cars.mjs --refresh       open every car again (the workflow does this on Mondays)
 *   node tools/r3e-cars.mjs --recheck-missing  also try cars whose page was not found last time
 *   --out <folder> (default assets)   --data <file> (default raceroom-data/r3e-data.json)
 *   --store <address> (default https://game.raceroomracing.com/store/cars/)   --limit <n> (for testing)
 *
 * Nothing is written when the store looks blocked (the first 5 pages all fail), so a broken run never saves junk.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const opts = { out: 'assets', data: 'raceroom-data/r3e-data.json', store: 'https://game.raceroomracing.com/store/cars/', refresh: false, recheck: false, limit: 0 };
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i], next = () => process.argv[++i];
  if (a === '--out') opts.out = next(); else if (a === '--data') opts.data = next(); else if (a === '--store') opts.store = next();
  else if (a === '--refresh') opts.refresh = true; else if (a === '--recheck-missing') opts.recheck = true; else if (a === '--limit') opts.limit = Number(next());
  else { console.error('Unknown option: ' + a); process.exit(2); }
}
if (!opts.store.endsWith('/')) opts.store += '/';

/* ---------- reading one page's text ---------- */
const LABELS = ['ENGINE', 'ASPIRATION', 'DRIVETRAIN', 'SHIFTING', 'GEARS', 'DOWNFORCE', 'DIFFICULTY', 'RACED IN', 'PRICE', 'POWER', 'TORQUE', 'WEIGHT', 'TOP SPEED', 'POWER/WEIGHT'];
const STOPS = new Set([...LABELS, 'ADD TO CART', 'NEWS', 'LEADERBOARDS', 'COMPETITIONS', 'STORE', 'PROFILE', 'ALL LIVERIES', 'OVERVIEW', 'LIVERIES', 'SCREENSHOTS']);
const num = (s) => { const m = /-?[\d,]+(\.\d+)?/.exec(s || ''); return m ? Number(m[0].replace(/,/g, '')) : null; };

export function parseCarText(text) {
  const lines = String(text).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const at = {};
  lines.forEach((l, i) => { if (LABELS.includes(l) && !(l in at)) at[l] = i; });
  if (!('ENGINE' in at) || !('DRIVETRAIN' in at)) return null;          // not a car page
  const val = (label) => {
    if (!(label in at)) return '';
    const v = lines[at[label] + 1];
    return v === undefined || STOPS.has(v) ? '' : v;
  };
  let desc = '';
  const s = lines.indexOf('SCREENSHOTS');
  if (s >= 0 && s < at.ENGINE) desc = lines.slice(s + 1, at.ENGINE).join(' ');
  return {
    description: desc,
    engine: val('ENGINE'), aspiration: val('ASPIRATION'), drivetrain: val('DRIVETRAIN'), shifting: val('SHIFTING'),
    gears: num(val('GEARS')), downforce: val('DOWNFORCE'), difficulty: val('DIFFICULTY'), racedIn: val('RACED IN'),
    powerHp: num(val('POWER')), torqueNm: num(val('TORQUE')), weightKg: num(val('WEIGHT')),
    topSpeedKmh: num(val('TOP SPEED')), powerToWeightHpPerT: num(val('POWER/WEIGHT'))
  };
}

export const slug = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/* ---------- the run ---------- */
async function main() {
  const dataFile = path.resolve(opts.data);
  const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  const OUT = path.join(path.resolve(opts.out), 'r3e');
  const carsFile = path.join(OUT, 'cars.json'), repFile = path.join(OUT, 'cars-report.json');
  const have = fs.existsSync(carsFile) ? JSON.parse(fs.readFileSync(carsFile, 'utf8')).cars || {} : {};
  const lastMissing = new Set(!opts.recheck && fs.existsSync(repFile) ? (JSON.parse(fs.readFileSync(repFile, 'utf8')).notFound || []).map(String) : []);

  let list = Object.values(data.cars).filter((c) => opts.refresh || !have[c.Id]).filter((c) => !lastMissing.has(String(c.Id)));
  if (opts.limit) list = list.slice(0, opts.limit);
  const cars = JSON.parse(JSON.stringify(have));
  for (const id of Object.keys(cars)) if (!data.cars[id]) delete cars[id];   // a car RaceRoom removed
  const notFound = new Set(lastMissing);
  console.log('Cars to open: ' + list.length + ' (have ' + Object.keys(have).length + ' of ' + Object.keys(data.cars).length + ').');

  if (list.length) {
    let chromium;
    try { chromium = (await import('playwright')).chromium; }
    catch (e) { chromium = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || 'playwright').chromium; }
    const browser = await chromium.launch();
    const page = await browser.newPage();
    let opened = 0, ok = 0, added = 0;
    for (const car of list) {
      const cls = data.classes[car.Class];
      const urls = [opts.store + slug(cls ? cls.Name : 'cars') + '/' + slug(car.Name) + '/' + car.Id];
      let parsed = null, err = '';
      for (const url of urls) {
        for (let attempt = 1; attempt <= 2 && !parsed; attempt++) {
          try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForFunction(() => /\bENGINE\b/.test(document.body.innerText) || /not found/i.test(document.body.innerText), null, { timeout: 20000 });
            parsed = parseCarText(await page.evaluate(() => document.body.innerText));
            if (!parsed) { err = 'no car details on the page'; break; }
          } catch (e) { err = String(e.message || e).split('\n')[0]; }
        }
        if (parsed) break;
      }
      opened++;
      if (parsed) {
        ok++;
        if (!cars[car.Id]) added++;
        cars[car.Id] = parsed; notFound.delete(String(car.Id));
      } else { notFound.add(String(car.Id)); console.log('  no details for ' + car.Name + ' (' + car.Id + '): ' + err); }
      if (opened === 5 && ok === 0) { await browser.close(); console.error('\nSTOPPED: the first 5 pages all failed. The store looks blocked or has changed. Nothing was changed.'); process.exit(1); }
      if (opened % 25 === 0) console.log('...' + opened + ' pages opened');
      await new Promise((r) => setTimeout(r, 400));
    }
    await browser.close();
    console.log('Opened ' + opened + ', got details for ' + ok + ', new ' + added + '.');
  }

  const sorted = {}; for (const k of Object.keys(cars).sort((a, b) => a - b)) sorted[k] = cars[k];
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(carsFile, JSON.stringify({ v: 1, units: { powerHp: 'hp', torqueNm: 'Nm', weightKg: 'kg with driver', topSpeedKmh: 'km/h', powerToWeightHpPerT: 'hp per tonne' }, cars: sorted }));
  fs.writeFileSync(repFile, JSON.stringify({ total: Object.keys(data.cars).length, have: Object.keys(sorted).length, notFound: [...notFound].map(Number).sort((a, b) => a - b) }, null, 1) + '\n');
  console.log('cars.json: ' + Object.keys(sorted).length + ' of ' + Object.keys(data.cars).length + ' cars. Store has no page for ' + notFound.size + '.');
}
if (isMain) await main();
