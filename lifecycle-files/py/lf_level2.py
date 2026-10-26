"""Lifecycle Files, Level 2: What changed? Each case is a Level 1 pattern with a dated change log attached.

The log holds the cause (when there is one), decoys that change nothing, and in the harder tiers a red herring:
an edit the same week on another email, or on a part that didn't move. The player answers the usual six
questions, and question 5 gets a second part: which change explains it (or none of these).

A change's "kind" is what it can touch (MECH). The player reads the plain "what"; the expert player and the
grader use the kind. Design: games/lifecycle-files/docs/DESIGN.md, "Level 2".
"""
from __future__ import annotations
import random
from datetime import date, timedelta

TIERS = [
    ["code_edit", "filter_edit", "link_edit", "subject_win", "noise_with_edit", "email_off"],
    ["smart_sending", "external_checkout", "sold_out_herring", "feature_swap", "subject_opens_only", "delay_typo"],
    ["two_changes", "coincidence_bf", "integration_break", "slide_no_change", "popup_mix"],
]
TYPES = [k for t in TIERS for k in t]
BASE = {   # the Level 1 pattern underneath each case type
    "code_edit": "conv_drop_one", "filter_edit": "entries_drop", "link_edit": "click_drop_one", "subject_win": "good_news",
    "noise_with_edit": "noise", "smart_sending": "delivery_drop", "external_checkout": "conv_drop_all",
    "sold_out_herring": "conv_drop_one", "feature_swap": "aov_drop", "subject_opens_only": "opens_one",
    "two_changes": "conv_drop_one", "coincidence_bf": "black_friday", "integration_break": "tracking_break",
    "slide_no_change": "slow_slide", "popup_mix": "volume_mix", "email_off": "email_stopped", "delay_typo": "email_late",
}
# what each kind of change can touch
MECH = {"subject": ["opens", "clicks", "orders"], "content": ["clicks", "orders"], "offer": ["orders", "order_size"],
        "product": ["order_size", "orders"], "filter": ["entered"], "sending": ["delivered"], "checkout": ["orders"],
        "stock": ["orders"], "integration": ["orders"], "signup": ["entered"], "onoff": ["delivered"], "timing": ["delivered"],
        "copy": [], "admin": [], "collection": []}
CATEGORY = {"subject": "subject line", "content": "content or links", "offer": "offer or product", "product": "offer or product",
            "filter": "filter or trigger", "sending": "sending settings", "onoff": "sending settings", "timing": "sending settings", "stock": "outside the flow", "checkout": "outside the flow",
            "integration": "outside the flow", "signup": "outside the flow"}
