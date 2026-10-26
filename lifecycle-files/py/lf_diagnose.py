"""The case file's last question, in his own words (Brent, 2026-10-15): "What's going on behind the scenes, and what would
you do about it?" It replaced the fixed "What do we do?" options and the optional "Why, in one line" at Level 1.

The first five questions find the signs (is something wrong, how big, where, since when, which chart). This one is the
diagnosis: what broke (or why nothing did) and the next step. Claude Opus reads his line against the case's answer key,
through the local claude CLI on his Max plan (the coach's flags: no tools, no settings, no API key), and returns:

    cause_ok   he named a cause behind the scenes that fits the case (any one of BEHIND's fits, in his words)
    fix_ok     what he'd do fits (one of the case's accepted actions, or a concrete step that amounts to one)
    action     the fixed action his fix is closest to, so the skill tracker (lf_tutor, "action") keeps working
    feedback   one or two sentences for the report card that don't give the answer away
    explain    the full answer, shown only when he asks for it

    grade(case, text) -> dict       {"error": ...} when the CLI fails: the step then doesn't count either way.
                                    {"self": True, ...} in the public build (LF_PUBLIC): no grader, he checks it himself
"""
from __future__ import annotations

import json
import os
import re
import subprocess
from pathlib import Path

import lifecycle_files as LF

MODEL = os.environ.get("LF_DIAG_MODEL", "opus")
EFFORT = os.environ.get("LF_DIAG_EFFORT", "low")
MIN_WORDS = 4

BEHIND = {   # kind: (causes that fit, causes the charts rule out). Level 1's fifteen.
    "entries_drop": ("Something upstream stopped adding people: the trigger (metric, list or segment) broke or changed, a trigger or flow filter now "
                     "excludes people, the Shopify or other integration stopped sending the trigger event, or the signup form or pop-up broke.",
                     "The emails themselves breaking (every email's rates held), deliverability or suppression (that cuts Got the email while Entered holds), checkout."),
    "delivery_drop": ("People still enter but fewer get the emails: suppression (a list import or exclusion marking people suppressed), Smart Sending "
                      "skipping more people, a new filter checked at send time, or deliverability (bounces or blocks, a DNS or authentication change).",
                      "The trigger (entries held), the content of the emails, checkout."),
    "click_drop_one": ("Something broke inside that one email: a dead or wrong link, a missing image or button, a rendering problem.",
                       "Anything flow-wide (the other emails are fine), checkout (clicks fell first), the trigger."),
    "conv_drop_all": ("Something after the click broke for every email: checkout or site errors, a shipping cost or pricing change, an offer or landing page problem.",
                      "The emails themselves (clicks held), the trigger, one email only."),
    "conv_drop_one": ("Something after the click in that one email: an expired or broken discount code, a sold-out product it features, a wrong landing page.",
                      "A broken link (clicks held), anything flow-wide, the trigger."),
    "aov_drop": ("People buy smaller orders: a cheaper featured product, a deeper discount, a lower free-shipping threshold, a product mix change.",
                 "Fewer orders, broken emails, the trigger."),
    "tracking_break": ("The counting broke, not the sales: the Placed Order event or the Shopify integration stopped reporting orders, or a tracking script was removed.",
                       "People actually stopped buying overnight while still clicking, broken emails."),
    "slow_slide": ("Slow wear: fatigue with the same emails, stale creative or subject lines, or inbox placement slowly eroding. No single break.",
                   "A one-day break (it's a slope, not a step), the trigger."),
    "volume_mix": ("Nothing broke: a promotion, giveaway or new signup source brought in many more people who buy less, so the rate fell while revenue held.",
                   "A broken email, checkout or tracking."),
    "unsub_spike": ("Something in that one email drives people off: a pushy subject or content change, a frequency or timing change, a new audience.",
                    "Anything flow-wide, revenue problems."),
    "mpp_opens": ("Nothing changed for the business: Apple Mail Privacy Protection (or bot opens) inflates opens.",
                  "A real improvement (clicks and orders didn't move)."),
    "good_news": ("Something got better in that one email: a better offer, a popular product, a better subject line or content.",
                  "Anything broken, anything flow-wide."),
    "big_order": ("Nothing broke: one unusually large order (a trade or bulk buyer) spiked one day.",
                  "A trend or a real change."),
    "black_friday": ("Nothing broke: the week it's compared with was Black Friday.",
                     "A real drop."),
    "noise": ("Nothing broke: normal wobble on a small flow, inside its normal range.",
              "A real change."),
}

GRADER = ("You grade one line a learner wrote in a practice game about diagnosing email-flow dashboards (Klaviyo style). "
          "Be fair: plain or informal wording counts, and any cause that fits the case counts, even if it isn't the one planted. "
          "Reply with JSON only, no other text.")


def claude_bin() -> str:
    import lf_coach as C
    return C.claude_bin()


