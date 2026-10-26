"""Level 1 as a path (docs/CURRICULUM.md): one new thing per step, then joins, the way a musician learns measure 1,
measure 2, then 1 and 2 together.

Every rep is a real make_case() case, read the way the screen shows it (lf_proto.observe), and re-rolled until it
matches its story on every chart the step shows. So the feedback never contradicts the screen. Answers stay here
until the rep is answered.

    STEPS                      the path: 16 steps and 7 joins, what each adds, the ways to play it uses
    deal(step, level)          one rep: level is watch / together (the Meet), guided, solo or hard. step="rounds" mixes
    check(rid, i, body)        Read the whole chart: grade one question, say why, send the next one down the true branch
    flip(rid, card)            Suspects: turn one face-down card (the look budget is kept here, not on the page)
    answer(rid, body)          grade it, store it under progress["path"], say why
    summary(progress)          where he is on the path, every step's state, the Casebook, today's numbers
"""
from __future__ import annotations
import json, random, statistics, threading, time, uuid
from datetime import date
from itertools import combinations

import lifecycle_files as LF
import lf_proto as LP
import lf_drills as LD

U, D, F, Z = LP.U, LP.D, LP.F, LP.Z
IN, BELOW, ABOVE = LP.IN, LP.BELOW, LP.ABOVE
ONE, SAME = LP.ONE, LP.SAME
STEPV, SLOPE, SPIKE, NONE = "step", "slope", "spike", "none"

# ---------------------------------------------------------------- the causes, as the path names them
SHAPE = {   # how the main line moves. None: not part of the story (the line's shape varies or isn't readable)
    "entries_drop": NONE, "delivery_drop": NONE, "click_drop_one": None, "conv_drop_all": STEPV, "conv_drop_one": STEPV,
    "aov_drop": STEPV, "tracking_break": STEPV, "slow_slide": SLOPE, "volume_mix": None, "unsub_spike": NONE, "mpp_opens": NONE,
    "good_news": STEPV, "big_order": SPIKE, "black_friday": None, "noise": NONE,
}
GROUP = {"fewer_people": ["entries_drop", "delivery_drop"]}   # one cause until Entered (step 8) splits it in two
NAME = {**LP.CAUSE, "fewer_people": "Fewer people got the emails",
        "aov_drop": "Orders got smaller: a cheaper product up front, or free shipping starts lower"}
EARLY = {"conv_drop_all": "Checkout broke"}                    # before Clicks there is no "after the click" yet
OBS_KEYS = ["main", "shape", "revenue", "lastweek", "entered", "delivered", "opens", "clicks", "orders", "order_size", "unsubs", "emails"]
LABEL = {**LP.LABEL, "shape": "How revenue per recipient moved", "main": "The line (revenue per recipient)"}
SAY = {**LP.SAY, STEPV: "a step", SLOPE: "a slope", SPIKE: "a spike", NONE: "no move"}


def _script(kind: str) -> dict:
    return {**LP.SCRIPTS[kind], "shape": SHAPE[kind]}


SCRIPT = {k: _script(k) for k in LP.SCRIPTS}
for _g, _ks in GROUP.items():   # a group predicts only what all its members agree on
    SCRIPT[_g] = {k: (SCRIPT[_ks[0]][k] if all(SCRIPT[x][k] == SCRIPT[_ks[0]][k] for x in _ks) else None) for k in SCRIPT[_ks[0]]}
FAMILY = {f: ks + (["fewer_people"] if f == "down" else []) for f, ks in LP.FAMILY.items()}
STORY = {**LP.STORY, "fewer_people": LP.STORY["entries_drop"] + LP.STORY["delivery_drop"]}
EARLY_LESSON = {"conv_drop_all": ("Each person who got the email spent less, starting on one day: revenue per recipient fell in a step. Something "
                                  "after the email broke, like checkout, the site or the offer. Later steps show which part.", "Conversion drop")}
# before step 11, in words the path has taught by then (no Orders, Order size or Clicks yet)
GROUP_LESSON = {"fewer_people": ("Revenue is people times revenue per person. The total fell and each person spent the same, so fewer people got "
                                 "the emails. Entered the flow (step 8) tells you why.", "Recipients × revenue per recipient")}
ACTION_WHY = {   # step 15: who owns it
    "entries_drop": "If the form or the trigger broke, it's yours: fix it today. If it's on Shopify's side, tell the owner.",
    "delivery_drop": "A filter you added, fix today. Sending health and suppression lists usually belong to someone else: tell them.",
    "click_drop_one": "A broken link or image in your own email: fix it today.",
    "conv_drop_all": "Checkout and the site belong to someone else: tell the owner today, and check the offer yourself.",
    "conv_drop_one": "A dead code or a sold-out product in one email: fix that email today.",
    "aov_drop": "Someone changed what the flow features or the shipping offer: find out who and tell them.",
    "tracking_break": "The counting broke, not the sales: tell whoever owns the Shopify integration.",
    "slow_slide": "Nothing broke, so there's nothing to repair: test fresh creative.",
    "volume_mix": "Nothing broke: watch it, and reset the normal range if the new signup source stays.",
    "unsub_spike": "Fix the email that's driving people off today, or test a gentler version.",
    "mpp_opens": "Nothing changed for the business: leave it.",
    "good_news": "Keep it running and find out what worked, so you can copy it.",
    "big_order": "One order isn't a trend: leave it.",
    "black_friday": "The comparison was wrong, not the flow: leave it.",
    "noise": "Inside its normal range: watch it one more week, act if it leaves.",
}
_ACTIONS: dict[str, list[str]] = {}


def actions_ok(kind: str) -> list[str]:
    """The actions the case grader accepts for this cause (lifecycle_files.truth), read once from a real case."""
    if kind not in _ACTIONS:
        _ACTIONS[kind] = LF.make_case(kind, 1, stage="clear")["truth"]["actions"]
    return _ACTIONS[kind]


# ---------------------------------------------------------------- the path
# adds: what this step puts on screen. causes: met here (drops: retired here). ways: format -> weight for its reps.
# A unit has a Meet (watch, together, the term). A join that brings a new way to play has a Meet for that way.
# Rebuilt 2026-10-14 after the sampler (docs/SKILL-MAP.md): Brent kept Read the whole chart (the walk), What happened and
# Suspects, and dropped Rule it out, Call it and Look-alikes. Steps 5 to Join 7+8 were passed with those, so they keep
# their titles and Meets but practice (Rounds, replays) uses the kept ways. From Join 1-8 on: one What happened step per
# new chart, then the walk. Joins 5-8, 9+10, 11+12, 1-12 and 13+14 are gone: every walk rep mixes everything so far.
STEPS = [
    {"id": "s1", "part": 1, "n": 1, "title": "The normal range", "adds": ["main"], "ways": {"band": 1}},
    {"id": "s2", "part": 1, "n": 2, "title": "Single days", "adds": ["dots"], "causes": ["noise"], "ways": {"wobble": 1}},
    {"id": "j1-2", "part": 1, "title": "Real or wobble?", "ways": {"band": 1, "wobble": 1}},
    {"id": "s3", "part": 1, "n": 3, "title": "Since when, and what shape", "adds": ["shape"], "causes": ["slow_slide", "big_order"], "ways": {"start": 1}},
    {"id": "s4", "part": 1, "n": 4, "title": "How big", "adds": ["size"], "ways": {"size": 1}},
    {"id": "j3-4", "part": 1, "title": "Since when, how big", "ways": {"start": 1, "size": 1}},
    {"id": "j1-4", "part": 1, "title": "Read the whole chart", "ways": {"whole": 1}},
    {"id": "s5", "part": 2, "n": 5, "title": "Ruling out", "causes": ["conv_drop_all"], "ways": {"whole": 1}},
    {"id": "s6", "part": 2, "n": 6, "title": "The revenue boxes", "adds": ["revenue", "lastweek"], "causes": ["fewer_people", "black_friday"], "ways": {"happened": 1}},
    {"id": "j5-6", "part": 2, "title": "Ruling out with the boxes", "ways": {"happened": 1}},
    {"id": "s7", "part": 2, "n": 7, "title": "Got the email", "adds": ["delivered"], "ways": {"happened": 1}},
    {"id": "s8", "part": 2, "n": 8, "title": "Entered the flow", "adds": ["entered"], "causes": ["entries_drop", "delivery_drop"], "drops": ["fewer_people"],
     "ways": {"happened": 1}},
    {"id": "j7-8", "part": 2, "title": "Who got the emails", "ways": {"happened": 1}},
    {"id": "j1-8", "part": 2, "title": "Read the whole chart, all of it so far", "ways": {"whole": 2, "happened": 1}, "way_new": "whole",
     "new": "Read the whole chart grows: it starts with what happened to revenue, then follows your answer down."},
    {"id": "s9", "part": 3, "n": 9, "title": "Orders", "adds": ["orders"], "causes": ["tracking_break", "volume_mix"], "ways": {"happened": 1, "whole": 1}},
    {"id": "s10", "part": 3, "n": 10, "title": "Order size", "adds": ["order_size"], "causes": ["aov_drop"], "ways": {"happened": 1, "whole": 1}},
    {"id": "s11", "part": 3, "n": 11, "title": "Clicks", "adds": ["clicks"], "causes": ["click_drop_one"], "ways": {"happened": 1, "whole": 1}},
    {"id": "s12", "part": 3, "n": 12, "title": "Each email", "adds": ["emails"], "causes": ["conv_drop_one", "good_news"], "ways": {"happened": 1, "whole": 1}},
    {"id": "j9-12", "part": 3, "title": "What each person did, all of it", "ways": {"whole": 2, "suspects": 1}, "way_new": "suspects"},
    {"id": "s13", "part": 4, "n": 13, "title": "Opens", "adds": ["opens"], "causes": ["mpp_opens"], "ways": {"happened": 1, "whole": 1}},
    {"id": "s14", "part": 4, "n": 14, "title": "Unsubscribes", "adds": ["unsubs"], "causes": ["unsub_spike"], "ways": {"happened": 1, "whole": 1}},
    {"id": "s15", "part": 4, "n": 15, "title": "What to do", "ways": {"whole": 1}},
    {"id": "s16", "part": 4, "n": 16, "title": "The case file", "case": True, "ways": {}},
]
PARTS = {1: "Read the main chart", 2: "Fewer people, or less per person", 3: "What each person did", 4: "What not to trust, and what to do"}
WAY_NAME = {"band": "Read it", "wobble": "Read it", "start": "Read it", "size": "Read it", "whole": "Read the whole chart", "happened": "What happened",
            "ruleout": "Rule it out", "callit": "Call it", "lookalike": "Look-alikes", "suspects": "Suspects", "action": "What to do"}
