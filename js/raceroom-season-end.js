/* Race Club admin: Results page, the "Season" tab.
   End season: fixes one champion per class from the official standings, sets the season to Finished and writes the season recap story
   (about a minute). It will not end a season while a round waits for your decision or a protest is open. A season with rounds not raced yet is
   ended only after you confirm that. Reopen season undoes it (champions cleared, the recap story withdrawn).
   Clear test data empties the results, protests, penalties, stories, news posts, seasons and rounds so the first real season starts clean.
   It needs the word CLEAR typed first and keeps the admins, the drivers' own settings and the website options.
   Read when the tab opens and after a change made here (never on a timer). Built only from the shared builders in raceroom-shell.js (RR.*). */
(function () {
  'use strict';
  var RR = window.RR;
  var el = RR.el, add = RR.add;
  var view = RR.view('season');

  var data = null, busy = false, failed = false, seasonId = '', message = null, word = '', writing = false;

  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function problem(res) {
    var e = res && res.error;
    if (e === 'results-waiting') return 'A round has results waiting for your decision. Confirm or deny them on the Rounds tab first.';
    if (e === 'protests-open') return 'A protest is still open. Rule on it on the Stewarding page first.';
    if (e === 'window-open') return 'A round\'s protest window is still open. End the season after it has closed.';
    if (e === 'no-rounds') return 'No round of this season has live results yet.';
    if (e === 'rounds-left') return 'Some rounds were not raced. Use the button again to end the season anyway.';
    if (e === 'already-ended') return 'This season is already ended.';
    if (e === 'not-ended') return 'This season is not ended.';
    if (e === 'word') return 'Type the word CLEAR first.';
    return 'Could not do that. Try again.';
  }
  function publishNote(res) {
    if (!res || res.published === undefined) return '';
    if (res.published) return ' The website data was updated; GitHub Pages shows it in 1 to 2 minutes.';
    return res.publishError ? ' The website data was NOT updated: ' + res.publishError : ' The website data was not updated because GitHub is not set up yet.';
  }
  function done(text, res, kind) {
    message = { text: text + publishNote(res), kind: res && res.published === false && res.publishError ? 'warn' : (kind || 'ok') };
    writing = false;
    load();
  }
  function fail(res) { message = { text: problem(res), kind: 'warn' }; writing = false; draw(); }

  function load() {
    if (busy) return;
    busy = true; failed = false; draw();
    RR.api('getSeasonEnd', { seasonId: seasonId }).then(function (res) {
      busy = false;
      if (res && res.ok) { data = res; seasonId = res.seasonId; } else failed = true;
      draw();
    });
  }

  function storyLine(story) {
    if (!story) return 'Not written';
    if (story.status === 'published') return 'Published';
    if (story.status === 'writing') return 'Being written';
    return 'Failed' + (story.error ? ': ' + story.error : '');
  }

  function endButtons(s) {
    var out = [];
    if (s.status === 'Finished') {
      var re = RR.button('Reopen season', null, false);
      RR.arm(re, '', 'Confirm reopen: the champions are cleared and the recap story is withdrawn', function () {
        RR.api('reopenSeason', { seasonId: s.seasonId }).then(function (res) {
          if (res && res.ok) done('The season was reopened.', res); else fail(res);
        });
      });
      out.push(re);
      if (!data.story || data.story.status !== 'published') {
        var wr = RR.button(data.story ? 'Retry recap story' : 'Write recap story', null, false);
        RR.arm(wr, '', 'Confirm: write the season recap (about a minute)', function () {
          writing = true;
          message = { text: 'Writing the season recap. This takes about a minute.', kind: 'ok' };
          draw();
          RR.api('writeStory', { kind: 'finale', seasonId: s.seasonId, roundId: '' }).then(function (res) {
            if (res && res.ok) done('The season recap was written.', res);
            else { writing = false; message = { text: 'The recap could not be written: ' + ((res && res.story && res.story.error) || (res && res.error) || 'unknown reason') + ' Use Retry recap story.', kind: 'warn' }; draw(); }
          });
        });
        wr.disabled = writing;
        out.push(wr);
      }
      return out;
    }
    var end = RR.button('End season', null, true), left = s.notRun;
    RR.arm(end, '', left ? 'Confirm: end the season with ' + plural(left, 'round', 'rounds') + ' not raced' : 'Confirm: end the season and write the recap', function () {
      writing = true;
      message = { text: 'Ending the season and writing the recap. This takes about a minute.', kind: 'ok' };
      draw();
      RR.api('endSeason', { seasonId: s.seasonId, allowUnfinished: true }).then(function (res) {
        if (!(res && res.ok)) { fail(res); return; }
        var st = res.story;
        if (st && st.ok === false) done('The season is ended and the champions are set, but the recap story could not be written: ' + (st.error || 'unknown reason') + ' Use Retry recap story.', res, 'warn');
        else done('The season is ended. The champions are set and the recap story is written.', res);
      });
    }, function () {
      if (s.blockers.length) { fail({ error: s.blockers[0] }); return false; }
      return true;
    });
    end.disabled = writing;
    out.push(end);
    return out;
  }

  function seasonPanel() {
    var s = data.season, box = el('div', 'rr-stack');
    box.appendChild(RR.row(RR.kv('Status', s.status === 'Finished' ? 'Finished' + (s.ended ? ' ' + s.ended : '') : s.status || '-'),
      RR.kv('Rounds run', s.live + ' of ' + s.total + (s.cancelled ? ' (' + plural(s.cancelled, 'cancelled', 'cancelled') + ')' : '')),
      RR.kv('Waiting for your decision', String(s.waiting)), RR.kv('Open protests', String(s.openProtests))));
    s.blockers.forEach(function (b) { if (s.status !== 'Finished') box.appendChild(RR.notice(problem({ error: b }), 'warn')); });
    if (s.status !== 'Finished' && s.notRun > 0 && !s.blockers.length) box.appendChild(RR.notice(plural(s.notRun, 'round has', 'rounds have') + ' not been raced. You can still end the season; those rounds stay as they are.', 'ok'));
    box.appendChild(RR.heading(s.status === 'Finished' ? 'Champions' : 'Champions if the season ended now'));
    box.appendChild(RR.table([
      { key: 'cls', label: 'Class' }, { key: 'who', label: 'Champion' }, { key: 'pts', label: 'Points', num: true, sorted: true }, { key: 'wins', label: 'Wins', num: true },
      { key: 'second', label: 'Runner-up' }, { key: 'gap', label: 'Margin', num: true }
    ], (data.champions || []).map(function (c) {
      return { cells: { cls: c.className, who: c.name, pts: String(c.points), wins: String(c.wins), second: c.runnerUp || '-', gap: c.runnerUp ? '+' + c.margin : '-' } };
    }), 'No class has a result yet.'));
    box.appendChild(RR.row(RR.kv('Season recap story', storyLine(data.story)),
      RR.kv('Where to change it', data.story && data.story.status === 'published' ? 'News Editor' : '-')));
    box.appendChild(RR.row.apply(null, endButtons(s)));
    return box;
  }

  function clearPanel() {
    var box = add(el('div', 'rr-panel rr-stack'), RR.heading('Clear test data'),
      el('p', 'rr-body', 'Empties the results, laps, posted files, protests, penalties, stories, news posts, seasons and rounds, so the first real season starts clean. Kept: the admins, the log, the drivers’ own settings (Hide details, blacklist) and the website options. This cannot be undone.'));
    var go = RR.button('Clear test data', null, true);
    function unlocked() { return String(word).trim() === (data && data.clearWord || 'CLEAR'); }
    /* The button stays greyed out and cannot be pressed until the word is typed. */
    function lock() { go.disabled = !unlocked(); }
    box.appendChild(RR.input({ label: 'Type CLEAR to unlock the button', value: word, onChange: function (v) { word = v; lock(); } }));
    RR.arm(go, '', 'Confirm: empty all test data now', function () {
      RR.api('clearTestData', { word: word }).then(function (res) {
        if (res && res.ok) { word = ''; seasonId = ''; done('Test data cleared.', res); } else fail(res);
      });
    }, function () {
      if (!unlocked()) { fail({ error: 'word' }); return false; }
      return true;
    });
    lock();
    box.appendChild(RR.row(go));
    return box;
  }

  function draw() {
    view.textContent = '';
    var refresh = RR.button(busy ? 'Reading...' : 'Refresh', load);
    if (busy) refresh.disabled = true;
    var box = add(el('div', 'rr-panel rr-stack'), RR.heading('Season'),
      el('p', 'rr-body', 'When the last round is done, end the season here. It names the champion of every class, marks the season Finished and writes the season recap, which you can edit in the News Editor.'));
    if (failed) box.appendChild(RR.notice('Could not reach the Sheet. Try again.', 'warn'));
    else if (data === null) box.appendChild(RR.notice('Reading the Sheet...', 'ok'));
    else if (!data.seasons.length) box.appendChild(RR.empty('No seasons are saved in the Sheet yet. Save one from the Season Wizard.'));
    else {
      var pick = RR.select('Season', data.seasons.map(function (s) { return [s.seasonId, s.name + (s.status ? ' (' + s.status + ')' : '')]; }),
        function (v) { seasonId = v; message = null; load(); }, seasonId);
      box.appendChild(RR.row(pick, refresh));
      if (message) box.appendChild(RR.notice(message.text, message.kind));
      if (data.season) box.appendChild(seasonPanel());
    }
    view.appendChild(box);
    if (data !== null || failed) view.appendChild(clearPanel());
  }

  draw();
  load();
})();
