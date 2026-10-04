#!/usr/bin/env node
// MEON static site generator. Zero framework: reads data/*.json, writes ./site.
// Usage: node scripts/build.mjs            (uses siteUrl from data/site.json)
//        SITE_URL=https://meon.au node scripts/build.mjs
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";
import { describe, shortBlurb, cookSteps, suggestToppings, COUNTRY_ADJ } from "./lib/copy.mjs";
import { icon, svgIcon, iconSprite, flag, spiceMeter, mascot, crew, peeker, steamOverlay, stepArt, emptyBowl, logoAnimated, logoMini, wordmark } from "./lib/art.mjs";

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
const spiceReview = new Set(fs.existsSync(path.join(ROOT, "data", "spice_review.json")) ? readJSON("spice_review.json").slugs : []);
const images = fs.existsSync(path.join(ROOT, "data", "images.json")) ? readJSON("images.json") : {};
const SITE_URL = (process.env.SITE_URL || site.siteUrl).replace(/\/+$/, "");
const BUILD_DATE = new Date().toISOString().slice(0, 10);
const BUILD_ID = Date.now().toString(36);

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
  const unrated = spiceReview.has(n.slug);
  return { ...n, c, img, thumb, dietTokens, unrated, spiceKey: unrated ? -1 : n.spice, url: `noodles/${n.slug}/`, qrUrl: `${SITE_URL}/noodles/${n.slug}/?src=qr` };
});
const withPhotos = noodles.filter((n) => n.img);

const FEATURE_RE = /top|popular|viral|no\.1|award|premium|seller|hyped|featured|michelin|rated/i;
const featured = [...noodles.filter((n) => n.img && n.funNote && FEATURE_RE.test(n.funNote)), ...noodles.filter((n) => n.img && !(n.funNote && FEATURE_RE.test(n.funNote)))].slice(0, 8);

const SPICE_LADDER = [
  [0, "No heat", "No chilli at all. Good for kids and anyone avoiding spice."],
  [1, "Mild", "A little warmth in the background."],
  [2, "Medium", "Noticeable heat, still easy going."],
  [3, "Hot", "Properly spicy. Keep a drink nearby."],
  [4, "Very hot", "Serious heat that builds as you eat."],
  [5, "Extreme", "The hottest packets on the wall."],
];

/* ---------------- layout ---------------- */
const NAV = [
  ["noodles/", "Noodles"],
  ["countries/", "Countries"],
  ["toppings/", "Toppings"],
  ["meon-card/", "MEON Card"],
  ["about/", "About"],
];
const FONT_URL = "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300..800&display=swap";

function layout({ urlPath, title, seoTitle = "", description, body, active = "", image = "assets/img/photos/bowl-side.webp", preload = "", noindex = false, jsonld = [], scripts = [], intro = false }) {
  const depth = urlPath.split("/").filter(Boolean).length - (urlPath.endsWith(".html") ? 1 : 0);
  const root = depth ? "../".repeat(depth) : "./";
  const r = (p) => root + p;
  const canonical = `${SITE_URL}/${urlPath}`;
  const fullTitle = seoTitle || (title ? `${title} · MEON Noodles Perth` : `MEON · Instant Noodle Bar in ${site.suburb}, ${site.city}`);
  const cur = (href) => (active === href ? ' aria-current="page"' : "");
  const navLinks = NAV.map(([href, label]) => href === "noodles/"
    ? `<div class="nav-item has-mega"><a href="${r(href)}"${cur(href)}>${label}</a><button class="mega-toggle" type="button" aria-expanded="false" aria-controls="mega-noodles" aria-label="Show the noodle menu">${icon.chevron}</button>${megaNoodles(r)}</div>`
    : `<a href="${r(href)}"${cur(href)}>${label}</a>`).join("");
  const analytics = site.analytics?.vercel
    ? `<script>(function(){var h=location.hostname;if(location.protocol.indexOf("http")!==0||/^(localhost|127\\.|0\\.0\\.0\\.0|\\[::1\\])/.test(h))return;window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};var s=document.createElement("script");s.defer=true;s.src="/_vercel/insights/script.js";document.head.appendChild(s);})();</script>`
    : "";
  const restaurant = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": `${SITE_URL}/#restaurant`,
    name: "MEON Noodles",
    alternateName: "MEON",
    description: `Instant noodle bar in ${site.suburb}, ${site.city} with ${noodles.length} instant noodles from 12 countries, a toppings bar and self-cook stations. Dine-in only.`,
    url: SITE_URL + "/",
    logo: `${SITE_URL}/assets/img/logo-512.png`,
    image: [`${SITE_URL}/assets/img/photos/bowl-side.webp`, `${SITE_URL}/assets/img/photos/bowl-top-egg.webp`, `${SITE_URL}/assets/img/logo-512.png`],
    servesCuisine: ["Instant noodles", "Ramen", "Korean", "Japanese", "Indonesian", "Asian"],
    priceRange: site.priceRange || "$",
    hasMenu: `${SITE_URL}/noodles/`,
    acceptsReservations: false,
    hasMap: site.mapsUrl,
    telephone: site.phone || undefined,
    email: site.email || undefined,
    address: { "@type": "PostalAddress", streetAddress: site.streetAddress || undefined, addressLocality: site.suburb, addressRegion: site.state, postalCode: site.postcode || undefined, addressCountry: "AU" },
    geo: site.geo && site.geo.lat ? { "@type": "GeoCoordinates", latitude: site.geo.lat, longitude: site.geo.lng } : undefined,
    openingHoursSpecification: (site.openingHours || []).length ? site.openingHours.map((h) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: h.days, opens: h.opens, closes: h.closes })) : undefined,
    sameAs: [site.instagram, site.tiktok, site.googleBusinessUrl].filter(Boolean),
  };
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: "MEON Noodles",
    url: SITE_URL + "/",
    inLanguage: "en-AU",
    publisher: { "@id": `${SITE_URL}/#restaurant` },
    potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/noodles/?q={search_term_string}` }, "query-input": "required name=search_term_string" },
  };
  const ld = [
    ...(urlPath === "" ? [restaurant, website] : [{ "@context": "https://schema.org", "@type": "Restaurant", "@id": `${SITE_URL}/#restaurant`, name: "MEON Noodles", url: SITE_URL + "/" }]),
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
${noindex ? '<meta name="robots" content="noindex">' : '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">'}
${site.googleSiteVerification ? `<meta name="google-site-verification" content="${esc(site.googleSiteVerification)}">\n` : ""}${site.bingSiteVerification ? `<meta name="msvalidate.01" content="${esc(site.bingSiteVerification)}">\n` : ""}<meta name="theme-color" content="#ffffff">
<meta name="color-scheme" content="light">
<meta property="og:type" content="website">
<meta property="og:site_name" content="MEON Noodles">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(`${SITE_URL}/${image}`)}">
<meta property="og:locale" content="en_AU">
<meta property="og:image:alt" content="${esc(title || "MEON Noodles")}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(fullTitle)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(`${SITE_URL}/${image}`)}">
<meta name="geo.region" content="AU-WA">
<meta name="geo.placename" content="${esc(`${site.suburb}, ${site.city}`)}">
<link rel="icon" type="image/png" sizes="32x32" href="${r("assets/img/favicon-32.png")}">
<link rel="icon" type="image/png" sizes="48x48" href="${r("assets/img/favicon-48.png")}">
<link rel="apple-touch-icon" href="${r("assets/img/apple-touch-icon.png")}">
<link rel="manifest" href="${r("site.webmanifest")}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONT_URL}">
${preload ? `<link rel="preload" as="image" href="${r(preload)}" fetchpriority="high">` : ""}
<link rel="stylesheet" href="${r("assets/css/site.css")}?v=${BUILD_ID}">
<script>(function(d){d.className=d.className.replace("no-js","js");${intro ? `try{if(!sessionStorage.getItem("meon-intro")&&!matchMedia("(prefers-reduced-motion: reduce)").matches)d.className+=" intro-on"}catch(e){}` : ""}})(document.documentElement)</script>
<script type="application/ld+json">${json(ld.length === 1 ? ld[0] : ld)}</script>
${analytics}
</head>
<body data-root="${root}">
${intro ? `<div class="intro" aria-hidden="true"><div class="intro-mark">${wordmark("intro-word")}</div></div>` : ""}
<a class="skip-link" href="#main">Skip to content</a>
<div class="scroll-progress" aria-hidden="true"><span></span></div>
<div class="announce"><span>Every packet on our wall has a QR code. Scan it for the machine setting and a cook timer.</span> <a href="${r("noodles/")}">Browse the wall</a></div>
<header class="site-header" data-header>
  <div class="wrap bar">
    <a class="logo" href="${r("")}" aria-label="MEON home">${logoMini()}</a>
    <nav class="nav" id="site-nav" aria-label="Main">
      ${navLinks}
      <a class="nav-mobile-only" href="${r("visit/")}"${cur("visit/")}>Visit us</a>
    </nav>
    <div class="header-actions">
      <button class="sound-btn" type="button" data-sound aria-pressed="false" aria-label="Play background music"><span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="sound-label">Sound</span></button>
      <button class="search-btn" type="button" data-search-open aria-label="Search noodles">${icon.search}<span class="label">Search</span><kbd>⌘K</kbd></button>
      <a class="btn btn--red btn--sm header-visit" href="${r("visit/")}" data-magnetic>Visit</a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Open menu"><span></span></button>
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
        <p class="footer-lead">${esc(site.tagline)}</p>
        <p>Dine-in at ${esc(site.suburb)}, ${esc(site.city)}.</p>
        ${site.instagram ? `<a class="footer-social" href="${esc(site.instagram)}" target="_blank" rel="noopener">${icon.insta} ${esc(site.instagramHandle)}</a>` : ""}
      </div>
      <div>
        <h4>Eat</h4>
        <ul>
          <li><a href="${r("noodles/")}">Noodle library</a></li>
          <li><a href="${r("noodles/?type=Soup")}">Soup noodles</a></li>
          <li><a href="${r("noodles/?type=Dry")}">Dry noodles</a></li>
          <li><a href="${r("noodles/?diet=veg")}">Vegetarian-friendly</a></li>
          <li><a href="${r("noodles/?spice=hot")}">Spicy (3+)</a></li>
        </ul>
      </div>
      <div>
        <h4>Explore</h4>
        <ul>
          <li><a href="${r("countries/")}">Countries</a></li>
          <li><a href="${r("toppings/")}">Toppings &amp; sides</a></li>
          <li><a href="${r("meon-card/")}">MEON Member Card</a></li>
          <li><a href="${r("about/")}">About</a></li>
          <li><a href="${r("visit/")}">Visit</a></li>
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
    <div class="footer-big" data-reveal-letters>${wordmark("footer-word", "meon")}</div>
    <div class="footer-bottom">
      <span>© <span data-year>${new Date().getFullYear()}</span> MEON Noodles · ${esc(site.suburb)}, ${esc(site.city)} ${esc(site.state)}</span>
      <span>Brand names belong to their owners. Always check the packet for allergens.</span>
    </div>
  </div>
