"""Lifecycle Files, Level 6: Purchase timing. Each case is a five-flow program (welcome, cart, post-purchase cross-sell,
burr replacement reminder, winback) plus two new screens.

Timing: the repurchase curve (share of first-time buyers who bought again by day N), its median and mean, and each timed
flow's send day against its window. Cohorts: the last 12 first-order months, their 30/60/90-day repurchase (blank until a
cohort has had that long), the same month last year, and how each cohort came in (discount share, first product).

What the simulation encodes (sources in games/lifecycle-files/docs/DESIGN.md, "Level 6"):
  - Gaps between orders are skewed: a lognormal with a long tail, so the mean sits well after the median.
  - Windows (Repeat Customer Insights' rules of thumb): a reminder or cross-sell at 80-95% of its gap, win-back 90-120%.
  - A timed email earns more the closer it lands to when people are ready. The fit curve is our assumption.
  - 90-day repurchase for durables: 10-15% typical (Lifetimely). Discount-led and one-time-product cohorts come back less.
"""
from __future__ import annotations
import math
import random
from datetime import date, timedelta

import numpy as np

STREAMS = [   # fid, name, (open, click, order, aov, unsub), weekly entries
    ("welcome", "Welcome Series", (0.45, 0.065, 0.035, 165, 0.004), (6000, 15000)),
    ("cart", "Abandoned Cart", (0.50, 0.060, 0.045, 150, 0.003), (9000, 22000)),
    ("cross_sell", "Post-Purchase Cross-sell", (0.50, 0.051, 0.016, 120, 0.002), (6000, 14000)),
    ("reminder", "Burr Replacement Reminder", (0.48, 0.045, 0.020, 220, 0.002), (3000, 6000)),
    ("winback", "Winback", (0.35, 0.028, 0.009, 140, 0.005), (6000, 12000)),
]
FIDS = [s[0] for s in STREAMS]
TIMED = {"cross_sell": (0.80, 0.95), "reminder": (0.80, 0.95), "winback": (0.90, 1.20)}   # window, as a share of the gap
TIERS = [
    ["winback_too_late", "cross_sell_too_early", "promo_cohort", "censored_cohort", "bf_cohort"],
    ["delay_shortened", "winback_moved_good", "first_product_shift", "reminder_too_early", "small_cohort"],
    ["timed_to_average", "seasonal_gap", "winback_trigger_broke", "cross_sell_swap_good", "in_window_noise"],
]
TYPES = [k for t in TIERS for k in t]
NOTHING = {"censored_cohort", "bf_cohort", "first_product_shift", "small_cohort", "seasonal_gap", "in_window_noise"}
STATIC = {"winback_too_late", "cross_sell_too_early", "timed_to_average"}       # outside the window all along: no start date
COHORT = {"promo_cohort", "censored_cohort", "bf_cohort", "first_product_shift", "small_cohort", "seasonal_gap"}
SKILLS = {
    "winback_too_late": ["timing_window"], "cross_sell_too_early": ["timing_window"], "promo_cohort": ["cohort_mix"],
    "censored_cohort": ["censoring"], "bf_cohort": ["baseline"], "delay_shortened": ["timing_window"],
    "winback_moved_good": ["timing_window"], "first_product_shift": ["cohort_mix"], "reminder_too_early": ["timing_window"],
    "small_cohort": ["signal"], "timed_to_average": ["median_not_mean", "timing_window"], "seasonal_gap": ["baseline"],
    "winback_trigger_broke": ["volume_rate"], "cross_sell_swap_good": ["dollars_not_percent"], "in_window_noise": ["timing_window"],
}
FILE_NAMES = {
    "winback_too_late": "Too Little, Too Late", "cross_sell_too_early": "Not Ready Yet", "promo_cohort": "The Bargain Hunters",
    "censored_cohort": "Not Done Yet", "bf_cohort": "November Again", "delay_shortened": "Five Days",
    "winback_moved_good": "Right on Time", "first_product_shift": "The Mug Effect", "reminder_too_early": "Burrs Last a Year",
    "small_cohort": "Eighty People", "timed_to_average": "The Average Lies", "seasonal_gap": "Summer Hours",
    "winback_trigger_broke": "Nobody Comes Back", "cross_sell_swap_good": "The Right Next Thing", "in_window_noise": "Right Where It Should Be",
}
LESSONS = {
    "winback_too_late": ("A win-back that lands long after people usually come back reaches the ones who are already gone. Nothing moved, so the chart can't date it: test the send day.", "send timing"),
    "cross_sell_too_early": ("A cross-sell three days after the order lands before anyone is ready to buy again. Time it to the gap to the next purchase.", "send timing"),
    "promo_cohort": ("A month that came in on a big discount comes back less. That's the acquisition mix, not the flows: raise it with whoever owns promotions.", "cohort analysis"),
    "censored_cohort": ("A cohort that hasn't had 90 days has no 90-day rate yet. Read only the full cells.", "censoring"),
    "bf_cohort": ("Black Friday buyers come back less every year. Compare a cohort with the same month last year.", "seasonality"),
    "delay_shortened": ("Cutting the cross-sell delay moved it out of its window, and its orders fell from that day. Put it back.", "send timing"),
    "winback_moved_good": ("The win-back moved into its window after a test, and it earns more. Keep it, and copy the method.", "send timing"),
    "first_product_shift": ("When a one-time product becomes the top first purchase, repeat rates fall without anything breaking. Compare like with like.", "mix shift"),
    "reminder_too_early": ("A burr replacement reminder at four months, for burrs people replace after about eleven, annoys more than it sells.", "send timing"),
    "small_cohort": ("A cohort of eighty customers swings wildly by chance. Read the label, not the percent.", "small samples"),
    "timed_to_average": ("The average gap is pulled late by a few slow returners. Time windows to the median, the day half the returners are back.", "median vs mean"),
    "seasonal_gap": ("Summer buyers come back slower every year. The same month last year says it's the season.", "seasonality"),
    "winback_trigger_broke": ("Fewer people entered the win-back from the day its trigger changed. A flow that stops firing looks like customers stopped returning.", "trigger health"),
    "cross_sell_swap_good": ("Featuring what people actually buy next lifted the cross-sell. Find out why it worked so you can keep it.", "learning from wins"),
    "in_window_noise": ("Every timed flow is inside its window and the dip is inside its range. Nothing to move.", "signal vs noise"),
}
DECOYS = [("copy", "Cross-sell hero image swapped"), ("copy", "Footer address updated"), ("admin", "Report renamed for Monday standup"),
          ("admin", "New team member added to Klaviyo"), ("copy", "Winback subject line punctuation fixed"), ("copy", "Social icons updated")]
