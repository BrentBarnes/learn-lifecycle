"""The teaching layer of Lifecycle Files: skills and mastery, hint pathways, and how mistakes are named and answered.

Where each idea comes from (details in games/lifecycle-files/docs/TUTORING.md):
  Skills + mastery    Bayesian Knowledge Tracing, the model in pyBKT and OATutor. Each skill has a probability you know
                      it, updated after every answer with the four BKT numbers (prior, learn, guess, slip). OATutor's
                      defaults are 0.1 for all four; guess is raised here where the answer list is short.
  Picking the case    OATutor's heuristic: a case's mastery is the product of its skills' masteries; play the lowest one
                      still under 0.85, ties broken at random.
  Hints               OATutor's hint pathways: hint → scaffold (a small question checked against the screen) → hint →
                      bottom-out. Opening a hint means that step earns no mastery credit (OATutor's "OnOpen" mode).
  Naming the mistake  Bridge (Wang et al., NAACL 2024): experts first name the error, then pick a strategy and an
                      intention. Their 700 annotated conversations give the strategy each error type usually gets.
  Tutor moves         MathDial (Macina et al., 2023): teachers who focus and probe before telling get students to fix
                      their own mistakes. Used in the coaching skill.
"""
from __future__ import annotations
import json, math, random
from pathlib import Path

SKILLS = {
    "signal": "Is it real: signal or noise",
    "baseline": "Choosing the right comparison week",
    "outlier": "Spotting a one-off outlier",
    "opens": "Not trusting opens on their own",
    "sizing": "Putting dollars on it",
    "localize": "Where: one email or the whole flow",
    "dating": "Since when: a step or a slope",
    "volume_rate": "People vs rate (entered, delivered)",
    "click_vs_after": "The email vs after the click",
    "order_size": "How many orders vs how big",
    "list_health": "Unsubscribes as a cost",
    "action": "Matching the action to the cause",
    "evidence": "Opening the proof before concluding",
    "matching_change": "Matching a change to the effect it can cause",
    "red_herring": "Ruling out changes that couldn't cause it",
    "external_cause": "Looking outside the flow when nothing in it changed",
    "dollars_not_percent": "Following the dollars, not the percent",
    "shared_cause": "Telling a shared cause from one flow's",
    "alert_reading": "Reading alerts for chance",
    "inbox_placement": "Inbox vs delivered: the spam folder counts as delivered",
    "config_vs_reputation": "Setup, reputation, or the list",
    "list_hygiene": "Who you send to, and how often",
    "postmaster": "Checking Gmail's own numbers (Postmaster)",
    "credit_vs_cash": "Credit moving vs money lost (attribution)",
    "skip_reasons": "Reading why emails were skipped",
    "frequency_cost": "What more sends cost the list",
    "stacking": "Messages stacking on the same person",
    "timing_window": "Send day against the buying window",
    "censoring": "Reading only cohorts that have had the time",
    "cohort_mix": "A weak month: the flows or who came in",
    "median_not_mean": "Timing to the median, not the average",
}
# BKT numbers. Guess = the chance of being right without knowing it, so it follows the length of the answer list.
DEFAULT = {"prior": 0.1, "learn": 0.15, "slip": 0.1, "guess": 0.1}
GUESS = {"signal": 0.33, "action": 0.25, "localize": 0.3, "volume_rate": 0.15, "click_vs_after": 0.15, "order_size": 0.15,
         "list_health": 0.15, "opens": 0.2, "baseline": 0.33, "outlier": 0.33, "sizing": 0.1, "dating": 0.1, "evidence": 0.1,
         "matching_change": 0.15, "red_herring": 0.15, "external_cause": 0.15,
         "dollars_not_percent": 0.15, "shared_cause": 0.25, "alert_reading": 0.33,
         "inbox_placement": 0.15, "config_vs_reputation": 0.25, "list_hygiene": 0.25, "postmaster": 0.33,
         "credit_vs_cash": 0.33, "skip_reasons": 0.25, "frequency_cost": 0.25, "stacking": 0.2,
         "timing_window": 0.25, "censoring": 0.33, "cohort_mix": 0.25, "median_not_mean": 0.33}
