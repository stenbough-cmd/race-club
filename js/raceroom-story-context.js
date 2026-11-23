/* Race Club admin: News Editor, the "Story context" tab.
   Everything that shapes the AI stories lives here: for each round, Add context (notes for the writer: rivalries between drivers who raced, a short note, and up to 3 photos with captions,
   a Hero tick and a Use a track photo tick); the Season preview and the Season recap with their own Add context (a note and up to 3 photos, the first is the hero).
   A failed story shows Retry story, a written one can be rewritten (Rewrite story). Writing a story takes about a minute.
   The list is read when the page opens and after a change made here (never on a timer).
   Built only from the shared builders in raceroom-shell.js (RR.*). */
(function () {
  'use strict';
  var RR = window.RR;
  var el = RR.el, add = RR.add;
  var view = RR.view('context');

  var data = null, busy = false, failed = false, seasonId = '', message = null, panel = null, writing = false;

  function dmy(text) {
    var m = /^(\d{4})-(\d{2})-(\d{2})(.*)$/.exec(String(text || ''));
    return m ? m[3] + '.' + m[2] + '.' + m[1] + m[4] : String(text || '');
  }
  function problem(res) { return 'Could not do that. Try again.'; }
  function publishNote(res) {
    if (!res || res.published === undefined) return '';
    if (res.published) return ' The website data was updated; GitHub Pages shows it in 1 to 2 minutes.';
    return res.publishError ? ' The website data was NOT updated: ' + res.publishError : ' The website data was not updated because GitHub is not set up yet.';
  }
  /* After a picture changed: a story that is already written shows it right away, without being written again. */
  function picNote(res, text) {
    return text + (res && res.storyUpdated ? ' The written story now shows it (no rewrite needed).' : ' It is used when the story is written.') + publishNote(res);
  }
  function done(text, kind, res) {
    message = { text: text + publishNote(res), kind: res && res.published === false && res.publishError ? 'warn' : kind };
    load();
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
      } else failed = true;
      draw();
    });
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
      var again = RR.button('Rewrite story', null, false, 'redo');
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
    panel = { fresh: true, roundId: r.id, rivals: riv, note: r.note || '', choice: { hero: (r.photoChoice && r.photoChoice.hero) || '', track: r.photoChoice ? r.photoChoice.track : undefined }, caps: [0, 1, 2].map(function (i) { return (r.photos && r.photos[i] && r.photos[i].caption) || ''; }) };
    message = null;
    draw();
  }
  function panelFail(res) {
    var e = res && res.error;
    message = { text: e === 'bad-photo' ? 'That picture could not be used. Try another one.' : e === 'github' ? 'The picture could not be saved: ' + (res.detail || 'GitHub refused it.') : problem(res), kind: 'warn' };
    draw();
  }
  /* target (optional): where the picture is saved. Default is the round r; the season preview uses { action: 'saveSeasonContext', ids: { seasonId } }. */
  function photoSlot(r, i, target) {
    var act = target ? target.action : 'saveRoundPhoto', ids = target ? target.ids : { roundId: r.id };
    function send(extra) { var o = {}; Object.keys(ids).forEach(function (k) { o[k] = ids[k]; }); Object.keys(extra).forEach(function (k) { o[k] = extra[k]; }); return RR.api(act, o); }
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
        send({ slot: i + 1, caption: panel.caps[i], data: data }).then(function (res) {
          if (res && res.ok) { message = { text: picNote(res, 'Photo ' + (i + 1) + ' saved.'), kind: 'ok' }; load(); } else panelFail(res);
        });
      }, function () { message = { text: 'That file is not a picture this page can use.', kind: 'warn' }; draw(); });
    });
    row.appendChild(RR.button(p && p.src ? 'Change photo' : 'Choose photo', function () { pick.click(); }));
    if (p && p.src) {
      row.appendChild(RR.button('Save caption', function () {
        send({ slot: i + 1, caption: panel.caps[i] }).then(function (res) {
          if (res && res.ok) { message = { text: picNote(res, 'Caption saved.'), kind: 'ok' }; load(); } else panelFail(res);
        });
      }, true));
      var rm = RR.button('Remove', null, false);
      RR.arm(rm, '', 'Confirm remove photo', function () {
        send({ slot: i + 1, remove: true }).then(function (res) {
          if (res && res.ok) { panel.caps[i] = ''; message = { text: picNote(res, 'Photo ' + (i + 1) + ' removed.'), kind: 'ok' }; load(); } else panelFail(res);
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
        if (res && res.ok) { message = { text: picNote(res, 'Picture choices saved.'), kind: 'ok' }; load(); } else panelFail(res);
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
    box.appendChild(RR.row(RR.button('Close', function () { if (modal) modal.close(); })));
    return box;
  }

  /* Add context for the season preview: a note for the writer and up to 3 pictures. The first picture is the hero that opens the story. */
  function openSeasonPanel(s) {
    panel = { fresh: true, seasonId: s.seasonId, note: s.previewNote || '', caps: [0, 1, 2].map(function (i) { return (s.previewPhotos && s.previewPhotos[i] && s.previewPhotos[i].caption) || ''; }) };
    message = null;
    draw();
  }
  function seasonPanel() {
    var s = data.seasons.filter(function (x) { return x.seasonId === panel.seasonId; })[0];
    if (!s) { panel = null; return null; }
    var box = el('div', 'rr-panel rr-stack'), st = storyState(s.preview);
    box.appendChild(RR.heading('Season preview · ' + s.name));
    box.appendChild(RR.row(RR.kv('Story', st[0]), st[2] ? RR.kv(s.preview && s.preview.status === 'failed' ? 'Reason' : 'Title', st[2]) : null));
    box.appendChild(el('h3', 'rr-card-title', 'Notes for the writer'));
    box.appendChild(el('p', 'rr-body', 'Anything you want in the preview: what these cars mean to you, a story about the series, a detail about a venue or the season. The writer treats it as true and uses it in its own words, never quoted.'));
    box.appendChild(RR.textarea({ label: 'Note (up to 1500 characters)', value: panel.note, onChange: function (v) { panel.note = v.slice(0, 1500); } }));
    box.appendChild(RR.row(RR.button('Save note', function () {
      RR.api('saveSeasonContext', { seasonId: s.seasonId, note: panel.note }).then(function (res) {
        if (res && res.ok) { message = { text: 'Note saved. It is used the next time the preview is written or rewritten.', kind: 'ok' }; load(); } else panelFail(res);
      });
    }, true)));
    box.appendChild(el('h3', 'rr-card-title', 'Photos'));
    box.appendChild(el('p', 'rr-body', 'Up to 3 photos with a caption each, for example the cars racing. Photo 1 is the hero that opens the preview and is the picture on its News tile. Track pictures fill any empty places.'));
    var holder = { photos: s.previewPhotos || [] };
    for (var i = 0; i < 3; i++) box.appendChild(photoSlot(holder, i, { action: 'saveSeasonContext', ids: { seasonId: s.seasonId } }));
    box.appendChild(RR.row(RR.button('Close', function () { if (modal) modal.close(); })));
    return box;
  }


  /* ---------------- The popup: Add context opens in a window over the page ---------------- */
  var modal = null;
  function syncModal() {
    var sp = panel && data ? (panel.seasonId ? seasonPanel() : storyPanel()) : null;
    if (!sp) { if (modal) { var m = modal; modal = null; m.close(true); } return; }
    var keep = 0;
    if (modal) keep = modal.body.scrollTop;
    else modal = RR.modal('Add context', function () { modal = null; panel = null; });
    modal.body.textContent = '';
    if (message) modal.body.appendChild(RR.notice(message.text, message.kind));   /* the list under the window is covered, so the result shows here */
    modal.body.appendChild(sp);
    modal.body.scrollTop = keep;
  }

  /* ---------------- The tab ---------------- */
  function draw() {
    view.textContent = '';
    var refresh = RR.button(busy ? 'Reading...' : 'Refresh', load);
    if (busy) refresh.disabled = true;
    var box = add(el('div', 'rr-panel rr-stack'), RR.heading('Story context'),
      el('p', 'rr-body', 'Add notes and photos for the AI stories, and write, retry or rewrite them. A race story is written when you confirm the round (Results, Rounds). The preview is written when the season is created and the recap when it ends.'));
    if (failed) box.appendChild(RR.notice('Could not reach the Sheet. Try again.', 'warn'));
    else if (data === null) box.appendChild(RR.notice('Reading the Sheet...', 'ok'));
    else if (!data.seasons.length) box.appendChild(RR.empty('No seasons are created yet. Create one from the Season Wizard.'));
    else {
      var pick = RR.select('Season', data.seasons.map(function (s) { return [s.seasonId, s.name + (s.status ? ' (' + s.status + ')' : '')]; }),
        function (v) { seasonId = v; message = null; panel = null; draw(); }, seasonId);
      box.appendChild(RR.row(pick, refresh));
      if (message) box.appendChild(RR.notice(message.text, message.kind));
      var rounds = data.rounds.filter(function (r) { return r.season === seasonId; });
      var thisSeason = data.seasons.filter(function (x) { return x.seasonId === seasonId; })[0] || {};
      var pv = storyState(thisSeason.preview), rc = storyState(thisSeason.finale), ended = thisSeason.status === 'Finished';
      box.appendChild(RR.heading('Season preview and recap'));
      box.appendChild(RR.table([
        { key: 'what', label: 'Story' }, { key: 'when', label: 'Written when' }, { key: 'status', label: 'Status' }, { key: 'act', label: '' }
      ], [
        { cells: { what: RR.cell('Season preview', 'Before the first race'), when: 'When the season is created',
          status: RR.cell(el('span', pv[1], pv[0]), pv[2]), act: RR.row.apply(null, [RR.button('Add context', function () { openSeasonPanel(thisSeason); })].concat(storyButtons({ kind: 'preview', seasonId: seasonId }, 'season preview', thisSeason.preview))) } },
        { cells: { what: RR.cell('Season recap', 'Champions of every class'), when: 'When the season ends',
          status: RR.cell(el('span', rc[1], rc[0]), rc[2]), act: ended || thisSeason.finale ? RR.row.apply(null, storyButtons({ kind: 'finale', seasonId: seasonId }, 'season recap', thisSeason.finale)) : el('span', 'rr-body', 'Ends with the season') } }
      ], ''));
      box.appendChild(RR.heading('Round stories'));
      box.appendChild(RR.table([
        { key: 'n', label: 'Round' }, { key: 'track', label: 'Track' }, { key: 'date', label: 'Scheduled', sorted: true }, { key: 'story', label: 'Story' }, { key: 'act', label: '' }
      ], rounds.map(function (r) {
        var act = el('span', 'rr-form-row'), sy = storyState(r.story);
        if (r.status !== 'Cancelled') act.appendChild(RR.button('Add context', function () { openPanel(r); }));
        if (r.story && r.story.status === 'failed' && (r.status === 'Provisional' || r.status === 'Final')) storyButtons({ kind: 'race', roundId: r.id }, 'story', r.story).forEach(function (b) { act.appendChild(b); });
        return { cells: { n: 'Round ' + r.n, track: RR.cell(r.track, r.layout), date: RR.cell(dmy(r.date), (r.time ? r.time + ' ' : '') + r.zone),
          story: RR.cell(el('span', sy[1], sy[0]), sy[2]), act: act } };
      }), 'This season has no rounds.'));
    }
    view.appendChild(box);
    syncModal();
  }

  draw();
  load();
})();
