// v3 phase 3: the Overview tab in steps (PLAN.md, CURRICULUM.md unit 3). Small on purpose: the Overview is the plan a
// result answers to. Step 1 finds each line of the plan, step 2 adds secondary metrics (they explain, the goal decides),
// step 3 is the whole page: Overview, Health, Results, the call. Registered into the engine's tables by app.mjs at load.

import { makeCase, rng, metricRow, pctStr } from "./engine.mjs";

const PART = { screen: "experiment", parent: "U8", daily: false, pass: [5, 6] };
export const UNITS8 = {
  U8a: { ...PART, id: "U8a", step: 1, name: "Read the plan", tabs: ["o"], keyUnit: "U6", calls: ["oHyp", "oType", "oGoal", "oGuard", "oRead"],
         kinds: ["oGoal", "oGuard", "oRead", "oType", "oHyp", "oGuard", "oGoal", "oRead"], meet: ["oGoal", "oGuard", "oRead"] },
  U8b: { ...PART, id: "U8b", step: 2, name: "Goal or secondary?", tabs: ["o", "a"], keyUnit: "U6", calls: ["ship", "keepA", "inconclusive"],
         kinds: ["secWin", "secLoss", "win", "secMix", "flat", "secWin", "secLoss"], meet: ["secWin", "win", "secLoss"], pass: [6, 7] },
  U8c: { ...PART, id: "U8c", step: 3, name: "The whole page", tabs: ["o", "a", "h"], keyUnit: "U7", guided: true, daily: true,
         calls: ["ship", "keepA", "running", "inconclusive", "distrust"],
         kinds: ["secWin", "srm", "ship", "secLoss", "tooGood", "switched", "guardBreach", "running", "inconclusive", "lossGoal"],
         meet: ["ship", "secWin", "srm"], pass: [7, 8] },
};
export const STEPS8 = Object.keys(UNITS8);
export const CALLS8 = [
  { id: "oHyp", label: "Hypothesis", stamp: "Hypothesis" },
  { id: "oType", label: "Change type", stamp: "Change type" },
  { id: "oGoal", label: "Goal metric", stamp: "Goal metric" },
  { id: "oGuard", label: "Guardrail metrics", stamp: "Guardrails" },
  { id: "oRead", label: "Read date", stamp: "Read date" },
];
const FIELD = { oHyp: "ov-hyp", oType: "ov-type", oGoal: "ov-goal", oGuard: "ov-guard", oRead: "ov-read" };
const ASK = {
  oHyp: ["Why does the team expect B to win?", "What's the bet behind this test?"],
  oType: ["Could B's change reach people in other tests, the way a discount does?", "Is B something customers get, or something they see?"],
  oGoal: ["Which number does B have to beat A on?", "Theo asks what decides this one. Where do you look?"],
  oGuard: ["Which numbers can stop B shipping even if it wins?", "What must not get worse?"],
  oRead: ["Priya wants an answer today. Where do you check if it's ready?", "When can you make the call?"],
};

// secondary metrics: they explain a result (more clicks, more opens), they don't decide it. z = lift in standard errors.
const between = (r, a, b) => a + r() * (b - a);
const SEC = { campaign: [["Click rate", 0.021], ["Open rate", 0.38]], sms: [["Click rate", 0.06], ["Placed order rate", 0.012]], flow: [["Click rate", 0.05], ["Open rate", 0.45]] };
export function addSecondary(c, r, trap = null) {
  const list = SEC[c.surface === "sms" ? "sms" : c.type === "flow" ? "flow" : "campaign"]
    .filter(([n]) => n !== c.goalRows[0].name);                                   // a goal swapped to clicks isn't also a secondary row
  const zs = list.map(() => between(r, -1, 1)), n = Math.min(c.units[0], c.units[1]);
  // a trap row is clearly green or red but a believable size: about 8 to 16%, more on a small flow, never 25% or more
  const strong = (i) => { const p = list[i][1], se = Math.sqrt(2 * (1 - p) / (p * n)); return Math.min(Math.max(3.2, between(r, 0.08, 0.16) / se), 0.24 / se); };   // under 25%, like every real result
  if (trap === "win") zs[0] = strong(0);
  if (trap === "loss") zs[0] = -strong(0);
  if (trap === "mixWin") zs[zs.length - 1] = strong(zs.length - 1);
  c.secRows = list.map(([n, p], i) => metricRow(r, n, "rate", p, c.units[0], c.units[1], zs[i], "up"));
  c.overview.secs = SEC[c.surface === "sms" ? "sms" : c.type === "flow" ? "flow" : "campaign"].map(([n]) => n);
  return c;
}
const TRAP = { secWin: "win", secLoss: "loss", secMix: "mixWin" };
const BASEK = { secWin: "inconclusive", secLoss: "ship", secMix: "lossGoal", win: "ship", flat: "inconclusive" };

