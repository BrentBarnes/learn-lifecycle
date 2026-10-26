// v3: chapters also run as the story beat of a daily session (D.inSession, D.next, D.chapterDone from app.mjs).
// Story mode and the arcade. Story: one quarter at Fernhill Coffee Co. (made up), a chapter per unit you've passed, each
// with a morning fire, a quick call at your desk, an Objection! trial, and the program dashboard moving week by week.
// Arcade: replay any trial, and Press your luck (a season of tests played a day at a time, against Theo's peeking).
import { createStage, exhibitHTML, CAST } from "./vn.mjs";
import { TRIALS, trialById } from "./trials.mjs";
import { CHAPTERS } from "./chapters.mjs";
import * as LK from "./luck.mjs";

let D = null, stage = null, mode = null;   // deps from app.mjs, the live stage, "hub" | "vn"
export function initStory(deps) { D = deps; }
export const storyActive = () => mode !== null;
export function storyStop() { if (stage) stage.stop(); stage = null; mode = null; }
const St = () => { const S = D.S(); S.story = S.story || {}; S.story.trials = S.story.trials || {}; S.story.ch = S.story.ch || {}; S.story.luck = S.story.luck || {}; return S.story; };
const open = (needs) => !needs || (D.allOpen && D.allOpen()) || D.passed(needs);
const esc = (t) => String(t).replace(/</g, "&lt;");

// =============================================================================================== the hub
export function storyHub() {
  storyStop(); mode = "hub"; D.setView("story");
  const s = St(), main = D.main;
  const next = CHAPTERS.find((c) => open(c.needs) && !(s.ch[c.id] && s.ch[c.id].done));
  const chRow = (c, i) => {
    const ok = open(c.needs), done = s.ch[c.id] && s.ch[c.id].done;
    return `<li class="step ${done ? "done" : ok ? "live" : "later"}${next === c ? " next" : ""}"><span class="sn">${done ? "✓" : i + 1}</span>
      <span class="snm">${c.title} <span class="muted" style="font-weight:500">· ${c.week}</span></span><span class="sp"></span>
      ${ok && !c.soon ? `<button class="btn sm ${next === c ? "primary" : ""}" type="button" data-ch="${c.id}">${done ? "Replay" : "Play"}${next === c ? ' <span class="kbd">Enter</span>' : ""}</button>` : `<span class="note">${c.soon ? "Coming next" : "Opens when " + c.needsLabel + " passes"}</span>`}</li>`;
  };
  const trRow = (t) => {
    const ok = open(t.needs), r = s.trials[t.id];
    return `<li class="step ${r && r.done ? "done" : ok ? "live" : "later"}"><span class="sn">${r && r.done ? "✓" : "⚖"}</span>
      <span class="snm">${t.title}<div class="note" style="font-weight:400">${t.blurb}</div></span><span class="sp"></span>
      ${ok ? `${r && r.done ? `<span class="stat">best: ${r.best} of 5 ♥</span>` : ""}<button class="btn sm" type="button" data-tr="${t.id}">${r && r.done ? "Replay" : "Play"}</button>` : `<span class="note">Opens when ${t.needsLabel} passes</span>`}</li>`;
  };
  const lb = s.luck.best;
  main.innerHTML = `<div class="mapwrap">
    <h1>Story and arcade</h1>
    <p class="muted">A quarter at Fernhill Coffee Co., a made-up coffee brand. Each chapter opens when you pass the unit it needs, and uses only what you've learned so far. Made-up people and numbers.</p>
    ${dashHTML(true)}
    <h2 class="h2">Story: Q4 at Fernhill</h2><ol class="steps">${CHAPTERS.map(chRow).join("")}</ol>
    <h2 class="h2">Arcade</h2>
    <div class="daily"><div><b>Press your luck</b><div class="muted">Six weeks on the daily campaign, one day at a time. Ship early whenever you like, or wait for the read date. Then the holdout shows what your wins were really worth, next to Theo's.${lb ? ` Best season: trust ${lb.trust}, real lift ${lb.real.toFixed(1)}%.` : ""}</div></div>
      <button class="btn" type="button" id="go-luck">Play a season</button></div>
    <h3 class="h3">Objection! trials</h3><ol class="steps">${TRIALS.map(trRow).join("")}</ol>
  </div>`;
  main.querySelectorAll("[data-ch]").forEach((b) => b.addEventListener("click", () => playChapter(b.dataset.ch)));
  main.querySelectorAll("[data-tr]").forEach((b) => b.addEventListener("click", () => playTrial(b.dataset.tr)));
  main.querySelector("#go-luck").addEventListener("click", () => playLuck());
  hubNext = next ? () => playChapter(next.id) : null;
}
let hubNext = null;

