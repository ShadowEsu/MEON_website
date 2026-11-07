#!/usr/bin/env node
// MEON static site generator. Zero framework: reads data/*.json, writes ./site.
// Usage: node scripts/build.mjs            (uses siteUrl from data/site.json)
//        SITE_URL=https://example.com node scripts/build.mjs   (another domain, e.g. once MEON has its own)
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";
import { describe, shortBlurb, cookSteps, suggestPairings, badge, COUNTRY_ADJ, COOK_SECONDS, COOK_TIME } from "./lib/copy.mjs";
import { indexNowKey } from "./lib/indexnow.mjs";
import { schemaHoursFresh, SCHEMA_HOURS_MAX_DAYS } from "./lib/hours.mjs";
import { icon, svgIcon, iconSprite, flag, spiceMeter, mascot, peeker, steamOverlay, emptyBowl, logoMark, logoLockup, TOPPING_ART } from "./lib/art.mjs";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const OUT = path.join(ROOT, "site");
const readJSON = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, "data", f), "utf8"));

const site = readJSON("site.json");
// Packet weights, extra noodles, sides and drinks from MEON's Square catalogue (see data/catalogue.json). No prices on the site.
const catalogue = readJSON("catalogue.json");
const noodlesRaw = [...readJSON("noodles.json"), ...catalogue.extraNoodles].map((n) => ({ ...n, ...catalogue.noodles[n.slug] }));
for (const slug of Object.keys(catalogue.noodles)) if (!noodlesRaw.some((n) => n.slug === slug)) throw new Error(`data/catalogue.json lists unknown noodle ${slug}`);
const dupSlug = noodlesRaw.find((n, i) => noodlesRaw.findIndex((o) => o.slug === n.slug) !== i);
if (dupSlug) throw new Error(`Duplicate noodle slug ${dupSlug.slug}`);
const countries = readJSON("countries.json");

const images = fs.existsSync(path.join(ROOT, "data", "images.json")) ? readJSON("images.json") : {};
// Extra photos per noodle (top-down and close-ups from the MEON shoot), shown under the main photo.
const gallery = fs.existsSync(path.join(ROOT, "data", "gallery.json")) ? readJSON("gallery.json") : {};
// What each photo shows (alt text), keyed like images.json and gallery.json. A photo the site shows without one stops the build.
const photoAlts = readJSON("photo-alts.json");
const altFor = (p) => {
  if (!photoAlts[p]) throw new Error(`No alt text for ${p}: add what the photo shows to data/photo-alts.json`);
  return photoAlts[p];
};
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
// The shipped CSS and JS lose their comments; the source keeps them. That is 19% less render-blocking CSS (4.7 KB
// brotli): the motion release's phone LCP gate, 5 Nov 2026. Nothing else changes, so a minifier isn't needed:
// - CSS: every /* */ outside a quoted string or url(), and the blank lines left behind. A comment with no space on
//   either side becomes /**/, so 2 tokens never join. `/*!` comments stay.
// - JS: only lines that are wholly a // comment, and blank lines. That is safe while the file has no template literal
//   and no string continued onto the next line; a file with either is copied as it is.
const stripCss = (s) => {
  let out = "";
  for (let i = 0; i < s.length; ) {
    const c = s[i], bare = c === "u" && /^url\(\s*[^\s"']/.test(s.slice(i, i + 6)); // an unquoted url() ends at ")"; a quoted one is a string
    if (c === '"' || c === "'" || bare) {
      const close = bare ? ")" : c;
      let j = i + (bare ? 4 : 1);
      while (j < s.length && s[j] !== close) j += s[j] === "\\" ? 2 : 1;
      out += s.slice(i, j + 1); i = j + 1;
    } else if (c === "/" && s[i + 1] === "*" && s[i + 2] !== "!") {
      const j = s.indexOf("*/", i + 2);
      if (j < 0) throw new Error("CSS: a comment never closes");
      if (!/\s/.test(out.slice(-1) || " ") && !/\s/.test(s[j + 2] || " ")) out += "/**/";
      i = j + 2;
    } else { out += c; i++; }
  }
  return out.replace(/\n[ \t]*(?=\n)/g, "");
};
const stripJs = (s, name) => {
  if (s.includes("`") || /\\\r?\n/.test(s)) { console.log(`Note: ${name} keeps its comments (a template literal or a continued string)`); return s; }
  return s.split("\n").filter((l) => !/^\s*(\/\/.*)?$/.test(l)).join("\n") + "\n";
};
const copyDir = (from, to) => {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, entry.name), b = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(a, b);
    else if (entry.name.endsWith(".css")) fs.writeFileSync(b, stripCss(fs.readFileSync(a, "utf8")));
    else if (entry.name.endsWith(".js")) fs.writeFileSync(b, stripJs(fs.readFileSync(a, "utf8"), entry.name));
    else fs.copyFileSync(a, b);
  }
};
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

fs.rmSync(OUT, { recursive: true, force: true });

