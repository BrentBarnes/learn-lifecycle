"""Level 7 as a path (docs/CURRICULUM-L7.md): would they have bought anyway? The Store orders card and the Holdout card,
one idea at a time, built the way Levels 1 and 2 were.

Every rep is a real lf_level7 case: a Level 1 flow plus the two cards made from its own daily numbers, re-rolled until
each card reads the way its story says with a clear margin. lf_level7.read_mark and lf_level7.verdict are the one judge.
The answer key, the feedback, the walk and the tests all use them.

    STEPS7    the path: 6 steps and 3 joins (step ids "7s1", "7j1-2"...). No case files yet
    the ways  store (Read it), added (Read it), verdict7 (What happened), segment (Read it), walk7 (Read the whole chart)
"""
from __future__ import annotations
import random

import lifecycle_files as LF
import lf_level7 as L7
import lf_path as P

KINDS = L7.KINDS
BASE_KEYS = ["main", "dots", "shape", "size", "revenue", "lastweek"]     # Level 1's main chart and its rows. The tiles step aside

# ---------------------------------------------------------------- the path
STEPS7 = [
    {"id": "7s1", "part": 1, "n": 1, "title": "The store total", "adds": ["store"], "causes": ["delay_cut", "real_win", "attribution_cut", "checkout_down"],
     "ways": {"store": 1}},
    {"id": "7s2", "part": 1, "n": 2, "title": "Too small to show", "ways": {"store": 1}},
    {"id": "7j1-2", "part": 1, "title": "Credit or new orders?", "causes": ["noise7"], "ways": {"verdict7": 1}},
    {"id": "7s3", "part": 2, "n": 3, "title": "The holdout", "adds": ["holdout"], "causes": ["winback_early"], "ways": {"added": 1}},
    {"id": "7s4", "part": 2, "n": 4, "title": "Too few held out", "ways": {"added": 1}},
    {"id": "7j1-4", "part": 2, "title": "Both checks together", "ways": {"verdict7": 2, "store": 1, "added": 1}},
    {"id": "7s5", "part": 3, "n": 5, "title": "When the whole store moves", "causes": ["sale_lift"], "ways": {"verdict7": 1}},
    {"id": "7s6", "part": 3, "n": 6, "title": "Who the emails help most", "adds": ["segments"], "ways": {"segment": 1}},
    {"id": "7j1-6", "part": 3, "title": "The whole picture", "ways": {"walk7": 2, "segment": 1}, "way_new": "walk7",
     "new": "Read the whole chart grows: the line, the store, the holdout, what happened, then what to do."},
]
PARTS7 = {1: "The store total", 2: "The holdout", 3: "When the checks get harder"}
WAY_NAME7 = {"store": "Read it", "added": "Read it", "verdict7": "What happened", "segment": "Read it", "walk7": "Read the whole chart"}
MEET7 = {
    "7s1": {"show": ("delay_cut", "show", "tell"), "dana": "Dana: orders on {flow} more than doubled! Is it real?", "watch": "store",
            "intro": "Klaviyo credits a flow with any order placed within a few days of someone opening or clicking one of its emails. Some of those "
                     "people were going to buy anyway. The store total counts every order once, from every source, so if the flow really made extra "
                     "orders, the store has them too. The Store orders card puts two marks on one line: where the store would be if nothing changed, "
                     "and where it would be if every extra credited order is new. Read which mark the store landed near.",
            "term": ["Attributed vs incremental", "Attributed orders are the ones a tool credits to the email. Incremental orders are the ones that wouldn't have happened without it."]},
    "7s2": {"show": ("real_win", "hide", "tell"), "dana": "Dana: credited orders on {flow} are up a bit. Did the store get them?", "watch": "store",
            "intro": "The store total wobbles too. The gray bar around the store's dot is its normal wobble, from the quiet weeks. When both marks sit "
                     "inside it, the store can't tell the two stories apart, whatever the truth is. A flow that's a small part of the store's orders "
                     "can't move the total by more than its wobble. Real stores wobble more than these do, so at work the store total settles only big moves.",
            "term": ["Minimum detectable effect (MDE)", "The smallest change a measure can tell apart from its normal wobble. Smaller than that, it can't see it, real or not."]},
    "7j1-2": {"show": ("attribution_cut", "show", "tell"), "dana": "Ruth: give me the short version on {flow}. Did it make us money?", "watch": "verdict7",
              "intro": "Now the whole question, with six answers, the same every time. Did the line move? If it did, did the flow change how many orders the "
                       "store got, or only how many Klaviyo credits to it? When the store can't tell, say so.",
              "term": ["Incrementality", "What a flow adds beyond what would have happened anyway. The number that should decide budgets."]},
    "7s3": {"show": ("winback_early", "show", "tell"), "dana": "Dana: the winback is crushing it since Priya moved the trigger. Right?", "watch": "added",
            "intro": "A holdout is the cleanest check. 1 in 10 people who enter the flow are held out at random and get no emails. They're the same kind of "
                     "people, so what they order is what everyone would have ordered anyway. Added is the gap: orders per 100 who got the emails minus "
                     "orders per 100 held out. The card puts the same two marks on Added: where it would be if nothing changed, and where it would be "
                     "if every extra credited order is new.",
            "term": ["Holdout group (control group)", "A random slice that gets nothing. The gap between them and everyone else is the lift."]},
    "7s4": {"show": ("real_win", "show", "small"), "dana": "Dana: the holdout on {flow} says the emails add a few more orders now. Real?", "watch": "added",
            "intro": "A holdout is a sample. A small flow holds out a few dozen people, and a few orders more or less swing their rate a lot. The bar "
                     "around Added is its range: where the true number could be. If both marks sit inside it, the holdout can't tell yet. Wait for more weeks.",
            "term": ["Confidence interval", "The range a measured number could really be. Too wide to rule anything out means too early to call."]},
    "7s5": {"show": ("sale_lift", "show", "tell"), "dana": "Dana: {flow} is way up, and so is the whole store. The flow did it, right?", "watch": "verdict7",
            "intro": "When the store moves far past both marks, something store-wide happened: a sale, a season, a checkout break. On the way down that's "
                     "a real loss everywhere. On the way up the store total can't separate the flow from the sale. The holdout can: the held-out people "
                     "shop in the same sale, so if Added holds, the sale did it, not the emails.",
            "term": ["Confound", "Something else moving at the same time, so before-and-after can't say what did it. A random holdout lives through it too, so it cancels out."]},
    "7s6": {"dana": "Ruth: returning customers earn way more per email. Should we send them more?", "watch": "segment",
            "intro": "Credited orders are highest for people who buy often anyway. That doesn't mean the emails help them most. Split the holdout by group "
                     "and compare Added, not Credited. If the two ranges overlap, you can't tell yet.",
            "term": ["Uplift", "How much the email changes what each group does. The group with the most uplift, not the most credit, is where an extra email pays."]},
    "7j1-6": {"show": ("real_win", "show", "tell"), "dana": "Dana: {flow} needs a call by Friday. Walk me through it.", "watch": "walk7",
              "intro": "Read the whole chart grows again. It walks the line, the store, the holdout, then what happened and what to do, one question at a "
                       "time. When a card can't tell, the next one decides. What to do follows from what happened.",
              "term": ["Triangulation", "Checking one answer with several imperfect measures. When they agree, trust it. When one can't tell, the other decides."]},
}
NODE_NAME7 = {"line7": "the line", "store7": "the store", "added7": "the holdout", "verdict7": "what happened"}

