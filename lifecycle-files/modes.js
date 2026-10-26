// ================================================================ more ways to play (lf_modes.py, docs/GAME-MODE-IDEAS.md): Call it or wait, and Objection!
// Each opens from the hub once the step it needs is passed, and works like a join: a Meet (Watch, Together, the term),
// 3 guided reps, then solo until 8 of the last 10. Loaded after lifecycle_files_path.js. It draws with the path's own
// screens (mainCardP, tilesP, guideHtml, spotsNow) and runs in R with R.mode set, so the path's keys work here too:
// 1 to 8 answer, Enter is the main button, Q is done for now.
let MODES = null;          // GET /api/lf/modes
async function loadModes() { try { MODES = await getJ('/api/lf/modes'); } catch (e) { MODES = null; } return MODES; }
const modeOf = id => MODES && MODES.modes.find(m => m.id === id);
const COUNTED = ['guided', 'solo', 'hard'];

// ---------------------------------------------------------------- the hub card and the flyout links
function modeState(m) {
  if (!m.open) return `Opens after ${m.needs_label}`;
  if (m.passed) return `Passed${m.star ? ' ★' : ''}`;
  if (!m.meet) return 'New: starts with a Meet';
  if (m.level === 'guided') return `${m.guided_left} guided rep${m.guided_left === 1 ? '' : 's'} left, then solo`;
  return `${m.last.filter(Boolean).length} of your last ${m.last.length} right`;
}
function modesHtml() {
  if (!MODES) return '';
  const ms = MODES.modes.filter(m => !m.retired);   // Objection! is off the hub since the sampler (lf_modes.MODES)
  if (!ms.length) return '';
  return `<div class="card mways"><h4>More ways to play <span class="meta">on what you've passed, outside the path</span></h4><div class="mwgrid">${ms.map(m =>
    `<div class="mw${m.open ? '' : ' locked'}" ${m.open ? `data-mode="${m.id}"` : ''}><b>${esc(m.name)}</b><p>${esc(m.blurb)}</p>
      <div class="mwst"><span>${esc(modeState(m))}</span>${m.open && m.meet && m.last.length && !m.passed ? pipsHtml(m.last, m.rule[0]) : ''}${m.open ? `<button class="btn2">${m.reps || m.meet ? 'Play' : 'Start'}</button>` : ''}</div></div>`).join('')}
    <a class="mw" href="/lifecycle-files/call" style="text-decoration:none;color:inherit"><b>📞 On a call</b><p>Hands-free, for a walk. A coworker calls about a flow. You ask what the dashboard shows and say what happened. Say "coach" for help.</p>
      <div class="mwst"><span>Best on your phone, with earbuds</span><button class="btn2">Take a call</button></div></a></div></div>`;
}
function modesBind(root) { root.querySelectorAll('[data-mode]').forEach(n => n.onclick = e => { e.stopPropagation(); fly(false); playMode(n.dataset.mode); }); }
function modesFly() {
  if (!MODES) return '';
  return MODES.modes.filter(m => m.open && !m.retired).map(m => `<button data-mode="${m.id}">${esc(m.name)} <small>${esc(m.passed ? 'passed' : 'more ways to play')}</small></button>`).join('');
}

