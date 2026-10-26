// Short lessons, one per U1 and U2 step, shown before the step's first rep and replayable from the path.
// Each screen: h = the sentence to walk away with, p = the situation, vis = what to draw, predict = a guess before the reveal.
// Rules from TEACHING.md: situation first, the term arrives attached to the example, show / break / fix, rule last.
// Made-up people and numbers.

import { LESSONS3 } from "./u3.mjs";
import { LESSONS4 } from "./u4.mjs";
import { LESSONS5 } from "./u5.mjs";
import { LESSONS6 } from "./u6.mjs";

const EX = {   // the example card the lessons point at
  change: "A GIF hero in the daily campaign", surface: "Daily campaign",
  fields: { assign: "Klaviyo A/B test, random 50/50 split", count: "Everyone the send went to", when: "Same Tuesday, same 10 a.m. send" },
  liftTxt: "up 14%",
};
export const LESSON_CARD = EX;

// U2 boards: bar(row, first week, weeks, name, reader, offer). Rows 0-4: daily campaign, SMS, welcome, cart, post-purchase.
// Weeks 0-7: Oct 26, Nov 2, Nov 9, Nov 16, Nov 23, Nov 30, Dec 7, Dec 14.
const bar = (row, start, len, name, reader, offer = false) => ({ row, start, len, name, reader, offer });
const B0 = [bar(0, 1, 2, "GIF hero vs static", "Theo"), bar(1, 3, 1, "Coffee emoji in the text", "Priya"),
            bar(2, 0, 3, "Founder story in email 1", "Rosa"), bar(3, 5, 2, "Reviews block in cart email 1", "Priya")];
const NEW0 = bar(1, 1, 2, "Bundle-builder link vs beans page", "Theo");
const FITS_TAGS = { fair: "Fits", bad: "Blocked" };

