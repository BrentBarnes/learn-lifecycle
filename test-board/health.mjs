// v3 phase 2: Health in steps (PLAN.md). Replaces v2's single U7 drill with six steps in U6's style: read the balance
// table, is the split broken, too good to be true, those two together, did the goal change after launch, then Health
// first and the full call. Built on the engine's experiment cases (makeCase on "U7"), then re-asked for each step.
// app.mjs registers these units, calls and lessons into the engine's tables at load (v3 only; v2 is untouched).

import { makeCase, rng, srmP, pctStr, ctwStr, SRM_ALARM, TOO_GOOD } from "./engine.mjs";

const fmtN = (n) => Math.round(n).toLocaleString("en-US");
const PART = { screen: "experiment", parent: "U7", daily: false, pass: [5, 6] };
export const UNITS7 = {
  U7a: { ...PART, id: "U7a", step: 1, name: "Read the balance check", tabs: ["h"], keyUnit: "U7", calls: ["hAU", "hEU", "hAP", "hEP"],
         kinds: ["hAU", "hAP", "hEU", "hEP", "hAU", "hAP"], meet: ["hAU", "hEP", "hAP"] },
  U7b: { ...PART, id: "U7b", step: 2, name: "Is the split broken?", tabs: ["h"], keyUnit: "U7", calls: ["splitOk", "splitBad"],
         kinds: ["srm", "fine", "wobble", "srmBig", "wobble", "srm"], meet: ["srm", "fine", "wobble"] },
  U7c: { ...PART, id: "U7c", step: 3, name: "Too good to be true?", tabs: ["a"], keyUnit: "U6", calls: ["believe", "tooGoodC"],
         kinds: ["tooGood", "win", "tooGood", "flat", "win", "loss"], meet: ["tooGood", "win", "flat"] },
  U7d: { ...PART, id: "U7d", step: 4, name: "Steps 2 and 3 together", tabs: ["a", "h"], keyUnit: "U7", guided: true, calls: ["trustIt", "splitBad", "tooGoodC"],
         kinds: ["srm", "tooGood", "win", "wobble", "srmBig", "tooGood", "flat"], meet: ["win", "srm", "tooGood"], pass: [6, 7] },   // rep 1 is the guided walk: a clean case, so it runs every check
  U7e: { ...PART, id: "U7e", step: 5, name: "Did the goal change?", tabs: ["o", "a"], keyUnit: "U6", calls: ["sameGoal", "goalSwitched"],
         kinds: ["switched", "same", "switchedRev", "sameClick", "switched", "same"], meet: ["switched", "same", "switchedRev"] },
  U7f: { ...PART, id: "U7f", step: 6, name: "Health first, then the call", tabs: ["o", "a", "h"], keyUnit: "U7", guided: true, daily: true,
         calls: ["ship", "keepA", "running", "inconclusive", "distrust"],
         kinds: ["srm", "ship", "tooGood", "switched", "guardBreach", "running", "inconclusive", "lossGoal", "srm"], meet: ["ship", "srm", "tooGood"], pass: [7, 8] },
};
export const STEPS7 = Object.keys(UNITS7);
export const CALLS7 = [
  { id: "hAU", label: "Actual Units", stamp: "Actual Units" },
  { id: "hEU", label: "Expected Units", stamp: "Expected Units" },
  { id: "hAP", label: "Actual %", stamp: "Actual %" },
  { id: "hEP", label: "Expected %", stamp: "Expected %" },
  { id: "splitOk", label: "Split is fine", stamp: "Split fine" },
  { id: "splitBad", label: "Split is broken", stamp: "Broken split" },
  { id: "believe", label: "Believable", stamp: "Believable" },
  { id: "tooGoodC", label: "Too good: check it first", stamp: "Too good" },
  { id: "trustIt", label: "Trust it, read on", stamp: "Trusted" },
  { id: "sameGoal", label: "Same goal as the plan", stamp: "Same goal" },
  { id: "goalSwitched", label: "Goal changed: don't trust it", stamp: "Goal changed" },
];
export const CAUGHT7 = ["splitBad", "tooGoodC", "goalSwitched"];
// tabs a clean read needs: a broken split stops the read on Health, so the other tabs don't count against it
export const needTabs = (c, tabs) => UNITS7[c.unit] && c.srmP < SRM_ALARM ? tabs.filter((t) => t === "h") : tabs;

