// v3: Run the quarter (CURRICULUM.md, "Run the program"). Thirteen Mondays at Fernhill Coffee Co., Oct 5 to Dec 28 2026.
// You plan the board from a backlog of ideas, then each Monday: launch what's scheduled, check the running tests,
// read the ones at their read date and make the call, place the next cards, and move on to the next Monday.
// Calls have lasting effects: a shipped winner adds revenue every week after, a shipped loser or a shipped bug costs.
// Pure state and rules, so tests run it in node; app.mjs draws it.
//
// Each test has a hidden truth (what B really does), drawn when the card is placed. On a Monday its page is a normal
// experiment case (makeCase on "U7", so it has Overview, Results and Health), built from the truth and its day.
// Bugs (broken split, too good, swapped goal) show from the first week, so checking Health on running tests pays off.

import { makeCase, rng, phi, BOARD_ROWS } from "./engine.mjs";
import { addSecondary } from "./overview.mjs";
import { power, TRAFFIC } from "./sizing.mjs";
import { MARGIN, keepRate, breakEven } from "./money.mjs";

export const DAY = 86400000;
export const QSTART = new Date(2026, 9, 5, 9);             // Monday Oct 5 2026
export const NWEEKS = 13;
export const QWEEKS = Array.from({ length: NWEEKS }, (_, i) => new Date(QSTART.getTime() + i * 7 * DAY).toLocaleDateString("en-US", { month: "short", day: "numeric" }));
export const QFREEZE = [7, 8];                             // Nov 23 and Nov 30: BFCM, nothing new runs
// a run's calendar: a quarter uses the constants above, the year game (newYear) carries its own
export const nw = (q) => q.nweeks || NWEEKS;
export const wk = (q) => q.labels || QWEEKS;
export const fz = (q) => q.freeze || QFREEZE;
const startOf = (q) => (q.start ? new Date(q.start) : QSTART);
export const ROWS = BOARD_ROWS;
export const ROW_SURFACE = ["campaign", "sms", "welcome", "cart", "post"];
export const LEN = [1, 1, 6, 4, 6];                        // weeks a test runs on each row (the engine's planned days / 7)
export const PLANNED = [7, 5, 42, 28, 42];
export const WEEKLY_REV = [120000, 25000, 30000, 35000, 25000];   // made-up revenue each place earns in a week; flows about 40% of it, as in Klaviyo's 2026 benchmarks
const READERS = ["Rosa", "Priya", "Theo"];

// the backlog: [name, hypothesis, creative] per row. Made up, made up.
export const BACKLOG = [
  [["Hero: GIF vs static", "A moving hero shows the pour and earns more per send", true],
   ["Subject: question vs statement", "A question in the subject line pulls more regulars in", true],
   ["Product grid: 4 vs 6 coffees", "Fewer, bigger products make the choice easier", true],
   ["Subject: price vs feature", "Leading with the waterproof rating beats leading with price", true],
   ["Review stars under each product", "Star ratings near the price make buyers trust the fit", true],
   ["Short copy vs long copy", "Two lines and a button beat three paragraphs on a daily send", true],
   ["Button: 'Shop beans' vs 'Find your fit'", "A fit-first button gets more first-time bean buyers to click through", true],
   ["Free-shipping line in the header", "Saying shipping is free over $99 lifts order rate", false],
   ["Sampler bundle block above the fold", "Showing the 4-for-3 bag bundle first raises order size", false],
   ["Gift with purchase over $150", "A free mug over $150 lifts order size", false]],
  [["SMS: emoji vs no emoji", "A coffee emoji makes the text feel less like an ad", true],
   ["SMS: bundle builder link vs beans page", "Sending people to the bundle builder raises order size", true],
   ["SMS: first name in the opener", "A first name gets the text read", true],
   ["SMS: short link vs full link", "A branded full link looks safer to tap", true],
   ["SMS: code BREW15", "A 15% code in the text brings back lapsed buyers", false],
   ["SMS: early access to the sale", "Text-only early access makes subscribers feel first in line", false]],
  [["Welcome 2: bundle builder block", "Showing the bundle builder in email 2 gets a first order sooner", false],
   ["Welcome 1: founder story vs product grid", "The founder story builds trust before the first order", true],
   ["Welcome 3: $10 off the first bean order", "A small first-order discount closes the fence-sitters", false]],
  [["Cart 1: reviews block", "Reviews for the item left in the cart answer the fit question", true],
   ["Cart 1: $10 off vs no discount", "A small discount brings back carts that stalled on price", false],
   ["Cart 2: brew guide", "A brew guide answers the grind worry that stalls bean carts", true]],
  [["Post-purchase: care guide vs product block", "A brew guide makes the second order feel natural", true],
   ["Post-purchase: gear cross-sell", "Bean buyers who see the brewer buy gear sooner", true],
   ["Post-purchase: 15% off gear", "A bean buyer's gear discount brings the second order sooner", false]],
];

