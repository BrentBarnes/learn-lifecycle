// v3's daily session: what to play today, in what order, and when each passed step comes back for review.
// Research behind it: ../../shared/research/pacing-immersion-analysis.md (spacing, a clear end to each session,
// story on the path as the "conclude" beat, rest after effort). Pure functions, so tests can run them in node.
//
// A session is: warm-up (spaced review of passed steps, mixed) -> new steps in path order (progressive practice kept)
// -> one story chapter if one is open and unplayed -> done for today.

import { UNITS, STEPS, shuffle } from "./engine.mjs";

export const HOUR = 3600e3, DAY = 24 * HOUR;
// first review a few hours after the pass, then 1, 3, 7, 14, 30 days (expanding gaps; a miss starts over)
export const GAPS = [4 * HOUR, DAY, 3 * DAY, 7 * DAY, 14 * DAY, 30 * DAY];
export const NEW_PER_SESSION = 2, WARM_MAX = 5;

// when a step was passed (the time of its last rep at or before the pass): reps carry `at` (ms)
export function passedAt(st) {
  const r = st && st.reps || [];
  return r.length ? r[r.length - 1].at || 0 : 0;
}
// review state per step: { lvl, due } in S.v3.ivl; a passed step with no entry is due GAPS[0] after its last rep
export function dueAt(u, units, ivl) {
  const iv = ivl[u];
  return iv ? iv.due : passedAt(units[u]) + GAPS[0];
}
// What comes back for review: a unit's integrated steps (the ones v2's daily round uses), plus the single-idea steps of
// a unit still in progress. Once a unit's final step passes, reviewing the final covers its parts.
// the final is the last step of the unit that is in `units` (v3 passes only its path, so U6f, not U6g)
const finalPassed = (u, units) => { const p = UNITS[u] && UNITS[u].parent, f = p && STEPS[p] && STEPS[p].filter((x) => units[x]).at(-1); return !!(f && units[f] && units[f].passed); };
export const reviewable = (u, units) => !!(units[u] && units[u].passed && UNITS[u] && UNITS[u].kinds && UNITS[u].kinds.length
  && (UNITS[u].daily !== false || !finalPassed(u, units)));

// the warm-up: up to WARM_MAX passed steps whose review is due, most overdue first, one rep each, in mixed order
export function warmPick(units, ivl, now, r, n = WARM_MAX) {
  const due = Object.keys(units).filter((u) => reviewable(u, units) && dueAt(u, units, ivl) <= now)
    .sort((a, b) => dueAt(a, units, ivl) - dueAt(b, units, ivl)).slice(0, n);
  return shuffle(due, r).map((u) => ({ unit: u, kind: UNITS[u].kinds[Math.floor(r() * UNITS[u].kinds.length)] }));
}
// after a warm-up rep: right moves the step to the next gap, a miss starts it over at the first
export function review(ivl, u, right, now) {
  const lvl = right ? Math.min(GAPS.length - 1, ((ivl[u] && ivl[u].lvl) ?? 0) + 1) : 0;   // passing the step was gap 0
  ivl[u] = { lvl, due: now + GAPS[lvl] };
  return ivl[u];
}
export const dueCount = (units, ivl, now) => Object.keys(units).filter((u) => reviewable(u, units) && dueAt(u, units, ivl) <= now).length;
// the earliest time the next review falls due (for "come back" on the done card)
export function nextDue(units, ivl) {
  const t = Object.keys(units).filter((u) => reviewable(u, units)).map((u) => dueAt(u, units, ivl));
  return t.length ? Math.min(...t) : null;
}

// the next steps on the path, in order (progressive practice: one new thing, then joins). path = app's PATH (steps, MS1, U7)
// Steps open one after another, so the next n not-done steps are what this session reaches if each one passes.
export function nextSteps(path, isDone, n) {
  return path.filter((u) => !isDone(u)).slice(0, n);
}

// today's plan. day = { date, warm: "done"|"skip"|null, passed: [ids passed today], story: id|null, extra: 0 }
// chapters: [{ id, needs, soon }], played: id -> true
export function plan({ units, day, path, isDone, chapters, played, warmDue }) {
  const items = [];
  if (day.warm !== "done" && day.warm !== "skip" && warmDue > 0) items.push({ type: "warm", n: Math.min(WARM_MAX, warmDue) });
  const want = NEW_PER_SESSION + (day.extra || 0) - day.passed.filter((u) => path.includes(u)).length;   // steps since cut from the path don't count
  for (const u of nextSteps(path, isDone, Math.max(0, want))) items.push({ type: "step", unit: u });
  const ch = chapters.find((c) => !c.soon && (!c.needs || (units[c.needs] && units[c.needs].passed)) && !played[c.id]);
  if (ch && !day.storyDone) items.push({ type: "story", ch: ch.id });
  items.push({ type: "done" });
  return items;
}
