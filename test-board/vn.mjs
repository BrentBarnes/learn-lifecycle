// v3: a "Skip talk" button (or Shift+Enter) runs the dialogue straight to the next decision. Waiting through text
// you've read breaks immersion, and the story's job is the decisions (research notes, immersion section 2).
// The story stage: a backdrop, one character at a time, a dialogue box that types itself out, and the shouts
// ("Objection!", "Hold it!", "Take that!"). Laid out like Ace Attorney, drawn in pixel art (games/shared/pixel, made with pxl).
// Exhibits (setup cards, GrowthBook rows, the board, logs) render here too, with every line pickable, so evidence is
// always a line on a copy of a real screen. Keys: Enter/Space next, ←/→ statements, 1-4 choices, ↑/↓ lines, Backspace back.
import { SCENES } from "./scenes.mjs";
import { TOUCH, audioCtx, play as playClip, stop as stopClip } from "./touch.mjs";

export const CAST = {
  you: { name: "You", voice: "am_michael", pitch: 0 },
  theo: { name: "Theo", role: "Campaign manager", voice: "am_puck", pitch: 4 },
  priya: { name: "Priya", role: "Analyst", voice: "af_sarah", pitch: 0 },
  dana: { name: "Dana", role: "VP of Marketing", voice: "bf_emma", pitch: 2 },
  mei: { name: "Mei", role: "Engineer", voice: "af_nicole", pitch: 6 },
  rosa: { name: "Rosa", role: "Deliverability lead", voice: "af_sarah", pitch: 5 },
  hank: { name: "Hank", role: "Founder", voice: "bm_george", pitch: -6 },
};
// 2026-10-24: the cast is pixel art (games/shared/pixel/cast.px.js, the same people as the office game). The 19 story
// faces map onto the five pixel faces.
const PX_FACE = { calm: "calm", explaining: "calm", eyesClosed: "calm", smile: "smile", smileBig: "smile", smileLOL: "smile", cheeky: "smile",
  driven: "serious", serious: "serious", suspicious: "serious", rage: "serious", contempt: "serious", solemn: "serious",
  concerned: "worried", concernedFear: "worried", fear: "worried", hectic: "worried", tired: "worried", awe: "surprised" };
const art = (who, face) => `/px/sprites/face_${who}_${PX_FACE[face] || "calm"}.png`;
export const FACES = ["calm", "smile", "smileBig", "smileLOL", "cheeky", "explaining", "driven", "serious", "suspicious", "concerned",
  "concernedFear", "fear", "hectic", "awe", "rage", "solemn", "tired", "eyesClosed", "contempt"];

