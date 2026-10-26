// U4 Set it up and check it: copies of Klaviyo's campaign A/B form, the flow A/B tab and a pre-flight preview.
// Practised in parts: read the form, test strategy alone, winning metric alone, both, size + send time + duration,
// flow A/B settings, then the pre-flight check with a guided walk. Field names follow Klaviyo's help center
// (research/v2/04-real-tools-task-analysis.md, A13 to A16). Made-up people and numbers.

export const CALLS4 = [
  { id: "fStrategy", label: "Test strategy", stamp: "Strategy" },
  { id: "fMetric", label: "Winning metric", stamp: "Metric" },
  { id: "fSize", label: "Test size", stamp: "Test size" },
  { id: "fDuration", label: "Test duration", stamp: "Duration" },
  { id: "fSend", label: "Send time", stamp: "Send time" },
  { id: "setupOk", label: "Set up right", stamp: "Looks right" },
  { id: "personalized", label: "Personalized: no clean read", stamp: "Personalized" },
  { id: "mOpen", label: "Open rate", stamp: "Open rate" },
  { id: "mClick", label: "Click rate", stamp: "Click rate" },
  { id: "mOrder", label: "Placed order rate", stamp: "Placed order rate" },
  { id: "wrongMetric", label: "Wrong winning metric", stamp: "Wrong metric" },
  { id: "localSize", label: "Local time needs 100%", stamp: "Needs 100%" },
  { id: "tooShort", label: "Too short for orders", stamp: "Too short" },
  { id: "autoDist", label: "Automatic distribution on", stamp: "Drifting split" },
  { id: "needsSplit", label: "A wait needs a split", stamp: "Use a split" },
  { id: "ready", label: "Ready to send", stamp: "Ready" },
  { id: "twoChanged", label: "Two things changed", stamp: "Two changes" },
  { id: "codeBroken", label: "Code or link broken in one", stamp: "Broken" },
  { id: "sendTime", label: "Different send times", stamp: "Time differs" },
];

const PART = { screen: "scene", tabs: [], parent: "U4", daily: false, pass: [5, 6] };
export const UNITS4 = {
  U4a: { ...PART, id: "U4a", step: 1, name: "Read the form", calls: ["fStrategy", "fMetric", "fSize", "fDuration", "fSend"],
         kinds: ["fStrategy", "fMetric", "fSize", "fDuration", "fSend", "fMetric", "fSize"], meet: ["fMetric", "fSize", "fStrategy"] },
  U4b: { ...PART, id: "U4b", step: 2, name: "Standard or personalized", calls: ["setupOk", "personalized"],
         kinds: ["setupOk", "personalized", "small", "personalized", "setupOk", "personalized"], meet: ["personalized", "setupOk", "small"] },
  U4c: { ...PART, id: "U4c", step: 3, name: "Pick the winning metric", calls: ["mOpen", "mClick", "mOrder"],
         kinds: ["orders", "clicks", "opensGoal", "orders", "sms", "clicks"], meet: ["orders", "clicks", "opensGoal"] },
  U4d: { ...PART, id: "U4d", step: 4, name: "Steps 2 and 3 together", calls: ["setupOk", "personalized", "wrongMetric"],
         kinds: ["setupOk", "personalized", "wrongMetric", "wrongMetric", "setupOk", "personalized", "small"], meet: ["wrongMetric", "personalized", "setupOk"], pass: [6, 7] },
  U4e: { ...PART, id: "U4e", step: 5, name: "Size, time and duration", calls: ["setupOk", "localSize", "tooShort"],
         kinds: ["setupOk", "localSize", "tooShort", "full", "localSize", "tooShort"], meet: ["localSize", "tooShort", "full"] },
  U4f: { ...PART, id: "U4f", step: 6, name: "Flow A/B settings", calls: ["setupOk", "autoDist", "needsSplit"],
         kinds: ["setupOk", "autoDist", "needsSplit", "autoDist", "setupOk", "needsSplit"], meet: ["autoDist", "needsSplit", "setupOk"] },
  U4g: { ...PART, id: "U4g", step: 7, name: "Pre-flight check", calls: ["ready", "twoChanged", "codeBroken", "sendTime"], guided: true,
         kinds: ["ready", "twoChanged", "codeBroken", "sendTime", "twoChanged", "codeBroken", "sendTime", "ready"], meet: ["twoChanged", "codeBroken", "ready"], pass: [7, 8], daily: true },
};

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = (r, a) => a[Math.floor(r() * a.length)];
const lc = (t) => /^[A-Z][a-z]/.test(t) ? t[0].toLowerCase() + t.slice(1) : t;

