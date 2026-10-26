"""Lifecycle Files, Level 3: The whole program. Each case is five flows on the same dates, one Level 1 case each.

The player sees the program total, the Registry (every flow against its own normal), the Today inbox (alerts) and can
open any flow into the Level 1 view. "Where?" is a flow, or the whole program.

Today's alerts follow a common, simple rule on purpose: revenue per recipient moving 15% or more week over week,
with how sure that is from the flow's size. It misses a volume drop (the rate holds) and a slow slide (no single week
jumps), which is what the trap cases teach. Design: games/lifecycle-files/docs/DESIGN.md, "Level 3".
"""
from __future__ import annotations
import random
from datetime import date, timedelta

TIERS = [
    ["one_flow_drop", "one_flow_win", "all_normal", "all_tracking", "small_scary"],
    ["shared_checkout", "shared_delivery", "two_problems", "alert_storm", "bf_program"],
    ["offsetting", "mix_shift", "wrong_alarm", "quiet_slide", "shared_entries"],
]
TYPES = [k for t in TIERS for k in t]
FLOWS = ["cart", "welcome", "browse", "post_purchase", "winback"]
SIZE = {"cart": (9000, 22000), "welcome": (6000, 15000), "browse": (2500, 8000), "post_purchase": (3000, 9000), "winback": (900, 3000)}
SKILLS = {   # Level 3 skills each case type adds
    "one_flow_drop": ["dollars_not_percent"], "one_flow_win": ["dollars_not_percent"], "all_normal": ["alert_reading"],
    "all_tracking": ["shared_cause"], "small_scary": ["dollars_not_percent"], "shared_checkout": ["shared_cause"],
    "shared_delivery": ["shared_cause"], "two_problems": ["dollars_not_percent"], "alert_storm": ["alert_reading"],
    "bf_program": ["alert_reading"], "offsetting": ["dollars_not_percent"], "mix_shift": ["shared_cause"],
    "wrong_alarm": ["alert_reading"], "quiet_slide": ["alert_reading"], "shared_entries": ["shared_cause"],
}
FILE_NAMES = {
    "one_flow_drop": "Follow the Money", "one_flow_win": "Who Gets the Credit", "all_normal": "A Quiet Week",
    "all_tracking": "The Blackout", "small_scary": "Loud but Small", "shared_checkout": "The Common Door",
    "shared_delivery": "Return to Sender", "two_problems": "Two Fires", "alert_storm": "The Alert Storm",
    "bf_program": "The Hangover", "offsetting": "The Hidden Leak", "mix_shift": "The Shifting Crowd",
    "wrong_alarm": "The Wrong Alarm", "quiet_slide": "Nobody Rang the Bell", "shared_entries": "The Empty Lobby",
}
LESSONS = {
    "one_flow_drop": ("Break the program total down by flow and follow the dollars. One flow usually carries the change.", "contribution analysis"),
    "one_flow_win": ("A program win has an address too. Find the flow, then the email, then what changed.", "contribution analysis"),
    "all_normal": ("Five flows each inside their range add up to a total that wobbles. Nothing to chase.", "signal vs noise"),
    "all_tracking": ("Every flow's orders vanished on the same day while clicks held: one shared cause, the tracking.", "common cause"),
    "small_scary": ("A 40% drop on a small flow can be worth less than a 5% drop on a big one. Rank by dollars.", "prioritization"),
    "shared_checkout": ("Orders down in every flow at once, clicks fine: the shared door is the site. Escalate once, not five times.", "common cause"),
    "shared_delivery": ("Fewer emails delivered across every flow: sending or the inbox, not five content problems.", "common cause"),
    "two_problems": ("Two real problems: fix the one worth more first, and say so.", "prioritization"),
    "alert_storm": ("Alerts on small flows are often chance. Read how sure each one is before you act.", "alert fatigue"),
    "bf_program": ("The whole program falls after Black Friday every year. The calendar, not a fault.", "seasonality"),
    "offsetting": ("A flat total can hide a real problem when another flow is up. Check every flow, not just the sum.", "offsetting effects"),
    "mix_shift": ("The program's rate fell, every flow's didn't: a low-earning flow grew. That's mix, not breakage.", "mix shift"),
    "wrong_alarm": ("The alert watches the rate. A flow losing people keeps its rate and never rings. Check volume too.", "alert blind spots"),
    "quiet_slide": ("Week-over-week alerts miss slow slides. Compare with normal, not just with last week.", "alert blind spots"),
    "shared_entries": ("Fewer people entering every flow at once: traffic upstream fell. That's for whoever owns traffic.", "common cause"),
}
SYMPTOMS = [
    "Dana: flow revenue is {dir} {pct}% this week. What's going on?",
    "Ruth: the weekly report has flows {dir} {pct}% overall. Anything I should know?",
    "Today: {n} items need a look.",
    "Slack #retention: total flow revenue looks {adj} this week. Can someone check?",
    "Priya: {flow} looks {adj2} in the dashboard. Is that a problem?",
]