// a balance check with a chosen strength: z = how many standard errors the split is off 50/50
function setSplit(c, z) {
  const n = Math.round((c.units[0] + c.units[1]) / 2), d = Math.round(z * Math.sqrt(2 * n * 0.25));
  c.units = [n + d, n - d]; c.srmP = srmP(c.units[0], c.units[1]);
}
const splitTxt = (c) => { const n = c.units[0] + c.units[1]; return `${(c.units[0] / n * 100).toFixed(1)} / ${(c.units[1] / n * 100).toFixed(1)}`; };
const pTxt = (c) => c.srmP < 0.001 ? "below 0.001" : c.srmP.toFixed(3);
const between = (r, a, b) => a + r() * (b - a);

// cases for each health "kind": srm (engine's broken split), srmBig (a daily campaign: tiny gap, still broken),
// fine (even split), wobble (a flow with a gap you can see that's still chance), tooGood, win, flat, loss
function base(seed, kind, stage, today, surface) {
  const r = rng(seed ^ 0x2f6a), opts = surface ? { surface } : {};
  if (kind === "srm") return makeCase(seed, "srm", stage, "U7", today, opts);
  if (kind === "srmBig") { const c = makeCase(seed, "ship", stage, "U7", today, { surface: "campaign" }); setSplit(c, between(r, 3.9, 5.5) * (r() < 0.5 ? 1 : -1)); return c; }
  if (kind === "fine") { const c = makeCase(seed, r() < 0.5 ? "ship" : "inconclusive", stage, "U7", today, opts); setSplit(c, between(r, -0.8, 0.8)); return c; }
  if (kind === "wobble") { const c = makeCase(seed, "ship", stage, "U7", today, { surface: r() < 0.5 ? "welcome" : "post" }); setSplit(c, between(r, 1.4, 2.6) * (r() < 0.5 ? 1 : -1)); return c; }
  if (kind === "tooGood") return makeCase(seed, "tooGood", stage, "U7", today, { surface: surface || (r() < 0.6 ? "campaign" : "sms") });
  const k = { win: "ship", flat: "inconclusive", loss: "lossGoal" }[kind] || kind;
  return makeCase(seed, k, stage, "U7", today, opts);
}
const keepEven = (c, r) => { if (c.srmP < SRM_ALARM) setSplit(c, between(r, -0.8, 0.8)); };

const Q7a = {
  hAU: ["How many people actually landed in B?", "How many people did A actually get?"],
  hEU: ["How many people should each group have had?", "On a 50/50 plan, how many belonged in B?"],
  hAP: ["What share of everyone ended up in A?", "What share actually went to B?"],
  hEP: ["What split did the plan ask for?", "What share was B supposed to get?"],
};
const HEALTH_HINT = "Health tab, Experiment Balance Check: Actual Units is who each version really got, Expected Units is what a 50/50 plan should have given each, then the same as shares. The line under it is GrowthBook's verdict.";