SYMPTOMS7 = {   # shared pools: generic ones fit every kind, the up and down ones fit every kind that moves that way
    "any": ["Ruth: is {flow} really making us money?", "Dana: I need the real story on {flow} for Friday's report.", "Today flagged {flow} for a look."],
    "above": ["Dana: {flow} is way up this month. Is it real?", "Ruth: {flow} looks great. Can we take credit for it?"],
    "below": ["Dana: {flow} is way down. Do we panic?", "Ruth: orders on {flow} fell off a cliff. What happened?"],
}


def dana(R: dict, rng: random.Random) -> str:
    pool = SYMPTOMS7["any"] if R["line"] == "inside" or rng.random() < 0.5 else SYMPTOMS7[R["line"]]
    return rng.choice(pool)


def visible7(sid: str) -> list[str]:
    return BASE_KEYS + [k for s in STEPS7[:next(i for i, x in enumerate(STEPS7) if x["id"] == sid) + 1] for k in s.get("adds", [])]


def hold_on(sid: str) -> bool:
    return "holdout" in visible7(sid)


def store_opts(sid: str) -> list:
    return [o for o in L7.MARKS if o[0] != "both" or P.pos(sid) >= P.pos("7s2")]


def added_opts(sid: str) -> list:
    return [o for o in L7.MARKS if o[0] in ("real", "nothing") or o[0] == "both" and P.pos(sid) >= P.pos("7s4")]


