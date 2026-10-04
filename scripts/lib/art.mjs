// Inline SVG art: icons, flags, the MEON wordmark, the "Meo" mascot crew and small illustrations. All original artwork.
import fs from "node:fs";

const WORD = JSON.parse(fs.readFileSync(new URL("./logo-word.json", import.meta.url), "utf8"));

/* ---------------- Icons ----------------
   One consistent line set: 24px grid, 1.75 stroke, round caps and joins.
   Entries are SVG inner markup; `fill` entries are solid shapes. */
const S = (d) => `<path d="${d}"/>`;
const ICONS = {
  search: `<circle cx="11" cy="11" r="7"/>${S("m20 20-3.6-3.6")}`,
  arrow: S("M5 12h14M13 6l6 6-6 6"),
  pin: `${S("M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z")}<circle cx="12" cy="9.5" r="2.5"/>`,
  insta: `<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".6" fill="currentColor"/>`,
  share: `<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/>${S("m8.2 10.8 7.6-4.1M8.2 13.2l7.6 4.1")}`,
  print: S("M7 9V3.5h10V9M7 17H4.5v-7.5h15V17H17M7 14h10v6.5H7z"),
  dice: `<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="8.5" cy="8.5" r="1" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1" fill="currentColor"/>`,
  play: `<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>`,
  qr: `<rect x="3.5" y="3.5" width="7" height="7" rx="1"/><rect x="13.5" y="3.5" width="7" height="7" rx="1"/><rect x="3.5" y="13.5" width="7" height="7" rx="1"/>${S("M13.5 13.5h3v3h-3zM18 18h2.5v2.5H18zM13.5 19h2M19 13.5h1.5")}`,
  home: S("M3.5 11 12 4l8.5 7M6 9.5V20h12V9.5"),
  bowl: `${S("M3 11.5h18a9 9 0 0 1-18 0Z")}${S("M14.5 3.5 11 11.5M19.5 4.5l-6 7")}`,
  soup: `${S("M3 12h18a9 9 0 0 1-18 0Z")}${S("M9 3.5c-1 1.5 1 2.5 0 4.5M13 3.5c-1 1.5 1 2.5 0 4.5")}`,
  chopsticks: S("M5 20.5 18 3.5M9 21 21 6"),
  noodles: S("M4 8c2-2 4 2 6 0s4 2 6 0 4 2 4 2M4 12c2-2 4 2 6 0s4 2 6 0 4 2 4 2M4 16c2-2 4 2 6 0s4 2 6 0 4 2 4 2"),
  globe: `<circle cx="12" cy="12" r="9"/>${S("M3 12h18M12 3c3 3.4 3 14.6 0 18M12 3c-3 3.4-3 14.6 0 18")}`,
  chevron: S("m6 9 6 6 6-6"),
  download: S("M12 3.5v11m0 0-4.5-4.5m4.5 4.5 4.5-4.5M4.5 20.5h15"),
  close: S("M6 6l12 12M18 6 6 18"),
  sound: `${S("M4 9.5h3.5L12 6v12l-4.5-3.5H4Z")}${S("M15.5 9.5a3.5 3.5 0 0 1 0 5M18 7a7 7 0 0 1 0 10")}`,
  soundOff: `${S("M4 9.5h3.5L12 6v12l-4.5-3.5H4Z")}${S("m16 9.5 5 5M21 9.5l-5 5")}`,
  clock: `<circle cx="12" cy="12" r="8.5"/>${S("M12 7.5V12l3 2")}`,
  card: `<rect x="3" y="6" width="18" height="12" rx="2.5"/>${S("M3 10h18M7 14.5h4")}`,
  coins: `<ellipse cx="12" cy="6.5" rx="7" ry="3"/>${S("M5 6.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5M5 11.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5")}`,
  chat: S("M4.5 5h15v11H10l-5.5 4Z"),
  alert: `${S("M12 4 2.8 19.5h18.4Z")}${S("M12 10v4")}<circle cx="12" cy="16.8" r=".6" fill="currentColor"/>`,
  heart: S("M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.3a4.2 4.2 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20Z"),
  chef: `${S("M7.5 13.5a4 4 0 0 1 .6-7.9A4.5 4.5 0 0 1 16 5.6a4 4 0 0 1 .5 7.9V19h-9Z")}${S("M7.5 16h9")}`,
  chair: S("M7 3.5h10V10H7zM6 10h12M8 10l-1 10.5M16 10l1 10.5"),
  leaf: `${S("M5 19c0-8.3 6-14 15-14 0 9-6 15-14 15")}${S("M5 19l7-7")}`,
  sprout: `${S("M12 21v-8")}${S("M12 13c0-3.6-2.8-6-7-6 0 3.6 2.8 6 7 6ZM12 11.5c0-4 2.8-7 7-7 0 4-2.8 7-7 7Z")}`,
  flame: S("M12 3c1.2 3.2 5.5 5.2 5.5 10.2a5.5 5.5 0 0 1-11 0c0-2.2 1-3.8 2.2-4.8.3 1.7 1.2 2.6 2.1 2.6 0-3.1-.8-5.3 1.2-8Z"),
  drop: S("M12 3.5s6 6.3 6 10.6a6 6 0 0 1-12 0C6 9.8 12 3.5 12 3.5Z"),
  camera: `<rect x="3" y="7" width="18" height="13" rx="2.5"/>${S("M8.5 7 10 4.5h4L15.5 7")}<circle cx="12" cy="13.5" r="3.5"/>`,
  egg: `${S("M6.5 8.5c-3.2 2.8-2.5 9 2.6 10.4 3.2 1.9 8.4.9 9.4-3.2 1.9-3.1-.2-7-3.2-7.9-2.1-3.1-6.7-2.4-8.8.7Z")}<circle cx="12" cy="13" r="3"/>`,
  cheese: `${S("M3 18h18v-7.5L8.5 6 3 10.5Z")}<circle cx="9" cy="13.5" r="1.2"/><circle cx="15" cy="14.5" r="1.5"/><circle cx="13.2" cy="10.8" r=".9"/>`,
  drumstick: S("M15.2 4.3a5 5 0 0 1 .4 7.1l-4.3 4.3-3-3 4.3-4.3a5 5 0 0 1 2.6-4.1ZM8.3 12.7l-3 3a1.8 1.8 0 1 0 2.5 2.5 1.8 1.8 0 1 0 2.5 2.5l3-3"),
  pork: `${S("M4 14c0-5 4-9 10-9 4 0 6 2.2 6 5.2 0 5.8-6 8.8-11 8.8-3 0-5-2-5-5Z")}<circle cx="10.5" cy="12.5" r="2"/>`,
  mushroom: `${S("M3 12a9 7 0 0 1 18 0Z")}${S("M9 12v5a3 3 0 0 0 6 0v-5")}`,
  cabbage: `${S("M12 21c-4.6 0-8-3.4-8-8 0-5 4-9 8-9s8 4 8 9c0 4.6-3.4 8-8 8Z")}${S("M12 21V9M12 14l-4-3M12 12l4-3")}`,
  tofu: `${S("M4 8l8-4 8 4v8l-8 4-8-4Z")}${S("M4 8l8 4 8-4M12 12v8")}`,
  spark: S("M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"),
};

