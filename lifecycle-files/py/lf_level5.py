"""Lifecycle Files, Level 5: Message pressure. Each case is the whole email program: five email flows, an SMS cart
reminder and the campaigns, on the same dates.

Every stream is built in the Level 1 case format (one message, "All emails") so the Level 1 tiles and the Level 3
Registry work on it. Around them: the Pressure panel (messages per person per week, the campaign calendar, and campaign
clicks for subscribers who were already on the list against new ones), Skipped (each flow's skips by reason) and the
Credit split (flow and campaign revenue each week, and the total).

What the simulation encodes (sources in games/lifecycle-files/docs/DESIGN.md, "Level 5"):
  - Smart Sending: one 16-hour timer per channel, shared by campaigns and flows. A skipped email is gone, not delayed.
  - Attribution is last touch, one message per order: a campaign opened after a flow email takes that order's credit.
  - Email and SMS have separate timers, so nothing stops an email and a text arriving the same hour.
  - The fatigue curve (unsubscribes rising faster than sends) is an assumption: no published curve exists.
"""
from __future__ import annotations
import math
import random
from datetime import date, timedelta

import numpy as np

# per delivered message: open, click, order, average order, unsubscribe; weekly entries; normal skip rates
STREAMS = [
    ("cart", "Abandoned Cart", (0.50, 0.060, 0.045, 150, 0.003), (9000, 22000), {"Smart Sending": 0.08, "Fails Flow Filters": 0.04}),
    ("welcome", "Welcome Series", (0.45, 0.065, 0.035, 165, 0.004), (6000, 15000), {"Smart Sending": 0.05, "Fails Flow Filters": 0.01}),
    ("browse", "Browse Abandonment", (0.42, 0.056, 0.014, 150, 0.003), (2500, 8000), {"Smart Sending": 0.12, "Fails Flow Filters": 0.03}),
    ("post_purchase", "Post-Purchase", (0.50, 0.051, 0.011, 120, 0.002), (3000, 9000), {"Smart Sending": 0.06, "Fails Flow Filters": 0.07}),
    ("winback", "Winback", (0.35, 0.028, 0.006, 140, 0.005), (900, 3000), {"Smart Sending": 0.04, "Fails Flow Filters": 0.02}),
    ("sms", "SMS Cart Reminder", (0.0, 0.090, 0.030, 150, 0.007), (2000, 5000), {"Smart Sending": 0.06, "Fails Flow Filters": 0.03}),
]
CAMPAIGN = (0.31, 0.0169, 0.0012, 150, 0.002)        # Klaviyo 2026 benchmarks: campaign open 31%, click 1.69%
REASONS = ["Smart Sending", "Fails Flow Filters", "Person Suppressed"]
CAMP_DAYS = {1: (3,), 2: (1, 3), 3: (1, 3, 5), 4: (0, 1, 3, 5), 5: (0, 1, 2, 3, 5), 6: (0, 1, 2, 3, 4, 5)}   # weekdays, by campaigns a week
FLOW_IDS = [s[0] for s in STREAMS]
CAMPAIGN_SD = {"obvious": 0.04, "clear": 0.08, "realistic": 0.12, "subtle": 0.15}

TIERS = [
    ["campaign_skips_cart", "credit_shift", "cadence_unsubs", "overlap_new_subs", "quiet_week"],
    ["sms_doubles_email", "reentry_loop", "sunset_paused", "giveaway_mix", "filter_skips_fine"],
    ["smart_off_win", "campaign_steals_and_skips", "slow_fatigue", "bfcm_pressure", "one_campaign_unsubs"],
]
TYPES = [k for t in TIERS for k in t]
NOTHING = {"credit_shift", "quiet_week", "giveaway_mix", "filter_skips_fine", "bfcm_pressure"}
SKILLS = {
    "campaign_skips_cart": ["skip_reasons"], "credit_shift": ["credit_vs_cash"], "cadence_unsubs": ["frequency_cost"],
    "overlap_new_subs": ["stacking"], "quiet_week": [], "sms_doubles_email": ["stacking"], "reentry_loop": ["stacking"],
    "sunset_paused": ["frequency_cost"], "giveaway_mix": ["volume_rate"], "filter_skips_fine": ["skip_reasons"],
    "smart_off_win": ["skip_reasons", "frequency_cost"], "campaign_steals_and_skips": ["credit_vs_cash", "skip_reasons"],
    "slow_fatigue": ["frequency_cost"], "bfcm_pressure": ["baseline"], "one_campaign_unsubs": ["frequency_cost"],
}
FILE_NAMES = {
    "campaign_skips_cart": "Crowded Out", "credit_shift": "Who Gets the Credit", "cadence_unsubs": "The Fourth Email",
    "overlap_new_subs": "Welcome to the Pile-Up", "quiet_week": "A Lighter Week", "sms_doubles_email": "Twice in One Hour",
    "reentry_loop": "Round and Round", "sunset_paused": "Waking the Sleepers", "giveaway_mix": "The Giveaway Crowd",
    "filter_skips_fine": "Skipped on Purpose", "smart_off_win": "Let It Through", "campaign_steals_and_skips": "Half Real",
    "slow_fatigue": "Death by Inches", "bfcm_pressure": "Peak Season", "one_campaign_unsubs": "The Bad Segment",
}
LESSONS = {
    "campaign_skips_cart": ("A campaign starts the 16-hour Smart Sending timer, so more campaigns skip more flow emails. Entries hold, delivered falls, and the flows earn far more per email.", "Smart Sending"),
    "credit_shift": ("Flow revenue down, campaign revenue up by the same, total flat: the credit moved, not the money. Klaviyo gives each order to the last message touched.", "last-touch attribution"),
    "cadence_unsubs": ("A fourth campaign a week buys a little revenue now and costs people you can never email again. Count the unsubscribes, and test the cadence.", "message fatigue"),
    "overlap_new_subs": ("Welcome, browse and cart can all fire for a new subscriber on day one. Without flow filters they stack, and the welcome series takes the unsubscribes.", "contact pressure"),
    "quiet_week": ("One campaign fewer means a little less revenue, inside its normal range. Nothing to fix.", "signal vs noise"),
    "sms_doubles_email": ("Email and SMS have separate Smart Sending timers. A text timed like the email lands in the same hour, and people leave the channel that annoyed them.", "channel stacking"),
    "reentry_loop": ("Allowing re-entry sends the same flow to the same people again and again. Entries jump with no new shoppers behind them.", "re-entry"),
    "sunset_paused": ("Pausing the sunset flow puts long-quiet people back in every campaign: more sends, lower click rate, more unsubscribes.", "sunsetting"),
    "giveaway_mix": ("Revenue per recipient fell because the list grew with giveaway signups who rarely buy. The people already on the list behave as before: mix, not fatigue.", "mix shift"),
    "filter_skips_fine": ("Skipped rose, but the reason is a flow filter doing its job (people who already bought again). Read the reason before acting on a Skipped count.", "skip reasons"),
    "smart_off_win": ("Turning Smart Sending off on the cart flow let more reminders through, and the extra revenue came with no rise in unsubscribes. A real win.", "Smart Sending"),
    "campaign_steals_and_skips": ("Part of the flow drop is credit (the total doesn't move) and part is skipped emails (it does). Size it on the total, not the flow line.", "last-touch attribution"),
    "slow_fatigue": ("Cadence crept up week by week and the people already on the list click a little less each week. No single week alarms: compare with normal.", "message fatigue"),
    "bfcm_pressure": ("At Black Friday, Klaviyo itself says to turn Smart Sending off on key flows. Pressure doubles and unsubscribes stay healthy: the season, not a fault.", "seasonality"),
    "one_campaign_unsubs": ("Unsubscribes jumped on one day, from one campaign sent to an imported segment. The fix is the segment, not the cadence.", "list quality"),
}
DECOYS = [("copy", "Campaign template footer updated"), ("copy", "New hero image on the welcome email"), ("admin", "Report renamed for Monday standup"),
          ("admin", "New team member added to Klaviyo"), ("copy", "Preheader tweaked on the newsletter"), ("copy", "Social icons updated")]
