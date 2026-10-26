"""Lifecycle Files, Level 7: Would they have bought anyway? (docs/CURRICULUM-L7.md)

Each case is a Level 1 flow (lifecycle_files._make_case, so the line reads exactly as it always has) plus two cards made
from the same daily numbers:
  - Store orders: every order the store took a week, from every source, next to the orders credited to this flow.
  - Holdout: 1 in 10 people who enter get no emails. Orders per 100 people, got the emails against held out.
Both cards carry two marks, "nothing changed" and "it's real" (as if every extra credited order were new), and a dot with
its bar (the store's normal wobble, the holdout's range). read_mark() says which mark the dot sits near. verdict() turns
the readings into what happened. Those two are the one judge: the answer key, the feedback and the tests all use them.

What the numbers encode (sources in docs/SCENARIO-IDEAS-FROM-DATA.md):
  - Hillstrom: 46 to 61% of an email's revenue per recipient came in with no email. Here 55 to 75% of what the people who
    got the emails ordered, they'd have ordered anyway.
  - RetailRocket: cart buys come fast, so a cart email minutes after the cart is credited with orders already on the way.
  - Dunnhumby: most 30-day silences end in a return with no help, so an early winback trigger mostly collects credit.

    KINDS      the seven case types, their names, lessons and what to do
    make7()    one case with its cards, re-rolled until every card reads the way its kind says, with a clear margin
    read_mark  which mark a dot sits near (or "both", "far", or None: too close to call)
    verdict    what happened, from the readings
    segments() the holdout split by New and Returning customers (step 7s6)
"""
from __future__ import annotations
import math
import random
from datetime import date

import numpy as np

import lifecycle_files as LF
import lf_proto as LP

KINDS = ["delay_cut", "real_win", "winback_early", "attribution_cut", "checkout_down", "sale_lift", "noise7"]
UP = ("delay_cut", "real_win", "winback_early", "sale_lift")
DOWN = ("attribution_cut", "checkout_down")
NAMES = {"delay_cut": "The Fast Follow-up", "real_win": "The Better Email", "winback_early": "Too Soon to Miss Us",
         "attribution_cut": "The Shorter Window", "checkout_down": "Everyone's Problem", "sale_lift": "Everybody's Buying",
         "noise7": "Nothing to See"}
CAUSE = {"delay_cut": "The cart email moved to minutes after the cart", "real_win": "A better email",
         "winback_early": "The winback trigger moved earlier", "attribution_cut": "The attribution window got shorter",
         "checkout_down": "Checkout broke for the whole store", "sale_lift": "A store-wide sale", "noise7": "Nothing: normal wobble"}
LESSONS = {
    "delay_cut": ("Moving the cart email to minutes after the cart puts it in front of people who were about to buy. Klaviyo credits their "
                  "orders to the flow, but they were on the way anyway, so the store gains nothing. Put the delay back to an hour or more.",
                  "Attributed vs incremental"),
    "real_win": ("Credited orders rose and the extra orders are real: people bought who wouldn't have. The new email really adds "
                 "orders. Keep it, and copy what changed.", "Incremental lift"),
    "winback_early": ("Moving the winback trigger from 60 to 30 days pulls in people who come back on their own. Entries and credit jump, "
                      "and what the emails add per person falls. Trigger it at 3 to 4 times a customer's usual gap, and hold some out.",
                      "Incrementality"),
    "attribution_cut": ("Credited orders fell on every email while people bought as much as ever: only the credit fell. A shorter "
                        "attribution window in Klaviyo does that to every flow on the same day. Note it, and compare like with like.", "Attribution window"),
    "checkout_down": ("The store fell far more than the flow did: the whole store lost orders, so checkout, the site or stock broke. "
                      "The flow is fine. Tell the owner today, with what it costs.", "External cause"),
    "sale_lift": ("The whole store rose far more than the flow: a sale lifted everyone, people who got no email too. The flow's extra "
                  "credit came from the sale, not the emails. Only a holdout can split the two.", "Confound"),
    "noise7": ("The line stayed inside its normal range. Nothing to explain, so there's nothing for the other cards to check.", "Normal variation"),
}
ACTION_OF = {"delay_cut": "undo", "real_win": "keep", "winback_early": "undo", "attribution_cut": "note", "checkout_down": "escalate",
             "sale_lift": "note", "noise7": "nothing"}
