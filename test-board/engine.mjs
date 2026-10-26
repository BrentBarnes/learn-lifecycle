// Test Board v2 engine: seeded case generators, the call rules, grading and the rep scheduler. No DOM, so
// `node --test` covers it (tests/engine.test.mjs). The page (app.mjs) only draws what this returns.
//
// Every case is built from a stated model (Level 3's campaign model: 2% buy, about $120 an order, capped revenue)
// and then checked by the same rule the player is graded on (answerFor). A draw that lands too close to a line
// (chance to win near 95%, a split check near its alarm) is thrown away, so every case can be called from the screen.

import { CALLS3, UNITS3, makeU3 } from "./u3.mjs";
import { CALLS4, UNITS4, makeU4 } from "./u4.mjs";
import { CALLS5, UNITS5, makeU5 } from "./u5.mjs";
import { CALLS6, UNITS6, makeU6, writeUp } from "./u6.mjs";

export const CALLS = [
  { id: "ship", label: "Ship B", stamp: "Shipped" },
  { id: "keepA", label: "Keep A (B lost)", stamp: "Kept A" },
  { id: "running", label: "Keep running", stamp: "Running" },
  { id: "inconclusive", label: "Stop: inconclusive", stamp: "Inconclusive" },
  { id: "distrust", label: "Don't trust it yet", stamp: "Not trusted" },
  // U1
  { id: "fair", label: "Fair test", stamp: "Fair" },
  { id: "chosen", label: "Chosen, not flipped", stamp: "Chosen" },
  { id: "after", label: "Counted after the split", stamp: "Miscounted" },
  { id: "beforeAfter", label: "Before and after, no control", stamp: "No control" },
  // U1 step 1: which line of the card answers a question
  { id: "rowChange", label: "What changed", stamp: "What changed" },
  { id: "rowAssign", label: "Who got B", stamp: "Who got B" },
  { id: "rowCount", label: "Who was counted", stamp: "Who was counted" },
  { id: "rowWhen", label: "When", stamp: "When" },
  { id: "rowResult", label: "Result", stamp: "Result" },
  // U2
  { id: "fits", label: "It fits", stamp: "Scheduled" },
  { id: "busy", label: "Row is busy (gate 1)", stamp: "Row busy" },
  { id: "offers", label: "Two offers at once (gate 2)", stamp: "Offer clash" },
  { id: "noReader", label: "No reader (gate 3)", stamp: "No reader" },
  { id: "freeze", label: "Crosses the freeze", stamp: "Frozen" },
  // U2 step 1: do two bars share a week
  { id: "share", label: "They share a week", stamp: "Shared" },
  { id: "apart", label: "No shared week", stamp: "Apart" },
  ...CALLS3,
  ...CALLS4,
  ...CALLS5,
  ...CALLS6,
];
export const callById = (id) => CALLS.find((c) => c.id === id) || { id, label: id, stamp: id };

// U1 is practised in parts, the way a musician learns a piece: one line of the setup card alone, the next alone, the two
// together, the third alone, all three, then the same check from a teammate's message. `fields` = the lines on the card,
// `guided` = the first reps walk the lines one at a time, `pass` = [right, of the last n], `daily` = feeds the daily round.
const U1_PART = { screen: "setup", tabs: [], parent: "U1", daily: false, pass: [5, 6] };
const U2_PART = { screen: "board", tabs: [], parent: "U2", daily: false, pass: [5, 6] };
export const ALL_GATES = ["busy", "offers", "noReader", "freeze"];
export const UNITS = {
  U1a: { ...U1_PART, id: "U1a", step: 1, name: "Read the card", fields: ["assign", "count", "when"], ask: true,
         calls: ["rowChange", "rowAssign", "rowCount", "rowWhen", "rowResult"],
         kinds: ["rowChange", "rowAssign", "rowCount", "rowWhen", "rowResult", "rowAssign", "rowCount", "rowWhen"], meet: ["rowAssign", "rowCount", "rowWhen"] },
  U1b: { ...U1_PART, id: "U1b", step: 2, name: "Who got B", fields: ["assign"], calls: ["fair", "chosen"],
         kinds: ["fair", "chosen", "fairOdd", "chosen", "fair", "fairOdd"], meet: ["fair", "chosen", "fairOdd"] },
  U1c: { ...U1_PART, id: "U1c", step: 3, name: "Who was counted", fields: ["count"], calls: ["fair", "after"],
         kinds: ["fair", "after", "after", "fair", "after"], meet: ["fair", "after", "after"] },
  U1d: { ...U1_PART, id: "U1d", step: 4, name: "Steps 2 and 3 together", fields: ["assign", "count"], calls: ["fair", "chosen", "after"], guided: true,
         kinds: ["fair", "chosen", "after", "fairOdd", "chosen", "after"], meet: ["chosen", "after", "fair"], pass: [6, 7] },
  U1e: { ...U1_PART, id: "U1e", step: 5, name: "When", fields: ["when"], calls: ["fair", "beforeAfter"],
         kinds: ["fair", "beforeAfter", "beforeAfter", "fair", "beforeAfter"], meet: ["beforeAfter", "fair", "beforeAfter"] },
  U1f: { ...U1_PART, id: "U1f", step: 6, name: "All three lines", fields: ["assign", "count", "when"], calls: ["fair", "chosen", "after", "beforeAfter"], guided: true,
         kinds: ["fair", "chosen", "after", "beforeAfter", "fairOdd", "chosen", "after", "beforeAfter"], meet: ["after", "beforeAfter", "fair"], pass: [7, 8] },
  U1g: { ...U1_PART, id: "U1g", step: 7, name: "Straight from Slack", fields: [], prose: true, calls: ["fair", "chosen", "after", "beforeAfter"],
         kinds: ["fair", "chosen", "after", "beforeAfter", "fairOdd", "chosen"], meet: ["chosen", "fair", "after"], pass: [7, 8], daily: true },
  // U2 in parts the same way. `rules` = the checks this board knows about so far (a case never breaks a rule outside
  // its calls), `freeze` shading and offers only appear once their step has been taught.
  U2a: { ...U2_PART, id: "U2a", step: 1, name: "Do they share a week?", rules: ["busy"], overlap: true, calls: ["share", "apart"],
         kinds: ["share", "apart", "edge", "share", "edge", "apart"], meet: ["share", "apart", "edge"] },
  U2b: { ...U2_PART, id: "U2b", step: 2, name: "One test per row", rules: ["busy"], calls: ["fits", "busy"],
         kinds: ["busy", "fitsNear", "fitsCol", "busy", "fitsNear", "busy"], meet: ["busy", "fitsCol", "fitsNear"] },
  U2c: { ...U2_PART, id: "U2c", step: 3, name: "Offers travel", rules: ["busy", "offers"], calls: ["fits", "offers"],
         kinds: ["offers", "fitsCrea", "fitsOffer", "offers", "fitsCrea", "offers"], meet: ["offers", "fitsCrea", "fitsOffer"] },
  U2d: { ...U2_PART, id: "U2d", step: 4, name: "Steps 2 and 3 together", rules: ["busy", "offers"], calls: ["fits", "busy", "offers"], guided: true,
         kinds: ["fits", "busy", "offers", "fitsCrea", "fitsNear", "busy", "offers"], meet: ["busy", "offers", "fitsCrea"], pass: [6, 7] },
  U2e: { ...U2_PART, id: "U2e", step: 5, name: "Reader and freeze", rules: ALL_GATES, calls: ["fits", "noReader", "freeze"],
         kinds: ["freeze", "noReader", "fitsEdge", "freeze", "fits", "noReader"], meet: ["noReader", "freeze", "fitsEdge"] },
  U2f: { ...U2_PART, id: "U2f", step: 6, name: "All four checks", rules: ALL_GATES, calls: ["fits", "busy", "offers", "noReader", "freeze"], guided: true,
         kinds: ["fits", "busy", "offers", "freeze", "noReader", "fitsCol", "fitsCrea", "fitsEdge"], meet: ["busy", "offers", "fits"], pass: [7, 8], daily: true },
  U2g: { ...U2_PART, id: "U2g", step: 7, name: "Find the first week", rules: ALL_GATES, calls: [],
         kinds: ["place"], meet: ["place", "place", "place"], daily: true },
  ...UNITS3,
  ...UNITS4,
  ...UNITS5,
  ...UNITS6,
  U7: { id: "U7", name: "Trust before you read", screen: "experiment", tabs: ["o", "a", "h"], calls: ["ship", "keepA", "running", "inconclusive", "distrust"],
        kinds: ["srm", "srm", "tooGood", "switched", "ship", "guardBreach", "running", "inconclusive"],
        meet: ["srm", "ship", "tooGood"] },
};
export const ORDER = ["U1a", "U1b", "U1c", "U1d", "U1e", "U1f", "U1g", "U2a", "U2b", "U2c", "U2d", "U2e", "U2f", "U2g", ...Object.keys(UNITS3), ...Object.keys(UNITS4), ...Object.keys(UNITS5), ...Object.keys(UNITS6), "U7"];
export const STEPS = Object.fromEntries(["U1", "U2", "U3", "U4", "U5", "U6"].map((p) => [p, ORDER.filter((u) => UNITS[u].parent === p)]));
export const U1_STEPS = STEPS.U1;
export const TRUST_KINDS = ["srm", "tooGood", "switched"];
export const SRM_ALARM = 0.001;          // GrowthBook's default SRM threshold
export const TOO_GOOD = 30;              // % lift on the goal metric that should be checked first, whatever the change (one line, no exceptions: 2026-10-14)