HERRINGS = [("harmless", "Cross-sell: delay checked, left at its current day"), ("harmless", "Winback: trigger renamed (same rule)"),
            ("harmless", "Burr replacement reminder: send time moved from 9 a.m. to 10 a.m."), ("harmless", "Cohort report switched to calendar months")]
HERRING_N = {"obvious": 0, "clear": 1, "realistic": 1, "subtle": 2}
SYMPTOMS = [
    "Dana: repeat purchase looks down this quarter. Are the post-purchase flows working?",
    "Ruth: the {month} customers aren't coming back like last year's. Why?",
    "Priya: is the {flow} pulling its weight? It's small in the report.",
    "Dana: should we be sending the {flow} sooner or later? Someone asked in the exec meeting.",
    "Slack #retention: {flow} looks {adj} this week. Can someone check?",
]
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]


def fit(day, center):
    """How well a timed email lands: 1 at the center of its window, falling off on a log scale (our assumption)."""
    x = math.log(max(1, day) / center)
    return 0.3 + 0.7 * math.exp(-x * x / (2 * 0.45 ** 2))


def Phi(z):
    return 0.5 * (1 + math.erf(z / math.sqrt(2)))


def make_program(kind: str, seed: int, stage: str = "realistic") -> dict:
    for n in range(25):
        c = _make(kind, seed + n * 7919, stage)
        if clear_enough(c):
            break
    c["seed"] = seed
    c.pop("_check", None)
    return c


def clear_enough(c) -> bool:
    kind = c["truth"]["kind"]; F = {f["fid"]: f for f in c["flows"]}
    rev = lambda fid, a, b: sum(F[fid]["by_message"]["m1"]["revenue"][a:b])
    if kind in ("delay_shortened", "reminder_too_early"):
        fid = "cross_sell" if kind == "delay_shortened" else "reminder"
        return rev(fid, 49, 56) < rev(fid, 0, 28) / 4 * 0.85
    if kind in ("winback_moved_good", "cross_sell_swap_good"):
        fid = "winback" if kind == "winback_moved_good" else "cross_sell"
        return rev(fid, 49, 56) > rev(fid, 0, 28) / 4 * 1.15
    if kind in ("promo_cohort", "small_cohort"):
        row = c["cohorts"][c["_check"]["row"]]
        lim = (0.7 if c["stage"] in ("obvious", "clear") else 0.8) if kind == "promo_cohort" else 0.6
        return row["r60"] is not None and row["r60"] < lim * c["_check"]["norm60"]
    return True


