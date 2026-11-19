/* Race Club admin: Upload Results.
   Add a race by hand from its results file (the .json the server keeps after a race).
   Each file is checked first and nothing is saved until the admin presses Save:
     - it belongs to a round (the number at the end of the server name matches a round in the Sheet): ready
     - it does not belong to a round: the admin picks the round by hand, or cancels that file
     - it was uploaded before, or is not a results file: it is shown and left out
   The checks are made by the service (previewResults, then saveResults), which only answers a logged-in admin.
   No email is sent for a file added by hand. Built only from the shared builders in raceroom-shell.js (RR.*). */
(function () {
  'use strict';
  var RR = window.RR;
  var el = RR.el, add = RR.add;
  var MAX = 1500000;   /* the most characters in one file; the service refuses more */

  var items = [], nextId = 1, queue = Promise.resolve(), saving = false, summary = null;
  var main = document.querySelector('main');

  function longDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    return m ? m[3] + '.' + m[2] + '.' + m[1] : String(iso || '');
  }
  function roundText(r) {
    return 'Round ' + r.n + ' · ' + r.track + ' ' + r.layout + (r.date ? ' · ' + longDate(r.date) : '') + ' · ' + r.season;
  }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function problem(res) {
    var e = res && res.error;
    if (e === 'too-big') return 'This file is too big.';
    if (e === 'bad-round') return 'That round is not valid.';
    return 'Could not reach the Sheet. Try again.';
  }

  /* ---------------- Checking a file ---------------- */
  function readFile(file) {
    return new Promise(function (resolve) {
      var fr = new FileReader();
      fr.onload = function () { resolve(String(fr.result || '')); };
      fr.onerror = function () { resolve(null); };
      fr.readAsText(file);
    });
  }
  function check(item) {
    return readFile(item.file).then(function (text) {
      if (text === null) { item.status = 'unreadable'; item.note = 'This file could not be read.'; draw(); return; }
      if (text.length > MAX) { item.status = 'unreadable'; item.note = 'This file is too big.'; draw(); return; }
      item.text = text;
      return RR.api('previewResults', { text: text }).then(function (res) {
        if (!res || !res.ok) { item.status = 'unreadable'; item.note = problem(res); draw(); return; }
        item.info = res;
        item.status = res.status;
        item.note = res.note || '';
        item.rounds = res.rounds || [];
        draw();
      });
    });
  }
  function addFiles(list) {
    summary = null;
    Array.prototype.forEach.call(list, function (file) {
      var item = { id: nextId++, file: file, name: file.name, status: 'checking', note: '', info: null, rounds: [], choice: '' };
      items.push(item);
      queue = queue.then(function () { return check(item); });
    });
    draw();
  }

  /* ---------------- Saving ---------------- */
  function ready(it) { return it.status === 'ready' || (it.status === 'no-round' && it.choice); }
  function waiting() { return items.some(function (it) { return it.status === 'checking' || it.status === 'saving'; }); }
  function unmatched() { return items.some(function (it) { return it.status === 'no-round' && !it.choice; }); }
  function saveAll() {
    if (saving) return;
    var todo = items.filter(ready);
    if (!todo.length) return;
    saving = true; summary = null; draw();
    var done = 0, chain = Promise.resolve();
    todo.forEach(function (it) {
      chain = chain.then(function () {
        it.status = 'saving'; draw();
        return RR.api('saveResults', { text: it.text, roundId: it.choice || '', fileName: it.name }).then(function (res) {
          if (res && res.ok && res.status === 'stored') { it.status = 'saved'; it.note = ''; done++; }
          else if (res && res.ok && res.status === 'held') { it.status = 'held'; it.note = ''; done++; }
          else if (res && res.ok && res.status === 'duplicate') { it.status = 'duplicate'; it.note = 'Already uploaded.'; }
          else if (res && res.ok && res.status === 'no-round') { it.status = 'no-round'; it.choice = ''; it.note = 'That round is not in the Sheet.'; }
          else if (res && res.ok) { it.status = 'unreadable'; it.note = 'This is not a RaceRoom results file.'; }
          else { it.status = 'failed'; it.note = problem(res); }
          draw();
        });
      });
    });
    chain.then(function () {
      saving = false;
      summary = { text: 'Saved ' + plural(done, 'file', 'files') + ' of ' + todo.length + '.', kind: done === todo.length ? 'ok' : 'warn' };
      draw();
    });
  }
  function cancelOne(item) {
    if (saving) return;
    items = items.filter(function (x) { return x !== item; });
    draw();
  }
  function cancelAll() {
    if (saving) return;
    items = []; summary = null;
    draw();
  }

  /* ---------------- Drawing ---------------- */
  var picker = el('input');
  picker.type = 'file';
  picker.multiple = true;
  picker.accept = '.json,application/json';
  picker.hidden = true;
  picker.addEventListener('change', function () {
    if (picker.files && picker.files.length) addFiles(picker.files);
    picker.value = '';
  });

  var drop = el('div', 'rr-drop');
  add(drop,
    RR.heading('Choose results files'),
    el('p', 'rr-body', 'Pick the results files the server saved after a race. You can pick several at once, or drop them here. Nothing is saved until you press Save.'),
    RR.button('Choose files', function () { picker.click(); }),
    picker);
  ['dragenter', 'dragover'].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.setAttribute('data-over', 'true'); });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.removeAttribute('data-over'); });
  });
  drop.addEventListener('drop', function (e) {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  });

  var STATUS = {
    checking: ['Checking...', ''], saving: ['Saving...', ''],
    ready: ['Ready to save', 'rr-status-ok'], 'no-round': ['Needs a round', 'rr-status-bad'],
    duplicate: ['Already uploaded, left out', 'rr-status-bad'], unreadable: ['Not a results file, left out', 'rr-status-bad'],
    saved: ['Saved', 'rr-status-ok'], held: ['Saved and on hold', 'rr-status-bad'], failed: ['Not saved', 'rr-status-bad']
  };

  function panel(item) {
    var p = el('div', 'rr-panel rr-stack'), st = STATUS[item.status] || ['', ''], info = item.info || {};
    p.appendChild(el('h2', 'rr-heading', item.name));
    var facts = [RR.kv('Server name', info.serverName)];
    if (info.sessions) facts.push(RR.kv('Sessions', info.sessions));
    if (info.drivers !== undefined && info.drivers !== '') facts.push(RR.kv('Drivers', info.drivers));
    var round = info.round ? roundText(info.round)
      : (item.choice ? roundText(item.rounds.filter(function (r) { return r.id === item.choice; })[0] || { n: '?', track: '', layout: '', season: '' }) : null);
    if (round) facts.push(RR.kv('Round', round));
    p.appendChild(RR.row.apply(null, facts));
    var line = st[0];
    if (item.status === 'duplicate' || item.status === 'unreadable') line = (item.note || st[0].replace(/, left out$/, '')) + ' Left out.';
    else if (item.status === 'failed') line = 'Not saved: ' + item.note;
    p.appendChild(el('div', 'rr-label ' + st[1], line));
    if (item.status === 'ready' && item.note) p.appendChild(el('p', 'rr-body', item.note));
    if (item.status === 'held') p.appendChild(el('p', 'rr-body', 'This round already had results, so this file is saved but not used yet. In the Sheet, open the Race Club menu and choose Results: use the held file for a round.'));

    if (item.status === 'no-round') {
      if (item.rounds.length) {
        p.appendChild(el('p', 'rr-body', info.roundId
          ? 'The round number in the server name (' + info.roundId + ') is not in the Sheet. Pick the round this race belongs to, or cancel it.'
          : 'The server name has no round number. Pick the round this race belongs to, or cancel it.'));
        var opts = [['', 'Choose a round']].concat(item.rounds.map(function (r) { return [r.id, roundText(r)]; }));
        p.appendChild(RR.select('Round', opts, function (v) { item.choice = v; draw(); }, item.choice));
      } else {
        p.appendChild(el('p', 'rr-body', 'No rounds are saved in the Sheet yet. Save a season from the Season Wizard first, then add this file again.'));
      }
    }
    if (item.status !== 'saved' && item.status !== 'held' && item.status !== 'saving' && item.status !== 'checking') {
      p.appendChild(RR.row(RR.button('Cancel', function () { cancelOne(item); })));
    }
    return p;
  }

  function draw() {
    main.textContent = '';
    var stack = el('div', 'rr-stack');
    stack.appendChild(drop);
    if (summary) stack.appendChild(RR.notice(summary.text, summary.kind));
    items.forEach(function (it) { stack.appendChild(panel(it)); });
    if (items.length) {
      var n = items.filter(ready).length;
      var save = RR.button(n ? 'Save ' + plural(n, 'file', 'files') + ' to the Sheet' : 'Save to the Sheet', saveAll, true);
      var hold = saving || waiting() || unmatched() || !n;
      if (hold) save.disabled = true;
      var bar = el('div', 'rr-upload-actions');
      add(bar, save, RR.button('Cancel upload', cancelAll));
      stack.appendChild(bar);
      if (unmatched()) stack.appendChild(RR.notice('Pick a round for each file marked Needs a round, or cancel that file, to save.', 'warn'));
    } else if (!summary) {
      stack.appendChild(RR.empty('No files chosen yet.'));
    }
    main.appendChild(stack);
  }
  draw();
})();