// Photos are cached for 30 days, so add a short content hash: a replaced photo gets a new URL.
const fingerprint = (p) => `${p}?v=${crypto.createHash("sha1").update(fs.readFileSync(path.join(SRC, p))).digest("hex").slice(0, 8)}`;
// Width of a .webp from its header (VP8X, VP8 or VP8L), for exact srcset descriptors.
const webpWidth = (file) => {
  const b = fs.readFileSync(file), chunk = b.toString("ascii", 12, 16);
  if (chunk === "VP8X") return 1 + b.readUIntLE(24, 3);
  if (chunk === "VP8 ") return b.readUInt16LE(26) & 0x3fff;
  if (chunk === "VP8L") return 1 + (b.readUInt32LE(21) & 0x3fff);
  throw new Error(`not a webp: ${file}`);
};
// Small copies of photos the site shows small (made by scripts/make_thumbs.py): "<name>-t<px>.webp" next to the original.
// Falls back to the original when the copy hasn't been made yet.
const smallCopy = (p, px) => { const t = p.replace(/\.webp$/, `-t${px}.webp`); return fingerprint(fs.existsSync(path.join(SRC, t)) ? t : p); };
// A photo named in data/*.json (`img`) with what the grids need: `small` is the 64 px icon (2x); `mid` (384 px) and `w` (the original's
// width) give the grid a srcset when the 384 px copy exists.
const withPhoto = (t) => {
  if (!t.img) return t;
  const mid = t.img.replace(/\.webp$/, "-t384.webp");
  return { ...t, img: fingerprint(t.img), alt: altFor(t.img.replace(/^assets\//, "")), small: smallCopy(t.img, 128), ...(fs.existsSync(path.join(SRC, mid)) ? { mid: fingerprint(mid), w: webpWidth(path.join(SRC, t.img)) } : {}) };
};
// Pairings (cooked in the bowl) and sides (ready to eat), from data/toppings.json.
const pairings = readJSON("toppings.json").map(withPhoto);
// Drinks from MEON's current catalogue. The menu and home gallery show the same
// photos. Each row in data/drink-photos.json is one product (owner pack shots, 7 Nov 2026).
// A catalogue drink with no row is listed by name only.
const drinks = catalogue.drinks;
const drinkGroups = readJSON("drink-photos.json").groups.map((g) => {
  const where = `data/drink-photos.json "${g.type}"`;
  const items = g.drinks.map((name) => {
    const d = drinks.find((x) => x.name === name);
    if (!d) throw new Error(`data/drink-photos.json: "${name}" isn't a drink in data/catalogue.json`);
    return d;
  });
  if (g.photo !== "type" && g.photo !== "exact") throw new Error(`${where}: photo must be "type" or "exact"`);
  const shows = g.photo === "exact" && items.find((d) => d.name === g.shows);
  if (g.photo === "exact" && !shows) throw new Error(`${where}: an exact photo needs "shows" naming one of its own drinks`);
  if (g.credit && !(g.credit.author && g.credit.licence && /^https:\/\/creativecommons\.org\//.test(g.credit.licenceUrl || "") && /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(g.source?.page || ""))) throw new Error(`${where}: a credit needs author, licence, a creativecommons.org licence URL and the Commons file page in source.page`);
  if (!g.credit && /\bBY\b/.test(g.source?.licence || "")) throw new Error(`${where}: a CC BY/BY-SA photo needs a credit on the page`);
  return { ...g, items, shows, img: fingerprint(g.img), small: smallCopy(g.img, 320), alt: altFor(g.img.replace(/^assets\//, "")) };
});
for (const d of drinks) {
  const n = drinkGroups.filter((g) => g.drinks.includes(d.name)).length;
  if (n > 1) throw new Error(`data/drink-photos.json: catalogue drink "${d.name}" is in ${n} groups, it needs at most 1`);
}
const drinksWithoutPhoto = drinks.filter((d) => !drinkGroups.some((g) => g.drinks.includes(d.name)));
const countryByName = new Map(countries.map((c) => [c.name, c]));
const noodles = noodlesRaw.map((n) => {
  const c = countryByName.get(n.country);
  if (!c) throw new Error(`Unknown country ${n.country} for ${n.slug}`);
  const img = images[n.slug] && fs.existsSync(path.join(SRC, "assets", images[n.slug])) ? fingerprint(`assets/${images[n.slug]}`) : null;
  const thumb = img && fs.existsSync(path.join(SRC, "assets", "img", "noodles", "sm", `${n.slug}.webp`)) ? fingerprint(`assets/img/noodles/sm/${n.slug}.webp`) : img;
  const galleryFiles = img ? (gallery[n.slug] || []).filter((p) => fs.existsSync(path.join(SRC, "assets", p))) : [];
  const more = galleryFiles.map((p) => fingerprint(`assets/${p}`));
  const moreSmall = galleryFiles.map((p) => smallCopy(`assets/${p}`, 192)); // the 96 px gallery thumbnails (2x)
  const imgAlt = img ? altFor(images[n.slug]) : null;
  const moreAlts = galleryFiles.map(altFor);
  // Diet label (Preston, 29 Oct 2026): "Vegetarian", never "vegetarian-friendly" or "vegan". "Meat flavour (…)" (owner's
  // ruling, 2 Nov 2026): noodles flavoured with chicken, beef or pork flavour, artificial or not, are never vegetarian;
  // check.mjs keeps them out of the Vegetarian label and filter.
  const diet = /Vegetarian/.test(n.diet) ? "Vegetarian" : n.diet;
  const dietTokens = [];
  if (diet === "Vegetarian") dietTokens.push("veg");
  if (/Meat/.test(diet)) dietTokens.push("meat");
  const m = diet.match(/\((\w+)\)/);
  if (m) dietTokens.push(m[1].toLowerCase());
  if (/Seafood/.test(diet)) dietTokens.push("seafood");
  const unrated = n.spice == null;
  return { ...n, diet, dietNote: n.dietNote || diet === "Vegetarian", note: badge(n.funNote), c, img, imgAlt, thumb, more, moreAlts, moreSmall, dietTokens, unrated, spiceKey: unrated ? -1 : n.spice, url: `noodles/${n.slug}/`, qrUrl: `${SITE_URL}/noodles/${n.slug}/?src=qr` };
});
const withPhotos = noodles.filter((n) => n.img);
// Vegetarian label only with the maker's word for it (BOSS + Security, 2 Nov 2026): a noodle says Vegetarian only once its
// data has dietSource {url, checked}, the maker's ingredient list (check.mjs enforces it). Until one does, the site offers
// no Vegetarian filter, links or "some are vegetarian" answer, because they would lead nowhere or say something untrue.
const HAS_VEG = noodles.some((n) => n.dietTokens.includes("veg"));

// Home "Worth a try" cards: packets with a photo whose fun note (from the owner's library doc) sounds notable, then any with a
// photo. Not sales or till data, so the heading never claims what customers pick most (REG-82; check.mjs guards it). A true
// best-sellers list needs the till's numbers from the owner.
const FEATURE_RE = /top|popular|viral|no\.1|award|premium|seller|hyped|featured|michelin|rated/i;
const featured = [...noodles.filter((n) => n.img && n.funNote && FEATURE_RE.test(n.funNote)), ...noodles.filter((n) => n.img && !(n.funNote && FEATURE_RE.test(n.funNote)))].slice(0, 8);

// Shin Ramyun is the yardstick (Preston, 28 Oct 2026): every noodle is rated against it.
const SPICE_LADDER = [
  [0, "No heat", "No chilli at all. Good for kids and anyone avoiding spice."],
  [1, "Mild", "A little warmth in the background, like Indomie Mi Goreng."],
  [2, "Medium", "Noticeable heat, still easy going, like Mama Creamy Tom Yum."],
  [3, "Hot", "Shin Ramyun hot. Properly spicy, so keep a drink nearby."],
  [4, "Very hot", "Hotter than Shin Ramyun. Serious heat that builds as you eat."],
  [5, "Extreme", "The hottest packets on the wall."],
];

/* ---------------- layout ---------------- */
const NAV = [
  ["", "Home"],
  ["noodles/", "Noodles"],
  ["countries/", "Countries"],
  ["pairings-and-sides/", "Pairings and sides"],
  ["about/", "About"],
];
// Public wording: the noodle count is built from the data (Design, 31 Oct 2026: no vague "100+" next to a list of 199), so
// it stays true as packets come and go.
const COUNT = String(noodles.length);
// Where the noodles come from, counted from the data. 3 packets are from Australia, so the wording isn't "from across Asia"
// (Security, 4 Nov 2026). The build stops if a stocked country outside Asia isn't Australia, so the wording stays true.
const ASIAN_COUNTRIES = new Set(["China", "India", "Indonesia", "Japan", "Malaysia", "Philippines", "Singapore", "South Korea", "Taiwan", "Thailand", "Vietnam"]);
const stockedCountries = [...new Set(noodles.map((n) => n.country))];
const outsideAsia = stockedCountries.filter((c) => !ASIAN_COUNTRIES.has(c));
if (outsideAsia.join() !== "Australia") throw new Error(`The site says "across Asia and Australia", but the stocked countries outside Asia are: ${outsideAsia.join(", ") || "none"}`);
// \u00A0 keeps each number on the same line as its noun (Design, 4 Nov 2026: "12 / countries" broke on desktop). It's the
// character, not &nbsp;, because REGION also goes into meta descriptions, JSON-LD and llms.txt.
const REGION = `from ${stockedCountries.length}\u00A0countries across Asia and Australia`;
const REGION_SHORT = `from ${stockedCountries.length}\u00A0countries`; // where space is tight: the library eyebrow
// Opening hours: data/site.json `hours`, as MEON published them (hoursSource; check.mjs makes sure they're sourced and
// shown). The note says changes go up on Instagram first; Design, 31 Oct 2026: no "please". With no hours in the file the
// visit page links to Instagram instead.
const HOURS_NOTE = (site.hoursNote || "").replace(/\s*Please [^.]*\./g, "").trim();
const HOURS_LINE = site.hours.length ? `Open ${site.hours.map((h) => `${h.days} ${h.time}`).join(", ")}.` : HOURS_NOTE;
// The same rows for search engines (Restaurant schema openingHoursSpecification, SEO 2 Nov 2026): "Monday – Thursday" /
// "12pm – 9:30pm" become each day's opens/closes in 24-hour time. A closing time before the opening time means after
// midnight (Fri–Sat 2:30am), which is how Google reads it. A row the parser can't read stops the build. Only while
// hoursSource.checked is at most 90 days old (scripts/lib/hours.mjs, Security SHOULD-MS1).
const WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const to24 = (t) => {
  const m = t.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (!m || +m[1] < 1 || +m[1] > 12) throw new Error(`data/site.json hours: can't read the time "${t}"`);
  return `${String((+m[1] % 12) + (m[3].toLowerCase() === "pm" ? 12 : 0)).padStart(2, "0")}:${m[2] || "00"}`;
};
const HOURS_SPEC = site.hours.length && schemaHoursFresh(site.hoursSource) ? site.hours.map((h) => {
  const [a, b = a] = h.days.split(/\s*[–-]\s*/).map((d) => WEEK.indexOf(d.trim()));
  const times = h.time.split(/\s*[–-]\s*/);
  if (a < 0 || b < a || times.length !== 2) throw new Error(`data/site.json hours: can't read "${h.days}: ${h.time}"`);
  return { "@type": "OpeningHoursSpecification", dayOfWeek: WEEK.slice(a, b + 1), opens: to24(times[0]), closes: to24(times[1]) };
}) : undefined;
if (site.hours.length && !HOURS_SPEC) console.log(`Note: opening hours left out of the Restaurant schema: hoursSource.checked (${site.hoursSource?.checked || "none"}) is more than ${SCHEMA_HOURS_MAX_DAYS} days old. Re-check them and update data/site.json.`);
// Search snippets show about 160 characters. fitDesc keeps `head` whole, trims `body` (last sentences first, then at a word
// with "…") only if head + body is too long, then adds each optional extra (or the first of its alternatives) that still fits.
const fitDesc = (head, body, extras = [], max = 160) => {
  const room = max - head.length - 1;
  let b = body;
  while (b.length > room && /[.!?]\s+\S.*[.!?]$/.test(b)) b = b.replace(/\s+[^.!?]+[.!?]$/, "");
  if (b.length > room) b = b.slice(0, b.lastIndexOf(" ", room - 1)).replace(/[\s,;:–-]+$/, "") + "…";
  let d = `${head} ${b}`;
  for (const x of extras) { const pick = [x].flat().find((y) => d.length + 1 + y.length <= max); if (pick) d += " " + pick; }
  return d;
};

// `overlay`: the page opens on a video hero: no announcement line above it, and the header gets the video pause button
// that takes over once the hero's own button scrolls under the header.
function layout({ urlPath, title, seoTitle = "", description, body, active = "", image = "assets/img/shoot/og-meon.jpg", preload = "", noindex = false, overlay = false, jsonld = [], scripts = [] }) {
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
    description: `Instant noodle bar in ${site.suburb}, ${site.city} with ${COUNT} instant noodles ${REGION}, a pairings and sides bar and self-cook machines. Dine in or take it away.`,
    url: SITE_URL + "/",
    logo: `${SITE_URL}/assets/img/logo-512.png`,
    image: [`${SITE_URL}/assets/img/shoot/og-meon.jpg`, `${SITE_URL}/assets/img/shoot/tomyum-egg-prawn-1600.webp`, `${SITE_URL}/assets/img/shoot/shin-black-top-1600.webp`, `${SITE_URL}/assets/img/logo-512.png`],
    servesCuisine: ["Instant noodles", "Ramen", "Korean", "Japanese", "Indonesian", "Asian"],
    hasMenu: `${SITE_URL}/noodles/`,
    menu: `${SITE_URL}/noodles/`,
    hasMap: site.googleBusinessUrl || site.mapsUrl,
    telephone: site.phone || undefined,
    email: site.email || undefined,
    address: { "@type": "PostalAddress", streetAddress: site.streetAddress || undefined, addressLocality: site.suburb, addressRegion: site.state, postalCode: site.postcode || undefined, addressCountry: "AU" },
    geo: site.geo && site.geo.lat ? { "@type": "GeoCoordinates", latitude: site.geo.lat, longitude: site.geo.lng } : undefined,
    openingHoursSpecification: HOURS_SPEC,
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
  };
  const ld = [
    // The full Restaurant node lives on the home page only; a name-and-url stub on other pages reads as an incomplete local business.
    ...(urlPath === "" ? [restaurant, website] : []),
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
<link rel="preload" as="font" type="font/woff2" href="${r("assets/fonts/bricolage-grotesque-latin.woff2")}" crossorigin>
${typeof preload === "string" ? (preload ? `<link rel="preload" as="image" href="${r(preload)}" fetchpriority="high">` : "") : `<link rel="preload" as="image" href="${r(preload.src)}" imagesrcset="${preload.srcset.map(([p, w]) => `${r(p)} ${w}w`).join(", ")}" imagesizes="${preload.sizes}" fetchpriority="high">`}
<link rel="stylesheet" href="${r("assets/css/site.css")}?v=${BUILD_ID}">
<script>(function(d){d.className=d.className.replace("no-js","js");})(document.documentElement)</script>
${ld.length ? `<script type="application/ld+json">${json(ld.length === 1 ? ld[0] : ld)}</script>` : ""}
${analytics}
</head>
<body data-root="${root}">
<a class="skip-link" href="#main">Skip to content</a>
<div class="scroll-progress" aria-hidden="true"><span></span></div>
${overlay ? "" : `<aside class="announce" aria-label="Where to find us"><span>Cook-it-yourself instant noodles at ${esc(site.streetAddress)}, ${esc(site.suburb)}.</span> <a href="${esc(site.mapsUrl)}" target="_blank" rel="noopener">Get directions</a></aside>`}
<header class="site-header" data-header>
  <div class="wrap bar">
    <a class="logo" href="${r("")}" aria-label="MEON home">${logoMark("logo-badge")}</a>
    <nav class="nav" id="site-nav" aria-label="Main">
      ${navLinks}
      <a class="nav-mobile-only" href="${r("visit/")}"${cur("visit/")}>Visit us</a>
    </nav>
    <div class="header-actions">
      ${overlay ? `<button class="vpause-hdr" type="button" data-video-toggle data-video-toggle-header aria-pressed="false" aria-label="Pause videos" hidden><span class="vpause-ic" aria-hidden="true"></span></button>` : ""}
      <button class="sound-btn" type="button" data-sound aria-pressed="false" aria-label="Sound (background music)"><span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="sound-label">Sound</span></button>
      <button class="search-btn" type="button" data-search-open>${icon.search}<span class="label" aria-hidden="true">Search</span><span class="visually-hidden">Search noodles</span><kbd aria-hidden="true">⌘K</kbd></button>
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
        <p>Dine in or take it away at ${esc(site.streetAddress)}, ${esc(site.suburb)}.</p>
        <div class="footer-socials">
          ${site.instagram ? `<a class="footer-social" href="${esc(site.instagram)}" target="_blank" rel="noopener">${icon.insta} ${esc(site.instagramHandle)}</a>` : ""}
          ${site.tiktok ? `<a class="footer-social" href="${esc(site.tiktok)}" target="_blank" rel="noopener">${icon.tiktok} TikTok</a>` : ""}
        </div>
      </div>
      <div>
        <h2>Eat</h2>
        <ul>
          <li><a href="${r("noodles/")}">Noodle library</a></li>
          <li><a href="${r("noodles/?type=Soup")}">Soup noodles</a></li>
          <li><a href="${r("noodles/?type=Dry")}">Dry noodles</a></li>
          ${HAS_VEG ? `<li><a href="${r("noodles/?diet=veg")}">Vegetarian</a></li>` : ""}
          <li><a href="${r("spiciest-noodles/")}">Spicy (3+)</a></li>
          <li><a href="${r("buldak/")}">Buldak</a></li>
        </ul>
      </div>
      <div>
        <h2>Explore</h2>
        <ul>
          <li><a href="${r("countries/")}">Countries</a></li>
          <li><a href="${r("pairings-and-sides/")}">Pairings and sides</a></li>
          <li><a href="${r("about/")}">About</a></li>
          <li><a href="${r("visit/")}">Visit</a></li>
          <li><a href="${r("privacy/")}">Privacy</a></li>
        </ul>
      </div>
      <div>
        <h2>Visit</h2>
        <ul>
          <li>${esc(site.streetAddress)}<br>${esc(site.suburb)} ${esc(site.state)} ${esc(site.postcode)}</li>
          <li><a href="${esc(site.mapsUrl)}" target="_blank" rel="noopener">Get directions</a></li>
          ${site.phone ? `<li><a href="tel:${esc(site.phone.replace(/\s+/g, ""))}">${esc(site.phone)}</a></li>` : ""}
          ${site.email ? `<li><a href="mailto:${esc(site.email)}">${esc(site.email)}</a></li>` : ""}
          <li>Dine in or take away</li>
        </ul>
      </div>
    </div>
    <div class="footer-big" data-reveal-letters>${logoLockup("footer-word", "MEON")}</div>
    <div class="footer-bottom">
      <span>© <span data-year>${new Date().getFullYear()}</span> MEON Noodles · ${esc(site.suburb)}, ${esc(site.city)} ${esc(site.state)}</span>
      <span>Brand names belong to their owners. Always check the packet for allergens.</span>
    </div>
  </div>
</footer>
<div class="search-overlay" id="search" role="dialog" aria-modal="true" aria-label="Search MEON">
  <div class="search-backdrop" data-search-close></div>
  <div class="search-panel">
    <div class="search-field">${icon.search}<input type="search" id="site-search" placeholder="Search noodles, flavours, countries" autocomplete="off" spellcheck="false" aria-controls="search-results" enterkeyhint="go"><button class="btn btn--line btn--sm" type="button" data-search-close>Close</button></div>
    <div class="search-empty" id="search-status" role="status" aria-live="polite" hidden></div>
    <div class="search-results" id="search-results" role="listbox" aria-label="Search results"></div>
    <div class="search-foot"><span><kbd>↑</kbd> <kbd>↓</kbd> to move, <kbd>Enter</kbd> to open</span><span>Try “Buldak”, “tom yum” or “Japan”</span></div>
  </div>
</div>
<nav class="tabbar" aria-label="Quick navigation">
  <a href="${r("noodles/")}"${cur("noodles/")}>${icon.bowl}<span>Noodles</span></a>
  <button class="tab-search" type="button" data-search-open aria-label="Search noodles">${icon.search}<span>Search</span></button>
  <a href="${r("countries/")}"${cur("countries/")}>${icon.globe}<span>Countries</span></a>
  <a href="${r("visit/")}"${cur("visit/")}>${icon.pin}<span>Visit</span></a>
</nav>
<button class="back-top" type="button" aria-label="Back to top">${mascot({ acc: "none", wave: true })}</button>
${scripts.map((s) => `<script src="${r(s)}" defer></script>`).join("\n")}
<script src="${r("assets/js/site.js")}?v=${BUILD_ID}" defer></script>
<script src="${r("assets/js/play.js")}?v=${BUILD_ID}" defer></script>
</body>
</html>
`;
}

/* ---------------- components ---------------- */
const crumbsNav = (r, items) => `<nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="${r("")}">Home</a></li>${items.map(([label, href]) => href ? `<li><a href="${r(href)}">${label}</a></li>` : `<li aria-current="page">${label}</li>`).join("")}</ol></nav>`;
// BreadcrumbList JSON-LD for a page one level below home (the same trail crumbsNav shows).
const crumbLd = (name, urlPath) => ({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` }, { "@type": "ListItem", position: 2, name, item: `${SITE_URL}/${urlPath}` }] });

// Illustrated packet for noodles without a photo yet, coloured by flavour like real packets.
const PACKET_COLOURS = [
  [/buldak|fire|hot|spicy|mala|chilli|chili|kimchi|jjambbong|sambal|tom ?yum|sour|red|pedas|angry|sriracha|geki/i, ["#e3141e", "#fff", "#ffd23f"]],
  [/black ?bean|jjajang|chapag|dan ?dan|black|pepper/i, ["#2b2523", "#fff", "#ffd23f"]],
  [/curry|kari|laksa|masala|satay|yippee|twisty/i, ["#f28c28", "#2a1300", "#7a1fa2"]],
  [/seafood|shrimp|prawn|crab|lobster|fish|tom\b|mien|pho/i, ["#1f6fd1", "#fff", "#ffb703"]],
  [/veg|veggie|vegetable|mushroom|lime|kalamansi|mansi|soon/i, ["#2f9e57", "#fff", "#ffe066"]],
  [/chicken|ayam|golden|chick/i, ["#ffc93c", "#2a1a00", "#e3141e"]],
  [/beef|braised|rib|bulgogi|semur|bo\b|brisket|soyed/i, ["#a8461b", "#fff", "#ffd166"]],
  [/miso|tonkotsu|shoyu|pork|creamy|carbonara|cheese|white|original|udon|bone/i, ["#f3e6cf", "#2b1d12", "#e3141e"]],
];
const PACKET_FALLBACK = [["#7b4fd6", "#fff", "#ffd23f"], ["#ff7aa8", "#2b0a14", "#1f6fd1"], ["#14a3a3", "#fff", "#ffd23f"]];
const hashOf = (str) => [...str].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
function packetArt(n, r) {
  const key = `${n.name} ${n.flavour || ""}`;
  const hit = PACKET_COLOURS.find(([re]) => re.test(key));
  const [bg, ink, acc] = hit ? hit[1] : PACKET_FALLBACK[hashOf(n.slug) % PACKET_FALLBACK.length];
  const tilt = ((hashOf(n.slug) % 7) - 3) * 0.8;
  const size = n.name.length > 34 ? "s" : n.name.length > 20 ? "m" : "l";
  return `<span class="pk" style="--pk-bg:${bg};--pk-ink:${ink};--pk-acc:${acc};--pk-tilt:${tilt}deg" role="img" aria-label="${esc(`${n.brand} ${n.name} packet`)}">
  <span class="pk-body">
    <span class="pk-brand">${esc(n.brand)}</span>
    <span class="pk-name pk-name--${size}">${esc(n.name)}</span>
    <svg class="pk-bowl" viewBox="0 0 120 70" aria-hidden="true"><path d="M8 26h104c0 24-23 40-52 40S8 50 8 26z" fill="#fff"/><path d="M14 26c8-8 16 6 24-2s16 6 24-2 16 6 24-2 16 6 24-2" fill="none" stroke="var(--pk-acc)" stroke-width="5" stroke-linecap="round"/><path d="M20 38h80" stroke="#e3141e" stroke-width="5"/><path d="M42 18c-4-6 4-8 0-14M60 18c-4-6 4-8 0-14M78 18c-4-6 4-8 0-14" fill="none" stroke="currentColor" stroke-opacity=".45" stroke-width="3.5" stroke-linecap="round"/></svg>
    <span class="pk-foot">${flag(n.countryCode, r, { w: 18 })}<span>${n.type ? esc(n.type) : "Instant"} noodle</span></span>
  </span>
</span>`;
}

// A noodle's photo, or its packet art when there's no photo. `alt` is "" on cards, whose link text already names the noodle.
function noodleMedia(n, r, { size = 400, eager = false, large = false, alt = n.imgAlt } = {}) {
  if (n.img) return `<img src="${r(large ? n.img : n.thumb)}" alt="${esc(alt)}" width="${size}" height="${size}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
  return packetArt(n, r);
}

// The heat as a word next to the chillies (never icons alone), in the library filter's own bands: 0, 1-2, 3-5
const spiceWord = (s) => (s === 0 ? "No heat" : s <= 2 ? "Medium" : "Hot");
const spiceLine = (n, r) => n.unrated ? `<span class="nc-spice-soon">Spice rating soon</span>` : `<span class="nc-spice">${spiceMeter(n.spice, r)}<span class="nc-spice-word">${spiceWord(n.spice)}</span></span>`;

function noodleCard(n, r) {
  const search = [n.name, n.brand, n.country, n.flavour, n.type, n.diet, n.note].filter(Boolean).join(" ");
  return `<a class="noodle-card" href="${r(n.url)}" data-search="${esc(search)}" data-name="${esc(n.name)}" data-country="${n.countryCode}" data-type="${esc(n.type || "")}" data-spice="${n.spiceKey}" data-diet="${n.dietTokens.join(" ")}" data-photo="${n.img ? 1 : 0}">
  <span class="nc-media">${noodleMedia(n, r, { alt: "" })}${n.note ? `<span class="nc-note">${esc(n.note)}</span>` : ""}</span>
  <span class="nc-meta">${flag(n.countryCode, r, { w: 16 })}<span>${esc(n.country)}${n.type ? ` · ${esc(n.type)}` : ""}</span></span>
  <h3 class="nc-name">${esc(n.name)}</h3>
  <span class="nc-foot"><span class="nc-brand">${esc(n.brand)}</span>${spiceLine(n, r)}</span>
</a>`;
}

function megaNoodles(r) {
  const quick = [
    ["noodles/", "bowl", "All noodles"], ["noodles/?type=Soup", "soup", "Soup noodles"], ["noodles/?type=Dry", "chopsticks", "Dry noodles"],
    ...(HAS_VEG ? [["noodles/?diet=veg", "leaf", "Vegetarian"]] : []), ["noodles/?spice=hot", "flame", "Spicy (3+)"],
    ["noodles/?spice=mild", "drop", "No heat"], ["noodles/?sort=photo", "camera", "With photos first"],
  ];
  return `<div class="mega" id="mega-noodles">
  <div class="mega-col"><p class="mega-h">Browse</p>${quick.map(([h, ic, t]) => `<a href="${r(h)}">${svgIcon(ic)}${t}</a>`).join("")}</div>
  <div class="mega-col"><p class="mega-h">By country</p><div class="mega-grid">${countries.map((c) => `<a href="${r(`countries/${c.slug}/`)}">${flag(c.code, r, { w: 18 })}${esc(c.name)}<small>${countFor((n) => n.country === c.name)}</small></a>`).join("")}</div></div>
  <a class="mega-feature" href="${r("")}#roulette">${mascot({ acc: "party", color: "#ff8fb0" })}<strong>Can't decide?</strong><span>Let the roulette pick for you</span></a>
</div>`;
}

// Inner-page hero: breadcrumbs, a title and lead on the left, one visual (or a peeking mascot) on the right. The title
// reveals word by word (the page's one entrance moment) unless split is false: pages people open back to back, like the
// SEO lists, show it at once (Design, 4 Nov 2026: animate by frequency).
function pageHero(r, { crumbs = [], eyebrow = "", title, lead = "", actions = "", after = "", seed = 0, aside = "", split = true }) {
  return `<section class="page-hero">
  <div class="wrap">
    ${crumbs.length ? crumbsNav(r, crumbs) : ""}
    <div class="ph-grid">
      <div class="ph-copy">
        ${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ""}
        <h1 class="page-title"${split ? " data-split" : ""}>${title}</h1>
        ${lead ? `<p class="lead">${lead}</p>` : ""}
        ${actions ? `<div class="actions">${actions}</div>` : ""}
      </div>
      <div class="ph-aside">${aside || peeker(seed)}</div>
    </div>
    ${after}
  </div>
</section>`;
}

// The hero's play/pause button: an icon while the videos play, a "Play videos" pill while they're paused. site.js swaps
// the label; a copy in the header (layout) takes over once this one scrolls away.
const heroVideoToggle = `<button class="vpause" type="button" data-video-toggle aria-pressed="false" aria-label="Pause videos"><span class="vpause-ic" aria-hidden="true"></span><span class="vpause-text">Play videos</span></button>`;

// Inner-page video hero (Preston, 29 Oct 2026: the other pages get the home's look). Full-bleed footage: two portrait
// clips side by side on desktop (two, not three, so each shows most of its frame: "zoom out"), one on phones (`phone`,
// picked without big burned-in captions so nothing runs into the title), with the breadcrumbs, title, lead and actions
// over it. Not pinned: as the page scrolls on, the footage shrinks into a rounded card and the words lift away
// (data-scene="leave", site.js). Posters only for Save-Data; the play/pause button sits inside the clip frame. The page's
// layout() needs `overlay: true`.
function videoHero(r, { crumbs = [], eyebrow = "", title, lead = "", actions = "", clips, phone, logo = false }) {
  return `<section class="vhero vhero--page" aria-labelledby="page-h" data-scene="leave">
  <div class="vhero-stage">
    <div class="vhero-media">
      ${bgVideo(r, phone, { cls: "vbg--phone", media: "(max-width: 899.98px)", eager: true })}
      <div class="vhero-cols">${clips.map((c, i) => `<div class="vcol vcol--${"abc"[i]}">${bgVideo(r, c, { media: "(min-width: 900px)", eager: true })}</div>`).join("")}</div>
      ${heroVideoToggle}
    </div>
    <div class="wrap vhero-inner">
      ${crumbs.length ? crumbsNav(r, crumbs) : ""}
      ${logo ? logoMark("vhero-logo", "MEON") : ""}
      ${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ""}
      <h1 class="vhero-title" id="page-h" data-split>${title}</h1>
      ${lead ? `<p class="vhero-sub">${lead}</p>` : ""}
      ${actions ? `<div class="actions">${actions}</div>` : ""}
    </div>
  </div>
</section>`;
}

// Closing band used on every page: one red block, big type, the crew.
function ctaBand(r, { title = "Come in hungry.", text = site.orderingNote } = {}) {
  return `<section class="cta-band" data-anim>
  <div class="wrap cta-inner">
    <div class="cta-copy">
      <p class="eyebrow">Come visit us</p>
      <h2>${title}</h2>
      <p class="lead">${esc(text)}</p>
      <div class="actions">
        <a class="btn btn--white" href="${r("noodles/")}" data-magnetic>Browse the noodle wall</a>
        <a class="btn btn--ghost-white" href="${r("visit/")}">${icon.pin} Visit us</a>
      </div>
    </div>
    <div class="cta-mascots" aria-hidden="true">${mascot({ acc: "bowl", color: "#ffc83d" })}${mascot({ acc: "chef", color: "#ff8a4c" })}${mascot({ acc: "chilli", color: "#ffffff" })}</div>
  </div>
</section>`;
}

// Reviews: stored in Supabase (table meon_reviews). Visitors post a star rating and comment; published reviews load live.
// Google reviews: the Business Profile link when it's set in data/site.json, otherwise MEON on Google Maps.
const GOOGLE_REVIEWS = site.googleBusinessUrl || site.mapsUrl;
// Asking for Google reviews (BOSS + Security, 2 Nov 2026; Google's review policy and the ACCC's guidance on fake and
// incentivised reviews): every guest is asked the same way, nothing is offered in return, and wherever we ask for a
// Google review the private route sits beside it ("Tell us privately"), never in front of it. check.mjs enforces this.
const GOOGLE_WRITE_REVIEW = site.googleReviewUrl || GOOGLE_REVIEWS;
const PRIVATE_FEEDBACK = site.privateFeedbackUrl || site.instagram;
// Consent wording version for guest reviews (ledger 299). Each review row stores it in consent_version;
// change it whenever the consent text or what the form collects changes, and update privacy/.
const REVIEW_CONSENT = "reviews-2026-10-27";
// Errors (Design, 31 Oct 2026): every rule is checked at once; a summary above the stars takes focus and links to each
// field, and each field gets its own message (hidden "Error:" prefix), aria-invalid and aria-describedby (site.js).
function reviewsBlock(r, { slug = "", title = "What people are saying.", lead = "" } = {}) {
  const cfg = site.reviews || {};
  if (!cfg.supabaseUrl || !cfg.publishableKey) return "";
  const id = `rv-${slug || "all"}`;
  const err = (name, text) => `<p class="rv-err" id="${id}-${name}-err" data-rv-err="${name}" hidden><span class="visually-hidden">Error:</span> ${text}</p>`;
  const stars = [1, 2, 3, 4, 5].map((v) => `<input type="radio" name="rating" id="${id}-${v}" value="${v}" required><label for="${id}-${v}" title="${v} star${v > 1 ? "s" : ""}">${svgIcon("star")}<span class="visually-hidden">${v} star${v > 1 ? "s" : ""}</span></label>`).reverse().join("");
  return `<section class="section reviews" id="reviews" data-reviews data-slug="${esc(slug)}" data-endpoint="${esc(cfg.supabaseUrl)}" data-key="${esc(cfg.publishableKey)}" data-table="${esc(cfg.table || "meon_reviews")}">
  <div class="wrap reviews-grid">
    <div class="reviews-head">
      <h2>${title}</h2>
      ${lead ? `<p class="lead">${lead}</p>` : ""}
      <div class="rv-summary" data-rv-summary hidden><span class="rv-avg">–</span><span class="rv-stars" aria-hidden="true"></span><span class="rv-count">No reviews yet</span></div>
      <div class="rv-google"><a class="btn btn--line btn--sm" href="${esc(GOOGLE_REVIEWS)}" target="_blank" rel="noopener">${svgIcon("star")} Read our Google reviews</a><a class="link-arrow" href="${esc(GOOGLE_WRITE_REVIEW)}" target="_blank" rel="noopener">Review us on Google</a>${PRIVATE_FEEDBACK ? `<a class="link-arrow" href="${esc(PRIVATE_FEEDBACK)}" target="_blank" rel="noopener" data-private-feedback>Tell us privately</a>` : ""}</div>
      <form class="rv-form" data-rv-form data-consent="${REVIEW_CONSENT}" novalidate>
        <div class="rv-errors" data-rv-errors tabindex="-1" aria-labelledby="${id}-errors-h" hidden><h3 class="rv-errors-h" id="${id}-errors-h"></h3><ul></ul></div>
        <fieldset class="rv-rate" id="${id}-rating" role="radiogroup" aria-labelledby="${id}-rating-l"><legend id="${id}-rating-l">Your rating</legend><div class="rv-rate-stars">${stars}</div>${err("rating", "Choose a star rating")}</fieldset>
        <div class="field"><label for="${id}-name">Your name</label><input id="${id}-name" name="name" type="text" maxlength="40" autocomplete="given-name" required>${err("name", "Enter your first name")}</div>
        <div class="field"><label for="${id}-comment">Your review</label><p class="note rv-hint" id="${id}-comment-hint">Keep it friendly.</p><textarea id="${id}-comment" name="comment" rows="4" minlength="3" maxlength="600" required aria-describedby="${id}-comment-hint" placeholder="${slug ? "How was it? Spice, flavour, pairings you added…" : "Tell us about your visit"}"></textarea>${err("comment", "Write a few words about it")}</div>
        <label class="hp" aria-hidden="true">Website<input name="website" type="text" tabindex="-1" autocomplete="off"></label>
        <div class="rv-consent">
          <label class="toggle"><input type="checkbox" name="consent" id="rv-consent-${slug || "all"}" required aria-required="true" aria-describedby="rv-consent-${slug || "all"}-detail"> Publish my first name and review on this site</label>
          ${err("consent", "Tick the box so we can publish your review")}
          <p class="note" id="rv-consent-${slug || "all"}-detail">We keep your name, stars and review, the page, whether you scanned a shelf QR code, and the time, with Supabase, our database provider, until you ask us to remove them. <a href="${r("privacy/")}">How we handle reviews</a></p>
        </div>
        <div class="rv-actions"><button class="btn btn--red" type="submit">Post review</button><a class="link-arrow" data-rv-alt href="${esc(GOOGLE_WRITE_REVIEW)}" target="_blank" rel="noopener" hidden>Post it on Google instead</a></div>
        <p class="rv-status" data-rv-status aria-live="polite" tabindex="-1"></p>
      </form>
    </div>
    <div class="rv-list" data-rv-list aria-live="polite"><div class="rv-empty">${mascot({ acc: "none", wave: true })}<strong>${slug ? "No reviews for this one yet" : "No reviews yet"}</strong><span>${slug ? "Tried it? Be the first to say how it was." : "Been in? Be the first to tell everyone."}</span></div></div>
  </div>
</section>`;
}

// Numbers count up (country pages).
const facts = (items) => `<dl class="facts">${items.map(([n, label, suffix = ""]) => `<div><dt>${label}</dt><dd>${typeof n === "number" ? `<span data-count="${n}" data-suffix="${suffix}">${n}${suffix}</span>` : esc(n)}</dd></div>`).join("")}</dl>`;

// Background clips (src/assets/video), cut from MEON's own footage by meon-work/rebuild/make_videos_v3.sh (29 Oct 2026):
// muted loops at their sources' own size with no captions or prices in frame, sped up or slowed down as part of the edit.
// Each has a .webp poster: that is all Save-Data visitors get. The video file loads only when it nears the screen (site.js).
// The promo and website tour came down on 29 Oct 2026 (Preston: "get rid of it for now").
const asset = (p) => fingerprint(`assets/${p}`);
// A 1x1 transparent GIF: an eager poster's <picture> serves it outside the video's own `media`, so a phone never
// downloads the desktop posters (or the reverse) just because they sit in a hidden box.
const BLANK_GIF = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
// `sizes` (card-sized clips only): adds the 480 px poster copy from scripts/make_thumbs.py to a srcset, so a card on a
// 1-2x screen doesn't download the 720 px poster; 3x phones still pick the original.
const bgPoster = (r, name, media, eager, sizes) => {
  const small = `video/${name}-t480.webp`;
  const set = sizes && fs.existsSync(path.join(SRC, "assets", small))
    ? ` srcset="${r(asset(small))} 480w, ${r(asset(`video/${name}.webp`))} ${webpWidth(path.join(SRC, "assets", `video/${name}.webp`))}w" sizes="${sizes}"` : "";
  const img = `<img class="vbg-poster" src="${r(asset(`video/${name}.webp`))}"${set} alt="" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
  return eager && media ? `<picture><source media="not all and ${media}" srcset="${BLANK_GIF}">${img}</picture>` : img;
};
// Smaller AV1 and HEVC copies (`<name>.av1.mp4`, `<name>.hevc.mp4`, meon-work/clips/encode_variants.py, REG-54): site.js picks one
// per device and keeps the H.264 file as the fallback every browser plays.
const bgVariants = (r, name) => ["av1", "hevc"].filter((c) => fs.existsSync(path.join(SRC, "assets", `video/${name}.${c}.mp4`)))
  .map((c) => ` data-bg-${c}="${r(asset(`video/${name}.${c}.mp4`))}"`).join("");
const bgVideo = (r, name, { cls = "", media = "", poster = true, eager = false, sizes = "" } = {}) => `<div class="vbg${cls ? " " + cls : ""}">${poster ? bgPoster(r, name, media, eager, sizes) : ""}<video class="vbg-video" muted loop playsinline preload="none" disablepictureinpicture disableremoteplayback aria-hidden="true" tabindex="-1" data-bg-src="${r(asset(`video/${name}.mp4`))}"${bgVariants(r, name)}${media ? ` data-media="${media}"` : ""}></video></div>`;
// Displayed poster widths: reel cards are clamp(230px, 21vw, 300px); step cards are about 250 px on phones and up to
// 472 px (840 px tall at 9:16) on desktop.
const REEL_SIZES = "(min-width: 1429px) 300px, (min-width: 1096px) 21vw, 230px";
const STEP_SIZES = "(min-width: 900px) 472px, 64vw";

// Photos from MEON's booth shoot (src/assets/img/shoot, made by meon-work/rebuild/make_photos.py): 800/1600/2400 px wide.
const SHOOT = {
  "tomyum-egg-prawn": { w: 3, h: 2, alt: "Wai Wai Quick Zabb Tom Yum Shrimp with a halved soft egg, crumbed prawns, chilli and spring onion", slug: "wai-wai-quick-zabb-tom-yum-shrimp" },
  "udon-tempura-close": { w: 2, h: 3, alt: "Nongshim Tempura Udon up close: crumbed prawns, a halved soft-boiled egg, a fishcake slice and spring onion", slug: "nongshim-tempura-udon" },
  "tonkotsu-nori-close": { w: 2, h: 3, alt: "Nissin Tonkotsu with nori, a soft egg and dumplings", slug: "nissin-demae-ramen-tonkotsu" },
  "tonkotsu-top": { w: 3, h: 2, alt: "A bowl of Nissin Tonkotsu from above, with nori, egg and dumplings", slug: "nissin-demae-ramen-tonkotsu" },
  "white-curry-top": { w: 3, h: 2, alt: "Ibumie Penang White Curry Mee from above, with fishballs, a poached egg, chilli paste, sliced chilli and spring onion", slug: "ibumie-penang-white-curry-mee" },
  "shin-black-top": { w: 3, h: 2, alt: "Shin Black from above with spam, a crumbed prawn, egg and spring onion", slug: "nongshim-shin-black-premium" },
  "shin-black-lift": { w: 2, h: 3, alt: "Shin Black noodles lifted out of the bowl with chopsticks", slug: "nongshim-shin-black-premium" },
};
const shootImg = (r, name, { sizes = "100vw", cls = "", eager = false, alt } = {}) => {
  const s = SHOOT[name], w = 1600, h = Math.round((1600 * s.h) / s.w);
  return `<img${cls ? ` class="${cls}"` : ""} src="${r(asset(`img/shoot/${name}-1600.webp`))}" srcset="${[800, 1600, 2400].map((x) => `${r(asset(`img/shoot/${name}-${x}.webp`))} ${x}w`).join(", ")}" sizes="${sizes}" width="${w}" height="${h}" alt="${esc(alt ?? s.alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
};

// @meonnoodles reels for the Instagram strip: 8-second muted previews (the reels' own captions, trimmed before any price),
// shown as Instagram-style cards. Clips cut from Preston's WhatsApp videos have no post link, so they open the profile.
const REELS = [
  ["DewSjLLBLqQ", "reel/DewSjLLBLqQ/", "Your bowl, your rules. Noodles from around the world, endless combinations."],
  ["DefupZzh1I7", "reel/DefupZzh1I7/", "Baddest bosses ain't in LA. Come have some noodles at MEON, Northbridge."],
  ["store-tour", "", "Store tour: the noodle wall, the cooking stations and the tables."],
  ["DedzCYDhezV", "reel/DedzCYDhezV/", "Come to MEON at Shop 8, 45 Francis Street, Northbridge."],
  ["DetKN4Bh0FW", "reel/DetKN4Bh0FW/", "How many of these have you tried?"],
  ["sign", "", "Look for the red sign on Francis Street."],
  ["DejHoDVhePt", "reel/DejHoDVhePt/", "Noodle night with the crew."],
  ["DeOXYn5hSUT", "reel/DeOXYn5hSUT/", "New cook-it-yourself noodles in Perth."],
  ["walk-in", "", "Walk in, pick a packet, cook it your way."],
].map(([file, post, cap]) => ({ file: `ig-${file}`, cap, url: post ? `${site.instagram.replace(/\/$/, "")}/${post}` : site.instagram }));

// The video wall: shop clips that aren't in the hero or the steps, plus two booth-shoot photos. On desktop the four
// columns drift at different speeds as you scroll; phones show columns 1 and 3, so those hold the portrait clips. The
// landscape shop clips and the top-down photo keep their whole frame in wide 16:9 tiles (columns 2 and 4).
const VWALL = [
  ["wall-01", "wall-02", "photo:shin-black-lift", "wall-03"],
  ["wall-04", "wall-10", "wall-05"],
  ["wall-08", "wall-09", "wall-07", "wall-11"],
  ["wall-06", "wall-12", "photo:tonkotsu-top"],
];
const WIDE_TILES = new Set(["wall-04", "wall-05", "wall-06", "photo:tonkotsu-top"]);
const vwallTile = (r, t) => `<figure class="vtile${WIDE_TILES.has(t) ? " vtile--wide" : ""}">${t.startsWith("photo:") ? shootImg(r, t.slice(6), { sizes: "(min-width: 900px) 22vw, 46vw", alt: "" }) : bgVideo(r, t)}</figure>`;

const TICKER = ["Buldak", "Tom yum", "Mi goreng", "Tonkotsu", "Jjajang", "Laksa", "Shin Black", "Pancit canton", "Kimchi", "Salted egg", "Hokkaido miso", "Chapagetti"];
const sectionHead = (eyebrow, title, extra = "", lead = "") => `<div class="section-head">
  <div>${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ""}<h2>${title}</h2>${lead ? `<p class="lead">${lead}</p>` : ""}</div>${extra}
</div>`;

const FAQ = [
  ["Where is MEON?", `MEON Noodles is an instant noodle bar in ${site.suburb}, ${site.city}, Western Australia. Tap "Get directions" on this page for the map.`],
  ["Can I order online or get delivery?", "No. Walk in, choose a packet from the noodle wall, add pairings and sides, cook it at the machine, then dine in or take it away."],
  ["How many instant noodles do you have?", `We stock ${COUNT}\u00A0instant noodles ${REGION}: South Korea, Japan, Indonesia, Vietnam, China, Malaysia, Thailand, Singapore, India, the Philippines, Taiwan and Australia.`],
  ["Do you have vegetarian noodles?", HAS_VEG
    ? `Some are vegetarian: look for the Vegetarian label (or pick Vegetarian in the noodle library's diet filter), and ask the crew if unsure. Noodles with chicken, beef or pork flavour are never vegetarian, even when the flavour is artificial. Always check the packet if you have allergies.`
    : `None are labelled vegetarian yet: a noodle only gets the Vegetarian label once we've checked its maker's ingredient list. Ask the crew, and check the packet. Noodles with chicken, beef or pork flavour are never vegetarian, even when the flavour is artificial. Always check the packet if you have allergies.`],
  ["How spicy are the noodles?", "Every noodle has a spice rating from 0 (no heat) to 5 (extreme), measured against Shin Ramyun, which is a 3. Indomie Mi Goreng is a 1 and Mama Creamy Tom Yum is a 2. You can filter the library by spice level or let the roulette pick for you."],
  ["How long do the noodles take?", `Every noodle cooks for ${COOK_TIME}. Press 1, then 2 on the cooking machine to start it. Add egg and cheese on top of the noodles in the last 30 seconds.`],
];

/* ---------------- pages ---------------- */
const pages = [];
const addPage = (urlPath, html) => { pages.push(urlPath); write(urlPath + "index.html", html); };
const countFor = (fn) => noodles.filter(fn).length;
const half = Math.ceil(withPhotos.length / 2);
const wallImgs = (list, r) => list.map((n) => `<a href="${r(n.url)}" tabindex="-1" title="${esc(`${n.brand} ${n.name}`)}"><img src="${r(n.thumb)}" alt="" width="200" height="200" loading="lazy" decoding="async"></a>`).join("");
// Home gallery right under the hero (Preston, 6 Nov 2026: lots of real noodle photos, plus drinks). Noodles: 24 shoot photos,
// one brand at a time in library order so the first rows aren't all one maker. The packet photos from free libraries
// (docs/credits.md, "Noodle photos from free libraries") stay out: this grid is MEON's own bowls.
const FREE_LIBRARY_NOODLE_PHOTOS = new Set(["indomie-soto-mie"]);
const galleryNoodles = (() => {
  const byBrand = new Map();
  for (const n of withPhotos) if (!FREE_LIBRARY_NOODLE_PHOTOS.has(n.slug)) byBrand.set(n.brand, [...(byBrand.get(n.brand) || []), n]);
  const out = [];
  for (let round = 0; out.length < 24 && [...byBrand.values()].some((l) => l.length > round); round++)
    for (const list of byBrand.values()) if (list[round] && out.length < 24) out.push(list[round]);
  return out;
})();
// Noodle strip in the home hero's first screen (Preston via BOSS, 7 Nov 2026 00:3x: "more noodles on the front"): the 12 in
// data/home-strip.json, shoot photos that are NOT among the gallery's 24 so the first screen and the gallery don't repeat.
// Each card is a link to the noodle's page with its brand and name. Desktop: a slow loop along the bottom of the hero
// (site.css .hstrip), which stops with the hero's pause button, on hover and on keyboard focus; reduced motion and phones
// get a still row that swipes. The loop's second copy is aria-hidden and inert, so each noodle is one tab stop.
const stripNoodles = (() => {
  const inGallery = new Set(galleryNoodles.map((n) => n.slug));
  return readJSON("home-strip.json").slugs.map((slug) => {
    const n = withPhotos.find((x) => x.slug === slug);
    if (!n || FREE_LIBRARY_NOODLE_PHOTOS.has(slug)) throw new Error(`data/home-strip.json: ${slug} has no MEON shoot photo`);
    if (inGallery.has(slug)) throw new Error(`data/home-strip.json: ${slug} is already in the home gallery`);
    return n;
  });
})();
// Design's spec (requests/meon/20261107-0033-design-noodle-strip-and-polish.md §A): cards 120 x 96 on desktop (104 x 78 on
// short desktop windows), 112 x 84 on phones. Each photo comes at 2x those sizes (scripts/make_thumbs.py): 224 x 168 and
// 240 x 192, as AVIF at quality 50 with WebP for browsers without AVIF. The 571 speed gate (7 Nov 2026) caught the first 4
// WebP copies (34 KB) adding 227 ms to the simulated phone LCP. So the photos also wait for the hero's poster, the page's
// LCP image: their files sit in data-srcset/data-src, and site.js fills them in once the poster has loaded, decoded and
// painted, then shows the row whole once its first 4 photos have decoded (no empty tiles). Without JS a <noscript> copy of
// each picture loads with the page. The label is "On the wall", not "tonight": the site doesn't track live stock.
const STRIP_SIZES = "(min-width: 900px) and (max-height: 800px) 104px, (min-width: 900px) 120px, 112px";
const stripFile = (r, n, px, ext) => {
  const p = `assets/${images[n.slug]}`.replace(/\.webp$/, `-t${px}.${ext}`);
  if (!fs.existsSync(path.join(SRC, p))) throw new Error(`${p} is missing: run scripts/make_thumbs.py`);
  return r(fingerprint(p));
};
const stripCards = (r, copy) => stripNoodles.map((n, i) => {
  const set = (ext) => `${stripFile(r, n, 224, ext)} 224w, ${stripFile(r, n, 240, ext)} 240w`;
  const pic = (a) => `<picture><source type="image/avif" ${a}srcset="${set("avif")}" sizes="${STRIP_SIZES}"><img ${a}src="${stripFile(r, n, 240, "webp")}" ${a}srcset="${set("webp")}" sizes="${STRIP_SIZES}" alt="" width="240" height="192"${!copy && i < 4 ? "" : ' loading="lazy"'} fetchpriority="low" decoding="async"></picture>`;
  return `<li><a class="hcard" href="${r(n.url)}">${pic("data-")}${copy ? "" : `<noscript>${pic("")}</noscript>`}<span class="hcard-brand">${esc(n.brand)}</span><span class="hcard-name">${esc(n.name)}</span></a></li>`;
}).join("");
const heroStrip = (r) => `<div class="hstrip">
        <div class="hstrip-head"><p class="hstrip-label" id="hstrip-l">On the wall</p><a class="hstrip-all" href="${r("noodles/")}">See all ${COUNT} noodles</a></div>
        <div class="hstrip-view"><div class="hstrip-track">
          <ul class="hstrip-row" aria-labelledby="hstrip-l">${stripCards(r, false)}</ul>
          <ul class="hstrip-row hstrip-row--copy" aria-hidden="true" inert>${stripCards(r, true)}</ul>
        </div></div>
      </div>`;
// Rendered tile widths for the grids in site.css (.gal-grid): noodles 2/3/4/6 columns, drinks 2/3/4, inside --wrap (1240 px).
const GAL_NOODLE_SIZES = "(min-width: 1200px) 200px, (min-width: 900px) 23vw, (min-width: 600px) 31vw, 46vw";
const GAL_DRINK_SIZES = "(min-width: 1200px) 300px, (min-width: 900px) 23vw, (min-width: 600px) 31vw, 46vw";
// The gallery's photos wait for the hero strip (Sunday 1, BOSS + Design): below the fold, they'd otherwise take the link from
// the first-screen bowls. site.js assigns data-src/data-srcset; a <noscript> twin holds the real files for no-JS.
const galImg = (src, srcset, rest) => `<img data-src="${src}" data-srcset="${srcset}" ${rest}><noscript><img src="${src}" srcset="${srcset}" ${rest}></noscript>`;
// A shared type photo still says what it shows. One product with its own pack shot is titled with that product and its size.
const drinkPhotoLine = (g) => (g.photo === "exact" ? "Photo shows this drink" : "Photo shows the drink type");
const drinkCredit = (g) => g.credit ? `<span class="gal-credit">Photo: <span class="gal-credit-links"><a href="${esc(g.source.page)}">${esc(g.credit.author)}</a>, <a href="${esc(g.credit.licenceUrl)}" rel="license">${esc(g.credit.licence)}</a></span>${g.credit.cropped ? ", cropped" : ""}</span>` : "";
// "At MEON: ..." under a drink photo. Several drinks of one brand and size read as one line ("Caffe Bene Americano, Hazelnut
// (190 ml each)"); anything else lists each drink with its size. The size never breaks between number and unit (Design, 571).
const drinkSize = (s) => esc(s).replace(/ /g, "\u00A0");
const drinkLine = (items) => {
  const words = items.map((d) => d.name.split(" "));
  let k = 0;
  while (items.length > 1 && words.every((w) => w.length > k + 1 && w[k] === words[0][k])) k++;
  if (k && items.every((d) => d.size === items[0].size)) return `${[esc(items[0].name), ...words.slice(1).map((w) => esc(w.slice(k).join(" ")))].join(", ")}${items[0].size ? ` (${drinkSize(items[0].size)} each)` : ""}`;
  return items.map((d) => `${esc(d.name)}${d.size ? ` (${drinkSize(d.size)})` : ""}`).join(", ");
};
const drinkCard = (r, g) => {
  const one = g.photo === "exact" && g.items.length === 1;
  const lines = one
    ? `<span class="gal-type">${esc(g.items[0].name)}</span>${g.items[0].size ? `<span class="gal-at">${drinkSize(g.items[0].size)}</span>` : ""}`
    : `<span class="gal-photo">${drinkPhotoLine(g)}</span><span class="gal-type">${esc(g.type)}</span><span class="gal-at">At MEON: ${drinkLine(g.items)}</span>${drinkCredit(g)}`;
  return `<li class="gal-card gal-card--drink">${galImg(r(g.small), `${r(g.small)} 320w, ${r(g.img)} 640w`, `sizes="${GAL_DRINK_SIZES}" alt="${esc(g.alt)}" width="640" height="640" loading="lazy" decoding="async"`)}${lines}</li>`;
};
const drinkGrid = (r) => `<ul class="gal-grid gal-grid--drinks">${drinkGroups.map((g) => drinkCard(r, g)).join("")}</ul>`;
const drinkTypeNote = drinkGroups.some((g) => g.photo === "type") ? `<p class="gal-note">Where a tile says “Photo shows the drink type”, the picture is the kind of drink, not the exact product we sell.</p>` : "";
const drinkNameList = (items) => items.length ? `<ul class="drink-list">${items.map((x) => `<li>${esc(x.name)}${x.size ? ` <small>${esc(x.size)}</small>` : ""}</li>`).join("")}</ul>` : "";
const homeGallery = (r) => `
<section class="gal" id="gallery" aria-labelledby="gal-h">
  <div class="wrap">
    <div class="gal-head">
      <h2 id="gal-h">Pick a noodle. Grab a drink.</h2>
      <div class="gal-switch" role="group" aria-label="Show in the gallery" hidden>
        <button class="pill" type="button" data-gal-show="noodles" aria-controls="gal-noodles" aria-pressed="true">Noodles</button>
        <button class="pill" type="button" data-gal-show="drinks" aria-controls="gal-drinks" aria-pressed="false">Drinks</button>
      </div>
    </div>
    <div class="gal-panel" id="gal-noodles" data-gal-panel="noodles">
      <h3 class="visually-hidden">Noodles</h3>
      <ul class="gal-grid">${galleryNoodles.map((n) => `<li><a class="gal-card" href="${r(n.url)}">${galImg(r(n.thumb), `${r(n.thumb)} 400w, ${r(n.img)} 900w`, `sizes="${GAL_NOODLE_SIZES}" alt="" width="400" height="400" loading="lazy" decoding="async"`)}<span class="gal-brand">${esc(n.brand)}</span><span class="gal-name">${esc(n.name)}</span></a></li>`).join("")}</ul>
      <p class="gal-more"><a class="btn btn--line" href="${r("noodles/")}">See all ${COUNT} noodles</a></p>
    </div>
    <div class="gal-panel" id="gal-drinks" data-gal-panel="drinks">
      <h3 class="visually-hidden">Drinks</h3>
      ${drinkGrid(r)}
      ${drinkTypeNote}
      <p class="gal-note">The fridge changes day to day, so ask the crew what's in.</p>
      <p class="gal-more"><a class="btn btn--line" href="${r("pairings-and-sides/")}#drinks">See the drinks list</a></p>
    </div>
  </div>
</section>`;

// ---------- Home ----------
// Video-first (Preston, 29 Oct 2026): every clip he sent. A pinned full-screen hero (three drifting columns on desktop),
// the booth-shoot bowls, the four steps as stacked full-screen video cards, a drifting video wall, then Instagram-style
// reel cards. Scroll choreography lives in site.js (one loop, --p/--q) and site.css. Same brand: the red, the mixed logo,
// Bricolage Grotesque.
// 5 different packets, one photo each: tonkotsu-top and tonkotsu-nori-close are the same bowl, so only one is here (4 Nov).
const FRESH = ["udon-tempura-close", "tomyum-egg-prawn", "tonkotsu-nori-close", "white-curry-top", "shin-black-top"];
// Rendered width of each tile (desktop: 1.15/1/1/1.15 columns, tile 2 spans two; phones: tiles 1, 2 and 5 full width).
const FRESH_SIZES = ["(min-width: 900px) 24vw, 100vw", "(min-width: 900px) 42vw, 100vw", "(min-width: 900px) 24vw, 50vw", "(min-width: 900px) 21vw, 50vw", "(min-width: 900px) 21vw, 100vw"];
// Home hero, full-bleed (Preston, 6 Nov 2026 19:3x: "make the text overlay it ... make sure the video is covering
// everything and adjustable by screen size"). The clips fill the first screen under the header at every width, with the
// words over them. Phones play the shop interior (the noodle wall in frame). Its poster is preloaded at high priority, as it's
// the LCP image, and its video plays at every width. On desktop the gate and a packet close-up stand beside it. Those posters
// are lazy, so phones never fetch them.
const HOME_HERO_CLIPS = ["wall-07", "hero-col-a", "wall-10"];
// Phones play this clip alone. The gate clip crops to a lattice and a cut sign, so the first screen is the walk into the shop, with the noodle wall in frame.
const HOME_HERO_MAIN = "wall-07";
addPage("", layout({
  urlPath: "",
  active: "",
  overlay: true,
  preload: asset(`video/${HOME_HERO_MAIN}.webp`),
  description: `MEON: cook-it-yourself instant noodle bar at ${site.streetAddress}, ${site.suburb}, ${site.city}. ${COUNT} noodles ${REGION}.`,
  body: (r) => `
<section class="vhero vhero--full" aria-labelledby="vhero-h" data-scene>
  <div class="vhero-stage">
    <div class="vhero-media">
      <div class="vhero-cols">${HOME_HERO_CLIPS.map((c) => c === HOME_HERO_MAIN
        ? `<div class="vcol vcol--main">${bgVideo(r, c, { eager: true })}</div>`
        : `<div class="vcol">${bgVideo(r, c, { media: "(min-width: 900px)" })}</div>`).join("")}</div>
      ${heroVideoToggle}
    </div>
    <div class="wrap vhero-inner">
      <h1 class="vhero-title" id="vhero-h">Your bowl, <span class="vhero-hl">your rules.</span></h1>
      <p class="vhero-sub">${esc(site.name)} is a cook-it-yourself instant noodle bar in ${esc(site.suburb)}, ${esc(site.city)}, with ${COUNT}\u00A0noodles ${REGION}.</p>
      <div class="actions">
        <a class="btn btn--red btn--lg" href="${r("noodles/")}" data-magnetic>Browse the noodle wall</a>
        <a class="btn btn--glass btn--lg" href="${esc(site.mapsUrl)}" target="_blank" rel="noopener">${icon.pin} Get directions</a>
      </div>
    </div>
    ${heroStrip(r)}
  </div>
</section>
${homeGallery(r)}

<section class="insta" id="instagram" aria-labelledby="insta-h">
  <div class="wrap insta-head">
    <div>
      <p class="eyebrow">${esc(site.instagramHandle)}</p>
      <h2 id="insta-h">Fresh on our Instagram.</h2>
      <p class="lead">Store tours, noodle hauls and late-night bowls. Follow along to see what's new on the wall.</p>
    </div>
    <div class="actions">
      <a class="btn btn--red" href="${esc(site.instagram)}" target="_blank" rel="noopener">${icon.insta} Follow ${esc(site.instagramHandle)}</a>
      ${site.tiktok ? `<a class="btn btn--line" href="${esc(site.tiktok)}" target="_blank" rel="noopener">${icon.tiktok} TikTok</a>` : ""}
    </div>
  </div>
  <div class="insta-track">
    <ul class="insta-row">${REELS.concat(REELS).map((v, i) => {
      const copy = i >= REELS.length;
      return `<li${copy ? ' aria-hidden="true"' : ""}><a class="reel" href="${esc(v.url)}" target="_blank" rel="noopener"${copy ? ' tabindex="-1"' : ""}>
        <span class="reel-top" aria-hidden="true"><span class="reel-av"><img src="${r("assets/img/logo-96.webp")}" alt="" width="32" height="32" loading="lazy" decoding="async"></span><span class="reel-user">${esc(site.instagramHandle.replace(/^@/, ""))}</span>${icon.insta}</span>
        <div class="reel-media">${bgVideo(r, v.file, { sizes: REEL_SIZES })}</div>
        <span class="reel-bottom"><span class="reel-acts" aria-hidden="true">${svgIcon("heart")}${svgIcon("chat")}${svgIcon("send")}</span><span class="reel-cap"><b aria-hidden="true">${esc(site.instagramHandle.replace(/^@/, ""))}</b> ${esc(v.cap)}</span></span>
        <span class="visually-hidden"> ${v.url === site.instagram ? "See more MEON videos on Instagram" : "Watch this reel on Instagram"}</span>
      </a></li>`;
    }).join("")}</ul>
  </div>
</section>

<section class="story" id="how" aria-labelledby="how-h">
  <div class="wrap story-head">
    <h2 id="how-h">From the wall to your bowl in 4 steps.</h2>
    <p class="lead">You choose, you cook, and our crew is here if you need a hand.</p>
  </div>
  <ol class="stack">
    <li class="scard scard--red">
      <div class="scard-media">${bgVideo(r, "step-pick", { sizes: STEP_SIZES })}</div>
      <div class="scard-copy"><span class="scard-num">01</span><h3>Pick a packet</h3><p>Browse ${COUNT}\u00A0noodles ${REGION}. Every packet has its own page here, with its flavour and how hot it is.</p><a class="btn btn--white" href="${r("noodles/")}">Browse the noodle wall</a></div>
    </li>
    <li class="scard scard--ink">
      <div class="scard-media">${bgVideo(r, "step-pairings", { sizes: STEP_SIZES })}</div>
      <div class="scard-copy"><span class="scard-num">02</span><h3>Add pairings and sides</h3><p>Beef roll, fishcake, egg, lettuce and more from the pairings and sides bar.</p><a class="btn btn--white" href="${r("pairings-and-sides/")}">See the pairings and sides</a></div>
    </li>
    <li class="scard scard--light">
      <div class="scard-media">${bgVideo(r, "step-cook", { sizes: STEP_SIZES })}</div>
      <div class="scard-copy"><span class="scard-num">03</span><h3>Cook it your way</h3><p>Press 1, then 2 on the machine to start cooking.</p><p class="scard-tip">Egg or cheese? Add it on top of the noodles in the last 30 seconds.</p></div>
    </li>
    <li class="scard scard--red">
      <div class="scard-media">${bgVideo(r, "step-enjoy", { sizes: STEP_SIZES })}</div>
      <div class="scard-copy"><span class="scard-num">04</span><h3>Enjoy your meal</h3><p>Eat in while it's hot, or take it away.</p></div>
    </li>
  </ol>
</section>

<section class="vwall" aria-labelledby="vwall-h" data-scene="through">
  <div class="vwall-cols" aria-hidden="true">${VWALL.map((col, i) => `<div class="vwall-col vwall-col--${i + 1}">${col.map((t) => vwallTile(r, t)).join("")}</div>`).join("")}</div>
  <div class="vwall-copy">
    <p class="eyebrow">MEON time</p>
    <h2 id="vwall-h">Bring your crew.</h2>
    <p class="lead">We've got a wall of ${COUNT} packets, cooking stations and tables for the whole crew.</p>
    <a class="btn btn--white btn--lg" href="${r("visit/")}">Visit us</a>
  </div>
</section>


<div class="ticker" data-hscroll aria-hidden="true">
  <div class="ticker-band ticker-band--red"><div class="wall-row" data-speed="1.4">${TICKER.concat(TICKER).map((w) => `<span>${w}</span>${svgIcon("bowl")}`).join("")}</div></div>
  <div class="ticker-band ticker-band--ink"><div class="wall-row" data-speed="-1.1">${TICKER.slice().reverse().concat(TICKER).map((w) => `<span>${w}</span>${svgIcon("flame")}`).join("")}</div></div>
</div>

<section class="fresh" id="fresh" aria-labelledby="fresh-h">
  <div class="wrap">
    <div class="fresh-head">
      <h2 id="fresh-h">Real bowls, real packets.</h2>
      <p class="lead">Real bowls of noodles from our wall, each photographed next to its packet. Pick one to see how to cook it.</p>
    </div>
    <div class="fresh-grid">
      ${FRESH.map((name, i) => {
        const n = noodles.find((x) => x.slug === SHOOT[name].slug);
        return `<a class="fresh-tile fresh-tile--${i + 1} img-reveal" href="${r(n.url)}">${shootImg(r, name, { sizes: FRESH_SIZES[i] })}<span class="fresh-tag">${esc(`${n.brand} ${n.name}`)}</span></a>`;
      }).join("")}
    </div>
  </div>
</section>

<section class="wall-sec" aria-label="On the noodle wall">
  <div class="wrap">${sectionHead("On the wall now", "Pick a packet. Any packet.", `<a class="link-arrow" href="${r("noodles/")}">See them all</a>`)}</div>
  <div class="wall" data-hscroll aria-hidden="true">
    <div class="wall-row" data-speed="1">${wallImgs(withPhotos.slice(0, half), r)}</div>
    <div class="wall-row" data-speed="-1">${wallImgs(withPhotos.slice(half), r)}</div>
  </div>
</section>

<section class="section section--soft">
  <div class="wrap">
    ${sectionHead("Worth a try", "Good places to start.", `<a class="link-arrow" href="${r("noodles/")}">All noodles</a>`)}
    <div class="card-grid">${featured.map((n) => noodleCard(n, r)).join("")}</div>
  </div>
</section>

<section class="section" id="roulette">
  <div class="wrap roulette" data-roulette data-root="${r("")}">
    <div>
      <p class="eyebrow">Can't decide?</p>
      <h2>Let the roulette choose.</h2>
      <p class="lead">Pick how hot you want it, press spin, then find the packet on the wall.</p>
      <p class="visually-hidden" aria-live="polite" data-roulette-live></p>
    </div>
    <div class="roulette-machine">
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
    ${sectionHead(`From ${stockedCountries.length}\u00A0countries`, "Every country cooks noodles differently.", `<a class="link-arrow" href="${r("countries/")}">All countries</a>`)}
    <div class="country-list">
      ${countries.map((c) => `<a class="country-row" href="${r(`countries/${c.slug}/`)}">${flag(c.code, r, { cls: "flag flag--lg", w: 44 })}<span class="cr-name">${esc(c.name)}</span><span class="cr-count">${plural(countFor((n) => n.country === c.name), "noodle")}</span>${icon.arrow}</a>`).join("")}
    </div>
  </div>
</section>

<section class="section heat" id="spice" data-heat>
  <div class="wrap split">
    <div>
      <p class="eyebrow">Heat check</p>
      <h2>How brave are you feeling?</h2>
      <p class="lead">Every noodle has a spice rating from 0 to 5. Drag the chilli to your level and we'll show you what to grab.</p>
      <label class="heat-slider"><span class="visually-hidden">Spice level</span><input type="range" min="0" max="5" step="1" value="2" data-heat-input aria-valuetext="2, Medium"></label>
      <div class="heat-scale" aria-hidden="true">${SPICE_LADDER.map(([lvl]) => `<span>${lvl}</span>`).join("")}</div>
    </div>
    <div class="heat-card">
      <div class="heat-top">
        <div class="heat-meo" data-heat-meo>${mascot({ acc: "chilli", color: "#ff5b5b" })}<span class="sweat s1"></span><span class="sweat s2"></span><span class="sweat s3"></span></div>
        <div><p class="heat-level" data-heat-level>2 · Medium</p><p class="heat-desc" data-heat-desc>${esc(SPICE_LADDER[2][2])}</p></div>
      </div>
      <ul class="heat-picks" data-heat-picks></ul>
      <a class="btn btn--red" data-heat-link href="${r("noodles/?spice=2")}" data-magnetic><span>See all level <span data-heat-n>2</span> noodles</span></a>
      <script type="application/json" id="heat-copy">${json(SPICE_LADDER)}</script>
    </div>
  </div>
</section>

<section class="section section--soft bowl-builder" id="build" data-bowl>
  <div class="wrap split split--rev">
    <div class="bb-stage">
      <div class="bb-bowl" data-bowl-stage>
        <svg class="bb-bowl-back" viewBox="0 0 400 260" aria-hidden="true"><ellipse cx="200" cy="70" rx="188" ry="52" fill="#f3d27a" stroke="#17110f" stroke-width="6"/><path d="M40 66c20-14 40 10 60-4s40 10 60-4 40 10 60-4 40 10 60-4 40 10 60-4" fill="none" stroke="#e6b54a" stroke-width="7" stroke-linecap="round"/><path d="M60 86c20-14 40 10 60-4s40 10 60-4 40 10 60-4 40 10 60-4" fill="none" stroke="#e6b54a" stroke-width="7" stroke-linecap="round"/></svg>
        <div class="bb-toppings" data-bowl-items></div>
        <svg class="bb-bowl-front" viewBox="0 0 400 260" aria-hidden="true"><path d="M12 70h376c0 104-84 182-188 182S12 174 12 70z" fill="#fff" stroke="#17110f" stroke-width="6" stroke-linejoin="round"/><path d="M40 120h320" stroke="#ec1b25" stroke-width="12"/><rect x="170" y="140" width="60" height="50" rx="4" fill="#ec1b25"/><text x="200" y="172" text-anchor="middle" font-family="sans-serif" font-size="17" font-weight="700" fill="#fff">meon</text></svg>
        <div class="bb-steam" aria-hidden="true"><i></i><i></i><i></i></div>
      </div>
      <p class="bb-count" aria-live="polite" data-bowl-count>Your bowl is empty. Add something.</p>
    </div>
    <div>
      <h2>Build your bowl with pairings and sides.</h2>
      <p class="lead">The packet is only the start. Tap a pairing to drop it in, then find it all at the pairings and sides bar.</p>
      <div class="bb-chips" role="group" aria-label="Add a pairing">${Object.entries(TOPPING_ART).map(([id, t]) => `<button class="bb-chip" type="button" data-topping="${id}" data-name="${esc(t.name)}"><span class="bb-ic">${t.svg}</span>${esc(t.name)}</button>`).join("")}</div>
      <div class="bb-actions"><button class="btn btn--line btn--sm" type="button" data-bowl-reset>Empty the bowl</button><a class="link-arrow" href="${r("pairings-and-sides/")}">See every pairing and side</a></div>
    </div>
  </div>
</section>

${reviewsBlock(r, { title: "What people are saying.", lead: "Been in? Leave a quick review. It helps other noodle lovers find us." })}

<section class="visit-band" aria-labelledby="visit-h">
  <div class="visit-band-media">${bgVideo(r, "street-front")}</div>
  <div class="wrap visit-band-inner">
    <div class="visit-band-copy">
      <p class="eyebrow">Come visit us</p>
      <h2 id="visit-h">Find us in ${esc(site.suburb)}.</h2>
      <p class="visit-band-addr">${esc(site.streetAddress)}<br>${esc(site.suburb)} ${esc(site.state)} ${esc(site.postcode)}</p>
      <p class="lead">Dine in or take it away. ${esc(HOURS_LINE)}</p>
      <div class="actions">
        <a class="btn btn--white btn--lg" href="${esc(site.mapsUrl)}" target="_blank" rel="noopener" data-magnetic>${icon.pin} Get directions</a>
      </div>
    </div>
  </div>
</section>

<section class="follow" aria-labelledby="follow-h">
  <div class="wrap follow-inner">
    <div class="follow-copy">
      <p class="eyebrow">${esc(site.instagramHandle)}</p>
      <h2 id="follow-h">Follow us.</h2>
      <p class="lead">We post our newest packets, store tours and late-night bowls. Come say hi.</p>
    </div>
    <div class="follow-links">
      <a class="follow-link" href="${esc(site.instagram)}" target="_blank" rel="noopener"><span class="follow-logo follow-logo--ig">${icon.insta}</span><span class="follow-name"><strong>Instagram</strong><small>${esc(site.instagramHandle)}</small></span>${icon.arrow}</a>
      ${site.tiktok ? `<a class="follow-link" href="${esc(site.tiktok)}" target="_blank" rel="noopener"><span class="follow-logo follow-logo--tt">${icon.tiktok}</span><span class="follow-name"><strong>TikTok</strong><small>@${esc(site.tiktok.split("@")[1] || "")}</small></span>${icon.arrow}</a>` : ""}
    </div>
  </div>
</section>
`,
}));

// ---------- Noodle library ----------
addPage("noodles/", layout({
  urlPath: "noodles/",
  title: "Noodle library",
  seoTitle: `${COUNT} Instant Noodles from ${stockedCountries.length} Countries · MEON Noodles Perth`,
  active: "noodles/",
  overlay: true,
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
  description: `Browse ${COUNT} instant noodles at MEON. Filter by country, soup or dry, spice level and diet. Every packet has its own page.`,
  body: (r) => `
${videoHero(r, { crumbs: [["Noodles"]], eyebrow: `${COUNT}\u00A0noodles ${REGION_SHORT}`, title: "The noodle wall.", lead: `Every instant noodle we stock. Search by flavour, filter by country or heat, then find it on the wall.`, clips: ["ig-DetKN4Bh0FW", "ig-DewSjLLBLqQ"], phone: "ig-DetKN4Bh0FW" })}
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
        <select class="select" id="f-spice"><option value="all">Any spice</option><option value="mild">No heat</option><option value="medium">Medium</option><option value="hot">Hot</option></select>
        <label class="visually-hidden" for="f-diet">Diet</label>
        <select class="select" id="f-diet"><option value="all">Any diet</option>${HAS_VEG ? `<option value="veg">Vegetarian</option>` : ""}<option value="chicken">Chicken</option><option value="beef">Beef</option><option value="pork">Pork</option><option value="seafood">Seafood</option></select>
      </div>
      <div class="filter-pills" aria-label="Quick country filters">
        ${countries.map((c) => `<button class="pill" type="button" data-pill="country" data-value="${c.code}" aria-pressed="false">${flag(c.code, r, { w: 16 })}${esc(c.name)}</button>`).join("")}
      </div>
    </div>
  </div>
  <div class="wrap">
    <div class="results-bar"><span data-result-count aria-live="polite">All ${COUNT} noodles</span>
      <span class="results-tools"><label class="visually-hidden" for="f-sort">Sort</label><select class="select" id="f-sort"><option value="featured">By country</option><option value="photo">Photos first</option><option value="az">A to Z</option><option value="hot">Hottest first</option><option value="mild">Mildest first</option></select>
      <button class="btn btn--line btn--sm" type="button" data-reset>Clear filters</button></span>
    </div>
    <h2 class="visually-hidden">Noodles</h2>
    <div class="card-grid card-grid--long">${noodles.map((n) => noodleCard(n, r)).join("")}</div>
    <div class="empty-state">${emptyBowl}<h2>Nothing matches yet.</h2><p class="lead">Try a different filter, or ask the crew. New packets arrive all the time.</p><button class="btn btn--red" type="button" data-reset>Clear filters</button></div>
    ${HAS_VEG ? `<p class="note">* Vegetarian means the maker's ingredient list has no meat, fish, seafood or meat flavouring. Recipes vary by batch and country: check the packet, and ask the crew if unsure.</p>` : ""}
  </div>
</div>
${ctaBand(r)}
`,
}));

// ---------- Noodle detail pages ----------
noodles.forEach((n, idx) => {
  const cook = cookSteps(n);
  const paras = describe(n);
  const tops = suggestPairings(n, pairings);
  const prev = noodles[(idx - 1 + noodles.length) % noodles.length];
  const next = noodles[(idx + 1) % noodles.length];
  const similar = noodles
    .filter((o) => o.slug !== n.slug)
    .map((o) => ({ o, s: (o.country === n.country ? 2 : 0) + (o.type === n.type ? 1 : 0) + (o.spice != null && n.spice != null && Math.abs(o.spice - n.spice) <= 1 ? 1 : 0) + (o.brand === n.brand ? 1 : 0) + (o.img ? 0.5 : 0) }))
    .sort((a, b) => b.s - a.s || a.o.slug.localeCompare(b.o.slug))
    .slice(0, 4)
    .map((x) => x.o);
  const ladder = SPICE_LADDER[n.spice];
  addPage(n.url, layout({
    urlPath: n.url,
    title: `${n.name} – ${n.brand}`,
    seoTitle: [`${n.brand} ${n.name} (${n.country}) · Instant Noodles at MEON Perth`, `${n.brand} ${n.name} (${n.country}) · MEON Perth`, `${n.brand} ${n.name} · MEON Perth`, `${n.brand} ${n.name} · MEON`, `${n.name} · MEON Perth`, `${n.name} · MEON`].find((t) => t.length <= 60) || `${n.name} · MEON`,
    active: "noodles/",
    image: n.img || "assets/img/shoot/og-meon.jpg",
    preload: n.img || "",
    description: fitDesc(`${n.brand} ${n.name} (${n.country}) at MEON ${site.suburb}.`, shortBlurb(n), [n.unrated ? [] : `Spice ${n.spice}/5.`, n.type ? `${n.type} noodle.` : []]),
    jsonld: [
      { "@context": "https://schema.org", "@type": "MenuItem", name: `${n.brand} ${n.name}`, description: `${shortBlurb(n)}${n.type ? ` ${n.type} noodle` : ""} from ${n.country}${n.weightG ? `, ${n.weightG} g packet` : ""}.`, image: n.img ? [n.img, ...n.more].map((p) => `${SITE_URL}/${p}`) : undefined, url: `${SITE_URL}/${n.url}`, suitableForDiet: n.dietTokens.includes("vegan") ? "https://schema.org/VeganDiet" : n.dietTokens.includes("veg") ? "https://schema.org/VegetarianDiet" : undefined },
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
        <figure class="noodle-photo" data-gallery-main>${noodleMedia(n, r, { size: 800, eager: true, large: true })}${n.img ? steamOverlay : ""}</figure>
        ${n.more.length ? `<div class="noodle-thumbs" role="group" aria-label="More photos of ${esc(n.name)}">${[n.img, ...n.more].map((p, i) => `<button type="button" class="noodle-thumb" data-gallery-src="${r(p)}" data-gallery-alt="${esc(i === 0 ? n.imgAlt : n.moreAlts[i - 1])}" aria-label="Photo ${i + 1} of ${n.more.length + 1}" aria-pressed="${i === 0}"><img src="${r(i === 0 ? n.thumb : n.moreSmall[i - 1])}" alt="" width="96" height="96" loading="lazy" decoding="async"></button>`).join("")}</div>` : ""}
        ${n.note ? `<p class="noodle-note">${esc(n.note)}</p>` : ""}
      </div>
      <div class="noodle-body">
        <p class="qr-banner" data-qr-banner hidden>${icon.qr}<span>Scanned from the shelf. Here's how to cook this one.</span></p>
        <p class="noodle-kicker"><a href="${r(`countries/${n.c.slug}/`)}">${flag(n.countryCode, r, { w: 18 })}${esc(n.country)}</a><span>${esc(n.brand)}</span></p>
        <h1>${esc(n.name)}</h1>
        <p class="noodle-lede">${shortBlurb(n)}</p>

        <section class="cook" aria-labelledby="cook-h">
          <h2 id="cook-h" class="visually-hidden">Cook it</h2>
          <div class="cook-machine">
            <span class="cook-label">On the machine</span>
            <span class="cook-code">1<span class="cook-then">then</span>2</span>
            <span class="cook-hint">Press 1, then 2 on the cooking machine to start.</span>
          </div>
          <div class="timer" data-timer data-seconds="${COOK_SECONDS}">
            <div class="timer-dial"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="track" cx="60" cy="60" r="54" fill="none" stroke-width="6"/><circle class="prog" cx="60" cy="60" r="54" fill="none" stroke-width="6" stroke-linecap="round"/></svg><span class="timer-readout" role="timer" aria-live="off">${Math.floor(COOK_SECONDS / 60)}:${String(COOK_SECONDS % 60).padStart(2, "0")}</span></div>
            <div class="timer-side">
              <p class="timer-length">${Math.floor(COOK_SECONDS / 60)} min ${COOK_SECONDS % 60} sec</p>
              <div class="timer-controls"><button class="btn btn--red" type="button" data-timer-start>Start timer</button><button class="btn btn--line btn--sm" type="button" data-timer-reset>Reset</button></div>
              <p class="note" data-timer-status aria-live="polite"></p>
            </div>
            <div class="timer-buddy" aria-hidden="true"><div class="meo" data-say="Noodles ready"><span class="meo-bubble">Noodles ready</span>${mascot({ acc: "bowl", color: "#ffc83d" })}</div></div>
          </div>
        </section>

        <dl class="noodle-facts">
          <div><dt>Spice</dt><dd>${n.unrated ? `Rating soon<small>Ask the crew how hot it is</small>` : `${spiceMeter(n.spice, r, { large: true })}<small>${n.spice} of 5 · ${ladder[1]}</small>`}</dd></div>
          <div><dt>Style</dt><dd>${esc(n.type || "Ask the crew")}</dd></div>
          <div><dt>Diet</dt><dd>${esc(n.diet)}${n.dietNote || /^Meat flavour/.test(n.diet) ? "*" : ""}</dd></div>
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
          <h2 id="top-h">Pairs well with</h2>
          <ul class="pairings">${tops.map((t) => `<li><a href="${r("pairings-and-sides/")}#${t.id}">${t.img ? `<img src="${r(t.small)}" alt="" width="64" height="64" loading="lazy">` : `<span class="pair-ic">${svgIcon(t.icon || "bowl")}</span>`}<span>${esc(t.name)}</span></a></li>`).join("")}</ul>
        </section>` : ""}

        <p class="note">${n.dietNote ? "* Vegetarian means the maker's ingredient list has no meat, fish, seafood or meat flavouring. Recipes vary: check the packet, and ask the crew if unsure." : /^Meat flavour/.test(n.diet) ? "* Meat flavour: the seasoning tastes of chicken, beef or pork. The flavour may be artificial, but MEON never counts these noodles as vegetarian. Check the packet for allergens and full ingredients." : "Check the packet for allergens and full ingredients, and ask the crew if unsure."}</p>
        <div class="noodle-actions">
          <button class="btn btn--line btn--sm" type="button" data-share data-url="${esc(`${SITE_URL}/${n.url}`)}" data-title="${esc(`${n.brand} ${n.name} at MEON`)}">${icon.share} Share</button>
          <button class="btn btn--line btn--sm" type="button" data-search-open>${icon.search} Search noodles</button>
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
    ${sectionHead("Keep exploring", "You might also like", `<a class="link-arrow" href="${r(`countries/${n.c.slug}/`)}">More from ${esc(n.country)}</a>`)}
    <div class="card-grid">${similar.map((o) => noodleCard(o, r)).join("")}</div>
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
  seoTitle: "Instant Noodles by Country: Korea, Japan & More · MEON Perth",
  active: "countries/",
  overlay: true,
  jsonld: [crumbLd("Countries", "countries/")],
  description: "Explore MEON's instant noodles country by country: Korea, Japan, Indonesia, Vietnam, China, Malaysia, Thailand and more, each packet with its own page.",
  body: (r) => `
${videoHero(r, { crumbs: [["Countries"]], eyebrow: `From ${stockedCountries.length}\u00A0countries`, title: "Noodles by country.", lead: "Each country has its own style of instant noodle. Choose a flag to see every packet we stock from there.", clips: ["wall-10", "ig-DefupZzh1I7"], phone: "wall-10" })}
<section class="section section--tight"><div class="wrap">
  <div class="country-list country-list--full">
    ${countries.map((c) => `<a class="country-row" href="${r(`countries/${c.slug}/`)}">${flag(c.code, r, { cls: "flag flag--lg", w: 44 })}<span class="cr-name">${esc(c.name)}<small>${esc(c.headline)}</small></span><span class="cr-count">${plural(countFor((n) => n.country === c.name), "noodle")}</span>${icon.arrow}</a>`).join("")}
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
    description: fitDesc(`${list.length} instant noodles from ${c.name === "Philippines" ? "the Philippines" : c.name} at MEON ${site.suburb}, Perth.`, c.headline, [["Every packet has its own page with cooking steps and a cook timer.", "Every packet has its own page."]]),
    body: (r) => `
${pageHero(r, { crumbs: [["Countries", "countries/"], [esc(c.name)]], eyebrow: plural(list.length, "noodle"), title: esc(c.name), lead: `<strong>${esc(c.headline)}</strong> ${esc(c.intro)}`, actions: `<a class="btn btn--red" href="${r(`noodles/?country=${c.code}`)}" data-magnetic>Filter in the library</a>`, aside: `<div class="flag-hero" data-parallax="0.06">${flag(c.code, r, { cls: "flag flag--hero", w: 360 })}</div>`,
  after: facts([[list.length, "Noodles"], [list.filter((n) => n.type === "Soup").length, "Soup"], [list.filter((n) => n.type === "Dry").length, "Dry"], [list.filter((n) => n.spiceKey >= 3).length, "Spicy (3+)"]]) })}
<section class="section section--tight"><div class="wrap">
  <h2 class="visually-hidden">Every ${esc(c.name)} noodle we stock</h2>
  <div class="card-grid">${list.map((n) => noodleCard(n, r)).join("")}</div>
</div></section>
<section class="section section--soft section--tight"><div class="wrap">
  <h2>Other countries</h2>
  <div class="flag-links">${others.map((o) => `<a href="${r(`countries/${o.slug}/`)}">${flag(o.code, r, { w: 22 })}${esc(o.name)}</a>`).join("")}</div>
</div></section>
${ctaBand(r)}
`,
  }));
}

// ---------- Spiciest noodles and Buldak (SEO, 4 Nov 2026) ----------
// Two list pages people search for ("spiciest instant noodles", "Buldak Perth"). Every number and name on them comes
// from MEON's own 0-5 spice ratings in data/noodles.json + data/catalogue.json (Shin Ramyun = 3), so the copy stays
// true as packets and ratings change. Hottest first, then A to Z.
const SHIN = noodles.find((n) => n.slug === "nongshim-shin-noodle-soup-original");
if (!SHIN || SHIN.spice !== 3) throw new Error("Spice scale: Shin Noodle Soup Original must be in the library and rated 3");
const byHeat = (a, b) => b.spiceKey - a.spiceKey || `${a.brand} ${a.name}`.localeCompare(`${b.brand} ${b.name}`);
const listLd = (name, list) => ({ "@context": "https://schema.org", "@type": "ItemList", name, numberOfItems: list.length, itemListElement: list.map((n, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}/${n.url}`, name: `${n.brand} ${n.name}` })) });
const linkRow = (r, links) => `<div class="flag-links">${links.map(([href, label]) => `<a href="${r(href)}">${esc(label)}</a>`).join("")}</div>`;
const hot = noodles.filter((n) => n.spiceKey >= 3).sort(byHeat);
const noHeat = countFor((n) => n.spiceKey === 0);
const atLevel = (l) => hot.filter((n) => n.spiceKey === l);
const HEAT_NOTES = { 5: "The top of our scale. Nothing we stock is rated hotter.", 4: "One step hotter than Shin Ramyun.", 3: "The same rating as Shin Ramyun." };
const buldak = noodles.filter((n) => n.brand === "Samyang" && /^Buldak\b/.test(n.name)).sort(byHeat);
if (buldak.length < 2) throw new Error("Buldak page: fewer than 2 Buldak noodles in the library");
// The lead says "Samyang's range from <country>" for all of them (Security SHOULD, 4 Nov 2026)
const buldakCountries = [...new Set(buldak.map((n) => n.country))];
if (buldakCountries.length !== 1) throw new Error(`Buldak page: the lead names one country, but the Buldak rows say ${buldakCountries.join(", ")}`);
const buldakSoup = buldak.filter((n) => n.type === "Soup");
const buldakMildest = buldak[buldak.length - 1];

addPage("spiciest-noodles/", layout({
  urlPath: "spiciest-noodles/",
  title: "The spiciest noodles at MEON",
  seoTitle: `The ${hot.length} Spiciest Instant Noodles at MEON Perth`,
  active: "noodles/",
  image: hot.find((n) => n.img)?.img,
  jsonld: [listLd("The spiciest instant noodles at MEON", hot), crumbLd("Spiciest noodles", "spiciest-noodles/")],
  description: fitDesc(`${hot.length} instant noodles rated 3 to 5 on MEON's spice scale, where Shin Ramyun is a 3.`, "Hottest first.", [["Every packet has its own page with cooking steps and a cook timer.", "Every packet has its own page."]]),
  body: (r) => `
${pageHero(r, { crumbs: [["Spiciest noodles"]], title: "The spiciest noodles at MEON.", split: false, lead: `Every noodle we stock has a spice rating from 0 to 5, set against <a href="${r(SHIN.url)}">Shin Ramyun</a>, which is a 3. These are the ${hot.length} rated 3 or more, hottest first.`, actions: `<a class="btn btn--red" href="${r("noodles/?spice=hot&amp;sort=hot")}" data-magnetic>Filter in the library</a>`, seed: 2,
  after: facts([5, 4, 3].map((l) => [atLevel(l).length, `Rated ${l}`])) })}
${[5, 4, 3].filter((l) => atLevel(l).length).map((l) => `<section class="section section--tight" id="rated-${l}"><div class="wrap">
  <h2>Rated ${l} out of 5</h2>
  <p class="lead pairing-note">${esc(HEAT_NOTES[l])}</p>
  <div class="card-grid">${atLevel(l).map((n) => noodleCard(n, r)).join("")}</div>
</div></section>`).join("")}
<section class="section section--soft section--tight"><div class="wrap">
  <h2>How we rate spice</h2>
  <p class="lead">Each packet gets one number from 0 to 5. Shin Ramyun is our 3, and every other noodle is rated against it. A 0 means no chilli heat: ${noHeat} of our ${COUNT} noodles are a 0.</p>
  ${linkRow(r, [["buldak/", `Every Buldak we stock (${buldak.length})`], ["noodles/?spice=mild", `Noodles with no heat (${noHeat})`], ["countries/", "Noodles by country"]])}
</div></section>
${ctaBand(r)}
`,
}));

addPage("buldak/", layout({
  urlPath: "buldak/",
  title: "Buldak at MEON",
  seoTitle: `Buldak in Perth: ${buldak.length} Flavours to Cook at MEON`,
  active: "noodles/",
  image: buldak.find((n) => n.img)?.img,
  jsonld: [listLd("Buldak noodles at MEON", buldak), crumbLd("Buldak", "buldak/")],
  description: fitDesc(`${buldak.length} Samyang Buldak noodles at MEON in ${site.suburb}, Perth.`, "From hottest to mildest on our 0 to 5 spice scale, where Shin Ramyun is a 3.", [["Every packet has its own page."]]),
  body: (r) => `
${pageHero(r, { crumbs: [["Buldak"]], title: "Every Buldak we stock.", split: false, lead: `Buldak is Samyang's range from ${esc(buldak[0].country)}. We stock ${buldak.length} of them. Here they are from hottest to mildest on our spice scale, where <a href="${r(SHIN.url)}">Shin Ramyun</a> is a 3.`, actions: `<a class="btn btn--red" href="${r("noodles/?q=Buldak&amp;sort=hot")}" data-magnetic>Filter in the library</a>`, seed: 3,
  after: facts([[buldak.length, "Flavours"], [buldak.filter((n) => n.spiceKey === 5).length, "Rated 5"], [buldak.filter((n) => n.type === "Dry").length, "Dry"], [buldakSoup.length, "Soup"]]) })}
<section class="section section--tight"><div class="wrap">
  <h2>Hottest to mildest</h2>
  <p class="lead pairing-note">The mildest is ${esc(buldakMildest.name)}, rated ${buldakMildest.spice}.${buldakSoup.length ? ` ${buldakSoup.length === 1 ? "One comes" : `${buldakSoup.length} come`} as soup: ${new Intl.ListFormat("en-AU").format(buldakSoup.map((n) => esc(n.name)))}. The rest are dry.` : ""}</p>
  <div class="card-grid">${buldak.map((n) => noodleCard(n, r)).join("")}</div>
</div></section>
<section class="section section--soft section--tight"><div class="wrap">
  <h2>Keep exploring</h2>
  ${linkRow(r, [["spiciest-noodles/", `The spiciest noodles at MEON (${hot.length})`], ...countries.filter((c) => c.name === buldak[0].country).map((c) => [`countries/${c.slug}/`, `${c.name} noodles`]), ["noodles/", "Noodle library"]])}
</div></section>
${ctaBand(r)}
`,
}));

// ---------- Pairings and sides (/pairings-and-sides/; the old /toppings/ URL redirects there, see vercel.json) ----------
// Pairings cook in the bowl with the noodles; egg and cheese go on top in the last 30 seconds; sides are ready to eat.
const PAIRING_GROUPS = {
  "Meat and seafood": "Pairings. Put them in the bowl with your noodles at the start, so they cook together.",
  "Vegetables and more": "Pairings. In at the start with your noodles.",
  "Egg and cheese": "Last 30 seconds. Crack the egg and add cheese on top of the noodles, not on the bowl, so it doesn't burn.",
  Sides: "Ready to eat, so they don't go in the machine. Have them on the side.",
};
const groups = [...new Set(pairings.map((t) => t.group))];
for (const g of groups) if (!PAIRING_GROUPS[g]) throw new Error(`data/toppings.json: unknown group "${g}"`);
const groupId = (g) => g.toLowerCase().replace(/[^a-z]+/g, "-");
// One card in the pairings grids: the square photo, or a line icon when there's none; the name; one line under it.
const toppingCredit = (t) => t.credit ? `<span class="topping-credit">Photo: <a href="${esc(t.credit.page)}">${esc(t.credit.author)}</a>, <a href="${esc(t.credit.licenceUrl)}" rel="license">${esc(t.credit.licence)}</a></span>` : "";
const itemCard = (r, t, line, iconName) => `<div class="topping"${t.id ? ` id="${t.id}"` : ""}><span class="topping-media">${t.img ? `<img src="${r(t.img)}"${t.mid ? ` srcset="${r(t.mid)} 384w, ${r(t.img)} ${t.w}w" sizes="(min-width: 1025px) 230px, (min-width: 561px) 30vw, 44vw"` : ""} alt="${esc(t.alt)}" width="300" height="300" loading="lazy">` : `<span class="topping-ic">${svgIcon(iconName)}</span>`}</span><strong>${esc(t.name)}</strong>${line ? `<span>${esc(line)}</span>` : ""}${toppingCredit(t)}</div>`;
addPage("pairings-and-sides/", layout({
  urlPath: "pairings-and-sides/",
  title: "Pairings and sides",
  seoTitle: "Noodle Pairings, Sides and Drinks · MEON Perth",
  active: "pairings-and-sides/",
  overlay: true,
  jsonld: [crumbLd("Pairings and sides", "pairings-and-sides/")],
  description: "Pairings, sides and drinks at MEON: beef roll, fishcake, egg, cheese, mushrooms and more to cook with your noodles, plus chicken wings and fried Spam.",
  body: (r) => `
${videoHero(r, { crumbs: [["Pairings and sides"]], eyebrow: `${Math.floor(pairings.length / 10) * 10}+ pairings and sides`, title: "Pairings and sides.", lead: "Pairings cook in the bowl with your noodles. Sides are ready to eat. Add as many as you like until the bowl is just how you want it.",
  clips: ["step-pairings", "ig-DeOXYn5hSUT"], phone: "step-pairings" })}
<nav class="subtabs" aria-label="On this page"><div class="wrap subtabs-row">${groups.map((g) => `<a class="subtab" href="#${groupId(g)}">${esc(g)} <small>${pairings.filter((t) => t.group === g).length}</small></a>`).join("")}<a class="subtab" href="#drinks">Drinks <small>${drinks.length}</small></a></div></nav>
${groups.map((g) => `<section class="section section--tight" id="${groupId(g)}"><div class="wrap">
  <h2>${esc(g)}</h2>
  <p class="lead pairing-note">${esc(PAIRING_GROUPS[g])}</p>
  <div class="topping-grid">${pairings.filter((t) => t.group === g).map((t) => itemCard(r, t, t.desc, t.icon || "bowl")).join("")}</div>
</div></section>`).join("")}
<section class="section section--tight" id="drinks"><div class="wrap">
  <h2>Drinks</h2>
  ${drinkGrid(r)}
  ${drinkTypeNote}
  ${drinkNameList(drinksWithoutPhoto)}
</div></section>
<section class="section section--tight"><div class="wrap"><p class="note">What's available changes day to day, so ask the crew what's fresh. Please tell us about any allergies.</p></div></section>
${ctaBand(r)}
`,
}));

// ---------- About ----------
addPage("about/", layout({
  urlPath: "about/",
  title: "About MEON",
  active: "about/",
  overlay: true,
  jsonld: [crumbLd("About", "about/")],
  description: `MEON is an instant noodle bar at ${site.suburb}, ${site.city}, with ${COUNT} noodles ${REGION} and a pairings and sides bar.`,
  body: (r) => `
${videoHero(r, { crumbs: [["About"]], title: "Get to know MEON.", lead: "We opened MEON to share the instant noodles people grow up with across Asia and beyond, and to let everyone cook them their own way.", logo: true, clips: ["ig-store-tour", "ig-DedzCYDhezV"], phone: "ig-store-tour" })}
<section class="section section--tight"><div class="wrap split">
  <div>
    <h2>What we do.</h2>
    <p class="lead">${COUNT}\u00A0instant noodles ${REGION}, in one place. Sweet or spicy, soup or dry: pick a packet, add pairings and sides, and cook it at the machine.</p>
    <p>Every packet on our wall has a page on this site with what it tastes like, how hot it is, how to cook it and what pairs well with it.</p>
    <blockquote class="pull">“Meon is a versatile instant noodle celebrating cultural diversity, inviting creativity and fun with every bowl. Enjoy it as is or customise with pairings and sides to make each meal uniquely yours.”</blockquote>
  </div>
  <div>
    <h2>Our name.</h2>
    <p class="lead">Under “meon” in our logo are letters from Japanese, Thai, Chinese and Korean. They're a nod to the noodle cultures behind every bowl we serve.</p>
    <a class="btn btn--line" href="${r("countries/")}">Meet the countries</a>
  </div>
</div></section>
<section class="section section--soft"><div class="wrap">
  <ul class="values">
    <li>${svgIcon("globe")}<h3>From ${stockedCountries.length}\u00A0countries</h3><p>Korea, Japan, Indonesia, Vietnam, China, Malaysia, Thailand, Singapore, India, the Philippines, Taiwan and Australia.</p></li>
    <li>${svgIcon("chef")}<h3>Your way</h3><p>Choose the packet, the pairings and the sides, then press 1 and 2 to cook it.</p></li>
    <li>${svgIcon("chair")}<h3>Dine in or take it away</h3><p>Walk in, choose a packet and cook it your way.</p></li>
  </ul>
</div></section>
${ctaBand(r)}
`,
}));

// ---------- Privacy (facts only; the wording goes to the attorney pack, ledger 299) ----------
addPage("privacy/", layout({
  urlPath: "privacy/",
  title: "Privacy",
  seoTitle: "Privacy · How MEON Noodles Handles Reviews and Data",
  active: "privacy/",
  jsonld: [crumbLd("Privacy", "privacy/")],
  description: "What the MEON Noodles website does with your information: guest reviews, the small notes it keeps in your browser, and the services it loads.",
  body: (r) => `
${pageHero(r, { crumbs: [["Privacy"]], title: "Privacy.", lead: "This site has no accounts, no ads and no tracking. Here is everything it does with your information.", seed: 5 })}
<section class="section section--tight"><div class="wrap split split--top">
  <div>
    <h2>Reviews.</h2>
    <p>Posting a review is optional. We only send it after you tick “Publish my first name and review on this site”.</p>
    <p>We keep the first name, star rating and words you typed, the page you posted from, whether you arrived by scanning a shelf QR code, the time, and which version of that agreement you ticked. They are stored with Supabase, our database provider, and shown on this site.</p>
    <p>To have a review removed, message us on Instagram${site.instagram ? ` at <a href="${esc(site.instagram)}" target="_blank" rel="noopener">${esc(site.instagramHandle)}</a>` : ""}${site.email ? ` or email <a href="mailto:${esc(site.email)}">${esc(site.email)}</a>` : ""} and we'll take it down.</p>
  </div>
  <div>
    <h2>On your device.</h2>
    <p>The site keeps a few small notes in your browser. They are not cookies and they never leave your device:</p>
    <ul>
      <li>which pages you've already reviewed, so the form doesn't ask twice;</li>
      <li>whether you turned the background music on;</li>
      <li>whether you paused or played the videos, until you close the tab.</li>
    </ul>
    <p>Clearing your browser's site data removes them.</p>
  </div>
</div></section>
<section class="section section--tight"><div class="wrap split split--top">
  <div>
    <h2>Services we use.</h2>
    <p>Vercel hosts the site and keeps standard server logs, which include your IP address. Everything on our pages, including the font, loads from this site. The one exception is the reviews section: when you scroll to it, your browser fetches the reviews from Supabase, which sees your IP address. Links to Google Maps and Instagram take you to those services, under their own privacy policies.</p>
  </div>
  <div>
    <h2>No tracking.</h2>
    <p>We don't use analytics, advertising or tracking cookies. If that changes, we'll update this page first, and anything that needs your agreement will ask for it.</p>
    <p class="note">Review agreement version ${REVIEW_CONSENT}. Last updated 30 October 2026.</p>
  </div>
</div></section>
${ctaBand(r)}
`,
}));

// ---------- Visit ----------
const addressLine = [site.streetAddress, `${site.suburb} ${site.state} ${site.postcode}`.trim()].filter(Boolean).join(", ");
addPage("visit/", layout({
  urlPath: "visit/",
  title: "Visit us",
  seoTitle: `Visit MEON · Instant Noodle Bar in ${site.suburb}, Perth`,
  active: "visit/",
  overlay: true,
  jsonld: [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) }, crumbLd("Visit", "visit/")],
  description: `Find MEON at ${site.streetAddress}, ${site.suburb}, ${site.city} ${site.state}. Walk in, pick a packet from the noodle wall, add pairings and sides and cook it at the machine.`,
  body: (r) => `
${videoHero(r, { crumbs: [["Visit"]], eyebrow: `${esc(site.suburb)}, ${esc(site.city)}`, title: "Visit MEON.", lead: `${esc(site.streetAddress)}, ${esc(site.suburb)}. Walk in, choose a packet and cook it your way.`, actions: `<a class="btn btn--red btn--lg" href="${esc(site.mapsUrl)}" target="_blank" rel="noopener" data-magnetic>${icon.pin} Get directions</a>${site.instagram ? `<a class="btn btn--glass btn--lg" href="${esc(site.instagram)}" target="_blank" rel="noopener">${icon.insta} ${esc(site.instagramHandle)}</a>` : ""}`, clips: ["ig-sign", "wall-12"], phone: "ig-sign" })}
<section class="section section--tight"><div class="wrap">
  <h2 class="visually-hidden">Where, when and how to reach us</h2>
  <div class="info-cols">
    <div>${svgIcon("pin")}<h3>Where</h3><p><strong>MEON Noodles</strong><br>${esc(addressLine)}<br>${esc(site.city)}, Western Australia</p><a class="link-arrow" href="${esc(site.mapsUrl)}" target="_blank" rel="noopener">Get directions</a></div>
    <div>${svgIcon("clock")}<h3>When</h3>${site.hours.length ? `<table class="hours"><tbody>${site.hours.map((h) => `<tr><td>${esc(h.days)}</td><td>${esc(h.time)}</td></tr>`).join("")}</tbody></table>` : ""}${site.instagram ? `<a class="${site.hours.length ? "link-arrow" : "btn btn--line btn--sm"}" href="${esc(site.instagram)}" target="_blank" rel="noopener" data-hours-link>${site.hours.length ? "Latest hours on Instagram" : `${icon.insta} Check our hours on Instagram`}</a>` : site.hours.length ? "" : `<p>${esc(HOURS_NOTE)}</p>`}</div>
    <div>${svgIcon("chat")}<h3>Contact</h3><p>Questions, feedback, or a noodle you'd like us to stock? We'd like to hear it.</p>${site.email ? `<p><a href="mailto:${esc(site.email)}">${esc(site.email)}</a></p>` : ""}${site.phone ? `<p><a href="tel:${esc(site.phone.replace(/\s+/g, ""))}">${esc(site.phone)}</a></p>` : ""}${site.instagram ? `<a class="link-arrow" href="${esc(site.instagram)}" target="_blank" rel="noopener">Message us on Instagram</a>` : ""}</div>
  </div>
</div></section>
<section class="section section--soft"><div class="wrap split">
  <div>
    <h2>Good to know.</h2>
    <ul class="perk-list">
      <li>${svgIcon("chair")}<span><strong>Dine in or take it away.</strong>Order in person at the noodle wall. Choosing the packet is half the fun.</span></li>
      <li>${svgIcon("clock")}<span><strong>Press 1, then 2.</strong>Every noodle cooks for ${COOK_TIME} on the machine. Add egg and cheese on top in the last 30 seconds.</span></li>
      <li>${svgIcon("alert")}<span><strong>Allergies?</strong>Check the packet and tell the crew. We'll help you choose.</span></li>
    </ul>
  </div>
  <div class="duo">
    <figure class="img-reveal" data-parallax="-0.04">${shootImg(r, "shin-black-lift", { sizes: "(min-width: 900px) 24vw, 50vw" })}</figure>
    <figure class="img-reveal" data-parallax="0.06">${shootImg(r, "tomyum-egg-prawn", { sizes: "(min-width: 900px) 24vw, 50vw" })}</figure>
  </div>
</div></section>
${PRIVATE_FEEDBACK ? `<section class="section section--tight" aria-labelledby="feedback-h"><div class="wrap feedback">
  <div><p class="eyebrow">Been in?</p><h2 id="feedback-h">How was it?</h2><p class="lead">Good or bad, we'd like to hear it. Leave a Google review for everyone to read, or tell us privately on Instagram.</p></div>
  <div class="actions feedback-actions">
    <a class="btn btn--line btn--lg" href="${esc(GOOGLE_WRITE_REVIEW)}" target="_blank" rel="noopener">${svgIcon("star")} Review us on Google</a>
    <a class="btn btn--line btn--lg" href="${esc(PRIVATE_FEEDBACK)}" target="_blank" rel="noopener" data-private-feedback>${icon.insta} Tell us privately</a>
  </div>
</div></section>` : ""}
<section class="section"><div class="wrap split split--top">
  <div><h2>Frequently asked questions.</h2></div>
  <div class="faq">${FAQ.map(([q, a]) => `<details><summary>${esc(q)}${icon.chevron}</summary><p>${esc(a)}</p></details>`).join("")}</div>
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
];
for (const item of [...noodles.map((n) => ({ slug: n.slug, url: n.qrUrl })), ...extraQR]) {
  write(`assets/qr/${item.slug}.svg`, await QRCode.toString(item.url, { ...qrOpts, type: "svg" }));
  if (process.env.QR_PNG !== "0") await QRCode.toFile(path.join(OUT, "assets", "qr", `${item.slug}.png`), item.url, { ...qrOpts, width: 1024 });
}
const csvRow = (vals) => vals.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",");
write("assets/qr/qr-codes.csv", csvRow(["slug", "name", "brand", "country", "url", "svg", "png"]) + "\n" + noodles.map((n) => csvRow([n.slug, n.name, n.brand, n.country, n.qrUrl, `${SITE_URL}/assets/qr/${n.slug}.svg`, `${SITE_URL}/assets/qr/${n.slug}.png`])).join("\n") + "\n");

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
    ${site.googleReviewUrl ? `<a class="btn btn--line btn--sm" href="${r("qr/review-card/")}">${svgIcon("star")} Review cards</a>` : ""}
    <label class="search" style="max-width:340px"><span class="visually-hidden">Filter QR codes</span>${icon.search}<input type="search" placeholder="Filter…" data-qr-filter></label>
  </div>
  <h2 class="visually-hidden">Codes</h2>
  <div class="qr-sheet">
    ${[...extraQR.map((x) => ({ slug: x.slug, name: x.name, brand: "MEON", cc: "", url: x.url })), ...noodles.map((n) => ({ slug: n.slug, name: n.name, brand: n.brand, cc: n.countryCode, url: n.qrUrl }))]
      .map((q) => `<div class="qr-card"><span class="qr-brand">${q.cc ? flag(q.cc, r, { w: 16 }) : ""}${esc(q.brand)}</span><h3>${esc(q.name)}</h3><img src="${r(`assets/qr/${q.slug}.svg`)}" alt="QR code for ${esc(q.name)}" width="160" height="160" loading="lazy"><div class="qr-scan">Scan for info + cook timer</div><div class="qr-url">${esc(q.url)}</div><div class="no-print" style="margin-top:8px;display:flex;gap:6px;justify-content:center"><a class="chip" href="${r(`assets/qr/${q.slug}.svg`)}" download>SVG</a>${process.env.QR_PNG !== "0" ? `<a class="chip" href="${r(`assets/qr/${q.slug}.png`)}" download>PNG</a>` : ""}</div></div>`)
      .join("")}
  </div>
