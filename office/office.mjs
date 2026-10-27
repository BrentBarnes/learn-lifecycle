// The Fernhill office (CURRICULUM.md, "Roles and tracks"; the tracks are days.mjs). On day 1 you say what you were
// hired for: Analytics, Data, Testing, or any mix. Each workday, every desk you're clocked in for serves the next lesson
// you haven't passed on its track, and Dana closes the day once they pass. The time clock (5) clocks roles in and out
// on any day. The dashboard wall and the test board open the real Lifecycle Files and Test Board steps in a frame, on
// the office's own saves (profile office, or office-dev in dev mode); "Bring in my progress" on the time clock copies
// what's passed in the standalone games (office_store.py). Frank's desk teaches SQL here (sql.mjs).
// The left panel lists every track's lessons; dev mode (?dev, sticky until ?dev=0) lets you pick any of them.
import { T, COLS, ROWS, W, H, SOLID, STATIONS, CAST, ROLE, NPCS, DOG, loadArt, img, faceSrc, drawPerson } from "./art.mjs";
import { TRACKS, ROLES, ROLE_OF, lessonOf, nextLesson, weekday, morning } from "./days.mjs";
import * as Q from "./sql.mjs";
import { popOut } from "../shared/desk/desk.mjs";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// ---------- dev mode and saves ----------
const DEV = (() => {
  const q = new URLSearchParams(location.search).get("dev");
  try { if (q === "0") localStorage.removeItem("office-dev"); else if (q !== null) localStorage.setItem("office-dev", "1"); return localStorage.getItem("office-dev") === "1"; }
  catch (e) { return q !== null && q !== "0"; }
})();
const PROF = DEV ? "office-dev" : "office", LS = "office-" + PROF;
const FRESH = () => ({ v: 2, hired: false, roles: { analytics: false, data: false, testing: false }, day: 1, today: null, sql: {}, days: {}, lf: [], rev: 0 });
let O = FRESH();
let ONLINE = false;
function adopt(got) {
  O = Object.assign(FRESH(), got || {});
  if (got && got.v === 1) { O.v = 2; O.hired = false; O.today = null; O.days = {}; O.day = 1; }   // the day-list version: start over with roles
  O.roles = Object.assign({ analytics: false, data: false, testing: false }, O.roles);
}
async function loadSave() {
  let got = null;
  try { const r = await fetch(`/api/office/progress?profile=${PROF}`); if (r.ok) { got = await r.json(); ONLINE = true; } } catch (e) { /* no server */ }
  if (!ONLINE) try { got = JSON.parse(localStorage.getItem(LS) || "null"); } catch (e) { /* blocked */ }   // the browser copy only when there's no server
  adopt(got && got.v ? got : null);
}
let saveT = 0;
function save() {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    O.rev = (O.rev || 0) + 1; const body = JSON.stringify(O);
    try { localStorage.setItem(LS, body); } catch (e) { /* blocked */ }
    if (ONLINE) fetch(`/api/office/progress?profile=${PROF}`, { method: "POST", headers: { "Content-Type": "application/json" }, body })
      .then((r) => r.json()).then((j) => { if (j && j.stale && j.state) { adopt(j.state); hud(); } }).catch(() => {});   // a newer save (an import, another tab) wins
  }, 250);
}
// what's passed, read from each game's own save (the office keeps only the SQL desk's). On a static host (the public
// copy) there's no server to ask: Test Board's save is in this browser, and the office keeps the Lifecycle Files steps
// passed at its wall itself (O.lf), since that engine only runs inside its own page.
const PASSED = { dash: new Set(), board: new Set() };
async function refreshStatus() {
  if (!ONLINE) {
    PASSED.dash = new Set(O.lf || []);
    try { const t = JSON.parse(localStorage.getItem("tb3-" + PROF) || "null"); if (t) PASSED.board = new Set(Object.entries(t.units || {}).filter(([, v]) => v && v.passed).map(([k]) => k)); } catch (e) { /* blocked */ }
    return;
  }
  try { const ls = await Promise.all([1, 2, 7].map((lv) => fetch(`/api/lf/path?level=${lv}&profile=${PROF}`).then((r) => r.json())));
    PASSED.dash = new Set(ls.flatMap((p) => (p.steps || []).filter((s) => s.status === "done").map((s) => s.id))); } catch (e) { /* offline */ }
  try { const t = await (await fetch(`/api/tb/progress?v=3${PROF}`)).json(); PASSED.board = new Set(Object.entries(t.units || {}).filter(([, v]) => v && v.passed).map(([k]) => k)); } catch (e) { /* offline */ }
}
const sqlSt = (id) => (O.sql[id] = O.sql[id] || Q.newState());
const passedIn = (role) => (id) => role === "analytics" ? PASSED.dash.has(id) : role === "testing" ? PASSED.board.has(id) : !!(O.sql[id] && O.sql[id].passed);
const DESKS = ["dash", "sql", "board"];
const deskOn = (desk) => !!O.roles[ROLE_OF[desk]];
const lessonId = (desk) => (O.today && O.today[desk]) || null;
const deskLesson = (desk) => lessonOf(ROLE_OF[desk], lessonId(desk));
// a desk is done today when its lesson passed, or there's nothing left to learn on its track
const deskDone = (desk) => !lessonId(desk) || passedIn(ROLE_OF[desk])(lessonId(desk));
const onDesks = () => DESKS.filter(deskOn);
const dayDone = () => onDesks().every(deskDone);
// today's lessons: each clocked-in desk gets the next lesson it hasn't passed, and keeps it for the day
function fillToday() {
  if (!O.today || O.today.n !== O.day) O.today = { n: O.day, dash: null, sql: null, board: null };
  for (const desk of DESKS) if (deskOn(desk) && !O.today[desk]) { const l = nextLesson(ROLE_OF[desk], passedIn(ROLE_OF[desk])); O.today[desk] = l ? l.id : null; }
}

// ---------- sound: small synth blips, no files ----------
let AC = null, MUTED = false;
try { MUTED = localStorage.getItem("office-muted") === "1"; } catch (e) { /* private window */ }
function wake() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) { /* no sound */ } }
addEventListener("keydown", wake, true); addEventListener("pointerdown", wake, true);
function tone(f, d = 0.08, type = "square", vol = 0.04, at = 0) {
  if (!AC || MUTED) return;
  try { const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime + at;
    o.type = type; o.frequency.value = f; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d); } catch (e) { /* no sound */ }
}
const SND = { step: () => tone(180, 0.03, "triangle", 0.02), blip: () => tone(660, 0.025, "square", 0.015), open: () => { tone(392, 0.06); tone(523, 0.08, "square", 0.04, 0.05); },
  right: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, "square", 0.04, i * 0.06)), wrong: () => { tone(160, 0.18, "sawtooth", 0.05); tone(120, 0.22, "sawtooth", 0.04, 0.08); },
  done: () => [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.16, "triangle", 0.05, i * 0.08)), bump: () => tone(90, 0.06, "square", 0.03) };
function mute() { MUTED = !MUTED; try { localStorage.setItem("office-muted", MUTED ? "1" : "0"); } catch (e) { /* fine */ } $("snd").textContent = MUTED ? "sound off" : "sound on"; }

// ---------- the day ----------
const CHIP = { dash: "Dashboard", sql: "SQL", board: "Test board", dana: "Tell Dana" };
const G = { t0: 0, desk: null, day: null, ended: false, open: {} };
const P = { x: 9, y: 7, px: 9 * T, py: 7 * T, from: null, t: 0, dir: "down", path: [], hold: null };

// ---------- the room on the canvas ----------
const cv = $("room"), x = cv.getContext("2d");
let ROOM = "room", S = 3;
function fit() {
  const side = $("days").offsetWidth || 0;
  S = Math.max(2, Math.min(4, Math.floor(Math.min((innerWidth - side - 48) / W, (innerHeight - 230) / H))));
  cv.width = W * S; cv.height = H * S; x.imageSmoothingEnabled = false;
}
addEventListener("resize", () => { fit(); if (G.desk === "sql") stringUp(SQ.ok); });
function faceTo(n) {   // people face down unless you're close; then they turn to look at you
  const dx = P.x - n.x, dy = P.y - n.y;
  if (Math.abs(dx) + Math.abs(dy) > 2) return "down";
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy < 0 ? "up" : "down";
}
function marker(id, now) {
  const st = STATIONS[id], [ax, ay] = id === "dana" ? st.tiles[0] : st.stand, bob = Math.round(Math.sin(now / 180 + ax) * 2);
  const mx = ax * T + 5, my = ay * T - (id === "dana" ? 6 : 10) + bob;
  x.fillStyle = "#f6c85f"; [[0, 0, 6, 2], [1, 2, 4, 2], [2, 4, 2, 2]].forEach(([a, b, w, h]) => x.fillRect((mx + a) * S, (my + b) * S, w * S, h * S));
}
function frameLoop(now) {
  x.imageSmoothingEnabled = false;
  const room = img(ROOM); if (room) x.drawImage(room, 0, 0, W * S, H * S);
  if (G.day && !G.ended && !SAY) { const left = onDesks().filter((k) => !deskDone(k)); (left.length ? left : ["dana"]).forEach((k) => marker(k, now)); }
  stepPlayer(now);
  const walking = P.from || P.path.length;
  const people = [...NPCS.map((n) => ({ id: n.id, px: n.x * T, py: n.y * T, dir: faceTo(n), f: 0 })), { id: "you", px: P.px, py: P.py, dir: P.dir, f: walking ? Math.floor(now / 110) % 4 : 0 }];
  x.fillStyle = "rgba(40,20,10,.25)"; people.forEach((p) => { x.fillRect(Math.round(p.px + 3) * S, Math.round(p.py + 14) * S, 10 * S, 2 * S); x.fillRect(Math.round(p.px + 4) * S, Math.round(p.py + 16) * S, 8 * S, 1 * S); });
  const dog = img("dog"), df = Math.floor(now / 250) % 4;   // Biscuit, asleep on the rug, with a z floating up
  const drawables = people.map((p) => ({ y: p.py, draw: () => drawPerson(x, p.id, p.dir, p.f, p.px, p.py, S) }));
  if (dog) drawables.push({ y: DOG.y * T, draw: () => {
    x.drawImage(dog, df * 24, 0, 24, 16, (DOG.x * T - 4) * S, (DOG.y * T + 2) * S, 24 * S, 16 * S);
    const zt = (now / 1600) % 1, zx = DOG.x * T + 10 + Math.round(zt * 6), zy = DOG.y * T - 2 - Math.round(zt * 10);
    x.globalAlpha = 1 - zt; x.fillStyle = "#fffdf8"; [[0, 0, 4, 1], [2, 1, 1, 1], [1, 2, 1, 1], [0, 3, 4, 1]].forEach(([a, b, w, h]) => x.fillRect((zx + a) * S, (zy + b) * S, w * S, h * S)); x.globalAlpha = 1; } });
  const front = img(ROOM + "_front");   // the near desks stand in front of whoever is behind them
  if (front) drawables.push({ y: 9 * T - 0.5, draw: () => x.drawImage(front, 0, 0, W * S, H * S) });
  drawables.sort((a, b) => a.y - b.y).forEach((dr) => dr.draw());
  tip();
  const nc = G.desk === "sql" && $("noir"), noir = img("noir");
  if (nc && noir) { const c2 = nc.getContext("2d"); c2.imageSmoothingEnabled = false; c2.drawImage(noir, (Math.floor(now / 125) % 8) * 160, 0, 160, 90, 0, 0, 160, 90); }
  requestAnimationFrame(frameLoop);
}
function tip() {   // the label over your head at a desk: crisp page text placed over the canvas
  const here = !P.from && !P.path.length && !G.desk && !SAY && G.day ? stationHere() : null, el = $("tip");
  if (!here) { el.hidden = true; return; }
  const k = cv.clientWidth / W, st = STATIONS[here], isDesk = DESKS.includes(here), off = isDesk && !deskOn(here), done = isDesk && !off && deskDone(here);
  el.hidden = false; el.className = "tip" + (done || off ? " dim" : "");
  el.innerHTML = `<span class="kbd">Enter</span> ${here === "dana" ? "Dana" : `${st.name}${off ? " · clocked out" : done ? " · passed" : ""}`}`;
  el.style.left = cv.offsetLeft + cv.clientLeft + (P.px + 8) * k + "px"; el.style.top = cv.offsetTop + cv.clientTop + (P.py - 4) * k + "px";
}
// ---------- walking: one tile at a time, smoothly; held keys keep going ----------
const free = (tx, ty) => tx >= 0 && ty >= 0 && tx < COLS && ty < ROWS && !SOLID.has(tx + "," + ty);
function tryStep(dx, dy) {
  if (P.from || G.desk || SAY) return;
  const nx = P.x + dx, ny = P.y + dy;
  P.dir = dx > 0 ? "right" : dx < 0 ? "left" : dy < 0 ? "up" : "down";
  if (!free(nx, ny)) { if (!P.path.length && P.bumped !== nx + "," + ny) { SND.bump(); P.bumped = nx + "," + ny; } return; }
  P.bumped = null; P.from = [P.x, P.y]; P.x = nx; P.y = ny; P.t = performance.now(); SND.step();
}
function stepPlayer(now) {
  if (!P.from) { if (P.path.length) { const [nx, ny] = P.path.shift(); tryStep(nx - P.x, ny - P.y); if (!P.path.length) P.arrive && setTimeout(P.arrive, 140); }
    else if (P.hold) tryStep(...P.hold); return; }
  const k = Math.min(1, (now - P.t) / 110);
  P.px = (P.from[0] + (P.x - P.from[0]) * k) * T; P.py = (P.from[1] + (P.y - P.from[1]) * k) * T;
  if (k >= 1) { P.from = null; P.px = P.x * T; P.py = P.y * T; }
}
function walkTo(id) {   // shortest walk to a station (breadth-first over free tiles), then use it
  if (DEV) shush();
  const st = STATIONS[id]; if (!st || G.desk || SAY) return;
  const goal = st.stand.join(","), prev = new Map([[P.x + "," + P.y, null]]), q = [[P.x, P.y]];
  while (q.length) { const [cx, cy] = q.shift(); if (cx + "," + cy === goal) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = cx + dx + "," + (cy + dy); if (!prev.has(k) && free(cx + dx, cy + dy)) { prev.set(k, cx + "," + cy); q.push([cx + dx, cy + dy]); } } }
  if (!prev.has(goal)) return;
  const path = []; for (let k = goal; k && k !== P.x + "," + P.y; k = prev.get(k)) path.unshift(k.split(",").map(Number));
  P.path = path; P.arrive = () => { P.dir = id === "dana" ? "left" : "up"; use(id); };   // the time clock is on the wall too: face up
  if (!path.length) P.arrive();
}
function stationHere() {
  for (const [id, st] of Object.entries(STATIONS)) if (Math.abs(P.x - st.stand[0]) + Math.abs(P.y - st.stand[1]) <= 1) return id;
  return null;
}
function use(id) {
  if (!id || !G.day) return;
  if (id === "clock") return openDesk("clock");
  if (id === "dana") {
    if (G.ended) return say([{ who: "dana", face: "smile", text: "You're done for today. Go home! Or practise anything you like." }]);
    const left = onDesks().filter((k) => !deskDone(k));
    if (left.length) return say([{ who: "dana", text: `Still to do today: ${left.map((k) => CHIP[k].toLowerCase()).join(", ")}. Come back when they're done.` }]);
    return recap();
  }
  if (!deskOn(id)) return say([{ who: "you", text: `I'm clocked out of ${TRACKS[ROLE_OF[id]].role.toLowerCase()} today. The time clock by the screens (5) clocks me in.` }]);
  openDesk(id);
}

