"""Lifecycle Files, Level 4: Deliverability. Each case is the account's email split by inbox provider.

Rows are providers, not flows (Gmail, Apple iCloud, Yahoo/AOL, Outlook/Hotmail, business and other domains). Each
provider is built in the Level 1 case format (one stream called "All email") with two more series, bounces and spam
complaints, so the Level 1 tiles work on it. Around it: Gmail Postmaster (spam rate and compliance status), Klaviyo's
bounce categories, and a sending log.

What the simulation encodes (sources in games/lifecycle-files/docs/DESIGN.md, "Level 4"):
  - A spam-folder email counts as delivered: inbox trouble moves opens, clicks and orders, not bounces.
  - Gmail sends no complaint feed, so Klaviyo's complaint rate has no Gmail in it; Postmaster has Gmail's.
  - Apple's privacy proxy opens nearly everything, so Apple's opens don't move when its inbox placement does.
  - Postmaster is a day late and leaves low-volume days blank; its lines are 0.10% (recommended) and 0.30% (violation).
"""
from __future__ import annotations
import math
import random
from datetime import date, timedelta

import numpy as np

PROVIDERS = [("gmail", "Gmail", 0.45), ("apple", "Apple iCloud", 0.22), ("yahoo", "Yahoo / AOL", 0.13),
             ("outlook", "Outlook / Hotmail", 0.12), ("other", "Business and other", 0.08)]
# per delivered email: open, click, order, unsubscribe, real spam complaints; bounce rate per sent; complaint feed to Klaviyo
BASE = {"gmail": (0.32, 0.022, 0.004, 0.0015, 0.0005, 0.004, False), "apple": (0.80, 0.020, 0.004, 0.0015, 0.0003, 0.003, False),
        "yahoo": (0.28, 0.018, 0.0035, 0.0015, 0.00022, 0.005, True), "outlook": (0.24, 0.016, 0.003, 0.0015, 0.00022, 0.006, True),
        "other": (0.25, 0.018, 0.0035, 0.0015, 0.00015, 0.012, True)}
CATS = ["Invalid address", "Mailbox unavailable", "Technical (DNS or authentication)", "Reputation", "Frequency/volume too high", "Content", "Unclassified"]
NORMAL_MIX = [0.45, 0.25, 0.04, 0.10, 0.05, 0.05, 0.06]
CAMPAIGN_SD = {"obvious": 0.05, "clear": 0.1, "realistic": 0.16, "subtle": 0.2}
PM_MIN = 400                                            # Postmaster leaves days under this many Gmail emails blank
WEEKDAY = [1.0, 1.5, 0.9, 1.5, 0.9, 1.3, 0.7]          # campaign days carry more