def alerts(prog: dict) -> list[dict]:
    """Today's alerts: revenue per recipient up or down 15%+ against the week before, with how sure that is."""
    import lifecycle_files as L
    out = []
    for f in prog["flows"]:
        t = L.totals(f)
        a = sum(t["revenue"][42:49]) / max(1, sum(t["delivered"][42:49]))
        b = sum(t["revenue"][49:56]) / max(1, sum(t["delivered"][49:56]))
        ch = b / a - 1 if a else 0
        dl = sum(t["delivered"][49:56])
        if ch <= -0.15 or ch >= 0.25:
            # how sure: outside the flow's own normal range and big enough is solid; inside its range is likely chance
            outside = b < f["band"]["lo"] or b > f["band"]["hi"]
            sure = ("solid" if dl >= 3000 else "could be chance") if outside else "likely chance"
            out.append({"flow": f["fid"], "name": f["flow"]["name"], "change": ch, "delivered": dl, "sure": sure,
                        "text": f"{f['flow']['name']}: revenue per recipient {'down' if ch < 0 else 'up'} {abs(ch) * 100:.0f}% on last week"})
    return out


def program_band(prog: dict) -> dict:
    """Normal range of the program's 7-day revenue, from the four quiet weeks."""
    import lifecycle_files as L
    rev = [sum(L.totals(f)["revenue"][d] for f in prog["flows"]) for d in range(L.DAYS)]
    rr = L.rolling(rev)
    vals = [v for v in rr[6:28] if v is not None]
    m = sum(vals) / len(vals); sd = (sum((v - m) ** 2 for v in vals) / len(vals)) ** 0.5
    return {"lo": max(0, m - 2.2 * sd), "hi": m + 2.2 * sd, "mid": m}


def weekly_total(prog: dict) -> list[float]:
    import lifecycle_files as L
    return [sum(sum(L.totals(f)["revenue"][i:i + 7]) for f in prog["flows"]) for i in range(0, L.DAYS, 7)]


DISTRACT = {"obvious": 0, "clear": 0, "realistic": 1, "subtle": 2}   # small flows dipping by chance: big percent, few dollars
NO_DISTRACT = {"all_normal", "all_tracking", "shared_checkout", "shared_delivery", "shared_entries", "bf_program", "mix_shift"}


def plan(kind: str, rng: random.Random, stage: str = "realistic") -> dict:
    """Which flow gets which pattern. Returns {ftype: (pattern, small)} plus the flow carrying the answer."""
    big = rng.choice(["cart", "welcome"])
    small = rng.choice(["winback", "browse"])
    p = {f: ("steady", False) for f in FLOWS}
    key = None
    if kind == "one_flow_drop":
        p[big] = (rng.choice(["conv_drop_all", "entries_drop", "conv_drop_one", "click_drop_one", "delivery_drop"]), False); key = big
    elif kind == "one_flow_win":
        p[big] = ("good_news", False); key = big
    elif kind == "small_scary":
        p[small] = (rng.choice(["conv_drop_all", "entries_drop"]), True); key = small
    elif kind == "all_tracking":
        p = {f: ("tracking_break", False) for f in FLOWS}
    elif kind == "shared_checkout":
        p = {f: ("conv_drop_all", False) for f in FLOWS}
    elif kind == "shared_delivery":
        p = {f: ("delivery_drop", False) for f in FLOWS}
    elif kind == "shared_entries":
        p = {f: ("entries_down", False) for f in FLOWS}
    elif kind == "two_problems":
        other = next(f for f in ("browse", "post_purchase") if f != big)
        p[big] = ("conv_drop_all", False); p[other] = (rng.choice(["conv_drop_all", "click_drop_one"]), True); key = big
    elif kind == "alert_storm":
        for f in ("winback", "browse", "post_purchase"):
            p[f] = ("noise_alarm", True)
        p[big] = (rng.choice(["conv_drop_all", "conv_drop_one", "click_drop_one"]), False); key = big
    elif kind == "bf_program":
        p = {f: ("black_friday" if f in ("cart", "welcome", "browse") else "steady", False) for f in FLOWS}
    elif kind == "offsetting":
        down = big; upf = "welcome" if big == "cart" else "cart"
        p[down] = ("conv_drop_all", False); p[upf] = ("good_news", False); key = down
    elif kind == "mix_shift":
        p["browse"] = ("volume_up", False); p["post_purchase"] = ("volume_up", False)
    elif kind == "wrong_alarm":
        p[small] = ("noise_alarm", True); p[big] = ("entries_drop", False); key = big
    elif kind == "quiet_slide":
        p[big] = ("slow_slide", False); key = big
    if kind not in NO_DISTRACT:          # the stages reach the new skill: chance dips that beat the real one on percent
        spare = [f for f in ("winback", "browse", "post_purchase") if p[f][0] == "steady" and f != key]
        rng.shuffle(spare)
        for f in spare[:DISTRACT.get(stage, 0)]:
            p[f] = ("noise_alarm", True)
    return {"flows": p, "key": key}


