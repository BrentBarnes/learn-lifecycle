// Talk it through, from Lifecycle Files (lifecycle_files_coach.js): record, watch your words come in, stop, and the coach
// answers. Typing works too. The server side is Lifecycle Files' (lf_coach.py on the same :8791 server, /api/lf/voice/*
// and /api/lf/coach/*): Whisper on this machine for the words, Claude Opus on the Max plan through the local claude CLI
// for the reply. The page sends game "tb" and its own facts (app.mjs's coachCtx: the step, the lesson or rep on screen,
// its answer key, graded or not), so the server answers with Test Board's rules (v2/tb_coach.py).
// A talk carries on across screens until ↺ New or 30 quiet minutes. Mic capture is Talk's: an AudioWorklet down to 16 kHz int16.
const V = { rec: false, starting: false, finishing: false, vid: null, tid: null, talk: null, mic: null, ac: null, node: null,
  buf: [], seq: 0, sending: false, t0: 0, tick: null, poll: null, words: "", tail: "", level: 0, note: "", ctx0: null };
const WORKLET = `class Cap extends AudioWorkletProcessor {
  constructor() { super(); this.r = sampleRate / 16000; this.acc = 0; this.sum = 0; this.cnt = 0; this.out = new Int16Array(512); this.n = 0; this.e = 0; }
  process(inputs) { const ch = inputs[0][0]; if (!ch) return true;
    for (let i = 0; i < ch.length; i++) { this.sum += ch[i]; this.cnt++; this.acc++;
      if (this.acc >= this.r) { this.acc -= this.r; const v = Math.max(-1, Math.min(1, this.sum / this.cnt)); this.sum = 0; this.cnt = 0;
        this.e += v * v; this.out[this.n++] = v * 32767;
        if (this.n === 512) { this.port.postMessage({pcm: this.out.slice(0).buffer, lvl: Math.sqrt(this.e / 512)}); this.n = 0; this.e = 0; } } }
    return true; } }
registerProcessor("cap", Cap);`;
const FRAMES = 16;         // 16 frames of 32 ms: about half a second of audio per piece sent
let H = { ctx: () => ({}), narrate: () => {}, hush: () => {}, touch: false, online: () => true };
// Offline (the public copy on a static host, no coach server): the panel takes a typed question and copies it, with the
// step and the screen, ready to paste into any AI chat. An open question's answer is left out of the copy.
const offline = () => !H.online();
const LOCAL = [];
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const post = (url, body) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());
const ctx = () => Object.assign({ game: "tb" }, H.ctx());