// the lift worth acting on, from each idea's plan: what the player sizes for once Sizing is passed
const SMALL = /^Subject|^SMS: first name|^SMS: emoji|^Button/;
export const IDEAS_PER_ROW = [6, 4, 3, 3, 3];
export const DEFAULT_LIFT = [0.08, 0.15, 0.3, 0.25, 0.25];
// Money (once unit 9 is passed): offers give something away, so a shipped offer is worth its change in gross profit,
// not revenue. GIVE = the share of B's revenue each offer gives back (a $10 code on a ~$150 bean order is about 7%; free
// shipping and a gift cost about 5%; the 4-for-3 bundle about 8%). Early access gives nothing away.
export const GIVE = { "Free-shipping line in the header": 0.05, "Sampler bundle block above the fold": 0.08, "Gift with purchase over $150": 0.05,
  "SMS: code BREW15": 0.15, "Welcome 3: $10 off the first bean order": 0.07, "Cart 1: $10 off vs no discount": 0.07, "Post-purchase: 15% off gear": 0.15 };
export const giveOf = (idea) => GIVE[idea[0].replace(/^Rerun: /, "")] || 0;
export const profitLift = (eff, d) => ((1 + eff) * keepRate(d)) / MARGIN - 1;   // B's change in gross profit; with nothing given away it's eff
// what a shipped test adds each week: revenue in a plain quarter, gross profit in a money quarter
export const weeklyGain = (q, t) => Math.round(q.money ? profitLift(t.eff, giveOf(t.idea)) * WEEKLY_REV[t.row] * MARGIN : t.eff * WEEKLY_REV[t.row]);
// what an idea is worth a week if it wins at the lift it plans for (the backlog's roadmap lane)
export const ideaWorth = (q, idea, row) => { const lift = liftOf(idea, row); return q && q.money ? profitLift(lift, giveOf(idea)) * WEEKLY_REV[row] * MARGIN : WEEKLY_REV[row] * lift; };
export const liftOf = (idea, row) => SMALL.test(idea[0].replace(/^Rerun: /, "")) ? (row === 0 ? 0.05 : 0.1) : DEFAULT_LIFT[row];

// sized = the player sets each card's length with the Power Calculator (after Sizing); otherwise lengths are fixed
export function newQuarter(seed, sized = false, money = false) {
  const backlog = [], r = rng(seed ^ 0x1dea);
  // a sized quarter gets this quarter's ideas, not all of them: good ideas are the scarce thing, so a real win a test
  // was too short to see is gone (with every idea on hand, many short tests would pay better than sized ones)
  BACKLOG.forEach((ideas, row) => {
    const pool = sized ? ideas.map((x) => [r(), x]).sort((a, b) => a[0] - b[0]).map((x) => x[1]).slice(0, IDEAS_PER_ROW[row]) : ideas;
    pool.forEach((idea) => backlog.push({ id: "b" + backlog.length, row, idea }));
  });
  return { seed, week: 0, nid: 0, tests: [], backlog, log: [], late: 0, gateMiss: 0, done: false, sized, money };
}