</div></section>
`,
}));

// ---------- Review cards (table or receipt; staff only, not in the sitemap) ----------
// Four A6 cards per A4 page. The QR opens Google's "write a review" box. Every card asks every guest the same way and
// shows the private route next to it; nothing is offered in return (see the note above GOOGLE_WRITE_REVIEW).
if (site.googleReviewUrl) {
  write("assets/qr/google-review.svg", await QRCode.toString(site.googleReviewUrl, { ...qrOpts, type: "svg" }));
  const card = (r) => `<div class="review-card">
      <p class="rc-eyebrow">Meon · ${esc(site.suburb)}</p>
      <h3>How was your bowl?</h3>
      <p class="rc-ask">Tell everyone on Google. Good or bad, every review helps other people choose.</p>
      <img src="${r("assets/qr/google-review.svg")}" alt="QR code: review us on Google" width="150" height="150">
      <p class="rc-scan">Scan to review us on Google</p>
      <p class="rc-private">Something not right? Tell the crew now, or message us privately on Instagram, ${esc(site.instagramHandle)}.</p>
    </div>`;
  addPage("qr/review-card/", layout({
    urlPath: "qr/review-card/",
    title: "Review cards",
    noindex: true,
    description: "Printable table and receipt cards asking every guest for a Google review, with the private route beside it.",
    body: (r) => `
