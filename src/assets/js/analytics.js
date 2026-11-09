/* MEON visit and click counting (ledger 589). Built into pages only when data/site.json analytics.vercel is true.
   Nothing loads or is sent until the visitor taps Allow. A Global Privacy Control signal, an unanswered question or
   "No thanks" means nothing loads, nothing is sent and (for GPC) the stored choice isn't even read. The choice is kept
   in localStorage as {v: consent version, c: "yes"|"no", t: date}; a new version asks again. Vercel's script loads
   only on the production hosts in data-hosts, over https (http is allowed for localhost test builds only), and not when
   the page URL has notrack=1. Vercel's own script also stays silent in automated (webdriver/headless) browsers.
   A click event carries exactly two static properties (the Pro plan's limit): target (what kind of link or button)
   and place (which part of the page). Vercel adds the page path; beforeSend strips query strings and #fragments, keeping
   only ?src=qr (a shelf QR code scan, which the views log counts).
   Never sent: typed text, search queries, names, link text, full URLs of other sites. */
(function () {
  "use strict";
  var me = document.currentScript;
  if (!me || window.meonAnalytics) return;
  var KEY = "meon-analytics";
  var VERSION = me.getAttribute("data-version") || "";
  var SRC = me.getAttribute("data-src") || "";
  var HOSTS = (me.getAttribute("data-hosts") || "").split(/\s+/).filter(Boolean);
  var ROOT = (document.body && document.body.getAttribute("data-root")) || "/";
  var gpc = navigator.globalPrivacyControl === true;
  var memory = null; // this page's choice when the browser won't let us store it
  var unsaved = false;
  var loaded = false;

  function read() {
    if (gpc) return "no";
    if (memory) return memory;
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || "null");
      return v && v.v === VERSION && (v.c === "yes" || v.c === "no") ? v.c : null;
    } catch (e) { return null; }
  }
  function save(c) {
    memory = c;
    try { localStorage.setItem(KEY, JSON.stringify({ v: VERSION, c: c, t: new Date().toISOString().slice(0, 10) })); unsaved = false; }
    catch (e) { unsaved = true; }
  }

  var localTest = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var eligible = !!SRC && !!VERSION && HOSTS.indexOf(location.hostname) !== -1 &&
    (location.protocol === "https:" || (localTest && location.protocol === "http:")) &&
    !/(^|[?&])notrack=1(&|$)/.test(location.search);

  function load() {
    if (loaded || !eligible || read() !== "yes") return;
    loaded = true;
    window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
    // Every pageview and event passes through here. Anything sent after "No thanks" or a withdrawal is dropped, and the
    // page address goes without its query string or #fragment (guards against anything personal ever riding along),
    // except the static ?src=qr that marks a shelf QR code scan.
    window.va("beforeSend", function (ev) {
      if (read() !== "yes") return null;
      try {
        var u = new URL(ev.url, location.href);
        u.search = /[?&]src=qr(&|$)/.test(u.search) ? "?src=qr" : "";
        u.hash = "";
        ev.url = u.href;
      } catch (e) { return null; }
      return ev;
    });
    var s = document.createElement("script");
    s.defer = true;
    s.src = SRC;
    document.head.appendChild(s);
  }

  /* ---------- what was clicked: bounded, static values only ---------- */
  var SLUG = /^[a-z0-9-]{1,32}$/;
  var PAGES = ["noodles", "buldak", "countries", "pairings-and-sides", "drinks", "visit", "about", "privacy", "spiciest-noodles"];
  function linkTarget(a) {
    var u;
    try { u = new URL(a.getAttribute("href"), location.href); } catch (e) { return "link"; }
    if (u.protocol === "tel:") return "phone";
    if (u.protocol === "mailto:") return "email";
    if (u.protocol !== "http:" && u.protocol !== "https:") return "link";
    if (u.host !== location.host) {
      var h = u.hostname.replace(/^www\./, "");
      if (/(^|\.)instagram\.com$/.test(h)) return "instagram";
      if (/(^|\.)tiktok\.com$/.test(h)) return "tiktok";
      if (/writereview|\/local\/review/.test(u.href)) return "google-review";
      if (/^maps\.app\.goo\.gl$|^goo\.gl$/.test(h) || (/(^|\.)google\.[a-z.]+$/.test(h) && /^\/maps/.test(u.pathname))) return "directions";
      return "external";
    }
    if (u.pathname === location.pathname && u.hash) return "in-page";
    // Counting runs only on the live hosts, where the site sits at the domain root.
    var segs = u.pathname.split("/").filter(Boolean);
    var first = segs[0] || "";
    if (!first) return "home";
    if (first === "noodles" && segs.length > 1) return "noodle-page";
    if (first === "countries" && segs.length > 1) return "country-page";
    return PAGES.indexOf(first) !== -1 ? first : "page";
  }
  function buttonTarget(b) {
    if (b.hasAttribute("data-search-open")) return "search-open";
    if (b.hasAttribute("data-search-close")) return "search-close";
    if (b.hasAttribute("data-sound")) return "sound";
    if (b.hasAttribute("data-video-toggle")) return "video-toggle";
    if (b.classList.contains("nav-toggle")) return "menu";
    if (b.classList.contains("mega-toggle")) return "menu-section";
    if (b.classList.contains("back-top")) return "back-to-top";
    if (b.type === "submit") return b.form && b.form.hasAttribute("data-consent") ? "review-submit" : "submit";
    return "button";
  }
  function targetOf(el) {
    var t = el.getAttribute("data-track");
    if (t && SLUG.test(t)) return t;
    return el.tagName === "A" ? linkTarget(el) : buttonTarget(el);
  }
  function placeOf(el) {
    var p = el.closest("[data-analytics-place]");
    var v = p && p.getAttribute("data-analytics-place");
    if (v && SLUG.test(v)) return v;
    if (el.closest("#search")) return "search";
    if (el.closest(".site-header")) return "header";
    if (el.closest(".tabbar")) return "tabbar";
    if (el.closest(".site-footer")) return "footer";
    if (el.closest(".announce")) return "announce";
    if (el.closest("#gallery")) return "home-gallery";
    if (el.closest(".crumbs")) return "breadcrumbs";
    if (el.closest(".subtabs")) return "subtabs";
    if (el.closest(".prev-next")) return "prev-next";
    if (el.closest("#main")) return "main";
    return "other";
  }
  var last = "", lastAt = 0;
  document.addEventListener("click", function (e) {
    if (!loaded || read() !== "yes" || !e.target || !e.target.closest) return;
    var el = e.target.closest("a[href], button");
    if (!el || el.closest("[data-analytics-ui]")) return;
    var target = targetOf(el), place = placeOf(el);
    var sig = target + "|" + place, now = Date.now();
    if (sig === last && now - lastAt < 800) return; // a double click counts once
    last = sig; lastAt = now;
    window.va("event", { name: "Click", data: { target: target, place: place } });
  }, true);

  /* ---------- the question, and the settings on the privacy page ---------- */
  function choose(c, fromSettings) {
    save(c);
    var bar = document.querySelector(".consent-bar");
    if (bar) {
      if (bar.contains(document.activeElement)) document.activeElement.blur();
      bar.remove();
    }
    if (c === "yes") load();
    renderSettings(fromSettings);
  }
  function btn(label, cls, c, fromSettings) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "btn btn--sm " + cls;
    b.textContent = label;
    b.addEventListener("click", function () { choose(c, fromSettings); });
    return b;
  }
  function ask() {
    if (gpc || read() !== null || document.querySelector(".consent-bar")) return;
    var bar = document.createElement("section");
    bar.className = "consent-bar";
    bar.setAttribute("aria-label", "Counting visits");
    bar.setAttribute("data-analytics-ui", "");
    var p = document.createElement("p");
    p.appendChild(document.createTextNode("Can we count visits and which links get tapped? No cookies or ads, and nothing that says who you are. "));
    var a = document.createElement("a");
    a.href = ROOT + "privacy/#analytics";
    a.textContent = "How it works";
    p.appendChild(a);
    var row = document.createElement("div");
    row.className = "consent-actions";
    row.appendChild(btn("Allow", "btn--red", "yes"));
    row.appendChild(btn("No thanks", "btn--line", "no"));
    bar.appendChild(p);
    bar.appendChild(row);
    document.body.appendChild(bar);
  }
  // The settings keep one status line (a live region that exists before it changes, so screen readers announce the new
  // answer) and swap only the buttons; after a choice made here, focus moves to the status so it isn't lost.
  var status = null, row = null;
  function renderSettings(focus) {
    var box = document.querySelector("[data-analytics-settings]");
    if (!box) return;
    if (!status) {
      box.setAttribute("data-analytics-ui", "");
      box.textContent = "";
      status = document.createElement("p");
      status.className = "consent-status";
      status.setAttribute("role", "status");
      status.tabIndex = -1;
      row = document.createElement("div");
      row.className = "consent-actions";
      box.appendChild(status);
      box.appendChild(row);
    }
    var c = read(), text;
    row.textContent = "";
    if (gpc) {
      text = "Your browser is sending a Global Privacy Control signal, so counting stays off on this site and no choice is stored.";
    } else if (c === "yes") {
      text = "Counting is on in this browser.";
      row.appendChild(btn("Turn counting off", "btn--line", "no", true));
    } else if (c === "no") {
      text = "Counting is off in this browser.";
      row.appendChild(btn("Allow counting", "btn--red", "yes", true));
    } else {
      text = "You haven't chosen yet, so counting is off.";
      row.appendChild(btn("Allow", "btn--red", "yes", true));
      row.appendChild(btn("No thanks", "btn--line", "no", true));
    }
    if (unsaved && !gpc) text += " Your browser didn't let us save this choice, so it lasts until you leave this page.";
    status.textContent = text;
    row.hidden = !row.childNodes.length;
    if (focus) status.focus();
  }

  window.meonAnalytics = { version: VERSION };
  load();
  ask();
  renderSettings();
})();
