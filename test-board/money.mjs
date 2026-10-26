// v3 unit 9: Money rows (CURRICULUM.md unit 7). An offer can lift revenue and still lose money: B gives a discount on
// every order, so each dollar of B's revenue keeps less. Three steps in U6's style, on GrowthBook's Results tab:
//   U13a Revenue or profit?  the plan's goal is Gross profit per recipient, revenue is a secondary row (U8b's rule:
//                            only the goal decides). The trap: revenue green, profit flat or red.
//   U13b The break-even line no profit metric set up (common), so the plan states the revenue lift the code needs just
//                            to keep profit level. It's read like U6c's worth-acting-on line: bar above zero with the
//                            dot past the line ship, whole bar short of it keep A (green revenue, lost money), the dot
//                            short of it with the bar reaching past it inconclusive.
//   U13c The money call      both kinds and creative tests, with the read date and guardrails (U6d, U6e) back in.
// The margin model: beans keep 60% of full price as gross profit. A code of d on B's orders leaves 1 - 0.4 / (1 - d).
// Pure, so tests run it in node. Registered into the engine's tables by app.mjs at load.

import { makeCase, rng, phi, pctStr } from "./engine.mjs";

export const MARGIN = 0.6;
export const keepRate = (d) => 1 - (1 - MARGIN) / (1 - d);           // share of B's revenue kept as gross profit
export const breakEven = (d) => MARGIN / keepRate(d) - 1;             // revenue lift that keeps profit level
const between = (r, a, b) => a + r() * (b - a);
const pick = (r, a) => a[Math.floor(r() * a.length)];
const dollars = (x) => "$" + x.toFixed(2);
const num = (x) => Math.round(x).toLocaleString("en-US");
const pctS = (x) => Math.round(x * 100) + "%";
const by = (x) => Math.abs(x).toFixed(1) + "%";                       // "up 12.5%", not "up +12.5%"

// a GrowthBook row from numbers we choose: values per recipient, relative lift, its standard error
function row(name, a, b, nA, nB, se) {
  const lift = b / a - 1;
  return { name, a: dollars(a), b: dollars(b), subA: "$" + num(a * nA) + " / " + num(nA), subB: "$" + num(b * nB) + " / " + num(nB),
    pct: lift * 100, lo: (lift - 1.96 * se) * 100, hi: (lift + 1.96 * se) * 100, ctw: phi(lift / se), better: "up", kind: "rpr" };
}
const IDEA = (d) => [`${pctS(d)} off beans vs full price`, `A ${pctS(d)} code brings in bean buyers who were waiting on price`, false];
const CREATIVE = [["Hero: coffee at the desk vs studio shot", "Coffee shown in use feels real and sells more", true],
  ["Product grid: 4 vs 6 coffees", "Fewer choices make it easier to pick a pair", true]];

const PART = { screen: "experiment", parent: "U13", daily: false, pass: [5, 6], tabs: ["o", "a"], keyUnit: "U6" };
export const UNITS13 = {
  U13a: { ...PART, id: "U13a", step: 1, name: "Revenue or profit?", calls: ["ship", "keepA", "inconclusive"],
          kinds: ["profLoss", "profFlat", "profWin", "creaWin", "profLoss", "profFlat"], meet: ["profLoss", "profWin", "profFlat"] },
  U13b: { ...PART, id: "U13b", step: 2, name: "The break-even line", calls: ["ship", "keepA", "inconclusive"],
          kinds: ["beLoss", "beCross", "beWin", "beLoss", "beCross", "beWin"], meet: ["beLoss", "beWin", "beCross"], pass: [6, 7] },
  U13c: { ...PART, id: "U13c", step: 3, name: "The money call", daily: true, pass: [7, 8], calls: ["ship", "keepA", "running", "inconclusive"],
          kinds: ["profLoss", "beLoss", "beWin", "creaWin", "moneyGuard", "profFlat", "beCross", "moneyRunning", "profWin"],
          meet: ["profLoss", "beLoss", "moneyGuard"] },
};
export const STEPS13 = Object.keys(UNITS13);

// which code each kind uses, and where revenue's lift lands (in standard errors from the line that matters)
const PLAN = {
  // 15% and 20% codes land on both sides, so the size of the code alone doesn't give the call away
  profLoss: { d: [0.2, 0.25], prof: "loss" }, profFlat: { d: [0.1, 0.15, 0.2], prof: "flat" }, profWin: { d: [0.05, 0.1, 0.15], prof: "win" },
  creaWin: { d: [0], prof: "win" }, beWin: { d: [0.05, 0.1, 0.15], be: "win" }, beLoss: { d: [0.2, 0.25], be: "loss" }, beCross: { d: [0.1, 0.15, 0.2], be: "cross" },
};
const ANSWER = { win: "ship", loss: "keepA", flat: "inconclusive", cross: "inconclusive" };