TIERS = [
    ["dns_auth_break", "gmail_spam_folder", "unengaged_blast", "apple_opens_jump", "microsoft_throttle"],
    ["unsub_header_removed", "blocklist_shared_ip", "link_blocklisted", "new_domain_spike", "frequency_complaints"],
    ["gmail_hidden_complaints", "apple_hides_spam", "low_volume_scare", "summer_dip", "fixed_already"],
]
TYPES = [k for t in TIERS for k in t]
SKILLS = {
    "dns_auth_break": ["config_vs_reputation"], "gmail_spam_folder": ["inbox_placement", "postmaster"], "unengaged_blast": ["list_hygiene"],
    "apple_opens_jump": ["opens"], "microsoft_throttle": ["config_vs_reputation"], "unsub_header_removed": ["config_vs_reputation", "postmaster"],
    "blocklist_shared_ip": ["config_vs_reputation"], "link_blocklisted": ["inbox_placement", "config_vs_reputation"],
    "new_domain_spike": ["config_vs_reputation", "list_hygiene"], "frequency_complaints": ["list_hygiene"],
    "gmail_hidden_complaints": ["postmaster", "list_hygiene"], "apple_hides_spam": ["inbox_placement", "opens"],
    "low_volume_scare": ["postmaster"], "summer_dip": [], "fixed_already": ["config_vs_reputation"],
}
FILE_NAMES = {
    "dns_auth_break": "The Missing Records", "gmail_spam_folder": "Into the Junk", "unengaged_blast": "Waking the Dead",
    "apple_opens_jump": "Phantom Opens", "microsoft_throttle": "Slow Lane", "unsub_header_removed": "No Way Out",
    "blocklist_shared_ip": "Bad Neighbors", "link_blocklisted": "The Poisoned Link", "new_domain_spike": "Too Much, Too Soon",
    "frequency_complaints": "One Email Too Many", "gmail_hidden_complaints": "What Klaviyo Can't See",
    "apple_hides_spam": "The Proxy's Cover", "low_volume_scare": "A Quiet Sunday", "summer_dip": "August",
    "fixed_already": "Yesterday's Fire",
}
LESSONS = {
    "dns_auth_break": ("Bounces jumping at every provider on the same day, in the Technical category, is configuration: check DNS and authentication first.", "authentication"),
    "gmail_spam_folder": ("A spam-folder email still counts as delivered. Clicks and orders falling at one provider, with delivered steady, is the inbox.", "inbox placement"),
    "unengaged_blast": ("One send to an old segment brings invalid addresses and complaints, and the reputation damage outlasts the send. Suppress and sunset.", "list hygiene"),
    "apple_opens_jump": ("Apple's privacy proxy opens almost everything. An Apple open rate jump with clicks flat is the proxy, not the readers.", "Apple Mail Privacy Protection"),
    "microsoft_throttle": ("One provider delivering less while nothing changed on your side is that provider's view of your reputation. Slow down there and escalate.", "throttling"),
    "unsub_header_removed": ("Take away one-click unsubscribe and people press Report spam instead. Gmail and Yahoo require it.", "one-click unsubscribe"),
    "blocklist_shared_ip": ("Bounces at business domains and Outlook, not Gmail, on a shared sending pool: a blocklist. Escalate to Klaviyo.", "blocklists"),
    "link_blocklisted": ("A link domain on a blocklist drags down every email that carries it, at every provider. Remove the link.", "content reputation"),
    "new_domain_spike": ("A new sending domain has no reputation. Doubling the volume on day one gets deferred. Warm up over weeks.", "warm-up"),
    "frequency_complaints": ("More sends to the same people means more complaints and unsubscribes per week. Test the frequency before keeping it.", "frequency"),
    "gmail_hidden_complaints": ("Gmail sends no complaint feed, so Klaviyo's complaint rate can look clean while Postmaster shows Gmail over 0.30%.", "Postmaster Tools"),
    "apple_hides_spam": ("Apple's opens hold even when the mail lands in junk. Check Apple's clicks and orders, not its opens.", "Apple Mail Privacy Protection"),
    "low_volume_scare": ("Postmaster on a tiny-volume day is a few complaints over a small number. Read the week, not the day.", "small samples"),
    "summer_dip": ("Opens and clicks a little lower everywhere, every provider inside its range: a season, not a problem.", "seasonality"),
    "fixed_already": ("The log shows a fire, but is it still burning? Bounces are back to normal: watch, don't refight it.", "still happening?"),
}
MECH = {"dns": ["bounces", "delivered"], "template": ["complaints", "unsubs"], "segment": ["bounces", "complaints"], "import": ["clicks", "orders", "bounces"],
        "link": ["clicks", "bounces", "orders"], "domain": ["delivered", "bounces"], "volume": ["delivered", "bounces"], "frequency": ["complaints", "unsubs"],
        "klaviyo_ip": ["bounces", "delivered"], "copy": [], "admin": []}
DECOYS = [("copy", "Preheader text tweaked on the newsletter"), ("copy", "Footer address updated"), ("admin", "Segment renamed for the monthly report"),
          ("admin", "New team member added to Klaviyo"), ("copy", "Alt text added to the hero images"), ("copy", "Social icons updated")]
# Sending changes that sound like they could matter but can't move these numbers: done correctly, or touching nothing a
# provider sees. They stop "any real sending change in the log means a problem" from working. Count by stage.
HERRINGS = [("dns", "DMARC report address changed to the new shared inbox"), ("domain", "DKIM key rotated (old key kept live for 7 days)"),
            ("segment", "Engaged 90 days segment rebuilt with the same rules"), ("template", "Footer unsubscribe link restyled (header untouched)"),
            ("link", "UTM tags added to campaign links"), ("volume", "Weekly newsletter moved from Tuesday to Wednesday")]
HERRING_N = {"obvious": 0, "clear": 1, "realistic": 1, "subtle": 2}
SYMPTOMS = [
    "Dana: email revenue is {dir} {pct}% this week. Are we landing in spam?",
    "Ruth: open rates look off in the weekly report. Anything wrong with deliverability?",
    "Priya: Klaviyo's deliverability score is at {score}. Should we worry?",
    "Slack #retention: someone said our emails are going to junk. Can you check?",
    "Dana: our bounce rate looks {badj} this week. What's going on?",
]


