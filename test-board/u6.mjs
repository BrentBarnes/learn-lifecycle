// U6 Read one result, in parts: read the GrowthBook row, which side of zero the range sits, worth acting on, the read
// date, guardrails, then the full call on the copy of GrowthBook's experiment page (U6f, the old U6 drill, now guided at
// first), then the four-line write-up. Concepts R1-R3, R6, J1, J3, C1, D1 in research/v2/06-curriculum-map.md.
// Made-up people and numbers.
import { makeCase, pctStr, ctwStr, phi } from "./engine.mjs";

export const CALLS6 = [
  { id: "rBase", label: "Baseline", stamp: "Baseline" },
  { id: "rVar", label: "Variation", stamp: "Variation" },
  { id: "rCtw", label: "Chance to Win", stamp: "Chance to Win" },
  { id: "rCi", label: "CI graph", stamp: "CI graph" },
  { id: "rPct", label: "% Change", stamp: "% Change" },
  { id: "above", label: "Whole range above zero", stamp: "Above zero" },
  { id: "below", label: "Whole range below zero", stamp: "Below zero" },
  { id: "cross", label: "Crosses zero", stamp: "Crosses zero" },
  { id: "worthIt", label: "Real and worth acting on", stamp: "Worth it" },
  { id: "tooSmall", label: "Real but too small", stamp: "Too small" },
  { id: "cantTell", label: "Can't tell", stamp: "Can't tell" },
  { id: "readNow", label: "Read it now", stamp: "Read" },
  { id: "guardOk", label: "Guardrails held", stamp: "Held" },
  { id: "guardBad", label: "A guardrail broke", stamp: "Broke" },
  { id: "skipCheck", label: "Passed a blocked check", stamp: "Missed it" },
  { id: "writeOk", label: "Write-up right", stamp: "Written" },
  { id: "writeMiss", label: "Write-up has a wrong line", stamp: "Fix it" },
];

const PART = { screen: "scene", tabs: [], parent: "U6", daily: false, pass: [5, 6] };
export const UNITS6 = {
  U6a: { ...PART, id: "U6a", step: 1, name: "Read the row", calls: ["rBase", "rVar", "rCtw", "rCi", "rPct"],
         kinds: ["rPct", "rCtw", "rCi", "rBase", "rVar", "rCtw", "rCi"], meet: ["rPct", "rCtw", "rCi"] },
  U6b: { ...PART, id: "U6b", step: 2, name: "Which side of zero", calls: ["above", "below", "cross"],
         kinds: ["above", "cross", "below", "cross", "above", "cross"], meet: ["above", "cross", "below"] },
  U6c: { ...PART, id: "U6c", step: 3, name: "Worth acting on", calls: ["worthIt", "tooSmall", "cantTell"],
         kinds: ["worthIt", "tooSmall", "cantTell", "tooSmall", "worthIt", "cantTell"], meet: ["worthIt", "tooSmall", "cantTell"] },
  U6d: { ...PART, id: "U6d", step: 4, name: "Is it time to read?", calls: ["readNow", "running"],
         kinds: ["earlyWin", "due", "earlyFlat", "earlyWin", "due", "dueFlat"], meet: ["earlyWin", "due", "earlyFlat"] },
  U6e: { ...PART, id: "U6e", step: 5, name: "Did the guardrails hold?", calls: ["guardOk", "guardBad"],
         kinds: ["guardBad", "guardOk", "guardWobble", "guardBad", "guardWobble", "guardOk"], meet: ["guardBad", "guardWobble", "guardOk"] },
  U6f: { id: "U6f", parent: "U6", step: 6, name: "Make the call", screen: "experiment", tabs: ["o", "a"], keyUnit: "U6", daily: true, guided: true,
         calls: ["ship", "keepA", "running", "inconclusive"], kinds: ["ship", "lossGoal", "guardBreach", "running", "inconclusive"],
         meet: ["ship", "running", "guardBreach"], pass: [7, 8] },
  U6g: { ...PART, id: "U6g", step: 7, name: "Write it up", calls: ["writeOk", "writeMiss"],
         kinds: ["ship", "inconclusive", "lossGoal", "guardBreach", "ship", "inconclusive"], meet: ["ship", "inconclusive", "guardBreach"], daily: true },
};

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = (r, a) => a[Math.floor(r() * a.length)];
const between = (r, lo, hi) => lo + r() * (hi - lo);
const shuffle = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fmtN = (n) => Math.round(n).toLocaleString("en-US");
const lc = (t) => /^[A-Z](?![A-Z])/.test(t) ? t[0].toLowerCase() + t.slice(1) : t;   // keeps SMS, lowers "A bean"