// ---------------------------------------------------------------- starting a mode: the Meet, then the reps
async function playMode(id, level) {
  if (V.rec) await voiceStop();
  S = null; G.on = false; document.querySelector('.guide')?.remove(); closeVeil(); if (R) clearTimeout(R.timer);
  await loadModes();
  const m = modeOf(id);
  if (!m) return home();
  if (!m.open) { toast(`${esc(m.name)} opens after ${esc(m.needs_label)}.`); return home(); }
  R = {mode: id, sid: id, rounds: false, level: level || null, run: [], combo: 0, len: MODES.sitting || 10, rep: null, out: null, timer: null};
  if (!m.meet && !level) return modeMeet(id);
  return modeNext();
}
function modeMeet(id) {
  const m = modeOf(id), t = MODES.meet[id], flow = 'one of our flows';
  mode('rep', 1); modeTitle(m);
  app.innerHTML = `<div class="card meet pop"><span class="k">More ways to play · Meet</span><h3>${esc(m.name)}</h3>
    <div class="sym"><span class="who">${esc(t.dana[0])}</span><p>${esc(t.dana.replace('{flow}', flow))}</p></div>
    <p class="mtext">${esc(t.intro)}</p>
    <ol class="msteps"><li class="on">Watch me do one</li><li>Do one together</li><li>The name for it</li><li>Practice: 3 guided, then solo</li></ol>
    <div class="row"><button class="btn big" id="mgo" data-go-main>Show me</button></div></div>`;
  document.getElementById('mgo').onclick = () => { R.level = 'watch'; modeNext(); };
  narrate(t.dana.replace('{flow}', flow), t.intro);
}
function modeTerm() {
  const m = modeOf(R.mode), t = MODES.meet[R.mode];
  const v = veil(`<div class="card unlock"><span class="k">${esc(m.name)} · the name for it</span><h3>${esc(t.term[0])}</h3><div class="term"><b>What people call it</b>${esc(t.term[1])}</div>
    <p style="margin:0 0 12px;color:var(--ink2);font-size:14px">Three guided reps next: easy cases, and the hand shows where to look. Then solo: ${m.rule[1]} right of your last ${m.rule[0]} passes it.</p>
    <div class="row"><button class="btn" id="tgo" data-go-main>Start practice</button></div></div>`);
  sound('unlock'); narrate(`The name for it: ${t.term[0]}.`, t.term[1]);
  v.querySelector('#tgo').onclick = async () => { closeVeil(); MODES = await post('/api/lf/modes/meet', {mode: R.mode}); R.level = null; modeNext(); };
}

// ---------------------------------------------------------------- one rep: deal, show, answer
async function modeNext() {
  if (!R || !R.mode) return home(); clearTimeout(R.timer); hush();
  const body = {mode: R.mode}; if (R.level) body.level = R.level;
  const r = await (R.next || post('/api/lf/modes/deal', body)); R.next = null;
  if (r.error) { toast(esc(r.error)); return home(); }
  R.rep = r; R.out = null; R.st = {ans: {}, sub: 0, beat: 0}; R.busy = false; R.t0 = performance.now();
  if (r.walk) voPrefetch(r.walk.map(b => b.say));
  mode('rep', 1); modeTitle(modeOf(R.mode));
  modeShow();
  if (r.level === 'together' && r.hint) narrate(r.msg, 'Your turn.', r.hint.say);
  else if (r.level === 'guided' && r.hint && !R.run.length) narrate(r.msg, r.hint.say);
}
function modeTitle(m) {   // the top bar: the mode's name, and where he stands in it (not the path's step count)
  if (R && R.samp != null) return sampPill();   // the sampler shows its own count
  document.getElementById('title').textContent = m.name;
  const p = document.getElementById('prog'); p.hidden = false;
  p.textContent = m.passed ? `Passed${m.star ? ' · Hard ★' : ''}` : !m.meet ? 'New' : m.guided_left ? `${m.guided_left} guided to go`
    : !m.last.length ? `Solo: ${m.rule[1]} of ${m.rule[0]} right passes` : `${m.last.filter(Boolean).length} of your last ${m.last.length} right · ${m.rule[1]} of ${m.rule[0]} passes`;
}
function modeHead() {
  const r = R.rep, m = modeOf(R.mode), solo = r.level === 'solo' || r.level === 'hard';
  const kick = R.samp != null ? sampKick() : R.run.length || COUNTED.includes(r.level) ? `More ways to play · ${Math.min(R.run.length + (R.out ? 0 : 1), R.len)} of ${R.len}` : 'More ways to play';
  return `<div class="mghead"><div><span class="k">${esc(kick)}</span><h3>${esc(m.name)}</h3></div><span class="sp"></span>
    <span class="lvchip ${r.level}">${esc(LEVEL_NAME[r.level])}</span><span class="stage ${r.stage}">${esc(STAGE_BADGE[r.stage] || r.stage)}</span>
    <span data-tip="Your last ${m.rule[0]} solo reps. ${m.rule[1]} right, ending on a right one, passes.">${solo ? pipsHtml(m.last, m.rule[0]) : ''}</span><span class="combo" id="combo">${R.combo > 1 ? '×' + R.combo : ''}</span></div>`;
}
function modeShow() {
  const r = R.rep, sp = spotsNow(), m = modeOf(R.mode);
  if (r.level === 'watch' && r.walk && !R.out && R.st.spoke !== R.st.beat) {
    narrate(R.st.beat === 0 ? r.msg : '', r.walk[Math.min(R.st.beat, r.walk.length - 1)].say);
    R.st.spoke = R.st.beat;
  }
  const body = r.way === 'wait' ? waitHtml() : objHtml();
  app.innerHTML = `<div class="mg prep">${modeHead()}${guideHtml()}<div class="sym" data-spot="msg"><span class="who">${esc((r.msg || '!')[0].replace(/[^JNM]/, '!'))}</span><p>${esc(r.msg || '')}</p></div>
    ${body}<div class="mgfb" id="fb">${R.out ? modeFb() : ''}</div>
    <div class="mgfoot"><span>${R.run.length ? `${R.run.filter(x => x.ok).length} of ${R.run.length} right this sitting` : 'No timer. Take the time you need.'} · Made-up numbers.</span><span class="sp"></span>
      ${m.passed && !['hard', 'watch', 'together', 'try'].includes(r.level) ? '<button class="btn2" id="hardon">Hard mode (optional)</button>' : ''}<button class="btn2" id="mgdone">Done for now</button></div></div>`;
  const side = app.querySelector('.pside'), fb = document.getElementById('fb');
  if (side && fb && R.out) side.prepend(fb);
  sp.forEach(k => app.querySelectorAll(`[data-spot="${k}"]`).forEach(n => n.classList.add('spot')));
  const first = app.querySelector('.spot'); if (first && !R.out && first.getBoundingClientRect().bottom > innerHeight) first.scrollIntoView({block: 'center', behavior: 'smooth'});
  modeBind();
  tips(app);
}

