/* Race Club admin home: one big tile for each admin tool, drawn the same way as the news stories.
   To change a tile's picture, put the new picture in assets/images/admin/ and change its file name below.
   A tile with no "href" is a placeholder for a tool that is not built yet (it shows NOT YET and does nothing).
   When a tool is built, add its "href" here and nowhere else. */
(function () {
  'use strict';
  var RR = window.RR, el = RR.el, add = RR.add;
  var IMG = 'assets/images/admin/';

  var TILES = [
    { title: 'Season Wizard', desc: 'Build a season and make the server files.', href: 'season-wizard.html', photo: IMG + 'season-wizard.svg' },
    { title: 'News Generator', desc: 'Write the news and the race stories.', photo: IMG + 'news-generator.svg' },
    { title: 'Stewarding', desc: 'Look at protests and give penalties.', photo: IMG + 'stewarding.svg' },
    { title: 'Member Management', desc: 'Look after the drivers in the league.', photo: IMG + 'member-management.svg' },
    { title: 'Upload Results', desc: 'Add a race by hand from its results file.', href: 'upload-results.html', photo: IMG + 'upload-results.svg' },
    { title: 'Website Options', desc: 'Change how the website looks and works.', photo: IMG + 'website-options.svg' }
  ];

  var main = document.querySelector('main');
  RR.fillContent();
  var grid = el('div', 'rr-news-grid rr-news-rest');
  TILES.forEach(function (t) {
    grid.appendChild(RR.promo({ title: t.title, desc: t.desc, href: t.href, photo: t.photo, button: 'Open' }));
  });
  main.appendChild(add(el('div', 'rr-news'), grid));
})();
