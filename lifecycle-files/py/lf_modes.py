"""Two ways to play outside the path (docs/GAME-MODE-IDEAS.md, ideas 1 and 2). Each opens from the hub once the step it
needs is passed, and works like a join: a Meet (Watch, Together, the term), 3 guided reps, then solo until 8 of the
last 10, ending on a right one, plus an optional Hard star.

    Call it or wait   One flow's chart fills in a day at a time. Each morning: call it (tell the owner) or wait a day.
                      Right is calling once the line itself has left its normal range. Before that it's a guess, after
                      it every day costs money, and in a quiet fortnight any call is a false alarm. About half break.
    Objection!        Dana posts his read of a case, line by line. At least one line is wrong. Pick one, then click the
                      chart that proves it. Every line fits his own conclusion, so the screen is the only way to find
                      it. His read uses only the charts and causes of steps already passed, so it grows with the path.

    summary(progress)        both modes: open, the Meet, level, last 10, passed, star
    deal(mode, level)        one rep. Call it or wait keeps the days still to come here, not on the page
    day(rid)                 Call it or wait: the next morning
    answer(rid, body)        grade it, store it under progress["modes"][mode]
    meet_done(mode)

Progress sits under progress["modes"], apart from the path, so a mode never changes a step's history.
"""
from __future__ import annotations
import random, time, uuid

import lifecycle_files as LF
import lf_proto as LP
import lf_path as P

IN, BELOW, ABOVE = P.IN, P.BELOW, P.ABOVE
U, D, F, Z = P.U, P.D, P.F, P.Z
STEPV, SLOPE, SPIKE, NONE = P.STEPV, P.SLOPE, P.SPIKE, P.NONE

GUIDED = 3                     # guided reps after the Meet
PASS = (10, 8)                 # solo: 8 right of the last 10, ending on a right one (the same rule as a join)
HARD_STAR = P.HARD_STAR
SITTING = 10                   # a sitting ends with its summary after this many counted reps
STAGE = P.STAGE
ORDER = ["wait", "objection"]
MODES = {
    "wait": {"name": "Call it or wait", "needs": "s2",
             "blurb": "A flow's chart fills in one day at a time. Call it the day it really breaks. Too early is a guess, too late costs money."},
    "objection": {"name": "Objection!", "needs": "j5-6", "retired": True,     # off the hub since the sampler (2026-10-14): Brent found it unclear
                  "blurb": "Dana posts his read of a case. At least one line is wrong. Find it, then show the chart that proves it."},
}
MEET = {
    "wait": {"dana": "Dana: can you keep an eye on {flow} for the next two weeks? Tell me if it breaks.",
             "intro": "A new way to play: Call it or wait. The chart fills in one day at a time, like checking the dashboard every morning. "
                      "Each day, decide: call it (tell the owner now) or wait a day. Call it once the line itself leaves its normal range. "
                      "Before that you're guessing. After that, every day it runs costs money. Some fortnights nothing breaks, and then any call is a false alarm.",
             "term": ["Time to detect, and false alarms", "Every alert rule trades the two: fire early and you cry wolf, fire late and the break runs longer. "
                      "Quality control measures both with control charts, as the average run length: how long a rule takes to fire, on a real shift and on noise."]},
    "objection": {"dana": "Dana: I went through {flow}. Here's my read.",
                  "intro": "A new way to play: Objection! Dana posts his read of a case, one line at a time. At least one line is wrong. "
                           "Every line fits his own conclusion, so reading the lines won't show it: only the screen will. Click the wrong line, then click the chart that proves it.",
                  "term": ["Unsupported claim", "A claim the screen doesn't back. Checking a teammate's diagnosis line by line against the data, before anyone acts on it, "
                           "is how a team catches a misread. Teachers call this kind of practice an erroneous example."]},
}
for _m, _v in MODES.items():
    P.WAY_NAME.setdefault(_m, _v["name"])


# ---------------------------------------------------------------- progress
def book(p: dict) -> dict:
    return p.setdefault("modes", {})


def entry(p: dict, mid: str) -> dict:
    return book(p).setdefault(mid, {"meet": None, "history": [], "passed": None})


def is_open(p: dict, mid: str) -> bool:
    return bool((P.book(p).get(MODES[mid]["needs"]) or {}).get("passed"))


def needs_label(mid: str) -> str:
    s = P.step(MODES[mid]["needs"])
    if s.get("n"):
        return f"Step {s['n']}"
    a, b = (int(x) for x in s["id"][1:].split("-"))
    return f"Join {a}+{b}" if b - a == 1 else f"Join {a}-{b}"


def level_for(p: dict, mid: str) -> str:
    e = entry(p, mid)
    if not e["meet"]:
        return "watch"
    return "guided" if sum(1 for x in e["history"] if x["level"] == "guided") < GUIDED else "solo"


