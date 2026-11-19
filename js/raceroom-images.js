/* Race Club: RaceRoom pictures by ID. Load this after raceroom-shell.js on any page that shows a livery, car, class or brand.

   One function for every picture on the site:
     RR.images.img('livery', 11948)                  a livery (small)
     RR.images.img('livery', 11987, { size: 'full' })  a livery (large)
     RR.images.img('car', 11342)                     a car (its default livery, large)
     RR.images.img('class', 12003)                   a class picture
     RR.images.img('manufacturer', 10978)            a brand logo
   Each returns an <img>. The page never has to know where the picture is, or whether we have it yet.

   Where a picture comes from, in this order:
     1. our own copy in assets/r3e/ (put there by tools/r3e-sync.mjs, which GitHub runs every day)
     2. the RaceRoom store, straight from their address (so a brand new livery shows up before our copy exists)
     3. a stand-in: a livery falls back to its car, then its class, then its brand
     4. the Race Club "no picture" image
   The <img> has data-r3e set to local, store, stand-in or missing, which says which one it ended up using.

   Other lookups (after RR.images.ready()):
     RR.images.info('livery', 11948)   { id, name, team, car: {id, name}, class: {id, name}, manufacturer: {id, name} }
     RR.images.info('car', 11342)      { id, name, class, manufacturer, defaultLivery }
     RR.images.info('class', 12003)    { id, name }
     RR.images.info('manufacturer', 10978)   { id, name }

   The settings (js/config.js, all optional):
     RC_CONFIG.r3eStore   the store's picture address, or false to never use the store

   Everything is keyed by (kind, ID, source). The only source today is "r3e" (RaceRoom's own). Custom liveries, if RaceRoom
   adds them, get another source with its own folder and address, and nothing else on the site needs to change. */