</footer>
<div class="search-overlay" id="search" role="dialog" aria-modal="true" aria-label="Search MEON">
  <div class="search-backdrop" data-search-close></div>
  <div class="search-panel">
    <div class="search-field">${icon.search}<input type="search" id="site-search" placeholder="Search ${noodles.length} noodles, countries, toppings" autocomplete="off" spellcheck="false" aria-controls="search-results" enterkeyhint="go"><button class="btn btn--line btn--sm" type="button" data-search-close>Close</button></div>
    <div class="search-results" id="search-results" role="listbox"></div>
    <div class="search-foot"><span><kbd>↑</kbd> <kbd>↓</kbd> to move, <kbd>Enter</kbd> to open</span><span>Try “vegan”, “tom yum” or “Japan”</span></div>
  </div>
</div>
<nav class="tabbar" aria-label="Quick navigation">
  <a href="${r("")}"${cur("home")}>${icon.home}<span>Home</span></a>
  <a href="${r("noodles/")}"${cur("noodles/")}>${icon.bowl}<span>Noodles</span></a>
  <button class="tab-search" type="button" data-search-open aria-label="Search noodles">${icon.search}<span>Search</span></button>
  <a href="${r("countries/")}"${cur("countries/")}>${icon.globe}<span>Countries</span></a>
  <a href="${r("visit/")}"${cur("visit/")}>${icon.pin}<span>Visit</span></a>
</nav>
<button class="back-top" type="button" aria-label="Back to top">${mascot({ acc: "none", wave: true })}</button>
${scripts.map((s) => `<script src="${r(s)}" defer></script>`).join("\n")}
<script src="${r("assets/js/site.js")}?v=${BUILD_ID}" defer></script>
</body>
</html>
`;
}

/* ---------------- components ---------------- */
const crumbsNav = (r, items) => `<nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="${r("")}">Home</a></li>${items.map(([label, href]) => href ? `<li><a href="${r(href)}">${label}</a></li>` : `<li aria-current="page">${label}</li>`).join("")}</ol></nav>`;

function noodleMedia(n, r, { size = 400, eager = false, large = false } = {}) {
  if (n.img) return `<img src="${r(large ? n.img : n.thumb)}" alt="${esc(`${n.brand} ${n.name}`)}" width="${size}" height="${size}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
  return `<span class="placeholder-art">${mascot({ className: "placeholder-mascot", color: "#ff8a4c", acc: ["bowl", "chef", "party", "beanie", "crown", "chopsticks"][n.slug.length % 6] })}<span class="ph-label">Photo coming soon</span></span>`;
}

const spiceLine = (n, r) => n.unrated ? `<span class="nc-spice-soon">Spice rating soon</span>` : spiceMeter(n.spice, r);

function noodleCard(n, r, i = 0) {
  const search = [n.name, n.brand, n.country, n.flavour, n.type, n.diet, n.funNote, n.machine].filter(Boolean).join(" ");
  return `<a class="noodle-card reveal" style="--rd:${(i % 4) * 0.05}s" href="${r(n.url)}" data-search="${esc(search)}" data-name="${esc(n.name)}" data-country="${n.countryCode}" data-type="${esc(n.type || "")}" data-spice="${n.spiceKey}" data-diet="${n.dietTokens.join(" ")}" data-photo="${n.img ? 1 : 0}">
  <span class="nc-media">${noodleMedia(n, r)}${n.funNote ? `<span class="nc-note">${esc(n.funNote)}</span>` : ""}</span>
  <span class="nc-meta">${flag(n.countryCode, r, { w: 16 })}<span>${esc(n.country)}${n.type ? ` · ${esc(n.type)}` : ""}</span></span>
  <h3 class="nc-name">${esc(n.name)}</h3>
  <span class="nc-foot"><span class="nc-brand">${esc(n.brand)}</span>${spiceLine(n, r)}</span>
</a>`;
}

function megaNoodles(r) {
  const quick = [
    ["noodles/", "bowl", `All ${noodles.length} noodles`], ["noodles/?type=Soup", "soup", "Soup noodles"], ["noodles/?type=Dry", "chopsticks", "Dry noodles"],
    ["noodles/?diet=veg", "leaf", "Vegetarian-friendly"], ["noodles/?diet=vegan", "sprout", "Vegan"], ["noodles/?spice=hot", "flame", "Spicy (3+)"],
    ["noodles/?spice=mild", "drop", "No heat"], ["noodles/?sort=photo", "camera", "With photos first"],
  ];
  return `<div class="mega" id="mega-noodles">
  <div class="mega-col"><p class="mega-h">Browse</p>${quick.map(([h, ic, t]) => `<a href="${r(h)}">${svgIcon(ic)}${t}</a>`).join("")}</div>
  <div class="mega-col"><p class="mega-h">By country</p><div class="mega-grid">${countries.map((c) => `<a href="${r(`countries/${c.slug}/`)}">${flag(c.code, r, { w: 18 })}${esc(c.name)}<small>${countFor((n) => n.country === c.name)}</small></a>`).join("")}</div></div>
  <a class="mega-feature" href="${r("")}#roulette">${mascot({ acc: "party", color: "#ff8fb0" })}<strong>Can't decide?</strong><span>Let the roulette pick for you</span></a>
</div>`;
}

// Inner-page hero: breadcrumbs, a split-word title and lead on the left, one visual (or a peeking mascot) on the right.
function pageHero(r, { crumbs = [], eyebrow = "", title, lead = "", actions = "", after = "", seed = 0, aside = "" }) {
  return `<section class="page-hero">
  <div class="wrap">
    ${crumbs.length ? crumbsNav(r, crumbs) : ""}
    <div class="ph-grid">
      <div class="ph-copy">
        ${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ""}
        <h1 class="page-title" data-split>${title}</h1>
        ${lead ? `<p class="lead">${lead}</p>` : ""}
        ${actions ? `<div class="actions">${actions}</div>` : ""}
      </div>
      <div class="ph-aside">${aside || peeker(seed)}</div>
    </div>
    ${after}
  </div>
</section>`;
}

// Closing band used on every page: one red block, big type, the crew.
function ctaBand(r, { title = "Come in hungry.", text = site.orderingNote } = {}) {
  return `<section class="cta-band" data-anim>
  <div class="wrap cta-inner">
    <div class="cta-copy">
      <p class="eyebrow">Visit MEON</p>
      <h2 data-split>${title}</h2>
      <p class="lead">${esc(text)}</p>
      <div class="actions">
        <a class="btn btn--white" href="${r("noodles/")}" data-magnetic>Browse the noodle wall ${icon.arrow}</a>
        <a class="btn btn--ghost-white" href="${r("visit/")}">${icon.pin} Getting here</a>
      </div>
    </div>
    <div class="cta-mascots" aria-hidden="true">${mascot({ acc: "bowl", color: "#ffc83d" })}${mascot({ acc: "chef", color: "#ff8a4c" })}${mascot({ acc: "chilli", color: "#ffffff" })}</div>
  </div>
</section>`;
}

