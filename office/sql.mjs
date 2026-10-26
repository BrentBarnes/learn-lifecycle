// Frank Mallory's SQL desk: one part a day, in SQL Gauntlet's order (gamify/games/sql-gauntlet/SPEC.md "Parts") and
// its teaching rule: a one-screen lesson with an example on these tables, 2 practice reps with the example showing,
// then reps with it hidden behind Tab (peeking counts as help). A part passes at 5 clean of the last 6 unhelped reps.
// Fernhill's two small tables, fixed, so a lesson's output is the same every time. Made-up data. Pure: node tests
// run every template against SQLite (tests/sql.test.mjs).

export const SCHEMA = `CREATE TABLE customers (id INTEGER, name TEXT, city TEXT, plan TEXT, opens INTEGER, joined TEXT);
CREATE TABLE orders (id INTEGER, customer_id INTEGER, item TEXT, amount INTEGER, day TEXT);`;
export const CUSTOMERS = [
  [1, "Ava Brooks", "Boston", "subscriber", 12, "2026-03-04"], [2, "Ben Ortiz", "Portland", "one-time", 3, "2026-05-19"],
  [3, "Cleo Park", "Seattle", "subscriber", 25, "2026-01-22"], [4, "Dev Shah", "Boston", "one-time", 0, "2026-07-08"],
  [5, "Eli Grant", "Austin", "subscriber", 18, "2026-02-14"], [6, "Fay Lund", "Portland", "subscriber", 7, "2026-06-30"],
  [7, "Gus Rhee", "Seattle", "one-time", 15, "2026-08-11"], [8, "Hana Wolfe", "Austin", "one-time", 2, "2026-04-02"],
  [9, "Ivo Marsh", "Boston", "subscriber", 21, "2026-09-03"], [10, "Jun Abe", "Denver", "one-time", 9, "2026-05-27"],
  [11, "Kai Moss", "Denver", "subscriber", 30, "2026-03-18"], [12, "Lena Cruz", "Seattle", "subscriber", 4, "2026-09-21"],
  [13, "Max Ford", "Austin", "one-time", 11, "2026-07-30"], [14, "Nia Bell", "Portland", "one-time", 0, "2026-10-02"],
];
export const ORDERS = [
  [1, 1, "House Blend", 18, "2026-09-02"], [2, 3, "Ridgeline Espresso", 44, "2026-09-05"], [3, 5, "Travel Mug", 30, "2026-09-09"],
  [4, 3, "Ethiopia Guji", 24, "2026-09-12"], [5, 9, "House Blend", 36, "2026-09-15"], [6, 11, "Pour-over Kit", 45, "2026-09-18"],
  [7, 2, "House Blend", 18, "2026-09-20"], [8, 6, "Ridgeline Espresso", 22, "2026-09-24"], [9, 11, "Ethiopia Guji", 48, "2026-09-27"],
  [10, 7, "Travel Mug", 30, "2026-10-01"], [11, 1, "Ridgeline Espresso", 22, "2026-10-03"], [12, 12, "House Blend", 18, "2026-10-06"],
  [13, 9, "Pour-over Kit", 45, "2026-10-08"], [14, 5, "House Blend", 18, "2026-10-11"], [15, 13, "Ethiopia Guji", 24, "2026-10-14"],
  [16, 3, "House Blend", 36, "2026-10-16"], [17, 11, "Travel Mug", 30, "2026-10-19"], [18, 10, "Ridgeline Espresso", 22, "2026-10-21"],
  [19, 6, "House Blend", 18, "2026-10-24"], [20, 9, "Ethiopia Guji", 24, "2026-10-27"], [21, 1, "Pour-over Kit", 45, "2026-10-29"],
  [22, 5, "Ridgeline Espresso", 44, "2026-11-01"],
];
export const TABLES = {
  customers: { cols: [["id", "integer"], ["name", "text"], ["city", "text"], ["plan", "text"], ["opens", "integer"], ["joined", "text"]],
    note: "one row per customer · opens = emails opened in the last 30 days" },
  orders: { cols: [["id", "integer"], ["customer_id", "integer"], ["item", "text"], ["amount", "integer"], ["day", "text"]],
    note: "one row per order · amount in dollars · customer_id is a customers id" },
};
export function load(db) {
  db.run(SCHEMA);
  for (const [t, rows] of [["customers", CUSTOMERS], ["orders", ORDERS]]) {
    const st = db.prepare(`INSERT INTO ${t} VALUES (${rows[0].map(() => "?").join(",")})`);
    for (const r of rows) st.run(r);
    st.free();
  }
}

