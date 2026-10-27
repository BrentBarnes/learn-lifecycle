// The public site's corner buttons (games/shared/PUBLIC-RELEASE.md), added to every top-level page by the public build:
//   Make a suggestion: a bug, an idea, feedback or anything else. It goes to the repo's GitHub issues, through the
//     site's /api/feedback function when the host has one (api/feedback.js on Vercel), or as a prefilled GitHub issue
//     the player posts themselves. Nothing is sent until they press Send.
//   Save file: download every save on this site (browser storage and the Lifecycle Files engine's IndexedDB) as one
//     JSON file, or load one back, for a new browser or a cleared one. The games already save to the browser after every
//     answer; a "✓ Saved" light shows each time, and the first save asks the browser to keep the site's storage.
// Not shown inside the office's frames: the office page has its own. While the page shows an element with
// data-siteslot (the office's desk headers), the buttons sit inside it instead of floating over the corner.
import * as T from "./prompt.mjs";   // the prompt request template, shared with the contribute page
const REPO = "BrentBarnes/lifecycle-practice";
const KINDS = [
  { id: "bug", icon: "🐞", name: "Bug", hint: "Something broke or looks wrong", label: "bug", ask: "What happened, and what did you expect?" },
  { id: "idea", icon: "💡", name: "Feature idea", hint: "Something the game should do", label: "idea", ask: "What would you like the game to do?" },
  { id: "feedback", icon: "💬", name: "Feedback", hint: "What worked, what didn't", label: "feedback", ask: "What did you think?" },
  { id: "other", icon: "✳️", name: "Something else", hint: "Anything at all", label: "other", ask: "What's on your mind?" },
  { id: "prompt", icon: "🤖", name: "Prompt request", hint: "Ask for a change, written so an AI coding agent can build it", label: "prompt", ask: "" },
];
const IDB = "/state";   // Pyodide's IDBFS database (lifecycle-files/static-api.js mounts it at /state)

// Every page and frame (the office's desks are frames running this too): collect errors for the suggestion box, and
// tell the top page when a game saves, so its light can show it.
const ERRS = (window.__siteErrors = window.__siteErrors || []);
const logErr = (msg, file, line) => { ERRS.push({ msg: String(msg || "error").slice(0, 200), at: file ? `${String(file).split("/").pop().split("?")[0]}:${line || 0}` : "", t: Date.now() }); if (ERRS.length > 20) ERRS.shift(); };
addEventListener("error", (e) => logErr(e.message, e.filename, e.lineno));
addEventListener("unhandledrejection", (e) => logErr((e.reason && e.reason.message) || e.reason));
const SAVE_KEY = /^(office-office|tb3(-|$))/;   // office.mjs's and Test Board's saves in browser storage
const savedNow = () => { try { if (window.top.__siteSaved) window.top.__siteSaved(); } catch (e) { /* not ours */ } };
const setItem = Storage.prototype.setItem;
Storage.prototype.setItem = function (k, val) { setItem.call(this, k, val); if (SAVE_KEY.test(k)) savedNow(); };
if (window.LF_PUBLIC) {   // Lifecycle Files saves inside its engine: an answer is a POST to /api/lf, written to IndexedDB 300 ms later
  const f = window.fetch;
  window.fetch = (u, o) => { const p = f(u, o); if (o && o.method && o.method.toUpperCase() !== "GET" && String(u && u.url || u).includes("/api/lf/")) p.then(() => setTimeout(savedNow, 500), () => {}); return p; };
}

if (window.top === window && !document.getElementById("sitebar")) mount();