// ---------- talking ----------
let SAY = null;
function say(lines, then) { SAY = { lines, i: 0, then, shown: 0 }; $("say").hidden = false; showLine(); }
function showLine() {
  const l = SAY.lines[SAY.i], c = CAST[l.who] || CAST.you;
  $("who").textContent = l.chat ? `${c.name} · message` : c.name;
  $("face").src = faceSrc(l.who, l.face);
  const t = $("txt"); t.textContent = ""; SAY.shown = 0; clearInterval(SAY.tick); $("say").classList.remove("ready");
  SAY.tick = setInterval(() => { SAY.shown += 2; t.textContent = l.text.slice(0, SAY.shown); if (SAY.shown % 6 === 0) SND.blip();
    if (SAY.shown >= l.text.length) { clearInterval(SAY.tick); $("say").classList.add("ready"); } }, 16);
}
function shush() {   // dev mode: a jump closes whatever is being said, without running what comes after it
  if (!SAY) return; clearInterval(SAY.tick); SAY = null; $("say").hidden = true;
}
function sayNext() {
  const l = SAY.lines[SAY.i];
  if (SAY.shown < l.text.length) { clearInterval(SAY.tick); SAY.shown = l.text.length; $("txt").textContent = l.text; $("say").classList.add("ready"); return; }
  if (++SAY.i < SAY.lines.length) return showLine();
  $("say").hidden = true; const then = SAY.then; SAY = null; if (then) then();
}

// ---------- the top bar and the track list ----------
function hud() {
  if (!G.day) return;
  $("day").textContent = `Day ${O.day} · ${weekday(O.day)} · Fernhill Coffee Co.`;
  if (!O.hired) { $("obj").textContent = "Your first day"; $("chips").innerHTML = ""; return trackList(); }
  const on = onDesks(), left = on.filter((k) => !deskDone(k));
  const keys = on.map((k) => `<span class="kbd">${STATIONS[k].key}</span>`).join("");
  $("obj").innerHTML = G.ended ? "Day done" : left.length ? `${on.length === 1 ? "One lesson" : on.length + " lessons"} today ${keys}` : `Done. Tell Dana <span class="kbd">4</span>`;
  $("chips").innerHTML = [...on, "dana"].map((k) => { const ok = k === "dana" ? G.ended : deskDone(k);
    return `<span class="chip ${ok ? "ok" : ""}">${CHIP[k]}${ok ? " ✓" : ""}</span>`; }).join("") + `<span class="chip clk" title="The time clock: change your roles (5)">⏱ ${ROLES.filter((r) => O.roles[r]).map((r) => TRACKS[r].role).join(" · ") || "clocked out"}</span>`;
  trackList();
}
const mark = (ok, cls = "") => `<i class="dk ${ok ? "ok" : ""} ${cls}">${ok ? "✓" : ""}</i>`;
function trackList() {
  const box = $("dlist"); if (!box) return;
  $("dday").innerHTML = `<b>Day ${O.day}</b> ${weekday(O.day)}${DEV ? ' <button class="dstep" id="dprev" type="button" title="Day before">◀</button><button class="dstep" id="dnext" type="button" title="Next day">▶</button>' : ""}`;
  box.innerHTML = ROLES.map((r) => {
    const tr = TRACKS[r], on = !!O.roles[r], pass = passedIn(r), cur = O.today && O.today[tr.desk];
    const built = tr.lessons.filter((l) => l.id), n = built.filter((l) => pass(l.id)).length, open = G.open[r] ?? on;
    let group = "", rows = "";
    for (const l of tr.lessons) {
      if (l.group !== group) { group = l.group; rows += `<div class="tg">${esc(group)}</div>`; }
      const ok = l.id && pass(l.id), now = l.id && l.id === cur && on;
      rows += `<button class="lr${ok ? " ok" : ""}${now ? " cur" : ""}${l.id ? "" : " na"}" type="button" data-role="${r}" data-id="${l.id || ""}" ${DEV && l.id ? "" : "disabled"} title="${DEV && l.id ? "Make this today's lesson" : ""}">${mark(ok, l.id ? "" : "na")}<span>${esc(l.title)}</span>${now ? '<em class="today">today</em>' : ""}</button>`;
    }
    return `<section class="trk ${on ? "on" : "off"}"><button class="th" type="button" data-tog="${r}"><span class="tn">${tr.role}<small>${tr.where}</small></span><span class="io ${on ? "in" : ""}">${on ? "IN" : "OUT"}</span><span class="tc">${n}/${built.length}</span></button>
      <div class="tl" ${open ? "" : "hidden"}>${rows}</div></section>`;
  }).join("");
  box.querySelectorAll("[data-tog]").forEach((b) => b.onclick = () => { const r = b.dataset.tog; G.open[r] = !(G.open[r] ?? O.roles[r]); trackList(); });
  box.querySelectorAll(".lr[data-id]").forEach((b) => b.onclick = () => { if (DEV && b.dataset.id) pickLesson(b.dataset.role, b.dataset.id); });
  if (DEV) { $("dprev").onclick = () => devDay(-1); $("dnext").onclick = () => devDay(1); }
  const c = box.querySelector(".lr.cur"); if (c && !box.dataset.scrolled) { c.scrollIntoView({ block: "nearest" }); box.dataset.scrolled = "1"; }
}
// dev mode: any lesson on any track becomes today's, and clocks that role in
function pickLesson(role, id) {
  shush(); if (G.desk) closeDesk();
  O.roles[role] = true; fillToday(); O.today[TRACKS[role].desk] = id; G.ended = false; ROOM = "room";
  if (TRACKS[role].desk === "sql") { SQ.rep = null; SQ.view = "lesson"; }
  save(); hud();
}
function devDay(d) { shush(); if (G.desk) closeDesk(); O.day = Math.max(1, O.day + d); O.today = null; goDay(); }

// ---------- desks ----------
function openDesk(id) {
  G.desk = id; $("desk").hidden = false; SND.open();
  if (id === "clock") return clockDraw();
  if (id === "hire") return hireDraw();
  if (id === "sql") return sqlOpen();
  frameDesk(id);
}
function closeDesk() {
  if (!G.desk) return;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  const was = G.desk; G.desk = null; $("desk").hidden = true; sheet().className = "sheet"; sheet().innerHTML = ""; grab();
  if (was === "dash" || was === "board") refreshStatus().then(() => { hud(); afterDesk(); }); else { hud(); afterDesk(); }
}
function afterDesk() {   // a nudge when the last desk of the day passes
  if (!G.day || G.ended || G.nudged === O.day || !onDesks().length) return;
  if (dayDone()) { G.nudged = O.day; say([{ who: "dana", chat: true, face: "smile", text: "All done for today? Come tell me how it went. Press 4." }]); }
}
const sheet = () => $("sheet");
function shake() { const s = sheet(); s.classList.remove("shake"); void s.offsetWidth; s.classList.add("shake"); }
const pf = (id, face = "calm", size = 64) => `<img class="pix" src="${faceSrc(id, face)}" width="${size}" height="${size}" alt="${CAST[id] ? CAST[id].name : ""}">`;

// ----- full screen and the floating pin board -----
// Every desk can fill the screen (the button, or \ here and inside the framed games); Esc leaves full screen first.
// data-siteslot: on the public site, its corner buttons (Save file, Make a suggestion) sit here while a desk is open
const FULL = `<span data-siteslot></span><button class="x" id="full" type="button" title="Fill the screen with this desk (\\)">⛶ Full screen <span class="kbd dk">\\</span></button>`;
function toggleFull() {
  if (document.fullscreenElement) return document.exitFullscreen().catch(() => {});
  if (G.desk && sheet().requestFullscreen) sheet().requestFullscreen().catch(() => {});
}
// Frank's pin board floats in its own small window (games/shared/desk/desk.mjs popOut), kept live while you type
let BOARD = null;
function popBoard() {
  if (BOARD) { try { BOARD.close(); } catch (e) { /* gone */ } return; }
  popOut({ title: "Frank's pin board", width: 460, height: 640, hideClass: "board-out", pick: () => [sheet().querySelector(".cork")],
    after: (d) => requestAnimationFrame(() => stringUp(SQ.ok, d)),
    onClose: () => { BOARD = null; const b = $("popboard"); if (b) b.textContent = "⧉ Pop out"; requestAnimationFrame(() => stringUp(SQ.ok)); grab(); } })
    .then((w) => { if (w) { BOARD = w; const b = $("popboard"); if (b) b.textContent = "⧉ Bring it back"; } });
}

// ----- the dashboard wall and the test board: the real games, framed, on the office's save -----
const FRAME = {
  dash: { name: "Dashboard wall", game: "Lifecycle Files", src: (id) => `/lifecycle-files/?start=step&step=${encodeURIComponent(id)}&embed=1&profile=${PROF}` },
  board: { name: "Test board", game: "Test Board · GrowthBook", src: (id) => `/test-board/?embed=${encodeURIComponent(id)}&save=${PROF}` },
};
function frameDesk(id) {
  const F = FRAME[id], s = deskLesson(id);
  if (!s) { closeDesk(); return say([{ who: "you", text: `Nothing new at the ${F.name.toLowerCase()}: every lesson there is passed.` }]); }
  sheet().className = "sheet framed";
  sheet().innerHTML = `<header><b>${F.name}</b><span class="tool">${F.game} · ${esc(s.group)} · ${esc(s.title)}</span><span class="chipok" id="fok" ${deskDone(id) ? "" : "hidden"}>Passed ✓</span><span class="sp"></span>
    ${FULL}<button class="x" id="close" type="button">Step away · Esc</button></header><iframe id="game" title="${F.name}" allow="fullscreen" src="${F.src(s.id)}${location.search.includes("debug") ? "&debug" : ""}"></iframe>`;
  $("close").onclick = closeDesk;
  const fr = $("game"); fr.addEventListener("load", () => { try { fr.contentWindow.focus(); } catch (e) { /* fine */ } });
}
addEventListener("message", (e) => {
  if (e.origin !== location.origin || !e.data || !G.desk || (G.desk !== "dash" && G.desk !== "board")) return;
  const m = e.data;
  if (m.type === "passed") { (G.desk === "dash" ? PASSED.dash : PASSED.board).add(lessonId(G.desk)); if (G.desk === "dash") { O.lf = [...PASSED.dash]; save(); } const f = $("fok"); if (f) f.hidden = false; SND.right(); hud(); }
  if (m.type === "close" || m.type === "esc") closeDesk();
  if (m.type === "full") toggleFull();
});

