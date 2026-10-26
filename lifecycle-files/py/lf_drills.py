"""Mini-games: two-option reps that build the failure stories one split at a time.

Why this shape (docs/RESEARCH-DIAGNOSTIC-REASONING.md, docs/DESIGN.md "Mini-games and the failure library"):
  - speed and instinct come from a library of failure stories, built by many cases with instant feedback
  - each rep is a real case from the same generator the cases use, drawn as the same chart, so the skill is
    reading the real chart (transfer), not learning the game's wording
  - the answer pair never changes inside a mini-game, so the words give nothing away; flows, sizes and
    directions vary every rep, and later rounds mix the splits (interleaving)
  - accuracy first: no timers. Time is recorded and shown after the round, never as pressure

    rep(drill, progress)          -> one rep: prompt, one or two charts, the fixed answer pair (the answer stays here)
    public(rep)                   -> what the page gets: no answer, no kind
    answer(rid, choice, ms)       -> right or wrong, why, and the result stored in progress.json under "drills"
    summary(progress)             -> per mini-game reps, accuracy, d', median ms on right answers, passed
"""
from __future__ import annotations
import random, statistics, time, uuid
from datetime import date
from statistics import NormalDist

import lifecycle_files as LF

DAYS = LF.DAYS

DRILLS = {
    "people_rate": {
        "title": "Fewer people, or each email earned less?",
        "ask": "Which half moved?",
        "charts": ["people", "rpr"],
        "answers": [["people", "The number of people"], ["rate", "Revenue per recipient"]],
        "kinds": {"people": ["entries_drop", "delivery_drop"],
                  "rate": ["conv_drop_all", "conv_drop_one", "aov_drop", "click_drop_one"]},
        "term": ["Splitting volume from rate", "Revenue is people × revenue per recipient. Split it first, every time."],
        "unlocks": ["entered", "delivered"],
    },
    "orders_size": {
        "title": "Fewer orders, or smaller orders?",
        "ask": "Revenue per recipient moved. Which part?",
        "charts": ["orders", "order_size"],
        "answers": [["orders", "Fewer orders"], ["size", "Smaller orders"]],
        "kinds": {"orders": ["conv_drop_all", "conv_drop_one", "click_drop_one"], "size": ["aov_drop"]},
        "term": ["Decomposition", "Revenue per recipient is order rate × order size. Each part has its own causes."],
        "unlocks": ["orders", "order_size"],
    },
    "email_after": {
        "title": "The email, or after the click?",
        "ask": "Orders fell. Where did it break?",
        "charts": ["clicks", "orders"],
        "answers": [["email", "The email itself"], ["after", "After the click"]],
        "kinds": {"email": ["click_drop_one"], "after": ["conv_drop_all", "conv_drop_one", "tracking_break"]},
        "term": ["Before or after the click", "Clicks held means the email still works. Look at the site, the offer, the code or the tracking."],
        "unlocks": ["clicks"],
    },
    "real_noise": {
        "title": "Real change, or just noise?",
        "ask": "Is this worth your morning?",
        "charts": ["rpr_band"],
        "answers": [["real", "Real change"], ["noise", "Nothing real"]],
        "kinds": {"real": ["conv_drop_all", "aov_drop", "conv_drop_one", "click_drop_one", "good_news"],
                  "noise": ["noise", "black_friday", "big_order", "mpp_opens"]},
        "weights": {"good_news": 4},   # half the real ones go up, as half the noise does, so the direction gives nothing away
        "term": ["Signal vs noise", "Judge a week against the four quiet weeks, not against last week, and never on opens alone."],
        "unlocks": ["opens", "unsubs"],
    },
}
ORDER = ["people_rate", "orders_size", "email_after", "real_noise"]
ROUNDS_REPS = 12                    # the daily warm-up: mixed reps from the passed mini-games