MEET = {   # the Meet: Dana's message, the new thing in a few sentences, then Watch and Together, then the standard term.
    # show: the cause the Watch rep plays (the step's own case, so the new chart does the work)
    "s1": {"dana": "Dana: is {flow} OK this week?", "watch": "band",
           "intro": "This is the chart you'll read first, every time: revenue per recipient. It's what each email earned per person who got it, averaged over the 7 days before each point. The gray band shows where it sat during the four quiet weeks.",
           "term": ["Control band", "The quiet weeks' average, plus or minus about two standard deviations. Inside it is normal for this flow."]},
    "s2": {"dana": "Dana: one day last week looked awful on {flow}. Should I worry?", "watch": "wobble",
           "intro": "Each dot is one day. Single days swing a lot, most of all on small flows. The line is the 7-day average, and the line decides.",
           "term": ["Daily values against a 7-day moving average", "Analysts smooth noisy daily numbers with a moving average. One day outside the band isn't a change."]},
    "s3": {"dana": "Dana: when did this start?", "watch": "start",
           "intro": "A real move has a start and a shape. A step drops on one day and stays down: something changed that day. A slope slides a little every week: something is wearing out. A spike is one day far above all the others: one huge order.",
           "term": ["Level shift, trend, outlier", "The standard names for a step, a slope and a spike."]},
    "s4": {"dana": "Dana: how bad is it?", "watch": "size",
           "intro": "Size a move against normal, not against last week. Normal is the quiet weeks' average. Compare the last 7 days with it, as a share of normal.",
           "term": ["Percent change against the baseline", "The baseline is the quiet weeks. Last week can be odd itself."]},
    "s5": {"show": "conv_drop_all", "dana": "Dana: I bet checkout broke.", "watch": "whole",
           "intro": "Every cause predicts something. If checkout broke, each person who got an email would buy less, so this line would drop below normal in a step. Read the whole chart and check the story fits it.",
           "term": ["Ruling out", "Doctors call the list of suspects a differential. Crossing them off one by one is ruling out."]},
    "s6": {"show": "entries_drop", "dana": "Dana: revenue is way down this week!", "watch": "happened",
           "intro": "Revenue is people times revenue per person. The Revenue row shows the total, against the quiet weeks. The line shows each person. If the total fell and each person spent the same, fewer people got the emails.",
           "term": ["Revenue = recipients × revenue per recipient (RPR)", "Split every revenue move into those two parts first."]},
    "s7": {"show": "entries_drop", "dana": "Dana: it's probably just wobble, right?", "watch": "happened",
           "intro": "Got the email counts the emails that went out each week. It's the people half of the equation, now on screen.",
           "term": ["Recipients", "Klaviyo's word for the people who got the email."]},
    "s8": {"show": "delivery_drop", "dana": "Dana: the signup pop-up broke Tuesday, right?", "watch": "happened",
           "intro": "Entered the flow counts the people who started it each week. Got the email can fall two ways: fewer people come in, or people come in and the emails don't reach them (a filter, or bounces). Entered tells them apart.",
           "term": ["Flow entries against recipients", "A gap between the two is suppression or deliverability, not the content."]},
    "j1-8": {"show": "delivery_drop", "dana": "Dana: revenue is down on {flow}. What's going on?", "watch": "whole",
             "intro": "Read the whole chart grows. It now starts with what happened to revenue: fewer people, or did each person spend differently? Then it follows your answer down, one question at a time: since when and how big, and for fewer people, where they were lost. "
                      "Every question is one you've practiced. After each answer you see why, and a wrong one shows you the right one before the walk goes on.",
             "term": ["Top-down diagnosis", "Ask the question that splits the most first, then go down the branch it points to. Analysts call the map of those questions a root-cause tree."]},
    "s9": {"show": "tracking_break", "dana": "Dana: checkout broke, didn't it?", "watch": "happened",
           "intro": "Orders is the placed-order rate: orders per person who got an email. When each person spends less, Orders shows whether they ordered less often. Orders falling to almost zero is different: people don't all stop buying at once, so the counting broke. "
                    "And if Entered the flow jumps while orders per person fall, nothing broke: new people who aren't ready to buy pull the average down.",
           "term": ["Conversion rate (placed-order rate)", "In Klaviyo it's Placed Order per recipient."]},
    "s10": {"show": "aov_drop", "dana": "Dana: each person is spending less. Checkout again?", "watch": "happened",
            "intro": "Order size is revenue per order. Revenue per recipient = orders per recipient × order size, so each person can spend less two ways: fewer orders, or smaller ones.",
            "term": ["AOV (average order value)", "Revenue per recipient = orders per recipient × AOV."]},
    "s11": {"show": "conv_drop_all", "dana": "Dana: is it the email or the website?", "watch": "happened",
            "intro": "Clicks is the click rate. If the email itself broke (a dead link, an image that won't load), clicks fall and orders follow. If clicks hold and orders fall, the email still works and something after the click doesn't.",
            "term": ["Click rate (CTR): pre-click against post-click", "The first split an email marketer makes."]},
    "s12": {"show": "conv_drop_one", "dana": "Dana: is it the whole flow or one email?", "watch": "happened",
            "intro": "The email table puts every email in the flow side by side, last 7 days against the quiet weeks. One row out of line points at that email. Every row down together points at something they all share.",
            "term": ["Message-level breakdown", "This answers the case file's \"where\"."]},
    "j9-12": {"dana": "Dana: we have a few suspects. Where do we look first?", "watch": "suspects",
              "intro": "A new way to play: Suspects. The main chart and the revenue rows are free. The other charts are face down, and each flip costs a look. Cross out whoever a chart rules out, then accuse. The rest of this step is Read the whole chart, all the way down.",
              "term": ["Par", "The fewest looks that settle it. Good diagnosticians check first whatever splits the most suspects."]},
    "s13": {"show": "mpp_opens", "dana": "Dana: opens jumped! Is the new subject line working?", "watch": "happened",
            "intro": "Opens is the open rate. Apple Mail Privacy opens emails for people automatically, so opens can jump while nobody new is reading. Judge emails on clicks and orders.",
            "term": ["MPP (Mail Privacy Protection): machine opens", "Since 2021 open rates are inflated, and they don't prove anything on their own."]},
    "s14": {"show": "unsub_spike", "dana": "Dana: I think one email is driving people off the list.", "watch": "happened",
            "intro": "Unsubscribes is the unsubscribe rate, for the flow and for each email. It barely touches this week's revenue, which is why it hides. Each one is a person you can never email again.",
            "term": ["Unsubscribe rate", "A cost to the list, paid later."]},
    "s15": {"show": "conv_drop_all", "dana": "Dana: OK, so what do we do?", "watch": "whole",
            "intro": "Read the whole chart gets its last question: what do we do? Every cause has an owner. Your own email, you fix today. The site, the offer or the integration belongs to someone else: tell them. A slow slide needs a test. Wobble you watch. Nothing real you leave.",
            "term": ["Triage", "Matching the response to the cause and its owner."]},
}
IDX = {s["id"]: i for i, s in enumerate(STEPS)}
UNITS = [s["id"] for s in STEPS if s.get("n")]
TRACK = {1: STEPS}             # a level's path. lf_path2 adds Level 2's (step ids "2s1", "2j1-2"...), in the same progress book
STEP = {s["id"]: s for s in STEPS}
TITLE = {1: "Level 1 · One flow"}
PARTS_OF = {1: PARTS}


def level_of(sid: str) -> int:
    """Level 2's step ids start with 2, Level 7's with 7 (lf_path2, lf_path7). Level 1's start with a letter."""
    return int(sid[0]) if sid[:1].isdigit() else 1


def order() -> list[dict]:
    return [s for lv in sorted(TRACK) for s in TRACK[lv]]


def pos(sid: str) -> int:
    """Where a step sits across every level's path: Level 2's steps come after all of Level 1's."""
    return next(i for i, s in enumerate(order()) if s["id"] == sid)
GUIDED = 4                     # guided reps after a Meet: obvious cases, the hand shows where to look
PASS = {"unit": (8, 7), "join": (10, 8)}   # solo reps: right in the last N, ending on a right answer
HARD_STAR = (5, 4)             # optional hard tier: 4 of the last 5 earns the step's star
ROUNDS_REPS = 12


def step(sid: str) -> dict:
    return STEP[sid]


def kind_of(s: dict) -> str:
    return "case" if s.get("case") else "unit" if s.get("n") else "join"


VISIBLE: dict = {}             # level -> its own visible(sid), for a level that doesn't keep all of Level 1's charts (Level 7)


def visible(sid: str) -> list[str]:
    if level_of(sid) in VISIBLE:
        return VISIBLE[level_of(sid)](sid)
    return [k for s in order()[:pos(sid) + 1] if level_of(s["id"]) in (1, level_of(sid)) for k in s.get("adds", [])]


def obs_keys(sid: str) -> list[str]:
    v = visible(sid)
    return [k for k in OBS_KEYS if k in v]


def causes(sid: str) -> list[str]:
    out, track = [], TRACK[level_of(sid)]
    for s in track[:next(i for i, x in enumerate(track) if x["id"] == sid) + 1]:
        out = [c for c in out if c not in s.get("drops", [])] + [c for c in s.get("causes", []) if c not in out]
    return out


def new_keys(sid: str) -> list[str]:
    s = step(sid)
    return [k for k in s.get("adds", []) if k in OBS_KEYS]


def units_of(sid: str) -> list[str]:
    """A unit is itself. Join 5-8 covers units 5 to 8."""
    pre = sid[0] if sid[:1].isdigit() else ""
    if not sid[len(pre):].startswith("j"):
        return [sid]
    a, b = (int(x) for x in sid[len(pre) + 1:].split("-"))
    return [f"{pre}s{n}" for n in range(a, b + 1)]


def theme(sid: str) -> list[str]:
    """The causes this step is about: the ones its units brought in, and the ones that move its units' new charts."""
    us = units_of(sid)
    intro = {c for u in us for c in step(u).get("causes", [])}
    new = [k for u in us for k in step(u).get("adds", []) if k in OBS_KEYS]
    quiet = (None, F, IN, NONE, SAME)
    return [c for c in causes(sid) if c in intro or any(SCRIPT.get(c, {}).get(k) not in quiet for k in new)]


AGAIN = threading.local()      # while deal() brings a missed rep back, AGAIN.kind is that rep's kind


def pick_cause(sid: str, pool: list[str], rng: random.Random) -> str:
    """Three times as likely to deal one of the step's own causes, so a step's reps are about what it teaches."""
    want = getattr(AGAIN, "kind", None)
    if want and (c := next((c for c in pool if want in kinds(c)), None)):
        return c
    th = set(theme(sid))
    return rng.choices(pool, weights=[3 if c in th else 1 for c in pool])[0]


def kinds(cause: str) -> list[str]:
    return GROUP.get(cause, [cause])


def pick_kind(cause: str, rng: random.Random) -> str:
    want = getattr(AGAIN, "kind", None)
    return want if want in kinds(cause) else rng.choice(kinds(cause))


def cause_of(kind: str, sid: str) -> str:
    """The name a kind goes by at this step (entries_drop is "fewer people" until step 8)."""
    pool = causes(sid)
    return next((g for g, ks in GROUP.items() if kind in ks and g in pool), kind)


def name(cause: str, sid: str) -> str:
    return EARLY[cause] if cause in EARLY and pos(sid) < pos("s11") else NAME[cause]


def families(c: str) -> set[str]:
    return {f for f, ks in FAMILY.items() if c in ks or any(k in ks for k in kinds(c))}


# ---------------------------------------------------------------- reading a case the way this step's screen shows it
def observe(c: dict, sid: str) -> tuple[dict, dict]:
    obs, charts = LP.observe(c)
    obs["shape"] = SHAPE.get(c["kind"])
    v = visible(sid)
    cols = [k for k in ("clicks", "orders", "unsubs") if k in v]
    if "emails" in v:      # lf_proto's one-email-or-all reading, on the columns this step shows (the unsubscribe column comes at step 14)
        obs["emails"], _, obs["odd"] = LP._emails(c, cols)
        charts["emails"] = [{k: r[k] for k in ("name", "day", *cols)} for r in charts["emails"]]
    else:
        obs["odd"] = None
    return obs, charts


def consistent(kind: str, obs: dict, keys: list[str]) -> bool:
    return (all(obs.get(k) == s for k, s in SCRIPT[kind].items() if s is not None and k in keys)
            and not any(LP.breaks(obs, kind, k, SCRIPT) for k in keys))


def rules_out(obs: dict, cause: str, keys: list[str]) -> list[str]:
    return [k for k in keys if LP.breaks(obs, cause, k, SCRIPT)]


def make(kind: str, rng: random.Random, stage: str, sid: str, keys: list[str] | None = None, extra=None):
    """A case of this kind that matches its story on the charts this step shows, plus any extra condition."""
    keys = obs_keys(sid) if keys is None else keys
    c = obs = charts = None
    for _ in range(60):
        c = LF.make_case(kind, rng.randrange(10**9), stage=stage)
        obs, charts = observe(c, sid)
        if consistent(kind, obs, keys) and shape_shows(c, charts, keys, stage) and (extra is None or extra(c, obs, charts)):
            return c, obs, charts
    return None


def shape_shows(c, charts, keys, stage) -> bool:
    """Once the shape is on screen (step 3 on), a rep whose story says step, slope or spike has to look like one from the
    chart alone. Brent found a step that kept sinking for weeks reading as a slope: the planted cause isn't enough."""
    sh = SHAPE.get(c["kind"])
    return "shape" not in keys or sh not in (STEPV, SLOPE, SPIKE) or _shape_clear(c, charts, sh, stage)


def _day(c: dict) -> int | None:
    """The day the cause began (index 0..55): the planted start, or the day of the one huge order."""
    if c["kind"] == "big_order":
        r = LF.totals(c)["revenue"]
        return max(range(46, LF.DAYS), key=lambda i: r[i])
    s = c["truth"].get("since")
    return c["dates"].index(s) if s in c["dates"] else None


def _dots_out(charts: dict) -> int:
    b, dots = charts["main"]["band"], charts["main"]["dots"][-7:]
    return sum(1 for v in dots if v is not None and (v < b["lo"] or v > b["hi"]))


def _clean_end(ch: dict, want: str, stage: str) -> bool:
    """The last week reads one way only: an inside line stays inside all week, an outside one ends well clear of the band.
    Realistic (hard) cases skip this, so a dip that comes back is part of the hard tier."""
    if stage == "realistic":
        return True
    m = ch["main"]; b = m["band"]; w = b["hi"] - b["lo"]; last7 = [v for v in m["series"][-7:] if v is not None]
    if want == IN:
        return all(b["lo"] <= v <= b["hi"] for v in last7)
    gap = (b["lo"] - m["series"][-1]) if want == BELOW else (m["series"][-1] - b["hi"])
    return gap >= (0.25 if stage == "obvious" else 0.1) * w


def would(k: str, v: str) -> str:
    """What a cause predicts for one chart, as a clause."""
    lab = LABEL[k].split(" (")[0].lower()
    if k == "main":
        return f"the line would end {v} its normal range" if v != IN else "the line would stay inside its normal range"
    if k == "shape":
        return "revenue per recipient wouldn't move" if v == NONE else f"revenue per recipient would move in {SAY[v]}"
    if k == "lastweek":
        return "the week before would be way up" if v == U else "the week before would be a normal week"
    if k == "emails":
        return "one email would be out of line" if v == ONE else "every email would move together"
    return {U: f"{lab} would go up", D: f"{lab} would go down", F: f"{lab} would hold", Z: f"{lab} would fall to almost zero"}[v]


def is_(k: str, v: str) -> str:
    """What the screen shows for one chart, as a clause."""
    lab = LABEL[k].split(" (")[0].lower()
    if k == "main":
        return f"the line ends {v} its normal range"
    if k == "shape":
        return "revenue per recipient didn't move" if v == NONE else f"revenue per recipient moved in {SAY[v]}"
    if k == "lastweek":
        return "the week before was way up" if v == U else "the week before was a normal week"
    if k == "emails":
        return "one email is out of line" if v == ONE else "every email moved together"
    return {U: f"{lab} went up", D: f"{lab} went down", F: f"{lab} held", Z: f"{lab} fell to almost zero"}[v]


def money2(v: float) -> str:
    return f"${v:,.2f}"


def pct(v: float) -> str:
    return f"{abs(v) * 100:.0f}%"