export function makeOverview(seed, kind, stage, unit, today) {
  const r = rng(seed ^ 0x0e71);
  let c;
  if (unit === "U8a") {
    c = makeCase(seed, r() < 0.5 ? "ship" : "inconclusive", stage, "U8a", today);
    addSecondary(c, r);
    const q = ASK[kind][Math.floor(r() * 2)];
    Object.assign(c, { ask: q, answer: kind, target: FIELD[kind],
      hint: "The Overview is the plan, written before launch. Hypothesis: why B should win. Change type: an offer customers get, or a creative change they see. Goal metric: the one number that decides. Guardrails: what must not get worse. Read date: when the call is due.",
      why: { oHyp: `Hypothesis: "${c.hypothesis}". It's the reason behind the test.`,
        oType: `Change type: ${c.creative ? "a creative change, something people see. It stays inside this test." : "an offer, something people get. Offers travel, so no other offer can run in the same weeks."}`,
        oGoal: `Goal metric: ${c.overview.goal}. That's the one number the call rests on.`,
        oGuard: `Guardrail metrics: ${c.overview.guards.join(", ")}. If one gets clearly worse, B doesn't ship.`,
        oRead: `Read date: ${c.plan}. Before then, the answer is keep running.` }[kind] });
  } else if (unit === "U8b") {
    c = makeCase(seed, BASEK[kind], stage, "U8b", today);
    addSecondary(c, r, TRAP[kind]);
    const g = c.goalRows[0], s = c.secRows[kind === "secMix" ? c.secRows.length - 1 : 0];
    Object.assign(c, { ask: "The read date has come and the guardrails held. What's the call?", target: "g0",
      hint: "O: the plan names one goal metric. A: only the Goal metrics row decides. Secondary metrics explain why, and they never decide, even when they're green or red.",
      why: kind === "secWin" ? `The goal, ${g.name.toLowerCase()}, has a range across zero. ${s.name} is up ${pctStr(s.pct)}, but it's a secondary metric: more clicks that didn't turn into money. Stop, inconclusive.`
        : kind === "secLoss" ? `The goal, ${g.name.toLowerCase()}, is up ${pctStr(g.pct)} with its range above zero. ${s.name} fell, but secondary metrics don't decide and it isn't a guardrail. Ship B.`
        : kind === "secMix" ? `The goal, ${g.name.toLowerCase()}, lost: ${pctStr(g.pct)}, range below zero. ${s.name} rose, but it can't overrule the goal. Keep A.`
        : c.answer === "ship" ? `The goal's range is above zero (${pctStr(g.pct)}) and nothing else blocks it. Ship B.`
        : `The goal's range crosses zero. The secondary rows moved within noise too. Stop, inconclusive.` });
  } else {
    c = makeCase(seed, BASEK[kind] && kind.startsWith("sec") ? BASEK[kind] : kind, stage, "U7", today);
    addSecondary(c, r, TRAP[kind]);
    c.hint = "O first: the goal metric and the read date. Then H: a broken split means don't trust it. A: a swapped goal or a goal up 30% or more means don't trust it. Then the read date, the guardrails, and last the goal row. Secondary rows never decide.";
    if (kind === "secWin") c.why = `Everything checks out, and the goal's range crosses zero. Click rate is up, but it's secondary. Stop, inconclusive.`;
    if (kind === "secLoss") c.why = `Everything checks out and the goal's range is above zero. ${c.secRows[0].name} fell, but a secondary metric can't block a ship. Ship B.`;
    if (stage === 0) {
      c.guided = true;
      c.guide = [
        { k: "health", name: "Health", tab: "h", look: "Does the balance check flag a mismatch?", bad: "distrust", els: ["hbal"] },
        { k: "goal", name: "The goal", tab: "o", look: "Which goal metric did the plan name? It has to be the Goal metrics row on Results.", bad: "distrust", els: ["ov-goal"] },
        { k: "good", name: "The lift", tab: "a", look: "Is the goal up 30% or more?", bad: "distrust", els: ["g0"] },
        { k: "date", name: "Read date", tab: "o", look: "The plan's read date, against today's day. Has it come?", bad: "running", els: ["ov-read", "day"] },
        { k: "guard", name: "Guardrails", tab: "a", look: "Is any guardrail's whole range on the bad side?", bad: "keepA", els: c.guardRows.map((_, i) => "u" + i) }];
      c.gtarget = c.srmP < 0.001 ? "health" : c.goalRows[0].name !== c.overview.goal ? "goal" : kind === "tooGood" ? "good" : c.answer === "running" ? "date" : kind === "guardBreach" ? "guard" : null;
      c.guideLast = "All clear. Last: the <b>Goal metrics</b> row, not the secondary rows. Which side of zero is its range? Make the call.";
    }
  }
  return Object.assign(c, { unit, kind, stage, seed, screen: "experiment" });
}

