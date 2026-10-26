// Backgrounds for the story modes: flat drawings of Fernhill Coffee Co., a made-up coffee brand. 1600 x 900, cropped to fit.
const W = (body, sky = "#dfe4f2") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="1600" height="900" fill="${sky}"/>${body}</svg>`;

const bean = (x, y, s = 1, c = "#7a4a2a") => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0h40v70l50 18q14 6 14 22v10H0z" fill="${c}"/><rect x="0" y="112" width="104" height="10" fill="#2b1d14"/><path d="M6 14h28M6 30h28M6 46h28" stroke="#d9b38c" stroke-width="3"/></g>`;
const logo = (x, y, s = 1, ink = "#2f3a63") => `<g transform="translate(${x} ${y}) scale(${s})"><circle r="46" fill="none" stroke="${ink}" stroke-width="6"/><path d="M-14 24V-24h30v10h-18v8h14v10h-14v20z" fill="${ink}"/><text x="62" y="-4" font-family="Archivo,Arial" font-weight="800" font-size="38" fill="${ink}">FERNHILL</text><text x="64" y="30" font-family="Inter,Arial" font-weight="600" font-size="20" letter-spacing="6" fill="${ink}">COFFEE CO.</text></g>`;
const plant = (x, y) => `<g transform="translate(${x} ${y})"><path d="M-30 0h60l-8 70h-44z" fill="#c9764b"/><path d="M0 0C-10-60-60-80-70-120M0 0c4-70 30-110 60-130M0 0c-2-50-8-90-4-150" stroke="#3f7d4f" stroke-width="10" fill="none" stroke-linecap="round"/><ellipse cx="-62" cy="-110" rx="26" ry="12" fill="#58a06a" transform="rotate(-40 -62 -110)"/><ellipse cx="52" cy="-122" rx="28" ry="12" fill="#58a06a" transform="rotate(-30 52 -122)"/><ellipse cx="-4" cy="-150" rx="12" ry="26" fill="#4b9160"/></g>`;
const mug = (x, y, c = "#e78276") => `<g transform="translate(${x} ${y})"><rect width="44" height="52" rx="6" fill="${c}"/><path d="M44 12h10q10 0 10 12t-10 12H44" fill="none" stroke="${c}" stroke-width="7"/><path d="M12-8q6-10 0-20M26-8q6-10 0-20" stroke="#fff" stroke-width="3" fill="none" opacity=".7"/></g>`;

