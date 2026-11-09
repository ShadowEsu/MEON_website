// Visit and click counting smoke (ledger 589). Runs against a MEON_ANALYTICS_PREVIEW=1 build served on localhost:
//   MEON_ANALYTICS_PREVIEW=1 npm run build && npx serve site -l 4173   (then, in another shell)
//   BASE=http://localhost:4173 PLAYWRIGHT_PATH=/path/to/playwright/index.mjs node scripts/analytics-smoke.mjs
// Vercel's script is swapped for a local mock that behaves like it (reads the va queue, honours beforeSend, sends a
// pageview on load and one POST per event) and every POST to /_vercel/insights/* is captured here, so nothing reaches
// Vercel. Rebuild without MEON_ANALYTICS_PREVIEW afterwards: check.mjs fails a preview build.
// Screenshots of the question at 390 and 1440 go to SHOTS (default ./analytics-smoke-shots).
import fs from "node:fs";
import path from "node:path";
const { chromium } = await import(process.env.PLAYWRIGHT_PATH || "playwright");
const BASE = (process.env.BASE || "http://localhost:4173").replace(/\/+$/, "");
const SHOTS = process.env.SHOTS || "analytics-smoke-shots";
const KEY = "meon-analytics";
const MOCK = `(function(){var bs=null;
function send(kind,p){var ev={type:kind,url:location.href,payload:p};if(bs){ev=bs(ev);if(!ev)return;}
fetch("/_vercel/insights/"+(kind==="pageview"?"view":"event"),{method:"POST",keepalive:true,headers:{"Content-Type":"application/json"},body:JSON.stringify({o:ev.url,en:p&&p.name,ed:p&&p.data})});}
function va(t,e){if(t==="beforeSend")bs=e;else if(t==="event")send("event",{name:e.name,data:e.data});}
var q=window.vaq||[];window.vaq=[];window.va=va;q.forEach(function(a){va.apply(null,a);});send("pageview",null);})();`;

fs.mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const errors = [];
const ok = (cond, msg) => { console.log(`${cond ? "✔" : "✘"} ${msg}`); if (!cond) errors.push(`FAILED: ${msg}`); };
const settle = (p, ms = 400) => p.waitForTimeout(ms);