// =============================================================================================== keys
export function storyKey(e) {
  if (mode === "hub") { if (e.key === "Enter" && hubNext) { hubNext(); return true; } return false; }
  if (mode === "vn" && stage) return stage.key(e);
  return false;
}

function newStage() {
  storyStop(); mode = "vn"; D.setView("story");
  stage = createStage(D.main, { voOn: D.voOn, soundOn: D.soundOn });
  return stage;
}
const alive = (s) => s === stage && s.alive;

// =============================================================================================== Objection! trials
export async function playTrial(id, { inStory = false } = {}) {
  const T = trialById(id), s = inStory ? stage : newStage();
  if (!T) return;
  let hearts = 5, firstTry = true;
  const EV = T.evidence;
  s.hearts(hearts); s.ctl(""); s.panel("");
  await s.run(T.intro);
  for (const [ri, r] of T.rounds.entries()) {
    if (!alive(s)) return;
    // the testimony, once through
    s.tag(`Testimony · ${r.title}`, true);
    await s.run([{ show: r.witness, f: r.statements[0].f || "calm" }]);
    for (const st of r.statements) { if (!alive(s)) return; await s.say(r.witness, st.t, { face: st.f, testi: true }); }
    // cross-examination
    s.tag(`Cross-examination · ${r.title}`);
    await s.say("dana", ri === 0 ? "You may cross-examine. Press a statement to hear more. Present evidence when one doesn't hold up." : "Cross-examine.", { face: "serious" });
    let i = 0, misses = 0, done = false;
    while (!done && alive(s)) {
      const act = await crossStep(s, r, i, EV);
      if (!alive(s)) return;
      if (act.nav !== undefined) {
        if (act.nav >= r.statements.length) { await s.say(r.witness, "And that's my testimony.", { face: "smile" }); i = 0; }
        else i = Math.max(0, act.nav);
        continue;
      }
      const st = r.statements[i];
      if (act.press) {
        await s.burst("holdit");
        await s.run(st.press && st.press.length ? st.press : [{ s: r.witness, f: "cheeky", t: "That's all there is to it, really." }]);
        continue;
      }
      if (act.present === null) continue;
      const p = act.present, hit = (st.contra || []).some(([e, l]) => e === p.ev && l === p.line);
      if (hit) {
        if (p.el) p.el.classList.add("hit");
        await s.burst("objection");
        s.panel(""); s.ctl("");
        await s.run(r.hit);
        done = true; break;
      }
      // a near miss: the right exhibit, another line; or a line that contradicts a different statement
      const rightEv = (st.contra || []).some(([e]) => e === p.ev);
      const otherSt = r.statements.findIndex((x, k) => k !== i && (x.contra || []).some(([e, l]) => e === p.ev && l === p.line));
      await s.burst("takethat");
      if (rightEv) { await s.run([{ s: "dana", f: "suspicious", t: "That's the right document. Which line in it, exactly?" }]); continue; }
      firstTry = false; misses++; hearts--; s.hearts(hearts, 5, true); s.sting(false);
      if (otherSt >= 0) await s.run([{ s: "dana", f: "serious", t: "That does contradict something. Just not this statement. Find the statement it breaks." }]);
      else await s.run([{ s: r.witness, f: "cheeky", t: ["Is that supposed to mean something?", "Nice document. What about it?", "I'm not seeing the problem."][misses % 3] }, ...WRONG(misses)]);
      if (hearts <= 0) { const k = await gameOver(s, T, inStory); if (inStory && k === 0 && alive(s)) return playTrial(id, { inStory: true }); return; }   // in a chapter, a retry stays in the chapter
      if (misses >= 2) await s.run([{ s: "priya", f: "explaining", t: "(Whispering) " + r.hint }]);
    }
  }
  if (!alive(s)) return;
  // the verdict: a decision, with the reason when it's wrong
  s.tag("Verdict"); s.hideBox();
  const V = T.verdict;
  for (;;) {
    await s.run([{ s: "dana", f: "serious", t: V.q }]);
    const k = await s.choose(V.q, V.opts);
    if (k === V.answer) { s.sting(true); await s.run(V.right); break; }
    firstTry = false; hearts = Math.max(1, hearts - 1); s.hearts(hearts, 5, true); s.sting(false);
    await s.run(V.wrong[k] || [{ s: "priya", f: "concerned", t: "Not quite. Think about what the trial showed." }]);
  }
  await s.run(T.outro);
  const rec = St().trials[T.id] = Object.assign(St().trials[T.id] || {}, { done: true, best: Math.max((St().trials[T.id] || {}).best || 0, hearts), firstTry: !!((St().trials[T.id] || {}).firstTry || firstTry) });
  D.save(); D.log({ mode: "trial", trial: T.id, hearts, firstTry });
  if (inStory) return { hearts, firstTry };
  await endCard(s, T, hearts, rec);
}
const WRONG = (n) => [[{ s: "dana", f: "suspicious", t: "I don't see how that contradicts what was just said." }], [{ s: "dana", f: "serious", t: "That's a real document. It just doesn't touch that statement." }],
  [{ s: "dana", f: "tired", t: "We're burning meeting time. That doesn't prove anything about this line." }]][n % 3];

