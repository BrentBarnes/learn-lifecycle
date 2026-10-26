// The Fernhill office's art, made with the pxl skill: the room, the cast, Biscuit the dog and Frank's corner are PNGs.
// Sources: games/shared/pixel/office.px.js and cast.px.js (rebuild with node ~/.claude/skills/pxl-pixel-art/bin/pxl.js
// build <file>), and gamify/art/noir.px.js for the noir pieces in pix/. This file holds the layout (which tiles are
// solid, where the desks are) and hands out the images.

export const T = 16, COLS = 20, ROWS = 12, W = COLS * T, H = ROWS * T;
const OUT = "/px/";

// one name and role per person across every game (Test Board's cast)
export const CAST = {
  you: { name: "You" }, dana: { name: "Dana" }, theo: { name: "Theo" }, priya: { name: "Priya" }, mei: { name: "Mei" },
  frank: { name: "Frank Mallory" }, rosa: { name: "Rosa" }, hank: { name: "Hank" },
};
export const ROLE = { you: "Analyst", dana: "VP of Marketing", theo: "Campaign manager", priya: "Analyst", mei: "Engineer",
  frank: "Data detective", rosa: "Deliverability lead", hank: "Founder" };
export const FACES = ["calm", "smile", "worried", "serious", "surprised"];

// ---------- images ----------
const IMG = {};
const load = (key, src) => new Promise((ok) => { const i = new Image(); i.onload = () => { IMG[key] = i; ok(); }; i.onerror = () => ok(); i.src = src; });
export function loadArt() {
  const jobs = [load("room", OUT + "scenes/office_back.png"), load("room_evening", OUT + "scenes/office_evening_back.png"),
    load("room_front", OUT + "scenes/office_front.png"), load("room_evening_front", OUT + "scenes/office_evening_front.png"), load("dog", OUT + "anims/dog_sleep.png"),
    load("noir", "pix/noir_corner.png")];
  for (const n of Object.keys(CAST)) for (const d of ["down", "up", "side"]) jobs.push(load(`walk_${n}_${d}`, `${OUT}anims/walk_${n}_${d}.png`));
  return Promise.all(jobs);
}
export const img = (k) => IMG[k];
export const faceSrc = (who, face = "calm") => `${OUT}sprites/face_${who in CAST ? who : "you"}_${FACES.includes(face) ? face : "calm"}.png`;
// a person: an 18 x 27 frame from the 4-frame walk strip; dir is down, up, left or right (left is the right strip flipped)
export const SPR_W = 18, SPR_H = 27;
export function drawPerson(x, who, dir, frame, px, py, S) {
  const im = IMG[`walk_${who}_${dir === "left" || dir === "right" ? "side" : dir}`]; if (!im) return;
  const dx = Math.round(px - 1) * S, dy = Math.round(py + T - SPR_H + 1) * S;
  if (dir === "left") { x.save(); x.translate(dx + SPR_W * S, dy); x.scale(-1, 1); x.drawImage(im, frame * SPR_W, 0, SPR_W, SPR_H, 0, 0, SPR_W * S, SPR_H * S); x.restore(); }
  else x.drawImage(im, frame * SPR_W, 0, SPR_W, SPR_H, dx, dy, SPR_W * S, SPR_H * S);
}

// ---------- the room's layout (matches office.px.js) ----------
export const SOLID = new Set();
const solid = (x0, y0, w, h) => { for (let x = x0; x < x0 + w; x++) for (let y = y0; y < y0 + h; y++) SOLID.add(x + "," + y); };
solid(0, 0, COLS, 2);                                       // the back wall
export const STATIONS = {
  dash: { name: "Dashboard wall", key: "1", stand: [5, 2], tiles: [[3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1]] },
  sql: { name: "Frank's SQL desk", key: "2", stand: [14, 7], tiles: [[14, 5], [15, 5], [14, 6], [15, 6]] },
  board: { name: "Test board", key: "3", stand: [11, 2], tiles: [[9, 0], [10, 0], [11, 0], [12, 0], [9, 1], [10, 1], [11, 1], [12, 1]] },
  dana: { name: "Dana", key: "4", stand: [4, 8], tiles: [[3, 8]] },
  clock: { name: "Time clock", key: "5", stand: [8, 2], tiles: [[8, 0], [8, 1]] },   // the punch clock between the screens
};
solid(14, 5, 2, 2);   // Frank's SQL desk
solid(2, 9, 3, 1);    // Dana's desk
solid(8, 9, 3, 1);    // your desk
solid(16, 2, 4, 1);   // the coffee bar
solid(16, 9, 3, 1);   // Priya's desk
solid(0, 11, 1, 1); solid(19, 11, 1, 1); solid(19, 6, 1, 1);   // plants
solid(0, 3, 1, 1);    // the water cooler
solid(1, 5, 2, 1); solid(3, 4, 1, 2);   // the couch and its lamp
solid(6, 9, 2, 1);    // the bookshelf
solid(12, 9, 1, 1);   // the printer
// people and the dog stand on tiles too
export const NPCS = [{ id: "dana", x: 3, y: 8 }, { id: "theo", x: 17, y: 3 }, { id: "priya", x: 17, y: 8 }, { id: "mei", x: 13, y: 9 }, { id: "frank", x: 16, y: 5 }];
export const DOG = { x: 8, y: 6 };
for (const n of NPCS) solid(n.x, n.y, 1, 1);
solid(DOG.x, DOG.y, 1, 1);