def _spec(kind: str, rng: random.Random, S: float, s: int) -> list[tuple]:
    """Fault pieces: (providers, metric, value, category, mode, days). Metrics multiply a rate, except bounce_add, which adds
    bounce rate in a Klaviyo category. Modes: step from day s, spike on day s, ramp over 4 days, window for `days` days."""
    dn = lambda f: 1 - min(0.75, (1 - f) * S)
    up = lambda f: 1 + (f - 1) * S
    ALL = ("gmail", "apple", "yahoo", "outlook", "other")
    sp = {
        "dns_auth_break": [(ALL, "bounce_add", min(0.7, rng.uniform(0.25, 0.5) * S), 2, "step", 0)],
        "gmail_spam_folder": [(("gmail",), "open", dn(0.5), None, "ramp", 0), (("gmail",), "click", dn(0.45), None, "ramp", 0),
                              (("gmail",), "order", dn(0.45), None, "ramp", 0), (("gmail",), "complaint", up(3.5), None, "ramp", 0)],
        "unengaged_blast": [(ALL, "sent", up(2.4), None, "spike", 0), (ALL, "bounce_add", min(0.2, 0.05 * S), 0, "spike", 0),
                            (ALL, "complaint", up(7.0), None, "spike", 0), (ALL, "open", 0.6, None, "spike", 0), (ALL, "click", 0.5, None, "spike", 0)],
        "apple_opens_jump": [(("apple",), "open", min(1.2, up(1.12)), None, "step", 0)],
        "microsoft_throttle": [(("outlook",), "bounce_add", min(0.6, rng.uniform(0.2, 0.35) * S), 4, "step", 0)],
        "unsub_header_removed": [(("gmail", "yahoo", "outlook"), "complaint", up(rng.uniform(3, 5)), None, "step", 0), (ALL, "unsub", rng.uniform(0.45, 0.6), None, "step", 0)],
        "blocklist_shared_ip": [(("other",), "bounce_add", min(0.5, rng.uniform(0.15, 0.3) * S), 3, "step", 0),
                                (("outlook",), "bounce_add", min(0.2, 0.05 * S), 3, "step", 0)],
        "link_blocklisted": [(("gmail", "yahoo", "outlook", "other"), "open", dn(0.8), None, "step", 0), (ALL, "click", dn(0.55), None, "step", 0), (ALL, "order", dn(0.6), None, "step", 0),
                             (("other", "outlook"), "bounce_add", min(0.15, 0.04 * S), 5, "step", 0)],
        "new_domain_spike": [(ALL, "sent", up(2.0), None, "step", 0), (("gmail", "outlook"), "bounce_add", min(0.4, 0.18 * S), 4, "step", 0),
                             (("gmail",), "open", dn(0.7), None, "step", 0), (("gmail",), "click", dn(0.7), None, "step", 0)],
        "frequency_complaints": [(ALL, "sent", rng.uniform(1.3, 1.5), None, "step", 0), (ALL, "complaint", up(2.6), None, "step", 0), (ALL, "unsub", up(2.0), None, "step", 0)],
        "gmail_hidden_complaints": [(("gmail",), "complaint", rng.uniform(0.0034, 0.0045) * min(1.5, max(1, S)) / 0.0005, None, "ramp", 0), (("gmail",), "open", dn(0.9), None, "ramp", 0),
                                    (("gmail",), "click", dn(0.88), None, "ramp", 0), (("gmail",), "order", dn(0.88), None, "ramp", 0)],
        "apple_hides_spam": [(("apple",), "click", dn(0.45), None, "step", 0), (("apple",), "order", dn(0.45), None, "step", 0)],
        "low_volume_scare": [(("gmail",), "sent", 0.08, None, "spike", 0), (("gmail",), "complaint", 10.0, None, "spike", 0)],
        "summer_dip": [(ALL, "open", 0.93, None, "step", 0), (ALL, "click", 0.92, None, "step", 0)],
        "fixed_already": [(ALL, "bounce_add", 0.45, 2, "window", 3)],
    }
    return sp[kind]


def _factor(piece, di: int, s: int) -> float | None:
    provs, metric, v, cat, mode, days = piece
    if mode == "step" and di >= s:
        return v
    if mode == "spike" and di == s:
        return v
    if mode == "ramp" and di >= s:
        f = min(1.0, (di - s + 1) / 4)
        return 1 + (v - 1) * f if metric != "bounce_add" else v * f
    if mode == "window" and s <= di < s + days:
        return v
    return None