const CSS = `
.vn{max-width:1080px;margin:0 auto}
.vn-stage{position:relative;aspect-ratio:16/8.2;max-height:60vh;width:100%;min-height:320px;border-radius:12px;overflow:hidden;background:#222;box-shadow:0 2px 0 var(--line2)}
.vn-bg,.vn-bg svg,.vn-bg img{position:absolute;inset:0;width:100%;height:100%}
.vn-bg img{object-fit:cover;image-rendering:pixelated}
.vn-actor{image-rendering:pixelated;aspect-ratio:1}
.vn-actor{position:absolute;bottom:21%;left:50%;height:72%;transform:translateX(-50%);transition:transform .18s ease,opacity .18s;filter:drop-shadow(0 6px 0 rgba(0,0,0,.18))}
.vn-actor.in{animation:vnIn .22s ease-out}
.vn-actor.hurt{animation:vnHurt .45s ease-out}
.vn-actor.bob{animation:vnBob .5s ease-out}
@keyframes vnIn{from{opacity:0;transform:translateX(-50%) translateY(18px)}to{opacity:1;transform:translateX(-50%)}}
@keyframes vnHurt{0%{transform:translateX(-50%)}20%{transform:translateX(-56%) rotate(-3deg)}45%{transform:translateX(-46%) rotate(2deg)}70%{transform:translateX(-52%)}100%{transform:translateX(-50%)}}
@keyframes vnBob{0%,100%{transform:translateX(-50%)}40%{transform:translateX(-50%) translateY(-10px)}}
.vn-stage.shake{animation:vnShake .4s}
@keyframes vnShake{0%,100%{transform:none}20%{transform:translate(-10px,4px)}40%{transform:translate(9px,-5px)}60%{transform:translate(-6px,3px)}80%{transform:translate(4px,-2px)}}
.vn-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}
.vn-flash.on{animation:vnFlash .35s}
@keyframes vnFlash{0%{opacity:.95}100%{opacity:0}}
.vn-top{position:absolute;top:10px;left:12px;right:12px;display:flex;gap:10px;align-items:center;pointer-events:none}
.vn-tag{background:rgba(20,24,44,.82);color:#fff;font:700 .74rem var(--f-mono);letter-spacing:.08em;text-transform:uppercase;padding:5px 10px;border-radius:6px}
.vn-tag.green{background:#18794e}
.vn-skip{pointer-events:auto;margin-left:8px;background:rgba(20,24,44,.82);color:#fff;border:1px solid rgba(255,255,255,.35);border-radius:6px;font:700 .74rem var(--f-body);padding:5px 10px;cursor:pointer}
.vn-hearts:not([hidden]) + .vn-skip{margin-left:8px}.vn-tag[hidden] ~ .vn-hearts[hidden] ~ .vn-skip{margin-left:auto}
.vn-hearts{margin-left:auto;display:flex;gap:4px;background:rgba(20,24,44,.82);padding:5px 9px;border-radius:6px}
.vn-hearts i{width:18px;height:16px;display:inline-block;background:#ff5d6c;clip-path:path("M9 15 1.5 7.6A4.3 4.3 0 0 1 9 2.6a4.3 4.3 0 0 1 7.5 5Z")}
.vn-hearts i.off{background:#5b5f77}
.vn-hearts i.lose{animation:vnLose .6s}
@keyframes vnLose{0%{transform:scale(1.6);background:#fff}100%{transform:scale(1)}}
.vn-box{position:absolute;left:2.5%;right:2.5%;bottom:3%;min-height:24%;background:rgba(18,22,40,.9);border:3px solid #e9e6ff;border-radius:10px;color:#fff;padding:22px 22px 14px;font:500 1.06rem/1.5 var(--f-body);cursor:pointer}
.vn-box.narr{background:rgba(250,248,240,.95);color:#2c2a26;border-color:#c9bfa8;font-style:italic}
.vn-box.testi .vn-text{color:#7dffa8}
.vn-name{position:absolute;top:-17px;left:16px;background:#6e56cf;color:#fff;font:800 .92rem var(--f-display);padding:3px 14px;border-radius:6px;border:2px solid #e9e6ff;letter-spacing:.02em}
.vn-name small{font:500 .7rem var(--f-body);opacity:.85;margin-left:6px}
.vn-next{position:absolute;right:16px;bottom:8px;font-size:.8rem;animation:vnBlink 1s infinite;opacity:.8}
@keyframes vnBlink{50%{opacity:0}}
.vn-burst{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none}
.vn-burst svg{width:min(70%,620px);animation:vnPop .9s ease-out forwards}
@keyframes vnPop{0%{transform:scale(.2) rotate(-8deg);opacity:0}12%{transform:scale(1.12) rotate(-4deg);opacity:1}22%{transform:scale(1) rotate(-4deg)}80%{opacity:1}100%{opacity:0;transform:scale(1.05) rotate(-4deg)}}
.vn-ctl{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 0;align-items:center}
.vn-ctl .btn{display:inline-flex;gap:8px;align-items:center}
.vn-ctl .sp{flex:1}
.vn-dots{display:flex;gap:6px}
.vn-dots i{width:10px;height:10px;border-radius:50%;background:var(--line2)}
.vn-dots i.on{background:#18794e}
.vn-dots i.seen{background:#7dc9a0}
.vn-choices{display:grid;gap:8px;margin-top:12px}
.vn-choices button{text-align:left;display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border:1.5px solid var(--line2);border-radius:8px;background:var(--panel);cursor:pointer;font-weight:600}
.vn-choices button:hover,.vn-choices button.sel{border-color:var(--accent);background:var(--accent-soft)}
.vn-panel{margin-top:12px}
.rec{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px}
.rec button{display:flex;gap:10px;align-items:flex-start;text-align:left;padding:10px;border:1.5px solid var(--line2);border-radius:8px;background:var(--panel);cursor:pointer}
.rec button:hover,.rec button.sel{border-color:var(--accent);background:var(--accent-soft)}
.rec .ico{flex:none;width:34px;height:34px;border-radius:7px;background:var(--accent-soft);display:flex;align-items:center;justify-content:center;font-size:1.1rem}
.rec b{display:block;font-size:.88rem}.rec span{font-size:.76rem;color:var(--muted)}
.exh{background:var(--panel);border:1.5px solid var(--line2);border-radius:10px;padding:14px 16px}
.exh h3{margin:0 0 2px;font:800 1rem var(--f-display)}
.exh .sub{color:var(--muted);font-size:.8rem;margin-bottom:10px}
.exh .ln{display:grid;grid-template-columns:170px 1fr;gap:10px;padding:7px 10px;border-radius:6px;border:1.5px solid transparent;cursor:pointer}
.exh .ln:hover{background:var(--accent-soft)}
.exh .ln.sel{border-color:var(--accent);background:var(--accent-soft)}
.exh .ln.hit{border-color:#18794e;background:var(--win-bg)}
.exh .ln .k{color:var(--muted)}
.exh .ln.full{grid-template-columns:1fr}
.exh table{width:100%;border-collapse:collapse;font-size:.86rem}
.exh th{font-size:.72rem;color:var(--muted);text-align:left;font-weight:600;padding:4px 8px}
.exh td{padding:8px;border-top:1px solid var(--line)}
.exh tr.ln{display:table-row}
.exh tr.ln td:first-child{font-weight:600}
.exh tr.ln.sel td{background:var(--accent-soft)}
.exh tr.ln.hit td{background:var(--win-bg)}
.exh .ctw.w{background:var(--win-bg);color:var(--win);font-weight:700}.exh .ctw.l{background:var(--loss-bg);color:var(--loss);font-weight:700}
.exh .grp td{background:var(--bg);font:700 .7rem var(--f-mono);letter-spacing:.06em;color:var(--muted);padding:4px 8px;border:0}
.exh .bd{display:grid;grid-template-columns:120px repeat(8,1fr);gap:3px;font-size:.72rem}
.exh .bd .h{color:var(--muted);text-align:center}
.exh .bd .r{color:var(--ink2);font-weight:600;align-self:center}
.exh .bd .c{border-radius:5px;padding:4px 6px;font-weight:600;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;border:1.5px solid var(--accent);background:var(--accent-soft);cursor:pointer}
.exh .bd .c.offer{border-color:var(--warn);background:var(--warn-bg)}
.exh .bd .c.sel{outline:3px solid var(--accent);outline-offset:1px}
.exh .bd .c.hit{outline:3px solid #18794e}
.exh .bd .fz{background:repeating-linear-gradient(135deg,var(--warn-bg) 0 4px,transparent 4px 8px);border-radius:4px}
.vn-hint{color:var(--muted);font-size:.8rem;margin-top:8px}
.vn-stage.compact{aspect-ratio:16/4.6;min-height:190px}
.vn-stage.compact .vn-actor{height:115%;bottom:-20%;left:13%}
.vn-stage.compact .vn-box{left:27%;min-height:0;bottom:10%;padding:16px 18px 12px}
.h2{font:800 1.15rem var(--f-display);margin:24px 0 8px}.h3{font:800 1rem var(--f-display);margin:18px 0 6px}
.kpi{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:8px 10px}
.vn-end{background:var(--panel);border:1.5px solid var(--line2);border-radius:12px;padding:18px 20px;margin-top:12px}
.vn-end h2{margin:0 0 6px;font:800 1.3rem var(--f-display)}
.vn-end .lesson{border-left:4px solid var(--accent);padding:6px 12px;background:var(--accent-soft);border-radius:0 8px 8px 0;margin:10px 0}
.bdscroll{overflow-x:auto}
@media (max-width:640px){.vn-stage{aspect-ratio:auto;height:min(440px,62svh);min-height:300px}.vn-actor{height:62%;bottom:34%}.vn-box{font-size:.95rem;padding:20px 14px 12px;min-height:32%}
  .exh{padding:12px}.exh .ln{grid-template-columns:1fr;gap:2px;padding:9px 10px}.exh .bd{grid-template-columns:96px repeat(8,minmax(56px,1fr));min-width:560px;font-size:.68rem}
  .exh .bd .c{padding:8px 6px}.exh .bd .r{position:sticky;left:0;background:var(--panel);z-index:2}
  .vn-panel .vn-ctl{position:sticky;bottom:0;background:var(--bg);padding:10px 0;margin-top:8px;z-index:3}
  .vn-ctl .vn-dots{order:-1;flex-basis:100%;justify-content:center}
  .vn-tag{font-size:.64rem}.vn-name{font-size:.84rem}
  .vn-stage.compact{height:210px;min-height:0}.vn-stage.compact .vn-actor{height:105%;bottom:-12%;left:15%}
  .vn-stage.compact .vn-box{left:33%;right:2%;bottom:6%;padding:14px 10px 8px;font-size:.84rem;min-height:0}}
`;
let styled = false;
function style() { if (styled) return; styled = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); }

