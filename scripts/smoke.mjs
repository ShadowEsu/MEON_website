// Dev helper: clicks through the interactive features and fails on any console error.
// PLAYWRIGHT_PATH=/path/to/playwright/index.mjs node scripts/smoke.mjs
const { chromium } = await import(process.env.PLAYWRIGHT_PATH || "playwright");
const BASE = process.env.BASE || "http://localhost:4173";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
await ctx.route(/^https:\/\//, async (route) => { try { await route.fulfill({ response: await route.fetch() }); } catch { await route.abort(); } });
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(`${page.url()} console: ${m.text()}`); });
page.on("pageerror", (e) => errors.push(`${page.url()} pageerror: ${e.message}`));
page.on("response", (r) => { if (r.status() >= 400) errors.push(`${page.url()} HTTP ${r.status()} ${r.url()}`); });
const ok = (cond, msg) => { console.log(`${cond ? "✔" : "✘"} ${msg}`); if (!cond) errors.push(`FAILED: ${msg}`); };

await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.keyboard.press("Control+k");
await page.waitForSelector("#search.is-open");
await page.fill("#site-search", "buldak");
await page.waitForTimeout(300);
const hits = await page.$$eval(".search-item", (els) => els.length);
ok(hits >= 10, `search "buldak" returns results (${hits})`);
await Promise.all([page.waitForURL(/\/noodles\//, { timeout: 8000 }).catch(() => {}), page.keyboard.press("Enter")]);
ok(/\/noodles\/samyang-buldak/.test(page.url()), `Enter opens first result (${page.url()})`);

await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.click(".crew .meo >> nth=0", { force: true });
await page.waitForTimeout(200);
ok(await page.$eval(".crew .meo", (m) => m.classList.contains("is-talking")), "mascot talks when tapped");
await page.evaluate(() => document.querySelector("[data-roulette]").scrollIntoView());
await page.click("[data-spin]");
await page.waitForTimeout(3100);
ok(await page.$$eval(".roulette-reel .roulette-item", (e) => e.length === 1 && /noodles\//.test(e[0].getAttribute("href"))), "roulette lands on a noodle");

await page.goto(BASE + "/noodles/?country=jp&type=Soup", { waitUntil: "networkidle" });
const shown = await page.$$eval(".noodle-card:not([hidden])", (e) => e.length);
ok(shown > 0 && shown < 172, `library URL filters work (${shown} Japanese soups)`);
await page.fill("#q", "zzzz-not-a-noodle");
await page.waitForTimeout(300);
ok(await page.$eval(".empty-state", (e) => e.classList.contains("is-visible")), "empty state shows");
await page.click(".empty-state [data-reset]");
ok((await page.$$eval(".noodle-card:not([hidden])", (e) => e.length)) === 172, "reset shows all 172");

await page.goto(BASE + "/noodles/nongshim-shin-black-premium/?src=qr", { waitUntil: "networkidle" });
ok(await page.$eval("[data-qr-banner]", (e) => !e.hidden), "QR scan banner appears with ?src=qr");
await page.click("[data-timer-start]");
await page.waitForTimeout(1300);
const t = await page.$eval(".timer-readout", (e) => e.textContent);
ok(t === "3:29" || t === "3:28", `cook timer starts at 3:30 and counts down (${t})`);

await page.goto(BASE + "/qr-generator/", { waitUntil: "networkidle" });
await page.selectOption("#qg-preset", "/noodles/nongshim-shin-black-premium/");
await page.waitForTimeout(300);
const info = await page.$eval("[data-qg-info]", (e) => e.textContent);
ok(/shin-black-premium\/\?src=qr/.test(info), `QR generator encodes chosen noodle (${info})`);
const nonBlank = await page.$eval("#qg-canvas", (c) => { const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let dark = 0; for (let i = 0; i < d.length; i += 4 * 97) if (d[i] < 80) dark++; return dark; });
ok(nonBlank > 100, "QR canvas is drawn");

for (const p of ["/countries/", "/countries/japan/", "/toppings/", "/meon-card/", "/about/", "/visit/", "/qr/", "/404.html"]) {
  await page.goto(BASE + p, { waitUntil: "networkidle" });
}
ok(true, "visited all page types");
await browser.close();
if (errors.length) { console.log("\nERRORS:\n" + [...new Set(errors)].join("\n")); process.exit(1); }
console.log("\nAll interactive checks passed, no console errors.");
