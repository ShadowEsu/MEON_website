// Dev helper: clicks through the interactive features and fails on any console error.
// PLAYWRIGHT_PATH=/path/to/playwright/index.mjs PW_CHANNEL=chrome node scripts/smoke.mjs
// PW_CHANNEL=chrome: the background videos are H.264, which Playwright's bundled Chromium can't play.
const { chromium } = await import(process.env.PLAYWRIGHT_PATH || "playwright");
const BASE = process.env.BASE || "http://localhost:4173";
const browser = await chromium.launch({ args: ["--no-sandbox"], ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}) });
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

await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
ok(await page.$$eval(".vhero .vcol video", (vs) => vs.length === 3 && vs.every((v) => !!v.getAttribute("src") && !v.paused && v.currentTime > 0)), "the three desktop hero columns load and play");
ok(await page.$eval(".vhero .vbg--phone video", (v) => !v.getAttribute("src")), "phone hero video is not fetched on desktop");
ok((await page.$$eval(".stack > li video", (vs) => vs.length)) === 4 && (await page.$$eval(".vwall video", (vs) => vs.length)) === 12, "four step-card videos and a twelve-clip video wall");
ok(await page.$eval(".logo-badge", (s) => { const r = s.getBoundingClientRect(); return s.querySelectorAll(".lw").length === 8 && Math.abs(r.width - r.height) < 1 && r.height >= 50; }), "header logo is the square with meon plus the four glyphs");
ok(!(await page.$(".facts")) && !(await page.$("#watch")), "no facts row and no Watch section on the home page");
ok((await page.$$eval(".insta-row .reel", (e) => e.length)) >= 12, "Instagram strip is filled");
for (const p of ["pairings-and-sides/", "noodles/", "countries/", "about/", "visit/"]) {
  await page.goto(BASE + "/" + p, { waitUntil: "domcontentloaded" });
  ok(await page.$eval(".vhero--page", (h) => h.querySelectorAll(".vcol video").length === 3 && !!h.querySelector(".vbg--phone video") && !!h.querySelector("h1")), `/${p} has the video hero (3 desktop clips, 1 phone clip, h1)`);
}
await page.goto(BASE + "/privacy/", { waitUntil: "networkidle" });
await page.click(".peeker .meo", { force: true });
await page.waitForTimeout(200);
ok(await page.$eval(".peeker .meo", (m) => m.classList.contains("is-talking")), "mascot talks when tapped");
await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await page.evaluate(() => document.querySelector("[data-roulette]").scrollIntoView());
await page.click("[data-spin]");
await page.waitForTimeout(3100);
ok(await page.$$eval(".roulette-reel .roulette-item", (e) => e.length === 1 && /noodles\//.test(e[0].getAttribute("href"))), "roulette lands on a noodle");

await page.goto(BASE + "/noodles/?country=jp&type=Soup", { waitUntil: "networkidle" });
const total = await page.$$eval(".noodle-card", (e) => e.length);
const shown = await page.$$eval(".noodle-card:not([hidden])", (e) => e.length);
ok(shown > 0 && shown < total, `library URL filters work (${shown} Japanese soups of ${total})`);
await page.fill("#q", "zzzz-not-a-noodle");
await page.waitForTimeout(300);
ok(await page.$eval(".empty-state", (e) => e.classList.contains("is-visible")), "empty state shows");
await page.click(".empty-state [data-reset]");
ok((await page.$$eval(".noodle-card:not([hidden])", (e) => e.length)) === total, `reset shows all ${total}`);

await page.goto(BASE + "/noodles/nongshim-shin-black-premium/?src=qr", { waitUntil: "networkidle" });
ok(await page.$eval("[data-qr-banner]", (e) => !e.hidden), "QR scan banner appears with ?src=qr");
await page.click("[data-timer-start]");
await page.waitForTimeout(1300);
const t = await page.$eval(".timer-readout", (e) => e.textContent);
ok(t === "3:49" || t === "3:48", `cook timer starts at 3:50 and counts down (${t})`);

await page.goto(BASE + "/qr-generator/", { waitUntil: "networkidle" });
await page.selectOption("#qg-preset", "/noodles/nongshim-shin-black-premium/");
await page.waitForTimeout(300);
const info = await page.$eval("[data-qg-info]", (e) => e.textContent);
ok(/shin-black-premium\/\?src=qr/.test(info), `QR generator encodes chosen noodle (${info})`);
const nonBlank = await page.$eval("#qg-canvas", (c) => { const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let dark = 0; for (let i = 0; i < d.length; i += 4 * 97) if (d[i] < 80) dark++; return dark; });
ok(nonBlank > 100, "QR canvas is drawn");

for (const p of ["/countries/", "/countries/japan/", "/pairings-and-sides/", "/about/", "/visit/", "/qr/", "/404.html"]) {
  await page.goto(BASE + p, { waitUntil: "networkidle" });
}
ok(true, "visited all page types");
await browser.close();
if (errors.length) { console.log("\nERRORS:\n" + [...new Set(errors)].join("\n")); process.exit(1); }
console.log("\nAll interactive checks passed, no console errors.");
