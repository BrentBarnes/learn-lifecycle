// The public build's stand-in for the game server (games/shared/PUBLIC-RELEASE.md). The Python engine runs in the
// browser through Pyodide, and every fetch to /api/lf/* is answered by lf_api.route() instead of a network call.
// Saves live in this browser (IndexedDB), under /state. Loaded before the game's own scripts.
window.LF_PUBLIC = true;
window.V = {rec: false, starting: false, finishing: false};   // the coach's state (lifecycle_files_coach.js isn't shipped): never recording
(() => {
  const PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
  const realFetch = window.fetch.bind(window);
  let api = null, py = null, saving = null;

  const veil = document.createElement('div');
  veil.id = 'pyboot';
  veil.innerHTML = '<div><b>Lifecycle Files</b><span>Loading the case engine. The first visit takes about ten seconds.</span><i></i></div>';
  const css = document.createElement('style');
  css.textContent = `#pyboot{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:var(--bg,#f6f5f2);font:500 15px Inter,system-ui,sans-serif;color:var(--ink,#1d1d1b)}
    #pyboot div{display:grid;gap:8px;text-align:center;max-width:320px;padding:0 16px}#pyboot b{font-size:20px}#pyboot span{color:#6b6b66}
    #pyboot i{height:3px;border-radius:2px;background:linear-gradient(90deg,#c9c6bd 0 30%,#5b6cff 30% 60%,#c9c6bd 60%);background-size:200% 100%;animation:pyb 1.2s linear infinite}
    @keyframes pyb{to{background-position:-200% 0}}
    #pyboot.err i{display:none}#voiceon{display:none!important}`;
  document.head.appendChild(css);
  const show = () => document.body && !veil.isConnected && document.body.appendChild(veil);
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', show) : show();

  const ready = (async () => {
    await new Promise((ok, no) => { const s = document.createElement('script'); s.src = PYODIDE + 'pyodide.js'; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
    py = await loadPyodide({indexURL: PYODIDE});
    const [files] = await Promise.all([realFetch('py/manifest.json').then(r => r.json()), py.loadPackage('numpy')]);
    py.FS.mkdirTree('/lf');
    await Promise.all(files.map(f => realFetch('py/' + f).then(r => r.text()).then(t => py.FS.writeFile('/lf/' + f, t))));
    py.FS.mkdirTree('/state');
    py.FS.mount(py.FS.filesystems.IDBFS, {}, '/state');
    await new Promise(ok => py.FS.syncfs(true, () => ok()));
    py.FS.mkdirTree('/state/lifecycle-files');
    py.runPython(`import os, sys\nos.environ["LF_ROOT"] = "/state/lifecycle-files"\nos.environ["LF_PUBLIC"] = "1"\nsys.path.insert(0, "/lf")\nimport lf_api`);
    api = py.globals.get('lf_api').route;
    veil.remove();
  })().catch(e => {
    veil.classList.add('err');
    veil.querySelector('span').textContent = "The case engine didn't load. Check your connection and reload the page. (" + (e && e.message || e) + ')';
    throw e;
  });

  const persist = () => { clearTimeout(saving); saving = setTimeout(() => py.FS.syncfs(false, () => {}), 300); };

  window.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    const at = url.pathname.indexOf('/api/lf/');
    if (at < 0) return realFetch(input, init);
    await ready;
    const method = (init.method || 'GET').toUpperCase();
    const body = typeof init.body === 'string' ? init.body : '{}';
    const out = JSON.parse(api(method, url.pathname.slice(at), JSON.stringify(Object.fromEntries(url.searchParams)), body));
    if (method !== 'GET') persist();
    return new Response(JSON.stringify(out.body), {status: out.status, headers: {'content-type': 'application/json'}});
  };
})();
