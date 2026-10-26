#!/usr/bin/env python3
"""Lifecycle Files: a diagnosis game on the Marketing QA dashboards. Practice files live in games/lifecycle-files/docs/.

This module makes the cases, keeps the answers server-side, grades reports, and stores each session (click log,
and his words when he talks to the coach, lf_coach.py) for the tutor.

A case = one flow's last 8 weeks of daily numbers with one planted cause (or none), plus a symptom the way it
would arrive at work. Every case type is generated fresh from a seed, so replays never repeat numbers.

The six questions every report answers (the loop):
  real     Is it real?            problem / good / nothing
  big      How big?               dollars a week at stake (0 when nothing's wrong)
  where    Where?                 one message, or the whole flow
  since    Since when?            the day it started
  moved    What moved?            entered, delivered, opens, clicks, orders, order size, unsubscribes
  action   What do we do?         fix today / escalate / test / watch / leave

  lifecycle_files.py --sample conv_drop_one     print one case and its answer key
"""
from __future__ import annotations
import argparse, json, math, os, random, sys, time, uuid
from datetime import date, timedelta
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
try:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "tools" / "marketing-qa"))  # registry lives in Marketing QA
    import registry as RG  # noqa: E402
    KB = RG.KB
except (ImportError, IndexError):   # the public build (games/shared/PUBLIC-RELEASE.md) runs without Marketing QA
    KB = Path(os.environ.get("LF_KB", "/state"))
import lf_tutor as TU  # noqa: E402
import lf_level2 as LV2  # noqa: E402
import lf_level3 as LV3  # noqa: E402
import lf_level4 as LV4  # noqa: E402
import lf_level5 as LV5  # noqa: E402
import lf_level6 as LV6  # noqa: E402

ROOT = Path(os.environ["LF_ROOT"]) if os.environ.get("LF_ROOT") else KB / "lifecycle-files"   # LF_ROOT: test runs stay out of real progress
DAYS = 56
CLOCK = 15                     # minutes in the morning
COST = {"tile": 1, "messages": 2, "hint": 2}
TILES = ["entered", "delivered", "opens", "clicks", "orders", "order_size", "unsubs"]
TILE_LABEL = {"entered": "Entered the flow", "delivered": "Got the email", "opens": "Opens", "clicks": "Clicks",
              "orders": "Orders", "order_size": "Order size", "unsubs": "Unsubscribes", "bounces": "Bounces", "complaints": "Spam complaints"}
L1_TILES = TILES
L4_TILES = ["entered", "delivered", "bounces", "opens", "clicks", "orders", "complaints", "unsubs"]   # Level 4: sending, not shopping


def tiles_for(level: int) -> dict:
    if level == 4:
        return {k: ("Sent" if k == "entered" else "Delivered" if k == "delivered" else TILE_LABEL[k]) for k in L4_TILES}
    return {k: TILE_LABEL[k] for k in TILES}
ACTIONS = {"fix_today": "Fix it today", "escalate": "Escalate to the owner", "test": "Test a change",
           "watch": "Watch it another week", "leave": "Leave it alone"}
REAL = {"problem": "Real problem", "good": "Real, and good", "nothing": "Nothing wrong"}
# Level 1's case file since 2026-10-15 (Brent): "Where?" splits "the whole flow" into before the emails and every email,
# so a problem upstream (nobody entering) has an honest answer when a late email still looks fine.
WHERE_LABEL = {"flow": "The whole flow", "before": "Before the emails (who enters or gets them)", "every": "Every email"}
WHERE_FLOW = {"entries_drop": ["before"], "delivery_drop": ["before", "every"], "volume_mix": ["before"], "volume_up": ["before"], "entries_down": ["before"]}


def asks_diagnosis(case: dict) -> bool:
    """Level 1's case file asks the six questions with their subjects named and ends in his own diagnosis (lf_diagnose)."""
    return case.get("level") == 1 and not case.get("program") and not case.get("changes")

# per delivered email: click rate, placed-order rate, average order, unsubscribe rate, open rate
# (order rates are Klaviyo-style attributed orders, so they include people who bought without clicking)
TYPES = {
    "welcome": {"name": "Welcome Series", "click": .065, "order": .035, "aov": 165, "unsub": .004, "open": .45, "msgs": [0, 2, 5, 9]},
    "cart": {"name": "Abandoned Cart", "click": .060, "order": .045, "aov": 150, "unsub": .003, "open": .50, "msgs": [0, 1, 3]},
    "browse": {"name": "Browse Abandonment", "click": .056, "order": .014, "aov": 150, "unsub": .003, "open": .42, "msgs": [0, 2]},
    "post_purchase": {"name": "Post-Purchase Cross-sell", "click": .051, "order": .011, "aov": 120, "unsub": .002, "open": .50, "msgs": [7, 21, 45]},
    "winback": {"name": "Winback", "click": .028, "order": .006, "aov": 140, "unsub": .005, "open": .35, "msgs": [0, 14, 28]},
}
NAMES = {"welcome": ["Welcome Series", "New Subscriber Welcome", "Welcome Flow (site form)"],
         "cart": ["Abandoned Cart", "Abandoned Checkout", "Cart Recovery"],
         "browse": ["Browse Abandonment", "Viewed Product Follow-up"],
         "post_purchase": ["Post-Purchase Cross-sell", "Brewer Cross-sell", "After Your Order"],
         "winback": ["Winback", "We Miss You (120 days)", "Lapsed Customer Winback"]}
SUBJECTS = {"welcome": [["Welcome to Fernhill", "Roasted the week you order", "What our customers say", "Your 10% is waiting"],
                        ["You're in", "Meet the beans", "How we pick our farms", "Last chance on your code"]],
            "cart": [["You left something", "Still thinking it over?", "Your cart expires soon"],
                     ["Forget something?", "Questions about the grind?", "Last call on your cart"]],
            "browse": [["Still looking?", "Picked out for you"], ["Back for another look?", "Popular this week"]],
            "post_purchase": [["Brewing tips for your first bag", "Pairs well with your brewer", "Ready for round two?"],
                              ["How's the first cup?", "Complete your setup", "Time for a refresh?"]],
            "winback": [["We miss you", "New since you've been gone", "A little something to come back"],
                        ["It's been a while", "What's new on the shelf", "Here's 15% off"]]}
FEATURED = ["House Blend", "Ridgeline Espresso", "Ethiopia Guji", "Burr Grinder", "Pour-Over Kit", "Paper Filters 100-Pack", "Travel Mug"]
MSG_SHAPE = [1.15, 0.95, 0.85, 0.8]
AOV_SD = 0.7     # spread of order values (log scale). Hillstrom's real buyers: 0.84; a coffee and gear range is a little tighter
SURVIVE = [1.0, 0.86, 0.75, 0.68]            # people leave the flow when they buy or unsubscribe
WEEKDAY = [1.05, 1.05, 1.0, 1.0, 0.98, 0.9, 0.92]

SYMPTOMS = {
    "down": ["Dana: {flow} revenue looks off this week. Can you take a look before standup?",
             "Ruth: the weekly report has {flow} lower than usual. Is that us?",
             "Slack #retention: anyone know why {flow} looks soft this week?",
             "Today flagged {flow} for a look.",
             "Priya: is something wrong with {flow}? The weekly report looks low.",
             "Dana: {flow} is down from last week. What happened?"],
    "up": ["Dana: {flow} is way up this week. Did we change something?",
           "Ruth: {flow} looks great in the weekly numbers. Is it real?",
           "Priya: nice bump on {flow}. Do we know why?"],
    "weird": ["Dana: {flow} numbers look weird this week. Anything to worry about?",
              "Slack #retention: something odd on {flow}? The dashboard tile changed color.",
              "Today flagged {flow}: one of its numbers moved a lot."],
    "opens": ["Priya: open rate on {flow} jumped. Is that good news?", "Dana: opens on {flow} are way up this week. Anything behind it?"],
    "bf": ["Dana: {flow} revenue fell {pct}% this week. That's a big drop. What happened?",
           "Dana: {flow} is down {pct}% on last week. What's going on?"],
}

