// U3 Where the coin goes: flows, the person as the unit, where the split sits, dilution, fixed groups and carryover.
// Practised in parts like U1 and U2: who reaches an email, one person one group, place the coin, how much shows,
// 3+4 judged on someone else's split, groups over time, then a teammate's plan in Slack.
// Every case is a "scene" (app.mjs draws c.vis and asks c.q). Made-up people and numbers.

export const CALLS3 = [
  { id: "fairUnit", label: "One person, one group", stamp: "One group" },
  { id: "mixedUnit", label: "Same person in both", stamp: "Mixed" },
  { id: "splitRight", label: "Right before the change", stamp: "Right spot" },
  { id: "splitEarly", label: "Too early: watered down", stamp: "Diluted" },
  { id: "splitLate", label: "Too late: after the change", stamp: "Too late" },
  { id: "carryover", label: "Carryover from an old test", stamp: "Carryover" },
  { id: "goodPlan", label: "Good plan", stamp: "Good plan" },
];

const PART = { screen: "scene", tabs: [], parent: "U3", daily: false, pass: [5, 6] };
export const UNITS3 = {
  U3a: { ...PART, id: "U3a", step: 1, name: "Who reaches it", calls: [],
         kinds: ["reach", "never", "reach", "reach", "never"], meet: ["reach", "never", "reach"] },
  U3b: { ...PART, id: "U3b", step: 2, name: "One person, one group", calls: ["fairUnit", "mixedUnit"],
         kinds: ["fairUnit", "mixedUnit", "fairUnit", "mixedUnit", "mixedUnit", "fairUnit"], meet: ["mixedUnit", "fairUnit", "mixedUnit"] },
  U3c: { ...PART, id: "U3c", step: 3, name: "Place the coin", calls: [], slot: true,
         kinds: ["email", "wait", "email", "email", "wait"], meet: ["email", "wait", "email"] },
  U3d: { ...PART, id: "U3d", step: 4, name: "How much shows", calls: [],
         kinds: ["dilute", "dilute", "dilute", "dilute", "dilute"], meet: ["dilute", "dilute", "dilute"] },
  U3e: { ...PART, id: "U3e", step: 5, name: "Steps 3 and 4 together", calls: ["splitRight", "splitEarly", "splitLate"],
         kinds: ["splitRight", "splitEarly", "splitLate", "splitEarly", "splitRight", "splitLate", "splitEarly"], meet: ["splitEarly", "splitRight", "splitLate"], pass: [6, 7] },
  U3f: { ...PART, id: "U3f", step: 6, name: "Same groups over time", calls: ["fairUnit", "mixedUnit", "carryover"],
         kinds: ["fairUnit", "mixedUnit", "carryover", "carryover", "fairUnit", "mixedUnit"], meet: ["carryover", "fairUnit", "mixedUnit"] },
  U3g: { ...PART, id: "U3g", step: 7, name: "Straight from Slack", calls: ["goodPlan", "splitEarly", "splitLate", "mixedUnit", "carryover"],
         kinds: ["goodPlan", "splitEarly", "splitLate", "mixedUnit", "carryover", "goodPlan", "splitEarly", "carryover"], meet: ["goodPlan", "splitEarly", "carryover"], pass: [7, 8], daily: true },
};

