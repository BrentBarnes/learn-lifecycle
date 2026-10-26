// v3 unit 5: Which goes first? (prioritization), on a copy of GrowthBook's Ideas list. Three steps in U6's style:
// what an idea is worth a week if it wins (the money through its surface times the lift), worth per week of testing
// (that, divided by the weeks the calculator says it needs: Weighted Shortest Job First), then both at once or one
// first (only ideas that compete for the same row, or two offers in the same weeks, need an order). Pure, tested in node.
//
// Chance to win is left out on purpose: it's a guess (about 1 in 3 ideas win), so ideas count as equally likely unless
// past results say otherwise. Research: ../research/v2/06-curriculum-map.md P6, P7 (scores are opinions).

import { rng } from "./engine.mjs";
import { TRAFFIC, weeksNeeded } from "./sizing.mjs";
import { WEEKLY_REV, ROW_SURFACE } from "./quarter.mjs";

export const REV = Object.fromEntries(ROW_SURFACE.map((s, i) => [s, WEEKLY_REV[i]]));
const IDEAS = {
  campaign: [["Hero: GIF vs static", true, [0.05, 0.08]], ["Product grid: 4 vs 6 coffees", true, [0.05, 0.08]], ["Free-shipping line in the header", false, [0.06, 0.1]],
             ["Sampler bundle block above the fold", false, [0.06, 0.1]], ["Subject: question vs statement", true, [0.03, 0.05]]],
  sms: [["SMS: bundle builder link vs beans page", true, [0.1, 0.15]], ["SMS: code BREW15", false, [0.15, 0.2]], ["SMS: first name in the opener", true, [0.1, 0.12]]],
  welcome: [["Welcome 1: founder story vs product grid", true, [0.3, 0.4]], ["Welcome 3: $10 off the first bean order", false, [0.3, 0.4]]],
  cart: [["Cart 1: reviews block", true, [0.25, 0.3]], ["Cart 1: $10 off vs no discount", false, [0.25, 0.4]]],
  post: [["Post-purchase: gear cross-sell", true, [0.25, 0.3]], ["Post-purchase: 15% off gear", false, [0.25, 0.4]]],
};
const SURF = Object.keys(IDEAS);
const pick = (r, a) => a[Math.floor(r() * a.length)];
export const money = (x) => "$" + Math.round(x).toLocaleString("en-US");
const pctS = (x) => (x * 100).toFixed(0) + "%";

export function idea(r, s, avoid = []) {
  const pool = IDEAS[s].filter((x) => !avoid.includes(x[0])), [name, creative, lifts] = pick(r, pool.length ? pool : IDEAS[s]);
  const lift = pick(r, lifts), weeks = weeksNeeded(s, lift);
  const cod = REV[s] * lift;                                   // cost of delay: what a win adds each week it isn't shipped
  return { name, s, row: TRAFFIC[s].row, where: TRAFFIC[s].label, offer: !creative, lift, rev: REV[s], perWeek: TRAFFIC[s].perWeek, cod, weeks, wsjf: cod / weeks };
}

const PART = { screen: "ideas", parent: "U10", daily: false, pass: [5, 6], tabs: [], keyUnit: "U10" };
export const UNITS10 = {
  U10a: { ...PART, id: "U10a", step: 1, name: "What's it worth if it wins?", calls: [], kinds: ["small", "big", "small", "big", "small"], meet: ["big", "small", "small"] },
  U10b: { ...PART, id: "U10b", step: 2, name: "Worth per week of testing", calls: [], kinds: ["fast", "big", "fast", "fast", "big"], meet: ["fast", "big", "fast"] },
  U10c: { ...PART, id: "U10c", step: 3, name: "Both at once, or one first?", calls: [], daily: true, pass: [6, 7],
          kinds: ["both", "sameRow", "offers", "both", "sameRow", "offers", "bothOffer"], meet: ["both", "sameRow", "offers"] },
};
export const STEPS10 = Object.keys(UNITS10);

