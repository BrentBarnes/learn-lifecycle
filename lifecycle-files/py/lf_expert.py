"""An expert player for Lifecycle Files that only uses what is on the screen, never the answer key.

It walks the six questions with plain rules (band check, which tile moved, one email or all, the change day). The
solvability test runs it on fresh cases of every type: if it can't solve a type from the screen, the type is unfair.
"""
import statistics as st
import lifecycle_files as L

def sums(c, key, a, b, mid=None):
    ms = c["flow"]["messages"] if mid is None else [m for m in c["flow"]["messages"] if m["id"] == mid]
    if key == "entered": return sum(c["entered"][a:b])
    return sum(sum(c["by_message"][m["id"]][key][a:b]) for m in ms)

def rate(c, num, den, a, b, mid=None):
    d = sums(c, den, a, b, mid); return sums(c, num, a, b, mid) / d if d else 0

def chg(c, num, den=None, mid=None):
    if den is None:
        return sums(c, num, 49, 56, mid) / max(1, sums(c, num, 0, 28, mid) / 4) - 1
    a = rate(c, num, den, 0, 28, mid); return (rate(c, num, den, 49, 56, mid) / a - 1) if a else 0

def change_day(series, lo=7, hi=None):
    """The day that best splits the series into a before and an after (biggest gap in means)."""
    hi = hi or len(series) - 3; best, bd = -1, None
    for d in range(lo, hi):
        a, b = series[:d], series[d:]
        g = abs(st.mean(b) - st.mean(a)) * (len(a) * len(b)) ** 0.5
        if g > best: best, bd = g, d
    return bd

def daily(c, num, den, mid=None):
    out = []
    for d in range(56):
        dn = sums(c, den, d, d + 1, mid); out.append(sums(c, num, d, d + 1, mid) / dn if dn else 0)
    return out