CASEBOOK = {   # one card per Level 1 failure story: what happens, what moves, what holds, where to look first
    "entries_drop": ("Fewer people start the flow. A form broke, a trigger changed, or traffic fell.",
                     "Entered, Got the email, revenue", "Revenue per recipient, clicks, orders per recipient", "Entered the flow, then what changed upstream"),
    "delivery_drop": ("People still enter, but fewer get the email: a filter, Smart Sending, suppression or bounces.",
                      "Got the email, revenue", "Entered the flow, revenue per recipient", "Entered against Got the email"),
    "click_drop_one": ("One email's clicks collapse: a broken link, image or render. The other emails are fine.",
                       "That email's clicks, then orders and revenue per recipient", "The other emails, opens, people", "The email table, then open that email"),
    "conv_drop_all": ("Clicks hold but orders fall across the flow. The email works and something after the click doesn't.",
                      "Orders per recipient, revenue per recipient", "Clicks, opens, people", "Clicks against Orders, then tell the site or offer owner"),
    "conv_drop_one": ("One email sends people somewhere that fails: an expired code or a sold-out product.",
                      "That email's orders", "Its clicks, the other emails", "The email table, then where that email links"),
    "aov_drop": ("The same number of orders, but smaller: a deeper discount or a cheaper product up front.",
                 "Revenue per order", "Orders per recipient, clicks, people", "Order size, then what the flow features or discounts"),
    "unsub_spike": ("One email drives people off the list. Revenue barely moves this week, so it hides.",
                    "Unsubscribes", "Revenue, for now", "Unsubscribes, then the email table"),
    "mpp_opens": ("Opens jump because Apple Mail Privacy Protection or bots open the email. Nobody new is reading.",
                  "Opens", "Clicks, orders, revenue", "Opens against Clicks"),
    "noise": ("A small flow wobbles from week to week and stays inside its normal range.",
              "The week-to-week number", "The normal range", "The gray band on the main chart"),
    "black_friday": ("Compared with Black Friday week, a normal week looks like a crash.",
                     "The change against last week", "The comparison with the quiet weeks", "Which week you're comparing against"),
    "good_news": ("Revenue per recipient rose: a better offer, a new email, a product that took off.",
                  "Revenue per recipient, up", "People", "What changed, so you can keep it"),
    "volume_mix": ("A flood of new, less-ready people lowers the rate. Nothing broke.",
                   "Entered (up), revenue per recipient (down)", "Total revenue", "Revenue before the rate"),
    "slow_slide": ("A slope, not a step: fatigue or erosion, a little every week.",
                   "Revenue per recipient, slowly", "No single day stands out", "The shape over all 8 weeks. The fix is a test, not a repair"),
    "big_order": ("One huge order carries the week.", "Revenue per order, on one day", "Orders, clicks, people", "The single-day dots, then Order size"),
    "tracking_break": ("Orders fall to almost zero while clicks hold. The tracking broke, not the sales.",
                       "Orders, to nearly zero", "Clicks, opens", "Suspect the tracking, then check the store's own orders"),
}
MIXED = "mixed"                     # the round that mixes all four; passing it opens the Level 1 cases
PASS_REPS, PASS_RIGHT = 8, 7        # pass a mini-game: at least 8 reps, 7 of the last 8 right, the last one right
MIXED_REPS, MIXED_RIGHT = 10, 8

CHART = {   # key -> label, how it's computed from the case totals, the number format the page uses
    "people": ("People who got an email", "count"),
    "rpr": ("Revenue per recipient", "money2"),
    "rpr_band": ("Revenue per recipient", "money2"),
    "orders": ("Orders per recipient", "pct2"),
    "order_size": ("Revenue per order", "money0"),
    "clicks": ("Click rate", "pct2"),
}


def _series(case: dict, key: str) -> list[float | None]:
    t = LF.totals(case)
    r = {k: LF.rolling(v) for k, v in t.items()}
    def ratio(a, b): return [None if a[i] is None or not b[i] else a[i] / b[i] for i in range(len(a))]
    return {"people": r["delivered"], "rpr": ratio(r["revenue"], r["delivered"]), "rpr_band": ratio(r["revenue"], r["delivered"]),
            "orders": ratio(r["orders"], r["delivered"]), "order_size": ratio(r["revenue"], r["orders"]),
            "clicks": ratio(r["clicks"], r["delivered"])}[key]