export function initCoach(hooks) {
  H = Object.assign(H, hooks);
  const a = document.createElement("aside");
  a.className = "tkp"; a.id = "tkp"; a.hidden = true; a.setAttribute("aria-label", "Talk it through");
  a.innerHTML = `<div class="chd"><b>Talk it through</b><span class="sp"></span>
      <button class="cbtn" id="tkcopy" type="button" title="Copy the whole talk">Copy</button><button class="cbtn" id="tknew" type="button" title="Start a new talk">↺ New</button><button class="cbtn" id="tkmin" type="button" title="Hide. The talk stays.">✕</button></div>
    <div class="clog" id="tklog"></div>
    <div class="cfoot"><button class="crec" id="tkrec" type="button"></button><form id="tkform"><input id="tktype" placeholder="or type a question" autocomplete="off" enterkeyhint="send"></form></div>`;
  document.body.appendChild(a);
  $("tkrec").onclick = () => V.rec ? voiceStop() : voiceStart();
  $("tkmin").onclick = () => coachOpen(false);
  $("tkcopy").onclick = async () => {
    const turns = (V.talk && V.talk.turns) || [];
    if (!turns.length) return note("Nothing to copy yet.");
    try { await navigator.clipboard.writeText(turns.map((x) => `${x.who === "coach" ? "Coach" : "Me"}: ${x.text}`).join("\n\n")); note("Copied the talk."); }
    catch (e) { note("Couldn't copy. Select the text and press Ctrl+C."); }
  };
  $("tknew").onclick = () => { if (V.rec || V.finishing) return; clearTimeout(V.poll); V.tid = null; V.talk = null; V.note = ""; H.hush(); render(); };
  $("tkform").onsubmit = (e) => { e.preventDefault(); const i = $("tktype"), t = i.value.trim(); if (!t) return; i.value = ""; offline() ? copyAsk(t) : say(t); };
  $("tklog").addEventListener("click", (e) => { if (e.target.closest("#tkretry")) say(null, true); });
  render();
  addEventListener("beforeunload", (e) => { if (V.rec) { e.preventDefault(); e.returnValue = ""; } });
}
// the sidebar button opens and closes the panel. The T key starts and stops a recording.
export function coachToggle() { coachOpen($("tkp").hidden); }
export function coachRecord() { if (offline()) return coachOpen($("tkp").hidden); return V.rec ? voiceStop() : voiceStart(); }
export const coachRecording = () => V.rec;
export const coachRefresh = () => render();   // after the page learns whether the server is there
export function coachOpen(on) {
  $("tkp").hidden = !on; document.body.classList.toggle("tkon", on);
  if (on) { render(); if (!offline()) post("/api/lf/voice/warm", {}).catch(() => {}); if (!H.touch) setTimeout(() => $("tktype").focus(), 0); }
  if (H.onToggle) H.onToggle(on);
}
function note(t) { V.note = t || ""; render(); }
const clock = (ms) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
function buttons() {
  const b = $("tkrec"); if (!b) return;
  b.hidden = offline(); $("tkp").querySelector(".chd b").textContent = offline() ? "Ask a question" : "Talk it through"; $("tktype").placeholder = offline() ? "Type your question, then Enter" : "or type a question";
  b.classList.toggle("on", V.rec); b.disabled = V.starting || V.finishing;
  b.innerHTML = V.rec ? `<span class="cdot"></span>Stop <span class="ctime">${clock(Date.now() - V.t0)}</span><span class="clvl"><i style="width:${Math.min(100, Math.round(V.level * 400))}%"></i></span>`
    : V.finishing ? "Finishing your words…" : V.starting ? "Starting the mic…" : "🎙 Record";
  const nb = $("nav-talk"); if (nb) { nb.classList.toggle("rec", V.rec); nb.firstChild.textContent = V.rec ? `Recording ${clock(Date.now() - V.t0)} · stop ` : offline() ? "Ask a question " : "Talk it through "; }
}
function render() {
  const log = $("tklog"); if (!log) return;
  const t = V.talk, turns = (t && t.turns) || [];
  let h = turns.map((x) => `<div class="${x.who === "coach" ? "cme" : "cyou"}">${esc(x.text)}</div>`).join("");
  if (V.rec || V.finishing) h += `<div class="cyou live">${esc(V.words)} <span class="ctail">${esc(V.tail) || (V.words ? "" : "Listening…")}</span></div>`;
  if (t && t.status === "thinking") h += `<div class="cme live">${t.partial ? esc(t.partial) : '<span class="cdots"><i></i><i></i><i></i></span>'}</div>`;
  if (t && t.status === "failed") h += `<div class="cerr">${esc(t.error || "The coach didn't answer.")} <button class="cbtn" id="tkretry" type="button">Try again</button></div>`;
  if (offline()) h = LOCAL.map((x) => `<div class="${x.who === "coach" ? "cme" : "cyou"}">${esc(x.text)}</div>`).join("") ||
    `<p class="cempty">Ask anything about what's on your screen: why a number moves the way it does, what a word means. Type your question and press Enter. It's copied together with the step and your screen, ready to paste into ChatGPT, Claude or any AI chat. If the question on your screen is still open, its answer stays out of the copy.</p>`;
  if (!h) h = `<p class="cempty">Ask anything about what's on your screen: why a number moves the way it does, what a word means, whether the game is being fair. Press record and talk, or type. The coach sees your screen and tries not to spoil a question that's still open.${H.touch ? "" : " <kbd>T</kbd> starts and stops recording."}</p>`;
  if (V.note) h += `<p class="cnote">${esc(V.note)}</p>`;
  log.innerHTML = h; log.scrollTop = log.scrollHeight;
  buttons();
}