def program_ok(kind: str, prog: dict) -> bool:
    """Program-level clarity: the case shows what it's meant to show."""
    w = weekly_total(prog); base = sum(w[:4]) / 4
    al = {a["flow"] for a in alerts(prog)}
    fid = {f["flow"]["type"]: f["fid"] for f in prog["flows"]}
    key = prog.get("_key")
    ch = w[-1] / base - 1
    sure = {a["flow"]: a["sure"] for a in alerts(prog)}
    if kind == "all_normal":
        return -0.12 < ch < -0.03 and all(v == "likely chance" for v in sure.values())
    if kind == "one_flow_drop":
        return ch < -0.06
    if kind == "small_scary":
        return ch > -0.06
    if kind == "two_problems":
        return ch < -0.06
    if kind == "offsetting":
        return abs(ch) < 0.05
    if kind == "mix_shift":
        dl = lambda a, b: sum(sum(sum(f["by_message"][m["id"]]["delivered"][a:b]) for m in f["flow"]["messages"]) for f in prog["flows"])
        r_now, r_base = w[-1] / max(1, dl(49, 56)), sum(w[:4]) / max(1, dl(0, 28))
        return r_now < r_base * 0.93 and ch > -0.03
    if kind == "alert_storm":
        return len(al) >= 3 and fid[key] in al
    if kind == "wrong_alarm":
        return fid[key] not in al and len(al) >= 1
    if kind == "quiet_slide":
        return fid[key] not in al
    if kind == "bf_program":
        return w[-1] < w[-2] * 0.8
    return True


def make_program(kind: str, seed: int, stage: str = "realistic") -> dict:
    import lifecycle_files as L
    for n in range(40):
        rng = random.Random(seed + n * 104729)
        pl = plan(kind, rng, stage)
        if kind == "bf_program":
            y = rng.choice([2025, 2026]); bf = date(y, 11, 22) + timedelta(days=(4 - date(y, 11, 22).weekday()) % 7)
            today = bf + timedelta(days=12)
        else:
            today = date(2026, rng.randint(1, 10), rng.randint(1, 28))
            if date(today.year, 11, 15) <= today <= date(today.year, 12, 10):
                today = today - timedelta(days=30)
        start = rng.randint(32, 48)
        flows = []
        for i, ft in enumerate(FLOWS):
            pattern, small = pl["flows"][ft]
            weekly = rng.randint(250, 600) if small else rng.randint(*SIZE[ft])
            sub = L.make_case(pattern, seed * 10 + i + n * 977, stage=stage,
                              force={"ftype": ft, "today": today, "start": start, "weekly": weekly})
            sub["fid"] = f"f{i + 1}"
            flows.append(sub)
        prog = {"flows": flows, "_key": pl["key"]}
        if program_ok(kind, prog):
            break
    return _assemble(kind, prog, pl, rng, stage, seed)


