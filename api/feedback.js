// The game's "Make a suggestion" box posts here (shared/site.mjs). This turns it into a GitHub issue on the repo, so a
// player doesn't need a GitHub account. It runs as a Vercel function; on any other host the box falls back to a
// prefilled GitHub issue link.
//
// Setup (once, in the Vercel project's Environment Variables):
//   GITHUB_TOKEN  a fine-grained token with "Issues: Read and write" on this one repo, nothing else
//   GITHUB_REPO   owner/name, e.g. BrentBarnes/lifecycle-practice
// Without GITHUB_TOKEN it answers 503 and the box shows the GitHub link instead.
const KINDS = { bug: "Bug", idea: "Feature idea", feedback: "Feedback", other: "Something else" };
const SEEN = new Map();   // ip -> recent send times: a light brake on floods (per warm instance only)
const LIMIT = 5, WINDOW_MS = 10 * 60 * 1000;

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const token = process.env.GITHUB_TOKEN, repo = process.env.GITHUB_REPO || "BrentBarnes/lifecycle-practice";
  if (!token) return res.status(503).json({ error: "not set up on this host" });

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown", now = Date.now();
  const recent = (SEEN.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) return res.status(429).json({ error: "Too many in a short time. Try again in a few minutes." });
  SEEN.set(ip, [...recent, now]);

  const b = typeof req.body === "string" ? safeJson(req.body) : req.body || {};
  const kind = KINDS[b.kind] ? b.kind : "other";
  const quiet = (s) => String(s || "").replace(/@(?=[A-Za-z0-9-])/g, "@​");   // no pinging people from an anonymous box
  const title = quiet(b.title).replace(/\s+/g, " ").trim().slice(0, 120);
  const text = quiet(b.body).trim().slice(0, 6000);
  if (title.length < 3 || text.length < 3) return res.status(400).json({ error: "Write a little more first." });

  const r = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "lifecycle-practice-feedback", "X-GitHub-Api-Version": "2022-11-28" },
    body: JSON.stringify({ title, body: `${text}\n\n_Sent from the game's suggestion box (${KINDS[kind]})._`, labels: ["from-game", kind] }),
  });
  if (!r.ok) return res.status(502).json({ error: `GitHub said ${r.status}` });
  const issue = await r.json();
  return res.status(201).json({ url: issue.html_url, number: issue.number });
};

function safeJson(s) { try { return JSON.parse(s); } catch (e) { return {}; } }
