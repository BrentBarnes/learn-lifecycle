// "Copy as a question": the public games' stand-in for the coach (games/shared/PUBLIC-RELEASE.md).
// It puts the step, what's on screen and the player's question on the clipboard as plain text, ready to paste into
// any AI chat. Nothing is sent anywhere.
//
//   copyQuestion({game, step, screen, question}) -> Promise<string>   the text, already copied (or the text if the
//                                                                      clipboard was refused, so the page can show it)

export function questionText({game, step, screen, question}) {
  const ask = (question || '').trim() || "Help me think through what I'm looking at. What should I check next?";
  return [
    `I'm practicing with ${game}, a free training game about lifecycle marketing. The numbers are made up.`,
    'Coach me like a colleague would: answer my question first, and if I am in the middle of a question, give me a pointer before you give the answer.',
    '',
    step ? `Where I am: ${step}` : '',
    '',
    'What my screen shows:',
    String(screen || '').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim().slice(0, 4000),
    '',
    `My question: ${ask}`,
  ].filter((l, i, a) => l || a[i - 1]).join('\n');
}

export async function copyQuestion(o) {
  const text = questionText(o);
  try { await navigator.clipboard.writeText(text); }
  catch (e) {
    const t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select();
    try { document.execCommand('copy'); } catch (e2) { /* the page shows the text instead */ }
    t.remove();
  }
  return text;
}
