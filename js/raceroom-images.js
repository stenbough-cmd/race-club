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

   Tracks (our own copy only): RR.images.img('track', trackId, { n: 2 }) is the track's 2nd picture (1 is the first);
     RR.images.img('layout', layoutId) is a layout map; RR.images.img('venue', venueId) is a venue logo;
     RR.images.trackLogo(trackId) is the logo of the venue a track belongs to; RR.images.tracks(trackId) gives its details.

   Car details from the store (after the first call, which loads assets/r3e/cars.json once):
     RR.images.details(11342)   -> Promise of { description, engine, aspiration, drivetrain, shifting, gears, downforce,
                                   difficulty, racedIn, powerHp, torqueNm, weightKg, topSpeedKmh, powerToWeightHpPerT }, or null

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
    /* Tracks: only our own copy (the store's track addresses carry a code we only know from its page). */
    if (kind === 'track') return { local: s.local + 'tracks/' + id + '/' + (size > 0 ? size : 1) + '.webp', store: '' };
    if (kind === 'layout') return { local: s.local + 'layouts/' + id + '.svg', store: '' };
    if (kind === 'venue') return { local: s.local + 'venues/' + id + '.webp', store: '' };
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
    var source = o.source || 'r3e', size = kind === 'track' ? (Number(o.n) || 1) : (o.size || 'small');
    var node = document.createElement('img');
    node.className = o.className || 'rr-r3e-img';
    node.loading = 'lazy';
    node.decoding = 'async';
    node.alt = o.alt || '';
    /* o.quiet: show nothing (no broken-picture icon) until a picture has actually loaded, then show it. */
    if (o.quiet) { node.style.visibility = 'hidden'; node.addEventListener('load', function () { node.style.visibility = ''; }); }
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

  var carDetails = null;
  function details(carId, source) {
    source = source || 'r3e';
    if (!carDetails) {
      carDetails = fetch(SOURCES[source].local + 'cars.json')
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .catch(function () { return { cars: {} }; });
    }
    return carDetails.then(function (d) { return d.cars[goodId(carId)] || null; });
  }

  /* Track details (after the first call, which loads assets/r3e/tracks.json once): a track is what RaceRoom's data calls a
     track, so Brands Hatch Indy and Brands Hatch Grand Prix are two tracks and Watkins Glen is one track with four layouts.
       { venue, country, location, versions, description, type, opened, racedIn, venueId, pictures,
         layouts: [{ id, name, maxCars, map }] }, or null */
  var trackDetails = null;
  function allTracks(source) {
    source = source || 'r3e';
    if (!trackDetails) {
      trackDetails = fetch(SOURCES[source].local + 'tracks.json')
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .catch(function () { return { tracks: {} }; });
    }
    return trackDetails;
  }
  function tracks(trackId, source) {
    return allTracks(source).then(function (d) { return d.tracks[goodId(trackId)] || null; });
  }
  /* The track a layout belongs to: RR.images.trackOfLayout(1671) resolves to the track ID (1670), or null. */
  function trackOfLayout(layoutId, source) {
    var want = goodId(layoutId);
    return allTracks(source).then(function (d) {
      var ids = Object.keys(d.tracks || {});
      for (var i = 0; i < ids.length; i++) {
        var ls = d.tracks[ids[i]].layouts || [];
        for (var j = 0; j < ls.length; j++) if (goodId(ls[j].id) === want) return ids[i];
      }
      return null;
    });
  }
  /* The venue's logo for the track a layout belongs to, as a small <span> that fills in once the track is known:
     RR.images.venueLogoOfLayout(1671, { alt }). The logos are made for dark pages (many are white), so each one is drawn on a canvas with a
     thin hard outline in the page's dark color. A CSS filter cannot do this reliably (half pixel offsets are drawn thick on a computer and
     dropped on some phones), so the outline is drawn here in whole device pixels: one pixel wide on ordinary screens, two on very sharp ones.
     Nothing is shown when we have no logo for the venue. */
  var LOGO_W = 64, LOGO_H = 36;
  function outlinedLogo(src, alt) {
    var dpr = window.devicePixelRatio || 1, line = Math.max(1, Math.round(0.5 * dpr));
    var cv = document.createElement('canvas'), pic = new Image();
    cv.width = Math.round(LOGO_W * dpr); cv.height = Math.round(LOGO_H * dpr);
    cv.style.width = LOGO_W + 'px'; cv.style.height = LOGO_H + 'px';
    cv.className = 'rr-venue-logo';
    cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', alt || '');
    pic.onload = function () {
      var g = cv.getContext('2d'), room = line + 1, w = cv.width - room * 2, h = cv.height - room * 2;
      var k = Math.min(w / pic.naturalWidth, h / pic.naturalHeight), dw = Math.round(pic.naturalWidth * k), dh = Math.round(pic.naturalHeight * k);
      var x = Math.round((cv.width - dw) / 2), y = Math.round((cv.height - dh) / 2);
      var ink = '#171717';
      try { ink = getComputedStyle(document.documentElement).getPropertyValue('--rr-ink').trim() || ink; } catch (e) {}
      var shade = document.createElement('canvas'), s = shade.getContext('2d');
      shade.width = cv.width; shade.height = cv.height;
      s.imageSmoothingQuality = 'high'; s.drawImage(pic, x, y, dw, dh);
      s.globalCompositeOperation = 'source-in'; s.fillStyle = ink; s.fillRect(0, 0, shade.width, shade.height);
      for (var i = 0; i < 16; i++) {
        var ang = i * Math.PI / 8;
        g.drawImage(shade, Math.round(Math.cos(ang) * line), Math.round(Math.sin(ang) * line));
      }
      g.imageSmoothingQuality = 'high'; g.drawImage(pic, x, y, dw, dh);
    };
    pic.onerror = function () { if (cv.parentNode) cv.parentNode.removeChild(cv); };
    pic.src = src;
    return cv;
  }
  function venueLogoOfLayout(layoutId, o) {
    o = o || {};
    var box = document.createElement('span');
    box.className = o.boxClass || 'rr-venue-logo-box';
    trackOfLayout(layoutId, o.source).then(function (trackId) {
      return trackId ? tracks(trackId, o.source) : null;
    }).then(function (t) {
      if (!t || !t.venueId) return;
      box.appendChild(outlinedLogo(address(o.source || 'r3e', 'venue', t.venueId).local, o.alt || t.venue || ''));
    });
    return box;
  }

  /* The venue's logo for a track: RR.images.trackLogo(2519) returns an <img> that fills in once the track is known. */
  function trackLogo(trackId, o) {
    o = o || {};
    var node = document.createElement('img');
    node.className = o.className || 'rr-r3e-img';
    node.alt = o.alt || '';
    node.setAttribute('data-r3e', 'missing');
    node.src = PLACEHOLDER;
    tracks(trackId, o.source).then(function (t) {
      if (!t || !t.venueId) return;
      var a = address(o.source || 'r3e', 'venue', t.venueId);
      node.onerror = function () { node.onerror = null; node.setAttribute('data-r3e', 'missing'); node.src = PLACEHOLDER; };
      node.setAttribute('data-r3e', 'local');
      if (!o.alt) node.alt = t.venue;
      node.src = a.local;
    });
    return node;
  }

  /* A manufacturer logo as RaceRoom made it (many are white, made for a dark background; the Season page puts them on a black bar).
     A logo that cannot be found is hidden. RR.images.logo(10978, { className, alt }) */
  function logo(manufacturerId, o) {
    o = o || {};
    var node = img('manufacturer', manufacturerId, { className: o.className || 'rr-r3e-img', alt: o.alt, source: o.source });
    function check() { node.hidden = node.getAttribute('data-r3e') === 'missing'; }
    node.addEventListener('load', check);
    if (node.complete && node.naturalWidth) check();
    return node;
  }

  RR.images = { venueLogoOfLayout: venueLogoOfLayout, trackOfLayout: trackOfLayout, logo: logo, tracks: tracks, trackLogo: trackLogo, details: details, img: img, info: info, ready: ready, sources: SOURCES, placeholder: PLACEHOLDER };
})();
