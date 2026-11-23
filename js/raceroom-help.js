/* Race Club public Help page: the league rules in short.
   Three tabs: The league (format and how a round goes), Points (how a race scores), Penalties (stewarding and protests).
   The text is plain and written here. If a rule changes in the league, change it here too (Website Documentation, "How to change things").
   Built only from the shared builders in raceroom-shell.js (RR.*). */
(function () {
  'use strict';
  var RR = window.RR, el = RR.el, add = RR.add;

  function panel(title, items) {
    var p = el('div', 'rr-panel rr-stack');
    p.appendChild(RR.heading(title));
    var ul = el('ul', 'rr-body rr-list');
    items.forEach(function (t) { ul.appendChild(el('li', '', t)); });
    p.appendChild(ul);
    return p;
  }
  function stack() {
    var s = el('div', 'rr-stack');
    for (var i = 0; i < arguments.length; i++) s.appendChild(arguments[i]);
    return s;
  }

  /* ---------------- The league ---------------- */
  add(RR.view('league'), stack(
    panel('The format', [
      "Race Club is a RaceRoom league run in seasons. Each season has its own classes, cars, rules and calendar.",
      "A round is one night on a dedicated server: practice, qualifying, then one or more races. The season page shows the exact format.",
      "Join in Discord to get the server name and the password for the round. There is no sign up on this site. You are in a season once you finish a session in one of its rounds.",
      "Names, results and lap times are public."
    ]),
    panel('One car for the season', [
      "Pick one car and class and stay in it all season. The first class you race in is your class for the whole season, and you can only ever score points in it.",
      "Results in any other class are never counted, and the stewards are told about them as soon as the results are uploaded. Racing a later round in another car can also get you disqualified from that night.",
      "Using the same livery all season is encouraged, but it is not a rule."
    ]),
    panel('After the race', [
      "RaceRoom decides the result. The finishing order and every penalty given in the game stand.",
      "The results are checked and posted on the site, and a news story is written.",
      "Protests stay open for 12 hours after the scheduled start of the round. After that the round counts in the standings, once every protest is ruled.",
      "At the end of the season the champion of each class is crowned."
    ])
  ));

  /* ---------------- Points ---------------- */
  add(RR.view('points'), stack(
    panel('Race points', [
      "Only races score. Points go by your finishing place in your own class, using the points table for that class on the Season page.",
      "If a night has more than one race, each race scores on its own.",
      "To score you must finish, or retire having completed at least half the laps of the winner of your class. Fewer laps than that, a no start or a disqualification scores zero."
    ]),
    panel('Bonus points', [
      "Pole position: the fastest qualifying lap in your class. Given once per night.",
      "Fastest lap: the fastest valid race lap among the drivers who score in your class. Given in every race.",
      "Clean race: you finished the race with no incident points from the game. Given in every race.",
      "How many points each bonus is worth is set for each class, and is on the Season page.",
      "A disqualification takes away every bonus."
    ]),
    panel('Dropped rounds and ties', [
      "Each season drops its worst rounds. A round you missed counts as zero and is dropped first. Bonus points go with the round they were earned in.",
      "Penalty points are taken off your season total. They stay even when the round they came from is dropped. A total can go below zero.",
      "Drivers are ranked inside their own class only. Drivers from different classes are never ranked together.",
      "If two drivers in a class have the same points, the one with more wins is ahead. If that is level, the one with more second places, then more third places, and so on down the finishing order. If they are still level, the one who reached their best result first, in an earlier round, is ahead.",
      "Finishing places count from every race you finished, including races in a dropped round. Rounds still waiting out their protest window do not count yet, for points or for this tie-break."
    ])
  ));

  /* ---------------- Penalties ---------------- */
  add(RR.view('penalties'), stack(
    panel('What stewards look at', [
      "Penalties given in the game are final. Stewards only look at what the game cannot see, such as contact it missed.",
      "Stewards also look at drivers who raced in a different car or class than the one they started the season in. A class change never scores, and the steward decides if more is needed.",
      "Penalties are points taken off your season total. There are no time penalties."
    ]),
    panel('The penalties', [
      "1 point: a light penalty, or a self report.",
      "3 points: a medium penalty, where the other driver lost some time.",
      "5 points: a severe penalty, where the other driver lost a lot of time.",
      "Disqualification: for the race, or the whole night for a car or class breach. You score no points and no bonus, and the drivers behind move up one place. The steward always writes a comment.",
      "Intentionally wrecking another driver can lead to a disqualification."
    ]),
    panel('Filing a protest', [
      "Use the flag icon at the top right of any page. You need the round password from Discord, so only league members can protest.",
      "Choose the race, the driver, the lap and a reason, then describe what happened. If you caused the contact yourself, tick Self report.",
      "A protest must be filed within 12 hours of the scheduled start of the round.",
      "The league admin rules on every protest. They can dismiss it or give a penalty.",
      "Protests are public, including the ones that were dismissed, with the outcome and the steward's comment. Only what you wrote in the description stays private."
    ]),
    panel('Good to know', [
      "A ruling never changes the race result itself. It is added on top, and it can be reversed.",
      "The league can ban a driver from its servers.",
      "A driver can ask to be left out of the news stories by name. The story calls them the driver of their car."
    ])
  ));
})();