MASTERED = 0.85            # OATutor's mastery threshold

MOVED_SKILL = {"entered": "volume_rate", "delivered": "volume_rate", "clicks": "click_vs_after", "orders": "click_vs_after",
               "order_size": "order_size", "unsubs": "list_health", "opens": "opens", None: "signal",
               "bounces": "config_vs_reputation", "complaints": "list_hygiene"}
REAL_EXTRA = {"black_friday": "baseline", "big_order": "outlier", "mpp_opens": "opens", "volume_mix": "volume_rate"}


def params(fitted: dict | None = None) -> dict:
    out = {}
    for k in SKILLS:
        p = dict(DEFAULT, guess=GUESS.get(k, 0.1))
        if fitted and k in fitted:
            p.update(fitted[k])
        out[k] = p
    return out


def update(p_know: float, correct: bool, p: dict) -> float:
    """One BKT step (the same equations as OATutor's BKT-brain.js and pyBKT's forward pass)."""
    if correct:
        num, other = p_know * (1 - p["slip"]), (1 - p_know) * p["guess"]
    else:
        num, other = p_know * p["slip"], (1 - p_know) * (1 - p["guess"])
    given = num / (num + other) if num + other else p_know
    return given + (1 - given) * p["learn"]


def skills_for(case: dict) -> dict[str, list[str]]:
    """Which skills each report step exercises in this case."""
    t = case["truth"]
    kind = t.get("base") or t["kind"]            # Level 2 cases: the pattern underneath decides the Level 1 skills
    out = {"real": ["signal"] + ([REAL_EXTRA[kind]] if kind in REAL_EXTRA else []), "action": ["action"]}
    if t["real"] != "nothing" and t["money"]:
        out["big"] = ["sizing"]
    if t["where"]:
        out["where"] = ["localize"]
    if t["since"]:
        out["since"] = ["dating"]
    out["moved"] = [MOVED_SKILL.get(t["moved"], "signal")]
    if t["moved"] or t["where"] not in (None, "flow") or case.get("changes"):
        out["search"] = ["evidence"]
    if case.get("changes"):
        import lf_level2 as LV2
        out["cause"] = LV2.SKILL_EXTRA.get(t["kind"], ["matching_change"])
    if case.get("timing_level"):                # Level 6: timing and cohorts carry the new skills
        import lf_level6 as LV6
        extra = LV6.SKILLS[t["kind"]]
        out["real"] = out["real"] + [k for k in extra if k in ("censoring", "baseline", "cohort_mix", "timing_window", "median_not_mean")]
        if t["where"]:
            out["where"] = ["localize"] + [k for k in extra if k in ("timing_window", "cohort_mix", "median_not_mean")]
        out["cause"] = ["matching_change"]
        out["search"] = ["evidence"]
        return out
    if case.get("pressure"):                    # Level 5: real or credit, and which stream, carry the new skills
        import lf_level5 as LV5
        extra = LV5.SKILLS[t["kind"]]
        out["real"] = out["real"] + [k for k in extra if k in ("credit_vs_cash", "baseline", "volume_rate", "skip_reasons")]
        if t["where"]:
            out["where"] = ["localize"] + [k for k in extra if k in ("stacking", "frequency_cost")]
        out["cause"] = [k for k in extra if k in ("skip_reasons", "stacking", "frequency_cost")] or ["matching_change"]
        out["search"] = ["evidence"]
        return out
    if case.get("providers"):                   # Level 4: which provider, and which kind of cause, carry the new skills
        import lf_level4 as LV4
        extra = LV4.SKILLS[t["kind"]]
        out["real"] = out["real"] + [k for k in extra if k in ("postmaster", "opens")]
        if t["where"]:
            out["where"] = ["localize"] + [k for k in extra if k == "inbox_placement"]
        out["cause"] = [k for k in extra if k in ("config_vs_reputation", "list_hygiene")] or ["matching_change"]
        out["search"] = ["evidence"]
        return out
    if case.get("program"):                     # Level 3: picking the flow (or the program) carries the new skills
        import lf_level3 as LV3
        extra = LV3.SKILLS[t["kind"]]
        out["real"] = out["real"] + [k for k in extra if k == "alert_reading"]
        out["where"] = ["localize"] + [k for k in extra if k != "alert_reading"]
        out["search"] = ["evidence"]
    return out