function mount() {
  const css = document.createElement("style");
  css.textContent = `
  #sitebar{position:fixed;top:10px;right:12px;z-index:9000;display:flex;gap:6px;font:600 12.5px/1 Inter,system-ui,sans-serif}
  #sitebar button{font:inherit;background:#fffffff2;color:#22202a;border:1px solid #d6d2cb;border-radius:999px;padding:7px 12px;cursor:pointer;box-shadow:0 2px 8px #0002}
  #sitebar button:hover{border-color:#6e56cf}
  #sitebar.docked{position:static;font-size:12px}#sitebar.docked button{box-shadow:none;padding:6px 10px}
  #sitebar .menu{position:absolute;top:36px;right:0;background:#fff;border:1px solid #d6d2cb;border-radius:10px;box-shadow:0 8px 24px #0003;padding:6px;display:flex;flex-direction:column;gap:2px;min-width:220px}
  #sitebar .menu[hidden]{display:none}
  #sitebar .menu button{box-shadow:none;border:0;border-radius:6px;text-align:left;padding:9px 10px;background:none}
  #sitebar .menu button:hover{background:#f1eefb}
  #sitebar .menu small{display:block;font-weight:400;color:#6b6873;margin-top:3px}
  #sitebar .menu .msg{font-weight:400;color:#2f7d4f;padding:6px 10px;font-size:12px}
  .sbveil{position:fixed;inset:0;z-index:9500;background:#16131bb3;display:grid;place-items:center;padding:16px;font:14px/1.5 Inter,system-ui,sans-serif;color:#22202a}
  .sbbox{background:#fffdf8;border-radius:14px;box-shadow:0 16px 48px #0006;width:min(540px,100%);max-height:calc(100vh - 32px);overflow:auto;padding:20px 22px;display:flex;flex-direction:column;gap:12px}
  .sbbox h2{margin:0;font-size:19px}.sbbox p{margin:0}.sbbox .mut{color:#6b6873;font-size:12.5px}
  .sbkinds{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .sbkinds button{font:inherit;text-align:left;background:#fff;border:1.5px solid #e2ddd4;border-radius:10px;padding:10px 12px;cursor:pointer;display:flex;gap:10px;align-items:flex-start;color:inherit}
  .sbkinds button b{display:block;font-size:14px}.sbkinds button small{color:#6b6873;font-size:12px}
  .sbkinds button .ic{font-size:20px;line-height:1}
  .sbkinds button[data-k="prompt"]{grid-column:1/-1}
  .sbfields .hint{margin:0;font-size:12.5px;color:#4a4752;background:#f1eefb;border-radius:8px;padding:8px 10px}
  .sbfields fieldset{border:0;padding:0;margin:0;display:flex;flex-direction:column;gap:6px}
  .sbfields legend,.sbfields .fld>span{font-size:13.5px;font-weight:600;padding:0;margin-bottom:6px}
  .sbfields .fld{display:flex;flex-direction:column}
  .sbfields .chips{display:flex;flex-wrap:wrap;gap:6px}
  .sbfields .chips label{display:inline-flex;gap:5px;align-items:center;border:1.5px solid #e2ddd4;border-radius:999px;padding:5px 11px;font-size:13px;cursor:pointer;background:#fff}
  .sbfields .chips label small{color:#8a8792;font-size:11.5px}
  .sbfields .chips label:has(input:checked){border-color:#6e56cf;background:#f1eefb}
  .sbfields .chips input{position:absolute;opacity:0;pointer-events:none}.sbfields .chips label:focus-within{outline:2px solid #6e56cf88;outline-offset:1px}
  .sbbox .sbfields textarea{min-height:0;font-weight:400}.sbbox .sbfields textarea[name="what"]{min-height:84px}
  .sbfields details summary{cursor:pointer;color:#5a44b8;font-size:12.5px}
  .sbfields pre{white-space:pre-wrap;word-break:break-word;max-height:180px;overflow:auto;background:#22202a;color:#efeaf7;border-radius:8px;padding:10px;margin:6px 0 0;font:11.5px/1.5 ui-monospace,monospace}
  .sbkinds button:hover{border-color:#b3a6e6}.sbkinds button.on{border-color:#6e56cf;background:#f1eefb}
  .sbbox textarea,.sbbox input[type=text]{font:inherit;width:100%;box-sizing:border-box;border:1.5px solid #e2ddd4;border-radius:8px;padding:9px 10px;background:#fff;color:inherit}
  .sbbox textarea{min-height:120px;resize:vertical}
  .sbbox textarea:focus,.sbbox input:focus{outline:2px solid #6e56cf55;border-color:#6e56cf}
  .sbbox label.ck{display:flex;gap:8px;align-items:flex-start;font-size:13px;color:#4a4752}
  .sbrow{display:flex;gap:8px;justify-content:flex-end;align-items:center;flex-wrap:wrap}
  .sbrow .sp{flex:1}
  .sbbtn{font:600 14px Inter,system-ui,sans-serif;border-radius:8px;padding:9px 16px;cursor:pointer;border:1.5px solid #6e56cf;background:#6e56cf;color:#fff}
  .sbbtn.alt{background:#fff;color:#22202a;border-color:#d6d2cb}.sbbtn:disabled{opacity:.5;cursor:default}
  .sbbox a{color:#5a44b8}
  .sbhp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
  .sbdone{background:#e3f5ec;border-radius:8px;padding:10px 12px;color:#1f5f3f}
  .sbfields{display:flex;flex-direction:column;gap:10px}.sbpick{margin:0}
  .sbq{display:flex;flex-direction:column;gap:5px;font-size:13.5px;font-weight:600}.sbq small{font-weight:400;color:#8a8792}
  .sbq textarea{min-height:0;font-weight:400}.sbq textarea[data-f="0"]{min-height:96px}
  .sbseg{display:flex;gap:6px;flex-wrap:wrap}
  .sbseg button{font:500 13px Inter,system-ui,sans-serif;background:#fff;color:inherit;border:1.5px solid #e2ddd4;border-radius:999px;padding:6px 12px;cursor:pointer}
  .sbseg button.on{border-color:#6e56cf;background:#f1eefb}
  .sbat{display:flex;flex-direction:column;gap:6px;background:#f6f3ec;border-radius:10px;padding:10px 12px}
  .sbat details{font-size:12.5px;color:#4a4752}.sbat summary{cursor:pointer;color:#5a44b8}
  .sbat pre{white-space:pre-wrap;word-break:break-word;max-height:200px;overflow:auto;background:#fff;border:1px solid #e2ddd4;border-radius:6px;padding:8px;margin:6px 0 0;font:11.5px/1.45 ui-monospace,monospace}
  .sbbox textarea:disabled,.sbbox input:disabled{background:#f4f2ee;color:#6b6873}
  #sitebar .ok{align-self:center;font-weight:600;color:#1f6f45;background:#e3f5ecf2;border-radius:999px;padding:6px 10px;opacity:0;transition:opacity .4s;pointer-events:none}
  #sitebar .ok.on{opacity:1}#sitebar.docked .ok{padding:4px 8px}
  #sitebar .menu .info{font-weight:400;color:#4a4752;padding:8px 10px 6px;font-size:12px;line-height:1.45;border-bottom:1px solid #eee;margin-bottom:4px}
  .sberr{background:#fbe7e4;border-radius:8px;padding:10px 12px;color:#8a2a20}
  @media (max-width:520px){.sbkinds{grid-template-columns:1fr}#sitebar{top:auto;bottom:10px}#sitebar .menu{top:auto;bottom:36px}}`;
  document.head.appendChild(css);
  const bar = document.createElement("div");
  bar.id = "sitebar";
  bar.innerHTML = `<span class="ok" id="sbok" aria-live="polite">✓ Saved</span><div style="position:relative"><button type="button" id="sbsave" title="Your progress saves by itself. Download a backup, or load one">💾 Save file</button>
      <div class="menu" id="sbmenu" hidden>
        <div class="info">Your progress saves by itself in this browser after every answer. A save file is a backup copy: keep one, or use it to move to another browser.<br><span id="sblast"></span></div>
        <button type="button" id="sbdown">Download my save<small>Every game's progress, as one file</small></button>
        <button type="button" id="sbup">Load a save file<small>Replaces the progress in this browser</small></button>
        <input type="file" id="sbfile" accept="application/json,.json" hidden><div class="msg" id="sbmsg" hidden></div>
      </div></div>
    <button type="button" id="sbsug">Make a suggestion</button>`;
  calm(bar);
  document.body.appendChild(bar);
  const dock = () => {
    const slot = [...document.querySelectorAll("[data-siteslot]")].find((n) => n.offsetParent !== null);
    const home = slot || document.body;
    if (bar.parentNode !== home) home.appendChild(bar);
    bar.classList.toggle("docked", !!slot);
  };
  let queued = false;
  new MutationObserver(() => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; dock(); }); } })
    .observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
  dock();
  const menu = bar.querySelector("#sbmenu");
  bar.querySelector("#sbsave").onclick = () => { menu.hidden = !menu.hidden; bar.querySelector("#sbmsg").hidden = true; lastBackup(); };
  const lastBackup = () => {
    let t = null; try { t = localStorage.getItem("site-last-backup"); } catch (e) { /* blocked */ }
    const days = t ? Math.floor((Date.now() - Date.parse(t)) / 864e5) : null;
    bar.querySelector("#sblast").textContent = days === null ? "Last backup: none yet." : `Last backup: ${days < 1 ? "today" : days === 1 ? "yesterday" : days + " days ago"}.`;
  };
  let okT = 0, asked = false;
  window.__siteSaved = () => {
    const ok = bar.querySelector("#sbok"); ok.classList.add("on"); clearTimeout(okT); okT = setTimeout(() => ok.classList.remove("on"), 1600);
    // ask once to keep this site's storage when space runs low (Chrome and Safari decide quietly; Firefox would prompt, so not there)
    if (!asked && navigator.storage && navigator.storage.persist && !/Firefox\//.test(navigator.userAgent)) { asked = true; navigator.storage.persisted().then((p) => p || navigator.storage.persist()).catch(() => {}); }
  };
  document.addEventListener("click", (e) => { if (!bar.contains(e.target)) menu.hidden = true; });
  bar.querySelector("#sbdown").onclick = () => download().then(() => { try { localStorage.setItem("site-last-backup", new Date().toISOString()); } catch (e) { /* blocked */ } lastBackup(); note("Downloaded."); }, (e) => note("Couldn't read the saves: " + e.message));
  bar.querySelector("#sbup").onclick = () => bar.querySelector("#sbfile").click();
  bar.querySelector("#sbfile").onchange = (e) => { const f = e.target.files[0]; if (f) f.text().then(restore).then(() => { note("Loaded. Reloading…"); setTimeout(() => location.reload(), 600); }, (err) => note("That file didn't load: " + err.message)); };
  bar.querySelector("#sbsug").onclick = suggest;
  const note = (t) => { const m = bar.querySelector("#sbmsg"); m.textContent = t; m.hidden = false; };
}

