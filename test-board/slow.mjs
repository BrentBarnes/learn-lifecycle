// v3 unit 10: Slow metrics (the year game's prerequisite, PLAN.md roadmap 3). A goal like "second order within 60 days"
// can't be counted until 60 days after the last person entered. GrowthBook calls this a metric's conversion window.
// Two steps in U6's style, on the Overview and Results tabs:
//   U14a When's the read date?  entry weeks plus the window, read off the Overview
//   U14b Read it in the window  before the read date it's keep running, even when the row is already green: the last
//                               people in haven't had their 60 days, so the count is still filling in
// Pure, so tests run it in node. Registered into the engine's tables by app.mjs at load.

import { makeCase, rng, pctStr } from "./engine.mjs";

const pick = (r, a) => a[Math.floor(r() * a.length)];
const between = (r, a, b) => a + r() * (b - a);
const IDEAS = [["Post-purchase: brew tips", "Help dialing in the grind keeps buyers happy enough to come back", true],
  ["Post-purchase 3: reorder reminder at 3 weeks", "A reminder when the bag runs low brings the second order", true],
  ["Post-purchase 2: 'add a second bag' block", "Daily drinkers go through a bag fast: asking early brings the reorder forward", true]];
const METRIC = (w) => `Second order within ${w} days`;

const PART = { screen: "experiment", parent: "U14", daily: false, pass: [5, 6], keyUnit: "U6" };
export const UNITS14 = {
  U14a: { ...PART, id: "U14a", step: 1, name: "When's the read date?", tabs: ["o"], calls: [], kinds: ["win60", "win30", "win90", "win60", "win30"], meet: ["win60", "win30", "win90"] },
  U14b: { ...PART, id: "U14b", step: 2, name: "Read it in the window", tabs: ["o", "a"], calls: ["ship", "keepA", "running", "inconclusive"], daily: true, pass: [6, 7],
          kinds: ["slowEarlyWin", "slowDueWin", "slowEarlyFlat", "slowDueFlat", "slowEntry", "slowEarlyWin", "slowDueLoss"], meet: ["slowEarlyWin", "slowDueWin", "slowDueFlat"] },
};
export const STEPS14 = Object.keys(UNITS14);

