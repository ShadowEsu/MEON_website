// Dev helper: screenshot pages + collect console errors. node scripts/screenshot.mjs <outDir> <path...>
// Playwright is not a project dependency; set PLAYWRIGHT_PATH to a local install if `playwright` is not resolvable.
const { chromium } = await import(process.env.PLAYWRIGHT_PATH || "playwright");
const [outDir, ...paths] = process.argv.slice(2);
const BASE = process.env.BASE || "http://localhost:4173";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const errors = [];
for (const vp of [{ name: "desktop", width: 1366, height: 860 }, { name: "mobile", width: 390, height: 844, isMobile: true }]) {
  if (process.env.ONLY && process.env.ONLY !== vp.name) continue;
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, deviceScaleFactor: 1 });
  // External requests (fonts) go through Node so the proxy CA is trusted.
  await ctx.route(/^https:\/\//, async (route) => { try { await route.fulfill({ response: await route.fetch() }); } catch { await route.abort(); } });
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(`[${vp.name}] ${page.url()} ${m.type()}: ${m.text()}`); });
  page.on("pageerror", (e) => errors.push(`[${vp.name}] ${page.url()} pageerror: ${e.message}`));
  page.on("requestfailed", (r) => errors.push(`[${vp.name}] ${page.url()} requestfailed: ${r.url()}`));
  page.on("response", (r) => { if (r.status() >= 400) errors.push(`[${vp.name}] ${page.url()} HTTP ${r.status()}: ${r.url()}`); });
  for (const p of paths) {
    await page.goto(BASE + p, { waitUntil: "networkidle" });
    // trigger reveal animations
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo({ top: y, behavior: "instant" }); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo({ top: 0, behavior: "instant" }); });
    await page.waitForTimeout(700);
    const name = (p.replace(/[/?=&]+/g, "_").replace(/^_|_$/g, "") || "home") + "-" + vp.name;
    await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 0) errors.push(`[${vp.name}] ${p} horizontal overflow ${overflow}px`);
  }
  await ctx.close();
}
await browser.close();
console.log(errors.length ? errors.join("\n") : "no console errors");