def _band(series: list) -> dict:
    vals = [v for v in series[6:28] if v is not None]
    m = sum(vals) / len(vals); sd = (sum((v - m) ** 2 for v in vals) / len(vals)) ** 0.5
    return {"lo": max(0.0, m - 2.2 * sd), "hi": m + 2.2 * sd, "mid": m}


def stage_for(n_seen: int) -> str:
    """Exaggerated first, then closer to real: the cases' own easy-to-hard stages."""
    return "obvious" if n_seen < 3 else "clear" if n_seen < 7 else "realistic"


def history(p: dict, drill: str) -> list[dict]:
    return p.setdefault("drills", {}).setdefault(drill, {"history": [], "passed": None})["history"]


def passed(p: dict, drill: str) -> bool:
    return bool(p.get("drills", {}).get(drill, {}).get("passed"))


def due_drill(p: dict, rng: random.Random) -> str:
    """For mixed rounds and daily rounds: weight each passed mini-game by recent misses and time since last seen."""
    pool = [d for d in ORDER if passed(p, d)] or ORDER[:1]
    def weight(d):
        h = history(p, d)[-12:]
        miss = sum(1 for x in h if not x["ok"])
        age_h = (time.time() - h[-1]["at"]) / 3600 if h else 48
        return 1 + 2 * miss + min(age_h, 72) / 24
    return rng.choices(pool, weights=[weight(d) for d in pool])[0]


def _ch(c: dict) -> float:
    return (c["last"] or 0) / c["base"] - 1 if c["base"] else 0.0


def readable(game: str, answer: str, charts: list[dict]) -> bool:
    """A Level 1 rep must be answerable from what's on screen, by the rule the feedback teaches. Ambiguous draws
    are re-rolled here; near-the-edge cases belong to the later levels."""
    if game in ("people_rate", "orders_size"):
        a, b = abs(_ch(charts[0])), abs(_ch(charts[1]))
        moved, other = (a, b) if answer == DRILLS[game]["answers"][0][0] else (b, a)
        return moved >= 0.08 and moved > 1.8 * other
    if game == "email_after":
        c, o = _ch(charts[0]), _ch(charts[1])
        return (c <= -0.12 and c <= 0.6 * o) if answer == "email" else (abs(c) <= 0.08 and o <= -0.12)
    if game == "real_noise":
        c = charts[0]; b = c["band"]
        outside = c["last"] < b["lo"] or c["last"] > b["hi"]
        days = sorted(c["dots"][-7:]); one_day = days[-1] > 3 * max(days[3], 1e-9)
        return (outside and not one_day) if answer == "real" else (not outside or one_day)
    return True


def _charts(c: dict, game: str) -> list[dict]:
    charts = []
    for key in DRILLS[game]["charts"]:
        s = _series(c, key)
        b = c["band"] if key == "rpr_band" else _band(s)
        base = [v for v in s[6:28] if v is not None]
        charts.append({"key": key, "label": CHART[key][0], "fmt": CHART[key][1], "series": s[6:], "band": b,
                       "base": sum(base) / len(base), "last": s[-1], "dots": None})
    if game == "real_noise":   # each day's revenue per recipient as a bar under the line, so one huge order shows as one bar
        t = LF.totals(c)
        charts[0]["dots"] = [t["revenue"][i] / t["delivered"][i] if t["delivered"][i] else 0 for i in range(6, DAYS)]
    return charts