const pick = (r, a) => a[Math.floor(r() * a.length)];
const shuffle = (r, a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const CITIES = ["Boston", "Portland", "Seattle", "Austin", "Denver"];
const ITEMS = ["House Blend", "Ridgeline Espresso", "Ethiopia Guji", "Travel Mug", "Pour-over Kit"];
const MON = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const nice = (iso) => `${MON[+iso.slice(5, 7)]} ${+iso.slice(8)}`;
const and = (a) => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a.at(-1);
// a LIMIT that doesn't cut through a tie, so only one set of rows is right
function cleanLimit(r, vals, desc, from = [2, 3, 4, 5]) {
  const s = vals.slice().sort((a, b) => desc ? (a < b ? 1 : a > b ? -1 : 0) : (a < b ? -1 : a > b ? 1 : 0));
  return pick(r, from.filter((n) => s[n - 1] !== s[n]));
}
const cust = (k) => CUSTOMERS.map((c) => c[["id", "name", "city", "plan", "opens", "joined"].indexOf(k)]);
const ord = (k) => ORDERS.map((o) => o[["id", "customer_id", "item", "amount", "day"].indexOf(k)]);
const CCOLS = ["name", "city", "plan", "opens", "joined"];

// ---------- the parts: lesson, then templates. A template returns { who, ask, sql, ordered? } ----------
export const PARTS = [
  { id: "select", n: 1, name: "SELECT", word: "SELECT … FROM …",
    lesson: { frank: "Every case starts the same way, kid. You tell the table what you want to see. It shows you that and nothing else.",
      lines: ["<code>SELECT</code> names the columns you want, with commas between them. <code>FROM</code> names the table.",
        "<code>*</code> means every column. The rows come back as they sit in the table.", "Text in a request like \"name and city\" is a column list. Keep the order it asks for."],
      example: "SELECT name, plan FROM customers;" },
    tpl: [
      (r) => { const [a, b] = shuffle(r, CCOLS).slice(0, 2); return { who: pick(r, ["theo", "priya"]), ask: `Can I get every customer's ${a} and ${b}?`, sql: `SELECT ${a}, ${b} FROM customers;` }; },
      (r) => { const [a, b, c] = shuffle(r, CCOLS).slice(0, 3); return { who: "dana", ask: `For my deck: each customer's ${a}, ${b} and ${c}.`, sql: `SELECT ${a}, ${b}, ${c} FROM customers;` }; },
      (r) => { const [a, b] = shuffle(r, ["item", "amount", "day", "customer_id"]).slice(0, 2); return { who: "priya", ask: `Every order's ${a} and ${b}, please.`, sql: `SELECT ${a}, ${b} FROM orders;` }; },
      (r) => { const t = pick(r, ["orders", "customers"]); return { who: "mei", ask: `Show me the whole ${t} table. Every column.`, sql: `SELECT * FROM ${t};` }; },
    ] },
  { id: "where", n: 2, name: "WHERE", word: "WHERE",
    lesson: { frank: "Most of the table is noise. WHERE is how you say which rows you came for. The rest stay in the dark.",
      lines: ["<code>WHERE</code> goes after <code>FROM</code> and keeps only the rows where the test is true.",
        "Tests: <code>=</code> <code>!=</code> <code>&lt;</code> <code>&gt;</code> <code>&lt;=</code> <code>&gt;=</code>. Text and dates go in single quotes: <code>'Boston'</code>, <code>'2026-10-01'</code>.",
        "Dates are text like '2026-10-01', so <code>&gt;=</code> works on them the way you'd expect."],
      example: "SELECT name, opens FROM customers WHERE opens >= 20;" },
    tpl: [
      (r) => { const c = pick(r, CITIES); return { who: "theo", ask: `I'm doing a ${c} event email. Everyone in ${c}: name only.`, sql: `SELECT name FROM customers WHERE city = '${c}';` }; },
      (r) => { const p = pick(r, ["subscriber", "one-time"]); return { who: "dana", ask: `Who's on the ${p} plan? Name and city.`, sql: `SELECT name, city FROM customers WHERE plan = '${p}';` }; },
      (r) => { const n = pick(r, [5, 10, 14, 20]); return { who: "rosa", ask: `Who opened more than ${n} emails? Name and opens.`, sql: `SELECT name, opens FROM customers WHERE opens > ${n};` }; },
      (r) => { const d = pick(r, ["2026-06-01", "2026-07-01", "2026-08-01", "2026-09-01"]); return { who: "priya", ask: `Customers who joined on or after ${nice(d)}. Name and joined.`, sql: `SELECT name, joined FROM customers WHERE joined >= '${d}';` }; },
      (r) => { const n = pick(r, [25, 30, 40]); return { who: "hank", ask: `Show me the big orders, over $${n}. id, item and amount.`, sql: `SELECT id, item, amount FROM orders WHERE amount > ${n};` }; },
      (r) => { const i = pick(r, ITEMS); return { who: "theo", ask: `Every order of ${i}: customer_id and day.`, sql: `SELECT customer_id, day FROM orders WHERE item = '${i}';` }; },
      (r) => { const c = pick(r, CITIES); return { who: "mei", ask: `Everyone NOT in ${c}. Name and city.`, sql: `SELECT name, city FROM customers WHERE city != '${c}';` }; },
    ] },
  { id: "order", n: 3, name: "ORDER BY and LIMIT", word: "ORDER BY · LIMIT",
    lesson: { frank: "A list nobody can read is a list nobody uses. Put the best suspects on top. Cut the rest.",
      lines: ["<code>ORDER BY column</code> sorts the rows, smallest first. Add <code>DESC</code> for biggest first.",
        "<code>LIMIT n</code> keeps the first n rows after sorting. It goes last.", "Order: SELECT, FROM, WHERE, ORDER BY, LIMIT."],
      example: "SELECT name, joined FROM customers ORDER BY joined DESC LIMIT 2;" },
    tpl: [
      (r) => { const n = cleanLimit(r, cust("opens"), true); return { who: "rosa", ask: `Our ${n} most engaged customers: name and opens, most opens first.`, sql: `SELECT name, opens FROM customers ORDER BY opens DESC LIMIT ${n};`, ordered: 1 }; },
      (r) => { const n = cleanLimit(r, ord("day"), true, [3, 4, 5]); return { who: "priya", ask: `The latest ${n} orders: id, item and day, newest first.`, sql: `SELECT id, item, day FROM orders ORDER BY day DESC LIMIT ${n};`, ordered: 2 }; },
      () => ({ who: "dana", ask: "Every customer, A to Z by name. Name and city.", sql: "SELECT name, city FROM customers ORDER BY name;", ordered: 0 }),
      (r) => { const n = cleanLimit(r, ord("amount"), true, [1, 4, 6]); return { who: "hank", ask: `The ${n === 1 ? "single biggest order" : `${n} biggest orders`}: id and amount, biggest first.`, sql: `SELECT id, amount FROM orders ORDER BY amount DESC LIMIT ${n};`, ordered: 1 }; },
      (r) => { const n = cleanLimit(r, cust("joined"), false); return { who: "theo", ask: `Our ${n} oldest customers, by when they joined, earliest first. Name and joined.`, sql: `SELECT name, joined FROM customers ORDER BY joined LIMIT ${n};`, ordered: 1 }; },
    ] },
  { id: "andor", n: 4, name: "AND and OR", word: "AND · OR",
    lesson: { frank: "One clue rarely closes a case. AND means both have to be true. OR means either will do. Mix them and you'd better use brackets.",
      lines: ["<code>AND</code>: the row keeps only if both tests are true. <code>OR</code>: either one is enough.",
        "AND is done before OR. So <code>plan = 'subscriber' AND (city = 'Boston' OR city = 'Austin')</code> needs the brackets.",
        "Without them it reads as: Boston subscribers, or anyone in Austin."],
      example: "SELECT name FROM customers WHERE plan = 'one-time' AND opens > 10;" },
    tpl: [
      (r) => { const c = pick(r, CITIES); return { who: "theo", ask: `Subscribers in ${c}. Name only.`, sql: `SELECT name FROM customers WHERE plan = 'subscriber' AND city = '${c}';` }; },
      (r) => { const [a, b] = shuffle(r, CITIES).slice(0, 2); return { who: "dana", ask: `Everyone in ${a} or ${b}. Name and city.`, sql: `SELECT name, city FROM customers WHERE city = '${a}' OR city = '${b}';` }; },
      (r) => { const [a, b] = shuffle(r, CITIES).slice(0, 2); return { who: "rosa", ask: `Subscribers who live in ${a} or ${b}. Name and city.`, sql: `SELECT name, city FROM customers WHERE plan = 'subscriber' AND (city = '${a}' OR city = '${b}');` }; },
      (r) => { const i = pick(r, ["House Blend", "Ridgeline Espresso", "Ethiopia Guji"]); return { who: "priya", ask: `${i} orders over $20. id, amount and day.`, sql: `SELECT id, amount, day FROM orders WHERE item = '${i}' AND amount > 20;` }; },
      (r) => { const n = pick(r, [20, 25, 30]); return { who: "hank", ask: `October orders over $${n}. id, item and amount.`, sql: `SELECT id, item, amount FROM orders WHERE day >= '2026-10-01' AND day <= '2026-10-31' AND amount > ${n};` }; },
      () => ({ who: "mei", ask: "Customers with 0 opens, or who joined in October. Name, opens and joined.", sql: "SELECT name, opens, joined FROM customers WHERE opens = 0 OR joined >= '2026-10-01';" }),
    ] },
  { id: "inlike", n: 5, name: "IN, BETWEEN and LIKE", word: "IN · BETWEEN · LIKE",
    lesson: { frank: "Three shortcuts. IN for a list of suspects. BETWEEN for a window of time. LIKE for when you only know part of the name.",
      lines: ["<code>city IN ('Boston', 'Austin')</code> is city = 'Boston' OR city = 'Austin'.",
        "<code>amount BETWEEN 20 AND 30</code> keeps 20, 30 and everything in between. Both ends count.",
        "<code>name LIKE 'A%'</code>: % stands for any text. 'A%' starts with A. '%Blend%' has Blend anywhere."],
      example: "SELECT item, amount FROM orders WHERE amount BETWEEN 40 AND 50;" },
    tpl: [
      (r) => { const cs = shuffle(r, CITIES).slice(0, 3); return { who: "theo", ask: `Event invite list: everyone in ${and(cs)}. Name and city.`, sql: `SELECT name, city FROM customers WHERE city IN (${cs.map((c) => `'${c}'`).join(", ")});` }; },
      (r) => { const [a, b] = pick(r, [[18, 24], [22, 30], [30, 45], [24, 44]]); return { who: "priya", ask: `Orders from $${a} to $${b}, both ends included. id, item and amount.`, sql: `SELECT id, item, amount FROM orders WHERE amount BETWEEN ${a} AND ${b};` }; },
      (r) => { const [a, b] = pick(r, [["2026-09-01", "2026-09-15"], ["2026-10-01", "2026-10-15"], ["2026-09-20", "2026-10-10"]]); return { who: "dana", ask: `Orders placed ${nice(a)} to ${nice(b)}, both days included. id and day.`, sql: `SELECT id, day FROM orders WHERE day BETWEEN '${a}' AND '${b}';` }; },
      (r) => { const l = pick(r, ["A", "B", "D", "K", "L", "N"]); return { who: "mei", ask: `Customers whose name starts with ${l}. Name only.`, sql: `SELECT name FROM customers WHERE name LIKE '${l}%';` }; },
      (r) => { const w = pick(r, ["Espresso", "Blend", "Mug", "Guji"]); return { who: "rosa", ask: `Every order of anything with "${w}" in its name. id and item.`, sql: `SELECT id, item FROM orders WHERE item LIKE '%${w}%';` }; },
    ] },
  { id: "agg", n: 6, name: "COUNT, SUM, AVG, MIN, MAX", word: "COUNT · SUM · AVG · MIN · MAX",
    lesson: { frank: "Sometimes the client doesn't want the list. He wants one number. These squeeze a whole column down to one.",
      lines: ["<code>COUNT(*)</code> counts rows. <code>SUM(amount)</code> adds a column. <code>AVG</code>, <code>MIN</code> and <code>MAX</code> do what they say.",
        "WHERE runs first, so <code>SELECT COUNT(*) FROM orders WHERE item = 'Travel Mug'</code> counts only mug orders.",
        "The answer is one row with one number."],
      example: "SELECT SUM(amount) FROM orders WHERE day >= '2026-10-01';" },
    tpl: [
      (r) => { const c = pick(r, CITIES); return { who: "dana", ask: `How many customers do we have in ${c}? Just the number.`, sql: `SELECT COUNT(*) FROM customers WHERE city = '${c}';` }; },
      (r) => { const i = pick(r, ITEMS); return { who: "hank", ask: `Total revenue from ${i} orders?`, sql: `SELECT SUM(amount) FROM orders WHERE item = '${i}';` }; },
      (r) => { const m = pick(r, [["September", "2026-09-01", "2026-09-30"], ["October", "2026-10-01", "2026-10-31"]]); return { who: "priya", ask: `Average order amount in ${m[0]}?`, sql: `SELECT AVG(amount) FROM orders WHERE day BETWEEN '${m[1]}' AND '${m[2]}';` }; },
      (r) => { const p = pick(r, ["subscriber", "one-time"]); return { who: "rosa", ask: `The most opens any ${p} customer has?`, sql: `SELECT MAX(opens) FROM customers WHERE plan = '${p}';` }; },
      (r) => { const i = pick(r, ITEMS); return { who: "theo", ask: `When was the first ${i} order? Just the day.`, sql: `SELECT MIN(day) FROM orders WHERE item = '${i}';` }; },
      () => ({ who: "mei", ask: "How many orders are there in total?", sql: "SELECT COUNT(*) FROM orders;" }),
    ] },
  { id: "distinct", n: 7, name: "DISTINCT", word: "DISTINCT",
    lesson: { frank: "Same name on six receipts is still one customer. DISTINCT drops the repeats.",
      lines: ["<code>SELECT DISTINCT city FROM customers</code> lists each city once.",
        "<code>COUNT(DISTINCT customer_id)</code> counts different customers, not orders.",
        "Orders and people are not the same count. That gap is where reports go wrong."],
      example: "SELECT DISTINCT plan FROM customers;" },
    tpl: [
      () => ({ who: "dana", ask: "Which cities do we have customers in? Each city once.", sql: "SELECT DISTINCT city FROM customers;" }),
      (r) => { const m = pick(r, [["September", "2026-09-01", "2026-09-30"], ["October", "2026-10-01", "2026-10-31"]]); return { who: "priya", ask: `How many different customers ordered in ${m[0]}? People, not orders.`, sql: `SELECT COUNT(DISTINCT customer_id) FROM orders WHERE day BETWEEN '${m[1]}' AND '${m[2]}';` }; },
      (r) => { const n = pick(r, [30, 40]); return { who: "theo", ask: `Which items have sold in an order over $${n}? Each item once.`, sql: `SELECT DISTINCT item FROM orders WHERE amount > ${n};` }; },
      () => ({ who: "hank", ask: "How many different customers have ever ordered?", sql: "SELECT COUNT(DISTINCT customer_id) FROM orders;" }),
      (r) => { const p = pick(r, ["subscriber", "one-time"]); return { who: "rosa", ask: `Which cities have a ${p} customer? Each city once.`, sql: `SELECT DISTINCT city FROM customers WHERE plan = '${p}';` }; },
    ] },
  { id: "group", n: 8, name: "GROUP BY", word: "GROUP BY",
    lesson: { frank: "One number is a fact. One number per city is a story. GROUP BY splits the rows into piles and runs the count on each pile.",
      lines: ["<code>GROUP BY city</code> makes one pile per city. COUNT, SUM and the rest then run once per pile.",
        "Put the pile's name in SELECT too, or you get numbers with no labels: <code>SELECT city, COUNT(*) FROM customers GROUP BY city</code>.",
        "WHERE still runs first, before the piles are made."],
      example: "SELECT plan, AVG(opens) FROM customers GROUP BY plan;" },
    tpl: [
      () => ({ who: "dana", ask: "How many customers in each city? City and the count.", sql: "SELECT city, COUNT(*) FROM customers GROUP BY city;" }),
      () => ({ who: "hank", ask: "Revenue for each item. Item and the total.", sql: "SELECT item, SUM(amount) FROM orders GROUP BY item;" }),
      () => ({ who: "priya", ask: "How many orders has each customer placed? customer_id and the count.", sql: "SELECT customer_id, COUNT(*) FROM orders GROUP BY customer_id;" }),
      () => ({ who: "theo", ask: "Subscribers and one-time buyers: how many of each? Plan and the count.", sql: "SELECT plan, COUNT(*) FROM customers GROUP BY plan;" }),
      (r) => { const m = pick(r, [["September", "2026-09-01", "2026-09-30"], ["October", "2026-10-01", "2026-10-31"]]); return { who: "rosa", ask: `${m[0]} revenue per item. Item and the total.`, sql: `SELECT item, SUM(amount) FROM orders WHERE day BETWEEN '${m[1]}' AND '${m[2]}' GROUP BY item;` }; },
    ] },
];
export const PART = Object.fromEntries(PARTS.map((p) => [p.id, p]));
// SQL Gauntlet's order for the parts not built here yet (shown in the day list as "coming")
export const LATER = ["HAVING", "JOIN", "LEFT JOIN", "NULL", "Join then group", "CASE", "Dates", "Subqueries", "WITH", "Window functions"];

// ---------- reps and the pass rule ----------
export const PRACTICE = 2, PASS = [5, 6];   // Brent, 2026-10-24: more reps a day. 5 clean of the last 6 unhelped
export function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; }; }
// the next template: never the same one twice in a row, a missed one comes back 2 reps later
export function nextRep(part, st, r) {
  const P = PART[part], due = (st.again || []).find((a) => st.reps.length >= a.due);
  let ti;
  if (due) { ti = due.ti; st.again = st.again.filter((a) => a !== due); }
  else { const last = st.reps.length ? st.reps.at(-1).ti : -1; const opts = P.tpl.map((_, i) => i).filter((i) => i !== last || P.tpl.length === 1); ti = pick(r, opts); }
  return { part, ti, practice: st.reps.length < PRACTICE, ...P.tpl[ti](r) };
}
// st = { reps: [{ ti, ok, clean, help }], passed, again }
export function record(st, rep, ok, clean, help) {
  st.reps.push({ ti: rep.ti, ok, clean, help: !!help, practice: !!rep.practice });
  if (!ok) st.again = (st.again || []).concat({ ti: rep.ti, due: st.reps.length + 2 });
  const solo = st.reps.filter((x) => !x.practice && !x.help).slice(-PASS[1]);
  const was = !!st.passed;
  if (!was && solo.length >= PASS[0] && solo.filter((x) => x.clean).length >= PASS[0] && solo.at(-1).clean) st.passed = true;
  return { justPassed: !was && !!st.passed };
}
export const newState = () => ({ reps: [], passed: false, again: [] });

