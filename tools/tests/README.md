# Race Club tests

These are the checks Claude ran while building the site. They are kept here as a record and as a starting point; they are not run by GitHub.

- `gs/`: the Apps Script code (Core, Scoring, Results, Publish, Stewarding, Stories ...) loaded into a fake Google Sheet (`harness.js`) and exercised.
  - `t25.js` is the end to end season (8 drivers, 2 classes, 6 rounds, protest, steward DSQ, end of season) compared with an independent hand calculation of the rules. It also writes `/tmp/gs/e2e.js`, the league file the page tests read.
  - `t27.js` checks one class per driver (other class left out and flagged, also for a round still waiting for Confirm), the countback tie-break and the drivers list.
  - `t28.js` checks that a saved draft is hidden from every list but the wizard's, the preview story is written only on Create, and Gemini retries a busy answer.
- `pages/`: the public and admin pages loaded in jsdom (`npm install` first) to prove they draw without errors and show the right text. `t26.js` is the full-page check on the e2e league file. `t29.js` checks the admin breadcrumb, the logo helper and that typing in a date box does not redraw it.

They were written for Claude's workspace, so two things are hard coded and need changing to run them on a Mac:
1. The site folder is `/mnt/user-data/uploads/Race Club/`. Replace it with the real path of this repository.
2. Some tests write and read league files in `/tmp/gs` and `/tmp/pg`, and a few read real RaceRoom server files from `/mnt/user-data/uploads/`. Those server files are not in the repository.

Run with `node gs/t25.js` (and `node gs/t27.js`), or `cd pages && npm install && node t26.js`.