# ---------------------------------------------------------------- words, from the numbers on screen
def n0(v) -> str:
    return f"{round(v):,}"


def p1(v) -> str:
    return f"{v:.1f}"


def money(v) -> str:
    return f"${v:,.2f}"


def line_why(R: dict, ch: dict) -> str:
    m = ch["main"]
    if R["line"] == "inside":
        return f"The line ends inside its normal range ({money(m['last'])} against {money(m['base'])}): nothing moved."
    return f"The line ends {R['line']} its normal range: {money(m['last'])} a recipient against {money(m['base'])}."


def store_why(R: dict, s: dict) -> str:
    dc, W, last, nm, rm = s["dc"], s["wobble"], s["last"], s["marks"]["nothing"], s["marks"]["real"]
    up = dc > 0
    went, gain = ("rose", "gained") if up else ("fell", "lost")
    rd = R["store"]
    if rd == "real":
        return (f"Credited orders {went} by {n0(abs(dc))} a week. The store took {n0(last)}: within its normal wobble (±{n0(W)}) of “it's real” "
                f"({n0(rm)}), and well away from “nothing changed” ({n0(nm)}). The store {gain} them too.")
    if rd == "nothing":
        return (f"Credited orders {went} by {n0(abs(dc))} a week, but the store took {n0(last)}: within its normal wobble (±{n0(W)}) of “nothing "
                f"changed” ({n0(nm)}), and well away from “it's real” ({n0(rm)}). The store never {gain} them.")
    if rd == "far":
        moved = last - nm
        return (f"The store {'rose' if moved > 0 else 'fell'} by {n0(abs(moved))} a week, far past both marks, while the flow's credited orders "
                f"{went} by only {n0(abs(dc))}. Something store-wide moved every order, not just this flow's.")
    return (f"The marks are only {n0(abs(dc))} orders apart and the store's normal wobble is ±{n0(W)}, so both fit. The store can't tell a "
            f"change this size. This flow is {round(s['share'] * 100)}% of the store's orders.")


def added_why(R: dict, h: dict) -> str:
    q, l, dc = h["quiet"], h["last"], h["dc"]
    went = "rose" if dc > 0 else "fell"
    nm, rm, r = h["marks"]["nothing"], h["marks"]["real"], l["range"]
    rd = R["added"]
    head = f"Credited {went} from {p1(q['credited'])} to {p1(l['credited'])} per 100 people. "
    if rd == "real":
        return head + (f"Added (got the emails minus held out) went from {p1(q['added'])} to {p1(l['added'])}: near “it's real” ({p1(rm)}), "
                       f"and its range (±{p1(r)}) doesn't reach “nothing changed” ({p1(nm)}). " +
                       ("The emails really add those orders." if dc > 0 else "The emails really add less now."))
    if rd == "nothing":
        return head + (f"Added is {p1(l['added'])} (it was {p1(q['added'])}): its range (±{p1(r)}) covers “nothing changed” and misses "
                       f"“it's real” ({p1(rm)}). " + ("The held-out people ordered just as much: those orders came anyway."
                                                             if dc > 0 else "The emails add as much as ever: only the credit fell."))
    return head + (f"Added is {p1(l['added'])} with a range of ±{p1(r)}: it covers both “nothing changed” ({p1(nm)}) and “it's real” "
                   f"({p1(rm)}). Too few held out to tell yet: {n0(l['held_n'])} people, {l['held_orders']} orders.")