CATEGORIES = ["subject line", "content or links", "offer or product", "filter or trigger", "sending settings", "outside the flow"]
LOG_STAGE = {   # the stages reach the log too: how many decoys, and how many land within 3 days of the start
    "obvious": {"size": (3, 4), "near": 0}, "clear": {"size": (4, 5), "near": 0}, "realistic": {"size": (4, 6), "near": 1},
    "subtle": {"size": (5, 7), "near": 2},
}
WHO = ["Priya", "Ruth", "Theo", "Dana"]
ACTIONS = {   # what to do once the cause is known (the Level 1 pattern's answer doesn't always carry over)
    "code_edit": ["fix_today"], "filter_edit": ["fix_today"], "link_edit": ["fix_today"], "subject_win": ["leave", "watch"],
    "noise_with_edit": ["watch", "leave"], "smart_sending": ["fix_today", "test"], "external_checkout": ["escalate"],
    "sold_out_herring": ["fix_today", "escalate"], "feature_swap": ["fix_today", "test"], "subject_opens_only": ["leave", "watch", "test"],
    "two_changes": ["fix_today"], "coincidence_bf": ["leave", "watch"], "integration_break": ["escalate"], "slide_no_change": ["test"],
    "popup_mix": ["watch", "leave"], "email_off": ["fix_today"], "delay_typo": ["fix_today"],
}
ACTION_WHY = {
    "code_edit": "Fix it today: put back a working code in that email.", "filter_edit": "Fix it today: read the new filter and undo what shut people out.",
    "link_edit": "Fix it today: open the new version and repair the link or image.", "smart_sending": "Fix it today (or test it): Smart Sending suits campaigns more than a flow like this.",
    "external_checkout": "Escalate: checkout belongs to the web team. Tell them what it's costing.", "sold_out_herring": "Fix today by featuring a product in stock, and tell whoever owns stock.",
    "feature_swap": "Fix it today, or test the two products against each other.", "two_changes": "Fix it today: undo the offer change.",
    "integration_break": "Escalate to whoever owns the Shopify integration. Check other flows too.", "slide_no_change": "Test fresh creative. No single edit to undo.",
    "email_off": "Fix it today: set the email back to Live. Every day on Manual is a day it sends nothing.",
    "delay_typo": "Fix it today: put the wait back. Nobody is waiting for a reason.",
    "subject_win": "Leave it running, and write down what changed so you can try it on the other emails.",
    "subject_opens_only": "Leave it, or test a subject line that earns clicks. More opens alone don't pay.",
    "noise_with_edit": "Watch it another week. The edit didn't move anything outside normal.",
    "coincidence_bf": "Leave it. Compare with the quiet weeks, not with Black Friday.",
    "popup_mix": "Watch it. If the new signups stay, reset the normal range for this flow.",
}
SKILL_EXTRA = {   # Level 2 skills each case type adds on top of its pattern's
    "code_edit": ["matching_change"], "filter_edit": ["matching_change"], "link_edit": ["matching_change"],
    "subject_win": ["matching_change"], "noise_with_edit": ["red_herring"], "smart_sending": ["matching_change"],
    "external_checkout": ["external_cause"], "sold_out_herring": ["red_herring", "external_cause"], "feature_swap": ["matching_change"],
    "subject_opens_only": ["matching_change"], "two_changes": ["red_herring", "matching_change"], "coincidence_bf": ["red_herring"],
    "integration_break": ["external_cause", "red_herring"], "slide_no_change": ["red_herring"], "popup_mix": ["external_cause"],
    "email_off": ["matching_change"], "delay_typo": ["matching_change"],
}
FILE_NAMES = {
    "code_edit": "The Swapped Code", "filter_edit": "The Narrow Door", "link_edit": "The New Look", "subject_win": "The Better Line",
    "noise_with_edit": "The Innocent Edit", "smart_sending": "The Quiet Setting", "external_checkout": "Not Our Flow",
    "sold_out_herring": "The Empty Shelf", "feature_swap": "The Smaller Hero", "subject_opens_only": "All Eyes, No Clicks",
    "two_changes": "Two Edits, One Culprit", "coincidence_bf": "Bad Timing", "integration_break": "The Reconnect",
    "slide_no_change": "Death by a Thousand Edits", "popup_mix": "The Open Door", "email_off": "The Paused Email", "delay_typo": "The Long Wait",
}
LESSONS = {
    "code_edit": ("When one email's orders fall the day its offer changed, the offer is the first suspect: check the code works.", "change attribution"),
    "filter_edit": ("Fewer people entering on the day the filter was edited: read the new filter before anything else.", "change attribution"),
    "link_edit": ("A content change that lands the day clicks collapse is almost always a broken link or image in the new version.", "change attribution"),
    "subject_win": ("Credit a win to the change that caused it, so you can keep it and try it elsewhere.", "learning from wins"),
    "noise_with_edit": ("An edit near a dip isn't the cause if the dip is inside the normal range. Not every change matters.", "post hoc fallacy"),
    "smart_sending": ("Entered steady, delivered down, Smart Sending turned on that day: the setting is holding emails back.", "suppression"),
    "external_checkout": ("Orders down everywhere and nothing in the flow changed: look outside it. A site release is the owner's to fix.", "external causes"),
    "sold_out_herring": ("Match the change to the part that moved, not just the date. The edit that week was on another email. The product sold out.", "red herrings"),
    "feature_swap": ("Smaller orders the day the featured product changed: what the email puts first sets the basket.", "change attribution"),
    "subject_opens_only": ("A subject line that lifts opens but not clicks or orders isn't a win yet. Opens alone don't pay.", "vanity metrics"),
    "two_changes": ("Two edits, one effect: the one that can touch the part that moved is the cause.", "mechanism"),
    "coincidence_bf": ("An edit right after Black Friday didn't cause the drop. The calendar did.", "post hoc fallacy"),
    "integration_break": ("When orders vanish but clicks don't, the integration log matters more than the flow edits.", "measurement failure"),
    "slide_no_change": ("A slow slope rarely has one edit behind it. Look for fatigue, not a culprit.", "decay"),
    "popup_mix": ("A new signup source changes who enters. Lower rate, same revenue: the newcomers explain it, nothing broke.", "mix shift"),
    "email_off": ("One email's sends fell to zero while the others carried on: check its status first. An email on Manual never sends.", "flow status"),
    "delay_typo": ("An email that stops the day its wait was edited is waiting, not broken: read the new delay. 30 days instead of 3 looks like an outage.", "time delays"),
}
DECOYS = [   # ordinary edits that change nothing a flow can measure. (Not campaigns: a big send can suppress flow emails
             # through Smart Sending or take their purchases, so a campaign is never a safe decoy.)
    ("copy", "Renamed in Klaviyo (internal name only)"), ("copy", "Footer address updated"), ("copy", "Alt text added to images"),
    ("copy", "Reply-to address changed"), ("copy", "UTM tags renamed"), ("copy", "Social icons updated"),
    ("admin", "Segment renamed for the monthly report"), ("admin", "New team member added to Klaviyo"),
    ("collection", "Blog post published: dialing in your grinder"), ("collection", "Shipping policy page reworded"),
]


