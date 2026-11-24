/* Race Club admin: News Editor, the "News" tab.
   Only the posts you write yourself (byline Matt Stenzel). The AI stories (race stories, season preview and recap, byline Race Club Press) are
   on the Story writer tab, which opens this same editor for them (RR.newsEditor.open).
   New post: a title and text, up to 10,000 characters. The buttons above the text add bold, italic, underline, a heading, a quote, an
   email link or a picture. Pictures are saved to the data site.
   Edit: change the title and text; you must say why (shown in italics at the bottom of the public story). An edited AI story reads
   "Race Club Press, edited by Matt Stenzel". The text before every edit or rewrite is kept out of sight.
   Pictures (AI stories): the editor lists the story's pictures; each can be swapped for a picture from the computer or get a new caption.
   Rewrite (AI stories only): the writer tries again. Withdraw hides a story and Republish shows it again. Delete hides it and keeps it in the
   Deleted list; Undo delete moves it back to Withdrawn. Nothing is ever erased.
   Built only from the shared builders in raceroom-shell.js (RR.*). */
(function () {
  'use strict';
  var RR = window.RR;
  var el = RR.el, add = RR.add;
  RR.fillContent();
  var main = RR.view('posts');

  var data = null, busy = false, failed = false, message = null, filter = 'published', openKey = '', form = null, ta = null, linkBox = null, working = false, reasonMissing = false, reasonEl = null;

  function problem(res) {
    var e = res && res.error;
    if (e === 'no-title') return 'Write a title first.';
    if (e === 'no-body') return 'Write the text first.';
    if (e === 'no-reason') return 'Choose the reason for the edit.';
    if (e === 'undo-first') return 'Use Undo delete first.';
    if (e === 'locked') return 'This story is locked. Unlock it on the Story writer tab first.';
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
    load(RR.newsEditor.saved);
  }
  function fail(res) { message = { text: problem(res), kind: 'warn' }; draw(); }

  var waiting = [];
  function load(then) {
    if (then) waiting.push(then);
    if (busy) return;
    busy = true; failed = false; draw();
    RR.api('listNews', {}).then(function (res) {
      busy = false;
      if (res && res.ok) data = res; else failed = true;
      draw();
      var run = waiting; waiting = [];
      run.forEach(function (f) { f(); });
    });
  }
  /* The Story writer tab opens this editor for an AI story: RR.newsEditor.open(key) reads the list again, then opens it.
     RR.newsEditor.saved is called after a save, withdraw, delete or rewrite so that tab can refresh. */
  RR.newsEditor = { saved: null, open: function (key) { load(function () { var it = find(key); if (it) openItem(it); }); } };

  function posts() { return data.items.filter(function (i) { return i.kind === 'post'; }); }
  function find(key) { return data && data.items.filter(function (i) { return i.key === key; })[0]; }
  function stateWord(s) { return s === 'published' ? 'Live' : (s === 'withdrawn' ? 'Withdrawn' : 'Deleted'); }
  function dmy(d) { var p = String(d || '').split('-'); return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : '-'; }
  function thousands(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  /* ---------------- The text box and its buttons ---------------- */
  var counter = null, preview = null;
  function limit() { return data ? data.limit : 10000; }
  /* The [image #n] lines are not part of the story, so they do not count toward the limit. */
  var MARK = /^\[image #(\d+)\]$/i;
  function bodyLen() { return form.body.replace(/^\[image #\d+\][ \t]*\n*/gim, '').length; }
  function liveItem() { return form && form.key ? find(form.key) : null; }
  /* The text with a [image #n] line before the paragraph each picture (after the banner) sits beside. */
  function withMarkers(item) {
    var list = item.photos || [], blocks = String(item.body).split(/\n\n/), out = [], para = 0, placed = {};
    function put(at) { list.forEach(function (p, i) { if (i >= 1 && !placed[i] && (Number(p.at) || 0) === at) { placed[i] = true; out.push('[image #' + (i + 1) + ']'); } }); }
    blocks.forEach(function (b) {
      var isPara = !/^(## |> |!\[)/.test(b);
      if (isPara) put(para);
      out.push(b);
      if (isPara) para++;
    });
    list.forEach(function (p, i) { if (i >= 1 && !placed[i]) out.push('[image #' + (i + 1) + ']'); });
    return out.join('\n\n');
  }
  function refreshAux() {
    if (counter) {
      counter.textContent = thousands(bodyLen()) + ' / ' + thousands(limit());
      counter.className = 'rr-editor-count' + (bodyLen() > limit() ? ' rr-over' : '');
    }
    if (preview) {
      preview.textContent = '';
      var blocks = form.body.replace(/\r\n?/g, '\n').split(/\n\n+/).filter(function (b) { return b.trim(); });
      if (!blocks.length) preview.appendChild(el('p', 'rr-body', 'The text will show here as readers see it.'));
      var it = liveItem();
      blocks.forEach(function (b) {
        var mk = MARK.exec(b.trim()), ph = mk && it && it.photos && it.photos[Number(mk[1]) - 1];
        if (mk) {
          if (!ph) return;
          var fig = el('figure', 'rr-figure rr-figure-' + (ph.side === 'left' ? 'left' : 'right')), im = el('img');   /* the same float as the story page, so the text wraps around it */
          im.src = ph.src; im.alt = ph.caption || '';
          fig.appendChild(im);
          if (ph.caption) fig.appendChild(el('figcaption', '', ph.caption));
          preview.appendChild(fig);
          return;
        }
        preview.appendChild(RR.richBlock(b.trim()));
      });
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

  /* The pictures of a written story (race story, season preview or recap): see each one, swap it for a picture from the computer, change its caption. */
  var swapInput = el('input'), swapIndex = -1;
  swapInput.type = 'file'; swapInput.accept = 'image/*'; swapInput.hidden = true;
  document.body.appendChild(swapInput);
  swapInput.addEventListener('change', function () {
    var f = swapInput.files && swapInput.files[0], at = swapIndex, key = form && form.key;
    swapInput.value = '';
    if (!f || at < 0 || !key) return;
    message = { text: 'Saving picture ' + (at + 1) + '...', kind: 'ok' };
    drawNotice();
    shrink(f).then(function (b64) {
      return RR.api('saveStoryPhoto', { key: key, index: at, data: b64, caption: (form.caps || [])[at] });
    }).then(function (res) {
      if (res && res.ok) { message = { text: 'Picture ' + (at + 1) + ' was swapped. The story shows it now.' + publishNote(res), kind: 'ok' }; load(RR.newsEditor.saved); }
      else { message = { text: problem(res), kind: 'warn' }; draw(); }
    }, function () { message = { text: problem({ error: 'bad-photo' }), kind: 'warn' }; draw(); });
  });
  /* Move the [image #n] line to the cursor: it is taken out of its old place and put on its own between the paragraphs at the cursor. */
  function moveMarker(n) {
    if (!ta) return;
    var tag = '[image #' + n + ']', v = ta.value, pos = ta.selectionStart;
    var re = new RegExp('(^|\\n\\n)\\[image #' + n + '\\](?=\\n\\n|$)'), m = re.exec(v);
    if (m) {
      var cut = m[0].length;
      v = v.slice(0, m.index) + v.slice(m.index + cut);
      if (m.index < pos) pos = Math.max(m.index, pos - cut);
      if (!m[1] && v.slice(m.index, m.index + 2) === '\n\n') v = v.slice(0, m.index) + v.slice(m.index + 2);
    }
    form.body = v; ta.value = v; ta.setSelectionRange(Math.min(pos, v.length), Math.min(pos, v.length));
    insertBlock(tag);
  }
  function pictureRows(box, item) {
    var list = item.photos || [];
    if (!form.caps) form.caps = list.map(function (p) { return p.caption || ''; });
    box.appendChild(el('h3', 'rr-card-title', 'Pictures in this story'));
    if (!list.length) { box.appendChild(el('p', 'rr-body', 'This story has no pictures.')); return; }
    box.appendChild(el('p', 'rr-body', 'The first picture is the banner at the top. Every other picture is a line like [image #2] in the text below, at the paragraph it sits beside. To move a picture, cut that line and paste it between two paragraphs (with a blank line around it), or click in the text where you want it and press Move to cursor. Keep the number as it is. A move is saved with Save edit; swapping a picture or its caption is saved at once and does not need a reason.'));
    list.forEach(function (p, i) {
      var row = el('div', 'rr-story-photo'), im = el('img');
      im.src = p.src; im.alt = '';
      row.appendChild(add(el('span', 'rr-story-thumb'), im));
      row.appendChild(RR.input({ label: (i === 0 ? 'Banner picture' : 'Picture ' + (i + 1)) + ' caption', value: form.caps[i], wide: true, onChange: function (v) { form.caps[i] = v; } }));
      row.appendChild(RR.button('Swap picture', function () { swapIndex = i; swapInput.click(); }));
      if (i >= 1) row.appendChild(RR.button('Move to cursor', function () { moveMarker(i + 1); }));
      row.appendChild(RR.confirmButton('Save caption', 'Confirm: save this caption', function () {
        RR.api('saveStoryPhoto', { key: item.key, index: i, caption: form.caps[i] }).then(function (res) {
          if (res && res.ok) { message = { text: 'The caption was saved.' + publishNote(res), kind: 'ok' }; load(RR.newsEditor.saved); } else fail(res);
        });
      }));
      box.appendChild(row);
    });
  }

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
    if (!isNew && item.kind !== 'post') pictureRows(box, item);
    var area = RR.textarea({ label: 'Text', value: form.body, onChange: function (v) { form.body = v; refreshAux(); } });
    ta = area.querySelector('textarea');
    var wrapEl = el('div', 'rr-stack rr-editor');
    add(wrapEl, toolbar(), area);
    box.appendChild(wrapEl);
    if (linkBox) box.appendChild(linkRow());
    box.appendChild(el('p', 'rr-body', 'Leave a blank line between paragraphs. A heading, a quote and a picture each sit on their own.'));
    box.appendChild(el('h3', 'rr-card-title', 'How it will look'));
    preview = el('div', 'rr-article');
    box.appendChild(preview);
    /* The reason sits right above the buttons. When Save edit is pressed without one, it gets a red border until one is chosen. */
    reasonEl = null;
    if (!isNew) {
      var mine = RR.select('Reason for this edit (shown at the bottom of the story)', [['', 'Choose']].concat(data.reasons.map(function (r) { return [r, r]; })),
        function (v) { form.reason = v; if (v) { reasonMissing = false; mine.classList.remove('rr-needs'); } }, form.reason);
      reasonEl = mine;
      if (reasonMissing && !form.reason) reasonEl.classList.add('rr-needs');
      box.appendChild(reasonEl);
    }

    var save = RR.button(isNew ? 'Publish post' : 'Save edit', null, true);
    RR.arm(save, '', isNew ? 'Confirm: publish this post on the News page' : 'Confirm: save this edit', function () {
      var call = isNew ? RR.api('savePost', { title: form.title, body: form.body })
        : RR.api('editNewsItem', { key: form.key, title: form.title, standfirst: form.standfirst, body: form.body, reason: form.reason });
      call.then(function (res) { if (res && res.ok) done(isNew ? 'The post was published.' : 'The edit was saved.', res); else fail(res); });
    }, function () {
      if (!form.title.trim()) { fail({ error: 'no-title' }); return false; }
      if (!form.body.trim()) { fail({ error: 'no-body' }); return false; }
      if (bodyLen() > limit()) { message = { text: 'The text is over ' + thousands(limit()) + ' characters. Shorten it.', kind: 'warn' }; drawNotice(); return false; }
      if (!isNew && !form.reason) {
        reasonMissing = true; if (reasonEl) reasonEl.classList.add('rr-needs');
        fail({ error: 'no-reason' });
        setTimeout(function () { if (reasonEl && reasonEl.scrollIntoView) reasonEl.scrollIntoView({ block: 'center' }); }, 0);
        return false;
      }
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
    if (!isNew && item.locked) {
      buttons.forEach(function (b) { b.disabled = true; });
      box.appendChild(RR.notice('This story is locked. Click the lock on the Story writer tab to unlock it before changing it.', 'warn'));
    }
    buttons.push(RR.button('Close', function () { if (modal) modal.close(); }));
    box.appendChild(RR.row.apply(null, buttons));
  }

  function openItem(item) {
    openKey = item ? item.key : 'new';
    form = { key: item ? item.key : '', title: item ? item.title : '', standfirst: item ? item.standfirst : '', body: item ? (item.kind !== 'post' && item.photos && item.photos.length > 1 ? withMarkers(item) : item.body) : '', reason: '', caption: '' };
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
      el('p', 'rr-body', 'The posts you write yourself, signed Matt Stenzel. The race stories, season previews and recaps are on the Story writer tab. Nothing is ever erased: a delete only hides a post, and every edit keeps the earlier text out of sight.'));
    noticeHost = el('div');
    box.appendChild(noticeHost);
    if (message) noticeHost.appendChild(RR.notice(message.text, message.kind));
    if (failed) box.appendChild(RR.notice('Could not reach the Sheet. Try again.', 'warn'));
    else if (data === null) box.appendChild(RR.notice('Reading the Sheet...', 'ok'));
    else {
      var counts = { published: 0, withdrawn: 0, deleted: 0 };
      posts().forEach(function (i) { counts[i.state] = (counts[i.state] || 0) + 1; });
      var seg = RR.segment([['published', 'Live (' + counts.published + ')'], ['withdrawn', 'Withdrawn (' + counts.withdrawn + ')'], ['deleted', 'Deleted (' + counts.deleted + ')']], function (v) { filter = v; draw(); });
      Array.prototype.forEach.call(seg.children, function (b, i) { b.setAttribute('aria-pressed', ['published', 'withdrawn', 'deleted'][i] === filter ? 'true' : 'false'); });
      box.appendChild(RR.row(seg, newPost, refresh));
      var rows = posts().filter(function (i) { return i.state === filter; });
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
