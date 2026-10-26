// Test Board v3: v2's game run as daily sessions (warm-up review, new steps in order, a story chapter, done for today).
// What changed from v2 and why: ../../shared/research/pacing-immersion-analysis.md and this folder's README.md.
// Below is v2's page with those changes. Test Board v2, the page: map, key drill, the experiment screen (a copy of GrowthBook's), the daily round.
// All rules and cases come from engine.mjs. State saves to the local server (.kb/test-board/progress.json),
// with localStorage as a fallback, and every rep is logged (reps.jsonl) for coaching.
import { TOUCH, audioCtx, play as playClip, stop as stopClip } from "./touch.mjs";
import * as E from "./engine.mjs";
import { LESSONS, LESSON_CARD } from "./lessons.mjs";
import { initStory, storyHub, storyKey, storyActive, storyStop, playChapter } from "./story.mjs";
import { CHAPTERS } from "./chapters.mjs";
import * as Z from "./session.mjs";
import * as W from "./world.mjs";
import * as H from "./health.mjs";
import * as OV from "./overview.mjs";
import * as Q from "./quarter.mjs";
import * as SZ from "./sizing.mjs";
import * as PR from "./priority.mjs";
import * as RM from "./room.mjs";
import * as MO from "./money.mjs";
import * as SL from "./slow.mjs";
import { initCoach, coachToggle, coachRecord, coachRefresh } from "./coach.mjs";
import { RELEASE } from "./release.mjs";
// the Fernhill cast and office in pixel art (games/shared/pixel, made with pxl): framing only, the tool screens stay GrowthBook
const PXB = RELEASE ? "./px/" : "/px/";
const pxFace = (who, face = "calm", cls = "pxf") => `<img class="${cls}" src="${PXB}sprites/face_${who}_${face}.png" alt="" aria-hidden="true">`;
const pxBanner = (scene, who, face, name, line) => `<div class="pxban"><img class="pxroom" src="${PXB}scenes/${scene}.png" alt="" aria-hidden="true">
  <div class="pxsay">${pxFace(who, face)}<div><b>${name}</b><span>${line}</span></div></div></div>`;
// v3 phase 2: Health in six steps (health.mjs) replaces v2's single U7 drill. Registered into the engine's tables here,
// so the scheduler, grading and labels treat them like any other step. v2 loads its own page and never sees them.
Object.assign(E.UNITS, H.UNITS7); E.STEPS.U7 = H.STEPS7; E.CALLS.push(...H.CALLS7); Object.assign(LESSONS, H.LESSONS7);
// phase 3: the Overview tab in three steps (overview.mjs), registered the same way
Object.assign(E.UNITS, OV.UNITS8); E.STEPS.U8 = OV.STEPS8; E.CALLS.push(...OV.CALLS8); Object.assign(LESSONS, OV.LESSONS8);
// phase 4: Sizing on the Power Calculator (sizing.mjs)
Object.assign(E.UNITS, SZ.UNITS9); E.STEPS.U9 = SZ.STEPS9; E.CALLS.push(...SZ.CALLS9); Object.assign(LESSONS, SZ.LESSONS9);
// unit 5: Which goes first? on the Ideas list (priority.mjs)
Object.assign(E.UNITS, PR.UNITS10); E.STEPS.U10 = PR.STEPS10; Object.assign(LESSONS, PR.LESSONS10);
// units 7 and 8: Marketing QA's flow map and roadmap (room.mjs)
Object.assign(E.UNITS, RM.UNITS11, RM.UNITS12); E.STEPS.U11 = RM.STEPS11; E.STEPS.U12 = RM.STEPS12; Object.assign(LESSONS, RM.LESSONS11, RM.LESSONS12);
// unit 9: Money rows on Results (money.mjs)
Object.assign(E.UNITS, MO.UNITS13); E.STEPS.U13 = MO.STEPS13; Object.assign(LESSONS, MO.LESSONS13);
// unit 10: Slow metrics (slow.mjs), the year game's prerequisite
Object.assign(E.UNITS, SL.UNITS14); E.STEPS.U14 = SL.STEPS14; Object.assign(LESSONS, SL.LESSONS14);
const mkCase = (seed, kind, stage, cu) => SL.UNITS14[cu] ? SL.makeSlow(seed, kind, stage, cu, W.TODAY) : MO.UNITS13[cu] ? MO.makeMoney(seed, kind, stage, cu, W.TODAY) : RM.UNITS11[cu] || RM.UNITS12[cu] ? RM.makeRoom(seed, kind, stage, cu) : PR.UNITS10[cu] ? PR.makePriority(seed, kind, stage, cu) : SZ.UNITS9[cu] ? SZ.makeSizing(seed, kind, stage, cu) : H.UNITS7[cu] ? H.makeHealth(seed, kind, stage, cu, W.TODAY) : OV.UNITS8[cu] ? OV.makeOverview(seed, kind, stage, cu, W.TODAY) : E.makeCase(seed, kind, stage, cu, W.TODAY);
// tabs a clean read needs: a broken split found on Health stops the read there (Health steps, the whole page, the quarter)
const needTabs = (c, tabs) => (H.UNITS7[c.unit] || c.unit === "U8c" || c.unit === "Q") && c.srmP < E.SRM_ALARM ? tabs.filter((t) => t === "h") : tabs;

const $ = (id) => document.getElementById(id);
const main = $("main");
const today = () => new Date().toLocaleDateString("en-CA");
const IMPL = ["O", "A", "H", "R", "W"];                         // keys this slice has built
const TAB_OF = { O: "o", A: "a", H: "h" }, KEY_OF = { o: "O", a: "A", h: "H" };
const TAB_NAME = { o: "Overview", a: "Results", h: "Health" };
const STAGE = ["Meet", "Clear", "Realistic"];
const KIND_NAMES = { fairOdd: "odd-but-fair splits", rowChange: "finding what changed", rowAssign: "finding who got B", rowCount: "finding who was counted",
  rowWhen: "finding when", rowResult: "finding the result", fair: "fair tests", chosen: "chosen groups", after: "counting after the split", beforeAfter: "before-and-after comparisons",
  share: "bars that share a week", apart: "bars a week apart", edge: "bars that touch end to end",
  fitsNear: "a free row next to a busy week", fitsCol: "sharing weeks with another row", fitsCrea: "creative changes next to offers", fitsOffer: "offers in free weeks",
  fitsEdge: "cards right beside the freeze", reach: "who reaches an email", never: "who never gets an email", email: "placing the coin before an email",
  wait: "placing the coin before a wait", dilute: "how much a diluted effect shows", splitRight: "splits in the right spot", splitEarly: "splits placed too early",
  splitLate: "splits placed after the change", fStrategy: "finding the test strategy", fMetric: "finding the winning metric", fSize: "finding the test size",
  fDuration: "finding the test duration", fSend: "finding the send time", setupOk: "setups that are right", personalized: "personalized variations", small: "lists under 400,000",
  orders: "order briefs", clicks: "click briefs", opensGoal: "'get it read' briefs", sms: "SMS metrics", wrongMetric: "the wrong winning metric", localSize: "local-time sends",
  tooShort: "too-short windows", full: "100% tests", autoDist: "automatic distribution", needsSplit: "waits that need a split", ready: "clean pre-flights",
  twoChanged: "two changes at once", open: "open rate's base", click: "click rate's base", order: "placed order rate's base", rpr: "revenue per recipient's base",
  aov: "average order value's base", cto: "click-to-open's base", unsub: "unsubscribe rate's base", entrant: "orders per entrant's base", jDecide: "deciding metrics",
  jGuard: "guardrails", jExplain: "explaining metrics", realNum: "real lifts", machineOpens: "machine opens", botClicks: "bot clicks", campaign: "campaign deciders",
  subject: "subject-line deciders", flow: "flow deciders", form: "sign-up form deciders", aovTrap: "the average order value trap", perClick: "per-click numbers",
  perReceiver: "per-receiver flow numbers", rprOk: "sound per-recipient reads", entrantOk: "sound per-entrant reads", attributed: "attributed revenue", trustNum: "caused numbers",
  gbOk: "clean metric setups", rPct: "finding % Change", rCtw: "finding Chance to Win", rCi: "finding the CI graph", rBase: "finding Baseline", rVar: "finding Variation",
  above: "ranges above zero", below: "ranges below zero", cross: "ranges across zero", worthIt: "results worth acting on", tooSmall: "real but too small", cantTell: "can't-tell results",
  earlyWin: "early wins", earlyFlat: "early flat results", due: "results at the read date", dueFlat: "flat results at the read date", guardBad: "broken guardrails",
  guardOk: "guardrails that held", guardWobble: "guardrail wobble", opensDecide: "opens as the decider", noGuard: "missing guardrails", codeBroken: "broken codes and links", sendTime: "different send times", fairUnit: "one person, one group", mixedUnit: "the same person in both groups", carryover: "carryover from old tests", goodPlan: "sound plans", fits: "cards that fit", busy: "busy rows", offers: "offer clashes", freeze: "the freeze", noReader: "missing readers", place: "placing cards",
  ship: "clean wins", lossGoal: "clear losses", guardBreach: "guardrail breaches", running: "reading early",
  inconclusive: "flat results at the read date", srm: "broken splits", tooGood: "too good to be true", switched: "a goal changed after launch",
  oHyp: "finding the hypothesis", oType: "finding the change type", oGoal: "finding the goal metric", oGuard: "finding the guardrails", oRead: "finding the read date",
  small: "bold ideas on smaller surfaces", big: "ideas on bigger surfaces", fast: "quick smaller wins", sameRow: "ideas on the same row", offers: "two offers at once", both: "ideas that don't compete", bothOffer: "an offer and a creative change on different rows",
  run: "tests that fit their slot", bolder: "tests that need a bolder change", skip: "tests too small to see", welcome: "welcome flow sizing",
  profLoss: "revenue up, profit down", profFlat: "revenue up, profit flat", profWin: "offers that made money", creaWin: "creative wins with no discount",
  beWin: "revenue past the break-even line", beLoss: "green revenue short of break-even", beCross: "revenue across the break-even line",
  moneyGuard: "a guardrail breach on a money test", moneyRunning: "money tests before their read date",
  win30: "30-day windows", win60: "60-day windows", win90: "90-day windows", slowEarlyWin: "green rows still in the window", slowEarlyFlat: "flat rows still in the window",
  slowDueWin: "slow wins at the read date", slowDueFlat: "slow flat results at the read date", slowEntry: "slow tests still taking entrants", slowDueLoss: "slow losses at the read date",
  mostPeople: "finding the flow with the most people", mostMoney: "finding the flow with the most money", mostBelow: "finding the flow furthest below its type",
  qProtect: "big flows above their type", qImprove: "big flows below their type", qGrow: "small flows above their type", qReview: "small flows below their type",
  roomPlain: "finding the most room", roomFar: "a small flow far below its type", roomProtect: "a big flow that beats its type", roomTwo: "two big flows below their type",
  colLift: "the 10% lift column", colExp: "the expected value", colRev: "the revenue column", colSee: "the 4-week chip", colEase: "the ease score",
  seeBold: "flows a test can answer", seeJudge: "flows a test can't answer", seeTop: "a top row a test can't answer", seeLow: "a low row a test can answer",
  nextSkip: "skipping a top row no test can answer", nextTop: "a top row a test can answer", nextTwo: "skipping two rows", cart: "cart flow sizing", post: "post-purchase sizing",
  secWin: "a green secondary metric on a flat goal", secLoss: "a red secondary metric on a winning goal", secMix: "a green secondary metric on a losing goal", win: "clean wins", flat: "flat goals" };
const UNLOCK_TEXT = {
  U1g: "Unit 2, the board, in seven steps like these, and the daily round (12 quick calls a day from everything you've passed). Unit 1 is done.",
  U2g: "Results: GrowthBook's Results tab in six steps, from one row up to making the call.",
  U6f: "Health: the Health tab and the H key, in six steps, to check you can trust a result before you read it. The daily round now mixes in results to call.",
  U7f: "Overview: the plan every result answers to, in three steps. Results in the daily round now come with a Health tab.",
  U9d: "Which goes first? Ranking ideas by what they're worth, in three steps. And in your next quarter you size each card yourself: its length comes from the calculator, and a test sized too short can miss a real win.",
  U10c: "Prioritizing is done: in the quarter, each idea now shows what it's worth a week if it wins and per week of testing. Next, Marketing QA's map of every flow: where's the room to earn more?",
  U11c: "The flow map is done. Next, Marketing QA's roadmap: which flows a test can answer, and which one gets the next test slot.",
  U12c: "The roadmap is done. Next, money rows on Results: an offer can lift revenue and still lose money.",
  U14b: "Slow metrics are done. Once you've passed a quarter, the year opens: 52 Mondays of 2027 with one goal.",
  U13c: "Money rows are done. Your next quarter counts profit: offers show their break-even line, and an offer that lifted revenue but lost profit is a ship that hurt.",
  U8c: "Sizing: GrowthBook's Power Calculator in five steps. Run the quarter is open too: thirteen Mondays on the board and GrowthBook's pages. Plan the board, read what's ready, make the calls, and watch what they add up to.",
  U3g: "Unit 4, set it up and check it: Klaviyo's A/B form, flow A/B settings and the pre-flight check.",
  U4g: "Unit 5, which number decides: denominators, the three jobs a metric can have, machine-made numbers and attribution.",
  U5g: "Unit 6, read one result, in seven steps from one GrowthBook row to the four-line write-up.",
  U6g: "MS1, First four Mondays: four weeks on the daily campaign that use everything from Units 1 to 6.",
  MS1: "Unit 7, which adds the Health tab and the H key, and the daily round now mixes in results to call.",
  U7: "Broken splits and other trust problems now show up in the daily round, mixed with everything from Unit 6.",
};

let S = { v: 1, units: {}, keys: {}, daily: {}, days: [], sound: true, intro: {}, lessons: {} };
// Dev mode (?dev, sticky on this device until ?dev=0 or the nav button): every step, unit, MS1, chapter and trial open,
// on a separate save (progress-v3-dev.json, copied from the real v3 save the first time) so jumping around never touches it.
// Embed (?embed=U2a&save=office|office-dev): the office game (games/office) opens one step at its test board desk,
// in an iframe, on its own save. No sidebar. A pass tells the office (postMessage), and "Back to the office" closes the desk.
const QS0 = new URLSearchParams(location.search);
const EMBED = QS0.get("embed") || null, EMBED_SAVE = QS0.get("save") === "office-dev" ? "office-dev" : "office";
const toOffice = (msg) => { try { parent.postMessage(Object.assign({ src: "test-board" }, msg), location.origin); } catch (e) { /* not framed */ } };
const DEV = EMBED ? false : (() => {
  const q = new URLSearchParams(location.search).get("dev");
  try { if (q === "0") localStorage.removeItem("tb3dev"); else if (q !== null) localStorage.setItem("tb3dev", "1"); return localStorage.getItem("tb3dev") === "1"; }
  catch (e) { return q !== null && q !== "0"; }
})();
const SAVE_V = EMBED ? "3" + EMBED_SAVE : DEV ? "3dev" : "3", LS_KEY = EMBED ? "tb3-" + EMBED_SAVE : DEV ? "tb3-dev" : "tb3";
let KEYMAP = { keys: [], game_only: [] };
// ONLINE: the Marketing QA server answered, so saves, narration and the coach run there. Otherwise (the public copy on a
// static host) the save lives in this browser, narration is off and the coach copies a question for any AI chat instead.
let ONLINE = false;
let view = "map", P = null, D = null, MQ = null;   // MQ: the sidebar's Marketing QA screen { v: "reg" | "road", c }

// ---------- storage ----------
async function load() {
  let got = null;
  if (!RELEASE) try { const r = await fetch("/api/tb/progress?v=" + SAVE_V); if (r.ok && /json/.test(r.headers.get("content-type") || "")) { got = await r.json(); ONLINE = true; } } catch (e) { /* offline */ }
  if (!got || !got.v) { try { got = JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch (e) { /* blocked */ } }
  adopt(got && got.v ? got : {});   // a first visit starts from an empty save
  try { KEYMAP = await (await fetch(ONLINE ? "/test-board/keymap.json" : "keymap.json")).json(); } catch (e) { /* keys still work, overlay is thinner */ }
}
function adopt(got) {
  S = Object.assign({ v: 1, units: {}, keys: {}, daily: {}, days: [], sound: true, intro: {}, lessons: {} }, got);
  S.lessons = S.lessons || {};
  S.ms1 = S.ms1 || {};
  for (const u of Object.keys(E.UNITS)) S.units[u] = Object.assign(E.newUnitState(), S.units[u] || {});
  S.v3 = S.v3 || { ivl: {}, day: null, sessions: [] };
}
// Several devices can play (desktop, phone over Tailscale). Each save carries rev + 1; the server refuses a save from a
// stale copy and sends the newer state back, which this page then loads (tb_store.save_progress).
function fromOtherDevice(got) {
  adopt(got); soundLabel(); voiceLabel();
  if (view !== "map" && view !== "today") coach("Newer progress from your other device. Loaded it.");
  renderToday();
}
let saveT = null;
function save() {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    S.rev = (S.rev || 0) + 1;
    const body = JSON.stringify(S);
    try { localStorage.setItem(LS_KEY, body); } catch (e) { /* blocked */ }
    if (ONLINE) fetch("/api/tb/progress?v=" + SAVE_V, { method: "POST", headers: { "Content-Type": "application/json" }, body })
      .then((r) => r.json()).then((j) => { if (j && j.stale && j.state && j.state.v) fromOtherDevice(j.state); }).catch(() => {});
  }, 300);
}
// coming back to this tab: if another device saved since, load its state (the map only, so a rep in progress isn't cut)
document.addEventListener("visibilitychange", () => {
  if (document.hidden || !ONLINE) return;
  fetch("/api/tb/progress?v=" + SAVE_V).then((r) => r.json()).then((got) => {
    if (got && got.v && (got.rev || 0) > (S.rev || 0) && (view === "map" || view === "today" || view === "done")) fromOtherDevice(got);
  }).catch(() => {});
});
function logRep(rep) {
  if (!ONLINE) return;
  fetch("/api/tb/rep", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.assign({ v: 3 }, DEV ? { dev: true } : {}, rep)) }).catch(() => {});
}
function markDay() { if (!S.days.includes(today())) S.days = S.days.concat(today()).slice(-90); }

// ---------- sound ----------
function tone(freqs, dur, type, vol) {
  if (!S.sound) return;
  try {
    const actx = audioCtx(); if (!actx) return;
    const t = actx.currentTime;
    freqs.forEach((f, k) => {
      const o = actx.createOscillator(), g = actx.createGain(), at = t + k * dur * 0.6;
      o.type = type || "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol || 0.07, at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(g); g.connect(actx.destination); o.start(at); o.stop(at + dur + 0.02);
    });
  } catch (e) { /* no audio */ }
}
const semi = (n) => 523.25 * Math.pow(2, n / 12);
const SND = {
  clean: (c) => tone([semi(c - 1), semi(c + 3), semi(c + 6)], 0.16, "triangle", 0.07),
  ok: (c) => tone([semi(c - 1)], 0.14, "triangle", 0.05),
  miss: () => tone([196, 174.6], 0.18, "sine", 0.06),
  pass: () => tone([semi(0), semi(4), semi(7), semi(12)], 0.2, "triangle", 0.08),
  tick: () => tone([semi(7)], 0.07, "square", 0.025),
};

// ---------- narration: Kokoro reads the lessons, Meet-stage reps, guided checks, misses and passes ----------
// Same voice as Lifecycle Files (af_heart through Talk on :8766, via /api/tb/tts and lf_voice.py). Anything new cuts off what's
// playing. If Talk is down the page stays quiet. The sidebar's Voice button turns it off (saved in progress).
const VO = { audio: null, seq: 0, urls: new Map() };
const voOn = () => ONLINE && S.voice !== false;
function voUrl(text) {   // one fetch per line, the last 40 kept as blob URLs
  if (VO.urls.has(text)) { const u = VO.urls.get(text); VO.urls.delete(text); VO.urls.set(text, u); return u; }
  const u = fetch("/api/tb/tts?text=" + encodeURIComponent(text)).then((r) => r.ok ? r.blob() : null).then((b) => b && URL.createObjectURL(b)).catch(() => null);
  VO.urls.set(text, u);
  while (VO.urls.size > 40) { const [k, old] = VO.urls.entries().next().value; VO.urls.delete(k); old.then((x) => x && URL.revokeObjectURL(x)); }
  return u;
}
const voLines = (parts) => parts.flat(Infinity).filter(Boolean).map((t) => String(t).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()).filter(Boolean)
  .flatMap((t) => t.length <= 240 ? [t] : t.match(/[^.!?]+[.!?]*\s*/g).reduce((a, x) => { if (a.length && (a[a.length - 1] + x).length <= 240) a[a.length - 1] += x; else a.push(x); return a; }, []));
function voPrefetch(...parts) { if (voOn()) voLines(parts).reduce((p, t) => p.then(() => voUrl(t)), Promise.resolve()); }
function hush() { VO.seq++; stopClip(); }
async function narrate(...parts) {
  hush(); const my = VO.seq;
  if (!voOn()) return;
  const lines = voLines(parts);
  for (const [i, t] of lines.entries()) {
    const url = await voUrl(t); if (my !== VO.seq) return;
    if (lines[i + 1]) voUrl(lines[i + 1]);                  // the next piece renders while this one plays
    if (!url) continue;
    if (!(await playClip(url))) return;                     // no tap or key on the page yet: the browser blocks sound
    if (my !== VO.seq) return;
  }
}
const txt = (sel) => { const el = main.querySelector(sel); return el ? el.textContent : ""; };
// what a Meet-stage rep opens with: the heading, the line under it, the question, the hint
const repIntro = () => [txt(".xh h1"), txt(".meta"), txt(".sq"), P && P.c.hint];

// ---------- coach + overlay ----------
let coachT = null;
function coach(msg) { const c = $("coach"); c.textContent = msg; c.classList.add("on"); clearTimeout(coachT); coachT = setTimeout(() => c.classList.remove("on"), 1700); }
function unlockedKeys() { return KEYMAP.keys.filter((k) => IMPL.includes(k.key) && S.intro[k.unit]); }
function toggleOverlay(force) {
  const o = $("overlay"), show = force === undefined ? o.hidden : force;
  if (show) {
    const rows = unlockedKeys().map((k) => [k.key, k.label + ": " + k.what])
      .concat((KEYMAP.game_only || []).map((k) => [k.key, k.label]));
    $("keytable").innerHTML = rows.map((r) => `<tr><td><span class="kbd">${r[0]}</span></td><td>${r[1]}</td></tr>`).join("") ||
      "<tr><td>No keys yet.</td></tr>";
  }
  o.hidden = !show;
}
function useKey(K, viaKey) {
  const k = (S.keys[K] = S.keys[K] || { key: 0, click: 0 });
  if (viaKey) { k.key++; if (P) P.keysUsed.push(K); }
  else { k.click++; if (P) P.clicks.push(K); if (k.click <= 4) coach(`You clicked. The key was ${K}.`); }
}

// ---------- the map ----------
function unitStats(st) {
  const recent = st.reps.slice(-20), right = recent.filter((r) => r.right);
  const ms = right.map((r) => r.ms).sort((a, b) => a - b);
  return { n: st.reps.length, acc: recent.length ? Math.round(right.length / recent.length * 100) : 0,
           clean: recent.length ? Math.round(recent.filter((r) => r.clean).length / recent.length * 100) : 0,
           med: ms.length ? (ms[Math.floor((ms.length - 1) / 2)] / 1000).toFixed(0) : "–" };
}
function pipsHTML(reps, n = 8) {
  let h = "";
  const last = reps.slice(-n);
  for (let i = 0; i < n; i++) { const r = last[i]; h += `<span class="pip${r ? (r.clean ? " clean" : r.right ? " ok" : " miss") : ""}"></span>`; }
  return `<span class="pips" aria-label="last ${n} reps">${h}</span>`;
}
// The v3 path (Brent's call, 2026-10-14): only games played on the tool screens he'll use to run a testing program, the
// Board and GrowthBook's Results and Health tabs. U1, U3, U4, U5, the U6g write-up, MS1 and story mode are out of the path
// (code kept, for a later "testing best practices" game). Preferences: ../PREFERENCES.md. Build plan: PLAN.md.
const PATH = RELEASE ? RELEASE.steps : [...E.STEPS.U2, ...E.STEPS.U6.filter((u) => u !== "U6g"), ...E.STEPS.U7, ...E.STEPS.U8, ...E.STEPS.U9, ...E.STEPS.U10, ...E.STEPS.U11, ...E.STEPS.U12, ...E.STEPS.U13, ...E.STEPS.U14];
const UNAME = { U2: "Board", U6: "Results", U7: "Health", U8: "Overview", U9: "Sizing", U10: "Priority", U11: "Flow map", U12: "Roadmap", U13: "Money", U14: "Slow metrics" };   // v3 names units by the screen they're played on
const pathUnits = () => Object.fromEntries(PATH.map((u) => [u, S.units[u]]));
const NEEDS = Object.fromEntries(PATH.map((u, i) => [u, PATH[i - 1] || null]));   // each unit opens when the one before it passes
const done = (u) => u === "MS1" ? !!(S.ms1 && S.ms1.passed) : S.units[u].passed;
const isStep = (u) => !!(E.UNITS[u] && E.UNITS[u].parent);
const stepsOf = (u) => E.STEPS[E.UNITS[u].parent].filter((x) => PATH.includes(x));
const stepTitle = (u) => `${UNAME[E.UNITS[u].parent] || E.UNITS[u].parent} · step ${E.UNITS[u].step} of ${stepsOf(u).length} · ${E.UNITS[u].name}`;
const unitLabel = (u) => isStep(u) ? `${UNAME[E.UNITS[u].parent] || E.UNITS[u].parent} step ${E.UNITS[u].step}` : UNAME[u] || u;
const lastStep = (u) => isStep(u) && stepsOf(u).at(-1) === u;
const needLabel = (u) => u === "MS1" ? "MS1" : lastStep(u) ? UNAME[E.UNITS[u].parent] || "Unit " + E.UNITS[u].parent.slice(1) : unitLabel(u);
function unitOpen(u) { const n = NEEDS[u]; return DEV || EMBED || !n || done(n) || (u === "MS1" ? !!(S.ms1 && S.ms1.run) : S.units[u].reps.length > 0); }
function recommended() {
  for (const u of PATH) if (unitOpen(u) && !done(u)) return u === "MS1" ? ["ms1"] : ["unit", u];
  if (quarterOpen() && !(S.quarter && S.quarter.passed)) return ["quarter"];
  if (yearOpen() && !(S.year && S.year.passed)) return ["year"];
  return ["daily"];
}
// the map shows a unit only when this copy plays some of its steps (the public release ships a few), and the quarter and year only in the full game
const inPath = (id) => id === "Q" || id === "Y" ? !RELEASE : !E.STEPS[id] || E.STEPS[id].some((x) => PATH.includes(x));
const anyPassed = () => E.ORDER.some((u) => S.units[u].passed);
function go(rec) { if (rec[0] === "unit") startUnit(rec[1]); else if (rec[0] === "ms1") startMS1(); else if (rec[0] === "quarter") startQuarter(); else if (rec[0] === "year") startYear(); else startDaily(); }
function weekDays() { const cut = Date.now() - 7 * 86400000; return S.days.filter((d) => new Date(d + "T12:00").getTime() >= cut).length; }