// Reviews: stored in Supabase (table meon_reviews). Visitors post a star rating and comment; published reviews load live.
function reviewsBlock(r, { slug = "", title = "What people are saying.", lead = "" } = {}) {
  const cfg = site.reviews || {};
  if (!cfg.supabaseUrl || !cfg.publishableKey) return "";
  const stars = [1, 2, 3, 4, 5].map((v) => `<input type="radio" name="rating" id="rv-${slug || "all"}-${v}" value="${v}" required><label for="rv-${slug || "all"}-${v}" title="${v} star${v > 1 ? "s" : ""}">${svgIcon("star")}<span class="visually-hidden">${v} star${v > 1 ? "s" : ""}</span></label>`).reverse().join("");
  return `<section class="section reviews" id="reviews" data-reviews data-slug="${esc(slug)}" data-endpoint="${esc(cfg.supabaseUrl)}" data-key="${esc(cfg.publishableKey)}" data-table="${esc(cfg.table || "meon_reviews")}">
  <div class="wrap reviews-grid">
    <div class="reviews-head">
      <p class="eyebrow">Reviews</p>
      <h2 data-split>${title}</h2>
      ${lead ? `<p class="lead">${lead}</p>` : ""}
      <div class="rv-summary" data-rv-summary><span class="rv-avg">–</span><span class="rv-stars" aria-hidden="true"></span><span class="rv-count">No reviews yet</span></div>
      <form class="rv-form" data-rv-form novalidate>
        <fieldset class="rv-rate"><legend>Your rating</legend><div class="rv-rate-stars">${stars}</div></fieldset>
        <label class="field"><span>Your name</span><input name="name" type="text" maxlength="40" autocomplete="given-name" required></label>
        <label class="field"><span>Your review</span><textarea name="comment" rows="4" minlength="3" maxlength="600" required placeholder="${slug ? "How was it? Spice, flavour, toppings you added…" : "Tell us about your visit"}"></textarea></label>
        <label class="hp" aria-hidden="true">Website<input name="website" type="text" tabindex="-1" autocomplete="off"></label>
        <div class="rv-actions"><button class="btn btn--red" type="submit">Post review</button>${site.googleBusinessUrl ? `<a class="link-arrow" href="${esc(site.googleBusinessUrl)}" target="_blank" rel="noopener">Also review us on Google ${icon.arrow}</a>` : ""}</div>
        <p class="rv-status" data-rv-status aria-live="polite"></p>
        <p class="note">Reviews appear on this site with your first name. Please keep it friendly.</p>
      </form>
    </div>
    <div class="rv-list" data-rv-list aria-live="polite"><p class="rv-empty">${slug ? "No reviews for this noodle yet. Be the first." : "No reviews yet. Be the first."}</p></div>
  </div>
</section>`;
}

const facts = (items) => `<dl class="facts reveal">${items.map(([n, label, suffix = ""]) => `<div><dt>${label}</dt><dd><span data-count="${n}" data-suffix="${suffix}">${n}${suffix}</span></dd></div>`).join("")}</dl>`;

const sectionHead = (eyebrow, title, extra = "", lead = "") => `<div class="section-head">
  <div>${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ""}<h2 data-split>${title}</h2>${lead ? `<p class="lead">${lead}</p>` : ""}</div>${extra}
</div>`;

const FAQ = [
  ["Where is MEON?", `MEON Noodles is an instant noodle bar in ${site.suburb}, ${site.city}, Western Australia. Tap "Open in Google Maps" on this page for directions.`],
  ["Can I order online or get delivery?", "No. MEON is dine-in only. Walk in, choose a packet from the noodle wall, add toppings and cook it at your own station."],
  ["How many instant noodles do you have?", `We stock ${noodles.length} instant noodles from 12 countries, including South Korea, Japan, Indonesia, Vietnam, China, Malaysia, Thailand, Singapore, India, the Philippines, Taiwan and Australia.`],
  ["Do you have vegetarian or vegan noodles?", `Yes. ${noodles.filter((n) => n.dietTokens.includes("veg")).length} noodles are vegetarian-friendly and ${noodles.filter((n) => n.dietTokens.includes("vegan")).length} are vegan. Use the diet filter in the noodle library, and always check the packet if you have allergies.`],
  ["What are the QR codes on the shelves for?", "Every packet on the wall has a QR code. Scan it with your phone camera to open that noodle's page with its flavour, spice level, the cooking machine setting and a cook timer."],
  ["Is there a member discount?", "Yes. The MEON Member Card is free. Load it in store, pay like cash and get 10% off eligible food items every visit."],
  ["How spicy are the noodles?", "Every noodle has a spice rating from 0 (no heat) to 5 (extreme). You can filter the library by spice level or let the roulette pick for you."],
];

/* ---------------- pages ---------------- */
const pages = [];
const addPage = (urlPath, html) => { pages.push(urlPath); write(urlPath + "index.html", html); };
const countFor = (fn) => noodles.filter(fn).length;
const half = Math.ceil(withPhotos.length / 2);
const wallImgs = (list, r) => list.map((n) => `<a href="${r(n.url)}" tabindex="-1" title="${esc(`${n.brand} ${n.name}`)}"><img src="${r(n.thumb)}" alt="" width="200" height="200" loading="lazy" decoding="async"></a>`).join("");

