// v3 units 7 and 8: Marketing QA's screens, merged into the Test Board (PLAN.md "On the building roadmap", stages 1-2).
// U11 "Where's the room?" is played on a copy of the flow registry's "Where each flow stands" chart: read a bubble,
// name its corner, then find the flow with the most money to typical (the registry's "Improve first" tile, hidden here
// because it's the answer). U12 "The roadmap" is played on a copy of the roadmap's Improve lane: read a column, test it
// or improve it without a test (the "a 4-week test can see" chip against Sizing's 25% line), then which flow gets the
// next test slot. Pure: cases and the two screens are built here as strings, so tests run it in node.
//
// The flows are Fernhill Coffee Co.'s, made up, drawn fresh per case so each case can set up its trap. The math and the
// labels are Marketing QA's own (registry_view.py, registry_ui.html, roadmap.py, roadmap_ui.html): Klaviyo's published
// 2026 revenue per recipient by flow type, the median line, Kohavi's rule of 16 for the 4-week chip, 1 test in 3 wins.

import { rng, shuffle } from "./engine.mjs";
import { BOLD_MAX } from "./sizing.mjs";

// Klaviyo's 2026 averages by flow type, revenue per recipient (registry_view.py PUBLISHED)
export const TYPES = { welcome: ["welcome", 5.75], browse: ["browse abandonment", 2.08], cart: ["cart", 6.77], post: ["post-purchase", 1.8], winback: ["winback", 0.82] };
// name, type, stage, people entering a week, emails each person gets, orders per person who enters. Welcome, cart and
// post-purchase match the Sizing calculator's traffic (two versions of 1,500, 1,500 and 750 a week).
const POOL = [
  ["Welcome series", "welcome", "Signup", 3500, 3, 0.023],
  ["Browse abandonment", "browse", "Pre-purchase", 4000, 2, 0.015],
  ["Abandoned cart", "cart", "Pre-purchase", 3000, 3, 0.033],
  ["Checkout abandonment", "cart", "Pre-purchase", 900, 2, 0.05],
  ["Post-purchase: beans", "post", "Post-purchase", 1500, 3, 0.08],
  ["Post-purchase: gear", "post", "Post-purchase", 500, 2, 0.06],
  ["Winback", "winback", "Winback", 800, 3, 0.04],
];
export const LIFT = 0.1, WIN_RATE = 1 / 3, WEEKS_PER_MONTH = 52 / 12;
export const QUAD = ["Big, earns above its type · protect", "Big, earns below its type · improve first", "Small, earns above its type · grow the traffic", "Small, earns below its type · review"];
const QKEY = ["protect", "improve", "grow", "review"];
export const money = (x) => "$" + Math.round(x).toLocaleString("en-US");
const cents = (x) => "$" + x.toFixed(2);
const num = (x) => Math.round(x).toLocaleString("en-US");
const pick = (r, a) => a[Math.floor(r() * a.length)];
const argmax = (a, f) => a.reduce((b, x) => (f(x) > f(b) ? x : b), a[0]);
const second = (a, f, top) => argmax(a.filter((x) => x !== top), f);

// smallest lift a 4-week 50/50 test can reliably see on orders per entrant (roadmap.py mde, Kohavi's rule of 16)
export const mde4w = (enter, p) => Math.sqrt((16 * p * (1 - p)) / ((enter * 4) / 2)) / p;
const easeOf = (m) => (m <= 0.05 ? 10 : m <= 0.1 ? 8 : m <= 0.15 ? 6 : m <= 0.25 ? 4 : m <= 0.4 ? 2 : 1);   // roadmap.py ease_from_mde

// six of the seven flows, with people, earnings against type, revenue and the roadmap's numbers
export function flows(r) {
  const drop = Math.floor(r() * POOL.length);
  // traffic and order rate swing widely from case to case, so no flow name is always the answer
  const out = POOL.filter((_, i) => i !== drop).map(([name, type, stage, enter0, emails, p0], i) => {
    const enter = Math.max(100, Math.round((enter0 * Math.exp(Math.log(0.4) + r() * Math.log(2.5 / 0.4))) / 50) * 50), p = Math.round(p0 * (0.7 + 0.8 * r()) * 1000) / 1000, rel = Math.exp(Math.log(0.35) + r() * Math.log(2.3 / 0.35));
    const typical = TYPES[type][1], rpr = Math.round(typical * rel * 100) / 100, msgs = enter * emails, revWeek = rpr * msgs;
    const m = mde4w(enter, p), revMonth = revWeek * WEEKS_PER_MONTH;
    return { i, name, type, typeLabel: TYPES[type][0], stage, enter, emails, msgs, p, typical, rpr, rel: rpr / typical, revWeek, rev4w: revWeek * 4,
      gap: Math.max(0, (typical - rpr) * msgs), mde: m, ease: easeOf(m), revMonth, liftMonth: revMonth * LIFT, expMonth: revMonth * LIFT * WIN_RATE };
  });
  const xs = out.map((f) => f.enter).sort((a, b) => a - b), med = (xs[2] + xs[3]) / 2;
  out.forEach((f) => { f.big = f.enter > med; f.q = f.big ? (f.rel >= 1 ? 0 : 1) : f.rel >= 1 ? 2 : 3; });
  return { list: out, med, gapMid: xs[3] / xs[2] };
}
const quadWhy = (f, med) => `${f.name} has ${num(f.enter)} people a week, ${f.big ? "right" : "left"} of the middle line (${num(med)}), and earns ${cents(f.rpr)} a message against ${cents(f.typical)} for a typical ${f.typeLabel} flow (${f.rel.toFixed(2)}×), ${f.rel >= 1 ? "above" : "below"} the 1× line.`;
const gapWhy = (f) => `${f.name}: (${cents(f.typical)} − ${cents(f.rpr)}) × ${num(f.msgs)} messages = ${money(f.gap)} a week.`;
const chipText = (m) => (m > 0.4 ? "too small to test" : `${Math.round(m * 100)}%+ lift`);