// what B really does. Bugs: srm (broken split), tooGood (a tracking bug on a creative email or SMS), switched (goal swapped).
function drawTruth(r, row, creative, noBug) {
  const tooGoodOk = creative && row <= 1;
  const bag = [["ship", 30], ["inconclusive", 32], ["lossGoal", 12], ["guardBreach", 9]];
  if (!noBug) bag.push(["srm", 7], ["switched", 4], [tooGoodOk ? "tooGood" : "srm", 6]);
  let x = r() * bag.reduce((a, b) => a + b[1], 0);
  for (const [k, w] of bag) if ((x -= w) < 0) return k;
  return "inconclusive";
}
// the true effect on the goal (share of the row's weekly revenue), revealed at the end
// a real win or loss is about the size the plan hoped for: the lift worth acting on, give or take (flows a bit under it)
// Offers spread wider and lower: a code often lifts sales less than it gives away (what the money quarter grades).
function drawEffect(r, truth, row, lift, offer) {
  const b = (lo, hi) => lo + r() * (hi - lo), flow = row >= 2;
  return { ship: lift * (offer ? b(0.3, 1.2) : flow ? b(0.55, 0.95) : b(0.6, 1.4)), inconclusive: b(-0.008, 0.008), lossGoal: -lift * (flow ? b(0.5, 0.9) : b(0.5, 1.2)), guardBreach: -b(0.02, 0.04),
           srm: b(-0.02, 0.01), tooGood: 0, switched: b(-0.005, 0.005) }[truth];
}

// spans on the board: a stopped test ends the week before it was called; a running one runs its planned weeks, or to
// this week if it's late
// A slow-metric test (t.win: weeks of conversion window) holds its row only while people enter; then it waits for
// the window to close and the row is free for the next test.
export function span(t, week) {
  if (t.status === "Stopped") return { start: t.start, len: Math.max(1, (t.win ? Math.min(t.stoppedWeek, t.start + t.len) : t.stoppedWeek) - t.start) };
  if (t.win) return { start: t.start, len: t.len };
  if (t.start <= week) return { start: t.start, len: Math.max(t.len, week - t.start + 1) };
  return { start: t.start, len: t.len };
}
export const statusOf = (t, week) => t.status === "Stopped" ? "Stopped" : t.waiting || t.start > week ? "Draft" : "Running";
const over = (a, b) => a.start < b.start + b.len && b.start < a.start + a.len;

// gate problems for placing card { row, start, len, offer } this week
export function problems(q, card) {
  const out = [];
  if (card.start < q.week) out.push({ gate: "past" });
  if (card.start + card.len + (card.win || 0) > nw(q)) out.push({ gate: "offBoard" });   // a slow metric's window has to close before the end too
  for (const t of q.tests) {
    const s = span(t, q.week);
    if (t.row === card.row && over(s, card)) out.push({ gate: "busy", with: t });
    else if (card.offer && !t.idea[2] && over(s, card)) out.push({ gate: "offers", with: t });
  }
  if (fz(q).some((w) => w >= card.start && w < card.start + card.len)) out.push({ gate: "freeze" });
  return out;
}
export const GATE_TEXT = { past: "that week is already past", offBoard: "it runs past the end of the board (a slow metric's window too)", busy: "its row is busy",
  offers: "another offer runs in those weeks", freeze: "it runs into the BFCM freeze" };

// place a backlog card at week `start`. Returns { ok, problems }.
export function place(q, bid, start, len) {
  const b = q.backlog.find((x) => x.id === bid); if (!b) return { ok: false, problems: [] };
  len = q.sized ? Math.max(1, len || 1) : LEN[b.row];
  const win = slowWin(q, b.idea);
  const card = { row: b.row, start, len, offer: !b.idea[2], win };
  const p = problems(q, card);
  if (p.length) { q.gateMiss++; return { ok: false, problems: p }; }
  const r = rng((q.seed ^ (q.nid * 2654435761)) >>> 0);
  const truth = drawTruth(r, b.row, b.idea[2], !!b.rerun), s = ROW_SURFACE[b.row], lift = liftOf(b.idea, b.row), eff = drawEffect(r, truth, b.row, lift, !b.idea[2]);
  // power: planned = for the lift worth acting on (what the player sized for); real = for B's true effect, which decides
  // whether a real win or loss shows up at the read date or comes back inconclusive
  const realPower = Math.abs(eff) > 0.001 ? power(s, eff, len) : 0;
  q.tests.push({ id: "t" + q.nid++, row: b.row, idea: b.idea, start, len, win, reader: READERS[q.nid % 3], truth, eff,
                 seed: (r() * 2 ** 31) | 0, status: "Draft", rerun: !!b.rerun, lift, planPower: power(s, lift, len), realPower, seen: !q.sized || !SEEABLE.includes(truth) || r() < realPower });
  q.backlog = q.backlog.filter((x) => x !== b);
  return { ok: true, problems: [] };
}
// take a draft off the board, back into the backlog
export function unplace(q, tid) {
  const t = q.tests.find((x) => x.id === tid);
  if (!t || statusOf(t, q.week) !== "Draft") return false;
  q.tests = q.tests.filter((x) => x !== t);
  q.backlog.unshift({ id: "b" + q.nid++, row: t.row, idea: t.idea, rerun: t.rerun });
  return true;
}

