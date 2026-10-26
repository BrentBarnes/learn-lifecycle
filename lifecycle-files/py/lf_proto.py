"""Three Level 1 prototypes that make you reason from the charts to the cause (2026-10-13).

The first mini-games could be won by spotting which of two lines dropped. These three can't: each one only pays off
if you know what a failure does to every chart. See docs/DESIGN.md "Level 1 prototypes".

    Suspects     Dana's message and the main chart are on screen, six suspects on the board, eight clue cards face
                 down and three looks. Flip, cross out, accuse. Teaches where to look and what each chart rules out.
    Call it      A cause on a card, the Flow tab blank. Say what each chart will do, then see a real case of it.
                 Teaches the failure story itself: what moves and what holds.
    Look-alikes  The whole Flow tab and three causes that share the obvious move. Pick the one that fits all of it,
                 then point at the chart that rules out the closest look-alike. Teaches the deciding chart.

Every case is a real make_case() case, re-rolled until its charts match its story (consistent()), so the feedback
never contradicts what's on screen.
"""
from __future__ import annotations
import random, statistics, time, uuid

import lifecycle_files as LF

TILES = ["entered", "delivered", "opens", "clicks", "orders", "order_size", "unsubs"]
CLUES = TILES + ["emails"]                  # what Suspects keeps face down
FREE = ["main", "revenue", "lastweek"]      # on screen from the start: the main chart, this week's and last week's revenue
U, D, F, Z = "up", "down", "flat", "zero"
IN, BELOW, ABOVE = "inside", "below", "above"
ONE, SAME = "one", "same"
LABEL = {"main": "Revenue per recipient", "revenue": "Revenue, last 7 days", "lastweek": "The week before", "entered": "Entered the flow", "delivered": "Got the email",
         "opens": "Opens", "clicks": "Clicks", "orders": "Orders", "order_size": "Order size", "unsubs": "Unsubscribes", "emails": "Each email"}
SAY = {U: "up", D: "down", F: "held", Z: "to almost zero", IN: "inside its normal range", BELOW: "below its normal range",
       ABOVE: "above its normal range", ONE: "one email out of line", SAME: "every email about the same"}

_ = None
SCRIPTS = {   # what each failure story does to each chart. None: not part of the story, so it says nothing either way
    #                 main    revenue entered delivered opens clicks orders order_size unsubs emails
    "entries_drop":   (IN,    D,      D,      D,        F,    F,     F,     F,         _,     _),
    "delivery_drop":  (IN,    D,      F,      D,        F,    F,     F,     F,         _,     _),
    "click_drop_one": (_,     _,      F,      F,        F,    D,     _,     F,         _,     ONE),
    "conv_drop_all":  (BELOW, D,      F,      F,        F,    F,     D,     F,         _,     SAME),
    "conv_drop_one":  (BELOW, D,      F,      F,        F,    F,     D,     F,         _,     ONE),
    "aov_drop":       (BELOW, D,      F,      F,        F,    F,     F,     D,         _,     SAME),
    "tracking_break": (BELOW, D,      F,      F,        F,    F,     Z,     _,         _,     SAME),
    "slow_slide":     (BELOW, D,      F,      F,        F,    D,     D,     F,         _,     SAME),
    "volume_mix":     (BELOW, U,      U,      U,        F,    F,     D,     F,         _,     _),
    "unsub_spike":    (IN,    _,      F,      F,        F,    F,     F,     F,         U,     ONE),
    "mpp_opens":      (IN,    _,      F,      F,        U,    F,     F,     F,         _,     _),
    "good_news":      (ABOVE, U,      F,      F,        _,    U,     U,     F,         _,     ONE),
    "big_order":      (ABOVE, U,      F,      F,        F,    F,     F,     U,         _,     _),
    "black_friday":   (IN,    U,      F,      U,        F,    _,     _,     _,         _,     _),
    "noise":          (IN,    _,      F,      F,        _,    _,     _,     _,         _,     _),
}
KEYS = ["main", "revenue"] + CLUES
SCRIPTS = {k: dict(zip(KEYS, v)) for k, v in SCRIPTS.items()}
for _k, _s in SCRIPTS.items():               # the week before: way up only when it was Black Friday
    _s["lastweek"] = U if _k == "black_friday" else F if _k == "noise" else None