# ---------------------------------------------------------------- the ways to play
def w_band(sid, rng, stage, level):
    ans = BELOW if level == "watch" else rng.choice([BELOW, IN, ABOVE])
    pool = {BELOW: ["conv_drop_all", "aov_drop", "conv_drop_one", "slow_slide", "tracking_break"], IN: ["noise", "entries_drop", "mpp_opens", "unsub_spike"],
            ABOVE: ["good_news"]}[ans]
    got = make(rng.choice(pool), rng, stage, sid, ["main"], lambda c, o, ch: o["main"] == ans and _clean_end(ch, ans, stage))
    if not got:
        return None
    c, obs, charts = got
    b, last = charts["main"]["band"], charts["main"]["last"]
    side = {BELOW: "under the bottom of the band", IN: "inside the band", ABOVE: "over the top of the band"}[ans]
    return {"case": c, "obs": obs, "charts": charts, "answer": {"pos": ans}, "kind": c["kind"],
            "q": {"ask": "Where is the line now, against its normal range?", "options": [[BELOW, "Below"], [IN, "Inside"], [ABOVE, "Above"]], "field": "pos"},
            "dana": rng.choice(["Dana: is {flow} OK this week?", "Dana: quick one, how's {flow} looking?", "Ruth: can you check {flow} for me?"]),
            "why": f"The line ends at {money2(last)}. The band runs {money2(b['lo'])} to {money2(b['hi'])}, so the end is {side}.",
            "spots": ["end", "band"],
            "hint": {"say": "Look at the right end of the line, then at the gray band.", "spot": ["end", "band"]},
            "walk": [{"say": "This line is revenue per recipient: what each email earned per person who got it, averaged over 7 days.", "spot": ["line"]},
                     {"say": "The gray band is where the line sat during the four quiet weeks. Inside it is normal for this flow.", "spot": ["band"]},
                     {"say": f"Now look only at the right end: the last 7 days. It ends at {money2(last)}.", "spot": ["end"]},
                     {"say": f"The band runs {money2(b['lo'])} to {money2(b['hi'])}. The end is {side}. So: {SAY[ans].split(' ')[0].capitalize()}.",
                      "spot": ["end", "band"], "do": {"pos": ans}}]}


def w_wobble(sid, rng, stage, level):
    ans = "wobble" if level == "watch" else rng.choice(["real", "wobble"])
    if ans == "real":
        kind = rng.choice(["conv_drop_all", "aov_drop", "conv_drop_one", "slow_slide", "good_news", "good_news"])
        got = make(kind, rng, stage, sid, ["main"], lambda c, o, ch: o["main"] in (BELOW, ABOVE) and _clean_end(ch, o["main"], stage))
    else:
        trap = level in ("watch", "solo", "hard") or rng.random() < 0.5    # a day outside the band, the line inside: on from Solo
        got = make("noise", rng, stage, sid, ["main"], lambda c, o, ch: o["main"] == IN and _clean_end(ch, IN, stage) and (_dots_out(ch) >= 1 or not trap))
    if not got:
        return None
    c, obs, charts = got
    b, last, n_out = charts["main"]["band"], charts["main"]["last"], _dots_out(charts)
    if ans == "real":
        why = f"The line itself ends at {money2(last)}, {'below' if obs['main'] == BELOW else 'above'} its normal range ({money2(b['lo'])} to {money2(b['hi'])}). That's a real move."
    else:
        why = (f"The line ends at {money2(last)}, inside its normal range. {n_out} single day{'s' if n_out != 1 else ''} last week sat outside the band, but one day isn't a change."
               if n_out else f"The line ends at {money2(last)}, inside its normal range. Normal wobble.")
    dots, b_ = charts["main"]["dots"], charts["main"]["band"]
    last7 = [i for i in range(len(dots) - 7, len(dots)) if dots[i] is not None]
    lowest = max(last7, key=lambda i: max(b_["lo"] - dots[i], dots[i] - b_["hi"], -abs(dots[i] - b_["mid"])))
    return {"case": c, "obs": obs, "charts": charts, "answer": {"real": ans}, "kind": c["kind"],
            "q": {"ask": "Did the line really move, or is it normal wobble?", "options": [["real", "A real move"], ["wobble", "Normal wobble"]], "field": "real"},
            "dana": rng.choice(["Dana: one day last week looked awful on {flow}. Should I worry?", "Dana: {flow} had a rough day. Is it broken?", "Priya: {flow} looks jumpy this week. Real?"]),
            "why": why, "spots": ["end", "band"],
            "hint": {"say": "Ignore single dots. Where does the line end, against the band?", "spot": ["end"]},
            "walk": [{"say": "The dots are single days. They swing a lot, especially on a small flow.", "spot": ["dots"]},
                     {"say": "This day is the one Dana saw.", "spot": [f"dot-{lowest}"]},
                     {"say": f"But the line, the 7-day average, ends at {money2(last)}: {'inside' if obs['main'] == IN else 'outside'} the band.", "spot": ["end", "band"]},
                     {"say": "The line decides. " + ("One bad day isn't a change: normal wobble." if ans == "wobble" else "It left the band: a real move."), "spot": ["end"], "do": {"real": ans}}]}


SHAPE_KINDS = {STEPV: ["conv_drop_all", "aov_drop", "conv_drop_one", "good_news", "tracking_break"], SLOPE: ["slow_slide"], SPIKE: ["big_order"]}
TOL = {STEPV: (-2, 6), SLOPE: (-8, 21), SPIKE: (-1, 1)}      # how far from the true start a click still counts, in days


SHAPE_READ = {   # what the line has to show before a rep asks for its shape. The planted cause alone isn't enough: on a quiet
    # flow a step can sink on for weeks after the drop, or a slide can fall mostly in one week, and then the chart reads as the other shape.
    #   cliff: a step makes at least this share of its whole move in the week after it starts. A slope makes at most "slope" of it
    #   in any one week (its steepest week, wherever that falls: a slide can sit still for days and then drop like a step).
    #   wiggle: after the step, the line stays within this share of the move.   flat: days the line holds after the week of the drop.
    #   drift: after the step, the line's trend moves it at most this share of the move again (it holds, it doesn't sink on).
    #   inside: share of the days before the start with the line inside the band.   spike: how far the top dot stands out (a spike).
    #   near: share of the 10 days just before the start inside the band. A bump right before a drop hides where it started.
    #   steady: a slope keeps going. Cut the days since the start in thirds: the second and third each sit this share of the move lower.
    "obvious": {"cliff": 0.85, "wiggle": 0.45, "drift": 0.15, "flat": 7, "inside": 0.9, "near": 1.0, "slope": 0.40, "steady": 0.2, "spike": 4.0},
    "clear": {"cliff": 0.80, "wiggle": 0.55, "drift": 0.2, "flat": 7, "inside": 0.85, "near": 1.0, "slope": 0.45, "steady": 0.15, "spike": 3.0},
    "realistic": {"cliff": 0.65, "wiggle": 0.80, "drift": 0.4, "flat": 3, "inside": 0.0, "near": 0.0, "slope": 0.60, "steady": 0.05, "spike": 2.0},
}
LONE_DOT = 2.5     # a step or a slope may not have one dot standing out like a spike's


def shape_read(c: dict, ch: dict) -> dict:
    """The shape as the chart shows it, measured from the start day on the line the player sees."""
    m = ch["main"]; s = m["series"]; b = m["band"]; d = _day(c) - 6
    avg = lambda xs: sum(xs) / len(xs)
    before = avg(s[max(0, d - 5):d]) if d > 0 else s[0]
    after = s[d + 7:]                                   # the 7-day average has taken in the whole change by d + 7
    week = avg(after[:3]) if len(after) >= 3 else s[-1]
    move = avg(s[-4:]) - before
    rest = after[1:] or after
    since = s[d:]; k = len(since) // 3
    thirds = [avg(since[i * k:(i + 1) * k] if i < 2 else since[2 * k:]) for i in range(3)] if k else [0.0] * 3
    n = len(after); mx = (n - 1) / 2
    trend = sum((i - mx) * (v - avg(after)) for i, v in enumerate(after)) / sum((i - mx) ** 2 for i in range(n)) * (n - 1) if n > 2 else 0.0
    dots = sorted((v for v in m["dots"] if v is not None), reverse=True)
    weeks = [(s[i + 7] - s[i]) / move for i in range(max(0, d - 3), len(s) - 7)] if abs(move) > 1e-9 else []
    pre = s[max(0, d - 10):d]
    return {"near": sum(b["lo"] <= v <= b["hi"] for v in pre) / len(pre) if pre else 1.0,
            "cliff": (week - before) / move if abs(move) > 1e-9 else 0.0,
            "steepest": max(weeks, default=0.0),
            "wiggle": (max(rest) - min(rest)) / abs(move) if rest and abs(move) > 1e-9 else 9.0,
            "drift": trend / move if abs(move) > 1e-9 else 9.0,
            "steady": min((y - x) / move for x, y in zip(thirds, thirds[1:])) if k and abs(move) > 1e-9 else 0.0,
            "flat": len(after) - 3,
            "inside": sum(b["lo"] <= v <= b["hi"] for v in s[:d]) / d if d > 0 else 1.0,
            "spike": (dots[0] - b["mid"]) / max(1e-9, dots[1] - b["mid"])}


def _shape_clear(c, ch, shape, stage) -> bool:
    if _day(c) is None:
        return False
    f, t = shape_read(c, ch), SHAPE_READ[stage]
    if shape == STEPV:
        return (f["cliff"] >= t["cliff"] and f["wiggle"] <= t["wiggle"] and abs(f["drift"]) <= t["drift"] and f["flat"] >= t["flat"]
                and f["inside"] >= t["inside"] and f["near"] >= t["near"] and f["spike"] < LONE_DOT)
    if shape == SLOPE:
        return (f["cliff"] >= 0 and f["steepest"] <= t["slope"] and f["steady"] >= t["steady"]
                and f["inside"] >= t["inside"] and f["near"] >= t["near"] and f["spike"] < LONE_DOT)
    return f["spike"] >= t["spike"]


def _start_case(sid, rng, stage, shape):
    got = make(rng.choice(SHAPE_KINDS[shape]), rng, stage, sid, ["main"], lambda c, o, ch: _shape_clear(c, ch, shape, stage))
    if not got or _day(got[0]) is None:
        return None
    return got


def _start_why(c, shape):
    d = _day(c); dt = c["dates"][d][5:]
    move = "jumps" if c["kind"] == "good_news" else "drops"
    return {STEPV: f"The line {move} around {dt} and stays there: a step. Something changed that day.",
            SLOPE: f"The line has been sliding since about {dt}: a slope. Nothing broke on one day. Something is wearing out.",
            SPIKE: f"One day, {dt}, sits far above every other day and drags the line up with it: a spike. One huge order."}[shape]


def _day_ok(c, shape, day_idx) -> bool:
    d = _day(c) - 6                         # the chart starts on day 6, the first full 7-day average
    lo, hi = TOL[shape]
    return day_idx is not None and d + lo <= int(day_idx) <= d + hi


def w_start(sid, rng, stage, level):
    shape = STEPV if level == "watch" else rng.choice([STEPV, SLOPE, SPIKE])
    got = _start_case(sid, rng, stage, shape)
    if not got:
        return None
    c, obs, charts = got
    d = _day(c) - 6
    return {"case": c, "obs": obs, "charts": charts, "answer": {"shape": shape, "day": d}, "kind": c["kind"],
            "q": {"ask": "Click the day it started. Then: what shape is it?", "options": [[STEPV, "Step"], [SLOPE, "Slope"], [SPIKE, "Spike"]], "field": "shape", "click": "day"},
            "dana": rng.choice(["Dana: when did this start on {flow}?", "Ruth: how long has {flow} looked like this?"]),
            "why": _start_why(c, shape), "spots": [f"day-{d}"],
            "hint": {"say": "Find where the line leaves the band and doesn't come back. Did it drop at once, slide for weeks, or jump on one day?", "spot": ["line", "dots"]},
            "walk": [{"say": "Read the whole 8 weeks, left to right. Find where the line stops looking like the quiet weeks.", "spot": ["line"]},
                     {"say": f"It starts here, around {c['dates'][d + 6][5:]}.", "spot": [f"day-{d}"], "do": {"day": d}},
                     {"say": {STEPV: "It changed within about a week and stayed changed. That's a step.", SLOPE: "It slid a little every week, no single break. That's a slope.",
                              SPIKE: "One day's dot is far above the rest, and the line jumps the same day. That's a spike."}[shape], "spot": ["line"], "do": {"shape": shape}}]}


SIZES = [["held", "Held: under 12%"], ["some", "12 to 30%"], ["alot", "30 to 60%"], ["most", "Over 60%"]]
CUTS = [0.12, 0.30, 0.60]
PCT_FROM = "j1-4"      # the % from baseline is on screen from here on. Step 4 and Join 3-4 ask you to work it out from the two numbers


def size_bin(v: float) -> str:
    v = abs(v)
    return "held" if v < CUTS[0] else "some" if v < CUTS[1] else "alot" if v < CUTS[2] else "most"


def size_ok(choice: str, v: float) -> bool:
    """Within 3 points of a cut, both neighbors count."""
    names = [s[0] for s in SIZES]
    return choice in {size_bin(abs(v) - 0.03), size_bin(v), size_bin(abs(v) + 0.03)} and choice in names


