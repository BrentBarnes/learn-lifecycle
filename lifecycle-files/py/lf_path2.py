"""Level 2 as a path (docs/CURRICULUM-L2.md): the Changes screen, one idea at a time, built the way Level 1 was.

Every rep is a real Level 2 case (lifecycle_files.make_case on an lf_level2 type), read the way the screen shows it
(lf_path.observe, with every Level 1 chart on), plus a change log built for that rep: the cause when there is one,
red herrings that fit the date and fail on the email or on what they can touch, and decoys far from the start.
could_explain() is the one judge. The answer key, the feedback and the tests all use it, so a row is never marked
wrong for a reason the screen doesn't show. The logs are made up to make a point. They aren't copies of the real
Marketing QA Changes page (Brent, 2026-10-13: "it's just illustrative").

    STEPS2          the path: 7 steps and 6 joins, then the Level 2 case files (step ids "2s1", "2j1-2"...)
    could_explain   why a change can't explain what's on screen (the date, the email, what it can reach), or nothing
    the ways        logrow, touch, when, which (new: Which change?), ruleout2, lookalike2, suspects2, action2
"""
from __future__ import annotations
import random
from datetime import date
from itertools import combinations

import lifecycle_files as LF
import lf_level2 as LV2
import lf_path as P

U, D, F, Z, IN, NONE = P.U, P.D, P.F, P.Z, P.IN, P.NONE
_ = None

# ---------------------------------------------------------------- the Level 1 patterns under Level 2's new types
for _k, _v in {   # one email stops (Manual, or a wait made far too long): fewer emails, each person the same. One email's opens jump.
    "email_stopped": {"main": _, "shape": _, "revenue": D, "lastweek": _, "entered": F, "delivered": D, "opens": F, "clicks": F, "orders": F, "order_size": F, "unsubs": _, "emails": _},
    "email_late": {"main": _, "shape": _, "revenue": D, "lastweek": _, "entered": F, "delivered": D, "opens": F, "clicks": F, "orders": F, "order_size": F, "unsubs": _, "emails": _},
    "opens_one": {"main": IN, "shape": NONE, "revenue": _, "lastweek": _, "entered": F, "delivered": F, "opens": _, "clicks": F, "orders": F, "order_size": F, "unsubs": _, "emails": _},
}.items():
    P.SCRIPT[_k] = _v
    P.SHAPE[_k] = _v["shape"]

KINDS = LV2.TYPES + ["unlogged"]                 # "unlogged": a checkout break nobody wrote down (step 5)
BASE = {**LV2.BASE, "unlogged": "conv_drop_all"}
NAMES = {**LV2.FILE_NAMES, "unlogged": "Not in the Log"}
LESSONS = {**LV2.LESSONS, "unlogged": ("Orders fell on every email, clicks held, and nothing logged can reach that: the cause is outside the flow even "
                                       "when nobody wrote it down. Tell the owner today.", "external causes")}
ACTIONS = {**LV2.ACTIONS, "unlogged": ["escalate"]}
ACTION_WHY = {**LV2.ACTION_WHY, "unlogged": "Escalate: tell the web team today. Orders fell after the click on every email, and nothing in the flow changed.",
              "code_edit": LV2.ACTION_WHY["code_edit"]}
NO_START = ("noise_with_edit", "coincidence_bf", "slide_no_change")      # nothing (or no one day) to date
NO_CAUSE = NO_START + ("unlogged",)

# ---------------------------------------------------------------- the path
STEPS2 = [
    {"id": "2s1", "part": 1, "n": 1, "title": "The change log", "adds": ["log"], "causes": ["code_edit", "link_edit", "filter_edit", "email_off"], "ways": {"logrow": 1}},
    {"id": "2s2", "part": 1, "n": 2, "title": "What a change can touch", "ways": {"touch": 1}},
    {"id": "2j1-2", "part": 1, "title": "Read the log", "ways": {"logrow": 1, "touch": 1}},
    {"id": "2s3", "part": 1, "n": 3, "title": "On or just before the start", "causes": ["smart_sending", "delay_typo", "feature_swap"], "ways": {"when": 1}},
    {"id": "2j1-3", "part": 1, "title": "When, and what it can touch", "ways": {"when": 2, "touch": 1, "logrow": 1}},
    {"id": "2s4", "part": 2, "n": 4, "title": "The right email, not just the right day", "causes": ["sold_out_herring", "two_changes"], "ways": {"which": 1}},
    {"id": "2s5", "part": 2, "n": 5, "title": "The log only sees the flow", "causes": ["external_checkout", "integration_break", "unlogged"], "ways": {"which": 2, "ruleout2": 1}},
    {"id": "2j4-5", "part": 2, "title": "Two that fit the date", "ways": {"lookalike2": 2, "which": 1, "ruleout2": 1}, "way_new": "lookalike2"},
    {"id": "2s6", "part": 3, "n": 6, "title": "Changes that change nothing", "causes": ["noise_with_edit", "coincidence_bf", "slide_no_change"], "ways": {"ruleout2": 2, "which": 1}},
    {"id": "2s7", "part": 3, "n": 7, "title": "Wins have causes", "causes": ["subject_win", "subject_opens_only", "popup_mix"], "ways": {"which": 2, "action2": 1}},
    {"id": "2j6-7", "part": 3, "title": "Which change, in a few looks", "ways": {"suspects2": 2, "which": 1, "ruleout2": 1}, "way_new": "suspects2"},
    {"id": "2j4-7", "part": 3, "title": "Every kind of change", "ways": {"which": 2, "ruleout2": 1, "lookalike2": 1, "suspects2": 1, "action2": 1}},
    {"id": "2j1-7", "part": 3, "title": "Everything so far", "ways": {"which": 2, "when": 1, "touch": 1, "lookalike2": 1, "suspects2": 1, "action2": 1}},
    {"id": "2s8", "part": 3, "n": 8, "title": "The Level 2 case files", "case": True, "ways": {}},
]
PARTS2 = {1: "Read the log", 2: "Which change?", 3: "Not every change matters"}
WAY_NAME2 = {"logrow": "Read it", "touch": "Read it", "when": "Read it", "which": "Which change?", "ruleout2": "Rule it out",
             "lookalike2": "Look-alikes", "suspects2": "Suspects", "action2": "What to do"}
