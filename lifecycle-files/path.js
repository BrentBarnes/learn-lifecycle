// ================================================================ the path: Level 1 (lf_path.py, docs/CURRICULUM.md), Level 2 (lf_path2.py, docs/CURRICULUM-L2.md)
// and Level 7 (lf_path7.py, docs/CURRICULUM-L7.md)
// One new thing per step, then joins, the way a musician learns measure 1, measure 2, then 1 and 2 together.
// Each step opens with a Meet: Watch (the game plays one and says each move), Together (you play one, a hand
// points), then the standard term. Then Guided reps (obvious cases, the hand shows where to look) and Solo reps
// until the pass. Loaded after lifecycle_files_ui.html's main script and uses its helpers (esc, post, app, keys).
let PATH = null;           // GET /api/lf/path?level=LVL
let LVL = 1;               // whose path the hub shows: Level 1's, 2's or 7's
let R = null;              // the sitting on screen: {sid, rounds, level, rep, out, run, combo, ...}
const DIR = [['down', '▼'], ['flat', 'held'], ['up', '▲']];
const SHAPE_TIP = {step: 'Moved on one day and stayed there', slope: 'Slid a little every week', spike: 'One day far off, then back', none: 'Stayed inside its normal range'};
const ROWDEF = {   // Call it: what you can say about each chart
  main: ['Revenue per recipient', 'against its normal range', [['below', 'Below'], ['inside', 'Inside'], ['above', 'Above']]],
  shape: ['How revenue per recipient moved', 'the same line, not total revenue', [['step', 'Step'], ['slope', 'Slope'], ['spike', 'Spike'], ['none', 'No move']]],
  revenue: ['Revenue, last 7 days', "this flow's, against the quiet weeks", DIR],
  lastweek: ['The week before', 'against the quiet weeks', [['flat', 'Normal'], ['up', 'Way up']]],
  entered: ['Entered the flow', 'people a week', DIR], delivered: ['Got the email', 'emails a week', DIR], opens: ['Opens', 'open rate', DIR],
  clicks: ['Clicks', 'click rate', DIR], orders: ['Orders', 'placed-order rate', [['zero', 'to ~0'], ...DIR]],
  order_size: ['Order size', 'revenue per order', DIR], unsubs: ['Unsubscribes', 'unsubscribe rate', DIR],
  emails: ['Each email', 'the email table', [['one', 'One out of line'], ['same', 'All about the same']]],
};
const TILE2 = {entered: ['Entered the flow', 'people a week', v => num(v)], delivered: ['Got the email', 'emails a week', v => num(v)], opens: ['Opens', 'open rate', v => pct(v)],
  clicks: ['Clicks', 'click rate', v => pct(v, 2)], orders: ['Orders', 'placed-order rate', v => pct(v, 2)], order_size: ['Order size', 'revenue per order', v => money(v)],
  unsubs: ['Unsubscribes', 'unsubscribe rate', v => pct(v, 2)]};
const TILE_ORDER = ['entered', 'delivered', 'opens', 'clicks', 'orders', 'order_size', 'unsubs'];
const CARD_Q = {entered: 'Did fewer people start the flow?', delivered: 'Did everyone who entered get the emails?', opens: 'Opens (inflated by Apple Mail Privacy)',
  clicks: 'Is the email itself getting clicked?', orders: 'Do people buy after getting it?', order_size: 'Are orders smaller or bigger?', unsubs: 'Are people leaving the list?', emails: 'One email, or all of them?'};
const DASH_SUB = {main: 'the main chart, with its normal range', dots: 'each day as a dot', shape: 'a step, a slope or a spike', size: 'how far from normal',
  revenue: 'the total, against the quiet weeks', lastweek: 'was the comparison week odd?'};
const CHART_NAME = {main: 'Revenue per recipient', dots: 'Single days', shape: 'When it started, and its shape', size: 'How big', revenue: 'Revenue, last 7 days', lastweek: 'The week before',
  ...Object.fromEntries(TILE_ORDER.map(k => [k, TILE2[k][0]])), emails: 'Each email', log: 'Changes', store: 'Store orders', holdout: 'Holdout', segments: 'Holdout by group'};
CARD_Q.log = 'What changed, on which day?';
Object.assign(CARD_Q, {store: 'Did the store get those orders too?', holdout: 'Would they have bought anyway?', segments: 'Who do the emails help most?'});
const EM_HEAD = {sent: ['Got it', 'Emails delivered, last 7 days, against a quiet week'], opens: ['opens', 'Open rate against the quiet weeks'], clicks: ['clicks', 'Click rate against the quiet weeks'],
  orders: ['orders', 'Placed-order rate against the quiet weeks'], order_size: ['order size', 'Revenue per order against the quiet weeks'], unsubs: ['unsubs', 'Unsubscribe rate against the quiet weeks']};
const ROWS_HOW = {when: 'Click the change that landed on the start day, or the day before. Keys 1 to 8 pick a row.',
  which: 'Click the change that explains it, or None of these. Keys 1 to 8 pick a row.', logrow: 'Click the row. Keys 1 to 8 pick a row.'};
const TILE_TIP = {entered: 'Entered the flow: people who started it, per week', delivered: 'Got the email: emails delivered per week (Klaviyo calls these recipients)',
  opens: 'Open rate: opens ÷ emails delivered. Apple Mail Privacy inflates it', clicks: 'Click rate: clicks ÷ emails delivered',
  orders: 'Placed-order rate: orders ÷ emails delivered', order_size: 'Order size: revenue ÷ orders (average order value, AOV)',
  unsubs: 'Unsubscribe rate: unsubscribes ÷ emails delivered'};
const ROW_TIP = {rpr: 'RPR: revenue per recipient. The revenue the flow brought in ÷ the emails delivered', revenue: 'Revenue: every dollar the flow brought in'};
const BASE_TIP = 'The baseline: the average of the 4 quiet weeks. The % from baseline compares the last 7 days with it';
const PCT_TIP = '% from baseline = (last 7 days − baseline) ÷ baseline. Held: under 12% either way';
const LIGHT = ['band', 'wobble', 'size', 'ruleout', 'happened', 'action', 'start', 'logrow', 'touch', 'when', 'ruleout2', 'action2', 'store', 'added', 'segment', 'verdict7'];
const isWalk = r => r.way === 'whole' || r.way === 'walk7';   // Read the whole chart: Level 1's walk, and Level 7's   // quick reps: a right answer moves on by itself
const LEVEL_NAME = {watch: 'Watch', together: 'Together', guided: 'Guided', solo: 'Solo', hard: 'Hard', try: 'Try one'};
const fm2 = v => '$' + (+v).toFixed(2);

// ---------------------------------------------------------------- the path summary
async function loadPath() {
  [PROG, PATH] = await Promise.all([getJ('/api/lf/progress'), getJ('/api/lf/path?level=' + LVL), typeof loadModes === 'function' ? loadModes() : null,   // more ways to play: lifecycle_files_modes.js
    typeof loadSampler === 'function' ? loadSampler() : null]);   // one of each, rated: lifecycle_files_sampler.js
  KS = PATH.keys || {}; return PATH;
}
const stepOf = id => PATH && PATH.steps.find(s => s.id === id);
const stepDone = id => { const s = stepOf(id); return !!s && s.status === 'done'; };
function stepLabel(s) {
  if (s.type !== 'join') return `Step ${s.n} of ${(PATH && PATH.units) || 16}`;
  const m = s.id.match(/j(\d+)-(\d+)$/), a = +m[1], b = +m[2]; return `Join ${b - a === 1 ? a + '+' + b : a + '-' + b}`;
}
const partsOf = () => Object.keys(PATH.parts).map(Number);
const chipLabel = s => s.type === 'join' ? stepLabel(s).replace('Join ', '') : String(s.n);
function wayLine(s) { const w = [...new Set((s.ways || []).map(x => PATH.way_names[x]))]; return w.join(', '); }

// ---------------------------------------------------------------- hub: one next thing, the path in four parts, your Flow tab
function nextThing() {
  const s = stepOf(PATH.next);
  if (PATH.rounds_due) return {k: 'Warm-up · about 3 minutes', t: 'Rounds', p: `${PATH.rounds_reps} reps mixed from the steps you've passed, more of the ones you missed or haven't seen lately.`, cta: 'Start Rounds', go: () => playRounds()};
  if (!s) return {k: `Level ${PATH.level} done`, t: 'Every step passed', p: PATH.case_step ? `Rounds keep it fresh. Level ${PATH.level + 1} is open on the level path.` : 'Rounds keep it fresh. Case files for this level come later.', cta: 'Rounds', go: () => playRounds()};
  if (s.type === 'case') {
    const L = PROG['level' + PATH.level], nT = (L.board || []).length || 15;
    if (PATH.level === 2) return {k: `Part ${s.part} · Step ${s.n} of ${PATH.units} · ${L.solved.length} of ${nT} case types solved`, t: L.played ? 'Next case' : s.title, p: L.played
      ? 'The six questions on the whole screen, Changes included, no options.' : 'The six questions on the whole screen, with Changes. Question 5 asks which change explains it. Nudges on the first three.',
      cta: L.played ? 'Next case' : 'Open the first case', go: () => playStep(s.id)};
    return {k: `Part 4 · Step 16 of 16 · ${L.solved.length} of ${nT} case types solved`, t: L.played ? 'Next case' : 'The case file', p: L.played
      ? 'The six questions on the whole Flow tab, no options. Every question is one you\'ve practiced.'
      : 'First, watch one worked case: the game points at each of the six questions. Then your own cases, with nudges on the first three.',
      cta: L.played ? 'Next case' : PROG.level0.done ? 'Open the first case' : 'Watch a worked case', go: () => playStep('s16')};
  }
  const what = s.type === 'unit' ? (s.adds.length ? `New on screen: ${s.adds.map(k => CHART_NAME[k]).join(', ')}.` : 'A new way to read what\'s already on screen.')
    : s.new ? s.new : s.way_new ? `A new way to play: ${PATH.way_names[s.way_new]}, on what you already know.` : 'Nothing new: the last steps, mixed together.';
  const where = !s.meet ? 'Starts with a Meet: watch one, do one together, then practice.' : s.level === 'guided' ? `${s.guided_left} guided rep${s.guided_left === 1 ? '' : 's'} left, then solo.` : `${s.rule[1]} right of your last ${s.rule[0]} solo reps passes it.`;
  return {k: `Part ${s.part} · ${stepLabel(s)} · ${s.reps ? 'keep going' : s.meet ? 'practice' : 'Meet'}`, t: s.title, p: `${what} ${where}`, cta: s.reps || s.meet ? 'Keep going' : 'Start', go: () => playStep(s.id)};
}
function pathHtml() {
  return `<div class="ppath">${partsOf().map(part => { const ss = PATH.steps.filter(s => s.part === part), done = ss.filter(s => s.status === 'done').length;
    return `<div class="ppart"><div class="pph"><b>Part ${part}</b><span>${esc(PATH.parts[part])}</span><small>${done} of ${ss.length}</small></div><div class="pchips">${ss.map(s =>
      `<div class="pchip t-${s.type} ${s.status}" ${s.status !== 'locked' ? `data-step="${s.id}"` : ''} data-tip="${esc(stepLabel(s) + ': ' + s.title + (s.ways && s.ways.length ? ' · ' + wayLine(s) : ''))}">
        <span class="pn">${esc(chipLabel(s))}${s.star ? ' ★' : ''}</span><b>${esc(s.type === 'join' ? s.title : s.title)}</b>${s.status === 'cur' && s.last && s.last.length ? pipsHtml(s.last, s.rule[0]) : ''}</div>`).join('')}</div></div>`; }).join('')}</div>`;
}
function dashHtml() {
  const have = PATH.have, coming = PATH.coming;
  const tile = (k, cls, sub) => `<div class="dtile ${cls}"><b>${esc(CHART_NAME[k])}</b><small>${esc(sub)}</small></div>`;
  if (!have.length && !coming.length) return '<p class="meta" style="margin:0">Nothing yet.</p>';
  return `<div class="dash">${have.map(k => tile(k, JUST.includes(k) ? 'fresh' : '', CARD_Q[k] || DASH_SUB[k] || '')).join('')}${coming.map(k => tile(k, 'tease', 'coming next')).join('')}</div>${PATH.level > 1 ? `<p class="meta" style="margin:8px 0 0">${PATH.level === 7 ? 'Level 1\'s main chart stays on screen. The tiles step aside.' : 'Every Level 1 chart stays on screen.'}</p>` : ''}`;
}
function dayHtml() {
  const t = PATH.today;
  if (!t.reps) return '<p class="meta" style="margin:0">Nothing played yet today. A step takes about five minutes.</p>';
  return `<div class="stats"><div><b>${t.reps}</b>reps</div><div><b>${Math.round(t.right / t.reps * 100)}%</b>right</div><div><b>${t.median_ms ? (t.median_ms / 1000).toFixed(1) + ' s' : '–'}</b>median on right answers</div></div>`;
}
async function home() {
  if (EMBED) return embedHome();
  if (V.rec) await voiceStop();
  S = null; G.on = false; document.querySelector('.guide')?.remove(); closeVeil(); if (R) clearTimeout(R.timer); R = null;
  await loadPath();
  mode('hub', PATH.level); updProg();
  document.getElementById('title').textContent = PATH.title;
  const nx = nextThing(); NEXT = nx.go;
  app.innerHTML = `${pxBanner(PATH.level <= 1 ? 'The welcome flow is yours this quarter. Read it with me, one chart at a time.' : `Level ${PATH.level}: ${esc(PATH.title)}. Same office, bigger questions.`)}<div class="card next"><div><span class="k">${esc(nx.k)}</span><h3>${esc(nx.t)}</h3><p>${esc(nx.p)}</p></div><button class="btn big" id="go" data-go-main>${esc(nx.cta)}</button></div>
    ${typeof samplerCard === 'function' && PATH.level === 1 ? samplerCard() : ''}
    ${pathHtml()}
    <div class="hubgrid"><div class="card" style="padding:14px 16px"><h4 style="margin:0 0 8px;font-size:14px">${PATH.level > 1 ? `Level ${PATH.level} adds` : 'Your Flow tab so far'}</h4>${dashHtml()}</div>
      <div class="card" style="padding:14px 16px"><h4 style="margin:0 0 8px;font-size:14px">Today</h4>${dayHtml()}</div></div>
    ${typeof modesHtml === 'function' && PATH.level === 1 ? modesHtml() : ''}
    ${PROG['level' + PATH.level] && (PATH.cases_open || PROG['level' + PATH.level].played) ? boardHtml(PROG['level' + PATH.level], PATH.level) : ''}
    <div class="later">${PATH.case_step ? '<button id="early">Play a case now, with every chart open</button>' : ''}<button id="lv0">Level 0: walk the six questions once</button>${PATH.casebook.some(c => c.open) ? '<button id="cbk">Casebook</button>' : ''}<a href="/lifecycle-files/try" style="font:600 12.5px var(--sans);color:var(--muted)">The three prototypes</a></div>`;
  JUST = [];
  document.getElementById('go').onclick = () => nx.go();
  app.querySelectorAll('[data-step]').forEach(n => n.onclick = () => playStep(n.dataset.step));
  const sg = document.getElementById('sampgo'); if (sg) sg.onclick = () => samplerHome();
  const ea = document.getElementById('early'); if (ea) ea.onclick = () => startCase(PATH.level);
  document.getElementById('lv0').onclick = () => startCase(0);
  const cbk = document.getElementById('cbk'); if (cbk) cbk.onclick = casebook;
  if (typeof modesBind === 'function') modesBind(app);
  tips(app); scrollTo({top: 0});
}
document.getElementById('home').onclick = home;

