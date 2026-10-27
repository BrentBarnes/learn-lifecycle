// The grown Fernhill shop, from Unit C on (SQL-CURRICULUM.md, "The data: the board fills up"). The 14 customers of
// Units A and B plus 136 newer ones, 6 products, orders with their line items, and every email the shop sent. Made-up
// data, built from a seed: seed 1 is the shop on the pin board, seed 2 is the hidden second shop every answer is also
// graded on, so a query that only matches by luck fails. Pure: no DOM, no database.
//
// What the rows hide, on purpose:
// - a basket can hold several products (order_items), so joining orders to it copies each order (the fan-out);
// - some customers never ordered, and Night Owl Decaf never sold (LEFT JOIN, "never");
// - two customers have no city, and orders without a code have code NULL (nulls);
// - two different customers share a name (GROUP BY name merges them);
// - about 1 in 4 customers is held out of all email (customers.holdout), so the emails' real lift can be measured on
//   groups big enough to mean something;
// - Apple Mail Privacy Protection marks an email opened without a person reading it (sends.apple_mpp);
// - welcome email 2 carries the WELCOME5 code, and the code broke on Oct 26 (Case C);
// - the same checkout change broke the pay button on phones: from Oct 26, mobile checkouts finish far less often (events);
// - the card processor double-fired one payment and lost another (payments: check your numbers);
// - the newsletter export is dirty: capitals, stray spaces, one person signed up twice in different case, UTC times
//   (signups: messy data);
// - three A/B tests, one with a real winner, one too small to tell, one with no real difference (ab_test).

import { hillstrom } from "./hillstrom.mjs";

export const CITIES = ["Boston", "Portland", "Seattle", "Austin", "Denver"];
export const CHANNELS = ["instagram", "google", "referral", "podcast"];
export const FLOWS = ["welcome", "cart", "winback", "campaign"];
// id, name, price, unit_cost
export const PRODUCTS = [[1, "House Blend", 18, 7], [2, "Ridgeline Espresso", 22, 9], [3, "Ethiopia Guji", 24, 10], [4, "Travel Mug", 30, 12],
  [5, "Pour-over Kit", 45, 20], [6, "Night Owl Decaf", 20, 8]];
export const START = "2026-08-01", END = "2026-11-15", BREAK = "2026-10-26";
const WEIGHT = [35, 20, 15, 12, 10, 0];   // how often each product lands in a basket; the decaf never does
const FIRST = ["Abe", "Bea", "Cal", "Dot", "Ed", "Flo", "Gil", "Hal", "Ida", "Jo", "Kit", "Lou", "Mo", "Ned", "Ola", "Pia", "Quinn", "Ray", "Sam", "Tess",
  "Uma", "Vic", "Wes", "Xan", "Yara", "Zed", "Ari", "Bo", "Cy", "Di"];
const LAST = ["Lee", "Ng", "Diaz", "Cole", "Hart", "Kim", "Lam", "Moss", "Nash", "Oak", "Pratt", "Quan", "Reyes", "Stone", "Tran", "Vale", "Webb", "Young"];