MEET2 = {
    "2s1": {"kinds": ["code_edit"], "dana": "Ruth: did anyone touch {flow} this month?", "watch": "logrow",
            "intro": "Changes is a log: one row for every edit to the flow, plus what someone wrote down about the store and Klaviyo. Each row says the day, "
                     "where (one email, the whole flow, the store), what changed and who did it. Each row has a number, and the same number marks its day on every chart.",
            "term": ["Change log (audit trail)", "A dated record of who changed what. The first place to look once you know when something started."]},
    "2s2": {"dana": "Dana: someone changed Email 2's subject line. Could that be why orders fell?", "watch": "touch",
            "intro": "Every kind of change reaches one number first. A subject line reaches opens. Content and links reach clicks. A code, an offer, a product or "
                     "checkout reaches orders. A filter, a trigger or a signup source changes who enters. Smart Sending, an email set to Manual or a longer "
                     "wait changes who gets the email. A rename or a note reaches nothing.",
            "term": ["Mechanism", "How a cause makes its effect. A change with no way to reach the number that moved can't be the cause."]},
    "2s3": {"kinds": ["code_edit", "link_edit"], "dana": "Dana: it started around the 14th, right? What changed then?", "watch": "when",
            "intro": "A change shows on the day it lands, or the next day if it was made late. So find the start first, on whichever chart moved, then look "
                     "for the number marked there. A change made after the line started moving can't have started it.",
            "term": ["Temporal precedence", "A cause comes before its effect. The first test every suspect has to pass."]},
    "2s4": {"kinds": ["two_changes", "code_edit"], "herring": "subject", "dana": "Dana: Email 3's subject line changed the same day orders fell. That's it, right?", "watch": "which",
            "intro": "A new way to play: Which change? Two changes can land on the same day. Only one sits where the move is. The Each email table shows which "
                     "email moved, and on which number. A change on another email, or one that can't reach that number, is a red herring.",
            "term": ["Red herring", "A clue that fits the date and nothing else."]},
    "2s5": {"kinds": ["external_checkout"], "dana": "Dana: orders fell on every email and nobody touched the flow.", "watch": "which",
            "intro": "Changes records every edit to the flow by itself. The store and the integration only show up when someone writes them down. When orders "
                     "fall on every email, clicks hold and no flow edit can reach orders, the cause is outside: checkout, stock, the integration. If nothing "
                     "was written down, it's still outside. Pick None of these and tell the owner.",
            "term": ["External cause", "A cause outside your system. The fix is telling whoever owns it, today, with what it costs."]},
    "2j4-5": {"kinds": ["code_edit", "link_edit"], "dana": "Dana: two changes landed that day. Which one?", "watch": "lookalike2",
              "intro": "A new way to play: Look-alikes, with changes. Both fit the date. Pick the one that explains it, then click the chart that rules out the other one.",
              "term": ["The discriminating feature", "The one finding that tells two suspects apart."]},
    "2s6": {"kinds": ["noise_with_edit"], "dana": "Dana: it's the preview text edit, isn't it?", "watch": "ruleout2",
            "intro": "An edit near a dip isn't proof. If the line never left its normal range, nothing needs explaining. If the comparison week was Black Friday, "
                     "the calendar did it. If the line slid a little every week, small edits along the way didn't. None of these is an answer.",
            "term": ["Post hoc fallacy", "After it, so because of it. The most common mistake with a change log."]},
    "2s7": {"kinds": ["subject_win"], "dana": "Dana: {flow} is up! What did we do right?", "watch": "which",
            "intro": "A win has a cause too, and finding it is how you keep it and copy it. Same tests: on the day, on the email that moved, able to reach the "
                     "number that moved. A subject line that lifts opens and nothing else isn't a win yet.",
            "term": ["Attribution", "Crediting a result to what caused it. Opens alone are a vanity metric."]},
    "2j6-7": {"kinds": ["code_edit", "link_edit"], "dana": "Dana: there's a lot in the log this month. Where do we look first?", "watch": "suspects2",
              "intro": "A new way to play with the log: Suspects. The main chart, the revenue rows and the log are free. The tiles and the email table are face "
                       "down, and each flip costs a look. Cross out the changes a chart rules out, then accuse one.",
              "term": ["Par", "The fewest looks that settle it. Check first whatever rules out the most suspects."]},
}

# ---------------------------------------------------------------- what a change can reach, in the player's words
TOUCH = {"subject": "opens", "content": "clicks", "offer": "orders", "product": "orders", "stock": "orders", "checkout": "orders", "integration": "orders",
         "filter": "entered", "signup": "entered", "sending": "delivered", "onoff": "delivered", "timing": "delivered",
         "copy": "nothing", "admin": "nothing", "collection": "nothing"}
TOUCH_OPTS = [["opens", "Opens"], ["clicks", "Clicks"], ["orders", "Orders or order size"], ["entered", "Who enters the flow"],
              ["delivered", "Who gets the email"], ["nothing", "Nothing you can measure"]]
TOUCH_WHY = {
    "subject": "A subject line (or preview text) decides who opens. Clicks and orders can follow, but opens move first.",
    "content": "Content, images and links are what people click. Clicks move first.",
    "offer": "A code or an offer works after the click: on orders, or on how big each order is.",
    "product": "What the email puts first sets what people buy: orders and order size.",
    "stock": "A sold-out product stops orders from the email that features it, after the click.",
    "checkout": "Checkout comes after the click, on every email: orders.",
    "integration": "The integration is how orders get counted. Break it and orders vanish from the numbers.",
    "filter": "A filter or a trigger decides who enters the flow.",
    "signup": "A new signup source changes who enters, and what they're like.",
    "sending": "Smart Sending skips people emailed recently: fewer get the email.",
    "onoff": "An email on Manual sends nothing: nobody gets it.",
    "timing": "A longer wait moves the email later. For now, fewer get it.",
    "copy": "A footer, alt text, tracking tags, icons, a reply-to address or an internal name doesn't change what anyone does.",
    "admin": "A note or a renamed segment changes nothing a customer sees.",
    "collection": "A blog post or a policy page isn't in the flow.",
}
TOUCH_RULE = ("Ask what a change can reach before asking whether it did. Subject line: opens. Content and links: clicks. "
              "Code, offer, product, stock, checkout: orders. Filter or signup source: who enters. Sending settings, on or off, a wait: "
              "who gets the email. A rename or a note: nothing.")
INERT = ("copy", "admin", "collection")
ON_EMAIL = ("subject", "content", "offer", "product", "onoff", "timing", "copy")
WHO = ["Priya", "Ruth", "Theo", "Dana"]
TEXT = {   # made-up rows for herrings and decoys, about as long and as specific as a real cause, so length gives nothing away
    "subject": ['{E}: subject line changed from "{old}" to "{s}"', '{E}: preview text rewritten to "Free returns on every pair"',
                "{E}: emoji added to the start of the subject line", '{E}: subject line shortened to "{s}"'],
    "content": ["{E}: hero image swapped for a photo of a café counter", "{E}: body copy rewritten to lead with the 2-year warranty",
                "{E}: new two-column template applied, bigger buy button", '{E}: button text changed from "Shop now" to "Find your pair"'],
    "offer": ["{E}: discount code changed from WELCOME10 to {code}", "{E}: offer changed from 10% off to free shipping over $75"],
    "product": ["{E}: featured product changed from the {feat} to the {p}"],
    "filter": ["Flow filter edited: added 'has not been sent this flow in 30 days'", "Trigger filter edited: now excludes internal test addresses"],
    "sending": ["Smart Sending turned on (skips anyone emailed in the last 16 hours)"],
    "checkout": ["Checkout update deployed (new shipping step)", "Checkout page restyled by the web team: new fonts and colors"],
    "integration": ["Shopify integration reconnected after an app update", "Shopify integration: product catalog sync rerun overnight"],
    "signup": ["New signup pop-up launched: 15% off for new subscribers", "Footer signup form moved to the top of the page on mobile"],
    "copy": ["{E}: footer address updated to the new roastery", "{E}: alt text added to every image for screen readers", "{E}: UTM tags renamed to match the new report",
             "{E}: social icons updated to the new brand style", "{E}: renamed in Klaviyo to '{E} v2' (the internal name)", "{E}: reply-to address changed to the support inbox"],
    "admin": ["Segment renamed for the monthly report: 'VIP' to 'Top buyers'", "New team member added to Klaviyo with editor access", "Internal note added to the flow: 'review in Q1'"],
    "collection": ["Blog post published: how to dial in a burr grinder", "Shipping policy page reworded, same rates and delivery times"],
}
SUBJ = ["Roasted this week, for you", "Your morning, sorted", "The blend regulars swear by", "Still on your list?"]
WHERE_OF = {"filter": "flow", "sending": "flow", "checkout": "store", "integration": "klaviyo", "signup": "klaviyo", "admin": "klaviyo", "collection": "store"}


def where_label(c: dict, w: str) -> str:
    return {"flow": "The whole flow", "store": "Store", "klaviyo": "Klaviyo"}.get(w) or next((m["name"] for m in c["flow"]["messages"] if m["id"] == w), w)