# ---------------------------------------------------------------- case types
# Each returns (multipliers, truth). Multipliers are functions of (day index, message index) -> factor.
FILE_NAMES = {   # what each case is called on the board: a hint, not the answer
    "entries_drop": "The Empty Doorway", "delivery_drop": "Lost in the Mail", "click_drop_one": "The Silent Email",
    "conv_drop_all": "The Abandoned Aisle", "conv_drop_one": "The Broken Promise", "aov_drop": "The Shrinking Basket",
    "unsub_spike": "The Quiet Exodus", "mpp_opens": "The Phantom Readers", "noise": "Much Ado", "black_friday": "The Long Shadow",
    "good_news": "The Mystery Bump", "volume_mix": "The Crowded Room", "slow_slide": "The Slow Leak",
    "big_order": "The One-Week Wonder", "tracking_break": "The Ghost Orders",
}
LESSONS = {   # one rule per case type, with the term it goes by
    "entries_drop": ("Revenue is people × revenue per recipient. If revenue fell but the rate held, look upstream at who's entering.", "volume vs rate"),
    "delivery_drop": ("People can enter a flow and still not get the email. Compare entered with delivered before blaming the content.", "suppression and deliverability"),
    "click_drop_one": ("When one email's clicks collapse and the others don't, open that email: it's almost always a broken link, image or render.", "localizing the fault"),
    "conv_drop_all": ("Clicks steady, orders down: the email still works, something after the click doesn't. That's for the site or offer owner.", "post-click conversion"),
    "conv_drop_one": ("Clicks steady, orders down on one email: check what that email sends people to. Expired codes and sold-out products live here.", "post-click conversion"),
    "aov_drop": ("Same number of orders, less money: the orders got smaller. Look at what the flow now features or discounts.", "average order value"),
    "unsub_spike": ("Revenue can look fine while the list bleeds. Unsubscribes are a cost you pay later.", "list health"),
    "mpp_opens": ("Opens jump when Apple's Mail Privacy Protection opens emails for people. Judge emails on clicks and orders.", "Apple Mail Privacy Protection"),
    "noise": ("A small flow wobbles. Inside the normal range isn't news, however it looks week to week.", "signal vs noise"),
    "black_friday": ("The comparison decides the conclusion. Never compare with a Black Friday week: compare with quiet weeks or last year.", "seasonality and baselines"),
    "good_news": ("A jump up is a finding too. Find out what changed so you can keep it and copy it.", "learning from wins"),
    "volume_mix": ("A flood of new, less-ready people lowers the rate without anything breaking. Check revenue before calling it a problem.", "mix shift"),
    "slow_slide": ("Not every problem is a step. A slow slope means fatigue or erosion, and the fix is a test, not a repair.", "decay"),
    "big_order": ("One huge order can carry a week. Check for a single outlier before calling anything a trend.", "outliers"),
    "tracking_break": ("Real sales don't vanish overnight while clicks hold. When orders drop to almost zero, suspect the tracking first.", "measurement failure"),
}
CASE_TYPES = ["entries_drop", "delivery_drop", "click_drop_one", "conv_drop_all", "conv_drop_one", "aov_drop",
              "unsub_spike", "mpp_opens", "noise", "black_friday", "good_news", "volume_mix", "slow_slide",
              "big_order", "tracking_break"]


# Difficulty stages. Early on the fault is exaggerated and the noise turned down so the pattern is easy to see;
# it fades to realistic, then to subtle, as the skills behind the case are mastered (easy-to-hard progression).
STAGES = {   # fault size × (1 = as generated), order-value spread, small flows allowed, the note shown on the case
    "obvious": {"fault": 2.0, "aov_sd": 0.35, "small": 0.0, "badge": "Training wheels: exaggerated",
                "note": "The fault here is about twice as big as usual and the noise is turned down, so the pattern is easy to see. At work it would usually be about half this size."},
    "clear": {"fault": 1.0, "aov_sd": 0.55, "small": 0.15, "badge": "Clear",
              "note": "Fault at a typical size, noise a little calmer than real."},
    "realistic": {"fault": 1.0, "aov_sd": 0.7, "small": 0.25, "badge": "Realistic",
                  "note": "Sized and as noisy as real data."},
    "subtle": {"fault": 0.55, "aov_sd": 0.8, "small": 0.35, "badge": "Subtle",
               "note": "Smaller than usual and close to the edge of the normal range: the kind of case that slips past people at work."},
}


def stage_for(mastery: dict, kind: str) -> str:
    """The stage follows the weakest of the skills this case type is about (not the general ones every case shares)."""
    import lf_tutor as TU_
    own = [k for k in TU_.kind_skills(kind) if k not in ("signal", "action", "evidence")] or ["signal"]
    m = min(mastery.get(k, TU_.DEFAULT["prior"]) for k in own)
    return "obvious" if m < 0.4 else "clear" if m < 0.7 else "realistic" if m < 0.85 else "subtle"


def _plan(kind: str, rng: random.Random, n_msgs: int, stage: str = "realistic") -> dict:
    S = STAGES[stage]["fault"]
    dn = lambda f: 1 - min(0.75, (1 - f) * S)        # a drop, made bigger or smaller; never near zero, which is the tracking-break case
    up = lambda f: 1 + (f - 1) * S                   # a rise, made bigger or smaller
    start = rng.randint(30, 49)                      # day index the cause begins (0..55)
    k = rng.choices(range(n_msgs), weights=SURVIVE[:n_msgs])[0]   # busier emails are likelier to be the one
    one = lambda i: i == k
    p = {"start": start, "msg": None, "entered": 1.0, "delivered": 1.0, "click": None, "order": None, "aov": None,
         "unsub": None, "open": None, "symptom": "down", "big_order": None, "bf": False, "mix": None, "slide": None, "bf_lift": up(1.6) + 1.0, "bf_order": up(1.45)}
    if kind == "entries_drop":
        p["entered"] = rng.choice([0.0, dn(rng.uniform(0.15, 0.55))]) if S >= 1 else dn(rng.uniform(0.15, 0.55))
    elif kind == "delivery_drop":
        p["delivered"] = dn(rng.uniform(0.35, 0.7))
    elif kind == "click_drop_one":
        f = dn(rng.uniform(0.25, 0.55)); p["msg"] = k
        p["click"] = lambda i, f=f: f if one(i) else 1.0
        p["order"] = lambda i, f=f: (0.45 + 0.55 * f) if one(i) else 1.0
    elif kind == "conv_drop_all":
        f = dn(rng.uniform(0.35, 0.65)); p["order"] = lambda i, f=f: f
    elif kind == "conv_drop_one":
        f = dn(rng.uniform(0.15, 0.45)); p["msg"] = k; p["order"] = lambda i, f=f: f if one(i) else 1.0
    elif kind == "aov_drop":
        f = dn(rng.uniform(0.66, 0.8)); p["aov"] = lambda i, f=f: f
    elif kind == "unsub_spike":
        f = up(rng.uniform(3.5, 7)); p["msg"] = k; p["unsub"] = lambda i, f=f: f if one(i) else 1.0; p["symptom"] = "weird"
    elif kind == "mpp_opens":
        f = up(rng.uniform(1.35, 1.7)); p["open"] = lambda i, f=f: f; p["symptom"] = rng.choice(["opens", "opens", "weird", "up"])
    elif kind == "noise":
        p["start"] = None; p["symptom"] = "down"
    elif kind == "black_friday":
        p["bf"] = True; p["start"] = None; p["symptom"] = "bf"
    elif kind == "good_news":
        f = up(rng.uniform(1.4, 1.75)); p["msg"] = k
        p["click"] = lambda i, f=f: f if one(i) else 1.0
        p["order"] = lambda i, f=f: f if one(i) else 1.0
        if rng.random() < 0.5:                       # a better subject line: opens rise too
            p["open"] = lambda i, f=f: (1 + (f - 1) * 0.8) if one(i) else 1.0
            p["symptom"] = rng.choice(["opens", "up"])
        else:
            p["symptom"] = "up"
    elif kind == "volume_mix":
        p["mix"] = (up(rng.uniform(1.8, 2.8)), dn(rng.uniform(0.35, 0.55))); p["symptom"] = "weird"
    elif kind == "slow_slide":
        p["start"] = rng.randint(12, 22); p["slide"] = dn(rng.uniform(0.55, 0.72))
    elif kind == "big_order":
        p["big_order"] = rng.randint(50, 54); p["big_size"] = rng.uniform(0.35, 0.6) * S; p["start"] = None; p["symptom"] = rng.choice(["up", "weird"])
    elif kind == "tracking_break":
        p["order"] = lambda i: 0.03
    elif kind in ("steady", "noise_alarm"):     # Level 3 background: a normal flow, or a small one dipping by chance
        p["start"] = None; p["symptom"] = "down"
    elif kind == "volume_up":                  # Level 3: a flow grows, its rate doesn't change
        p["mix"] = (up(rng.uniform(1.9, 2.6)), 1.0); p["symptom"] = "weird"
    elif kind == "entries_down":               # Level 3: fewer people enter (traffic), everything else holds
        p["entered"] = dn(rng.uniform(0.55, 0.75))
    elif kind == "opens_one":           # Level 2 only: a subject line that lifts one email's opens and nothing else
        f = up(rng.uniform(1.35, 1.7)); p["msg"] = k; p["open"] = lambda i, f=f: f if one(i) else 1.0; p["symptom"] = rng.choice(["opens", "weird"])
    elif kind == "email_stopped":       # Level 2 only: one email stops sending (set to Manual, or switched off). The rest carry on
        p["msg"] = k; p["stop"] = k
    elif kind == "email_late":          # Level 2 only: the wait before the last email went from days to a month, so it stops for now
        p["msg"] = n_msgs - 1; p["stop"] = n_msgs - 1
    return p