// ----- Frank Mallory's SQL desk: one part a day (sql.mjs) -----
// three databases: Units A and B's small shop, the grown shop (Unit C on), and the hidden grown shop answers are also graded on
let DB = null, DBB = null, DBH = null;
async function db() {
  if (DB) return DB;
  const SQL = await initSqlJs({ locateFile: (f) => f });
  DB = new SQL.Database(); Q.load(DB); DBB = new SQL.Database(); Q.loadBig(DBB); DBH = new SQL.Database(); Q.loadBig(DBH, true); return DB;
}
const runIn = (d, q) => { const r = d.exec(q); return r.length ? { cols: r[0].columns, rows: r[0].values } : { cols: [], rows: [] }; };
// the step the desk is on: today's lesson, or the passed step a review rep comes from (its shop and its board)
const act = () => SQ.part || lessonId("sql");
const run = (q) => runIn(Q.isBig(act()) ? DBB : DB, q);
// real calendar days for review (?today=YYYY-MM-DD in debug, to test the schedule)
const TODAY = () => (location.search.includes("debug") && new URLSearchParams(location.search).get("today")) || new Date().toLocaleDateString("en-CA");
const REVIEWABLE = new Map(), canReview = (id) => { if (!REVIEWABLE.has(id)) REVIEWABLE.set(id, Q.reviewable(id)); return REVIEWABLE.get(id); };
// every passed step gets a review card; one passed before cards existed is due today
function ensureCards() {
  const srs = O.sql._srs = O.sql._srs || {}, today = TODAY();
  for (const p of Q.PARTS) if (O.sql[p.id] && O.sql[p.id].passed && !srs[p.id] && canReview(p.id)) srs[p.id] = { ivl: 1, due: today, seen: O.sql[p.id].last || today };
}
const dueNow = () => Q.dueIds(O.sql._srs, TODAY());
const SQ = { view: "lesson", mode: "lesson", part: null, queue: [], stages: [], rep: null, text: "", out: null, tries: 0, done: false, ok: false, fb: "", peek: false, r: Q.rng(Date.now() & 0xffffff) };
// Frank's line on a right answer, ten per unit (batch 3: right-answer feel)
const CLOSERS = {
  A: ["Clean. Like a fresh export.", "That's the one. File it.", "Right rows, nothing extra. That's the whole job most days.", "The table talked. You asked the right question.", "Narrow it down, kid. You did.",
    "A WHERE that keeps what it should. Worth its weight.", "Filed. Next.", "No strays in that list. I checked.", "That's a clean pull. Theo can send it.", "Simple questions, right answers. Don't knock it."],
  B: ["The numbers add up. Mostly they don't, so enjoy it.", "One pile per thing. That's the trick.", "Counted right. The auditors sleep tonight.", "That total's honest. I'd sign it.", "Clean. The coffee's cold. The numbers are warm.",
    "Group it, count it, file it.", "That's the figure. Write it on the board.", "Every pile accounted for.", "A wrong count looks as sure as a right one. This one's right.", "The data always talks. You just stop asking it nicely."],
  C: ["Two tables, one story. You lined them up.", "The keys matched. They usually do, if you ask.", "Joined right. No ghosts, no doubles.", "Nobody fell through the join. Good.", "The strings on the board led where they should.",
    "That's the link. File it.", "Every customer where they belong.", "Clean join. I've seen grown analysts double a revenue line with less.", "The missing ones showed up. That's what LEFT is for.", "Right rows. The board's earning its keep."],
  D: ["Step by step. That's how the big ones crack.", "The dates lined up. Time's the sneakiest column.", "One stage at a time. Never let a query do two jobs.", "That pipeline holds water.", "Right order, right numbers. Go home early.",
    "Each stage handed the next one the right thing.", "Time-ordered and true. Nice.", "Big question, small pieces. You got it.", "That's the timeline. File it.", "The steps agree with each other. That's rarer than you think."],
  E: ["From brief to rows, on your own. That's the job.", "Nobody planned that for you. Good.", "Stages named right, rows right. I'd hire you.", "That's an analyst's query. Not a student's.", "Clean pipeline. Hank can take it upstairs.",
    "You wrote the plan and the query. Both held.", "Every stage pulls its weight.", "That's the whole picture. File it.", "A query you can read next month. Rare.", "Right answer, right shape. Done."],
  F: ["Translated, and nothing lost on the way.", "Somebody else's paperwork, and you read it right.", "Codes cracked. The file talks now.", "That's what the job looks like on a Monday.", "Clean emails, clean join. Most people miss that.",
    "Text that looks like a number. You didn't fall for it.", "New town, same rules. You'd do fine here.", "You read before you asked. That's the habit.", "Any database, any export. Same detective.", "Filed, in their language and ours."],
  M: ["That's a number somebody will act on. It's right.", "The metric's honest. Put it in the deck.", "Right denominator. That's where most of them go wrong.", "That's what it's worth. Money talks.", "Clean. Finance won't call.",
    "That rate holds up. I checked the bottom of the fraction.", "There's the money. File it.", "Right number. Somebody's budget depends on it.", "A metric is just a query somebody trusts. Trust this one.", "That's the figure. Take it upstairs."],
  case: ["Case closed. The coffee's cold. The rows are warm.", "Closed. Put it in the drawer with the others.", "That's the whole story. Stamp it.", "Every step held. Case closed.", "The answer was in the tables the whole time. You found it.",
    "Closed. Go tell them what it cost.", "That's how a case cracks: one small question at a time.", "Case closed. Nobody's guessing anymore.", "File it under solved.", "Done. The answer's on the desk."] };
const unitOf = (part) => part.kind === "case" ? "case" : part.group.startsWith("Metric") ? "M" : (part.group.match(/^Unit ([A-F])/) || [, "A"])[1];
const closer = (part, n) => { const L = CLOSERS[unitOf(part)]; return L[n % L.length]; };
const fmtV = (v) => typeof v === "number" && !Number.isInteger(v) ? String(+v.toFixed(2)) : String(v);
// a case's answer in one line: the number, or the rows it came to
const answerOf = (o) => !o || o.err ? "" : o.rows.length === 1 && o.cols.length === 1 ? `The answer: ${fmtV(o.rows[0][0])}.` : `The answer: ${o.rows.length.toLocaleString()} row${o.rows.length === 1 ? "" : "s"}, below.`;
// the coworker says back what came out, so a right answer reads as a finding, not a grade
function echo(o, n) {
  if (!o || o.err) return "Perfect, thank you!";
  if (!o.rows.length) return "Nobody. That's actually the answer I needed.";
  if (o.rows.length === 1 && o.cols.length === 1) { const v = fmtV(o.rows[0][0]); return [`${v}. That's the number I needed.`, `${v}? Great, that goes in the report.`, `So it's ${v}. Thank you!`, `${v}. Writing that down now.`][n % 4]; }
  if (o.rows.length === 1) return "Just the one row. That's it, thanks!";
  const k = o.rows.length.toLocaleString(), first = fmtV(o.rows[0][0]);
  return [`${k} rows. That's the list I needed.`, `All ${k} of them. Perfect.`, `${k} rows, starting with ${first}. That's it.`, `That's the ${k} I was after. Thanks!`][n % 4];
}
const STUMPED = ["Wrong rows. Happens to the best of us. Happened to me in '14.", "Something's off. Look again. The table's hiding something."];
async function sqlOpen() {
  sheet().className = "sheet term"; sheet().innerHTML = `<header><b>Frank Mallory's desk</b><span class="sp"></span>${FULL}<button class="x" id="close" type="button">Step away · Esc</button></header><div class="body"><div class="main"><p>Loading the database…</p></div></div>`;
  $("close").onclick = closeDesk;
  await db(); if (G.desk !== "sql") return;
  ensureCards();
  if (!SQ.hooked) { SQ.hooked = true; sheet().addEventListener("click", (e) => { if (e.target.closest && e.target.closest("#rev")) startReview(); }); }
  if (SQ.mode !== "lesson" && (SQ.view === "rep" || SQ.view === "revdone" || SQ.view === "recap")) return sqlDraw();   // a review or a recap still open
  SQ.mode = "lesson";
  const id = lessonId("sql"); SQ.part = id;
  if (!id) { SQ.view = "later"; return sqlDraw(); }
  const st = sqlSt(id);
  // ten misses yesterday: today opens on the lesson and its worked example
  if (st.relesson && (!st.missDay || st.missDay.d !== TODAY())) { st.relesson = false; SQ.view = "lesson"; save(); }
  // previously at Fernhill: before a new step's lesson, the parts it leans on that haven't been touched in a week
  const recapped = O.sql._recap && O.sql._recap[id];
  if (!st.reps.length && SQ.view === "lesson" && !recapped) { const rz = Q.rusty(id, O.sql, TODAY()).filter(canReview); if (rz.length) { Object.assign(SQ, { mode: "recap", queue: rz, view: "recap", recapFor: id, revN: 0, revClean: 0, revTotal: rz.length }); return sqlDraw(); } }
  if (SQ.view === "pass" || SQ.view === "later" || (SQ.rep && SQ.rep.part !== id)) SQ.view = st.reps.length ? "rep" : "lesson";
  if (SQ.view === "rep" && (!SQ.rep || SQ.rep.part !== id || SQ.done)) newRep();
  sqlDraw();
}
// clause sets this player has built (SQL-CURRICULUM.md, first sight): a set never built comes as an Extend rep first
const seenSql = () => new Set(O.sql._seen || []);
function newRep() {
  let t;
  if (SQ.mode === "lesson") { const id = SQ.part = lessonId("sql"); t = SQ.rep = Q.nextRep(id, sqlSt(id), SQ.r, seenSql(), twinCheck); }
  else { const id = SQ.part = SQ.queue.shift(); SQ.retrying = SQ.requeued && SQ.requeued.includes(id) ? id : null; t = SQ.rep = Q.reviewRep(id, SQ.r); }
  SQ.stages = []; SQ.unfold = []; SQ.back = false; SQ.myPlan = null; SQ.planWhy = ""; SQ.planText = "";
  clearTimeout(SQ.unlockT);
  Object.assign(SQ, TRY0(), { text: t.kind === "extend" ? t.base.replace(/;$/, "") : t.kind === "fix" ? t.bad : t.kind === "fill" ? t.fill : "", done: false, ok: false, peek: false, swapped: false, typed: null, climbed: 0,
    sub: 0, subs: [], subFail: false, subMiss: false, subClean: true });
  skipGiven();
}
// a pipeline's given stages (tier 1: one stage blank) run by themselves and pin to the board
function skipGiven() {
  const t = SQ.rep; if (!t.steps) return;
  while (SQ.sub < t.steps.length && t.steps[SQ.sub].given) { const s = t.steps[SQ.sub], out = run(s.sql); SQ.subs.push({ out, given: true }); pinStage(s, out); SQ.sub++; }
  if (SQ.sub >= t.steps.length) SQ.sub = t.steps.length - 1;
}
function pinStage(s, out) { if (s.stage && out && out.cols) SQ.stages = SQ.stages.filter((x) => x.name !== s.stage).concat({ name: s.stage, cols: out.cols, n: out.rows.length, does: s.ask.replace(/^Stage \w+: /, "") }); }
const lastStep = (t) => !t.steps || t.steps.slice(SQ.sub + 1).every((s) => s.given);
// the review pile: every passed step that's due, on real days. No cap: it takes as long as the pile
function startReview() {
  const ids = dueNow(); if (!ids.length) return;
  Object.assign(SQ, { mode: "review", queue: ids, view: "rep", revN: 0, revClean: 0, revTotal: ids.length, requeued: [] }); newRep(); sqlDraw();
}
function reviewDone(clean) {
  const id = SQ.rep.part, srs = O.sql._srs = O.sql._srs || {};
  const retry = SQ.mode === "review" && SQ.requeued.includes(id) && SQ.retrying === id;   // the same-day retry of a miss: practice, the miss stands
  if (!retry) srs[id] = Q.schedule(srs[id] || Q.newCard(TODAY()), clean, TODAY());
  SQ.revN++; if (clean) SQ.revClean++;
  // a miss comes back once at the end of the pile, the same day
  if (!clean && SQ.mode === "review" && !SQ.requeued.includes(id)) { SQ.requeued.push(id); SQ.queue.push(id); SQ.revTotal++; }
  save();
}
// the request being answered: the rep itself, or the current step of a chain
const cur = () => SQ.rep.steps ? SQ.rep.steps[SQ.sub] : SQ.rep;
// a peek is help, except on a guided or hinted run of a chain, where the support is the point
const isHelp = (t) => t.kind === "extend" || (SQ.peek && !(t.mode === "guided" || t.mode === "hinted"));
const FAMILY = { select: "select", where: "where", andor: "where", inlike: "where", order: "order", agg: "agg", distinct: "agg", group: "group", having: "group",
  join: "select", left: "select", nulls: "where", never: "select", case: "agg", dates: "where", subquery: "order", cte: "group", window: "order", lag: "order", messy: "where" };