def w_size(sid, rng, stage, level):
    want = "alot" if level == "watch" else rng.choice(["held", "some", "alot", "most"])
    pool = {"held": ["noise", "entries_drop", "mpp_opens"], "some": ["aov_drop", "conv_drop_one", "good_news", "conv_drop_all"],
            "alot": ["conv_drop_all", "slow_slide", "good_news", "aov_drop"], "most": ["tracking_break", "conv_drop_all"]}[want]
    def fits(c, o, ch):
        v = abs(ch["main"]["ch"])
        return size_bin(v) == want and all(abs(v - x) >= 0.03 for x in CUTS)
    got = None
    for _ in range(4):
        got = make(rng.choice(pool), rng, stage, sid, ["main"], fits)
        if got:
            break
    if not got:
        return None
    c, obs, charts = got
    m = charts["main"]; v = m["ch"]
    lab = dict(SIZES)[size_bin(v)]
    return {"case": c, "obs": obs, "charts": charts, "answer": {"size": size_bin(v)}, "kind": c["kind"], "size_v": v,
            "q": {"ask": "How far is the last week from normal?", "options": SIZES, "field": "size"},
            "dana": rng.choice(["Dana: how bad is {flow} this week?", "Ruth: how big a deal is {flow} right now?"]),
            "why": f"Baseline {money2(m['base'])}, last 7 days {money2(m['last'])}. The gap is {money2(abs(m['last'] - m['base']))}, and "
                   f"{money2(abs(m['last'] - m['base']))} ÷ {money2(m['base'])} = {pct(v)} {'below' if v < 0 else 'above'}: {lab.lower()}.",
            "spots": ["facts"],
            "hint": {"say": f"Take the gap between the two numbers and divide it by the baseline, {money2(m['base'])}. A quarter of the baseline is 25%.", "spot": ["facts"]},
            "walk": [{"say": f"Normal is the quiet weeks' average: {money2(m['base'])} a recipient.", "spot": ["f-normal"]},
                     {"say": f"The last 7 days: {money2(m['last'])}.", "spot": ["f-last", "end"]},
                     {"say": f"The gap is {money2(abs(m['last'] - m['base']))}, which is {pct(v)} of {money2(m['base'])}. So: {lab}.", "spot": ["facts"], "do": {"size": size_bin(v)}}]}


# ---------------------------------------------------------------- Read the whole chart: the walk (docs/SKILL-MAP.md)
# Brent's pick after the sampler (2026-10-14): "it basically asks you and guides you through the thought process". One
# case, the questions in the order he'd ask them on a real alert, each one only when the case's branch leads to it and its
# chart is on screen. The page gets one question at a time: check() grades it, says why, and sends the next one down the
# true branch. A question never comes before the answer that leads to it, so the questions can't give the answer away.
TOP = {"fewer": "Fewer people got the emails", "mix": "More people came in, each spending less", "less": "Each person spent less",
       "more": "Each person spent more", "nothing": "Nothing real"}
TOP_OF = {"entries_drop": "fewer", "delivery_drop": "fewer", "volume_mix": "mix", "conv_drop_all": "less", "conv_drop_one": "less",
          "aov_drop": "less", "tracking_break": "less", "slow_slide": "less", "click_drop_one": "less", "good_news": "more", "big_order": "more",
          "noise": "nothing", "black_friday": "nothing", "mpp_opens": "nothing", "unsub_spike": "nothing"}
NODE_NAME = {"real": "real or wobble", "top": "what happened", "when": "since when, what shape", "size": "how big", "people": "where they were lost",
             "order": "orders or order size", "click": "before or after the click", "where": "one email or all", "quiet": "opens and unsubscribes",
             "action": "what to do"}
SHAPE_OPTS = [[STEPV, "Step"], [SLOPE, "Slope"], [SPIKE, "Spike"]]
QUIET = ("opens", "unsubs")      # charts that move without touching revenue: they must say only what the cause says


def money0(v: float) -> str:
    return f"${v:,.0f}"


def moved(v: float) -> str:
    return "held" if abs(v) < 0.12 else f"fell {pct(v)}" if v < 0 else f"rose {pct(v)}"


def _tops(sid: str) -> list[str]:
    """The first question's answers at this step: the same list on every rep, so it never points at the case."""
    pool = {k for c in causes(sid) for k in kinds(c)}
    return [t for t in TOP if t != "mix" or "volume_mix" in pool]


def _when_shape(kind: str) -> str:
    sh = SHAPE.get(kind)
    return sh if sh in (STEPV, SLOPE, SPIKE) else STEPV        # one email's broken link still drops the line on one day


def walk_fits(c, obs, charts, sid, stage) -> bool:
    """The case reads one way only at every question the walk could ask it."""
    kind, v = c["kind"], visible(sid)
    if "revenue" not in v:                                     # Join 1-4 and step 5: the main chart alone
        if obs["main"] == IN:
            return _clean_end(charts, IN, stage)
        return (obs["main"] in (BELOW, ABOVE) and _shape_clear(c, charts, _when_shape(kind), stage)
                and all(abs(abs(charts["main"]["ch"]) - x) >= 0.03 for x in CUTS))
    top = TOP_OF[kind]
    want = {"fewer": IN, "nothing": IN, "less": BELOW, "mix": BELOW, "more": ABOVE}[top]
    if obs["main"] != want or not _clean_end(charts, want, stage):
        return False
    if (top == "fewer" and obs["revenue"] != D) or (top == "nothing" and kind != "black_friday" and obs["revenue"] != F):
        return False
    if kind == "black_friday" and charts["revenue"]["ch"] > 0.4:      # up a lot on the quiet weeks reads as something real
        return False
    if top == "mix" and obs.get("entered") != U:
        return False
    if top in ("less", "more") and "shape" in v and not _shape_clear(c, charts, _when_shape(kind), stage):
        return False
    if kind == "click_drop_one" and "orders" in v and obs.get("orders") != D:
        return False
    return all(obs.get(k) == (SCRIPT[kind].get(k) or F) for k in QUIET if k in v)


def _odd_email(charts: dict, v: list[str]) -> str:
    rows = charts.get("emails") or []
    cols = [k for k in ("clicks", "orders", "unsubs") if k in v and rows and k in rows[0]]
    def gap(i):
        return max((abs(rows[i][k] - sum(r[k] for j, r in enumerate(rows) if j != i) / (len(rows) - 1)) for k in cols), default=0)
    return rows[max(range(len(rows)), key=gap)]["name"] if len(rows) > 1 and cols else "one email"


def walk_nodes(c, obs, charts, sid) -> list[dict]:
    """The questions on this case's branch, in order, each with its answer, the reason, and where to look."""
    kind, v, m = c["kind"], visible(sid), charts["main"]
    nodes = []

    def node(id_, ask, options, answer, why, spots, hint, **extra):
        nodes.append({"id": id_, "ask": ask, "options": options, "field": extra.pop("field", id_), "answer": answer, "why": why, "spots": spots,
                      "hint": {"say": hint, "spot": extra.pop("hint_spot", spots)}, **extra})

    if "revenue" not in v:
        real = obs["main"] in (BELOW, ABOVE)
        node("real", "Did the line really move, or is it normal wobble?", [["real", "A real move"], ["wobble", "Normal wobble"]], "real" if real else "wobble",
             f"The line ends {'below' if obs['main'] == BELOW else 'above'} its normal range: a real move." if real
             else "The line ends inside its normal range: normal wobble. Nothing to date or size.",
             ["end", "band"], "Ignore single dots. Where does the line end, against the band?")
        top = "more" if obs["main"] == ABOVE else "less" if real else "nothing"
    else:
        top, r, bf = TOP_OF[kind], charts["revenue"], kind == "black_friday"
        sign = f"{'+' if r['ch'] >= 0 else '-'}{pct(r['ch'])}"
        sent = f", and Got the email {moved(charts['delivered']['ch'])} with it" if "delivered" in v else ""
        why = {"fewer": f"Revenue {moved(r['ch'])} against the quiet weeks{sent}. The line, what each person spent, is inside its normal range. So fewer people got the emails.",
               "mix": f"The line ends below its normal range, so each person spent less. But Entered the flow {moved(charts['entered']['ch'])}: more people came in. "
                      "New people who aren't ready to buy yet pull the average down.",
               "less": f"The line ends below its normal range: each person who got an email spent less ({money2(m['last'])} against {money2(m['base'])}).",
               "more": f"The line ends above its normal range: each person who got an email spent more ({money2(m['last'])} against {money2(m['base'])}).",
               "nothing": (f"Against the quiet weeks revenue isn't down: it's {sign}, and the line is inside its normal range. The week before was {pct(r['prev_ch'])} "
                           "above normal: Black Friday. The drop is only against that odd week, so nothing real happened." if bf
                           else f"The line is inside its normal range, and revenue is about normal against the quiet weeks ({sign}). Nothing real happened to revenue.")}[top]
        spots = {"fewer": ["revenue", "end"] + (["tile-delivered"] if "delivered" in v else []), "mix": ["end", "tile-entered"], "less": ["end", "band"], "more": ["end", "band"],
                 "nothing": ["revenue", "end"] + (["lastweek"] if bf else [])}[top]
        node("top", "What happened to revenue?", [[t, TOP[t]] for t in _tops(sid)], top, why, spots,
             "Revenue is people times what each person spent. Check the Revenue row, then the line." + (" Did Entered the flow move too?" if "mix" in _tops(sid) else ""),
             hint_spot=["revenue", "end"])
    if top in ("less", "more") and "shape" in v:
        sh, d = _when_shape(kind), _day(c) - 6
        node("when", "Click the day it started. What shape?", SHAPE_OPTS, {"shape": sh, "day": d}, _start_why(c, sh), [f"day-{d}"],
             "Find where the line leaves the band and doesn't come back. Did it drop at once, slide for weeks, or jump on one day?",
             field="shape", click="day", hint_spot=["line", "dots"])
    if top != "nothing" and "size" in v:
        if top == "fewer":
            x = charts["revenue"]["ch"]
            node("size", "How far is revenue from normal?", SIZES, size_bin(x),
                 f"Revenue, last 7 days: {money0(charts['revenue']['week'])} against {money0(charts['revenue']['quiet'])} in a normal week, {pct(x)} "
                 f"{'below' if x < 0 else 'above'}: {dict(SIZES)[size_bin(x)].lower()}.", ["revenue"], "Read the Revenue row's % from baseline.", size_v=x)
        else:
            x = m["ch"]
            node("size", "How far is revenue per recipient from normal?", SIZES, size_bin(x),
                 f"Revenue per recipient: {money2(m['last'])} against {money2(m['base'])}, {pct(x)} {'below' if x < 0 else 'above'} normal: "
                 f"{dict(SIZES)[size_bin(x)].lower()}.", ["f-pct"], "Read the RPR row's % from baseline.", size_v=x)
    if top == "fewer" and "entered" in v:
        e, g = charts["entered"]["ch"], charts["delivered"]["ch"]
        ans = "entered" if kind == "entries_drop" else "delivered"
        node("people", "Where were they lost?", [["entered", "Fewer people entered the flow"], ["delivered", "People entered, but fewer got the emails"]], ans,
             f"Entered the flow {moved(e)}, and Got the email {moved(g)} with it: fewer people came in." if ans == "entered"
             else f"Entered the flow {moved(e)}, but Got the email {moved(g)}: people came in, and the emails didn't reach them.",
             ["tile-entered", "tile-delivered"], "Compare Entered the flow with Got the email.")
    ans = None
    if top in ("less", "more") and "orders" in v and (top == "less" or "order_size" in v):
        o, z = charts["orders"]["ch"], "order_size" in v
        if top == "less":
            opts = [["often", "They ordered less often"], ["counted", "Orders stopped being counted"]] + ([["smaller", "Each order was smaller"]] if z else [])
            ans = "counted" if kind == "tracking_break" else "smaller" if kind == "aov_drop" else "often"
            why = {"often": f"Orders, the placed-order rate, {moved(o)}{', and Order size held' if z else ''}: each person ordered less often.",
                   "counted": f"Orders fell to almost zero ({pct(o)} down). People don't all stop buying at once: the counting broke, not the sales.",
                   "smaller": f"Orders held, and Order size {moved(charts['order_size']['ch']) if z else ''}: each order was smaller."}[ans]
        else:
            opts = [["often", "They ordered more often"], ["bigger", "Their orders got bigger"]]
            ans = "bigger" if kind == "big_order" else "often"
            why = (f"Orders held, and Order size {moved(charts['order_size']['ch'])}: bigger orders. One day far above the rest is one huge order." if ans == "bigger"
                   else f"Orders {moved(o)}: each person ordered more often.")
        node("order", f"Each person spent {top}. Why?", opts, ans, why, ["tile-orders", "tile-order_size"] if ans in ("smaller", "bigger") else ["tile-orders"],
             "Orders is how often each person ordered." + (" Order size is how much each order was." if z else ""),
             hint_spot=["tile-orders"] + (["tile-order_size"] if z else []))
    if ans == "often" and "clicks" in v:
        k = charts["clicks"]["ch"]
        if top == "less":
            a2 = "clicks" if obs.get("clicks") == D else "after"
            node("click", "Fewer orders. Before the click, or after?", [["clicks", "Fewer people clicked"], ["after", "They clicked, but fewer bought"]], a2,
                 f"Clicks {moved(k)} along with Orders: fewer people clicked, so fewer bought. The cause is in the emails themselves." if a2 == "clicks"
                 else "Clicks held while Orders fell: the email still works. Something after the click doesn't, like checkout, the site or the offer.",
                 ["tile-clicks", "tile-orders"], "Did Clicks fall with Orders, or hold?")
        else:
            a2 = "clicks" if obs.get("clicks") == U else "after"
            node("click", "More orders. Before the click, or after?", [["clicks", "More people clicked"], ["after", "Same clicks, more of them bought"]], a2,
                 f"Clicks {moved(k)} along with Orders: more people clicked, and more bought." if a2 == "clicks"
                 else "Clicks held while Orders rose: the same people clicked, and more of them bought.",
                 ["tile-clicks", "tile-orders"], "Did Clicks rise with Orders, or hold?")
    if top in ("less", "more") and "emails" in v and obs.get("emails") in (ONE, SAME) and kind != "big_order":
        one = obs["emails"] == ONE
        node("where", "One email, or every email?", [["one", "One email is out of line"], ["all", "Every email moved together"]], "one" if one else "all",
             f"In the Each email table, {_odd_email(charts, v)} is out of line and the others look normal: the cause is in that one email." if one
             else "Every row in the Each email table moved about the same: the cause is something they all share.",
             ["emails"], "Read the Each email table row by row.")
    if top == "nothing" and "opens" in v:
        u = "unsubs" in v
        q = "opens" if kind == "mpp_opens" else "unsubs" if kind == "unsub_spike" else "none"
        why = {"opens": f"Opens {moved(charts['opens']['ch'])}, but clicks and orders held. Apple Mail Privacy opens emails nobody reads, so opens alone prove nothing.",
               "unsubs": f"Unsubscribes {moved(charts['unsubs']['ch']) if u else ''}, most of it in one email. It barely touches this week's revenue, but each one is a "
                         "person you can't email again.",
               "none": "Opens and unsubscribes held. Nothing else moved." if u else "Opens held. Nothing else moved."}[q]
        node("quiet", "Revenue is fine. Did opens or unsubscribes move?" if u else "Revenue is fine. Did opens move?",
             [["opens", "Opens jumped"]] + ([["unsubs", "Unsubscribes jumped in one email"]] if u else []) + [["none", "Neither moved" if u else "Opens held"]], q, why,
             {"opens": ["tile-opens"], "unsubs": ["tile-unsubs", "emails"], "none": ["tile-opens"] + (["tile-unsubs"] if u else [])}[q],
             "Check Opens" + (" and Unsubscribes." if u else "."), hint_spot=["tile-opens"] + (["tile-unsubs"] if u else []))
    if pos(sid) >= pos("s15"):
        node("action", "What do we do?", [[k, x] for k, x in LF.ACTIONS.items()], actions_ok(kind), ACTION_WHY[kind], [], "Who can fix this: you, someone else, or nobody?",
             hint_spot=["q"])
    return nodes