def base_step(p: dict) -> str:
    """The furthest Level 1 step he has passed. Objection! uses its charts and causes, so Dana's read grows with the path."""
    done = [s["id"] for s in P.STEPS if not s.get("case") and (P.book(p).get(s["id"]) or {}).get("passed")]
    return max(done, key=P.IDX.get) if done else "s2"


def _check_pass(e: dict) -> bool:
    n, k = PASS
    solo = [x for x in e["history"] if x["level"] == "solo"][-n:]
    if not e["passed"] and len(solo) >= n and sum(x["ok"] for x in solo) >= k and solo[-1]["ok"]:
        e["passed"] = time.time()
        return True
    return False


def summary(p: dict) -> dict:
    out = []
    for mid in ORDER:
        m, e = MODES[mid], entry(p, mid)
        h = e["history"]
        solo = [x for x in h if x["level"] == "solo"]
        hard = [x for x in h if x["level"] == "hard"][-HARD_STAR[0]:]
        out.append({"id": mid, "name": m["name"], "blurb": m["blurb"], "needs": m["needs"], "needs_label": needs_label(mid), "open": is_open(p, mid), "retired": bool(m.get("retired")),
                    "meet": bool(e["meet"]), "level": level_for(p, mid), "guided_left": max(0, GUIDED - sum(1 for x in h if x["level"] == "guided")),
                    "reps": len(h), "right": sum(x["ok"] for x in h), "last": [x["ok"] for x in solo[-PASS[0]:]], "rule": list(PASS),
                    "passed": bool(e["passed"]), "star": len(hard) >= HARD_STAR[0] and sum(x["ok"] for x in hard) >= HARD_STAR[1]})
    return {"modes": out, "meet": MEET, "sitting": SITTING}


# ---------------------------------------------------------------- Call it or wait
WAIT_DAYS = 14                  # mornings in a round
WAIT_REAL = 0.55                # share of rounds where something breaks
WAIT_KINDS = {"conv_drop_all": 3, "conv_drop_one": 2, "aov_drop": 2, "tracking_break": 1, "slow_slide": 1}
WAIT_HINT = {"say": "Look at where the line ends today, not at the dots. Call it the day the line itself leaves the band.", "spot": ["end", "band"]}


def _dt(c: dict, i: int) -> str:
    """A chart day's date: the chart starts on the case's day 6, the first full 7-day average."""
    return c["dates"][i + 6][5:]


def _expected(rev: list[float]) -> list[float]:
    """Each day's revenue if nothing had changed: the same weekday's average over the four quiet weeks."""
    return [sum(rev[d % 7 + 7 * k] for k in range(4)) / 4 for d in range(LF.DAYS)]


def lost(c: dict, i0: int, i1: int) -> float:
    """Revenue the break cost over chart days i0..i1, against the same weekdays in the quiet weeks."""
    if i1 < i0:
        return 0.0
    rev = LF.totals(c)["revenue"]
    exp = _expected(rev)
    return max(0.0, sum(exp[i + 6] - rev[i + 6] for i in range(i0, i1 + 1)))


def wait_kinds(p: dict) -> dict:
    """The breaks a round can hold: only causes his path has taught, so the reveal never names one he hasn't met."""
    known = set(P.causes(base_step(p)))
    return {k: w for k, w in WAIT_KINDS.items() if k in known} or {"conv_drop_all": 1}


def w_wait(rng: random.Random, stage: str, level: str, again: str | None = None, kinds: dict | None = None) -> dict | None:
    """One round. Real: the line sits inside its range until the break, leaves it on day `shown`, is clearly out by
    `clear` and stays out. Quiet: the line stays inside the whole time, though single days may dip below."""
    real = again.startswith("real") if again else (level in ("watch", "together") or rng.random() < WAIT_REAL)
    want = again.split(":", 1)[1] if again and ":" in again else None
    for n in range(150):
        a = rng.randint(28, 35)
        E = a + WAIT_DAYS - 1
        if real:
            kw = kinds or WAIT_KINDS
            kind = want or ("conv_drop_all" if level == "watch" else rng.choices(list(kw), weights=list(kw.values()))[0])
            S = rng.randint(a + 2, a + 8)
            c = LF.make_case(kind, rng.randrange(10**9), stage=stage, force={"start": S + 6})
        else:
            kind, S = "noise", None
            c = LF.make_case("noise", rng.randrange(10**9), stage=stage)
        _, charts = LP.observe(c)
        m = charts["main"]
        s, dots, b = m["series"], m["dots"], m["band"]
        lo, hi, pad = b["lo"], b["hi"], 0.03 * b["mid"]
        if real:
            if not all(lo <= v <= hi for v in s[:S] if v is not None):     # the whole history inside: leaving is the signal
                continue
            shown = next((i for i in range(S, E + 1) if s[i] < lo), None)
            clear = next((i for i in range(S, E + 1) if s[i] < lo - pad), None)
            if shown is None or clear is None or shown < a + 1 or clear > E - 2 or not all(s[i] < lo for i in range(shown, E + 1)):
                continue
            trap = [i for i in range(a, shown) if dots[i] is not None and dots[i] < lo]
        else:
            if not all(lo <= v <= hi for v in s[:E + 1] if v is not None):
                continue
            shown = clear = None
            trap = [i for i in range(a, E + 1) if dots[i] is not None and dots[i] < lo]
        if level == "watch" and not trap and n < 120:       # Watch shows one bad day being let go
            continue
        return {"case": c, "charts": charts, "kind": kind, "real": real, "a": a, "end": E, "today": a, "S": S, "shown": shown, "clear": clear,
                "trap": trap, "again_key": f"real:{kind}" if real else "noise"}
    return None