def solve(c):
    b = c["band"]; msgs = [m["id"] for m in c["flow"]["messages"]]
    last = rate(c, "revenue", "delivered", 49, 56)
    weekly = [sums(c, "revenue", i, i + 7) for i in range(0, 56, 7)]
    base_w = sum(weekly[:4]) / 4
    ce, cd = chg(c, "entered"), (rate(c, "delivered", "entered", 49, 56) if False else None)
    del_ratio = (sums(c, "delivered", 49, 56) / max(1, sums(c, "entered", 49, 56))) / (sums(c, "delivered", 0, 28) / max(1, sums(c, "entered", 0, 28))) - 1
    co, cc, cr, cs, cu = chg(c, "opens", "delivered"), chg(c, "clicks", "delivered"), chg(c, "orders", "delivered"), chg(c, "revenue", "orders"), chg(c, "unsubs", "delivered")
    rev_day = [sums(c, "revenue", d, d + 1) for d in range(49, 56)]
    msg_rpr = {m: chg(c, "revenue", "delivered", m) for m in msgs}
    msg_cl = {m: chg(c, "clicks", "delivered", m) for m in msgs}; msg_or = {m: chg(c, "orders", "delivered", m) for m in msgs}
    msg_un = {m: chg(c, "unsubs", "delivered", m) for m in msgs}
    def one(d, thr=-0.25):            # one email clearly worse (or better) than the others
        k = min(d, key=d.get) if thr < 0 else max(d, key=d.get); others = [v for m, v in d.items() if m != k]
        ok = (d[k] < thr and all(v > d[k] / 2.5 for v in others)) if thr < 0 else (d[k] > thr and all(v < d[k] / 2.5 for v in others))
        return k if ok and len(d) > 1 else None
    R = {"real": "nothing", "big": 0, "where": "", "since": "none", "moved": "nothing", "action": "watch"}
    dates = c["dates"]
    def since_of(series): d = change_day(series, 21); return dates[d] if d is not None else "none"   # steps land in the last five weeks
    um = one(msg_un, 1.5)
    if um and msg_un[um] > 1.5:
        R.update(real="problem", where=um, moved="unsubs", action="fix_today", since=since_of(daily(c, "unsubs", "delivered", um))); return R
    sent = {m: sums(c, "delivered", 49, 56, m) / max(1, sums(c, "delivered", 0, 28, m) / 4) - 1 for m in msgs}
    sm = min(sent, key=sent.get)
    if len(msgs) > 1 and sent[sm] < -0.85 and all(v > -0.3 for m, v in sent.items() if m != sm):    # one email stopped going out
        lost = sums(c, "revenue", 0, 28, sm) / 4 - sums(c, "revenue", 49, 56, sm)
        dd = [sums(c, "delivered", d, d + 1, sm) for d in range(56)]
        R.update(real="problem", where=sm, moved="delivered", action="fix_today", big=lost, since=since_of(dd)); return R
    if co > 0.25 and abs(cc) < 0.12 and abs(cr) < 0.15 and b["lo"] <= last <= b["hi"] * 1.05:
        R.update(moved="opens", action="leave"); return R
    if ce < -0.15:
        R.update(real="problem", where="flow", moved="entered", action="fix_today", big=base_w - weekly[-1], since=since_of(c["entered"])); return R
    if ce > 0.5 and weekly[-1] >= base_w * 0.9:
        R.update(where="flow", moved="entered", since=since_of(c["entered"])); return R
    if del_ratio < -0.12:
        dd = [sums(c, "delivered", d, d + 1) for d in range(56)]
        R.update(real="problem", where="flow", moved="delivered", action="escalate", big=base_w - weekly[-1], since=since_of(dd)); return R
    if max(rev_day) > 2.2 * st.median(rev_day) and last > b["hi"]:
        R.update(moved="order_size", action="leave"); return R
    if b["lo"] <= last <= b["hi"]:
        return R          # noise, or the Black Friday comparison (both: nothing, watch/leave)
    dl = sums(c, "delivered", 49, 56); big = abs(b["mid"] - last) * dl
    if last > b["hi"]:
        m = one(msg_rpr, 0.25); mm = m or "flow"
        R.update(real="good", where=mm, moved="clicks", action="leave", big=big, since=since_of(daily(c, "clicks", "delivered", m))); return R
    if cr < -0.8:
        R.update(real="problem", where="flow", moved="orders", action="escalate", big=big, since=since_of(daily(c, "orders", "delivered"))); return R
    if cs < -0.12 and abs(cr) < 0.12:
        R.update(real="problem", where="flow", moved="order_size", action="escalate", big=big, since=since_of(daily(c, "revenue", "orders"))); return R
    mc, mo = one(msg_cl), one(msg_or)
    if mc:
        R.update(real="problem", where=mc, moved="clicks", action="fix_today", big=big, since=since_of(daily(c, "clicks", "delivered", mc))); return R
    if mo and abs(msg_cl[mo]) < 0.15:
        R.update(real="problem", where=mo, moved="orders", action="fix_today", big=big, since=since_of(daily(c, "orders", "delivered", mo))); return R
    if cc < -0.15:          # everything's clicks fell: a slope or a step?
        cl = daily(c, "clicks", "delivered"); d = change_day(cl, 7, 40)
        R.update(real="problem", where="flow", moved="clicks", action="test", big=big, since=dates[d]); return R
    R.update(real="problem", where="flow", moved="orders", action="escalate", big=big, since=since_of(daily(c, "orders", "delivered"))); return R


# ---------------------------------------------------------------- Level 2: which change explains it
def _days(a, b):
    from datetime import date
    return (date.fromisoformat(a) - date.fromisoformat(b)).days


def solve_cause(c, R):
    """Read the change log the way the lesson teaches: on or just before the start day, touching the part that moved,
    on the email (or the level) where it moved. A stock-out touches the email featuring that product."""
    import lf_level2 as LV2
    if R["real"] == "nothing" and R["moved"] in ("nothing", "order_size") and R["where"] in ("", None):
        return "none"                                   # nothing to explain (noise, the calendar, one big order)
    since = R["since"] if R["since"] not in ("", "none") else None
    feats = {m["id"]: m.get("features", "") for m in c["flow"]["messages"]}
    best, score = "none", 0
    for ch in c["changes"]:
        touches = R["moved"] in LV2.MECH.get(ch["kind"], [])
        if not touches:
            continue
        near = since is None or -3 <= _days(ch["date"], since) <= 1
        if not near:
            continue
        w = ch["where"]
        place = (w == R["where"]) or (R["where"] in ("flow", "", None) and w in ("flow", "store", "klaviyo")) \
            or (ch["kind"] == "stock" and feats.get(R["where"], "_") in ch["what"])
        sc = 2 * place + (since is not None and abs(_days(ch["date"], since)) <= 1)
        if place and sc > score:
            best, score = ch["id"], sc
    if R["moved"] == "opens" and best == "none":         # a subject line behind an open jump
        best = next((ch["id"] for ch in c["changes"] if ch["kind"] == "subject"), "none")
    return best


