/* Race Club admin: Website Documentation (the first five tabs of website-options.html).
   A reference for the admin: what every part of the site is, how a season runs, what lives where in the backend,
   and what to change (and where) when something has to be different. Nothing here changes anything by itself.
   KEEP IT TRUE: when a page, a tab, a Sheet column, a Script Property or a rule changes, change the matching line here.
   The Tile pictures and Picture database tabs are in raceroom-options.js.
   Built only from the shared builders in raceroom-shell.js (RR.*). */
(function () {
  'use strict';
  var RR = window.RR, el = RR.el, add = RR.add;

  function panel(title, nodes) {
    var p = el('div', 'rr-panel rr-stack');
    p.appendChild(RR.heading(title));
    nodes.forEach(function (n) { p.appendChild(typeof n === 'string' ? el('p', 'rr-body', n) : n); });
    return p;
  }
  function list(items) {
    var ul = el('ul', 'rr-body rr-list');
    items.forEach(function (t) { ul.appendChild(el('li', '', t)); });
    return ul;
  }
  function stack() {
    var s = el('div', 'rr-stack');
    for (var i = 0; i < arguments.length; i++) s.appendChild(arguments[i]);
    return s;
  }
  /* A table of plain text. heads: ["A", "B"], rows: [["a1", "b1"], ...] */
  function grid(heads, rows) {
    var cols = heads.map(function (h, i) { return { key: 'c' + i, label: h }; });
    return RR.table(cols, rows.map(function (r) {
      var cells = {};
      r.forEach(function (v, i) { cells['c' + i] = v; });
      return { cells: cells };
    }));
  }

  /* ======================= Overview ======================= */
  add(RR.view('overview'), stack(
    panel('What the site is', [
      list([
        "A static website on GitHub Pages (repository stenbough-cmd/raceclub, address www.raceclubonline.com). Every page is a plain .html file with a .js file, all styled by one file, css/race-club.css.",
        "The website holds no data of its own. Everything it shows comes from a Google Sheet (the database) that a Google Apps Script (the backend) works on.",
        "The script writes the public data to a second repository, race-club-data, as one file called league.js. Every public page reads that file when it loads.",
        "Admin pages talk to the Apps Script web address kept in js/config.js. Every admin request needs a login.",
        "Results reach the script from the RaceRoom server through a small Google Cloud function (the relay). The news stories are written by Gemini, called from the script."
      ])
    ]),
    panel('How a round travels', [
      grid(['Step', 'What happens', 'Where'], [
        ['1 Build the season', "The wizard saves the season in the Sheet and makes one server file per round (a .zip).", 'Season Wizard'],
        ['2 Run the server', "Each round's file is loaded in the RaceRoom server tool. After the event the server posts its results file.", 'RaceRoom server'],
        ['3 Relay', "The cloud function passes the file to Apps Script. Duplicates are ignored and the raw file is kept in a private Drive folder.", 'Cloud Run, Apps Script'],
        ['4 Waiting', "The round shows Awaiting confirmation. Nothing is public yet. You get an email, and a Discord message if set.", 'Results, Rounds tab'],
        ['5 Confirm', "Results go live, the story is written and the public data is sent to race-club-data.", 'Results, Rounds tab'],
        ['6 Protests', "Drivers file with the round password until 12 hours after the scheduled start. You rule on them.", 'Stewarding'],
        ['7 Standings', "A round counts once its protest window has ended and no protest is open. The page works this out from the clock.", 'Automatic'],
        ['8 End of season', "Champions per class, a recap story, and a Reopen button if you end too soon.", 'Results, Season tab']
      ])
    ]),
    panel('Where things live', [
      grid(['Thing', 'Where'], [
        ['Website pages and scripts', "The Race Club folder on your Mac. GitHub Desktop pushes it to GitHub."],
        ['Backend code', "The _raceroom-apps-script folder on your Mac: ten .gs files. It is not pushed to GitHub. You paste each file into Apps Script."],
        ['Database', "The Google Sheet. Its tabs are listed on the Behind the scenes tab."],
        ['Public data', "The race-club-data repository, file league.js. Only the script writes it."],
        ['Raw results files', "The Drive folder Race Club RaceRoom - raw results. Private."],
        ['Secrets, keys and passwords', "Script Properties in Apps Script. Never in the Sheet, the website or GitHub."],
        ['Car, track and livery pictures and details', "assets/r3e in the website folder. A GitHub workflow keeps them current (see Picture database)."],
        ['Server files', "Made by the wizard and downloaded as a .zip. The site does not keep them."]
      ])
    ]),
    panel('Four habits', [
      list([
        "Website change: edit the file, push from GitHub Desktop, then hard refresh the page (Cmd+Shift+R) because browsers keep old files.",
        "Backend change: open the .gs file in Apps Script, paste the whole new file over the old one, save, then Deploy, Manage deployments, edit, New version. If the public data should change too, press Publish site data on Results, Rounds.",
        "If a .gs file adds a column to a Sheet tab, run Race Club > Build or repair the tabs once. It never deletes anything.",
        "Never edit the Results or Laps tabs by hand. Corrections go through Stewarding, which adds a record on top and can be reversed."
      ])
    ])
  ));

  /* ======================= Pages ======================= */
  add(RR.view('pages'), stack(
    panel('Public pages', [
      grid(['Page', 'Files', 'What it does'], [
        ['Home', 'index.html, raceroom-home.js', "Tiles for News, League (leaderboards), Drivers and About Race Club."],
        ['News', 'news.html, story.html', "The race stories and your own posts, newest first. A story opens on its own page."],
        ['League', 'leaderboards.html', "The League menu item. Tabs: Standings, Race Results, Lap Times, Schedule, Season. A season dropdown covers old seasons too."],
        ['Drivers', 'drivers.html, driver.html', "Every driver. A profile has Overview, Race History, Statistics, Achievements and Leaderboards."],
        ['File a Protest', 'protest.html', "The protest form (flag icon, top right). It needs the round password."],
        ['Help', 'help.html, raceroom-help.js', "The league rules in short: The league, Points, Penalties."],
        ['About, Legal, 404', 'about.html, legal.html, 404.html', "Plain text pages."]
      ]),
      "Every public page loads raceroom-data.js (it fetches league.js) and raceroom-pages.js (it draws the page).",
      "League tables sort: click a column heading to sort by it and click again to reverse it. The red heading with an arrow is the current sort. Each table opens in its natural order: standings by position, race results by finishing place inside each class, lap times by average lap, the schedule by round. To make another column sortable, add sort: true to it in js/raceroom-pages.js, with desc: true if the first click should go high to low."
    ]),
    panel('Admin pages', [
      "Log in with the key icon at the top right. A login lasts 6 hours or until the tab closes. The cog icon then opens the admin hub.",
      grid(['Page', 'Files', 'What it is for'], [
        ['Log in', 'login.html, raceroom-login.js', "Name and password."],
        ['Admin hub', 'admin.html, raceroom-hub.js', "One button for each tool, with an icon in the middle. A new tool gets its button in raceroom-hub.js; the icons are in raceroom-shell.js (ICONS) and the look is .rr-tool in race-club.css."],
        ['Season Wizard', 'season-wizard.html, raceroom-admin.js', "Seven steps: Season, Classes and cars, Rules, Weekend format, Points, Calendar, Review and export. Save a draft (kept in the Sheet, shown nowhere else), Create a season (goes live and writes the preview story), Export season (.zip)."],
        ['News Editor', 'news-editor.html, raceroom-news-editor.js', "Two tabs. News: the posts you write yourself (write, edit, withdraw, delete). Story writer: every AI story (race stories, season preview and recap): Add context (notes and photos), Write, Retry, Rewrite, and Edit story (change the text, withdraw or delete). Changing a photo updates a written story, no rewrite needed."],
        ['Stewarding', 'stewarding.html, raceroom-stewarding.js', "Tabs: Protests, and Car and class (drivers who changed car or class)."],
        ['Member Management', 'members.html, raceroom-members.js', "Blacklist (banned from the servers) and Hide Details (kept out of stories by name) for each driver."],
        ['Results', 'league-management.html, raceroom-rounds.js, raceroom-posted.js, raceroom-upload.js, raceroom-season-end.js', "Tabs: Rounds (confirm, deny, cancel), Posted by the server, Upload by hand, Season (end the season)."],
        ['Website Documentation', 'website-options.html, raceroom-docs.js, raceroom-options.js', "This page. The file keeps its old name, website-options.html."]
      ])
    ]),
    panel('Shared files', [
      grid(['File', 'What it does'], [
        ['js/raceroom-shell.js', "Draws the top bar, the page title, the sub-tabs and the footer on every page. Holds the menu list (MENU), the sub-tab lists (TABSETS), the version number (VERSION), the short legal notice, the admin login, and the builders (RR.*) for tables, cards, buttons and boxes."],
        ['css/race-club.css', "All colors, fonts, sizes and layout. The colors are the --rr-... lines at the top."],
        ['js/config.js', "The address of the Apps Script web app. It is not a secret. The results address, which holds a secret, never goes here."],
        ['js/raceroom-data.js', "Loads league.js and gives each page its data."],
        ['js/raceroom-pages.js', "Draws News, Leaderboards, Drivers, Driver and the protest form."],
        ['js/raceroom-images.js', "Finds the right RaceRoom picture or car and track details for an ID."],
        ['js/raceroom-r3e-data.js', "RaceRoom's list of cars, classes and tracks that the wizard picks from."]
      ])
    ])
  ));

  /* ======================= Running a season ======================= */
  add(RR.view('season'), stack(
    panel('Before the season', [
      list([
        "Results, Season tab: press Clear test data once, before Season 1. You type the word CLEAR. It empties results, protests, penalties, stories, posts, seasons and rounds. It keeps the admins, the drivers' own settings and the site options.",
        "Member Management: tick Blacklist for any driver who is banned. The ticks are written into the Bans list of every server file at export.",
        "Season Wizard: fill in the seven steps. A red exclamation on a step means something is missing. Create a season saves it as Active, with its server passwords (private), and writes the Season Preview story.",
        "Export season (.zip) makes one server file per round, named round-NN-ID-track.json. Load each file in the RaceRoom server tool. The server name ends with the 7-digit Round ID, and the results address in the tool is the relay address."
      ])
    ]),
    panel('Each round', [
      list([
        "The server posts the results. You get an alert, and the round shows Awaiting confirmation on Results, Rounds. Nothing is public yet.",
        "Look at the results as the server sent them, then Confirm or Deny (both need two clicks). Confirm puts the results live, writes the story (about a minute) and sends the public data. Deny keeps the file in the Inbox and puts nothing live.",
        "If the story fails, the results stay live and Retry story is on the News Editor, Story writer tab, where Rewrite story writes it again and the photos for each story are chosen. A changed photo shows in a written story at once.",
        "A newer file for a round that is still waiting replaces it. After a round is confirmed, a newer file is HELD and changes nothing until you confirm it.",
        "Cancel round works only for a round with no results. Restore brings it back.",
        "Stewarding, Protests: Review a protest, then rule on it: dismiss, 1, 3 or 5 points, or a DSQ for that race. Your comment is public, and a DSQ needs one. A ruling can be reopened or reversed.",
        "Stewarding, Car and class: a driver who raced another car or class than the one they started with. You choose a DSQ for the whole night, or Leave it. A driver can only score in the first class they raced in the season: results in another class are always left out of the standings, and the flag appears the moment the file is uploaded (before Confirm too), with a red exclamation on the tab. Stewarding reads protests and these flags in one request.",
        "A round counts in the standings once its window (scheduled start plus 12 hours) has ended and no protest is open.",
        "Posted by the server lists everything the server sent and what happened to it. Upload by hand adds a results file yourself. It has the same checks but sends no alert.",
        "News Editor: write posts, edit a story with a reason (shown at the bottom of the story), withdraw and republish, or delete and undo."
      ])
    ]),
    panel('End of season', [
      list([
        "Results, Season tab, End season: it names the champion of each class (drop weeks and penalties applied, ties by wins, then second places and so on, then who reached the best result first), sets the season to Finished and writes the recap story.",
        "It refuses while a round is waiting or a protest is open. If some rounds were not raced, it asks first and cancels them.",
        "Reopen season undoes it: the season is Active again, the champions are cleared and the recap story is withdrawn.",
        "Drivers and their career stats carry over. Classes are chosen fresh in the next season."
      ])
    ])
  ));

  /* ======================= Behind the scenes ======================= */
  add(RR.view('backend'), stack(
    panel('Apps Script files', [
      "Ten files in the _raceroom-apps-script folder. Each is pasted whole into a script file of the same name.",
      grid(['File', 'What it does'], [
        ['Core.gs', "Settings, the list of Sheet tabs and their columns, the Race Club menu, shared helpers. The backend version number is RC.VERSION."],
        ['Web.gs', "The one web address. A post with the results secret is a results file. Anything else is an admin request that needs a login."],
        ['Seasons.gs', "Saves and loads the seasons made in the wizard."],
        ['Results.gs', "Receives the server files, ignores duplicates, keeps the raw file, reads it into Results and Laps, confirm, deny, cancel, the member list. RC_PROTEST_HOURS (12) is here."],
        ['Scoring.gs', "The scoring rules: class order, points, DNF and DSQ, bonuses, drop weeks, standings."],
        ['Publish.gs', "Builds the public data and writes league.js to race-club-data. Also the text of the Season page."],
        ['Stories.gs', "The story writer (Gemini): its instructions, the facts it gets, the pictures, the season memory."],
        ['Stewarding.gs', "Protests, penalties, car and class flags, and the email when a protest form locks."],
        ['News.gs', "The News Editor: your posts, and editing, withdrawing and deleting stories."],
        ['EndSeason.gs', "End season, Reopen season, Clear test data."]
      ])
    ]),
    panel('Sheet tabs', [
      "The code finds columns by their heading, so you may move columns but never rename them.",
      grid(['Tab', 'Holds'], [
        ['Inbox', "One row per file the server posted, with its status (received, processed, duplicate, held, denied) and a note."],
        ['Seasons', "One row per season: name, status, rounds, classes, drop weeks, champions."],
        ['SeasonFiles', "The whole season as the wizard made it. It holds the SERVER PASSWORDS. It is never published."],
        ['Rounds', "One row per calendar entry: Round ID, date, track, status, when protests close, photos."],
        ['Drivers', "Every driver seen, with Blacklist and Hide details."],
        ['Results', "One row per driver per session, as the server sent it, with points, bonus and status."],
        ['Laps', "Every lap of every driver."],
        ['Penalties', "Every ruling: points, DSQ, reverse, cleared. Reversing adds a row; the original stays."],
        ['Protests', "One row per protest. The filer's narrative lives only here."],
        ['Posts', "Your own news posts."],
        ['Stories', "The race stories, previews and recaps, with their history."],
        ['Admins', "Each admin's name and password hash."],
        ['AdminLog', "A record of what admins did."]
      ])
    ]),
    panel('Script Properties', [
      "Apps Script, Project Settings, Script Properties. Every secret lives here.",
      grid(['Name', 'What it is for'], [
        ['INGEST_SECRET', "The secret in the results address. Race Club > Make a new results secret changes it."],
        ['RAW_FOLDER_ID', "The Drive folder that keeps the raw results files."],
        ['WEBAPP_URL', "The web app address."],
        ['ADMIN_name', "One per admin: that admin's random salt. The hash is on the Admins tab. Both are needed to check a password."],
        ['SESSION_EPOCH', "Changing it logs every admin out."],
        ['NOTIFY_EMAIL', "on or off: the email when a round is posted."],
        ['NOTIFY_DISCORD_WEBHOOK', "The Discord webhook for alerts. Optional."],
        ['GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH', "Publishing to race-club-data. Set with Race Club > Publish: set up GitHub. The token is fine-grained: Contents read and write on that one repository."],
        ['GEMINI_API_KEY', "The story writer's key. It never leaves Apps Script."],
        ['GEMINI_MODEL', "The model the writer uses. If missing, the default in Stories.gs is used."],
        ['GEMINI_FALLBACK_MODELS', "Backup models, separated by commas, tried when the first fails."]
      ])
    ]),
    panel('The Race Club menu in the Sheet', [
      list([
        "Build or repair the tabs: makes missing tabs and columns. Safe to run again.",
        "Set the web app address, Show the results address (private), Make a new results secret.",
        "Add an admin or change a password, Remove an admin, List admins, Log every admin out.",
        "Publish: set up GitHub (the token and the data repository).",
        "Results: read a round again (use it after a parser or scoring change, to rebuild an old round).",
        "Result emails: turn on or off, Discord alerts: set the webhook."
      ])
    ]),
    panel('Other parts', [
      list([
        "The relay is a Google Cloud Run function. It takes the server's post, checks a token in the path, and forwards it unchanged to the Apps Script address with the results secret. It is needed because the RaceRoom tool only accepts an address ending in /*.json, and Apps Script needs one ending in /exec.",
        "Admin login: passwords are hashed (PBKDF2) and never stored. 5 wrong tries for one name, or 30 in all, lock the login for 15 minutes.",
        "Protest forms lock after 10 minutes of wrong round passwords, and you get an email once.",
        "Nothing runs on a timer. The public data is rebuilt after Confirm, Deny, Cancel or Restore, a protest, a ruling, ending a season, a round read again, and the Publish site data button.",
        "The GitHub workflow RaceRoom pictures runs by itself every day and keeps assets/r3e current (see Picture database)."
      ])
    ])
  ));

  /* ======================= How to change things ======================= */
  add(RR.view('change'), stack(
    panel('I want to change...', [
      grid(['What', 'Where', 'How'], [
        ['Points, bonuses, drop weeks, rules, classes or calendar for a season', 'Season Wizard', "Open the season in the wizard, change the step, press Create a season, then press Publish site data on Results, Rounds. Check the Season page and the standings after."],
        ['The scoring rules themselves (the 50% laps rule, the order, how bonuses work)', 'Scoring.gs', "Edit it, paste into Apps Script, deploy a new version, then Race Club > Results: read a round again for rounds already raced."],
        ['Protest window length (12 hours)', 'Results.gs, RC_PROTEST_HOURS. Also the text on help.html and the protest page', "Change the number, deploy, then update the wording in js/raceroom-help.js."],
        ['Penalty sizes (1, 3, 5) or the DSQ rule', 'Stewarding.gs and js/raceroom-stewarding.js', "Both files list the options. Change both, deploy, push. Then update js/raceroom-help.js."],
        ['The league rules text', 'js/raceroom-help.js', "Plain sentences in three tabs. Edit, push."],
        ['How the stories read', 'Stories.gs', "The writer's instructions are in it. Edit, deploy, then use Rewrite story on a round to test."],
        ['The story model', 'Script Properties', "Change GEMINI_MODEL, and GEMINI_FALLBACK_MODELS for backups. No deploy needed."],
        ['The menu at the top', 'js/raceroom-shell.js, MENU', "One list. A new page also needs its own .html file."],
        ['The version number in the footer', 'js/raceroom-shell.js, VERSION', "Change it each time the site is updated."],
        ['Colors, fonts, sizes', 'css/race-club.css', "The colors are the --rr-... lines at the top. Change them there and nowhere else."],
        ['Legal notice', 'js/raceroom-shell.js, LEGAL_SHORT, and legal.html', "The short notice is in the shell, the full text in legal.html."],
        ['Home tile pictures', 'assets/images/home', "See the Tile pictures tab."],
        ['Admin button icons', 'js/raceroom-shell.js, ICONS; js/raceroom-hub.js', "Each admin button names an icon in raceroom-hub.js. Icons are drawn in ICONS in the shell. The button look is .rr-tool in css/race-club.css."],
        ['The server banner picture', 'js/raceroom-admin.js, SERVER_IMAGE', "If the picture is uploaded again in the server tool it gets a new address. Copy it from an exported file's Thumbnail."],
        ['Add an admin, change a password, log everyone out', 'The Sheet, Race Club menu', "Add an admin or change a password, Log every admin out."],
        ['Turn result emails or Discord alerts on or off', 'The Sheet, Race Club menu', "Result emails: turn on or off, Discord alerts: set the webhook."],
        ['A new admin tool or a new page', 'A new .html file, a .js file, raceroom-hub.js', "Copy a small existing page such as members.html. Give it data-rr-main and data-rr-title. Add its tile in raceroom-hub.js, its sub-tabs in TABSETS if it has any, and a line in this documentation."]
      ])
    ]),
    panel('When something looks wrong', [
      grid(['What you see', 'Look at', 'What to do'], [
        ['A round did not appear after the race', 'Results, Posted by the server, or the Inbox tab', "The Status and Note say why: no race session, nobody classified, duplicate, held or cancelled round. If the file is there, use Race Club > Results: read a round again."],
        ['The round is waiting and standings are missing it', 'Results, Rounds', "It needs Confirm. After that it counts when the protest window has ended and no protest is open."],
        ['Standings or a page show old data', 'Results, Rounds', "Press Publish site data, then hard refresh (Cmd+Shift+R)."],
        ['Publish says GitHub is not set up', 'Race Club menu', "Publish: set up GitHub, and check the token has not expired."],
        ['A story failed or reads badly', 'News Editor, Story writer', "Retry story, or Rewrite story. Or press Edit story to change the text."],
        ['A driver is in the wrong class or has no points', 'Stewarding, Car and class; Results tab', "A driver counts only in the class of the first round they raced in the season; later rows in another class are left out and flagged in Stewarding, Car and class. Check the flag and the Season page."],
        ['Cannot log in', 'The Sheet, Race Club menu', "Too many wrong tries lock the login for 15 minutes. Add an admin or change a password resets a forgotten password."],
        ['The Race Club menu is missing in the Sheet', 'The browser', "Reload the Sheet tab."],
        ['A picture is old or missing', 'The browser, assets/r3e', "Hard refresh. For RaceRoom pictures see Picture database."],
        ['Something new needs a column in a tab', 'The Sheet, Race Club menu', "Build or repair the tabs."]
      ])
    ])
  ));
})();
