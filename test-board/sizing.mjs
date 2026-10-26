// v3 phase 4: Sizing, on a copy of GrowthBook's Power Calculator (CURRICULUM.md unit 4). Four steps in U6's style:
// read how many weeks a test needs, read the smallest lift a slot can see, decide whether it's worth testing, then size
// a card and place it on the board. The quarter uses the same math to set each card's length (quarter.mjs).
//
// The math is GrowthBook's: relative standard error of B against A after w weeks, 80% power at 95% significance
// (z 1.96 + 0.84 = 2.8). Traffic and baselines are the engine's made-up world (campaign revenue per recipient uses the
// engine's capped-revenue noise, Level 5's model). Pure, so tests run it in node.

import { rng, phi, makeU2, earliestStart, UNITS, BOARD_ROWS, BOARD_WEEKS } from "./engine.mjs";

export const WEEKS = 8;                                     // columns in the Power Over Time table
export const TRAFFIC = {
  campaign: { label: "Daily campaign", pop: "Tuesday test pool", perWeek: 160000, unit: "recipients", metric: "Revenue per recipient", base: "$2.40", kind: "rpr", p: 0.02, max: 4, row: 0 },
  sms: { label: "SMS", pop: "Thursday send", perWeek: 100000, unit: "recipients", metric: "Revenue per recipient", base: "$1.20", kind: "rpr", p: 0.01, max: 4, row: 1 },
  welcome: { label: "Welcome flow", pop: "Welcome flow entrants", perWeek: 1500, unit: "entrants", metric: "Orders per entrant", base: "2.3%", kind: "rate", p: 0.023, max: 8, row: 2 },
  cart: { label: "Abandoned cart flow", pop: "Cart flow entrants", perWeek: 1500, unit: "entrants", metric: "Orders per entrant", base: "3.3%", kind: "rate", p: 0.033, max: 8, row: 3 },
  post: { label: "Post-purchase flow (bean buyers)", pop: "Post-purchase entrants", perWeek: 750, unit: "entrants", metric: "Orders per entrant", base: "8.0%", kind: "rate", p: 0.08, max: 8, row: 4 },
  // not a board row: a small flow, so Worth testing? has cases no test can answer
  winback: { label: "Winback flow", pop: "Winback entrants", perWeek: 400, unit: "entrants", metric: "Orders per entrant", base: "4.0%", kind: "rate", p: 0.04, max: 8, row: null },
};
export const SURF = Object.keys(TRAFFIC);
export const ROW_SURF = SURF.filter((s) => TRAFFIC[s].row != null);
// the line between "test a bolder change" and "don't test": the same 25% as Marketing QA's roadmap chip, and under the
// 30% too-good line, so a change that could show up is still one real tests do make
export const BOLD_MAX = 0.25;
// relative standard error after w weeks (people per version = perWeek x w)
export const se = (s, w) => seN(s, TRAFFIC[s].perWeek * w);
// the same for any number of people per version (the sliders change the traffic)
export function seN(s, n) {
  const T = TRAFFIC[s];
  return T.kind === "rpr" ? Math.sqrt(2 * (1.25 / T.p - 1) / n) : Math.sqrt(2 * (1 - T.p) / (T.p * n));
}
export const power = (s, lift, w) => phi(Math.abs(lift) / se(s, w) - 1.96);
export const mdeAt = (s, w) => 2.8 * se(s, w);               // smallest lift seen with 80% power after w weeks
export function weeksNeeded(s, lift, max = 52) { for (let w = 1; w <= max; w++) if (power(s, lift, w) >= 0.8) return w; return null; }
// a case is readable when the 80% line isn't a coin toss between two columns
const clear = (s, lift, w) => power(s, lift, w) >= 0.82 && (w === 1 || power(s, lift, w - 1) <= 0.76);
const pctS = (x) => (x * 100).toFixed(x < 0.1 ? 1 : 0) + "%";