def _pub_node(n: dict | None, level: str) -> dict | None:
    """One question as the page sees it: never its answer or its reason."""
    if not n:
        return None
    out = {k: n[k] for k in ("id", "ask", "options", "field") if k in n}
    if n.get("click"):
        out["click"] = n["click"]
    if level in ("guided", "together", "try"):
        out["hint"] = n["hint"]
    return out


def _node_answer(n: dict) -> dict:
    """The answer to one question as a page body would send it."""
    if n["id"] == "when":
        return dict(n["answer"])
    return {n["field"]: n["answer"][0] if n["id"] == "action" else n["answer"]}


def _node_ok(d: dict, n: dict, body: dict) -> bool:
    if n["id"] == "when":
        return body.get("shape") == n["answer"]["shape"] and _day_ok(d["case"], n["answer"]["shape"], body.get("day"))
    if n["id"] == "size":
        return size_ok(str(body.get("size")), n["size_v"])
    if n["id"] == "action":
        return body.get("action") in n["answer"]
    return body.get(n["field"]) == n["answer"]


def _walk_kind(sid: str, rng: random.Random) -> str:
    """A branch first, so the first answer isn't nearly always "each person spent less": the branches holding this
    step's own causes count double. Then a cause on that branch, three times as likely one of the step's own."""
    th, by = set(theme(sid)), {}
    for c in causes(sid):
        by.setdefault(TOP_OF[kinds(c)[0]], []).append(c)
    bs = list(by)
    b = rng.choices(bs, weights=[2 if th & set(by[x]) else 1 for x in bs])[0]
    return pick_kind(pick_cause(sid, by[b], rng), rng)


def w_whole(sid, rng, stage, level):
    """Read the whole chart: the walk down the questions this case's branch needs (walk_nodes)."""
    v, want = visible(sid), getattr(AGAIN, "kind", None)
    show = (MEET.get(sid) or {}).get("show") if level == "watch" else None
    got = None
    for _ in range(12):
        if show or want:
            kind = show or want
        elif "revenue" not in v:                  # the main chart alone: a real move 7 times in 10
            kind = rng.choice(SHAPE_KINDS[rng.choice([STEPV, STEPV, SLOPE, SPIKE])]) if rng.random() < 0.7 else "noise"
        else:
            kind = _walk_kind(sid, rng)
        got = make(kind, rng, stage, sid, ["main"] if "revenue" not in v else None, lambda c, o, ch: walk_fits(c, o, ch, sid, stage))
        if got:
            break
    if not got:
        return None
    c, obs, charts = got
    nodes = walk_nodes(c, obs, charts, sid)
    ans = {}
    for n in nodes:
        ans.update(dict(n["answer"]) if n["id"] == "when" else {n["field"]: n["answer"]})
    q = {"walk": True, "node": _pub_node(nodes[0], level)}
    if level == "watch":
        q["nodes"] = [_pub_node(n, level) for n in nodes]
    return {"case": c, "obs": obs, "charts": charts, "answer": ans, "kind": c["kind"], "nodes": nodes, "q": q,
            "dana": rng.choice(["Dana: what's the story on {flow}?", "Ruth: give me the short version on {flow}.", "Today flagged {flow} for a look."]),
            "why": " ".join(n["why"] for n in nodes), "spots": list(dict.fromkeys(s for n in nodes for s in n["spots"])), "hint": nodes[0]["hint"],
            "walk": [{"say": f"{n['ask']} {n['why']}", "why": n["why"], "spot": n["spots"] or ["q"], "do": {"node": i, **_node_answer(n)}} for i, n in enumerate(nodes)]}


def check(rid: str, i, body: dict) -> dict:
    """Read the whole chart, one question: right or wrong, why, and the next question down the true branch. Nothing is
    recorded here: answer() grades the whole walk at the end. Together: a wrong answer is tried again, nothing shown."""
    d = PENDING.get(rid)
    if not d or d["way"] not in WALKS:
        return {"error": "That one expired."}
    try:
        i = int(i)
    except (TypeError, ValueError):
        return {"error": "No such question."}
    nodes = d["nodes"]
    if not 0 <= i < len(nodes) or i > d.get("checked", -1) + 1:
        return {"error": "No such question."}
    n = nodes[i]
    ok = _node_ok(d, n, body)
    if d["level"] == "together" and not ok:
        return {"ok": False, "retry": True, "say": n["hint"]["say"]}
    d["checked"] = max(d.get("checked", -1), i)
    nxt = nodes[i + 1] if i + 1 < len(nodes) else None
    return {"ok": ok, "i": i, "id": n["id"], "name": NODE_NAME[n["id"]], "right": n["answer"], "why": n["why"], "spots": n["spots"],
            "next": _pub_node(nxt, d["level"]), "last": nxt is None}


# ---------------------------------------------------------------- What happened: the whole screen, one question, no help
# The answer is where the walk would end, in plain words. The list is fixed from each step on, so it never points at the
# case, and it grows with the dashboard: Brent found the first three answers "vague and not really of much substance".
HAPPEN_SETS = [
    ("s6", [["fewer", "Fewer people got the emails", ("entries_drop", "delivery_drop")], ["less", "Each person spent less", ("conv_drop_all", "slow_slide")],
            ["nothing", "Nothing real", ("noise", "black_friday")]]),
    ("s8", [["entered", "Fewer people entered the flow", ("entries_drop",)], ["delivered", "People entered, but fewer got the emails", ("delivery_drop",)],
            ["less", "Each person spent less", ("conv_drop_all", "slow_slide")], ["nothing", "Nothing real", ("noise", "black_friday")]]),
    ("s9", [["fewer", "Fewer people got the emails", ("entries_drop", "delivery_drop")], ["mix", "More people came in, each spending less", ("volume_mix",)],
            ["often", "Each person ordered less often", ("conv_drop_all", "slow_slide")], ["counted", "Orders stopped being counted", ("tracking_break",)],
            ["nothing", "Nothing real", ("noise", "black_friday")]]),
    ("s10", [["often", "Each person ordered less often", ("conv_drop_all", "slow_slide")], ["smaller", "Each order was smaller", ("aov_drop",)],
             ["counted", "Orders stopped being counted", ("tracking_break",)], ["bigger", "Orders got bigger: one huge order", ("big_order",)],
             ["nothing", "Nothing real", ("noise", "black_friday")]]),
    ("s11", [["clicks", "Fewer people clicked", ("click_drop_one", "slow_slide")], ["after", "They clicked, but fewer bought", ("conv_drop_all",)],
             ["smaller", "Each order was smaller", ("aov_drop",)], ["counted", "Orders stopped being counted", ("tracking_break",)],
             ["nothing", "Nothing real", ("noise", "black_friday")]]),
    ("s12", [["one_click", "One email: fewer people clicked it", ("click_drop_one",)], ["one_after", "One email: clicks held, fewer bought", ("conv_drop_one",)],
             ["all_after", "Every email: clicks held, fewer bought", ("conv_drop_all",)], ["better", "One email started earning more", ("good_news",)],
             ["nothing", "Nothing real", ("noise", "black_friday")]]),
    ("s13", [["opens", "Opens jumped, and nothing else did", ("mpp_opens",)], ["more", "Each person spent more", ("good_news",)],
             ["less", "Each person spent less", ("conv_drop_all", "aov_drop", "slow_slide")], ["nothing", "Nothing moved at all", ("noise",)]]),
    ("s14", [["unsubs", "Unsubscribes jumped in one email", ("unsub_spike",)], ["opens", "Opens jumped, and nothing else did", ("mpp_opens",)],
             ["less", "Each person spent less", ("conv_drop_all", "aov_drop", "slow_slide")], ["nothing", "Nothing moved at all", ("noise",)]]),
]
HAPPEN_HINT = {"s6": "The Revenue row is the total. The line is per person. Which one moved?",
               "s8": "Revenue and the line first. If fewer people got the emails, compare Entered the flow with Got the email.",
               "s9": "Revenue and the line first. If each person spent less, check Orders. Did Entered the flow jump?",
               "s10": "If each person spent less, compare Orders with Order size.",
               "s11": "Did Clicks fall with Orders, or hold? Then check Order size.",
               "s12": "One row of the Each email table out of line, or all of them together? Then Clicks against Orders.",
               "s13": "Did anything besides Opens move? Check the line, Clicks and Orders.",
               "s14": "Check Unsubscribes and the Each email table, then Opens and the line."}
QUIET_NOTHING = ("s13", "s14")   # from Opens on, "Nothing moved at all" means every tile held too


def happen_set(sid: str) -> tuple[str, list]:
    return next((f, opts) for f, opts in reversed(HAPPEN_SETS) if pos(f) <= pos(sid))


def _happen_fits(c, obs, charts, sid, stage, base) -> bool:
    if not walk_fits(c, obs, charts, sid, stage):
        return False
    return base not in QUIET_NOTHING or c["kind"] != "noise" or all(obs.get(k) == F for k in LP.TILES if k in visible(sid))


def w_happened(sid, rng, stage, level):
    base, opts = happen_set(sid)
    pool = {k for c in causes(sid) for k in kinds(c)}
    live = [o for o in opts if set(o[2]) & pool]
    want = getattr(AGAIN, "kind", None)
    show = (MEET.get(sid) or {}).get("show") if level == "watch" else None
    got = kind = None
    for _ in range(12):
        kind = show or (want if any(want in o[2] for o in live) else None)
        if not kind:
            o = rng.choice(live)
            kind = rng.choice([k for k in o[2] if k in pool])
        got = make(kind, rng, stage, sid, None, lambda c, ob, ch: _happen_fits(c, ob, ch, sid, stage, base))
        if got:
            break
    if not got:
        return None
    c, obs, charts = got
    opt = next(o for o in live if kind in o[2])
    nodes = [n for n in walk_nodes(c, obs, charts, sid) if n["id"] not in ("when", "size", "action")]
    spots = list(dict.fromkeys(s for n in nodes for s in n["spots"]))
    return {"case": c, "obs": obs, "charts": charts, "answer": {"what": opt[0]}, "kind": kind,
            "q": {"ask": "What happened?", "options": [[o[0], o[1]] for o in opts], "field": "what"}, "dana": None,
            "why": " ".join(n["why"] for n in nodes), "spots": spots, "hint": {"say": HAPPEN_HINT[base], "spot": spots},
            "walk": [{"say": n["why"], "spot": n["spots"]} for n in nodes] + [{"say": f"So: {opt[1][0].lower() + opt[1][1:]}.", "spot": ["q"], "do": {"what": opt[0]}}]}


def cant(k: str, v: str) -> str:
    """A reading a cause can never produce (lf_proto.CANT), as a clause."""
    lab = LABEL[k].split(" (")[0].lower()
    if k == "main":
        return f"the line couldn't end {v} its normal range"
    return {U: f"{lab} couldn't go up", D: f"{lab} couldn't go down", F: f"{lab} couldn't hold", Z: f"{lab} couldn't fall to almost zero"}[v]


def predicts(cause: str, k: str, obs: dict) -> str:
    """What the cause says about chart k, as a clause, for a chart whose reading rules it out."""
    v = SCRIPT[cause].get(k)
    if k == "emails" and v == ONE and LP.odd_breaks(obs, cause):
        return LP.ODD_SAY[cause]
    if v is None or obs.get(k) in LP.CANT.get(cause, {}).get(k, ()):
        return cant(k, obs[k]) + (f", since {LP.CANT_WHY[cause]}" if cause in LP.CANT_WHY else "")
    return would(k, v)


def shows(obs: dict, cause: str, k: str) -> str:
    """What chart k shows, as a clause. For the Each email table, which way the odd email went when that's what decides it."""
    if k == "emails" and LP.odd_breaks(obs, cause):
        o = obs["odd"]
        bits = [f"its {LABEL[x].lower()} " + ("held" if o[x] == F else f"went {'up' if o[x] == U else 'down'} {pct(o['ch'][x])}")
                for x in LP.ODD[cause] if o.get(x) is not None]
        return f"{o['email']} is the one out of line, and " + " and ".join(bits)
    return is_(k, obs[k])