const SEEABLE = ["ship", "lossGoal"];   // the truths a short test can miss
export const dayOf = (t, week) => (week - t.start) * 7;
export const readWeek = (t) => t.start + t.len + (t.win || 0);
export const isDue = (t, week) => statusOf(t, week) === "Running" && week >= readWeek(t);
export const inWindow = (t, week) => !!t.win && statusOf(t, week) === "Running" && week >= t.start + t.len && week < readWeek(t);
const BUG = ["srm", "tooGood", "switched"];

// the test's GrowthBook page this Monday
export function caseFor(q, t) {
  const day = dayOf(t, q.week), due = isDue(t, q.week) || (t.status === "Stopped");
  // a real win or loss the test was too short to see comes back inconclusive
  const truth = (t.truth === "ship" || t.truth === "lossGoal") && t.seen === false ? "inconclusive" : t.truth;
  const kind = BUG.includes(truth) || due ? truth : "running";
  const today = new Date(startOf(q).getTime() + q.week * 7 * DAY);
  // a slow test is built from its entry weeks: the people it counts. Its day and read date are set after.
  const eday = t.win ? (kind === "running" ? Math.min(day, t.len * 7 - 1) : t.len * 7) : day;
  const opts = { surface: ROW_SURFACE[t.row], idea: t.idea, day: eday, planned: q.sized ? t.len * 7 : 0 }, seed = (t.seed ^ (q.week * 7919)) >>> 0;
  let c;
  try { c = makeCase(seed, kind, 1, "U7", today, opts); }
  catch (e) { c = makeCase(seed, "inconclusive", 1, "U7", today, opts); if (SEEABLE.includes(t.truth)) t.seen = false; }   // too few people for any real result to show: it reads flat
  const r = rng(t.seed ^ 0x9e37 ^ q.week);
  addSecondary(c, r, kind === "inconclusive" && r() < 0.5 ? "win" : kind === "ship" && r() < 0.3 ? "loss" : null);
  if (q.money) moneyPage(c, t, kind, due, r);
  if (t.win) slowPage(q, c, t, day);
  return Object.assign(c, { unit: "Q", qid: t.id });
}

// a money quarter's page: the Overview names what B gives away, and an offer at its read date is read against the
// break-even line (unit 9 step 2), read like worth acting on. The goal row shows B's true effect plus the test's noise, so the line is honest.
function moneyPage(c, t, kind, due, r) {
  const d = giveOf(t.idea);
  c.overview.money = d ? `B gives back about ${Math.round(d * 100)}% of each order. Gross margin at full price: ${Math.round(MARGIN * 100)}%. Break-even: the goal up ${Math.round(breakEven(d) * 100)}% just keeps profit level.`
    : `${t.idea[2] ? "A creative change" : "Nothing given away"}: B costs nothing extra. Gross margin: ${Math.round(MARGIN * 100)}%.`;
  if (!d) return;
  c.beLine = Math.round(breakEven(d) * 100);
  if (!due || !["ship", "inconclusive", "lossGoal"].includes(kind)) return;   // bugs, guardrail breaches and early reads keep their own answer
  const g = c.goalRows[0], se = (g.hi - g.lo) / 3.92, be = breakEven(d) * 100;
  let L = 0;
  for (let k = 0; k < 40; k++) {
    const z = (r() + r() + r() - 1.5) * 2;                                  // roughly normal noise, in standard errors
    L = Math.min(24, (t.seen === false ? 0 : t.eff * 100) + z * se);
    const lo = L - 1.96 * se, hi = L + 1.96 * se;
    if (Math.abs(hi - be) > 0.8 && Math.abs(L - be) > 0.5 && Math.abs(lo) > 0.4 && Math.abs(hi) > 0.4) break;   // no dot or bar edge sitting on a line
  }
  relift(g, L / 100, se / 100);
  const lo = g.lo, hi = g.hi;
  // read like worth acting on (U13b): bar above zero and the dot past the line ship, whole bar short of it keep A
  c.answer = hi < be ? "keepA" : lo > 0 && g.pct > be ? "ship" : "inconclusive";
}
// move a GrowthBook row to a new lift, keeping its baseline and its standard error
function relift(g, L, se) {
  const nB = +g.subB.split(" / ")[1].replace(/,/g, ""), money = g.a.startsWith("$");
  const a = parseFloat(g.a.replace(/[$%]/g, "")), b = a * (1 + L);
  g.b = money ? "$" + b.toFixed(2) : b.toFixed(2) + "%";
  g.subB = money ? "$" + Math.round((b * nB)).toLocaleString("en-US") + " / " + nB.toLocaleString("en-US") : Math.round((b / 100) * nB).toLocaleString("en-US") + " / " + nB.toLocaleString("en-US");
  g.pct = L * 100; g.lo = (L - 1.96 * se) * 100; g.hi = (L + 1.96 * se) * 100;
  g.ctw = phi(L / se);
}