def verdict_why(R: dict, ch: dict, hold: bool) -> str:
    label = dict(L7.VERDICTS)[R["verdict"]]
    if R["line"] == "inside":
        return line_why(R, ch) + " There's nothing for the store or the holdout to explain. So: nothing moved."
    out = [line_why(R, ch)]
    st, ad = R["store"], R["added"]
    if st == "far" and R["line"] == "below":
        out.append(store_why(R, ch["store"]) + " The whole store lost orders, so the loss is real" +
                   (", whatever the holdout says: the held-out people hit the same break." if hold else "."))
    elif hold and ad in ("real", "nothing"):
        if st == "far":
            out.append("The store moved far past both marks, so something store-wide happened. The holdout splits the flow from it.")
        elif st == "both":
            out.append("Both marks fit on the store, so the holdout decides.")
        out.append(added_why(R, ch["holdout"]))
    elif st in ("real", "nothing"):
        if hold:
            out.append("The holdout can't tell: both marks fit.")
        out.append(store_why(R, ch["store"]))
    else:
        out.append("The store moved far past both marks, so the store can't split the flow from whatever moved everything." if st == "far"
                   else "Both marks fit on the store.")
        if hold:
            out.append("Both marks fit on the holdout too, so neither check can tell yet.")
    return " ".join(out) + f" So: {label[0].lower() + label[1:]}."


def store_spots() -> list[str]:
    return ["st-marks"]


def added_spots() -> list[str]:
    return ["hd-marks"]


# ---------------------------------------------------------------- choosing a rep: a reading first, then a kind and sizes that give it
def pool(sid: str) -> list[str]:
    return P.causes(sid)


def _theme(sid: str) -> set:
    return set(P.theme(sid))


def _pick(rng: random.Random, sid: str, ks: list[str]) -> str:
    th = _theme(sid)
    want = getattr(P.AGAIN, "kind", None)
    if want in ks:
        return want
    return rng.choices(ks, weights=[3 if k in th else 1 for k in ks])[0]


def combos(v: str, hold: bool, ks: list[str]) -> list[tuple]:
    """(kind, store size, holdout size) that give this verdict, from what's on screen at this step."""
    H = ["tell", "small"]
    out = []
    if v == "nothing":
        out = [("noise7", s, h) for s in ("show", "hide") for h in H]
    elif v == "up_real":
        out = [("real_win", "show", h) for h in (["small"] if hold else H)] + ([("real_win", s, "tell") for s in ("show", "hide")] if hold else [])
    elif v == "up_credit":
        for k in ("delay_cut", "winback_early"):
            out += [(k, "show", h) for h in (["small"] if hold else H)] + ([(k, s, "tell") for s in ("show", "hide")] if hold else [])
        out += [("sale_lift", s, "tell") for s in ("show", "hide")] if hold else []
    elif v == "down_real":
        out = [("checkout_down", s, h) for s in ("show", "hide") for h in H]
    elif v == "down_credit":
        out = [("attribution_cut", "show", h) for h in (["small"] if hold else H)] + ([("attribution_cut", s, "tell") for s in ("show", "hide")] if hold else [])
    elif v == "cant_tell":
        for k in ("real_win", "delay_cut", "winback_early", "attribution_cut"):
            if k == "delay_cut" and hold:
                continue                                  # a jump that big always shows on a holdout
            out += [(k, "hide", "small")] + ([] if hold else [(k, "hide", "tell")])
        out += [("sale_lift", s, "small") for s in ("show", "hide")] if hold else []
    return [x for x in out if x[0] in ks]