(function () {
  'use strict';
  var RR = window.RR = window.RR || {};
  var cfg = window.RC_CONFIG || {};

  var SOURCES = {
    r3e: {
      local: 'assets/r3e/',
      store: cfg.r3eStore === false ? '' : (cfg.r3eStore || 'https://game.raceroomracing.com/cdn/apex-production/')
    }
  };
  var PLACEHOLDER = 'assets/images/r3e-missing.svg';

  /* ---- the lookup file (small, loaded once, only when something needs it) ---- */
  var cache = {}, loading = {};
  function ready(source) {
    source = source || 'r3e';
    if (cache[source]) return Promise.resolve(cache[source]);
    if (!loading[source]) {
      loading[source] = fetch(SOURCES[source].local + 'index.json')
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .catch(function () { return { liveries: {}, cars: {}, classes: {}, manufacturers: {} }; })
        .then(function (d) { cache[source] = d; return d; });
    }
    return loading[source];
  }

  function goodId(id) { return /^\d{1,10}$/.test(String(id)) ? String(id) : ''; }

  /* ---- where each kind of picture lives ---- */
  function address(source, kind, id, size) {
    var s = SOURCES[source];
    if (kind === 'livery') {
      var sz = size === 'full' ? 'full' : 'small';
      return { local: s.local + 'liveries/' + sz + '/' + id + '.webp', store: s.store && s.store + 'Livery:' + id + ':' + sz + '.webp' };
    }
    if (kind === 'class') return { local: s.local + 'classes/' + id + '.webp', store: s.store && s.store + 'CarClass:' + id + ':small.webp' };
    if (kind === 'manufacturer') return { local: s.local + 'manufacturers/' + id + '.webp', store: s.store && s.store + 'CarManufactor:' + id + ':on_dark_big.webp' };
    return null;
  }
  function pair(list, a, label) { if (a) { if (a.local) list.push([a.local, label === 'own' ? 'local' : label]); if (a.store) list.push([a.store, label === 'own' ? 'store' : label]); } }

  /* The first things to try, needing no lookup. For a car this is its default livery, which needs the lookup, so it comes later. */
  function firstChoices(source, kind, id, size) {
    var list = [];
    if (kind === 'car') return list;
    var a = address(source, kind, id, size);
    if (a) { list.push([a.local, 'local']); if (a.store) list.push([a.store, 'store']); }
    return list;
  }
  /* What to try once the lookup is loaded: the picture itself (for a car), then stand-ins. */
  function laterChoices(source, kind, id, size, d) {
    var list = [], car = null, standIn = kind === 'car' ? 'local' : 'stand-in';
    if (kind === 'livery') { var lv = d.liveries[id]; car = lv ? d.cars[lv[0]] : null; }
    if (kind === 'car') car = d.cars[id];
    if (kind === 'car' && car) {
      var big = address(source, 'livery', car[3], 'full'), small = address(source, 'livery', car[3], 'small');
      list.push([big.local, 'local']); if (big.store) list.push([big.store, 'store']);
      list.push([small.local, 'stand-in']); if (small.store) list.push([small.store, 'stand-in']);
    } else if (kind === 'livery' && car) {
      var dl = address(source, 'livery', car[3], size), df = address(source, 'livery', car[3], 'full');
      list.push([dl.local, 'stand-in']); if (dl.store) list.push([dl.store, 'stand-in']);
      list.push([df.local, 'stand-in']); if (df.store) list.push([df.store, 'stand-in']);
    }
    if (kind === 'livery' || kind === 'car') {
      if (car) {
        pair(list, address(source, 'class', car[2]), 'stand-in');
        pair(list, address(source, 'manufacturer', car[1]), 'stand-in');
      }
    } else if (kind === 'class' || kind === 'manufacturer') { /* nothing to stand in for these */ }
    return list;
  }

  function info(kind, id, source) {
    var d = cache[source || 'r3e'];
    if (!d) return null;
    id = goodId(id);
    function nm(map, key) { return key === undefined || key === null ? null : { id: key, name: map[key] === undefined ? '' : map[key] }; }
    if (kind === 'livery') {
      var l = d.liveries[id]; if (!l) return null;
      var car = d.cars[l[0]];
      return { id: Number(id), name: l[1], team: l[2], car: { id: l[0], name: car ? car[0] : '' },
        class: car ? nm(d.classes, car[2]) : null, manufacturer: car ? nm(d.manufacturers, car[1]) : null };
    }
    if (kind === 'car') {
      var c = d.cars[id]; if (!c) return null;
      return { id: Number(id), name: c[0], class: nm(d.classes, c[2]), manufacturer: nm(d.manufacturers, c[1]), defaultLivery: c[3] };
    }
    if (kind === 'class') return d.classes[id] === undefined ? null : { id: Number(id), name: d.classes[id] };
    if (kind === 'manufacturer') return d.manufacturers[id] === undefined ? null : { id: Number(id), name: d.manufacturers[id] };
    return null;
  }

  /* ---- the picture itself ---- */
  function img(kind, id, o) {
    o = o || {};
    var source = o.source || 'r3e', size = o.size || 'small';
    var node = document.createElement('img');
    node.className = o.className || 'rr-r3e-img';
    node.loading = 'lazy';
    node.decoding = 'async';
    node.alt = o.alt || '';
    id = goodId(id);
    if (!id || !SOURCES[source] || !address(source, kind === 'car' ? 'livery' : kind, id, size)) { node.src = PLACEHOLDER; node.setAttribute('data-r3e', 'missing'); return node; }

    var queue = firstChoices(source, kind, id, size), extended = false;
    function setAlt() {
      if (o.alt) return;
      var i = info(kind, id, source);
      if (i) node.alt = (kind === 'livery' ? (i.name + ' ' + i.team + ' ' + i.car.name) : i.name).trim();
    }
    function next() {
      var item = queue.shift();
      if (item) { node.setAttribute('data-r3e', item[1]); node.src = item[0]; return; }
      if (!extended) {
        extended = true;
        ready(source).then(function (d) { setAlt(); queue = laterChoices(source, kind, id, size, d); next(); });
        return;
      }
      node.onerror = null;
      node.setAttribute('data-r3e', 'missing');
      node.src = PLACEHOLDER;
    }
    node.onerror = next;
    if (queue.length) { node.setAttribute('data-r3e', queue[0][1]); node.src = queue[0][0]; }
    else next();
    if (cache[source]) setAlt(); else if (!o.alt) ready(source).then(setAlt);
    return node;
  }

  RR.images = { img: img, info: info, ready: ready, sources: SOURCES, placeholder: PLACEHOLDER };
})();
