/* Race Club RaceRoom site: admin season wizard and server exporter (Stage 1).
   Runs entirely in the browser. Nothing is uploaded anywhere: the season is kept in this
   browser's storage and in the season file you save, and the server files are built here
   and downloaded as a .zip. Server passwords therefore never leave your computer.

   The server file format is recorded in the Project doc raceroom-server-export-format-2026-11-16.md.
   Every part of the screen is made with the shared builders in raceroom-shell.js (RR.*). */
(function () {
  'use strict';
  var RR = window.RR, R3E = window.RR_R3E;
  var el = RR.el, add = RR.add;
  var STORE = 'rr-admin-season';

  /* ---------------- Lookup helpers ---------------- */
  var layoutIndex = {};
  R3E.tracks.forEach(function (t) { t.l.forEach(function (l) { layoutIndex[l.id] = { track: t.n, layout: l.n, max: l.m }; }); });
  function car(id) { return R3E.cars[id]; }
  function classById(id) { return R3E.classes.filter(function (c) { return c.id === id; })[0]; }
  function range(a, b, step) { var out = []; for (var i = a; i <= b; i += (step || 1)) out.push([i, String(i)]); return out; }

  /* ---------------- The server's options ----------------
     Each rule: [key in the server file, label, choices [[number written to the file, text shown]]].
     A choice whose number is 0 is left out of the file, except the keys in ALWAYS. */
  var OFF_ON = [[0, 'Off'], [1, 'On']], NO_YES = [[0, 'No'], [1, 'Yes']];
  var RULES = [
    ['ReverseStartOrderPlaces', 'Reverse start order places', [[0, 'Off']].concat(range(2, 12))],
    ['MaxNumOfPlayers', 'Max num of players', range(1, 34)],
    ['FuelUsage', 'Fuel usage', [[0, 'Off'], [1, 'Normal'], [2, '2X'], [3, '3X'], [4, '4X']]],
    ['TireWear', 'Tire wear', [[0, 'Off'], [1, 'Normal'], [2, '2X'], [3, '3X'], [4, '4X']]],
    ['TireTemperature', 'Tire temperature', [[0, 'Dynamic'], [1, 'Optimal']]],
    ['Damage', 'Damage', [[0, 'Off'], [1, 'Limited'], [2, 'Full']]],
    ['RaceFinishDuration', 'Race finish duration', [30, 45, 60, 100, 120, 240, 360, 480, 600].map(function (n) { return [n, String(n)]; })],
    ['FlagRules', 'Flag rules', [[0, 'None'], [1, 'Black Only'], [2, 'Visual Only'], [3, 'Complete']]],
    ['CutRules', 'Cut rules', [[0, 'Off'], [1, 'Slow-Down'], [2, 'Stop-And-Go'], [3, 'Drive-Through']]],
    ['WreckerPrevention', 'Wrecker prevention', OFF_ON],
    ['MandatoryPitstop', 'Mandatory pitstop', [[0, 'Off'], [1, 'Minimum Two Tires'], [2, 'Minimum Four Tires']]],
    ['NonReadyPitlaneStartDelay', 'Non ready pitlane start delay', [[0, 'Off']].concat(range(1, 18))],
    ['StayInPracticeSessionIfEmpty', 'Stay in practice session if empty', OFF_ON],
    ['AllowPlayersJoinInQualifying', 'Allow players join in qualifying', OFF_ON],
    ['StartingGridFromLeaderboards', 'Starting grid from leaderboards', NO_YES],
    ['CheckeredAfterTime', 'Checkered after time', [[0, 'Off'], [30, '30'], [60, '60'], [120, '120'], [240, '240'], [600, '600']]],
    ['MaxPing', 'Max ping', [25, 50, 100, 150, 200, 250, 300, 350, 400, 450].map(function (n) { return [n, String(n)]; }).concat([[0, '500 (default)']])],
    ['FixedSetup', 'Fixed setup', OFF_ON],
    ['MaxIncidentPoints', 'Max incident points', [[0, 'Off']].concat(range(10, 1000, 10))],
    ['MinRating', 'Min rating', [[0, 'Anyone']].concat(range(50, 2100, 50))],
    ['MaxRating', 'Max rating', [[0, 'Anyone']].concat(range(10, 2100, 10))],
    ['MinReputation', 'Min reputation', [[0, 'Anyone']].concat(range(1, 100))],
    ['MaxReputation', 'Max reputation', [[0, 'Anyone']].concat(range(1, 100))],
    ['PreventFalseStart', 'Prevent false start', NO_YES],
    ['LiveUpdate', 'Live update', [[0, 'Off']].concat(range(1, 60))]
  ];
  var ALWAYS = { MaxNumOfPlayers: 1, RaceFinishDuration: 1 };
  var FREE = [-1, 'Free Choice'];
  var ASSISTS = [
    ['DriveAssistTransmission', 'Transmission', [[0, 'Forced Manual'], [1, 'Forced Manual With Auto Clutch'], [2, 'Forced Auto'], FREE]],
    ['DriveAssistEsp', 'ESP', [[0, 'Forced Off'], [1, 'Forced Low'], [2, 'Forced Medium'], [3, 'Forced High'], FREE]],
    ['DriveAssistSteer', 'Steer', [[0, 'Forced Off'], [1, 'Forced On'], FREE]],
    ['DriveAssistBrake', 'Brake', [[0, 'Forced Off'], [1, 'Forced ABS'], [2, 'Forced Factory ABS'], [3, 'Forced Assisted'], FREE]],
    ['DriveAssistTractionControl', 'Traction control', [[0, 'Forced Off'], [1, 'Forced On'], [2, 'Forced Factory Default'], FREE]],
    ['DriveAssistRaceline', 'Raceline', [[0, 'Forced Off'], [1, 'Forced Downloaded Or Own'], [2, 'Forced Ideal Line'], FREE]],
    ['DriveAssistAutopit', 'Autopit', [[0, 'Forced Off'], [1, 'Forced On'], FREE]]
  ];
  var PRESETS = [[0, 'Custom'], [1, 'Novice'], [2, 'Amateur'], [3, 'Get Real']];
  var TIMES = [[0, 'Dawn'], [1, 'Morning'], [2, 'Noon'], [3, 'Afternoon'], [4, 'Sunset']];
  var CLOUDS = [[0, 'Clear'], [1, 'Few Clouds'], [2, 'Scattered Clouds'], [3, 'Overcast']];
  var QUALI_START = [[0, 'Standing Start'], [1, 'Rolling Start']];
  var RACE_START = [[1, 'Standing Start'], [0, 'Rolling Start'], [2, 'Formation Lap Rolling Start']];
  var SESSIONS = [['Practice', 'Practice'], ['Qualify', 'Qualifying'], ['Race1', 'Race 1'], ['Race2', 'Race 2'], ['Race3', 'Race 3']];

  /* ---------------- The season being edited ---------------- */
  function session(len, start) { return { len: len, unit: 'M', start: start, tod: 2, clouds: [0, 0, 0, 0, 0] }; }
  function newWeekend() {
    return { multiplier: 0, warmup: 0, Practice: session(15, 1), Qualify: session(15, 1), Race1: session(20, 1), Race2: session(0, 1), Race3: session(0, 1) };
  }
  function newSeason() {
    return {
      version: 1,
      name: 'Season 01',
      prefix: 'RACE CLUB ONLINE: SEASON 01',
      serverId: 515929,
      motd: '',
      thumbnail: 'https://r3-live.fra1.digitaloceanspaces.com/mp-thumbnails/3fdcf71c511745e09c5f70c67d2c5e7e.png',
      zone: 'America/New_York',
      liveries: [],
      rules: { ReverseStartOrderPlaces: 0, MaxNumOfPlayers: 12, FuelUsage: 1, TireWear: 1, TireTemperature: 0, Damage: 2,
        RaceFinishDuration: 30, FlagRules: 2, CutRules: 1, WreckerPrevention: 0, MandatoryPitstop: 0, NonReadyPitlaneStartDelay: 0,
        StayInPracticeSessionIfEmpty: 1, AllowPlayersJoinInQualifying: 1, StartingGridFromLeaderboards: 0, CheckeredAfterTime: 60,
        MaxPing: 0, FixedSetup: 1, MaxIncidentPoints: 30, MinRating: 0, MaxRating: 0, MinReputation: 0, MaxReputation: 0,
        PreventFalseStart: 0, LiveUpdate: 0 },
      preset: 2,
      assists: { DriveAssistTransmission: -1, DriveAssistEsp: 1, DriveAssistSteer: 0, DriveAssistBrake: 1,
        DriveAssistTractionControl: 1, DriveAssistRaceline: -1, DriveAssistAutopit: -1 },
      weekend: newWeekend(),
      points: { tables: {}, pole: 0, fastestLap: 0, clean: 0, dropWeeks: 0 },
      rounds: []
    };
  }
  var S = newSeason();
  try { var kept = JSON.parse(localStorage.getItem(STORE)); if (kept && kept.version === 1) S = kept; } catch (e) {}
  function save() { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) {} }

  /* ---------------- Cars chosen ---------------- */
  function chosen() { var set = {}; S.liveries.forEach(function (id) { set[id] = 1; }); return set; }
  function carIds() {
    var set = chosen(), out = [];
    R3E.classes.forEach(function (c) {
      c.cars.forEach(function (id) {
        if (out.indexOf(id) < 0 && car(id).l.some(function (l) { return set[l[0]]; })) out.push(id);
      });
    });
    return out;
  }
  function classIds() {
    var ids = carIds();
    return R3E.classes.filter(function (c) { return c.cars.some(function (id) { return ids.indexOf(id) >= 0; }); }).map(function (c) { return c.id; });
  }

  /* ---------------- Time ---------------- */
  /* Minutes that `zone` is behind UTC at a given moment (300 for US Eastern in winter). */
  function zoneOffset(zone, date) {
    var p = {};
    new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric' }).formatToParts(date).forEach(function (x) { p[x.type] = Number(x.value); });
    return Math.round((date.getTime() - Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)) / 60000);
  }
  /* A date and time on the wall clock in `zone`, as Unix seconds. */
  function toUnix(dateStr, timeStr, zone) {
    var d = dateStr.split('-').map(Number), t = timeStr.split(':').map(Number);
    var guess = Date.UTC(d[0], d[1] - 1, d[2], t[0], t[1]);
    var off = zoneOffset(zone, new Date(guess));
    off = zoneOffset(zone, new Date(guess + off * 60000));
    return Math.round((guess + off * 60000) / 1000);
  }
  function addMinutes(timeStr, mins) {
    var t = timeStr.split(':').map(Number), total = (t[0] * 60 + t[1] + mins) % 1440;
    return ('0' + Math.floor(total / 60)).slice(-2) + ':' + ('0' + (total % 60)).slice(-2);
  }
  function showDate(d) { var p = d.split('-'); return p[2] + '.' + p[1] + '.' + p[0]; }
  function weekendOf(r) { return r.weekend || S.weekend; }
  /* When qualifying and Race 1 start, if practice and qualifying are timed in minutes. */
  function startTimes(r) {
    var w = weekendOf(r), out = { quali: '-', race: '-' };
    if (!r.time || w.Practice.unit !== 'M') return out;
    out.quali = addMinutes(r.time, Number(w.Practice.len));
    if (w.Qualify.unit === 'M') out.race = addMinutes(r.time, Number(w.Practice.len) + Number(w.Qualify.len) + Number(w.warmup));
    return out;
  }

  /* ---------------- Build one round's server file ---------------- */
  function sessionOut(s, isPractice) {
    var o = { Duration: s.unit === 'M' ? Number(s.len) : 0, Laps: s.unit === 'L' ? Number(s.len) : 0 };
    if (Number(s.tod)) o.TimeOfDay = Number(s.tod);
    var type = isPractice ? 1 : Number(s.start);
    if (type) o.SessionType = type;
    o.Clouds = s.clouds.map(Number);
    return o;
  }
  function serverName(r) { return S.prefix + ' ' + r.id; }
  function buildRoundFile(r) {
    var w = weekendOf(r), g = {}, id = Number(S.serverId);
    g.Id = id;
    g.Name = serverName(r);
    g.Password = r.password || '';
    if (S.thumbnail) g.Thumbnail = S.thumbnail;
    g.Experience = 2481;
    if (Number(S.preset)) g.DriveAssistPreset = Number(S.preset);
    ASSISTS.forEach(function (a) { if (Number(S.assists[a[0]])) g[a[0]] = Number(S.assists[a[0]]); });
    var sessions = {};
    if (Number(w.warmup)) sessions.WarmupDuration = Number(w.warmup);
    sessions.Qualify = sessionOut(w.Qualify);
    sessions.Practice = sessionOut(w.Practice, true);
    sessions.Race1 = sessionOut(w.Race1);
    sessions.Race2 = sessionOut(w.Race2);
    sessions.Race3 = sessionOut(w.Race3);
    var layout = { LayoutId: Number(r.layoutId), EventPackId: 0, Sessions: sessions };
    if (Number(w.multiplier)) layout.TimeOfDayMultiplier = Number(w.multiplier);
    g.TrackLayouts = [layout];
    function rule(key) { var v = Number(S.rules[key]); if (v || ALWAYS[key]) g[key] = v; }
    rule('ReverseStartOrderPlaces');
    g.Cars = carIds();
    var set = chosen();
    g.Liveries = [];
    g.Cars.forEach(function (cid) { car(cid).l.forEach(function (l) { if (set[l[0]]) g.Liveries.push(l[0]); }); });
    g.Liveries.sort(function (x, y) { return x - y; });   /* the server tool lists liveries in number order */
    ['MaxNumOfPlayers', 'FuelUsage', 'TireWear', 'TireTemperature', 'Damage', 'RaceFinishDuration', 'FlagRules', 'CutRules'].forEach(rule);
    g.StateReportInterval = 3000;
    g.CompressionLevel = 3;
    ['WreckerPrevention', 'MandatoryPitstop', 'NonReadyPitlaneStartDelay', 'StayInPracticeSessionIfEmpty', 'AllowPlayersJoinInQualifying',
      'StartingGridFromLeaderboards', 'CheckeredAfterTime', 'MaxPing', 'FixedSetup', 'MaxIncidentPoints', 'MinRating', 'MaxRating',
      'MinReputation', 'MaxReputation'].forEach(rule);
    /* The server goes online at this moment. No repeat. The end is one day later, as the server tool writes it. */
    var start = toUnix(r.date, r.time, S.zone);
    g.ScheduleStart = start;
    g.ScheduleEnd = start + 86400;
    g.ScheduleZone = S.zone;
    g.ScheduleOffset = zoneOffset(S.zone, new Date());
    rule('PreventFalseStart');
    rule('LiveUpdate');
    return {
      BackupTime: Math.round(Date.now() / 1000),
      GameSettings: [g],
      Motds: [{ Id: id, Message: S.motd || '' }],
      Bans: [], Weights: [],
      Positions: [{ ProcessId: id, Users: [] }],
      PowerRestrictions: [],
      SpectatorWhitelist: [{ ProcessId: id, Users: [] }]
    };
  }

  /* ---------------- Checks before export ---------------- */
  function problems() {
    var out = [], cars = carIds();
    if (!String(S.prefix).trim()) out.push('Step 1: the server name is empty.');
    if (!Number(S.serverId)) out.push('Step 1: the server ID is missing.');
    if (!cars.length) out.push('Step 2: no cars are chosen.');
    if (!S.rounds.length) out.push('Step 6: there are no rounds.');
    S.rounds.forEach(function (r, i) {
      var n = 'Round ' + (i + 1) + ': ', w = weekendOf(r), L = layoutIndex[r.layoutId];
      if (!r.date || !r.time) out.push(n + 'the date or the server online time is missing.');
      if (!r.password) out.push(n + 'there is no password.');
      if (!Number(w.Race1.len) && !Number(w.Race2.len) && !Number(w.Race3.len)) out.push(n + 'no race has a length.');
      if (L && L.max && Number(S.rules.MaxNumOfPlayers) > L.max) {
        out.push(n + L.track + ' ' + L.layout + ' holds ' + L.max + ' cars, but max players is ' + S.rules.MaxNumOfPlayers + '.');
      }
    });
    return out;
  }

  /* ---------------- Downloads ---------------- */
  var crcTable = null;
  function crc32(bytes) {
    if (!crcTable) {
      crcTable = [];
      for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c >>> 0; }
    }
    var crc = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) crc = crcTable[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  /* A plain .zip (files stored, not squeezed). files: [{ name, text }] */
  function makeZip(files) {
    var enc = new TextEncoder(), parts = [], central = [], offset = 0, now = new Date();
    var time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    var date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    files.forEach(function (f) {
      var name = enc.encode(f.name), data = enc.encode(f.text), crc = crc32(data);
      var head = new DataView(new ArrayBuffer(30));
      head.setUint32(0, 0x04034b50, true); head.setUint16(4, 20, true); head.setUint16(6, 0x0800, true); head.setUint16(8, 0, true);
      head.setUint16(10, time, true); head.setUint16(12, date, true); head.setUint32(14, crc, true);
      head.setUint32(18, data.length, true); head.setUint32(22, data.length, true); head.setUint16(26, name.length, true); head.setUint16(28, 0, true);
      parts.push(new Uint8Array(head.buffer), name, data);
      var c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
      c.setUint16(12, time, true); c.setUint16(14, date, true); c.setUint32(16, crc, true);
      c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true);
      c.setUint32(42, offset, true);
      central.push(new Uint8Array(c.buffer), name);
      offset += 30 + name.length + data.length;
    });
    var size = 0;
    central.forEach(function (p) { size += p.length; });
    var end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, size, true); end.setUint32(16, offset, true);
    return new Blob(parts.concat(central, [new Uint8Array(end.buffer)]), { type: 'application/zip' });
  }
  function download(blob, name) {
    var a = el('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  function slug(text) { return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function roundFileName(r, i) {
    var L = layoutIndex[r.layoutId] || { track: 'track', layout: '' };
    return 'round-' + ('0' + (i + 1)).slice(-2) + '-' + r.id + '-' + slug(L.track + ' ' + L.layout) + '.json';
  }
  function exportFiles() {
    return S.rounds.map(function (r, i) { return { name: roundFileName(r, i), text: JSON.stringify(buildRoundFile(r), null, 2) }; });
  }

  /* ---------------- Small screen helpers ---------------- */
  function fill(node) {
    node.textContent = '';
    for (var i = 1; i < arguments.length; i++) if (arguments[i]) node.appendChild(arguments[i]);
    return node;
  }
  function stack() {
    var s = el('div', 'rr-stack');
    for (var i = 0; i < arguments.length; i++) if (arguments[i]) s.appendChild(arguments[i]);
    return s;
  }
  function panel(title) {
    var p = el('div', 'rr-panel rr-stack');
    if (title) p.appendChild(RR.heading(title));
    for (var i = 1; i < arguments.length; i++) if (arguments[i]) p.appendChild(arguments[i]);
    return p;
  }
  function note(text) { return el('p', 'rr-body', text); }
  /* A dropdown tied to obj[key]. Numbers stay numbers. */
  function pick(label, options, obj, key, after) {
    return RR.select(label, options, function (v) { obj[key] = isNaN(Number(v)) ? v : Number(v); save(); if (after) after(); }, obj[key]);
  }
  function text(label, obj, key, o) {
    o = o || {};
    return RR.input({ label: label, value: obj[key], type: o.type, placeholder: o.placeholder, wide: o.wide, min: o.min, max: o.max,
      onChange: function (v) { obj[key] = o.type === 'number' ? Number(v) : v; save(); if (o.after) o.after(); } });
  }

  /* ---------------- Step 1: Season ---------------- */
  function drawSeason() {
    fill(RR.view('season'), stack(
      panel('Season',
        RR.row(text('Season name', S, 'name'), text('Server name', S, 'prefix', { wide: true })),
        note('Each round adds its own round ID to the end of the server name. Results are matched to the round by that ID.')),
      panel('Server',
        RR.row(text('Server ID', S, 'serverId', { type: 'number' }), text('Time zone', S, 'zone')),
        note('The server ID is the number of your server in the RaceRoom server tool. Every round is imported onto that one server.'),
        RR.row(text('Server image address', S, 'thumbnail', { wide: true })),
        note('The address RaceRoom gave your Race Club banner when you uploaded it in the server tool. It is used for every round.')),
      panel('Message of the day',
        RR.textarea({ label: 'Message', value: S.motd, onChange: function (v) { S.motd = v; save(); } }),
        note('Shown to drivers when they join. The same message goes into every round.'))
    ));
  }

  /* ---------------- Step 2: Classes and cars ---------------- */
  var openClasses = {}, openCars = {};
  function drawCars() {
    var set = chosen(), tree = el('div', 'rr-tree');
    function setLiveries(ids, on) {
      ids.forEach(function (id) { if (on) set[id] = 1; else delete set[id]; });
      S.liveries = Object.keys(set).map(Number);
      save();
      drawCars();
    }
    function toggle(open, key) {
      var b = el('button', 'rr-tree-toggle');
      b.type = 'button';
      b.setAttribute('aria-expanded', open[key] ? 'true' : 'false');
      b.setAttribute('aria-label', 'Show or hide');
      b.addEventListener('click', function () { open[key] = !open[key]; drawCars(); });
      return b;
    }
    R3E.classes.forEach(function (c) {
      var all = [];
      c.cars.forEach(function (id) { car(id).l.forEach(function (l) { all.push(l[0]); }); });
      var on = all.filter(function (id) { return set[id]; }).length;
      tree.appendChild(add(el('div', 'rr-tree-row'), toggle(openClasses, c.id),
        RR.checkbox(c.n, function (v) { setLiveries(all, v); }, on === all.length && on > 0, on > 0),
        el('span', 'rr-note rr-tree-count', c.cars.length + (c.cars.length === 1 ? ' car' : ' cars'))));
      if (!openClasses[c.id]) return;
      c.cars.forEach(function (id) {
        var k = car(id), ids = k.l.map(function (l) { return l[0]; });
        var n = ids.filter(function (x) { return set[x]; }).length, key = c.id + '-' + id;
        tree.appendChild(add(el('div', 'rr-tree-row rr-tree-l2'), toggle(openCars, key),
          RR.checkbox(k.n, function (v) { setLiveries(ids, v); }, n === ids.length && n > 0, n > 0),
          el('span', 'rr-note rr-tree-count', n + ' / ' + ids.length + ' liveries')));
        if (!openCars[key]) return;
        k.l.forEach(function (l) {
          tree.appendChild(add(el('div', 'rr-tree-row rr-tree-l3'),
            RR.checkbox(l[1], function (v) { setLiveries([l[0]], v); }, !!set[l[0]])));
        });
      });
    });
    var cars = carIds(), names = classIds().map(function (id) { return classById(id).n; });
    fill(RR.view('cars'), stack(
      RR.statRow([
        RR.stat('Classes', names.length, names.join(', ') || 'None chosen'),
        RR.stat('Cars', cars.length),
        RR.stat('Liveries', S.liveries.length)
      ]),
      RR.row(RR.button('Clear all', function () { S.liveries = []; save(); drawCars(); })),
      tree));
    RR.refresh();
  }

  /* ---------------- Step 3: Rules ---------------- */
  function drawRules() {
    var rules = RR.row.apply(null, RULES.map(function (r) { return pick(r[1], r[2], S.rules, r[0]); }));
    var assistRow = RR.row.apply(null, ASSISTS.map(function (a) { return pick(a[1], a[2], S.assists, a[0]); }));
    fill(RR.view('rules'), stack(
      panel('Global server settings', rules),
      panel('Drive assists',
        RR.row(pick('Preset', PRESETS, S, 'preset', drawRules)),
        Number(S.preset) ? note('With a preset chosen, the server tool sets the seven assists itself and locks them. Choose Custom to set them here.') : assistRow)
    ));
  }

  /* ---------------- Step 4: Weekend format (also used for one round's own format) ---------------- */
  function weekendEditor(w, after) {
    function changed() { save(); if (after) after(); }
    var box = stack(RR.row(
      pick('Time multiplier', [[0, 'Off']].concat(range(1, 25)), w, 'multiplier', changed),
      text('Warmup minutes', w, 'warmup', { type: 'number', min: 0, after: changed })));
    SESSIONS.forEach(function (def) {
      var s = w[def[0]], isRace = def[0].indexOf('Race') === 0, weather = el('div', 'rr-form-row');
      function drawWeather() {
        fill(weather, RR.select('Set all', [['', 'Mixed']].concat(CLOUDS), function (v) {
          if (v === '') return;
          s.clouds = [0, 0, 0, 0, 0].map(function () { return Number(v); });
          changed();
          drawWeather();
        }, s.clouds.every(function (c) { return c === s.clouds[0]; }) ? s.clouds[0] : ''));
        TIMES.forEach(function (t) {
          weather.appendChild(RR.select(t[1], CLOUDS, function (v) { s.clouds[t[0]] = Number(v); changed(); drawWeather(); }, s.clouds[t[0]]));
        });
      }
      drawWeather();
      box.appendChild(panel(def[1],
        RR.row(
          text('Length', s, 'len', { type: 'number', min: 0, after: changed }),
          pick('In', [['M', 'Minutes'], ['L', 'Laps']], s, 'unit', changed),
          def[0] === 'Practice' ? null : pick('Start', isRace ? RACE_START : QUALI_START, s, 'start', changed),
          pick('Starts at', TIMES, s, 'tod', changed)),
        weather,
        isRace ? note('A race with a length of 0 is not run.') : null));
    });
    return box;
  }
  function drawWeekend() {
    fill(RR.view('weekend'), stack(
      note('This is the weekend every round starts from. Any round can be given its own format in the Calendar step.'),
      weekendEditor(S.weekend)));
  }

  /* ---------------- Step 5: Points ---------------- */
  function drawPoints() {
    var tables = panel('Points per class');
    var ids = classIds();
    if (!ids.length) tables.appendChild(note('Choose cars in step 2 first. Each class gets its own points table.'));
    ids.forEach(function (id) {
      if (!S.points.tables[id]) S.points.tables[id] = '25, 18, 15, 12, 10, 8, 6, 4, 2, 1';
      tables.appendChild(RR.row(text(classById(id).n, S.points.tables, id, { wide: true })));
    });
    tables.appendChild(note('Points for 1st place, 2nd place and so on, with commas between them. Race 2 and Race 3 score the same table every time they are run.'));
    fill(RR.view('points'), stack(tables,
      panel('Bonuses and drop weeks',
        RR.row(text('Pole', S.points, 'pole', { type: 'number', min: 0 }), text('Fastest lap', S.points, 'fastestLap', { type: 'number', min: 0 }),
          text('Clean race', S.points, 'clean', { type: 'number', min: 0 }), text('Drop weeks', S.points, 'dropWeeks', { type: 'number', min: 0 })),
        note('A bonus of 0 is switched off. Clean race means no incident points in the race. Points are saved with the season now and used when results are connected.'))));
    save();
  }

  /* ---------------- Step 6: Calendar ---------------- */
  var addTrack = R3E.tracks[0].id, addLayout = R3E.tracks[0].l[0].id, fillFrom = { date: "", time: "20:00", gap: 1 };
  function newRoundId() {
    var id;
    do { id = String(1000000 + Math.floor(Math.random() * 9000000)); }
    while (S.rounds.some(function (r) { return r.id === id; }));
    return id;
  }
  function drawCalendar() {
    var track = R3E.tracks.filter(function (t) { return t.id === addTrack; })[0];
    var adder = panel('Add a round', RR.row(
      RR.select('Track', R3E.tracks.map(function (t) { return [t.id, t.n]; }), function (v) {
        addTrack = Number(v);
        addLayout = R3E.tracks.filter(function (t) { return t.id === addTrack; })[0].l[0].id;
        drawCalendar();
      }, addTrack),
      RR.select('Layout', track.l.map(function (l) { return [l.id, l.n + ' (' + l.m + ' cars)']; }), function (v) { addLayout = Number(v); }, addLayout),
      RR.button('Add round', function () {
        S.rounds.push({ id: newRoundId(), layoutId: addLayout, date: '', time: fillFrom.time, password: '', weekend: null });
        save();
        drawCalendar();
      })));
    var filler = panel('Fill dates', RR.row(
      text('First round', fillFrom, 'date', { type: 'date' }), text('Server online', fillFrom, 'time', { type: 'time' }),
      RR.select('Every', [[1, 'Week'], [2, 'Second week'], [3, 'Third week'], [4, 'Fourth week']], function (v) { fillFrom.gap = Number(v); }, fillFrom.gap),
      RR.button('Fill', function () {
        if (!fillFrom.date) return;
        var d = fillFrom.date.split('-').map(Number);
        S.rounds.forEach(function (r, i) {
          var day = new Date(Date.UTC(d[0], d[1] - 1, d[2] + i * 7 * fillFrom.gap));
          r.date = day.toISOString().slice(0, 10);
          r.time = fillFrom.time;
        });
        save();
        drawCalendar();
      })),
      note('Gives every round a date, starting from the first and spaced evenly. Change or skip any date afterwards in the round itself.'));
    var list = stack();
    if (!S.rounds.length) list.appendChild(RR.empty('No rounds yet. Pick a track and layout, then Add round.'));
    S.rounds.forEach(function (r, i) {
      var L = layoutIndex[r.layoutId] || { track: 'Unknown track', layout: '', max: 0 }, times = el('p', 'rr-body');
      function showTimes() {
        var t = startTimes(r);
        times.textContent = 'Server name: ' + serverName(r) + ' · Qualifying starts ' + t.quali + ' · Race 1 starts ' + t.race;
      }
      showTimes();
      function move(by) {
        var j = i + by;
        if (j < 0 || j >= S.rounds.length) return;
        S.rounds.splice(j, 0, S.rounds.splice(i, 1)[0]);
        save();
        drawCalendar();
      }
      var p = panel('Round ' + (i + 1) + ' · ' + L.track + ' · ' + L.layout,
        RR.row(
          text('Date', r, 'date', { type: 'date' }),
          text('Server online', r, 'time', { type: 'time', after: showTimes }),
          text('Password', r, 'password'),
          RR.button('Up', function () { move(-1); }), RR.button('Down', function () { move(1); }),
          RR.button('Remove', function () { S.rounds.splice(i, 1); save(); drawCalendar(); })),
        times,
        L.max && Number(S.rules.MaxNumOfPlayers) > L.max
          ? RR.notice('This layout holds ' + L.max + ' cars, but max players is ' + S.rules.MaxNumOfPlayers + '.', 'warn') : null,
        RR.row(RR.checkbox('Own weekend format for this round', function (on) {
          r.weekend = on ? JSON.parse(JSON.stringify(S.weekend)) : null;
          save();
          drawCalendar();
        }, !!r.weekend)),
        r.weekend ? weekendEditor(r.weekend, showTimes) : null);
      list.appendChild(p);
    });
    fill(RR.view('calendar'), stack(adder, filler, list));
    RR.refresh();
  }

  /* ---------------- Step 7: Review and export ---------------- */
  function drawExport() {
    var issues = problems(), checks = panel('Checks');
    if (!issues.length) checks.appendChild(RR.notice('Everything needed for the export is filled in.', 'ok'));
    issues.forEach(function (t) { checks.appendChild(RR.notice(t, 'warn')); });
    var loader = el('input');
    loader.type = 'file';
    loader.accept = '.json,application/json';
    loader.hidden = true;
    loader.addEventListener('change', function () {
      var f = loader.files[0];
      if (!f) return;
      f.text().then(function (t) {
        var got = JSON.parse(t);
        if (!got || got.version !== 1 || !got.rounds) throw new Error('not a season file');
        S = got;
        save();
        drawAll();
      }).catch(function () { status.textContent = 'That file is not a Race Club season file.'; });
    });
    var status = el('p', 'rr-body');
    var rows = S.rounds.map(function (r, i) {
      var L = layoutIndex[r.layoutId] || { track: '-', layout: '' }, t = startTimes(r);
      return { cells: { n: 'Round ' + (i + 1), track: RR.cell(L.track, L.layout), date: r.date ? showDate(r.date) : '-', online: r.time || '-',
        race: t.race, id: r.id, pw: r.password ? 'Set' : '-', own: r.weekend ? 'Own' : 'Season' } };
    });
    fill(RR.view('export'), stack(
      checks,
      panel('Before each race',
        note('1. Import that round\'s file in the server tool (Manage Server Settings, Choose File, Import Settings).'),
        note('2. Check the results address is still filled in under Automated Race Results Uploading. It is not part of the file.'),
        note('3. Start the server before the online time. It goes online by itself at that time.')),
      panel('Rounds', RR.table([
        { key: 'n', label: 'Round' }, { key: 'track', label: 'Track' }, { key: 'date', label: 'Date' }, { key: 'online', label: 'Server online' },
        { key: 'race', label: 'Race 1 starts' }, { key: 'id', label: 'Round ID' }, { key: 'pw', label: 'Password' }, { key: 'own', label: 'Weekend format' }
      ], rows, 'No rounds yet.')),
      panel('Files',
        RR.row(
          RR.button('Export season (.zip)', function () {
            var left = problems();
            if (left.length) { status.textContent = 'Fix the ' + left.length + ' item(s) under Checks first.'; return; }
            download(makeZip(exportFiles()), slug(S.name || 'season') + '-server-files.zip');
            status.textContent = 'Downloaded ' + S.rounds.length + ' round file(s) in one zip.';
          }),
          RR.button('Save season file', function () {
            download(new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' }), slug(S.name || 'season') + '-season.json');
            status.textContent = 'Season file saved.';
          }),
          RR.button('Load season file', function () { loader.click(); }),
          RR.button('Start a new season', function () {
            if (!window.confirm('Clear everything in the wizard and start a new season?')) return;
            S = newSeason();
            save();
            drawAll();
          }),
          loader),
        status,
        note('The zip and the season file contain your server passwords. Keep them on your computer. Never add them to the website folder.'))
    ));
    RR.refresh();
  }

  function drawAll() { drawSeason(); drawCars(); drawRules(); drawWeekend(); drawPoints(); drawCalendar(); drawExport(); RR.refresh(); }
  /* Steps that depend on other steps are redrawn when you open them. */
  window.addEventListener('hashchange', function () {
    var at = location.hash.replace('#', '');
    if (at === 'points') drawPoints();
    if (at === 'calendar') drawCalendar();
    if (at === 'export') drawExport();
  });

  /* For checking the exporter from the browser console or a test. */
  window.RR_ADMIN = {
    season: function () { return S; },
    load: function (season) { S = season; save(); drawAll(); },
    buildRoundFile: buildRoundFile,
    newSeason: newSeason
  };

  drawAll();
})();