def _deal7(sid, rng, stage, kind, store, hold, tries=40):
    got = L7.make7(kind, rng, stage, store, hold, need_added=hold_on(sid), tries=tries)
    if not got:
        return None
    c, obs, charts, R = got
    c["kind"] = kind
    charts.update(L7.cards(c, hold_on(sid)))
    return c, obs, charts, R


def _rep(c, obs, charts, R, rng, extra: dict) -> dict:
    return {"case": c, "obs": obs, "charts": charts, "kind": R["kind"], "R": R, "dana": dana(R, rng), **extra}


# ---------------------------------------------------------------- the ways to play
def w_store(sid, rng, stage, level):
    """Read the Store orders card: which mark is the store near?"""
    opts = store_opts(sid)
    ks = [k for k in pool(sid) if k != "noise7"]
    for _ in range(8):
        if level == "watch" and MEET7.get(sid, {}).get("show"):
            kind, store, hold = MEET7[sid]["show"]
        else:
            target = rng.choice([o[0] for o in opts])
            if target == "real":
                kind, store = "real_win", "show"
            elif target == "nothing":
                kind, store = _pick(rng, sid, [k for k in ("delay_cut", "attribution_cut", "winback_early") if k in ks]), "show"
            elif target == "far":
                kind, store = _pick(rng, sid, [k for k in ("checkout_down", "sale_lift") if k in ks]), rng.choice(["show", "hide"])
            else:
                kind, store = _pick(rng, sid, [k for k in ("real_win", "delay_cut", "attribution_cut", "winback_early") if k in ks]), "hide"
            hold = rng.choice(["tell", "small"]) if kind != "delay_cut" or not hold_on(sid) else "tell"
            if kind == "real_win" and store == "show" and hold_on(sid):
                hold = "tell"
        got = _deal7(sid, rng, stage, kind, store, hold)
        if got:
            break
    else:
        return None
    c, obs, charts, R = got
    s = charts["store"]
    ans = R["store"]
    up = s["dc"] > 0
    why = store_why(R, s)
    walk = [{"say": f"Credited orders {'rose' if up else 'fell'} from {n0(s['credited']['base'])} to {n0(s['credited']['last'])} a week: "
                    f"{'+' if up else '-'}{n0(abs(s['dc']))}.", "spot": ["st-credited"]},
            {"say": f"If those orders are {'new' if up else 'really lost'}, the store moves by the same {n0(abs(s['dc']))}: the “it's real” mark, "
                    f"at {n0(s['marks']['real'])}. If not, it stays near {n0(s['marks']['nothing'])}: “nothing changed”.", "spot": ["st-marks"]},
            {"say": f"The store took {n0(s['last'])} orders in the last 7 days. The gray bar is its normal wobble, plus or minus {n0(s['wobble'])}.", "spot": ["st-marks"]},
            {"say": why, "spot": ["st-marks"], "do": {"store": ans}}]
    return _rep(c, obs, charts, R, rng, {
        "answer": {"store": ans}, "q": {"ask": f"Credited orders {'rose' if up else 'fell'} by {n0(abs(s['dc']))} a week. Which mark are store orders near?",
                                        "options": opts, "field": "store"},
        "why": why, "spots": store_spots(), "walk": walk,
        "hint": {"say": "Find the store's dot and its gray bar. Which mark sits inside the bar?" +
                        (" If both do, the store can't tell." if any(o[0] == "both" for o in opts) else ""), "spot": ["st-marks"]}})