export function makeHealth(seed, kind, stage, unit, today) {
  const U = UNITS7[unit], r = rng(seed ^ 0x51ed);
  if (unit === "U7f") return fullCall(seed, kind, stage, today);
  let c;
  if (unit === "U7a") {
    c = base(seed, r() < 0.3 ? "srm" : "fine", stage, today);
    const col = { hAU: "au", hEU: "eu", hAP: "ap", hEP: "ep" }[kind], n = c.units[0] + c.units[1];
    const q = Q7a[kind][Math.floor(r() * 2)], grpB = /B\b/.test(q);
    Object.assign(c, { ask: q, answer: kind, target: "th-" + col, hint: HEALTH_HINT,
      why: { hAU: `Actual Units: ${grpB ? "B" : "A"} got ${fmtN(c.units[grpB ? 1 : 0])} people.`, hEU: `Expected Units: ${fmtN(n / 2)} each, half of the ${fmtN(n)} who entered.`,
        hAP: `Actual %: ${(c.units[grpB ? 1 : 0] / n * 100).toFixed(1)}% went to ${grpB ? "B" : "A"}.`, hEP: "Expected %: the plan asked for 50% each." }[kind] });
  } else if (unit === "U7b") {
    c = base(seed, kind, stage, today);
    const bad = c.srmP < SRM_ALARM;
    Object.assign(c, { ask: "Can you trust how people were split?", answer: bad ? "splitBad" : "splitOk", target: "health", hideVerdict: stage >= 1, showRule: stage === 1,
      hint: "Look at the balance check's p-value. GrowthBook flags a sample ratio mismatch when it's below 0.001: a gap that big happens by chance less than once in 1,000 tests.",
      why: bad ? `Broken: ${splitTxt(c)} on a 50/50 plan, p-value ${pTxt(c)}. ${kind === "srmBig" ? "The gap looks tiny, but with this many people even a small gap can't be chance. " : ""}Something dropped people from one side, so the results can't be read until it's fixed.`
        : `Fine: ${splitTxt(c)}, p-value ${pTxt(c)}, well above 0.001. ${kind === "wobble" ? "The gap is easy to see because a flow has few people, and chance alone makes gaps like this. " : ""}Read the results as normal.` });
  } else if (unit === "U7c") {
    c = base(seed, kind, stage, today, r() < 0.6 ? "campaign" : "sms"); keepEven(c, r);
    const g = c.goalRows[0], hot = kind === "tooGood";
    Object.assign(c, { ask: "Theo wants to share this win. Is the lift believable?", answer: hot ? "tooGoodC" : "believe", target: "g0",
      hint: `One line for every test: real wins move the goal somewhere under 25%, most under 15. A goal up ${TOO_GOOD}% or more is almost always a tracking or setup bug, whatever the change. Check it before anyone celebrates.`,
      why: hot ? `${pctStr(g.pct)} on the goal is past the ${TOO_GOOD}% line. Look for a double-counted order event or a broken link first.`
        : `${pctStr(g.pct)} is under the ${TOO_GOOD}% line, a size real tests do move. Nothing here says the tracking broke, so read it as normal.` });
  } else if (unit === "U7d") {
    c = base(seed, kind, stage, today, kind === "tooGood" || kind === "win" || kind === "flat" ? (r() < 0.6 ? "campaign" : "sms") : null);
    if (kind === "tooGood" || kind === "win" || kind === "flat") keepEven(c, r);
    const bad = c.srmP < SRM_ALARM, hot = kind === "tooGood", g = c.goalRows[0];
    Object.assign(c, { ask: "Before anyone reads the result: can you trust it?", answer: bad ? "splitBad" : hot ? "tooGoodC" : "trustIt", target: bad ? "health" : "g0",
      hint: "Two checks, Health first. H: is the split broken (p-value below 0.001)? A: is the goal up 30% or more? Both clear: trust it and read on.",
      why: bad ? `Health first: ${splitTxt(c)}, p-value ${pTxt(c)}. The split is broken, so the ${pctStr(g.pct)} doesn't count yet.`
        : hot ? `The split is fine (p-value ${pTxt(c)}), but ${pctStr(g.pct)} on the goal is past the 30% line. Check the tracking first.`
        : `Split fine (p-value ${pTxt(c)}) and ${pctStr(g.pct)} is a believable size. Trust it and read the result.` });
    if (stage === 0) {
      c.guided = true;
      c.guide = [{ k: "health", name: "Health", tab: "h", look: "Does the balance check flag a mismatch (p-value below 0.001)?", bad: "splitBad", els: ["hbal"] },
                 { k: "good", name: "The lift", tab: "a", look: "Is the goal up 30% or more?", bad: "tooGoodC", els: ["g0"] }];
      c.gtarget = bad ? "health" : hot ? "good" : null;
      c.guideLast = "Both checks clear. Make the call.";
    }
  } else if (unit === "U7e") {
    const k = { switched: "switched", sameClick: "switched", same: r() < 0.5 ? "ship" : "inconclusive", switchedRev: "ship" }[kind];
    c = base(seed, k, stage, today); keepEven(c, r);
    if (kind === "sameClick") c.overview.goal = c.goalRows[0].name;            // the plan really did pick click rate
    if (kind === "switchedRev") c.overview.goal = "Click rate";               // planned on clicks, read on revenue
    const g = c.goalRows[0], changed = g.name !== c.overview.goal;
    Object.assign(c, { ask: "Is this test judged on the goal it was planned with?", answer: changed ? "goalSwitched" : "sameGoal", target: "goal-name",
      hint: "O: the Overview names the goal metric the plan picked before launch. A: the first row under Goal metrics is what the results judge. They have to match.",
      why: changed ? `The plan named ${c.overview.goal.toLowerCase()}. The results judge ${g.name.toLowerCase()}. Swapping the goal after launch lets a test pick whichever number won, so go back to the planned one.`
        : `The plan and the results both use ${g.name.toLowerCase()}. Same goal, so read it as normal.` });
  }
  return Object.assign(c, { unit, kind, stage, seed, screen: "experiment" });
}