// ---------------------------------------------------------------- Call it or wait: one morning at a time
function waitHtml() {
  const r = R.rep, out = R.out, v = out ? {...r, charts: out.charts} : r, watch = r.level === 'watch';
  const n = r.today - r.start_i + 1, last = n >= r.days;
  const btns = out ? '' : `<div class="ans wbtns"${watch ? '' : ' id="ans"'}><button data-a="0" data-v="call" class="wcall" ${watch ? 'disabled' : ''}>Call it: tell the owner</button>
    <button data-a="1" data-v="wait" ${watch ? 'disabled' : 'data-go-main'}>${last ? 'Wait: end the two weeks' : 'Wait a day'}</button></div>`;
  const note = out ? '' : `<p class="meta" style="margin:0">${last ? 'The last morning. Call it now, or let the two weeks end.' : 'Call it now, or wait for tomorrow\'s numbers.'}</p>`;
  return `<div class="ptwo"><div>${mainCardP(v, {facts: false, height: 250, today: out ? null : r.today, pins: out ? out.pins : []})}</div>
    <div class="pside"><div class="card wday" data-spot="q"><span class="k">${out ? 'The two weeks, all of them' : `Morning ${n} of ${r.days}`}</span>
      <h4>${out ? esc(r.flow) : `Today: ${esc(r.dates[r.today])}`}</h4>${note}${btns}${out ? waitFacts(out.ledger) : ''}</div></div></div>`;
}
function waitFacts(x) {
  if (!x.real) return `<table class="wfacts"><tr><td>What happened</td><td>Nothing broke</td></tr><tr><td>Your call</td><td>${x.call ? 'Called ' + esc(x.call) : 'Waited it out'}</td></tr></table>`;
  return `<table class="wfacts"><tr><td>It started</td><td>${esc(x.start)}</td></tr><tr><td>The line left the range</td><td>${esc(x.shown)}</td></tr>
    <tr><td>You called it</td><td>${x.call ? esc(x.call) : 'never'}</td></tr><tr><td>Lost before the line showed it</td><td>${money(x.before)}</td></tr>
    <tr><td>Lost while waiting</td><td>${x.verdict === 'early' ? '–' : money(x.waiting)}</td></tr></table>`;
}
async function waitDay(quiet) {
  if (!R || !R.mode || R.busy || R.out) return;
  R.busy = true;
  const res = await post('/api/lf/modes/day', {rid: R.rep.rid});
  R.busy = false;
  if (res.error) { toast(esc(res.error)); return modeNext(); }
  if (res.end) return modeSubmit({call: false});
  R.rep.today = res.today; R.rep.charts = res.charts;
  if (!quiet) { sound('key', 1); modeShow(); }
}

