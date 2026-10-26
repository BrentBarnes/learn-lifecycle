// U5 Which number decides: denominators, the three jobs a metric can have, machine-made numbers, picking the decider,
// ratio traps, attributed vs caused, then a copy of GrowthBook's Create Experiment metric fields to check.
// Practised in parts like the other units. Definitions follow Klaviyo's help center and research/v2/06 (M1 to M7, M12).
// Made-up people and numbers.

export const CALLS5 = [
  { id: "jDecide", label: "Decides", stamp: "Decides" },
  { id: "jGuard", label: "Guardrail", stamp: "Guardrail" },
  { id: "jExplain", label: "Explains", stamp: "Explains" },
  { id: "realNum", label: "People did it", stamp: "Real" },
  { id: "machineOpens", label: "Machine opens", stamp: "Machine opens" },
  { id: "botClicks", label: "Bot clicks", stamp: "Bot clicks" },
  { id: "trustNum", label: "Trust the number", stamp: "Trusted" },
  { id: "wrongDenom", label: "Wrong denominator", stamp: "Wrong base" },
  { id: "attributed", label: "Attributed, not caused", stamp: "Attributed" },
  { id: "gbOk", label: "Set up right", stamp: "Looks right" },
  { id: "opensDecide", label: "Opens decide", stamp: "Opens decide" },
  { id: "noGuard", label: "No guardrail", stamp: "No guardrail" },
];

const PART = { screen: "scene", tabs: [], parent: "U5", daily: false, pass: [5, 6] };
export const UNITS5 = {
  U5a: { ...PART, id: "U5a", step: 1, name: "Per what?", calls: [],
         kinds: ["open", "click", "order", "rpr", "aov", "cto", "unsub", "entrant"], meet: ["open", "aov", "click"] },
  U5b: { ...PART, id: "U5b", step: 2, name: "Three jobs", calls: ["jDecide", "jGuard", "jExplain"],
         kinds: ["jDecide", "jGuard", "jExplain", "jExplain", "jGuard", "jDecide"], meet: ["jDecide", "jGuard", "jExplain"] },
  U5c: { ...PART, id: "U5c", step: 3, name: "Machine-made numbers", calls: ["realNum", "machineOpens", "botClicks"],
         kinds: ["machineOpens", "botClicks", "realNum", "machineOpens", "botClicks", "realNum"], meet: ["machineOpens", "botClicks", "realNum"] },
  U5d: { ...PART, id: "U5d", step: 4, name: "Steps 2 and 3 together", calls: [],
         kinds: ["campaign", "sms", "flow", "form", "campaign", "flow", "subject"], meet: ["campaign", "subject", "flow"], pass: [6, 7] },
  U5e: { ...PART, id: "U5e", step: 5, name: "Ratio traps", calls: ["trustNum", "wrongDenom"],
         kinds: ["aovTrap", "perClick", "perReceiver", "rprOk", "entrantOk", "aovTrap"], meet: ["aovTrap", "rprOk", "perClick"] },
  U5f: { ...PART, id: "U5f", step: 6, name: "Attributed isn't caused", calls: ["trustNum", "attributed"],
         kinds: ["attributed", "trustNum", "attributed", "trustNum", "attributed", "trustNum"], meet: ["attributed", "trustNum", "attributed"] },
  U5g: { ...PART, id: "U5g", step: 7, name: "Set up the metrics", calls: ["gbOk", "opensDecide", "wrongDenom", "attributed", "noGuard"], guided: true,
         kinds: ["gbOk", "opensDecide", "wrongDenom", "attributed", "noGuard", "gbOk", "opensDecide", "noGuard"], meet: ["opensDecide", "noGuard", "gbOk"], pass: [7, 8], daily: true },
};

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = (r, a) => a[Math.floor(r() * a.length)];
const shuffle = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------- metrics: name, top, bottom (the denominator id), what it's good for ----------
const BASES = { delivered: "people it was delivered to", opened: "people who opened", clicked: "people who clicked", orders: "orders", entered: "people who entered the flow" };
const METRICS = {
  open: ["Open rate", "people who opened", "delivered", "Opens are inflated by Apple's machine opens, so it only explains, and weakly."],
  click: ["Click rate", "people who clicked", "delivered", "It explains how people got to the site. Klaviyo divides by delivered, not by opens."],
  order: ["Placed order rate", "people who ordered", "delivered", "Per person it was delivered to, so every recipient counts, buyer or not."],
  rpr: ["Revenue per recipient", "revenue", "delivered", "All the money divided by everyone it was delivered to. Usually the campaign decider."],
  aov: ["Average order value", "revenue", "orders", "Divided by orders, so it ignores everyone who didn't buy. It can rise while sales fall."],
  cto: ["Click-to-open rate", "people who clicked", "opened", "Divided by openers, and openers include Apple's machine opens."],
  unsub: ["Unsubscribe rate", "people who unsubscribed", "delivered", "Per person delivered. A guardrail."],
  entrant: ["Orders per entrant (30 days)", "orders in 30 days", "entered", "For a flow: everyone who entered, over a fixed window. Usually the flow decider."],
};