// U7f: the whole page, Health first. The engine's U7 case and call; the first reps walk each check in order.
function fullCall(seed, kind, stage, today) {
  const c = makeCase(seed, kind, stage, "U7", today);
  c.unit = "U7f";
  c.hint = "Health first (H): a broken split means don't trust it. Then O against A: a changed goal, or a goal up 30% or more, means don't trust it. Then read it: before the read date keep running, a guardrail on the bad side keeps A, otherwise the goal's range decides.";
  if (stage === 0) {
    const g = c.goalRows[0];
    c.guided = true;
    c.guide = [
      { k: "health", name: "Health", tab: "h", look: "Does the balance check flag a mismatch?", bad: "distrust", els: ["hbal"] },
      { k: "goal", name: "The goal", tab: "o", look: "Is the plan's goal metric the one the results judge? (Check A after.)", bad: "distrust", els: ["ov-goal"] },
      { k: "good", name: "The lift", tab: "a", look: "Is the goal up 30% or more?", bad: "distrust", els: ["g0"] },
      { k: "date", name: "Read date", tab: "o", look: "The plan's read date, against today's day. Has it come?", bad: "running", els: ["ov-read", "day"] },
      { k: "guard", name: "Guardrails", tab: "a", look: "Is any guardrail's whole range on the bad side?", bad: "keepA", els: c.guardRows.map((_, i) => "u" + i) }];
    c.gtarget = c.srmP < SRM_ALARM ? "health" : g.name !== c.overview.goal ? "goal" : kind === "tooGood" ? "good" : c.answer === "running" ? "date" : c.answer === "keepA" && kind === "guardBreach" ? "guard" : null;
  }
  return c;
}

