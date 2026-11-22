/* Race Club admin: Member Management.
   An A to Z list of the drivers the league has seen: name, RaceRoom ID, and two boxes in each row.
     Blacklist     the driver is written into the Bans list of every server file the Season Wizard makes
     Hide Details  the driver's name is kept out of the news stories that are sent to the story writer
   Everyone is not blacklisted until the box is ticked. Nothing is saved until the admin presses Save changes.
   The list and the save are done by the service (listMembers, saveMembers), which only answers a logged-in admin.
   Built only from the shared builders in raceroom-shell.js (RR.*). */
(function () {
  'use strict';
  var RR = window.RR;
  var el = RR.el, add = RR.add;
  var main = document.querySelector('main');

  var members = null;      /* [{ id, name, blacklist, hide }] as shown (with the boxes as they are now) */
  var saved = {};          /* id -> { blacklist, hide } as last read from or written to the Sheet */
  var busy = false, failed = false, notice = null;

  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function remember() {
    saved = {};
    members.forEach(function (m) { saved[m.id] = { blacklist: m.blacklist, hide: m.hide }; });
  }
  function dirty() {
    return (members || []).filter(function (m) { return saved[m.id].blacklist !== m.blacklist || saved[m.id].hide !== m.hide; });
  }
  function problem(res) {
    var e = res && res.error;
    if (e === 'bad-members') return 'Those changes could not be saved because a member ID was not valid.';
    if (e === 'unknown-action') return 'The Sheet service has not been updated yet. Paste the newest Apps Script files and deploy a new version.';
    return 'Could not reach the Sheet. Try again.';
  }

  function load() {
    if (busy) return;
    busy = true; failed = false; draw();
    RR.api('listMembers').then(function (res) {
      busy = false;
      if (res && res.ok) { members = res.members; remember(); notice = null; }
      else { failed = true; notice = { text: problem(res), kind: 'warn' }; }
      draw();
    });
  }

  function save() {
    var changes = dirty();
    if (busy || !changes.length) return;
    busy = true; notice = { text: 'Saving...', kind: 'ok' }; draw();
    RR.api('saveMembers', { changes: changes.map(function (m) { return { id: m.id, blacklist: m.blacklist, hide: m.hide }; }) }).then(function (res) {
      busy = false;
      if (res && res.ok) { remember(); notice = { text: 'Saved ' + plural(changes.length, 'member', 'members') + '.', kind: 'ok' }; }
      else notice = { text: 'Not saved. ' + problem(res), kind: 'warn' };
      draw();
    });
  }

  function draw() {
    main.textContent = '';
    var box = add(el('div', 'rr-panel rr-stack'),
      RR.heading('Members'),
      el('p', 'rr-body', 'Everyone is allowed in until Blacklist is ticked. Blacklisted members are written into the Bans list of every server file the Season Wizard makes. Hide Details keeps a member\'s name out of the news stories sent to the story writer.'));
    if (notice) box.appendChild(RR.notice(notice.text, notice.kind));
    if (failed) {
      box.appendChild(RR.row(RR.button('Try again', load)));
    } else if (members === null) {
      box.appendChild(RR.notice('Reading the Sheet...', 'ok'));
    } else {
      var banned = members.filter(function (m) { return m.blacklist; }).length;
      box.appendChild(el('div', 'rr-label', plural(members.length, 'member', 'members') + ' · ' + plural(banned, 'blacklisted', 'blacklisted')));
      box.appendChild(RR.table([
        { key: 'name', label: 'Name', sorted: true }, { key: 'id', label: 'ID' }, { key: 'blacklist', label: '' }, { key: 'hide', label: '' }
      ], members.map(function (m) {
        return { cells: {
          name: m.name, id: m.id,
          blacklist: RR.checkbox('Blacklist', function (v) { m.blacklist = v; refreshBar(); }, m.blacklist),
          hide: RR.checkbox('Hide Details', function (v) { m.hide = v; refreshBar(); }, m.hide)
        } };
      }), 'No members yet. Drivers appear here after their first race has been read into the Sheet.'));
      var saveBtn = RR.button('Save changes', save, true);
      var count = el('span', 'rr-note', '');
      box.appendChild(RR.row(saveBtn, count));
      box._saveBtn = saveBtn; box._count = count;
    }
    main.appendChild(box);
    current = box;
    refreshBar();
  }

  /* Updates the Save button and the count without redrawing the list, so a tick never moves the page. */
  var current = null;
  function refreshBar() {
    if (!current || !current._saveBtn) return;
    var n = dirty().length;
    current._saveBtn.disabled = busy || !n;
    current._count.textContent = n ? plural(n, 'unsaved change', 'unsaved changes') : '';
  }

  draw();
  load();
})();