ACTIONS = [["keep", "Keep it, and copy what changed"], ["undo", "Undo it: it only moved credit"], ["escalate", "Tell the owner today"],
           ["note", "Note it, change nothing in the flow"], ["wait", "Wait for more weeks"], ["nothing", "Nothing to do"]]
ACTION_WHY = {
    "keep": "Keep it, and copy what changed: the flow really adds orders now.",
    "undo": "Undo it: the change moved credit onto the flow and added no orders. Every extra send and discount went to people who were buying anyway.",
    "escalate": "Tell the owner today: the whole store is losing orders, and the flow can't fix that.",
    "note": "Note it, and change nothing in the flow: the move came from outside it (a setting, a sale), not from what the emails do.",
    "wait": "Wait for more weeks: neither check can tell yet, so any call now is a guess.",
    "nothing": "Nothing to do: the line never left its normal range.",
}
VERDICTS = [["up_real", "The flow added orders"], ["up_credit", "The flow got credit it didn't earn"], ["down_real", "Orders were really lost"],
            ["down_credit", "The flow lost credit, not orders"], ["cant_tell", "Can't tell yet"], ["nothing", "Nothing moved"]]
MARKS = [["real", "At the “it's real” mark"], ["nothing", "At the “nothing changed” mark"], ["far", "Far past both marks"],
         ["both", "Both marks fit"]]
LINE = [["above", "Above its normal range"], ["inside", "Inside its normal range"], ["below", "Below its normal range"]]
SEGS = [["new", "New customers"], ["returning", "Returning customers"], ["cant", "Can't tell yet"]]
MARGIN = {"obvious": 0.35, "clear": 0.25, "realistic": 0.12}      # how far a dot's bar must clear a mark, or cover it, as a share of the bar
WOBBLE = {"obvious": 0.012, "clear": 0.02, "realistic": 0.035}   # the store's week-to-week wobble on top of chance (real stores wobble more)
HOLD = 9                                                          # 1 in 10 held out: 1 held out for every 9 who get the emails


# ---------------------------------------------------------------- the judge
def read_mark(dot: float, half: float, nothing: float, real: float, margin: float) -> str | None:
    """Which mark the dot sits near. A mark fits when the dot's bar covers it, and every mark must be clearly in or out
    (outside the bar's edge by `margin` of its width either way). None: too close to call, or near neither mark."""
    dn, dr = abs(dot - nothing), abs(dot - real)
    lo, hi = half * (1 - margin), half * (1 + margin)
    if lo < dn < hi or lo < dr < hi:
        return None
    near_n, near_r = dn <= lo, dr <= lo
    if near_n and near_r:
        return "both"
    if near_r:
        return "real"
    if near_n:
        return "nothing"
    way = 1 if real > nothing else -1 if real < nothing else 0
    if way and (dot - real) * way > 0 and dr >= max(hi, 0.25 * abs(real - nothing)):
        return "far"
    return None


def verdict(line: str, store: str | None, added: str | None) -> str:
    """What happened, from the screen. The line first. A store that fell far past both marks lost orders everywhere: real,
    whatever the holdout says (the held-out people hit the same break). Then the holdout when it settles it, then the store."""
    if line == "inside":
        return "nothing"
    up = line == "above"
    if store == "far" and not up:
        return "down_real"
    if added in ("real", "nothing"):
        return ("up_" if up else "down_") + ("real" if added == "real" else "credit")
    if store in ("real", "nothing"):
        return ("up_" if up else "down_") + ("real" if store == "real" else "credit")
    return "cant_tell"


def action(kind: str, v: str) -> str:
    return "wait" if v == "cant_tell" else ACTION_OF[kind]