export const SCENES = {
  // the Monday read: where results get argued over (the "courtroom")
  conference: W(`
    <rect width="1600" height="640" fill="#e6e1d8"/><rect y="600" width="1600" height="40" fill="#cfc6b8"/>
    <rect x="70" y="90" width="300" height="420" fill="#b9d3e6"/><path d="M70 380l90-90 70 60 80-110 60 70v190H70z" fill="#6f9b7d"/><path d="M70 440l120-60 110 40 70-30v120H70z" fill="#4f7d61"/>
    <rect x="70" y="90" width="300" height="420" fill="none" stroke="#8a7f70" stroke-width="14"/><path d="M220 90v420M70 300h300" stroke="#8a7f70" stroke-width="8"/>
    <rect x="520" y="70" width="760" height="420" rx="10" fill="#1f2d5c"/><rect x="540" y="90" width="720" height="380" rx="4" fill="#f6f5fb"/>
    <rect x="540" y="90" width="720" height="40" fill="#1f2d5c" opacity=".9"/><text x="560" y="117" font-family="Inter,Arial" font-size="18" font-weight="700" fill="#fff">Experiments  /  Monday read</text>
    <g font-family="Inter,Arial" font-size="15" fill="#4a5480"><text x="570" y="170">Metric</text><text x="800" y="170">Baseline</text><text x="930" y="170">Variation</text><text x="1060" y="170">Chance to Win</text></g>
    <path d="M560 185h680M560 255h680M560 325h680" stroke="#e3e1ef" stroke-width="2"/>
    <rect x="1050" y="196" width="110" height="46" fill="#e3f5ea"/><text x="1070" y="226" font-family="Inter,Arial" font-weight="700" font-size="20" fill="#18794e">97.2%</text>
    <rect x="1050" y="266" width="110" height="46" fill="#fdecec"/><text x="1078" y="296" font-family="Inter,Arial" font-weight="700" font-size="20" fill="#ce2c31">3.1%</text>
    <g fill="#a5a9c2"><rect x="570" y="210" width="150" height="14" rx="4"/><rect x="570" y="280" width="120" height="14" rx="4"/><rect x="800" y="210" width="70" height="14" rx="4"/><rect x="930" y="210" width="70" height="14" rx="4"/><rect x="800" y="280" width="70" height="14" rx="4"/><rect x="930" y="280" width="70" height="14" rx="4"/></g>
    <rect x="570" y="360" width="660" height="80" rx="6" fill="#efebff"/><path d="M600 420l80-30 80 10 80-40 80 20 80-30 80 6 80-28" stroke="#6e56cf" stroke-width="6" fill="none"/>
    ${logo(1340, 220, 0.9, "#6b5f50")}${plant(1500, 540)}
    <path d="M0 900V700q800-90 1600 0v200z" fill="#7a5537"/><path d="M0 700q800-90 1600 0" stroke="#5c3f28" stroke-width="10" fill="none"/>
    <rect x="300" y="650" width="190" height="16" rx="4" fill="#2b2f3a"/><rect x="318" y="560" width="154" height="92" rx="6" fill="#3a4050"/>
    <rect x="1120" y="650" width="190" height="16" rx="4" fill="#2b2f3a"/><rect x="1138" y="560" width="154" height="92" rx="6" fill="#3a4050"/>
    ${mug(560, 615, "#9ddadb")}${mug(980, 618, "#ffcf77")}`, "#e6e1d8"),

  // your desk: the board on the wall, sticky notes, too much coffee
  desk: W(`
    <rect width="1600" height="900" fill="#dfe4ee"/><rect y="560" width="1600" height="340" fill="#c7cede"/>
    <rect x="120" y="70" width="640" height="380" rx="8" fill="#c79a6b"/><rect x="138" y="88" width="604" height="344" rx="4" fill="#e0bf94"/>
    <text x="160" y="128" font-family="Archivo,Arial" font-weight="800" font-size="26" fill="#5a3d22">TEST BOARD · Q4</text>
    <g font-family="Inter,Arial" font-size="13" font-weight="700" fill="#5a3d22"><text x="300" y="160">OCT</text><text x="460" y="160">NOV</text><text x="620" y="160">DEC</text></g>
    <path d="M280 170v250M440 170v250M600 170v250" stroke="#b08458" stroke-width="3" stroke-dasharray="6 6"/>
    <g><rect x="170" y="190" width="150" height="50" fill="#efebff" transform="rotate(-2 245 215)"/><rect x="340" y="250" width="170" height="50" fill="#fff3e0" transform="rotate(1.5 425 275)"/><rect x="190" y="320" width="120" height="50" fill="#e3f5ea" transform="rotate(2 250 345)"/><rect x="530" y="200" width="130" height="50" fill="#fdecec" transform="rotate(-1 595 225)"/><rect x="560" y="330" width="150" height="70" fill="repeating-linear-gradient(0)" opacity="0"/>
    <path d="M600 300h120v100H600z" fill="#fff3e0" opacity=".9"/><path d="M600 300l120 100M720 300L600 400" stroke="#ad5700" stroke-width="3" opacity=".6"/><text x="610" y="296" font-family="Inter,Arial" font-weight="700" font-size="13" fill="#ad5700">BFCM FREEZE</text></g>
    <g fill="#e05a47"><circle cx="245" cy="196" r="6"/><circle cx="425" cy="256" r="6"/><circle cx="250" cy="326" r="6"/><circle cx="595" cy="206" r="6"/></g>
    ${logo(1000, 200, 0.8, "#7b86ad")}
    <rect x="1240" y="80" width="230" height="300" fill="#f6f5fb" stroke="#b6bdd3" stroke-width="6"/><path d="M1260 330l40-60 40 30 50-90 60 40" stroke="#6e56cf" stroke-width="7" fill="none"/><text x="1262" y="120" font-family="Inter,Arial" font-weight="700" font-size="17" fill="#4a5480">TRUST THE PLAN</text>
    <rect y="590" width="1600" height="40" fill="#8a6b4e"/><rect y="630" width="1600" height="270" fill="#a3825f"/>
    <rect x="620" y="330" width="420" height="250" rx="12" fill="#2b2f3a"/><rect x="636" y="346" width="388" height="200" rx="4" fill="#f6f5fb"/><rect x="636" y="346" width="388" height="28" fill="#1f2d5c"/>
    <g fill="#d3d0e6"><rect x="652" y="392" width="200" height="12" rx="3"/><rect x="652" y="416" width="320" height="12" rx="3"/><rect x="652" y="440" width="260" height="12" rx="3"/></g>
    <rect x="652" y="470" width="90" height="48" fill="#e3f5ea"/><rect x="760" y="470" width="90" height="48" fill="#efebff"/>
    <rect x="800" y="580" width="60" height="20" fill="#2b2f3a"/><rect x="740" y="596" width="180" height="10" rx="4" fill="#2b2f3a"/>
    ${mug(1120, 548, "#e78276")}${mug(1190, 552, "#78e185")}${bean(360, 470, 0.9)}${plant(1480, 590)}`),

  // engineering corner: where things break
  eng: W(`
    <rect width="1600" height="900" fill="#1d2233"/><rect y="600" width="1600" height="300" fill="#151927"/>
    ${[0, 1, 2].map((i) => `<rect x="${180 + i * 420}" y="${170 - (i === 1 ? 30 : 0)}" width="380" height="250" rx="10" fill="#0d1020" stroke="#3a4060" stroke-width="6"/>` +
      Array.from({ length: 9 }, (_, k) => `<rect x="${206 + i * 420}" y="${200 - (i === 1 ? 30 : 0) + k * 22}" width="${60 + ((k * 73 + i * 41) % 230)}" height="9" rx="3" fill="${["#4cc38a", "#9d8cff", "#ffb35c", "#6cb8ff"][(k + i) % 4]}" opacity=".85"/>`).join("")).join("")}
    <rect x="1410" y="120" width="140" height="460" rx="8" fill="#2a3048"/>${Array.from({ length: 12 }, (_, k) => `<rect x="1426" y="${140 + k * 36}" width="108" height="24" rx="3" fill="#1d2233"/><circle cx="1520" cy="${152 + k * 36}" r="5" fill="${k % 3 ? "#4cc38a" : "#ff6b6b"}"/>`).join("")}
    <rect y="600" width="1600" height="30" fill="#2a3048"/><rect x="560" y="470" width="20" height="130" fill="#3a4060"/><rect x="980" y="470" width="20" height="130" fill="#3a4060"/>
    <text x="1380" y="100" text-anchor="end" font-family="JetBrains Mono,monospace" font-size="22" fill="#ff6b6b">● 3 alerts · klaviyo-sync · webhook retry</text>
    ${mug(700, 552, "#9ddadb")}`, "#1d2233"),

  // the warehouse: the founder's favorite place
  warehouse: W(`
    <rect width="1600" height="900" fill="#cdbfa8"/><rect y="640" width="1600" height="260" fill="#9c8a70"/>
    ${[0, 1, 2, 3].map((r) => `<rect x="60" y="${110 + r * 130}" width="1480" height="12" fill="#5f6b7a"/>` +
      Array.from({ length: 13 }, (_, k) => `<rect x="${80 + k * 112}" y="${30 + r * 130}" width="96" height="78" fill="${["#b8865a", "#a87a50", "#c4976b"][(k + r) % 3]}"/><rect x="${102 + k * 112}" y="${56 + r * 130}" width="52" height="22" fill="#efe3cf"/>`).join("")).join("")}
    <rect x="60" y="20" width="16" height="620" fill="#4d5866"/><rect x="1524" y="20" width="16" height="620" fill="#4d5866"/>
    ${bean(200, 560, 1.2, "#6b3f22")}${bean(330, 572, 1.05, "#8a5530")}${bean(1240, 566, 1.15, "#5e3a20")}
    <rect x="560" y="520" width="480" height="120" rx="6" fill="#e0a100"/><text x="600" y="595" font-family="Archivo,Arial" font-weight="800" font-size="46" fill="#3a2a10">SHIP DOCK 2</text>`),

  // the lobby: day one
  lobby: W(`
    <rect width="1600" height="900" fill="#efe9df"/><rect y="640" width="1600" height="260" fill="#b9a68c"/>
    <rect x="420" y="120" width="760" height="360" rx="14" fill="#2f3a63"/>${logo(560, 300, 1.6, "#efe9df")}
    ${plant(240, 640)}${plant(1380, 640)}<rect x="560" y="560" width="480" height="90" rx="10" fill="#7a5537"/><rect x="540" y="540" width="520" height="30" rx="8" fill="#5c3f28"/>
    ${bean(1080, 470, 0.7)}`),

  // the BFCM war room
  war: W(`
    <rect width="1600" height="900" fill="#2b1d2e"/><rect y="620" width="1600" height="280" fill="#1c1320"/>
    <rect x="120" y="80" width="1360" height="420" rx="12" fill="#120c16" stroke="#ff6b6b" stroke-width="6"/>
    <text x="160" y="150" font-family="Archivo,Arial" font-weight="800" font-size="54" fill="#ff6b6b">BFCM · ORDERS / MIN</text>
    <path d="M160 440l120-60 120 30 120-120 120 40 120-170 120 60 120-110 120 80 120-90 100-40" stroke="#ffb35c" stroke-width="10" fill="none"/>
    <g fill="#4cc38a" font-family="JetBrains Mono,monospace" font-size="34"><text x="1100" y="150">412 /min</text></g>
    ${mug(400, 572, "#ffcf77")}${mug(1150, 572, "#e78276")}`, "#2b1d2e"),
};

// 2026-10-24: the story backdrops are pixel art now, drawn with the pxl skill in games/shared/pixel/backdrops.px.js
// (192 x 98, one Fernhill with the office game). The SVG drawings above stay as the fallback if an image is missing.
for (const id of Object.keys(SCENES)) {
  const svg = SCENES[id];
  SCENES[id] = `<img class="vn-px" src="/px/scenes/bg_${id}.png" alt="" onerror="this.outerHTML=this.dataset.svg" data-svg="${svg.replace(/"/g, "&quot;")}">`;
}