<div class="no-print">${pageHero(r, { crumbs: [["Shelf QR codes", "qr/"], ["Review cards"]], eyebrow: "Staff · print on A4", title: "Review cards.", seed: 8 })}</div>
<section class="section section--tight"><div class="wrap">
  <div class="no-print">
    <p class="lead">Four cards per A4 page, for tables or to hand over with the bowl. The code opens Google's review box for us.</p>
    <ul class="note-list">
      <li>Ask every guest the same way, whether they look happy or not.</li>
      <li>Never give anything in return: no discounts, free items or prize draws. And never ask staff, family or friends to post one.</li>
      <li>If someone is unhappy, help them on the spot. Offer them the card like everyone else, and never ask them to wait, change or skip a review.</li>
    </ul>
    <div class="qr-tools"><button class="btn btn--red btn--sm" type="button" data-print>${icon.print} Print cards</button><a class="btn btn--line btn--sm" href="${r("assets/qr/google-review.svg")}" download>${icon.download} QR code (SVG)</a></div>
  </div>
  <h2 class="visually-hidden">Cards</h2>
  <div class="review-cards">${[1, 2, 3, 4].map(() => card(r)).join("")}</div>
</div></section>
`,
  }));
}

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
    <form class="qrgen-form">
      <div class="field"><label for="qg-preset">Start from</label>
        <select id="qg-preset">
          <option value="">Custom link or text</option>
          <optgroup label="Pages"><option value="/">Home</option><option value="/noodles/">Noodle library</option><option value="/pairings-and-sides/">Pairings and sides</option><option value="/visit/">Visit us</option></optgroup>
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
  <h1>Page not found</h1>
  <p class="lead">If you typed the address, check the spelling. The noodle may have a new page.</p>
  <div class="lost-suggest" data-lost-suggest hidden><h2>Did you mean</h2><ul></ul></div>
  <p class="actions"><a class="btn btn--red" href="/noodles/">Browse the noodle wall</a> <button class="btn btn--line" type="button" data-search-open>Search noodles</button></p>
</div></section>
`,
}).replace(/(href|src)="\.\/"/g, '$1="/"').replace(/(href|src)="\.\/([^"]*)"/g, '$1="/$2"').replace(/data-root="\.\/"/, 'data-root="/"'));