def _make(kind, seed, stage):
    import lifecycle_files as L
    rng, nrs = random.Random(seed), np.random.default_rng(seed)
    S = L.STAGES[stage]["fault"]
    dn = lambda f: 1 - min(0.75, (1 - f) * S)
    month = {"bf_cohort": rng.choice([2, 3]), "seasonal_gap": rng.choice([9, 10])}.get(kind)     # months where that cohort shows
    today = date(2026, month or rng.randint(1, 10), rng.randint(5, 28))
    if kind == "bf_cohort":
        today = date(2027 if today.month <= 3 else 2026, today.month, today.day)
    dates = [today - timedelta(days=L.DAYS - i) for i in range(L.DAYS)]
    s = rng.randint(34, 48)
    # ---- the gaps: the next purchase (the cross-sell's gap and the win-back's), burr replacement (the reminder's)
    med = rng.randint(50, 75); sd = rng.uniform(0.9, 1.1) if kind != "timed_to_average" else rng.uniform(1.15, 1.3)
    burrs = rng.randint(300, 360)
    mean = round(med * math.exp(sd * sd / 2))
    centers = {"cross_sell": med * 0.875, "reminder": burrs * 0.875, "winback": med * 1.05}
    sends = {fid: round(centers[fid] * rng.uniform(0.93, 1.07)) for fid in TIMED}
    past = 1 + 0.4 * S                     # how far past its window edge an all-along fault sits (subtle: near the edge)
    hi_w, lo_x = med * TIMED["winback"][1], med * TIMED["cross_sell"][0]
    if kind == "winback_too_late":
        sends["winback"] = round(hi_w * past * (1.25 if S >= 1 else 1.0))
    elif kind == "cross_sell_too_early":
        sends["cross_sell"] = rng.choice([3, 4, 5]) if S >= 2 else round(lo_x / (past * (1.4 if S >= 1 else 1.0)))
    elif kind == "timed_to_average":
        sends["winback"] = round(mean * rng.uniform(0.98, 1.05))
    # stage distractors: harmless things a shortcut reads as a fault
    pool = ["near_edge", "small_low", "discount_fine"]
    rng.shuffle(pool)
    distract = set(pool[:{"obvious": 0, "clear": 0, "realistic": 1, "subtle": 2}[stage]])
    if "near_edge" in distract and kind not in STATIC | {"delay_shortened", "reminder_too_early", "winback_moved_good"}:
        fid = rng.choice(list(TIMED)); w0 = (med if fid != "reminder" else burrs) * TIMED[fid][1]
        sends[fid] = round(w0 * rng.uniform(1.04, 1.1))     # just past the edge, inside the tolerance: within the noise of a rule of thumb
    before, after = dict(sends), dict(sends)          # the all-along faults are in both
    if kind == "delay_shortened":
        after["cross_sell"] = 5 if S >= 1 else round(med * 0.35)
    elif kind == "reminder_too_early":
        after["reminder"] = 120 if S >= 1 else 180
    elif kind == "winback_moved_good":
        before["winback"] = sends["winback"] = round(med * (1.5 + 0.6 * S))
        after["winback"] = round(centers["winback"])
    # ---- the five flows, day by day
    flows = []
    aov_sd = L.STAGES[stage]["aov_sd"]
    for fid, name, (o, c_, od, aov, u), size in STREAMS:
        weekly = rng.randint(*size)
        ent, out = [], {k: [] for k in ("delivered", "opens", "clicks", "orders", "revenue", "unsubs")}
        f_before = fit(before[fid], centers[fid]) if fid in TIMED else 1.0
        f_after = fit(after[fid], centers[fid]) if fid in TIMED else 1.0
        for di, dd in enumerate(dates):
            m_ent = m_ord = m_click = m_un = 1.0
            t_fit = f_after if di >= s else f_before
            if kind == "winback_trigger_broke" and fid == "winback" and di >= s:
                m_ent = dn(0.3)
            if kind == "reminder_too_early" and fid == "reminder" and di >= s:
                m_un = 1 + 1.8 * S
            if kind == "cross_sell_swap_good" and fid == "cross_sell" and di >= s:
                m_click = m_ord = 1 + 0.45 * S
            if kind == "in_window_noise" and fid == "cross_sell" and di >= 49:
                m_ord = 0.9
            e = int(nrs.poisson(weekly / 7 * m_ent))
            dl = int(e * 0.985)
            daily = 1 + nrs.normal(0, 0.12 if stage in ("realistic", "subtle") else 0.06)
            opens = int(nrs.binomial(dl, min(0.95, o))) if dl else 0
            clicks = int(nrs.binomial(dl, min(0.5, max(0, c_ * m_click * (0.6 + 0.4 * t_fit) * daily)))) if dl else 0
            orders = int(nrs.binomial(dl, min(0.3, max(0, od * m_ord * t_fit * daily)))) if dl else 0
            rev = float(sum(nrs.lognormal(math.log(aov) - aov_sd ** 2 / 2, aov_sd, orders))) if orders else 0.0
            un = int(nrs.binomial(dl, min(0.2, u * m_un))) if dl else 0
            ent.append(e)
            for k, v in (("delivered", dl), ("opens", opens), ("clicks", clicks), ("orders", orders), ("revenue", round(rev, 2)), ("unsubs", un)):
                out[k].append(v)
        import lf_level5 as LV5
        flows.append(LV5._stream(fid, name, dates, today, ent, out, None, seed))
    # ---- the repurchase curve: share of first-time buyers who bought again by day N (out to a year)
    R = rng.uniform(0.24, 0.30)
    late = 0.55 if kind == "winback_trigger_broke" else 1.0         # in new data the curve flattens once the win-back stops
    smooth = [R * Phi((math.log(max(d, 0.5)) - math.log(med)) / sd) * (1 if d <= med else late + (1 - late) * med / d) for d in range(0, 366)]
    n_ret = rng.randint(1200, 3000)                                 # returners behind the curve: the steps are real-data wobble
    gaps = np.sort(np.exp(nrs.normal(math.log(med), sd, n_ret)))
    emp = np.searchsorted(gaps, np.arange(366), side="right") / n_ret
    curve = [round(float(smooth[d] / max(1e-9, Phi((math.log(max(d, 0.5)) - math.log(med)) / sd)) * emp[d]) if d else 0.0, 4) for d in range(366)]
    timing = {"curve": curve, "median": med, "mean": mean, "rebuy_gap": burrs, "sends": {k: after[k] for k in TIMED},
              "windows": {k: [round(centers[k] / 0.875 * TIMED[k][0]) if k != "winback" else round(med * TIMED[k][0]),
                              round(centers[k] / 0.875 * TIMED[k][1]) if k != "winback" else round(med * TIMED[k][1])] for k in TIMED},
              "gap_of": {"cross_sell": "days to the next purchase", "reminder": "days until burrs are replaced", "winback": "days to the next purchase"}}
    # ---- cohorts: the last 12 first-order months
    cohorts = []
    key_row = None
    for back in range(12, 0, -1):
        y, mth = today.year, today.month - back
        while mth <= 0:
            mth += 12; y -= 1
        start = date(y, mth, 1)
        age = (today - start).days - 15                         # days the middle of the month has had
        size = rng.randint(1500, 4000) if stage in ("obvious", "clear") else rng.randint(900, 2500)     # smaller months are noisier
        disc, grinder_first, mug = rng.uniform(0.15, 0.25), rng.uniform(0.3, 0.4), rng.uniform(0.0, 0.05)
        m = 1.0
        season = 0.72 if mth == 11 else 0.84 if mth in (6, 7) else 1.0
        if kind == "promo_cohort" and back == 3:
            disc = min(0.8, 0.2 + rng.uniform(0.22, 0.28) * (1 + S)); key_row = len(cohorts)
        if "small_low" in distract and kind != "small_cohort" and back == 6:
            size = rng.randint(60, 110)
        if "discount_fine" in distract and kind != "promo_cohort" and back == 5:
            disc = rng.uniform(0.32, 0.42)                  # a sale month that came back about as well
        if kind == "first_product_shift" and back <= 4:
            mug = rng.uniform(0.35, 0.5)
        if kind == "small_cohort" and back == 4:
            size = rng.randint(60, 110); key_row = len(cohorts)
        if kind == "censored_cohort":
            key_row = 11
        pull = 0.9 * (min(1.0, S) ** 0.5 if kind == "promo_cohort" and back == 3 else 1)     # subtle: the promo month sits nearer the others
        m *= (1 - pull * max(0, disc - 0.2) * (0.3 if back == 5 and "discount_fine" in distract and kind != "promo_cohort" else 1)) * (1 - 0.7 * mug) * season
        def rate(d):
            if age < d:
                return None
            p = R * Phi((math.log(d) - math.log(med)) / sd) * m
            return round(int(nrs.binomial(size, min(0.9, p))) / size, 4)
        part = lambda d: round(int(nrs.binomial(size, min(0.9, R * Phi((math.log(max(1, age)) - math.log(med)) / sd) * m))) / size, 4) if age < d else None
        ly = R * Phi((math.log(90) - math.log(med)) / sd) * season * (1 - 0.9 * max(0, rng.uniform(0.15, 0.25) - 0.2))
        cohorts.append({"month": f"{MONTHS[mth - 1][:3]} {y}", "month_full": MONTHS[mth - 1], "start": start.isoformat(), "age": age,
                        "size": size, "r30": rate(30), "r60": rate(60), "r90": rate(90), "so_far": part(90),
                        "ly90": round(ly * rng.uniform(0.9, 1.1), 4),
                        "discount": round(disc, 3), "grinder_first": round(grinder_first, 3), "mug_first": round(mug, 3)})
    norm60 = R * Phi((math.log(60) - math.log(med)) / sd)
    if kind == "bf_cohort":
        key_row = next(i for i, r in enumerate(cohorts) if r["month_full"] == "November")
    if kind == "seasonal_gap":
        key_row = max(i for i, r in enumerate(cohorts) if r["month_full"] in ("June", "July"))
    pm = next((r["month_full"] for i, r in enumerate(cohorts) if i == key_row), "October") if kind == "promo_cohort" else None
    jm = cohorts[-4]["month_full"]
    case = {"_promo_month": pm, "_mug_month": jm, "id": f"t{seed % 100000}{rng.randint(100, 999)}", "kind": kind, "seed": seed, "level": 6, "program": True, "timing_level": True,
            "stage": stage, "stage_badge": L.STAGES[stage]["badge"], "stage_note": L.STAGES[stage]["note"],
            "today": today.isoformat(), "dates": [d.isoformat() for d in dates], "flows": flows, "alerts": [],
            "timing": timing, "cohorts": cohorts, "_key_row": key_row, "_norm60": norm60,
            "flow": {"name": "All flows", "messages": [], "type": "program"}}
    import lf_level3 as LV3
    case["band"] = LV3.program_band(case)
    _log(case, kind, rng, s, stage, before, after)
    case["truth"] = _truth(case, kind, s)
    case["symptom"] = _symptom(case, kind, rng)
    return case