def kind_skills(kind: str) -> list[str]:
    """Skills a case type usually exercises, for picking the next case without building one."""
    import lf_level2 as LV2, lf_level3 as LV3, lf_level4 as LV4
    if kind in LV4.TYPES:
        return ["signal", "action", "localize"] + LV4.SKILLS[kind] + ["evidence"]
    import lf_level5 as LV5, lf_level6 as LV6
    if kind in LV6.TYPES:
        return ["signal", "action", "localize"] + LV6.SKILLS[kind] + ["evidence"]
    if kind in LV5.TYPES:
        return ["signal", "action", "localize"] + LV5.SKILLS[kind] + ["evidence"]
    if kind in LV3.TYPES:
        return ["signal", "action", "sizing", "localize"] + LV3.SKILLS[kind] + ["evidence"]
    if kind in LV2.TYPES:
        return [k for k in kind_skills(LV2.BASE[kind]) if k != "evidence"] + LV2.SKILL_EXTRA[kind] + ["evidence"]
    if kind == "opens_one":
        return ["signal", "action", "opens", "evidence"]
    if kind in ("email_stopped", "email_late"):
        return ["signal", "action", "volume_rate", "localize", "sizing", "dating", "evidence"]
    base = {"entries_drop": ["volume_rate", "sizing", "dating"], "delivery_drop": ["volume_rate", "sizing", "dating"],
            "click_drop_one": ["click_vs_after", "localize", "sizing"], "conv_drop_all": ["click_vs_after", "sizing", "dating"],
            "conv_drop_one": ["click_vs_after", "localize", "sizing"], "aov_drop": ["order_size", "sizing"],
            "unsub_spike": ["list_health", "localize"], "mpp_opens": ["opens"], "noise": ["signal"], "black_friday": ["baseline"],
            "good_news": ["click_vs_after", "localize"], "volume_mix": ["volume_rate"], "slow_slide": ["dating", "click_vs_after"],
            "big_order": ["outlier", "order_size"], "tracking_break": ["click_vs_after", "action"]}[kind]
    return ["signal", "action"] + base + ["evidence"]


def observe(prog: dict, case: dict, grade: dict, hinted_steps: set[str], fitted: dict | None = None) -> list[dict]:
    """Turn a graded case into skill observations and update mastery. A hinted step counts as not known (OnOpen)."""
    P = params(fitted)
    m = prog.setdefault("mastery", {k: P[k]["prior"] for k in SKILLS})
    obs = prog.setdefault("obs", [])
    by_step = {s["step"]: s for s in grade["steps"]}
    seen = []
    for step, skills in skills_for(case).items():
        if step == "search":
            ok = grade["search"]["found"]
        elif step in by_step and not by_step[step]["na"]:
            ok = by_step[step]["ok"]
        else:
            continue
        hinted = step in hinted_steps
        if hinted:
            ok = False
        for k in skills:
            before = m.get(k, P[k]["prior"])
            m[k] = round(update(before, ok, P[k]), 4)
            obs.append({"case": case["id"], "kind": case["truth"]["kind"], "stage": case.get("stage"), "skill": k, "correct": int(ok)})
            seen.append({"skill": k, "label": SKILLS[k], "ok": ok, "hinted": hinted, "before": before, "after": m[k]})
    return seen


def case_mastery(kind: str, m: dict) -> float:
    return math.prod(m.get(k, DEFAULT["prior"]) for k in kind_skills(kind))


