// The prompt request template, shared by the contribute page (/contribute/) and the game's suggestion box (site.mjs).
// The player answers a few questions; only "What should change?" is needed. It builds a prompt for an AI coding agent
// and the "Prompt request" issue that carries it (api/feedback.js files it with the `prompt` label), or a link to
// GitHub's own prompt form (.github/ISSUE_TEMPLATE/4-prompt.yml) with the answers filled in.
export const REPO = "BrentBarnes/learn-lifecycle";
export const CHANGES = [
  ["a new level or step", "A new level or step"], ["a fix for something broken", "A bug fix"], ["a change to an existing step", "A change to a step"],
  ["a skill the game doesn't teach yet", "A missing skill"], ["a new game mode", "A new game mode"],
];
// [key, the words the prompt uses, chip label, chip note]; the key lets the suggestion box pick where the player is
export const PLACES = [
  ["analytics", "Analytics: Lifecycle Files, the dashboard wall", "Analytics", "Lifecycle Files"], ["data", "Data: SQL at Frank's desk", "Data", "SQL"],
  ["testing", "Testing: the Test Board", "Testing", "Test Board"], ["office", "the office itself (the room, days, roles)", "The office", "the room, days, roles"],
];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const chips = (name, opts) => `<div class="chips">${opts.map(([v, label, note, key]) => `<label><input type="radio" name="${name}" value="${esc(v)}"${key ? ` data-key="${key}"` : ""}>${label}${note ? ` <small>${note}</small>` : ""}</label>`).join("")}<label><input type="radio" name="${name}" value="other">Other</label></div>`;

// the questions, the same everywhere; the page around them adds the name box, the preview and the buttons
export function fieldsHTML() {
  return `<p class="hint">Only "What should change?" is needed. Everything else is a suggestion: each detail you add makes the prompt more specific, so it can be built right away with fewer questions back to you.</p>
    <fieldset><legend>What kind of change is it?</legend>${chips("kind", CHANGES)}
      <input type="text" name="kind_other" class="other" placeholder="What kind of change?" maxlength="120" hidden></fieldset>
    <fieldset><legend>Where does it live?</legend>${chips("where", PLACES.map(([key, v, label, note]) => [v, label, note, key]))}
      <input type="text" name="where_other" class="other" placeholder="Where should it live?" maxlength="120" hidden></fieldset>
    <label class="fld"><span>Which level, step or skill?</span><input type="text" name="spot" maxlength="160" placeholder="Level 2, step 3 · the GROUP BY lesson · reading a holdout"></label>
    <label class="fld"><span>What should change?</span><textarea name="what" rows="4" maxlength="3000" placeholder="Add a step after 2s3 where the change log has two changes on the same day, and the player picks the one that touched the email that dropped."></textarea></label>
    <label class="fld"><span>Why? What would a player learn, or stop getting stuck on?</span><textarea name="why" rows="2" maxlength="1500" placeholder="At work, two changes often ship the same day. Players never practise telling them apart."></textarea></label>
    <label class="fld"><span>How will we know it worked?</span><textarea name="check" rows="2" maxlength="1500" placeholder="The new step shows after 2s3. Its reps pass after 4 of the last 5 right."></textarea></label>`;
}

const v = (root, n) => { const el = root.querySelector(`[name="${n}"]:checked`) || root.querySelector(`[name="${n}"]:not([type=radio])`); return (el && el.value || "").trim(); };
const pick = (root, n) => { const x = v(root, n); return x === "other" ? v(root, n + "_other") : x; };
// the answers as plain text; `link` is a review link to the spot the player was on, when the suggestion box knows it
export function read(root, link = "") {
  return { kind: pick(root, "kind"), where: pick(root, "where"), spot: v(root, "spot"), what: v(root, "what"), why: v(root, "why"), check: v(root, "check"), who: v(root, "who"), link };
}
export const ready = (a) => a.what.length >= 10;
export function syncOthers(root) { root.querySelectorAll(".other").forEach((o) => { o.hidden = v(root, o.name.replace("_other", "")) !== "other"; }); }
export function choose(root, name, key) { const el = root.querySelector(`[name="${name}"][data-key="${key}"]`); if (el) el.checked = true; }

export function promptText(a) {
  return [
    `You're working on Learn Lifecycle (https://github.com/${REPO}). Read AGENTS.md first and follow its rules.`,
    "",
    (a.kind || a.where || a.spot) ? "The change: " + [a.kind, a.where && "in " + a.where, a.spot && "at " + a.spot].filter(Boolean).join(", ") + "." : null,
    a.link ? `The spot in the game it's about: ${a.link}` : null,
    "What to do: " + (a.what || "[what should change]"),
    a.why ? "Why it matters: " + a.why : null,
    a.check ? "Done when: " + a.check : null,
    "",
    "Hand back what you built, a full review link that opens the game right at the change, and how to check it.",
  ].filter((l) => l !== null).join("\n");
}
export const title = (a) => `Prompt request · ${a.where.split(":")[0] || "Learn Lifecycle"}: ${a.what.replace(/\s+/g, " ").slice(0, 70)}`;
export function body(a) {
  return [a.kind && "**Kind:** " + a.kind, a.where && "**Where:** " + a.where, a.spot && "**Which level, step or skill:** " + a.spot,
    "**What should change**\n\n" + a.what, a.why && "**Why**\n\n" + a.why, a.check && "**How to check it worked**\n\n" + a.check,
    a.who && "From: " + a.who, "**The prompt**\n\n~~~\n" + promptText(a).replace(/~{3,}/g, "~ ~ ~") + "\n~~~"].filter(Boolean).join("\n\n");
}
export const ghUrl = (a) => `https://github.com/${REPO}/issues/new?` + new URLSearchParams({ template: "4-prompt.yml", title: title(a),
  change: a.what.split("\n")[0].slice(0, 200), prompt: promptText(a), check: a.check });