def make_row(c: dict, kind: str, rng: random.Random, email: str | None = None) -> dict:
    msgs = c["flow"]["messages"]
    m = next((x for x in msgs if x["id"] == email), None) or rng.choice(msgs)
    tpl = rng.choice(TEXT[kind])
    what = tpl.format(E=m["name"], s=rng.choice(SUBJ), code=rng.choice(["BREW15", "SPRING25", "BEANS20"]), old=m.get("subject", ""),
                                         feat=m.get("features") or "the grinder", p=rng.choice([x for x in LF.FEATURED if x != m.get("features")]))
    where = m["id"] if kind in ON_EMAIL else WHERE_OF[kind]
    who = {"store": rng.choice(["Web team", "Shopify"]), "klaviyo": rng.choice(["Ruth", "Klaviyo"])}.get(where) or rng.choice(WHO)
    return {"kind": kind, "where": where, "what": what, "who": who}


# ---------------------------------------------------------------- reading a case the way the screen shows it
MIN = {"sent": 30, "opens": 40, "clicks": 40, "orders": 12, "order_size": 12, "unsubs": 8}
EM_COLS = ["sent", "opens", "clicks", "orders", "order_size", "unsubs"]


def per_email(c: dict) -> list[dict]:
    """Each email, last 7 days against a quiet week: sends, and each rate. None where it sent nothing to compare."""
    out = []
    for m in c["flow"]["messages"]:
        d = c["by_message"][m["id"]]
        b = {k: sum(v[:28]) / 4 for k, v in d.items()}; l = {k: sum(v[-7:]) for k, v in d.items()}
        rate = lambda k: (l[k] / l["delivered"]) / (b[k] / b["delivered"]) - 1 if l["delivered"] and b["delivered"] and b[k] else None
        out.append({"id": m["id"], "name": m["name"], "day": m["day"], "features": m.get("features"),
                    "sent": l["delivered"] / b["delivered"] - 1 if b["delivered"] else 0.0,
                    "opens": rate("opens"), "clicks": rate("clicks"), "orders": rate("orders"), "unsubs": rate("unsubs"),
                    "order_size": (l["revenue"] / l["orders"]) / (b["revenue"] / b["orders"]) - 1 if l["orders"] and b["orders"] else None,
                    "enough": {"sent": b["delivered"] >= MIN["sent"], "opens": max(b["opens"], l["opens"]) >= MIN["opens"],
                               "clicks": max(b["clicks"], l["clicks"]) >= MIN["clicks"], "orders": max(b["orders"], l["orders"]) >= MIN["orders"],
                               "order_size": max(b["orders"], l["orders"]) >= MIN["orders"], "unsubs": max(b["unsubs"], l["unsubs"]) >= MIN["unsubs"]}})
    return out


def odd_one(rows: list[dict], k: str) -> str | None:
    """The one email out of line on this number (the Level 1 rule: well apart from the others, which agree)."""
    vals = [(r, r[k]) for r in rows if r[k] is not None]
    if len(vals) < 2:
        return None
    for i, (r, v) in enumerate(vals):
        others = [x for j, (_r, x) in enumerate(vals) if j != i]
        gap, spread = abs(v - sum(others) / len(others)), max(others) - min(others)
        if r["enough"][k] and gap >= 0.35 and spread < 0.3 and gap > 2 * spread:
            return r["id"]
    return None


ONE_METRIC = {"click_drop_one": "clicks", "conv_drop_one": "orders", "good_news": "clicks", "email_stopped": "sent", "email_late": "sent", "opens_one": "opens"}
ALL_SAME = ("conv_drop_all", "aov_drop", "tracking_break", "slow_slide")
PEOPLE = ("entries_drop", "delivery_drop", "volume_mix")
START_KEY = {"email_stopped": "delivered", "email_late": "delivered", "opens_one": "emails", "entries_drop": "entered", "delivery_drop": "delivered",
             "volume_mix": "entered"}     # where the start shows. Everything else: the main line
METRIC_NAME = {"sent": "sends", "opens": "opens", "clicks": "clicks", "orders": "orders", "order_size": "order size", "unsubs": "unsubscribes",
               "entered": "people entering", "delivered": "emails delivered"}


def reading(c: dict, obs: dict, kind: str) -> dict | None:
    """What the screen says, in the terms a change has to fit: when it started, where (one email, every email), what moved."""
    base, t = BASE[kind], c["truth"]
    rows = per_email(c)
    R = {"kind": kind, "base": base, "obs": obs, "rows": {r["id"]: r for r in rows}, "names": {r["id"]: r["name"] for r in rows}, "dates": c["dates"],
         "start": c["dates"].index(t["since"]) if t.get("since") in c["dates"] else None, "slope": base == "slow_slide",
         "nothing": base in ("noise", "black_friday"), "bf": base == "black_friday", "where": None, "metric": None, "start_key": START_KEY.get(base, "main")}
    if base in ONE_METRIC:
        m = t["where"] if t["where"] not in (None, "flow") else t.get("_msg")
        R["metric"] = ONE_METRIC[base]
        if odd_one(rows, R["metric"]) != m:
            return None                                 # the email table has to show it: one email, plainly out of line
        R["where"] = m
        if base == "opens_one":                         # no start in the answer key: read it off that email's daily open rate
            import lf_expert as EX
            R["start"] = EX.change_day(EX.daily(c, "opens", "delivered", m), 21)
    elif base in ALL_SAME:
        if obs.get("emails") != P.SAME:
            return None
        R["where"], R["metric"] = "all", {"aov_drop": "order_size", "slow_slide": "clicks"}.get(base, "orders")
    elif base in PEOPLE:
        R["where"], R["metric"] = "all", {"delivery_drop": "delivered"}.get(base, "entered")
    return R


def _moved(R: dict, mid: str, k: str) -> bool | None:
    r = R["rows"].get(mid)
    if not r or r[k] is None or not r["enough"][k]:
        return None
    return True if abs(r[k]) >= 0.15 else False if abs(r[k]) < 0.10 else None