const CL_NAME = { where: "WHERE", order: "ORDER BY · LIMIT", andor: "AND · OR", inlike: "IN · BETWEEN · LIKE", agg: "a total", distinct: "DISTINCT", group: "GROUP BY", having: "HAVING",
  join: "JOIN … ON", left: "LEFT JOIN", nulls: "IS NULL · COALESCE", case: "CASE", dates: "dates", subquery: "( SELECT … )", cte: "WITH", window: "OVER ( … )", lag: "LAG · LEAD", messy: "LOWER · TRIM · NULLIF" };
const CL_ORDER = ["cte", "join", "left", "where", "andor", "inlike", "nulls", "messy", "dates", "subquery", "case", "agg", "distinct", "group", "having", "window", "lag", "order"];
const clauseTags = (q) => `<span class="tags">${Q.clauses(q).split("+").filter(Boolean).sort((a, b) => CL_ORDER.indexOf(a) - CL_ORDER.indexOf(b)).map((k) => `<span class="ck ck-${FAMILY[k] || k}">${CL_NAME[k] || k}</span>`).join("")}</span>`;
const MODE_NOTE = { guided: "Guided run. Each step names its clauses, and the casebook is open.", hinted: "Hinted run. Tab shows each step's clauses and the casebook, free.",
  solo: "Solo run. Tab still works, but a peek means this run won't count." };
// the clause-by-clause replay (sql.mjs stages): rows left after each step, yours next to the one the request wanted
function replayHTML(mineQ, wantQ) {
  const count = (q) => { const st = q && Q.stages(q); if (!st) return null; return Object.fromEntries(st.map((x) => { try { const k = run(x.sql).rows.length; return [x.step, `${k} ${k === 1 ? x.unit.slice(0, -1) : x.unit}`]; } catch (e) { return [x.step, "–"]; } })); };
  const a = count(mineQ), b = count(wantQ); if (!b) return "";
  const steps = ["FROM", "WHERE", "GROUP BY", "HAVING", "SELECT", "ORDER BY", "LIMIT"].filter((k) => (a && k in a) || k in b);
  const off = a && steps.find((k) => a[k] !== b[k]);
  return `<div class="replay"><b>Step by step, in the order SQL runs it</b><table><tr><th></th>${a ? "<th>Yours</th>" : ""}<th>${a ? "Wanted" : "This query"}</th></tr>${steps.map((k) =>
    `<tr class="${k === off ? "off" : ""}"><td>${k}</td>${a ? `<td>${a[k] || "skipped"}</td>` : ""}<td>${b[k] || "skipped"}</td></tr>`).join("")}</table>
    ${a ? `<small>${off ? `Your rows went off at <b>${off}</b>.` : "Same counts at every step, so the difference is in the values: check the columns and the values in your tests."}</small>` : ""}</div>`;
}
const replayOn = (id) => Q.PARTS.findIndex((p) => p.id === id) >= Q.PARTS.findIndex((p) => p.id === "runorder");
// the request with each phrase coloured by the clause it becomes (Extend reps)
function markedAsk(t) {
  let h = esc(t.ask);
  for (const [ph, c] of t.marks || []) h = h.replace(esc(ph), `<span class="ck ck-${FAMILY[c] || c}">${esc(ph)}</span>`);
  return h;
}
// Frank's casebook: every phrase-to-clause entry from the parts up to today's
function casebookHTML(upto) {
  const ids = Q.PARTS.slice(0, Q.PARTS.findIndex((p) => p.id === upto) + 1).map((p) => p.id).reverse();   // today's part on top
  return `<div class="casebook"><b>Frank's casebook</b><ul>${ids.flatMap((id) => (Q.CASEBOOK[id] || []).map(([a, b]) => `<li><span>${a}</span><code>${b}</code></li>`)).join("")}</ul></div>`;
}
function ladder(part, st) {
  const L = Q.levels(part.id), at = Q.tierOf(part.id, st), R = Q.rule(part.id);
  const how = `${R.climb === 1 ? "One clean run" : `${R.climb} clean in a row`} moves you up. At the top, ${R.pass[0]} clean of your last ${R.pass[1]} passes${part.top === 4 ? ", with a trap among them" : ""}.`;
  return `<span class="ladder" title="${how}">${L.map((n) => `<i class="${n < at ? "done" : n === at ? "on" : ""}">${Q.tierName(part.id, n)}</i>`).join("")}</span>`;
}
// a case's name already starts with its label ("Case C: the welcome code")
const ttl = (part) => part.name.startsWith(part.label) ? part.name : `${part.label} · ${part.name}`;
const revBtn = () => { if (SQ.mode !== "lesson") return ""; const n = dueNow().length; return n ? `<button class="x rev" id="rev" type="button" title="Steps you passed, due for review today. Real days, not game days.">Review · ${n} due</button>` : ""; };
// today's lesson, open again from a request (Brent, 2026-10-27). Mid-request it shows the example, so it counts as a peek
const lessonBtn = () => SQ.view === "lesson" && SQ.back ? `<button class="x" id="backreq" type="button">Back to the request · Enter</button>` : SQ.mode === "lesson" && SQ.view === "rep" && SQ.rep ? `<button class="x" id="seelesson" type="button" title="${SQ.done || SQ.rep.practice || SQ.peek || ["guided", "hinted"].includes(SQ.rep.mode) ? "Free right now." : "Mid-request it counts as a peek, like Tab. Free between requests."}">See the lesson again</button>` : "";
const header = (t) => `<header><b>Frank Mallory's desk</b><span class="tool">SQL · ${t}</span><span class="sp"></span>${lessonBtn()}${revBtn()}${FULL}<button class="x" id="close" type="button">Step away · Esc</button></header>`;
function resultHTML(o, cap = 15, stamp = "") {
  if (!o) return "";
  if (o.err) return `<div class="res"><div class="err">${esc(o.err)}</div></div>`;
  const rows = o.rows.slice(0, cap);
  return `<div class="res${stamp ? " stamped" : ""}">${stamp ? `<span class="stamp ${stamp === "CLOSED" ? "closed" : ""}">${stamp}</span>` : ""}<table><tr>${o.cols.map((c) => `<th>${esc(c)}</th>`).join("")}</tr>${rows.map((r) => `<tr>${r.map((v) => `<td>${esc(typeof v === "number" && !Number.isInteger(v) ? +v.toFixed(2) : v)}</td>`).join("")}</tr>`).join("")}</table>
    <div class="cnt">${o.rows.length.toLocaleString()} row${o.rows.length === 1 ? "" : "s"}${o.rows.length > cap ? `, first ${cap} shown` : ""}</div></div>`;
}
// the tables this request uses, open; the rest fold into chips he can open (the new-board step shows every card)
function shownTables() {
  const all = Object.keys(Q.tablesFor(act())), t = SQ.rep; if (!t || SQ.view !== "rep" || act() === "newboard") return all;
  // a step: the part he types. A sum carried from earlier steps reads no table, so it keeps the chain's tables up
  const c = cur(); let used = Q.tablesIn((c && (c.show || c.sql)) || t.show || t.sql || "");
  if (!used.length && t.steps && !SQ.stages.length) used = Q.tablesIn(t.steps.map((x) => x.show || x.sql).join(" "));
  return used.length || SQ.stages.length ? all.filter((x) => used.includes(x) || SQ.unfold.includes(x)) : all;
}
const cardsHTML = () => { const open = shownTables(), folded = Object.keys(Q.tablesFor(act())).filter((x) => !open.includes(x));
  return `<div class="cork ${Q.isBig(act()) ? "big" : ""}"><button class="pop" id="popboard" type="button" title="Float the board in its own small window">${BOARD ? "⧉ Bring it back" : "⧉ Pop out"}</button><svg class="strings" id="strings"></svg>${SQ.stages.map((x) =>
  `<div class="bcard stage" id="bcard-${x.name}"><span class="pin"></span><h4>${esc(x.name)} <small>stage</small></h4><ul>${x.cols.map((c) => `<li data-c="${esc(c)}">${esc(c)}</li>`).join("")}</ul><div class="bsmall">${x.n} rows · ${esc(x.does)}</div></div>`).join("")}${Object.entries(Q.tablesFor(act())).filter(([t]) => open.includes(t)).map(([t, v], i) =>
  `<div class="bcard ${i % 2 ? "b2" : ""}" id="bcard-${t}"><span class="pin"></span><h4>${t}</h4><ul>${Q.colsFor(t, act()).map(([c, ty]) => `<li data-c="${c}">${c}<i>${ty}</i></li>`).join("")}</ul><div class="bsmall">${v.note}</div></div>`).join("")}${folded.length ? `<div class="folded">${folded.map((x) => `<button type="button" class="tchip" data-unfold="${x}" title="Not in this request. Click to pin it up anyway.">${x}</button>`).join("")}</div>` : ""}</div>`; };