def wait_view(d: dict, upto: int) -> dict:
    """The main chart as it looks on the morning of chart day `upto`: later days are blank."""
    m, n = d["charts"]["main"], d["end"] + 1
    s = m["series"]
    last = s[upto]
    return {"main": {"series": [v if i <= upto else None for i, v in enumerate(s[:n])], "dots": [v if i <= upto else None for i, v in enumerate(m["dots"][:n])],
                     "band": m["band"], "base": m["base"], "last": last, "ch": round(last / m["base"] - 1, 4) if m["base"] else 0.0}}


def _wait_walk(d: dict) -> list[dict]:
    """Watch: the game plays the round and says why on each morning that matters."""
    c, a, shown, trap = d["case"], d["a"], d["shown"], set(d["trap"])
    beats, run = [], []
    def flush():
        if run:
            say = (f"{_dt(c, run[0])}: the line is still inside the band. Wait." if len(run) == 1
                   else f"{_dt(c, run[0])} to {_dt(c, run[-1])}: the line stays inside the band. Wait each morning.")
            beats.append({"say": say, "spot": ["end", "band"], "do": {"wait": len(run)}})
            run.clear()
    for i in range(a, shown + 1):
        if i == a:
            beats.append({"say": f"Each morning one more day comes in. Today is {_dt(c, i)}. The line is the 7-day average, and it's inside the band. So: wait a day.",
                          "spot": ["end", "band"], "do": {"wait": 1}})
        elif i == shown:
            flush()
            beats.append({"say": f"{_dt(c, i)}: the line itself has left the band. That's the signal. Call it now.", "spot": ["end"], "do": {"call": True}})
        elif i in trap:
            flush()
            beats.append({"say": f"{_dt(c, i)}: one day's dot fell below the band, but the line is still inside. One bad day isn't a change. Wait.",
                          "spot": [f"dot-{i}"], "do": {"wait": 1}})
        else:
            run.append(i)
    return beats


def _wait_public(d: dict) -> dict:
    c = d["case"]
    return {"today": d["today"], "start_i": d["a"], "end_i": d["end"], "days": WAIT_DAYS, "charts": wait_view(d, d["today"]),
            "dates": [_dt(c, i) for i in range(d["end"] + 1)], "visible": ["main", "dots"], "show_pct": False}


def day(rid: str) -> dict:
    d = PENDING.get(rid)
    if not d or d["mode"] != "wait":
        return {"error": "That one expired."}
    if d["today"] >= d["end"]:
        return {"end": True}
    d["today"] += 1
    return {"today": d["today"], "charts": wait_view(d, d["today"])}


def _money(v: float) -> str:
    return f"${v:,.0f}"