KEYS = KEYS + ["lastweek"]
CANT = {   # readings a story can't produce on a chart it otherwise says nothing about (None above): a broken link never adds sales
    "click_drop_one": {"main": {ABOVE}, "revenue": {U}, "orders": {U}},
}
ODD = {   # the email that's out of line in the Each email table: what each one-email story can't show on it, column by column
    "click_drop_one": {"clicks": {U, F}, "orders": {U}},
    "conv_drop_one": {"clicks": {D}, "orders": {U, F}},
    "good_news": {"clicks": {D}, "orders": {D}},
    "unsub_spike": {"unsubs": {D, F}},
}
ODD_SAY = {   # what each one-email story does to that email, as a clause
    "click_drop_one": "the email that's out of line would have lost clicks",
    "conv_drop_one": "the email that's out of line would keep its clicks and lose orders",
    "good_news": "the email that's out of line would get more clicks and orders",
    "unsub_spike": "the email that's out of line would lose far more people to unsubscribes",
}
CANT_WHY = {"click_drop_one": "a broken link only loses clicks and sales"}
CAUSE = {   # the suspect cards: the cause in plain words, never the file name
    "entries_drop": "Fewer people are entering the flow", "delivery_drop": "People enter, but fewer get the emails",
    "click_drop_one": "A broken link or image in one email", "conv_drop_all": "Checkout or the site broke after the click",
    "conv_drop_one": "One email sends people to an expired code or sold-out product", "aov_drop": "Orders got smaller: a cheaper product or deeper discount",
    "tracking_break": "Orders stopped being tracked", "slow_slide": "The emails are wearing out, a little every week",
    "volume_mix": "A flood of new, less-ready signups", "unsub_spike": "One email is driving people off the list",
    "mpp_opens": "Apple Mail Privacy is inflating opens", "good_news": "One email started working better",
    "big_order": "One huge order", "black_friday": "It's being compared with Black Friday week", "noise": "Nothing: normal wobble on a small flow",
}
STORY = {   # Call it: the setup on the card, two different-looking versions of each story (vary the context, keep the cause)
    "entries_drop": ["The signup pop-up stopped loading on mobile on Tuesday.", "A sync error since last week adds only about half of the people who should start this flow, picked at random."],
    "delivery_drop": ["A bulk import marked about half the list as suppressed by mistake, so their emails are skipped.", "A batch of Gmail addresses started bouncing after a DNS change."],
    "click_drop_one": ["Email 2's main button now links to a page that 404s.", "The hero image in one email stopped loading, and so did its button."],
    "conv_drop_all": ["Checkout is throwing an error on mobile since the theme update.", "Shipping now costs $14 at checkout, up from free."],
    "conv_drop_one": ["The 15%-off code in one email expired last week.", "One email features the Ethiopia Guji, which just sold out."],
    "aov_drop": ["The flow now leads with the Paper Filters 100-Pack instead of the grinder, so more orders are just filters.", "Free shipping now starts at $25 instead of $100, so fewer people add a second item."],
    "tracking_break": ["The Shopify integration disconnected. Orders still happen, Klaviyo just can't see them.", "A checkout app change dropped the tracking script from the thank-you page."],
    "slow_slide": ["The same three emails have run unchanged for two years, and people tune them out a little more each week.", "Each week the flow reaches people who've already seen it many times."],
    "volume_mix": ["A giveaway pop-up brought in thousands of sign-ups who only wanted the prize.", "A partner shared a 'free sticker' link with a huge audience."],
    "unsub_spike": ["One email now goes out with a pushy 'LAST CHANCE' subject line.", "One email now reaches people the day they buy, before the order has even shipped."],
    "mpp_opens": ["A big share of the list moved to Apple Mail with privacy protection on.", "An iOS update turned on Mail Privacy Protection for many more of the list."],
    "good_news": ["One email now features the new espresso that's selling out on the site.", "One email's offer changed from 10% off to free shipping, and people like it."],
    "big_order": ["A café bought a year of beans in a single order.", "A company ordered 40 grinders in one go as staff gifts."],
    "black_friday": ["Last week is being compared with Black Friday week.", "The weekly report puts this week next to Black Friday."],
    "noise": ["Nothing changed. It's a small flow.", "Nothing changed at all this week."],
}