def could_explain(ch: dict, R: dict) -> tuple[list[dict], bool]:
    """Why this change can't explain what's on screen: [{type, why, proof}], plus whether anything was too close to call.
    An empty list and no doubt: it fits (on the day, on the email that moved, able to reach the number that moved)."""
    out, unclear = [], False
    k = ch["kind"]
    E = ch.get("on") or (ch["where"] if ch["where"].startswith("m") else None)
    nm = R["names"].get(E, "")
    add = lambda t, why, proof: out.append({"type": t, "why": why, "proof": proof})
    if k in INERT:
        add("inert", TOUCH_WHY[k] + " It can't move a number.", "log")
    if R["nothing"]:
        add("nothing", "Against the quiet weeks nothing fell. Only the comparison with Black Friday week did, so there's nothing to explain." if R["bf"]
            else "Nothing on screen left its normal range, so there's nothing for a change to explain.", "main")
        return out, False
    if R["slope"]:
        add("slope", "The line slid a little every week. One edit makes a step on its day, not a slope.", "main")
        return out, False
    ci, s = R["dates"].index(ch["date"]), R["start"]
    if s is not None:
        dd, sd = ci - s, R["dates"][s][5:]
        if dd >= 3:
            add("date", f"{dd} days after the start ({sd}). A cause comes first.", R["start_key"])
        elif dd <= -5:
            add("date", f"{-dd} days before the start ({sd}). Too early: a change shows within a day.", R["start_key"])
        elif dd == 2 or -4 <= dd <= -2:
            unclear = True
    W = R["where"]
    if W and k not in INERT:
        if E and W == "all":
            add("where", f"It's on {nm} only, but every email moved together.", "emails")
        elif E and W != E:
            add("where", f"It's on {nm}, but {R['names'][W]} is the email out of line.", "emails")
        elif not E and W != "all":
            add("where", f"It reaches every email, but only {R['names'][W]} moved.", "emails")
    o = R["obs"]
    if k in INERT:
        pass
    elif k in ("onoff", "timing") and E:
        v = R["rows"][E]["sent"]
        if v > -0.2:
            add("mech", f"{nm} kept sending: its Got it held.", "emails")
        elif v > -0.6:
            unclear = True
    elif E and k in ("subject", "content", "offer", "product", "stock"):
        need = {"subject": ["opens"], "content": ["clicks"], "offer": ["orders", "order_size"], "product": ["orders", "order_size"], "stock": ["orders"]}[k]
        ms = [_moved(R, E, x) for x in need]
        if not any(m is True for m in ms):
            if all(m is False for m in ms):
                add("mech", {"subject": f"A subject line acts on opens first. {nm}'s opens held.",
                             "content": f"Content and links act on clicks first. {nm}'s clicks held.",
                             "offer": f"An offer acts after the click, on orders and order size. {nm}'s held.",
                             "product": f"A product change acts on orders and order size. {nm}'s held.",
                             "stock": f"A sold-out product costs orders on the email that features it. {nm}'s orders held."}[k], "emails")
            else:
                unclear = True
    elif k == "product":                                # the whole flow's featured product
        if o.get("orders") == F and o.get("order_size") == F:
            add("mech", "A product change acts on orders and order size. Both held.", "order_size")
        elif o.get("orders") not in (D, U) and o.get("order_size") not in (D, U):
            unclear = True
    elif k == "checkout":
        if o.get("orders") == F:
            add("mech", "Checkout acts after the click, on orders. Orders held.", "orders")
        elif o.get("orders") == Z:
            add("mech", "Orders fell to almost zero. A broken checkout loses some orders, not all of them: that's the counting.", "orders")
        elif o.get("clicks") == D:
            add("mech", "Clicks fell too, so the email itself changed. Checkout comes after the click.", "clicks")
        elif o.get("orders") != D:
            unclear = True
    elif k == "integration":
        if o.get("orders") in (F, U):
            add("mech", "A broken integration stops orders being counted: they'd fall to almost zero. Orders held.", "orders")
        elif o.get("orders") == D:
            add("mech", "A broken integration takes orders to almost zero, not down a share.", "orders")
        elif o.get("orders") != Z:
            unclear = True
    elif k in ("filter", "signup"):
        if o.get("entered") == F:
            add("mech", "A filter, a trigger or a signup source changes who enters. Entered the flow held.", "entered")
        elif o.get("entered") not in (D, U):
            unclear = True
    elif k == "sending":
        if o.get("delivered") == F:
            add("mech", "Smart Sending changes who gets the email. Got the email held.", "delivered")
        elif o.get("entered") == D:
            add("mech", "Entered fell too: fewer people came in. Smart Sending only skips people already in the flow.", "entered")
        elif o.get("delivered") != D:
            unclear = True
    return out, unclear


def fits(ch, R) -> bool:
    r, u = could_explain(ch, R)
    return not r and not u


# ---------------------------------------------------------------- building a rep's log
def cause_row(c: dict, kind: str) -> dict | None:
    """The cause, the way lf_level2 wrote it, with a sold-out product pointed at the email that features it."""
    t = c["truth"]
    if kind in NO_CAUSE or t.get("cause") in (None, "none"):
        return None
    ch = dict(next(x for x in c["changes"] if x["id"] == t["cause"]))
    if ch["kind"] == "stock":
        m = t["where"] if t["where"] not in (None, "flow") else None
        if m:
            ch["on"] = m
            ch["what"] += f" (featured in {where_label(c, m)})"
    return ch


def _days_ok(R, lo_gap=5, hi_gap=3):
    """Days a decoy can sit on: well before the start or clearly after it, and on the chart (day 7 on)."""
    s, n = R["start"], len(R["dates"])
    if s is None:
        return list(range(7, n))
    return [d for d in range(7, n) if d <= s - lo_gap or d >= s + hi_gap]


def build_log(c: dict, R: dict, rng: random.Random, *, cause: dict | None, herrings: int = 0, far: int = 2, trap: bool = False,
              size: tuple[int, int] = (4, 5), lean: int = 0, hkind: str | None = None) -> list[dict] | None:
    """The rep's log: the cause (lean: how many days before the start it was made, 0 or 1), herrings on the date that
    the screen rules out by the email or by what they can reach, and decoys far from the start. Ids c1.. in date order."""
    rows, used = [], set()
    s = R["start"]
    if cause:
        cd = (s - lean) if s is not None else c["dates"].index(cause["date"])
        if cd < 7:
            return None
        rows.append({**cause, "date": c["dates"][cd], "_cause": True})
        used.update([cause["what"], tpl_of(cause)])
    def pick(day_ok, need_fit_date, tries=60):
        for _ in range(tries):
            kind = rng.choices(["subject", "content", "offer", "product", "filter", "sending", "checkout", "integration", "signup", "copy", "admin", "collection"],
                               weights=[4, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1] if need_fit_date else [3, 3, 2, 1, 1, 1, 1, 1, 1, 3, 2, 2])[0]
            if cause and kind == cause["kind"] and kind in ("filter", "sending", "checkout", "integration", "signup"):
                continue
            stopped = [m for m, r in R["rows"].items() if r["sent"] <= -0.6]
            email = rng.choice([m for m in R["names"] if m not in stopped] or list(R["names"]))
            if need_fit_date and R["where"] not in (None, "all") and rng.random() < 0.5 and not hkind:
                email = R["where"]                         # the same email as the move, the same day: only what it can reach rules it out
            if need_fit_date and hkind:                    # the Meet's own herring: this kind, on another email
                kind = hkind
                email = rng.choice([m for m in R["names"] if m != R["where"] and m not in stopped] or list(R["names"]))
            row = make_row(c, kind, rng, email)
            if row["what"] in used or tpl_of(row) in used:
                continue
            d = rng.choice(day_ok)
            row["date"] = c["dates"][d]
            reasons, unclear = could_explain(row, R)
            if unclear or not reasons:
                continue
            if need_fit_date and (kind in INERT or any(x["type"] == "date" for x in reasons)):
                continue
            used.update([row["what"], tpl_of(row)])
            return row
        return None
    n = len(R["dates"])
    for _ in range(herrings):
        if s is None:
            days_h = list(range(n - 14, n))
        elif cause and rng.random() < 0.5:
            days_h = [cd]                                  # the same day as the cause: the date can't split them
        else:
            days_h = [d for d in (s - 1, s) if d != (cd if cause else None)] or [s]
        h = pick([d for d in days_h if 7 <= d < n], True)
        if not h:
            return None
        rows.append(h)
    if trap and s is not None:
        t_days = [d for d in (s + 3, s + 4) if d < len(R["dates"])]
        if t_days:
            t = pick(t_days, False)
            if t:
                rows.append(t)
    target = max(len(rows) + far, rng.randint(*size))
    days = _days_ok(R)
    k = target - len(rows)
    before = rng.randint(0, k)                            # decoys on both sides in any mix, so the cause's row number gives nothing away
    for side in [0] * before + [1] * (k - before):
        ds = [d for d in days if s is None or (d < s) == (side == 0)] or days
        x = pick(ds, False)
        if x:
            rows.append(x)
    for r_ in rows:
        r_["_r"] = rng.random()
    rows.sort(key=lambda r_: (r_["date"], r_.pop("_r")))
    for i, r_ in enumerate(rows):
        r_["id"] = f"c{i + 1}"
    return rows


def tpl_of(row: dict) -> str:
    """The bank template a row came from (two rows from one template read as a copy, so a log uses each once)."""
    import re
    return re.sub(r"Email \d", "{E}", row["what"])


def answer_of(rows: list[dict], R: dict) -> str:
    ok = [r for r in rows if fits(r, R)]
    return ok[0]["id"] if len(ok) == 1 else "none" if not ok else "?"


def public_rows(c: dict, rows: list[dict]) -> list[dict]:
    return [{"id": r["id"], "n": i + 1, "date": r["date"][5:], "di": c["dates"].index(r["date"]) - 6, "where": where_label(c, r["where"]),
             "what": r["what"], "who": r["who"]} for i, r in enumerate(rows)]


NONE_TEXT = {"noise_with_edit": "None of these: nothing needs explaining", "coincidence_bf": "None of these: the calendar",
             "slide_no_change": "None of these: the emails are wearing out", "unlogged": "None of these: a checkout problem nobody logged"}