def _log(case, kind, rng, s, stage, before, after):
    d = lambda i: case["dates"][max(0, min(len(case["dates"]) - 1, i))]
    ch = []
    who = lambda: rng.choice(["Priya", "Ruth", "Theo", "Dana"])

    def add(i, k, what, cause=False):
        ch.append({"id": "", "date": d(i), "where": "klaviyo", "kind": k, "what": what, "who": who(), "_c": cause})
    C = {"delay_shortened": ("delay", f"Post-Purchase Cross-sell: delay changed from day {before['cross_sell']} to day {after['cross_sell']}"),
         "reminder_too_early": ("delay", f"Burr Replacement Reminder: delay changed from day {before['reminder']} to day {after['reminder']}"),
         "winback_moved_good": ("delay", f"Winback: send day moved from day {before['winback']} to day {after['winback']} (the test's winner)"),
         "winback_trigger_broke": ("trigger", "Winback: trigger changed to a new 'Lapsed customer' segment"),
         "cross_sell_swap_good": ("content", "Post-Purchase Cross-sell: now features the top next-purchase product (work pants)"),
         "promo_cohort": ("promo", f"Promo recap posted: {case['_promo_month']}'s launch promo (40% off first orders) drove most of that month's first orders"),
         "first_product_shift": ("product", f"Travel mug recap: the new travel mug (launched in {case['_mug_month']}) is now the top first product")}
    if kind in C:
        k, what = C[kind]
        i = s if kind not in ("promo_cohort", "first_product_shift") else 2
        add(i, k, what, kind not in ("first_product_shift",))
    herrings = HERRINGS + [("harmless", f"Promo recap posted: {rng.choice(case['cohorts'][:8])['month_full']}'s sale (20% off sitewide) performed about as planned")]
    for k, w in rng.sample(herrings, HERRING_N[stage]):
        j = s + rng.choice([-1, 1]) * rng.randint(6, 14)
        add(j if 3 <= j <= 54 else s - rng.randint(6, 14), k, w)
    for _ in range(max(1, rng.randint(4, 6) - len(ch))):
        k, w = rng.choice(DECOYS)
        add(rng.randint(3, len(case["dates"]) - 2), k, w)
    for c in ch:
        c["_r"] = rng.random()
    ch.sort(key=lambda c: (c["date"], c.pop("_r")))
    for n, c in enumerate(ch):
        c["id"] = f"c{n + 1}"
    case["changes"] = [{k3: v for k3, v in c.items() if k3 != "_c"} for c in ch]
    case["_cause"] = next((c["id"] for c in ch if c["_c"]), "none")
    case["_logged"] = next((c["id"] for c in ch if kind in C and c["what"] == C[kind][1]), "none")
    case.pop("_promo_month", None); case.pop("_mug_month", None)