# ---------------------------------------------------------------- reading a case the way the screen shows it
def _series(c: dict) -> dict:
    t = LF.totals(c); t["entered"] = c["entered"]
    r = {k: LF.rolling(v) for k, v in t.items()}
    ratio = lambda a, b: [None if a[i] is None or not b[i] else a[i] / b[i] for i in range(len(a))]
    return {"entered": r["entered"], "delivered": r["delivered"], "opens": ratio(r["opens"], r["delivered"]), "clicks": ratio(r["clicks"], r["delivered"]),
            "orders": ratio(r["orders"], r["delivered"]), "order_size": ratio(r["revenue"], r["orders"]), "unsubs": ratio(r["unsubs"], r["delivered"]),
            "main": ratio(r["revenue"], r["delivered"]), "revenue": r["revenue"]}


def _chg(s: list) -> tuple[float, float, float]:
    b = [v for v in s[6:28] if v is not None]
    base = sum(b) / len(b) if b else 0
    last = s[-1] or 0
    return base, last, (last / base - 1 if base else 0.0)


def _move(ch: float, zero: bool = False) -> str | None:
    """Held under 12%, moved from 15%, and the gap between is too close to call (that case gets re-rolled)."""
    if zero and ch <= -0.85: return Z
    if abs(ch) < 0.12: return F
    if abs(ch) >= 0.15 and not (zero and ch < -0.80): return U if ch > 0 else D
    return None


MIN_N = {"clicks": 40, "orders": 12, "unsubs": 8}


def _odd_move(x: float, k: str) -> str | None:
    """Which way the email that's out of line moved on one number, against its own quiet weeks (what the table prints)."""
    up, down, held = (1.0, -0.5, 0.3) if k == "unsubs" else (0.3, -0.3, 0.15)
    return U if x >= up else D if x <= down else F if abs(x) < held else None


def _emails(c: dict, cols=("clicks", "orders", "unsubs")) -> tuple[str | None, list[dict], dict | None]:
    """One email out of line, or every email about the same, from the per-email rates (clicks, orders, unsubscribes).
    An email only counts as out of line on a number it has enough of to read (a handful of orders can swing 50%).
    With one out of line, also which way that email moved on each number (odd): a broken link can't show up as one email
    whose clicks went up. The odd one is the email furthest out (with two emails both are "apart from the other")."""
    msgs, rows, enough = c["flow"]["messages"], [], []
    def ch(d, k):
        bn, bd, ln, ld = sum(d[k][:28]), sum(d["delivered"][:28]), sum(d[k][-7:]), sum(d["delivered"][-7:])
        return (ln / ld) / (bn / bd) - 1 if bd and ld and bn else 0.0
    for m in msgs:
        d = c["by_message"][m["id"]]
        rows.append({"name": m["name"], "day": m["day"], **{k: round(ch(d, k), 3) for k in cols}})
        enough.append({k: sum(d[k][:28]) / 4 >= MIN_N[k] or sum(d[k][-7:]) >= MIN_N[k] for k in cols})
    if len(rows) < 2:
        return None, rows, None
    best = None
    for k in cols:
        lim = 1.5 if k == "unsubs" else 0.35
        for i, r in enumerate(rows):
            others = [x[k] for j, x in enumerate(rows) if j != i]
            gap, spread = abs(r[k] - sum(others) / len(others)), max(others) - min(others)
            if enough[i][k] and gap >= lim and spread < (0.8 if k == "unsubs" else 0.3) and gap > 2 * spread:
                score = (gap / lim, abs(r[k]))
                if best is None or score > best[0]:
                    best = (score, i)
    if best:
        i = best[1]
        odd = {"email": rows[i]["name"], "ch": {k: rows[i][k] for k in cols}, **{k: _odd_move(rows[i][k], k) if enough[i][k] else None for k in cols}}
        return ONE, rows, odd
    if all(max(x[k] for x in rows) - min(x[k] for x in rows) < 0.3 for k in cols if k != "unsubs"):
        return SAME, rows, None
    return None, rows, None