def _assemble(kind, prog, pl, rng, stage, seed):
    import lifecycle_files as L
    flows = prog["flows"]
    by_type = {f["flow"]["type"]: f for f in flows}
    key = by_type.get(pl["key"]) if pl["key"] else None
    shared = kind in ("all_tracking", "shared_checkout", "shared_delivery", "shared_entries")
    w = weekly_total(prog); base = sum(w[:4]) / 4
    if key:
        kt = key["truth"]
        t = {"real": kt["real"], "where": key["fid"], "moved": kt["moved"], "moved_ok": kt.get("moved_ok") or [kt["moved"]],
             "since": kt["since"], "since_tol": kt["since_tol"], "money": kt["money"], "money_alt": None,
             "actions": kt["actions"], "base": kt["kind"]}
        if kind in ("one_flow_drop", "one_flow_win", "quiet_slide", "wrong_alarm"):
            t["money_alt"] = round(abs(base - w[-1]))           # the program's own change, read off the program card
        if kind == "two_problems":
            other = next(f for f in flows if f is not key and f["truth"]["real"] == "problem")
            t["money_alt"] = kt["money"] + other["truth"]["money"]
    elif shared:
        f0 = flows[0]["truth"]
        t = {"real": "problem", "where": "program", "moved": f0["moved"], "moved_ok": [f0["moved"]], "since": f0["since"],
             "since_tol": 2, "money": round(sum(f["truth"]["money"] for f in flows)), "money_alt": None,
             "actions": ["escalate"] if kind != "shared_delivery" else ["escalate", "fix_today"], "base": flows[0]["truth"]["kind"]}
    else:     # nothing wrong at program level
        mixf = by_type["browse"] if kind == "mix_shift" else None     # both low earners grew from the same day
        t = {"real": "nothing", "where": "program" if mixf else None, "moved": "entered" if mixf else None,
             "moved_ok": ["entered", "nothing"] if mixf else [None], "since": mixf["truth"]["since"] if mixf else None,
             "since_tol": 3, "money": 0, "money_alt": None, "actions": ["watch", "leave"], "base": "steady"}
    if kind == "small_scary":
        t["actions"] = ["fix_today", "test", "escalate", "watch"]       # any sensible action; the lesson is the size
    name = lambda f: f["flow"]["name"]
    story, expert, hints = _texts(kind, prog, key, t, base, w)
    t.update({"kind": kind, "story": story, "expert": expert, "hints": hints, "lesson": LESSONS[kind], "level3": kind})
    dates = flows[0]["dates"]
    ref = w[-2] if kind == "bf_program" else base          # Dana compares with last week, which was Black Friday
    pct = round(abs(w[-1] / ref - 1) * 100)
    al = alerts(prog)
    loud = max(flows, key=lambda f: abs(L.week_rpr(f, 7) / max(0.01, L.week_rpr(f, 6)) - 1))
    sym = rng.choice(SYMPTOMS).format(dir="down" if w[-1] < ref else "up", pct=pct, n=max(1, len(al)),
                                       adj="soft" if w[-1] < ref else "strong", flow=name(loud),
                                       adj2="off" if L.week_rpr(loud, 7) < L.week_rpr(loud, 6) else "up")
    case = {"id": f"p{seed % 100000}{rng.randint(100, 999)}", "kind": kind, "seed": seed, "level": 3, "program": True,
            "stage": stage, "stage_badge": L.STAGES[stage]["badge"], "stage_note": L.STAGES[stage]["note"],
            "today": flows[0]["today"], "dates": dates, "flows": flows, "alerts": al, "band": program_band(prog),
            "symptom": sym, "flow": {"name": "All flows", "messages": [], "type": "program"}, "truth": t}
    return case