const noirHTML = (title, line) => `<div class="col noircol"><div class="panel"><canvas id="noir" width="160" height="90"></canvas></div><div class="dbub"><div class="ctitle">${esc(title)}</div><div class="dsay" id="dsay"></div><div class="dname">F. MALLORY · DATA DETECTIVE</div></div></div>`;
// what's left on this step: "N more clean to move up", and at the top the runs the pass rule reads as pips
function toGoHTML(part, st) {
  const g = Q.toGo(part.id, st); if (!g) return "";
  const R = Q.rule(part.id), pips = g.top ? `<span class="pips" title="Your last ${g.size} runs at the top without help. ${R.pass[0]} clean, ending on a clean one, passes.">${[...Array(g.size)].map((_, i) => `<i class="${i < g.slots.length ? (g.slots[i] ? "g" : "b") : ""}"></i>`).join("")}</span>` : "";
  return `${pips}<span class="togo">${g.need} more clean ${g.top ? "to pass" : "to move up"}${g.trap ? (part.kind === "pipe" ? ", one from the brief" : ", one a trap") : ""}</span>`;
}
function sqlDraw() {
  const id = act(), part = id && Q.PART[id];
  if (SQ.view === "recap") {   // previously at Fernhill
    const rows = SQ.queue.map((x) => { const last = (O.sql._srs && O.sql._srs[x] && O.sql._srs[x].seen) || O.sql[x].last, d = last ? Q.daysBetween(last, TODAY()) : 0;
      return `<li><b>${esc(Q.PART[x].label)} · ${esc(Q.PART[x].name)}</b> <small>last touched ${d} days ago</small></li>`; }).join("");
    const today = Q.PART[SQ.recapFor];
    sheet().innerHTML = header("Previously at Fernhill") + `<div class="body one"><div class="main"><div class="scene">${noirHTML("Previously at Fernhill", "")}<div class="col lessoncol"><div class="qn">Before today's ${today.kind === "pipe" ? "pipeline" : "step"}</div><div class="word">${esc(today.name)}</div>
      <p>Today's work leans on ${SQ.queue.length === 1 ? "a part" : "parts"} you haven't touched in a while. One request each, then the lesson.</p><ul class="lines">${rows}</ul></div></div>
      <div class="acts"><button class="go" id="next" type="button">Warm up <span class="kbd">Enter</span></button><button class="x" id="skip" type="button">Skip to the lesson</button></div></div></div>`;
    $("close").onclick = closeDesk; $("next").onclick = () => { SQ.view = "rep"; newRep(); sqlDraw(); }; $("skip").onclick = endRecap;
    typeLine("Previously at Fernhill. You'll need these today. Let's see if they're still sharp."); grab(); return;
  }
  if (SQ.view === "revdone") {
    const next = Object.values(O.sql._srs || {}).map((c) => c.due).sort()[0];
    sheet().innerHTML = header("Review") + `<div class="body one"><div class="main"><div class="scene">${noirHTML("The files", "")}<div class="col lessoncol"><div class="qn">Review done</div><div class="word">${SQ.revN} reviewed</div>
      <div class="sumrow"><div><b>${SQ.revN}</b><span>requests</span></div><div><b>${SQ.revClean}</b><span>clean, no help</span></div></div>
      <p>${next ? `Next review due ${esc(Q.nice(next))}. ` : ""}A clean one waits longer next time (3, 8, 20, then 50 days). A miss comes back tomorrow.</p></div></div>
      <div class="acts"><button class="go" id="next" type="button">${lessonId("sql") ? "Back to today's step" : "Back to the office"} <span class="kbd">Enter</span></button></div></div></div>`;
    $("close").onclick = closeDesk; $("next").onclick = () => { SQ.mode = "lesson"; SQ.part = lessonId("sql"); if (!SQ.part) return closeDesk(); SQ.view = sqlSt(SQ.part).reps.length ? "rep" : "lesson"; if (SQ.view === "rep") newRep(); sqlDraw(); };
    typeLine(SQ.revClean === SQ.revN ? "Every file still holds. Good. The ones you don't touch are the ones that rot." : "A couple of those had gone soft. They'll be back tomorrow. That's the point."); grab(); return;
  }
  if (SQ.view === "later") {
    sheet().innerHTML = header("Nothing new") + `<div class="body one"><div class="main"><div class="scene">${noirHTML("Not written yet", "")}</div>
      <p class="later">You've passed every SQL step Frank has written so far, all ${Q.PARTS.length} of them, up to ${esc(Q.PARTS.at(-1).name)}. The next one, ${esc(Q.LATER[0])}, isn't written yet, so today's SQL counts as done.</p>
      <button class="go" id="next" type="button">Back to the office <span class="kbd">Enter</span></button>${dueNow().length ? `<button class="x" id="rev" type="button">Review · ${dueNow().length} due</button>` : ""}</div></div>`;
    $("close").onclick = closeDesk; $("next").onclick = closeDesk; typeLine("That case file's still in the typewriter, kid. Come back when it isn't."); grab(); return;
  }
  const st = sqlSt(part.id);
  if (SQ.view === "lesson") {
    const L = part.lesson, R = Q.rule(part.id), o = L.owner && (part.owner || (part.tpl[0](Q.rng(1)).who)), climb = Q.levels(part.id).map((n) => Q.tierName(part.id, n).toLowerCase()).join(", then ");
    const plan = part.kind === "case" ? `Up to three runs: ${climb}. One clean run moves you to the next, and a miss means another run at the same level. A clean solo run closes the case${part.gate ? ` and opens ${part.gate}` : ""}.`
      : `${R.practice ? `Next: ${R.practice} practice requests with the example beside you. Then the` : "The"} requests climb: ${climb}. ${R.climb === 1 ? "One clean" : "Two clean in a row"} moves you up.`;
    const shown = L.build ? `<div class="qn">Built up one step at a time</div>${L.build.map(([note, q]) => `<div class="bstep"><small>${esc(note)}</small><div class="example">${esc(q)}</div>${resultHTML(run(q), 4)}</div>`).join("")}`
      : `<div class="qn">An example, on Fernhill's tables</div><div class="example big">${esc(L.example)}</div>${resultHTML(run(L.example), 8)}`;
    sheet().innerHTML = header(ttl(part)) + `<div class="body"><div class="main">
      <div class="scene">${noirHTML(`${part.label}: ${part.name}`, L.frank)}<div class="col lessoncol"><div class="qn">${part.kind === "case" ? "The case" : part.kind === "metric" ? "Today's number" : part.kind === "pipe" ? "Today's pipeline" : "Today's new word"}</div><div class="word">${esc(part.word)}</div>
        <ul class="lines">${L.lines.map((l) => `<li>${l}</li>`).join("")}</ul></div></div>
      ${o && CAST[o] ? `<div class="ownersay">${pf(o, "calm", 40)}<div><b>${CAST[o].name}</b> <small>· ${ROLE[o]}</small><p>${esc(L.owner)}</p></div></div>` : ""}
      ${shown}</div>
      <div class="side">${cardsHTML()}<p class="done">${plan} The example and Frank's casebook hide behind <span class="kbd dk">Tab</span>.</p>
        <button class="go" id="next" type="button">${SQ.back ? "Back to the request" : part.kind === "case" ? "Open the case" : R.practice ? "Start practice" : "Start"} <span class="kbd">Enter</span></button></div></div>`;
    $("close").onclick = closeDesk; $("next").onclick = () => { SQ.view = "rep"; if (SQ.back) SQ.back = false; else newRep(); sqlDraw(); }; if ($("backreq")) $("backreq").onclick = () => $("next").click();
    typeLine(part.lesson.frank); glow(part.lesson.example); requestAnimationFrame(() => stringUp(false)); grab(); return;
  }
  if (SQ.view === "pass") {
    const ok = st.reps.filter((r) => r.ok).length;
    sheet().innerHTML = header(ttl(part)) + `<div class="body one"><div class="main"><div class="scene">${noirHTML("Case closed", "")}<div class="col lessoncol"><div class="qn">${part.kind === "case" ? `Case closed${part.gate ? `. ${part.gate} is open` : ""}` : `${part.kind === "metric" ? "Step" : "Part"} passed`}</div><div class="word">${esc(part.name)}</div>
      <div class="sumrow"><div><b>${st.reps.length}</b><span>requests</span></div><div><b>${ok}</b><span>right</span></div><div><b>${st.reps.filter((r) => r.clean && !r.help).length}</b><span>clean, no help</span></div></div></div></div>
      <div class="acts"><button class="go" id="next" type="button">Back to the office <span class="kbd">Enter</span></button><button class="x" id="more" type="button">Keep practising</button></div></div></div>`;
    $("close").onclick = closeDesk; $("next").onclick = closeDesk; $("more").onclick = () => { SQ.view = "rep"; newRep(); sqlDraw(); };
    typeLine(`${part.name}. Yours now. Nobody can take that off you, not even the auditors.`); grab(); return;
  }
  // a request
  const t = SQ.rep, c = cur(), chain = !!t.steps, who = t.who in CAST ? t.who : "dana", face = SQ.done ? (SQ.ok ? "smile" : "worried") : SQ.fb || SQ.subFail ? "worried" : "calm";
  const said = SQ.done ? (SQ.ok ? echo(SQ.out, st.reps.length) : "Hmm. That's not quite what I needed.") : t.ask;
  const firstTrap = SQ.mode === "lesson" && t.tier === 4 && part.kind !== "pipe" && !st.reps.some((x) => x.tier === 4);
  const frank = SQ.done && SQ.ok ? closer(part, st.reps.length) : SQ.slipped && !SQ.done ? "A typo. Everybody fat-fingers one. Look where it's marked." : SQ.fb || SQ.subFail || (SQ.done && !SQ.ok) ? STUMPED[st.reps.length % STUMPED.length]
    : t.kind === "extend" ? t.hint : chain && t.mode === "guided" && c.hint ? c.hint
    : t.kind === "predict" ? "Don't run it. Read it. Count what's left after each step, in the order SQL runs it."
    : t.kind === "fill" ? "One piece is missing. Find the words in the request that name it."
    : SQ.mode === "review" ? "From the files. You closed this one a while back. Let's see if it stuck."
    : SQ.mode === "recap" ? "Previously at Fernhill. You'll want this one sharp today."
    : firstTrap ? "This one's got a catch, kid. It'll run. It'll give you rows. They'll be the wrong rows." : part.lesson.frank;
  const name = CAST[who].name;
  const kindNote = t.kind === "extend" ? `<div class="guide"><b>${t.intro ? "First look." : "New angle."}</b> ${esc(t.hint)} The query in the box answers part of it. Add the rest. The colours show which words become which clause.</div>`
    : t.kind === "fix" ? (t.tier === 4 && t.foreign ? `<div class="guide"><b>A first try at the SQLite version</b> is in the box. It runs, but the rows are wrong for the request. Fix it.</div>`
      : t.tier === 4 ? `<div class="guide"><b>${name}'s query</b> is in the box. It runs, but the rows are wrong for the request. Fix it.</div>`
      : `<div class="guide"><b>Scrambled.</b> Every clause is there, in the wrong order. Put them in the order SQL needs.</div>`)
    : t.kind === "fill" ? `<div class="guide"><b>Fill the blank.</b> Replace <code>____</code> with the missing piece, then run it.</div>`
    : t.kind === "predict" ? `<div class="guide"><b>Predict.</b> Read the query, then type one number. It runs after you answer.</div>`
    : t.mode === "pinned" ? `<div class="guide"><b>Pinned.</b> You built ${t.steps.filter((s) => s.given).map((s) => `<code>${s.stage}</code>`).join(", ")} clean before, so ${t.steps.filter((s) => s.given).length > 1 ? "they're" : "it's"} on the board. Type the rest: any new stages as <code>name AS ( … )</code>, then the final SELECT.</div>`
    : chain && part.kind === "pipe" ? `<div class="guide"><b>Pipeline${t.mode === "guided" ? ", one stage blank" : ", stage by stage"}.</b> For a stage, type only its query: the desk wraps it as <code>name AS ( … )</code> after the stages above and pins its rows to the board. The final SELECT reads the stages. ${t.mode === "hinted" ? "Tab shows each step's clauses, free." : ""}</div>`
    : t.plan ? `<div class="guide"><b>From the plan.</b> Write the whole query: <code>WITH</code> each stage on the plan, in order, then the final SELECT. Run a stage alone first if it helps: <code>WITH v AS ( … ) SELECT * FROM v</code>.</div>`
    : part.kind === "pipe" ? `<div class="guide"><b>From the brief.</b> ${SQ.myPlan ? "Now write the whole WITH query, stage by stage as you planned." : "First the plan: one line per stage, a name and what one row is (<code>per: one row per buyer</code>), the final SELECT last. Shift+Enter for a new line, Enter when it's done."}</div>`
    : chain ? `<div class="guide"><b>${t.mode === "guided" ? (part.kind === "case" ? MODE_NOTE.guided : "Guided. Each step has a hint, and each answer feeds the next.") : t.mode === "hinted" ? MODE_NOTE.hinted : part.kind === "case" ? MODE_NOTE.solo : "On your own. Each answer feeds the next."}</b></div>` : "";
  const tagsOn = t.mode === "guided" || SQ.peek;
  const chainHTML = chain ? `<ol class="chain">${t.steps.map((s, i) => { const state = i < SQ.sub ? "done" : i === SQ.sub ? "on" : "todo";
    return `<li class="${state}${s.given ? " given" : ""}"><span>${esc(s.ask)}</span>${s.given ? `<div class="example">${esc(s.show)}</div>` : ""}${state === "on" && tagsOn ? clauseTags(s.show || s.sql) : ""}${state === "on" && t.mode === "guided" && s.hint ? `<small class="hint">${esc(s.hint)}</small>` : ""}${state === "done" && SQ.subs[i] ? `<div class="mini">${resultHTML(SQ.subs[i].out, 6)}</div>` : ""}</li>`; }).join("")}</ol>` : "";
  const showEx = t.practice || SQ.peek || t.mode === "guided", n = st.reps.length + (SQ.done ? 0 : 1), free = t.mode === "guided" || t.mode === "hinted";
  const ask = chain ? chainHTML : `<div class="ask"><b>${t.kind === "extend" ? markedAsk(t) : esc(t.ask)}</b></div>${t.plan ? `<ol class="plan">${t.plan.map(([n, d]) => `<li><code>${esc(n)}</code> ${esc(d)}</li>`).join("")}</ol>` : ""}`;
  const locked = SQ.done || SQ.subFail, outLabel = SQ.subFail ? "What that step wanted" : SQ.done && !SQ.ok && t.kind === "predict" ? "What the request wanted" : t.kind === "predict" ? "When it runs" : "Your result";
  // a pipeline from the brief opens with a typed plan (batch 5)
  const needPlan = part.kind === "pipe" && !chain && !t.plan && t.kind === "write" && !SQ.myPlan && !SQ.done;
  const missed = !!SQ.tries || (SQ.done && !SQ.ok), stamp = SQ.done && SQ.ok ? (part.kind === "case" ? "CLOSED" : "MATCH") : "";
  const replay = (SQ.wrongQ && replayOn(part.id) ? replayHTML(SQ.wrongQ, c.sql) : "") + (t.kind === "predict" && SQ.done ? replayHTML(null, t.show) : "");
  const verdict = SQ.subFail ? `<div class="fb bad"><b>Here's that step.</b> ${esc(SQ.why || "")}<div class="example">${esc(c.sql)}</div><small>Its rows are below. Carry on with them.</small></div>
      <button class="go" id="next" type="button">Carry on <span class="kbd">Enter</span></button>`
    : SQ.done ? `<div class="fb ${SQ.ok ? "good" : "bad"}"><b>${SQ.ok ? (chain ? "Every step right." : t.kind === "predict" ? "Right number." : "Right rows.") : t.kind === "predict" ? "Here's the number." : "Typed right."}</b> ${SQ.ok ? (SQ.swapped ? "Your columns came in a different order. Fine here. The request's order is the usual habit. " : "") + (SQ.tries || !SQ.subClean ? (t.kind === "predict" ? "Right, on the second try." : "Right, after a miss. A twin of it comes next.") : "Clean.") + (SQ.climbed ? ` <b class="up">Up a tier: ${Q.tierName(part.id, SQ.climbed)}.</b>` : "")
        : t.kind === "predict" ? esc(SQ.why || "") : "It counts as a miss. A twin of it comes next, and it comes back once more later."}${!SQ.ok && t.kind === "predict" ? `<div class="example">${esc(t.show)}</div>` : ""}${t.trap ? `<div class="trapwhy"><b>The catch:</b> ${t.trap}</div>` : ""}${SQ.ok && part.kind === "case" ? `<div class="closed"><b>Case closed.</b> ${esc(answerOf(SQ.out))}</div>` : ""}</div>
      <button class="go" id="next" type="button">Next <span class="kbd">Enter</span></button>`
    : `<p class="done"><span class="kbd dk">Enter</span> runs it. <span class="kbd dk">Shift</span>+<span class="kbd dk">Enter</span> for a new line.</p>
      ${SQ.slipped ? `<div class="fb slip"><b>A typo, not a miss.</b> ${SQ.fb}${SQ.slip ? `<div class="example">${markSnip(SQ.text, SQ.slip)}</div>` : ""}${SQ.habit ? `<small>${esc(SQ.habit)}</small>` : ""}</div>` : ""}
      ${t.kind === "predict" ? (SQ.fb && !SQ.slipped ? `<div class="fb bad">${SQ.fb} <small>Try ${SQ.tries + 1} of 2.</small></div>` : "")
        : SQ.tries ? `${SQ.guessing || SQ.hint ? "" : `<div class="fb bad">${SQ.fb}</div>`}${ladderHTML(t, c)}${SQ.guessing ? "" : hintButton()}` : ""}
      ${SQ.shaky ? `<p class="shaky">${esc(SQ.shaky)}</p>` : ""}
      ${SQ.sleepy ? `<div class="fb bad"><b>Ten misses on this one today.</b> Frank: "Sleep on it, kid." Tomorrow it opens with the worked example. <div class="row"><button type="button" id="stopday">Stop for today</button> <button type="button" id="keepgoing">Keep going</button></div></div>` : ""}`;
  const revQn = SQ.mode === "lesson" ? "" : `${SQ.mode === "review" ? "Review" : "Previously at Fernhill"} ${Math.min(SQ.revN + 1, SQ.revTotal)} of ${SQ.revTotal} · ${esc(part.label)} · ${esc(part.name)}`;
  sheet().innerHTML = header(`${SQ.mode === "review" ? "Review · " : ""}${ttl(part)}`) + `<div class="body"><div class="main">
      <div class="scene"><div class="col"><div class="panel corpimg">${pf(who, face, 84).replace('class="pix"', 'class="pix inpanel"')}</div>
          <div class="cbub ${SQ.done ? (SQ.ok ? "react" : "puzzled") : SQ.fb ? "puzzled" : ""}"><div class="cwho">${name} <small>· ${ROLE[who]}</small></div>${esc(said)}</div></div>
        ${noirHTML(revQn ? (SQ.mode === "review" ? "From the files" : "Previously") : t.practice ? "Practice" : chain ? `${t.mode === "pinned" ? "Request" : part.kind === "case" || part.kind === "pipe" ? "Run" : "Chain"} ${n}` : `Request ${n}`, frank)}</div>
      <div class="qn">${revQn ? `${revQn}${chain ? ` · step ${Math.min(SQ.sub + 1, t.steps.length)} of ${t.steps.length}` : ""}` : t.practice ? `Practice ${n} of ${Q.rule(part.id).practice} · the example is on the right` : chain ? `${t.mode === "pinned" ? "Request" : part.kind === "case" || part.kind === "pipe" ? "Run" : "Chain"} ${n} · step ${Math.min(SQ.sub + 1, t.steps.length)} of ${t.steps.length}` : `Request ${n}`} ${t.practice || revQn ? "" : ladder(part, st) + toGoHTML(part, st)}</div>
      ${ask}${SQ.done ? "" : kindNote}${t.kind === "predict" ? `<div class="example">${esc(t.show)}</div>` : ""}${t.foreign ? `<div class="example foreign"><small>${esc(t.foreign[0])}</small>${esc(t.foreign[1])}</div>` : ""}
      ${needPlan ? `<textarea class="sql plan" id="planbox" spellcheck="false" autocomplete="off" placeholder="per: one row per buyer&#10;final: one row per tier">${esc(SQ.planText || "")}</textarea>${SQ.planWhy ? `<div class="fb bad">${SQ.planWhy}</div>` : ""}` : `${SQ.myPlan ? `<div class="qn">Your plan</div><ol class="plan">${SQ.myPlan.map(([n, d]) => `<li><code>${esc(n)}</code> ${esc(d)}</li>`).join("")}</ol>` : ""}<textarea class="sql" id="sql" spellcheck="false" autocomplete="off" placeholder="${t.kind === "predict" ? "a number" : c.stage ? `SELECT … (the inside of ${c.stage} AS ( … ))` : c.final ? "the final SELECT …" : "SELECT …"}" ${locked ? "disabled" : ""}>${esc(SQ.text)}</textarea>`}
      ${needPlan ? "" : `<div class="verdict">${verdict}</div>`}
      ${missed ? replay : ""}${SQ.out ? `<div class="qn">${outLabel}</div>` : ""}${resultHTML(SQ.out, missed ? 5 : 15, stamp)}${missed ? "" : replay}</div>
    <div class="side">
      ${cardsHTML()}
      ${showEx ? `<div class="guide"><b>The example.</b> ${part.lesson.lines[0]}<div class="example">${esc(part.lesson.example)}</div><small>For a different request. Swap in what this one asks for.</small></div>${casebookHTML(part.id)}`
        : `<p class="done peek"><span class="kbd dk">Tab</span> peeks at the example and Frank's casebook${chain ? ", and names this step's clauses" : ""}. ${free ? "Free on this run." : "A peek counts as help, so this one won't count toward the climb."}</p>`}</div></div>`;
  $("close").onclick = closeDesk;
  if ($("seelesson")) $("seelesson").onclick = () => { if (!SQ.done && !t.practice && !free) SQ.peek = true; SQ.back = true; SQ.view = "lesson"; sqlDraw(); };
  typeLine(frank); requestAnimationFrame(() => stringUp(SQ.ok)); glow(SQ.text || "");
  const pb = $("planbox");
  if (pb) { pb.focus(); pb.setSelectionRange(pb.value.length, pb.value.length); pb.oninput = () => { SQ.planText = pb.value; };
    pb.onkeydown = (e) => { if (e.key === "Escape") { pb.blur(); grab(); return; } if (e.key !== "Enter" || e.shiftKey) return; e.preventDefault();
      const c = Q.checkPlan(pb.value); if (c.ok) { SQ.myPlan = c.stages; SQ.planWhy = ""; tone(660, 0.05, "triangle", 0.03); } else { SQ.planWhy = c.why; shake(); } sqlDraw(); }; }
  const ta = $("sql");
  const grow = () => { if (!ta) return; ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight + 2, 420) + "px"; }; grow();
  if (ta && !locked) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
    ta.oninput = () => { SQ.text = ta.value; glow(ta.value); grow(); if (Math.random() < 0.5) tone(880 + Math.random() * 200, 0.015, "square", 0.008); };
    ta.onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sqlRun(); } else if (e.key === "Escape") { ta.blur(); grab(); }
      else if (e.key === "Tab" && e.shiftKey) { e.preventDefault(); openHint(); }
      else if (e.key === "Tab") { e.preventDefault(); if (!t.practice && !SQ.peek) { SQ.peek = true; sqlDraw(); } } }; }
  const nx = $("next"); if (nx) { nx.onclick = SQ.subFail ? chainOn : sqlNext; grab(); }
  const hb = $("hint"); if (hb) hb.onclick = openHint;
  sheet().querySelectorAll("[data-unfold]").forEach((b) => b.onclick = () => { SQ.unfold.push(b.dataset.unfold); sqlDraw(); });
  sheet().querySelectorAll("[data-where]").forEach((b) => b.onclick = () => pickWhere(b.dataset.where));
  if ($("stopday")) $("stopday").onclick = closeDesk;
  if ($("keepgoing")) $("keepgoing").onclick = () => { SQ.sleepy = false; sqlDraw(); };
}
let typer = 0;
function typeLine(text) {   // Frank types his line out, once per line
  const el = $("dsay"); if (!el) return;
  if (SQ.typed === text) { el.textContent = text; return; }
  SQ.typed = text; clearInterval(typer); let i = 0; el.textContent = "";
  typer = setInterval(() => { el.textContent = text.slice(0, ++i); if (i % 3 === 0) tone(1400 + Math.random() * 300, 0.012, "square", 0.006); if (i >= text.length) clearInterval(typer); }, 18);
}
// o.amount lights orders.amount only; a bare name lights every card with it; a folded table lights its chip
function glow(q) {
  const { qual, bare } = Q.pointsAt(q);
  sheet().querySelectorAll(".bcard").forEach((card) => { const t = card.id.slice(6); card.querySelectorAll("li").forEach((li) => li.classList.toggle("glow", bare.has(li.dataset.c) || qual.has(`${t}.${li.dataset.c}`))); });
  sheet().querySelectorAll(".tchip").forEach((b) => b.classList.toggle("glow", bare.has(b.dataset.unfold)));
}
function stringUp(tight, doc = document) {   // the red strings: each key on the board to the column it points at (sql.mjs linksFor)
  const svg = doc.getElementById("strings"); if (!svg || !svg.parentElement.offsetParent) return;
  const B = svg.parentElement.getBoundingClientRect(), row = (t, c) => { const e = doc.querySelector(`#bcard-${t} li[data-c="${c}"]`); return e && e.getBoundingClientRect(); };
  svg.setAttribute("class", "strings" + (tight ? " hot" : ""));
  svg.innerHTML = Q.linksFor(act()).map(([ft, fc, tt, tc]) => {
    const a = row(ft, fc), b = row(tt, tc); if (!a || !b) return "";
    // the pair of row edges closest together, so a string doesn't cross its own card
    const [x1, x2] = [[a.left, b.left], [a.left, b.right], [a.right, b.left], [a.right, b.right]].sort((p, q) => Math.abs(p[0] - p[1]) - Math.abs(q[0] - q[1]))[0].map((x) => x - B.left);
    const y1 = a.top + a.height / 2 - B.top, y2 = b.top + b.height / 2 - B.top, bow = (tight ? 6 : 26) * (x1 === x2 ? 1 : 0.6);
    const cx = (x1 + x2) / 2 + (Math.abs(x1 - x2) < 40 ? (x1 < B.width / 2 ? -bow * 2 : bow * 2) : 0), cy = (y1 + y2) / 2 + bow;
    return `<path d="M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}"/><circle cx="${x1}" cy="${y1}" r="3"/><circle cx="${x2}" cy="${y2}" r="3"/>`;
  }).join("");
}
// a wrong query (SQL-MISSES.md): a slip is pointed at and never counts; a concept miss opens the hint ladder, and the
// request only ends on a right query (typed from the answer if it came to that)
const TRY0 = () => ({ slipped: false, shaky: "", text: "", out: null, tries: 0, fb: "", hint: 0, avail: 0, diag: null, revealed: false, slip: null, guessing: false, guess: null, wrongQ: null, habit: "", sleepy: false });
const HABIT = { quotes: "Close every quote the moment you open it.", commas: "Read the column list back: a comma between each, none after the last.", brackets: "Type the ) as soon as you type the (.",
  names: "Glance at the card before you type a name.", capitals: "Copy values the way the data spells them.", other: "Slow down on the last few characters." };