const day = (iso, n) => new Date(Date.parse(iso + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
function rnd(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; }; }

// base: Units A and B's customers rows [id, name, city, plan, opens, joined]
export function makeShop(seed, base) {
  const r = rnd(seed * 7919 + 13); for (let i = 0; i < 5; i++) r();
  const int = (a, b) => a + Math.floor(r() * (b - a + 1)), pick = (a) => a[Math.floor(r() * a.length)], chance = (p) => r() < p;
  const pickW = (rr = r) => { let x = rr() * WEIGHT.reduce((a, b) => a + b, 0); for (let i = 0; i < WEIGHT.length; i++) { x -= WEIGHT[i]; if (x < 0) return i + 1; } return 1; };

  // customers: id, name, city, plan, opens, joined, channel, holdout
  const customers = base.map(([id, name, city, plan, opens, joined]) => [id, name, city, plan, opens, joined, CHANNELS[id % 4], id === 4 || id === 8 || id === 13 ? 1 : 0]);
  const names = new Set(customers.map((c) => c[1])), noCity = new Set([int(15, 80)]), twin = int(15, 40);
  for (let id = 15; id <= 150; id++) {
    let name; if (id === twin + 17) name = customers[twin - 1][1];                      // a second person with the same name
    else { do name = `${pick(FIRST)} ${pick(LAST)}`; while (names.has(name)); names.add(name); }
    const joined = chance(0.4) ? day("2026-10-01", int(0, 42)) : day("2026-01-05", int(0, 250));   // many joined in the last six weeks
    customers.push([id, name, noCity.has(id) ? null : pick(CITIES), chance(0.4) ? "subscriber" : "one-time", int(0, 30), joined, pick(CHANNELS), chance(0.25) ? 1 : 0]);
  }
  if (customers[twin + 16][2] === customers[twin - 1][2]) customers[twin + 16][2] = CITIES[(CITIES.indexOf(customers[twin - 1][2]) + 1) % 5];
  // the second customer with no city signed up in the shop's last week, so a list of last week's cities holds a NULL
  const lastWeek = customers.filter((c) => c[0] > 80 && c[5] >= "2026-11-08"); (lastWeek[1] || lastWeek[0] || customers[100])[2] = null;

  // orders: id, customer_id, amount, day, status, code · order_items: order_id, product_id, qty, price
  const orders = [], items = [];
  // rr: the random stream to draw from. Later additions use their own streams, so they don't reshuffle the rows before them
  const order = (c, d, code = null, rr = r) => {
    if (d < START || d > END) return;
    const ch = (p) => rr() < p, ps = new Set(), n = ch(0.55) ? 1 : ch(0.7) ? 2 : 3; while (ps.size < n) ps.add(pickW(rr));
    const id = orders.length + 1; let gross = 0;
    for (const p of ps) { const q = ch(0.8) ? 1 : 2, price = PRODUCTS[p - 1][2]; gross += q * price; items.push([id, p, q, price]); }
    orders.push([id, c[0], gross - (code ? 5 : 0), d, ch(0.05) ? "refunded" : "paid", code]);
  };
  // the orders people place on their own: most buy soon after joining; subscribers come back about monthly
  for (const c of customers) {
    // a new customer whose welcome email 2 (joined + 2 days) came after the code broke often gave up at checkout
    const late = !c[7] && c[5] >= day(BREAK, -2);
    if (!chance((c[3] === "subscriber" ? 0.95 : 0.8) * (late ? 0.35 : 1))) continue;
    let d = c[5] >= START ? day(c[5], int(0, 12)) : day(START, int(0, 40));
    order(c, d);
    // the first refill takes longest: after that, the habit sets in
    if (c[3] === "subscriber") { let gap = int(32, 48); while ((d = day(d, gap)) <= END && chance(0.85)) { order(c, d); gap = int(24, 35); } }
    else { if (chance(0.3)) { order(c, d = day(d, int(20, 60))); if (chance(0.3)) order(c, day(d, int(20, 60))); } }
  }
  const last = (cid, before) => orders.filter((o) => o[1] === cid && o[3] < before).map((o) => o[3]).sort().at(-1);

  // sends: id, customer_id, flow, email, day, delivered, opened, clicked_day, unsubscribed, apple_mpp
  const sends = [], OPEN = { welcome: 0.45, cart: 0.4, winback: 0.2, campaign: 0.25 }, CLICK = { welcome: 0.2, cart: 0.3, winback: 0.15, campaign: 0.1 };
  const BUY = { welcome: 0.45, cart: 0.5, winback: 0.4, campaign: 0.35 }, UNSUB = { welcome: 0.005, cart: 0.005, winback: 0.03, campaign: 0.02 };
  const send = (c, flow, email, d) => {
    if (d < START || d > END) return;
    const delivered = chance(0.96) ? 1 : 0, mpp = delivered && chance(0.4) ? 1 : 0;
    const click = delivered && chance(flow === "welcome" && email === 2 ? 0.4 : CLICK[flow]) ? day(d, int(0, 1)) : null;
    const opened = delivered && (mpp || click || chance(OPEN[flow])) ? 1 : 0;
    sends.push([sends.length + 1, c[0], flow, email, d, delivered, opened, click, delivered && chance(UNSUB[flow]) ? 1 : 0, mpp]);
    if (!click) return;
    // a click often turns into an order within a few days. Welcome email 2's code stopped working on Oct 26
    const coded = flow === "welcome" && email === 2, p = coded ? (click < BREAK ? 0.75 : 0.1) : BUY[flow];
    if (chance(p)) order(c, day(click, int(0, 4)), coded && click < BREAK ? "WELCOME5" : null);
  };
  for (const c of customers.filter((x) => !x[7])) {
    if (c[5] >= START) [0, 2, 5].forEach((g, i) => send(c, "welcome", i + 1, day(c[5], g)));
    if (chance(0.25)) send(c, "cart", 1, day(START, int(0, 105)));
    for (const d of ["2026-08-12", "2026-09-10", "2026-10-10", "2026-11-05"]) if (c[5] <= d) send(c, "campaign", 1, d);
    const l = last(c[0], "2026-10-15");
    if (l && l < day("2026-10-15", -45)) { send(c, "winback", 1, "2026-10-15"); send(c, "winback", 2, "2026-10-22"); }
  }
  // winback brings some back (Metric 5): a third of the people it reached click and order within a few weeks. Own stream
  const rw = rnd(seed * 104729 + 7), wint = (a, b) => a + Math.floor(rw() * (b - a + 1));
  for (const s of sends.filter((x) => x[2] === "winback" && x[3] === 1 && x[5])) if (rw() < 0.35) {
    const click = day(s[4], wint(0, 3)); s[6] = 1; if (!s[7]) s[7] = click;
    order(customers[s[1] - 1], day(click, wint(0, 4)), null, rw);
  }
  // at least one customer whose only order came back, so "no paid order" and "no order" differ
  const count = (cid) => orders.filter((o) => o[1] === cid);
  if (!customers.some((c) => { const os = count(c[0]); return os.length && os.every((o) => o[4] === "refunded"); })) {
    const c = customers.find((x) => count(x[0]).length === 1 && x[1] !== customers[twin - 1][1]); if (c) count(c[0])[0][4] = "refunded";
  }
  // both customers who share a name have bought, so GROUP BY name really merges two people's money
  for (const c of customers.filter((x) => x[1] === customers[twin - 1][1])) if (!orders.some((o) => o[1] === c[0] && o[4] === "paid")) { order(c, day("2026-09-01", wint(0, 40)), null, rw); orders.at(-1)[4] = "paid"; }
  // order ids in day order, as an export would have them
  const byDay = orders.map((o, i) => [o, i + 1]).sort((a, b) => a[0][3] < b[0][3] ? -1 : a[0][3] > b[0][3] ? 1 : a[1] - b[1]), newId = new Map(byDay.map(([, old], i) => [old, i + 1]));
  const orders2 = byDay.map(([o], i) => [i + 1, ...o.slice(1)]);
  const items2 = items.map(([oid, ...rest]) => [newId.get(oid), ...rest]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const sends2 = sends.sort((a, b) => a[4] < b[4] ? -1 : a[4] > b[4] ? 1 : a[0] - b[0]).map((s, i) => [i + 1, ...s.slice(1)]), signups2 = signups(seed, customers);
  return { customers, products: PRODUCTS.map((p) => p.slice()), orders: orders2, order_items: items2, subscriptions: subscriptions(seed, customers), ad_spend: adSpend(seed), events: events(seed, orders2, items2, customers), payments: payments(seed, orders2), signups: signups2, ab_test: abTest(seed), sends: sends2,
    ...outsideExports(seed, customers, orders2, sends2, signups2), hillstrom: hillstrom(seed !== 30) };
}

// subscriptions (Metric 7): one row per subscription. A downgrade ends one row and starts a smaller one the same day.
// One customer cancels and comes back; one has a second subscription (a gift). Own random stream.
// id, customer_id, bags, every_weeks, monthly_value, started, cancelled, cancel_reason
function subscriptions(seed, customers) {
  const r = rnd(seed * 7727 + 3), int = (a, b) => a + Math.floor(r() * (b - a + 1)), out = [];
  const add = (cid, bags, every, started, cancelled = null, reason = null) => { out.push([out.length + 1, cid, bags, every, bags * 18 * (every === 2 ? 2 : 1), started, cancelled, reason]); return out.at(-1); };
  let back = false, gift = false;
  for (const c of customers.filter((x) => x[3] === "subscriber")) {
    const started = c[5] >= "2026-06-01" ? c[5] : day("2026-06-01", int(0, 60)), bags = r() < 0.4 ? 1 : r() < 0.7 ? 2 : 3, every = r() < 0.6 ? 4 : 2;
    const end = day(started, int(25, 130)), fate = r();
    if (end > END || fate < 0.45) { const s = add(c[0], bags, every, started); if (!gift && started < "2026-08-01" && r() < 0.3) { gift = true; add(c[0], 1, 4, day(started, int(30, 60))); } void s; continue; }
    if (fate < 0.65) { add(c[0], bags, every, started, end, "payment failed"); continue; }
    if (fate < 0.85 && bags > 1) { add(c[0], bags, every, started, end, "downgraded"); add(c[0], bags - 1, every, end); continue; }
    add(c[0], bags, every, started, end, r() < 0.5 ? "too much coffee" : "price");
    if (!back && day(end, 30) <= END) { back = true; add(c[0], bags, every, day(end, int(20, 30))); }
  }
  return out;
}
// ad_spend (Metric 6): what each paid channel cost, week by week. Referrals cost nothing. Own random stream
function adSpend(seed) {
  const r = rnd(seed * 1543 + 11), out = [], BASE = { instagram: 22, google: 35, podcast: 80 };
  for (let d = "2026-08-03"; d <= "2026-11-09"; d = day(d, 7)) for (const ch of ["instagram", "google", "podcast"]) out.push([d, ch, BASE[ch] + Math.floor(r() * 15) - 7]);
  return out;
}

// events (the funnel bonus): the site's click log, one row per thing a visitor did. ts is Unix time in milliseconds, as
// trackers export it. Every order has its session (views, carts, checkout, purchase; no cart for the customers who use
// Buy now); other sessions stop early. From Oct 26 the pay button broke on phones, so many more mobile checkouts end there. Own random stream.
// id, visitor_id, customer_id, ts, event, device, product_id, order_id
function events(seed, orders, items, customers) {
  const r = rnd(seed * 3301 + 5), int = (a, b) => a + Math.floor(r() * (b - a + 1)), out = [];
  const at = (d) => Date.parse(d + "T00:00:00Z") + int(7 * 3600, 22 * 3600) * 1000;
  const session = (vid, cid, d, device, views, carts, checkout, oid) => {
    let t = at(d); const go = (event, pid = null, o = null) => { out.push([0, vid, cid, t, event, device, pid, o]); t += int(15, 140) * 1000; };
    for (const p of views) go("view", p);
    for (const p of carts) go("cart", p);
    if (checkout) go("checkout");
    if (oid) go("purchase", null, oid);
  };
  const browse = () => { const n = int(1, 7), a = []; for (let i = 0; i < n; i++) a.push(int(1, 6)); return a; };
  // about 1 in 10 customers always uses Buy now on the product page, so they go from a view straight to checkout
  const quick = new Set(customers.filter(() => r() < 0.1).map((c) => c[0]));
  const lost = (device, d) => device === "desktop" ? 0.3 : d < BREAK ? 0.35 : 1.6;   // extra checkouts that never finish, per order
  for (const o of orders) {
    const ps = items.filter((i) => i[0] === o[0]).map((i) => i[1]), device = r() < 0.55 ? "mobile" : "desktop";
    session(1000 + o[1], o[1], o[3], device, [...browse(), ...ps], quick.has(o[1]) ? [] : ps, true, o[0]);
    for (let k = lost(device, o[3]); k > 0; k--) if (r() < k) {
      const c = r() < 0.5 ? customers[int(0, customers.length - 1)][0] : null, vid = c ? 1000 + c : 2000 + int(1, 260);
      const cart = [int(1, 5)]; session(vid, c, o[3], device, [...browse(), ...cart], quick.has(c) ? [] : cart, true, null);
    }
  }
  // people who look and leave: most only view, some reach the cart
  for (let d = START; d <= END; d = day(d, 1)) for (let k = int(9, 18); k > 0; k--) {
    const v = 2000 + int(1, 260), device = r() < 0.6 ? "mobile" : "desktop", vs = browse();
    session(v, null, d, device, vs, r() < 0.35 ? [vs[0]] : [], false, null);
  }
  // two visitors who come back exactly 20 and 30 minutes after a view, so "over 30 minutes" and "30 or more" differ
  for (const [vid, gap] of [[2261, 20], [2262, 30]]) { let t = at(day(START, int(10, 90))); for (const g of [0, 40000, gap * 60000]) { t += g; out.push([0, vid, null, t, "view", "desktop", int(1, 6), null]); } }
  return out.sort((a, b) => a[3] - b[3]).map((e, i) => [i + 1, ...e.slice(1)]);
}

// payments (check your numbers): one row per payment the card processor reported, times in UTC. Every paid order has
// one, except that the processor fired one twice and lost one. Own random stream.
// id, order_id, amount, paid_at
function payments(seed, orders) {
  const r = rnd(seed * 4127 + 7), int = (a, b) => a + Math.floor(r() * (b - a + 1)), p2 = (n) => String(n).padStart(2, "0");
  const paid = orders.filter((o) => o[4] === "paid"), twice = paid[int(5, paid.length - 6)];
  // the lost one costs a different amount, so the totals can't cancel out
  const lost = paid.filter((o, i) => i >= 5 && i < paid.length - 5 && o[2] !== twice[2])[int(0, 40)];
  const out = [];
  for (const o of paid) { if (o === lost && o !== twice) continue; const at = `${o[3]} ${p2(int(9, 23))}:${p2(int(0, 59))}:${p2(int(0, 59))}`; out.push([0, o[0], o[2], at]);
    if (o === twice) out.push([0, o[0], o[2], at.slice(0, -2) + p2(Math.min(59, +at.slice(-2) + 3))]); }
  return out.sort((a, b) => a[3] < b[3] ? -1 : a[3] > b[3] ? 1 : a[1] - b[1]).map((x, i) => [i + 1, ...x.slice(1)]);
}
// signups (messy data): the newsletter sign-up export. Most customers plus people who never bought. Emails come with
// stray capitals and spaces, one customer signed up twice (once in other capitals), times are UTC (the shop's day is
// 5 hours behind), and people who signed up but were never emailed have sent = 0. Own random stream.
// id, email, customer_id, source, signed_up, sent, opened
const DOMAINS = ["gmail.com", "yahoo.com", "outlook.com", "icloud.com"], SOURCES = ["popup", "checkout", "quiz"];
function signups(seed, customers) {
  const r = rnd(seed * 6151 + 9), int = (a, b) => a + Math.floor(r() * (b - a + 1)), pick = (a) => a[Math.floor(r() * a.length)], p2 = (n) => String(n).padStart(2, "0");
  // every address is a different person, apart from the one who signs up twice
  const out = [], used = new Set(), mail = (name) => { let e, k = 0; do e = name.toLowerCase().replace(/ /g, ".") + (k++ > 3 ? k : "") + "@" + pick(DOMAINS); while (used.has(e)); used.add(e); return e; };
  const dirty = (e) => { const x = r(); return x < 0.2 ? e[0].toUpperCase() + e.slice(1) : x < 0.3 ? e.replace(/^(.)(.*?)@(.)/, (m, a, b, c) => a.toUpperCase() + b + "@" + c.toUpperCase()) : x < 0.4 ? e + " " : x < 0.45 ? " " + e : e; };
  // a UTC time: a quarter of them between midnight and 5am, which is still the day before at the shop
  const when = (d) => `${d} ${p2(r() < 0.25 ? int(0, 4) : int(5, 23))}:${p2(int(0, 59))}:${p2(int(0, 59))}`;
  const add = (email, cid, d) => { const sent = d > "2026-11-08" || r() < 0.08 ? 0 : int(1, 12); out.push([0, email, cid, pick(SOURCES), when(d), sent, sent ? int(0, sent) : 0]); };
  for (const c of customers) if (r() < 0.75) add(dirty(mail(c[1])), c[0], c[5] >= START ? c[5] : day(START, int(0, 90)));
  for (let k = 0; k < 50; k++) add(dirty(mail(`${pick(["Ana", "Ben", "Cleo", "Dev", "Eli", "Fay", "Gus", "Ivy", "Jun", "Kai", "Lia", "Max"])} ${pick(["Ash", "Bell", "Cruz", "Dale", "Ford", "Gray", "Holt", "Ives"])}`)), null, day(START, int(0, 105)));
  // the one who signed up twice: the same address, other capitals, a few weeks later
  const twice = out.find((x) => x[2] && x[1] === x[1].trim() && x[1] === x[1].toLowerCase());
  out.push([0, twice[1].replace(/^(.)/, (m) => m.toUpperCase()).replace(/@(.)/, (m, c) => "@" + c.toUpperCase()), twice[2], "quiz", when(day(twice[4].slice(0, 10), int(14, 30)) > END ? END : day(twice[4].slice(0, 10), int(14, 30))), 0, 0]);
  return out.sort((a, b) => a[4] < b[4] ? -1 : 1).map((x, i) => [i + 1, ...x.slice(1)]);
}
// The same shop as two outside tools export it (Unit F, someone else's export). Nothing here carries Fernhill's ids:
// the two exports meet only on the email address. Own random stream.
// shop_orders (Shopify style): name, email, created_at, financial_status, total_price, discount_code, source_name.
//   created_at is the shop's local time with its UTC offset (-04:00, then -05:00 from Nov 1), total_price is text,
//   no code is '' rather than NULL, emails come as the buyer typed them, and source_name is a code: web, 580111 (the
//   Shop app) or shopify_draft_order (made by hand by staff). Draft orders named #D… are still pending: not money yet.
//   Newsletters are resent to non-openers, so one person can receive the same newsletter twice.
// kl_events (Klaviyo style): id, profile_email, metric_id, datetime (UTC), message_name. metric_id is a code: the
//   names are in kl_metrics, which also lists two SMS metrics Fernhill never used.
export const KL_METRICS = [["Ux7Kp2", "Received Email"], ["Rq3mTn", "Opened Email"], ["Vb8Lw4", "Clicked Email"], ["Hs2Yd9", "Unsubscribed"], ["Jt6Nf3", "Received SMS"], ["Wc4Gh8", "Clicked SMS"]];
const NEWSLETTER = { "2026-08-12": "August Newsletter", "2026-09-10": "September Newsletter", "2026-10-10": "October Newsletter", "2026-11-05": "November Newsletter" };
function outsideExports(seed, customers, orders, sends, signups) {
  const r = rnd(seed * 5281 + 3), int = (a, b) => a + Math.floor(r() * (b - a + 1)), p2 = (n) => String(n).padStart(2, "0");
  const email = new Map();
  for (const x of signups) if (x[2] && !email.has(x[2])) email.set(x[2], x[1].trim().toLowerCase());
  for (const c of customers) if (!email.has(c[0])) email.set(c[0], `${c[1].toLowerCase().replace(/ /g, ".")}${c[0]}@${DOMAINS[c[0] % 4]}`);
  const typed = (e) => { const x = r(); return x < 0.2 ? e.replace(/^(.)/, (m) => m.toUpperCase()).replace(/\.(.)/, (m, c) => "." + c.toUpperCase()) : x < 0.25 ? e + " " : e; };
  const local = (d) => `${d}T${p2(int(8, 18))}:${p2(int(0, 59))}:${p2(int(0, 59))}${d < "2026-11-01" ? "-04:00" : "-05:00"}`;
  const shop_orders = orders.map((o) => { const x = r(); return [`#${1000 + o[0]}`, typed(email.get(o[1])), local(o[3]), o[4], o[2].toFixed(2), o[5] || "", x < 0.8 ? "web" : x < 0.95 ? "580111" : "shopify_draft_order"]; });
  // UTC times that stay on the shop's day: sends go out at 10am local, clicks happen between 8am and 6pm local
  const utc = (d, h) => `${d}T${p2(h + (d < "2026-11-01" ? 4 : 5))}:${p2(int(0, 59))}:${p2(int(0, 59))}+00:00`;
  const id = (name) => KL_METRICS.find((m) => m[1] === name)[0], ev = [];
  for (const x of sends) {
    const msg = x[2] === "campaign" ? NEWSLETTER[x[4]] : `${{ welcome: "Welcome Series", cart: "Abandoned Cart", winback: "Winback" }[x[2]]}: Email ${x[3]}`, to = email.get(x[1]);
    if (!x[5]) continue;
    ev.push([to, id("Received Email"), utc(x[4], 10), msg]);
    // newsletters go out again 3 days later to the people who didn't open them, under the same name
    if (x[2] === "campaign" && !x[6] && r() < 0.5) ev.push([to, id("Received Email"), utc(day(x[4], 3), 10), msg]);
    if (x[6]) ev.push([to, id("Opened Email"), utc(x[4], int(10, 18)), msg]);
    if (x[7]) ev.push([to, id("Clicked Email"), utc(x[7], int(8, 18)), msg]);
    if (x[8]) ev.push([to, id("Unsubscribed"), utc(x[7] || x[4], 18), msg]);
  }
  // staff make draft orders by hand for some newsletter clickers (a quote, a gift set). They stay pending until paid
  let drafts = 0;
  for (const x of sends) if (x[2] === "campaign" && x[7] && r() < 0.35) shop_orders.push([`#D${++drafts}`, typed(email.get(x[1])), local(day(x[7], int(0, 2))), "pending", (PRODUCTS[int(0, 4)][2] * int(2, 4)).toFixed(2), "", "shopify_draft_order"]);
  const kl_events = ev.sort((a, b) => a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0).map((e, i) => [i + 1, ...e]);
  return { shop_orders, kl_events, kl_metrics: KL_METRICS.map((m) => m.slice()) };
}
// ab_test (the noise check): three tests, one row per person who saw one. Same counts in both shops, so the verdicts
// hold; who converted is shuffled per shop. visitor_id, test, variant, converted
const TESTS = [["subject", 600, 60, 90], ["banner", 40, 4, 7], ["quiz", 300, 24, 27]];   // test, people per arm, converted in A, in B
function abTest(seed) {
  const r = rnd(seed * 2203 + 1), out = [];
  for (const [t, n, a, b] of TESTS) for (const [v, k] of [["A", a], ["B", b]]) {
    const hit = new Set(); while (hit.size < k) hit.add(Math.floor(r() * n));
    for (let i = 0; i < n; i++) out.push([0, t, v, hit.has(i) ? 1 : 0]);
  }
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out.map((x, i) => [5000 + i, ...x.slice(1)]);
}

export const SCHEMA2 = `CREATE TABLE customers (id INTEGER, name TEXT, city TEXT, plan TEXT, opens INTEGER, joined TEXT, channel TEXT, holdout INTEGER);
CREATE TABLE products (id INTEGER, name TEXT, price INTEGER, unit_cost INTEGER);
CREATE TABLE orders (id INTEGER, customer_id INTEGER, amount INTEGER, day TEXT, status TEXT, code TEXT);
CREATE TABLE order_items (order_id INTEGER, product_id INTEGER, qty INTEGER, price INTEGER);
CREATE TABLE sends (id INTEGER, customer_id INTEGER, flow TEXT, email INTEGER, day TEXT, delivered INTEGER, opened INTEGER, clicked_day TEXT, unsubscribed INTEGER, apple_mpp INTEGER);
CREATE TABLE subscriptions (id INTEGER, customer_id INTEGER, bags INTEGER, every_weeks INTEGER, monthly_value INTEGER, started TEXT, cancelled TEXT, cancel_reason TEXT);
CREATE TABLE ad_spend (day TEXT, channel TEXT, spend INTEGER);
CREATE TABLE events (id INTEGER, visitor_id INTEGER, customer_id INTEGER, ts INTEGER, event TEXT, device TEXT, product_id INTEGER, order_id INTEGER);
CREATE TABLE payments (id INTEGER, order_id INTEGER, amount INTEGER, paid_at TEXT);
CREATE TABLE signups (id INTEGER, email TEXT, customer_id INTEGER, source TEXT, signed_up TEXT, sent INTEGER, opened INTEGER);
CREATE TABLE ab_test (visitor_id INTEGER, test TEXT, variant TEXT, converted INTEGER);
CREATE TABLE shop_orders (name TEXT, email TEXT, created_at TEXT, financial_status TEXT, total_price TEXT, discount_code TEXT, source_name TEXT);
CREATE TABLE kl_events (id INTEGER, profile_email TEXT, metric_id TEXT, datetime TEXT, message_name TEXT);
CREATE TABLE kl_metrics (id TEXT, name TEXT);
CREATE TABLE hillstrom (id INTEGER, recency INTEGER, history_segment TEXT, history REAL, mens INTEGER, womens INTEGER, zip_code TEXT, newbie INTEGER, channel TEXT, segment TEXT, visit INTEGER, conversion INTEGER, spend REAL);`;
export function loadShop(db, shop) {
  db.run(SCHEMA2);
  for (const t of ["customers", "products", "orders", "order_items", "sends", "subscriptions", "ad_spend", "events", "payments", "signups", "ab_test", "shop_orders", "kl_events", "kl_metrics", "hillstrom"]) {
    const rows = shop[t], st = db.prepare(`INSERT INTO ${t} VALUES (${rows[0].map(() => "?").join(",")})`);
    for (const row of rows) st.run(row);
    st.free();
  }
}