function renderMap() {
  if (EMBED) return embedHome();
  hush(); storyStop(); view = "map"; P = null; D = null; SES.on = false; navState(); drawStrip();
  const rec = recommended();
  const doneToday = S.daily.date === today();
  const st = (u) => S.units[u].passed ? "done" : unitOpen(u) ? "live" : "later";
  const dailyCard = !anyPassed()
    ? `<div class="daily"><div><b>Daily round</b><div class="muted">Pass a unit to open it: 12 quick calls a day from everything you've passed.</div></div></div>`
    : `<div class="daily"><div><b>${doneToday ? "Done for today" : "Today's round: 12 reads"}</b><div class="muted">${doneToday
        ? `${S.daily.right} of ${S.daily.n} right, ${S.daily.clean} clean. Another round is optional and earns nothing extra.`
        : "Mixed from everything you've passed, weighted toward what you missed lately."} Days practised this week: ${weekDays()}.</div></div>
       <button class="btn ${rec[0] === "daily" ? "primary" : ""}" id="go-daily" type="button">${doneToday ? "Play again" : "Start the round"}${rec[0] === "daily" ? ' <span class="kbd">Enter</span>' : ""}</button></div>`;
  const node = (id, name, desc, state, extra) => !inPath(id) ? "" :
    `<li class="node ${state}${rec[0] === "unit" && rec[1] === id ? " next" : ""}"><span class="dot">${state === "done" ? "✓" : { U2: 1, U6: 2, U7: 3, U8: 4, U9: 5, U10: 6, U11: 7, U12: 8, U13: 9, U14: 10, Q: 11, Y: 12 }[id] || "…"}</span>
      <div class="nm">${UNAME[id] || (id === "Q" ? "Quarter" : id === "Y" ? "Year" : "Next")} · ${name}</div><div class="ds">${desc}</div>${extra || ""}</li>`;
  const unitExtra = (id) => {
    const st = S.units[id], s = unitStats(st), isNext = rec[0] === "unit" && rec[1] === id;
    if (!unitOpen(id)) return `<div class="row note">Opens when ${needLabel(NEEDS[id])} passes.</div>`;
    return `<div class="row">${st.reps.length ? pipsHTML(st.reps) + `<span class="stat">${s.n} reps · ${s.acc}% right · ${s.clean}% clean · median ${s.med} s</span>` : ""}
      <button class="btn ${isNext ? "primary" : ""}" type="button" data-unit="${id}">${st.passed ? "Practise" : st.reps.length ? "Continue" : "Start"}${isNext ? ' <span class="kbd">Enter</span>' : ""}</button></div>`;
  };
  const stepRow = (u) => {
    const U = E.UNITS[u], stt = S.units[u], isNext = rec[0] === "unit" && rec[1] === u, open = unitOpen(u);
    return `<li class="step ${stt.passed ? "done" : open ? "live" : "later"}${isNext ? " next" : ""}"><span class="sn">${stt.passed ? "✓" : U.step}</span>
      <span class="snm">${U.name}</span>${stt.reps.length ? pipsHTML(stt.reps.slice(-U.pass[1])) : ""}<span class="sp"></span>
      ${open ? `${S.lessons[u] && LESSONS[u] ? `<button class="btn sm" type="button" data-lesson="${u}">Lesson</button>` : ""}${!stt.passed ? `<button class="btn sm ghost" type="button" data-testout="${u}" title="Already know this? ${TESTOUT} Realistic reps in a row passes the step.">Test out</button>` : ""}
      <button class="btn sm ${isNext ? "primary" : ""}" type="button" data-unit="${u}">${stt.passed ? "Practise" : stt.reps.length ? "Continue" : "Start"}${isNext ? ' <span class="kbd">Enter</span>' : ""}</button>` : ""}</li>`;
  };
  const partState = (p) => { if (!inPath(p)) return "later"; const L = E.STEPS[p].filter((x) => PATH.includes(x)); return S.units[L.at(-1)].passed ? "done" : unitOpen(L[0]) ? "live" : "later"; };
  const partExtra = (p, note) => {
    if (!inPath(p)) return "";
    if (partState(p) === "later") return `<div class="row note">Opens when ${needLabel(NEEDS[E.STEPS[p][0]])} passes.</div>`;
    return `<ol class="steps">${E.STEPS[p].filter((x) => PATH.includes(x)).map(stepRow).join("")}</ol><div class="note">${note}</div>`;
  };
  const u6Extra = partExtra("U6", "The row, which side of zero, worth acting on, the read date, guardrails, then the full call.");
  const u7Extra = partExtra("U7", "Read the balance check, is the split broken, too good to be true, those two together, did the goal change, then the full call with Health first.");
  const u8Extra = partExtra("U8", "Find each line of the plan, goal or secondary metric, then the whole page: Overview, Health, Results, the call.");
  const u9Extra = partExtra("U9", `How many weeks, what a slot can see, move the sliders, worth testing at all${PATH.includes("U9d") ? ", then size a card and place it" : ""}.`);
  const u10Extra = partExtra("U10", "What an idea is worth if it wins, worth per week of testing, then whether two ideas compete at all.");
  const u11Extra = partExtra("U11", "Read a bubble, name its corner, then find the flow with the most money to typical.");
  const u12Extra = partExtra("U12", "Read the lane, test it or improve it without a test, then which flow gets the next test slot.");
  const u13Extra = partExtra("U13", "Profit as the goal, the break-even line when there's only revenue, then the full money call.");
  const u14Extra = partExtra("U14", "When a slow goal can be read, then reading it while its window is still open.");
  const qExtra = quarterExtra(rec);
  const u2Extra = partExtra("U2", "Same idea: reading the board, one check at a time, the first two together, the last two, all four, then finding the first open week.");
  main.innerHTML = `<div class="mapwrap">
    <h1>Your path</h1>
    <p class="muted">Each step is one task you repeat on fresh cases until almost all of your recent calls are right. Start at the top. Made-up numbers throughout.</p>
    ${dailyCard}
    <ol class="path">
      ${node("U2", "Which week can it run?", "Every test has a row and weeks. Can this card go here, and where's the first week it can run?", partState("U2"), u2Extra)}
      ${node("U6", "Read one result", "GrowthBook's Results tab: the row, the range against zero, worth acting on, the read date, guardrails, then the call.", partState("U6"), u6Extra)}
      ${node("U7", "Trust before you read", "The Health tab and two more checks: a broken split, a win too good to be true, a goal swapped after launch. Then the full call, Health first.", partState("U7"), u7Extra)}
      ${node("U8", "Read the plan", "GrowthBook's Overview tab: what the test answers to. Then the whole page, Overview to the call.", partState("U8"), u8Extra)}
      ${node("U9", "Size it", "GrowthBook's Power Calculator: how long a test needs to see the lift you care about, and whether it's worth testing at all.", partState("U9"), u9Extra)}
      ${node("U10", "Which goes first?", "GrowthBook's Ideas list: what each idea is worth if it wins, and which one gets the slot first.", partState("U10"), u10Extra)}
      ${node("U11", "Where's the room?", "Marketing QA's map of every flow: who's big, who earns below its type, and where improving pays the most.", partState("U11"), u11Extra)}
      ${node("U12", "What can a test answer?", "Marketing QA's roadmap: what a lift is worth, what a 4-week test can see, and which flow gets the next test.", partState("U12"), u12Extra)}
      ${node("U13", "Does it make money?", "GrowthBook's Results with money rows: an offer can lift revenue and still lose money. Profit as the goal, or a break-even line.", partState("U13"), u13Extra)}
      ${node("U14", "Slow metrics", "Goals like a second order within 60 days: the read date is entry plus the window, and green in the window isn't a win yet.", partState("U14"), u14Extra)}
      ${node("Q", "Run the quarter", "Thirteen Mondays, Oct 5 to Dec 28. Plan the board, read what's ready, make the calls. Each call keeps paying, or costing, every week after.", S.quarter && S.quarter.passed ? "done" : quarterOpen() ? "live" : "later", qExtra)}
      ${node("Y", "Run the year", "52 Mondays of 2027 with one goal: second orders or gear cross-sell. Slow goal metrics, a new quarter's ideas every 13 weeks, and the program kept afloat.", S.year && S.year.passed ? "done" : yearOpen() ? "live" : "later", yearExtra(rec))}
    </ol></div>`;
  main.querySelectorAll("[data-unit]").forEach((b) => b.addEventListener("click", () => startUnit(b.dataset.unit)));
  main.querySelectorAll("[data-testout]").forEach((b) => b.addEventListener("click", () => startTestOut(b.dataset.testout)));
  const m1 = $("go-ms1"); if (m1) m1.addEventListener("click", startMS1);
  const m1l = $("ms1-lesson"); if (m1l) m1l.addEventListener("click", () => lesson("MS1", true));
  main.querySelectorAll("[data-lesson]").forEach((b) => b.addEventListener("click", () => lesson(b.dataset.lesson, true)));
  const gd = $("go-daily"); if (gd) gd.addEventListener("click", startDaily);
  const gs = $("go-story"); if (gs) gs.addEventListener("click", () => { const c = nextChapter(); c ? playChapter(c.id) : storyHub(); });
  const gh = $("go-hub"); if (gh) gh.addEventListener("click", storyHub);
  const gq = $("go-quarter"); if (gq) gq.addEventListener("click", startQuarter);
  const nq = $("new-quarter"); if (nq) nq.addEventListener("click", () => { S.quarter.run = null; save(); startQuarter(); });
  const gy = $("go-year"); if (gy) gy.addEventListener("click", () => startYear());
  const ny = $("new-year"); if (ny) ny.addEventListener("click", () => { S.year.run = null; save(); startYear(); });
}
// story mode: the next chapter you can play (its unit passed, not yet done)
const nextChapter = () => CHAPTERS.find((c) => !c.soon && (!c.needs || (S.units[c.needs] && S.units[c.needs].passed)) && !(S.story && S.story.ch && S.story.ch[c.id] && S.story.ch[c.id].done));
function storyCard() {
  const c = nextChapter();
  return `<div class="daily"><div><b>${c ? `Story, chapter ${CHAPTERS.indexOf(c) + 1}: ${c.title}` : "Story and arcade"}</b><div class="muted">${c
    ? `A week at Fernhill Coffee Co. that puts everything up to ${c.needsLabel} together: a fire to put out, a call at your desk, and an Objection! trial.`
    : "Chapters open as you pass units. The arcade has every trial you've opened, and Press your luck."}</div></div>
    ${c ? `<button class="btn" type="button" id="go-story">Play the chapter</button>` : ""}<button class="btn" type="button" id="go-hub">Story and arcade</button></div>`;
}
function ms1Extra() {
  if (!unitOpen("MS1")) return `<div class="row note">Opens when Unit 6 passes.</div>`;
  const m = S.ms1 || {}, run = m.run, isNext = recommended()[0] === "ms1";
  const status = run ? `Week ${Math.min(E.MS1.weeks, Math.floor(run.i / E.MS1.perWeek) + 1)} of ${E.MS1.weeks}, ${run.res.filter((x) => x.r).length} of ${run.res.length} right so far.`
    : m.best != null ? `Best run: ${m.best} of ${E.MS1.weeks * E.MS1.perWeek}.` : "Pass with 17 of 20 right and every write-up right.";
  return `<div class="row"><span class="stat">${status}</span>${S.lessons.MS1 ? `<button class="btn sm" type="button" id="ms1-lesson">Briefing</button>` : ""}
    <button class="btn ${isNext ? "primary" : ""}" type="button" id="go-ms1">${run ? "Continue" : m.passed ? "Run it again" : m.best != null ? "Try again" : "Start"}${isNext ? ' <span class="kbd">Enter</span>' : ""}</button></div>`;
}
function navState() {
  $("nav-today").setAttribute("aria-current", view === "today" || view === "done" ? "page" : "false");
  $("nav-map").setAttribute("aria-current", view === "map" ? "page" : "false");
  $("nav-story").setAttribute("aria-current", view === "story" ? "page" : "false");
  const tv = view === "quarter" ? "list" : view === "play" && P && P.c ? P.tv || repHome() : view === "tool" && BR ? BR.tv : null;
  $("nav-exp").setAttribute("aria-current", tv === "list" || tv === "exp" ? "page" : "false");
  $("nav-board").setAttribute("aria-current", tv === "board" ? "page" : "false");
  { const b = $("nav-calc"), open = unitOpen("U9a"); b.disabled = !open; b.classList.toggle("locked", !open); b.setAttribute("aria-current", view === "calcplay" ? "page" : "false"); }
  for (const [id, v] of [["nav-reg", "reg"], ["nav-road", "road"]]) {
    const b = $(id); b.setAttribute("aria-current", (view === "mqa" && MQ && MQ.v === v) || (tv === "mqa" && P.c.screen === (v === "reg" ? "room" : "lane")) ? "page" : "false");
    const open = mqaOpen(v); b.disabled = !open; b.classList.toggle("locked", !open);
  }
}

// ---------- the key drill (once per unit, before its first rep) ----------
function drill(u) {
  hush(); view = "drill"; navState();
  const ku = (E.UNITS[u] && E.UNITS[u].keyUnit) || u, learned = () => { S.intro[u] = true; S.intro[ku] = true; };
  const fresh = (E.UNITS[u] && E.UNITS[u].tabs.length && !S.intro[ku]) ? KEYMAP.keys.filter((k) => k.unit === ku && IMPL.includes(k.key)) : [];
  const older = unlockedKeys().filter((k) => k.unit !== ku);
  if (!fresh.length) { learned(); save(); return startUnit(u); }
  const pool = [];
  fresh.forEach((k) => { pool.push(k, k); });
  older.forEach((k) => pool.push(k));
  while (pool.length < 6) pool.push(fresh[pool.length % fresh.length]);
  const r = E.rng(Date.now() & 0xffffffff);
  let order = E.shuffle(pool.slice(0, 6), r);
  for (let i = 1; i < order.length; i++) if (order[i].key === order[i - 1].key) { const j = order.findIndex((x, n) => n > i && x.key !== order[i].key); if (j > 0) [order[i], order[j]] = [order[j], order[i]]; }
  D = { u, order, i: 0, t0: performance.now(), misses: 0, learned };
  main.innerHTML = `<div class="drill">
    <div class="note">${isStep(u) ? stepTitle(u) : E.UNITS[u].id + " · " + E.UNITS[u].name}</div>
    <h1>New key${fresh.length > 1 ? "s" : ""}</h1>
    <div class="keys">${fresh.map((k) => `<div><span class="kbd">${k.key}</span> <b>${k.label}</b><div class="muted">${k.what}</div></div>`).join("")}</div>
    <p class="muted">Press the key each line needs. The first few show the key. Clicks do nothing here.</p>
    <div class="prompt" id="dprompt"></div>
    <div class="bigkey" id="dkey"></div>
    <p class="note" id="dcount"></p>
    <button class="btn" type="button" id="dskip">Skip the drill</button></div>`;
  $("dskip").addEventListener("click", () => { learned(); save(); startUnit(u); });
  drillShow();
}
function drillShow() {
  const k = D.order[D.i], line = (k.prompts || [k.label])[Math.floor(Math.random() * (k.prompts || [1]).length)];
  $("dprompt").textContent = line;
  const dk = $("dkey"); dk.textContent = D.i < 3 ? k.key : "?"; dk.className = "bigkey" + (D.i < 3 ? "" : " hide");
  $("dcount").textContent = `${D.i + 1} of ${D.order.length}`;
}
function drillKey(e) {
  if (e.key === "Enter" && D.done) { e.preventDefault(); return startUnit(D.u); }
  if (D.done || e.key.length !== 1) return;
  e.preventDefault();
  const want = D.order[D.i].key, dk = $("dkey");
  if (e.key.toUpperCase() === want) {
    useKey(want, true); SND.tick(); dk.textContent = want; dk.className = "bigkey pop";
    D.i++;
    if (D.i >= D.order.length) {
      D.done = true; D.learned(); save(); SND.pass();
      const secs = ((performance.now() - D.t0) / 1000).toFixed(1);
      $("dprompt").textContent = `Done: ${D.order.length} keys in ${secs} s${D.misses ? `, ${D.misses} slip${D.misses > 1 ? "s" : ""}` : ""}.`;
      $("dcount").innerHTML = `<button class="btn primary" type="button" id="dgo">Start the unit <span class="kbd">Enter</span></button>`;
      $("dgo").addEventListener("click", () => startUnit(D.u));
      $("dskip").hidden = true;
    } else setTimeout(drillShow, 160);
  } else {
    D.misses++; SND.miss(); dk.textContent = want; dk.className = "bigkey";
    dk.classList.remove("shake"); void dk.offsetWidth; dk.classList.add("shake");
  }
}

// ---------- playing ----------
function startUnit(u) {
  if (!unitOpen(u)) return renderMap();
  // v3: no lesson screens up front. The step's key ideas show as a short card on its first rep (a worked example
  // follows: the Meet rep with its hint), and the full lesson is one click away. Tutorials only paid off for complex
  // mechanics in Andersen et al. 2012 (45,000+ players).
  if (!S.intro[u] && !TOUCH) return drill(u);   // the key drill teaches keys; a phone has none (before the brief, so the brief survives it)
  const brief = !!(LESSONS[u] && !S.lessons[u]);
  if (brief) S.lessons[u] = "brief";
  P = { mode: "unit", unit: u, results: [], combo: 0, session: SES.on, brief };
  nextCase();
}
function startDaily() {
  const q = E.dailyKinds(pathUnits(), E.rng((Math.random() * 2 ** 31) | 0));
  if (!q.length) return renderMap();
  P = { mode: "daily", queue: q, qi: 0, results: [], combo: 0 };
  nextCase();
}
// Test out: a step you already know, proved in 4 Realistic reps in a row instead of the full practice. One miss and
// you practise it the normal way (the reps you made still count toward it).
const TESTOUT = 4;
function startTestOut(u) {
  const kinds = E.shuffle([...new Set(E.UNITS[u].kinds)], Math.random);
  while (kinds.length < TESTOUT) kinds.push(...kinds);
  S.intro[u] = S.intro[u] || true;
  P = { mode: "testout", unit: u, kinds: kinds.slice(0, TESTOUT), n: 0, results: [], combo: 0 };
  nextCase();
}
function testOutDone() {
  hush(); view = "summary";
  const u = P.unit, ok = P.results.length === TESTOUT && P.results.every((r) => r.tier !== "miss");
  if (ok && !S.units[u].passed) S.units[u].passed = true;
  save();
  main.innerHTML = `<div class="mapwrap"><h1>${ok ? `Tested out: ${E.UNITS[u].name}` : "Worth a little practice"}</h1>
    <p>${ok ? `${TESTOUT} of ${TESTOUT} Realistic reps right. This step is done.${UNLOCK_TEXT[u] ? " " + UNLOCK_TEXT[u] : ""}` : `You got ${P.results.filter((r) => r.tier !== "miss").length} of ${P.results.length} before the miss. The normal practice picks up from here, with the lesson first if you haven't seen it.`}</p>
    <button class="btn primary" type="button" id="tomap">${ok ? "Back to your path" : "Practise this step"} <span class="kbd">Enter</span></button></div>`;
  const go = () => ok ? renderMap() : startUnit(u);
  $("tomap").addEventListener("click", go);
  P = { mode: "after-testout", go };
}
function nextCase() {
  let kind, stage, cu;
  if (P.mode === "ms1") return ms1Task();
  if (P.mode === "testout") {
    if (P.n >= TESTOUT || P.results.some((r) => r.tier === "miss")) return testOutDone();
    kind = P.kinds[P.n]; stage = 2; cu = P.unit; P.owner = P.unit;
    const seed = (Math.random() * 2 ** 31) | 0;
    P.c = mkCase(seed, kind, stage, cu);
    Object.assign(P, { tabs: E.UNITS[cu].tabs, calls: P.c.opts ? P.c.opts.map((o) => o[0]) : E.UNITS[cu].calls, labels: P.c.opts ? Object.fromEntries(P.c.opts) : null,
                       coin: P.c.vis && P.c.vis.flow ? P.c.vis.flow.split || 0 : 0, ghost: 0, tab: "a", seen: ["a"], answered: false, tv: null, world: null,
                       t0: performance.now(), keysUsed: [], clicks: [], passCard: false });
    save(); view = "play"; navState(); renderPlay(); hush();
    return;
  }
  if (P.mode === "unit") { const st = S.units[P.unit]; kind = E.nextKind(P.unit, st, Math.random); stage = stageV3(st); cu = P.unit; P.owner = P.unit; }
  else {
    if (P.qi >= P.queue.length) return P.mode === "warm" ? warmDone() : dailyDone();
    const q = P.queue[P.qi]; kind = q.kind; stage = 2; P.owner = q.unit;
    cu = q.unit === "U6f" && S.units.U7f.passed ? "U7f" : q.unit;      // once Health is learned, every result has it
  }
  const seed = (Math.random() * 2 ** 31) | 0;
  P.c = mkCase(seed, kind, stage, cu);
  Object.assign(P, { tabs: E.UNITS[cu].tabs, calls: P.c.opts ? P.c.opts.map((o) => o[0]) : E.UNITS[cu].calls, labels: P.c.opts ? Object.fromEntries(P.c.opts) : null,
                     coin: P.c.vis && P.c.vis.flow ? P.c.vis.flow.split || 0 : 0, ghost: 0, tab: "a", seen: ["a"], answered: false, tv: null, world: null,
                     t0: performance.now(), keysUsed: [], clicks: [], passCard: false });
  save(); view = "play"; navState(); renderPlay();
  const showBrief = P.mode === "unit" && P.brief && S.units[P.unit].reps.length === 0;
  if (showBrief) briefShow();
  drawStrip();
  if (P.mode === "unit" && P.c.stage === 0 && !P.c.guided) narrate(showBrief ? LESSONS[P.unit].map((x) => x.h) : "", repIntro()); else hush();
}
function hudHTML() {
  if (P.mode === "ms1") return ms1Hud();
  if (P.mode === "quarter") { const q = QS().run; return `<div class="hud"><span class="u">Run the ${q.year ? "year" : "quarter"} · Monday ${Q.wk(q)[q.week]} · week ${q.week + 1} of ${Q.NWEEKS}</span><span class="chip">${E.BOARD_ROWS[q.tests.find((t) => t.id === P.tid).row]}</span><span class="sp"></span><span>${P.answered ? "called" : "your call"}</span></div>`; }
  if (P.mode === "testout") return `<div class="hud"><span class="u">Test out · ${isStep(P.unit) ? stepTitle(P.unit) : P.unit}</span><span class="chip">Realistic</span>${pipsHTML(P.results.map((r) => ({ right: r.tier !== "miss", clean: r.tier === "clean" })), TESTOUT)}
    <span class="sp"></span><span>${Math.min(P.n + (P.answered ? 0 : 1), TESTOUT)} of ${TESTOUT}</span></div>`;
  const reps = P.mode === "unit" ? S.units[P.unit].reps : P.results.map((r) => ({ right: r.tier !== "miss", clean: r.tier === "clean" }));
  const right = P.mode === "unit" ? `rep ${S.units[P.unit].reps.length + (P.answered ? 0 : 1)}` : `${Math.min(P.qi + (P.answered ? 0 : 1), P.queue.length)} of ${P.queue.length}`;
  const title = P.mode === "warm" ? "Warm-up · steps due for review" : P.mode !== "unit" ? "Daily round" : isStep(P.unit) ? stepTitle(P.unit) : `${P.unit} · ${E.UNITS[P.unit].name}`;
  return `<div class="hud"><span class="u">${title}</span><span class="chip">${STAGE[P.c.stage]}</span>${pipsHTML(reps)}
    <span class="combo">${P.combo > 1 ? "×" + P.combo : ""}</span><span class="sp"></span><span>${right}</span></div>`;
}
function decideHTML() {
  return `<div class="decide" id="decide">${P.calls.map((id, i) => `<button type="button" class="dec" data-i="${i}" data-id="${id}"><span class="kbd">${i + 1}</span>${callLabel(id)}</button>`).join("")}</div>`;
}
const callLabel = (id) => (P && P.labels && P.labels[id]) || E.callById(id).label;
function tailHTML(keys) {
  return `<div class="strip" id="strip">${P.c.place ? "Move the card, then drop it." : P.c.slot ? "Move the coin, then drop it." : P.c.parts ? "Pick each line, top to bottom." : "Look, then make the call."}</div><div class="stamp" id="stamp"></div></div>
    <p class="note">Made-up numbers.<span class="keys-only"> Keys: ${keys}, <span class="kbd">L</span> your path, <span class="kbd">?</span> all keys.</span>${P.mode === "unit" && LESSONS[P.unit] ? ` <button class="linkbtn" type="button" id="relesson">See the lesson again</button>` : ""}</p>`;
}
const hintHTML = (c) => c.stage === 0 ? `<div class="hint"><b>How to read it.</b> ${c.hint}</div>` : "";
function wireDecide() { const d = $("decide"); if (d) d.addEventListener("click", (e) => { const b = e.target.closest(".dec"); if (b) answer(+b.dataset.i); }); }
function renderPlay() {
  if (P.c.screen === "setup") return renderSetup();
  if (P.c.screen === "board") return renderBoard();
  if (P.c.screen === "scene") return renderScene();
  if (P.c.screen === "calc") return renderCalc();
  if (P.c.screen === "sliders") return renderSliders();
  if (P.c.screen === "ideas") return renderIdeas();
  if (P.c.screen === "room" || P.c.screen === "lane") return renderRoom();
  const c = P.c;
  if (P.tabs.length && !P.tabs.includes(P.tab)) { P.tab = P.tabs[0]; P.seen = [P.tab]; }   // a Health step opens on its own tab
  const tabs = ["o", "a", "h"].map((t) => !P.tabs.includes(t) ? offTab(t) : `<button class="tab${c.stage === 0 && !P.seen.includes(t) ? " unseen" : ""}" role="tab" type="button" data-tab="${t}" id="tab-${t}" aria-selected="${P.tab === t}">${TAB_NAME[t]}${t === "h" && c.srmP < E.SRM_ALARM && !c.hideVerdict ? ' <span class="badge">1</span>' : ""} <span class="kbd">${KEY_OF[t]}</span></button>`).join("");
  main.innerHTML = hudHTML() + `<div class="card" id="card">
    <div class="crumb">${P.mode === "quarter" ? `<button class="linkbtn" type="button" id="qback">Experiments</button>` : "Experiments"} / ${c.surfaceLabel}</div>
    <div class="xh"><h1>${c.name}</h1><span class="status">Running</span></div>
    <div class="meta"><span>${c.surfaceLabel} · ${c.where}</span><span>·</span><span id="day">Started ${c.started} · day ${c.day}</span>${tagHTML(c)}</div>
    <div class="tabs" role="tablist">${tabs}</div>
    <div class="pane" id="pane"></div>
    ${c.ask ? `<div class="gq sq">${c.ask}</div>` : ""}
    ${hintHTML(c)}${c.guided ? `<div class="decide" id="decide"></div>` : decideHTML()}
    ${tailHTML(P.tabs.map((t) => `<span class="kbd">${KEY_OF[t]}</span> ${TAB_NAME[t].toLowerCase()}`).join(", ") + `, <span class="kbd">1</span>–<span class="kbd">${P.calls.length}</span> the call`)}`;
  main.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab, false)));
  renderPane();
  if (c.guided) { P.gi = 0; P.gok = []; P.gfinal = false; expGuideShow(); } else wireDecide();
  const rl = $("relesson"); if (rl) rl.addEventListener("click", () => lesson(P.unit, true));
  const qb = $("qback"); if (qb) qb.addEventListener("click", () => qMonday(""));
}
// The guided walk on GrowthBook's page (first reps of U6f): read date, then guardrails, then the call itself.
function showTab(t) {   // the walk opens the tab for you; it counts as seen
  P.tab = t; if (!P.seen.includes(t)) P.seen.push(t);
  main.querySelectorAll(".tab").forEach((b) => { b.setAttribute("aria-selected", String(b.dataset.tab === t)); if (b.dataset.tab === t) b.classList.remove("unseen"); });
  renderPane();
}
function expGuideShow() {
  const c = P.c;
  main.querySelectorAll("#card .cur").forEach((el) => el.classList.remove("cur"));
  const done = P.gok.map((x) => `<span class="gok">✓ ${x.toLowerCase()} clear</span>`).join("");
  if (P.gi >= c.guide.length) {      // last: the goal itself, with all four calls
    P.gfinal = true; showTab("a"); const g0 = $("g0"); if (g0) g0.classList.add("cur");
    $("decide").innerHTML = `<div class="gq">${done} ${c.guideLast || "Last: <b>the goal</b>. Which side of zero is its range? Make the call."}</div>` +
      decideHTML().replace(/^<div class="decide" id="decide">|<\/div>$/g, "");
    wireDecideButtons();
    narrate((c.guideLast || "Last: the goal. Which side of zero is its range? Make the call.").replace(/<[^>]+>/g, ""));
    return;
  }
  const g = c.guide[P.gi];
  showTab(g.tab); (g.els || []).forEach((id) => { const el = $(id); if (el) el.classList.add("cur"); });
  $("decide").innerHTML = `<div class="gq">${done} Check ${P.gi + 1} of ${c.guide.length + 1}: <b>${g.name}</b>. ${g.look}</div>
    <button type="button" class="dec" data-g="0"><span class="kbd">1</span>Clear</button>
    <button type="button" class="dec" data-g="1"><span class="kbd">2</span>Blocked: ${callLabel(g.bad)}</button>`;
  $("decide").querySelectorAll("[data-g]").forEach((b) => b.addEventListener("click", () => expGuide(+b.dataset.g)));
  narrate(P.gi === 0 ? [txt(".xh h1"), c.hint] : "", `Check ${P.gi + 1}: ${g.name}. ${g.look}`);
}
function expGuide(i) {
  if (!P || P.answered || !P.c.guided || P.gfinal || i > 1) return;
  const c = P.c, g = c.guide[P.gi];
  const finish = (call) => { main.querySelectorAll("#card .cur").forEach((el) => el.classList.remove("cur")); $("decide").innerHTML = decideHTML().replace(/^<div class="decide" id="decide">|<\/div>$/g, ""); submit(call); };
  if (i === 1) return finish(g.bad);
  if (c.gtarget === g.k) return finish("skipCheck");      // cleared a check that was blocked: that's the miss
  P.gok.push(g.name); SND.tick(); P.gi++;
  expGuideShow();
}
function wireDecideButtons() { $("decide").querySelectorAll(".dec[data-i]").forEach((b) => b.addEventListener("click", () => answer(+b.dataset.i))); }
// ----- U1: a test setup (a card at first, later only the teammate's message) -----
const ROW_NAME = { change: "What changed", assign: "Who got B", count: "Who was counted", when: "When", result: "Result" };
const ROW_MEANS = { change: "the one thing B does differently", assign: "how people were split into A and B", count: "whose results went into the numbers",
  when: "the dates each version ran", result: "how B did against A" };
const BROKEN = { assign: "chosen", count: "after", when: "beforeAfter" };
function setupTable(c, fields, opts = {}) {
  const f = c.fields, show = ["change", ...fields, "result"];
  const val = { change: c.change.toLowerCase().includes(c.surface.toLowerCase().replace(/ flow$/, "")) ? c.change : `${c.change} <span class="muted">(${c.surface})</span>`, assign: f.assign, count: f.count, when: f.when,
                result: `B is <b>${c.liftTxt}</b> on revenue per recipient` };
  return `<dl class="ov setup${opts.explain ? " explain" : ""}" id="${opts.id || "setup"}">${show.map((k) =>
    `<dt class="${(opts.mark || []).includes(k) ? "mk" : ""}">${ROW_NAME[k]}</dt><dd id="${opts.id ? "" : "f-" + k}" class="${(opts.mark || []).includes(k) ? "mk" : ""}">${val[k]}${opts.explain ? `<span class="means">${ROW_MEANS[k]}</span>` : ""}${P && P.c === c && c.guided && BROKEN[k] ? `<span class="gchk" id="g-${k}"></span>` : ""}</dd>`).join("")}</dl>`;
}
function renderSetup() {
  const c = P.c;
  const msg = c.showProse ? `<div class="slack"><div class="av">${c.from[0]}</div><div><b>${c.from}</b> <span class="muted">#email-tests</span><p>${c.prose}</p></div></div>` : "";
  const U = E.UNITS[c.unit];
  main.innerHTML = hudHTML() + `<div class="card" id="card">
    <div class="crumb">Test setups / ${c.surface}</div>
    <div class="xh"><h1>${c.ask ? c.ask : c.showProse ? `${c.from}'s question in #email-tests` : c.change}</h1></div>
    <div class="meta">${c.ask ? "Which line of the card answers it?" : c.show.length === 1 ? `Check one line: ${ROW_NAME[c.show[0]].toLowerCase()}.` : "Is this a fair comparison? If not, what broke it?"}</div>
    <div class="pane" id="pane" style="min-height:0">${c.showProse ? "" : setupTable(c, c.show)}${msg}<div id="dots"></div></div>
    ${hintHTML(c)}${c.guided ? `<div class="decide" id="decide"></div>` : decideHTML()}
    ${tailHTML(c.guided ? `<span class="kbd">1</span> looks fair, <span class="kbd">2</span> it's off` : `<span class="kbd">1</span>–<span class="kbd">${P.calls.length}</span> the call`)}`;
  if (c.guided) { P.gi = 0; guideShow(); } else wireDecide();
  const rl = $("relesson"); if (rl) rl.addEventListener("click", () => lesson(P.unit, true));
  void U;
}
// The guided walk (first reps of the combined steps): one line at a time, fair or off.
function guideShow() {
  const c = P.c, k = c.show[P.gi];
  main.querySelectorAll(".setup dd, .setup dt").forEach((el) => el.classList.remove("cur"));
  const dd = $("f-" + k); dd.classList.add("cur"); dd.previousElementSibling.classList.add("cur");
  const ask = { assign: "What decided who got B?", count: "Whose results are in the numbers?", when: "Did A and B run at the same time?" }[k];
  narrate(P.gi === 0 ? repIntro() : "", `Line ${P.gi + 1}: ${ROW_NAME[k]}. ${ask}`);
  $("decide").innerHTML = `<div class="gq">Line ${P.gi + 1} of ${c.show.length}: <b>${ROW_NAME[k]}</b>. ${{ assign: "What decided who got B?", count: "Whose results are in the numbers?", when: "Did A and B run at the same time?" }[k]}</div>
    <button type="button" class="dec" data-g="0"><span class="kbd">1</span>Looks fair</button>
    <button type="button" class="dec" data-g="1"><span class="kbd">2</span>It's off: ${E.callById(BROKEN[k]).label}</button>`;
  $("decide").querySelectorAll("[data-g]").forEach((b) => b.addEventListener("click", () => guide(+b.dataset.g)));
}
function guide(i) {
  if (!P || P.answered || !P.c.guided || i > 1) return;
  const c = P.c, k = c.show[P.gi];
  if (i === 1) return guideDone(BROKEN[k]);
  if (c.target === k) return guideDone("fair");          // passed the broken line: that's the miss, say so now
  $("g-" + k).textContent = "✓ fair"; SND.tick();
  P.gi++;
  if (P.gi >= c.show.length) return guideDone("fair");
  guideShow();
}
function guideDone(call) {
  main.querySelectorAll(".setup .cur").forEach((el) => el.classList.remove("cur"));
  $("decide").innerHTML = decideHTML().replace(/^<div class="decide" id="decide">|<\/div>$/g, "");
  submit(call);
}
function pile(n, engaged, counted, r) {
  // 50 people; `engaged` were already keen before the test. Not-counted ones are the least engaged (who drops out of "openers").
  const kinds = Array.from({ length: n }, (_, i) => i < engaged ? "g" : "");
  E.shuffle(kinds, r);
  let drop = n - counted;
  for (let i = n - 1; i >= 0 && drop > 0; i--) if (!kinds[i]) { kinds[i] = "x"; drop--; }
  return `<div class="pile">${kinds.map((k) => `<i class="${k}"></i>`).join("")}</div>`;
}
function pilesHTML(d, r, la, lb, alsoB) {
  const counted = (n) => n < 50 ? `, ${n} counted` : "";
  const keen = d.a || d.b;
  return `<div class="piles">
    <div><div class="pl">${la}${keen ? `: ${d.a} of 50 keen${counted(d.countedA)}` : ""}</div>${pile(50, d.a, d.countedA, r)}</div>
    <div><div class="pl">${lb}${keen ? `: ${d.b} of 50 keen${counted(d.countedB)}` : ""}</div>${pile(50, d.b, d.countedB, r)}
      ${alsoB ? `<div class="also">Also changed: ${alsoB.map((x) => `<span class="chipx">${x}</span>`).join("")}</div>` : ""}</div></div>
    ${keen ? `<p class="note"><span class="lg g"></span> already keen before the test <span class="lg"></span> everyone else${d.countedA < 50 || d.countedB < 50 ? ` <span class="lg x"></span> not counted` : ""}. 50 people per side stand in for the whole list.</p>` : ""}`;
}
function revealSetup() {
  const c = P.c, d = c.dots, r = E.rng(c.seed ^ 0x5eed);
  if (!$("setup")) $("pane").insertAdjacentHTML("afterbegin", setupTable(c, ["assign", "count", "when"]));
  if (c.target) { const el = $("f-" + c.target); if (el) { el.classList.add("hl"); el.previousElementSibling.classList.add("hl"); } }
  if (c.ask) return;
  const ba = c.kind === "beforeAfter";
  $("dots").innerHTML = pilesHTML(d, r, ba ? "Before (A)" : "A", ba ? "After (B)" : "B", ba ? c.also : null);
}