const RESULT = { ship: "Won", keepA: "Lost", inconclusive: "Inconclusive", distrust: "Stopped: fix and rerun" };
// the call on test t this Monday. answer = the rule's answer for the case shown. Returns what happened, in words.
export function call(q, tid, callId, answer) {
  const t = q.tests.find((x) => x.id === tid);
  const right = callId === answer, entry = { week: q.week, tid, name: t.idea[0], row: t.row, call: callId, answer, right, truth: t.truth, early: !isDue(t, q.week) };
  q.log.push(entry);
  for (const d of q.tests) if (d.waiting === t.id && callId !== "running") { delete d.waiting; d.status = "Running"; entry.launched = d.idea[0]; }   // its row is free: the next test launches today
  if (callId === "running") return Object.assign(entry, { what: isDue(t, q.week) ? "It keeps running past its read date. Its row stays busy another week." : "It keeps running." });
  t.status = "Stopped"; t.stoppedWeek = q.week; t.call = callId; t.result = RESULT[callId];
  if (callId === "ship") {
    t.weekly = weeklyGain(q, t);
    entry.what = `Shipped. From next Monday B goes to everyone on ${ROWS[t.row]}.`;
  } else if (callId === "distrust") {
    q.backlog.unshift({ id: "b" + q.nid++, row: t.row, idea: ["Rerun: " + t.idea[0].replace(/^Rerun: /, ""), t.idea[1], t.idea[2]], rerun: true });
    entry.what = "Stopped. The rerun is back in the backlog: place it when the row is free.";
  } else entry.what = callId === "keepA" ? "Stopped. A stays." : "Stopped. Nothing proven, so the simpler version, A, stays.";
  if (entry.launched) entry.what += ` ${entry.launched} was waiting for this row, so it launches today.`;
  if (callId === "keepA" && t.truth === "ship" && weeklyGain(q, t) > 0) t.missed = weeklyGain(q, t);
  return entry;
}

// on to next Monday: late reads cost their row a week, revenue from shipped tests adds up, drafts that can't start slip
export function nextWeek(q) {
  const lateNow = q.tests.filter((t) => isDue(t, q.week));
  q.late += lateNow.length;
  const slipped = [];
  const toBacklog = (t) => { q.tests = q.tests.filter((x) => x !== t); q.backlog.unshift({ id: "b" + q.nid++, row: t.row, idea: t.idea, rerun: t.rerun }); slipped.push(t); };
  q.tests.filter((t) => t.waiting).forEach(toBacklog);           // its row's test was never read, so it couldn't launch
  q.week++;
  q.banked = (q.banked || 0) + weeklyNow(q);
  if (q.year) yearWeek(q);
  if (q.week >= nw(q)) { q.done = true; return { late: lateNow, slipped }; }
  const waiting = [];
  for (const t of q.tests.slice()) {
    if (t.status !== "Draft" || t.start !== q.week) continue;
    const blocker = q.tests.find((o) => o !== t && o.row === t.row && statusOf(o, q.week) === "Running" && !(o.win && q.week >= o.start + o.len));   // a slow test past its entry weeks frees its row
    if (!blocker) continue;
    // the test before it reaches its read date today: this one launches as soon as that one is called
    if (blocker.start + blocker.len === q.week) { t.waiting = blocker.id; waiting.push([t, blocker]); }
    else toBacklog(t);
  }
  for (const t of q.tests) if (t.status === "Draft" && !t.waiting && t.start <= q.week) t.status = "Running";
  return { late: lateNow, slipped, waiting };
}
// shipped tests' weekly effect, counting from the Monday after the call
export const weeklyNow = (q) => q.tests.filter((t) => t.call === "ship" && t.stoppedWeek < q.week).reduce((a, t) => a + t.weekly, 0);