def w_added(sid, rng, stage, level):
    """Read the Holdout card: which mark is Added near?"""
    opts = added_opts(sid)
    ks = [k for k in pool(sid) if k not in ("noise7", "checkout_down")]
    for _ in range(8):
        if level == "watch" and MEET7.get(sid, {}).get("show"):
            kind, store, hold = MEET7[sid]["show"]
        else:
            target = rng.choice([o[0] for o in opts])
            store = rng.choice(["show", "hide"])
            if target == "real":
                kind, hold = "real_win", "tell"
            elif target == "nothing":
                kind, hold = _pick(rng, sid, [k for k in ("delay_cut", "attribution_cut", "winback_early", "sale_lift") if k in ks]), "tell"
            else:
                kind, hold = _pick(rng, sid, [k for k in ("real_win", "attribution_cut", "winback_early", "sale_lift") if k in ks]), "small"
        got = _deal7(sid, rng, stage, kind, store, hold)
        if got:
            break
    else:
        return None
    c, obs, charts, R = got
    h = charts["holdout"]
    q, l = h["quiet"], h["last"]
    ans = R["added"]
    why = added_why(R, h)
    walk = [{"say": f"Credited went from {p1(q['credited'])} to {p1(l['credited'])} orders per 100 people.", "spot": ["hd-credited"]},
            {"say": f"Added is got the emails minus held out: {p1(l['got'])} minus {p1(l['held'])} is {p1(l['added'])} per 100, in the last 14 days.", "spot": ["hd-rows"]},
            {"say": f"If every extra credited order were new, Added would sit near {p1(h['marks']['real'])}. If not, near {p1(h['marks']['nothing'])}, "
                    f"where it was. The bar is its range, plus or minus {p1(l['range'])}.", "spot": ["hd-marks"]},
            {"say": why, "spot": ["hd-marks"], "do": {"added": ans}}]
    return _rep(c, obs, charts, R, rng, {
        "answer": {"added": ans}, "q": {"ask": f"Credited {'rose' if h['dc'] > 0 else 'fell'} from {p1(q['credited'])} to {p1(l['credited'])} per 100 people. "
                                               "Which mark is Added near?", "options": opts, "field": "added"},
        "why": why, "spots": added_spots(), "walk": walk,
        "hint": {"say": "Read Added, not Credited. Find its dot and its range bar. Which mark sits inside the bar?", "spot": ["hd-marks"]}})


def _verdict_kind(sid, rng, level):
    """A target answer first (every live answer as likely), then a kind and sizes that give it. Half the time at a step
    with its own new cause, that cause first."""
    hold, ks = hold_on(sid), pool(sid)
    if level == "watch" and MEET7.get(sid, {}).get("show"):
        return MEET7[sid]["show"]
    want = getattr(P.AGAIN, "kind", None)
    own = [k for k in (P.step(sid).get("causes") or []) if k in ks and k != "noise7"]
    if want in ks or own and rng.random() < 0.4:
        k = want if want in ks else rng.choice(own)
        cs = [x for v, _ in L7.VERDICTS for x in combos(v, hold, [k])]
        return rng.choice(cs)
    live = [v for v, _ in L7.VERDICTS if combos(v, hold, ks)]
    v = rng.choice(live)
    cs = combos(v, hold, ks)
    th = _theme(sid)
    return rng.choices(cs, weights=[3 if c[0] in th else 1 for c in cs])[0]


def _nodes(R, ch, sid, with_action: bool) -> list[dict]:
    """The walk's questions down this case's branch, each with its answer, reason and where to look."""
    hold = hold_on(sid)
    nodes = []

    def node(id_, field, ask, options, answer, why, spots, hint, hint_spot=None):
        nodes.append({"id": id_, "field": field, "ask": ask, "options": options, "answer": answer, "why": why, "spots": spots,
                      "hint": {"say": hint, "spot": hint_spot or spots}})

    node("line7", "line", "Did the line leave its normal range?", L7.LINE, R["line"], line_why(R, ch), ["end", "band"],
         "Ignore single dots. Where does the line end, against the band?")
    if R["line"] != "inside":
        node("store7", "store", "Which mark are store orders near?", store_opts(sid), R["store"], store_why(R, ch["store"]), ["st-marks"],
             "Find the store's dot and its gray bar. Which mark sits inside the bar?")
        if hold and not (R["store"] == "far" and R["line"] == "below"):
            node("added7", "added", "Which mark is the holdout's Added near?", added_opts(sid), R["added"], added_why(R, ch["holdout"]), ["hd-marks"],
                 "Read Added, not Credited. Which mark sits inside its range bar?")
    node("verdict7", "verdict", "So what happened?", L7.VERDICTS, R["verdict"], verdict_why(R, ch, hold),
         ["end"] + (["st-marks"] if R["line"] != "inside" else []) + (["hd-marks"] if hold and R["line"] != "inside" else []),
         "The line first. Then the holdout if it can tell, then the store. A card where both marks fit can't decide.")
    if with_action:
        node("action", "action", "What do we do?", L7.ACTIONS, [R["action"]], L7.ACTION_WHY[R["action"]], [],
             "What happened decides it: keep a real win, undo a change that only moved credit, tell the owner about a real loss, note an outside cause, wait when no check can tell.",
             ["q"])
    return nodes