const HINT_LABEL = ["Hint: where it went wrong", "Hint: how to check it", "Hint: the piece that's off", "Show me the answer"];
// from Unit D on, he names where it went wrong before the desk says (the checklist as his own habit)
const selfCheck = () => Q.PARTS.findIndex((p) => p.id === SQ.part) >= Q.PARTS.findIndex((p) => p.id === "case");
const twinCheck = (x) => { try { const w = run(x.sql); if (!w.rows.length) return false; if (!x.bad) return true; let b; try { b = run(x.bad); } catch (e) { return true; } return !Q.grade(b, w, x.ordered).ok; } catch (e) { return false; } };
function slipped(q, s) {
  const k = Q.slipKind(s.say), n = Q.slipCount(O.sql, k, TODAY());
  Object.assign(SQ, { slipped: true, fb: s.say, slip: s.at ? q.slice(...s.at) : null, habit: n === 3 ? `Third ${k === "other" ? "" : k + " "}slip today. ${HABIT[k]}` : "" });
  save(); SND.wrong(); sqlDraw(); shake();
}
function openHint() {
  if (SQ.done || !SQ.tries || SQ.hint >= 4 || SQ.hint >= SQ.avail) return;
  SQ.hint++; if (SQ.hint === 4) SQ.revealed = true;
  const rep = SQ.rep, sub = SQ.sub; clearTimeout(SQ.unlockT);
  // the next rung opens after another try or 20 seconds of looking at this one (racing to the answer cuts learning)
  if (SQ.hint < 4) SQ.unlockT = setTimeout(() => { if (SQ.rep === rep && SQ.sub === sub && !SQ.done && SQ.avail <= SQ.hint) { SQ.avail = SQ.hint + 1; if (G.desk === "sql") sqlDraw(); } }, 20000);
  sqlDraw();
}
function pickWhere(item) { SQ.guess = item; SQ.guessing = false; SQ.avail = Math.max(SQ.avail, 1); SQ.hint = Math.max(SQ.hint, 1); sqlDraw(); }
function sqlRun() {
  if (SQ.subFail) return chainOn();
  const t = SQ.rep, c = cur(), typed = SQ.text.trim(); if (!typed || SQ.done || SQ.guessing) return;
  const q = c.stage || c.final ? Q.assemble(c, typed) : typed;   // a pipeline stage runs with the stages before it
  const st = sqlSt(t.part), want = run(c.sql), last = lastStep(t);
  SQ.slip = null; SQ.habit = "";
  if (t.kind === "predict") return predictRun(t, c, q, st, want);
  let mine;
  try { mine = run(q); } catch (e) { const err = String(e.message || e); SQ.out = { err }; return slipped(q, Q.findSlip(q, err) || { say: Q.slip(q, err) }); }
  let g = Q.grade(mine, want, c.ordered, c.tol), hidden = false;
  // a slip that still runs: a value one letter off, a missing comma. Never a try
  if (!g.ok) { const s = Q.findSlip(q, null); if (s && s.at) { SQ.out = mine; return slipped(q, s); } }
  const style = Q.slip(q); if (g.ok && style) { SQ.out = mine; return slipped(q, { say: style }); }
  // the grown shop: the same query must also be right on the hidden shop, unless it carries typed numbers
  if (g.ok && Q.isBig(t.part) && !c.carry) { let h; try { h = Q.gradeHidden(runIn(DBH, q), runIn(DBH, c.sql), c.ordered, c.tol, /\bLIMIT\b/i.test(c.sql)); } catch (e) { h = { ok: false, why: e.message }; }
    if (!h.ok) { g = { ok: false, why: `Right on these rows, wrong on next month's export (a second shop the desk checks too): ${h.why} A query that fits these rows by luck breaks on new ones.` }; hidden = true; } }
  if (!g.ok) return conceptMissed(t, c, q, mine, g, hidden, st);
  SND.right(); Object.assign(SQ, { out: mine, swapped: g.swapped, wrongQ: null, fb: "" });
  if (SQ.tries || SQ.hint) SQ.subClean = false;
  if (SQ.revealed) SQ.subMiss = true;
  if (t.steps) { SQ.subs.push({ out: mine }); pinStage(c, mine); }
  if (!last) { Object.assign(SQ, TRY0(), { sub: SQ.sub + 1 }); skipGiven(); return sqlDraw(); }
  SQ.done = true; SQ.ok = !SQ.subMiss; SQ.sub++; skipGiven();
  const clean = SQ.ok && SQ.subClean;
  // the clause set, and (clean only) the long WITH stages he built: a later metric Write pins those
  O.sql._seen = [...new Set([...(O.sql._seen || []), t.set, ...(clean && t.kind === "write" ? Q.stageKeys(t.sql) : [])])];
  if (SQ.mode !== "lesson") { reviewDone(clean && !isHelp(t)); return sqlDraw(); }
  const { justPassed, climbed } = Q.record(st, t, SQ.ok, clean, isHelp(t), TODAY());
  if (justPassed) { SQ.justPassed = true; (O.sql._srs = O.sql._srs || {})[t.part] = Q.newCard(TODAY()); }
  save(); SQ.climbed = climbed;
  return sqlDraw();
}
function conceptMissed(t, c, q, mine, g, hidden, st) {
  SND.wrong(); Object.assign(SQ, { out: mine, wrongQ: q, slipped: false });
  if (SQ.revealed) { SQ.fb = "Not yet. The answer is under the box: type it, or fix yours until it matches."; sqlDraw(); shake(); return; }
  SQ.tries++; SQ.avail = Math.min(4, SQ.avail + 1);
  let d = null; if (!hidden) try { d = Q.diagnose(q, c.sql, run, c.ordered); } catch (e) { d = null; }
  SQ.diag = d || { item: null, say: g.why, diff: Q.rowDiff(mine, run(c.sql)) };
  // the concept this miss marks: the clause the checklist stopped at, else the step itself
  const part = d && d.part && Q.PART[d.part] && Q.PARTS.findIndex((p) => p.id === d.part) <= Q.PARTS.findIndex((p) => p.id === t.part) ? d.part : t.part;
  t.missPart = part;
  if (SQ.tries === 1) { const res = Q.conceptMiss(O.sql, part, TODAY()); SQ.shaky = res === "noted" ? "" : `${Q.PART[part].name} has tripped you ${res === "refresher" ? "three times" : "twice"} this week. ${res === "refresher" ? "It's in today's review pile." : "It's due for review tomorrow."}`; }
  // ten misses in one step on one real day: Frank calls it
  st.missDay = st.missDay && st.missDay.d === TODAY() ? { d: TODAY(), n: st.missDay.n + 1 } : { d: TODAY(), n: 1 };
  if (st.missDay.n === 10) { SQ.sleepy = true; st.relesson = true; }
  if (SQ.tries === 1 && selfCheck() && SQ.diag.item) SQ.guessing = true;
  SQ.fb = g.why; save(); sqlDraw(); shake();
}
// a predict rep: one number, two tries, then the number and the query's replay
function predictRun(t, c, q, st, want) {
  const g = Q.gradeNumber(q, want);
  if (g.ok) { SND.right(); Object.assign(SQ, { out: run(t.show), done: true, ok: true }); const clean = SQ.tries === 0;
    if (SQ.mode !== "lesson") { reviewDone(clean); return sqlDraw(); }
    const { justPassed, climbed } = Q.record(st, t, true, clean, isHelp(t), TODAY()); if (justPassed) { SQ.justPassed = true; (O.sql._srs = O.sql._srs || {})[t.part] = Q.newCard(TODAY()); } save(); SQ.climbed = climbed; return sqlDraw(); }
  SQ.tries++; SND.wrong();
  if (SQ.tries >= 2) {
    if (SQ.mode !== "lesson") reviewDone(false); else { Q.record(st, t, false, false, isHelp(t), TODAY()); save(); }
    Object.assign(SQ, { done: true, ok: false, out: run(t.show), why: `It's ${want.rows[0][0]}.` }); sqlDraw(); shake(); return;
  }
  SQ.fb = g.why; sqlDraw(); shake();
}
// the ladder on screen: the checklist with where it went off, how to check it, the key's piece, the answer
const hintButton = () => SQ.hint >= 4 ? "" : `<button class="hintbtn" id="hint" type="button" ${SQ.hint < SQ.avail ? "" : "disabled"}>${HINT_LABEL[SQ.hint]} <span class="kbd dk">Shift</span>+<span class="kbd dk">Tab</span></button>${SQ.hint < SQ.avail ? "" : "<small class=\"wait\"> The next hint opens after another try, or in a few seconds.</small>"}`;
const markSnip = (text, snip) => { const i = text.indexOf(snip); return i < 0 ? `<mark>${esc(snip)}</mark>` : `${esc(text.slice(0, i))}<mark>${esc(snip)}</mark>${esc(text.slice(i + snip.length))}`; };
function ladderHTML(t, c) {
  const D = SQ.diag; if (!D) return "";
  const at = Q.CHECKS.findIndex(([k]) => k === D.item), name = (k) => (Q.CHECKS.find(([x]) => x === k) || [, k])[1];
  let h = "";
  if (SQ.guessing) return `<div class="fb bad">${SQ.fb}</div><div class="where"><b>Where did it go wrong?</b> Run the checklist in your head and pick the first thing that's off.
    <div class="picks">${Q.CHECKS.slice(1).map(([k, l]) => `<button type="button" data-where="${k}">${esc(l)}</button>`).join("")}</div></div>`;
  if (SQ.hint >= 1) {
    const guess = SQ.guess ? (SQ.guess === D.item ? `<p class="ok">You said <b>${esc(name(SQ.guess))}</b>. That's it.</p>` : `<p>You said <b>${esc(name(SQ.guess))}</b>. ${at > Q.CHECKS.findIndex(([k]) => k === SQ.guess) ? "That part checks out. It goes off later:" : "Something goes off before that:"}</p>`) : "";
    const list = at < 0 ? `<p>${D.say}</p>` : `<ol class="checks">${Q.CHECKS.map(([k, l], i) => i > at ? `<li class="todo">${esc(l)}</li>` : i < at ? `<li class="ok">${esc(l)}</li>` : `<li class="off"><b>${esc(l)}</b> ${D.say}</li>`).join("")}</ol>`;
    const span = D.clause && Q.clauseSpan(SQ.text, D.clause), mine = span ? `<div class="example">${esc(SQ.text.slice(0, span[0]))}<mark>${esc(SQ.text.slice(...span))}</mark>${esc(SQ.text.slice(span[1]))}</div>` : "";
    h += `<div class="rung"><small>Hint 1 · where it went wrong</small>${guess}${list}${mine}</div>`;
  }
  if (SQ.hint >= 2) {
    const tip = (D.item && Q.CHECK_TIP[D.item]) || "", own = c.hint || (t.kind === "extend" ? "" : t.hint) || "", df = D.diff;
    const rows = (rs) => rs.map((r) => `<tr>${r.map((v) => `<td>${esc(v == null ? "NULL" : String(v))}</td>`).join("")}</tr>`).join("");
    const diff = df && (df.nExtra || df.nMissing) ? `<table class="diff"><tr>${df.cols.map((x) => `<th>${esc(x)}</th>`).join("")}</tr>${df.extra.length ? `<tr><td colspan="${df.cols.length}" class="lab">Yours has, the ask doesn't (${df.nExtra})</td></tr>${rows(df.extra)}` : ""}${df.missing.length ? `<tr><td colspan="${df.cols.length}" class="lab">The ask has, yours doesn't (${df.nMissing})</td></tr>${rows(df.missing)}` : ""}</table>` : "";
    h += `<div class="rung"><small>Hint 2 · how to check it</small><p>${tip}</p>${own ? `<p>${esc(own)}</p>` : ""}${diff}</div>`;
  }
  if (SQ.hint >= 3) h += `<div class="rung"><small>Hint 3 · the piece that's off</small>${D.keyPiece ? `<p>The ask's version:</p><div class="example">${esc(D.keyPiece)}</div>` : "<p>No smaller piece to show here. The next hint is the answer.</p>"}</div>`;
  if (SQ.hint >= 4) h += `<div class="rung"><small>The answer</small><div class="example">${esc(c.show && (c.stage || c.final) ? c.show : c.sql)}</div><p>Type it, or fix yours to match. This one counts as a miss, and a twin of it comes next.</p></div>`;
  return h;
}
// after a missed chain step: its answer's rows stay on screen, and the next step opens
function chainOn() { SQ.subs.push({ out: SQ.out }); pinStage(cur(), SQ.out); Object.assign(SQ, TRY0(), { sub: SQ.sub + 1, subFail: false, why: "" }); skipGiven(); sqlDraw(); }
function endRecap() { (O.sql._recap = O.sql._recap || {})[SQ.recapFor] = TODAY(); save(); Object.assign(SQ, { mode: "lesson", queue: [], view: "lesson", part: lessonId("sql") }); sqlDraw(); }
function sqlNext() {
  if (SQ.mode !== "lesson") {
    if (SQ.queue.length) { newRep(); return sqlDraw(); }
    if (SQ.mode === "recap") return endRecap();
    SQ.view = "revdone"; return sqlDraw();
  }
  if (SQ.justPassed) { SQ.justPassed = false; SQ.view = "pass"; SND.done(); hud(); return sqlDraw(); }
  newRep(); sqlDraw();
}