export function svgIcon(name, cls = "") {
  const body = ICONS[name] || ICONS.bowl;
  return `<svg class="i${cls ? " " + cls : ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}
export const icon = new Proxy({}, { get: (_, k) => (k === "arrow" ? svgIcon("arrow", "arrow") : k === "chevron" ? svgIcon("chevron", "chev") : svgIcon(k)) });

// External sprite so JavaScript (search results) can reference icons with <use>.
export function iconSprite() {
  return `<svg xmlns="http://www.w3.org/2000/svg">${Object.entries(ICONS).map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${v}</symbol>`).join("")}</svg>`;
}

// Real flag artwork (flag-icons, MIT), copied to assets/img/flags at build time.
export function flag(code, r, { cls = "flag", w = 20 } = {}) {
  return `<img class="${cls}" src="${r(`assets/img/flags/${code}.svg`)}" alt="" width="${w}" height="${Math.round(w * 0.75)}" loading="lazy" decoding="async">`;
}

// Spice meter using MEON's own chilli artwork. `r` resolves asset paths relative to the page.
export function spiceMeter(level, r, { large = false, max = 5 } = {}) {
  let out = `<span class="spice${large ? " spice--lg" : ""}" role="img" aria-label="Spice level ${level} out of ${max}">`;
  for (let i = 1; i <= max; i++) out += `<img class="${i <= level ? "on" : "off"}" src="${r("assets/img/chilli-64.webp")}" alt="" width="${large ? 13 : 8}" height="${large ? 46 : 30}">`;
  return out + `</span>`;
}

/* ---------------- Wordmark ----------------
   "meon" drawn from the logo's own letter shapes (no web font needed). Each letter is a .lw group so it can move. */
export function wordmark(cls = "wordmark", label = "") {
  const a11y = label ? `role="img" aria-label="${label}"` : `aria-hidden="true"`;
  return `<svg class="${cls}" viewBox="${WORD.viewBox}" fill="currentColor" ${a11y} focusable="false">${WORD.paths}</svg>`;
}

const GLYPHS = [["み", "ㅁ", "咪", "ม"], ["อี", "이", "え", "伊"], ["お", "오", "哦", "โอ"], ["ん", "ㄴ", "恩", "น"]];

// Large animated logo tile: the wordmark plus a subline that cycles through Japanese, Korean, Chinese and Thai.
export function logoAnimated() {
  return `<div class="logo-anim" role="img" aria-label="meon logo">
  ${wordmark("logo-anim-word")}
  <div class="logo-anim-sub" aria-hidden="true">${GLYPHS.map((s, i) => `<span class="cycle" style="--i:${i}">${s.map((g) => `<b>${g}</b>`).join("")}</span>`).join("")}</div>
</div>`;
}

// Header logo: the red square mark with moving letters and a cycling script line.
export function logoMini() {
  const lines = [0, 1, 2, 3].map((k) => GLYPHS.map((g) => g[k]).join(" "));
  return `<span class="logo-mini" aria-hidden="true">${wordmark("logo-mini-word")}<span class="g">${lines.map((l) => `<b>${l}</b>`).join("")}</span></span>`;
}

/* ---------------- Meo, the mascot ---------------- */
const ACCESSORIES = {
  none: "",
  chef: `<g><path d="M70 40c-16 0-22-22-6-28 2-14 22-18 30-6 8-12 30-10 32 6 16 2 18 26 2 28z" fill="#fff" stroke="#17110f" stroke-width="5" stroke-linejoin="round"/><rect x="72" y="36" width="56" height="16" rx="4" fill="#fff" stroke="#17110f" stroke-width="5"/></g>`,
  bowl: `<g><path d="M62 34h96c0 16-21 28-48 28S62 50 62 34z" fill="#fff" stroke="#17110f" stroke-width="5" stroke-linejoin="round"/><path d="M68 44h84" stroke="#ec1b25" stroke-width="6"/><path d="M76 34c6-8 10 8 16 0s10 8 16 0 10 8 16 0 10 8 16 0" fill="none" stroke="#ffc83d" stroke-width="5" stroke-linecap="round"/><g class="meo-steam" fill="none" stroke="rgba(23,17,15,.35)" stroke-width="4" stroke-linecap="round"><path d="M96 26c-6-8 6-12 0-22"/><path d="M122 26c-6-8 6-12 0-22"/></g></g>`,
  chilli: `<g><path d="M56 70c30-14 78-14 108 0" fill="none" stroke="#ec1b25" stroke-width="10" stroke-linecap="round"/><path d="M150 58c10-2 20 4 22 14-4 10-14 14-22 8" fill="#ec1b25" stroke="#17110f" stroke-width="4" stroke-linejoin="round"/><path d="M168 60c2-6 6-8 10-8" fill="none" stroke="#2f9e57" stroke-width="4" stroke-linecap="round"/></g>`,
  party: `<g><path d="M110 4 88 52h44z" fill="#2aa7e1" stroke="#17110f" stroke-width="5" stroke-linejoin="round"/><path d="M98 30h24M93 42h34" stroke="#ffc83d" stroke-width="5"/><circle cx="110" cy="6" r="7" fill="#ffc83d" stroke="#17110f" stroke-width="4"/></g>`,
  crown: `<g><path d="M78 50 72 18l20 16 18-24 18 24 20-16-6 32z" fill="#ffc83d" stroke="#17110f" stroke-width="5" stroke-linejoin="round"/><circle cx="110" cy="38" r="5" fill="#ec1b25"/></g>`,
  shades: `<g><rect x="60" y="90" width="42" height="26" rx="10" fill="#17110f"/><rect x="118" y="90" width="42" height="26" rx="10" fill="#17110f"/><path d="M102 100h16" stroke="#17110f" stroke-width="5"/><path d="M68 96l12 0" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".6"/></g>`,
  chopsticks: `<g><path d="M150 140 196 60M160 146 206 70" stroke="#c98a4b" stroke-width="7" stroke-linecap="round"/><path d="M150 140c10 10 20 30 6 46M160 146c8 16 10 30 0 42" fill="none" stroke="#ffc83d" stroke-width="5" stroke-linecap="round"/></g>`,
  beanie: `<g><path d="M62 62c0-30 22-48 48-48s48 18 48 48z" fill="#ec1b25" stroke="#17110f" stroke-width="5" stroke-linejoin="round"/><rect x="56" y="56" width="108" height="16" rx="8" fill="#fff" stroke="#17110f" stroke-width="5"/><circle cx="110" cy="12" r="10" fill="#fff" stroke="#17110f" stroke-width="5"/></g>`,
};

/**
 * "Meo": a round, blushing noodle-dumpling buddy.
 * Parts are classed so CSS/JS can animate them: .meo-body (squish), .meo-eye (blink),
 * .meo-pupils (follow the cursor), .meo-arm-r (wave).
 */
export function mascot({ className = "", label = "", color = "#ff8a4c", belly = "#fff3e2", acc = "none", wave = true, style = "" } = {}) {
  const a11y = label ? `role="img" aria-label="${label}"` : `aria-hidden="true"`;
  return `<svg class="${className}" viewBox="0 0 220 220" ${a11y} focusable="false"${style ? ` style="${style}"` : ""}>
  <ellipse cx="110" cy="210" rx="64" ry="8" fill="rgba(23,17,15,.12)"/>
  <g class="meo-body">
    <path d="M36 136c0-52 33-90 74-90s74 38 74 90c0 40-33 66-74 66s-74-26-74-66Z" fill="${color}" stroke="#17110f" stroke-width="5"/>
    <path d="M40 152c9 29 37 46 70 46s61-17 70-46c-18 11-42 16-70 16s-52-5-70-16Z" fill="${belly}" stroke="#17110f" stroke-width="5" stroke-linejoin="round"/>
    ${acc === "none" ? `<path d="M90 52c-6-12 2-22 11-20M112 47c0-12 9-20 18-14" fill="none" stroke="#17110f" stroke-width="5" stroke-linecap="round"/>` : ""}
    <g class="meo-eyes">
      <g class="meo-eye"><ellipse cx="84" cy="116" rx="10" ry="13" fill="#17110f"/></g>
      <g class="meo-eye"><ellipse cx="136" cy="116" rx="10" ry="13" fill="#17110f"/></g>
      <g class="meo-pupils"><circle cx="87" cy="111" r="3.6" fill="#fff"/><circle cx="139" cy="111" r="3.6" fill="#fff"/></g>
    </g>
    <ellipse cx="64" cy="138" rx="13" ry="8" fill="#ff5c7a" opacity=".7"/>
    <ellipse cx="156" cy="138" rx="13" ry="8" fill="#ff5c7a" opacity=".7"/>
    <path d="M100 136c4 7 16 7 20 0" fill="none" stroke="#17110f" stroke-width="5" stroke-linecap="round"/>
    <path d="M38 140c-14 4-20 14-16 22" fill="none" stroke="#17110f" stroke-width="5" stroke-linecap="round"/>
    <path class="${wave ? "meo-arm-r" : ""}" d="M182 140c14-4 20-14 16-24" fill="none" stroke="#17110f" stroke-width="5" stroke-linecap="round"/>
    ${ACCESSORIES[acc] || ""}
  </g>
</svg>`;
}

// The crew around the home hero (positions in %, size in px). Speech bubbles appear when tapped.
export const CREW = [
  { x: 47, y: 3, s: 64, color: "#ff8a4c", acc: "chef", d: 7, delay: -1, say: "Yes, chef" },
  { x: 30, y: 1, s: 48, color: "#ff8fb0", acc: "party", d: 6, delay: -3, say: "Party bowl?", hideSm: true },
  { x: 49, y: 84, s: 58, color: "#5cc3f0", acc: "shades", d: 8, delay: -2, say: "Too cool for mild" },
  { x: 93, y: 3, s: 62, color: "#ffc83d", acc: "bowl", d: 6.5, delay: -4, say: "Smells so good" },
  { x: 93, y: 82, s: 58, color: "#ff5b5b", acc: "chilli", d: 5.5, delay: -2.5, say: "Level 5 or bust" },
];

export function crew(list = CREW, cls = "crew") {
  return `<div class="${cls}" aria-hidden="true">${list.map(
    (m, i) => `<div class="meo${m.hideSm ? " hide-sm" : ""}" style="left:${m.x}%;top:${m.y}%;--s:${m.s}px;--d:${m.d}s;--delay:${m.delay}s;--i:${i}" data-say="${m.say}"><span class="meo-bubble">${m.say}</span>${mascot({ color: m.color, acc: m.acc, wave: m.acc !== "chopsticks" })}</div>`
  ).join("")}</div>`;
}

// One mascot that peeks into an inner-page hero; `seed` varies the character per page.
const PEEKERS = [
  { color: "#ff8a4c", acc: "chef", say: "Yes, chef" }, { color: "#ffc83d", acc: "bowl", say: "Smells so good" },
  { color: "#5cc3f0", acc: "shades", say: "Too cool for mild" }, { color: "#ff5b5b", acc: "chilli", say: "Level 5 or bust" },
  { color: "#ff8fb0", acc: "party", say: "Party bowl?" }, { color: "#6fd08c", acc: "beanie", say: "Cosy noodle weather" },
  { color: "#a78bfa", acc: "crown", say: "Noodle royalty" }, { color: "#ff8a4c", acc: "chopsticks", say: "Pick me a packet" },
];
export function peeker(seed = 0) {
  const m = PEEKERS[seed % PEEKERS.length];
  return `<div class="peeker" aria-hidden="true"><div class="meo" data-say="${m.say}"><span class="meo-bubble">${m.say}</span>${mascot({ color: m.color, acc: m.acc, wave: m.acc !== "chopsticks" })}</div></div>`;
}

export const steamOverlay = `<svg class="steam-overlay" viewBox="0 0 200 90" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M60 90c-12-16 12-24 0-40s12-26 0-46"/><path d="M100 90c-12-16 12-24 0-40s12-26 0-46"/><path d="M140 90c-12-16 12-24 0-40s12-26 0-46"/></svg>`;

// Step illustrations (flat, two-colour)
export const stepArt = {
  packet: `<svg class="step-art" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path d="M14 8h36l-3 6 3 6-3 6 3 6-3 6 3 6-3 6 3 6H14l3-6-3-6 3-6-3-6 3-6-3-6 3-6z" fill="#ec1b25" stroke="#17110f" stroke-width="2.5" stroke-linejoin="round"/><rect x="20" y="22" width="24" height="16" rx="3" fill="#fff" stroke="#17110f" stroke-width="2.5"/><path d="M24 30c3-3 5 3 8 0s5 3 8 0" fill="none" stroke="#17110f" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  egg: `<svg class="step-art" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><ellipse cx="32" cy="36" rx="22" ry="20" fill="#fff" stroke="#17110f" stroke-width="2.5"/><circle cx="32" cy="38" r="10" fill="#ffc83d" stroke="#17110f" stroke-width="2.5"/></svg>`,
  pot: `<svg class="step-art" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path d="M8 28h48v6c0 13-10 22-24 22S8 47 8 34z" fill="#17110f"/><path d="M4 28h56" stroke="#17110f" stroke-width="2.5" stroke-linecap="round"/><path d="M22 20c-4-5 4-7 0-12M32 20c-4-5 4-7 0-12M42 20c-4-5 4-7 0-12" fill="none" stroke="#ec1b25" stroke-width="2.5" stroke-linecap="round" class="step-steam"/></svg>`,
  bowl: `<svg class="step-art" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path d="M50 4 30 30M58 8 34 32" stroke="#17110f" stroke-width="2.5" stroke-linecap="round"/><path d="M6 32h52c0 14-11 24-26 24S6 46 6 32z" fill="#fff" stroke="#17110f" stroke-width="2.5" stroke-linejoin="round"/><path d="M12 38h40" stroke="#ec1b25" stroke-width="3.5"/><path d="M14 32c4-6 8 6 12 0s8 6 12 0 8 6 12 0" fill="none" stroke="#17110f" stroke-width="2.5" stroke-linecap="round"/></svg>`,
};

// Sad bowl for empty states / 404
export const emptyBowl = `<svg class="empty-bowl" viewBox="0 0 200 160" aria-hidden="true" focusable="false"><path d="M20 70h160c0 46-36 78-80 78S20 116 20 70z" fill="#fff" stroke="#17110f" stroke-width="5" stroke-linejoin="round"/><path d="M34 92h132" stroke="#ec1b25" stroke-width="8"/><ellipse class="meo-eye" cx="78" cy="112" rx="6" ry="8" fill="#17110f"/><ellipse class="meo-eye" cx="122" cy="112" rx="6" ry="8" fill="#17110f"/><path d="M88 134c8-8 16-8 24 0" fill="none" stroke="#17110f" stroke-width="5" stroke-linecap="round"/><path d="M70 50c-8-12 8-16 0-30M100 50c-8-12 8-16 0-30M130 50c-8-12 8-16 0-30" fill="none" stroke="rgba(23,17,15,.3)" stroke-width="5" stroke-linecap="round" class="meo-steam"/></svg>`;