HERRINGS = [("harmless", "Smart Sending window confirmed at 16 hours (no change)"), ("harmless", "Winback: exit filter renamed (same rule)"),
            ("harmless", "Newsletter moved from Tuesday to Wednesday"), ("harmless", "SMS quiet hours set to 8 a.m. to 9 p.m. (the default)"),
            ("harmless", "VIP segment refreshed with the same rules")]
DISTRACT = {"obvious": 0, "clear": 0, "realistic": 1, "subtle": 2}    # harmless movements that fool a shortcut, never the answer
DISTRACT_OK = {"credit_spill": set(TYPES) - {"credit_shift", "campaign_steals_and_skips", "campaign_skips_cart", "smart_off_win"},
               "filter_rise": set(TYPES) - {"filter_skips_fine"}}
HERRING_N = {"obvious": 0, "clear": 1, "realistic": 1, "subtle": 2}
SYMPTOMS = [
    "Dana: flow revenue is {dir} {pct}% this week. What's going on?",
    "Ruth: are we sending too much? Someone on the team said customers are complaining.",
    "Priya: the weekly report has email revenue {dir2} {pct2}%. Anything I should know?",
    "Slack #retention: {flow} looks {adj} this week. Can someone check?",
    "Dana: the campaigns did well this week. Did the flows?",
]


def _spec(kind, rng, S, s):
    """Fault pieces: (streams, metric, value, mode). Metrics multiply a rate (open, click, order, unsub, entered),
    add to a skip reason (skip:<reason>), change campaigns a week (camp_n), move order credit from flows to campaigns
    (credit) or touch one cohort (new_signups, existing_click, new_click). Modes: step from day s, spike on s, slope."""
    dn = lambda f: 1 - min(0.75, (1 - f) * S)
    up = lambda f: 1 + (f - 1) * S
    sp = {
        "campaign_skips_cart": [("camp", "camp_n", 2, "step"), (("cart", "welcome", "browse"), "skip:Smart Sending", min(0.55, 0.25 * S), "step")],
        "credit_shift": [("camp", "sale", 1, "step"), (("cart", "welcome", "browse", "post_purchase"), "credit", min(0.5, 0.28 * S), "step")],
        "cadence_unsubs": [("camp", "camp_n", 1, "step"), ("camp", "unsub", up(1.9), "step"), ("camp", "order", 0.9, "step")],
        "overlap_new_subs": [(("browse", "cart"), "entered", up(1.45), "step"), (("browse", "cart"), "order", 1 / up(1.45), "step"), (("welcome",), "unsub", up(3.2), "step"), (("browse",), "unsub", up(2.2), "step")],
        "quiet_week": [("camp", "camp_n", -1, "step")],
        "sms_doubles_email": [(("sms",), "unsub", max(up(3.0), 2.4), "step"), (("cart",), "unsub", up(1.6), "step"), (("cart",), "credit_to_sms", min(0.4, 0.2 * S), "step")],
        "reentry_loop": [(("browse",), "entered", up(2.6), "step"), (("browse",), "unsub", up(2.4), "step"), (("browse",), "order", dn(0.55), "step")],
        "sunset_paused": [("camp", "sleepers", min(0.6, 0.3 * S), "step")],
        "giveaway_mix": [(("welcome",), "entered", up(3.0), "step"), (("welcome",), "order", 1 / up(3.0), "step"), ("camp", "new_signups", up(3.0), "step")],
        "filter_skips_fine": [(("post_purchase",), "skip:Fails Flow Filters", min(0.5, 0.25 * S), "step"), (("post_purchase",), "order", 0.85, "step")],
        "smart_off_win": [(("cart",), "skip:Smart Sending", -0.075, "step"), (("cart",), "entered", 1.0, "step")],
        "campaign_steals_and_skips": [("camp", "camp_n", 2, "step"), (("cart", "welcome"), "skip:Smart Sending", min(0.5, 0.28 * S), "step"),
                                      (("cart", "welcome", "browse"), "credit", min(0.4, 0.2 * S), "step")],
        "slow_fatigue": [("camp", "creep", 1, "slope"), ("camp", "existing_click", min(dn(0.7), 0.8), "slope"), ("camp", "unsub", max(up(1.6), 1.4), "slope")],
        "bfcm_pressure": [],
        "one_campaign_unsubs": [("camp", "bad_segment", 6.0, "spike")],     # an imported list spikes at any stage
    }
    return sp[kind]