// one statement on screen, waiting for: ← → (other statements), 1 press, 2 present
function crossStep(s, r, i, evidence) {
  const st = r.statements[i];
  s.say(r.witness, st.t, { face: st.f, testi: true, noWait: true, fast: true, noNext: true });
  const dots = r.statements.map((_, k) => `<i class="${k === i ? "on" : ""}"></i>`).join("");
  const ctl = s.ctl(`<button class="btn" type="button" data-a="prev" aria-label="Previous statement"><span class="kbd">←</span><span class="touch-only">◀</span></button><span class="vn-dots">${dots}</span>
    <button class="btn" type="button" data-a="next" aria-label="Next statement"><span class="kbd">→</span><span class="touch-only">▶</span></button><span class="sp"></span>
    <button class="btn" type="button" data-a="press"><span class="kbd">1</span> Press</button><button class="btn primary" type="button" data-a="present"><span class="kbd">2</span> Present evidence</button>`);
  s.panel(`<p class="vn-hint">Statement ${i + 1} of ${r.statements.length}. <span class="keys-only"><span class="kbd">←</span> <span class="kbd">→</span> move</span><span class="touch-only">◀ ▶ or a tap on the words moves</span> between statements. Press one to hear more. Present when you can prove one wrong.</p>`);
  return new Promise((res) => {
    let busy = false;
    const go = async (a) => {
      if (busy) return false; busy = true;
      if (a === "prev") res({ nav: i - 1 });
      else if (a === "next") res({ nav: i + 1 });
      else if (a === "press") res({ press: true });
      else if (a === "present") { s.ctl(""); const p = await s.record(evidence); res({ present: p }); }
      return true;
    };
    ctl.querySelectorAll("[data-a]").forEach((b) => b.addEventListener("click", () => go(b.dataset.a)));
    s.onKey = (e) => {
      if (e.key === "ArrowLeft") return go("prev");
      if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") return go("next");
      if (e.key === "1") return go("press");
      if (e.key === "2") return go("present");
      return false;
    };
  });
}