// ---------------------------------------------------------------- the level path flyout, the teaser, the progress pill
function flyHtml() {
  const cur = curLevel(), cb = PATH ? PATH.casebook.filter(c => c.open).length : 0, anyPassed = PATH && PATH.steps.some(s => s.status === 'done' && s.type !== 'case');
  return `<h3>The path <button class="gico" id="flyx" style="color:var(--muted);border-color:var(--line)">Q</button></h3>
    ${LVLS.map(([lv, name, sub]) => { const st = lvState(lv);
      return `<div class="lv ${st}${lv === cur ? ' cur' : ''}" data-lv="${lv}"><span class="dot">${st === 'done' ? '✓' : lv}</span><div><b>${esc(name)} <kbd>${lv}</kbd></b><small>${esc(sub)}${st === 'locked' ? '. Locked: you can still play it early.' : ''}</small></div></div>${PATH && lv === PATH.level ? l1steps() : ''}`; }).join('')}
    <div class="flylinks">
      ${anyPassed ? `<button data-fly="rounds">Rounds <small>daily mixed reps</small></button>` : ''}
      <button data-fly="casebook">Casebook <small>${cb} of 15 found</small></button>
      <button data-fly="keys">Keys <small>${Object.keys(KEYS).filter(taught).length} unlocked</small></button>
      ${typeof modesFly === 'function' ? modesFly() : ''}
    </div>`;
}
function l1steps() {
  return `<div class="lvsub">${partsOf().map(part => { const ss = PATH.steps.filter(s => s.part === part), cur = ss.find(s => s.status === 'cur'), done = ss.filter(s => s.status === 'done').length;
    const go = cur || [...ss].reverse().find(s => s.status === 'done');
    return `<span class="${done === ss.length ? 'done' : cur ? 'cur' : 'locked'}" ${go ? `data-step="${go.id}"` : ''}>Part ${part}: ${esc(PATH.parts[part])} · ${done} of ${ss.length}</span>`; }).join('')}</div>`;
}
function bindFly() {
  const f = document.getElementById('fly');
  f.querySelector('#flyx').onclick = () => fly(false);
  f.querySelectorAll('[data-lv]').forEach(n => n.onclick = () => { fly(false); goLevel(+n.dataset.lv); });
  f.querySelectorAll('[data-step]').forEach(n => n.onclick = e => { e.stopPropagation(); fly(false); playStep(n.dataset.step); });
  f.querySelectorAll('[data-fly]').forEach(n => n.onclick = () => { fly(false); ({rounds: playRounds, casebook, keys: () => showKeys(true)})[n.dataset.fly](); });
  if (typeof modesBind === 'function') modesBind(f);
}
function teaser() {
  if (!PATH) return '';
  if (PATH.coming.length) return `🔒 Next: <b>${PATH.coming.map(k => CHART_NAME[k]).join(' + ')}</b>`;
  if (!PATH.cases_open) return PATH.case_step ? '🔒 Next: <b>the case files</b>' : '';
  const nx = TABS.find(([l]) => !lvOpen(l)); return nx ? `🔒 Next tab: <b>${nx[1]}</b>` : '';
}
function updProg() {
  const p = document.getElementById('prog'); p.hidden = !PROG; if (!PROG) return;
  if ((!S || !S.case) && PATH && !PATH.cases_open) { p.textContent = `Level ${PATH.level}: ${PATH.steps.filter(s => s.status === 'done').length} of ${PATH.steps.length} steps`; return; }
  const lv = S && S.case && S.case.level >= 2 ? S.case.level : 1, L = PROG['level' + lv];
  p.textContent = `Level ${lv}: ${L.solved.length} of ${(L.board || []).length || 15} case types solved${L.review.length ? ` · ${L.review.length} to revisit` : ''}`;
}

// ---------------------------------------------------------------- starting a step: the Meet, then the reps
async function playStep(id, level) {
  if (V.rec) await voiceStop();
  S = null; G.on = false; document.querySelector('.guide')?.remove(); closeVeil(); if (R) clearTimeout(R.timer);
  const lv = /^\d/.test(id) ? +id[0] : 1;
  if (!PATH || lv !== LVL) { LVL = lv; await loadPath(); }
  const s = stepOf(id);
  if (!s) return home();
  if (s.type === 'case') return lv === 2 ? startCase(2) : PROG.level0.done || PROG.level1.played ? startCase(1) : startCase(0);
  R = {sid: id, rounds: false, level: level || null, run: [], combo: 0, rep: null, out: null, timer: null};
  if (s.has_meet && !s.meet && !level) return meetIntro(id);
  return nextRep();
}
async function playRounds() {
  if (R) clearTimeout(R.timer);
  if (!PATH) await loadPath();
  R = {sid: PATH.level > 1 ? 'rounds' + PATH.level : 'rounds', rounds: true, level: null, run: [], combo: 0, len: PATH.rounds_reps, rep: null, out: null, timer: null};
  return nextRep();
}
function meetIntro(id) {
  const s = stepOf(id), m = PATH.meet[id];
  mode('rep', PATH.level); document.getElementById('title').textContent = `Level ${PATH.level} · Part ${s.part}`;
  app.innerHTML = `<div class="card meet pop"><span class="k">Part ${s.part} · ${esc(stepLabel(s))} · Meet</span><h3>${esc(s.title)}</h3>
    <div class="sym"><span class="who">${esc(m.dana[0])}</span><p>${esc(m.dana.replace('{flow}', 'After Your Order'))}</p></div>
    <p class="mtext">${esc(m.intro)}</p>
    <ol class="msteps"><li class="on">Watch me do one</li><li>Do one together</li><li>The name for it</li><li>Practice: ${s.type === 'unit' ? '4 guided, then solo' : '3 guided, then solo'}</li></ol>
    <div class="row"><button class="btn big" id="mgo" data-go-main>Show me</button></div></div>`;
  document.getElementById('mgo').onclick = () => { R.level = 'watch'; nextRep(); };
  narrate(m.dana.replace('{flow}', 'After Your Order'), m.intro);
}
function termCard(id) {
  const s = stepOf(id), m = PATH.meet[id];
  const v = veil(`<div class="card unlock"><span class="k">${esc(s.title)} · the name for it</span><h3>${esc(m.term[0])}</h3><div class="term"><b>What people call it</b>${esc(m.term[1])}</div>
    <p style="margin:0 0 12px;color:var(--ink2);font-size:14px">${s.type === 'unit' ? 'Four guided reps next: easy cases, and the hand shows where to look. Then solo.' : 'Three guided reps of the new way next, then solo, mixed with what you know.'}</p>
    <div class="row"><button class="btn" id="tgo" data-go-main>Start practice</button></div></div>`);
  sound('unlock'); narrate(`The name for it: ${m.term[0]}.`, m.term[1]);
  v.querySelector('#tgo').onclick = async () => { closeVeil(); PATH = await post('/api/lf/path/meet', {step: id}); R.level = null; nextRep(); };
}