// ---------- lessons (U1 steps): a few screens before the first rep, replayable from the path ----------
function lessonVis(v) {
  if (!v) return "";
  if (v.room) { const x = v.room, c = RM.makeRoom(x.seed || 1, x.kind, 0, x.unit); return RM.chartHTML(c, { captions: x.captions ?? c.captions, mark: x.mark || c.mark }) + (v.table ? RM.flowTable(c) : ""); }
  if (v.lane) { const x = v.lane, c = RM.makeRoom(x.seed || 1, x.kind, 0, x.unit); return RM.laneHTML(c, { mark: null }); }
  if (v.prio) { const U = PR.UNITS10[v.prio]; return ideasTable(PR.makePriority(v.seed || 1, U.meet[0], 0, v.prio)); }
  if (v.sliders) { const x = L.sl; return slPanelHTML(x); }
  if (v.calcVis) { const k = SZ.calc(v.calcVis.s, v.calcVis.lift); return calcHTML(k, { show: v.calcVis.show, compact: true, hideSummary: !v.calcVis.summary, hideMark: !v.calcVis.summary, idea: SZ.TRAFFIC[v.calcVis.s].label }); }
  if (v.traffic) return `<div class="tscroll"><table class="rt stack"><thead><tr><th>Surface</th><th>People per version a week</th><th>Lift worth acting on</th><th>Weeks it needs</th></tr></thead><tbody>
    ${v.traffic.map(([s, lift]) => { const T = SZ.TRAFFIC[s], w = SZ.weeksNeeded(s, lift); return `<tr><td data-l="Surface"><b>${T.label}</b></td><td data-l="People per version a week">${T.perWeek.toLocaleString("en-US")}</td><td data-l="Lift worth acting on">${pctS(lift)}</td><td data-l="Weeks it needs">${w} week${w > 1 ? "s" : ""}</td></tr>`; }).join("")}</tbody></table></div>`;
  if (v.live) { const x = v.live, c = mkCase(x.seed || 7, x.kind, 0, x.unit);
    if (c.screen === "board") return boardGrid({ cards: c.cards, card: { ...c.card, start: +c.answer.slice(1) }, showFreeze: true, offers: true }, +c.answer.slice(1));
    return paneHTML(c, x.tab); }
  if (v.piles) {
    const p = v.piles, d = { a: p.a, b: p.b, countedA: p.ca || 50, countedB: p.cb || 50 };
    if (p.after && !L.shown && (p.ca || p.cb)) return pilesHTML({ a: p.a, b: p.b, countedA: 50, countedB: 50 }, E.rng(11 + L.i), p.la.split(",")[0], p.lb.split(",")[0]);
    if (p.after && !L.shown) return `<div class="piles"><div><div class="pl">The list: ${p.a + p.b} of 100 keen, not split yet</div>${pile(100, p.a + p.b, 100, E.rng(7))}</div></div>
      <p class="note"><span class="lg g"></span> already keen before the test <span class="lg"></span> everyone else</p>`;
    return pilesHTML(d, E.rng(11 + L.i), p.la, p.lb);
  }
  if (v.card) {
    const c = Object.assign({}, LESSON_CARD);
    return setupTable(c, ["assign", "count", "when"], { id: "lcard", explain: v.card === "explain", mark: Array.isArray(v.card) ? v.card : [] });
  }
  if (v.health) return paneHTML({ units: v.health, srmP: E.srmP(v.health[0], v.health[1]) }, "h");
  if (v.examples) return `<ul class="exlist">${v.examples.map(([t, x]) => `<li class="${t}"><span class="tag">${(v.tags || { fair: "Fair", bad: "Off" })[t]}</span>${x}</li>`).join("")}</ul>`;
  if (v.board) return boardGrid(v.board, v.board.card ? v.board.card.start : 0);
  if (v.checks) return `<ol class="checks">${v.checks.map(([n, t]) => `<li><b>${n}</b> ${t}</li>`).join("")}</ol>`;
  if (v.timeline) return `<div class="tline">${v.timeline.map(([m, who, also]) => `<div class="tblock"><b>${m}</b><span>${who}</span>${also.length ? `<div class="also">${also.map((x) => `<span class="chipx">${x}</span>`).join("")}</div>` : ""}</div>`).join("")}</div>`;
  if (v.slack && !Array.isArray(v.slack)) return visHTML(v);
  if (v.flow || v.people || v.quote || v.kform || v.kflow || v.preview || v.pre || v.fraction || v.gbform || v.results || v.plan) return visHTML(v);
  if (v.slack) return `<div class="slack"><div class="av">S</div><div><b>Theo</b> <span class="muted">#email-tests</span><p>${v.slack.map(([k, t]) => k ? `<span class="sl sl-${k}">${t}</span><sub>${ROW_NAME[k]}</sub>` : t).join(". ")}</p></div></div>`;
  return "";
}
let L = null;
function lesson(u, replay) {
  const screens = LESSONS[u];
  if (!screens) { S.lessons[u] = true; return startUnit(u); }
  view = "lesson"; navState();
  L = { u, i: 0, shown: false, picked: null, replay, screens, spoke: -1 };
  voPrefetch(screens.map(lessonWords));
  lessonShow();
}
// what a lesson screen says: the heading, the situation, any example list or checklist, then the question
function lessonWords(s) {
  const v = s.vis || {}, tags = v.tags || { fair: "Fair", bad: "Off" };
  return [s.h, s.p, (v.examples || []).map(([t, x]) => `${tags[t]}: ${x}.`), (v.checks || []).map(([n, t]) => `${n}. ${t}`), s.predict ? s.predict.q : ""];
}
function lessonShow() {
  const s = L.screens[L.i], last = L.i === L.screens.length - 1;
  if (s.vis && s.vis.sliders) { const v = s.vis.sliders; if (!L.sl || L.slAt !== L.i) { L.slAt = L.i; L.sl = { st: { s: v.s, t: v.t, w: v.w, lift: v.lift, pow: v.pow }, open: v.open, cur: v.open[0] }; } L.sl.lock = !!s.predict && !L.shown; }   // try the sliders once you've guessed
  const needPick = s.predict && !L.shown;
  main.innerHTML = `<div class="lesson">
    <div class="note">${L.u === "MS1" ? "MS1 · First four Mondays · briefing" : stepTitle(L.u) + " · lesson " + (L.i + 1) + " of " + L.screens.length}</div>
    <h1>${s.h}</h1>
    <p class="lp">${s.p}</p>
    <div class="lvis">${lessonVis(s.vis)}</div>
    ${s.predict ? `<div class="predict"><div class="pq">${s.predict.q}</div><div class="decide">${s.predict.opts.map((o, i) =>
      `<button type="button" class="dec${L.shown && i === s.predict.answer ? " right" : ""}${L.shown && i === L.picked && i !== s.predict.answer ? " wrong" : ""}" data-p="${i}" ${L.shown ? "disabled" : ""}><span class="kbd">${i + 1}</span>${o}</button>`).join("")}</div>
      ${L.shown ? `<p class="reveal">${s.predict.reveal}</p>` : ""}</div>` : ""}
    <div class="lnav">
      ${L.i ? `<button class="btn" type="button" id="lback"><span class="kbd">←</span> Back</button>` : ""}
      ${needPick ? `<span class="muted">Make a guess first.</span>` : `<button class="btn primary" type="button" id="lnext">${last ? "Start practising" : "Next"} <span class="kbd">Enter</span></button>`}
    </div></div>`;
  main.querySelectorAll("[data-p]").forEach((b) => b.addEventListener("click", () => lessonPick(+b.dataset.p)));
  const n = $("lnext"); if (n) n.addEventListener("click", lessonNext);
  ((s.vis && s.vis.mark) || []).forEach((id) => { const e = main.querySelector(`.lvis #${id}`); if (e) e.classList.add("cur"); });   // point at the part the screen is about
  if ($("slp")) wireSliders($("slp"), L.sl);
  if (L.spoke !== L.i) { L.spoke = L.i; narrate(lessonWords(s)); }
  const bk = $("lback"); if (bk) bk.addEventListener("click", () => lessonGo(-1));
}
function lessonPick(i) {
  const s = L.screens[L.i];
  if (!s.predict || L.shown || i >= s.predict.opts.length) return;
  L.picked = i; L.shown = true;
  if (i === s.predict.answer) SND.tick(); else SND.miss();
  lessonShow();
  narrate(s.predict.reveal);
}
function lessonGo(d) { L.i = Math.max(0, Math.min(L.screens.length - 1, L.i + d)); L.shown = false; L.picked = null; lessonShow(); }
function lessonNext() {
  const s = L.screens[L.i];
  if (s.predict && !L.shown) return;
  if (L.i < L.screens.length - 1) return lessonGo(1);
  S.lessons[L.u] = true; save();
  const u = L.u; L = null;
  if (P && P.mode === "unit" && P.unit === u && P.c && !P.answered) { view = "play"; navState(); return renderPlay(); }
  if (u === "MS1") return startMS1();
  startUnit(u, true);
}
function lessonKey(e) {
  if (/^[1-3]$/.test(e.key)) { e.preventDefault(); return lessonPick(+e.key - 1); }
  if (e.key === "Enter" || e.key === "ArrowRight") { e.preventDefault(); return lessonNext(); }
  if (e.key === "ArrowLeft" || e.key === "Backspace") { e.preventDefault(); return lessonGo(-1); }
}

// ----- U2: the board (rows are where a test runs, columns are weeks) -----
function barHTML(card, i, cls, extra = "") {
  return `<div class="bar ${card.offer ? "offer" : "crea"} ${cls} ${card.cls || ""}" id="${i}" title="${card.name}" style="grid-row:${card._gr};grid-column:${card.start + 2} / span ${card.len}${extra}">
    <b>${card.name}</b><span>${card.sub || `${card.offer ? "Offer" : "Creative"} · ${card.reader ? "reads: " + card.reader : '<em id="nr">no reader</em>'}`}</span></div>`;
}
// The grid, shared by play and the lessons. b = { cards, card (the new one, optional), showFreeze, marked, place }.
function boardGrid(b, ghostStart) {
  const W = b.weeks || E.BOARD_WEEKS, FZ = b.freeze || E.FREEZE, nr = b.card ? b.card.row : -1;
  const gr = (row) => 2 + row + (nr >= 0 && row > nr ? 1 : 0), lane = gr(nr) + 1, rows = E.BOARD_ROWS.length + (nr >= 0 ? 1 : 0);
  const cards = b.cards.map((x) => Object.assign({}, x, { _gr: gr(x.row) }));
  let g = `<div class="bh" style="grid-row:1;grid-column:1"></div>` +
    W.map((w, i) => `<div class="bh${b.showFreeze && FZ.includes(i) ? " fz" : ""}${i < (b.past || 0) ? " past" : ""}" style="grid-row:1;grid-column:${i + 2}">${w}</div>`).join("");
  for (let i = 0; i < (b.past || 0); i++) g += `<div class="pastcol" style="grid-row:2 / ${rows + 2};grid-column:${i + 2}"></div>`;
  if (b.showFreeze) g += FZ.map((i) => `<div class="fzcol" data-fz="${i}" style="grid-row:2 / ${rows + 2};grid-column:${i + 2}"></div>`).join("");
  E.BOARD_ROWS.forEach((name, row) => { g += `<div class="rl" id="rl-${row}" style="grid-row:${gr(row)}">${name}${b.rowSub ? `<span class="rls">${b.rowSub[row]}</span>` : ""}</div>`; });
  if (b.card) {
    g += `<div class="rl new" style="grid-row:${lane}">↳ new card</div>`;
    for (let i = 0; i < W.length; i++) g += `<div class="cell${b.place ? " pick" : ""}" data-w="${i}" style="grid-row:${lane};grid-column:${i + 2}"></div>`;
  }
  g += cards.map((x, i) => barHTML(x, "bar-" + i, i === b.marked ? "mark" : "")).join("");
  if (b.card) g += barHTML(Object.assign({}, b.card, { _gr: lane, start: ghostStart }), "ghost", "ghost");
  return `<div class="tscroll"><div class="board" id="board" style="grid-template-rows:auto repeat(${rows},44px)">${g}</div></div>
    <p class="note"><span class="lg crea"></span> creative change${b.offers === false ? "" : ` <span class="lg offer"></span> offer`}${b.showFreeze ? ` <span class="lg fz"></span> BFCM freeze, nothing new runs` : ""}${b.past ? ` <span class="lg past"></span> already past` : ""}${b.marked !== undefined ? ` <span class="lg mk"></span> the marked test` : ""}</p>`;
}
function renderBoard() {
  const c = P.c, W = E.BOARD_WEEKS, kc = c.card, offersOn = c.rules.includes("offers"), ov = c.marked !== undefined;
  if (!c.place) P.ghost = kc.start;
  const m = ov ? c.cards[c.marked] : null;
  main.innerHTML = hudHTML() + `<div class="card" id="card">
    <div class="crumb">Test board / Oct 26 to Dec 20</div>
    <div class="xh"><h1>${c.place ? "Where does it go?" : ov ? "Do they share a week?" : "Can it run there?"}</h1></div>
    <div class="meta">${ov ? `The new card on ${E.BOARD_ROWS[kc.row]} and the marked test, <b>${m.name}</b> on ${E.BOARD_ROWS[m.row]}.` :
      `New card: <b>${kc.name}</b> · ${E.BOARD_ROWS[kc.row]} · ${c.calc ? `<span id="m-len">length: size it above</span>` : `${kc.len} week${kc.len > 1 ? "s" : ""}`}${offersOn ? ` · <span id="m-kind">${kc.offer ? "offer" : "creative change"}</span>` : ""} · <span id="m-reader">${kc.reader ? "read by " + kc.reader : "no reader named"}</span>${c.place ? (c.past ? ` · today is ${W[c.past]}` : "") : ` · proposed ${W[kc.start]}`}`}</div>
    ${c.calc ? `<div class="pane calcpane">${calcHTML(c.calc, { show: ["pw"], idea: kc.name, compact: true, hideSummary: true, hideMark: c.stage > 0 })}</div>` : ""}
    <div class="pane">${boardGrid({ rowSub: c.calc ? ROW_TRAFFIC : null, cards: c.cards, card: c.calc ? { ...kc, len: 1, sub: "? weeks" } : kc, showFreeze: c.showFreeze, marked: c.marked, place: c.place, offers: offersOn, past: c.past }, P.ghost)}
      <div id="gate" class="gatefb"></div></div>
    ${hintHTML(c)}${c.place ? `<div class="decide" id="decide"><button type="button" class="dec" id="drop"><span class="kbd">Enter</span>Drop it here</button></div>` : c.guided ? `<div class="decide" id="decide"></div>` : decideHTML()}
    ${tailHTML(c.place ? `<span class="kbd">←</span> <span class="kbd">→</span> move the card, <span class="kbd">Enter</span> drop it` : c.guided ? `<span class="kbd">1</span> clear, <span class="kbd">2</span> blocked` : `<span class="kbd">1</span>–<span class="kbd">${P.calls.length}</span> the call`)}`;
  if (TOUCH) $("board").addEventListener("click", (e) => { const t = e.target.closest(".bar"); if (t && t.id !== "ghost") coach(t.title + (t.classList.contains("offer") ? " · offer" : " · creative change")); });
  if (c.place) {
    $("board").addEventListener("click", (e) => { const t = e.target.closest(".cell"); if (t && !P.answered) { P.ghost = Math.max(c.past || 0, Math.min(+t.dataset.w, W.length - kc.len)); moveGhost(0); } });
    $("drop").addEventListener("click", () => placeAt(P.ghost));
    moveGhost(0);
  } else if (c.guided) { P.gi = 0; P.gok = []; boardGuideShow(); }
  else wireDecide();
  const rl = $("relesson"); if (rl) rl.addEventListener("click", () => lesson(P.unit, true));
}
// The guided walk on the board (first reps of steps 4 and 6): one check at a time, clear or blocked.
const GATE_LOOK = { busy: ["Its row", "Look along its own row, in its weeks."], offers: ["Offers", "If it's an offer, look down its weeks for another offer on any row."],
  noReader: ["Reader", "Look for a reader's name on the card."], freeze: ["The freeze", "Look for any of its weeks in the shaded columns."] };