// the games listen for keys and clicks on the whole page (and grab focus for their own keys): keep ours to ourselves
function calm(el) { for (const t of ["keydown", "keyup", "keypress", "mousedown", "mouseup", "click", "pointerdown"]) el.addEventListener(t, (e) => e.stopPropagation()); }
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// ---------- Make a suggestion ----------
// The box snapshots where the player is the moment it opens (the game, the step on screen, a review link that reopens
// that spot, their progress, browser family, recent errors, the screen's text) and asks only for what it can't see.
// Nothing personal: no IP, no full user agent, no saves. Email addresses typed anywhere are removed before sending.
// The player sees exactly what gets attached and can leave it off.
const GAMES = [["/office/", "The Fernhill office"], ["/lifecycle-files/", "Lifecycle Files"], ["/test-board/", "The Test Board"], ["/contribute/", "The contribute page"]];
const gameOf = (path) => (GAMES.find(([p]) => path.startsWith(p)) || [null, "The home page"])[1];
const shown = (el) => !!el && el.offsetParent !== null;
const flat = (s) => String(s || "").replace(/\s+/g, " ").trim();
const scrub = (s) => String(s || "").replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "[email removed]");
function headings(doc) {
  const out = [];
  for (const el of doc.querySelectorAll(".veil h3, #title, .hud .u, h1, h2, h3")) {
    const t = shown(el) ? flat(el.textContent) : "";
    if (t && t.length < 140 && !out.includes(t) && !/^Made-up numbers/.test(t)) out.push(t);
    if (out.length >= 4) break;
  }
  return out;
}
function screenText(doc) {
  const parts = [...doc.querySelectorAll(".veil")].filter(shown).map((v) => v.innerText);
  const app = doc.querySelector("#app, main, #sheet") || doc.body;
  if (app) parts.push(app.innerText);
  return parts.join("\n").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim().slice(0, 1500);
}
function browser() {
  const u = navigator.userAgent, m = (re) => (u.match(re) || [])[1];
  const name = m(/Edg\/(\d+)/) ? `Edge ${m(/Edg\/(\d+)/)}` : m(/OPR\/(\d+)/) ? `Opera ${m(/OPR\/(\d+)/)}` : m(/Firefox\/(\d+)/) ? `Firefox ${m(/Firefox\/(\d+)/)}`
    : m(/Chrome\/(\d+)/) ? `Chrome ${m(/Chrome\/(\d+)/)}` : m(/Version\/(\d+)[\d.]* .*Safari/) ? `Safari ${m(/Version\/(\d+)/)}` : "another browser";
  const os = /iPhone|iPad/.test(u) ? "iOS" : /Android/.test(u) ? "Android" : /CrOS/.test(u) ? "ChromeOS" : /Windows/.test(u) ? "Windows" : /Mac OS X/.test(u) ? "macOS" : /Linux/.test(u) ? "Linux" : "another system";
  return `${name} on ${os}${/Mobi/.test(u) ? " (phone)" : ""}, ${innerWidth}×${innerHeight} window`;
}
const readLS = (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } };
const ROLE_NAMES = { analytics: "Analytics", data: "Data", testing: "Testing" };
function snapshot() {
  const path = location.pathname, at = { game: gameOf(path), place: headings(document), page: path + location.search, review: "", progress: "" };
  let doc = document, errs = [...ERRS];
  if (path.startsWith("/office/")) {
    let dev = false; try { dev = localStorage.getItem("office-dev") === "1"; } catch (e) { /* blocked */ }
    const O = readLS(dev ? "office-office-dev" : "office-office") || {}, today = O.today || {};
    const roles = Object.keys(ROLE_NAMES).filter((r) => O.roles && O.roles[r]).map((r) => ROLE_NAMES[r]);
    if (O.hired) at.progress = `Office day ${O.day || 1}${roles.length ? `, clocked in for ${roles.join(" and ")}` : ""}${dev ? " (practice save)" : ""}`;
    const desk = document.getElementById("desk");
    if (desk && !desk.hidden) {
      const head = desk.querySelector("header");
      at.place = [flat(head && head.querySelector("b") && head.querySelector("b").textContent), flat(head && head.querySelector(".tool") && head.querySelector(".tool").textContent)].filter(Boolean);
      const fr = desk.querySelector("iframe");
      let role = null, id = null;
      if (fr) {
        const q = new URL(fr.src, location.href).searchParams;
        if (fr.src.includes("lifecycle-files")) { role = "analytics"; id = q.get("step"); } else { role = "testing"; id = q.get("embed"); }
        try { doc = fr.contentDocument; at.place.push(...headings(doc).filter((t) => !at.place.includes(t))); errs = errs.concat(fr.contentWindow.__siteErrors || []); } catch (e) { /* not ours */ }
      } else if (/sql/i.test(at.place.join(" "))) { role = "data"; id = today.sql; }
      if (role && id) at.review = `${location.origin}/office/?dev&try=${role}:${encodeURIComponent(id)}`;
      at.where = role || "office";
    } else { at.place = [`In the office room${O.hired ? `, day ${O.day || 1}` : ", before picking roles"}`]; at.where = "office"; }
  } else if (path.startsWith("/lifecycle-files/")) {
    const r = typeof R !== "undefined" ? R : null;   // path.js's sitting on screen (a classic script's global)
    at.where = "analytics";
    if (r && r.sid) at.review = `${location.origin}/lifecycle-files/?start=step&step=${encodeURIComponent(r.sid)}&profile=office-dev`;
  } else if (path.startsWith("/test-board/")) {
    const S = readLS("tb3"); at.where = "testing";
    if (S && S.units) at.progress = `${Object.values(S.units).filter((u) => u && u.passed).length} Test Board steps passed`;
  }
  const bar = document.getElementById("sitebar"), was = bar && bar.style.display;
  if (bar) bar.style.display = "none";   // our own buttons aren't part of the screen
  at.place = at.place.filter((t, i, a) => !a.some((o, j) => j !== i && o.length > t.length && o.includes(t)));   // no repeats
  at.screen = screenText(doc);
  if (bar) bar.style.display = was;
  at.errors = errs.sort((a, b) => a.t - b.t).slice(-5).map((e) => `${e.msg}${e.at ? ` (${e.at})` : ""}`);
  at.browser = browser();
  return at;
}
const cell = (s) => scrub(s).replace(/\|/g, "\\|").replace(/\n/g, " ");
const fence = (s) => "~~~\n" + scrub(s).replace(/~{3,}/g, "~ ~ ~") + "\n~~~";
function contextMd(at) {
  const rows = [["Game", at.game], ["Place", at.place.join(" › ")], ["Try it", at.review && `[open this spot in the game](${at.review})`], ["Progress", at.progress],
    ["Browser", at.browser], ["Page", at.page && "`" + at.page.replace(/`/g, "") + "`"]].filter(([, v]) => v);
  return `<details><summary>Where they were in the game (attached automatically)</summary>\n\n| | |\n|---|---|\n${rows.map(([k, v]) => `| ${k} | ${k === "Try it" || k === "Page" ? v : cell(v)} |`).join("\n")}\n` +
    (at.errors.length ? `\n**Recent errors on the page**\n\n${fence(at.errors.join("\n"))}\n` : "") +
    (at.screen ? `\n**What the screen showed**\n\n${fence(at.screen)}\n` : "") + "\n</details>";
}
function contextText(at) {
  return [`Game: ${at.game}`, at.place.length && `Place: ${at.place.join(" › ")}`, at.review && `Link to this spot: ${at.review}`, at.progress && `Progress: ${at.progress}`,
    `Browser: ${at.browser}`, `Page: ${at.page}`, at.errors.length && `Recent errors:\n${at.errors.join("\n")}`, at.screen && `What the screen showed:\n${at.screen}`]
    .filter(Boolean).map(scrub).join("\n");
}

// what each kind asks for: the first box is required, the rest help
const ASK = {
  bug: [["What happened?", "The step froze after I pressed Next, or: the chart and the answer disagree"], ["What did you expect to happen?", ""], ["What were you doing right before it?", "Clicked, typed, pressed a key…"]],
  idea: [["What would you like the game to do?", ""], ["What would it help you learn or do?", ""]],
  feedback: [["What did you think?", "What worked, what didn't, what confused you"]],
  other: [["What's on your mind?", ""]],
};
const LABELS = { bug: ["What happened", "What they expected", "What they were doing right before"], idea: ["The idea", "What it would help with"], feedback: ["Feedback"], other: ["Message"] };

function suggest() {
  const at = snapshot();   // before the box covers anything
  const v = document.createElement("div");
  v.className = "sbveil";
  v.innerHTML = `<form class="sbbox" autocomplete="off" novalidate>
    <h2>Make a suggestion</h2>
    <p class="mut">It goes to the game's public issue list on GitHub, where anyone can read it. Please leave out anything private. Want to help build it? <a href="/contribute/" target="_blank" rel="noopener">Here's how</a>.</p>
    <div class="sbkinds">${KINDS.map((k) => `<button type="button" data-k="${k.id}" aria-pressed="false"><span class="ic">${k.icon}</span><span><b>${k.name}</b><small>${k.hint}</small></span></button>`).join("")}</div>
    <div id="sbfields" class="sbfields"><p class="mut sbpick">Pick one above to start.</p></div>
    <input type="text" id="sbwho" placeholder="Your name or GitHub @handle (optional, shown publicly)" maxlength="80">
    <div class="sbat"><label class="ck"><input type="checkbox" id="sbwhere" checked> <span>Attach where I am in the game: <b>${esc(at.place.find((t) => /·|›/.test(t)) || at.place[at.place.length - 1] || at.game)}</b>. It helps us find and fix it fast.</span></label>
      <details><summary>See exactly what's attached</summary><pre id="sbpre"></pre></details></div>
    <input class="sbhp" type="text" id="sbhp" tabindex="-1" aria-hidden="true">
    <div id="sbout" role="status"></div>
    <div class="sbrow"><a href="#" id="sbgh">Post it on GitHub yourself</a><span class="sp"></span><button type="button" class="sbbtn alt" id="sbx">Cancel</button><button type="submit" class="sbbtn" id="sbgo" disabled>Send</button></div>
  </form>`;
  calm(v);
  document.body.appendChild(v);
  const $ = (s) => v.querySelector(s);
  $("#sbpre").textContent = contextText(at);
  let kind = null, again = "", sent = false;
  const onEsc = (e) => { if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); close(); } };
  // the open desk's game (a frame) pulls focus back to its own key catcher: shut the frames while the box is open,
  // and if focus still slips out, put it back where the player was typing
  const frames = [...document.querySelectorAll("iframe")].filter((f) => !f.inert);
  frames.forEach((f) => { f.inert = true; });
  let lastField = null;
  v.addEventListener("focusin", (e) => { lastField = e.target; });
  const onBlur = () => setTimeout(() => { if (v.isConnected && !v.contains(document.activeElement) && lastField) lastField.focus(); }, 0);
  window.addEventListener("blur", onBlur);
  const close = () => { v.remove(); window.removeEventListener("keydown", onEsc, true); window.removeEventListener("blur", onBlur); frames.forEach((f) => { f.inert = false; }); };
  window.addEventListener("keydown", onEsc, true);   // Esc closes it wherever focus is
  const vals = () => [...v.querySelectorAll("[data-f]")].map((t) => t.value.trim());
  const isPrompt = () => kind && kind.id === "prompt";
  const answers = () => Object.assign(T.read($("#sbfields"), $("#sbwhere").checked ? at.review : ""), { who: $("#sbwho").value.trim() });
  const refreshPrompt = () => { if (!isPrompt()) return; T.syncOthers($("#sbfields")); $("#sbppre").textContent = scrub(T.promptText(answers())); };
  const ready = () => { refreshPrompt(); $("#sbgo").disabled = sent || !kind || (isPrompt() ? !T.ready(answers()) : (vals()[0] || "").length < 3); };
  v.querySelectorAll("[data-k]").forEach((b) => b.onclick = () => {
    const keep = isPrompt() ? [T.read($("#sbfields")).what] : vals();
    kind = KINDS.find((k) => k.id === b.dataset.k);
    v.querySelectorAll("[data-k]").forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
    if (isPrompt()) {
      const box = $("#sbfields");
      box.innerHTML = T.fieldsHTML() + `<details><summary>Preview the prompt</summary><pre id="sbppre"></pre></details>`;
      if (at.where) T.choose(box, "where", at.where);
      box.querySelector('[name="spot"]').value = at.place.find((t) => /·|›/.test(t)) || "";
      if (keep[0]) box.querySelector('[name="what"]').value = keep[0];
      box.oninput = box.onchange = ready;
      box.querySelector('[name="what"]').focus(); ready();
      return;
    }
    $("#sbfields").oninput = $("#sbfields").onchange = null;
    $("#sbfields").innerHTML = ASK[kind.id].map(([q, ph], i) => `<label class="sbq"><span>${q}${i ? ' <small>optional</small>' : ""}</span><textarea data-f="${i}" rows="${i ? 2 : 4}" maxlength="3000" placeholder="${esc(ph)}"></textarea></label>`).join("") +
      (kind.id === "bug" ? `<div class="sbq"><span>Does it happen again after you reload the page? <small>optional</small></span><div class="sbseg">${["Yes", "No", "Didn't try"].map((a) => `<button type="button" data-a="${a}" class="${again === a ? "on" : ""}">${a}</button>`).join("")}</div></div>` : "");
    v.querySelectorAll("[data-f]").forEach((t, i) => { if (keep[i]) t.value = keep[i]; t.oninput = ready; });
    v.querySelectorAll("[data-a]").forEach((x) => x.onclick = () => { again = again === x.dataset.a ? "" : x.dataset.a; v.querySelectorAll("[data-a]").forEach((y) => y.classList.toggle("on", y.dataset.a === again)); });
    $("[data-f='0']").focus(); ready();
  });
  $("#sbx").onclick = close;
  v.addEventListener("click", (e) => { if (e.target === v) close(); });
  $("#sbwho").addEventListener("input", ready); $("#sbwhere").addEventListener("change", ready);
  const issue = () => {
    if (isPrompt()) {
      const a = answers(); for (const key of Object.keys(a)) a[key] = scrub(a[key]);
      return { kind: "prompt", title: T.title(a), body: T.body(a) + ($("#sbwhere").checked ? "\n\n" + contextMd(at) : ""), label: "prompt" };
    }
    const k = kind || KINDS[3], f = vals().map(scrub), who = scrub($("#sbwho").value.trim());
    const line = flat(f[0]).slice(0, 70) || "(no text)";
    const title = `${k.name} · ${at.game.replace(/^The /, "")}: ${line}`;
    const parts = LABELS[k.id].map((l, i) => f[i] && `**${l}**\n\n${f[i]}`).filter(Boolean);
    if (k.id === "bug" && again) parts.push(`**Happens again after a reload:** ${again}`);
    if (who) parts.push(`From: ${who}`);
    if ($("#sbwhere").checked) parts.push(contextMd(at));
    return { kind: k.id, title, body: parts.join("\n\n"), label: k.label };
  };
  const ghUrl = () => { if (isPrompt()) return T.ghUrl(answers()); const i = issue(); return `https://github.com/${REPO}/issues/new?` + new URLSearchParams({ title: i.title, body: (i.body + "\n\n_Sent from the game._").slice(0, 6000), labels: i.label }); };
  $("#sbgh").onclick = (e) => { e.preventDefault(); window.open(ghUrl(), "_blank", "noopener"); };
  v.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    if ($("#sbhp").value) return close();   // a bot filled the hidden box
    if ($("#sbgo").disabled) return;
    const go = $("#sbgo"), out = $("#sbout");
    go.disabled = true; go.textContent = "Sending…"; out.innerHTML = "";
    try {
      const r = await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(issue()) });
      const j = /json/.test(r.headers.get("content-type") || "") ? await r.json() : null;
      if (!r.ok || !j || !j.url) throw new Error((j && j.error) || "no server");
      sent = true;
      v.querySelectorAll("textarea, input, .sbkinds button, .sbseg button, .chips input").forEach((x) => { x.disabled = true; });
      out.innerHTML = `<div class="sbdone">Sent. Thank you! <a href="${esc(j.url)}" target="_blank" rel="noopener">See it on GitHub (#${esc(j.number)})</a></div>`;
      go.textContent = "Sent ✓"; $("#sbgh").hidden = true; $("#sbx").textContent = "Close"; $("#sbx").focus();
    } catch (err) {
      const msg = /Too many|more first/.test(err.message) ? esc(err.message) + " " : "This copy of the game couldn't send it directly. ";
      out.innerHTML = `<div class="sberr">${msg}<a href="${esc(ghUrl())}" target="_blank" rel="noopener">Open it on GitHub</a> to post it (it needs a free GitHub account), or <a href="#" id="sbcopy">copy it</a> to send another way.</div>`;
      out.querySelector("#sbcopy").onclick = (ev) => { ev.preventDefault(); const i = issue(); navigator.clipboard.writeText(i.title + "\n\n" + i.body).then(() => { ev.target.textContent = "copied ✓"; }); };
      go.textContent = "Send"; ready();
    }
  };
}