// ---------- briefs: what Theo wants, and the metric that matches it ----------
const BRIEFS = [
  // [change, goal sentence, right metric, why that metric]
  ["GIF hero vs static hero", "Which hero sells more beans?", "mOrder", "The question is about orders, so Klaviyo should judge on placed order rate."],
  ["Free-shipping line in the header", "Does the free-shipping line get more people to order?", "mOrder", "The question is about orders."],
  ["4-product grid vs 6-product grid", "Which grid makes more money per send?", "mOrder", "Money comes from orders. Of Klaviyo's three, placed order rate is closest."],
  ["'Shop beans' button vs 'Find your fit' button", "Which button gets more people through to the site?", "mClick", "The question is about getting people to the site, which is a click."],
  ["New fit-guide link block", "Does the block send more people to the brew guide?", "mClick", "The question is about visits to a page, which is a click."],
];
const OPEN_GOALS = [
  ["Question subject line vs statement subject line", "Which subject line gets more people to read the email?"],
  ["Emoji in the subject line", "Does the emoji get the email read?"],
];
const METRIC_NAME = { mOpen: "Open rate", mClick: "Click rate", mOrder: "Placed order rate" };

// the campaign A/B form; `show` = which fields are drawn
function kform(o) {
  return { kform: { channel: o.channel || "Email", list: o.list, strategy: o.strategy, metric: o.metric, metrics: o.metrics || ["Open rate", "Click rate", "Placed order rate"],
    size: o.size, duration: o.duration, send: o.send, show: o.show, explain: !!o.explain } };
}
const SENDS = ["Tuesday 10:00 AM, Eastern", "Tuesday 10:00 AM in the recipient's local timezone", "Thursday 7:00 PM, Eastern"];