// ----- the end of the day -----
function recap() {
  const n = O.day; G.ended = true; SND.done(); ROOM = "room_evening";
  const mins = Math.max(1, Math.round((performance.now() - G.t0) / 60000)), on = onDesks();
  O.days[n] = { done: new Date().toISOString().slice(0, 10), mins, roles: ROLES.filter((r) => O.roles[r]), lessons: Object.fromEntries(on.map((k) => [k, lessonId(k)])) }; save(); hud();
  const line = (k) => { const l = deskLesson(k), tr = TRACKS[ROLE_OF[k]];
    if (!l) return `<li><b>${tr.where}:</b> nothing new, every lesson there is passed.</li>`;
    const sq = k === "sql" ? sqlSt(l.id) : null;
    return `<li><b>${tr.where}:</b> ${esc(l.title)} <span class="lg">(${esc(l.group)})</span>${sq && sq.reps.length ? `, ${sq.reps.length} requests, ${sq.reps.filter((r) => r.ok).length} right` : ""}.</li>`; };
  // tomorrow: the next lesson on each track you're clocked in for, counting today's as passed
  const after = (k) => { const r = ROLE_OF[k], p = passedIn(r); const l = nextLesson(r, (id) => p(id) || id === lessonId(k)); return l ? `${TRACKS[r].where}: ${esc(l.title)}` : `${TRACKS[r].where}: nothing new yet`; };
  G.desk = "recap"; $("desk").hidden = false; sheet().className = "sheet";
  sheet().innerHTML = `<div class="recap"><div class="qn">End of day ${n} · ${mins} min</div>
    <div class="asks">${pf("dana", "smile")}<div class="bub"><div class="who">Dana <small>· ${ROLE.dana}</small></div><p class="q">${n === 1 ? "That's day one. You did good. Go home." : "Good day. Go home, get some sleep."}</p></div></div>
    <ul class="learned">${on.map(line).join("")}</ul>
    <p><b>Tomorrow, day ${n + 1}:</b> ${on.map(after).join(" · ")}. Change your roles at the time clock any time.</p>
    <div class="acts"><button class="go" id="again" type="button">Start day ${n + 1} <span class="kbd">Enter</span></button><button class="x" id="stay" type="button">Stay in the office</button></div></div>`;
  $("again").onclick = () => { closeDesk(); O.day = n + 1; O.today = null; goDay(); };
  $("stay").onclick = closeDesk; grab();
}