def _truth(case, kind, s):
    import lifecycle_files as L
    F = {f["fid"]: f for f in case["flows"]}
    T = case["timing"]
    week = lambda fid, k, a, b: sum(F[fid]["by_message"]["m1"][k][a:b])
    flow_dollars = lambda fid: round(week(fid, "revenue", 49, 56) - week(fid, "revenue", 0, 28) / 4)
    since = case["dates"][s] if kind not in NOTHING | STATIC | COHORT else None
    K = {   # real, where, where_ok, moved, moved_ok, actions
        "winback_too_late": ("problem", "winback", ["winback"], None, [None, "nothing", "orders"], ["test"]),
        "cross_sell_too_early": ("problem", "cross_sell", ["cross_sell"], None, [None, "nothing", "orders"], ["test"]),
        "promo_cohort": ("problem", "cohort", ["cohort"], None, [None, "nothing", "orders"], ["escalate", "watch"]),
        "censored_cohort": ("nothing", None, [None, ""], None, [None, "nothing"], ["leave", "watch"]),
        "bf_cohort": ("nothing", None, [None, "", "cohort"], None, [None, "nothing"], ["leave", "watch"]),
        "delay_shortened": ("problem", "cross_sell", ["cross_sell"], "orders", ["orders", "clicks"], ["fix_today"]),
        "winback_moved_good": ("good", "winback", ["winback"], "orders", ["orders", "clicks"], ["leave", "watch"]),
        "first_product_shift": ("nothing", None, [None, "", "cohort"], None, [None, "nothing"], ["watch", "leave"]),
        "reminder_too_early": ("problem", "reminder", ["reminder"], "unsubs", ["unsubs", "orders"], ["fix_today", "test"]),
        "small_cohort": ("nothing", None, [None, "", "cohort"], None, [None, "nothing"], ["leave", "watch"]),
        "timed_to_average": ("problem", "winback", ["winback"], None, [None, "nothing", "orders"], ["test"]),
        "seasonal_gap": ("nothing", None, [None, "", "cohort"], None, [None, "nothing"], ["leave", "watch"]),
        "winback_trigger_broke": ("problem", "winback", ["winback"], "entered", ["entered"], ["fix_today", "escalate"]),
        "cross_sell_swap_good": ("good", "cross_sell", ["cross_sell"], "orders", ["orders", "clicks"], ["leave", "watch"]),
        "in_window_noise": ("nothing", None, [None, ""], None, [None, "nothing"], ["leave", "watch"]),
    }
    real, where, where_ok, moved, moved_ok, actions = K[kind]
    money = 0
    if kind in ("delay_shortened", "reminder_too_early", "winback_trigger_broke"):
        money = max(0, -flow_dollars(where))
    if real == "good":
        money = max(0, flow_dollars(where))
    cause = case.pop("_cause"); logged = case.pop("_logged")
    cause_ok = [cause] if cause != "none" else ["none"]
    if kind == "first_product_shift":
        cause_ok = [logged, "none"]
    if kind == "promo_cohort":
        cause_ok = [cause, "none"]                 # the promo ran before the 8 weeks shown, but it's on the log
    evidence_extra = ["timing"] if kind in STATIC | {"delay_shortened", "winback_moved_good", "reminder_too_early", "in_window_noise"} else \
                     ["cohorts"] if kind in COHORT else []
    nm = lambda fid: F[fid]["flow"]["name"] if fid in F else "New customers (one cohort)"
    row = case["cohorts"][case["_key_row"]] if case.get("_key_row") is not None else None
    pin = {"censored_cohort", "bf_cohort", "small_cohort", "seasonal_gap", "promo_cohort"}
    if kind == "first_product_shift":
        row = case["cohorts"][-4]
    case["_symptom_month"] = row["month_full"] if row and (kind in pin or kind == "first_product_shift") else None
    case["_check"] = {"row": case.pop("_key_row", None), "norm60": case.pop("_norm60", None)}
    sends, win = T["sends"], T["windows"]
    story = {
        "winback_too_late": f"The win-back goes out on day {sends['winback']}. Half the customers who come back are back by day {T['median']}, so its window is about day {win['winback'][0]}-{win['winback'][1]}. It reaches people who are long gone. Nothing changed, it's been like this all along.",
        "cross_sell_too_early": f"The cross-sell goes out on day {sends['cross_sell']}, but the next purchase usually comes around day {T['median']}. Its window is about day {win['cross_sell'][0]}-{win['cross_sell'][1]}.",
        "promo_cohort": f"The {row['month'] if row else ''} cohort came in on a launch promo: {round((row or {}).get('discount', 0) * 100)}% of first orders were on a big discount. Deal buyers come back less, so its 60-day rate is far below the other months. The flows are fine.",
        "censored_cohort": f"The newest cohort's 90-day cell is blank or low because it's only had about {row['age'] if row else 0} days. Its rate so far is on track.",
        "bf_cohort": "The November cohort comes back less. So did last November's: Black Friday brings deal buyers every year.",
        "delay_shortened": f"On {since} the cross-sell delay was cut from day {before_day(case, 'cross_sell')} to day {sends['cross_sell']}, out of its window. Its orders fell from that day.",
        "winback_moved_good": f"On {since} the win-back moved into its window (day {sends['winback']}). It earns more per email.",
        "first_product_shift": "The new travel mug became the top first purchase. People who start with a mug rarely buy again soon, so recent cohorts come back less. Nothing broke.",
        "reminder_too_early": f"On {since} the burr replacement reminder moved to day {sends['reminder']}. Grinder burrs get replaced after about day {T['rebuy_gap']}, so it now lands months early: unsubscribes up, orders down.",
        "small_cohort": f"The {row['month'] if row else ''} cohort has only {row['size'] if row else 0} customers. A rate on that few people swings by chance.",
        "timed_to_average": f"The win-back is timed to the average gap (day {T['mean']}). A few slow returners pull the average late: half of returners are back by day {T['median']}, so the window is about day {win['winback'][0]}-{win['winback'][1]}.",
        "seasonal_gap": "The summer cohort comes back slower. Last summer's did too: the season, not the flows.",
        "winback_trigger_broke": f"On {since} the win-back trigger moved to a new segment, and far fewer people enter it. Fewer lapsed customers are brought back.",
        "cross_sell_swap_good": f"On {since} the cross-sell started featuring work pants, the most common next purchase. Its orders per email rose.",
        "in_window_noise": "Every timed flow is inside its window. The cross-sell dipped this week, inside its normal range.",
    }[kind]
    tile = lambda m: L.TILE_LABEL.get(m, "Nothing")
    real_line = {"censored_cohort": "Not real: that cell isn't full yet.", "bf_cohort": "Not real: last November was the same.",
                 "first_product_shift": "Not a fault: the mix changed, the flows didn't.", "small_cohort": "Not real: too few customers to read.",
                 "seasonal_gap": "Not real: last summer was the same.", "in_window_noise": "Not real: inside its window and its range."}
    expert = [
        real_line.get(kind, "Real, and good." if real == "good" else "Real: " + ("outside its window all along." if kind in STATIC else "the cohort is far below the others." if kind == "promo_cohort" else "outside its normal range.")),
        f"About ${money:,} a week." if money else ("Nothing at stake." if real == "nothing" else "$0 on this week's chart: only a test (or the next cohorts) can size it."),
        f"{nm(where)}." if where else "-",
        f"From {since}." if since else ("-" if real == "nothing" else "Doesn't apply: it's been like this all along."),
        f"{tile(moved)} moved." if moved else "Nothing moved: it's the timing (or the mix), not a change.",
        {"test": "Test the send day: an A/B split, the window against today's day.", "fix_today": "Fix it today: put the delay (or trigger) back.",
         "escalate": "Escalate to whoever owns promotions: the flows can't fix who came in.", "leave": "Leave it.", "watch": "Watch it."}[actions[0]],
    ]
    hints = {
        "winback_too_late": ["When do customers usually come back?", "Open Timing: the win-back's send day against its window.", "Day 180 against a window near day 70."],
        "cross_sell_too_early": ["When do people usually buy again?", "Open Timing: the cross-sell's dot against its band.", "Far too early."],
        "promo_cohort": ["Is one month worse than the rest?", "Open Cohorts: how did that month come in?", "On a big discount."],
        "censored_cohort": ["How long has the newest cohort had?", "Cohorts: which cells are full?", "Not full yet."],
        "bf_cohort": ["Which month is low, and what about last year?", "Cohorts: same month last year.", "November, both years."],
        "delay_shortened": ["When did the cross-sell start earning less?", "The log, then Timing.", "Its delay was cut."],
        "winback_moved_good": ["What changed in the win-back?", "The log and Timing.", "It moved into its window."],
        "first_product_shift": ["How did recent customers come in?", "Cohorts: first product.", "The travel mug."],
        "reminder_too_early": ["How long do burrs last?", "Timing: the reminder against the replacement gap.", "Months too early."],
        "small_cohort": ["How many customers are in that month?", "Cohorts: the size column.", "About eighty."],
        "timed_to_average": ["Median or mean: which one is the win-back timed to?", "Timing: both markers on the curve.", "The mean, so it's late."],
        "seasonal_gap": ["Was last summer the same?", "Cohorts: same month last year.", "Yes."],
        "winback_trigger_broke": ["Did fewer people enter the win-back?", "Winback: Entered the flow, then the log.", "The trigger changed."],
        "cross_sell_swap_good": ["What changed in the cross-sell?", "The log.", "It features the top next purchase."],
        "in_window_noise": ["Is any timed flow outside its window?", "Timing: every dot against its band.", "None is."],
    }[kind]
    return {"kind": kind, "base": "timing", "real": real, "where": where, "where_ok": where_ok, "moved": moved, "moved_ok": moved_ok,
            "since": since, "since_tol": 3, "money": money, "money_alt": None, "actions": actions, "story": story, "expert": expert,
            "hints": hints, "lesson": LESSONS[kind], "cause": cause, "cause_ok": cause_ok, "evidence_extra": evidence_extra,
            "cause_why": CAUSE_WHY[kind], "level6": kind, "since_none_counts": kind in STATIC, "cohort_month": row["month"] if row and kind == "promo_cohort" else None}