def _grade_wait(d: dict, body: dict) -> dict:
    c, t, real, S, shown, clear, E = d["case"], d["today"], d["real"], d["S"], d["shown"], d["clear"], d["end"]
    call = t if body.get("call") else None
    if call is None and t < E:
        return {"error": "The two weeks aren't over yet."}
    if real:
        verdict = "missed" if call is None else "early" if call < shown else "on_time" if call <= clear + 1 else "late"
    else:
        verdict = "false_alarm" if call is not None else "held"
    before = lost(c, S, shown) if real else 0.0
    waiting = lost(c, shown + 1, E if call is None else call) if real and verdict != "early" else 0.0
    dt = lambda i: _dt(c, i)
    trap = d["trap"]
    if verdict == "on_time":
        why = (f"The line left its normal range on {dt(shown)} and you called it on {dt(call)}. It started on {dt(S)}. About {_money(before)} was gone "
               f"by the morning the line showed it. Nobody catches that part." + (f" Waiting until {dt(call)} cost about {_money(waiting)} more." if waiting >= 1 else ""))
    elif verdict == "early":
        why = (f"On {dt(call)} the line was still inside its normal range. " + ("Nothing had even started yet. " if call < S else f"It had started on {dt(S)}, but the line didn't show it yet. ")
               + f"It left the range on {dt(shown)}. Right in the end, but on the day you called it was a guess.")
    elif verdict == "late":
        why = f"The line left its normal range on {dt(shown)}. You called it on {dt(call)}, {call - shown} days later. Those days cost about {_money(waiting)}."
    elif verdict == "missed":
        why = f"The line left its normal range on {dt(shown)} and stayed out. By {dt(E)} the wait had cost about {_money(waiting)}."
    elif verdict == "false_alarm":
        why = ("Nothing broke: the line stayed inside its normal range the whole two weeks. " + (f"The low dot{'s' if len(trap) > 1 else ''} ({', '.join(dt(i) for i in trap[:3])}) "
               "were single bad days. " if trap else "") + "Dana spent an hour chasing it.")
    else:
        why = "Nothing broke: the line stayed inside its normal range the whole two weeks" + (", even on the days a single dot dipped below." if trap else ".")
    pins = ([{"i": S, "label": "started", "cls": "st"}, {"i": shown, "label": "left the range", "cls": "sh"}] if real else [])
    if call is not None:
        pins.append({"i": call, "label": "you called", "cls": "me"})
    full = wait_view(d, E)
    head = {"on_time": "Called it on time", "early": "Too early: a guess", "late": "Called it late", "missed": "Missed it", "false_alarm": "False alarm", "held": "Right to wait"}[verdict]
    return {"ok": verdict in ("on_time", "held"), "guessed": verdict == "early", "verdict": verdict, "head": head, "why": why, "real": real,
            "charts": full, "pins": pins, "spots": ["end"] if real else ["band"], "kind": d["kind"], "cause": LP.CAUSE[d["kind"]] if real else None,
            "ledger": {"verdict": verdict, "real": real, "start": dt(S) if real else None, "shown": dt(shown) if real else None, "call": dt(call) if call is not None else None,
                       "waiting": round(waiting), "before": round(before), "head": head},
            "retry_ok": verdict == "early"}


# ---------------------------------------------------------------- Objection!
OBJ_ORDER = ["main", "shape", "start", "size", "revenue", "lastweek", "entered", "delivered", "opens", "clicks", "orders", "order_size", "unsubs", "emails"]
WHO = [("Dana", "Dana: I went through {flow}. Here's my read."), ("Ruth", "Ruth: I looked at {flow} this morning. Here's what I see."),
       ("Priya", "Priya: quick read on {flow}. Tell me if I'm wrong.")]
FAMILY_W = {"misread": 0.55, "wrong_read": 0.30, "wrong_cause": 0.15}   # a misread his call doesn't hang on / a misread chart and the cause it led to / a cause the screen rules out
SIZE_AT = {"some": 0.21, "alot": 0.42, "most": 0.68}                     # where a misread size lands, by size band
TILE_WORD = {U: "up", D: "down", F: "held", Z: "fell to almost zero"}
OBJ_HINT_SAY = "Check each line against the chart it's about. For the last line, ask what that cause would do to each chart."


def _has_move(cause: str) -> bool:
    s = P.SCRIPT[cause]
    return s.get("main") in (BELOW, ABOVE) and s.get("shape") in (STEPV, SLOPE, SPIKE)


def _facts(c: dict, obs: dict, charts: dict, base: str) -> dict:
    """What the screen says, chart by chart, plus the start day and the size when the line really moved."""
    keys, vis = P.obs_keys(base), P.visible(base)
    f = {k: obs[k] for k in keys if obs.get(k) is not None and k != "shape"}
    sh = P.SHAPE.get(c["kind"])
    if "shape" in keys:
        if obs.get("main") in (BELOW, ABOVE) and sh in (STEPV, SLOPE, SPIKE):
            f["shape"] = sh
            f["start"] = P._day(c) - 6
        elif sh == NONE and obs.get("main") == IN:
            f["shape"] = NONE
    if "size" in vis:
        f["size"] = charts["main"]["ch"]
    return f


SIDE = LP.CLUES + ["lastweek"]    # charts a cause may say nothing about: he can still read them, right or wrong


