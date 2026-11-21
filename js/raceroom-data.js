/* Race Club RaceRoom site: SAMPLE DATA ONLY.
   Everything in this file is made up so the skeleton has something to show.
   When the admin backend exists, this file is replaced by real league data
   in the same shape. Nothing else on the site needs to change. */
(function () {
  'use strict';

  var POINTS = [25, 18, 15, 12, 10, 8, 6, 4];

  var data = {
    sample: true,
    season: { id: 's1', name: 'Sample Season 1' },
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
    rounds: [
      { n: 1, track: 'Sample Circuit One', layout: 'Grand Prix', date: '01.11.2026', start: '2026-11-02T01:00:00Z', done: true, base: 97721 },
      { n: 2, track: 'Sample Circuit Two', layout: 'National', date: '08.11.2026', start: '2026-11-09T01:00:00Z', done: true, base: 70103 },
      { n: 3, track: 'Sample Circuit Three', layout: 'Grand Prix', date: '22.11.2026', start: '2026-11-23T01:00:00Z', done: false, base: 127310 },
      { n: 4, track: 'Sample Circuit Four', layout: 'Road Course', date: '29.11.2026', start: '2026-11-30T01:00:00Z', done: false, base: 99755 }
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

  /* Make up results for the finished rounds so every page agrees with every other page. */
  data.results = [];
  data.rounds.forEach(function (round) {
    if (!round.done) return;
    data.classes.forEach(function (cls) {
      var field = data.drivers.filter(function (d) { return d.cls === cls.id; });
      var order = field.slice(round.n - 1).concat(field.slice(0, round.n - 1));
      order.forEach(function (d, i) {
        data.results.push({
          round: round.n, cls: cls.id, driver: d.id, pos: i + 1, of: order.length,
          points: POINTS[i] || 0,
          best: round.base + i * 213 + (cls.id === 'st' ? 4100 : 0),
          gap: i * 3510,
          incidents: (i * 3 + round.n) % 7
        });
      });
    });
  });

  /* Totals per driver, worked out from the results above. */
  data.drivers.forEach(function (d) {
    var mine = data.results.filter(function (r) { return r.driver === d.id; });
    d.races = mine.length;
    d.wins = mine.filter(function (r) { return r.pos === 1; }).length;
    d.podiums = mine.filter(function (r) { return r.pos <= 3; }).length;
    d.points = mine.reduce(function (sum, r) { return sum + r.points; }, 0);
  });

  window.RR_DATA = data;
})();