export function makeSlow(seed, kind, stage, unit, today) {
  const r = rng(seed ^ 0x510e);
  const weeks = pick(r, [4, 6, 8]), win = unit === "U14a" ? +kind.slice(3) : 60, entry = weeks * 7, read = entry + win;
  const idea = pick(r, IDEAS);
  if (unit === "U14a") {
    const c = makeCase(seed, "running", stage, "U8b", today, { surface: "post", idea, day: Math.min(entry - 1, 7 + Math.floor(r() * 14)), planned: entry });
    setSlow(c, weeks, win, false);
    // a fourth, later date (the entry counted twice) so the answer isn't simply the biggest number
    const opts = [["d" + read, `Day ${read}`], ["d" + entry, `Day ${entry}`], ["d" + win, `Day ${win}`], ["d" + (read + entry), `Day ${read + entry}`]];
    for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [opts[i], opts[j]] = [opts[j], opts[i]]; }
    return Object.assign(c, { unit, kind, stage, seed, screen: "experiment", opts, answer: "d" + read, target: "ov-window",
      ask: "The plan's read date is blank. When can this test be read?",
      hint: "Two numbers on the Overview: how many weeks people enter, and the goal's window. The last person in needs their whole window. Read date = entry days + window days.",
      why: `People enter for ${weeks} weeks, so the last one arrives on day ${entry}. The goal counts orders within ${win} days of each person's first order, so that last person's count is complete on day ${entry} + ${win} = day ${read}.` });
  }
  // U14b: the day sets the call. Before day `read` it's keep running, whatever the row shows.
  const base = { slowEarlyWin: "ship", slowDueWin: "ship", slowEarlyFlat: "inconclusive", slowDueFlat: "inconclusive", slowEntry: "running", slowDueLoss: "lossGoal" }[kind];
  const early = kind.startsWith("slowEarly"), day = kind === "slowEntry" ? Math.floor(between(r, 10, entry - 2)) : early ? Math.floor(between(r, entry + 5, read - 5)) : read + Math.floor(r() * 6);
  const c = makeCase(seed, base, stage, "U8b", today, { surface: "post", idea, day: base === "running" ? day : entry, planned: entry });
  setSlow(c, weeks, win, true);
  c.day = day;
  const answer = early || kind === "slowEntry" ? "running" : c.answer;
  const g = c.goalRows[0];
  return Object.assign(c, { unit, kind, stage, seed, screen: "experiment", answer, target: early || kind === "slowEntry" ? "ov-read" : "g0",
    ask: "Today's Monday read. What's the call?",
    hint: "O first: the read date is entry plus the window. Before it, the last people in haven't had their days to order, so it's keep running, even with a green row. On the read date, read the goal row as usual.",
    why: kind === "slowEntry" ? `Day ${day}: people are still entering. Keep it running.`
      : early ? `Day ${day}: entry closed on day ${entry}, but the people who came in last have had only ${day - entry} of their ${win} days. The count is still filling in${g.ctw >= 0.95 ? ", so a green row now can still fade" : ""}. Keep it running to day ${read}.`
      : answer === "ship" ? `Day ${day}: past the read date (day ${read}), every window is closed. The goal is up ${pctStr(g.pct)} with its range above zero. Ship B.`
      : answer === "keepA" ? `Day ${day}: every window is closed. The goal's range is below zero. Keep A.`
      : `Day ${day}: every window is closed, and the goal's range crosses zero. Inconclusive.` });
}
// the plan as a slow test writes it: entry weeks, the goal and its window, the read date (or a blank to work out)
function setSlow(c, weeks, win, showRead) {
  const entry = weeks * 7, read = entry + win;
  if (c.goalRows[0].name === c.overview.goal) c.goalRows[0].name = METRIC(win);
  c.overview.goal = METRIC(win);
  c.overview.extra = [["Entry", `${weeks} weeks: new bean buyers join the test until day ${entry}`, "ov-entry"],
    ["Conversion window", `${win} days after each person's first order. GrowthBook counts a second order only inside it.`, "ov-window"]];
  c.planned = read;
  c.plan = showRead ? `Day ${read}: ${weeks} weeks of entrants, then the ${win}-day window for the last of them` : "Blank: work it out";
}

export const LESSONS14 = {
  U14a: [
    { h: "Some goals take weeks to count.",
      p: "\"Second order within 60 days\" can't be counted the day someone buys. GrowthBook calls the 60 days the metric's conversion window. A flow test lets people enter for some weeks, and the last person in needs their whole window too. So the read date is the entry days plus the window.",
      vis: { live: { unit: "U14a", kind: "win60", seed: 3, tab: "o" }, mark: ["ov-entry", "ov-window"] },
      predict: { q: "People enter for 6 weeks (day 42). The goal's window is 60 days. When's the read date?", opts: ["Day 102", "Day 42"], answer: 0, reveal: "Day 102: the last person in, on day 42, needs their 60 days." } },
  ],
  U14b: [
    { h: "Green in the window isn't a win yet.",
      p: "After entry closes, the test still runs: it's waiting for the last people's windows. Until then the count is still filling in, and the people who joined late have had the least time to order. A row that's green now can fade. GrowthBook can leave out people whose window is still open (\"exclude in-progress conversions\"), but the call still waits for the read date. Then read the goal row the usual way.",
      vis: { live: { unit: "U14b", kind: "slowEarlyWin", seed: 4, tab: "a" }, mark: ["g0"] },
      predict: { q: "Day 70 of a test that reads on day 102. The goal is green. The call?", opts: ["Ship B", "Keep it running"], answer: 1, reveal: "Keep it running. The people who joined last have had only 28 of their 60 days." } },
  ],
};