def label(rows, cid, c, kind=None) -> str:
    if cid == "none":
        return NONE_TEXT.get(kind, "None of these")
    i, r = next((i, r) for i, r in enumerate(rows) if r["id"] == cid)
    return f"#{i + 1} {r['date'][5:]} · {r['what']}"


def email_rows(R: dict) -> list[dict]:
    """The Each email table at Level 2: sends too, so an email that stopped shows."""
    return [{"name": r["name"], "day": r["day"], "features": r["features"], **{k: (None if r[k] is None else round(r[k], 3)) for k in EM_COLS}} for r in R["rows"].values()]


# ---------------------------------------------------------------- choosing a rep's cause
def pool(sid: str) -> list[str]:
    return P.causes(sid)


def pick_kind(sid: str, rng: random.Random, ok=lambda k: True, level: str | None = None) -> str | None:
    """Mostly the step's own causes. A missed rep's cause comes back. Watch plays the Meet's own case."""
    want = getattr(P.AGAIN, "kind", None)
    if level == "watch" and (mk := [k for k in MEET2.get(sid, {}).get("kinds", []) if ok(k)]):
        return rng.choice(mk)
    ks = [k for k in pool(sid) if ok(k)]
    if want in ks:
        return want
    if not ks:
        return None
    th = set(P.theme(sid))
    return rng.choices(ks, weights=[3 if k in th else 1 for k in ks])[0]


def make2(kind: str, rng: random.Random, stage: str, check=None, tries: int = 40):
    """A real case of this Level 2 type whose screen tells its Level 1 story, read as a Level 2 reading."""
    base = BASE[kind]
    for _ in range(tries):
        c = LF.make_case("external_checkout" if kind == "unlogged" else kind, rng.randrange(10**9), stage=stage)
        obs, charts = P.observe(c, "s14")
        obs["shape"] = P.SHAPE.get(base)
        if not P.consistent(base, obs, P.OBS_KEYS):
            continue
        if base == "noise" and obs.get("revenue") != F:
            continue                                   # a wobble that leaves revenue down needs a cause after all
        sh = P.SHAPE.get(base)
        if sh in (P.STEPV, P.SLOPE) and not P._shape_clear(c, charts, sh, stage):
            continue
        R = reading(c, obs, kind)
        if R is None:
            continue
        cr = cause_row(c, kind)
        if cr is not None and R["start"] is not None:
            cr = {**cr, "date": c["dates"][R["start"]]}
        if cr is not None and not fits(cr, R):
            continue                                   # the cause has to fit everything on screen, or the rep teaches the wrong thing
        if check and not check(c, R, cr):
            continue
        charts["emails"] = email_rows(R)
        return c, obs, charts, R, cr
    return None


def _rep_base(c, obs, charts, R, kind, rows, extra=None):
    pub = {"changes": public_rows(c, rows), "start_key": R["start_key"]}
    pub.update(extra or {})
    return {"case": c, "obs": obs, "charts": charts, "kind": kind, "rows": rows, "R": R, "public": pub, "dana": None}


def reasons_of(rows, R) -> dict:
    return {r["id"]: [x["why"] for x in could_explain(r, R)[0]] for r in rows}


def spot_row(cid):
    return "row-" + cid


def start_spots(R) -> list[str]:
    s = R["start"]
    out = [f"day-{s - 6}"] if s is not None and s >= 6 else []
    return out + ([] if R["start_key"] == "main" else ["tile-" + R["start_key"] if R["start_key"] != "emails" else "emails"])


# ---------------------------------------------------------------- the ways to play
def w_logrow(sid, rng, stage, level):
    """Read a row: where a change is, or which change landed on a day."""
    kind = pick_kind(sid, rng, level=level) or "code_edit"
    got = make2(kind, rng, stage)
    if not got:
        return None
    c, obs, charts, R, cr = got
    rows = build_log(c, R, rng, cause=cr, herrings=0, far=3, size=(4, 6))
    if not rows:
        return None
    form = "where" if level == "watch" else rng.choice(["where", "day"])
    lone = [x for x in rows if sum(y["date"] == x["date"] for y in rows) == 1]
    r = rng.choice(lone if form == "day" and lone else rows); i = rows.index(r)
    if form == "day" and not lone:
        form = "where"
    msgs = c["flow"]["messages"]
    if form == "where":
        w = r["where"]
        opts = [[m["id"], m["name"]] for m in msgs] + [["flow", "The whole flow"], ["store", "The store"], ["klaviyo", "Klaviyo"]]
        q = {"ask": f"Where is change #{i + 1}?", "options": opts, "field": "where"}
        ans = {"where": w}
        why = f"Row #{i + 1} says {where_label(c, w).lower() if w in ('flow', 'store', 'klaviyo') else where_label(c, w)}: {r['what']}."
        walk = [{"say": "Each row is one change: its number, the day, where, what changed, and who did it.", "spot": ["log"]},
                {"say": f"Find row #{i + 1}. The same number marks its day on the chart.", "spot": [spot_row(r["id"]), f"mark-{i + 1}"]},
                {"say": f"Its where column says {where_label(c, w)}.", "spot": [spot_row(r["id"])], "do": {"where": w}}]
    else:
        q = {"ask": f"Which change was made on {r['date'][5:]}?", "options": [[x["id"], f"#{j + 1}"] for j, x in enumerate(rows)], "field": "change", "rows": True}
        ans = {"change": r["id"]}
        why = f"#{i + 1} is dated {r['date'][5:]}: {r['what']}."
        walk = [{"say": "Each row is one change, oldest first. The date is the second column.", "spot": ["log"]},
                {"say": f"{r['date'][5:]} is row #{i + 1}. Its number sits on that day on the chart too.", "spot": [spot_row(r["id"]), f"mark-{i + 1}"], "do": {"change": r["id"]}}]
    out = _rep_base(c, obs, charts, R, kind, rows)
    out.update({"answer": ans, "q": q, "why": why, "spots": [spot_row(r["id"]), f"mark-{i + 1}"],
                "hint": {"say": f"Read row #{i + 1}: the date, then where." if form == "where" else f"Run down the date column for {r['date'][5:]}.", "spot": ["log"]},
                "walk": walk})
    out["public"]["form"] = form
    return out


def w_touch(sid, rng, stage, level):
    """One change. What can it move first?"""
    want = getattr(P.AGAIN, "kind", None)
    kinds = list(TOUCH)
    kind = want if want in kinds else ("subject" if level == "watch" else rng.choices(kinds, weights=[1.6 if TOUCH[k] != "nothing" else 1.4 for k in kinds])[0])
    c = LF.make_case("code_edit", rng.randrange(10**9), stage="clear")      # a flow to name the emails after
    row = make_row(c, "stock" if kind == "stock" else kind, rng) if kind not in ("stock", "onoff", "timing") else None
    m = rng.choice(c["flow"]["messages"])
    if kind == "stock":
        row = {"kind": "stock", "where": "store", "what": f"{m['features']} sold out in most sizes (featured in {m['name']})", "who": "Shopify"}
    elif kind == "onoff":
        row = {"kind": "onoff", "where": m["id"], "what": f"{m['name']}: status changed from Live to Manual", "who": rng.choice(WHO)}
    elif kind == "timing":
        row = {"kind": "timing", "where": m["id"], "what": f"{m['name']}: the wait before it changed from 3 days to 30 days", "who": rng.choice(WHO)}
    row["date"] = c["dates"][rng.randint(30, 52)]
    ans = TOUCH[kind]
    lab = dict(TOUCH_OPTS)[ans]
    return {"case": None, "obs": {}, "charts": {}, "kind": kind, "answer": {"touch": ans},
            "q": {"ask": "What can this change move first?", "options": TOUCH_OPTS, "field": "touch"},
            "public": {"entry": {"date": row["date"][5:], "where": where_label(c, row["where"]), "what": row["what"], "who": row["who"]}, "flow": c["flow"]["name"]},
            "dana": None, "why": f"{lab}. {TOUCH_WHY[kind]}", "spots": ["q"],
            "hint": {"say": "What does this change do to a person: what they see before opening, what they click, what they buy, or whether they get it at all?", "spot": ["entry"]},
            "walk": [{"say": f"The change: \"{row['what']}\". Ask what it does to the person getting the email.", "spot": ["entry"]},
                     {"say": TOUCH_WHY[kind], "spot": ["q"], "do": {"touch": ans}}]}