const IDEA = { campaign: ["Hero: GIF vs static", "Subject: question vs statement", "Product grid: 4 vs 6 coffees", "Review stars under each product"],
  sms: ["SMS: emoji vs no emoji", "SMS: bundle builder link vs beans page", "SMS: first name in the opener"],
  welcome: ["Welcome 1: founder story vs product grid", "Welcome 2: bundle builder block"], cart: ["Cart 1: reviews block", "Cart 2: brew guide"],
  post: ["Post-purchase: care guide vs product block", "Post-purchase: gear cross-sell"], winback: ["Winback: last-chance code vs no code", "Winback: new arrivals block"] };
const LIFTS = { campaign: [0.03, 0.04, 0.05, 0.06, 0.08, 0.1], sms: [0.06, 0.08, 0.1, 0.12, 0.15, 0.2], welcome: [0.2, 0.25, 0.3, 0.35, 0.4, 0.5],
  cart: [0.15, 0.2, 0.25, 0.3, 0.4], post: [0.15, 0.2, 0.25, 0.3, 0.4], winback: [0.15, 0.2, 0.25] };
const pick = (r, a) => a[Math.floor(r() * a.length)];

const PART = { screen: "calc", parent: "U9", daily: false, pass: [5, 6], tabs: [], keyUnit: "U9" };
export const UNITS9 = {
  U9a: { ...PART, id: "U9a", step: 1, name: "How many weeks?", calls: [], kinds: ["campaign", "welcome", "sms", "cart", "post", "campaign", "welcome"], meet: ["campaign", "welcome", "sms"] },
  U9b: { ...PART, id: "U9b", step: 2, name: "What can it see?", calls: [], kinds: ["welcome", "campaign", "post", "sms", "cart", "welcome"], meet: ["welcome", "campaign", "post"] },
  U9s: { ...PART, id: "U9s", step: 3, name: "Move the sliders", calls: ["slOk", "slNo"], daily: true, screen: "sliders",
         kinds: ["weeks", "lift", "traffic", "power", "weeks", "traffic", "lift", "power"], meet: ["weeks", "lift", "traffic"], pass: [6, 7] },
  U9c: { ...PART, id: "U9c", step: 4, name: "Worth testing?", calls: ["runIt", "bolder", "skipIt"], daily: true, kinds: ["run", "bolder", "skip", "run", "bolder", "skip", "run"], meet: ["run", "skip", "bolder"], pass: [6, 7] },
  U9d: { ...PART, id: "U9d", step: 5, name: "Size it, then place it", screen: "board", calls: [], daily: true, kinds: ["place", "place", "place"], meet: ["place", "place", "place"] },
};
export const STEPS9 = Object.keys(UNITS9);
export const CALLS9 = [
  { id: "runIt", label: "Run it as planned", stamp: "Run it" },
  { id: "bolder", label: "Test a bolder change", stamp: "Bolder" },
  { id: "skipIt", label: "Don't test it: just decide", stamp: "Don't test" },
  { id: "slOk", label: "Right setting", stamp: "Right setting" },
  { id: "slNo", label: "Not that setting", stamp: "Not that setting" },
];

// the calculator's numbers for one surface and expected lift
export function calc(s, lift) {
  const pw = Array.from({ length: WEEKS }, (_, i) => power(s, lift, i + 1)), md = Array.from({ length: WEEKS }, (_, i) => mdeAt(s, i + 1));
  return { s, lift, pw, md, need: weeksNeeded(s, lift), T: TRAFFIC[s] };
}
// five answer options from a list of values, a window that holds the answer at a random place
function window5(r, n, ai) {
  const lo = Math.max(0, ai - 4), hi = Math.min(ai, n - 5), s = lo + Math.floor(r() * (hi - lo + 1));
  return [s, s + 5];
}