def _f(mode, v, di, s, metric=None):
    """The factor a piece applies on day di (None if not active)."""
    if mode.startswith("step_at"):
        return v if di >= int(mode[7:]) else None
    if mode == "step":
        return v if di >= s else None
    if mode == "spike":
        return v if di == s else None
    if mode == "slope":                     # grows over the last weeks from day s
        if di < s:
            return None
        f = min(1.0, (di - s + 1) / (55 - s + 1))
        return 1 + (v - 1) * f
    return None


def make_program(kind: str, seed: int, stage: str = "realistic") -> dict:
    """Build one case, re-rolling until the program shows what the case type is meant to show."""
    for n in range(25):
        c = _make(kind, seed + n * 7919, stage)
        if clear_enough(c):
            break
    c["seed"] = seed
    return c


def clear_enough(c) -> bool:
    kind = c["truth"]["kind"]; F = {f["fid"]: f for f in c["flows"]}
    rev = lambda fs, a, b: sum(sum(f["by_message"]["m1"]["revenue"][a:b]) for f in fs)
    last, b = rev(c["flows"], 49, 56), c["band"]
    flows = [f for f in c["flows"] if f["fid"] != "camp"]
    fch = rev(flows, 49, 56) / max(1, rev(flows, 0, 28) / 4) - 1
    if kind in ("campaign_skips_cart", "campaign_steals_and_skips"):
        return last < b["lo"]
    if kind == "credit_shift":
        return b["lo"] <= last <= b["hi"] and fch < -0.12
    if kind in NOTHING or kind in ("cadence_unsubs", "sunset_paused", "one_campaign_unsubs", "sms_doubles_email", "overlap_new_subs"):
        return last >= b["lo"] or kind == "bfcm_pressure"
    return True


