// Phone and tablet support shared by the games (Test Board first, Lifecycle Files next). See MOBILE.md beside this file.
//   TOUCH       true on a device whose main pointer is a finger (no hover). Also puts class "touch" on <html>, so CSS can
//               hide key hints (.kbd, .keys-only) and show tap wording (.touch-only).
//   audioCtx()  one shared Web Audio context for beeps. iOS starts it suspended, so the first tap resumes it.
//   play(url)   plays one clip on a single shared <audio> element. iOS only lets an element play sound after a tap has
//               "unlocked" it, and a fresh new Audio() per line is never unlocked, so every voice line reuses this one.
//               Resolves true when the clip ends or stop() cuts it, false when the browser blocked it.
//   stop()      cuts whatever play() started.
// Array.at arrived in Safari 15.4; older iPads still run 15.x and the games use it
if (!Array.prototype.at) Object.defineProperty(Array.prototype, "at", { value(i) { i = Math.trunc(i) || 0; return this[i < 0 ? this.length + i : i]; }, configurable: true, writable: true });
const WEB = typeof window !== "undefined";   // node imports this too (the tests load vn.mjs)
export const TOUCH = WEB && matchMedia("(hover: none) and (pointer: coarse)").matches;
if (TOUCH) document.documentElement.classList.add("touch");

let ctx = null, el = null, pending = null, unlocked = false;
export function audioCtx() {
  try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}
function audioEl() { if (!el) { el = new Audio(); el.preload = "auto"; } return el; }
export function stop() {
  const a = audioEl();
  if (pending) { const r = pending; pending = null; a.pause(); r(true); }
}
export function play(url) {
  stop();
  const a = audioEl();
  a.src = url;
  let mine;
  const ended = new Promise((res) => { mine = res; pending = res; a.onended = a.onerror = () => { if (pending === res) { pending = null; res(true); } }; });
  return a.play().then(() => { unlocked = true; return ended; }, () => { if (pending === mine) pending = null; return false; });
}

// the first tap or key unlocks both: a silent clip on the shared element, and the beep context. Safari counts touchend
// and click as a tap, not pointerdown, so all of them listen until one unlock succeeds.
const SILENT = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
const GESTURES = ["touchend", "click", "keydown", "pointerdown"];
function unlock() {
  audioCtx();   // created or resumed inside a tap, so it runs
  if (unlocked || pending) return;
  const a = audioEl();
  a.src = SILENT;
  a.play().then(() => { unlocked = true; GESTURES.forEach((g) => removeEventListener(g, unlock, true)); }, () => {});
}
if (WEB) GESTURES.forEach((g) => addEventListener(g, unlock, true));