def _claims(B: str, f: dict, base: str) -> dict:
    """Dana's read when he believes cause B: what B would show on every chart he can read. Charts B says nothing about
    he reads as they are (never for "nothing real", where a tile that moved would give him away). He gives a start day
    and a size only when the line really moved and B moves it too, and then he reads them off the chart."""
    s = P.SCRIPT[B]
    cl = {k: s[k] for k in OBJ_ORDER if k not in ("start", "size") and s.get(k) is not None and k in f}
    if B not in NO_TILE_MISREAD:
        cl.update({k: f[k] for k in SIDE if k in f and s.get(k) is None and f[k] != Z})
    if _has_move(B) and "start" in f:
        cl["start"] = f["start"]
        if "size" in f:
            cl["size"] = -abs(f["size"]) if s["main"] == BELOW else abs(f["size"])
    return cl


def _start_ok(f: dict, v: int) -> bool:
    if "start" not in f:
        return False
    lo, hi = P.TOL[f["shape"]]
    return f["start"] + lo <= v <= f["start"] + hi


def _size_same(v: float, t: float) -> bool:
    return (v < 0) == (t < 0) and P.size_ok(P.size_bin(v), t)


def _true(k: str, v, f: dict) -> bool:
    if k == "start":
        return _start_ok(f, v)
    if k == "size":
        return "start" in f and _size_same(v, f["size"])
    return f.get(k) == v


def _misread(k: str, f: dict, rng: random.Random):
    """A wrong date or size that a quick glance could give: a week or more off, or a different size band."""
    if k == "start":
        for _ in range(20):
            v = f["start"] + rng.choice([-1, 1]) * rng.randint(10, 14)
            if 2 <= v <= 47 and not _start_ok(f, v):
                return v
        return None
    t = f["size"]
    bands = [b for b in SIZE_AT if b != P.size_bin(t) and abs(SIZE_AT[b] - abs(t)) >= 0.12]
    if not bands:
        return None
    v = SIZE_AT[rng.choice(bands)] + rng.uniform(-0.02, 0.02)
    return -v if t < 0 else v


def _can_misread(k: str, f: dict) -> bool:
    if k == "start":
        return f.get("shape") in (STEPV, SPIKE) and "start" in f      # a slope's start is too loose to misread by a week
    return "start" in f and "size" in f


def _side_misreads(tc: str, kind: str, f: dict) -> list[str]:
    """Charts his cause says nothing about: he can misread one and his read still fits his call."""
    if kind in NO_TILE_MISREAD or tc in NO_TILE_MISREAD:
        return []
    s = P.SCRIPT[tc]
    return [k for k in SIDE if k in f and s.get(k) is None and f[k] != Z and _flip(k, f[k]) is not None]


def _flip(k: str, v):
    """The misread of a side chart: a move read as held, or held read as a move."""
    if k == "emails":
        return P.SAME if v == P.ONE else P.ONE
    if k == "lastweek":
        return U if v == F else F
    return F if v in (U, D) else D if v == F else None


def _call_name(B: str, base: str) -> str:
    n = P.name(B, base).replace(": ", ", ")
    return n[0].lower() + n[1:]


def line_text(k: str, v, c: dict, cl: dict) -> str:
    if k == "main":
        return {BELOW: "The line ends below its normal range.", IN: "The line is inside its normal range.", ABOVE: "The line ends above its normal range."}[v]
    if k == "shape":
        up = cl.get("main") == ABOVE
        return {STEPV: f"It {'jumped' if up else 'dropped'} all at once: a step.", SLOPE: f"It's been {'climbing' if up else 'sliding'} a little every week: a slope.",
                SPIKE: "One day shot way up: a spike.", NONE: "The line hasn't moved."}[v]
    if k == "start":
        return f"It happened on {_dt(c, v)}." if cl.get("shape") == SPIKE else f"It started around {_dt(c, v)}."
    if k == "size":
        return f"It's about {round(abs(v) * 100)}% {'above' if v > 0 else 'below'} normal."
    if k == "revenue":
        return {D: "Revenue for the week is down on the quiet weeks.", F: "Revenue for the week is about normal.", U: "Revenue for the week is up on the quiet weeks."}[v]
    if k == "lastweek":
        return {F: "The week before was a normal week.", U: "The week before was way up."}[v]
    if k == "emails":
        return {P.ONE: "One email is out of line.", P.SAME: "Every email moved about the same."}[v]
    return f"{P.LABEL[k]}: {TILE_WORD[v]}."


PROOF_LABEL = {"main": "the main chart", "revenue": "the Revenue row", "lastweek": "the week before", "emails": "the Each email table"}


NO_TILE_MISREAD = ("noise", "black_friday")    # "nothing real" beside a tile that moved would give the wrong line away


def _cap(t: str) -> str:
    return t[:1].upper() + t[1:]


def proof_label(key: str) -> str:
    return PROOF_LABEL.get(key) or f"the {P.LABEL.get(key, key)} tile"


def proof_of(k: str) -> str:
    """The chart you click to check a line. The shape, the start and the size all live on the main chart."""
    return "main" if k in ("main", "shape", "start", "size") else P.proof_key(k)