async function gameOver(s, T, inStory) {
  s.ctl(""); s.panel("");
  await s.run([{ s: "dana", f: "tired", t: "I've heard enough. We'll go with Theo's version." }, { hurt: "you", f: "concernedFear" }, { narr: "Your credibility ran out. The bad number ships." }]);
  const ses = D.inSession && D.inSession();
  const k = await s.choose("Try again?", ["Start this trial over", ses ? "Back to today's plan" : "Back to the story menu"]);
  if (k === 0) return inStory ? 0 : playTrial(T.id); else return ses ? D.home() : storyHub();
}
async function endCard(s, T, hearts, rec) {
  s.hideBox(); s.ctl("");
  const p = s.panel(`<div class="vn-end"><h2>Case closed: ${T.title}</h2><div>${"♥".repeat(hearts)}<span class="muted">${"♥".repeat(5 - hearts)}</span> credibility left · best ${rec.best} of 5</div>
    <div class="lesson"><b>${T.lesson.name}.</b> ${T.lesson.text}</div>
    <div class="vn-ctl"><button class="btn primary" type="button" id="e-hub"><span class="kbd">Enter</span> Back to the story menu</button><button class="btn" type="button" id="e-again">Play it again</button></div></div>`);
  p.querySelector("#e-hub").addEventListener("click", storyHub);
  p.querySelector("#e-again").addEventListener("click", () => playTrial(T.id));
  s.onKey = (e) => e.key === "Enter" ? (storyHub(), true) : false;
}

// =============================================================================================== story chapters
export async function playChapter(id) {
  const C = CHAPTERS.find((c) => c.id === id), s = newStage();
  if (!C) return;
  const out = { trial: null, desks: [], luck: null };
  for (const b of C.beats) {
    if (!alive(s)) return;
    if (b.steps) await s.run(b.steps);
    if (b.desk) out.desks.push(await desk(s, b.desk));
    if (b.pick) out.desks.push(await pick(s, b.pick));
    if (b.trial) {
      out.trial = await playTrial(b.trial, { inStory: true });
      s.hearts(null); s.tag("");
    }
    if (b.luck) out.luck = await luckSeason(s, { story: true });
  }
  if (!alive(s)) return;
  const prev = St().ch[C.id] || {};
  St().ch[C.id] = { done: true, at: new Date().toISOString().slice(0, 10), trial: out.trial || prev.trial || null, desks: out.desks.length ? out.desks : prev.desks || [], luck: out.luck || prev.luck || null };
  D.save(); D.log({ mode: "chapter", ch: C.id, trial: out.trial, desks: out.desks });
  s.hideBox(); s.ctl(""); s.hideStage();
  const ses = D.inSession && D.inSession(), after = ses ? () => D.next() : storyHub;
  if (ses) D.chapterDone(C.id);
  const p = s.panel(`<h1 style="margin:0 0 4px">${C.title}: the week in numbers</h1>${dashHTML(false, C.id)}<div class="vn-ctl"><button class="btn primary" type="button" id="e-hub"><span class="kbd">Enter</span> ${ses ? "Continue" : "Back to the story menu"}</button></div>`);
  p.querySelector("#e-hub").addEventListener("click", after);
  s.onKey = (e) => e.key === "Enter" ? (after(), true) : false;
}
// a quick call at your desk: find the line in one exhibit (two tries, then it's shown)
async function desk(s, d) {
  await s.run(d.intro || []);
  for (let tries = 0; tries < 3; tries++) {
    const p = await s.record([d.ev], { title: "Your call", ask: d.ask, cancel: false });
    if (!alive(s)) return false;
    if (d.answer.includes(p.line)) { if (p.el) p.el.classList.add("hit"); s.sting(true); await s.run(d.right); s.panel(""); return tries === 0; }
    s.sting(false);
    await s.run(tries === 0 ? d.wrong : [{ s: d.who || "priya", f: "explaining", t: d.reveal }]);
    if (tries >= 1) { s.panel(""); await s.run(d.right); return false; }
  }
  return false;
}
async function pick(s, d) {
  await s.run(d.intro || []);
  for (let tries = 0; ; tries++) {
    const k = await s.choose(d.q, d.opts);
    if (k === d.answer) { s.sting(true); await s.run(d.right); return tries === 0; }
    s.sting(false); await s.run((d.wrong && d.wrong[k]) || [{ s: "priya", f: "concerned", t: "Not that one. Think it through once more." }]);
  }
}