def _texts(kind, prog, key, t, base, w):
    flows = prog["flows"]
    kn = key["flow"]["name"] if key else ""
    drop = round(abs(base - w[-1]))
    since = t["since"]
    S = {
        "one_flow_drop": f"Program revenue fell about ${drop:,} a week. Almost all of it is {kn}: {key['truth']['story'] if key else ''}",
        "one_flow_win": f"Program revenue rose, and {kn} carries it. {key['truth']['story'] if key else ''}",
        "all_normal": "Every flow is inside its own normal range. The program total wobbled down, and nothing broke.",
        "all_tracking": f"From {since}, every flow's orders dropped to almost nothing while clicks held. One shared cause: the order tracking.",
        "small_scary": f"{kn} dropped sharply, but it's small: about ${t['money']:,} a week, a sliver of the program. Real, but not the morning's priority.",
        "shared_checkout": f"From {since}, every flow's orders fell while clicks held. The one thing they share after the click is the site.",
        "shared_delivery": f"From {since}, every flow delivered fewer emails while entries held: sending or the inbox, shared by all.",
        "two_problems": f"Two flows have real problems. {kn} is worth far more (about ${t['money']:,} a week), so it goes first.",
        "alert_storm": f"Today raised several alerts. The ones on small flows are chance (too few people to be sure). The real one is {kn}.",
        "bf_program": "The week before last was Black Friday. Every flow looks lower against it, and none is outside its normal range.",
        "offsetting": f"The program total barely moved because one flow went up while {kn} fell. The fall is real and still costs about ${t['money']:,} a week.",
        "mix_shift": "Browse and post-purchase got many more people (each earning as usual, but both earn less per person than cart or welcome), so the program's average fell. Nothing broke.",
        "wrong_alarm": f"Today's alert is on a small, noisy flow. The real problem is {kn}: fewer people entering. Its rate held, so the rate alert never rang.",
        "quiet_slide": f"{kn} has been sliding slowly for weeks. No single week dropped 15%, so the week-over-week alert never fired.",
        "shared_entries": f"From {since}, fewer people entered every flow at once. Upstream traffic fell; every flow's rate held.",
    }
    import lifecycle_files as L
    tile = lambda m: L.TILE_LABEL.get(m, "Nothing")
    E = {
        "real": {"all_normal": "Every flow inside its range: not real.", "bf_program": "Not real: the comparison week was Black Friday.",
                 "mix_shift": "Nothing broke: each flow earns as usual.", "one_flow_win": f"Real, and good: {kn} is above its own range.",
                 "offsetting": f"Real, though the total hides it: {kn} is below its own range."}.get(
                     kind, f"Real: {kn} is below its own range." if key else "Real: every flow moved at once."),
        "big": f"About ${t['money']:,} a week." if t["money"] else "Nothing at stake.",
        "where": {"program": "The whole program: every flow moved together." if kind != "mix_shift" else "The whole program: the mix between flows shifted.", None: "-"}.get(
            t["where"], f"{kn}: the Registry shows it carries the dollars" + (", and it's worth more than the other problem." if kind == "two_problems" else ".")),
        "since": f"From {since}." if since else "-",
        "moved": f"{tile(t['moved'])} moved{' in every flow' if t['where'] == 'program' and kind != 'mix_shift' else ''}." if t["moved"] else "Nothing moved against normal.",
        "action": (key["truth"]["expert"][5] if key else
                   "Escalate: it's shared, so it sits upstream of the flows, with whoever owns the site, the integration or traffic."
                   if t["real"] == "problem" else "Leave it, and watch the next week."),
    }
    expert = [E["real"], E["big"], E["where"], E["since"], E["moved"], E["action"]]
    H = {
        "one_flow_drop": ["Which flow lost the most dollars?", "Open the Registry and sort out the dollars.", f"{kn}."],
        "one_flow_win": ["Which flow gained the dollars?", "The Registry's revenue column.", f"{kn}."],
        "all_normal": ["Is any flow outside its own range?", "The Registry shows each flow against its normal.", "None is."],
        "all_tracking": ["Did one flow move, or all of them?", "Open two flows and compare Clicks with Orders.", "All flows: orders gone, clicks fine."],
        "small_scary": ["How many dollars is that drop?", "Compare its revenue change with the program's.", "Small flow, small money."],
        "shared_checkout": ["Is it one flow or all of them?", "Open two flows: Clicks against Orders.", "All flows, after the click."],
        "shared_delivery": ["Is it one flow or all of them?", "Open two flows: Entered against Got the email.", "All flows, fewer delivered."],
        "two_problems": ["Is there more than one?", "The Registry, by dollars.", f"Two, and {kn} is bigger."],
        "alert_storm": ["How sure is each alert?", "Today shows how many people each alert rests on.", f"Only {kn}'s alert is solid."],
        "bf_program": ["What week are you comparing against?", "The program chart two weeks back.", "Black Friday."],
        "offsetting": ["The total is flat. Is every flow?", "The Registry, every row.", f"{kn} fell, another rose."],
        "mix_shift": ["Did any flow's own rate fall?", "Registry: each flow's revenue per recipient against its range.", "None did; browse grew."],
        "wrong_alarm": ["Is the alert where the money went?", "Registry: people and dollars, not just the alert.", f"{kn} lost people."],
        "quiet_slide": ["Any flow below its normal that didn't alert?", "Registry: each flow against its range.", f"{kn}, sliding."],
        "shared_entries": ["Did one flow lose people, or all?", "Registry: people a week, every row.", "All of them."],
    }
    return S[kind], expert, H[kind]