// ---------- sound: text blips, the shout, a damage sting ----------
const audio = audioCtx;   // shared with app.mjs, resumed by the first tap (touch.mjs)
function beep(freq, dur, type = "square", vol = 0.03, at = 0) {
  const a = audio(); if (!a) return;
  const t = a.currentTime + at, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = freq; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol = 0.08) {
  const a = audio(); if (!a) return;
  const b = a.createBuffer(1, a.sampleRate * dur, a.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = a.createBufferSource(), g = a.createGain(); s.buffer = b; g.gain.value = vol; s.connect(g); g.connect(a.destination); s.start();
}

// ---------- the shouts: a jagged speech bubble ----------
const BURST = { objection: ["OBJECTION!", "#e8382f"], holdit: ["HOLD IT!", "#2f6fe8"], takethat: ["TAKE THAT!", "#e8382f"], gotcha: ["GOTCHA!", "#18794e"] };
function burstSVG(kind) {
  const [word, col] = BURST[kind] || BURST.objection;
  const pts = Array.from({ length: 26 }, (_, i) => { const a = (i / 26) * Math.PI * 2, r = i % 2 ? 0.78 : 1; return `${300 + Math.cos(a) * 290 * r},${150 + Math.sin(a) * 140 * r}`; }).join(" ");
  return `<svg viewBox="0 0 600 300"><polygon points="${pts}" fill="#fff" stroke="#111" stroke-width="10" stroke-linejoin="round"/>
    <text x="300" y="178" text-anchor="middle" font-family="Archivo,Impact,Arial" font-weight="800" font-size="${word.length > 9 ? 78 : 92}" fill="${col}" stroke="#111" stroke-width="5" paint-order="stroke" transform="skewX(-8)">${word}</text></svg>`;
}

// ---------- the stage ----------
export function createStage(root, deps) {
  style();
  root.innerHTML = `<div class="vn"><div class="vn-stage" id="vn-stage"><div class="vn-bg" id="vn-bg"></div><img class="vn-actor" id="vn-actor" alt="" hidden>
      <div class="vn-top"><span class="vn-tag" id="vn-tag" hidden></span><span class="vn-hearts" id="vn-hearts" hidden></span><button class="vn-skip" id="vn-skip" type="button" hidden>Skip talk ⏭</button></div>
      <div class="vn-box" id="vn-box" hidden><div class="vn-name" id="vn-name" hidden></div><div class="vn-text" id="vn-text"></div><span class="vn-next" id="vn-next" hidden>▼</span></div>
      <div class="vn-burst" id="vn-burst"></div><div class="vn-flash" id="vn-flash"></div></div>
    <div class="vn-ctl" id="vn-ctl"></div><div class="vn-panel" id="vn-panel"></div></div>`;
  const $ = (id) => root.querySelector("#" + id);
  const st = { who: null, face: null, onKey: null, typing: null, alive: true, voiceSeq: 0, audio: null, skip: false, finishNow: null };
  const skipBtn = root.querySelector("#vn-skip");
  const talk = (on) => { skipBtn.hidden = !on; };
  function skipTalk() { st.skip = true; talk(false); if (st.finishNow) st.finishNow(); }
  skipBtn.addEventListener("click", skipTalk);

  function bg(id) { $("vn-bg").innerHTML = SCENES[id] || ""; }
  function show(who, face = "calm", anim = "") {
    const a = $("vn-actor");
    if (!who) { a.hidden = true; st.who = null; return; }
    const changed = who !== st.who;
    a.src = art(who, FACES.includes(face) ? face : "calm"); a.hidden = false; a.alt = CAST[who] ? CAST[who].name : who;
    a.classList.remove("in", "hurt", "bob"); void a.offsetWidth;
    if (changed) a.classList.add("in"); else if (anim) a.classList.add(anim);
    st.who = who; st.face = face;
  }
  function tag(text, green) { const t = $("vn-tag"); t.hidden = !text; t.textContent = text || ""; t.classList.toggle("green", !!green); }
  function hearts(n, max = 5, lost = false) {
    const h = $("vn-hearts"); if (n == null) { h.hidden = true; return; }
    h.hidden = false; h.innerHTML = Array.from({ length: max }, (_, i) => `<i class="${i < n ? "" : "off"}${lost && i === n ? " lose" : ""}"></i>`).join("");
  }
  function shake() { const s = $("vn-stage"); s.classList.remove("shake"); void s.offsetWidth; s.classList.add("shake"); }
  function flash() { const f = $("vn-flash"); f.classList.remove("on"); void f.offsetWidth; f.classList.add("on"); }

  // one spoken line in the character's own Kokoro voice (when Voice is on); the text never waits for it
  function voice(who, text) {
    stopVoice();
    if (!deps.voOn() || !text) return;
    const my = ++st.voiceSeq, v = (CAST[who] || {}).voice || "af_heart";
    fetch(`/api/tb/tts?voice=${v}&text=` + encodeURIComponent(text.replace(/<[^>]+>/g, " "))).then((r) => r.ok ? r.blob() : null).then((b) => {
      if (!b || my !== st.voiceSeq || !st.alive) return;
      const url = URL.createObjectURL(b); playClip(url).then(() => URL.revokeObjectURL(url));
    }).catch(() => {});
  }
  function stopVoice() { st.voiceSeq++; stopClip(); }

  // type a line out; Enter finishes it, the next Enter moves on
  function say(who, text, opts = {}) {
    const box = $("vn-box"), nm = $("vn-name"), tx = $("vn-text"), nx = $("vn-next");
    clearInterval(st.typing); st.typing = null;
    const portrait = who && who !== "narr" && opts.show !== false && (who !== "you" || opts.face);   // your own lines stay off-stage unless you shout
    if (portrait && who !== st.who) show(who, opts.face || "calm");
    else if (portrait && opts.face && opts.face !== st.face) show(who, opts.face, opts.anim || "");
    box.hidden = false; box.className = "vn-box" + (who === "narr" ? " narr" : "") + (opts.testi ? " testi" : "");
    const c = CAST[who];
    nm.hidden = !c; nm.innerHTML = c ? `${c.name}${opts.role && c.role ? `<small>${c.role}</small>` : ""}` : "";
    nx.hidden = true; tx.innerHTML = "";
    if (st.skip && !opts.noWait) { tx.innerHTML = text; return Promise.resolve(); }   // skipping: show the line, don't wait
    if (!opts.noWait) talk(true);
    if (who && who !== "narr") voice(who, text);
    return new Promise((res) => {
      const plain = text.replace(/<[^>]+>/g, ""), pitch = (c && c.pitch) || 0;
      let i = 0;
      const fin = () => { clearInterval(st.typing); st.typing = null; tx.innerHTML = text; nx.hidden = !!opts.noNext; if (opts.noWait) res(); };
      st.typing = setInterval(() => {
        i += 1; tx.textContent = plain.slice(0, i);
        if (deps.soundOn() && i % 3 === 0 && /\w/.test(plain[i - 1] || "")) beep(330 * Math.pow(2, pitch / 12), 0.035, "square", 0.018);
        if (i >= plain.length) fin();
      }, opts.fast ? 12 : 24);
      if (opts.noWait) return;
      const go = () => { if (st.typing) { fin(); return true; } stopVoice(); st.finishNow = null; res(); return true; };
      st.finishNow = () => { if (st.typing) { clearInterval(st.typing); st.typing = null; tx.innerHTML = text; } stopVoice(); st.finishNow = null; res(); };
      st.onKey = (e) => (e.key === "Enter" || e.key === " ") ? go() : false;
      box.onclick = () => { if (st.onKey) st.onKey({ key: "Enter" }); };
    });
  }
  async function burst(kind, who = "you") {
    stopVoice();
    const b = $("vn-burst"); b.innerHTML = burstSVG(kind);
    if (deps.soundOn()) { noise(0.25, 0.09); beep(180, 0.28, "sawtooth", 0.05); beep(240, 0.22, "square", 0.03, 0.06); }
    if (deps.voOn()) voice(who, (BURST[kind] || BURST.objection)[0].replace("!", "") + "!");
    shake(); flash();
    await wait(950); b.innerHTML = "";
  }
  function hurt(who, face = "fear") { show(who || st.who, face, "hurt"); shake(); if (deps.soundOn()) { beep(520, 0.08, "square", 0.04); beep(260, 0.25, "sawtooth", 0.04, 0.08); } }
  function sting(good) { if (!deps.soundOn()) return; good ? [523, 659, 784, 1046].forEach((f, k) => beep(f, 0.18, "triangle", 0.05, k * 0.09)) : [220, 185].forEach((f, k) => beep(f, 0.25, "sine", 0.06, k * 0.14)); }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // run a script: [{bg}, {s:who, f:face, t:text}, {burst, by}, {hurt:who, f}, {show:who, f}, {narr:text}, {tag}]
  async function run(steps) {
    for (const x of steps || []) {
      if (!st.alive) return;
      if (x.bg) bg(x.bg);
      if (x.tag !== undefined) tag(x.tag);
      if (x.show !== undefined) show(x.show, x.f);
      if (x.burst) await burst(x.burst, x.by || "you");
      if (x.hurt) hurt(x.hurt, x.f);
      if (x.sting !== undefined) sting(x.sting);
      if (x.wait && !st.skip) await wait(x.wait);
      if (x.narr) await say("narr", x.narr);
      if (x.t) await say(x.s, x.t, { face: x.f, anim: x.anim, role: x.role });
    }
  }

  // numbered choices under the stage; resolves with the index
  function choose(q, opts, { hold } = {}) {
    st.skip = false; talk(false);
    const p = $("vn-panel");
    p.innerHTML = `${q ? `<div class="gq">${q}</div>` : ""}<div class="vn-choices">${opts.map((o, i) => `<button type="button" data-i="${i}"><span class="kbd">${i + 1}</span><span>${o}</span></button>`).join("")}</div>`;
    return new Promise((res) => {
      const pick = (i) => { if (i < 0 || i >= opts.length) return false; if (!hold) p.innerHTML = ""; st.onKey = null; res(i); return true; };
      p.querySelectorAll("[data-i]").forEach((b) => b.addEventListener("click", () => pick(+b.dataset.i)));
      st.onKey = (e) => /^[1-9]$/.test(e.key) ? pick(+e.key - 1) : false;
    });
  }

  // the court record: pick an exhibit (number keys), then a line in it (arrows + Enter, or click). Resolves {ev, line} or null.
  function record(evidence, { title = "Court record", ask = "Pick the exhibit, then the exact line that proves it.", cancel = true } = {}) {
    st.skip = false; talk(false);
    const p = $("vn-panel");
    return new Promise((res) => {
      const list = () => {
        p.innerHTML = `<div class="gq"><b>${title}.</b> ${ask}</div><div class="rec">${evidence.map((e, i) =>
          `<button type="button" data-e="${i}"><span class="ico">${e.icon || "📄"}</span><span><b><span class="kbd">${i + 1}</span> ${e.name}</b><span>${e.desc || ""}</span></span></button>`).join("")}</div>
          ${cancel ? `<div class="vn-ctl"><button class="btn" type="button" id="vn-cancel"><span class="kbd">Backspace</span> Back to the testimony</button></div>` : ""}`;
        p.querySelectorAll("[data-e]").forEach((b) => b.addEventListener("click", () => open(+b.dataset.e)));
        const cx = p.querySelector("#vn-cancel"); if (cx) cx.addEventListener("click", () => { p.innerHTML = ""; st.onKey = null; res(null); });
        if (TOUCH) p.scrollIntoView({ block: "start", behavior: "smooth" });
        st.onKey = (e) => {
          if (/^[1-9]$/.test(e.key) && +e.key <= evidence.length) { open(+e.key - 1); return true; }
          if (cancel && (e.key === "Backspace" || e.key === "Escape")) { p.innerHTML = ""; st.onKey = null; res(null); return true; }
          return false;
        };
      };
      const open = (i) => {
        const ev = evidence[i];
        let sel = 0;
        const solo = evidence.length === 1 && !cancel;
        p.innerHTML = (solo ? `<div class="gq"><b>${title}.</b> ${ask}</div>` : "") + exhibitHTML(ev) + `<div class="vn-ctl"><button class="btn primary" type="button" id="vn-present"><span class="kbd">Enter</span> ${solo ? "This line" : "Present this line"}</button>
          ${solo ? "" : `<button class="btn" type="button" id="vn-back"><span class="kbd">Backspace</span> Other exhibits</button>`}<span class="vn-hint"><span class="keys-only">↑ ↓ pick the line, or click it</span><span class="touch-only">Tap a line to pick it</span></span></div>`;
        const lines = [...p.querySelectorAll("[data-ln]")];
        const mark = () => lines.forEach((l, k) => l.classList.toggle("sel", k === sel));
        lines.forEach((l, k) => l.addEventListener("click", () => { sel = k; mark(); }));
        lines.forEach((l, k) => l.addEventListener("dblclick", () => { sel = k; present(); }));
        mark();
        if (TOUCH) p.scrollIntoView({ block: "start", behavior: "smooth" });   // the stage fills a phone; bring the exhibit up
        const present = () => { const id = lines[sel] && lines[sel].dataset.ln; st.onKey = null; const c = p.querySelector(".vn-ctl"); if (c) c.remove(); res({ ev: ev.id, line: id, el: lines[sel] }); };
        p.querySelector("#vn-present").addEventListener("click", present);
        if (!solo) p.querySelector("#vn-back").addEventListener("click", list);
        st.onKey = (e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowRight") { sel = Math.min(lines.length - 1, sel + 1); mark(); return true; }
          if (e.key === "ArrowUp" || e.key === "ArrowLeft") { sel = Math.max(0, sel - 1); mark(); return true; }
          if (e.key === "Enter") { present(); return true; }
          if (!solo && (e.key === "Backspace" || e.key === "Escape")) { list(); return true; }
          return false;
        };
      };
      if (evidence.length === 1 && !cancel) open(0); else list();
    });
  }

  return {
    root, bg, show, tag, hearts, shake, flash, say, burst, hurt, sting, run, choose, record, wait, voice, stopVoice,
    panel: (html) => { $("vn-panel").innerHTML = html || ""; return $("vn-panel"); },
    ctl: (html) => { if (html) { st.skip = false; talk(false); } $("vn-ctl").innerHTML = html || ""; return $("vn-ctl"); },
    hideBox: () => { $("vn-box").hidden = true; },
    hideStage: (h = true) => { $("vn-stage").hidden = h; },
    compact: (on = true) => { $("vn-stage").classList.toggle("compact", on); },
    set onKey(f) { st.onKey = f; }, get onKey() { return st.onKey; },
    key(e) { if (e.key === "Enter" && e.shiftKey && !skipBtn.hidden) { skipTalk(); return true; } return st.onKey ? !!st.onKey(e) : false; },
    stop() { st.alive = false; clearInterval(st.typing); stopVoice(); st.onKey = null; st.finishNow = null; },
    get alive() { return st.alive; },
  };
}

// ---------- exhibits: every line has an id (data-ln) so it can be presented ----------
const fmtPct = (x) => (x > 0.05 ? "+" : x < -0.05 ? "−" : "") + Math.abs(x).toFixed(1) + "%";
function ciBar(lo, hi, pct, span = 40, better = "up") {
  const X = (v) => 10 + ((Math.max(-span, Math.min(span, v)) + span) / (2 * span)) * 180;
  const good = better === "up" ? lo > 0 : hi < 0, bad = better === "up" ? hi < 0 : lo > 0;
  const col = good ? "#18794e" : bad ? "#ce2c31" : "#a5a9c2";
  return `<svg viewBox="0 0 200 22" width="150" height="18"><line x1="${X(0)}" y1="1" x2="${X(0)}" y2="21" stroke="#6b7399" stroke-dasharray="2 2"/><rect x="${X(lo)}" y="7" width="${Math.max(3, X(hi) - X(lo))}" height="8" rx="4" fill="${col}"/><circle cx="${X(pct)}" cy="11" r="4" fill="#fff" stroke="${col}" stroke-width="2"/></svg>`;
}
export function exhibitHTML(ev) {
  const head = (ev.title || ev.name ? `<h3>${ev.icon || ""} ${ev.title || ev.name}</h3>` : "") + (ev.sub ? `<div class="sub">${ev.sub}</div>` : "");
  if (ev.kind === "results") {
    const row = (r) => {
      const ctw = r.better === "down" ? 1 - r.ctwUp : r.ctwUp;
      const cls = ctw >= 0.95 ? "w" : ctw <= 0.05 ? "l" : "";
      return `<tr class="ln" data-ln="${r.id}"><td>${r.name}</td><td class="c-a" data-l="Baseline (A)">${r.a}<br><small class="muted">${r.subA || ""}</small></td><td class="c-b" data-l="Variation (B)">${r.b}<br><small class="muted">${r.subB || ""}</small></td>
        <td class="c-ctw ctw ${cls}" data-l="Chance to Win">${ctw >= 0.999 ? ">99.9%" : ctw < 0.001 ? "<0.1%" : (ctw * 100).toFixed(1) + "%"}</td><td class="c-ci" data-l="CI graph">${ciBar(r.lo, r.hi, r.pct, r.span || 40, r.better)}</td><td class="c-pct" data-l="% Change">${fmtPct(r.pct)}</td></tr>`;
    };
    return `<div class="exh">${head}<table class="stack"><tr class="th"><th>Metric</th><th>Baseline (A)</th><th>Variation (B)</th><th>Chance to Win</th><th>CI graph</th><th>% Change</th></tr>
      ${ev.goal ? `<tr class="grp"><td colspan="6">GOAL METRICS</td></tr>${ev.goal.map(row).join("")}` : ""}
      ${ev.guard && ev.guard.length ? `<tr class="grp"><td colspan="6">GUARDRAIL METRICS</td></tr>${ev.guard.map(row).join("")}` : ""}
      ${ev.other && ev.other.length ? `<tr class="grp"><td colspan="6">OTHER METRICS</td></tr>${ev.other.map(row).join("")}` : ""}</table>
      ${(ev.lines || []).map((l) => `<div class="ln${l.k ? "" : " full"}" data-ln="${l.id}">${l.k ? `<span class="k">${l.k}</span>` : ""}<span>${l.v}</span></div>`).join("")}</div>`;
  }
  if (ev.kind === "board") {
    const weeks = ev.weeks || ["Oct 26", "Nov 2", "Nov 9", "Nov 16", "Nov 23", "Nov 30", "Dec 7", "Dec 14"];
    let g = `<div></div>${weeks.map((w) => `<div class="h">${w}</div>`).join("")}`;
    ev.rows.forEach((name, r) => {
      g += `<div class="r" style="grid-row:${r + 2}">${name}</div>`;
      (ev.freeze || []).forEach((w) => { g += `<div class="fz" style="grid-row:${r + 2};grid-column:${w + 2}"></div>`; });
      ev.cards.filter((c) => c.row === r).forEach((c) => { g += `<div class="c${c.offer ? " offer" : ""}" data-ln="${c.id}" title="${c.name}" style="grid-row:${r + 2};grid-column:${c.start + 2} / span ${c.len}">${c.name}</div>`; });
    });
    return `<div class="exh">${head}<div class="bdscroll"><div class="bd">${g}</div></div>${(ev.lines || []).map((l) => `<div class="ln${l.k ? "" : " full"}" data-ln="${l.id}">${l.k ? `<span class="k">${l.k}</span>` : ""}<span>${l.v}</span></div>`).join("")}</div>`;
  }
  return `<div class="exh">${head}${ev.lines.map((l) => `<div class="ln${l.k ? "" : " full"}" data-ln="${l.id}">${l.k ? `<span class="k">${l.k}</span>` : ""}<span>${l.v}</span></div>`).join("")}</div>`;
}