export function makeU4(seed, kind, stage, U) {
  const r = rng(seed);
  const c = { screen: "scene", unit: U.id, kind, stage, seed, target: null, crumb: "Campaigns / Daily campaign / A/B test" };
  const [change, goal, rightM, mWhy] = pick(r, BRIEFS);
  const brief = (g = goal, ch = change) => ({ quote: `<b>Theo's brief.</b> Testing ${lc(ch)}. ${g} List: ${list} profiles.` });
  const list = pick(r, ["720,000", "640,000", "910,000"]);

  if (U.id === "U4a") {
    const Q = { fStrategy: ["Will everyone end up with one winning version, or each person their own?", "Which setting decides between a normal A/B test and Klaviyo's per-person version?"],
      fMetric: ["Which setting decides how Klaviyo picks the winner?", "Where do you tell Klaviyo to judge on orders instead of clicks?"],
      fSize: ["How many of the list get a version during the test?", "Where do you set the share of people in the test?"],
      fDuration: ["How long does Klaviyo wait before sending the winner to everyone else?", "Which setting sets the test window?"],
      fSend: ["When does the email land in inboxes?", "Which setting says whose clock the send follows?"] };
    const WHY = { fStrategy: "Test strategy picks one winner for everyone (Standard A/B test) or a version per person (Personalized). It only shows on lists over 400,000.",
      fMetric: "Winning metric is the number Klaviyo uses to pick the winner: open rate, click rate or placed order rate.",
      fSize: "Test size is the share of the list that gets A or B during the test. The rest wait for the winner.",
      fDuration: "Test duration is how long the test runs before the winner goes to everyone else. You can only set it when the test size is under 100%.",
      fSend: "The send time says when it goes, and whether it follows one clock or each person's local timezone." };
    Object.assign(c, { title: pick(r, Q[kind]), meta: "Which setting on the form answers it?",
      vis: kform({ list, strategy: "Winning variation (Standard A/B test)", metric: "Placed order rate", size: 20, duration: "24 hours", send: SENDS[0], show: ["strategy", "metric", "size", "duration", "send"] }),
      answer: kind, target: "kf-" + kind.slice(1).toLowerCase(), why: WHY[kind],
      hint: "Five settings, top to bottom: test strategy, winning metric, test size, test duration, send time." });
    return c;
  }

  if (U.id === "U4b" || (U.id === "U4d" && (kind === "personalized" || kind === "small"))) {
    const small = kind === "small", pers = kind === "personalized";
    const L = small ? pick(r, ["250,000", "180,000"]) : list;
    const vis = kform({ list: L, strategy: small ? null : pers ? "Personalized variations for each recipient" : "Winning variation (Standard A/B test)",
      metric: U.id === "U4d" ? METRIC_NAME[rightM] : null, show: U.id === "U4d" ? ["strategy", "metric"] : ["strategy"] });
    Object.assign(c, { title: change, meta: U.id === "U4d" ? "Check the test strategy, then the winning metric." : "Check one setting: test strategy.",
      vis: { ...vis, pre: { quote: `<b>Theo's brief.</b> Testing ${lc(change)}. ${goal} List: ${L} profiles.` } },
      answer: pers ? "personalized" : "setupOk", target: "kf-strategy",
      hint: "Ask: will Klaviyo split people by chance, or pick a version for each person? Only a split by chance gives a clean comparison.",
      why: pers ? `"Personalized variations for each recipient" has Klaviyo send each person the version it predicts they'll like. That's a choice, not a coin, so A's and B's people differ before the email does anything, like "chosen" in Unit 1. To learn which version is better, pick the Standard A/B test.`
        : small ? `This list has ${L} profiles. Klaviyo only shows the test strategy choice above 400,000, so it's a standard A/B test by default. Fine.`
        : `"Winning variation (Standard A/B test)" splits people by chance and picks one winner. That's a clean comparison.` + (U.id === "U4d" ? ` ${mWhy}` : "") });
    return c;
  }

  if (U.id === "U4c") {
    let goalTxt = goal, ch = change, right = rightM, why = mWhy, channel = "Email", metrics;
    if (kind === "opensGoal") { [ch, goalTxt] = pick(r, OPEN_GOALS); right = "mClick"; why = "Apple Mail Privacy Protection opens emails by machine, so open rate counts opens no person made. Click rate is the closest honest number for 'did people read it'."; }
    if (kind === "clicks") { const b = pick(r, BRIEFS.filter((x) => x[2] === "mClick")); [ch, goalTxt, right, why] = b; }
    if (kind === "orders") { const b = pick(r, BRIEFS.filter((x) => x[2] === "mOrder")); [ch, goalTxt, right, why] = b; }
    if (kind === "sms") { channel = "SMS"; metrics = ["Click rate", "Placed order rate"]; ch = pick(r, ["a coffee emoji in the text", "the bundle-builder link vs the beans page link"]);
      goalTxt = "Which one sells more?"; right = "mOrder"; why = "The question is about sales, so placed order rate. SMS has no open rate at all in Klaviyo."; }
    Object.assign(c, { crumb: `Campaigns / ${channel === "SMS" ? "SMS campaign" : "Daily campaign"} / A/B test`, title: ch, meta: "Which winning metric matches the brief?",
      vis: { ...kform({ channel, list, metric: null, metrics, show: ["metric"] }), pre: { quote: `<b>Theo's brief.</b> Testing ${lc(ch)}. ${goalTxt}` } },
      opts: (metrics || ["Open rate", "Click rate", "Placed order rate"]).map((m) => [{ "Open rate": "mOpen", "Click rate": "mClick", "Placed order rate": "mOrder" }[m], m]),
      answer: right, target: "kf-metric",
      hint: "Match the metric to the brief's question: orders or money means placed order rate, visits mean click rate. Open rate is inflated by Apple's machine opens.",
      why });
    return c;
  }

  if (U.id === "U4d") {   // setupOk or wrongMetric
    const wrong = kind === "wrongMetric";
    const m = wrong ? (rightM === "mOrder" ? pick(r, ["mOpen", "mClick"]) : "mOpen") : rightM;
    Object.assign(c, { title: change, meta: "Check the test strategy, then the winning metric.",
      vis: { ...kform({ list, strategy: "Winning variation (Standard A/B test)", metric: METRIC_NAME[m], show: ["strategy", "metric"] }), pre: brief() },
      answer: wrong ? "wrongMetric" : "setupOk", target: wrong ? "kf-metric" : null,
      hint: "Two checks in order: is the strategy the Standard A/B test, and does the winning metric match the brief's question?",
      why: wrong ? `The brief asks "${goal}" but Klaviyo will judge on ${METRIC_NAME[m].toLowerCase()}. ${mWhy} With a test size under 100%, the wrong winner goes to everyone else.`
                 : `Standard A/B test, and ${METRIC_NAME[m].toLowerCase()} matches the brief. ${mWhy}` });
    return c;
  }

  if (U.id === "U4e") {
    let size = pick(r, [10, 20, 30]), dur = pick(r, ["24 hours", "48 hours"]), send = SENDS[0], metric = "Placed order rate", target = null, why;
    if (kind === "localSize") { send = SENDS[1]; target = "kf-size"; why = `It's sent in each recipient's local timezone, so people get it at different hours. Klaviyo needs a 100% test size for a content test sent that way: a winner can't go out to "the rest" when some time zones have already sent.`; }
    else if (kind === "tooShort") { dur = pick(r, ["2 hours", "4 hours"]); target = "kf-duration"; why = `Klaviyo judges on placed order rate after only ${dur}. Orders trickle in over a day or more, so the early leader is mostly luck. Klaviyo suggests a longer window for placed order rate.`; }
    else if (kind === "full") { size = 100; send = pick(r, SENDS); dur = "Not set: the test size is 100%"; why = `Test size is 100%, so everyone gets A or B and there's no winner to send later. That's a full read, and it works for any send time.`; }
    else { send = pick(r, [SENDS[0], SENDS[2]]); why = `${size}% of the list in the test, ${dur} to gather orders, one clock for the send. The winner goes to the rest after that.`; }
    Object.assign(c, { title: change, meta: "Check the test size, the send time and the test duration.",
      vis: kform({ list, metric, size, duration: dur, send, show: ["metric", "size", "duration", "send"] }), answer: kind === "full" ? "setupOk" : kind, target, why,
      hint: "Local-timezone sends need a 100% test size. A placed-order winner needs a day or more. If the size is 100%, there's no duration to set." });
    return c;
  }

  if (U.id === "U4f") {
    const email = pick(r, ["Welcome email 2", "Cart email 1", "Post-purchase email 3"]);
    const ab = kind === "needsSplit" ? null : pick(r, [["founder story", "product grid"], ["reviews block", "no reviews block"], ["short copy", "long copy"]]);
    const wait = kind === "needsSplit" ? pick(r, ["a 1-day wait instead of 2 days before it", "a 4-hour wait instead of 1 day before it"]) : null;
    Object.assign(c, { crumb: "Flows / " + email.split(" email")[0] + " flow / A/B test", title: kind === "needsSplit" ? `Testing ${wait}` : `${email}: ${ab[0]} vs ${ab[1]}`,
      meta: "The flow email's A/B Test tab. Is this set up right?",
      vis: { kflow: { email, vars: ab ? [["A: " + ab[0], 50], ["B: " + ab[1], 50]] : [["A: 2-day wait", 50], ["B: 1-day wait", 50]], auto: kind === "autoDist",
        metric: "Click rate", end: "End test by statistical significance", wait: !!wait } },
      answer: kind, target: kind === "autoDist" ? "kq-auto" : kind === "needsSplit" ? "kq-what" : null,
      hint: "Two things to look for: is \"automatically choose distribution\" ticked, and is the change something a flow email A/B can hold (content, not a wait)?",
      why: kind === "autoDist" ? `"Automatically choose distribution" moves more people to whichever version is ahead. The 50/50 split drifts, people who arrive later aren't split the same way as earlier ones, and GrowthBook will flag a sample ratio mismatch. Untick it and keep the weights fixed.`
        : kind === "needsSplit" ? `A flow email's A/B test can change the email, not the time before it. To test a wait, add a Split with a Random sample path and put a different wait on each branch.`
        : `Fixed 50/50 weights, a content change inside one email, and a winner picked on click rate. That's what a flow email A/B can do.` });
    return c;
  }

  // U4g: pre-flight. A and B side by side; at most one planted problem.
  const subj = pick(r, ["New roasts, built for Monday", "Your next pair is here"]), hero = pick(r, [["Static hero", "GIF hero"], ["4-product grid", "6-product grid"]]);
  const rows = { change: [hero[0], hero[1]], subject: [subj, subj], code: ["BREW15 works", "BREW15 works"], link: ["Shop beans → /beans", "Shop beans → /beans"], send: [SENDS[0], SENDS[0]] };
  if (kind === "twoChanged") rows.subject = [subj, pick(r, ["Roasted this week", "Beans worth waking up for"])];
  if (kind === "codeBroken") { const k = pick(r, ["code", "link"]); rows[k] = k === "code" ? ["BREW15 works", "BREW15: \"code not valid\""] : ["Shop beans → /beans", "Shop beans → /bean (404)"]; }
  if (kind === "sendTime") rows.send = [SENDS[0], "Tuesday 2:00 PM, Eastern"];
  c.guide = [{ k: "change", name: "One change", look: "Compare A and B line by line. Only the tested part may differ.", bad: "twoChanged", els: ["pf-change", "pf-subject"] },
             { k: "code", name: "Codes and links", look: "Does every code and link work in both?", bad: "codeBroken", els: ["pf-code", "pf-link"] },
             { k: "send", name: "Send time", look: "Do both go out at the same moment?", bad: "sendTime", els: ["pf-send"] }];
  c.guided = !!U.guided && stage === 0;
  Object.assign(c, { title: `Pre-flight: ${hero[0]} vs ${hero[1]}`, meta: "The test preview. Check it before it sends.",
    vis: { preview: rows }, answer: kind, target: { ready: null, twoChanged: "pf-subject", codeBroken: rows.code[0] !== rows.code[1] ? "pf-code" : "pf-link", sendTime: "pf-send" }[kind],
    gtarget: { ready: null, twoChanged: "change", codeBroken: "code", sendTime: "send" }[kind],
    hint: "Three checks in order: only one thing changed, every code and link works in both, and both send at the same moment.",
    why: kind === "ready" ? `Only ${hero[0]} vs ${hero[1]} differs, codes and links work in both, same send time. Ready.`
      : kind === "twoChanged" ? `The subject line changed too. If B wins, you can't tell whether the ${lc(hero[1])} or the new subject did it. One change per test.`
      : kind === "codeBroken" ? `One version has a broken ${rows.code[0] !== rows.code[1] ? "code" : "link"}. B would "lose" because of the bug, not the idea. Fix it before sending.`
      : `A goes out at 10 AM and B at 2 PM. Different hours bring different people to their inbox, and Smart Sending can skip different people in each. Same moment for both.` });
  return c;
}