// ---------- Home ----------
addPage("", layout({
  urlPath: "",
  active: "home",
  preload: "assets/img/photos/bowl-side.webp",
  description: `MEON is an instant noodle bar at ${site.suburb}, ${site.city}: ${noodles.length} noodles from 12 countries, a toppings bar and your own cooking station. Every packet has its own page.`,
  body: (r) => `
<section class="hero hero--launch" data-anim>
  ${crew()}
  <div class="wrap">
    <a class="hero-tag" href="${r("noodles/")}"><span class="dot" aria-hidden="true"></span>${noodles.length} noodles · 12 countries · dine-in only</a>
    <h1 class="hero-title" data-split>Slurp the <span class="red">world.</span></h1>
    <p class="typer" aria-live="off">Tonight I'm craving <span class="typed" data-typer='${esc(JSON.stringify(["Buldak fire noodles", "creamy tom yum", "Mi Goreng", "tonkotsu ramen", "black-bean jjajang", "Penang white curry", "masala noodles", "kimchi ramen"]))}'>Buldak fire noodles</span></p>
    <p class="lead">Instant noodles from Korea to Australia, a toppings bar and a cooking station that's all yours. Walk in, pick a packet and make it your way.</p>
    <div class="actions">
      <a class="btn btn--red" href="${r("noodles/")}" data-magnetic>Explore the noodle wall ${icon.arrow}</a>
      <button class="btn btn--line" type="button" data-search-open>${icon.search} Find a noodle</button>
    </div>
    <ul class="checks"><li>Dine-in only</li><li>QR code on every shelf</li><li>Cook timer on every page</li><li>Members save 10%</li></ul>

    <div class="stage reveal">
      <div class="stage-float stage-float--a"><span class="ico">${svgIcon("bowl")}</span><span><strong>${noodles.length} noodles</strong><small>on the wall right now</small></span></div>
      <div class="stage-float stage-float--b"><span class="ico">${svgIcon("clock")}</span><span><strong>Machine setting</strong><small>on every noodle page</small></span></div>
      <div class="stage-grid">
        <figure class="img-reveal"><img src="${r("assets/img/photos/bowl-side.webp")}" alt="A MEON bowl of black-bean noodles with sliced beef and a soft egg" width="900" height="900" fetchpriority="high"><span class="stage-label">${svgIcon("chopsticks")} Cooked your way</span></figure>
        <div class="stage-red">${logoAnimated()}</div>
        <figure class="img-reveal"><img src="${r("assets/img/photos/bowl-top-egg.webp")}" alt="Noodles topped with enoki, egg and fishcake" width="900" height="900" loading="lazy"><span class="stage-label">${svgIcon("egg")} Top it up</span></figure>
        <figure class="img-reveal"><img src="${r("assets/img/photos/bowl-side-seaweed.webp")}" alt="A MEON bowl with seaweed, beef and noodles" width="900" height="900" loading="lazy"><span class="stage-label">${svgIcon("bowl")} ${noodles.length} to choose from</span></figure>
        <figure class="img-reveal"><img src="${r("assets/img/photos/bowl-top-dry.webp")}" alt="Dry noodles with beef, fishballs and seaweed" width="900" height="900" loading="lazy"><span class="stage-label">${svgIcon("flame")} Pick your heat</span></figure>
      </div>
    </div>
    ${facts([[noodles.length, "Instant noodles"], [12, "Countries"], [toppings.length, "Toppings and sides"], [10, "Off for members", "%"]])}
  </div>
</section>

<section class="wall-sec" aria-label="On the noodle wall">
  <div class="wrap">${sectionHead("On the wall now", "Pick a packet. Any packet.", `<a class="link-arrow" href="${r("noodles/")}">See all ${noodles.length} ${icon.arrow}</a>`)}</div>
  <div class="wall" data-hscroll aria-hidden="true">
    <div class="wall-row" data-speed="1">${wallImgs(withPhotos.slice(0, half), r)}</div>
    <div class="wall-row" data-speed="-1">${wallImgs(withPhotos.slice(half), r)}</div>
  </div>
</section>

<section class="section how" id="how">
  <div class="wrap how-grid">
    <div class="how-head"><div class="how-sticky">
      <p class="eyebrow">How MEON works</p>
      <h2 data-split>From the wall to your bowl in four steps.</h2>
      <p class="lead">There's no menu to learn and no online ordering. You choose, you cook, and the crew is there if you need a hand.</p>
      <div class="how-progress" aria-hidden="true"><span></span></div>
    </div></div>
    <ol class="how-steps" data-how>
      <li class="how-step reveal"><span class="hs-num">01</span>${stepArt.packet}<div><h3>Pick a packet</h3><p>Browse ${noodles.length} noodles from 12 countries. Scan the QR code on the shelf to see what any packet tastes like.</p></div></li>
      <li class="how-step reveal"><span class="hs-num">02</span>${stepArt.egg}<div><h3>Add toppings</h3><p>Egg, cheese, beef, fishcake, greens and more from the toppings bar.</p></div></li>
      <li class="how-step reveal"><span class="hs-num">03</span>${stepArt.pot}<div><h3>Cook it your way</h3><p>Set the cooking machine to the program on the noodle's page and start its timer.</p></div></li>
      <li class="how-step reveal"><span class="hs-num">04</span>${stepArt.bowl}<div><h3>Sit down and eat</h3><p>Grab a seat and enjoy it hot. Members save 10% on eligible food every visit.</p></div></li>
    </ol>
  </div>
</section>

<section class="section section--soft">
  <div class="wrap">
    ${sectionHead("Most picked", "The bowls regulars come back for.", `<a class="link-arrow" href="${r("noodles/")}">All noodles ${icon.arrow}</a>`)}
    <div class="card-grid">${featured.map((n, i) => noodleCard(n, r, i)).join("")}</div>
  </div>
</section>

<section class="section" id="roulette">
  <div class="wrap roulette" data-roulette data-root="${r("")}">
    <div class="reveal">
      <p class="eyebrow">Can't decide?</p>
      <h2 data-split>Let the roulette choose.</h2>
      <p class="lead">Pick how hot you want it, press spin, then find the packet on the wall.</p>
      <p class="visually-hidden" aria-live="polite" data-roulette-live></p>
    </div>
    <div class="roulette-machine reveal">
      <div class="roulette-window"><div class="roulette-reel">
        <div class="roulette-item roulette-item--idle">${mascot({ acc: "party", color: "#ff8fb0", className: "roulette-meo" })}<span><span class="nc-meta">Ready when you are</span><h3>Press spin to pick a noodle</h3></span></div>
      </div></div>
      <div class="roulette-controls">
        <label class="visually-hidden" for="roulette-heat">Heat level</label>
        <select class="select" id="roulette-heat"><option value="any">Any heat</option><option value="mild">No heat</option><option value="some">A little kick</option><option value="fire">Hot (3+)</option></select>
        <button class="btn btn--red" type="button" data-spin data-magnetic>${icon.dice} Spin</button>
      </div>
    </div>
  </div>
  <script type="application/json" id="noodle-data">${json(noodles.map((n) => ({ slug: n.slug, name: n.name, brand: n.brand, cc: n.countryCode, country: n.country, spice: n.spiceKey, type: n.type, img: n.thumb })))}</script>
</section>

<section class="section section--soft">
  <div class="wrap">
    ${sectionHead("Twelve countries", "Every country cooks noodles differently.", `<a class="link-arrow" href="${r("countries/")}">All countries ${icon.arrow}</a>`)}
    <div class="country-list">
      ${countries.map((c, i) => `<a class="country-row reveal" style="--rd:${(i % 4) * 0.04}s" href="${r(`countries/${c.slug}/`)}">${flag(c.code, r, { cls: "flag flag--lg", w: 44 })}<span class="cr-name">${esc(c.name)}</span><span class="cr-count">${plural(countFor((n) => n.country === c.name), "noodle")}</span>${icon.arrow}</a>`).join("")}
    </div>
  </div>
</section>

<section class="section" id="spice">
  <div class="wrap split">
    <div class="reveal">
      <p class="eyebrow">The spice ladder</p>
      <h2 data-split>Rated from 0 to 5.</h2>
      <p class="lead">Every noodle has a spice rating using our chilli scale. Start where you're comfortable and work your way up.</p>
      <a class="btn btn--line" href="${r("noodles/?spice=hot")}">Show the hottest ${icon.arrow}</a>
    </div>
    <div class="ladder reveal">
      ${SPICE_LADDER.map(([lvl, name, desc]) => `<a href="${r(`noodles/?spice=${lvl}`)}">${spiceMeter(lvl, r)}<span><strong>${lvl} · ${name}</strong><small>${desc}</small></span><span class="count">${countFor((n) => n.spiceKey === lvl)}</span></a>`).join("")}
    </div>
  </div>
</section>

<section class="section section--soft toppings-feature">
  <div class="wrap split split--rev">
    <div class="duo">
      <figure class="img-reveal" data-parallax="-0.04"><img src="${r("assets/img/photos/topping-fishcake.webp")}" alt="A pig-shaped fishcake" width="900" height="900" loading="lazy"></figure>
      <figure class="img-reveal" data-parallax="0.06"><img src="${r("assets/img/photos/topping-enoki.webp")}" alt="Fresh enoki mushrooms" width="900" height="900" loading="lazy"></figure>
    </div>
    <div class="reveal">
      <p class="eyebrow">Toppings bar</p>
      <h2 data-split>The packet is only the start.</h2>
      <p class="lead">Jammy eggs, melted cheese, beef and meatballs ready in the microwave, crab sticks, shrimp katsu, enoki and seaweed. Build a bowl that's yours.</p>
      <a class="btn btn--line" href="${r("toppings/")}">See every topping ${icon.arrow}</a>
    </div>
  </div>
  <div class="word-band" data-hscroll aria-hidden="true"><div class="wall-row" data-speed="0.6">${[...toppings, ...toppings].map((t) => `<span>${esc(t.name)}</span>`).join("")}</div></div>
</section>

<section class="section section--red">
  <div class="wrap split">
    <div class="reveal">
      <p class="eyebrow">MEON Member Card</p>
      <h2 data-split>Free card. 10% off, every visit.</h2>
      <p class="lead">Pick up a card at the counter, load it up and pay like cash. Members get <strong>10% off eligible food items</strong>.</p>
      <a class="btn btn--white" href="${r("meon-card/")}" data-magnetic>How the card works ${icon.arrow}</a>
    </div>
    <div class="reveal card-stage"><div class="member-card" data-parallax="0.05"><img src="${r("assets/img/photos/meon-member-card.webp")}" alt="The MEON Member Card featuring the MEON mascot and friends" width="945" height="591" loading="lazy"></div></div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    ${sectionHead("On Instagram", "New packets land every week.", `<a class="btn btn--line" href="${esc(site.instagram)}" target="_blank" rel="noopener">${icon.insta} ${esc(site.instagramHandle)}</a>`, `Follow ${esc(site.instagramHandle)} for new arrivals, spicy challenges and what the crew is cooking.`)}
    <div class="reel-grid">
      <div class="reel reveal"><video poster="${r("assets/video/meon-logo-loop.jpg")}" muted loop playsinline preload="none" data-autoplay aria-label="MEON logo animation"><source src="${r("assets/video/meon-logo-loop.webm")}" type="video/webm"><source src="${r("assets/video/meon-logo-loop.mp4")}" type="video/mp4"></video></div>
      <a class="reel reveal" style="--rd:.06s" href="${esc(site.instagram)}reels/" target="_blank" rel="noopener"><img src="${r("assets/img/photos/bowl-side-seaweed.webp")}" alt="" width="900" height="900" loading="lazy"><span class="reel-label">${icon.play} Reels</span></a>
      <a class="reel reveal" style="--rd:.12s" href="${esc(site.instagram)}" target="_blank" rel="noopener"><img src="${r("assets/img/photos/bowl-top-dry.webp")}" alt="" width="900" height="900" loading="lazy"><span class="reel-label">${icon.insta} Posts</span></a>
      <a class="reel reveal" style="--rd:.18s" href="${esc(site.instagram)}" target="_blank" rel="noopener"><img src="${r("assets/img/photos/bowl-top-egg.webp")}" alt="" width="900" height="900" loading="lazy"><span class="reel-label">${icon.insta} ${esc(site.instagramHandle)}</span></a>
    </div>
  </div>
</section>

${reviewsBlock(r, { title: "What people are saying.", lead: "Been in? Leave a quick review. It helps other noodle lovers find us." })}
${ctaBand(r, { title: `Find us at ${esc(site.suburb)}.` })}
`,
}));