const PART11 = { screen: "room", parent: "U11", daily: false, pass: [5, 6], tabs: [], calls: [], keyUnit: "U11" };
const PART12 = { screen: "lane", parent: "U12", daily: false, pass: [5, 6], tabs: [], calls: [], keyUnit: "U12" };
export const UNITS11 = {
  U11a: { ...PART11, id: "U11a", step: 1, name: "Read a bubble", kinds: ["mostPeople", "mostMoney", "mostBelow", "mostPeople", "mostMoney", "mostBelow"], meet: ["mostPeople", "mostMoney", "mostBelow"] },
  U11b: { ...PART11, id: "U11b", step: 2, name: "Which corner?", kinds: ["qProtect", "qImprove", "qGrow", "qReview", "qImprove", "qProtect"], meet: ["qImprove", "qProtect", "qReview"] },
  U11c: { ...PART11, id: "U11c", step: 3, name: "Where's the most room?", daily: true, pass: [6, 7],
          kinds: ["roomPlain", "roomFar", "roomProtect", "roomTwo", "roomFar", "roomProtect", "roomTwo"], meet: ["roomPlain", "roomFar", "roomProtect"] },
};
export const UNITS12 = {
  U12a: { ...PART12, id: "U12a", step: 1, name: "Read the lane", kinds: ["colLift", "colRev", "colSee", "colEase", "colExp"], meet: ["colLift", "colSee", "colRev"] },
  U12b: { ...PART12, id: "U12b", step: 2, name: "Test it, or improve it without a test?", kinds: ["seeBold", "seeJudge", "seeTop", "seeLow", "seeJudge", "seeBold"], meet: ["seeBold", "seeJudge", "seeTop"] },
  U12c: { ...PART12, id: "U12c", step: 3, name: "Which flow gets the next test?", daily: true, pass: [6, 7],
          kinds: ["nextSkip", "nextTop", "nextSkip", "nextTwo", "nextSkip", "nextTop"], meet: ["nextSkip", "nextTop", "nextSkip"] },
};
export const STEPS11 = Object.keys(UNITS11), STEPS12 = Object.keys(UNITS12);

const COLS12 = { lift: "A 10% lift, per month: if it works · expected", rev: "Revenue/month", see: "A 4-week test can see", ease: "Ease" };
export { COLS12 };