/* ---------------- static files ---------------- */
copyDir(path.join(SRC, "assets"), path.join(OUT, "assets"));
fs.mkdirSync(path.join(OUT, "assets", "vendor"), { recursive: true });
fs.copyFileSync(require.resolve("qrcode-generator/qrcode.js"), path.join(OUT, "assets", "vendor", "qrcode.js"));
fs.mkdirSync(path.join(OUT, "assets", "img", "flags"), { recursive: true });
for (const c of countries) fs.copyFileSync(path.join(ROOT, "node_modules", "flag-icons", "flags", "4x3", `${c.code}.svg`), path.join(OUT, "assets", "img", "flags", `${c.code}.svg`));
fs.copyFileSync(path.join(ROOT, "node_modules", "flag-icons", "LICENSE"), path.join(OUT, "assets", "img", "flags", "LICENSE.txt"));
write("assets/img/icons.svg", iconSprite());

// Search index used by the site-wide search overlay.
const searchIndex = [
  ...noodles.map((n) => ({ g: "Noodles", t: n.name, s: `${n.brand} · ${n.country} · ${n.type || "?"} · ${n.unrated ? "spice soon" : "spice " + n.spice + "/5"}`, u: n.url, i: n.thumb, f: n.countryCode, k: [n.flavour, n.diet, n.note, n.dietTokens.join(" ")].filter(Boolean).join(" ") })),
  ...countries.map((c) => ({ g: "Countries", t: c.name, s: `${countFor((n) => n.country === c.name)} noodles · ${c.headline}`, u: `countries/${c.slug}/`, f: c.code, k: "country" })),
  ...pairings.map((t) => ({ g: "Pairings and sides", t: t.name, s: t.desc, u: `pairings-and-sides/#${t.id}`, i: t.small || undefined, ic: t.img ? undefined : t.icon, k: `pairing side topping ${t.group}` })),
  ...[
    ["Noodle library", "Browse and filter all noodles", "noodles/", "bowl"],
    ...(HAS_VEG ? [["Vegetarian noodles", "Filter: vegetarian", "noodles/?diet=veg", "leaf"]] : []),
    ["Spicy noodles (3+)", "Filter: hot", "noodles/?spice=hot", "flame"],
    ["Spiciest noodles", `${hot.length} rated 3 to 5, hottest first`, "spiciest-noodles/", "flame"],
    ["Buldak", `${buldak.length} Samyang Buldak flavours`, "buldak/", "flame"],
    ["Dry noodles", "Filter: dry, mix-and-eat", "noodles/?type=Dry", "chopsticks"],
    ["Soup noodles", "Filter: soup", "noodles/?type=Soup", "soup"],
    ["Visit us", `${site.suburb}, ${site.city} · dine in or take away`, "visit/", "pin"],
    ["About MEON", "Our story", "about/", "heart"],
  ].map(([t, s, u, ic]) => ({ g: "Pages", t, s, u, ic, k: "page" })),
];
write("search-index.json", JSON.stringify(searchIndex));
write("robots.txt", `User-agent: *\nAllow: /\nDisallow: /qr/\nDisallow: /qr-generator/\nSitemap: ${SITE_URL}/sitemap.xml\n`);
// IndexNow (Bing, Yandex, Seznam, Naver; SEO 2 Nov 2026): the key file proves the pings in scripts/indexnow.mjs come from us.
if (site.indexNow) write(`${indexNowKey(SITE_URL)}.txt`, indexNowKey(SITE_URL));
const pageImages = new Map([["", ["assets/img/shoot/og-meon.jpg", ...FRESH.map((f) => `assets/img/shoot/${f}-1600.webp`)]], ...noodles.filter((n) => n.img).map((n) => [n.url, [n.img, ...n.more]])]);
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${pages.filter((p) => !p.startsWith("qr")).map((p) => `  <url><loc>${SITE_URL}/${p}</loc><lastmod>${BUILD_DATE}</lastmod>${(pageImages.get(p) || []).map((im) => `<image:image><image:loc>${SITE_URL}/${im}</image:loc></image:image>`).join("")}</url>`).join("\n")}\n</urlset>\n`);
write("llms.txt", `# MEON Noodles\n\n> Cook-it-yourself instant noodle bar at ${site.streetAddress}, ${site.suburb}, ${site.city}, Western Australia. ${COUNT} instant noodles ${REGION}, a pairings and sides bar and self-cook machines. Order in person, then dine in or take it away. Every noodle cooks for ${COOK_TIME}: press 1, then 2 on the machine. Spice is rated 0-5 against Shin Ramyun, which is a 3.\n\n## Key pages\n- [Noodle library](${SITE_URL}/noodles/): every noodle with country, spice level (0-5) and diet\n- [Spiciest noodles](${SITE_URL}/spiciest-noodles/): the ${hot.length} noodles rated 3 to 5, hottest first\n- [Buldak](${SITE_URL}/buldak/): all ${buldak.length} Samyang Buldak flavours we stock, hottest to mildest\n- [Countries](${SITE_URL}/countries/)\n- [Pairings and sides](${SITE_URL}/pairings-and-sides/): pairings to cook with your noodles, ready-to-eat sides and drinks\n- [Visit](${SITE_URL}/visit/): location and FAQ\n\n## Noodles\n${noodles.map((n) => `- [${n.brand} ${n.name}](${SITE_URL}/${n.url}): ${n.country}, ${n.type || "noodle"}, spice ${n.unrated ? "unrated" : n.spice + "/5"}`).join("\n")}\n`);
write("site.webmanifest", JSON.stringify({ name: "MEON Noodles", short_name: "MEON", start_url: "/", display: "standalone", background_color: "#ffffff", theme_color: "#ec1b25", icons: [{ src: "/assets/img/logo-192.png", sizes: "192x192", type: "image/png" }, { src: "/assets/img/logo-512.png", sizes: "512x512", type: "image/png" }] }, null, 2));
write("noodles.json", JSON.stringify(noodles.map((n) => ({ slug: n.slug, name: n.name, brand: n.brand, country: n.country, flavour: n.flavour, type: n.type, spice: n.unrated ? null : n.spice, diet: n.diet, weightG: n.weightG, funNote: n.note, url: `${SITE_URL}/${n.url}`, qr: n.qrUrl, image: n.img ? `${SITE_URL}/${n.img}` : null })), null, 1));

console.log(`Built ${pages.length + 1} pages → ${path.relative(ROOT, OUT)}/  (${noodles.length} noodles, ${withPhotos.length} with photos, QR base ${SITE_URL})`);
