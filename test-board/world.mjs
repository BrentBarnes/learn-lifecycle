// v3 phase 1: the one program every view shows. The Experiments list and the Board draw the same tests, so switching
// views (R, W) during a rep or from the sidebar shows one consistent program, the way GrowthBook and the board would on
// the job. Plan: PLAN.md phase 1. Pure, so tests run it in node.
//
// Per board row: one stopped test (finished before the current one started), one running test, and one draft after it.
// Running and stopped tests are full experiment cases (makeCase on U7, so Overview, Results and Health all have data).
// The rep you're playing can be pinned in as that row's running test.

import { makeCase, rng, BOARD_ROWS, BOARD_WEEKS, FREEZE } from "./engine.mjs";

export const DAY = 86400000;
export const WEEK0 = new Date(2026, 9, 26, 9);           // Monday Oct 26, the board's first column
export const TODAY_WEEK = 2;                              // the program's "today": Tuesday of week 3 (Nov 10)
export const TODAY = new Date(WEEK0.getTime() + (TODAY_WEEK * 7 + 1) * DAY);
export const ROW_SURFACE = ["campaign", "sms", "welcome", "cart", "post"];   // BOARD_ROWS order
const LABEL_ROW = { "Daily campaign": 0, SMS: 1, "Welcome flow": 2, "Abandoned cart flow": 3, "Cart flow": 3,
  "Post-purchase flow (bean buyers)": 4, "Post-purchase flow": 4 };
export const rowOfLabel = (label) => LABEL_ROW[label] ?? -1;
const READERS = ["Rosa", "Priya", "Theo"];
const RUN_KINDS = ["running", "running", "ship", "inconclusive", "lossGoal", "guardBreach", "srm"];
const STOP_KINDS = ["ship", "inconclusive", "lossGoal", "guardBreach"];
const STOP_RESULT = { ship: "Won", lossGoal: "Lost", guardBreach: "Lost", inconclusive: "Inconclusive" };

export const weekOf = (date) => Math.floor((date.getTime() - WEEK0.getTime()) / (7 * DAY));
const fmt = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
const startDate = (c, today) => new Date(today.getTime() - (c.day - 1) * DAY);

function caseFor(seed, kind, surface, today, avoid) {
  for (let k = 0; k < 30; k++) {
    const c = makeCase(seed + k * 7919, kind, 2, "U7", today, { surface });
    if (!avoid.includes(c.name)) return c;
  }
  return null;   // flows have only a few ideas: the row goes without that test rather than repeat a name
}
// the bar a test makes on the board: clipped to the board's eight weeks; null when it's all off the board
function bar(startW, endW) {
  const s = Math.max(0, startW), e = Math.min(BOARD_WEEKS.length - 1, endW);
  return e < s ? null : { start: s, len: e - s + 1 };
}

// pin = the rep's own case (experiment screen) or { name, surfaceLabel } (a U6 scene), shown as its row's running test
export function makeWorld(seed, pin = null) {
  const r = rng(seed), exps = [];
  ROW_SURFACE.forEach((surface, row) => {
    const names = [];
    const pinHere = pin && rowOfLabel(pin.surfaceLabel) === row;
    // running now
    let run;
    if (pinHere && pin.goalRows) run = { c: pin, pinned: true };
    else if (pinHere) run = { c: { name: pin.name, surfaceLabel: pin.surfaceLabel, surface, day: 7, planned: 7 }, pinned: true, thin: true };
    else run = { c: caseFor((r() * 2 ** 31) | 0, RUN_KINDS[Math.floor(r() * RUN_KINDS.length)], surface, TODAY, names) };
    names.push(run.c.name);
    const runStart = startDate(run.c, TODAY);
    const runEnd = new Date(runStart.getTime() + (run.c.planned - 1) * DAY);
    // stopped: ended two days before the running one started
    const stopToday = new Date(runStart.getTime() - 2 * DAY);
    const stop = caseFor((r() * 2 ** 31) | 0, STOP_KINDS[Math.floor(r() * STOP_KINDS.length)], surface, stopToday, names);
    if (stop) names.push(stop.name);
    // draft: the first week after the running test that's clear of the freeze
    let dW = Math.max(TODAY_WEEK, weekOf(runEnd)) + 1;
    while (FREEZE.includes(dW)) dW++;
    const draft = dW < BOARD_WEEKS.length ? caseFor((r() * 2 ** 31) | 0, "running", surface, TODAY, names) : null;
    const reader = () => READERS[Math.floor(r() * READERS.length)];
    // a pinned rep's bar stops at today: running past today would give away "is it time to read?"
    const runBar = bar(weekOf(runStart), run.pinned ? TODAY_WEEK : Math.max(TODAY_WEEK, weekOf(runEnd)));
    // one test per row per week on the board: the stopped bar ends the week before the running one starts
    if (stop) { const stopStart = startDate(stop, stopToday);
      exps.push({ id: `x${row}s`, row, status: "Stopped", c: stop, owner: reader(), started: fmt(stopStart), ended: fmt(stopToday),
        result: STOP_RESULT[stop.kind], bar: bar(weekOf(stopStart), Math.min(weekOf(stopToday), (runBar ? runBar.start : 0) - 1)) }); }
    exps.push({ id: `x${row}r`, row, status: "Running", c: run.c, pinned: !!run.pinned, thin: !!run.thin, owner: reader(),
      started: fmt(runStart), readOn: fmt(runEnd), due: run.c.day >= run.c.planned, bar: runBar });
    if (draft) exps.push({ id: `x${row}d`, row, status: "Draft", c: draft, owner: reader(), startsOn: BOARD_WEEKS[dW],
      bar: bar(dW, dW + Math.ceil(draft.planned / 7) - 1) });
  });
  return { seed, exps, todayWeek: TODAY_WEEK, today: fmt(TODAY) };
}

// the world's tests as board cards (the shape boardGrid draws); marked = index of the pinned test, if any
export function boardCards(world) {
  const cards = [], ids = [];
  for (const x of world.exps) {
    if (!x.bar) continue;
    cards.push({ name: x.c.name, row: x.row, start: x.bar.start, len: x.bar.len, offer: x.c.creative === false, reader: x.owner });
    ids.push(x.id);
  }
  const pin = world.exps.find((x) => x.pinned);
  return { cards, ids, marked: pin ? ids.indexOf(pin.id) : undefined };
}

// a board rep's cards as the program's tests (no results behind them: they're cards on the board, not GrowthBook pages)
export function worldFromBoard(c) {
  const today = c.past || 0;
  const exps = c.cards.map((k, i) => ({ id: "b" + i, row: k.row, owner: k.reader || "Unassigned", thin: true,
    status: k.start + k.len <= today ? "Stopped" : k.start <= today ? "Running" : "Draft",
    c: { name: k.name, surfaceLabel: BOARD_ROWS[k.row], creative: !k.offer }, startsOn: BOARD_WEEKS[k.start],
    bar: { start: k.start, len: k.len } }));
  exps.push({ id: "bnew", row: c.card.row, owner: c.card.reader || "Unassigned", thin: true, pinned: true, status: "Draft",
    c: { name: c.card.name, surfaceLabel: BOARD_ROWS[c.card.row], creative: !c.card.offer }, bar: null });
  return { exps, todayWeek: today, today: BOARD_WEEKS[today], fromBoard: true };
}