export function makeSizing(seed, kind, stage, unit) {
  const r = rng(seed ^ 0x51a7);
  for (let tries = 0; tries < 500; tries++) {
    if (unit === "U9s") { const c = makeSliders(r, kind, stage, unit, seed); if (c) return c; continue; }
    if (unit === "U9a") {
      const s = kind, lift = pick(r, LIFTS[s]), k = calc(s, lift), need = k.need;
      if (need && need <= WEEKS && !clear(s, lift, need)) continue;
      if (stage === 0 && (!need || need > WEEKS)) continue;
      const ai = !need || need > WEEKS ? WEEKS : need - 1, vals = [...Array(WEEKS).keys()].map((i) => i + 1).concat(["more"]);
      const [a, b] = window5(r, vals.length, ai);
      const opts = vals.slice(a, b).map((v) => ["w" + v, v === "more" ? `More than ${WEEKS} weeks` : `${v} week${v > 1 ? "s" : ""}`]);
      return { screen: "calc", unit, kind, stage, seed, ...k, idea: pick(r, IDEA[s]), show: ["pw"], hideSummary: stage >= 1,
        ask: `Theo asks how long ${k.T.label.toLowerCase()} tests need to see a ${pctS(lift)} lift. How many weeks?`, opts, answer: "w" + (ai === WEEKS ? "more" : need),
        target: need && need <= WEEKS ? "pw-" + need : "pw-row",
        hint: "Power Over Time: the chance the test shows a real lift of the size you entered, week by week. The test needs the first week at 80% or more. GrowthBook marks that week and writes it in the summary.",
        why: need && need <= WEEKS ? `Week ${need} is the first at 80% or more (${pctS(k.pw[need - 1])}). Before that, a real ${pctS(lift)} lift is missed too often.`
          : `Even week ${WEEKS} only reaches ${pctS(k.pw[WEEKS - 1])}. A ${pctS(lift)} lift needs ${k.need ? k.need + " weeks" : "more than a year"} on ${k.T.perWeek.toLocaleString("en-US")} ${k.T.unit} a version a week.` };
    }
    if (unit === "U9b") {
      const s = kind, slot = 1 + Math.floor(r() * WEEKS), k = calc(s, pick(r, LIFTS[s]));
      const [a, b] = window5(r, WEEKS, slot - 1);
      const opts = k.md.slice(a, b).map((m, i) => ["m" + (a + i + 1), pctS(m)]);
      if (new Set(opts.map((o) => o[1])).size < 5) continue;
      return { screen: "calc", unit, kind, stage, seed, ...k, idea: pick(r, IDEA[s]), show: ["md"], room: slot,
        ask: `The board has room for ${slot} week${slot > 1 ? "s" : ""} on ${k.T.label}. What's the smallest lift a test there can see?`, opts, answer: "m" + slot, target: "md-" + slot,
        hint: "Minimum Detectable Effect Over Time: the smallest lift the test can see with 80% power, week by week. Fewer weeks means fewer people, so only bigger lifts show up.",
        why: `Week ${slot}: ${pctS(k.md[slot - 1])}. A real lift smaller than that would usually come back inconclusive in ${slot} week${slot > 1 ? "s" : ""}.` };
    }
    if (unit === "U9c") {
      const s = pick(r, SURF), lift = pick(r, LIFTS[s]), T = TRAFFIC[s], k = calc(s, lift), m = mdeAt(s, T.max);
      const need = weeksNeeded(s, lift);
      const ans = need <= T.max ? "runIt" : m < BOLD_MAX ? "bolder" : "skipIt";
      if ({ run: "runIt", bolder: "bolder", skip: "skipIt" }[kind] !== ans) continue;
      if (Math.abs(m - BOLD_MAX) < 0.025 || (need <= T.max && !clear(s, lift, need)) || need === T.max + 1) continue;
      return { screen: "calc", unit, kind, stage, seed, ...k, idea: pick(r, IDEA[s]), show: ["pw", "md"], max: T.max, answer: ans, target: ans === "runIt" ? "pw-" + need : "md-" + T.max,
        ask: `Priya says a ${pctS(lift)} lift would pay for the work. The longest this can run is ${T.max} weeks. Your call?`,
        hint: `Two looks. Power Over Time: does it reach 80% within ${T.max} weeks? Then run it. If not, Minimum Detectable Effect at week ${T.max}: under 25%, test a bolder change big enough to show. 25% or more, a change that big is rare (and 30% is too good to be true), so don't test it: decide on judgment.`,
        why: ans === "runIt" ? `It reaches 80% at week ${need}, inside the ${T.max} weeks it has. Run it.`
          : ans === "bolder" ? `A ${pctS(lift)} lift needs ${need} weeks, more than the ${T.max} it has. In ${T.max} weeks it can see ${pctS(m)}. A bolder change, one that could move that much, is testable.`
          : `In ${T.max} weeks the smallest lift it can see is ${pctS(m)}. Real changes rarely move that much, so the test would almost surely come back inconclusive. Decide on judgment, or pool it with more traffic.` };
    }
    if (unit === "U9d") {
      const s = pick(r, ROW_SURF), lift = pick(r, LIFTS[s]), need = weeksNeeded(s, lift);
      if (!need || need < 2 || need > 5 || !clear(s, lift, need)) continue;
      const T = TRAFFIC[s];
      let c;
      try { c = makeU2((r() * 2 ** 31) | 0, "place", 2, { ...UNITS.U2g, row: T.row }); } catch (e) { continue; }
      c.card.len = need;
      const e = earliestStart(c.card, c.cards, 0), e1 = earliestStart({ ...c.card, len: 1 }, c.cards, 0);
      if (e < 1 || e1 === e) continue;                       // the length has to matter: a one-week card would fit earlier
      if (e > 4 && r() < 0.65) continue;                     // not always "after the freeze": keep the before-freeze answers in play
      const k = calc(s, lift);
      return Object.assign(c, { unit, kind, stage, seed, calc: k, idea: c.card.name, answer: "w" + e, target: null,
        hint: `Read the calculator first: the first week at 80% power is how long the card runs. Then slide it along its row and drop it in the first week where all of it fits: its row free, no other offer if it's an offer, out of the freeze.`,
        why: `The calculator says ${need} weeks for a ${pctS(lift)} lift (${pctS(k.pw[need - 1])} at week ${need}). A ${need}-week card first fits the week of ${BOARD_WEEKS[e]}.${e1 < e ? ` A one-week card would fit ${BOARD_WEEKS[e1]}, but this test can't be read in a week.` : ""}` });
    }
  }
  throw new Error(`no ${unit} ${kind} case for seed ${seed}`);
}

// ----- U9s Move the sliders: the calculator's inputs as sliders, its two tables as live charts -----
// Each rep opens one slider (the power rep opens Power and Weeks) and asks for a setting; the charts answer as it moves.
export const SW = 12;                                          // weeks on the slider and the charts
export const TRAFFIC_X = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];   // traffic slider: times the surface's people per version a week
export const POWERS = [0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95];
export const liftGrid = (s) => TRAFFIC[s].kind === "rpr" ? Array.from({ length: 39 }, (_, i) => +(0.01 + i * 0.005).toFixed(3)) : Array.from({ length: 56 }, (_, i) => +(0.05 + i * 0.01).toFixed(2));
export function zOf(p) { let lo = -6, hi = 6; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (phi(m) < p) lo = m; else hi = m; } return (lo + hi) / 2; }
// st = { s, t (index into TRAFFIC_X), w, lift, pow }
export const perWeekOf = (st) => Math.round(TRAFFIC[st.s].perWeek * TRAFFIC_X[st.t]);
export const powerSt = (st, w = st.w) => phi(st.lift / seN(st.s, perWeekOf(st) * w) - 1.96);
export const mdeSt = (st, w = st.w) => (1.96 + zOf(st.pow)) * seN(st.s, perWeekOf(st) * w);
export function needSt(st) { for (let w = 1; w <= SW; w++) if (powerSt(st, w) >= st.pow - 1e-9) return w; return null; }
// the setting each kind asks for
export function sliderAnswer(c) {
  const st = { ...c.start };
  if (c.kind === "weeks") return { w: needSt(st) };
  if (c.kind === "power") return { pow: c.goalPow, w: needSt({ ...st, pow: c.goalPow }) };
  if (c.kind === "traffic") { for (let t = 0; t < TRAFFIC_X.length; t++) if (powerSt({ ...st, t }) >= st.pow - 1e-9) return { t }; return null; }
  if (c.kind === "lift") { const g = liftGrid(st.s); for (const lift of g) if (powerSt({ ...st, lift }) >= st.pow - 1e-9) return { lift }; return null; }
}
export const sliderRight = (c, st) => Object.entries(c.want).every(([k, v]) => Math.abs(st[k] - v) < 1e-9);
export const LIFTS_OF = (s) => LIFTS[s][Math.floor(LIFTS[s].length / 2)];   // the playground's starting lift
const SL_SURF = ["welcome", "cart", "post", "sms", "campaign"];
function makeSliders(r, kind, stage, unit, seed) {
  const s = pick(r, SL_SURF), T = TRAFFIC[s], g = liftGrid(s), lift0 = pick(r, LIFTS[s]);
  const base = { s, t: 3, w: 1, lift: lift0, pow: 0.8 };
  let start, open, ask, goalPow = null;
  const n0 = needSt(base);
  if (kind === "weeks") {
    if (!n0 || n0 < 2 || n0 > SW - 1) return null;
    start = base; open = ["w"];
    ask = `Priya expects a ${pctS(lift0)} lift. Set Weeks to the fewest that give 80% power.`;
  } else if (kind === "power") {
    goalPow = pick(r, [0.9, 0.9, 0.95, 0.7]);
    if (!n0) return null;
    const nG = needSt({ ...base, pow: goalPow });
    if (!nG || nG === n0 || nG > SW) return null;
    start = { ...base, w: n0 }; open = ["pow", "w"];
    ask = goalPow > 0.8 ? `This ${pctS(lift0)} test is sized at 80% power. Theo wants ${pctS(goalPow)}: fewer real wins missed. Set Power to ${pctS(goalPow)}, then Weeks to the fewest that reach it.`
      : `This ${pctS(lift0)} test is sized at 80% power. Priya will accept ${pctS(goalPow)} to start sooner. Set Power to ${pctS(goalPow)}, then Weeks to the fewest that reach it.`;
  } else if (kind === "traffic") {
    const w = pick(r, [2, 3, 4, 6]);
    start = { ...base, w }; open = ["t"];
    ask = `The board has ${w} weeks for a ${pctS(lift0)} lift. Traffic stands for the audience: pool in more segments, or hold some back for another test. Set Traffic to the least that still gives 80% power.`;
  } else {
    const w = pick(r, [2, 3, 4, 6, 8]);
    start = { ...base, w, lift: g[g.length - 1] }; open = ["lift"];
    ask = `The board has ${w} weeks. Drag Expected lift down to the smallest lift the test still sees at 80% power.`;
  }
  const c = { screen: "sliders", unit, kind, stage, seed, s, T, idea: pick(r, IDEA[s]), start, open, goalPow, answer: "slOk", ask };
  const want = sliderAnswer(c);
  if (!want || Object.values(want).some((v) => v == null)) return null;
  if (kind === "traffic" && (want.t === 3 || want.t === 0 && powerSt({ ...start, t: 0 }) > 0.95)) return null;   // the answer has to move the slider, and not sit pinned at the bottom
  if (kind === "lift" && (want.lift <= g[0] || want.lift >= g[g.length - 1])) return null;
  c.want = want;
  const at = { ...start, ...want }, pw = powerSt(at);
  if (kind === "weeks") Object.assign(c, { target: "sl-w",
    hint: "Move Weeks and watch the left chart: the dot climbs the Power Over Time line. Stop at the first week on or above the dashed 80% line.",
    why: `Week ${want.w} is the first at 80% or more (${pctS(pw)}).${want.w > 1 ? ` Week ${want.w - 1} has ${pctS(powerSt(at, want.w - 1))}: a real ${pctS(lift0)} lift would be missed too often.` : ""} On the right chart, the same week is where the smallest visible lift drops under ${pctS(lift0)}.` });
  if (kind === "power") Object.assign(c, { target: "sl-pow",
    hint: "Set Power first: the dashed line on the left chart moves. Then move Weeks to the first week on or above it.",
    why: goalPow > 0.8 ? `At ${pctS(goalPow)} power it needs ${want.w} weeks, ${want.w - n0} more than at 80%. Missing fewer real wins costs people, so it costs weeks.`
      : `At ${pctS(goalPow)} power it needs ${want.w} weeks, ${n0 - want.w} fewer than at 80%. The price: about ${Math.round((1 - goalPow) * 10)} real wins in 10 come back inconclusive.` });
  if (kind === "traffic") { const tw = perWeekOf(at), below = want.t > 0 ? powerSt({ ...at, t: want.t - 1 }) : null;
    Object.assign(c, { target: "sl-t",
      hint: "Move Traffic and watch the dot at the chosen week on the left chart. The least traffic is the first setting where the dot sits on or above the 80% line.",
      why: `${tw.toLocaleString("en-US")} ${T.unit} a version a week gives ${pctS(pw)} power at week ${start.w}.${below != null ? ` One step less gives ${pctS(below)}.` : ""} Twice the people a week does what twice the weeks does.` }); }
  if (kind === "lift") Object.assign(c, { target: "sl-lift",
    hint: "Drag Expected lift down while the left chart's dot stays on or above 80%. The last lift that holds 80% is the smallest the test can see: its MDE.",
    why: `${pctS(want.lift)} at week ${start.w}: power ${pctS(pw)}. Any smaller lift drops under 80%. That's the Minimum Detectable Effect: GrowthBook's MDE table shows ${(mdeAt(s, start.w) * 100).toFixed(1)}% for week ${start.w}${pctS(want.lift) !== pctS(mdeAt(s, start.w)) ? `, and ${pctS(want.lift)} is the first slider step at or above it` : ""}.` });
  return c;
}