// ---------- one GrowthBook results row from a chosen % change and a range half-width ----------
const GOALS = {
  campaign: { name: "Revenue per recipient", base: 2.4, money: true, n: 160000, label: "Daily campaign", test: "GIF hero vs static hero", planned: 7 },
  sms: { name: "Revenue per recipient", base: 1.2, money: true, n: 100000, label: "SMS", test: "Coffee emoji vs no emoji", planned: 5 },
  welcome: { name: "Orders per entrant", base: 0.023, money: false, n: 9000, label: "Welcome flow", test: "Founder story vs product grid", planned: 42 },
  cart: { name: "Orders per entrant", base: 0.033, money: false, n: 6000, label: "Abandoned cart flow", test: "Reviews block in cart email 1", planned: 28 },
};
export function row(name, base, money, n, pct, hw, better = "up") {
  const se = hw / 1.96, ctwUp = phi(pct / se);
  const b = base * (1 + pct / 100);
  const s = (v) => money ? "$" + v.toFixed(2) : (v * 100).toFixed(2) + "%";
  const sub = (v) => money ? "$" + fmtN(v * n) + " / " + fmtN(n) : fmtN(v * n) + " / " + fmtN(n);
  return { name, a: s(base), b: s(b), subA: sub(base), subB: sub(b), pct, lo: pct - hw, hi: pct + hw, ctw: better === "up" ? ctwUp : 1 - ctwUp, better };
}
const GUARDS = [["Unsubscribe rate", 0.0021], ["Spam complaint rate", 0.0008]];
const results = (goal, guards = [], worth, plain) => ({ results: { goal: [goal], guard: guards, worth, plain } });
const rangeTxt = (g) => `${pctStr(g.lo)} to ${pctStr(g.hi)}`;

