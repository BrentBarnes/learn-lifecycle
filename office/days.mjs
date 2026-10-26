// The office's three tracks (CURRICULUM.md, "Roles and tracks"). You're hired for one, two or all three roles and
// clock in or out at the time clock. Each workday, every desk you're clocked in for serves the next lesson you
// haven't passed on its own track, so the tracks move at their own pace: Analytics (the dashboard wall, Lifecycle
// Files), Data (Frank's desk, SQL in SQL Gauntlet's order, sql.mjs) and Testing (the test board, Test Board).
// The dashboard wall and the test board are the real games in a frame, on the office's own save.
import { UNITS as TBU, STEPS as TBS } from "../test-board/engine.mjs";
import { UNITS7, STEPS7 } from "../test-board/health.mjs";
import { UNITS8, STEPS8 } from "../test-board/overview.mjs";
import { UNITS9, STEPS9 } from "../test-board/sizing.mjs";
import { UNITS10, STEPS10 } from "../test-board/priority.mjs";
import { UNITS11, UNITS12, STEPS11, STEPS12 } from "../test-board/room.mjs";
import { UNITS13, STEPS13 } from "../test-board/money.mjs";
import { UNITS14, STEPS14 } from "../test-board/slow.mjs";
import { PARTS, LATER } from "./sql.mjs";

// Lifecycle Files, in lf_path.py / lf_path2.py / lf_path7.py order. Case files (s16, 2s8) are whole cases, not lessons.
const LF = {
  "Level 1 · One flow": [["s1", "The normal range"], ["s2", "Single days"], ["j1-2", "Real or wobble?"], ["s3", "Since when, and what shape"], ["s4", "How big"],
    ["j3-4", "Since when, how big"], ["j1-4", "Read the whole chart"], ["s5", "Ruling out"], ["s6", "The revenue boxes"], ["j5-6", "Ruling out with the boxes"],
    ["s7", "Got the email"], ["s8", "Entered the flow"], ["j7-8", "Who got the emails"], ["j1-8", "Read the whole chart, all of it so far"], ["s9", "Orders"],
    ["s10", "Order size"], ["s11", "Clicks"], ["s12", "Each email"], ["j9-12", "What each person did, all of it"], ["s13", "Opens"], ["s14", "Unsubscribes"], ["s15", "What to do"]],
  "Level 2 · What changed?": [["2s1", "The change log"], ["2s2", "What a change can touch"], ["2j1-2", "Read the log"], ["2s3", "On or just before the start"],
    ["2j1-3", "When, and what it can touch"], ["2s4", "The right email, not just the right day"], ["2s5", "The log only sees the flow"], ["2j4-5", "Two that fit the date"],
    ["2s6", "Changes that change nothing"], ["2s7", "Wins have causes"], ["2j6-7", "Which change, in a few looks"], ["2j4-7", "Every kind of change"], ["2j1-7", "Everything so far"]],
  "Level 7 · Would they have bought anyway?": [["7s1", "The store total"], ["7s2", "Too small to show"], ["7j1-2", "Credit or new orders?"], ["7s3", "The holdout"],
    ["7s4", "Too few held out"], ["7j1-4", "Both checks together"], ["7s5", "When the whole store moves"], ["7s6", "Who the emails help most"], ["7j1-6", "The whole picture"]],
};
// Test Board v3's path (app.mjs PATH), grouped by the screen each unit is played on (app.mjs UNAME)
const TB_UNITS = { ...TBU, ...UNITS7, ...UNITS8, ...UNITS9, ...UNITS10, ...UNITS11, ...UNITS12, ...UNITS13, ...UNITS14 };
const TB_GROUPS = [["The Board", TBS.U2], ["Read one result", TBS.U6.filter((u) => u !== "U6g")], ["Health", STEPS7], ["Overview", STEPS8], ["Sizing", STEPS9],
  ["Priority", STEPS10], ["Flow map", STEPS11], ["Roadmap", STEPS12], ["Money", STEPS13], ["Slow metrics", STEPS14]];

export const TRACKS = {
  analytics: { role: "Analytics", desk: "dash", where: "Dashboard wall", game: "Lifecycle Files", does: "Read the dashboards and say what happened.",
    lessons: Object.entries(LF).flatMap(([group, ls]) => ls.map(([id, title]) => ({ id, title, group }))) },
  data: { role: "Data", desk: "sql", where: "Frank's desk", game: "SQL", does: "Pull the numbers with SQL.",
    lessons: [...PARTS.map((p) => ({ id: p.id, title: p.name, group: "SQL" })), ...LATER.map((t) => ({ id: null, title: t, group: "Coming" }))] },
  testing: { role: "Testing", desk: "board", where: "Test board", game: "Test Board", does: "Plan, size and read A/B tests in GrowthBook.",
    lessons: TB_GROUPS.flatMap(([group, ids]) => ids.map((id) => ({ id, title: TB_UNITS[id].name, group }))) },
};
export const ROLES = ["analytics", "data", "testing"];                           // the order on the time clock and keys 1-3
export const ROLE_OF = { dash: "analytics", sql: "data", board: "testing" };
export const lessonOf = (role, id) => (id && TRACKS[role].lessons.find((l) => l.id === id)) || null;
// the next lesson on a track: the first one not passed (null when the built ones are all passed)
export const nextLesson = (role, passed) => TRACKS[role].lessons.find((l) => l.id && !passed(l.id)) || null;

const WEEKDAY = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
export const weekday = (n) => WEEKDAY[(n - 1) % 5];
const low = (t) => /^[A-Z][a-z]/.test(t) ? t[0].toLowerCase() + t.slice(1) : t;   // keeps SELECT, WHERE
const end = (t) => /[?.!]$/.test(t) ? t : t + ".";
// Dana's morning lines: today's lesson at each desk you're clocked in for
export function morning(n, roles, today) {
  const on = ROLES.filter((r) => roles[r]);
  const bits = on.map((r) => { const l = lessonOf(r, today[TRACKS[r].desk]); return l ? `${TRACKS[r].where}: ${end(low(l.title))}` : `${TRACKS[r].where}: nothing new yet.`; });
  return [{ who: "dana", text: `Day ${n}. You're on ${on.map((r) => TRACKS[r].role.toLowerCase()).join(" and ")} today. ${bits.join(" ")}` },
    { who: "dana", text: "Any order you like. Come find me when they're done. The time clock by the screens changes your roles." }];
}
