/* Race Club admin home: one big tile for each admin tool, drawn the same way as the news stories.
   To change a tile's picture, replace the picture in assets/images/admin/ with a new 1800 x 900 .jpg of the same name.
   A tile with no "href" is a placeholder for a tool that is not built yet (it shows NOT YET and does nothing).
   When a tool is built, add its "href" here and nowhere else. */
(function () {
  'use strict';
  var RR = window.RR, el = RR.el, add = RR.add;
  var IMG = 'assets/images/admin/';

  var TILES = [
    { title: 'Season Wizard', desc: 'Build a season and make the server files.', href: 'season-wizard.html', photo: IMG + 'season-wizard.jpg' },
    { title: 'News Editor', desc: 'Write news, and edit, rewrite or hide the race stories.', href: 'news-editor.html', photo: IMG + 'news-generator.jpg' },
    { title: 'Stewarding', desc: 'Look at protests and give penalties.', href: 'stewarding.html', photo: IMG + 'stewarding.jpg' },
    { title: 'Member Management', desc: 'Blacklist drivers and hide names from stories.', href: 'members.html', photo: IMG + 'member-management.jpg' },
    { title: 'Results', desc: 'Confirm results, cancel a round, see what the server posted and add a race by hand.', href: 'league-management.html', photo: IMG + 'upload-results.jpg' },
    { title: 'Website Options', desc: 'Reminders for changing the site.', href: 'website-options.html', photo: IMG + 'website-options.jpg' }
  ];

  var main = document.querySelector('main');
  RR.fillContent();
  var grid = el('div', 'rr-news-grid rr-news-rest');
  TILES.forEach(function (t) {
    grid.appendChild(RR.promo({ title: t.title, desc: t.desc, href: t.href, photo: t.photo, button: 'Open' }));
  });
  main.appendChild(add(el('div', 'rr-news'), grid));
})();