export function makeU6(seed, kind, stage, U) {
  if (U.id === "U6f") return makeCase(seed, kind, stage, "U6f");
  const r = rng(seed);
  const sk = pick(r, Object.keys(GOALS)), G = GOALS[sk];
  const c = { screen: "scene", unit: U.id, kind, stage, seed, target: null, crumb: `Experiments / ${G.label} / ${G.test}` };
  const hw = sk === "campaign" || sk === "sms" ? between(r, 2.2, 4) : between(r, 6, 11);   // flows are smaller, so their ranges are wider

  if (U.id === "U6a") {
    const g = row(G.name, G.base, G.money, G.n, between(r, 2.5, 7), hw);
    const Q = { rPct: ["How much higher or lower is B than A, in percent?", "Theo asks: by how much did B beat A?"],
      rCtw: ["How sure is GrowthBook that B is better than A?", "Which column gives the chance that B is really the better one?"],
      rCi: ["Which column shows the range the true effect could be in?", "Where do you see whether the result could still be zero?"],
      rBase: ["What did group A get per person?", "Where is the old version's number?"], rVar: ["What did group B get per person?", "Where is the new version's number?"] };
    const WHY = { rPct: `% Change is B against A in percent: ${pctStr(g.pct)} here.`, rCtw: `Chance to Win is how likely B is better than A, from what came in: ${ctwStr(g.ctw)} here.`,
      rCi: `The CI graph draws the range the true effect plausibly sits in (${rangeTxt(g)}), with a dashed line at zero.`,
      rBase: `Baseline is A, the version you had: ${g.a}.`, rVar: `Variation is B, the new version: ${g.b}.` };
    Object.assign(c, { title: pick(r, Q[kind]), meta: "Which column of GrowthBook's results row answers it?", vis: results(g), answer: kind,
      target: { rPct: "th-pct", rCtw: "th-ctw", rCi: "th-ci", rBase: "th-a", rVar: "th-b" }[kind], why: WHY[kind],
      hint: "Left to right: the metric, Baseline (A), Variation (B), Chance to Win, the CI graph, % Change." });
    return c;
  }

  if (U.id === "U6b") {
    let pct;
    if (kind === "above") pct = hw + between(r, stage >= 2 ? 0.2 : 0.8, 3);
    else if (kind === "below") pct = -(hw + between(r, stage >= 2 ? 0.2 : 0.8, 3));
    else pct = (r() < 0.5 ? 1 : -1) * between(r, 0.2, hw - (stage >= 2 ? 0.3 : 0.9));
    const g = row(G.name, G.base, G.money, G.n, pct, hw);
    Object.assign(c, { title: G.name, meta: "Read the bar in the CI graph against the dashed zero line.", vis: results(g, [], 0, true), answer: kind, target: "g0",
      q: "Where does the range sit?",
      hint: "Look at the bar, not the dot. If the whole bar is right of the dashed zero line, B is ahead. Left of it, B is behind. Touching both sides, the test can't tell.",
      why: kind === "cross" ? `The range runs from ${pctStr(g.lo)} to ${pctStr(g.hi)}, so it includes zero. The middle dot leans ${g.pct > 0 ? "up" : "down"}, but the test can't tell B from A. That's not proof of no effect: the effect could be anywhere in the range.`
        : `The range runs from ${pctStr(g.lo)} to ${pctStr(g.hi)}. All of it is ${kind === "above" ? "above" : "below"} zero, so B is ${kind === "above" ? "ahead" : "behind"} by more than noise.` });
    return c;
  }

  if (U.id === "U6c") {
    const W = sk === "campaign" || sk === "sms" ? 2 : 5;      // the plan's "worth acting on" line
    let pct;
    if (kind === "worthIt") pct = Math.max(hw + between(r, 0.3, 1.5), W + between(r, 0.5, 2));
    else if (kind === "tooSmall") { const h2 = between(r, 0.15, 0.35) * W; pct = between(r, h2 + 0.15, W - h2 - 0.15); c._hw = h2; }
    else pct = between(r, -hw + 0.5, hw - 0.5);
    const g = row(G.name, G.base, G.money, kind === "tooSmall" ? G.n * 8 : G.n, pct, kind === "tooSmall" ? c._hw : hw);
    delete c._hw;
    Object.assign(c, { title: G.name, meta: `The plan says a lift under ${W}% isn't worth acting on (the dashed line at +${W}%).`, vis: results(g, [], W, true), answer: kind, target: "g0",
      q: "Is it real, and is it big enough to matter?",
      hint: `Two lines on the graph: zero and the worth-acting-on line at +${W}%. Whole bar above zero with the dot past the line: worth it. Whole bar above zero but entirely short of the line: real but too small. Bar touching zero: can't tell.`,
      why: kind === "worthIt" ? `The whole range (${rangeTxt(g)}) is above zero, and the dot sits at ${pctStr(g.pct)}, past the +${W}% line. Real and big enough to act on.`
        : kind === "tooSmall" ? `The whole range (${rangeTxt(g)}) is above zero, so B really is better. But all of it is under +${W}%, the smallest lift the plan said was worth the work. Real but too small. A huge send can make a tiny effect certain.`
        : `The range (${rangeTxt(g)}) includes zero, so the test can't tell. Whether it would be worth it doesn't come up yet.` });
    return c;
  }

  if (U.id === "U6d") {
    const flow = sk === "welcome" || sk === "cart", planned = G.planned;
    const early = kind.startsWith("early");
    const day = early ? (flow ? Math.round(planned * between(r, 0.25, 0.6)) : 1 + Math.floor(r() * (planned - 2))) : planned + Math.floor(r() * 3);
    const pct = kind === "earlyWin" ? hw + between(r, 1, 4) : kind === "earlyFlat" || kind === "dueFlat" ? between(r, -hw + 0.6, hw - 0.6) : hw + between(r, 0.5, 3);
    const g = row(G.name, G.base, G.money, Math.round(G.n * Math.min(1, day / planned)), pct, hw * (early ? 1.4 : 1));
    Object.assign(c, { title: `${G.test}: day ${day}`, meta: day === 1 ? "Started today." : `Started ${day - 1} day${day > 2 ? "s" : ""} ago.`, answer: early ? "running" : "readNow", target: "ov-read",
      vis: { pre: { plan: { goal: G.name, read: flow ? `Day ${planned}: ${planned / 7} weeks of entrants` : sk === "sms" ? `Day ${planned}, set in the plan` : `Day ${planned}: one send plus the 5-day attribution window`, day } }, ...results(g) },
      q: "Is it time to read the result?",
      hint: "Compare today's day with the read date in the plan. Before it, keep running, however good the numbers look.",
      why: early ? `It's day ${day}, and the plan reads on day ${planned}. ${flow ? "Entrants are still coming in." : "Orders keep arriving for days after a send."} ${g.ctw > 0.95 ? `Chance to win is ${ctwStr(g.ctw)} today, but a test checked every day and stopped on its first good day calls false winners far more often than 1 in 20. ` : ""}Keep running to the read date.`
        : `It's day ${day}, on or past the planned day ${planned}. The window has closed, so read it now.` });
    return c;
  }

  if (U.id === "U6e") {
    const goal = row(G.name, G.base, G.money, G.n, hw + between(r, 0.5, 3), hw);
    const ghw = between(r, 6, 10);
    const gr = GUARDS.map(([n, b], i) => {
      let p = between(r, -ghw + 1, ghw - 1);
      if (kind === "guardBad" && i === 0) p = ghw + between(r, stage >= 2 ? 0.5 : 2, 8);
      if (kind === "guardWobble" && i === 0) p = between(r, ghw * 0.5, ghw - 0.7);
      return row(n, b, false, G.n, p, ghw, "down");
    });
    Object.assign(c, { title: G.test, meta: "B won on the goal. Now check the guardrails, where lower is better.", vis: results(goal, gr, 0, true), answer: kind === "guardBad" ? "guardBad" : "guardOk",
      target: kind === "guardBad" ? "u0" : null, q: "Did every guardrail hold?",
      hint: "For a guardrail, up is bad. A guardrail breaks only when its whole bar sits right of zero. A dot that leans up with the bar still touching zero is noise.",
      why: kind === "guardBad" ? `Unsubscribe rate went from ${gr[0].a} to ${gr[0].b} (${pctStr(gr[0].pct)}), and its whole range (${rangeTxt(gr[0])}) is on the bad side. The guardrail vetoes the win: keep A and find out why.`
        : kind === "guardWobble" ? `Unsubscribe rate leans up (${pctStr(gr[0].pct)}), but its range (${rangeTxt(gr[0])}) still includes zero. That's noise, not a breach. The guardrails held.`
        : `Both guardrails moved within noise: their ranges include zero. They held.` });
    return c;
  }

  // U6g: the four-line write-up of a finished test
  return writeUp(seed, kind, stage, U);
}

