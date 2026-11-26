/* Race Club RaceRoom site: what each page shows.
   Every page is built ONLY from the shared builders in raceroom-shell.js (RR.*).
   <body data-rr-page="..."> picks which function below runs. */
(function () {
  'use strict';
  var RR = window.RR, D = window.RR_DATA;
  var el = RR.el, add = RR.add;

  function byId(list, id) { return list.filter(function (x) { return x.id === id; })[0]; }
  function driver(id) { return byId(D.drivers, id); }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function className(id) { var c = byId(D.classes, id); return c ? c.name : '-'; }
  function round(n) { return D.rounds.filter(function (r) { return r.n === n; })[0]; }
  function profileLink(d) { return 'driver.html?driver=' + encodeURIComponent(d.id); }
  function standings(cls) {
    return D.drivers.filter(function (d) { return cls === 'all' || d.cls === cls; })
      .sort(function (a, b) { return b.points - a.points || a.name.localeCompare(b.name); });
  }
  function fill(node) {
    node.textContent = '';
    for (var i = 1; i < arguments.length; i++) if (arguments[i]) node.appendChild(arguments[i]);
  }

  /* All posts, newest first. Dates are MM/DD/YYYY. */
  function newestFirst() {
    function stamp(n) { if (n.sort) return String(n.sort).replace(/-/g, ''); var p = n.date.split('/'); return p[2] + p[0] + p[1]; }
    return D.news.slice().sort(function (x, y) { return stamp(y).localeCompare(stamp(x)); });
  }

  var PAGES = {};

  /* ---------------- NEWS (index.html): every post, newest first ----------------
     Landscape: page 1 shows the 3 newest posts (the first one large), every page after that shows 6.
     Portrait: every page shows 6, all the same size.
     The block of stories is the same height on every page, so the pills under it never move. */
  PAGES.news = function () {
    var main = document.querySelector('main'), posts = newestFirst();
    RR.fillContent();
    var portraitQuery = window.matchMedia('(orientation: portrait)');
    var FIRST = 3, REST = 6, pages = 1;
    function setSizes() {
      FIRST = portraitQuery.matches ? 6 : 3;
      pages = posts.length <= FIRST ? 1 : 1 + Math.ceil((posts.length - FIRST) / REST);
    }
    function currentPage() {
      var m = /^#page-(\d+)$/.exec(location.hash), p = m ? Number(m[1]) : 1;
      return Math.min(Math.max(p, 1), pages);
    }
    function draw() {
      setSizes();
      var p = currentPage();
      var items = p === 1 ? posts.slice(0, FIRST) : posts.slice(FIRST + (p - 2) * REST, FIRST + (p - 1) * REST);
      main.textContent = '';
      if (!posts.length) { main.appendChild(RR.empty('No posts yet.')); return; }
      var grid = el('div', 'rr-news-grid ' + (p === 1 && !portraitQuery.matches ? 'rr-news-first' : 'rr-news-rest'));
      items.forEach(function (n, i) {
        grid.appendChild(RR.promo({
          feature: p === 1 && i === 0 && !portraitQuery.matches, eyebrow: n.eyebrow + ' \u00B7 ' + n.date, title: n.title, desc: n.desc,
          photo: n.photos && n.photos[0] && n.photos[0].src ? n.photos[0].src : '',
          href: 'story.html?id=' + encodeURIComponent(n.id)
        }));
        /* A plain click opens the story in a popup; a click with Ctrl, Cmd or Shift (or a middle click) still follows the link. */
        grid.lastChild.addEventListener('click', function (e) {
          if (e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;
          e.preventDefault();
          openStory(posts, posts.indexOf(n));
        });
      });
      main.appendChild(add(el('div', 'rr-news'), grid,
        RR.pager(pages, p, function (n) { location.hash = n === 1 ? '' : 'page-' + n; })));
      RR.scrollTop();
    }
    window.addEventListener('hashchange', draw);
    if (portraitQuery.addEventListener) portraitQuery.addEventListener('change', draw);
    draw();
  };

  /* ---------------- ONE POST: a popup window over the News page ----------------
     Clicking a story on the News page opens it in a popup the size of the Edit story popup (RR.modal), with the banner and the story inside
     and Newer story / Older story buttons at the bottom. story.html?id=... still works as a link: it shows the News page with that story open. */
  function storyView(n) {
    var art = el('article', 'rr-article');
    /* The first photo is the banner: the same picture as the story's tile on the News page, with the title over it. The other photos sit inside the story. */
    var allPhotos = (n.photos || []).filter(function (ph) { return ph && ph.src; });
    var hero = allPhotos[0] || null, photos = allPhotos.slice(1);
    var banner = el('div', 'rr-story-hero' + (hero ? ' rr-has-photo' : ''));
    if (hero) banner.style.backgroundImage = 'url("' + hero.src + '")';
    add(banner, add(el('div', 'rr-article-meta'), el('span', 'rr-label rr-red', n.eyebrow), el('span', 'rr-label', n.date),
      n.byline ? el('span', 'rr-label', 'By ' + n.byline) : null), el('h2', 'rr-story-title', n.title));
    /* A written story: "## Heading" lines are subheadings, **name** is bold, and each photo is placed inside the paragraph number
       photo.at (0 is the first paragraph) with the text wrapping around it. Older posts are plain paragraphs. */
    var paraNo = 0;
    function figure(ph) {
      var fig = el('figure', 'rr-figure rr-figure-' + (ph.side === 'left' ? 'left' : 'right')), img = el('img');
      img.src = ph.src; img.alt = ph.caption || ''; img.loading = 'lazy';
      fig.appendChild(img);
      if (ph.caption) fig.appendChild(el('figcaption', '', ph.caption));
      return fig;
    }
    /* A story saved as one long block is cut into paragraphs of about four sentences, so the page reads well even for an older story. */
    var blocks = [];
    n.body.forEach(function (text) {
      if (!/^## /.test(text) && text.length > 900) {
        var sentences = text.match(/[^.!?]+[.!?]+["')\]]*(\s+|$)/g) || [text], cur = '';
        sentences.forEach(function (s) { if (cur && cur.length + s.length > 520) { blocks.push(cur.trim()); cur = ''; } cur += s; });
        if (cur.trim()) blocks.push(cur.trim());
      } else blocks.push(text);
    });
    var paraCount = blocks.filter(function (x) { return !/^## /.test(x); }).length;
    if (photos.length > 1 && paraCount > 3 && photos.every(function (ph) { return !Number(ph.at); })) {   // every picture at the start: spread them down the story
      var third = Math.max(1, Math.ceil(paraCount / (photos.length + 1)));
      photos.forEach(function (ph, i) { ph.at = Math.min(paraCount - 1, (i + 1) * third); ph.side = i % 2 === 0 ? 'right' : 'left'; });
    }
    blocks.forEach(function (text) {
      var block = RR.richBlock(text);
      if (block.nodeName !== 'P') { art.appendChild(block); return; }
      photos = photos.filter(function (ph) { if (Number(ph.at) !== paraNo) return true; art.appendChild(figure(ph)); return false; });
      art.appendChild(block);
      paraNo++;
    });
    photos.forEach(function (ph) { art.appendChild(figure(ph)); });     // a photo whose paragraph number is past the end goes last
    /* After an edit: the date and the reason, in italics, at the very bottom. */
    if (n.editNote) art.appendChild(el('p', 'rr-edit-note', 'Edited ' + n.editNote.date + '. Reason: ' + n.editNote.reason + '.'));
    return [banner, art];
  }

  function openStory(posts, at, onClose) {
    var win = RR.modal(posts[at].title, onClose);
    function show(i) {
      at = i;
      var n = posts[at], nodes = storyView(n);
      win.setTitle(n.title);
      win.body.textContent = '';
      nodes.forEach(function (node) { win.body.appendChild(node); });
      var nav = el('div', 'rr-story-nav');
      if (posts[at - 1]) nav.appendChild(RR.button('Newer story', function () { show(at - 1); }));
      if (posts[at + 1]) nav.appendChild(RR.button('Older story', function () { show(at + 1); }));
      if (nav.children.length) win.body.appendChild(nav);
      win.body.scrollTop = 0;
    }
    show(at);
    return win;
  }

  PAGES.story = function () {
    PAGES.news();
    var posts = newestFirst(), at = -1;
    posts.forEach(function (n, i) { if (n.id === RR.param('id')) at = i; });
    if (at < 0) return;
    document.title = posts[at].title + ' | Race Club';
    openStory(posts, at, function () { location.href = 'news.html'; });
  };

  /* ---- Season helpers: every Leaderboards and profile page reads the league through these ---- */
  function seasonById(id) { return byId(D.seasons, id) || D.seasons[0]; }
  function roundOf(season, n) { return season.rounds.filter(function (r) { return r.n === n; })[0]; }
  function doneRounds(season) { return season.rounds.filter(function (r) { return r.done; }); }
  /* A round counts toward the standings and the lap time boards once its protest window is over (the sample data has no such wait). */
  function countedRounds(season) { return season.rounds.filter(function (r) { return r.done && r.counts !== false; }); }
  function roundCounts(season, n) { var r = season.rounds.filter(function (q) { return q.n === n; })[0]; return !!r && r.counts !== false; }
  function classesIn(season) { return D.classes.filter(function (c) { return season.results.some(function (r) { return r.cls === c.id; }); }); }
  function seasonLabel(s) { return s.name + (s.status === 'Active' ? ' (current)' : ''); }
  function resultOf(season, n, driverId) {
    return season.results.filter(function (x) { return x.round === n && x.driver === driverId; })[0];
  }
  /* A driver's points for a whole night: every race added together plus the night's pole bonus. Bonus is shown as the small raised number. */
  function nightOf(season, n, driverId) {
    var rows = season.results.filter(function (x) { return x.round === n && x.driver === driverId; });
    if (!rows.length) return null;
    var pole = (season.poleBonus || []).filter(function (p) { return p.round === n && p.driver === driverId; }).reduce(function (a, p) { return a + p.points; }, 0);
    return { points: rows.reduce(function (a, x) { return a + x.points; }, 0), bonus: rows.reduce(function (a, x) { return a + x.bonus; }, 0) + pole };
  }
  /* Race 1, Race 2, Race 3 (and Night total) choices for a night with more than one race. null for a single race. */
  function raceOptions(r, withNight) {
    var n = r.races || 1, out = [];
    if (n < 2) return null;
    for (var i = 1; i <= n; i++) out.push([i, 'Race ' + i]);
    if (withNight) out.push(['night', 'Night total']);
    return out;
  }
  function pressOption(box, options, value) {
    Array.prototype.forEach.call(box.children, function (b, i) { b.setAttribute('aria-pressed', String(options[i][0]) === String(value) ? 'true' : 'false'); });
  }
  /* Standings rows for one season and class, best first. t.per is points per round, t.drop the dropped rounds, t.total the total. */
  /* The class a driver is locked to in a season: the first one they raced in it (a driver only ever scores in one class per season). */
  function classIn(season, d) { return (season.driverClass && season.driverClass[d.id]) || d.cls; }
  function seasonRows(season, cls) {
    /* The league file carries the official order of each class (points, then countback of finishing places, then who got there first). */
    var rank = {}, ord = season.order && season.order[cls];
    if (ord) ord.forEach(function (id, i) { rank[id] = i; });
    return D.drivers.filter(function (d) { return (cls === 'all' || classIn(season, d) === cls) && season.totals[d.id]; })
      .map(function (d) { return { d: d, t: season.totals[d.id] }; })
      .sort(function (a, b) {
        if (rank[a.d.id] !== undefined && rank[b.d.id] !== undefined) return rank[a.d.id] - rank[b.d.id];
        return b.t.total - a.t.total || a.d.name.localeCompare(b.d.name);
      });
  }
  /* A points number with its bonus as a small raised number. Dropped rounds are struck through. */
  function pointsNode(x, dropped) {
    if (!x) return '-';
    var span = el('span', dropped ? 'rr-dropped' : '', x.points);
    if (x.bonus) span.appendChild(el('span', 'rr-bonus', '+' + x.bonus));
    return span;
  }
  function resultCell(x) {
    return RR.cell(x.status === 'Finished' ? RR.pos(x.pos) : x.status, 'of ' + x.of);
  }
  /* Places gained (green triangle up and the number) or lost (red triangle down). A dash means the driver kept the grid place, or did not finish. */
  function diffPos(x) {
    if (x.status !== 'Finished' || !x.start) return el('span', 'rr-delta-none', '-');
    var n = x.start - x.pos;
    if (!n) return el('span', 'rr-delta-none', '-');
    return el('span', n > 0 ? 'rr-delta-up' : 'rr-delta-down', (n > 0 ? '\u25B2 ' : '\u25BC ') + Math.abs(n));
  }
  /* Bonus dots: purple = fastest lap, blue = clean race, gold = pole. Counts, so a night total can show one dot per race. */
  function bonusDots(fast, clean, pole) {
    var box = el('span', 'rr-dots'), any = false;
    [[fast, 'rr-dot-fast', 'Fastest lap'], [clean, 'rr-dot-clean', 'Clean race'], [pole, 'rr-dot-pole', 'Pole']].forEach(function (k) {
      for (var i = 0; i < k[0]; i++) { box.appendChild(el('span', 'rr-dot ' + k[1])).title = k[2]; any = true; }
    });
    return any ? box : el('span', 'rr-delta-none', '-');
  }
  /* Penalty points come off the season total (taken once per night, shown on the first race of the night). */
  function penaltyText(x) { return x.penaltyPoints ? '-' + x.penaltyPoints : '-'; }
  /* Protests filed for one round of one season (newest first as stored). */
  /* Only rulings with a penalty are public. A file published before this rule (it still names who filed) has no driver field and is ignored until the site data is published again. */
  function protestsFor(season, n) { return (D.protests || []).filter(function (p) { return p.season === season.id && p.round === n && p.driver !== undefined && p.ruling === 'Penalised'; }); }
  /* The rulings table for a round: the driver who got a penalty, what for, the steward's comment and the points. Only ruled protests that ended in a penalty
     are ever published, and nobody who filed is named. null when there is none. */
  function protestTable(season, n) {
    var list = protestsFor(season, n);
    if (!list.length) return null;
    var multi = (roundOf(season, n) || {}).races > 1;
    return RR.table([
      { key: 'driver', label: 'Driver', sort: true }, { key: 'reason', label: 'Infraction', sort: true }, { key: 'ruling', label: 'Ruling', sort: true }, { key: 'pen', label: 'Penalty', sort: true }
    ], list.map(function (p) {
      var d = driver(p.driver) || { name: String(p.driver), country: '' };
      return { cells: { driver: RR.nameWithFlag(d.name, d.country), reason: RR.cell(p.reason, (multi && p.race ? 'Race ' + p.race + ' · ' : '') + 'Lap ' + p.lap),
        ruling: p.comment || '-', pen: p.penalty || '-' },
        sort: { driver: d.name.toLowerCase(), reason: p.reason.toLowerCase(), ruling: String(p.comment || '').toLowerCase(), pen: p.penalty || '' } };
    }), 'No penalties were given from protests.');
  }
  /* Mark the row of a sidebar list that matches `index` as the chosen one (the list starts with its first row chosen). */
  function pressRow(list, index) {
    Array.prototype.forEach.call(list.children, function (b, i) { b.setAttribute('aria-pressed', i === index ? 'true' : 'false'); });
  }

  /* ---------------- LEADERBOARDS (leaderboards.html): everything follows the Season and Class dropdowns ---------------- */
  PAGES.leaderboards = function () {
    var season = D.seasons[0], cls = 'all', pickedRound = null, pickedTrack = null, onlyUpcoming = false, pickedRace = 1, pickedLapRace = 1;
    var classBox = el('div');
    /* The pole bonus points for a race row: only on the row that carries the pole, and only when the season pays one. */
    function poleFor(x) {
      if (!x.pole) return 0;
      var p = (season.poleBonus || []).filter(function (q) { return q.round === x.round && q.driver === x.driver; })[0];
      return p ? p.points : 0;
    }

    function drawStandings() {
      var rows = seasonRows(season, cls);
      var finished = season.status === 'Finished';
      /* The rows come best first, so Pos is the sorted column. Points columns sort high to low on the first click. */
      var cols = [{ key: 'pos', label: 'Pos', sort: true, sorted: true }, { key: 'driver', label: 'Driver', sort: true }];
      season.rounds.forEach(function (r) { cols.push({ key: 'r' + r.n, label: 'R' + r.n, num: true, sort: true, desc: true }); });
      cols.push({ key: 'wins', label: 'Wins', num: true, sort: true, desc: true }, { key: 'total', label: 'Total', num: true, sort: true, desc: true });
      fill(RR.view('standings'), add(el('div', 'rr-stack'),
        RR.strip(rows.slice(0, 5).map(function (r) {
          return { title: r.d.name, country: r.d.country, sub: className(classIn(season, r.d)), value: r.t.total, valueLabel: 'pts', href: profileLink(r.d) };
        })),
        finished && season.champions && Object.keys(season.champions).length ? RR.table([{ key: 'cls', label: 'Champions' }, { key: 'who', label: 'Driver' }],
          Object.keys(season.champions).filter(function (c) { return cls === 'all' || String(c) === String(cls); }).map(function (c) {
            var dr = byId(D.drivers, season.champions[c]);
            return { cells: { cls: className(c), who: dr ? RR.nameWithFlag(dr.name, dr.country) : '-' } };
          }), '') : null,
        RR.table(cols, rows.map(function (r, i) {
          var cells = { pos: RR.pos(i + 1), driver: RR.cell(RR.nameWithFlag(r.d.name, r.d.country)),
            wins: season.results.filter(function (x) { return x.driver === r.d.id && x.pos === 1 && x.status === 'Finished' && roundCounts(season, x.round); }).length,
            total: r.t.total };
          var sv = { pos: i + 1, driver: r.d.name.toLowerCase(), wins: cells.wins, total: r.t.total };
          season.rounds.forEach(function (rd, k) {
            var counted = rd.done && rd.counts !== false, night = counted ? nightOf(season, rd.n, r.d.id) : null;
            cells['r' + rd.n] = counted ? pointsNode(night, r.t.drop.indexOf(k) >= 0) : '-';
            sv['r' + rd.n] = night ? night.points + night.bonus : null;
          });
          return { href: profileLink(r.d), linkCol: 1, cells: cells, sort: sv };
        }), 'No drivers in this class yet.'),
        season.dropWeeks ? RR.empty('The ' + season.dropWeeks + ' lowest round' + (season.dropWeeks > 1 ? 's are' : ' is') + ' struck through and not counted. A small red number is a bonus point.') : null
      ));
    }

    function drawResults() {
      var done = doneRounds(season);
      if (!done.length) { fill(RR.view('results'), RR.empty('No races have been run yet.')); return; }
      if (!pickedRound || !roundOf(season, pickedRound) || !roundOf(season, pickedRound).done) pickedRound = done[done.length - 1].n;
      var items = done.map(function (r) { return [r.n, 'Round ' + r.n, r.date]; }).reverse();
      var list = RR.sidelist(items, function (n) { pickedRound = n; pickedRace = 1; drawTable(); });
      pressRow(list, items.map(function (i) { return i[0]; }).indexOf(pickedRound));
      var right = el('div', 'rr-stack');
      function drawTable() {
        var r = roundOf(season, pickedRound), opts = raceOptions(r, true), picker = null;
        if (!opts) pickedRace = 1;
        else if (pickedRace !== 'night' && !(pickedRace >= 1 && pickedRace <= r.races)) pickedRace = 1;
        if (opts) { picker = RR.segment(opts, function (v) { pickedRace = v; drawTable(); }); pressOption(picker, opts, pickedRace); }
        var inClass = season.results.filter(function (x) { return x.round === pickedRound && (cls === 'all' || x.cls === cls); });
        var open = !!r.protestCloses, table;
        if (pickedRace === 'night') {
          /* Night total: the races added together, plus the night's pole bonus. Best in each class first. */
          var by = {};
          inClass.forEach(function (x) {
            var g = by[x.driver] = by[x.driver] || { driver: x.driver, cls: x.cls, car: x.car || '', finishes: [], best: 0, inc: 0, points: 0, bonus: 0, fast: 0, clean: 0, pole: 0 };
            g.fast += (x.bonusFastest !== undefined ? x.bonusFastest : x.fastest) ? 1 : 0; g.clean += x.bonusClean ? 1 : 0;
            if (!g.car && x.car) g.car = x.car;
            g.finishes[(x.race || 1) - 1] = x.status === 'Finished' ? 'P' + x.pos : x.status;
            if (x.best > 0 && (!g.best || x.best < g.best)) g.best = x.best;
            g.inc += x.incidents; g.points += x.points; g.bonus += x.bonus;
          });
          (season.poleBonus || []).forEach(function (p) { if (p.round === pickedRound && by[p.driver]) { by[p.driver].bonus += p.points; by[p.driver].pole = 1; } });
          var list2 = Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) {
            return a.cls.localeCompare(b.cls) || (b.points + b.bonus) - (a.points + a.bonus) || driver(a.driver).name.localeCompare(driver(b.driver).name);
          });
          var count = {};
          table = RR.table([
            { key: 'pos', label: 'Night', sorted: true, sort: true }, { key: 'driver', label: 'Driver', sort: true }, { key: 'car', label: 'Car / Class', sort: true },
            { key: 'fin', label: 'Race finishes', sort: true }, { key: 'best', label: 'Best lap', num: true, sort: true }, { key: 'bonus', label: 'Bonus', sort: true, desc: true }, { key: 'inc', label: 'Inc', num: true, sort: true },
            { key: 'pts', label: 'Points', num: true, sort: true, desc: true }
          ], list2.map(function (g) {
            var d = driver(g.driver), fin = [];
            for (var q = 0; q < r.races; q++) fin.push(g.finishes[q] || '-');
            count[g.cls] = (count[g.cls] || 0) + 1;
            return { href: profileLink(d), linkCol: 1, cells: {
              pos: RR.cell(RR.pos(count[g.cls])), driver: RR.cell(RR.nameWithFlag(d.name, d.country)), car: RR.cell(g.car || '-', className(g.cls)),
              fin: fin.join(' · '), best: RR.lap(g.best), bonus: bonusDots(g.fast, g.clean, g.pole), inc: g.inc, pts: pointsNode({ points: g.points, bonus: g.bonus })
            }, sort: {
              /* Night: best first inside each class. Race finishes: the places added up (a race without a finish counts as 99). */
              pos: g.cls + '|' + ('000' + count[g.cls]).slice(-3), driver: d.name.toLowerCase(), car: String(g.car || '').toLowerCase(),
              fin: fin.reduce(function (a, f) { return a + (/^P\d+$/.test(f) ? Number(f.slice(1)) : 99); }, 0),
              best: g.best > 0 ? g.best : null, bonus: g.fast + g.clean + g.pole, inc: g.inc, pts: g.points + g.bonus
            } };
          }), 'No results for this class.');
        } else {
          var rows = inClass.filter(function (x) { return (x.race || 1) === pickedRace; }).sort(function (a, b) { return a.cls.localeCompare(b.cls) || a.pos - b.pos; });
          table = RR.table([
            { key: 'pos', label: 'Result', sorted: true, sort: true }, { key: 'driver', label: 'Driver', sort: true }, { key: 'car', label: 'Car / Class', sort: true },
            { key: 'time', label: 'Race time', num: true, sort: true }, { key: 'gap', label: 'Gap', num: true, sort: true }, { key: 'diff', label: 'Diff', num: true, sort: true, desc: true },
            { key: 'bonus', label: 'Bonus', sort: true, desc: true }, { key: 'inc', label: 'Inc', num: true, sort: true }, { key: 'pen', label: 'Pen', num: true, sort: true }, { key: 'pts', label: 'Points', num: true, sort: true, desc: true }
          ], rows.map(function (x) {
            var d = driver(x.driver);
            return { href: profileLink(d), linkCol: 1, cells: {
              pos: resultCell(x), driver: RR.cell(RR.nameWithFlag(d.name, d.country)), car: RR.cell(x.car || '-', className(x.cls)),
              time: RR.raceTime(x.time), gap: RR.gap(x.gap), diff: diffPos(x), bonus: bonusDots(x.bonusFastest !== undefined ? x.bonusFastest : x.fastest ? 1 : 0, x.bonusClean ? 1 : 0, poleFor(x) ? 1 : 0),
              inc: x.incidents, pen: penaltyText(x), pts: pointsNode({ points: x.points, bonus: x.bonus + poleFor(x) })
            }, sort: {
              /* Result: finishing order inside each class, as the rows come. */
              pos: x.cls + '|' + ('000' + x.pos).slice(-3), driver: d.name.toLowerCase(), car: String(x.car || '').toLowerCase(),
              time: x.time > 0 ? x.time : null, gap: x.status === 'Finished' && x.pos > 1 ? x.gap : null,
              bonus: (x.bonusFastest !== undefined ? x.bonusFastest : x.fastest ? 1 : 0) + (x.bonusClean ? 1 : 0) + (poleFor(x) ? 1 : 0),
              diff: x.status === 'Finished' && x.start ? x.start - x.pos : null,
              inc: x.incidents, pen: x.penaltyPoints || 0, pts: x.points + x.bonus + poleFor(x)
            } };
          }), 'No results for this class.');
        }
        var head = RR.heading(r.track + ' · ' + r.layout);
        if (open) head.appendChild(el('span', 'rr-heading-note', ' (Protests close ' + r.protestCloses + ')'));
        fill(right, head,
          picker, table,
          protestTable(season, pickedRound) ? RR.heading('Protest rulings') : null, protestTable(season, pickedRound));
      }
      drawTable();
      fill(RR.view('results'), add(el('div', 'rr-split'), add(el('div'), list), right));
    }

    function drawLapTimes() {
      var done = countedRounds(season);
      if (!done.length) { fill(RR.view('laptimes'), RR.empty('No lap times have been set yet.')); return; }
      if (!pickedTrack || !done.some(function (q) { return q.n === pickedTrack; })) pickedTrack = done[0].n;
      var items = done.map(function (r) { return [r.n, r.track]; });
      var list = RR.sidelist(items, function (n) { pickedTrack = n; pickedLapRace = 1; drawTable(); });
      pressRow(list, items.map(function (i) { return i[0]; }).indexOf(pickedTrack));
      var right = el('div', 'rr-stack');
      function drawTable() {
        var r = roundOf(season, pickedTrack), opts = raceOptions(r, false), picker = null;
        if (!opts || !(pickedLapRace >= 1 && pickedLapRace <= r.races)) pickedLapRace = 1;
        if (opts) { picker = RR.segment(opts, function (v) { pickedLapRace = v; drawTable(); }); pressOption(picker, opts, pickedLapRace); }
        var rows = season.results.filter(function (x) { return x.round === pickedTrack && (x.race || 1) === pickedLapRace && (cls === 'all' || x.cls === cls); })
          .filter(function (x) { return x.avg; }).sort(function (a, b) { return a.avg - b.avg; });
        var fastest = rows.length ? rows[0].avg : 0;
        fill(right, RR.heading(r.track + ' · ' + r.layout), picker, RR.table([
          { key: 'pos', label: 'Pos', sort: true, sorted: true }, { key: 'driver', label: 'Driver', sort: true }, { key: 'car', label: 'Car / Class', sort: true },
          { key: 'best', label: 'Best lap', num: true, sort: true }, { key: 'lap', label: 'Avg lap time', num: true, sort: true },
          { key: 'delta', label: 'Delta leader', num: true, sort: true }
        ], rows.map(function (x, i) {
          var d = driver(x.driver);
          return { href: profileLink(d), linkCol: 1, cells: {
            pos: i + 1, driver: RR.cell(RR.nameWithFlag(d.name, d.country)), best: RR.lap(x.best), lap: RR.lap(x.avg), delta: RR.gap(x.avg - fastest),
            car: RR.cell(x.car, className(x.cls))
          }, sort: { pos: i + 1, driver: d.name.toLowerCase(), best: x.best > 0 ? x.best : null, lap: x.avg, delta: x.avg - fastest, car: String(x.car || '').toLowerCase() } };
        }), 'No lap times for this class.'));
      }
      drawTable();
      fill(RR.view('laptimes'), add(el('div', 'rr-split'), add(el('div'), list), right));
    }

    /* Start time of a round in the visitor's own time zone (the browser's), as { date: 'MM/DD/YYYY', time: '20:00', zone: 'EST' }. */
    function localStart(r) {
      if (!r.start) return null;
      var d = new Date(r.start);
      if (isNaN(d.getTime())) return null;
      var p = {};
      new Intl.DateTimeFormat('en-GB', { hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
        timeZoneName: 'short' }).formatToParts(d).forEach(function (x) { p[x.type] = x.value; });
      return { date: p.month + '/' + p.day + '/' + p.year, time: p.hour + ':' + p.minute, zone: p.timeZoneName };
    }
    /* The venue's logo (from the store pictures we saved) in front of the track name. */
    function trackCell(r) {
      var w = el('span', 'rr-track-cell');
      if (r.layoutId) w.appendChild(RR.images.venueLogoOfLayout(r.layoutId, { className: 'rr-venue-logo', alt: r.track }));
      w.appendChild(RR.cell(r.track, r.layout));
      return w;
    }
    /* The layout column: just the layout map (the layout's name stays under the track name). */
    function layoutCell(r) {
      var w = el('span', 'rr-track-cell');
      if (r.layoutId) w.appendChild(RR.images.img('layout', r.layoutId, { className: 'rr-layout-img', alt: (r.layout || r.track) + ' layout' }));
      return w;
    }
    var TIMES_OF_DAY = ['Dawn', 'Morning', 'Noon', 'Afternoon', 'Sunset'];
    function drawSchedule() {
      fill(RR.view('schedule'), RR.table([
        { key: 'n', label: 'Round', sort: true, sorted: true }, { key: 'date', label: 'Date', sort: true }, { key: 'time', label: 'Time', sort: true },
        { key: 'track', label: 'Track', sort: true }, { key: 'layout', label: 'Layout', sort: true }, { key: 'race', label: 'Race time', sort: true }, { key: 'sky', label: 'Weather', sort: true }, { key: 'status', label: 'Status', sort: true }
      ], season.rounds.filter(function (r) { return !onlyUpcoming || (!r.done && !r.cancelled); }).map(function (r) {
        var at = localStart(r);
        return { cells: { n: 'Round ' + r.n, track: trackCell(r), layout: layoutCell(r), date: at ? at.date : r.date,
          time: at ? RR.cell(at.time, at.zone) : '-',
          race: r.day ? TIMES_OF_DAY[r.day.tod] || '-' : '-', sky: r.day ? RR.sky(r.day.sky.slice(0, 1)) : '-',
          status: r.cancelled ? RR.tag('Cancelled', true) : (r.done ? RR.tag('Finished') : RR.tag('Upcoming', true)) },
          /* Round and Date are the same order (the calendar). Time is the time of day. Status: Finished, then Upcoming, then Cancelled. */
          sort: { n: r.n, track: r.track.toLowerCase(), layout: String(r.layout || '').toLowerCase(), date: r.start && !isNaN(Date.parse(r.start)) ? Date.parse(r.start) : r.n,
            time: at ? Number(at.time.slice(0, 2)) * 60 + Number(at.time.slice(3)) : null,
            race: r.day ? r.day.tod : null, sky: r.day && r.day.sky.length ? r.day.sky[0] : null, status: r.cancelled ? 2 : (r.done ? 0 : 1) } };
      }), onlyUpcoming ? 'No upcoming rounds.' : 'The schedule has not been posted yet.'));
    }

    /* Season: what the season is made of, from what the season wizard saved. Each class with its cars and liveries,
       then the race rules, the weekend format and the points. */
    function seasonPanel(title) {
      var box = el('div', 'rr-panel rr-stack');
      if (title) box.appendChild(RR.heading(title));
      for (var i = 1; i < arguments.length; i++) if (arguments[i]) box.appendChild(arguments[i]);
      return box;
    }
    function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
    function seasonCar(k) {
      var info = el('div', 'rr-season-info'), strip = el('div', 'rr-season-liveries');
      var pic = el('div', 'rr-season-car-pic'), thumbs = [];
      function showLivery(id, thumb) {
        pic.textContent = '';
        pic.appendChild(RR.images.img('livery', id, { size: 'full', className: 'rr-season-car-img', alt: k.name, quiet: true }));
        thumbs.forEach(function (x) { x.classList.toggle('rr-selected', x === thumb); x.setAttribute('aria-pressed', x === thumb ? 'true' : 'false'); });
      }
      k.liveries.forEach(function (id) {
        var th = RR.images.img('livery', id, { className: 'rr-season-livery' });
        th.setAttribute('role', 'button'); th.setAttribute('tabindex', '0'); th.setAttribute('aria-label', 'Show this livery');
        th.addEventListener('click', function () { showLivery(id, th); });
        th.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showLivery(id, th); } });
        thumbs.push(th);
        strip.appendChild(th);
      });
      showLivery(k.liveries[0], thumbs[0]);
      RR.images.details(k.carId).then(function (d) {
        if (!d) return;
        [['Power', d.powerHp ? d.powerHp + ' hp' : ''], ['Weight', d.weightKg ? RR.num(d.weightKg) + ' kg' : ''],
          ['Drivetrain', d.drivetrain], ['Top speed', d.topSpeedKmh ? d.topSpeedKmh + ' km/h' : '']].forEach(function (x) {
          if (x[1]) info.appendChild(RR.kv(x[0], x[1], true));
        });
      });
      /* The manufacturer's logo goes in front of the car name once the picture database knows the car's manufacturer. */
      var title = el('h3', 'rr-card-title rr-season-car-title', k.name);
      RR.images.ready('r3e').then(function () {
        var i = RR.images.info('car', k.carId);
        if (i && i.manufacturer && i.manufacturer.id !== undefined && i.manufacturer.id !== null) title.insertBefore(RR.images.logo(i.manufacturer.id, { className: 'rr-season-mfr', alt: i.manufacturer.name }), title.firstChild);
      });
      return add(el('div', 'rr-season-car'),
        pic,
        title, info, strip);
    }
    /* RaceRoom's store page for a class: /store/cars/<class name as a web address>/<class id> (DTM 1992 is /store/cars/dtm-1992/3499). */
    function storeLabel(c, text) {
      var slug = String(c.name).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      return storeLine(text, 'https://game.raceroomracing.com/store/cars/' + slug + '/' + c.classId);
    }
    /* A small caps line: the text, a dot, then the link to the RaceRoom store. */
    function storeLine(text, url) {
      var label = RR.label(text + ' \u00B7 '), a = el('a', 'rr-link', 'Visit the RaceRoom store to purchase content');
      a.href = url; a.target = '_blank'; a.rel = 'noopener';
      label.appendChild(a);
      return label;
    }
    /* The tracks of the season, each track and layout once, in calendar order. */
    function seasonTracks() {
      var seen = {}, list = [];
      season.rounds.filter(function (r) { return !r.cancelled && r.track; }).forEach(function (r) {
        var key = (r.layoutId || r.track) + '|' + r.track + '|' + (r.layout || '');
        if (!seen[key]) { seen[key] = 1; list.push(r); }
      });
      return list;
    }
    function seasonTrackList() {
      var list = seasonTracks();
      return seasonPanel('Tracks',
        storeLine(plural(list.length, 'track', 'tracks'), 'https://game.raceroomracing.com/store/tracks'),
        RR.table([{ key: 'track', label: 'Track' }, { key: 'layout', label: 'Layout' }],
          list.map(function (r) { return { cells: { track: trackCell(r), layout: layoutCell(r) } }; }), 'The schedule has not been posted yet.'));
    }
    function seasonClass(c) {
      var liveries = c.cars.reduce(function (n, k) { return n + k.liveries.length; }, 0), cars = el('div', 'rr-season-cars');
      c.cars.forEach(function (k) { cars.appendChild(seasonCar(k)); });
      return seasonPanel(null,
        add(el('div', 'rr-season-head'), RR.images.img('class', c.classId, { className: 'rr-season-class-img', alt: c.name }),
          add(el('div'), RR.heading(c.name), storeLabel(c, plural(c.cars.length, 'car', 'cars') + ' \u00B7 ' + plural(liveries, 'livery', 'liveries')))),
        cars);
    }
    /* The box at the top of the Season tab: the season's name, how big it is, and what is worth knowing at a glance, with the two links most people need. */
    function seasonSummary() {
      var live = season.rounds.filter(function (r) { return !r.cancelled; }), dates = live.map(function (r) { return r.date; }).filter(Boolean);
      var nClasses = season.setup && season.setup.classes ? season.setup.classes.length : classesIn(season).length;
      var sub = [plural(live.length, 'round', 'rounds')];
      if (dates.length) sub.push(dates.length > 1 && dates[0] !== dates[dates.length - 1] ? dates[0] + ' to ' + dates[dates.length - 1] : dates[0]);
      sub.push(nClasses > 1 ? 'Multi-class' : 'Single class');
      var ran = live.filter(function (r) { return r.done; }).length, next = live.filter(function (r) { return !r.done; })[0];
      var kv = el('div', 'rr-kv-list');
      kv.appendChild(RR.kv('Status', season.status === 'Active' ? 'In progress' : (season.status === 'Finished' ? 'Finished' : season.status)));
      kv.appendChild(RR.kv('Rounds run', ran + ' of ' + live.length));
      if (next) kv.appendChild(RR.kv('Next round', next.track + (next.layout && next.layout !== next.track ? ', ' + next.layout : '') + (next.date ? ' \u00B7 ' + next.date : '')));
      kv.appendChild(RR.kv('Classes', (season.setup && season.setup.classes ? season.setup.classes.map(function (c) { return c.name; }) : classesIn(season).map(function (c) { return c.name; })).join(', ')));
      if (season.format && season.format.races > 1) kv.appendChild(RR.kv('Races per round', String(season.format.races)));
      kv.appendChild(RR.kv('Dropped rounds', season.dropWeeks ? String(season.dropWeeks) : 'None'));
      if (season.status === 'Finished' && season.champions && Object.keys(season.champions).length) {
        var names = Object.keys(season.champions).map(function (c) { var dr = byId(D.drivers, season.champions[c]); return dr ? dr.name : ''; }).filter(Boolean);
        if (names.length) kv.appendChild(RR.kv(names.length > 1 ? 'Champions' : 'Champion', names.join(', ')));
      }
      kv.appendChild(RR.kv('Protests', 'Open for 12 hours after each race'));
      return seasonPanel(season.name, RR.label(sub.join(' \u00B7 ')), kv,
        add(el('div', 'rr-form-row'), RR.linkButton('Help and rules', 'help.html', 'help'), RR.linkButton('File a protest', 'protest.html', 'protest')));
    }
    function drawSeason() {
      var setup = season.setup, node = RR.view('season');
      var out = el('div', 'rr-stack');
      out.appendChild(seasonSummary());
      if (!setup) { out.appendChild(RR.empty('The details for this season have not been posted yet.')); fill(node, out); return; }
      setup.classes.filter(function (c) { return cls === 'all' || c.id === cls; }).forEach(function (c) { out.appendChild(seasonClass(c)); });
      if (seasonTracks().length) out.appendChild(seasonTrackList());
      var rules = el('div', 'rr-season-rules');
      setup.rules.forEach(function (g) {
        var col = el('div', 'rr-stack-tight');
        col.appendChild(add(el('div', 'rr-season-rule-head'), RR.label(g.group)));
        g.items.forEach(function (x) { col.appendChild(RR.kv(x[0], x[1], true)); });
        rules.appendChild(col);
      });
      out.appendChild(seasonPanel('Race rules', rules));
      out.appendChild(seasonPanel('Race weekend', RR.table(
        [{ key: 'session', label: 'Session' }, { key: 'length', label: 'Length' }, { key: 'start', label: 'Start' }],
        setup.weekend.map(function (w) { return { cells: { session: w.session, length: w.length, start: w.start } }; }),
        'The weekend format has not been posted yet.')));
      var pts = setup.points, bonus = el('div', 'rr-kv-list');
      pts.bonuses.forEach(function (b) { bonus.appendChild(RR.kv(b[0], b[1])); });
      (pts.notes || []).forEach(function (t) { bonus.appendChild(RR.kv('Format', t)); });
      bonus.appendChild(RR.kv('Dropped rounds', pts.dropWeeks ? String(pts.dropWeeks) : 'None'));
      out.appendChild(seasonPanel('Points', RR.table(
        [{ key: 'name', label: 'Class' }, { key: 'table', label: 'Points by finishing position' }],
        pts.classes.filter(function (c) { return cls === 'all' || className(cls) === c.name; })
          .map(function (c) { return { cells: { name: c.name, table: c.table } }; }), 'No points table posted yet.'), bonus));
      fill(node, out);
    }

    function drawAll() { drawStandings(); drawResults(); drawLapTimes(); drawSchedule(); drawSeason(); RR.refresh(); }
    /* The Class dropdown only lists classes that raced in the chosen season. */
    function drawClassSelect() {
      var here = classesIn(season), several = here.length > 1;
      /* Classes are never ranked together: a season with more than one class always shows one class at a time. */
      if (several && (cls === 'all' || !here.some(function (c) { return c.id === cls; }))) cls = here[0].id;
      else if (!several && cls !== 'all' && !here.some(function (c) { return c.id === cls; })) cls = 'all';
      fill(classBox, RR.select('Class', (several ? [] : [['all', 'All classes']]).concat(here.map(function (c) { return [c.id, c.name]; })),
        function (v) { cls = v; drawAll(); }, cls));
    }

    RR.headTool(RR.select('Season', D.seasons.map(function (s) { return [s.id, seasonLabel(s)]; }), function (v) {
      season = seasonById(v); pickedRound = null; pickedTrack = null; drawClassSelect(); drawAll();
    }, season.id));
    RR.headTool(classBox);
    RR.headTool(RR.checkbox('Only upcoming', function (on) { onlyUpcoming = on; drawSchedule(); }), 'schedule');
    drawClassSelect();
    drawAll();
  };

  /* ---------------- PROTEST (protest.html): file a protest during the 12 hours after a race, and read past rulings ---------------- */
  PAGES.protest = function () {
    var season = D.seasons[0], pickedRound = null;
    var holder = el('div', 'rr-stack');
    var message = null;

    function drawBody() {
      var done = doneRounds(season);
      if (!done.length) { fill(holder, RR.empty('No races have been run yet.')); return; }
      if (!pickedRound || !roundOf(season, pickedRound) || !roundOf(season, pickedRound).done) pickedRound = done[done.length - 1].n;
      var items = done.map(function (r) { return [r.n, 'Round ' + r.n, r.date]; }).reverse();
      var list = RR.sidelist(items, function (n) { pickedRound = n; message = null; drawRound(); });
      pressRow(list, items.map(function (i) { return i[0]; }).indexOf(pickedRound));
      var right = el('div', 'rr-stack');
      function drawRound() {
        var r = roundOf(season, pickedRound), open = !!r.protestCloses, rulings = protestTable(season, r.n);
        fill(right, message, RR.heading(r.track + ' · ' + r.layout),
          add(el('div', 'rr-form-row'), RR.tag(open ? 'Protests open' : 'Protests closed', !open),
            RR.label(open ? 'Protests close ' + r.protestCloses : 'The 12 hour protest window is over')),
          open ? protestForm(r) : null,
          RR.heading('Protest rulings'),
          rulings || RR.empty(open ? 'Protests stay private until they are ruled. Penalties from them appear here.' : 'No penalties were given from protests for this race.'));
      }
      drawRound();
      fill(holder, add(el('div', 'rr-split'), add(el('div'), list), right));
    }

    /* The form. Nothing is saved yet: submitting adds the protest to this page as Pending so the layout can be seen. */
    function protestForm(r) {
      var field = D.drivers.filter(function (d) { return season.results.some(function (x) { return x.round === r.n && x.driver === d.id; }); })
        .sort(function (a, b) { return a.name.localeCompare(b.name); });
      var laps = Math.max.apply(null, season.results.filter(function (x) { return x.round === r.n; }).map(function (x) { return x.laps; }));
      var races = r.races || 1, needsPassword = !season.openServer;   /* a league with no password (public server) is asked for none */
      var f = { me: '', other: '', self: false, reason: '', race: races > 1 ? '' : '1', lap: '', note: '', password: '' };
      var box = el('div', 'rr-panel rr-stack');
      var submit = RR.button('Submit protest', null, false), warn = el('div');
      var otherBox = el('div'), submitWrap = el('div', 'rr-form-row');

      function drivers(exclude) {
        return [['', 'Choose a driver']].concat(field.filter(function (d) { return d.id !== exclude; }).map(function (d) { return [d.id, d.name]; }));
      }
      function missing() {
        var m = [];
        if (!f.me) m.push('who you are');
        if (!f.other) m.push(f.self ? 'the driver you interfered with' : 'the driver you are reporting');
        if (!f.reason) m.push('a reason');
        if (!f.race) m.push('the race');
        if (!f.lap) m.push('the lap');
        if (needsPassword && !f.password) m.push('the league password');
        if (!f.note.trim()) m.push('what happened');
        return m;
      }
      function refresh() {
        var m = missing();
        mark();
      }
      /* After a click on Submit with something missing, each missing box gets a red border until it is filled. */
      var flagged = false, meSelect, reasonSelect, raceSelect, lapSelect, passwordBox, narrative;
      function mark() {
        function set(box, bad) { if (!box) return; if (flagged && bad) box.setAttribute('aria-invalid', 'true'); else box.removeAttribute('aria-invalid'); }
        set(meSelect, !f.me); set(otherBox.firstChild, !f.other); set(reasonSelect, !f.reason); set(raceSelect, !f.race); set(lapSelect, !f.lap); set(passwordBox, needsPassword && !f.password); set(narrative, !f.note.trim());
      }
      function drawOther() {
        fill(otherBox, RR.select(f.self ? 'Driver you interfered with' : 'Driver you are reporting', drivers(f.me), function (v) { f.other = v; refresh(); }, f.other));
        mark();
      }

      meSelect = RR.select('Who are you', drivers(''), function (v) {
        f.me = v;
        if (f.other === v) f.other = '';
        drawOther(); refresh();
      }, f.me);
      var selfBox = RR.checkbox('Self report', function (on) { f.self = on; drawOther(); refresh(); }, false);
      reasonSelect = RR.select('Reason', [['', 'Choose a reason']].concat(D.protestReasons.map(function (x) { return [x, x]; })), function (v) { f.reason = v; refresh(); }, f.reason);
      if (races > 1) {
        var raceOpts = [['', 'Choose a race']];
        for (var q = 1; q <= races; q++) raceOpts.push([String(q), 'Race ' + q]);
        raceSelect = RR.select('Race', raceOpts, function (v) { f.race = v; refresh(); }, f.race);
      }
      var lapOptions = [['', 'Choose a lap']];
      for (var i = 1; i <= laps; i++) lapOptions.push([String(i), 'Lap ' + i]);
      lapSelect = RR.select('Lap', lapOptions, function (v) { f.lap = v; refresh(); }, f.lap);
      passwordBox = needsPassword ? RR.input({ label: 'League password', type: 'password', onChange: function (v) { f.password = v; refresh(); } }) : null;
      narrative = RR.textarea({ label: 'What happened?', value: '', onChange: function (v) { f.note = v; refresh(); } });

      var reasons = { 'wrong-password': 'That is not the league password. Only league members have it.', locked: 'Too many wrong passwords for this round. Try again in 10 minutes.',
        closed: 'The protest window for this round is over.', 'not-open': 'This round is not open for protests.', duplicate: 'You already filed this protest.',
        'too-many': 'You have filed the most protests allowed for this round.', busy: 'Many protests are being filed right now. Try again in a few minutes.',
        unreachable: 'Could not reach the league service. Try again.', 'no-address': 'Protests cannot be filed from this page yet.' };
      RR.arm(submit, '', 'Confirm protest', function () {
        if (!D.sample) {
          submit.disabled = true;
          fill(warn, RR.notice('Filing your protest...', 'ok'));
          RR.post('fileProtest', { roundId: r.id, password: f.password, me: f.me, other: f.other, self: f.self, race: Number(f.race), lap: Number(f.lap), reason: f.reason, narrative: f.note.trim() }).then(function (res) {
            submit.disabled = false;
            if (!(res && res.ok)) { fill(warn, RR.notice(reasons[res && res.error] || 'Your protest could not be filed. Check the boxes and try again.', 'warn')); return; }
            fill(warn);
            message = RR.notice('Your protest was filed. It stays private until the stewards rule on it.', 'ok');
            pickedRound = r.n;
            drawBody();
          });
          return;
        }
        /* SAMPLE check (sample data only). The real check is done by the service, so the password is never in the page. */
        if (needsPassword && f.password !== D.sampleRacePassword) { fill(warn, RR.notice('That is not the league password. Only league members have it.', 'warn')); return; }
        fill(warn);
        message = RR.notice('Your protest was submitted. It stays private until the stewards rule on it.', 'ok');
        pickedRound = r.n;
        drawBody();
      }, function () {
        if (!missing().length) return true;
        flagged = true;
        mark();
        return false;
      });
      add(submitWrap, submit);
      drawOther();
      refresh();
      add(box, RR.label('File a protest'),
        RR.notice('Filing a false or misleading protest, including one filed in another driver\u2019s name, is against Race Club\u2019s rules and the spirit of fair competition. A protest stays private until the stewards rule on it, and only a driver who is given a penalty is named in public.', 'warn'),
        RR.row(meSelect, selfBox),
        otherBox,
        RR.row(reasonSelect, raceSelect, lapSelect),
        narrative,
        passwordBox ? RR.row(passwordBox) : null,
        warn, submitWrap);
      return box;
    }

    RR.headTool(RR.select('Season', D.seasons.map(function (s) { return [s.id, seasonLabel(s)]; }), function (v) {
      season = seasonById(v); pickedRound = null; drawBody();
    }, season.id));
    document.querySelector('main').appendChild(holder);
    drawBody();
  };

  /* ---------------- PROFILES LIST (drivers.html) ---------------- */
  PAGES.profiles = function () {
    var holder = el('div'), status = 'all', pickedClass = 'all';
    document.querySelector('main').appendChild(holder);
    /* Everyone who has raced for the club. Drivers in the current season come first, then everyone else who has raced before. */
    function draw() {
      var rows = D.drivers.filter(function (d) { return (pickedClass === 'all' || d.cls === pickedClass) && (status === 'all' || (status === 'current') === (d.current !== false)); })
        .sort(function (a, b) { return ((b.current !== false) - (a.current !== false)) || a.name.localeCompare(b.name); });
      fill(holder, RR.table([
        { key: 'driver', label: 'Driver', sort: true, sorted: true }, { key: 'country', label: 'Country', sort: true },
        { key: 'status', label: 'Status', sort: true },
        { key: 'car', label: 'Favorite car/class', sort: true }, { key: 'races', label: 'Races', num: true, sort: true, desc: true }, { key: 'wins', label: 'Wins', num: true, sort: true, desc: true },
        { key: 'podiums', label: 'Podiums', num: true, sort: true, desc: true }, { key: 'points', label: 'Points', num: true, sort: true, desc: true }
      ], rows.map(function (d) {
        var now = d.current !== false;
        return { href: profileLink(d), cells: { driver: RR.cell(RR.nameWithFlag(d.name, d.country)), country: RR.countryName(d.country) || '-', status: now ? 'In a season' : 'Raced before',
          car: d.cls || d.car ? RR.cell(d.car || '-', className(d.cls)) : '-', races: d.races, wins: d.wins, podiums: d.podiums, points: d.points },
          sort: { driver: d.name.toLowerCase(), country: RR.countryName(d.country).toLowerCase(), status: now ? 0 : 1, car: (d.car || '').toLowerCase() } };
      }), 'No drivers yet.'));
    }
    RR.headTool(RR.segment([['all', 'All'], ['current', 'In a season'], ['past', 'Raced before']], function (v) { status = v; draw(); }));
    RR.headTool(RR.select('Class', [['all', 'All classes']].concat(D.classes.map(function (c) { return [c.id, c.name]; })), function (v) { pickedClass = v; draw(); }));
    draw();
  };

  /* ---------------- ONE DRIVER (driver.html?driver=...): career pages, filtered by the Season dropdown ---------------- */

  /* Every race a driver ran in the chosen seasons, newest first: [{ x: result, season, round }]. */
  function profileRows(d, sel) {
    var out = [];
    D.seasons.forEach(function (s) {
      if (sel !== 'all' && s.id !== sel) return;
      s.results.filter(function (x) { return x.driver === d.id; }).sort(function (a, b) { return b.round - a.round; })
        .forEach(function (x) { out.push({ x: x, season: s, round: roundOf(s, x.round) }); });
    });
    return out;
  }
  function avg(list, fn) { return list.length ? list.reduce(function (sum, r) { return sum + fn(r); }, 0) / list.length : 0; }
  function grouped(rows, keyFn) {
    var map = {}, order = [];
    rows.forEach(function (r) { var k = keyFn(r); if (!map[k]) { map[k] = []; order.push(k); } map[k].push(r); });
    return order.map(function (k) { return { key: k, rows: map[k] }; });
  }
  /* Everything the profile pages show, worked out from the races above. */
  function profileStats(d, rows, sel) {
    var done = rows.filter(function (r) { return r.x.status === 'Finished'; });
    var st = { races: rows.length, finished: done.length };
    st.dnf = st.races - st.finished;
    st.wins = done.filter(function (r) { return r.x.pos === 1; }).length;
    st.podiums = done.filter(function (r) { return r.x.pos <= 3; }).length;
    st.poles = rows.filter(function (r) { return r.x.pole; }).length;
    st.fastest = rows.filter(function (r) { return r.x.fastest; }).length;
    st.led = rows.reduce(function (n, r) { return n + r.x.led; }, 0);
    st.laps = rows.reduce(function (n, r) { return n + r.x.laps; }, 0);
    st.invalid = rows.reduce(function (n, r) { return n + r.x.invalid; }, 0);
    st.incidents = rows.reduce(function (n, r) { return n + r.x.incidents; }, 0);
    st.penalties = rows.filter(function (r) { return r.x.penalty; }).length;
    st.hours = rows.reduce(function (n, r) { return n + r.x.laps * r.x.best; }, 0) / 3600000;
    st.points = D.seasons.reduce(function (n, s) { return n + ((sel === 'all' || s.id === sel) && s.totals[d.id] ? s.totals[d.id].total : 0); }, 0);
    st.incPerRace = st.races ? st.incidents / st.races : 0;
    st.avgGapPct = st.races ? avg(rows, function (r) { return r.x.gapPct; }) : 0;
    /* A clean lap is a lap with no incident points. (Data published before incidentLaps existed falls back to invalid laps until the site data is published again.) */
    st.incidentLaps = rows.reduce(function (n, r) { return n + (typeof r.x.incidentLaps === 'number' ? r.x.incidentLaps : r.x.invalid); }, 0);
    st.cleanLaps = st.laps ? Math.max(0, 100 - st.incidentLaps / st.laps * 100) : 0;
    /* The four radar axes, each 0 to 100% (higher is better), all from league data:
       League results = average share of the field beaten (shown as Top n%). Finishing = share of races finished.
       Clean laps = share of laps with no incident points.
       Pace = where the driver's best-lap gap ranks among every driver in the same seasons (worked out where the radar is drawn, because it needs the other drivers). */
    st.radar = [
      { label: 'League results', value: avg(rows, function (r) { return r.x.of > 1 ? (r.x.of - r.x.pos) / (r.x.of - 1) * 100 : 100; }) },
      { label: 'Finishing', value: st.races ? st.finished / st.races * 100 : 0 },
      { label: 'Clean laps', value: st.cleanLaps },
      { label: 'Pace', value: 0 }
    ];
    /* Rounds in a row: every finished round of the chosen seasons, oldest first, counted as attended or missed. */
    var seq = [];
    D.seasons.slice().reverse().forEach(function (s) {
      if (sel !== 'all' && s.id !== sel) return;
      doneRounds(s).forEach(function (r) { seq.push(!!resultOf(s, r.n, d.id)); });
    });
    var run = 0; st.bestStreak = 0;
    seq.forEach(function (a) { run = a ? run + 1 : 0; if (run > st.bestStreak) st.bestStreak = run; });
    st.streak = run;
    return st;
  }

  /* Achievements. Each is worked out from the races in order, so the date it was earned is the race that completed it. */
  function achievementList(d, rows, sel) {
    var chrono = rows.slice().reverse(), out = [];
    function status(total, goal, date) { return date ? { earned: date } : (total > 0 ? { progress: [total, goal] } : { notYet: true }); }
    function counted(group, title, desc, fn, goal, hidden) {
      var total = 0, date = null;
      chrono.forEach(function (r) { total += fn(r.x); if (!date && total >= goal) date = r.round.date; });
      out.push({ group: group, title: title, desc: desc, hidden: !!hidden, status: status(total, goal, date) });
    }
    function distinct(group, title, desc, keyFn, goal) {
      var seen = {}, total = 0, date = null;
      chrono.forEach(function (r) { var k = keyFn(r); if (!seen[k]) { seen[k] = 1; total++; if (!date && total >= goal) date = r.round.date; } });
      out.push({ group: group, title: title, desc: desc, hidden: false, status: status(total, goal, date) });
    }
    function one(r) { return r ? 1 : 0; }
    counted('Starting out', 'First race', 'Finish your first league race.', function (x) { return one(x.status === 'Finished'); }, 1);
    counted('Starting out', 'Five races', 'Take part in five league races.', function () { return 1; }, 5);
    counted('Starting out', 'Ten races', 'Take part in ten league races.', function () { return 1; }, 10);
    counted('Starting out', 'Twenty races', 'Take part in twenty league races.', function () { return 1; }, 20);
    counted('Starting out', 'First points', 'Score points in a race.', function (x) { return one(x.points + x.bonus > 0); }, 1);
    counted('Starting out', 'Fifty points', 'Score fifty championship points.', function (x) { return x.points + x.bonus; }, 50);
    counted('Results', 'On the podium', 'Finish a race in the top three.', function (x) { return one(x.status === 'Finished' && x.pos <= 3); }, 1);
    counted('Results', 'First win', 'Win a league race.', function (x) { return one(x.status === 'Finished' && x.pos === 1); }, 1);
    counted('Results', 'Five wins', 'Win five league races.', function (x) { return one(x.status === 'Finished' && x.pos === 1); }, 5);
    counted('Results', 'Ten podiums', 'Finish on the podium ten times.', function (x) { return one(x.status === 'Finished' && x.pos <= 3); }, 10);
    counted('Results', 'On pole', 'Start a race from pole position.', function (x) { return one(x.pole); }, 1);
    counted('Results', 'Quickest of all', 'Set the fastest lap of a race.', function (x) { return one(x.fastest); }, 1, true);
    counted('Clean racing', 'Clean race', 'Finish a race with no incident points.', function (x) { return one(x.status === 'Finished' && x.incidents === 0); }, 1);
    counted('Clean racing', 'Five clean races', 'Finish five races with no incident points.', function (x) { return one(x.status === 'Finished' && x.incidents === 0); }, 5);
    counted('Clean racing', 'Ten clean races', 'Finish ten races with no incident points.', function (x) { return one(x.status === 'Finished' && x.incidents === 0); }, 10);
    counted('Clean racing', 'Five clear races', 'Finish five races without a penalty.', function (x) { return one(x.status === 'Finished' && !x.penalty); }, 5);
    counted('Clean racing', 'Led a lap', 'Lead at least one lap of a race.', function (x) { return one(x.led > 0); }, 1);
    counted('Clean racing', 'Fifty laps led', 'Lead fifty race laps in total.', function (x) { return x.led; }, 50);
    distinct('Variety', 'Two cars', 'Race two different cars.', function (r) { return r.x.car; }, 2);
    distinct('Variety', 'Three cars', 'Race three different cars.', function (r) { return r.x.car; }, 3);
    distinct('Variety', 'Both classes', 'Race in two classes.', function (r) { return r.x.cls; }, 2);
    distinct('Variety', 'Three tracks', 'Race at three different tracks.', function (r) { return r.round.track + r.round.layout; }, 3);
    distinct('Variety', 'Four tracks', 'Race at four different tracks.', function (r) { return r.round.track + r.round.layout; }, 4);
    distinct('Variety', 'Five tracks', 'Race at five different tracks.', function (r) { return r.round.track + r.round.layout; }, 5);
    /* Seasons: worked out from whole seasons, oldest first. */
    var mine = D.seasons.slice().reverse().filter(function (s) { return (sel === 'all' || s.id === sel) && s.results.some(function (x) { return x.driver === d.id; }); });
    function lastDate(s) { var r = doneRounds(s); return r.length ? r[r.length - 1].date : null; }
    function seasonAch(title, desc, goal, list, hidden) {
      out.push({ group: 'Seasons', title: title, desc: desc, hidden: !!hidden,
        status: list.length >= goal ? { earned: lastDate(list[goal - 1]) } : (list.length ? { progress: [list.length, goal] } : { notYet: true }) });
    }
    function attendedAll(s) { return s.status === 'Finished' && doneRounds(s).every(function (r) { return resultOf(s, r.n, d.id); }); }
    seasonAch('Season finisher', 'Race in every round of a season.', 1, mine.filter(attendedAll));
    seasonAch('Second season', 'Race in two seasons.', 2, mine);
    seasonAch('Third season', 'Race in three seasons.', 3, mine);
    seasonAch('Season podium', 'Finish a season in the top three of your class.', 1, mine.filter(function (s) {
      return s.status === 'Finished' && seasonRows(s, classIn(s, d)).map(function (r) { return r.d.id; }).indexOf(d.id) < 3;
    }));
    seasonAch('Perfect attendance', 'Race in every round of two seasons.', 2, mine.filter(attendedAll), true);
    seasonAch('Champion', 'Win a season championship.', 1, mine.filter(function (s) { return s.champion === d.id || (s.champions && Object.keys(s.champions).some(function (c) { return String(s.champions[c]) === String(d.id); })); }), true);
    return out;
  }

  /* Boards: one track layout in one class, each driver's best lap in the chosen seasons. */
  function boardList(d, sel) {
    var map = {};
    D.seasons.forEach(function (s) {
      if (sel !== 'all' && s.id !== sel) return;
      s.results.forEach(function (x) {
        var r = roundOf(s, x.round), key = r.track + '|' + r.layout + '|' + x.cls;
        var b = map[key] || (map[key] = { track: r.track, layout: r.layout, cls: x.cls, best: {} });
        var cur = b.best[x.driver];
        if (!cur || x.best < cur.lap) b.best[x.driver] = { lap: x.best, date: r.date };
      });
    });
    return Object.keys(map).map(function (k) { return map[k]; }).filter(function (b) { return b.best[d.id]; }).map(function (b) {
      var laps = Object.keys(b.best).map(function (id) { return b.best[id].lap; }), mineLap = b.best[d.id].lap, lead = Math.min.apply(null, laps);
      var pos = laps.filter(function (l) { return l < mineLap; }).length + 1;
      return { track: b.track, layout: b.layout, cls: b.cls, pos: pos, entries: laps.length, lap: mineLap, gap: mineLap - lead,
        gapPct: (mineLap - lead) / lead * 100, beaten: laps.length > 1 ? (laps.length - pos) / (laps.length - 1) * 100 : 0, date: b.best[d.id].date };
    }).sort(function (a, b) { return a.pos - b.pos || a.track.localeCompare(b.track); });
  }

  PAGES.profile = function () {
    var d = driver(RR.param('driver'));
    if (!d) {
      Array.prototype.forEach.call(document.querySelectorAll('[data-rr-view]'), function (v) {
        fill(v, RR.empty('This driver could not be found.'));
      });
      return;
    }
    RR.setTitle('Driver profile');
    document.title = d.name + ' | Race Club';
    var sel = 'all', clsFilter = 'all', achFilter = 'all', statPick = 'highlights', boardTrack = 'all', boardCls = 'all';
    var careerClasses = D.classes.filter(function (c) { return profileRows(d, 'all').some(function (r) { return r.x.cls === c.id; }); });
    var historyBox = el('div'), achBox = el('div', 'rr-stack'), statsRight = el('div', 'rr-stack'), boardBox = el('div', 'rr-stack');
    function pct(n) { return Math.round(n) + '%'; }
    function p1(n) { return n.toFixed(1); }

    function drawOverview(rows, st) {
      var season = sel === 'all' ? D.season : seasonById(sel);
      var myCls = classIn(season, d), table = seasonRows(season, myCls), place = table.map(function (r) { return r.d.id; }).indexOf(d.id) + 1;
      var lead = table[0], mineRow = table[place - 1], last = rows[0];
      var best = rows.filter(function (r) { return r.x.status === 'Finished'; }).sort(function (a, b) { return a.x.pos - b.x.pos; })[0];
      /* The Driver box carries the plain banner and the Race Club helmet, with the driver's information beside the helmet.
         The name and flag are in the page title. A driver has no team, and the class changes from season to season, so neither is shown here. */
      var nameLine = el('h2', 'rr-hero-title rr-name');
      (function () { var f = RR.flag(d.country); if (f) { f.style.width = '30px'; f.style.height = '21px'; nameLine.appendChild(f); } })();
      nameLine.appendChild(document.createTextNode(d.name));
      var card = RR.banner({ info: [
        RR.label('Name'), nameLine, el('div', 'rr-label rr-red', RR.countryName(d.country) || '-'),
        add(el('div', 'rr-kv-list'), RR.kv('Races', st.races), RR.kv('Wins', st.wins), RR.kv('Podiums', st.podiums),
          RR.kv('Hours on track', p1(st.hours)))] });
      /* The radar: the grid is percentages (0% in the centre, 100% at the edge) and higher is better. Results and Pace are shown as Top n%, so
         Top 1% sits at the edge. Pace is the driver's rank by best-lap gap among every driver in the same seasons. The plain facts behind each
         number are the hover text. A dashed shape shows the league average over the same drivers. */
      var field = [];
      D.drivers.forEach(function (x) {
        var xr = profileRows(x, sel);
        if (xr.length) field.push({ id: x.id, p: profileStats(x, xr, sel) });
      });
      var people = field.length, rank = 1;
      field.forEach(function (f) { if (st.races && f.p.avgGapPct < st.avgGapPct) rank++; });
      function paceOf(f) { var r = 1; field.forEach(function (g) { if (g.p.avgGapPct < f.p.avgGapPct) r++; }); return people > 1 ? (people - r) / (people - 1) * 100 : 100; }
      st.radar[3].value = people > 1 ? (people - rank) / (people - 1) * 100 : 100;
      function pc(i) { return Math.round(st.radar[i].value); }
      function top(v) { return 'Top ' + Math.max(1, 100 - Math.round(v)) + '%'; }
      var paceTop = 'Top ' + Math.max(1, Math.ceil(rank / Math.max(1, people) * 100)) + '%';
      var texts = st.races ? [top(st.radar[0].value), pc(1) + '% finished', pc(2) + '% clean', paceTop] : ['-', '-', '-', '-'];
      var tips = st.races ? [
        'On average this driver finished ahead of ' + pc(0) + '% of the field.',
        st.finished + ' of ' + st.races + ' races finished.',
        (st.laps - st.incidentLaps) + ' of ' + st.laps + ' laps were clean (no incident points).',
        'Best laps average ' + Math.max(0, st.avgGapPct).toFixed(2) + '% slower than the fastest in class. Ranked ' + rank + ' of ' + people + ' drivers.'
      ] : [];
      var sums = [0, 0, 0, 0], counts = [0, 0, 0, 0];
      field.forEach(function (f) {
        f.p.radar.forEach(function (a, i) {
          if (i === 3) { sums[i] += paceOf(f); counts[i]++; }
          else if (a.label === st.radar[i].label) { sums[i] += a.value; counts[i]++; }
        });
      });
      var radarAxes = st.radar.map(function (a, i) { return { label: a.label, value: a.value, text: texts[i], tip: tips[i], ref: people > 1 && counts[i] ? sums[i] / counts[i] : undefined }; });
      /* The car box shows the car the driver races in the league now: the car locked in the newest season the driver raced in. A driver who is not
         in the running season keeps showing the last car used. The line under it is the league season. */
      var leagueSeason = D.seasons.filter(function (s) { return s.results.some(function (x) { return x.driver === d.id; }); })[0];
      var inLeague = d.current !== false && !!leagueSeason && leagueSeason.status === 'Active';
      var leagueLine = 'No races yet';
      if (leagueSeason) {
        leagueLine = inLeague ? leagueSeason.name : 'Last raced in ' + leagueSeason.name;
      }
      var hero = RR.photo(add(el('div', 'rr-hero'), RR.label(inLeague ? 'Current Car' : 'Last Car'), el('h2', 'rr-hero-title', d.car || '-'),
        el('div', 'rr-label rr-red', className(d.cls)), el('div', 'rr-note', leagueLine)), d.livery, 'full');
      /* Season standing: only what the rest of the profile does not already show (points, wins, podiums and best finish are elsewhere). */
      var standing = add(el('div', 'rr-panel rr-stack'), RR.label('Season standing'));
      function pts(v) { return Math.round(v * 100) / 100; }
      if (mineRow) {
        var mine = rows.filter(function (r) { return r.season === season; }), ahead = table[place - 2], behind = table[place];
        var fin = mine.filter(function (r) { return r.x.status === 'Finished'; }), attended = {};
        mine.forEach(function (r) { attended[r.x.round] = 1; });
        var played = Object.keys(attended).length, ran = doneRounds(season).length;
        add(standing, add(el('div', 'rr-kv-list'), RR.kv('Season', season.name), RR.kv('Class', className(myCls)), RR.kv('Position', RR.pos(place) + ' of ' + table.length)),
          add(el('div', 'rr-kv-list'),
            RR.kv('Class leader', place > 1 ? lead.d.name : 'Leading'),
            RR.kv('Behind the leader', place > 1 ? String(pts(lead.t.total - mineRow.t.total)) : '-'),
            RR.kv(place > 1 ? 'Behind the car ahead' : 'Lead over second', place > 1 ? String(pts(ahead.t.total - mineRow.t.total)) : (behind ? String(pts(mineRow.t.total - behind.t.total)) : '-'))),
          add(el('div', 'rr-kv-list'),
            RR.kv('Average finish', fin.length ? 'P' + (fin.reduce(function (n, r) { return n + r.x.pos; }, 0) / fin.length).toFixed(1) : '-'),
            RR.kv('Points per round', played ? String(pts(mineRow.t.total / played)) : '-'),
            RR.kv('Rounds raced', played + ' of ' + ran)),
          add(el('div', 'rr-kv-list'),
            RR.kv('Poles', mine.filter(function (r) { return r.x.pole; }).length),
            RR.kv('Fastest laps', mine.filter(function (r) { return r.x.fastest; }).length),
            RR.kv('Laps led', mine.reduce(function (n, r) { return n + r.x.led; }, 0))));
        var five = el('div', 'rr-form-row');
        mine.slice(0, 5).reverse().forEach(function (r) { five.appendChild(RR.tag(r.x.status === 'Finished' ? 'P' + r.x.pos : r.x.status, true)); });
        add(standing, RR.label('Last five results, oldest first'), five);
      } else {
        var lastSeason = D.seasons.filter(function (s) { return s.totals[d.id]; })[0];
        add(standing, add(el('div', 'rr-kv-list'), RR.kv('Season', season.name)),
          el('p', 'rr-body', d.name + ' did not race in ' + season.name + '.'),
          lastSeason ? add(el('div', 'rr-kv-list'), RR.kv('Last raced', lastSeason.name), RR.kv('Class then', className(classIn(lastSeason, d)))) : el('p', 'rr-body', 'No season raced yet.'),
          lastSeason ? RR.row(RR.button('See ' + lastSeason.name, function () { goToSeason(lastSeason.id); })) : null);
      }
      var next = achievementList(d, rows, sel).filter(function (a) { return a.status.progress && !a.hidden; })
        .sort(function (a, b) { return b.status.progress[0] / b.status.progress[1] - a.status.progress[0] / a.status.progress[1]; }).slice(0, 3);
      var nextGrid = el('div', 'rr-grid-3');
      next.forEach(function (a) { nextGrid.appendChild(RR.card(a)); });
      fill(RR.view('overview'), add(el('div', 'rr-stack rr-stack-tight'),
        add(el('div', 'rr-grid-2'), card, hero),
        add(el('div', 'rr-grid-2'), RR.radar(radarAxes, 'League radar'), standing),
        RR.statRow([
          RR.stat('Last race', last ? (last.x.status === 'Finished' ? RR.pos(last.x.pos) : last.x.status) : '-', last ? last.round.track : 'No races yet'),
          RR.stat('Best finish', best ? RR.pos(best.x.pos) : '-', best ? best.round.track : 'No races yet'),
          RR.stat('Championship', place ? RR.pos(place) : '-', season.name),
          RR.stat('Points', RR.num(st.points), sel === 'all' ? 'All seasons' : season.name)
        ]),
        next.length ? RR.heading('Next achievements') : null,
        next.length ? nextGrid : null));
    }

    function drawHistory(rows) {
      var show = rows.filter(function (r) { return clsFilter === 'all' || r.x.cls === clsFilter; });
      fill(historyBox, RR.table([
        { key: 'pos', label: 'Result' }, { key: 'track', label: 'Track' }, { key: 'cls', label: 'Class' }, { key: 'best', label: 'Best lap', num: true },
        { key: 'gap', label: 'Gap', num: true }, { key: 'diff', label: 'Diff pos', num: true }, { key: 'inc', label: 'Inc', num: true }, { key: 'pen', label: 'Pen', num: true },
        { key: 'pts', label: 'Points', num: true }, { key: 'when', label: 'When', sorted: true }
      ], show.map(function (r) {
        return { cells: { pos: resultCell(r.x), track: RR.cell(r.round.track, r.round.layout + ' · ' + r.x.car + (r.round.races > 1 ? ' · Race ' + (r.x.race || 1) : '')), cls: className(r.x.cls),
          best: RR.lap(r.x.best), gap: RR.gap(r.x.gap), diff: diffPos(r.x), inc: r.x.incidents, pen: penaltyText(r.x), pts: pointsNode(r.x),
          when: RR.cell(r.round.date, sel === 'all' ? r.season.name : '') } };
      }), 'No races yet.'));
    }

    function drawStatistics(rows, st) {
      var cars = grouped(rows, function (r) { return r.x.car; }), classes = grouped(rows, function (r) { return r.x.cls; });
      var tracks = grouped(rows, function (r) { return r.round.track + ' · ' + r.round.layout; });
      var seasons = grouped(rows, function (r) { return r.season.id; });
      function agg(g) {
        var fin = g.rows.filter(function (r) { return r.x.status === 'Finished'; });
        return { races: g.rows.length, wins: fin.filter(function (r) { return r.x.pos === 1; }).length, podiums: fin.filter(function (r) { return r.x.pos <= 3; }).length,
          bestFinish: fin.length ? Math.min.apply(null, fin.map(function (r) { return r.x.pos; })) : 0, avgFinish: fin.length ? avg(fin, function (r) { return r.x.pos; }) : 0,
          laps: g.rows.reduce(function (n, r) { return n + r.x.laps; }, 0), bestLap: Math.min.apply(null, g.rows.map(function (r) { return r.x.best; })) };
      }
      var items = [['highlights', 'Highlights'], ['totals', 'All totals'], ['cars', 'Cars', cars.length], ['classes', 'Classes', classes.length],
        ['tracks', 'Tracks', tracks.length], ['seasons', 'Seasons', seasons.length]];
      var list = RR.sidelist(items, function (k) { statPick = k; drawRight(); });
      pressRow(list, items.map(function (i) { return i[0]; }).indexOf(statPick));
      function byValue(a, b) { return b.value - a.value; }
      function drawRight() {
        var view;
        if (statPick === 'highlights') {
          var chrono = rows.slice().reverse();
          view = add(el('div', 'rr-stack'), add(el('div', 'rr-grid-2'),
            RR.barlist('Points by round', 'Pts', chrono.map(function (r) { return { name: r.round.track + (r.round.races > 1 ? ' R' + (r.x.race || 1) : '') + (sel === 'all' ? ' · ' + r.season.name : ''), value: r.x.points + r.x.bonus }; })),
            RR.barlist('Cars by laps', 'Laps', cars.map(function (g) { return { name: g.key, value: agg(g).laps }; }).sort(byValue)),
            RR.barlist('Tracks by laps', 'Laps', tracks.map(function (g) { return { name: g.key, value: agg(g).laps }; }).sort(byValue)),
            RR.barlist('Classes by laps', 'Laps', classes.map(function (g) { return { name: className(g.key), value: agg(g).laps }; }).sort(byValue))),
            RR.table([{ key: 'cls', label: 'Class' }, { key: 'races', label: 'Races', num: true }, { key: 'wins', label: 'Wins', num: true },
              { key: 'podiums', label: 'Podiums', num: true }, { key: 'avg', label: 'Average finish', num: true }],
              classes.map(function (g) { var a = agg(g); return { cells: { cls: className(g.key), races: a.races, wins: a.wins, podiums: a.podiums, avg: a.avgFinish ? 'P' + p1(a.avgFinish) : '-' } }; }), 'No races yet.'));
        } else if (statPick === 'totals') {
          view = RR.totals([
            { title: 'Driving', rows: [['Time on track', p1(st.hours) + ' h'], ['Laps', RR.num(st.laps)], ['Sessions', st.races], ['Rounds attended', st.races]] },
            { title: 'Racing', rows: [['Races', st.races], ['Finished', st.finished], ['Did not finish', st.dnf], ['Wins', st.wins], ['Podiums', st.podiums],
              ['Poles', st.poles], ['Fastest laps', st.fastest], ['Laps led', RR.num(st.led)]] },
            { title: 'Consistency', rows: [['Incident points', st.incidents], ['Incidents per race', p1(st.incPerRace)], ['Clean laps', pct(st.cleanLaps)],
              ['Invalid laps', st.invalid], ['Penalties', st.penalties]] },
            { title: 'Regularity', rows: [['Rounds in a row now', st.streak], ['Rounds in a row best', st.bestStreak]] }]);
        } else {
          var groups, label;
          if (statPick === 'cars') { groups = cars; label = 'Car'; }
          else if (statPick === 'classes') { groups = classes; label = 'Class'; }
          else if (statPick === 'tracks') { groups = tracks; label = 'Track'; }
          else { groups = seasons; label = 'Season'; }
          view = RR.table([{ key: 'name', label: label }, { key: 'races', label: 'Races', num: true }, { key: 'wins', label: 'Wins', num: true },
            { key: 'podiums', label: 'Podiums', num: true }, { key: 'best', label: 'Best finish', num: true }, { key: 'lap', label: 'Best lap', num: true },
            { key: 'laps', label: 'Laps', num: true }], groups.map(function (g) {
            var a = agg(g), nm = statPick === 'classes' ? className(g.key) : (statPick === 'seasons' ? seasonById(g.key).name : g.key);
            return { cells: { name: nm, races: a.races, wins: a.wins, podiums: a.podiums, best: a.bestFinish ? RR.pos(a.bestFinish) : '-', lap: RR.lap(a.bestLap), laps: a.laps } };
          }), 'Nothing here yet.');
        }
        fill(statsRight, view);
      }
      drawRight();
      fill(RR.view('statistics'), add(el('div', 'rr-split'), add(el('div'), list), statsRight));
    }

    function drawAchievements(rows) {
      var all = achievementList(d, rows, sel), groups = [];
      all.forEach(function (a) { if (groups.indexOf(a.group) < 0) groups.push(a.group); });
      achBox.textContent = '';
      var hiddenLeft = 0, shown = 0;
      groups.forEach(function (g) {
        var show = all.filter(function (a) {
          if (a.group !== g) return false;
          var s = a.status;
          if (a.hidden && !s.earned) { hiddenLeft++; return false; }
          return achFilter === 'all' || (achFilter === 'earned' && s.earned) || (achFilter === 'progress' && s.progress) || (achFilter === 'notyet' && s.notYet);
        });
        if (!show.length) return;
        shown += show.length;
        var grid = el('div', 'rr-grid-3');
        show.forEach(function (a) { grid.appendChild(RR.card(a)); });
        achBox.appendChild(add(el('div', 'rr-stack'), RR.heading(g), grid));
      });
      if (!shown) achBox.appendChild(RR.empty('Nothing in this group.'));
      if (hiddenLeft && (achFilter === 'all' || achFilter === 'notyet')) achBox.appendChild(el('p', 'rr-body', hiddenLeft + ' hidden achievement' + (hiddenLeft > 1 ? 's' : '') + ' left'));
      fill(RR.view('achievements'), achBox);
    }

    function drawBoards() {
      var all = boardList(d, sel), each = all.filter(function (b) {
        return (boardTrack === 'all' || b.track + '|' + b.layout === boardTrack) && (boardCls === 'all' || b.cls === boardCls);
      });
      function avgOf(fn) { var l = each.filter(function (b) { return b.entries > 1; }); return l.length ? avg(l, fn) : null; }
      var beaten = avgOf(function (b) { return b.beaten; }), gapPct = avgOf(function (b) { return b.gapPct; });
      var layouts = {};
      each.forEach(function (b) { layouts[b.track + '|' + b.layout] = 1; });
      fill(boardBox, RR.statRow([
        RR.stat('Top 1 positions', each.filter(function (b) { return b.pos === 1; }).length),
        RR.stat('Top 10 positions', each.filter(function (b) { return b.pos <= 10; }).length),
        RR.stat('Boards with your time', each.length),
        RR.stat('Layouts raced', Object.keys(layouts).length),
        RR.stat('Best position', each.length ? RR.pos(Math.min.apply(null, each.map(function (b) { return b.pos; }))) : '-'),
        RR.stat('Drivers beaten', beaten === null ? '-' : pct(beaten), 'Average'),
        RR.stat('Gap to leader', gapPct === null ? '-' : gapPct.toFixed(2) + '%', 'Average')
      ], true), RR.table([
        { key: 'board', label: 'Board' }, { key: 'pos', label: 'Position', sorted: true }, { key: 'entries', label: 'Entries', num: true },
        { key: 'beaten', label: 'Drivers beaten', num: true }, { key: 'lap', label: 'Lap time', num: true }, { key: 'gap', label: 'Gap', num: true },
        { key: 'gapPct', label: 'Gap %', num: true }, { key: 'date', label: 'Date' }
      ], each.map(function (b) {
        return { cells: { board: RR.cell(b.track, b.layout + ' · ' + className(b.cls)), pos: RR.pos(b.pos), entries: b.entries,
          beaten: b.entries > 1 ? pct(b.beaten) : '-', lap: RR.lap(b.lap), gap: RR.gap(b.gap), gapPct: b.gap ? b.gapPct.toFixed(2) + '%' : '-', date: b.date } };
      }), 'No lap times in this selection.'));
      fill(RR.view('boards'), boardBox);
    }

    function drawAll() {
      var rows = profileRows(d, sel), st = profileStats(d, rows, sel);
      drawOverview(rows, st); drawHistory(rows); fill(RR.view('history'), historyBox);
      drawStatistics(rows, st); drawAchievements(rows); drawBoards();
      RR.refresh();
    }

    /* Header options. The Season dropdown follows every tab; the others belong to one tab each. */
    function seasonPicker() {
      return RR.select('Season', [['all', 'All seasons']].concat(D.seasons.map(function (s) { return [s.id, seasonLabel(s)]; })),
        function (v) { sel = v; drawAll(); }, sel);
    }
    var seasonBox = RR.headTool(seasonPicker());
    /* A button inside the page that jumps to one season: the Season dropdown is drawn again so it shows the same season. */
    function goToSeason(id) {
      sel = id;
      var fresh = seasonPicker();
      if (seasonBox.parentNode) seasonBox.parentNode.replaceChild(fresh, seasonBox);
      seasonBox = fresh;
      drawAll();
    }
    RR.headTool(RR.segment([['all', 'All']].concat(careerClasses.map(function (c) { return [c.id, c.name]; })),
      function (v) { clsFilter = v; drawHistory(profileRows(d, sel)); }), 'history');
    RR.headTool(RR.segment([['all', 'All'], ['earned', 'Earned'], ['progress', 'In progress'], ['notyet', 'Not yet']],
      function (v) { achFilter = v; drawAchievements(profileRows(d, sel)); }), 'achievements');
    var trackOptions = [['all', 'All tracks']], seen = {};
    boardList(d, 'all').forEach(function (b) { var k = b.track + '|' + b.layout; if (!seen[k]) { seen[k] = 1; trackOptions.push([k, b.track + ' · ' + b.layout]); } });
    RR.headTool(RR.select('Track', trackOptions, function (v) { boardTrack = v; drawBoards(); }, boardTrack), 'boards');
    RR.headTool(RR.select('Class', [['all', 'All classes']].concat(careerClasses.map(function (c) { return [c.id, c.name]; })),
      function (v) { boardCls = v; drawBoards(); }, boardCls), 'boards');
    drawAll();
  };

  var run = PAGES[document.body.getAttribute('data-rr-page')];
  if (run) {
    run(); RR.refresh();
  }
})();
