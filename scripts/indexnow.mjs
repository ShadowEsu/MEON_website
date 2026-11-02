#!/usr/bin/env node
// Tell IndexNow search engines (Bing, Yandex, Seznam, Naver) which pages changed, after a deploy. Free, no account:
// the site's key (scripts/lib/indexnow.mjs, from the domain) is published at /<key>.txt by the build, and this script
// checks it's live before pinging.
// Usage: npm run indexnow               (every URL in the live sitemap)
//        npm run indexnow -- <path> ... (only these pages, e.g. visit/ noodles/indomie-mi-goreng/)
// Google doesn't use IndexNow; for Google, submit sitemap.xml once in Search Console (docs/seo.md).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { indexNowKey } from "./lib/indexnow.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const site = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "site.json"), "utf8"));
const base = (process.env.SITE_URL || site.siteUrl).replace(/\/+$/, "");
if (!site.indexNow) { console.error("IndexNow is off (data/site.json indexNow)"); process.exit(1); }
const key = indexNowKey(base);

const live = await fetch(`${base}/${key}.txt`).then((r) => (r.ok ? r.text() : ""));
if (live.trim() !== key) { console.error(`${base}/${key}.txt doesn't serve the key yet: deploy first`); process.exit(1); }

const args = process.argv.slice(2);
const urls = args.length
  ? args.map((p) => `${base}/${p.replace(/^\/+/, "")}`)
  : [...(await fetch(`${base}/sitemap.xml`).then((r) => r.text())).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (!urls.length) { console.error("no URLs to send"); process.exit(1); }

// One request takes up to 10,000 URLs.
const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: new URL(base).host, key, keyLocation: `${base}/${key}.txt`, urlList: urls.slice(0, 10000) }),
});
// 200 = accepted, 202 = accepted while the key is being checked; anything else is an error worth reading.
console.log(`IndexNow: ${res.status} ${res.statusText} for ${urls.length} URL(s) on ${new URL(base).host}`);
if (res.status !== 200 && res.status !== 202) { console.log(await res.text()); process.exit(1); }