def make_account(kind: str, seed: int, stage: str = "realistic") -> dict:
    import lifecycle_files as L
    rng, nrs = random.Random(seed), np.random.default_rng(seed)
    S = L.STAGES[stage]["fault"]
    today = date(2026, rng.choice([5, 6, 7, 8]) if kind == "summer_dip" else rng.randint(1, 10), rng.randint(1, 28))
    if date(today.year, 11, 15) <= today <= date(today.year, 12, 10):
        today -= timedelta(days=30)
    dates = [today - timedelta(days=L.DAYS - i) for i in range(L.DAYS)]
    s = (rng.randint(20, 28) if kind == "fixed_already" else L.DAYS - 2 if kind == "low_volume_scare"
         else rng.randint(50, 54) if kind == "unengaged_blast" else rng.randint(34, 48))
    weekly = rng.randint(150_000, 600_000)
    spec = _spec(kind, rng, S, s)
    aov_sd = L.STAGES[stage]["aov_sd"]
    # each day's campaign does better or worse for everyone: one subject line pulls, the next doesn't. The same campaign
    # goes to every provider, so this moves them together, plus a little of each provider's own.
    sd = CAMPAIGN_SD[stage]
    camp = {k: nrs.lognormal(-(sd * w) ** 2 / 2, sd * w, L.DAYS) for k, w in (("open", 0.5), ("click", 1.0), ("order", 1.0), ("complaint", 1.4), ("bounce", 0.8))}
    flows, pm_comp, pm_deliv = [], [0.0] * L.DAYS, [0.0] * L.DAYS
    for pid, pname, share in PROVIDERS:
        o, c, od, u, comp, bnc, fbl = BASE[pid]
        out = {k: [] for k in ("delivered", "opens", "clicks", "orders", "revenue", "unsubs", "bounces", "complaints")}
        sent_series, cats = [], {k: [] for k in CATS}
        own = {k: nrs.lognormal(-(sd * 0.35) ** 2 / 2, sd * 0.35, L.DAYS) for k in camp}
        for di, dd in enumerate(dates):
            cf = {k: camp[k][di] * own[k][di] for k in camp}
            mult = {"open": 1, "click": 1, "order": 1, "unsub": 1, "complaint": 1, "sent": 1}
            add = [0.0] * len(CATS)
            for piece in spec:
                if pid not in piece[0]:
                    continue
                f = _factor(piece, di, s)
                if f is None:
                    continue
                if piece[1] == "bounce_add":
                    add[piece[3]] += f
                else:
                    mult[piece[1]] *= f
            sent = int(nrs.poisson(weekly / 7 * WEEKDAY[dd.weekday()] * share * mult["sent"]))
            base_b = [bnc * m for m in NORMAL_MIX]
            rates = [min(0.95, b + a) for b, a in zip(base_b, add)]
            rates = [r * cf["bounce"] if a == 0 else r for r, a in zip(rates, add)]
            tot_rate = min(0.95, sum(rates))
            bounces = int(nrs.binomial(sent, tot_rate)) if sent else 0
            split = nrs.multinomial(bounces, [r / tot_rate for r in rates]) if bounces else [0] * len(CATS)
            for k, n in zip(CATS, split):
                cats[k].append(int(n))
            dl = sent - bounces
            opens = int(nrs.binomial(dl, min(0.97, o * mult["open"] * (cf["open"] if pid != "apple" else 1)))) if dl else 0
            clicks = int(nrs.binomial(dl, min(0.5, c * mult["click"] * cf["click"]))) if dl else 0
            orders = int(nrs.binomial(dl, min(0.2, od * mult["order"] * cf["order"]))) if dl else 0
            rev = float(sum(nrs.lognormal(math.log(150) - aov_sd ** 2 / 2, aov_sd, orders))) if orders else 0.0
            unsubs = int(nrs.binomial(dl, min(0.2, u * mult["unsub"]))) if dl else 0
            cmp = int(nrs.binomial(dl, min(0.2, comp * mult["complaint"] * cf["complaint"]))) if dl else 0
            sent_series.append(sent)
            for k, v in (("delivered", dl), ("opens", opens), ("clicks", clicks), ("orders", orders), ("revenue", round(rev, 2)),
                         ("unsubs", unsubs), ("bounces", bounces), ("complaints", cmp if fbl else 0)):
                out[k].append(v)
            if pid == "gmail":
                pm_comp[di] = cmp; pm_deliv[di] = dl
        sub = {"id": f"{pid}{seed % 1000}", "fid": pid, "kind": "provider", "level": 4, "today": today.isoformat(),
               "dates": [d.isoformat() for d in dates], "entered": sent_series, "by_message": {"m1": out},
               "flow": {"name": pname, "type": pid, "messages": [{"id": "m1", "name": "All email", "day": 0, "subject": "", "features": ""}]},
               "bounce_cats": cats, "feed": fbl, "truth": {"kind": "provider", "since": None}}
        sub["band"] = L.band(sub)
        flows.append(sub)
    # Postmaster: Gmail's spam rate per day, a day late, blank under a minimum volume
    pm = []
    for di in range(L.DAYS):
        if di == L.DAYS - 1 or pm_deliv[di] < PM_MIN:
            pm.append(None)
        else:
            pm.append(pm_comp[di] / pm_deliv[di])
    compliance = {"SPF": "Compliant", "DKIM": "Compliant", "DMARC alignment": "Compliant", "One-click unsubscribe": "Compliant", "TLS": "Compliant"}
    if kind == "dns_auth_break":
        compliance.update({"SPF": "Needs work", "DKIM": "Needs work", "DMARC alignment": "Needs work"})
    if kind == "unsub_header_removed":
        compliance["One-click unsubscribe"] = "Needs work"
    case = {"id": f"d{seed % 100000}{rng.randint(100, 999)}", "kind": kind, "seed": seed, "level": 4, "program": True, "providers": True,
            "stage": stage, "stage_badge": L.STAGES[stage]["badge"], "stage_note": L.STAGES[stage]["note"],
            "today": today.isoformat(), "dates": [d.isoformat() for d in dates], "flows": flows, "alerts": [],
            "postmaster": {"spam_rate": pm, "compliance": compliance,
                           # the week's rate is complaints over emails across the shown days, not an average of daily percents
                           "week_rate": sum(pm_comp[d] for d in range(48, 55) if pm[d] is not None) / max(1, sum(pm_deliv[d] for d in range(48, 55) if pm[d] is not None)),
                           "week_volume": sum(pm_deliv[48:55])}, "flow": {"name": "All email", "messages": [], "type": "account"}}
    import lf_level3 as LV3
    case["band"] = LV3.program_band(case)
    _log(case, kind, rng, s, stage)
    case["truth"] = _truth(case, kind, s, rng)
    case["score"] = score(case)
    case["symptom"] = _symptom(case, kind, rng)
    return case