// lessons: short, each ends in a guess (predict), shown as the "New in this step" card and one link away in full
const bal = (a, b) => ({ health: [a, b] });
export const LESSONS7 = {
  U7a: [
    { h: "Health is where you check the split itself.",
      p: "A test promised a coin flip: half the people to A, half to B. The Health tab's Experiment Balance Check shows whether that happened. Actual Units is who each version really got. Expected Units is what the plan should have given each.",
      predict: { q: "160,456 went to A and 159,544 to B. What should each have had?", opts: ["160,000 each", "160,456 each"], answer: 0, reveal: "160,000 each: half of the 320,000 who entered. That's Expected Units." },
      vis: bal(160456, 159544) },
  ],
  U7b: [
    { h: "A gap you can see isn't the problem. The p-value says.",
      p: "Splits are never exactly 50/50, chance makes small gaps. GrowthBook works out how likely a gap that size is by chance. Below 0.001 (rarer than 1 in 1,000) it flags a sample ratio mismatch: something dropped people from one side, and the results can't be trusted.",
      predict: { q: "A welcome flow split 51.8 / 48.2 with a p-value of 0.03. Broken?", opts: ["Broken", "Fine"], answer: 1, reveal: "Fine. 0.03 is well above 0.001. Flows have few people, so gaps you can see happen by chance." },
      vis: bal(4655, 4325) },
    { h: "Big sends hide broken splits in tiny gaps.",
      p: "On a daily campaign with 320,000 people, 50.4 / 49.6 can already be far past chance. Read the p-value, not the look of the numbers.",
      predict: { q: "320,000 people, 50.4 / 49.6, p-value below 0.001. Broken?", opts: ["Broken", "Fine"], answer: 0, reveal: "Broken. With that many people, chance can't explain even a small gap." },
      vis: bal(161280, 158720) },
  ],
  U7c: [
    { h: "Some wins are too good to be true.",
      p: "A change that really works, creative or offer, campaign or flow, moves the goal somewhere under 25%, most often under 15. When a test claims 30% or more, the cause is almost always a bug: an order event counted twice, a broken link in A, a coupon leaking into B.",
      predict: { q: "Subject line test: revenue per recipient +41%. First move?", opts: ["Share the win", "Check the tracking"], answer: 1, reveal: "Check the tracking. Real creative wins that big are rare enough that a bug is the likelier story." },
      vis: { examples: [["fair", "Hero GIF vs static: +8.4%"], ["fair", "Short vs long copy: −1.2%"], ["fair", "Review stars: +17.9%"], ["bad", "Subject line: +41%"]], tags: { fair: "Believable", bad: "Check it" } } },
  ],
  U7d: [
    { h: "Two checks before you read: Health, then the size of the lift.",
      p: "H first: is the split broken? Then A: is the goal up 30% or more? Only when both are clear do you read the result.",
      vis: { checks: [["Health (H)", "p-value below 0.001: split is broken, stop."], ["The lift (A)", "Creative change claiming 30%+ on revenue: check it first."], ["Both clear", "Trust it and read on."]] } },
  ],
  U7e: [
    { h: "The goal is picked before launch.",
      p: "The Overview tab names the goal metric the plan chose. The Results tab's first goal row is what the test is judged on. If they differ, someone swapped the goal after launch, and a test that can pick its number after the fact will always find a winner.",
      vis: { live: { unit: "U7e", kind: "switched", seed: 3, tab: "a" }, mark: ["goal-name"] },
      predict: { q: "Overview: Revenue per recipient. Results goal row: Click rate. Trust the result?", opts: ["Yes, clicks are fine", "No, the goal changed"], answer: 1, reveal: "No. Go back to the planned goal, revenue per recipient, and read that." } },
  ],
  U7f: [
    { h: "The whole page, Health first.",
      p: "This is the call from Results step 6 with Health added in front. Every check that fails stops the read. If all are clear, the read date, the guardrails and the goal's range decide, as before.",
      vis: { checks: [["Health (H)", "Broken split: don't trust it."], ["The goal (O, A)", "Changed after launch: don't trust it."], ["The lift (A)", "Goal up 30% or more: don't trust it."], ["Read date (O)", "Not yet: keep running."], ["Guardrails (A)", "Whole range on the bad side: keep A."], ["The goal's range (A)", "Above zero ship, below keep A, across it stop, inconclusive."]] } },
  ],
};