// ---------- the four-line write-up (C1): hypothesis, result with its range, decision, next ----------
const DECIDE = { ship: "Ship B to everyone.", keepA: "Keep A. B lost.", guard: "Keep A: the guardrail vetoes B.", inconclusive: "Stop: inconclusive. Keep A, the simpler version.", running: "Keep running to the read date." };
export function writeUp(seed, kind, stage, U, fromCase) {
  const r = rng(seed ^ 0x77);
  const x = fromCase || makeCase(seed, kind, 2, "U6f");
  const g = x.goalRows[0], bad = x.guardRows.find((y) => y.ctw <= 0.05);
  const goal = g.name.toLowerCase(), W = x.type === "flow" ? 5 : 2, reason = lc(x.hypothesis).replace(/\.$/, "");
  const where = lc(x.surfaceLabel).replace(/ \(.*\)$/, ""), test = x.name.replace(/^(SMS|Post-purchase): /, "");
  const dec = bad ? "guard" : x.answer === "ship" ? "ship" : x.answer === "keepA" ? "keepA" : "inconclusive";
  const asPlanned = x.day === x.planned ? `read on day ${x.day} as planned` : `read on day ${x.day}, after the planned day ${x.planned}`;
  const early = Math.max(1, Math.round(x.planned * 0.4));   // a peeker's read day
  const res = `${g.name} ${pctStr(g.pct)} (range ${rangeTxt(g)}), chance to win ${ctwStr(g.ctw)}, ${asPlanned}.`;
  const parts = [
    { label: "Hypothesis", q: "Which line states the hypothesis the way it was planned?", opts: [
      [1, `If we test ${test} in the ${where}, ${goal} rises by at least ${W}%, because ${reason}.`],
      [0, stage === 0 ? `If we test ${test} in the ${where}, people will like it more and engage, because ${reason}.`
        : `If we test ${test} in the ${where}, ${x.type === "flow" ? "open rate per entrant" : "click rate per recipient"} rises by at least ${W}%, because ${reason}.`],
      [0, `${test[0].toUpperCase() + test.slice(1)} ${g.pct > 0 ? "raised" : "lowered"} ${goal} by ${Math.abs(g.pct).toFixed(1)}% in the ${where}, which shows that ${reason}.`]],
      why: `A hypothesis names the change, the metric the plan picked (${goal}), the smallest lift worth it and the reason, and it's written before the result.` },
    { label: "Result", q: "Which line reports the result?", opts: bad ? [
      [1, `${g.name} ${pctStr(g.pct)}, but ${bad.name.toLowerCase()} ${pctStr(bad.pct)} (range ${rangeTxt(bad)}, all on the bad side).`],
      [0, res],
      [0, `${g.name} ${pctStr(g.pct)}, and ${bad.name.toLowerCase()} moved ${pctStr(bad.pct)}, within noise, ${asPlanned}.`]] : [
      [1, res],
      dec === "inconclusive" ? [0, `${g.name} ${pctStr(g.pct)} with chance to win ${ctwStr(g.ctw)}, so B ${g.pct > 0 ? "beat" : "lost to"} A on the day ${x.day} read.`]
        : [0, `${g.name} ${pctStr(g.pct)} (range ${rangeTxt(g)}), chance to win ${ctwStr(g.ctw)}, read on day ${early} when it first ${g.pct > 0 ? "passed 95%" : "fell under 5%"}.`],
      [0, `Klaviyo credits B with ${g.pct > 0 ? "more" : "less"} attributed revenue than A, ${asPlanned}.`]],
      why: bad ? `The result has to include the guardrail that broke, with its range: ${bad.name.toLowerCase()}'s whole range is on the bad side, so it isn't noise.`
        : dec === "inconclusive" ? "The range includes zero, so B neither beat nor lost to A. The result gives the range and says it was read on the planned day."
        : `The result gives the deciding metric with its range and chance to win, read on the planned day ${x.planned}. Reading on the first good day is peeking, and attributed revenue isn't what the test measured.` },
    { label: "Decision", q: "Which decision follows?", opts: [[1, DECIDE[dec]], ...shuffle(Object.keys(DECIDE).filter((k) => k !== dec && !(dec === "guard" && k === "keepA") && !(dec === "keepA" && k === "guard")), r).slice(0, 2).map((k) => [0, DECIDE[k]])],
      why: { ship: "The whole range is above zero and the guardrails held: ship.", keepA: "The whole range is below zero: B lost.", guard: "A guardrail's whole range is on the bad side: it vetoes the win.", inconclusive: "At the read date the range still includes zero: stop and keep the simpler version." }[dec] },
    { label: "Next", q: "Which next step fits?", opts: [
      [1, { ship: `Make it the default and try the same idea on another surface next.`, keepA: `Note what B taught us and try a different idea in the ${where}.`,
            guard: `Find out why ${bad ? bad.name.toLowerCase() : "the guardrail"} rose before trying this again.`, inconclusive: `Keep A, and only retest with a bigger change or more people.` }[dec]],
      ...{ ship: [`Leave it running two more weeks to be extra sure before shipping.`, `Ship B in every flow and campaign this week, since it won here.`],
           keepA: [`Rerun the same test next month in case this was an off week.`, `Try B on just the most engaged segment, where it might still win.`],
           guard: [`Ship B and keep an eye on ${bad ? bad.name.toLowerCase() : "the guardrail"} for a month.`, `Rerun it without that guardrail, since the goal metric won.`],
           inconclusive: [`Run it two more weeks until the range clears zero.`, g.pct > 0 ? `Ship B, since the middle of the range leaned up.` : `Find the segment where B did win, and ship it there.`] }[dec].map((t) => [0, t])],
      why: { ship: "Build on the win: make it the default, then test the idea where it hasn't been proven. Running past the read date or shipping it everywhere untested both skip the plan.",
             keepA: "Learn from the loss and move on to a new idea. Rerunning the same test, or hunting for a segment where B wins, is fishing for a different answer.",
             guard: "A veto means find the cause first. Shipping anyway, or dropping the guardrail after the fact, undoes the rule agreed before launch.",
             inconclusive: "At the read date it's over. Running longer until it clears zero, or shipping on a lean, is fishing. Retest only with a bigger change or more people." }[dec] },
  ].map((p) => ({ ...p, opts: shuffle(p.opts.map(([ok, t]) => ({ ok: !!ok, t })), r) }));
  const full = parts.map((p) => `<b>${p.label}.</b> ${p.opts.find((o) => o.ok).t}`).join("<br>");
  return { screen: "scene", unit: U.id, kind, stage, seed, crumb: `Experiments / ${x.surfaceLabel} / ${x.name}`, title: `Write up: ${x.name}`,
    meta: `Finished on day ${x.day}. The plan read on day ${x.planned}. Pick each line of the write-up.`,
    vis: { pre: { plan: { goal: x.goalRows[0].name, read: x.plan, day: x.day, hyp: x.hypothesis } }, ...results(g, x.guardRows) },
    parts, answer: "writeOk", target: null, from: x,
    hint: "Four lines in order: the hypothesis as planned (change, metric, size, reason), the result with its range, the decision, then what's next.",
    why: full };
}

