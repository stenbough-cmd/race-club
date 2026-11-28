/* Race Club home: one big tile for each main place on the site (three across, two rows). The tiles are light panels drawn with CSS shapes (rr-promo-tech), with no pictures.
   A tile with no "href" is a placeholder for something not built yet (it shows NOT YET and does nothing).
   When it is built, add its "href" here and nowhere else. */
(function () {
  'use strict';
  var RR = window.RR, el = RR.el, add = RR.add;

  var TILES = [
    { title: 'News', desc: 'The latest from the league.', href: 'news.html' },
    { title: 'League', desc: 'Standings, results and lap times.', href: 'leaderboards.html', tag: 'RaceRoom' },
    { title: 'Driver List', desc: 'Comprehensive race reports.', href: 'drivers.html' },
    { title: 'File a Protest', desc: 'Dispute an incident from a race.', href: 'protest.html' },
    { title: 'Help and Rules', desc: 'The league, points and penalties.', href: 'help.html' },
    { title: 'About Race Club', desc: 'What the league is and how it works.', href: 'about.html' }
  ];

  var main = document.querySelector('main');
  RR.fillContent();
  var grid = el('div', 'rr-news-grid rr-news-six');
  TILES.forEach(function (t) {
    grid.appendChild(RR.promo({ title: t.title, desc: t.desc, href: t.href, tech: true, tag: t.tag, button: 'Open' }));
  });
  main.appendChild(add(el('div', 'rr-news'), grid));
})();