def contra(obs: dict, cause: str, k: str, sid: str) -> str:
    """One contradiction, in words: what the cause would do to this chart, and what the chart shows."""
    return f"\"{name(cause, sid)}\": {predicts(cause, k, obs)}. On screen, {shows(obs, cause, k)}."


def standout(charts: dict, keys: list[str]) -> str | None:
    """The chart that moved the most, against its own normal. Rule 8 (docs/CURRICULUM.md): a player who checks only this
    chart has to score near chance, so the reps are built so it rarely settles the question on its own."""
    moved = [(abs(charts[k]["ch"]), k) for k in keys if isinstance(charts.get(k), dict) and "ch" in charts[k]]
    return max(moved)[1] if moved else None


def deciders(obs, cause, keys, sid) -> list[str]:
    """The charts that rule a cause out, the step's new chart first, then the tiles, then the main chart and boxes."""
    rank = lambda k: (0 if k in new_keys(sid) else 1 if k not in ("main", "shape", "revenue", "lastweek") else 2, OBS_KEYS.index(k))
    return sorted(rules_out(obs, cause, keys), key=rank)


def _ruleout_text(obs, guess, keys, sid, cleared):
    s = SCRIPT[guess]
    if cleared:
        return " ".join(contra(obs, guess, k, sid) for k in deciders(obs, guess, keys, sid)[:3]) + " So Dana's guess is wrong."
    fit = [is_(k, obs[k]) for k in keys if s.get(k) is not None and obs.get(k) is not None]
    return ("Everything it predicts is on screen: " + ", ".join(fit) + ". Nothing rules it out.") if fit else "Nothing on screen can rule it out yet."


def w_ruleout(sid, rng, stage, level, force: str | None = None):
    keys, pool, new = obs_keys(sid), causes(sid), new_keys(sid)
    want = force or ("cleared" if level == "watch" else rng.choice(["cleared", "possible"]))
    pair = (MEET.get(sid) or {}).get("pair") if level == "watch" else None    # the Meet's case: the new chart does the work
    for _ in range(40):
        truth_c = pick_cause(sid, pool, rng)
        decide = pair and ((MEET[sid].get("decide") or new_keys(sid) or obs_keys(sid)))   # s13: Opens jumps, the charts after it clear the guess
        got = (make(pair[0], rng, stage, sid, None, lambda c, o, ch: bool(rules_out(o, pair[1], decide))) if pair
               else make(pick_kind(truth_c, rng), rng, stage, sid))
        if not got:
            continue
        c, obs, charts = got
        same = [g for g in pool if families(g) & families(c["kind"])]          # guesses that explain the same headline
        if pair:
            same = [pair[1]]
        if want == "possible":
            fits = [g for g in same if not rules_out(obs, g, keys)]
            if not fits:
                continue
            guess = cause_of(c["kind"], sid) if cause_of(c["kind"], sid) in fits and rng.random() < 0.8 else rng.choice(fits)
        else:
            outs = [g for g in same if g != cause_of(c["kind"], sid) and rules_out(obs, g, keys)]
            top = standout(charts, keys)
            if not pair and any(top not in rules_out(obs, g, keys) for g in outs):
                outs = [g for g in outs if top not in rules_out(obs, g, keys)]     # the biggest move agrees with the guess: look further
            if not outs:
                continue
            if new:                                      # prefer guesses that this step's new chart settles
                w = [4 if set(rules_out(obs, g, keys)) <= set(new) else 2 if set(rules_out(obs, g, keys)) & set(new) else 1 for g in outs]
                if level == "watch" and not pair:
                    w = [x if x == max(w) and x > 1 else 0 for x in w]
                    if not any(w):
                        continue
                guess = rng.choices(outs, weights=w)[0]
            else:
                guess = rng.choice(outs)
        cleared = bool(rules_out(obs, guess, keys))
        dk = deciders(obs, guess, keys, sid) or [k for k in keys if SCRIPT[guess].get(k) is not None and obs.get(k) is not None]
        why = _ruleout_text(obs, guess, keys, sid, cleared)
        if not cleared and guess != cause_of(c["kind"], sid):
            why += f" (This time it was \"{name(cause_of(c['kind'], sid), sid).lower()}\", which fits the same charts.)"
        walk = [{"say": f"Dana's guess: \"{name(guess, sid)}\". Before looking, ask what that would do to each chart.", "spot": ["guess"]}]
        for k in dk[:3]:
            walk.append({"say": f"If it were that, {predicts(guess, k, obs)}. On screen, {shows(obs, guess, k)}.", "spot": [spot_of(k)]})
        walk.append({"say": "So Dana's guess is wrong." if cleared else "Nothing contradicts it, so Dana could be right.", "spot": ["q"], "do": {"verdict": "cleared" if cleared else "possible"}})
        return {"case": c, "obs": obs, "charts": charts, "answer": {"verdict": "cleared" if cleared else "possible"}, "kind": c["kind"], "guess": guess,
                "q": {"ask": "Does the screen prove Dana's guess wrong?", "options": [["cleared", "Dana's guess is wrong"], ["possible", "Dana could be right"]], "field": "verdict"},
                "dana": None, "guess_text": name(guess, sid), "why": why, "spots": [spot_of(k) for k in dk],
                "hint": {"say": f"What would \"{name(guess, sid).lower()}\" do to each chart? Check each one.", "spot": [spot_of(k) for k in dk]},
                "walk": walk}
    return None


def spot_of(k: str) -> str:
    return {"main": "end", "shape": "line", "revenue": "revenue", "lastweek": "lastweek", "emails": "emails"}.get(k, "tile-" + k)


ROW_ORDER = ["main", "shape", "revenue", "lastweek", "entered", "delivered", "opens", "clicks", "orders", "order_size", "unsubs", "emails"]
DEFAULT = {"main": IN, "shape": NONE, "revenue": F, "lastweek": F, "emails": SAME}


def w_callit(sid, rng, stage, level):
    keys = obs_keys(sid)
    pool = [c for c in causes(sid) if c != "noise" or rng.random() < 0.4]
    if level == "watch":
        pool = ["fewer_people"] if "fewer_people" in pool else ["entries_drop"] if "entries_drop" in pool else pool
    for _ in range(20):
        cause = pick_cause(sid, pool, rng)
        got = make("entries_drop" if level == "watch" and cause == "fewer_people" else pick_kind(cause, rng), rng, stage, sid)
        if got:
            break
    if not got:
        return None
    c, obs, charts = got
    rows = [k for k in ROW_ORDER if k in keys]
    script = {k: SCRIPT[cause].get(k) for k in rows}
    story = rng.choice(STORY[c["kind"]] if cause in GROUP else STORY[cause])     # a group's story matches the case behind it
    if level == "watch":
        story = "The signup pop-up stopped loading on Tuesday."
    walk = [{"say": f"The cause: \"{story}\" Start every row at held, then change only what this cause moves.", "spot": ["cause"]}]
    for k in rows:
        v = script[k]
        if v is None:
            continue
        reason = WATCH_REASON.get(k, "")
        walk.append({"say": f"{LABEL[k].split(' (')[0]}: {SAY[v]}. {reason}".strip(), "spot": ["row-" + k], "do": {"row": [k, v]}})
    walk.append({"say": "Check it against a real case of this cause.", "spot": ["check"], "do": {"check": True}})
    return {"case": c, "obs": obs, "charts": charts, "answer": {"script": script}, "kind": c["kind"], "cause": cause,
            "q": {"rows": rows, "defaults": {k: DEFAULT.get(k, F) for k in rows}}, "story": story, "dana": None,
            "why": f"\"{name(cause, sid)}\": " + ", ".join(f"{LABEL[k].split(' (')[0].lower()} {SAY[script[k]]}" for k in rows if script[k] is not None) + ".",
            "spots": [], "hint": {"say": "Start from held. Change only the rows this cause would move, and say which way.", "spot": ["rows"]},
            "walk": walk}


def _row_note(cause: str, k: str, sid: str) -> str:
    """Call it: why this cause leaves one chart where it does, shown under a row he got wrong."""
    s = SCRIPT[cause]
    v = s.get(k)
    if v is None:
        return ""
    if s.get("main") == IN and s.get("revenue") == D and k in ("main", "shape", "revenue"):   # fewer people, same spend each
        who = "Fewer people came in" if s.get("entered") == D else "Fewer people got the email"
        return {"main": f"{who}, and each one spent the same. Revenue per recipient is revenue divided by the people who got the email, so it stayed inside its range.",
                "shape": f"This row is the revenue per recipient line, not total revenue. {who}, and each one spent the same, so that line didn't move. The drop shows in Revenue, last 7 days.",
                "revenue": f"{who}, and each one spent the same. Fewer people times the same spend: the total falls."}[k]
    w = would(k, v).replace("the line", "revenue per recipient")    # every Call it row has a line: say which one
    return f"{name(cause, sid)}: {w}."


WATCH_REASON = {   # Call it's Watch always uses the pop-up story: fewer people come in, each one spends as usual
    "main": "Each person who gets an email spends what they always do, so the line stays inside.",
    "shape": "The line doesn't move.", "revenue": "Fewer people times the same spend: the total falls.",
    "lastweek": "The week before was an ordinary week.", "delivered": "Fewer people in means fewer emails out.",
    "entered": "The pop-up is how people come in, so fewer enter.",
}


def _closeness(truth: str, x: str, keys: list[str], obs: dict, rng, top: str | None = None) -> tuple:
    """Sort key for look-alike options: agrees with the biggest move first (rule 8), then shares the most moves."""
    moved = [k for k in keys if SCRIPT[truth].get(k) not in (None, F, SAME, IN, NONE)]
    down = lambda v: D if v == Z else v
    shared = sum(1 for k in moved if down(SCRIPT[x].get(k)) == down(SCRIPT[truth][k]))
    return (-shared if shared else 1, top in rules_out(obs, x, keys), -shared, len(rules_out(obs, x, keys)), rng.random(), x)


def w_lookalike(sid, rng, stage, level):
    keys, pool = obs_keys(sid), [c for c in causes(sid) if c not in GROUP]
    n = 2 if IDX[sid] <= IDX["j1-8"] else 3
    for _ in range(40):
        truth = pick_cause(sid, [c for c in pool if c != "noise"], rng)
        if level == "watch" and "delivery_drop" in pool and IDX[sid] <= IDX["j1-8"]:
            truth = "delivery_drop"
        got = make(truth, rng, stage, sid)
        if not got:
            continue
        c, obs, charts = got
        top = standout(charts, keys)
        cands = sorted(_closeness(truth, x, keys, obs, rng, top) for x in pool if x != truth and rules_out(obs, x, keys))
        cands = [x for x in cands if x[0] < 0]             # must share at least one big move with the truth
        cands.sort(key=lambda x: x[1:])
        if len(cands) < n - 1:
            continue
        near = [x[-1] for x in cands[:n - 1]]
        opts = near + [truth]
        rng.shuffle(opts)
        closest = near[0]
        dk = deciders(obs, closest, keys, sid)
        walk = [{"say": "Every option explains the big move. So the big move can't decide. Look for a chart where they disagree.", "spot": ["opts"]}]
        for k in dk[:2]:
            walk.append({"say": contra(obs, closest, k, sid), "spot": [spot_of(k)]})
        walk.append({"say": f"So it's \"{name(truth, sid).lower()}\".", "spot": ["opt-" + truth], "do": {"pick": truth}})
        walk.append({"say": f"And the proof: {LABEL[dk[0]].split(' (')[0]}.", "spot": [spot_of(dk[0])], "do": {"proof": proof_key(dk[0])}})
        return {"case": c, "obs": obs, "charts": charts, "answer": {"pick": truth}, "kind": truth, "options": opts, "closest": closest,
                "q": {"ask": "Which one fits every chart?"}, "dana": None, "why": "",
                "spots": [], "hint": {"say": "They all explain the big move. Find a chart where they'd disagree.", "spot": [spot_of(k) for k in dk]},
                "walk": walk}
    return None


def proof_key(k: str) -> str:
    return "main" if k in ("main", "shape") else k


def _min_looks(obs, truth, others, free, clues, cap):
    left = [x for x in others if not rules_out(obs, x, free)]
    for n in range(0, cap + 1):
        for combo in combinations(clues, n):
            if all(rules_out(obs, x, list(combo)) or rules_out(obs, x, free) for x in left):
                return n
    return None


def w_suspects(sid, rng, stage, level):
    keys, pool = obs_keys(sid), [c for c in causes(sid) if c not in GROUP]
    free = [k for k in ("main", "shape", "revenue", "lastweek") if k in keys]
    clues = [k for k in keys if k not in free]
    i = IDX[sid]
    n_sus = 3 if i <= IDX["s11"] else 4 if i <= IDX["j9-12"] else 5     # the path meets Suspects at Join 9-12: four suspects, par + 2
    extra_looks = 2 if i <= IDX["j9-12"] else 1
    for _ in range(30):
        truth = pick_cause(sid, [c for c in pool if c != "noise"], rng)      # mostly one of this step's own causes
        fam = rng.choice([f for f in FAMILY if truth in FAMILY[f]] or ["down"])
        fpool = [c for c in pool if c in FAMILY[fam]]
        if len(fpool) < n_sus:
            continue
        got = make(truth, rng, stage, sid)
        if not got:
            continue
        c, obs, charts = got
        others_all = [x for x in fpool if x != truth and rules_out(obs, x, keys)]
        if len(others_all) < n_sus - 1:
            continue
        unsettled = [x for x in others_all if not rules_out(obs, x, free)]
        others = (rng.sample(unsettled, min(len(unsettled), n_sus - 1)) + rng.sample([x for x in others_all if x not in unsettled], max(0, n_sus - 1 - len(unsettled))))[:n_sus - 1]
        if len(others) < n_sus - 1:
            continue
        need = _min_looks(obs, truth, others, free, clues, 3)
        if not need:
            continue
        sus = others + [truth]
        rng.shuffle(sus)
        looks = min(len(clues), need + extra_looks)
        walk = _suspects_walk(obs, truth, others, free, clues, sid)
        first = next((b["do"]["flip"] for b in walk if "flip" in b.get("do", {})), None)
        hint = ({"say": f"Start with {LABEL[first]}: of the face-down cards, it splits the most suspects. Then cross out whoever it rules out.", "spot": ["card-" + first]}
                if first else {"say": "The free charts already settle it. Cross out whoever they rule out.", "spot": ["main", "revenue"]})
        return {"case": c, "obs": obs, "charts": charts, "answer": {"accuse": truth}, "kind": truth, "suspects": sus, "need": need, "looks": looks,
                "free": free, "clues": clues, "q": {"ask": "Who did it?"}, "dana": None, "why": "", "spots": [], "hint": hint, "walk": walk}
    return None