def pick(kinds: list[str], m: dict, rng=random) -> str:
    """OATutor's default heuristic: lowest product of skill masteries still below the threshold; ties at random."""
    scored = [(case_mastery(k, m), k) for k in kinds]
    under = [s for s in scored if s[0] < MASTERED] or scored
    low = min(s[0] for s in under)
    return rng.choice([k for s, k in under if abs(s - low) < 1e-9])


# ---------------------------------------------------------------- hint pathways (OATutor style)
def _series_change(case: dict, tile: str) -> float:
    msgs = case["flow"]["messages"]
    tot = lambda key, a, b: sum(sum(case["by_message"][m["id"]][key][a:b]) for m in msgs)
    if tile == "entered":
        return (sum(case["entered"][-7:]) / max(1, sum(case["entered"][:28]) / 4)) - 1
    num = {"delivered": "delivered", "opens": "opens", "clicks": "clicks", "orders": "orders", "unsubs": "unsubs", "order_size": "revenue"}[tile]
    den = {"delivered": None, "order_size": "orders"}.get(tile, "delivered")
    if den is None:
        return tot(num, 49, 56) / max(1, tot(num, 0, 28) / 4) - 1
    a = tot(num, 0, 28) / max(1, tot(den, 0, 28)); b = tot(num, 49, 56) / max(1, tot(den, 49, 56))
    return b / a - 1 if a else 0


def direction(x: float) -> str:
    return "down" if x < -0.08 else "up" if x > 0.08 else "flat"