def _answer_walk(rows, R, ans, c, start_first=True):
    """Watch: the start, the rows on its day, each one's test, then the answer."""
    walk = []
    s = R["start"]
    if start_first and s is not None:
        walk.append({"say": f"First, when did it start? Around {R['dates'][s][5:]}" + ("." if R["start_key"] == "main" else f", on {P.LABEL.get(R['start_key'], 'the email table')}."),
                     "spot": start_spots(R)})
    near = [r for r in rows if s is not None and abs(R["dates"].index(r["date"]) - s) <= 1] if s is not None else rows
    if len(near) > 1:
        walk.append({"say": f"{' and '.join('#' + str(rows.index(r) + 1) for r in near)} land then. The date can't decide.", "spot": [spot_row(r["id"]) for r in near]})
    said = set()
    for r in sorted(rows, key=lambda r: r not in near):    # the ones on the date first: they're the ones that matter
        if r["id"] == ans:
            continue
        rs = could_explain(r, R)[0]
        if not rs or (r not in near and (rs[0]["why"] in said or len(walk) > 5)):
            continue
        said.add(rs[0]["why"])
        walk.append({"say": f"#{rows.index(r) + 1}: {rs[0]['why']}", "spot": [spot_row(r["id"]), P.spot_of(rs[0]["proof"]) if rs[0]["proof"] not in ("log", "emails") else rs[0]["proof"]]})
    if ans == "none":
        walk.append({"say": "Every change fails a test. So: None of these.", "spot": ["log"], "do": {"change": "none"}})
    else:
        r = next(x for x in rows if x["id"] == ans)
        walk.append({"say": f"#{rows.index(r) + 1} fits: {r['what']}. On the day, in the right place, and it can reach what moved.", "spot": [spot_row(ans)], "do": {"change": ans}})
    return walk


def w_when(sid, rng, stage, level):
    """Which change landed when it started? The date only: the cause sits on the start (or the day before), decoys far off."""
    for _ in range(6):
        kind = pick_kind(sid, rng, lambda k: k not in NO_START, level)
        if not kind:
            return None
        got = make2(kind, rng, stage)
        if not got:
            continue
        c, obs, charts, R, cr = got
        if R["start"] is None:
            continue
        none = cr is None or (level != "watch" and rng.random() < 0.15)    # about 1 in 4 once the re-rolls settle
        lean = 1 if level in ("solo", "hard") and rng.random() < 0.3 else 0
        rows = build_log(c, R, rng, cause=None if none else cr, herrings=0, far=3, trap=level in ("solo", "hard") and rng.random() < 0.5,
                         size=(3, 5) if level in ("watch", "together", "guided") else (4, 6), lean=lean)
        if not rows:
            continue
        s = R["start"]
        on = [r for r in rows if -1 <= R["dates"].index(r["date"]) - s <= 0]
        if len(on) != (0 if none else 1) or any(-4 <= R["dates"].index(r["date"]) - s <= 2 and r not in on for r in rows):
            continue
        ans = on[0]["id"] if on else "none"
        sd = R["dates"][s][5:]
        if ans == "none":
            near = min(rows, key=lambda r: abs(R["dates"].index(r["date"]) - s))
            gap = R["dates"].index(near["date"]) - s
            why = (f"It started around {sd}. Nothing in the log lands on or just before it. The nearest is #{rows.index(near) + 1}, "
                   f"{abs(gap)} days {'after' if gap > 0 else 'before'}. Whatever started it wasn't logged (step 5 is about that).")
        else:
            r = on[0]; gap = R["dates"].index(r["date"]) - s
            why = f"It started around {sd}. #{rows.index(r) + 1} landed {'that day' if gap == 0 else 'the day before (made late, it shows the next day)'}."
            after = [x for x in rows if R["dates"].index(x["date"]) > s + 2]
            if after:
                why += f" #{', #'.join(str(rows.index(x) + 1) for x in after)} came after it started, so {'it' if len(after) == 1 else 'they'} can't have started it."
        out = _rep_base(c, obs, charts, R, kind, rows)
        out.update({"answer": {"change": ans},
                    "q": {"ask": "Which change landed when it started?", "options": [[r["id"], f"#{i + 1}"] for i, r in enumerate(rows)] + [["none", "None near the start"]],
                          "field": "change", "rows": True},
                    "why": why, "spots": start_spots(R) + ([spot_row(ans)] if ans != "none" else []),
                    "hint": {"say": "Find the day it started on the chart that moved, then look for a number marked on that day or the day before.", "spot": start_spots(R)},
                    "walk": [{"say": f"First, when did it start? Around {sd}" + ("." if R["start_key"] == "main" else f", on {P.LABEL.get(R['start_key'], 'the email table')}."), "spot": start_spots(R)},
                             {"say": "Now the numbers under the chart. Which one sits on that day, or the day before?", "spot": ["log"]},
                             ({"say": why, "spot": [spot_row(ans)], "do": {"change": ans}} if ans != "none" else {"say": why, "spot": ["log"], "do": {"change": "none"}})]})
        return out
    return None


HERRINGS = {"obvious": 1, "clear": 1, "realistic": 2}


def _which_setup(sid, rng, stage, level, ok=lambda k: True, need_cause=False, herrings=None):
    for _ in range(8):
        kind = pick_kind(sid, rng, lambda k: ok(k) and (not need_cause or k not in NO_CAUSE), level)
        if not kind:
            return None
        got = make2(kind, rng, stage)
        if not got:
            continue
        c, obs, charts, R, cr = got
        n_h = herrings if herrings is not None else (1 if level in ("watch", "together", "guided") else HERRINGS[stage] if rng.random() < 0.5 else 1)
        if kind in NO_START:
            n_h = 1 if kind != "slide_no_change" else 0
        lean = 1 if level in ("solo", "hard") and rng.random() < 0.5 else 0
        slide = kind == "slide_no_change"
        rows = build_log(c, R, rng, cause=cr, herrings=n_h, far=1 if slide else 2, size=(2, 3) if slide else (4, 5) if level in ("watch", "together", "guided") else (4, 6), lean=lean,
                         hkind=MEET2.get(sid, {}).get("herring") if level == "watch" else None)
        if not rows:
            continue
        if kind == "slide_no_change":                 # small edits along the slope, none of them a step
            s = R["start"] or 15
            for _i in range(rng.randint(2, 3)):
                x = make_row(c, rng.choice(["subject", "content", "copy"]), rng)
                x["date"] = c["dates"][rng.randint(min(s + 2, 50), 53)]
                if x["what"] not in {r["what"] for r in rows}:
                    rows.append(x)
            rows.sort(key=lambda r: r["date"])
            for i, r in enumerate(rows):
                r["id"] = f"c{i + 1}"
        ans = answer_of(rows, R)
        if ans == "?" or (cr is not None and ans == "none"):
            continue
        if any(could_explain(r, R)[1] for r in rows):
            continue                                   # every row settles one way or the other
        return kind, c, obs, charts, R, rows, ans
    return None