export function score(q) {
  const calls = q.log.filter((x) => x.call !== "running" || x.answer !== "running");     // "keep running" on a test that wasn't ready isn't a decision
  const right = calls.filter((x) => x.right).length;
  // a ship that hurt: B really lost (in a money quarter, lost profit) and the rule didn't say ship. Test noise can make
  // the rule ship a small profit loss now and then; that isn't held against a player who followed it.
  const shipRight = (t) => q.log.some((x) => x.tid === t.id && x.call === "ship" && x.right);
  const badShips = q.tests.filter((t) => t.call === "ship" && (q.money ? profitLift(t.eff, giveOf(t.idea)) : t.eff) <= 0.0 && !shipRight(t)).length;
  const caught = q.log.filter((x) => x.call === "distrust" && BUG.includes(x.truth)).length;
  const missedBugs = q.tests.filter((t) => t.call && t.call !== "distrust" && BUG.includes(t.truth)).length;
  const used = q.tests.reduce((a, t) => a + Math.max(0, Math.min(t.status === "Stopped" ? t.stoppedWeek : q.week, q.week) - t.start), 0);   // row-weeks spent testing
  const open = nw(q) * ROWS.length - fz(q).length * ROWS.length;
  return { calls: calls.length, right, badShips, caught, missedBugs, late: q.late, gateMiss: q.gateMiss, weekly: weeklyNow(q), banked: q.banked || 0,
           sized: q.tests.filter((t) => t.planPower >= 0.8).length, placed: q.tests.length, hidden: q.tests.filter((t) => t.seen === false && (t.call || "") !== "").length,
           used, open, left: q.tests.filter((t) => t.missed).reduce((a, t) => a + t.missed, 0),
           passed: calls.length >= 8 && right / Math.max(1, calls.length) >= 0.8 && badShips === 0 };
}

