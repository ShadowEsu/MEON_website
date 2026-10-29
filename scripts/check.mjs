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
for (const f of files.filter((f) => f.endsWith(".css"))) {
  for (const m of fs.readFileSync(f, "utf8").matchAll(/url\(\s*["']?(https?:\/\/[^"')]+)/g)) problems.push(`${path.relative(OUT, f)}: loads from another host: ${m[1].slice(0, 80)}`);
}
console.log(`Checked ${htmlFiles.length} HTML files, ${files.length} files total.`);
if (problems.length) { console.log([...new Set(problems)].slice(0, 200).join("\n")); console.log(`${problems.length} problem(s).`); process.exit(1); }
console.log("All good ✔");