def _log(case, kind, rng, s, stage="realistic"):
    d = lambda i: case["dates"][max(0, min(len(case["dates"]) - 1, i))]
    who = lambda: rng.choice(["Priya", "Ruth", "Theo", "Dana"])
    ch, cause = [], []

    def add(i, where, k, what, w=None, is_cause=False):
        ch.append({"id": "", "date": d(i), "where": where, "kind": k, "what": what, "who": w or who(), "_c": is_cause})
    if kind in ("dns_auth_break", "fixed_already"):
        add(s, "store", "dns", "Domain DNS moved to a new host (records copied by hand)", "Web team", True)
        if kind == "fixed_already":
            add(s + 3, "store", "dns", "Klaviyo's sending records restored on the new DNS host", "Web team")
    elif kind == "unengaged_blast":
        add(s, "klaviyo", "segment", "Sale sent to 'Everyone ever subscribed' (includes 2+ years unengaged)", None, True)
    elif kind == "unsub_header_removed":
        add(s, "klaviyo", "template", "Master template rebuilt; custom header block replaced", None, True)
    elif kind == "blocklist_shared_ip":
        add(s, "klaviyo", "klaviyo_ip", "Klaviyo status: part of a shared sending pool listed on a blocklist (investigating)", "Klaviyo", True)
    elif kind == "link_blocklisted":
        add(s, "klaviyo", "link", "Link shortener added to the campaign template", None, True)
    elif kind == "new_domain_spike":
        add(s, "klaviyo", "domain", "Sending switched to the new branded domain", None, True)
        add(s, "klaviyo", "volume", "Sale sent to all 250K subscribers")
    elif kind == "frequency_complaints":
        add(s, "klaviyo", "frequency", "Added a third weekly campaign", None, True)
    elif kind == "gmail_hidden_complaints":
        add(s, "klaviyo", "segment", "Winback now goes to everyone 365+ days quiet, weekly", None, True)
    elif kind == "apple_hides_spam":
        add(s, "klaviyo", "import", "Imported 30K contacts from an old pop-up list", None, True)
    nothing_now = kind in ("apple_opens_jump", "low_volume_scare", "summer_dip", "fixed_already")
    for k, w in rng.sample(HERRINGS, HERRING_N[stage]):
        if nothing_now:
            i = rng.randint(28, len(case["dates"]) - 2)            # recent, and still nothing moved
        else:
            i = s + rng.choice([-1, 1]) * rng.randint(6, 14)       # far enough from the start that the dates rule it out
            i = i if 3 <= i <= len(case["dates"]) - 2 else s - rng.randint(6, 14)
        add(i, "klaviyo", k, w)
    for _ in range(max(1, rng.randint(4, 6) - len(ch))):             # same log length for every type
        k, w = rng.choice(DECOYS)
        add(rng.randint(3, len(case["dates"]) - 2), "klaviyo", k, w)
    for c in ch:
        c["_r"] = rng.random()
    ch.sort(key=lambda c: (c["date"], c.pop("_r")))
    for i, c in enumerate(ch):
        c["id"] = f"c{i + 1}"
    case["changes"] = [{k: v for k, v in c.items() if k != "_c"} for c in ch]
    case["_cause"] = next((c["id"] for c in ch if c["_c"]), "none")


def _rates(f, a, b):
    m = f["by_message"]["m1"]; sent = sum(f["entered"][a:b])
    dl = sum(m["delivered"][a:b])
    return {"sent": sent, "delivered": dl, "bounce": sum(m["bounces"][a:b]) / max(1, sent), "complaint": sum(m["complaints"][a:b]) / max(1, dl),
            "open": sum(m["opens"][a:b]) / max(1, dl), "click": sum(m["clicks"][a:b]) / max(1, dl), "order": sum(m["orders"][a:b]) / max(1, dl),
            "unsub": sum(m["unsubs"][a:b]) / max(1, dl), "revenue": sum(m["revenue"][a:b])}


