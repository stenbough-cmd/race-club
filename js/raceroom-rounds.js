/* Race Club admin: League Management, the "Rounds" tab.
   Shows every round of a season. When the RaceRoom server (or a hand upload) has sent results for a round, nothing about
   them is public until you Confirm them here. Review shows what the file says; Confirm makes the results live, Deny keeps the
   file but never uses it. A newer file for a round that is already live waits here too and changes nothing until you confirm it.
   A round with no results can be cancelled (and restored). Both Confirm and Deny use the two-click button.
   Stories: Confirm also writes the round's story (about a minute) once the results are live. The Story button of a round opens its notes
   (rivalries between drivers who raced, a short note for the writer) and up to 3 photos with captions, with a Hero tick and a Use a track photo tick; a failed story shows Retry story,
   a written one can be rewritten. The Season preview is written when a season is saved for the first time and is retried here too.
   The list is read when the page opens and after a change made here (never on a timer).
   Built only from the shared builders in raceroom-shell.js (RR.*). */
(function () {
  'use strict';
  var RR = window.RR;
  var el = RR.el, add = RR.add;
  var view = RR.view('rounds');

  var data = null, busy = false, failed = false, seasonId = '', review = null, message = null, panel = null, writing = false;

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
  function storyState(s) {
    if (!s) return ['-', '', ''];
    if (s.hidden === 'deleted') return ['Deleted', 'rr-status-bad', s.title];
    if (s.hidden === 'withdrawn') return ['Withdrawn', 'rr-status-bad', s.title];
    if (s.status === 'published') return ['Written', 'rr-status-ok', s.title];
    if (s.status === 'writing') return ['Writing...', '', ''];
    return ['Failed', 'rr-status-bad', (s.error || '').slice(0, 140)];
  }
  function storyDone(res, label) {
    var st = res && res.story;
    if (!st) return '';
    if (st.already) return '';
    return st.ok ? ' The ' + label + ' was written.' : ' The ' + label + ' could not be written: ' + (st.error || 'unknown reason') + ' Use Retry story.';
  }
  /* Write, retry or rewrite a story. Takes about a minute: the page says so and waits. */
  function writeStory(opts, label, rewrite) {
    writing = true;
    message = { text: 'Writing the ' + label + '. This takes about a minute.', kind: 'ok' };
    draw();
    RR.api('writeStory', { kind: opts.kind, seasonId: opts.seasonId || '', roundId: opts.roundId || '', rewrite: !!rewrite }).then(function (res) {
      writing = false;
      if (res && res.ok) done((rewrite ? 'The ' + label + ' was rewritten.' : 'The ' + label + ' was written.'), 'ok', res);
      else done('The ' + label + ' could not be written: ' + ((res && res.story && res.story.error) || problem(res)), 'warn', res);
    });
  }
  function storyButtons(opts, label, s) {
    var out = [];
    if (s && s.status === 'failed') {
      var retry = RR.button('Retry story', null, false);
      RR.arm(retry, '', 'Confirm retry story', function () { writeStory(opts, label, false); });
      retry.disabled = writing;
      out.push(retry);
    } else if (!s) {
      var first = RR.button('Write story', null, false);
      RR.arm(first, '', 'Confirm write story', function () { writeStory(opts, label, false); });
      first.disabled = writing;
      out.push(first);
    } else if (s.status === 'published') {
      var again = RR.button('Rewrite story', null, false);
      RR.arm(again, '', 'Confirm rewrite story', function () { writeStory(opts, label, true); });
      again.disabled = writing;
      out.push(again);
    }
    return out;
  }

  /* A photo from the computer: at most 1600 pixels wide, JPEG, small enough to send. Resolves to the base64 text. */
  function shrink(file) {
    return new Promise(function (ok, bad) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var w = Math.min(1600, img.naturalWidth), h = Math.round(img.naturalHeight * w / img.naturalWidth);
        var c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        var data = '', q = [0.85, 0.7, 0.55];
        for (var i = 0; i < q.length; i++) {
          data = c.toDataURL('image/jpeg', q[i]).replace(/^data:image\/jpeg;base64,/, '');
          if (data.length < 1300000) break;
        }
        data.length < 1300000 ? ok(data) : bad();
      };
      img.onerror = function () { URL.revokeObjectURL(url); bad(); };
      img.src = url;
    });
  }

  function openPanel(r) {
    var riv = [['', ''], ['', ''], ['', '']];
    (r.rivalries || []).slice(0, 3).forEach(function (p, i) { riv[i] = [String(p[0]), String(p[1])]; });
    panel = { roundId: r.id, rivals: riv, note: r.note || '', choice: { hero: (r.photoChoice && r.photoChoice.hero) || '', track: r.photoChoice ? r.photoChoice.track : undefined }, caps: [0, 1, 2].map(function (i) { return (r.photos && r.photos[i] && r.photos[i].caption) || ''; }) };
    message = null; review = null;
    draw();
  }
  function panelFail(res) {
    var e = res && res.error;
    message = { text: e === 'bad-photo' ? 'That picture could not be used. Try another one.' : e === 'github' ? 'The picture could not be saved: ' + (res.detail || 'GitHub refused it.') : problem(res), kind: 'warn' };
    draw();
  }
  function photoSlot(r, i) {
    var p = r.photos && r.photos[i], row = el('div', 'rr-story-photo');
    row.appendChild(p && p.src ? add(el('span', 'rr-story-thumb'), (function () { var im = el('img'); im.src = p.src; im.alt = ''; return im; })()) : el('span', 'rr-story-thumb rr-story-empty', 'Empty'));
    row.appendChild(RR.input({ label: 'Photo ' + (i + 1) + ' caption', value: panel.caps[i], wide: true, onChange: function (v) { panel.caps[i] = v; } }));
    var pick = document.createElement('input');
    pick.type = 'file'; pick.accept = 'image/*'; pick.hidden = true;
    pick.addEventListener('change', function () {
      var f = pick.files && pick.files[0];
      if (!f) return;
      message = { text: 'Saving photo ' + (i + 1) + '...', kind: 'ok' };
      draw();
      shrink(f).then(function (data) {
        RR.api('saveRoundPhoto', { roundId: r.id, slot: i + 1, caption: panel.caps[i], data: data }).then(function (res) {
          if (res && res.ok) { message = { text: 'Photo ' + (i + 1) + ' saved.', kind: 'ok' }; load(); } else panelFail(res);
        });
      }, function () { message = { text: 'That file is not a picture this page can use.', kind: 'warn' }; draw(); });
    });
    row.appendChild(RR.button(p && p.src ? 'Change photo' : 'Choose photo', function () { pick.click(); }));
    if (p && p.src) {
      row.appendChild(RR.button('Save caption', function () {
        RR.api('saveRoundPhoto', { roundId: r.id, slot: i + 1, caption: panel.caps[i] }).then(function (res) {
          if (res && res.ok) { message = { text: 'Caption saved.', kind: 'ok' }; load(); } else panelFail(res);
        });
      }, true));
      var rm = RR.button('Remove', null, false);
      RR.arm(rm, '', 'Confirm remove photo', function () {
        RR.api('saveRoundPhoto', { roundId: r.id, slot: i + 1, remove: true }).then(function (res) {
          if (res && res.ok) { panel.caps[i] = ''; message = { text: 'Photo ' + (i + 1) + ' removed.', kind: 'ok' }; load(); } else panelFail(res);
        });
      });
      row.appendChild(rm);
    }
    row.appendChild(pick);
    return row;
  }
  /* Which pictures the story uses is the organizer's choice. Uploaded pictures are always used. The track picture is used when ticked
     (ticked for you when nothing is uploaded). A story has at most 3 pictures, so with 3 uploaded there is no room for the track picture.
     The hero is the picture that opens the story: the one ticked, else the track picture when used, else the first upload. */
  function pictureState(r) {
    var ups = [0, 1, 2].filter(function (i) { return r.photos && r.photos[i] && r.photos[i].src; });
    var track = ups.length >= 3 ? false : (panel.choice.track === undefined ? ups.length === 0 : !!panel.choice.track);
    var used = ups.map(function (i) { return String(i + 1); }).concat(track ? ['track'] : []);
    var hero = used.indexOf(panel.choice.hero) >= 0 ? panel.choice.hero : (track ? 'track' : (used[0] || ''));
    return { ups: ups, track: track, hero: hero, full: ups.length >= 3 };
  }
  function pictureChoices(r) {
    var ps = pictureState(r), box = el('div', 'rr-stack');
    var rows = [];
    ps.ups.forEach(function (i) {
      rows.push(RR.row(el('span', 'rr-body', 'Photo ' + (i + 1)), RR.checkbox('Hero (opens the story)', function (on) { panel.choice.hero = on ? String(i + 1) : ''; draw(); }, ps.hero === String(i + 1))));
    });
    var trackBox = RR.checkbox('Use a track photo', function (on) { panel.choice.track = on; if (!on && panel.choice.hero === 'track') panel.choice.hero = ''; draw(); }, ps.track);
    if (ps.full) trackBox.querySelector('input').disabled = true;
    rows.push(RR.row(trackBox, ps.track ? RR.checkbox('Hero (opens the story)', function (on) { panel.choice.hero = on ? 'track' : ''; draw(); }, ps.hero === 'track') : null));
    rows.forEach(function (x) { box.appendChild(x); });
    box.appendChild(el('p', 'rr-body', ps.full ? 'Three of your photos are used, which is the most a story has, so there is no room for a track photo.' :
      (ps.ups.length || panel.choice.track !== undefined ? 'The story uses the pictures ticked here. The writer only decides where each one sits among the paragraphs.' : 'Nothing is chosen yet, so the story opens with a picture of the track.')));
    box.appendChild(RR.row(RR.button('Save picture choices', function () {
      var send = { roundId: r.id, hero: panel.choice.hero };
      if (panel.choice.track !== undefined) send.track = panel.choice.track;
      RR.api('savePhotoChoice', send).then(function (res) {
        if (res && res.ok) { message = { text: 'Picture choices saved. They are used the next time the story is written or rewritten.', kind: 'ok' }; load(); } else panelFail(res);
      });
    }, true)));
    return box;
  }
  function storyPanel() {
    var r = data.rounds.filter(function (x) { return x.id === panel.roundId; })[0];
    if (!r) { panel = null; return null; }
    var box = el('div', 'rr-panel rr-stack'), st = storyState(r.story);
    box.appendChild(RR.heading('Round ' + r.n + ' story · ' + r.track + ' ' + r.layout));
    box.appendChild(RR.row(RR.kv('Story', st[0]), st[2] ? RR.kv(r.story && r.story.status === 'failed' ? 'Reason' : 'Title', st[2]) : null));
    var btns = storyButtons({ kind: 'race', roundId: r.id }, 'story', r.story);
    if (btns.length && (r.status === 'Provisional' || r.status === 'Final')) box.appendChild(RR.row.apply(null, btns));
    else if (btns.length) box.appendChild(el('p', 'rr-body', 'The story is written when you confirm the results.'));
    box.appendChild(el('h3', 'rr-card-title', 'Notes for the writer'));
    box.appendChild(el('p', 'rr-body', 'The writer treats these as true. A rivalry only shows up if the race gives it a way in. The note is never quoted.'));
    if (!r.drivers || !r.drivers.length) box.appendChild(el('p', 'rr-body', 'Rivalries can be picked once the round’s results have arrived.'));
    else {
      var opts = [['', '-']].concat(r.drivers.map(function (d) { return [d.id, d.name]; }));
      panel.rivals.forEach(function (pair, i) {
        box.appendChild(RR.row(
          RR.select('Rivalry ' + (i + 1) + ': driver', opts, function (v) { pair[0] = v; }, pair[0]),
          RR.select('and driver', opts, function (v) { pair[1] = v; }, pair[1])));
      });
    }
    box.appendChild(RR.textarea({ label: 'Note (up to 500 characters)', value: panel.note, onChange: function (v) { panel.note = v.slice(0, 500); } }));
    box.appendChild(RR.row(RR.button('Save notes', function () {
      var riv = panel.rivals.filter(function (p) { return p[0] && p[1] && p[0] !== p[1]; });
      RR.api('saveRoundNotes', { roundId: r.id, rivalries: riv, note: panel.note }).then(function (res) {
        if (res && res.ok) { message = { text: 'Notes saved.', kind: 'ok' }; load(); } else panelFail(res);
      });
    }, true)));
    box.appendChild(el('h3', 'rr-card-title', 'Photos'));
    box.appendChild(el('p', 'rr-body', 'Up to 3 photos with a caption each. You decide which pictures are used and which one opens the story; the writer only places them among the paragraphs from their captions. If you choose nothing, the story uses a picture of the track.'));
    for (var i = 0; i < 3; i++) box.appendChild(photoSlot(r, i));
    box.appendChild(pictureChoices(r));
    box.appendChild(RR.row(RR.button('Close', function () { panel = null; draw(); })));
    return box;
  }

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
          (res.newDrivers ? ' ' + plural(res.newDrivers, 'new driver was', 'new drivers were') + ' added.' : '') + storyDone(res, 'story'), res.story && !res.story.ok ? 'warn' : 'ok', res);
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
      var thisSeason = data.seasons.filter(function (x) { return x.seasonId === seasonId; })[0] || {}, pv = storyState(thisSeason.preview);
      box.appendChild(RR.row(RR.kv('Season preview', pv[0] + (pv[2] ? ' · ' + pv[2] : '')),
        RR.row.apply(null, storyButtons({ kind: 'preview', seasonId: seasonId }, 'season preview', thisSeason.preview))));
      box.appendChild(RR.table([
        { key: 'n', label: 'Round' }, { key: 'track', label: 'Track' }, { key: 'date', label: 'Scheduled', sorted: true },
        { key: 'status', label: 'Status' }, { key: 'story', label: 'Story' }, { key: 'act', label: '' }
      ], rounds.map(function (r) {
        var st = statusOf(r), act = el('span', 'rr-form-row');
        if (r.waiting || r.held) act.appendChild(RR.button('Review', function () { openReview(r); }));
        else if (r.status === 'Scheduled') act.appendChild(cancelButton(r, true));
        else if (r.status === 'Cancelled') act.appendChild(cancelButton(r, false));
        var sy = storyState(r.story);
        if (r.status !== 'Cancelled') act.appendChild(RR.button('Story', function () { openPanel(r); }));
        if (r.story && r.story.status === 'failed' && (r.status === 'Provisional' || r.status === 'Final')) storyButtons({ kind: 'race', roundId: r.id }, 'story', r.story).forEach(function (b) { act.appendChild(b); });
        return { cells: { n: 'Round ' + r.n, track: RR.cell(r.track, r.layout), date: RR.cell(dmy(r.date), (r.time ? r.time + ' ' : '') + r.zone),
          status: RR.cell(el('span', st[1], st[0]), st[2]), story: RR.cell(el('span', sy[1], sy[0]), sy[2]), act: act } };
      }), 'This season has no rounds.'));
    }
    view.appendChild(box);
    if (review) view.appendChild(reviewPanel());
    else if (panel && data) { var sp = storyPanel(); if (sp) view.appendChild(sp); }
  }

  draw();
  load();
})();