// ---------- grading: values, not names. Columns in any order; rows in any order unless the ask sorts them ----------
const key = (row) => JSON.stringify(row);
export function grade(mine, want, ordered) {
  if (!mine.rows.length && want.rows.length) return { ok: false, why: "No rows came back. Check the WHERE test and the spelling of the values." };
  const nc = mine.cols.length, wc = want.cols.length;
  if (nc !== wc) return { ok: false, why: `Yours has ${nc} column${nc === 1 ? "" : "s"}, the ask wants ${wc}. Show just what it names.` };
  // match columns by their values (so name, city and city, name both pass)
  const colVals = (o, i) => o.rows.map((r) => r[i]).map(String).sort().join("|");
  const perm = []; const used = new Set();
  for (let i = 0; i < wc; i++) { const j = [...Array(nc).keys()].find((k) => !used.has(k) && colVals(mine, k) === colVals(want, i)); if (j == null) break; used.add(j); perm.push(j); }
  const re = perm.length === wc ? mine.rows.map((r) => perm.map((j) => r[j])) : mine.rows;
  if (re.length !== want.rows.length) return { ok: false, why: `Yours has ${re.length} row${re.length === 1 ? "" : "s"}, the ask wants ${want.rows.length}. Check each condition against the request.` };
  const a = re.map(key), b = want.rows.map(key);
  if (JSON.stringify(a.slice().sort()) !== JSON.stringify(b.slice().sort())) return { ok: false, why: "Same number of rows, different values. Check the columns, and the values in your test." };
  if (ordered != null && JSON.stringify(re.map((r) => r[ordered])) !== JSON.stringify(want.rows.map((r) => r[ordered]))) return { ok: false, why: "The right rows, in the wrong order. Check ASC or DESC." };
  return { ok: true, swapped: perm.some((j, i) => j !== i) };
}
// the common slips, named, before the generic advice
export function slip(q, err) {
  if (err) {
    const col = /no such column: (\S+)/.exec(err);
    if (col) return /^[A-Z][a-z]/.test(col[1]) ? `<code>${col[1]}</code> needs single quotes: it's a value, not a column.` : `There's no column called <code>${col[1]}</code>. The columns are on the cards.`;
    if (/no such table/.test(err)) return "The tables are <code>customers</code> and <code>orders</code>.";
    if ((q.match(/'/g) || []).length % 2) return "A quote is missing. Text goes in single quotes: <code>'Boston'</code>.";
    if (/near "(WHERE|FROM|ORDER|LIMIT|GROUP)"/i.test(err)) return "Check the order: SELECT, FROM, WHERE, GROUP BY, ORDER BY, LIMIT.";
    return "SQLite couldn't run that. Check the spelling and the commas between columns.";
  }
  if (/"[^"]*"/.test(q)) return "Use single quotes for text. Double quotes mean a column name in SQL.";
  if (/(^|[^'\d])\d{4}-\d{2}-\d{2}/.test(q)) return "Dates need single quotes: <code>'2026-10-01'</code>. Without them SQL does the sum 2026 − 10 − 1.";
  return null;
}
