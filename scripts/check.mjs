#!/usr/bin/env node
// Validates the built site: every internal href/src resolves to a file, every page has a title,
// description, single <h1>, alt text on images, and no duplicate ids. Exit code 1 on any problem.
import fs from "node:fs";
import path from "node:path";
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
// Cross-page anchors like toppings/#egg
const toppingsHtml = fs.readFileSync(path.join(OUT, "toppings", "index.html"), "utf8");
for (const file of htmlFiles) {
  for (const m of fs.readFileSync(file, "utf8").matchAll(/href="[^"]*toppings\/#([^"]+)"/g)) {
    if (!toppingsHtml.includes(`id="${m[1]}"`)) problems.push(`${path.relative(OUT, file)}: toppings anchor #${m[1]} missing`);
  }
}
console.log(`Checked ${htmlFiles.length} HTML files, ${files.length} files total.`);
if (problems.length) { console.log([...new Set(problems)].slice(0, 200).join("\n")); console.log(`${problems.length} problem(s).`); process.exit(1); }
console.log("All good ✔");