// ---------------------------------------------------------------- one rep: deal, show, answer
async function nextRep() {
  if (!R) return home(); clearTimeout(R.timer); hush();
  const body = {step: R.sid}; if (R.level) body.level = R.level; if (R.way) body.way = R.way;
  const r = await (R.next || post('/api/lf/path/deal', body)); R.next = null;
  if (r.error) { toast(esc(r.error)); return home(); }
  R.rep = r; R.out = null; R.st = {guess: r.q && r.q.defaults ? {...r.q.defaults} : {}, struck: [], flipped: [], cards: {}, sub: 0, ans: {}, beat: 0, walked: [], node: null};
  R.busy = false; R.t0 = performance.now();
  if (r.walk) voPrefetch(r.walk.map(b => b.say));
  mode('rep', PATH.level); updProg(); document.getElementById('title').textContent = R.samp != null ? 'Try every way to play' : R.rounds ? 'Rounds' : `Level ${PATH.level} · Part ${stepOf(r.step).part}`;
  if (R.samp != null) sampPill();
  repShow();
  const said = r.msg && !['callit', 'action'].includes(r.way) ? r.msg : '';
  if (r.level === 'together' && r.hint) narrate(said, 'Your turn.', r.hint.say);
  else if (r.level === 'guided' && r.hint && !R.run.length) narrate(said, r.hint.say);    // the first guided rep of a sitting
}
function headHtml() {
  const r = R.rep, s = stepOf(r.step);
  const kick = R.samp != null ? sampKick() : R.rounds ? `Rounds · ${Math.min(R.run.length + (R.out ? 0 : 1), R.len)} of ${R.len} · from ${stepLabel(s)}` : `Part ${s.part} · ${stepLabel(s)}`;
  const pips = R.rounds ? pipsHtml(R.run.map(x => x.ok), R.len) : r.level === 'solo' || r.level === 'hard' ? pipsHtml(s.last, s.rule[0]) : '';
  return `<div class="mghead"><div><span class="k">${esc(kick)}</span><h3>${esc(R.samp != null ? SAMP.stations[R.samp].name : s.title)}</h3></div><span class="sp"></span>
    <span class="waychip">${esc(r.way_name)}</span><span class="lvchip ${r.level}">${esc(LEVEL_NAME[r.level])}</span>
    <span class="stage ${r.stage}">${esc(STAGE_BADGE[r.stage] || r.stage)}</span>
    <span data-tip="${R.rounds ? 'This round' : `Your last ${s.rule[0]} solo reps. ${s.rule[1]} right, ending on a right one, passes.`}">${pips}</span><span class="combo" id="combo">${R.combo > 1 ? '×' + R.combo : ''}</span></div>`;
}
function guideHtml() {
  const r = R.rep;
  if (r.level === 'watch' && r.walk && !R.out) {
    const b = r.walk[Math.min(R.st.beat, r.walk.length - 1)];
    return `<div class="guide pguide"><div class="gx"><b>Watch · ${R.st.beat + 1} of ${r.walk.length}</b>${esc(b.say)}</div><div class="gn"><button class="btn2" id="wskip" style="background:none;color:var(--panel);border-color:rgba(255,255,255,.3)">Skip</button><button class="btn" id="wnext" data-go-main>Next</button></div></div>`;
  }
  if (r.level === 'try' && r.hint && !R.out)   // the sampler: the hint waits until he asks
    return R.st.hintOn ? `<div class="guide pguide hand"><div class="gx"><b>Where to look</b>${esc(r.hint.say)}</div></div>` : '<div class="hintask"><button class="btn2" id="hinton">Stuck? Show me where to look</button></div>';
  if ((r.level === 'together' || r.level === 'guided') && r.hint && !R.out)
    return `<div class="guide pguide hand"><div class="gx"><b>${r.level === 'together' ? 'Together: your turn' : 'Where to look'}</b>${esc(r.hint.say)}</div></div>`;
  return '';
}
function spotsNow() {
  const r = R.rep;
  if (R.out && (r.way === 'lookalike' || r.way === 'lookalike2')) { const f = R.out.ok || R.out.guessed ? R.out.rejected : R.out.pick;     // outline what rules out the option in question
    return new Set((R.out.why_not[f] || []).map(k => ['main', 'revenue', 'lastweek', 'emails'].includes(k) ? k : 'tile-' + k)); }
  if (R.out) return new Set(R.out.spots || []);
  if (r.level === 'watch' && r.walk) return new Set(r.walk[Math.min(R.st.beat, r.walk.length - 1)].spot || []);
  if (isWalk(r) && R.st.flash && R.st.flash.length && !(r.level === 'guided' || (r.level === 'try' && R.st.hintOn))) return new Set(R.st.flash);
  if ((r.level === 'together' || r.level === 'guided' || (r.level === 'try' && R.st.hintOn)) && r.hint) return new Set(r.hint.spot || []);
  return new Set();
}
function repShow() {
  const r = R.rep, sp = spotsNow();
  if (r.level === 'watch' && r.walk && !R.out && R.st.spoke !== R.st.beat) {
    const b = r.walk[Math.min(R.st.beat, r.walk.length - 1)];
    narrate(R.st.beat === 0 && r.msg && !['callit', 'action'].includes(r.way) ? r.msg : '', b.say);
    R.st.spoke = R.st.beat;
  }
  const body = ({band: oneQ, wobble: oneQ, size: oneQ, happened: oneQ, ruleout: oneQ, action: actionHtml, start: startHtml, whole: wholeHtml,
    callit: callitHtml, lookalike: lookHtml, suspects: susHtml, logrow: () => r.form === 'day' ? rowsQ() : logQ(), touch: touchHtml, when: rowsQ, which: rowsQ,
    ruleout2: logQ, lookalike2: lookHtml, suspects2: susHtml, action2: actionHtml, store: l7Q, added: l7Q, verdict7: l7Q, segment: segQ, walk7: wholeHtml})[r.way](sp);
  app.innerHTML = `<div class="mg prep">${headHtml()}${guideHtml()}${r.msg && r.way !== 'callit' && r.way !== 'action' ? `<div class="sym" data-spot="msg"><span class="who">${(r.msg[0] || '!').replace(/[^JNM]/, '!')}</span><p>${esc(r.msg)}</p></div>` : ''}
    ${body}<div class="mgfb" id="fb">${R.out ? fbHtml() : ''}</div>
    <div class="mgfoot"><span>${R.run.length ? `${R.run.filter(x => x.ok).length} of ${R.run.length} right this sitting` : 'No timer. Take the time you need.'} · Made-up numbers.</span><span class="sp"></span>
      ${!R.rounds && stepDone(r.step) && !['hard', 'watch', 'together', 'try'].includes(r.level) ? '<button class="btn2" id="hardon">Hard mode (optional)</button>' : ''}<button class="btn2" id="mgdone">Done for now</button></div></div>`;
  const side = app.querySelector('.ptwo.l2 .pside'), fb = document.getElementById('fb');   // Level 2: the verdict sits above the log, next to its reasons
  if (side && fb && R.out) side.prepend(fb);
  const side7 = app.querySelector('.ptwo.l7 .pside');   // Level 7: the cards fill the screen, so the verdict sits under the answers
  if (side7 && fb && R.out) side7.append(fb);
  const ws = isWalk(r) && !R.out && app.querySelector('.pside'); if (ws) ws.scrollTop = ws.scrollHeight;   // the walk: keep the current question in view
  sp.forEach(k => app.querySelectorAll(`[data-spot="${k}"]`).forEach(n => n.classList.add('spot')));
  const first = app.querySelector('.spot'); if (first && !R.out && first.getBoundingClientRect().bottom > innerHeight) first.scrollIntoView({block: 'center', behavior: 'smooth'});
  repBind();
  tips(app);
}