async function voiceStart() {
  if (V.rec || V.starting || V.finishing) return;
  if (V.talk && V.talk.status === "thinking") { coachOpen(true); return note("The coach is still answering."); }
  V.starting = true; V.note = ""; coachOpen(true); H.hush();
  V.ctx0 = ctx();
  try {
    V.ac = new (window.AudioContext || window.webkitAudioContext)();
    await V.ac.resume();
    V.mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
    await V.ac.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" })));
    V.node = new AudioWorkletNode(V.ac, "cap");
    V.ac.createMediaStreamSource(V.mic).connect(V.node);
  } catch (e) {
    V.starting = false; micOff();
    return note(e && e.name === "NotAllowedError" ? "The microphone is blocked. Allow it in the address bar, then press record again." : `No microphone (${e && e.message}). You can still type.`);
  }
  Object.assign(V, { buf: [], seq: 0, words: "", tail: "", vid: null, t0: Date.now(), rec: true, starting: false });
  V.node.port.onmessage = (e) => { V.level = e.data.lvl; if (V.rec) { V.buf.push(e.data.pcm); if (V.buf.length >= FRAMES) send(); } };
  V.tick = setInterval(buttons, 250);
  render();
  const s = await post("/api/lf/voice/start", { ctx: V.ctx0 }).catch(() => ({}));
  if (!s.vid) { V.rec = false; clearInterval(V.tick); micOff(); return note("The game server didn't answer. Try again in a moment."); }
  V.vid = s.vid; send();
}
function micOff() {
  try { if (V.node) { V.node.port.onmessage = null; V.node.disconnect(); } } catch (e) { /* gone */ }
  try { if (V.mic) V.mic.getTracks().forEach((t) => t.stop()); } catch (e) { /* gone */ }
  try { if (V.ac) V.ac.close(); } catch (e) { /* gone */ }
  V.node = V.mic = V.ac = null; V.level = 0;
}
async function send(final) {      // one piece at a time, in order; each answer carries the words so far
  if (V.sending || !V.vid) return;
  V.sending = true;
  try {
    while (V.buf.length && (final || V.buf.length >= FRAMES)) {
      const parts = V.buf.splice(0, FRAMES * 2), all = new Uint8Array(parts.reduce((a, b) => a + b.byteLength, 0));
      let o = 0; for (const b of parts) { all.set(new Uint8Array(b), o); o += b.byteLength; }
      const seq = V.seq++, vid = V.vid;
      for (let k = 0; k < 5; k++) {
        try {
          const r = await fetch(`/api/lf/voice/chunk?vid=${vid}&seq=${seq}`, { method: "POST", body: all }).then((x) => x.json());
          if (!r.error && vid === V.vid) { V.words = r.text || ""; V.tail = r.tail || ""; render(); }
          break;
        } catch (e) { await new Promise((res) => setTimeout(res, 600)); }
      }
    }
  } finally { V.sending = false; }
}
async function voiceStop() {
  if (!V.rec) return;
  V.rec = false; V.finishing = true; clearInterval(V.tick); micOff(); render();
  while (V.sending) await new Promise((r) => setTimeout(r, 40));
  await send(true);
  const res = V.vid ? await post("/api/lf/voice/stop", { vid: V.vid, ctx: ctx(), tid: V.tid }).catch(() => ({ error: "The game server didn't answer." })) : { error: "Nothing was recorded." };
  V.finishing = false; V.vid = null; V.words = V.tail = "";
  if (res.heard === false) return note("I didn't catch any words. Check the mic and try again.");
  if (!res.tid) return note(res.error || "Couldn't reach the coach.");
  got(res);
}
async function say(text, retry) {
  if (V.rec || V.finishing || (V.talk && V.talk.status === "thinking")) return;
  coachOpen(true); V.note = "";
  const res = await post("/api/lf/coach/say", { tid: V.tid, ctx: ctx(), text: text || "", retry: !!retry }).catch(() => ({ error: "The game server didn't answer." }));
  if (!res.tid) return note(res.error || "Couldn't reach the coach.");
  got(res);
}
function got(t) { V.tid = t.tid; V.talk = t; V.note = t.error && t.status !== "failed" ? t.error : ""; render(); if (t.status === "thinking") poll(); }
async function poll() {
  clearTimeout(V.poll);
  const tid = V.tid, t = await fetch("/api/lf/coach?tid=" + tid).then((r) => r.json()).catch(() => null);
  if (tid !== V.tid) return;
  if (t && t.error && !t.tid) return note("The talk was lost (the game server restarted). Ask again to start a new one.");
  if (t) { V.talk = t; render(); }
  if (!t || t.status === "thinking") { V.poll = setTimeout(poll, 350); return; }
  const last = t.turns[t.turns.length - 1];
  if (t.status === "done" && last && last.who === "coach") H.narrate(last.text);
}

// ---------- offline: the shared "Copy as a question" (lifecycle-practice/shared/copy-question.mjs, same text in both games) ----------
// Loaded only here, so Brent's own copy (always online) never needs the file.
async function copyAsk(q) {
  const c = ctx(), { copyQuestion } = await import("../shared/copy-question.mjs");
  const step = c.step ? c.step.name + (c.lesson ? ", lesson page" : "") : c.title || "";
  const text = await copyQuestion({ game: "the Test Board", step, screen: c.screen, question: q });
  LOCAL.push({ who: "me", text: q }, { who: "coach", text: "Copied, with the step and your screen. Paste it into ChatGPT, Claude or any AI chat." });
  render();
  return text;
}