def spot_of(key: str) -> str:
    return {"main": "main", "revenue": "revenue", "lastweek": "lastweek", "emails": "emails"}.get(key, "tile-" + key)


def _reason(L: dict, d: dict) -> str:
    k, v, c, obs, f, base = L["k"], L["v"], d["case"], d["obs"], d["facts"], d["base"]
    if k == "call":
        if L["true"]:
            return "Everything on screen fits it."
        x = P.deciders(obs, v, P.obs_keys(base), base)[0]
        return P.contra(obs, v, x, base)
    if k == "start":
        if "start" not in f:
            return "On screen the line never left its normal range, so nothing started."
        return f"On screen it happened on {_dt(c, f['start'])}." if f.get("shape") == SPIKE else f"On screen it started around {_dt(c, f['start'])}."
    if k == "size":
        t = f["size"]
        return (f"On screen it's {P.pct(t)} {'above' if t > 0 else 'below'} normal." if "start" in f
                else f"On screen it's {P.pct(t)} from normal, and the line never left its range.")
    if k == "shape":
        sh = f.get("shape")
        return "On screen, " + ({STEPV: "it moved all at once: a step", SLOPE: "it slid a little every week: a slope", SPIKE: "one day shot up: a spike",
                                NONE: "the line didn't move"}[sh] if sh else "the line has no clear shape") + "."
    if k in ("main", "lastweek", "emails"):
        return f"On screen, {P.is_(k, obs[k])}."
    if k == "revenue":
        return "On screen, " + {D: "revenue for the week is down on the quiet weeks", F: "revenue for the week is about normal", U: "revenue for the week is up on the quiet weeks"}[obs[k]] + "."
    return f"On screen, {P.LABEL[k]} " + {U: "went up", D: "went down", F: "held", Z: "fell to almost zero"}[obs[k]] + "."


def _sample(rng: random.Random, ks: list[str], n: int) -> list[str]:
    """n of the true lines to sit beside the wrong one. A true start or size counts three times, so a line with a number
    in it is wrong no more often than any other line."""
    ks, out = list(ks), []
    while ks and len(out) < n:
        k = rng.choices(ks, weights=[3 if k in ("start", "size") else 1 for k in ks])[0]
        out.append(k); ks.remove(k)
    return out


def w_objection(rng: random.Random, stage: str, level: str, base: str) -> dict | None:
    keys, pool = P.obs_keys(base), P.causes(base)
    n_read = 3 if stage == "obvious" else rng.choice([3, 4]) if stage == "clear" else 4
    want = "wrong_read" if level == "watch" else rng.choices(list(FAMILY_W), weights=list(FAMILY_W.values()))[0]
    for n in range(80):
        got = P.make(P.pick_kind(P.pick_cause(base, pool, rng), rng), rng, stage, base)
        if not got:
            continue
        c, obs, charts = got
        tc = P.cause_of(c["kind"], base)
        f = _facts(c, obs, charts, base)
        alts = [x for x in pool if x != tc and P.families(x) & P.families(c["kind"]) and P.rules_out(obs, x, keys)]
        mis = [k for k in ("start", "size") if _can_misread(k, f)] + _side_misreads(tc, c["kind"], f)
        reads = {x: _claims(x, f, base) for x in alts}
        feas = {"misread": bool(mis),
                "wrong_read": [x for x in alts if any(f.get(k) != v for k, v in reads[x].items() if k not in ("start", "size"))],
                "wrong_cause": [x for x in alts if sum(_true(k, v, f) for k, v in reads[x].items()) >= 2]}
        fams = [k for k in FAMILY_W if feas[k] and (k == want or (n >= 40 and level != "watch"))]   # the kind of mistake is drawn first, then a case that allows it
        if not fams:
            continue
        fam = rng.choices(fams, weights=[FAMILY_W[k] for k in fams])[0]
        B = tc if fam == "misread" else rng.choices(feas[fam], weights=[1 if "main" in P.rules_out(obs, x, keys) else 3 for x in feas[fam]])[0]   # most look-alikes agree on the main chart
        cl = _claims(B, f, base)
        true = {k: _true(k, v, f) for k, v in cl.items()}
        if fam == "misread":
            k0 = rng.choice(mis)
            v0 = _misread(k0, f, rng) if k0 in ("start", "size") else _flip(k0, f[k0])
            if v0 is None:
                continue
            cl[k0], true[k0] = v0, False
        if fam == "wrong_cause":
            pick = _sample(rng, [k for k in cl if true[k]], n_read)
        else:
            bad = [k for k in cl if not true[k]]
            k0 = k0 if fam == "misread" else rng.choice(bad)
            pick = [k0] + _sample(rng, [k for k in cl if k != k0 and true[k]], n_read - 1)
        if len(pick) < 2:
            continue
        lines = [{"k": k, "v": cl[k], "true": true[k], "text": line_text(k, cl[k], c, cl)} for k in OBJ_ORDER if k in pick]
        lines.append({"k": "call", "v": B, "true": B == tc, "text": f"My call: {_call_name(B, base)}."})
        for L in lines:
            L["evidence"] = ([] if L["true"] else sorted({P.proof_key(x) for x in P.rules_out(obs, B, keys)}) if L["k"] == "call" else [proof_of(L["k"])])
        if all(L["true"] for L in lines) or any(not L["true"] and not L["evidence"] for L in lines):
            continue
        who, msg = rng.choice(WHO) if level != "watch" else WHO[0]
        d = {"case": c, "obs": obs, "charts": charts, "facts": f, "base": base, "lines": lines, "B": B, "truth": tc, "kind": c["kind"], "fam": fam, "who": who,
             "msg": msg, "again_key": c["kind"]}
        j = next(i for i, L in enumerate(lines) if not L["true"])
        ev = lines[j]["evidence"][0]
        d["answer"] = {"line": j, "proof": ev}
        line_spot = lambda L: spot_of(proof_of(L["k"])) if L["k"] != "call" else "lines"
        walk = [{"say": f"{who} posted a read of {c['flow']['name']}. Before anyone acts on it, check each line against the screen.", "spot": ["lines"]}]
        for i, L in enumerate(lines[:j + 1]):
            walk.append({"say": f"Line {i + 1}: \"{L['text']}\" " + ("True. " if L["true"] else "Wrong. ") + _reason(L, d), "spot": [f"line-{i}", line_spot(L)]})
        walk.append({"say": f"Objection on line {j + 1}. The proof: {proof_label(ev)}.", "spot": [f"line-{j}", spot_of(ev)], "do": {"line": j, "proof": ev}})
        d["walk"] = walk
        d["hint"] = {"say": OBJ_HINT_SAY, "spot": sorted({line_spot(L) for L in lines if L["k"] != "call"})}
        return d
    return None