def clear_enough(c: dict) -> bool:
    """Reject draws where the planted pattern doesn't show (or noise crosses the line), so every case teaches its lesson."""
    k, b = c["kind"], c["band"]
    r = weekly_revenue(c); base = sum(r[:4]) / 4; last = week_rpr(c, 7)
    checks = {
        "noise": b["lo"] <= last <= b["hi"] and r[-1] < base * 0.92,
        "good_news": last > b["hi"],
        "big_order": last > b["hi"],
        "black_friday": r[-1] < r[-2] * 0.75 and b["lo"] <= last <= b["hi"] * 1.05,
        "volume_mix": r[-1] >= base * 0.95 and last < b["lo"],
        "entries_drop": r[-1] < base * 0.85 and b["lo"] * 0.95 <= last,
        "delivery_drop": r[-1] < base * 0.85,
        "conv_drop_all": last < b["lo"], "tracking_break": last < b["lo"] * 0.3, "aov_drop": last < b["lo"] * 1.02,
        "slow_slide": last < b["lo"], "mpp_opens": b["lo"] <= last <= b["hi"], "opens_one": b["lo"] <= last <= b["hi"],
        "steady": b["lo"] <= last <= b["hi"], "noise_alarm": b["lo"] * 0.6 <= last < b["lo"] * 0.97 and week_rpr(c, 6) >= last * 1.2,   # a sharp one-week dip: it trips the alert "volume_up": b["lo"] <= last <= b["hi"],
        "entries_down": r[-1] < base * 0.85, "unsub_spike": True,
        "email_stopped": r[-1] < base * 0.88, "email_late": r[-1] < base * 0.88,
        # tier 1 and 2 teach "below the range = look"; a fault hidden inside the total would contradict that
        "click_drop_one": last < b["lo"], "conv_drop_one": last < b["lo"],
    }
    return checks.get(k, True)


def make_case(kind: str, seed: int | None = None, small: bool | None = None, stage: str = "realistic", force: dict | None = None) -> dict:
    """Build one case, re-rolling until its pattern is clear. The same seed always gives the same case.
    Level 2 types build their Level 1 pattern, then attach the change log and the "which change" answer."""
    seed = seed if seed is not None else random.randrange(10**9)
    if kind in LV2.TYPES:
        c = make_case(LV2.BASE[kind], seed, small, stage)
        LV2.attach(c, kind, random.Random(seed + 1), stage)
        t = c["truth"]
        t.update({"kind": kind, "lesson": LV2.LESSONS[kind]})
        t["story"] = t["story"] + " " + t["cause_why"]
        t["hints"] = [t["hints"][0], t["hints"][1] + " Then open Changes.", t["hints"][2] + " " + t["cause_why"]]
        c.update({"kind": kind, "level": 2})
        return c
    if kind in LV3.TYPES:
        return LV3.make_program(kind, seed, stage)
    if kind in LV4.TYPES:
        return LV4.make_account(kind, seed, stage)
    if kind in LV5.TYPES:
        return LV5.make_program(kind, seed, stage)
    if kind in LV6.TYPES:
        return LV6.make_program(kind, seed, stage)
    for n in range(30):
        c = _make_case(kind, seed + n * 7919, small, stage, force)
        if clear_enough(c) and (stage != "subtle" or n >= 20 or near_edge(c)):
            c["seed"] = seed
            return c
    return c


def near_edge(c: dict) -> bool:
    """Subtle cases: the last week sits just outside the normal range, not far beyond it."""
    b, last = c["band"], week_rpr(c, 7)
    return (b["lo"] * 0.82 <= last) if last < b["lo"] else (last <= b["hi"] * 1.18) if last > b["hi"] else True


