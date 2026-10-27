// The game's "Make a suggestion" box posts here (shared/site.mjs). This turns it into a GitHub issue on the repo, so a
// player doesn't need a GitHub account. It runs as a Vercel function; on any other host the box falls back to a
// prefilled GitHub issue link.
//
// Setup (once, in the Vercel project's Environment Variables):
//   GITHUB_TOKEN  a fine-grained token with "Issues: Read and write" on this one repo, nothing else
//   GITHUB_REPO   owner/name, e.g. BrentBarnes/lifecycle-practice
// Without GITHUB_TOKEN it answers 503 and the box shows the GitHub link instead.
const KINDS = { bug: "Bug", idea: "Feature idea", feedback: "Feedback", other: "Something else", prompt: "Prompt request" };   // prompt: the contribute page's template
const SEEN = new Map();   // ip -> recent send times: a light brake on floods (per warm instance only)
const LIMIT = 5, WINDOW_MS = 10 * 60 * 1000;

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const token = String(process.env.GITHUB_TOKEN || "").trim(), repo = String(process.env.GITHUB_REPO || "").trim() || "BrentBarnes/lifecycle-practice";
  if (!token) return res.status(503).json({ error: "not set up on this host" });
  if (!/^[\x21-\x7e]+$/.test(token)) {   // a token is plain ASCII; anything else was pasted by mistake and would crash fetch
    console.error("GITHUB_TOKEN holds characters a GitHub token can't have. Paste the token again in Vercel, then redeploy.");
    return res.status(503).json({ error: "not set up on this host" });
  }

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown", now = Date.now();
  const recent = (SEEN.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) return res.status(429).json({ error: "Too many in a short time. Try again in a few minutes." });
  SEEN.set(ip, [...recent, now]);

  const b = typeof req.body === "string" ? safeJson(req.body) : req.body || {};
  const kind = KINDS[b.kind] ? b.kind : "other";
  // no pinging people from an anonymous box, and no email addresses in a public issue (the box removes them too)
  const quiet = (s) => String(s || "").replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "[email removed]").replace(/@(?=[A-Za-z0-9-])/g, "@​");
  const title = quiet(b.title).replace(/\s+/g, " ").trim().slice(0, 120);
  const text = quiet(b.body).trim().slice(0, 12000);   // the box attaches where the player was: a table and the screen's text
  if (title.length < 3 || text.length < 3) return res.status(400).json({ error: "Write a little more first." });

  let r;
  try {
    r = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "lifecycle-practice-feedback", "X-GitHub-Api-Version": "2022-11-28" },
      body: JSON.stringify({ title, body: `${text}\n\n_Sent from ${kind === "prompt" ? "a prompt request form" : "the game's suggestion box"} (${KINDS[kind]})._`, labels: kind === "prompt" ? ["prompt"] : ["from-game", kind] }),
    });
  } catch (e) { return res.status(502).json({ error: "GitHub didn't answer" }); }
  if (!r.ok) { console.error(`GitHub said ${r.status}`); return res.status(502).json({ error: `GitHub said ${r.status}` }); }
  const issue = await r.json();
  return res.status(201).json({ url: issue.html_url, number: issue.number });
};

function safeJson(s) { try { return JSON.parse(s); } catch (e) { return {}; } }