def _suspects_walk(obs, truth, others, free, clues, sid):
    left = list(others)
    gone = [x for x in left if rules_out(obs, x, free)]
    walk = [{"say": "The main chart and the revenue rows are free. First, cross out anyone they already rule out." if gone else
             "The main chart and the revenue rows are free, but every suspect fits them here. So flip a card.", "spot": ["main", "revenue"]}]
    for x in gone:
        walk.append({"say": contra(obs, x, rules_out(obs, x, free)[0], sid) + " Crossed out.", "spot": ["sus-" + x], "do": {"strike": x}})
    left = [x for x in left if x not in gone]
    flipped = []
    while left:
        k = max((y for y in clues if y not in flipped), key=lambda y: sum(1 for s in left if y in rules_out(obs, s, [y])))
        flipped.append(k)
        walk.append({"say": f"Flip {LABEL[k]}: it splits the most suspects still standing.", "spot": ["card-" + k], "do": {"flip": k}})
        out = [s for s in left if rules_out(obs, s, [k])]
        for s in out:
            walk.append({"say": contra(obs, s, k, sid) + " Crossed out.", "spot": ["sus-" + s], "do": {"strike": s}})
        left = [s for s in left if s not in out]
        if len(flipped) > 3:
            break
    walk.append({"say": f"One suspect left: \"{name(truth, sid).lower()}\". Accuse.", "spot": ["sus-" + truth], "do": {"accuse": truth}})
    return walk


def w_action(sid, rng, stage, level):
    pool = [c for c in causes(sid) if c not in GROUP]
    kind = rng.choice(pool)
    if level == "watch":
        kind = "conv_drop_all"
    ok = actions_ok(kind)
    opts = [[k, v] for k, v in LF.ACTIONS.items()]
    return {"case": None, "obs": {}, "charts": {}, "answer": {"action": ok}, "kind": kind,
            "q": {"ask": "What do we do?", "options": opts, "field": "action"}, "cause_text": name(kind, sid), "story": rng.choice(STORY[kind]),
            "dana": None, "why": ACTION_WHY[kind], "spots": [],
            "hint": {"say": "Who can fix this: you, someone else, or nobody?", "spot": ["q"]},
            "walk": [{"say": f"The cause: {name(kind, sid).lower()}.", "spot": ["cause"]},
                     {"say": ACTION_WHY[kind], "spot": ["q"], "do": {"action": ok[0]}}]}


GRADERS: dict = {}           # way -> grader, for ways that grade outside _grade (Level 2's, in lf_path2)
WALKS = ("whole",)           # the walks: one question at a time through check(). Level 7 adds walk7
WAYS = {"band": w_band, "wobble": w_wobble, "start": w_start, "size": w_size, "whole": w_whole, "ruleout": w_ruleout,
        "happened": w_happened, "callit": w_callit, "lookalike": w_lookalike, "suspects": w_suspects, "action": w_action}
STAGE = {"watch": "obvious", "together": "obvious", "guided": "obvious", "solo": "clear", "hard": "realistic",
         "try": "clear"}   # try: the sampler (lf_sampler.py), one rep of a way that never counts toward the path


# ---------------------------------------------------------------- progress
def book(p: dict) -> dict:
    return p.setdefault("path", {}).setdefault("steps", {})


def rounds_log(p: dict) -> list:
    return p.setdefault("path", {}).setdefault("rounds", [])


def entry(p: dict, sid: str) -> dict:
    return book(p).setdefault(sid, {"meet": None, "history": [], "passed": None})


def level_for(p: dict, sid: str) -> str:
    s, e = step(sid), entry(p, sid)
    if meet_of(sid) and not e["meet"]:
        return "watch"
    guided = sum(1 for x in e["history"] if x["level"] == "guided")
    return "guided" if guided < guided_need(sid) else "solo"


def meet_of(sid: str) -> dict | None:
    return MEET.get(sid)


def guided_need(sid: str) -> int:
    return GUIDED if kind_of(step(sid)) == "unit" else 3 if step(sid).get("way_new") else 0


def pass_rule(sid: str) -> tuple[int, int]:
    return PASS["unit" if kind_of(step(sid)) == "unit" else "join"]


def _check_pass(e: dict, sid: str) -> bool:
    n, k = pass_rule(sid)
    solo = [x for x in e["history"] if x["level"] == "solo"][-n:]
    if not e["passed"] and len(solo) >= n and sum(x["ok"] for x in solo) >= k and solo[-1]["ok"]:
        e["passed"] = time.time()
        return True
    return False


def due_step(p: dict, rng: random.Random, level: int = 1) -> str | None:
    """Rounds: weight each passed step by recent misses and time since it was last played (one level's path at a time)."""
    pool = [s["id"] for s in TRACK[level] if not s.get("case") and entry(p, s["id"])["passed"]]
    if not pool:
        return None
    def weight(sid):
        h = entry(p, sid)["history"][-12:]
        miss = sum(1 for x in h if not x["ok"])
        age = (time.time() - h[-1]["at"]) / 3600 if h else 48
        return 1 + 2 * miss + min(age, 72) / 24
    return rng.choices(pool, weights=[weight(s) for s in pool])[0]


# ---------------------------------------------------------------- deal, flip, answer
PENDING: dict[str, dict] = {}
DONE: dict[str, dict] = {}      # answered reps, kept a while with their grade so the coach (lf_coach.py) can talk them over


def _pick_way(sid: str, rng: random.Random, last: str | None, level: str) -> str:
    s = step(sid)
    if level in ("watch", "together"):
        return (meet_of(sid) or {}).get("watch") or next(iter(s["ways"]))
    ways = dict(s["ways"])
    if level == "guided" and s.get("way_new"):              # a join's guided reps are the new way
        return s["way_new"]
    if len(ways) > 1 and last in ways:                       # vary it: not the same way twice in a row
        ways[last] = ways[last] * 0.25
    return rng.choices(list(ways), weights=list(ways.values()))[0]


def _public(sid: str, way: str, r: dict, level: str) -> dict:
    c = r.get("case")
    v = visible(sid)
    charts = {k: x for k, x in (r.get("charts") or {}).items() if k in v or k == "main"}
    if "main" in charts:
        charts["main"] = {k: x for k, x in charts["main"].items() if k != "dots" or "dots" in v}
    if way in ("suspects", "suspects2"):                      # face-down cards come one at a time from flip()
        charts = {k: x for k, x in charts.items() if k in r["free"]}
    dana = r.get("dana")
    msg = (dana.format(flow=c["flow"]["name"]) if dana else c["symptom"]) if c else None
    out = {"step": sid, "way": way, "way_name": WAY_NAME[way], "level": level, "stage": STAGE.get(level, "clear"), "visible": v,
           "show_pct": pos(sid) >= pos(PCT_FROM), "path_level": level_of(sid),
           "q": r["q"], "msg": msg, "hint": r["hint"] if level in ("guided", "together", "try") else None,
           "walk": r.get("walk") if level == "watch" else None, "demo": r["answer"] if level == "watch" else None}
    if c:
        out.update({"flow": c["flow"]["name"], "ftype": c["flow"].get("type"), "emails_n": len(c["flow"]["messages"]),
                    "dates": [d[5:] for d in c["dates"][6:]], "charts": charts})
    for k in ("guess_text", "story", "cause_text", "looks", "need"):
        if k in r:
            out[k] = r[k]
    out.update(r.get("public") or {})                         # Level 2's extras: the log, the email table's columns, the options
    if way == "lookalike":
        out["options"] = [{"kind": k, "cause": name(k, sid)} for k in r["options"]]
    if way in ("lookalike", "lookalike2"):                    # the closest look-alike is never the answer, so it goes to the page only in Watch
        out["closest"] = r["closest"] if level == "watch" else None
    if way == "suspects":
        out["suspects"] = [{"kind": k, "cause": name(k, sid)} for k in r["suspects"]]
        out["free"], out["clues"] = r["free"], r["clues"]
    return out


READ_WAYS = ("band", "wobble", "start", "size", "whole", "happened")
LEVEL1_WAYS = READ_WAYS + ("ruleout", "callit", "lookalike", "suspects", "action")   # the sampler may deal any of these at any Level 1 step
BY_ANSWER = ("band", "wobble", "start", "size")    # a missed one-chart reading comes back as the same answer. The rest come back as the same cause


def _again_key(way: str, d: dict):
    """What makes a missed rep the same one again: its answer for the one-chart readings, its cause for the rest."""
    if way in BY_ANSWER:
        return json.dumps(d["answer"].get(d["q"].get("field")))
    return d["kind"]


def _same_rep(r: dict, way: str, again: dict) -> bool:
    return way == again["way"] and _again_key(way, r) == again["key"]


def deal(sid: str, level: str | None = None, way: str | None = None) -> dict:
    p = LF.progress()
    rounds = sid.startswith("rounds")
    level = level if level in STAGE else None
    rng = random.Random(random.randrange(10**9))
    if rounds:
        real = due_step(p, rng, int(sid[6:]) if sid[6:].isdigit() and int(sid[6:]) in TRACK else 1)
        if not real:
            return {"error": "Rounds open once you've passed a step."}
        level = "solo" if len(rounds_log(p)) < 12 else "hard"
    else:
        if sid not in STEP or step(sid).get("case"):
            return {"error": f"No step called {sid}."}
        real = sid
        level = level or level_for(p, sid)
    e = entry(p, real)
    hist = e["history"]
    way = way if level == "try" and way in LEVEL1_WAYS and level_of(real) == 1 else _pick_way(real, rng, hist[-1]["way"] if hist else None, level)
    again = next((x for x in e.get("again", []) if len(hist) >= x["due"]), None) if not rounds and level in ("guided", "solo", "hard") else None
    if again:                                                  # a miss comes back two reps later: same cause, same way, a fresh case
        e["again"].remove(again)
        LF.save_progress(p)
        if again["way"] in step(real)["ways"] and (level != "guided" or not step(real).get("way_new") or again["way"] == step(real)["way_new"]):
            way = again["way"]
    r = None
    AGAIN.kind = again["key"] if again and way == again["way"] and way not in BY_ANSWER else None   # its cause comes back for sure
    try:
        for i in range(20 if again else 4):                    # a reading rep's answer (a shape, a size) comes back by retrying
            r = WAYS[way](real, rng, STAGE[level], level)
            if r and (not again or _same_rep(r, way, again) or i >= 19):
                break
    finally:
        AGAIN.kind = None
    if not r:
        return {"error": "Couldn't deal that one. Try again."}
    rid = uuid.uuid4().hex[:12]
    PENDING[rid] = {"step": real, "way": way, "level": level, "rounds": rounds, "flipped": [], **r}
    while len(PENDING) > 200:
        PENDING.pop(next(iter(PENDING)))
    return {"rid": rid, "rounds": rounds, **_public(real, way, r, level)}


def flip(rid: str, card: str) -> dict:
    d = PENDING.get(rid)
    if not d or d["way"] not in ("suspects", "suspects2"):
        return {"error": "That one expired."}
    if card not in d["clues"]:
        return {"error": "No such card."}
    if card not in d["flipped"]:
        if len(d["flipped"]) >= d["looks"]:
            return {"error": "No looks left.", "flipped": d["flipped"]}
        d["flipped"].append(card)
    return {"card": card, "chart": d["charts"].get(card), "flipped": d["flipped"], "left": d["looks"] - len(d["flipped"])}


STOP_LEVELS = ("together", "guided", "solo", "try")      # Hard and Watch never stop him


def sus_stop(rid: str, struck: list, accuse: str | None = None) -> dict:
    """Suspects, before a move (Brent's ask, 2026-10-15). A flip stops when what's on screen already rules out a suspect he
    hasn't crossed out. An accusation stops when what's on screen already rules out the one he accuses (accusing the right
    one with the others ruled out but not crossed out goes through: he had the proof). Says how many, never which.
    {"stop": False} lets the move through."""
    d = PENDING.get(rid)
    if not d or d["way"] != "suspects" or d["level"] not in STOP_LEVELS:
        return {"stop": False}
    seen, truth = d["free"] + d["flipped"], d["answer"]["accuse"]
    left = [k for k in d["suspects"] if k not in struck and k != truth and k != accuse and rules_out(d["obs"], k, seen)]
    bad = bool(accuse) and accuse != truth and bool(rules_out(d["obs"], accuse, seen))
    if not bad and (accuse or not left):
        return {"stop": False}
    d["stops"] = d.get("stops", 0) + 1
    n = len(left)
    more = f"{'And it' if bad else 'It'} also rules out {n} suspect{'s' if n > 1 else ''} you haven't crossed out." if n else ""
    if bad:
        say = f"Hold on. What you can already see rules out that suspect. Which chart does it? {more}".strip()
    else:
        say = (f"Hold on. What you can already see rules out {n} suspect{'s' if n > 1 else ''} you haven't crossed out. "
               f"Check each one against the main chart{', the revenue rows and the cards you turned' if d['flipped'] else ' and the revenue rows'}: what would it have shown there?")
    return {"stop": True, "n": n, "accused_out": bad, "say": say}