// ---------- the year game (Brent's plan, PLAN.md "On the building roadmap" 3): 52 Mondays of 2027 with one goal ----------
// You pick the number the year is for. Tests aimed at it use it as their goal metric, a slow one: an order within 60
// days of the first, so the read date is the entry weeks plus a 9-week window (unit 10, Slow metrics). Shipped wins
// move the year's number; shipped guardrail breaches push unsubscribes and spam up, and the year has to stay under
// the limits. Every 13 weeks a new quarter's ideas join the backlog.
export const YEAR_START = new Date(2027, 0, 4, 9);           // Monday Jan 4 2027
export const YEAR_WEEKS = 52, YEAR_FREEZE = [46, 47];         // Nov 22 and Nov 29 2027: BFCM
export const SLOW_WIN = 9;                                    // 60 days, in whole weeks
export const GOALS = {
  repeat: { name: "Second orders", metric: "Second order within 60 days", what: "Bean buyers who order again within 60 days of their first order", base: 8.0, target: 9.6 },
  cross: { name: "Gear cross-sell", metric: "Gear order within 60 days", what: "Bean buyers who buy gear within 60 days of their first order", base: 5.0, target: 6.0 },
};
// more ideas for a year, most aimed at second orders or gear. [name, hypothesis, creative]
export const YEAR_BACKLOG = [
  [["Beans + filters bundle block", "A bundle line under the beans gets gear into the first order", false],
   ["Last-order block for past buyers", "Showing what they bought last time brings past buyers back", true],
   ["Hero: brewer vs beans", "Leading with the brewer sells gear to bean buyers", true],
   ["Office banner: coffee for the whole office", "An office angle raises order size from office buyers", true]],
  [["SMS: gear drop for bean buyers", "A text about the new grinder reaches buyers who only bought beans", true],
   ["SMS: reorder link for your last bag", "A one-tap reorder brings the second bag sooner", true],
   ["SMS: 10% off a second bag", "A second-bag code brings the next order forward", false]],
  [["Welcome 4: brewer intro", "Meeting the gear line early makes a cross-sell later easier", true],
   ["Welcome 2: fit quiz vs product grid", "A fit quiz gets the first bean order sooner", true]],
  [["Cart 2: add filters to the order", "A filters add-on in the cart email starts gear buying", true],
   ["Cart 1: 'pairs well with' block", "Showing a grinder next to the beans raises order size", true]],
  [["Post-purchase 2: brewer block", "Bean buyers who see the brewer a week later buy gear", true],
   ["Post-purchase: brew tips", "Help dialing in the grind keeps buyers happy enough to come back", true],
   ["Post-purchase 3: reorder reminder at 3 weeks", "A reminder when the bag runs low brings the second order", true],
   ["Post-purchase: second bag 10% off", "A second-bag code brings the next bean order forward", false],
   ["Post-purchase: review request vs none", "Asking for a review keeps the brand in mind", true],
   ["Post-purchase 2: filters for new brewers", "Pour-over buyers need filters: a filters block starts gear buying", true],
   ["Post-purchase 2: 'add a second bag' block", "Daily drinkers go through a bag fast: asking early brings the reorder forward", true],
   // post-purchase ideas aimed at neither goal: they compete for the same row
   ["Post-purchase: shipping update copy", "A friendlier shipping update cuts 'where's my order' tickets", true],
   ["Post-purchase: NPS survey vs none", "A one-question survey finds unhappy buyers early", true],
   ["Post-purchase: free returns reminder", "Reminding buyers returns are free lowers anxiety about fit", true]],
];
Object.assign(GIVE, { "Beans + filters bundle block": 0.05, "SMS: 10% off a second bag": 0.1, "Post-purchase: second bag 10% off": 0.1 });
// how much of an idea's effect lands on each goal: 1 = aimed at it (and uses it as the goal metric), less = a side effect
export const WEIGHT = {
  "Post-purchase: care guide vs product block": { repeat: 1 }, "Post-purchase: gear cross-sell": { cross: 1 }, "Post-purchase: 15% off gear": { cross: 1 },
  "Post-purchase 2: brewer block": { cross: 1 }, "Post-purchase: brew tips": { repeat: 1 }, "Post-purchase 3: reorder reminder at 3 weeks": { repeat: 1 },
  "Post-purchase: second bag 10% off": { repeat: 1 }, "Post-purchase 2: filters for new brewers": { cross: 1 }, "Post-purchase 2: 'add a second bag' block": { repeat: 1 }, "Post-purchase: review request vs none": { repeat: 0.5 },
  "SMS: gear drop for bean buyers": { cross: 1 }, "SMS: reorder link for your last bag": { repeat: 1 }, "SMS: 10% off a second bag": { repeat: 1 },
  "SMS: bundle builder link vs beans page": { cross: 0.3 }, "Sampler bundle block above the fold": { cross: 0.3 }, "Beans + filters bundle block": { cross: 0.3 },
  "Last-order block for past buyers": { repeat: 0.2 }, "Hero: brewer vs beans": { cross: 0.3 }, "Welcome 4: brewer intro": { cross: 0.2 },
  "Cart 2: add filters to the order": { cross: 0.2 }, "Cart 1: 'pairs well with' block": { cross: 0.2 },
};
const bare = (idea) => idea[0].replace(/^Rerun: /, "");
export const weightOf = (q, idea) => (q.year && (WEIGHT[bare(idea)] || {})[q.year.goal]) || 0;
export const aimed = (q, idea) => weightOf(q, idea) >= 1;
function slowWin(q, idea) { return aimed(q, idea) ? SLOW_WIN : 0; }