export function makeRoom(seed, kind, stage, unit, depth = 0) {
  const r = rng(seed ^ 0x700f);
  // spread answers over flow names: early tries hold out for a named answer, redrawn every 300 tries, so traffic
  // patterns (browse has the most people, post-purchase tests best) don't let a name stand in for the reasoning
  const wr = rng(seed ^ 0x51ab), wants = Array.from({ length: 20 }, () => POOL[Math.floor(wr() * POOL.length)][0]);
  for (let tries = 0; tries < 30000; tries++) {
    const ok = (f) => tries >= 6000 || f.name === wants[Math.floor(tries / 300)];
    const W = flows(r), L = W.list, base = { screen: unit < "U12" ? "room" : "lane", unit, kind, stage, seed, flows: L, med: W.med };
    if (W.gapMid < 1.2) continue;                                          // the middle line sits clear of every bubble
    if (L.some((f) => Math.abs(Math.log(f.rel)) < Math.log(1.1))) continue;   // and no bubble sits on the 1× line
    if (unit < "U12" && L.some((f, k) => L.some((g, j) => j > k && Math.max(f.enter / g.enter, g.enter / f.enter) < 1.2 && Math.max(f.rel / g.rel, g.rel / f.rel) < 1.25))) continue;   // no two bubbles on top of each other
    if (unit === "U11a") {
      const by = { mostPeople: (f) => f.enter, mostMoney: (f) => f.rev4w, mostBelow: (f) => -Math.log(f.rel) }[kind];
      const trapBy = { mostPeople: (f) => f.rev4w, mostMoney: (f) => f.enter, mostBelow: (f) => -f.rev4w }[kind];
      const ans = argmax(L, by), trap = argmax(L, trapBy);
      if (trap === ans || !ok(ans)) continue;
      const clear = { mostPeople: 1.2, mostMoney: 1.6, mostBelow: 1.25 }[kind], s2 = second(L, by, ans);
      if (kind === "mostBelow" ? s2.rel / ans.rel < clear : by(ans) / by(s2) < clear) continue;
      const others = shuffle(L.filter((f) => f !== ans && f !== trap), r).slice(0, 2), items = shuffle([ans, trap, ...others], r);
      return { ...base, captions: false, table: false, opts: items.map((f) => ["f" + f.i, f.name]), answer: "f" + ans.i, target: "b" + ans.i,
        ask: { mostPeople: "Which flow reaches the most people a week?", mostMoney: "Which flow brought in the most money in the last 4 weeks?", mostBelow: "Which flow earns furthest below a typical flow of its own type?" }[kind],
        hint: { mostPeople: "People a week is across: the further right, the more people. Bubble size is money, not people.", mostMoney: "Money is the bubble's size. Position doesn't say it: a flow far right can still be a small bubble.", mostBelow: "Up and down is earnings against its own type: the 1× line is typical. The lowest bubble is furthest below. Its size doesn't matter here." }[kind],
        why: { mostPeople: `${ans.name} sits furthest right: ${num(ans.enter)} people a week. ${trap.name} is the biggest bubble (${money(trap.rev4w)}), but that's money, not people.`,
               mostMoney: `${ans.name} is the biggest bubble: ${money(ans.rev4w)} in 4 weeks. ${trap.name} reaches more people (${num(trap.enter)} a week) but earns less from them.`,
               mostBelow: `${ans.name} sits lowest: ${cents(ans.rpr)} a message against ${cents(ans.typical)} for a typical ${ans.typeLabel} flow, ${ans.rel.toFixed(2)}×. ${trap.name} is the smallest bubble, which is about money, not earnings against its type.` }[kind] };
    }
    if (unit === "U11b") {
      const want = { qProtect: 0, qImprove: 1, qGrow: 2, qReview: 3 }[kind];
      const clearX = stage === 0 ? 1.5 : 1.15, clearY = stage === 0 ? 1.5 : 1.15;
      const cands = L.filter((f) => f.q === want && Math.max(f.enter / W.med, W.med / f.enter) >= clearX && Math.max(f.rel, 1 / f.rel) >= clearY);
      if (!cands.length) continue;
      const f = pick(r, cands);
      return { ...base, captions: false, table: false, mark: "b" + f.i, opts: QUAD.map((q, k) => ["q" + k, q]), answer: "q" + want, target: "b" + f.i, revealCaptions: true,
        ask: "The ringed flow: which corner of the map is it in?",
        hint: "Two lines cut the map. The dashed upright line is the middle of these flows by people a week: right of it is big. The 1× line across is typical for its type: above it earns more than its type.",
        why: quadWhy(f, W.med) + ` So: ${QUAD[want].toLowerCase()}.` };
    }
    if (unit === "U11c") {
      const ans = argmax(L, (f) => f.gap), s2 = second(L, (f) => f.gap, ans);
      if (ans.q !== 1 || ans.gap / s2.gap < 1.25 || !ok(ans)) continue;
      let trap;
      if (kind === "roomFar") trap = L.find((f) => !f.big && f.rel < ans.rel && f.rel <= 0.55);
      else if (kind === "roomProtect") { trap = argmax(L, (f) => f.rev4w); if (trap.q !== 0) trap = null; }
      else if (kind === "roomTwo") trap = L.find((f) => f !== ans && f.q === 1 && f.rel < ans.rel);
      else trap = s2;
      if (!trap || trap === ans) continue;
      if (kind === "roomPlain" && L.some((f) => f !== ans && f.rel < ans.rel)) continue;   // the plain case: the answer is also the lowest bubble
      // a second flow from the shaded corner is always on offer, so the corner alone can't pick the answer
      const pool = L.filter((f) => f !== ans && f !== trap), inCorner = pool.filter((f) => f.q === 1);
      if (trap.q !== 1 && !inCorner.length) continue;
      const rest = shuffle(trap.q === 1 ? pool : inCorner, r)[0], items = shuffle([ans, trap, rest], r);
      return { ...base, captions: true, table: true, opts: items.map((f) => ["f" + f.i, f.name]), answer: "f" + ans.i, target: "b" + ans.i,
        ask: "Where's the most room? Which flow would add the most a week if it earned what a typical flow of its type earns?",
        hint: "Money to typical, a week = (typical per message − what it earns per message) × messages a week. The shaded corner is where to look first. The number decides.",
        why: `${gapWhy(ans)} ${trap.q === 0 ? `${trap.name} is the biggest bubble, but it already earns ${trap.rel.toFixed(2)}× its type: protect it.` : trap.gap > 0 ? `${gapWhy(trap)}${trap.rel < ans.rel ? (trap.msgs < ans.msgs ? " It sits lower, but it has fewer messages." : ` It sits lower, but a typical ${trap.typeLabel} flow earns less a message (${cents(trap.typical)} against ${cents(ans.typical)}), so each message has less to gain.`) : ""}` : ""}` };
    }
    // the roadmap's Improve lane, sorted by what a 10% lift is worth (roadmap.py)
    const lane = [...L].sort((a, b) => b.liftMonth - a.liftMonth);
    lane.forEach((f, k) => { f.rank = k; });
    if (lane.some((f) => Math.abs(f.mde - BOLD_MAX) < (stage === 0 ? 0.04 : 0.015))) continue;   // no chip on the 25% line
    const lb = { ...base, lane, captions: false };
    if (unit === "U12a") {
      const f = pick(r, lane), col = { colLift: "lift", colExp: "lift", colRev: "rev", colSee: "see", colEase: "ease" }[kind];
      const ask = { colLift: `If a 10% improvement to ${f.name} worked, what would it add a month? Which column says?`,
        colExp: `About 1 test in 3 wins. What should you count on a month from trying to improve ${f.name}? Which column says?`,
        colRev: `What does ${f.name} bring in a month right now? Which column says?`,
        colSee: `Could a 4-week test on ${f.name} tell a real change from luck? Which column says?`,
        colEase: `How quickly can a test on ${f.name} answer, scored 1 to 10? Which column says?` }[kind];
      return { ...lb, mark: "r" + f.rank, opts: shuffle(Object.entries(COLS12).map(([k, v]) => ["c-" + k, v]), r), answer: "c-" + col, target: "h-" + col, ask,
        hint: "A 10% lift: what it adds a month if it works, then after the dot what to expect, since about 1 test in 3 wins. Revenue/month: what it earns now. The chip: the smallest lift a 4-week test can see. Ease: how fast a test answers, 1 to 10.",
        why: { colLift: `The 10% lift column: ${money(f.liftMonth)} a month if it works. That's 10% of its ${money(f.revMonth)} revenue a month.`,
               colExp: `The 10% lift column, after the dot: ~${money(f.expMonth)}. About 1 test in 3 wins, so a third of the ${money(f.liftMonth)} it would add if it works.`,
               colRev: `Revenue/month: ${money(f.revMonth)}. The lift column is 10% of this, which is why the two columns sort the same way.`,
               colSee: f.mde > 0.4 ? `The chip: ${f.name} is too small to test, a 4-week test can't tell a real change from luck.` : `The chip: a 4-week test on ${f.name} can see a lift of ${Math.round(f.mde * 100)}% or more.`,
               colEase: `Ease: ${f.ease}. It comes from the chip: the smaller the lift a test can see, the easier the flow is to test.` }[kind] };
    }
    if (unit === "U12b") {
      const bold = (f) => f.mde <= BOLD_MAX;
      let c;
      if (kind === "seeTop") { c = lane[0]; if (bold(c)) continue; }
      else if (kind === "seeLow") { c = pick(r, lane.slice(3).filter(bold)); }
      else c = pick(r, lane.filter((f) => bold(f) === (kind === "seeBold")));
      if (!c || !ok(c)) continue;
      const ans = bold(c) ? "bold" : "judge";
      return { ...lb, mark: "r" + c.rank, opts: [["bold", "Test a bold change"], ["judge", "Improve it without a test"]], answer: ans, target: "see" + c.rank,
        ask: `${c.name}: test a change on it, or improve it without a test?`,
        hint: `Read its chip. ${Math.round(BOLD_MAX * 100)}% or less: a bold change would show in 4 weeks, so test one. Over ${Math.round(BOLD_MAX * 100)}%: even a bold change wouldn't show, so improve it by copying what works for typical flows of its type. Where it sits on the list doesn't matter here.`,
        why: ans === "bold" ? `Its chip says ${chipText(c.mde)}: a bold change shows in 4 weeks. Test one.${c.rank >= 3 ? " It's low on the list, but a test can still answer it." : ""}`
          : `Its chip says ${chipText(c.mde)}: a 4-week test can't see the changes tests usually make (25% is already bold). Improve it without a test.${c.rank === 0 ? " It tops the list, but the list is sorted by worth, not by what a test can see." : ""}` };
    }
    if (unit === "U12c") {
      const bold = (f) => f.mde <= BOLD_MAX, ans = lane.find(bold);
      if (!ans || !ok(ans)) continue;
      if (kind === "nextTop" && ans.rank !== 0) continue;
      if (kind === "nextSkip" && ans.rank !== 1) continue;
      if (kind === "nextTwo" && ans.rank < 2) continue;
      const above = lane.slice(0, ans.rank), below = lane.slice(ans.rank + 1);
      const trap = above.length ? above[0] : below[0], rest = shuffle(lane.filter((f) => f !== ans && f !== trap), r)[0];
      const items = shuffle([ans, trap, rest], r);
      return { ...lb, opts: items.map((f) => ["f" + f.i, f.name]), answer: "f" + ans.i, target: "r" + ans.rank,
        ask: "One test slot opens on the flows next week. Which flow gets it?",
        hint: "The list is sorted by what a 10% lift is worth, not by what a test can see. Go down from the top: the first flow whose chip is 25% or less gets the test. The ones above it get improved without a test.",
        why: above.length ? `${above.map((f) => `${f.name} (${chipText(f.mde)})`).join(" and ")} ${above.length > 1 ? "are" : "is"} worth more, but a 4-week test can't see a change there: improve ${above.length > 1 ? "them" : "it"} without a test. ${ans.name} is the highest flow a test can see (${chipText(ans.mde)}), so it gets the slot.`
          : `${ans.name} tops the list and its chip says ${chipText(ans.mde)}: a bold change shows in 4 weeks. It gets the slot.` };
    }
  }
  if (depth < 5) return makeRoom(seed + 7919, kind, stage, unit, depth + 1);   // a rare seed with no fitting case: try the next one
  throw new Error(`no ${unit} ${kind} case for seed ${seed}`);
}