CARD_NAME = {"main": "The main chart", "shape": "The main chart", "revenue": "The Revenue row", "lastweek": "The week before", "emails": "The Each email table"}


def _sus_why(d: dict, s: str, seen: list[str]) -> dict:
    """Why a suspect is out: the chart on screen that rules it out, or the face-down card that would have."""
    obs, sid = d["obs"], d["step"]
    card = lambda k: CARD_NAME.get(k) or f"The {LABEL[k]} card"
    on = deciders(obs, s, seen, sid)
    if on:
        return {"card": on[0], "seen": True, "say": f"{card(on[0])} already ruled it out. If it were that, {predicts(s, on[0], obs)}. On screen, {shows(obs, s, on[0])}."}
    k = next((x for x in deciders(obs, s, d["clues"], sid) if x not in seen), None)
    if not k:
        return {"card": None, "seen": False, "say": ""}
    return {"card": k, "seen": False, "say": f"{card(k)} would have settled it. If it were that, {predicts(s, k, obs)}. It shows {shows(obs, s, k)}."}


def _grade(d: dict, body: dict) -> dict:
    if d["way"] in GRADERS:
        return GRADERS[d["way"]](d, body)
    way, ans, obs, sid = d["way"], d["answer"], d["obs"], d["step"]
    keys = obs_keys(sid)
    out = {"why": d["why"], "spots": d["spots"], "answer": {k: v for k, v in ans.items() if k != "script"}}
    if way in ("band", "wobble", "happened"):
        f = d["q"]["field"]; out["ok"] = body.get(f) == ans[f]
    elif way == "size":
        out["ok"] = size_ok(str(body.get("size")), d["size_v"])
    elif way == "start":
        so, do = body.get("shape") == ans["shape"], _day_ok(d["case"], ans["shape"], body.get("day"))
        out.update({"ok": so and do, "parts": {"shape": so, "day": do}})
    elif way == "whole":                          # every question on the walk, graded from what the page sends at the end
        parts = {n["id"]: _node_ok(d, n, body) for n in d["nodes"]}
        out.update({"ok": all(parts.values()), "parts": parts, "part_names": {k: NODE_NAME[k] for k in parts}})
    elif way == "ruleout":
        out["ok"] = body.get("verdict") == ans["verdict"]
        out["guess"] = d["guess"]
    elif way == "callit":
        guess = body.get("guess") or {}
        marks = {k: (None if v is None else guess.get(k) == v) for k, v in ans["script"].items()}
        scored = [k for k, v in marks.items() if v is not None]
        dflt = d["q"]["defaults"]
        out.update({"ok": all(marks[k] for k in scored), "marks": marks, "script": ans["script"], "obs": {k: obs.get(k) for k in ans["script"]},
                    "notes": {k: _row_note(d["cause"], k, sid) for k in scored if not marks[k]},
                    "moves": [k for k in scored if ans["script"][k] != dflt[k]], "holds": [k for k in scored if ans["script"][k] == dflt[k]]})
    elif way == "lookalike":
        pick, proof = body.get("pick"), body.get("proof")
        rejected = body.get("rule_out") if body.get("rule_out") in d["options"] and body.get("rule_out") != pick else d["closest"]
        proof_keys = sorted({proof_key(k) for k in rules_out(obs, rejected, keys)})
        out.update({"ok": pick == ans["pick"] and proof in proof_keys, "guessed": pick == ans["pick"] and proof not in proof_keys,   # solved means proven
                    "pick": pick, "proof": proof, "proof_ok": proof in proof_keys, "rejected": rejected, "proof_keys": proof_keys,
                    "why_not": {k: sorted({proof_key(x) for x in rules_out(obs, k, keys)}) for k in d["options"] if k != ans["pick"]},
                    "why_text": {k: [contra(obs, k, x, sid) for x in deciders(obs, k, keys, sid)[:2]] for k in d["options"] if k != ans["pick"]},
                    "scripts": {k: {x: SCRIPT[k].get(x) for x in keys} for k in d["options"]}})
    elif way == "suspects":
        flipped = d["flipped"]
        struck = [k for k in body.get("struck", []) if k in d["suspects"]]
        seen = d["free"] + flipped
        truth = ans["accuse"]
        strikes = [{"kind": k, "fair": bool(rules_out(obs, k, seen)) and k != truth} for k in struck]
        left = [k for k in d["suspects"] if k != truth and not rules_out(obs, k, seen)]
        best, rest = [], [k for k in d["suspects"] if k != truth and not rules_out(obs, k, d["free"])]
        while rest and len(best) < len(d["clues"]):
            k = max((x for x in d["clues"] if x not in best), key=lambda x: sum(1 for s in rest if rules_out(obs, s, [x])))
            best.append(k); rest = [s for s in rest if not rules_out(obs, s, d["free"] + best)]
        right = body.get("accuse") == truth          # an accusation counts once nothing else fits what you saw: a lucky one is a guess
        acc = body.get("accuse") if body.get("accuse") in d["suspects"] else None
        out.update({"still_why": {k: _sus_why(d, k, seen) for k in left},                       # what would have split each one that still fit
                    "accused_why": _sus_why(d, acc, seen) if acc and not right else None, "stops": d.get("stops", 0)})
        out.update({"ok": right and not left, "guessed": right and bool(left), "accused": body.get("accuse"), "strikes": strikes, "still_fit": left, "best": best, "need": d["need"],
                    "looks": len(flipped), "charts": {k: d["charts"].get(k) for k in d["clues"]},
                    "why_not": {k: rules_out(obs, k, keys) for k in d["suspects"] if k != truth},
                    "free_out": [k for k in d["suspects"] if k != truth and rules_out(obs, k, d["free"])]})
    elif way == "action":
        out["ok"] = body.get("action") in ans["action"]
    k = d["kind"]
    if way not in ("band", "size"):
        g = cause_of(k, sid)
        lesson, term = GROUP_LESSON[g] if g in GROUP_LESSON else EARLY_LESSON[k] if k in EARLY_LESSON and pos(sid) < pos("s11") else LF.LESSONS[k]
        out.update({"kind": k, "cause": name(g, sid), "name": "Fewer people" if g in GROUP else LF.FILE_NAMES.get(k), "lesson": lesson, "term": term,
                    "met": g in causes(sid)})          # a cause's lesson shows only once its step has introduced it
    out.update({"say": SAY, "labels": {k_: LABEL[k_] for k_ in OBS_KEYS}, "obs": obs if way in ("lookalike", "suspects", "callit") else None})
    return out


def answer(rid: str, body: dict) -> dict:
    d = PENDING.get(rid)
    if d is None:
        return {"error": "That one expired. Here's a fresh one."}
    out = _grade(d, body)
    level = d["level"]
    if level == "together" and not out["ok"] and d["way"] not in ("suspects", "lookalike", "callit", "suspects2", "lookalike2"):
        return {"ok": False, "retry": True}                    # Together: try again, it doesn't count (and the answer stays here)
    DONE[rid] = {**PENDING.pop(rid, d), "graded": out}
    while len(DONE) > 50:
        DONE.pop(next(iter(DONE)))
    p = LF.progress()
    newly = []
    if level in ("guided", "solo", "hard"):
        e = entry(p, d["step"])
        e["history"].append({"ok": bool(out["ok"]), "ms": int(body.get("ms") or 0), "way": d["way"], "kind": d["kind"], "stage": STAGE[level],
                             "level": level, "at": time.time(), "rounds": d["rounds"]})
        if not d["rounds"] and _check_pass(e, d["step"]):
            newly.append(d["step"])
        if not d["rounds"] and not out["ok"]:
            e.setdefault("again", []).append({"key": _again_key(d["way"], d), "way": d["way"], "due": len(e["history"]) + 1})
        if d["rounds"]:
            rounds_log(p).append({"ok": bool(out["ok"]), "at": time.time(), "step": d["step"]})
    LF.save_progress(p)
    return {**out, "newly_passed": newly, "summary": summary(LF.progress(), level_of(d["step"]))}


def meet_done(sid: str) -> dict:
    p = LF.progress()
    if sid in STEP:
        entry(p, sid)["meet"] = entry(p, sid)["meet"] or time.time()
        LF.save_progress(p)
    return summary(LF.progress(), level_of(sid) if sid in STEP else 1)


# ---------------------------------------------------------------- summary
def casebook(p: dict) -> list[dict]:
    met = {}
    for sid, e in book(p).items():
        if sid not in IDX:
            continue
        named = {k for c in causes(sid) for k in kinds(c)}     # a reading rep on conv_drop_all at step 1 hasn't met it yet
        for x in e.get("history", []):
            if x.get("ok") and x["kind"] in named and x.get("way") not in ("band", "size"):
                met[x["kind"]] = met.get(x["kind"], 0) + 1
    for d in LD.ORDER:                                         # cards earned in the first mini-games still count
        for x in p.get("drills", {}).get(d, {}).get("history", []):
            if x.get("ok"):
                met[x["kind"]] = met.get(x["kind"], 0) + 1
    solved = set((p.get("level1") or {}).get("solved", []))
    return [{"kind": k, "name": LF.FILE_NAMES[k], "term": LF.LESSONS[k][1], "met": met.get(k, 0), "solved": k in solved, "cause": NAME[k],
             "open": k in met or k in solved, **({"story": v[0], "moves": v[1], "holds": v[2], "first": v[3]} if k in met or k in solved else {})}
            for k, v in LD.CASEBOOK.items()]


def summary(p: dict, level: int = 1) -> dict:
    level = level if level in TRACK else 1
    today = time.mktime(date.today().timetuple())
    out, cur = [], None
    track = TRACK[level]
    for s in track:
        sid = s["id"]
        if s.get("case"):
            L = p.get(f"level{level}", {})
            done = bool(L.get("done"))
            status = "done" if done else "cur" if cur is None else "locked"
            if status == "cur":
                cur = sid
            out.append({"id": sid, "part": s["part"], "n": s.get("n"), "title": s["title"], "type": "case", "status": status,
                        "solved": len(L.get("solved", [])), "played": L.get("played", 0), "meet": bool(p.get("level0", {}).get("done") or L.get("played"))})
            continue
        e = entry(p, sid)
        h = e["history"]
        status = "done" if e["passed"] else "cur" if cur is None else "locked"
        if status == "cur":
            cur = sid
        n, k = pass_rule(sid)
        solo = [x for x in h if x["level"] == "solo"]
        hard = [x for x in h if x["level"] == "hard"][-HARD_STAR[0]:]
        out.append({"id": sid, "part": s["part"], "n": s.get("n"), "title": s["title"], "type": kind_of(s), "status": status, "ways": list(s["ways"]),
                    "way_new": s.get("way_new"), "new": s.get("new"), "adds": s.get("adds", []), "meet": bool(e["meet"]) or not meet_of(sid), "has_meet": bool(meet_of(sid)),
                    "level": level_for(p, sid), "guided_left": max(0, guided_need(sid) - sum(1 for x in h if x["level"] == "guided")),
                    "reps": len(h), "right": sum(x["ok"] for x in h), "last": [x["ok"] for x in solo[-n:]], "rule": [n, k],
                    "star": len(hard) >= HARD_STAR[0] and sum(x["ok"] for x in hard) >= HARD_STAR[1], "today": sum(1 for x in h if x["at"] >= today)})
    plain = [s for s in track if not s.get("case")]
    rows = [x for s in plain for x in entry(p, s["id"])["history"] if x["at"] >= today]
    rt = [x["ms"] for x in rows if x["ok"]]
    rlog = [x for x in rounds_log(p) if level_of(x.get("step", "s1")) == level]
    rounds_today = sum(1 for x in rlog if x["at"] >= today)
    passed_before = any(entry(p, s["id"])["passed"] and entry(p, s["id"])["passed"] < today for s in plain)
    cur_i = next((i for i, s in enumerate(track) if s["id"] == cur), len(track))
    have = visible(track[min(cur_i, len(track) - 1)]["id"])     # the step he's on already shows its new chart
    if level > 1:
        have = [k for s in track for k in s.get("adds", []) if k in have]    # Level 1's charts are all there already
    coming = [k for s in track[cur_i + 1:] for k in s.get("adds", [])][:2]
    last_join = [s["id"] for s in plain][-1]
    return {"level": level, "title": TITLE[level], "steps": out, "next": cur, "parts": PARTS_OF[level], "meet": MEET, "way_names": WAY_NAME,
            "units": sum(1 for s in track if s.get("n")), "case_step": next((s["id"] for s in track if s.get("case")), None),
            "have": have, "coming": coming,
            "cases_open": any(s.get("case") for s in track) and (bool(entry(p, last_join if level > 1 else "s15")["passed"]) or bool(p.get(f"level{level}", {}).get("played"))),
            "rounds_due": passed_before and rounds_today < ROUNDS_REPS, "rounds_reps": ROUNDS_REPS, "rounds_today": rounds_today,
            "casebook": casebook(p), "today": {"reps": len(rows), "right": sum(x["ok"] for x in rows), "median_ms": int(statistics.median(rt)) if rt else None},
            "keys": p.get("keys", {}), "labels": {k: LABEL[k] for k in OBS_KEYS}}


import lf_path2  # noqa: E402,F401  (registers Level 2's steps, Meets and ways)
import lf_path7  # noqa: E402,F401  (registers Level 7's)