export function makeMoney(seed, kind, stage, unit, today) {
  const r = rng(seed ^ 0x3017);
  // U13c adds the two checks that come before the goal: a guardrail breach or a read date not reached yet
  const base = kind === "moneyGuard" ? "guardBreach" : kind === "moneyRunning" ? "running" : "ship";
  const k = base === "ship" ? kind : pick(r, ["profWin", "beWin", "profLoss"]);
  const P = PLAN[k], useBe = !!P.be;
  for (let tries = 0; tries < 3000; tries++) {
    const d = pick(r, P.d), idea = d ? IDEA(d) : pick(r, CREATIVE);
    const c = makeCase(seed + tries * 7919, base, stage, "U8b", today, { surface: "campaign", idea });
    const [nA, nB] = c.units, se = Math.sqrt((2 * (1.25 / 0.02 - 1)) / Math.min(nA, nB)), v = between(r, 2.2, 2.6);
    const be = breakEven(d), keep = d ? keepRate(d) / MARGIN : 1;   // B's profit per revenue dollar, against A's
    // revenue's lift: first it must be clearly green (that's the trap), then it sits where the kind wants it
    const L = useBe ? { win: be + between(r, 0.4, 3.4) * se, loss: be - between(r, 2.4, 3.4) * se, cross: be - between(r, 0.4, 1.6) * se }[P.be]
      : between(r, 0.06, 0.24);
    if (L / se < 2.6 || L >= 0.25) continue;                         // revenue clearly up, and under the 25% real tests reach
    const rev = row("Revenue per recipient", v, v * (1 + L), nA, nB, se);
    const prof = row("Gross profit per recipient", v * MARGIN, v * (1 + L) * MARGIN * keep, nA, nB, se);
    const pz = (prof.pct / 100) / se;
    if (!useBe && ({ loss: pz > -2.6, win: pz < 2.6, flat: Math.abs(pz) > 1.1 }[P.prof])) continue;
    const answer = base === "guardBreach" ? "keepA" : base === "running" ? "running" : ANSWER[useBe ? P.be : P.prof];
    c.overview.money = d ? `B gives ${pctS(d)} off every order. Gross margin at full price: ${pctS(MARGIN)}, so B keeps ${pctS(keepRate(d))} of each dollar as profit.` +
      (useBe ? ` Break-even: revenue up ${(be * 100).toFixed(0)}% just keeps profit level.` : "")
      : `No discount: B costs nothing extra. Gross margin: ${pctS(MARGIN)}.`;
    if (useBe) {
      c.goalRows = [rev]; c.beLine = Math.round(be * 100);
    } else {
      c.goalRows = [prof];
      c.secRows = [rev];
      c.overview.goal = "Gross profit per recipient";
      c.overview.secs = ["Revenue per recipient"];
    }
    const rTxt = `${by(rev.pct)} (${pctStr(rev.lo)} to ${pctStr(rev.hi)})`;
    const why = base === "guardBreach" ? `A guardrail broke: ${c.guardRows.find((g) => g.ctw <= 0.05).name} got clearly worse. That stops B whatever the money says. Keep A.`
      : base === "running" ? `Day ${c.day} of ${c.planned}: the read date hasn't come. Keep it running, whatever the money rows say so far.`
      : useBe ? { win: `Revenue is up ${rTxt}, the bar above zero, and the dot is past the break-even line at +${c.beLine}%: profit most likely rose. Ship B.`,
          loss: `Revenue is up ${rTxt}, green. But the whole bar is short of the break-even line at +${c.beLine}%: the ${pctS(d)} code gave away more than the extra sales brought in. Profit fell. Keep A.`,
          cross: `Revenue is up ${rTxt}, but the dot is short of the break-even line at +${c.beLine}%, with the bar reaching past it. Profit could be up or down. Inconclusive.` }[P.be]
      : d === 0 ? `No discount, so profit moves with revenue: both up ${by(prof.pct)}. Ship B.`
      : { loss: `Revenue is up ${by(rev.pct)}, but the goal is profit, and it fell ${by(prof.pct)}: B keeps ${pctS(keepRate(d))} of each dollar against A's ${pctS(MARGIN)}. Keep A.`,
          flat: `Revenue is up ${by(rev.pct)}, but the goal, profit, has a range across zero (${pctStr(prof.lo)} to ${pctStr(prof.hi)}). The extra sales about paid for the code. Inconclusive.`,
          win: `Profit, the goal, is up ${by(prof.pct)} with its range above zero. The extra sales more than paid for the ${pctS(d)} code. Ship B.` }[P.prof];
    return Object.assign(c, { unit, kind, stage, seed, screen: "experiment", answer, target: base === "guardBreach" ? "u" + c.guardRows.findIndex((g) => g.ctw <= 0.05) : "g0", why,
      ask: unit === "U13c" ? "Today's Monday read. What's the call?" : "The read date has come and the guardrails held. What's the call?",
      hint: unit === "U13a" ? "O: the goal is Gross profit per recipient. A: read only the Goal metrics row. Revenue is a secondary row: it can be green while profit isn't."
        : unit === "U13b" ? "O: the plan's break-even line. A: read it like the worth-acting-on line. Bar above zero and the dot past the line: ship. Whole bar short of the line: keep A, profit fell. Dot short of the line but the bar reaching past it: inconclusive."
        : "Read date first, then guardrails. Then the money: a profit goal is read against zero, a revenue goal with a break-even line by its dot against the line (bar above zero), and a creative change has neither." });
  }
  throw new Error(`no ${unit} ${kind} case for seed ${seed}`);
}

