// Dev helper: clicks through the interactive features, runs the keyboard and focus checks, and fails on any console error.
// PLAYWRIGHT_PATH=/path/to/playwright/index.mjs PW_CHANNEL=chrome node scripts/smoke.mjs
// PW_CHANNEL=chrome: the background videos are H.264, which Playwright's bundled Chromium can't play.
const { chromium } = await import(process.env.PLAYWRIGHT_PATH || "playwright");
const BASE = process.env.BASE || "http://localhost:4173";
const browser = await chromium.launch({ args: ["--no-sandbox"], ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}) });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
const phoneCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
for (const c of [ctx, phoneCtx]) await c.route(/^https:\/\//, async (route) => { try { await route.fulfill({ response: await route.fetch() }); } catch { await route.abort(); } });
const errors = [];
const watch = (p) => {
  p.on("console", (m) => { if (m.type() === "error") errors.push(`${p.url()} console: ${m.text()}`); });
  p.on("pageerror", (e) => errors.push(`${p.url()} pageerror: ${e.message}`));
  p.on("response", (r) => { if (r.status() >= 400) errors.push(`${p.url()} HTTP ${r.status()} ${r.url()}`); });
  return p;
};
const page = watch(await ctx.newPage());
const ok = (cond, msg) => { console.log(`${cond ? "✔" : "✘"} ${msg}`); if (!cond) errors.push(`FAILED: ${msg}`); };
const focusIn = (p, sel) => p.evaluate((s) => !!document.activeElement && !!document.activeElement.closest(s), sel);

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
ok(await page.$$eval(".vhero .vcol video", (vs) => vs.length === 1 && vs.every((v) => !!v.getAttribute("src") && !v.paused && v.currentTime > 0)), "the one desktop hero clip loads and plays");
ok(await page.$eval(".vhero .vbg--phone video", (v) => !v.getAttribute("src")), "phone hero video is not fetched on desktop");
ok((await page.$$eval(".stack > li video", (vs) => vs.length)) === 4 && (await page.$$eval(".vwall video", (vs) => vs.length)) === 12, "four step-card videos and a twelve-clip video wall");
ok(await page.$eval(".logo-badge", (s) => { const r = s.getBoundingClientRect(); return s.querySelectorAll(".lw").length === 8 && Math.abs(r.width - r.height) < 1 && r.height >= 50; }), "header logo is the square with meon plus the four glyphs");
ok(!(await page.$(".facts")) && !(await page.$("#watch")), "no facts row and no Watch section on the home page");
ok((await page.$$eval(".insta-row .reel", (e) => e.length)) >= 12, "Instagram strip is filled");
for (const p of ["pairings-and-sides/", "noodles/", "countries/", "about/", "visit/"]) {
  await page.goto(BASE + "/" + p, { waitUntil: "domcontentloaded" });
  ok(await page.$eval(".vhero--page", (h) => h.querySelectorAll(".vcol video").length === 2 && !!h.querySelector(".vbg--phone video") && !!h.querySelector("h1")), `/${p} has the video hero (2 desktop clips, 1 phone clip, h1)`);
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

// Keyboard and focus (BOSS, 1 Nov 2026: each fix from the accessibility pass has a check here).
await page.goto(BASE + "/noodles/", { waitUntil: "networkidle" });
await page.keyboard.press("Tab");
ok(await page.evaluate(() => document.activeElement.classList.contains("skip-link")), "the first Tab lands on the skip link");
await page.keyboard.press("Enter");
await page.waitForTimeout(300);
ok(await page.evaluate(() => document.activeElement.id === "main"), "the skip link moves keyboard focus to the main content");
await page.keyboard.press("Tab");
ok(await focusIn(page, "main"), "the next Tab goes on inside the main content");
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(300);
await page.evaluate(() => document.querySelector(".back-top").focus()); // after a key press, so this counts as keyboard focus
await page.waitForTimeout(600);
ok(await page.$eval(".back-top", (b) => !b.classList.contains("is-visible") && getComputedStyle(b).opacity === "1"), "the back-to-top button shows while it has keyboard focus, even at the top of the page");

await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.focus(".search-btn");
await page.keyboard.press("Enter");
await page.waitForSelector("#search.is-open");
await page.waitForTimeout(200);
await page.keyboard.type("shin black");
await page.waitForTimeout(400);
let inside = 0;
for (let k = 0; k < 24; k++) { await page.keyboard.press(k < 12 ? "Shift+Tab" : "Tab"); if (await focusIn(page, "#search")) inside++; }
ok(inside === 24, `Tab and Shift+Tab stay inside the open search (${inside}/24)`);
await page.keyboard.press("Escape");
ok(await page.evaluate(() => document.activeElement.classList.contains("search-btn") && !document.querySelector("main").inert), "Escape closes search, focus goes back to the Search button and the page is usable again");

await page.goto(BASE + "/noodles/nongshim-shin-black-premium/", { waitUntil: "networkidle" });
await page.focus(".noodle-thumb:nth-child(3)");
await page.keyboard.press("Enter");
await page.waitForTimeout(800);
const swap = await page.evaluate(() => {
  const b = document.querySelectorAll(".noodle-thumb"), img = document.querySelector("[data-gallery-main] img");
  return { src: img.getAttribute("src") === b[2].getAttribute("data-gallery-src"), alt: img.alt, want: b[2].getAttribute("data-gallery-alt"), first: b[0].getAttribute("data-gallery-alt") };
});
ok(swap.src && swap.alt === swap.want && swap.want !== swap.first, `gallery photo 3 swaps the main photo and its alt text (${swap.alt.slice(0, 50)}…)`);
// Accessible names as the browser computes them (what screen readers and voice control get) start with the visible label.
const nameOf = async (sel) => (/^- button "([^"]*)"/.exec(await page.locator(sel).ariaSnapshot()) || [])[1] || "";
const labelText = (sel) => page.$eval(sel, (e) => e.textContent.trim());
const searchName = await nameOf(".search-btn");
ok(searchName.startsWith(await labelText(".search-btn .label")), `the header Search button's name starts with its visible label ("${searchName}")`);
const soundOff = await nameOf(".sound-btn");
await page.click(".sound-btn");
await page.waitForFunction(() => document.querySelector(".sound-btn").getAttribute("aria-pressed") === "true", null, { timeout: 8000 }).catch(() => {});
const soundOn = await nameOf(".sound-btn"), soundSeen = await labelText(".sound-btn .sound-label");
const soundPressed = await page.$eval(".sound-btn", (b) => b.getAttribute("aria-pressed"));
ok(soundPressed === "true" && soundOff.startsWith(soundSeen) && soundOn.startsWith(soundSeen), `the Sound button's name starts with its visible label, off and on ("${soundOn}", pressed ${soundPressed})`);
await page.click(".sound-btn");

const phone = watch(await phoneCtx.newPage());
await phone.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await phone.waitForTimeout(800);
await phone.focus(".nav-toggle");
await phone.keyboard.press("Enter");
await phone.waitForTimeout(400);
ok(await focusIn(phone, "#site-nav"), "at 390 px, opening the menu moves keyboard focus into it");
let stay = 0;
for (let k = 0; k < 36; k++) { await phone.keyboard.press(k < 30 ? "Tab" : "Shift+Tab"); if (await focusIn(phone, "[data-header]")) stay++; }
ok(stay === 36, `Tab and Shift+Tab stay in the open phone menu and header (${stay}/36)`);
await phone.keyboard.press("Escape");
ok(await phone.evaluate(() => document.activeElement.classList.contains("nav-toggle") && !document.querySelector("#site-nav").classList.contains("is-open") && !document.querySelector("main").inert), "Escape closes the phone menu and focus goes back to the menu button");
await phone.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await phone.waitForTimeout(1000);
let stepBtn = false;
for (let k = 0; k < 80 && !stepBtn; k++) { await phone.keyboard.press("Tab"); stepBtn = await phone.evaluate(() => !!document.activeElement.closest("[data-stack] > li:nth-child(2)") && /pairings and sides/i.test(document.activeElement.textContent)); }
await phone.waitForTimeout(1200);
ok(stepBtn && await phone.evaluate(() => { const a = document.activeElement, r = a.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!hit && a.contains(hit); }), "at 390 px, Tab to step card 2's button brings the card out from under the next one");

for (const p of ["/countries/", "/countries/japan/", "/pairings-and-sides/", "/about/", "/visit/", "/qr/", "/404.html"]) {
  await page.goto(BASE + p, { waitUntil: "networkidle" });
}
ok(true, "visited all page types");
await browser.close();
if (errors.length) { console.log("\nERRORS:\n" + [...new Set(errors)].join("\n")); process.exit(1); }
console.log("\nAll interactive checks passed, no console errors.");
