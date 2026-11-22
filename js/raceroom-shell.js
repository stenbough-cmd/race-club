/* Race Club RaceRoom site: shared shell and shared building blocks.
   Draws the top bar (with Back, Forward, Home and the admin log in icon),
   page title row, sub-tabs and bottom bar on
   every page from ONE menu list, so they are identical everywhere.
   Also holds the only builders for tables, cards, tiles and options (RR.*),
   so every list and option on the site looks the same.

   A page tells the shell what it is with attributes on <body>:
     data-rr-main="news|leaderboards|profiles"   which main menu item is active (any other word, such as home, highlights none)
     data-rr-tabs="leaderboards|profile"         which sub-tab set to show (optional)
     data-rr-title="Page title"                  starting page title
   Sub-tab content lives in <section data-rr-view="tab-id"> inside <main>. */
(function () {
  'use strict';

  /* ---- The one menu list. Change the site menu here and nowhere else. ---- */
  var MENU = [
    { id: 'news', label: 'News', href: 'news.html' },
    { id: 'leaderboards', label: 'Leaderboards', href: 'leaderboards.html' },
    { id: 'profiles', label: 'Drivers', href: 'drivers.html' }
  ];
  /* The short legal notice shown at the bottom of every page. The full text is on legal.html. */
  /* The site version, shown in the footer of every page. Change it here and nowhere else each time the site is updated. */
  var VERSION = '0.1.1';
  var LEGAL_SHORT = 'Race Club is an independent community-run sim racing league and is not affiliated with, endorsed by, or sponsored by RaceRoom, KW Studios, RaceRoom Entertainment AG, any racing team, vehicle manufacturer, race circuit, racing series, or trademark owner. All trademarks, logos, team names, liveries, vehicle names, and circuit names are the property of their respective owners and are used for identification and informational purposes only.';
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
      ['achievements', 'Achievements'],
      ['boards', 'Leaderboards']
    ],
    /* Admin Website Options: reminders for changing parts of the site. */
    options: [
      ['pictures', 'Tile pictures'],
      ['database', 'Picture database']
    ],
    /* Admin season wizard: one sub-tab per step. */
    admin: [
      ['season', '1 Season'],
      ['cars', '2 Classes and cars'],
      ['rules', '3 Rules'],
      ['weekend', '4 Weekend format'],
      ['points', '5 Points'],
      ['calendar', '6 Calendar'],
      ['export', '7 Review and export']
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
    logout: '<path d="M10 4H4v16h6"/><path d="M10 12h11"/><path d="M17 8l4 4-4 4"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.6 2.3c-.8.4-1.2 1-1.2 1.8"/><path d="M12 17h.01"/>',
    admin: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    protest: '<path d="M5 21V4"/><path d="M5 4h12l-2.5 4 2.5 4H5"/>',
    save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3"/><path d="M8 21v-7h8v7"/>',
    create: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8"/><path d="M8 12h8"/>',
    startover: '<path d="M4 12a8 8 0 1 0 2.5-5.8"/><path d="M4 4v5h5"/>',
    trash: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/><path d="M10 11v5"/><path d="M14 11v5"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5"/><path d="M12 16.5h.01"/>'
  };
  function iconSvg(name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + '</svg>';
  }
  function setIcon(node, name) { node.innerHTML = iconSvg(name); }

  /* Two-click confirm. The first click turns the button red and shows `text` in its tooltip; a second click
     within 3 seconds runs `action`. After 3 seconds the button goes back to normal. */
  function disarm(node) {
    clearTimeout(node._rrArm);
    node._rrArm = null;
    node.classList.remove('rr-confirming');
    var was = node._rrWas || {};
    if (was.tip === null || was.tip === undefined) node.removeAttribute('data-rr-tip'); else node.setAttribute('data-rr-tip', was.tip);
    if (was.label !== null && was.label !== undefined) node.setAttribute('aria-label', was.label);
  }
  function armClick(node, text, action) {
    if (node._rrArm) { disarm(node); action(); return; }
    node._rrWas = { tip: node.getAttribute('data-rr-tip'), label: node.getAttribute('aria-label') };
    node.classList.add('rr-confirming');
    node.setAttribute('data-rr-tip', text);
    if (node._rrWas.label !== null) node.setAttribute('aria-label', text);
    node._rrArm = setTimeout(function () { disarm(node); }, 3000);
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

  /* ---- Admin log in ----
     The session is kept for this browser tab only and ends when the tab is closed, after 6 hours, or on Log out.
     The service address (the Apps Script web app) comes from js/config.js, so an admin types only a name and password.
     Nothing here protects data by itself: every admin request is checked again by the service. */
  var ADMIN_KEY = 'rr-admin';
  function adminLoad() {
    try {
      var a = JSON.parse(sessionStorage.getItem(ADMIN_KEY));
      if (a && a.token && a.until > Date.now()) return a;
    } catch (e) {}
    return null;
  }
  function adminClear() { try { sessionStorage.removeItem(ADMIN_KEY); } catch (e) {} }
  function apiAddress() { return (window.RC_CONFIG && window.RC_CONFIG.service) || ''; }
  function apiGood(url) { return /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url); }
  /* One request to the service. Answers a promise of { ok: true, ... } or { ok: false, error: 'word' }. */
  function apiCall(url, payload) {
    if (!apiGood(url)) return Promise.resolve({ ok: false, error: 'no-address' });
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json(); })
      .catch(function () { return { ok: false, error: 'unreachable' }; });
  }

  /* ---- Build the frame ---- */
  var body = document.body;
  /* A page marked data-rr-admin="required" is only for a logged-in admin. */
  if (body.getAttribute('data-rr-admin') === 'required' && !adminLoad()) location.replace('login.html');
  var main = document.querySelector('main');
  var mainId = body.getAttribute('data-rr-main') || 'news';
  var tabs = TABSETS[body.getAttribute('data-rr-tabs')] || [];

  var app = el('div', 'rr-app');
  body.insertBefore(app, body.firstChild);

  var topbar = el('header', 'rr-topbar');
  var logo = el('a', 'rr-logo');
  logo.href = 'index.html';
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
  homeBtn.href = 'index.html';
  homeBtn.classList.add('rr-icon-solid');
  /* Back and Forward are hidden in portrait (phones have their own); see css. */
  backBtn.classList.add('rr-hide-portrait');
  forwardBtn.classList.add('rr-hide-portrait');
  add(nav, backBtn, forwardBtn, homeBtn);
  MENU.forEach(function (item) {
    var a = el('a', 'rr-nav-item', item.label);
    a.href = item.href;
    if (item.id === mainId) a.setAttribute('aria-current', 'page');
    nav.appendChild(a);
  });
  /* Icon area at the far right (not part of the navbar): Help, Protest, then admin Log in / Log out.
     Help and Protest do nothing yet. Each will be wired up when its feature is designed. */
  var topEnd = el('div', 'rr-topbar-end');
  var helpBtn = iconBtn('button', 'help', 'Help');
  var protestBtn = iconBtn('button', 'protest', 'Protest');
  /* Admin (cogwheel icon): only shown while an admin is logged in. It opens the admin hub. */
  var adminLink = iconBtn('a', 'admin', 'Admin');
  adminLink.href = 'admin.html';
  if (mainId === 'admin') adminLink.setAttribute('aria-current', 'page');
  var adminBtn = iconBtn('button', 'login', 'Log in');
  adminBtn.classList.add('rr-tip-end');
  add(topEnd, helpBtn, protestBtn, adminLink, adminBtn);
  add(topbar, logo, nav, topEnd);
  /* Keep the menu buttons on one row: if the row does not fit beside the logo and icons, send the whole row
     to its own line (the CSS class rr-topbar-stacked). Checked on load and whenever the window changes. */
  function fitTopbar() {
    topbar.classList.remove('rr-topbar-stacked');
    if (nav.offsetTop > logo.offsetTop + 4 || topEnd.offsetTop > logo.offsetTop + 4) topbar.classList.add('rr-topbar-stacked');
  }
  window.addEventListener('resize', fitTopbar);
  window.addEventListener('load', fitTopbar);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTopbar);

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

  /* Bottom bar: the legal notice at the left (the same on every page) and the previous / next sub-tab links at the right. */
  var bottom = el('footer', 'rr-bottombar');
  var legal = el('div', 'rr-legal');
  legal.appendChild(el('span', 'rr-legal-text', LEGAL_SHORT));
  var legalLink = el('a', 'rr-legal-link', 'Legal Disclaimer');
  legalLink.href = 'legal.html';
  legal.appendChild(legalLink);
  add(bottom, legal, el('div', 'rr-version', 'Version ' + VERSION));

  /* Previous / next links that sit just above the footer line. Only the Leaderboards sub-tabs and a news story
     use them (see setSteps); everywhere else the row is empty and not shown. */
  var steps = el('div', 'rr-steps');
  steps.setAttribute('aria-label', 'Previous and next');

  /* The page content and the footer scroll together inside one scroll area, so the footer line moves with the page.
     On a short page the footer still rests at the bottom of the window. */
  var scroller = el('div', 'rr-scroll');
  var foot = el('div', 'rr-foot');
  add(foot, steps, bottom);
  main.classList.add('rr-content');
  add(scroller, main, foot);
  add(app, topbar, head, subtabs, scroller);

  /* ---- Back / Forward: steps through the places visited on this site, in this browser tab ---- */
  var NAV_KEY = 'rc-nav';   /* renamed when the pages were renamed, so old page names are forgotten */
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
    var file = location.pathname.split('/').pop() || 'index.html';
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

  /* ---- Sub-tab switching (no page reload, address keeps the tab) ---- */
  function currentTab() {
    var want = (location.hash || '').replace('#', '');
    for (var i = 0; i < tabs.length; i++) if (tabs[i][0] === want) return i;
    return 0;
  }
  function step(label, href, key) {
    var a = el('a', 'rr-step');
    a.href = href;
    add(a, el('span', 'rr-step-key', key), el('span', '', label));
    return a;
  }
  /* prev / next are { label, href } or null. */
  function setSteps(prev, next) {
    steps.textContent = '';
    if (prev) steps.appendChild(step(prev.label, prev.href, '\u2039'));
    if (next) steps.appendChild(step(next.label, next.href, '\u203A'));
  }
  var shownTab = null;
  function showTab() {
    if (!tabs.length) return;   /* no sub-tabs here (News, a post, the driver list) */
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
    /* Previous / next sub-tab links: the Leaderboards page only. */
    if (body.getAttribute('data-rr-tabs') === 'leaderboards') {
      setSteps(
        tabs[i - 1] && { label: tabs[i - 1][1], href: '#' + tabs[i - 1][0] },
        tabs[i + 1] && { label: tabs[i + 1][1], href: '#' + tabs[i + 1][0] }
      );
    }
    /* Go to the top only when a different sub-tab opens. Redrawing the one already open (opening a
       class in the wizard, adding a round) must leave the page exactly where the reader is. */
    if (id !== shownTab) scroller.scrollTop = 0;
    shownTab = id;
  }
  window.addEventListener('hashchange', function () { showTab(); navRecord(); });

  /* ---- Button tick: a very short click sound on every button, and on links that look like buttons ---- */
  var tickAudio = null;
  function tick() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      tickAudio = tickAudio || new AC();
      if (tickAudio.state === 'suspended') tickAudio.resume();
      var t = tickAudio.currentTime, osc = tickAudio.createOscillator(), gain = tickAudio.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1800, t);
      osc.frequency.exponentialRampToValueAtTime(900, t + 0.03);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.05, t + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
      osc.connect(gain);
      gain.connect(tickAudio.destination);
      osc.start(t);
      osc.stop(t + 0.04);
    } catch (e) {}
  }
  document.addEventListener('click', function (e) {
    var n = e.target && e.target.closest ? e.target.closest('button, a.rr-btn, a.rr-icon-btn, a.rr-nav-item, a.rr-subtab, a.rr-step, a.rr-promo, a.rr-logo') : null;
    if (!n || n.disabled || n.getAttribute('aria-disabled') === 'true') return;
    tick();
  }, true);

  /* ================= Shared builders (the only way to make these parts) ================= */
  var RR = {};
  RR.el = el;
  RR.add = add;
  RR.dash = dash;
  RR.refresh = showTab;
  RR.setTitle = function (text) { title.textContent = text; document.title = text + ' | Race Club'; };
  RR.view = function (id) { return main.querySelector('[data-rr-view="' + id + '"]') || main; };
  RR.param = function (name) { return new URLSearchParams(location.search).get(name); };

  /* Switch the top-right icon between Log in and Log out. */
  RR.setAdmin = function (signedIn) {
    adminLink.hidden = !signedIn;
    setIcon(adminBtn, signedIn ? 'logout' : 'login');
    disarm(adminBtn);
    adminBtn.setAttribute('data-rr-tip', signedIn ? 'Log out' : 'Log in');
    adminBtn.setAttribute('aria-label', signedIn ? 'Log out' : 'Log in');
  };
  RR.setAdmin(!!adminLoad());
  adminBtn.addEventListener('click', function () {
    var a = adminLoad();
    if (!a) { location.href = 'login.html'; return; }
    armClick(adminBtn, 'Confirm log out', function () {
      adminClear();
      apiCall(apiAddress(), { action: 'logout', token: a.token }).then(function () { location.href = 'index.html'; });
    });
  });

  /* The logged-in admin ({ name }) or null. */
  RR.admin = function () { var a = adminLoad(); return a ? { name: a.name } : null; };
  /* Log in. Answers a promise of { ok: true } or { ok: false, error }. */
  RR.signIn = function (name, password) {
    return apiCall(apiAddress(), { action: 'login', name: name, password: password }).then(function (res) {
      if (!res || !res.ok) return res || { ok: false, error: 'unreachable' };
      try {
        sessionStorage.setItem(ADMIN_KEY, JSON.stringify({ name: res.name, token: res.token, until: Date.now() + res.seconds * 1000 }));
      } catch (e) { return { ok: false, error: 'storage' }; }
      return { ok: true };
    });
  };
  /* An admin request to the service, for example RR.api('listSeasons'). If the session has ended,
     the browser is sent to the log in page. */
  RR.api = function (action, data) {
    var a = adminLoad(), payload = { action: action, token: a ? a.token : '' };
    Object.keys(data || {}).forEach(function (k) { payload[k] = data[k]; });
    return apiCall(apiAddress(), payload).then(function (res) {
      if (res && res.error === 'signed-out') { adminClear(); location.href = 'login.html'; }
      return res;
    });
  };

  /* Give any button or link the standard tooltip. */
  RR.tip = function (node, text) { node.setAttribute('data-rr-tip', text); return node; };

  /* Let a page's content fill the whole content area (used so a paged block keeps one height). */
  RR.version = VERSION;
  RR.scrollTop = function () { scroller.scrollTop = 0; };
  RR.setSteps = setSteps;
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
  RR.statRow = function (tiles, compact) {
    var row = el('div', 'rr-row-stats' + (compact ? ' rr-row-stats-compact' : ''));
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

  /* Promo tile (a big block that is a link, so it gets a border on hover).
     Without an href it is a placeholder for something not built yet: no link, no button, and a NOT YET tag. */
  RR.promo = function (o) {
    var soon = !o.href;
    var a = el(soon ? 'div' : 'a', 'rr-promo' + (soon ? ' rr-promo-soon' : ' rr-block-link') + (o.feature ? ' rr-promo-feature' : ''));
    if (!soon) a.href = o.href;
    if (o.photo) { a.classList.add('rr-has-photo'); a.style.backgroundImage = 'url("' + o.photo + '")'; }
    if (soon) a.appendChild(add(el('span', 'rr-tile-corner'), RR.tag('Not yet', true)));
    else if (o.tag) a.appendChild(add(el('span', 'rr-tile-corner'), RR.tag(o.tag)));
    if (o.eyebrow) a.appendChild(el('div', 'rr-label rr-red', o.eyebrow));
    a.appendChild(el('h3', 'rr-tile-title', o.title));
    var foot = el('div', 'rr-promo-foot');
    add(foot, el('p', 'rr-body', o.desc || ''), soon ? null : el('span', 'rr-btn', o.button || 'Read'));
    a.appendChild(foot);
    return a;
  };


  /* Ranking strip: the top of a table as tiles. Rank 1 is large, 2 and 3 medium, 4 to 7 small.
     items: [{ title, sub, value, valueLabel, href }] in rank order (up to 7). Every tile is a link and lifts on hover. */
  RR.strip = function (items) {
    var box = el('div', 'rr-strip');
    items.slice(0, 7).forEach(function (it, i) {
      var t = el(it.href ? 'a' : 'div', 'rr-rank-tile rr-rank-' + (i + 1) + (it.href ? ' rr-block-link' : ''));
      if (it.href) t.href = it.href;
      add(t, el('div', 'rr-rank-no', RR.pos(i + 1)), el('h3', 'rr-rank-name', it.title), it.sub ? el('div', 'rr-note', it.sub) : null,
        add(el('div', 'rr-rank-value'), el('span', 'rr-stat-value', dash(it.value)), it.valueLabel ? RR.label(it.valueLabel) : null));
      box.appendChild(t);
    });
    return box;
  };

  /* Four-column totals block. columns: [{ title, rows: [[label, value]] }] */
  RR.totals = function (columns) {
    var box = el('div', 'rr-totals');
    columns.forEach(function (c) {
      var col = el('div', 'rr-panel rr-totals-col');
      col.appendChild(RR.heading(c.title));
      c.rows.forEach(function (r) { col.appendChild(RR.kv(r[0], r[1], true)); });
      box.appendChild(col);
    });
    return box;
  };

  /* Radar chart. axes: [{ label, value }] with value 0 to 100. Draws a thin web, a red shape, and label plus value at each point. */
  RR.radar = function (axes) {
    var NS = 'http://www.w3.org/2000/svg', W = 380, H = 280, cx = W / 2, cy = H / 2, R = 88, n = axes.length;
    function node(tag, attrs, text) {
      var x = document.createElementNS(NS, tag);
      Object.keys(attrs || {}).forEach(function (k) { x.setAttribute(k, attrs[k]); });
      if (text !== undefined) x.textContent = text;
      return x;
    }
    function point(i, f) { var a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * R * f, cy + Math.sin(a) * R * f]; }
    function poly(f) { return axes.map(function (_, i) { return point(i, f).map(function (v) { return v.toFixed(1); }).join(','); }).join(' '); }
    var svg = node('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'rr-radar-svg', role: 'img', 'aria-label': 'Driver profile: ' + axes.map(function (a) { return a.label + ' ' + a.value; }).join(', ') });
    [0.25, 0.5, 0.75, 1].forEach(function (f) { svg.appendChild(node('polygon', { points: poly(f), class: 'rr-radar-web' })); });
    axes.forEach(function (_, i) { var p = point(i, 1); svg.appendChild(node('line', { x1: cx, y1: cy, x2: p[0].toFixed(1), y2: p[1].toFixed(1), class: 'rr-radar-web' })); });
    svg.appendChild(node('polygon', { points: axes.map(function (a, i) { return point(i, Math.max(0, Math.min(100, a.value)) / 100).map(function (v) { return v.toFixed(1); }).join(','); }).join(' '), class: 'rr-radar-shape' }));
    axes.forEach(function (a, i) {
      var p = point(i, 1.22), anchor = Math.abs(p[0] - cx) < 4 ? 'middle' : (p[0] > cx ? 'start' : 'end'), dy = p[1] < cy - 4 ? -6 : (p[1] > cy + 4 ? 14 : 4);
      svg.appendChild(node('text', { x: p[0].toFixed(1), y: (p[1] + dy - 14).toFixed(1), 'text-anchor': anchor, class: 'rr-radar-label' }, a.label));
      svg.appendChild(node('text', { x: p[0].toFixed(1), y: (p[1] + dy + 6).toFixed(1), 'text-anchor': anchor, class: 'rr-radar-value' }, Math.round(a.value)));
    });
    return add(el('div', 'rr-panel rr-radar'), svg);
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

  /* Only one dropdown is open at a time; a click anywhere else closes it. */
  var openSelect = null;
  document.addEventListener('click', function (e) {
    if (openSelect && !openSelect.box.contains(e.target)) openSelect.close();
  });

  /* Dropdown. Shows LABEL then the chosen value in bold, with an arrow box. options: [[value, label]].
     initial (optional) is the value to start on. */
  RR.select = function (labelText, options, onChange, initial) {
    var box = el('div', 'rr-select'), btn = el('button', 'rr-select-btn');
    var list = el('ul', 'rr-select-list'), picked = 0, focus = 0;
    options.forEach(function (o, i) { if (initial !== undefined && String(o[0]) === String(initial)) picked = i; });
    var value = el('span', 'rr-select-value', options[picked][1]);
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
      if (on && openSelect && openSelect.box !== box) openSelect.close();
      list.hidden = !on;
      btn.setAttribute('aria-expanded', on ? 'true' : 'false');
      focus = picked;
      mark();
      if (on) {
        openSelect = { box: box, close: function () { open(false); } };
        var chosen = list.children[picked];
        if (chosen) list.scrollTop = chosen.offsetTop - 60;
      } else if (openSelect && openSelect.box === box) openSelect = null;
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
    add(box, btn, list);
    mark();
    return box;
  };

  /* Check box: a square with a solid square inside when on, label beside it.
     partial (optional) shows a dash: some, but not all, of the things under it are on. */
  RR.checkbox = function (labelText, onChange, checked, partial) {
    var box = el('label', 'rr-check' + (partial && !checked ? ' rr-check-partial' : '')), input = el('input');
    input.type = 'checkbox';
    input.checked = !!checked;
    input.addEventListener('change', function () { onChange(input.checked); });
    return add(box, input, el('span', 'rr-check-box'), el('span', '', labelText));
  };

  /* Text box in the same style as a dropdown: LABEL then what you type.
     o: { label, value, type ('text', 'number', 'date', 'time', 'password'), placeholder, min, max, wide, onChange,
          readOnly (shown but cannot be changed), invalid (red border: a check failed) } */
  RR.input = function (o) {
    var box = el('label', 'rr-input' + (o.wide ? ' rr-input-wide' : '')), input = el('input');
    input.type = o.type || 'text';
    if (o.value !== undefined && o.value !== null) input.value = o.value;
    if (o.placeholder) input.placeholder = o.placeholder;
    if (o.min !== undefined) input.min = o.min;
    if (o.max !== undefined) input.max = o.max;
    if (o.readOnly) { input.readOnly = true; input.tabIndex = -1; box.classList.add('rr-input-locked'); }
    if (o.invalid) box.setAttribute('aria-invalid', 'true');
    input.addEventListener('input', function () { if (o.onChange) o.onChange(input.value); });
    return add(box, el('span', 'rr-input-label', o.label), input);
  };

  /* Bigger text box for a few lines of text. o: { label, value, onChange } */
  RR.textarea = function (o) {
    var box = el('label', 'rr-input rr-textarea'), input = el('textarea');
    input.value = o.value || '';
    input.addEventListener('input', function () { o.onChange(input.value); });
    return add(box, el('span', 'rr-input-label', o.label), input);
  };

  /* Standard button. Outlined; pass save = true only for a button that writes to the sheet. */
  RR.button = function (text, onClick, save, icon) {
    var b = el('button', save ? 'rr-btn rr-btn-save' : 'rr-btn');
    b.type = 'button';
    if (icon) b.innerHTML = iconSvg(icon);
    b.appendChild(document.createTextNode(text));
    if (onClick) b.addEventListener('click', onClick);
    return b;
  };
  /* Make any button two-click. `hoverText` is its tooltip on hover (what it does). The first click turns it red with
     `confirmText` (for example "Confirm start over") as its tooltip; the second click within 3 seconds runs `action`.
     After 3 seconds it goes back to normal. */
  RR.arm = function (node, hoverText, confirmText, action) {
    node.setAttribute('data-rr-tip', hoverText);
    node.addEventListener('click', function () { armClick(node, confirmText, action); });
    return node;
  };
  /* Put a red exclamation in a circle behind the names of these sub-tabs, e.g. RR.flagTabs(['season', 'calendar']).
     An empty list clears every one. */
  RR.flagTabs = function (ids) {
    Array.prototype.forEach.call(subtabs.children, function (a) {
      var on = (ids || []).indexOf(a.getAttribute('data-rr-tab')) >= 0, mark = a.querySelector('.rr-subtab-alert');
      if (on && !mark) {
        mark = el('span', 'rr-subtab-alert');
        mark.setAttribute('role', 'img');
        mark.setAttribute('aria-label', 'Needs attention');
        mark.innerHTML = iconSvg('alert');
        a.appendChild(mark);
      } else if (!on && mark) a.removeChild(mark);
    });
  };

  /* One-line notice. kind: 'warn' (red edge) or 'ok' (white edge). */
  RR.notice = function (text, kind) { return el('p', 'rr-notice rr-notice-' + (kind || 'ok'), text); };

  /* A row of option boxes that wraps. */
  RR.row = function () {
    var r = el('div', 'rr-form-row');
    for (var i = 0; i < arguments.length; i++) if (arguments[i]) r.appendChild(arguments[i]);
    return r;
  };

  /* Option boxes in three even columns: every box is the same width, its name at the left and its
     value at the right, so a long list of settings can be read down the columns. */
  RR.grid = function () {
    var g = el('div', 'rr-form-grid');
    for (var i = 0; i < arguments.length; i++) if (arguments[i]) g.appendChild(arguments[i]);
    return g;
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
