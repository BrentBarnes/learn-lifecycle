// Frank Mallory's SQL desk: one part a day, in SQL Gauntlet's order (gamify/games/sql-gauntlet/SPEC.md "Parts") and
// its teaching rule: a one-screen lesson with an example on these tables, 2 practice reps with the example showing,
// then reps with it hidden behind Tab (peeking counts as help). A part passes at 5 clean of the last 6 unhelped reps.
// Fernhill's two small tables, fixed, so a lesson's output is the same every time. Made-up data. Pure: node tests
// run every template against SQLite (tests/sql.test.mjs).

import { makeShop, loadShop, PRODUCTS } from "./sqlshop.mjs";

export const SCHEMA = `CREATE TABLE customers (id INTEGER, name TEXT, city TEXT, plan TEXT, opens INTEGER, joined TEXT);
CREATE TABLE orders (id INTEGER, customer_id INTEGER, item TEXT, amount INTEGER, day TEXT, status TEXT);`;
export const CUSTOMERS = [
  [1, "Ava Brooks", "Boston", "subscriber", 12, "2026-03-04"], [2, "Ben Ortiz", "Portland", "one-time", 3, "2026-05-19"],
  [3, "Cleo Park", "Seattle", "subscriber", 25, "2026-01-22"], [4, "Dev Shah", "Boston", "one-time", 0, "2026-07-08"],
  [5, "Eli Grant", "Austin", "subscriber", 18, "2026-02-14"], [6, "Fay Lund", "Portland", "subscriber", 7, "2026-06-30"],
  [7, "Gus Rhee", "Seattle", "one-time", 15, "2026-08-11"], [8, "Hana Wolfe", "Austin", "one-time", 8, "2026-04-02"],
  [9, "Ivo Marsh", "Boston", "subscriber", 21, "2026-09-03"], [10, "Jun Abe", "Denver", "one-time", 9, "2026-05-27"],
  [11, "Kai Moss", "Denver", "subscriber", 30, "2026-03-18"], [12, "Lena Cruz", "Seattle", "subscriber", 5, "2026-09-21"],
  [13, "Max Ford", "Austin", "one-time", 10, "2026-07-30"], [14, "Nia Bell", "Portland", "one-time", 0, "2026-10-02"],
];
export const ORDERS = [
  [1, 1, "House Blend", 18, "2026-09-02", "paid"], [2, 3, "Ridgeline Espresso", 44, "2026-09-05", "paid"], [3, 5, "Travel Mug", 30, "2026-09-09", "paid"],
  [4, 3, "Ethiopia Guji", 24, "2026-09-12", "paid"], [5, 9, "House Blend", 36, "2026-09-15", "paid"], [6, 11, "Pour-over Kit", 45, "2026-09-18", "paid"],
  [7, 2, "House Blend", 18, "2026-09-20", "paid"], [8, 6, "Ridgeline Espresso", 22, "2026-09-24", "refunded"], [9, 11, "Ethiopia Guji", 48, "2026-09-27", "paid"],
  [10, 7, "Travel Mug", 30, "2026-10-01", "paid"], [11, 1, "House Blend", 18, "2026-10-03", "paid"], [12, 12, "House Blend", 18, "2026-10-06", "paid"],
  [13, 9, "Pour-over Kit", 45, "2026-10-08", "paid"], [14, 5, "House Blend", 18, "2026-10-11", "paid"], [15, 13, "Ethiopia Guji", 24, "2026-10-14", "refunded"],
  [16, 3, "House Blend", 36, "2026-10-16", "paid"], [17, 11, "Travel Mug", 30, "2026-10-19", "paid"], [18, 10, "Ridgeline Espresso", 22, "2026-10-21", "paid"],
  [19, 6, "House Blend", 18, "2026-10-24", "paid"], [20, 9, "House Blend", 18, "2026-10-27", "paid"], [21, 1, "Pour-over Kit", 45, "2026-10-29", "paid"],
  [22, 5, "Ridgeline Espresso", 44, "2026-11-01", "paid"],
];
export const TABLES = {
  customers: { cols: [["id", "integer"], ["name", "text"], ["city", "text"], ["plan", "text"], ["opens", "integer"], ["joined", "text"]],
    note: "one row per customer · opens = emails opened in the last 30 days" },
  orders: { cols: [["id", "integer"], ["customer_id", "integer"], ["item", "text"], ["amount", "integer"], ["day", "text"], ["status", "text", "m1paid"]],
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

// the grown shop (Unit C on): seed 30 is on the board, seed 39 is the hidden second shop answers are also graded on
export const SHOP = makeShop(30, CUSTOMERS), SHOP2 = makeShop(39, CUSTOMERS);
export const loadBig = (db, hidden) => loadShop(db, hidden ? SHOP2 : SHOP);
export const TABLES2 = {
  customers: { cols: [["id", "integer"], ["name", "text"], ["city", "text"], ["plan", "text"], ["opens", "integer"], ["joined", "text"], ["channel", "text"], ["holdout", "integer", "m3group"]],
    note: "one row per customer · city can be missing · holdout 1 = never emailed" },
  orders: { cols: [["id", "integer"], ["customer_id", "integer"], ["amount", "integer"], ["day", "text"], ["status", "text"], ["code", "text"]],
    note: "one row per order · amount = what they paid · code = discount code, or empty" },
  order_items: { cols: [["order_id", "integer"], ["product_id", "integer"], ["qty", "integer"], ["price", "integer"]], note: "one row per product in an order · one order, many rows" },
  products: { cols: [["id", "integer"], ["name", "text"], ["price", "integer"], ["unit_cost", "integer"]], note: "one row per product" },
  sends: { cols: [["id", "integer"], ["customer_id", "integer"], ["flow", "text"], ["email", "integer"], ["day", "text"], ["delivered", "integer"], ["opened", "integer"], ["clicked_day", "text"], ["unsubscribed", "integer"], ["apple_mpp", "integer", "m2mpp"]],
    note: "one row per email sent to one person · flow: welcome, cart, winback, campaign · clicked_day empty if no click" },
  ad_spend: { from: "m6cac", cols: [["day", "text"], ["channel", "text"], ["spend", "integer"]], note: "one row per paid channel per week · day = the Monday · referral costs nothing" },
  subscriptions: { from: "m7churn", cols: [["id", "integer"], ["customer_id", "integer"], ["bags", "integer"], ["every_weeks", "integer"], ["monthly_value", "integer"], ["started", "text"], ["cancelled", "text"], ["cancel_reason", "text"]],
    note: "one row per subscription · cancelled empty while it runs · a downgrade ends a row and starts a smaller one" },
  payments: { from: "checks", cols: [["id", "integer"], ["order_id", "integer"], ["amount", "integer"], ["paid_at", "text"]], note: "one row per payment the card processor reported · paid_at in UTC" },
  signups: { from: "messy", cols: [["id", "integer"], ["email", "text"], ["customer_id", "integer"], ["source", "text"], ["signed_up", "text"], ["sent", "integer"], ["opened", "integer"]],
    note: "one row per newsletter sign-up · email as they typed it · signed_up in UTC, the shop's day is 5 hours behind · customer_id empty if they never bought · sent 0 = never emailed" },
  ab_test: { from: "m3ab", cols: [["visitor_id", "integer"], ["test", "text"], ["variant", "text"], ["converted", "integer"]], note: "one row per person in a test · test: subject, banner, quiz · variant A or B · converted 1 if they bought" },
  shop_orders: { from: "export", cols: [["name", "text"], ["email", "text"], ["created_at", "text"], ["financial_status", "text"], ["total_price", "text"], ["discount_code", "text"], ["source_name", "text"]],
    note: "Shopify's export: one row per order · email as the buyer typed it · created_at = the shop's local time and its offset · total_price is text · no code = '' · source_name is a code" },
  kl_events: { from: "export", cols: [["id", "integer"], ["profile_email", "text"], ["metric_id", "text"], ["datetime", "text"], ["message_name", "text"]],
    note: "Klaviyo's export: one row per thing that happened to one email · metric_id is a code, named in kl_metrics · datetime in UTC" },
  kl_metrics: { from: "export", cols: [["id", "text"], ["name", "text"]], note: "Klaviyo's lookup: one row per metric code" },
  hillstrom: { from: "hill", cols: [["id", "integer"], ["recency", "integer"], ["history_segment", "text"], ["history", "real"], ["mens", "integer"], ["womens", "integer"], ["zip_code", "text"], ["newbie", "integer"], ["channel", "text"], ["segment", "text"], ["visit", "integer"], ["conversion", "integer"], ["spend", "real"]],
    note: "real data, MineThatData 2008: one row per customer · segment: Mens E-Mail, Womens E-Mail, No E-Mail, at random · visit, conversion 1 or 0 in the two weeks after · mens, womens = bought that line last year · recency = months since last buy" },
  events: { from: "events", cols: [["id", "integer"], ["visitor_id", "integer"], ["customer_id", "integer"], ["ts", "integer"], ["event", "text"], ["device", "text"], ["product_id", "integer"], ["order_id", "integer"]],
    note: "one row per thing a visitor did · event: view, cart, checkout, purchase · ts = milliseconds since 1970 · customer_id empty if not logged in" },
};
// the red strings on the board: a key and the column it points at
export const LINKS = [["kl_events", "metric_id", "kl_metrics", "id"], ["kl_events", "profile_email", "shop_orders", "email"], ["orders", "customer_id", "customers", "id"], ["order_items", "order_id", "orders", "id"], ["order_items", "product_id", "products", "id"], ["sends", "customer_id", "customers", "id"], ["ad_spend", "channel", "customers", "channel"], ["subscriptions", "customer_id", "customers", "id"], ["events", "customer_id", "customers", "id"], ["events", "order_id", "orders", "id"], ["payments", "order_id", "orders", "id"], ["signups", "customer_id", "customers", "id"]];
const pick = (r, a) => a[Math.floor(r() * a.length)];
const shuffle = (r, a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const CITIES = ["Boston", "Portland", "Seattle", "Austin", "Denver"];
const ITEMS = ["House Blend", "Ridgeline Espresso", "Ethiopia Guji", "Travel Mug", "Pour-over Kit"];
const MON = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const nice = (iso) => `${MON[+iso.slice(5, 7)]} ${+iso.slice(8)}`;
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
        "<code>LIMIT n</code> keeps the first n rows after sorting. It goes last. With no ORDER BY, LIMIT keeps whichever rows the table happens to list first.", "Order: SELECT, FROM, WHERE, ORDER BY, LIMIT.",
        "Two keys: <code>ORDER BY city, opens DESC</code> sorts by city, then by opens inside each city."],
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
        "<code>name LIKE 'A%'</code>: % stands for any text. 'A%' starts with A. '%Blend%' has Blend anywhere.",
        "<code>NOT</code> flips each of them: <code>NOT IN (…)</code>, <code>NOT LIKE 'A%'</code>, <code>NOT BETWEEN</code>.",
        "LIKE ignores capitals: <code>LIKE '%blend%'</code> finds House Blend. <code>=</code> doesn't: <code>item = 'house blend'</code> finds nothing."],
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
        "WHERE still runs first, before the piles are made.",
        "Two columns make one pile per pair: <code>GROUP BY city, plan</code> gives Boston subscribers, Boston one-time, and so on."],
      example: "SELECT plan, AVG(opens) FROM customers GROUP BY plan;" },
    tpl: [
      () => ({ who: "dana", ask: "How many customers in each city? City and the count.", sql: "SELECT city, COUNT(*) FROM customers GROUP BY city;" }),
      () => ({ who: "hank", ask: "Revenue for each item. Item and the total.", sql: "SELECT item, SUM(amount) FROM orders GROUP BY item;" }),
      () => ({ who: "priya", ask: "How many orders has each customer placed? customer_id and the count.", sql: "SELECT customer_id, COUNT(*) FROM orders GROUP BY customer_id;" }),
      () => ({ who: "theo", ask: "Subscribers and one-time buyers: how many of each? Plan and the count.", sql: "SELECT plan, COUNT(*) FROM customers GROUP BY plan;" }),
      (r) => { const m = pick(r, [["September", "2026-09-01", "2026-09-30"], ["October", "2026-10-01", "2026-10-31"]]); return { who: "rosa", ask: `${m[0]} revenue per item. Item and the total.`, sql: `SELECT item, SUM(amount) FROM orders WHERE day BETWEEN '${m[1]}' AND '${m[2]}' GROUP BY item;` }; },
    ] },
];
// ---------- tiers (SQL-CURRICULUM.md, "A part: four tiers") ----------
// 1 same shape, 2 new angle, 3 with what you know (the part plus earlier parts), 4 the trap. The templates above are
// tiers 1 and 2. A tier 3 template carries `base`: the query without this part's clause, so the first time its
// clause set comes up it's an Extend rep (base on screen, add the new clause) with Frank's `hint`. A tier 4 template
// carries `bad`: the tempting query that runs and returns the wrong rows. It comes as a Fix rep (a coworker's query to
// mend) or as a plain request.
const TIER = { select: [1, 1, 2, 2], where: [1, 1, 2, 2, 2, 2, 2], order: [1, 2, 1, 2, 2], andor: [1, 1, 2, 2, 2, 2],
  inlike: [1, 2, 2, 1, 2], agg: [1, 2, 2, 2, 2, 1], distinct: [1, 2, 2, 2, 1], group: [1, 2, 2, 1, 2] };
const MORE = {
  where: [
    [4, () => ({ who: "hank", ask: "Orders placed on or after Oct 1. id and day.", sql: "SELECT id, day FROM orders WHERE day >= '2026-10-01';",
      bad: "SELECT id, day FROM orders WHERE day > '2026-10-01';", trap: "\"On or after\" keeps Oct 1 itself. <code>&gt;</code> drops it. That's <code>&gt;=</code>." })],
    [4, (r) => { const n = pick(r, [15, 18, 21]); return { who: "rosa", ask: `Customers with at least ${n} opens. Name and opens.`, sql: `SELECT name, opens FROM customers WHERE opens >= ${n};`,
      bad: `SELECT name, opens FROM customers WHERE opens > ${n};`, trap: `"At least ${n}" includes ${n}. That's <code>&gt;=</code>.` }; }],
    [4, () => ({ who: "priya", ask: "Orders from Oct 15 on. id, item and day.", sql: "SELECT id, item, day FROM orders WHERE day >= '2026-10-15';",
      bad: "SELECT id, item, day FROM orders WHERE day >= 2026-10-15;", trap: "A date without quotes is a sum: 2026 − 10 − 15. Dates go in single quotes." })],
  ],
  order: [
    [3, () => ({ who: "rosa", ask: "Our 3 most engaged subscribers. Name and opens, most first.", sql: "SELECT name, opens FROM customers WHERE plan = 'subscriber' ORDER BY opens DESC LIMIT 3;", ordered: 1,
      base: "SELECT name, opens FROM customers WHERE plan = 'subscriber';", hint: "WHERE picks the rows first. ORDER BY and LIMIT go after it, and only rank what's left.",
      marks: [["subscribers", "where"], ["3 most engaged", "order"], ["Name and opens", "select"]] })],
    [3, () => ({ who: "hank", ask: "The latest 2 orders over $30. id, amount and day, newest first.", sql: "SELECT id, amount, day FROM orders WHERE amount > 30 ORDER BY day DESC LIMIT 2;", ordered: 2,
      base: "SELECT id, amount, day FROM orders WHERE amount > 30;", hint: "Filter first, then sort what's left. ORDER BY comes after WHERE.",
      marks: [["latest 2", "order"], ["over $30", "where"], ["id, amount and day", "select"]] })],
    [3, (r) => { const c = pick(r, ["Boston", "Seattle", "Portland", "Austin"]); return { who: "theo", ask: `Everyone in ${c}, A to Z by name. Name and opens.`, sql: `SELECT name, opens FROM customers WHERE city = '${c}' ORDER BY name;`, ordered: 0,
      base: `SELECT name, opens FROM customers WHERE city = '${c}';`, hint: "Same order every time: SELECT, FROM, WHERE, then ORDER BY.",
      marks: [[`in ${c}`, "where"], ["A to Z by name", "order"], ["Name and opens", "select"]] }; }],
    [4, () => ({ who: "rosa", ask: "Our 3 most engaged customers. Name and opens, most first.", sql: "SELECT name, opens FROM customers ORDER BY opens DESC LIMIT 3;", ordered: 1,
      bad: "SELECT name, opens FROM customers ORDER BY opens LIMIT 3;", trap: "ORDER BY sorts smallest first. \"Most\" needs <code>DESC</code>." })],
    [2, () => ({ who: "dana", ask: "Every customer by city A to Z, and inside each city most opens first. Name, city and opens.", sql: "SELECT name, city, opens FROM customers ORDER BY city, opens DESC;", ordered: 0 })],
    [4, () => ({ who: "theo", ask: "Customers by plan A to Z, then by who joined first. Name, plan and joined.", sql: "SELECT name, plan, joined FROM customers ORDER BY plan, joined;", ordered: 0,
      bad: "SELECT name, plan, joined FROM customers ORDER BY joined, plan;", trap: "The first key decides. \"By plan, then by joined\" is <code>ORDER BY plan, joined</code>: joined only breaks ties inside a plan." })],
    [4, (r) => { const n = cleanLimit(r, cust("opens"), false, [2, 3, 4]); return { who: "rosa", ask: `The ${n} customers with the fewest opens. Name and opens, fewest first.`, sql: `SELECT name, opens FROM customers ORDER BY opens LIMIT ${n};`, ordered: 1,
      bad: `SELECT name, opens FROM customers LIMIT ${n};`, trap: "LIMIT alone keeps whichever rows the table lists first. \"Fewest\" needs a sort before the cut." }; }],
    [4, () => ({ who: "dana", ask: "Our newest customer, by the day they joined. Name and joined.", sql: "SELECT name, joined FROM customers ORDER BY joined DESC LIMIT 1;", ordered: 1,
      bad: "SELECT name, joined FROM customers ORDER BY joined LIMIT 1;", trap: "Smallest date first is the oldest. Newest is <code>DESC</code>." })],
  ],
  andor: [
    [3, (r) => { const [a, b] = shuffle(r, CITIES).slice(0, 2); return { who: "rosa", ask: `Subscribers in ${a} or ${b}, most opens first. Name, city and opens.`, sql: `SELECT name, city, opens FROM customers WHERE plan = 'subscriber' AND (city = '${a}' OR city = '${b}') ORDER BY opens DESC;`, ordered: 2,
      base: `SELECT name, city, opens FROM customers ORDER BY opens DESC;`, hint: "All the tests go in one WHERE, joined by AND and OR. The WHERE sits between FROM and ORDER BY.",
      marks: [["Subscribers", "andor"], [`${a} or ${b}`, "andor"], ["most opens first", "order"], ["Name, city and opens", "select"]] }; }],
    [3, () => ({ who: "hank", ask: "The 3 biggest September orders. id, amount and day, biggest first.", sql: "SELECT id, amount, day FROM orders WHERE day >= '2026-09-01' AND day <= '2026-09-30' ORDER BY amount DESC LIMIT 3;", ordered: 1,
      base: "SELECT id, amount, day FROM orders ORDER BY amount DESC LIMIT 3;", hint: "A month is two tests: on or after the 1st AND on or before the last day. Filter, then rank.",
      marks: [["3 biggest", "order"], ["September", "andor"], ["id, amount and day", "select"]] })],
    [4, (r) => { const [a, b] = shuffle(r, CITIES).slice(0, 2); return { who: "theo", ask: `Subscribers who live in ${a} or ${b}. Name and city.`, sql: `SELECT name, city FROM customers WHERE plan = 'subscriber' AND (city = '${a}' OR city = '${b}');`,
      bad: `SELECT name, city FROM customers WHERE plan = 'subscriber' AND city = '${a}' OR city = '${b}';`, trap: `AND goes before OR, so without brackets this is "${a} subscribers, or anyone in ${b}". Bracket the OR.` }; }],
    [4, (r) => { const n = pick(r, [20, 25]); return { who: "hank", ask: `October orders of Ridgeline Espresso or House Blend over $${n}. id, item and amount.`, sql: `SELECT id, item, amount FROM orders WHERE day >= '2026-10-01' AND day <= '2026-10-31' AND (item = 'Ridgeline Espresso' OR item = 'House Blend') AND amount > ${n};`,
      bad: `SELECT id, item, amount FROM orders WHERE (item = 'Ridgeline Espresso' OR item = 'House Blend') AND amount > ${n};`, trap: "The request has three conditions: October, the two items, the amount. Count them before you write." }; }],
  ],
  inlike: [
    [3, (r) => { const cs = shuffle(r, CITIES).slice(0, 3); return { who: "rosa", ask: `Subscribers in ${and(cs)}, most opens first. Name, city and opens.`, sql: `SELECT name, city, opens FROM customers WHERE plan = 'subscriber' AND city IN (${cs.map((c) => `'${c}'`).join(", ")}) ORDER BY opens DESC;`, ordered: 2,
      base: `SELECT name, city, opens FROM customers WHERE plan = 'subscriber' ORDER BY opens DESC;`, hint: "IN is one test, so it joins the others with AND like any test.",
      marks: [["Subscribers", "where"], [and(cs), "inlike"], ["most opens first", "order"]] }; }],
    [3, () => ({ who: "hank", ask: "The 3 biggest orders placed Sep 1 to Sep 30. id, amount and day, biggest first.", sql: "SELECT id, amount, day FROM orders WHERE day BETWEEN '2026-09-01' AND '2026-09-30' ORDER BY amount DESC LIMIT 3;", ordered: 1,
      base: "SELECT id, amount, day FROM orders ORDER BY amount DESC LIMIT 3;", hint: "BETWEEN is the month in one test. It goes in WHERE, before ORDER BY.",
      marks: [["3 biggest", "order"], ["Sep 1 to Sep 30", "inlike"]] })],
    [3, (r) => { const n = pick(r, [20, 30]); return { who: "priya", ask: `Every Espresso order over $${n}. id, item and amount.`, sql: `SELECT id, item, amount FROM orders WHERE item LIKE '%Espresso%' AND amount > ${n};`,
      base: `SELECT id, item, amount FROM orders WHERE amount > ${n};`, hint: "LIKE is one more test in the WHERE. Join it with AND.",
      marks: [["Espresso", "inlike"], [`over $${n}`, "where"]] }; }],
    [4, () => ({ who: "dana", ask: "Orders placed Sep 20 to Oct 8, both days included. id and day.", sql: "SELECT id, day FROM orders WHERE day BETWEEN '2026-09-20' AND '2026-10-08';",
      bad: "SELECT id, day FROM orders WHERE day > '2026-09-20' AND day < '2026-10-08';", trap: "\"Both days included\" means the ends count. <code>&gt;</code> and <code>&lt;</code> drop them. BETWEEN keeps them." })],
    [2, (r) => { const l = pick(r, ["A", "D", "K", "L"]); return { who: "mei", ask: `Customers whose name doesn't start with ${l}. Name only.`, sql: `SELECT name FROM customers WHERE name NOT LIKE '${l}%';` }; }],
    [2, (r) => { const [a, b] = shuffle(r, ITEMS).slice(0, 2); return { who: "hank", ask: `Every order except ${a} and ${b}. id and item.`, sql: `SELECT id, item FROM orders WHERE item NOT IN ('${a}', '${b}');` }; }],
    [2, (r) => { const w = pick(r, ["espresso", "blend", "mug"]); return { who: "rosa", ask: `Every order with "${w}" anywhere in the item name, whatever the capitals. id and item.`, sql: `SELECT id, item FROM orders WHERE item LIKE '%${w}%';` }; }],
    [4, (r) => { const i = pick(r, ["House Blend", "Travel Mug", "Ethiopia Guji"]); return { who: "theo", ask: `Theo's list says "${i.toLowerCase()}". Every order of it. id and day.`, sql: `SELECT id, day FROM orders WHERE item LIKE '${i.toLowerCase()}';`,
      bad: `SELECT id, day FROM orders WHERE item = '${i.toLowerCase()}';`, trap: `<code>=</code> matches capitals exactly, and the shop writes it '${i}'. Type it the way the data has it, or use LIKE, which ignores capitals.` }; }],
    [4, () => ({ who: "mei", ask: "Customers whose name starts with A. Name only.", sql: "SELECT name FROM customers WHERE name LIKE 'A%';",
      bad: "SELECT name FROM customers WHERE name LIKE 'A';", trap: "LIKE 'A' matches only a name that is exactly A. <code>%</code> stands for the rest." })],
  ],
  agg: [
    [3, (r) => { const n = pick(r, [20, 30]); return { who: "dana", ask: `How many October orders were over $${n}?`, sql: `SELECT COUNT(*) FROM orders WHERE day BETWEEN '2026-10-01' AND '2026-10-31' AND amount > ${n};`,
      base: `SELECT * FROM orders WHERE day BETWEEN '2026-10-01' AND '2026-10-31' AND amount > ${n};`, hint: "WHERE runs first, then COUNT counts what's left. Write the filter, then swap the columns for COUNT(*).",
      marks: [["How many", "agg"], ["October", "inlike"], [`over $${n}`, "andor"]] }; }],
    [3, () => ({ who: "hank", ask: "Total revenue from House Blend and Ethiopia Guji together.", sql: "SELECT SUM(amount) FROM orders WHERE item IN ('House Blend', 'Ethiopia Guji');",
      base: "SELECT amount FROM orders WHERE item IN ('House Blend', 'Ethiopia Guji');", hint: "Pick the rows with WHERE, then SUM adds up their amounts.",
      marks: [["Total revenue", "agg"], ["House Blend and Ethiopia Guji", "inlike"]] })],
    [3, (r) => { const [a, b] = shuffle(r, ["Boston", "Seattle", "Austin", "Portland"]).slice(0, 2); return { who: "rosa", ask: `Average opens of subscribers in ${a} or ${b}.`, sql: `SELECT AVG(opens) FROM customers WHERE plan = 'subscriber' AND (city = '${a}' OR city = '${b}');`,
      base: `SELECT opens FROM customers WHERE plan = 'subscriber' AND (city = '${a}' OR city = '${b}');`, hint: "The brackets still matter inside an average. Filter right, then AVG.",
      marks: [["Average opens", "agg"], ["subscribers", "andor"], [`${a} or ${b}`, "andor"]] }; }],
    [4, () => ({ who: "hank", ask: "The average order amount, to the cent.", sql: "SELECT AVG(amount) FROM orders;",
      bad: "SELECT SUM(amount) / COUNT(*) FROM orders;", trap: "SQLite divides whole numbers to a whole number (3/2 = 1), so the cents vanish. AVG keeps them." })],
    [4, () => ({ who: "dana", ask: "Total revenue from September orders.", sql: "SELECT SUM(amount) FROM orders WHERE day BETWEEN '2026-09-01' AND '2026-09-30';",
      bad: "SELECT COUNT(amount) FROM orders WHERE day BETWEEN '2026-09-01' AND '2026-09-30';", trap: "COUNT counts the orders. Revenue is the dollars: SUM." })],
  ],
  distinct: [
    [3, () => ({ who: "priya", ask: "How many different customers bought House Blend or a Travel Mug in October?", sql: "SELECT COUNT(DISTINCT customer_id) FROM orders WHERE item IN ('House Blend', 'Travel Mug') AND day BETWEEN '2026-10-01' AND '2026-10-31';",
      base: "SELECT customer_id FROM orders WHERE item IN ('House Blend', 'Travel Mug') AND day BETWEEN '2026-10-01' AND '2026-10-31';", hint: "Filter the orders first. Then count each customer once.",
      marks: [["How many different customers", "distinct"], ["House Blend or a Travel Mug", "inlike"], ["in October", "inlike"]] })],
    [3, (r) => { const n = pick(r, [5, 10]); return { who: "theo", ask: `Which cities have a subscriber with more than ${n} opens? Each city once, A to Z.`, sql: `SELECT DISTINCT city FROM customers WHERE plan = 'subscriber' AND opens > ${n} ORDER BY city;`, ordered: 0,
      base: `SELECT city FROM customers WHERE plan = 'subscriber' AND opens > ${n} ORDER BY city;`, hint: "DISTINCT goes right after SELECT. The rest of the query stays the same.",
      marks: [["Each city once", "distinct"], ["subscriber", "andor"], [`more than ${n} opens`, "andor"], ["A to Z", "order"]] }; }],
    [4, (r) => { const n = pick(r, [30, 40]); return { who: "dana", ask: `How many customers placed an order over $${n}?`, sql: `SELECT COUNT(DISTINCT customer_id) FROM orders WHERE amount > ${n};`,
      bad: `SELECT COUNT(*) FROM orders WHERE amount > ${n};`, trap: "COUNT(*) counts orders. One customer with two big orders counts twice. People is COUNT(DISTINCT customer_id)." }; }],
  ],
  group: [
    [3, () => ({ who: "hank", ask: "October revenue per item, biggest first. Item and the total.", sql: "SELECT item, SUM(amount) AS total FROM orders WHERE day BETWEEN '2026-10-01' AND '2026-10-31' GROUP BY item ORDER BY total DESC;", ordered: 1,
      base: "SELECT item, SUM(amount) AS total FROM orders GROUP BY item ORDER BY total DESC;", hint: "WHERE runs before the piles are made, so the piles only hold October. It goes between FROM and GROUP BY.",
      marks: [["October", "inlike"], ["per item", "group"], ["biggest first", "order"]] })],
    [3, () => ({ who: "dana", ask: "Which item brought in the most revenue? Item and the total.", sql: "SELECT item, SUM(amount) AS total FROM orders GROUP BY item ORDER BY total DESC LIMIT 1;", ordered: 1,
      base: "SELECT item, SUM(amount) AS total FROM orders GROUP BY item;", hint: "One total per item, then sort the totals and keep the top one. Name the total with AS so ORDER BY can use it.",
      marks: [["Which item", "group"], ["the most", "order"], ["revenue", "agg"]] })],
    [3, () => ({ who: "rosa", ask: "Average opens per plan, for customers who joined from July on. Plan and the average.", sql: "SELECT plan, AVG(opens) FROM customers WHERE joined >= '2026-07-01' GROUP BY plan;",
      base: "SELECT plan, AVG(opens) FROM customers GROUP BY plan;", hint: "WHERE first, then the piles.",
      marks: [["per plan", "group"], ["joined from July on", "where"], ["Average opens", "agg"]] })],
    [4, () => ({ who: "dana", ask: "How many customers in each city? City and the count.", sql: "SELECT city, COUNT(*) FROM customers GROUP BY city;",
      bad: "SELECT city, name, COUNT(*) FROM customers GROUP BY city;", trap: "name isn't grouped, so SQLite prints one random name per city. Every SELECT column is either grouped or inside a total." })],
    [2, () => ({ who: "dana", ask: "How many customers per city and plan? City, plan and the count.", sql: "SELECT city, plan, COUNT(*) FROM customers GROUP BY city, plan;" })],
    [2, () => ({ who: "theo", ask: "Each customer's first order day. customer_id and the day.", sql: "SELECT customer_id, MIN(day) FROM orders GROUP BY customer_id;" })],
    [4, () => ({ who: "priya", ask: "Orders per customer per item. customer_id, item and the count.", sql: "SELECT customer_id, item, COUNT(*) FROM orders GROUP BY customer_id, item;",
      bad: "SELECT customer_id, item, COUNT(*) FROM orders GROUP BY customer_id;", trap: "\"Per customer per item\" is one pile per pair. Grouped by customer alone, the item shown is just one of theirs. <code>GROUP BY customer_id, item</code>." })],
    [4, () => ({ who: "hank", ask: "Revenue for each item. Item and the total.", sql: "SELECT item, SUM(amount) FROM orders GROUP BY item;",
      bad: "SELECT SUM(amount) FROM orders GROUP BY item;", trap: "The totals come out with no labels. Put the grouped column in SELECT too." })],
  ],
};
for (const p of PARTS) {
  p.tier = TIER[p.id].slice();
  for (const [tier, fn] of MORE[p.id] || []) { p.tpl.push(fn); p.tier.push(tier); }
  p.top = Math.max(...p.tier);
}

// ---------- Frank's casebook: what each phrase in a request turns into. One entry set per part ----------
export const CASEBOOK = {
  select: [["\"name and city\", \"show me\", \"list\"", "SELECT name, city"], ["\"every column\", \"the whole table\"", "SELECT *"]],
  where: [["\"in Boston\", \"on the subscriber plan\"", "WHERE city = 'Boston'"], ["\"over $30\", \"more than\"", "WHERE amount > 30"], ["\"at least\", \"on or after\"", "&gt;= (the end counts)"], ["\"not in Boston\"", "WHERE city != 'Boston'"]],
  order: [["\"top 3\", \"most\", \"biggest first\"", "ORDER BY … DESC LIMIT 3"], ["\"by city, then most opens\"", "ORDER BY city, opens DESC"], ["\"the 3 smallest\"", "sort first, then LIMIT 3"], ["\"A to Z\", \"oldest first\"", "ORDER BY … (smallest first)"], ["filter and rank", "WHERE before ORDER BY"]],
  andor: [["\"and\", \"who also\"", "AND"], ["\"or\", \"either\"", "( … OR … ) in brackets"], ["\"in September\"", "day &gt;= '2026-09-01' AND day &lt;= '2026-09-30'"], ["three conditions", "count them before you write"]],
  inlike: [["\"any of Boston, Austin\"", "city IN ('Boston', 'Austin')"], ["\"from … to, both included\"", "BETWEEN … AND …"], ["\"starts with A\", \"has Blend in it\"", "LIKE 'A%', LIKE '%Blend%'"], ["\"except\", \"doesn't start with\"", "NOT IN (…), NOT LIKE 'A%'"], ["any capitals", "LIKE ignores them, = doesn't"]],
  agg: [["\"how many\"", "COUNT(*)"], ["\"total\", \"revenue\"", "SUM(amount)"], ["\"average\"", "AVG(…), not SUM / COUNT"], ["\"first\", \"most\" as one number", "MIN(…), MAX(…)"]],
  distinct: [["\"each once\", \"which cities\"", "SELECT DISTINCT city"], ["\"how many people\", \"different customers\"", "COUNT(DISTINCT customer_id)"]],
  having: [["\"cities with 3+ customers\", \"items over $100 in total\"", "GROUP BY … HAVING COUNT(*) &gt;= 3"], ["a test on one row", "WHERE"], ["a test on a total", "HAVING"]],
  runorder: [["the order SQL runs", "FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY, LIMIT"], ["a name made with AS", "ORDER BY can use it, WHERE can't"]],
  m1aov: [["\"AOV\", \"per order\"", "SUM(amount) * 1.0 / COUNT(*)"], ["\"per customer\"", "SUM(amount) * 1.0 / COUNT(DISTINCT customer_id)"], ["\"to the cent\"", "* 1.0 before you divide"]],
  m1paid: [["\"revenue\", from Metric 1 on", "WHERE status = 'paid'"], ["\"lost to refunds\"", "WHERE status = 'refunded'"]],
  m1item: [["\"AOV per item\"", "GROUP BY item with AVG(amount)"], ["\"items with AOV over $30\"", "HAVING AVG(amount) &gt; 30"]],
  checks: [["\"how many orders\" on a table that can repeat", "COUNT(DISTINCT order_id), and compare with COUNT(*)"], ["\"any doubles?\"", "GROUP BY key HAVING COUNT(*) &gt; 1"], ["\"anything missing?\"", "LEFT JOIN … WHERE right.id IS NULL"]],
  messy: [["\"each email once\", any capitals", "LOWER(TRIM(email))"], ["\"the domain\"", "substr(e, instr(e, '@') + 1)"], ["\"divide safely\"", "x * 1.0 / NULLIF(y, 0)"], ["\"shop time\", from UTC", "date(t, '-5 hours')"]],
  m3ab: [["\"is it real?\"", "gap &gt; 2 × sqrt(pA(1 − pA)/nA + pB(1 − pB)/nB)"], ["smaller than the noise", "too few to tell, not \"no difference\""]],
  newboard: [["\"what's in it\"", "SELECT * FROM t LIMIT 5"], ["\"how big\"", "SELECT COUNT(*) FROM t"], ["before you count", "read what one row is"]],
  join: [["\"with their name\", \"what was in order 7\"", "JOIN customers c ON o.customer_id = c.id"], ["a column both tables have", "o.id, c.id: say which"], ["\"bought\", \"sold\", \"revenue\", \"spent\"", "paid orders only (status = 'paid'). \"orders\" alone means every order"]],
  left: [["\"including\", \"even those with none\"", "LEFT JOIN, the keep-all table after FROM"], ["\"their October orders\", keep everyone", "the October test in ON"]],
  nulls: [["\"missing\", \"no code\"", "IS NULL (never = NULL)"], ["\"how many clicked\"", "COUNT(clicked_day)"], ["\"not Boston, including unknown\"", "!= 'Boston' OR city IS NULL"], ["\"show unknown\"", "COALESCE(city, 'unknown')"], ["\"$0 if none\"", "COALESCE(SUM(…), 0)"]],
  never: [["\"never ordered\"", "LEFT JOIN orders o … WHERE o.id IS NULL"], ["\"no paid order\"", "AND o.status = 'paid' in ON"]],
  joingroup: [["\"per customer, with names\"", "GROUP BY c.id, c.name"], ["\"including zeros\"", "LEFT JOIN + COUNT(o.id)"]],
  fanout: [["before you SUM", "did the join copy it?"], ["\"revenue per product\"", "SUM(i.qty * i.price)"], ["\"AOV\"", "one row per order: no order_items join"]],
  m2rates: [["\"click rate\"", "COUNT(clicked_day) * 1.0 / SUM(delivered)"], ["\"unsubscribe rate\"", "SUM(unsubscribed) * 1.0 / SUM(delivered)"]],
  m2mpp: [["\"real open rate\"", "WHERE apple_mpp = 0"]],
  m2rpr: [["\"within 5 days of a click\"", "o.day BETWEEN s.clicked_day AND date(s.clicked_day, '+5 days')"], ["\"revenue per recipient\"", "COALESCE(SUM(o.amount), 0) * 1.0 / COUNT(DISTINCT s.id)"]],
  m3group: [["\"emailed vs held out\"", "GROUP BY c.holdout, LEFT JOIN, zero for non-buyers"]],
  m2money: [["\"what would it earn at the other rate\"", "(rate gap) × volume"]],
  m3lift: [["\"lift\"", "(emailed − held out) × emailed customers"]],
  m3money: [["\"what the platform claims\"", "SUM(o.amount) over the 5-day click window"], ["\"what the emails really added\"", "the lift"]],
  case: [["\"label as\", \"big or small\"", "CASE WHEN … THEN … ELSE … END AS label"], ["\"how many of each, in one row\"", "SUM(CASE WHEN … THEN 1 ELSE 0 END)"], ["overlapping buckets", "narrowest WHEN first"]],
  dates: [["\"per month\"", "strftime('%Y-%m', day)"], ["\"within 7 days\"", "date(day, '+7 days')"], ["\"days between\"", "julianday(b) - julianday(a)"], ["\"in October\" by month", "strftime('%m', day) = '10' (text)"]],
  subquery: [["\"above average\"", "&gt; (SELECT AVG(…) FROM …)"], ["\"who also\", \"who never\"", "IN / NOT IN (SELECT …)"], ["NOT IN list", "keep NULLs out of it"]],
  cte: [["\"first … then …\"", "WITH step AS (…) SELECT … FROM step"], ["a number per customer, then a number about them", "WITH per AS (… GROUP BY customer_id)"]],
  window: [["\"each customer's first\"", "ROW_NUMBER() OVER (PARTITION BY … ORDER BY day, id) = 1, in a WITH"], ["\"latest\", \"biggest\"", "ORDER BY day DESC, id DESC inside OVER"], ["\"ties sharing a rank\"", "RANK()"], ["\"how many they have in all\", on every row", "COUNT(*) OVER (PARTITION BY …)"]],
  lag: [["\"previous\"", "LAG(day) OVER (PARTITION BY … ORDER BY day, id)"], ["\"next\"", "LEAD(day) OVER (…)"], ["\"days since the one before\"", "julianday(day) - julianday(LAG(day) OVER (…))"], ["\"running total\"", "SUM(…) OVER (ORDER BY …)"]],
  stage1: [["a big question", "a row of small ones: WITH a AS (…), b AS (… FROM a) SELECT … FROM b"], ["\"tier every buyer\"", "a stage with a CASE label, piled in the next"]],
  stage2: [["\"buyers whose first order was in …\"", "a filter stage: SELECT * FROM f WHERE …"], ["names, channels", "join last, when the rows are the people you want"]],
  stage3: [["two tables, one row per customer each", "two roll-up stages, then e LEFT JOIN s"], ["\"0 for non-buyers\"", "COALESCE(s.spent, 0) in the join stage"]],
  m4repeat: [["\"repeat rate\"", "buyers with k &gt;= 2 ÷ all buyers (WITH n …)"]],
  m4second: [["\"time to second order\"", "LAG(day) on ROW_NUMBER n = 2"]],
  m4median: [["\"median\"", "ROW_NUMBER() OVER (ORDER BY x), COUNT(*) OVER (), k IN ((n + 1) / 2, (n + 2) / 2)"]],
  m4money: [["\"past the refill day\"", "k = 1 AND days since &gt; median"]],
  m5since: [["\"days since\"", "julianday('2026-11-15') - julianday(MAX(day))"]],
  m5status: [["\"lapsed\"", "days &gt; 2 × their usual gap"], ["two values, the bigger", "MAX(x, 14)"]],
  m5winback: [["\"winback rate\"", "came back within 30 days ÷ got it, LEFT JOIN"]],
  m5money: [["\"what a winback is worth\"", "lapsed × rate × average order"]],
  m6cohort: [["\"cohort\"", "strftime('%Y-%m', first paid day)"], ["\"month 1\"", "strftime('%m', o.day) - strftime('%m', f.d) = 1"], ["a month that hasn't happened", "'not yet', never 0"]],
  m6ltv: [["\"lifetime value\"", "SUM(qty * (price - unit_cost)) per buyer, then AVG"]],
  m6cac: [["\"CAC\"", "spend ÷ new customers, each side in its own step"], ["\"counting from …\"", "the same day on both sides"]],
  m7churn: [["\"active on the 1st\"", "started &lt;= d AND (cancelled IS NULL OR cancelled &gt;= d)"], ["\"churn\"", "cancelled that month, not downgrades ÷ active on the 1st"]],
  m7mrr: [["\"every month, even empty ones\"", "WITH RECURSIVE months … UNION ALL … date(m, '+1 month')"], ["\"MRR\"", "SUM(monthly_value) of the ones active on m"]],
  events: [["\"per visitor\"", "WITH v AS (… GROUP BY visitor_id)"], ["\"how many views\"", "SUM(event = 'view'), never COUNT"], ["\"ever reached\"", "MAX(event = 'cart')"], ["ts in milliseconds", "date(ts / 1000, 'unixepoch')"]],
  share: [["\"percent of all\", \"share of the total\"", "100.0 * COUNT(*) / SUM(COUNT(*)) OVER ()"], ["\"to one decimal\"", "ROUND(x, 1)"], ["a share of money", "SUM(SUM(amount)) OVER ()"]],
  correlated: [["\"no …\", \"never\", NULL-safe", "WHERE NOT EXISTS (SELECT 1 … WHERE o.customer_id = c.id)"], ["\"every customer with their …\"", "(SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id)"], ["\"in the 7 days after\"", "o.day BETWEEN s.day AND date(s.day, '+7 days') inside it"]],
  shorthand: [["two stages, same key name", "JOIN n USING (channel)"], ["\"the first column\"", "GROUP BY 1, ORDER BY 1"], ["\"as a number\"", "CAST(x AS INTEGER)"], ["\"not\"", "&lt;&gt; is !="]],
  pipe1: [["a big question", "a row of small ones: WITH a AS (…), b AS (… FROM a) SELECT … FROM b"], ["\"one row per visitor\"", "the first stage's GROUP BY"]],
  pipe2: [["\"vs\", \"side by side\"", "two stages, one per side, joined USING (key)"]],
  pipe3: [["\"tier every …\"", "a stage with a CASE label, piled in the next"]],
  pipe4: [["\"came back within N days\"", "a stage that scores each row with a subquery, then AVG(score > 0)"]],
  pipe5: [["\"a new visit after 30 quiet minutes\"", "LAG(ts) for the gap, CASE WHEN prev IS NULL OR ts - prev > 30 * 60000 THEN 1 ELSE 0 END"], ["\"number the visits\"", "SUM(new_visit) OVER (PARTITION BY visitor_id ORDER BY ts, id)"], ["\"per visit\"", "GROUP BY visitor_id, session"]],
  dialects: [["DATE_TRUNC(day, MONTH), DATE_TRUNC('month', day), FORMAT_DATE('%Y-%m', day)", "strftime('%Y-%m', day)"], ["day + INTERVAL '5 days'", "date(day, '+5 days')"], ["DATE_DIFF(b, a, DAY)", "julianday(b) - julianday(a)"],
    ["ILIKE", "LIKE (already ignores capitals)"], ["IFF(test, a, b)", "CASE WHEN test THEN a ELSE b END"], ["COUNTIF(test), COUNT(*) FILTER (WHERE test)", "SUM(test), never COUNT(test)"],
    ["SAFE_DIVIDE(a, b), or BigQuery's a / b", "a * 1.0 / NULLIF(b, 0)"], ["QUALIFY ROW_NUMBER() OVER (…) = 1", "WITH r AS (… ROW_NUMBER() OVER (…) AS n …) SELECT … FROM r WHERE n = 1"]],
  export: [["a code column", "look it up: JOIN kl_metrics m ON m.id = e.metric_id"], ["\"every value it takes\"", "SELECT col, COUNT(*) … GROUP BY 1"], ["a number stored as text", "CAST(total_price AS REAL) to sort or compare"],
    ["\"no code\" in Shopify", "discount_code = '' (empty text, not NULL)"], ["\"the shop's day\"", "substr(created_at, 1, 10)"], ["emails from two tools", "LOWER(TRIM(o.email)) = e.profile_email"]],
  m7money: [["\"what a downgrade costs\"", "subscriptions a JOIN subscriptions b, b.started = a.cancelled"], ["\"a year of it\"", "× 12"]],
  m1money: [["\"use the ids you got\"", "customer_id IN (2, 6, …)"], ["\"everyone else\"", "NOT IN (…)"], ["a sum with no table", "SELECT (99.8 - 21.2) * 5;"]],
  group: [["\"per item\", \"each city\", \"by plan\"", "GROUP BY item, with item in SELECT"], ["\"which item had the most\"", "GROUP BY … ORDER BY total DESC LIMIT 1"], ["\"only October\" with piles", "WHERE before GROUP BY"], ["\"per city and plan\"", "GROUP BY city, plan"], ["\"each customer's first\"", "MIN(day) … GROUP BY customer_id"]],
};
// the parts a query uses, read from its words. A clause set is the sorted list: "group+order+where"
export function clauses(q) {
  const s = q.replace(/'[^']*'/g, "''").toUpperCase(), has = (re) => re.test(s), out = [];
  if (has(/\bWHERE\b/)) out.push("where");
  if (has(/\bORDER BY\b|\bLIMIT\b/)) out.push("order");
  if (/\b(AND|OR)\b/.test(s.replace(/\bBETWEEN\s+\S+\s+AND\s+\S+/g, ""))) out.push("andor");
  if (has(/\bIN\s*\(|\bBETWEEN\b|\bLIKE\b/)) out.push("inlike");
  if (has(/\b(COUNT|SUM|AVG|MIN|MAX)\s*\(/)) out.push("agg");
  if (has(/\bDISTINCT\b/)) out.push("distinct");
  if (has(/\bGROUP BY\b/)) out.push("group");
  if (has(/\bHAVING\b/)) out.push("having");
  if (has(/\bLEFT\s+(OUTER\s+)?JOIN\b/)) out.push("left");
  if (/\bJOIN\b/.test(s.replace(/\bLEFT\s+(OUTER\s+)?JOIN\b/g, ""))) out.push("join");
  if (has(/\bIS\s+(NOT\s+)?NULL\b|\bCOALESCE\s*\(/)) out.push("nulls");
  if (has(/\bCASE\b/)) out.push("case");
  if (has(/\b(LOWER|TRIM|SUBSTR|INSTR|NULLIF)\s*\(/)) out.push("messy");
  if (has(/\b(STRFTIME|JULIANDAY|DATE)\s*\(/)) out.push("dates");
  if (/\(\s*SELECT\b/.test(s.replace(/\bAS\s*\(\s*SELECT\b/g, "AS ("))) out.push("subquery");
  if (has(/^\s*WITH\b/)) out.push("cte");
  if (has(/\bOVER\s*\(/)) out.push("window");
  if (has(/\b(LAG|LEAD)\s*\(/)) out.push("lag");
  return out.sort().join("+");
}

// ---------- batch 2 (SQL-CURRICULUM.md): HAVING, the order SQL runs, Metric 1, Cases A and B ----------
// A step is a part, a metric step or a case. Metric steps and cases reuse the tiers: a metric step climbs Fill (1),
// Write (2) and Fix (4); a "find the money" step and a case are Chain reps (several linked queries, the first answers
// feeding the next). A case climbs guided (1), hinted (2) and solo (3); a solo pass opens the next unit.
const MONTH = [["September", "2026-09-01", "2026-09-30"], ["October", "2026-10-01", "2026-10-31"]];
const inMonth = (m) => `day BETWEEN '${m[1]}' AND '${m[2]}'`;
const list = (xs) => xs.map((x) => typeof x === "string" ? `'${x}'` : x).join(", ");
// paid orders per customer inside a window, read straight from the rows (chains need the answers to build the next ask)
function perCustomer(from = "0000", to = "9999") {
  const m = new Map();
  for (const [, c, , amt, day, st] of ORDERS) if (st === "paid" && day >= from && day <= to) { const v = m.get(c) || { n: 0, sum: 0 }; v.n++; v.sum += amt; m.set(c, v); }
  return m;
}
const r2 = (x) => Math.round(x * 100) / 100;
const NEW = [
  { id: "having", n: 9, group: "Unit B · Numbers", name: "HAVING", word: "HAVING",
    lesson: { frank: "WHERE frisks the rows. HAVING frisks the piles. Get them backwards and you've got nothing.",
      lines: ["<code>HAVING</code> goes right after <code>GROUP BY</code> and keeps only the piles whose total passes the test.",
        "<code>HAVING COUNT(*) &gt;= 3</code> keeps piles of 3 or more. <code>HAVING SUM(amount) &gt; 100</code> keeps the big earners.",
        "A test on single rows (one order's amount, a city) still goes in WHERE. A test on a total goes in HAVING."],
      example: "SELECT city, COUNT(*) FROM customers GROUP BY city HAVING COUNT(*) >= 3;" },
    tpl: [
      [1, (r) => { const n = pick(r, [3, 4]); return { who: "hank", ask: `Items with more than ${n} orders. Item and the count.`, sql: `SELECT item, COUNT(*) FROM orders GROUP BY item HAVING COUNT(*) > ${n};` }; }],
      [1, () => ({ who: "priya", ask: "Customers with 3 or more orders. customer_id and the count.", sql: "SELECT customer_id, COUNT(*) FROM orders GROUP BY customer_id HAVING COUNT(*) >= 3;" })],
      [1, (r) => { const x = pick(r, [90, 140]); return { who: "hank", ask: `Items that brought in more than $${x}. Item and the total.`, sql: `SELECT item, SUM(amount) FROM orders GROUP BY item HAVING SUM(amount) > ${x};` }; }],
      [2, (r) => { const x = pick(r, [90, 100]); return { who: "dana", ask: `Customers who've spent more than $${x} in all. customer_id and the total.`, sql: `SELECT customer_id, SUM(amount) FROM orders GROUP BY customer_id HAVING SUM(amount) > ${x};` }; }],
      [2, (r) => { const n = pick(r, [10, 12]); return { who: "rosa", ask: `Cities whose customers average more than ${n} opens. City and the average.`, sql: `SELECT city, AVG(opens) FROM customers GROUP BY city HAVING AVG(opens) > ${n};` }; }],
      [2, () => ({ who: "priya", ask: "Items bought by more than 3 different customers. Item and the number of customers.", sql: "SELECT item, COUNT(DISTINCT customer_id) FROM orders GROUP BY item HAVING COUNT(DISTINCT customer_id) > 3;" })],
      [3, () => ({ who: "theo", ask: "October only: items with more than 1 order that month. Item and the count.", sql: `SELECT item, COUNT(*) FROM orders WHERE ${inMonth(MONTH[1])} GROUP BY item HAVING COUNT(*) > 1;`,
        base: `SELECT item, COUNT(*) FROM orders WHERE ${inMonth(MONTH[1])} GROUP BY item;`, hint: "WHERE keeps the October rows first. HAVING then drops the small piles. Both in one query: WHERE before GROUP BY, HAVING after.",
        marks: [["October only", "inlike"], ["items", "group"], ["more than 1 order", "having"]] })],
      [3, () => ({ who: "hank", ask: "Customers with 3+ orders, biggest spender first. customer_id and what they spent.", sql: "SELECT customer_id, SUM(amount) AS spent FROM orders GROUP BY customer_id HAVING COUNT(*) >= 3 ORDER BY spent DESC;", ordered: 1,
        base: "SELECT customer_id, SUM(amount) AS spent FROM orders GROUP BY customer_id ORDER BY spent DESC;", hint: "HAVING sits right after GROUP BY, before ORDER BY. It can test a different total than the one you show.",
        marks: [["3+ orders", "having"], ["biggest spender first", "order"], ["what they spent", "agg"]] })],
      [3, () => ({ who: "rosa", ask: "Cities with 2 or more subscribers. City and the count.", sql: "SELECT city, COUNT(*) FROM customers WHERE plan = 'subscriber' GROUP BY city HAVING COUNT(*) >= 2;",
        base: "SELECT city, COUNT(*) FROM customers WHERE plan = 'subscriber' GROUP BY city;", hint: "WHERE picks the subscribers before the piles are made. HAVING keeps the piles of 2 or more.",
        marks: [["Cities", "group"], ["subscribers", "where"], ["2 or more", "having"]] })],
      [4, (r) => { const n = pick(r, [3, 4]); return { who: "hank", ask: `Items with more than ${n} orders. Item and the count.`, sql: `SELECT item, COUNT(*) FROM orders GROUP BY item HAVING COUNT(*) > ${n};`,
        bad: `SELECT item, COUNT(*) FROM orders WHERE COUNT(*) > ${n} GROUP BY item;`, trap: "WHERE runs before the piles exist, so it can't see a count. A test on a total goes in HAVING, after GROUP BY." }; }],
      [4, () => ({ who: "priya", ask: "Revenue per item, counting only orders over $30. Item and the total.", sql: "SELECT item, SUM(amount) FROM orders WHERE amount > 30 GROUP BY item;",
        bad: "SELECT item, SUM(amount) FROM orders GROUP BY item HAVING amount > 30;", trap: "\"Orders over $30\" is a test on single orders, so it goes in WHERE. A bare <code>amount</code> in HAVING checks one random order per pile, and the totals keep the small orders." })],
      [4, () => ({ who: "dana", ask: "Customers with at least 3 orders. customer_id and the count.", sql: "SELECT customer_id, COUNT(*) FROM orders GROUP BY customer_id HAVING COUNT(*) >= 3;",
        bad: "SELECT customer_id, COUNT(*) FROM orders GROUP BY customer_id HAVING COUNT(*) > 3;", trap: "\"At least 3\" includes 3. That's <code>&gt;= 3</code>." })],
    ] },
  { id: "runorder", n: 10, group: "Unit B · Numbers", name: "The order SQL runs", word: "FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT",
    lesson: { frank: "You write a query top to bottom. SQL doesn't read it that way. Know the order it runs and you'll know where every row went.",
      lines: ["You write: SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT. SQL runs: <b>FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY, LIMIT</b>.",
        "So WHERE sees single rows, HAVING sees piles, and ORDER BY can use a name made in SELECT. WHERE runs before SELECT, so most databases refuse a SELECT name there. SQLite lets it slide; don't lean on it.",
        "From today, a miss shows your query run step by step next to the right one, with the rows left after each step."],
      example: "SELECT item, SUM(amount) AS total FROM orders WHERE amount > 25 GROUP BY item HAVING COUNT(*) >= 2 ORDER BY total DESC LIMIT 2;" },
    tpl: [
      [1, () => ({ who: "hank", kind: "fix", ask: "Revenue per item from Oct 1 on, biggest first. Frank's notes have it in the wrong order. Put the clauses where SQL needs them.", sql: "SELECT item, SUM(amount) AS total FROM orders WHERE day >= '2026-10-01' GROUP BY item ORDER BY total DESC;", ordered: 1,
        bad: "SELECT item, SUM(amount) AS total FROM orders GROUP BY item WHERE day >= '2026-10-01' ORDER BY total DESC;", trap: "WHERE comes before GROUP BY: rows are picked, then piled." })],
      [1, () => ({ who: "rosa", kind: "fix", ask: "Our 3 most engaged subscribers, most opens first. The query's clauses are scrambled. Put them in order.", sql: "SELECT name, opens FROM customers WHERE plan = 'subscriber' ORDER BY opens DESC LIMIT 3;", ordered: 1,
        bad: "SELECT name, opens FROM customers ORDER BY opens DESC LIMIT 3 WHERE plan = 'subscriber';", trap: "WHERE comes right after FROM. Sorting and the cut are the last two steps." })],
      [1, () => ({ who: "dana", kind: "fix", ask: "The 2 items with the most revenue, among items whose orders average over $30. The clauses are scrambled. Put them in order.", sql: "SELECT item, SUM(amount) AS total FROM orders GROUP BY item HAVING AVG(amount) > 30 ORDER BY total DESC LIMIT 2;", ordered: 1,
        bad: "SELECT item, SUM(amount) AS total FROM orders GROUP BY item HAVING AVG(amount) > 30 LIMIT 2 ORDER BY total DESC;", trap: "LIMIT is always last. Sort first, then cut." })],
      ...[["How many rows are left after WHERE, before GROUP BY makes piles?", (n) => `SELECT COUNT(*) FROM orders WHERE amount > ${n};`],
        ["How many piles does GROUP BY make?", (n) => `SELECT COUNT(DISTINCT item) FROM orders WHERE amount > ${n};`],
        ["How many rows come out at the end?", (n) => `SELECT COUNT(*) FROM (SELECT item FROM orders WHERE amount > ${n} GROUP BY item HAVING COUNT(*) >= 3);`]].map(([q, f]) =>
        [2, (r) => { const n = pick(r, [20, 25, 30]); return { who: "priya", kind: "predict", show: `SELECT item, COUNT(*) FROM orders WHERE amount > ${n} GROUP BY item HAVING COUNT(*) >= 3;`, ask: `Before it runs: ${q} Type the number.`, sql: f(n) }; }]),
      [3, () => ({ who: "theo", ask: "October orders: items sold more than once that month, the top 2 by revenue. Item and revenue.", sql: `SELECT item, SUM(amount) AS revenue FROM orders WHERE ${inMonth(MONTH[1])} GROUP BY item HAVING COUNT(*) > 1 ORDER BY revenue DESC LIMIT 2;`, ordered: 1,
        base: `SELECT item, SUM(amount) AS revenue FROM orders WHERE ${inMonth(MONTH[1])} GROUP BY item HAVING COUNT(*) > 1;`, hint: "Every clause at once. The sort and the cut come last: ORDER BY, then LIMIT, after HAVING.",
        marks: [["October orders", "inlike"], ["items", "group"], ["sold more than once", "having"], ["top 2 by revenue", "order"]] })],
      [3, () => ({ who: "hank", ask: "Counting only orders over $20: customers with 2 or more of them, the top 2 by what those orders add up to. customer_id and the total.", sql: "SELECT customer_id, SUM(amount) AS total FROM orders WHERE amount > 20 GROUP BY customer_id HAVING COUNT(*) >= 2 ORDER BY total DESC LIMIT 2;", ordered: 1,
        base: "SELECT customer_id, SUM(amount) AS total FROM orders GROUP BY customer_id HAVING COUNT(*) >= 2 ORDER BY total DESC LIMIT 2;", hint: "WHERE drops the small orders before the piles, so HAVING counts only the big ones.",
        marks: [["only orders over $20", "where"], ["2 or more of them", "having"], ["top 2", "order"]] })],
      [3, () => ({ who: "rosa", ask: "Cities with 2 or more subscribers, highest average opens first. City and the subscribers' average opens.", sql: "SELECT city, AVG(opens) AS avg_opens FROM customers WHERE plan = 'subscriber' GROUP BY city HAVING COUNT(*) >= 2 ORDER BY avg_opens DESC;", ordered: 1,
        base: "SELECT city, AVG(opens) AS avg_opens FROM customers WHERE plan = 'subscriber' GROUP BY city ORDER BY avg_opens DESC;", hint: "Rows first (WHERE), then piles (GROUP BY), then which piles (HAVING), then the sort.",
        marks: [["2 or more subscribers", "having"], ["highest average opens first", "order"]] })],
      [4, () => ({ who: "priya", ask: "Revenue per item, only from orders over $40. Item and the total.", sql: "SELECT item, SUM(amount) FROM orders WHERE amount > 40 GROUP BY item;",
        bad: "SELECT item, SUM(amount) FROM orders GROUP BY item HAVING SUM(amount) > 40;", trap: "\"Orders over $40\" is about each order: a row test, so WHERE, before the piles. <code>HAVING SUM(amount) &gt; 40</code> tests each item's whole total and keeps the small orders in it." })],
      [4, () => ({ who: "hank", ask: "Items with more than $100 of revenue in total. Item and the total.", sql: "SELECT item, SUM(amount) FROM orders GROUP BY item HAVING SUM(amount) > 100;",
        bad: "SELECT item, SUM(amount) FROM orders WHERE amount > 100 GROUP BY item;", trap: "\"In total\" is a pile test: HAVING. WHERE checks single orders, and no order is over $100." })],
      [4, () => ({ who: "theo", ask: "October items with more than $50 of revenue. Item and revenue.", sql: `SELECT item, SUM(amount) AS revenue FROM orders WHERE ${inMonth(MONTH[1])} GROUP BY item HAVING SUM(amount) > 50;`,
        bad: `SELECT item, SUM(amount) AS revenue FROM orders WHERE ${inMonth(MONTH[1])} AND revenue > 50 GROUP BY item;`, trap: "<code>revenue</code> is made in SELECT, which runs after WHERE. And it's a total, so its test goes in HAVING: <code>HAVING SUM(amount) &gt; 50</code>." })],
    ] },
  { id: "m1aov", kind: "metric", metric: 1, step: 1, owner: "hank", group: "Metric 1 · Order value", name: "AOV and revenue per customer", word: "revenue ÷ orders · revenue ÷ customers",
    lesson: { owner: "Two numbers I need every week. Average order value: what one order brings in. Revenue per customer: what one customer brings in. Mix them up and my forecast is off by half.",
      frank: "Same revenue on top, two different bottoms. Find out which one the client means before you divide.",
      lines: ["<b>AOV</b> = revenue ÷ orders: <code>SUM(amount) * 1.0 / COUNT(*)</code>, the same as <code>AVG(amount)</code>.",
        "<b>Revenue per customer</b> = revenue ÷ the customers who bought: <code>SUM(amount) * 1.0 / COUNT(DISTINCT customer_id)</code>.",
        "SQLite divides whole numbers to a whole number, so <code>* 1.0</code> keeps the cents. <code>ROUND(x, 2)</code> is fine for money: money is checked to the cent. A rate (a number under 1) is checked to 4 places, so leave it unrounded or use <code>ROUND(x, 4)</code>."],
      build: [["Revenue on top", "SELECT SUM(amount) FROM orders;"], ["÷ orders: AOV", "SELECT SUM(amount) * 1.0 / COUNT(*) AS aov FROM orders;"],
        ["÷ customers: revenue per customer", "SELECT SUM(amount) * 1.0 / COUNT(DISTINCT customer_id) AS per_customer FROM orders;"]],
      example: "SELECT SUM(amount) * 1.0 / COUNT(DISTINCT customer_id) AS per_customer FROM orders;" },
    tpl: [
      [1, (r) => { const m = pick(r, MONTH); return { who: "hank", ask: `AOV for ${m[0]}, to the cent.`, fill: `SELECT SUM(amount) * 1.0 / ____ FROM orders WHERE ${inMonth(m)};`, sql: `SELECT SUM(amount) * 1.0 / COUNT(*) FROM orders WHERE ${inMonth(m)};` }; }],
      [1, (r) => { const m = pick(r, MONTH); return { who: "hank", ask: `Revenue per customer for ${m[0]}, to the cent.`, fill: `SELECT SUM(amount) * 1.0 / ____ FROM orders WHERE ${inMonth(m)};`, sql: `SELECT SUM(amount) * 1.0 / COUNT(DISTINCT customer_id) FROM orders WHERE ${inMonth(m)};` }; }],
      [1, () => ({ who: "dana", ask: "AOV and revenue per customer, side by side.", fill: "SELECT SUM(amount) * 1.0 / COUNT(*) AS aov, SUM(amount) * 1.0 / ____ AS per_customer FROM orders;", sql: "SELECT SUM(amount) * 1.0 / COUNT(*) AS aov, SUM(amount) * 1.0 / COUNT(DISTINCT customer_id) AS per_customer FROM orders;" })],
      [2, (r) => { const i = pick(r, ["House Blend", "House Blend", "Ridgeline Espresso"]); return { who: "hank", ask: `Revenue per customer from ${i}: what each buyer of it brings in, to the cent.`, sql: `SELECT SUM(amount) * 1.0 / COUNT(DISTINCT customer_id) FROM orders WHERE item = '${i}';` }; }],
      [2, (r) => { const d = pick(r, ["2026-09-15", "2026-10-01", "2026-10-15"]); return { who: "dana", ask: `AOV of orders from ${nice(d)} on, to the cent.`, sql: `SELECT AVG(amount) FROM orders WHERE day >= '${d}';` }; }],
      [2, (r) => { const m = pick(r, MONTH); return { who: "priya", ask: `Orders per customer in ${m[0]}: orders ÷ the customers who ordered.`, sql: `SELECT COUNT(*) * 1.0 / COUNT(DISTINCT customer_id) FROM orders WHERE ${inMonth(m)};` }; }],
      [4, () => ({ who: "hank", ask: "Revenue per customer, to the cent.", sql: "SELECT SUM(amount) * 1.0 / COUNT(DISTINCT customer_id) FROM orders;",
        bad: "SELECT SUM(amount) * 1.0 / COUNT(*) FROM orders;", trap: "<code>COUNT(*)</code> counts orders, so that's AOV. Per customer divides by <code>COUNT(DISTINCT customer_id)</code>." })],
      [4, () => ({ who: "dana", ask: "AOV, to the cent.", sql: "SELECT SUM(amount) * 1.0 / COUNT(*) FROM orders;",
        bad: "SELECT SUM(amount) / COUNT(*) FROM orders;", trap: "Whole number ÷ whole number gives a whole number in SQLite: 651 / 22 = 29, not 29.59. Multiply by 1.0 first, or use AVG." })],
      [4, (r) => { const m = pick(r, MONTH); return { who: "hank", ask: `Revenue per customer for ${m[0]}, to the cent.`, sql: `SELECT SUM(amount) * 1.0 / COUNT(DISTINCT customer_id) FROM orders WHERE ${inMonth(m)};`,
        bad: `SELECT AVG(amount) FROM orders WHERE ${inMonth(m)};`, trap: "AVG(amount) averages orders, so it's AOV again. Per customer needs the customer count on the bottom." }; }],
    ] },
  { id: "m1paid", kind: "metric", metric: 1, step: 2, owner: "hank", group: "Metric 1 · Order value", name: "Paid orders only", word: "WHERE status = 'paid'",
    lesson: { owner: "Refunds aren't revenue. Two orders this fall came back, and every number so far counted them. From now on, revenue means paid.",
      frank: "A new column on the orders card. status. Somebody should've told you sooner. Somebody always should've.",
      lines: ["<code>orders.status</code> is <code>'paid'</code> or <code>'refunded'</code>. It's on the orders card from today.",
        "Revenue, AOV and revenue per customer count paid orders only: <code>WHERE status = 'paid'</code>. A refunded order leaves the COUNT too.",
        "Text matches exactly, capitals included: <code>'Paid'</code> finds nothing."],
      build: [["Everything, refunds too", "SELECT SUM(amount), COUNT(*) FROM orders;"], ["Paid only", "SELECT SUM(amount), COUNT(*) FROM orders WHERE status = 'paid';"],
        ["Paid AOV", "SELECT SUM(amount) * 1.0 / COUNT(*) AS aov FROM orders WHERE status = 'paid';"]],
      example: "SELECT SUM(amount) * 1.0 / COUNT(*) AS aov FROM orders WHERE status = 'paid';" },
    tpl: [
      [1, () => ({ who: "hank", ask: "Revenue from paid orders.", fill: "SELECT SUM(amount) FROM orders WHERE ____;", sql: "SELECT SUM(amount) FROM orders WHERE status = 'paid';" })],
      [1, (r) => { const m = pick(r, MONTH); return { who: "hank", ask: `Paid AOV for ${m[0]}, to the cent.`, fill: `SELECT SUM(amount) * 1.0 / COUNT(*) FROM orders WHERE status = 'paid' AND ____;`, sql: `SELECT SUM(amount) * 1.0 / COUNT(*) FROM orders WHERE status = 'paid' AND ${inMonth(m)};` }; }],
      [1, () => ({ who: "dana", ask: "Paid revenue per customer, to the cent.", fill: "SELECT SUM(amount) * 1.0 / ____ FROM orders WHERE status = 'paid';", sql: "SELECT SUM(amount) * 1.0 / COUNT(DISTINCT customer_id) FROM orders WHERE status = 'paid';" })],
      [2, () => ({ who: "hank", ask: "How much revenue did refunds take back?", sql: "SELECT SUM(amount) FROM orders WHERE status = 'refunded';" })],
      [2, (r) => { const m = pick(r, MONTH); return { who: "priya", ask: `Paid revenue per customer in ${m[0]}, to the cent.`, sql: `SELECT SUM(amount) * 1.0 / COUNT(DISTINCT customer_id) FROM orders WHERE status = 'paid' AND ${inMonth(m)};` }; }],
      [2, () => ({ who: "dana", ask: "How many customers have at least one paid order?", sql: "SELECT COUNT(DISTINCT customer_id) FROM orders WHERE status = 'paid';" })],
      [4, () => ({ who: "hank", ask: "Paid AOV, to the cent.", sql: "SELECT SUM(amount) * 1.0 / COUNT(*) FROM orders WHERE status = 'paid';",
        bad: "SELECT SUM(amount) * 1.0 / COUNT(*) FROM orders;", trap: "No status test, so the refunds are in the revenue and in the order count." })],
      [4, () => ({ who: "dana", ask: "Paid revenue per customer, to the cent.", sql: "SELECT SUM(amount) * 1.0 / COUNT(DISTINCT customer_id) FROM orders WHERE status = 'paid';",
        bad: "SELECT SUM(amount) * 1.0 / COUNT(DISTINCT customer_id) FROM orders WHERE status = 'Paid';", trap: "Text matches exactly. The value is <code>'paid'</code>, small p, so <code>'Paid'</code> finds no rows." })],
      [4, (r) => { const m = pick(r, MONTH); return { who: "priya", ask: `Paid AOV for ${m[0]}, to the cent.`, sql: `SELECT SUM(amount) * 1.0 / COUNT(*) FROM orders WHERE status = 'paid' AND ${inMonth(m)};`,
        bad: `SELECT SUM(amount) * 1.0 / COUNT(*) FROM orders WHERE status = 'paid' OR ${inMonth(m)};`, trap: "OR keeps every paid order from any month, and the refunds from this one. Both must be true: AND." }; }],
    ] },
  { id: "m1item", kind: "metric", metric: 1, step: 3, owner: "hank", group: "Metric 1 · Order value", name: "Order value per item and per customer", word: "GROUP BY with AOV",
    lesson: { owner: "Which item makes the big orders? And which of our customers are worth the most? Same two numbers, one per pile.",
      frank: "Pile them up, then divide inside each pile. HAVING picks the piles by their number.",
      lines: ["AOV per item: <code>GROUP BY item</code> with <code>AVG(amount)</code> or <code>SUM(amount) * 1.0 / COUNT(*)</code>.",
        "Revenue per customer per item uses <code>COUNT(DISTINCT customer_id)</code> in each pile. House Blend regulars buy it twice, so it's higher than its AOV.",
        "Items with a paid AOV over $30: <code>HAVING AVG(amount) &gt; 30</code>. Paid only, as always now."],
      build: [["Paid orders, piled by item", "SELECT item, COUNT(*) FROM orders WHERE status = 'paid' GROUP BY item;"],
        ["AOV in each pile", "SELECT item, AVG(amount) AS aov FROM orders WHERE status = 'paid' GROUP BY item;"],
        ["Biggest first", "SELECT item, AVG(amount) AS aov FROM orders WHERE status = 'paid' GROUP BY item ORDER BY aov DESC;"]],
      example: "SELECT item, AVG(amount) AS aov FROM orders WHERE status = 'paid' GROUP BY item ORDER BY aov DESC;" },
    tpl: [
      [1, () => ({ who: "hank", ask: "Paid AOV per item. Item and AOV.", fill: "SELECT item, SUM(amount) * 1.0 / COUNT(*) FROM orders WHERE status = 'paid' GROUP BY ____;", sql: "SELECT item, SUM(amount) * 1.0 / COUNT(*) FROM orders WHERE status = 'paid' GROUP BY item;" })],
      [1, () => ({ who: "hank", ask: "Paid revenue per customer, for each item. Item and revenue per customer.", fill: "SELECT item, SUM(amount) * 1.0 / ____ FROM orders WHERE status = 'paid' GROUP BY item;", sql: "SELECT item, SUM(amount) * 1.0 / COUNT(DISTINCT customer_id) FROM orders WHERE status = 'paid' GROUP BY item;" })],
      [2, (r) => { const x = pick(r, [30, 40]); return { who: "dana", ask: `Items with a paid AOV over $${x}. Item and AOV.`, sql: `SELECT item, AVG(amount) FROM orders WHERE status = 'paid' GROUP BY item HAVING AVG(amount) > ${x};` }; }],
      [2, () => ({ who: "hank", ask: "Our 3 biggest customers by paid revenue. customer_id and what they spent, most first.", sql: "SELECT customer_id, SUM(amount) AS spent FROM orders WHERE status = 'paid' GROUP BY customer_id ORDER BY spent DESC LIMIT 3;", ordered: 1 })],
      [2, (r) => { const m = pick(r, MONTH); return { who: "priya", ask: `Paid AOV per item in ${m[0]}, highest first. Item and AOV.`, sql: `SELECT item, AVG(amount) AS aov FROM orders WHERE status = 'paid' AND ${inMonth(m)} GROUP BY item ORDER BY aov DESC;`, ordered: 1 }; }],
      [4, () => ({ who: "hank", ask: "Paid revenue per customer, for each item. Item and revenue per customer.", sql: "SELECT item, SUM(amount) * 1.0 / COUNT(DISTINCT customer_id) FROM orders WHERE status = 'paid' GROUP BY item;",
        bad: "SELECT item, AVG(amount) FROM orders WHERE status = 'paid' GROUP BY item;", trap: "AVG divides by orders. Two House Blend buyers ordered it twice, so per customer it's $28.29, not $22." })],
      [4, () => ({ who: "dana", ask: "Items with a paid AOV over $30. Item and AOV.", sql: "SELECT item, AVG(amount) FROM orders WHERE status = 'paid' GROUP BY item HAVING AVG(amount) > 30;",
        bad: "SELECT item, AVG(amount) FROM orders WHERE status = 'paid' AND amount > 30 GROUP BY item;", trap: "<code>amount &gt; 30</code> in WHERE throws out the small orders before the average, so every average looks big. A test on the average goes in HAVING." })],
    ] },
  { id: "m1money", kind: "metric", metric: 1, step: 4, owner: "hank", group: "Metric 1 · Order value", name: "Find the money: the second order", word: "a chain: one answer feeds the next",
    rule: { practice: 0, climb: 1, pass: [2, 2] },
    lesson: { owner: "One-order customers bring in a fraction of what repeat customers do. If each of them came back like the regulars, what's that worth? That's the number I take to the budget meeting.",
      frank: "Four questions. Each answer feeds the next. Write it down, kid. Then type it in.",
      lines: ["Step 1 finds who has one paid order: <code>GROUP BY customer_id HAVING COUNT(*) = 1</code>.",
        "Steps 2 and 3 use those ids: <code>customer_id IN (2, 6, …)</code> for them, <code>NOT IN (…)</code> for everyone else.",
        "Step 4 is plain arithmetic. SELECT does sums with no table: <code>SELECT (99.8 - 21.2) * 5;</code>"],
      build: [["Who has one paid order", "SELECT customer_id FROM orders WHERE status = 'paid' GROUP BY customer_id HAVING COUNT(*) = 1;"],
        ["What they're worth each", "SELECT SUM(amount) * 1.0 / COUNT(DISTINCT customer_id) FROM orders WHERE status = 'paid' AND customer_id IN (2, 6, 7, 10, 12);"]],
      example: "SELECT SUM(amount) * 1.0 / COUNT(DISTINCT customer_id) FROM orders WHERE status = 'paid' AND customer_id IN (2, 6, 7, 10, 12);" },
    tpl: [1, 2].flatMap((tier) => [[tier, (r) => {
      const m = pick(r, [null, MONTH[0], MONTH[1]]), w = m ? ` AND ${inMonth(m)}` : "", pc = perCustomer(m ? m[1] : undefined, m ? m[2] : undefined);
      const one = [...pc].filter(([, v]) => v.n === 1).map(([c]) => c).sort((a, b) => a - b), rest = [...pc].filter(([, v]) => v.n > 1);
      const a = one.reduce((s, c) => s + pc.get(c).sum, 0) / one.length, b = rest.reduce((s, [, v]) => s + v.sum, 0) / rest.length, when = m ? `in ${m[0]}` : "so far";
      return { who: "hank", ask: `What are the second orders worth? Paid orders ${when}. Four steps, I need the last number.`, sql: `SELECT (${r2(b)} - ${r2(a)}) * ${one.length};`,
        steps: [
          { ask: `Who has exactly one paid order ${when}? customer_id only.`, sql: `SELECT customer_id FROM orders WHERE status = 'paid'${w} GROUP BY customer_id HAVING COUNT(*) = 1;`, hint: "Pile by customer, keep piles of exactly 1." },
          { ask: "Paid revenue per customer for those one-order customers. Use the ids you just got.", sql: `SELECT SUM(amount) * 1.0 / COUNT(DISTINCT customer_id) FROM orders WHERE status = 'paid'${w} AND customer_id IN (${list(one)});`, hint: "customer_id IN ( the ids ) picks just them." },
          { ask: "Now the same for everyone else who bought: the repeat customers.", sql: `SELECT SUM(amount) * 1.0 / COUNT(DISTINCT customer_id) FROM orders WHERE status = 'paid'${w} AND customer_id NOT IN (${list(one)});`, hint: "NOT IN ( the same ids ) picks everyone else." },
          { ask: `The money: (repeat customers' number − one-order customers' number) × how many one-order customers there are. Do the sum in SQL.`, sql: `SELECT (${r2(b)} - ${r2(a)}) * ${one.length};`, tol: 0.01, hint: "SELECT ( big − small ) * count; with the numbers from steps 2 and 3." },
        ] };
    }]]) },
];
// ---------- cases (gates): a story in linked queries. Support fades: guided, hinted, solo ----------
const CASES = [
  { id: "caseA", kind: "case", group: "Case A · the pop-up", name: "Case A: the pop-up", word: "three send lists, no help on the last run", gate: "Unit B",
    lesson: { owner: "We're doing a pop-up shop! Two cities, one weekend. I need the invite lists by Friday. Thank you sooo much!",
      frank: "A case. Four queries, one story. First time through I'll name the clauses for you. Second time you can ask. Third time you're on your own, and that's the one that counts.",
      lines: ["A case is a run of linked requests. Everything in it is from Unit A: SELECT, WHERE, ORDER BY, AND, OR, IN, BETWEEN, LIKE.",
        "Run 1 is <b>guided</b>: each request names its clauses and the casebook is open. Run 2 is <b>hinted</b>: Tab shows them, free. Run 3 is <b>solo</b>: a peek counts as help.",
        "A clean solo run closes the case and opens Unit B. A miss just means another run at the same level."],
      example: "SELECT name, city FROM customers WHERE city IN ('Boston', 'Austin');" },
    tpl: [1, 2, 3].map((tier) => [tier, (r) => {
      const [a, b] = shuffle(r, CITIES).slice(0, 2), there = CUSTOMERS.filter((c) => c[2] === a || c[2] === b);
      const n = pick(r, [5, 8, 10].filter((k) => there.filter((c) => c[4] > k).length >= 2)), item = pick(r, ITEMS);
      // the VIP cutoff is the newest subscriber's join day there, so "before" leaves that one out
      const subs = there.filter((c) => c[3] === "subscriber").map((c) => c[5]).sort(), cut = subs.length >= 2 ? subs.at(-1) : "2026-07-01";
      return { who: "theo", ask: `The pop-up runs in ${a} and ${b}! I need three invite lists, then a quick check on the orders.`, sql: `SELECT name, city FROM customers WHERE city IN ('${a}', '${b}');`,
        steps: [
          { ask: `Everyone in ${a} or ${b}. Name and city.`, sql: `SELECT name, city FROM customers WHERE city IN ('${a}', '${b}');` },
          { ask: `Only the readers: people in those two cities with more than ${n} opens. Name and opens, most opens first.`, sql: `SELECT name, opens FROM customers WHERE city IN ('${a}', '${b}') AND opens > ${n} ORDER BY opens DESC;`, ordered: 1 },
          { ask: `VIP invites: subscribers in those two cities who joined before ${nice(cut)}, earliest first. Name and joined.`, sql: `SELECT name, joined FROM customers WHERE city IN ('${a}', '${b}') AND plan = 'subscriber' AND joined < '${cut}' ORDER BY joined;`, ordered: 1 },
          { ask: `The pop-up sells ${item}. Every ${item} order from Sep 15 to Oct 15, both days included, newest first. customer_id and day.`, sql: `SELECT customer_id, day FROM orders WHERE item = '${item}' AND day BETWEEN '2026-09-15' AND '2026-10-15' ORDER BY day DESC;`, ordered: 1 },
        ] };
    }]) },
  { id: "caseB", kind: "case", group: "Case B · the weekly numbers", name: "Case B: the weekly numbers", word: "Dana's report, five numbers", gate: "Unit C",
    lesson: { owner: "Monday report time. Leadership wants five numbers for the month, and they want them right. No refunds in anything, please!",
      frank: "Five numbers. Every one of them has a way to be wrong. Paid only. Cents kept. Piles where piles go.",
      lines: ["Everything from Unit B and Metric 1: totals, DISTINCT, GROUP BY, HAVING, AOV, paid orders only.",
        "Run 1 is <b>guided</b>, run 2 <b>hinted</b>, run 3 <b>solo</b>. A clean solo run closes the case and opens Unit C.",
        "Each run picks a month, so the numbers change between runs."],
      example: "SELECT SUM(amount) * 1.0 / COUNT(*) FROM orders WHERE status = 'paid';" },
    tpl: [1, 2, 3].map((tier) => [tier, (r) => {
      const m = pick(r, MONTH), w = `status = 'paid' AND ${inMonth(m)}`;
      // the last number changes too: repeat buyers, or the month's big spenders
      const last = pick(r, [0, 1]) ? { ask: `Repeat buyers in ${m[0]}: customers with 2 or more paid orders that month. customer_id and the count.`, sql: `SELECT customer_id, COUNT(*) FROM orders WHERE ${w} GROUP BY customer_id HAVING COUNT(*) >= 2;` }
        : { ask: `Big spenders in ${m[0]}: customers who paid $30 or more in all that month. customer_id and their total.`, sql: `SELECT customer_id, SUM(amount) FROM orders WHERE ${w} GROUP BY customer_id HAVING SUM(amount) >= 30;` };
      return { who: "dana", ask: `My monthly numbers for ${m[0]}, please. Paid orders only, all five.`, sql: `SELECT SUM(amount) FROM orders WHERE ${w};`,
        steps: [
          { ask: `Paid revenue for ${m[0]}.`, sql: `SELECT SUM(amount) FROM orders WHERE ${w};` },
          { ask: `Paid AOV for ${m[0]}, to the cent.`, sql: `SELECT SUM(amount) * 1.0 / COUNT(*) FROM orders WHERE ${w};` },
          { ask: `How many different customers paid for something in ${m[0]}? People, not orders.`, sql: `SELECT COUNT(DISTINCT customer_id) FROM orders WHERE ${w};` },
          { ask: `Paid revenue per item for ${m[0]}, biggest first. Item and revenue.`, sql: `SELECT item, SUM(amount) AS revenue FROM orders WHERE ${w} GROUP BY item ORDER BY revenue DESC;`, ordered: 1 },
          last,
        ] };
    }]) },
];
// ---------- Unit C: tables (SQL-CURRICULUM.md). From here on the desk runs on the grown shop (sqlshop.mjs) ----------
const MULTI = [...new Set(SHOP.order_items.map((x) => x[0]))].filter((id) => SHOP.order_items.filter((x) => x[0] === id).length >= 2).slice(0, 30);
const PNAMES = PRODUCTS.slice(0, 5).map((p) => p[1]);
const BIGMONTH = [["August", "2026-08-01", "2026-08-31"], ["September", "2026-09-01", "2026-09-30"], ["October", "2026-10-01", "2026-10-31"]];
const CAMPAIGNS = ["2026-09-10", "2026-10-10", "2026-11-05"];
const NEVER_CITIES = CITIES.filter((c) => SHOP.customers.some((x) => x[2] === c && !SHOP.orders.some((o) => o[1] === x[0])));
const UNIT_C = [
  { id: "newboard", n: 11, group: "Unit C · Tables", name: "Read the new board", word: "SELECT * … LIMIT 5 · COUNT(*) · one row is …",
    lesson: { frank: "New case, new files. Before you question anybody, read the files: what's in each drawer, and what one sheet stands for.",
      lines: ["The board grew: the whole shop, 150 customers, every order, every email. <b>Orders don't name the product any more</b>: one basket can hold several, so <code>order_items</code> lists them and <code>products</code> names them.",
        "Every card says what one row is: one row per order, one row per product in an order, one row per email. Read that line before you count anything.",
        "<code>SELECT * FROM order_items LIMIT 5</code> shows a few rows. <code>SELECT COUNT(*) FROM sends</code> says how big a table is. Look first, then write.",
        "The red strings are ids that point across tables: <code>order_items.order_id</code> is an <code>orders.id</code>. Following them is the next part, JOIN."],
      example: "SELECT * FROM order_items LIMIT 5;" },
    tpl: [
      [1, (r) => { const t = pick(r, ["order_items", "sends", "products"]); return { who: "dana", ask: `The first 5 rows of ${t}, every column.`, sql: `SELECT * FROM ${t} LIMIT 5;` }; }],
      [1, (r) => { const t = pick(r, ["order_items", "sends", "customers", "orders"]); return { who: "hank", ask: `How many rows does ${t} have?`, sql: `SELECT COUNT(*) FROM ${t};` }; }],
      [1, () => ({ who: "priya", ask: "Every product: name, price and unit_cost.", sql: "SELECT name, price, unit_cost FROM products;" })],
      [2, (r) => { const id = pick(r, MULTI); return { who: "priya", ask: `The rows of order_items for order ${id}. Every column.`, sql: `SELECT * FROM order_items WHERE order_id = ${id};` }; }],
      [2, (r) => { const id = pick(r, MULTI); return { who: "theo", ask: `How many different products were in order ${id}? (One row of order_items is one product in an order.)`, sql: `SELECT COUNT(*) FROM order_items WHERE order_id = ${id};` }; }],
      [2, (r) => { const c = pick(r, [2, 5, 9, 14]); return { who: "rosa", ask: `Every email sent to customer ${c}: id, flow and day.`, sql: `SELECT id, flow, day FROM sends WHERE customer_id = ${c};` }; }],
      [3, () => ({ who: "hank", ask: "How many different orders show up in order_items?", sql: "SELECT COUNT(DISTINCT order_id) FROM order_items;",
        base: "SELECT COUNT(*) FROM order_items;", hint: "One order has a row per product, so rows aren't orders. Count each order_id once.",
        marks: [["different orders", "distinct"]] })],
      [3, () => ({ who: "rosa", ask: "Emails sent per flow, most first. Flow and emails.", sql: "SELECT flow, COUNT(*) AS emails FROM sends GROUP BY flow ORDER BY emails DESC;", ordered: 1,
        base: "SELECT COUNT(*) AS emails FROM sends;", hint: "Pile by flow, then sort by the count.",
        marks: [["per flow", "group"], ["most first", "order"]] })],
      [3, () => ({ who: "dana", ask: "Products with a margin (price − unit_cost) of $14 or more, biggest margin first. Name and margin.", sql: "SELECT name, price - unit_cost AS margin FROM products WHERE price - unit_cost >= 14 ORDER BY margin DESC;", ordered: 1,
        base: "SELECT name, price, unit_cost FROM products;", hint: "Math works on columns: price - unit_cost. Test it in WHERE, sort by its name.",
        marks: [["$14 or more", "where"], ["biggest margin first", "order"]] })],
      [4, () => ({ who: "hank", ask: "How many orders are there?", sql: "SELECT COUNT(*) FROM orders;",
        bad: "SELECT COUNT(*) FROM order_items;", trap: "One row of order_items is one product in an order, so a basket of three counts three times. Orders live in orders." })],
      [4, () => ({ who: "rosa", ask: "How many customers were sent at least one email?", sql: "SELECT COUNT(DISTINCT customer_id) FROM sends;",
        bad: "SELECT COUNT(*) FROM sends;", trap: "One row of sends is one email, and most people got several. Count each customer_id once." })],
    ] },
  { id: "join", n: 12, group: "Unit C · Tables", name: "JOIN", word: "JOIN … ON",
    lesson: { frank: "The full export came in. Five tables now. They never met, they said. The keys say otherwise.",
      lines: ["<code>JOIN</code> lines up rows from two tables where a key matches: <code>FROM orders JOIN customers ON orders.customer_id = customers.id</code>. The red strings on the board are those keys.",
        "Both tables have an <code>id</code>, so name the table before a column: <code>orders.id</code>, <code>customers.name</code>. A bare <code>id</code> won't run.",
        "That gets long. From the third request on, short names: <code>FROM orders o JOIN customers c ON o.customer_id = c.id</code>, then <code>o.id</code>, <code>c.name</code>. Same query.",
        "It's a grid, not a Venn diagram: one row out for every pair of rows that match ON."],
      example: "SELECT orders.id, customers.name, orders.amount FROM orders JOIN customers ON orders.customer_id = customers.id WHERE orders.day >= '2026-11-10';" },
    tpl: [
      [1, (r) => { const d = pick(r, ["2026-11-01", "2026-11-08"]); return { who: "dana", ask: `Every order from ${nice(d)} on, with the customer's name. Order id, name and amount.`, sql: `SELECT orders.id, customers.name, orders.amount FROM orders JOIN customers ON orders.customer_id = customers.id WHERE orders.day >= '${d}';` }; }],
      [1, (r) => { const c = pick(r, CITIES); return { who: "theo", ask: `Orders from ${c} customers: their name, the order day and the amount.`, sql: `SELECT customers.name, orders.day, orders.amount FROM orders JOIN customers ON orders.customer_id = customers.id WHERE customers.city = '${c}';` }; }],
      [1, (r) => { const n = pick(r, [80, 100]); return { who: "hank", ask: `Orders over $${n}, with who placed them. Order id, name and amount.`, sql: `SELECT orders.id, customers.name, orders.amount FROM orders JOIN customers ON orders.customer_id = customers.id WHERE orders.amount > ${n};` }; }],
      [2, (r) => { const id = pick(r, MULTI); return { who: "priya", ask: `What was in order ${id}? Product name and qty.`, sql: `SELECT p.name, i.qty FROM order_items i JOIN products p ON i.product_id = p.id WHERE i.order_id = ${id};` }; }],
      [2, (r) => { const d = pick(r, CAMPAIGNS); return { who: "rosa", ask: `Who was sent the ${nice(d)} campaign email? Name and city.`, sql: `SELECT c.name, c.city FROM sends s JOIN customers c ON s.customer_id = c.id WHERE s.flow = 'campaign' AND s.day = '${d}';` }; }],
      [2, (r) => { const p = pick(r, PNAMES); return { who: "theo", ask: `Every order line of ${p}, refunds too: order_id and qty.`, sql: `SELECT i.order_id, i.qty FROM order_items i JOIN products p ON i.product_id = p.id WHERE p.name = '${p}';` }; }],
      [2, (r) => { const c = pick(r, CITIES); return { who: "priya", kind: "predict", show: `SELECT c.name, o.amount FROM customers c JOIN orders o ON o.customer_id = c.id WHERE c.city = '${c}';`, ask: `Before it runs: how many rows will this return? One row per pair that matches ON.`, sql: `SELECT COUNT(*) FROM customers c JOIN orders o ON o.customer_id = c.id WHERE c.city = '${c}';` }; }],
      [3, () => { const n = cleanLimit(rng(1), SHOP.orders.filter((o) => o[3] >= "2026-11-01").map((o) => o[2]), true, [3, 4, 5]); return { who: "hank", ask: `The ${n} biggest November orders, with the customer's name. Name and amount, biggest first.`, sql: `SELECT c.name, o.amount FROM orders o JOIN customers c ON o.customer_id = c.id WHERE o.day >= '2026-11-01' ORDER BY o.amount DESC LIMIT ${n};`, ordered: 1,
        base: `SELECT o.amount FROM orders o WHERE o.day >= '2026-11-01' ORDER BY o.amount DESC LIMIT ${n};`, hint: "The JOIN goes right after FROM, before WHERE. The rest of the query doesn't change.",
        marks: [["biggest", "order"], ["November orders", "where"], ["with the customer's name", "join"]] }; }],
      [3, (r) => { const [a, b] = shuffle(r, CITIES).slice(0, 2); return { who: "theo", ask: `Orders over $60 from customers in ${a} or ${b}. Name, city and amount.`, sql: `SELECT c.name, c.city, o.amount FROM orders o JOIN customers c ON o.customer_id = c.id WHERE o.amount > 60 AND c.city IN ('${a}', '${b}');`,
        base: `SELECT o.amount FROM orders o WHERE o.amount > 60;`, hint: "A WHERE can test columns from both tables once they're joined: o.amount and c.city.",
        marks: [["over $60", "andor"], [`in ${a} or ${b}`, "inlike"], ["Name, city", "join"]] }; }],
      [3, () => ({ who: "priya", ask: "Every order line with Espresso in the product's name. order_id, product name and qty.", sql: "SELECT i.order_id, p.name, i.qty FROM order_items i JOIN products p ON i.product_id = p.id WHERE p.name LIKE '%Espresso%';",
        base: "SELECT i.order_id, i.qty FROM order_items i;", hint: "The name lives on products, so join it first. Then LIKE tests it like any column.",
        marks: [["Espresso in the product's name", "inlike"], ["product name", "join"]] })],
      [4, () => ({ who: "dana", ask: "Every order from Nov 8 on, with the customer's name. Order id, name and amount.", sql: "SELECT o.id, c.name, o.amount FROM orders o JOIN customers c ON o.customer_id = c.id WHERE o.day >= '2026-11-08';",
        bad: "SELECT o.id, c.name, o.amount FROM orders o JOIN customers c ON o.id = c.id WHERE o.day >= '2026-11-08';", trap: "<code>o.id</code> is the order's own number. The customer is <code>o.customer_id</code>. Joining id to id pairs order 7 with customer 7." })],
      [4, () => ({ who: "theo", ask: "Orders over $100 with the customer's name. Order id, name and amount.", sql: "SELECT o.id, c.name, o.amount FROM orders o JOIN customers c ON o.customer_id = c.id WHERE o.amount > 100;",
        bad: "SELECT id, name, amount FROM orders o JOIN customers c ON o.customer_id = c.id WHERE amount > 100;", trap: "Both tables have an <code>id</code>, so SQL can't tell which you mean. Put the table's short name on it: <code>o.id</code>." })],
      [4, (r) => { const id = pick(r, MULTI); return { who: "priya", ask: `What was in order ${id}? Product name and qty.`, sql: `SELECT p.name, i.qty FROM order_items i JOIN products p ON i.product_id = p.id WHERE i.order_id = ${id};`,
        bad: `SELECT p.name, i.qty FROM order_items i JOIN products p ON i.order_id = p.id WHERE i.order_id = ${id};`, trap: "The string runs from <code>i.product_id</code> to <code>p.id</code>. Joining the order's number to the product's number gives a random product." }; }],
    ] },
  { id: "left", n: 13, group: "Unit C · Tables", name: "LEFT JOIN", word: "LEFT JOIN",
    lesson: { frank: "JOIN only keeps the ones who showed up. LEFT JOIN keeps everybody on the left, even the ones who never did a thing.",
      lines: ["<code>LEFT JOIN</code> keeps every row of the table after FROM, matched or not. With no match, the right table's columns come back empty (NULL).",
        "Which side is left? The one after FROM. Put the table you must keep all of there.",
        "The ask tells you: \"including\", \"every customer, even\", \"and any orders they have\".",
        "A test on the right table (\"their October orders\") goes in <code>ON</code>: <code>ON o.customer_id = c.id AND o.day &gt;= '2026-10-01'</code>. In WHERE it drops the customers with none."],
      example: "SELECT c.name, o.id FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE c.city = 'Portland';" },
    tpl: [
      [1, (r) => { const c = pick(r, CITIES); return { who: "dana", ask: `Every customer in ${c} with their order ids, including people with no orders. Name and order id.`, sql: `SELECT c.name, o.id FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE c.city = '${c}';` }; }],
      [1, () => ({ who: "hank", ask: "Every product and the orders it was in, including products nobody bought. Product name and order_id.", sql: "SELECT p.name, i.order_id FROM products p LEFT JOIN order_items i ON i.product_id = p.id;" })],
      [2, () => ({ who: "theo", ask: "Everyone who joined from Nov 1 on, and any order they've placed. Name and order day.", sql: "SELECT c.name, o.day FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE c.joined >= '2026-11-01';" })],
      [2, (r) => { const c = pick(r, CITIES); return { who: "rosa", ask: `Every ${c} customer and the emails they were sent: name, flow and day. Include anyone who got none.`, sql: `SELECT c.name, s.flow, s.day FROM customers c LEFT JOIN sends s ON s.customer_id = c.id WHERE c.city = '${c}';` }; }],
      [2, (r) => { const c = pick(r, CITIES); return { who: "priya", kind: "predict", show: `SELECT c.name, o.id FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE c.city = '${c}';`, ask: "Before it runs: how many rows? Every match makes a row, and a customer with no match still makes one.", sql: `SELECT COUNT(*) FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE c.city = '${c}';` }; }],
      [3, (r) => { const c = pick(r, CITIES); return { who: "dana", ask: `${c} subscribers and any orders they've placed, A to Z by name. Include subscribers with none. Name and amount.`, sql: `SELECT c.name, o.amount FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE c.city = '${c}' AND c.plan = 'subscriber' ORDER BY c.name;`, ordered: 0,
        base: `SELECT c.name FROM customers c WHERE c.city = '${c}' AND c.plan = 'subscriber' ORDER BY c.name;`, hint: "The LEFT JOIN sits right after FROM. The WHERE tests the left table, so nobody you meant to keep gets dropped.",
        marks: [[`${c} subscribers`, "andor"], ["Include subscribers with none", "left"], ["A to Z by name", "order"]] }; }],
      [3, () => ({ who: "theo", ask: "Customers who joined in October and any emails they got, newest send first. Name, flow and day; keep people with no emails.", sql: "SELECT c.name, s.flow, s.day FROM customers c LEFT JOIN sends s ON s.customer_id = c.id WHERE c.joined BETWEEN '2026-10-01' AND '2026-10-31' ORDER BY s.day DESC;", ordered: 2,
        base: "SELECT c.name FROM customers c WHERE c.joined BETWEEN '2026-10-01' AND '2026-10-31';", hint: "Keep-everyone words (\"keep people with no emails\") mean LEFT JOIN. The sort can use the right table's column.",
        marks: [["joined in October", "inlike"], ["keep people with no emails", "left"], ["newest send first", "order"]] })],
      [4, (r) => { const c = pick(r, CITIES); return { who: "dana", ask: `Every customer in ${c} with their order ids. Name and order id.`, sql: `SELECT c.name, o.id FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE c.city = '${c}';`,
        bad: `SELECT c.name, o.id FROM customers c JOIN orders o ON o.customer_id = c.id WHERE c.city = '${c}';`, trap: "A plain JOIN drops the customers with no orders. \"Including\" means LEFT JOIN." }; }],
      [4, (r) => { const c = pick(r, CITIES); return { who: "theo", ask: `Every ${c} customer with their October order ids, including people with none in October. Name and order id.`, sql: `SELECT c.name, o.id FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.day BETWEEN '2026-10-01' AND '2026-10-31' WHERE c.city = '${c}';`,
        bad: `SELECT c.name, o.id FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE c.city = '${c}' AND o.day BETWEEN '2026-10-01' AND '2026-10-31';`, trap: "A WHERE on the right table throws out the rows with no October order, so the LEFT JOIN acts like a JOIN. October goes in ON." }; }],
      [4, () => ({ who: "hank", ask: "Every product and the orders it was in. Product name and order_id.", sql: "SELECT p.name, i.order_id FROM products p LEFT JOIN order_items i ON i.product_id = p.id;",
        bad: "SELECT p.name, i.order_id FROM order_items i LEFT JOIN products p ON i.product_id = p.id;", trap: "LEFT JOIN keeps everything in the table after FROM. Here that's order_items, which only has products that sold. Put products first." })],
    ] },
  { id: "nulls", n: 14, group: "Unit C · Tables", name: "NULL", word: "IS NULL · COALESCE",
    lesson: { frank: "NULL. Not zero. Not empty. Gone. I've seen good analysts lose a quarter over a NULL.",
      lines: ["NULL means no value. Test it with <code>IS NULL</code> or <code>IS NOT NULL</code>. <code>= NULL</code> is never true, so it finds nothing.",
        "<code>COUNT(*)</code> counts rows. <code>COUNT(clicked_day)</code> skips the NULLs, so it counts the clicks.",
        "<code>COALESCE(city, 'unknown')</code> swaps a NULL for a value. A test like <code>city != 'Boston'</code> skips NULL cities too: NULL isn't equal or unequal to anything.",
        "SUM, AVG, MIN and MAX skip NULLs. A SUM over nothing but NULLs is NULL, not 0: <code>COALESCE(SUM(o.amount), 0)</code>."],
      example: "SELECT name, city FROM customers WHERE city IS NULL;" },
    tpl: [
      [1, () => ({ who: "dana", ask: "Customers with no city on file. id and name.", sql: "SELECT id, name FROM customers WHERE city IS NULL;" })],
      [1, () => ({ who: "hank", ask: "Orders that used a discount code. id, amount and code.", sql: "SELECT id, amount, code FROM orders WHERE code IS NOT NULL;" })],
      [1, (r) => { const f = pick(r, ["welcome", "campaign"]); return { who: "rosa", ask: `${f[0].toUpperCase() + f.slice(1)} emails that got a click. id, day and clicked_day.`, sql: `SELECT id, day, clicked_day FROM sends WHERE flow = '${f}' AND clicked_day IS NOT NULL;` }; }],
      [2, (r) => { const f = pick(r, ["welcome", "campaign"]); return { who: "rosa", ask: `How many ${f} emails were clicked?`, sql: `SELECT COUNT(clicked_day) FROM sends WHERE flow = '${f}';` }; }],
      [2, () => ({ who: "dana", ask: "How many customers have a city on file?", sql: "SELECT COUNT(city) FROM customers;" })],
      [2, () => ({ who: "theo", ask: "Every customer's name and city, with 'unknown' where the city is missing.", sql: "SELECT name, COALESCE(city, 'unknown') FROM customers;" })],
      [3, () => ({ who: "theo", ask: "Everyone not in Boston, including people with no city on file. Name and city.", sql: "SELECT name, city FROM customers WHERE city != 'Boston' OR city IS NULL;",
        base: "SELECT name, city FROM customers WHERE city != 'Boston';", hint: "!= skips the NULLs, so ask for them by name: OR city IS NULL.",
        marks: [["not in Boston", "where"], ["including people with no city", "nulls"]] })],
      [3, () => ({ who: "hank", ask: "Paid orders with no discount code over $80. id and amount, biggest first.", sql: "SELECT id, amount FROM orders WHERE status = 'paid' AND code IS NULL AND amount > 80 ORDER BY amount DESC;", ordered: 1,
        base: "SELECT id, amount FROM orders WHERE status = 'paid' AND amount > 80 ORDER BY amount DESC;", hint: "IS NULL is one more test in the WHERE, joined with AND.",
        marks: [["no discount code", "nulls"], ["Paid", "andor"], ["over $80", "andor"], ["biggest first", "order"]] })],
      [3, (r) => { const f = pick(r, ["welcome", "campaign"]); return { who: "rosa", ask: `Clicks per email in the ${f} flow: email number and how many clicks.`, sql: `SELECT email, COUNT(clicked_day) FROM sends WHERE flow = '${f}' GROUP BY email;`,
        base: `SELECT COUNT(clicked_day) FROM sends WHERE flow = '${f}';`, hint: "The same count, once per pile: GROUP BY email, with email in SELECT too.",
        marks: [["Clicks", "nulls"], ["per email", "group"]] }; }],
      [4, () => ({ who: "dana", ask: "Customers with no city on file. id and name.", sql: "SELECT id, name FROM customers WHERE city IS NULL;",
        bad: "SELECT id, name FROM customers WHERE city = NULL;", trap: "<code>= NULL</code> is never true, not even for NULL. Use <code>IS NULL</code>." })],
      [4, () => ({ who: "theo", ask: "Everyone except our Boston customers. Name and city.", sql: "SELECT name, city FROM customers WHERE city != 'Boston' OR city IS NULL;",
        bad: "SELECT name, city FROM customers WHERE city != 'Boston';", trap: "A NULL city isn't unequal to Boston either, so <code>!=</code> quietly drops it. Add <code>OR city IS NULL</code>." })],
      [4, () => ({ who: "rosa", ask: "How many campaign emails were clicked?", sql: "SELECT COUNT(clicked_day) FROM sends WHERE flow = 'campaign';",
        bad: "SELECT COUNT(*) FROM sends WHERE flow = 'campaign';", trap: "COUNT(*) counts every email sent. COUNT(clicked_day) counts the ones with a click." })],
    ] },
  { id: "never", n: 15, group: "Unit C · Tables", name: "Never: LEFT JOIN … IS NULL", word: "LEFT JOIN … WHERE … IS NULL",
    lesson: { frank: "The ones who never showed. Nobody remembers them. I do. LEFT JOIN them all, then keep the ones with nothing on the other side.",
      lines: ["\"Never\" is a LEFT JOIN plus <code>WHERE right.id IS NULL</code>: the rows that found no match.",
        "A test on the right table goes in <code>ON</code>, not WHERE: <code>LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'paid'</code> means \"no paid order\".",
        "In WHERE, that test throws away the empty rows LEFT JOIN kept, and \"never\" finds nobody."],
      example: "SELECT c.name FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL;" },
    tpl: [
      [1, () => ({ who: "dana", ask: "Customers who never ordered. Name and city.", sql: "SELECT c.name, c.city FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL;" })],
      [1, () => ({ who: "hank", ask: "Products that never sold. Name and price.", sql: "SELECT p.name, p.price FROM products p LEFT JOIN order_items i ON i.product_id = p.id WHERE i.order_id IS NULL;" })],
      [1, () => ({ who: "rosa", ask: "Customers who were never sent an email. Name and city.", sql: "SELECT c.name, c.city FROM customers c LEFT JOIN sends s ON s.customer_id = c.id WHERE s.id IS NULL;" })],
      [2, () => ({ who: "hank", ask: "Customers with no paid order. Refunds don't count. Name.", sql: "SELECT c.name FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'paid' WHERE o.id IS NULL;" })],
      [2, () => ({ who: "rosa", ask: "Customers on the email list (holdout 0) who never clicked an email. Name.", sql: "SELECT c.name FROM customers c LEFT JOIN sends s ON s.customer_id = c.id AND s.clicked_day IS NOT NULL WHERE s.id IS NULL AND c.holdout = 0;" })],
      [2, (r) => { const d = pick(r, CAMPAIGNS); return { who: "theo", ask: `Customers who didn't get the ${nice(d)} campaign. Name and joined.`, sql: `SELECT c.name, c.joined FROM customers c LEFT JOIN sends s ON s.customer_id = c.id AND s.flow = 'campaign' AND s.day = '${d}' WHERE s.id IS NULL;` }; }],
      [3, (r) => { const c = pick(r, NEVER_CITIES); return { who: "dana", ask: `${c} customers who never ordered, A to Z. Name.`, sql: `SELECT c.name FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL AND c.city = '${c}' ORDER BY c.name;`, ordered: 0,
        base: `SELECT c.name FROM customers c WHERE c.city = '${c}' ORDER BY c.name;`, hint: "LEFT JOIN orders, then the WHERE holds both tests: no order AND the city.",
        marks: [[`${c} customers`, "andor"], ["never ordered", "never"], ["A to Z", "order"]] }; }],
      [3, () => ({ who: "theo", ask: "People who joined in October and haven't placed a paid order yet. Name and joined.", sql: "SELECT c.name, c.joined FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'paid' WHERE o.id IS NULL AND c.joined BETWEEN '2026-10-01' AND '2026-10-31';",
        base: "SELECT c.name, c.joined FROM customers c WHERE c.joined BETWEEN '2026-10-01' AND '2026-10-31';", hint: "\"Paid\" is about the orders, so it goes in ON. \"October\" is about the customer, so it goes in WHERE.",
        marks: [["joined in October", "inlike"], ["haven't placed a paid order", "never"]] })],
      [4, () => ({ who: "hank", ask: "Who hasn't bought anything from us yet? Name.", sql: "SELECT c.name FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'paid' WHERE o.id IS NULL;",
        bad: "SELECT c.name FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.status = 'paid' AND o.id IS NULL;", trap: "In WHERE, <code>o.status = 'paid'</code> throws out the empty rows the LEFT JOIN kept, so nobody is left. Tests on the right table go in ON." })],
      [4, () => ({ who: "dana", ask: "Customers who haven't paid us for anything yet. Name.", sql: "SELECT c.name FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'paid' WHERE o.id IS NULL;",
        bad: "SELECT c.name FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL;", trap: "That finds people with no orders at all. Someone whose only order was refunded has no paid order either. Put <code>AND o.status = 'paid'</code> in ON." })],
      [4, () => ({ who: "rosa", ask: "Customers we haven't emailed yet. Name and city.", sql: "SELECT c.name, c.city FROM customers c LEFT JOIN sends s ON s.customer_id = c.id WHERE s.id IS NULL;",
        bad: "SELECT c.name, c.city FROM customers c JOIN sends s ON s.customer_id = c.id WHERE s.id IS NULL;", trap: "A plain JOIN has already dropped everyone with no email, so IS NULL finds nobody. \"Never\" needs LEFT JOIN." })],
    ] },
  { id: "joingroup", n: 16, group: "Unit C · Tables", name: "Join then group", word: "JOIN … GROUP BY",
    lesson: { frank: "Join, then pile. Now the piles have names on them. Just don't pile by name. Two people can share one.",
      lines: ["Join first, then GROUP BY: paid revenue per city, orders per plan, units per product.",
        "Pile people by their key and show the name beside it: <code>GROUP BY c.id, c.name</code>. Two customers here share a name.",
        "With LEFT JOIN, <code>COUNT(o.id)</code> gives 0 for people with no orders. <code>COUNT(*)</code> would count their empty row as 1."],
      example: "SELECT c.city, SUM(o.amount) FROM customers c JOIN orders o ON o.customer_id = c.id WHERE o.status = 'paid' GROUP BY c.city;" },
    tpl: [
      [2, () => ({ who: "dana", kind: "predict", show: "SELECT c.name, COUNT(o.id) FROM customers c LEFT JOIN orders o ON o.customer_id = c.id GROUP BY c.id, c.name;", ask: `Dana's query. The shop has ${SHOP.customers.length} customers and ${SHOP.orders.length} orders. Before it runs: how many rows come back?`, sql: "SELECT COUNT(*) FROM (SELECT c.name, COUNT(o.id) FROM customers c LEFT JOIN orders o ON o.customer_id = c.id GROUP BY c.id, c.name);" })],
      [1, () => ({ who: "hank", ask: "Paid revenue per plan. Plan and the total.", sql: "SELECT c.plan, SUM(o.amount) FROM customers c JOIN orders o ON o.customer_id = c.id WHERE o.status = 'paid' GROUP BY c.plan;" })],
      [1, () => ({ who: "dana", ask: "How many orders came from each channel? Channel and the count.", sql: "SELECT c.channel, COUNT(*) FROM customers c JOIN orders o ON o.customer_id = c.id GROUP BY c.channel;" })],
      [1, () => ({ who: "theo", ask: "Units sold per product. Product name and the total qty.", sql: "SELECT p.name, SUM(i.qty) FROM order_items i JOIN products p ON i.product_id = p.id GROUP BY p.name;" })],
      [2, (r) => { const c = pick(r, CITIES); return { who: "priya", ask: `Every ${c} customer's number of orders, including zeros. id, name and the count.`, sql: `SELECT c.id, c.name, COUNT(o.id) FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE c.city = '${c}' GROUP BY c.id, c.name;` }; }],
      [2, () => ({ who: "rosa", ask: "Emails sent per city, leaving out customers with no city. City and the count.", sql: "SELECT c.city, COUNT(*) FROM sends s JOIN customers c ON s.customer_id = c.id WHERE c.city IS NOT NULL GROUP BY c.city;" })],
      [2, () => ({ who: "hank", ask: "Line revenue per product: qty × price, added up. Product name and revenue.", sql: "SELECT p.name, SUM(i.qty * i.price) FROM order_items i JOIN products p ON i.product_id = p.id GROUP BY p.name;" })],
      [3, (r) => { const x = pick(r, [2000, 2100]); return { who: "hank", ask: `Cities with more than $${x} of paid revenue, biggest first. City and revenue.`, sql: `SELECT c.city, SUM(o.amount) AS revenue FROM customers c JOIN orders o ON o.customer_id = c.id WHERE o.status = 'paid' GROUP BY c.city HAVING SUM(o.amount) > ${x} ORDER BY revenue DESC;`, ordered: 1,
        base: `SELECT c.city, SUM(o.amount) AS revenue FROM customers c JOIN orders o ON o.customer_id = c.id WHERE o.status = 'paid' GROUP BY c.city;`, hint: "Join, filter rows, pile, filter piles, sort: the same order as always, with a JOIN after FROM.",
        marks: [["Cities", "group"], [`more than $${x}`, "having"], ["paid", "where"], ["biggest first", "order"]] }; }],
      [3, () => ({ who: "dana", ask: "Our top 3 customers by paid revenue, with names. id, name and revenue, most first.", sql: "SELECT c.id, c.name, SUM(o.amount) AS revenue FROM customers c JOIN orders o ON o.customer_id = c.id WHERE o.status = 'paid' GROUP BY c.id, c.name ORDER BY revenue DESC LIMIT 3;", ordered: 2,
        base: "SELECT o.customer_id, SUM(o.amount) AS revenue FROM orders o WHERE o.status = 'paid' GROUP BY o.customer_id ORDER BY revenue DESC LIMIT 3;", hint: "Join customers to get the names. Pile by c.id and c.name together.",
        marks: [["top 3", "order"], ["by paid revenue", "agg"], ["with names", "join"]] })],
      [3, (r) => { const n = pick(r, [60, 75]); return { who: "theo", ask: `Products that were in more than ${n} different orders. Product name and the number of orders.`, sql: `SELECT p.name, COUNT(DISTINCT i.order_id) FROM order_items i JOIN products p ON i.product_id = p.id GROUP BY p.name HAVING COUNT(DISTINCT i.order_id) > ${n};`,
        base: `SELECT p.name, COUNT(DISTINCT i.order_id) FROM order_items i JOIN products p ON i.product_id = p.id GROUP BY p.name;`, hint: "HAVING works on the joined piles the same way.",
        marks: [["Products", "group"], [`more than ${n} different orders`, "having"]] }; }],
      [4, () => ({ who: "hank", ask: "Paid revenue per customer, with their names. Name and revenue.", sql: "SELECT c.name, SUM(o.amount) FROM customers c JOIN orders o ON o.customer_id = c.id WHERE o.status = 'paid' GROUP BY c.id, c.name;",
        bad: "SELECT c.name, SUM(o.amount) FROM customers c JOIN orders o ON o.customer_id = c.id WHERE o.status = 'paid' GROUP BY c.name;", trap: `Two different customers are called ${SHOP.customers.find((c, i, a) => a.findIndex((d) => d[1] === c[1]) !== i)[1]}. GROUP BY name puts them in one pile. Group by <code>c.id, c.name</code>.` })],
      [4, (r) => { const c = pick(r, CITIES); return { who: "priya", ask: `Every ${c} customer and how many orders they've placed. id, name and the count.`, sql: `SELECT c.id, c.name, COUNT(o.id) FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE c.city = '${c}' GROUP BY c.id, c.name;`,
        bad: `SELECT c.id, c.name, COUNT(*) FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE c.city = '${c}' GROUP BY c.id, c.name;`, trap: "A customer with no orders still has one row after LEFT JOIN, so COUNT(*) says 1. COUNT(o.id) skips the empty one and says 0." }; }],
      [4, (r) => { const c = pick(r, NEVER_CITIES); return { who: "hank", ask: `Every ${c} customer's paid spend, $0 for people who never paid. id, name and spend.`, sql: `SELECT c.id, c.name, COALESCE(SUM(o.amount), 0) FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'paid' WHERE c.city = '${c}' GROUP BY c.id, c.name;`,
        bad: `SELECT c.id, c.name, SUM(o.amount) FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'paid' WHERE c.city = '${c}' GROUP BY c.id, c.name;`, trap: "SUM skips NULLs, and a SUM of nothing but NULLs is NULL, not 0. <code>COALESCE(SUM(o.amount), 0)</code>." }; }],
    ] },
  { id: "fanout", n: 17, group: "Unit C · Tables", name: "Fan-out", word: "before you SUM: did the join copy it?",
    lesson: { frank: "Fan-out. One order, three products, three rows. Your total swells like a bad alibi. I've buried analysts over less.",
      lines: ["A join copies a row once per match. Join orders to order_items and an order with 3 products shows up 3 times, <code>o.amount</code> and all.",
        "So <code>SUM(o.amount)</code> after that join counts the order 3 times. Total the many side instead (<code>SUM(i.qty * i.price)</code>), or don't join what you don't need.",
        "Chains are fine: <code>orders o JOIN order_items i ON … JOIN products p ON …</code>. Before you SUM, count the rows before and after the join."],
      example: "SELECT p.name, SUM(i.qty * i.price) AS revenue FROM orders o JOIN order_items i ON i.order_id = o.id JOIN products p ON i.product_id = p.id WHERE o.status = 'paid' GROUP BY p.name;" },
    tpl: [
      [1, () => ({ who: "priya", kind: "predict", show: "SELECT o.id, o.amount, i.product_id FROM orders o JOIN order_items i ON i.order_id = o.id;", ask: "Before it runs: how many rows? orders has one row per order, order_items one row per product in an order.", sql: "SELECT COUNT(*) FROM orders o JOIN order_items i ON i.order_id = o.id;" })],
      [1, () => ({ who: "hank", ask: "Paid line revenue per product: qty × price from paid orders only. Product name and revenue.", sql: "SELECT p.name, SUM(i.qty * i.price) FROM orders o JOIN order_items i ON i.order_id = o.id JOIN products p ON i.product_id = p.id WHERE o.status = 'paid' GROUP BY p.name;" })],
      [1, (r) => { const m = pick(r, BIGMONTH); return { who: "theo", ask: `Units sold per product in ${m[0]}. Product name and units.`, sql: `SELECT p.name, SUM(i.qty) FROM orders o JOIN order_items i ON i.order_id = o.id JOIN products p ON i.product_id = p.id WHERE o.status = 'paid' AND o.day BETWEEN '${m[1]}' AND '${m[2]}' GROUP BY p.name;` }; }],
      [2, (r) => { const c = pick(r, CITIES); return { who: "dana", ask: `Units of each product bought by ${c} customers. Product name and units.`, sql: `SELECT p.name, SUM(i.qty) FROM customers c JOIN orders o ON o.customer_id = c.id JOIN order_items i ON i.order_id = o.id JOIN products p ON i.product_id = p.id WHERE c.city = '${c}' AND o.status = 'paid' GROUP BY p.name;` }; }],
      [2, (r) => { const p = pick(r, PNAMES); return { who: "priya", ask: `How many different customers bought ${p}?`, sql: `SELECT COUNT(DISTINCT o.customer_id) FROM orders o JOIN order_items i ON i.order_id = o.id JOIN products p ON i.product_id = p.id WHERE p.name = '${p}' AND o.status = 'paid';` }; }],
      [2, () => ({ who: "hank", ask: "How many paid orders had more than one product in them?", sql: "SELECT COUNT(*) FROM (SELECT o.id FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'paid' GROUP BY o.id HAVING COUNT(*) > 1);", kind: "predict",
        show: "SELECT o.id, COUNT(*) FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'paid' GROUP BY o.id HAVING COUNT(*) > 1;" })],
      [3, () => ({ who: "hank", ask: "Gross margin per product from paid orders: qty × (price − unit_cost), biggest first. Name and margin.", sql: "SELECT p.name, SUM(i.qty * (i.price - p.unit_cost)) AS margin FROM orders o JOIN order_items i ON i.order_id = o.id JOIN products p ON i.product_id = p.id WHERE o.status = 'paid' GROUP BY p.name ORDER BY margin DESC;", ordered: 1,
        base: "SELECT p.name, SUM(i.qty * i.price) AS revenue FROM orders o JOIN order_items i ON i.order_id = o.id JOIN products p ON i.product_id = p.id WHERE o.status = 'paid' GROUP BY p.name;", hint: "The cost lives on products, the price paid on order_items. Both are joined already, so the sum can use both.",
        marks: [["Gross margin", "agg"], ["per product", "group"], ["paid orders", "where"], ["biggest first", "order"]] })],
      [3, (r) => { const c = pick(r, CITIES); return { who: "dana", ask: `${c}'s top product by units, among paid orders. Product name and units.`, sql: `SELECT p.name, SUM(i.qty) AS units FROM customers c JOIN orders o ON o.customer_id = c.id JOIN order_items i ON i.order_id = o.id JOIN products p ON i.product_id = p.id WHERE c.city = '${c}' AND o.status = 'paid' GROUP BY p.name ORDER BY units DESC LIMIT 1;`, ordered: 1,
        base: `SELECT p.name, SUM(i.qty) AS units FROM orders o JOIN order_items i ON i.order_id = o.id JOIN products p ON i.product_id = p.id WHERE o.status = 'paid' GROUP BY p.name ORDER BY units DESC LIMIT 1;`, hint: "The city is on customers, so the chain grows one more link at the front: customers, orders, order_items, products.",
        marks: [[`${c}'s`, "join"], ["top product by units", "order"], ["paid orders", "andor"]] }; }],
      [4, () => ({ who: "hank", ask: "Paid revenue per city. City and revenue.", sql: "SELECT c.city, SUM(o.amount) FROM customers c JOIN orders o ON o.customer_id = c.id WHERE o.status = 'paid' GROUP BY c.city;",
        bad: "SELECT c.city, SUM(o.amount) FROM customers c JOIN orders o ON o.customer_id = c.id JOIN order_items i ON i.order_id = o.id WHERE o.status = 'paid' GROUP BY c.city;", trap: "The extra join to order_items copies each order once per product, and SUM(o.amount) counts every copy. Don't join what the ask doesn't need." })],
      [4, () => ({ who: "dana", ask: "Paid AOV, to the cent.", sql: "SELECT AVG(o.amount) FROM orders o WHERE o.status = 'paid';",
        bad: "SELECT AVG(o.amount) FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'paid';", trap: "After the join, a 3-product order counts 3 times in the average, so big baskets pull AOV up. AOV is one row per order." })],
      [4, () => ({ who: "priya", ask: "Total paid revenue from orders that had a Travel Mug in them: the whole orders, not just the mugs.", sql: "SELECT SUM(o.amount) FROM orders o JOIN order_items i ON i.order_id = o.id JOIN products p ON i.product_id = p.id WHERE o.status = 'paid' AND p.name = 'Travel Mug';",
        bad: "SELECT SUM(i.qty * i.price) FROM orders o JOIN order_items i ON i.order_id = o.id JOIN products p ON i.product_id = p.id WHERE o.status = 'paid' AND p.name = 'Travel Mug';", trap: "That adds up the mug lines only. The ask wants the whole orders, <code>o.amount</code>. An order has one mug line, so after the mug filter nothing is copied and SUM(o.amount) is safe." })],
    ] },
  { id: "checks", n: 18, group: "Unit C · Tables", name: "Check your numbers", word: "COUNT(*) vs COUNT(DISTINCT …) · HAVING COUNT(*) > 1",
    lesson: { frank: "Every number lies a little. Before one leaves this desk, you check it against another one. Every time.",
      lines: ["A new table, <code>payments</code>: what the card processor says it charged, one row per payment. It should match the paid orders one for one. It doesn't quite.",
        "<b>Count it two ways.</b> On a table with one row per order, <code>COUNT(*)</code> and <code>COUNT(DISTINCT order_id)</code> agree. If they don't, something is in there twice.",
        "<b>Find the doubles:</b> <code>GROUP BY order_id HAVING COUNT(*) &gt; 1</code>. Whatever comes back is a duplicate.",
        "<b>Tie it to a total you trust.</b> <code>LEFT JOIN … IS NULL</code> finds the paid orders with no payment, and a payment total that's off by one order's amount points at it."],
      example: "SELECT order_id, COUNT(*) FROM payments GROUP BY order_id HAVING COUNT(*) > 1;" },
    tpl: [
      [1, () => ({ who: "hank", ask: "How many payments are there, and how many different orders do they cover? Both numbers.", sql: "SELECT COUNT(*), COUNT(DISTINCT order_id) FROM payments;" })],
      [1, () => ({ who: "hank", ask: "Orders that were paid more than once. order_id and the number of payments.", sql: "SELECT order_id, COUNT(*) FROM payments GROUP BY order_id HAVING COUNT(*) > 1;" })],
      [1, () => ({ who: "dana", ask: "Paid orders with no payment on file. Order id and amount.", sql: "SELECT o.id, o.amount FROM orders o LEFT JOIN payments p ON p.order_id = o.id WHERE o.status = 'paid' AND p.id IS NULL;" })],
      [2, () => ({ who: "hank", ask: "The order that was charged twice: order id, its amount, and the customer's name.", sql: "SELECT p.order_id, o.amount, c.name FROM payments p JOIN orders o ON o.id = p.order_id JOIN customers c ON c.id = o.customer_id GROUP BY p.order_id, o.amount, c.name HAVING COUNT(*) > 1;" })],
      [2, () => ({ who: "priya", ask: "Every paid order with how many payments it has, 0 if none. Order id and the count.", sql: "SELECT o.id, COUNT(p.id) FROM orders o LEFT JOIN payments p ON p.order_id = o.id WHERE o.status = 'paid' GROUP BY o.id;" })],
      [2, () => { const n = new Set(SHOP.payments.map((x) => x[1])).size; return { who: "dana", kind: "predict", show: "SELECT * FROM payments;", ask: `${n} different orders have a payment, and the processor fired one of them twice. Before it runs: how many rows?`, sql: "SELECT COUNT(*) FROM payments;" }; }],
      [3, () => ({ who: "hank", ask: "Orders with 2 or more payments, and what was charged in all. order_id, payments and the total charged.", sql: "SELECT order_id, COUNT(*), SUM(amount) FROM payments GROUP BY order_id HAVING COUNT(*) >= 2;",
        base: "SELECT order_id, COUNT(*), SUM(amount) FROM payments GROUP BY order_id;", hint: "A duplicate check is a pile per key that should be unique, then HAVING keeps the piles with more than one row.",
        marks: [["2 or more payments", "having"], ["in all", "agg"]] })],
      [3, () => ({ who: "theo", ask: "Customers who were charged twice for one order, with their city. Name, city and the order id.", sql: "SELECT c.name, c.city, p.order_id FROM payments p JOIN orders o ON o.id = p.order_id JOIN customers c ON c.id = o.customer_id GROUP BY c.name, c.city, p.order_id HAVING COUNT(*) > 1;",
        base: "SELECT order_id FROM payments GROUP BY order_id HAVING COUNT(*) > 1;", hint: "The double is found the same way. Join out to orders and customers for the name and city, and group by what you show.",
        marks: [["charged twice", "having"], ["with their city", "join"]] })],
      [4, () => ({ who: "hank", ask: "How many orders have been paid for, according to the card processor?", sql: "SELECT COUNT(DISTINCT order_id) FROM payments;",
        bad: "SELECT COUNT(*) FROM payments;", trap: "One order was charged twice, so payments has a row too many. Orders is <code>COUNT(DISTINCT order_id)</code>." })],
      [4, () => ({ who: "dana", ask: "Paid revenue for the shop, from the orders.", sql: "SELECT SUM(amount) FROM orders WHERE status = 'paid';",
        bad: "SELECT SUM(amount) FROM payments;", trap: "payments has one order twice and is missing another, so its total is off. The orders are the record. payments is what you check them against." })],
    ] },
];

// ---------- Metrics 2 and 3, and Case C: the grown shop's numbers ----------
// facts the reading reps hand him, from the board shop
const PAIDS = SHOP.orders.filter((o) => o[4] === "paid"), BUYERS = new Set(PAIDS.map((o) => o[1])).size;
const NOORDER = SHOP.customers.filter((c) => !SHOP.orders.some((o) => o[1] === c[0])).length;
const plusDays = (iso, n) => new Date(Date.parse(iso + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
// revenue per recipient in JS, the same rule as the SQL (paid orders within 5 days of a click, ÷ delivered emails),
// so a chain's last step can name its numbers
function rprOf(keep, days = 5) {
  const sent = SHOP.sends.filter((s) => s[5] === 1 && keep(s)); let rev = 0;
  for (const s of sent) if (s[7]) for (const o of SHOP.orders) if (o[1] === s[1] && o[4] === "paid" && o[3] >= s[7] && o[3] <= plusDays(s[7], days)) rev += o[2];
  return { rev, n: sent.length, rpr: sent.length ? rev / sent.length : 0 };
}
function perGroup() {
  const g = [0, 1].map((h) => { const ids = new Set(SHOP.customers.filter((c) => c[7] === h).map((c) => c[0])); const rev = SHOP.orders.filter((o) => ids.has(o[1]) && o[4] === "paid").reduce((a, o) => a + o[2], 0); return { n: ids.size, rpc: rev / ids.size }; });
  return { emailed: g[0], held: g[1] };
}
const WIN = (d) => `o.customer_id = s.customer_id AND o.status = 'paid' AND o.day BETWEEN s.clicked_day AND date(s.clicked_day, '+${d} days')`, WINDOW = WIN(5);
const RPR = (where, by = "s.flow") => `SELECT ${by}, COALESCE(SUM(o.amount), 0) * 1.0 / COUNT(DISTINCT s.id) AS rpr FROM sends s LEFT JOIN orders o ON ${WINDOW} WHERE s.delivered = 1${where ? ` AND ${where}` : ""} GROUP BY ${by};`;
const RPC = "SELECT c.holdout, COUNT(DISTINCT c.id) AS people, COALESCE(SUM(o.amount), 0) * 1.0 / COUNT(DISTINCT c.id) AS per_customer FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'paid' GROUP BY c.holdout;";
const M2 = "Metric 2 · Email flows", M3 = "Metric 3 · Holdout lift";
// the three A/B tests' people and rates per variant, read from the rows (the noise check's chain carries them)
const AB = {}; for (const [, t, v, k] of SHOP.ab_test) { const x = ((AB[t] = AB[t] || {})[v] = AB[t][v] || { n: 0, k: 0 }); x.n++; x.k += k; }
for (const t of Object.values(AB)) for (const x of Object.values(t)) x.p = x.k / x.n;
const r4 = (x) => Math.round(x * 1e4) / 1e4;
const METRIC23 = [
  { id: "m2rates", kind: "metric", metric: 2, step: 1, owner: "rosa", group: M2, name: "Click and unsubscribe rates", word: "÷ delivered, not sent",
    lesson: { owner: "Every Monday I check each flow's click rate and unsubscribe rate. If an email bounced, nobody saw it, so it doesn't count against the email.",
      frank: "Rates. Everybody's got one. Most of them are divided by the wrong thing.",
      lines: ["<code>delivered</code> is 1 or 0, so <code>SUM(delivered)</code> counts the emails that arrived. Rates divide by that, not by <code>COUNT(*)</code> (sent).",
        "Click rate = <code>COUNT(clicked_day) * 1.0 / SUM(delivered)</code>. COUNT(column) skips the empty clicks, as in NULL.",
        "Unsubscribe rate = <code>SUM(unsubscribed) * 1.0 / SUM(delivered)</code>. Per flow: <code>GROUP BY flow</code>."],
      build: [["Sent and delivered, per flow", "SELECT flow, COUNT(*) AS sent, SUM(delivered) AS delivered FROM sends GROUP BY flow;"],
        ["Clicks per flow", "SELECT flow, SUM(delivered) AS delivered, COUNT(clicked_day) AS clicks FROM sends GROUP BY flow;"],
        ["Click rate", "SELECT flow, COUNT(clicked_day) * 1.0 / SUM(delivered) AS click_rate FROM sends GROUP BY flow;"]],
      example: "SELECT flow, COUNT(clicked_day) * 1.0 / SUM(delivered) AS click_rate FROM sends GROUP BY flow;" },
    tpl: [
      [1, () => ({ who: "rosa", ask: "Click rate per flow. Flow and click rate.", fill: "SELECT flow, COUNT(clicked_day) * 1.0 / ____ FROM sends GROUP BY flow;", sql: "SELECT flow, COUNT(clicked_day) * 1.0 / SUM(delivered) FROM sends GROUP BY flow;" })],
      [1, () => ({ who: "rosa", ask: "Unsubscribe rate per flow. Flow and unsubscribe rate.", fill: "SELECT flow, ____ * 1.0 / SUM(delivered) FROM sends GROUP BY flow;", sql: "SELECT flow, SUM(unsubscribed) * 1.0 / SUM(delivered) FROM sends GROUP BY flow;" })],
      [2, () => ({ who: "theo", ask: "Click rate of each welcome email, 1 to 3. Email number and click rate.", sql: "SELECT email, COUNT(clicked_day) * 1.0 / SUM(delivered) FROM sends WHERE flow = 'welcome' GROUP BY email;" })],
      [2, (r) => { const d = pick(r, CAMPAIGNS); return { who: "rosa", ask: `Click rate of the ${nice(d)} campaign.`, sql: `SELECT COUNT(clicked_day) * 1.0 / SUM(delivered) FROM sends WHERE flow = 'campaign' AND day = '${d}';` }; }],
      [2, () => ({ who: "rosa", ask: "Unsubscribe rate per flow, highest first. Flow and rate.", sql: "SELECT flow, SUM(unsubscribed) * 1.0 / SUM(delivered) AS unsub_rate FROM sends GROUP BY flow ORDER BY unsub_rate DESC;", ordered: 1 })],
      [4, () => ({ who: "rosa", ask: "Click rate per flow. Flow and click rate.", sql: "SELECT flow, COUNT(clicked_day) * 1.0 / SUM(delivered) FROM sends GROUP BY flow;",
        bad: "SELECT flow, COUNT(clicked_day) * 1.0 / COUNT(*) FROM sends GROUP BY flow;", trap: "COUNT(*) counts every email sent, bounces too. A bounced email had no chance to be clicked. Divide by SUM(delivered)." })],
      [4, () => ({ who: "theo", ask: "Click rate of each welcome email, 1 to 3. Email number and click rate.", sql: "SELECT email, COUNT(clicked_day) * 1.0 / SUM(delivered) FROM sends WHERE flow = 'welcome' GROUP BY email;",
        bad: "SELECT email, COUNT(clicked_day) / SUM(delivered) FROM sends WHERE flow = 'welcome' GROUP BY email;", trap: "Whole number ÷ bigger whole number is 0 in SQLite. <code>* 1.0</code> first." })],
    ] },
  { id: "m2mpp", kind: "metric", metric: 2, step: 2, owner: "rosa", group: M2, name: "Opens that aren't people", word: "WHERE apple_mpp = 0",
    lesson: { owner: "Our open rates jumped in 2021 and nobody got better at subject lines. Apple Mail started opening every email by itself. Those opens aren't people.",
      frank: "A witness who says he saw everything. Every time. That's not a witness. That's a machine.",
      lines: ["Apple Mail Privacy Protection loads every email for the reader, so an <code>apple_mpp</code> email always counts as opened. A new column on the sends card.",
        "Open rate with them looks great. The real open rate leaves them out of the top and the bottom: <code>WHERE apple_mpp = 0</code>.",
        "Clicks need a person, so clicks per delivered email stays honest. Clicks ÷ opens doesn't: its bottom is full of machines."],
      build: [["Open rate, machines included", "SELECT flow, SUM(opened) * 1.0 / SUM(delivered) AS open_rate FROM sends GROUP BY flow;"],
        ["How many opens are Apple's", "SELECT flow, SUM(opened) AS opens, SUM(apple_mpp) AS apple FROM sends GROUP BY flow;"],
        ["Real open rate", "SELECT flow, SUM(opened) * 1.0 / SUM(delivered) AS real_open_rate FROM sends WHERE apple_mpp = 0 GROUP BY flow;"]],
      example: "SELECT flow, SUM(opened) * 1.0 / SUM(delivered) AS real_open_rate FROM sends WHERE apple_mpp = 0 GROUP BY flow;" },
    tpl: [
      [1, () => ({ who: "rosa", ask: "Real open rate per flow, without Apple's opens. Flow and rate.", fill: "SELECT flow, SUM(opened) * 1.0 / SUM(delivered) FROM sends WHERE ____ GROUP BY flow;", sql: "SELECT flow, SUM(opened) * 1.0 / SUM(delivered) FROM sends WHERE apple_mpp = 0 GROUP BY flow;" })],
      [1, () => ({ who: "rosa", ask: "Share of delivered emails that Apple opened, per flow. Flow and share.", fill: "SELECT flow, ____ * 1.0 / SUM(delivered) FROM sends GROUP BY flow;", sql: "SELECT flow, SUM(apple_mpp) * 1.0 / SUM(delivered) FROM sends GROUP BY flow;" })],
      [2, () => ({ who: "theo", ask: "Real open rate of each welcome email, 1 to 3. Email and rate.", sql: "SELECT email, SUM(opened) * 1.0 / SUM(delivered) FROM sends WHERE flow = 'welcome' AND apple_mpp = 0 GROUP BY email;" })],
      [2, () => ({ who: "rosa", ask: "The open rate per flow as the dashboard shows it, every open counted. Flow and rate.", sql: "SELECT flow, SUM(opened) * 1.0 / SUM(delivered) FROM sends GROUP BY flow;" })],
      [2, (r) => { const d = pick(r, CAMPAIGNS); return { who: "theo", ask: `The ${nice(d)} campaign's real open rate, without Apple's opens.`, sql: `SELECT SUM(opened) * 1.0 / SUM(delivered) FROM sends WHERE flow = 'campaign' AND day = '${d}' AND apple_mpp = 0;` }; }],
      [4, () => ({ who: "rosa", ask: "Real open rate per flow, without Apple's opens. Flow and rate.", sql: "SELECT flow, SUM(opened) * 1.0 / SUM(delivered) FROM sends WHERE apple_mpp = 0 GROUP BY flow;",
        bad: "SELECT flow, SUM(opened) * 1.0 / SUM(delivered) FROM sends GROUP BY flow;", trap: "Every apple_mpp email counts as opened, so this is the inflated rate. Leave them out: <code>WHERE apple_mpp = 0</code>." })],
      [4, () => ({ who: "theo", ask: "Real open rate per flow, without Apple's opens. Flow and rate.", sql: "SELECT flow, SUM(opened) * 1.0 / SUM(delivered) FROM sends WHERE apple_mpp = 0 GROUP BY flow;",
        bad: "SELECT flow, (SUM(opened) - SUM(apple_mpp)) * 1.0 / SUM(delivered) FROM sends GROUP BY flow;", trap: "The top lost Apple's opens, but the bottom still has Apple's emails, so the rate comes out too low. Leave them out of both with WHERE." })],
    ] },
  { id: "m2rpr", kind: "metric", metric: 2, step: 3, owner: "rosa", group: M2, name: "Revenue per recipient", word: "orders within 5 days of a click",
    lesson: { owner: "Clicks are nice. Money is nicer. Revenue per recipient tells me what each delivered email is worth, so I can compare a flow to a campaign.",
      frank: "Follow the money from the click to the till. Five days. After that, it's somebody else's case.",
      lines: ["An email gets credit for paid orders placed within 5 days of a click (Klaviyo's default). <code>date(s.clicked_day, '+5 days')</code> moves a date 5 days on. More on dates in Unit D.",
        "<code>LEFT JOIN orders o ON o.customer_id = s.customer_id AND o.status = 'paid' AND o.day BETWEEN s.clicked_day AND date(s.clicked_day, '+5 days')</code>: every test is about the order, so it all goes in ON.",
        "Revenue per recipient = <code>COALESCE(SUM(o.amount), 0) * 1.0 / COUNT(DISTINCT s.id)</code> over delivered emails. DISTINCT, because one email can match two orders."],
      build: [["Delivered emails, each with any order in its window", `SELECT s.id, s.flow, o.amount FROM sends s LEFT JOIN orders o ON ${WINDOW} WHERE s.delivered = 1 AND o.id IS NOT NULL;`],
        ["Revenue per recipient, per flow", RPR("")]],
      example: RPR("") },
    tpl: [
      // revenue per recipient built in three Extends (the critique: five new things arrived at once)
      [1, () => ({ who: "rosa", intro: "rpr1", ask: "Emails that led to a paid order within 5 days of a click. Email id, flow and the order amount.", sql: `SELECT s.id, s.flow, o.amount FROM sends s JOIN orders o ON ${WINDOW};`,
        base: "SELECT s.id, s.flow, s.clicked_day FROM sends s WHERE s.clicked_day IS NOT NULL;", hint: "JOIN orders on the same customer, paid, and o.day BETWEEN s.clicked_day AND date(s.clicked_day, '+5 days'). Every test is about the order, so all of it goes in ON.",
        marks: [["led to a paid order", "join"], ["within 5 days of a click", "dates"]] })],
      [1, () => ({ who: "rosa", intro: "rpr2", ask: "Per flow: delivered emails, and the paid revenue within 5 days of a click, 0 if none. Flow, emails and revenue.", sql: `SELECT s.flow, COUNT(DISTINCT s.id), COALESCE(SUM(o.amount), 0) FROM sends s LEFT JOIN orders o ON ${WINDOW} WHERE s.delivered = 1 GROUP BY s.flow;`,
        base: "SELECT s.flow, COUNT(DISTINCT s.id) FROM sends s WHERE s.delivered = 1 GROUP BY s.flow;", hint: "LEFT JOIN keeps the emails with no order. Keep COUNT(DISTINCT s.id): one email can match two orders.",
        marks: [["the paid revenue within 5 days of a click", "left"], ["0 if none", "nulls"]] })],
      [1, () => ({ who: "rosa", intro: "rpr3", ask: "Revenue per recipient per flow: that revenue ÷ the delivered emails. Flow and the number.", sql: RPR(""),
        base: `SELECT s.flow, COUNT(DISTINCT s.id), COALESCE(SUM(o.amount), 0) FROM sends s LEFT JOIN orders o ON ${WINDOW} WHERE s.delivered = 1 GROUP BY s.flow;`, hint: "Divide the two columns you have: COALESCE(SUM(o.amount), 0) * 1.0 / COUNT(DISTINCT s.id).",
        marks: [["Revenue per recipient", "agg"]] })],
      [1, () => ({ who: "rosa", ask: "Revenue per recipient per flow. Flow and the number.", fill: `SELECT s.flow, COALESCE(SUM(o.amount), 0) * 1.0 / COUNT(DISTINCT s.id) FROM sends s LEFT JOIN orders o ON o.customer_id = s.customer_id AND o.status = 'paid' AND o.day BETWEEN s.clicked_day AND ____ WHERE s.delivered = 1 GROUP BY s.flow;`, sql: RPR("") })],
      [1, () => ({ who: "rosa", ask: "Revenue per recipient per flow. Flow and the number.", fill: `SELECT s.flow, COALESCE(SUM(o.amount), 0) * 1.0 / ____ FROM sends s LEFT JOIN orders o ON ${WINDOW} WHERE s.delivered = 1 GROUP BY s.flow;`, sql: RPR("") })],
      [2, () => ({ who: "theo", ask: "Revenue per recipient for each welcome email, 1 to 3. Email and the number.", sql: RPR("s.flow = 'welcome'", "s.email") })],
      [2, () => ({ who: "hank", ask: "What the platform credits each flow: every paid order within 5 days of a click, credited to each clicked email (one order can be credited twice). Flow and the total.", sql: `SELECT s.flow, SUM(o.amount) FROM sends s JOIN orders o ON ${WINDOW} GROUP BY s.flow;` })],
      [2, (r) => { const d = pick(r, CAMPAIGNS.slice(0, 2)); return { who: "rosa", ask: `Revenue per recipient of the ${nice(d)} campaign.`, sql: `SELECT COALESCE(SUM(o.amount), 0) * 1.0 / COUNT(DISTINCT s.id) FROM sends s LEFT JOIN orders o ON ${WINDOW} WHERE s.delivered = 1 AND s.flow = 'campaign' AND s.day = '${d}';` }; }],
      [4, () => ({ who: "rosa", ask: "Revenue per recipient per flow. Flow and the number.", sql: RPR(""),
        bad: `SELECT s.flow, SUM(o.amount) * 1.0 / COUNT(DISTINCT s.id) FROM sends s JOIN orders o ON ${WINDOW} WHERE s.delivered = 1 GROUP BY s.flow;`, trap: "A plain JOIN keeps only the emails that led to an order, so the bottom shrinks to the winners and every flow looks rich. LEFT JOIN keeps every delivered email." })],
      [4, () => ({ who: "theo", ask: "Revenue per recipient for each welcome email, 1 to 3. Email and the number.", sql: RPR("s.flow = 'welcome'", "s.email"),
        bad: `SELECT s.email, COALESCE(SUM(o.amount), 0) * 1.0 / COUNT(DISTINCT s.id) FROM sends s LEFT JOIN orders o ON o.customer_id = s.customer_id AND o.status = 'paid' WHERE s.delivered = 1 AND s.flow = 'welcome' GROUP BY s.email;`, trap: "Without the 5-day window, every order the person ever placed gets credited to every email they got." })],
    ] },
  { id: "m2money", kind: "metric", metric: 2, step: 4, owner: "rosa", group: M2, name: "Find the money: the campaign gap", word: "a chain: rate × volume", rule: { practice: 0, climb: 1, pass: [2, 2] },
    lesson: { owner: "Campaigns are most of what we send, and they earn the least per email. If they earned what the welcome emails do, what's that worth in a month?",
      frank: "Small leak, big pipe. Multiply them and you'll see what's draining.",
      lines: ["Step 1: revenue per recipient per flow (yesterday's query).", "Step 2: how many campaign emails were delivered in the month.",
        "Step 3: (welcome's number − campaign's number) × that count. Type the numbers from steps 1 and 2."],
      example: RPR("") },
    tpl: [1, 2].map((tier) => [tier, (r) => {
      const m = pick(r, BIGMONTH.slice(1)), bench = pick(r, ["welcome", "winback"]), w = rprOf((s) => s[2] === bench), c = rprOf((s) => s[2] === "campaign"), n = SHOP.sends.filter((s) => s[2] === "campaign" && s[5] === 1 && s[4] >= m[1] && s[4] <= m[2]).length;
      return { who: "rosa", ask: `What would ${m[0]}'s campaigns have earned at the ${bench} flow's rate? Three steps, I need the last number.`, sql: `SELECT (${r2(w.rpr)} - ${r2(c.rpr)}) * ${n};`,
        steps: [
          { ask: "Revenue per recipient for each flow.", sql: RPR(""), hint: "The query from the last step: LEFT JOIN orders in the 5-day window, ÷ COUNT(DISTINCT s.id)." },
          { ask: `How many campaign emails were delivered in ${m[0]}?`, sql: `SELECT SUM(delivered) FROM sends WHERE flow = 'campaign' AND day BETWEEN '${m[1]}' AND '${m[2]}';`, hint: "SUM(delivered) with two tests in WHERE." },
          { ask: `The money: (${bench}'s revenue per recipient − campaign's) × that count. Do the sum in SQL.`, sql: `SELECT (${r2(w.rpr)} - ${r2(c.rpr)}) * ${n};`, tol: 0.01, carry: true, hint: `SELECT ( ${bench} − campaign ) * count;` },
        ] };
    }]) },
  { id: "m3group", kind: "metric", metric: 3, step: 1, owner: "priya", group: M3, name: "Emailed vs held out", word: "LEFT JOIN, zero for non-buyers",
    lesson: { owner: "One in four customers is held out: they get no email at all, picked at random. Whatever they spend, they'd spend anyway. The gap is what the emails really do.",
      frank: "Two groups. Same kind of people. One gets the emails, one gets left alone. Whatever's different is the emails' doing.",
      lines: ["<code>customers.holdout</code> is 1 for the held-out group, 0 for the emailed group. A new column on the customers card.",
        "Revenue per customer in each group: LEFT JOIN paid orders, so a customer who never bought still counts, as zero.",
        "<code>COALESCE(SUM(o.amount), 0) * 1.0 / COUNT(DISTINCT c.id)</code>, <code>GROUP BY c.holdout</code>. An inner JOIN drops the non-buyers and both groups look richer.",
        "Put each group's size next to its number, <code>COUNT(DISTINCT c.id) AS people</code>. A $10 gap between groups of 8 can be luck. Between groups of 100 it means more."],
      build: [["Customers per group", "SELECT holdout, COUNT(*) FROM customers GROUP BY holdout;"], ["Revenue per customer, per group", RPC]],
      example: RPC },
    tpl: [
      [1, () => ({ who: "priya", ask: "Paid revenue per customer, emailed vs held out. Holdout, people and the number.", fill: "SELECT c.holdout, COUNT(DISTINCT c.id) AS people, COALESCE(SUM(o.amount), 0) * 1.0 / COUNT(DISTINCT ____) FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'paid' GROUP BY c.holdout;", sql: RPC })],
      [1, () => ({ who: "priya", ask: "Paid revenue per customer, emailed vs held out. Holdout, people and the number.", fill: "SELECT c.holdout, COUNT(DISTINCT c.id) AS people, COALESCE(SUM(o.amount), 0) * 1.0 / COUNT(DISTINCT c.id) FROM customers c ____ orders o ON o.customer_id = c.id AND o.status = 'paid' GROUP BY c.holdout;", sql: RPC })],
      [2, () => ({ who: "priya", ask: "Share of each group that bought at least once (a paid order). Holdout, people and the share.", sql: "SELECT c.holdout, COUNT(DISTINCT c.id) AS people, COUNT(DISTINCT o.customer_id) * 1.0 / COUNT(DISTINCT c.id) FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'paid' GROUP BY c.holdout;" })],
      [2, () => ({ who: "dana", ask: "Paid revenue per customer, emailed vs held out, subscribers only. Holdout, people and the number.", sql: "SELECT c.holdout, COUNT(DISTINCT c.id) AS people, COALESCE(SUM(o.amount), 0) * 1.0 / COUNT(DISTINCT c.id) FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'paid' WHERE c.plan = 'subscriber' GROUP BY c.holdout;" })],
      [2, () => ({ who: "priya", ask: "Paid orders per customer, emailed vs held out. Holdout, people and the number.", sql: "SELECT c.holdout, COUNT(DISTINCT c.id) AS people, COUNT(o.id) * 1.0 / COUNT(DISTINCT c.id) FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'paid' GROUP BY c.holdout;" })],
      [2, (r) => { const d = pick(r, ["2026-09-01", "2026-10-01", "2026-11-01"]); return { who: "hank", ask: `Paid revenue per customer from orders since ${nice(d)}, emailed vs held out. Everyone counts, 0 if they bought nothing since. Holdout, people and the number.`, sql: `SELECT c.holdout, COUNT(DISTINCT c.id) AS people, COALESCE(SUM(o.amount), 0) * 1.0 / COUNT(DISTINCT c.id) FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'paid' AND o.day >= '${d}' GROUP BY c.holdout;` }; }],
      [4, () => ({ who: "priya", ask: "Paid revenue per customer, emailed vs held out. Holdout, people and the number.", sql: RPC,
        bad: "SELECT c.holdout, COUNT(DISTINCT c.id) AS people, SUM(o.amount) * 1.0 / COUNT(DISTINCT c.id) FROM customers c JOIN orders o ON o.customer_id = c.id AND o.status = 'paid' GROUP BY c.holdout;", trap: "The inner JOIN drops everyone who never bought, so both groups look richer, and the comparison is between buyers only. LEFT JOIN keeps them as zeros." })],
      [4, () => ({ who: "dana", ask: "Paid revenue per customer, emailed vs held out. Holdout, people and the number.", sql: RPC,
        bad: "SELECT c.holdout, COUNT(DISTINCT c.id) AS people, COALESCE(SUM(o.amount), 0) * 1.0 / COUNT(*) FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'paid' GROUP BY c.holdout;", trap: "After the join there's one row per order, so COUNT(*) counts orders. Per customer is COUNT(DISTINCT c.id)." })],
    ] },
  { id: "m3lift", kind: "metric", metric: 3, step: 2, owner: "priya", group: M3, name: "Lift: what the emails earned", word: "(emailed − held out) × emailed customers", rule: { practice: 0, climb: 1, pass: [2, 2] },
    lesson: { owner: "The gap per customer, times everyone we email. That's the revenue the emails added, the number I trust more than any dashboard.",
      frank: "Per head, then times the heads. Simple math. Most people still get it wrong.",
      lines: ["Step 1: revenue per customer in each group.", "Step 2: how many customers are in the emailed group.", "Step 3: (emailed − held out) × that count."],
      example: RPC },
    tpl: [1, 2].map((tier) => [tier, (r) => {
      const sub = pick(r, [false, true]), since = pick(r, [null, "2026-09-01"]);
      const g = [0, 1].map((h) => { const ids = new Set(SHOP.customers.filter((c) => c[7] === h && (!sub || c[3] === "subscriber")).map((c) => c[0])); return { n: ids.size, rpc: SHOP.orders.filter((o) => ids.has(o[1]) && o[4] === "paid" && (!since || o[3] >= since)).reduce((a, o) => a + o[2], 0) / ids.size }; });
      const w = (since ? ` AND o.day >= '${since}'` : "") + (sub ? " WHERE c.plan = 'subscriber'" : ""), who = sub ? "subscribers" : "customers", when = since ? `, orders since ${nice(since)}` : "";
      return { who: "priya", ask: `What did the emails add for ${who}${when}? Three steps.`, sql: `SELECT (${r2(g[0].rpc)} - ${r2(g[1].rpc)}) * ${g[0].n};`,
        steps: [
          { ask: `Paid revenue per customer, emailed vs held out${sub ? ", subscribers only" : ""}${when}. Everyone in the group counts. Show each group's size.`, sql: `SELECT c.holdout, COUNT(DISTINCT c.id) AS people, COALESCE(SUM(o.amount), 0) * 1.0 / COUNT(DISTINCT c.id) FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'paid'${w} GROUP BY c.holdout;`, hint: "LEFT JOIN paid orders, divide by COUNT(DISTINCT c.id), pile by holdout." },
          { ask: `How many ${who} are in the emailed group?`, sql: `SELECT COUNT(*) FROM customers WHERE holdout = 0${sub ? " AND plan = 'subscriber'" : ""};`, hint: "holdout = 0 is the emailed group." },
          { ask: "Lift: (emailed − held out) × the emailed count. Do the sum in SQL.", sql: `SELECT (${r2(g[0].rpc)} - ${r2(g[1].rpc)}) * ${g[0].n};`, tol: 0.01, carry: true, hint: "SELECT ( emailed − held out ) * count;" },
        ] };
    }]) },
  { id: "m3ab", kind: "metric", metric: 3, step: 3, owner: "rosa", group: M3, name: "Is it real? The noise check", word: "the gap vs 2 × sqrt(…)", rule: { practice: 0, climb: 1, pass: [2, 2] },
    lesson: { owner: "I ran three A/B tests and I want to ship every winner. Before I do: which gaps are real, and which are luck?",
      frank: "Flip a coin ten times, you might get seven heads. Doesn't make it a crooked coin. First question: how many flips?",
      lines: ["A new table, <code>ab_test</code>: one row per person in a test. Half saw A, half saw B, at random. Even with no real difference the two rates come out a bit apart. That's noise.",
        "The noise check: <code>2 * sqrt(pA * (1 - pA) / nA + pB * (1 - pB) / nB)</code>, with p each side's rate and n its people. A gap bigger than that is about 95% sure to be real.",
        "Smaller than the noise: you can't tell it from luck. With few people, that means \"too few to tell\", not \"no difference\"."],
      example: "SELECT variant, COUNT(*), AVG(converted) FROM ab_test WHERE test = 'subject' GROUP BY variant;" },
    tpl: [1, 2].map((tier) => [tier, (r) => {
      const t = pick(r, ["subject", "banner", "quiz"]), x = AB[t], gap = x.B.p - x.A.p, noise = 2 * Math.sqrt(x.A.p * (1 - x.A.p) / x.A.n + x.B.p * (1 - x.B.p) / x.B.n);
      const what = { subject: "subject line", banner: "free-shipping banner", quiz: "quiz page" }[t];
      return { who: "rosa", ask: `The ${what} test: is B really better, or can't we tell? Four steps.`, sql: `SELECT ${r4(gap)} > ${r4(noise)};`,
        steps: [
          { ask: `Test '${t}': per variant, the people and the conversion rate. Variant, people and rate.`, sql: `SELECT variant, COUNT(*), AVG(converted) FROM ab_test WHERE test = '${t}' GROUP BY variant;`, hint: "WHERE test = …, GROUP BY variant. AVG(converted) is the rate, since converted is 0 or 1." },
          { ask: "The gap: B's rate − A's rate. Do the sum in SQL.", sql: `SELECT ${x.B.p} - ${x.A.p};`, tol: 0.01, carry: true, hint: "SELECT rate B − rate A;" },
          { ask: "The noise: 2 × sqrt(pA × (1 − pA) ÷ nA + pB × (1 − pB) ÷ nB). Do it in SQL.", sql: `SELECT 2 * sqrt(${x.A.p} * (1 - ${x.A.p}) / ${x.A.n} + ${x.B.p} * (1 - ${x.B.p}) / ${x.B.n});`, tol: 0.01, carry: true, hint: "SELECT 2 * sqrt(0.1 * (1 - 0.1) / 600 + …);" },
          { ask: "The call: is the gap bigger than the noise? SELECT gap > noise; 1 means a real difference, 0 means we can't tell it from luck.", sql: `SELECT ${r4(gap)} > ${r4(noise)};`, carry: true, hint: "SELECT 0.05 > 0.038; gives 1." },
        ] };
    }]) },
  { id: "m3money", kind: "metric", metric: 3, step: 4, owner: "priya", group: M3, name: "Find the money: claimed vs real", word: "attributed − incremental", rule: { practice: 0, climb: 1, pass: [2, 2] },
    lesson: { owner: "The email platform credits every order after a click. Some of those people were buying anyway. The holdout says how much the emails really added. The gap is money we think we're making and aren't.",
      frank: "The platform's story and the holdout's story. Only one of them has an alibi.",
      lines: ["Claimed: every click's 5-day window, added up, the way the platform reports it. An order clicked from two emails is claimed twice: the fan-out from Unit C, in the platform's own numbers.",
        "Incremental: the lift from the holdout (yesterday's three steps, shortened to two here).",
        "The gap: claimed − incremental. Double claims, plus revenue that would have come anyway."],
      example: `SELECT SUM(o.amount) FROM sends s JOIN orders o ON ${WINDOW};` },
    tpl: [1, 2].map((tier) => [tier, (r) => {
      // the click window is a platform setting, so each run uses one: 3, 5 or 7 days
      const D = pick(r, [3, 5, 7]), att = rprOf(() => true, D).rev, g = perGroup(), inc = (r2(g.emailed.rpc) - r2(g.held.rpc)) * g.emailed.n;
      return { who: "priya", ask: `How much of what the platform claims isn't real? Its click window is set to ${D} days. Five steps.`, sql: `SELECT ${att} - ${r2(inc)};`,
        steps: [
          { ask: `What the platform claims: paid orders within ${D} days of a click, all flows, every click's credit added up.`, sql: `SELECT SUM(o.amount) FROM sends s JOIN orders o ON ${WIN(D)};`, hint: `JOIN orders in the ${D}-day window, then SUM. Bounced emails have no clicks, so they drop out on their own.` },
          { ask: "How many credits is that, and how many different orders? Two numbers.", sql: `SELECT COUNT(*), COUNT(DISTINCT o.id) FROM sends s JOIN orders o ON ${WIN(D)};`, hint: "The same join. COUNT(*) counts credits, COUNT(DISTINCT o.id) counts orders. The difference is orders claimed twice." },
          { ask: "Paid revenue per customer, emailed vs held out, with each group's size.", sql: RPC, hint: "LEFT JOIN, ÷ COUNT(DISTINCT c.id), by holdout." },
          { ask: "How many customers are in the emailed group?", sql: "SELECT COUNT(*) FROM customers WHERE holdout = 0;" },
          { ask: "The gap: claimed − (emailed − held out) × emailed count. Do the sum in SQL.", sql: `SELECT ${att} - (${r2(g.emailed.rpc)} - ${r2(g.held.rpc)}) * ${g.emailed.n};`, tol: 0.01, carry: true, hint: "SELECT claimed - ( emailed − held out ) * count;" },
        ] };
    }]) },
];
const caseC = { id: "caseC", kind: "case", group: "Case C · the welcome code", name: "Case C: the welcome code", word: "who it burned, and what it cost", gate: "Unit D",
  lesson: { owner: "Welcome email 2 has the WELCOME5 code. Somebody changed the checkout on Oct 26 and the code stopped working. Nobody noticed for two weeks. I need to know what it cost us.",
    frank: "A broken code. Two weeks of new customers walking up to a locked door. Find out who, then find out how much.",
    lines: ["Everything from Unit C and Metrics 2 and 3: joins, LEFT JOIN, NULL, never, the 5-day window, revenue per recipient.",
      "Run 1 is <b>guided</b>, run 2 <b>hinted</b>, run 3 <b>solo</b>. A clean solo run closes the case and opens Unit D.",
      "The last step uses numbers from the steps before it. Write them down."],
    example: RPR("s.flow = 'welcome'", "s.email") },
  tpl: [1, 2, 3].map((tier) => [tier, (r) => {
    // each run reads the money with a different click window, so the solo run isn't a retype
    const D = pick(r, [3, 5, 7]), w2 = (s) => s[2] === "welcome" && s[3] === 2, b = rprOf((s) => w2(s) && s[4] < "2026-10-26", D), a = rprOf((s) => w2(s) && s[4] >= "2026-10-26", D);
    const W2 = "s.flow = 'welcome' AND s.email = 2";
    return { who: "theo", ask: `The WELCOME5 code broke on Oct 26. Who did it burn, and what did it cost? Read the money with a ${D}-day click window. Seven steps.`, sql: `SELECT (${r2(b.rpr)} - ${r2(a.rpr)}) * ${a.n};`,
      steps: [
        { ask: "Who was sent welcome email 2 on or after Oct 26? Name and the day it was sent.", sql: `SELECT c.name, s.day FROM sends s JOIN customers c ON s.customer_id = c.id WHERE ${W2} AND s.day >= '2026-10-26';` },
        { ask: "Which of them haven't ordered since that email? Name.", sql: `SELECT c.name FROM sends s JOIN customers c ON s.customer_id = c.id LEFT JOIN orders o ON o.customer_id = c.id AND o.day >= s.day WHERE ${W2} AND s.day >= '2026-10-26' AND o.id IS NULL;`, hint: "Never since: LEFT JOIN orders with o.day >= s.day in ON, then o.id IS NULL." },
        { ask: "Orders that used the WELCOME5 code: id, day and amount. Do any come after Oct 26?", sql: "SELECT id, day, amount FROM orders WHERE code = 'WELCOME5';", hint: "The code is a column on orders: WHERE code = 'WELCOME5'." },
        { ask: `Before the break: welcome email 2's revenue per recipient (${D}-day window), for emails sent before Oct 26, and how many were delivered. Show both.`, sql: `SELECT COALESCE(SUM(o.amount), 0) * 1.0 / COUNT(DISTINCT s.id), COUNT(DISTINCT s.id) FROM sends s LEFT JOIN orders o ON ${WIN(D)} WHERE s.delivered = 1 AND ${W2} AND s.day < '2026-10-26';` },
        { ask: "After the break: the same number, for emails sent on or after Oct 26. And how many were delivered? Show both.", sql: `SELECT COALESCE(SUM(o.amount), 0) * 1.0 / COUNT(DISTINCT s.id), COUNT(DISTINCT s.id) FROM sends s LEFT JOIN orders o ON ${WIN(D)} WHERE s.delivered = 1 AND ${W2} AND s.day >= '2026-10-26';` },
        { ask: "What did the WELCOME5 orders sell? Per product: qty × price, added up. Product name and revenue.", sql: "SELECT p.name, SUM(i.qty * i.price) FROM orders o JOIN order_items i ON i.order_id = o.id JOIN products p ON p.id = i.product_id WHERE o.code = 'WELCOME5' GROUP BY p.name;", hint: "Before you SUM: the join copies each order once per product, so o.amount would count the whole basket per line. Use i.qty * i.price." },
        { ask: "The lost revenue: (before − after) × delivered since the break. Do the sum in SQL.", sql: `SELECT (${r2(b.rpr)} - ${r2(a.rpr)}) * ${a.n};`, tol: 0.01, carry: true },
      ] };
  }]) };

// ---------- Unit D: time and steps (SQL-CURRICULUM.md). Still the grown shop ----------
const D = "Unit D · Time and steps";
const SIZE = "CASE WHEN amount >= 80 THEN 'big' WHEN amount >= 40 THEN 'medium' ELSE 'small' END";
// cities whose own average order is far enough from the shop's that some order sits between the two, on both shops
const AVG_CITY = CITIES.filter((ci) => [SHOP, SHOP2].every((S) => { const ids = new Set(S.customers.filter((c) => c[2] === ci).map((c) => c[0])), os = S.orders.filter((o) => ids.has(o[1]));
  const avg = (a) => a.reduce((t, o) => t + o[2], 0) / a.length, x = avg(os), y = avg(S.orders); return os.some((o) => o[2] > Math.min(x, y) && o[2] <= Math.max(x, y)); }));
const NOV_NEW = "SELECT city FROM customers WHERE joined >= '2026-11-08'";
const PER = "SELECT customer_id, SUM(amount) AS spent FROM orders WHERE status = 'paid' GROUP BY customer_id";
const RANKED = "SELECT customer_id, day, amount, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY day, id) AS n FROM orders WHERE status = 'paid'";
// shop days (UTC − 5) whose sign-up count differs from the UTC day's, in both shops: the UTC trap needs one
const shopDay = (t) => new Date(Date.parse(t.replace(" ", "T") + "Z") - 5 * 36e5).toISOString().slice(0, 10);
const UTC_DAYS = [...new Set(SHOP.signups.map((x) => shopDay(x[4])))].filter((d) => [SHOP, SHOP2].every((S) => S.signups.filter((x) => shopDay(x[4]) === d).length !== S.signups.filter((x) => x[4].slice(0, 10) === d).length)).sort();
const UNIT_D = [
  { id: "case", n: 19, group: D, name: "CASE", word: "CASE WHEN … THEN … ELSE … END",
    lesson: { frank: "Buckets. Big, small, engaged, quiet. Everybody fits a bucket. The first bucket that fits is the one they land in. Like a confession.",
      lines: ["<code>CASE WHEN test THEN value … ELSE value END</code> makes a new column: one label per row. Name it with AS.",
        "The WHENs are tried top to bottom and the first true one wins. Put the narrowest test first: <code>&gt;= 80</code> before <code>&gt;= 40</code>. With no ELSE, a row that fits nothing gets NULL.",
        "Count each kind in one row: <code>SUM(CASE WHEN … THEN 1 ELSE 0 END)</code>. Or GROUP BY the label to get one row per kind."],
      example: `SELECT id, amount, ${SIZE} AS size FROM orders WHERE day >= '2026-11-01';` },
    tpl: [
      [2, () => ({ who: "hank", kind: "predict", show: "SELECT CASE WHEN amount >= 80 THEN 'big' WHEN amount >= 40 THEN 'medium' END AS size, COUNT(*) FROM orders GROUP BY size;", ask: "Hank's query. Some orders are big, some medium, some under $40. Before it runs: how many rows come back?", sql: "SELECT COUNT(*) FROM (SELECT CASE WHEN amount >= 80 THEN 'big' WHEN amount >= 40 THEN 'medium' END AS size, COUNT(*) FROM orders GROUP BY size);" })],
      [1, () => ({ who: "hank", ask: "Label each November order: 'big' at $80 or more, else 'small'. id, amount and the label.", sql: "SELECT id, amount, CASE WHEN amount >= 80 THEN 'big' ELSE 'small' END AS size FROM orders WHERE day >= '2026-11-01';" })],
      [1, (r) => { const n = pick(r, [10, 15, 20]); return { who: "rosa", ask: `Every customer's name, and 'engaged' if they opened ${n} or more emails, else 'quiet'.`, sql: `SELECT name, CASE WHEN opens >= ${n} THEN 'engaged' ELSE 'quiet' END AS engagement FROM customers;` }; }],
      [1, (r) => { const d = pick(r, CAMPAIGNS); return { who: "theo", ask: `The ${nice(d)} campaign: each email's id and 'clicked' if it has a clicked_day, else 'no click'.`, sql: `SELECT id, CASE WHEN clicked_day IS NOT NULL THEN 'clicked' ELSE 'no click' END AS result FROM sends WHERE flow = 'campaign' AND day = '${d}';` }; }],
      [2, () => ({ who: "hank", ask: "How many orders of each size: 'big' ($80+), 'medium' ($40 to $79), 'small' (under $40)? Size and count.", sql: `SELECT ${SIZE} AS size, COUNT(*) FROM orders GROUP BY size;` })],
      [2, () => ({ who: "dana", ask: "In one row: how many orders were paid, and how many were refunded.", sql: "SELECT SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END), SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) FROM orders;" })],
      [2, () => ({ who: "rosa", ask: "Per flow, side by side: emails opened by Apple and emails opened by people. Flow, Apple opens, people opens.", sql: "SELECT flow, SUM(CASE WHEN apple_mpp = 1 THEN 1 ELSE 0 END), SUM(CASE WHEN opened = 1 AND apple_mpp = 0 THEN 1 ELSE 0 END) FROM sends GROUP BY flow;" })],
      [3, () => ({ who: "hank", ask: "Per city: how many paid orders were big ($80+), and how many paid orders in all. Leave out customers with no city.", sql: "SELECT c.city, SUM(CASE WHEN o.amount >= 80 THEN 1 ELSE 0 END), COUNT(*) FROM customers c JOIN orders o ON o.customer_id = c.id WHERE o.status = 'paid' AND c.city IS NOT NULL GROUP BY c.city;",
        base: "SELECT c.city, COUNT(*) FROM customers c JOIN orders o ON o.customer_id = c.id WHERE o.status = 'paid' AND c.city IS NOT NULL GROUP BY c.city;", hint: "A conditional count is one more column next to the plain count: SUM(CASE WHEN … THEN 1 ELSE 0 END).",
        marks: [["Per city", "group"], ["how many paid orders were big", "case"], ["paid orders in all", "agg"]] })],
      [3, () => ({ who: "dana", ask: "Paid revenue by order size ('big' $80+, 'medium' $40 to $79, 'small'), biggest revenue first. Size and revenue.", sql: `SELECT ${SIZE} AS size, SUM(amount) AS revenue FROM orders WHERE status = 'paid' GROUP BY size ORDER BY revenue DESC;`, ordered: 1,
        base: "SELECT SUM(amount) AS revenue FROM orders WHERE status = 'paid' ORDER BY revenue DESC;", hint: "The CASE is the label, so it goes in SELECT and in GROUP BY (by its name, size).",
        marks: [["by order size", "case"], ["Paid revenue", "agg"], ["biggest revenue first", "order"]] })],
      [3, () => ({ who: "theo", ask: "Every customer: id, name, and 'buyer' if they have any order, else 'never bought'. One row each.", sql: "SELECT DISTINCT c.id, c.name, CASE WHEN o.id IS NULL THEN 'never bought' ELSE 'buyer' END AS kind FROM customers c LEFT JOIN orders o ON o.customer_id = c.id;",
        base: "SELECT DISTINCT c.id, c.name FROM customers c LEFT JOIN orders o ON o.customer_id = c.id;", hint: "After a LEFT JOIN, a customer with no order has o.id NULL. CASE can test that. DISTINCT keeps one row per buyer.",
        marks: [["any order", "left"], ["'buyer'", "case"], ["One row each", "distinct"]] })],
      [4, () => ({ who: "hank", ask: "Label each order from Oct 1 on: 'big' at $80+, 'medium' at $40 to $79, else 'small'. id, amount and the label.", sql: `SELECT id, amount, ${SIZE} AS size FROM orders WHERE day >= '2026-10-01';`,
        bad: "SELECT id, amount, CASE WHEN amount >= 40 THEN 'medium' WHEN amount >= 80 THEN 'big' ELSE 'small' END AS size FROM orders WHERE day >= '2026-10-01';", trap: "A $90 order passes <code>&gt;= 40</code> first, so it's labelled medium and never reaches the big test. Narrowest test first." })],
      [4, () => ({ who: "dana", ask: "How many orders of each size: 'big' ($80+), else 'small'? Size and count.", sql: "SELECT CASE WHEN amount >= 80 THEN 'big' ELSE 'small' END AS size, COUNT(*) FROM orders GROUP BY size;",
        bad: "SELECT CASE WHEN amount >= 80 THEN 'big' END AS size, COUNT(*) FROM orders GROUP BY size;", trap: "No ELSE, so every order under $80 gets NULL instead of 'small'." })],
      [4, () => ({ who: "rosa", ask: "In one row: how many paid orders and how many refunded.", sql: "SELECT SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END), SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) FROM orders;",
        bad: "SELECT COUNT(CASE WHEN status = 'paid' THEN 1 ELSE 0 END), COUNT(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) FROM orders;", trap: "COUNT counts every value that isn't NULL, and 0 isn't NULL, so both columns count every order. SUM adds the 1s." })],
    ] },
  { id: "dates", n: 20, group: D, name: "Dates", word: "strftime · date · julianday",
    lesson: { frank: "Dates. Somebody always swears it happened in March. Time leaves marks. strftime reads them.",
      lines: ["Dates here are text, '2026-10-05'. <code>strftime('%Y-%m', day)</code> cuts out the month, '2026-10'. <code>%d</code> is the day, <code>%w</code> the weekday ('0' is Sunday).",
        "<code>date(day, '+7 days')</code> moves a date. <code>julianday(b) - julianday(a)</code> is the number of days between two dates.",
        "strftime gives text, so compare with text: <code>strftime('%m', day) = '10'</code>. A plain minus on two dates does nothing useful: '2026-10-05' − '2026-10-01' is 0."],
      example: "SELECT strftime('%Y-%m', day) AS month, SUM(amount) FROM orders WHERE status = 'paid' GROUP BY month;" },
    tpl: [
      [2, () => ({ who: "dana", kind: "predict", show: "SELECT strftime('%Y-%m', day) AS month, COUNT(*) FROM orders GROUP BY month;", ask: "Dana's query. Orders run from Aug 1 to Nov 15. Before it runs: how many rows come back?", sql: "SELECT COUNT(*) FROM (SELECT strftime('%Y-%m', day) AS month, COUNT(*) FROM orders GROUP BY month);" })],
      [1, () => ({ who: "dana", ask: "Number of orders per month. Month ('2026-10') and the count.", sql: "SELECT strftime('%Y-%m', day) AS month, COUNT(*) FROM orders GROUP BY month;" })],
      [1, () => ({ who: "theo", ask: "New customers per month they joined. Month and the count.", sql: "SELECT strftime('%Y-%m', joined) AS month, COUNT(*) FROM customers GROUP BY month;" })],
      [1, () => ({ who: "rosa", ask: "Emails sent per month. Month and the count.", sql: "SELECT strftime('%Y-%m', day) AS month, COUNT(*) FROM sends GROUP BY month;" })],
      [2, () => ({ who: "hank", ask: "Orders placed on a weekend (Saturday or Sunday). id and day.", sql: "SELECT id, day FROM orders WHERE strftime('%w', day) IN ('0', '6');" })],
      [2, (r) => { const c = pick(r, CITIES); return { who: "priya", ask: `${c} customers' orders, with the days from joining to each order. Name, order day and days.`, sql: `SELECT c.name, o.day, julianday(o.day) - julianday(c.joined) FROM customers c JOIN orders o ON o.customer_id = c.id WHERE c.city = '${c}';` }; }],
      [2, () => ({ who: "theo", ask: "Orders placed within 7 days of the customer joining. Name and order day.", sql: "SELECT c.name, o.day FROM customers c JOIN orders o ON o.customer_id = c.id WHERE o.day BETWEEN c.joined AND date(c.joined, '+7 days');" })],
      [3, () => ({ who: "hank", ask: "Paid revenue per month for subscribers, biggest month first. Month and revenue.", sql: "SELECT strftime('%Y-%m', o.day) AS month, SUM(o.amount) AS revenue FROM customers c JOIN orders o ON o.customer_id = c.id WHERE o.status = 'paid' AND c.plan = 'subscriber' GROUP BY month ORDER BY revenue DESC;", ordered: 1,
        base: "SELECT SUM(o.amount) AS revenue FROM customers c JOIN orders o ON o.customer_id = c.id WHERE o.status = 'paid' AND c.plan = 'subscriber';", hint: "The month is just another label to pile by: strftime in SELECT, its name in GROUP BY.",
        marks: [["per month", "dates"], ["subscribers", "join"], ["biggest month first", "order"]] })],
      [3, () => ({ who: "rosa", ask: "Clicks per weekday, all flows. Weekday number ('0' is Sunday) and clicks, most first.", sql: "SELECT strftime('%w', clicked_day) AS weekday, COUNT(*) AS clicks FROM sends WHERE clicked_day IS NOT NULL GROUP BY weekday ORDER BY clicks DESC;", ordered: 1,
        base: "SELECT COUNT(*) AS clicks FROM sends WHERE clicked_day IS NOT NULL;", hint: "strftime('%w', …) gives a weekday label to pile by.",
        marks: [["per weekday", "dates"], ["Clicks", "nulls"], ["most first", "order"]] })],
      [3, () => ({ who: "theo", ask: "Customers who ordered within 3 days of joining, quickest first. Name and days.", sql: "SELECT c.name, julianday(o.day) - julianday(c.joined) AS days FROM customers c JOIN orders o ON o.customer_id = c.id WHERE julianday(o.day) - julianday(c.joined) BETWEEN 0 AND 3 ORDER BY days;", ordered: 1,
        base: "SELECT c.name, o.day FROM customers c JOIN orders o ON o.customer_id = c.id;", hint: "The same day count goes in SELECT (to show) and in WHERE (to test). Don't use the name days in WHERE: most databases refuse it.",
        marks: [["within 3 days of joining", "dates"], ["quickest first", "order"]] })],
      [4, () => ({ who: "dana", ask: "October orders, using the month of the day. id and day.", sql: "SELECT id, day FROM orders WHERE strftime('%m', day) = '10';",
        bad: "SELECT id, day FROM orders WHERE strftime('%m', day) = 10;", trap: "strftime gives text, '10'. Text never equals the number 10, so nothing comes back. Quote it." })],
      [4, () => ({ who: "theo", ask: "Number of orders per month. Month ('2026-10') and the count.", sql: "SELECT strftime('%Y-%m', day) AS month, COUNT(*) FROM orders GROUP BY month;",
        bad: "SELECT strftime('%Y-%M', day) AS month, COUNT(*) FROM orders GROUP BY month;", trap: "<code>%M</code> is minutes, so every month reads '2026-00'. Months are lowercase <code>%m</code>." })],
      [4, (r) => { const c = pick(r, CITIES); return { who: "priya", ask: `${c} customers' orders, with the days from joining to each order. Name, order day and days.`, sql: `SELECT c.name, o.day, julianday(o.day) - julianday(c.joined) FROM customers c JOIN orders o ON o.customer_id = c.id WHERE c.city = '${c}';`,
        bad: `SELECT c.name, o.day, o.day - c.joined FROM customers c JOIN orders o ON o.customer_id = c.id WHERE c.city = '${c}';`, trap: "A minus on two text dates reads just the year from each: 2026 − 2026 = 0. julianday turns a date into a day number you can subtract." }; }],
    ] },
  { id: "messy", n: 21, group: D, name: "Messy data", word: "LOWER · TRIM · substr · instr · NULLIF · UTC",
    lesson: { frank: "Data comes in off the street. Muddy boots, names spelled three ways, clocks set to London. Clean it before you trust it.",
      lines: ["A new table, <code>signups</code>: the newsletter export, emails exactly as people typed them. <code>LOWER(email)</code> folds the capitals, <code>TRIM(email)</code> cuts spaces at either end. Count and compare on <code>LOWER(TRIM(email))</code>.",
        "<code>instr(email, '@')</code> is where the @ sits. <code>substr(email, instr(email, '@') + 1)</code> is everything after it: the domain.",
        "<code>NULLIF(sent, 0)</code> turns a 0 into NULL. Divide by it: SQLite quietly gives NULL for x / 0, other databases stop with an error.",
        "Export times are usually UTC. Fernhill's day is 5 hours behind, so <code>date(signed_up, '-5 hours')</code> is the shop's day. A sign-up at 2am UTC was the evening before."],
      example: "SELECT LOWER(TRIM(email)), COUNT(*) FROM signups GROUP BY LOWER(TRIM(email)) HAVING COUNT(*) > 1;" },
    tpl: [
      [1, () => ({ who: "rosa", ask: "How many different people signed up? Each email once, whatever the capitals and spaces.", sql: "SELECT COUNT(DISTINCT LOWER(TRIM(email))) FROM signups;" })],
      [1, () => ({ who: "rosa", ask: "Every sign-up's email, cleaned: lower case, no spaces. id and the email.", sql: "SELECT id, LOWER(TRIM(email)) FROM signups;" })],
      [1, () => ({ who: "theo", ask: "Sign-ups per email domain, the part after the @. Domain and the count.", sql: "SELECT substr(LOWER(TRIM(email)), instr(TRIM(email), '@') + 1) AS domain, COUNT(*) FROM signups GROUP BY domain;" })],
      [2, () => ({ who: "rosa", ask: "Each sign-up's open rate: opened ÷ sent, empty for people we never emailed. id and the rate.", sql: "SELECT id, opened * 1.0 / NULLIF(sent, 0) FROM signups;" })],
      [2, (r) => { const m = pick(r, BIGMONTH); return { who: "theo", ask: `Sign-ups per shop day in ${m[0]} (the shop is 5 hours behind UTC). Day and the count.`, sql: `SELECT date(signed_up, '-5 hours') AS d, COUNT(*) FROM signups WHERE date(signed_up, '-5 hours') BETWEEN '${m[1]}' AND '${m[2]}' GROUP BY d;` }; }],
      [2, () => ({ who: "dana", ask: "Open rate per sign-up source: opened ÷ sent, divided safely. Source and the rate.", sql: "SELECT source, SUM(opened) * 1.0 / NULLIF(SUM(sent), 0) FROM signups GROUP BY source;" })],
      [2, () => ({ who: "rosa", ask: "Who signed up twice? The cleaned email and how many times.", sql: "SELECT LOWER(TRIM(email)), COUNT(*) FROM signups GROUP BY LOWER(TRIM(email)) HAVING COUNT(*) > 1;" })],
      [3, (r) => { const d = pick(r, ["gmail.com", "yahoo.com", "outlook.com"]); return { who: "dana", ask: `Customers whose sign-up email is at ${d}, with their city. Name and city.`, sql: `SELECT c.name, c.city FROM signups s JOIN customers c ON c.id = s.customer_id WHERE LOWER(TRIM(s.email)) LIKE '%@${d}';`,
        base: "SELECT c.name, c.city FROM signups s JOIN customers c ON c.id = s.customer_id;", hint: "Clean the email first, then LIKE '%@…' tests how it ends.",
        marks: [[`at ${d}`, "where"], ["with their city", "join"]] }; }],
      [3, () => ({ who: "theo", ask: "Sign-ups per domain among people who later bought, biggest first. Domain and the count.", sql: "SELECT substr(LOWER(TRIM(email)), instr(TRIM(email), '@') + 1) AS domain, COUNT(*) AS n FROM signups WHERE customer_id IS NOT NULL GROUP BY domain ORDER BY n DESC, domain;", ordered: 0,
        base: "SELECT customer_id, email FROM signups WHERE customer_id IS NOT NULL;", hint: "The domain is substr from one past the @. Pile on it, count, sort.",
        marks: [["per domain", "group"], ["later bought", "nulls"], ["biggest first", "order"]] })],
      [4, () => ({ who: "rosa", ask: "How many different people are on the newsletter list?", sql: "SELECT COUNT(DISTINCT LOWER(TRIM(email))) FROM signups;",
        bad: "SELECT COUNT(DISTINCT email) FROM signups;", trap: "One person signed up twice with other capitals, so DISTINCT email sees two people. Clean first: <code>LOWER(TRIM(email))</code>." })],
      [4, (r) => { const d = pick(r, UTC_DAYS); return { who: "theo", ask: `How many people signed up on ${nice(d)}, shop time?`, sql: `SELECT COUNT(*) FROM signups WHERE date(signed_up, '-5 hours') = '${d}';`,
        bad: `SELECT COUNT(*) FROM signups WHERE date(signed_up) = '${d}';`, trap: "signed_up is UTC. A sign-up at 2am UTC the next day was still this evening at the shop. Shift first: <code>date(signed_up, '-5 hours')</code>." }; }],
    ] },
  { id: "subquery", n: 22, group: D, name: "Subqueries", word: "( SELECT … )",
    lesson: { frank: "A question inside a question. Like a safe inside a safe. Open the inside one first.",
      lines: ["A query in brackets can stand in for one value: <code>WHERE amount &gt; (SELECT AVG(amount) FROM orders)</code>.",
        "One value can also be a column: <code>SELECT amount, (SELECT AVG(amount) FROM orders)</code> puts the average on every row. Or for a list: <code>WHERE id IN (SELECT customer_id FROM orders WHERE …)</code>. <code>NOT IN</code> for \"never\". Or for a whole table: <code>FROM (SELECT …)</code>.",
        "A NOT IN list with a NULL in it matches nothing at all. Keep NULLs out of the list: <code>WHERE city IS NOT NULL</code> inside."],
      example: "SELECT id, amount FROM orders WHERE amount > (SELECT AVG(amount) FROM orders) AND day >= '2026-11-01';" },
    tpl: [
      [2, () => ({ who: "rosa", kind: "predict", show: "SELECT name FROM customers WHERE id NOT IN (SELECT customer_id FROM orders);", ask: `Rosa's query. ${SHOP.customers.length} customers, and ${SHOP.customers.length - NOORDER} of them have placed an order. Before it runs: how many names come back?`, sql: "SELECT COUNT(*) FROM customers WHERE id NOT IN (SELECT customer_id FROM orders);" })],
      [2, () => ({ who: "hank", intro: "scalar", ask: "Every paid order from November, with the paid average of all orders next to it. id, amount and the average.", sql: "SELECT id, amount, (SELECT AVG(amount) FROM orders WHERE status = 'paid') FROM orders WHERE status = 'paid' AND day >= '2026-11-01';",
        base: "SELECT id, amount FROM orders WHERE status = 'paid' AND day >= '2026-11-01';", hint: "A subquery that gives one number can sit in SELECT as a column: (SELECT AVG(amount) FROM orders WHERE …). Every row gets the same number.",
        marks: [["the paid average of all orders next to it", "subquery"]] })],
      [1, () => ({ who: "hank", ask: "Paid orders above the paid average. id and amount.", sql: "SELECT id, amount FROM orders WHERE status = 'paid' AND amount > (SELECT AVG(amount) FROM orders WHERE status = 'paid');" })],
      [1, (r) => { const n = pick(r, [90, 100]); return { who: "dana", ask: `Customers who have placed an order over $${n}. Name.`, sql: `SELECT name FROM customers WHERE id IN (SELECT customer_id FROM orders WHERE amount > ${n});` }; }],
      [1, () => ({ who: "rosa", ask: "Customers who were never sent a campaign email. Name.", sql: "SELECT name FROM customers WHERE id NOT IN (SELECT customer_id FROM sends WHERE flow = 'campaign');" })],
      [2, () => ({ who: "rosa", ask: "Customers who opened more emails than the average customer. Name and opens.", sql: "SELECT name, opens FROM customers WHERE opens > (SELECT AVG(opens) FROM customers);" })],
      [2, (r) => { const m = pick(r, BIGMONTH); return { who: "theo", ask: `Products that were in an order from ${m[0]}. Product name.`, sql: `SELECT name FROM products WHERE id IN (SELECT i.product_id FROM order_items i JOIN orders o ON i.order_id = o.id WHERE o.day BETWEEN '${m[1]}' AND '${m[2]}');` }; }],
      [2, () => ({ who: "hank", ask: "Orders as big as the biggest order. id, day and amount.", sql: "SELECT id, day, amount FROM orders WHERE amount = (SELECT MAX(amount) FROM orders);" })],
      [3, () => ({ who: "rosa", ask: "Cities whose customers average more opens than customers overall. City and average opens.", sql: "SELECT city, AVG(opens) FROM customers WHERE city IS NOT NULL GROUP BY city HAVING AVG(opens) > (SELECT AVG(opens) FROM customers);",
        base: "SELECT city, AVG(opens) FROM customers WHERE city IS NOT NULL GROUP BY city;", hint: "HAVING can compare a pile's total with a subquery's one value, the same way WHERE does with a row.",
        marks: [["Cities", "group"], ["more opens than customers overall", "subquery"]] })],
      [3, () => ({ who: "priya", ask: "On average, how many paid orders does a buyer place? (Paid orders per customer, then the average of those.)", sql: "SELECT AVG(n) FROM (SELECT customer_id, COUNT(*) AS n FROM orders WHERE status = 'paid' GROUP BY customer_id);",
        base: "SELECT customer_id, COUNT(*) AS n FROM orders WHERE status = 'paid' GROUP BY customer_id;", hint: "The query in the box is one row per customer. Put it in brackets after FROM and average its n.",
        marks: [["Paid orders per customer", "group"], ["the average of those", "subquery"]] })],
      [3, () => ({ who: "dana", ask: "Subscribers who have never placed a paid order, A to Z. Name.", sql: "SELECT name FROM customers WHERE plan = 'subscriber' AND id NOT IN (SELECT customer_id FROM orders WHERE status = 'paid') ORDER BY name;", ordered: 0,
        base: "SELECT name FROM customers WHERE plan = 'subscriber' ORDER BY name;", hint: "NOT IN ( a list of ids ) is one more test, joined with AND.",
        marks: [["Subscribers", "where"], ["never placed a paid order", "subquery"], ["A to Z", "order"]] })],
      [4, () => ({ who: "theo", ask: "Customers living outside every city that got a new customer from Nov 8 on. Name and city.", sql: `SELECT name, city FROM customers WHERE city NOT IN (${NOV_NEW} AND city IS NOT NULL);`,
        bad: `SELECT name, city FROM customers WHERE city NOT IN (${NOV_NEW});`, trap: "One of those new customers has no city, so the list holds a NULL. Against a NULL, NOT IN can never be sure, and nothing comes back. Keep NULLs out of the list." })],
      [4, () => ({ who: "dana", ask: "Every order from Denver customers. id and amount.", sql: "SELECT id, amount FROM orders WHERE customer_id IN (SELECT id FROM customers WHERE city = 'Denver');",
        bad: "SELECT id, amount FROM orders WHERE customer_id = (SELECT id FROM customers WHERE city = 'Denver');", trap: "With <code>=</code>, SQLite quietly uses only the first Denver customer. A list needs IN." })],
      [4, (r) => { const ci = pick(r, AVG_CITY); return { who: "hank", ask: `${ci} customers' orders that beat the average ${ci} order. id and amount.`, sql: `SELECT o.id, o.amount FROM orders o JOIN customers c ON c.id = o.customer_id WHERE c.city = '${ci}' AND o.amount > (SELECT AVG(o2.amount) FROM orders o2 JOIN customers c2 ON c2.id = o2.customer_id WHERE c2.city = '${ci}');`,
        bad: `SELECT o.id, o.amount FROM orders o JOIN customers c ON c.id = o.customer_id WHERE c.city = '${ci}' AND o.amount > (SELECT AVG(amount) FROM orders);`, trap: `The inside query runs on its own, so it needs its own join and WHERE. This one averages every order, not just ${ci}'s.` }; }],
    ] },
  { id: "cte", n: 23, group: D, name: "WITH", word: "WITH step AS ( … ) SELECT …",
    lesson: { frank: "Build it in steps. Step one, the facts. Step two, the truth. Lay the evidence out before you point fingers.",
      lines: ["<code>WITH per AS (SELECT …) SELECT … FROM per</code>: the step gets a name, and the rest of the query uses it like a table.",
        "More steps, commas between: <code>WITH a AS (…), b AS (SELECT … FROM a) SELECT … FROM b</code>.",
        "It's the same as a subquery in FROM, written in reading order. Run each step on its own first to check it.",
        "Name each step by what one row is. <code>per</code> is one row per buyer. If you can't say what one row of a step is, the step isn't finished."],
      example: `WITH per AS (${PER}) SELECT AVG(spent) FROM per;` },
    tpl: [
      [2, () => ({ who: "theo", kind: "predict", show: "WITH n AS (SELECT customer_id, COUNT(*) AS k FROM orders WHERE status = 'paid' GROUP BY customer_id) SELECT k, COUNT(*) FROM n GROUP BY k;", ask: `Theo's query. ${BUYERS} customers have a paid order, ${PAIDS.length} paid orders in all. Before it runs: add up the second column. What do you get?`, sql: "WITH n AS (SELECT customer_id, COUNT(*) AS k FROM orders WHERE status = 'paid' GROUP BY customer_id) SELECT COUNT(*) FROM n;" })],
      [1, () => ({ who: "hank", ask: "Average paid spend per buyer: each customer's paid total first, then the average.", sql: `WITH per AS (${PER}) SELECT AVG(spent) FROM per;` })],
      [1, () => ({ who: "priya", ask: "How many customers have 3 or more paid orders?", sql: "WITH n AS (SELECT customer_id, COUNT(*) AS k FROM orders WHERE status = 'paid' GROUP BY customer_id) SELECT COUNT(*) FROM n WHERE k >= 3;" })],
      [1, (r) => { const x = pick(r, [120, 150]); return { who: "dana", ask: `Customers whose paid spend is over $${x}, with names. Name and spend.`, sql: `WITH per AS (${PER}) SELECT c.name, per.spent FROM per JOIN customers c ON c.id = per.customer_id WHERE per.spent > ${x};` }; }],
      [2, () => ({ who: "theo", ask: "Each buyer's first paid order day, then how many first orders came in each month. Month and the count.", fill: "WITH first AS (____) SELECT strftime('%Y-%m', d) AS month, COUNT(*) FROM first GROUP BY month;", sql: "WITH first AS (SELECT customer_id, MIN(day) AS d FROM orders WHERE status = 'paid' GROUP BY customer_id) SELECT strftime('%Y-%m', d) AS month, COUNT(*) FROM first GROUP BY month;" })],
      [2, () => ({ who: "hank", ask: "Average paid spend per buyer, by city. City and the average. Leave out no-city customers.", sql: `WITH per AS (${PER}) SELECT c.city, AVG(per.spent) FROM per JOIN customers c ON c.id = per.customer_id WHERE c.city IS NOT NULL GROUP BY c.city;` })],
      [2, () => ({ who: "priya", ask: "The share of buyers with 2 or more paid orders.", sql: "WITH n AS (SELECT customer_id, COUNT(*) AS k FROM orders WHERE status = 'paid' GROUP BY customer_id) SELECT SUM(CASE WHEN k >= 2 THEN 1 ELSE 0 END) * 1.0 / COUNT(*) FROM n;" })],
      [3, () => ({ who: "dana", ask: "Spend tiers: label each buyer 'VIP' ($200+ paid), 'regular' ($80+) or 'light', then count each tier. Tier and the count.", sql: `WITH per AS (${PER}), tier AS (SELECT CASE WHEN spent >= 200 THEN 'VIP' WHEN spent >= 80 THEN 'regular' ELSE 'light' END AS t FROM per) SELECT t, COUNT(*) FROM tier GROUP BY t;`,
        base: `WITH per AS (${PER}) SELECT spent FROM per;`, hint: "A second step can read the first: tier AS (SELECT CASE … FROM per). Then count tier.",
        marks: [["label each buyer", "case"], ["$200+ paid", "cte"], ["count each tier", "group"]] })],
      [3, () => ({ who: "theo", ask: "Buyers per first-order month, biggest month first. Month and buyers.", sql: "WITH first AS (SELECT customer_id, MIN(day) AS d FROM orders WHERE status = 'paid' GROUP BY customer_id) SELECT strftime('%Y-%m', d) AS month, COUNT(*) AS buyers FROM first GROUP BY month ORDER BY buyers DESC;", ordered: 1,
        base: "SELECT customer_id, MIN(day) AS d FROM orders WHERE status = 'paid' GROUP BY customer_id;", hint: "Wrap the query in the box as a step: WITH first AS ( … ). Then pile its d by month.",
        marks: [["first-order month", "cte"], ["Buyers per", "group"], ["biggest month first", "order"]] })],
      [3, () => ({ who: "hank", ask: "Buyers who spent more than the average buyer. Name and spend, most first.", sql: `WITH per AS (${PER}) SELECT c.name, per.spent FROM per JOIN customers c ON c.id = per.customer_id WHERE per.spent > (SELECT AVG(spent) FROM per) ORDER BY per.spent DESC;`, ordered: 1,
        base: `WITH per AS (${PER}) SELECT c.name, per.spent FROM per JOIN customers c ON c.id = per.customer_id ORDER BY per.spent DESC;`, hint: "A step can be used twice: once joined, once inside a subquery for its average.",
        marks: [["more than the average buyer", "subquery"], ["Name", "join"], ["most first", "order"]] })],
      [4, () => ({ who: "hank", ask: "Average paid spend per buyer.", sql: `WITH per AS (${PER}) SELECT AVG(spent) FROM per;`,
        bad: "WITH per AS (SELECT customer_id, SUM(amount) AS spent FROM orders GROUP BY customer_id) SELECT AVG(spent) FROM per;", trap: "Step one forgot <code>status = 'paid'</code>, so every later step carries the refunds. Check each step on its own." })],
      [4, () => ({ who: "priya", ask: "How many customers have 3 or more paid orders?", sql: "WITH n AS (SELECT customer_id, COUNT(*) AS k FROM orders WHERE status = 'paid' GROUP BY customer_id) SELECT COUNT(*) FROM n WHERE k >= 3;",
        bad: "WITH n AS (SELECT customer_id, COUNT(*) AS k FROM orders WHERE status = 'paid' GROUP BY customer_id) SELECT SUM(k) FROM n WHERE k >= 3;", trap: "SUM(k) adds up their orders. The ask counts customers: one row per customer in n, so COUNT(*)." })],
      [4, () => ({ who: "theo", ask: "Each buyer's first paid order day, then how many first orders came in each month. Month and the count.", sql: "WITH first AS (SELECT customer_id, MIN(day) AS d FROM orders WHERE status = 'paid' GROUP BY customer_id) SELECT strftime('%Y-%m', d) AS month, COUNT(*) FROM first GROUP BY month;",
        bad: "WITH first AS (SELECT customer_id, MIN(day) AS d FROM orders WHERE status = 'paid' GROUP BY customer_id) SELECT strftime('%Y-%m', day) AS month, COUNT(*) FROM orders GROUP BY month;", trap: "The last step reads orders again instead of the step, so it counts every order, not first orders. Read FROM first." })],
    ] },
  { id: "window", n: 24, group: D, name: "Window functions: number the rows", word: "ROW_NUMBER · RANK · OVER (PARTITION BY …)",
    lesson: { frank: "Rank them without squashing them. Everybody keeps their row, everybody gets a number.",
      lines: ["<code>ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY day, id)</code> numbers each customer's orders 1, 2, 3. The rows stay; GROUP BY would squash them.",
        "PARTITION BY is the pile, ORDER BY the order inside it. Two orders on the same day? The id is the tiebreak: ids count up, so the lower id came in first. <code>RANK()</code> gives ties the same number. <code>COUNT(*) OVER (PARTITION BY customer_id)</code> puts the pile's size on every row.",
        "Windows run after WHERE, so a window can't go in WHERE. To keep only order 1, number them in a WITH step and filter outside."],
      example: `${RANKED} AND customer_id <= 5;` },
    tpl: [
      [2, () => ({ who: "priya", kind: "predict", show: "WITH r AS (SELECT customer_id, day, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY day, id) AS n FROM orders WHERE status = 'paid') SELECT customer_id, day FROM r WHERE n = 1;", ask: `Priya's query. ${PAIDS.length} paid orders from ${BUYERS} buyers. Before it runs: how many rows come back?`, sql: "SELECT COUNT(DISTINCT customer_id) FROM orders WHERE status = 'paid';" })],
      [1, (r) => { const c = pick(r, CITIES); return { who: "priya", ask: `${c} customers' paid orders, each numbered for that customer (1 = their first, same day: lower id first). customer_id, day and the number.`, sql: `SELECT o.customer_id, o.day, ROW_NUMBER() OVER (PARTITION BY o.customer_id ORDER BY o.day, o.id) FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.status = 'paid' AND c.city = '${c}';` }; }],
      [1, () => ({ who: "theo", ask: "Rank products by units sold, most first, ties sharing a rank. Product name, units and rank.", sql: "SELECT p.name, SUM(i.qty) AS units, RANK() OVER (ORDER BY SUM(i.qty) DESC) FROM order_items i JOIN products p ON p.id = i.product_id GROUP BY p.name;" })],
      [1, () => ({ who: "hank", ask: "Every paid order with how many paid orders that customer has in all. id, customer_id and the count.", sql: "SELECT id, customer_id, COUNT(*) OVER (PARTITION BY customer_id) FROM orders WHERE status = 'paid';" })],
      [2, () => ({ who: "dana", ask: "Each customer's latest paid order (same day: the higher id). customer_id, day and amount.", sql: "WITH r AS (SELECT customer_id, day, amount, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY day DESC, id DESC) AS n FROM orders WHERE status = 'paid') SELECT customer_id, day, amount FROM r WHERE n = 1;" })],
      [2, () => ({ who: "hank", ask: "Each customer's biggest paid order (a tie: the lower id). customer_id, order id and amount.", sql: "WITH r AS (SELECT customer_id, id, amount, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY amount DESC, id) AS n FROM orders WHERE status = 'paid') SELECT customer_id, id, amount FROM r WHERE n = 1;" })],
      [2, (r) => { const k = pick(r, [2, 3]); return { who: "rosa", ask: `Each customer's first ${k} paid orders (same day: lower id first). customer_id, day and amount.`, sql: `WITH r AS (${RANKED}) SELECT customer_id, day, amount FROM r WHERE n <= ${k};` }; }],
      [3, () => ({ who: "hank", ask: "Each buyer's first paid order, with names. Name, day and amount.", sql: `WITH r AS (${RANKED}) SELECT c.name, r.day, r.amount FROM r JOIN customers c ON c.id = r.customer_id WHERE r.n = 1;`,
        base: `WITH r AS (${RANKED}) SELECT r.customer_id, r.day, r.amount FROM r WHERE r.n = 1;`, hint: "The numbered step is a table like any other: join customers to it for the names.",
        marks: [["first paid order", "window"], ["with names", "join"]] })],
      [3, () => ({ who: "theo", ask: "How many paid orders were first orders and how many were repeats? Kind ('first' or 'repeat') and the count.", sql: `WITH r AS (${RANKED}) SELECT CASE WHEN n = 1 THEN 'first' ELSE 'repeat' END AS kind, COUNT(*) FROM r GROUP BY kind;`,
        base: `WITH r AS (${RANKED}) SELECT COUNT(*) FROM r;`, hint: "Number the orders in a step, then a CASE on the number gives the label to pile by.",
        marks: [["first orders", "window"], ["'first' or 'repeat'", "case"], ["the count", "group"]] })],
      [3, () => ({ who: "dana", ask: "The biggest paid order in each city (a tie: the lower id), with the customer's name. Leave out no-city customers. City, name and amount.", sql: "WITH r AS (SELECT c.city, c.name, o.amount, ROW_NUMBER() OVER (PARTITION BY c.city ORDER BY o.amount DESC, o.id) AS n FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.status = 'paid' AND c.city IS NOT NULL) SELECT city, name, amount FROM r WHERE n = 1;",
        base: "SELECT c.city, c.name, o.amount FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.status = 'paid' AND c.city IS NOT NULL;", hint: "The pile is the city now: PARTITION BY c.city, biggest first inside it. Then keep n = 1 outside the step.",
        marks: [["The biggest paid order in each city", "window"], ["with the customer's name", "join"]] })],
      [4, () => ({ who: "dana", ask: "Each buyer's first paid order. customer_id, day and amount.", sql: `WITH r AS (${RANKED}) SELECT customer_id, day, amount FROM r WHERE n = 1;`,
        bad: "SELECT customer_id, day, amount FROM orders WHERE status = 'paid' AND ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY day, id) = 1;", trap: "Windows run after WHERE, so WHERE can't see them. Number the rows in a WITH step, then filter outside." })],
      [4, () => ({ who: "dana", ask: "Each customer's latest paid order (same day: the higher id). customer_id, day and amount.", sql: "WITH r AS (SELECT customer_id, day, amount, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY day DESC, id DESC) AS n FROM orders WHERE status = 'paid') SELECT customer_id, day, amount FROM r WHERE n = 1;",
        bad: `WITH r AS (${RANKED}) SELECT customer_id, day, amount FROM r WHERE n = 1;`, trap: "ORDER BY day counts up, so n = 1 is their first order. The latest comes first with <code>ORDER BY day DESC, id DESC</code>." })],
      [4, () => ({ who: "hank", ask: "Each buyer's first paid order, with names. Name, day and amount.", sql: `WITH r AS (${RANKED}) SELECT c.name, r.day, r.amount FROM r JOIN customers c ON c.id = r.customer_id WHERE r.n = 1;`,
        bad: "WITH r AS (SELECT customer_id, day, amount, ROW_NUMBER() OVER (ORDER BY day, id) AS n FROM orders WHERE status = 'paid') SELECT c.name, r.day, r.amount FROM r JOIN customers c ON c.id = r.customer_id WHERE r.n = 1;", trap: "Without PARTITION BY the whole table is one pile, so only the shop's very first order gets a 1. PARTITION BY customer_id." })],
    ] },
  { id: "lag", n: 25, group: D, name: "Window functions: the row before", word: "LAG · LEAD · SUM(…) OVER (ORDER BY …)",
    lesson: { frank: "Every order has a past. LAG finds it. And money piles up over time: a running total shows you how fast.",
      lines: ["<code>LAG(day) OVER (PARTITION BY customer_id ORDER BY day, id)</code> is the row before in the same pile. A customer's first order has no row before, so it gets NULL. <code>LEAD</code> is the row after.",
        "The gap between orders: <code>julianday(day) - julianday(LAG(day) OVER (…))</code>. Dates are text, so a plain minus doesn't work.",
        "<code>SUM(amount) OVER (ORDER BY id)</code> is a running total: each row adds itself to the ones before. Add <code>PARTITION BY customer_id</code> and it starts again for each customer."],
      example: "SELECT customer_id, day, LAG(day) OVER (PARTITION BY customer_id ORDER BY day, id) AS prev FROM orders WHERE status = 'paid' AND customer_id <= 5;" },
    tpl: [
      [2, () => ({ who: "rosa", kind: "predict", show: "SELECT customer_id, day, LAG(day) OVER (PARTITION BY customer_id ORDER BY day, id) AS prev FROM orders WHERE status = 'paid';", ask: `Rosa's query. ${PAIDS.length} paid orders from ${BUYERS} buyers. Before it runs: how many rows have prev empty?`, sql: "SELECT COUNT(*) FROM (SELECT LAG(day) OVER (PARTITION BY customer_id ORDER BY day, id) AS prev FROM orders WHERE status = 'paid') WHERE prev IS NULL;" })],
      [1, () => ({ who: "priya", ask: "Each paid order with the same customer's previous paid order day (same day: lower id first). customer_id, day and the previous day.", sql: "SELECT customer_id, day, LAG(day) OVER (PARTITION BY customer_id ORDER BY day, id) FROM orders WHERE status = 'paid';" })],
      [1, () => ({ who: "hank", ask: "November's paid orders in the order they came in (by id), with a running total of revenue. id, amount and the running total.", sql: "SELECT id, amount, SUM(amount) OVER (ORDER BY id) FROM orders WHERE status = 'paid' AND day >= '2026-11-01';" })],
      [1, () => ({ who: "theo", ask: "Each paid order with the same customer's previous paid order amount (same day: lower id first). customer_id, day, amount and the previous amount.", sql: "SELECT customer_id, day, amount, LAG(amount) OVER (PARTITION BY customer_id ORDER BY day, id) FROM orders WHERE status = 'paid';" })],
      [2, () => ({ who: "rosa", ask: "Days since the same customer's previous paid order, for every paid order (same day: lower id first). customer_id, day and the days.", sql: "SELECT customer_id, day, julianday(day) - julianday(LAG(day) OVER (PARTITION BY customer_id ORDER BY day, id)) FROM orders WHERE status = 'paid';" })],
      [2, () => ({ who: "priya", ask: "Each paid order with the same customer's next paid order day, empty if there isn't one (same day: lower id first). customer_id, day and the next day.", sql: "SELECT customer_id, day, LEAD(day) OVER (PARTITION BY customer_id ORDER BY day, id) FROM orders WHERE status = 'paid';" })],
      [2, () => ({ who: "dana", ask: "Each paid order with that customer's running paid total so far (same day: lower id first). customer_id, day and the running total.", sql: "SELECT customer_id, day, SUM(amount) OVER (PARTITION BY customer_id ORDER BY day, id) FROM orders WHERE status = 'paid';" })],
      [3, () => ({ who: "rosa", ask: "Second orders only: for each buyer with 2+ paid orders, the days from their first order to their second. customer_id and days.", sql: "WITH r AS (SELECT customer_id, day, LAG(day) OVER (PARTITION BY customer_id ORDER BY day, id) AS prev, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY day, id) AS n FROM orders WHERE status = 'paid') SELECT customer_id, julianday(day) - julianday(prev) FROM r WHERE n = 2;",
        base: `WITH r AS (${RANKED}) SELECT customer_id, day FROM r WHERE n = 2;`, hint: "Order 2's LAG is order 1. Put both windows in the step, keep n = 2, then subtract with julianday.",
        marks: [["Second orders only", "window"], ["from their first order to their second", "lag"]] })],
      [3, (r) => { const d = pick(r, [24, 30, 35]); return { who: "theo", ask: `Paid orders that came more than ${d} days after the same customer's previous paid order (same day: lower id first). customer_id, day and the gap in days.`, sql: `WITH g AS (SELECT customer_id, day, julianday(day) - julianday(LAG(day) OVER (PARTITION BY customer_id ORDER BY day, id)) AS gap FROM orders WHERE status = 'paid') SELECT customer_id, day, gap FROM g WHERE gap > ${d};`,
        base: "SELECT customer_id, day, julianday(day) - julianday(LAG(day) OVER (PARTITION BY customer_id ORDER BY day, id)) AS gap FROM orders WHERE status = 'paid';", hint: "WHERE can't see a window, or the name gap made beside it. Put this query in a WITH step and filter outside.",
        marks: [[`more than ${d} days after`, "cte"], ["previous paid order", "lag"]] }; }],
      [3, () => ({ who: "hank", ask: "October's paid revenue per day, with a running total across the month. Day, revenue and the running total.", sql: "SELECT day, SUM(amount), SUM(SUM(amount)) OVER (ORDER BY day) FROM orders WHERE status = 'paid' AND day BETWEEN '2026-10-01' AND '2026-10-31' GROUP BY day;",
        base: "SELECT day, SUM(amount) FROM orders WHERE status = 'paid' AND day BETWEEN '2026-10-01' AND '2026-10-31' GROUP BY day;", hint: "A window runs after GROUP BY, so it can add up the day totals: SUM(SUM(amount)) OVER (ORDER BY day).",
        marks: [["a running total across the month", "window"], ["per day", "group"]] })],
      [4, () => ({ who: "priya", ask: "Each paid order with the same customer's previous paid order day (same day: lower id first). customer_id, day and the previous day.", sql: "SELECT customer_id, day, LAG(day) OVER (PARTITION BY customer_id ORDER BY day, id) FROM orders WHERE status = 'paid';",
        bad: "SELECT customer_id, day, LAG(day) OVER (ORDER BY customer_id, day, id) FROM orders WHERE status = 'paid';", trap: "Without PARTITION BY there's one big pile, so each customer's first order gets the previous customer's last day. PARTITION BY customer_id." })],
      [4, () => ({ who: "rosa", ask: "Days since the same customer's previous paid order, for every paid order (same day: lower id first). customer_id, day and the days.", sql: "SELECT customer_id, day, julianday(day) - julianday(LAG(day) OVER (PARTITION BY customer_id ORDER BY day, id)) FROM orders WHERE status = 'paid';",
        bad: "SELECT customer_id, day, day - LAG(day) OVER (PARTITION BY customer_id ORDER BY day, id) FROM orders WHERE status = 'paid';", trap: "A minus on two text dates reads just the year from each: 2026 − 2026 = 0. julianday both sides." })],
      [4, () => ({ who: "dana", ask: "Each paid order with that customer's running paid total so far (same day: lower id first). customer_id, day and the running total.", sql: "SELECT customer_id, day, SUM(amount) OVER (PARTITION BY customer_id ORDER BY day, id) FROM orders WHERE status = 'paid';",
        bad: "SELECT customer_id, day, SUM(amount) OVER (ORDER BY day, id) FROM orders WHERE status = 'paid';", trap: "With no PARTITION BY it's the whole shop's running total. PARTITION BY customer_id starts it again for each customer." })],
    ] },
];

// ---------- Metrics 4 and 5: repeat purchase, lapsed and winback (the grown shop) ----------
const TODAY = "2026-11-15";
const jd = (iso) => Date.parse(iso + "T00:00:00Z") / 864e5;
// each buyer's paid orders, oldest first (day, then id), read straight from the rows for the chains' numbers
const PAID = (() => { const m = new Map(); for (const o of SHOP.orders) if (o[4] === "paid") { if (!m.has(o[1])) m.set(o[1], []); m.get(o[1]).push(o); } return m; })();
const GAPS = [...PAID.values()].filter((os) => os.length > 1).map((os) => jd(os[1][3]) - jd(os[0][3])).sort((a, b) => a - b);
const MEDIAN = (GAPS[Math.floor((GAPS.length - 1) / 2)] + GAPS[Math.floor(GAPS.length / 2)]) / 2;
const N_SQL = "SELECT customer_id, COUNT(*) AS k FROM orders WHERE status = 'paid' GROUP BY customer_id";
const REPEAT = `WITH n AS (${N_SQL}) SELECT SUM(CASE WHEN k >= 2 THEN 1 ELSE 0 END) * 1.0 / COUNT(*) FROM n;`;
const R2 = "SELECT customer_id, day, amount, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY day, id) AS n, LAG(day) OVER (PARTITION BY customer_id ORDER BY day, id) AS prev FROM orders WHERE status = 'paid'";
const GAP_STEP = `r AS (${R2}), g AS (SELECT customer_id, julianday(day) - julianday(prev) AS gap FROM r WHERE n = 2)`;
const GAPQ = `WITH r AS (${R2}) SELECT customer_id, julianday(day) - julianday(prev) AS gap FROM r WHERE n = 2;`;
const MED = `WITH ${GAP_STEP}, k AS (SELECT gap, ROW_NUMBER() OVER (ORDER BY gap) AS k, COUNT(*) OVER () AS n FROM g) SELECT AVG(gap) FROM k WHERE k IN ((n + 1) / 2, (n + 2) / 2);`;
const SINCE = `SELECT customer_id, julianday('${TODAY}') - julianday(MAX(day)) AS days FROM orders WHERE status = 'paid' GROUP BY customer_id;`;
// lapsed (Metric 5): past twice their own usual gap. Usual gap: their average gap, at least 14 days; 30 with one order
const S_STEP = `s AS (SELECT customer_id, SUM(amount) AS spent, COUNT(*) AS k, julianday('${TODAY}') - julianday(MAX(day)) AS days, CASE WHEN COUNT(*) > 1 THEN MAX((julianday(MAX(day)) - julianday(MIN(day))) / (COUNT(*) - 1), 14) ELSE 30 END AS gap FROM orders WHERE status = 'paid' GROUP BY customer_id)`;
const STATUS_CASE = "CASE WHEN days > 2 * gap THEN 'lapsed' WHEN days > gap THEN 'at risk' ELSE 'active' END";
const STATUS = `WITH ${S_STEP} SELECT customer_id, ${STATUS_CASE} AS status FROM s;`;
const LAPSED = (() => [...PAID].map(([cid, os]) => { const days = jd(TODAY) - jd(os.at(-1)[3]), gap = os.length > 1 ? Math.max((jd(os.at(-1)[3]) - jd(os[0][3])) / (os.length - 1), 14) : 30;
  return { cid, days, gap, spent: os.reduce((a, o) => a + o[2], 0), n: os.length }; }).filter((x) => x.days > 2 * x.gap))();
const GOT = "got AS (SELECT customer_id, MIN(day) AS d FROM sends WHERE flow = 'winback' AND delivered = 1 GROUP BY customer_id)";
const WBq = (w) => `WITH ${GOT} SELECT COUNT(DISTINCT o.customer_id) * 1.0 / COUNT(DISTINCT g.customer_id) FROM got g LEFT JOIN orders o ON o.customer_id = g.customer_id AND o.status = 'paid' AND o.day BETWEEN g.d AND date(g.d, '+${w} days');`, WB = WBq(30);
const wbRate = (w) => { const got = new Map(); for (const s of SHOP.sends) if (s[2] === "winback" && s[5] && (!got.has(s[1]) || s[4] < got.get(s[1]))) got.set(s[1], s[4]);
  let back = 0; for (const [cid, d] of got) if ((PAID.get(cid) || []).some((o) => o[3] >= d && jd(o[3]) - jd(d) <= w)) back++; return back / got.size; }, WB_RATE = wbRate(30);
const M4 = "Metric 4 · Repeat purchase", M5 = "Metric 5 · Lapsed and winback";
const METRIC45 = [
  { id: "m4repeat", kind: "metric", metric: 4, step: 1, owner: "rosa", group: M4, name: "Repeat rate", word: "2+ orders ÷ 1+ orders, in customers",
    lesson: { owner: "Of everyone who bought once, how many came back? Every retention plan I've ever written starts from that one number.",
      frank: "First time's an accident. Second time's a habit. Count the people with the habit.",
      lines: ["Repeat rate = buyers with 2 or more paid orders ÷ buyers with 1 or more. People, not orders.",
        "Build it in a step: <code>WITH n AS (SELECT customer_id, COUNT(*) AS k FROM orders WHERE status = 'paid' GROUP BY customer_id)</code>, one row per buyer. Then <code>SUM(CASE WHEN k &gt;= 2 THEN 1 ELSE 0 END) * 1.0 / COUNT(*) FROM n</code>.",
        "The bottom is buyers only. Someone who never bought can't come back, so they don't belong in it."],
      build: [["One row per buyer, with their paid orders", `${N_SQL};`], ["Buyers who came back, and all buyers", `WITH n AS (${N_SQL}) SELECT SUM(CASE WHEN k >= 2 THEN 1 ELSE 0 END), COUNT(*) FROM n;`], ["Repeat rate", REPEAT]],
      example: REPEAT },
    tpl: [
      [1, () => ({ who: "rosa", ask: "The repeat rate: buyers with 2+ paid orders ÷ all buyers.", fill: `WITH n AS (${N_SQL}) SELECT SUM(CASE WHEN ____ THEN 1 ELSE 0 END) * 1.0 / COUNT(*) FROM n;`, sql: REPEAT })],
      [1, () => ({ who: "rosa", ask: "The repeat rate: buyers with 2+ paid orders ÷ all buyers.", fill: "WITH n AS (____) SELECT SUM(CASE WHEN k >= 2 THEN 1 ELSE 0 END) * 1.0 / COUNT(*) FROM n;", sql: REPEAT })],
      [2, () => ({ who: "dana", ask: "Repeat rate per plan. Plan and the rate.", sql: `WITH n AS (${N_SQL}) SELECT c.plan, SUM(CASE WHEN n.k >= 2 THEN 1 ELSE 0 END) * 1.0 / COUNT(*) FROM n JOIN customers c ON c.id = n.customer_id GROUP BY c.plan;` })],
      [2, () => ({ who: "hank", ask: "Repeat rate per channel. Channel and the rate.", sql: `WITH n AS (${N_SQL}) SELECT c.channel, SUM(CASE WHEN n.k >= 2 THEN 1 ELSE 0 END) * 1.0 / COUNT(*) FROM n JOIN customers c ON c.id = n.customer_id GROUP BY c.channel;` })],
      [2, (r) => { const d = pick(r, ["2026-08-15", "2026-09-01", "2026-09-15"]); return { who: "rosa", ask: `Repeat rate for buyers who joined before ${nice(d)} (they've had time to come back).`, sql: `WITH n AS (${N_SQL}) SELECT SUM(CASE WHEN n.k >= 2 THEN 1 ELSE 0 END) * 1.0 / COUNT(*) FROM n JOIN customers c ON c.id = n.customer_id WHERE c.joined < '${d}';` }; }],
      [2, (r) => { const k = pick(r, [3, 4]); return { who: "dana", ask: `The share of buyers with ${k} or more paid orders.`, sql: `WITH n AS (${N_SQL}) SELECT SUM(CASE WHEN k >= ${k} THEN 1 ELSE 0 END) * 1.0 / COUNT(*) FROM n;` }; }],
      [4, () => ({ who: "rosa", ask: "The repeat rate: buyers with 2+ paid orders ÷ all buyers.", sql: REPEAT,
        bad: `WITH n AS (${N_SQL}) SELECT SUM(CASE WHEN k >= 2 THEN 1 ELSE 0 END) * 1.0 / (SELECT COUNT(*) FROM customers) FROM n;`, trap: "The bottom counts every customer, including the ones who never bought. They can't repeat, so the rate looks worse than it is. Divide by buyers: COUNT(*) FROM n." })],
      [4, () => ({ who: "dana", ask: "The repeat rate: buyers with 2+ paid orders ÷ all buyers.", sql: REPEAT,
        bad: `WITH n AS (${N_SQL}) SELECT SUM(CASE WHEN k >= 2 THEN k ELSE 0 END) * 1.0 / SUM(k) FROM n;`, trap: "That's the share of orders that came from repeat buyers. A repeat buyer with 5 orders counts 5 times. The ask counts people." })],
    ] },
  { id: "m4second", kind: "metric", metric: 4, step: 2, owner: "rosa", group: M4, name: "Time to second order", word: "LAG on order 2",
    lesson: { owner: "When do people come back? If I know the usual wait, I know when to send the refill email.",
      frank: "The second visit. That's when you know they meant it. Time it.",
      lines: ["Number each buyer's paid orders and take the previous order's day in the same step: <code>ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY day, id)</code> and <code>LAG(day) OVER (…)</code>.",
        "Keep order 2: its LAG is order 1. <code>julianday(day) - julianday(prev)</code> is the days between.",
        "<code>ORDER BY day, id</code>: two orders on the same day still get a fixed order."],
      build: [["Each paid order, numbered, with the one before", `${R2} AND customer_id <= 9;`], ["Days from first to second order", GAPQ]],
      example: GAPQ },
    tpl: [
      [1, () => ({ who: "rosa", ask: "Days from first to second paid order, for each buyer who has one. customer_id and days.", fill: `WITH r AS (${R2}) SELECT customer_id, julianday(day) - julianday(prev) FROM r WHERE ____;`, sql: GAPQ })],
      [1, () => ({ who: "rosa", ask: "Days from first to second paid order, for each buyer who has one. customer_id and days.", sql: GAPQ })],
      [2, () => ({ who: "dana", ask: "The average days from first to second paid order.", sql: `WITH ${GAP_STEP} SELECT AVG(gap) FROM g;` })],
      [2, (r) => { const col = pick(r, ["plan", "channel"]); return { who: "rosa", ask: `Average days to a second order, per ${col}. ${col[0].toUpperCase() + col.slice(1)} and the average.`, sql: `WITH ${GAP_STEP} SELECT c.${col}, AVG(g.gap) FROM g JOIN customers c ON c.id = g.customer_id GROUP BY c.${col};` }; }],
      [2, (r) => { const n = pick(r, [5, 22, 30]); return { who: "theo", ask: `How many second orders came within ${n} days of the first?`, sql: `WITH ${GAP_STEP} SELECT COUNT(*) FROM g WHERE gap <= ${n};` }; }],
      [4, () => ({ who: "rosa", ask: "Days from first to second paid order, for each buyer who has one. customer_id and days.", sql: GAPQ,
        bad: `WITH r AS (${R2}) SELECT customer_id, julianday(day) - julianday(prev) FROM r WHERE n = 1;`, trap: "Order 1 has no order before it, so its LAG is empty and every gap is NULL. The second order's LAG is the first: n = 2." })],
      [4, () => ({ who: "dana", ask: "Days from first to second paid order, for each buyer who has one. customer_id and days.", sql: GAPQ,
        bad: `WITH r AS (${R2}) SELECT customer_id, day - prev FROM r WHERE n = 2;`, trap: "A minus on two text dates reads only the year: 0 every time. julianday on both." })],
    ] },
  { id: "m4median", kind: "metric", metric: 4, step: 3, owner: "rosa", group: M4, name: "The median, and who never came back", word: "the middle gap, not the average",
    lesson: { owner: "The average says people come back in about 20 days. But a bunch of them reorder within a day because they forgot something. The middle customer waits longer.",
      frank: "The average lies when a few witnesses shout. Ask the one in the middle.",
      lines: ["The median is the middle gap: half came back faster, half slower. A few 0-day reorders drag the average down; they barely move the median.",
        "SQLite has no MEDIAN. Number the gaps in order, <code>ROW_NUMBER() OVER (ORDER BY gap) AS k</code>, count them, <code>COUNT(*) OVER () AS n</code>, and average the middle one or two: <code>WHERE k IN ((n + 1) / 2, (n + 2) / 2)</code>. Whole-number division picks the right rows for odd and even n.",
        "And the other half of the story: the share of buyers with exactly one paid order, who never came back."],
      build: [["The gaps, numbered smallest first", `WITH ${GAP_STEP} SELECT gap, ROW_NUMBER() OVER (ORDER BY gap) AS k, COUNT(*) OVER () AS n FROM g;`], ["The median", MED]],
      example: MED },
    tpl: [
      [1, () => ({ who: "rosa", ask: "The median days from first to second paid order.", fill: `WITH ${GAP_STEP}, k AS (SELECT gap, ROW_NUMBER() OVER (ORDER BY gap) AS k, COUNT(*) OVER () AS n FROM g) SELECT AVG(gap) FROM k WHERE ____;`, sql: MED })],
      [1, () => ({ who: "rosa", ask: "The share of buyers who never came back: exactly one paid order ÷ all buyers.", sql: `WITH n AS (${N_SQL}) SELECT SUM(CASE WHEN k = 1 THEN 1 ELSE 0 END) * 1.0 / COUNT(*) FROM n;` })],
      [2, () => ({ who: "dana", ask: "The average and the median days to a second order, side by side.", sql: `WITH ${GAP_STEP}, k AS (SELECT gap, ROW_NUMBER() OVER (ORDER BY gap) AS k, COUNT(*) OVER () AS n FROM g) SELECT (SELECT AVG(gap) FROM g), AVG(gap) FROM k WHERE k IN ((n + 1) / 2, (n + 2) / 2);` })],
      [2, (r) => { const col = pick(r, ["plan", "channel"]); return { who: "rosa", ask: `The median days to a second order, per ${col}. ${col[0].toUpperCase() + col.slice(1)} and the median.`, sql: `WITH ${GAP_STEP}, k AS (SELECT c.${col}, g.gap, ROW_NUMBER() OVER (PARTITION BY c.${col} ORDER BY g.gap) AS k, COUNT(*) OVER (PARTITION BY c.${col}) AS n FROM g JOIN customers c ON c.id = g.customer_id) SELECT ${col}, AVG(gap) FROM k WHERE k IN ((n + 1) / 2, (n + 2) / 2) GROUP BY ${col};` }; }],
      [2, (r) => { const col = pick(r, ["plan", "channel"]); return { who: "dana", ask: `The share of buyers who never came back (exactly one paid order), per ${col}. ${col[0].toUpperCase() + col.slice(1)} and the share.`, sql: `WITH n AS (${N_SQL}) SELECT c.${col}, SUM(CASE WHEN n.k = 1 THEN 1 ELSE 0 END) * 1.0 / COUNT(*) FROM n JOIN customers c ON c.id = n.customer_id GROUP BY c.${col};` }; }],
      [4, () => ({ who: "rosa", ask: "The median days from first to second paid order.", sql: MED,
        bad: `WITH ${GAP_STEP} SELECT AVG(gap) FROM g;`, trap: "That's the average. The quick 0-to-5-day reorders pull it down. The median is the middle gap." })],
      [4, () => ({ who: "dana", ask: "The median days from first to second paid order.", sql: MED,
        bad: `WITH ${GAP_STEP.replace("WHERE n = 2", "WHERE n >= 2")}, k AS (SELECT gap, ROW_NUMBER() OVER (ORDER BY gap) AS k, COUNT(*) OVER () AS n FROM g) SELECT AVG(gap) FROM k WHERE k IN ((n + 1) / 2, (n + 2) / 2);`, trap: "<code>n &gt;= 2</code> keeps every later gap too: second to third, third to fourth. Regulars with many orders crowd the middle. First to second is n = 2." })],
    ] },
  { id: "m4money", kind: "metric", metric: 4, step: 4, owner: "rosa", group: M4, name: "Find the money: the refill email", word: "a chain: median, who's past it, what a return is worth", rule: { practice: 0, climb: 1, pass: [2, 2] },
    lesson: { owner: "The refill email goes out on the median day. Everyone with one order who's already past that day is a second order we haven't asked for.",
      frank: "Find the day. Find who's past it. Put a price on them.",
      lines: ["Step 1: the median days to a second order.", "Step 2: one-order buyers whose order was more than that many days before Nov 15 (today in this data). Type your step 1 number.",
        "Step 3: what a second order is worth: the average paid amount of order 2. Step 4: count × that."],
      example: MED },
    tpl: [1, 2].map((tier) => [tier, (r) => {
      // each run gives the refill email a different grace period after the median day
      const G = pick(r, [0, 7, 14]), past = [...PAID.values()].filter((os) => os.length === 1 && jd(TODAY) - jd(os[0][3]) > MEDIAN + G).length, worth = [...PAID.values()].filter((os) => os.length > 1).map((os) => os[1][2]);
      const avg = worth.reduce((a, b) => a + b, 0) / worth.length, grace = G ? ` plus ${G} days of grace` : "";
      return { who: "rosa", ask: `What are the overdue second orders worth? The refill email waits for the median day${grace}. Four steps.`, sql: `SELECT ${past} * ${r2(avg)};`,
        steps: [
          { ask: "The median days from first to second paid order.", sql: MED, hint: "Number the gaps, count them, average the middle one or two." },
          { ask: `How many buyers have exactly one paid order, placed more than the median${grace} before Nov 15? Type the days in.`, sql: `WITH n AS (SELECT customer_id, COUNT(*) AS k, MAX(day) AS last FROM orders WHERE status = 'paid' GROUP BY customer_id) SELECT COUNT(*) FROM n WHERE k = 1 AND julianday('${TODAY}') - julianday(last) > ${MEDIAN + G};`, carry: true, hint: "One row per buyer with k and their last day. Two tests outside: k = 1, and the days since over your number." },
          { ask: "What's a second order worth? The average paid amount of buyers' order 2.", sql: `WITH r AS (${R2}) SELECT AVG(amount) FROM r WHERE n = 2;`, hint: "Number the orders, keep n = 2, average the amount." },
          { ask: "The money: the count × that average. Do the sum in SQL.", sql: `SELECT ${past} * ${r2(avg)};`, tol: 0.01, carry: true, hint: "SELECT count * average;" },
        ] };
    }]) },
  { id: "m5since", kind: "metric", metric: 5, step: 1, owner: "theo", group: M5, name: "Days since the last order", word: "julianday(today) − julianday(MAX(day))",
    lesson: { owner: "Before I send a winback, I sort everyone by how long it's been. Recency is the first column on every list I build.",
      frank: "When did you last see them? Everything starts with that question.",
      lines: [`In this data, today is Nov 15, 2026, the last day of the export. <code>julianday('${TODAY}') - julianday(MAX(day))</code> is the days since a buyer's last paid order.`,
        "One row per buyer: GROUP BY customer_id. MAX(day) is the latest; MIN(day) would be the first.", "Join customers when the list needs names."],
      build: [["Each buyer's last paid order", "SELECT customer_id, MAX(day) FROM orders WHERE status = 'paid' GROUP BY customer_id;"], ["Days since", SINCE]],
      example: SINCE },
    tpl: [
      [1, () => ({ who: "theo", ask: "Days since each buyer's last paid order. customer_id and days.", fill: `SELECT customer_id, julianday('${TODAY}') - ____ FROM orders WHERE status = 'paid' GROUP BY customer_id;`, sql: SINCE })],
      [1, () => ({ who: "theo", ask: "Days since each buyer's last paid order, with names, longest first. Name and days.", sql: `SELECT c.name, julianday('${TODAY}') - julianday(MAX(o.day)) AS days FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.status = 'paid' GROUP BY c.id, c.name ORDER BY days DESC;`, ordered: 1 })],
      [2, (r) => { const n = pick(r, [30, 45, 60]); return { who: "theo", ask: `Buyers we haven't seen in more than ${n} days. customer_id and days.`, sql: `SELECT customer_id, julianday('${TODAY}') - julianday(MAX(day)) FROM orders WHERE status = 'paid' GROUP BY customer_id HAVING julianday('${TODAY}') - julianday(MAX(day)) > ${n};` }; }],
      [2, (r) => { const col = pick(r, ["plan", "channel"]); return { who: "dana", ask: `Average days since the last paid order, per ${col}. ${col[0].toUpperCase() + col.slice(1)} and the average.`, sql: `WITH s AS (${SINCE.slice(0, -1)}) SELECT c.${col}, AVG(s.days) FROM s JOIN customers c ON c.id = s.customer_id GROUP BY c.${col};` }; }],
      [4, () => ({ who: "theo", ask: "Days since each buyer's last paid order. customer_id and days.", sql: SINCE,
        bad: `SELECT customer_id, julianday('${TODAY}') - julianday(MIN(day)) FROM orders WHERE status = 'paid' GROUP BY customer_id;`, trap: "MIN(day) is their first order, so that's how long they've been a customer. The last order is MAX(day)." })],
      [4, () => ({ who: "dana", ask: "Days since each buyer's last paid order. customer_id and days.", sql: SINCE,
        bad: `SELECT customer_id, julianday('${TODAY}') - julianday(MAX(day)) FROM orders GROUP BY customer_id;`, trap: "Without the status test, a refunded order counts as their last visit." })],
    ] },
  { id: "m5status", kind: "metric", metric: 5, step: 2, owner: "theo", group: M5, name: "Active, at risk, lapsed", word: "past twice their own usual gap",
    lesson: { owner: "Some people buy every two weeks, some every two months. Lapsed has to mean late for them, not late for everybody.",
      frank: "Every suspect has a routine. You notice when they break it.",
      lines: ["A buyer's usual gap: (last − first) ÷ (orders − 1). At least 14 days, so two orders on one day don't make a 0-day habit: <code>MAX(x, 14)</code> with two values picks the bigger. One order only: 30 days.",
        "Then a CASE: past twice their gap is <b>lapsed</b>, past their gap is <b>at risk</b>, else <b>active</b>. Narrowest first, as always.",
        `All of it per buyer in one WITH step, s, with spent, k, days and gap.`],
      build: [["One row per buyer: days since and usual gap", `WITH ${S_STEP} SELECT customer_id, days, gap FROM s;`], ["Each buyer's status", STATUS]],
      example: STATUS },
    tpl: [
      [1, () => ({ who: "theo", intro: "max2", ask: "Each repeat buyer's usual gap: (last − first) ÷ (paid orders − 1) days, but at least 14. customer_id and the gap.", sql: "SELECT customer_id, MAX((julianday(MAX(day)) - julianday(MIN(day))) / (COUNT(*) - 1), 14) AS gap FROM orders WHERE status = 'paid' GROUP BY customer_id HAVING COUNT(*) > 1;",
        base: "SELECT customer_id, (julianday(MAX(day)) - julianday(MIN(day))) / (COUNT(*) - 1) AS gap FROM orders WHERE status = 'paid' GROUP BY customer_id HAVING COUNT(*) > 1;", hint: "MAX with two values picks the bigger of the two, on each row: MAX(x, 14). MAX with one value is the pile's biggest.",
        marks: [["but at least 14", "agg"]] })],
      [1, () => ({ who: "theo", ask: "Each buyer's status: 'lapsed', 'at risk' or 'active'. customer_id and status.", fill: `WITH ${S_STEP} SELECT customer_id, ____ AS status FROM s;`, sql: STATUS })],
      [1, () => ({ who: "theo", ask: "How many buyers are in each status? Status and the count.", sql: `WITH ${S_STEP} SELECT ${STATUS_CASE} AS status, COUNT(*) FROM s GROUP BY status;` })],
      [2, () => ({ who: "theo", ask: "The lapsed buyers with names, most days since first. Name and days.", sql: `WITH ${S_STEP} SELECT c.name, s.days FROM s JOIN customers c ON c.id = s.customer_id WHERE s.days > 2 * s.gap ORDER BY s.days DESC;`, ordered: 1 })],
      [2, (r) => { const [plan, who] = pick(r, [["subscriber", "Subscribers"], ["one-time", "One-time buyers"]]); return { who: "rosa", ask: `${who} who are at risk (past their gap, not yet twice it). Name and days.`, sql: `WITH ${S_STEP} SELECT c.name, s.days FROM s JOIN customers c ON c.id = s.customer_id WHERE c.plan = '${plan}' AND s.days > s.gap AND s.days <= 2 * s.gap;` }; }],
      [4, () => ({ who: "theo", ask: "Each buyer's status: 'lapsed', 'at risk' or 'active'. customer_id and status.", sql: STATUS,
        bad: `WITH ${S_STEP} SELECT customer_id, CASE WHEN days > gap THEN 'at risk' WHEN days > 2 * gap THEN 'lapsed' ELSE 'active' END AS status FROM s;`, trap: "Everyone past twice their gap is also past their gap, so they stop at 'at risk' and nobody is ever lapsed. Narrowest test first." })],
      [4, () => ({ who: "dana", ask: "Each buyer's status: 'lapsed', 'at risk' or 'active'. customer_id and status.", sql: STATUS,
        bad: `WITH s AS (SELECT customer_id, julianday('${TODAY}') - julianday(MAX(day)) AS days, (julianday(MAX(day)) - julianday(MIN(day))) / (COUNT(*) - 1) AS gap FROM orders WHERE status = 'paid' GROUP BY customer_id) SELECT customer_id, ${STATUS_CASE} AS status FROM s;`, trap: "One-order buyers divide by 0 and get a NULL gap, so every test is unknown and they all land in 'active'. And same-day reorders make a 0-day gap. That's what the 30 and the 14 are for." })],
    ] },
  { id: "m5winback", kind: "metric", metric: 5, step: 3, owner: "theo", group: M5, name: "Winback rate", word: "came back within 30 days ÷ got the winback",
    lesson: { owner: "The winback flow goes to people who've gone quiet. Did it bring any of them back? Within 30 days of the first email, or it doesn't count.",
      frank: "You knocked on their door. Did anyone answer?",
      lines: ["Who got it: <code>WITH got AS (SELECT customer_id, MIN(day) AS d FROM sends WHERE flow = 'winback' AND delivered = 1 GROUP BY customer_id)</code>.",
        "Who came back: LEFT JOIN paid orders placed between d and <code>date(d, '+30 days')</code>, all in ON.",
        "Rate: <code>COUNT(DISTINCT o.customer_id) * 1.0 / COUNT(DISTINCT g.customer_id)</code>. COUNT(DISTINCT o.customer_id) skips the NULLs, the ones who didn't come back."],
      build: [["Who got the winback", `WITH ${GOT} SELECT * FROM got;`], ["Winback rate", WB]],
      example: WB },
    tpl: [
      [1, () => ({ who: "theo", ask: "The winback rate: share of winback recipients with a paid order within 30 days.", fill: `WITH ${GOT} SELECT COUNT(DISTINCT o.customer_id) * 1.0 / COUNT(DISTINCT g.customer_id) FROM got g LEFT JOIN orders o ON o.customer_id = g.customer_id AND o.status = 'paid' AND ____;`, sql: WB })],
      [1, () => ({ who: "theo", ask: "The winback rate: share of winback recipients with a paid order within 30 days.", sql: WB })],
      [2, (r) => { const w = pick(r, [30, 45]); return { who: "theo", ask: `Who came back after the winback? Name and the day of each paid order within ${w} days of their first winback email.`, sql: `WITH ${GOT} SELECT c.name, o.day FROM got g JOIN orders o ON o.customer_id = g.customer_id AND o.status = 'paid' AND o.day BETWEEN g.d AND date(g.d, '+${w} days') JOIN customers c ON c.id = g.customer_id;` }; }],
      [2, (r) => { const w = pick(r, [30, 45]); return { who: "hank", ask: `Paid revenue from orders placed within ${w} days of a customer's first winback email.`, sql: `WITH ${GOT} SELECT SUM(o.amount) FROM got g JOIN orders o ON o.customer_id = g.customer_id AND o.status = 'paid' AND o.day BETWEEN g.d AND date(g.d, '+${w} days');` }; }],
      [4, () => ({ who: "theo", ask: "The winback rate: share of winback recipients with a paid order within 30 days.", sql: WB,
        bad: `WITH ${GOT} SELECT COUNT(DISTINCT o.customer_id) * 1.0 / COUNT(DISTINCT g.customer_id) FROM got g JOIN orders o ON o.customer_id = g.customer_id AND o.status = 'paid' AND o.day BETWEEN g.d AND date(g.d, '+30 days');`, trap: "A plain JOIN keeps only the people who came back, so the bottom is the same people as the top: 100%." })],
      [4, () => ({ who: "dana", ask: "The winback rate: share of winback recipients with a paid order within 30 days.", sql: WB,
        bad: `WITH ${GOT} SELECT COUNT(DISTINCT o.customer_id) * 1.0 / (SELECT COUNT(*) FROM sends WHERE flow = 'winback' AND delivered = 1) FROM got g LEFT JOIN orders o ON o.customer_id = g.customer_id AND o.status = 'paid' AND o.day BETWEEN g.d AND date(g.d, '+30 days');`, trap: "The bottom counts winback emails, and most people got two. The rate is per person: COUNT(DISTINCT g.customer_id)." })],
    ] },
  { id: "m5money", kind: "metric", metric: 5, step: 4, owner: "theo", group: M5, name: "Find the money: the lapsed list", word: "a chain: who, worth, rate", rule: { practice: 0, climb: 1, pass: [2, 2] },
    lesson: { owner: "Give me the lapsed list, sorted by what they used to spend. Then tell me what a winback to all of them is worth.",
      frank: "The ones who left. Some of them left money on the table.",
      lines: ["Step 1: the lapsed buyers and what they spent, biggest first.", "Step 2: how many lapsed buyers, and their average paid order.",
        "Step 3: the winback rate. Step 4: lapsed × rate × average order."],
      example: STATUS },
    tpl: [1, 2].map((tier) => [tier, (r) => {
      // each run counts a return inside a different window: 21, 30 or 45 days
      const W = pick(r, [21, 30, 45]), rate = +wbRate(W).toFixed(4), n = LAPSED.length, avg = LAPSED.reduce((a, x) => a + x.spent, 0) / LAPSED.reduce((a, x) => a + x.n, 0);
      return { who: "theo", ask: `What's a winback to the lapsed list worth, counting returns within ${W} days? Four steps.`, sql: `SELECT ${n} * ${rate} * ${r2(avg)};`,
        steps: [
          { ask: "The lapsed buyers and what they've spent (paid), biggest spender first. customer_id and spent.", sql: `WITH ${S_STEP} SELECT customer_id, spent FROM s WHERE days > 2 * gap ORDER BY spent DESC;`, ordered: 1, hint: "The status step, s, has spent. Keep days > 2 * gap." },
          { ask: "How many lapsed buyers are there, and what's their average paid order? (Their spend ÷ their orders.)", sql: `WITH ${S_STEP} SELECT COUNT(*), SUM(spent) * 1.0 / SUM(k) FROM s WHERE days > 2 * gap;`, hint: "Average order: SUM(spent) * 1.0 / SUM(k)." },
          { ask: `The winback rate: people who got a winback email and placed a paid order within ${W} days of the first one.`, sql: WBq(W), hint: `The winback step from Metric 5, with '+${W} days'.` },
          { ask: "The money: lapsed buyers × the winback rate × their average order. Do the sum in SQL.", sql: `SELECT ${n} * ${rate} * ${r2(avg)};`, tol: 0.05, carry: true, hint: "SELECT count * rate * average;" },
        ] };
    }]) },
];

// ---------- Metrics 6 and 7, and Case D: cohorts and what a customer costs, subscriptions and MRR ----------
const F_STEP = "f AS (SELECT customer_id, MIN(day) AS d FROM orders WHERE status = 'paid' GROUP BY customer_id)";
const A_STEP = "a AS (SELECT DISTINCT f.customer_id, strftime('%Y-%m', f.d) AS cohort, strftime('%m', o.day) - strftime('%m', f.d) AS m FROM f JOIN orders o ON o.customer_id = f.customer_id AND o.status = 'paid')";
const COH_SIZE = `WITH ${F_STEP} SELECT strftime('%Y-%m', d) AS cohort, COUNT(*) FROM f GROUP BY cohort;`;
const COH_GRID = `WITH ${F_STEP}, ${A_STEP} SELECT cohort, m, COUNT(*) FROM a GROUP BY cohort, m;`;
const M1SHARE = "SUM(CASE WHEN m = 1 THEN 1 ELSE 0 END) * 1.0 / SUM(CASE WHEN m = 0 THEN 1 ELSE 0 END)";
const RET1 = `WITH ${F_STEP}, ${A_STEP} SELECT cohort, CASE WHEN cohort >= '2026-10' THEN 'not yet' ELSE ${M1SHARE} END FROM a GROUP BY cohort;`;
const MARGIN_STEP = "x AS (SELECT o.customer_id, SUM(i.qty * (i.price - p.unit_cost)) AS margin FROM orders o JOIN order_items i ON i.order_id = o.id JOIN products p ON p.id = i.product_id WHERE o.status = 'paid' GROUP BY o.customer_id)";
const LTV = `WITH ${F_STEP}, ${MARGIN_STEP} SELECT strftime('%Y-%m', f.d) AS cohort, AVG(x.margin) FROM f JOIN x ON x.customer_id = f.customer_id GROUP BY cohort;`;
const S_SPEND = "s AS (SELECT channel, SUM(spend) AS spend FROM ad_spend GROUP BY channel)", N_NEW = "n AS (SELECT channel, COUNT(*) AS new FROM customers WHERE joined >= '2026-08-01' GROUP BY channel)";
const CAC = `WITH ${S_SPEND}, ${N_NEW} SELECT s.channel, s.spend * 1.0 / n.new AS cac FROM s JOIN n ON n.channel = s.channel;`;
// CAC per paid channel from a start date (spend from that day, customers who joined from it)
const SPEND_FROM = (d) => d > "2026-08-03" ? ` WHERE day >= '${d}'` : "";
const CACd = (d) => `WITH s AS (SELECT channel, SUM(spend) AS spend FROM ad_spend${SPEND_FROM(d)} GROUP BY channel), n AS (SELECT channel, COUNT(*) AS new FROM customers WHERE joined >= '${d}' GROUP BY channel) SELECT s.channel, s.spend * 1.0 / n.new AS cac FROM s JOIN n ON n.channel = s.channel;`;
const ACTIVE = (d, a = "") => `${a}started <= '${d}' AND (${a}cancelled IS NULL OR ${a}cancelled >= '${d}')`;
const SUBMONTH = [["September", "2026-09-01", "2026-09-30"], ["October", "2026-10-01", "2026-10-31"]];
const CHURN = (m) => `SELECT SUM(CASE WHEN cancelled BETWEEN '${m[1]}' AND '${m[2]}' AND cancel_reason != 'downgraded' THEN 1 ELSE 0 END) * 1.0 / COUNT(*) FROM subscriptions WHERE ${ACTIVE(m[1])};`;
const MONTHS = "months(m) AS (SELECT '2026-08-01' UNION ALL SELECT date(m, '+1 month') FROM months WHERE m < '2026-11-01')";
const MRR = `WITH RECURSIVE ${MONTHS} SELECT months.m, COALESCE(SUM(s.monthly_value), 0) FROM months LEFT JOIN subscriptions s ON s.started <= months.m AND (s.cancelled IS NULL OR s.cancelled > months.m) GROUP BY months.m;`;
const DOWN = "SELECT SUM(a.monthly_value - b.monthly_value) FROM subscriptions a JOIN subscriptions b ON b.customer_id = a.customer_id AND b.started = a.cancelled;";
const FAILED = "SELECT SUM(monthly_value) FROM subscriptions WHERE cancel_reason = 'payment failed';";
const DOWNd = (d) => `SELECT SUM(a.monthly_value - b.monthly_value) FROM subscriptions a JOIN subscriptions b ON b.customer_id = a.customer_id AND b.started = a.cancelled${d ? ` WHERE a.cancelled >= '${d}'` : ""};`;
const FAILEDd = (d) => `SELECT SUM(monthly_value) FROM subscriptions WHERE cancel_reason = 'payment failed'${d ? ` AND cancelled >= '${d}'` : ""};`;
const lostJS = (d) => { const S = SHOP.subscriptions.filter((a) => !d || (a[6] && a[6] >= d));
  return { down: S.filter((a) => a[7] === "downgraded").reduce((s, a) => s + a[4] - (SHOP.subscriptions.find((b) => b[1] === a[1] && b[5] === a[6]) || [0, 0, 0, 0, a[4]])[4], 0), failed: S.filter((a) => a[7] === "payment failed").reduce((s, a) => s + a[4], 0) }; };
const M6 = "Metric 6 · Cohorts, LTV and CAC", M7 = "Metric 7 · Churn and MRR";
const METRIC67 = [
  { id: "m6cohort", kind: "metric", metric: 6, step: 1, owner: "dana", group: M6, name: "Cohorts", word: "first-order month, then month 1, 2, 3",
    lesson: { owner: "Did the people we won in August stick around better than September's? A cohort table answers that, one row per starting month.",
      frank: "Group them by the month they first walked in. Then watch who keeps coming back.",
      lines: ["A cohort is everyone whose first paid order fell in the same month: <code>strftime('%Y-%m', f.d)</code> with f the first-order step.",
        "For every later paid order, its month number since the first: <code>strftime('%m', o.day) - strftime('%m', f.d)</code>. 0 is the first month, 1 the next. Text minus text works for '10' − '08' because they're plain numbers. It only works inside one year, and all of this data is 2026.",
        "Share still buying in month 1 = buyers with an order at m = 1 ÷ the cohort's size (m = 0). The data ends Nov 15, so a month that lands in November isn't over: October's month 1 and November's both read 'not yet', never 0%."],
      build: [["Cohort sizes", COH_SIZE], ["Buyers per cohort per month", COH_GRID], ["Month-1 share", RET1]],
      example: RET1 },
    tpl: [
      [1, () => ({ who: "dana", ask: "How many buyers in each cohort (month of their first paid order)? Cohort and the count.", fill: `WITH ${F_STEP} SELECT ____ AS cohort, COUNT(*) FROM f GROUP BY cohort;`, sql: COH_SIZE })],
      [1, () => ({ who: "dana", ask: "Buyers per cohort per month since their first order. Cohort, month number and buyers.", fill: `WITH ${F_STEP}, a AS (SELECT DISTINCT f.customer_id, strftime('%Y-%m', f.d) AS cohort, ____ AS m FROM f JOIN orders o ON o.customer_id = f.customer_id AND o.status = 'paid') SELECT cohort, m, COUNT(*) FROM a GROUP BY cohort, m;`, sql: COH_GRID })],
      [2, () => ({ who: "dana", ask: "Each cohort's share still buying in month 1, with 'not yet' where month 1 isn't over (October and November). Cohort and share.", sql: RET1 })],
      [2, () => ({ who: "hank", ask: "Each cohort's share still buying in month 2. September, October and November read 'not yet'. Cohort and share.", sql: `WITH ${F_STEP}, ${A_STEP} SELECT cohort, CASE WHEN cohort >= '2026-09' THEN 'not yet' ELSE SUM(CASE WHEN m = 2 THEN 1 ELSE 0 END) * 1.0 / SUM(CASE WHEN m = 0 THEN 1 ELSE 0 END) END FROM a GROUP BY cohort;` })],
      [2, (r) => { const col = pick(r, ["plan", "channel"]); return { who: "rosa", ask: `Cohort sizes per ${col}: cohort, ${col} and buyers.`, sql: `WITH ${F_STEP} SELECT strftime('%Y-%m', f.d) AS cohort, c.${col}, COUNT(*) FROM f JOIN customers c ON c.id = f.customer_id GROUP BY cohort, c.${col};` }; }],
      [4, () => ({ who: "dana", ask: "Each cohort's share still buying in month 1, with 'not yet' where month 1 isn't over (October and November). Cohort and share.", sql: RET1,
        bad: `WITH ${F_STEP}, ${A_STEP} SELECT cohort, ${M1SHARE} FROM a GROUP BY cohort;`, trap: "October and November get a number, but their month 1 isn't over (the data ends Nov 15). November even shows 0, as if every one of them left. Say 'not yet'." })],
      [4, () => ({ who: "hank", ask: "Each cohort's share still buying in month 1, with 'not yet' where month 1 isn't over (October and November). Cohort and share.", sql: RET1,
        bad: `WITH ${F_STEP}, ${A_STEP} SELECT cohort, CASE WHEN cohort >= '2026-10' THEN 'not yet' ELSE SUM(CASE WHEN m = 1 THEN 1 ELSE 0 END) * 1.0 / COUNT(*) END FROM a GROUP BY cohort;`, trap: "a has one row per buyer per month they bought in, so COUNT(*) counts buyer-months, not buyers. The cohort's size is its m = 0 rows." })],
    ] },
  { id: "m6ltv", kind: "metric", metric: 6, step: 2, owner: "hank", group: M6, name: "Lifetime value", word: "margin per buyer, per cohort",
    lesson: { owner: "Revenue isn't what a customer is worth. What's left after the coffee costs is. That's lifetime value, the number I'd pay to win one.",
      frank: "Follow the money all the way down. Price minus cost. That's the part that stays in the till.",
      lines: ["Margin on a line: <code>i.qty * (i.price - p.unit_cost)</code>, unit_cost from products. Add it up per buyer in a step, x (before discount codes).",
        "Lifetime value of a cohort: the average of x.margin over its buyers. Join the first-order step f to x.",
        "Per buyer first, then the average. An average over order lines gives a line's margin, not a customer's."],
      build: [["Margin per buyer", `WITH ${MARGIN_STEP} SELECT * FROM x;`], ["Lifetime value per cohort", LTV]],
      example: LTV },
    tpl: [
      [1, () => ({ who: "hank", ask: "Margin per buyer, per cohort: the average margin of each cohort's buyers. Cohort and LTV.", fill: `WITH ${F_STEP}, x AS (SELECT o.customer_id, SUM(____) AS margin FROM orders o JOIN order_items i ON i.order_id = o.id JOIN products p ON p.id = i.product_id WHERE o.status = 'paid' GROUP BY o.customer_id) SELECT strftime('%Y-%m', f.d) AS cohort, AVG(x.margin) FROM f JOIN x ON x.customer_id = f.customer_id GROUP BY cohort;`, sql: LTV })],
      [1, () => ({ who: "hank", ask: "Margin per buyer, per cohort. Cohort and LTV.", sql: LTV })],
      [2, () => ({ who: "dana", ask: "Lifetime value (margin per buyer) per channel. Channel and LTV.", sql: `WITH ${MARGIN_STEP} SELECT c.channel, AVG(x.margin) FROM x JOIN customers c ON c.id = x.customer_id GROUP BY c.channel;` })],
      [2, (r) => { const [plan, who] = pick(r, [["subscriber", "subscribers"], ["one-time", "one-time buyers"]]); return { who: "hank", ask: `Lifetime value (margin per buyer) per cohort, ${who} only. Cohort and LTV.`, sql: `WITH ${F_STEP}, ${MARGIN_STEP} SELECT strftime('%Y-%m', f.d) AS cohort, AVG(x.margin) FROM f JOIN x ON x.customer_id = f.customer_id JOIN customers c ON c.id = f.customer_id WHERE c.plan = '${plan}' GROUP BY cohort;` }; }],
      [2, () => ({ who: "hank", ask: "Revenue per buyer per cohort (paid amount, not margin), to compare. Cohort and revenue per buyer.", sql: `WITH ${F_STEP}, r AS (SELECT customer_id, SUM(amount) AS revenue FROM orders WHERE status = 'paid' GROUP BY customer_id) SELECT strftime('%Y-%m', f.d) AS cohort, AVG(r.revenue) FROM f JOIN r ON r.customer_id = f.customer_id GROUP BY cohort;` })],
      [4, () => ({ who: "hank", ask: "Margin per buyer, per cohort. Cohort and LTV.", sql: LTV,
        bad: `WITH ${F_STEP} SELECT strftime('%Y-%m', f.d) AS cohort, AVG(i.qty * (i.price - p.unit_cost)) FROM f JOIN orders o ON o.customer_id = f.customer_id AND o.status = 'paid' JOIN order_items i ON i.order_id = o.id JOIN products p ON p.id = i.product_id GROUP BY cohort;`, trap: "That averages order lines, so it's what one line earns. Add up each buyer's margin first (the x step), then average the buyers." })],
      [4, () => ({ who: "dana", ask: "Lifetime value (margin per buyer) per channel. Channel and LTV.", sql: `WITH ${MARGIN_STEP} SELECT c.channel, AVG(x.margin) FROM x JOIN customers c ON c.id = x.customer_id GROUP BY c.channel;`,
        bad: `WITH ${MARGIN_STEP} SELECT c.channel, AVG(x.margin) FROM x JOIN customers c ON c.id = x.customer_id JOIN orders o ON o.customer_id = c.id GROUP BY c.channel;`, trap: "Joining orders again copies each buyer once per order, so big repeat buyers count several times in the average. x already has one row per buyer." })],
    ] },
  { id: "m6cac", kind: "metric", metric: 6, step: 3, owner: "hank", group: M6, name: "What a customer costs: CAC", word: "spend ÷ new customers",
    lesson: { owner: "We pay Instagram, Google and a podcast to bring people in. Referrals are free. What does each new customer cost us, and does it pay back?",
      frank: "Every new face has a price tag. Somebody paid it. Find out who, and how much.",
      lines: ["A new table, <code>ad_spend</code>: one row per channel per week. Customers carry their <code>channel</code>.",
        "<b>CAC</b> (cost to acquire a customer) = spend ÷ new customers from that channel (joined from Aug 1, when the ads started). Total each side in its own step, then join: joining weekly spend to customers row by row copies the spend.",
        "Set CAC next to the LTV from the step before: a channel whose customers cost more than they earn back is losing money on each one."],
      build: [["Spend per channel", "SELECT channel, SUM(spend) FROM ad_spend GROUP BY channel;"], ["New customers per channel", "SELECT channel, COUNT(*) FROM customers WHERE joined >= '2026-08-01' GROUP BY channel;"], ["CAC", CAC]],
      example: CAC },
    tpl: [
      [1, () => ({ who: "hank", ask: "CAC per paid channel: spend ÷ customers who joined from Aug 1. Channel and CAC.", fill: `WITH ${S_SPEND}, ${N_NEW} SELECT s.channel, ____ AS cac FROM s JOIN n ON n.channel = s.channel;`, sql: CAC })],
      [1, () => ({ who: "hank", ask: "CAC per paid channel: spend ÷ customers who joined from Aug 1. Channel and CAC.", sql: CAC })],
      [2, () => ({ who: "priya", ask: "Spend per channel per month. Channel, month and spend.", sql: "SELECT channel, strftime('%Y-%m', day) AS month, SUM(spend) FROM ad_spend GROUP BY channel, month;" })],
      [2, (r) => { const d = pick(r, ["2026-08-01", "2026-09-01"]); return { who: "hank", ask: `CAC per paid channel, counting from ${nice(d)}: spend from that day ÷ customers who joined from it. Channel and CAC.`, sql: CACd(d) }; }],
      [4, () => ({ who: "hank", ask: "CAC per paid channel: spend ÷ customers who joined from Aug 1. Channel and CAC.", sql: CAC,
        bad: "SELECT a.channel, SUM(a.spend) * 1.0 / COUNT(DISTINCT c.id) FROM ad_spend a JOIN customers c ON c.channel = a.channel WHERE c.joined >= '2026-08-01' GROUP BY a.channel;", trap: "Every weekly spend row joins every new customer of that channel, so SUM(a.spend) counts each week once per customer. Total each side in its own step first." })],
      [4, () => ({ who: "dana", ask: "CAC per paid channel: spend ÷ customers who joined from Aug 1. Channel and CAC.", sql: CAC,
        bad: `WITH ${S_SPEND}, n AS (SELECT channel, COUNT(*) AS new FROM customers GROUP BY channel) SELECT s.channel, s.spend * 1.0 / n.new AS cac FROM s JOIN n ON n.channel = s.channel;`, trap: "Customers from before Aug 1 came before the ads, so they weren't bought with this spend. Counting them makes every channel look cheaper." })],
    ] },
  { id: "m7churn", kind: "metric", metric: 7, step: 1, owner: "hank", group: M7, name: "Subscription churn", word: "lost this month ÷ active on the 1st",
    lesson: { owner: "Subscriptions are the business. If 9% of them stop every month, we need a lot of new ones just to stand still.",
      frank: "Count who walked out. Divide by who was in the room when the month started. Nobody else.",
      lines: ["A new table, <code>subscriptions</code>: one row per subscription, with started, and cancelled (empty while it runs).",
        "Active on Oct 1: <code>started &lt;= '2026-10-01' AND (cancelled IS NULL OR cancelled &gt;= '2026-10-01')</code>. Churn for October = the ones of those cancelled in October ÷ all of them. A sign-up in October is in neither number.",
        "A downgrade ends a row and starts a smaller one for the same person, so it isn't a lost subscriber: leave <code>cancel_reason = 'downgraded'</code> out of churn."],
      build: [["Active on Oct 1", `SELECT COUNT(*) FROM subscriptions WHERE ${ACTIVE("2026-10-01")};`], ["October churn", CHURN(SUBMONTH[1])]],
      example: CHURN(SUBMONTH[1]) },
    tpl: [
      [1, () => ({ who: "hank", intro: "selfjoin", ask: "Each downgrade: customer_id, the old monthly value and the new one. The new row is the same customer's, starting the day the old one was cancelled.", sql: "SELECT a.customer_id, a.monthly_value, b.monthly_value FROM subscriptions a JOIN subscriptions b ON b.customer_id = a.customer_id AND b.started = a.cancelled;",
        base: "SELECT customer_id, monthly_value, cancelled FROM subscriptions WHERE cancel_reason = 'downgraded';", hint: "A table can join itself. Give it two short names, a for the old row and b for the new one: subscriptions a JOIN subscriptions b ON b.customer_id = a.customer_id AND b.started = a.cancelled.",
        marks: [["the new one", "join"]] })],
      [1, (r) => { const m = pick(r, SUBMONTH); return { who: "hank", ask: `Churn for ${m[0]}: subscriptions cancelled that month (not downgrades) ÷ those active on the 1st.`, fill: `SELECT SUM(CASE WHEN cancelled BETWEEN '${m[1]}' AND '${m[2]}' AND cancel_reason != 'downgraded' THEN 1 ELSE 0 END) * 1.0 / COUNT(*) FROM subscriptions WHERE ____;`, sql: CHURN(m) }; }],
      [1, (r) => { const m = pick(r, SUBMONTH); return { who: "hank", ask: `How many subscriptions were active on ${nice(m[1])}?`, sql: `SELECT COUNT(*) FROM subscriptions WHERE ${ACTIVE(m[1])};` }; }],
      [2, (r) => { const m = pick(r, SUBMONTH); return { who: "hank", ask: `Churn for ${m[0]}: subscriptions cancelled that month (not downgrades) ÷ those active on the 1st.`, sql: CHURN(m) }; }],
      [2, () => ({ who: "dana", ask: "Cancellations per reason, downgrades included. Reason and the count.", sql: "SELECT cancel_reason, COUNT(*) FROM subscriptions WHERE cancelled IS NOT NULL GROUP BY cancel_reason;" })],
      [2, () => ({ who: "hank", ask: "Subscriptions per bag count, among the ones still running. Bags and the count.", sql: "SELECT bags, COUNT(*) FROM subscriptions WHERE cancelled IS NULL GROUP BY bags;" })],
      [4, () => ({ who: "hank", ask: "Churn for September: subscriptions cancelled that month (not downgrades) ÷ those active on Sep 1.", sql: CHURN(SUBMONTH[0]),
        bad: "SELECT SUM(CASE WHEN cancelled BETWEEN '2026-09-01' AND '2026-09-30' AND cancel_reason != 'downgraded' THEN 1 ELSE 0 END) * 1.0 / COUNT(*) FROM subscriptions;", trap: "The bottom counts every subscription ever, including ones that started after September or ended long before. Only the ones active on Sep 1 could churn in September." })],
      [4, () => ({ who: "dana", ask: "Churn for October: subscriptions cancelled that month (not downgrades) ÷ those active on Oct 1.", sql: CHURN(SUBMONTH[1]),
        bad: `SELECT SUM(CASE WHEN cancelled BETWEEN '2026-10-01' AND '2026-10-31' THEN 1 ELSE 0 END) * 1.0 / COUNT(*) FROM subscriptions WHERE ${ACTIVE("2026-10-01")};`, trap: "A downgrade cancels one row and starts a smaller one. The person is still subscribed, so it isn't churn. That's the next step's money." })],
    ] },
  { id: "m7mrr", kind: "metric", metric: 7, step: 2, owner: "hank", group: M7, name: "MRR, month by month", word: "WITH RECURSIVE months",
    lesson: { owner: "MRR, monthly recurring revenue, is what the subscriptions bring in every month. It's the first number an investor asks for.",
      frank: "A list of months that writes itself. Then you count what's alive on the first of each.",
      lines: ["MRR on the 1st of a month = the monthly_value of every subscription active that day.",
        "A month list: <code>WITH RECURSIVE months(m) AS (SELECT '2026-08-01' UNION ALL SELECT date(m, '+1 month') FROM months WHERE m &lt; '2026-11-01')</code>. It starts at Aug 1 and adds a month to itself until November. UNION ALL stacks the rows.",
        "Ends count with <code>cancelled &gt; m</code> here: a downgrade ends one row and starts the next on the same day, and that day only the new one is billed.",
        "LEFT JOIN the subscriptions active on each m (all in ON), and <code>COALESCE(SUM(s.monthly_value), 0)</code>, so a month with none still shows, as 0."],
      build: [["The month list", `WITH RECURSIVE ${MONTHS} SELECT m FROM months;`], ["MRR on each 1st", MRR]],
      example: MRR },
    tpl: [
      [1, () => ({ who: "hank", intro: "months", ask: "Every 1st of the month from Aug 1 to Nov 1, one row each. The day.", sql: `WITH RECURSIVE ${MONTHS} SELECT m FROM months;`,
        base: "SELECT '2026-08-01' AS m;", hint: "WITH RECURSIVE months(m) AS (the first row UNION ALL SELECT the next one FROM months WHERE m < the last). It reads its own rows and adds a month each time, until the WHERE stops it.",
        marks: [["Every 1st of the month", "cte"]] })],
      [1, () => ({ who: "hank", ask: "MRR on the 1st of each month, Aug to Nov. Month and MRR.", fill: `WITH RECURSIVE months(m) AS (SELECT '2026-08-01' UNION ALL SELECT ____ FROM months WHERE m < '2026-11-01') SELECT months.m, COALESCE(SUM(s.monthly_value), 0) FROM months LEFT JOIN subscriptions s ON s.started <= months.m AND (s.cancelled IS NULL OR s.cancelled > months.m) GROUP BY months.m;`, sql: MRR })],
      [1, () => ({ who: "hank", ask: "MRR on the 1st of each month, Aug to Nov. Month and MRR.", sql: MRR })],
      [2, () => ({ who: "dana", ask: "Active subscriptions on the 1st of each month, Aug to Nov. Month and the count.", sql: `WITH RECURSIVE ${MONTHS} SELECT months.m, COUNT(s.id) FROM months LEFT JOIN subscriptions s ON s.started <= months.m AND (s.cancelled IS NULL OR s.cancelled > months.m) GROUP BY months.m;` })],
      [2, (r) => { const [w, k, b] = pick(r, [["every_weeks", 2, "every-2-weeks subscriptions"], ["bags", 1, "one-bag subscriptions"], ["bags", 2, "two-bag subscriptions"]]); return { who: "hank", ask: `MRR from ${b} on the 1st of each month, Aug to Nov. Month and MRR.`, sql: `WITH RECURSIVE ${MONTHS} SELECT months.m, COALESCE(SUM(s.monthly_value), 0) FROM months LEFT JOIN subscriptions s ON s.started <= months.m AND (s.cancelled IS NULL OR s.cancelled > months.m) AND s.${w} = ${k} GROUP BY months.m;` }; }],
      [2, () => ({ who: "priya", ask: "MRR on each 1st, and how much it moved since the month before. Month, MRR and the change.", sql: `WITH RECURSIVE ${MONTHS}, t AS (SELECT months.m, COALESCE(SUM(s.monthly_value), 0) AS mrr FROM months LEFT JOIN subscriptions s ON s.started <= months.m AND (s.cancelled IS NULL OR s.cancelled > months.m) GROUP BY months.m) SELECT m, mrr, mrr - LAG(mrr) OVER (ORDER BY m) FROM t;` })],
      [4, () => ({ who: "hank", ask: "MRR on the 1st of each month, Aug to Nov. Month and MRR.", sql: MRR,
        bad: `WITH RECURSIVE ${MONTHS} SELECT months.m, COALESCE(SUM(s.monthly_value), 0) FROM months LEFT JOIN subscriptions s ON s.started <= months.m AND s.cancelled > months.m GROUP BY months.m;`, trap: "A running subscription has cancelled empty, and NULL > anything is unknown, so every live subscription drops out. Keep <code>cancelled IS NULL OR</code>." })],
      [4, () => ({ who: "dana", ask: "MRR on the 1st of each month, Aug to Nov. Month and MRR.", sql: MRR,
        bad: `WITH RECURSIVE ${MONTHS} SELECT months.m, COALESCE(SUM(s.monthly_value), 0) FROM months LEFT JOIN subscriptions s ON s.started <= months.m GROUP BY months.m;`, trap: "Without the cancelled test, every subscription that ever started still counts. MRR only grows, which is a nice story and a false one." })],
    ] },
  { id: "m7money", kind: "metric", metric: 7, step: 3, owner: "hank", group: M7, name: "Find the money: downgrades and failed payments", word: "a chain: what the subscriber count hides", rule: { practice: 0, climb: 1, pass: [2, 2] },
    lesson: { owner: "The subscriber count looks fine. But someone dropping from 2 bags to 1 is still 'a subscriber', and a failed card is a customer who never chose to leave. Both are money a retry or a nudge can save.",
      frank: "The headcount's a decoy. The money's in what each head is worth.",
      lines: ["Step 1: MRR lost to downgrades: each downgraded row's value minus the row that replaced it. Join subscriptions to itself: same customer, the new row started the day the old one was cancelled. Only a downgrade does that, so the join itself picks them out.",
        "Step 2: MRR lost to failed payments: the monthly_value of every 'payment failed' cancel.",
        "Step 3: a year of it: (step 1 + step 2) × 12."],
      example: DOWN },
    tpl: [1, 2].map((tier) => [tier, (r) => {
      // each run counts the losses from a different day
      const d = pick(r, [null, "2026-09-01", "2026-10-01"]), L = lostJS(d), when = d ? ` since ${nice(d)}` : "";
      return { who: "hank", ask: `What do downgrades and failed cards${when} cost us in a year? Three steps.`, sql: `SELECT (${L.down} + ${L.failed}) * 12;`,
        steps: [
          { ask: `MRR lost to downgrades${when}: each downgraded subscription's monthly_value minus the one that replaced it, added up.`, sql: DOWNd(d), hint: "subscriptions a JOIN subscriptions b ON b.customer_id = a.customer_id AND b.started = a.cancelled. Only a downgrade has a row that starts the day the old one ends." },
          { ask: `MRR lost to failed payments${when}: the monthly_value of every 'payment failed' cancel, added up.`, sql: FAILEDd(d) },
          { ask: "A year of both: (downgrades + failed payments) × 12. Do the sum in SQL.", sql: `SELECT (${L.down} + ${L.failed}) * 12;`, tol: 0.01, carry: true, hint: "SELECT ( a + b ) * 12;" },
        ] };
    }]) },
];
const caseD = { id: "caseD", kind: "case", group: "Case D · the quarterly review", gate: "Unit E", name: "Case D: the quarterly review", word: "a four-number memo, no help on the last run",
  lesson: { owner: "Quarterly review with the board on Friday. Four numbers, all of them right. You've done every one of these before. This time it's all at once.",
    frank: "The last case. Everything you've learned, one memo. No new tricks. Just the old ones, done clean.",
    lines: ["Repeat rate, the weakest cohort, the most expensive channel to buy customers from, and the subscription money that leaked.",
      "Run 1 is <b>guided</b>, run 2 <b>hinted</b>, run 3 <b>solo</b>. A clean solo run closes the case, and the track.",
      "Every query is one you've written in a metric step. The casebook has the shapes."],
    example: REPEAT },
  tpl: [1, 2, 3].map((tier) => [tier, (r) => {
    // each run changes the slice: whose repeat rate, which start day for the channels, which day the losses count from
    const plan = pick(r, [null, "subscriber", "one-time"]), d = pick(r, ["2026-08-01", "2026-09-01"]), since = pick(r, [null, "2026-09-01"]);
    const rep = plan ? `WITH n AS (SELECT o.customer_id, COUNT(*) AS k FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.status = 'paid' AND c.plan = '${plan}' GROUP BY o.customer_id) SELECT SUM(CASE WHEN k >= 2 THEN 1 ELSE 0 END) * 1.0 / COUNT(*) FROM n;` : REPEAT;
    const lost = `SELECT (${DOWNd(since).slice(0, -1)}) + (${FAILEDd(since).slice(0, -1)});`;
    return { who: "dana", ask: "The quarterly memo: four numbers for the board. Paid orders everywhere.", sql: lost,
      steps: [
        { ask: `The repeat rate${plan ? ` for ${plan} customers` : ""}: buyers with 2+ paid orders ÷ all buyers.`, sql: rep },
        { ask: "The weakest cohort by month-1 share, among cohorts whose month 1 is over (August and September). Cohort and share.", sql: `WITH ${F_STEP}, ${A_STEP} SELECT cohort, ${M1SHARE} AS share FROM a WHERE cohort IN ('2026-08', '2026-09') GROUP BY cohort ORDER BY share LIMIT 1;`, ordered: 1, hint: "The cohort query, two cohorts kept in WHERE, sorted by share, LIMIT 1." },
        { ask: `CAC per paid channel, counting from ${nice(d)} (spend and new customers), most expensive first. Channel and CAC.`, sql: CACd(d).replace(/;$/, " ORDER BY 2 DESC;"), ordered: 1, hint: "Two steps: spend per channel, new customers per channel. Join them and divide." },
        { ask: `MRR lost to downgrades and failed payments${since ? ` since ${nice(since)}` : ""}, in one number.`, sql: lost, hint: "Two subqueries added together: SELECT (SELECT …) + (SELECT …);" },
      ] };
  }]) };

// ---------- Bonus: event logs and the checkout funnel (the events table, Brent's q_rocket shape) ----------
const DAY_OF = "date(ts / 1000, 'unixepoch')";
const VSTEP = (dev) => `v AS (SELECT visitor_id, SUM(event = 'view') AS views, COUNT(DISTINCT ${DAY_OF}) AS days, MAX(event = 'cart') AS carted, MAX(event = 'checkout') AS checked, MAX(event = 'purchase') AS bought FROM events${dev ? ` WHERE device = '${dev}'` : ""} GROUP BY visitor_id)`;
const V_STEP = `v AS (SELECT visitor_id, SUM(event = 'view') AS views, COUNT(DISTINCT ${DAY_OF}) AS days, MAX(event = 'cart') AS carted, MAX(event = 'checkout') AS checked, MAX(event = 'purchase') AS bought FROM events GROUP BY visitor_id)`;
const PER_VISITOR = `WITH ${V_STEP} SELECT * FROM v;`;
const INTENT = `WITH ${V_STEP} SELECT CASE WHEN carted = 1 THEN 'reached the cart' ELSE 'never reached the cart' END AS segment, COUNT(*), AVG(bought) FROM v WHERE views >= 6 AND days >= 2 GROUP BY segment;`;
const FINISH = `SELECT device, ${DAY_OF} >= '2026-10-26' AS after, SUM(event = 'purchase') * 1.0 / SUM(event = 'checkout') FROM events GROUP BY device, after;`;
// the funnel case's numbers, read from the rows
const FUN = (() => {
  const day = (e) => new Date(e[3]).toISOString().slice(0, 10), m = SHOP.events.filter((e) => e[5] === "mobile");
  const rate = (es) => es.filter((e) => e[4] === "purchase").length / es.filter((e) => e[4] === "checkout").length;
  const before = m.filter((e) => day(e) < "2026-10-26"), after = m.filter((e) => day(e) >= "2026-10-26");
  const paid = SHOP.orders.filter((o) => o[4] === "paid");
  return { b: rate(before), a: rate(after), n: after.filter((e) => e[4] === "checkout").length, aov: paid.reduce((s, o) => s + o[2], 0) / paid.length };
})();
const BONUS = [
  { id: "events", n: 29, group: "Unit E · Pipelines", name: "Event logs", word: "date(ts / 1000, 'unixepoch') · SUM(event = 'view')",
    lesson: { frank: "Every click leaves a print. Thousands of them. You don't read them one by one. You roll them up per visitor, then you ask about the visitors.",
      lines: ["A new table, <code>events</code>: one row per thing a visitor did (view, cart, checkout, purchase). <code>ts</code> is the moment in milliseconds since 1970, the way trackers export it. <code>date(ts / 1000, 'unixepoch')</code> turns it into a day.",
        "In SQLite a test is a number: <code>event = 'view'</code> is 1 or 0. So <code>SUM(event = 'view')</code> counts views, and <code>MAX(event = 'cart')</code> is 1 if they ever reached the cart. (On Postgres or Snowflake you'd write <code>SUM(CASE WHEN event = 'view' THEN 1 ELSE 0 END)</code>.)",
        "Roll the log up per visitor in a WITH step, then ask about visitors. Careful: <code>COUNT(event = 'view')</code> counts the 0s too, because COUNT counts anything that isn't NULL."],
      build: [["Events per day", `SELECT ${DAY_OF} AS day, COUNT(*) FROM events GROUP BY day;`], ["One row per visitor", PER_VISITOR]],
      example: PER_VISITOR },
    tpl: [
      [1, () => ({ who: "priya", ask: "Views per visitor. visitor_id and views.", fill: "SELECT visitor_id, ____ FROM events GROUP BY visitor_id;", sql: "SELECT visitor_id, SUM(event = 'view') FROM events GROUP BY visitor_id;" })],
      [1, (r) => { const ev = pick(r, ["cart", "checkout", "purchase"]); return { who: "priya", ask: `${ev[0].toUpperCase() + ev.slice(1)} events per visitor, for visitors with at least one. visitor_id and the count.`, sql: `SELECT visitor_id, SUM(event = '${ev}') FROM events GROUP BY visitor_id HAVING SUM(event = '${ev}') > 0;` }; }],
      [1, () => ({ who: "theo", ask: "Events per day in the first week of November (Nov 1 to 7). Day and the count.", sql: `SELECT ${DAY_OF} AS day, COUNT(*) FROM events WHERE ${DAY_OF} BETWEEN '2026-11-01' AND '2026-11-07' GROUP BY day;` })],
      [2, () => ({ who: "priya", ask: "On how many different days did each visitor show up? visitor_id and days.", sql: `SELECT visitor_id, COUNT(DISTINCT ${DAY_OF}) FROM events GROUP BY visitor_id;` })],
      [2, () => ({ who: "rosa", ask: "Per device: events, and how many of them were purchases. Device, events and purchases.", sql: "SELECT device, COUNT(*), SUM(event = 'purchase') FROM events GROUP BY device;" })],
      [2, () => ({ who: "priya", ask: "Visitors who viewed 20 or more items. visitor_id and views.", sql: "SELECT visitor_id, SUM(event = 'view') FROM events GROUP BY visitor_id HAVING SUM(event = 'view') >= 20;" })],
      [3, () => ({ who: "priya", ask: "Of the visitors who reached checkout, what share bought?", sql: `WITH ${V_STEP} SELECT AVG(bought) FROM v WHERE checked = 1;`,
        base: `WITH ${V_STEP} SELECT AVG(bought) FROM v;`, hint: "bought is 1 or 0 per visitor, so its average is the share. Keep checked = 1 first.", marks: [["who reached checkout", "where"], ["what share bought", "cte"]] })],
      [3, () => ({ who: "priya", ask: "High-intent visitors (6+ views on 2+ days): how many reached the cart and how many never did, and the share of each who bought. Segment, visitors and share.", sql: INTENT,
        base: `WITH ${V_STEP} SELECT COUNT(*) FROM v WHERE views >= 6 AND days >= 2;`, hint: "A CASE on carted makes the segment. GROUP BY it, then COUNT(*) and AVG(bought).", marks: [["6+ views on 2+ days", "where"], ["reached the cart", "case"], ["share of each who bought", "group"]] })],
      [3, () => ({ who: "rosa", ask: "Visitors per number of active days, with the share who bought, most days first. Days, visitors and share.", sql: `WITH ${V_STEP} SELECT days, COUNT(*), AVG(bought) FROM v GROUP BY days ORDER BY days DESC;`, ordered: 1,
        base: `WITH ${V_STEP} SELECT days, COUNT(*), AVG(bought) FROM v GROUP BY days;`, hint: "The piles are built. Sort them.", marks: [["per number of active days", "group"], ["most days first", "order"]] })],
      [4, () => ({ who: "priya", ask: "Views per visitor. visitor_id and views.", sql: "SELECT visitor_id, SUM(event = 'view') FROM events GROUP BY visitor_id;",
        bad: "SELECT visitor_id, COUNT(event = 'view') FROM events GROUP BY visitor_id;", trap: "event = 'view' is 0 on every other row, and COUNT counts 0s: it counts all their events. SUM adds the 1s." })],
      [4, () => ({ who: "theo", ask: "Events per day in the first week of November (Nov 1 to 7). Day and the count.", sql: `SELECT ${DAY_OF} AS day, COUNT(*) FROM events WHERE ${DAY_OF} BETWEEN '2026-11-01' AND '2026-11-07' GROUP BY day;`,
        bad: "SELECT date(ts, 'unixepoch') AS day, COUNT(*) FROM events WHERE date(ts, 'unixepoch') BETWEEN '2026-11-01' AND '2026-11-07' GROUP BY day;", trap: "ts is in milliseconds. Read as seconds it lands thousands of years from now, so no day matches. Divide by 1000 first." })],
      [4, () => ({ who: "priya", ask: "What share of visitors ever bought?", sql: `WITH ${V_STEP} SELECT AVG(bought) FROM v;`,
        bad: "SELECT AVG(event = 'purchase') FROM events;", trap: "That's the share of events that were purchases. One visitor with 40 views counts 40 times. Roll up per visitor first." })],
    ] },
];
const caseF = { id: "caseF", kind: "case", group: "Bonus case · the checkout funnel", name: "Bonus case: the checkout funnel", word: "where the carts die, and what it costs", gate: "Unit F",
  lesson: { owner: "Phone orders feel thin since late October. Hank blames the coffee. I think it's the site. Find where people drop out, and tell me what it's costing.",
    frank: "Follow the footprints from the front door to the till. Somewhere they stop. That's your crime scene.",
    lines: ["A funnel: of the visitors who viewed, how many reached the cart, then checkout, then bought. Each step ÷ the one before.",
      "Run 1 is <b>guided</b>, run 2 <b>hinted</b>, run 3 <b>solo</b>.",
      "The last step uses numbers from the steps before it. Write them down."],
    example: FINISH },
  tpl: [1, 2, 3].map((tier) => [tier, (r) => {
    // each run looks at a different device's funnel first, and prices the loss with a different average order
    const dev = pick(r, [null, "mobile", "desktop"]), since = pick(r, [false, true]), on = dev ? ` on ${dev}` : "";
    const paid = SHOP.orders.filter((o) => o[4] === "paid" && (!since || o[3] >= "2026-10-26")), aov = paid.reduce((s, o) => s + o[2], 0) / paid.length;
    const money = `SELECT ${FUN.n} * (${+FUN.b.toFixed(4)} - ${+FUN.a.toFixed(4)}) * ${r2(aov)};`;
    return { who: "priya", ask: "Where do the carts die since late October, and what has it cost? Five steps.", sql: money,
      steps: [
        { ask: `The funnel${on}: visitors who viewed, reached the cart, reached checkout and bought. Four numbers.`, sql: `WITH ${VSTEP(dev)} SELECT COUNT(*), SUM(carted), SUM(checked), SUM(bought) FROM v;`, hint: "Roll up per visitor with MAX(event = '…') flags, then add the flags." },
        { ask: `Each step's rate${on}: cart ÷ viewed, checkout ÷ cart, bought ÷ checkout. Three numbers.`, sql: `WITH ${VSTEP(dev)} SELECT SUM(carted) * 1.0 / COUNT(*), SUM(checked) * 1.0 / SUM(carted), SUM(bought) * 1.0 / SUM(checked) FROM v;` },
        { ask: "Checkout attempts that finish, per device, before Oct 26 and from it. Here the grain changes on purpose: each checkout row is one attempt to pay, and one visitor can try twice, so count events. Device, after (1 or 0) and purchases ÷ checkouts.", sql: FINISH, hint: "SUM(event = 'purchase') * 1.0 / SUM(event = 'checkout'), piled by device and the date test." },
        { ask: `Mobile checkouts from Oct 26 on, and the average paid order${since ? " from Oct 26 on" : " (all paid orders)"}. Two numbers.`, sql: `SELECT (SELECT SUM(event = 'checkout') FROM events WHERE device = 'mobile' AND ${DAY_OF} >= '2026-10-26'), (SELECT AVG(amount) FROM orders WHERE status = 'paid'${since ? " AND day >= '2026-10-26'" : ""});`, hint: "Two tables, one row: SELECT (SELECT …), (SELECT …);" },
        { ask: "The money: mobile checkouts since Oct 26 × (mobile's rate before − its rate after) × that average order. Do the sum in SQL.", sql: money, tol: 0.05, carry: true, hint: "SELECT checkouts * (before − after) * average;" },
      ] };
  }]) };

// ---------- Unit E: pipelines (Brent, 2026-10-26: "most realistic things are multi-step", so this is a big unit) ----------
// Three small parts (share of total, a subquery that reads its row, shorthand), the event log, then four pipelines. A
// pipeline is one WITH query built stage by stage, each stage pinned to the board as it runs, with the help fading:
// one stage blank, every stage in turn, the whole query from the plan, then from the brief alone (the 2026-10-15
// brainstorm's L4 to L8). The four pipelines have the shapes of Brent's portfolio queries: q_rocket, q_hill, q_dunn.
const E = "Unit E · Pipelines";
const SHARE = (x) => `ROUND(100.0 * ${x} / SUM(${x}) OVER (), 1)`;
const PAIDQ = "(SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id AND o.status = 'paid')";
const USING2 = "WITH s AS (SELECT channel, SUM(spend) AS spend FROM ad_spend GROUP BY 1), n AS (SELECT channel, COUNT(*) AS new FROM customers WHERE joined >= '2026-08-01' GROUP BY 1) SELECT channel, spend, new FROM s JOIN n USING (channel) ORDER BY 1;";
const UNIT_E = [
  { id: "share", n: 26, group: E, name: "Share of the total", word: "SUM(COUNT(*)) OVER () · ROUND(100.0 * …, 1)",
    lesson: { frank: "A number alone tells you nothing. Forty of what? Show me the slice next to the whole pie.",
      lines: ["<code>SUM(COUNT(*)) OVER ()</code> adds up every pile's count: the whole. A window runs after GROUP BY, so it sees the piles, and the empty <code>OVER ()</code> means all of them.",
        "Share = the pile ÷ the whole: <code>100.0 * COUNT(*) / SUM(COUNT(*)) OVER ()</code>. The 100.0 matters: one whole number divided by another gives a whole number in SQLite, so 7 / 52 is 0.",
        "<code>ROUND(x, 1)</code> keeps one decimal, for people to read. Revenue works the same way: <code>SUM(SUM(amount)) OVER ()</code>."],
      example: `SELECT city, COUNT(*), ${SHARE("COUNT(*)")} AS pct FROM customers GROUP BY city;` },
    tpl: [
      [1, () => ({ who: "dana", ask: "Customers per plan, and each plan's percent of all customers to one decimal. Plan, customers and percent.", sql: `SELECT plan, COUNT(*), ${SHARE("COUNT(*)")} FROM customers GROUP BY plan;` })],
      [1, () => ({ who: "hank", ask: "Orders per status, and each status's percent of all orders to one decimal. Status, orders and percent.", sql: `SELECT status, COUNT(*), ${SHARE("COUNT(*)")} FROM orders GROUP BY status;` })],
      [1, () => ({ who: "theo", ask: "Customers per channel, and each channel's percent of all customers to one decimal. Channel, customers and percent.", sql: `SELECT channel, COUNT(*), ${SHARE("COUNT(*)")} FROM customers GROUP BY channel;` })],
      [2, () => ({ who: "hank", ask: "Each product's share of item revenue (qty × price), in percent to one decimal. Product name and percent.", sql: `SELECT p.name, ${SHARE("SUM(i.qty * i.price)")} FROM order_items i JOIN products p ON p.id = i.product_id GROUP BY p.name;` })],
      [2, () => ({ who: "rosa", ask: "Emails sent per flow, and each flow's percent of all sends to one decimal. Flow, sends and percent.", sql: `SELECT flow, COUNT(*), ${SHARE("COUNT(*)")} FROM sends GROUP BY flow;` })],
      [2, () => ({ who: "dana", ask: "Paid revenue per month, and each month's percent of it to one decimal. Month, revenue and percent.", sql: `SELECT strftime('%Y-%m', day) AS month, SUM(amount), ${SHARE("SUM(amount)")} FROM orders WHERE status = 'paid' GROUP BY month;` })],
      [3, () => ({ who: "dana", ask: "Paid revenue per city, its percent of the total to one decimal, biggest first. City, revenue and percent.", sql: `SELECT c.city, SUM(o.amount), ${SHARE("SUM(o.amount)")} FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.status = 'paid' GROUP BY c.city ORDER BY 2 DESC;`, ordered: 1,
        base: "SELECT c.city, SUM(o.amount) FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.status = 'paid' GROUP BY c.city;", hint: "The window goes in SELECT next to the SUM it divides. ORDER BY comes last.",
        marks: [["its percent of the total", "window"], ["biggest first", "order"]] })],
      [3, () => ({ who: "theo", ask: "Paying buyers per channel and each channel's percent of all buyers, to one decimal. Channel, buyers and percent.", sql: `SELECT c.channel, COUNT(DISTINCT o.customer_id), ${SHARE("COUNT(DISTINCT o.customer_id)")} FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.status = 'paid' GROUP BY c.channel;`,
        base: "SELECT c.channel, COUNT(DISTINCT o.customer_id) FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.status = 'paid' GROUP BY c.channel;", hint: "Wrap the same count in SUM( … ) OVER () for the whole.",
        marks: [["each channel's percent of all buyers", "window"]] })],
      [4, () => ({ who: "dana", ask: "Customers per city, and each city's percent of all customers to one decimal. City, customers and percent.", sql: `SELECT city, COUNT(*), ${SHARE("COUNT(*)")} FROM customers GROUP BY city;`,
        bad: "SELECT city, COUNT(*), 100 * COUNT(*) / SUM(COUNT(*)) OVER () FROM customers GROUP BY city;", trap: "Whole numbers divided give a whole number in SQLite, so 23.3% comes out 23. Make one side a decimal: 100.0." })],
      [4, () => ({ who: "rosa", ask: "Emails sent per flow, and each flow's percent of all sends to one decimal. Flow, sends and percent.", sql: `SELECT flow, COUNT(*), ${SHARE("COUNT(*)")} FROM sends GROUP BY flow;`,
        bad: "SELECT flow, COUNT(*), ROUND(100.0 * COUNT(*) / COUNT(*) OVER (), 1) FROM sends GROUP BY flow;", trap: "COUNT(*) OVER () counts the piles (4 flows), not the emails in them. The whole is SUM(COUNT(*)) OVER ()." })],
    ] },
  { id: "correlated", n: 27, group: E, name: "A subquery that reads its row", word: "(SELECT … WHERE o.customer_id = c.id)",
    lesson: { frank: "Some questions you ask once per suspect. Every row gets its own little interrogation.",
      lines: ["A subquery in SELECT runs once for every outer row. Tie it to that row with the outer table's alias: <code>(SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id)</code>.",
        "It gives one number per row, and 0 when nothing matches. It shines for windows around each row: orders in the 30 days after this email, purchases before this one.",
        "Leave the tie out and it counts the whole table, so every row gets the same number.",
        "<code>WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)</code> keeps the rows with no match. Unlike NOT IN, a NULL can't break it."],
      example: `SELECT c.name, ${PAIDQ} AS paid_orders FROM customers c;` },
    tpl: [
      [1, () => ({ who: "theo", ask: "Every customer with their number of paid orders. Name and orders.", sql: `SELECT c.name, ${PAIDQ} FROM customers c;` })],
      [1, () => ({ who: "rosa", ask: "Every customer with the number of emails sent to them. Name and emails.", sql: "SELECT c.name, (SELECT COUNT(*) FROM sends s WHERE s.customer_id = c.id) FROM customers c;" })],
      [1, () => ({ who: "hank", ask: "Every product with its units sold (empty if none). Name and units.", sql: "SELECT p.name, (SELECT SUM(i.qty) FROM order_items i WHERE i.product_id = p.id) FROM products p;" })],
      [2, () => ({ who: "priya", ask: "Every paid order with how many paid orders the same customer placed before that day. Order id and the count.", sql: "SELECT o.id, (SELECT COUNT(*) FROM orders e WHERE e.customer_id = o.customer_id AND e.status = 'paid' AND e.day < o.day) FROM orders o WHERE o.status = 'paid';" })],
      [2, () => ({ who: "rosa", ask: "Every welcome email 1 with the paid orders its customer placed from that day to 7 days after. Send id and orders.", sql: "SELECT s.id, (SELECT COUNT(*) FROM orders o WHERE o.customer_id = s.customer_id AND o.status = 'paid' AND o.day BETWEEN s.day AND date(s.day, '+7 days')) FROM sends s WHERE s.flow = 'welcome' AND s.email = 1;" })],
      [3, () => ({ who: "theo", ask: "Customers with 2 or more paid orders. Name and orders.", sql: `WITH k AS (SELECT c.name, ${PAIDQ} AS n FROM customers c) SELECT name, n FROM k WHERE n >= 2;`,
        base: `SELECT c.name, ${PAIDQ} AS n FROM customers c;`, hint: "WHERE can't see n, it's made in SELECT. Put this query in a WITH step and filter outside.",
        marks: [["2 or more", "cte"]] })],
      [3, () => ({ who: "hank", ask: "Every subscriber with their paid orders and their paid revenue (empty if none), most orders first. Name, orders and revenue.", sql: `SELECT c.name, ${PAIDQ} AS n, (SELECT SUM(o.amount) FROM orders o WHERE o.customer_id = c.id AND o.status = 'paid') FROM customers c WHERE c.plan = 'subscriber' ORDER BY n DESC;`, ordered: 1,
        base: `SELECT c.name, ${PAIDQ} AS n FROM customers c WHERE c.plan = 'subscriber';`, hint: "A second subquery for the revenue, tied the same way. Then sort by the count.",
        marks: [["their paid revenue", "subquery"], ["most orders first", "order"]] })],
      [2, () => ({ who: "dana", ask: "Customers with no paid order, using NOT EXISTS. Name.", sql: "SELECT c.name FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.status = 'paid');" })],
      [2, (r) => { const f = pick(r, ["welcome", "campaign", "cart"]); return { who: "rosa", ask: `Customers who never got a ${f} email. Name and city.`, sql: `SELECT c.name, c.city FROM customers c WHERE NOT EXISTS (SELECT 1 FROM sends s WHERE s.customer_id = c.id AND s.flow = '${f}');` }; }],
      [4, () => ({ who: "theo", ask: "Customers with no paid order. Name.", sql: "SELECT c.name FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.status = 'paid');",
        bad: "SELECT c.name FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.status = 'paid');", trap: "Untied, the inside query asks \"is there any paid order at all?\" Yes, so NOT EXISTS is false for everyone. Tie it: o.customer_id = c.id." })],
      [4, () => ({ who: "theo", ask: "Every customer with their number of paid orders. Name and orders.", sql: `SELECT c.name, ${PAIDQ} FROM customers c;`,
        bad: "SELECT c.name, (SELECT COUNT(*) FROM orders o WHERE o.status = 'paid') FROM customers c;", trap: "Nothing ties the subquery to the row, so every customer gets the whole shop's count. Add o.customer_id = c.id." })],
      [4, () => ({ who: "rosa", ask: "Every customer with the number of emails sent to them. Name and emails.", sql: "SELECT c.name, (SELECT COUNT(*) FROM sends s WHERE s.customer_id = c.id) FROM customers c;",
        bad: "SELECT c.name, (SELECT COUNT(*) FROM sends s WHERE s.id = c.id) FROM customers c;", trap: "s.id is the email's own number. The column that points at the customer is s.customer_id." })],
    ] },
  { id: "shorthand", n: 28, group: E, name: "Shorthand: USING, GROUP BY 1, CAST", word: "JOIN … USING (channel) · GROUP BY 1 · CAST( … AS INTEGER)",
    lesson: { frank: "Long queries get short words. You'll read them in every query somebody hands you, so learn to read them first.",
      lines: ["When two tables name the key the same, <code>JOIN n USING (channel)</code> is <code>ON n.channel = s.channel</code>, and the column comes out once. Two stages of a pipeline often share names, so this is where you'll use it most.",
        "<code>GROUP BY 1</code> and <code>ORDER BY 1</code> mean the first column in SELECT. Handy when that column is a long CASE. Count carefully: ORDER BY 2 is the second.",
        "<code>CAST(x AS INTEGER)</code> makes a whole number: strftime's '08' becomes 8. <code>&lt;&gt;</code> means the same as <code>!=</code>."],
      example: USING2 },
    tpl: [
      [1, () => ({ who: "dana", ask: "Paid orders per month, with the month as a number (8 for August). Month and orders.", sql: "SELECT CAST(strftime('%m', day) AS INTEGER) AS month, COUNT(*) FROM orders WHERE status = 'paid' GROUP BY 1;" })],
      [1, () => ({ who: "theo", ask: "Customers per channel, channel A to Z. Channel and customers.", sql: "SELECT channel, COUNT(*) FROM customers GROUP BY 1 ORDER BY 1;", ordered: 1 })],
      [1, () => ({ who: "rosa", ask: "Emails per flow, leaving out campaign emails. Flow and emails.", sql: "SELECT flow, COUNT(*) FROM sends WHERE flow <> 'campaign' GROUP BY 1;" })],
      [2, () => ({ who: "hank", ask: "Spend and paid revenue per paid channel, from two steps joined on channel. Channel, spend and revenue.", sql: "WITH s AS (SELECT channel, SUM(spend) AS spend FROM ad_spend GROUP BY 1), r AS (SELECT c.channel, SUM(o.amount) AS revenue FROM customers c JOIN orders o ON o.customer_id = c.id WHERE o.status = 'paid' GROUP BY 1) SELECT channel, spend, revenue FROM s JOIN r USING (channel);" })],
      [2, () => ({ who: "priya", ask: "Every customer with whole days since they joined, as of Nov 15. Name and days.", sql: "SELECT name, CAST(julianday('2026-11-15') - julianday(joined) AS INTEGER) FROM customers;" })],
      [3, () => ({ who: "hank", ask: "Per paid channel: spend, and new customers since Aug 1. Channel, spend and new customers.", sql: "WITH s AS (SELECT channel, SUM(spend) AS spend FROM ad_spend GROUP BY 1), n AS (SELECT channel, COUNT(*) AS new FROM customers WHERE joined >= '2026-08-01' GROUP BY 1) SELECT channel, spend, new FROM s JOIN n USING (channel);",
        base: "SELECT channel, SUM(spend) AS spend FROM ad_spend GROUP BY 1;", hint: "Make this step s, the new customers step n, then join them USING (channel).",
        marks: [["new customers since Aug 1", "cte"]] })],
      [3, () => ({ who: "dana", ask: "Paid revenue per month, the month as a number, biggest month first. Month and revenue.", sql: "SELECT CAST(strftime('%m', day) AS INTEGER) AS month, SUM(amount) FROM orders WHERE status = 'paid' GROUP BY 1 ORDER BY 2 DESC;", ordered: 1,
        base: "SELECT CAST(strftime('%m', day) AS INTEGER) AS month, SUM(amount) FROM orders GROUP BY 1;", hint: "Only paid orders, and sort by the second column.",
        marks: [["Paid revenue", "where"], ["biggest month first", "order"]] })],
      [4, () => ({ who: "dana", ask: "Paid revenue per city, biggest first. City and revenue.", sql: "SELECT c.city, SUM(o.amount) FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.status = 'paid' GROUP BY 1 ORDER BY 2 DESC;", ordered: 1,
        bad: "SELECT c.city, SUM(o.amount) FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.status = 'paid' GROUP BY 1 ORDER BY 1 DESC;", trap: "ORDER BY 1 is the first column, the city, so that sorts Z to A. The revenue is column 2." })],
      [4, () => ({ who: "dana", ask: "Paid orders per month, with the month as a number (8 for August). Month and orders.", sql: "SELECT CAST(strftime('%m', day) AS INTEGER) AS month, COUNT(*) FROM orders WHERE status = 'paid' GROUP BY 1;",
        bad: "SELECT strftime('%m', day) AS month, COUNT(*) FROM orders WHERE status = 'paid' GROUP BY 1;", trap: "strftime gives text: '08', not 8. A chart or a join on month numbers won't match it. CAST it." })],
    ] },
];

// a pipeline from its stages: [name, what it holds, body] and the final SELECT
// tier 1: one stage blank (the longest, so the hard one gets typed), the rest given · 2: every stage in turn · 3: the whole query from the plan · 4: from the brief
const defs = (st) => st.map(([n, , b]) => `${n} AS (${b})`).join(", ");
const full = (st, fin) => `WITH ${defs(st)} ${fin}`;
function pipeTpl(make) {
  const chain = (tier) => (r) => {
    const p = make(r), all = [...p.stages, ["", p.finalDoes, p.final]], blank = all.reduce((b, x, i) => x[2].length > all[b][2].length ? i : b, 0);
    const steps = all.map(([n, does, b], i) => n
      ? { ask: `Stage ${n}: ${does}.`, stage: n, pre: defs(p.stages.slice(0, i)), sql: `WITH ${defs(p.stages.slice(0, i + 1))} SELECT * FROM ${n};`, show: b, given: tier === 1 && i !== blank, hint: p.hints && p.hints[i] }
      : { ask: `The final SELECT: ${does}.`, final: true, pre: defs(p.stages), sql: full(p.stages, p.final), show: p.final, ordered: p.ordered, given: tier === 1 && i !== blank, hint: p.hints && p.hints[i] });
    return { who: p.who, ask: p.brief, shape: p.shape, sql: full(p.stages, p.final), ordered: p.ordered, steps };
  };
  const whole = (tier) => (r) => { const p = make(r); return { who: p.who, ask: p.brief, shape: p.shape, sql: full(p.stages, p.final), ordered: p.ordered, plan: tier === 3 ? [...p.stages.map(([n, d]) => [n, d]), ["final", p.finalDoes]] : null }; };
  return [[1, chain(1)], [2, chain(2)], [3, whole(3)], [4, whole(4)]];
}
// what the player typed for a stage or the final SELECT, as the query that runs: the stages before it come along
export function assemble(c, typed) {
  const q = typed.trim().replace(/;\s*$/, "");
  if (c.stage) { const m = q.match(new RegExp(`^${c.stage}\\s+AS\\s*\\(([\\s\\S]*)\\)$`, "i")); return `WITH ${c.pre ? c.pre + ", " : ""}${c.stage} AS (${m ? m[1] : q}) SELECT * FROM ${c.stage};`; }
  if (c.final && /^\w+\s+AS\s*\(/i.test(q)) return `WITH ${c.pre}, ${q};`;   // more stages after the pinned ones
  if (c.final && !/^WITH\b/i.test(q)) return `WITH ${c.pre} ${q};`;
  return q + ";";
}
const V_BODY = "SELECT visitor_id, SUM(event = 'view') AS views, COUNT(DISTINCT date(ts / 1000, 'unixepoch')) AS days, MAX(event = 'cart') AS carted, MAX(event = 'purchase') AS bought FROM events GROUP BY visitor_id";
const PIPE_LINES = ["A pipeline is one WITH query in stages. Each stage is a plain query that reads the stage before it, and the last SELECT reads them all.",
  "Name each stage by what one row is: one row per visitor, one row per buyer. Write and run a stage before you start the next. Each one you finish is pinned to the board as a new table.",
  "The help fades: first one stage is blank, then you write every stage in turn, then the whole query from the plan, then from the brief alone."];
const PIPES = [
  { id: "pipe1", step: 4, owner: "priya", name: "Roll up, filter, then segment", word: "per visitor → high intent → segments",
    lesson: { owner: "Do the visitors who look hard at the site actually buy? And does reaching the cart make the difference? I need it per segment.",
      frank: "Big questions are a row of small ones. Each stage hands its table to the next, like evidence bags down a line.",
      lines: PIPE_LINES },
    make: (r) => { const V = pick(r, [5, 6, 8]);
      if (pick(r, [0, 1])) return { who: "priya", ordered: 1, shape: "pipe1-days",
        brief: `Among visitors with ${V}+ views, compare the ones who came back on another day with the ones who looked on one day only: visitors, average views and the percent who bought, both to one decimal, segments A to Z.`,
        stages: [["v", "one row per visitor: views, active days, reached the cart (1 or 0), bought (1 or 0)", V_BODY], ["h", `only the visitors with ${V}+ views`, `SELECT * FROM v WHERE views >= ${V}`]],
        finalDoes: "per segment ('came back another day' or 'one day only'): visitors, average views and percent who bought, to one decimal, A to Z",
        final: "SELECT CASE WHEN days >= 2 THEN 'came back another day' ELSE 'one day only' END AS segment, COUNT(*) AS visitors, ROUND(AVG(views), 1) AS avg_views, ROUND(100.0 * AVG(bought), 1) AS bought_pct FROM h GROUP BY 1 ORDER BY 1;",
        hints: ["SUM(event = 'view'), COUNT(DISTINCT date(ts / 1000, 'unixepoch')), MAX(event = 'cart'), MAX(event = 'purchase'), GROUP BY visitor_id.", "SELECT * FROM v WHERE …", "A CASE on days, then GROUP BY 1 ORDER BY 1. AVG of a 1-or-0 column is a share."] };
      return { who: "priya", ordered: 1, shape: "pipe1-cart",
      brief: `Among high-intent visitors (${V}+ views on 2+ different days), compare the ones who reached the cart with the ones who never did: visitors, average views and the percent who bought, both to one decimal, segments A to Z.`,
      stages: [["v", "one row per visitor: views, active days, reached the cart (1 or 0), bought (1 or 0)", V_BODY], ["h", `only the high-intent visitors: ${V}+ views on 2+ days`, `SELECT * FROM v WHERE views >= ${V} AND days >= 2`]],
      finalDoes: "per segment ('reached the cart' or 'never reached the cart'): visitors, average views and percent who bought, to one decimal, A to Z",
      final: "SELECT CASE WHEN carted = 1 THEN 'reached the cart' ELSE 'never reached the cart' END AS segment, COUNT(*) AS visitors, ROUND(AVG(views), 1) AS avg_views, ROUND(100.0 * AVG(bought), 1) AS bought_pct FROM h GROUP BY 1 ORDER BY 1;",
      hints: ["SUM(event = 'view'), COUNT(DISTINCT date(ts / 1000, 'unixepoch')), MAX(event = 'cart'), MAX(event = 'purchase'), GROUP BY visitor_id.", "SELECT * FROM v WHERE …", "A CASE on carted, then GROUP BY 1 ORDER BY 1. AVG of a 1-or-0 column is a share."] }; } },
  { id: "pipe2", step: 5, owner: "hank", name: "Two stages side by side", word: "emailed → held out → joined",
    lesson: { owner: "Holdout lift again, but per plan. Do the emails do more for subscribers or for one-time buyers?",
      frank: "Two lineups, same night, same street. One saw the email, one didn't. Line them up side by side.",
      lines: ["Two stages can read the same table separately, then the final SELECT joins them. Here: one stage for the emailed customers, one for the held-out ones, joined on plan.",
        "Each stage is one row per plan, so the join is one to one. USING (plan) keeps one plan column.", PIPE_LINES[2]] },
    make: (r) => { const since = pick(r, [null, "2026-09-01", "2026-10-01"]), win = since ? ` AND o.day >= '${since}'` : "", when = since ? ` (orders since ${nice(since)})` : "";
      const by = pick(r, ["plan", "channel"]);
      const side = (hold, col) => `SELECT c.${by}, COUNT(DISTINCT c.id) AS people, COALESCE(SUM(o.amount), 0) * 1.0 / COUNT(DISTINCT c.id) AS ${col} FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'paid'${win} WHERE c.holdout = ${hold} GROUP BY c.${by}`;
      return { who: "hank", ordered: 1, shape: "pipe2-" + by,
        brief: `Paid revenue per customer${when}, emailed vs held out, per ${by}: both groups' people, both numbers and the lift (emailed − held out), all to the cent, ${by}s A to Z.`,
        stages: [["mailed", `one row per ${by}, emailed customers only (holdout 0): people and paid revenue per person${when}`, side(0, "rpc")], ["held", "the same for the held-out customers (holdout 1)", side(1, "rpc")]],
        finalDoes: `${by}, emailed and held-out people, emailed and held-out revenue per person and the lift, to the cent, ${by}s A to Z`,
        final: `SELECT m.${by}, m.people, h.people AS held_people, ROUND(m.rpc, 2) AS mailed, ROUND(h.rpc, 2) AS held_out, ROUND(m.rpc - h.rpc, 2) AS lift FROM mailed m JOIN held h USING (${by}) ORDER BY 1;`,
        hints: ["LEFT JOIN paid orders (a date test, if the brief has one, goes in ON too), WHERE c.holdout = 0, COALESCE so non-buyers count as 0.", "Copy mailed, change the 0 to a 1.", `JOIN held h USING (${by}), then subtract.`] }; } },
  { id: "pipe3", step: 6, owner: "dana", name: "Stages, labels and a share", word: "per buyer → tier → share of the whole",
    lesson: { owner: "How much of our money comes from a few big buyers? Put every buyer in a tier and show me each tier's share of buyers and of revenue.",
      frank: "Sort the suspects into lineups. Then count how much of the loot each lineup carried.",
      lines: ["Stage one rolls the orders up per buyer. Stage two labels each buyer with a CASE. The final SELECT piles the labels and adds the shares.",
        "A label made in a stage is a plain column to the next stage, so you can GROUP BY it there.", PIPE_LINES[2]] },
    make: (r) => { const [X, Y] = pick(r, [[150, 60], [200, 80], [120, 50]]);
      if (pick(r, [0, 1])) return { who: "dana", ordered: 1, shape: "pipe3-orders",
        brief: "Label every buyer by paid orders: 'loyal' at 3+, 'repeat' at 2, else 'one-time'. Per label: buyers, percent of buyers and percent of revenue, to one decimal, labels A to Z.",
        stages: [["s", "one row per buyer: paid orders (k) and paid spend", "SELECT customer_id, COUNT(*) AS k, SUM(amount) AS spent FROM orders WHERE status = 'paid' GROUP BY customer_id"],
          ["t", "each buyer with a label: 'loyal' at 3+ orders, 'repeat' at 2, else 'one-time'", "SELECT customer_id, spent, CASE WHEN k >= 3 THEN 'loyal' WHEN k = 2 THEN 'repeat' ELSE 'one-time' END AS tier FROM s"]],
        finalDoes: "per label: buyers, percent of buyers and percent of revenue, to one decimal, A to Z",
        final: `SELECT tier, COUNT(*) AS buyers, ${SHARE("COUNT(*)")} AS buyers_pct, ${SHARE("SUM(spent)")} AS revenue_pct FROM t GROUP BY 1 ORDER BY 1;`,
        hints: ["COUNT(*) and SUM(amount) per customer_id, paid only.", "CASE WHEN k >= 3 THEN 'loyal' WHEN k = 2 THEN 'repeat' ELSE 'one-time' END AS tier.", "ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1), and the same with SUM(spent)."] };
      return { who: "dana", ordered: 1, shape: "pipe3-spend",
      brief: `Tier every buyer by paid spend: 'big' at $${X}+, 'medium' at $${Y}+, else 'small'. Per tier: buyers, percent of buyers and percent of revenue, to one decimal, tiers A to Z.`,
      stages: [["s", "one row per buyer: paid spend", "SELECT customer_id, SUM(amount) AS spent FROM orders WHERE status = 'paid' GROUP BY customer_id"],
        ["t", `each buyer with a tier: 'big' at $${X}+, 'medium' at $${Y}+, else 'small'`, `SELECT customer_id, spent, CASE WHEN spent >= ${X} THEN 'big' WHEN spent >= ${Y} THEN 'medium' ELSE 'small' END AS tier FROM s`]],
      finalDoes: "per tier: buyers, percent of buyers and percent of revenue, to one decimal, A to Z",
      final: `SELECT tier, COUNT(*) AS buyers, ${SHARE("COUNT(*)")} AS buyers_pct, ${SHARE("SUM(spent)")} AS revenue_pct FROM t GROUP BY 1 ORDER BY 1;`,
      hints: ["SUM(amount) per customer_id, paid only.", "CASE WHEN spent >= … THEN 'big' WHEN … ELSE 'small' END AS tier.", "ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1), and the same with SUM(spent)."] }; } },
  { id: "pipe4", step: 7, owner: "theo", name: "Four stages", word: "first order → channel → came back? → per channel",
    lesson: { owner: "Which channel brings people who come back? Not who buys once. Who buys again soon after.",
      frank: "Four stages. The long ones are just short ones in a row. Take them one at a time and they'll fold.",
      lines: ["Stage f: each buyer's first paid day. Stage b: add their channel. Stage scored: a subquery counts each buyer's paid orders in the days after their first. The final SELECT piles by channel.",
        "This is the shape of most real analyst queries: build the people, score them, then sum up the scores.", PIPE_LINES[2]] },
    make: (r) => { const N = pick(r, [30, 45, 60]), by = pick(r, ["channel", "plan"]); return { who: "theo", ordered: 1, shape: "pipe4-" + by,
      brief: `Per ${by}: buyers, their percent of all buyers, and the percent who placed another paid order within ${N} days after their first, both to one decimal, ${by}s A to Z.`,
      stages: [["f", "one row per buyer: their first paid day (first_day)", "SELECT customer_id, MIN(day) AS first_day FROM orders WHERE status = 'paid' GROUP BY customer_id"],
        ["b", `f with each buyer's ${by}`, `SELECT f.customer_id, f.first_day, c.${by} FROM f JOIN customers c ON c.id = f.customer_id`],
        ["scored", `b with again: their paid orders after first_day, up to ${N} days after it`, `SELECT b.*, (SELECT COUNT(*) FROM orders o WHERE o.customer_id = b.customer_id AND o.status = 'paid' AND o.day > b.first_day AND o.day <= date(b.first_day, '+${N} days')) AS again FROM b`]],
      finalDoes: `per ${by}: buyers, percent of all buyers, percent with another order within ${N} days, to one decimal, A to Z`,
      final: `SELECT ${by}, COUNT(*) AS buyers, ${SHARE("COUNT(*)")} AS share_pct, ROUND(100.0 * AVG(again > 0), 1) AS back_pct FROM scored GROUP BY 1 ORDER BY 1;`,
      hints: ["MIN(day) per customer_id, paid only.", "JOIN customers on the id.", `(SELECT COUNT(*) FROM orders o WHERE o.customer_id = b.customer_id AND … o.day <= date(b.first_day, '+${N} days')) AS again`, "AVG(again > 0) is the share with at least one."] }; } },
  { id: "pipe5", step: 8, owner: "priya", name: "Sessions", word: "the gap → a new-visit flag → a running count → per visit",
    lesson: { owner: "Every analytics tool reports sessions, not visitors. Our click log has no sessions. Cut it into visits: a new visit starts after a quiet half hour.",
      frank: "A trail goes cold, then picks up again. Every time it goes quiet long enough, that's a new trail.",
      lines: ["A session is one visit: one visitor's events with no gap longer than 30 minutes between them. Google Analytics uses the same rule. ts is in milliseconds, so 30 minutes is <code>30 * 60000</code>.",
        "Three moves: <code>LAG(ts)</code> finds the gap to the event before, a CASE flags the events that start a visit, then a running <code>SUM</code> of the flags numbers the visits: 1, 1, 1, 2, 2… Then pile by visitor and that number.", PIPE_LINES[2]] },
    make: (r) => { const G = pick(r, [30, 30, 20]), by = pick(r, ["device", "visit"]); const label = by === "device" ? "device" : "CASE WHEN session = 1 THEN 'first visit' ELSE 'came back' END";
      return { who: "priya", ordered: 1, shape: "pipe5-" + by,
        brief: `Cut the click log into visits: a new visit starts when a visitor's last event was more than ${G} minutes before, or there wasn't one. Then per ${by === "device" ? "device" : "visit kind ('first visit' for a visitor's first, else 'came back')"}: visits, average events per visit and the percent that ended in a purchase, both to one decimal, A to Z.`,
        stages: [["e", "one row per event, with the visitor's previous event time (prev)", "SELECT id, visitor_id, ts, event, device, LAG(ts) OVER (PARTITION BY visitor_id ORDER BY ts, id) AS prev FROM events"],
          ["f", `e with new_visit: 1 when there's no prev or the gap is over ${G} minutes, else 0`, `SELECT *, CASE WHEN prev IS NULL OR ts - prev > ${G} * 60000 THEN 1 ELSE 0 END AS new_visit FROM e`],
          ["s", "f with session: the visitor's running count of new_visit", "SELECT *, SUM(new_visit) OVER (PARTITION BY visitor_id ORDER BY ts, id) AS session FROM f"],
          ["per", "one row per visit: visitor_id, session, device, events and bought (1 or 0)", "SELECT visitor_id, session, MIN(device) AS device, COUNT(*) AS events, MAX(event = 'purchase') AS bought FROM s GROUP BY visitor_id, session"]],
        finalDoes: `per ${by === "device" ? "device" : "visit kind"}: visits, average events and percent bought, to one decimal, A to Z`,
        final: `SELECT ${label}${by === "device" ? "" : " AS kind"}, COUNT(*) AS visits, ROUND(AVG(events), 1) AS avg_events, ROUND(100.0 * AVG(bought), 1) AS bought_pct FROM per GROUP BY 1 ORDER BY 1;`,
        hints: ["LAG(ts) OVER (PARTITION BY visitor_id ORDER BY ts, id) AS prev.", `CASE WHEN prev IS NULL OR ts - prev > ${G} * 60000 THEN 1 ELSE 0 END.`, "SUM(new_visit) OVER (PARTITION BY visitor_id ORDER BY ts, id): a running count.", "GROUP BY visitor_id, session. MAX(event = 'purchase') is 1 if any event was a purchase.", by === "device" ? "GROUP BY device." : "A CASE on session = 1, then GROUP BY 1."] }; } },
].map((p) => asPipe(p, E, 4));
// a pipeline step from its make(r): the lesson's build-up and example come from the first variant
function asPipe(p, group, top) {
  const x = p.make(rng(1)), build = [...x.stages.map(([n, d], i) => [`Stage ${n}: ${d}`, `WITH ${defs(x.stages.slice(0, i + 1))} SELECT * FROM ${n};`]), ["The final SELECT", full(x.stages, x.final)]];
  const { make, ...rest } = p;
  return { ...rest, kind: "pipe", group, rule: { practice: 0, climb: 1, pass: [2, 2] }, lesson: { ...p.lesson, build, example: full(x.stages, x.final) }, tpl: pipeTpl(make).filter(([t]) => t <= top) };
}

// Pipelines I: right after WITH (the critique: staging came at step 56, after the metric steps that need it).
// Short pipelines in the shape most real queries take: roll up, label or filter, then pile. Only Unit A to D clauses,
// no windows yet. Three tiers: one stage blank (the hardest), every stage in turn, the whole query from the plan.
// "From the brief" waits for Pipelines II in Unit E
const PIPE_I_LINES = ["A pipeline is one WITH query in stages. Each stage is a plain query that reads the stage before it, and the last SELECT reads them all.",
  "Name each stage by what one row is: one row per buyer, one row per customer. Write and run a stage before you start the next. Each one you finish is pinned to the board as a new table.",
  "The help fades: first one stage is blank, then you write every stage in turn, then the whole query from a plan."];
const PIPES_I = [
  { id: "stage1", step: 1, owner: "dana", name: "Roll up, label, then pile", word: "per buyer → a label each → per label",
    lesson: { owner: "Are we a shop of a few big spenders, or lots of small ones? Sort every buyer into a tier and show me each tier.",
      frank: "Big questions are a row of small ones. Each stage hands its table to the next, like evidence bags down a line.",
      lines: PIPE_I_LINES },
    make: (r) => { const by = pick(r, ["spend", "spend", "orders"]);
      if (by === "orders") return { who: "dana", ordered: 1,
        brief: "Label every buyer by paid orders: 'loyal' at 3+, 'repeat' at 2, else 'one-time'. Per label: buyers and their average paid spend to the cent, labels A to Z.",
        stages: [["s", "one row per buyer: paid orders (k) and paid spend", "SELECT customer_id, COUNT(*) AS k, SUM(amount) AS spent FROM orders WHERE status = 'paid' GROUP BY customer_id"],
          ["t", "each buyer with a label: 'loyal' at 3+ orders, 'repeat' at 2, else 'one-time'", "SELECT customer_id, spent, CASE WHEN k >= 3 THEN 'loyal' WHEN k = 2 THEN 'repeat' ELSE 'one-time' END AS label FROM s"]],
        finalDoes: "per label: buyers and average paid spend to the cent, A to Z",
        final: "SELECT label, COUNT(*) AS buyers, ROUND(AVG(spent), 2) AS avg_spent FROM t GROUP BY label ORDER BY label;",
        hints: ["COUNT(*) and SUM(amount) per customer_id, paid only.", "CASE WHEN k >= 3 THEN … WHEN k = 2 THEN … ELSE … END AS label.", "GROUP BY label, ORDER BY label. ROUND(AVG(spent), 2)."] };
      const [X, Y] = pick(r, [[120, 40], [165, 80], [190, 90]]); return { who: "dana", ordered: 1,
        brief: `Tier every buyer by paid spend: 'big' at $${X}+, 'medium' at $${Y}+, else 'small'. Per tier: buyers and their average paid orders to one decimal, tiers A to Z.`,
        stages: [["s", "one row per buyer: paid orders (k) and paid spend", "SELECT customer_id, COUNT(*) AS k, SUM(amount) AS spent FROM orders WHERE status = 'paid' GROUP BY customer_id"],
          ["t", `each buyer with a tier: 'big' at $${X}+, 'medium' at $${Y}+, else 'small'`, `SELECT customer_id, k, CASE WHEN spent >= ${X} THEN 'big' WHEN spent >= ${Y} THEN 'medium' ELSE 'small' END AS tier FROM s`]],
        finalDoes: "per tier: buyers and average paid orders to one decimal, A to Z",
        final: "SELECT tier, COUNT(*) AS buyers, ROUND(AVG(k), 1) AS avg_orders FROM t GROUP BY tier ORDER BY tier;",
        hints: ["COUNT(*) and SUM(amount) per customer_id, paid only.", "CASE WHEN spent >= … THEN 'big' WHEN … ELSE 'small' END AS tier. The narrowest test first.", "GROUP BY tier, ORDER BY tier. ROUND(AVG(k), 1)."] }; } },
  { id: "stage2", step: 2, owner: "theo", name: "Roll up, filter, then join", word: "per buyer → this month's new buyers → per channel",
    lesson: { owner: "Which channels bring new buyers who come back? Take one month's new buyers and show me per channel.",
      frank: "First find your people. Then narrow it down. Only then go knocking on doors for names and places.",
      lines: ["A filter can be a stage of its own: <code>SELECT * FROM f WHERE …</code>. It keeps the same grain, just fewer rows.",
        "The join comes last, when the rows are already the people you want. Join early and you carry every column through every stage.", PIPE_I_LINES[2]] },
    make: (r) => { const m = pick(r, BIGMONTH), col = pick(r, ["channel", "plan"]); return { who: "theo", ordered: 1,
      brief: `Buyers whose first paid order was in ${m[0]}: per ${col}, how many there are and how many placed 2 or more paid orders in all, ${col}s A to Z.`,
      stages: [["f", "one row per buyer: first paid day (first_day) and paid orders (k)", "SELECT customer_id, MIN(day) AS first_day, COUNT(*) AS k FROM orders WHERE status = 'paid' GROUP BY customer_id"],
        ["n", `only the buyers whose first_day is in ${m[0]}`, `SELECT * FROM f WHERE first_day BETWEEN '${m[1]}' AND '${m[2]}'`]],
      finalDoes: `per ${col}: the buyers in n and how many have k of 2 or more, A to Z`,
      final: `SELECT c.${col}, COUNT(*) AS buyers, SUM(CASE WHEN n.k >= 2 THEN 1 ELSE 0 END) AS came_back FROM n JOIN customers c ON c.id = n.customer_id GROUP BY c.${col} ORDER BY c.${col};`,
      hints: ["MIN(day) and COUNT(*) per customer_id, paid only.", "SELECT * FROM f WHERE first_day BETWEEN … AND ….", `JOIN customers c ON c.id = n.customer_id, GROUP BY c.${col}. Count the 2+ with SUM(CASE WHEN … THEN 1 ELSE 0 END).`] }; } },
  { id: "stage3", step: 3, owner: "rosa", name: "Two roll-ups, joined, then piled", word: "per customer emails + per buyer spend → joined → per label",
    lesson: { owner: "Do the people we email most spend more? Emails per person on one side, spend on the other, then compare.",
      frank: "Two witnesses, two statements. Take each one down separately. Then put them in the same room.",
      lines: ["Two stages can each roll up a different table to the same grain, one row per customer. Then a stage joins them on customer_id, one to one.",
        "Not everyone emailed has bought, so the join is a LEFT JOIN from the emailed side, and a missing spend counts as 0 with COALESCE.", PIPE_I_LINES[2]] },
    make: (r) => { const camp = r() < 0.34; return camp ? mk3(pick(r, [2, 3]), " AND flow = 'campaign'", "campaign emails") : mk3(pick(r, [5, 6]), "", "emails"); } },
].map((p) => asPipe(p, D, 3));
// stage3's shape, with the "heavy" line drawn per run
function mk3(N, fl, what) {
  return { who: "rosa", ordered: 1,
    brief: `Every customer who got ${what} delivered: 'heavy' at ${N}+ delivered, else 'light'. Per label: customers and their average paid spend (0 for non-buyers), to the cent, A to Z.`,
    stages: [["e", `one row per customer who got ${what} delivered: how many (emails)`, `SELECT customer_id, COUNT(*) AS emails FROM sends WHERE delivered = 1${fl} GROUP BY customer_id`],
      ["s", "one row per buyer: paid spend", "SELECT customer_id, SUM(amount) AS spent FROM orders WHERE status = 'paid' GROUP BY customer_id"],
      ["j", "every customer in e with their emails and spend, 0 if they never bought", "SELECT e.customer_id, e.emails, COALESCE(s.spent, 0) AS spent FROM e LEFT JOIN s ON s.customer_id = e.customer_id"]],
    finalDoes: `per label ('heavy' at ${N}+ emails, else 'light'): customers and average spend to the cent, A to Z`,
    final: `SELECT CASE WHEN emails >= ${N} THEN 'heavy' ELSE 'light' END AS label, COUNT(*) AS customers, ROUND(AVG(spent), 2) AS avg_spent FROM j GROUP BY label ORDER BY label;`,
    hints: ["COUNT(*) per customer_id from sends, delivered = 1 (and the flow, if the brief names one).", "SUM(amount) per customer_id, paid only.", "e LEFT JOIN s ON s.customer_id = e.customer_id, COALESCE(s.spent, 0).", "A CASE label, then GROUP BY it."] };
}

// ---------- Unit F: on the job (SQL-REWORK-PLAN.md batch 7, transfer) ----------
// Queries written in other databases' SQL, then the same shop as Shopify and Klaviyo export it (codes, numbers stored as
// text, '' for nothing, emails as typed), a case on those exports, and a case file on real data (Hillstrom).
const F = "Unit F · On the job";
// a request that starts from a coworker's query in another database: foreign = [the database, its query]
const FX = (who, db, ask, foreign, sql, more = {}) => ({ who, ask, foreign: [db, foreign], sql, ...more });
const RATE_BQ = "SELECT flow, SAFE_DIVIDE(SUM(opened), SUM(delivered)) AS open_rate FROM sends GROUP BY flow;";
const RATE_LITE = "SELECT flow, SUM(opened) * 1.0 / NULLIF(SUM(delivered), 0) AS open_rate FROM sends GROUP BY flow;";
const COUNTIF_BQ = (f) => `SELECT flow, COUNT(*) AS emails, COUNTIF(${f} = 1) AS ${f}_emails FROM sends WHERE delivered = 1 GROUP BY flow;`;
const COUNTIF_LITE = (f) => `SELECT flow, COUNT(*) AS emails, SUM(${f} = 1) AS ${f}_emails FROM sends WHERE delivered = 1 GROUP BY flow;`;
// order sizes that November's paid orders hit exactly on both shops, so >= and > give different labels
const NOV_CUT = [...new Set(SHOP.orders.filter((o) => o[4] === "paid" && o[3] >= "2026-11-01" && o[2] >= 40).map((o) => o[2]))].filter((x) => SHOP2.orders.some((o) => o[4] === "paid" && o[3] >= "2026-11-01" && o[2] === x)).sort((a, b) => a - b).slice(0, 3);
const UNIT_F = [
  { id: "dialects", n: 30, group: F, name: "Other databases", word: "BigQuery, Snowflake and Postgres, written for SQLite",
    lesson: { frank: "Every precinct talks its own slang. Same crimes, different words. Learn to translate and you can work any beat.",
      lines: ["Most jobs run BigQuery, Snowflake or Postgres, not SQLite. SELECT, WHERE, JOIN, GROUP BY and windows read the same everywhere. Dates, text tests and division change. Coworkers will hand you their queries: read them, then write the SQLite.",
        "<b>Months:</b> BigQuery <code>DATE_TRUNC(day, MONTH)</code>, Postgres and Snowflake <code>DATE_TRUNC('month', day)</code> → <code>strftime('%Y-%m', day)</code>. <b>Days later:</b> <code>day + INTERVAL '5 days'</code> → <code>date(day, '+5 days')</code>. <b>Days between:</b> BigQuery <code>DATE_DIFF(b, a, DAY)</code> → <code>julianday(b) - julianday(a)</code>.",
        "<b>Text and ifs:</b> Postgres <code>ILIKE</code> ignores capitals, and SQLite's <code>LIKE</code> already does. Snowflake <code>IFF(test, a, b)</code> → <code>CASE WHEN test THEN a ELSE b END</code>.",
        "<b>Counting and dividing:</b> BigQuery <code>COUNTIF(test)</code> and Postgres <code>COUNT(*) FILTER (WHERE test)</code> → <code>SUM(test)</code>. BigQuery's <code>/</code> always gives a decimal, and <code>SAFE_DIVIDE(a, b)</code> gives NULL instead of failing on 0 → <code>a * 1.0 / NULLIF(b, 0)</code>.",
        "<b>One row per group:</b> Snowflake and BigQuery <code>QUALIFY ROW_NUMBER() OVER (…) = 1</code> → ROW_NUMBER in a WITH stage, then <code>WHERE n = 1</code>."],
      example: "SELECT strftime('%Y-%m', day) AS month, SUM(amount) AS revenue FROM orders WHERE status = 'paid' GROUP BY month;" },
    tpl: [
      [1, (r) => { const [what, f] = pick(r, [["paid revenue", "SUM(amount) AS revenue"], ["paid orders", "COUNT(*) AS orders"]]);
        return FX("hank", "BigQuery", `Hank's BigQuery query: ${what} per month. Write it for SQLite, with the month as 2026-08.`, `SELECT DATE_TRUNC(day, MONTH) AS month, ${f} FROM orders WHERE status = 'paid' GROUP BY month;`, `SELECT strftime('%Y-%m', day) AS month, ${f} FROM orders WHERE status = 'paid' GROUP BY month;`); }],
      [1, (r) => { const w = pick(r, ["%Blend%", "%ESPRESSO%", "%kit%", "%Mug%"]);
        return FX("priya", "Postgres", "Priya's Postgres query. Write it for SQLite.", `SELECT name, price FROM products WHERE name ILIKE '${w}';`, `SELECT name, price FROM products WHERE name LIKE '${w}';`); }],
      [1, (r) => { const X = pick(r, NOV_CUT);
        return FX("dana", "Snowflake", "Dana's Snowflake query: November's paid orders, labelled by size. Write it for SQLite.", `SELECT id, amount, IFF(amount >= ${X}, 'big', 'small') AS size FROM orders WHERE status = 'paid' AND day >= '2026-11-01';`, `SELECT id, amount, CASE WHEN amount >= ${X} THEN 'big' ELSE 'small' END AS size FROM orders WHERE status = 'paid' AND day >= '2026-11-01';`); }],
      [1, (r) => { const N = pick(r, [5, 7, 14]);
        return FX("theo", "Postgres", `Theo's Postgres query: a follow-up day ${N} days after each WELCOME5 order. Write it for SQLite.`, `SELECT id, day, day + INTERVAL '${N} days' AS follow_up FROM orders WHERE code = 'WELCOME5';`, `SELECT id, day, date(day, '+${N} days') AS follow_up FROM orders WHERE code = 'WELCOME5';`); }],
      [1, () => FX("hank", "BigQuery", "Hank's BigQuery query: how long each cancelled subscription ran. Write it for SQLite.", "SELECT customer_id, DATE_DIFF(cancelled, started, DAY) AS days FROM subscriptions WHERE cancelled IS NOT NULL;", "SELECT customer_id, julianday(cancelled) - julianday(started) AS days FROM subscriptions WHERE cancelled IS NOT NULL;")],
      [2, (r) => { const f = pick(r, ["opened", "unsubscribed"]); return FX("rosa", "BigQuery", `Rosa's BigQuery query: delivered emails and how many were ${f}, per flow. Write it for SQLite.`, COUNTIF_BQ(f), COUNTIF_LITE(f)); }],
      [2, () => FX("dana", "Postgres", "Dana's Postgres query: orders and refunds per month. Write it for SQLite, with the month as 2026-08.", "SELECT DATE_TRUNC('month', day) AS month, COUNT(*) AS orders, COUNT(*) FILTER (WHERE status = 'refunded') AS refunds FROM orders GROUP BY 1;", "SELECT strftime('%Y-%m', day) AS month, COUNT(*) AS orders, SUM(status = 'refunded') AS refunds FROM orders GROUP BY 1;")],
      [2, () => FX("rosa", "BigQuery", "Rosa's BigQuery query: the open rate per flow. Write it for SQLite.", RATE_BQ, RATE_LITE)],
      [2, (r) => { const [what, o] = pick(r, [["biggest", "amount DESC, id"], ["first", "day, id"]]);
        return FX("theo", "Snowflake", `Theo's Snowflake query: each buyer's ${what} paid order. Write it for SQLite.`, `SELECT customer_id, id, amount FROM orders WHERE status = 'paid' QUALIFY ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY ${o}) = 1;`, `WITH r AS (SELECT customer_id, id, amount, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY ${o}) AS n FROM orders WHERE status = 'paid') SELECT customer_id, id, amount FROM r WHERE n = 1;`); }],
      [2, () => FX("hank", "BigQuery", "Hank's BigQuery query: per start month, how long cancelled subscriptions ran on average. Write it for SQLite, with the month as 2026-08.", "SELECT FORMAT_DATE('%Y-%m', started) AS month, AVG(DATE_DIFF(cancelled, started, DAY)) AS avg_days FROM subscriptions WHERE cancelled IS NOT NULL GROUP BY month;", "SELECT strftime('%Y-%m', started) AS month, AVG(julianday(cancelled) - julianday(started)) AS avg_days FROM subscriptions WHERE cancelled IS NOT NULL GROUP BY month;")],
      [4, () => FX("rosa", "BigQuery", "Rosa's BigQuery query: the open rate per flow. Write it for SQLite.", RATE_BQ, RATE_LITE,
        { bad: "SELECT flow, SUM(opened) / SUM(delivered) AS open_rate FROM sends GROUP BY flow;", trap: "BigQuery's / always gives a decimal. SQLite divides two whole numbers as whole numbers and drops the rest, so every rate comes out 0. Multiply by 1.0 first." })],
      [4, (r) => { const f = pick(r, ["opened", "unsubscribed"]); return FX("rosa", "BigQuery", `Rosa's BigQuery query: delivered emails and how many were ${f}, per flow. Write it for SQLite.`, COUNTIF_BQ(f), COUNTIF_LITE(f),
        { bad: COUNTIF_LITE(f).replace(`SUM(${f} = 1)`, `COUNT(${f} = 1)`), trap: `COUNT counts every row where the value isn't NULL. ${f} = 1 is 1 or 0, never NULL, so COUNT counts every email. SUM adds up the 1s.` }); }],
    ] },
  { id: "export", n: 31, group: F, name: "Someone else's export", word: "codes, numbers as text, '' for nothing, emails as typed",
    lesson: { owner: "We're moving to Shopify and Klaviyo. Their exports look nothing like our tables, and I'll need numbers from them on Monday.",
      frank: "New town, new paperwork. Before you ask a witness anything, find out what language he speaks.",
      lines: ["Three new cards: <code>shop_orders</code> from Shopify, and <code>kl_events</code> and <code>kl_metrics</code> from Klaviyo. Nothing in them carries our ids. The two exports meet only on the email address.",
        "Read before you query. What is one row? Which columns are codes? <code>metric_id</code> is a code, and <code>SELECT * FROM kl_metrics</code> says what each one means. <code>SELECT source_name, COUNT(*) FROM shop_orders GROUP BY 1</code> shows every value a column takes.",
        "Check the types. <code>total_price</code> is text, so sort it as a number with <code>CAST(total_price AS REAL)</code>. A missing code is <code>''</code>, empty text, not NULL. <code>created_at</code> is the shop's local time, so <code>substr(created_at, 1, 10)</code> is the shop's day.",
        "Emails come as people typed them. Join on <code>LOWER(TRIM(o.email)) = e.profile_email</code>."],
      example: "SELECT m.name, COUNT(*) FROM kl_events e JOIN kl_metrics m ON m.id = e.metric_id GROUP BY m.name;" },
    tpl: [
      [1, () => ({ who: "rosa", ask: "metric_id is a code. What does each one mean? Every metric: id and name.", sql: "SELECT id, name FROM kl_metrics;" })],
      [1, () => ({ who: "theo", ask: "Every value source_name takes, and how many Shopify orders have it.", sql: "SELECT source_name, COUNT(*) FROM shop_orders GROUP BY source_name;" })],
      [1, () => ({ who: "dana", ask: "Shopify orders that used a discount code: name and the code.", sql: "SELECT name, discount_code FROM shop_orders WHERE discount_code != '';" })],
      [1, (r) => { const n = cleanLimit(r, SHOP.orders.filter((o) => o[4] === "paid").map((o) => o[2]), true, [3, 4, 5]); return { who: "hank", ask: `The ${n} biggest paid Shopify orders: name and total_price, biggest first.`, sql: `SELECT name, total_price FROM shop_orders WHERE financial_status = 'paid' ORDER BY CAST(total_price AS REAL) DESC LIMIT ${n};`, ordered: 1 }; }],
      [1, () => ({ who: "rosa", ask: "Klaviyo events per metric name. Name and events.", sql: "SELECT m.name, COUNT(*) FROM kl_events e JOIN kl_metrics m ON m.id = e.metric_id GROUP BY m.name;" })],
      [2, () => ({ who: "hank", ask: "Paid Shopify revenue per source_name, in dollars. source_name and revenue.", sql: "SELECT source_name, SUM(CAST(total_price AS REAL)) FROM shop_orders WHERE financial_status = 'paid' GROUP BY source_name;" })],
      [2, () => ({ who: "dana", ask: "Paid Shopify orders and revenue per month, the month as 2026-08. Month, orders and revenue.", sql: "SELECT substr(created_at, 1, 7) AS month, COUNT(*), SUM(CAST(total_price AS REAL)) FROM shop_orders WHERE financial_status = 'paid' GROUP BY month;" })],
      [2, () => ({ who: "rosa", ask: "Clicks per newsletter, from Klaviyo. message_name and clicks, newsletters only.", sql: "SELECT e.message_name, COUNT(*) FROM kl_events e JOIN kl_metrics m ON m.id = e.metric_id WHERE m.name = 'Clicked Email' AND e.message_name LIKE '%Newsletter' GROUP BY e.message_name;" })],
      [2, () => ({ who: "theo", ask: "How many different people placed a paid Shopify order? Emails are as typed, so clean them first.", sql: "SELECT COUNT(DISTINCT LOWER(TRIM(email))) FROM shop_orders WHERE financial_status = 'paid';" })],
      [2, () => ({ who: "rosa", ask: "Every metric in kl_metrics with its number of events, 0 for the ones Fernhill never used. Name and events.", sql: "SELECT m.name, COUNT(e.id) FROM kl_metrics m LEFT JOIN kl_events e ON e.metric_id = m.id GROUP BY m.name;" })],
      [2, (r) => { const m = pick(r, ["August", "September", "October"]); return { who: "rosa", ask: `Who opened the ${m} Newsletter? Email only.`, sql: `SELECT e.profile_email FROM kl_events e JOIN kl_metrics m ON m.id = e.metric_id WHERE m.name = 'Opened Email' AND e.message_name = '${m} Newsletter';` }; }],
      [3, () => ({ who: "rosa", ask: "Everyone who clicked the October Newsletter, with their paid Shopify orders from the click day to 5 days after. Email and orders, 0 if none.", sql: "SELECT e.profile_email, COUNT(o.name) FROM kl_events e JOIN kl_metrics m ON m.id = e.metric_id LEFT JOIN shop_orders o ON LOWER(TRIM(o.email)) = e.profile_email AND o.financial_status = 'paid' AND substr(o.created_at, 1, 10) BETWEEN date(e.datetime) AND date(e.datetime, '+5 days') WHERE m.name = 'Clicked Email' AND e.message_name = 'October Newsletter' GROUP BY e.profile_email;",
        base: "SELECT e.profile_email, e.datetime FROM kl_events e JOIN kl_metrics m ON m.id = e.metric_id WHERE m.name = 'Clicked Email' AND e.message_name = 'October Newsletter';", hint: "LEFT JOIN shop_orders on the cleaned email, with paid and the day window in ON too, then count per person.",
        marks: [["0 if none", "left"], ["to 5 days after", "dates"]] })],
      [3, () => ({ who: "hank", ask: "Paid Shopify revenue per month in dollars, biggest month first. Month as 2026-08, and revenue.", sql: "SELECT substr(created_at, 1, 7) AS month, SUM(CAST(total_price AS REAL)) FROM shop_orders WHERE financial_status = 'paid' GROUP BY month ORDER BY 2 DESC;", ordered: 1,
        base: "SELECT substr(created_at, 1, 7) AS month, COUNT(*) FROM shop_orders GROUP BY month;", hint: "Only paid orders, the dollars as numbers, then sort by the second column.",
        marks: [["Paid", "where"], ["biggest month first", "order"]] })],
      [4, () => ({ who: "dana", ask: "Shopify orders that used a discount code: name and the code.", sql: "SELECT name, discount_code FROM shop_orders WHERE discount_code != '';",
        bad: "SELECT name, discount_code FROM shop_orders WHERE discount_code IS NOT NULL;", trap: "Shopify writes a missing code as '', empty text, not NULL. So IS NOT NULL keeps every order. Test for <code>!= ''</code>." })],
      [4, (r) => { const n = cleanLimit(r, SHOP.orders.filter((o) => o[4] === "paid").map((o) => o[2]), true, [3, 4, 5]); return { who: "hank", ask: `The ${n} biggest paid Shopify orders: name and total_price, biggest first.`, sql: `SELECT name, total_price FROM shop_orders WHERE financial_status = 'paid' ORDER BY CAST(total_price AS REAL) DESC LIMIT ${n};`, ordered: 1,
        bad: `SELECT name, total_price FROM shop_orders WHERE financial_status = 'paid' ORDER BY total_price DESC LIMIT ${n};`, trap: "total_price is text, so it sorts like words: '87.00' comes before '145.00', because 8 beats 1. CAST it to a number to sort it." }; }],
      [4, () => ({ who: "theo", ask: "How many different people placed a paid Shopify order? Emails are as typed.", sql: "SELECT COUNT(DISTINCT LOWER(TRIM(email))) FROM shop_orders WHERE financial_status = 'paid';",
        bad: "SELECT COUNT(DISTINCT email) FROM shop_orders WHERE financial_status = 'paid';", trap: "The same person typed their email with a capital one time and without it the next, or with a space at the end. DISTINCT sees two people. LOWER(TRIM(email)) first." })],
      [4, () => ({ who: "rosa", ask: "Everyone who clicked the October Newsletter, with their paid Shopify orders from the click day to 5 days after. Email and orders, 0 if none.", sql: "SELECT e.profile_email, COUNT(o.name) FROM kl_events e JOIN kl_metrics m ON m.id = e.metric_id LEFT JOIN shop_orders o ON LOWER(TRIM(o.email)) = e.profile_email AND o.financial_status = 'paid' AND substr(o.created_at, 1, 10) BETWEEN date(e.datetime) AND date(e.datetime, '+5 days') WHERE m.name = 'Clicked Email' AND e.message_name = 'October Newsletter' GROUP BY e.profile_email;",
        bad: "SELECT e.profile_email, COUNT(o.name) FROM kl_events e JOIN kl_metrics m ON m.id = e.metric_id LEFT JOIN shop_orders o ON o.email = e.profile_email AND o.financial_status = 'paid' AND substr(o.created_at, 1, 10) BETWEEN date(e.datetime) AND date(e.datetime, '+5 days') WHERE m.name = 'Clicked Email' AND e.message_name = 'October Newsletter' GROUP BY e.profile_email;", trap: "Klaviyo stores emails in small letters. Shopify keeps them as typed, so 'Ava.Brooks@…' never equals 'ava.brooks@…' and those orders vanish. Join on LOWER(TRIM(o.email))." })],
    ] },
];
// Case E: one newsletter's money from the two exports alone
const KLM = (name) => `kl_events e JOIN kl_metrics m ON m.id = e.metric_id WHERE m.name = '${name}'`;
const caseE = { id: "caseE", kind: "case", group: "Case E · the new tools", name: "Case E: the new tools", word: "one newsletter's money, from two exports",
  lesson: { owner: "The agency sent raw Shopify and Klaviyo exports and no dashboards. I need what one newsletter earned per person it reached, from the exports alone.",
    frank: "No files of ours, no friends in the building. Two boxes of somebody else's paperwork. Same job.",
    lines: ["Everything from Unit F: look up the codes, clean the emails, numbers that are text, the shop's day in created_at. And revenue per recipient from Metric 2.",
      "Run 1 is <b>guided</b>, run 2 <b>hinted</b>, run 3 <b>solo</b>. A clean solo run closes the case."],
    example: "SELECT id, name FROM kl_metrics;" },
  tpl: [1, 2, 3].map((tier) => [tier, (r) => {
    // each run reads a different month's newsletter with a different click window, so the solo run isn't a retype
    const M = pick(r, ["August", "September", "October"]), D = pick(r, [3, 5, 7]), NL = `e.message_name = '${M} Newsletter'`;
    const ON = `LOWER(TRIM(o.email)) = e.profile_email AND o.financial_status = 'paid' AND substr(o.created_at, 1, 10) BETWEEN date(e.datetime) AND date(e.datetime, '+${D} days')`;
    const money = `SELECT (SELECT COALESCE(SUM(CAST(o.total_price AS REAL)), 0) FROM ${KLM("Clicked Email").replace(" WHERE", ` JOIN shop_orders o ON ${ON} WHERE`)} AND ${NL}) / (SELECT COUNT(DISTINCT e.profile_email) FROM ${KLM("Received Email")} AND ${NL});`;
    return { who: "rosa", ask: `What did the ${M} Newsletter earn per person it reached? Paid orders within ${D} days of a click count. Five steps.`, sql: money,
      steps: [
        { ask: "metric_id is a code. Every metric: id and name.", sql: "SELECT id, name FROM kl_metrics;", hint: "The codes live in kl_metrics." },
        { ask: `How many different people received the ${M} Newsletter?`, sql: `SELECT COUNT(DISTINCT e.profile_email) FROM ${KLM("Received Email")} AND ${NL};`, hint: "JOIN kl_metrics to read the code, then COUNT(DISTINCT profile_email)." },
        { ask: "Who clicked it, and on what day? Email and the day.", sql: `SELECT e.profile_email, date(e.datetime) FROM ${KLM("Clicked Email")} AND ${NL};`, hint: "Klaviyo's datetime is UTC, and here every click lands on the same day as the shop's. date(e.datetime) is the day." },
        { ask: `Their paid Shopify orders from the click day to ${D} days after: order name and total_price.`, sql: `SELECT o.name, o.total_price FROM ${KLM("Clicked Email").replace(" WHERE", ` JOIN shop_orders o ON ${ON} WHERE`)} AND ${NL};`, hint: "JOIN shop_orders on LOWER(TRIM(o.email)) = e.profile_email, paid, and substr(o.created_at, 1, 10) BETWEEN the click day and date(…, '+N days')." },
        { ask: "Revenue per recipient: those orders' dollars ÷ the people who received it. One query.", sql: money, tol: 0.01, hint: "SELECT (SELECT SUM(CAST(total_price AS REAL)) …) / (SELECT COUNT(DISTINCT …) …);" },
      ] };
  }]) };
// the case file: the real Hillstrom test (Brent's q_hill, lifecycle-sql-segmentation/analysis/candidates/q_hill.sql)
const PAST = "CASE WHEN m.mens = 1 AND m.womens = 1 THEN 'Bought both' WHEN m.mens = 1 THEN 'Bought menswear' ELSE 'Bought womenswear' END";
const QHILL = (y) => `WITH holdout AS (SELECT mens, womens, 100.0 * AVG(${y}) AS no_email_pct FROM hillstrom WHERE segment = 'No E-Mail' GROUP BY mens, womens), mailed AS (SELECT mens, womens, segment AS email_sent, COUNT(*) AS people, 100.0 * AVG(${y}) AS mailed_pct FROM hillstrom WHERE segment <> 'No E-Mail' GROUP BY mens, womens, segment) SELECT ${PAST} AS past_purchase, m.email_sent, m.people, ROUND(m.mailed_pct, 1) AS mailed_pct, ROUND(h.no_email_pct, 1) AS holdout_pct, ROUND(m.mailed_pct - h.no_email_pct, 1) AS lift_pts FROM mailed m JOIN holdout h ON h.mens = m.mens AND h.womens = m.womens ORDER BY past_purchase, m.email_sent;`;
const NOISE = (y, em, where = "") => `WITH g AS (SELECT segment, COUNT(*) AS n, AVG(${y}) AS p FROM hillstrom${where} GROUP BY segment) SELECT a.p - b.p AS gap, 2 * sqrt(a.p * (1 - a.p) / a.n + b.p * (1 - b.p) / b.n) AS noise FROM g a JOIN g b ON a.segment = '${em}' AND b.segment = 'No E-Mail';`;
const caseH = { id: "hill", kind: "case", group: "Case file · the real email test", name: "Case file: the real email test", word: "64,000 real customers, three groups, one lift table",
  lesson: { owner: "This one's real. In 2008 a clothing shop split 64,000 customers at random: a third got a men's email, a third a women's, a third nothing. Here are 10,000 of them. Which email worked, and for whom?",
    frank: "Real data. Nobody made it up to teach you a lesson. That's exactly why it's worth reading slowly.",
    lines: ["A new card, <code>hillstrom</code>: one row per customer. <code>segment</code> is the group. <code>visit</code> and <code>conversion</code> are 1 or 0 for the two weeks after the email, <code>spend</code> is dollars. <code>mens</code> and <code>womens</code> are 1 if they bought that line in the year before.",
      "It's Metric 3 on real people: No E-Mail is the held-out group, so the gap is what the email did. Then the noise check, and the lift table from your portfolio (q_hill), which joins two stages on two keys.",
      "Real exports have real typos. Look at a text column's values before you filter on it: zip_code says 'Surburban'.",
      "Run 1 is <b>guided</b>, run 2 <b>hinted</b>, run 3 <b>solo</b>. A clean solo run closes the case file.",
      "Data: Kevin Hillstrom, MineThatData E-Mail Analytics and Data Mining Challenge (2008). Two random samples of his 64,000 rows."],
    example: "SELECT segment, COUNT(*) AS people, ROUND(100.0 * AVG(visit), 1) AS visit_pct FROM hillstrom GROUP BY segment;" },
  tpl: [1, 2, 3].map((tier) => [tier, (r) => {
    // each run reads a different outcome and email, so the solo run isn't a retype
    const y = pick(r, ["visit", "conversion"]), em = pick(r, ["Mens E-Mail", "Womens E-Mail"]), [who, w] = pick(r, [["menswear only", " WHERE mens = 1 AND womens = 0"], ["womenswear only", " WHERE womens = 1 AND mens = 0"], ["both", " WHERE mens = 1 AND womens = 1"]]);
    const call = NOISE(y, em, w).replace(/SELECT a\.p - b\.p AS gap, (2 \* sqrt\(.*\)) AS noise FROM/, "SELECT a.p - b.p AS gap, $1 AS noise, a.p - b.p - $1 AS margin FROM");
    return { who: "priya", ask: `Did the ${em === "Mens E-Mail" ? "men's" : "women's"} email really raise ${y === "visit" ? "visits" : "purchases"}, and for whom? Five steps.`, sql: call,
      steps: [
        { ask: "What groups are there? segment and people.", sql: "SELECT segment, COUNT(*) FROM hillstrom GROUP BY segment;", hint: "One row per group: GROUP BY segment." },
        { ask: `The ${y} rate per group, as a percent to two decimals. segment, people and the percent.`, sql: `SELECT segment, COUNT(*), ROUND(100.0 * AVG(${y}), 2) FROM hillstrom GROUP BY segment;`, hint: `${y} is 1 or 0, so AVG(${y}) is the share.` },
        { ask: `Is the ${em} gap over No E-Mail bigger than the noise? The gap and the noise, as shares (not percents).`, sql: NOISE(y, em), tol: 0.0001, hint: "A stage g with n and p per segment, then g a JOIN g b, one row each. Noise = 2 × sqrt(pA(1 − pA)/nA + pB(1 − pB)/nB)." },
        { ask: `Your portfolio's lift table (q_hill) for ${y}: per past purchase (both, menswear, womenswear) and email sent, the people, the ${y} percent, No E-Mail's percent for the same past purchase, and the lift in points, all to one decimal.`, sql: QHILL(y), hint: "Stage holdout: per mens, womens, No E-Mail only. Stage mailed: per mens, womens and segment. Join them on both mens and womens." },
        { ask: `For people who bought ${who} before: is the ${em} ${y} gap over No E-Mail real? The gap, the noise, and the gap minus the noise (above 0 means real).`, sql: call, tol: 0.0001, hint: "The noise check from step 3, with a WHERE in stage g. The margin is the gap minus the noise." },
      ] };
  }]) };

for (const s of [...NEW, ...CASES, ...UNIT_C, ...METRIC23, caseC, ...UNIT_D, ...PIPES_I, ...METRIC45, ...METRIC67, caseD, ...UNIT_E, ...BONUS, ...PIPES, caseF, ...UNIT_F, caseE, caseH]) {
  s.tier = s.tpl.map(([t]) => t); s.tpl = s.tpl.map(([, f]) => f); s.top = Math.max(...s.tier);
  s.intros = s.tpl.map((f, i) => [i, f(rng(1)).intro]).filter(([, k]) => k);
  if (s.kind === "case") s.rule = { practice: 0, climb: 1, pass: [1, 1] };
}
// the track, in order. Each unit's case comes before the next unit (Brent, 2026-10-26: a case gates the next unit)
const UNIT_A = ["select", "where", "order", "andor", "inlike"];
for (const p of PARTS) p.group = UNIT_A.includes(p.id) ? "Unit A · Rows" : "Unit B · Numbers";
PARTS.splice(0, PARTS.length, ...PARTS.slice(0, 5), CASES[0], ...PARTS.slice(5), ...NEW, CASES[1], ...UNIT_C, ...METRIC23, caseC, ...UNIT_D.slice(0, 5), ...PIPES_I, ...UNIT_D.slice(5), ...METRIC45, ...METRIC67, caseD, ...UNIT_E, ...BONUS, ...PIPES, caseF, ...UNIT_F, caseE, caseH);
for (const s of PARTS) s.label = s.kind === "case" ? s.name.split(":")[0] : s.kind === "metric" ? `Metric ${s.metric} · step ${s.step}` : s.kind === "pipe" ? `Pipeline ${s.step}` : `Part ${s.n}`;

export const PART = Object.fromEntries(PARTS.map((p) => [p.id, p]));
// SQL Gauntlet's order for the parts not built here yet (shown in the day list as "coming")
export const LATER = ["Bonus case · RFM segments", "Bonus case · what sells together"];
// a table's columns as the card shows them on a step: a column arrives with the step that teaches it (status, Metric 1)
// from Unit C on, a step runs on the grown shop
export const isBig = (step) => PARTS.findIndex((p) => p.id === step) >= PARTS.findIndex((p) => p.id === "newboard");
// a table arrives with the step that teaches it too (ad_spend, Metric 6)
const here = (from, step) => { const at = PARTS.findIndex((p) => p.id === step); return !from || at < 0 || PARTS.findIndex((p) => p.id === from) <= at; };
export const tablesFor = (step) => isBig(step) ? Object.fromEntries(Object.entries(TABLES2).filter(([, t]) => here(t.from, step))) : TABLES;
export const linksFor = (step) => isBig(step) ? LINKS.filter(([t]) => tablesFor(step)[t]) : [["orders", "customer_id", "customers", "id"]];
export function colsFor(table, step) {
  const at = PARTS.findIndex((p) => p.id === step);
  return tablesFor(step)[table].cols.filter(([, , from]) => here(from, step));
}

// ---------- reps and the pass rule (SQL-CURRICULUM.md, "A part: four tiers") ----------
// 2 practice reps with the example showing, then climb the part's tiers: 2 clean in a row (no help) moves up one.
// At the top tier, half the reps are traps and half are the tier below. 4 clean of the last 5 unhelped at the top,
// ending clean, with a trap among the clean ones, passes. A miss comes back 2 reps later; you never drop a tier.
export const PRACTICE = 2, CLIMB = 2, PASS = [4, 5];
export const TIER_NAME = { 1: "Same shape", 2: "New angle", 3: "With what you know", 4: "The trap" };
export function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; }; }
// a step's rule: parts use the defaults; a chain step and a case need fewer, longer reps
export const rule = (part) => ({ practice: PRACTICE, climb: CLIMB, pass: PASS, ...(PART[part].rule || {}) });
export const MODES = { 1: "guided", 2: "hinted", 3: "solo" };
// what a tier is called on the desk's ladder: parts climb to the trap, metric steps Fill, Write, Fix, cases guided to solo
export const tierName = (part, n) => (PART[part].kind === "case" ? { 1: "Guided", 2: "Hinted", 3: "Solo" } : PART[part].kind === "pipe" ? { 1: "One stage", 2: "Stage by stage", 3: "From the plan", 4: "From the brief" } : PART[part].rule ? { 1: "Guided", 2: "On your own" }
  : PART[part].kind === "metric" ? { 1: "Fill", 2: "Write", 4: "Fix" } : TIER_NAME)[n];
export const levels = (part) => [...new Set(PART[part].tier)].sort((a, b) => a - b);
export const tierOf = (part, st) => levels(part)[Math.min(st.lv || 0, levels(part).length - 1)];
// the next template. seen: the clause sets this player has already built clean (first sight, SQL-CURRICULUM.md)
// a twin of a missed request (SQL-MISSES.md, research 23: an example, then a problem of the same shape): the same
// request with one value changed, or the template drawn again, or a sibling on the same tier that keeps the trap and
// uses the clause that broke. check(t) (the desk's database) says a candidate has rows and its trap still fails
const SWAP = [CITIES, ITEMS, ["subscriber", "one-time"], ["welcome", "cart", "winback", "campaign"], ["google", "instagram", "podcast", "referral"], ["September", "October", "August"]];
const TEXT_FIELDS = ["ask", "trap", "hint"], SQL_FIELDS = ["sql", "bad", "base", "fill", "show"];
export function swapVariants(t) {
  const out = [], esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const make = (fs, fq) => { const x = { ...t }; for (const k of TEXT_FIELDS) if (x[k]) x[k] = fs(x[k]); for (const k of SQL_FIELDS) if (x[k]) x[k] = fq(x[k]);
    if (x.marks) x.marks = x.marks.map(([ph, c]) => [fs(ph), c]); if (x.foreign) x.foreign = [x.foreign[0], fq(x.foreign[1])]; return x; };
  for (const m of t.sql.matchAll(/'([^']+)'/g)) {
    const v = m[1], d = SWAP.find((d) => d.includes(v)); if (!d || !t.ask.includes(v)) continue;
    for (const w of d) if (w !== v && !t.sql.includes(`'${w}'`) && !t.ask.includes(w)) out.push(make((s) => s.split(v).join(w), (q) => q.split(`'${v}'`).join(`'${w}'`)));
  }
  for (const m of t.sql.matchAll(/([<>]=?)\s*(\d+)\b/g)) {
    const n = +m[2]; if (n < 3 || !new RegExp(`(\\$|\\b)${n}\\b`).test(t.ask)) continue;
    for (const k of [n + 5, n - 5, Math.round(n * 1.5)].filter((k) => k > 0 && k !== n)) {
      const cmp = new RegExp(`${esc(m[1])}\\s*${n}\\b`, "g");
      out.push(make((s) => s.replace(new RegExp(`(\\$?)\\b${n}\\b`, "g"), `$1${k}`), (q) => q.replace(cmp, `${m[1]} ${k}`)));
    }
  }
  return out.filter((x) => x.ask !== t.ask);
}
function twinOf(P, due, r, check) {
  const base = P.tpl[due.ti](r);
  if (base.steps) return [due.ti, base];
  const fine = (x) => x.ask !== due.ask && (!check || check(x));
  const sw = shuffle(r, swapVariants(base)).find(fine); if (sw) return [due.ti, sw];
  for (let k = 0; k < 8; k++) { const x = P.tpl[due.ti](r); if (fine(x)) return [due.ti, x]; }
  // siblings: the same tier and the same kind of rep first (a trap for a trap), then any request in the step on the
  // nearest tier (a metric step's traps share one ask, so their twin is a Write)
  const all = P.tier.map((tt, i) => i).filter((i) => i !== due.ti).map((i) => [i, P.tpl[i](r)]).filter(([, x]) => !x.steps && fine(x));
  const usesIt = (x) => due.part && clauses(x.sql).split("+").includes(due.part), tierOff = ([i]) => Math.abs(P.tier[i] - P.tier[due.ti]);
  for (const ok of [([i, x]) => P.tier[i] === P.tier[due.ti] && !!x.bad === !!base.bad && !!x.kind === !!base.kind, ([i]) => P.tier[i] === P.tier[due.ti], () => true]) {
    const c = all.filter(ok); if (!c.length) continue;
    const near = c.filter((x) => tierOff(x) === Math.min(...c.map(tierOff))), pref = near.filter(([, x]) => usesIt(x));
    return pick(r, pref.length ? pref : near);
  }
  return [due.ti, base];
}
export function nextRep(part, st, r, seen = new Set(), check) {
  const P = PART[part], due = (st.again || []).find((a) => st.reps.length >= a.due);
  // a first look at syntax the step needs and no part taught (self-join, MAX(a, b), the month list): an Extend before
  // anything else, in template order, until he gets it right. It doesn't count toward practice or the climb
  // (one on a higher tier waits until he reaches that tier)
  const early = st.reps.filter((x) => !x.intro).length < rule(part).practice;
  const fresh = !due && (P.intros || []).find(([i, k]) => !(st.intros || []).includes(k) && (P.tier[i] === levels(part)[0] || (!early && P.tier[i] <= tierOf(part, st))));
  const practice = !fresh && early, tier = practice ? levels(part)[0] : tierOf(part, st);
  let ti, opts = [];
  if (due) { ti = due.ti; st.again = st.again.filter((a) => a !== due); }
  else if (fresh) ti = fresh[0];
  else {
    const top = !practice && tier === 4 && levels(part).length > 1;
    // at the top tier: a trap every other rep, the tier below between them
    const want = top ? (st.reps.length % 2 ? tier : levels(part).at(-2)) : tier;
    const last = st.reps.length ? st.reps.at(-1).ti : -1;
    opts = P.tier.map((t, i) => t === want ? i : -1).filter((i) => i >= 0);
    if (opts.length > 1) opts = opts.filter((i) => i !== last);
    ti = pick(r, opts);
  }
  let t = P.tpl[ti](r);
  if (due && due.twin) [ti, t] = twinOf(P, due, r, check);
  // no request twice in a step (the critique found 41% repeats): draw again, unless it's a miss coming back or a trap
  // when every request of the tier has been seen, the one seen longest ago (a spaced repeat beats an immediate one)
  // a pipeline compares by its shape, so the brief tier draws a shape not seen yet rather than new thresholds
  const asked = st.asked || [], age = (x) => asked.lastIndexOf(x.shape || x.ask);
  if (!due && !fresh && !t.bad && age(t) >= 0) {
    let best = [ti, t];
    for (let k = 0; k < 12 && age(best[1]) >= 0; k++) { const i = pick(r, opts), x = P.tpl[i](r); if (age(x) < age(best[1])) best = [i, x]; }
    [ti, t] = best;
  }
  const set = clauses(t.show || t.sql);
  if (fresh) return { part, ti, tier: P.tier[ti], ...t, kind: "extend", mode: null, set, practice: false, intro: fresh[1] };
  const twin = !!(due && due.twin && !t.steps);
  let kind = "write", mode = null;
  if (t.steps) { kind = "chain"; mode = P.kind === "case" ? MODES[P.tier[ti]] : P.tier[ti] === 1 ? "guided" : P.kind === "pipe" ? "hinted" : "solo"; }
  else if (t.kind) kind = t.kind;                       // predict, or a fix every time (a scrambled query)
  else if (t.base && !seen.has(set)) kind = "extend";
  else if (t.fill) kind = "fill";
  else if (t.bad) kind = st.reps.filter((x) => x.ti === ti).length % 2 ? "write" : "fix";   // a trap's first showing is a coworker's query to mend
  // a metric Write whose long stages he has already built clean: those stages come pinned, he types the rest
  if (kind === "write" && P.kind === "metric" && P.tier[ti] === 2 && !due) { const p = pinned(t, seen); if (p) { t = p; kind = "chain"; mode = "pinned"; } }
  return { part, ti, tier: P.tier[ti], ...t, intro: undefined, kind, mode, set, practice, ...(twin ? { twin: true } : {}) };
}
// the stages of a WITH query: [[name, body]] and the final SELECT. null for anything else (WITH RECURSIVE too)
export function withStages(q) {
  const m = q.match(/^\s*WITH\s+(?!RECURSIVE\b)/i); if (!m) return null;
  let i = m[0].length; const out = [];
  for (;;) {
    const h = q.slice(i).match(/^(\w+)\s+AS\s*\(/i); if (!h) return null;
    let j = i + h[0].length, d = 1;
    for (; j < q.length && d; j++) { if (q[j] === "'") { j = q.indexOf("'", j + 1); continue; } if (q[j] === "(") d++; else if (q[j] === ")") d--; }
    out.push([h[1], q.slice(i + h[0].length, j - 1)]); i = j;
    const c = q.slice(i).match(/^\s*,\s*/); if (!c) break; i += c[0].length;
  }
  return { stages: out, final: q.slice(i).trim() };
}
// a stage worth pinning: long enough that retyping it is copy-typing (the critique: Metric 4's r is 200 characters)
const LONG = 100;
export const stageKeys = (q) => (withStages(q)?.stages || []).filter(([, b]) => b.length >= LONG).map(([, b]) => "stage:" + b);
function pinned(t, seen) {
  const w = withStages(t.sql); if (!w) return null;
  let k = 0; while (k < w.stages.length && (w.stages[k][1].length < LONG || seen.has("stage:" + w.stages[k][1]))) k++;
  // pin up to the last long stage he has built; a short stage before it rides along
  while (k > 0 && !seen.has("stage:" + w.stages[k - 1][1])) k--;
  if (!k) return null;
  const pin = w.stages.slice(0, k), rest = w.stages.slice(k), d = (st) => st.map(([n, b]) => `${n} AS (${b})`).join(", ");
  const steps = pin.map(([n, b], i) => ({ ask: `Stage ${n}: pinned, you built it clean before.`, stage: n, pre: d(pin.slice(0, i)), sql: `WITH ${d(pin.slice(0, i + 1))} SELECT * FROM ${n};`, show: b, given: true }));
  steps.push({ ask: t.ask, final: true, pre: d(pin), sql: t.sql, show: (rest.length ? d(rest) + " " : "") + w.final, ordered: t.ordered, tol: t.tol, hint: rest.length ? `Type the new stages (${rest.map(([n]) => n).join(", ")}), then the final SELECT.` : "Type the final SELECT." });
  return { ...t, steps };
}
// st = { reps: [{ ti, tier, kind, ok, clean, help, practice }], lv, passed, again }
export function record(st, rep, ok, clean, help, at) {
  const P = PART[rep.part], L = levels(rep.part), R = rule(rep.part);
  st.reps.push({ ti: rep.ti, tier: rep.tier, kind: rep.kind, ok, clean, help: !!help, practice: !!rep.practice, ...(rep.intro ? { intro: rep.intro } : {}), ...(at ? { at } : {}) });
  if (rep.ask) st.asked = [...(st.asked || []), rep.shape || rep.ask].slice(-40);
  if (at) st.last = at;
  // a first look is done once he has typed it right, even from the answer; a miss on it gets a twin next
  if (rep.intro) { st.intros = [...(st.intros || []), rep.intro]; if (!clean) st.again = (st.again || []).concat({ ti: rep.ti, twin: true, ask: rep.ask, part: rep.missPart || null, due: st.reps.length }); return { justPassed: false, climbed: 0 }; }
  // a miss (or a right answer after a miss) gets a twin next; a miss that needed the answer comes back once more later.
  // A chain or a case just runs again
  if (!clean && !P.rule && !rep.steps) { const tw = { ti: rep.ti, twin: true, ask: rep.ask, part: rep.missPart || null };
    st.again = (st.again || []).filter((a) => !(a.twin && a.ask === rep.ask)).concat({ ...tw, due: st.reps.length }, ...(ok ? [] : [{ ...tw, due: st.reps.length + 4 }])); }
  st.lv = st.lv || 0;
  const was = !!st.passed, cur = L[st.lv];
  // a clean practice pair skips tier 1: he just showed the same shape twice (the critique's grind fix)
  const own = st.reps.filter((x) => !x.intro);
  if (rep.practice && st.lv === 0 && L.length > 1 && own.length === R.practice && own.every((x) => x.practice && x.clean)) { st.lv = 1; st.since = st.reps.length; return { justPassed: false, climbed: L[1] }; }
  const solo = own.filter((x) => !x.practice && !x.help);
  if (cur < P.top) {
    const run = solo.slice(-R.climb);
    if (run.length === R.climb && run.every((x) => x.clean && x.tier === cur)) { st.lv++; st.since = st.reps.length; }
  } else if (!was) {
    const top = st.reps.slice(st.since || 0).filter((x) => !x.practice && !x.help && !x.intro).slice(-R.pass[1]);
    const trapOk = P.top < 4 || top.some((x) => x.clean && x.tier === 4);
    if (top.length >= R.pass[0] && top.filter((x) => x.clean).length >= R.pass[0] && top.at(-1).clean && trapOk) st.passed = true;
  }
  return { justPassed: !was && !!st.passed, climbed: L[st.lv] !== cur ? L[st.lv] : 0 };
}
export const newState = () => ({ reps: [], lv: 0, passed: false, again: [] });

// ---------- grading: values, not names. Columns in any order; rows in any order unless the ask sorts them ----------
// numbers are checked to the cent, so ROUND(x, 2) and the raw division both pass
// (a rate under 1 keeps 4 places, so 0.0746 and 0.0714 stay different)
const cent = (v) => typeof v === "number" && !Number.isInteger(v) ? (Math.abs(v) < 1 ? Math.round(v * 1e4) / 1e4 : Math.round(v * 100) / 100) : v;
const key = (row) => JSON.stringify(row.map(cent));
// tol: a one-number answer may be off by this share (a chain's last step, typed from rounded numbers)
export function grade(mine, want, ordered, tol) {
  if (tol && want.rows.length === 1 && want.rows[0].length === 1 && mine.rows.length === 1 && mine.rows[0].length === 1) {
    const a = +mine.rows[0][0], b = +want.rows[0][0];
    return Math.abs(a - b) <= Math.abs(b) * tol + 0.005 ? { ok: true } : { ok: false, why: `Yours is ${cent(a)}. Check the numbers you carried over from the steps before.` };
  }
  if (!mine.rows.length && want.rows.length) return { ok: false, why: "No rows came back. Check the WHERE and HAVING tests and the spelling of the values." };
  const nc = mine.cols.length, wc = want.cols.length;
  if (nc !== wc) return { ok: false, why: `Yours has ${nc} column${nc === 1 ? "" : "s"}, the ask wants ${wc}. Show just what it names.` };
  // match columns by their values (so name, city and city, name both pass)
  const colVals = (o, i) => o.rows.map((r) => cent(r[i])).map(String).sort().join("|");
  const perm = []; const used = new Set();
  for (let i = 0; i < wc; i++) { const j = [...Array(nc).keys()].find((k) => !used.has(k) && colVals(mine, k) === colVals(want, i)); if (j == null) break; used.add(j); perm.push(j); }
  const re = perm.length === wc ? mine.rows.map((r) => perm.map((j) => r[j])) : mine.rows;
  if (re.length !== want.rows.length) return { ok: false, why: `Yours has ${re.length} row${re.length === 1 ? "" : "s"}, the ask wants ${want.rows.length}. Check each condition against the request.` };
  const a = re.map(key), b = want.rows.map(key);
  if (JSON.stringify(a.slice().sort()) !== JSON.stringify(b.slice().sort())) {
    // close but cut short: rounded to 2 places, or whole numbers divided into a whole number
    const as = (rows, f) => JSON.stringify(rows.map((r) => JSON.stringify(r.map((v) => typeof v === "number" ? f(v) : v))).sort());
    const r2 = (v) => Math.round(v * 100) / 100, r1 = (v) => Math.round(v * 10) / 10;
    if ([r2, r1].some((f) => as(re, f) === as(want.rows, f)) && want.rows.some((r) => r.some((v) => typeof v === "number" && Math.abs(v) < 1 && v !== r2(v))))
      return { ok: false, why: "Close: yours is rounded. A rate (a number under 1) is checked to 4 places. Leave it unrounded or use ROUND(x, 4)." };
    if (as(re, Math.trunc) === as(want.rows, Math.trunc) && re.some((r) => r.some((v) => Number.isInteger(v))) && want.rows.some((r) => r.some((v) => typeof v === "number" && !Number.isInteger(v))))
      return { ok: false, why: "Close: yours lost the decimals. A whole number divided by a whole number gives a whole number in SQLite. Multiply by 1.0 first." };
    return { ok: false, why: "Same number of rows, different values. Check the columns, and the values in your test." };
  }
  if (ordered != null && JSON.stringify(re.map((r) => cent(r[ordered]))) !== JSON.stringify(want.rows.map((r) => cent(r[ordered])))) return { ok: false, why: "The right rows, in the wrong order. Check ASC or DESC." };
  return { ok: true, swapped: perm.some((j, i) => j !== i) };
}
// the hidden shop: a sorted LIMIT can cut through a tie there, so then only the sorted column has to match
export function gradeHidden(mine, want, ordered, tol, limited) {
  const g = grade(mine, want, ordered, tol);
  if (g.ok || !limited || ordered == null || mine.rows.length !== want.rows.length) return g;
  const col = (o) => JSON.stringify(o.rows.map((r) => cent(r[ordered])));
  return mine.cols.length === want.cols.length && col(mine) === col(want) ? { ok: true } : g;
}
// a Predict rep: a typed number against the count
export function gradeNumber(text, want) {
  const n = Number(String(text).trim().replace(/[;,$]/g, ""));
  if (!String(text).trim() || Number.isNaN(n)) return { ok: false, why: "Type just the number." };
  return n === +want.rows[0][0] ? { ok: true } : { ok: false, why: `Not ${n}. Walk it through: how many rows does each step leave?` };
}
// every query a template asks for: one, or a chain's steps
export const reqs = (t) => t.steps || [t];
// a query's top-level clauses, by the word that opens each (strings and brackets skipped)
export function split(q) {
  q = q.trim().replace(/;\s*$/, "");
  const found = []; let depth = 0, inq = false;
  for (let i = 0; i < q.length; i++) {
    const ch = q[i];
    if (ch === "'") { inq = !inq; continue; }
    if (inq) continue;
    if (ch === "(") depth++; else if (ch === ")") depth--;
    else if (!depth && (i === 0 || /\s/.test(q[i - 1]))) { const m = /^(SELECT|FROM|WHERE|GROUP\s+BY|HAVING|ORDER\s+BY|LIMIT)\b/i.exec(q.slice(i)); if (m) found.push([m[1].toUpperCase().replace(/\s+/, " "), i, i + m[0].length]); }
  }
  if (!found.length || found[0][0] !== "SELECT" || found[0][1] !== 0) return null;
  const c = {}; found.forEach(([k, , e], j) => { c[k] = q.slice(e, j + 1 < found.length ? found[j + 1][1] : q.length).trim(); });
  return c.FROM ? c : null;
}
// the clause-by-clause replay (SQL-CURRICULUM.md): the query rebuilt in the order SQL runs it, one query per step,
// so the desk can show how many rows (or piles) are left after each
export function stages(q) {
  const c = split(q); if (!c) return null;
  let w = `FROM ${c.FROM}`; const out = [{ step: "FROM", sql: `SELECT * ${w}`, unit: "rows" }];
  if (c.WHERE) { w += ` WHERE ${c.WHERE}`; out.push({ step: "WHERE", sql: `SELECT * ${w}`, unit: "rows" }); }
  if (c["GROUP BY"]) { w += ` GROUP BY ${c["GROUP BY"]}`; out.push({ step: "GROUP BY", sql: `SELECT ${c.SELECT} ${w}`, unit: "piles" }); }   // SELECT's list, so a grouped alias resolves
  if (c.HAVING) { w += ` HAVING ${c.HAVING}`; out.push({ step: "HAVING", sql: `SELECT ${c.SELECT} ${w}`, unit: "piles" }); }
  out.push({ step: "SELECT", sql: `SELECT ${c.SELECT} ${w}`, unit: "rows" });
  if (c["ORDER BY"]) { w += ` ORDER BY ${c["ORDER BY"]}`; out.push({ step: "ORDER BY", sql: `SELECT ${c.SELECT} ${w}`, unit: "rows" }); }
  if (c.LIMIT) out.push({ step: "LIMIT", sql: `SELECT ${c.SELECT} ${w} LIMIT ${c.LIMIT}`, unit: "rows" });
  return out;
}
// a bare SELECT column that GROUP BY doesn't name: SQLite runs it and prints a random row's value (research 21)
export function ungrouped(q) {
  if (/\(\s*SELECT\b|^\s*WITH\b/i.test(q)) return null;   // nested queries: too many SELECTs for this simple read
  const s = q.replace(/'[^']*'/g, "''"), g = /\bGROUP BY\s+([\s\S]*?)(\bHAVING\b|\bORDER BY\b|\bLIMIT\b|;|$)/i.exec(s), sel = /\bSELECT\s+(?:DISTINCT\s+)?([\s\S]*?)\bFROM\b/i.exec(s);
  if (!g || !sel) return null;
  let d = 0, cur = "", items = [];
  for (const ch of sel[1]) { if (ch === "(") d++; if (ch === ")") d--; if (ch === "," && !d) { items.push(cur); cur = ""; } else cur += ch; }
  items.push(cur);
  // GROUP BY 1 means the first column in SELECT
  const by = new Set(g[1].split(",").map((x) => x.trim().toLowerCase()).filter(Boolean).map((x) => /^\d+$/.test(x) && items[x - 1] ? items[x - 1].replace(/\s+AS\s+\w+$/i, "").trim().toLowerCase() : x));
  for (const it of items.map((x) => x.trim())) { const col = it.replace(/\s+AS\s+\w+$/i, "").trim().toLowerCase(); if (/^[a-z_][\w.]*$/.test(col) && !by.has(col)) return col; }
  return null;
}
// the common slips, named, before the generic advice
export function slip(q, err) {
  if (err) {
    const col = /no such column: (\S+)/.exec(err);
    if (col) return /^[A-Z][a-z]/.test(col[1]) ? `<code>${col[1]}</code> needs single quotes: it's a value, not a column.` : `There's no column called <code>${col[1]}</code>. The columns are on the cards.`;
    if (/no such table/.test(err)) return "There's no table by that name. The tables are the cards on the board.";
    if (/misuse of aggregate/.test(err)) return "A total can't go in WHERE: WHERE runs before the piles exist. Test totals with HAVING, after GROUP BY.";
    if ((q.match(/'/g) || []).length % 2) return "A quote is missing. Text goes in single quotes: <code>'Boston'</code>.";
    if (/near "(WHERE|FROM|ORDER|LIMIT|GROUP)"/i.test(err)) return "Check the order: SELECT, FROM, WHERE, GROUP BY, ORDER BY, LIMIT.";
    return "SQLite couldn't run that. Check the spelling and the commas between columns.";
  }
  if (/"[^"]*"/.test(q)) return "Use single quotes for text. Double quotes mean a column name in SQL.";
  const c = split(q), alias = c && c.WHERE && [...c.SELECT.matchAll(/\bAS\s+(\w+)/gi)].map((m) => m[1]).find((a) => new RegExp(`\\b${a}\\b`, "i").test(c.WHERE.replace(/'[^']*'/g, "''")));
  if (alias) return `<code>${alias}</code> is a name made in SELECT, and SELECT runs after WHERE. SQLite lets it slide, most databases don't. Repeat the expression instead.`;
  const loose = ungrouped(q); if (loose) return `<code>${loose}</code> isn't grouped and isn't inside a total, so SQLite prints one random row's value. Group it or drop it.`;
  if (/(^|[^'\d])\d{4}-\d{2}-\d{2}/.test(q)) return "Dates need single quotes: <code>'2026-10-01'</code>. Without them SQL does the sum 2026 − 10 − 1.";
  return null;
}

// ---------- when a query is wrong (SQL-MISSES.md, research 23) ----------
// A slip is a typing mistake: it never counts as a try and never marks a concept. findSlip points at the spot.
// A concept miss runs and gives the wrong rows: diagnose() walks the debugging checklist against the key and stops at
// the first item that's off, so the hint ladder can point, teach, then show that one piece.
const KEYWORDS = ["SELECT", "FROM", "WHERE", "GROUP", "ORDER", "HAVING", "LIMIT", "JOIN", "LEFT", "INNER", "DISTINCT", "COUNT", "SUM", "AVG", "MIN", "MAX", "CASE", "WHEN", "THEN", "ELSE", "END", "WITH", "BETWEEN", "LIKE", "NULL", "NOT", "DESC", "UNION", "PARTITION", "OVER", "COALESCE", "ROUND", "JULIANDAY", "STRFTIME", "RECURSIVE", "USING", "CAST"];
// edit distance with swaps (WEHRE is one step from WHERE)
function dist(a, b) {
  a = a.toUpperCase(); b = b.toUpperCase();
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[a.length][b.length];
}
// a keyword typo: one edit, or two in a long word that starts with the same letter (WEHRE, SLECT), never a real name
const kwTypo = (w, names) => { if (!/^[A-Za-z_]+$/.test(w) || KEYWORDS.includes(w.toUpperCase()) || names.some((n) => n.toLowerCase() === w.toLowerCase())) return null;
  return KEYWORDS.map((k) => [k, dist(w, k)]).filter(([k, d]) => d === 1 || (d === 2 && w.length >= 5 && k[0] === w[0].toUpperCase())).sort((a, b) => a[1] - b[1])[0]?.[0] || null; };
const nearest = (w, list, max = 2) => list.filter((x) => x.toUpperCase() !== w.toUpperCase()).map((x) => [x, dist(w, x)]).filter(([x, k]) => k <= Math.min(max, Math.floor(x.length / 3) + 1)).sort((a, b) => a[1] - b[1])[0]?.[0];
// every text value in the data, so 'Bostn' can be told from a city that's really missing
const VOCAB = (() => { const v = new Set(); const add = (rows) => rows.forEach((r) => r.forEach((x) => { if (typeof x === "string" && !/^\d{4}-\d\d-\d\d/.test(x) && x.length < 30) v.add(x); }));
  add(CUSTOMERS); add(ORDERS); for (const k of Object.keys(SHOP)) if (Array.isArray(SHOP[k])) add(SHOP[k]); add(PRODUCTS); return [...v]; })();
const COLNAMES = [...new Set([...Object.values(TABLES), ...Object.values(TABLES2)].flatMap((t) => t.cols.map(([c]) => c)))];
const TABLENAMES = Object.keys(TABLES2);
const wordAt = (q, w) => { const m = new RegExp(`(^|[^\\w.])(${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(?![\\w])`, "i").exec(q); return m ? [m.index + m[1].length, m.index + m[1].length + m[2].length] : null; };
// a slip: { at: [start, end] in his query, or null, say }. err is SQLite's message when it couldn't run
export function findSlip(q, err, names = []) {
  const cols = [...new Set([...COLNAMES, ...names])];
  if (err) {
    let m;
    if ((m = /unrecognized token: "(.*)"/.exec(err)) && m[1].startsWith("'")) { const i = q.lastIndexOf(m[1]); return { at: [i, i + m[1].length], say: "This quote never closes. Text goes between two single quotes: <code>'Boston'</code>." }; }
    if ((m = /unrecognized token: "(.*)"/.exec(err))) { const i = q.indexOf(m[1]); return { at: i < 0 ? null : [i, i + m[1].length], say: `SQLite doesn't know <code>${m[1]}</code>. A stray character?` }; }
    if (/incomplete input/.test(err)) {
      if ((q.replace(/'[^']*'/g, "").match(/'/g) || []).length) { const i = q.lastIndexOf("'"); return { at: [i, q.length], say: "This quote never closes. Text goes between two single quotes." }; }
      const open = (q.match(/\(/g) || []).length - (q.match(/\)/g) || []).length, i = q.lastIndexOf("(");
      return { at: open > 0 && i >= 0 ? [i, i + 1] : [Math.max(0, q.trimEnd().length - 1), q.trimEnd().length], say: open > 0 ? `${open === 1 ? "A bracket opens here and never closes" : `${open} brackets never close`}. Add the <code>)</code>.` : "The query stops before it's finished." };
    }
    if ((m = /near "([^"]+)": syntax error/.exec(err))) {
      const w = m[1], at = wordAt(q, w) || [q.indexOf(w), q.indexOf(w) + w.length];
      const known = [...cols, ...TABLENAMES, ...names], kw = kwTypo(w, known);
      if (kw) return { at, say: `<code>${w}</code> looks like a typo for <code>${kw}</code>.` };
      // the word before can be the typo: "customers WEHRE city" reads WEHRE as a short name for customers
      const before = q.slice(0, at[0]).trimEnd(), prev = /([A-Za-z_]+)$/.exec(before), pk = prev && kwTypo(prev[1], known);
      if (pk) return { at: [prev.index, prev.index + prev[1].length], say: `<code>${prev[1]}</code> looks like a typo for <code>${pk}</code>.` };
      if ((q.match(/'/g) || []).length % 2) return { at, say: `A quote is missing near here, so the words after it got read as a value and <code>${w}</code> as code. Check that every value has a <code>'</code> on both sides.` };
      if (before.endsWith(",")) return { at: [before.length - 1, before.length], say: `A comma right before <code>${w}</code>. The last column in a list has no comma after it.` };
      if (/^(FROM|WHERE|GROUP|ORDER|HAVING|LIMIT|SELECT)$/i.test(w)) return { at, say: `SQLite didn't expect <code>${w}</code> here. Check the order (SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT) and a missing comma or bracket just before it.` };
      return { at, say: `SQLite got lost at <code>${w}</code>. The mistake is here or just before it: a missing comma, quote or bracket.` };
    }
    if ((m = /no such column: (\S+)/.exec(err))) {
      const w = m[1], bare = w.split(".").pop(), at = wordAt(q, w);
      if (/^[A-Z][a-z]/.test(bare) && !cols.includes(bare)) return { at, say: `<code>${bare}</code> needs single quotes: it's a value, not a column.` };
      const n = nearest(bare, cols, 2);
      return { at, say: n ? `There's no column <code>${w}</code>. Did you mean <code>${w.includes(".") ? w.split(".")[0] + "." : ""}${n}</code>?` : `There's no column <code>${w}</code>${w.includes(".") ? ` (or <code>${w.split(".")[0]}</code> isn't a short name in FROM)` : ""}. The columns are on the cards.` };
    }
    if ((m = /no such table: (\S+)/.exec(err))) { const n = nearest(m[1], [...TABLENAMES, ...names], 2); return { at: wordAt(q, m[1]), say: n ? `There's no table <code>${m[1]}</code>. Did you mean <code>${n}</code>?` : `There's no table <code>${m[1]}</code>. The tables are the cards on the board.` }; }
    if ((m = /ambiguous column name: (\S+)/.exec(err))) return { at: wordAt(q, m[1]), say: `Two tables have a <code>${m[1]}</code>. Say which with its short name: <code>o.${m[1]}</code> or <code>c.${m[1]}</code>.` };
    if (/misuse of aggregate/.test(err)) { const at = wordAt(q, "WHERE"); return { at, say: "A total can't go in WHERE: WHERE runs before the piles exist. Test totals with HAVING, after GROUP BY." }; }
    return { at: null, say: slip(q, err) };
  }
  // runs, but a slip changed it: a value one letter off from a real one, or a missing comma that renamed a column
  for (const m of q.matchAll(/'([^']*)'/g)) {
    const v = m[1]; if (!v || /^\d/.test(v) || VOCAB.includes(v) || v.includes("%")) continue;
    if (!/(=|<>|\bIN\s*\([^)]*)\s*$/i.test(q.slice(Math.max(0, m.index - 60), m.index))) continue;   // only a value he tests against, not a label he makes
    const cap = VOCAB.find((x) => x.toLowerCase() === v.toLowerCase());
    if (cap) return { at: [m.index, m.index + v.length + 2], say: `Nothing in the data is <code>'${v}'</code>, but there is <code>'${cap}'</code>. Inside quotes, capitals count.` };
    const n = nearest(v, VOCAB, 2); if (n) return { at: [m.index, m.index + v.length + 2], say: `Nothing in the data is <code>'${v}'</code>. Did you mean <code>'${n}'</code>? Values have to match exactly, capitals too.` };
  }
  const sel = /^\s*SELECT\s+(?:DISTINCT\s+)?([\s\S]*?)\s+FROM\b/i.exec(q);
  if (sel) for (const part of sel[1].split(",")) {
    const m = /^\s*([\w.]+)\s+(\w+)\s*$/.exec(part);
    if (m && !/^AS$/i.test(m[2]) && cols.includes(m[2]) && cols.includes(m[1].split(".").pop())) { const i = q.indexOf(part.trim()); return { at: [i, i + part.trim().length], say: `<code>${part.trim()}</code> has no comma, so SQL reads it as ${m[1]} renamed to ${m[2]}. Put a comma between them.` }; }
  }
  const s = slip(q);
  return s ? { at: null, say: s } : null;
}

// the debugging checklist (research 23): errors first, then the order SQL runs it
export const CHECKS = [["runs", "Does it run?"], ["grain", "One row is what?"], ["from", "FROM and JOIN"], ["where", "WHERE"], ["group", "GROUP BY"], ["having", "HAVING or WHERE"], ["select", "SELECT"], ["order", "ORDER BY and LIMIT"]];
export const CHECK_TIP = {
  grain: "Say what one row of each table, and of your result, stands for. One row per order, per customer, per email?",
  from: "The right tables? The keys in ON pointing at each other? LEFT JOIN where the ask keeps rows with no match? Count the rows right after the join.",
  where: "Is every condition from the ask there, and nothing extra? <code>&gt;</code> or <code>&gt;=</code>? AND and OR in brackets? A <code>!=</code> that quietly drops the NULLs?",
  group: "One row per what? GROUP BY exactly that, and every bare column in SELECT is in GROUP BY.",
  having: "Is the test about one row (WHERE) or about a pile's total (HAVING)?",
  select: "COUNT(*), COUNT(col) or COUNT(DISTINCT col)? A whole number divided by a whole number (use <code>* 1.0</code>)? A NULL in a total? The columns the ask names, and only those?",
  order: "Sorted by what the ask says, ASC or DESC? A LIMIT that matches the ask?",
};
// the part a checklist item marks when it's where the rows went off
const CHECK_PART = { from: "join", where: "where", group: "group", having: "having", select: "agg", order: "order", grain: "cte" };
export const tablesIn = (q) => [...new Set([...q.replace(/'[^']*'/g, "''").matchAll(/\b(?:FROM|JOIN)\s+(\w+)/gi)].map((m) => m[1].toLowerCase()))].filter((t) => TABLENAMES.includes(t) || TABLES[t]).sort();
const same = (a, b) => { try { return grade(a, b).ok; } catch (e) { return false; } };
// rows he has that the ask doesn't, and rows it wants that he lacks (up to 3 each), matched by values
export function rowDiff(mine, want, n = 3) {
  if (!mine || !want || mine.cols.length !== want.cols.length) return null;
  const k = (r) => JSON.stringify(r.map(cent).map(String).sort()), wk = new Map(), mk = new Map();
  want.rows.forEach((r) => wk.set(k(r), (wk.get(k(r)) || 0) + 1)); mine.rows.forEach((r) => mk.set(k(r), (mk.get(k(r)) || 0) + 1));
  const extra = mine.rows.filter((r) => { const c = wk.get(k(r)); if (c) { wk.set(k(r), c - 1); return false; } return true; });
  const missing = want.rows.filter((r) => { const c = mk.get(k(r)); if (c) { mk.set(k(r), c - 1); return false; } return true; });
  return { cols: want.cols, extra: extra.slice(0, n), missing: missing.slice(0, n), nExtra: extra.length, nMissing: missing.length };
}
// where a clause sits in his query, to highlight it
export function clauseSpan(q, key) {
  const c = split(q); if (!c || !c[key]) return null;
  const re = new RegExp(`\\b${key.replace(" ", "\\s+")}\\b`, "i"), i = q.search(re); if (i < 0) return null;
  return [i, q.indexOf(c[key], i) + c[key].length];
}
// the first checklist item where his query and the key part ways. run(sql) -> { cols, rows } (throws on an error)
// returns { item, part, say, clause (to highlight), keyPiece (the key's version, for the third hint), diff }
export function diagnose(mineQ, keyQ, run, ordered) {
  const strip = (q) => q.trim().replace(/;\s*$/, "");
  mineQ = strip(mineQ); keyQ = strip(keyQ);
  const mine = run(mineQ + ";"), want = run(keyQ + ";"), diff = rowDiff(mine, want);
  const out = (item, say, clause, keyPiece, extra = {}) => ({ item, part: CHECK_PART[item], say, clause, keyPiece, diff, ...extra });
  // a WITH query: stage by stage, by position
  const wm = withStages(mineQ), wk = withStages(keyQ);
  if (wm && wk) {
    for (let i = 0; i < Math.min(wm.stages.length, wk.stages.length); i++) {
      const [mn, mb] = wm.stages[i], [kn, kb] = wk.stages[i];
      const pre = (w, n) => `WITH ${w.stages.slice(0, i + 1).map(([a, b]) => `${a} AS (${b})`).join(", ")} SELECT * FROM ${n};`;
      let a, b; try { a = run(pre(wm, mn)); b = run(pre(wk, kn)); } catch (e) { break; }
      if (a.rows.length === b.rows.length && same(a, b)) continue;
      // the first stage that's off: run the checklist inside it, on top of the stages before it (those agree)
      const before = i ? `WITH ${wm.stages.slice(0, i).map(([x, y]) => `${x} AS (${y})`).join(", ")} ` : "";
      let d = null; try { d = diagnose(mb, kb, (q) => run(before + q), false); } catch (e) { /* the stage can't be checked alone */ }
      if (d && d.item !== "select") return { ...d, item: d.item === "group" ? "grain" : d.item, part: CHECK_PART[d.item], say: `Stage <code>${mn}</code>: ${d.say}`, clause: i ? null : d.clause, stage: mn };
      if (a.rows.length !== b.rows.length) return out("grain", `Stage <code>${mn}</code> has ${a.rows.length} rows. The ask's matching stage has ${b.rows.length}. One row per what?`, null, `${kn} AS (${kb})`, { stage: mn });
      return out("grain", `Stage <code>${mn}</code> has the right number of rows, but different values. Check its columns and tests.`, null, `${kn} AS (${kb})`, { stage: mn });
    }
    if (wm.stages.length !== wk.stages.length) return out("grain", `Yours has ${wm.stages.length} stage${wm.stages.length === 1 ? "" : "s"}, the ask's has ${wk.stages.length}. What does each stage hold?`, null, null);
    // the stages agree: the final SELECT is off
    const finalOf = (w) => w.final, pre = (w) => `WITH ${w.stages.map(([a, b]) => `${a} AS (${b})`).join(", ")} `;
    const d = diagnose(finalOf(wm), finalOf(wk), (q) => run(pre(wm) + q), ordered);
    return { ...d, diff, clause: null };
  }
  const ok = (q) => { try { run(q); return true; } catch (e) { return false; } };
  const tm = tablesIn(mineQ), tk = tablesIn(keyQ);
  if (tm.join() !== tk.join()) {
    const miss = tk.filter((t) => !tm.includes(t)), extra = tm.filter((t) => !tk.includes(t));
    return out("from", `The tables: ${miss.length ? `the ask needs <code>${miss.join("</code>, <code>")}</code>` : ""}${miss.length && extra.length ? ", and " : ""}${extra.length ? `<code>${extra.join("</code>, <code>")}</code> isn't needed` : ""}.`, "FROM", split(keyQ)?.FROM && `FROM ${split(keyQ).FROM}`);
  }
  const sm = stages(mineQ), sk = stages(keyQ);
  if (sm && sk && sm.every((x) => ok(x.sql)) && sk.every((x) => ok(x.sql))) {
    const at = (st, step) => { const order = ["FROM", "WHERE", "GROUP BY", "HAVING"]; let last = st[0]; for (const s of order.slice(0, order.indexOf(step) + 1)) { const f = st.find((x) => x.step === s); if (f) last = f; } return last; };
    const ck = { FROM: "from", WHERE: "where", "GROUP BY": "group", HAVING: "having" }, km = split(mineQ), kk = split(keyQ);
    for (const step of ["FROM", "WHERE", "GROUP BY", "HAVING"]) {
      if (!sm.some((x) => x.step === step) && !sk.some((x) => x.step === step)) continue;
      const a = run(at(sm, step).sql), b = run(at(sk, step).sql), unit = step === "GROUP BY" || step === "HAVING" ? "piles" : "rows";
      const piece = kk[step] ? `${step} ${kk[step]}` : `(no ${step})`;
      if (a.rows.length !== b.rows.length) return out(ck[step], `Rows after ${step}: yours has ${a.rows.length} ${unit}, the ask's has ${b.rows.length}.`, km[step] ? step : null, piece);
      if ((step === "FROM" || step === "WHERE") && !same(a, b)) return out(ck[step], `Rows after ${step}: the same count, but not the same rows. A test is picking the wrong ones.`, km[step] ? step : null, piece);
    }
    // the rows before ORDER BY and LIMIT agree: the sort or the cut is what's off
    const selOf = (st) => st.find((x) => x.step === "SELECT");
    if ((km["ORDER BY"] || km.LIMIT || kk["ORDER BY"] || kk.LIMIT) && same(run(selOf(sm).sql), run(selOf(sk).sql)))
      return out("order", grade(mine, want, ordered).why === "The right rows, in the wrong order. Check ASC or DESC." ? "The right rows, in the wrong order. Check ASC or DESC." : "The rows before the sort are right. The sort or the LIMIT picks the wrong ones: check ASC or DESC, and the number.", km["ORDER BY"] ? "ORDER BY" : km.LIMIT ? "LIMIT" : null, [kk["ORDER BY"] && `ORDER BY ${kk["ORDER BY"]}`, kk.LIMIT && `LIMIT ${kk.LIMIT}`].filter(Boolean).join(" ") || null);
    if (mine.cols.length !== want.cols.length || !grade(mine, want).ok) return out("select", grade(mine, want).why || "The rows are right, the columns aren't.", "SELECT", `SELECT ${kk.SELECT}`);
    const g = grade(mine, want, ordered);
    if (!g.ok) return out("order", g.why, km["ORDER BY"] ? "ORDER BY" : km.LIMIT ? "LIMIT" : null, [kk["ORDER BY"] && `ORDER BY ${kk["ORDER BY"]}`, kk.LIMIT && `LIMIT ${kk.LIMIT}`].filter(Boolean).join(" ") || null);
    return out("select", grade(mine, want, ordered).why || "Something in SELECT is off.", "SELECT", `SELECT ${kk.SELECT}`);
  }
  // a shape the replay can't split (a subquery in FROM, a WITH on one side only): the grader's reason
  const g = grade(mine, want, ordered);
  return out(mine.rows.length !== want.rows.length ? "where" : "select", g.why || "Something's off.", null, null);
}

// ---------- review (Brent, 2026-10-26): spaced review runs on real calendar days, apart from the game's days ----------
// A passed step gets a card. Due today or earlier means it's in the review pile; there's no daily cap. A clean review
// stretches the gap (1, 3, 8, 20, 50 days, at most 60); a miss brings it back tomorrow. Playing three game days in one
// sitting doesn't move any of it, because the dates are real ones.
export const addDays = (iso, n) => new Date(Date.parse(iso + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
export const daysBetween = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 864e5);
export const newCard = (today) => ({ ivl: 1, due: addDays(today, 1), seen: today });
export function schedule(card, clean, today) {
  const ivl = clean ? Math.min(60, Math.max(3, Math.round(card.ivl * 2.5))) : 1;
  return { ivl, due: addDays(today, ivl), seen: today, lapses: (card.lapses || 0) + (clean ? 0 : 1) };
}
export const dueIds = (cards, today) => Object.entries(cards || {}).filter(([id, c]) => PART[id] && c.due <= today).sort((a, b) => a[1].due < b[1].due ? -1 : a[1].due > b[1].due ? 1 : 0).map(([id]) => id);
// one rep of a passed step for review: a single query (no chains), from tier 2 up when there is one; traps come as Fix
// half the time. Cases and the "find the money" chains have none: their parts get reviewed instead
export function reviewRep(part, r) {
  const P = PART[part]; if (P.kind === "case") return null;
  const lo = P.tier.some((t) => t > 1) ? 2 : 1;
  const opts = P.tier.map((t, i) => t >= lo ? i : -1).filter((i) => i >= 0);
  for (const ti of shuffle(r, opts)) {
    const t = P.tpl[ti](r); if (t.steps) continue;
    const kind = t.kind || (t.bad && r() < 0.5 ? "fix" : "write");
    return { part, ti, tier: P.tier[ti], ...t, kind, mode: null, set: clauses(t.show || t.sql), practice: false, review: true };
  }
  return null;
}
export const reviewable = (part) => !!reviewRep(part, rng(1));
// "previously on": the passed parts today's step leans on (by the clauses its requests use) that haven't been touched
// for 7+ real days. The stalest two come back as one rep each before the lesson
export function leansOn(part) {
  const at = PARTS.findIndex((p) => p.id === part), ids = new Set(), P = PART[part];
  for (const f of P.tpl) for (const q of reqs(f(rng(1)))) for (const c of clauses(q.sql).split("+")) if (PART[c] && PARTS.findIndex((p) => p.id === c) < at) ids.add(c);
  return [...ids];
}
export function rusty(part, sql, today, gap = 7) {
  // a part he has missed twice in a week (shaky) counts as rusty too, until he has reviewed it since
  const shaky = (id, last) => sql._shaky && sql._shaky[id] && (!last || sql._shaky[id] >= last);
  return leansOn(part).map((id) => [id, (sql._srs && sql._srs[id] && sql._srs[id].seen) || (sql[id] && sql[id].last)])
    .filter(([id, last]) => sql[id] && sql[id].passed && last && (daysBetween(last, today) >= gap || shaky(id, last)))
    .sort((a, b) => a[1] < b[1] ? -1 : 1).slice(0, 2).map(([id]) => id);
}


// what a concept miss means (SQL-MISSES.md): one is noted, two on the same part within 7 real days make it shaky (its
// review card is due tomorrow, and the next step that leans on it gets a recap), three put it in today's review pile.
// Slips never come here
export function conceptMiss(sql, part, today) {
  const m = sql._miss = sql._miss || {}; m[part] = [...(m[part] || []), today].slice(-20);
  const recent = m[part].filter((d) => daysBetween(d, today) < 7).length;
  if (recent < 2 || !PART[part]) return "noted";
  (sql._shaky = sql._shaky || {})[part] = today;
  const srs = sql._srs = sql._srs || {};
  if (sql[part] && sql[part].passed) srs[part] = { ...(srs[part] || newCard(today)), ivl: 1, due: recent >= 3 ? today : addDays(today, 1) };
  return recent >= 3 ? "refresher" : "shaky";
}
// a slip's kind, for a habit note when the same kind comes 3 times in a day
export const slipKind = (say) => /quote/i.test(say) ? "quotes" : /comma/i.test(say) ? "commas" : /bracket/i.test(say) ? "brackets" : /typo for|Did you mean|no column|no table/i.test(say) ? "names" : /capitals/i.test(say) ? "capitals" : "other";
export function slipCount(sql, kind, today) { const s = sql._slips = sql._slips && sql._slips.d === today ? sql._slips : { d: today }; s[kind] = (s[kind] || 0) + 1; return s[kind]; }

// ---------- what's left, and what the query points at (SQL-REWORK-PLAN.md batch 3) ----------
// how many more clean runs move him up (or pass the step at the top tier), and the slots the pass rule reads.
// null while practising or once passed
export function toGo(part, st) {
  const P = PART[part], L = levels(part), R = rule(part), own = st.reps.filter((x) => !x.intro);
  if (st.passed || own.length < R.practice && (st.lv || 0) === 0) return null;
  const cur = L[st.lv || 0];
  if (cur < P.top) {
    const solo = own.filter((x) => !x.practice && !x.help); let k = 0;
    for (let i = solo.length - 1; i >= 0 && solo[i].clean && solo[i].tier === cur; i--) k++;
    return { top: false, need: R.climb - Math.min(k, R.climb - 1), trap: false };
  }
  const win = st.reps.slice(st.since || 0).filter((x) => !x.practice && !x.help && !x.intro).slice(-R.pass[1]);
  const trap = P.top === 4 && !win.some((x) => x.clean && x.tier === 4);
  let need = 0;
  for (;; need++) { const w = [...win, ...Array(need).fill({ clean: true })].slice(-R.pass[1]); if (w.length >= R.pass[0] && w.filter((x) => x.clean).length >= R.pass[0] && w.at(-1).clean) break; }
  return { top: true, need: Math.max(need, trap ? 1 : 0), trap, slots: win.map((x) => x.clean), size: R.pass[1] };
}
// the board columns a query points at: o.amount lights only orders.amount (by alias), a bare name lights every card
// that has it. Returns "table.col" strings and bare names
export function pointsAt(q) {
  const s = q.replace(/'[^']*'?/g, "''"), as = {}, NOT = /^(on|where|join|left|right|inner|outer|cross|group|order|limit|having|using|union|natural|as)$/i;
  for (const m of s.matchAll(/\b(?:FROM|JOIN)\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?/gi)) { as[m[1].toLowerCase()] = m[1].toLowerCase(); if (m[2] && !NOT.test(m[2])) as[m[2].toLowerCase()] = m[1].toLowerCase(); }
  const qual = new Set(), bare = new Set();
  for (const m of s.matchAll(/(\.?)\b([a-z_]\w*)(?:\.([a-z_]\w*))?/gi)) {
    if (m[1]) continue;
    if (m[3]) { if (as[m[2].toLowerCase()]) qual.add(`${as[m[2].toLowerCase()]}.${m[3].toLowerCase()}`); }
    else bare.add(m[2].toLowerCase());
  }
  return { qual, bare };
}

// a short typed plan before a pipeline from the brief (SQL-CRITIQUE.md 12): one line per stage, "name: one row per X",
// the final SELECT last. Checked for shape only: planning is the easy part, the habit is naming each stage's grain
export function checkPlan(text) {
  const lines = text.split(/\n|;/).map((x) => x.trim()).filter(Boolean), out = [];
  if (lines.length < 2) return { ok: false, why: "At least two lines: each stage, then the final SELECT. One per line (Shift+Enter), or split them with ;" };
  for (const [i, l] of lines.entries()) {
    const m = l.match(/^(\w+)\s*(?::|=|-|→|->)?\s*(.*)$/), grain = m && m[2].match(/\bone row (?:per|for each|a) \w/i);
    if (!m || !grain) return { ok: false, why: `Line ${i + 1}: a name, then what one row is. Like <code>per: one row per buyer</code>.` };
    out.push([m[1], m[2]]);
  }
  if (new Set(out.map(([n]) => n.toLowerCase())).size < out.length) return { ok: false, why: "Two stages share a name. Give each its own." };
  return { ok: true, stages: out };
}