def pathway(case: dict) -> list[dict]:
    """Four items, in order: hint, scaffold, hint, bottom-out. The scaffold's answer comes from the case's own numbers,
    so it can be checked, and its choices are the same short list every time."""
    t = case["truth"]
    if case.get("timing_level"):
        import lf_level6 as LV6
        k, h = t["kind"], t["hints"]
        return [{"type": "hint", "text": h[0]},
                {"type": "scaffold", "text": "Open Timing and Cohorts. Which of these is it?", "choices": LV6.SHAPE_CHOICES,
                 "answer": LV6.SHAPE[k], "explain": LV6.SHAPE_EXPLAIN[LV6.SHAPE[k]]},
                {"type": "hint", "text": h[1]},
                {"type": "hint", "text": "Now the log: is there a change on the day it started? A timing gap that was there all along has no start date."},
                {"type": "bottomOut", "text": h[2]}]
    if case.get("pressure"):
        import lf_level5 as LV5
        k, h = t["kind"], t["hints"]
        return [{"type": "hint", "text": h[0]},
                {"type": "scaffold", "text": "Open the Credit split and the Registry. Which of these happened?", "choices": LV5.SPREAD_CHOICES,
                 "answer": LV5.SPREAD[k], "explain": LV5.SPREAD_EXPLAIN[LV5.SPREAD[k]]},
                {"type": "hint", "text": h[1]},
                {"type": "hint", "text": "Now the log: a change on (or just before) the start that changes who gets what, or how often. If it only explains the movement and nothing is wrong, say so."},
                {"type": "bottomOut", "text": h[2]}]
    if case.get("providers"):
        import lf_level4 as LV4
        k, h = t["kind"], t["hints"]
        return [{"type": "hint", "text": h[0]},
                {"type": "scaffold", "text": "Open the provider table. Against each provider's own normal, is the change at one provider, several, all of them, or none?",
                 "choices": ["one provider", "several", "all of them", "none of them"], "answer": LV4.SPREAD[k],
                 "explain": {"one provider": "One provider carries it: that provider's own filters or limits, or its own subscribers.",
                             "several": "Some providers and not others: look at how they differ (business domains and Outlook share blocklists, Gmail doesn't).",
                             "all of them": "Every provider moved together: the cause is on your side (setup, content, who you sent to).",
                             "none of them": "No provider is outside its own normal now."}[LV4.SPREAD[k]]},
                {"type": "hint", "text": h[1]},
                {"type": "scaffold", "text": "What kind of cause is it?", "choices": LV4.CAUSE_KINDS, "answer": LV4.CAUSE_KIND[k],
                 "explain": LV4.CAUSE_EXPLAIN[LV4.CAUSE_KIND[k]]},
                {"type": "bottomOut", "text": h[2]}]
    if case.get("program"):
        k = t["kind"]
        ans = ("all of them" if t["where"] == "program" and k != "mix_shift" else "several flows" if k in ("two_problems", "offsetting")
               else "none of them" if t["where"] in (None, "program") else "one flow")
        h = t["hints"]
        return [{"type": "hint", "text": h[0]},
                {"type": "scaffold", "text": "Open the Registry. Against each flow's own normal, is the change in one flow, several, all of them, or none?",
                 "choices": ["one flow", "several flows", "all of them", "none of them"], "answer": ans,
                 "explain": {"one flow": "One flow carries it.", "several flows": "More than one flow moved, so weigh them by dollars.",
                             "all of them": "Every flow moved together: look for what they share.",
                             "none of them": "No flow is outside its own normal: the total moved without anything breaking."}[ans]},
                {"type": "hint", "text": h[1]}, {"type": "bottomOut", "text": h[2]}]
    tile = t["moved"] or "clicks"
    label = {"entered": "Entered the flow", "delivered": "Got the email", "opens": "Opens", "clicks": "Clicks", "orders": "Orders",
             "order_size": "Order size", "unsubs": "Unsubscribes"}[tile]
    if t["kind"] in ("noise", "black_friday", "big_order"):
        b = case["band"]
        rev, dl = [sum(sum(case["by_message"][m["id"]][k][-7:]) for m in case["flow"]["messages"]) for k in ("revenue", "delivered")]
        last = rev / max(1, dl)
        ans = "below" if last < b["lo"] else "above" if last > b["hi"] else "inside"
        scaffold = {"type": "scaffold", "text": "Look at the main chart. Is the last 7 days below, inside, or above the gray normal range?",
                    "choices": ["below", "inside", "above"], "answer": ans,
                    "explain": f"It's {ans} the range (${last:.2f} against ${b['lo']:.2f}-${b['hi']:.2f})."}
    else:
        ch = _series_change(case, tile)
        ans = direction(ch)
        scaffold = {"type": "scaffold", "text": f"Open {label}. Against its normal level, is it down, flat, or up?",
                    "choices": ["down", "flat", "up"], "answer": ans,
                    "explain": f"{label} is {ans} ({ch * 100:+.0f}% against normal). " + ("That's the branch that moved." if ans != "flat" else "So it isn't this branch.")}
    h = t["hints"]
    items = [{"type": "hint", "text": h[0]}, scaffold, {"type": "hint", "text": h[1]}, {"type": "bottomOut", "text": h[2]}]
    if case.get("changes"):                       # Level 2: check the mechanism before the answer
        import lf_level2 as LV2
        cause = next((c for c in case["changes"] if c["id"] == t.get("cause")), None)
        if cause and cause["kind"] in LV2.CATEGORY:
            label2 = label if t["moved"] else "it"
            items.insert(3, {"type": "scaffold", "text": f"What kind of change could move {label2.lower()} like this?",
                             "choices": LV2.CATEGORIES, "answer": LV2.CATEGORY[cause["kind"]],
                             "explain": f"{LV2.CATEGORY[cause['kind']].capitalize()}. Now look in Changes for one of those on or just before the start day."})
        else:
            items.insert(3, {"type": "hint", "text": "Does any change both land when it started and touch the part that moved? If none does, the answer can be 'None of these'."})
    return items


def classify_cause(case: dict, said: str, opened: list[str]) -> str:
    """Bridge's error types for "which change": a guess without the log open, the right day but the wrong part (right
    idea), or the wrong change altogether."""
    t = case["truth"]
    if "changes" not in opened:
        return "guess"
    pick = next((c for c in case.get("changes", []) if c["id"] == said), None)
    right = next((c for c in case.get("changes", []) if c["id"] == t["cause"]), None)
    if pick and right and pick["date"] == right["date"]:
        return "right-idea"
    return "misinterpret"


