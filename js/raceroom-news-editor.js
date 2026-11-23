/* Race Club admin: News Editor.
   One list of everything on the News page that you can change: your own posts (byline Matt Stenzel) and the AI race stories and
   season previews (byline Race Club Press).
   New post: a title and text, up to 10,000 characters. The buttons above the text add bold, italic, underline, a heading, a quote, an
   email link or a picture. Pictures are saved to the data site.
   Edit: change the title and text; you must say why (shown in italics at the bottom of the public story). An edited AI story reads
   "Race Club Press, edited by Matt Stenzel". The text before every edit or rewrite is kept out of sight.
   Rewrite (AI stories only): the writer tries again. Withdraw hides a story and Republish shows it again. Delete hides it and keeps it in the
   Deleted list; Undo delete moves it back to Withdrawn. Nothing is ever erased.
   Built only from the shared builders in raceroom-shell.js (RR.*). */
(function () {
  'use strict';
  var RR = window.RR;
  var el = RR.el, add = RR.add;
  RR.fillContent();
  var main = RR.view('posts');

  var data = null, busy = false, failed = false, message = null, filter = 'published', openKey = '', form = null, ta = null, linkBox = null, working = false;

  function problem(res) {
    var e = res && res.error;
    if (e === 'no-title') return 'Write a title first.';
    if (e === 'no-body') return 'Write the text first.';
    if (e === 'no-reason') return 'Choose the reason for the edit.';
    if (e === 'undo-first') return 'Use Undo delete first.';
    if (e === 'bad-photo') return 'That picture could not be used. Try another one.';
    if (e === 'github') return 'The picture could not be saved: ' + (res.detail || 'GitHub refused it.');
    return 'Could not do that. Try again.';
  }
  function publishNote(res) {
    if (!res || res.published === undefined) return '';
    if (res.published) return ' The website data was updated; GitHub Pages shows it in 1 to 2 minutes.';
    return res.publishError ? ' The website data was NOT updated: ' + res.publishError : ' The website data was not updated because GitHub is not set up yet.';
  }
  function done(text, res, kind) {
    message = { text: text + publishNote(res), kind: res && res.published === false && res.publishError ? 'warn' : (kind || 'ok') };
    openKey = ''; form = null; working = false;
    load();
  }
  function fail(res) { message = { text: problem(res), kind: 'warn' }; draw(); }

  function load() {
    if (busy) return;
    busy = true; failed = false; draw();
    RR.api('listNews', {}).then(function (res) {
      busy = false;
      if (res && res.ok) data = res; else failed = true;
      draw();
    });
  }

  function find(key) { return data && data.items.filter(function (i) { return i.key === key; })[0]; }
  function stateWord(s) { return s === 'published' ? 'Live' : (s === 'withdrawn' ? 'Withdrawn' : 'Deleted'); }
  function dmy(d) { var p = String(d || '').split('-'); return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : '-'; }
  function thousands(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  /* ---------------- The text box and its buttons ---------------- */
  var counter = null, preview = null;
  function limit() { return data ? data.limit : 10000; }
  function refreshAux() {
    if (counter) {
      counter.textContent = thousands(form.body.length) + ' / ' + thousands(limit());
      counter.className = 'rr-editor-count' + (form.body.length > limit() ? ' rr-over' : '');
    }
    if (preview) {
      preview.textContent = '';
      var blocks = form.body.replace(/\r\n?/g, '\n').split(/\n\n+/).filter(function (b) { return b.trim(); });
      if (!blocks.length) preview.appendChild(el('p', 'rr-body', 'The text will show here as readers see it.'));
      blocks.forEach(function (b) { preview.appendChild(RR.richBlock(b.trim())); });
    }
  }
  function setBody(text, from, to) {
    form.body = text.slice(0, limit());
    if (ta) { ta.value = form.body; ta.focus(); ta.setSelectionRange(Math.min(from, form.body.length), Math.min(to, form.body.length)); }
    refreshAux();
  }
  function wrap(open, close, sample) {
    var a = ta.selectionStart, b = ta.selectionEnd, v = ta.value, mid = v.slice(a, b) || sample;
    setBody(v.slice(0, a) + open + mid + close + v.slice(b), a + open.length, a + open.length + mid.length);
  }
  function linePrefix(prefix) {
    var a = ta.selectionStart, v = ta.value, start = v.lastIndexOf('\n', a - 1) + 1;
    setBody(v.slice(0, start) + prefix + v.slice(start), a + prefix.length, a + prefix.length);
  }
  function insertBlock(block) {
    var a = ta.selectionStart, b = ta.selectionEnd, v = ta.value, before = v.slice(0, a).replace(/\s+$/, ''), after = v.slice(b).replace(/^\s+/, '');
    var text = (before ? before + '\n\n' : '') + block + (after ? '\n\n' + after : '');
    var pos = (before ? before.length + 2 : 0) + block.length;
    setBody(text, pos, pos);
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
        var out = '', q = [0.85, 0.7, 0.55];
        for (var i = 0; i < q.length; i++) {
          out = c.toDataURL('image/jpeg', q[i]).replace(/^data:image\/jpeg;base64,/, '');
          if (out.length < 1300000) break;
        }
        out.length < 1300000 ? ok(out) : bad();
      };
      img.onerror = function () { URL.revokeObjectURL(url); bad(); };
      img.src = url;
    });
  }
  function addPicture(file) {
    if (!file) return;
    message = { text: 'Saving the picture...', kind: 'ok' };
    drawNotice();
    shrink(file).then(function (b64) {
      return RR.api('saveNewsPhoto', { data: b64 });
    }).then(function (res) {
      if (res && res.ok) {
        message = { text: 'Picture added to the text.', kind: 'ok' };
        insertBlock('![' + (form.caption || '').replace(/[\[\]\n]/g, ' ').trim() + '](' + res.src + ')');
        form.caption = '';
      } else message = { text: problem(res), kind: 'warn' };
      draw();
    }, function () { message = { text: problem({ error: 'bad-photo' }), kind: 'warn' }; draw(); });
  }

  function toolbar() {
    var bar = el('div', 'rr-editor-bar');
    function tool(label, fn) { var b = RR.button(label, fn); return b; }
    add(bar,
      tool('Bold', function () { wrap('**', '**', 'bold text'); }),
      tool('Italic', function () { wrap('*', '*', 'italic text'); }),
      tool('Underline', function () { wrap('__', '__', 'underlined text'); }),
      tool('Heading', function () { linePrefix('## '); }),
      tool('Quote', function () { linePrefix('> '); }),
      tool('Email link', function () { linkBox = linkBox ? null : { to: '', text: ta && ta.value.slice(ta.selectionStart, ta.selectionEnd) || '' }; drawEditorOnly(); }),
      tool('Picture', function () { fileInput.click(); }));
    counter = el('span', 'rr-editor-count');
    bar.appendChild(counter);
    return bar;
  }
  var fileInput = el('input');
  fileInput.type = 'file'; fileInput.accept = 'image/*'; fileInput.hidden = true;
  document.body.appendChild(fileInput);   /* in the page, so the picker opens in every browser */
  fileInput.addEventListener('change', function () { var f = fileInput.files && fileInput.files[0]; fileInput.value = ''; addPicture(f); });

  function linkRow() {
    var box = el('div', 'rr-panel rr-stack');
    var go = RR.button('Add the link', function () {
      var to = (linkBox.to || '').trim(), text = (linkBox.text || '').trim() || to;
      if (!/^[^\s@<>"()\[\]]+@[^\s@<>"()\[\]]+\.[^\s@<>"()\[\]]+$/.test(to)) { message = { text: 'Type a full email address, like name@example.com.', kind: 'warn' }; drawNotice(); return; }
      var a = ta.selectionStart, b = ta.selectionEnd, v = ta.value;
      var link = '[' + text.replace(/[\[\]]/g, '') + '](mailto:' + to + ')';
      linkBox = null;
      setBody(v.slice(0, a) + link + v.slice(b), a + link.length, a + link.length);
      drawEditorOnly();
    });
    return add(box, RR.row(RR.input({ label: 'Email address', value: linkBox.to, onChange: function (v) { linkBox.to = v; } }),
      RR.input({ label: 'Words to show', value: linkBox.text, onChange: function (v) { linkBox.text = v; } }), go));
  }

  /* ---------------- The editor ---------------- */
  var editorHost = null, noticeHost = null, editNotice = null;
  function drawNotice() {
    [noticeHost, editNotice].forEach(function (h) {
      if (!h) return;
      h.textContent = '';
      if (message) h.appendChild(RR.notice(message.text, message.kind));
    });
  }
  function drawEditorOnly() { if (editorHost) { var k = modal ? modal.body.scrollTop : 0; editorHost.textContent = ''; fillEditor(editorHost); refreshAux(); if (modal) modal.body.scrollTop = k; } drawNotice(); }

  function fillEditor(box) {
    var item = form.key ? find(form.key) : null, isNew = !form.key;
    box.appendChild(RR.heading(isNew ? 'New post' : (item.label + ' · ' + stateWord(item.state))));
    editNotice = el('div'); box.appendChild(editNotice); drawNotice();
    if (!isNew) box.appendChild(RR.row(RR.kv('Byline', item.edited && item.kind !== 'post' ? item.byline + ', edited by ' + 'Matt Stenzel' : item.byline), RR.kv('Date', dmy(item.date)),
      RR.kv('Earlier versions kept', String(item.changes)), RR.kv('Last edit', item.edited ? dmy(item.edited) + ': ' + item.editReason : '-')));
    box.appendChild(RR.input({ label: 'Title', value: form.title, wide: true, onChange: function (v) { form.title = v.slice(0, 120); } }));
    if (!isNew && item.kind !== 'post') box.appendChild(RR.input({ label: 'Short summary under the title (shown on the News page)', value: form.standfirst, wide: true, onChange: function (v) { form.standfirst = v.slice(0, 300); } }));
    var area = RR.textarea({ label: 'Text', value: form.body, onChange: function (v) { form.body = v; refreshAux(); } });
    ta = area.querySelector('textarea');
    var wrapEl = el('div', 'rr-stack rr-editor');
    add(wrapEl, toolbar(), area);
    box.appendChild(wrapEl);
    if (linkBox) box.appendChild(linkRow());
    box.appendChild(el('p', 'rr-body', 'Leave a blank line between paragraphs. A heading, a quote and a picture each sit on their own.'));
    if (!isNew) {
      box.appendChild(RR.select('Reason for this edit (shown at the bottom of the story)', [['', 'Choose']].concat(data.reasons.map(function (r) { return [r, r]; })),
        function (v) { form.reason = v; }, form.reason));
    }
    box.appendChild(el('h3', 'rr-card-title', 'How it will look'));
    preview = el('div', 'rr-article');
    box.appendChild(preview);

    var save = RR.button(isNew ? 'Publish post' : 'Save edit', null, true);
    RR.arm(save, '', isNew ? 'Confirm: publish this post on the News page' : 'Confirm: save this edit', function () {
      var call = isNew ? RR.api('savePost', { title: form.title, body: form.body })
        : RR.api('editNewsItem', { key: form.key, title: form.title, standfirst: form.standfirst, body: form.body, reason: form.reason });
      call.then(function (res) { if (res && res.ok) done(isNew ? 'The post was published.' : 'The edit was saved.', res); else fail(res); });
    }, function () {
      if (!form.title.trim()) { fail({ error: 'no-title' }); return false; }
      if (!form.body.trim()) { fail({ error: 'no-body' }); return false; }
      if (form.body.length > limit()) { message = { text: 'The text is over ' + thousands(limit()) + ' characters. Shorten it.', kind: 'warn' }; drawNotice(); return false; }
      if (!isNew && !form.reason) { fail({ error: 'no-reason' }); return false; }
      return true;
    });
    var buttons = [save];
    if (!isNew) {
      function state(label, confirm, want, doneText) {
        var b = RR.button(label, null, false);
        RR.arm(b, '', confirm, function () {
          RR.api('setNewsState', { key: item.key, state: want }).then(function (res) { if (res && res.ok) done(doneText, res); else fail(res); });
        });
        return b;
      }
      if (item.state === 'published') buttons.push(state('Withdraw', 'Confirm withdraw: readers can no longer see it', 'withdrawn', 'It was withdrawn.'));
      if (item.state === 'withdrawn') buttons.push(state('Republish', 'Confirm republish: readers can see it again', 'published', 'It was republished.'));
      if (item.state !== 'deleted') buttons.push(state('Delete', 'Confirm delete: it is hidden; you can undo this', 'deleted', 'It was deleted. You can bring it back with Undo delete.'));
      else buttons.push(state('Undo delete', 'Confirm undo: it comes back as Withdrawn', 'withdrawn', 'It is back, as Withdrawn.'));
      if (item.kind !== 'post') {
        var again = RR.button('Rewrite story', null, false, 'redo');
        RR.arm(again, '', 'Confirm rewrite: the writer makes a new text (about a minute)', function () {
          working = true;
          message = { text: 'Rewriting the story. This takes about a minute.', kind: 'ok' };
          draw();
          RR.api('writeStory', { kind: item.kind, seasonId: item.seasonId, roundId: item.roundId, rewrite: true }).then(function (res) {
            if (res && res.ok) done('The story was rewritten.', res);
            else { working = false; message = { text: 'The story could not be rewritten: ' + ((res && res.story && res.story.error) || problem(res)), kind: 'warn' }; draw(); }
          });
        });
        again.disabled = working;
        buttons.push(again);
      }
    }
    buttons.push(RR.button('Close', function () { if (modal) modal.close(); }));
    box.appendChild(RR.row.apply(null, buttons));
  }

  function openItem(item) {
    openKey = item ? item.key : 'new';
    form = { key: item ? item.key : '', title: item ? item.title : '', standfirst: item ? item.standfirst : '', body: item ? item.body : '', reason: '', caption: '' };
    linkBox = null; message = null;
    draw();
  }

  /* ---------------- The list ---------------- */
  function draw() {
    main.textContent = '';
    counter = null; preview = null; ta = null; editorHost = null;
    var refresh = RR.button(busy ? 'Reading...' : 'Refresh', load);
    if (busy) refresh.disabled = true;
    var newPost = RR.button('New post', function () { openItem(null); });
    var box = add(el('div', 'rr-panel rr-stack'), RR.heading('News'),
      el('p', 'rr-body', 'Everything on the News page that you can change. Your own posts are signed Matt Stenzel; the race stories and season previews are signed Race Club Press. Nothing is ever erased: a delete only hides it, and every edit keeps the earlier text out of sight.'));
    noticeHost = el('div');
    box.appendChild(noticeHost);
    if (message) noticeHost.appendChild(RR.notice(message.text, message.kind));
    if (failed) box.appendChild(RR.notice('Could not reach the Sheet. Try again.', 'warn'));
    else if (data === null) box.appendChild(RR.notice('Reading the Sheet...', 'ok'));
    else {
      var counts = { published: 0, withdrawn: 0, deleted: 0 };
      data.items.forEach(function (i) { counts[i.state] = (counts[i.state] || 0) + 1; });
      var seg = RR.segment([['published', 'Live (' + counts.published + ')'], ['withdrawn', 'Withdrawn (' + counts.withdrawn + ')'], ['deleted', 'Deleted (' + counts.deleted + ')']], function (v) { filter = v; draw(); });
      Array.prototype.forEach.call(seg.children, function (b, i) { b.setAttribute('aria-pressed', ['published', 'withdrawn', 'deleted'][i] === filter ? 'true' : 'false'); });
      box.appendChild(RR.row(seg, newPost, refresh));
      var rows = data.items.filter(function (i) { return i.state === filter; });
      box.appendChild(RR.table([
        { key: 'title', label: 'Title' }, { key: 'by', label: 'Byline' }, { key: 'date', label: 'Date', sorted: true }, { key: 'chars', label: 'Characters', num: true }, { key: 'act', label: '' }
      ], rows.map(function (i) {
        var by = i.kind !== 'post' && i.edited ? 'Race Club Press, edited by Matt Stenzel' : i.byline;
        return { cells: { title: RR.cell(i.title, i.label + (i.season ? ' · ' + i.season : '') + (i.edited ? ' · edited' : '')), by: by, date: dmy(i.date), chars: thousands(i.chars),
          act: RR.button('Open', function () { openItem(i); }) } };
      }), filter === 'published' ? 'Nothing is live yet.' : (filter === 'withdrawn' ? 'Nothing is withdrawn.' : 'Nothing is deleted.')));
    }
    main.appendChild(box);
    syncEditor();
  }
  /* The editor opens in a popup window over the page (RR.modal); the list stays as it is underneath. */
  var modal = null;
  function syncEditor() {
    var open = form && (openKey === 'new' || find(openKey));
    if (!open) { if (modal) { var m = modal; modal = null; m.close(true); } return; }
    var keep = 0;
    if (modal) keep = modal.body.scrollTop;
    else modal = RR.modal(openKey === 'new' ? 'New post' : 'Edit story', function () { modal = null; openKey = ''; form = null; message = null; });
    modal.setTitle(openKey === 'new' ? 'New post' : 'Edit story');
    editorHost = el('div', 'rr-stack');
    modal.body.textContent = '';
    modal.body.appendChild(editorHost);
    fillEditor(editorHost);
    refreshAux();
    modal.body.scrollTop = keep;
  }

  load();
})();
