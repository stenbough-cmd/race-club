/* Race Club RaceRoom site: admin log in page.
   Sends the name and password to the league's service (an Apps Script web app), which checks them
   against a salted hash. The password is never kept in the browser. Visitors never need this page. */
(function () {
  'use strict';
  var RR = window.RR, el = RR.el, add = RR.add;
  if (RR.admin()) { location.replace('admin.html'); return; }

  var form = { name: '', password: '' }, busy = false;
  var status = el('div');
  var ERRORS = {
    'no-address': 'The site is missing its service address. Tell the site admin.',
    'unreachable': 'The service could not be reached. Check your connection and try again.',
    'wrong': 'That name and password do not match.',
    'locked': 'Too many tries. Wait 15 minutes, then try again.',
    'storage': 'This browser is blocking storage, so the log in cannot be kept. Leave private browsing and try again.'
  };
  function say(text, kind) {
    status.textContent = '';
    if (text) status.appendChild(RR.notice(text, kind));
  }
  function logIn() {
    if (busy) return;
    if (!form.name || !form.password) { say('Type your admin name and password.', 'warn'); return; }
    busy = true;
    say('Checking...', 'ok');
    RR.signIn(form.name, form.password).then(function (res) {
      busy = false;
      if (res && res.ok) { location.href = 'admin.html'; return; }
      say(ERRORS[res && res.error] || 'Log in failed. The service answered: ' + ((res && (res.detail || res.error)) || 'nothing') + '.', 'warn');
    });
  }

  var panel = el('div', 'rr-panel rr-stack');
  add(panel,
    RR.row(
      RR.input({ label: 'Admin name', onChange: function (v) { form.name = v; } }),
      RR.input({ label: 'Password', type: 'password', onChange: function (v) { form.password = v; } }),
      RR.button('Log in', logIn)),
    status,
    el('p', 'rr-body', 'For league admins only.'));
  panel.addEventListener('keydown', function (e) { if (e.key === 'Enter') logIn(); });
  RR.view('login').appendChild(panel);
})();