// ---------- Save file ----------
function idb(fn) {
  return new Promise((ok, no) => {
    const rq = indexedDB.open(IDB, 21);   // Emscripten's IDBFS version and store, so the engine reads what we write
    rq.onupgradeneeded = () => { const db = rq.result; if (!db.objectStoreNames.contains("FILE_DATA")) db.createObjectStore("FILE_DATA").createIndex("timestamp", "timestamp", { unique: false }); };
    rq.onerror = () => no(rq.error);
    rq.onsuccess = () => { const db = rq.result; Promise.resolve(fn(db)).then((v) => { db.close(); ok(v); }, (e) => { db.close(); no(e); }); };
  });
}
const b64 = (u8) => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function download() {
  const ls = {};
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); ls[k] = localStorage.getItem(k); }
  const files = await idb((db) => new Promise((ok, no) => {
    const out = [], tx = db.transaction("FILE_DATA", "readonly"), cur = tx.objectStore("FILE_DATA").openCursor();
    cur.onsuccess = () => { const c = cur.result; if (!c) return ok(out); const v = c.value; out.push({ path: c.key, mode: v.mode, at: v.timestamp && new Date(v.timestamp).toISOString(), data: v.contents ? b64(new Uint8Array(v.contents)) : null }); c.continue(); };
    cur.onerror = () => no(cur.error);
  }));
  const blob = new Blob([JSON.stringify({ game: "lifecycle-practice", v: 1, saved: new Date().toISOString(), localStorage: ls, files }, null, 1)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `lifecycle-practice-save-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
async function restore(text) {
  const s = JSON.parse(text);
  if (!s || s.game !== "lifecycle-practice" || !s.localStorage) throw new Error("not a Lifecycle Practice save file");
  for (const [k, v] of Object.entries(s.localStorage)) localStorage.setItem(k, v);
  await idb((db) => new Promise((ok, no) => {
    const tx = db.transaction("FILE_DATA", "readwrite"), st = tx.objectStore("FILE_DATA");
    for (const f of s.files || []) {
      const v = { timestamp: f.at ? new Date(f.at) : new Date(), mode: f.mode };
      if (f.data != null) v.contents = unb64(f.data);
      st.put(v, f.path);
    }
    tx.oncomplete = () => ok(); tx.onerror = () => no(tx.error);
  }));
}
