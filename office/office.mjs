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
let DB = null;
async function db() {
  if (DB) return DB;
  const SQL = await initSqlJs({ locateFile: (f) => f });
  DB = new SQL.Database(); Q.load(DB); return DB;
}
const run = (q) => { const r = DB.exec(q); return r.length ? { cols: r[0].columns, rows: r[0].values } : { cols: [], rows: [] }; };
const SQ = { view: "lesson", rep: null, text: "", out: null, tries: 0, done: false, ok: false, fb: "", peek: false, r: Q.rng(Date.now() & 0xffffff) };
const CLOSERS = ["Case closed. The coffee's cold. The rows are warm.", "Clean. Like a fresh export.", "The data always talks. You just stop asking it nicely.", "That's the one. File it."];
const STUMPED = ["Wrong rows. Happens to the best of us. Happened to me in '14.", "Something's off. Look again. The table's hiding something."];
async function sqlOpen() {
  sheet().className = "sheet term"; sheet().innerHTML = `<header><b>Frank Mallory's desk</b><span class="sp"></span>${FULL}<button class="x" id="close" type="button">Step away · Esc</button></header><div class="body"><div class="main"><p>Loading the database…</p></div></div>`;
  $("close").onclick = closeDesk;
  await db(); if (G.desk !== "sql") return;
  const id = lessonId("sql");
  if (!id) { SQ.view = "later"; return sqlDraw(); }
  const st = sqlSt(id);
  if (SQ.view === "pass" || SQ.view === "later" || (SQ.rep && SQ.rep.part !== id)) SQ.view = st.reps.length ? "rep" : "lesson";
  if (SQ.view === "rep" && (!SQ.rep || SQ.rep.part !== id || SQ.done)) newRep();
  sqlDraw();
}
function newRep() {
  const id = lessonId("sql"), st = sqlSt(id);
  SQ.rep = Q.nextRep(id, st, SQ.r); Object.assign(SQ, { text: "", out: null, tries: 0, done: false, ok: false, fb: "", peek: false, swapped: false, typed: null });
}
const header = (t) => `<header><b>Frank Mallory's desk</b><span class="tool">SQL · ${t}</span><span class="sp"></span>${FULL}<button class="x" id="close" type="button">Step away · Esc</button></header>`;
function resultHTML(o, cap = 15) {
  if (!o) return "";
  if (o.err) return `<div class="res"><div class="err">${esc(o.err)}</div></div>`;
  const rows = o.rows.slice(0, cap);
  return `<div class="res"><table><tr>${o.cols.map((c) => `<th>${esc(c)}</th>`).join("")}</tr>${rows.map((r) => `<tr>${r.map((v) => `<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</table>
    <div class="cnt">${o.rows.length.toLocaleString()} row${o.rows.length === 1 ? "" : "s"}${o.rows.length > cap ? `, first ${cap} shown` : ""}</div></div>`;
}
const cardsHTML = () => `<div class="cork"><button class="pop" id="popboard" type="button" title="Float the board in its own small window">${BOARD ? "⧉ Bring it back" : "⧉ Pop out"}</button><svg class="strings" id="strings"></svg>${Object.entries(Q.TABLES).map(([t, v], i) =>
  `<div class="bcard ${i ? "b2" : ""}" id="bcard${i}"><span class="pin"></span><h4>${t}</h4><ul>${v.cols.map(([c, ty]) => `<li data-c="${c}">${c}<i>${ty}</i></li>`).join("")}</ul><div class="bsmall">${v.note}</div></div>`).join("")}</div>`;
const noirHTML = (title, line) => `<div class="col noircol"><div class="panel"><canvas id="noir" width="160" height="90"></canvas></div><div class="dbub"><div class="ctitle">${esc(title)}</div><div class="dsay" id="dsay"></div><div class="dname">F. MALLORY · DATA DETECTIVE</div></div></div>`;
function pips(st) {
  const solo = st.reps.filter((x) => !x.practice && !x.help).slice(-Q.PASS[1]);
  return `<span class="pips" title="Your last ${Q.PASS[1]} reps without help. ${Q.PASS[0]} clean, ending on a clean one, passes.">${[...Array(Q.PASS[1])].map((_, i) => { const r = solo[i]; return `<i class="${r ? (r.clean ? "g" : "b") : ""}"></i>`; }).join("")}</span>`;
}
function sqlDraw() {
  const id = lessonId("sql"), part = id && Q.PART[id];
  if (SQ.view === "later") {
    sheet().innerHTML = header("Nothing new") + `<div class="body one"><div class="main"><div class="scene">${noirHTML("Not written yet", "")}</div>
      <p class="later">You've passed every SQL part Frank has written: ${Q.PARTS.map((p) => p.name).join(", ")}. The next one, ${esc(Q.LATER[0])}, isn't written yet, so today's SQL counts as done.</p>
      <button class="go" id="next" type="button">Back to the office <span class="kbd">Enter</span></button></div></div>`;
    $("close").onclick = closeDesk; $("next").onclick = closeDesk; typeLine("That case file's still in the typewriter, kid. Come back when it isn't."); grab(); return;
  }
  const st = sqlSt(part.id);
  if (SQ.view === "lesson") {
    const ex = run(part.lesson.example);
    sheet().innerHTML = header(`Part ${part.n} · ${part.name}`) + `<div class="body"><div class="main">
      <div class="scene">${noirHTML(`Part ${part.n}: ${part.name}`, part.lesson.frank)}<div class="col lessoncol"><div class="qn">Today's new word</div><div class="word">${esc(part.word)}</div>
        <ul class="lines">${part.lesson.lines.map((l) => `<li>${l}</li>`).join("")}</ul></div></div>
      <div class="qn">An example, on Fernhill's tables</div><div class="example big">${esc(part.lesson.example)}</div>${resultHTML(ex, 8)}</div>
      <div class="side">${cardsHTML()}<p class="done">Next: ${Q.PRACTICE} practice requests with the example beside you, then the example hides behind <span class="kbd dk">Tab</span>. ${Q.PASS[0]} clean of your last ${Q.PASS[1]} passes the part.</p>
        <button class="go" id="next" type="button">Start practice <span class="kbd">Enter</span></button></div></div>`;
    $("close").onclick = closeDesk; $("next").onclick = () => { SQ.view = "rep"; newRep(); sqlDraw(); };
    typeLine(part.lesson.frank); glow(part.lesson.example); requestAnimationFrame(() => stringUp(false)); grab(); return;
  }
  if (SQ.view === "pass") {
    const ok = st.reps.filter((r) => r.ok).length;
    sheet().innerHTML = header(`Part ${part.n} · ${part.name}`) + `<div class="body one"><div class="main"><div class="scene">${noirHTML("Case closed", "")}<div class="col lessoncol"><div class="qn">Part passed</div><div class="word">${esc(part.name)}</div>
      <div class="sumrow"><div><b>${st.reps.length}</b><span>requests</span></div><div><b>${ok}</b><span>right</span></div><div><b>${st.reps.filter((r) => r.clean && !r.help).length}</b><span>clean, no help</span></div></div></div></div>
      <div class="acts"><button class="go" id="next" type="button">Back to the office <span class="kbd">Enter</span></button><button class="x" id="more" type="button">Keep practising</button></div></div></div>`;
    $("close").onclick = closeDesk; $("next").onclick = closeDesk; $("more").onclick = () => { SQ.view = "rep"; newRep(); sqlDraw(); };
    typeLine(`${part.name}. Yours now. Nobody can take that off you, not even the auditors.`); grab(); return;
  }
  // a request
  const t = SQ.rep, who = t.who in CAST ? t.who : "dana", face = SQ.done ? (SQ.ok ? "smile" : "worried") : SQ.fb ? "worried" : "calm";
  const said = SQ.done ? (SQ.ok ? "Perfect, thank you!" : "Hmm. That's not quite what I needed?") : t.ask;
  const frank = SQ.done && SQ.ok ? CLOSERS[st.reps.length % CLOSERS.length] : SQ.fb || (SQ.done && !SQ.ok) ? STUMPED[st.reps.length % STUMPED.length] : part.lesson.frank;
  const showEx = t.practice || SQ.peek, n = st.reps.length + (SQ.done ? 0 : 1);
  sheet().innerHTML = header(`Part ${part.n} · ${part.name}`) + `<div class="body"><div class="main">
      <div class="scene"><div class="col"><div class="panel corpimg">${pf(who, face, 84).replace('class="pix"', 'class="pix inpanel"')}</div>
          <div class="cbub ${SQ.done ? (SQ.ok ? "react" : "puzzled") : SQ.fb ? "puzzled" : ""}"><div class="cwho">${CAST[who].name} <small>· ${ROLE[who]}</small></div>${esc(said)}</div></div>
        ${noirHTML(t.practice ? "Practice" : `Request ${n}`, frank)}</div>
      <div class="qn">${t.practice ? `Practice ${n} of ${Q.PRACTICE} · the example is on the right` : `Request ${n}`} ${t.practice ? "" : pips(st)}</div>
      <div class="ask"><b>${esc(t.ask)}</b></div>
      <textarea class="sql" id="sql" spellcheck="false" autocomplete="off" placeholder="SELECT …" ${SQ.done ? "disabled" : ""}>${esc(SQ.text)}</textarea>
      ${SQ.out ? `<div class="qn">${SQ.done && !SQ.ok ? "What the request wanted" : "Your result"}</div>` : ""}${resultHTML(SQ.out)}</div>
    <div class="side">${SQ.done ? `<div class="fb ${SQ.ok ? "good" : "bad"}"><b>${SQ.ok ? "Right rows." : "Here's one answer."}</b> ${SQ.ok ? (SQ.swapped ? "Your columns came in a different order. Fine here. The request's order is the usual habit." : SQ.tries ? "Right on the second try." : "Clean.") : esc(SQ.why || "")}${SQ.ok ? "" : `<div class="example">${esc(t.sql)}</div>`}</div>
        <button class="go" id="next" type="button">Next <span class="kbd">Enter</span></button>`
      : `<p class="done"><span class="kbd dk">Enter</span> runs it. <span class="kbd dk">Shift</span>+<span class="kbd dk">Enter</span> for a new line.</p>
        ${SQ.fb ? `<div class="fb bad">${SQ.fb} <small>Try ${SQ.tries + 1} of 2.</small></div>` : ""}`}
      ${cardsHTML()}
      ${showEx ? `<div class="guide"><b>The example.</b> ${part.lesson.lines[0]}<div class="example">${esc(part.lesson.example)}</div><small>For a different request. Swap in what this one asks for.</small></div>`
        : `<p class="done peek"><span class="kbd dk">Tab</span> peeks at the example. A peek counts as help, so that rep won't count toward the pass.</p>`}</div></div>`;
  $("close").onclick = closeDesk;
  typeLine(frank); requestAnimationFrame(() => stringUp(SQ.ok)); glow(SQ.text || "");
  const ta = $("sql");
  if (ta && !SQ.done) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
    ta.oninput = () => { SQ.text = ta.value; glow(ta.value); if (Math.random() < 0.5) tone(880 + Math.random() * 200, 0.015, "square", 0.008); };
    ta.onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sqlRun(); } else if (e.key === "Escape") closeDesk();
      else if (e.key === "Tab") { e.preventDefault(); if (!t.practice && !SQ.peek) { SQ.peek = true; sqlDraw(); } } }; }
  const nx = $("next"); if (nx) { nx.onclick = sqlNext; grab(); }
}
let typer = 0;
function typeLine(text) {   // Frank types his line out, once per line
  const el = $("dsay"); if (!el) return;
  if (SQ.typed === text) { el.textContent = text; return; }
  SQ.typed = text; clearInterval(typer); let i = 0; el.textContent = "";
  typer = setInterval(() => { el.textContent = text.slice(0, ++i); if (i % 3 === 0) tone(1400 + Math.random() * 300, 0.012, "square", 0.006); if (i >= text.length) clearInterval(typer); }, 18);
}
function glow(q) { const words = new Set((q.toLowerCase().match(/[a-z_]+/g) || [])); sheet().querySelectorAll(".bcard li").forEach((li) => li.classList.toggle("glow", words.has(li.dataset.c))); }
function stringUp(tight, doc = document) {   // the red string between the two table cards: customer_id to id
  const svg = doc.getElementById("strings"), a = doc.getElementById("bcard0"), b = doc.getElementById("bcard1"); if (!svg || !a || !b || !a.offsetParent) return;
  const B = svg.parentElement.getBoundingClientRect(), ra = a.querySelector(".pin").getBoundingClientRect(), rb = b.querySelector(".pin").getBoundingClientRect();
  const x1 = ra.left + 7 - B.left, y1 = ra.top + 7 - B.top, x2 = rb.left + 7 - B.left, y2 = rb.top + 7 - B.top, my = Math.max(y1, y2) + (tight ? 4 : 30);
  svg.setAttribute("class", "strings" + (tight ? " hot" : ""));
  svg.innerHTML = `<path d="M${x1} ${y1} Q${(x1 + x2) / 2} ${my} ${x2} ${y2}"/><circle cx="${x1}" cy="${y1}" r="3"/><circle cx="${x2}" cy="${y2}" r="3"/>`;
}
function sqlRun() {
  const t = SQ.rep, q = SQ.text.trim(); if (!q || SQ.done) return;
  const st = sqlSt(t.part);
  let mine;
  try { mine = run(q); } catch (e) { SQ.out = { err: String(e.message || e) }; SQ.fb = Q.slip(q, SQ.out.err); SND.wrong(); sqlDraw(); shake(); return; }
  const want = run(t.sql), g = Q.grade(mine, want, t.ordered), slip = Q.slip(q);
  if (g.ok && !slip) {
    SQ.out = mine; SQ.done = true; SQ.ok = true; SQ.swapped = g.swapped; SND.right();
    const { justPassed } = Q.record(st, t, true, SQ.tries === 0, SQ.peek); save(); if (justPassed) SQ.justPassed = true;
    return sqlDraw();
  }
  SQ.tries++; SND.wrong(); SQ.out = mine;
  if (SQ.tries >= 2) { Q.record(st, t, false, false, SQ.peek); save(); Object.assign(SQ, { done: true, ok: false, out: want, why: slip || g.why }); sqlDraw(); shake(); return; }
  SQ.fb = slip || g.why; sqlDraw(); shake();
}
function sqlNext() {
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
if (location.search.includes("debug")) window.__office = { G, P, get O() { return O; }, SQ, TRACKS, PASSED, walkTo, use, goDay, recap, refreshStatus, punch, pickLesson, importProgress, get SAY() { return SAY; }, sayNext, set sql(t) { SQ.text = t; }, sqlRun, sqlNext, closeDesk, Q };
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