// ---------- Noodle library ----------
addPage("noodles/", layout({
  urlPath: "noodles/",
  title: "Noodle library",
  seoTitle: `All ${noodles.length} Instant Noodles from 12 Countries · MEON Noodles Perth`,
  active: "noodles/",
  jsonld: [{
    "@context": "https://schema.org",
    "@type": "Menu",
    "@id": `${SITE_URL}/noodles/#menu`,
    name: "MEON instant noodle menu",
    url: `${SITE_URL}/noodles/`,
    inLanguage: "en-AU",
    hasMenuSection: countries.map((c) => ({
      "@type": "MenuSection",
      name: `${c.name} instant noodles`,
      url: `${SITE_URL}/countries/${c.slug}/`,
      hasMenuItem: noodles.filter((n) => n.country === c.name).map((n) => ({ "@type": "MenuItem", name: `${n.brand} ${n.name}`, url: `${SITE_URL}/${n.url}`, image: n.img ? `${SITE_URL}/${n.img}` : undefined, suitableForDiet: n.dietTokens.includes("vegan") ? "https://schema.org/VeganDiet" : n.dietTokens.includes("veg") ? "https://schema.org/VegetarianDiet" : undefined })),
    })),
  }],
  description: `Browse all ${noodles.length} instant noodles at MEON. Filter by country, soup or dry, spice level and diet. Every packet has its own page.`,
  body: (r) => `
${pageHero(r, { crumbs: [["Noodles"]], eyebrow: `${noodles.length} noodles · 12 countries`, title: "The noodle wall.", lead: `Every instant noodle we stock. Search by flavour, filter by country or heat, then find it on the wall.`, seed: 1 })}
<div data-library>
  <div class="filters">
    <div class="wrap">
      <div class="filters-row" role="search">
        <label class="search"><span class="visually-hidden">Search noodles</span>${icon.search}<input id="q" type="search" placeholder="Search kimchi, Buldak, tom yum" autocomplete="off" enterkeyhint="search"></label>
        <label class="visually-hidden" for="f-country">Country</label>
        <select class="select" id="f-country"><option value="all">All countries</option>${countries.map((c) => `<option value="${c.code}">${esc(c.name)}</option>`).join("")}</select>
        <label class="visually-hidden" for="f-type">Style</label>
        <select class="select" id="f-type"><option value="all">Soup and dry</option><option value="Soup">Soup</option><option value="Dry">Dry</option><option value="Porridge">Porridge</option></select>
        <label class="visually-hidden" for="f-spice">Spice</label>
        <select class="select" id="f-spice"><option value="all">Any spice</option><option value="mild">No heat (0)</option><option value="medium">Medium (1–2)</option><option value="hot">Hot (3+)</option>${[0, 1, 2, 3, 4, 5].map((l) => `<option value="${l}">Exactly ${l} of 5</option>`).join("")}</select>
        <label class="visually-hidden" for="f-diet">Diet</label>
        <select class="select" id="f-diet"><option value="all">Any diet</option><option value="veg">Vegetarian-friendly</option><option value="vegan">Vegan</option><option value="chicken">Chicken</option><option value="beef">Beef</option><option value="pork">Pork</option><option value="seafood">Seafood</option></select>
      </div>
      <div class="filter-pills" aria-label="Quick country filters">
        ${countries.map((c) => `<button class="pill" type="button" data-pill="country" data-value="${c.code}" aria-pressed="false">${flag(c.code, r, { w: 16 })}${esc(c.name)}</button>`).join("")}
      </div>
    </div>
  </div>
  <div class="wrap">
    <div class="results-bar"><span data-result-count aria-live="polite">${noodles.length} noodles</span>
      <span class="results-tools"><label class="visually-hidden" for="f-sort">Sort</label><select class="select" id="f-sort"><option value="featured">By country</option><option value="photo">Photos first</option><option value="az">A to Z</option><option value="hot">Hottest first</option><option value="mild">Mildest first</option></select>
      <button class="btn btn--line btn--sm" type="button" data-reset>Reset</button></span>
    </div>
    <div class="card-grid card-grid--long">${noodles.map((n, i) => noodleCard(n, r, i)).join("")}</div>
    <div class="empty-state">${emptyBowl}<h2>Nothing matches yet.</h2><p class="lead">Try a different filter, or ask the crew. New packets arrive all the time.</p><button class="btn btn--red" type="button" data-reset>Clear filters</button></div>
    <p class="note">* Vegetarian-friendly means the noodle and seasoning are generally meat-free, but recipes vary by batch and region. Always check the packet if you have dietary requirements or allergies.</p>
  </div>
</div>
${ctaBand(r)}
`,
}));

// ---------- Noodle detail pages (the QR landing pages) ----------
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
    seoTitle: `${n.brand} ${n.name} (${n.country}) · Instant Noodles at MEON Perth`,
    active: "noodles/",
    image: n.img || "assets/img/photos/bowl-side.webp",
    preload: n.img || "",
    description: `${n.brand} ${n.name} (${n.country}) at MEON ${site.suburb}. ${shortBlurb(n)}${n.type ? ` ${n.type} noodle.` : ""}${n.unrated ? "" : ` Spice ${n.spice}/5.`}${n.machine ? ` Machine setting ${n.machine}.` : ""}`,
    jsonld: [
      { "@context": "https://schema.org", "@type": "MenuItem", name: `${n.brand} ${n.name}`, description: `${shortBlurb(n)}${n.type ? ` ${n.type} noodle` : ""} from ${n.country}.`, image: n.img ? `${SITE_URL}/${n.img}` : undefined, url: `${SITE_URL}/${n.url}`, brand: { "@type": "Brand", name: n.brand }, countryOfOrigin: { "@type": "Country", name: n.country }, weight: n.weightG ? { "@type": "QuantitativeValue", value: n.weightG, unitCode: "GRM" } : undefined, suitableForDiet: n.dietTokens.includes("vegan") ? "https://schema.org/VeganDiet" : n.dietTokens.includes("veg") ? "https://schema.org/VegetarianDiet" : undefined, isPartOf: { "@id": `${SITE_URL}/noodles/#menu` } },
      { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: "Noodles", item: `${SITE_URL}/noodles/` },
        { "@type": "ListItem", position: 3, name: n.country, item: `${SITE_URL}/countries/${n.c.slug}/` },
        { "@type": "ListItem", position: 4, name: n.name, item: `${SITE_URL}/${n.url}` },
      ] },
    ],
    body: (r) => `
<article class="noodle">
  <div class="wrap">
    ${crumbsNav(r, [["Noodles", "noodles/"], [esc(n.country), `countries/${n.c.slug}/`], [esc(n.name)]])}
    <div class="noodle-grid">
      <div class="noodle-media">
        <figure class="noodle-photo img-reveal">${noodleMedia(n, r, { size: 800, eager: true, large: true })}${n.img ? steamOverlay : ""}</figure>
        ${n.funNote ? `<p class="noodle-note">${esc(n.funNote)}</p>` : ""}
      </div>
      <div class="noodle-body">
        <p class="qr-banner" data-qr-banner hidden>${icon.qr}<span>Scanned from the shelf. Here's how to cook this one.</span></p>
        <p class="noodle-kicker"><a href="${r(`countries/${n.c.slug}/`)}">${flag(n.countryCode, r, { w: 18 })}${esc(n.country)}</a><span>${esc(n.brand)}</span></p>
        <h1 data-split>${esc(n.name)}</h1>
        <p class="noodle-lede">${shortBlurb(n)}</p>

        <section class="cook" aria-labelledby="cook-h">
          <h2 id="cook-h" class="visually-hidden">Cook it</h2>
          <div class="cook-machine">
            <span class="cook-label">Machine setting</span>
            <span class="cook-code">${n.machine ? esc(n.machine) : "Ask"}</span>
            <span class="cook-hint">${n.machine ? `Select program ${esc(n.machine)} on the cooking machine.` : "Ask the crew which program to use."}</span>
          </div>
          <div class="timer" data-timer data-default="${cook.minutes}">
            <div class="timer-dial"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="track" cx="60" cy="60" r="54" fill="none" stroke-width="6"/><circle class="prog" cx="60" cy="60" r="54" fill="none" stroke-width="6" stroke-linecap="round"/></svg><span class="timer-readout" role="timer" aria-live="off">${cook.minutes}:00</span></div>
            <div class="timer-side">
              <div class="timer-presets" role="group" aria-label="Timer length">${[3, 4, 5].map((m) => `<button class="pill" type="button" data-minutes="${m}" aria-pressed="${m === cook.minutes}">${m} min</button>`).join("")}</div>
              <div class="timer-controls"><button class="btn btn--red" type="button" data-timer-start>Start timer</button><button class="btn btn--line btn--sm" type="button" data-timer-reset>Reset</button></div>
              <p class="note" data-timer-status aria-live="polite"></p>
            </div>
            <div class="timer-buddy" aria-hidden="true"><div class="meo" data-say="Noodles ready"><span class="meo-bubble">Noodles ready</span>${mascot({ acc: "bowl", color: "#ffc83d" })}</div></div>
          </div>
        </section>

        <dl class="noodle-facts">
          <div><dt>Spice</dt><dd>${n.unrated ? `Rating soon<small>Ask the crew how hot it is</small>` : `${spiceMeter(n.spice, r, { large: true })}<small>${n.spice} of 5 · ${ladder[1]}</small>`}</dd></div>
          <div><dt>Style</dt><dd>${esc(n.type || "Ask the crew")}</dd></div>
          <div><dt>Diet</dt><dd>${esc(n.diet)}${n.dietNote ? "*" : ""}</dd></div>
          <div><dt>Packet</dt><dd>${n.weightG ? `${n.weightG} g` : "Ask the crew"}</dd></div>
        </dl>

        <section class="noodle-sec" aria-labelledby="about-h">
          <h2 id="about-h">About this noodle</h2>
          ${paras.map((p) => `<p>${p}</p>`).join("")}
        </section>

        <section class="noodle-sec" aria-labelledby="steps-h">
          <h2 id="steps-h">How to cook it at MEON</h2>
          <ol class="steps-list">${cook.steps.map(([h, t]) => `<li><strong>${h}</strong><span>${t}</span></li>`).join("")}</ol>
          <p class="note">If the packet instructions differ, follow the packet. The crew is always happy to help.</p>
        </section>

        ${tops.length ? `<section class="noodle-sec" aria-labelledby="top-h">
          <h2 id="top-h">Goes well with</h2>
          <ul class="pairings">${tops.map((t) => `<li><a href="${r("toppings/")}#${t.id}">${t.img ? `<img src="${r(t.img)}" alt="" width="64" height="64" loading="lazy">` : `<span class="pair-ic">${svgIcon(t.icon || "bowl")}</span>`}<span>${esc(t.name)}</span></a></li>`).join("")}</ul>
        </section>` : ""}

        <p class="note">${n.dietNote ? "* Vegetarian-friendly means the noodle and seasoning are generally meat-free, but recipes vary. Always check the packet if you have dietary requirements or allergies." : "Always check the packet for allergens and full ingredients."}</p>
        <div class="noodle-actions">
          <button class="btn btn--line btn--sm" type="button" data-share data-url="${esc(`${SITE_URL}/${n.url}`)}" data-title="${esc(`${n.brand} ${n.name} at MEON`)}">${icon.share} Share</button>
          <button class="btn btn--line btn--sm" type="button" data-search-open>${icon.search} Find another noodle</button>
        </div>
        <nav class="prev-next" aria-label="More noodles">
          <a href="${r(prev.url)}"><small>Previous</small><strong>${esc(prev.name)}</strong></a>
          <a href="${r(next.url)}"><small>Next</small><strong>${esc(next.name)}</strong></a>
        </nav>
      </div>
    </div>
  </div>
</article>
${reviewsBlock(r, { slug: n.slug, title: `Rate ${esc(n.name)}.`, lead: "Tried it? Tell everyone how it was." })}
<section class="section section--soft section--tight">
  <div class="wrap">
    ${sectionHead("Keep exploring", "You might also like", `<a class="link-arrow" href="${r(`countries/${n.c.slug}/`)}">More from ${esc(n.country)} ${icon.arrow}</a>`)}
    <div class="card-grid">${similar.map((o, i) => noodleCard(o, r, i)).join("")}</div>
  </div>
</section>
${ctaBand(r, { title: "Hungry for another?", text: "Take this packet off the wall, or try one from another country while your noodles cook." })}
`,
  }));
});