export const LESSONS8 = {
  U8a: [
    { h: "The Overview is the plan, written before launch.",
      p: "Every result answers to it. The hypothesis says why B should win. The change type says whether B is an offer people get or a creative change they see. The goal metric is the one number that decides. Guardrails are what must not get worse. The read date is when the call is due.",
      vis: { live: { unit: "U8a", kind: "oGoal", seed: 21, tab: "o" }, mark: ["ov-hyp", "ov-goal", "ov-guard", "ov-read"] },
      predict: { q: "Theo asks when you can call a test. Which line answers him?", opts: ["Goal metric", "Read date"], answer: 1, reveal: "Read date. Before it, the answer is keep running." } },
    { h: "Change type tells you whether B can travel.",
      p: "A creative change (a new hero, a subject line, a block) is something people see, and it stays inside its own email. An offer (a code, free shipping, a gift) is something people get, and it follows them to checkout from any channel. That's why the board keeps two offers out of the same weeks, and it's on the Overview so you can check it.",
      vis: { live: { unit: "U8a", kind: "oType", seed: 21, tab: "o" }, mark: ["ov-type"] },
      predict: { q: "\"Free shipping over $99\" in the header. Creative or offer?", opts: ["Creative: it's a line of copy", "Offer: people get something"], answer: 1, reveal: "Offer. The copy is just how it's shown. What matters is that customers get free shipping." } },
  ],
  U8b: [
    { h: "Secondary metrics explain. Only the goal decides.",
      p: "GrowthBook's Results tab has three tables: Goal metrics, Secondary metrics and Guardrail metrics. Secondary rows like click rate and open rate show how people reacted. They can turn green or red, but the call rests on the goal row alone. A test that may pick whichever row came out green will always find a winner.",
      vis: { live: { unit: "U8b", kind: "secWin", seed: 4, tab: "a" }, mark: ["g0", "s0"] },
      predict: { q: "Revenue per recipient: range across zero. Click rate: +12%, green. The call?", opts: ["Ship B", "Inconclusive"], answer: 1, reveal: "Inconclusive. More clicks that didn't turn into money don't decide anything." } },
    { h: "The Overview says which rows are which.",
      p: "Results splits metrics into three tables, and the plan on the Overview is where those roles were set before launch: one goal metric, a few secondary metrics, the guardrails. If a metric moved tables after launch, that's the swapped-goal problem from Health.",
      vis: { live: { unit: "U8b", kind: "secLoss", seed: 9, tab: "o" }, mark: ["ov-goal", "ov-sec", "ov-guard"] },
      predict: { q: "Goal up with its range above zero, click rate down and red, guardrails held. The call?", opts: ["Ship B", "Keep A: clicks fell"], answer: 0, reveal: "Ship B. Click rate is secondary. It can explain, never block. Only a guardrail can veto a win." } },
  ],
  U8c: [
    { h: "The whole page: Overview, Health, Results, the call.",
      p: "This is the call you'll make every Monday in the quarter. The Overview tells you what the test answers to. Health and the lift tell you whether to trust it. The read date, the guardrails and the goal row decide. Secondary rows never do.",
      vis: { checks: [["Overview (O)", "The goal metric and the read date."], ["Health (H)", "Broken split: don't trust it."], ["Goal and lift (A)", "Swapped goal, or a goal up 30% or more: don't trust it."], ["Read date", "Not yet: keep running."], ["Guardrails", "Whole range on the bad side: keep A."], ["Goal row", "Above zero ship, below keep A, across it inconclusive."]] } },
  ],
};