HINT_STEPS = {0: {"real", "moved"}, 1: {"moved"}, 2: {"moved", "where"}, 3: {"moved", "where", "since", "cause"}, 4: {"moved", "where", "since", "cause"}}


def hinted_steps(n_opened: int) -> set[str]:
    out = set()
    for i in range(n_opened):
        out |= HINT_STEPS.get(i, set())
    return out


# ---------------------------------------------------------------- naming the mistake (Bridge)
# Bridge's error types, and the strategy its expert teachers used most often for each (counts from the 700 conversations)
STRATEGY = {
    "guess": ("explain_concept", "understand_topic"),
    "misinterpret": ("ask_question", "clarify_misunderstanding"),
    "right-idea": ("provide_hint", "hint_mistake"),
    "imprecise": ("affirm_correct_answer", "elaborate_answer"),
    "careless": ("provide_correction", "correct_mistake"),
}
SIBLINGS = [{"entered", "delivered"}, {"clicks", "orders"}, {"bounces", "delivered"}, {"complaints", "unsubs"}]
STEP_TILE = {"moved": None, "where": "messages"}


def classify(case: dict, step: dict, opened: list[str]) -> str:
    """Name the error the way Bridge's experts do, from what was answered and what was opened."""
    t, k, said = case["truth"], step["step"], step.get("said_raw")
    if k == "cause":
        return classify_cause(case, said, opened)
    if k == "big":
        g, m = float(said or 0), t["money"] or 0
        if m and g and (abs(g * 7 - m) <= 0.25 * m or abs(g / 7 - m) <= 0.25 * m or abs(g / 10 - m) <= 0.2 * m or abs(g * 10 - m) <= 0.2 * m):
            return "careless"              # a day for a week, or a slipped zero
        if m and g and abs(g - m) <= 1.0 * m:
            return "imprecise"
        return "guess" if not opened else "misinterpret"
    if k == "since":
        from datetime import date
        if said in (None, "", "none") or not t["since"]:
            return "misinterpret"          # said there's no start date when there is one
        if abs((date.fromisoformat(said) - date.fromisoformat(t["since"])).days) <= 7:
            return "imprecise"
        return "misinterpret"
    if k == "moved":
        if any({said, t["moved"]} <= s for s in SIBLINGS):
            return "right-idea"            # the right family (people, or the email-vs-after-the-click pair), wrong leaf
        return "misinterpret" if t["moved"] in opened else "guess"
    if k == "where":
        if case.get("program"):
            if said == "program" or t["where"] == "program":
                return "right-idea"
            return "misinterpret" if "registry" in opened else "guess"
        if said in ("flow", "before", "every") or t["where"] == "flow":       # before / every: Level 1's split of the whole flow
            return "right-idea"
        return "misinterpret" if "messages" in opened else "guess"
    if k == "real":
        return "misinterpret" if opened else "guess"
    if k == "action":
        return "right-idea" if said in ("fix_today", "escalate") and set(t["actions"]) & {"fix_today", "escalate"} else "misinterpret"
    return "guess"