function boardGuideShow() {
  const c = P.c, g = c.show[P.gi];
  main.querySelectorAll("#card .cur").forEach((el) => el.classList.remove("cur"));
  if (g === "busy") $("rl-" + c.card.row).classList.add("cur");
  if (g === "offers") { main.querySelectorAll("#board .bar.offer").forEach((el) => el.classList.add("cur")); const k = $("m-kind"); if (k) k.classList.add("cur"); }
  if (g === "noReader") $("m-reader").classList.add("cur");
  if (g === "freeze") main.querySelectorAll(".fzcol").forEach((el) => el.classList.add("cur"));
  narrate(P.gi === 0 ? repIntro() : "", `Check ${P.gi + 1}: ${GATE_LOOK[g][0]}. ${GATE_LOOK[g][1]}`);
  $("decide").innerHTML = `<div class="gq">${P.gok.map((x) => `<span class="gok">✓ ${GATE_LOOK[x][0].toLowerCase()} clear</span>`).join("")}
      Check ${P.gi + 1} of ${c.show.length}: <b>${GATE_LOOK[g][0]}</b>. ${GATE_LOOK[g][1]}</div>
    <button type="button" class="dec" data-g="0"><span class="kbd">1</span>Clear</button>
    <button type="button" class="dec" data-g="1"><span class="kbd">2</span>Blocked: ${E.callById(g).label}</button>`;
  $("decide").querySelectorAll("[data-g]").forEach((b) => b.addEventListener("click", () => boardGuide(+b.dataset.g)));
}
function boardGuide(i) {
  if (!P || P.answered || !P.c.guided || i > 1) return;
  const c = P.c, g = c.show[P.gi];
  if (i === 1) return boardGuideDone(g);
  if (c.target === g) return boardGuideDone("fits");          // passed the blocked check: that's the miss, say so now
  P.gok.push(g); SND.tick(); P.gi++;
  if (P.gi >= c.show.length) return boardGuideDone("fits");
  boardGuideShow();
}
function boardGuideDone(call) {
  main.querySelectorAll("#card .cur").forEach((el) => el.classList.remove("cur"));
  $("decide").innerHTML = decideHTML().replace(/^<div class="decide" id="decide">|<\/div>$/g, "");
  submit(call);
}
function moveGhost(d) {
  if (!P || P.answered || !P.c.place) return;
  const c = P.c, len = c.calc ? 1 : c.card.len, max = E.BOARD_WEEKS.length - len;   // a card still to be sized shows as one week
  P.ghost = Math.max(c.past || 0, Math.min(max, P.ghost + d));
  $("ghost").style.gridColumn = `${P.ghost + 2} / span ${len}`;
  if (d) $("ghost").scrollIntoView({ block: "nearest", inline: "nearest" });
  if (c.stage === 0 && !c.calc) {   // Meet stage only: say which gate the spot breaks
    const p = E.boardProblems({ ...c.card, start: P.ghost }, c.cards).filter((x) => x.gate !== "offBoard");
    const fb = $("gate");
    fb.className = "gatefb " + (p.length ? "bad" : "good");
    fb.textContent = p.length ? `${E.BOARD_WEEKS[P.ghost]}: ${p.map((x) => ({ busy: "row busy (gate 1)", offers: `another offer running, "${x.with && x.with.name}" (gate 2)`, freeze: "in the freeze" })[x.gate]).join(", ")}` : `${E.BOARD_WEEKS[P.ghost]}: clears every gate`;
  }
}
function placeAt(w) { if (!P || P.answered || !P.c.place) return; submit("w" + w); }
function revealBoard(call) {
  const c = P.c, p = c.problem;
  $("gate").textContent = "";
  if (c.marked !== undefined) {   // step 1: light the columns both bars sit in
    const m = c.cards[c.marked], k = c.card;
    for (let w = k.start; w < k.start + k.len; w++) if (w >= m.start && w < m.start + m.len) $("board").insertAdjacentHTML("beforeend", `<div class="colhl" style="grid-row:2 / -1;grid-column:${w + 2}"></div>`);
    $("ghost").classList.add(call === c.answer ? "set" : "miss");
    return;
  }
  if (c.place) {
    const e = +c.answer.slice(1), right = call === c.answer;
    $("ghost").classList.add(right ? "set" : "miss");
    if (!right || c.calc) $("board").insertAdjacentHTML("beforeend", barHTML(Object.assign({}, c.card, { _gr: $("ghost").style.gridRow, start: e }), "answer", "ghost set"));
    if (c.calc && right) $("ghost").hidden = true;      // the sized card replaces the one-week stand-in
    // the blockers of the week they tried
    const tried = +call.slice(1);
    const at = { ...c.card, start: tried };
    E.boardProblems(at, c.cards).forEach((x) => markProblem(x));
    c.cards.forEach((x, i) => { if (x.row === at.row && x.start < at.start + at.len && at.start < x.start + x.len) $("bar-" + i).classList.add("hl"); });
    return;
  }
  $("ghost").classList.add(p ? "miss" : "set");
  if (p) markProblem(p);
}
function markProblem(x) {
  if (x.with) { const i = P.c.cards.indexOf(x.with); const b = $("bar-" + i); if (b) b.classList.add("hl"); }
  if (x.gate === "freeze") main.querySelectorAll(".fzcol").forEach((el) => el.classList.add("hl"));
  if (x.gate === "noReader") { const n = $("nr"); if (n) n.classList.add("hl"); }
}

// ----- scenes (U3 on): a picture, one question, the calls -----
function flowHTML(fl, slotMode) {
  const coin = (s) => `<div class="fslot${slotMode ? " pick" : ""}${fl.split === s ? " on" : ""}" id="fs-${s}" data-s="${s}"><span class="coin">◆ the coin: 50/50 split</span></div>`;
  let h = `<div class="flow"><div class="fnode trig"><span class="ft">Trigger</span> ${fl.trigger}</div>`;
  fl.nodes.forEach((x, i) => {
    h += coin(i) + `<div class="fnode ${x.t}${fl.change === i ? " chg" : ""}${fl.mark === i ? " mk" : ""}" id="fn-${i}"><span>${x.t === "wait" ? "⏱ " : "✉ "}${x.n}</span>` +
      `${x.t === "email" && fl.counts ? `<span class="cnt">${x.reach.toLocaleString("en-US")} of 1,000 get it</span>` : ""}${fl.change === i ? `<span class="chgtag">B changes this</span>` : ""}</div>`;
  });
  return h + coin(fl.nodes.length) + `<div class="fexit">Exit: ${fl.exit}</div></div>`;
}
const KF_ROWS = { strategy: ["Test strategy", "One winner for everyone, or a version per person. Only above 400,000 profiles."],
  metric: ["Winning metric", "The number Klaviyo picks the winner on."], size: ["Test size", "The share of the list in the test. The rest wait for the winner."],
  duration: ["Test duration", "How long before the winner goes to the rest."], send: ["Send time", "When it goes, on one clock or each person's own."] };
function kformHTML(f) {
  const row = (k, body) => `<div class="kfrow" id="kf-${k}"><div class="kfl">${KF_ROWS[k][0]}</div><div class="kfv">${body}${f.explain ? `<span class="means">${KF_ROWS[k][1]}</span>` : ""}</div></div>`;
  const radio = (opts, on) => opts.map((o) => `<span class="kr${o === on ? " on" : ""}"><i></i>${o}</span>`).join("");
  const body = {
    strategy: () => f.strategy ? radio(["Winning variation (Standard A/B test)", "Personalized variations for each recipient"], f.strategy) : `<span class="muted">Not shown: the list is under 400,000 profiles.</span>`,
    metric: () => radio(f.metrics, f.metric),
    size: () => `<span class="ksl"><span style="width:${f.size}%"></span></span> <b>${f.size}%</b>`,
    duration: () => `<b>${f.duration}</b>`,
    send: () => `<b>${f.send}</b>`,
  };
  return `<div class="kform"><div class="kfh">${f.channel === "SMS" ? "SMS" : "Campaign"} A/B test <span class="muted">· ${f.list ? f.list + " profiles" : ""}</span></div>${f.show.map((k) => row(k, body[k]())).join("")}</div>`;
}
// a copy of GrowthBook's results table for the scene steps (U6); plain = gray bars, so the bar's position is what you read
function resultsHTML(v) {
  const rows = v.goal.concat(v.guard || []);
  let dom = 10; rows.forEach((r) => { dom = Math.max(dom, Math.ceil(Math.max(Math.abs(r.lo), Math.abs(r.hi), v.worth || 0) / 5) * 5); });
  return `<div class="tscroll"><table class="rt stack"><thead><tr><th>Metric</th><th id="th-a">Baseline (A)</th><th id="th-b">Variation (B)</th><th id="th-ctw">Chance to Win</th><th id="th-ci">CI graph (−${dom}% to +${dom}%)</th><th id="th-pct">% Change</th></tr></thead><tbody>
    <tr class="sec"><td colspan="6">Goal metrics</td></tr>${v.goal.map((r, k) => rowHTML(r, "g" + k, dom, "", { plain: v.plain, worth: v.worth, wide: true })).join("")}
    ${v.guard && v.guard.length ? `<tr class="sec"><td colspan="6">Guardrail metrics</td></tr>${v.guard.map((r, k) => rowHTML(r, "u" + k, dom, "", { plain: v.plain, wide: true })).join("")}` : ""}</tbody></table></div>
    ${v.worth ? `<p class="note"><span class="lg wl"></span> the plan's worth-acting-on line, +${v.worth}%</p>` : ""}`;
}
function kflowHTML(f) {
  return `<div class="kform"><div class="kfh">${f.email} <span class="muted">· A/B Test tab</span></div>
    <div class="kfrow" id="kq-what"><div class="kfl">Variations</div><div class="kfv">${f.vars.map(([n, w]) => `<span class="kvar">${n} <b>${w}%</b></span>`).join("")}${f.wait ? `<span class="means">The two versions differ only in the wait before this email.</span>` : ""}</div></div>
    <div class="kfrow" id="kq-auto"><div class="kfl">Test Settings</div><div class="kfv"><span class="kchk${f.auto ? " on" : ""}"><i>${f.auto ? "✓" : ""}</i>Automatically choose distribution</span></div></div>
    <div class="kfrow"><div class="kfl">Winner Selection</div><div class="kfv">Winning metric: <b>${f.metric}</b> · ${f.end}</div></div></div>`;
}
const PF_ROWS = { change: "What's tested", subject: "Subject line", code: "Discount code", link: "Main button", send: "Send time" };
function previewHTML(rows) {
  return `<table class="rt pf"><thead><tr><th></th><th>A</th><th>B</th></tr></thead><tbody>${Object.keys(PF_ROWS).map((k) =>
    `<tr id="pf-${k}"><td>${PF_ROWS[k]}</td><td>${rows[k][0]}</td><td>${rows[k][1]}</td></tr>`).join("")}</tbody></table>`;
}
function visHTML(v, slotMode) {
  if (!v) return "";
  if (v.pre) { const { pre, ...rest } = v; return visHTML(pre) + `<div style="height:12px"></div>` + visHTML(rest, slotMode); }
  if (v.kform) return kformHTML(v.kform);
  if (v.results) return resultsHTML(v.results);
  if (v.plan) { const p = v.plan; return `<dl class="ov plan">${p.hyp ? `<dt>Hypothesis</dt><dd>${p.hyp}</dd>` : ""}<dt>Goal metric</dt><dd>${p.goal}</dd>
      <dt>Read date</dt><dd id="ov-read">${p.read}</dd><dt>Today</dt><dd id="day">Day ${p.day}</dd></dl>`; }
  if (v.fraction) { const f = v.fraction; return `<div class="frac"><div class="fn">${f.name} =</div><div class="fx"><span>${f.top}</span><span class="fb">${f.base}</span></div></div>`; }
  if (v.gbform) { const g = v.gbform, list = (a) => a.length ? a.map((x) => `<span class="gbm">${x}</span>`).join("") : `<span class="muted">None selected</span>`;
    return `<div class="kform gbf"><div class="kfh">New Experiment <span class="muted">· ${g.name}</span></div>
      <div class="kfrow" id="gb-goal"><div class="kfl">Goal Metrics</div><div class="kfv">${list(g.goal)}</div></div>
      <div class="kfrow" id="gb-sec"><div class="kfl">Secondary Metrics</div><div class="kfv">${list(g.secondary)}</div></div>
      <div class="kfrow" id="gb-guard"><div class="kfl">Guardrail Metrics</div><div class="kfv">${list(g.guard)}</div></div></div>`; }
  if (v.kflow) return kflowHTML(v.kflow);
  if (v.preview) return `<div class="tscroll">${previewHTML(v.preview)}</div>`;
  if (v.flow) return flowHTML(v.flow, slotMode);
  if (v.people) return `<table class="ppl"><thead><tr><th></th>${[1, 2, 3, 4].map((i) => `<th>Send ${i}</th>`).join("")}</tr></thead><tbody>${v.people.map(([n, s]) =>
    `<tr><td>${n}</td>${[...s].map((x) => `<td><span class="ab ${x}">${x}</span></td>`).join("")}</tr>`).join("")}</tbody></table>`;
  if (v.quote) return `<blockquote class="quote">${v.quote}</blockquote>`;
  if (v.slack) return `<div class="slack"><div class="av">${v.slack.from[0]}</div><div><b>${v.slack.from}</b> <span class="muted">#email-tests</span><p>${v.slack.text}</p></div></div>`;
  return "";
}
const TAB_LATER = { o: "Overview opens in a later step", a: "Results", h: "Health opens in the Health unit" };
const offTab = (t) => `<button class="tab off" role="tab" type="button" disabled title="${TAB_LATER[t]}">${TAB_NAME[t]}</button>`;
// U6's single-idea steps are a slice of the Results tab: same tab bar, only Results lit
const sceneTabs = () => `<div class="tabs" role="tablist">${offTab("o")}<button class="tab" role="tab" type="button" aria-selected="true">Results</button>${offTab("h")}</div>`;
function renderScene() {
  const c = P.c;
  main.innerHTML = hudHTML() + `<div class="card" id="card">
    <div class="crumb">${c.crumb}</div>
    <div class="xh"><h1>${c.title}</h1></div>
    <div class="meta">${c.meta || ""}</div>
    ${/^Experiments \//.test(c.crumb || "") && c.vis && c.vis.results ? sceneTabs() : ""}
    <div class="pane" id="pane" style="min-height:0">${visHTML(c.vis, c.slot)}<div id="gate" class="gatefb"></div><div id="reveal"></div></div>
    ${c.q ? `<div class="gq sq">${c.q}</div>` : ""}
    ${c.parts ? `<div class="wu" id="wu">${c.parts.map((p, k) => `<div class="wl" id="wl-${k}"><b>${p.label}.</b> <span>…</span></div>`).join("")}</div>` : ""}
    ${hintHTML(c)}${c.slot ? `<div class="decide" id="decide"><button type="button" class="dec" id="drop"><span class="kbd">Enter</span>Put the coin here</button></div>` : c.guided || c.parts ? `<div class="decide" id="decide"></div>` : decideHTML()}
    ${tailHTML(c.slot ? `<span class="kbd">↑</span> <span class="kbd">↓</span> move the coin, <span class="kbd">Enter</span> drop it` : c.guided ? `<span class="kbd">1</span> clear, <span class="kbd">2</span> blocked` : c.parts ? `<span class="kbd">1</span>–<span class="kbd">3</span> pick the line` : `<span class="kbd">1</span>–<span class="kbd">${P.calls.length}</span> the call`)}`;
  if (c.parts) { P.pi = 0; P.pok = []; partShow(); }
  else if (c.guided) { P.gi = 0; P.gok = []; sceneGuideShow(); }
  else if (c.slot) {
    $("pane").addEventListener("click", (e) => { const t = e.target.closest(".fslot"); if (t && !P.answered) { P.coin = +t.dataset.s; moveCoin(0); } });
    $("drop").addEventListener("click", () => { if (!P.answered) submit("s" + P.coin); });
    moveCoin(0);
  } else wireDecide();
  const rl = $("relesson"); if (rl) rl.addEventListener("click", () => lesson(P.unit, true));
}
// the write-up (U6g): one line at a time, three choices each; the rep is right only if all four lines are
function partShow() {
  const c = P.c, p = c.parts[P.pi];
  main.querySelectorAll(".wu .wl").forEach((el, k) => el.classList.toggle("cur", k === P.pi));
  $("decide").className = "decide parts";
  $("decide").innerHTML = `<div class="gq">Line ${P.pi + 1} of ${c.parts.length}: <b>${p.label}</b>. ${p.q}</div>` +
    p.opts.map((o, i) => `<button type="button" class="dec" data-p="${i}"><span class="kbd">${i + 1}</span>${o.t}</button>`).join("");
  $("decide").querySelectorAll("[data-p]").forEach((b) => b.addEventListener("click", () => partPick(+b.dataset.p)));
  narrate(P.pi === 0 && c.stage === 0 && P.mode === "unit" ? repIntro() : "", `Line ${P.pi + 1}: ${p.label}. ${p.q}`);
}
function partPick(i) {
  const c = P.c, p = c.parts[P.pi];
  if (!p || i < 0 || i >= p.opts.length) return;
  const ok = p.opts[i].ok, right = p.opts.find((o) => o.ok).t, line = $("wl-" + P.pi);
  P.pok.push(ok); ok ? SND.tick() : SND.miss();
  line.classList.remove("cur"); line.classList.add(ok ? "ok" : "no");
  line.querySelector("span").innerHTML = ok ? right : `${right} <em class="note">(you picked: ${p.opts[i].t})</em>`;
  P.pi++;
  if (P.pi < c.parts.length) return partShow();
  $("decide").className = "decide"; $("decide").innerHTML = "";
  const wrong = c.parts.filter((_, k) => !P.pok[k]).map((x) => x.label.toLowerCase());
  if (wrong.length) c.why = `The ${wrong.join(" and ")} line${wrong.length > 1 ? "s were" : " was"} off. ` + c.parts.filter((_, k) => !P.pok[k]).map((x) => x.why).join(" ");
  else c.why = "All four lines hold up: the plan as written, the range, the decision and a next step that follows.";
  submit(P.pok.every(Boolean) ? "writeOk" : "writeMiss");
}

// the guided walk on a scene (first reps of a checklist step): c.guide = [{k, name, look, bad, els}]
function sceneGuideShow() {
  const c = P.c, g = c.guide[P.gi];
  main.querySelectorAll("#card .cur").forEach((el) => el.classList.remove("cur"));
  (g.els || []).forEach((id) => { const el = $(id); if (el) el.classList.add("cur"); });
  narrate(P.gi === 0 ? repIntro() : "", `Check ${P.gi + 1}: ${g.name}. ${g.look}`);
  $("decide").innerHTML = `<div class="gq">${P.gok.map((x) => `<span class="gok">✓ ${x.toLowerCase()} clear</span>`).join("")}
      Check ${P.gi + 1} of ${c.guide.length}: <b>${g.name}</b>. ${g.look}</div>
    <button type="button" class="dec" data-g="0"><span class="kbd">1</span>Clear</button>
    <button type="button" class="dec" data-g="1"><span class="kbd">2</span>Blocked: ${callLabel(g.bad)}</button>`;
  $("decide").querySelectorAll("[data-g]").forEach((b) => b.addEventListener("click", () => sceneGuide(+b.dataset.g)));
}
function sceneGuide(i) {
  if (!P || P.answered || !P.c.guided || i > 1) return;
  const c = P.c, g = c.guide[P.gi];
  if (i === 1) return sceneGuideDone(g.bad);
  if (c.gtarget === g.k) return sceneGuideDone(P.calls[0]);     // passed the blocked check: that's the miss
  P.gok.push(g.name); SND.tick(); P.gi++;
  if (P.gi >= c.guide.length) return sceneGuideDone(P.calls[0]);
  sceneGuideShow();
}
function sceneGuideDone(call) {
  main.querySelectorAll("#card .cur").forEach((el) => el.classList.remove("cur"));
  $("decide").innerHTML = decideHTML().replace(/^<div class="decide" id="decide">|<\/div>$/g, "");
  submit(call);
}
function moveCoin(d) {
  if (!P || P.answered || !P.c.slot) return;
  const n = P.c.vis.flow.nodes.length;
  P.coin = Math.max(0, Math.min(n, P.coin + d));
  main.querySelectorAll(".fslot").forEach((el) => el.classList.toggle("on", +el.dataset.s === P.coin));
  if (d) $("fs-" + P.coin).scrollIntoView({ block: "nearest" });
  if (P.c.stage === 0 && P.c.slotFb) { const fb = $("gate"), t = P.c.slotFb[P.coin]; fb.className = "gatefb " + (/^Right/.test(t) ? "good" : "bad"); fb.textContent = t; }
}
function revealScene(call, right) {
  const c = P.c;
  if (c.slot) {
    $("gate").textContent = "";
    const tried = $("fs-" + call.slice(1)); if (tried) tried.classList.add(right ? "set" : "miss");
    if (!right) { const a = $(c.target); if (a) a.classList.add("on", "set"); }
  } else if (c.target) { const el = $(c.target); if (el) el.classList.add("hl"); }
  if (c.reveal) $("reveal").innerHTML = visHTML(c.reveal);
}

function setTab(t, viaKey) {
  if (!P || view !== "play" || !P.tabs.includes(t)) return;
  useKey(KEY_OF[t], viaKey);
  P.tab = t; if (!P.seen.includes(t)) P.seen.push(t);
  main.querySelectorAll(".tab").forEach((b) => { b.setAttribute("aria-selected", String(b.dataset.tab === t)); if (b.dataset.tab === t) b.classList.remove("unseen"); });
  renderPane();
}

// ----- Sizing: a copy of GrowthBook's Power Calculator (sizing.mjs) -----
const pctS = (x) => (x * 100).toFixed(x < 0.1 ? 1 : 0) + "%";
// each board row's traffic, people per version a week, under its name (Sizing: the row's traffic sets a test's length)
const kShort = (n) => n >= 1000 ? (n / 1000).toFixed(n % 1000 ? 1 : 0).replace(/\.0$/, "") + "k" : String(n);
const ROW_TRAFFIC = Object.values(SZ.TRAFFIC).filter((T) => T.row != null).sort((a, b) => a.row - b.row).map((T) => `${kShort(T.perWeek)} a version a week`);
// k = SZ.calc(surface, lift). o.show = which tables ("pw" power over time, "md" minimum detectable effect over time)
function calcHTML(k, o = {}) {
  const show = o.show || ["pw", "md"], need = k.need && k.need <= SZ.WEEKS ? k.need : null, T = k.T;
  const head = `<tr><th></th>${k.pw.map((_, i) => `<th>Week ${i + 1}</th>`).join("")}</tr>`;
  const pwRow = `<tr id="pw-row"><td><b>Power</b></td>${k.pw.map((p, i) => `<td id="pw-${i + 1}" class="${!o.hideMark && need === i + 1 ? "pwok" : ""}">${pctS(p)}</td>`).join("")}</tr>`;
  const mdRow = `<tr id="md-row"><td><b>${T.metric}</b></td>${k.md.map((m, i) => `<td id="md-${i + 1}">${pctS(m)}</td>`).join("")}</tr>`;
  return `${o.compact ? "" : `<div class="crumb">Experiments / Power Calculator</div><div class="xh"><h1>Power Calculator</h1></div>`}
    ${o.noSet ? "" : `<dl class="ov calcset">
      <dt>Idea</dt><dd>${o.idea || ""}</dd>
      <dt>Population</dt><dd>${T.pop}: ${T.perWeek.toLocaleString("en-US")} ${T.unit} per version a week</dd>
      <dt>Goal metric</dt><dd>${T.metric}, baseline ${T.base}</dd>
      <dt>Expected effect size</dt><dd id="cz-lift">${pctS(k.lift)}</dd>
      ${o.max ? `<dt>Longest it can run</dt><dd id="cz-max">${o.max} weeks</dd>` : ""}
      <dt>Analysis</dt><dd>2 variations · 95% significance · target power 80%</dd></dl>`}
    ${o.hideSummary ? "" : `<div class="calcsum"><b>Calculated sample size and runtime:</b> ${need ? `${(T.perWeek * need).toLocaleString("en-US")} ${T.unit} per version · ${need} week${need > 1 ? "s" : ""}` : `N/A, not enough ${T.unit} for 80% power within ${SZ.WEEKS} weeks`}</div>`}
    ${show.includes("pw") ? `<div class="calct">Power Over Time</div><div class="tscroll"><table class="rt ctab">${head}${pwRow}</table></div>` : ""}
    ${show.includes("md") ? `<div class="calct">Minimum Detectable Effect Over Time</div><div class="tscroll"><table class="rt ctab">${head}${mdRow}</table></div>` : ""}`;
}
function renderCalc() {
  const c = P.c, hide = c.unit !== "U9a" || c.hideSummary;   // GrowthBook marks the week and prints the runtime; after rep 1 of step 1 you read it from the table
  main.innerHTML = hudHTML() + `<div class="card" id="card">
    ${calcHTML(c, { show: c.show, idea: `${c.idea} · ${c.T.label}`, max: c.max, hideSummary: hide, hideMark: hide })}
    <div class="gq sq">${c.ask}</div>
    ${hintHTML(c)}${decideHTML()}
    ${tailHTML(`<span class="kbd">1</span>–<span class="kbd">${P.calls.length}</span> the call`)}`;
  wireDecide();
  const rl = $("relesson"); if (rl) rl.addEventListener("click", () => lesson(P.unit, true));
}
function revealCalc() {
  if (P.c.target === "rows") main.querySelectorAll("#ideas tbody tr").forEach((x) => x.classList.add("hl"));
  const t = $(P.c.target); if (t) t.classList.add("hl");
  if (P.c.target === "pw-row") main.querySelectorAll("#pw-row td").forEach((x) => x.classList.add("hl"));
}