// ---------------------------------------------------------------- Objection!: pick a line, then the chart that proves it wrong
function objHtml() {
  const r = R.rep, out = R.out, st = R.st, pick = st.sub === 1 && !out;
  const ev = out ? out.evidence : [];
  const deco = k => [`${pick ? 'pickable' : ''} ${out && ev.includes(k) ? 'key' : ''} ${out && st.ans.proof === k ? 'mine' : ''}`, ''];
  const lines = r.lines.map((L, i) => {
    const cls = out ? `${out.marks[i] ? 'ok' : 'bad'}${out.line === i ? ' chosen' : ''}` : st.ans.line === i ? 'on' : '';
    const why = out ? `<small>${out.marks[i] ? '✓' : '✗'} ${esc(out.reasons[i])}</small>` : '';
    return `<button class="oline ${cls}" data-a="${i}" data-spot="line-${i}" ${out || r.level === 'watch' ? 'disabled' : ''}><span class="lno">${i + 1}</span><span class="ot">${esc(L.text)}${why}</span></button>`; }).join('');
  const ask = pick ? `<div class="ask">Objecting to line ${st.ans.line + 1}. Now click the chart that proves it wrong. Or pick another line.</div>` : '';
  return `<div class="ptwo"><div><div class="${pick ? 'pickmain' : ''}">${mainCardP(r)}</div>${tilesP(r, deco)}</div>
    <div class="pside"><div class="card pboard oread" data-spot="lines"><h4>${esc(r.who)}'s read</h4><p class="meta">At least one line is wrong. Click it, then click the chart that proves it. Keys 1 to ${r.lines.length} pick a line.</p>
      <div class="olines"${out || r.level === 'watch' ? '' : ' id="ans"'}>${lines}</div>${ask}</div></div></div>`;
}
function objProof(key) { R.st.ans.proof = key; return modeSubmit({line: R.st.ans.line, proof: key}); }
function burst(text) {
  const b = document.createElement('div'); b.className = 'objburst'; b.textContent = text; document.body.appendChild(b);
  setTimeout(() => b.remove(), 1000);
}

// ---------------------------------------------------------------- input
function modeBind() {
  const r = R.rep;
  document.getElementById('mgdone').onclick = () => modeDone();
  const hb = document.getElementById('hardon'); if (hb) hb.onclick = () => { R.level = 'hard'; R.next = null; modeNext(); };
  const nb = document.getElementById('pnext'); if (nb) nb.onclick = () => modeAfter();
  const ws = document.getElementById('wnext'); if (ws) ws.onclick = () => modeWalkStep();
  const wk = document.getElementById('wskip'); if (wk) wk.onclick = () => modeWalkEnd();
  if (R.out || r.level === 'watch') return;
  app.querySelectorAll('#ans [data-a]').forEach(b => b.onclick = () => modeKey(+b.dataset.a));
  if (r.way === 'objection' && R.st.sub === 1)
    app.querySelectorAll('.ptile.pickable, .pickmain .pmain, .pickmain [data-spot="revenue"], .pickmain [data-spot="lastweek"]').forEach(n => n.onclick = e => { e.stopPropagation(); objProof(n.dataset.k || n.dataset.spot); });
}
function modeKey(i) {   // keys 1-8 and the answer buttons
  if (!R || !R.mode || R.out || R.busy || !R.rep || R.rep.level === 'watch') return false;
  const r = R.rep;
  if (r.way === 'wait') {
    if (i === 0) { modeSubmit({call: true}); return true; }
    if (i === 1) { waitDay(); return true; }
    return false;
  }
  if (!r.lines[i]) return false;
  R.st.ans = {line: i}; R.st.sub = 1; sound('key', 1); modeShow();
  return true;
}