// =============================================================================================== the program dashboard
function dashHTML(compact, uptoId) {
  const s = St(), played = CHAPTERS.filter((c) => c.dash && s.ch[c.id] && s.ch[c.id].done && (!uptoId || CHAPTERS.indexOf(c) <= CHAPTERS.findIndex((x) => x.id === uptoId)));
  if (!played.length) return compact ? "" : `<div class="vn-end"><p class="muted">No weeks played yet.</p></div>`;
  const pts = [{ week: "Oct 2", rpr: 2.38, list: 227100, unsub: 0.22 }, ...played.map((c) => { const r = s.ch[c.id], good = !r.trial || r.trial.firstTry;
    return { week: c.dash.week, rpr: c.dash.rpr + (good ? 0 : -0.03), list: c.dash.list, unsub: c.dash.unsub + (good ? 0 : 0.01), note: good ? c.dash.good : c.dash.bad, title: c.title }; })];
  const last = pts.at(-1), trustVals = played.map((c) => (s.ch[c.id].trial ? s.ch[c.id].trial.hearts : 5));
  const trust = Math.round(trustVals.reduce((a, b) => a + b, 0) / trustVals.length * 20);
  const W = 520, H = 120, lo = 2.25, hi = 2.6, X = (i) => 20 + i * (W - 40) / Math.max(1, pts.length - 1), Y = (v) => H - 14 - (v - lo) / (hi - lo) * (H - 30);
  const chart = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px;height:auto"><path d="M20 ${Y(2.38)}H${W - 20}" stroke="var(--line2)" stroke-dasharray="4 4"/>
    <polyline fill="none" stroke="#6e56cf" stroke-width="3" points="${pts.map((p, i) => `${X(i)},${Y(p.rpr)}`).join(" ")}"/>
    ${pts.map((p, i) => `<circle cx="${X(i)}" cy="${Y(p.rpr)}" r="4" fill="#6e56cf"/><text x="${X(i)}" y="${Y(p.rpr) - 8}" font-size="10" text-anchor="middle" fill="var(--ink2)">$${p.rpr.toFixed(2)}</text><text x="${X(i)}" y="${H - 1}" font-size="10" text-anchor="middle" fill="var(--muted)">${p.week}</text>`).join("")}</svg>`;
  const tile = (k, v, sub) => `<div class="kpi"><div class="muted" style="font-size:.75rem">${k}</div><div style="font:800 1.25rem var(--f-display)">${v}</div><div class="note">${sub || ""}</div></div>`;
  return `<div class="vn-end" style="margin-top:12px"><h2 style="font-size:1.05rem">Program dashboard · week of ${last.week}</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin:8px 0">
      ${tile("Revenue per recipient, daily campaign", "$" + last.rpr.toFixed(2), `started at $2.38`)}${tile("List size", last.list.toLocaleString("en-US"), "")}
      ${tile("Unsubscribe rate", last.unsub.toFixed(2) + "%", "guardrail")}${tile("Team trust in your reads", trust + "%", "from credibility left in trials")}</div>
    ${chart}
    ${compact ? "" : `<ol class="steps" style="margin-top:8px">${pts.slice(1).map((p) => `<li class="step done"><span class="sn">✓</span><span class="snm">${p.week} · ${p.title}<div class="note" style="font-weight:400">${p.note}</div></span></li>`).join("")}</ol>`}
    <p class="note">Made-up numbers.</p></div>`;
}

// =============================================================================================== Press your luck
export async function playLuck() { const s = newStage(); await luckSeason(s, { story: false }); }
const THEO_GREEN = ["IT'S GREEN! Ship it!", "Ninety-five! What are we waiting for?", "Green is money. Green is GOOD.", "Look at that chance to win. Ship it!"];
async function luckSeason(s, { story }) {
  const seed = (Date.now() % 2147483647) | 0, tests = LK.season(seed);
  const ghost = LK.play(tests, LK.RULES.theo);
  s.bg("desk"); s.hearts(null); s.tag("Press your luck · six weeks on the daily campaign");
  if (!St().luck.seen || story) {
    await s.run([{ s: "dana", f: "explaining", t: "Six weeks on the daily campaign row. You run tests one after another. Each one reads on day 7, but you can ship early any day, or stop and keep A." },
      { s: "theo", f: "smileBig", t: "And I play the same tests, my way. When it's green, I ship." },
      { s: "priya", f: "calm", t: "At the end, a holdout shows what each shipped change really did. The game knows the truth for every test. Most ideas do nothing." },
      { s: "dana", f: "serious", t: "I'll budget the quarter on what you promise me. Don't promise what isn't there." }]);
    St().luck.seen = true;
  }
  let left = LK.LUCK.days, k = 0;
  const log = [];
  s.compact(true);
  while (left > 0 && k < tests.length && alive(s)) {
    const t = tests[k++];
    const r = await luckTest(s, t, left, log.length + 1);
    if (!alive(s)) return null;
    left -= r.day; log.push(LK.entry(t, r.day, r.call));
    await luckReveal(s, t, r, left);
  }
  if (!alive(s)) return null;
  const me = LK.totals(log), sp = ghost;
  St().luck.best = !St().luck.best || me.trust > St().luck.best.trust || (me.trust === St().luck.best.trust && me.real > St().luck.best.real) ? { trust: me.trust, real: me.real, at: new Date().toISOString().slice(0, 10) } : St().luck.best;
  St().luck.seasons = (St().luck.seasons || 0) + 1; D.save(); D.log({ mode: "luck", me, theo: { claimed: sp.claimed, real: sp.real, trust: sp.trust, tests: sp.tests } });
  // the holdout reads
  s.compact(false); s.tag("Quarter end · the holdout reads"); s.ctl("");
  const f = (x) => (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(1) + "%";
  s.panel(luckTable(log, me, sp));
  await s.run([{ s: "priya", f: "explaining", t: `The holdout is in. You shipped ${me.ships} of ${me.tests} tests and promised ${f(me.claimed)}. They really added ${f(me.real)}.` },
    { s: "theo", f: sp.gap > 5 ? "concerned" : "smile", t: `I ran ${sp.tests} tests and shipped ${sp.ships}. I promised ${f(sp.claimed)}. Real: ${f(sp.real)}.${sp.falseWins ? ` ${sp.falseWins} of my wins did nothing at all.` : ""}` },
    me.real < 0 ? { s: "dana", f: "concerned", t: `Your promises were close, but the changes you shipped lost money: ${f(me.real)} in real terms. Ship on wins, not on hope.` }
    : me.trust >= 80 ? { s: "dana", f: "smile", t: `Your forecast was within ${Math.abs(me.gap).toFixed(1)} points. I can plan inventory on your numbers. Trust: ${me.trust}.` }
      : { s: "dana", f: "tired", t: `You promised ${f(me.claimed)} and delivered ${f(me.real)}. I ordered beans for the difference. Trust: ${me.trust}.` },
    sp.real > me.real && me.trust > sp.trust ? { s: "priya", f: "calm", t: "Theo found more real lift: he got through more tests. But his promises were off by " + sp.gap.toFixed(1) + " points, and nobody can tell which of his wins are real." }
      : { s: "priya", f: "calm", t: "Early greens fade. A test stopped on its first good day overstates the win, and sometimes there was no win at all." }]);
  const lesson = `<div class="lesson"><b>Peeking.</b> Checking every day and shipping on the first green day calls false winners far more often than 1 in 20, and every early win looks bigger than it is (the winner's curse). Reading on the planned day keeps your promises honest.</div>`;
  s.hideBox(); s.hideStage();
  const p = s.panel(luckTable(log, me, sp) + `<div class="vn-end">${lesson}<div class="vn-ctl"><button class="btn primary" type="button" id="l-done"><span class="kbd">Enter</span> ${story ? "Continue" : "Back to the story menu"}</button>${story ? "" : `<button class="btn" type="button" id="l-again">Play another season</button>`}</div></div>`);
  return new Promise((res) => {
    const done = () => { s.panel(""); s.hideStage(false); if (story) res(me); else storyHub(); return true; };
    p.querySelector("#l-done").addEventListener("click", done);
    const ag = p.querySelector("#l-again"); if (ag) ag.addEventListener("click", () => playLuck());
    s.onKey = (e) => e.key === "Enter" ? done() : false;
  });
}
function luckTable(log, me, sp) {
  const f = (x) => (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(1) + "%";
  return `<div class="exh"><h3>Your season</h3><table><tr><th>Test</th><th>Stopped</th><th>Call</th><th>Promised</th><th>Truth</th></tr>
    ${log.map((x) => `<tr><td>${esc(x.name)}</td><td>day ${x.day}</td><td>${x.call === "ship" ? "Shipped B" : "Kept A"}</td><td>${x.call === "ship" ? f(x.claimed) : "–"}</td>
      <td style="color:${x.truth > 0 ? "var(--win)" : x.truth < 0 ? "var(--loss)" : "var(--muted)"}">${x.truth === 0 ? "no effect" : f(x.truth)}${x.call === "ship" && x.truth <= 0 ? " ✗" : x.call === "keep" && x.truth > 0 ? " (missed)" : ""}</td></tr>`).join("")}</table>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:10px">
      <div class="kpi"><div class="muted">You</div><b>promised ${f(me.claimed)} · real ${f(me.real)}</b><div class="note">${me.tests} tests, ${me.ships} shipped, trust ${me.trust}</div></div>
      <div class="kpi"><div class="muted">Theo (ships the first green day)</div><b>promised ${f(sp.claimed)} · real ${f(sp.real)}</b><div class="note">${sp.tests} tests, ${sp.ships} shipped, trust ${sp.trust}</div></div></div></div>`;
}
// one test, day by day. Enter: another day. 1: ship B now. 2: stop, keep A. On the read date: 1 or 2.
function luckTest(s, t, left, n) {
  return new Promise((res) => {
    let d = 1, wasGreen = false;
    const draw = async () => {
      const x = LK.readAt(t, d), at = d >= LK.LUCK.read || d >= left;
      const P = LK.path(t).slice(0, d);
      s.panel(`<div class="exh"><h3>Test ${n}: ${esc(t.name)}</h3><div class="sub">Day ${d} of ${LK.LUCK.read}${at ? " · <b>read date</b>" : ""} · ${left - d} days left on the row after today · revenue per recipient decides</div>
        ${exhibitHTML({ kind: "results", title: "", goal: [{ id: "g0", name: "Revenue per recipient", a: "$" + x.a.toFixed(2), b: "$" + x.b.toFixed(2), subA: (x.n).toLocaleString("en-US") + " recipients", subB: (x.n).toLocaleString("en-US") + " recipients", pct: x.pct, lo: x.lo, hi: x.hi, ctwUp: x.ctw, better: "up", span: 12 }] }).replace('<div class="exh">', '<div>')}
        ${ctwChart(P, null)}</div>`);
      s.ctl(at ? `<span class="vn-hint">Read date. Make the call.</span><span class="sp"></span><button class="btn" type="button" data-a="ship"><span class="kbd">1</span> Ship B</button><button class="btn" type="button" data-a="keep"><span class="kbd">2</span> Keep A</button>`
        : `<button class="btn primary" type="button" data-a="day"><span class="kbd">Enter</span> Another day</button><span class="sp"></span><button class="btn" type="button" data-a="ship"><span class="kbd">1</span> Ship B now</button><button class="btn" type="button" data-a="keep"><span class="kbd">2</span> Stop, keep A</button>`)
        .querySelectorAll("[data-a]").forEach((b) => b.addEventListener("click", () => act(b.dataset.a)));
      // Theo reacts to what changed, not every day
      if (x.ctw >= 0.95 && !at) { wasGreen = true; s.say("theo", THEO_GREEN[(t.i + d) % THEO_GREEN.length], { face: "smileBig", noWait: true, noNext: true }); }
      else if (wasGreen && x.ctw < 0.8) { wasGreen = false; s.say("theo", "Ugh. It was green yesterday.", { face: "concerned", noWait: true, noNext: true }); }
      else if (at) s.say("priya", "Read date. Whatever it says now is the result.", { face: "calm", noWait: true, noNext: true });
      else if (d === 1) s.say("theo", n === 1 ? "Day one! Anything can happen." : ["Next one. I've got a good feeling.", "Here we go again.", "Ooh, I like this idea."][n % 3], { face: "smile", noWait: true, noNext: true });
      s.onKey = (e) => e.key === "Enter" || e.key === " " ? act(at ? null : "day") : e.key === "1" ? act("ship") : e.key === "2" ? act("keep") : false;
    };
    const act = (a) => {
      if (!a) return true;
      if (a === "day") { d++; draw(); return true; }
      s.onKey = null; res({ day: d, call: a }); return true;
    };
    draw();
  });
}
async function luckReveal(s, t, r, left) {
  const P = LK.path(t), x = P[r.day - 1], f = (v) => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(1) + "%";
  s.ctl("");
  s.panel(`<div class="exh"><h3>${esc(t.name)}: the truth</h3><div class="sub">You ${r.call === "ship" ? `shipped B on day ${r.day}, at ${f(x.pct)} and ${(x.ctw * 100).toFixed(0)}% chance to win` : `kept A on day ${r.day}`}. Gray: what the next days would have shown.</div>${ctwChart(P, r.day)}
    <p><b>True effect: ${t.truth === 0 ? "none. A and B were the same in every way that matters" : f(t.truth)}.</b> ${r.call === "ship" ? `You promised ${f(x.pct)}.` : ""}</p></div>`);
  const line = r.call === "ship" && x.ctw < LK.LUCK.ship
    ? [{ s: "priya", f: "concerned", t: `You shipped it at ${(x.ctw * 100).toFixed(0)}% chance to win. The plan ships only at 95% or more on the read date. ${t.truth > 0 ? "It happened to help, this time." : t.truth < 0 ? "And it really did hurt." : "And it did nothing."}` }]
    : r.call === "ship"
    ? (t.truth <= 0 ? [{ s: "priya", f: "concerned", t: t.truth === 0 ? "That one did nothing. The green was noise." : "That one actually hurt. The early green was noise on top of a loss." }]
      : [{ s: "priya", f: "smile", t: x.pct > t.truth * 1.5 ? `Real win. Smaller than it looked on day ${r.day}, though: ${f(t.truth)}, not ${f(x.pct)}.` : `Real win, and about the size you promised.` }])
    : (t.truth > 0 ? [{ s: "priya", f: "calm", t: `That one was really worth ${f(t.truth)}. Sometimes a real effect doesn't show in time. That's the price of a fair test.` }]
      : [{ s: "priya", f: "calm", t: t.truth === 0 ? "Nothing there. Keeping A was right." : "It was hurting. Keeping A was right." }]);
  await s.run(line);
}
function ctwChart(P, stop) {
  const W = 420, H = 110, X = (d) => 30 + (d - 1) * (W - 50) / (LK.LUCK.read - 1), Y = (c) => 10 + (1 - c) * (H - 30);
  const all = stop ? P : P, seen = stop ? P.slice(0, stop) : P;
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px;height:auto;margin-top:6px"><text x="2" y="${Y(0.95) + 4}" font-size="9" fill="var(--muted)">95%</text>
    <line x1="30" x2="${W - 20}" y1="${Y(0.95)}" y2="${Y(0.95)}" stroke="#18794e" stroke-dasharray="4 3"/><line x1="30" x2="${W - 20}" y1="${Y(0.5)}" y2="${Y(0.5)}" stroke="var(--line2)"/>
    ${stop ? `<polyline fill="none" stroke="#a5a9c2" stroke-width="2" stroke-dasharray="4 3" points="${all.map((p) => `${X(p.d)},${Y(p.ctw)}`).join(" ")}"/>` : ""}
    <polyline fill="none" stroke="#6e56cf" stroke-width="3" points="${seen.map((p) => `${X(p.d)},${Y(p.ctw)}`).join(" ")}"/>
    ${seen.map((p) => `<circle cx="${X(p.d)}" cy="${Y(p.ctw)}" r="3.5" fill="${p.ctw >= 0.95 ? "#18794e" : "#6e56cf"}"/>`).join("")}
    ${Array.from({ length: LK.LUCK.read }, (_, k) => `<text x="${X(k + 1)}" y="${H - 2}" font-size="9" text-anchor="middle" fill="var(--muted)">d${k + 1}</text>`).join("")}
    <text x="${W - 20}" y="10" font-size="9" text-anchor="end" fill="var(--muted)">chance to win, by day</text></svg>`;
}
export { CAST };