// ---------- Countries ----------
addPage("countries/", layout({
  urlPath: "countries/",
  title: "Noodles by country",
  seoTitle: "Instant Noodles by Country: Korea, Japan, Indonesia and more · MEON Perth",
  active: "countries/",
  description: "Explore MEON's instant noodles country by country: South Korea, Japan, Indonesia, Vietnam, China, Malaysia, Thailand, Singapore, India, the Philippines, Taiwan and Australia.",
  body: (r) => `
${pageHero(r, { crumbs: [["Countries"]], eyebrow: "Twelve countries", title: "Noodles by country.", lead: "Each country has its own style of instant noodle. Choose a flag to see every packet we stock from there.", seed: 2 })}
<section class="section section--tight"><div class="wrap">
  <div class="country-list country-list--full">
    ${countries.map((c, i) => `<a class="country-row reveal" style="--rd:${(i % 4) * 0.04}s" href="${r(`countries/${c.slug}/`)}">${flag(c.code, r, { cls: "flag flag--lg", w: 44 })}<span class="cr-name">${esc(c.name)}<small>${esc(c.headline)}</small></span><span class="cr-count">${plural(countFor((n) => n.country === c.name), "noodle")}</span>${icon.arrow}</a>`).join("")}
  </div>
</div></section>
${ctaBand(r)}
`,
}));

for (const c of countries) {
  const list = noodles.filter((n) => n.country === c.name);
  const others = countries.filter((o) => o.code !== c.code);
  addPage(`countries/${c.slug}/`, layout({
    urlPath: `countries/${c.slug}/`,
    title: `${c.name} instant noodles`,
    seoTitle: `${COUNTRY_ADJ[c.name] || c.name} Instant Noodles in Perth (${list.length}) · MEON Noodles`,
    active: "countries/",
    image: list.find((n) => n.img)?.img,
    jsonld: [
      { "@context": "https://schema.org", "@type": "ItemList", name: `${c.name} instant noodles at MEON`, numberOfItems: list.length, itemListElement: list.map((n, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}/${n.url}`, name: `${n.brand} ${n.name}` })) },
      { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` }, { "@type": "ListItem", position: 2, name: "Countries", item: `${SITE_URL}/countries/` }, { "@type": "ListItem", position: 3, name: c.name, item: `${SITE_URL}/countries/${c.slug}/` }] },
    ],
    description: `${list.length} instant noodles from ${c.name} at MEON ${site.suburb}. ${c.headline}`,
    body: (r) => `
${pageHero(r, { crumbs: [["Countries", "countries/"], [esc(c.name)]], eyebrow: plural(list.length, "noodle"), title: esc(c.name), lead: `<strong>${esc(c.headline)}</strong> ${esc(c.intro)}`, actions: `<a class="btn btn--red" href="${r(`noodles/?country=${c.code}`)}" data-magnetic>Filter in the library ${icon.arrow}</a>`, aside: `<div class="flag-hero" data-parallax="0.06">${flag(c.code, r, { cls: "flag flag--hero", w: 360 })}</div>`,
  after: facts([[list.length, "Noodles"], [list.filter((n) => n.type === "Soup").length, "Soup"], [list.filter((n) => n.type === "Dry").length, "Dry"], [list.filter((n) => n.spiceKey >= 3).length, "Spicy (3+)"]]) })}
<section class="section section--tight"><div class="wrap">
  <div class="card-grid">${list.map((n, i) => noodleCard(n, r, i)).join("")}</div>
</div></section>
<section class="section section--soft section--tight"><div class="wrap">
  <h2 data-split>Other countries</h2>
  <div class="flag-links">${others.map((o) => `<a href="${r(`countries/${o.slug}/`)}">${flag(o.code, r, { w: 22 })}${esc(o.name)}</a>`).join("")}</div>
</div></section>
${ctaBand(r)}
`,
  }));
}

// ---------- Toppings ----------
const groups = [...new Set(toppings.map((t) => t.group))];
const groupId = (g) => g.toLowerCase().replace(/[^a-z]+/g, "-");
addPage("toppings/", layout({
  urlPath: "toppings/",
  title: "Toppings & sides",
  seoTitle: "Noodle Toppings and Sides: Egg, Cheese, Beef, Fishcake · MEON Perth",
  active: "toppings/",
  description: "Toppings and sides at MEON: eggs, cheese, beef and meatballs, fishcake, crab sticks, shrimp katsu, mushrooms, greens and more.",
  body: (r) => `
${pageHero(r, { crumbs: [["Toppings"]], eyebrow: `${toppings.length} toppings and sides`, title: "Toppings and sides.", lead: "The packet is where it starts. Add protein, greens and extras until the bowl is exactly how you like it.", actions: groups.map((g) => `<a class="btn btn--line btn--sm" href="#${groupId(g)}">${esc(g)}</a>`).join(""),
  aside: `<div class="plate-stack">${["topping-fishcake", "topping-enoki", "topping-seaweed"].map((f, i) => `<img src="${r(`assets/img/photos/${f}.webp`)}" alt="" width="900" height="900" style="--i:${i}" data-parallax="${(0.04 + i * 0.04).toFixed(2)}">`).join("")}</div>` })}
${groups.map((g) => `<section class="section section--tight" id="${groupId(g)}"><div class="wrap">
  <h2 data-split>${esc(g)}</h2>
  <div class="topping-grid">${toppings.filter((t) => t.group === g).map((t, i) => `<div class="topping reveal" style="--rd:${(i % 5) * 0.04}s" id="${t.id}"><span class="topping-media">${t.img ? `<img src="${r(t.img)}" alt="${esc(t.name)}" width="300" height="300" loading="lazy">` : `<span class="topping-ic">${svgIcon(t.icon || "bowl")}</span>`}</span><strong>${esc(t.name)}</strong><span>${esc(t.desc)}</span></div>`).join("")}</div>
</div></section>`).join("")}
<section class="section section--tight"><div class="wrap"><p class="note">What's available changes day to day, so ask the crew what's fresh. Please tell us about any allergies.</p></div></section>
${ctaBand(r)}
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
${pageHero(r, { crumbs: [["MEON Card"]], eyebrow: "Free card · 10% off", title: "MEON Member Card.", lead: "Get your card free at the counter, top it up and pay like cash. Members get 10% off eligible food items, every visit.", aside: `<div class="member-card member-card--hero" data-parallax="0.05"><img src="${r("assets/img/photos/meon-member-card.webp")}" alt="The MEON Member Card" width="945" height="591"></div>` })}
<section class="section"><div class="wrap">
  ${sectionHead("How it works", "Four steps to saving.")}
  <ol class="icon-steps">
    ${[["card", "Get your card", "Ask the crew at the counter. The card is free."], ["coins", "Load it up", "Load a minimum amount to activate it, then top up in store whenever you like."], ["bowl", "Pay like cash", "Quick checkout and an easy way to track what you spend."], ["spark", "Save 10%", "Cardholders get 10% off eligible food items: noodles, toppings and sides."]].map(([ic, h, t], i) => `<li class="reveal" style="--rd:${i * 0.06}s"><span class="is-ic">${svgIcon(ic)}</span><span class="hs-num">0${i + 1}</span><h3>${h}</h3><p>${t}</p></li>`).join("")}
  </ol>
</div></section>
<section class="section section--soft"><div class="wrap split">
  <div class="reveal">
    <p class="eyebrow">Current perks</p>
    <h2 data-split>Member perks.</h2>
    <ul class="perk-list">${deals.map((d) => `<li>${svgIcon(d.icon || "spark")}<span><strong>${esc(d.title)}</strong>${esc(d.detail)}</span></li>`).join("")}</ul>
    <p class="note">Discounts apply to eligible food items only. Ask in store for full terms.</p>
  </div>
  <div class="reveal mascot-stage" data-anim>${mascot({ label: "Meo, the MEON mascot", acc: "crown", color: "#ff8fb0", className: "mascot-lg" })}</div>
</div></section>
${ctaBand(r)}
`,
}));