def w_verdict7(sid, rng, stage, level):
    """What happened: the whole screen, one question, the six answers."""
    got = None
    for _ in range(8):
        kind, store, hold = _verdict_kind(sid, rng, level)
        got = _deal7(sid, rng, stage, kind, store, hold)
        if got:
            break
    if not got:
        return None
    c, obs, charts, R = got
    nodes = [n for n in _nodes(R, charts, sid, False)]
    why = verdict_why(R, charts, hold_on(sid))
    spots = list(dict.fromkeys(s for n in nodes for s in n["spots"]))
    label = dict(L7.VERDICTS)[R["verdict"]]
    return _rep(c, obs, charts, R, rng, {
        "answer": {"verdict": R["verdict"]}, "q": {"ask": "What happened?", "options": L7.VERDICTS, "field": "verdict"},
        "why": why, "spots": spots,
        "hint": {"say": "Did the line move? Then which mark " + ("the holdout and " if hold_on(sid) else "") + "the store sit near. "
                        "A card where both marks fit can't decide.", "spot": spots},
        "walk": [{"say": n["why"], "spot": n["spots"]} for n in nodes if n["id"] != "verdict7"] +
                [{"say": f"So: {label[0].lower() + label[1:]}.", "spot": ["q"], "do": {"verdict": R["verdict"]}}]})


def w_walk7(sid, rng, stage, level):
    """Read the whole chart, Level 7: the line, the store, the holdout, what happened, what to do. One question at a time."""
    got = None
    for _ in range(8):
        kind, store, hold = _verdict_kind(sid, rng, level)
        got = _deal7(sid, rng, stage, kind, store, hold)
        if got:
            break
    if not got:
        return None
    c, obs, charts, R = got
    nodes = _nodes(R, charts, sid, True)
    ans = {}
    for n in nodes:
        ans[n["field"]] = n["answer"]
    q = {"walk": True, "node": P._pub_node(nodes[0], level)}
    if level == "watch":
        q["nodes"] = [P._pub_node(n, level) for n in nodes]
    return _rep(c, obs, charts, R, rng, {
        "answer": ans, "nodes": nodes, "q": q, "why": " ".join(n["why"] for n in nodes),
        "spots": list(dict.fromkeys(s for n in nodes for s in n["spots"])), "hint": nodes[0]["hint"],
        "walk": [{"say": f"{n['ask']} {n['why']}", "why": n["why"], "spot": n["spots"] or ["q"], "do": {"node": i, **P._node_answer(n)}}
                 for i, n in enumerate(nodes)]})


SEG_WHY = {"new": "New customers", "returning": "Returning customers"}


