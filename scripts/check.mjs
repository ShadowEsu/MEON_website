#!/usr/bin/env node
// Validates the built site: every internal href/src resolves to a file, every page has a title,
// description, single <h1>, alt text on images, and no duplicate ids. Exit code 1 on any problem.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "site");
if (!fs.existsSync(OUT)) { console.error("Run `npm run build` first."); process.exit(1); }
const files = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p) : files.push(p); } })(OUT);
const htmlFiles = files.filter((f) => f.endsWith(".html"));
const problems = [];
const exists = (p) => fs.existsSync(p) && (fs.statSync(p).isFile() || fs.existsSync(path.join(p, "index.html")));

for (const file of htmlFiles) {
  const rel = path.relative(OUT, file);
  const html = fs.readFileSync(file, "utf8");
  const is404 = rel === "404.html";
  if (!/<title>[^<]{5,}<\/title>/.test(html)) problems.push(`${rel}: missing <title>`);
  if (!/<meta name="description" content="[^"]{30,}"/.test(html)) problems.push(`${rel}: missing/short meta description`);
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) problems.push(`${rel}: ${h1} <h1> elements`);
  for (const m of html.matchAll(/<img\b[^>]*>/g)) if (!/\salt="/.test(m[0])) problems.push(`${rel}: <img> without alt: ${m[0].slice(0, 80)}`);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dup = ids.filter((v, i) => ids.indexOf(v) !== i);
  if (dup.length) problems.push(`${rel}: duplicate ids ${[...new Set(dup)].join(", ")}`);
  for (const m of html.matchAll(/\s(?:href|src|poster)="([^"]+)"/g)) {
    let u = m[1];
    if (/^(https?:|mailto:|tel:|data:|#)/.test(u)) continue;
    u = u.split("#")[0].split("?")[0];
    if (!u) continue;
    const target = is404 || u.startsWith("/") ? path.join(OUT, u) : path.resolve(path.dirname(file), u);
    if (!exists(target)) problems.push(`${rel}: broken link ${m[1]}`);
  }
  for (const m of html.matchAll(/href="#([^"]+)"/g)) if (!ids.includes(m[1])) problems.push(`${rel}: anchor #${m[1]} not found`);
}
// Cross-page anchors like pairings-and-sides/#egg
const pairingsHtml = fs.readFileSync(path.join(OUT, "pairings-and-sides", "index.html"), "utf8");
for (const file of htmlFiles) {
  for (const m of fs.readFileSync(file, "utf8").matchAll(/href="[^"]*pairings-and-sides\/#([^"]+)"/g)) {
    if (!pairingsHtml.includes(`id="${m[1]}"`)) problems.push(`${path.relative(OUT, file)}: pairings anchor #${m[1]} missing`);
  }
}
// Content-Security-Policy (vercel.json): every inline script must be allowed by its sha256 hash,
// and inline event handlers (onclick="…") are not allowed at all.
const csp = JSON.parse(fs.readFileSync(path.join(OUT, "..", "vercel.json"), "utf8")).headers
  .flatMap((h) => h.headers).find((h) => h.key === "Content-Security-Policy")?.value || "";
if (!csp) problems.push("vercel.json: no Content-Security-Policy header");
const SITE_URL = (process.env.SITE_URL || JSON.parse(fs.readFileSync(path.join(OUT, "..", "data", "site.json"), "utf8")).siteUrl).replace(/\/+$/, "");
for (const file of htmlFiles) {
  const rel = path.relative(OUT, file);
  const html = fs.readFileSync(file, "utf8");
  for (const m of html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
    const attrs = m[1] || "";
    if (/\ssrc=/.test(attrs) || /\stype="application\/(?:ld\+)?json"/.test(attrs)) continue;
    const hash = `'sha256-${crypto.createHash("sha256").update(m[2]).digest("base64")}'`;
    if (!csp.includes(hash)) problems.push(`${rel}: inline script not allowed by the CSP; add ${hash} to script-src in vercel.json`);
  }
  for (const m of html.matchAll(/<[a-z][^>]*\son[a-z]+="/g)) problems.push(`${rel}: inline event handler (blocked by the CSP): ${m[0].slice(0, 80)}`);
  // Privacy (ledger 299): nothing loads from another host before the visitor does anything, and every
  // page links the privacy page. Plain links (<a href>) to other sites are fine; so are this site's own
  // absolute URLs (canonical, alternate).
  for (const m of html.matchAll(/<(?:link|script|img|source|video|audio|iframe)\b[^>]*\s(?:href|src|srcset|poster)="(https?:\/\/[^"]+)"/g)) {
    if (!m[1].startsWith(SITE_URL)) problems.push(`${rel}: loads from another host before consent: ${m[1].slice(0, 80)}`);
  }
  if (!/href="[^"]*privacy\/"/.test(html)) problems.push(`${rel}: no link to the privacy page`);
  // Preston, 28 Oct 2026: no prices on the site (they change), and the logo is always the full mixed logo
  // ("meon" plus its four glyphs), never the word alone.
  const text = html.replace(/<(script|style)\b[\s\S]*?<\/\1>/g, "").replace(/<[^>]+>/g, " ");
  const price = text.match(/\$\s?\d[\d.,]*/);
  if (price) problems.push(`${rel}: shows a price (${price[0]}); prices stay off the site`);
  const mark = html.match(/<a class="logo"[^>]*>([\s\S]*?)<\/a>/);
  if (!mark || (mark[1].match(/class="lw"/g) || []).length !== 8) problems.push(`${rel}: header logo is not the full mixed logo (meon + 4 glyphs)`);
}
for (const name of ["llms.txt", "noodles.json", "search-index.json"]) {
  const price = fs.readFileSync(path.join(OUT, name), "utf8").match(/\$\s?\d[\d.,]*|"price"\s*:/);
  if (price) problems.push(`${name}: has a price (${price[0]}); prices stay off the site`);
}
// Packet badges from the owner's notes (Security MUST-M1, 2 Nov 2026): a rank or award claim has to be true of that packet
// and sourced. These were not: "India's favourite" (brand-level, on 4 Maggi packets), "Crowd favourite" (2nd/3rd most
// popular), "A lighter pick" (unsourced health claim), an unattributed "No.1 ramen in the world" or "Top 10 noodle 2021",
// "Vietnam's favourite", "Thailand's top product 2014", "Top rated in Malaysia", "Award winner", and "Top seller" (until
// the owner confirms it means MEON's sales).
const RANK_BADGE = /(?:India|Vietnam|Thailand)(?:'|&#39;|&rsquo;|’)s (?:favourite|top product)|Crowd favourite|A lighter pick|No\.\s?1 ramen in the world|Top 10 noodle 2021|Top rated in Malaysia|Award winner|Top seller/i;
for (const f of [...htmlFiles, ...["llms.txt", "noodles.json", "search-index.json"].map((n) => path.join(OUT, n))]) {
  const hit = fs.readFileSync(f, "utf8").match(RANK_BADGE);
  if (hit) problems.push(`${path.relative(OUT, f)}: shows the unsourced packet claim "${hit[0]}"`);
}
// Owner's ruling (2 Nov 2026): a noodle with chicken, beef or pork flavour is never vegetarian, even when the flavour is
// artificial, and its diet is never "Ask the crew" either. A packet whose name or flavour names a meat must say Meat or
// Meat flavour (or Seafood), and Meat flavour noodles never show the Vegetarian label, filter tag or schema diet.
const MEAT_WORD = /\b(?:chicken|beef|pork|ayam|babi|daging|bulgogi|rendang|tonkotsu|bacon|ham|duck|lamb|mutton|gomtang|sarigomtang)\b/i;
for (const n of JSON.parse(fs.readFileSync(path.join(OUT, "noodles.json"), "utf8"))) {
  if (MEAT_WORD.test(`${n.name} ${n.flavour || ""}`) && !/^(Meat|Seafood)/.test(n.diet || "")) problems.push(`noodles/${n.slug}/: ${n.name} has a meat flavour but its diet says "${n.diet}"; meat-flavour noodles are never vegetarian (owner, 2 Nov 2026)`);
  if (!/^Meat flavour/.test(n.diet || "")) continue;
  const page = fs.readFileSync(path.join(OUT, "noodles", n.slug, "index.html"), "utf8");
  const dd = (page.match(/<dt>Diet<\/dt><dd>([\s\S]*?)<\/dd>/) || ["", ""])[1];
  if (/vegetarian/i.test(dd) || /VegetarianDiet|VeganDiet/.test(page)) problems.push(`noodles/${n.slug}/: Meat flavour noodle shown as vegetarian`);
  for (const f of [path.join(OUT, "noodles", "index.html"), path.join(OUT, "index.html")]) {
    const card = fs.readFileSync(f, "utf8").match(new RegExp(`<a class="noodle-card[^>]*href="[^"]*noodles/${n.slug}/"[^>]*>`));
    if (card && /data-diet="[^"]*\bveg\b/.test(card[0])) problems.push(`${path.relative(OUT, f)}: ${n.slug} card is tagged vegetarian`);
  }
}
// Vegetarian only with the maker's word for it (BOSS + Security, 2 Nov 2026): a guest reads "Vegetarian" as a promise, and
// the owner's spreadsheet alone isn't enough to make it. In data/, a diet that says Vegetarian or Vegan needs
// dietSource: { "url": "https://…" (the maker's ingredient list for this packet), "checked": "YYYY-MM-DD" }, and no built page
// may label, tag, describe or mark up as vegetarian a noodle without one: not its Diet row, library card tag, schema diet,
// name, flavour, blurb or search keywords ("vegan", "vegetarian", "plant-based", "meat-free"). Unsourced diets say "Ask the
// crew", which is always true; flavours say what they taste of ("vegetable").
const DIET_WORD = /\bvegan\b|vegetarian|plant[- ]based|meat[- ]?free|meatless/i;
const DIET_OK = /MEON never counts these noodles as vegetarian|\* Vegetarian means the maker's ingredient list has no meat, fish, seafood or meat flavouring/g;
const DATA = path.join(OUT, "..", "data");
const catalogueData = JSON.parse(fs.readFileSync(path.join(DATA, "catalogue.json"), "utf8"));
const vegSourced = new Set();
for (const n of [...JSON.parse(fs.readFileSync(path.join(DATA, "noodles.json"), "utf8")), ...catalogueData.extraNoodles].map((x) => ({ ...x, ...catalogueData.noodles[x.slug] }))) {
  const sourced = /^https:\/\/\S+$/.test(n.dietSource?.url || "") && /^\d{4}-\d{2}-\d{2}$/.test(n.dietSource?.checked || "");
  if (sourced && /vegetarian|vegan/i.test(n.diet || "")) { vegSourced.add(n.slug); continue; }
  if (/vegetarian|vegan/i.test(n.diet || "")) problems.push(`data: ${n.slug} says "${n.diet}" without dietSource {url, checked} (the maker's ingredient list); say "Ask the crew" until it has one`);
  for (const k of ["name", "flavour", "funNote"]) if (DIET_WORD.test(n[k] || "")) problems.push(`data: ${n.slug} ${k} "${n[k]}" makes a diet claim without dietSource; describe the taste instead`);
}
const libraryHtml = fs.readFileSync(path.join(OUT, "noodles", "index.html"), "utf8");
const searchIndex = JSON.parse(fs.readFileSync(path.join(OUT, "search-index.json"), "utf8"));
for (const n of JSON.parse(fs.readFileSync(path.join(OUT, "noodles.json"), "utf8"))) {
  if (vegSourced.has(n.slug)) continue;
  const page = fs.readFileSync(path.join(OUT, "noodles", n.slug, "index.html"), "utf8");
  const dd = (page.match(/<dt>Diet<\/dt><dd>([\s\S]*?)<\/dd>/) || ["", ""])[1];
  if (/vegetarian|vegan/i.test(dd) || /VegetarianDiet|VeganDiet/.test(page)) problems.push(`noodles/${n.slug}/: shown as vegetarian without a recorded maker source`);
  // What the page says about this noodle: title, meta description, JSON-LD, and the main content without other noodles' cards
  const main = (page.match(/<main\b[\s\S]*?<\/main>/) || [""])[0].replace(/<a class="noodle-card[\s\S]*?<\/a>/g, " ");
  const said = [
    (page.match(/<title>([\s\S]*?)<\/title>/) || ["", ""])[1],
    (page.match(/<meta name="description" content="([^"]*)"/) || ["", ""])[1],
    ...[...page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]),
    ...[...main.matchAll(/\s(?:alt|aria-label|title)="([^"]*)"/g)].map((m) => m[1]),
    main.replace(/<(script|style)\b[\s\S]*?<\/\1>/g, " ").replace(/<[^>]+>/g, " "),
  ].join(" ").replace(/noodles\/[a-z0-9-]+\//g, " ").replace(/\s+/g, " ").replace(DIET_OK, " "); // page addresses (slugs) aren't claims
  const word = said.match(DIET_WORD);
  if (word) problems.push(`noodles/${n.slug}/: says "${word[0]}" without a recorded maker source`);
  const card = libraryHtml.match(new RegExp(`<a class="noodle-card[^>]*href="[^"]*noodles/${n.slug}/"[^>]*>`));
  if (card && (/data-diet="[^"]*\bveg\b/.test(card[0]) || DIET_WORD.test((card[0].match(/data-search="([^"]*)"/) || ["", ""])[1]))) problems.push(`noodles/index.html: ${n.slug} card is tagged or searchable as vegetarian without a recorded maker source`);
  const entry = searchIndex.find((x) => x.u === `noodles/${n.slug}/`);
  if (entry && DIET_WORD.test(`${entry.t} ${entry.s} ${entry.k || ""}`)) problems.push(`search-index.json: ${n.slug} is searchable as vegetarian without a recorded maker source`);
}
// Claims about MEON's own customers (REG-82, BOSS 2 Nov 2026): "most picked", "our regulars", "best-sellers" and the like
// need the till's numbers, which we don't have. The owner's library notes on packets (badges like "Brand bestseller") are
// his words about the packet and are left out of this check.
const CUSTOMER_CLAIM = /\b(?:most[- ]picked|most[- ]ordered|most[- ]loved|regulars|best[- ]?sell(?:er|ers|ing)|our (?:most )?popular|popular (?:with|among|at) (?:our|MEON)|crowd favourites? (?:at|here))\b/i;
for (const f of [...htmlFiles, path.join(OUT, "llms.txt")]) {
  const raw = fs.readFileSync(f, "utf8");
  const meta = [...raw.matchAll(/<meta (?:name|property)="(?:description|og:description|twitter:description)" content="([^"]*)"/g)].map((m) => m[1]).join(" ");
  const body = raw.replace(/<(script|style)\b[\s\S]*?<\/\1>/g, " ").replace(/<(span|p)\b[^>]*class="(?:nc-note|noodle-note)"[^>]*>[\s\S]*?<\/\1>/g, " ").replace(/<[^>]+>/g, " ");
  const claim = `${body} ${meta}`.replace(/&#39;|&rsquo;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").match(CUSTOMER_CLAIM);
  if (claim) problems.push(`${path.relative(OUT, f)}: claims what customers choose ("${claim[0]}") with no till data behind it`);
}
// Opening hours (BOSS, 2 Nov 2026): only as MEON published them, with where and when (data/site.json hoursSource), and
// shown the same on the visit page and the home page. Hours over 6 months old get a note, not a failure, so an urgent fix
// can still ship; re-check Instagram and update `checked`.
const siteData = JSON.parse(fs.readFileSync(path.join(OUT, "..", "data", "site.json"), "utf8"));
if ((siteData.hours || []).length) {
  const src = siteData.hoursSource || {};
  if (!/^https:\/\/(www\.)?(instagram\.com\/meonnoodles\/|google\.com\/maps)/.test(src.url || "") || !/^\d{4}-\d{2}-\d{2}$/.test(src.published || "") || !/^\d{4}-\d{2}-\d{2}$/.test(src.checked || ""))
    problems.push("data/site.json: hours need hoursSource { url: MEON's Instagram post or Google listing, published: YYYY-MM-DD, checked: YYYY-MM-DD }");
  else if ((Date.now() - Date.parse(src.checked)) / 864e5 > 183) console.log(`Note: opening hours were last checked on ${src.checked}; re-check ${src.url} and update data/site.json.`);
  const text = (s) => s.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  const visit = fs.readFileSync(path.join(OUT, "visit", "index.html"), "utf8");
  const rows = [...(visit.match(/<table class="hours">([\s\S]*?)<\/table>/) || ["", ""])[1].matchAll(/<tr><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><\/tr>/g)].map((m) => `${text(m[1])} | ${text(m[2])}`);
  const want = siteData.hours.map((h) => `${h.days} | ${h.time}`);
  if (rows.join("\n") !== want.join("\n")) problems.push(`visit/index.html: the hours table shows [${rows.join("; ")}], data/site.json has [${want.join("; ")}]`);
  const home = text(fs.readFileSync(path.join(OUT, "index.html"), "utf8"));
  for (const h of siteData.hours) if (!home.includes(`${h.days} ${h.time}`)) problems.push(`index.html: doesn't show the hours "${h.days} ${h.time}"`);
}
for (const f of files.filter((f) => f.endsWith(".css"))) {
  for (const m of fs.readFileSync(f, "utf8").matchAll(/url\(\s*["']?(https?:\/\/[^"')]+)/g)) problems.push(`${path.relative(OUT, f)}: loads from another host: ${m[1].slice(0, 80)}`);
}
// Photos (BOSS, 1 Nov 2026): a photo file nothing on the site uses is still public at its URL (the black-cloth topping
// photos and the wrong-packet noodle photos were), so delete it instead; git history keeps it.
const siteText = files.filter((f) => /\.(html|json|css|js|txt|xml|webmanifest)$/.test(f)).map((f) => fs.readFileSync(f, "utf8")).join("\n");
for (const f of files) {
  const rel = path.relative(OUT, f).split(path.sep).join("/");
  if (/^assets\/img\/(noodles|toppings|photos|shoot)\/.+\.(webp|jpe?g|png|avif)$/.test(rel) && !siteText.includes(rel)) problems.push(`${rel}: photo nothing on the site uses, but still public at its URL; delete it`);
}
// Restaurant schema (BOSS, 1 Nov 2026): only facts the owner has given us. No price band, reservations policy, ratings or
// reviews. The opening hours MEON posted on Instagram are shown on the site (hours check above), not in the schema yet.
const homeLd = [...fs.readFileSync(path.join(OUT, "index.html"), "utf8").matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap((m) => [JSON.parse(m[1])].flat());
const restaurant = homeLd.find((n) => n["@type"] === "Restaurant");
if (!restaurant) problems.push("index.html: no Restaurant schema");
else for (const k of ["priceRange", "acceptsReservations", "aggregateRating", "review", "openingHours", "openingHoursSpecification"]) if (k in restaurant) problems.push(`index.html: Restaurant schema claims ${k}, which the owner hasn't given us`);
console.log(`Checked ${htmlFiles.length} HTML files, ${files.length} files total.`);
if (problems.length) { console.log([...new Set(problems)].slice(0, 200).join("\n")); console.log(`${problems.length} problem(s).`); process.exit(1); }
console.log("All good ✔");
