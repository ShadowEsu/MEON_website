// Dev helper: loads every page in the sitemap (plus staff pages) at phone and desktop width,
// reporting console errors, failed requests and horizontal overflow.
import fs from "node:fs";
const { chromium } = await import(process.env.PLAYWRIGHT_PATH || "playwright");
const BASE = process.env.BASE || "http://localhost:4173";
const xml = fs.readFileSync(new URL("../site/sitemap.xml", import.meta.url), "utf8");
const paths = [...xml.matchAll(/<loc>https?:\/\/[^/]+(\/[^<]*)<\/loc>/g)].map((m) => m[1]).concat(["/qr/", "/qr-generator/", "/404.html"]);
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const problems = [];
for (const vp of [{ width: 390, height: 844, isMobile: true }, { width: 1366, height: 860 }]) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile });
  await ctx.route(/^https:\/\//, async (route) => { try { await route.fulfill({ response: await route.fetch() }); } catch { await route.abort(); } });
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error") problems.push(`[${vp.width}] ${page.url()} console: ${m.text()}`); });
  page.on("pageerror", (e) => problems.push(`[${vp.width}] ${page.url()} pageerror: ${e.message}`));
  page.on("response", (r) => { if (r.status() >= 400 && !r.url().endsWith("404.html")) problems.push(`[${vp.width}] ${page.url()} HTTP ${r.status()} ${r.url()}`); });
  for (const p of paths) {
    await page.goto(BASE + p, { waitUntil: "load" });
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (over > 0) problems.push(`[${vp.width}] ${p} horizontal overflow ${over}px`);
  }
  await ctx.close();
}
await browser.close();
console.log(`Swept ${paths.length} pages × 2 viewports.`);
console.log(problems.length ? [...new Set(problems)].join("\n") : "No problems found ✔");
process.exit(problems.length ? 1 : 0);