export const LESSONS = {
  U1a: [
    { h: "A test sends two versions at the same time and compares them.",
      p: "Theo wants to know if a GIF at the top of the daily email sells more beans. Half the list gets the usual email. That's <b>A</b>. The other half gets the email with the GIF. That's <b>B</b>. A week later he compares how much each half spent.",
      vis: { piles: { a: 0, b: 0, la: "A: the usual email", lb: "B: the GIF email" } } },
    { h: "Every test can be written as five lines.",
      p: "This is the setup card you'll see in this unit. Each line answers one question about the test.",
      vis: { card: "explain" } },
    { h: "The three middle lines decide whether you can believe the last one.",
      p: "A big result means nothing if the two groups weren't alike to begin with. The next steps teach one middle line at a time. First, get used to where each answer lives on the card.",
      vis: { card: ["assign", "count", "when"] } },
  ],
  U1b: [
    { h: "A coin gives both groups the same mix of people.",
      p: "100 people are on the list. The gold ones were already keen buyers before the test. Klaviyo flips a coin for each person to put them in A or B.",
      predict: { q: "Which group ends up with more keen buyers?", opts: ["A", "B", "About the same"], answer: 2,
        reveal: "About the same, 15 and 16. A coin can't see who's keen, so each side gets a similar share. If B then sells more, the email did it." },
      vis: { piles: { a: 15, b: 16, la: "A, by coin", lb: "B, by coin", after: true } } },
    { h: "When someone chooses who gets B, B can win before the email does anything.",
      p: "Same 100 people. This time Theo sends B to Engaged 30, the people who opened an email in the last 30 days, and A to everyone else.",
      predict: { q: "Which group has more keen buyers?", opts: ["A", "B", "About the same"], answer: 1,
        reveal: "B, 38 to 6. B's group started ahead, so its numbers would beat A's even if the GIF did nothing. A hidden head start like this is called a <b>confounder</b>." },
      vis: { piles: { a: 6, b: 38, la: "A: everyone else", lb: "B: Engaged 30", after: true } } },
    { h: "Ask one question: what decided who got B?",
      p: "A person, a list, a segment or something people did before the test means B was <b>chosen</b>. A coin, or something just as blind as a coin, is <b>fair</b>.",
      vis: { examples: [
        ["fair", "Klaviyo A/B test, random 50/50 split"],
        ["fair", "Even profile IDs got B, odd IDs got A. A profile ID has nothing to do with how someone shops, so it splits like a coin."],
        ["bad", "B went to Engaged 30, A to everyone else"],
        ["bad", "People on the early-access list got B"],
        ["bad", "Theo picked the 20,000 most active customers for B"],
        ["bad", "Bean buyers got B, gear-only buyers got A"],
      ] } },
  ],
  U1c: [
    { h: "A fair split can still be ruined by who you count.",
      p: "Klaviyo split 100 people with a coin. Each side has about 15 keen buyers out of 50. So far, fair.",
      vis: { piles: { a: 15, b: 15, la: "A", lb: "B" } } },
    { h: "Counting only openers lets the email pick who's in the numbers.",
      p: "B has an odd subject line, so mostly keen people open it. The report counts only people who opened.",
      predict: { q: "Whose counted group is keener?", opts: ["A's", "B's", "About the same"], answer: 1,
        reveal: "B's. B lost most of its less keen people before anyone counted, 26 of 50 dropped. Now B's numbers come from its keenest people and A's don't. That's <b>counting after the split</b>." },
      vis: { piles: { a: 15, b: 15, ca: 40, cb: 24, la: "A, openers only", lb: "B, openers only", after: true } } },
    { h: "Count everyone who was put in a group.",
      p: "Count everyone from the moment they were put in A or B, whether they opened, clicked or unsubscribed. That's called <b>intention-to-treat</b>. Anything that keeps only people who did something afterwards is counted after the split.",
      vis: { examples: [
        ["fair", "Everyone the send went to"],
        ["fair", "Everyone assigned at the split, opened or not"],
        ["bad", "Only people who opened"],
        ["bad", "Only people who clicked"],
        ["bad", "People who reached email 3 (B adds a 2-day wait before it)"],
        ["bad", "People still subscribed 30 days later"],
      ] } },
  ],
  U1d: [
    { h: "Now check two lines, in order. Stop at the first one that's off.",
      p: "First <b>who got B</b>, then <b>who was counted</b>. If both pass, it's a fair test. For the first few cards the page walks you down the lines one at a time: answer Looks fair or It's off for each line.",
      vis: { card: ["assign", "count"] } },
  ],
  U1e: [
    { h: "Comparing one month with another mixes in everything else that changed.",
      p: "B ran in October. Theo compares it with A's numbers from September. October also brought colder weather, the fall roast drop and a sitewide sale on Oct 10.",
      predict: { q: "Can you tell how much of October's jump came from B?", opts: ["Yes", "No"], answer: 1,
        reveal: "No. Any of those three could explain the jump, and there's no A group sitting in October to compare with." },
      vis: { timeline: [["September", "A only", []], ["October", "B only", ["colder weather", "the fall roast drop", "a sitewide sale"]]] } },
    { h: "A and B have to run at the same time.",
      p: "Side by side, whatever else happens hits both groups. A comparison of one period against another is called <b>before and after</b>, and it has no control group.",
      vis: { examples: [
        ["fair", "Same Tuesday, same 10 a.m. send"],
        ["fair", "Both versions ran over the same four weeks"],
        ["bad", "B ran in October, compared with A's numbers from September"],
        ["bad", "This year's version (B) against last year's (A)"],
        ["bad", "The two weeks after launch against the two weeks before"],
      ] } },
  ],
  U1f: [
    { h: "All three lines, in order: who got B, who was counted, when.",
      p: "Same habit, one more line. Stop at the first line that's off and name what broke. If all three pass, it's a fair test. The first few cards walk you down the lines again.",
      vis: { card: ["assign", "count", "when"] } },
  ],
  U1g: [
    { h: "At work nobody fills in the card. The three facts are in the message.",
      p: "A message from Theo or Priya holds the same three lines. Find each one in what they wrote, then check it the same way.",
      vis: { slack: [["assign", "We sent B to Engaged 30 and A to everyone else"], ["when", "Both went out Tuesday at 10"], ["count", "Counting everyone it went to"], ["", "B is up 22% on revenue per recipient. Ship it?"]] } },
  ],

  // ---------- U2 the board ----------
  U2a: [
    { h: "Each row is a place a test runs. Each column is a week.",
      p: "This is the test board for Oct 26 to Dec 20. A bar is one test. It sits on the row of the send it changes and stretches across the weeks it runs.",
      predict: { q: "How many weeks does \"Founder story in email 1\" run?", opts: ["1", "2", "3"], answer: 2,
        reveal: "Three: Oct 26, Nov 2 and Nov 9. Count the columns the bar covers." },
      vis: { board: { cards: B0, offers: false } } },
    { h: "Two tests share a week when both bars sit in the same column.",
      p: "The dashed bar is a new test someone wants to add. The gold outline marks another test. Look straight up and down the new bar's columns.",
      predict: { q: "Does the new card share a week with \"Founder story in email 1\"?", opts: ["Yes", "No"], answer: 0,
        reveal: "Yes, Nov 2 and Nov 9. Both bars sit in those two columns, even though they're on different rows." },
      vis: { board: { cards: B0, card: NEW0, marked: 2, offers: false } } },
    { h: "Bars that touch end to end don't share a week.",
      p: "Same board. Now the gold outline marks the emoji test.",
      predict: { q: "Does the new card share a week with \"Coffee emoji in the text\"?", opts: ["Yes", "No"], answer: 1,
        reveal: "No. The new card ends the week of Nov 9 and the emoji test starts the week of Nov 16. The bars touch, but no column holds both." },
      vis: { board: { cards: B0, card: NEW0, marked: 1, offers: false } } },
  ],
  U2b: [
    { h: "Klaviyo splits a send once.",
      p: "Theo is testing a GIF hero on the daily campaign, Nov 2 to Nov 9. Priya wants to test a question subject line on the same campaign the week of Nov 9. Klaviyo's A/B test splits each send one time, so on Nov 9 both changes would ride on the same B.",
      predict: { q: "If B wins on Nov 9, which change gets the credit?", opts: ["The GIF", "The subject line", "You can't tell"], answer: 2,
        reveal: "You can't tell. B carried both changes, so their effects are mixed together. So the board allows <b>one test per row at a time</b>. This game calls it gate 1. Teams call the problem a <b>test collision</b>." },
      vis: { board: { cards: [bar(0, 1, 2, "GIF hero vs static", "Theo"), bar(2, 4, 2, "Founder story in email 1", "Rosa")], card: bar(0, 2, 1, "Question subject line", "Priya"), offers: false } } },
    { h: "Other rows don't count for this check.",
      p: "SMS runs its own test in the same weeks. That's a different send, split by its own coin.",
      predict: { q: "Can the new welcome flow card run Nov 9 to Nov 16?", opts: ["Yes", "No"], answer: 0,
        reveal: "Yes. Its own row, Welcome flow, is empty those weeks. The GIF and emoji tests share the weeks but sit on other rows, each with its own split." },
      vis: { board: { cards: [bar(0, 1, 2, "GIF hero vs static", "Theo"), bar(1, 2, 1, "Coffee emoji in the text", "Priya")], card: bar(2, 2, 2, "Founder story in email 1", "Rosa"), offers: false } } },
    { h: "Look along the new card's own row, in its weeks only.",
      p: "Another test on the same row in any of those weeks blocks it. Anything on other rows doesn't.",
      vis: { tags: FITS_TAGS, examples: [
        ["fair", "A welcome flow test the same weeks as a daily campaign test"],
        ["fair", "Two cart flow tests, one ending the week of Nov 9, the next starting the week of Nov 16"],
        ["bad", "Two subject-line tests on the daily campaign the same week"],
        ["bad", "A new SMS test while another SMS test still runs"],
      ] } },
  ],
  U2c: [
    { h: "An offer follows a person all the way to checkout.",
      p: "The welcome flow tests $10 off the first bean order. In the same weeks, SMS tests the code BREW15 (15% off). Many people are in both tests, so some of the welcome test's people already hold BREW15.",
      predict: { q: "Someone already holding 15% off gets the $10-off email. Does it move them as much as someone with no code?", opts: ["Yes, the same", "Less"], answer: 1,
        reveal: "Less. They already have a deal, and a checkout takes one code. So each test now measures its offer on top of the other one, and neither answers its own question. When one test changes what another does, that's an <b>interaction</b>. This game calls the rule gate 2: no two offers in the same weeks, on any rows." },
      vis: { board: { cards: [bar(2, 1, 3, "$10 off the first bean order", "Theo", true)], card: bar(1, 2, 2, "SMS code BREW15", "Priya", true) } } },
    { h: "A creative change stays inside its own email.",
      p: "Now the welcome flow tests a founder story instead, while SMS runs BREW15 the same weeks.",
      predict: { q: "Can the founder story test run those weeks?", opts: ["Yes", "No"], answer: 0,
        reveal: "Yes. A story in an email doesn't change what a code is worth at checkout, so the two tests barely touch. Offers clash with offers. A creative change can share weeks with one." },
      vis: { board: { cards: [bar(1, 2, 2, "SMS code BREW15", "Priya", true)], card: bar(2, 2, 2, "Founder story in email 1", "Rosa") } } },
    { h: "If the new card is an offer, look down its weeks for another offer.",
      p: "Orange bars are offers. Any orange bar in the same weeks, on any row, blocks a new offer.",
      vis: { tags: FITS_TAGS, examples: [
        ["fair", "$10 off in the welcome flow and a GIF hero in the daily campaign, same weeks"],
        ["fair", "Free filters with a first order in early November, gift with purchase in December"],
        ["bad", "$10 off in the welcome flow and BREW15 on SMS, same weeks"],
        ["bad", "The sampler bundle in the campaign and 15% off gear in post-purchase, both the week of Nov 9"],
      ] } },
  ],
  U2d: [
    { h: "Now check two things, in order: its row, then offers.",
      p: "Stop at the first check that's blocked. If both are clear, it fits. For the first few cards the page walks you through the checks one at a time: answer Clear or Blocked for each check.",
      vis: { checks: [["Its row", "Another test on its own row in any of its weeks? Blocked (gate 1)."],
                      ["Offers", "Is it an offer, with another offer in any of its weeks on any row? Blocked (gate 2)."]] } },
  ],
  U2e: [
    { h: "Every test needs a named reader.",
      p: "Theo's welcome test was set to end Nov 20. Nobody's name was on it, so the split kept running past its read date.",
      predict: { q: "When does someone read the result?", opts: ["Nov 20", "Whenever someone happens to notice"], answer: 1,
        reveal: "Whenever someone notices, and on a busy team that can be weeks. A name on the card makes one person own the read date. This game calls it gate 3." },
      vis: { board: { cards: [bar(0, 1, 2, "GIF hero vs static", "Theo")], card: bar(2, 1, 3, "Founder story in email 1", ""), offers: false } } },
    { h: "Nothing new runs during Black Friday and Cyber Monday.",
      p: "Nov 23 to Dec 6 is the BFCM freeze, the two shaded columns. Sends are bigger, sitewide offers run, and shoppers act unlike a normal week, so a result from those weeks doesn't predict January. A broken test also costs the most then. Teams call this a <b>code freeze</b> or <b>change freeze</b>.",
      predict: { q: "This new card runs Nov 16 to Nov 23. Is it in the freeze?", opts: ["Yes", "No"], answer: 0,
        reveal: "Yes. One week inside the shaded columns is enough." },
      vis: { board: { cards: [bar(0, 1, 2, "GIF hero vs static", "Theo")], card: bar(4, 3, 2, "Care guide vs product block", "Priya"), showFreeze: true, offers: false } } },
    { h: "Two quick looks: a name on the card, and no week in the shaded columns.",
      p: "These two checks join the other two later.",
      vis: { tags: FITS_TAGS, examples: [
        ["fair", "Read by Priya, runs Nov 2 to Nov 16"],
        ["fair", "Starts the week of Dec 7, right after the freeze"],
        ["bad", "No reader named"],
        ["bad", "Runs Nov 30 to Dec 7"],
        ["bad", "Runs Nov 16 to Nov 23"],
      ] } },
  ],
  U2f: [
    { h: "All four checks, in order: its row, offers, the reader, the freeze.",
      p: "Same habit, two more checks. Stop at the first one that's blocked. If all four are clear, it fits. The first few cards walk you through them again.",
      vis: { checks: [["Its row", "Another test on its own row in any of its weeks? Blocked (gate 1)."],
                      ["Offers", "An offer, with another offer in any of its weeks on any row? Blocked (gate 2)."],
                      ["Reader", "No name on the card? Blocked (gate 3)."],
                      ["The freeze", "Any week in the shaded columns? Blocked."]] } },
  ],
  U2g: [
    { h: "To schedule a card, slide it to the first week that clears every check.",
      p: "Priya wants a 2-week creative test on SMS. SMS is busy through Nov 9. In practice you slide the card along its row and drop it, and the first few cards tell you which check each week breaks.",
      predict: { q: "What's the first week it can start?", opts: ["Nov 16", "Nov 23", "Dec 7"], answer: 2,
        reveal: "Dec 7. Starting Nov 16 would run into Nov 23, and Nov 23 and Nov 30 are frozen. A 2-week card needs two clear weeks in a row." },
      vis: { board: { cards: [bar(1, 0, 3, "Coffee emoji in the text", "Theo"), bar(0, 2, 2, "GIF hero vs static", "Rosa")], card: bar(1, 0, 2, "Bundle-builder link vs beans page", "Priya"), showFreeze: true } } },
  ],
  ...LESSONS3,
  ...LESSONS4,
  ...LESSONS5,
  ...LESSONS6,
};