// ---------- the flows (counts are per 1,000 people who enter) ----------
const E = (n, reach) => ({ t: "email", n, reach });
const W = (n) => ({ t: "wait", n });
export const FLOWS = {
  welcome: { name: "Welcome flow", trigger: "Joins the email list", exit: "Anyone who places an order leaves the flow.",
    nodes: [E("Email 1: welcome and 10% code", 1000), W("Wait 2 days"), E("Email 2: founder story", 820), W("Wait 3 days"),
            E("Email 3: best sellers", 610), W("Wait 4 days"), E("Email 4: brew guide", 440), W("Wait 5 days"), E("Email 5: reviews", 330)] },
  cart: { name: "Abandoned cart flow", trigger: "Starts checkout and doesn't finish", exit: "Anyone who places an order leaves the flow.",
    nodes: [W("Wait 4 hours"), E("Email 1: your cart is waiting", 760), W("Wait 1 day"), E("Email 2: reviews for your item", 520),
            W("Wait 2 days"), E("Email 3: free returns reminder", 410)] },
  post: { name: "Post-purchase flow", trigger: "Places a first bean order", exit: "Unsubscribes leave. Everyone else runs to the end.",
    nodes: [W("Wait 3 days"), E("Email 1: brew guide", 960), W("Wait 10 days"), E("Email 2: sizing check", 900),
            W("Wait 21 days"), E("Email 3: brewers for bean buyers", 820), W("Wait 30 days"), E("Email 4: time for a second bag?", 740)] },
};
// how many reach node i: an email's own count; a wait holds whoever got the step before it
export function reachAt(f, i) {
  if (i < f.nodes.length && f.nodes[i].t === "email") return f.nodes[i].reach;
  for (let k = Math.min(i, f.nodes.length) - 1; k >= 0; k--) if (f.nodes[k].t === "email") return f.nodes[k].reach;
  return 1000;
}
// a coin at slot s (right before node s) splits everyone who passes that point
const tooEarly = (f, s, j) => s < j && reachAt(f, s) > reachAt(f, j);
const rightSpot = (f, s, j) => s <= j && reachAt(f, s) === reachAt(f, j);
const short = (n) => n.split(":")[0];
const fmt = (n) => Math.round(n).toLocaleString("en-US");

// ---------- small helpers (own copies so this file has no imports) ----------
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = (r, a) => a[Math.floor(r() * a.length)];
const shuffle = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const PEOPLE = ["Maya", "Dre", "Lou", "Sam", "Rosa", "Theo"];

// the change on node j, worded for its type
const EMAIL_CHANGES = ["a new hero image in", "shorter copy in", "a new subject line on", "a reviews block in"];
function changeFor(r, f, j) {
  const n = f.nodes[j];
  if (n.t === "email") return { text: `${pick(r, EMAIL_CHANGES)} ${short(n.n)}`, j };
  const nextE = f.nodes.slice(j + 1).find((x) => x.t === "email");
  return { text: `a shorter wait before ${short(nextE.n)} (half the current ${n.n.replace("Wait ", "")})`, j, wait: true };
}
const flowVis = (f, o = {}) => ({ flow: { ...f, change: o.change, mark: o.mark, split: o.split, counts: o.counts !== false } });
const slotName = (f, s) => s === 0 ? "at flow entry" : s >= f.nodes.length ? `after ${short(f.nodes.at(-1).n)}` :
  f.nodes[s].t === "email" ? `right before ${short(f.nodes[s].n)}` : `right after ${short(f.nodes[s - 1].n)}, before the wait`;

// ---------- unit banks for one-person-one-group and carryover ----------
const UNIT_FAIR = [
  "A random 50/50 split on profiles at the welcome flow's entry. Each person stays on their path.",
  "One random split before the first of four Tuesday sends. Group B gets the new layout every week.",
  "Klaviyo's A/B test on a single campaign send.",
  "One random split of profiles for an offer that runs in email and SMS. Group B gets it in both channels.",
  "A fresh random split for the new idea, then the same two groups kept for its six weeks.",
];
const UNIT_MIXED = [
  "A new Klaviyo A/B split on each of the four Tuesday sends, to test the new weekly layout.",
  "The email list and the SMS list each split by their own coin, for one offer shown in both channels.",
  "Two separate flow A/B tests, on email 1 and on email 3, both testing short copy, each with its own split.",
  "Each daily send for two weeks gets its own 50/50 split, to test a new product grid.",
];
const CARRY = [
  ["Reuses last month's free-shipping test groups: B had free shipping for four weeks, now B gets the new hero.", "four weeks of free shipping"],
  ["The B group from the BREW15 SMS test gets the new welcome series.", "a 15% code"],
  ["Keeps the A and B groups from the $10-off cart test, where B bought more last month, for a copy test.", "$10 off and a burst of orders"],
  ["Uses the people who got the early-access email last month as group B for a new launch email.", "early access to the sale"],
];
function peopleGrid(r, mixed) {
  return PEOPLE.slice(0, 4).map((p) => {
    const first = r() < 0.5 ? "A" : "B";
    if (!mixed) return [p, first.repeat(4)];
    let s = ""; for (let i = 0; i < 4; i++) s += r() < 0.5 ? "A" : "B";
    if (/^(A+|B+)$/.test(s)) s = s.slice(0, 3) + (s[3] === "A" ? "B" : "A");
    return [p, s];
  });
}