export const LESSONS13 = {
  U13a: [
    { h: "An offer can lift revenue and still lose money.",
      p: "Beans keep about 60% of their full price as gross profit. Give 20% off, and the same sale keeps only half of what it brought in: $100 of full-price beans sells for $80, still costs $40 to make, and keeps $40 instead of $60. So B needs a lot more sales before it makes more money than A. That's why an offer test's goal should be gross profit per recipient, with revenue as a secondary row.",
      vis: { live: { unit: "U13a", kind: "profLoss", seed: 3, tab: "a" }, mark: ["g0", "s0"] },
      predict: { q: "Revenue per recipient: up 10%, green. Gross profit per recipient, the goal: down 9%, red. The call?", opts: ["Keep A", "Ship B: revenue won"], answer: 0, reveal: "Keep A. The goal is profit, and B kept less of each dollar than the extra sales made up for." } },
    { h: "The Overview says what B gives away.",
      p: "The plan names the code, the margin, and how much of each dollar B keeps. A creative change gives nothing away, so its profit moves with revenue. An offer's doesn't.",
      vis: { live: { unit: "U13a", kind: "profWin", seed: 5, tab: "o" }, mark: ["ov-money", "ov-goal"] },
      predict: { q: "A new hero image, no code. Revenue up 8%, green. What does profit do?", opts: ["Up about 8% too", "Less than 8%"], answer: 0, reveal: "Up about 8% too. Nothing was given away, so each dollar keeps the same 60%." } },
  ],
  U13b: [
    { h: "No profit metric? Use the break-even line.",
      p: "Most teams' GrowthBook has revenue, not profit. Then the plan works out the break-even lift: how much revenue must rise just to keep profit level. At a 60% margin, 10% off needs revenue up 8%, 15% off needs 13%, 20% off needs 20%, 25% off needs 29%. On the CI graph it's a dashed line, read the way you read worth acting on.",
      vis: { live: { unit: "U13b", kind: "beLoss", seed: 2, tab: "a" }, mark: ["g0"] },
      predict: { q: "20% off. Revenue up 11%, range +4% to +18%, all green. Break-even is +20%. The call?", opts: ["Ship B: revenue won", "Keep A: profit fell"], answer: 1, reveal: "Keep A. The whole bar is short of +20%, so the code cost more than the extra sales brought in." } },
    { h: "Past the line, short of it, or across it.",
      p: "Read it the way you read the worth-acting-on line on Results. Bar above zero and the dot past the break-even line: profit most likely rose, ship B. Whole bar short of the line: profit fell, keep A, even with revenue green. Dot short of the line but the bar reaching past it: can't tell, inconclusive.",
      vis: { live: { unit: "U13b", kind: "beCross", seed: 4, tab: "a" }, mark: ["g0"] },
      predict: { q: "10% off, break-even +8%. Revenue up 11%, range +3% to +19%. The call?", opts: ["Ship B", "Inconclusive: the bar crosses the line"], answer: 0, reveal: "Ship B. The bar is above zero and the dot, +11%, is past +8%: profit most likely rose. Like worth acting on, the dot decides once the bar clears zero." } },
  ],
  U13c: [
    { h: "The money call, with everything before it.",
      p: "The money only matters once the test is ready and safe. So the order stays: read date, guardrails, then the goal. For the goal: a profit row is read against zero, a revenue row with a break-even line is read against the line, a creative change against zero.",
      vis: { checks: [["Read date (O)", "Not yet: keep running."], ["Guardrails (A)", "Whole range on the bad side: keep A."], ["Profit goal", "Against zero."], ["Revenue goal on an offer", "Bar above zero, dot past the break-even line."], ["Creative change", "Revenue against zero: nothing was given away."]] } },
  ],
};
