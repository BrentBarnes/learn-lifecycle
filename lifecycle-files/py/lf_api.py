"""The game's /api/lf/* routes as one function, for the public build: the page runs this engine in the browser through
Pyodide and its fetch shim calls route() instead of a server (games/shared/PUBLIC-RELEASE.md, public/static-api.js).
The Marketing QA server keeps its own copy of these routes. Not here: the coach, voice, On a call, narration
(Brent's machine only: they answer 404 or 503, and the page hides them).

    route(method, path, query_json, body_json) -> json string {"status": int, "body": ...}
"""
from __future__ import annotations

import json

import lifecycle_files as LF
import lf_drills as LD
import lf_modes as LMODES
import lf_path as LPATH
import lf_proto as LP
import lf_sampler as LSAMP


def _get(p: str, q: dict):
    if p == "/api/lf/progress": return LF.progress()
    if p == "/api/lf/drills": return LD.summary(LF.progress())
    if p == "/api/lf/modes": return LMODES.summary(LF.progress())
    if p == "/api/lf/sampler": return LSAMP.summary(LF.progress())
    if p == "/api/lf/path":
        lv = str(q.get("level") or "1")
        return LPATH.summary(LF.progress(), int(lv) if lv.isdigit() and int(lv) in LPATH.TRACK else 1)
    return None


def _post(p: str, b: dict):
    s = lambda k: str(b.get(k, ""))
    routes = {
        "/api/lf/new": lambda: LF.new_session(int(b.get("level", 1)), b.get("kind"), b.get("stage")),
        "/api/lf/event": lambda: (LF.log(b["session"], b.get("type", "event"), b.get("detail") or {}), {"ok": True})[1],
        "/api/lf/hint": lambda: LF.hint(b["session"], int(b.get("n", 0))),
        "/api/lf/scaffold": lambda: LF.scaffold(b["session"], int(b.get("n", 1)), s("answer")),
        "/api/lf/submit": lambda: LF.submit(b["session"], b.get("report") or {}, float(b.get("minutes", 0))),
        "/api/lf/drill/rep": lambda: LD.deal(str(b.get("drill", LD.ORDER[0]))),
        "/api/lf/drill/answer": lambda: LD.answer(s("rid"), s("choice"), int(b.get("ms", 0))),
        "/api/lf/path/deal": lambda: LPATH.deal(s("step"), b.get("level") or None, b.get("way") or None),
        "/api/lf/path/flip": lambda: LPATH.flip(s("rid"), s("card")),
        "/api/lf/path/stop": lambda: LPATH.sus_stop(s("rid"), b.get("struck") or [], b.get("accuse")),
        "/api/lf/path/check": lambda: LPATH.check(s("rid"), b.get("i"), b),
        "/api/lf/path/answer": lambda: LPATH.answer(s("rid"), b),
        "/api/lf/path/meet": lambda: LPATH.meet_done(s("step")),
        "/api/lf/modes/deal": lambda: LMODES.deal(s("mode"), b.get("level") or None),
        "/api/lf/modes/day": lambda: LMODES.day(s("rid")),
        "/api/lf/modes/answer": lambda: LMODES.answer(s("rid"), b),
        "/api/lf/modes/meet": lambda: LMODES.meet_done(s("mode")),
        "/api/lf/sampler/rate": lambda: LSAMP.rate(b),
        "/api/lf/proto/deal": lambda: LP.deal(str(b.get("game", "suspects"))),
        "/api/lf/proto/answer": lambda: LP.answer(s("rid"), b),
        "/api/lf/keys": lambda: LD.save_keys(b.get("keys") or {}),
        "/api/lf/level0": _level0,
    }
    fn = routes.get(p)
    return fn() if fn else None


def _level0():
    b = _level0.body
    p_ = LF.progress(); p_["level0"]["done"] = p_["level0"]["done"] or bool(b.get("done"))
    p_["level0"]["drill_best"] = max(p_["level0"].get("drill_best", 0), int(b.get("drill", 0))); LF.save_progress(p_)
    return p_


def route(method: str, path: str, query_json: str = "{}", body_json: str = "{}") -> str:
    q, b = json.loads(query_json or "{}"), json.loads(body_json or "{}")
    _level0.body = b
    LF.PROFILE.set(q.get("profile") if q.get("profile") in LF.PROFILES else "")   # the office's own save, as on the server
    if path in ("/api/lf/tts",) or path.startswith(("/api/lf/coach", "/api/lf/voice", "/api/lf/call")):
        return json.dumps({"status": 503, "body": {"error": "not in the public version"}})
    try:
        out = _get(path, q) if method == "GET" else _post(path, b)
    except Exception as e:      # the page shows its own error; the message helps a bug report
        return json.dumps({"status": 500, "body": {"error": f"{type(e).__name__}: {e}"}})
    return json.dumps({"status": 404, "body": {"error": "not found"}} if out is None else {"status": 200, "body": out}, default=str)