// test cards for the jobs and the decider
const CARDS = {
  campaign: { change: "GIF hero vs static hero in the daily campaign", decide: "rpr", guard: ["unsub", "Spam complaint rate"], explain: ["click", "aov", "open"],
              pool: ["rpr", "open", "click"], why: "Revenue per recipient counts every order from everyone the send reached. It's the closest number to money that a campaign test can see." },
  subject: { change: "Question subject line vs statement subject line", decide: "rpr", pool: ["open", "click", "rpr"],
             why: "Even for a subject line, the decider is revenue per recipient. Open rate counts Apple's machine opens, and more opens that don't buy help nobody." },
  sms: { change: "Bundle-builder link vs beans page in the Thursday SMS", decide: "rpr", guard: ["SMS opt-out rate"], pool: ["click", "rpr", "cto"],
         why: "Revenue per recipient. SMS has no opens, and clicks only explain how people got to the site." },
  flow: { change: "Reviews block in welcome email 2", decide: "entrant", guard: ["unsub"], explain: ["click", "open"], pool: ["click", "entrant", "order"],
          why: "Orders per entrant over 30 days: everyone who entered the flow, over a fixed window. A per-email rate only counts people who reached that email." },
  form: { change: "Spin-to-win sign-up form vs plain form", decideName: "First-order rate of new signups (30 days)", poolNames: ["Form submit rate", "Form views", "First-order rate of new signups (30 days)"],
          why: "Klaviyo judges form tests on submit rate, but a prize wheel can pull in people who never buy. First orders from the new signups is closer to money. Submit rate explains." },
};

const MACHINE = {
  machineOpens: [["Open rate +22% on B's subject line. Click rate and orders flat.", "Apple Mail Privacy Protection loads emails on Apple's servers, so opens rise and fall with no person reading. A real lift in reading would move clicks too."],
                 ["B's preview text: open rate +31%, mostly from Apple Mail. Revenue per recipient flat.", "Most of the gain is on Apple Mail, where opens are made by machines. Nothing downstream moved."]],
  botClicks: [["New layout: click rate +38%. Most of B's extra clicks land within 2 seconds of delivery. Orders flat.", "Nobody reads and clicks within 2 seconds. Security scanners at work inboxes click every link to check it. Bot-click exclusion in Klaviyo's settings filters many of these."],
              ["B's button: click rate +26%, nearly all from company domains, every link clicked at once. Orders flat.", "Clicking every link at once is what a link scanner does, and work domains run them. Orders didn't move."]],
  realNum: [["Free-shipping line: placed order rate +9%, click rate +6%, revenue per recipient +7%.", "Clicks, orders and money all moved together. That's what people buying looks like."],
            ["Reviews block: click rate +5%, placed order rate +4%, unsubscribe rate flat.", "Clicks and orders moved together and spread through the day. No machine pattern."]],
};

const TRAPS = {
  aovTrap: ["Theo: \"B's average order value is up 12%. Win!\" Placed order rate in B is down 9%, and revenue per recipient is down 4%.", "wrongDenom",
            "Average order value divides by orders, so it ignores everyone who stopped buying. B sold fewer, bigger orders and less money per recipient. Judge on revenue per recipient."],
  perClick: ["Priya: \"Revenue per click is up 15% in B.\" B's click rate is down 18%.", "wrongDenom",
             "Per click leaves out everyone B stopped from clicking. Fewer, keener clickers make per-click money look better while the send makes less. Divide by recipients."],
  perReceiver: ["Theo: \"Orders per person who got email 3 are up 10% in B.\" B adds a 2-day wait before email 3.", "wrongDenom",
                "B's wait changed who was still around to get email 3, so this counts after the split (Unit 1). Use orders per entrant over a fixed window."],
  rprOk: ["Priya: \"Revenue per recipient is up 6% in B.\" Average order value is flat.", "trustNum", "Revenue per recipient counts every order from everyone the send reached. The base is right."],
  entrantOk: ["Theo: \"Orders per entrant in 30 days are up 8% for B.\" Counted from the split, everyone who entered.", "trustNum", "Everyone who entered, over a fixed window. That's the right base for a flow."],
};