# ---------------------------------------------------------------- a case
def _flow_plan(kind: str, r: random.Random, hold: str) -> tuple[str, str, dict, int, dict]:
    """The Level 1 kind its flow is built on, the flow type, the plan overrides, people a week, and the fault's sizes."""
    small = hold == "small"
    weekly = r.randint(400, 1100) if small else r.randint(7000, 22000)
    if kind == "delay_cut":
        f = r.uniform(2.2, 3.0)
        return "good_news", "cart", {"order": lambda i, f=f: f if i == 0 else 1.0, "click": lambda i, f=f: 1 + (f - 1) * 0.3 if i == 0 else 1.0,
                                     "open": None, "msg": None}, weekly, {"f": f}
    if kind == "real_win":
        f = r.uniform(1.45, 1.8)
        return "good_news", r.choice(["cart", "welcome", "browse", "winback"]), {"order": lambda i, f=f: f, "click": lambda i, f=f: 1 + (f - 1) * 0.8,
                                                                      "open": None, "msg": None}, weekly, {"f": f}
    if kind == "winback_early":
        m, q = r.uniform(2.5, 3.2), r.uniform(1.8, 2.4)
        return "volume_mix", "winback", {"mix": (m, q)}, (r.randint(300, 700) if small else r.randint(5000, 10000)), {"m": m, "q": q}
    if kind in ("attribution_cut", "checkout_down"):
        f = r.uniform(0.55, 0.72) if kind == "attribution_cut" else r.uniform(0.40, 0.62)
        if kind == "checkout_down" and not small:
            weekly = r.randint(1500, 5000)
        return "conv_drop_all", r.choice(["cart", "welcome", "browse"]), {"order": lambda i, f=f: f}, weekly, {"f": f}
    if kind == "sale_lift":
        g = r.uniform(1.35, 1.7)
        return "good_news", r.choice(["cart", "welcome", "browse"]), {"order": lambda i, g=g: g, "click": lambda i, g=g: 1 + (g - 1) * 0.5,
                                                                      "open": None, "msg": None}, weekly, {"g": g, "L": r.uniform(1.22, 1.4)}
    return "noise", r.choice(["cart", "welcome", "browse", "post_purchase", "winback"]), {}, weekly, {}


def _line(obs: dict) -> str | None:
    return {LP.ABOVE: "above", LP.BELOW: "below", LP.IN: "inside"}.get(obs.get("main"))


WANT_LINE = {**{k: "above" for k in UP}, **{k: "below" for k in DOWN}, "noise7": "inside"}
STORE_OF = {"delay_cut": "nothing", "real_win": "real", "winback_early": "nothing", "attribution_cut": "nothing", "checkout_down": "far",
            "sale_lift": "far", "noise7": None}
ADDED_OF = {"delay_cut": "nothing", "real_win": "real", "winback_early": "nothing", "attribution_cut": "nothing", "checkout_down": ("real", "both"),
            "sale_lift": "nothing", "noise7": None}
QUIET_OK = ("both", "nothing")    # nothing moved: the cards may read either way, never "it's real" or "far past"
# checkout_down: the held-out people hit the same broken checkout, so the holdout shows Added falling with the credit, or
# can't tell. Never "nothing changed". The store settles it either way: the whole store lost orders.


def expect(kind: str, store: str, hold: str) -> tuple[str | None, str | None]:
    """The reading each card should give for this kind at these sizes (None: either of QUIET_OK)."""
    st, hd = STORE_OF[kind], ADDED_OF[kind]
    if store == "hide" and st in ("real", "nothing"):
        st = "both"
    if hold == "small" and isinstance(hd, str):
        hd = "both"
    return st, hd


def _ok(want) -> tuple:
    return QUIET_OK if want is None else want if isinstance(want, tuple) else (want,)


