/* Race Club admin home: one button for each admin tool, drawn with an icon in the middle (no pictures).
   The button look is the .rr-tool style in css/race-club.css; the icons are in raceroom-shell.js (ICONS).
   A tool with no "href" is a placeholder for a tool that is not built yet and does nothing.
   When a tool is built, add its "href" here and nowhere else. */
(function () {
  'use strict';
  var RR = window.RR, el = RR.el, add = RR.add;

  var TOOLS = [
    { title: 'Season Wizard', desc: 'Build a season and make the server files.', href: 'season-wizard.html', icon: 'wizard' },
    { title: 'News Editor', desc: 'Write news, and edit, rewrite or hide the race stories.', href: 'news-editor.html', icon: 'news' },
    { title: 'Stewarding', desc: 'Look at protests and give penalties.', href: 'stewarding.html', icon: 'steward' },
    { title: 'Member Management', desc: 'Blacklist drivers and hide names from stories.', href: 'members.html', icon: 'members' },
    { title: 'Results', desc: 'Confirm results, cancel a round, see what the server posted and add a race by hand.', href: 'league-management.html', icon: 'trophy' },
    { title: 'Website Documentation', desc: 'How every part of the site works and how to change it.', href: 'website-options.html', icon: 'book' }
  ];

  var main = document.querySelector('main');
  RR.fillContent();
  var grid = el('div', 'rr-tool-grid');
  TOOLS.forEach(function (t) {
    var a = el(t.href ? 'a' : 'div', 'rr-tool');
    if (t.href) a.href = t.href;
    add(a, RR.icon(t.icon), el('h3', 'rr-tile-title', t.title), el('p', 'rr-body', t.desc));
    grid.appendChild(a);
  });
  main.appendChild(grid);
})();
