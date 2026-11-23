/* Race Club RaceRoom site: the data every public page reads (window.RR_DATA).
   SAMPLE DATA: everything built below is made up so the pages have something to show until the league has real results.
   REAL DATA: league.js in the race-club-data repository (https://stenbough-cmd.github.io/race-club-data/league.js, written by the league's Apps Script after every confirmed round and loaded by a script tag in each public page) sets window.RR_LIVE in the same
   shape. When it holds a season, applyLive (further down) replaces the sample with it. */
(function () {
  'use strict';

  var POINTS = [25, 18, 15, 12, 10, 8, 6, 4];

  /* The tracks the sample seasons use. Different seasons reuse them so lap boards have something to compare. */
  var TRACKS = [
    { track: 'Sample Circuit One', layout: 'Grand Prix', layoutId: 1671, base: 97721 },
    { track: 'Sample Circuit Two', layout: 'National', layoutId: 1674, base: 70103 },
    { track: 'Sample Circuit Three', layout: 'Grand Prix', layoutId: 1678, base: 127310 },
    { track: 'Sample Circuit Four', layout: 'Road Course', layoutId: 1684, base: 99755 },
    { track: 'Sample Circuit Five', layout: 'Short', layoutId: 1691, base: 61408 }
  ];

  /* Newest season first. Draft seasons are never shown to visitors, so none are listed here. */
  var SEASON_DEFS = [
    { id: 's3', name: 'Sample Season 3', status: 'Active', dropWeeks: 0, doneCount: 2, dates: ['01.11.2026', '08.11.2026', '22.11.2026', '29.11.2026'],
      starts: ['2026-11-02T01:00:00Z', '2026-11-09T01:00:00Z', '2026-11-23T01:00:00Z', '2026-11-30T01:00:00Z'], tracks: [0, 1, 2, 3], shift: 0 },
    { id: 's2', name: 'Sample Season 2', status: 'Finished', dropWeeks: 1, doneCount: 5, dates: ['06.09.2026', '13.09.2026', '20.09.2026', '27.09.2026', '04.10.2026'],
      starts: ['2026-09-07T01:00:00Z', '2026-09-14T01:00:00Z', '2026-09-21T01:00:00Z', '2026-09-28T01:00:00Z', '2026-10-05T01:00:00Z'], tracks: [4, 2, 0, 3, 1], shift: 3 },
    { id: 's1', name: 'Sample Season 1', status: 'Finished', dropWeeks: 0, doneCount: 4, dates: ['02.08.2026', '09.08.2026', '16.08.2026', '23.08.2026'],
      starts: ['2026-08-03T01:00:00Z', '2026-08-10T01:00:00Z', '2026-08-17T01:00:00Z', '2026-08-24T01:00:00Z'], tracks: [0, 3, 1, 4], shift: 5 }
  ];

  /* Real RaceRoom cars and their default liveries (RaceRoom's own IDs), so the sample pages show real pictures.
     The league's real data will carry the livery each driver used, straight from the results file. */
  var CLASS_CARS = {
    dtm92: [{ name: 'Mercedes 190E Evo II DTM', livery: 3541 }, { name: 'BMW M3 Sport Evolution', livery: 3557 },
      { name: 'Audi V8 DTM', livery: 3664 }, { name: 'Ford Mustang GT DTM', livery: 3846 }],
    st: [{ name: 'Honda Accord Super Touring', livery: 9848 }, { name: 'BMW 320i E36 Super Touring', livery: 12614 },
      { name: 'Audi A4 Super Touring 1995', livery: 12563 }, { name: 'Volvo 850 Super Touring', livery: 12654 }]
  };

  /* Sample season setup (real RaceRoom class, car and livery IDs so the pictures show). */
  var SETUP = {
    classes: [
      { id: 'dtm92', classId: 3499, name: 'DTM 1992', cars: [
        { carId: 3539, name: CLASS_CARS.dtm92[0].name, liveries: [3541, 3542, 3543] },
        { carId: 3549, name: CLASS_CARS.dtm92[1].name, liveries: [3557, 3558, 3559] },
        { carId: 3662, name: CLASS_CARS.dtm92[2].name, liveries: [3664, 3665, 3666] },
        { carId: 3842, name: CLASS_CARS.dtm92[3].name, liveries: [3846, 3847] }] },
      { id: 'st', classId: 1710, name: 'Super Touring', cars: [
        { carId: 8645, name: CLASS_CARS.st[0].name, liveries: [9848, 11291, 11292] },
        { carId: 12556, name: CLASS_CARS.st[1].name, liveries: [12614, 12558, 12600] },
        { carId: 12561, name: CLASS_CARS.st[2].name, liveries: [12563, 12581, 12584] },
        { carId: 12652, name: CLASS_CARS.st[3].name, liveries: [12654, 12664, 12666] }] }
    ],
    rules: [
      { group: 'Grid and sessions', items: [['Max players', '12'], ['Reverse grid', 'Off'], ['Join qualifying late', 'Yes']] },
      { group: 'Car and wear', items: [['Fuel usage', 'Normal'], ['Tyre wear', 'Normal'], ['Damage', 'Full'], ['Mandatory pit stop', 'Off'], ['Fixed setup', 'Yes']] },
      { group: 'Race rules', items: [['Flag rules', 'Visual only'], ['Cut rules', 'Slow down'], ['Wrecker prevention', 'Off'], ['Max incident points', '30']] },
      { group: 'Drive assists', items: [['Preset', 'Custom'], ['Traction control', 'On'], ['Stability control', 'On'], ['Brake assist', 'On']] }
    ],
    weekend: [
      { session: 'Practice', length: '15 minutes', start: 'Standing' },
      { session: 'Qualify', length: '15 minutes', start: 'Standing' },
      { session: 'Race 1', length: '20 minutes', start: 'Standing' }
    ],
    points: [
      { name: 'DTM 1992', table: POINTS.join(', ') },
      { name: 'Super Touring', table: POINTS.join(', ') }
    ],
    bonuses: [['Pole position', '1 point'], ['Fastest lap', '1 point'], ['Clean race', '1 point']]
  };

  var data = {
    sample: true,
    classes: [
      { id: 'dtm92', name: 'DTM 1992' },
      { id: 'st', name: 'Super Touring' }
    ],
    drivers: [
      { id: 'sample-driver-1', userId: 8261679, name: 'Sample Driver 1', country: 'United States', cls: 'dtm92', car: CLASS_CARS.dtm92[0].name, livery: CLASS_CARS.dtm92[0].livery },
      { id: 'sample-driver-2', userId: 3493304, name: 'Sample Driver 2', country: 'Canada', cls: 'dtm92', car: CLASS_CARS.dtm92[1].name, livery: CLASS_CARS.dtm92[1].livery },
      { id: 'sample-driver-3', userId: 8081195, name: 'Sample Driver 3', country: 'Germany', cls: 'dtm92', car: CLASS_CARS.dtm92[2].name, livery: CLASS_CARS.dtm92[2].livery },
      { id: 'sample-driver-4', userId: 2369079, name: 'Sample Driver 4', country: 'United Kingdom', cls: 'dtm92', car: CLASS_CARS.dtm92[3].name, livery: CLASS_CARS.dtm92[3].livery },
      { id: 'sample-driver-5', userId: 7361519, name: 'Sample Driver 5', country: 'United States', cls: 'st', car: CLASS_CARS.st[0].name, livery: CLASS_CARS.st[0].livery },
      { id: 'sample-driver-6', userId: 5327094, name: 'Sample Driver 6', country: 'Italy', cls: 'st', car: CLASS_CARS.st[1].name, livery: CLASS_CARS.st[1].livery },
      { id: 'sample-driver-7', userId: 6112142, name: 'Sample Driver 7', country: 'France', cls: 'st', car: CLASS_CARS.st[2].name, livery: CLASS_CARS.st[2].livery },
      { id: 'sample-driver-8', userId: 4951332, name: 'Sample Driver 8', country: 'Spain', cls: 'st', car: CLASS_CARS.st[3].name, livery: CLASS_CARS.st[3].livery }
    ],
    news: [
      { id: 'sample-story-2', kind: 'story', eyebrow: 'Race story', title: 'Sample race story for round 2', date: '08.11.2026',
        desc: 'Placeholder for the story written after each race.',
        body: ['This is sample text. A story generated from the race results will appear here after each round.',
               'It will cover who won, the closest fights and anything that changed in the standings.'] },
      { id: 'sample-news-2', kind: 'news', eyebrow: 'League news', title: 'Sample league announcement', date: '05.11.2026',
        desc: 'Placeholder for news posted by the league.',
        body: ['This is sample text. League news posted by the admin will appear here.'] },
      { id: 'sample-story-1', kind: 'story', eyebrow: 'Race story', title: 'Sample race story for round 1', date: '01.11.2026',
        desc: 'Placeholder for the story written after each race.',
        body: ['This is sample text. A story generated from the race results will appear here after each round.'] },
      { id: 'sample-news-1', kind: 'news', eyebrow: 'League news', title: 'Sample season opening post', date: '25.10.2026',
        desc: 'Placeholder for news posted by the league.',
        body: ['This is sample text. League news posted by the admin will appear here.'] }
    ]
  };

  /* Extra sample posts so the News page has more than one page to show. */
  for (var extra = 3; extra <= 9; extra++) {
    data.news.push({
      id: 'sample-news-' + extra, kind: 'news', eyebrow: 'League news', title: 'Sample older post ' + extra,
      date: (25 - extra) + '.10.2026', desc: 'Placeholder for news posted by the league.',
      body: ['This is sample text. League news posted by the admin will appear here.']
    });
  }


  /* Extra sample posts so the News page has more than one page to show. */
  for (var extra = 3; extra <= 9; extra++) {
    data.news.push({
      id: 'sample-news-' + extra, kind: 'news', eyebrow: 'League news', title: 'Sample older post ' + extra,
      date: (25 - extra) + '.10.2026', desc: 'Placeholder for news posted by the league.',
      body: ['This is sample text. League news posted by the admin will appear here.']
    });
  }

  /* Make up seasons, rounds and results so every page agrees with every other page.
     Each result carries everything the leaderboard and profile pages need. All of it can be worked out
     from the real results files and the Rounds tab, nothing here is a field the files do not have. */
  /* Each driver has a main car; from round 3 they try the next one in the class. */
  function classCar(clsId, d, roundNo) {
    var list = CLASS_CARS[clsId], mainAt = Math.max(0, list.map(function (c) { return c.name; }).indexOf(d.car));
    return list[(mainAt + (roundNo > 2 ? 1 : 0)) % list.length];
  }
  data.seasons = SEASON_DEFS.map(function (def) {
    var season = { id: def.id, name: def.name, status: def.status, dropWeeks: def.dropWeeks, rounds: [], results: [], champion: null,
      /* What the season is made of, as the season wizard saved it: classes with cars and liveries, rules, weekend and points.
         Every value is already readable text, so the Season page only displays it. */
      setup: { classes: SETUP.classes, rules: SETUP.rules, weekend: SETUP.weekend,
        points: { classes: SETUP.points, bonuses: SETUP.bonuses, dropWeeks: def.dropWeeks } } };
    def.dates.forEach(function (date, i) {
      var t = TRACKS[def.tracks[i]];
      season.rounds.push({ n: i + 1, track: t.track, layout: t.layout, layoutId: t.layoutId, date: date, start: def.starts[i], done: i < def.doneCount,
        base: t.base, status: i < def.doneCount ? (def.status === 'Active' && i === def.doneCount - 1 ? 'Waiting' : 'Settled') : 'Scheduled',
        protestCloses: def.status === 'Active' && i === def.doneCount - 1 ? '09.11.2026 08:00' : '' });
    });
    season.rounds.forEach(function (round) {
      if (!round.done) return;
      data.classes.forEach(function (cls) {
        var field = data.drivers.filter(function (d) { return d.cls === cls.id; });
        var turn = (round.n - 1 + def.shift) % field.length;
        var order = field.slice(turn).concat(field.slice(0, turn));
        var fastest = round.base + (cls.id === 'st' ? 4100 : 0);
        order.forEach(function (d, i) {
          var lap = fastest + ((i * 5 + round.n * 3 + def.shift) % field.length) * 213;
          var dnf = (round.n * 7 + data.drivers.indexOf(d) + def.shift) % 11 === 0;
          season.results.push({
            season: def.id, round: round.n, cls: cls.id, driver: d.id, pos: i + 1, of: order.length, start: ((i + 2) % order.length) + 1,
            points: dnf ? 0 : (POINTS[i] || 0), pole: i === ((round.n + def.shift) % order.length),
            fastest: false, best: lap, gap: i * 3510, gapPct: 0,
            time: dnf ? 0 : (fastest + 800) * 15 + i * 3510, avg: dnf ? 0 : Math.round(((fastest + 800) * 15 + i * 3510) / 15),
            incidents: (i * 3 + round.n + def.shift) % 7, penalty: (i + round.n) % 9 === 0 ? 5 : 0,
            status: dnf ? 'DNF' : 'Finished', laps: dnf ? 9 : 15, led: i === 0 ? 11 : (i === 1 ? 4 : 0),
            car: classCar(cls.id, d, round.n).name, livery: classCar(cls.id, d, round.n).livery,
            invalid: (i + round.n) % 4
          });
        });
      });
      /* Pole bonus and fastest-lap bonus: 1 point each, per class. */
      data.classes.forEach(function (cls) {
        var rows = season.results.filter(function (r) { return r.round === round.n && r.cls === cls.id; });
        var quickest = rows.slice().sort(function (a, b) { return a.best - b.best; })[0];
        quickest.fastest = true;
        rows.forEach(function (r) {
          r.bonus = (r.pole ? 1 : 0) + (r.fastest ? 1 : 0);
          r.gapPct = (r.best - quickest.best) / quickest.best * 100;
        });
      });
    });
    /* Season totals per driver (points + bonus, minus the dropped rounds). */
    season.totals = {};
    data.drivers.forEach(function (d) {
      var per = season.rounds.filter(function (r) { return r.done; }).map(function (r) {
        var x = season.results.filter(function (q) { return q.round === r.n && q.driver === d.id; })[0];
        return x ? x.points + x.bonus : 0;
      });
      var drop = [];
      if (season.dropWeeks && per.length > season.dropWeeks) {
        per.map(function (v, i) { return [v, i]; }).sort(function (a, b) { return a[0] - b[0] || b[1] - a[1]; })
          .slice(0, season.dropWeeks).forEach(function (p) { drop.push(p[1]); });
      }
      season.totals[d.id] = { per: per, drop: drop, total: per.reduce(function (sum, v, i) { return sum + (drop.indexOf(i) >= 0 ? 0 : v); }, 0) };
    });
    if (def.status === 'Finished') {
      var top = data.drivers.slice().sort(function (a, b) { return season.totals[b.id].total - season.totals[a.id].total; })[0];
      season.champion = top.id;
    }
    return season;
  });

  /* Protests (sample). ruling: 'Pending', 'Penalised' or 'Dismissed'; penalty is what was given ('1 point', '3 points', '5 points' or 'DSQ'); comment is the steward's.
     self: true means the driver reported their own collision with the driver named in "against". */
  var PROTEST_REASONS = ['Bad Rejoin', 'Blocking or Weaving', 'Reckless Driving', 'Intentional Wrecking'];
  data.protestReasons = PROTEST_REASONS;
  /* SAMPLE ONLY: a stand-in so the protest page can be tried. The real race password is never in the page: the service checks it. */
  data.sampleRacePassword = 'sample';
  data.protests = [];
  data.seasons.forEach(function (season) {
    season.rounds.forEach(function (round) {
      if (!round.done) return;
      var field = data.drivers.filter(function (d) { return d.cls === 'dtm92'; });
      var a = field[(round.n + 1) % field.length], b = field[(round.n + 2) % field.length];
      var open = round.status === 'Waiting';
      var self = round.n % 2 === 0;
      data.protests.push({ season: season.id, round: round.n, by: a.id, against: b.id, self: self, lap: 3 + round.n,
        reason: PROTEST_REASONS[round.n % 4], narrative: self ? 'I went in too deep into the braking zone and hit the car ahead.' : 'Moved across on the straight while I was alongside and we touched.',
        ruling: open ? 'Pending' : (round.n % 3 === 0 ? 'Dismissed' : 'Penalised'),
        penalty: open || round.n % 3 === 0 ? '' : (round.n % 2 === 0 ? '1 point' : '3 points'),
        comment: open ? '' : (round.n % 3 === 0 ? 'Racing incident.' : 'Moved across under braking.') });
    });
  });

  /* REAL DATA. When that league.js exists (the league's Apps Script writes it after every confirmed round) the page uses it
     instead of the sample above. It is already in this same shape. Two things are decided here, from the clock, because nothing runs
     on a timer: a round counts toward the standings once its protest window has ended and no protest is open (until then the page
     uses the standings without it), and "Protests close" disappears once the window has ended. */
  function applyLive(live) {
    var now = Date.now();
    data.sample = false;
    data.classes = live.classes || [];
    data.drivers = live.drivers || [];
    data.news = live.news || [];
    data.protests = live.protests || [];
    data.sampleRacePassword = '';
    data.seasons = live.seasons.map(function (s) {
      var settled = !(s.windowEnd > now) && !(s.openProtests > 0);
      s.totals = settled ? s.totalsWith : s.totals;
      s.rounds.forEach(function (r) {
        /* Waiting while the window is open or a protest is still open. Protests can only be filed while the window is open. */
        var inWindow = r.done && r.windowEnd > now, waiting = r.done && (inWindow || r.protestsOpen > 0);
        r.counts = r.done && !waiting;
        if (r.done) r.status = waiting ? 'Waiting' : 'Settled';
        if (r.done && !inWindow) r.protestCloses = '';
      });
      return s;
    });
  }
  if (window.RR_LIVE && window.RR_LIVE.seasons && window.RR_LIVE.seasons.length) applyLive(window.RR_LIVE);
  /* Before any season is live (a season only saved so far) the sample seasons stay, but real stories, such as the season preview, still replace the sample posts. */
  else if (window.RR_LIVE && window.RR_LIVE.news && window.RR_LIVE.news.length) data.news = window.RR_LIVE.news;

  /* The current season is the first one. The older pages read these three. */
  data.season = data.seasons[0];
  data.rounds = data.season.rounds;
  data.results = data.season.results;

  /* Totals per driver. points and the race counts are for the CURRENT season (the Drivers list); career is every season. */
  data.drivers.forEach(function (d) {
    function sum(list) {
      return { races: list.length, wins: list.filter(function (r) { return r.pos === 1 && r.status === 'Finished'; }).length,
        podiums: list.filter(function (r) { return r.pos <= 3 && r.status === 'Finished'; }).length };
    }
    var mine = data.results.filter(function (r) { return r.driver === d.id; });
    var s = sum(mine);
    d.races = s.races; d.wins = s.wins; d.podiums = s.podiums;
    d.points = data.season.totals[d.id] ? data.season.totals[d.id].total : 0;
  });

  window.RR_DATA = data;
})();
