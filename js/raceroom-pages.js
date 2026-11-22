/* Race Club RaceRoom site: what each page shows.
   Every page is built ONLY from the shared builders in raceroom-shell.js (RR.*).
   <body data-rr-page="..."> picks which function below runs. */
(function () {
  'use strict';
  var RR = window.RR, D = window.RR_DATA;
  var el = RR.el, add = RR.add;

  function byId(list, id) { return list.filter(function (x) { return x.id === id; })[0]; }
  function driver(id) { return byId(D.drivers, id); }
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

  /* All posts, newest first. Dates are DD.MM.YYYY. */
  function newestFirst() {
    function stamp(n) { var p = n.date.split('.'); return p[2] + p[1] + p[0]; }
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
          href: 'story.html?id=' + encodeURIComponent(n.id)
        }));
      });
      main.appendChild(add(el('div', 'rr-news'), grid,
        RR.pager(pages, p, function (n) { location.hash = n === 1 ? '' : 'page-' + n; })));
      RR.scrollTop();
    }
    window.addEventListener('hashchange', draw);
    if (portraitQuery.addEventListener) portraitQuery.addEventListener('change', draw);
    draw();
  };

  /* ---------------- ONE POST (story.html) ---------------- */
  PAGES.story = function () {
    var main = document.querySelector('main');
    var posts = newestFirst(), at = -1;
    posts.forEach(function (n, i) { if (n.id === RR.param('id')) at = i; });
    if (at < 0) { main.appendChild(RR.empty('This post could not be found.')); return; }
    var n = posts[at];
    RR.setTitle(n.title);
    var art = el('article', 'rr-article');
    art.appendChild(add(el('div', 'rr-article-meta'), el('span', 'rr-label rr-red', n.eyebrow), el('span', 'rr-label', n.date)));
    n.body.forEach(function (p) { art.appendChild(el('p', '', p)); });
    main.appendChild(art);
    /* Flip from story to story: the left link goes to the newer story, the right link to the older one. */
    function storyLink(m, label) { return m && { label: label, href: 'story.html?id=' + encodeURIComponent(m.id) }; }
    RR.setSteps(storyLink(posts[at - 1], 'Newer story'), storyLink(posts[at + 1], 'Older story'));
  };

  /* ---- Season helpers: every Leaderboards and profile page reads the league through these ---- */
  function seasonById(id) { return byId(D.seasons, id) || D.seasons[0]; }
  function roundOf(season, n) { return season.rounds.filter(function (r) { return r.n === n; })[0]; }
  function doneRounds(season) { return season.rounds.filter(function (r) { return r.done; }); }
  function classesIn(season) { return D.classes.filter(function (c) { return season.results.some(function (r) { return r.cls === c.id; }); }); }
  function seasonLabel(s) { return s.name + (s.status === 'Active' ? ' (current)' : ''); }
  function resultOf(season, n, driverId) {
    return season.results.filter(function (x) { return x.round === n && x.driver === driverId; })[0];
  }
  /* Standings rows for one season and class, best first. t.per is points per round, t.drop the dropped rounds, t.total the total. */
  function seasonRows(season, cls) {
    return D.drivers.filter(function (d) { return (cls === 'all' || d.cls === cls) && season.totals[d.id]; })
      .map(function (d) { return { d: d, t: season.totals[d.id] }; })
      .sort(function (a, b) { return b.t.total - a.t.total || a.d.name.localeCompare(b.d.name); });
  }
  /* A points number with its bonus as a small raised number. Dropped rounds are struck through. */
  function pointsNode(x, dropped) {
    if (!x) return '-';
    var span = el('span', dropped ? 'rr-drop' : '', x.points);
    if (x.bonus) span.appendChild(el('span', 'rr-bonus', '+' + x.bonus));
    return span;
  }
  function resultCell(x) {
    return RR.cell(x.status === 'Finished' ? RR.pos(x.pos) : x.status, 'of ' + x.of);
  }
  /* Places gained (green +n) or lost (red -n) from the start to the finish. A driver who did not finish shows a dash. */
  function diffPos(x) {
    if (x.status !== 'Finished' || !x.start) return '-';
    var n = x.start - x.pos;
    if (!n) return '0';
    return el('span', n > 0 ? 'rr-delta-up' : 'rr-delta-down', (n > 0 ? '+' : '-') + Math.abs(n));
  }
  function penaltyText(x) { return x.penalty ? '+' + x.penalty + 's' : '-'; }
  /* Protests filed for one round of one season (newest first as stored). */
  function protestsFor(season, n) { return (D.protests || []).filter(function (p) { return p.season === season.id && p.round === n; }); }
  /* The rulings table for a round: who, against whom, the lap, why, the ruling and the penalty. null when nobody protested. */
  function protestTable(season, n) {
    var list = protestsFor(season, n);
    if (!list.length) return null;
    return RR.table([
      { key: 'by', label: 'Filed by' }, { key: 'against', label: 'Against' }, { key: 'lap', label: 'Lap', num: true },
      { key: 'reason', label: 'Reason' }, { key: 'ruling', label: 'Ruling' }, { key: 'pen', label: 'Penalty' }
    ], list.map(function (p) {
      var by = driver(p.by), against = driver(p.against);
      return { cells: { by: RR.cell(RR.nameWithFlag(by.name, by.country), p.self ? 'Self report' : ''), against: RR.nameWithFlag(against.name, against.country),
        lap: p.lap, reason: p.reason, ruling: p.ruling === 'Pending' ? RR.tag('Pending', true) : RR.tag(p.ruling, p.ruling === 'Dismissed'), pen: p.penalty || '-' } };
    }), 'No protests.');
  }
  /* Mark the row of a sidebar list that matches `index` as the chosen one (the list starts with its first row chosen). */
  function pressRow(list, index) {
    Array.prototype.forEach.call(list.children, function (b, i) { b.setAttribute('aria-pressed', i === index ? 'true' : 'false'); });
  }

  /* ---------------- LEADERBOARDS (leaderboards.html): everything follows the Season and Class dropdowns ---------------- */
  PAGES.leaderboards = function () {
    var season = D.seasons[0], cls = 'all', pickedRound = null, pickedTrack = null, onlyUpcoming = false;
    var classBox = el('div');

    function drawStandings() {
      var rows = seasonRows(season, cls), done = doneRounds(season), lead = rows[0], second = rows[1];
      var finished = season.status === 'Finished';
      var cols = [{ key: 'pos', label: 'Pos' }, { key: 'driver', label: 'Driver' }];
      season.rounds.forEach(function (r) { cols.push({ key: 'r' + r.n, label: 'R' + r.n, num: true }); });
      cols.push({ key: 'wins', label: 'Wins', num: true }, { key: 'total', label: 'Total', num: true, sorted: true });
      fill(RR.view('standings'), add(el('div', 'rr-stack'),
        RR.strip(rows.slice(0, 7).map(function (r) {
          return { title: r.d.name, country: r.d.country, livery: r.d.banner, sub: r.d.team + ' · ' + className(r.d.cls), value: r.t.total, valueLabel: 'pts', href: profileLink(r.d) };
        })),
        RR.statRow([
          RR.stat('Rounds run', done.length + ' / ' + season.rounds.length, season.name),
          RR.stat('Drivers', rows.length, cls === 'all' ? 'All classes' : className(cls)),
          cls === 'all' && classesIn(season).length > 1 ? RR.stat(finished ? 'Champions' : 'Leaders', 'One per class', 'Choose a class') : RR.stat(finished ? 'Champion' : 'Leader', lead ? lead.d.name : '-', lead ? lead.d.team : ''),
          cls === 'all' && classesIn(season).length > 1 ? RR.stat('Lead', '-', 'Choose a class') : RR.stat('Lead', lead && second ? '+' + (lead.t.total - second.t.total) : '-', 'Points over second place')
        ]),
        RR.table(cols, rows.map(function (r, i) {
          var cells = { pos: RR.pos(i + 1), driver: RR.cell(RR.nameWithFlag(r.d.name, r.d.country), r.d.team),
            wins: season.results.filter(function (x) { return x.driver === r.d.id && x.pos === 1 && x.status === 'Finished'; }).length,
            total: r.t.total };
          season.rounds.forEach(function (rd, k) { cells['r' + rd.n] = rd.done ? pointsNode(resultOf(season, rd.n, r.d.id), r.t.drop.indexOf(k) >= 0) : '-'; });
          return { href: profileLink(r.d), linkCol: 1, cells: cells };
        }), 'No drivers in this class yet.'),
        season.dropWeeks ? RR.empty('The ' + season.dropWeeks + ' lowest round' + (season.dropWeeks > 1 ? 's are' : ' is') + ' struck through and not counted. A small red number is a bonus point.') : null
      ));
    }

    function drawResults() {
      var done = doneRounds(season);
      if (!done.length) { fill(RR.view('results'), RR.empty('No races have been run yet.')); return; }
      if (!pickedRound || !roundOf(season, pickedRound) || !roundOf(season, pickedRound).done) pickedRound = done[done.length - 1].n;
      var items = done.map(function (r) { return [r.n, 'Round ' + r.n, r.date]; }).reverse();
      var list = RR.sidelist(items, function (n) { pickedRound = n; drawTable(); });
      pressRow(list, items.map(function (i) { return i[0]; }).indexOf(pickedRound));
      var right = el('div', 'rr-stack');
      function drawTable() {
        var r = roundOf(season, pickedRound);
        var rows = season.results.filter(function (x) { return x.round === pickedRound && (cls === 'all' || x.cls === cls); })
          .sort(function (a, b) { return a.cls.localeCompare(b.cls) || a.pos - b.pos; });
        var final = r.status === 'Final';
        fill(right, RR.heading(r.track + ' · ' + r.layout),
          add(el('div', 'rr-form-row'), RR.tag(final ? 'Final' : 'Provisional', !final),
            RR.label(final ? 'Protest window closed' : 'Protests close ' + r.protestCloses)),
          RR.table([
            { key: 'pos', label: 'Result', sorted: true }, { key: 'driver', label: 'Driver' }, { key: 'cls', label: 'Class' },
            { key: 'best', label: 'Best lap', num: true }, { key: 'gap', label: 'Gap', num: true }, { key: 'diff', label: 'Diff pos', num: true },
            { key: 'inc', label: 'Inc', num: true }, { key: 'pen', label: 'Pen', num: true }, { key: 'pts', label: 'Points', num: true }
          ], rows.map(function (x) {
            var d = driver(x.driver);
            return { href: profileLink(d), linkCol: 1, cells: {
              pos: resultCell(x), driver: RR.cell(RR.nameWithFlag(d.name, d.country), d.team), cls: className(x.cls),
              best: RR.lap(x.best), gap: RR.gap(x.gap), diff: diffPos(x), inc: x.incidents, pen: penaltyText(x), pts: pointsNode(x)
            } };
          }), 'No results for this class.'),
          protestTable(season, pickedRound) ? RR.heading('Protests') : null, protestTable(season, pickedRound));
      }
      drawTable();
      fill(RR.view('results'), add(el('div', 'rr-split'), add(el('div'), list), right));
    }

    function drawLapTimes() {
      var done = doneRounds(season);
      if (!done.length) { fill(RR.view('laptimes'), RR.empty('No lap times have been set yet.')); return; }
      if (!pickedTrack || !roundOf(season, pickedTrack) || !roundOf(season, pickedTrack).done) pickedTrack = done[0].n;
      var items = done.map(function (r) { return [r.n, r.track]; });
      var list = RR.sidelist(items, function (n) { pickedTrack = n; drawTable(); });
      pressRow(list, items.map(function (i) { return i[0]; }).indexOf(pickedTrack));
      var right = el('div', 'rr-stack');
      /* Season tiles: fastest lap, the driver with the most fastest laps, and who closed the gap the most from the first race to the latest. */
      var all = season.results.filter(function (x) { return cls === 'all' || x.cls === cls; });
      var quick = all.slice().sort(function (a, b) { return a.best - b.best; })[0];
      var counts = {};
      all.forEach(function (x) { if (x.fastest) counts[x.driver] = (counts[x.driver] || 0) + 1; });
      var topId = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; })[0];
      var improved = null;
      if (done.length > 1) {
        D.drivers.forEach(function (d) {
          var a = all.filter(function (x) { return x.driver === d.id && x.round === done[0].n; })[0];
          var b = all.filter(function (x) { return x.driver === d.id && x.round === done[done.length - 1].n; })[0];
          if (a && b && (!improved || a.gapPct - b.gapPct > improved.by)) improved = { d: d, by: a.gapPct - b.gapPct };
        });
      }
      function drawTable() {
        var r = roundOf(season, pickedTrack);
        var rows = season.results.filter(function (x) { return x.round === pickedTrack && (cls === 'all' || x.cls === cls); })
          .filter(function (x) { return x.avg; }).sort(function (a, b) { return a.avg - b.avg; });
        var fastest = rows.length ? rows[0].avg : 0;
        fill(right, RR.heading(r.track + ' · ' + r.layout), RR.table([
          { key: 'pos', label: 'Pos' }, { key: 'driver', label: 'Driver' }, { key: 'time', label: 'Race time', num: true },
          { key: 'lap', label: 'Avg lap time', num: true, sorted: true },
          { key: 'delta', label: 'Delta leader', num: true }, { key: 'car', label: 'Car / Class' }
        ], rows.map(function (x, i) {
          var d = driver(x.driver);
          return { href: profileLink(d), linkCol: 1, cells: {
            pos: i + 1, driver: RR.cell(RR.nameWithFlag(d.name, d.country), d.team), time: RR.raceTime(x.time), lap: RR.lap(x.avg), delta: RR.gap(x.avg - fastest),
            car: RR.cell(x.car, className(x.cls))
          } };
        }), 'No lap times for this class.'));
      }
      drawTable();
      fill(RR.view('laptimes'), add(el('div', 'rr-stack'),
        RR.statRow([
          RR.stat('Fastest lap', quick ? RR.lap(quick.best) : '-', quick ? roundOf(season, quick.round).track : ''),
          RR.stat('Fastest driver', topId ? driver(topId).name : '-', topId ? counts[topId] + ' fastest laps' : ''),
          RR.stat('Most improved', improved ? improved.d.name : '-', improved ? improved.by.toFixed(2) + '% closer to the fastest' : 'Needs two races')
        ]),
        add(el('div', 'rr-split'), add(el('div'), list), right)));
    }

    /* Start time of a round in the visitor's own time zone (the browser's), as { date: 'DD.MM.YYYY', time: '20:00', zone: 'EST' }. */
    function localStart(r) {
      if (!r.start) return null;
      var d = new Date(r.start);
      if (isNaN(d.getTime())) return null;
      var p = {};
      new Intl.DateTimeFormat('en-GB', { hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
        timeZoneName: 'short' }).formatToParts(d).forEach(function (x) { p[x.type] = x.value; });
      return { date: p.day + '.' + p.month + '.' + p.year, time: p.hour + ':' + p.minute, zone: p.timeZoneName };
    }
    function drawSchedule() {
      fill(RR.view('schedule'), RR.table([
        { key: 'n', label: 'Round' }, { key: 'track', label: 'Track' }, { key: 'date', label: 'Date', sorted: true },
        { key: 'time', label: 'Time' }, { key: 'status', label: 'Status' }
      ], season.rounds.filter(function (r) { return !onlyUpcoming || !r.done; }).map(function (r) {
        var at = localStart(r);
        return { cells: { n: 'Round ' + r.n, track: RR.cell(r.track, r.layout), date: at ? at.date : r.date,
          time: at ? RR.cell(at.time, at.zone) : '-',
          status: r.done ? RR.tag('Finished') : RR.tag('Upcoming', true) } };
      }), onlyUpcoming ? 'No upcoming rounds.' : 'The schedule has not been posted yet.'));
    }

    function drawAll() { drawStandings(); drawResults(); drawLapTimes(); drawSchedule(); RR.refresh(); }
    /* The Class dropdown only lists classes that raced in the chosen season. */
    function drawClassSelect() {
      var here = classesIn(season);
      if (cls !== 'all' && !here.some(function (c) { return c.id === cls; })) cls = 'all';
      fill(classBox, RR.select('Class', [['all', 'All classes']].concat(here.map(function (c) { return [c.id, c.name]; })),
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
        var r = roundOf(season, pickedRound), open = r.status === 'Provisional', rulings = protestTable(season, r.n);
        fill(right, message, RR.heading(r.track + ' · ' + r.layout),
          add(el('div', 'rr-form-row'), RR.tag(open ? 'Protests open' : 'Protests closed', !open),
            RR.label(open ? 'Protests close ' + r.protestCloses : 'The 12 hour protest window is over')),
          open ? protestForm(r) : null,
          RR.heading('Protests and rulings'),
          rulings || RR.empty(open ? 'No protests have been filed for this race yet.' : 'No protests were filed for this race.'));
      }
      drawRound();
      fill(holder, add(el('div', 'rr-split'), add(el('div'), list), right));
    }

    /* The form. Nothing is saved yet: submitting adds the protest to this page as Pending so the layout can be seen. */
    function protestForm(r) {
      var field = D.drivers.filter(function (d) { return season.results.some(function (x) { return x.round === r.n && x.driver === d.id; }); })
        .sort(function (a, b) { return a.name.localeCompare(b.name); });
      var laps = Math.max.apply(null, season.results.filter(function (x) { return x.round === r.n; }).map(function (x) { return x.laps; }));
      var f = { me: '', other: '', self: false, reason: '', lap: '', note: '', password: '' };
      var box = el('div', 'rr-panel rr-stack');
      var submit = RR.button('Submit protest', null, false), warn = el('div');
      var otherBox = el('div'), submitWrap = el('div', 'rr-form-row');

      function drivers(exclude) {
        return [['', 'Choose a driver']].concat(field.filter(function (d) { return d.id !== exclude; }).map(function (d) { return [d.id, d.name]; }));
      }
      function missing() {
        var m = [];
        if (!f.me) m.push('who you are');
        if (!f.other) m.push(f.self ? 'the driver you collided with' : 'the driver you are reporting');
        if (!f.reason) m.push('a reason');
        if (!f.lap) m.push('the lap');
        if (!f.password) m.push('the race password');
        if (!f.note.trim()) m.push('what happened');
        return m;
      }
      function refresh() {
        var m = missing();
        mark();
      }
      /* After a click on Submit with something missing, each missing box gets a red border until it is filled. */
      var flagged = false, meSelect, reasonSelect, lapSelect, passwordBox, narrative;
      function mark() {
        function set(box, bad) { if (!box) return; if (flagged && bad) box.setAttribute('aria-invalid', 'true'); else box.removeAttribute('aria-invalid'); }
        set(meSelect, !f.me); set(otherBox.firstChild, !f.other); set(reasonSelect, !f.reason); set(lapSelect, !f.lap); set(passwordBox, !f.password); set(narrative, !f.note.trim());
      }
      function drawOther() {
        fill(otherBox, RR.select(f.self ? 'Driver you collided with' : 'Driver you are reporting', drivers(f.me), function (v) { f.other = v; refresh(); }, f.other));
        mark();
      }

      meSelect = RR.select('Who are you', drivers(''), function (v) {
        f.me = v;
        if (f.other === v) f.other = '';
        drawOther(); refresh();
      }, f.me);
      var selfBox = RR.checkbox('Self report', function (on) { f.self = on; drawOther(); refresh(); }, false);
      reasonSelect = RR.select('Reason', [['', 'Choose a reason']].concat(D.protestReasons.map(function (x) { return [x, x]; })), function (v) { f.reason = v; refresh(); }, f.reason);
      var lapOptions = [['', 'Choose a lap']];
      for (var i = 1; i <= laps; i++) lapOptions.push([String(i), 'Lap ' + i]);
      lapSelect = RR.select('Lap', lapOptions, function (v) { f.lap = v; refresh(); }, f.lap);
      passwordBox = RR.input({ label: 'Round ' + r.n + ' password', type: 'password', onChange: function (v) { f.password = v; refresh(); } });
      narrative = RR.textarea({ label: 'What happened?', value: '', onChange: function (v) { f.note = v; refresh(); } });

      RR.arm(submit, '', 'Confirm protest', function () {
        /* SAMPLE check. The real one is done by the service, so the password is never in the page. */
        if (f.password !== D.sampleRacePassword) { fill(warn, RR.notice('That is not the race password. Only league members have it.', 'warn')); return; }
        fill(warn);
        D.protests.push({ season: season.id, round: r.n, by: f.me, against: f.other, self: f.self, lap: Number(f.lap), reason: f.reason, narrative: f.note.trim(), ruling: 'Pending', penalty: '' });
        message = RR.notice('Your protest was submitted. The stewards will rule on it after the 12 hour window closes.', 'ok');
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
        RR.row(meSelect, selfBox),
        otherBox,
        RR.row(reasonSelect, lapSelect),
        narrative,
        RR.row(passwordBox),
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
    var holder = el('div');
    document.querySelector('main').appendChild(holder);
    function draw(cls) {
      var rows = D.drivers.filter(function (d) { return cls === 'all' || d.cls === cls; })
        .sort(function (a, b) { return a.name.localeCompare(b.name); });
      fill(holder, RR.table([
        { key: 'driver', label: 'Driver', sorted: true }, { key: 'country', label: 'Country' },
        { key: 'car', label: 'Favorite car/class' }, { key: 'races', label: 'Races', num: true }, { key: 'wins', label: 'Wins', num: true },
        { key: 'podiums', label: 'Podiums', num: true }, { key: 'points', label: 'Points', num: true }
      ], rows.map(function (d) {
        return { href: profileLink(d), cells: { driver: RR.cell(RR.nameWithFlag(d.name, d.country), d.team), country: d.country,
          car: RR.cell(d.car, className(d.cls)), races: d.races, wins: d.wins, podiums: d.podiums, points: d.points } };
      }), 'No drivers yet.'));
    }
    RR.headTool(RR.select('Class', [['all', 'All classes']].concat(D.classes.map(function (c) { return [c.id, c.name]; })), draw));
    draw('all');
  };

  /* ---------------- ONE DRIVER (driver.html?driver=...): career pages, filtered by the Season dropdown ---------------- */
  var INCIDENT_LIMIT = 30;   /* the server's default incident point limit; used for the Clean racing axis */

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
    st.cleanLaps = st.laps ? Math.max(0, 100 - st.invalid / st.laps * 100) : 0;
    /* The four radar axes, each 0 to 100, all from league data:
       Results = average share of the field beaten. Finishing = share of races finished.
       Clean racing = 100 minus incident points per race as a share of the server limit.
       Pace = 100 minus 20 for every 1% the best lap was off the class fastest. */
    st.radar = [
      { label: 'Results', value: avg(rows, function (r) { return r.x.of > 1 ? (r.x.of - r.x.pos) / (r.x.of - 1) * 100 : 100; }) },
      { label: 'Finishing', value: st.races ? st.finished / st.races * 100 : 0 },
      { label: 'Clean racing', value: st.races ? Math.max(0, 100 - st.incPerRace / INCIDENT_LIMIT * 100) : 0 },
      { label: 'Pace', value: st.races ? Math.max(0, 100 - avg(rows, function (r) { return r.x.gapPct; }) * 20) : 0 }
    ];
    var cars = grouped(rows, function (r) { return r.x.car; }).sort(function (a, b) { return b.rows.length - a.rows.length; });
    st.favouriteCar = cars[0] ? { name: cars[0].key, share: Math.round(cars[0].rows.length / st.races * 100) } : null;
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
      return s.status === 'Finished' && seasonRows(s, d.cls).map(function (r) { return r.d.id; }).indexOf(d.id) < 3;
    }));
    seasonAch('Perfect attendance', 'Race in every round of two seasons.', 2, mine.filter(attendedAll), true);
    seasonAch('Champion', 'Win a season championship.', 1, mine.filter(function (s) { return s.champion === d.id; }), true);
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
    RR.setTitle(d.name);
    (function () { var f = RR.flag(d.country), h = document.querySelector('.rr-page-title'); if (f && h) { h.classList.add('rr-name'); h.insertBefore(f, h.firstChild); f.style.width = '30px'; f.style.height = '21px'; } })();
    var sel = 'all', clsFilter = 'all', achFilter = 'all', statPick = 'highlights', boardTrack = 'all', boardCls = 'all';
    var careerClasses = D.classes.filter(function (c) { return profileRows(d, 'all').some(function (r) { return r.x.cls === c.id; }); });
    var historyBox = el('div'), achBox = el('div', 'rr-stack'), statsRight = el('div', 'rr-stack'), boardBox = el('div', 'rr-stack');
    function pct(n) { return Math.round(n) + '%'; }
    function p1(n) { return n.toFixed(1); }

    function drawOverview(rows, st) {
      var season = sel === 'all' ? D.season : seasonById(sel);
      var table = seasonRows(season, d.cls), place = table.map(function (r) { return r.d.id; }).indexOf(d.id) + 1;
      var lead = table[0], mineRow = table[place - 1], last = rows[0];
      var best = rows.filter(function (r) { return r.x.status === 'Finished'; }).sort(function (a, b) { return a.x.pos - b.x.pos; })[0];
      var card = add(el('div', 'rr-panel rr-stack'), RR.label('Driver'),
        add(el('div', 'rr-kv-list'), RR.kv('Country', d.country), RR.kv('Team', d.team), RR.kv('Class', className(d.cls))),
        add(el('div', 'rr-kv-list'), RR.kv('Races', st.races), RR.kv('Wins', st.wins), RR.kv('Podiums', st.podiums),
          RR.kv('Hours on track', p1(st.hours)), RR.kv('Points', RR.num(st.points))));
      var fav = st.favouriteCar;
      var hero = RR.photo(add(el('div', 'rr-hero'), RR.label('Favourite car'), el('h2', 'rr-hero-title', fav ? fav.name : '-'),
        el('div', 'rr-label rr-red', className(d.cls)), el('div', 'rr-note', fav ? fav.share + '% of races' : 'No races yet')), d.livery, 'full');
      var standing = add(el('div', 'rr-panel rr-stack'), RR.label('Season standing'),
        add(el('div', 'rr-kv-list'), RR.kv('Season', season.name), RR.kv('Class', className(d.cls)), RR.kv('Position', place ? RR.pos(place) + ' of ' + table.length : '-')),
        add(el('div', 'rr-kv-list'), RR.kv('Points', mineRow ? mineRow.t.total : '-'),
          RR.kv('Gap to leader', mineRow && lead && place > 1 ? String(mineRow.t.total - lead.t.total) : '-'),
          RR.kv('Rounds', doneRounds(season).length + ' / ' + season.rounds.length)));
      var next = achievementList(d, rows, sel).filter(function (a) { return a.status.progress && !a.hidden; })
        .sort(function (a, b) { return b.status.progress[0] / b.status.progress[1] - a.status.progress[0] / a.status.progress[1]; }).slice(0, 3);
      var nextGrid = el('div', 'rr-grid-3');
      next.forEach(function (a) { nextGrid.appendChild(RR.card(a)); });
      fill(RR.view('overview'), add(el('div', 'rr-stack rr-stack-tight'),
        d.banner ? RR.banner({ eyebrow: className(d.cls), title: d.name, country: d.country, sub: d.team + ' · ' + d.car, livery: d.banner }) : null,
        add(el('div', 'rr-grid-2'), card, hero),
        add(el('div', 'rr-grid-2'), RR.radar(st.radar), standing),
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
        return { cells: { pos: resultCell(r.x), track: RR.cell(r.round.track, r.round.layout + ' · ' + r.x.car), cls: className(r.x.cls),
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
            RR.barlist('Points by round', 'Pts', chrono.map(function (r) { return { name: r.round.track + (sel === 'all' ? ' · S' + r.season.id.slice(1) : ''), value: r.x.points + r.x.bonus }; })),
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
    RR.headTool(RR.select('Season', [['all', 'All seasons']].concat(D.seasons.map(function (s) { return [s.id, seasonLabel(s)]; })),
      function (v) { sel = v; drawAll(); }, sel));
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

  /* SAMPLE ONLY: asks RaceRoom's user-info page for each sample driver's banner (and avatar) so the pages can be seen with real pictures.
     The real site gets these from the Sheet (the service saves them). If the browser is not allowed to read RaceRoom's page, or the
     driver has no banner (null), nothing is shown and the page still draws normally. Waits at most 3 seconds. */
  function loadSamplePictures() {
    function clean(v) { v = String(v || ''); if (v.indexOf('//') === 0) v = 'https:' + v; return /^https:\/\/[^\s"'<>]+$/.test(v) ? v : ''; }
    var jobs = D.drivers.filter(function (d) { return d.userId !== undefined; }).map(function (d) {
      return fetch('https://game.raceroom.com/utils/user-info/' + d.userId)
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (info) { if (info) { d.banner = clean(info.banner); d.avatar = clean(info.avatar); } })
        .catch(function () {});
    });
    return Promise.race([Promise.all(jobs), new Promise(function (done) { setTimeout(done, 3000); })]);
  }

  var run = PAGES[document.body.getAttribute('data-rr-page')];
  if (run) {
    if (D.sample && window.fetch && /^(leaderboards|profile)$/.test(document.body.getAttribute('data-rr-page'))) {
      loadSamplePictures().then(function () { run(); RR.refresh(); });
    } else { run(); RR.refresh(); }
  }
})();
