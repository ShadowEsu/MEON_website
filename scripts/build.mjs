#!/usr/bin/env node
// MEON static site generator. Zero framework: reads data/*.json, writes ./site.
// Usage: node scripts/build.mjs            (uses siteUrl from data/site.json)
//        SITE_URL=https://meon.au node scripts/build.mjs
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";
import { describe, shortBlurb, cookSteps, suggestToppings } from "./lib/copy.mjs";
import { icon, spiceMeter, mascot, crew, steamOverlay, stepArt, emptyBowl, logoAnimated, logoMini } from "./lib/art.mjs";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const OUT = path.join(ROOT, "site");
const readJSON = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, "data", f), "utf8"));

const site = readJSON("site.json");
const noodlesRaw = readJSON("noodles.json");
const countries = readJSON("countries.json");
const toppings = readJSON("toppings.json");
const deals = readJSON("deals.json").filter((d) => d.active !== false);
const images = fs.existsSync(path.join(ROOT, "data", "images.json")) ? readJSON("images.json") : {};
const SITE_URL = (process.env.SITE_URL || site.siteUrl).replace(/\/+$/, "");
const BUILD_DATE = new Date().toISOString().slice(0, 10);

/* ---------------- helpers ---------------- */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const json = (v) => JSON.stringify(v).replace(/</g, "\\u003c");
const write = (rel, content) => {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
};
const copyDir = (from, to) => {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, entry.name), b = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(a, b);
    else fs.copyFileSync(a, b);
  }
};
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const sectionNum = (n) => `<span class="num">${String(n).padStart(2, "0")}</span>`;

fs.rmSync(OUT, { recursive: true, force: true });

const countryByName = new Map(countries.map((c) => [c.name, c]));
const noodles = noodlesRaw.map((n) => {
  const c = countryByName.get(n.country);
  if (!c) throw new Error(`Unknown country ${n.country} for ${n.slug}`);
  const img = images[n.slug] && fs.existsSync(path.join(SRC, "assets", images[n.slug])) ? `assets/${images[n.slug]}` : null;
  const thumb = img && fs.existsSync(path.join(SRC, "assets", "img", "noodles", "sm", `${n.slug}.webp`)) ? `assets/img/noodles/sm/${n.slug}.webp` : img;
  const dietTokens = [];
  if (/Vegetarian/.test(n.diet)) dietTokens.push("veg");
  if (/Vegan/.test(n.diet)) dietTokens.push("vegan");
  if (/Meat/.test(n.diet)) dietTokens.push("meat");
  const m = n.diet.match(/\((\w+)\)/);
  if (m) dietTokens.push(m[1].toLowerCase());
  if (/Seafood/.test(n.diet)) dietTokens.push("seafood");
  return { ...n, c, img, thumb, dietTokens, url: `noodles/${n.slug}/`, qrUrl: `${SITE_URL}/noodles/${n.slug}/?src=qr` };
});
const withPhotos = noodles.filter((n) => n.img);

const FEATURE_RE = /top|popular|viral|no\.1|award|premium|seller|hyped|featured|michelin|rated/i;
const featured = [...noodles.filter((n) => n.img && n.funNote && FEATURE_RE.test(n.funNote)), ...noodles.filter((n) => n.img && !(n.funNote && FEATURE_RE.test(n.funNote)))].slice(0, 8);

const SPICE_LADDER = [
  [0, "No heat", "Zero burn, pure comfort. Perfect for kids and spice-shy friends."],
  [1, "A whisper", "Barely-there warmth that just wakes up the broth."],
  [2, "Gentle kick", "Warm and friendly — you'll notice it, but you won't need water."],
  [3, "Proper spicy", "You'll feel it. Lips tingle, nose runs, happiness ensues."],
  [4, "Very hot", "Sweat zone. Grab a drink and take it slow."],
  [5, "Extreme", "Fire-noodle territory. Brave souls only."],
];

/* ---------------- layout ---------------- */
const NAV = [
  ["noodles/", "Noodles"],
  ["countries/", "Countries"],
  ["toppings/", "Toppings"],
  ["meon-card/", "MEON Card"],
  ["about/", "About"],
];

function layout({ urlPath, title, description, body, active = "", image = "assets/img/photos/bowl-side.webp", noindex = false, jsonld = [], scripts = [] }) {
  const depth = urlPath.split("/").filter(Boolean).length - (urlPath.endsWith(".html") ? 1 : 0);
  const root = depth ? "../".repeat(depth) : "./";
  const r = (p) => root + p;
  const canonical = `${SITE_URL}/${urlPath}`;
  const fullTitle = title ? `${title} · MEON Noodles` : "MEON · Instant Noodle Dine-In · Canning Bridge, Perth";
  const navLinks = NAV.map(([href, label]) => `<a href="${r(href)}"${active === href ? ' aria-current="page"' : ""}>${label}</a>`).join("");
  const analytics = site.analytics?.vercel
    ? `<script>(function(){var h=location.hostname;if(location.protocol.indexOf("http")!==0||/^(localhost|127\\.|0\\.0\\.0\\.0|\\[::1\\])/.test(h))return;window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};var s=document.createElement("script");s.defer=true;s.src="/_vercel/insights/script.js";document.head.appendChild(s);})();</script>`
    : "";
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "Restaurant",
      name: "MEON",
      url: SITE_URL + "/",
      image: `${SITE_URL}/assets/img/logo-512.png`,
      servesCuisine: ["Asian", "Korean", "Japanese", "Instant noodles"],
      address: { "@type": "PostalAddress", streetAddress: site.streetAddress || undefined, addressLocality: site.suburb, addressRegion: site.state, postalCode: site.postcode || undefined, addressCountry: "AU" },
      sameAs: [site.instagram, site.tiktok].filter(Boolean),
      acceptsReservations: false,
    },
    ...jsonld,
  ];
  return `<!doctype html>
<html lang="en-AU" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
${noindex ? '<meta name="robots" content="noindex">\n' : ""}<meta name="theme-color" content="#ec1b25">
<meta property="og:type" content="website">
<meta property="og:site_name" content="MEON Noodles">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(`${SITE_URL}/${image}`)}">
<meta property="og:locale" content="en_AU">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" sizes="32x32" href="${r("assets/img/favicon-32.png")}">
<link rel="icon" type="image/png" sizes="48x48" href="${r("assets/img/favicon-48.png")}">
<link rel="apple-touch-icon" href="${r("assets/img/apple-touch-icon.png")}">
<link rel="manifest" href="${r("site.webmanifest")}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=DM+Sans:wght@400;500;600;700;800&family=Instrument+Serif:ital@1&family=Quicksand:wght@400;500&display=swap">
<link rel="stylesheet" href="${r("assets/css/site.css")}?v=${BUILD_DATE}">
<script type="application/ld+json">${json(ld.length === 1 ? ld[0] : ld)}</script>
${analytics}
</head>
<body data-root="${root}">
<a class="skip-link" href="#main">Skip to content</a>
<div class="scroll-progress" aria-hidden="true"><span></span></div>
<div class="announce">📱 Scan the QR on any shelf for the noodle's story, machine setting &amp; a cook timer · <a href="${r("noodles/")}">Browse the noodle wall →</a></div>
<header class="site-header">
  <div class="wrap">
    <div class="bar">
      <a class="logo" href="${r("")}" aria-label="MEON home">${logoMini()}<span class="logo-text">meon</span></a>
      <nav class="nav" id="site-nav" aria-label="Main">
        ${navLinks}
        <a class="nav-mobile-only" href="${r("visit/")}"${active === "visit/" ? ' aria-current="page"' : ""}>Visit us</a>
      </nav>
      <div class="header-actions">
        <button class="search-btn" type="button" data-search-open aria-label="Search noodles">${icon.search}<span class="label">Search noodles</span><kbd>⌘K</kbd></button>
        <a class="btn btn--red btn--sm" href="${r("visit/")}">${icon.pin} Visit us</a>
        <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Open menu"><span></span></button>
      </div>
    </div>
  </div>
</header>
<main id="main">
${body(r)}
</main>
<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div class="footer-brand">
        <a class="logo" href="${r("")}" aria-label="MEON home">${logoMini()}<span class="logo-text">meon</span></a>
        <p>${esc(site.tagline)} Dine-in at ${esc(site.suburb)}, ${esc(site.city)}.</p>
        ${site.instagram ? `<a class="btn btn--yellow btn--sm" href="${esc(site.instagram)}" target="_blank" rel="noopener">${icon.insta} ${esc(site.instagramHandle)}</a>` : ""}
      </div>
      <div>
        <h4>Eat</h4>
        <ul>
          <li><a href="${r("noodles/")}">Noodle library</a></li>
          <li><a href="${r("noodles/?type=Soup")}">Soup noodles</a></li>
          <li><a href="${r("noodles/?type=Dry")}">Dry noodles</a></li>
          <li><a href="${r("noodles/?diet=veg")}">Vegetarian-friendly</a></li>
          <li><a href="${r("noodles/?spice=hot")}">Spicy challenge</a></li>
        </ul>
      </div>
      <div>
        <h4>Explore</h4>
        <ul>
          <li><a href="${r("countries/")}">12 countries</a></li>
          <li><a href="${r("toppings/")}">Toppings &amp; sides</a></li>
          <li><a href="${r("meon-card/")}">MEON Member Card</a></li>
          <li><a href="${r("about/")}">Our story</a></li>
          <li><a href="${r("visit/")}">Visit us</a></li>
        </ul>
      </div>
      <div>
        <h4>Visit</h4>
        <ul>
          <li>${esc(site.suburb)}, ${esc(site.city)} ${esc(site.state)}</li>
          <li><a href="${esc(site.mapsUrl)}" target="_blank" rel="noopener">Open in Google Maps</a></li>
          ${site.phone ? `<li><a href="tel:${esc(site.phone.replace(/\s+/g, ""))}">${esc(site.phone)}</a></li>` : ""}
          ${site.email ? `<li><a href="mailto:${esc(site.email)}">${esc(site.email)}</a></li>` : ""}
          <li>Dine-in only</li>
          <li><a href="${r("qr/")}">Staff: shelf QR codes</a></li>
          <li><a href="${r("qr-generator/")}">Staff: QR generator</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-big" aria-hidden="true"><span>m</span><span>e</span><span>o</span><span>n</span></div>
    <div class="footer-bottom">
      <span>© <span data-year>${new Date().getFullYear()}</span> MEON Noodles · ${esc(site.suburb)}, ${esc(site.city)} ${esc(site.state)}</span>
      <span>Brand names belong to their respective owners. Always check the packet for allergens.</span>
    </div>
  </div>
</footer>
<div class="search-overlay" id="search" role="dialog" aria-modal="true" aria-label="Search MEON">
  <div class="search-backdrop" data-search-close></div>
  <div class="search-panel">
    <div class="search-field">${icon.search}<input type="search" id="site-search" placeholder="Search 172 noodles, countries, toppings…" autocomplete="off" spellcheck="false" aria-controls="search-results" enterkeyhint="go"><button class="btn btn--ghost btn--sm" type="button" data-search-close>Esc</button></div>
    <div class="search-results" id="search-results" role="listbox"></div>
    <div class="search-foot"><span><kbd>↑</kbd> <kbd>↓</kbd> to move · <kbd>Enter</kbd> to open</span><span>Tip: try “vegan”, “tom yum” or “Japan”</span></div>
  </div>
</div>
<button class="back-top" type="button" aria-label="Back to top">${mascot({ acc: "none", wave: true })}</button>
${scripts.map((s) => `<script src="${r(s)}" defer></script>`).join("\n")}
<script src="${r("assets/js/site.js")}?v=${BUILD_DATE}" defer></script>
</body>
</html>
`;
}

