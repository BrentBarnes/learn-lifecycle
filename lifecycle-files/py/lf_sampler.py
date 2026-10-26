"""The sampler: one rep of every way to play, each followed by three taps, so Brent can say which ones teach.

Brent, 2026-10-14: "give me one of each game type so that I can play it and figure out which one actually teaches me
something, which one actually makes sense, and which one gets me through Level 1 the quickest while learning the most."
The reps are dealt at level "try" (lf_path.STAGE: the clear stage, the hint on request) and never touch the path's or
the modes' history. Only the ratings are kept, under progress["sampler"]. docs/SKILL-MAP.md says what they decide.
"""
from __future__ import annotations

import time

import lifecycle_files as LF
import lf_path as P
import lf_modes as M

STATIONS = [   # one per way to play. "needs": the step that teaches everything it asks, ruleout to the charts it can use
    {"id": "read", "name": "Read it", "kind": "path", "needs": "s3", "way": "start",
     "what": "One question about the main chart. This one: click the day the move started, then name its shape.",
     "trains": "Reading one chart: real or wobble, since when, what shape, how big"},
    {"id": "whole", "name": "Read the whole chart", "kind": "path", "needs": "j1-4", "way": "whole",
     "what": "One question at a time, down the whole dashboard: what happened to revenue, then since when, how big, and on down the branch your answer opens.",
     "trains": "The first read of any alert, start to finish"},
    {"id": "happened", "name": "What happened", "kind": "path", "needs": "s6", "way": "happened",
     "what": "Read the line and the revenue boxes, then say what happened: fewer people got the emails, each person spent less, or nothing real.",
     "trains": "Splitting a revenue move into people and revenue per person"},
    {"id": "ruleout", "name": "Rule it out", "kind": "path", "needs": "s5", "way": "ruleout",
     "what": "Dana names one cause. Does the screen prove him wrong, or could he be right?",
     "trains": "Testing one guess against the charts"},
    {"id": "callit", "name": "Call it", "kind": "path", "needs": "j5-6", "way": "callit",
     "what": "You get a cause in words and say what each chart would do. Then the real case appears next to your calls.",
     "trains": "Knowing what each failure moves and what it leaves alone"},
    {"id": "lookalike", "name": "Look-alikes", "kind": "path", "needs": "j7-8", "way": "lookalike",
     "what": "Two causes fit the first look. Pick the one it is, then click the chart that rules out the other.",
     "trains": "The one chart that tells two causes apart"},
    {"id": "suspects", "name": "Suspects", "kind": "path", "needs": "s8", "way": "suspects",
     "what": "Most charts are face down, and each flip costs a look. Cross out causes as charts rule them out, then accuse one.",
     "trains": "Which chart to check first"},
    {"id": "action", "name": "What to do", "kind": "path", "needs": "s15", "way": "action",
     "what": "You get the cause in words. Pick what happens next: fix it today, escalate, test a change, watch it, or leave it.",
     "trains": "Turning a diagnosis into the next step"},
    {"id": "wait", "name": "Call it or wait", "kind": "mode", "mode": "wait", "needs": "s2",
     "what": "A flow's chart fills in one morning at a time. Call it the day the line breaks, not before and not after.",
     "trains": "When a dip is enough to act on"},
    {"id": "objection", "name": "Objection!", "kind": "mode", "mode": "objection", "needs": "j5-6",
     "what": "Someone posts a read of a case in a few lines. Find the wrong line, then click the chart that proves it.",
     "trains": "Checking a diagnosis against the screen"},
]
BY_ID = {s["id"]: s for s in STATIONS}
ANSWERS = {"taught": ("yes", "bit", "no"), "sense": ("yes", "mostly", "no"), "more": ("yes", "maybe", "no")}


def store(p: dict) -> dict:
    return p.setdefault("sampler", {"ratings": []})


WAY_HOME = {"start": "s3", "whole": "j1-4", "happened": "s6", "ruleout": "s5", "callit": "j5-6", "lookalike": "j7-8", "suspects": "j9-12", "action": "s15",
            "wait": "s2", "objection": "j5-6"}   # where the path introduces each way, with its Meet


def _label(sid: str) -> str:
    s = P.step(sid)
    if s.get("n"):
        return f"Step {s['n']}"
    a, b = (int(x) for x in sid[1:].split("-"))
    return f"Join {a}+{b}" if b - a == 1 else f"Join {a}-{b}"


def _passed(p: dict, sid: str) -> bool:
    return bool((P.book(p).get(sid) or {}).get("passed"))


def deal_step(p: dict, st: dict) -> str | None:
    """The step a station deals from: his own furthest step, so every chart and cause in it is one he has covered.
    None while the station needs a step he hasn't passed (it stays locked)."""
    if not _passed(p, st["needs"]):
        return None
    return M.base_step(p) if st["kind"] == "path" else st["needs"]


def summary(p: dict) -> dict:
    rs = store(p)["ratings"]
    out = []
    for st in STATIONS:
        mine = [r for r in rs if r["station"] == st["id"]]
        way = st.get("way") or st["mode"]
        home = WAY_HOME[way]
        new = not _passed(p, home)                          # a way he hasn't met: the intro explains how it works
        out.append({**{k: st[k] for k in ("id", "name", "kind", "what", "trains")}, "way": st.get("way"), "mode": st.get("mode"),
                    "step": deal_step(p, st), "locked": deal_step(p, st) is None, "opens_after": P.step(st["needs"])["title"],
                    "opens_label": _label(st["needs"]),
                    "new_way": new, "how": (P.MEET.get(home) or {}).get("intro") if new else None,
                    "plays": len(mine), "last": mine[-1] if mine else None})
    open_ = [s for s in out if not s["locked"]]
    return {"stations": out, "open": len(open_), "rated": sum(1 for s in open_ if s["plays"]), "ratings": rs}


def rate(body: dict) -> dict:
    sid = str(body.get("station", ""))
    if sid not in BY_ID:
        return {"error": "No such way to play."}
    r = {"station": sid, "at": time.time(), "ok": bool(body.get("ok")), "ms": int(body.get("ms") or 0), "hint": bool(body.get("hint")),
         "note": str(body.get("note") or "")[:600]}
    for k, allowed in ANSWERS.items():
        v = body.get(k)
        if v not in allowed:
            return {"error": "Answer all three first."}
        r[k] = v
    p = LF.progress()
    store(p)["ratings"].append(r)
    LF.save_progress(p)
    return summary(LF.progress())