// columns the Ideas list shows in each step (the rest come in later steps)
const COLS = { U10a: ["where", "rev", "lift"], U10b: ["where", "cod", "weeks"], U10c: ["where", "type", "cod", "weeks", "wsjf"] };
export const COL_NAME = { where: "Where it runs", type: "Change type", rev: "Revenue a week", lift: "Lift worth acting on", cod: "Worth a week if it wins",
  weeks: "Weeks it needs", wsjf: "Worth per week of testing" };

export function makePriority(seed, kind, stage, unit) {
  const r = rng(seed ^ 0x9a1d);
  for (let tries = 0; tries < 2000; tries++) {
    const base = { screen: "ideas", unit, kind, stage, seed, cols: COLS[unit] };
    if (unit === "U10a") {
      // big = the idea on the bigger surface is worth more; small = the bolder idea on a smaller surface is (the trap)
      const a = idea(r, pick(r, SURF)), b = idea(r, pick(r, SURF), [a.name]);
      if (a.s === b.s || a.rev === b.rev) continue;
      const [hi, lo] = a.cod > b.cod ? [a, b] : [b, a];
      if (hi.cod / lo.cod < 1.3) continue;
      if ((kind === "big") !== (hi.rev > lo.rev)) continue;
      const items = r() < 0.5 ? [a, b] : [b, a], ans = items.indexOf(hi);
      return { ...base, items, opts: items.map((x, i) => ["i" + i, x.name]), answer: "i" + ans, target: "r" + ans,
        ask: "Both could run next. Which one is worth more a week if B wins?",
        hint: "Worth a week if it wins = the revenue going through that surface each week × the lift. A big surface doesn't win on its own: a bold change on a smaller surface can be worth more.",
        why: `${hi.name}: ${money(hi.rev)} a week × ${pctS(hi.lift)} = ${money(hi.cod)} a week. ${lo.name}: ${money(lo.rev)} × ${pctS(lo.lift)} = ${money(lo.cod)}.${kind === "small" ? " The smaller surface wins because its change is bolder." : ""}` };
    }
    if (unit === "U10b") {
      // fast = the smaller win that finishes much sooner is the better use of the weeks (the trap is the bigger number)
      const a = idea(r, pick(r, SURF)), b = idea(r, pick(r, SURF), [a.name]);
      if (!a.weeks || !b.weeks || a.weeks > 10 || b.weeks > 10 || a.weeks === b.weeks) continue;
      const [hi, lo] = a.wsjf > b.wsjf ? [a, b] : [b, a];
      if (hi.wsjf / lo.wsjf < 1.4) continue;
      if ((kind === "fast") !== (hi.cod < lo.cod)) continue;
      const items = r() < 0.5 ? [a, b] : [b, a], ans = items.indexOf(hi);
      return { ...base, items, opts: items.map((x, i) => ["i" + i, `${x.name} first`]), answer: "i" + ans, target: "r" + ans,
        ask: "One test slot opens next week. Which idea should get it first?",
        hint: "Divide what it's worth a week by the weeks it needs. That's worth per week of testing, the standard name is Weighted Shortest Job First: a quick win gets paying sooner and frees the slot for the next idea.",
        why: `${hi.name}: ${money(hi.cod)} ÷ ${hi.weeks} week${hi.weeks > 1 ? "s" : ""} = ${money(hi.wsjf)} per week of testing. ${lo.name}: ${money(lo.cod)} ÷ ${lo.weeks} = ${money(lo.wsjf)}.${kind === "fast" ? " The smaller win finishes so much sooner that it's the better use of the slot." : ""}` };
    }
    if (unit === "U10c") {
      // both = different rows and not two offers: they don't compete, run both. sameRow / offers = one has to wait: higher worth per week first
      let a, b;
      if (kind === "sameRow") { const s = pick(r, ["campaign", "sms", "cart", "post", "welcome"]); a = idea(r, s); b = idea(r, s, [a.name]); if (a.name === b.name) continue; }
      else { a = idea(r, pick(r, SURF)); b = idea(r, pick(r, SURF), [a.name]); if (a.s === b.s) continue; }
      if (!a.weeks || !b.weeks || a.weeks > 10 || b.weeks > 10) continue;
      const bothOffers = a.offer && b.offer;
      if (kind === "offers" && !bothOffers) continue;
      if (kind === "both" && bothOffers) continue;
      if (kind === "bothOffer" && !(a.offer !== b.offer)) continue;    // one offer, one creative on different rows: still both
      const [hi, lo] = a.wsjf > b.wsjf ? [a, b] : [b, a];
      if (kind !== "both" && kind !== "bothOffer" && hi.wsjf / lo.wsjf < 1.3) continue;
      if ((kind === "both" || kind === "bothOffer") && hi.rev <= lo.rev && r() < 0.5) continue;   // the bigger surface often looks like it should go first
      const items = r() < 0.5 ? [a, b] : [b, a], ans = items.indexOf(hi), compete = kind === "sameRow" || kind === "offers";
      return { ...base, items, opts: [["both", "Run both at once"], ["i0", `${items[0].name} first`], ["i1", `${items[1].name} first`]],
        answer: compete ? "i" + ans : "both", target: compete ? "r" + ans : "rows",
        ask: "Both are ready. Can they run at the same time, or does one go first?",
        hint: "First the board: two ideas only compete when they need the same row, or when both are offers in the same weeks. If they don't compete, run both. If they do, worth per week of testing decides who goes first.",
        why: kind === "sameRow" ? `Both run on ${a.where}, one test per row, so one waits. ${hi.name} has more worth per week of testing (${money(hi.wsjf)} against ${money(lo.wsjf)}), so it goes first.`
          : kind === "offers" ? `They're on different rows, but both are offers, and two offers can't share weeks. ${hi.name} goes first: ${money(hi.wsjf)} per week of testing against ${money(lo.wsjf)}.`
          : `Different rows${a.offer || b.offer ? ", and only one is an offer" : ", and neither is an offer"}, so they don't compete. Run both. Ordering them would only delay one for nothing.` };
    }
  }
  throw new Error(`no ${unit} ${kind} case for seed ${seed}`);
}