def _make_case(kind: str, seed: int, small: bool | None = None, stage: str = "realistic", force: dict | None = None) -> dict:
    """Build one draw: the data the player sees, and the answer key the server keeps. `force` (Level 3) pins the flow
    type, today, the start day, the weekly size and the fault's size so several flows can share one program."""
    force = force or {}
    rng, nrs = random.Random(seed), np.random.default_rng(seed)
    ftype = rng.choice(["cart", "browse", "welcome"] if kind in ("black_friday", "volume_mix") else list(TYPES))   # these need same-day sends
    ftype = force.get("ftype", ftype)
    T = TYPES[ftype]
    n_msgs = len(T["msgs"])
    p = _plan(kind, rng, n_msgs, stage)
    if "start" in force and p["start"] is not None:
        p["start"] = force["start"]
    for k_, v_ in force.get("plan", {}).items():
        p[k_] = v_
    if small is None:   # noise is usually a small flow, but so are a quarter of the others, so size gives nothing away
        small = rng.random() < (0.7 if kind == "noise" else STAGES[stage]["small"])
    weekly = rng.randint(250, 900) if small else rng.choice([rng.randint(1500, 5000), rng.randint(5000, 22000)])
    weekly = force.get("weekly", weekly)
    # the case's own "today": Black Friday cases sit two weeks after it
    if p["bf"]:
        y = rng.choice([2025, 2026]); bf = date(y, 11, 22) + timedelta(days=(4 - date(y, 11, 22).weekday()) % 7)
        today = bf + timedelta(days=12)     # last week is normal, the week before held Black Friday
    else:
        today = date(2026, rng.randint(1, 10), rng.randint(1, 28))
        if date(today.year, 11, 15) <= today <= date(today.year, 12, 10):
            today = today - timedelta(days=30)
    today = force.get("today", today)
    days = [today - timedelta(days=DAYS - i) for i in range(DAYS)]      # ends yesterday
    pre = max(T["msgs"]) + 1
    all_days = [days[0] - timedelta(days=pre - i) for i in range(pre)] + days

    def factor(fn, i, default=1.0):
        return fn(i) if fn else default

    def active(di):
        return p["start"] is not None and di >= p["start"]

    # daily entries (before the window too, so later emails have people to send to)
    entries = []
    for j, dd in enumerate(all_days):
        di = j - pre
        mu = weekly / 7 * WEEKDAY[dd.weekday()]
        if p["bf"]:
            bfd = (dd - (today - timedelta(days=12))).days
            if -2 <= bfd <= 4:
                mu *= p["bf_lift"]
        if active(di):
            mu *= p["entered"]
            if p["mix"]:
                mu *= p["mix"][0]
        entries.append(int(nrs.poisson(mu)))
    subj = rng.choice(SUBJECTS[ftype])
    frng = random.Random(seed ^ 0x5EED)
    feats = frng.sample(FEATURED, k=min(len(FEATURED), len(T["msgs"])))
    msgs = [{"id": f"m{i + 1}", "name": f"Email {i + 1}", "subject": subj[i], "features": feats[i], "day": d} for i, d in enumerate(T["msgs"])]
    est_week_rev = weekly * sum(SURVIVE[i] * 0.985 * T["order"] * MSG_SHAPE[i] for i in range(n_msgs)) * T["aov"]
    out = {m["id"]: {k: [] for k in ("delivered", "opens", "clicks", "orders", "revenue", "unsubs")} for m in msgs}
    entered_series = entries[pre:]
    for di in range(DAYS):
        dd = days[di]
        for i, m in enumerate(msgs):
            src = di + pre - m["day"]
            reach = entries[src] * SURVIVE[i] if src >= 0 else 0
            on = active(di)
            if on and p.get("stop") == i:
                reach = 0                                # this email sends nothing from the start day on
            dl_rate = 0.985 * (p["delivered"] if on else 1.0)
            delivered = int(nrs.binomial(int(reach), dl_rate)) if reach else 0
            share_new = 0.0
            if p["mix"] and di - m["day"] >= p["start"]:       # newcomers reach each email only after its delay
                share_new = 1 - 1 / p["mix"][0]
            slide = 1.0
            if p["slide"] is not None and di >= p["start"]:
                slide = 1 - (1 - p["slide"]) * min(1.0, (di - p["start"]) / max(1, DAYS - 1 - p["start"]))
            c_rate = T["click"] * MSG_SHAPE[i] * (factor(p["click"], i) if on else 1.0) * slide
            o_rate = T["order"] * MSG_SHAPE[i] * (factor(p["order"], i) if on else 1.0) * slide
            o_rate *= (1 - share_new) + share_new * (p["mix"][1] if p["mix"] else 1)
            if p["bf"]:
                bfd = (dd - (today - timedelta(days=12))).days
                if -2 <= bfd <= 4:
                    o_rate *= p["bf_order"]; c_rate *= 1.15
            op = min(0.95, T["open"] * (factor(p["open"], i) if on else 1.0))
            u_rate = T["unsub"] * (factor(p["unsub"], i) if on else 1.0)
            opens = int(nrs.binomial(delivered, op)) if delivered else 0
            clicks = int(nrs.binomial(delivered, min(0.9, c_rate))) if delivered else 0
            orders = int(nrs.binomial(delivered, min(0.9, o_rate))) if delivered else 0
            aov = T["aov"] * (factor(p["aov"], i) if on else 1.0)
            sd = STAGES[stage]["aov_sd"]
            rev = float(sum(nrs.lognormal(math.log(aov) - sd ** 2 / 2, sd, orders))) if orders else 0.0
            if p["big_order"] == di and i == 0:
                orders += 1; rev += est_week_rev * p["big_size"]
            unsubs = int(nrs.binomial(delivered, min(0.5, u_rate))) if delivered else 0
            o = out[m["id"]]
            o["delivered"].append(delivered); o["opens"].append(opens); o["clicks"].append(clicks)
            o["orders"].append(orders); o["revenue"].append(round(rev, 2)); o["unsubs"].append(unsubs)
    flow = rng.choice(NAMES[ftype])
    case = {"id": uuid.uuid4().hex[:10], "kind": kind, "seed": seed, "level": 1,
            "stage": stage, "stage_badge": STAGES[stage]["badge"], "stage_note": STAGES[stage]["note"],
            "flow": {"name": flow, "type": ftype, "messages": msgs},
            "today": today.isoformat(), "dates": [d.isoformat() for d in days],
            "entered": entered_series, "by_message": out}
    case["band"] = band(case)
    case["truth"] = truth(case, p, rng)
    r = weekly_revenue(case)
    pct_drop = round((1 - r[-1] / max(1, r[-2])) * 100)
    pool = SYMPTOMS[p["symptom"]]
    if p["symptom"] == "down" and pct_drop >= 12:
        pool = pool + SYMPTOMS["bf"]                 # the same "fell N%" message any real drop can send
    case["symptom"] = rng.choice(pool).format(flow=flow, pct=pct_drop)
    return case


# ---------------------------------------------------------------- numbers the screen and the grader share
def totals(case: dict) -> dict:
    keys = ("delivered", "opens", "clicks", "orders", "revenue", "unsubs")
    return {k: [sum(case["by_message"][m["id"]][k][d] for m in case["flow"]["messages"]) for d in range(DAYS)] for k in keys}


def weekly_revenue(case: dict) -> list[float]:
    r = totals(case)["revenue"]
    return [sum(r[i:i + 7]) for i in range(0, DAYS, 7)]


def rolling(xs: list[float], n: int = 7) -> list[float | None]:
    return [None if i < n - 1 else sum(xs[i - n + 1:i + 1]) for i in range(len(xs))]


def band(case: dict) -> dict:
    """Normal range for the 7-day revenue per recipient, from the first four weeks (mean ± 2 sd of the rolling
    values, widened by the chance noise a flow this size has)."""
    t = totals(case)
    rr, rd = rolling(t["revenue"]), rolling(t["delivered"])
    vals = [rr[i] / rd[i] for i in range(6, 28) if rd[i]]
    if not vals:
        return {"lo": 0, "hi": 0, "mid": 0}
    m = sum(vals) / len(vals)
    sd = (sum((v - m) ** 2 for v in vals) / len(vals)) ** 0.5
    return {"lo": max(0.0, m - 2.2 * sd), "hi": m + 2.2 * sd, "mid": m}


def week_rpr(case: dict, w: int) -> float:
    t = totals(case)
    a, b = w * 7, w * 7 + 7
    d = sum(t["delivered"][a:b])
    return sum(t["revenue"][a:b]) / d if d else 0.0


