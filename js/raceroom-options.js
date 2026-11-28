/* Race Club admin: Website Documentation (the last tab of website-options.html).
   Reminders for the admin about how to change parts of the site. Nothing here changes anything by itself.
   The first five tabs (Overview, Pages, Running a season, Behind the scenes, How to change things) are in raceroom-docs.js.
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

  /* ---------------- Picture database ---------------- */
  add(RR.view('database'), stack(
    panel('What it is', [
      'The site keeps its own copy of every RaceRoom picture, so a livery, car, class or manufacturer picture can be shown from its RaceRoom ID without depending on the RaceRoom store. It also keeps the store details for every car.',
      list([
        'assets/r3e/liveries/small/ID.webp: every livery. assets/r3e/liveries/full/ID.webp: each car\'s big default livery picture.',
        'assets/r3e/classes/ID.webp and assets/r3e/manufacturers/ID.webp: one picture per class and per manufacturer, not one per car.',
        'assets/r3e/cars.json: for each car, its description, engine, aspiration, drivetrain, shifting, gears, downforce, difficulty, raced in, power, torque, weight and top speed.',
        'assets/r3e/index.json: which car, class and manufacturer each ID belongs to. assets/r3e/report.json and cars-report.json: what we have and what the store does not have.',
        'assets/r3e/tracks.json: for each track, its venue, country, location, description, type, year opened, what was raced there, its layouts and how many pictures it has. A track is the same thing the store sells, so Brands Hatch Indy and Brands Hatch Grand Prix are two tracks, and Watkins Glen is one track with four layouts.',
        'assets/r3e/tracks/TRACKID/1.webp, 2.webp, ...: the store\'s pictures of each track. assets/r3e/layouts/LAYOUTID.svg: each layout\'s map. assets/r3e/venues/VENUEID.webp: the venue\'s logo, one per venue, shared by its tracks. assets/r3e/tracks-report.json lists tracks the store has no page for.',
        'raceroom-data/r3e-data.json: RaceRoom\'s public list of cars, liveries, classes, manufacturers and tracks.'
      ])
    ]),
    panel('How it stays up to date', [
      list([
        'GitHub runs it by itself every day (the "RaceRoom pictures" workflow). It refreshes the list, downloads any picture it does not have yet, reads the store page of any car or track it does not have details for, and saves the result into the repo. Nothing needs to be done by hand.',
        'Every Monday it opens every car and track page again, so changed details are picked up.',
        'To run it right now: GitHub, Actions tab, RaceRoom pictures, Run workflow.',
        'After a run, pull in GitHub Desktop before the next push.',
        'The tools are tools/r3e-sync.mjs (pictures), tools/r3e-cars.mjs (car details) and tools/r3e-tracks.mjs (tracks). The schedule is in .github/workflows/r3e-sync.yml.'
      ])
    ]),
    panel('Using it on a page', [
      list([
        'Load js/raceroom-images.js. RR.images.img(kind, id) gives a picture, where kind is livery, car, class or manufacturer.',
        'It tries our copy first, then the RaceRoom store, then the car\'s picture, the class and the manufacturer, and last a Race Club "no picture" image.',
        'RR.images.info(kind, id) gives names and links between IDs. RR.images.details(carId) gives the car details.',
        'Tracks: RR.images.img(\'track\', trackId, { n: 2 }) is a track picture, img(\'layout\', layoutId) a layout map, RR.images.trackLogo(trackId) the venue logo, and RR.images.tracks(trackId) the track details.'
      ])
    ])
  ));
})();