// ----- U9s Move the sliders: the calculator's four inputs as sliders, its two tables drawn as lines (sizing.mjs) -----
// ctx = { st: {s, t, w, lift, pow}, open: [slider keys], cur: the slider the arrow keys move, lock }
const SL_ROWS = [["t", "Traffic"], ["w", "Weeks"], ["lift", "Expected lift"], ["pow", "Target power"]];
const slVals = (k, s) => k === "t" ? SZ.TRAFFIC_X.map((_, i) => i) : k === "w" ? Array.from({ length: SZ.SW }, (_, i) => i + 1) : k === "lift" ? SZ.liftGrid(s) : SZ.POWERS;
const slIdx = (k, st) => slVals(k, st.s).findIndex((x) => Math.abs(x - st[k]) < 1e-9);
const slText = (k, st) => k === "t" ? `${SZ.perWeekOf(st).toLocaleString("en-US")} ${SZ.TRAFFIC[st.s].unit} per version a week` : k === "w" ? `${st.w} week${st.w > 1 ? "s" : ""}` : pctS(st[k]);
// one chart: "pw" Power Over Time (dashed line = target power) or "md" Minimum Detectable Effect Over Time (dashed line = expected lift)
function slChart(st, which) {
  const X0 = 44, X1 = 308, Y0 = 18, Y1 = 150, x = (w) => X0 + (w - 1) * (X1 - X0) / (SZ.SW - 1);
  const ys = Array.from({ length: SZ.SW }, (_, i) => which === "pw" ? SZ.powerSt(st, i + 1) : SZ.mdeSt(st, i + 1));
  const raw = Math.max(ys[0], st.lift) * 1.08, step = raw > 0.4 ? 0.1 : raw > 0.1 ? 0.05 : 0.01;
  const top = which === "pw" ? 1 : Math.ceil(raw / step) * step, y = (v) => Y1 - Math.min(v, top) / top * (Y1 - Y0);
  const line = which === "pw" ? st.pow : st.lift, cur = ys[st.w - 1], ok = which === "pw" ? cur >= st.pow - 1e-9 : cur <= st.lift + 1e-9;
  const ticks = which === "pw" ? [0, 0.5, 1] : [0, top / 2, top];
  return `<svg viewBox="0 0 320 182" role="img" aria-label="${which === "pw" ? "Power Over Time" : "Minimum Detectable Effect Over Time"}">
    ${ticks.map((t) => `<line class="gl" x1="${X0}" x2="${X1}" y1="${y(t)}" y2="${y(t)}"/><text class="ax" x="${X0 - 6}" y="${y(t) + 4}" text-anchor="end">${t ? pctS(t) : "0%"}</text>`).join("")}
    ${[1, 4, 8, 12].map((w) => `<text class="ax" x="${x(w)}" y="${Y1 + 16}" text-anchor="middle">${w}</text>`).join("")}<text class="ax" x="${X1}" y="${Y1 + 30}" text-anchor="end">weeks</text>
    <line class="dash" x1="${X0}" x2="${X1}" y1="${y(line)}" y2="${y(line)}"/><text class="dl" x="${X1}" y="${y(line) - 5}" text-anchor="end">${which === "pw" ? "target power " : "expected lift "}${pctS(line)}</text>
    <polyline class="cv" points="${ys.map((v, i) => `${x(i + 1)},${y(v)}`).join(" ")}"/>
    <line class="wk" x1="${x(st.w)}" x2="${x(st.w)}" y1="${Y0}" y2="${Y1}"/>
    <circle class="dot ${ok ? "ok" : "low"}" cx="${x(st.w)}" cy="${y(cur)}" r="6"/><text class="dv" x="${x(st.w) + (st.w > 9 ? -9 : 9)}" y="${y(cur) + (which === "pw" ? 16 : -9)}" text-anchor="${st.w > 9 ? "end" : "start"}">${pctS(cur)}</text></svg>`;
}
function slReadHTML(st) {
  const pw = SZ.powerSt(st), ok = pw >= st.pow - 1e-9;
  return `People per version: <b>${(SZ.perWeekOf(st) * st.w).toLocaleString("en-US")}</b> · Power at week ${st.w}: <b class="${ok ? "ok" : "low"}">${pctS(pw)}</b> · Smallest lift it sees at week ${st.w}: <b>${pctS(SZ.mdeSt(st))}</b>`;
}
function slPanelHTML(x) {
  const st = x.st, T = SZ.TRAFFIC[st.s];
  return `<div class="slp" id="slp"><dl class="ov calcset"><dt>Population</dt><dd>${T.pop}</dd><dt>Goal metric</dt><dd>${T.metric}, baseline ${T.base}</dd><dt>Analysis</dt><dd>2 variations · 95% significance</dd></dl>
    <div class="slrows">${SL_ROWS.map(([k, label]) => { const on = x.open.includes(k), n = slVals(k, st.s).length;
      return `<div class="slr${on ? "" : " fixed"}${on && x.cur === k ? " cur" : ""}" id="sl-${k}"><label for="si-${k}">${label}</label>
        <input type="range" id="si-${k}" data-k="${k}" min="0" max="${n - 1}" step="1" value="${slIdx(k, st)}" ${on && !x.lock ? "" : "disabled"}>
        <output id="so-${k}">${slText(k, st)}</output>${on ? "" : `<span class="fx">fixed</span>`}</div>`; }).join("")}</div>
    <div class="slread" id="slread">${slReadHTML(st)}</div>
    <div class="slch"><figure id="ch-pw"><figcaption>Power Over Time</figcaption><div id="chp-pw">${slChart(st, "pw")}</div></figure>
      <figure id="ch-md"><figcaption>Minimum Detectable Effect Over Time</figcaption><div id="chp-md">${slChart(st, "md")}</div></figure></div></div>`;
}
function slDraw(root, x) {
  const st = x.st;
  for (const [k] of SL_ROWS) { const o = root.querySelector("#so-" + k), i = root.querySelector("#si-" + k); if (o) o.textContent = slText(k, st); if (i) i.value = slIdx(k, st); }
  root.querySelector("#slread").innerHTML = slReadHTML(st);
  root.querySelector("#chp-pw").innerHTML = slChart(st, "pw"); root.querySelector("#chp-md").innerHTML = slChart(st, "md");
  root.querySelectorAll(".slr").forEach((r) => r.classList.toggle("cur", r.id === "sl-" + x.cur && x.open.includes(x.cur)));
}
function slSet(x, k, i) {
  const v = slVals(k, x.st.s), j = Math.max(0, Math.min(v.length - 1, i));
  x.st = { ...x.st, [k]: v[j] }; x.cur = k;
}
function wireSliders(root, x) {
  root.querySelectorAll("input[type=range]").forEach((inp) => inp.addEventListener("input", () => { slSet(x, inp.dataset.k, +inp.value); slDraw(root, x); }));
}
// arrows: ← → move the current slider, ↑ ↓ pick another open one. Returns true when it used the key.
function slKey(e, x, root) {
  if (!x || x.lock || !x.open.length) return false;
  if (e.key === "ArrowLeft" || e.key === "ArrowRight") { const k = x.open.includes(x.cur) ? x.cur : x.open[0]; slSet(x, k, slIdx(k, x.st) + (e.key === "ArrowLeft" ? -1 : 1)); slDraw(root, x); return true; }
  if (e.key === "ArrowUp" || e.key === "ArrowDown") { const at = Math.max(0, x.open.indexOf(x.cur)); x.cur = x.open[(at + (e.key === "ArrowUp" ? -1 : 1) + x.open.length) % x.open.length]; slDraw(root, x); return true; }
  return false;
}
const slWantText = (c) => Object.entries(c.want).map(([k, v]) => `${SL_ROWS.find((r) => r[0] === k)[1]} ${slText(k, { ...c.start, [k]: v })}`).join(", ");
function renderSliders() {
  const c = P.c;
  if (!P.sl || P.sl.c !== c) P.sl = { c, st: { ...c.start }, open: c.open, cur: c.open[0], lock: false };
  main.innerHTML = hudHTML() + `<div class="card" id="card">
    <div class="crumb">Experiments / Power Calculator</div><div class="xh"><h1>Power Calculator</h1></div>
    <div class="meta">${c.idea} · ${c.T.label}</div>
    ${slPanelHTML(P.sl)}
    <div class="gq sq">${c.ask}</div>
    ${hintHTML(c)}<div class="decide" id="decide"><button type="button" class="dec" id="slcheck"><span class="kbd">Enter</span>Check it</button></div>
    ${tailHTML(`<span class="kbd">←</span> <span class="kbd">→</span> move the slider${c.open.length > 1 ? `, <span class="kbd">↑</span> <span class="kbd">↓</span> the other slider` : ""}, <span class="kbd">Enter</span> check it`)}`;
  wireSliders($("slp"), P.sl);
  $("slcheck").addEventListener("click", slCheck);
  const rl = $("relesson"); if (rl) rl.addEventListener("click", () => lesson(P.unit, true));
}
function slCheck() { if (P && !P.answered && P.c.screen === "sliders") submit(SZ.sliderRight(P.c, P.sl.st) ? "slOk" : "slNo"); }
function revealSliders(right) {
  const c = P.c, x = P.sl; x.lock = true;
  if (!right) { x.st = { ...c.start, ...c.want }; x.cur = Object.keys(c.want).at(-1); slDraw($("slp"), x); }
  $("slp").querySelectorAll("input[type=range]").forEach((i) => { i.disabled = true; });
  const t = $(c.target); if (t) t.classList.add("hl");
}
// the sidebar's Power Calculator: every slider open, any surface, no question
let PG = null;
function openPlayground(s) {
  hush(); view = "calcplay"; P = null; navState();
  const surf = s || (PG && PG.st.s) || "welcome";
  PG = { st: { s: surf, t: 3, w: 4, lift: SZ.LIFTS_OF(surf), pow: 0.8 }, open: ["t", "w", "lift", "pow"], cur: "w", lock: false };
  main.innerHTML = `<div class="card"><div class="crumb">Experiments / Power Calculator</div><div class="xh"><h1>Power Calculator</h1></div>
    <div class="meta">Move any slider. Left chart: the chance the test catches a real lift of the size you expect. Right chart: the smallest lift it can see.</div>
    <div class="pgs">${SZ.SURF.map((k) => `<button type="button" class="qcard${k === surf ? " on" : ""}" data-s="${k}">${SZ.TRAFFIC[k].label}</button>`).join("")}</div>
    ${slPanelHTML(PG)}
    <p class="note">Made-up numbers.<span class="keys-only"> Keys: <span class="kbd">←</span> <span class="kbd">→</span> move a slider, <span class="kbd">↑</span> <span class="kbd">↓</span> pick a slider, <span class="kbd">L</span> your path.</span></p></div>`;
  main.querySelectorAll("[data-s]").forEach((b) => b.addEventListener("click", () => openPlayground(b.dataset.s)));
  wireSliders($("slp"), PG);
}

// ----- Which goes first? a copy of GrowthBook's Ideas list (priority.mjs). Columns come in step by step. -----
const IDEA_CELL = { where: (x) => x.where, type: (x) => x.offer ? "Offer" : "Creative", rev: (x) => PR.money(x.rev), lift: (x) => pctS(x.lift),
  cod: (x) => PR.money(x.cod), weeks: (x) => `${x.weeks} week${x.weeks > 1 ? "s" : ""}`, wsjf: (x) => PR.money(x.wsjf) };
