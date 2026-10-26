// The public build's top-bar button: "Copy as a question" in place of Talk it through (games/shared/PUBLIC-RELEASE.md).
// It copies the step, the screen and his question as plain text for any AI chat (../shared/copy-question.mjs).
import {copyQuestion} from '../shared/copy-question.mjs';

const btn = document.getElementById('voice');
document.getElementById('vtxt').textContent = '📋 Copy as a question';
btn.title = 'Copy this screen and your question, to paste into the AI chat you use';

function where() {
  const r = typeof R !== 'undefined' ? R : null, t = document.getElementById('title').textContent;
  return r && r.rep ? `${t} (step ${r.sid})` : t;
}
function screenText() {
  const v = document.querySelector('.veil'), app = document.getElementById('app');
  return (v ? v.innerText + '\n' : '') + (app ? app.innerText : '');
}

btn.onclick = () => {
  const box = document.createElement('div');
  box.className = 'veil';
  box.innerHTML = `<div class="card" style="max-width:520px;margin:12vh auto;padding:18px 20px">
    <h3 style="margin:0 0 6px">Ask an AI about this screen</h3>
    <p class="meta" style="margin:0 0 10px">Type your question. The game copies it with what's on screen, and you paste it into ChatGPT, Claude or any chat you use. Nothing is sent from here.</p>
    <textarea id="cqq" rows="3" style="width:100%;box-sizing:border-box" placeholder="What should I look at next?"></textarea>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px"><button class="btn2" id="cqx">Cancel</button><button class="btn" id="cqgo">Copy</button></div>
    <pre id="cqout" hidden style="white-space:pre-wrap;max-height:30vh;overflow:auto;font-size:12px;margin-top:10px"></pre></div>`;
  const screen = screenText(), step = where();
  document.body.appendChild(box);
  const q = box.querySelector('#cqq'); q.focus();
  box.querySelector('#cqx').onclick = () => box.remove();
  box.querySelector('#cqgo').onclick = async () => {
    const text = await copyQuestion({game: 'Lifecycle Files', step, screen, question: q.value});
    const out = box.querySelector('#cqout'); out.textContent = text; out.hidden = false;
    box.querySelector('#cqgo').textContent = 'Copied ✓';
  };
};
