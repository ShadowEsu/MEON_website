// Inline SVG art: icons, the "Meo" mascot crew and animated illustrations. All original artwork.

export const icon = {
  search: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="m20 20-4-4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  arrow: `<svg class="arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  pin: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"/></svg>`,
  insta: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="17.4" cy="6.6" r="1.3" fill="currentColor"/></svg>`,
  share: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="18" cy="5" r="3" fill="currentColor"/><circle cx="6" cy="12" r="3" fill="currentColor"/><circle cx="18" cy="19" r="3" fill="currentColor"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" stroke="currentColor" stroke-width="2"/></svg>`,
  print: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`,
  dice: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="8" cy="8" r="1.6" fill="currentColor"/><circle cx="16" cy="16" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="16" cy="8" r="1.6" fill="currentColor"/><circle cx="8" cy="16" r="1.6" fill="currentColor"/></svg>`,
  play: `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>`,
  qr: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M3 3h8v8H3V3Zm2 2v4h4V5H5Zm8-2h8v8h-8V3Zm2 2v4h4V5h-4ZM3 13h8v8H3v-8Zm2 2v4h4v-4H5Zm8-2h2v2h-2v-2Zm2 2h2v2h-2v-2Zm2-2h2v2h-2v-2Zm2 2h2v2h-2v-2Zm-6 2h2v2h-2v-2Zm4 0h2v2h-2v-2Zm-2 2h2v2h-2v-2Zm4 0h2v2h-2v-2Z"/></svg>`,
  home: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  bowl: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 11h18c0 5-4 9-9 9s-9-4-9-9Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M17 3 11 11M21 5l-8 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  globe: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" fill="none" stroke="currentColor" stroke-width="2"/></svg>`,
  chevron: `<svg class="chev" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  download: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3v12m0 0-5-5m5 5 5-5M4 21h16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

// Spice meter using MEON's own chilli artwork. `r` resolves asset paths relative to the page.
export function spiceMeter(level, r, { large = false, max = 5 } = {}) {
  let out = `<span class="spice${large ? " spice--lg" : ""}" role="img" aria-label="Spice level ${level} out of ${max}">`;
  for (let i = 1; i <= max; i++) out += `<img class="${i <= level ? "on" : "off"}" src="${r("assets/img/chilli-64.webp")}" alt="" width="${large ? 13 : 8}" height="${large ? 46 : 30}">`;
  return out + `</span>`;
}

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
 * "Meo" — the MEON mascot. A round, blushing noodle-dumpling buddy.
 * Parts are classed so CSS/JS can animate them: .meo-body (squish), .meo-eye (blink),
 * .meo-pupils (follow the cursor), .meo-arm-r (wave).
 */
export function mascot({ className = "", label = "", color = "#ff8a4c", belly = "#fff3e2", acc = "none", wave = true, style = "" } = {}) {
  const a11y = label ? `role="img" aria-label="${label}"` : `aria-hidden="true"`;
  const hideBrows = acc === "shades";
  return `<svg class="${className}" viewBox="0 0 220 220" ${a11y} focusable="false"${style ? ` style="${style}"` : ""}>
  <ellipse cx="110" cy="210" rx="64" ry="8" fill="rgba(23,17,15,.14)"/>
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
    ${hideBrows ? "" : ""}
    ${ACCESSORIES[acc] || ""}
  </g>
</svg>`;
}

// The crew that floats around the hero (positions in %, size in px).
export const CREW = [
  { x: 5, y: 12, s: 84, color: "#ff8a4c", acc: "chef", d: 7, delay: -1, say: "Yes chef! 🍜" },
  { x: 88, y: 8, s: 72, color: "#ff8fb0", acc: "party", d: 6, delay: -3, say: "Party bowl time!" },
  { x: 12, y: 58, s: 64, color: "#5cc3f0", acc: "shades", d: 8, delay: -2, say: "Too cool for mild 😎" },
  { x: 90, y: 52, s: 80, color: "#ffc83d", acc: "bowl", d: 6.5, delay: -4, say: "Slurp slurp!" },
  { x: 3, y: 86, s: 58, color: "#6fd08c", acc: "beanie", d: 7.5, delay: -5, say: "Cosy noodle weather", hideSm: true },
  { x: 80, y: 84, s: 66, color: "#ff5b5b", acc: "chilli", d: 5.5, delay: -2.5, say: "Level 5 or bust 🔥" },
  { x: 24, y: 6, s: 48, color: "#a78bfa", acc: "crown", d: 9, delay: -6, say: "Noodle royalty 👑", hideSm: true },
  { x: 72, y: 26, s: 50, color: "#ff8a4c", acc: "chopsticks", d: 6, delay: -1.5, say: "Pick me a packet!", hideSm: true },
];

export function crew() {
  return `<div class="crew" aria-hidden="true">${CREW.map(
    (m) => `<div class="meo${m.hideSm ? " hide-sm" : ""}" style="left:${m.x}%;top:${m.y}%;--s:${m.s}px;--d:${m.d}s;--delay:${m.delay}s" data-say="${m.say}"><span class="meo-bubble">${m.say}</span>${mascot({ color: m.color, acc: m.acc, wave: m.acc !== "chopsticks" })}</div>`
  ).join("")}</div>`;
}

// A smaller crew for inner-page heroes: four mascots at the edges, rotated by `seed` so pages differ.
const MINI_SPOTS = [{ x: 3, y: 16, s: 62 }, { x: 89, y: 10, s: 58 }, { x: 7, y: 68, s: 50 }, { x: 87, y: 64, s: 56 }];
export function crewMini(seed = 0) {
  return `<div class="crew crew--mini" aria-hidden="true">${MINI_SPOTS.map((p, i) => {
    const m = CREW[(seed + i * 3) % CREW.length];
    return `<div class="meo${i > 1 ? " hide-sm" : ""}" style="left:${p.x}%;top:${p.y}%;--s:${p.s}px;--d:${m.d}s;--delay:${m.delay}s" data-say="${m.say}"><span class="meo-bubble">${m.say}</span>${mascot({ color: m.color, acc: m.acc, wave: m.acc !== "chopsticks" })}</div>`;
  }).join("")}</div>`;
}

export const steamOverlay = `<svg class="steam-overlay" viewBox="0 0 200 90" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M60 90c-12-16 12-24 0-40s12-26 0-46"/><path d="M100 90c-12-16 12-24 0-40s12-26 0-46"/><path d="M140 90c-12-16 12-24 0-40s12-26 0-46"/></svg>`;

// Step illustrations
export const stepArt = {
  packet: `<svg class="step-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path d="M14 8h36l-3 6 3 6-3 6 3 6-3 6 3 6-3 6 3 6H14l3-6-3-6 3-6-3-6 3-6-3-6 3-6z" fill="#ec1b25" stroke="#17110f" stroke-width="3" stroke-linejoin="round"/><rect x="20" y="22" width="24" height="16" rx="3" fill="#ffc83d" stroke="#17110f" stroke-width="3"/><path d="M24 30c3-3 5 3 8 0s5 3 8 0" fill="none" stroke="#17110f" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  egg: `<svg class="step-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><ellipse cx="32" cy="36" rx="22" ry="20" fill="#fff" stroke="#17110f" stroke-width="3"/><circle cx="32" cy="38" r="10" fill="#ffc83d" stroke="#17110f" stroke-width="3"/><path d="M14 18l6 4M50 18l-6 4M32 6v6" stroke="#17110f" stroke-width="3" stroke-linecap="round"/></svg>`,
  pot: `<svg class="step-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path d="M8 28h48v6c0 13-10 22-24 22S8 47 8 34z" fill="#2aa7e1" stroke="#17110f" stroke-width="3" stroke-linejoin="round"/><path d="M4 28h56" stroke="#17110f" stroke-width="3" stroke-linecap="round"/><path d="M22 20c-4-5 4-7 0-12M32 20c-4-5 4-7 0-12M42 20c-4-5 4-7 0-12" fill="none" stroke="#17110f" stroke-width="3" stroke-linecap="round"/></svg>`,
  bowl: `<svg class="step-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path d="M50 4 30 30M58 8 34 32" stroke="#17110f" stroke-width="3" stroke-linecap="round"/><path d="M6 32h52c0 14-11 24-26 24S6 46 6 32z" fill="#fff" stroke="#17110f" stroke-width="3" stroke-linejoin="round"/><path d="M12 38h40" stroke="#ec1b25" stroke-width="4"/><path d="M14 32c4-6 8 6 12 0s8 6 12 0 8 6 12 0" fill="none" stroke="#ffc83d" stroke-width="4" stroke-linecap="round"/></svg>`,
};

// Sad bowl for empty states / 404
export const emptyBowl = `<svg viewBox="0 0 200 160" aria-hidden="true" focusable="false"><path d="M20 70h160c0 46-36 78-80 78S20 116 20 70z" fill="#fff" stroke="#17110f" stroke-width="5" stroke-linejoin="round"/><path d="M34 92h132" stroke="#ec1b25" stroke-width="8"/><ellipse class="meo-eye" cx="78" cy="112" rx="6" ry="8" fill="#17110f"/><ellipse class="meo-eye" cx="122" cy="112" rx="6" ry="8" fill="#17110f"/><path d="M88 134c8-8 16-8 24 0" fill="none" stroke="#17110f" stroke-width="5" stroke-linecap="round"/><path d="M70 50c-8-12 8-16 0-30M100 50c-8-12 8-16 0-30M130 50c-8-12 8-16 0-30" fill="none" stroke="rgba(23,17,15,.3)" stroke-width="5" stroke-linecap="round" class="meo-steam"/></svg>`;

const GLYPHS = [["み", "ㅁ", "咪", "ม"], ["อี", "이", "え", "伊"], ["お", "오", "哦", "โอ"], ["ん", "ㄴ", "恩", "น"]];

// Animated "meon" wordmark: each letter's subtitle cycles through scripts (inspired by the MEON logo video).
export function logoAnimated() {
  return `<div class="logo-anim" role="img" aria-label="meon logo">
  <div class="logo-anim-word">${["m", "e", "o", "n"].map((l) => `<span>${l}</span>`).join("")}</div>
  <div class="logo-anim-sub">${GLYPHS.map((s, i) => `<span class="cycle" style="--i:${i}">${s.map((g) => `<b>${g}</b>`).join("")}</span>`).join("")}</div>
</div>`;
}

// Small moving logo for the header.
export function logoMini() {
  const lines = [0, 1, 2, 3].map((k) => GLYPHS.map((g) => g[k]).join(" "));
  return `<span class="logo-mini" aria-hidden="true"><span class="w"><i>m</i><i>e</i><i>o</i><i>n</i></span><span class="g">${lines.map((l) => `<b>${l}</b>`).join("")}</span></span>`;
}