// ----- the time clock: clock each role in or out, any day -----
const CARD_C = { analytics: "#6fb7d6", data: "#f6c85f", testing: "#8fc98a" };
function clockCards(pick) {
  return `<div class="cards">${ROLES.map((r, i) => {
    const tr = TRACKS[r], on = !!O.roles[r], pass = passedIn(r), built = tr.lessons.filter((l) => l.id), n = built.filter((l) => pass(l.id)).length;
    const l = (on && lessonOf(r, O.today && O.today[tr.desk])) || nextLesson(r, pass);
    return `<button class="tcard ${on ? "in" : ""}" type="button" data-r="${r}" style="--band:${CARD_C[r]}"><span class="band"></span><span class="kbd dk">${i + 1}</span>
      <span class="tr">${tr.role}</span><span class="tw">${tr.where} · ${tr.game}</span><span class="td">${tr.does}</span>
      <span class="tp">${n} of ${built.length} lessons passed</span><span class="tnext">${l ? `${on && pick !== "hire" ? "Today" : "Next"}: ${esc(l.title)}` : "Every lesson built so far is passed"}</span>
      <span class="stamp">${on ? "IN" : "OUT"}</span></button>`; }).join("")}</div>`;
}
function punch(r) {
  const any = ROLES.filter((x) => O.roles[x]).length;
  if (O.roles[r] && any === 1 && G.desk !== "hire") { SND.bump(); const m = $("cmsg"); if (m) m.textContent = "Keep at least one role clocked in."; return; }
  O.roles[r] = !O.roles[r]; tone(140, 0.05, "square", 0.06); tone(90, 0.09, "square", 0.05, 0.05);
  if (G.desk !== "hire") { fillToday(); if (G.ended && !dayDone()) { G.ended = false; ROOM = "room"; } save(); hud(); }
  (G.desk === "hire" ? hireDraw : clockDraw)();
}
function clockDraw() {
  sheet().className = "sheet clock";
  sheet().innerHTML = `<header><b>Time clock</b><span class="tool">Day ${O.day} · punch a card to clock that role in or out</span><span class="sp"></span>${FULL}<button class="x" id="close" type="button">Step away · Esc</button></header>
    <div class="cbody">${clockCards()}<p class="done" id="cmsg">Press 1, 2 or 3, or click a card. A role you clock into today gets its next lesson today.</p>
    <div class="imp" ${ONLINE ? "" : "hidden"}><button class="x" id="imp" type="button">Bring in my progress from the standalone games</button><span class="done">Copies what you've passed in Lifecycle Files, Test Board (dev mode too) and SQL Gauntlet. It keeps the better of the two for every lesson, so nothing here is lost.</span></div></div>`;
  $("close").onclick = closeDesk;
  sheet().querySelectorAll(".tcard").forEach((b) => b.onclick = () => punch(b.dataset.r));
  $("imp").onclick = importProgress; grab();
}
async function importProgress() {
  const m = $("cmsg"); if (m) m.textContent = "Bringing it in…";
  try {
    const j = await (await fetch(`/api/office/import?profile=${PROF}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).json();
    const got = await (await fetch(`/api/office/progress?profile=${PROF}`)).json(); adopt(got); await refreshStatus();
    if (O.today) for (const desk of DESKS) if (O.today[desk] && passedIn(ROLE_OF[desk])(O.today[desk])) O.today[desk] = null;   // today's lesson moves on if it's now passed
    fillToday(); save(); hud(); if (G.desk === "clock") clockDraw();
    const i = j.imported || {}, mm = $("cmsg");
    if (mm) mm.textContent = `Brought in: ${i.lifecycle_files ?? 0} Lifecycle Files steps, ${i.test_board ?? 0} Test Board steps, SQL ${(i.sql || []).join(", ") || "none"} passed.`;
  } catch (e) { if (m) m.textContent = "Couldn't reach the server for that."; }
}
// day 1: what were you hired for?
function hireDraw() {
  sheet().className = "sheet clock hire";
  const any = ROLES.some((r) => O.roles[r]);
  sheet().innerHTML = `<div class="cbody"><div class="asks">${pf("dana", "smile")}<div class="bub"><div class="who">Dana <small>· ${ROLE.dana}</small></div>
    <p class="q">Welcome to Fernhill! Remind me, what were you hired for? Pick one, two or all three. You can change it any day at the time clock.</p></div></div>
    ${clockCards("hire")}<p class="done" id="cmsg">Press 1, 2 or 3, or click a card. Then Enter.</p>
    <div class="acts"><button class="go" id="next" type="button" ${any ? "" : "disabled"}>Start day ${O.day} <span class="kbd">Enter</span></button></div></div>`;
  sheet().querySelectorAll(".tcard").forEach((b) => b.onclick = () => punch(b.dataset.r));
  $("next").onclick = () => { if (!ROLES.some((r) => O.roles[r])) return; O.hired = true; G.desk = null; $("desk").hidden = true; O.today = null; goDay(); };
  grab();
}

// ---------- starting a day ----------
function goDay() {
  if (!O.hired) { G.day = O.day; hud(); return openDesk("hire"); }
  fillToday();
  const n = O.day; G.day = n; G.ended = !!O.days[n] && dayDone(); G.t0 = performance.now(); G.nudged = dayDone() ? n : undefined; ROOM = G.ended ? "room_evening" : "room";
  save(); SQ.rep = null; SQ.view = "lesson"; $("dlist").dataset.scrolled = "";
  Object.assign(P, { x: 9, y: 7, px: 9 * T, py: 7 * T, from: null, path: [], dir: "down" });
  hud();
  const b = $("banner"); b.hidden = false; b.classList.remove("out"); b.innerHTML = `<b>Day ${n} · ${weekday(n)}</b><span>Fernhill Coffee Co.${DEV ? " · dev" : ""}</span>`;
  setTimeout(() => { b.classList.add("out"); setTimeout(() => { b.hidden = true; if (G.day === n && !G.desk && !P.path.length && !SAY)
    say(G.ended ? [{ who: "dana", face: "smile", text: `Day ${n}'s done. Practise any desk again, or start tomorrow by talking to me.` }] : morning(n, O.roles, O.today)); }, 450); }, 1100);
}

// ---------- keys (a hidden text box keeps Vimium from taking letters, as in Test Board) ----------
const catcher = Object.assign(document.createElement("input"), { type: "text", autocomplete: "off", tabIndex: -1 });
catcher.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;border:0;padding:0;pointer-events:none";
document.body.appendChild(catcher);
function grab() { if (G.desk === "dash" || G.desk === "board") return; if (document.activeElement?.tagName !== "TEXTAREA" || document.activeElement.disabled) catcher.focus({ preventScroll: true }); }
catcher.addEventListener("input", () => { catcher.value = ""; });
document.addEventListener("mouseup", (e) => setTimeout(() => { if (e.target.closest && e.target.closest("textarea")) return; if (document.activeElement !== catcher) grab(); }, 0));
const DIR = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "TEXTAREA") return;
  if (e.key === "m" || e.key === "M") return mute();
  if (SAY && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); return sayNext(); }
  if (G.desk) {
    if (G.desk === "hire") { if (/^[1-3]$/.test(e.key)) { e.preventDefault(); return punch(ROLES[+e.key - 1]); } if (e.key === "Enter") { e.preventDefault(); $("next").click(); } return; }
    if (G.desk === "clock" && /^[1-3]$/.test(e.key)) { e.preventDefault(); return punch(ROLES[+e.key - 1]); }
    if (e.key === "Escape") return closeDesk();
    if (e.key === "\\") { e.preventDefault(); return toggleFull(); }
    if (e.key === "Tab" && e.shiftKey && G.desk === "sql" && SQ.view === "rep") { e.preventDefault(); return openHint(); }
    if (e.key === "Tab" && G.desk === "sql" && SQ.view === "rep" && SQ.rep && !SQ.rep.practice && !SQ.peek && !SQ.done) { e.preventDefault(); SQ.peek = true; return sqlDraw(); }
    if (e.key === "Enter") { e.preventDefault(); const b = $("next") || $("again"); if (b) b.click(); }
    return;
  }
  if (DIR[e.key]) { e.preventDefault(); if (DEV) shush(); P.path = []; P.hold = DIR[e.key]; tryStep(...DIR[e.key]); return; }
  if (/^[1-5]$/.test(e.key)) { e.preventDefault(); return walkTo(Object.keys(STATIONS)[+e.key - 1]); }
  if (e.key === "Enter") { e.preventDefault(); return use(stationHere()); }
});
document.addEventListener("keyup", (e) => { if (DIR[e.key] && P.hold === DIR[e.key]) P.hold = null; });
cv.addEventListener("click", (e) => {   // click a station to walk there
  const r = cv.getBoundingClientRect(), tx = Math.floor((e.clientX - r.left) / (r.width / COLS)), ty = Math.floor((e.clientY - r.top) / (r.height / ROWS));
  for (const [id, st] of Object.entries(STATIONS)) if ([...st.tiles, st.stand].some(([a, b]) => a === tx && b === ty)) return walkTo(id);
});
$("say").addEventListener("click", () => SAY && sayNext());
$("sheet").addEventListener("click", (e) => { if (e.target.closest("#full")) toggleFull(); else if (e.target.closest("#popboard")) popBoard(); });

// ---------- start ----------
if (location.search.includes("debug")) window.__office = { G, P, get O() { return O; }, SQ, TRACKS, PASSED, walkTo, use, goDay, recap, refreshStatus, punch, pickLesson, importProgress, get SAY() { return SAY; }, sayNext, set sql(t) { SQ.text = t; }, sqlRun, sqlNext, openHint, pickWhere, startReview, endRecap, runSql: (q) => run(q), get cur() { return cur(); }, closeDesk, Q };
$("snd").textContent = MUTED ? "sound off" : "sound on"; $("snd").onclick = mute;
if (DEV) { $("devbadge").hidden = false; $("devoff").onclick = () => { location.href = location.pathname + "?dev=0"; }; }
else $("devon").hidden = false;
// Review link (?dev&try=<role>:<lesson id>, e.g. ?dev&try=data:<id>): opens that lesson at its desk on the dev save, so a
// reviewer lands right on a contribution. Roles: analytics, data, testing. Lesson ids: TRACKS in days.mjs.
function tryLink() {
  const [role, id] = (new URLSearchParams(location.search).get("try") || "").split(":");
  if (!DEV || !TRACKS[role] || !TRACKS[role].lessons.some((l) => l.id && l.id === id)) return false;
  O.hired = true; G.day = O.day; pickLesson(role, id); openDesk(TRACKS[role].desk);
  return true;
}
fit(); grab(); requestAnimationFrame(frameLoop);
Promise.all([loadArt(), loadSave()]).then(refreshStatus).then(() => { fit(); if (!tryLink()) goDay(); });