// ---------- numbers ----------
export function rng(seed) {               // mulberry32
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function phi(z) {                  // standard normal cdf
  const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}
export function srmP(a, b) {              // two-sided p for a 50/50 plan (normal approximation of the chi-square)
  const n = a + b, z = Math.abs(a - n / 2) / Math.sqrt(n * 0.25);
  return Math.min(1, 2 * phi(-z));
}
const between = (r, lo, hi) => lo + r() * (hi - lo);
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const fmtN = (n) => Math.round(n).toLocaleString("en-US");
export const pctStr = (x) => (x > 0.05 ? "+" : x < -0.05 ? "−" : "") + Math.abs(x).toFixed(1) + "%";
const money = (x) => "$" + x.toFixed(2);
const rateStr = (x) => (x * 100).toFixed(x < 0.01 ? 2 : 2) + "%";
export function ctwStr(c) { return c >= 0.999 ? ">99.9%" : c < 0.001 ? "<0.1%" : (c * 100).toFixed(1) + "%"; }

// ---------- the world (made-up numbers, made up; labeled on the page) ----------
const SURFACES = {
  campaign: { label: "Daily campaign", where: "Tuesday test pool", type: "campaign", n: 160000, goal: "rpr", p: 0.02,
              planned: 7, plan: "Day 7: one send plus the 5-day attribution window",
              guards: [["Unsubscribe rate", 0.0021], ["Spam complaint rate", 0.0008]] },
  sms: { label: "SMS", where: "Thursday send", type: "campaign", n: 100000, goal: "rpr", p: 0.01,
         planned: 5, plan: "Day 5, set in the plan",
         guards: [["SMS opt-out rate", 0.004]] },
  welcome: { label: "Welcome flow", where: "split at entry", type: "flow", weekly: 3000, goal: "ope", p: 0.023,
             planned: 42, plan: "Day 42: six weeks of entrants",
             guards: [["Unsubscribe rate", 0.011]] },
  cart: { label: "Abandoned cart flow", where: "split at entry", type: "flow", weekly: 3000, goal: "ope", p: 0.033,
          planned: 28, plan: "Day 28: four weeks of entrants", guards: [["Unsubscribe rate", 0.006]] },
  post: { label: "Post-purchase flow (bean buyers)", where: "split at entry", type: "flow", weekly: 1500, goal: "ope", p: 0.08,
          planned: 42, plan: "Day 42: six weeks of entrants", guards: [["Unsubscribe rate", 0.004]] },
};
const IDEAS = {
  campaign: [
    ["Hero: GIF vs static", "A moving hero shows the pour and earns more per send", true],
    ["Subject: question vs statement", "A question in the subject line pulls more regulars in", true],
    ["Product grid: 4 vs 6 coffees", "Fewer, bigger products make the choice easier", true],
    ["Subject: price vs feature", "Leading with the waterproof rating beats leading with price", true],
    ["Review stars under each product", "Star ratings near the price make buyers trust the fit", true],
    ["Short copy vs long copy", "Two lines and a button beat three paragraphs on a daily send", true],
    ["Button: 'Shop beans' vs 'Find your fit'", "A fit-first button gets more first-time bean buyers to click through", true],
    ["Free-shipping line in the header", "Saying shipping is free over $99 lifts order rate", false],
    ["Sampler bundle block above the fold", "Showing the 4-for-3 bag bundle first raises order size", false],
  ],
  sms: [
    ["SMS: emoji vs no emoji", "A coffee emoji makes the text feel less like an ad", true],
    ["SMS: bundle builder link vs beans page", "Sending people to the bundle builder raises order size", true],
    ["SMS: first name in the opener", "A first name gets the text read", true],
  ],
  welcome: [
    ["Welcome 2: bundle builder block", "Showing the bundle builder in email 2 gets a first order sooner", true],
    ["Welcome 1: founder story vs product grid", "The founder story builds trust before the first order", true],
  ],
  cart: [
    ["Cart 1: $10 off vs no discount", "A small discount brings back carts that stalled on price", false],
    ["Cart 1: reviews block", "Reviews for the item left in the cart answer the fit question", true],
  ],
  post: [
    ["Post-purchase: care guide vs product block", "A brew guide makes the second order feel natural", true],
    ["Post-purchase: gear cross-sell", "Bean buyers who see the brewer buy gear sooner", true],
  ],
};
const SRM_CAUSE = {
  campaign: ["B went out two hours later, and Smart Sending skipped more of B's people",
             "a profile filter added to B after setup dropped some of its recipients",
             "B's send hit a suppression list that A's didn't"],
  flow: ["automatic distribution moved traffic toward the leading version mid-test",
         "B's branch had an extra filter that dropped people right after the split"],
};

// relative standard error of B/A - 1
function relSE(kind, p, n) {
  if (kind === "rpr") { const cv2 = 1.25 / p - 1; return Math.sqrt(2 * cv2 / n); }   // capped revenue, Level 5's model
  return Math.sqrt(2 * (1 - p) / (p * n));
}

// one metric row. z = the observed lift in standard errors (positive = B higher)
export function metricRow(r, name, kind, base, nA, nB, z, better) {
  const se = relSE(kind, base, Math.min(nA, nB));
  let lift = z * se;
  let a, b, subA, subB, aStr, bStr;
  if (kind === "rpr") {
    const v = between(r, 2.2, 2.6) * (base / 0.02);         // SMS earns less per recipient than email in this model
    const revA = Math.round(v * nA), revB = Math.round(v * (1 + lift) * nB);
    a = revA / nA; b = revB / nB;
    aStr = money(a); bStr = money(b); subA = "$" + fmtN(revA) + " / " + fmtN(nA); subB = "$" + fmtN(revB) + " / " + fmtN(nB);
  } else {
    const cA = Math.max(1, Math.round(base * nA)), cB = Math.max(1, Math.round(base * (1 + lift) * nB));
    a = cA / nA; b = cB / nB;
    aStr = rateStr(a); bStr = rateStr(b); subA = fmtN(cA) + " / " + fmtN(nA); subB = fmtN(cB) + " / " + fmtN(nB);
  }
  lift = b / a - 1;
  const zObs = lift / se;
  const ctw = better === "up" ? phi(zObs) : phi(-zObs);     // chance that B is better
  return { name, a: aStr, b: bStr, subA, subB, pct: lift * 100, lo: (lift - 1.96 * se) * 100, hi: (lift + 1.96 * se) * 100,
           ctw, better, kind };
}

// ---------- the rule the player is graded on ----------
export function answerFor(c) {
  if (c.hasHealth) {
    if (c.srmP < SRM_ALARM) return "distrust";
    if (c.goalRows[0].name !== c.overview.goal) return "distrust";
    if (c.goalRows[0].pct >= TOO_GOOD) return "distrust";
  }
  if (c.day < c.planned) return "running";
  if (c.guardRows.some((g) => g.ctw <= 0.05)) return "keepA";
  const g = c.goalRows[0].ctw;
  return g >= 0.95 ? "ship" : g <= 0.05 ? "keepA" : "inconclusive";
}

// a case is readable when nothing sits near a line the rule uses
function readable(c) {
  const g = c.goalRows[0];
  if (g.ctw > 0.92 && g.ctw < 0.975) return false;
  if (g.ctw > 0.025 && g.ctw < 0.08) return false;
  if ((g.ctw >= 0.95 && g.lo <= 0.05) || (g.ctw <= 0.05 && g.hi >= -0.05)) return false;   // bar must clear zero
  for (const x of c.guardRows) if (x.ctw > 0.02 && x.ctw < 0.15) return false;
  if (c.hasHealth && c.srmP > 0.0002 && c.srmP < 0.01) return false;
  if (c.kind !== "tooGood" && Math.abs(g.pct) > 24) return false;   // real results stay under 25%, well clear of the 30% too-good line
  return true;
}

const Z = {   // observed z by stage: 0 meet (obvious), 1 clear, 2 realistic
  win: [[4, 5.5], [2.8, 4], [2.15, 2.8]],
  flat: [[-0.7, 0.7], [-1.3, 1.3], [-1.45, 1.45]],
  breach: [[5, 8], [3.5, 5], [2.4, 3.5]],
  skew: [[12, 20], [6, 12], [3.8, 6]],
};
const zr = (r, key, stage) => { const [lo, hi] = Z[key][Math.min(stage, 2)]; return between(r, lo, hi); };

const SURFACE_WEIGHTS = [["campaign", 0.45], ["sms", 0.15], ["welcome", 0.15], ["cart", 0.15], ["post", 0.1]];
function pickSurface(r, kind) {
  if (kind === "tooGood") return r() < 0.75 ? "campaign" : "sms";
  if (kind === "running" || kind === "inconclusive") {   // flows read flat more often, so give them weight here
    return pick(r, ["campaign", "campaign", "sms", "welcome", "cart", "post"]);
  }
  let x = r();
  for (const [s, w] of SURFACE_WEIGHTS) { if ((x -= w) < 0) return s; }
  return "campaign";
}

function draft(r, kind, stage, unit, today, opts = {}) {
  const sKey = opts.surface || pickSurface(r, kind), S = SURFACES[sKey];
  const pool = kind === "tooGood" ? IDEAS[sKey].filter((i) => i[2]) : IDEAS[sKey];
  const [name, hyp, creative] = (Array.isArray(opts.idea) && opts.idea) || (opts.idea && pool.find((x) => x[0] === opts.idea)) || pick(r, pool);   // v3's quarter passes its own [name, hypothesis, creative]
  const hasHealth = unit === "U7";
  const planned = opts.planned || S.planned;               // v3's quarter: the length the player sized
  // day
  let day = planned + Math.floor(r() * 3);
  if (kind === "running") day = S.type === "flow" ? Math.max(7, Math.floor(between(r, 0.25, 0.7) * planned)) : 1 + Math.floor(r() * (planned - 2));
  if (opts.day) day = opts.day;                            // v3's quarter: the day its calendar says
  // people per version
  // a sized campaign test pools one send a week, so it gains a send's people each week it runs
  let n = S.type === "flow" ? Math.round((S.weekly / 2) * (Math.min(day, planned) / 7)) : S.n * (opts.planned ? Math.max(1, Math.floor(Math.min(day, planned) / 7)) : 1);
  let nA = n + Math.round((r() - 0.5) * Math.sqrt(n) * 0.8), nB = 2 * n - nA;
  if (hasHealth && kind !== "srm" && r() < 0.4) {          // a visible but harmless wobble ("this is fine")
    const z = between(r, 1.0, 2.4) * (r() < 0.5 ? 1 : -1), d = Math.round(z * Math.sqrt(2 * n * 0.25));
    nA = n + d; nB = n - d;
  }
  if (kind === "srm") { const d = Math.round(zr(r, "skew", stage) * Math.sqrt(2 * n * 0.25)); nA = n + d; nB = n - d; }
  // goal
  const goalKind = S.goal === "rpr" ? "rpr" : "rate";
  const goalName = S.goal === "rpr" ? "Revenue per recipient" : "Orders per entrant";
  let zg;
  switch (kind) {
    case "ship": zg = zr(r, "win", stage); break;
    case "lossGoal": zg = -zr(r, "win", stage); break;
    case "inconclusive": zg = zr(r, "flat", stage); break;
    case "guardBreach": zg = stage === 2 || r() < 0.5 ? zr(r, "win", stage) : zr(r, "flat", stage); break;
    case "running": zg = stage >= 1 && r() < 0.5 ? zr(r, "win", 1) : zr(r, "flat", 1); break;
    case "srm": zg = r() < 0.75 ? zr(r, "win", 1) : zr(r, "flat", 1); break;
    case "tooGood": zg = 0; break;
    case "switched": zg = zr(r, "flat", 1); break;
    default: throw new Error("unknown kind " + kind);
  }
  // flows have few people, so a clear result needs a big lift: keep it under 24% so it never looks too good
  if (S.type === "flow") { const seG = relSE(goalKind, S.p, n); if (Math.abs(zg * seG) > 0.24) zg = Math.sign(zg) * between(r, 0.16, 0.24) / seG; }
  let goalRows;
  if (kind === "tooGood") {
    const se = relSE("rpr", S.p, n);
    goalRows = [metricRow(r, goalName, goalKind, S.p, nA, nB, between(r, 0.35, 0.7) / se, "up")];
  } else goalRows = [metricRow(r, goalName, goalKind, S.p, nA, nB, zg, "up")];
  let overviewGoal = goalName;
  if (kind === "switched") {      // the plan said one thing, the results judge another
    let zc = zr(r, "win", 0); const seC = relSE("rate", 0.021, n);
    if (zc * seC > 0.24) zc = between(r, 0.16, 0.24) / seC;     // a swapped goal shouldn't also look too good
    const clicks = metricRow(r, "Click rate", "rate", 0.021, nA, nB, zc, "up");
    goalRows = [clicks]; overviewGoal = goalName;
  }
  // guardrails
  const breachAt = kind === "guardBreach" ? Math.floor(r() * S.guards.length) : -1;
  const guardRows = S.guards.map(([gName, gp], i) =>
    metricRow(r, gName, "rate", gp, nA, nB, i === breachAt ? zr(r, "breach", stage) : between(r, -1, 1), "down"));
  const started = new Date(today.getTime() - (day - 1) * 86400000);
  const c = {
    kind, stage, unit, surface: sKey, type: S.type, surfaceLabel: S.label, where: S.where, name, hypothesis: hyp, creative,
    day, planned, plan: opts.planned ? `Day ${planned}: ${planned / 7} week${planned > 7 ? "s" : ""}, from the sizing` : S.plan, started: started.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    units: [nA, nB], srmP: srmP(nA, nB), hasHealth,
    overview: { goal: overviewGoal, guards: S.guards.map((g) => g[0]), assign: S.type === "flow" ? "Klaviyo flow split at entry, 50 / 50" : "Klaviyo A/B test, 50 / 50" },
    goalRows, guardRows,
    cause: kind === "srm" ? pick(r, SRM_CAUSE[S.type]) : null,
  };
  return c;
}

const WANT = { ship: "ship", lossGoal: "keepA", guardBreach: "keepA", running: "running", inconclusive: "inconclusive",
               srm: "distrust", tooGood: "distrust", switched: "distrust" };

export function makeCase(seed, kind, stage, unit, today = new Date(), opts = {}) {
  if (UNITS[unit] && UNITS[unit].parent === "U1") return makeU1(seed, kind, stage, UNITS[unit]);
  if (UNITS[unit] && UNITS[unit].parent === "U2") return makeU2(seed, kind, stage, UNITS[unit]);
  if (UNITS[unit] && UNITS[unit].parent === "U3") return makeU3(seed, kind, stage, UNITS[unit]);
  if (UNITS[unit] && UNITS[unit].parent === "U4") return makeU4(seed, kind, stage, UNITS[unit]);
  if (UNITS[unit] && UNITS[unit].parent === "U5") return makeU5(seed, kind, stage, UNITS[unit]);
  if (UNITS[unit] && UNITS[unit].parent === "U6" && unit !== "U6f") return makeU6(seed, kind, stage, UNITS[unit]);
  const r = rng(seed);
  for (let tries = 0; tries < 400; tries++) {
    const c = draft(r, kind, stage, unit, today, opts);
    if (!readable(c)) continue;
    const ans = answerFor(c);
    if (ans !== WANT[kind]) continue;
    c.answer = ans; c.seed = seed; c.screen = "experiment";
    c.why = explain(c); c.hint = hintFor(c); c.target = targetFor(c);
    if (unit === "U6f" && stage === 0) {   // the first reps walk the checks in order, then the call
      c.guided = true;
      c.guide = [{ k: "date", name: "Read date", tab: "o", look: "The plan's read date, against today's day. Has it come?", bad: "running", els: ["ov-read", "day"] },
                 { k: "guard", name: "Guardrails", tab: "a", look: "Is any guardrail's whole range on the bad side (right of zero)?", bad: "keepA", els: c.guardRows.map((_, i) => "u" + i) }];
      c.gtarget = c.answer === "running" ? "date" : c.kind === "guardBreach" ? "guard" : null;
    }
    return c;
  }
  throw new Error(`no readable ${kind} case for seed ${seed}`);
}

// ---------- words ----------
function readStr(c) { return `The read date has come (planned for day ${c.planned}, now day ${c.day}).`; }
function ciText(g) { return `${pctStr(g.lo)} to ${pctStr(g.hi)}`; }
function splitNote(c) {
  if (!c.hasHealth) return "";
  const n = c.units[0] + c.units[1], share = (c.units[0] / n * 100).toFixed(1);
  if (c.srmP >= 0.05) return "";
  return ` The split is ${share} / ${(100 - share).toFixed(1)}, and the split check (p = ${c.srmP.toFixed(3)}) is above its 0.001 alarm line. That's normal wobble.`;
}
export function explain(c) {
  const g = c.goalRows[0], badGuard = c.guardRows.find((x) => x.ctw <= 0.05);
  const n = c.units[0] + c.units[1];
  switch (c.answer) {
    case "distrust":
      if (c.srmP < SRM_ALARM) {
        const diff = Math.abs(c.units[0] - c.units[1]), fewer = c.units[0] > c.units[1] ? "B" : "A";
        return `Health: ${fewer} has ${fmtN(diff)} fewer people on a 50/50 plan (${(c.units[0] / n * 100).toFixed(1)} / ${(c.units[1] / n * 100).toFixed(1)}), p-value below 0.001. ` +
          `A gap that big by chance is rarer than 1 in 1,000, so something dropped people from one side (here, ${c.cause}). The ${pctStr(g.pct)} can't be trusted until the split is fixed.`;
      }
      if (g.name !== c.overview.goal)
        return `The plan names ${c.overview.goal.toLowerCase()} as the goal. The results table judges ${g.name.toLowerCase()} instead. A goal changed after launch lets a test pick whichever number won. Go back to the planned metric before you call it.`;
      return `The split is fine, but ${pctStr(g.pct)} on the goal is past the 30% line. Real wins are almost always under 25%, most a few percent. A result that good is usually a setup or tracking bug, like an order event counted twice in one version. Check it before you celebrate (Twyman's law).`;
    case "running":
      return `It's day ${c.day}, and the plan reads on day ${c.planned}. ${c.type === "flow" ? "Entrants are still coming in, and their orders take time." : "Orders keep arriving for days after a send."} ` +
        (g.ctw >= 0.95 ? `Even with chance to win at ${ctwStr(g.ctw)}, checking early calls false winners far more often than 1 in 20. ` : "") +
        `Keep running to the read date.` + splitNote(c);
    case "keepA":
      if (badGuard)
        return `${g.name} ${g.ctw >= 0.95 ? "won (" + pctStr(g.pct) + ")" : "moved " + pctStr(g.pct)}. But ${badGuard.name.toLowerCase()} went from ${badGuard.a} to ${badGuard.b} (${pctStr(badGuard.pct)}), and its whole range is on the bad side. ` +
          `A guardrail breach vetoes the win. Keep A, then find out why.` + splitNote(c);
      return `${readStr(c)} ${g.name} is down ${pctStr(g.pct).replace("−", "")}, chance to win ${ctwStr(g.ctw)}, and the whole range (${ciText(g)}) is below zero. B lost. Keep A.` + splitNote(c);
    case "ship":
      return `${readStr(c)} ${g.name} is up ${pctStr(g.pct).replace("+", "")}, chance to win ${ctwStr(g.ctw)}, and the whole range (${ciText(g)}) is above zero. Guardrails moved within noise. Ship B.` + splitNote(c);
    case "inconclusive": {
      const reach = (1.96 * (g.hi - g.lo) / 3.92).toFixed(0);
      return `${readStr(c)} Chance to win is ${ctwStr(g.ctw)}, short of 95%, and the range (${ciText(g)}) crosses zero. ` +
        `This test can't tell apart effects smaller than about ±${reach}%. The planned run is over, so stop and mark it inconclusive.` + splitNote(c);
    }
  }
  return "";
}
function hintFor(c) {
  if (c.unit === "U6f" || c.unit === "MS1") return "Two looks before every call. O: the plan's read date. A: the numbers. Before the read date, keep running. After it, a guardrail on the bad side means keep A. Otherwise chance to win at 95% or more means ship, 5% or less means B lost, and anything between is inconclusive.";
  return "A new first look: H. If Health shows a sample ratio mismatch, don't trust the numbers. Also distrust a goal metric that isn't the one in the plan (O), and any goal lift of 30% or more. If all three are clean, read it as before.";
}
function targetFor(c) {
  if (c.answer === "distrust") return c.srmP < SRM_ALARM ? "health" : c.goalRows[0].name !== c.overview.goal ? "goal-name" : "g0";
  if (c.answer === "running") return "day";
  if (c.answer === "keepA" && c.guardRows.some((x) => x.ctw <= 0.05)) return "u" + c.guardRows.findIndex((x) => x.ctw <= 0.05);
  return "g0";
}

// ---------- grading ----------
// clean = the right call after opening every tab the unit has. The tabs are the habit.
export function grade(c, callId, seen, tabs) {
  const right = callId === c.answer || (c.accept || []).includes(callId);
  const missing = tabs.filter((t) => !seen.includes(t));
  return { right, tier: right ? (missing.length ? "ok" : "clean") : "miss", missing };
}

// ---------- the scheduler ----------
// A unit's state: { reps: [{kind, right, clean, ms, stage}], bag: [kinds], review: [{kind, due}], passed }
export function newUnitState() { return { reps: [], bag: [], review: [], passed: false }; }
export function stageFor(st) { const n = st.reps.length; return n < 3 ? 0 : n < 8 ? 1 : 2; }
export function nextKind(unitId, st, r) {
  const U = UNITS[unitId];
  if (st.reps.length < U.meet.length) return U.meet[st.reps.length];
  const due = st.review.findIndex((x) => x.due <= st.reps.length);
  if (due >= 0) return st.review.splice(due, 1)[0].kind;
  if (!st.bag.length) st.bag = shuffle(U.kinds.slice(), r);
  return st.bag.pop();
}
export function record(st, rep, pass = [7, 8]) {
  st.reps.push(rep);
  if (!rep.right) st.review.push({ kind: rep.kind, due: st.reps.length + 1 });   // reps.length is now the next rep's index, so this lands two reps later
  const [need, of] = pass, last = st.reps.slice(-of);
  const nowPassed = st.reps.length >= of && last.filter((x) => x.right).length >= need && rep.right;
  const justPassed = nowPassed && !st.passed;
  if (nowPassed) st.passed = true;
  return { justPassed };
}
// the daily round: 12 reps from passed units, weighted toward kinds missed in the last 30 reps
export function dailyKinds(units, r, n = 12) {
  const pool = [], have = new Set();
  for (const [id, st] of Object.entries(units)) {
    if (!st.passed || !UNITS[id] || UNITS[id].daily === false) continue;
    for (const k of new Set(UNITS[id].kinds)) {          // each kind once, even when two units share it
      if (have.has(k)) continue;
      have.add(k);
      const misses = Object.values(units).flatMap((u) => u.reps.slice(-30)).filter((x) => x.kind === k && !x.right).length;
      pool.push({ unit: id, kind: k, w: (k === "srm" ? 2 : 1) + 2 * misses });
    }
  }
  if (!pool.length) return [];
  const out = [];
  for (let i = 0; i < n; i++) {
    let x = r() * pool.reduce((s, p) => s + p.w, 0);
    let chosen = pool[0];
    for (const p of pool) { if ((x -= p.w) < 0) { chosen = p; break; } }
    if (out.length && out[out.length - 1].kind === chosen.kind && pool.length > 1) { i--; continue; }   // no back-to-back twins
    out.push({ unit: chosen.unit, kind: chosen.kind });
  }
  return out;
}
export function shuffle(a, r) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// =====================================================================================================
// U1 Fair or fooled: a test setup arrives (a setup card, later a Slack message). Is the comparison fair, and if not,
// how was it broken? Three fields, at most one broken: who got B, who was counted, and when each version ran.
// =====================================================================================================
const U1_CHANGES = [
  ["A GIF hero in the daily campaign", "the GIF hero", "Daily campaign"],
  ["A question subject line on the daily campaign", "the question subject line", "Daily campaign"],
  ["Review stars under each product", "the review stars", "Daily campaign"],
  ["A founder story in welcome email 1", "the founder story", "Welcome flow"],
  ["A brew guide in post-purchase email 1", "the care guide", "Post-purchase flow"],
  ["$10 off in cart email 1", "the $10 off", "Abandoned cart flow"],
  ["A coffee emoji in the Thursday SMS", "the emoji", "SMS"],
];
// [setup-card text, Slack prose, odd-but-fair?]
const U1_ASSIGN_FAIR = [
  ["Klaviyo A/B test, random 50/50 split", "We ran it as a Klaviyo A/B test, 50/50", false],
  ["Klaviyo's random split, 50/50 of everyone who entered", "Klaviyo split everyone who came in 50/50", false],
  ["Even profile IDs got B, odd IDs got A", "Even profile IDs got B and odd ones got A", true],
  ["Last digit of the phone number: even got B, odd got A", "We split on the last digit of the phone number, even got B", true],
];
// [card, prose, the trait that rode along]
const U1_ASSIGN_CHOSEN = [
  ["B went to Engaged 30, A to everyone else", "We sent B to Engaged 30 and A to everyone else", "engaged"],
  ["People on the early-access list got B, everyone else got A", "The early-access list got B, everyone else got A", "eager"],
  ["Theo picked the 20,000 most active customers for B", "I hand-picked our 20,000 most active customers for B", "active"],
  ["People who clicked last week got B, the rest got A", "Last week's clickers got B and the rest got A", "engaged"],
  ["Bean buyers got B, gear-only buyers got A", "Bean buyers got B and gear-only buyers got A", "bigger spenders"],
];
const U1_COUNT_FAIR = [
  ["Everyone the send went to", "counting everyone it went to"],
  ["Everyone assigned at the split, opened or not", "counting everyone assigned, opened or not"],
  ["Everyone who entered, from the moment they entered", "counting everyone from the moment they entered"],
];
const U1_COUNT_AFTER = [
  ["Only people who opened", "looking only at people who opened", "openers"],
  ["Only people who clicked", "looking only at clickers", "clickers"],
  ["People who reached email 3 (B adds a 2-day wait before it)", "counting people who reached email 3 (B has the extra 2-day wait)", "people who stayed long enough to get email 3"],
  ["People still subscribed 30 days later", "counting people still subscribed at day 30", "people who didn't unsubscribe"],
];
const U1_WHEN_FAIR = [
  ["Same Tuesday, same 10 a.m. send", "Both went out Tuesday at 10"],
  ["Both versions ran over the same four weeks", "Both ran over the same four weeks"],
];
const U1_WHEN_BA = [
  ["B ran in October, compared with A's numbers from September", "B ran in October and I compared it with September's A numbers", ["colder weather", "the fall roast drop", "a sitewide sale on Oct 10"]],
  ["This year's version (B) against last year's (A), same month", "I compared this year's version with last year's", ["a bigger, newer list", "new roasts in the catalog", "a different discount calendar"]],
  ["The two weeks after launch against the two weeks before", "I compared the two weeks after launch with the two weeks before", ["payday timing", "a TikTok mention on day 3", "the weather turning"]],
];
const SENDERS = ["Theo", "Priya"];

const ROW_ASKS = {
  rowChange: ["What is B doing differently from A?", "Priya asks what the new version actually is. Which line tells him?"],
  rowAssign: ["How were people put into group A or group B?", "Theo asks who decided which people got the new version. Which line answers him?"],
  rowCount: ["Whose results went into the numbers?", "Did the report include people who never opened? Which line says?"],
  rowWhen: ["Did A and B run at the same time?", "Which dates did each version run? Which line says?"],
  rowResult: ["How did B do against A?", "Did the new version make more money? Which line says?"],
};
const ROW_WHY = {
  rowChange: "What changed is the one thing B does differently. Everything else about the two emails is the same.",
  rowAssign: "Who got B says how people were split into the two groups. This is the line you check for a coin or a choice.",
  rowCount: "Who was counted says whose results went into the numbers. This is the line you check for counting after the split.",
  rowWhen: "When says the dates each version ran. This is the line you check for side by side or one period against another.",
  rowResult: "Result is how B did compared with A. You only trust it after the three lines above it pass.",
};
export function makeU1(seed, kind, stage, U = UNITS.U1g) {
  const r = rng(seed);
  const [change, short, surface] = pick(r, U1_CHANGES);
  const row = kind.startsWith("row");
  const k = row ? "fair" : kind === "fairOdd" ? "fair" : kind;
  let assign = pick(r, U1_ASSIGN_FAIR.filter((a) => !a[2])), count = pick(r, U1_COUNT_FAIR), when = U1_WHEN_FAIR[/flow/.test(surface) ? 1 : 0];
  if (kind === "fairOdd" || (k === "fair" && !row && stage >= 1 && r() < 0.4)) assign = pick(r, U1_ASSIGN_FAIR.filter((a) => a[2]));   // fair but odd
  if (k === "chosen") assign = pick(r, U1_ASSIGN_CHOSEN);
  if (k === "after") count = pick(r, U1_COUNT_AFTER);
  if (k === "beforeAfter") when = pick(r, U1_WHEN_BA);
  const lift = k === "fair" ? Math.round(between(r, -6, 26)) : Math.round(between(r, 8, 41));   // overlapping, so the size of the lift gives nothing away
  const liftTxt = (lift >= 0 ? "up " : "down ") + Math.abs(lift) + "%";
  const who = pick(r, SENDERS);
  const prose = `${assign[1]}. ${when[1]}. ${count[1][0].toUpperCase() + count[1].slice(1)}, B is ${liftTxt} on revenue per recipient. ${lift > 0 ? "Ship it?" : "So B lost?"}`;
  // the dots revealed after the call: 50 per side, gold = engaged (made-up, the mechanism not data)
  const ri = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  let dots;
  if (k === "chosen") dots = { a: ri(5, 11), b: ri(34, 44), countedA: 50, countedB: 50 };
  else if (k === "after") { const a = ri(13, 17), b = ri(13, 17); dots = { a, b, countedA: ri(36, 42), countedB: ri(22, 29) }; }
  else dots = { a: ri(13, 17), b: ri(13, 17), countedA: 50, countedB: 50 };
  const c = { screen: "setup", unit: U.id, kind, stage, seed, change, short, surface, from: who, prose, liftTxt,
              fields: { assign: assign[0], count: count[0], when: when[0] }, show: U.fields, showProse: !!U.prose,
              guided: !!U.guided && stage === 0, oddFair: k === "fair" && assign[2],
              dots, also: k === "beforeAfter" ? when[2] : null, answer: row ? kind : k,
              target: row ? kind.slice(3).toLowerCase() : { chosen: "assign", after: "count", beforeAfter: "when", fair: null }[k] };
  if (row) {
    c.ask = pick(r, ROW_ASKS[kind]);
    c.why = ROW_WHY[kind];
    c.hint = "Five lines, top to bottom: what B changes, how people were split, whose results were counted, the dates, and how B did. Match the question to the line.";
    return c;
  }
  c.why = u1Why(c, assign, count);
  c.hint = {
    assign: "Ask: what decided who got B? A coin, Klaviyo's random split, or something as blind as a coin (a profile ID digit) is fair. A person, a list, a segment or past behavior is chosen.",
    count: "Ask: whose results are in the numbers? Everyone who was put in a group is fair. Only people who did something afterwards (opened, clicked, stayed, reached email 3) is counted after the split.",
    when: "Ask: did A and B run at the same time? Side by side is fair. One period against another (last month, last year, the weeks before launch) has no control.",
  }[U.fields.length === 1 ? U.fields[0] : ""] ||
    `Check the lines in order: ${(U.fields.length ? U.fields : ["assign", "count", "when"]).map((f) => ({ assign: "who got B", count: "who was counted", when: "when" })[f]).join(", ")}. Stop at the first one that's off. If all of them pass, it's a fair test.`;
  return c;
}
function u1Why(c, assign, count) {
  switch (c.kind) {
    case "chosen":
      return `Who got B was chosen, not flipped: "${c.fields.assign}". Those people were already ${assign[2]} before ${c.short} reached them, so B starts ahead no matter what it does. ` +
        `In the dots, B's group had ${c.dots.b} of 50 keen people against A's ${c.dots.a}. That hidden head start is called a confounder. Only a coin balances traits you can't see.`;
    case "after":
      return `The split was fair, but the count wasn't: "${c.fields.count}". Once you count only ${count[2]}, the change itself decides who is left in each group. ` +
        `In the dots, A kept ${c.dots.countedA} of 50 and B kept ${c.dots.countedB}, and they aren't the same kinds of people anymore. Count everyone assigned at the split. That's called intention-to-treat.`;
    case "beforeAfter":
      return `There's no control running at the same time: "${c.fields.when}". Everything else that changed between the two periods (${c.also.join(", ")}) is mixed into B's ${c.liftTxt.replace(/^up /, '').replace(/^down /, '')} ${c.liftTxt.startsWith('up') ? 'gain' : 'drop'}. A and B have to run side by side.`;
    default: {
      const shown = c.show.length ? c.show : ["assign", "count", "when"];
      const bits = [];
      if (shown.includes("assign")) bits.push(c.oddFair
        ? `"${c.fields.assign}" isn't a coin, but a profile ID or a phone digit has nothing to do with how someone shops, so it splits like one.`
        : `A random split decided who got B.`);
      if (shown.includes("count")) bits.push(`"${c.fields.count}" counts everyone who was put in a group, so the change can't pick who is left.`);
      if (shown.includes("when")) bits.push(`"${c.fields.when}": A and B ran side by side, so anything else going on hit both.`);
      return bits.join(" ") + ` The dots show what a fair split looks like: ${c.dots.a} and ${c.dots.b} keen people of 50, close by chance alone. Fair test.`;
    }
  }
}

// =====================================================================================================
// U2 The board: rows are where a test runs, columns are weeks. Practised in parts like U1: do two bars share a week,
// gate 1 alone (one test per row), gate 2 alone (no two offers in the same weeks: an offer follows a person to every
// channel), 1+2, gate 3 (a named reader) with the BFCM freeze (Nov 23 to Dec 6), all four, then placing a card in the
// first week it can run. A unit's `rules` are the checks taught so far: a case never breaks one it can't name.
// =====================================================================================================
export const BOARD_ROWS = ["Daily campaign", "SMS", "Welcome flow", "Cart flow", "Post-purchase flow"];
export const BOARD_WEEKS = ["Oct 26", "Nov 2", "Nov 9", "Nov 16", "Nov 23", "Nov 30", "Dec 7", "Dec 14"];
export const FREEZE = [4, 5];
const READERS = ["Rosa", "Priya", "Theo"];
const CARDS_BY_ROW = [   // [offers, creative] per row, so every card belongs where it sits
  [["Free shipping over $99 banner", "Gift with purchase over $150", "Sampler bundle: 4 bags for 3"], ["GIF hero vs static", "Question subject line", "Review stars block", "Short vs long copy"]],
  [["SMS code BREW15", "Text-only early access to the sale"], ["Coffee emoji in the text", "Bundle-builder link vs beans page"]],
  [["$10 off the first bean order", "Free filters with a first order"], ["Founder story in email 1", "Bundle-builder block in email 2"]],
  [["$10 off in cart email 1", "Free returns line in cart email 1"], ["Reviews block in cart email 1", "Fit guide in cart email 2"]],
  [["15% off gear for bean buyers"], ["Care guide vs product block", "Gear cross-sell for bean buyers"]],
];
const cardPool = (row, offer) => CARDS_BY_ROW[row][offer ? 0 : 1];

export const overlaps = (a, b) => a.start < b.start + b.len && b.start < a.start + a.len;
export const touches = (a, b) => a.start + a.len === b.start || b.start + b.len === a.start;
export function boardProblems(card, cards, rules = ALL_GATES) {
  const out = [], on = (g) => rules.includes(g);
  const sameRow = cards.find((x) => x.row === card.row && overlaps(x, card));
  if (on("busy") && sameRow) out.push({ gate: "busy", with: sameRow });
  if (on("offers") && card.offer) { const o = cards.find((x) => x.offer && overlaps(x, card) && x !== sameRow); if (o) out.push({ gate: "offers", with: o }); }
  if (on("noReader") && !card.reader) out.push({ gate: "noReader" });
  if (on("freeze") && FREEZE.some((w) => w >= card.start && w < card.start + card.len)) out.push({ gate: "freeze" });
  if (card.start < 0 || card.start + card.len > BOARD_WEEKS.length) out.push({ gate: "offBoard" });
  return out;
}
function makeBoard(r, rules) {
  const cards = [], used = new Set(), offersOn = rules.includes("offers");
  const n = 3 + Math.floor(r() * 3);
  for (let tries = 0; cards.length < n && tries < 200; tries++) {
    const offer = offersOn && r() < 0.35, len = 1 + Math.floor(r() * 3), row = Math.floor(r() * BOARD_ROWS.length);
    const c = { row, start: Math.floor(r() * (BOARD_WEEKS.length - len + 1)), len, offer, name: pick(r, cardPool(row, offer)), reader: pick(r, READERS) };
    if (used.has(c.name)) continue;
    if (boardProblems(c, cards, rules).length) continue;
    cards.push(c); used.add(c.name);
  }
  return cards;
}
export function earliestStart(card, cards, from = 0) {   // from = weeks already past (MS1)
  for (let s = from; s + card.len <= BOARD_WEEKS.length; s++) if (!boardProblems({ ...card, start: s }, cards).length) return s;
  return -1;
}
const FITS_KINDS = ["fits", "fitsNear", "fitsCol", "fitsCrea", "fitsOffer", "fitsEdge"];
export function makeU2(seed, kind, stage, U = UNITS.U2f) {
  const r = rng(seed), rules = U.rules, offersOn = rules.includes("offers");
  for (let tries = 0; tries < 4000; tries++) {
    const cards = makeBoard(r, rules);
    const offer = kind === "offers" || kind === "fitsOffer" ? true : kind === "fitsCrea" ? false : offersOn && r() < 0.4;
    const len = 1 + Math.floor(r() * 3);
    const names = new Set(cards.map((x) => x.name));
    const row = U.row ?? Math.floor(r() * BOARD_ROWS.length), pool = cardPool(row, offer).filter((x) => !names.has(x));
    if (!pool.length) continue;
    const card = { row, len, offer, name: pick(r, pool), reader: kind === "noReader" ? "" : pick(r, READERS), isNew: true };
    const c = { screen: "board", unit: U.id, kind, stage, seed, cards, card, rules, place: false, target: null,
                showFreeze: rules.includes("freeze"), guided: !!U.guided && stage === 0, show: U.calls.filter((x) => x !== "fits") };
    if (kind === "place") {
      card.reader = pick(r, READERS);
      const from = U.from || 0, e = earliestStart(card, cards, from);
      if (e <= from || e > (from ? 7 : 6)) continue;   // this week never works, so the card has to move
      if (from >= 2 && e === 6 && r() < 0.5) continue;   // late in MS1 the freeze pushes most cards to Dec 7; keep Dec 14 in play
      c.past = from;
      Object.assign(c, { place: true, answer: "w" + e, why: placeWhy(c, e), hint: U2_HINT.place });
      return c;
    }
    card.start = Math.floor(r() * (BOARD_WEEKS.length - len + 1));
    const probs = boardProblems(card, cards, rules).filter((p) => p.gate !== "offBoard");
    if (U.overlap) {   // step 1: the new card is fine on its own row; does it share a week with the marked bar on another row?
      if (probs.length) continue;
      const fit = cards.map((x, i) => [x, i]).filter(([x]) => x.row !== card.row &&
        (kind === "share" ? overlaps(x, card) : kind === "edge" ? touches(x, card) : !overlaps(x, card) && !touches(x, card)));
      if (!fit.length) continue;
      const [, mi] = pick(r, fit);
      Object.assign(c, { marked: mi, answer: kind === "share" ? "share" : "apart" });
      c.why = overlapWhy(c); c.hint = U2_HINT.U2a;
      return c;
    }
    const want = FITS_KINDS.includes(kind) ? [] : [kind];
    if (probs.length !== want.length || (want.length && probs[0].gate !== kind)) continue;
    const otherRowShare = cards.some((x) => x.row !== card.row && overlaps(x, card));
    if (kind === "fitsNear" && !cards.some((x) => x.row === card.row && touches(x, card))) continue;
    if (kind === "fitsCol" && !otherRowShare) continue;
    if (kind === "fitsCrea" && !cards.some((x) => x.offer && overlaps(x, card))) continue;
    if (kind === "fitsOffer" && !cards.some((x) => x.offer)) continue;   // other offers on the board, just not in its weeks
    if (kind === "fitsEdge" && !(card.start + card.len === FREEZE[0] || card.start === FREEZE[FREEZE.length - 1] + 1)) continue;
    if (kind === "fits" && stage >= 1 && !otherRowShare) continue;      // fits while sharing weeks
    if (kind === "busy" && stage >= 1 && U.id === "U2b" && !otherRowShare && r() < 0.5) continue;   // usually something on other rows too
    Object.assign(c, { answer: want.length ? kind : "fits", problem: probs[0] || null, target: probs[0] ? kind : null });
    c.why = callWhy(c);
    c.hint = U2_HINT[U.id] || `Check in order: ${c.show.map((g) => ({ busy: "its row", offers: "offers", noReader: "the reader", freeze: "the freeze" })[g]).join(", then ")}. Stop at the first one that's blocked. If none is, it fits.`;
    return c;
  }
  throw new Error(`no ${kind} board for ${U.id} seed ${seed}`);
}
const U2_HINT = {
  U2a: "Look straight up and down the new card's columns. If the marked bar has any part in one of them, they share a week. Bars that only touch end to end share nothing.",
  U2b: "Look along the new card's own row, in its weeks only. Another bar there means the row is busy. Bars on other rows don't count for this check.",
  U2c: "Is the new card an offer (orange)? If not, it fits. If it is, look down its weeks for any other offer, on any row.",
  U2e: "Two quick looks: is a reader named on the new card, and does any of its weeks sit in a shaded freeze column?",
  place: "Slide the card along its row (arrow keys, or click or tap a week) and drop it in the first week where its row is free, no other offer overlaps if it's an offer, and it stays out of the freeze.",
};
const wk = (s, len) => len === 1 ? `the week of ${BOARD_WEEKS[s]}` : `${BOARD_WEEKS[s]} to ${BOARD_WEEKS[s + len - 1]}`;
function overlapWhy(c) {
  const m = c.cards[c.marked], card = c.card, shared = [];
  for (let w = card.start; w < card.start + card.len; w++) if (w >= m.start && w < m.start + m.len) shared.push(BOARD_WEEKS[w]);
  if (shared.length) return `"${m.name}" runs ${wk(m.start, m.len)}. The new card runs ${wk(card.start, card.len)}. Both bars sit in the column for ${shared.join(" and ")}, so they share ${shared.length > 1 ? "those weeks" : "that week"}.`;
  if (touches(m, card)) {
    const first = m.start < card.start;
    return `"${m.name}" ${first ? "ends" : "starts"} the week of ${BOARD_WEEKS[first ? m.start + m.len - 1 : m.start]}, and the new card ${first ? "starts" : "ends"} the week of ${BOARD_WEEKS[first ? card.start : card.start + card.len - 1]}. The bars touch end to end, but no column holds both, so they share no week.`;
  }
  return `"${m.name}" runs ${wk(m.start, m.len)} and the new card runs ${wk(card.start, card.len)}. No column holds both bars, so they share no week.`;
}
function problemText(p, card) {
  switch (p.gate) {
    case "busy": return `"${p.with.name}" already runs on the ${BOARD_ROWS[card.row]} row in ${wk(p.with.start, p.with.len)}. One test per row at a time (gate 1): Klaviyo splits a send once, so both changes would land on the same B and you couldn't tell which one moved the number.`;
    case "offers": return `"${card.name}" is an offer, and "${p.with.name}" is an offer running in ${wk(p.with.start, p.with.len)} on the ${BOARD_ROWS[p.with.row]} row. An offer follows a person to checkout from any channel, so each test would measure its offer on top of the other one, and neither answers its own question (gate 2).`;
    case "noReader": return `No one is named to read it (gate 3). A test without a reader finishes and sits unread.`;
    case "freeze": return `It runs into the BFCM freeze (Nov 23 to Dec 6). Nothing new runs in those weeks.`;
    default: return "It runs off the end of the board.";
  }
}
function callWhy(c) {
  const card = c.card, on = (g) => c.rules.includes(g);
  if (c.problem) return problemText(c.problem, card);
  const bits = [];
  const near = c.cards.find((x) => x.row === card.row && touches(x, card));
  bits.push(`Its row is free in ${wk(card.start, card.len)}` + (near ? `: "${near.name}" ${near.start + near.len === card.start ? "ends the week before" : "starts the week after"}, so they never share a week.` : "."));
  const share = c.cards.find((x) => x.row !== card.row && overlaps(x, card) && !(x.offer && on("offers")));
  if (share) bits.push(`Sharing weeks with "${share.name}" on the ${BOARD_ROWS[share.row]} row is fine: it's a different send with its own random split.`);
  if (on("offers")) {
    const o = c.cards.find((x) => x.offer && overlaps(x, card));
    if (card.offer) bits.push(`It's an offer, and no other offer runs in those weeks.`);
    else bits.push(o ? `It's a creative change. "${o.name}" is an offer in the same weeks, but a creative change only shows inside its own email, so it hands nobody an offer. That's fine.` : `It's a creative change, so offers elsewhere don't matter.`);
  }
  if (on("noReader")) bits.push(`${card.reader} will read it.`);
  if (on("freeze")) bits.push(card.start + card.len === FREEZE[0] ? `It ends the week of ${BOARD_WEEKS[FREEZE[0] - 1]}, just before the freeze.` :
    card.start === FREEZE[FREEZE.length - 1] + 1 ? `It starts the week of ${BOARD_WEEKS[card.start]}, right after the freeze.` : `It stays out of the freeze.`);
  return bits.join(" ") + " It fits.";
}
function placeWhy(c, e) {
  const card = c.card;
  const earlier = [];
  for (let s = c.past || 0; s < e; s++) { const p = boardProblems({ ...card, start: s }, c.cards).filter((x) => x.gate !== "offBoard")[0]; if (p) earlier.push(`${BOARD_WEEKS[s]}: ${{ busy: "row busy", offers: "another offer running", freeze: "freeze", noReader: "no reader" }[p.gate]}`); }
  return (c.past ? `Weeks before ${BOARD_WEEKS[c.past]} are already past. ` : "") + `The week of ${BOARD_WEEKS[e]} is the first that clears every gate${earlier.length ? ` (${earlier.join("; ")})` : ""}.` +
    (card.offer ? " It's an offer, so it also has to miss every other offer's weeks." : "");
}

// =====================================================================================================
// MS1 First four Mondays: the daily campaign for four weeks. Each Monday: a teammate's plan to check (U1, U3, U4 or U5),
// two finished tests to call (U6f, campaign only), the write-up of one of them (U6g) and a new card to place (U2g, the
// campaign row). A test called "keep running" comes back the next Monday at its read date, so nothing is left unread.
// The plan is fixed by the run's seed, so a run can stop and resume. Pass: 17 of 20 right and every write-up right.
// =====================================================================================================
export const MS1 = { weeks: 4, perWeek: 5, need: 17, mondays: ["Oct 26", "Nov 2", "Nov 9", "Nov 16"] };
const MS1_CHECKS = ["U1g", "U3g", "U4g", "U5g"];
export function ms1Plan(seed) {
  const r = rng(seed), tasks = [];
  let carry = null;                                       // a test left running, read again next Monday
  for (let w = 0; w < MS1.weeks; w++) {
    const cu = MS1_CHECKS[w], ck = pick(r, UNITS[cu].kinds);
    tasks.push({ w, type: "check", unit: cu, kind: ck, seed: (r() * 2 ** 31) | 0 });
    const reads = [];
    for (let k = 0; k < 2; k++) {
      let kind, idea = null;
      if (k === 0 && carry) { kind = pick(r, ["ship", "inconclusive", "lossGoal"]); idea = carry; carry = null; }
      else kind = pick(r, w === MS1.weeks - 1 || reads.some((x) => x.kind === "running") ? ["ship", "lossGoal", "guardBreach", "inconclusive"] : ["ship", "lossGoal", "guardBreach", "running", "inconclusive"]);
      const t = { w, type: "read", unit: "U6f", kind, seed: (r() * 2 ** 31) | 0, idea };
      reads.push(t); tasks.push(t);
    }
    const done = reads.filter((x) => x.kind !== "running");
    const of = done.length ? pick(r, done) : reads[0];
    tasks.push({ w, type: "write", unit: "U6g", kind: of.kind, seed: of.seed, idea: of.idea, of: tasks.indexOf(of) });
    tasks.push({ w, type: "place", unit: "U2g", kind: "place", seed: (r() * 2 ** 31) | 0 });
    const running = reads.find((x) => x.kind === "running");
    if (running) carry = makeCase(running.seed, "running", 2, "U6f", MS1_DAY, { surface: "campaign", idea: running.idea }).name;
  }
  return tasks;
}
const MS1_DAY = new Date("2026-10-26T12:00:00");
export function ms1Case(task) {
  const opts = { surface: "campaign", idea: task.idea || undefined };
  if (task.type === "read") return Object.assign(makeCase(task.seed, task.kind, 2, "U6f", MS1_DAY, opts), { unit: "U6f" });
  if (task.type === "write") return writeUp(task.seed, task.kind, 2, UNITS.U6g, makeCase(task.seed, task.kind, 2, "U6f", MS1_DAY, opts));
  if (task.type === "place") return makeU2(task.seed, "place", 2, { ...UNITS.U2g, row: 0, from: task.w });
  return makeCase(task.seed, task.kind, 2, task.unit);
}