export const LESSONS9 = {
  U9a: [
    { h: "Size a test before it runs: how many weeks to see the lift you care about?",
      p: "GrowthBook's Power Calculator takes the people you get each week, the goal metric's baseline, and the lift you want to be able to see. Power Over Time shows, week by week, the chance the test catches a real lift that size. The standard target is 80%: the first week at 80% or more is how long it runs.",
      vis: { calcVis: { s: "cart", lift: 0.25, show: ["pw"], summary: true }, mark: ["pw-5"] },
      predict: { q: "Week 2: 61%. Week 3: 79%. Week 4: 88%. How long does it run?", opts: ["3 weeks", "4 weeks"], answer: 1, reveal: "4 weeks. Week 3 is just short, and a test at 79% misses a real lift about 1 time in 5." } },
    { h: "Traffic sets the length. Each surface has its own.",
      p: "The calculator's Population line is the people a surface sends through each week. The daily campaign puts 160,000 people per version through every week, so even a small lift shows in a week or a few. A post-purchase flow gets 750 per version a week, so it needs bold changes and weeks of entrants. That's why bars on the board are different lengths: the row's traffic decides, not the idea.",
      vis: { traffic: [["campaign", 0.05], ["campaign", 0.08], ["sms", 0.15], ["welcome", 0.3], ["cart", 0.25], ["post", 0.25]] },
      predict: { q: "Same 25% lift on the cart flow (1,500 a week) and the post-purchase flow (750 a week). Which finishes sooner?", opts: ["Cart flow", "Post-purchase flow"], answer: 1, reveal: "Post-purchase: 4 weeks against 5. Half the people, but 8% of them order against 3.3% in cart, and a higher baseline is less noisy. Traffic and the baseline both set the length." } },
  ],
  U9b: [
    { h: "Fewer weeks, only bigger lifts.",
      p: "Minimum Detectable Effect Over Time turns the question around: with this many weeks, what's the smallest lift the test can see at 80% power? Half the lift needs four times the people, so a short slot on a small flow can only see big changes.",
      vis: { calcVis: { s: "welcome", lift: 0.3, show: ["md"] }, mark: ["md-1", "md-4"] },
      predict: { q: "A cart flow test can see 55% in week 1. About what in week 4?", opts: ["About 14%", "About 28%"], answer: 1, reveal: "About 28%. Four times the people halves the smallest lift. It doesn't quarter it." } },
  ],
  U9s: [
    { h: "Four inputs, one trade.",
      p: "The Power Calculator takes four inputs: how many people a week, how many weeks, the lift you expect, and the power you want. Here each one is a slider, and GrowthBook's two tables are drawn as lines. Left: Power Over Time. Right: Minimum Detectable Effect Over Time, the smallest lift the test can see. The week where a line crosses its dashed line is the week the test is ready.",
      vis: { sliders: { s: "welcome", t: 3, w: 4, lift: 0.3, pow: 0.8, open: ["t"] }, mark: ["sl-t", "ch-md"] },
      predict: { q: "This welcome test can see 33% at week 4. Double the people a week. What can it see at week 4?", opts: ["About 17%", "About 24%"], answer: 1, reveal: "About 24%. Twice the people shrinks it by the square root of 2, not by half. Halving it takes four times the people. Now move Traffic and watch the right chart." } },
    { h: "More sure costs more weeks.",
      p: "Power is how often a test catches a real lift of the size you entered. 80% is the usual target: one real win in five still comes back inconclusive. Asking for 90% misses fewer real wins, and it needs more people, so more weeks.",
      vis: { sliders: { s: "welcome", t: 3, w: 5, lift: 0.3, pow: 0.8, open: ["pow", "w"] }, mark: ["sl-pow", "ch-pw"] },
      predict: { q: "A welcome test needs 5 weeks for a 30% lift at 80% power. About how many at 90%?", opts: ["6 weeks", "7 weeks"], answer: 1, reveal: "7 weeks. Ten more points of power costs about a third more people. Now set Power to 90% and move Weeks to find it." } },
  ],
  U9c: [
    { h: "Not every idea can be tested. Size it, then decide.",
      p: "Three answers. It reaches 80% in the time it has: run it. It doesn't, but a bolder change could show up in that time (a smallest visible lift under 25%): test something bigger. Even the full slot only sees 25% or more: real changes rarely move that much, so decide without a test.",
      vis: { calcVis: { s: "winback", lift: 0.2, show: ["pw", "md"] }, mark: ["pw-8", "md-8"] },
      predict: { q: "A winback flow test has 8 weeks. Week 8 can see 34%. Priya hopes for 20%. Run it?", opts: ["Run it anyway", "Don't test it: decide"], answer: 1, reveal: "Decide. A test that can only see 34% would almost surely come back inconclusive on a 20% change, and a real 34% would be too good to be true." } },
  ],
  U9d: [
    { h: "The calculator sets the card's length. Then the board decides where it goes.",
      p: "A test that needs 4 weeks takes 4 weeks of its row. A short card might slip in before the freeze where a long one can't. Size first, then find the first week where the whole card fits.",
      vis: { live: { unit: "U9d", kind: "place", seed: 5 } },
      predict: { q: "A cart test needs 4 weeks. The row is free from Oct 26, and the freeze starts Nov 23. Can it start Nov 2?", opts: ["Yes", "No: it runs into the freeze"], answer: 1, reveal: "No. Nov 2 plus 4 weeks covers Nov 23. It has to start Oct 26, or wait until after the freeze." } },
  ],
};