def w_which(sid, rng, stage, level):
    """Which change? The full Level 1 screen plus the log. Pick the change that explains it, or None of these."""
    got = _which_setup(sid, rng, stage, level)
    if not got:
        return None
    kind, c, obs, charts, R, rows, ans = got
    ok = [ans] + (["none"] if kind == "subject_opens_only" else [])
    out = _rep_base(c, obs, charts, R, kind, rows)
    cause_r = next((r for r in rows if r["id"] == ans), None)
    if cause_r:
        why = f"#{rows.index(cause_r) + 1} fits: {cause_r['what']}. It lands when it started, sits where the move is, and can reach what moved."
    elif R["nothing"] or R["slope"]:
        why = "None of these. " + next(x["why"] for x in could_explain(rows[0], R)[0] if x["type"] in ("nothing", "slope"))
    else:
        why = "None of these. Every change fails a test: the day, the email, or what it can reach. The cause is outside the log: tell the owner."
    if kind == "subject_opens_only":
        why += " Only opens moved, so it isn't a win yet. None of these counts too: nothing that pays needs explaining."
    out.update({"answer": {"change": ok if len(ok) > 1 else ans}, "cause_id": ans,
                "q": {"ask": "Which change explains it?", "options": [[r["id"], f"#{i + 1}"] for i, r in enumerate(rows)] + [["none", "None of these"]], "field": "change", "rows": True},
                "why": why, "reasons": reasons_of(rows, R), "spots": ([spot_row(ans)] if cause_r else ["log"]),
                "hint": {"say": "When did it start? Then for each change on that day: is it on the email that moved, and can it reach the number that moved?",
                         "spot": start_spots(R) + ["emails"]},
                "walk": _answer_walk(rows, R, ans, c)})
    return out


def w_ruleout2(sid, rng, stage, level):
    """Dana names a change. Does the screen clear it? About half the time it does: a None-of-these case can only clear
    its guess, so those come up less here and a real cause is named a little more often."""
    got = _which_setup(sid, rng, stage, level, need_cause=level != "watch" and rng.random() < 0.4)
    if not got:
        return None
    kind, c, obs, charts, R, rows, ans = got
    want = "cleared" if level == "watch" or ans == "none" else "possible" if rng.random() < 0.6 else "cleared"
    if want == "possible":
        g = next(r for r in rows if r["id"] == ans)
    else:
        near = [r for r in rows if r["id"] != ans and not any(x["type"] in ("date", "inert") for x in could_explain(r, R)[0])]
        g = rng.choice(near or [r for r in rows if r["id"] != ans])
    rs = could_explain(g, R)[0]
    verdict = "cleared" if rs else "possible"
    i = rows.index(g)
    why = (" ".join(x["why"] for x in rs[:2]) + " So Dana's guess is wrong.") if rs else \
        f"Nothing on screen rules it out: it lands when it started, sits where the move is, and can reach what moved."
    out = _rep_base(c, obs, charts, R, kind, rows, {"guess_row": g["id"]})
    out.update({"answer": {"verdict": verdict}, "guess": g["id"], "cause_id": ans, "guess_text": f"#{i + 1} {g['date'][5:]} · {g['what']}",
                "q": {"ask": "Does the screen prove Dana's guess wrong?", "options": [["cleared", "Dana's guess is wrong"], ["possible", "Dana could be right"]], "field": "verdict"},
                "why": why, "reasons": reasons_of(rows, R), "spots": [spot_row(g["id"])] + [P.spot_of(x["proof"]) if x["proof"] not in ("log", "emails") else x["proof"] for x in rs[:2]],
                "hint": {"say": f"Test #{i + 1}: the day, the email, and what it can reach.", "spot": [spot_row(g["id"])] + start_spots(R)},
                "walk": [{"say": f"Dana's guess: #{i + 1}, \"{g['what']}\". Test it three ways: the day, the email, what it can reach.", "spot": ["guess", spot_row(g["id"])]}]
                + [{"say": x["why"], "spot": [P.spot_of(x["proof"]) if x["proof"] not in ("log", "emails") else x["proof"]]} for x in rs[:2]]
                + [{"say": "So Dana's guess is wrong." if rs else "Nothing rules it out, so Dana could be right.", "spot": ["q"], "do": {"verdict": verdict}}]})
    return out


def _proofs(r, R):
    return sorted({x["proof"] for x in could_explain(r, R)[0] if x["type"] != "date" and x["proof"] != "log"})


def w_lookalike2(sid, rng, stage, level):
    """Two changes fit the date. Pick the one that explains it, then click the chart that rules out the other."""
    for _ in range(6):
        got = _which_setup(sid, rng, stage, level, lambda k: k not in NO_START, need_cause=True, herrings=1)
        if not got:
            return None
        kind, c, obs, charts, R, rows, ans = got
        s = R["start"]
        near = [r for r in rows if r["id"] != ans and s is not None and abs(R["dates"].index(r["date"]) - s) <= 1 and _proofs(r, R)]
        if not near:
            continue
        h = near[0]
        opts = [ans, h["id"]]
        rng.shuffle(opts)
        lab = lambda r: f"#{rows.index(r) + 1} {r['date'][5:]} · {r['what']}"
        ar = next(r for r in rows if r["id"] == ans)
        pk = _proofs(h, R)
        walk = [{"say": "Both changes land when it started. The date can't decide. Look for a chart where they disagree.", "spot": ["opts"]}]
        for x in could_explain(h, R)[0][:2]:
            walk.append({"say": f"#{rows.index(h) + 1}: {x['why']}", "spot": [P.spot_of(x["proof"]) if x["proof"] != "emails" else "emails"]})
        walk.append({"say": f"So it's #{rows.index(ar) + 1}.", "spot": ["opt-" + ans], "do": {"pick": ans}})
        walk.append({"say": f"And the proof: {P.LABEL.get(pk[0], 'the email table') if pk else 'the chart'}.", "spot": [P.spot_of(pk[0]) if pk and pk[0] != "emails" else "emails"],
                     "do": {"proof": pk[0] if pk else "main"}})
        out = _rep_base(c, obs, charts, R, kind, rows, {"options": [{"kind": o, "cause": lab(next(r for r in rows if r["id"] == o))} for o in opts], "closest": h["id"]})
        out.update({"answer": {"pick": ans}, "cause_id": ans, "options": opts, "closest": h["id"], "q": {"ask": "Which change explains it?"}, "why": "", "spots": [],
                    "hint": {"say": "They both fit the date. Find a chart where they'd disagree: the email that moved, or the number it can reach.", "spot": ["emails"]},
                    "walk": walk})
        return out
    return None


def w_suspects2(sid, rng, stage, level):
    """The log's rows are the suspects. The main chart, the revenue rows and the log are free; flip tiles to clear them."""
    free = ["main", "shape", "revenue", "lastweek", "log"]
    clues = [k for k in P.OBS_KEYS if k not in free]
    for _ in range(8):
        got = _which_setup(sid, rng, stage, level, lambda k: k not in NO_START, need_cause=True, herrings=2 if level not in ("watch", "together", "guided") else 1)
        if not got:
            return None
        kind, c, obs, charts, R, rows, ans = got
        others = [r for r in rows if r["id"] != ans]
        outs = {r["id"]: sorted({x["proof"] for x in could_explain(r, R)[0]}) for r in others}
        def settled(seen):
            return all(set(v) & set(seen) for v in outs.values())
        need = next((n for n in range(0, 4) for combo in combinations(clues, n) if settled(free + list(combo))), None)
        if not need:
            continue
        looks = min(len(clues), need + (2 if level in ("watch", "together", "guided") else 1))
        lab = lambda r: f"#{rows.index(r) + 1} {r['date'][5:]} · {r['what']}"
        left = [r["id"] for r in others if not set(outs[r["id"]]) & set(free)]
        walk = [{"say": "The main chart, the revenue rows and the log are free. Cross out any change they already rule out.", "spot": ["main", "log"]}]
        for r in others:
            if r["id"] not in left:
                walk.append({"say": f"#{rows.index(r) + 1}: {could_explain(r, R)[0][0]['why']} Crossed out.", "spot": ["sus-" + r["id"]], "do": {"strike": r["id"]}})
        flipped = []
        while left and len(flipped) < 4:
            k = max((y for y in clues if y not in flipped), key=lambda y: sum(1 for x in left if y in outs[x]))
            flipped.append(k)
            walk.append({"say": f"Flip {P.LABEL[k]}: it rules out the most changes still standing.", "spot": ["card-" + k], "do": {"flip": k}})
            for x in [x for x in left if k in outs[x]]:
                r = next(r for r in rows if r["id"] == x)
                why = next(y["why"] for y in could_explain(r, R)[0] if y["proof"] == k)
                walk.append({"say": f"#{rows.index(r) + 1}: {why} Crossed out.", "spot": ["sus-" + x], "do": {"strike": x}})
            left = [x for x in left if k not in outs[x]]
        ar = next(r for r in rows if r["id"] == ans)
        walk.append({"say": f"One change left: #{rows.index(ar) + 1}. Accuse.", "spot": ["sus-" + ans], "do": {"accuse": ans}})
        first = next((b["do"]["flip"] for b in walk if "flip" in b.get("do", {})), None)
        out = _rep_base(c, obs, charts, R, kind, rows, {"suspects": [{"kind": r["id"], "cause": lab(r)} for r in rows], "free": free, "clues": clues})
        out.update({"answer": {"accuse": ans}, "cause_id": ans, "suspects": [r["id"] for r in rows], "need": need, "looks": looks, "free": free, "clues": clues, "outs": outs,
                    "q": {"ask": "Which change did it?"}, "why": "", "spots": [],
                    "hint": {"say": f"Start with {P.LABEL[first]}: of the face-down cards, it rules out the most changes." if first else "The free charts already settle it.",
                             "spot": ["card-" + first] if first else ["main"]},
                    "walk": walk})
        return out
    return None