const ATTR = {
  attributed: [["Theo: \"Klaviyo says B's email drove $41,200 in attributed revenue, A's drove $35,900.\"", "Klaviyo credits an order to the last email someone clicked or opened in the 5 days before it. B gets credit for orders people would have placed anyway, and none for orders it caused without a click."],
               ["Priya: \"The welcome flow's revenue in Flows → Analytics is up 14% on the previous period.\"", "That's attributed revenue, and it's one period against another. Neither says what the change caused."],
               ["Theo: \"B's conversion value in the campaign report is $3,000 higher.\"", "Conversion value in the campaign report is attributed: credited to the email by the click or open window, not measured against a control."]],
  trustNum: [["Priya: \"All orders from people assigned to B, from any channel, are up 6% per recipient.\"", "It counts every order from everyone in each group, whether the email got credit or not. The groups were split by chance, so the gap is caused."],
             ["Theo: \"In GrowthBook, revenue per user for B is up 5%, counting all Shopify orders by assigned profiles.\"", "All orders by assigned people, read against A. That's what the test caused."],
             ["Priya: \"Orders per entrant in 30 days, from Shopify, up 7% for B.\"", "Every order from everyone who entered, against a control group. Not attribution."]],
};

const mName = (k) => METRICS[k] ? METRICS[k][0] : k;

