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
      main.scrollTop = 0;
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
  };

  /* ---------------- LEADERBOARDS (leaderboards.html) ---------------- */
  PAGES.leaderboards = function () {
    var cls = 'all', pickedRound = null, pickedTrack = null, onlyUpcoming = false;
    var done = D.rounds.filter(function (r) { return r.done; });

    function drawStandings() {
      var rows = standings(cls), lead = rows[0], second = rows[1];
      fill(RR.view('standings'), add(el('div', 'rr-stack'),
        RR.statRow([
          RR.stat('Rounds run', done.length + ' / ' + D.rounds.length, D.season.name),
          RR.stat('Drivers', rows.length, cls === 'all' ? 'All classes' : className(cls)),
          RR.stat('Leader', lead ? lead.name : '-', lead ? lead.team : ''),
          RR.stat('Lead', lead && second ? '+' + (lead.points - second.points) : '-', 'Points over second place')
        ]),
        RR.table([
          { key: 'pos', label: 'Pos' }, { key: 'driver', label: 'Driver' }, { key: 'cls', label: 'Class' },
          { key: 'car', label: 'Car' }, { key: 'races', label: 'Races', num: true }, { key: 'wins', label: 'Wins', num: true },
          { key: 'podiums', label: 'Podiums', num: true }, { key: 'points', label: 'Points', num: true, sorted: true },
          { key: 'gap', label: 'Gap', num: true }
        ], rows.map(function (d, i) {
          return { href: profileLink(d), linkCol: 1, cells: {
            pos: RR.pos(i + 1), driver: RR.cell(d.name, d.team), cls: className(d.cls), car: d.car,
            races: d.races, wins: d.wins, podiums: d.podiums, points: d.points,
            gap: i ? String(d.points - lead.points) : '-'
          } };
        }), 'No drivers in this class yet.')
      ));
    }

    function drawResults() {
      if (!done.length) { fill(RR.view('results'), RR.empty('No races have been run yet.')); return; }
      if (!pickedRound) pickedRound = done[done.length - 1].n;
      var list = RR.sidelist(done.map(function (r) { return [r.n, 'Round ' + r.n, r.date]; }).reverse(),
        function (n) { pickedRound = n; drawTable(); });
      var side = add(el('div'), list), right = el('div', 'rr-stack');
      function drawTable() {
        var r = round(pickedRound);
        var rows = D.results.filter(function (x) { return x.round === pickedRound && (cls === 'all' || x.cls === cls); })
          .sort(function (a, b) { return a.cls.localeCompare(b.cls) || a.pos - b.pos; });
        fill(right, RR.heading(r.track + ' · ' + r.layout), RR.table([
          { key: 'pos', label: 'Result', sorted: true }, { key: 'driver', label: 'Driver' }, { key: 'cls', label: 'Class' },
          { key: 'best', label: 'Best lap', num: true }, { key: 'gap', label: 'Gap', num: true },
          { key: 'inc', label: 'Incidents', num: true }, { key: 'pts', label: 'Points', num: true }
        ], rows.map(function (x) {
          var d = driver(x.driver);
          return { href: profileLink(d), linkCol: 1, cells: {
            pos: RR.cell(RR.pos(x.pos), 'of ' + x.of), driver: RR.cell(d.name, d.team), cls: className(x.cls),
            best: RR.lap(x.best), gap: RR.gap(x.gap), inc: x.incidents, pts: x.points
          } };
        }), 'No results for this class.'));
      }
      drawTable();
      fill(RR.view('results'), add(el('div', 'rr-split'), side, right));
    }

    function drawLapTimes() {
      if (!done.length) { fill(RR.view('laptimes'), RR.empty('No lap times have been set yet.')); return; }
      if (!pickedTrack) pickedTrack = done[0].n;
      var list = RR.sidelist(done.map(function (r) { return [r.n, r.track]; }), function (n) { pickedTrack = n; drawTable(); });
      var side = add(el('div'), list), right = el('div', 'rr-stack');
      function drawTable() {
        var r = round(pickedTrack);
        var rows = D.results.filter(function (x) { return x.round === pickedTrack && (cls === 'all' || x.cls === cls); })
          .sort(function (a, b) { return a.best - b.best; });
        var fastest = rows.length ? rows[0].best : 0;
        fill(right, RR.heading(r.track + ' · ' + r.layout), RR.table([
          { key: 'pos', label: 'Pos' }, { key: 'driver', label: 'Driver' }, { key: 'lap', label: 'Lap time', num: true, sorted: true },
          { key: 'delta', label: 'Delta leader', num: true }, { key: 'car', label: 'Car / Class' }, { key: 'date', label: 'Date' }
        ], rows.map(function (x, i) {
          var d = driver(x.driver);
          return { href: profileLink(d), linkCol: 1, cells: {
            pos: i + 1, driver: RR.cell(d.name, d.team), lap: RR.lap(x.best), delta: RR.gap(x.best - fastest),
            car: RR.cell(d.car, className(d.cls)), date: r.date
          } };
        }), 'No lap times for this class.'));
      }
      drawTable();
      fill(RR.view('laptimes'), add(el('div', 'rr-split'), side, right));
    }

    function drawSchedule() {
      fill(RR.view('schedule'), RR.table([
        { key: 'n', label: 'Round' }, { key: 'track', label: 'Track' }, { key: 'date', label: 'Date', sorted: true }, { key: 'status', label: 'Status' }
      ], D.rounds.filter(function (r) { return !onlyUpcoming || !r.done; }).map(function (r) {
        return { cells: { n: 'Round ' + r.n, track: RR.cell(r.track, r.layout), date: r.date,
          status: r.done ? RR.tag('Finished') : RR.tag('Upcoming', true) } };
      }), onlyUpcoming ? 'No upcoming rounds.' : 'The schedule has not been posted yet.'));
    }

    function drawAll() { drawStandings(); drawResults(); drawLapTimes(); drawSchedule(); RR.refresh(); }

    RR.headTool(RR.select('Season', [[D.season.id, D.season.name]], function () {}));
    RR.headTool(RR.select('Class', [['all', 'All classes']].concat(D.classes.map(function (c) { return [c.id, c.name]; })),
      function (v) { cls = v; drawAll(); }));
    RR.headTool(RR.checkbox('Only upcoming', function (on) { onlyUpcoming = on; drawSchedule(); }), 'schedule');
    drawAll();
  };

  /* ---------------- PROFILES LIST (drivers.html) ---------------- */
  PAGES.profiles = function () {
    var holder = el('div');
    document.querySelector('main').appendChild(holder);
    function draw(cls) {
      var rows = D.drivers.filter(function (d) { return cls === 'all' || d.cls === cls; })
        .sort(function (a, b) { return a.name.localeCompare(b.name); });
      fill(holder, RR.table([
        { key: 'driver', label: 'Driver', sorted: true }, { key: 'country', label: 'Country' }, { key: 'cls', label: 'Class' },
        { key: 'car', label: 'Car' }, { key: 'races', label: 'Races', num: true }, { key: 'wins', label: 'Wins', num: true },
        { key: 'podiums', label: 'Podiums', num: true }, { key: 'points', label: 'Points', num: true }
      ], rows.map(function (d) {
        return { href: profileLink(d), cells: { driver: RR.cell(d.name, d.team), country: d.country, cls: className(d.cls),
          car: d.car, races: d.races, wins: d.wins, podiums: d.podiums, points: d.points } };
      }), 'No drivers yet.'));
    }
    RR.headTool(RR.select('Class', [['all', 'All classes']].concat(D.classes.map(function (c) { return [c.id, c.name]; })), draw));
    draw('all');
  };

  /* ---------------- ONE DRIVER (driver.html?driver=...) ---------------- */
  PAGES.profile = function () {
    var d = driver(RR.param('driver'));
    if (!d) {
      Array.prototype.forEach.call(document.querySelectorAll('[data-rr-view]'), function (v) {
        fill(v, RR.empty('This driver could not be found.'));
      });
      return;
    }
    RR.setTitle(d.name);
    var mine = D.results.filter(function (r) { return r.driver === d.id; }).sort(function (a, b) { return b.round - a.round; });
    var table = standings(d.cls), place = table.indexOf(d) + 1, last = mine[0];
    var best = mine.slice().sort(function (a, b) { return a.pos - b.pos; })[0];

    /* Overview */
    var card = add(el('div', 'rr-panel rr-stack'),
      RR.label('Driver'),
      add(el('div', 'rr-kv-list'), RR.kv('Country', d.country), RR.kv('Team', d.team), RR.kv('Class', className(d.cls))),
      add(el('div', 'rr-kv-list'), RR.kv('Races', d.races), RR.kv('Wins', d.wins), RR.kv('Podiums', d.podiums), RR.kv('Points', d.points)));
    var hero = add(el('div', 'rr-hero'),
      RR.label('Car'), el('h2', 'rr-hero-title', d.car),
      el('div', 'rr-label rr-red', className(d.cls)), el('div', 'rr-note', d.races + ' races this season'));
    fill(RR.view('overview'), add(el('div', 'rr-stack'),
      add(el('div', 'rr-grid-2'), card, hero),
      RR.statRow([
        RR.stat('Championship', RR.pos(place), 'of ' + table.length + ' in ' + className(d.cls)),
        RR.stat('Last race', last ? RR.pos(last.pos) : '-', last ? round(last.round).track : 'No races yet'),
        RR.stat('Best finish', best ? RR.pos(best.pos) : '-', best ? round(best.round).track : 'No races yet'),
        RR.stat('Points', d.points, D.season.name)
      ])));

    /* Race history */
    fill(RR.view('history'), RR.table([
      { key: 'pos', label: 'Result' }, { key: 'track', label: 'Track' }, { key: 'best', label: 'Best lap', num: true },
      { key: 'gap', label: 'Gap', num: true }, { key: 'inc', label: 'Incidents', num: true },
      { key: 'pts', label: 'Points', num: true }, { key: 'when', label: 'When', sorted: true }
    ], mine.map(function (x) {
      var r = round(x.round);
      return { cells: { pos: RR.cell(RR.pos(x.pos), 'of ' + x.of), track: RR.cell(r.track, r.layout + ' · ' + d.car),
        best: RR.lap(x.best), gap: RR.gap(x.gap), inc: x.incidents, pts: x.points, when: r.date } };
    }), 'No races yet.'));

    /* Statistics */
    var asc = mine.slice().reverse();
    fill(RR.view('statistics'), add(el('div', 'rr-grid-2'),
      RR.barlist('Points by round', 'Pts', asc.map(function (x) { return { name: round(x.round).track, value: x.points }; })),
      RR.barlist('Drivers beaten by round', 'Drivers', asc.map(function (x) { return { name: round(x.round).track, value: x.of - x.pos }; }))));

    /* Achievements */
    var firstDate = asc.length ? round(asc[0].round).date : null;
    var all = [
      { title: 'First race', desc: 'Finish your first league race.', status: d.races ? { earned: firstDate } : { notYet: true } },
      { title: 'On the podium', desc: 'Finish a race in the top three.', status: d.podiums ? { earned: firstDate } : { notYet: true } },
      { title: 'First win', desc: 'Win a league race.', status: d.wins ? { earned: firstDate } : { notYet: true } },
      { title: 'Ten races', desc: 'Take part in ten league races.', status: { progress: [d.races, 10] } },
      { title: 'Hundred points', desc: 'Score 100 championship points.', status: { progress: [d.points, 100] } },
      { title: 'Champion', desc: 'Win a season championship.', status: { notYet: true } }
    ];
    var grid = el('div', 'rr-grid-3');
    function drawCards(which) {
      grid.textContent = '';
      var show = all.filter(function (a) {
        var s = a.status;
        return which === 'all' || (which === 'earned' && s.earned) || (which === 'progress' && s.progress) || (which === 'notyet' && s.notYet);
      });
      if (!show.length) { grid.appendChild(RR.empty('Nothing in this group.')); return; }
      show.forEach(function (a) { grid.appendChild(RR.card(a)); });
    }
    RR.headTool(RR.segment([['all', 'All'], ['earned', 'Earned'], ['progress', 'In progress'], ['notyet', 'Not yet']], drawCards), 'achievements');
    drawCards('all');
    fill(RR.view('achievements'), grid);

    RR.refresh();
  };

  var run = PAGES[document.body.getAttribute('data-rr-page')];
  if (run) run();
  RR.refresh();
})();