async function session({ gpc = false, brokenStorage = false, viewport = { width: 1280, height: 860 } } = {}) {
  const ctx = await browser.newContext({ viewport, ...(viewport.width < 600 ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}) });
  const s = { ctx, sent: [], loads: 0 };
  // Every other request to another host is answered locally (the site loads nothing from other hosts before a click).
  await ctx.route(/^https:\/\//, (route) => route.abort());
  await ctx.route("**/_vercel/insights/**", (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    s.sent.push(JSON.parse(route.request().postData() || "{}"));
    return route.fulfill({ status: 200, body: "ok" });
  });
  await ctx.route("**/_vercel/insights/script.js", (route) => { s.loads++; return route.fulfill({ contentType: "text/javascript", body: MOCK }); });
  await ctx.addInitScript(({ gpc, brokenStorage, KEY }) => {
    if (gpc) Object.defineProperty(Navigator.prototype, "globalPrivacyControl", { get: () => true, configurable: true });
    window.__keys = [];
    const g = Storage.prototype.getItem, st = Storage.prototype.setItem;
    Storage.prototype.getItem = function (k) { window.__keys.push(k); if (brokenStorage && k === KEY) throw new Error("blocked"); return g.call(this, k); };
    Storage.prototype.setItem = function (k, v) { window.__keys.push(k); if (brokenStorage && k === KEY) throw new Error("blocked"); return st.call(this, k, v); };
  }, { gpc, brokenStorage, KEY });
  s.page = await ctx.newPage();
  s.page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  s.page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`); });
  s.events = () => s.sent.filter((x) => x.en);
  s.views = () => s.sent.filter((x) => !x.en);
  s.stored = () => s.page.evaluate((k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return "error"; } }, KEY);
  // Links don't navigate during the click checks (our listener runs first, in the capture phase).
  s.holdLinks = () => s.page.evaluate(() => document.addEventListener("click", (e) => { if (e.target.closest("a")) e.preventDefault(); }));
  return s;
}
const bar = (p) => p.locator(".consent-bar");

// 1. No answer yet: the question shows, nothing loads, a click sends nothing.
{
  const s = await session();
  await s.page.goto(`${BASE}/visit/`, { waitUntil: "networkidle" });
  ok(await bar(s.page).isVisible(), "unanswered: the Allow / No thanks bar shows");
  await s.page.click(".site-header [data-search-open]"); await s.page.keyboard.press("Escape"); await settle(s.page);
  ok(s.loads === 0 && s.sent.length === 0, "unanswered: Vercel's script isn't loaded and nothing is sent");
  // 2. No thanks: stored with its version, the bar goes and stays gone, still nothing loads.
  await bar(s.page).getByRole("button", { name: "No thanks" }).click();
  const st = await s.stored();
  ok(st && st.c === "no" && /^analytics-\d{4}-\d{2}-\d{2}$/.test(st.v) && /^\d{4}-\d{2}-\d{2}$/.test(st.t), `no thanks: stored as ${JSON.stringify(st)}`);
  ok(!(await bar(s.page).count()), "no thanks: the bar is gone");
  await s.page.reload({ waitUntil: "networkidle" });
  ok(!(await bar(s.page).count()) && s.loads === 0 && s.sent.length === 0, "no thanks: after a reload, no bar, no script, nothing sent");
  await s.ctx.close();
}

// 3. Allow: the script loads once per page, the address loses its query and #fragment, a click sends one event with
//    exactly two static properties, a double click counts once.
let allowed;
{
  const s = allowed = await session();
  await s.page.goto(`${BASE}/visit/?src=qr&name=Test#hours`, { waitUntil: "networkidle" });
  await bar(s.page).getByRole("button", { name: "Allow" }).click();
  await s.page.waitForFunction(() => typeof window.va === "function" && !window.vaq?.length).catch(() => {});
  await settle(s.page);
  ok(s.loads === 1, `allow: Vercel's script loaded once (${s.loads})`);
  ok(s.views().length === 1 && s.views()[0].o === `${BASE}/visit/?src=qr`, `allow: one pageview, address keeps only ?src=qr, no other query or # (${JSON.stringify(s.views().map((v) => v.o))})`);
  ok(!(await bar(s.page).count()), "allow: the bar is gone");
  await s.holdLinks();
  const before = s.events().length;
  await s.page.click(".site-header [data-search-open]"); await settle(s.page); await s.page.keyboard.press("Escape");
  const ev = s.events().slice(before);
  ok(ev.length === 1 && ev[0].en === "Click" && JSON.stringify(ev[0].ed) === JSON.stringify({ target: "search-open", place: "header" }), `allow: header search button sends one Click {target, place} (${JSON.stringify(ev)})`);
  ok(ev.every((e) => Object.keys(e.ed || {}).length === 2), "allow: every event has exactly 2 properties (Pro plan limit)");
  const n = s.events().length;
  await s.page.dblclick(".site-footer a[href*='privacy/']"); await settle(s.page);
  const dbl = s.events().slice(n);
  ok(dbl.length === 1 && dbl[0].ed.target === "privacy" && dbl[0].ed.place === "footer", `allow: a double click on the footer Privacy link counts once (${JSON.stringify(dbl)})`);
  const m = s.events().length;
  await s.page.click(".site-footer a[href^='https://']"); await settle(s.page);
  const ext = s.events().slice(m);
  ok(ext.length === 1 && /^(directions|instagram|tiktok|external)$/.test(ext[0].ed.target), `allow: an outside link sends only its kind (${JSON.stringify(ext)})`);
  ok(s.events().every((e) => /^[a-z0-9-]{1,32}$/.test(e.ed.target) && /^[a-z0-9-]{1,32}$/.test(e.ed.place) && /^[^?#]*(\?src=qr)?$/.test(e.o)), "allow: every value is a short static slug and no address carries more than ?src=qr");
  await s.page.reload({ waitUntil: "networkidle" }); await settle(s.page);
  ok(!(await bar(s.page).count()) && s.loads === 2, "allow: after a reload, no bar and the script loads for the new page");
}

// 4. Withdraw on the privacy page: the status flips, and nothing more is sent from that page on.
{
  const s = allowed;
  await s.page.goto(`${BASE}/privacy/#analytics`, { waitUntil: "networkidle" }); await settle(s.page);
  ok(/Counting is on/.test(await s.page.locator("[data-analytics-settings]").innerText()), "privacy: settings say counting is on");
  const n = s.sent.length;
  await s.page.getByRole("button", { name: "Turn counting off" }).click();
  ok(/Counting is off/.test(await s.page.locator("[data-analytics-settings]").innerText()), "withdraw: settings now say counting is off");
  ok((await s.stored())?.c === "no", "withdraw: stored as no");
  await s.holdLinks();
  await s.page.click(".site-header [data-search-open]"); await settle(s.page); await s.page.keyboard.press("Escape");
  ok(s.sent.length === n, `withdraw: nothing sent after turning it off (${s.sent.length - n} sent)`);
  const loadsBefore = s.loads;
  await s.page.reload({ waitUntil: "networkidle" });
  ok(s.loads === loadsBefore && s.sent.length === n, "withdraw: the next page loads nothing");
  await s.ctx.close();
}

// 5. Global Privacy Control: no question, nothing loaded or sent, and the stored choice is never even read.
{
  const s = await session({ gpc: true });
  await s.page.goto(`${BASE}/visit/`, { waitUntil: "networkidle" }); await settle(s.page);
  ok(!(await bar(s.page).count()) && s.loads === 0 && s.sent.length === 0, "GPC: no bar, no script, nothing sent");
  ok(!(await s.page.evaluate((k) => window.__keys.includes(k), KEY)), "GPC: meon-analytics is never read or written");
  await s.page.goto(`${BASE}/privacy/`, { waitUntil: "networkidle" });
  const box = s.page.locator("[data-analytics-settings]");
  ok(/Global Privacy Control/.test(await box.innerText()) && !(await box.locator("button").count()), "GPC: privacy settings explain the signal and offer no Allow");
  await s.ctx.close();
}

// 6. Storage blocked: the question still works, Allow counts this page only, the next page asks again.
{
  const s = await session({ brokenStorage: true });
  await s.page.goto(`${BASE}/visit/`, { waitUntil: "networkidle" });
  ok(await bar(s.page).isVisible(), "storage blocked: the bar shows");
  await bar(s.page).getByRole("button", { name: "Allow" }).click(); await settle(s.page);
  ok(s.loads === 1 && s.views().length === 1, "storage blocked: Allow counts this page");
  await s.page.reload({ waitUntil: "networkidle" });
  ok(await bar(s.page).isVisible() && s.loads === 1, "storage blocked: the next page asks again and loads nothing");
  await s.ctx.close();
}

// 7. Not a live host (127.0.0.1 isn't in a preview build's hosts) and ?notrack=1: Allow loads nothing.
for (const [label, url] of [["other host", `${BASE.replace("localhost", "127.0.0.1")}/visit/`], ["notrack=1", `${BASE}/visit/?notrack=1`]]) {
  const s = await session();
  await s.page.goto(url, { waitUntil: "networkidle" });
  await bar(s.page).getByRole("button", { name: "Allow" }).click(); await settle(s.page);
  ok(s.loads === 0 && s.sent.length === 0, `${label}: Allow loads and sends nothing`);
  await s.ctx.close();
}

// 8. Layout: on a phone the bar sits above the tab bar; screenshots of the question at 390 and 1440.
for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  const s = await session({ viewport });
  for (const [name, p] of [["home", "/"], ["visit", "/visit/"]]) {
    await s.page.goto(`${BASE}${p}`, { waitUntil: "networkidle" }); await settle(s.page, 800);
    const b = await bar(s.page).boundingBox();
    const tab = await s.page.locator(".tabbar").boundingBox();
    ok(b && b.y + b.height <= viewport.height && (!tab || tab.height === 0 || b.y + b.height <= tab.y + 0.5), `${name} ${viewport.width}: the bar is on screen and clear of the tab bar`);
    await s.page.screenshot({ path: path.join(SHOTS, `consent-${name}-${viewport.width}.png`) });
  }
  await s.ctx.close();
}

await browser.close();
if (errors.length) { console.log(errors.join("\n")); process.exit(1); }
console.log("Analytics smoke: all good ✔");