def observe(c: dict) -> tuple[dict, dict]:
    """What each chart shows (the state a player would read off it), plus the numbers to draw it."""
    S, obs, charts = _series(c), {}, {}
    b = c["band"]
    for k in ["main", "revenue"] + TILES:
        base, last, ch = _chg(S[k])
        charts[k] = {"series": [None if v is None else round(v, 5) for v in S[k][6:]], "base": base, "last": last, "ch": round(ch, 4)}
    m, pad = charts["main"]["last"], 0.03 * b["mid"]
    obs["main"] = BELOW if m < b["lo"] - pad else ABOVE if m > b["hi"] + pad else IN if b["lo"] + pad <= m <= b["hi"] - pad else None
    charts["main"]["band"] = b
    t = LF.totals(c)
    charts["main"]["dots"] = [round(t["revenue"][i] / t["delivered"][i], 4) if t["delivered"][i] else None for i in range(6, LF.DAYS)]
    wk = LF.weekly_revenue(c)
    quiet = sum(wk[:4]) / 4
    charts["revenue"].update({"week": round(wk[-1]), "quiet": round(quiet), "prev": round(wk[-2]), "ch": round(wk[-1] / quiet - 1 if quiet else 0, 4),
                              "weeks": [round(x) for x in wk]})
    obs["revenue"] = _move(charts["revenue"]["ch"])
    lw = wk[-2] / quiet - 1 if quiet else 0
    charts["revenue"]["prev_ch"] = round(lw, 4)
    obs["lastweek"] = U if lw >= 0.4 else F if abs(lw) < 0.2 else None
    for k in TILES:
        obs[k] = _move(charts[k]["ch"], zero=(k == "orders"))
    obs["emails"], charts["emails"], obs["odd"] = _emails(c)
    return obs, charts


def breaks(obs: dict, cause: str, k: str, scripts: dict | None = None) -> bool:
    """True when chart k's reading can't happen under this story: it reads differently from what the story predicts, it's a
    reading the story can never produce (CANT), or the email that's out of line moved the wrong way for it (ODD)."""
    v, s = obs.get(k), (scripts or SCRIPTS)[cause]
    if v is None:
        return False
    if s.get(k) is not None and v != s[k]:
        return True
    if v in CANT.get(cause, {}).get(k, ()):
        return True
    return k == "emails" and odd_breaks(obs, cause)


def odd_breaks(obs: dict, cause: str) -> bool:
    """The Each email table rules this story out on which way the odd email moved (obs["odd"]), not on one-or-all."""
    o = obs.get("odd")
    return obs.get("emails") == ONE and bool(o) and any(o.get(col) in bad for col, bad in ODD.get(cause, {}).items())


def consistent(kind: str, obs: dict) -> bool:
    return all(obs.get(k) == s for k, s in SCRIPTS[kind].items() if s is not None) and not any(breaks(obs, kind, k) for k in KEYS)


def make(kind: str, rng: random.Random, stage: str) -> tuple[dict, dict, dict]:
    for _ in range(80):
        c = LF.make_case(kind, rng.randrange(10**9), stage=stage)
        obs, charts = observe(c)
        if consistent(kind, obs):
            return c, obs, charts
    return c, obs, charts


def rules_out(obs: dict, suspect: str, keys=KEYS) -> list[str]:
    """The charts whose reading contradicts what this suspect would have done."""
    return [k for k in keys if breaks(obs, suspect, k)]


# ---------------------------------------------------------------- the three games
FAMILY = {   # suspects that answer the same message: revenue down, up, or "something looks odd"
    "down": ["entries_drop", "delivery_drop", "click_drop_one", "conv_drop_all", "conv_drop_one", "aov_drop", "tracking_break", "slow_slide", "noise", "black_friday", "volume_mix"],
    "up": ["good_news", "big_order", "volume_mix", "black_friday", "mpp_opens", "noise", "unsub_spike"],
    "odd": ["unsub_spike", "mpp_opens", "volume_mix", "big_order", "noise", "good_news", "click_drop_one", "conv_drop_one"],
}
LOOKS = 3


def _min_looks(obs: dict, truth: str, others: list[str]) -> int | None:
    """Fewest face-down cards that rule out every other suspect, given the free charts. None: can't be done in LOOKS."""
    from itertools import combinations
    left = [x for x in others if not rules_out(obs, x, FREE)]
    for n in range(0, LOOKS + 1):
        for combo in combinations(CLUES, n):
            if all(rules_out(obs, x, combo) for x in left):
                return n
    return None