// ---------------------------------------------------------------- Watch: the game plays one and says each move
async function modeWalkStep() {
  const r = R.rep, b = r.walk[R.st.beat];
  if (b && b.do) await modeDo(b.do);
  if (R.out) return;
  if (R.st.beat >= r.walk.length - 1) return modeWalkEnd();
  R.st.beat++; modeShow();
}
async function modeDo(d) {
  if (d.wait) { for (let k = 0; k < d.wait && !R.out; k++) await waitDay(true); sound('key', 1); }
  if (d.call) return modeSubmit({call: true});
  if (d.line != null) { R.st.ans = {line: d.line}; R.st.sub = 1; }
  if (d.proof) { R.st.ans.proof = d.proof; return modeSubmit({line: d.line, proof: d.proof}); }
}
async function modeWalkEnd() {   // Skip, or the last beat: play the demo answer so the feedback shows
  const r = R.rep, a = r.demo || {};
  if (R.out) return;
  if (r.way === 'wait') { while (R && !R.out && R.rep.today < a.call) await waitDay(true); return modeSubmit({call: true}); }
  R.st.ans = {line: a.line, proof: a.proof}; return modeSubmit({line: a.line, proof: a.proof});
}

// ---------------------------------------------------------------- answering
async function modeSubmit(body) {
  if (!R || !R.mode || R.out || R.busy) return; R.busy = true;
  const r = R.rep, ms = Math.round(performance.now() - R.t0);
  const out = await post('/api/lf/modes/answer', {rid: r.rid, ms, ...body});
  R.busy = false;
  if (out.error) { toast(esc(out.error)); return; }
  if (out.retry) {   // Together: not quite, try again (it doesn't count)
    sound('no'); if (r.way === 'objection' && !/chart/.test(out.say)) { R.st.ans = {}; R.st.sub = 0; } modeShow();
    document.getElementById('fb').innerHTML = `<div class="box no"><div>${pxr(false)}<b>Not quite.</b><div class="why">${esc(out.say)}</div></div></div>`;
    narrate('Not quite.', out.say); return;
  }
  R.out = out; R.ms = ms; if (out.summary) { MODES = out.summary; modeTitle(modeOf(R.mode)); }
  const counted = COUNTED.includes(r.level);
  if (counted) { R.run.push({ok: out.ok, ms, ledger: out.ledger}); R.combo = out.ok ? R.combo + 1 : 0; }
  sound(out.ok ? 'ok' : 'no', R.combo);
  if (out.ok && r.way === 'objection') burst('Objection!');
  modeShow();
  if (!out.ok && r.level !== 'watch') narrate(out.head + '.', out.why); else if (r.level !== 'watch') hush();
  if (R.combo > 1) document.getElementById('combo')?.classList.add('bump');
  if (counted) R.next = post('/api/lf/modes/deal', {mode: R.mode, ...(R.level === 'hard' ? {level: 'hard'} : {})});   // dealt while you read
  if (out.newly_passed) return setTimeout(modePassed, 900);
}
function modeFb() {
  const out = R.out, r = R.rep, counted = COUNTED.includes(r.level), lastMs = counted && R.run.length ? R.run[R.run.length - 1].ms : 0;
  const btn = r.level === 'watch' ? 'Your turn' : r.level === 'together' ? 'Next' : R.run.length >= R.len ? 'See how it went' : 'Next';
  const reply = out.reply ? `<div class="oreply">${esc(out.reply)}</div>` : '';
  const cause = out.cause ? `<div class="file">It was: ${esc(out.cause)}</div>` : '';
  const lesson = r.way === 'objection' && out.lesson ? `<div class="lesson2"><b>${esc(out.name)} · ${esc(out.term)}</b>${esc(out.lesson)}</div>` : '';
  return `<div class="box ${out.ok ? 'ok' : 'no'} pop"><div>${pxr(out.ok)}<b>${esc(out.head)}.</b> ${counted && out.ok ? `<span class="meta">${(lastMs / 1000).toFixed(1)} s</span>` : ''}
    <div class="why">${esc(out.why)}</div>${reply}${cause}${lesson}</div><button class="btn" id="pnext" data-go-main>${btn}</button></div>`;
}
function modeAfter() {
  const r = R.rep;
  if (R.samp != null) return sampRate();   // the sampler (lifecycle_files_sampler.js)
  if (r.level === 'watch') { R.level = 'together'; return modeNext(); }
  if (r.level === 'together') return modeTerm();
  if (R.run.length >= R.len) return modeDone(true);
  return modeNext();
}
function modePassed() {
  if (R) clearTimeout(R.timer);
  const m = modeOf(R.mode);
  sound('unlock'); narrate(`Passed: ${m.name}.`);
  const v = veil(`<div class="card unlock"><span class="k">Passed · More ways to play</span><h3>${esc(m.name)}</h3>
    <p style="margin:0 0 12px;color:var(--ink2);font-size:14px">${m.rule[1]} of your last ${m.rule[0]} right. Hard mode is open now: realistic cases, for a star. It never blocks anything.</p>
    <div class="row"><button class="btn" id="uon" data-go-main>Keep playing</button><button class="btn2" id="uhub">Hub</button></div></div>`);
  v.querySelector('#uon').onclick = () => closeVeil();
  v.querySelector('#uhub').onclick = () => { closeVeil(); home(); };
}