def _grade_obj(d: dict, body: dict) -> dict:
    lines = d["lines"]
    try:
        i = int(body.get("line"))
    except (TypeError, ValueError):
        return {"error": "Pick a line first."}
    if not 0 <= i < len(lines):
        return {"error": "No such line."}
    proof = str(body.get("proof") or "")
    L = lines[i]
    ok = not L["true"] and proof in L["evidence"]
    reasons = [_reason(x, d) for x in lines]
    wrong = [n for n, x in enumerate(lines) if not x["true"]]
    lab = proof_label
    focus = i if not L["true"] else wrong[0]
    ev = lines[focus]["evidence"]
    if ok:
        why = f"Line {i + 1} is wrong, and {lab(proof)} proves it. {reasons[i]}"
        head = "Objection sustained"
    elif not L["true"]:
        why = f"Line {i + 1} is wrong, but {lab(proof) if proof else 'that'} doesn't show it. {_cap(' or '.join(lab(k) for k in ev))} does (outlined). {reasons[i]}"
        head = "Right line, not proven"
    else:
        why = f"Line {i + 1} holds up: {reasons[i]} The wrong one{'s are lines' if len(wrong) > 1 else ' is line'} {', '.join(str(n + 1) for n in wrong)}. {reasons[wrong[0]]}"
        head = "That line holds up"
    k = d["kind"]
    g = P.cause_of(k, d["base"])
    lesson, term = (P.GROUP_LESSON[g] if g in P.GROUP_LESSON else P.EARLY_LESSON[k] if k in P.EARLY_LESSON and P.pos(d["base"]) < P.pos("s11") else LF.LESSONS[k])
    reply = (f"{d['who']}: ...you're right. I misread it." if ok else f"{d['who']}: that one's right, I checked it twice." if L["true"] else
             f"{d['who']}: maybe. Show me where.")
    return {"ok": ok, "guessed": not L["true"] and not ok, "head": head, "why": why, "line": i, "proof": proof, "marks": [x["true"] for x in lines], "reasons": reasons,
            "evidence": ev, "focus": focus, "spots": [f"line-{focus}"] + [spot_of(x) for x in ev], "reply": reply, "kind": k, "cause": P.name(g, d["base"]),
            "name": "Fewer people" if g in P.GROUP else LF.FILE_NAMES.get(k), "lesson": lesson, "term": term,
            "ledger": {"verdict": "ok" if ok else "unproven" if not L["true"] else "true_line", "head": head}, "retry_ok": True}