CAUSE_WHY = {
    "winback_too_late": "None of these: nothing changed. It's been outside its window all along.",
    "cross_sell_too_early": "None of these: nothing changed. It's been outside its window all along.",
    "timed_to_average": "None of these: nothing changed. It was set to the average gap from the start.",
    "promo_cohort": "The promo recap: that month came in on the launch promo. (\"None of these\" is accepted too: the promo ran before these 8 weeks.)",
    "censored_cohort": "None of these: nothing needs explaining, the cohort just hasn't had the time.",
    "bf_cohort": "None of these: Black Friday months come back less every year.",
    "delay_shortened": "The cross-sell delay change, on the day its orders fell.",
    "winback_moved_good": "The win-back send-day change, on the day it started earning more.",
    "first_product_shift": "The travel mug recap explains the lower repeat rate, and nothing is wrong: either answer is right.",
    "reminder_too_early": "The reminder delay change, on the day unsubscribes rose.",
    "small_cohort": "None of these: the month is too small to read.",
    "seasonal_gap": "None of these: summer months come back slower every year.",
    "winback_trigger_broke": "The win-back trigger change, on the day entries fell.",
    "cross_sell_swap_good": "The cross-sell content change, on the day its orders rose.",
    "in_window_noise": "None of these: nothing needs explaining.",
}