# ---------------------------------------------------------------- the answer key
def truth(case: dict, p: dict, rng: random.Random) -> dict:
    kind, msgs = case["kind"], case["flow"]["messages"]
    t = totals(case)
    base_rev_w = sum(t["revenue"][:28]) / 4
    last_rev = sum(t["revenue"][-7:])
    base_rpr = sum(t["revenue"][:28]) / max(1, sum(t["delivered"][:28]))
    last_del = sum(t["delivered"][-7:])
    msg = msgs[p["msg"]] if p.get("msg") is not None else None
    since = case["dates"][p["start"]] if p.get("start") is not None and kind not in ("mpp_opens", "opens_one") else None
    money = round(abs(base_rev_w - last_rev)) if kind in ("entries_drop", "delivery_drop", "entries_down", "email_stopped", "email_late") else round(abs(base_rpr * last_del - last_rev))
    money_alt = None                    # the same sum done on the one email (the email table has the numbers)
    if p.get("msg") is not None:
        d = case["by_message"][msgs[p["msg"]]["id"]]
        b_rpr = sum(d["revenue"][:28]) / max(1, sum(d["delivered"][:28]))
        money_alt = round(abs(b_rpr * sum(d["delivered"][-7:]) - sum(d["revenue"][-7:])))
        if kind in ("email_stopped", "email_late"):      # a people move on one email: what that email used to bring in a week
            money_alt = round(abs(sum(d["revenue"][:28]) / 4 - sum(d["revenue"][-7:])))
    K = {
        "entries_drop": ("problem", "flow", "entered", ["fix_today", "escalate"]),
        "delivery_drop": ("problem", "flow", "delivered", ["escalate", "fix_today"]),
        "click_drop_one": ("problem", msg and msg["id"], "clicks", ["fix_today"]),
        "conv_drop_all": ("problem", "flow", "orders", ["escalate", "fix_today"]),
        "conv_drop_one": ("problem", msg and msg["id"], "orders", ["fix_today"]),
        "aov_drop": ("problem", "flow", "order_size", ["escalate", "fix_today"]),
        "unsub_spike": ("problem", msg and msg["id"], "unsubs", ["fix_today", "test"]),
        "mpp_opens": ("nothing", None, "opens", ["leave", "watch"]),
        "opens_one": ("nothing", None, "opens", ["leave", "watch"]),
        "email_stopped": ("problem", msg and msg["id"], "delivered", ["fix_today"]),
        "email_late": ("problem", msg and msg["id"], "delivered", ["fix_today"]),
        "steady": ("nothing", None, None, ["watch", "leave"]), "noise_alarm": ("nothing", None, None, ["watch", "leave"]),
        "volume_up": ("nothing", "flow", "entered", ["watch", "leave"]), "entries_down": ("problem", "flow", "entered", ["escalate", "watch"]),
        "noise": ("nothing", None, None, ["watch", "leave"]),
        "black_friday": ("nothing", None, None, ["leave", "watch"]),
        "good_news": ("good", msg and msg["id"], "clicks", ["leave", "watch"]),
        "volume_mix": ("nothing", "flow", "entered", ["watch", "leave"]),
        "slow_slide": ("problem", "flow", "clicks", ["test"]),
        "big_order": ("nothing", None, "order_size", ["leave", "watch"]),
        "tracking_break": ("problem", "flow", "orders", ["escalate"]),
    }
    real, where, moved, actions = K[kind]
    if real == "nothing" and kind != "volume_mix":
        money = 0
    if kind == "volume_mix":
        money = 0
    if kind == "unsub_spike":
        money = 0
    nm = msg["name"] if msg else "the whole flow"
    bo = case["dates"][p["big_order"]] if p.get("big_order") is not None else ""
    fl = case["flow"]["name"]
    W = {   # what happened, in one paragraph, and the way an expert would walk it
        "entries_drop": (f"Fewer people entered {fl} from {since}. Every email's rates held, so revenue per recipient stayed in its normal range while total revenue fell. Something upstream stopped sending people in: the trigger metric, a Shopify integration hiccup, or a flow filter.",
                         ["Revenue per recipient is inside its normal range, but revenue fell: that's volume, not the email.", f"About ${money:,} a week.", "It starts before the emails: fewer people entered, so every email has fewer people to send to. An email sent weeks after entry still reaches people who entered before the drop, so it falls last.", f"Entries fell on {since}.", "Entered the flow is the part that moved. People stopped coming in.", "Fix it today: check the trigger and the integration. If it's Shopify's side, escalate."]),
        "delivery_drop": (f"From {since}, the same number of people entered {fl} but far fewer got the emails. That points to suppression (Smart Sending, a new filter or exclusion) or deliverability, not the content.",
                          ["Revenue fell well outside normal.", f"About ${money:,} a week.", "Before the emails: people entered, but fewer of them got each email.", f"Delivered dropped on {since} while entered held.", "Got the email moved, entered didn't.", "Escalate or fix today: check Smart Sending, suppression lists and sending health."]),
        "click_drop_one": (f"{nm} in {fl} lost most of its clicks from {since}, and its orders followed. The other emails are fine. That's a broken image, a dead link, or a rendering problem in that one email.",
                           ["Revenue per recipient fell below its range.", f"About ${money:,} a week.", f"Only {nm}: the message table shows it.", f"Its clicks dropped on {since}.", "Clicks moved first, orders followed.", f"Fix it today: open {nm}, check the links and images."]),
        "conv_drop_all": (f"From {since}, clicks on {fl} held steady but orders fell on every email. People still click, then don't buy: something after the click broke (site, checkout, an offer, pricing).",
                          ["Clearly below the normal range.", f"About ${money:,} a week.", "Every email: the whole flow.", f"Orders fell on {since}.", "Orders moved while clicks didn't: the problem is after the click.", "Escalate to the site or ecommerce owner, and check the offer today."]),
        "conv_drop_one": (f"{nm} in {fl} kept its clicks from {since} but stopped turning them into orders. The others are fine. Classic expired discount code, or a sold-out product the email still features.",
                          ["Revenue per recipient fell.", f"About ${money:,} a week.", f"Only {nm}.", f"From {since}.", "Orders moved, clicks held: after the click, in that one email.", f"Fix it today: check the code and products in {nm}."]),
        "aov_drop": (f"From {since}, {fl} got the same orders but smaller ones. Something changed what people buy: a deeper discount, a cheaper hero product, or a free-shipping threshold.",
                     ["Below normal.", f"About ${money:,} a week.", "Whole flow.", f"From {since}.", "Order size moved, order count didn't.", "Escalate: find out who changed the offer or the featured product, then decide."]),
        "unsub_spike": (f"{nm} in {fl} started losing several times more subscribers from {since}. Revenue barely moved, which is why it hides. The cost is the list: those people never get another email.",
                        ["Real, even though revenue looks fine.", "Little revenue at stake now; the cost is lost subscribers.", f"Only {nm}.", f"From {since}.", "Unsubscribes moved.", f"Fix it today (or test a gentler version): what changed in {nm}'s content, frequency or audience?"]),
        "mpp_opens": (f"Opens on {fl} jumped from {since}, but clicks, orders and revenue didn't move. Apple Mail Privacy Protection (and bot opens) inflate opens, so an open jump on its own isn't a result.",
                      ["Not real for the business: nothing that pays moved.", "Nothing at stake.", "-", "-", "Only opens moved.", "Leave it. Judge emails on clicks and orders, not opens."]),
        "steady": (f"{fl} is normal.", ["Inside its range.", "Nothing.", "-", "-", "Nothing moved.", "Leave it."]),
        "noise_alarm": (f"{fl} is small and dipped just under its range by chance.", ["Chance on a small flow.", "Nothing.", "-", "-", "Nothing real moved.", "Watch it."]),
        "volume_up": (f"More people entered {fl}; each email earned as usual.", ["Nothing broke.", "Nothing lost.", "Whole flow.", f"From {since}.", "Entered rose.", "Watch it."]),
        "entries_down": (f"Fewer people entered {fl} from {since}.", ["Real.", f"About ${money:,} a week.", "Whole flow.", f"From {since}.", "Entered fell.", "Escalate to whoever owns traffic."]),
        "opens_one": (f"{nm} in {fl} got many more opens, but no more clicks or orders. A new subject line that earns opens without clicks isn't a win yet.",
                      ["Not real for the business: nothing that pays moved.", "Nothing at stake.", "-", "-", "Only opens moved.", "Leave it, or test a subject line that earns clicks."]),
        "email_stopped": (f"{nm} in {fl} stopped sending on {since}. The other emails went out as usual and each person spent what they always do, so revenue per recipient barely moved while total revenue fell by about what {nm} used to bring in.",
                          ["Real: revenue fell while each person spent the same.", f"About ${money:,} a week.", f"Only {nm}: its 'Got it' column fell to zero.", f"From {since}.", "Got the email moved, on one email.", f"Fix it today: turn {nm} back on, or put its timing back."]),
        "email_late": (f"From {since}, {nm} in {fl} stopped going out: people are now waiting far longer before it. The emails before it carried on.",
                       ["Real: revenue fell while each person spent the same.", f"About ${money:,} a week.", f"Only {nm}.", f"From {since}.", "Got the email moved, on one email.", f"Fix it today: put the wait before {nm} back."]),
        "noise": (f"{fl} is small, so its weekly numbers wobble. Last week is lower, but it's inside the normal range of the four quiet weeks before.",
                  ["Inside the shaded range: not real.", "Nothing at stake yet.", "-", "-", "Nothing stands out.", "Watch it another week. Act if it leaves the range."]),
        "black_friday": (f"The week before last was Black Friday, when {fl} had far more people and higher order rates. Comparing this week with that one makes a normal week look like a crash.",
                         ["Not real: the comparison week was Black Friday.", "Nothing at stake.", "-", "-", "Nothing moved against the normal range.", "Leave it. Compare with the quiet weeks (or the same week last year), never with Black Friday."]),
        "good_news": (f"{nm} in {fl} started earning more from {since}: more clicks and orders. Real, and good. The job now is finding out what changed so it can be kept and copied.",
                      ["Real, and above the range.", f"About ${money:,} a week gained.", f"{nm}.", f"From {since}.", "Clicks and orders rose.", "Leave it running, and find out what changed (Changes page at Level 2)."]),
        "volume_mix": (f"Many more people entered {fl} from {since} (a promotion or a new signup source). They buy less, so revenue per recipient fell, but revenue held or rose. Nothing broke.",
                       ["Rate fell, but nothing broke: revenue held.", "Nothing lost.", "Before the emails: who entered changed.", f"From {since}.", "Entered jumped; the newcomers buy less.", "Watch it. If the new source stays, the normal range needs resetting."]),
        "slow_slide": (f"Clicks on {fl} have been sliding slowly since about {since}, with orders following. No single break: fatigue, stale creative, or inbox placement eroding.",
                       ["Real: it's now below the range.", f"About ${money:,} a week.", "Whole flow.", f"A slow slide from about {since}.", "Clicks slid, orders followed.", "Test fresh creative and subject lines. Check deliverability if it continues."]),
        "big_order": (f"One unusually large order landed on {bo} and spiked {fl}'s revenue and order size for that week. One order isn't a trend.",
                      ["Not real: one order.", "Nothing at stake.", "-", "-", "Order size spiked on one day.", "Leave it (if it's a trade buyer, tag them so they don't distort reports)."]),
        "tracking_break": (f"From {since}, orders on {fl} dropped to almost zero on every email while clicks stayed normal. People don't stop buying overnight: the order tracking (Placed Order event or integration) broke.",
                           ["Real, but probably measurement, not sales.", f"About ${money:,} a week of revenue no longer counted.", "Whole flow.", f"From {since}.", "Orders vanished, clicks didn't.", "Escalate to whoever owns the Shopify integration. Check other flows too."]),
    }
    story, path = W[kind]
    hints = {
        "entries_drop": ["Revenue fell. Did each email get worse, or did fewer people get them?", "Open Entered the flow.", f"Entries dropped on {since} and rates held."],
        "delivery_drop": ["Same number of people entering... are they all getting the emails?", "Compare Entered the flow with Got the email.", f"Delivered fell on {since}."],
        "click_drop_one": ["Is it every email, or just one?", "Open the message table.", f"{nm}'s clicks dropped on {since}."],
        "conv_drop_all": ["People still click. What happens after?", "Compare Clicks with Orders.", f"Orders fell on {since}, clicks held."],
        "conv_drop_one": ["Clicks or orders? And which email?", "Message table, orders column.", f"{nm}'s orders fell on {since}."],
        "aov_drop": ["Fewer orders, or smaller ones?", "Open Order size.", f"Order size fell on {since}."],
        "unsub_spike": ["Revenue looks fine. What else could be 'weird'?", "Open Unsubscribes.", f"{nm}'s unsubscribes jumped on {since}."],
        "mpp_opens": ["Did anything that makes money move?", "Compare Opens with Clicks and Orders.", "Only opens moved: Apple privacy."],
        "steady": ["-", "-", "-"], "noise_alarm": ["-", "-", "-"], "volume_up": ["-", "-", "-"], "entries_down": ["-", "-", "-"],
        "opens_one": ["Did anything that makes money move?", "Compare Opens with Clicks and Orders in the email table.", "Only one email's opens moved."],
        "email_stopped": ["Revenue fell. Did each person spend less, or did fewer emails go out?", "Open the email table: the Got it column.", f"{nm} stopped sending on {since}."],
        "email_late": ["Revenue fell. Did each person spend less, or did fewer emails go out?", "Open the email table: the Got it column.", f"{nm} stopped going out on {since}."],
        "noise": ["Is last week outside the shaded range?", "Look at the range on the main chart and how many people get this flow.", "Inside the range on a small flow: noise."],
        "black_friday": ["What was the week you're comparing against?", "Look at the main chart two weeks back.", "The comparison week was Black Friday."],
        "good_news": ["Up is a change too. Where did it come from?", "Message table.", f"{nm} improved on {since}."],
        "volume_mix": ["The rate fell. Did revenue?", "Open Entered the flow, then switch the main chart to Revenue.", "More people, lower rate, revenue fine."],
        "slow_slide": ["Is it a step, or a slope?", "Open Clicks and look at the whole 8 weeks.", f"A slow slide from about {since}."],
        "big_order": ["Is it the whole week, or one day?", "Open Order size.", "One giant order on one day."],
        "tracking_break": ["Can orders really vanish while clicks don't?", "Compare Clicks with Orders.", "Orders near zero, clicks normal: tracking broke."],
    }[kind]
    moved_ok = {"good_news": ["clicks", "orders"], "slow_slide": ["clicks", "orders"]}.get(kind, [moved])
    return {"kind": kind, "base": kind, "_msg": msg["id"] if msg else None, "real": real, "where": where, "moved": moved, "moved_ok": moved_ok, "since": since, "money_alt": money_alt if real != "nothing" else None,
            "lesson": LESSONS.get(kind, ("", "")),
            "since_tol": 21 if kind == "slow_slide" else 2, "money": money, "actions": actions,
            "story": story, "expert": path, "hints": hints}