// ---------- lessons ----------
const DEMO = { list: "720,000", strategy: "Winning variation (Standard A/B test)", metric: "Placed order rate", size: 20, duration: "24 hours", send: SENDS[0] };
export const LESSONS4 = {
  U4a: [
    { h: "Klaviyo's A/B form has five settings that matter.",
      p: "You open a campaign, click Create A/B test above the subject line, and get this form. Each setting answers one question about the test.",
      vis: kform({ ...DEMO, show: ["strategy", "metric", "size", "duration", "send"], explain: true }) },
    { h: "Test size and duration: a small test first, then the winner goes to everyone else.",
      p: "With a 20% test size, 144,000 of the 720,000 get A or B. After 24 hours, Klaviyo sends the winner to the other 576,000.",
      predict: { q: "With a test size of 100%, what does the duration do?", opts: ["Sets the test window", "Nothing: there's no one left to send to"], answer: 1,
        reveal: "Nothing. Everyone already got A or B, so there's no winner to send later. Klaviyo only lets you set a duration when the size is under 100%." },
      vis: kform({ ...DEMO, show: ["size", "duration"] }) },
  ],
  U4b: [
    { h: "Personalized variations aren't a coin.",
      p: "On lists over 400,000, Klaviyo asks for a test strategy. \"Personalized variations for each recipient\" sends each person the version Klaviyo predicts they'll engage with.",
      predict: { q: "Are A's people and B's people alike before the email lands?", opts: ["Yes", "No"], answer: 1,
        reveal: "No. Klaviyo chose them, so it's like \"chosen\" in Unit 1. Good for sending, useless for learning which version is better. To learn, pick <b>Winning variation (Standard A/B test)</b>." },
      vis: kform({ list: "720,000", strategy: "Personalized variations for each recipient", show: ["strategy"] }) },
    { h: "Under 400,000 profiles, the choice doesn't appear.",
      p: "A smaller list gets the standard test by default. Nothing to check.",
      vis: { tags: { fair: "Clean", bad: "No clean read" }, examples: [
        ["fair", "720,000 profiles, Winning variation (Standard A/B test)"],
        ["fair", "250,000 profiles, no test strategy shown"],
        ["bad", "720,000 profiles, Personalized variations for each recipient"],
      ] } },
  ],
  U4c: [
    { h: "The winning metric should answer the brief's question.",
      p: "Klaviyo offers open rate, click rate and placed order rate for email (click and placed order for SMS). It picks the winner on the one you choose, then sends that winner to everyone else.",
      predict: { q: "The brief asks which hero sells more beans. Which metric?", opts: ["Open rate", "Click rate", "Placed order rate"], answer: 2,
        reveal: "Placed order rate. A hero that gets clicks but fewer orders would \"win\" on clicks and go to 576,000 people." },
      vis: kform({ list: "720,000", metric: null, show: ["metric"] }) },
    { h: "Open rate counts machines.",
      p: "Apple Mail Privacy Protection opens emails on Apple's servers, whether or not a person reads them. Open rates swell with opens no person made, so even a subject-line test is better judged on clicks.",
      vis: { tags: { fair: "Use it", bad: "Avoid" }, examples: [
        ["fair", "Orders or money → Placed order rate"],
        ["fair", "Visits to a page, or 'did people read it' → Click rate"],
        ["bad", "Open rate, for anything (Apple's machine opens)"],
      ] } },
  ],
  U4d: [
    { h: "Two checks, in order: test strategy, then winning metric.",
      p: "Read the brief first. Then the strategy must be the Standard A/B test, and the metric must answer the brief's question.",
      vis: { checks: [["Test strategy", "Personalized variations? No clean read."], ["Winning metric", "Doesn't match the brief? Wrong metric."]] } },
  ],
  U4e: [
    { h: "Local time means everyone has to be in the test.",
      p: "A send in each recipient's local timezone goes out hour by hour around the world. There's no moment when \"the rest\" are all still waiting.",
      predict: { q: "A local-timezone content test. What test size does Klaviyo need?", opts: ["20%", "100%"], answer: 1,
        reveal: "100%. Everyone gets A or B, and there's no winner to send later." },
      vis: kform({ ...DEMO, send: SENDS[1], show: ["size", "send"] }) },
    { h: "Orders need time to arrive.",
      p: "Clicks come in minutes. Orders come over a day or more. A placed-order winner picked after 2 hours is mostly luck, and Klaviyo suggests a longer window for placed order rate.",
      vis: { tags: { fair: "Fine", bad: "Off" }, examples: [
        ["fair", "20%, placed order rate, 24 hours, one clock"],
        ["fair", "100%, any send time, no duration"],
        ["bad", "20% with the recipient's local timezone"],
        ["bad", "Placed order rate judged after 2 hours"],
      ] } },
  ],
  U4f: [
    { h: "In a flow, keep the weights fixed.",
      p: "A flow email's A/B tab sets a weight per version. \"Automatically choose distribution\" moves more people to the leader as the test runs.",
      predict: { q: "Week 1 is 50/50, week 3 is 80/20. Are week 3's B people like week 1's?", opts: ["Yes", "No"], answer: 1,
        reveal: "No. The split now depends on when people arrived, and GrowthBook flags a sample ratio mismatch. Untick it and keep 50/50." },
      vis: { kflow: { email: "Welcome email 2", vars: [["A: founder story", 50], ["B: product grid", 50]], auto: true, metric: "Click rate", end: "End test by statistical significance" } } },
    { h: "A flow A/B changes an email. A wait needs a split.",
      p: "To test a shorter wait, add a Split with a Random sample path and put a different wait on each branch. That's the coin from Unit 3.",
      vis: { tags: { fair: "Flow A/B", bad: "Needs a split" }, examples: [
        ["fair", "Founder story vs product grid in welcome email 2"],
        ["fair", "Subject line of cart email 1"],
        ["bad", "A 1-day wait instead of 2 days before email 2"],
      ] } },
  ],
  U4g: [
    { h: "Before it sends, check three things.",
      p: "Compare A and B side by side. The first few previews walk you through the checks: answer Clear or Blocked for each one.",
      vis: { checks: [["One change", "Only the tested part differs between A and B."], ["Codes and links", "Every code and link works in both."], ["Send time", "Both go out at the same moment."]] } },
  ],
};