def w_segment(sid, rng, stage, level):
    """The holdout by group: which group do the emails help more?"""
    want = "new" if level == "watch" else rng.choices(["new", "returning", "cant"], weights=[1, 1, 0.8])[0]
    seg = L7.segments(rng, stage, want)
    if not seg:
        return None
    nw, rt = seg["rows"]
    a = seg["answer"]
    hi, lo = (nw, rt) if nw["added"] > rt["added"] else (rt, nw)
    head = (f"Returning customers have the higher credited number ({p1(rt['credited'])} per 100 against {p1(nw['credited'])}), but credit counts "
            f"orders that came anyway: held out, with no emails at all, returning customers ordered {p1(rt['held'])} per 100 and new ones {p1(nw['held'])}. ")
    if a == "cant":
        why = head + (f"Added is {p1(nw['added'])} (±{p1(nw['range'])}) for new customers and {p1(rt['added'])} (±{p1(rt['range'])}) for returning ones. "
                      "The ranges overlap, so you can't tell yet which group gains more.")
    else:
        why = head + (f"Added is {p1(hi['added'])} for {hi['name'].lower()} against {p1(lo['added'])} for {lo['name'].lower()}, and the ranges don't "
                      f"overlap. The emails help {hi['name'].lower()} more.")
    flow = rng.choice(LF.NAMES[rng.choice(["welcome", "cart", "browse"])])
    walk = [{"say": f"Returning customers have the higher credited number: {p1(rt['credited'])} orders per 100 against {p1(nw['credited'])}.", "spot": ["segments"]},
            {"say": "Credited counts people who'd order anyway. Held out shows how many: what each group orders with no emails at all.", "spot": ["segments"]},
            {"say": "So compare Added, with its range.", "spot": ["seg-added"]},
            {"say": why, "spot": ["seg-added"], "do": {"seg": a}}]
    return {"case": None, "obs": {}, "charts": {}, "kind": "segment", "R": {"seg": a}, "dana": None, "answer": {"seg": a},
            "q": {"ask": "Which group do the emails help more?", "options": L7.SEGS, "field": "seg"},
            "public": {"seg": seg["rows"], "flow": flow, "msg": MEET7["7s6"]["dana"]},
            "why": why, "spots": ["seg-added"], "walk": walk,
            "hint": {"say": "Skip Credited. Compare the two Added numbers and their ranges. Do the ranges overlap?", "spot": ["seg-added"]}}


WAYS7 = {"store": w_store, "added": w_added, "verdict7": w_verdict7, "segment": w_segment, "walk7": w_walk7}
SEG_LESSON = ("Credited numbers are highest for people who order often anyway. Compare what the emails add, group by group, before moving "
              "budget or sending more.", "Uplift")


def grade(d: dict, body: dict) -> dict:
    way, ans = d["way"], d["answer"]
    out = {"why": d["why"], "spots": d["spots"], "answer": ans}
    if way == "walk7":
        parts = {n["id"]: P._node_ok(d, n, body) for n in d["nodes"]}
        out.update({"ok": all(parts.values()), "parts": parts, "part_names": {k: P.NODE_NAME[k] for k in parts}})
    else:
        f = d["q"]["field"]
        out["ok"] = body.get(f) == ans[f]
    k = d["kind"]
    if way == "segment":
        out.update({"kind": None, "lesson": SEG_LESSON[0], "term": SEG_LESSON[1], "name": "Who it helps", "met": True})
    elif k in L7.LESSONS:
        lesson, term = L7.LESSONS[k]
        out.update({"kind": k, "cause": L7.CAUSE[k], "name": L7.NAMES[k], "lesson": lesson, "term": term, "met": k in P.causes(d["step"])})
    out.update({"say": P.SAY, "labels": {}, "obs": None})
    return out


# ---------------------------------------------------------------- register with the path engine
P.TRACK[7] = STEPS7
P.STEP.update({s["id"]: s for s in STEPS7})
P.TITLE[7] = "Level 7 · Would they have bought anyway?"
P.PARTS_OF[7] = PARTS7
P.MEET.update(MEET7)
P.WAY_NAME.update(WAY_NAME7)
P.WAYS.update(WAYS7)
P.GRADERS.update({w: grade for w in WAYS7})
P.NODE_NAME.update(NODE_NAME7)
P.NAME.update({**L7.CAUSE, "segment": "Who the emails help most (the holdout by group)"})
P.VISIBLE[7] = visible7
P.WALKS = P.WALKS + ("walk7",)
P.BY_ANSWER = P.BY_ANSWER + ("store", "added", "segment")
