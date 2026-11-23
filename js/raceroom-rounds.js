/* Race Club admin: League Management, the "Rounds" tab.
   Shows every round of a season. When the RaceRoom server (or a hand upload) has sent results for a round, nothing about
   them is public until you Confirm them here. Review shows what the file says; Confirm makes the results live, Deny keeps the
   file but never uses it. A newer file for a round that is already live waits here too and changes nothing until you confirm it.
   A round with no results can be cancelled (and restored). Both Confirm and Deny use the two-click button.
   Stories: Confirm only puts the results live. The round's story is written when you press Write story on the News Editor, Story writer tab, after adding context there.
   The list is read when the page opens and after a change made here (never on a timer).
   Built only from the shared builders in raceroom-shell.js (RR.*). */
(function () {
  'use strict';
  var RR = window.RR;
  var el = RR.el, add = RR.add;
  var view = RR.view('rounds');

  var data = null, busy = false, failed = false, seasonId = '', review = null, message = null, writing = false;

  /* 2026-11-22 08:15 becomes 22.11.2026 08:15 */
  function dmy(text) {
    var m = /^(\d{4})-(\d{2})-(\d{2})(.*)$/.exec(String(text || ''));
    return m ? m[3] + '.' + m[2] + '.' + m[1] + m[4] : String(text || '');
  }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  /* The Sheet's Status word, as this page says it. */
  function statusOf(r) {
    if (r.waiting) return ['Waiting for your decision', 'rr-status-bad', 'Received ' + dmy(r.waiting.received)];
    if (r.held) return ['Live, newer file waiting', 'rr-status-bad', 'Received ' + dmy(r.held.received)];
    if (r.status === 'Provisional' || r.status === 'Final') return ['Live', 'rr-status-ok', r.protestCloses ? 'Protests close ' + dmy(r.protestCloses) : ''];
    if (r.status === 'Cancelled') return ['Cancelled', '', ''];
    return ['Scheduled', '', ''];
  }

  function load() {
    if (busy) return;
    busy = true; failed = false; draw();
    RR.api('listRounds').then(function (res) {
      busy = false;
      if (res && res.ok) {
        data = res;
        var known = res.seasons.some(function (s) { return s.seasonId === seasonId; });
        if (!known) {
          var active = res.seasons.filter(function (s) { return s.status === 'Active'; })[0] || res.seasons[res.seasons.length - 1];
          seasonId = active ? active.seasonId : '';
        }
        var flagged = res.rounds.some(function (r) { return r.waiting || r.held; });
        RR.flagTabs(flagged ? ['rounds'] : []);
        /* A review that is no longer waiting (decided or replaced by a newer file) is closed. */
        if (review) {
          var now = res.rounds.filter(function (r) { return r.id === review.roundId; })[0];
          var file = now && (now.waiting || now.held);
          if (!file || file.fingerprint !== review.fingerprint) review = null;
        }
      } else failed = true;
      draw();
    });
  }

  function problem(res) {
    var e = res && res.error;
    if (e === 'changed') return 'A newer file arrived or the round changed, so nothing was done. Look at it again.';
    if (e === 'season-ended') return 'This season has ended, so its results cannot be confirmed. Reopen the season first (Season tab).';
    if (e === 'has-results') return 'This round has results, so it cannot be cancelled.';
    return 'Could not do that. Try again.';
  }
  /* What happened to the public website data after a change: Apps Script sends it to GitHub right after the change. */
  function publishNote(res) {
    if (!res || res.published === undefined) return '';
    if (res.published) return ' The website data was updated; GitHub Pages shows it in 1 to 2 minutes.';
    return res.publishError ? ' The website data was NOT updated: ' + res.publishError : ' The website data was not updated because GitHub is not set up yet.';
  }
  function done(text, kind, res) {
    message = { text: text + publishNote(res), kind: res && res.published === false && res.publishError ? 'warn' : kind };
    review = null;
    load();
  }

  /* ---------------- Stories ---------------- */

  /* ---------------- Cancel and restore ---------------- */
  function cancelButton(r, cancelled) {
    var b = RR.button(cancelled ? 'Cancel round' : 'Restore round', null, false);
    RR.arm(b, '', cancelled ? 'Confirm cancel round' : 'Confirm restore round', function () {
      RR.api('cancelRound', { roundId: r.id, cancelled: cancelled }).then(function (res) {
        if (res && res.ok) done(cancelled ? 'Round ' + r.n + ' is cancelled.' : 'Round ' + r.n + ' is back on the schedule.', 'ok', res);
        else { message = { text: problem(res), kind: 'warn' }; draw(); }
      });
    });
    return b;
  }

  /* ---------------- Reviewing a file ---------------- */
  function openReview(r) {
    var file = r.waiting || r.held;
    review = { roundId: r.id, fingerprint: file.fingerprint, held: !r.waiting, round: r, busy: true, preview: null, failed: false };
    message = null;
    draw();
    RR.api('roundPreview', { roundId: r.id, fingerprint: file.fingerprint }).then(function (res) {
      if (!review || review.fingerprint !== file.fingerprint) return;
      review.busy = false;
      if (res && res.ok) review.preview = res; else { review.failed = true; review.error = problem(res); }
      draw();
    });
  }

  function decide(action, r, fingerprint) {
    RR.api(action, { roundId: r.id, fingerprint: fingerprint }).then(function (res) {
      if (!(res && res.ok)) { message = { text: problem(res), kind: 'warn' }; if (res && res.error === 'changed') review = null; draw(); if (res && res.error === 'changed') load(); return; }
      if (action === 'denyRound') done('Round ' + r.n + ': the file was denied. It is kept in the Inbox, and nothing was made public.', 'ok');
      else if (res.protestEnds) {
        done('Round ' + r.n + ' is live. Protests close ' + dmy(res.protestEnds) + (res.fromSchedule ? '.' : ' (the round has no usable schedule, so this counts 12 hours from now).') +
          (res.newDrivers ? ' ' + plural(res.newDrivers, 'new driver was', 'new drivers were') + ' added.' : '') + ' Add context and press Write story on the News Editor, Story writer tab, when you are ready.', 'ok', res);
      } else done('Round ' + r.n + ': the results were replaced with the newer file.', 'ok', res);
    });
  }

  /* The server calls the first race just Race; the site always says Race 1, Race 2, Race 3. */
  function sessionLabel(name) {
    var m = /^race\s*(\d*)$/i.exec(String(name || '').trim());
    if (m) return 'Race ' + (Number(m[1]) || 1);
    return /^qualify$/i.test(String(name)) ? 'Qualifying' : String(name);
  }
  function sessionTable(session, rows, carNodes) {
    return RR.table([
      { key: 'pos', label: 'Pos' }, { key: 'driver', label: 'Driver' }, { key: 'car', label: 'Car' },
      { key: 'start', label: 'Start', num: true }, { key: 'laps', label: 'Laps', num: true },
      { key: 'best', label: 'Best lap', num: true }, { key: 'total', label: 'Time', num: true },
      { key: 'finish', label: 'Status' }, { key: 'inc', label: 'Inc', num: true }, { key: 'invalid', label: 'Invalid', num: true }
    ], rows.map(function (x) {
      var car = el('span', '', 'Car ' + x.carId);
      carNodes.push([car, x]);
      return { cells: { pos: RR.pos(Number(x.pos)), driver: RR.cell(x.name), car: car, start: x.start === '' ? '-' : x.start,
        laps: x.laps, best: RR.lap(Number(x.best) || 0), total: RR.raceTime(Number(x.total) || 0), finish: x.finish || '-',
        inc: x.inc, invalid: x.invalid } };
    }), 'Nobody is in this session.');
  }

  function reviewPanel() {
    var r = review.round, box = el('div', 'rr-panel rr-stack');
    box.appendChild(RR.heading('Round ' + r.n + ' · ' + r.track + ' ' + r.layout));
    if (review.busy) { box.appendChild(RR.notice('Reading the file...', 'ok')); return box; }
    if (review.failed) { box.appendChild(RR.notice(review.error, 'warn')); box.appendChild(RR.row(RR.button('Close', function () { review = null; draw(); }))); return box; }
    var p = review.preview, f = p.file;
    box.appendChild(RR.row(RR.kv('Server name', f.serverName), RR.kv('Received', dmy(f.received)), RR.kv('Sessions', f.sessions || '-'),
      RR.kv('Drivers', f.drivers === '' ? '-' : f.drivers)));
    box.appendChild(el('p', 'rr-body', review.held
      ? 'This round is already live. This is a different file for it. Nothing changes until you confirm it.'
      : 'These results are waiting for you. Nothing about them is public until you confirm. The order shown is the one the server sent.'));
    if (!review.held) {
      box.appendChild(el('p', 'rr-body', 'Protests close ' + dmy(p.protestEnds) + ', 12 hours after the round’s scheduled start' +
        (p.fromSchedule ? '.' : '. This round has no usable schedule, so that would count 12 hours from now.')));
    }
    var carNodes = [], order = [];
    p.rows.forEach(function (x) { if (order.indexOf(x.session) < 0) order.push(x.session); });
    order.forEach(function (s) {
      box.appendChild(el('h3', 'rr-card-title', sessionLabel(s)));
      box.appendChild(sessionTable(s, p.rows.filter(function (x) { return x.session === s; }), carNodes));
    });
    if (RR.images) RR.images.ready().then(function () {
      carNodes.forEach(function (pair) {
        var i = RR.images.info('livery', pair[1].liveryId);
        if (i && i.car && i.car.name) pair[0].textContent = i.car.name;
      });
    });
    var yes = RR.button(review.held ? 'Use this file' : 'Confirm results', null, false);
    RR.arm(yes, '', review.held ? 'Confirm: replace the live results' : 'Confirm: make these results live', function () { decide('confirmRound', r, review.fingerprint); });
    var no = RR.button('Deny', null, false);
    RR.arm(no, '', 'Confirm deny: the file is kept but never used', function () { decide('denyRound', r, review.fingerprint); });
    box.appendChild(RR.row(yes, no, RR.button('Close', function () { review = null; draw(); })));
    return box;
  }

  /* ---------------- The page ---------------- */
  function draw() {
    view.textContent = '';
    var refresh = RR.button(busy ? 'Reading...' : 'Refresh', load);
    if (busy) refresh.disabled = true;
    var publish = RR.button('Publish site data', function () {
      RR.api('publishSite').then(function (r) {
        message = r && r.ok ? { text: r.unchanged ? 'The website data is already up to date.' : 'The website data was updated. GitHub Pages shows it in 1 to 2 minutes.', kind: 'ok' }
          : { text: 'Not published. ' + ((r && r.error) || 'Try again.'), kind: 'warn' };
        draw();
      });
    });
    var box = add(el('div', 'rr-panel rr-stack'), RR.heading('Rounds'),
      el('p', 'rr-body', 'Results the server sends wait here. Look at a round, then confirm or deny it. Nothing is public until you confirm.'));
    if (failed) box.appendChild(RR.notice('Could not reach the Sheet. Try again.', 'warn'));
    else if (data === null) box.appendChild(RR.notice('Reading the Sheet...', 'ok'));
    else if (!data.seasons.length) box.appendChild(RR.empty('No seasons are saved in the Sheet yet. Save one from the Season Wizard.'));
    else {
      var pick = RR.select('Season', data.seasons.map(function (s) { return [s.seasonId, s.name + (s.status ? ' (' + s.status + ')' : '')]; }),
        function (v) { seasonId = v; review = null; message = null; draw(); }, seasonId);
      box.appendChild(RR.row(pick, refresh, publish));
      if (message) box.appendChild(RR.notice(message.text, message.kind));
      var rounds = data.rounds.filter(function (r) { return r.season === seasonId; });
      var thisSeason = data.seasons.filter(function (x) { return x.seasonId === seasonId; })[0] || {};
      box.appendChild(RR.table([
        { key: 'n', label: 'Round' }, { key: 'track', label: 'Track' }, { key: 'date', label: 'Scheduled', sorted: true },
        { key: 'status', label: 'Status' }, { key: 'act', label: '' }
      ], rounds.map(function (r) {
        var st = statusOf(r), act = el('span', 'rr-form-row');
        if (r.waiting || r.held) act.appendChild(RR.button('Review', function () { openReview(r); }));
        else if (r.status === 'Scheduled') act.appendChild(cancelButton(r, true));
        else if (r.status === 'Cancelled') act.appendChild(cancelButton(r, false));
        return { cells: { n: 'Round ' + r.n, track: RR.cell(r.track, r.layout), date: RR.cell(dmy(r.date), (r.time ? r.time + ' ' : '') + r.zone),
          status: RR.cell(el('span', st[1], st[0]), st[2]), act: act } };
      }), 'This season has no rounds.'));
    }
    view.appendChild(box);
    if (review) view.appendChild(reviewPanel());
  }

  draw();
  load();
})();