def deal_suspects(rng: random.Random, stage: str) -> dict:
    fam = rng.choice(["down", "down", "down", "up", "odd"])
    for _ in range(30):
        truth = rng.choice(FAMILY[fam])
        c, obs, charts = make(truth, rng, stage)
        if not consistent(truth, obs):
            continue
        pool = [k for k in FAMILY[fam] if k != truth and not rules_out(obs, k, FREE)]      # the free charts don't settle these
        pool += [k for k in FAMILY[fam] if k != truth and k not in pool]
        if len(pool) < 5:
            continue
        target = rng.choices([1, 2, 3], weights=[2, 6, 2])[0]
        best = None
        for _ in range(16):          # try a few line-ups, keep the one closest to the difficulty drawn
            others = rng.sample(pool[:7], 5) if len(pool) > 5 else pool[:5]
            need = _min_looks(obs, truth, others)
            if need and (best is None or abs(need - target) < abs(best[0] - target)):
                best = (need, others)
            if best and best[0] == target:
                break
        if not best:
            continue
        need, others = best
        suspects = others + [truth]
        rng.shuffle(suspects)
        return {"case": c, "obs": obs, "charts": charts, "truth": truth, "suspects": suspects, "need": need, "family": fam}
    return deal_suspects(random.Random(rng.random()), stage)


def deal_predict(rng: random.Random, stage: str, recent: list[str]) -> dict:
    kinds = [k for k in SCRIPTS if k not in recent[-3:]]
    truth = rng.choice(kinds)
    c, obs, charts = make(truth, rng, stage)
    return {"case": c, "obs": obs, "charts": charts, "truth": truth, "story": rng.choice(STORY[truth])}


def deal_lookalike(rng: random.Random, stage: str) -> dict:
    for _ in range(30):
        truth = rng.choice(list(SCRIPTS))
        c, obs, charts = make(truth, rng, stage)
        if not consistent(truth, obs):
            continue
        # the closest look-alikes predict the same big moves as the truth and differ on something quieter
        fam = next(f for f in ("down", "up", "odd") if truth in FAMILY[f])
        moved = [k for k in CLUES if SCRIPTS[truth][k] not in (None, F, SAME)]
        down = lambda v: D if v == Z else v
        def close(x):
            shared = sum(1 for k in moved if down(SCRIPTS[x][k]) == down(SCRIPTS[truth][k]))
            return (-shared, len(rules_out(obs, x)), rng.random(), x)
        cands = sorted(close(x) for x in set(FAMILY[fam]) | set(FAMILY["down"]) if x != truth and rules_out(obs, x))
        if len(cands) < 2 or cands[0][0] == 0:
            continue
        near = [x[3] for x in cands[:2]]
        opts = near + [truth]
        rng.shuffle(opts)
        return {"case": c, "obs": obs, "charts": charts, "truth": truth, "options": opts, "closest": near[0], "family": fam}
    return deal_lookalike(random.Random(rng.random()), stage)


PENDING: dict[str, dict] = {}


def _public_case(c: dict, charts: dict) -> dict:
    return {"flow": c["flow"]["name"], "ftype": c["flow"].get("type"), "symptom": c["symptom"], "dates": [d[5:] for d in c["dates"][6:]],
            "emails_n": len(c["flow"]["messages"]), "charts": charts}


def history(p: dict, game: str) -> list:
    return p.setdefault("proto", {}).setdefault(game, [])


def deal(game: str) -> dict:
    p = LF.progress()
    h = history(p, game)
    stage = "obvious" if len(h) < 2 else "clear" if len(h) < 10 else "realistic"
    rng = random.Random(random.randrange(10**9))
    if game == "suspects":
        d = deal_suspects(rng, stage)
        pub = {"suspects": [{"kind": k, "cause": CAUSE[k]} for k in d["suspects"]], "looks": min(LOOKS, d["need"] + 1), "need": d["need"]}
    elif game == "predict":
        d = deal_predict(rng, stage, [x.get("kind") for x in h])
        pub = {"story": d["story"]}
    elif game == "lookalike":
        d = deal_lookalike(rng, stage)
        pub = {"options": [{"kind": k, "cause": CAUSE[k]} for k in d["options"]], "closest": {"kind": d["closest"], "cause": CAUSE[d["closest"]]}}
    else:
        return {"error": f"No prototype called {game}."}
    rid = uuid.uuid4().hex[:12]
    PENDING[rid] = {"game": game, "stage": stage, **d}
    while len(PENDING) > 100:
        PENDING.pop(next(iter(PENDING)))
    # the charts go to the page so the cards can flip without a round trip; this is a prototype, not the graded game
    return {"rid": rid, "game": game, "stage": stage, **_public_case(d["case"], d["charts"]), **pub}


