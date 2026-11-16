/* Race Club RaceRoom site: shared shell and shared building blocks.
   Draws the top bar (with Back, Forward, Home and the admin log in icon),
   page title row, sub-tabs and bottom bar on
   every raceroom page from ONE menu list, so they are identical everywhere.
   Also holds the only builders for tables, cards, tiles and options (RR.*),
   so every list and option on the site looks the same.

   A page tells the shell what it is with attributes on <body>:
     data-rr-main="news|leaderboards|profiles"   which main menu item is active
     data-rr-tabs="leaderboards|profile"         which sub-tab set to show (optional)
     data-rr-title="Page title"                  starting page title
   Sub-tab content lives in <section data-rr-view="tab-id"> inside <main>. */
(function () {
  'use strict';

  /* ---- The one menu list. Change the site menu here and nowhere else. ---- */
  var MENU = [
    { id: 'news', label: 'News', href: 'raceroom.html' },
    { id: 'leaderboards', label: 'Leaderboards', href: 'raceroom-leaderboards.html' },
    { id: 'profiles', label: 'Profiles', href: 'raceroom-profiles.html' }
  ];
  var TABSETS = {
    leaderboards: [
      ['standings', 'Standings'],
      ['results', 'Race Results'],
      ['laptimes', 'Lap Times'],
      ['schedule', 'Schedule']
    ],
    profile: [
      ['overview', 'Overview'],
      ['history', 'Race History'],
      ['statistics', 'Statistics'],
      ['achievements', 'Achievements']
    ]
  };

  /* ---- Small helpers ---- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }
  function add(parent) {
    for (var i = 1; i < arguments.length; i++) {
      if (arguments[i]) parent.appendChild(arguments[i]);
    }
    return parent;
  }
  function dash(v) { return (v === undefined || v === null || v === '') ? '-' : v; }

  /* ---- Icons: one family (24 box, 1.8 line, round ends). Fixed drawings, never user text. ---- */
  var ICONS = {
    back: '<path d="M15 5l-7 7 7 7"/>',
    forward: '<path d="M9 5l7 7-7 7"/>',
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
    login: '<path d="M14 4h6v16h-6"/><path d="M3 12h11"/><path d="M10 8l4 4-4 4"/>',
    logout: '<path d="M10 4H4v16h6"/><path d="M10 12h11"/><path d="M17 8l4 4-4 4"/>'
  };
  function setIcon(node, name) {
    node.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + '</svg>';
  }
  /* Square icon button with a tooltip. tip is also what screen readers read. */
  function iconBtn(tag, name, tip) {
    var b = el(tag, 'rr-icon-btn');
    if (tag === 'button') b.type = 'button';
    setIcon(b, name);
    b.setAttribute('data-rr-tip', tip);
    b.setAttribute('aria-label', tip);
    return b;
  }

  /* ---- Build the frame ---- */
  var body = document.body;
  var main = document.querySelector('main');
  var mainId = body.getAttribute('data-rr-main') || 'news';
  var tabs = TABSETS[body.getAttribute('data-rr-tabs')] || [];

  var app = el('div', 'rr-app');
  body.insertBefore(app, body.firstChild);

  var topbar = el('header', 'rr-topbar');
  var logo = el('a', 'rr-logo');
  logo.href = 'raceroom.html';
  logo.setAttribute('aria-label', 'Race Club home');
  var logoImg = el('img', 'rr-logo-img');
  logoImg.src = 'assets/images/rr-RC-title-x.png';
  logoImg.alt = 'Race Club';
  logo.appendChild(logoImg);
  var nav = el('nav', 'rr-nav');
  nav.setAttribute('aria-label', 'Main menu');
  var backBtn = iconBtn('button', 'back', 'Back');
  var forwardBtn = iconBtn('button', 'forward', 'Forward');
  var homeBtn = iconBtn('a', 'home', 'Home');
  homeBtn.href = 'raceroom.html';
  add(nav, backBtn, forwardBtn, homeBtn);
  MENU.forEach(function (item) {
    var a = el('a', 'rr-nav-item', item.label);
    a.href = item.href;
    if (item.id === mainId) a.setAttribute('aria-current', 'page');
    nav.appendChild(a);
  });
  /* Admin log in / log out. The login system itself is not built yet, so a click does nothing. */
  var topEnd = el('div', 'rr-topbar-end');
  var adminBtn = iconBtn('button', 'login', 'Log in');
  adminBtn.classList.add('rr-tip-end');
  topEnd.appendChild(adminBtn);
  add(topbar, logo, nav, topEnd);

  var head = el('div', 'rr-page-head');
  var title = el('h1', 'rr-page-title', body.getAttribute('data-rr-title') || '');
  var tools = el('div', 'rr-head-tools');
  add(head, title, tools);

  var subtabs = el('nav', 'rr-subtabs');
  subtabs.setAttribute('aria-label', 'Sections');
  tabs.forEach(function (t) {
    var a = el('a', 'rr-subtab', t[1]);
    a.href = '#' + t[0];
    a.setAttribute('data-rr-tab', t[0]);
    subtabs.appendChild(a);
  });
  if (!tabs.length) subtabs.hidden = true;

  var bottom = el('footer', 'rr-bottombar');

  main.classList.add('rr-content');
  add(app, topbar, head, subtabs, main, bottom);

  /* ---- Back / Forward: steps through the places visited on this site, in this browser tab ---- */
  var NAV_KEY = 'rr-nav';
  function navLoad() {
    var raw = '';
    try { raw = sessionStorage.getItem(NAV_KEY) || ''; } catch (e) {}
    if (!raw && String(window.name).indexOf(NAV_KEY + ':') === 0) raw = window.name.slice(NAV_KEY.length + 1);
    try { var v = JSON.parse(raw); if (v && v.list && v.list.length) return v; } catch (e) {}
    return { list: [], at: -1 };
  }
  function navSave(v) {
    var raw = JSON.stringify(v);
    try { sessionStorage.setItem(NAV_KEY, raw); } catch (e) {}
    try { window.name = NAV_KEY + ':' + raw; } catch (e) {}
  }
  function navHere() {
    var file = location.pathname.split('/').pop() || 'raceroom.html';
    var hash = location.hash;
    if (tabs.length) hash = '#' + tabs[currentTab()][0];
    else if (hash === '#' || hash === '#page-1') hash = '';
    return file + location.search + hash;
  }
  function navButtons(v) {
    backBtn.setAttribute('aria-disabled', v.at > 0 ? 'false' : 'true');
    forwardBtn.setAttribute('aria-disabled', v.at < v.list.length - 1 ? 'false' : 'true');
  }
  var navFirstRecord = true;
  function navRecord() {
    var v = navLoad(), here = navHere();
    var viaOurButtons = v.pending === here;   /* our Back or Forward just brought us here */
    delete v.pending;
    /* The browser's own back/forward buttons (only knowable when the page itself loaded that way). */
    var browserStep = false;
    if (navFirstRecord) {
      try { browserStep = performance.getEntriesByType('navigation')[0].type === 'back_forward'; } catch (e) {}
    }
    navFirstRecord = false;
    if (viaOurButtons || v.list[v.at] === here) { /* already at this spot in the list: nothing to add */ }
    else if (browserStep && v.list[v.at - 1] === here) v.at--;
    else if (browserStep && v.list[v.at + 1] === here) v.at++;
    else {
      /* Any link, tab, pill or the Home button: a new step, even if we have been here before. */
      v.list = v.list.slice(0, v.at + 1);
      v.list.push(here);
      if (v.list.length > 50) v.list.shift();
      v.at = v.list.length - 1;
    }
    navSave(v);
    navButtons(v);
  }
  function navGo(step) {
    var v = navLoad(), target = v.list[v.at + step];
    if (!target) return;
    v.at += step;
    v.pending = target;
    navSave(v);
    navButtons(v);
    location.href = target;
  }
  backBtn.addEventListener('click', function () { navGo(-1); });
  forwardBtn.addEventListener('click', function () { navGo(1); });

  /* ---- Bottom bar: previous / next SUB-TAB only. It never links between main sections. ---- */
  function step(label, href, key) {
    var a = el('a', 'rr-step');
    a.href = href;
    add(a, el('span', 'rr-step-key', key), el('span', '', label));
    return a;
  }
  function setSteps(prev, next) {
    bottom.textContent = '';
    if (prev) bottom.appendChild(step(prev.label, prev.href, '‹'));
    if (next) bottom.appendChild(step(next.label, next.href, '›'));
  }

  /* ---- Sub-tab switching (no page reload, address keeps the tab) ---- */
  function currentTab() {
    var want = (location.hash || '').replace('#', '');
    for (var i = 0; i < tabs.length; i++) if (tabs[i][0] === want) return i;
    return 0;
  }
  function showTab() {
    if (!tabs.length) {
      /* No sub-tabs here (News, a post, the driver list): the bottom bar stays empty. */
      setSteps(null, null);
      return;
    }
    var i = currentTab(), id = tabs[i][0];
    Array.prototype.forEach.call(main.querySelectorAll('[data-rr-view]'), function (v) {
      v.hidden = v.getAttribute('data-rr-view') !== id;
    });
    Array.prototype.forEach.call(subtabs.children, function (a) {
      if (a.getAttribute('data-rr-tab') === id) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    Array.prototype.forEach.call(tools.children, function (t) {
      var only = t.getAttribute('data-rr-for');
      t.hidden = !!only && only !== id;
    });
    setSteps(
      tabs[i - 1] && { label: tabs[i - 1][1], href: '#' + tabs[i - 1][0] },
      tabs[i + 1] && { label: tabs[i + 1][1], href: '#' + tabs[i + 1][0] }
    );
    main.scrollTop = 0;
  }
  window.addEventListener('hashchange', function () { showTab(); navRecord(); });

  /* ================= Shared builders (the only way to make these parts) ================= */
  var RR = {};
  RR.el = el;
  RR.add = add;
  RR.dash = dash;
  RR.refresh = showTab;
  RR.setTitle = function (text) { title.textContent = text; document.title = text + ' | Race Club'; };
  RR.setSteps = setSteps;
  RR.view = function (id) { return main.querySelector('[data-rr-view="' + id + '"]') || main; };
  RR.param = function (name) { return new URLSearchParams(location.search).get(name); };

  /* Switch the top-right icon between Log in and Log out (for the future admin login). */
  RR.setAdmin = function (signedIn) {
    setIcon(adminBtn, signedIn ? 'logout' : 'login');
    adminBtn.setAttribute('data-rr-tip', signedIn ? 'Log out' : 'Log in');
    adminBtn.setAttribute('aria-label', signedIn ? 'Log out' : 'Log in');
  };

  /* Give any button or link the standard tooltip. */
  RR.tip = function (node, text) { node.setAttribute('data-rr-tip', text); return node; };

  /* Let a page's content fill the whole content area (used so a paged block keeps one height). */
  RR.fillContent = function () { main.classList.add('rr-content-fill'); };

  /* Page pills. Returns the row to place right under the paged block. count pages, current is 1-based.
     Hidden when there is only one page. */
  RR.pager = function (count, current, onPick) {
    var pager = el('nav', 'rr-pager');
    pager.setAttribute('aria-label', 'Pages');
    pager.hidden = count < 2;
    for (var n = 1; n <= count; n++) (function (n) {
      var b = el('button', 'rr-pill');
      b.type = 'button';
      b.setAttribute('aria-label', 'Page ' + n);
      if (n === current) b.setAttribute('aria-current', 'page');
      b.addEventListener('click', function () { onPick(n); });
      pager.appendChild(b);
    })(n);
    return pager;
  };

  /* Put an option control in the page title row. viewId (optional) shows it on one sub-tab only. */
  RR.headTool = function (node, viewId) {
    if (viewId) node.setAttribute('data-rr-for', viewId);
    tools.appendChild(node);
    return node;
  };

  /* Formats used everywhere */
  RR.pos = function (n) { return n ? 'P' + n : '-'; };
  RR.lap = function (ms) {
    if (!ms) return '-';
    var m = Math.floor(ms / 60000), s = (ms % 60000) / 1000;
    return m + 'm ' + (s < 10 ? '0' : '') + s.toFixed(3) + 's';
  };
  RR.gap = function (ms) { return ms ? '+' + (ms / 1000).toFixed(3) : '-'; };
  RR.num = function (n) { return Number(n).toLocaleString('en-US'); };

  RR.heading = function (text) { return el('h2', 'rr-heading', text); };
  RR.label = function (text) { return el('div', 'rr-label', text); };
  RR.tag = function (text, outline) { return el('span', outline ? 'rr-tag-outline' : 'rr-tag', text); };
  RR.empty = function (text) { return el('p', 'rr-empty', text); };
  RR.delta = function (n) {
    if (!n) return el('span', '', '-');
    return el('span', n > 0 ? 'rr-delta-up' : 'rr-delta-down', (n > 0 ? '▲ ' : '▼ ') + Math.abs(n));
  };

  /* Two-line cell: main line + small second line */
  RR.cell = function (mainText, subText) {
    var w = el('span');
    add(w, el('span', 'rr-cell-main', dash(mainText)), subText ? el('span', 'rr-cell-sub', subText) : null);
    return w;
  };

  /* Table. cols: [{key, label, num, sorted}]  rows: [{cells:{key: text|Node}, href, me}] */
  RR.table = function (cols, rows, emptyText) {
    if (!rows.length) return RR.empty(emptyText || 'Nothing here yet.');
    var wrap = el('div', 'rr-table-wrap'), table = el('table', 'rr-table');
    var thead = el('thead'), trh = el('tr');
    cols.forEach(function (c) {
      var th = el('th', (c.num ? 'rr-num ' : '') + (c.sorted ? 'rr-sorted' : ''), c.label);
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    var tbody = el('tbody');
    rows.forEach(function (r) {
      var tr = el('tr', (r.href ? 'rr-row-link ' : '') + (r.me ? 'rr-row-me' : ''));
      cols.forEach(function (c, i) {
        var td = el('td', c.num ? 'rr-num' : ''), v = r.cells[c.key];
        if (v && v.nodeType) td.appendChild(v); else td.textContent = dash(v);
        if (r.href && i === (r.linkCol || 0)) {
          var a = el('a', 'rr-link');
          a.href = r.href;
          while (td.firstChild) a.appendChild(td.firstChild);
          td.appendChild(a);
        }
        tr.appendChild(td);
      });
      if (r.href) tr.addEventListener('click', function (e) {
        if (!e.target.closest('a')) location.href = r.href;
      });
      tbody.appendChild(tr);
    });
    add(table, thead, tbody);
    wrap.appendChild(table);
    return wrap;
  };

  /* Stat tile */
  RR.stat = function (label, value, note) {
    return add(el('div', 'rr-stat'), RR.label(label), el('div', 'rr-stat-value', dash(value)),
      note ? el('div', 'rr-note', note) : null);
  };
  RR.statRow = function (tiles) {
    var row = el('div', 'rr-row-stats');
    tiles.forEach(function (t) { row.appendChild(t); });
    return row;
  };

  /* Label and value */
  RR.kv = function (label, value, inRow) {
    return add(el('div', 'rr-kv' + (inRow ? ' rr-kv-row' : '')), RR.label(label), el('div', 'rr-kv-value', dash(value)));
  };

  /* Card. status: {earned:'15.11.2026'} | {progress:[2,10]} | {notYet:true} */
  RR.card = function (o) {
    var c = el(o.href ? 'a' : 'div', 'rr-card' + (o.href ? ' rr-block-link' : ''));
    if (o.href) c.href = o.href;
    c.appendChild(el('h3', 'rr-card-title', o.title));
    var s = o.status || {};
    if (s.earned) c.appendChild(RR.label('Earned ' + s.earned));
    else if (s.progress) {
      c.appendChild(RR.label(RR.num(s.progress[0]) + ' / ' + RR.num(s.progress[1])));
    } else if (s.notYet) c.appendChild(RR.tag('Not yet', true));
    if (o.desc) c.appendChild(el('p', 'rr-body', o.desc));
    if (s.progress) {
      var bar = el('div', 'rr-progress'), fill = el('div', 'rr-progress-fill');
      fill.style.width = Math.min(100, s.progress[0] / s.progress[1] * 100) + '%';
      bar.appendChild(fill);
      c.appendChild(bar);
    }
    return c;
  };

  /* Promo tile (a big block that is a link, so it gets a white border on hover) */
  RR.promo = function (o) {
    var a = el('a', 'rr-promo rr-block-link' + (o.feature ? ' rr-promo-feature' : ''));
    a.href = o.href;
    if (o.photo) { a.classList.add('rr-has-photo'); a.style.backgroundImage = 'url("' + o.photo + '")'; }
    if (o.tag) a.appendChild(add(el('span', 'rr-tile-corner'), RR.tag(o.tag)));
    if (o.eyebrow) a.appendChild(el('div', 'rr-label rr-red', o.eyebrow));
    a.appendChild(el('h3', 'rr-tile-title', o.title));
    var foot = el('div', 'rr-promo-foot');
    add(foot, el('p', 'rr-body', o.desc || ''), el('span', 'rr-btn', o.button || 'Read'));
    a.appendChild(foot);
    return a;
  };

  /* Ranked bar list. items: [{name, value}] */
  RR.barlist = function (titleText, unit, items) {
    var box = el('div', 'rr-barlist');
    box.appendChild(add(el('div', 'rr-barlist-head'), RR.heading(titleText), RR.label(unit)));
    var max = 0;
    items.forEach(function (it) { if (it.value > max) max = it.value; });
    if (!items.length) box.appendChild(el('p', 'rr-body', 'Nothing here yet.'));
    items.forEach(function (it, i) {
      var bar = el('div', 'rr-bar');
      bar.style.width = (max ? it.value / max * 100 : 0) + '%';
      box.appendChild(add(el('div', 'rr-barlist-row'),
        el('span', 'rr-label', i + 1), el('span', 'rr-barlist-name', it.name),
        add(el('span'), bar), el('span', 'rr-barlist-value', RR.num(it.value))));
    });
    return box;
  };

  /* Filter group (2 to 5 options). options: [[value, label]] */
  RR.segment = function (options, onChange) {
    var box = el('div', 'rr-segment');
    options.forEach(function (o, i) {
      var b = el('button', 'rr-segment-option', o[1]);
      b.type = 'button';
      b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
      b.addEventListener('click', function () {
        Array.prototype.forEach.call(box.children, function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        onChange(o[0]);
      });
      box.appendChild(b);
    });
    return box;
  };

  /* Dropdown. Shows LABEL then the chosen value in bold, with an arrow box. options: [[value, label]] */
  RR.select = function (labelText, options, onChange) {
    var box = el('div', 'rr-select'), btn = el('button', 'rr-select-btn');
    var value = el('span', 'rr-select-value', options[0][1]);
    var list = el('ul', 'rr-select-list'), picked = 0, focus = 0;
    btn.type = 'button';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    add(btn, add(el('span', 'rr-select-text'), el('span', 'rr-select-label', labelText), value), el('span', 'rr-select-arrow'));
    list.setAttribute('role', 'listbox');
    list.hidden = true;
    function mark() {
      Array.prototype.forEach.call(list.children, function (li, i) {
        li.setAttribute('aria-selected', i === picked ? 'true' : 'false');
        li.setAttribute('data-rr-focus', i === focus ? 'true' : 'false');
      });
    }
    function open(on) {
      list.hidden = !on;
      btn.setAttribute('aria-expanded', on ? 'true' : 'false');
      focus = picked;
      mark();
    }
    function choose(i) {
      var changed = i !== picked;
      picked = i;
      value.textContent = options[i][1];
      open(false);
      if (changed) onChange(options[i][0]);
    }
    options.forEach(function (o, i) {
      var li = el('li', 'rr-select-option', o[1]);
      li.setAttribute('role', 'option');
      li.addEventListener('click', function () { choose(i); });
      li.addEventListener('mouseenter', function () { focus = i; mark(); });
      list.appendChild(li);
    });
    btn.addEventListener('click', function () { open(list.hidden); });
    btn.addEventListener('keydown', function (e) {
      var isOpen = !list.hidden;
      if (e.key === 'Escape') { open(false); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!isOpen) { open(true); return; }
        focus = Math.max(0, Math.min(options.length - 1, focus + (e.key === 'ArrowDown' ? 1 : -1)));
        mark();
      } else if ((e.key === 'Enter' || e.key === ' ') && isOpen) { e.preventDefault(); choose(focus); }
    });
    document.addEventListener('click', function (e) { if (!box.contains(e.target)) open(false); });
    add(box, btn, list);
    mark();
    return box;
  };

  /* Check box: a square with a solid square inside when on, label beside it. */
  RR.checkbox = function (labelText, onChange, checked) {
    var box = el('label', 'rr-check'), input = el('input');
    input.type = 'checkbox';
    input.checked = !!checked;
    input.addEventListener('change', function () { onChange(input.checked); });
    return add(box, input, el('span', 'rr-check-box'), el('span', '', labelText));
  };

  /* Sidebar list. items: [[value, label, count]] */
  RR.sidelist = function (items, onChange) {
    var box = el('div', 'rr-sidelist');
    items.forEach(function (it, i) {
      var b = el('button', 'rr-sidelist-row');
      b.type = 'button';
      b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
      add(b, el('span', '', it[1]), it[2] !== undefined ? el('span', '', it[2]) : null);
      b.addEventListener('click', function () {
        Array.prototype.forEach.call(box.children, function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        onChange(it[0]);
      });
      box.appendChild(b);
    });
    return box;
  };

  window.RR = RR;
  showTab();
  navRecord();
})();