def public(case: dict) -> dict:
    if case.get("program"):
        strip = lambda f: {k: v for k, v in f.items() if k not in ("truth", "seed", "kind")}
        return {k: v for k, v in case.items() if k not in ("truth", "seed", "kind", "flows")} | {"flows": [strip(f) for f in case["flows"]], "hints_count": 4}
    return {k: v for k, v in case.items() if k not in ("truth", "seed", "kind")} | {"hints_count": 3}


# ---------------------------------------------------------------- grading
def grade(case: dict, report: dict, minutes: float, events: list[dict] | None = None) -> dict:
    """Score the six answers. A step that doesn't apply to this case (no date for a false alarm) is shown but not
    counted, so false alarms can't pad the score. Solved = "is it real" and "what to do" right, at most one other miss.
    The search is graded too: did you open the place that proves it, or get there by guessing?"""
    t = case["truth"]
    steps = []

    def add(key, ok, said, right, why, na=False):
        raw = {"real": "real", "big": "big", "where": "where", "since": "since", "moved": "moved", "action": "action"}[key]
        steps.append({"step": key, "ok": ok, "said": said, "right": right, "why": why, "na": na, "said_raw": report.get(raw)})

    add("real", report.get("real") == t["real"], REAL.get(report.get("real"), "—"), REAL[t["real"]], t["expert"][0])
    g = float(report.get("big") or 0)
    if t["real"] == "nothing" or t["money"] == 0:
        add("big", g <= max(300, 0.1 * t["money"]), f"${g:,.0f}/wk", "$0/wk", t["expert"][1])
    else:
        near = lambda m: m and abs(g - m) <= max(250, 0.35 * m)
        add("big", bool(near(t["money"]) or near(t.get("money_alt"))), f"${g:,.0f}/wk",
            f"${t['money']:,.0f}/wk" + (f" (or ${t['money_alt']:,.0f} counting just that email)" if t.get("money_alt") else ""), t["expert"][1])
    if t["where"] is None:
        add("where", True, _where(case, report.get("where")), "doesn't apply", t["expert"][2], na=True)
    else:
        ok_where = t.get("where_ok") or [t["where"]]
        shown = ok_where
        if t["where"] == "flow" and not case.get("program"):
            ok_where = WHERE_FLOW.get(t["kind"], ["every"]) + ["flow"]
            shown = ok_where[:-1] if asks_diagnosis(case) else ["flow"]
        add("where", report.get("where") in ok_where, _where(case, report.get("where")), " or ".join(_where(case, w) for w in shown), t["expert"][2])
    s_ = report.get("since") or ""
    if t["since"] is None and t.get("since_none_counts"):     # Level 6: "it's been like this all along" is the answer
        add("since", s_ in ("", "none"), "doesn't apply" if s_ in ("", "none") else s_, "doesn't apply (all along)", t["expert"][3])
    elif t["since"] is None:
        add("since", True, "doesn't apply" if s_ in ("", "none") else s_, "doesn't apply", t["expert"][3], na=True)
    else:
        ok = s_ not in ("", "none") and abs((date.fromisoformat(s_) - date.fromisoformat(t["since"])).days) <= t["since_tol"]
        add("since", ok, s_ if s_ not in ("", "none") else "—", t["since"], t["expert"][3])
    if t["moved"] is None:
        add("moved", report.get("moved") in (None, "", "nothing"), TILE_LABEL.get(report.get("moved"), "Nothing"), "Nothing", t["expert"][4])
    else:
        ok_moves = t.get("moved_ok") or [t["moved"]]
        add("moved", report.get("moved") in ok_moves, TILE_LABEL.get(report.get("moved"), "—"), " or ".join(TILE_LABEL.get(m, "Nothing") for m in ok_moves), t["expert"][4])
    if case.get("changes"):
        said = report.get("cause") or ""
        lab = lambda cid: "None of these" if cid == "none" else next((f"{c['date']}: {c['what']}" for c in case["changes"] if c["id"] == cid), "—")
        steps.append({"step": "cause", "ok": said in t["cause_ok"], "said": lab(said) if said else "—",
                      "right": " or ".join(lab(x) for x in t["cause_ok"]), "why": t["cause_why"], "na": False, "said_raw": said})
    dg = report.get("diag_grade")
    if dg is not None:                         # Level 1: his own diagnosis, read by lf_diagnose. Kept under "action" for the skill tracker
        err = bool(dg.get("error") or dg.get("self"))
        steps.append({"step": "action", "ok": err or bool(dg.get("cause_ok") and dg.get("fix_ok")), "said": report.get("diag") or "—",
                      "right": dg.get("explain") or t["story"], "na": err, "said_raw": dg.get("action"),
                      "why": f"Couldn't read your line ({dg['error']}). It doesn't count either way." if dg.get("error") else dg.get("feedback", ""),
                      "diag": {"cause": bool(dg.get("cause_ok")), "fix": bool(dg.get("fix_ok"))}})
    else:
        add("action", report.get("action") in t["actions"], ACTIONS.get(report.get("action"), "—"), " or ".join(ACTIONS[a] for a in t["actions"]), t["expert"][5])
    counted = [x for x in steps if not x["na"]]
    score = sum(x["ok"] for x in counted)
    misses = [x for x in counted if not x["ok"] and x["step"] not in ("real", "action")]
    by = {x["step"]: x for x in steps}
    solved = by["real"]["ok"] and by["action"]["ok"] and len(misses) <= 1 and by.get("cause", {"ok": True})["ok"]
    # the search: where the proof was, and whether it was opened before the report went in
    opened = [e["what"][5:] for e in (events or []) if e.get("type") == "spend" and str(e.get("what", "")).startswith("open ")]
    # the proof: for one email, the email table (it shows that email's clicks and orders); otherwise the tile that moved
    if t["where"] not in (None, "flow"):
        evidence, alts = ["messages"], [["messages"]]
    elif t["moved"]:
        alts = [[m] for m in (t.get("moved_ok") or [t["moved"]])]
        evidence = alts[0]
    else:
        evidence, alts = [], []
    if case.get("program"):
        mv = t["moved"]
        if t["where"] == "program":
            flows_seen = {o.split(":")[0] for o in opened if ":" in o and o.endswith(":" + str(mv))}
            alts = [["registry"]] if len(flows_seen) >= 2 else [["registry", "two flows' " + str(mv)]]
        elif t["where"] == "cohort":            # Level 6: a cohort's proof is the Cohorts screen (added below)
            alts = [[]]
        elif t["where"]:
            alts = [["registry", "flow:" + t["where"]] + ([t["where"] + ":" + mv] if mv else [])]
        else:
            alts = [["registry"]]
        evidence = alts[0]
    if t.get("evidence_extra"):                # Level 4: some cases are only provable in Postmaster or Bounce details
        alts = [a + t["evidence_extra"] for a in alts]
        evidence = alts[0]
    if case.get("changes"):                    # at Level 2 the change log is part of the proof
        alts = [a + ["changes"] for a in alts] or [["changes"]]
        evidence = alts[0]
    found = any(all(x in opened for x in a) for a in alts) if alts else True
    lucky = solved and not found
    solved = solved and found            # right answers without opening the proof is a guess: the case comes back
    def label(k):
        if case.get("program"):
            if k == "registry":
                return "the provider table" if case.get("providers") else "the Registry"
            if k == "postmaster":
                return "Postmaster Tools"
            if k == "bounce_details":
                return "Bounce details"
            if k in ("skipped", "credit", "pressure", "timing", "cohorts"):
                return {"skipped": "Skipped", "credit": "the Credit split", "pressure": "Pressure", "timing": "Timing", "cohorts": "Cohorts"}[k]
            if k == "changes":
                return "the sending log" if case.get("providers") else "Changes"
            if k == "today":
                return "Today"
            if k.startswith("flow:"):
                return _where(case, k[5:])
            if ":" in k:
                f, tile = k.split(":", 1)
                return f"{TILE_LABEL.get(tile, tile)} in {_where(case, f)}"
            if k.startswith("two flows"):
                return f"{TILE_LABEL.get(k.split()[-1], k.split()[-1])} in two or more {'providers' if case.get('providers') else 'flows'}"
        return "the email table" if k == "messages" else "Changes" if k == "changes" else TILE_LABEL.get(k, k)
    search = {"opened": [label(k) for k in opened], "evidence": [label(k) for k in evidence], "found": found,
              "note": ("You opened the place that proves it." if found else
                       f"The proof was in {' and '.join(label(k) for k in evidence if k not in opened)}, which you didn't open. "
                       + ("Your answers were right, but without the proof it was a guess, so this case type comes back." if lucky else ""))
              if evidence else "Nothing to find here: the job was not to overreact."}
    for x in steps:
        if not x["ok"] and not x["na"] and "diag" not in x:
            x["coach"] = TU.respond(case, x, TU.classify(case, x, opened), opened)
    return {"steps": steps, "score": score, "of": len(counted), "solved": solved, "minutes": minutes, "over_time": minutes > CLOCK,
            "standup_ready": solved and minutes <= CLOCK, "search": search, "lesson": t.get("lesson"), "why": report.get("why", ""), "story": t["story"], "expert": t["expert"], "kind": t["kind"]}