ACTION_BY_CAUSE = {"offer": "fix_today", "filter": "fix_today", "content": "fix_today", "sending": "fix_today", "product": "fix_today", "onoff": "fix_today", "timing": "fix_today",
                   "stock": "fix_today", "checkout": "escalate", "integration": "escalate"}


def solve2(c):
    R = solve(c)
    if c.get("changes"):
        R["cause"] = solve_cause(c, R)
        ch = next((x for x in c["changes"] if x["id"] == R["cause"]), None)
        if ch and R["real"] == "problem" and ch["kind"] in ACTION_BY_CAUSE:
            R["action"] = ACTION_BY_CAUSE[ch["kind"]]          # once the cause is known, the action follows from who owns it
    return R


# ---------------------------------------------------------------- Level 3: the whole program
def solve3(c):
    """Read every flow the Level 1 way (what the flow view shows), then: everything moving together is a shared cause;
    otherwise follow the dollars, real problems before good news; nothing outside its range means nothing wrong
    (unless the program's average fell while a low earner grew: mix)."""
    flows = c["flows"]
    reads = []
    for f in flows:
        r = solve(f)
        t = L.totals(f); base_w = sum(t["revenue"][:28]) / 4; last = sum(t["revenue"][49:56])
        reads.append({"fid": f["fid"], "r": r, "dollars": last - base_w, "f": f})
    probs = [x for x in reads if x["r"]["real"] == "problem"]
    moved = [x["r"]["moved"] for x in probs]
    common = max(set(moved), key=moved.count) if moved else None
    R = {"real": "nothing", "big": 0, "where": "", "since": "none", "moved": "nothing", "action": "watch"}
    if common and moved.count(common) >= 4:
        sinces = sorted(x["r"]["since"] for x in probs if x["r"]["moved"] == common and x["r"]["since"] not in ("", "none"))
        R.update(real="problem", where="program", moved=common, since=sinces[len(sinces) // 2] if sinces else "none",
                 big=sum(abs(x["dollars"]) for x in probs if x["r"]["moved"] == common), action="escalate")
        return R
    pool = probs or [x for x in reads if x["r"]["real"] == "good"]
    if pool:
        x = max(pool, key=lambda x: abs(x["dollars"]))
        R.update(x["r"]); R["where"] = x["fid"]
        return R
    # no flow broken: did the program's average fall because a low-earning flow grew?
    dl = lambda a, b: sum(sum(L.totals(f)["delivered"][a:b]) for f in flows)
    rev = lambda a, b: sum(sum(L.totals(f)["revenue"][a:b]) for f in flows)
    if rev(49, 56) / max(1, dl(49, 56)) < (rev(0, 28) / max(1, dl(0, 28))) * 0.93:
        grow = max(flows, key=lambda f: sum(f["entered"][49:56]) / max(1, sum(f["entered"][:28]) / 4))
        d = change_day(grow["entered"], 21)
        R.update(where="program", moved="entered", since=grow["dates"][d] if d is not None else "none")
    return R


def solve4(c):
    """Deliverability, from what the screen shows: the provider table (bounce, complaint, open, click rates against each
    provider's normal), Postmaster (Gmail's spam rate), Bounce details (categories) and the sending log.
    The rules are the ones the level teaches: where the bounces are and in which category; clicks, not opens, for the
    inbox; Postmaster for Gmail's complaints; and nothing outside normal in the last 7 days means nothing now."""
    P = {f["fid"]: f for f in c["flows"]}
    def rt(f, num, den, a, b):
        m = f["by_message"]["m1"]; d = sum(f["entered"][a:b]) if den == "sent" else sum(m[den][a:b])
        return sum(m[num][a:b]) / d if d else 0
    def ch(f, num, den):
        a = rt(f, num, den, 0, 28); return rt(f, num, den, 49, 56) / a - 1 if a else 0
    b0 = {k: rt(f, "bounces", "sent", 0, 28) for k, f in P.items()}; b1 = {k: rt(f, "bounces", "sent", 49, 56) for k, f in P.items()}
    bup = {k for k in P if b1[k] > max(2 * b0[k], b0[k] + 0.008)}
    cl = {k: ch(f, "clicks", "delivered") for k, f in P.items()}; op = {k: ch(f, "opens", "delivered") for k, f in P.items()}
    cm = {k: ch(f, "complaints", "delivered") for k, f in P.items() if f["feed"]}
    un = sum(sum(f["by_message"]["m1"]["unsubs"][49:56]) for f in P.values()) / max(1, sum(sum(f["by_message"]["m1"]["delivered"][49:56]) for f in P.values()))
    un0 = sum(sum(f["by_message"]["m1"]["unsubs"][:28]) for f in P.values()) / max(1, sum(sum(f["by_message"]["m1"]["delivered"][:28]) for f in P.values()))
    sent = lambda a, b: sum(sum(f["entered"][a:b]) for f in P.values())
    sent_up = sent(49, 56) / max(1, sent(0, 28) / 4) - 1 > 0.15
    pm7 = c["postmaster"]["week_rate"]
    def cat_rise():
        tot = lambda a, b, k: sum(sum(f["bounce_cats"][k][a:b]) for f in P.values())
        return max(L.LV4.CATS, key=lambda k: tot(49, 56, k) - tot(0, 28, k) / 4)
    dates, b = c["dates"], c["band"]
    last_w = sum(sum(f["by_message"]["m1"]["revenue"][49:56]) for f in P.values())
    big = round(b["mid"] - last_w) if last_w < b["lo"] else 0
    R = {"real": "nothing", "big": 0, "where": "", "since": "none", "moved": "nothing", "action": "watch"}
    def day(fs, num, den, spike=False):
        ser = [sum(f["by_message"]["m1"][num][d] for f in fs) / max(1, sum((f["entered"] if den == "sent" else f["by_message"]["m1"][den])[d] for f in fs)) for d in range(56)]
        if spike:
            return dates[max(range(21, 56), key=lambda d: ser[d])]
        d = change_day(ser, 21); return dates[d] if d is not None else "none"
    allp = list(P.values())
    dayb = [sum(f["by_message"]["m1"]["bounces"][d] for f in allp) / max(1, sum(f["entered"][d] for f in allp)) for d in range(56)]
    nb = sum(dayb[:28]) / 28
    peak = max(range(49, 56), key=lambda d: dayb[d])
    one_day = dayb[peak] > 3 * nb and sorted(dayb[49:56])[-2] < 2 * nb      # one day's bounces far above normal, the rest near it
    if one_day:
        R.update(real="problem", where="program", moved="bounces", big=big, since=dates[peak], action="fix_today")
    elif len(bup) >= 4:
        cat = cat_rise()
        spike = cat == "Invalid address"
        R.update(real="problem", where="program", moved="bounces", big=big, since=day(allp, "bounces", "sent", spike), action="fix_today")
    elif "other" in bup and "gmail" not in bup and (sum(v < -0.18 for v in cl.values()) >= 4 or cat_rise() == "Content"):
        R.update(real="problem", where="program", moved="clicks", big=big, since=day(allp, "clicks", "delivered"), action="fix_today")
    elif "other" in bup and "gmail" not in bup:
        R.update(real="problem", where="other", moved="bounces", big=big, since=day([P["other"]], "bounces", "sent"), action="escalate")
    elif bup == {"outlook"}:
        R.update(real="problem", where="outlook", moved="delivered", big=big, since=day([P["outlook"]], "bounces", "sent"), action="escalate")
    elif {"gmail", "outlook"} <= bup:
        R.update(real="problem", where="program", moved="delivered", big=big, since=day(allp, "bounces", "sent"), action="fix_today")
    elif sum(v < -0.18 for v in cl.values()) >= 4:
        R.update(real="problem", where="program", moved="clicks", big=big, since=day(allp, "clicks", "delivered"), action="fix_today")
    elif c["postmaster"]["compliance"].get("One-click unsubscribe") != "Compliant" or (sum(v > 0.4 for v in cm.values()) >= 2 and un < un0 * 0.7):
        R.update(real="problem", where="program", moved="complaints", big=big, since=day(allp, "unsubs", "delivered"), action="fix_today")   # date it on the clearer line
    elif sum(v > 0.4 for v in cm.values()) >= 2 and sent_up:
        dd = change_day([sum(f["entered"][d] for f in allp) for d in range(56)], 21)     # date it on sends: the third campaign is a clean step
        R.update(real="problem", where="program", moved="complaints", big=big, since=dates[dd] if dd else "none", action="test")
    elif pm7 >= 0.003:
        g = P["gmail"]; ser = [v if v is not None else 0 for v in c["postmaster"]["spam_rate"]]
        d = change_day(ser[:-1], 21)
        R.update(real="problem", where="gmail", moved="complaints", big=big, since=dates[d] if d else "none", action="fix_today")
    elif cl["gmail"] < -0.15:
        R.update(real="problem", where="gmail", moved="clicks", big=big, since=day([P["gmail"]], "clicks", "delivered"), action="fix_today")
    elif cl["apple"] < -0.2 and abs(op["apple"]) < 0.06:
        R.update(real="problem", where="apple", moved="clicks", big=big, since=day([P["apple"]], "clicks", "delivered"), action="fix_today")
    elif op["apple"] > 0.06 and abs(cl["apple"]) < 0.12:
        R.update(moved="opens", action="leave")
    return R


def solve_cause4(c, R):
    """The sending log: a change that lands on (or just before) the start and can touch what moved. Copy and admin
    changes can't move deliverability. Nothing outside normal now: 'None of these' unless the log shows the old fire."""
    if R["real"] == "nothing":
        return "none"
    near = [x for x in c["changes"] if x["kind"] not in ("copy", "admin") and abs(_days(x["date"], R["since"])) <= 3] if R["since"] != "none" else []
    return near[0]["id"] if near else "none"      # nothing lands at the start: reputation drift or the provider's own doing


def solve4_full(c):
    R = solve4(c); R["cause"] = solve_cause4(c, R); return R


def solve5(c):
    """Message pressure, from the screen: the Registry (each stream against its normal), Skipped (by reason), the Credit
    split (flows, campaigns, total), Pressure (the calendar, existing against new subscribers) and the log."""
    F = {f["fid"]: f for f in c["flows"]}
    M = lambda fid: F[fid]["by_message"]["m1"]
    S_ = lambda fid, k, a, b: sum(F[fid]["entered"][a:b]) if k == "entered" else sum(M(fid)[k][a:b])
    def ch(fid, k, den=None):
        if den is None:
            return S_(fid, k, 49, 56) / max(1, S_(fid, k, 0, 28) / 4) - 1
        a = S_(fid, k, 0, 28) / max(1, S_(fid, den, 0, 28)); b = S_(fid, k, 49, 56) / max(1, S_(fid, den, 49, 56))
        return b / a - 1 if a else 0
    def skip(fid, r, a, b):
        return sum(F[fid]["skipped"][r][a:b]) / max(1, S_(fid, "entered", a, b))
    dates, b = c["dates"], c["band"]
    rev = lambda fs, a, b_: sum(sum(F[x]["by_message"]["m1"]["revenue"][a:b_]) for x in fs)
    flows = [x for x in F if x != "camp"]
    last = rev(F, 49, 56)
    big = round(b["mid"] - last) if last < b["lo"] else 0
    below, above = last < b["lo"], last > b["hi"]
    fch = rev(flows, 49, 56) / max(1, rev(flows, 0, 28) / 4) - 1
    cch = rev(["camp"], 49, 56) / max(1, rev(["camp"], 0, 28) / 4) - 1
    cal = c["calendar"]
    cpw = lambda a, b_: sum(1 for x in cal if dates[a] <= x["date"] <= dates[b_ - 1]) / ((b_ - a) / 7)
    camp_days = [i for i, v in enumerate(F["camp"]["entered"]) if v]
    def step(series, idx=None, lo=21):
        """The step day, on the days that have data (campaign days, for campaign series)."""
        idx = idx or list(range(56))
        vals = [series[i] for i in idx]
        lo_i = next((n for n, i in enumerate(idx) if i >= lo), 1)
        d = change_day(vals, max(1, lo_i), len(vals) - 1)
        return dates[idx[d]] if d is not None else "none"
    ratio = lambda fid, k, den: [M(fid)[k][d] / max(1, (F[fid]["entered"] if den == "entered" else M(fid)[den])[d]) for d in range(56)]
    co = c["press"]["cohorts"]
    wk = lambda coh, w: sum(co[coh]["clicks"][w * 7:w * 7 + 7]) / max(1, sum(co[coh]["sent"][w * 7:w * 7 + 7]))
    ex = [wk("existing", w) for w in range(8)]
    ss_up = [x for x in flows if skip(x, "Smart Sending", 49, 56) - skip(x, "Smart Sending", 0, 28) > 0.07]
    ss_dn = [x for x in flows if skip(x, "Smart Sending", 0, 28) - skip(x, "Smart Sending", 49, 56) > 0.04 and ch(x, "delivered", "entered") > 0.04]
    ff_up = [x for x in flows if skip(x, "Fails Flow Filters", 49, 56) - skip(x, "Fails Flow Filters", 0, 28) > 0.07]
    un = {x: ch(x, "unsubs", "delivered") for x in F}
    R = {"real": "nothing", "big": 0, "where": "", "since": "none", "moved": "nothing", "action": "watch"}
    cu = [M("camp")["unsubs"][d] / max(1, M("camp")["delivered"][d]) for d in range(56)]
    base_cu = sorted(cu[d] for d in camp_days if d < 28)[len([d for d in camp_days if d < 28]) // 2]
    spike = max((d for d in camp_days if d >= 49), key=lambda d: cu[d], default=None)
    from datetime import date as _d
    today = _d.fromisoformat(c["today"])
    from datetime import timedelta as _td
    bf = _d(today.year, 11, 22) + _td(days=(4 - _d(today.year, 11, 22).weekday()) % 7)      # Black Friday: the fourth Friday
    if 0 <= (today - bf).days <= 10:
        return R | {"action": "leave"}                                          # Black Friday week: the season, by the book
    if ss_up:
        where = "program" if len(ss_up) >= 2 else ss_up[0]
        R.update(real="problem", where=where, moved="delivered", big=big, action="fix_today",
                 since=step(ratio(ss_up[0], "delivered", "entered")))
    elif ss_dn:
        g = ss_dn[0]
        R.update(real="good", where=g, moved="delivered", action="leave", since=step(ratio(g, "delivered", "entered")),
                 big=max(0, round(S_(g, "revenue", 49, 56) - S_(g, "revenue", 0, 28) / 4)))
    elif spike is not None and cu[spike] > 2.2 * base_cu and sorted(cu[d] for d in camp_days if d >= 49)[-2:][0] < 1.6 * base_cu:
        R.update(real="problem", where="camp", moved="unsubs", big=big, action="fix_today", since=dates[spike])
    elif un["sms"] > 0.8:
        R.update(real="problem", where="sms", moved="unsubs", big=big, action="fix_today", since=step(ratio("sms", "unsubs", "delivered")))
    elif ch("browse", "entered") > 0.5 and un["browse"] > 0.3 and ch("cart", "entered") < 0.15:
        R.update(real="problem", where="browse", moved="entered", big=big, action="fix_today", since=step(F["browse"]["entered"]))
    elif un["welcome"] > 0.8 and ch("cart", "entered") > 0.2:
        R.update(real="problem", where="welcome", moved="unsubs", big=big, action="fix_today", since=step(ratio("welcome", "unsubs", "delivered")))
    elif any(x["audience"].startswith("Everyone") for x in cal if x["date"] >= dates[49]):
        R.update(real="problem", where="camp", moved="clicks", big=big, action="fix_today",
                 since=step([F["camp"]["entered"][d] for d in range(56)], camp_days))
    elif (un["camp"] > 0.4 and cpw(49, 56) > cpw(0, 28) + 0.7) or (ex[6] + ex[7] < (ex[0] + ex[1]) * 0.9):
        # more campaigns, and the people already on the list pay for it: date it on the calendar change in the log
        cad = [x for x in c["changes"] if x["kind"] == "cadence"]
        R.update(real="problem", where="camp", moved="unsubs" if un["camp"] > 0.4 else "clicks", big=big, action="test",
                 since=cad[0]["date"] if cad else step(cu, camp_days))
    # anything left: filter skips and credit moving are not problems (the total and the reason say so)
    return R


def solve_cause5(c, R):
    """The log: a change on (or just before) the start that changes who gets what, or how often. Nothing wrong: none."""
    if R["real"] == "nothing":
        return "none"
    real = [x for x in c["changes"] if x["kind"] not in ("copy", "admin", "harmless")]      # read what each change says
    near = [x for x in real if R["since"] != "none" and abs(_days(x["date"], R["since"])) <= 3]
    if not near and R["moved"] == "clicks" and R["action"] == "test":                         # a slide: the change came first
        near = [x for x in real if _days(x["date"], R["since"]) <= 14][-1:]
    if R["where"] == "camp" and R["moved"] == "unsubs" and R["action"] == "fix_today":
        near = [x for x in c["changes"] if x["kind"] == "segment" and abs(_days(x["date"], R["since"])) <= 3] or near
    return near[0]["id"] if near else "none"


def solve5_full(c):
    R = solve5(c); R["cause"] = solve_cause5(c, R); return R


def solve6(c):
    """Purchase timing, from the screen: the log for anything dated, then Timing (each timed flow against its window),
    then Cohorts (full cells only, against the other months and the same month last year)."""
    F = {f["fid"]: f for f in c["flows"]}
    T = c["timing"]; dates = c["dates"]
    S_ = lambda fid, k, a, b: sum(F[fid]["entered"][a:b]) if k == "entered" else sum(F[fid]["by_message"]["m1"][k][a:b])
    dollars = lambda fid: round(S_(fid, "revenue", 49, 56) - S_(fid, "revenue", 0, 28) / 4)
    rate_ch = lambda fid, k: (S_(fid, k, 49, 56) / max(1, S_(fid, "delivered", 49, 56))) / max(1e-9, S_(fid, k, 0, 28) / max(1, S_(fid, "delivered", 0, 28))) - 1
    R = {"real": "nothing", "big": 0, "where": "", "since": "none", "moved": "nothing", "action": "watch"}
    outside = {}
    for fid, (lo, hi) in T["windows"].items():
        d = T["sends"][fid]
        if d < lo * 0.85 or d > hi * 1.15:
            outside[fid] = max(lo / d, d / hi)
    name_of = {f["flow"]["name"]: f["fid"] for f in c["flows"]}
    dated = [x for x in c["changes"] if x["kind"] in ("delay", "trigger", "content") and x["date"] >= dates[14]]
    if dated:
        x = dated[0]
        fid = next((v for k, v in name_of.items() if x["what"].startswith(k)), "winback")
        if x["kind"] == "trigger":
            return R | {"real": "problem", "where": fid, "moved": "entered", "since": x["date"], "action": "fix_today", "big": max(0, -dollars(fid))}
        if dollars(fid) > 0 and fid not in outside:
            return R | {"real": "good", "where": fid, "moved": "orders", "since": x["date"], "action": "leave", "big": dollars(fid)}
        moved = "unsubs" if rate_ch(fid, "unsubs") > 0.5 else "orders"
        return R | {"real": "problem", "where": fid, "moved": moved, "since": x["date"], "action": "fix_today", "big": max(0, -dollars(fid))}
    if outside:
        fid = max(outside, key=outside.get)
        return R | {"real": "problem", "where": fid, "action": "test"}
    full = [r for r in c["cohorts"] if r["r60"] is not None]
    norm = sorted(r["r60"] for r in full)[len(full) // 2]
    low = [r for r in full if r["r60"] < 0.8 * norm]
    for r in sorted(low, key=lambda r: r["r60"]):
        if r["size"] < 300:
            continue                                         # too few to read
        if r["discount"] > 0.45:
            return R | {"real": "problem", "where": "cohort", "action": "escalate"}
    return R | {"action": "leave"}


def solve_cause6(c, R):
    if R["real"] == "nothing":
        return "none"
    if R["where"] == "cohort":
        x = [x for x in c["changes"] if x["kind"] == "promo"]
        return x[0]["id"] if x else "none"
    if R["since"] == "none":
        return "none"                                        # outside its window all along: no change explains it
    x = [x for x in c["changes"] if x["kind"] in ("delay", "trigger", "content") and x["date"] == R["since"]]
    return x[0]["id"] if x else "none"


def solve6_full(c):
    R = solve6(c); R["cause"] = solve_cause6(c, R); return R