// ---------------------------------------------------------------- the end of a sitting: for Call it or wait, the truth comes out
function modeDone(over) {
  if (R && R.samp != null) return samplerHome();
  if (!R || !R.mode) return home();
  clearTimeout(R.timer);
  const run = R.run, id = R.mode, m = modeOf(id), right = run.filter(x => x.ok), med = median(right.map(x => x.ms));
  if (!run.length) return home();
  mode('sum', 1);
  let extra = '';
  if (id === 'wait') {
    const L = run.map(x => x.ledger), real = L.filter(x => x.real), quiet = L.filter(x => !x.real), cost = L.reduce((s, x) => s + (x.waiting || 0), 0);
    extra = `<h4 style="margin:4px 0 6px">The truth comes out</h4><div class="ledwrap"><table class="ledger"><tr><th>#</th><th>What really happened</th><th>Your call</th><th>Result</th><th>Lost waiting</th></tr>${L.map((x, i) =>
      `<tr class="${['on_time', 'held'].includes(x.verdict) ? 'ok' : 'no'}"><td>${i + 1}</td><td>${x.real ? `Broke ${esc(x.start)}, showed ${esc(x.shown)}` : 'Nothing broke'}</td><td>${x.call ? 'Called ' + esc(x.call) : 'Waited it out'}</td><td>${esc(x.head)}</td><td>${x.real && x.waiting ? money(x.waiting) : '–'}</td></tr>`).join('')}</table></div>
      <p class="meta" style="margin:0 0 14px">${real.length} of ${L.length} broke, ${real.filter(x => x.verdict === 'on_time').length} caught on time. ${L.filter(x => x.verdict === 'early').length} called before the line showed it. ${quiet.filter(x => x.verdict === 'false_alarm').length} false alarm${quiet.filter(x => x.verdict === 'false_alarm').length === 1 ? '' : 's'} on ${quiet.length} quiet fortnight${quiet.length === 1 ? '' : 's'}. Money lost waiting: ${money(cost)}.</p>`;
  } else {
    const v = k => run.filter(x => x.ledger && x.ledger.verdict === k).length;
    extra = `<p class="meta" style="margin:0 0 14px">${v('ok')} sustained with the proof. ${v('unproven')} right line without the chart that proves it. ${v('true_line')} on a line that held up.</p>`;
  }
  app.innerHTML = `<div class="card sumcard"><span class="k" style="font:600 11px var(--mono);color:var(--muted);text-transform:uppercase">More ways to play · ${esc(m.name)}</span><h3>${over ? 'That\'s a sitting' : 'Done for now'}</h3>
    <div class="facts"><div><b>${run.length}</b><span>played</span></div><div><b>${right.length}</b><span>right</span></div>
      <div><b>${med ? (med / 1000).toFixed(1) + ' s' : '–'}</b><span>median time on right answers</span></div>
      <div><b>${m.passed ? '✓' : `${m.last.filter(Boolean).length} of ${m.rule[0]}`}</b><span>${m.passed ? 'passed' : `last solo reps (${m.rule[1]} passes)`}</span></div></div>
    ${extra}<div class="row"><button class="btn" id="sagain" data-go-main>Keep going</button><button class="btn2" id="shub">Hub</button></div></div>`;
  document.getElementById('sagain').onclick = () => playMode(id);
  document.getElementById('shub').onclick = home;
  NEXT = () => playMode(id);
}