def _d(case, i):
    return case["dates"][max(0, min(len(case["dates"]) - 1, i))]


def _idx(case, day):
    return case["dates"].index(day) if day in case["dates"] else None


def attach(case: dict, kind: str, rng: random.Random, stage: str = "realistic") -> dict:
    """Give a Level 1 case its change log and its Level 2 answer key."""
    t = case["truth"]
    msgs = case["flow"]["messages"]
    since_i = _idx(case, t["since"]) if t["since"] else None
    m = t["where"] if t["where"] not in (None, "flow") else None
    mname = next((x["name"] for x in msgs if x["id"] == m), "")
    others = [x["id"] for x in msgs if x["id"] != m] or [msgs[0]["id"]]
    changes, cause = [], "none"

    def add(day_i, where, kind_, what, who=None, is_cause=False):
        nonlocal cause
        cid = f"c{len(changes) + 1}"
        changes.append({"id": cid, "date": _d(case, day_i), "where": where, "kind": kind_, "what": what,
                        "who": who or ("Shopify" if where == "store" else rng.choice(WHO))})
        if is_cause:
            cause = cid
        return cid

    feat = lambda mid: next((x.get("features") for x in msgs if x["id"] == mid), "the featured product")
    s = since_i
    LS = LOG_STAGE.get(stage, LOG_STAGE["realistic"])
    if s is not None and LS["near"] and rng.random() < 0.4:
        s = s - 1          # made late in the day, it shows from the next one: the cause can sit a day before the visible start
    if kind == "code_edit":
        add(s, m, "offer", f"{mname}: discount code changed from WELCOME10 to {rng.choice(['SPRING25', 'BREW15', 'BEANS20'])}", is_cause=True)
    elif kind == "filter_edit":
        add(s, "flow", "filter", "Flow filter edited: added 'has placed 0 orders in the last 60 days'", is_cause=True)
    elif kind == "link_edit":
        add(s, m, "content", f"{mname}: hero image and button replaced with the new template", is_cause=True)
    elif kind == "subject_win":
        add(s, m, "subject", f"{mname}: subject line changed to \"{rng.choice(['Roasted this week, for you', 'Your morning, sorted', 'The blend regulars swear by'])}\"", is_cause=True)
    elif kind == "noise_with_edit":
        add(rng.randint(46, 51), rng.choice([x["id"] for x in msgs]), "subject", "Preview text rewritten")   # it could move opens. Nothing left normal
    elif kind == "smart_sending":
        add(s, "flow", "sending", "Smart Sending turned on (skips anyone emailed in the last 16 hours)", is_cause=True)
    elif kind == "external_checkout":
        add(s, "store", "checkout", "Checkout update deployed (new shipping step)", who="Web team", is_cause=True)
    elif kind == "sold_out_herring":
        add(s, "store", "stock", f"{feat(m)} sold out in most sizes", is_cause=True)
        add(since_i + rng.choice([-1, 0, 1]), rng.choice(others), "subject", f"{next(x['name'] for x in msgs if x['id'] == others[0])}: subject line refreshed")
    elif kind == "feature_swap":
        add(s, "flow", "product", "Featured product block switched from the grinder to the filters 100-pack", is_cause=True)
    elif kind == "subject_opens_only":
        mm = t.get("_msg") or msgs[0]["id"]
        add(rng.randint(36, 46), mm, "subject", f"{next(x['name'] for x in msgs if x['id'] == mm)}: subject line changed to \"Open for 15% off\"", is_cause=True)
    elif kind == "two_changes":
        add(s, m, "offer", f"{mname}: offer block edited, code changed to SAVE15", is_cause=True)
        add(s, rng.choice(others), "subject", "Preview text rewritten")
        add(s, rng.choice(others), "subject", "Subject line made shorter")
    elif kind == "coincidence_bf":
        add(len(case["dates"]) - rng.randint(9, 12), rng.choice([x["id"] for x in msgs]), "content", "Copy refreshed after Black Friday")
    elif kind == "integration_break":
        add(s, "klaviyo", "integration", "Shopify integration reconnected after an app update", who="Klaviyo", is_cause=True)
        add(since_i + rng.choice([-1, 0, 1]), rng.choice([x["id"] for x in msgs]), "content", "Body copy edited")
    elif kind == "slide_no_change":
        for _ in range(3):
            k_, w_ = rng.choice([("subject", "Subject line A/B test ended"), ("subject", "Preview text rewritten"), ("content", "Lifestyle photo swapped")])
            add(rng.randint((s or 15) + 2, 52), rng.choice([x["id"] for x in msgs]), k_, w_)
    elif kind == "email_off":
        add(s, m, "onoff", f"{mname}: status changed from Live to Manual", is_cause=True)
    elif kind == "delay_typo":
        i_ = next(i for i, x in enumerate(msgs) if x["id"] == m)
        w = max(1, msgs[i_]["day"] - (msgs[i_ - 1]["day"] if i_ else 0))
        add(s, m, "timing", f"{mname}: the wait before it changed from {w} day{'s' if w != 1 else ''} to {max(30, w * 10)} days", is_cause=True)
    elif kind == "popup_mix":
        add(s, "klaviyo", "signup", "New signup pop-up launched: 15% off for new subscribers", who="Ruth", is_cause=True)
    # decoys: the log's size is drawn the same way for every type (so its length gives nothing away), and the stage
    # decides how many decoys sit within 3 days of the start (none while the skill is new, two when it's mastered)
    target = rng.randint(*LS["size"])
    near_left = LS["near"]
    for _ in range(max(1, target - len(changes))):
        k_, w_ = rng.choice(DECOYS)
        want_near = s is not None and near_left > 0
        for _try in range(30):
            di = rng.randint(3, len(case["dates"]) - 2)
            close = s is not None and abs(di - since_i) <= 1        # on the visible start day or right next to it
            if (want_near and close) or (not want_near and (s is None or abs(di - since_i) >= 7)):
                break
        near_left -= want_near
        where_ = rng.choice([x["id"] for x in msgs]) if k_ == "copy" else "klaviyo" if k_ == "admin" else "store"
        add(di, where_, k_, w_, who=None if where_ != "store" else "Shopify")
    for c in changes:
        c["_r"] = rng.random()
    changes.sort(key=lambda c: (c["date"], c.pop("_r")))      # same-day changes in random order: position gives nothing away
    ids = {c["id"]: f"c{i + 1}" for i, c in enumerate(changes)}      # renumber in date order
    for c in changes:
        c["id"] = ids[c["id"]]
    cause = ids.get(cause, "none")
    case["changes"] = changes
    ok = [cause] + (["none"] if kind == "subject_opens_only" else [])
    t.update({"cause": cause, "cause_ok": ok, "cause_why": _why(kind, changes, cause), "level2": kind, "actions": ACTIONS[kind]})
    if kind in ACTION_WHY:
        t["expert"] = t["expert"][:5] + [ACTION_WHY[kind]]
    return case


def _why(kind: str, changes: list[dict], cause: str) -> str:
    c = next((x for x in changes if x["id"] == cause), None)
    if kind in ("noise_with_edit", "coincidence_bf"):
        return "None of these: nothing needs explaining. " + ("The dip is inside the normal range." if kind == "noise_with_edit" else "The comparison week was Black Friday.")
    if kind == "slide_no_change":
        return "None of these: a slow slope with scattered small edits is fatigue, not one change."
    if not c:
        return "None of the changes fits."
    return f"{c['date']}: {c['what']}. It lands when the change started and can touch the part that moved."


def describe_where(case, w):
    return {"flow": "the whole flow", "store": "the store", "klaviyo": "Klaviyo"}.get(w) or next((m["name"] for m in case["flow"]["messages"] if m["id"] == w), w)
