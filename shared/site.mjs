// The public site's corner buttons (games/shared/PUBLIC-RELEASE.md), added to every top-level page by the public build:
//   Make a suggestion: a bug, an idea, feedback or anything else. It goes to the repo's GitHub issues, through the
//     site's /api/feedback function when the host has one (api/feedback.js on Vercel), or as a prefilled GitHub issue
//     the player posts themselves. Nothing is sent until they press Send.
//   Save file: download every save on this site (browser storage and the Lifecycle Files engine's IndexedDB) as one
//     JSON file, or load one back, for a new browser or a cleared one.
// Not shown inside the office's frames: the office page has its own. While the page shows an element with
// data-siteslot (the office's desk headers), the buttons sit inside it instead of floating over the corner.
const REPO = "BrentBarnes/lifecycle-practice";
const KINDS = [
  { id: "bug", icon: "🐞", name: "Bug", hint: "Something broke or looks wrong", label: "bug", ask: "What happened, and what did you expect?" },
  { id: "idea", icon: "💡", name: "Feature idea", hint: "Something the game should do", label: "idea", ask: "What would you like the game to do?" },
  { id: "feedback", icon: "💬", name: "Feedback", hint: "What worked, what didn't", label: "feedback", ask: "What did you think?" },
  { id: "other", icon: "✳️", name: "Something else", hint: "Anything at all", label: "other", ask: "What's on your mind?" },
];
const IDB = "/state";   // Pyodide's IDBFS database (lifecycle-files/static-api.js mounts it at /state)

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
  .sberr{background:#fbe7e4;border-radius:8px;padding:10px 12px;color:#8a2a20}
  @media (max-width:520px){.sbkinds{grid-template-columns:1fr}#sitebar{top:auto;bottom:10px}#sitebar .menu{top:auto;bottom:36px}}`;
  document.head.appendChild(css);
  const bar = document.createElement("div");
  bar.id = "sitebar";
  bar.innerHTML = `<div style="position:relative"><button type="button" id="sbsave" title="Download your progress, or load it back">💾 Save file</button>
      <div class="menu" id="sbmenu" hidden>
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
  bar.querySelector("#sbsave").onclick = () => { menu.hidden = !menu.hidden; bar.querySelector("#sbmsg").hidden = true; };
  document.addEventListener("click", (e) => { if (!bar.contains(e.target)) menu.hidden = true; });
  bar.querySelector("#sbdown").onclick = () => download().then(() => note("Downloaded."), (e) => note("Couldn't read the saves: " + e.message));
  bar.querySelector("#sbup").onclick = () => bar.querySelector("#sbfile").click();
  bar.querySelector("#sbfile").onchange = (e) => { const f = e.target.files[0]; if (f) f.text().then(restore).then(() => { note("Loaded. Reloading…"); setTimeout(() => location.reload(), 600); }, (err) => note("That file didn't load: " + err.message)); };
  bar.querySelector("#sbsug").onclick = suggest;
  const note = (t) => { const m = bar.querySelector("#sbmsg"); m.textContent = t; m.hidden = false; };
}

// the games listen for keys and clicks on the whole page (and grab focus for their own keys): keep ours to ourselves
function calm(el) { for (const t of ["keydown", "keyup", "keypress", "mousedown", "mouseup", "click", "pointerdown"]) el.addEventListener(t, (e) => e.stopPropagation()); }
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// ---------- Make a suggestion ----------
function where() {
  const step = document.querySelector("#title, .brand small, header b");
  return [`Page: ${location.pathname}${location.search}`, document.title && `Title: ${document.title}`, step && step.textContent.trim() && `On screen: ${step.textContent.trim().slice(0, 80)}`,
    `Screen: ${innerWidth}x${innerHeight}`, `Browser: ${navigator.userAgent}`].filter(Boolean).join("\n");
}
function suggest() {
  const v = document.createElement("div");
  v.className = "sbveil";
  v.innerHTML = `<form class="sbbox" autocomplete="off">
    <h2>Make a suggestion</h2>
    <p class="mut">It goes to the game's public issue list on GitHub, where anyone can read it. Please leave out anything private.</p>
    <div class="sbkinds">${KINDS.map((k) => `<button type="button" data-k="${k.id}"><span class="ic">${k.icon}</span><span><b>${k.name}</b><small>${k.hint}</small></span></button>`).join("")}</div>
    <textarea id="sbtext" placeholder="Pick a kind above, then write it here." maxlength="5000"></textarea>
    <input type="text" id="sbwho" placeholder="Your name or GitHub @handle (optional, shown publicly)" maxlength="80">
    <label class="ck"><input type="checkbox" id="sbwhere" checked> <span>Add where I am in the game (page, screen size, browser)</span></label>
    <input class="sbhp" type="text" id="sbhp" tabindex="-1" aria-hidden="true">
    <div id="sbout"></div>
    <div class="sbrow"><a href="#" id="sbgh">Post it on GitHub yourself</a><span class="sp"></span><button type="button" class="sbbtn alt" id="sbx">Cancel</button><button type="submit" class="sbbtn" id="sbgo" disabled>Send</button></div>
  </form>`;
  calm(v);
  document.body.appendChild(v);
  const $ = (s) => v.querySelector(s);
  let kind = null;
  const onEsc = (e) => { if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); close(); } };
  const close = () => { v.remove(); window.removeEventListener("keydown", onEsc, true); };
  window.addEventListener("keydown", onEsc, true);   // Esc closes it wherever focus is
  const ready = () => { $("#sbgo").disabled = !kind || $("#sbtext").value.trim().length < 3; };
  v.querySelectorAll("[data-k]").forEach((b) => b.onclick = () => {
    kind = KINDS.find((k) => k.id === b.dataset.k);
    v.querySelectorAll("[data-k]").forEach((x) => x.classList.toggle("on", x === b));
    $("#sbtext").placeholder = kind.ask; $("#sbtext").focus(); ready();
  });
  $("#sbtext").oninput = ready;
  $("#sbx").onclick = close;
  v.addEventListener("click", (e) => { if (e.target === v) close(); });
  const issue = () => {
    const text = $("#sbtext").value.trim(), who = $("#sbwho").value.trim();
    const title = `${(kind || KINDS[3]).name}: ${text.split("\n")[0].slice(0, 70)}`;
    const body = `${text}\n\n${who ? `From: ${who}\n` : ""}${$("#sbwhere").checked ? "\n```\n" + where() + "\n```\n" : ""}`;
    return { kind: (kind || KINDS[3]).id, title, body, label: (kind || KINDS[3]).label };
  };
  const ghUrl = () => { const i = issue(); return `https://github.com/${REPO}/issues/new?` + new URLSearchParams({ title: i.title, body: i.body + "\n\n_Sent from the game._", labels: i.label }); };
  $("#sbgh").onclick = (e) => { e.preventDefault(); window.open(ghUrl(), "_blank", "noopener"); };
  v.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    if ($("#sbhp").value) return close();   // a bot filled the hidden box
    const go = $("#sbgo"), out = $("#sbout");
    go.disabled = true; go.textContent = "Sending…";
    try {
      const r = await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(issue()) });
      const j = /json/.test(r.headers.get("content-type") || "") ? await r.json() : null;
      if (!r.ok || !j || !j.url) throw new Error((j && j.error) || "no server");
      out.innerHTML = `<div class="sbdone">Sent. Thank you. <a href="${esc(j.url)}" target="_blank" rel="noopener">See it on GitHub (#${esc(j.number)})</a></div>`;
      go.textContent = "Sent ✓"; $("#sbx").textContent = "Close";
    } catch (err) {
      out.innerHTML = `<div class="sberr">This copy of the game can't send it directly. <a href="${esc(ghUrl())}" target="_blank" rel="noopener">Open it on GitHub</a> to post it (it needs a free GitHub account), or <a href="#" id="sbcopy">copy the text</a>.</div>`;
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