def score(case) -> int:
    """A Klaviyo-style 0-100 score over the last 30 days (opens, clicks, bounces, unsubscribes, complaints)."""
    tot = lambda k: sum(sum(f["by_message"]["m1"][k][-30:]) for f in case["flows"])
    sent = sum(sum(f["entered"][-30:]) for f in case["flows"]); dl = tot("delivered")
    b, c, u = tot("bounces") / max(1, sent), tot("complaints") / max(1, dl), tot("unsubs") / max(1, dl)
    cl = tot("clicks") / max(1, dl)
    sc = 100 - min(40, b * 1500) - min(30, c * 30000) - min(15, max(0, u - 0.002) * 4000) - min(15, max(0, 0.015 - cl) * 1500)
    return max(0, min(100, round(sc)))


def _truth(case, kind, s, rng):
    import lifecycle_files as L
    flows = {f["fid"]: f for f in case["flows"]}
    since = case["dates"][s] if kind not in ("low_volume_scare", "summer_dip", "fixed_already", "apple_opens_jump") else None
    if kind == "summer_dip":
        since = None
    last_w = sum(sum(f["by_message"]["m1"]["revenue"][49:56]) for f in case["flows"])
    b = case["band"]                   # the dollars the account card shows: a normal week minus the last 7 days, when it's below normal
    lost = round(b["mid"] - last_w) if last_w < b["lo"] else 0
    K = {   # real, where, where_ok, moved, moved_ok, actions
        "dns_auth_break": ("problem", "program", ["program"], "bounces", ["bounces", "delivered"], ["fix_today", "escalate"]),
        "gmail_spam_folder": ("problem", "gmail", ["gmail"], "clicks", ["clicks", "orders", "opens", "complaints"], ["fix_today", "test"]),
        "unengaged_blast": ("problem", "program", ["program"], "bounces", ["bounces", "complaints"], ["fix_today"]),
        "apple_opens_jump": ("nothing", None, [None, "apple", ""], "opens", ["opens", "nothing"], ["leave", "watch"]),
        "microsoft_throttle": ("problem", "outlook", ["outlook"], "delivered", ["delivered", "bounces"], ["escalate", "watch"]),
        "unsub_header_removed": ("problem", "program", ["program", "gmail"], "complaints", ["complaints", "unsubs"], ["fix_today"]),
        "blocklist_shared_ip": ("problem", "other", ["other", "program"], "bounces", ["bounces", "delivered"], ["escalate"]),
        "link_blocklisted": ("problem", "program", ["program"], "clicks", ["clicks", "orders", "bounces"], ["fix_today"]),
        "new_domain_spike": ("problem", "program", ["program", "gmail"], "delivered", ["delivered", "bounces"], ["fix_today", "test"]),
        "frequency_complaints": ("problem", "program", ["program"], "complaints", ["complaints", "unsubs"], ["test", "fix_today"]),
        "gmail_hidden_complaints": ("problem", "gmail", ["gmail"], "complaints", ["complaints", "clicks", "opens", "orders"], ["fix_today"]),
        "apple_hides_spam": ("problem", "apple", ["apple"], "clicks", ["clicks", "orders"], ["fix_today"]),
        "low_volume_scare": ("nothing", None, [None, ""], None, [None, "nothing"], ["watch", "leave"]),
        "summer_dip": ("nothing", None, [None, ""], None, [None, "nothing"], ["watch", "leave"]),
        "fixed_already": ("nothing", None, [None, ""], None, [None, "nothing"], ["watch", "leave"]),
    }
    real, where, where_ok, moved, moved_ok, actions = K[kind]
    money = lost if real == "problem" else 0     # list and complaint problems often cost nothing this week: the cost is reputation
    cause = case.pop("_cause")
    ids = lambda *kinds: [c["id"] for c in case["changes"] if c["kind"] in kinds]
    cause_ok = {"fixed_already": ids("dns") + ["none"], "new_domain_spike": ids("domain", "volume")}.get(kind, [cause])
    evidence_extra = {"gmail_hidden_complaints": ["postmaster"], "low_volume_scare": ["postmaster"], "gmail_spam_folder": ["postmaster"],
                      "dns_auth_break": ["bounce_details"], "blocklist_shared_ip": ["bounce_details"], "microsoft_throttle": ["bounce_details"],
                      "unsub_header_removed": ["postmaster"]}.get(kind, [])
    name = lambda pid: flows[pid]["flow"]["name"] if pid in flows else "every provider"
    pm7 = case["postmaster"]["week_rate"]
    story = {
        "dns_auth_break": f"On {since} the domain's DNS moved hosts and Klaviyo's sending records didn't come with it. From that day bounces jumped at every provider, in the Technical (DNS or authentication) category, and Postmaster's compliance flags SPF, DKIM and DMARC.",
        "gmail_spam_folder": f"From {since} Gmail started sending more of the mail to spam. Delivered held (spam-folder mail counts as delivered), but Gmail clicks and orders fell and Postmaster's spam rate rose to about {pm7 * 100:.2f}%.",
        "unengaged_blast": f"On {since} a sale went to everyone ever subscribed, including people quiet for years: invalid-address bounces and complaints spiked that day. The revenue cost is small; the reputation cost comes later.",
        "apple_opens_jump": "Apple's open rate rose with nothing else moving. Apple's privacy proxy opens mail in the background, so its opens track the proxy, not readers.",
        "microsoft_throttle": f"From {since} only Outlook and Hotmail delivered less, with volume and reputation bounces, and nothing changed on our side. Microsoft is rate-limiting on reputation.",
        "unsub_header_removed": f"On {since} the master template was rebuilt and the one-click unsubscribe header went with it. Complaints rose at Gmail and Yahoo, unsubscribes fell, and Postmaster's compliance flags one-click unsubscribe.",
        "blocklist_shared_ip": f"From {since} business domains bounced on reputation, Outlook a little, Gmail barely: the pattern of a blocklist. Klaviyo's status note confirms part of the shared pool is listed.",
        "link_blocklisted": f"From {since} clicks and orders fell at every provider and business domains started bouncing on content, right after a link shortener went into the template. Shortener domains are often on domain blocklists.",
        "new_domain_spike": f"On {since} sending moved to a new domain and, the same day, a sale went to all 250K. A domain with no history sending double: Gmail and Outlook deferred and delivered fell.",
        "frequency_complaints": f"From {since} a third weekly campaign went out. Sends rose about a third, and complaints and unsubscribes rose faster than that.",
        "gmail_hidden_complaints": f"From {since} the winback went weekly to everyone a year quiet. Klaviyo's complaint rate looks clean because Gmail sends no complaint feed, but Postmaster shows Gmail's spam rate at about {pm7 * 100:.2f}%, past the 0.30% line.",
        "apple_hides_spam": f"From {since} Apple iCloud started filing more of the mail as junk after an old list was imported. Apple's opens didn't move (the proxy opens everything), but Apple's clicks and orders fell.",
        "low_volume_scare": "One day's Postmaster number spiked, on a day Gmail got almost no email. A few complaints over a tiny number. The week's rate is normal.",
        "summer_dip": "Opens and clicks dipped a little at every provider, each inside its normal range. A summer week, not a deliverability problem.",
        "fixed_already": "The DNS broke about three weeks ago and bounces spiked for three days, then the records were restored. Everything since is normal.",
    }[kind]
    expert = [
        {"nothing": "Not real now: every provider is inside its normal range."}.get(real, "Real: outside the normal range."),
        f"About ${money:,} a week of revenue." if money else ("Nothing at stake this week." if real == "nothing" else "$0 this week: revenue is inside its normal range. The cost is next month's inbox, not this week's sales."),
        {"program": "Every provider moved together.", None: "-"}.get(where, f"{name(where)} only."),
        f"From {since}." if since else "-",
        {"bounces": "Bounces moved.", "clicks": "Clicks and orders moved, delivered didn't.", "delivered": "Delivered fell.",
         "complaints": "Spam complaints moved.", "opens": "Only opens moved.", None: "Nothing moved against normal."}[moved],
        {"fix_today": "Fix it today.", "escalate": "Escalate to Klaviyo support.", "test": "Test the change.", "watch": "Watch it.", "leave": "Leave it."}[actions[0]]
        + {"dns_auth_break": " Restore Klaviyo's records on the new DNS host.", "unengaged_blast": " Suppress the unengaged and set up a sunset flow.",
           "gmail_spam_folder": " Narrow sends to engaged subscribers until Gmail recovers.", "microsoft_throttle": " Slow Outlook sends and ask Klaviyo.",
           "unsub_header_removed": " Put the one-click unsubscribe header back.", "blocklist_shared_ip": " Ask Klaviyo; a branded domain helps long term.",
           "link_blocklisted": " Remove the shortener and use the brand's own links.", "new_domain_spike": " Ramp volume over weeks, engaged first.",
           "frequency_complaints": " Test the third campaign against two.", "gmail_hidden_complaints": " Stop the weekly winback to the long-quiet and sunset them.",
           "apple_hides_spam": " Suppress the imported contacts who never engage."}.get(kind, ""),
    ]
    hints = {
        "dns_auth_break": ["Did one provider move, or all of them on the same day?", "Open Bounce details and Postmaster's compliance checks.", "Technical bounces everywhere after the DNS move."],
        "gmail_spam_folder": ["Gmail delivered holds. What happened to its clicks?", "Open Gmail, then Postmaster.", "Gmail clicks down, spam rate up: the spam folder."],
        "unengaged_blast": ["Was it one day or the whole week?", "Bounce details: which category?", "One send to the long-unengaged."],
        "apple_opens_jump": ["Did clicks move with the opens?", "Open Apple and compare Opens with Clicks.", "Only Apple's opens: the proxy."],
        "microsoft_throttle": ["Is it one provider?", "The provider table, delivered column.", "Only Outlook, and nothing changed: throttling."],
        "unsub_header_removed": ["Complaints up, unsubscribes down: why would people stop unsubscribing?", "Postmaster compliance, and the sending log.", "One-click unsubscribe went missing."],
        "blocklist_shared_ip": ["Which providers bounce, and which don't?", "Bounce details by provider.", "Business domains and Outlook: a blocklist."],
        "link_blocklisted": ["Every provider's clicks fell together. What changed in every email?", "The sending log.", "The link shortener."],
        "new_domain_spike": ["How many emails went out against normal?", "Sent and delivered, then the log.", "A new domain sending double."],
        "frequency_complaints": ["Complaints rose. Did sends rise too?", "The log and each provider's Sent tile.", "A third weekly campaign."],
        "gmail_hidden_complaints": ["Can Klaviyo see Gmail's complaints?", "Open Postmaster.", "Postmaster's spam rate is past 0.30%."],
        "apple_hides_spam": ["Apple opens look fine. What about Apple clicks?", "Open Apple: Opens against Clicks and Orders.", "Apple clicks fell; the proxy hides it."],
        "low_volume_scare": ["How much email did Gmail get that day?", "Postmaster, and Gmail's Sent tile.", "A tiny-volume day."],
        "summer_dip": ["Is any provider outside its range?", "The provider table against normal.", "None: a season."],
        "fixed_already": ["Is it still happening?", "The last two weeks of bounces.", "It was fixed three weeks ago."],
    }[kind]
    return {"kind": kind, "base": "provider", "real": real, "where": where, "where_ok": where_ok, "moved": moved, "moved_ok": moved_ok,
            "since": since, "since_tol": 3, "money": money, "money_alt": None, "actions": actions, "story": story, "expert": expert,
            "hints": hints, "lesson": LESSONS[kind], "cause": cause, "cause_ok": cause_ok, "evidence_extra": evidence_extra, "cause_why": ("None of these: nothing needs explaining. The log's sending changes didn't move anything." if real == "nothing" and kind != "fixed_already"
                  else "The DNS move broke it and the restore fixed it, so either that or 'None of these' (nothing is wrong now)." if kind == "fixed_already" else story),
            "level4": kind}