// ---------- lessons ----------
const L_G = row("Revenue per recipient", 2.4, true, 160000, 4.2, 3.1);
export const LESSONS6 = {
  U6a: [
    { h: "GrowthBook puts a test's result on one row.",
      p: "A is the version you had (Baseline). B is the new one (Variation). Then how sure GrowthBook is that B is better, the range the true effect could be in, and the difference in percent.",
      predict: { q: "Which column says how sure GrowthBook is that B is better?", opts: ["Chance to Win", "% Change"], answer: 0,
        reveal: "Chance to Win: 99.6% here. % Change is how big the difference looks, +4.2%. Big and sure are different questions." },
      vis: results(L_G) },
  ],
  U6b: [
    { h: "The same email twice still comes out different.",
      p: "Send one email to both halves of the list, an A/A test. A and B are identical, yet one half earns a bit more by chance. That chance wobble is <b>noise</b>, and the range on the CI graph is how big the noise could be.",
      predict: { q: "Will both halves earn exactly the same per recipient?", opts: ["Yes", "No, a little apart"], answer: 1,
        reveal: "A little apart. The range is drawn around the result to show how far chance alone could push it. More people make it narrower." },
      vis: results(row("Revenue per recipient", 2.4, true, 160000, 0.9, 3.2), [], 0, true) },
    { h: "Read the bar against zero.",
      p: "Whole bar above zero: B is ahead by more than noise. Whole bar below: B is behind. Bar touching zero: the test can't tell. Can't tell isn't the same as no effect: the true effect could be anywhere on the bar. GrowthBook colors a bar green or red once it clears zero. In these steps the bars stay gray, so you read where they sit.",
      vis: { tags: { fair: "Clear", bad: "Can't tell" }, examples: [["fair", "+1.2% to +7.4%"], ["fair", "−6.9% to −0.8%"], ["bad", "−2.1% to +4.3%"]] } },
  ],
  U6c: [
    { h: "Real isn't the same as worth it.",
      p: "Before the test, the plan sets the smallest lift worth acting on, say +2%. With 1.3 million people per side, a +0.4% lift can be certain and still not pay for the work.",
      predict: { q: "The range is +0.2% to +0.7%, the line is +2%. Worth acting on?", opts: ["Yes, it's real", "No, too small"], answer: 1,
        reveal: "Too small. B really is better, but by less than the plan said matters. Statisticians call this the difference between significant and <b>practically significant</b>." },
      vis: results(row("Revenue per recipient", 2.4, true, 1300000, 0.45, 0.25), [], 2, true) },
  ],
  U6d: [
    { h: "Read on the planned day, not the first good day.",
      p: "A campaign's orders keep arriving for days after the send, and a flow keeps getting new entrants. GrowthBook updates as data comes in, so on day 2 the numbers can look great by chance.",
      predict: { q: "Check every day and stop the first time chance to win passes 95%. How often do you call a false winner?", opts: ["About 1 in 20", "Far more often"], answer: 1,
        reveal: "Far more often. Every look is another chance for noise to cross the line. This is called <b>peeking</b>. Read once, on the date the plan set." },
      vis: { plan: { goal: "Revenue per recipient", read: "Day 7: one send plus the 5-day attribution window", day: 3 } } },
  ],
  U6e: [
    { h: "A guardrail can veto a win.",
      p: "Guardrails are the harm metrics set before launch: unsubscribes, spam complaints, SMS opt-outs. For them, up is bad.",
      predict: { q: "Revenue is up, and unsubscribes are up with their whole range above zero. Ship?", opts: ["Ship B", "Keep A"], answer: 1,
        reveal: "Keep A. A win that drives people off the list costs every future send. The veto was agreed before the result came in, so nobody argues it after." },
      vis: results(L_G, [row("Unsubscribe rate", 0.0021, false, 160000, 14, 8, "down"), row("Spam complaint rate", 0.0008, false, 160000, 2, 9, "down")]) },
  ],
  U6f: [
    { h: "Now the whole call, on GrowthBook's experiment page.",
      p: "O opens the plan, A the numbers. Three checks in order: has the read date come, did every guardrail hold, then which side of zero the goal's range sits. The first few walk you through it.",
      vis: { checks: [["Read date", "Before it: keep running."], ["Guardrails", "Whole range on the bad side: keep A."], ["The goal", "Above zero: ship. Below: keep A. Crosses zero at the read date: inconclusive."]] } },
  ],
  U6g: [
    { h: "Every finished test gets four lines.",
      p: "Hypothesis, the result with its range, the decision, and what's next. Written so someone who wasn't there can act on it, and so next year's team doesn't rerun it.",
      vis: { checks: [["Hypothesis", "If we change X for Y, metric Z rises by at least W, because R. Written before the test."], ["Result", "The deciding metric with its range and chance to win, read on the planned day."], ["Decision", "Ship, keep A, or inconclusive."], ["Next", "What follows from it."]] } },
  ],
  MS1: [
    { h: "Four Mondays on the daily campaign.",
      p: "Each Monday the inbox holds five things: a teammate's plan or setup to check, two finished tests to call on GrowthBook's page, the write-up for one of them, and a new card to place on the board. A test you call \"keep running\" comes back the next Monday at its read date. No hints and no guided walks this time: this is the job.",
      vis: { checks: [["To pass", "17 of 20 right, and every write-up right."], ["Stop any time", "The run is saved. Continue it from your path."]] } },
  ],
};