// =====================================================================================================
export function makeU3(seed, kind, stage, U) {
  const r = rng(seed);
  const c = { screen: "scene", unit: U.id, kind, stage, seed, crumb: "Flows", target: null };
  const fk = pick(r, Object.keys(FLOWS)), f = FLOWS[fk];
  const emails = f.nodes.map((n, i) => [n, i]).filter(([n]) => n.t === "email");

  if (U.id === "U3a") {
    const [n, i] = pick(r, emails.filter(([x]) => x.reach < 1000));
    const others = shuffle(emails.filter(([x, k]) => k !== i && x.reach !== n.reach), r).slice(0, 2);
    const val = (x) => kind === "never" ? 1000 - x.reach : x.reach;
    const opts = shuffle([[n], ...others].map(([x]) => val(x)), r).sort((a, b) => a - b);
    Object.assign(c, { crumb: "Flows / " + f.name, title: kind === "never" ? `Who never gets ${short(n.n)}?` : `Who gets ${short(n.n)}?`,
      meta: "Counts are per 1,000 people who enter the flow.",
      q: kind === "never" ? `Of 1,000 who enter, how many never get ${short(n.n)}?` : `Of 1,000 who enter, how many get ${short(n.n)}?`,
      vis: flowVis(f, { mark: i }), opts: opts.map((v) => ["n" + v, fmt(v)]), answer: "n" + val(n), target: "fn-" + i,
      hint: "Each email card shows how many of the 1,000 reach it. People leave on the way: they order, or they unsubscribe.",
      why: kind === "never" ? `${fmt(n.reach)} of 1,000 get ${short(n.n)}, so ${fmt(1000 - n.reach)} never do. A change in that email can't touch them.`
                            : `The card for ${short(n.n)} says ${fmt(n.reach)} of every 1,000 reach it. The rest left before it went out.` });
    return c;
  }

  if (U.id === "U3b" || (U.id === "U3f" && kind !== "carryover")) {
    const mixed = kind === "mixedUnit", text = pick(r, mixed ? UNIT_MIXED : UNIT_FAIR);
    Object.assign(c, { crumb: "Test setups", title: "One person, one group?", meta: "How the split was made:",
      vis: { quote: text }, q: "Can the same person end up getting both versions?",
      answer: mixed ? "mixedUnit" : "fairUnit", reveal: { people: peopleGrid(r, mixed) },
      hint: "Follow one person through every send or step. A fresh coin per send, per channel or per email can land them in A once and B the next time.",
      why: mixed ? `"${text}" A person can get A one time and B the next, so their orders belong to neither version. Flip one coin per person and keep it for the whole test. The person is the <b>unit</b>.`
                 : `"${text}" Each person gets one coin flip and keeps that group, so everything they buy belongs to one version.` });
    return c;
  }

  if (U.id === "U3f" && kind === "carryover") {
    const [text, had] = pick(r, CARRY);
    Object.assign(c, { crumb: "Test setups", title: "Fresh groups or old ones?", meta: "How the groups were made:",
      vis: { quote: text }, q: "Is this a fair way to make the groups?", answer: "carryover",
      hint: "Ask: did either group get something different in an earlier test? If so, it doesn't start out like the other one.",
      why: `"${text}" Group B just had ${had}. Some of them already bought, and some now expect a deal, so B starts out different from A. That's <b>carryover</b>. Flip a fresh coin for each new idea, then keep those groups.` });
    return c;
  }

  // the flow map with a change somewhere past entry (so the right spot isn't always the first one)
  let j;
  for (let t = 0; t < 50; t++) {
    j = 1 + Math.floor(r() * (f.nodes.length - 1));
    if (kind === "wait" && f.nodes[j].t !== "wait") continue;
    if (kind === "email" && f.nodes[j].t !== "email") continue;
    if (kind === "dilute" && (f.nodes[j].t !== "email" || f.nodes[j].reach > 900)) continue;
    break;
  }
  if (f.nodes[j].t === "wait" && j === f.nodes.length - 1) j--;
  const ch = changeFor(r, f, j), reach = reachAt(f, j);
  const head = { crumb: "Flows / " + f.name, title: `B tests ${ch.text}` };

  if (U.id === "U3c") {
    const fb = [], ok = [];
    for (let s = 0; s <= f.nodes.length; s++) {
      if (tooEarly(f, s, j)) fb.push(`Too early: ${fmt(reachAt(f, s))} split here, only ${fmt(reach)} reach the change.`);
      else if (rightSpot(f, s, j)) { fb.push("Right spot: everyone split here meets the change."); if (s !== j) ok.push("s" + s); }
      else fb.push(`Too late: the change comes before the coin.`);
    }
    Object.assign(c, head, { meta: "Move the coin to where the split should sit.", vis: flowVis(f, { change: j, split: 0 }), slot: true, slotFb: fb,
      answer: "s" + j, accept: ok, target: "fs-" + j,
      hint: "Put the coin right before the step that changes. Earlier mixes in people who never reach it. After it is too late.",
      why: `The coin goes ${slotName(f, j)}${ch.wait ? ", before the wait itself, because the wait is what changes" : ""}. Everyone it splits meets the change.` +
        (reach < 1000 ? ` At entry, ${fmt(1000 - reach)} of every 1,000 split people would never get there.` : "") });
    return c;
  }

  if (U.id === "U3d") {
    const e = 8 + Math.floor(r() * 13), show = Math.round(e * reach / 1000);
    const opts = [...new Set([e, show, Math.max(1, Math.round(show / 2.5))])];
    if (opts.length < 3) return makeU3(seed + 1, kind, stage, U);
    Object.assign(c, head, { meta: `The coin flips at entry. Among people who get ${short(f.nodes[j].n)}, B adds ${e} orders per 1,000.`,
      vis: flowVis(f, { change: j, split: 0 }), q: `Per 1,000 people split at entry, about how many extra orders show?`,
      opts: opts.sort((a, b) => a - b).map((v) => ["n" + v, "about " + v]), answer: "n" + show, target: "fn-" + j,
      hint: "Only people who reach the changed email can be moved by it. Multiply the effect by the share who reach it.",
      why: `Only ${fmt(reach)} of 1,000 get ${short(f.nodes[j].n)}. The other ${fmt(1000 - reach)} were split too, but got the same thing in A and B. ${e} × ${fmt(reach)} ÷ 1,000 ≈ ${show}. ` +
        `This shrinking is called <b>dilution</b>. Split right before ${short(f.nodes[j].n)} and all ${e} show.` });
    return c;
  }

  // U3e: judge a split someone else placed. U3g: the same plan, written in Slack.
  const early = []; for (let s = 0; s < j; s++) if (tooEarly(f, s, j) && reachAt(f, s) >= 1.25 * reach) early.push(s);   // clearly watered down
  if ((kind === "splitEarly") && !early.length) return makeU3(seed + 1, kind, stage, U);
  const where = { splitRight: j, goodPlan: j, splitEarly: early.length ? pick(r, early) : 0, splitLate: Math.min(f.nodes.length, j + 1 + Math.floor(r() * 2)) };
  if (U.id === "U3e") {
    const s = where[kind];
    Object.assign(c, head, { meta: `Priya put the split ${slotName(f, s)}.`, vis: flowVis(f, { change: j, split: s }), q: "Is the coin in the right place?",
      answer: kind, target: "fs-" + s, hint: "Find the step B changes, then look where the coin sits: right before it, earlier, or after it.",
      why: kind === "splitRight" ? `The coin sits right before the change, so everyone it splits meets it. Nothing is watered down.`
        : kind === "splitEarly" ? `The coin sits ${slotName(f, s)}, but the change is ${ch.wait ? "the wait before " + short(f.nodes[j + 1].n) : "in " + short(f.nodes[j].n)}. Of the ${fmt(reachAt(f, s))} split there, only ${fmt(reach)} reach it, so a real effect shows at about ${Math.round(reach / reachAt(f, s) * 100)}% of its size. Move the coin ${slotName(f, j)}.`
        : `The coin sits ${slotName(f, s)}, after the change. By then everyone has already had the old version, so A and B are the same. Move it ${slotName(f, j)}.` });
    return c;
  }

  // U3g: prose from Priya or Theo. Campaign-style plans carry the person-as-unit cases.
  const who = pick(r, ["Priya", "Theo"]);
  let prose, sb;
  if (kind === "mixedUnit") {
    prose = `Testing a new weekly layout on the four Tuesday sends. ${pick(r, ["I'll set up a Klaviyo A/B test on each send.", "Each send gets its own 50/50 split in Klaviyo."])} Reading revenue per recipient at the end of the month. Sound OK?`;
  } else if (kind === "carryover") {
    const [text] = pick(r, CARRY);
    prose = `Testing ${ch.text}. ${text.replace(/\.$/, "")}, since those groups are already set up. Split ${slotName(f, j)}. Sound OK?`;
  } else {
    sb = where[kind];
    prose = `Testing ${ch.text} in the ${f.name.toLowerCase()}. I'll put a Random sample split ${slotName(f, sb)}, fresh 50/50 on profiles, and read orders per person from the split for 30 days. Sound OK?`;
  }
  Object.assign(c, { crumb: "#email-tests", title: `${who}'s plan in #email-tests`, meta: "Is the plan sound? If not, what's wrong with it?",
    vis: { slack: { from: who, text: prose } }, answer: kind, reveal: sb !== undefined ? flowVis(f, { change: j, split: sb }) : kind === "mixedUnit" ? { people: peopleGrid(r, true) } : null,
    hint: "Three questions: where does the coin sit compared with the change, is it one coin per person kept for the whole test, and are the groups fresh?",
    why: kind === "goodPlan" ? `The split sits right before the change, it's one coin per profile, and the groups are fresh. Good plan.`
      : kind === "splitEarly" ? `The split sits ${slotName(f, sb)}, but the change is further down. Of the ${fmt(reachAt(f, sb))} split there, only ${fmt(reach)} reach it, so the effect gets watered down. Put it ${slotName(f, j)}.`
      : kind === "splitLate" ? `The split sits ${slotName(f, sb)}, after the change, so everyone has already had the same version. Put it ${slotName(f, j)}.`
      : kind === "mixedUnit" ? `A new split on every send lets the same person get A one week and B the next. Split once on profiles before the first send and keep the groups all month.`
      : `Reusing an old test's groups brings that test's effect along. Flip a fresh coin for the new idea.` });
  return c;
}