def answer(rid: str, body: dict) -> dict:
    d = PENDING.pop(rid, None)
    if d is None:
        return {"error": "That one expired. Here's a fresh one."}
    obs, truth, game = d["obs"], d["truth"], d["game"]
    out = {"truth": truth, "cause": CAUSE[truth], "name": LF.FILE_NAMES[truth], "lesson": LF.LESSONS[truth][0], "term": LF.LESSONS[truth][1],
           "script": SCRIPTS[truth], "obs": obs, "say": SAY, "labels": LABEL}
    if game == "suspects":
        flipped = [k for k in body.get("flipped", []) if k in CLUES][:LOOKS]
        struck = [k for k in body.get("struck", []) if k in d["suspects"]]
        accused = body.get("accused")
        seen = FREE + flipped
        strikes = [{"kind": k, "cause": CAUSE[k], "fair": bool(rules_out(obs, k, seen)) and k != truth, "by": rules_out(obs, k, seen)} for k in struck]
        left = [k for k in d["suspects"] if k != truth and not rules_out(obs, k, seen)]
        # the shortest path from the free charts, in hindsight
        best = []
        rest = [k for k in d["suspects"] if k != truth and not rules_out(obs, k, FREE)]
        while rest and len(best) < LOOKS:
            k = max((x for x in CLUES if x not in best), key=lambda x: sum(1 for s in rest if x in rules_out(obs, s, [x])))
            best.append(k); rest = [s for s in rest if not rules_out(obs, s, FREE + best)]
        ok = accused == truth
        out.update({"ok": ok, "accused": accused, "strikes": strikes, "scripts": {k: SCRIPTS[k] for k in d["suspects"]}, "still_fit": [{"kind": k, "cause": CAUSE[k]} for k in left],
                    "best": best, "need": d["need"], "looks": len(flipped),
                    "why_not": {k: rules_out(obs, k) for k in d["suspects"] if k != truth}})
    elif game == "predict":
        guess = body.get("guess") or {}
        marks = {k: (None if s is None else guess.get(k) == s) for k, s in SCRIPTS[truth].items()}
        scored = [v for v in marks.values() if v is not None]
        ok = all(scored)
        out.update({"ok": ok, "marks": marks, "right": sum(scored), "of": len(scored), "guess": guess})
    else:
        pick, proof = body.get("pick"), body.get("proof")
        rejected = body.get("rule_out") if body.get("rule_out") in d["options"] and body.get("rule_out") != pick else d["closest"]
        ok = pick == truth
        proof_ok = proof in rules_out(obs, rejected)          # empty when the one you rejected was the answer
        out.update({"ok": ok, "pick": pick, "proof": proof, "proof_ok": proof_ok, "closest": d["closest"], "rejected": rejected,
                    "why_not": {k: rules_out(obs, k) for k in d["options"] if k != truth}, "scripts": {k: SCRIPTS[k] for k in d["options"]}})
    p = LF.progress()
    history(p, game).append({"ok": ok, "kind": truth, "ms": int(body.get("ms") or 0), "stage": d["stage"], "at": time.time(),
                             **({"looks": out["looks"], "need": d["need"]} if game == "suspects" else {}),
                             **({"right": out["right"], "of": out["of"]} if game == "predict" else {}),
                             **({"proof_ok": out["proof_ok"]} if game == "lookalike" else {})})
    LF.save_progress(p)
    out["played"] = summary(LF.progress())
    return out


def summary(p: dict) -> dict:
    out = {}
    for g in ("suspects", "predict", "lookalike"):
        h = p.get("proto", {}).get(g, [])
        ms = [x["ms"] for x in h if x["ok"] and x.get("ms")]
        out[g] = {"played": len(h), "right": sum(x["ok"] for x in h), "median_ms": int(statistics.median(ms)) if ms else None}
    return out