def screen_facts(case: dict) -> str:
    """What his screen showed, roughly, so the grader's comments match it (it once told him entries "fell rather than stopped"
    on a case where they hit zero)."""
    def wk(a):
        return sum(a[:28]) / 4, sum(a[-7:])
    def ch(b, l):
        return f"{l:,.0f} in the last 7 days against {b:,.0f} a normal week ({(l / b - 1) * 100:+.0f}%)" if b else f"{l:,.0f} in the last 7 days"
    t = LF.totals(case)
    out = [f"Entered the flow: {ch(*wk(case['entered']))}.", f"Got the email: {ch(*wk(t['delivered']))}.", f"Revenue: {ch(*wk(t['revenue']))}."]
    for m in case["flow"]["messages"]:
        d = case["by_message"][m["id"]]
        out.append(f"{m['name']} (sent day {m['day']} after entry), got it: {ch(*wk(d['delivered']))}.")
    return " ".join(out)


def prompt(case: dict, text: str) -> str:
    t, kind = case["truth"], case["truth"]["kind"]
    fits, ruled = BEHIND.get(kind, (t.get("story", ""), ""))
    acts = " or ".join(LF.ACTIONS[a] for a in t["actions"])
    return f"""The case: {case['flow']['name']}, {len(case['flow']['messages'])} emails. The message he got: {case['symptom']}
What really happened: {t['story']}
His screen, roughly: {screen_facts(case)}
Causes that fit this case: {fits}
Causes the charts rule out: {ruled}
What to do that counts: {acts}. The expert's version: {t['expert'][5]}

He was asked: "What's going on behind the scenes, and what would you do about it?" His line:
<line>
{text.strip()[:600]}
</line>

Grade it.
- cause_ok: true if he names what's going on behind the scenes and it fits: one of the fitting causes in his own words, or another that fits the case as well. Only naming which chart moved ("entries dropped") with no cause behind it is false. Naming a cause the charts rule out is false. If nothing is broken in this case, saying nothing is broken and why is true.
- fix_ok: true if he says what he'd do and it fits what counts, or is a concrete step that amounts to it ("check the trigger today" is fixing it today). No next step at all is false.
- action: the one of fix_today, escalate, test, watch, leave his next step is closest to, or none.
- feedback: one or two plain sentences to him about his line that DON'T give away the answer: say what's right and what's missing or doesn't fit. Only judge the cause and the next step. Don't correct numbers, dates or other details unless they change the diagnosis, and never contradict his screen. No praise words ("good call", "solid", "great"). No em dashes, no semicolons.
- explain: two or three plain sentences with the full answer: what's going on behind the scenes, how the charts show it, and the next step. No em dashes, no semicolons.

JSON: {{"cause_ok": true, "fix_ok": true, "action": "fix_today", "feedback": "...", "explain": "..."}}"""


def ask(text: str) -> dict:
    """One claude -p call, Max plan only. Returns the parsed JSON, or {"error": ...}."""
    cmd = [claude_bin(), "-p", "--model", MODEL, "--effort", EFFORT, "--system-prompt", GRADER, "--tools", "", "--setting-sources", "",
           "--strict-mcp-config", "--no-session-persistence", "--disable-slash-commands", "--output-format", "json"]
    env = {k: v for k, v in os.environ.items() if k not in ("ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_BASE_URL")}
    env["PATH"] = f"{Path(claude_bin()).parent}:{Path.home()}/.local/bin:{env.get('PATH', '/usr/bin:/bin')}"
    try:
        r = subprocess.run(cmd, input=text, capture_output=True, text=True, timeout=90, env=env, cwd=str(LF.ROOT))
        out = json.loads(r.stdout or "{}")
        if out.get("is_error"):
            return {"error": str(out.get("result") or "the grader hit an error")[:200]}
        m = re.search(r"\{.*\}", str(out.get("result") or ""), re.S)
        return json.loads(m.group(0)) if m else {"error": "the grader's reply had no JSON"}
    except (subprocess.SubprocessError, OSError, ValueError) as e:
        return {"error": f"couldn't run the grader: {e!s:.160}"}


def grade(case: dict, text: str) -> dict:
    text = (text or "").strip()
    if len(text.split()) < MIN_WORDS:
        return {"cause_ok": False, "fix_ok": False, "action": "none", "feedback": "Write what you think is going on behind the scenes and what you'd do.",
                "explain": case["truth"]["story"], "empty": True}
    if os.environ.get("LF_PUBLIC"):          # the public build has no Claude: he checks his own line (games/shared/PUBLIC-RELEASE.md)
        fits, ruled = BEHIND.get(case["truth"]["kind"], (case["truth"].get("story", ""), ""))
        return {"self": True, "explain": case["truth"]["story"],
                "feedback": f"Check your line yourself. Causes that fit: {fits}" + (f" The charts rule out: {ruled}" if ruled else "")}
    g = ask(prompt(case, text))
    if g.get("error"):
        return {"error": g["error"], "explain": case["truth"]["story"]}
    clean = lambda s: re.sub(r"\s*[—–]\s*", ", ", str(s or "")).replace(";", ".").strip()
    act = g.get("action") if g.get("action") in LF.ACTIONS else "none"
    return {"cause_ok": bool(g.get("cause_ok")), "fix_ok": bool(g.get("fix_ok")), "action": act,
            "feedback": clean(g.get("feedback")), "explain": clean(g.get("explain")) or case["truth"]["story"]}