// ---------- lessons ----------
const WEL = FLOWS.welcome;
export const LESSONS3 = {
  U3a: [
    { h: "A flow is a path people walk, one step at a time.",
      p: "Someone joins the list and enters the welcome flow. Email 1 goes out at once, then they wait two days for email 2, and so on. Anyone who orders leaves the flow.",
      predict: { q: "Of 1,000 who enter, how many get email 4?", opts: ["1,000", "440", "330"], answer: 1,
        reveal: "440. Each step loses people: they order and leave, or they unsubscribe. The number on each email is how many reach it." },
      vis: flowVis(WEL) },
    { h: "A change only touches the people who reach it.",
      p: "A new hero in email 4 can only matter for the 440 who get email 4. The other 560 never see it, whatever version they were meant to get.",
      vis: flowVis(WEL, { change: 6 }) },
  ],
  U3b: [
    { h: "One person should get one version.",
      p: "Theo tests a new weekly layout over four Tuesday sends. Klaviyo's A/B test flips a new coin on every send.",
      predict: { q: "Maya bought beans in week 4. Which version gets the credit?", opts: ["A", "B", "Can't say"], answer: 2,
        reveal: "Can't say. Maya got A twice and B twice. Her order belongs to neither version. The fix is one coin per person, kept for the whole test. The person (a profile, in Klaviyo) is the test's <b>unit</b>." },
      vis: { people: [["Maya", "ABBA"], ["Dre", "BBAB"], ["Lou", "AABA"], ["Sam", "BABB"]] } },
    { h: "One coin per person, kept for every send and every channel.",
      p: "A single send is fine with Klaviyo's own split: there's nothing to mix. Trouble starts when one idea runs over several sends, emails or channels, and each gets its own coin.",
      vis: { tags: { fair: "One group", bad: "Mixed" }, examples: [
        ["fair", "One random split before the first of four sends, same groups every week"],
        ["fair", "Klaviyo's A/B test on a single campaign send"],
        ["bad", "A new A/B split on each of the four sends"],
        ["bad", "Email and SMS each split by their own coin for one offer"],
      ] } },
  ],
  U3c: [
    { h: "Put the coin right before the change.",
      p: "The new hero is in email 4. Flip the coin at entry and 560 of every 1,000 split people never reach email 4. They add noise and no difference.",
      predict: { q: "Where should the coin go?", opts: ["At flow entry", "Right before email 4", "Right after email 4"], answer: 1,
        reveal: "Right before email 4. Everyone the coin touches gets the new hero or the old one. After email 4 is too late: everyone has already had the old version. In Klaviyo you'd add a Split with a Random sample path there." },
      vis: flowVis(WEL, { change: 6 }) },
    { h: "When the change is a wait, the coin goes before the wait.",
      p: "Priya wants to cut the wait before email 3 from 4 days to 2. The wait itself is the change. In practice you move the coin to a spot and drop it.",
      predict: { q: "Where does the coin go?", opts: ["Right before the wait", "Right before email 3"], answer: 0,
        reveal: "Before the wait. Split after it and the wait has already happened, the same for everyone." },
      vis: flowVis(WEL, { change: 3 }) },
  ],
  U3d: [
    { h: "Split too early and the effect gets watered down.",
      p: "Among people who get email 4, the new hero adds 12 orders per 1,000. The coin flips at entry, and only 440 of every 1,000 split people get email 4.",
      predict: { q: "Per 1,000 split at entry, how many extra orders show?", opts: ["12", "about 5", "0"], answer: 1,
        reveal: "About 5: 12 × 440 ÷ 1,000. The other 560 add nothing but noise. This is called <b>dilution</b>. A smaller effect needs many more people to see, so a diluted test can come back flat when the change worked." },
      vis: flowVis(WEL, { change: 6, split: 0 }) },
  ],
  U3e: [
    { h: "Now judge a split someone else placed.",
      p: "Find the step B changes. Then look at the coin. Right before the change is right. Earlier is watered down. After it is too late.",
      vis: { checks: [["Find the change", "The highlighted step is what B does differently."], ["Find the coin", "Right before it, earlier, or after it?"]] } },
  ],
  U3f: [
    { h: "Old tests leave marks on their groups.",
      p: "Last month group B got free shipping for four weeks, and many of them bought. Now Theo wants to reuse the same A and B groups to test a new hero.",
      predict: { q: "Do A and B start this new test alike?", opts: ["Yes", "No"], answer: 1,
        reveal: "No. B just bought, and some of B now wait for the next deal. Whatever the new hero does gets mixed with that. This is <b>carryover</b>. Flip a fresh coin for each new idea." },
      vis: { quote: "Reuse last month's free-shipping groups: A stays A, B stays B, and B gets the new hero." } },
    { h: "Fresh coin for a new idea. Same groups for the life of one idea.",
      p: "Three ways a setup goes right or wrong over time.",
      vis: { tags: { fair: "Fair", bad: "Off" }, examples: [
        ["fair", "A fresh random split for the new idea, the same groups kept for its six weeks"],
        ["bad", "A new split on every send of the same idea (same person in both)"],
        ["bad", "Last month's offer-test groups reused for a new idea (carryover)"],
      ] } },
  ],
  U3g: [
    { h: "At work the plan arrives as a message.",
      p: "Read it for three things: where the split sits next to the change, whether it's one coin per person for the whole test, and whether the groups are fresh.",
      vis: { slack: { from: "Priya", text: "Testing a new hero image in Email 4 of the welcome flow. I'll put a Random sample split at flow entry, fresh 50/50 on profiles, and read orders per person from the split for 30 days. Sound OK?" } } },
  ],
};
