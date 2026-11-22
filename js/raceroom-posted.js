/* Race Club admin: League Management, the "Posted by the server" tab.
   Lists what the RaceRoom server has posted by itself (newest first, the last 100), read from the Sheet's Inbox tab.
   Every post is listed, including repeats and files that could not be read, so a test post shows up here too.
   Files added by hand are not listed. Nothing is changed from this tab. The list is read when the page opens and
   again when Refresh is pressed (never on a timer). Built only from the shared builders in raceroom-shell.js (RR.*). */
(function () {
  'use strict';
  var RR = window.RR;
  var el = RR.el, add = RR.add;
  var view = RR.view('server');

  /* The Inbox status word, as the Sheet writes it, then the words shown here and the colour. */
  var STATUS = {
    'PROCESSED': ['Confirmed and live', 'rr-status-ok'],
    'AWAITING': ['Waiting for your decision', 'rr-status-bad'],
    'DENIED': ['Denied, file kept', ''],
    'REPLACED': ['Replaced by a newer file', ''],
    'RECEIVED': ['Saved, not read', ''],
    'HELD': ['On hold', 'rr-status-bad'],
    'DUPLICATE (ignored)': ['Duplicate, ignored', ''],
    'UNREADABLE': ['Not a results file', 'rr-status-bad'],
    'READ FAILED': ['Saved, could not be read', 'rr-status-bad'],
    'ERROR': ['Error', 'rr-status-bad']
  };

  var posts = null, more = false, busy = false, failed = false;

  /* 2026-11-22 08:15 becomes 22.11.2026 08:15 */
  function when(text) {
    var m = /^(\d{4})-(\d{2})-(\d{2})(.*)$/.exec(String(text || ''));
    return m ? m[3] + '.' + m[2] + '.' + m[1] + m[4] : String(text || '');
  }
  function roundText(p) {
    if (p.round) return 'Round ' + p.round.n + ' · ' + p.round.track + ' ' + p.round.layout;
    return p.roundId ? 'Round ID ' + p.roundId + ' is not in the Sheet' : 'No round';
  }

  function load() {
    if (busy) return;
    busy = true; failed = false; draw();
    RR.api('listPosted').then(function (res) {
      busy = false;
      if (res && res.ok) { posts = res.posts; more = !!res.more; } else failed = true;
      draw();
    });
  }

  function draw() {
    view.textContent = '';
    var refresh = RR.button(busy ? 'Reading...' : 'Refresh', load);
    if (busy) refresh.disabled = true;
    var box = add(el('div', 'rr-panel rr-stack'),
      RR.heading('Posted by the server'),
      el('p', 'rr-body', 'Results the RaceRoom server sent by itself after a session, newest first. Every post is listed, including repeats and files that could not be read. Press Refresh to look again.'),
      RR.row(refresh));
    if (failed) box.appendChild(RR.notice('Could not reach the Sheet. Try again.', 'warn'));
    else if (posts === null) box.appendChild(RR.notice('Reading the Sheet...', 'ok'));
    else {
      box.appendChild(RR.table([
        { key: 'when', label: 'Received', sorted: true }, { key: 'round', label: 'Round' }, { key: 'sessions', label: 'Sessions' },
        { key: 'drivers', label: 'Drivers', num: true }, { key: 'status', label: 'Status' }
      ], posts.map(function (p) {
        var st = STATUS[p.status] || [p.status || '-', ''];
        return { cells: {
          when: when(p.received), round: RR.cell(roundText(p), p.serverName), sessions: p.sessions || '-', drivers: p.drivers,
          status: RR.cell(el('span', st[1], st[0]), p.note)
        } };
      }), 'Nothing has been posted by the server yet.'));
      if (more) box.appendChild(el('p', 'rr-body', 'Only the newest 100 posts are shown. The Inbox tab in the Sheet has all of them.'));
    }
    view.appendChild(box);
  }

  draw();
  load();
})();