// ---------- About ----------
addPage("about/", layout({
  urlPath: "about/",
  title: "About MEON",
  active: "about/",
  description: `MEON is an instant noodle bar at ${site.suburb}, ${site.city}, with noodles from 12 countries and a toppings bar.`,
  body: (r) => `
${pageHero(r, { crumbs: [["About"]], eyebrow: "Our story", title: "Get to know MEON.", lead: "We opened MEON to share the instant noodles people grow up with across Asia and beyond, and to let everyone cook them their own way.", aside: `<div class="about-logo" data-parallax="0.05">${logoAnimated()}</div>` })}
<section class="section section--tight"><div class="wrap split">
  <div class="reveal">
    <h2 data-split>What we do.</h2>
    <p class="lead">${noodles.length} instant noodles from 12 countries, in one place. Sweet or spicy, soup or dry: pick a packet, add toppings and cook it at your own station.</p>
    <p>Every packet on our wall has a page on this site. Scan the QR code on the shelf to see what it tastes like, how hot it is, which machine setting to use and which toppings go well with it.</p>
    <blockquote class="pull">“Meon is a versatile instant noodle celebrating cultural diversity, inviting creativity and fun with every bowl. Enjoy it as is or customise with toppings to make each meal uniquely yours.”</blockquote>
  </div>
  <div class="reveal">
    <h2 data-split>Our name.</h2>
    <p class="lead">Under “meon” in our logo are letters from Japanese, Thai, Chinese and Korean. They're a nod to the noodle cultures behind every bowl we serve.</p>
    <a class="btn btn--line" href="${r("countries/")}">Meet the countries ${icon.arrow}</a>
  </div>
</div></section>
<section class="section section--soft"><div class="wrap">
  <ul class="values">
    <li class="reveal">${svgIcon("globe")}<h3>Twelve countries</h3><p>Korea, Japan, Indonesia, Vietnam, China, Malaysia, Thailand, Singapore, India, the Philippines, Taiwan and Australia.</p></li>
    <li class="reveal" style="--rd:.06s">${svgIcon("chef")}<h3>Your way</h3><p>Choose the packet, the toppings and how long it cooks.</p></li>
    <li class="reveal" style="--rd:.12s">${svgIcon("chair")}<h3>Dine-in</h3><p>${esc(site.orderingNote)}</p></li>
  </ul>
</div></section>
${ctaBand(r)}
`,
}));