// the sidebar's Flow registry and Roadmap: one set of flows to look around in, outside the reps
export function browseCase(seed) {
  const r = rng(seed ^ 0xb0b);
  for (let k = 0; k < 5000; k++) {
    const W = flows(r), L = W.list;
    if (W.gapMid < 1.2 || L.some((f) => Math.abs(Math.log(f.rel)) < Math.log(1.1))) continue;
    if (!L.some((f) => f.q === 1) || !L.some((f) => f.mde <= BOLD_MAX) || L.some((f) => Math.abs(f.mde - BOLD_MAX) < 0.006)) continue;
    const lane = [...L].sort((a, b) => b.liftMonth - a.liftMonth);
    lane.forEach((f, i) => { f.rank = i; });
    return { flows: L, med: W.med, lane, captions: true, focus: argmax(L, (f) => f.gap), next: lane.find((f) => f.mde <= BOLD_MAX) };
  }
}
// the registry's "Improve first" tile (registry_ui.html): the flow with the most money to typical
export const focusTile = (f) => `<div class="tile focus"><b>Improve first: ${f.name}</b><span>Earns ${cents(f.rpr)} per message. A typical ${f.typeLabel} flow earns ${cents(f.typical)}. At typical, about +${money(f.gap)} a week.</span></div>`;