def _symptom(case, kind, rng):
    w = [sum(sum(f["by_message"]["m1"]["revenue"][i:i + 7]) for f in case["flows"]) for i in range(0, 56, 7)]
    base = sum(w[:4]) / 4
    b = sum(sum(f["by_message"]["m1"]["bounces"][49:56]) for f in case["flows"]) / max(1, sum(sum(f["entered"][49:56]) for f in case["flows"]))
    return rng.choice(SYMPTOMS).format(dir="down" if w[-1] < base else "up", pct=round(abs(w[-1] / base - 1) * 100), score=case["score"],
                                       badj="high" if b > 0.01 else "normal, but something feels off")


# ---------------------------------------------------------------- tutor scaffolds: computed per case type from the planted fault
SPREAD = {"dns_auth_break": "all of them", "gmail_spam_folder": "one provider", "unengaged_blast": "all of them", "apple_opens_jump": "none of them",
          "microsoft_throttle": "one provider", "unsub_header_removed": "several", "blocklist_shared_ip": "several", "link_blocklisted": "all of them",
          "new_domain_spike": "several", "frequency_complaints": "all of them", "gmail_hidden_complaints": "one provider", "apple_hides_spam": "one provider",
          "low_volume_scare": "none of them", "summer_dip": "none of them", "fixed_already": "none of them"}
CAUSE_KINDS = ["setup", "reputation", "the list", "nothing now"]
CAUSE_KIND = {"dns_auth_break": "setup", "gmail_spam_folder": "reputation", "unengaged_blast": "the list", "apple_opens_jump": "nothing now",
              "microsoft_throttle": "reputation", "unsub_header_removed": "setup", "blocklist_shared_ip": "reputation", "link_blocklisted": "reputation",
              "new_domain_spike": "reputation", "frequency_complaints": "the list", "gmail_hidden_complaints": "the list", "apple_hides_spam": "the list",
              "low_volume_scare": "nothing now", "summer_dip": "nothing now", "fixed_already": "nothing now"}
CAUSE_EXPLAIN = {"setup": "Setup: DNS records, authentication or headers. Mail gets refused or flagged no matter how good it is. Fix it today.",
                 "reputation": "Reputation: how a provider (or a blocklist) judges your domain, your links or your sending pool. It shows as spam-folder placement, throttling or reputation bounces.",
                 "the list": "The list: who you send to and how often. Old, unengaged or imported contacts and extra sends bring complaints and bad addresses.",
                 "nothing now": "Nothing now: the numbers are inside normal, or the problem already ended."}