// ---------- Visit ----------
const addressLine = [site.streetAddress, `${site.suburb} ${site.state} ${site.postcode}`.trim()].filter(Boolean).join(", ");
addPage("visit/", layout({
  urlPath: "visit/",
  title: "Visit us",
  seoTitle: `Visit MEON Noodles · Instant Noodle Bar in ${site.suburb}, Perth`,
  active: "visit/",
  jsonld: [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) }],
  description: `Find MEON at ${site.suburb}, ${site.city} ${site.state}. Dine-in only: walk in, pick a packet and start cooking.`,
  body: (r) => `
${pageHero(r, { crumbs: [["Visit"]], eyebrow: `${esc(site.suburb)}, ${esc(site.city)}`, title: "Visit MEON.", lead: esc(site.orderingNote), seed: 7, actions: `<a class="btn btn--red" href="${esc(site.mapsUrl)}" target="_blank" rel="noopener" data-magnetic>${icon.pin} Open in Google Maps</a>${site.instagram ? `<a class="btn btn--line" href="${esc(site.instagram)}" target="_blank" rel="noopener">${icon.insta} ${esc(site.instagramHandle)}</a>` : ""}` })}
<section class="section section--tight"><div class="wrap">
  <div class="info-cols">
    <div class="reveal">${svgIcon("pin")}<h3>Where</h3><p><strong>MEON Noodles</strong><br>${esc(addressLine)}<br>${esc(site.city)}, Western Australia</p><a class="link-arrow" href="${esc(site.mapsUrl)}" target="_blank" rel="noopener">Directions ${icon.arrow}</a></div>
    <div class="reveal" style="--rd:.06s">${svgIcon("clock")}<h3>When</h3>${site.hours.length ? `<table class="hours"><tbody>${site.hours.map((h) => `<tr><td>${esc(h.days)}</td><td>${esc(h.time)}</td></tr>`).join("")}</tbody></table>` : `<p>${esc(site.hoursNote)}</p>`}</div>
    <div class="reveal" style="--rd:.12s">${svgIcon("chat")}<h3>Contact</h3><p>Questions, feedback, or a noodle you'd like us to stock? We'd like to hear it.</p>${site.email ? `<p><a href="mailto:${esc(site.email)}">${esc(site.email)}</a></p>` : ""}${site.phone ? `<p><a href="tel:${esc(site.phone.replace(/\s+/g, ""))}">${esc(site.phone)}</a></p>` : ""}${site.instagram ? `<a class="link-arrow" href="${esc(site.instagram)}" target="_blank" rel="noopener">Message us on Instagram ${icon.arrow}</a>` : ""}</div>
  </div>
</div></section>
<section class="section section--soft"><div class="wrap split">
  <div class="reveal">
    <h2 data-split>Good to know.</h2>
    <ul class="perk-list">
      <li>${svgIcon("chair")}<span><strong>Dine-in only.</strong>We don't take online or phone orders. Choosing the packet is half the fun.</span></li>
      <li>${svgIcon("qr")}<span><strong>Scan the shelf.</strong>Every noodle has a QR code that opens its page, with the machine setting and a cook timer.</span></li>
      <li>${svgIcon("card")}<span><strong>Members save 10%.</strong>Ask about the free <a href="${r("meon-card/")}">MEON Member Card</a> at the counter.</span></li>
      <li>${svgIcon("alert")}<span><strong>Allergies?</strong>Check the packet and tell the crew. We'll help you choose.</span></li>
    </ul>
  </div>
  <div class="duo">
    <figure class="img-reveal" data-parallax="-0.04"><img src="${r("assets/img/photos/bowl-side-seaweed.webp")}" alt="A MEON bowl with seaweed and beef" width="900" height="900" loading="lazy"></figure>
    <figure class="img-reveal" data-parallax="0.06"><img src="${r("assets/img/photos/bowl-top-egg.webp")}" alt="Noodles with egg and enoki from above" width="900" height="900" loading="lazy"></figure>
  </div>
</div></section>
<section class="section"><div class="wrap split split--top">
  <div class="reveal"><p class="eyebrow">Questions</p><h2 data-split>Frequently asked.</h2></div>
  <div class="faq">${FAQ.map(([q, a]) => `<details class="reveal"><summary>${esc(q)}${icon.chevron}</summary><p>${esc(a)}</p></details>`).join("")}</div>
</div></section>
${ctaBand(r, { title: `See you at ${esc(site.suburb)}.` })}
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
<div class="no-print">${pageHero(r, { crumbs: [["Shelf QR codes"]], eyebrow: `Staff · ${noodles.length + 3} printable codes`, title: "Shelf QR codes.", seed: 8 })}</div>
<section class="section section--tight"><div class="wrap">
  <div class="no-print">
    <p class="lead">One QR code per noodle. Each opens that noodle's page with <code>?src=qr</code> so in-store scans can be counted separately. Print on A4 (3 per row), or download single files. Need a custom code? Use the <a href="${r("qr-generator/")}">QR generator</a>.</p>
    <p class="note">Codes point to <strong>${esc(SITE_URL)}</strong>. If the domain changes, update <code>siteUrl</code> in <code>data/site.json</code> and rebuild before printing.</p>
  </div>
  <div class="qr-tools">
    <button class="btn btn--red btn--sm" type="button" data-print>${icon.print} Print all</button>
    <a class="btn btn--line btn--sm" href="${r("assets/qr/qr-codes.csv")}" download>${icon.download} Download CSV</a>
    <a class="btn btn--line btn--sm" href="${r("qr-generator/")}">${icon.qr} QR generator</a>
    <label class="search" style="max-width:340px"><span class="visually-hidden">Filter QR codes</span>${icon.search}<input type="search" placeholder="Filter…" data-qr-filter></label>
  </div>
  <div class="qr-sheet">
    ${[...extraQR.map((x) => ({ slug: x.slug, name: x.name, brand: "MEON", cc: "", url: x.url })), ...noodles.map((n) => ({ slug: n.slug, name: n.name, brand: n.brand, cc: n.countryCode, url: n.qrUrl, machine: n.machine }))]
      .map((q) => `<div class="qr-card"><span class="qr-brand">${q.cc ? flag(q.cc, r, { w: 16 }) : ""}${esc(q.brand)}</span><h3>${esc(q.name)}</h3><img src="${r(`assets/qr/${q.slug}.svg`)}" alt="QR code for ${esc(q.name)}" width="160" height="160" loading="lazy"><div class="qr-scan">Scan for info + cook timer</div>${q.machine ? `<span class="qr-machine">Machine ${esc(q.machine)}</span>` : ""}<div class="qr-url">${esc(q.url)}</div><div class="no-print" style="margin-top:8px;display:flex;gap:6px;justify-content:center"><a class="chip" href="${r(`assets/qr/${q.slug}.svg`)}" download>SVG</a>${process.env.QR_PNG !== "0" ? `<a class="chip" href="${r(`assets/qr/${q.slug}.png`)}" download>PNG</a>` : ""}</div></div>`)
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
<div class="no-print">${pageHero(r, { crumbs: [["QR generator"]], eyebrow: "Staff · runs in your browser", title: "QR code generator.", lead: "Make a branded QR code for any noodle, page, deal or link. Download a PNG for print or an SVG for signage.", seed: 9 })}</div>
<section class="section section--tight"><div class="wrap">
  <div class="qrgen" data-qrgen data-site="${esc(SITE_URL)}" data-logo="${r("assets/img/logo-192.png")}">
    <form class="qrgen-form panel" onsubmit="return false">
      <div class="field"><label for="qg-preset">Start from</label>
        <select id="qg-preset">
          <option value="">Custom link or text</option>
          <optgroup label="Pages"><option value="/">Home</option><option value="/noodles/">Noodle library</option><option value="/meon-card/">MEON Member Card</option><option value="/toppings/">Toppings</option><option value="/visit/">Visit us</option></optgroup>
          ${countries.map((c) => `<optgroup label="${esc(c.name)}">${noodles.filter((n) => n.country === c.name).map((n) => `<option value="/${n.url}" data-label="${esc(n.name)}">${esc(n.brand)} · ${esc(n.name)}</option>`).join("")}</optgroup>`).join("")}
        </select></div>
      <div class="field"><label for="qg-url">Link or text</label><input id="qg-url" type="text" value="${esc(SITE_URL)}/" spellcheck="false"></div>
      <label class="toggle"><input id="qg-src" type="checkbox" checked> Add <code>?src=qr</code> so scans are counted</label>
      <div class="field"><label for="qg-label">Label under the code</label><input id="qg-label" type="text" value="Scan me" maxlength="60"></div>
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
        <button class="btn btn--line btn--sm" type="button" data-qg-svg>${icon.download} Download SVG</button>
        <button class="btn btn--line btn--sm" type="button" data-print>${icon.print} Print</button>
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
  description: "We couldn't find that page. Head back to the noodle wall.",
  body: () => `
<section class="lost"><div class="wrap">
  ${emptyBowl}
  <h1>Page not found.</h1>
  <p class="lead">We couldn't find that page. The packet may have moved shelves.</p>
  <p class="actions"><a class="btn btn--red" href="/">Back to MEON</a> <button class="btn btn--line" type="button" data-search-open>Search noodles</button></p>
</div></section>
`,
}).replace(/(href|src)="\.\/"/g, '$1="/"').replace(/(href|src)="\.\/([^"]*)"/g, '$1="/$2"').replace(/data-root="\.\/"/, 'data-root="/"'));

/* ---------------- static files ---------------- */
copyDir(path.join(SRC, "assets"), path.join(OUT, "assets"));
fs.mkdirSync(path.join(OUT, "assets", "vendor"), { recursive: true });
fs.copyFileSync(require.resolve("qrcode-generator/qrcode.js"), path.join(OUT, "assets", "vendor", "qrcode.js"));
fs.mkdirSync(path.join(OUT, "assets", "img", "flags"), { recursive: true });
for (const c of countries) fs.copyFileSync(path.join(ROOT, "node_modules", "flag-icons", "flags", "4x3", `${c.code}.svg`), path.join(OUT, "assets", "img", "flags", `${c.code}.svg`));
write("assets/img/icons.svg", iconSprite());

// Search index used by the site-wide search overlay.
const searchIndex = [
  ...noodles.map((n) => ({ g: "Noodles", t: n.name, s: `${n.brand} · ${n.country} · ${n.type || "?"} · ${n.unrated ? "spice soon" : "spice " + n.spice + "/5"}`, u: n.url, i: n.thumb, f: n.countryCode, k: [n.flavour, n.diet, n.funNote, n.machine, n.dietTokens.join(" ")].filter(Boolean).join(" ") })),
  ...countries.map((c) => ({ g: "Countries", t: c.name, s: `${countFor((n) => n.country === c.name)} noodles · ${c.headline}`, u: `countries/${c.slug}/`, f: c.code, k: "country" })),
  ...toppings.map((t) => ({ g: "Toppings", t: t.name, s: t.desc, u: `toppings/#${t.id}`, i: t.img || undefined, ic: t.img ? undefined : t.icon, k: `topping ${t.group}` })),
  ...[
    ["Noodle library", "Browse and filter all noodles", "noodles/", "bowl"],
    ["Vegetarian-friendly noodles", "Filter: vegetarian-friendly", "noodles/?diet=veg", "leaf"],
    ["Vegan noodles", "Filter: vegan", "noodles/?diet=vegan", "sprout"],
    ["Spicy noodles (3+)", "Filter: hot", "noodles/?spice=hot", "flame"],
    ["Dry noodles", "Filter: dry, mix-and-eat", "noodles/?type=Dry", "chopsticks"],
    ["Soup noodles", "Filter: soup", "noodles/?type=Soup", "soup"],
    ["MEON Member Card", "Free card · 10% off for members", "meon-card/", "card"],
    ["Visit us", `${site.suburb}, ${site.city} · dine-in only`, "visit/", "pin"],
    ["About MEON", "Our story", "about/", "heart"],
    ["Shelf QR codes", "Staff: printable QR codes", "qr/", "qr"],
    ["QR code generator", "Staff: make a custom QR code", "qr-generator/", "qr"],
  ].map(([t, s, u, ic]) => ({ g: "Pages", t, s, u, ic, k: "page" })),
];
write("search-index.json", JSON.stringify(searchIndex));
write("robots.txt", `User-agent: *\nAllow: /\nDisallow: /qr/\nDisallow: /qr-generator/\nSitemap: ${SITE_URL}/sitemap.xml\n`);
const pageImages = new Map([["", ["assets/img/photos/bowl-side.webp", "assets/img/photos/bowl-top-egg.webp"]], ...noodles.filter((n) => n.img).map((n) => [n.url, [n.img]])]);
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${pages.filter((p) => !p.startsWith("qr")).map((p) => `  <url><loc>${SITE_URL}/${p}</loc><lastmod>${BUILD_DATE}</lastmod>${(pageImages.get(p) || []).map((im) => `<image:image><image:loc>${SITE_URL}/${im}</image:loc></image:image>`).join("")}</url>`).join("\n")}\n</urlset>\n`);
write("llms.txt", `# MEON Noodles\n\n> Instant noodle bar in ${site.suburb}, ${site.city}, Western Australia. ${noodles.length} instant noodles from 12 countries, a toppings bar and self-cook stations. Dine-in only, no online orders.\n\n## Key pages\n- [Noodle library](${SITE_URL}/noodles/): every noodle with country, spice level (0-5), diet and cooking machine setting\n- [Countries](${SITE_URL}/countries/)\n- [Toppings and sides](${SITE_URL}/toppings/)\n- [MEON Member Card](${SITE_URL}/meon-card/): free card, 10% off eligible food\n- [Visit](${SITE_URL}/visit/): location and FAQ\n\n## Noodles\n${noodles.map((n) => `- [${n.brand} ${n.name}](${SITE_URL}/${n.url}): ${n.country}, ${n.type || "noodle"}, spice ${n.unrated ? "unrated" : n.spice + "/5"}${n.machine ? `, machine ${n.machine}` : ""}`).join("\n")}\n`);
write("site.webmanifest", JSON.stringify({ name: "MEON Noodles", short_name: "MEON", start_url: "/", display: "standalone", background_color: "#ffffff", theme_color: "#ec1b25", icons: [{ src: "/assets/img/logo-192.png", sizes: "192x192", type: "image/png" }, { src: "/assets/img/logo-512.png", sizes: "512x512", type: "image/png" }] }, null, 2));
write("noodles.json", JSON.stringify(noodles.map((n) => ({ slug: n.slug, name: n.name, brand: n.brand, country: n.country, flavour: n.flavour, type: n.type, spice: n.unrated ? null : n.spice, diet: n.diet, weightG: n.weightG, machine: n.machine, funNote: n.funNote, url: `${SITE_URL}/${n.url}`, qr: n.qrUrl, image: n.img ? `${SITE_URL}/${n.img}` : null })), null, 1));

console.log(`Built ${pages.length + 1} pages → ${path.relative(ROOT, OUT)}/  (${noodles.length} noodles, ${withPhotos.length} with photos, QR base ${SITE_URL})`);