// ---------------------------------------------------------------- charts
function bigChart(r, {click, height = 230, showDots = true, today = null, pins = []} = {}) {
  const m = r.charts.main, s = m.series, n = s.length, dates = r.dates, band = m.band, dots = showDots && m.dots && r.visible.includes('dots') ? m.dots : null;
  const narrow = innerWidth < 640, W = narrow ? 440 : 1000, H = height, L = narrow ? 52 : 60, Rr = narrow ? 10 : 14, Tp = 12, B = 28;   // a phone draws fewer units, so the text stays readable
  const bw = band.hi - band.lo, near = v => v >= band.lo - 1.2 * bw && v <= band.hi + 1.2 * bw;   // far-off single days sit on the edge, drawn hollow
  const vals = s.filter(v => v != null).concat([band.lo, band.hi], dots ? dots.filter(v => v != null && near(v)) : []);
  let lo = Math.min(...vals), hi = Math.max(...vals); const pad = (hi - lo) * 0.08 || hi * 0.1 || 1; lo = Math.max(0, lo - pad); hi += pad;
  const x = i => L + i / (n - 1) * (W - L - Rr), y = v => Tp + (1 - (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * (H - Tp - B);
  const d = s.map((v, i) => v == null ? '' : `${i && s[i - 1] != null ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const days = new Set([...spotsNow()].filter(k => k.startsWith('day-')).map(k => +k.slice(4)));
  const mine = R.st.ans.day, end = today != null ? today : n - 1;   // the last 7 days: the end of the chart, or "today" while a round plays out
  const yt = [band.lo, band.hi], far = (y(band.lo) + y(band.hi)) / 2 < (Tp + H - B) / 2 ? lo + (hi - lo) * 0.06 : hi - (hi - lo) * 0.06;   // label the band's edges, plus the far end
  if (Math.min(Math.abs(y(far) - y(band.lo)), Math.abs(y(far) - y(band.hi))) > 24) yt.push(far);
  return `<svg viewBox="0 0 ${W} ${H}" class="bigc${click ? ' clickable' : ''}" id="bigc" data-n="${n}" data-l="${L}" data-r="${Rr}" data-w="${W}">
    <rect class="bandr" data-spot="band" x="${L}" y="${y(band.hi)}" width="${W - L - Rr}" height="${Math.max(2, y(band.lo) - y(band.hi))}"/>
    <text class="ax" x="${L + 6}" y="${y(band.hi) + 13}">normal range (the four quiet weeks)</text>
    ${today != null && today < n - 1 ? `<rect class="future" x="${x(today)}" y="${Tp}" width="${x(n - 1) - x(today)}" height="${H - Tp - B}"/>` : ''}
    <rect class="endzone" data-spot="end" x="${x(end - 6) - 4}" y="${Tp}" width="${x(end) - x(end - 6) + 8}" height="${H - Tp - B}" rx="6"/>
    ${yt.map(v => `<text class="ax" x="${L - 6}" y="${y(v) + 3}" text-anchor="end">${fm2(v)}</text>`).join('')}
    ${(narrow ? [0, 14, 28, 42] : [0, 7, 14, 21, 28, 35, 42]).filter(i => i < n - (narrow ? 8 : 4)).concat([n - 1]).map(i => `<text class="ax" x="${x(i)}" y="${H - 8}" text-anchor="middle">${dates[i]}</text>`).join('')}
    ${dots ? `<g data-spot="dots" class="dotsg">${dots.map((v, i) => v == null ? '' : `<circle class="dt${v < lo || v > hi ? ' off' : ''}" data-spot="dot-${i}" cx="${x(i)}" cy="${y(v)}" r="3"/>`).join('')}</g>` : ''}
    <path class="ln" data-spot="line" d="${d}"/>
    ${[...days].map(i => `<line class="dayk" x1="${x(i)}" x2="${x(i)}" y1="${Tp}" y2="${H - B}"/><text class="daykt" x="${x(i) + 5}" y="${Tp + 22}">${R.out ? 'started ' : ''}${dates[i]}</text>`).join('')}
    ${mine != null ? `<line class="mine" x1="${x(mine)}" x2="${x(mine)}" y1="${Tp}" y2="${H - B}"/><text class="minet" x="${x(mine) + 5}" y="${Tp + 10}">you: ${dates[mine]}</text>` : ''}
    ${marksSvg(r.changes, x, H - B, 11)}
    ${today != null ? `<line class="today" x1="${x(today)}" x2="${x(today)}" y1="${Tp}" y2="${H - B}"/><text class="todayt" x="${x(today) - 5}" y="${Tp + 10}" text-anchor="end">today</text>` : ''}
    ${pins.map((p, k) => `<line class="pin ${p.cls}" x1="${x(p.i)}" x2="${x(p.i)}" y1="${Tp}" y2="${H - B}"/><text class="pint ${p.cls}" x="${x(p.i) + (x(p.i) > W * 0.8 ? -5 : 5)}" y="${Tp + 11 + k * 13}" text-anchor="${x(p.i) > W * 0.8 ? 'end' : 'start'}">${esc(p.label)} ${dates[p.i]}</text>`).join('')}
  </svg>`;
}
function marksSvg(changes, x, base, fs) {   // Level 2: each change's day, numbered as in the log. Same-day changes stack
  if (!changes || !changes.length) return '';
  const seen = {};
  return changes.filter(c => c.di >= 0).map(c => { const k = seen[c.di] = (seen[c.di] || 0) + 1;
    return `<g class="mk" data-spot="mark-${c.n}"><line x1="${x(c.di)}" x2="${x(c.di)}" y1="${base - 9}" y2="${base}"/><text x="${x(c.di)}" y="${base - 11 - (k - 1) * (fs + 1)}" text-anchor="middle" style="font-size:${fs}px">${c.n}</text></g>`; }).join('');
}
const BAD_UP = ['unsubs', 'bounces', 'complaints'];   // numbers where up is the bad direction: red when they rise
function chip2(c, o = {}) { const held = Math.abs(c) < (o.held || 0.12), p = held ? Math.floor(Math.abs(c * 100)) : Math.round(Math.abs(c * 100));
  return `<span class="chg ${held ? 'flat' : (c < 0) !== !!o.inv ? 'dn' : 'up'}">${held ? 'held ' : c >= 0 ? '▲ ' : '▼ '}${p}%</span>`; }
function emCell(e, c) {   // one cell of the Each email table. Small counts swing by chance, so they show gray with a tip saying so
  if (e[c] == null) return '<span class="chg flat">–</span>';
  if (e.enough && e.enough[c] === false) return `<span class="chg flat few" data-tip="Too few a week to tell: a swing this size happens by chance">${e[c] >= 0 ? '▲' : '▼'} ${Math.round(Math.abs(e[c] * 100))}%</span>`;
  return c === 'unsubs' ? chip2(e[c], {inv: true, held: 0.5}) : chip2(e[c]);
}
function tsvg(series, {height = 96, width = 280, mini, marks} = {}) {
  const W = width, H = height, L = mini ? 4 : 8, Rr = 6, Tp = 6, B = 6, n = series.length;
  const v0 = series.filter(v => v != null); let lo = Math.min(...v0), hi = Math.max(...v0);
  const b = series.slice(0, 22).filter(v => v != null), m = b.reduce((a, c) => a + c, 0) / b.length; lo = Math.min(lo, m * 0.55); hi = Math.max(hi, m * 1.3);
  const x = i => L + i / (n - 1) * (W - L - Rr), y = v => Tp + (1 - (v - lo) / ((hi - lo) || 1)) * (H - Tp - B);
  const d = series.map((v, i) => v == null ? '' : `${i && series[i - 1] != null ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  return `<svg viewBox="0 0 ${W} ${H}"><line x1="${L}" x2="${W - Rr}" y1="${y(m)}" y2="${y(m)}" stroke="var(--line)" stroke-dasharray="3 3"/><path d="${d}" fill="none" stroke="var(--curve)" stroke-width="2.2" stroke-linejoin="round"/>${marksSvg(marks, x, H, 9)}</svg>`;
}
function scell(label, value, {spot, sub, tip} = {}) {
  return `<div class="scell"${spot ? ` data-spot="${spot}"` : ''}${tip ? ` data-tip="${esc(tip)}"` : ''}><span class="sl">${label}</span><b>${value}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
}
function factsHtml(r) {   // from Join 1-4 on, the % from baseline is on screen. Step 4 and Join 3-4 are where you work it out yourself
  const m = r.charts.main, v = r.charts.revenue, rows = [];
  if (r.visible.includes('size') && !['band', 'wobble', 'start'].includes(r.way))
    rows.push(`<span class="stag" data-tip="${esc(ROW_TIP.rpr)}">RPR</span>${scell('Avg. revenue per recipient', fm2(m.base), {spot: 'f-normal', sub: 'the baseline', tip: BASE_TIP})}${scell('Revenue per recipient, last 7 days', fm2(m.last), {spot: 'f-last'})}${r.show_pct ? scell('% from baseline', chip2(m.ch), {spot: 'f-pct', tip: PCT_TIP}) : ''}`);
  if (v && r.visible.includes('revenue'))
    rows.push(`<span class="stag" data-tip="${esc(ROW_TIP.revenue)}">Revenue</span><div class="sgroup" data-spot="revenue">${scell('Avg. weekly revenue', money(v.quiet), {sub: 'the baseline', tip: BASE_TIP})}${scell('Revenue, last 7 days', money(v.week))}${scell('% from baseline', chip2(v.ch), {tip: PCT_TIP})}</div>${r.visible.includes('lastweek') ? scell('Revenue, the week before', `${money(v.prev)} ${chip2(v.prev_ch)}`, {spot: 'lastweek', sub: 'with its % from baseline'}) : ''}`);
  return rows.length ? `<div class="pfacts" data-spot="facts">${rows.map(x => `<div class="srow">${x}</div>`).join('')}</div>` : '';
}
function mainCardP(r, opts = {}) {
  if (!opts.height && tileKeys(r).length) opts = {...opts, height: 185};   // shorter when tiles sit below it, so they fit on a laptop screen
  return `<div class="card pmain" data-spot="main" data-k="main"><h4>${esc(r.flow)} <span class="meta">${r.emails_n} emails · revenue per recipient (RPR), last 8 weeks${r.visible.includes('dots') ? ' · dots are single days' : ''}</span></h4>
    ${bigChart(r, opts)}${opts.facts === false ? '' : factsHtml(r)}</div>`;
}
function tileP(r, k, cls = '', extra = '') {
  if (k === 'emails') { const rows = r.charts.emails || [], cols = ['sent', 'opens', 'clicks', 'orders', 'order_size', 'unsubs'].filter(c => rows[0] && c in rows[0]);
    return `<div class="ptile wide${r.path_level === 2 ? ' full' : ''} ${cls}" data-spot="emails" data-k="emails"><h5><span class="tname" data-tip="Every email in the flow, side by side: each one's % from baseline, last 7 days against the four quiet weeks">Each email</span></h5><div class="q">% from baseline, last 7 days against the four quiet weeks${cols.includes('sent') ? ' · – : it sent nothing to compare' : ''}</div>
      <table class="etab"><tr><th></th>${cols.map(c => `<th data-tip="${esc((EM_HEAD[c] || [c, c])[1])}">${esc((EM_HEAD[c] || [c])[0])}</th>`).join('')}</tr>${rows.map(e => `<tr><td>${esc(e.name)} <span style="color:var(--muted)">day ${e.day}</span>${e.features && r.path_level === 2 ? `<small class="feat">features ${esc(e.features)}</small>` : ''}</td>${cols.map(c => `<td>${emCell(e, c)}</td>`).join('')}</tr>`).join('')}</table>${extra}</div>`; }
  const c = r.charts[k], [name, unit, fmt] = TILE2[k];
  const line = (label, value, tip) => `<div data-tip="${esc(tip)}"><span>${label}</span><b>${value}</b></div>`;
  return `<div class="ptile ${cls}" data-spot="tile-${k}" data-k="${k}"><h5><span class="tname" data-tip="${esc(TILE_TIP[k])}">${name}</span></h5><div class="q">${unit}</div>
    <div class="tstats">${line('Avg.', fmt(c.base), `Avg. ${unit} over the 4 quiet weeks: the baseline`)}${line('Last 7 days', fmt(c.last), `${unit[0].toUpperCase() + unit.slice(1)}, last 7 days`)}${line('% from baseline', chip2(c.ch, {inv: BAD_UP.includes(k)}), PCT_TIP)}</div>
    ${tsvg(c.series, {marks: r.changes})}${extra}</div>`;
}
const tileKeys = r => TILE_ORDER.filter(k => r.visible.includes(k)).concat(r.visible.includes('emails') ? ['emails'] : []);
function tilesP(r, decorate = () => ['', '']) {
  const ks = tileKeys(r); if (!ks.length) return '';
  return `<div class="ptiles">${ks.map(k => { const [cls, extra] = decorate(k); return tileP(r, k, cls, extra); }).join('')}</div>`;
}
function optsHtml(q, done) {
  const out = R.out, f = q.field, chosen = R.st.ans[f];
  return `<div class="pq" data-spot="q"><p class="mgq">${esc(q.ask)}</p><div class="ans n${q.options.length}${done ? ' locked' : ''}" id="ans">${q.options.map(([v, label], i) => {
    const right = out && (out.answer[f] === v || (Array.isArray(out.answer[f]) && out.answer[f].includes(v)) || (f === 'size' && out.ok && chosen === v));
    const cls = out ? (right ? 'right' : chosen === v ? 'wrong' : '') : chosen === v ? 'on' : '';
    return `<button data-a="${i}" data-v="${v}" data-spot="opt-${v}" class="${cls}">${esc(label)}</button>`; }).join('')}</div></div>`;
}

// ---------------------------------------------------------------- the ways to play
function oneQ() {
  const r = R.rep;
  const guess = r.way === 'ruleout' ? `<div class="pguess" data-spot="guess"><span class="k">Dana's guess</span><b>${esc(r.guess_text)}</b></div>` : '';
  const charts = r.way === 'band' || r.way === 'wobble' || r.way === 'size' ? mainCardP(r, {showDots: r.way !== 'band'}) : mainCardP(r) + tilesP(r);
  return `<div class="ptwo"><div>${charts}</div><div class="pside">${guess}${optsHtml(r.q, !!R.out)}</div></div>`;
}
// ---------------------------------------------------------------- Level 2: the log, and the ways that read it
function logPanel(r, {pick = false, guess = null} = {}) {
  const out = R.out, ans = out && out.answer ? out.answer.change : undefined, okset = Array.isArray(ans) ? ans : [ans], mine = R.st.ans.change;
  const rows = (r.changes || []).map((x, i) => {
    const st = out ? (okset.includes(x.id) ? 'right' : mine === x.id ? 'wrong' : '') : mine === x.id ? 'on' : '';
    const why = out && out.reasons && (out.reasons[x.id] || []).length ? `<span class="lwhy">✗ ${esc(out.reasons[x.id][0])}</span>`
      : out && out.reasons && okset.includes(x.id) ? '<span class="lwhy ok">✓ On the day, in the right place, and it can reach what moved</span>' : '';
    const inner = `<span class="lno">#${x.n}</span><span class="ld">${esc(x.date)}</span><span class="lw">${esc(x.where)}</span><span class="lt">${esc(x.what)}<small>${esc(x.who)}</small>${why}</span>`;
    return pick ? `<button class="lrow ${st}" data-a="${i}" data-spot="row-${x.id}">${inner}</button>` : `<div class="lrow ${guess === x.id ? 'guess' : ''}" data-spot="row-${x.id}">${inner}</div>`;
  }).join('');
  const last = r.q.options ? r.q.options[r.q.options.length - 1] : null;
  const none = pick && last && last[0] === 'none' ? `<button class="lrow none ${out ? (okset.includes('none') ? 'right' : mine === 'none' ? 'wrong' : '') : mine === 'none' ? 'on' : ''}" data-a="${r.q.options.length - 1}" data-spot="opt-none"><span class="lno">–</span><span class="lt">${esc(last[1])}</span></button>` : '';
  return `<div class="card plog" data-spot="log"><h4>Changes <span class="meta">oldest first · each number marks its day on the charts</span></h4><div class="lrows${out ? ' locked' : ''}"${pick ? ' id="ans"' : ''}>${rows}${none}</div></div>`;
}
function rowsQ() {   // which, when, and "which change was made on…": the log's rows are the answers
  const r = R.rep, ask = `<div class="pq" data-spot="q"><p class="mgq">${esc(r.q.ask)}</p><p class="meta" style="margin:0">${esc(ROWS_HOW[r.way] || 'Click a row.')}</p></div>`;
  if (r.way === 'logrow') return `<div class="ptwo l2"><div>${mainCardP(r, {facts: false})}${logPanel(r, {pick: true})}</div><div class="pside">${ask}</div></div>`;   // short left side: the log goes under the chart
  return `<div class="ptwo l2"><div>${mainCardP(r, r.way === 'when' ? {facts: false} : {})}${tilesP(r)}</div><div class="pside">${ask}${logPanel(r, {pick: true})}</div></div>`;
}
function logQ() {    // "where is change #3?", and Rule it out with a change as the guess: the log is there to read
  const r = R.rep, guess = r.way === 'ruleout2' ? `<div class="pguess" data-spot="guess"><span class="k">Dana's guess</span><b>${esc(r.guess_text)}</b></div>` : '';
  if (r.way === 'logrow') return `<div class="ptwo l2"><div>${mainCardP(r, {facts: false})}${logPanel(r)}</div><div class="pside">${optsHtml(r.q, !!R.out)}</div></div>`;
  return `<div class="ptwo l2"><div>${mainCardP(r)}${tilesP(r)}</div><div class="pside">${guess}${optsHtml(r.q, !!R.out)}${logPanel(r, {guess: r.guess_row})}</div></div>`;
}
function touchHtml() {
  const r = R.rep, e = r.entry;
  return `<div class="card pcause" data-spot="entry"><span class="k">One row from the Changes log · ${esc(r.flow || '')}</span>
    <div class="lrow solo"><span class="ld">${esc(e.date)}</span><span class="lw">${esc(e.where)}</span><span class="lt">${esc(e.what)}<small>${esc(e.who)}</small></span></div>
    <p class="meta">Pick the first number this change can move. Keys 1 to 6.</p></div>${optsHtml(r.q, !!R.out)}`;
}
function actionHtml() {
  const r = R.rep;
  return `<div class="card pcause" data-spot="cause"><span class="k">The cause</span><div class="cause">${esc(r.cause_text)}</div><p class="meta">${esc(r.story)}</p></div>${optsHtml(r.q, !!R.out)}`;
}
function startHtml() {
  const r = R.rep, q = r.q;
  const dayPart = R.st.ans.day == null ? '<p class="meta" style="margin:0 0 8px">Click the chart on the day it started.</p>' : `<p class="meta" style="margin:0 0 8px">You marked ${esc(r.dates[R.st.ans.day])}. Click again to move it.</p><div class="daynudge"><button class="btn2" data-nudge="-1" aria-label="One day earlier">◀</button><span class="meta">one day</span><button class="btn2" data-nudge="1" aria-label="One day later">▶</button></div>`;
  return `<div class="ptwo"><div>${mainCardP(r, {click: !R.out})}</div><div class="pside">${dayPart}${optsHtml(q, !!R.out)}</div></div>`;
}
// ---------------------------------------------------------------- Level 7: Store orders and the Holdout (lf_path7.py, lf_level7.py)
// Both cards draw the same picture: two marks on one line ("nothing changed", "it's real") and a dot with its bar (the
// store's normal wobble, the holdout's range). A mark inside the bar fits. Which one does the dot sit near?
const n0 = v => Math.round(v).toLocaleString('en-US'), p1 = v => (+v).toFixed(1);
function markLine(o) {   // drawn in HTML so the words stay the same size on any card width
  const lo0 = Math.min(o.nothing, o.real, o.dot - o.half), hi0 = Math.max(o.nothing, o.real, o.dot + o.half), pad = (hi0 - lo0) * 0.06 || 1;
  const lo = lo0 - pad, hi = hi0 + pad, pc = v => ((v - lo) / (hi - lo) * 100).toFixed(2);
  const marks = [['nothing changed', o.nothing], ["it's real", o.real]].sort((a, b) => a[1] - b[1]), close = true;
  const lab = (m, i) => { const p = +pc(m[1]), dn = close && i === 1, al = p < 16 ? 'al' : p > 84 ? 'ar' : 'ac';   // one label above the line, one below, so they never collide
    return `<i class="mk ${dn ? 'dn' : 'up'}" style="left:${p}%"></i><span class="mkl ${dn ? 'dn' : 'up'} ${al}" style="left:${p}%">${m[0]} <b>${o.fmt(m[1])}</b></span>`; };
  return `<div class="mline2${close ? ' close' : ''}"><div class="ax"></div><div class="bar" style="left:${pc(o.dot - o.half)}%;width:${(pc(o.dot + o.half) - pc(o.dot - o.half)).toFixed(2)}%"></div>
    ${marks.map(lab).join('')}<div class="dotm" style="left:${pc(o.dot)}%"></div></div>`;
}
function storeSvg(s) {   // the store's 7-day total, with its normal wobble around the quiet weeks' average
  const v = s.series, n = v.length, W = 440, H = 64, P = 4;
  const lo0 = Math.min(...v, s.base - s.wobble), hi0 = Math.max(...v, s.base + s.wobble), pad = (hi0 - lo0) * 0.1 || 1, lo = lo0 - pad, hi = hi0 + pad;
  const x = i => P + i / (n - 1) * (W - 2 * P), y = val => P + (1 - (val - lo) / (hi - lo)) * (H - 2 * P);
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="ssvg"><rect class="band" x="${P}" y="${y(s.base + s.wobble)}" width="${W - 2 * P}" height="${y(s.base - s.wobble) - y(s.base + s.wobble)}"/>
    <path class="ln" d="${v.map((val, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(val).toFixed(1)}`).join('')}"/></svg>`;
}
function chgN(a, b) { const d = Math.round(b - a); return `<span class="chg ${d === 0 ? 'flat' : d > 0 ? 'up' : 'dn'}">${d >= 0 ? '+' : '−'}${n0(Math.abs(d))}</span>`; }
function storeCard(r) {
  const s = r.charts.store, c = s.credited;
  return `<div class="card l7c" data-spot="store"><h4><span class="tname" data-tip="Every order the store took, from every source: email, ads, search, people typing the address. Each order counts once">Store orders</span> <span class="meta">every order, from every source · 7-day total</span></h4>
    ${storeSvg(s)}
    <div class="l7rows"><div class="l7r hd"><span></span><small>Avg. a week</small><small>Last 7 days</small><small>Change</small></div>
      <div class="l7r"><span>The store</span><b>${n0(s.base)}</b><b>${n0(s.last)}</b>${chgN(s.base, s.last)}</div>
      <div class="l7r cr" data-spot="st-credited"><span data-tip="Orders Klaviyo credits to this flow: placed within a few days of someone opening or clicking one of its emails">Credited to this flow</span><b>${n0(c.base)}</b><b>${n0(c.last)}</b>${chgN(c.base, c.last)}</div></div>
    <div class="l7m" data-spot="st-marks">${markLine({nothing: s.marks.nothing, real: s.marks.real, dot: s.last, half: s.wobble, fmt: n0})}
      <p class="meta"><i class="lg dot"></i>the store, last 7 days <i class="lg bar"></i>its normal wobble, ±${n0(s.wobble)} a week · this flow is ${Math.round(s.share * 100)}% of store orders</p></div></div>`;
}
function holdCard(r) {
  const h = r.charts.holdout, q = h.quiet, l = h.last;
  const row = (label, k, cls = '', tip = '') => `<div class="l7r ${cls}"><span${tip ? ` data-tip="${esc(tip)}"` : ''}>${label}</span><b>${p1(q[k])}</b><b>${p1(l[k])}</b></div>`;
  return `<div class="card l7c" data-spot="holdout"><h4><span class="tname" data-tip="1 in 10 people who enter the flow are picked at random and get no emails. What they order is what everyone would have ordered anyway">Holdout</span> <span class="meta">1 in 10 who enter get no emails · orders per 100 people</span></h4>
    <div class="l7rows h3"><div class="l7r hd"><span></span><small>Quiet weeks</small><small>Last 14 days</small></div>
      <div data-spot="hd-rows">${row('Got the emails', 'got')}${row('Held out', 'held')}${row('Added: got − held out', 'added', 'add', 'What the emails added: orders per 100 who got them, minus orders per 100 held out')}</div>
      <div data-spot="hd-credited">${row('Credited by Klaviyo', 'credited', 'cr', 'What Klaviyo credits to the flow, per 100 people who got the emails')}</div></div>
    <div class="l7m" data-spot="hd-marks">${markLine({nothing: h.marks.nothing, real: h.marks.real, dot: l.added, half: l.range, fmt: p1})}
      <p class="meta"><i class="lg dot"></i>Added, last 14 days <i class="lg bar"></i>its range, ±${p1(l.range)} · held out: ${n0(l.held_n)} people, ${n0(l.held_orders)} orders</p></div></div>`;
}
function segCard(r) {
  const rows = r.seg, lo0 = Math.min(0, ...rows.map(x => x.added - x.range)), hi0 = Math.max(...rows.map(x => x.added + x.range)), pad = (hi0 - lo0) * 0.06 || 1;
  const lo = lo0 - pad, hi = hi0 + pad, pc = v => ((v - lo) / (hi - lo) * 100).toFixed(2);
  const strip = `<div class="segstrip">${rows.map(g => `<div class="sgr"><span>${esc(g.name)}</span><div class="trk"><i class="zero" style="left:${pc(0)}%"></i>
    <div class="bar" style="left:${pc(g.added - g.range)}%;width:${(pc(g.added + g.range) - pc(g.added - g.range)).toFixed(2)}%"></div><div class="dotm" style="left:${pc(g.added)}%"></div></div><b>${p1(g.added)}</b></div>`).join('')}</div>`;
  return `<div class="card l7c" data-spot="segments"><h4>${esc(r.flow || '')} <span class="meta">the holdout by group · last 4 weeks · orders per 100 people</span></h4>
    <div class="l7rows g5"><div class="l7r hd"><span></span><small>Credited</small><small>Got the emails</small><small>Held out</small><small>Added</small></div>
      ${rows.map(g => `<div class="l7r"><span>${esc(g.name)}</span><b class="crd">${p1(g.credited)}</b><b>${p1(g.got)}</b><b>${p1(g.held)}</b><b class="ad">${p1(g.added)} <small>±${p1(g.range)}</small></b></div>`).join('')}</div>
    <div class="l7m" data-spot="seg-added">${strip}<p class="meta"><i class="lg dot"></i>Added <i class="lg bar"></i>its range · the dashed line is zero · held out: ${rows.map(g => `${esc(g.name.split(' ')[0].toLowerCase())} ${n0(g.held_n)} people`).join(', ')}</p></div></div>`;
}
function l7Left(r) {
  return mainCardP(r, {height: 150, facts: false}) + `<div class="l7cards">${r.visible.includes('store') ? storeCard(r) : ''}${r.visible.includes('holdout') ? holdCard(r) : ''}</div>`;
}
function l7Q() { const r = R.rep; return `<div class="ptwo l7"><div>${l7Left(r)}</div><div class="pside">${optsHtml(r.q, !!R.out)}</div></div>`; }
function segQ() { const r = R.rep; return `<div class="ptwo l7"><div>${segCard(r)}</div><div class="pside">${optsHtml(r.q, !!R.out)}</div></div>`; }
// Read the whole chart (lf_path.walk_nodes): one question at a time, down the case's branch. Each answer goes to
// /api/lf/path/check, which says right or wrong and why, then sends the next question. The answers so far stay listed
// with their reasons, so the walk reads as the thought process, start to finish.
function walkNode() { return R.st.node || R.rep.q.node; }
function nodeLabel(q, a) {   // an answer in words: an option's label, or for the start "Step, from 10-03"
  if (!q) return '';
  if (q.id === 'when') { const o = q.options.find(x => x[0] === (a || {}).shape); return `${o ? o[1] : '?'}, from ${R.rep.dates[(a || {}).day] || '?'}`; }
  const v = a && typeof a === 'object' && !Array.isArray(a) ? a[q.field] : a;
  return (Array.isArray(v) ? v : [v]).map(x => (q.options.find(o => o[0] === x) || ['', String(x)])[1]).join(' or ');
}
function wholeHtml() {
  const r = R.rep, st = R.st, q = R.out ? null : walkNode();
  const last = st.walked.length - 1;   // while walking: the reason under the newest answer and every miss. At the end: all of them
  const done = st.walked.map((w, i) => `<div class="pdone ${w.ok ? 'ok' : 'no'}"><span class="pq2">${w.ok ? '✓' : '✗'} ${esc(w.ask)}</span> <b>${esc(w.mine)}</b>${w.ok || !w.right ? '' : `<span class="pright">It's ${esc(w.right)}</span>`}${!q || !w.ok || i === last ? `<small class="pwhy">${esc(w.why)}</small>` : ''}</div>`).join('');
  const dayNote = q && q.click ? (st.ans.day == null ? '<p class="meta" style="margin:0 0 8px">Click the chart on the day it started.</p>' : `<p class="meta" style="margin:0 0 8px">You marked ${esc(r.dates[st.ans.day])}.</p><div class="daynudge"><button class="btn2" data-nudge="-1" aria-label="One day earlier">◀</button><span class="meta">one day</span><button class="btn2" data-nudge="1" aria-label="One day later">▶</button></div>`) : '';
  const left = r.path_level === 7 ? l7Left(r) : mainCardP(r, {click: !!(q && q.click) && r.level !== 'watch'}) + tilesP(r);
  return `<div class="ptwo${r.path_level === 7 ? ' l7' : ''}"><div>${left}</div><div class="pside"><div class="card pwalk" style="padding:12px 14px"><span class="k">${q ? `Question ${st.walked.length + 1}` : `${st.walked.length} question${st.walked.length === 1 ? '' : 's'}`}</span>${done}${q ? dayNote + optsHtml(q, r.level === 'watch') : ''}</div></div></div>`;
}
async function walkCheck(q) {
  const r = R.rep, st = R.st, body = q.id === 'when' ? {shape: st.ans.shape, day: st.ans.day} : {[q.field]: st.ans[q.field]};
  st.wait = true;
  const res = await post('/api/lf/path/check', {rid: r.rid, i: st.walked.length, ...body});
  st.wait = false;
  if (res.error) { toast(esc(res.error)); return nextRep(); }
  if (res.retry) {   // Together: not quite, try this one again (nothing is shown or counted)
    sound('no'); delete st.ans[q.field]; repShow();
    document.getElementById('fb').innerHTML = `<div class="box no"><div>${pxr(false)}<b>Not quite. Look again.</b><div class="why">${esc(res.say)}</div></div></div>`;
    document.getElementById('ans')?.classList.add('shake'); narrate('Not quite. Look again.', res.say); return;
  }
  st.walked.push({ask: q.ask, id: q.id, ok: res.ok, mine: nodeLabel(q, body), right: nodeLabel(q, res.right), why: res.why});
  st.flash = res.ok ? [] : res.spots || [];
  if (res.ok) sound('key', 3); else { sound('no'); narrate('Not this one.', res.why); }
  if (res.next) { st.node = res.next; r.hint = res.next.hint || null; return repShow(); }
  return repSubmit({...st.ans});
}
function callitHtml() {
  const r = R.rep, out = R.out, P = R.st.guess;
  const real = k => { if (!out) return ''; const c = r.charts;
    if (k === 'emails') return `<span>${(c.emails || []).map(x => `${esc(x.name)}: ${Object.keys(x).filter(z => !['name', 'day'].includes(z)).map(z => `${z} ${chip2(x[z])}`).join(' ')}`).join(' · ')}</span>`;
    if (k === 'main') return `${tsvg(c.main.series, {height: 34, width: 150, mini: true})}<span>${esc(out.say[out.obs.main] || '')}</span>`;
    if (k === 'shape') return `${tsvg(c.main.series, {height: 34, width: 150, mini: true})}<span>${esc(out.say[out.obs.shape] || 'not part of this story')}</span>`;
    if (k === 'revenue') return `<span>${chip2(c.revenue.ch)} on the quiet weeks</span>`;
    if (k === 'lastweek') return `<span>${chip2(c.revenue.prev_ch)} on the quiet weeks</span>`;
    return `${tsvg(c[k].series, {height: 34, width: 150, mini: true})}${chip2(c[k].ch)}`; };
  const rows = r.q.rows.map(k => { const [name, sub, opts] = ROWDEF[k], m = out ? out.marks[k] : undefined, truth = out && out.script[k];
    return `<div class="lab" data-spot="row-${k}">${name}<small>${sub}</small></div><div class="seg" data-row="${k}">${opts.map(([v, l]) => `<button data-v="${v}"${k === 'shape' ? ` data-tip="${SHAPE_TIP[v]}"` : ''} class="${P[k] === v ? 'on' : ''}${out && P[k] === v ? (m === true ? ' r' : m === false ? ' w' : '') : ''}${out && m === false && truth === v ? ' truth' : ''}">${l}</button>`).join('')}</div>
      <div class="real">${out ? `<span class="mark ${m === true ? 'r' : m === false ? 'w' : 'n'}">${m === true ? '✓' : m === false ? '✗' : '·'}</span>${m == null ? '<span style="color:var(--muted)">not part of this story</span> ' : ''}${real(k)}${out.notes && out.notes[k] ? `<small class="rnote">${esc(out.notes[k])}</small>` : ''}` : ''}</div>`; }).join('');
  return `<div class="card pcause" data-spot="cause"><span class="k">The cause</span><div class="cause">${esc(r.story)}</div><p class="meta">It happened in ${esc(r.flow)} (${r.emails_n} emails) about a week ago. What will each chart show for the last 7 days?</p></div>
    <div class="card" style="padding:14px 16px" data-spot="rows"><div class="pgrid">${rows}</div>${out ? '' : '<div class="foot"><span class="meta">Start from "held" and change only what this cause would move.</span><button class="btn" id="check" data-spot="check" data-go-main>Check</button></div>'}</div>`;
}
function lookHtml() {
  const r = R.rep, out = R.out, L = R.st, name = k => (r.options.find(x => x.kind === k) || {}).cause;
  const focus = out ? (out.ok || out.guessed ? out.rejected : out.pick) : null;
  const T = out ? (out.answer && out.answer.pick) || out.kind : null;   // Level 2 options are log rows: the answer is a row id
  const deciding = out && focus && focus !== T ? out.why_not[focus] || [] : [];
  const pick = L.sub === 1 && !out;
  const say = (k, key) => { if (r.way === 'lookalike2') return `<div class="why">${esc((out.why_text[focus] || [])[0] || '')}</div>`;
    const v = (out.scripts[focus] || {})[key === 'main' ? 'main' : key]; return v == null ? '' : `<div class="why"><b>${esc(name(focus))}</b> would show ${esc(out.say[v] || v)} here.</div>`; };
  const deco = k => [`${pick ? 'pickable' : ''} ${deciding.includes(k) ? 'key' : ''} ${out && L.ans.proof === k ? 'mine' : ''}`, deciding.includes(k) ? say(focus, k) : ''];
  const optsH = r.options.map((o, i) => `<button class="opt ${out ? (o.kind === T ? 'truth' : o.kind === out.pick ? 'wrong' : '') : L.ans.pick === o.kind ? 'on' : ''}" data-pick="${o.kind}" data-a="${i}" data-spot="opt-${o.kind}" ${out || pick ? 'disabled' : ''}>${esc(o.cause)}</button>`).join('');
  const ask = pick ? `<div class="ask">You ruled out <b>${esc(name(L.ruleOut))}</b>. Click the chart that proves it: a tile, the email table or the main chart.</div>` : '';
  const l2 = r.way === 'lookalike2';
  return `<div class="ptwo${l2 ? ' l2' : ''}"><div><div class="${pick ? 'pickmain' : ''}">${mainCardP(r)}</div>${tilesP(r, deco)}</div>
    <div class="pside"><div class="card pboard" data-spot="opts"><h4>${l2 ? 'Which change explains it?' : 'Which one fits every chart?'}</h4><p class="meta">${l2 ? 'Both changes land when it started. Only one fits everything. Pick it, then click the chart that rules out the other one.' : 'All of them could explain the big move. Only one fits everything. Pick it, then click the chart that rules out another one.'}</p><div class="opts2"${out || pick ? '' : ' id="ans"'}>${optsH}</div>${ask}</div>${l2 ? logPanel(r) : ''}</div></div>`;
}
function susHtml() {
  const r = R.rep, st = R.st, out = R.out, left = r.looks - st.flipped.length;
  const cards = tileKeys(r).map(k => {
    const open = st.cards[k] || (out && out.charts[k]);
    if (!open) return `<div class="ptile down ${left <= 0 || out ? 'spent' : ''}" data-flip="${k}" data-spot="card-${k}"><div><h5><span>${esc(CHART_NAME[k])}</span></h5><div class="q">${esc(CARD_Q[k])}</div></div><span class="cost">${left > 0 ? 'Flip · 1 look' : 'No looks left'}</span></div>`;
    const rr = {...r, charts: {...r.charts, [k]: open}};
    const why = out ? Object.entries(out.why_not).filter(([s, ks]) => ks.includes(k) && !out.free_out.includes(s)).map(([s]) => r.suspects.find(x => x.kind === s).cause) : [];
    return tileP(rr, k, `${st.flipped.includes(k) && !out ? 'flip' : ''} ${out && out.best.includes(k) ? 'key' : ''} ${out && st.flipped.includes(k) ? 'mine' : ''}`,
      why.length ? `<div class="why"><b>Rules out:</b> ${why.map(esc).join(', ')}</div>` : '');
  }).join('');
  const T = out ? (out.answer && out.answer.accuse) || out.kind : null;   // Level 2 suspects are log rows: the answer is a row id, not the case type
  const board = r.suspects.map(s => { const x = st.struck.includes(s.kind);
    const cls = out ? (s.kind === T ? 'truth' : s.kind === out.accused ? 'wrongpick' : x ? 'out' : '') : x ? 'out' : '';
    const note = out ? (s.kind === T ? '<small>The answer</small>' : x ? ((out.strikes.find(y => y.kind === s.kind) || {}).fair ? '<small>Crossed out fairly</small>' : '<small style="color:var(--fail)">Nothing you saw ruled this out</small>')
      : out.still_fit.includes(s.kind) ? '<small>Still fit what you saw</small>' : '<small>You could have crossed this out</small>') : '';
    return `<div class="sus ${cls}" data-s="${s.kind}" data-spot="sus-${s.kind}"><span><span class="nm">${esc(s.cause)}</span>${note}</span>${out ? '' : `<button class="acc" data-acc="${s.kind}">Accuse</button>`}</div>`; }).join('');
  const l2 = r.way === 'suspects2';
  return `<div class="ptwo${l2 ? ' l2' : ''}"><div>${mainCardP(r)}<div class="ptiles" data-spot="cards">${cards}</div></div>
    <div class="pside"><div class="card pboard"><div style="display:flex;justify-content:space-between;align-items:center"><h4>${l2 ? 'Suspects: the changes' : 'Suspects'}</h4>
      <span class="looks">${Array.from({length: r.looks}, (_, i) => `<i class="${i < st.flipped.length ? 'used' : ''}"></i>`).join('')} ${left} look${left === 1 ? '' : 's'} left · par ${r.need}</span></div>
      <p class="meta">Click a suspect to cross it out. Accuse when you're sure. The main chart and the revenue rows are free${l2 ? ', and so is the log' : ''}.</p>${board}${stopHtml(st)}</div>${l2 ? logPanel(r) : ''}</div></div>`;
}
function stopHtml(st) {   // Suspects: what's on screen already rules out someone he hasn't crossed out (lf_path.sus_stop)
  if (!st.stop || R.out) return '';
  const go = st.stop.act.accuse ? 'Accuse anyway' : 'Flip anyway';
  return `<div class="susstop" data-spot="stop"><b>${esc(st.stop.say)}</b><div class="row"><button class="btn" id="stopok">I'll look</button>${typeof voiceStart === 'function' ? '<button class="btn2" id="stoptalk">🎙 Talk it through</button>' : ''}<button class="btn2" id="stopgo">${go}</button></div></div>`;
}

// ---------------------------------------------------------------- input
function repBind() {
  const r = R.rep;
  document.getElementById('mgdone').onclick = () => repDone();
  const hb = document.getElementById('hardon'); if (hb) hb.onclick = () => { R.level = 'hard'; R.next = null; nextRep(); };
  const nb = document.getElementById('pnext'); if (nb) nb.onclick = () => afterRep();
  const ws = document.getElementById('wnext'); if (ws) ws.onclick = () => walkStep();
  const wk = document.getElementById('wskip'); if (wk) wk.onclick = () => walkEnd();
  if (R.out || r.level === 'watch') { const c = app.querySelector('.prep'); c && (c.onclick = e => { if (R.timer && !e.target.closest('button')) { clearTimeout(R.timer); R.timer = null; toast('Paused. <kbd>Enter</kbd> for the next one.', 1600); } }); }
  if (R.out || r.level === 'watch') return;
  app.querySelectorAll('#ans [data-a]').forEach(b => b.onclick = () => choose(+b.dataset.a));
  const svg = document.getElementById('bigc');
  if (svg && svg.classList.contains('clickable')) {
    const n = +svg.dataset.n, L = +svg.dataset.l, Rr = +svg.dataset.r, W = +svg.dataset.w;
    const dayAt = x => { const b = svg.getBoundingClientRect(); return Math.max(0, Math.min(n - 1, Math.round(((x - b.left) / b.width * W - L) / (W - L - Rr) * (n - 1)))); };
    if (!TOUCH) svg.onclick = e => { R.st.ans.day = dayAt(e.clientX); sound('key', 2); repShow(); };
    else {   // a finger covers several days: drag along the chart, a line follows with its date, lifting marks it
      svg.style.touchAction = 'pan-y';
      const NS = 'http://www.w3.org/2000/svg', H = svg.viewBox.baseVal.height, xi = i => L + i / (n - 1) * (W - L - Rr);
      let ln = null, tx = null, cur = null;
      const show = i => { cur = i; if (!ln) { ln = document.createElementNS(NS, 'line'); ln.setAttribute('class', 'mine'); tx = document.createElementNS(NS, 'text'); tx.setAttribute('class', 'minet'); svg.append(ln, tx); }
        ln.setAttribute('x1', xi(i)); ln.setAttribute('x2', xi(i)); ln.setAttribute('y1', 12); ln.setAttribute('y2', H - 28);
        const right = xi(i) > W * 0.7; tx.setAttribute('x', xi(i) + (right ? -5 : 5)); tx.setAttribute('y', 24); tx.setAttribute('text-anchor', right ? 'end' : 'start'); tx.textContent = r.dates[i]; };
      svg.onpointerdown = e => { svg.setPointerCapture(e.pointerId); show(dayAt(e.clientX)); };
      svg.onpointermove = e => { if (ln && svg.hasPointerCapture(e.pointerId)) { const i = dayAt(e.clientX); if (i !== cur) { show(i); sound('key'); } } };
      svg.onpointerup = () => { if (cur == null) return; R.st.ans.day = cur; sound('key', 2); repShow(); };
      svg.onpointercancel = () => { if (ln) { ln.remove(); tx.remove(); ln = tx = null; } cur = null; };   // the finger scrolled the page instead
    }
    app.querySelectorAll('[data-nudge]').forEach(b => b.onclick = () => { if (R.st.ans.day == null) return; R.st.ans.day = Math.max(0, Math.min(n - 1, R.st.ans.day + +b.dataset.nudge)); sound('key', 2); repShow(); });
  }
  if (r.way === 'callit') {
    app.querySelectorAll('.seg button').forEach(b => b.onclick = () => { R.st.guess[b.parentElement.dataset.row] = b.dataset.v; sound('key', 1); repShow(); });
    const ck = document.getElementById('check'); if (ck) ck.onclick = () => repSubmit({guess: R.st.guess});
  }
  if (r.way === 'lookalike' || r.way === 'lookalike2') {
    if (R.st.sub === 0) app.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => lookPick(b.dataset.pick));
    else app.querySelectorAll('.ptile.pickable, .pickmain .pmain, .pickmain [data-spot="revenue"], .pickmain [data-spot="lastweek"]').forEach(n => n.onclick = e => { e.stopPropagation(); lookProof(n.dataset.k || n.dataset.spot); });
  }
  if (r.way === 'suspects' || r.way === 'suspects2') {
    app.querySelectorAll('[data-flip]').forEach(n => n.onclick = () => flipCard(n.dataset.flip, n));
    app.querySelectorAll('.sus').forEach(n => n.onclick = e => { if (e.target.closest('[data-acc]')) return; strike(n.dataset.s); });
    app.querySelectorAll('[data-acc]').forEach(b => b.onclick = () => accuse(b.dataset.acc));
    const so = document.getElementById('stopok'), sg = document.getElementById('stopgo'), sk = document.getElementById('stoptalk');
    if (so) so.onclick = () => { R.st.stop = null; repShow(); };
    if (sk) sk.onclick = () => voiceStart();
    if (sg) sg.onclick = () => { const a = R.st.stop.act; R.st.stop = null; a.accuse ? accuse(a.accuse, true) : flipCard(a.flip, null, true); };
  }
}
function choose(i) {   // an option button, or keys 1-5
  if (!R || R.out || R.busy || R.rep.level === 'watch') return false;
  const r = R.rep;
  if (isWalk(r)) { const q = walkNode(), opt = q && q.options[i]; if (!opt) return false;
    if (R.st.wait) return true;
    if (q.click && R.st.ans.day == null) { toast('Click the chart on the day it started first.'); return true; }
    R.st.ans[q.field] = opt[0]; sound('key', 2); walkCheck(q); return true; }
  if ((r.way === 'lookalike' || r.way === 'lookalike2') && R.st.sub === 0) { const o = r.options[i]; if (!o) return false; lookPick(o.kind); return true; }   // keys pick a look-alike
  const q = r.q; if (!q || !q.options || !q.options[i]) return false;
  if (r.way === 'start' && R.st.ans.day == null) { toast('Click the chart on the day it started first.'); return true; }
  R.st.ans[q.field] = q.options[i][0];
  repSubmit(r.way === 'start' ? {day: R.st.ans.day, shape: R.st.ans.shape} : {[q.field]: q.options[i][0]});
  return true;
}
function lookPick(kind) {
  const r = R.rep; R.st.ans.pick = kind; R.st.sub = 1;
  R.st.ruleOut = r.closest && kind !== r.closest ? r.closest : r.options.find(x => x.kind !== kind).kind;   // outside Watch: the first option you didn't pick
  sound('key', 1); repShow();
}
function lookProof(key) { R.st.ans.proof = key; return repSubmit({pick: R.st.ans.pick, proof: key, rule_out: R.st.ruleOut}); }
async function stopFirst(act) {   // Suspects: before a flip or an accusation, stop him if what's on screen already rules out more
  if (R.rep.way !== 'suspects' || R.rep.level === 'watch') return false;
  const res = await post('/api/lf/path/stop', {rid: R.rep.rid, struck: R.st.struck, accuse: act.accuse || null}).catch(() => ({}));
  if (!res.stop) return false;
  R.st.stop = {say: res.say, act}; sound('key', 1); repShow(); narrate(res.say);
  return true;
}
async function accuse(kind, force) {
  if (R.out || R.busy) return;
  if (!force && await stopFirst({accuse: kind})) return;
  R.st.stop = null; repSubmit({struck: R.st.struck, accuse: kind});
}
async function flipCard(k, node, force) {
  const st = R.st; if (R.out || st.cards[k]) return;
  if (st.flipped.length >= R.rep.looks) { node && (node.classList.add('shake'), setTimeout(() => node.classList.remove('shake'), 320)); return; }
  if (!force && R.rep.level !== 'watch' && await stopFirst({flip: k})) return;
  st.stop = null;
  const res = await post('/api/lf/path/flip', {rid: R.rep.rid, card: k});
  if (res.error) { toast(esc(res.error)); return; }
  st.cards[k] = res.chart; st.flipped = res.flipped; sound('key', 3); repShow();
}
function strike(kind) { const st = R.st; st.stop = null; st.struck = st.struck.includes(kind) ? st.struck.filter(x => x !== kind) : st.struck.concat(kind); sound('key', 1); repShow(); }

// ---------------------------------------------------------------- Watch: the game plays one and says each move
async function walkStep() {
  const r = R.rep, b = r.walk[R.st.beat];
  if (b && b.do && isWalk(r)) return walkDo(b);
  if (b && b.do) await applyDo(b.do);
  if (R.out) return;
  if (R.st.beat >= r.walk.length - 1) return walkEnd();
  R.st.beat++; repShow();
}
async function applyDo(d) {
  const r = R.rep, st = R.st;
  if (d.day != null) st.ans.day = d.day;
  ['pos', 'real', 'size', 'what', 'verdict', 'shape', 'change', 'touch', 'where', 'store', 'added', 'seg', 'line'].forEach(f => { if (d[f] != null) st.ans[f] = d[f]; });
  if (d.action) st.ans.action = d.action;
  if (d.row) st.guess[d.row[0]] = d.row[1];
  if (d.pick) { st.ans.pick = d.pick; st.ruleOut = r.closest && d.pick !== r.closest ? r.closest : r.options.find(x => x.kind !== d.pick).kind; }
  if (d.proof) st.ans.proof = d.proof;
  if (d.strike && !st.struck.includes(d.strike)) st.struck.push(d.strike);
  if (d.flip) await flipCard(d.flip);
  sound('key', 2);
  if (d.check) return repSubmit({guess: st.guess});
  if (d.accuse) return repSubmit({struck: st.struck, accuse: d.accuse});
  if (d.proof) return repSubmit({pick: st.ans.pick, proof: st.ans.proof, rule_out: st.ruleOut});
  if (r.way === 'start' && d.shape) return repSubmit({day: st.ans.day, shape: st.ans.shape});
  const f = r.q && r.q.field;
  if (f && d[f] != null && !isWalk(r) && r.way !== 'start') return repSubmit({[f]: d[f]});
}
function walkDo(b) {   // Watch, Read the whole chart: answer this question, list it with its reason, show the next one
  const r = R.rep, st = R.st, d = b.do, q = r.q.nodes[d.node];
  Object.keys(d).filter(k => k !== 'node').forEach(k => { st.ans[k] = d[k]; });
  st.walked.push({ask: q.ask, id: q.id, ok: true, mine: nodeLabel(q, d), right: '', why: b.why || ''}); sound('key', 2);
  st.node = r.q.nodes[d.node + 1] || null;
  if (!st.node) return repSubmit({...st.ans});
  st.beat++; repShow();
}
async function walkEnd() {   // Skip, or the last beat: submit the demo answer so the feedback shows
  const r = R.rep, a = r.demo || {};
  if (R.out) return;
  if (isWalk(r)) return repSubmit({...a, action: Array.isArray(a.action) ? a.action[0] : a.action});
  if (r.way === 'callit') return repSubmit({guess: a.script});
  if (r.way === 'lookalike' || r.way === 'lookalike2') return repSubmit({pick: a.pick, proof: (r.walk.slice(-1)[0].do || {}).proof, rule_out: r.closest});
  if (r.way === 'suspects' || r.way === 'suspects2') return repSubmit({struck: r.suspects.map(s => s.kind).filter(k => k !== a.accuse), accuse: a.accuse});
  if (r.way === 'action' || r.way === 'action2') return repSubmit({action: a.action[0]});
  if (r.way === 'start') { R.st.ans.day = a.day; R.st.ans.shape = a.shape; return repSubmit({day: a.day, shape: a.shape}); }
  const f = r.q.field, v = Array.isArray(a[f]) ? a[f][0] : a[f]; R.st.ans[f] = v; return repSubmit({[f]: v});
}

// ---------------------------------------------------------------- answering
async function repSubmit(body) {
  if (!R || R.out || R.busy) return; R.busy = true;
  const r = R.rep, ms = Math.round(performance.now() - R.t0);
  const before = new Set(PATH.casebook.filter(c => c.open).map(c => c.kind));
  const out = await post('/api/lf/path/answer', {rid: r.rid, ms, ...body});
  R.busy = false;
  if (out.error) { toast(esc(out.error)); return nextRep(); }
  if (out.retry) {   // Together: not quite, try again (it doesn't count)
    sound('no'); R.st.ans = r.way === 'start' ? {day: R.st.ans.day} : {}; repShow();
    const fb = document.getElementById('fb'); fb.innerHTML = `<div class="box no"><div>${pxr(false)}<b>Not quite. Look again.</b><div class="why">${esc(r.hint ? r.hint.say : '')}</div></div></div>`;
    const a = document.getElementById('ans'); a && a.classList.add('shake'); narrate('Not quite. Look again.', r.hint ? r.hint.say : ''); return;
  }
  R.out = out; R.ms = ms;
  if (out.summary) PATH = out.summary;
  const counted = ['guided', 'solo', 'hard'].includes(r.level);
  if (counted) { R.run.push({ok: out.ok, ms}); R.combo = out.ok ? R.combo + 1 : 0; }
  R.newCard = out.ok && out.kind && !before.has(out.kind) && PATH.casebook.some(c => c.kind === out.kind && c.open);
  sound(out.ok ? 'ok' : 'no', R.combo);
  repShow(); updProg(); bar(PATH.level);
  if (!out.ok && r.level !== 'watch') { const w = app.querySelector('#fb .why'); narrate('Not this time.', w ? w.innerText : ''); }
  else if (r.level !== 'watch') hush();
  const a = document.getElementById('ans'); if (a) { if (out.ok) a.querySelector('.right')?.classList.add('pulse'); else a.classList.add('shake'); }
  const side = app.querySelector('.pside'), hit = side && side.querySelector('.lrow.right');   // a long log scrolls inside the side panel: bring the right row into view
  if (hit && side.scrollHeight > side.clientHeight) side.scrollTop = Math.max(0, hit.offsetTop - side.offsetTop - side.clientHeight / 2 + hit.offsetHeight / 2);
  if (R.combo > 1) document.getElementById('combo')?.classList.add('bump');
  if (counted) R.next = post('/api/lf/path/deal', R.rounds ? {step: R.sid} : {step: R.sid, ...(R.level === 'hard' ? {level: 'hard'} : {})});   // dealt while you read
  if ((out.newly_passed || []).length) return setTimeout(() => unlockMoment(out.newly_passed[0]), 700);
  if (R.rounds && R.run.length >= R.len) { R.timer = setTimeout(() => repDone(true), 1800); return; }
  if (counted && out.ok && LIGHT.includes(r.way) && !R.newCard && !(V.rec || V.starting || V.finishing)) R.timer = setTimeout(nextRep, 1700);   // not while he's talking it through
}
function fbHtml() {
  const out = R.out, r = R.rep;
  let head = out.ok ? 'Right' : out.guessed ? 'Right pick, not proven' : 'Not this time', body = esc(out.why || '');
  if (r.way === 'start' || isWalk(r)) { const p = out.parts || {}, names = out.part_names || {}, bits = Object.entries(p).map(([k, v]) => `${v ? '✓' : '✗'} ${names[k] || ({real: 'real or wobble', shape: 'shape', day: 'the day', size: 'size'})[k]}`).join(' · ');
    body = isWalk(r) && R.st.walked.length ? `${bits}<br><span class="meta">The reason for each answer is beside the chart.</span>` : `${bits}<br>${body}`;
    if (isWalk(r)) head = out.ok ? 'Right all the way down' : `${Object.values(p).filter(Boolean).length} of ${Object.keys(p).length} right`; }
  if (r.way === 'callit') { const ok = out.moves.filter(k => out.marks[k]).length, okh = out.holds.filter(k => out.marks[k]).length;
    head = out.moves.length ? `You called ${ok} of the ${out.moves.length} chart${out.moves.length > 1 ? 's' : ''} this cause moves, and ${okh} of the ${out.holds.length} it leaves alone` : `This cause moves nothing. You kept ${okh} of ${out.holds.length} still`;
    body = out.ok ? 'The real case is beside each row.' : 'The green outlines show what this cause does. The real case is beside each row.'; }
  if (r.way === 'lookalike' || r.way === 'lookalike2') { const full = k => (r.options.find(x => x.kind === k) || {}).cause || k, lab = k => CHART_NAME[k] || k;
    const nm = k => r.way === 'lookalike2' ? full(k).split(' · ')[0] : `"${full(k)}"`;   // a log row goes by its number and day
    const focus = out.ok || out.guessed ? out.rejected : out.pick, dk = out.why_not[focus] || [];
    const says = k => (out.why_text[k] || []).map(esc).join(' ');
    body = out.ok || out.guessed ? (out.proof_ok ? `And ${esc(lab(out.proof))} does rule out ${esc(nm(out.rejected))}. ${says(out.rejected)}` : `${esc(lab(out.proof))} doesn't rule out ${esc(nm(out.rejected))}. <b>${dk.map(lab).map(esc).join(', ')}</b> does (outlined). ${says(out.rejected)}`)
      : `What rules out your pick: <b>${dk.map(lab).map(esc).join(', ')}</b> (outlined). ${says(out.pick)}`;
    if (r.options.length > 2) body += '<ul>' + r.options.filter(o => o.kind !== ((out.answer && out.answer.pick) || out.kind) && o.kind !== focus).map(o => `<li>${says(o.kind)}</li>`).join('') + '</ul>'; }
  if (r.way === 'suspects' || r.way === 'suspects2') { const lab = k => CHART_NAME[k] || k, hunch = out.strikes.filter(x => !x.fair).length;
    const nl = out.still_fit.length, sname = k => `"${esc((r.suspects.find(x => x.kind === k) || {}).cause || '')}"`;
    const fitWhy = out.still_why ? '<ul>' + out.still_fit.map(k => `<li>${sname(k)} still fit. ${esc((out.still_why[k] || {}).say || '')}</li>`).join('') + '</ul>' : '';
    body = `${out.ok ? `${out.looks} look${out.looks === 1 ? '' : 's'}, par ${out.need}.`
      : out.guessed ? `Right suspect, but it was a guess: with what you saw, ${nl === 1 ? 'another suspect' : `${nl} others`} still fit. ${out.still_why ? '' : 'Flip until only one is left.'}${fitWhy}`
      : `You accused ${sname(out.accused)}. ${esc((out.accused_why || {}).say || '')}`} Fastest path: <b>${out.best.map(lab).map(esc).join(', then ') || 'the free charts'}</b> (outlined).${hunch ? ` ${hunch} crossed out on a hunch.` : ''}`; }
  const named = !['band', 'size', 'start', 'wobble', 'callit', 'action', 'logrow', 'touch', 'when', 'which', 'action2'].includes(r.way) && (r.way !== 'whole' || r.visible.includes('revenue'));   // the walk names the cause once it reads more than the main chart
  const cause = out.cause && out.met && named ? `<div class="file">It was: ${esc(out.cause)}</div>` : '';
  if (out.reasons && ['which', 'when', 'ruleout2'].includes(r.way)) body += '<br><span class="meta">Each row in the log now says why it fits or doesn\'t.</span>';
  const lesson = out.lesson && out.met && r.way !== 'size'
    ? `<div class="lesson2"><b>${esc(out.name)} · ${esc(out.term)}</b>${esc(out.lesson)}</div>` : '';
  const counted = ['guided', 'solo', 'hard'].includes(r.level);
  const btn = r.level === 'watch' ? 'Your turn' : r.level === 'together' ? 'Next' : R.rounds && R.run.length >= R.len ? 'See how it went' : 'Next';
  return `<div class="box ${out.ok ? 'ok' : 'no'} pop"><div>${pxr(out.ok)}<b>${head}.</b> ${counted && out.ok ? `<span class="meta">${(R.run[R.run.length - 1].ms / 1000).toFixed(1)} s</span>` : ''}
    <div class="why">${body}</div>${cause}${lesson}${R.newCard ? '<span class="newcard">New in your Casebook</span>' : ''}</div><button class="btn" id="pnext" data-go-main>${btn}</button></div>`;
}
function afterRep() {
  const r = R.rep;
  if (R.samp != null) return sampRate();   // the sampler: three taps after each one
  if (r.level === 'watch') { R.level = 'together'; return nextRep(); }
  if (r.level === 'together') return termCard(r.step);
  if (R.rounds && R.run.length >= R.len) return repDone(true);
  return nextRep();
}
function repKey(i) { return R && R.rating ? sampKey(i) : R && R.mode ? modeKey(i) : choose(i); }

// ---------------------------------------------------------------- a pass, and the summary of a sitting
const KEYUNLOCK = {s1: 'levels', s2: 'help', 'j1-2': 'book', 'j1-4': null, s15: 'tiles'};   // KEYLESSON in the main script has the drills
function unlockMoment(sid) {
  if (R) clearTimeout(R.timer);
  const s = stepOf(sid), nx = stepOf(PATH.next), kl0 = KEYLESSON[sid], kl = TOUCH ? null : kl0;   // no key lesson on a phone; the key still counts as taught for the desktop
  sound('unlock'); narrate(`Passed: ${s.title}.`, kl ? kl.line : '');
  const gained = s.type === 'unit' && s.adds.length ? `<div class="got">${s.adds.map(k => `<span>+ ${esc(CHART_NAME[k])}</span>`).join('')}</div>` : '';
  const nextLine = nx ? `Next: ${nx.type === 'case' ? 'the case file' : stepLabel(nx) + ', ' + nx.title}` : `Level ${PATH.level} done`;
  const v = veil(`<div class="card unlock"><span class="k">Passed · Part ${s.part} · ${esc(stepLabel(s))}</span><h3>${esc(s.title)}</h3>${gained}
    ${nx && nx.type === 'join' && !nx.way_new ? '<p style="margin:0 0 10px;color:var(--ink2);font-size:14px">The next one adds nothing new. It mixes what you just learned with what came before, like playing two measures together.</p>' : ''}
    ${kl ? `<p style="margin:0 0 8px;font-size:14px">${kl.line}</p><div class="keylesson" id="kl"></div>` : ''}
    <div class="row"><button class="btn" id="unext" data-go-main ${kl ? 'disabled' : ''}>${esc(nextLine)}</button><button class="btn2" id="ustay">Keep practicing this one</button><button class="btn2" id="uhub">Hub</button></div></div>`);
  JUST = s.adds || [];
  if (kl0 && kl0.act) { KS[kl0.act] = KS[kl0.act] || {uses: [], nudged: 0}; KS[kl0.act].taught = true; }
  if (TOUCH && kl0) post('/api/lf/keys', {keys: KS});
  if (EMBED) { toOffice({type: 'passed', step: sid}); const b = v.querySelector('#unext'); b.textContent = 'Back to the office'; v.querySelector('#uhub').remove();
    b.onclick = () => { closeVeil(); toOffice({type: 'close'}); }; } else
  v.querySelector('#unext').onclick = () => { closeVeil(); nx ? playStep(nx.id) : home(); };
  v.querySelector('#ustay').onclick = () => { closeVeil(); nextRep(); };
  v.querySelector('#uhub').onclick = () => { closeVeil(); home(); };
  if (kl) drillStart(kl.drill, v.querySelector('#kl'), () => { v.querySelector('#unext').disabled = false; post('/api/lf/keys', {keys: KS}); });
}
function repDone(roundOver) {
  if (R && R.samp != null) return samplerHome();
  if (R && R.mode) return modeDone(roundOver);   // more ways to play (lifecycle_files_modes.js)
  if (!R) return home();
  clearTimeout(R.timer);
  const run = R.run, right = run.filter(x => x.ok), med = median(right.map(x => x.ms)), sid = R.sid, rounds = R.rounds;
  if (!run.length) return home();
  mode('sum', PATH ? PATH.level : 1);
  const s = rounds ? null : stepOf(sid);
  app.innerHTML = `<div class="card sumcard"><span class="k" style="font:600 11px var(--mono);color:var(--muted);text-transform:uppercase">${rounds ? 'Rounds' : esc(stepLabel(s) + ' · ' + s.title)}</span><h3>${rounds && roundOver ? 'Rounds done for today' : 'Done for now'}</h3>
    <div class="facts"><div><b>${run.length}</b><span>reps this sitting</span></div><div><b>${right.length}</b><span>right</span></div>
      <div><b>${med ? (med / 1000).toFixed(1) + ' s' : '–'}</b><span>median time on right answers</span></div>
      <div><b>${s ? (s.status === 'done' ? '✓' : `${s.last.filter(Boolean).length} of ${s.rule[0]}`) : '–'}</b><span>${s && s.status !== 'done' ? `last solo reps (${s.rule[1]} passes)` : 'passed'}</span></div></div>
    <p class="meta" style="margin:0 0 14px">Speed isn't scored. It drops by itself once the pattern is yours.</p>
    <div class="row"><button class="btn" id="sagain" data-go-main>Keep going</button><button class="btn2" id="shub">Hub</button></div></div>`;
  document.getElementById('sagain').onclick = () => rounds ? playRounds() : playStep(sid);
  document.getElementById('shub').onclick = home;
  NEXT = () => rounds ? playRounds() : playStep(sid);
}

// ---------------------------------------------------------------- embedded in the office: one step, no hub
async function embedHome() {
  if (V.rec) await voiceStop();
  S = null; closeVeil(); if (R) clearTimeout(R.timer); R = null;
  const sid = QS.get('step'); await loadPath(); const s = stepOf(sid);
  mode('hub', PATH.level); document.getElementById('title').textContent = s ? s.title : 'Lifecycle Files';
  app.innerHTML = `<div class="card next"><div><span class="k">${s ? esc(stepLabel(s)) : ''}</span><h3>${s ? esc(s.title) : ''}</h3><p>${s && s.status === 'done' ? 'Passed. Practise more, or head back to the office.' : 'Not passed yet.'}</p></div>
    <div class="row"><button class="btn big" id="go" data-go-main>Practise</button><button class="btn2" id="eback">Back to the office</button></div></div>`;
  NEXT = () => playStep(sid);
  document.getElementById('go').onclick = NEXT; document.getElementById('eback').onclick = () => toOffice({type: 'close'});
}

// ---------------------------------------------------------------- Casebook: the failure stories you've met, never required
async function casebook() {
  if (V.rec) await voiceStop();
  S = null; if (R) clearTimeout(R.timer);
  await loadPath();
  mode('book', 1); document.getElementById('title').textContent = 'Casebook';
  const n = PATH.casebook.filter(c => c.open).length;
  app.innerHTML = `<div class="card" style="padding:14px 18px;margin-bottom:12px"><p style="margin:0;color:var(--ink2)">One card for each failure story in Level 1: ${n} of 15 found. A card opens the first time you get its cause right on the path, or solve it in a case. Nothing here is required. It's where the stories you've met get written down.</p></div>
    <div class="cb">${PATH.casebook.map(c => c.open ? `<div class="cbc"><span class="term2">${esc(c.term)}</span><h4>${esc(c.name)}</h4><p><b>${esc(c.cause)}.</b> ${esc(c.story)}</p>
      <dl><dt>Moves</dt><dd>${esc(c.moves)}</dd><dt>Holds</dt><dd>${esc(c.holds)}</dd><dt>Look first</dt><dd>${esc(c.first)}</dd></dl>
      <div class="met">Met ${c.met} time${c.met === 1 ? '' : 's'}${c.solved ? ' · solved in a case' : ''}</div></div>` : '<div class="cbc shut">?</div>').join('')}</div>`;
  scrollTo({top: 0});
}

// ---------------------------------------------------------------- start
(async () => {
  await loadPath();
  const lvStart = lv => () => startCase(lv, QS.get('kind') || undefined, QS.get('stage') || undefined);
  ({'0': () => startCase(0), '1': lvStart(1), '2': lvStart(2), '3': lvStart(3), '4': lvStart(4), '5': lvStart(5), '6': lvStart(6),
    drill: () => home().then(drill), intro2: () => level2Intro(0), intro3: () => level3Intro(0), intro4: () => level4Intro(0), intro5: () => level5Intro(0), intro6: () => level6Intro(0),
    step: () => { if (EMBED) toOffice({type: 'ready', step: QS.get('step')}); return playStep(QS.get('step') || PATH.next, QS.get('level') || undefined); }, rounds: playRounds, casebook,
    mode: () => playMode(QS.get('mode') || 'wait', QS.get('level') || undefined), sampler: () => samplerHome()}[START] || home)();
})();