def w_action2(sid, rng, stage, level):
    """The cause is known. What do we do?"""
    kind = pick_kind(sid, rng, level=level) or "code_edit"
    got = make2(kind, rng, stage)
    if not got:
        return None
    c, obs, charts, R, cr = got
    ok = ACTIONS[kind]
    where = R["names"].get(R["where"], "every email") if R["where"] != "all" else "every email"
    story = (f"It explains what moved: {METRIC_NAME.get(R['metric'], 'the numbers')} on {where}" + (f", from {R['dates'][R['start']][5:]}." if R["start"] is not None else ".")
             if cr else {"noise_with_edit": "Nothing left its normal range. The edit near the dip changed nothing.",
                         "coincidence_bf": "Against the quiet weeks nothing fell. The comparison week was Black Friday.",
                         "slide_no_change": "The line has slid a little every week. No single change did it.",
                         "unlogged": "Orders fell on every email after the click. Nothing in the log can reach that."}.get(kind, ""))
    text = cr["what"] if cr else NONE_TEXT[kind]
    why = ACTION_WHY.get(kind) or "Match it to who can fix it."
    return {"case": c, "obs": obs, "charts": charts, "kind": kind, "answer": {"action": ok},
            "q": {"ask": "What do we do?", "options": [[k, v] for k, v in LF.ACTIONS.items()], "field": "action"},
            "cause_text": text, "story": story, "dana": None, "why": why, "spots": [],
            "hint": {"say": "Who can fix this: you, someone else, or nobody? And is it worth keeping?", "spot": ["q"]},
            "walk": [{"say": f"The cause: {text}.", "spot": ["cause"]}, {"say": why, "spot": ["q"], "do": {"action": ok[0]}}]}


WAYS2 = {"logrow": w_logrow, "touch": w_touch, "when": w_when, "which": w_which, "ruleout2": w_ruleout2, "lookalike2": w_lookalike2,
         "suspects2": w_suspects2, "action2": w_action2}


# ---------------------------------------------------------------- grading
def grade(d: dict, body: dict) -> dict:
    way, ans, sid = d["way"], d["answer"], d["step"]
    out = {"why": d["why"], "spots": d["spots"], "answer": {k: v for k, v in ans.items()}}
    R, rows = d.get("R"), d.get("rows") or []
    if way in ("logrow", "touch", "when", "which", "ruleout2", "action2"):
        f = d["q"]["field"]
        want = ans[f]
        out["ok"] = body.get(f) in want if isinstance(want, list) else body.get(f) == want
        if way == "ruleout2":
            out["guess"] = d["guess"]
    elif way == "lookalike2":
        pick, proof = body.get("pick"), body.get("proof")
        rej = body.get("rule_out") if body.get("rule_out") in d["options"] and body.get("rule_out") != pick else d["closest"]
        rr = lambda cid: next(r for r in rows if r["id"] == cid)
        pk = lambda cid: _proofs(rr(cid), R)
        out.update({"ok": pick == ans["pick"] and proof in pk(rej), "guessed": pick == ans["pick"] and proof not in pk(rej),
                    "pick": pick, "proof": proof, "proof_ok": proof in pk(rej), "rejected": rej, "proof_keys": pk(rej),
                    "why_not": {k: pk(k) for k in d["options"] if k != ans["pick"]},
                    "why_text": {k: [x["why"] for x in could_explain(rr(k), R)[0][:2]] for k in d["options"] if k != ans["pick"]}, "scripts": {}})
        if pick != ans["pick"] and pick in d["options"]:
            out["why_not"][pick] = pk(pick)
            out["why_text"][pick] = [x["why"] for x in could_explain(rr(pick), R)[0][:2]]
    elif way == "suspects2":
        flipped, truth, outs, free = d["flipped"], ans["accuse"], d["outs"], d["free"]
        seen = free + flipped
        struck = [k for k in body.get("struck", []) if k in d["suspects"]]
        left = [k for k in d["suspects"] if k != truth and not set(outs[k]) & set(seen)]
        best, rest = [], [k for k in d["suspects"] if k != truth and not set(outs[k]) & set(free)]
        while rest and len(best) < len(d["clues"]):
            k = max((x for x in d["clues"] if x not in best), key=lambda x: sum(1 for s in rest if x in outs[s]))
            best.append(k); rest = [s for s in rest if k not in outs[s]]
        right = body.get("accuse") == truth
        out.update({"ok": right and not left, "guessed": right and bool(left), "accused": body.get("accuse"), "strikes": [{"kind": k, "fair": k != truth and bool(set(outs[k]) & set(seen))} for k in struck],
                    "still_fit": left, "best": best, "need": d["need"], "looks": len(flipped), "charts": {k: d["charts"].get(k) for k in d["clues"]},
                    "why_not": {k: outs[k] for k in d["suspects"] if k != truth}, "free_out": [k for k in d["suspects"] if k != truth and set(outs[k]) & set(free)]})
    if d.get("reasons") is not None or way in ("which", "ruleout2", "lookalike2", "suspects2", "when"):
        out["reasons"] = reasons_of(rows, R) if R else {}
    k = d["kind"]
    if way == "touch":
        out.update({"kind": k, "lesson": TOUCH_RULE, "term": "mechanism", "name": "What it can reach", "met": True})
    else:
        lesson, term = LESSONS.get(k, ("", ""))
        cid = d.get("cause_id")
        cause = label(rows, cid, d["case"], k) if rows and cid else None
        out.update({"kind": k, "cause": cause, "name": NAMES.get(k), "lesson": lesson, "term": term,
                    "met": k in pool(sid) and way not in ("logrow", "when")})
    out.update({"say": P.SAY, "labels": {k_: P.LABEL[k_] for k_ in P.OBS_KEYS}, "obs": d["obs"] if way in ("lookalike2", "suspects2") else None})
    return out


# ---------------------------------------------------------------- register Level 2 with the path engine
P.TRACK[2] = STEPS2
P.STEP.update({s["id"]: s for s in STEPS2})
P.TITLE[2] = "Level 2 · What changed?"
P.PARTS_OF[2] = PARTS2
P.MEET.update(MEET2)
P.WAY_NAME.update(WAY_NAME2)
P.WAYS.update(WAYS2)
P.GRADERS.update({w: grade for w in WAYS2})