def _make(kind: str, seed: int, stage: str = "realistic") -> dict:
    import lifecycle_files as L
    rng, nrs = random.Random(seed), np.random.default_rng(seed)
    S = L.STAGES[stage]["fault"]
    if kind == "bfcm_pressure":
        y = rng.choice([2025, 2026]); bf = date(y, 11, 22) + timedelta(days=(4 - date(y, 11, 22).weekday()) % 7)
        today = bf + timedelta(days=rng.randint(4, 6))
    else:
        today = date(2026, rng.randint(1, 10), rng.randint(1, 28))
        if date(today.year, 11, 10) <= today <= date(today.year, 12, 10):
            today -= timedelta(days=35)
    dates = [today - timedelta(days=L.DAYS - i) for i in range(L.DAYS)]
    s = (rng.randint(50, 53) if kind in ("credit_shift", "quiet_week") else rng.randint(49, 54) if kind == "one_campaign_unsubs"
         else rng.randint(14, 22) if kind == "slow_fatigue" else rng.randint(34, 48))
    bf_i = dates.index(bf) if kind == "bfcm_pressure" else None
    if bf_i is not None:
        s = bf_i - 7                          # Smart Sending goes off a week before Black Friday
    spec = _spec(kind, rng, S, s)
    pool = [d for d in ("credit_spill", "filter_rise") if kind in DISTRACT_OK[d]]
    rng.shuffle(pool)
    for d in pool[:DISTRACT[stage]]:
        if d == "credit_spill":       # a launch campaign opened after flow emails takes some credit: the total doesn't move
            spec.append((("cart", "welcome"), "credit", rng.uniform(0.18, 0.28), "step_at" + str(rng.randint(49, 52))))
        else:                          # the winback exit filter catches more buyers: skips up, nothing wrong
            spec.append((("winback",), "skip:Fails Flow Filters", rng.uniform(0.1, 0.18), "step"))
    sd = CAMPAIGN_SD[stage]; aov_sd = L.STAGES[stage]["aov_sd"]
    lognorm = lambda w: nrs.lognormal(-(sd * w) ** 2 / 2, sd * w, L.DAYS)
    camp_f = {k: lognorm(w) for k, w in (("open", 0.5), ("click", 0.8), ("order", 1.0), ("unsub", 0.9))}
    list_size = rng.randint(250_000, 600_000)
    camp_n = rng.choice([2, 3, 3, 4])      # some brands already send four a week: a count alone says nothing
    sale_days = set(rng.sample(range(3, 40), rng.randint(1, 3)))          # ordinary sales in the quiet weeks
    weekly_entries = {pid: rng.randint(*rng_r) for pid, _, _, rng_r, _ in STREAMS}

    def pieces(stream):
        return [p for p in spec if (p[0] == stream) or (isinstance(p[0], tuple) and stream in p[0])]

    def active(stream, metric, di):
        """Skips and shares add up; rates multiply. Nothing active: 0 for skips and shares, 1 for rates."""
        vals = [x for x in (_f(mode, v, di, s) for st, m, v, mode in pieces(stream) if m == metric) if x is not None]
        if metric.startswith("skip:") or metric in ("sleepers", "credit", "credit_to_sms"):
            return sum(vals)
        return math.prod(vals) if vals else 1.0

    def bfcm(di):                 # Black Friday through Cyber Monday: traffic and sends up, Smart Sending off on key flows
        if bf_i is None:
            return 1.0
        return 2.4 if bf_i <= di <= bf_i + 3 else 1.5 if bf_i - 7 <= di < bf_i else 1.0

    # ---- campaigns: a calendar, two cohorts (already on the list, and signed up in the last 8 weeks)
    camp = {k: [0] * L.DAYS for k in ("entered", "delivered", "opens", "clicks", "orders", "revenue", "unsubs")}
    cohorts = {c: {"sent": [0] * L.DAYS, "clicks": [0] * L.DAYS} for c in ("existing", "new")}
    calendar = []
    signups_w = weekly_entries["welcome"]
    o, c, od, aov, u = CAMPAIGN
    for di, dd in enumerate(dates):
        n_week = camp_n
        for st, m, v, mode in pieces("camp"):
            if m == "camp_n" and di >= s:
                n_week = max(1, min(6, camp_n + v))
            if m == "creep" and di >= s:
                n_week = min(6, camp_n + 1 + (di - s) // 10)
        days = CAMP_DAYS[n_week]
        sale = any(m == "sale" and di >= s for _, m, _, _ in pieces("camp"))
        if bf_i is not None and bf_i - 3 <= di <= bf_i + 3:
            days = tuple(range(7))
        seg_day = any(m == "bad_segment" and di == s for _, m, _, _ in pieces("camp"))
        if dd.weekday() not in days and not (sale and dd.weekday() in (0, 2, 4, 6)) and not seg_day:
            continue
        new_m = 1.0
        for st, m, v, mode in pieces("camp"):
            if m == "new_signups" and di >= s:
                new_m = 1 + (v - 1) * min(1.0, (di - s + 1) / 14)
        wave = new_m > 1.2                                   # giveaway signups: rarely click or buy
        seg = int(list_size * 0.08) if any(m == "bad_segment" and di == s for _, m, _, _ in pieces("camp")) else 0
        bad = next((v for _, m, v, _ in pieces("camp") if m == "bad_segment"), 1.0)
        ex_m = active("camp", "existing_click", di)
        groups = {   # audience, click, order and unsubscribe weights against the campaign baseline
            "existing": (int(list_size * 0.85), ex_m, ex_m, 1.0),
            "sleepers": (int(list_size * active("camp", "sleepers", di)), 0.12, 0.05, 3.0),
            "new": (int(signups_w * 8 * 0.6 * new_m), 0.25 if wave else 0.6, 0.25 if wave else 0.6, 1.3),
            "segment": (seg, 0.5, 0.3, bad * 5),         # people who never asked for email leave in numbers
        }
        aud = sum(g[0] for g in groups.values())
        sent = int(nrs.poisson(aud)); dl = int(sent * 0.993)
        fx = {k: camp_f[k][di] for k in camp_f}
        boost = 1.8 if bf_i is not None and bf_i <= di <= bf_i + 3 else 1.0
        # the same people buy about as much however many campaigns they get: extra sends mostly split the orders
        per = (camp_n / max(1, len(days) + (2 if sale else 0))) ** (1.0 if sale else 0.9)
        mix = lambda j: sum(g[0] * g[j] for g in groups.values()) / max(1, aud)
        opens = int(nrs.binomial(dl, min(0.95, o * fx["open"])))
        clicks = int(nrs.binomial(dl, min(0.5, c * fx["click"] * mix(1) * (1.3 if sale else 1.0) * per ** 0.5)))
        orders = int(nrs.binomial(dl, min(0.2, od * fx["order"] * active("camp", "order", di) * mix(2) * boost * per)))
        rev = float(sum(nrs.lognormal(math.log(aov) - aov_sd ** 2 / 2, aov_sd, orders))) if orders else 0.0
        unsubs = int(nrs.binomial(dl, min(0.2, u * fx["unsub"] * active("camp", "unsub", di) * mix(3))))
        for k, v in (("entered", sent), ("delivered", dl), ("opens", opens), ("clicks", clicks), ("orders", orders), ("revenue", round(rev, 2)), ("unsubs", unsubs)):
            camp[k][di] += v
        for coh, members in (("existing", ("existing", "sleepers")), ("new", ("new",))):    # the sleepers were on the list all along
            n = int(dl * sum(groups[g][0] for g in members) / max(1, aud))
            r = sum(groups[g][0] * groups[g][1] for g in members) / max(1, sum(groups[g][0] for g in members))
            cohorts[coh]["sent"][di] += n
            cohorts[coh]["clicks"][di] += int(nrs.binomial(n, min(0.5, c * fx["click"] * r * (1.6 if sale else 1.0)))) if n else 0
        spill = any(m == "credit" and mode.startswith("step_at") and di >= int(mode[7:]) for _, m, _, mode in spec)
        label = ("Sale: " if sale or spill or di in sale_days else "") + rng.choice(["New arrivals", "Field notes", "Best sellers", "Staff picks", "Restock", "The weekly edit", "Brew guide"])
        if seg:
            label = "Spring catalog"
        calendar.append({"date": dd.isoformat(), "name": label, "sent": sent, "audience": ("Everyone" if groups["sleepers"][0] else "Engaged 365 days")
                         + (" + 'Trade show leads 2025' (imported)" if seg else "")})

    # ---- flows and the SMS cart reminder
    streams = []
    for pid, pname, (fo, fc, fod, faov, fu), _, skips in STREAMS:
        out = {k: [] for k in ("delivered", "opens", "clicks", "orders", "revenue", "unsubs")}
        ent, skipped = [], {r: [] for r in REASONS}
        for di, dd in enumerate(dates):
            e = int(nrs.poisson(weekly_entries[pid] / 7 * active(pid, "entered", di) * bfcm(di) * (1.08 if dd.weekday() in (0, 6) else 1)))
            sk = {r: skips.get(r, 0.01 if r == "Person Suppressed" else 0) for r in REASONS}
            for r in REASONS:
                sk[r] = max(0.0, sk[r] + active(pid, "skip:" + r, di))
            # campaign days push more flow emails into the 16-hour window; Black Friday turns Smart Sending off on key flows
            camp_today = camp["entered"][di] > 0
            if pid != "sms":
                sk["Smart Sending"] *= 1.25 if camp_today else 0.8
            if bf_i is not None and bf_i - 7 <= di <= bf_i + 3 and pid in ("cart", "welcome", "post_purchase"):
                sk["Smart Sending"] = 0.0
            tot = min(0.9, sum(sk.values()))
            nsk = nrs.multinomial(int(nrs.binomial(e, tot)) if e else 0, [v / tot for v in sk.values()] + [0]) if tot else [0] * (len(REASONS) + 1)
            for r, n in zip(REASONS, nsk):
                skipped[r].append(int(n))
            dl = e - int(sum(nsk[:len(REASONS)]))
            mo, mc, mod, mu = (active(pid, k, di) for k in ("open", "click", "order", "unsub"))
            daily = 1 + nrs.normal(0, sd * 0.5)
            opens = int(nrs.binomial(dl, min(0.95, fo * mo))) if dl and fo else 0
            clicks = int(nrs.binomial(dl, min(0.5, max(0, fc * mc * daily)))) if dl else 0
            orders = int(nrs.binomial(dl, min(0.3, max(0, fod * mod * daily * (1.5 if bf_i is not None and bf_i <= di <= bf_i + 3 else 1))))) if dl else 0
            rev = float(sum(nrs.lognormal(math.log(faov) - aov_sd ** 2 / 2, aov_sd, orders))) if orders else 0.0
            unsubs = int(nrs.binomial(dl, min(0.2, fu * mu))) if dl else 0
            ent.append(e)
            for k, v in (("delivered", dl), ("opens", opens), ("clicks", clicks), ("orders", orders), ("revenue", round(rev, 2)), ("unsubs", unsubs)):
                out[k].append(v)
        streams.append({"pid": pid, "name": pname, "entered": ent, "m": out, "skipped": skipped})
    by = {x["pid"]: x for x in streams}
    # ---- credit: from day s, a share of flow orders goes to the campaign opened later (last touch)
    for st, m, v, mode in spec:
        if m in ("credit", "credit_to_sms"):
            for pid in st:
                for di in range(s if not mode.startswith("step_at") else int(mode[7:]), L.DAYS):
                    x = by[pid]["m"]; n = int(round(x["orders"][di] * v))
                    if not n or not x["orders"][di]:
                        continue
                    r = x["revenue"][di] * n / x["orders"][di]
                    x["orders"][di] -= n; x["revenue"][di] = round(x["revenue"][di] - r, 2)
                    tgt = by["sms"]["m"] if m == "credit_to_sms" else camp
                    tgt["orders"][di] += n; tgt["revenue"][di] = round(tgt["revenue"][di] + r, 2)
    flows = []
    for x in streams:
        flows.append(_stream(x["pid"], x["name"], dates, today, x["entered"], x["m"], x["skipped"], seed))
    camp_m = {k: camp[k] for k in ("delivered", "opens", "clicks", "orders", "revenue", "unsubs")}
    flows.append(_stream("camp", "Campaigns", dates, today, camp["entered"], camp_m, None, seed))
    # ---- pressure. Extra entries from overlap or re-entry are the same people again, so they add emails, not people.
    email_flows = [f for f in flows if f["fid"] not in ("sms", "camp")]
    dup = {pid: (lambda di, pid=pid: 1 - 1 / active(pid, "entered", di)) if kind in ("overlap_new_subs", "reentry_loop") else (lambda di: 0.0) for pid in FLOW_IDS}
    flow_sends = [sum(f["by_message"]["m1"]["delivered"][d] for f in email_flows) for d in range(L.DAYS)]
    people = [sum(f["entered"][d] * (1 - dup[f["fid"]](d)) for f in email_flows) * 0.8 for d in range(L.DAYS)]
    unsub_tot = [sum(f["by_message"]["m1"]["unsubs"][d] for f in flows) for d in range(L.DAYS)]
    lst, cur = [], list_size
    for d in range(L.DAYS):
        cur += int(by["welcome"]["entered"][d] * 0.9) - unsub_tot[d]
        lst.append(cur)
    press = {"camp_sent": camp["delivered"], "flow_sends": flow_sends, "flow_people": [round(x) for x in people], "list": lst,
             "sms_sent": by["sms"]["m"]["delivered"], "sms_list": int(list_size * 0.18), "cohorts": cohorts}
    case = {"id": f"m{seed % 100000}{rng.randint(100, 999)}", "kind": kind, "seed": seed, "level": 5, "program": True, "pressure": True,
            "stage": stage, "stage_badge": L.STAGES[stage]["badge"], "stage_note": L.STAGES[stage]["note"],
            "today": today.isoformat(), "dates": [d.isoformat() for d in dates], "flows": flows, "alerts": [],
            "calendar": calendar, "press": press,
            "flow": {"name": "All email and SMS", "messages": [], "type": "program"}}
    import lf_level3 as LV3
    case["band"] = LV3.program_band(case)
    _log(case, kind, rng, s, stage)
    case["truth"] = _truth(case, kind, s)
    case["symptom"] = _symptom(case, rng)
    return case


def _stream(fid, name, dates, today, entered, m, skipped, seed):
    import lifecycle_files as L
    sub = {"id": f"{fid}{seed % 1000}", "fid": fid, "kind": "stream", "level": 5, "today": today.isoformat(), "single": True,
           "dates": [d.isoformat() for d in dates], "entered": entered, "by_message": {"m1": m},
           "flow": {"name": name, "type": fid, "messages": [{"id": "m1", "name": "All campaigns" if fid == "camp" else "All messages", "day": 0, "subject": "", "features": ""}]},
           "skipped": skipped, "channel": "sms" if fid == "sms" else "email", "truth": {"kind": "stream", "since": None}}
    sub["band"] = L.band(sub)
    return sub


def _log(case, kind, rng, s, stage):
    d = lambda i: case["dates"][max(0, min(len(case["dates"]) - 1, i))]
    who = lambda: rng.choice(["Priya", "Ruth", "Theo", "Dana"])
    ch = []

    def add(i, where, k, what, w=None, cause=False):
        ch.append({"id": "", "date": d(i), "where": where, "kind": k, "what": what, "who": w or who(), "_c": cause})
    C = {
        "campaign_skips_cart": ("klaviyo", "cadence", "Campaign calendar: two more sends a week (now four)"),
        "credit_shift": ("klaviyo", "sale", "Sale week: a campaign every other day until Sunday"),
        "cadence_unsubs": ("klaviyo", "cadence", "Campaign calendar: fourth weekly send added"),
        "overlap_new_subs": ("klaviyo", "filter", "Browse and Cart: removed the 'not in Welcome Series' flow filter"),
        "quiet_week": ("klaviyo", "cadence", "Skipped this week's newsletter (team offsite)"),
        "sms_doubles_email": ("klaviyo", "sms", "SMS Cart Reminder: delay changed from 4 hours to 30 minutes (same as the email)"),
        "reentry_loop": ("klaviyo", "filter", "Browse Abandonment: re-entry set to 'Allow re-entry'"),
        "sunset_paused": ("klaviyo", "segment", "Sunset flow paused, and campaigns now go to 'Everyone' instead of 'Engaged 365 days'"),
        "giveaway_mix": ("store", "growth", "Instagram giveaway: sign up to enter (runs two weeks)"),
        "filter_skips_fine": ("klaviyo", "filter", "Post-Purchase: added 'Placed Order zero times since starting this flow'"),
        "smart_off_win": ("klaviyo", "smart", "Abandoned Cart: Smart Sending turned off"),
        "campaign_steals_and_skips": ("klaviyo", "cadence", "Campaign calendar: two more sends a week (now four)"),
        "slow_fatigue": ("klaviyo", "cadence", "Campaign calendar: 'add a send when there's news' (no weekly cap)"),
        "bfcm_pressure": ("klaviyo", "smart", "BFCM: Smart Sending off on Welcome, Cart and Post-Purchase (Klaviyo's guide)"),
        "one_campaign_unsubs": ("klaviyo", "segment", "Spring catalog sent to 'Trade show leads 2025' (imported list)"),
    }
    where, k, what = C[kind]
    add(s, where, k, what, None, kind not in ("quiet_week", "bfcm_pressure"))
    for k2, w in rng.sample(HERRINGS, HERRING_N[stage]):
        j = s + rng.choice([-1, 1]) * rng.randint(6, 14)
        add(j if 3 <= j <= len(case["dates"]) - 2 else s - rng.randint(6, 14), "klaviyo", k2, w)
    for _ in range(max(1, rng.randint(4, 6) - len(ch))):
        k2, w = rng.choice(DECOYS)
        add(rng.randint(3, len(case["dates"]) - 2), "klaviyo", k2, w)
    for c in ch:
        c["_r"] = rng.random()
    ch.sort(key=lambda c: (c["date"], c.pop("_r")))
    for n, c in enumerate(ch):
        c["id"] = f"c{n + 1}"
    case["changes"] = [{k3: v for k3, v in c.items() if k3 != "_c"} for c in ch]
    case["_cause"] = next((c["id"] for c in ch if c["_c"]), "none")
    case["_logged"] = next(c["id"] for c in ch if c["what"] == what)


def _truth(case, kind, s):
    import lifecycle_files as L
    F = {f["fid"]: f for f in case["flows"]}
    since = case["dates"][s] if kind not in NOTHING else None
    tot = lambda a, b: sum(sum(f["by_message"]["m1"]["revenue"][a:b]) for f in case["flows"])
    last = tot(49, 56); b = case["band"]
    money = round(b["mid"] - last) if last < b["lo"] else 0
    K = {   # real, where, where_ok, moved, moved_ok, actions
        "campaign_skips_cart": ("problem", "cart", ["cart", "welcome", "program"], "delivered", ["delivered"], ["fix_today", "test"]),
        "credit_shift": ("nothing", None, [None, ""], None, [None, "nothing", "orders"], ["leave", "watch"]),
        "cadence_unsubs": ("problem", "camp", ["camp"], "unsubs", ["unsubs"], ["test"]),
        "overlap_new_subs": ("problem", "welcome", ["welcome", "browse", "program"], "unsubs", ["unsubs", "entered"], ["fix_today"]),
        "quiet_week": ("nothing", None, [None, ""], None, [None, "nothing", "entered"], ["leave", "watch"]),
        "sms_doubles_email": ("problem", "sms", ["sms", "cart"], "unsubs", ["unsubs"], ["fix_today", "test"]),
        "reentry_loop": ("problem", "browse", ["browse"], "entered", ["entered", "unsubs"], ["fix_today"]),
        "sunset_paused": ("problem", "camp", ["camp"], "clicks", ["clicks", "entered", "unsubs"], ["fix_today"]),
        "giveaway_mix": ("nothing", None, [None, "", "welcome", "program"], None, [None, "nothing", "entered"], ["leave", "watch"]),
        "filter_skips_fine": ("nothing", None, [None, "", "post_purchase"], None, [None, "nothing", "delivered"], ["leave", "watch"]),
        "smart_off_win": ("good", "cart", ["cart"], "delivered", ["delivered", "orders"], ["leave", "watch"]),
        "campaign_steals_and_skips": ("problem", "program", ["program", "cart"], "delivered", ["delivered", "orders"], ["fix_today", "test"]),
        "slow_fatigue": ("problem", "camp", ["camp"], "clicks", ["clicks", "unsubs"], ["test"]),
        "bfcm_pressure": ("nothing", None, [None, ""], None, [None, "nothing", "entered", "delivered"], ["leave", "watch"]),
        "one_campaign_unsubs": ("problem", "camp", ["camp"], "unsubs", ["unsubs"], ["fix_today"]),
    }
    real, where, where_ok, moved, moved_ok, actions = K[kind]
    if real == "nothing":
        money = 0
    cause = case.pop("_cause"); logged = case.pop("_logged")
    cause_ok = [cause] if cause != "none" else ["none"]
    if kind in ("credit_shift", "giveaway_mix", "filter_skips_fine", "bfcm_pressure", "quiet_week"):
        cause_ok = [logged, "none"]           # it explains the movement, and nothing needs explaining
    evidence_extra = {"campaign_skips_cart": ["skipped"], "filter_skips_fine": ["skipped"], "smart_off_win": ["skipped"],
                      "campaign_steals_and_skips": ["skipped", "credit"], "credit_shift": ["credit"], "giveaway_mix": ["pressure"],
                      "slow_fatigue": ["pressure"], "overlap_new_subs": ["pressure"], "reentry_loop": ["pressure"],
                      "sunset_paused": ["pressure"], "one_campaign_unsubs": ["pressure"], "cadence_unsubs": ["pressure"]}.get(kind, [])
    nm = lambda fid: F[fid]["flow"]["name"] if fid in F else "the whole program"
    week = lambda fid, k, a, b: sum(F[fid]["by_message"]["m1"][k][a:b])
    if real == "good":                       # sized like Level 1's good news: what the cart flow gained, read off the Registry
        money = max(0, round(week("cart", "revenue", 49, 56) - week("cart", "revenue", 0, 28) / 4))
    extra_unsubs = lambda fid: round(week(fid, "unsubs", 49, 56) - week(fid, "unsubs", 0, 28) / 4)
    story = {
        "campaign_skips_cart": f"From {since} the calendar went to four campaigns a week. Each campaign starts the 16-hour Smart Sending timer, so more cart and welcome emails were skipped: entries held, delivered fell. Flows earn far more per email than campaigns, so the total fell.",
        "credit_shift": "A sale ran this week. Shoppers who got a flow email then opened a sale campaign before buying, and Klaviyo gives the order to the last message touched. Flow revenue fell, campaign revenue rose by about the same, the total didn't move.",
        "cadence_unsubs": f"From {since} a fourth campaign went out each week. Campaign revenue rose a little, and campaign unsubscribes rose much more: about {max(0, extra_unsubs('camp')):,} more people a week left the list.",
        "overlap_new_subs": f"From {since} browse and cart no longer exclude people in the welcome series, so new subscribers get all three on day one. Browse and cart entries rose, and welcome took the unsubscribes.",
        "quiet_week": "This week had one campaign fewer (the team offsite). Campaign revenue dipped a little, everything is inside its normal range.",
        "sms_doubles_email": f"From {since} the SMS cart reminder goes out 30 minutes after the cart, the same as the email. Email and SMS have separate Smart Sending timers, so people get both within the hour. SMS unsubscribes tripled.",
        "reentry_loop": f"From {since} browse abandonment allows re-entry, so the same people get it every time they browse. Entries jumped with no new shoppers behind them, orders per email fell and unsubscribes rose.",
        "sunset_paused": f"From {since} the sunset flow is paused and campaigns go to everyone, including people quiet for years. Campaign sends rose, click rate fell, unsubscribes rose.",
        "giveaway_mix": "A giveaway brought in a wave of signups who rarely buy. Welcome entries tripled and campaign revenue per recipient fell, but the people already on the list click and buy as before. Mix, not fatigue.",
        "filter_skips_fine": "The post-purchase flow now skips people who already bought again (a new flow filter). Skipped rose under 'Fails Flow Filters', which is the filter working. Those people buy anyway.",
        "smart_off_win": f"From {since} Smart Sending is off on the cart flow, so reminders that used to be skipped go out. Cart delivered and revenue rose, unsubscribes stayed flat. A real win.",
        "campaign_steals_and_skips": f"From {since} there are four campaigns a week. Two things happened: campaigns took credit for some flow orders (the total doesn't move for that part) and Smart Sending skipped cart and welcome emails (that part is real loss).",
        "slow_fatigue": f"From about {since} the calendar has had no weekly cap and sends crept up. People already on the list click a little less every week, and unsubscribes are creeping up. No single week jumps.",
        "bfcm_pressure": "It's Black Friday week. Following Klaviyo's own guide, Smart Sending is off on welcome, cart and post-purchase, and campaigns go out daily. Pressure doubled and unsubscribes stayed healthy. The season, not a fault.",
        "one_campaign_unsubs": f"On {since} the spring catalog also went to an imported trade-show list. That one send drew most of the week's unsubscribes. The fix is the segment, not the cadence.",
    }[kind]
    tile = lambda m: L.TILE_LABEL.get(m, "Nothing")
    expert = [
        {"credit_shift": "Not a loss: the flows are below their range, but the total isn't. The credit moved to campaigns.",
         "quiet_week": "Not real: every stream is inside its normal range.",
         "giveaway_mix": "Not a problem: the people already on the list click and buy as before. New signups pull the average down.",
         "filter_skips_fine": "Not a problem: the skips are a filter doing its job, and the total is inside its range.",
         "bfcm_pressure": "Not a problem: it's Black Friday week, set up the way Klaviyo recommends, and unsubscribes are healthy.",
         }.get(kind, "Real, and good: the cart flow earns more with nothing lost." if real == "good" else "Real: outside its normal range."),
        f"About ${money:,} a week." if money else ("Nothing at stake." if real != "problem" else "$0 this week: revenue is inside its normal range. The cost is the list."),
        {"program": "Several flows at once (cart and welcome).", None: "-"}.get(where, f"{nm(where)}."),
        f"From {since}." if since else "-",
        f"{tile(moved)} moved." if moved else "Nothing moved against normal (or only the credit did).",
        {"fix_today": "Fix it today.", "test": "Test it.", "watch": "Watch it.", "leave": "Leave it."}[actions[0]] + {
            "campaign_skips_cart": " Turn Smart Sending off on cart and welcome, or space the campaigns.", "cadence_unsubs": " Test three campaigns against four on a holdout.",
            "overlap_new_subs": " Put the welcome-series filter back on browse and cart.", "sms_doubles_email": " Stagger the SMS (or send one channel).",
            "reentry_loop": " Set browse re-entry back to a time frame.", "sunset_paused": " Restart the sunset flow and the engaged segment.",
            "campaign_steals_and_skips": " Smart Sending off on cart and welcome, and size it on the total.", "slow_fatigue": " Cap the weekly sends and test the cap.",
            "one_campaign_unsubs": " Suppress the imported segment."}.get(kind, ""),
    ]
    hints = {
        "campaign_skips_cart": ["Did fewer people enter the cart flow, or did fewer get the email?", "Open Skipped: which reason grew?", "Smart Sending, after campaigns went to four a week."],
        "credit_shift": ["Flows fell. Did the total?", "Open the Credit split.", "Flows down, campaigns up the same: credit moved."],
        "cadence_unsubs": ["Revenue is up. What did it cost?", "Campaigns: Unsubscribes, and the Pressure panel.", "A fourth campaign a week, and the unsubscribes."],
        "overlap_new_subs": ["What does a new subscriber get on day one?", "Pressure, then the welcome flow's Unsubscribes.", "Three flows at once."],
        "quiet_week": ["Is anything outside its normal range?", "The Registry, and the campaign calendar.", "One campaign fewer."],
        "sms_doubles_email": ["Which channel are people leaving?", "The SMS row in the Registry, and the log.", "The SMS now lands with the email."],
        "reentry_loop": ["More people entered browse. Are they new people?", "Pressure: the busiest tenth, and the log.", "Re-entry allowed."],
        "sunset_paused": ["Who are the campaigns going to now?", "The calendar's audience, and campaign Clicks.", "The sunset is paused."],
        "giveaway_mix": ["Did the people already on the list change?", "Pressure: existing against new subscribers.", "Only the new ones click less."],
        "filter_skips_fine": ["Skipped rose. For what reason?", "Open Skipped.", "Fails Flow Filters: the new filter working."],
        "smart_off_win": ["More cart emails went out. What did that cost?", "Cart: Got the email, Orders, Unsubscribes.", "Nothing: a win."],
        "campaign_steals_and_skips": ["How much did the total move, against the flows?", "Credit split, then Skipped.", "Part credit, part skipped."],
        "slow_fatigue": ["Is it one week, or a slide?", "Pressure: existing subscribers' clicks, all 8 weeks.", "A slow slide since the cap went."],
        "bfcm_pressure": ["What week is it?", "The calendar, and Unsubscribes against Klaviyo's bands.", "Black Friday, by the book."],
        "one_campaign_unsubs": ["Was it every campaign, or one?", "The calendar, then campaign Unsubscribes by day.", "One send to an imported list."],
    }[kind]
    return {"kind": kind, "base": "pressure", "real": real, "where": where, "where_ok": where_ok, "moved": moved, "moved_ok": moved_ok,
            "since": since, "since_tol": 21 if kind == "slow_fatigue" else 3, "money": money, "money_alt": None, "actions": actions,
            "story": story, "expert": expert, "hints": hints, "lesson": LESSONS[kind], "cause": cause, "cause_ok": cause_ok,
            "evidence_extra": evidence_extra, "cause_why": CAUSE_WHY[kind], "level5": kind}


CAUSE_WHY = {
    "campaign_skips_cart": "Two more campaigns a week: each one starts the 16-hour timer, so more flow emails are skipped.",
    "credit_shift": "The sale explains the flow drop (credit), and nothing needs fixing: either answer is right.",
    "cadence_unsubs": "The fourth weekly campaign: it lines up with the unsubscribes rising.",
    "overlap_new_subs": "Removing the welcome filter from browse and cart let all three fire for new subscribers.",
    "quiet_week": "The skipped newsletter explains the dip, and nothing is wrong: either answer is right.",
    "sms_doubles_email": "The SMS delay change: the text now lands with the email.",
    "reentry_loop": "Allowing re-entry on browse: the same people get it again and again.",
    "sunset_paused": "Pausing the sunset and sending to everyone put long-quiet people back in every campaign.",
    "giveaway_mix": "The giveaway explains the dip in revenue per recipient, and nothing is wrong: either answer is right.",
    "filter_skips_fine": "The new post-purchase filter explains the skips, and it's working: either answer is right.",
    "smart_off_win": "Turning Smart Sending off on the cart flow let the skipped reminders through.",
    "campaign_steals_and_skips": "Two more campaigns a week: they took credit and caused skips.",
    "slow_fatigue": "Dropping the weekly cap: sends crept up from there.",
    "bfcm_pressure": "Smart Sending off for BFCM explains the pressure, and it's the recommended setup: either answer is right.",
    "one_campaign_unsubs": "Sending the catalog to the imported trade-show list.",
}


def _symptom(case, rng):
    F = {f["fid"]: f for f in case["flows"]}
    flows = [f for f in case["flows"] if f["fid"] != "camp"]
    rev = lambda fs, a, b: sum(sum(f["by_message"]["m1"]["revenue"][a:b]) for f in fs)
    fw, fb = rev(flows, 49, 56), rev(flows, 0, 28) / 4
    tw, tb = rev(case["flows"], 49, 56), rev(case["flows"], 0, 28) / 4
    loud = rng.choice(flows)            # a teammate's vague mention: any stream, not the one that moved
    return rng.choice(SYMPTOMS).format(dir="down" if fw < fb else "up", pct=round(abs(fw / fb - 1) * 100), dir2="down" if tw < tb else "up",
                                       pct2=round(abs(tw / tb - 1) * 100), flow=loud["flow"]["name"], adj="off" if rev([loud], 49, 56) < rev([loud], 0, 28) / 4 else "busy")


# ---------------------------------------------------------------- tutor scaffolds
SPREAD = {k: v for k, v in {
    "campaign_skips_cart": "flows lost emails", "credit_shift": "credit moved", "cadence_unsubs": "people left", "overlap_new_subs": "people left",
    "quiet_week": "nothing", "sms_doubles_email": "people left", "reentry_loop": "people left", "sunset_paused": "people left",
    "giveaway_mix": "nothing", "filter_skips_fine": "nothing", "smart_off_win": "flows gained emails", "campaign_steals_and_skips": "flows lost emails",
    "slow_fatigue": "people left", "bfcm_pressure": "nothing", "one_campaign_unsubs": "people left"}.items()}
SPREAD_CHOICES = ["credit moved", "flows lost emails", "flows gained emails", "people left", "nothing"]
SPREAD_EXPLAIN = {"credit moved": "The total didn't move: flow revenue went to campaigns as credit. Nothing was lost.",
                  "flows lost emails": "Entries held but fewer emails went out: something (Smart Sending, a filter) skipped them. Check the reason.",
                  "flows gained emails": "More flow emails went out: check what that bought, and what it cost.",
                  "people left": "The cost shows in unsubscribes and the list, more than in this week's revenue.",
                  "nothing": "Nothing outside its normal range, once you read the total and the reason."}