export const LESSONS10 = {
  U10a: [
    { h: "Before ranking ideas, ask what each is worth if it wins.",
      p: "A win keeps paying every week after it ships. What it pays is the revenue going through that surface each week times the lift. Bigger surfaces carry more money, so the same lift is worth more there. But flows test bolder changes, so a smaller surface can still be worth more.",
      vis: { prio: "U10a", seed: 11 },
      predict: { q: "Daily campaign: $120,000 a week, a 5% idea. Cart flow: $35,000 a week, a 25% idea. Which is worth more if it wins?", opts: ["Daily campaign", "Cart flow"], answer: 1, reveal: "Cart flow: $8,750 a week against $6,000. The bolder change beats the bigger surface." } },
  ],
  U10b: [
    { h: "Then divide by the weeks it takes.",
      p: "A test holds its row until it's read. While it runs, the next idea waits. So rank by what an idea is worth a week, divided by the weeks it needs. The standard name is Weighted Shortest Job First (WSJF): cost of delay over job size. A quick, smaller win often goes first.",
      vis: { prio: "U10b", seed: 5 },
      predict: { q: "Idea A: $9,000 a week, needs 5 weeks. Idea B: $6,000 a week, needs 1 week. Same row. Which goes first?", opts: ["A, it's worth more", "B, it's faster"], answer: 1, reveal: "B: $6,000 per week of testing against $1,800. B ships in a week and starts paying, then A runs." } },
  ],
  U10c: [
    { h: "Only ideas that compete need an order.",
      p: "Each row runs its own test, so ideas on different rows don't wait for each other: run both. They compete in two cases from the board: the same row, or two offers in the same weeks. Then worth per week of testing decides who goes first.",
      vis: { prio: "U10c", seed: 3 },
      predict: { q: "A daily campaign hero test and a cart flow reviews block. Neither is an offer. Order them?", opts: ["Campaign first, bigger surface", "Run both at once"], answer: 1, reveal: "Run both. Different rows, no offers, so nothing makes one wait." } },
  ],
};