def rep(drill: str, p: dict, seed: int | None = None) -> dict:
    rng = random.Random(seed if seed is not None else random.randrange(10**9))
    real_drill = due_drill(p, rng) if drill in (MIXED, "rounds") else drill
    D = DRILLS[real_drill]
    answer = rng.choice([a for a, _ in D["answers"]])
    ks = D["kinds"][answer]
    kind = rng.choices(ks, weights=[D.get("weights", {}).get(k, 1) for k in ks])[0]
    n_seen = len(history(p, real_drill))
    stage = stage_for(n_seen) if drill not in (MIXED, "rounds") else "clear" if n_seen < 12 else "realistic"
    for _ in range(25):
        c = LF.make_case(kind, rng.randrange(10**9), stage=stage)
        charts = _charts(c, real_drill)
        if readable(real_drill, answer, charts):
            break
    wk = LF.weekly_revenue(c)
    ch = wk[-1] / (sum(wk[:4]) / 4) - 1 if sum(wk[:4]) else 0
    if real_drill == "real_noise":   # the message depends only on what the chart shows, never on the cause
        drop = round((1 - wk[-1] / max(1, wk[-2])) * 100)
        pool = LF.SYMPTOMS["weird"] + (LF.SYMPTOMS["down"] + (LF.SYMPTOMS["bf"] if drop >= 12 else []) if drop > 0 else LF.SYMPTOMS["up"])
        prompt = rng.choice(pool).format(flow=c["flow"]["name"], pct=drop)
    else:
        prompt = f"{c['flow']['name']}: revenue {'fell' if ch < 0 else 'rose'} {abs(ch) * 100:.0f}% against its four quiet weeks."
    return {"drill": drill, "game": real_drill, "title": D["title"], "ask": D["ask"], "prompt": prompt, "flow": c["flow"]["name"],
            "ftype": c["flow"].get("type"), "kind": kind, "stage": stage, "seed": c["seed"],
            "dates": [d[5:] for d in c["dates"][6:]], "charts": charts, "answers": D["answers"], "answer": answer,
            "why": LF.LESSONS[kind][0], "term": D["term"]}


def _check_pass(p: dict, drill: str) -> bool:
    entry = p["drills"][drill]
    h = entry["history"]
    if drill == MIXED:
        last = h[-MIXED_REPS:]
        ok = len(last) >= MIXED_REPS and sum(x["ok"] for x in last) >= MIXED_RIGHT
    else:
        last = h[-PASS_REPS:]
        ok = len(last) >= PASS_REPS and sum(x["ok"] for x in last) >= PASS_RIGHT
    if ok and h[-1]["ok"] and not entry["passed"]:     # a pass always lands on a right answer
        entry["passed"] = time.time()
        return True
    return False


PENDING: dict[str, dict] = {}       # reps handed out and not yet answered; the answer never leaves the server


def public(r: dict) -> dict:
    return {k: v for k, v in r.items() if k not in ("answer", "kind", "why", "seed")}


def deal(drill: str) -> dict:
    if drill not in DRILLS and drill not in (MIXED, "rounds"):
        return {"error": f"No mini-game called {drill}."}
    r = rep(drill, LF.progress())
    r["rid"] = uuid.uuid4().hex[:12]
    PENDING[r["rid"]] = r
    while len(PENDING) > 200:
        PENDING.pop(next(iter(PENDING)))
    return public(r)


def answer(rid: str, choice: str, ms: int) -> dict:
    """Store one answer. Mixed and daily rounds count toward the mini-game the rep came from too."""
    r = PENDING.pop(rid, None)
    if r is None:
        return {"error": "That rep expired. Here's a fresh one."}
    p = LF.progress()
    ok = choice == r["answer"]
    row = {"ok": ok, "ms": int(ms), "kind": r["kind"], "ftype": r.get("ftype"), "stage": r.get("stage"), "choice": choice,
           "answer": r["answer"], "at": time.time()}
    history(p, r["game"]).append(row)
    newly = []
    if _check_pass(p, r["game"]): newly.append(r["game"])
    if r["drill"] in (MIXED, "rounds"):
        history(p, r["drill"]).append({**row, "game": r["game"]})
        if r["drill"] == MIXED and _check_pass(p, MIXED): newly.append(MIXED)
    LF.save_progress(p)
    return {"ok": ok, "answer": r["answer"], "why": r["why"], "name": LF.FILE_NAMES.get(r["kind"]), "kind": r["kind"],
            "newly_passed": newly, "summary": summary(LF.progress())}


def dprime(rows: list[dict], signal: str) -> float | None:
    """Signal detection on a two-option game: hits = said `signal` when it was, false alarms = said it when it wasn't.
    A player who always gives one answer scores 0. Log-linear correction keeps perfect runs finite."""
    sig = [r for r in rows if r["answer"] == signal]
    noi = [r for r in rows if r not in sig]
    if not sig or not noi: return None
    hit = (sum(1 for r in sig if r["choice"] == signal) + 0.5) / (len(sig) + 1)
    fa = (sum(1 for r in noi if r["choice"] == signal) + 0.5) / (len(noi) + 1)
    z = NormalDist().inv_cdf
    return round(z(hit) - z(fa), 2)


