/* Race Club home: one big tile for each main place on the site, drawn the same way as the news stories.
   To change a tile's picture, replace the picture in assets/images/home/ with a new 1800 x 900 .jpg of the same name.
   A tile with no "href" is a placeholder for something not built yet (it shows NOT YET and does nothing).
   When it is built, add its "href" here and nowhere else. */
(function () {
  'use strict';
  var RR = window.RR, el = RR.el, add = RR.add;
  var IMG = 'assets/images/home/';

  var TILES = [
    { title: 'League News', desc: 'The latest from the league.', href: 'news.html', photo: IMG + 'league-news.jpg' },
    { title: 'Leaderboards', desc: 'Standings, results and lap times.', href: 'leaderboards.html', photo: IMG + 'leaderboards.jpg' },
    { title: 'Driver List', desc: 'Comprehensive race reports.', href: 'drivers.html', photo: IMG + 'driver-list.jpg' },
    { title: 'About Race Club', desc: 'What the league is and how it works.', href: 'about.html', photo: IMG + 'about-race-club.jpg' }
  ];

  var main = document.querySelector('main');
  RR.fillContent();
  var grid = el('div', 'rr-news-grid rr-news-quad');
  TILES.forEach(function (t) {
    grid.appendChild(RR.promo({ title: t.title, desc: t.desc, href: t.href, photo: t.photo, button: 'Open' }));
  });
  main.appendChild(add(el('div', 'rr-news'), grid));
})();