def _where(case, w):
    if w in (None, ""):
        return "—"
    if case.get("program"):
        whole = "Every provider" if case.get("providers") else "The whole program"
        if w == "cohort":
            return "New customers (one cohort)"
        return whole if w == "program" else next((f["flow"]["name"] for f in case["flows"] if f["fid"] == w), w)
    if w in WHERE_LABEL:
        return WHERE_LABEL[w]
    m = next((m for m in case["flow"]["messages"] if m["id"] == w), None)
    return m["name"] if m else w


# ---------------------------------------------------------------- sessions, progress, voice
def sdir(sid: str) -> Path:
    return ROOT / "sessions" / sid


def new_session(level: int, kind: str | None = None, stage: str | None = None) -> dict:
    prog = progress()
    kind = kind or ("conv_drop_one" if level == 0 else next_kind(prog, level))
    stage = stage if stage in STAGES else stage_for(prog.get("mastery") or {}, kind)
    case = worked_case() if level == 0 else make_case(kind, stage=stage)
    case["level"] = 0 if level == 0 else level_of(kind)
    sid = time.strftime("%Y%m%d-%H%M%S-") + case["id"][:4]
    d = sdir(sid); d.mkdir(parents=True, exist_ok=True)
    (d / "case.json").write_text(json.dumps(case))
    log(sid, "start", {"kind_hidden": True, "symptom": case["symptom"]})
    return {"session": sid, "case": public(case), "clock": CLOCK, "cost": COST, "tiles": tiles_for(case["level"]), "actions": ACTIONS, "real": REAL,
            "progress": prog}


def worked_case() -> dict:
    """Level 0's case: an obvious one-email order drop on a busy flow, the same every time."""
    for sd in range(101, 400):
        c = make_case("conv_drop_one", sd)
        if c["flow"]["type"] in ("cart", "welcome") and week_rpr(c, 7) < c["band"]["lo"] * 0.9 and c["truth"]["money"] > 1500:
            return c
    return make_case("conv_drop_one", 101)


def load_case(sid: str) -> dict:
    return json.loads((sdir(sid) / "case.json").read_text())


def log(sid: str, kind: str, detail: dict | None = None) -> None:
    d = sdir(sid); d.mkdir(parents=True, exist_ok=True)
    with (d / "events.jsonl").open("a") as f:
        f.write(json.dumps({"at": time.time(), "type": kind, **(detail or {})}) + "\n")


def hint(sid: str, n: int) -> dict:
    """Item n of the case's hint pathway (hint, scaffold, hint, bottom-out). The scaffold's answer stays on the server."""
    c = load_case(sid)
    items = TU.pathway(c)
    it = dict(items[max(0, min(len(items) - 1, n))])
    log(sid, "hint", {"n": n, "type": it["type"]})
    return {k: v for k, v in it.items() if k not in ("answer", "explain")} | {"n": n, "last": n >= len(items) - 1}


def scaffold(sid: str, n: int, answer: str) -> dict:
    c = load_case(sid)
    it = TU.pathway(c)[n]
    ok = answer == it.get("answer")
    log(sid, "scaffold", {"n": n, "answer": answer, "ok": ok})
    return {"ok": ok, "explain": it.get("explain", "")}