function ideasTable(c) {
  return `<div class="tscroll"><table class="rt stack" id="ideas"><thead><tr><th>Idea</th>${c.cols.map((k) => `<th>${PR.COL_NAME[k]}</th>`).join("")}</tr></thead><tbody>
    ${c.items.map((x, i) => `<tr id="r${i}"><td data-l="Idea"><b>${x.name}</b></td>${c.cols.map((k) => `<td data-l="${PR.COL_NAME[k]}">${IDEA_CELL[k](x)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}
function renderIdeas() {
  const c = P.c;
  main.innerHTML = hudHTML() + `<div class="card" id="card">
    <div class="crumb">Experiments / Ideas</div><div class="xh"><h1>Ideas</h1></div>
    <div class="meta">Fernhill Coffee Co.'s backlog. Made-up numbers.</div>
    ${ideasTable(c)}
    <div class="gq sq">${c.ask}</div>
    ${hintHTML(c)}${decideHTML()}
    ${tailHTML(`<span class="kbd">1</span>–<span class="kbd">${P.calls.length}</span> the call`)}`;
  wireDecide();
  const rl = $("relesson"); if (rl) rl.addEventListener("click", () => lesson(P.unit, true));
}

// ----- Marketing QA's flow map and roadmap (room.mjs): the chart or the Improve lane, then the question -----
function renderRoom() {
  const c = P.c, room = c.screen === "room";
  main.innerHTML = hudHTML() + `<div class="card" id="card">
    <div class="crumb">Marketing QA / ${room ? "Flow registry" : "Roadmap"}</div><div class="xh"><h1>${room ? "Flow registry" : "Flow roadmap"}</h1></div>
    <div class="meta">Fernhill Coffee Co.'s live flows. Made-up numbers.</div>
    <div id="roomvis">${room ? RM.chartHTML(c) + (c.table ? RM.flowTable(c) : "") : RM.laneHTML(c, { plain: true })}</div>
    <div class="gq sq">${c.ask}</div>
    ${hintHTML(c)}${decideHTML()}
    ${tailHTML(`<span class="kbd">1</span>–<span class="kbd">${P.calls.length}</span> the call`)}`;
  wireDecide();
  const rl = $("relesson"); if (rl) rl.addEventListener("click", () => lesson(P.unit, true));
}
function revealRoom() {
  const c = P.c;
  if (c.revealCaptions) $("roomvis").innerHTML = RM.chartHTML(c, { captions: true, shade: false });   // the corner names appear once the call is in
  if (c.screen === "lane") $("roomvis").innerHTML = RM.laneHTML(c);   // the chips get their colors back once the call is in
  const t = main.querySelector(`#roomvis #${c.target}`); if (t) t.classList.add("hl");
  if (c.table) { const r = $("t" + c.target.slice(1)); if (r) r.classList.add("hl"); }
}

// ----- the three tabs -----
const pct = E.pctStr;
function ciSVG(lo, hi, pt, cls, dom, worth, W = 170) {
  const H = 22, X = (v) => 6 + (Math.max(-dom, Math.min(dom, v)) + dom) / (2 * dom) * (W - 12);
  const col = cls === "w" ? "var(--win)" : cls === "l" ? "var(--loss)" : "var(--gray-bar)";
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="interval ${pct(lo)} to ${pct(hi)}">
    <line x1="${X(0)}" y1="2" x2="${X(0)}" y2="${H - 2}" stroke="var(--ink2)" stroke-width="1" stroke-dasharray="2 2"/>
    ${worth ? `<line x1="${X(worth)}" y1="0" x2="${X(worth)}" y2="${H}" stroke="var(--accent)" stroke-width="2" stroke-dasharray="3 2"/>` : ""}
    <rect x="${X(lo)}" y="7" width="${Math.max(2, X(hi) - X(lo))}" height="8" rx="4" fill="${col}" opacity=".85"/>
    <circle cx="${X(pt)}" cy="11" r="3.4" fill="var(--panel)" stroke="${col}" stroke-width="2"/>
    ${hi > dom ? `<path d="M${W - 6} 6 l5 5 l-5 5" fill="none" stroke="${col}" stroke-width="2"/>` : ""}
    ${lo < -dom ? `<path d="M6 6 l-5 5 l5 5" fill="none" stroke="${col}" stroke-width="2"/>` : ""}</svg>`;
}
function rowHTML(r, id, dom, nameId, o = {}) {
  const c = r.ctw, cls = o.plain ? "" : c >= 0.95 ? "w" : c <= 0.05 ? "l" : "", cw = cls === "w" ? "cw-win" : cls === "l" ? "cw-loss" : "";
  // data-l and c-* let a phone stack each row into a card with the column names on the cells (CSS table.stack)
  return `<tr id="${id}"><td${nameId ? ` id="${nameId}"` : ""}><b>${r.name}</b></td><td class="c-a" data-l="Baseline (A)">${r.a}<span class="sub">${r.subA}</span></td><td class="c-b" data-l="Variation (B)">${r.b}<span class="sub">${r.subB}</span></td>
    <td class="c-ctw ${cw}" data-l="Chance to Win">${E.ctwStr(c)}</td><td class="c-ci" data-l="CI graph (−${dom}% to +${dom}%)">${ciSVG(r.lo, r.hi, r.pct, cls, dom, o.worth, o.wide ? 260 : 170)}</td><td class="c-pct ${cw}" data-l="% Change">${pct(r.pct)}</td></tr>`;
}
function renderPane() {
  $("pane").innerHTML = paneHTML(P.c, P.tab);
  if (P.answered) highlight();
}
// GrowthBook shows an experiment's tags under its name; ours say whether B is a creative change or an offer
const tagHTML = (c) => c.creative === undefined ? "" : `<span class="xtag">${c.creative ? "creative" : "offer"}</span>`;
const MONEY = (c) => !!(c.unit && MO.UNITS13[c.unit]);   // money rows get the wide CI graph: the bar against the break-even line is the call
function paneHTML(c, tab) {
  if (tab === "o") {
    return `<dl class="ov">
      <dt>Hypothesis</dt><dd id="ov-hyp">${c.hypothesis}</dd>
      <dt>Where it runs</dt><dd>${c.surfaceLabel} · ${c.where}</dd>
      ${c.creative === undefined ? "" : `<dt>Change type</dt><dd id="ov-type">${c.creative ? "Creative change" : "Offer"}</dd>`}
      <dt>Assignment</dt><dd>${c.overview.assign}</dd>
      <dt>Goal metric</dt><dd id="ov-goal">${c.overview.goal}</dd>
      ${c.overview.money ? `<dt>Money</dt><dd id="ov-money">${c.overview.money}</dd>` : ""}
      ${(c.overview.extra || []).map(([k, v, id]) => `<dt>${k}</dt><dd id="${id}">${v}</dd>`).join("")}
      ${c.overview.secs ? `<dt>Secondary metrics</dt><dd id="ov-sec">${c.overview.secs.join(", ")}</dd>` : ""}
      <dt>Guardrail metrics</dt><dd id="ov-guard">${c.overview.guards.join(", ")}</dd>
      <dt>Read date</dt><dd id="ov-read">${c.plan}</dd></dl>`;
  } else if (tab === "a") {
    let dom = 20;
    c.goalRows.concat(c.guardRows, c.secRows || []).forEach((r) => { dom = Math.max(dom, Math.ceil(Math.max(Math.abs(r.lo), Math.abs(r.hi), c.beLine || 0) / 10) * 10); });
    return `<div class="tscroll"><table class="rt stack"><thead><tr><th>Metric</th><th>Baseline (A)</th><th>Variation (B)</th><th>Chance to Win</th><th>CI graph (−${dom}% to +${dom}%)</th><th>% Change</th></tr></thead><tbody>
      <tr class="sec"><td colspan="6">Goal metrics</td></tr>${c.goalRows.map((r, k) => rowHTML(r, "g" + k, dom, k === 0 ? "goal-name" : "", { worth: c.beLine, wide: MONEY(c) })).join("")}
      ${c.secRows ? `<tr class="sec"><td colspan="6">Secondary metrics</td></tr>${c.secRows.map((r, k) => rowHTML(r, "s" + k, dom, "", { wide: MONEY(c) })).join("")}` : ""}
      <tr class="sec"><td colspan="6">Guardrail metrics</td></tr>${c.guardRows.map((r, k) => rowHTML(r, "u" + k, dom, "", { wide: MONEY(c) })).join("")}</tbody></table></div>${c.beLine ? `<p class="note"><span class="lg wl"></span> the plan's break-even line, +${c.beLine}%: revenue has to clear it before profit rises</p>` : ""}`;
  } else {
    const n = c.units[0] + c.units[1], bad = c.srmP < E.SRM_ALARM;
    const pv = c.srmP < 0.001 ? "p-value below 0.001" : "p-value " + c.srmP.toFixed(3);
    return `<div style="font-weight:700;margin-bottom:8px">Experiment Balance Check</div><div class="tscroll"><table class="rt" style="min-width:520px" id="hbal">
      <thead><tr><th>Variation</th><th>Actual Units</th><th>Expected Units</th><th>Actual %</th><th>Expected %</th></tr></thead><tbody>
      ${c.units.map((u, k) => `<tr><td>${k ? "B" : "A"}</td><td class="c-au">${u.toLocaleString("en-US")}</td><td class="c-eu">${Math.round(n / 2).toLocaleString("en-US")}</td><td class="c-ap">${(u / n * 100).toFixed(1)}%</td><td class="c-ep">50.0%</td></tr>`).join("")}
      </tbody></table></div>${c.hideVerdict   // Health step 2 after the first reps: the p-value without GrowthBook's verdict, so the call is yours
        ? `<p style="margin-top:10px;font-weight:600">Balance check ${pv}.${c.showRule ? ` <span class="muted" style="font-weight:400">GrowthBook flags a mismatch below 0.001.</span>` : ""}</p>`
        : `<p style="margin-top:10px;font-weight:600;color:var(${bad ? "--loss" : "--win"})">${bad ? "Sample Ratio Mismatch (SRM) detected. " : "No sample ratio mismatch. "}${pv}.</p>`}`;
  }
}
function highlight() {
  const t = P.c.target;
  const el = t === "health" ? ($("hbal") || $("tab-h")) : t === "goal-name" ? ($("goal-name") || $("ov-goal") || $("tab-a")) : t === "day" ? $("day") : ($(t) || $("tab-a"));
  if (el) el.classList.add("hl");
  if (/^th-/.test(t)) main.querySelectorAll("td.c-" + t.slice(3)).forEach((x) => x.classList.add("hl"));   // stacked rows hide the header
  if (t === "day") { const r = $("ov-read"); if (r) r.classList.add("hl"); }
}

// ----- the call -----
function answer(i) {
  if (P && view === "play" && P.c.parts && !P.answered) return partPick(i);
  if (P && view === "play" && P.c.guided && !P.answered && !P.gfinal) return P.c.screen === "board" ? boardGuide(i) : P.c.screen === "scene" ? sceneGuide(i) : P.c.screen === "experiment" ? expGuide(i) : guide(i);
  if (!P || view !== "play" || P.answered || P.c.place || P.c.slot || P.c.screen === "sliders" || i < 0 || i >= P.calls.length) return;
  submit(P.calls[i]);
}
function submit(call) {
  P.answered = true; P.picked = call;
  const c = P.c, ms = Math.round(performance.now() - P.t0);
  const g = E.grade(c, call, P.seen, needTabs(c, P.tabs));
  let justPassed = false;
  const rep = { kind: c.kind, stage: c.stage, right: g.right, clean: g.tier === "clean", ms, at: Date.now() };
  if (P.mode === "unit") {
    const st = S.units[P.unit];
    justPassed = E.record(st, rep, E.UNITS[P.unit].pass).justPassed;
    // fast lane: a clean start (no misses, three Realistic reps) passes a single-idea step at rep 5 instead of 6
    if (!justPassed && !st.passed && (E.UNITS[P.unit].pass || [7, 8])[1] <= 6 && st.reps.length >= 5 && st.reps.every((x) => x.right) && st.reps.filter((x) => x.stage === 2).length >= 3) { st.passed = true; justPassed = true; }
    if (justPassed) { dayState().passed.push(P.unit); dayState().log.push({ type: "step", unit: P.unit }); }
  }
  else if (P.mode === "quarter") { P.qres = Q.call(QS().run, P.tid, call, c.answer); }
  else if (P.mode === "ms1") { const run = S.ms1.run; run.res.push({ r: g.right, t: P.task.type, k: c.kind }); run.i++; }
  else if (P.mode === "testout") { S.units[P.unit].reps.push(Object.assign(rep, { testout: true })); if (!g.right) S.units[P.unit].review.push({ kind: c.kind, due: S.units[P.unit].reps.length + 1 }); P.n++; }
  else if (P.mode === "warm") {
    S.units[P.owner].reps.push(Object.assign(rep, { daily: true, warm: true }));
    const iv = Z.review(S.v3.ivl, P.owner, g.right, Date.now());
    P.reviews.push({ unit: P.owner, right: g.right, due: iv.due });
    if (!g.right && !P.requeued[P.owner]) { P.requeued[P.owner] = 1; const ks = E.UNITS[P.owner].kinds; P.queue.push({ unit: P.owner, kind: ks[Math.floor(Math.random() * ks.length)] }); }   // a miss gets one more try, later in the warm-up
    P.qi++;
  }
  else { S.units[P.owner].reps.push(Object.assign(rep, { daily: true })); P.qi++; }
  { const d = dayState(); d.reps++; if (g.right) d.right++; }
  P.results.push({ tier: g.tier, ms, kind: c.kind });
  P.combo = g.right ? P.combo + 1 : 0;
  markDay();
  logRep({ at: new Date().toISOString(), mode: P.mode, unit: P.mode === "unit" || P.mode === "testout" ? P.unit : P.mode === "ms1" ? "MS1" : P.mode === "quarter" ? "quarter" : P.mode === "warm" ? P.owner : "daily", kind: c.kind, stage: c.stage,
           surface: c.surface || c.screen, seed: c.seed, call, answer: c.answer, tier: g.tier, ms, seen: P.seen, keys: P.keysUsed, clicks: P.clicks });
  // the screen
  main.querySelectorAll(".dec").forEach((b) => { b.disabled = true; if (b.dataset.id === c.answer) b.classList.add("right"); if (b.dataset.id === call && !g.right) b.classList.add("wrong"); });
  const caught = g.right && ["distrust", "chosen", "after", "beforeAfter", ...H.CAUGHT7].includes(c.answer);
  const st = $("stamp"); st.className = "stamp " + (g.right ? "good" : "bad");
  st.textContent = c.screen === "sliders" ? (g.right ? "Right setting" : "Not that setting") : c.place ? (g.right ? "Scheduled" : "Not that week") : c.slot ? (g.right ? "Right spot" : "Not there") : c.opts ? callLabel(call) : E.callById(call).stamp; void st.offsetWidth;
  st.classList.add(caught || justPassed ? "big" : "on");
  const strip = $("strip");
  const missingTxt = g.missing.map((t) => `${TAB_NAME[t]} (${KEY_OF[t]})`).join(" and ");
  strip.className = "strip " + g.tier;
  strip.innerHTML = pxFace("priya", g.tier === "miss" ? "worried" : caught || justPassed ? "surprised" : "smile") + (g.tier === "clean" ? `<b class="t">Clean read.</b> ` : g.tier === "ok" ? `<b class="t">Right call. Next time open ${missingTxt} first.</b> ` :
    `<b class="t">Miss. ${c.screen === "sliders" ? "The setting was " + slWantText(c) : c.parts ? "Not every line held up" : c.place ? "The first week it can run is " + E.BOARD_WEEKS[+c.answer.slice(1)] : c.slot ? "Not that spot" : c.opts ? "The answer was " + callLabel(c.answer) : "The call was " + E.callById(c.answer).label}.</b> `) + c.why;
  if (P.qres) strip.insertAdjacentHTML("beforeend", ` <span class="qwhat"><b>${P.qres.what}</b></span>`);
  if (g.tier === "clean") SND.clean(P.combo); else if (g.tier === "ok") SND.ok(P.combo); else {
    SND.miss(); const d = $("decide") || $("board"); if (d) { d.classList.remove("shake"); void d.offsetWidth; d.classList.add("shake"); }
  }
  if (c.screen === "setup") revealSetup(); else if (c.screen === "board") revealBoard(call); else if (c.screen === "scene") revealScene(call, g.right); else if (c.screen === "calc" || c.screen === "ideas") revealCalc(call); else if (c.screen === "sliders") revealSliders(g.right); else if (c.screen === "room" || c.screen === "lane") revealRoom();
  // jump to where the deciding number lives
  const t = c.target, need = c.screen !== "experiment" ? null : t === "health" ? "h" : (t === "goal-name" || /^[gu]\d$/.test(t)) ? "a" : null;
  if (c.screen !== "experiment") { /* revealed above */ }
  else if (need && P.tab !== need && P.tabs.includes(need)) { P.tab = need; main.querySelectorAll(".tab").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === need))); renderPane(); }
  else highlight();
  main.querySelector(".hud").outerHTML = hudHTML();
  save();
  if (!g.right) narrate("Not this time.", strip.querySelector(".t") ? strip.querySelector(".t").textContent.replace(/^Miss\.\s*/, "") : "", c.why); else if (!justPassed) hush();
  if (justPassed) { P.holding = true; const at = P.c; setTimeout(() => { if (P && P.c === at) { P.holding = false; passCard(); } }, 650); }
  else actions(strip);
}
function actions(strip) {
  const last = ((P.mode === "daily" || P.mode === "warm") && P.qi >= P.queue.length) || (P.mode === "testout" && (P.n >= TESTOUT || P.results.some((r) => r.tier === "miss")));
  const weekEnd = P.mode === "ms1" && S.ms1.run.i % E.MS1.perWeek === 0;
  const div = document.createElement("div"); div.className = "acts";
  div.innerHTML = `<button class="btn primary" type="button" id="next">${P.mode === "quarter" ? "Back to Monday" : last ? (P.mode === "testout" ? "See how it went" : P.mode === "warm" ? "Continue" : "See today's summary") : weekEnd ? (S.ms1.run.i >= E.MS1.weeks * E.MS1.perWeek ? "See how the month went" : "End of the week") : "Next"} <span class="kbd">Enter</span></button>`;
  strip.appendChild(div);
  $("next").addEventListener("click", advance);
}
function advance() {
  if (!P || !P.answered || P.holding) return;
  if (P.mode === "daily" && P.qi >= P.queue.length) return dailyDone();
  if (P.mode === "warm" && P.qi >= P.queue.length) return warmDone();
  if (P.mode === "ms1" && S.ms1.run.i % E.MS1.perWeek === 0) return ms1Week();
  if (P.mode === "quarter") return qMonday("");
  nextCase();
}

// ---------- MS1 First four Mondays (engine: ms1Plan, ms1Case). One run at a time, saved in S.ms1, resumable. ----------
const MS1_TOTAL = E.MS1.weeks * E.MS1.perWeek;
const MS1_WHAT = { check: "a plan to check", read: "a finished test to call", write: "the write-up", place: "a new card to place" };
function ms1Label(t) {
  if (t.type === "check") return { U1g: "Check: a test result in #email-tests", U3g: "Check: a flow test plan in #email-tests", U4g: "Check: the pre-flight before Tuesday's send", U5g: "Check: a GrowthBook metric setup" }[t.unit];
  const c = E.ms1Case(t);
  if (t.type === "read") return `Call it: ${c.name}${t.idea ? " (back from last week)" : ""}`;
  if (t.type === "write") return `Write up: ${c.from.name}`;
  return `Place: ${c.card.name} on the daily campaign row`;
}
function startMS1() {
  if (!unitOpen("MS1")) return renderMap();
  S.ms1 = S.ms1 || {};
  if (!S.lessons.MS1 && LESSONS.MS1) return lesson("MS1");
  if (!S.ms1.run) { S.ms1.run = { seed: (Math.random() * 2 ** 31) | 0, i: 0, res: [], started: today() }; save(); }
  P = { mode: "ms1", results: [], combo: 0 };
  ms1Week();
}
function ms1Week() {
  hush(); view = "ms1week"; navState();
  const run = S.ms1.run, plan = E.ms1Plan(run.seed), w = Math.floor(run.i / E.MS1.perWeek);
  const prev = run.i > 0 ? run.res.slice((w - 1) * E.MS1.perWeek, w * E.MS1.perWeek) : null;
  const prevLine = prev ? `<p><b>Week ${w} done:</b> ${prev.filter((x) => x.r).length} of ${prev.length} right. Running total ${run.res.filter((x) => x.r).length} of ${run.res.length}.</p>` : "";
  if (run.i >= MS1_TOTAL) return ms1Done();
  const tasks = plan.filter((t) => t.w === w);
  P = P && P.mode === "ms1" ? P : { mode: "ms1", results: [], combo: 0 };
  main.innerHTML = `<div class="mapwrap"><div class="note">MS1 · First four Mondays · daily campaign only</div>
    <h1>Monday ${E.MS1.mondays[w]} · week ${w + 1} of ${E.MS1.weeks}</h1>${prevLine}
    <p class="muted">This week's inbox. Work it top to bottom. Made-up numbers.</p>
    <ol class="steps">${tasks.map((t, k) => `<li class="step live"><span class="sn">${k + 1}</span><span class="snm">${ms1Label(t)}</span></li>`).join("")}</ol>
    <button class="btn primary" type="button" id="ms1go">${run.i % E.MS1.perWeek ? "Continue" : "Start Monday"} <span class="kbd">Enter</span></button></div>`;
  $("ms1go").addEventListener("click", ms1Task);
  narrate(`Monday, ${E.MS1.mondays[w]}. Week ${w + 1} of ${E.MS1.weeks}.`, prev ? `Last week, ${prev.filter((x) => x.r).length} of ${prev.length} right.` : "",
    "This week: " + tasks.map((t) => MS1_WHAT[t.type]).join(", ") + ".");
}
function ms1Task() {
  const run = S.ms1.run, t = E.ms1Plan(run.seed)[run.i];
  if (!t) return ms1Done();
  P.task = t; P.c = E.ms1Case(t);
  const U = E.UNITS[t.unit], tabs = U.tabs || [];
  if (tabs.length && !S.intro[U.keyUnit || t.unit]) { S.intro[U.keyUnit || t.unit] = true; }
  Object.assign(P, { tabs, calls: P.c.opts ? P.c.opts.map((o) => o[0]) : U.calls, labels: P.c.opts ? Object.fromEntries(P.c.opts) : null,
                     coin: P.c.vis && P.c.vis.flow ? P.c.vis.flow.split || 0 : 0, ghost: 0, tab: "a", seen: ["a"], answered: false, tv: null, world: null, gfinal: false,
                     t0: performance.now(), keysUsed: [], clicks: [], passCard: false });
  save(); view = "play"; navState(); renderPlay(); hush();
}
function ms1Hud() {
  const run = S.ms1.run, w = Math.floor(Math.max(0, run.i - (P.answered ? 1 : 0)) / E.MS1.perWeek), k = (run.i - (P.answered ? 1 : 0)) % E.MS1.perWeek;
  const reps = run.res.slice(w * E.MS1.perWeek).map((x) => ({ right: x.r, clean: x.r }));
  return `<div class="hud"><span class="u">MS1 · Week ${w + 1} of ${E.MS1.weeks} · Monday ${E.MS1.mondays[w]}</span><span class="chip">${MS1_WHAT[P.task.type]}</span>${pipsHTML(reps, E.MS1.perWeek)}
    <span class="sp"></span><span>${k + 1} of ${E.MS1.perWeek}</span></div>`;
}
function ms1Done() {
  hush(); view = "summary";
  const run = S.ms1.run, right = run.res.filter((x) => x.r).length, writes = run.res.filter((x) => x.t === "write");
  const pass = right >= E.MS1.need && writes.every((x) => x.r);
  const by = ["check", "read", "write", "place"].map((t) => { const xs = run.res.filter((x) => x.t === t); return `<div><div class="n">${xs.filter((x) => x.r).length} of ${xs.length}</div><div class="l">${{ check: "plans checked", read: "results called", write: "write-ups", place: "cards placed" }[t]}</div></div>`; }).join("");
  const missed = [...new Set(run.res.filter((x) => !x.r).map((x) => KIND_NAMES[x.k] || x.k))];
  const wasPassed = !!S.ms1.passed;
  S.ms1.best = Math.max(S.ms1.best || 0, right); if (pass) S.ms1.passed = true; S.ms1.run = null; save();
  if (pass) SND.pass(); else SND.miss();
  main.innerHTML = `<div class="mapwrap"><div class="note">MS1 · First four Mondays</div><h1>${pass ? "The month went well" : "Not this month"}</h1>
    <div class="sum"><div><div class="n">${right} of ${MS1_TOTAL}</div><div class="l">right</div></div>${by}</div>
    <p>${pass ? `Passed: ${E.MS1.need} or more right and every write-up right.${wasPassed ? "" : ` <b>Unlocked:</b> ${UNLOCK_TEXT.MS1}`}` : `To pass: ${E.MS1.need} of ${MS1_TOTAL} right and every write-up right. A new run starts with fresh tests.`}</p>
    ${missed.length ? `<p class="muted">Missed: ${missed.join(", ")}. The steps on your path are still there to practise them.</p>` : ""}
    <button class="btn primary" type="button" id="tomap">${SES.on ? "Continue" : "Back to your path <span class=\"kbd\">L</span>"}</button></div>`;
  $("tomap").addEventListener("click", SES.on ? sessionNext : renderMap);
  if (pass) dayState().log.push({ type: "step", unit: "MS1" });
  narrate(pass ? "The month went well. MS1 passed." : "Not this month.", `${right} of ${MS1_TOTAL} right.`, pass && !wasPassed ? "Unlocked: " + UNLOCK_TEXT.MS1 : "");
}
function passCard() {
  P.passCard = true; SND.pass();
  const U = E.UNITS[P.unit], st = S.units[P.unit], s = unitStats(st), [need, of] = U.pass || [7, 8];
  const lastN = st.reps.slice(-of).filter((r) => r.right).length;
  const nxt = isStep(P.unit) && !lastStep(P.unit) ? PATH[PATH.indexOf(P.unit) + 1] : null;
  if (EMBED) return embedPass(U, st, s, lastN, of);
  const ses = P.session;   // v3: in a session, the pass leads on to the next thing in today's plan, never back into more reps
  P.afterPass = ses ? sessionNext : nxt ? () => startUnit(nxt) : renderMap;      // Enter does what the primary button says
  const upNext = ses ? itemLabel(todayPlan()[0]) : "";
  const box = document.createElement("div"); box.className = "passcard";
  box.innerHTML = `<h2>${isStep(P.unit) ? `Step ${U.step} passed` : P.unit + " passed"}: ${U.name}</h2>
    <div class="sum"><div><div class="n">${lastN} of ${of}</div><div class="l">last ${of} calls right</div></div><div><div class="n">${s.clean}%</div><div class="l">clean reads, last 20</div></div>
    <div><div class="n">${s.med} s</div><div class="l">median time to a right call</div></div><div><div class="n">${st.reps.length}</div><div class="l">reps</div></div></div>
    <p><b>Unlocked:</b> ${nxt ? `Step ${E.UNITS[nxt].step}: ${E.UNITS[nxt].name}.` : UNLOCK_TEXT[P.unit]}</p>
    ${ses ? `<p><b>Up next:</b> ${upNext}.</p>` : ""}
    <div class="acts" style="display:flex;gap:8px;flex-wrap:wrap">${ses
      ? `<button class="btn primary" type="button" id="more">Continue <span class="kbd">Enter</span></button><button class="btn" type="button" id="tomap">Practise this step more</button>`
      : nxt
      ? `<button class="btn primary" type="button" id="more">Next step <span class="kbd">Enter</span></button><button class="btn" type="button" id="tomap">Back to your path <span class="kbd">L</span></button>`
      : `<button class="btn primary" type="button" id="tomap">Back to your path <span class="kbd">L</span></button><button class="btn" type="button" id="more">Keep practising <span class="kbd">Enter</span></button>`}</div>`;
  $("card").appendChild(box);
  narrate(`${isStep(P.unit) ? "Step " + U.step : P.unit} passed: ${U.name}.`, "Unlocked: " + box.querySelector("p").textContent.replace(/^Unlocked:\s*/, ""));
  if (ses) { $("more").addEventListener("click", sessionNext); $("tomap").addEventListener("click", () => nextCase()); }
  else { $("tomap").addEventListener("click", renderMap); $("more").addEventListener("click", () => nxt ? P.afterPass() : nextCase()); }
}
// ---------- embedded in the office: the pass goes back to the office, and the path screens are replaced by one card ----------
function embedPass(U, st, s, lastN, of) {
  toOffice({ type: "passed", unit: P.unit, reps: st.reps.length });
  P.afterPass = () => toOffice({ type: "close" });
  const box = document.createElement("div"); box.className = "passcard";
  box.innerHTML = `<h2>Step passed: ${U.name}</h2>
    <div class="sum"><div><div class="n">${lastN} of ${of}</div><div class="l">last ${of} calls right</div></div><div><div class="n">${s.clean}%</div><div class="l">clean reads, last 20</div></div>
    <div><div class="n">${s.med} s</div><div class="l">median time to a right call</div></div><div><div class="n">${st.reps.length}</div><div class="l">reps</div></div></div>
    <div class="acts" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" type="button" id="more">Back to the office <span class="kbd">Enter</span></button><button class="btn" type="button" id="tomap">Keep practising</button></div>`;
  $("card").appendChild(box); box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  narrate(`Step passed: ${U.name}.`);
  $("more").addEventListener("click", P.afterPass); $("tomap").addEventListener("click", () => nextCase());
}
function embedHome() {
  hush(); view = "summary"; P = null; navState(); drawStrip();
  const st = S.units[EMBED], U = E.UNITS[EMBED];
  main.innerHTML = `<div class="mapwrap"><h1>${U ? U.name : EMBED}</h1><p>${st && st.passed ? "Passed. Practise more, or head back." : "Not passed yet."}</p>
    <div style="display:flex;gap:8px"><button class="btn primary" type="button" id="egoo">Practise <span class="kbd">Enter</span></button><button class="btn" type="button" id="eback">Back to the office</button></div></div>`;
  P = { mode: "after-testout", go: () => startUnit(EMBED) };
  $("egoo").addEventListener("click", () => startUnit(EMBED)); $("eback").addEventListener("click", () => toOffice({ type: "close" }));
}
function dailyDone() {
  hush(); view = "summary";
  const R = P.results, right = R.filter((r) => r.tier !== "miss").length, clean = R.filter((r) => r.tier === "clean").length;
  const ms = R.filter((r) => r.tier !== "miss").map((r) => r.ms).sort((a, b) => a - b);
  const med = ms.length ? Math.round(ms[Math.floor((ms.length - 1) / 2)] / 1000) : 0;
  const missed = [...new Set(R.filter((r) => r.tier === "miss").map((r) => KIND_NAMES[r.kind]))];
  S.daily = { date: today(), n: R.length, right, clean }; save();
  main.innerHTML = `<div class="mapwrap"><h1>Done for today</h1>
    <div class="sum"><div><div class="n">${right} of ${R.length}</div><div class="l">right calls</div></div><div><div class="n">${clean}</div><div class="l">clean reads</div></div>
    <div><div class="n">${med} s</div><div class="l">median time to a right call</div></div><div><div class="n">${weekDays()}</div><div class="l">days practised this week</div></div></div>
    <p>${missed.length ? `Tomorrow's round leans toward ${missed.join(", ")}.` : "Nothing to revisit. Tomorrow's round mixes these with new look-alikes."}</p>
    <button class="btn primary" type="button" id="tomap">Back to your path <span class="kbd">L</span></button></div>`;
  $("tomap").addEventListener("click", renderMap);
}

// ---------- v3: the daily session ----------
// Today: warm-up (spaced review, mixed) -> the next steps in order -> one chapter -> done for today. Built from the
// pacing research: spacing and retrieval first, new material while fresh, story as the rest beat that also uses what
// was learned, and a clear end so stopping feels like finishing.
const SES = { on: false };
function dayState() {
  S.v3 = S.v3 || { ivl: {}, day: null, sessions: [] };
  if (!S.v3.day || S.v3.day.date !== today()) S.v3.day = { date: today(), warm: null, passed: [], extra: 0, storyDone: false, reps: 0, right: 0, t0: Date.now(), log: [] };
  return S.v3.day;
}
const onPath = (x) => x.type === "warm" || x.type === "quarter" || (x.type === "step" && PATH.includes(x.unit));   // older log lines (cut units, story) stay saved, not shown
const playedChapters = () => Object.fromEntries(Object.entries((S.story && S.story.ch) || {}).filter(([, v]) => v && v.done).map(([k]) => [k, true]));
function todayPlan() {   // a short release (RELEASE) fits in one session, so it plans every step at once
  const items = Z.plan({ units: pathUnits(), day: RELEASE ? { ...dayState(), extra: PATH.length } : dayState(), path: PATH, isDone: done, chapters: [], played: playedChapters(), warmDue: Z.dueCount(pathUnits(), S.v3.ivl, Date.now()) });   // no story beat since 2026-10-14
  // once the path is done: two Mondays of the quarter a day, until a quarter passes
  if (quarterOpen() && !(S.quarter && S.quarter.passed) && !items.some((x) => x.type === "step") && (dayState().qWeeks || 0) < 2) items.splice(items.length - 1, 0, { type: "quarter" });
  return items;
}
function itemLabel(it) {
  if (!it) return "";
  if (it.type === "warm") return `Warm-up: ${it.n} step${it.n > 1 ? "s" : ""} due for review, one rep each`;
  if (it.type === "quarter") return S.quarter && S.quarter.run ? `Run the quarter: two Mondays, from ${Q.QWEEKS[S.quarter.run.week]}` : "Run the quarter: plan the board, then two Mondays";
  if (it.type === "step") return it.unit === "MS1" ? "MS1 · First four Mondays" : isStep(it.unit) ? stepTitle(it.unit) : `${it.unit} · ${E.UNITS[it.unit].name}`;
  if (it.type === "story") { const c = CHAPTERS.find((x) => x.id === it.ch); return `Story, chapter ${CHAPTERS.indexOf(c) + 1}: ${c.title}`; }
  return "Done for today";
}
const ITEM_TIME = { warm: "about a minute", step: "2 to 5 minutes", story: "about 8 minutes", quarter: "about 10 minutes", done: "" };
function sessionNext() {
  hush(); storyStop(); SES.on = true;
  const it = todayPlan()[0];
  if (it.type === "warm") return startWarm();
  if (it.type === "step") return it.unit === "MS1" ? startMS1() : startUnit(it.unit);
  if (it.type === "quarter") return startQuarter();
  if (it.type === "story") { view = "story"; drawStrip(); return playChapter(it.ch); }
  return renderDone();
}
// the strip over every screen while a session runs: what's done today, what's left, where you are
function drawStrip() {
  const el = $("sess"); if (!el) return;
  if (!SES.on || !S.v3 || ["map", "today", "done", "tool"].includes(view)) { el.hidden = true; return; }
  const d = dayState(), left = todayPlan();
  const doneTxt = d.log.filter(onPath).map((x) => `<span class="si ok">✓ ${x.type === "warm" ? "Warm-up" : x.type === "quarter" ? "Quarter" : x.type === "story" ? "Story" : x.unit === "MS1" ? "MS1" : (E.UNITS[x.unit] ? (UNAME[E.UNITS[x.unit].parent] || E.UNITS[x.unit].parent) + " " + E.UNITS[x.unit].step : x.unit)}</span>`);
  const leftTxt = left.map((x, i) => `<span class="si${i === 0 ? " cur" : ""}">${x.type === "warm" ? "Warm-up" : x.type === "quarter" ? "Quarter" : x.type === "story" ? "Story" : x.type === "done" ? "Done" : x.unit === "MS1" ? "MS1" : (E.UNITS[x.unit] ? (UNAME[E.UNITS[x.unit].parent] || E.UNITS[x.unit].parent) + " " + E.UNITS[x.unit].step : x.unit)}</span>`);
  el.innerHTML = `<span class="sl">Today</span>${doneTxt.concat(leftTxt).join('<span class="sa">›</span>')}`;
  el.hidden = false;
}
function renderToday() {
  if (EMBED) return embedHome();
  hush(); storyStop(); view = "today"; P = null; navState(); drawStrip();
  const d = dayState(), items = todayPlan(), fresh = !d.log.length && !d.reps;
  if (items[0].type === "done" && !fresh) return renderDone();
  const dueN = Z.dueCount(pathUnits(), S.v3.ivl, Date.now());
  const left = items.filter((x) => x.type !== "done").length;
  main.innerHTML = `<div class="mapwrap today">
    ${pxBanner("office_crew", "priya", "smile", "Priya · Analyst", fresh ? (left ? `Morning! ${left} thing${left === 1 ? "" : "s"} on today's list. The board's up when you are.` : "Nothing new today. Come back tomorrow.") : `Welcome back. ${left} left on today's list.`)}
    <div class="note">${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
    <h1>${fresh ? "Today's session" : "Pick up where you left off"}</h1>
    <p class="muted">${RELEASE ? RELEASE.blurb + " " : !S.v3.cut ? "The path covers only the tool screens: the Board, then GrowthBook's Results, Health and Overview tabs, then the quarter. A warm-up on what's due, then the next steps. " : ""}About 15 minutes. Stop whenever the list is done.</p>
    <ol class="plan">${d.log.filter(onPath).map((x) => `<li class="done"><span class="pi">✓</span><span>${itemLabel(x.type === "warm" ? { type: "warm", n: x.n || 1 } : x.type === "quarter" ? { type: "quarter" } : x)}</span></li>`).join("")}
      ${items.map((x, i) => `<li class="${i === 0 ? "cur" : ""}"><span class="pi">${x.type === "quarter" ? "▦" : x.type === "warm" ? "↻" : x.type === "story" ? "⚖" : x.type === "done" ? "■" : "●"}</span><span>${itemLabel(x)}${ITEM_TIME[x.type] ? `<span class="note"> · ${ITEM_TIME[x.type]}</span>` : ""}</span></li>`).join("")}</ol>
    <div class="row" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button class="btn primary" type="button" id="go-today">${fresh ? "Start" : "Continue"} <span class="kbd">Enter</span></button>
      <button class="btn" type="button" id="go-path">Your path</button></div>
    <p class="note" style="margin-top:14px">${dueN ? `${dueN} step${dueN > 1 ? "s" : ""} due for review.` : "Nothing due for review yet: steps come back a few hours after you pass them, then after 1, 3, 7, 14 and 30 days."} Days practised this week: ${weekDays()}. Made-up numbers.</p></div>`;
  $("go-today").addEventListener("click", () => { S.v3.cut = true; save(); sessionNext(); });
  $("go-path").addEventListener("click", renderMap);
}
function startWarm() {
  const q = Z.warmPick(pathUnits(), S.v3.ivl, Date.now(), E.rng((Math.random() * 2 ** 31) | 0));
  if (!q.length) { dayState().warm = "skip"; save(); return sessionNext(); }
  P = { mode: "warm", queue: q, qi: 0, results: [], combo: 0, requeued: {}, reviews: [], session: true };
  nextCase();
}
const inWords = (ms) => { const h = ms / Z.HOUR; return h < 1 ? "within the hour" : h < 20 ? `in ${Math.round(h)} hours` : h < 36 ? "tomorrow" : `in ${Math.round(h / 24)} days`; };
function warmDone() {
  hush(); const d = dayState(); d.warm = "done";
  const R = P.reviews, right = R.filter((x) => x.right).length, n = R.length;
  d.log.push({ type: "warm", n: new Set(R.map((x) => x.unit)).size }); save();
  const last = {}; R.forEach((x) => { last[x.unit] = x; });
  view = "summary"; drawStrip();
  main.innerHTML = `<div class="mapwrap"><div class="note">Warm-up</div><h1>${right} of ${n} right</h1>
    <ul class="exlist" style="margin:12px 0">${Object.values(last).map((x) => `<li class="${x.right ? "fair" : "bad"}"><span class="tag">${x.right ? "held" : "again"}</span><span>${isStep(x.unit) ? stepTitle(x.unit) : x.unit} · back ${inWords(x.due - Date.now())}</span></li>`).join("")}</ul>
    <p class="muted">Each step you get right comes back after a longer gap. A miss brings it back sooner.</p>
    <p><b>Up next:</b> ${itemLabel(todayPlan()[0])}.</p>
    <button class="btn primary" type="button" id="wgo">Continue <span class="kbd">Enter</span></button></div>`;
  $("wgo").addEventListener("click", sessionNext);
  P = { mode: "after-testout", go: sessionNext };
  narrate(`Warm-up: ${right} of ${n} right.`);
}
function renderDone() {
  hush(); storyStop(); view = "done"; P = null; SES.on = false; navState(); drawStrip();
  const d = dayState(), mins = Math.max(1, Math.round((Date.now() - d.t0) / 60000));
  const steps = d.log.filter((x) => x.type === "step" && PATH.includes(x.unit)), story = d.log.find((x) => x.type === "story");
  const nd = Z.nextDue(pathUnits(), S.v3.ivl), nextUp = Z.nextSteps(PATH, done, 2);
  if (!S.v3.sessions.some((x) => x.date === d.date && x.reps === d.reps)) { S.v3.sessions.push({ date: d.date, reps: d.reps, right: d.right, mins, steps: steps.map((x) => x.unit), story: story ? story.ch : null }); S.v3.sessions = S.v3.sessions.slice(-120); save(); }
  SND.pass();
  main.innerHTML = `<div class="mapwrap">${pxBanner("office_crew_evening", "dana", "smile", "Dana · VP of Marketing", d.right === d.reps ? "Clean day. Go home, the board will keep." : "Good work today. Go home, the board will keep.")}<div class="note">Done for today</div><h1>That's today's session</h1>
    <div class="sum"><div><div class="n">${d.right} of ${d.reps}</div><div class="l">reps right today</div></div><div><div class="n">${steps.length}</div><div class="l">step${steps.length === 1 ? "" : "s"} passed</div></div>
      <div><div class="n">${PATH.filter((u) => !done(u)).length}</div><div class="l">steps left on the path</div></div><div><div class="n">${weekDays()}</div><div class="l">days practised this week</div></div></div>
    <p><b>Next time:</b> ${nd ? `a warm-up (the first review falls due ${inWords(nd - Date.now())}), then ` : ""}${nextUp.length ? nextUp.map((u) => u === "MS1" ? "MS1" : isStep(u) ? `step ${E.UNITS[u].step} of ${E.UNITS[u].parent}, ${E.UNITS[u].name}` : u).join(" and ") : "the rest of the path"}${nextUp.length && E.UNITS[nextUp.at(-1)].name.endsWith("?") ? "" : "."}</p>
    <p class="muted">Coming back on a later day does more for remembering this than more reps tonight. If you want more anyway:</p>
    <div class="row" style="display:flex;gap:8px;flex-wrap:wrap">${nextUp.length ? `<button class="btn" type="button" id="more1">One more step</button>` : ""}<button class="btn" type="button" id="go-path2">Your path</button></div></div>`;
  const m1 = $("more1"); if (m1) m1.addEventListener("click", () => { dayState().extra++; save(); sessionNext(); });
  $("go-path2").addEventListener("click", renderMap);
  narrate("That's today's session.");
}
// v3 stage ramp: the first rep is the worked example (Meet, with its hint); a clean start then skips ahead
// (Clear, then Realistic from the third rep). After any miss it falls back to v2's slower ramp.
function stageV3(st) {
  const r = st.reps.filter((x) => !x.daily);
  if (!r.length) return 0;
  if (r.every((x) => x.right)) return r.length === 1 ? 1 : 2;
  return E.stageFor({ reps: r });
}
// the step's key ideas, from its lesson's headings, over the first rep; the whole lesson is one click away
function briefShow() {
  const u = P.unit, scr = LESSONS[u]; if (!scr) return;
  const card = $("card"); if (!card) return;
  card.insertAdjacentHTML("beforebegin", `<div class="brief"><div class="bk">New in this step</div><ul>${scr.map((x) => `<li>${x.h}</li>`).join("")}</ul>
    <button class="linkbtn" type="button" id="brief-full">Show the full lesson (${scr.length} screen${scr.length === 1 ? "" : "s"})</button></div>`);
  $("brief-full").addEventListener("click", () => lesson(u, true));
}

// ---------- v3 phase 1: the tool frame (PLAN.md). Experiments list, experiment page (Overview, Results, Health) and the
// Board show one program (world.mjs). In a rep, R and W open the list or the board in place of the card and the rep
// waits; Enter, a number or a tab key brings it back. Outside a rep they open the same views to look around. ----------
let BR = null;   // the tool outside a rep: { world, date, tv: "list" | "board" | "exp", x, tab, f }
const repHome = () => (P && P.c && P.c.screen === "board" ? "board" : P && P.c && (P.c.screen === "room" || P.c.screen === "lane") ? "mqa" : "exp");   // where a rep lives: R and W peek elsewhere
const STATUS_CLS = { Running: "", Draft: "draft", Stopped: "stop" };
function repWorld() {
  if (!P.world) {
    if (P.c.screen === "board") P.world = W.worldFromBoard(P.c);
    else {
      const parts = (P.c.crumb || "").split(" / ");
      P.world = W.makeWorld((P.c.seed ^ 0x5bd1e995) >>> 0, P.c.screen === "experiment" ? P.c : { name: parts[2] || P.c.title, surfaceLabel: parts[1] || "" });
    }
  }
  return P.world;
}
function repView(v) {
  const card = $("card"); if (!card) return;
  let alt = $("toolalt");
  if (!alt) { card.insertAdjacentHTML("afterend", `<div class="card" id="toolalt" hidden></div>`); alt = $("toolalt"); }
  const home = repHome();
  if (v === "exp" && home !== "exp") v = "list";
  if (v === home || v === P.tv) { alt.hidden = true; card.hidden = false; P.tv = null; }   // the same key again also goes back
  else {
    const w = repWorld(), pin = w.exps.find((x) => x.pinned);
    alt.innerHTML = `<div class="backbar"><span>Your call is waiting on <b>${pin ? pin.c.name : "this test"}</b>.</span>
      <button class="btn sm primary" type="button" id="tback">Back to it <span class="kbd">Enter</span></button></div>` + (v === "list" ? listHTML(w, P.listF || "all", true) : boardViewHTML(w));
    card.hidden = true; alt.hidden = false; P.tv = v;
    $("tback").addEventListener("click", () => repView(home));
    alt.querySelectorAll("tr.pin").forEach((tr) => tr.addEventListener("click", () => repView(home)));
    alt.querySelectorAll("[data-f]").forEach((b) => b.addEventListener("click", () => { P.listF = b.dataset.f; P.tv = null; repView("list"); }));
  }
  const br = main.querySelector(".brief"); if (br) br.hidden = !!P.tv;
  navState();
}
function openTool(v) {
  if (view === "quarter" || (P && P.mode === "quarter")) return qMonday(undefined, v);   // in the quarter, the list and the board are the Monday screen
  if (view === "play" && P && P.c && P.mode !== "ms1") return repView(v);
  hush(); storyStop(); SES.on = false; P = null;
  if (!BR || BR.date !== today()) BR = { world: W.makeWorld([...today()].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7)), date: today(), tv: "list", f: "all" };
  BR.tv = v; view = "tool"; navState(); drawStrip(); renderTool();
}
// Marketing QA's two screens from the sidebar: today's Fernhill flows to look around in. The Improve first tile and the
// next-test chip are the answers the Flow map and Roadmap units teach, so they show once that unit is passed.
const mqaOpen = (v) => { const u = v === "reg" ? "U11a" : "U12a"; return DEV || (!!S.units[u] && unitOpen(u)); };
function openMQA(v) {
  if (!mqaOpen(v)) return;
  hush(); storyStop(); SES.on = false; P = null;
  const seed = [...today()].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 11);
  view = "mqa"; MQ = { v, c: RM.browseCase(seed) }; navState(); drawStrip();
  const c = MQ.c, done = (u) => DEV || !!(S.units[u] && S.units[u].passed);
  main.innerHTML = `<div class="mapwrap wide"><div class="card">
    <div class="crumb">Marketing QA / ${v === "reg" ? "Flow registry" : "Roadmap"}</div><div class="xh"><h1>${v === "reg" ? "Flow registry" : "Flow roadmap"}</h1></div>
    <div class="meta">Fernhill Coffee Co.'s live flows today. Made-up numbers.${v === "reg" ? (done("U11c") ? "" : " The Improve first tile shows once the Flow map unit is passed.") : done("U12c") ? "" : " The next-test chip shows once the Roadmap unit is passed."}</div>
    ${v === "reg" ? (done("U11c") ? RM.focusTile(c.focus) : "") + RM.chartHTML(c) + RM.flowTable(c) : RM.laneHTML(c, { mark: null, next: done("U12c") ? c.next : null })}
    </div></div>`;
}
function renderTool() {
  const w = BR.world, x = BR.tv === "exp" && w.exps.find((e) => e.id === BR.x);
  main.innerHTML = `<div class="mapwrap wide"><div class="card">${x ? expPageHTML(x, BR.tab) : BR.tv === "board" ? boardViewHTML(w) : listHTML(w, BR.f, false)}</div></div>`;
  main.querySelectorAll("[data-x]").forEach((tr) => tr.addEventListener("click", () => {
    const e = w.exps.find((y) => y.id === tr.dataset.x); if (!e || e.thin) return;
    BR.x = e.id; BR.tab = e.status === "Draft" ? "o" : "a"; BR.tv = "exp"; navState(); renderTool();
  }));
  main.querySelectorAll("[data-f]").forEach((b) => b.addEventListener("click", () => { BR.f = b.dataset.f; renderTool(); }));
  main.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => { BR.tab = b.dataset.tab; renderTool(); }));
  const back = $("toexp"); if (back) back.addEventListener("click", () => { BR.tv = "list"; navState(); renderTool(); });
}
function listHTML(w, f, inRep) {
  const RANK = { Running: 0, Draft: 1, Stopped: 2 }, count = (s) => w.exps.filter((x) => x.status === s).length;
  const rows = w.exps.filter((x) => f === "all" || x.status === f).sort((a, b) => RANK[a.status] - RANK[b.status] || a.row - b.row);
  // the rep's own test shows no read date or result: those are the calls the rep asks for
  const result = (x) => x.pinned ? "" : x.status === "Stopped" ? `<span class="status ${x.result === "Won" ? "" : x.result === "Lost" ? "lost" : "stop"}">${x.result}</span>`
    : x.status === "Running" && !x.thin ? (x.due ? `<span class="status due">Ready to read</span>` : `Read on ${x.readOn}`) : "";
  const dates = (x) => x.pinned && w.fromBoard ? "Not placed yet" : x.status === "Draft" ? `Starts ${x.startsOn}` : x.status === "Stopped" ? (x.started ? `${x.started} to ${x.ended}` : `Ended by ${w.today}`) : x.started ? `Started ${x.started}` : `Since ${x.startsOn}`;
  const ft = [["all", "All", w.exps.length], ["Running", "Running", count("Running")], ["Draft", "Drafts", count("Draft")], ["Stopped", "Stopped", count("Stopped")]];
  return `<div class="crumb">Experiments</div><div class="xh"><h1>Experiments</h1></div>
    <div class="meta">${w.fromBoard ? `The tests on this board. Today is ${w.today}.` : `Fernhill Coffee Co. Today is ${w.today}.`}${inRep ? "" : " Open a test to look around its tabs."} Made-up numbers.</div>
    <div class="tabs" role="tablist">${ft.map(([k, l, n]) => `<button class="tab" role="tab" type="button" data-f="${k}" aria-selected="${f === k}">${l} <span class="note">${n}</span></button>`).join("")}</div>
    <div class="tscroll"><table class="rt stack xl"><thead><tr><th>Experiment</th><th>Owner</th><th>Status</th><th>Dates</th><th>Result</th></tr></thead><tbody>
    ${rows.map((x) => `<tr data-x="${x.id}" class="${x.pinned ? "pin" : ""}${(inRep ? x.pinned : !x.thin) ? " go" : ""}">
      <td data-l="Experiment"><b>${x.c.name}</b><span class="sub">${x.c.surfaceLabel}${x.pinned ? ` · <span class="here">${w.fromBoard ? "the card you're placing" : "your call"}</span>` : ""}</span></td>
      <td data-l="Owner">${x.owner}</td><td data-l="Status"><span class="status ${STATUS_CLS[x.status]}">${x.status}</span></td>
      <td data-l="Dates">${dates(x)}</td><td data-l="Result">${result(x)}</td></tr>`).join("")}</tbody></table></div>`;
}
function boardViewHTML(w) {
  const b = w.fromBoard ? { cards: w.exps.filter((x) => x.bar).map((x) => ({ name: x.c.name, row: x.row, start: x.bar.start, len: x.bar.len, offer: x.c.creative === false, reader: x.owner })) } : W.boardCards(w);
  return `<div class="crumb">Test board</div><div class="xh"><h1>Test board</h1></div>
    <div class="meta">${E.BOARD_WEEKS[0]} to ${E.BOARD_WEEKS.at(-1)}. Today is ${w.today}. One row per place a test can run, one test per row at a time.${b.marked !== undefined && b.marked >= 0 ? " Your call is the marked bar." : ""}</div>
    <div class="pane">${boardGrid({ cards: b.cards, showFreeze: true, marked: b.marked >= 0 ? b.marked : undefined, offers: true, past: w.todayWeek }, 0)}</div>`;
}
function expPageHTML(x, tab) {
  const c = x.c, draft = x.status === "Draft";
  const meta = draft ? `Starts the week of ${x.startsOn} · owner ${x.owner}` : x.status === "Stopped" ? `Ran ${x.started} to ${x.ended} · ${x.result} · owner ${x.owner}` : `Started ${x.started} · day ${c.day} · owner ${x.owner}`;
  return `<div class="crumb"><button class="linkbtn" type="button" id="toexp">Experiments</button> / ${c.surfaceLabel}</div>
    <div class="xh"><h1>${c.name}</h1><span class="status ${STATUS_CLS[x.status]}">${x.status}</span></div>
    <div class="meta"><span>${c.surfaceLabel} · ${c.where}</span><span>·</span><span>${meta}</span>${tagHTML(c)}</div>
    <div class="tabs" role="tablist">${["o", "a", "h"].map((t) => `<button class="tab" role="tab" type="button" data-tab="${t}" aria-selected="${tab === t}">${TAB_NAME[t]} <span class="kbd">${KEY_OF[t]}</span></button>`).join("")}</div>
    <div class="pane">${draft && tab !== "o" ? `<p class="muted" style="padding:12px 0">Not started yet. Results and Health fill in once it runs.</p>` : paneHTML(c, tab)}</div>
    <p class="note">Looking around: nothing to call here. Made-up numbers.</p>`;
}

// ---------- Run the quarter (quarter.mjs). Thirteen Mondays: the Monday screen is the program, the Experiments list and
// the Board on one page, with the backlog under it. Opening a test is a normal rep on GrowthBook's page (mode "quarter");
// the call goes into the quarter and its effect shows on the dashboard. Saved in S.quarter.run, resumable. ----------
let QV = { sel: 0, ghost: 0, msg: "" };
// the quarter and the year share these screens: QS() is whichever one is being played
let QMODE = "quarter";
const QS = () => (QMODE === "year" ? S.year : S.quarter);
const quarterOpen = () => DEV || !!(S.units.U8c && S.units.U8c.passed);
const money = (x) => (x < 0 ? "−$" : "$") + Math.abs(Math.round(x)).toLocaleString("en-US");
const TRUTH = { ship: "B really was better", inconclusive: "no real difference", lossGoal: "B really was worse", guardBreach: "B drove people to unsubscribe",
  srm: "the split was broken, so the numbers meant nothing", tooGood: "a tracking bug: no real lift", switched: "the planned goal never moved" };
function quarterExtra(rec) {
  if (!quarterOpen()) return `<div class="row note">Opens when Overview step 3 passes.</div>`;
  const qs = S.quarter || {}, run = qs.run, isNext = rec[0] === "quarter";
  const status = run ? `Monday ${Q.QWEEKS[run.week]}, week ${run.week + 1} of ${Q.NWEEKS}. ${Q.score(run).right} right calls so far.`
    : qs.best ? `Last quarter: ${qs.best}.` : "Pass: 8 or more calls, 80% of them right, and nothing shipped that hurt.";
  return `<div class="row"><span class="stat">${status}</span>${run ? `<button class="btn sm ghost" type="button" id="new-quarter">Start over</button>` : ""}
    <button class="btn ${isNext ? "primary" : ""}" type="button" id="go-quarter">${run ? "Continue" : qs.passed ? "Run another quarter" : "Start the quarter"}${isNext ? ' <span class="kbd">Enter</span>' : ""}</button></div>`;
}
function startQuarter() {
  if (!quarterOpen()) return renderMap();
  QMODE = "quarter";
  S.quarter = S.quarter || {};
  if (!S.quarter.run) { S.quarter.run = Q.newQuarter((Math.random() * 2 ** 31) | 0, DEV || !!(S.units.U9d && S.units.U9d.passed), DEV || !!(S.units.U13c && S.units.U13c.passed)); S.quarter.runs = (S.quarter.runs || 0) + 1; save(); }
  QV = { sel: 0, len: 1, ghost: S.quarter.run.week, msg: S.quarter.run.week === 0 && !S.quarter.run.tests.length
    ? "Monday Oct 5, the first week. Plan the board first: pick an idea from the backlog (↑ ↓), move it to a week (← →) and drop it (Enter). Tests launch on the Monday they're placed in." : "" };
  if (!S.lessons.Q) S.lessons.Q = "seen";
  if (qLaneOn(S.quarter.run) && S.quarter.run.backlog.length) QV.sel = qOrder(S.quarter.run)[0];   // the lane starts at its top row
  qMonday();
}
const qRunning = (q) => q.tests.filter((t) => Q.statusOf(t, q.week) === "Running").sort((a, b) => a.row - b.row || a.start - b.start);
function qMonday(msg, focus) {
  hush(); const q = QS() && QS().run;
  if (!q) return renderMap();
  if (q.done) return qEnd();
  view = "quarter"; P = null; navState(); drawStrip();
  if (msg !== undefined) QV.msg = msg;
  QV.sel = Math.max(0, Math.min(QV.sel, q.backlog.length - 1)); QV.ghost = Math.max(q.week, Math.min(QV.ghost, Q.nw(q) - 1));
  const sc = Q.score(q), wk = q.week, run = qRunning(q), ready = run.filter((t) => Q.isDue(t, wk));
  const stopped = q.tests.filter((t) => t.status === "Stopped").sort((a, b) => b.stoppedWeek - a.stoppedWeek);
  const drafts = q.tests.filter((t) => Q.statusOf(t, wk) === "Draft").sort((a, b) => a.start - b.start);
  const aimTag = (t) => (q.year && Q.aimed(q, t.idea) ? ` · <span class="here">aimed at the goal</span>` : "");
  const row = (t, i) => { const d = Q.dayOf(t, wk), due = Q.isDue(t, wk), open = d > 0, inw = Q.inWindow(t, wk);
    return `<tr data-q="${t.id}" class="${open ? "go" : ""}"><td data-l="Experiment"><b>${open ? `<span class="kbd">${i + 1}</span> ` : ""}${t.idea[0]}</b><span class="sub">${E.BOARD_ROWS[t.row]} · ${t.idea[2] ? "creative" : "offer"}${aimTag(t)}</span></td>
      <td data-l="Owner">${t.reader}</td><td data-l="Status"><span class="status ${due ? "due" : inw ? "draft" : ""}">${due ? "Ready to read" : inw ? "In the window" : "Running"}</span></td>
      <td data-l="Dates">${open ? `Started ${Q.wk(q)[t.start]} · day ${d} of ${(Q.readWeek(t) - t.start) * 7}${inw ? ` · entry closed, reads ${Q.wk(q)[Q.readWeek(t)]}` : ""}` : "Launched today, no data yet"}</td></tr>`; };
  const stopRow = (t) => `<tr><td data-l="Experiment"><b>${t.idea[0]}</b><span class="sub">${E.BOARD_ROWS[t.row]}</span></td><td data-l="Owner">${t.reader}</td>
      <td data-l="Status"><span class="status ${t.result === "Won" ? "" : t.result === "Lost" ? "lost" : "stop"}">${t.result}</span></td>
      <td data-l="Dates">Called ${Q.wk(q)[t.stoppedWeek]}${t.call === "ship" ? ` · ${t.stoppedWeek < wk ? "adding" : "adds"} ${money(t.weekly)} a week` : ""}</td></tr>`;
  const draftRow = (t) => `<tr><td data-l="Experiment"><b>${t.idea[0]}</b><span class="sub">${E.BOARD_ROWS[t.row]} · ${t.idea[2] ? "creative" : "offer"}</span></td><td data-l="Owner">${t.reader}</td>
      <td data-l="Status"><span class="status draft">Draft</span></td><td data-l="Dates">${t.waiting ? `Launches when you call ${q.tests.find((x) => x.id === t.waiting).idea[0]}` : `Starts ${Q.wk(q)[t.start]}`} <button class="linkbtn" type="button" data-unplace="${t.id}">take it off</button></td></tr>`;
  const b = q.backlog[QV.sel];
  // the year's board shows 13 weeks at a time, around this week and the card being placed
  const off = q.year ? Math.max(0, Math.min(Q.nw(q) - 13, Math.max(wk - 1, QV.ghost - 9))) : 0, span13 = (st, len) => { const a = Math.max(st, off), e = Math.min(st + len, off + 13); return e > a ? { start: a - off, len: e - a } : null; };
  const cards = q.tests.map((t) => ({ t, s: span13(Q.span(t, wk).start, Q.span(t, wk).len) })).filter((x) => x.s).map(({ t, s }) => {
    return { name: t.idea[0], row: t.row, start: s.start, len: s.len, offer: !t.idea[2], reader: t.reader,
      cls: t.status === "Stopped" ? "qstop" : Q.isDue(t, wk) ? "qdue" : "", sub: t.status === "Stopped" ? t.result : Q.statusOf(t, wk) === "Draft" ? "Draft" : Q.isDue(t, wk) ? "Ready to read" : Q.inWindow(t, wk) ? "In the window" : "Running" }; });
  const blen = b ? (q.sized ? QV.len : Q.LEN[b.row]) : 1;
  if (b) QV.ghost = Math.max(wk, Math.min(QV.ghost, Q.nw(q) - blen));
  const card = b ? { name: b.idea[0], row: b.row, len: blen, offer: !b.idea[2], reader: "you", sub: `${b.idea[2] ? "Creative" : "Offer"} · ${blen} week${blen > 1 ? "s" : ""}` } : null;
  // sizing (once Sizing is passed): the card's length is yours, read off the Power Calculator for the idea's lift worth acting on
  let sizeHTML = "";
  if (b && q.sized) {
    const s = Q.ROW_SURFACE[b.row], lift = Q.liftOf(b.idea, b.row), k = SZ.calc(s, lift), pw = SZ.power(s, lift, blen);
    const prio = DEV || (S.units.U10c && S.units.U10c.passed), cod = Q.ideaWorth(q, b.idea, b.row);
    sizeHTML = `<div class="qsize"><b>Size it:</b> ${b.idea[0]} on ${E.BOARD_ROWS[b.row]}, ${SZ.TRAFFIC[s].perWeek.toLocaleString("en-US")} people per version a week. The plan says a ${pctS(lift)} lift would be worth acting on${prio ? `: ${PR.money(cod)}${q.money ? " of profit" : ""} a week if it wins, ${PR.money(cod / (k.need || 13))} per week of testing at the ${k.need ? `${k.need} week${k.need > 1 ? "s" : ""}` : "13+ weeks"} it needs` : ""}.
      <span style="white-space:nowrap"><button class="btn sm" type="button" id="qshort">−</button> <b>${blen} week${blen > 1 ? "s" : ""}</b> <button class="btn sm" type="button" id="qlong">+</button></span>
      Power at ${blen} week${blen > 1 ? "s" : ""}: <span class="pw ${pw >= 0.8 ? "ok" : "low"}">${pctS(pw)}</span>
      ${calcHTML(k, { show: ["pw"], compact: true, noSet: true, hideSummary: true, hideMark: true }).replace(`id="pw-${blen}" class="`, `id="pw-${blen}" class="hl `)}
      ${q.year && Q.aimed(q, b.idea) ? `<p class="note">Aimed at the year's goal: its goal metric is ${Q.GOALS[q.year.goal].metric.toLowerCase()}, so it reads ${Q.SLOW_WIN} weeks after entry closes. The row is free again once entry closes.</p>` : ""}</div>`;
  }
  const byRow = E.BOARD_ROWS.map((nm, r) => [nm, q.backlog.map((x, i) => [x, i]).filter(([x]) => x.row === r)]).filter(([, xs]) => xs.length);
  const sesDone = SES.on && (dayState().qWeeks || 0) >= 2;
  main.innerHTML = `<div class="mapwrap wide qtr">
    <div class="note">${q.year ? `Run the year · goal: ${Q.GOALS[q.year.goal].name}` : "Run the quarter"} · Fernhill Coffee Co. · made-up numbers</div>
    <h1>Monday ${Q.wk(q)[wk]} <span class="muted" style="font-weight:500">· week ${wk + 1} of ${Q.nw(q)}${Q.fz(q).includes(wk) ? " · BFCM freeze, nothing new runs" : ""}</span></h1>
    <div class="sum"><div><div class="n">${money(sc.weekly)}</div><div class="l">${q.money ? "profit " : ""}added a week by what you shipped</div></div><div><div class="n">${money(sc.banked)}</div><div class="l">${q.money ? "profit " : ""}added so far this ${q.year ? "year" : "quarter"}</div></div>
      <div><div class="n">${sc.right} of ${sc.calls}</div><div class="l">calls right</div></div><div><div class="n">${sc.late}</div><div class="l">ready tests left unread</div></div>
      ${q.year ? yearTiles(q) : ""}</div>
    ${QV.msg ? `<div class="hint" id="qmsg">${QV.msg}</div>` : ""}
    <div class="card" id="qlist"><div class="xh"><h1>Experiments</h1><span class="note">${ready.length ? `${ready.length} ready to read` : run.length ? "nothing at its read date" : "nothing running"}</span></div>
      <div class="tscroll"><table class="rt stack xl"><thead><tr><th>Experiment</th><th>Owner</th><th>Status</th><th>Dates</th></tr></thead><tbody>
      ${run.map(row).join("") || `<tr><td colspan="4" class="muted">Nothing running. Place a card on the board below.</td></tr>`}${drafts.map(draftRow).join("")}${stopped.slice(0, 4).map(stopRow).join("")}</tbody></table></div>
      ${stopped.length > 4 ? `<p class="note">${stopped.length - 4} older stopped tests are on the board.</p>` : ""}</div>
    <div class="card" id="qboard"><div class="xh"><h1>Test board</h1><span class="note">${q.year ? `${Q.wk(q)[off]} to ${Q.wk(q)[Math.min(Q.nw(q) - 1, off + 12)]}, of the year's 52 weeks (← → scrolls with the card)` : `${Q.wk(q)[0]} to ${Q.wk(q).at(-1)}`}</span></div>
      <div class="pane">${boardGrid({ rowSub: q.sized ? ROW_TRAFFIC : null, cards, card, showFreeze: true, offers: true, past: Math.max(0, wk - off), weeks: Q.wk(q).slice(off, off + 13), freeze: Q.fz(q).map((i) => i - off).filter((i) => i >= 0 && i < 13), place: !!card }, QV.ghost - off)}</div>
      <div class="qback"><b>${qLaneOn(q) ? "Roadmap" : "Backlog"}</b> <span class="note">${q.backlog.length} ideas${qLaneOn(q) ? ", sorted by what a win is worth, like Marketing QA's roadmap" : ""}. ↑ ↓ pick one, ← → move it, Enter drop it.</span>
        ${qLaneOn(q) ? (q.backlog.length ? qLaneHTML(q) : `<p class="muted">Empty. Stopped tests sent for a rerun come back here.</p>`) : byRow.map(([nm, xs]) => `<div class="qrow"><span class="qrl">${nm}</span>${xs.map(([x, i]) => `<button type="button" class="qcard ${x.idea[2] ? "crea" : "offer"}${i === QV.sel ? " on" : ""}" data-b="${i}">${x.idea[0]}</button>`).join("")}</div>`).join("") || `<p class="muted">Empty. Stopped tests sent for a rerun come back here.</p>`}
        ${sizeHTML}
        ${card ? `<button class="btn" type="button" id="qdrop">Drop "${b.idea[0]}" in the week of ${Q.wk(q)[QV.ghost]} <span class="kbd">Enter</span></button>` : ""}</div></div>
    <div class="row" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
      ${sesDone ? `<button class="btn primary" type="button" id="qses">Done for today <span class="kbd">Enter</span></button>` : ""}
      <button class="btn ${sesDone ? "" : "primary"}" type="button" id="qnext">${wk + 1 >= Q.nw(q) ? `End the ${q.year ? "year" : "quarter"}` : `Next Monday, ${Q.wk(q)[wk + 1]}`} <span class="kbd">N</span></button>
      <button class="btn" type="button" id="qpath">Your path <span class="kbd">L</span></button></div>
    <p class="note keys-only">Keys: <span class="kbd">1</span>–<span class="kbd">9</span> open a running test, <span class="kbd">↑</span> <span class="kbd">↓</span> pick an idea, <span class="kbd">←</span> <span class="kbd">→</span> move it, <span class="kbd">Enter</span> drop it,${QS() && QS().run && QS().run.sized ? ` <span class="kbd">−</span> <span class="kbd">=</span> shorter or longer,` : ""} <span class="kbd">N</span> next Monday. On a test: <span class="kbd">O</span> <span class="kbd">A</span> <span class="kbd">H</span> tabs, <span class="kbd">1</span>–<span class="kbd">5</span> the call, <span class="kbd">R</span> back here.</p></div>`;
  main.querySelectorAll("tr[data-q]").forEach((tr) => tr.addEventListener("click", () => qOpen(tr.dataset.q)));
  main.querySelectorAll("[data-unplace]").forEach((x) => x.addEventListener("click", (e) => { e.stopPropagation(); Q.unplace(q, x.dataset.unplace); save(); qMonday("Taken off the board. It's back in the backlog."); }));
  main.querySelectorAll("[data-b]").forEach((x) => x.addEventListener("click", () => { QV.sel = +x.dataset.b; QV.len = 1; qMonday(); }));
  main.querySelectorAll("#qboard .cell").forEach((x) => x.addEventListener("click", () => { QV.ghost = Math.max(wk, +x.dataset.w + off); qMonday(); }));
  const dr = $("qdrop"); if (dr) dr.addEventListener("click", qDrop);
  const qsh = $("qshort"), qlo = $("qlong");
  if (qsh) qsh.addEventListener("click", () => qLen(-1)); if (qlo) qlo.addEventListener("click", () => qLen(1));
  $("qnext").addEventListener("click", qNext); $("qpath").addEventListener("click", renderMap);
  const qs = $("qses"); if (qs) qs.addEventListener("click", sessionNext);
  if (focus === "board") $("qboard").scrollIntoView({ block: "start" }); else if (focus === "list") $("qlist").scrollIntoView({ block: "start" });
  else if (QV.place) { const g = $("ghost"); if (g) g.scrollIntoView({ block: "nearest", inline: "nearest" }); QV.place = false; }
}
// once the Roadmap unit is passed, the backlog is drawn as a roadmap lane: sorted by what a win is worth, with the
// 4-week chip, the weeks the plan's lift needs, and worth per week of testing. ↑ ↓ follow the lane's order.
const qLaneOn = (q) => q.sized && (DEV || !!(S.units.U12c && S.units.U12c.passed));
function qIdeaNums(b) {
  const q = QS() && QS().run, s = Q.ROW_SURFACE[b.row], lift = Q.liftOf(b.idea, b.row), cod = Q.ideaWorth(q, b.idea, b.row), need = SZ.weeksNeeded(s, lift, 13);
  return { s, lift, cod, need, mde: SZ.mdeAt(s, 4), perWeek: need ? cod / need : 0 };
}
const qOrder = (q) => q.backlog.map((x, i) => [i, qIdeaNums(x).cod]).sort((a, b) => b[1] - a[1]).map(([i]) => i);
function qLaneHTML(q) {
  const ord = qOrder(q), top = Math.max(1, ...ord.map((i) => qIdeaNums(q.backlog[i]).cod));
  return `<div class="tscroll"><table class="rt stack" id="qlane"><thead><tr><th>Idea</th><th>${q.money ? "Profit" : "Worth"} a week if it wins · expected</th><th>A 4-week test can see</th><th>Weeks the plan's lift needs</th><th>Worth per week of testing</th>${q.year ? "<th>The year's goal if it wins</th>" : ""}</tr></thead><tbody>
    ${ord.map((i) => { const x = q.backlog[i], n = qIdeaNums(x);
      return `<tr data-b="${i}" class="go${i === QV.sel ? " on" : ""}"><td data-l="Idea"><b>${x.idea[0]}</b><small>${E.BOARD_ROWS[x.row]} · ${x.idea[2] ? "creative" : "offer"} · plans for ${pctS(n.lift)}${q.year ? (Q.aimed(q, x.idea) ? ` · <span class="here">aimed at the goal</span>` : Q.weightOf(q, x.idea) ? " · touches the goal" : "") : ""}</small></td>
        <td data-l="Worth a week if it wins · expected"><span class="lbar" style="width:${Math.max(2, (n.cod / top) * 90)}px"></span>${PR.money(n.cod)} <span class="exp">· ~${PR.money(n.cod / 3)}</span></td>
        <td data-l="A 4-week test can see">${RM.chip(n.mde)}</td><td data-l="Weeks the plan's lift needs">${n.need ? `${n.need} week${n.need > 1 ? "s" : ""}` : "over 13"}</td>
        <td data-l="Worth per week of testing">${n.need ? PR.money(n.perWeek) : "–"}</td>${q.year ? `<td data-l="The year's goal if it wins">${Q.weightOf(q, x.idea) ? `+${(Q.weightOf(q, x.idea) * n.lift * Q.GOALS[q.year.goal].base).toFixed(2)} pts` : "–"}</td>` : ""}</tr>`; }).join("")}</tbody></table></div>`;
}
function qLen(d) { const q = QS().run; if (!q.sized) return; QV.len = Math.max(1, Math.min(Q.nw(q) - q.week, QV.len + d)); qMonday(); }
function qDrop() {
  const q = QS().run, b = q.backlog[QV.sel]; if (!b) return;
  const res = Q.place(q, b.id, QV.ghost, QV.len);
  if (!res.ok) { SND.miss(); save(); return qMonday(`Not the week of ${Q.wk(q)[QV.ghost]}: ${[...new Set(res.problems.map((x) => Q.GATE_TEXT[x.gate] + (x.with ? ` ("${x.with.idea[0]}")` : "")))].join(", ")}.`); }
  SND.tick(); save();
  const t = q.tests.at(-1); QV.len = 1;
  if (qLaneOn(q) && q.backlog.length) QV.sel = qOrder(q)[0];
  qMonday(`Placed: ${b.idea[0]}, ${Q.wk(q)[QV.ghost]}${t.len > 1 ? ` to ${Q.wk(q)[QV.ghost + t.len - 1]}` : ""}.${q.sized ? ` ${pctS(t.planPower)} power for a ${pctS(t.lift)} lift${t.planPower < 0.8 ? ": short of 80%, so a real win that size could come back inconclusive" : ""}.` : ""}${t.win ? ` Its 60-day window closes ${Q.wk(q)[Q.readWeek(t)]}: that's its read date.` : ""}${QV.ghost === q.week ? " It launches today." : ""}`);
}
function qOpen(tid) {
  const q = QS().run, t = q.tests.find((x) => x.id === tid);
  if (!t || Q.statusOf(t, q.week) !== "Running" || Q.dayOf(t, q.week) <= 0) return;
  const c = Q.caseFor(q, t);
  P = { mode: "quarter", tid, results: [], combo: 0, c, tabs: ["o", "a", "h"], calls: ["ship", "keepA", "running", "inconclusive", "distrust"], labels: null,
        coin: 0, ghost: 0, tab: "o", seen: ["o"], answered: false, tv: null, world: null, t0: performance.now(), keysUsed: [], clicks: [], passCard: false };
  view = "play"; navState(); renderPlay(); hush();
}
function qNext() {
  const q = QS().run, before = q.week, res = Q.nextWeek(q);
  if (SES.on) { const d = dayState(); d.qWeeks = (d.qWeeks || 0) + 1; if (d.qWeeks === 2) d.log.push({ type: "quarter" }); }
  save(); SND.tick();
  if (q.done) return qEnd();
  const launched = q.tests.filter((t) => t.start === q.week && t.status === "Running");
  const bits = [];
  if (res.late.length) bits.push(`${res.late.map((t) => t.idea[0]).join(" and ")} ${res.late.length > 1 ? "were" : "was"} ready on ${Q.wk(q)[before]} and nobody read ${res.late.length > 1 ? "them" : "it"}. ${res.late.length > 1 ? "Their rows" : "Its row"} lost a week.`);
  if (res.slipped.length) bits.push(`${res.slipped.map((t) => t.idea[0]).join(" and ")} couldn't start: the test before it on the row was never called. Back in the backlog.`);
  if (res.waiting.length) bits.push(res.waiting.map(([t, b]) => `${t.idea[0]} launches once you call ${b.idea[0]}.`).join(" "));
  if (launched.length) bits.push(`Launched today: ${launched.map((t) => t.idea[0]).join(", ")}.`);
  const ready = qRunning(q).filter((t) => Q.isDue(t, q.week)).length;
  bits.push(ready ? `${ready} test${ready > 1 ? "s are" : " is"} ready to read.` : "Nothing is at its read date this week.");
  QV.ghost = q.week;
  qMonday(bits.join(" "));
}
function qEnd() {
  if (QMODE === "year") return yEnd();
  hush(); view = "summary"; navState();
  const qs = QS(), q = qs.run || qs.last, sc = Q.score(q);
  if (qs.run) { qs.last = q; qs.run = null; qs.best = `${money(sc.banked)} added, ${sc.right} of ${sc.calls} calls right`; if (sc.passed) qs.passed = true; save(); if (sc.passed) SND.pass(); }
  const rows = q.tests.filter((t) => t.call || Q.statusOf(t, q.week) === "Running").sort((a, b) => a.start - b.start).map((t) => {
    const calls = q.log.filter((x) => x.tid === t.id && (x.call !== "running" || x.answer !== "running")), last = calls.at(-1);
    return `<tr><td data-l="Experiment"><b>${t.idea[0]}</b><span class="sub">${E.BOARD_ROWS[t.row]}</span></td>
      <td data-l="Your call">${last ? `${E.callById(last.call).label}${last.right ? " ✓" : ` <span class="lost">✗ (rule: ${E.callById(last.answer).label.toLowerCase()})</span>`}` : t.status === "Stopped" ? "never called" : "still running at the end"}</td>
      <td data-l="What B really did">${TRUTH[t.truth]}${Math.abs(t.eff) >= 0.01 ? `, ${t.eff > 0 ? "+" : "−"}${Math.abs(t.eff * 100).toFixed(1)}%` : ""}${q.money && Q.giveOf(t.idea) && Math.abs(t.eff) >= 0.01 ? (() => { const p = Q.profitLift(t.eff, Q.giveOf(t.idea)); return `<span class="sub${p <= 0 ? " lost" : ""}">profit ${p > 0 ? "+" : "−"}${Math.abs(p * 100).toFixed(1)}% after giving back ${Math.round(Q.giveOf(t.idea) * 100)}%</span>`; })() : ""}${t.seen === false && (t.truth === "ship" || t.truth === "lossGoal") ? `<span class="sub lost">${t.len} week${t.len > 1 ? "s" : ""} gave it ${pctS(t.realPower)} power to show it, so it came back inconclusive</span>` : ""}</td>
      <td data-l="Worth">${t.call === "ship" ? `${money(t.weekly)} a week` : t.missed ? `<span class="lost">${money(t.missed)} a week left on the table</span>` : ""}</td></tr>`; }).join("");
  main.innerHTML = `<div class="mapwrap wide"><div class="note">Run the quarter · Oct 5 to Dec 28</div><h1>${sc.passed ? "A good quarter" : "The quarter's done"}</h1>
    <div class="sum"><div><div class="n">${money(sc.banked)}</div><div class="l">${q.money ? "profit " : ""}added by your ships this quarter</div></div><div><div class="n">${money(sc.weekly)}</div><div class="l">a week, going into Q1</div></div>
      <div><div class="n">${sc.right} of ${sc.calls}</div><div class="l">calls right</div></div><div><div class="n">${sc.caught}</div><div class="l">broken tests caught</div></div>
      <div><div class="n">${sc.late}</div><div class="l">ready tests left unread</div></div><div><div class="n">${sc.used} of ${sc.open}</div><div class="l">row-weeks spent testing</div></div>
      ${q.sized ? `<div><div class="n">${sc.sized} of ${sc.placed}</div><div class="l">cards sized to 80% power</div></div>` : ""}</div>
    <p>${sc.passed ? "Passed: enough calls, 80% or more right, and nothing shipped that hurt." : `To pass: 8 or more calls, 80% right, and no ship that hurt.${sc.badShips ? ` ${sc.badShips} ship${sc.badShips > 1 ? "s" : ""} hurt.` : ""}`}${sc.left ? ` Keeping A on real winners left ${money(sc.left)} a week on the table.` : ""}</p>
    <h2 style="margin-top:16px">What each test really did</h2><p class="muted">The truth GrowthBook never shows you. Your calls were graded on the rule, not on this, because the rule is all you can see on the day.</p>
    <div class="tscroll"><table class="rt stack xl"><thead><tr><th>Experiment</th><th>Your call</th><th>What B really did</th><th>Worth</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="row" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button class="btn primary" type="button" id="tomap">Back to your path <span class="kbd">Enter</span></button>
      <button class="btn" type="button" id="qagain">Run another quarter</button></div></div>`;
  $("tomap").addEventListener("click", renderMap); $("qagain").addEventListener("click", startQuarter);
  narrate(sc.passed ? "A good quarter." : "The quarter's done.", `${money(sc.banked)} added. ${sc.right} of ${sc.calls} calls right.`);
}
// ---------- Run the year (quarter.mjs newYear): 52 Mondays of 2027 aimed at one goal, kept afloat ----------
const yearOpen = () => DEV || !!(S.quarter && S.quarter.passed && S.units.U14b && S.units.U14b.passed);
const pts = (x) => x.toFixed(2) + "%";
function yearTiles(q) {
  const y = Q.yearNow(q), G = Q.GOALS[q.year.goal];
  return `<div><div class="n ${y.goal >= y.target ? "ok" : ""}">${pts(y.goal)}</div><div class="l">${G.metric.toLowerCase()} · target ${pts(y.target)}, started at ${pts(y.base)}</div></div>
    <div><div class="n ${y.unsub >= Q.LIMITS.unsub ? "bad" : ""}">${y.unsub.toFixed(2)}%</div><div class="l">unsubscribe rate · keep under ${Q.LIMITS.unsub}%</div></div>
    <div><div class="n ${y.spam >= Q.LIMITS.spam ? "bad" : ""}">${y.spam.toFixed(3)}%</div><div class="l">spam complaint rate · keep under ${Q.LIMITS.spam}%</div></div>`;
}
function yearExtra(rec) {
  if (!yearOpen()) return `<div class="row note">Opens when you've passed a quarter and Slow metrics.</div>`;
  const ys = S.year || {}, run = ys.run;
  const status = run ? `Monday ${Q.wk(run)[run.week]}, week ${run.week + 1} of 52. Goal: ${Q.GOALS[run.year.goal].name}, ${pts(Q.yearNow(run).goal)} of ${pts(Q.GOALS[run.year.goal].target)}.`
    : ys.best ? `Last year: ${ys.best}.` : "Pass: the goal at least halfway to its target, unsubscribes and spam under their limits, profit not down, 20 or more calls with 80% right, and no ship that hurt.";
  return `<div class="row"><span class="stat">${status}</span>${run ? `<button class="btn sm ghost" type="button" id="new-year">Start over</button>` : ""}
    <button class="btn ${rec[0] === "year" ? "primary" : ""}" type="button" id="go-year">${run ? "Continue" : ys.passed ? "Run another year" : "Start the year"}</button></div>`;
}
function startYear(goal) {
  YPICK = false;
  if (!yearOpen()) return renderMap();
  S.year = S.year || {};
  if (!S.year.run && !goal) return yearPick();
  if (!S.year.run) { S.year.run = Q.newYear((Math.random() * 2 ** 31) | 0, goal); S.year.runs = (S.year.runs || 0) + 1; save(); }
  QMODE = "year";
  const q = S.year.run;
  QV = { sel: 0, len: 1, ghost: q.week, msg: q.week === 0 && !q.tests.length
    ? `Monday Jan 4 2027. The year is for ${Q.GOALS[q.year.goal].name.toLowerCase()}. Tests aimed at it use the 60-day goal metric, so they read ${Q.SLOW_WIN} weeks after entry closes: start them early. Keep unsubscribes and spam under their limits and profit up. A new quarter's ideas arrive every 13 weeks.` : "" };
  if (qLaneOn(q) && q.backlog.length) QV.sel = qOrder(q)[0];
  qMonday();
}
// the year starts by choosing what it's for
function yearPick() {
  hush(); view = "summary"; P = null; navState(); drawStrip();
  main.innerHTML = `<div class="mapwrap"><div class="note">Run the year · Jan 4 to Dec 27 2027 · Fernhill Coffee Co. · made-up numbers</div>
    <h1>What's the year for?</h1>
    <p class="muted">Pick one number. Ideas that move it come up first in the backlog, and tests aimed at it use it as their goal: an order within 60 days, so they read ${Q.SLOW_WIN} weeks after entry closes. Everything else still has to stay afloat: unsubscribes under ${Q.LIMITS.unsub}%, spam under ${Q.LIMITS.spam}%, profit not down.</p>
    <div class="decide">${Object.entries(Q.GOALS).map(([k, G], i) => `<button type="button" class="dec" data-goal="${k}"><span class="kbd">${i + 1}</span><b>${G.name}</b>: ${G.what.toLowerCase()}. From ${pts(G.base)} to ${pts(G.target)}.</button>`).join("")}</div>
    <div class="row" style="margin-top:12px"><button class="btn" type="button" id="ypath">Your path <span class="kbd">L</span></button></div></div>`;
  main.querySelectorAll("[data-goal]").forEach((b) => b.addEventListener("click", () => startYear(b.dataset.goal)));
  $("ypath").addEventListener("click", renderMap);
  YPICK = true;
}
let YPICK = false;
function yEnd() {
  hush(); view = "summary"; navState();
  const ys = S.year, q = ys.run || ys.last, sc = Q.yearScore(q), G = Q.GOALS[q.year.goal];
  if (ys.run) { ys.last = q; ys.run = null; ys.best = `${G.name} ${pts(sc.goal)} of ${pts(sc.target)}, ${sc.right} of ${sc.calls} calls right`; if (sc.passed) ys.passed = true; save(); if (sc.passed) SND.pass(); }
  const checks = [...q.year.checks, { week: 52, ...Q.yearNow(q), profit: sc.weekly }];
  const aimedShips = q.tests.filter((t) => t.call === "ship" && Q.weightOf(q, t.idea) > 0);
  main.innerHTML = `<div class="mapwrap wide"><div class="note">Run the year · 2027 · goal: ${G.name}</div>
    <h1>${sc.passed ? (sc.reached ? "Target reached" : "A good year") : "The year's done"}</h1>
    <div class="sum"><div><div class="n ${sc.reached ? "ok" : ""}">${pts(sc.goal)}</div><div class="l">${G.metric.toLowerCase()} · target ${pts(sc.target)}</div></div>
      <div><div class="n">${money(sc.banked)}</div><div class="l">profit added by your ships this year</div></div>
      <div><div class="n">${sc.right} of ${sc.calls}</div><div class="l">calls right</div></div>
      <div><div class="n ${sc.unsub >= Q.LIMITS.unsub ? "bad" : ""}">${sc.unsub.toFixed(2)}%</div><div class="l">unsubscribe rate</div></div>
      <div><div class="n ${sc.spam >= Q.LIMITS.spam ? "bad" : ""}">${sc.spam.toFixed(3)}%</div><div class="l">spam complaint rate</div></div></div>
    <p>${sc.passed ? `Passed: the goal moved at least halfway, everything stayed afloat, and the calls held up.${sc.reached ? " And you hit the target." : " The target is the stretch: with real-world luck, a well-run year misses it about four times in ten."}`
      : `To pass: the goal at least ${pts(sc.half)}, unsubscribes under ${Q.LIMITS.unsub}%, spam under ${Q.LIMITS.spam}%, profit not down, 20 or more calls with 80% right, and no ship that hurt.${sc.badShips ? ` ${sc.badShips} ship${sc.badShips > 1 ? "s" : ""} hurt.` : ""}`}</p>
    <h2 style="margin-top:16px">Quarter by quarter</h2>
    <div class="tscroll"><table class="rt stack"><thead><tr><th>At</th><th>${G.metric}</th><th>Unsubscribe rate</th><th>Spam rate</th><th>Profit added a week</th></tr></thead><tbody>
      ${checks.map((c) => `<tr><td data-l="At">${c.week === 52 ? "Year end" : `End of Q${c.week / 13}`}</td><td data-l="${G.metric}">${pts(c.goal)}</td><td data-l="Unsubscribe rate">${c.unsub.toFixed(2)}%</td><td data-l="Spam rate">${c.spam.toFixed(3)}%</td><td data-l="Profit added a week">${money(c.profit)}</td></tr>`).join("")}</tbody></table></div>
    <h2 style="margin-top:16px">What moved the goal</h2>
    ${aimedShips.length ? `<ul>${aimedShips.map((t) => `<li><b>${t.idea[0]}</b>: ${t.eff > 0 ? "+" : "−"}${Math.abs(t.eff * 100).toFixed(1)}% on its own goal, ${Q.weightOf(q, t.idea) >= 1 ? "aimed at the year's goal" : "a side effect on it"}.</li>`).join("")}</ul>` : `<p class="muted">Nothing that touched the goal shipped.</p>`}
    <div class="row" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button class="btn primary" type="button" id="tomap">Back to your path <span class="kbd">Enter</span></button>
      <button class="btn" type="button" id="yagain">Run another year</button></div></div>`;
  $("tomap").addEventListener("click", renderMap); $("yagain").addEventListener("click", () => startYear());
  narrate(sc.passed ? "A good year." : "The year's done.", `${G.name}: ${pts(sc.goal)}. ${sc.right} of ${sc.calls} calls right.`);
}
function qKey(e) {
  const q = QS() && QS().run; if (!q) return false;
  const k = e.key;
  if (/^[1-9]$/.test(k)) { const t = qRunning(q).filter((x) => Q.dayOf(x, q.week) > 0)[+k - 1]; if (t) qOpen(t.id); return true; }
  if (k === "ArrowUp" || k === "ArrowDown") { if (q.backlog.length) { const ord = qLaneOn(q) ? qOrder(q) : q.backlog.map((_, i) => i), at = Math.max(0, ord.indexOf(QV.sel));
    QV.sel = ord[(at + (k === "ArrowUp" ? -1 : 1) + ord.length) % ord.length]; QV.len = 1; QV.place = true; qMonday(); } return true; }
  if (k === "ArrowLeft" || k === "ArrowRight") { QV.ghost = Math.max(q.week, Math.min(Q.nw(q) - 1, QV.ghost + (k === "ArrowLeft" ? -1 : 1))); QV.place = true; qMonday(); return true; }
  if (k === "Enter") { if (SES.on && (dayState().qWeeks || 0) >= 2) sessionNext(); else qDrop(); return true; }
  if (k.toLowerCase() === "n") { qNext(); return true; }
  if (k === "-" || k === "_") { qLen(-1); return true; }
  if (k === "=" || k === "+") { qLen(1); return true; }
  return false;
}

// ---------- input ----------
// Keyboard extensions like Vimium claim single letters on every page (o, h, l, ?), and a page can't switch them off.
// They all stand aside while you type in a text box, so the page keeps an invisible one focused: the extension sees
// "typing" and passes every key through to the game. Clicking a button hands focus back to it afterwards.
const catcher = document.createElement("input");
Object.assign(catcher, { id: "keycatch", type: "text", autocomplete: "off", spellcheck: false, tabIndex: -1 });
catcher.setAttribute("aria-hidden", "true"); catcher.setAttribute("data-gramm", "false"); catcher.setAttribute("data-lt-active", "false");
catcher.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;border:0;padding:0;pointer-events:none";
if (!TOUCH) document.body.appendChild(catcher);   // on a phone a focused text box would pop up the keyboard
const isField = (el) => el && el !== catcher && /INPUT|TEXTAREA|SELECT/.test(el.tagName || "");
function grab() { if (TOUCH) return; if (!isField(document.activeElement) && document.activeElement !== catcher) catcher.focus({ preventScroll: true }); }
catcher.addEventListener("input", () => { catcher.value = ""; });
catcher.addEventListener("blur", () => setTimeout(() => { if (!document.activeElement || document.activeElement === document.body) grab(); }, 0));
document.addEventListener("mouseup", () => setTimeout(grab, 0));
window.addEventListener("focus", () => setTimeout(grab, 0));
let rctl = false;
document.addEventListener("keydown", (e) => {
  if (e.code === "ControlRight" && !e.repeat) { rctl = true; return; }
  rctl = false;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (isField(e.target) && !(e.target.type === "range" && (e.key === "Enter" || e.key.length === 1))) return;   // a focused slider keeps its arrows, the page keeps Enter and letters
  if (e.key === "?") { e.preventDefault(); return toggleOverlay(); }
  if (e.key === "Escape") return toggleOverlay(false);
  if (!$("overlay").hidden) return;
  if (view === "drill" && D) return drillKey(e);
  if (e.key.toLowerCase() === "t" && e.key.length === 1) { e.preventDefault(); return coachRecord(); }   // Talk it through: start or stop a recording
  if (view === "lesson" && L) { if (e.key.toLowerCase() === "l") { e.preventDefault(); L = null; return renderMap(); } if (L.sl && $("slp") && slKey(e, L.sl, $("slp"))) { e.preventDefault(); return; } return lessonKey(e); }
  if (e.key.toLowerCase() === "v") { e.preventDefault(); return toggleVoice(); }
  const k = e.key.toLowerCase();
  if (k === "l") { e.preventDefault(); return renderMap(); }
  if (view === "story") { if (storyKey(e)) e.preventDefault(); return; }
  if ((k === "r" || k === "w") && e.key.length === 1 && !RELEASE) { e.preventDefault(); return openTool(k === "r" ? "list" : "board"); }
  if (view === "tool") { if (TAB_OF[e.key.toUpperCase()] && BR && BR.tv === "exp") { e.preventDefault(); BR.tab = TAB_OF[e.key.toUpperCase()]; renderTool(); } return; }
  if (view === "quarter") { if (qKey(e)) e.preventDefault(); return; }
  if (view === "calcplay") { if (slKey(e, PG, $("slp"))) e.preventDefault(); return; }
  if (view === "map") { if (e.key === "Enter") { e.preventDefault(); go(recommended()); } return; }
  if (view === "today") { if (e.key === "Enter") { e.preventDefault(); sessionNext(); } return; }
  if (view === "done") return;
  if (view === "summary" && YPICK && /^[12]$/.test(e.key)) { e.preventDefault(); YPICK = false; startYear(Object.keys(Q.GOALS)[+e.key - 1]); return; }
  if (view === "summary") { if (e.key === "Enter") { e.preventDefault(); P && P.mode === "after-testout" ? P.go() : renderMap(); } return; }
  if (view === "ms1week") { if (e.key === "Enter") { e.preventDefault(); ms1Task(); } return; }
  if (view !== "play" || !P) return;
  if (P.tv && P.tv !== repHome() && (e.key === "Enter" || /^[1-5]$/.test(e.key) || TAB_OF[e.key.toUpperCase()])) {   // another view is open: back to the rep first
    e.preventDefault(); repView(repHome());
    if (TAB_OF[e.key.toUpperCase()] && e.key.length === 1) setTab(TAB_OF[e.key.toUpperCase()], true);
    return;
  }
  if (TAB_OF[e.key.toUpperCase()] && e.key.length === 1) { e.preventDefault(); return setTab(TAB_OF[e.key.toUpperCase()], true); }
  if (/^[1-5]$/.test(e.key)) { e.preventDefault(); return answer(+e.key - 1); }
  if (e.key === "Enter" && P.answered && !P.holding) { e.preventDefault(); return P.passCard ? P.afterPass() : advance(); }
  if (P.c.slot && !P.answered) {
    if (/^Arrow(Up|Down|Left|Right)$/.test(e.key)) { e.preventDefault(); return moveCoin(/Up|Left/.test(e.key) ? -1 : 1); }
    if (e.key === "Enter") { e.preventDefault(); return submit("s" + P.coin); }
  }
  if (P.c.screen === "sliders" && !P.answered) {
    if (slKey(e, P.sl, $("slp"))) { e.preventDefault(); return; }
    if (e.key === "Enter") { e.preventDefault(); return slCheck(); }
  }
  if (P.c.place && !P.answered) {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); return moveGhost(e.key === "ArrowLeft" ? -1 : 1); }
    if (e.key === "Enter") { e.preventDefault(); return placeAt(P.ghost); }
  }
});
document.addEventListener("keyup", (e) => { if (e.code === "ControlRight" && rctl) { rctl = false; toggleOverlay(); } });
$("overlay").addEventListener("click", (e) => { if (e.target.id === "overlay") toggleOverlay(false); });
$("nav-map").addEventListener("click", renderMap);
$("nav-exp").addEventListener("click", () => openTool("list"));
$("nav-board").addEventListener("click", () => openTool("board"));
$("nav-reg").addEventListener("click", () => openMQA("reg"));
$("nav-road").addEventListener("click", () => openMQA("road"));
$("nav-calc").addEventListener("click", () => openPlayground());
$("nav-talk").addEventListener("click", () => coachToggle());
$("nav-today").addEventListener("click", () => { SES.on = false; renderToday(); });
if (DEV) { $("nav-dev").hidden = false; $("nav-dev").addEventListener("click", () => { try { localStorage.removeItem("tb3dev"); } catch (e) { /* blocked */ } location.href = location.pathname; }); }
$("nav-story").addEventListener("click", storyHub);
initStory({ main, S: () => S, save, voOn, allOpen: () => DEV, soundOn: () => S.sound, passed: (u) => !!(S.units[u] && S.units[u].passed),
  setView: (v) => { hush(); view = v; P = null; navState(); drawStrip(); }, inSession: () => SES.on, home: () => { SES.on = false; renderToday(); },
  chapterDone: (id) => { const d = dayState(); d.storyDone = true; d.log.push({ type: "story", ch: id }); save(); }, next: () => sessionNext(), log: (x) => logRep(Object.assign({ at: new Date().toISOString() }, x)) });
$("nav-keys").addEventListener("click", () => toggleOverlay());
$("nav-sound").addEventListener("click", () => { S.sound = !S.sound; soundLabel(); save(); });
$("nav-voice").addEventListener("click", toggleVoice);
function toggleVoice() { S.voice = !voOn(); if (!voOn()) hush(); voiceLabel(); coach(voOn() ? "Narration on" : "Narration off"); save(); }
function voiceLabel() { const b = $("nav-voice"); b.innerHTML = `Voice ${voOn() ? "on" : "off"} <span class="kbd k">V</span>`; b.setAttribute("aria-pressed", String(voOn())); }
function soundLabel() { const b = $("nav-sound"); b.textContent = S.sound ? "Sound on" : "Sound off"; b.setAttribute("aria-pressed", String(S.sound)); }

// ---------- Talk it through (coach.mjs): what the coach gets about this screen, answer key included ----------
const plain = (h) => String(h || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
function coachCtx() {
  const screen = (main.innerText || "").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim().slice(0, 4000);
  const u = view === "lesson" && L ? L.u : P && P.c ? (P.mode === "unit" || P.mode === "testout" ? P.unit : P.owner) : null;
  const x = { where: view, title: (main.querySelector("h1") || {}).textContent || "", screen,
    path: { passed: PATH.filter((id) => S.units[id] && S.units[id].passed).map(stepTitle), on: (() => { const r = recommended(); return r && r[0] === "unit" && isStep(r[1]) ? stepTitle(r[1]) : null; })() } };
  if (u && E.UNITS[u]) { x.step = { id: u, name: isStep(u) ? stepTitle(u) : `${u} ${E.UNITS[u].name}` }; x.taught = (LESSONS[u] || []).map((s) => `${s.h} ${plain(s.p)}`); }
  if (view === "lesson" && L) {
    const s = L.screens[L.i];
    x.lesson = { h: s.h, p: plain(s.p), ...(s.predict ? { q: s.predict.q, opts: s.predict.opts, answer: s.predict.answer, reveal: s.predict.reveal, guessed: L.shown,
      picked: L.picked != null ? s.predict.opts[L.picked] : null, right: L.picked === s.predict.answer } : {}) };
    if (L.sl) x.sliders = slSay(L.sl.st);
  } else if (view === "play" && P && P.c) {
    const c = P.c, lab = (id) => { try { return c.screen === "sliders" ? (id === "slOk" ? "the right setting" : "another setting") : callLabel(id); } catch (e) { return id; } };
    x.rep = { mode: P.mode === "unit" ? "a step's practice" : P.mode, kind: c.kind, ask: plain(c.ask || c.meta || txt(".sq")), hint: plain(c.hint), why: plain(c.why),
      options: c.screen === "sliders" || c.place || c.slot ? [] : (P.calls || []).map(lab),
      answer: c.screen === "sliders" ? slWantText(c) : c.place ? "start the week of " + E.BOARD_WEEKS[+String(c.answer).slice(1)] : lab(c.answer),
      graded: !!P.answered, right: P.answered ? P.picked === c.answer : null, picked: P.answered && P.picked ? lab(P.picked) : null };
    if (c.screen === "sliders" && P.sl) x.sliders = slSay(P.sl.st);
  } else if (view === "calcplay" && PG) x.sliders = slSay(PG.st);
  return x;
}
const slSay = (st) => `${SZ.TRAFFIC[st.s].label}, ${SL_ROWS.map(([k, n]) => `${n} ${slText(k, st)}`).join(", ")}. Power at week ${st.w}: ${pctS(SZ.powerSt(st))}. Smallest lift it sees at week ${st.w}: ${pctS(SZ.mdeSt(st))}.`;
initCoach({ ctx: coachCtx, narrate: (t) => narrate(t), hush: () => hush(), touch: TOUCH, online: () => ONLINE });

if (location.search.includes("debug")) window.__tb = { get P() { return P; }, get S() { return S; }, get L() { return L; }, get view() { return view; }, get VO() { return VO; }, get D() { return D; }, start: startUnit, lesson, ms1: startMS1, map: renderMap, today: () => renderToday(), next: () => sessionNext(), Z, plan: () => todayPlan(), ok: () => { if (P && P.c && !P.answered) submit(P.c.answer); } };   // auto-play tests only
load().then(() => {
  if (!ONLINE) $("nav-voice").hidden = true;   // narration needs the local voice server
  if (RELEASE) { for (const id of ["nav-exp", "nav-board", "nav-reg", "nav-road", "nav-story"]) $(id).hidden = true; document.querySelector(".brand small").textContent = RELEASE.title; }
  soundLabel(); voiceLabel(); coachRefresh();
  if (EMBED) document.addEventListener("keydown", (e) => {   // Esc steps away from the desk, unless something here is open
    if (e.key === "Escape" && $("overlay").hidden && (!$("tkp") || $("tkp").hidden) && view !== "lesson") toOffice({ type: "esc" }); }, true);
  if (EMBED && E.UNITS[EMBED]) { document.body.classList.add("embed"); import("/shared/desk/desk.mjs").then((d) => d.mountDesk({ theme: "lab", tutor: [".brief", ".hint", ".gq.sq", ".lesson .lp"] })).catch(() => {});   // in the office: Mei's A/B lab, pop-out tutorial, full screen (games/shared/desk)
    startUnit(EMBED); toOffice({ type: "ready", unit: EMBED }); } else renderToday();
  grab();
});
