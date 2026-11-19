/* Race Club admin: Website Options.
   Reminders for the admin about how to change parts of the site. Nothing here changes anything by itself.
   Tab "Tile pictures": how to make and replace the pictures on the home and admin tiles.
   Tab "Picture database": what the RaceRoom picture and car details store holds and how it is kept up to date.
   Built only from the shared builders in raceroom-shell.js (RR.*). */
(function () {
  'use strict';
  var RR = window.RR, el = RR.el, add = RR.add;

  function panel(title, nodes) {
    var p = el('div', 'rr-panel rr-stack');
    p.appendChild(RR.heading(title));
    nodes.forEach(function (n) { p.appendChild(typeof n === 'string' ? el('p', 'rr-body', n) : n); });
    return p;
  }
  function list(items) {
    var ul = el('ul', 'rr-body rr-list');
    items.forEach(function (t) { ul.appendChild(el('li', '', t)); });
    return ul;
  }
  function stack() {
    var s = el('div', 'rr-stack');
    for (var i = 0; i < arguments.length; i++) s.appendChild(arguments[i]);
    return s;
  }

  /* ---------------- Tile pictures ---------------- */
  var tiles = RR.table(
    [{ key: 'tile', label: 'Tile' }, { key: 'file', label: 'Picture file' }, { key: 'code', label: 'File name is set in' }],
    [
      ['League News', 'assets/images/home/league-news.jpg', 'js/raceroom-home.js'],
      ['Leaderboards', 'assets/images/home/leaderboards.jpg', 'js/raceroom-home.js'],
      ['File a Protest', 'assets/images/home/file-a-protest.jpg', 'js/raceroom-home.js'],
      ['About Race Club', 'assets/images/home/about-race-club.jpg', 'js/raceroom-home.js'],
      ['Season Wizard', 'assets/images/admin/season-wizard.jpg', 'js/raceroom-hub.js'],
      ['News Generator', 'assets/images/admin/news-generator.jpg', 'js/raceroom-hub.js'],
      ['Stewarding', 'assets/images/admin/stewarding.jpg', 'js/raceroom-hub.js'],
      ['Member Management', 'assets/images/admin/member-management.jpg', 'js/raceroom-hub.js'],
      ['Upload Results', 'assets/images/admin/upload-results.jpg', 'js/raceroom-hub.js'],
      ['Website Options', 'assets/images/admin/website-options.jpg', 'js/raceroom-hub.js']
    ].map(function (r) { return { cells: { tile: r[0], file: r[1], code: r[2] } }; })
  );
  add(RR.view('pictures'), stack(
    panel('What to make', [
      list([
        'Size: 1800 x 900 pixels. That is twice the widest tile, so it stays sharp on high-resolution screens. Larger gains nothing.',
        'Layout: put the important part of the picture in the middle band, about the middle fifth of the height. Tall windows crop the top and bottom heavily, and the crop is always centered.',
        'Bottom third: each tile fades dark across the bottom for the title and button. Do not put anything there you need to see.',
        'File type and size: JPG, ideally under 400 KB. There are only 10 tile pictures, so a few hundred KB each is fine.'
      ])
    ]),
    panel('How to change a picture', [
      list([
        'Save the new picture as a .jpg with exactly the same name as the old one, and put it in the same folder (assets/images/home/ or assets/images/admin/), replacing the old file. Nothing else needs to change.',
        'The file names are listed in the table below. Never rename them. If a tile ever needs a different name, it is set in js/raceroom-home.js or js/raceroom-hub.js.',
        'Push from GitHub Desktop. If the old picture still shows afterwards, hard refresh the page (Cmd+Shift+R), because browsers keep pictures.',
        'Tile shapes seen on the home page: about 924 x 400 on a large monitor, 647 x 244 on a laptop, and a thin 768 x 170 strip in a tall (portrait) window.',
        'News story pictures are not set here. The story writer chooses them for each story.'
      ])
    ]),
    panel('Which file is which tile', [tiles])
  ));

  /* ---------------- Picture database ---------------- */
  add(RR.view('database'), stack(
    panel('What it is', [
      'The site keeps its own copy of every RaceRoom picture, so a livery, car, class or manufacturer picture can be shown from its RaceRoom ID without depending on the RaceRoom store. It also keeps the store details for every car.',
      list([
        'assets/r3e/liveries/small/ID.webp: every livery. assets/r3e/liveries/full/ID.webp: each car\'s big default livery picture.',
        'assets/r3e/classes/ID.webp and assets/r3e/manufacturers/ID.webp: one picture per class and per manufacturer, not one per car.',
        'assets/r3e/cars.json: for each car, its description, engine, aspiration, drivetrain, shifting, gears, downforce, difficulty, raced in, power, torque, weight and top speed.',
        'assets/r3e/index.json: which car, class and manufacturer each ID belongs to. assets/r3e/report.json and cars-report.json: what we have and what the store does not have.',
        'raceroom-data/r3e-data.json: RaceRoom\'s public list of cars, liveries, classes, manufacturers and tracks.'
      ])
    ]),
    panel('How it stays up to date', [
      list([
        'GitHub runs it by itself every day (the "RaceRoom pictures" workflow). It refreshes the list, downloads any picture it does not have yet, reads the store page of any car it does not have details for, and saves the result into the repo. Nothing needs to be done by hand.',
        'Every Monday it opens every car page again, so changed details are picked up.',
        'To run it right now: GitHub, Actions tab, RaceRoom pictures, Run workflow.',
        'After a run, pull in GitHub Desktop before the next push.',
        'The tools are tools/r3e-sync.mjs (pictures) and tools/r3e-cars.mjs (car details). The schedule is in .github/workflows/r3e-sync.yml.'
      ])
    ]),
    panel('Using it on a page', [
      list([
        'Load js/raceroom-images.js. RR.images.img(kind, id) gives a picture, where kind is livery, car, class or manufacturer.',
        'It tries our copy first, then the RaceRoom store, then the car\'s picture, the class and the manufacturer, and last a Race Club "no picture" image.',
        'RR.images.info(kind, id) gives names and links between IDs. RR.images.details(carId) gives the car details.',
        'Tracks will get the same treatment later with their own scraper.'
      ])
    ])
  ));
})();