# ---------------------------------------------------------------- deal, day, answer
PENDING: dict[str, dict] = {}
DONE: dict[str, dict] = {}      # answered rounds, kept a while with their grade so the coach (lf_coach.py) can talk them over
GRADE = {"wait": _grade_wait, "objection": _grade_obj}


def _public(d: dict, rid: str) -> dict:
    mid, level, c = d["mode"], d["level"], d["case"]
    out = {"rid": rid, "mode": mid, "way": mid, "way_name": MODES[mid]["name"], "level": level, "stage": STAGE[level], "path_level": 1,
           "flow": c["flow"]["name"], "ftype": c["flow"].get("type"), "emails_n": len(c["flow"]["messages"]),
           "hint": d["hint"] if level in ("guided", "together", "try") else None, "walk": d["walk"] if level == "watch" else None,
           "demo": d["answer"] if level == "watch" else None, "q": {}}
    if mid == "wait":
        out.update(_wait_public(d))
        out["msg"] = MEET["wait"]["dana"].format(flow=c["flow"]["name"])
    else:
        base = d["base"]
        v = P.visible(base)
        charts = {k: x for k, x in d["charts"].items() if k in v or k == "main"}
        charts["main"] = {k: x for k, x in charts["main"].items() if k != "dots" or "dots" in v}
        out.update({"visible": v, "show_pct": P.pos(base) >= P.pos(P.PCT_FROM), "charts": charts, "dates": [x[5:] for x in c["dates"][6:]],
                    "msg": d["msg"].format(flow=c["flow"]["name"]), "who": d["who"], "lines": [{"n": i + 1, "text": L["text"]} for i, L in enumerate(d["lines"])]})
    return out


def deal(mid: str, level: str | None = None) -> dict:
    if mid not in MODES:
        return {"error": "No such way to play."}
    p = LF.progress()
    if not is_open(p, mid):
        return {"error": f"{MODES[mid]['name']} opens once you pass {needs_label(mid)}."}
    level = level if level in STAGE else level_for(p, mid)
    e = entry(p, mid)
    hist = e["history"]
    again = next((x for x in e.get("again", []) if len(hist) >= x["due"]), None) if level in ("guided", "solo", "hard") else None
    if again:                                    # a miss comes back two reps later, with a fresh case
        e["again"].remove(again)
        LF.save_progress(p)
    rng = random.Random(random.randrange(10**9))
    if mid == "wait":
        d = w_wait(rng, STAGE[level], level, again["key"] if again else None, wait_kinds(p))
        if d:
            d["walk"] = _wait_walk(d) if level == "watch" else None
            d["hint"], d["answer"] = WAIT_HINT, {"call": d["shown"]}
    else:
        P.AGAIN.kind = again["key"] if again else None
        try:
            d = w_objection(rng, STAGE[level], level, base_step(p))
        finally:
            P.AGAIN.kind = None
    if not d:
        return {"error": "Couldn't deal that one. Try again."}
    rid = uuid.uuid4().hex[:12]
    d.update({"mode": mid, "level": level})
    PENDING[rid] = d
    while len(PENDING) > 200:
        PENDING.pop(next(iter(PENDING)))
    return _public(d, rid)


def answer(rid: str, body: dict) -> dict:
    d = PENDING.get(rid)
    if d is None:
        return {"error": "That one expired. Here's a fresh one."}
    out = GRADE[d["mode"]](d, body)
    if out.get("error"):
        return out
    level = d["level"]
    if level == "together" and not out["ok"] and out.pop("retry_ok", False):
        say = "Not yet: the line is still inside the band. Wait." if d["mode"] == "wait" else ("That line holds up. Check the others." if out["marks"][out["line"]]
                                                                                              else "Right line. Now click the chart that proves it.")
        return {"ok": False, "retry": True, "say": say}
    out.pop("retry_ok", None)
    DONE[rid] = {**PENDING.pop(rid, d), "graded": out}
    while len(DONE) > 50:
        DONE.pop(next(iter(DONE)))
    p = LF.progress()
    newly = False
    if level in ("guided", "solo", "hard"):
        e = entry(p, d["mode"])
        e["history"].append({"ok": bool(out["ok"]), "ms": int(body.get("ms") or 0), "kind": d["kind"], "stage": STAGE[level], "level": level, "at": time.time(),
                             "verdict": out["ledger"]["verdict"]})
        newly = _check_pass(e)
        if not out["ok"]:
            e.setdefault("again", []).append({"key": d["again_key"], "due": len(e["history"]) + 1})
    LF.save_progress(p)
    return {**out, "newly_passed": newly, "summary": summary(LF.progress())}


def meet_done(mid: str) -> dict:
    p = LF.progress()
    if mid in MODES:
        entry(p, mid)["meet"] = entry(p, mid)["meet"] or time.time()
        LF.save_progress(p)
    return summary(LF.progress())