def submit(sid: str, report: dict, minutes: float) -> dict:
    c = load_case(sid)
    try:
        events = [json.loads(l) for l in (sdir(sid) / "events.jsonl").read_text().splitlines()]
    except Exception:
        events = []
    if asks_diagnosis(c) and "diag" in report:
        import lf_diagnose as DG
        report = {**report, "diag": str(report.get("diag") or "")[:600]}
        report["diag_grade"] = DG.grade(c, report["diag"])
    g = grade(c, report, minutes, events)
    skills = []
    if c.get("level", 1) in LEVELS:
        record(c["truth"]["kind"], g["solved"], c["level"])
        p = progress()
        n_hints = sum(1 for e in events if e.get("type") == "hint")
        skills = TU.observe(p, c, g, TU.hinted_steps(n_hints), fitted_params())
        save_progress(p)
    g["skills"] = skills
    (sdir(sid) / "report.json").write_text(json.dumps({"report": report, "grade": g}))
    log(sid, "submit", {"report": report, "score": g["score"]})
    t = c["truth"]       # the report is in, so the answer can be drawn on the charts for the review
    return g | {"progress": progress(), "key": {"since": t["since"], "where": t["where"], "moved": t["moved"], "moved_ok": t.get("moved_ok") or [t["moved"]],
                                                "cause": t.get("cause"), "cohort_month": t.get("cohort_month")}}


def fitted_params() -> dict | None:
    """Skill parameters fitted with pyBKT from Brent's own history (lf_fit_bkt.py), once there is enough of it."""
    try:
        return json.loads((ROOT / "bkt_params.json").read_text()).get("skills")
    except Exception:
        return None


# PROFILE: the office game (games/office) plays Lifecycle Files steps on its own save, so its days start from step 1
# and never touch the standalone progress. The server sets it per request from ?profile= (office or office-dev).
import contextvars  # noqa: E402
PROFILE = contextvars.ContextVar("lf_profile", default="")
PROFILES = ("office", "office-dev")


def progress_path() -> Path:
    prof = PROFILE.get()
    return ROOT / (f"progress-{prof}.json" if prof in PROFILES else "progress.json")


LEVEL_TYPES = {1: None, 2: LV2.TYPES}        # filled for 1 below, once its tiers exist
LEVEL_NAMES = {1: FILE_NAMES, 2: LV2.FILE_NAMES, 3: LV3.FILE_NAMES, 4: LV4.FILE_NAMES, 5: LV5.FILE_NAMES, 6: LV6.FILE_NAMES}
LEVEL_LESSONS = {1: LESSONS, 2: LV2.LESSONS, 3: LV3.LESSONS, 4: LV4.LESSONS, 5: LV5.LESSONS, 6: LV6.LESSONS}
LEVEL_KINDS = {1: lambda: CASE_TYPES, 2: lambda: LV2.TYPES, 3: lambda: LV3.TYPES, 4: lambda: LV4.TYPES, 5: lambda: LV5.TYPES, 6: lambda: LV6.TYPES}
LEVELS = (1, 2, 3, 4, 5, 6)


def level_of(kind: str) -> int:
    return 6 if kind in LV6.TYPES else 5 if kind in LV5.TYPES else 4 if kind in LV4.TYPES else 3 if kind in LV3.TYPES else 2 if kind in LV2.TYPES else 1


def level_tiers(level: int) -> list[list[str]]:
    return {1: TIERS, 2: LV2.TIERS, 3: LV3.TIERS, 4: LV4.TIERS, 5: LV5.TIERS, 6: LV6.TIERS}[level]


def _block():
    return {"solved": [], "review": [], "played": 0, "since_review": 0}


def progress() -> dict:
    """One record per level (solved, review queue, played). Skill mastery and answers are shared across levels."""
    try:
        p = json.loads(progress_path().read_text())
    except Exception:
        p = {}
    p.setdefault("level0", {"done": False, "drill_best": 0})
    for lv in LEVELS:
        p.setdefault(f"level{lv}", _block())
    L1 = p["level1"]
    if "mastery" not in p:                     # older files kept these under Level 1
        p["mastery"] = L1.pop("mastery", None) or {}
        p["obs"] = L1.pop("obs", [])
    p.setdefault("obs", [])
    skills = [{"key": k, "label": v, "mastery": p["mastery"].get(k, TU.DEFAULT["prior"])} for k, v in TU.SKILLS.items()]
    p["skills"] = skills
    for lv in LEVELS:
        L = p[f"level{lv}"]
        L["skills"] = [x for x in skills if x["key"] in level_skills(lv)]
        L["mastery"] = p["mastery"]
        L["done"] = level_done(p, lv)
        L["board"] = [{"kind": k, "tier": i + 1, "title": LEVEL_LESSONS[lv][k][1], "name": LEVEL_NAMES[lv][k], "solved": k in L["solved"],
                       "open": k in unlocked(L, lv), "revisit": any(r["kind"] == k for r in L["review"])}
                      for i, t in enumerate(level_tiers(lv)) for k in t]
    p["level2"]["unlocked"] = p["level1"]["done"]
    p["level3"]["unlocked"] = p["level2"]["done"]
    p["level4"]["unlocked"] = p["level3"]["done"]
    p["level5"]["unlocked"] = p["level4"]["done"]
    p["level6"]["unlocked"] = p["level5"]["done"]
    return p


def level_skills(level: int) -> set[str]:
    return {k for kind in LEVEL_KINDS[level]() for k in TU.kind_skills(kind)}


def save_progress(p: dict) -> None:
    p = {k: v for k, v in p.items() if k != "skills"}
    for lv in LEVELS:                          # derived fields are rebuilt on every read
        if f"level{lv}" in p:
            p[f"level{lv}"] = {k: v for k, v in p[f"level{lv}"].items() if k not in ("skills", "mastery", "done", "board")}
    progress_path().parent.mkdir(parents=True, exist_ok=True)
    progress_path().write_text(json.dumps(p, indent=1))


def record(kind: str, solved: bool, level: int | None = None) -> None:
    level = level or level_of(kind)
    p = progress(); L = p[f"level{level}"]
    L["played"] += 1
    L["review"] = [r for r in L["review"] if r["kind"] != kind or not solved]
    if solved and kind not in L["solved"]:
        L["solved"].append(kind)
    if not solved:
        L["review"].append({"kind": kind, "due": L["played"] + 2})      # back two cases later, new numbers
    save_progress(p)


TIERS = [   # easiest first: one obvious branch moved, then subtler ones, then the traps
    ["entries_drop", "conv_drop_all", "noise", "mpp_opens", "click_drop_one"],
    ["delivery_drop", "conv_drop_one", "aov_drop", "good_news", "black_friday"],
    ["unsub_spike", "volume_mix", "slow_slide", "big_order", "tracking_break"],
]


def unlocked(L: dict, level: int = 1) -> list[str]:
    """Tier 1 is open from the start. The next tier opens when every type in this one is solved once."""
    out = []
    for tier in level_tiers(level):
        out += tier
        if not all(k in L["solved"] for k in tier):
            break
    return out


def next_kind(p: dict, level: int = 1) -> str:
    """Misses due back first. Otherwise OATutor's rule over the unlocked case types: the one whose skills are least
    mastered, still under 0.85."""
    L = p.get(f"level{level}") or _block()
    due = [r for r in L["review"] if r["due"] <= L["played"]]
    if due:
        return due[0]["kind"]
    m = p.get("mastery") or L.get("mastery") or {k: TU.DEFAULT["prior"] for k in TU.SKILLS}
    waiting = {r["kind"] for r in L["review"]}
    pool = [k for k in unlocked(L, level) if k not in waiting] or unlocked(L, level)
    fresh = [k for k in pool if k not in L["solved"]]
    return TU.pick(fresh or pool, m)


def level_done(p: dict, level: int = 1) -> bool:
    L = p.get(f"level{level}") or _block()
    m = p.get("mastery") or L.get("mastery") or {}
    kinds = LEVEL_KINDS[level]()
    return all(k in L["solved"] for k in kinds) and all(m.get(k, 0) >= TU.MASTERED for k in level_skills(level))


if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--sample", default="conv_drop_one"); ap.add_argument("--seed", type=int, default=7)
    a = ap.parse_args()
    c = make_case(a.sample, a.seed)
    print(c["symptom"]); print(c["flow"]["name"], [m["day"] for m in c["flow"]["messages"]], "today", c["today"])
    print("weekly revenue", [round(x) for x in weekly_revenue(c)])
    print("weekly rpr", [round(week_rpr(c, w), 2) for w in range(8)], "band", {k: round(v, 2) for k, v in c["band"].items()})
    print(json.dumps({k: v for k, v in c["truth"].items() if k not in ("story", "expert")}, indent=1))