/* ---------------- components ---------------- */
function noodleMedia(n, r, { size = 400, eager = false, large = false } = {}) {
  if (n.img) return `<img src="${r(large ? n.img : n.thumb)}" alt="${esc(`${n.brand} ${n.name}`)}" width="${size}" height="${size}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
  return `<span class="placeholder-art" style="--c:${n.c.color}">${mascot({ className: "placeholder-mascot", color: n.c.color === "#2D2A4A" ? "#ff8a4c" : "#ff8a4c", acc: ["bowl", "chef", "party", "beanie", "crown", "chopsticks"][n.slug.length % 6] })}<span class="ph-label">Photo coming soon</span></span>`;
}

function noodleCard(n, r, i = 0) {
  const search = [n.name, n.brand, n.country, n.flavour, n.type, n.diet, n.funNote, n.machine].filter(Boolean).join(" ");
  return `<a class="noodle-card reveal" style="--rd:${(i % 4) * 0.06}s" href="${r(n.url)}" data-search="${esc(search)}" data-name="${esc(n.name)}" data-country="${n.countryCode}" data-type="${esc(n.type || "")}" data-spice="${n.spice}" data-diet="${n.dietTokens.join(" ")}" data-photo="${n.img ? 1 : 0}">
  <span class="noodle-card-media">${noodleMedia(n, r)}<span class="noodle-card-flag" aria-hidden="true">${n.c.flag}</span>${n.funNote ? `<span class="noodle-card-note">${esc(n.funNote)}</span>` : ""}</span>
  <span class="noodle-card-body">
    <span class="noodle-card-brand">${esc(n.brand)}</span>
    <h3 class="noodle-card-name">${esc(n.name)}</h3>
    <span class="noodle-card-meta"><span>${esc(n.type || n.country)}${n.machine ? ` · ${esc(n.machine)}` : ""}</span>${spiceMeter(n.spice, r)}</span>
  </span>
</a>`;
}

function marquee(items, mod = "") {
  const group = `<div class="marquee-group">${items.map((t) => `<span>${t}</span><span class="dot"></span>`).join("")}</div>`;
  return `<div class="marquee-wrap"><div class="marquee ${mod}" aria-hidden="true"><div class="marquee-track">${group}${group}</div></div></div>`;
}

function wallRow(list, r, rev) {
  const group = `<div class="wall-group">${list.map((n) => `<a class="wall-item" href="${r(n.url)}" tabindex="-1" title="${esc(`${n.brand} ${n.name}`)}"><img src="${r(n.thumb)}" alt="" width="150" height="150" loading="lazy" decoding="async"></a>`).join("")}</div>`;
  return `<div class="wall-row${rev ? " wall-row--rev" : ""}" aria-hidden="true"><div class="marquee-track">${group}${group}</div></div>`;
}

function pageHero({ eyebrow, title, lead, extra = "", acc = "chef", color = "#ff8a4c", style = "" }) {
  return `<section class="page-hero"${style ? ` style="${style}"` : ""}><div class="wrap">
  ${eyebrow ? `<span class="eyebrow">${eyebrow}</span>` : ""}
  <h1>${title}</h1>
  ${lead ? `<p class="lead">${lead}</p>` : ""}
  ${extra}
</div>${mascot({ className: "mascot-peek", acc, color })}</section>`;
}

/* ---------------- pages ---------------- */
const pages = [];
const addPage = (urlPath, html) => { pages.push(urlPath); write(urlPath + "index.html", html); };
const countFor = (fn) => noodles.filter(fn).length;

// ---------- Home ----------
addPage("", layout({
  urlPath: "",
  description: `MEON is an instant noodle dine-in at ${site.suburb}, ${site.city}: ${noodles.length} noodles from 12 countries, piles of toppings, and a page for every packet. Walk in, pick, cook, slurp.`,
  body: (r) => `
<section class="hero">
  <div class="grid-bg"></div>
  ${crew()}
  <div class="wrap">
    <a class="badge-pill" href="${r("noodles/")}"><b>NEW</b><span class="live"></span>${noodles.length} noodles · 12 countries · dine-in only</a>
    <h1 class="hero-title">Slurp the <span class="serif">world.</span></h1>
    <p class="typer" aria-live="off">Tonight I'm craving <span class="typed" data-typer='${esc(JSON.stringify(["Buldak fire 🔥", "creamy tom yum", "Mi Goreng", "tonkotsu ramen", "black-bean jjajang", "Penang white curry", "masala magic", "kimchi ramen"]))}'>Buldak fire 🔥</span><span class="caret" aria-hidden="true"></span></p>
    <p class="lead">Instant noodles from Korea to Australia, a toppings bar that never ends and a cooking station that's all yours. Walk in, pick a packet, make it your way.</p>
    <div class="hero-actions">
      <a class="btn btn--red" href="${r("noodles/")}">Explore the noodle wall ${icon.arrow}</a>
      <button class="btn btn--light" type="button" data-search-open>${icon.search} Find a noodle</button>
    </div>
    <ul class="checks"><li>Dine-in only</li><li>QR on every shelf</li><li>Cook timer on every page</li><li>Members save 10%</li></ul>

    <div class="stage reveal">
      <div class="stage-float stage-float--a"><span class="ico">🍜</span><span><strong>${noodles.length} noodles</strong><small>on the wall right now</small></span></div>
      <div class="stage-float stage-float--b"><span class="ico">⏱️</span><span><strong>Machine setting</strong><small>on every noodle page</small></span></div>
      <div class="stage-frame"><div class="stage-grid">
        <div><img src="${r("assets/img/photos/bowl-side.webp")}" alt="A MEON bowl of black-bean noodles with sliced beef and a soft egg" width="900" height="900" fetchpriority="high"><span class="stage-label">🥢 Cooked your way</span></div>
        <div class="stage-red">${logoAnimated()}</div>
        <div><img src="${r("assets/img/photos/bowl-top-egg.webp")}" alt="Noodles topped with enoki, egg and pig fishcakes" width="900" height="900" loading="lazy"><span class="stage-label">🥚 Top it up</span></div>
        <div><img src="${r("assets/img/photos/bowl-side-seaweed.webp")}" alt="A MEON bowl with seaweed, beef and noodles" width="900" height="900" loading="lazy"><span class="stage-label">🍜 ${noodles.length} to choose from</span></div>
        <div><img src="${r("assets/img/photos/bowl-top-dry.webp")}" alt="Dry noodles with beef, fishballs and seaweed" width="900" height="900" loading="lazy"><span class="stage-label">🌶️ Pick your heat</span></div>
      </div></div>
    </div>
  </div>
</section>

<section class="section--tight">
  <div class="wrap">
    <div class="stats reveal">
      <div class="stat"><strong data-count="${noodles.length}">${noodles.length}</strong><span>instant noodles</span></div>
      <div class="stat"><strong data-count="12">12</strong><span>countries on the wall</span></div>
      <div class="stat"><strong data-count="${toppings.length}" data-suffix="+">${toppings.length}+</strong><span>toppings &amp; sides</span></div>
      <div class="stat"><strong data-count="10" data-suffix="%">10%</strong><span>off for members</span></div>
    </div>
  </div>
</section>

<section class="section--tight" aria-label="On the noodle wall">
  <p class="center muted" style="font-weight:700;letter-spacing:.14em;text-transform:uppercase;font-size:.78rem;margin-bottom:18px">On the noodle wall right now</p>
  <div class="wall">${wallRow(withPhotos.slice(0, Math.ceil(withPhotos.length / 2)), r, false)}${wallRow(withPhotos.slice(Math.ceil(withPhotos.length / 2)), r, true)}</div>
</section>

<section class="section" id="how">
  <div class="wrap">
    <div class="section-head reveal"><div><span class="eyebrow">${sectionNum(1)} How MEON works</span><h2>Four steps to <span class="serif red">noodle heaven</span></h2><p class="lead">No menus to memorise, no online orders. Just you, the noodle wall and a steaming bowl.</p></div></div>
    <div class="steps">
      <div class="step reveal"><span class="step-num"></span>${stepArt.packet}<h3>Pick a packet</h3><p>Browse ${noodles.length} noodles from 12 countries. Scan the QR on the shelf to learn about any packet.</p></div>
      <div class="step reveal" style="--rd:.08s"><span class="step-num"></span>${stepArt.egg}<h3>Add toppings</h3><p>Egg, cheese, beef, fishcake, greens — stack it up from our toppings bar.</p></div>
      <div class="step reveal" style="--rd:.16s"><span class="step-num"></span>${stepArt.pot}<h3>Cook it your way</h3><p>Set the cooking machine to the noodle's setting and start the timer on its page.</p></div>
      <div class="step reveal" style="--rd:.24s"><span class="step-num"></span>${stepArt.bowl}<h3>Slurp &amp; repeat</h3><p>Grab a seat, dig in, then plan your next country. Members save 10% every visit.</p></div>
    </div>
  </div>
</section>

<section class="section section--alt">
  <div class="wrap">
    <div class="section-head reveal">
      <div><span class="eyebrow">${sectionNum(2)} Crew favourites</span><h2>The ones everyone's <span class="serif red">talking about</span></h2></div>
      <a class="btn btn--light" href="${r("noodles/")}">See all ${noodles.length} ${icon.arrow}</a>
    </div>
    <div class="card-grid">${featured.map((n, i) => noodleCard(n, r, i)).join("")}</div>
  </div>
</section>

<section class="section">
  <div class="wrap roulette" data-roulette data-root="${r("")}">
    <div class="reveal">
      <span class="eyebrow">${sectionNum(3)} Can't decide?</span>
      <h2>Spin the <span class="serif red">Noodle Roulette</span></h2>
      <p class="lead">Let fate pick your next bowl. Choose your heat, hit spin, then go find it on the wall.</p>
      <p class="visually-hidden" aria-live="polite" data-roulette-live></p>
    </div>
    <div class="roulette-machine reveal">
      <div class="roulette-lights" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
      <div class="roulette-window"><div class="roulette-reel">
        <div class="roulette-item"><span class="placeholder-art" aria-hidden="true">🎲</span><span><span class="noodle-card-brand">Ready when you are</span><h3>Press spin to pick a noodle</h3></span></div>
      </div></div>
      <div class="roulette-controls">
        <label class="visually-hidden" for="roulette-heat">Heat level</label>
        <select class="select" id="roulette-heat"><option value="any">Any heat</option><option value="mild">No heat</option><option value="some">A little kick</option><option value="fire">Bring the fire 🔥</option></select>
        <button class="btn btn--yellow" type="button" data-spin>${icon.dice} Spin!</button>
      </div>
    </div>
  </div>
  <script type="application/json" id="noodle-data">${json(noodles.map((n) => ({ slug: n.slug, name: n.name, brand: n.brand, flag: n.c.flag, spice: n.spice, type: n.type, img: n.thumb })))}</script>
</section>

<section class="section section--ink">
  <div class="wrap">
    <div class="section-head reveal">
      <div><span class="eyebrow">${sectionNum(4)} A passport in a bowl</span><h2>12 countries, <span class="serif" style="color:var(--yellow)">one noodle wall</span></h2><p class="lead">Every country has its own noodle personality. Which one is yours?</p></div>
      <a class="btn btn--yellow" href="${r("countries/")}">All countries ${icon.arrow}</a>
    </div>
    <div class="country-grid">
      ${countries.map((c, i) => `<a class="country-tile reveal" style="--c:${c.color};--rd:${(i % 6) * 0.04}s" href="${r(`countries/${c.slug}/`)}"><span class="country-flag" aria-hidden="true">${c.flag}</span><span><h3>${esc(c.name)}</h3><span class="country-count">${plural(countFor((n) => n.country === c.name), "noodle")}</span></span></a>`).join("")}
    </div>
  </div>
</section>

<section class="section" id="spice">
  <div class="wrap split">
    <div class="reveal">
      <span class="eyebrow">${sectionNum(5)} The MEON spice ladder</span>
      <h2>From cosy to <span class="serif red">“call my mum”</span></h2>
      <p class="lead">Every noodle is rated from 0 to 5 chillies. Start low, climb high, and earn your bragging rights.</p>
      <a class="btn btn--red" href="${r("noodles/?spice=hot")}">Take the spicy challenge ${icon.arrow}</a>
    </div>
    <div class="ladder reveal">
      ${SPICE_LADDER.map(([lvl, name, desc]) => `<a href="${r(`noodles/?spice=${lvl}`)}">${spiceMeter(lvl, r)}<span><strong>${lvl} · ${name}</strong><small>${desc}</small></span><span class="count">${countFor((n) => n.spice === lvl)}</span></a>`).join("")}
    </div>
  </div>
</section>

${marquee(["Egg 🥚", "Cheese 🧀", "Beef 🥩", "Fishcake 🍥", "Corn 🌽", "Seaweed 🌿", "Spam 🥫", "Tofu", "Shrimp katsu 🍤", "Spring onion 🌱", "Enoki 🍄", "Crab sticks 🦀"], "marquee--yellow")}

<section class="section">
  <div class="wrap split split--rev">
    <div class="photo-stack reveal">
      <figure><img src="${r("assets/img/photos/topping-fishcake.webp")}" alt="A cute pig-shaped fishcake" width="900" height="900" loading="lazy"></figure>
      <figure><img src="${r("assets/img/photos/topping-enoki.webp")}" alt="Fresh enoki mushrooms" width="900" height="900" loading="lazy"></figure>
      <span class="tag chip chip--yellow" style="font-size:1rem;padding:.55em 1.1em">Make it yours ✨</span>
    </div>
    <div class="reveal">
      <span class="eyebrow">${sectionNum(6)} Toppings bar</span>
      <h2>The packet is just <span class="serif red">the beginning</span></h2>
      <p class="lead">Jammy eggs, melty cheese, microwave-ready beef and meatballs, crab sticks, shrimp katsu, enoki, seaweed and so much more. Build a bowl nobody else has ever made.</p>
      <a class="btn btn--light" href="${r("toppings/")}">See every topping ${icon.arrow}</a>
    </div>
  </div>
</section>

<section class="section section--sky">
  <div class="wrap split">
    <div class="reveal">
      <span class="eyebrow" style="color:var(--yellow)">${sectionNum(7)} MEON Member Card</span>
      <h2>Load up. Slurp more. <span class="serif">Save 10%.</span></h2>
      <p class="lead">Grab your free MEON card in store, top it up, pay like cash and unlock member-only savings — including <strong>10% off eligible food items</strong> every visit.</p>
      <a class="btn btn--yellow" href="${r("meon-card/")}">How the card works ${icon.arrow}</a>
    </div>
    <div class="reveal" style="display:grid;place-items:center"><div class="member-card"><img src="${r("assets/img/photos/meon-member-card.webp")}" alt="The MEON Member Card featuring the MEON mascot and friends" width="945" height="591" loading="lazy"></div></div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head reveal">
      <div><span class="eyebrow">${sectionNum(8)} MEON on screen</span><h2>Watch, crave, <span class="serif red">visit</span></h2><p class="lead">Follow ${esc(site.instagramHandle)} for new arrivals, spicy challenges and behind-the-scenes slurps.</p></div>
      <a class="btn btn--red" href="${esc(site.instagram)}" target="_blank" rel="noopener">${icon.insta} Follow us</a>
    </div>
    <div class="reel-grid">
      <div class="reel reel--contain reveal"><video poster="${r("assets/video/meon-logo-loop.jpg")}" muted loop playsinline preload="none" data-autoplay aria-label="MEON logo animation"><source src="${r("assets/video/meon-logo-loop.webm")}" type="video/webm"><source src="${r("assets/video/meon-logo-loop.mp4")}" type="video/mp4"></video></div>
      <a class="reel reveal" style="--rd:.08s" href="${esc(site.instagram)}reels/" target="_blank" rel="noopener"><img src="${r("assets/img/photos/bowl-side-seaweed.webp")}" alt="" width="900" height="900" loading="lazy"><span class="reel-play">${icon.play}</span><span class="reel-label">${icon.insta} Reels on Instagram</span></a>
      <div class="reel reveal" style="--rd:.16s;background:var(--red);display:grid;place-items:center;padding:12%">${logoAnimated()}</div>
      <a class="reel reveal" style="--rd:.24s" href="${esc(site.instagram)}" target="_blank" rel="noopener"><img src="${r("assets/img/photos/bowl-top-egg.webp")}" alt="" width="900" height="900" loading="lazy"><span class="reel-play">${icon.play}</span><span class="reel-label">${icon.insta} ${esc(site.instagramHandle)}</span></a>
    </div>
  </div>
</section>

<section class="section section--red">
  <div class="wrap split">
    <div class="reveal">
      <span class="eyebrow">${sectionNum(9)} Come hungry</span>
      <h2>Find us at <span class="serif">${esc(site.suburb)}</span></h2>
      <p class="lead">${esc(site.orderingNote)}</p>
      <div class="hero-actions" style="justify-content:flex-start;margin-bottom:0">
        <a class="btn btn--yellow" href="${r("visit/")}">${icon.pin} Visit info</a>
        <a class="btn btn--outline-light" href="${esc(site.mapsUrl)}" target="_blank" rel="noopener">Open Maps ${icon.arrow}</a>
      </div>
    </div>
    <div class="reveal" style="display:grid;place-items:center">${mascot({ label: "Meo, the MEON mascot, waving hello", acc: "bowl", color: "#ffc83d", style: "width:min(320px,70vw);animation:float 4s ease-in-out infinite;overflow:visible" })}</div>
  </div>
</section>
`,
}));

// ---------- Noodle library ----------
addPage("noodles/", layout({
  urlPath: "noodles/",
  title: "Noodle library",
  active: "noodles/",
  description: `Browse all ${noodles.length} instant noodles at MEON — filter by country, soup or dry, spice level and diet. Every packet has its own page.`,
  body: (r) => `
<section class="library-hero">
  <div class="wrap">
    <span class="eyebrow">The noodle wall</span>
    <h1>Noodle <span class="serif red">library</span></h1>
    <p class="lead">${noodles.length} instant noodles from 12 countries. Search, filter and find your next favourite — then grab it off the wall.</p>
  </div>
</section>
<div data-library>
  <div class="filters">
    <div class="wrap"><div class="filters-inner">
      <div class="filters-row" role="search">
        <label class="search"><span class="visually-hidden">Search noodles</span>${icon.search}<input id="q" type="search" placeholder="Search kimchi, Buldak, tom yum…" autocomplete="off" enterkeyhint="search"></label>
        <label class="visually-hidden" for="f-country">Country</label>
        <select class="select" id="f-country"><option value="all">All countries</option>${countries.map((c) => `<option value="${c.code}">${c.flag} ${esc(c.name)}</option>`).join("")}</select>
        <label class="visually-hidden" for="f-type">Style</label>
        <select class="select" id="f-type"><option value="all">Soup &amp; dry</option><option value="Soup">Soup</option><option value="Dry">Dry</option><option value="Porridge">Porridge</option></select>
        <label class="visually-hidden" for="f-spice">Spice</label>
        <select class="select" id="f-spice"><option value="all">Any spice</option><option value="mild">No heat (0)</option><option value="medium">Medium (1–2)</option><option value="hot">Hot (3+)</option>${[0, 1, 2, 3, 4, 5].map((l) => `<option value="${l}">Exactly ${l} 🌶️</option>`).join("")}</select>
        <label class="visually-hidden" for="f-diet">Diet</label>
        <select class="select" id="f-diet"><option value="all">Any diet</option><option value="veg">Vegetarian-friendly</option><option value="vegan">Vegan</option><option value="chicken">Chicken</option><option value="beef">Beef</option><option value="pork">Pork</option><option value="seafood">Seafood</option></select>
      </div>
      <div class="filter-pills" aria-label="Quick country filters">
        ${countries.map((c) => `<button class="pill" type="button" data-pill="country" data-value="${c.code}" aria-pressed="false">${c.flag} ${esc(c.name)}</button>`).join("")}
      </div>
    </div></div>
  </div>
  <div class="wrap">
    <div class="results-bar"><span data-result-count aria-live="polite">${noodles.length} noodles</span>
      <span style="display:flex;gap:10px;align-items:center"><label class="visually-hidden" for="f-sort">Sort</label><select class="select" id="f-sort"><option value="featured">By country</option><option value="photo">Photos first</option><option value="az">A–Z</option><option value="hot">Hottest first</option><option value="mild">Mildest first</option></select>
      <button class="btn btn--ghost btn--sm" type="button" data-reset>Reset</button></span>
    </div>
    <div class="card-grid">${noodles.map((n, i) => noodleCard(n, r, i)).join("")}</div>
    <div class="empty-state">${emptyBowl}<h2>No noodles match… yet</h2><p class="lead" style="margin-inline:auto">Try a different filter, or ask the crew — new packets land all the time.</p><button class="btn btn--red" type="button" data-reset>Clear filters</button></div>
    <p class="note" style="margin:40px 0 64px">* Vegetarian-friendly means the noodle and seasoning are generally meat-free, but recipes vary by batch and region. Always check the packet if you have dietary requirements or allergies.</p>
  </div>
</div>
`,
}));

// ---------- Noodle detail pages ----------
noodles.forEach((n, idx) => {
  const cook = cookSteps(n);
  const paras = describe(n);
  const tops = suggestToppings(n, toppings);
  const prev = noodles[(idx - 1 + noodles.length) % noodles.length];
  const next = noodles[(idx + 1) % noodles.length];
  const similar = noodles
    .filter((o) => o.slug !== n.slug)
    .map((o) => ({ o, s: (o.country === n.country ? 2 : 0) + (o.type === n.type ? 1 : 0) + (Math.abs(o.spice - n.spice) <= 1 ? 1 : 0) + (o.brand === n.brand ? 1 : 0) + (o.img ? 0.5 : 0) }))
    .sort((a, b) => b.s - a.s || a.o.slug.localeCompare(b.o.slug))
    .slice(0, 4)
    .map((x) => x.o);
  const ladder = SPICE_LADDER[n.spice];
  addPage(n.url, layout({
    urlPath: n.url,
    title: `${n.name} – ${n.brand}`,
    active: "noodles/",
    image: n.img || "assets/img/photos/bowl-side.webp",
    description: `${n.brand} ${n.name} (${n.country}) at MEON ${site.suburb}. ${shortBlurb(n)} ${n.type ? n.type + " noodle, " : ""}spice ${n.spice}/5.`,
    jsonld: [
      { "@context": "https://schema.org", "@type": "MenuItem", name: `${n.brand} ${n.name}`, description: shortBlurb(n), image: n.img ? `${SITE_URL}/${n.img}` : undefined, url: `${SITE_URL}/${n.url}`, suitableForDiet: n.diet === "Vegetarian/Vegan" ? "https://schema.org/VeganDiet" : undefined },
      { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Noodles", item: `${SITE_URL}/noodles/` },
        { "@type": "ListItem", position: 2, name: n.country, item: `${SITE_URL}/countries/${n.c.slug}/` },
        { "@type": "ListItem", position: 3, name: n.name, item: `${SITE_URL}/${n.url}` },
      ] },
    ],
    body: (r) => `
<div class="wrap">
  <nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="${r("")}">Home</a></li><li><a href="${r("noodles/")}">Noodles</a></li><li><a href="${r(`countries/${n.c.slug}/`)}">${n.c.flag} ${esc(n.country)}</a></li><li aria-current="page">${esc(n.name)}</li></ol></nav>
  <article class="detail">
    <div class="detail-media">
      <div style="position:relative">
        ${n.funNote ? `<span class="fun-sticker">${esc(n.funNote)}</span>` : ""}
        <div class="detail-photo">${noodleMedia(n, r, { size: 800, eager: true, large: true })}${n.img ? steamOverlay : ""}</div>
      </div>
    </div>
    <div>
      <p class="qr-banner" data-qr-banner hidden>👋 You scanned the shelf! Here's everything about this packet — machine setting and cook timer included.</p>
      <span class="detail-brand">${esc(n.brand)}</span>
      <h1>${esc(n.name)}</h1>
      <div class="detail-chips">
        <a class="chip" href="${r(`countries/${n.c.slug}/`)}">${n.c.flag} ${esc(n.country)}</a>
        ${n.type ? `<a class="chip chip--sky" href="${r(`noodles/?type=${n.type}`)}">${esc(n.type)}</a>` : ""}
        <a class="chip ${n.dietTokens.includes("veg") ? "chip--green" : ""}" href="${r(`noodles/?diet=${n.dietTokens.includes("vegan") ? "vegan" : n.dietTokens.includes("veg") ? "veg" : n.dietTokens.at(-1) || "all"}`)}">${esc(n.diet)}${n.dietNote ? "*" : ""}</a>
        ${n.weightG ? `<span class="chip chip--ghost">${n.weightG} g</span>` : ""}
      </div>
      ${paras.map((p) => `<p class="lead">${p}</p>`).join("")}
      ${n.machine ? `<div class="machine"><span class="code">${esc(n.machine)}</span><span><small>Cooking machine setting</small><strong>Select program ${esc(n.machine)} for this noodle</strong></span></div>` : ""}
      <dl class="spec-grid">
        <div class="spec"><dt>Spice level</dt><dd>${spiceMeter(n.spice, r, { large: true })}<small>${n.spice}/5 · ${ladder[1]}</small></dd></div>
        <div class="spec"><dt>Style</dt><dd>${esc(n.type || "Ask the crew")}</dd></div>
        <div class="spec"><dt>Diet</dt><dd style="font-size:1.05rem">${esc(n.diet)}${n.dietNote ? "*" : ""}</dd></div>
        <div class="spec"><dt>Packet size</dt><dd>${n.weightG ? `${n.weightG} g` : "Ask the crew"}</dd></div>
      </dl>

      <section class="panel" aria-labelledby="timer-h">
        <h2 id="timer-h">Cook timer</h2>
        <div class="timer" data-timer data-default="${cook.minutes}">
          <div class="timer-dial"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="track" cx="60" cy="60" r="54" fill="none" stroke-width="12"/><circle class="prog" cx="60" cy="60" r="54" fill="none" stroke-width="12" stroke-linecap="round"/></svg><span class="timer-readout" role="timer" aria-live="off">${cook.minutes}:00</span></div>
          <div>
            <div class="timer-presets" role="group" aria-label="Timer length">${[3, 4, 5].map((m) => `<button class="pill" type="button" data-minutes="${m}" aria-pressed="${m === cook.minutes}">${m} min</button>`).join("")}</div>
            <div class="timer-controls"><button class="btn btn--red btn--sm" type="button" data-timer-start>Start</button><button class="btn btn--ghost btn--sm" type="button" data-timer-reset>Reset</button></div>
            <p class="note" data-timer-status aria-live="polite"></p>
          </div>
        </div>
      </section>

      <section class="panel" aria-labelledby="cook-h">
        <h2 id="cook-h">How to cook it at MEON</h2>
        <ol class="cook-steps">${cook.steps.map(([h, t]) => `<li><span><strong>${h}</strong>${t}</span></li>`).join("")}</ol>
        <p class="note">Packet instructions win if they differ — and the crew is always happy to help.</p>
      </section>

      ${tops.length ? `<section class="panel" aria-labelledby="top-h">
        <h2 id="top-h">Make it MEON</h2>
        <p class="muted">Toppings our crew loves with this one:</p>
        <div class="detail-chips" style="margin:0">${tops.map((t) => `<a class="chip chip--yellow" href="${r("toppings/")}#${t.id}">${t.emoji} ${esc(t.name)}</a>`).join("")}</div>
      </section>` : ""}

      ${n.dietNote ? `<p class="note">* Vegetarian-friendly means the noodle and seasoning are generally meat-free, but recipes vary — always check the packet if you have dietary requirements or allergies.</p>` : `<p class="note">Always check the packet for allergens and full ingredients.</p>`}
      <div class="share-row">
        <button class="btn btn--light btn--sm" type="button" data-share data-url="${esc(`${SITE_URL}/${n.url}`)}" data-title="${esc(`${n.brand} ${n.name} at MEON`)}">${icon.share} Share</button>
        <button class="btn btn--light btn--sm" type="button" data-search-open>${icon.search} Find another noodle</button>
      </div>
      <nav class="detail-nav" aria-label="More noodles">
        <a href="${r(prev.url)}"><small>← Previous</small><strong>${esc(prev.name)}</strong></a>
        <a href="${r(next.url)}"><small>Next →</small><strong>${esc(next.name)}</strong></a>
      </nav>
    </div>
  </article>
</div>
<section class="section section--tight section--alt">
  <div class="wrap">
    <div class="section-head"><div><span class="eyebrow">Keep exploring</span><h2>You might <span class="serif red">also like</span></h2></div><a class="btn btn--light btn--sm" href="${r(`countries/${n.c.slug}/`)}">More from ${esc(n.country)} ${icon.arrow}</a></div>
    <div class="card-grid">${similar.map((o, i) => noodleCard(o, r, i)).join("")}</div>
  </div>
</section>
`,
  }));
});

// ---------- Countries ----------
addPage("countries/", layout({
  urlPath: "countries/",
  title: "Noodles by country",
  active: "countries/",
  description: "Explore MEON's instant noodles country by country — South Korea, Japan, Indonesia, Vietnam, China, Malaysia, Thailand, Singapore, India, the Philippines, Taiwan and Australia.",
  body: (r) => `
${pageHero({ eyebrow: "A passport in a bowl", title: `Noodles by <span class="serif red">country</span>`, lead: "Twelve countries, twelve noodle personalities. Pick a flag and start your trip.", acc: "party", color: "#5cc3f0" })}
<section class="section section--tight" style="padding-top:0"><div class="wrap">
  <div class="country-grid">
    ${countries.map((c, i) => `<a class="country-tile reveal" style="--c:${c.color};--rd:${(i % 4) * 0.05}s" href="${r(`countries/${c.slug}/`)}"><span class="country-flag" aria-hidden="true">${c.flag}</span><span><h3>${esc(c.name)}</h3><span class="country-count">${plural(countFor((n) => n.country === c.name), "noodle")}</span><p style="margin:.5em 0 0;font-size:.92rem;color:var(--muted)">${esc(c.headline)}</p></span></a>`).join("")}
  </div>
</div></section>
`,
}));

for (const c of countries) {
  const list = noodles.filter((n) => n.country === c.name);
  const others = countries.filter((o) => o.code !== c.code);
  addPage(`countries/${c.slug}/`, layout({
    urlPath: `countries/${c.slug}/`,
    title: `${c.name} instant noodles`,
    active: "countries/",
    image: list.find((n) => n.img)?.img,
    description: `${list.length} instant noodles from ${c.name} at MEON ${site.suburb}. ${c.headline}`,
    body: (r) => `
<section class="page-hero" style="background:linear-gradient(180deg, ${c.color}1a, transparent)"><div class="wrap">
  <nav class="crumbs" aria-label="Breadcrumb" style="padding:0 0 18px"><ol><li><a href="${r("")}">Home</a></li><li><a href="${r("countries/")}">Countries</a></li><li aria-current="page">${esc(c.name)}</li></ol></nav>
  <span class="flag-xl" aria-hidden="true">${c.flag}</span><br>
  <span class="eyebrow">${plural(list.length, "noodle")} from ${esc(c.name)}</span>
  <h1>${esc(c.name)}</h1>
  <p class="lead"><strong>${esc(c.headline)}</strong> ${esc(c.intro)}</p>
  <a class="btn btn--light" href="${r(`noodles/?country=${c.code}`)}">Filter in the library ${icon.arrow}</a>
</div>${mascot({ className: "mascot-peek", acc: "chopsticks", color: "#ff8a4c" })}</section>
<section class="section section--tight" style="padding-top:0"><div class="wrap">
  <div class="card-grid">${list.map((n, i) => noodleCard(n, r, i)).join("")}</div>
</div></section>
<section class="section section--tight section--alt"><div class="wrap">
  <h2>Keep <span class="serif red">travelling</span></h2>
  <div class="filter-pills" style="flex-wrap:wrap">${others.map((o) => `<a class="pill" href="${r(`countries/${o.slug}/`)}">${o.flag} ${esc(o.name)}</a>`).join("")}</div>
</div></section>
`,
  }));
}

// ---------- Toppings ----------
const groups = [...new Set(toppings.map((t) => t.group))];
addPage("toppings/", layout({
  urlPath: "toppings/",
  title: "Toppings & sides",
  active: "toppings/",
  description: "Level up your instant noodles at MEON: eggs, cheese, microwave-ready beef and meatballs, fishcake, crab sticks, shrimp katsu, mushrooms, greens and more.",
  body: (r) => `
<section class="page-hero"><div class="wrap split">
  <div>
    <span class="eyebrow">Toppings bar</span>
    <h1>Toppings <span class="serif red">&amp; sides</span></h1>
    <p class="lead">The packet is just the start. Stack your bowl with proteins, veg and little extras — the more, the merrier.</p>
    <div class="filter-pills" style="flex-wrap:wrap">${groups.map((g) => `<a class="pill" href="#${g.toLowerCase().replace(/[^a-z]+/g, "-")}">${esc(g)}</a>`).join("")}</div>
  </div>
  <div class="photo-stack">
    <figure><img src="${r("assets/img/photos/topping-fishcake.webp")}" alt="A cute pig-shaped fishcake on a plate" width="900" height="900"></figure>
    <figure><img src="${r("assets/img/photos/topping-enoki.webp")}" alt="Fresh enoki mushrooms on a plate" width="900" height="900"></figure>
  </div>
</div></section>
${groups.map((g) => `<section class="section section--tight" style="padding-top:0" id="${g.toLowerCase().replace(/[^a-z]+/g, "-")}"><div class="wrap">
  <h2 class="reveal">${esc(g)}</h2>
  <div class="topping-grid">${toppings.filter((t) => t.group === g).map((t, i) => `<div class="topping reveal" style="--rd:${(i % 5) * 0.04}s" id="${t.id}">${t.img ? `<img src="${r(t.img)}" alt="${esc(t.name)}" width="300" height="300" loading="lazy">` : `<span class="emoji" aria-hidden="true">${t.emoji}</span>`}<strong>${esc(t.name)}</strong><span>${esc(t.desc)}</span></div>`).join("")}</div>
</div></section>`).join("")}
<section class="section section--tight"><div class="wrap"><p class="note">Topping availability changes day to day — ask the crew what's fresh. Always let us know about allergies.</p></div></section>
`,
}));

// ---------- MEON Card ----------
addPage("meon-card/", layout({
  urlPath: "meon-card/",
  title: "MEON Member Card",
  active: "meon-card/",
  image: "assets/img/photos/meon-member-card.webp",
  description: "The MEON Member Card is free: load money in store, pay like cash and get 10% off eligible food items every visit.",
  body: (r) => `
<section class="page-hero section--sky" style="color:#fff"><div class="wrap split">
  <div>
    <span class="eyebrow" style="color:var(--yellow)">Members save more</span>
    <h1>MEON <span class="serif">Member Card</span></h1>
    <p class="lead" style="color:rgba(255,255,255,.92)">Loads of fun, anywhere. Get your card free, top it up, use your balance like cash and enjoy exclusive perks — including 10% off eligible food items.</p>
  </div>
  <div style="display:grid;place-items:center"><div class="member-card"><img src="${r("assets/img/photos/meon-member-card.webp")}" alt="The MEON Member Card" width="945" height="591"></div></div>
</div></section>
<section class="section"><div class="wrap">
  <div class="section-head reveal"><div><span class="eyebrow">How it works</span><h2>Four taps to <span class="serif red">savings</span></h2></div></div>
  <div class="steps">
    <div class="step reveal"><span class="step-num"></span><span class="step-icon" style="font-size:2.8rem;display:block">💳</span><h3>Get your card</h3><p>Ask the crew at the counter — the card itself is free.</p></div>
    <div class="step reveal" style="--rd:.08s"><span class="step-num"></span><span class="step-icon" style="font-size:2.8rem;display:block">💰</span><h3>Load it up</h3><p>Load a minimum amount to activate, then top up any time in store.</p></div>
    <div class="step reveal" style="--rd:.16s"><span class="step-num"></span><span class="step-icon" style="font-size:2.8rem;display:block">🍜</span><h3>Pay like cash</h3><p>Fast checkout and easy spend tracking every visit.</p></div>
    <div class="step reveal" style="--rd:.24s"><span class="step-num"></span><span class="step-icon" style="font-size:2.8rem;display:block">🎉</span><h3>Save 10%</h3><p>Cardholders get 10% off eligible food items — noodles, toppings and sides.</p></div>
  </div>
</div></section>
<section class="section section--yellow"><div class="wrap split">
  <div class="reveal">
    <span class="eyebrow" style="color:var(--ink)">Current deals</span>
    <h2>Member <span class="serif">perks</span></h2>
    <ul class="perk-list">${deals.map((d) => `<li><span class="ico" style="background:#fff" aria-hidden="true">${d.emoji}</span><span><strong>${esc(d.title)}</strong><br>${esc(d.detail)}</span></li>`).join("")}</ul>
    <p class="note" style="color:var(--ink)">Discounts apply to eligible food items only. Ask in store for full terms.</p>
  </div>
  <div class="reveal" style="display:grid;place-items:center">${mascot({ label: "Meo, the MEON mascot", acc: "crown", color: "#ff8fb0", style: "width:min(300px,70vw);animation:float 4s ease-in-out infinite;overflow:visible" })}</div>
</div></section>
`,
}));

// ---------- About ----------
addPage("about/", layout({
  urlPath: "about/",
  title: "About MEON",
  active: "about/",
  description: `MEON is an instant noodle dine-in at ${site.suburb}, ${site.city} — celebrating flavour, culture and the simple joy of noodles from 12 countries.`,
  body: (r) => `
<section class="page-hero"><div class="wrap split">
  <div>
    <span class="eyebrow">Our story</span>
    <h1>Get to know <span class="serif red">MEON</span></h1>
    <p class="lead">We're here to celebrate flavour, culture and the simple joy of noodles. It's fast, fun and full of choices — just the way noodles should be.</p>
  </div>
  <div style="display:grid;place-items:center">${logoAnimated()}</div>
</div></section>
<section class="section section--tight"><div class="wrap split">
  <div class="reveal">
    <h2>What sets us <span class="serif red">apart</span></h2>
    <p class="lead">${noodles.length} kinds of instant noodles from 12 countries, all in one place. From sweet to spicy, soupy to dry, we've got the noodles — and you get to build your own bowl with all your favourite toppings.</p>
    <p>Every packet on our wall has its own page on this site. Scan the QR code on the shelf to see what it tastes like, how hot it is, which machine setting to use and which toppings go best.</p>
    <blockquote class="panel" style="font-family:var(--font-serif);font-style:italic;font-size:1.35rem;line-height:1.4">“Meon is a versatile instant noodle celebrating cultural diversity, inviting creativity and fun with every bowl. Enjoy it as is or customise with toppings to make each meal uniquely yours.”</blockquote>
  </div>
  <div class="reveal">
    <h2>Our name, <span class="serif red">in every language</span></h2>
    <p class="lead">Look closely at our logo: under “meon” you'll find letters borrowed from Japanese, Thai, Chinese and Korean. It's our little nod to the noodle cultures that inspire every bowl we serve.</p>
    <a class="btn btn--red" href="${r("countries/")}">Meet the countries ${icon.arrow}</a>
  </div>
</div></section>
<section class="section section--ink"><div class="wrap">
  <div class="info-grid">
    <div class="info-card reveal"><h3><span class="ico" aria-hidden="true">🌏</span>Global</h3><p>Noodles from Korea, Japan, Indonesia, Vietnam, China, Malaysia, Thailand, Singapore, India, the Philippines, Taiwan and Australia.</p></div>
    <div class="info-card reveal" style="--rd:.08s"><h3><span class="ico" aria-hidden="true">🧑‍🍳</span>Your way</h3><p>Pick your packet, pile on toppings and cook it exactly how you like it.</p></div>
    <div class="info-card reveal" style="--rd:.16s"><h3><span class="ico" aria-hidden="true">🪑</span>Dine-in</h3><p>${esc(site.orderingNote)}</p></div>
  </div>
</div></section>
`,
}));

// ---------- Visit ----------
const addressLine = [site.streetAddress, `${site.suburb} ${site.state} ${site.postcode}`.trim()].filter(Boolean).join(", ");
addPage("visit/", layout({
  urlPath: "visit/",
  title: "Visit us",
  active: "visit/",
  description: `Find MEON at ${site.suburb}, ${site.city} ${site.state}. Dine-in only — walk in, pick a packet and start cooking.`,
  body: (r) => `
${pageHero({ eyebrow: "Come hungry", title: `Visit <span class="serif red">MEON</span>`, lead: esc(site.orderingNote), acc: "bowl", color: "#ffc83d" })}
<section class="section section--tight" style="padding-top:0"><div class="wrap">
  <div class="info-grid">
    <div class="info-card reveal"><h3><span class="ico" aria-hidden="true">📍</span>Where</h3>
      <p><strong>MEON Noodles</strong><br>${esc(addressLine)}<br>${esc(site.city)}, Western Australia</p>
      <a class="btn btn--red btn--sm" href="${esc(site.mapsUrl)}" target="_blank" rel="noopener">${icon.pin} Open in Google Maps</a></div>
    <div class="info-card reveal" style="--rd:.08s"><h3><span class="ico" aria-hidden="true">🕒</span>When</h3>
      ${site.hours.length ? `<table class="hours"><tbody>${site.hours.map((h) => `<tr><td>${esc(h.days)}</td><td>${esc(h.time)}</td></tr>`).join("")}</tbody></table>` : `<p>${esc(site.hoursNote)}</p>`}
      ${site.instagram ? `<a class="btn btn--light btn--sm" href="${esc(site.instagram)}" target="_blank" rel="noopener">${icon.insta} ${esc(site.instagramHandle)}</a>` : ""}</div>
    <div class="info-card reveal" style="--rd:.16s"><h3><span class="ico" aria-hidden="true">💬</span>Say hi</h3>
      <p>Questions, feedback or a noodle you want us to stock? We'd love to hear from you.</p>
      ${site.email ? `<p><a href="mailto:${esc(site.email)}">${esc(site.email)}</a></p>` : ""}
      ${site.phone ? `<p><a href="tel:${esc(site.phone.replace(/\s+/g, ""))}">${esc(site.phone)}</a></p>` : ""}
      ${site.instagram ? `<a class="btn btn--yellow btn--sm" href="${esc(site.instagram)}" target="_blank" rel="noopener">DM us on Instagram</a>` : ""}</div>
  </div>
</div></section>
<section class="section section--tight"><div class="wrap split">
  <div class="reveal">
    <h2>Good <span class="serif red">to know</span></h2>
    <ul class="perk-list">
      <li><span class="ico" aria-hidden="true">🍜</span><span><strong>Dine-in only.</strong> We don't take online or phone orders — the fun is in picking your packet.</span></li>
      <li><span class="ico" aria-hidden="true">📱</span><span><strong>Scan the shelf.</strong> Every noodle has a QR code that opens its page with the machine setting and a cook timer.</span></li>
      <li><span class="ico" aria-hidden="true">💳</span><span><strong>Members save 10%.</strong> Ask about the free <a href="${r("meon-card/")}">MEON Member Card</a> at the counter.</span></li>
      <li><span class="ico" aria-hidden="true">⚠️</span><span><strong>Allergies?</strong> Check the packet and tell the crew — we'll help you choose.</span></li>
    </ul>
  </div>
  <div class="reveal photo-stack">
    <figure><img src="${r("assets/img/photos/bowl-side-seaweed.webp")}" alt="A MEON bowl with seaweed and beef" width="900" height="900" loading="lazy"></figure>
    <figure><img src="${r("assets/img/photos/bowl-top-egg.webp")}" alt="Noodles with egg and enoki from above" width="900" height="900" loading="lazy"></figure>
  </div>
</div></section>
`,
}));

// ---------- QR codes ----------
fs.mkdirSync(path.join(OUT, "assets", "qr"), { recursive: true });
const qrOpts = { errorCorrectionLevel: "M", margin: 2, color: { dark: "#17110fff", light: "#ffffffff" } };
const extraQR = [
  { slug: "home", name: "MEON home", url: `${SITE_URL}/?src=qr` },
  { slug: "noodle-library", name: "Noodle library", url: `${SITE_URL}/noodles/?src=qr` },
  { slug: "meon-card", name: "MEON Member Card", url: `${SITE_URL}/meon-card/?src=qr` },
];
for (const item of [...noodles.map((n) => ({ slug: n.slug, url: n.qrUrl })), ...extraQR]) {
  write(`assets/qr/${item.slug}.svg`, await QRCode.toString(item.url, { ...qrOpts, type: "svg" }));
  if (process.env.QR_PNG !== "0") await QRCode.toFile(path.join(OUT, "assets", "qr", `${item.slug}.png`), item.url, { ...qrOpts, width: 1024 });
}
const csvRow = (vals) => vals.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",");
write("assets/qr/qr-codes.csv", csvRow(["slug", "name", "brand", "country", "machine", "url", "svg", "png"]) + "\n" + noodles.map((n) => csvRow([n.slug, n.name, n.brand, n.country, n.machine, n.qrUrl, `${SITE_URL}/assets/qr/${n.slug}.svg`, `${SITE_URL}/assets/qr/${n.slug}.png`])).join("\n") + "\n");

addPage("qr/", layout({
  urlPath: "qr/",
  title: "Shelf QR codes",
  noindex: true,
  description: "Printable QR codes for every noodle on the MEON wall.",
  body: (r) => `
<section class="section section--tight"><div class="wrap">
  <div class="no-print">
    <span class="eyebrow">Staff only</span>
    <h1 style="font-size:clamp(2rem,5vw,3.4rem)">Shelf <span class="serif red">QR codes</span></h1>
    <p class="lead">One QR code per noodle. Each opens that noodle's page with <code>?src=qr</code> so in-store scans can be counted separately. Print on A4 (3 per row), or download single files. Need a custom code? Use the <a href="${r("qr-generator/")}">QR generator</a>.</p>
    <p class="note">Codes point to <strong>${esc(SITE_URL)}</strong>. If the domain changes, update <code>siteUrl</code> in <code>data/site.json</code> and rebuild before printing.</p>
  </div>
  <div class="qr-tools">
    <button class="btn btn--red btn--sm" type="button" data-print>${icon.print} Print all</button>
    <a class="btn btn--light btn--sm" href="${r("assets/qr/qr-codes.csv")}" download>${icon.download} Download CSV</a>
    <a class="btn btn--light btn--sm" href="${r("qr-generator/")}">${icon.qr} QR generator</a>
    <label class="search" style="max-width:340px"><span class="visually-hidden">Filter QR codes</span>${icon.search}<input type="search" placeholder="Filter…" data-qr-filter></label>
  </div>
  <div class="qr-sheet">
    ${[...extraQR.map((x) => ({ slug: x.slug, name: x.name, brand: "MEON", flag: "🍜", url: x.url })), ...noodles.map((n) => ({ slug: n.slug, name: n.name, brand: n.brand, flag: n.c.flag, url: n.qrUrl, machine: n.machine }))]
      .map((q) => `<div class="qr-card"><span class="qr-brand">${q.flag} ${esc(q.brand)}</span><h3>${esc(q.name)}</h3><img src="${r(`assets/qr/${q.slug}.svg`)}" alt="QR code for ${esc(q.name)}" width="160" height="160" loading="lazy"><div class="qr-scan">Scan for info + cook timer</div>${q.machine ? `<span class="qr-machine">Machine ${esc(q.machine)}</span>` : ""}<div class="qr-url">${esc(q.url)}</div><div class="no-print" style="margin-top:8px;display:flex;gap:6px;justify-content:center"><a class="chip" href="${r(`assets/qr/${q.slug}.svg`)}" download>SVG</a>${process.env.QR_PNG !== "0" ? `<a class="chip" href="${r(`assets/qr/${q.slug}.png`)}" download>PNG</a>` : ""}</div></div>`)
      .join("")}
  </div>
</div></section>
`,
}));

// ---------- QR generator (in-browser) ----------
addPage("qr-generator/", layout({
  urlPath: "qr-generator/",
  title: "QR code generator",
  noindex: true,
  description: "Make branded MEON QR codes for any noodle page, promotion or link — download as PNG or SVG.",
  scripts: ["assets/vendor/qrcode.js"],
  body: (r) => `
<section class="section section--tight"><div class="wrap">
  <span class="eyebrow">Staff tool</span>
  <h1 style="font-size:clamp(2rem,5vw,3.6rem)">QR code <span class="serif red">generator</span></h1>
  <p class="lead">Make a branded QR code for any noodle, page, deal or link. Everything runs in your browser — download a PNG for print or an SVG for signage.</p>
  <div class="qrgen" data-qrgen data-site="${esc(SITE_URL)}" data-logo="${r("assets/img/logo-192.png")}">
    <form class="qrgen-form panel" onsubmit="return false">
      <div class="field"><label for="qg-preset">Start from</label>
        <select id="qg-preset">
          <option value="">Custom link or text</option>
          <optgroup label="Pages"><option value="/">Home</option><option value="/noodles/">Noodle library</option><option value="/meon-card/">MEON Member Card</option><option value="/toppings/">Toppings</option><option value="/visit/">Visit us</option></optgroup>
          ${countries.map((c) => `<optgroup label="${c.flag} ${esc(c.name)}">${noodles.filter((n) => n.country === c.name).map((n) => `<option value="/${n.url}" data-label="${esc(n.name)}">${esc(n.brand)} · ${esc(n.name)}</option>`).join("")}</optgroup>`).join("")}
        </select></div>
      <div class="field"><label for="qg-url">Link or text</label><input id="qg-url" type="text" value="${esc(SITE_URL)}/" spellcheck="false"></div>
      <label class="toggle"><input id="qg-src" type="checkbox" checked> Add <code>?src=qr</code> so scans are counted</label>
      <div class="field"><label for="qg-label">Label under the code</label><input id="qg-label" type="text" value="Scan me 🍜" maxlength="60"></div>
      <div class="field-row">
        <div class="field"><label for="qg-fg">Code colour</label><input id="qg-fg" type="color" value="#17110f"></div>
        <div class="field"><label for="qg-bg">Background</label><input id="qg-bg" type="color" value="#ffffff"></div>
      </div>
      <div class="field"><label for="qg-size">Size: <span data-qg-size>1024</span> px</label><input id="qg-size" type="range" min="256" max="2048" step="128" value="1024"></div>
      <label class="toggle"><input id="qg-logo" type="checkbox" checked> Put the MEON logo in the middle</label>
      <label class="toggle"><input id="qg-round" type="checkbox"> Rounded dots</label>
    </form>
    <div class="qrgen-preview">
      <canvas id="qg-canvas" width="1024" height="1024" aria-label="QR code preview"></canvas>
      <p class="note" data-qg-info style="margin:0 0 14px"></p>
      <div class="qrgen-actions">
        <button class="btn btn--red btn--sm" type="button" data-qg-png>${icon.download} Download PNG</button>
        <button class="btn btn--light btn--sm" type="button" data-qg-svg>${icon.download} Download SVG</button>
        <button class="btn btn--light btn--sm" type="button" data-print>${icon.print} Print</button>
      </div>
    </div>
  </div>
</div></section>
`,
}));

// ---------- 404 ----------
write("404.html", layout({
  urlPath: "404.html",
  title: "Page not found",
  noindex: true,
  description: "This page boiled over. Head back to the noodle wall.",
  body: () => `
<section class="lost"><div class="wrap">
  ${emptyBowl}
  <h1 style="font-size:clamp(2.2rem,6vw,4rem)">This page <span class="serif red">boiled over</span></h1>
  <p class="lead" style="margin-inline:auto">We couldn't find that page. Maybe the packet moved shelves?</p>
  <p><a class="btn btn--red" href="/">Back to MEON</a> <button class="btn btn--light" type="button" data-search-open>Search noodles</button></p>
</div></section>
`,
}).replace(/(href|src)="\.\/"/g, '$1="/"').replace(/(href|src)="\.\/([^"]*)"/g, '$1="/$2"').replace(/data-root="\.\/"/, 'data-root="/"'));

/* ---------------- static files ---------------- */
copyDir(path.join(SRC, "assets"), path.join(OUT, "assets"));
fs.mkdirSync(path.join(OUT, "assets", "vendor"), { recursive: true });
fs.copyFileSync(require.resolve("qrcode-generator/qrcode.js"), path.join(OUT, "assets", "vendor", "qrcode.js"));

// Search index used by the site-wide search overlay.
const searchIndex = [
  ...noodles.map((n) => ({ g: "Noodles", t: n.name, s: `${n.c.flag} ${n.brand} · ${n.country} · ${n.type || "?"} · 🌶️ ${n.spice}/5`, u: n.url, i: n.thumb, k: [n.flavour, n.diet, n.funNote, n.machine, n.dietTokens.join(" ")].filter(Boolean).join(" ") })),
  ...countries.map((c) => ({ g: "Countries", t: c.name, s: `${countFor((n) => n.country === c.name)} noodles · ${c.headline}`, u: `countries/${c.slug}/`, e: c.flag, k: "country" })),
  ...toppings.map((t) => ({ g: "Toppings", t: t.name, s: t.desc, u: `toppings/#${t.id}`, e: t.emoji, k: `topping ${t.group}` })),
  ...[
    ["Noodle library", "Browse & filter all noodles", "noodles/", "🍜"],
    ["Vegetarian-friendly noodles", "Filter: vegetarian-friendly", "noodles/?diet=veg", "🥬"],
    ["Vegan noodles", "Filter: vegan", "noodles/?diet=vegan", "🌱"],
    ["Spicy challenge (3+ chillies)", "Filter: hot", "noodles/?spice=hot", "🔥"],
    ["Dry noodles", "Filter: dry / mix-and-eat", "noodles/?type=Dry", "🥢"],
    ["Soup noodles", "Filter: soup", "noodles/?type=Soup", "🍲"],
    ["MEON Member Card", "Free card · 10% off for members", "meon-card/", "💳"],
    ["Visit us", `${site.suburb}, ${site.city} · dine-in only`, "visit/", "📍"],
    ["About MEON", "Our story", "about/", "❤️"],
    ["Shelf QR codes", "Staff: printable QR codes", "qr/", "▦"],
    ["QR code generator", "Staff: make a custom QR code", "qr-generator/", "▦"],
  ].map(([t, s, u, e]) => ({ g: "Pages", t, s, u, e, k: "page" })),
];
write("search-index.json", JSON.stringify(searchIndex));
write("robots.txt", `User-agent: *\nAllow: /\nDisallow: /qr/\nDisallow: /qr-generator/\nSitemap: ${SITE_URL}/sitemap.xml\n`);
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.filter((p) => !p.startsWith("qr")).map((p) => `  <url><loc>${SITE_URL}/${p}</loc><lastmod>${BUILD_DATE}</lastmod></url>`).join("\n")}\n</urlset>\n`);
write("site.webmanifest", JSON.stringify({ name: "MEON Noodles", short_name: "MEON", start_url: "/", display: "standalone", background_color: "#fffaf3", theme_color: "#ec1b25", icons: [{ src: "/assets/img/logo-192.png", sizes: "192x192", type: "image/png" }, { src: "/assets/img/logo-512.png", sizes: "512x512", type: "image/png" }] }, null, 2));
write("noodles.json", JSON.stringify(noodles.map((n) => ({ slug: n.slug, name: n.name, brand: n.brand, country: n.country, flavour: n.flavour, type: n.type, spice: n.spice, diet: n.diet, weightG: n.weightG, machine: n.machine, funNote: n.funNote, url: `${SITE_URL}/${n.url}`, qr: n.qrUrl, image: n.img ? `${SITE_URL}/${n.img}` : null })), null, 1));

console.log(`Built ${pages.length + 1} pages → ${path.relative(ROOT, OUT)}/  (${noodles.length} noodles, ${withPhotos.length} with photos, QR base ${SITE_URL})`);