def respond(case: dict, step: dict, error: str, opened: list[str]) -> dict:
    """A short reply in the strategy Bridge's experts use for this error: the question comes first, the answer stays folded."""
    t, k = case["truth"], step["step"]
    strat, why = STRATEGY[error]
    label = {"entered": "Entered the flow", "delivered": "Got the email", "opens": "Opens", "clicks": "Clicks", "orders": "Orders",
             "order_size": "Order size", "unsubs": "Unsubscribes"}
    where_tile = label.get(t["moved"], "the main chart")
    if case.get("timing_level") and k == "where":
        return {"error": error, "strategy": strat, "intention": why, "lead": {"explain_concept": "The idea first.", "ask_question": "A question first.",
                "provide_hint": "You're close.", "affirm_correct_answer": "Nearly there.", "provide_correction": "Small slip."}[strat],
                "question": {"guess": "Is it a timed flow (Timing shows each one against its window) or one month's customers (Cohorts)?",
                             "misinterpret": "If one month came back less, did the flows change, or did the customers who came in that month?",
                             "right-idea": "One flow, or one cohort?"}.get(error, "What do Timing and Cohorts say?")}
    if case.get("pressure") and k == "where":
        return {"error": error, "strategy": strat, "intention": why, "lead": {"explain_concept": "The idea first.", "ask_question": "A question first.",
                "provide_hint": "You're close.", "affirm_correct_answer": "Nearly there.", "provide_correction": "Small slip."}[strat],
                "question": {"guess": "Which stream changed against its own normal: a flow, the SMS, or the campaigns? The Registry shows each one.",
                             "misinterpret": "Is the stream that lost revenue the one that changed, or did it just lose the credit to another?",
                             "right-idea": "One stream, or several at once from the same change?"}.get(error, "What does the Registry say?")}
    if case.get("providers") and k == "where":
        return {"error": error, "strategy": strat, "intention": why, "lead": {"explain_concept": "The idea first.", "ask_question": "A question first.",
                "provide_hint": "You're close.", "affirm_correct_answer": "Nearly there.", "provide_correction": "Small slip."}[strat],
                "question": {"guess": "Which provider moved against its own normal? The provider table shows each one.",
                             "misinterpret": "In the provider table, is it one provider out of line, or every provider together?",
                             "right-idea": "Did one provider move, or all of them on the same day?"}.get(error, "What does the provider table say?")}
    if case.get("program") and k == "where":
        return {"error": error, "strategy": strat, "intention": why, "lead": {"explain_concept": "The idea first.", "ask_question": "A question first.",
                "provide_hint": "You're close.", "affirm_correct_answer": "Nearly there.", "provide_correction": "Small slip."}[strat],
                "question": {"guess": "Which flow carries the dollars? The Registry shows each one against its own normal.",
                             "misinterpret": "In the Registry, which flow's revenue moved most against its normal, in dollars?",
                             "right-idea": "Did one flow move, or all of them together?"}.get(error, "What does the Registry say?")}
    q4 = {
        ("real", "guess"): "Before deciding, is any provider outside its own normal in the last 7 days? And what does Postmaster say for Gmail?",
        ("real", "misinterpret"): "Is it still happening this week? Is the Postmaster spike on a day Gmail got much email? Did Apple's clicks move with its opens?",
        ("moved", "guess"): "Did the provider refuse the email, or accept it and file it away? One shows in Bounces, the other in Clicks.",
        ("moved", "misinterpret"): "Delivered holds even when mail goes to spam. Which line actually moved at that provider: bounces, clicks or complaints?",
        ("moved", "right-idea"): "Right family. Of the two, which one moved first, and which one is the consequence?",
        ("cause", "guess"): "What does the Sending log show on, or just before, the day it started?",
        ("cause", "misinterpret"): "Is that change setup, reputation or the list? Can it move what moved, on the day it moved?",
        ("cause", "right-idea"): "Right day. Which of that day's changes touches what a provider sees: DNS, headers, links, who you sent to, how much?",
        ("action", "misinterpret"): "Setup gets fixed today. The list gets suppressed and tested. A provider's own limits get slowed down and escalated. Which is this?",
        ("big", "guess"): "Is the account's revenue below its normal range? If it's inside, the cost this week is $0.",
        ("big", "misinterpret"): "The account card has it: a normal week against the last 7 days, but only when it's below the range.",
    } if case.get("providers") else {
        ("real", "guess"): "Before deciding, did the total move, or only the flows? The Credit split shows both.",
        ("real", "misinterpret"): "Is the total below its normal range? Is the Skipped reason Smart Sending or a filter? Are the people already on the list clicking less, or only the new ones?",
        ("moved", "guess"): "Did fewer people enter, or did fewer get the message? Entries and Got the email answer that.",
        ("moved", "misinterpret"): "Entries steady and fewer emails sent means skipped. More sends and the list shrinking means unsubscribes. Which one is this?",
        ("moved", "right-idea"): "Right family. Which one moved first, and which one followed?",
        ("cause", "guess"): "What does the log show on, or just before, the start: the calendar, a filter, a segment, the SMS?",
        ("cause", "misinterpret"): "Could that change touch who gets what, or how often, on the day it moved?",
        ("cause", "right-idea"): "Right day. Which of that day's changes touches the stream that moved?",
        ("action", "misinterpret"): "A broken filter or setting gets fixed today. A cadence question gets a test. Credit moving gets left alone. Which is this?",
        ("big", "guess"): "Is the total below its normal range? If only the credit moved, it's $0.",
        ("big", "misinterpret"): "Size it on the total against a normal week, not on the flow line: part of a flow drop can be credit.",
    } if case.get("pressure") else {
        ("real", "guess"): "Before deciding: is any timed flow outside its window, and is any full cohort cell below the same month last year?",
        ("real", "misinterpret"): "Has that cohort had the full 90 days? Was last year's same month the same? How many customers are in it?",
        ("since", "misinterpret"): "Did it change on a day, or has it been outside its window all along? The log says whether anything moved.",
        ("action", "misinterpret"): "A send day outside its window gets a test. A delay someone changed gets put back. A weak cohort from a promo goes to whoever owns promos.",
        ("big", "guess"): "Did anything change this week on the chart? If it's been like this all along, only a test can size it.",
        ("cause", "guess"): "What does the log show on the day it started?",
    } if case.get("timing_level") else {}
    q = q4.get((k, error)) or {
        ("real", "guess"): "Before deciding, where would you see whether this week is outside normal: the line for each person, or the Revenue row for the total?",
        ("real", "misinterpret"): "Check the line and the Revenue row: is either outside normal, and is it the kind of week (small flow, Black Friday, one big order) that wobbles?",
        ("moved", "guess"): f"Which tile would show it? Try opening {where_tile} and the tile next to it in the chain.",
        ("moved", "misinterpret"): f"You opened {where_tile}. Is it down, flat, or up against normal?",
        ("moved", "right-idea"): "Right branch. Of the two in that pair, which one moved first?",
        ("where", "guess"): "Is it every email, or one? The email table answers that in one look.",
        ("where", "misinterpret"): "In the email table, which row's per-recipient fell furthest from its 'from' number?",
        ("where", "right-idea"): "Did the emails themselves change, or did fewer people reach them? And if the emails changed, every one or only one?",
        ("big", "careless"): "Check the unit: is your figure for a day, or for a week?",
        ("big", "imprecise"): "Right idea. Which per-recipient numbers did you subtract, and times how many people?",
        ("big", "guess"): "Normal per recipient minus last week's, times the people who got an email. What does that give?",
        ("big", "misinterpret"): "Was it fewer people or a lower rate? That decides which sum to use.",
        ("since", "imprecise"): "Close. Find the last day the line was still flat, then the first day it wasn't.",
        ("since", "misinterpret"): "Look at the whole 8 weeks: is it a sudden step or a slow slope?",
        ("action", "right-idea"): "Can you fix this yourself today, or does someone else own it?",
        ("cause", "guess"): "What does the change log say happened on that day?",
        ("cause", "right-idea"): "Right day. Which of that day's changes can touch the part that moved?",
        ("cause", "misinterpret"): "Does that change land when it started, and could it move that number at all?",
        ("action", "misinterpret"): "Given what moved, is this something to fix, test, or leave alone?",
    }.get((k, error), "What on the screen would tell you?")
    lead = {"explain_concept": "The idea first.", "ask_question": "A question first.", "provide_hint": "You're close.",
            "affirm_correct_answer": "Nearly there.", "provide_correction": "Small slip."}[strat]
    return {"error": error, "strategy": strat, "intention": why, "lead": lead, "question": q}
