/* Race Club RaceRoom site: SAMPLE DATA ONLY.
   Everything in this file is made up so the skeleton has something to show.
   When the admin backend exists, this file is replaced by real league data
   in the same shape. Nothing else on the site needs to change. */
(function () {
  'use strict';

  var POINTS = [25, 18, 15, 12, 10, 8, 6, 4];

  /* The tracks the sample seasons use. Different seasons reuse them so lap boards have something to compare. */
  var TRACKS = [
    { track: 'Sample Circuit One', layout: 'Grand Prix', base: 97721 },
    { track: 'Sample Circuit Two', layout: 'National', base: 70103 },
    { track: 'Sample Circuit Three', layout: 'Grand Prix', base: 127310 },
    { track: 'Sample Circuit Four', layout: 'Road Course', base: 99755 },
    { track: 'Sample Circuit Five', layout: 'Short', base: 61408 }
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

  var data = {
    sample: true,
    classes: [
      { id: 'dtm92', name: 'DTM 1992' },
      { id: 'st', name: 'Super Touring' }
    ],
    drivers: [
      { id: 'sample-driver-1', name: 'Sample Driver 1', team: 'Sample Team A', country: 'United States', cls: 'dtm92', car: 'Sample Car A' },
      { id: 'sample-driver-2', name: 'Sample Driver 2', team: 'Sample Team A', country: 'Canada', cls: 'dtm92', car: 'Sample Car B' },
      { id: 'sample-driver-3', name: 'Sample Driver 3', team: 'Sample Team B', country: 'Germany', cls: 'dtm92', car: 'Sample Car C' },
      { id: 'sample-driver-4', name: 'Sample Driver 4', team: 'Sample Team B', country: 'United Kingdom', cls: 'dtm92', car: 'Sample Car A' },
      { id: 'sample-driver-5', name: 'Sample Driver 5', team: 'Sample Team C', country: 'United States', cls: 'st', car: 'Sample Car D' },
      { id: 'sample-driver-6', name: 'Sample Driver 6', team: 'Sample Team C', country: 'Italy', cls: 'st', car: 'Sample Car E' },
      { id: 'sample-driver-7', name: 'Sample Driver 7', team: 'Sample Team D', country: 'France', cls: 'st', car: 'Sample Car D' },
      { id: 'sample-driver-8', name: 'Sample Driver 8', team: 'Sample Team D', country: 'Spain', cls: 'st', car: 'Sample Car E' }
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
  var OTHER_CARS = ['Sample Car A', 'Sample Car B', 'Sample Car C', 'Sample Car D', 'Sample Car E'];
  data.seasons = SEASON_DEFS.map(function (def) {
    var season = { id: def.id, name: def.name, status: def.status, dropWeeks: def.dropWeeks, rounds: [], results: [], champion: null };
    def.dates.forEach(function (date, i) {
      var t = TRACKS[def.tracks[i]];
      season.rounds.push({ n: i + 1, track: t.track, layout: t.layout, date: date, start: def.starts[i], done: i < def.doneCount,
        base: t.base, status: i < def.doneCount ? (def.status === 'Active' && i === def.doneCount - 1 ? 'Provisional' : 'Final') : 'Scheduled',
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
            incidents: (i * 3 + round.n + def.shift) % 7, penalty: (i + round.n) % 9 === 0 ? 5 : 0,
            status: dnf ? 'DNF' : 'Finished', laps: dnf ? 9 : 15, led: i === 0 ? 11 : (i === 1 ? 4 : 0),
            car: OTHER_CARS[(data.drivers.indexOf(d) + (round.n > 2 ? 1 : 0)) % OTHER_CARS.length],
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
    d.points = data.season.totals[d.id].total;
  });

  window.RR_DATA = data;
})();