// a slow test's page: the goal is the year's 60-day metric, the read date is entry plus the window
function slowPage(q, c, t, day) {
  const G = GOALS[q.year.goal];
  if (c.goalRows[0].name === c.overview.goal) c.goalRows[0].name = G.metric;   // a swapped goal stays swapped
  c.overview.goal = G.metric;
  c.day = day; c.planned = readWeek(t) * 7 - t.start * 7;
  c.plan = `Day ${c.planned}: ${t.len} week${t.len > 1 ? "s" : ""} of entrants, then the 60-day window for the last of them`;
  c.started = new Date(startOf(q).getTime() + t.start * 7 * DAY).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  c.slow = { entryEnd: t.len * 7, window: 60 };
}

const draw = (r, ideas, n, used) => ideas.filter((x) => !used.includes(x[0])).map((x) => [r(), x]).sort((a, b) => a[0] - b[0]).map((x) => x[1]).slice(0, n);
export function newYear(seed, goal) {
  const q = newQuarter(seed, true, true);
  Object.assign(q, { nweeks: YEAR_WEEKS, start: YEAR_START.getTime(), freeze: YEAR_FREEZE, backlog: [],
    labels: Array.from({ length: YEAR_WEEKS }, (_, i) => new Date(YEAR_START.getTime() + i * 7 * DAY).toLocaleDateString("en-US", { month: "short", day: "numeric" })),
    year: { goal, used: [], checks: [], unsub: 0, spam: 0 } });
  refill(q);
  return q;
}
// a new quarter's ideas join the backlog: some of each row's unused ideas, aimed ones first in the draw
function refill(q) {
  const r = rng((q.seed ^ (q.week * 977) ^ 0x7ea7) >>> 0);
  BACKLOG.forEach((ideas, row) => {
    // the team writes ideas for the year's goal, so ideas that touch it come up first; the rest fill in
    const pool = [...ideas, ...YEAR_BACKLOG[row]], touch = pool.filter((x) => weightOf(q, x) > 0), rest = pool.filter((x) => !weightOf(q, x));
    const first = draw(r, touch, Math.ceil(IDEAS_PER_ROW[row] / 2), q.year.used);
    const pick = [...first, ...draw(r, rest.concat(touch.filter((x) => !first.includes(x))), IDEAS_PER_ROW[row] - first.length, q.year.used)];
    pick.forEach((idea) => { q.year.used.push(idea[0]); q.backlog.push({ id: "b" + q.nid++, row, idea }); });
  });
}
// the year's numbers this Monday: the goal moves with what shipped (from the Monday after), unsubscribes and spam
// rise with each shipped guardrail breach
export function yearNow(q) {
  const G = GOALS[q.year.goal], live = q.tests.filter((t) => t.call === "ship" && t.stoppedWeek < q.week);
  const goal = G.base + live.reduce((a, t) => a + weightOf(q, t.idea) * Math.max(-0.5, t.eff) * G.base, 0);
  const breaches = live.filter((t) => t.truth === "guardBreach");
  return { goal: Math.round(goal * 100) / 100, target: G.target, base: G.base,
    unsub: Math.round((0.21 + 0.03 * breaches.length) * 100) / 100, spam: Math.round((0.08 + 0.01 * breaches.filter((t) => t.row <= 1).length) * 1000) / 1000 };
}
export const LIMITS = { unsub: 0.3, spam: 0.1 };
// every 13 weeks: a checkpoint of the year's numbers, and the next quarter's ideas
function yearWeek(q) {
  if (q.week % 13 === 0 && q.week < YEAR_WEEKS) { q.year.checks.push({ week: q.week, ...yearNow(q), profit: weeklyNow(q) }); refill(q); }
}
// Passing: the number moved at least halfway to the target, everything stayed afloat, and the calls held up. Reaching
// the target is the star on top: with honest truths, even a perfect year misses it about half the time.
export function yearScore(q) {
  const sc = score(q), y = yearNow(q), half = y.base + (y.target - y.base) / 2;
  const afloat = y.unsub < LIMITS.unsub && y.spam < LIMITS.spam && sc.weekly >= 0;
  return { ...sc, ...y, half, reached: y.goal >= y.target, moved: y.goal >= half, afloat,
    passed: y.goal >= half && afloat && sc.calls >= 20 && sc.right / Math.max(1, sc.calls) >= 0.8 && sc.badShips === 0 };
}