export function makeU5(seed, kind, stage, U) {
  const r = rng(seed);
  const c = { screen: "scene", unit: U.id, kind, stage, seed, target: null, crumb: "Metrics" };

  if (U.id === "U5a") {
    const [name, top, base, note] = METRICS[kind];
    const others = shuffle(Object.keys(BASES).filter((b) => b !== base), r).slice(0, 2);
    Object.assign(c, { title: name, meta: "Fill in the bottom of the fraction.", vis: { fraction: { name, top, base: "?" } },
      q: "What does it divide by?", opts: shuffle([base, ...others], r).map((b) => [b, BASES[b]]), answer: base,
      hint: "Every rate is a count over a base. The base decides who counts: everyone it reached, only openers, only clickers, or only buyers.",
      why: `${name} = ${top} ÷ ${BASES[base]}. ${note}` });
    return c;
  }

  if (U.id === "U5b") {
    const ck = pick(r, ["campaign", "flow"]), card = CARDS[ck];
    const m = kind === "jDecide" ? mName(card.decide) : kind === "jGuard" ? mName(pick(r, card.guard)) : mName(pick(r, card.explain));
    Object.assign(c, { crumb: "Experiments / New experiment", title: m, meta: `Test: ${card.change}.`, vis: { quote: `<b>The test.</b> ${card.change}. One metric decides. Guardrails can stop a winner. The rest explain why.` },
      q: "What's this metric's job in this test?", answer: kind,
      hint: "One metric decides: the one closest to money. Guardrails watch for harm (unsubscribes, complaints, opt-outs). Everything else explains.",
      why: kind === "jDecide" ? `${m} decides. ${card.why}` : kind === "jGuard" ? `${m} is a guardrail: it watches for harm. If B wins on money but drives people away, the guardrail can stop it.`
        : `${m} explains. It helps you see why the decider moved, but it doesn't decide anything on its own.` });
    return c;
  }

  if (U.id === "U5c") {
    const [line, why] = pick(r, MACHINE[kind]);
    Object.assign(c, { crumb: "Experiments / Results", title: "Did people do this?", meta: "A result from this week's tests.", vis: { quote: line }, answer: kind,
      hint: "Opens that don't lead to clicks are often Apple's machine opens. Clicks in the first seconds or on every link at once are often security scanners. People leave a trail: opens, clicks and orders move together.",
      why });
    return c;
  }

  if (U.id === "U5d") {
    const card = CARDS[kind];
    const names = card.poolNames || card.pool.map(mName), right = card.decideName || mName(card.decide);
    Object.assign(c, { crumb: "Experiments / New experiment", title: card.change, meta: "Which metric should decide?",
      vis: { quote: `<b>The test.</b> ${card.change}.` }, opts: shuffle(names.slice(), r).map((n) => [n, n]), answer: right,
      hint: "Pick the number closest to money that this test can see. Not opens (machines), not a number that counts only some of the people.",
      why: card.why });
    return c;
  }

  if (U.id === "U5e" || U.id === "U5f") {
    let line, ans, why;
    if (U.id === "U5e") [line, ans, why] = TRAPS[kind]; else { [line, why] = pick(r, ATTR[kind]); ans = kind; }
    Object.assign(c, { crumb: "#email-tests", title: U.id === "U5e" ? "Is that the right base?" : "Did B cause that?", meta: "A teammate reports a result.",
      vis: { quote: line }, answer: ans,
      hint: U.id === "U5e" ? "Ask what the number divides by. If the base can shrink because of B (fewer orders, fewer clicks, fewer people reaching an email), the number can rise while the test loses."
                           : "Attributed revenue is credited to an email by a click or open window. A test reads all orders by everyone assigned to A or B, from any channel.",
      why });
    return c;
  }

  // U5g: GrowthBook's Create Experiment metrics, filled in by Priya. At most one problem.
  const ck = pick(r, ["campaign", "flow"]), card = CARDS[ck];
  let goal = mName(card.decide), sec = card.explain.map(mName).slice(0, 2), guard = card.guard.map(mName);
  if (kind === "opensDecide") goal = "Open rate";
  if (kind === "wrongDenom") goal = ck === "flow" ? "Orders per person who got email 2" : pick(r, ["Average order value", "Revenue per click"]);
  if (kind === "attributed") goal = ck === "flow" ? "Flow attributed revenue (Klaviyo)" : "Attributed revenue (Klaviyo, 5-day window)";
  if (kind === "noGuard") guard = [];
  sec = sec.filter((m) => m !== goal);
  c.guide = [{ k: "opens", name: "Not opens", look: "Is the goal metric an open rate?", bad: "opensDecide", els: ["gb-goal"] },
             { k: "base", name: "The base", look: "Does the goal divide by everyone in the test, not orders, clicks or the people who reached one email?", bad: "wrongDenom", els: ["gb-goal"] },
             { k: "caused", name: "Caused, not credited", look: "Does the goal count all orders by assigned people, not Klaviyo's attributed revenue?", bad: "attributed", els: ["gb-goal"] },
             { k: "guard", name: "Guardrails", look: "Is at least one harm metric set as a guardrail?", bad: "noGuard", els: ["gb-guard"] }];
  c.guided = !!U.guided && stage === 0;
  Object.assign(c, { crumb: "Experiments / New experiment", title: card.change, meta: "Priya filled in the metrics on GrowthBook's Create Experiment form. Is it set up right?",
    vis: { gbform: { name: card.change, goal: [goal], secondary: sec, guard } }, answer: kind,
    target: kind === "noGuard" ? "gb-guard" : kind === "gbOk" ? null : "gb-goal",
    gtarget: { gbOk: null, opensDecide: "opens", wrongDenom: "base", attributed: "caused", noGuard: "guard" }[kind],
    hint: "Four checks: the goal isn't opens, it divides by everyone in the test, it counts all orders rather than attributed revenue, and a guardrail is set.",
    why: kind === "gbOk" ? `${goal} decides, ${guard.join(" and ")} ${guard.length > 1 ? "guard" : "guards"} against harm, and ${sec.join(" and ")} explain. Set up right.`
      : kind === "opensDecide" ? `Open rate can't decide: Apple's machine opens inflate it, and opens aren't money. ${card.why}`
      : kind === "wrongDenom" ? `"${goal}" divides by a base B can change (orders, clicks, or the people who reached one email). ${card.why}`
      : kind === "attributed" ? `"${goal}" is credited by Klaviyo's click and open window, not caused by the test. The goal should count all orders by assigned people. ${card.why}`
      : `No guardrail. If B wins on money while unsubscribes jump, nothing set beforehand would stop it. Add ${mName(card.guard[0]).toLowerCase()}.` });
  return c;
}

