// Press your luck: a season of tests on the daily campaign row, played one day at a time. Ship early whenever you like,
// or wait for the read date (day 7). Every test has a true effect the game knows (most ideas do nothing), so at the end
// the holdout shows what your ships really did next to what you claimed. Theo plays the same queue by peeking.
// The numbers are simulated honestly: daily revenue per recipient for A and B, cumulative, normal approximation.
import { rng, phi } from "./engine.mjs";

export const LUCK = { days: 42, read: 7, n: 60000, mean: 2.34, sd: 19, ship: 0.95 };   // 6 weeks on one row; 60,000 per side per day
const IDEAS = ["\"Only 3 left\" banner", "Founder's signature", "Brew tip up top", "Bigger buy button", "Plaid background", "Customer photo hero",
  "Question subject line", "Free filters with beans", "Shorter email", "Roast finder link", "Dog in the hero shot", "Weather-based copy",
  "Price in the subject", "Gift guide block", "Review stars", "Countdown timer", "Bold all-caps subject", "Sampler bundle block",
  "Story from a lineman", "Dark hero image", "Emoji in preheader", "Two-column grid", "Latte art photo", "Handwritten font"];

// the queue of tests for one season: each has a true effect and its own day-by-day noise
export function season(seed, count = 24) {
  const r = rng(seed), out = [];
  const gauss = () => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const names = IDEAS.slice().sort(() => r() - 0.5);
  for (let i = 0; i < count; i++) {
    const x = r(), truth = x < 0.55 ? 0 : x < 0.85 ? 2 + r() * 4 : -(2 + r() * 3);   // most ideas do nothing; some help, some hurt
    const se1 = LUCK.sd / Math.sqrt(LUCK.n);                                        // one day's standard error per side
    const shared = Array.from({ length: LUCK.read }, () => 1 + gauss() * 0.06);     // a day's mood moves both sides
    const daily = shared.map((s) => ({ a: LUCK.mean * s + gauss() * se1, b: LUCK.mean * s * (1 + truth / 100) + gauss() * se1 }));
    out.push({ i, name: names[i % names.length], truth, daily });
  }
  return out;
}
// what GrowthBook would show at the end of day d (1-based): cumulative means, % change, range, chance to win
export function readAt(test, d) {
  const days = test.daily.slice(0, d), n = LUCK.n * d;
  const a = days.reduce((s, x) => s + x.a, 0) / d, b = days.reduce((s, x) => s + x.b, 0) / d;
  const se = Math.sqrt(2) * LUCK.sd / Math.sqrt(n) / a * 100;
  const pct = (b / a - 1) * 100;
  return { d, a, b, n, pct, lo: pct - 1.96 * se, hi: pct + 1.96 * se, ctw: phi(pct / se) };
}
export const path = (test) => Array.from({ length: LUCK.read }, (_, k) => readAt(test, k + 1));

// play a whole season with a rule (day, read) -> "ship" | "keep" | null (null = another day). Returns the ledger.
export function play(tests, rule) {
  let left = LUCK.days, k = 0;
  const log = [];
  while (left > 0 && k < tests.length) {
    const t = tests[k++];
    let call = null, d = 0;
    while (!call) {
      d++;
      const x = readAt(t, d);
      call = rule(d, x) || (d >= LUCK.read ? (x.ctw >= LUCK.ship ? "ship" : "keep") : null);
      if (d >= left && !call) call = x.ctw >= LUCK.ship ? "ship" : "keep";   // out of days: forced read
    }
    left -= d;
    log.push(entry(t, d, call));
  }
  return { log, ...totals(log) };
}
export function entry(t, d, call) {
  const x = readAt(t, d);
  return { name: t.name, i: t.i, day: d, call, claimed: call === "ship" ? x.pct : 0, real: call === "ship" ? t.truth : 0, truth: t.truth, ctw: x.ctw, pct: x.pct };
}
export function totals(log) {
  const ships = log.filter((x) => x.call === "ship");
  const claimed = ships.reduce((s, x) => s + x.claimed, 0), real = ships.reduce((s, x) => s + x.real, 0);
  const falseWins = ships.filter((x) => x.truth <= 0).length;
  const missed = log.filter((x) => x.call === "keep" && x.truth > 0).length;
  return { tests: log.length, ships: ships.length, claimed, real, gap: claimed - real, falseWins, missed, trust: Math.max(0, Math.round(100 - 4 * Math.abs(claimed - real))) };
}
export const RULES = {
  disciplined: () => null,                                                         // read on day 7, ship at 95%
  theo: (d, x) => x.ctw >= LUCK.ship ? "ship" : d >= 3 && x.ctw < 0.2 ? "keep" : null,   // ships the first green day, dumps early reds
};