def _store(c: dict, kind: str, meta: dict, hd: dict, store: str, stage: str, rng: random.Random, nrs) -> dict:
    """Every order the store took, a day, made around the flow's own credited orders."""
    t = LF.totals(c)
    o = t["orders"]
    c0w, c1w = sum(o[:28]) / 4, sum(o[49:56])
    dc = c1w - c0w
    sig = WOBBLE[stage]
    q = {"show": rng.uniform(2.7, 4.0), "hide": rng.uniform(0.15, 0.45)}[store] if kind not in ("checkout_down", "sale_lift") else \
        rng.uniform(0.5, 1.4) if kind == "checkout_down" else rng.uniform(0.35, 0.9)
    if kind == "winback_early" and store == "show":
        q = rng.uniform(1.9, 2.6)       # the newcomers add a few real orders, so the store sits a little off "nothing changed"
    W = max(abs(dc), 0.06 * c0w, 3) / q
    half = W / 2                                                  # W is two standard deviations of a week
    S0 = (-1 + math.sqrt(1 + 4 * sig ** 2 * half ** 2)) / (2 * sig ** 2)
    S0 = max(S0, c0w / rng.uniform(0.18, 0.32))                   # one flow is at most about a third of the store's orders
    if kind == "noise7":
        S0 = c0w / rng.uniform(0.04, 0.3)
    start = c["l7"]["start"]
    wk = [1 + nrs.normal(0, sig) for _ in range(8)]
    wd = [w / (sum(LF.WEEKDAY) / 7) for w in LF.WEEKDAY]
    days = [date.fromisoformat(d) for d in c["dates"]]
    extra = [0.0] * LF.DAYS
    if kind == "real_win":                                       # the store gains what the flow gained, on average
        gain = max(0.0, sum(o[start:]) / (LF.DAYS - start) - sum(o[:28]) / 28)
        extra = [gain if i >= start else 0.0 for i in range(LF.DAYS)]
    elif kind == "winback_early":                                # only what the emails added for the newcomers
        e = c["entered"]
        extra = [max(0.0, (hd["true"]["a1"] * e[i] - hd["true"]["a0"] * sum(e[:28]) / 28) / 100) if i >= start else 0.0 for i in range(LF.DAYS)]
    mult = [1.0] * LF.DAYS
    if kind == "checkout_down":
        mult = [meta["f"] if i >= start else 1.0 for i in range(LF.DAYS)]
    elif kind == "sale_lift":
        mult = [meta["L"] if i >= start else 1.0 for i in range(LF.DAYS)]
    daily = [int(nrs.poisson(max(0.0, S0 / 7 * wd[days[i].weekday()] * wk[i // 7] * mult[i] + extra[i]))) for i in range(LF.DAYS)]
    base = sum(daily[:28]) / 4
    last = sum(daily[49:56])
    W = 2 * math.sqrt(base + (sig * base) ** 2)
    roll = LF.rolling(daily)
    croll = LF.rolling(o)
    return {"daily": daily, "series": [round(v) for v in roll[6:]], "base": round(base), "last": last, "wobble": round(W), "share": round(c0w / base, 3),
            "credited": {"base": round(c0w), "last": c1w, "series": [round(v) for v in croll[6:]]}, "dc": round(dc),
            "marks": {"nothing": round(base), "real": round(base + dc)}}


def _rates(c: dict, kind: str, meta: dict, rng: random.Random) -> dict:
    """The true orders per 100 people for those who got the emails (g), held out (h) and the gap (a), quiet weeks and
    last 14 days, built so the credited orders on the flow's own chart are a share of what the people who got it ordered."""
    t = LF.totals(c)
    e = c["entered"]
    Eq, El = sum(e[:28]), sum(e[42:56])
    cq, cl = sum(t["orders"][:28]) / Eq * 100, sum(t["orders"][42:56]) / El * 100
    s0 = rng.uniform(0.30, 0.42) if kind == "delay_cut" else rng.uniform(0.45, 0.65)   # credited, as a share of all they ordered
    g0 = cq / s0
    a0 = cq * rng.uniform(0.35, 0.6)          # Hillstrom: the email added 39 to 54% of what got credited
    h0 = g0 - a0
    if kind == "real_win":
        g1, h1 = g0 + (cl - cq), h0
    elif kind == "winback_early":
        a1 = a0 * rng.uniform(0.7, 0.9)           # the newcomers were coming back anyway: the emails add less per person
        g1 = cl / s0
        h1 = g1 - a1
    elif kind == "checkout_down":
        f = cl / cq
        g1, h1 = g0 * f, h0 * f
    elif kind == "sale_lift":
        h1 = h0 * meta["L"]
        g1 = h1 + a0
    else:
        g1, h1 = g0, h0
    return {"Eq": Eq, "El": El, "cq": cq, "cl": cl, "g0": g0, "h0": h0, "a0": g0 - h0, "g1": g1, "h1": h1, "a1": g1 - h1}


def _holdout(tr: dict, nrs) -> dict:
    """Simulate the counts: everyone who entered got the emails, plus 1 held out for every 9 of them."""
    def period(E, g, h):
        nh = max(1, round(E / HOLD))
        og, oh = int(nrs.binomial(E, min(0.95, g / 100))), int(nrs.binomial(nh, min(0.95, h / 100)))
        pg, ph = og / E, oh / nh
        se = math.sqrt(max(pg * (1 - pg), 1e-6) / E + max(ph * (1 - ph), 0.25 / nh) / nh)     # a floor so 0 orders still has a range
        return {"people": E, "held_n": nh, "got_orders": og, "held_orders": oh, "got": pg * 100, "held": ph * 100, "added": (pg - ph) * 100,
                "range": 2 * se * 100}
    q, l = period(tr["Eq"], tr["g0"], tr["h0"]), period(tr["El"], tr["g1"], tr["h1"])
    q["credited"], l["credited"] = tr["cq"], tr["cl"]
    dc = tr["cl"] - tr["cq"]
    return {"quiet": q, "last": l, "dc": dc, "marks": {"nothing": q["added"], "real": q["added"] + dc},
            "true": {"a0": tr["a0"], "a1": tr["a1"]}}


def make7(kind: str, rng: random.Random, stage: str, store: str = "show", hold: str = "tell", need_added: bool = True, tries: int = 60):
    """One case of this kind whose line, store card and holdout card each read the way the kind says at these sizes,
    every reading clear by the stage's margin. None if it can't be done (some sizes don't fit some kinds)."""
    want_st, want_hd = expect(kind, store, hold)
    m = MARGIN[stage]
    for _ in range(tries * (3 if kind == "winback_early" else 1)):       # the winback's marks sit close: more draws miss
        seed = rng.randrange(10**9)
        r, nrs = random.Random(seed), np.random.default_rng(seed)
        base, ft, plan, weekly, meta = _flow_plan(kind, r, hold)
        start = None if kind == "noise7" else r.randint(32, 41)
        force = {"ftype": ft, "weekly": weekly, "plan": plan, **({"start": start} if start is not None else {})}
        c = LF._make_case(base, seed, None, stage, force)
        obs, charts = LP.observe(c)
        line = _line(obs)
        if line != WANT_LINE[kind]:
            continue
        c["l7"] = {"kind": kind, "start": start, "meta": {k: round(v, 3) for k, v in meta.items()}, "store_size": store, "hold_size": hold}
        tr = _rates(c, kind, meta, r)
        if tr["cl"] > tr["g1"] * 0.95 or tr["h1"] <= 0 or tr["a0"] <= 0:
            continue
        for _j in range(8):                                   # the cards' own chance: a few tries on the same flow
            hd = _holdout(tr, nrs)
            st = _store(c, kind, meta, hd, store, stage, r, nrs)
            c["l7"].update({"store": st, "hold": hd})
            s_read, h_read = read_cards(cards(c, True), m)        # the judge reads the numbers as the screen rounds them
            if s_read not in _ok(want_st) or need_added and h_read not in _ok(want_hd):
                continue
            v = verdict(line, s_read, h_read if need_added else None)
            R = {"line": line, "store": s_read, "added": h_read if need_added else None, "verdict": v, "action": action(kind, v),
                 "kind": kind, "sizes": {"store": store, "hold": hold}}
            return c, obs, charts, R
    return None


def read_cards(cd: dict, margin: float) -> tuple[str | None, str | None]:
    """Each card's reading, from the card as the page shows it."""
    st = cd["store"]
    s_read = read_mark(st["last"], st["wobble"], st["marks"]["nothing"], st["marks"]["real"], margin)
    h = cd.get("holdout")
    h_read = read_mark(h["last"]["added"], h["last"]["range"], h["marks"]["nothing"], h["marks"]["real"], margin) if h else None
    return s_read, h_read


def cards(c: dict, with_hold: bool) -> dict:
    """The two cards as the page draws them: numbers only, rounded the way the screen shows them."""
    st, hd = c["l7"]["store"], c["l7"]["hold"]
    out = {"store": {k: st[k] for k in ("series", "base", "last", "wobble", "dc", "marks", "share")} | {"credited": st["credited"]}}
    if with_hold:
        r1 = lambda v: round(v, 1)
        per = lambda p: {"got": r1(p["got"]), "held": r1(p["held"]), "added": r1(p["added"]), "credited": r1(p["credited"]), "range": r1(p["range"]),
                         "people": p["people"], "held_n": p["held_n"], "held_orders": p["held_orders"]}
        out["holdout"] = {"quiet": per(hd["quiet"]), "last": per(hd["last"]), "dc": r1(hd["dc"]),
                          "marks": {"nothing": r1(hd["marks"]["nothing"]), "real": r1(hd["marks"]["real"])}}
    return out


# ---------------------------------------------------------------- the holdout by group (step 7s6)
def segments(rng: random.Random, stage: str, want: str, tries: int = 80) -> dict | None:
    """New and Returning customers, last 4 weeks: credited, got, held out, Added with its range. Returning customers always
    show the higher credited number. want: which group the emails help more ("new", "returning"), or "cant"."""
    m = MARGIN[stage]
    for _ in range(tries):
        nrs = np.random.default_rng(rng.randrange(10**9))
        big = want != "cant"
        n = {"new": rng.randint(9000, 30000) if big else rng.randint(500, 1500), "returning": rng.randint(9000, 30000) if big else rng.randint(500, 1500)}
        if want == "returning":
            a = {"new": rng.uniform(0.8, 2.0), "returning": rng.uniform(3.5, 6.0)}
        elif want == "new":
            a = {"new": rng.uniform(3.0, 6.0), "returning": rng.uniform(0.6, 1.8)}
        else:
            x = rng.uniform(1.5, 4.0); a = {"new": x * rng.uniform(0.8, 1.25), "returning": x * rng.uniform(0.8, 1.25)}
        h = {"new": rng.uniform(1.5, 4.0), "returning": rng.uniform(8.0, 14.0)}
        share = {"new": rng.uniform(0.42, 0.55), "returning": rng.uniform(0.62, 0.75)}
        rows = []
        for gk, label in (("new", "New customers"), ("returning", "Returning customers")):
            E, nh = n[gk], max(1, round(n[gk] / HOLD))
            g = h[gk] + a[gk]
            og, oh = int(nrs.binomial(E, g / 100)), int(nrs.binomial(nh, h[gk] / 100))
            pg, ph = og / E, oh / nh
            se = math.sqrt(max(pg * (1 - pg), 1e-6) / E + max(ph * (1 - ph), 0.25 / nh) / nh)
            rows.append({"id": gk, "name": label, "people": E, "held_n": nh, "held_orders": oh, "got": round(pg * 100, 1), "held": round(ph * 100, 1),
                         "added": round((pg - ph) * 100, 1), "range": round(2 * se * 100, 1), "credited": round(pg * 100 * share[gk], 1)})
        nw, rt = rows
        if rt["credited"] <= nw["credited"] * 1.4:
            continue                                         # the trap: Returning always looks better on credit
        got = read_segments(rows, m)
        if got == want:
            return {"rows": rows, "answer": got, "gap": round(abs(nw["added"] - rt["added"]), 1)}
    return None


def read_segments(rows: list[dict], margin: float) -> str | None:
    """Which group the emails help more: the two Added ranges clearly apart ("new" or "returning"), clearly overlapping
    ("cant"), or too close to call (None)."""
    nw, rt = rows
    gap, span = abs(nw["added"] - rt["added"]), nw["range"] + rt["range"]
    if gap > span * (1 + margin):
        return "new" if nw["added"] > rt["added"] else "returning"
    if gap < span * (1 - margin) * 0.6:
        return "cant"
    return None