def before_day(case, fid):
    import re
    m = next((re.search(r"from day (\d+)", c["what"]) for c in case["changes"] if "delay changed" in c["what"]), None)
    return m.group(1) if m else "?"


def _symptom(case, kind, rng):
    import lifecycle_files as L
    F = {f["fid"]: f for f in case["flows"]}
    fl = rng.choice(["cross_sell", "reminder", "winback"])
    f = F[fl]; m = f["by_message"]["m1"]
    up_ = sum(m["revenue"][49:56]) >= sum(m["revenue"][:28]) / 4
    month = rng.choice([r for r in case["cohorts"] if r["r60"] is not None])["month_full"]
    pinned = case.pop("_symptom_month", None)
    if pinned and rng.random() < (0.55 if case["truth"]["real"] == "nothing" else 0.8):  # a cohort case: someone is worried about that month (real problem or not)
        return SYMPTOMS[1].format(month=pinned)
    if rng.random() < 0.35:            # other cases ask about a month too, so the question doesn't give the type away
        return SYMPTOMS[1].format(month=rng.choice([r["month_full"] for r in case["cohorts"]]))
    return rng.choice([x for i, x in enumerate(SYMPTOMS) if i != 1]).format(flow=f["flow"]["name"].lower().replace("post-purchase ", ""), month=month, adj="busy" if up_ else "off")


# ---------------------------------------------------------------- tutor scaffold
SHAPE_CHOICES = ["a flow outside its window", "a change on a date", "a month that came in differently", "nothing"]
SHAPE = {k: ("a flow outside its window" if k in STATIC else "a month that came in differently" if k == "promo_cohort"
             else "nothing" if k in NOTHING else "a change on a date") for k in TYPES}
SHAPE_EXPLAIN = {"a flow outside its window": "Its send day sits outside its window and always has: nothing to date, a send day to test.",
                 "a change on a date": "Something changed on a day (a delay, a trigger, the content): find it in the log.",
                 "a month that came in differently": "The flows didn't change. Who came in that month did: the mix.",
                 "nothing": "Every flow is inside its window, and no full cohort is out of line with the same month last year."}