// ----- the two screens, as Marketing QA draws them -----
// Put each bubble's label where it overlaps nothing (registry_ui.html placeLabels, shortened)
function placeLabels(items, fixed, x0, x1, y0, y1) {
  const cw = 6.6, taken = fixed.map(([a, b, c, d]) => ({ a, b, c, d }));
  items.forEach((it) => taken.push({ a: it.cx - it.r, b: it.cy - it.r, c: it.cx + it.r, d: it.cy + it.r, own: it }));
  const hit = (bx, own) => taken.some((t) => t.own !== own && bx.a < t.c && bx.c > t.a && bx.b < t.d && bx.d > t.b);
  return items.map((it) => {
    const w = it.text.length * cw, h = 13;
    const tries = [["start", it.cx + it.r + 5, it.cy + 4], ["end", it.cx - it.r - 5, it.cy + 4], ["middle", it.cx, it.cy - it.r - 6], ["middle", it.cx, it.cy + it.r + 14],
      ["start", it.cx + it.r + 5, it.cy - 12], ["start", it.cx + it.r + 5, it.cy + 20], ["end", it.cx - it.r - 5, it.cy - 12], ["end", it.cx - it.r - 5, it.cy + 20],
      ["middle", it.cx, it.cy - it.r - 22], ["middle", it.cx, it.cy + it.r + 30]];
    for (const [anchor, tx, ty] of tries) {
      const a = anchor === "start" ? tx : anchor === "end" ? tx - w : tx - w / 2, box = { a, b: ty - h + 2, c: a + w, d: ty + 3 };
      if (box.a < x0 || box.c > x1 + 10 || box.b < y0 - 6 || box.d > y1) continue;
      if (!hit(box, it)) { taken.push(box); return { text: it.text, x: tx, y: ty, anchor }; }
    }
    return { text: it.text, x: it.cx, y: Math.max(y0 + 10, it.cy - it.r - 6), anchor: "middle" };
  });
}
// the registry's "Where each flow stands" chart on its Revenue per recipient tab. o.captions: the corner labels,
// o.shade: the shaded corner, o.mark: a ringed bubble id
export function chartHTML(c, o = {}) {
  const L = c.flows, W = 760, H = 380, X0 = 60, R = 16, T = 18, B = 44;
  const xs = L.map((f) => f.enter), lx0 = Math.log10(Math.min(...xs) * 0.6), lx1 = Math.log10(Math.max(...xs) * 1.6);
  const x = (v) => X0 + ((Math.log10(v) - lx0) / (lx1 - lx0)) * (W - X0 - R);
  const lo = Math.min(0.5, ...L.map((f) => f.rel)) * 0.62, hi = Math.max(2, ...L.map((f) => f.rel)) * 1.5, l0 = Math.log2(lo), l1 = Math.log2(hi);
  const y = (v) => T + (1 - (Math.log2(v) - l0) / (l1 - l0)) * (H - T - B);
  const yt = [0.25, 0.5, 1, 2, 4].filter((v) => v >= lo && v <= hi), refY = y(1), mx = x(c.med);
  const xt = []; for (let p = Math.ceil(lx0); p <= Math.floor(lx1); p++) [1, 3].forEach((m) => { const v = m * 10 ** p; if (Math.log10(v) >= lx0 && Math.log10(v) <= lx1) xt.push(v); });
  const revMax = Math.max(...L.map((f) => f.rev4w)), rad = (v) => 7 + Math.sqrt(v / revMax) * 24;
  const sorted = [...L].sort((a, b) => b.rev4w - a.rev4w), fmtK = (v) => (v >= 1000 ? v / 1000 + "K" : v);
  const cap = o.captions ?? c.captions, shade = o.shade ?? cap, mark = "mark" in o ? o.mark : c.mark;
  const qx = [[W - R - 8, T + 14, "end"], [W - R - 8, H - B - 10, "end"], [X0 + 8, T + 14, "start"], [X0 + 8, H - B - 10, "start"]];
  const labels = placeLabels(sorted.map((f) => ({ text: f.name, cx: x(f.enter), cy: y(f.rel), r: rad(f.rev4w) })),
    cap ? [[W - R - 300, T, W - R, T + 20], [W - R - 300, H - B - 26, W - R, H - B], [X0, T, X0 + 300, T + 20], [X0, H - B - 26, X0 + 280, H - B]] : [], X0, W - R, T, H - B);
  return `<div class="port"><div class="porth"><b>Where each flow stands</b><span class="ptab">Revenue per recipient</span></div>
    <div class="svgw"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Flows by people per week and revenue per recipient against their type">
    ${shade ? `<rect id="corner" x="${mx}" y="${refY}" width="${W - R - mx}" height="${H - B - refY}" fill="var(--accent-soft)" opacity=".75"/>` : ""}
    ${xt.map((v) => `<line x1="${x(v)}" x2="${x(v)}" y1="${T}" y2="${H - B}" stroke="var(--line2)"/><text class="ax" x="${x(v)}" y="${H - B + 16}" text-anchor="middle">${fmtK(v)}</text>`).join("")}
    ${yt.map((v) => `<line x1="${X0}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line2)"/><text class="ax" x="${X0 - 8}" y="${y(v) + 4}" text-anchor="end">${v}×</text>`).join("")}
    <line id="midline" x1="${mx}" x2="${mx}" y1="${T}" y2="${H - B}" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="4 4"/>
    <line id="oneline" x1="${X0}" x2="${W - R}" y1="${refY}" y2="${refY}" stroke="var(--ink2)" stroke-width="1.5" stroke-dasharray="5 4"/><text class="ax" x="${X0 + 6}" y="${refY - 5}">typical for its type (1×)</text>
    ${cap ? QUAD.map((q, k) => `<text class="ql${k === 1 ? " hot" : ""}" id="q${k}" x="${qx[k][0]}" y="${qx[k][1]}" text-anchor="${qx[k][2]}">${q}</text>`).join("") : ""}
    <text class="axl" x="${(X0 + W - R) / 2}" y="${H - 6}" text-anchor="middle">People entering per week (log scale) →</text>
    <text class="axl" transform="translate(14 ${(T + H - B) / 2}) rotate(-90)" text-anchor="middle">Revenue per recipient vs typical for its flow type →</text>
    ${sorted.map((f) => `<circle class="bub" id="b${f.i}" cx="${x(f.enter)}" cy="${y(f.rel)}" r="${rad(f.rev4w)}" fill="var(--win)" fill-opacity=".72"/>`).join("")}
    ${mark ? (() => { const f = L[+mark.slice(1)]; return `<circle class="ring" cx="${x(f.enter)}" cy="${y(f.rel)}" r="${rad(f.rev4w) + 7}"/>`; })() : ""}
    ${labels.map((l) => `<text class="bl" x="${l.x}" y="${l.y}" text-anchor="${l.anchor}">${l.text}</text>`).join("")}
    </svg></div>
    <div class="legend"><span><i></i>✓ Good: no open alerts (every flow's checks pass here)</span><span>Bigger bubble = more revenue</span>${shade ? `<span class="hot">Shaded corner: big flows below the line</span>` : ""}</div></div>`;
}
// the registry's flow table, the numbers behind each bubble (shown from step 3)
export function flowTable(c) {
  return `<div class="tscroll"><table class="rt stack" id="flows"><thead><tr><th>Flow</th><th>People a week</th><th>Messages a week</th><th>Earns per message</th><th>Typical for its type</th></tr></thead><tbody>
    ${[...c.flows].sort((a, b) => b.enter - a.enter).map((f) => `<tr id="t${f.i}"><td data-l="Flow"><b>${f.name}</b><small>${f.stage}</small></td><td data-l="People a week">${num(f.enter)}</td><td data-l="Messages a week">${num(f.msgs)}</td>
      <td data-l="Earns per message">${cents(f.rpr)}</td><td data-l="Typical for its type">${cents(f.typical)} <span class="muted">${f.typeLabel}</span></td></tr>`).join("")}</tbody></table></div>`;
}
// plain: one neutral color, for reps where the color would give the call away (recolored when the call is in)
export const chip = (m, plain) => (m > 0.4 ? `<span class="see ${plain ? "n" : "b"}">too small to test</span>` : `<span class="see ${plain ? "n" : m <= 0.1 ? "g" : m <= 0.25 ? "m" : "b"}">${Math.round(m * 100)}%+ lift</span>`);
// the roadmap's Improve lane (roadmap_ui.html), sorted by what a 10% lift is worth
export function laneHTML(c, o = {}) {
  const top = Math.max(...c.lane.map((f) => f.liftMonth)), mark = "mark" in o ? o.mark : c.mark;
  return `<div class="lane"><div class="laneh"><span class="n">${c.lane.length}</span><b>Improve</b><small>every live flow: what a 10% lift is worth, and what a 4-week test can see</small></div>
    <div class="tscroll"><table class="rt stack" id="lane"><thead><tr><th>Flow</th>${Object.entries(COLS12).map(([k, v]) => `<th id="h-${k}">${v}</th>`).join("")}</tr></thead><tbody>
    ${c.lane.map((f, k) => `<tr id="r${k}" class="${mark === "r" + k ? "mk" : ""}"><td data-l="Flow"><b>${f.name}</b>${o.next === f ? ` <span class="see g">next test</span>` : ""}<small>${f.stage} · ${num(f.enter)} enter a week</small></td>
      <td data-l="10% lift: if it works · expected" class="l"><span class="lbar" style="width:${Math.max(2, (f.liftMonth / top) * 120)}px"></span>${money(f.liftMonth)} <span class="exp">· ~${money(f.expMonth)}</span></td>
      <td data-l="Revenue/month">${money(f.revMonth)}</td><td data-l="A 4-week test can see" id="see${k}">${chip(f.mde, o.plain)}</td><td data-l="Ease">${f.ease}</td></tr>`).join("")}</tbody></table></div></div>`;
}