// ---------- lessons ----------
export const LESSONS5 = {
  U5a: [
    { h: "Every rate is a count over a base.",
      p: "Klaviyo's click rate is people who clicked divided by people the email was delivered to. Click-to-open rate divides the same clicks by the people who opened.",
      predict: { q: "1,000 delivered, 400 opened, 40 clicked. What's the click rate?", opts: ["4%", "10%"], answer: 0,
        reveal: "4%: 40 ÷ 1,000. The 10% is click-to-open: 40 ÷ 400. Same clicks, different base, different story." },
      vis: { fraction: { name: "Click rate", top: "people who clicked", base: "people it was delivered to" } } },
    { h: "The base decides who counts.",
      p: "Divide by everyone it reached and every recipient counts. Divide by openers, clickers or orders and the people who didn't do that disappear.",
      vis: { tags: { fair: "Everyone", bad: "Some" }, examples: [
        ["fair", "Revenue per recipient: revenue ÷ delivered"],
        ["fair", "Placed order rate: people who ordered ÷ delivered"],
        ["bad", "Average order value: revenue ÷ orders"],
        ["bad", "Click-to-open rate: clickers ÷ openers"],
      ] } },
  ],
  U5b: [
    { h: "A metric has one of three jobs.",
      p: "Before launch, one metric is set to <b>decide</b>. A few <b>guardrails</b> watch for harm and can stop a winner. Everything else <b>explains</b> why the decider moved. GrowthBook's form calls these Goal, Guardrail and Secondary metrics.",
      predict: { q: "GIF hero test. Unsubscribe rate's job?", opts: ["Decides", "Guardrail", "Explains"], answer: 1,
        reveal: "Guardrail. You'd never ship for fewer unsubscribes alone, but a winner that drives people off the list should stop." },
      vis: { gbform: { name: "GIF hero vs static hero", goal: ["Revenue per recipient"], secondary: ["Click rate", "Average order value"], guard: ["Unsubscribe rate", "Spam complaint rate"] } } },
  ],
  U5c: [
    { h: "Some numbers are made by machines.",
      p: "Apple Mail Privacy Protection loads every email on Apple's servers, so opens happen whether anyone reads or not. Security scanners at work inboxes click every link to check it.",
      predict: { q: "Opens +22%, clicks and orders flat. What happened?", opts: ["People read more", "Machine opens"], answer: 1,
        reveal: "Most likely machine opens. People who read more also click more. When only opens move, suspect Apple." },
      vis: { quote: "Open rate +22% on B's subject line. Click rate and orders flat." } },
    { h: "People leave a trail.",
      p: "Real interest shows up as opens, clicks and orders moving together, spread through the day. Machines leave odd shapes.",
      vis: { tags: { fair: "People", bad: "Machine" }, examples: [
        ["fair", "Clicks +6%, orders +9%, spread through the day"],
        ["bad", "Opens +22%, clicks and orders flat"],
        ["bad", "Clicks +38% within 2 seconds of delivery, orders flat"],
      ] } },
  ],
  U5d: [
    { h: "The decider is the number closest to money that the test can see.",
      p: "For a campaign that's revenue per recipient. For a flow, orders per entrant over a fixed window. Never opens. For a sign-up form, orders from the new signups beat submit rate.",
      vis: { checks: [["Close to money", "Orders or revenue, not opens or clicks."], ["Everyone counts", "Divided by everyone in the test."], ["Not made by machines", "No open rates."]] } },
  ],
  U5e: [
    { h: "A rate can rise while the test loses.",
      p: "B sells fewer orders, but each one is bigger. Average order value rises, because it only divides by orders.",
      predict: { q: "AOV +12%, placed order rate −9%. Did B make more money per send?", opts: ["Yes", "Probably not"], answer: 1,
        reveal: "Probably not. Revenue per recipient is the number that answers that, and here it fell 4%. When B can change the base, the rate can lie." },
      vis: { fraction: { name: "Average order value", top: "revenue", base: "orders" } } },
  ],
  U5f: [
    { h: "Attributed revenue is credit, not cause.",
      p: "Klaviyo credits an order to the last email someone opened or clicked in the 5 days before it. A test instead counts all orders by everyone in A and everyone in B, from any channel, and compares.",
      predict: { q: "Maya opened B's email, then bought from an Instagram ad. Klaviyo credits B. Did B cause the order?", opts: ["Yes", "Can't tell from credit"], answer: 1,
        reveal: "Can't tell. Credit follows the last touch. Only the comparison with A, where the coin made the groups alike, says what B caused." },
      vis: { quote: "Theo: \"Klaviyo says B's email drove $41,200 in attributed revenue, A's drove $35,900.\"" } },
  ],
  U5g: [
    { h: "Now check a full setup on GrowthBook's form.",
      p: "Four checks in order. The first few forms walk you through them: answer Clear or Blocked for each one.",
      vis: { checks: [["Not opens", "The goal isn't an open rate."], ["The base", "The goal divides by everyone in the test."], ["Caused", "All orders by assigned people, not attributed revenue."], ["Guardrails", "At least one harm metric."]] } },
  ],
};