def casebook(p: dict) -> list[dict]:
    """A card unlocks the first time its story is answered right in a mini-game, or solved in a case. Never required."""
    met = {}
    for d in ORDER:
        for x in p.get("drills", {}).get(d, {}).get("history", []):
            if x.get("ok"):
                met[x["kind"]] = met.get(x["kind"], 0) + 1
    solved = set((p.get("level1") or {}).get("solved", []))
    return [{"kind": k, "name": LF.FILE_NAMES[k], "term": LF.LESSONS[k][1], "met": met.get(k, 0), "solved": k in solved,
             "open": k in met or k in solved, **({"story": v[0], "moves": v[1], "holds": v[2], "first": v[3]} if k in met or k in solved else {})}
            for k, v in CASEBOOK.items()]


def summary(p: dict) -> dict:
    out = {}
    today = time.mktime(date.today().timetuple())
    for d in ORDER + [MIXED, "rounds"]:
        e = p.get("drills", {}).get(d, {"history": [], "passed": None})
        h = e["history"]
        recent = h[-20:]
        rights = [x["ms"] for x in recent if x["ok"]]
        sig = DRILLS[d]["answers"][0][0] if d in DRILLS else None
        out[d] = {"reps": len(h), "right": sum(x["ok"] for x in h), "acc": round(sum(x["ok"] for x in recent) / len(recent), 3) if recent else None,
                  "median_ms": int(statistics.median(rights)) if rights else None, "last8": [x["ok"] for x in h[-8:]],
                  "today": sum(1 for x in h if x["at"] >= today),
                  "dprime": dprime(recent, sig) if sig else None, "passed": bool(e.get("passed")), "passed_at": e.get("passed")}
    unlocked = [t for d in ORDER if out[d]["passed"] for t in DRILLS[d]["unlocks"]]
    nxt = next((d for d in ORDER if not out[d]["passed"]), MIXED if not out[MIXED]["passed"] else None)
    before_today = any(out[d]["passed_at"] and out[d]["passed_at"] < today for d in ORDER)
    rows = [x for d in ORDER for x in p.get("drills", {}).get(d, {}).get("history", []) if x["at"] >= today]   # mixed and rounds reps live here too
    rt = [x["ms"] for x in rows if x["ok"]]
    day = {"reps": len(rows), "right": sum(x["ok"] for x in rows), "median_ms": int(statistics.median(rt)) if rt else None}
    return {"drills": out, "order": ORDER, "titles": {d: DRILLS[d]["title"] for d in DRILLS}, "unlocks": {d: DRILLS[d]["unlocks"] for d in DRILLS},
            "terms": {d: DRILLS[d]["term"] for d in DRILLS}, "tiles_unlocked": unlocked, "next": nxt, "cases_open": out[MIXED]["passed"],
            "rounds_due": before_today and out["rounds"]["today"] < ROUNDS_REPS, "rounds_reps": ROUNDS_REPS,
            "pass_rule": [PASS_REPS, PASS_RIGHT], "mixed_rule": [MIXED_REPS, MIXED_RIGHT], "casebook": casebook(p), "today": day,
            "keys": p.get("keys", {})}


def save_keys(stats: dict) -> dict:
    """Keyboard-shortcut use, per action: the last 10 uses as [via, day] (via = key, prefix or click), and the nudges shown.
    Kept beside the rest of the progress so "learned" (8 of the last 10 by key, on two days) survives a new browser."""
    p = LF.progress()
    clean = {}
    for a, v in (stats or {}).items():
        if not isinstance(v, dict) or len(str(a)) > 40:
            continue
        uses = [[str(u[0])[:6], str(u[1])[:10]] for u in (v.get("uses") or [])[-10:] if isinstance(u, (list, tuple)) and len(u) == 2]
        clean[str(a)] = {"uses": uses, "nudged": int(v.get("nudged") or 0), "taught": bool(v.get("taught"))}
    p["keys"] = clean
    LF.save_progress(p)
    return {"ok": True}