export const LESSONS11 = {
  U11a: [
    { h: "Marketing QA keeps one map of every flow.",
      p: "Each bubble is a flow. Across: how many people enter it a week, on a log scale, so each gridline is about three times the one before. Up: what it earns per message against a typical flow of its own type. Bubble size: the money it brought in over the last 4 weeks. Three numbers, three ways to show them.",
      vis: { room: { unit: "U11a", kind: "mostMoney", seed: 4 } },
      predict: { q: "A bubble sits far to the right but is small. What does that say?", opts: ["Lots of people, little money", "Few people, lots of money"], answer: 0, reveal: "Lots of people, little money. Right means people, size means money." } },
    { h: "Up and down compares a flow with its own type.",
      p: "A winback flow and a cart flow can't earn the same. So the map measures each flow against Klaviyo's 2026 average for its type: cart flows earn $6.77 a message on average, winback $0.82. The dashed 1× line across is typical. 2× earns twice what's typical for its type, 0.5× half.",
      vis: { room: { unit: "U11a", kind: "mostBelow", seed: 9 }, mark: ["oneline"] },
      predict: { q: "Your cart flow earns $3.40 a message. A typical cart flow earns $6.77. Where does it sit?", opts: ["Below the line, at about 0.5×", "Above it, since $3.40 beats winback's $0.82"], answer: 0, reveal: "Below, at about 0.5×: $3.40 is half of $6.77. Even though $3.40 is more than a typical winback flow earns." } },
  ],
  U11b: [
    { h: "Two lines cut the map into four corners.",
      p: "The dashed upright line is the middle of these flows by people a week: right of it are the big ones. The 1× line across is typical for its type. Big and above: protect it. Big and below: improve it first, that's the shaded corner. Small and above: send it more people. Small and below: review it when there's time. In the reps the corner labels are hidden, so you read the two lines yourself.",
      vis: { room: { unit: "U11c", kind: "roomPlain", seed: 3, captions: true }, mark: ["midline", "oneline"] },
      predict: { q: "A flow sits right of the middle line, at 0.6×. Which corner?", opts: ["Big, earns below its type · improve first", "Big, earns above its type · protect"], answer: 0, reveal: "Improve first. Right of the line is big, under 1× is below its type." } },
  ],
  U11c: [
    { h: "The corner says where to look. The number says how much.",
      p: "How much more would a flow earn at typical? (typical per message − what it earns per message) × messages a week. Marketing QA's Improve first tile shows the flow with the most. Here the tile is hidden, because finding it is the job. The table under the map has the numbers behind each bubble.",
      vis: { room: { unit: "U11c", kind: "roomTwo", seed: 5 }, table: true, mark: ["corner"] },
      predict: { q: "Say two cart-type flows. Flow A earns $2.00 of a typical $6.77, on 1,800 messages a week. Flow B earns $5.00 of $6.77, on 9,000. Which has more room?", opts: ["Flow B", "Flow A, it sits lower"], answer: 0,
        reveal: "Flow B: $1.77 × 9,000 = $15,930 a week. Flow A: $4.77 × 1,800 = $8,586. Sitting lower isn't more room when five times the messages go through the other flow." } },
    { h: "The biggest bubble isn't always the one to fix.",
      p: "A big bubble above its 1× line already beats its type. That's the protect corner: leave it alone, and don't let a test hurt it. A small flow far below its line looks bad but has few messages, so even fixing it all the way adds little. Improving toward typical is the job here: copy what typical flows of that type do. Whether a test can check the change is the roadmap's question, next.",
      vis: { room: { unit: "U11c", kind: "roomProtect", seed: 2 }, mark: ["q0"] },
      predict: { q: "Say the biggest bubble on a map sits at 1.6×, top right. Improve it first?", opts: ["No, protect it: it beats its type", "Yes, the biggest bubble has the most to gain"], answer: 0, reveal: "Protect it. It earns more than its type already. The room is in the shaded corner." } },
  ],
};
export const LESSONS12 = {
  U12a: [
    { h: "The roadmap ranks every flow by what a 10% lift is worth.",
      p: "Marketing QA's roadmap has an Improve lane: one row per live flow. A 10% lift, per month: what it would add if a 10% improvement worked, then after the dot what to expect, since about 1 test in 3 wins. Revenue/month: what it earns now. A 4-week test can see: the smallest lift a 4-week 50/50 test can tell from luck. Ease: the same thing as a 1 to 10 score.",
      vis: { lane: { unit: "U12a", kind: "colLift", seed: 6 }, mark: ["h-lift", "h-rev", "h-see", "h-ease"] },
      predict: { q: "A flow brings in $150,000 a month. What's in its 10% lift column?", opts: ["$15,000 · ~$5,000", "$50,000 · ~$15,000"], answer: 0, reveal: "$15,000 if it works, 10% of $150,000. About 1 test in 3 wins, so expect about a third: ~$5,000." } },
  ],
  U12b: [
    { h: "The chip says whether a test can answer.",
      p: "The chip is the smallest lift a 4-week test can see on orders per person who enters. 25% or less: a bold change would show, so test one. Over 25%: even a bold change wouldn't show, and real changes rarely move more. Improve that flow without a test: copy what typical flows of its type do. It's the same 25% line as Sizing's Worth testing? step. A green chip (10% or less) needs far more people than Fernhill's flows have.",
      vis: { lane: { unit: "U12b", kind: "seeTop", seed: 4 }, mark: ["h-see"] },
      predict: { q: "Say the flow at the top of the list has a chip that reads 31%+ lift. Test a change on it?", opts: ["Improve it without a test", "Test a bold change, it tops the list"], answer: 0, reveal: "Improve it without a test. A 4-week test can only see 31% or more, and a real change that big is rare." } },
  ],
  U12c: [
    { h: "Sorted by worth isn't sorted by what to test.",
      p: "The lane is sorted by what a 10% lift is worth. A test slot should go to a flow a test can answer. So go down from the top, and the first flow whose chip is 25% or less gets the next test. The flows above it still get work: improve them without a test, so the slot isn't spent on a test that can't tell.",
      vis: { lane: { unit: "U12c", kind: "nextSkip", seed: 3 }, mark: ["see0", "see1"] },
      predict: { q: "Say the top row is worth $6,000 a month with a 34% chip, and the second is worth $3,500 with a 22% chip. Which gets the next test?", opts: ["The second row", "The top row, it's worth more"], answer: 0, reveal: "The second row. A test on the top row couldn't see the change. Improve that one without a test, and test the second." } },
  ],
};
