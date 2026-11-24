/* Race Club admin: Stewarding.
   Protests tab: every protest of a season (filed with the round password on the public Protest page). Open one to read it, then dismiss
   it or give 1, 3 or 5 points, or a DSQ (a DSQ needs a comment). Penalties given in the game are final; this is only for what the game
   cannot see. The filer's own words are shown here and are never public. Everything else, including your comment, is public.
   A ruling can be reopened: the penalty is cancelled by a new record, the old one stays on the Penalties tab.
   Car and class tab: a driver who raced in another car or class than the one they first raced in the season. This is checked as soon as
   a results file is uploaded (waiting rounds included), and the tab shows a red exclamation until every one is decided. Points only ever count
   in the first class, so results in another class are left out automatically; you decide whether to DSQ the night (needs a comment) or leave it.
   Protests and car and class changes are read together in one request when the page opens and after a change made here (never on a timer).
   Built only from the shared builders in raceroom-shell.js (RR.*). */
(function () {
  'use strict';
  var RR = window.RR;
  var el = RR.el, add = RR.add;
  var viewP = RR.view('protests'), viewF = RR.view('policy');

  var data = null, busy = false, failed = false, seasonId = '', message = null, openId = '', openFlag = '', form = null;

  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function problem(res) {
    var e = res && res.error;
    if (e === 'comment-needed') return 'A DSQ needs a comment of at least 10 characters. It is shown publicly.';
    if (e === 'already-ruled') return 'This protest was already ruled on. Reopen it first.';
    if (e === 'already-decided') return 'This was already decided. Undo it first.';
    if (e === 'bad-penalty') return 'Choose what to do first.';
    return 'Could not do that. Try again.';
  }
  function publishNote(res) {
    if (!res || res.published === undefined) return '';
    if (res.published) return ' The website data was updated; GitHub Pages shows it in 1 to 2 minutes.';
    return res.publishError ? ' The website data was NOT updated: ' + res.publishError : ' The website data was not updated because GitHub is not set up yet.';
  }
  function done(text, res) {
    message = { text: text + publishNote(res), kind: res && res.published === false && res.publishError ? 'warn' : 'ok' };
    openId = ''; openFlag = ''; form = null;
    load();
  }

  function load() {
    if (busy) return;
    busy = true; failed = false; draw();
    RR.api('listStewarding', { seasonId: seasonId }).then(function (res) {
      busy = false;
      if (res && res.ok) {
        data = res; seasonId = res.seasonId;
        var open = res.protests.filter(function (p) { return p.status !== 'Ruled'; }).length;
        var flags = res.flags.filter(function (f) { return f.state === 'open'; }).length;
        RR.flagTabs([open ? 'protests' : '', flags ? 'policy' : ''].filter(function (x) { return x; }));
      } else failed = true;
      draw();
    });
  }

  function statusText(p) {
    if (p.status === 'Ruled') return p.outcome === 'Dismissed' ? 'Dismissed' : 'Penalty: ' + p.penaltyWords;
    return p.status === 'Reviewing' ? 'Reviewing' : 'Filed';
  }

  /* ---------------- Protests ---------------- */
  function ruleForm(p) {
    if (!form || form.id !== p.id) form = { id: p.id, choice: '', comment: '' };
    var box = el('div', 'rr-stack');
    box.appendChild(RR.select('Ruling', [['', 'Choose'], ['dismiss', 'Dismiss the protest'], ['1', '1 point (light, or a self report)'], ['3', '3 points (medium)'], ['5', '5 points (severe)'], ['dsq', 'DSQ for this race']],
      function (v) { form.choice = v; }, form.choice));
    box.appendChild(RR.textarea({ label: 'Your comment (shown publicly, up to 400 characters; needed for a DSQ)', value: form.comment, onChange: function (v) { form.comment = v.slice(0, 400); } }));
    var go = RR.button('Save ruling', null, false, 'steward');
    RR.arm(go, '', 'Confirm: save this ruling', function () {
      var c = form.choice;
      RR.api('ruleProtest', { protestId: p.id, outcome: c === 'dismiss' ? 'dismiss' : 'penalty', penalty: c === 'dismiss' ? '' : c, comment: form.comment }).then(function (res) {
        if (res && res.ok) done('Ruling saved for round ' + p.round + '.', res);
        else { message = { text: problem(res), kind: 'warn' }; draw(); }
      });
    }, function () {
      if (!form.choice) { message = { text: 'Choose what to do first.', kind: 'warn' }; draw(); return false; }
      if (form.choice === 'dsq' && form.comment.trim().length < 10) { message = { text: problem({ error: 'comment-needed' }), kind: 'warn' }; draw(); return false; }
      return true;
    });
    var row = [go];
    if (p.status === 'Filed') {
      row.push(RR.confirmButton('Mark as reviewing', 'Confirm: mark as reviewing', function () {
        RR.api('reviewProtest', { protestId: p.id }).then(function (res) {
          if (res && res.ok) { message = { text: 'Marked as reviewing.', kind: 'ok' }; load(); } else { message = { text: problem(res), kind: 'warn' }; draw(); }
        });
      }));
    }
    box.appendChild(RR.row.apply(null, row));
    return box;
  }

  function protestPanel(p) {
    var box = el('div', 'rr-panel rr-stack');
    box.appendChild(RR.heading('Round ' + p.round + ' · race ' + p.race + ' · lap ' + p.lap));
    box.appendChild(RR.row(RR.kv('Filed by', p.byName), RR.kv(p.self ? 'Hit' : 'Against', p.againstName), RR.kv('Reason', p.reason), RR.kv('Filed', p.filed || '-')));
    box.appendChild(RR.row(RR.kv('Status', statusText(p)), RR.kv('Penalty would land on', p.targetName)));
    if (p.self) box.appendChild(el('p', 'rr-body', 'This is a self report: the driver says they caused the contact. A penalty lands on the driver who filed it. You can raise it to a DSQ for intentional wrecking.'));
    box.appendChild(el('h3', 'rr-card-title', 'What the driver wrote'));
    box.appendChild(el('p', 'rr-body', p.narrative || '-'));
    box.appendChild(el('p', 'rr-body', 'Only you see this. It is never published.'));
    if (p.status === 'Ruled') {
      box.appendChild(RR.row(RR.kv('Ruled', (p.ruled || '-') + (p.ruledBy ? ' by ' + p.ruledBy : '')), RR.kv('Your comment', p.comment || '-')));
      var re = RR.button('Reopen', null, false);
      RR.arm(re, '', 'Confirm reopen: the penalty is cancelled and the protest is open again', function () {
        RR.api('reopenProtest', { protestId: p.id }).then(function (res) {
          if (res && res.ok) done('The protest was reopened.', res); else { message = { text: problem(res), kind: 'warn' }; draw(); }
        });
      });
      box.appendChild(RR.row(re));
    } else box.appendChild(ruleForm(p));
    if (p.history) {
      box.appendChild(el('h3', 'rr-card-title', 'History'));
      p.history.split('\n').forEach(function (line) { box.appendChild(el('p', 'rr-body', line)); });
    }
    box.appendChild(RR.row(RR.button('Close', function () { openId = ''; form = null; draw(); })));
    return box;
  }

  function drawProtests() {
    viewP.textContent = '';
    var refresh = RR.button(busy ? 'Reading...' : 'Refresh', load);
    if (busy) refresh.disabled = true;
    var box = add(el('div', 'rr-panel rr-stack'), RR.heading('Protests'),
      el('p', 'rr-body', 'Drivers file a protest on the Protest page with the round password, until 12 hours after the round’s scheduled start. Nothing in the game is changed by a ruling; points are taken off the season total.'));
    if (failed) box.appendChild(RR.notice('Could not reach the Sheet. Try again.', 'warn'));
    else if (data === null) box.appendChild(RR.notice('Reading the Sheet...', 'ok'));
    else if (!data.seasons.length) box.appendChild(RR.empty('No seasons are saved in the Sheet yet.'));
    else {
      var pick = RR.select('Season', data.seasons.map(function (s) { return [s.seasonId, s.name + (s.status ? ' (' + s.status + ')' : '')]; }),
        function (v) { seasonId = v; openId = ''; form = null; message = null; load(); }, seasonId);
      box.appendChild(RR.row(pick, refresh));
      if (message) box.appendChild(RR.notice(message.text, message.kind));
      var open = data.protests.filter(function (p) { return p.status !== 'Ruled'; }).length;
      box.appendChild(el('p', 'rr-body', open ? plural(open, 'protest is', 'protests are') + ' waiting for a ruling.' : 'No protest is waiting.'));
      box.appendChild(RR.table([
        { key: 'round', label: 'Round', sorted: true }, { key: 'race', label: 'Race', num: true }, { key: 'lap', label: 'Lap', num: true },
        { key: 'by', label: 'Filed by' }, { key: 'against', label: 'Against' }, { key: 'reason', label: 'Reason' }, { key: 'status', label: 'Status' }, { key: 'act', label: '' }
      ], data.protests.map(function (p) {
        var act = RR.button(p.status === 'Ruled' ? 'View' : 'Rule', function () { openId = p.id; form = null; message = null; draw(); });
        return { cells: { round: 'Round ' + p.round, race: p.race, lap: p.lap, by: p.byName, against: p.self ? RR.cell(p.againstName, 'self report') : p.againstName,
          reason: p.reason, status: statusText(p), act: act } };
      }), 'No protests have been filed this season.'));
    }
    viewP.appendChild(box);
    var cur = data && data.protests.filter(function (p) { return p.id === openId; })[0];
    if (cur) viewP.appendChild(protestPanel(cur));
  }

  /* ---------------- Car and class ---------------- */
  function flagKey(f) { return f.roundId + '|' + f.userId; }
  function flagPanel(f) {
    var box = el('div', 'rr-panel rr-stack');
    box.appendChild(RR.heading('Round ' + f.n + ' · ' + f.name));
    box.appendChild(RR.row(RR.kv('Locked at their first round', f.lockedCar + ' (' + f.lockedClass + ')'), RR.kv('Used in this round', f.usedCar + ' (' + f.usedClass + ')')));
    if (f.classChange) box.appendChild(RR.notice('A driver can only score in one class. Their results in ' + f.usedClass + ' are not counted in the results or the points, whatever you decide here.', 'warn'));
    if (f.state === 'open') {
      if (!form || form.id !== flagKey(f)) form = { id: flagKey(f), comment: '' };
      box.appendChild(el('p', 'rr-body', 'A DSQ takes away every race of that night, with the bonus points. Your comment is shown publicly under the race story.'));
      box.appendChild(RR.textarea({ label: 'Your comment (up to 400 characters; needed for a DSQ)', value: form.comment, onChange: function (v) { form.comment = v.slice(0, 400); } }));
      var dsq = RR.button('DSQ for the night', null, true);
      RR.arm(dsq, '', 'Confirm: DSQ for the whole night', function () {
        RR.api('ruleFlag', { roundId: f.roundId, userId: f.userId, decision: 'dsq', comment: form.comment }).then(function (res) {
          if (res && res.ok) done(f.name + ' is disqualified from round ' + f.n + '.', res); else { message = { text: problem(res), kind: 'warn' }; draw(); }
        });
      }, function () {
        if (form.comment.trim().length < 10) { message = { text: problem({ error: 'comment-needed' }), kind: 'warn' }; draw(); return false; }
        return true;
      });
      var leave = RR.button('Leave it', null, false);
      RR.arm(leave, '', 'Confirm: no penalty', function () {
        RR.api('ruleFlag', { roundId: f.roundId, userId: f.userId, decision: 'clear', comment: form.comment }).then(function (res) {
          if (res && res.ok) done('Left as it was.', res); else { message = { text: problem(res), kind: 'warn' }; draw(); }
        });
      });
      box.appendChild(RR.row(dsq, leave));
    } else {
      box.appendChild(RR.row(RR.kv('Decision', f.state === 'dsq' ? 'DSQ for the night' : 'Left as it was'), RR.kv('Your comment', f.comment || '-')));
      var undo = RR.button('Undo', null, false);
      RR.arm(undo, '', 'Confirm undo: the decision is cancelled', function () {
        RR.api('reverseFlag', { penaltyId: f.penaltyId }).then(function (res) {
          if (res && res.ok) done('The decision was undone.', res); else { message = { text: problem(res), kind: 'warn' }; draw(); }
        });
      });
      box.appendChild(RR.row(undo));
    }
    box.appendChild(RR.row(RR.button('Close', function () { openFlag = ''; form = null; draw(); })));
    return box;
  }

  function drawPolicy() {
    viewF.textContent = '';
    var box = add(el('div', 'rr-panel rr-stack'), RR.heading('Car and class changes'),
      el('p', 'rr-body', 'A driver’s class is locked by the first class they raced in the season, and points only ever count there. Anyone who raced in another class or car later is listed here as soon as their results file is uploaded, even before the round is confirmed. You decide.'));
    if (failed) box.appendChild(RR.notice('Could not reach the Sheet. Try again.', 'warn'));
    else if (data === null) box.appendChild(RR.notice('Reading the Sheet...', 'ok'));
    else {
      if (message) box.appendChild(RR.notice(message.text, message.kind));
      var openFlags = data.flags.filter(function (f) { return f.state === 'open'; }).length;
      if (openFlags) box.appendChild(RR.notice(plural(openFlags, 'driver needs', 'drivers need') + ' a decision.', 'warn'));
      box.appendChild(RR.table([
        { key: 'round', label: 'Round', sorted: true }, { key: 'driver', label: 'Driver' }, { key: 'kind', label: 'Change' }, { key: 'locked', label: 'Locked' }, { key: 'used', label: 'Used' }, { key: 'state', label: 'Decision' }, { key: 'act', label: '' }
      ], data.flags.map(function (f) {
        var act = RR.button(f.state === 'open' ? 'Decide' : 'View', function () { openFlag = flagKey(f); form = null; message = null; draw(); });
        return { cells: { round: 'Round ' + f.n, driver: f.name, kind: f.classChange ? 'Class' : 'Car', locked: RR.cell(f.lockedCar, f.lockedClass), used: RR.cell(f.usedCar, f.usedClass),
          state: f.state === 'open' ? 'Waiting' : (f.state === 'dsq' ? 'DSQ' : 'Left as it was'), act: act } };
      }), 'Nobody has changed car or class.'));
    }
    viewF.appendChild(box);
    var cur = data && data.flags.filter(function (f) { return flagKey(f) === openFlag; })[0];
    if (cur) viewF.appendChild(flagPanel(cur));
  }

  function draw() { drawProtests(); drawPolicy(); }

  draw();
  load();
})();
