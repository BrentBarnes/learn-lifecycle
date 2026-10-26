// The office's desk themes and pop-outs, shared by the games it frames (games/office/CLAUDE.md, "Desk themes").
//   mountDesk(): in office mode, a game gets its desk's room across the top (an animated pixel scene from
//     games/shared/pixel/desks.px.js, the narrator, the step), html.desk-<theme> for desk.css, a Pop out button (the
//     tutorial windows float in their own small window), and \ for full screen (the office's header has the button).
//   popOut(): the floating window itself. Document Picture-in-Picture where the browser has it (Chrome), a small
//     pop-up window elsewhere. It shows live copies of the elements pick() returns; a click on a copy clicks the
//     original and keys typed there reach the game, so the game's own code never knows. While it's open the
//     originals hide (html.desk-out), and closing it brings them back. The office uses it for Frank's pin board too.
const FACE = (who, mood = "calm") => `/px/sprites/face_${who}_${mood}.png`;

export function popOut({ title, pick, hideClass = "desk-out", width = 440, height = 560, theme = "", after, onClose }) {
  const host = (() => { try { return window.top.documentPictureInPicture ? window.top : window; } catch (e) { return window; } })();
  const opened = host.documentPictureInPicture
    ? host.documentPictureInPicture.requestWindow({ width, height })
    : Promise.resolve(window.open("", "desk-pop", `popup,width=${width},height=${height}`));
  return opened.then((w) => {
    if (!w) return null;
    const d = w.document;
    d.title = title;
    d.head.innerHTML = `<base href="${esc(location.href)}">`;   // the copied styles' relative urls (pixel art) still resolve
    document.querySelectorAll('link[rel="stylesheet"], style').forEach((n) => d.head.appendChild(n.cloneNode(true)));
    d.documentElement.className = document.documentElement.className.replace(hideClass, "") + " desk-pip";
    d.documentElement.style.cssText = document.documentElement.style.cssText;   // the theme's variables (the narrator's face)
    d.body.className = document.body.className;
    d.body.innerHTML = `<div class="pipwrap ${theme}"><div class="piphead">${esc(title)}</div><div id="pipbox"></div></div>`;
    const box = d.getElementById("pipbox");
    let originals = [];
    const draw = () => {
      originals = pick().filter(Boolean);
      box.innerHTML = "";
      if (!originals.length) { box.innerHTML = `<p class="pipnone">Nothing to read on this screen. It shows here when the step has something.</p>`; return; }
      originals.forEach((o, i) => { const c = o.cloneNode(true); c.dataset.pipi = i; c.removeAttribute("hidden"); c.style.display = ""; box.appendChild(c); });
      if (after) after(d, box);
    };
    let queued = false;
    const mo = new MutationObserver((recs) => {
      if (queued || recs.every((r) => r.target.closest && r.target.closest("#deskbar"))) return;
      queued = true; requestAnimationFrame(() => { queued = false; draw(); });
    });
    mo.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["class", "hidden", "disabled"] });
    // a click on a copy clicks the same spot in the original
    d.addEventListener("click", (e) => {
      const root = e.target.closest("[data-pipi]"); if (!root) return;
      const path = []; for (let n = e.target; n !== root; n = n.parentElement) path.unshift([...n.parentElement.children].indexOf(n));
      let o = originals[+root.dataset.pipi]; for (const i of path) o = o && o.children[i];
      if (o) { e.preventDefault(); o.click(); }
    });
    d.addEventListener("keydown", (e) => {   // keys go to the game, as if typed there
      if (e.target.matches && e.target.matches("input, textarea")) return;
      const k = new KeyboardEvent("keydown", { key: e.key, code: e.code, shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, altKey: e.altKey, metaKey: e.metaKey, bubbles: true, cancelable: true });
      (document.activeElement || document.body).dispatchEvent(k); if (k.defaultPrevented) e.preventDefault();
    });
    document.documentElement.classList.add(hideClass);
    draw();
    const close = () => { mo.disconnect(); document.documentElement.classList.remove(hideClass); if (onClose) onClose(); };
    w.addEventListener("pagehide", close, { once: true });
    if (after) w.addEventListener("resize", () => after(d, box));
    window.addEventListener("pagehide", () => { try { w.close(); } catch (e) { /* gone */ } }, { once: true });
    return w;
  });
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Full screen: inside the office the desk itself goes full screen (the office owns the frame); standalone, the page.
export function fullScreen() {
  if (window.parent !== window) { window.parent.postMessage({ type: "full" }, location.origin); return; }
  if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {});
}

// ---------- the desk bar ----------
const THEMES = {
  signal: { scene: "/px/anims/signal_room.png", who: "priya", name: "Priya", role: "Analyst", room: "The signal room",
    line: "Night shift. The screens don't lie, but they do mumble. Read them one at a time with me." },
  lab: { scene: "/px/anims/lab.png", who: "mei", name: "Mei", role: "Engineer", room: "The A/B lab",
    line: "Two beakers, one change. We plan it, size it, and read it before anyone says the word winner." },
};
let OUT = null;
export function mountDesk({ theme, step = "", tutor = [] }) {
  const T = THEMES[theme]; if (!T || document.getElementById("deskbar")) return;
  const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "/shared/desk/desk.css"; document.head.appendChild(css);
  document.documentElement.classList.add("desk", "desk-" + theme);
  document.documentElement.style.setProperty("--desk-face", `url(${FACE(T.who)})`);
  const hide = document.createElement("style");   // what hides while the tutorial is popped out
  hide.textContent = tutor.length ? `html.desk-out :is(${tutor.join(",")}){display:none!important}` : "";
  document.head.appendChild(hide);
  const bar = document.createElement("div"); bar.id = "deskbar"; bar.className = "deskbar";
  bar.innerHTML = `<canvas class="dscene" width="160" height="90"></canvas>
    <div class="dplate"><div class="droom">${esc(T.room)}</div><div class="dwho"><img src="${FACE(T.who)}" alt="" width="42" height="42"><b>${esc(T.name)}</b><small>${esc(T.role)}</small></div>
      <div class="dline">${esc(T.line)}</div>${step ? `<div class="dstep">Today: <b>${esc(step)}</b></div>` : ""}</div>
    <div class="dbtns"><button type="button" id="dpop" title="Pop the tutorial out into its own small window">⧉ Pop out tutorial</button></div>`;
  document.body.prepend(bar);
  const cv = bar.querySelector("canvas"), x = cv.getContext("2d"), im = new Image(); im.src = T.scene;
  const tick = (now) => { if (im.complete && im.naturalWidth) { x.imageSmoothingEnabled = false; x.clearRect(0, 0, 160, 90); x.drawImage(im, (Math.floor(now / 166) % 8) * 160, 0, 160, 90, 0, 0, 160, 90); } requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  const pop = bar.querySelector("#dpop");
  pop.onclick = () => {
    if (OUT) { try { OUT.close(); } catch (e) { /* gone */ } return; }
    popOut({ title: `${T.name} · ${T.room}`, theme: "desk-" + theme, pick: () => [...document.querySelectorAll(tutor.join(","))].filter((n) => !n.closest("#deskbar")),
      onClose: () => { OUT = null; pop.textContent = "⧉ Pop out tutorial"; } })
      .then((w) => { if (w) { OUT = w; pop.textContent = "⧉ Bring it back"; } });
  };
  document.addEventListener("keydown", (e) => { if (e.key === "\\" && !(e.target.matches && e.target.matches("textarea, input:not(#keycatch):not(#keysink)"))) { e.preventDefault(); fullScreen(); } });
}
