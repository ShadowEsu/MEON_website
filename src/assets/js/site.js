/* MEON — progressive enhancement. Every page works without this file.
   Motion rules: transform/opacity only, one scroll loop, pause what is off-screen, respect reduced motion. */
(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.remove("no-js");
  doc.classList.add("js");

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var ROOT = document.body.getAttribute("data-root") || "./";

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]; }); }
  function norm(s) { return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  /* Search spelling help: alternate spellings of the same dish always match; one typo per word
     is forgiven only when nothing matched exactly. */
  var SPELLINGS = [
    ["ramen", "ramyun", "ramyeon", "ramyon"], ["jjajang", "jajang", "chajang", "jjajangmyeon", "jajangmyeon", "jjajangmyun"], ["jjambbong", "jjamppong", "jambbong", "champong"],
    ["chapaguri", "jjapaguri", "ramdon"], ["chapagetti", "chapaghetti", "jjapaghetti", "jjapagetti"], ["yum", "yam"], ["kimchi", "kim chi", "kimchee"]
  ];
  var VARIANTS = {};
  SPELLINGS.forEach(function (g) { g.forEach(function (w) { VARIANTS[w] = g; }); });
  function queryTerms(q) {
    q = norm(q.trim()).replace(/\b(?:migoreng|miegoreng|meegoreng|mie goreng|mee goreng)\b/g, "goreng").replace(/\btomy[au]m\b/g, "tom yum");
    return q ? q.split(/\s+/) : [];
  }
  function oneTypo(a, b) {
    if (Math.abs(a.length - b.length) > 1) return false;
    var i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1) || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
    return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
  }
  function hasTerm(hay, t, typo) {
    var v = VARIANTS[t] || [t];
    for (var i = 0; i < v.length; i++) if (hay.indexOf(v[i]) !== -1) return true;
    if (!typo || t.length < 4) return false;
    return hay.split(/[^a-z0-9]+/).some(function (w) { return oneTypo(t, w); });
  }
  function matchesAll(hay, terms, typo) { return terms.every(function (t) { return hasTerm(hay, t, typo); }); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function flagImg(cc, w) { return '<img class="flag" src="' + ROOT + "assets/img/flags/" + esc(cc) + '.svg" alt="" width="' + (w || 20) + '" height="' + Math.round((w || 20) * 0.75) + '">'; }
  function useIcon(name) { return '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><use href="' + ROOT + "assets/img/icons.svg#i-" + esc(name) + '"/></svg>'; }

  /* ---------- Native scrolling (instant, no smoothing library) ---------- */
  function scrollToY(y) { window.scrollTo({ top: y, behavior: reduceMotion ? "auto" : "smooth" }); }

  /* ---------- One scroll loop: header, progress, parallax, scroll-linked rows, home scenes ---------- */
  var header = $("[data-header]");
  var progress = $(".scroll-progress span");
  var backTop = $(".back-top");
  var parallax = reduceMotion ? [] : $$("[data-parallax]");
  var hscroll = reduceMotion ? [] : $$("[data-hscroll]");
  var vhero = $(".vhero");
  // The hero's play/pause box, read with the other geometry each frame once "Background videos" below sets heroBtnMoved
  var heroBtnEl = null, heroBtnRect = null, heroBtnMoved = null;
  /* Scenes. [data-scene] gets --p, the scroll progress through it: by default while its sticky first child (the
     stage) is pinned, i.e. over (scene height - stage height); "through" runs from entering the screen to leaving it;
     "leave" (inner-page video heroes, which start on screen) runs from the top of the page until it has scrolled away.
     .is-moving once it has started (rounded corners), .is-late past .58 (the faded hero words stop taking clicks).
     [data-stack] cards get --q (how far the card has slid in) and --p (how far the next card covers it), .is-sinking
     once covered at all. Only the active card (at least half slid in, not yet half covered) loads and plays its clip
     (Design, 31 Oct 2026); the others pause. All scene and card reads happen before any write. */
  var scenes = reduceMotion ? [] : $$("[data-scene]");
  var stackEl = reduceMotion ? null : $("[data-stack]");
  var stackCards = stackEl ? $$("[data-stack] > li") : [];
  // Until the first frame with the stack on screen decides, no card is active, so nearing the screen loads nothing
  stackCards.forEach(function (li) { li._idle = true; $$("video[data-bg-src]", li).forEach(function (v) { v._covered = true; }); });
  var sceneP = [], cardTops = [];
  var lastY = window.scrollY, ticking = false;
  var navOpen = function () { var n = $("#site-nav"); return n && n.classList.contains("is-open"); };
  function frame() {
    ticking = false;
    var y = window.scrollY, vh = window.innerHeight;
    // Reads first
    var heroOver = !!(vhero && header) && y < vhero.offsetHeight - header.offsetHeight;
    heroBtnRect = heroBtnMoved ? heroBtnEl.getBoundingClientRect() : null;
    for (var k = 0; k < scenes.length; k++) {
      var sc = scenes[k], sr = sc.getBoundingClientRect();
      if (sr.bottom < -100 || sr.top > vh + 100) { sceneP[k] = null; continue; }
      var mode = sc.getAttribute("data-scene");
      if (mode === "through") sceneP[k] = (vh - sr.top) / (vh + sr.height);
      else if (mode === "leave") sceneP[k] = -sr.top / Math.max(1, sr.height);
      else { var pin = sr.height - sc.firstElementChild.offsetHeight; sceneP[k] = pin > 1 ? -sr.top / pin : 0; }
    }
    var stackOn = false;
    if (stackEl) {
      var str = stackEl.getBoundingClientRect();
      stackOn = str.bottom > -50 && str.top < vh + 50;
      if (stackOn) for (var m = 0; m < stackCards.length; m++) cardTops[m] = stackCards[m].getBoundingClientRect().top;
    }
    // Then writes
    if (header) { header.classList.toggle("is-scrolled", y > 8); if (vhero) header.classList.toggle("is-over", heroOver); }
    if (heroBtnRect) heroBtnMoved(heroBtnRect);
    lastY = y;
    if (progress) {
      var max = document.documentElement.scrollHeight - vh;
      progress.style.setProperty("--p", max > 0 ? (y / max).toFixed(4) : 0);
    }
    if (backTop) backTop.classList.toggle("is-visible", y > 900);
    for (k = 0; k < scenes.length; k++) {
      if (sceneP[k] === null) continue;
      var sp = clamp(sceneP[k], 0, 1);
      scenes[k].style.setProperty("--p", sp.toFixed(4));
      scenes[k].classList.toggle("is-moving", sp > 0.005);
      scenes[k].classList.toggle("is-late", sp > 0.58);
    }
    if (stackOn) for (m = 0; m < stackCards.length; m++) {
      var card = stackCards[m], q = clamp(1 - cardTops[m] / vh, 0, 1);
      var cover = m + 1 < stackCards.length ? clamp(1 - cardTops[m + 1] / vh, 0, 1) : 0;
      card.style.setProperty("--q", q.toFixed(4));
      card.style.setProperty("--p", cover.toFixed(4));
      card.classList.toggle("is-sinking", cover > 0.005);
      var idle = q < 0.5 || cover >= 0.5;
      if (idle !== card._idle) {
        card._idle = idle;
        $$("video[data-bg-src]", card).forEach(function (v) { v._covered = idle; if (idle) { if (typeof bgStop === "function") bgStop(v); } else if (typeof bgPlay === "function") bgPlay(v); });
      }
    }
    for (var i = 0; i < parallax.length; i++) {
      var el = parallax[i], b = el.getBoundingClientRect();
      if (b.bottom < -200 || b.top > vh + 200) continue;
      var off = (b.top + b.height / 2 - vh / 2) * -parseFloat(el.getAttribute("data-parallax"));
      el.style.translate = "0 " + off.toFixed(1) + "px";
    }
    for (var j = 0; j < hscroll.length; j++) {
      var box = hscroll[j], r = box.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) continue;
      var p = clamp((vh - r.top) / (vh + r.height), 0, 1) - 0.5;
      $$(".wall-row", box).forEach(function (row) {
        var span = Math.min(row.scrollWidth - box.clientWidth, box.clientWidth * 0.9);
        row.style.transform = "translate3d(" + (-p * span * parseFloat(row.getAttribute("data-speed") || 1)).toFixed(1) + "px,0,0)";
      });
    }
  }
  function requestFrame() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  window.addEventListener("scroll", requestFrame, { passive: true });
  window.addEventListener("resize", requestFrame, { passive: true });
  frame();
  /* Keyboard focus inside a covered step card: bring that card back to its own place in the stack, so the focus ring
     isn't hidden under a later card. This reads the layout now instead of .is-sinking: the browser has just scrolled the
     focused control into view, and the class only catches up on the next frame */
  if (stackEl) stackEl.addEventListener("focusin", function (e) {
    var li = e.target.closest ? e.target.closest("[data-stack] > li") : null;
    var i = stackCards.indexOf(li), next = stackCards[i + 1];
    if (i < 0 || !next || getComputedStyle(li).position !== "sticky" || next.getBoundingClientRect().top >= window.innerHeight) return;
    window.scrollTo(0, stackEl.getBoundingClientRect().top + window.scrollY + i * li.offsetHeight);
  });
  if (backTop) backTop.addEventListener("click", function () { scrollToY(0); });

  /* ---------- Modal layers (phone menu, search) ----------
     While one is open, the rest of the page is inert (no Tab stops, hidden from screen readers), and Tab wraps from its
     last control back to its first */
  var focusables = function (box) {
    return $$('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])', box).filter(function (el) {
      return el.getClientRects().length && getComputedStyle(el).visibility !== "hidden";
    });
  };
  var inertOutside = function (keep, on) {
    Array.prototype.forEach.call(document.body.children, function (el) {
      if (el.contains(keep)) return;
      if (on && !el.inert) { el.inert = true; el.setAttribute("data-modal-inert", ""); }
      else if (!on && el.hasAttribute("data-modal-inert")) { el.inert = false; el.removeAttribute("data-modal-inert"); }
    });
  };
  var wrapTab = function (box, e) {
    if (e.key !== "Tab") return;
    var f = focusables(box);
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey ? document.activeElement === first : document.activeElement === last) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
  };
  var closeMenu = function () {};

  /* ---------- Navigation ---------- */
  var toggle = $(".nav-toggle");
  var nav = $("#site-nav");
  if (toggle && nav) {
    var header = $("[data-header]");
    // Start the phone menu right under the header (the announcement bar can push the header down).
    var placeMenu = function () {
      if (header) nav.style.setProperty("--nav-top", Math.max(0, Math.round(header.getBoundingClientRect().bottom)) + "px");
    };
    // The menu lives in the header: on open, keyboard focus moves to its first link and the page behind goes inert; the header
    // (logo, search, sound and the close button) stays usable.
    var setOpen = function (open) {
      if (open) placeMenu();
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      nav.classList.toggle("is-open", open);
      document.body.classList.toggle("is-locked", open);
      inertOutside(toggle, open);
      if (open) { var first = focusables(nav)[0]; if (first) first.focus({ preventScroll: true }); }
    };
    closeMenu = function () { if (nav.classList.contains("is-open")) setOpen(false); };
    // Widening past the phone layout hides the toggle, so close the menu rather than leave the page inert behind it.
    window.addEventListener("resize", function () {
      if (!nav.classList.contains("is-open")) return;
      if (!toggle.getClientRects().length) setOpen(false); else placeMenu();
    }, { passive: true });
    toggle.addEventListener("click", function () { setOpen(toggle.getAttribute("aria-expanded") !== "true"); });
    if (header) header.addEventListener("keydown", function (e) { if (nav.classList.contains("is-open")) wrapTab(header, e); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && nav.classList.contains("is-open")) { setOpen(false); toggle.focus(); } });
  }
  $$(".has-mega").forEach(function (item) {
    var btn = $(".mega-toggle", item);
    if (!btn) return;
    var set = function (open) {
      item.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
      btn.setAttribute("aria-label", open ? "Hide the noodle menu" : "Show the noodle menu");
    };
    btn.addEventListener("click", function (e) { e.stopPropagation(); set(!item.classList.contains("is-open")); });
    document.addEventListener("click", function (e) { if (!item.contains(e.target)) set(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && item.classList.contains("is-open")) { set(false); btn.focus(); } });
    item.addEventListener("mouseleave", function () { if (window.matchMedia("(min-width: 1025px)").matches) set(false); });
  });
  // Smooth in-page anchors (the skip link, the home hero's scroll cue, the pairing-group buttons). Keyboard focus moves with
  // the scroll, as the browser would do itself without preventDefault.
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href").slice(1), t = id && document.getElementById(id);
      if (!t) return;
      e.preventDefault();
      scrollToY(t.getBoundingClientRect().top + window.scrollY - 90);
      history.replaceState(null, "", "#" + id);
      if (!t.hasAttribute("tabindex") && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) { t.setAttribute("tabindex", "-1"); t.classList.add("anchor-target"); }
      t.focus({ preventScroll: true });
    });
  });

  /* ---------- Split headings into masked words ---------- */
  $$("[data-split]").forEach(function (el) {
    var i = 0;
    var walk = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            var w = document.createElement("span"); w.className = "w"; w.setAttribute("aria-hidden", "true");
            var inner = document.createElement("span"); inner.style.setProperty("--i", i++); inner.textContent = part;
            w.appendChild(inner); frag.appendChild(w);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) walk(child);
      });
    };
    el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
    walk(el);
  });

  /* ---------- Reveal on scroll (photo wipes, split headings, footer letters) ---------- */
  var heroTitle = $(".page-title[data-split]");
  var reveals = $$(".img-reveal, [data-split], [data-reveal-letters]").filter(function (el) { return el !== heroTitle; });
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else reveals.forEach(function (el) { el.classList.add("is-in"); });

  /* ---------- Hero entrance ---------- */
  requestAnimationFrame(function () {
    setTimeout(function () {
      if (heroTitle) heroTitle.classList.add("is-in");
    }, 60);
  });

  /* ---------- Pause decorative loops when off-screen ---------- */
  if ("IntersectionObserver" in window) {
    var po = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target.classList.toggle("is-off", !en.isIntersecting); });
    }, { rootMargin: "120px" });
    $$(".peeker, .logo-anim, .cta-mascots, .mascot-stage, .flag--hero, .footer-big, .noodle-photo, .vhero-logo, .insta-track").forEach(function (el) { po.observe(el); });
  }

  /* ---------- Background videos ----------
     Muted loops that start on their own on every phone (Preston, 29 Oct 2026: "autoplays on mobile phones ... so nobody
     has to press play"). Reduced motion (BOSS, 30 Oct 2026): they start paused and the hero button shows "Play videos";
     one tap plays them all. A file loads only when its video nears the screen and plays only while it's on screen.
     Save-Data: never load the videos; the posters stay. Hero videos carry data-media so a phone only fetches the portrait
     cut and a desktop only the column clips. When the browser refuses to start a video by itself (an iPhone in Low Power
     Mode), the visitor's next tap, click or key starts every video on screen. The play/pause choice lasts for the visit
     (sessionStorage). The hero's button scrolls away with the hero, so a copy in the header takes over while a video
     is in view. Reels (Instagram strip) and step cards drop a file that is still downloading when they leave the screen
     (or stop being the active card), so clips nobody is watching stop using data (Design, 31 Oct 2026). */
  var bgVids = $$("video[data-bg-src]");
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var storedVideos = null;
  try { localStorage.removeItem("meon-videos"); storedVideos = sessionStorage.getItem("meon-videos"); } catch (e) {}
  var userPaused = storedVideos ? storedVideos === "paused" : reduceMotion;
  var bgFits = function (v) { var m = v.getAttribute("data-media"); return !m || window.matchMedia(m).matches; };
  /* Which file: a clip can carry smaller AV1 and HEVC copies next to its H.264 file (data-bg-av1, data-bg-hevc; REG-54,
     1 Nov 2026). One check per visit, before the first clip loads: AV1 where the device decodes it in hardware, else HEVC
     where it plays (browsers only report HEVC with a hardware decoder), else AV1 in software, else the H.264 file every
     browser plays. A copy that fails to decode falls back to the H.264 file, and so does every clip after it on that visit. */
  var bgCodec = null;
  var bgCodecReady = (function () {
    var types = { av1: 'video/mp4; codecs="av01.0.05M.08"', hevc: 'video/mp4; codecs="hvc1.1.6.L93.B0"' };
    var mc = navigator.mediaCapabilities;
    var ask = function (k) {
      var probe = document.createElement("video").canPlayType(types[k]) === "probably";
      if (!mc || !mc.decodingInfo) return Promise.resolve({ supported: probe, powerEfficient: probe });
      return mc.decodingInfo({ type: "file", video: { contentType: types[k], width: 720, height: 1280, bitrate: 1500000, framerate: 30 } })
        .catch(function () { return { supported: probe, powerEfficient: probe }; });
    };
    return Promise.all([ask("av1"), ask("hevc")]).then(function (r) {
      bgCodec = r[0].supported && r[0].powerEfficient ? "av1" : r[1].supported ? "hevc" : r[0].supported ? "av1" : "";
    }, function () { bgCodec = ""; });
  })();
  var bgBlocked = false;
  var bgPlay = function (v) {
    if (saveData || userPaused || !v._in || v._covered || !bgFits(v)) return;
    if (bgCodec === null) { bgCodecReady.then(function () { bgPlay(v); }); return; }
    if (!v.getAttribute("src")) { v.muted = true; v.src = (bgCodec && v.getAttribute("data-bg-" + bgCodec)) || v.getAttribute("data-bg-src"); }
    var p = v.play(); if (p && p.catch) p.catch(function () { if (v.paused && v._in && !v._covered) bgBlocked = true; });
  };
  bgVids.forEach(function (v) {
    v.addEventListener("error", function () {
      var h264 = v.getAttribute("data-bg-src"), cur = v.getAttribute("src");
      if (cur && cur !== h264) { bgCodec = ""; v.src = h264; bgPlay(v); }
    });
  });
  // Pause; for reels and step cards also drop a clip that hasn't fully downloaded (a fully loaded one is kept for its return)
  bgVids.forEach(function (v) { v._drop = !!v.closest(".reel, .scard"); });
  var bgStop = function (v) {
    if (!v.paused) v.pause();
    if (!v._drop || !v.getAttribute("src")) return;
    var b = v.buffered;
    if (b.length && v.duration && b.end(b.length - 1) >= v.duration - 0.25) return;
    v.removeAttribute("src"); v.load(); v.classList.remove("is-playing");
  };
  var bgRetry = function () {
    if (!bgBlocked || userPaused) return;
    bgBlocked = false;
    bgVids.forEach(function (v) { if (v.paused) bgPlay(v); });
  };
  var vToggles = $$("[data-video-toggle]");
  // On the home page the same button also stops the hero's noodle strip (WCAG 2.2.2), so there it says "motion", not
  // "videos", to stay true: "Pause motion" while things move, "Play motion" once paused.
  var vWord = $(".hstrip") ? "motion" : "videos";
  if (vWord !== "videos") vToggles.forEach(function (t) {
    t.setAttribute("aria-label", "Pause " + vWord);
    var tx = $(".vpause-text", t);
    if (tx) tx.textContent = "Play " + vWord;
  });
  var heroToggle = $(".vhero [data-video-toggle]");
  var headerToggle = $("[data-video-toggle-header]");
  var heroToggleOn = !!heroToggle; // until its observer reports
  var syncHeaderToggle = function () {
    if (headerToggle) headerToggle.hidden = saveData || heroToggleOn || !bgVids.some(function (v) { return v._in && bgFits(v); });
  };
  bgVids.forEach(function (v) { v.addEventListener("playing", function () { v.classList.add("is-playing"); }); });
  if (bgVids.length && "IntersectionObserver" in window && !saveData) {
    var bio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { var v = en.target; v._in = en.isIntersecting; if (v._in) bgPlay(v); else bgStop(v); });
      syncHeaderToggle();
    }, { rootMargin: "160px 0px" });
    bgVids.forEach(function (v) { bio.observe(v); });
    ["touchend", "click", "keydown"].forEach(function (t) { document.addEventListener(t, bgRetry, { capture: true, passive: true }); });
    if (heroToggle) {
      // Over half the hero button hidden (off screen or under the fixed header) counts as gone: the header's toggle takes
      // over, and the hero's own button and scroll cue hide, so the header never shows two toggles or a cue over one.
      var heroBox = heroToggle.closest(".vhero"), headerH = header ? header.offsetHeight : 0;
      var setHeroOn = function (on) { heroToggleOn = on; heroBox.classList.toggle("vhero--under", !on); syncHeaderToggle(); };
      new IntersectionObserver(function (entries) { setHeroOn(entries[0].intersectionRatio > 0.5); },
        { rootMargin: "-" + headerH + "px 0px 0px 0px", threshold: [0, 0.5, 1] }).observe(heroToggle);
      // The observer reports in a task queued after the frame; after a long jump on a busy phone that came ~800 ms late,
      // with no toggle on screen while the hero still played (1 Nov 2026). The scroll frame applies the same rule (over
      // half of the button below the header and on screen) from the button's own box, so the swap lands in the first
      // frame drawn after any scroll.
      heroBtnEl = heroToggle;
      heroBtnMoved = function (r) {
        var on = Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, headerH)) > r.height / 2;
        if (on !== heroToggleOn) setHeroOn(on);
      };
    }
  }
  var showVideosPaused = function (on) {
    userPaused = on;
    document.documentElement.classList.toggle("videos-paused", on);
    vToggles.forEach(function (t) { t.setAttribute("aria-pressed", String(on)); t.setAttribute("aria-label", (on ? "Play " : "Pause ") + vWord); });
    bgVids.forEach(function (v) { if (on) v.pause(); else bgPlay(v); });
  };
  if (saveData) {
    vToggles.forEach(function (t) { t.hidden = true; });
    document.documentElement.classList.add("videos-paused"); // the reel strip stays still too
  }
  else {
    if (userPaused) showVideosPaused(true);
    vToggles.forEach(function (t) {
      t.addEventListener("click", function () {
        showVideosPaused(!userPaused);
        try { sessionStorage.setItem("meon-videos", userPaused ? "paused" : "on"); } catch (e) {}
      });
    });
  }

  /* ---------- Motion spec helpers (Design, 4 Nov 2026: agents/design/motion-system-2026-11-04/MOTION-SPEC.md) ---------- */
  // Any click, key, wheel or touch ends a running count-up or celebration at its final state (§3.3).
  function onSkip(fn) {
    var evs = ["pointerdown", "keydown", "wheel", "touchstart"];
    var h = function () { off(); fn(); };
    var off = function () { evs.forEach(function (e) { window.removeEventListener(e, h, true); }); };
    evs.forEach(function (e) { window.addEventListener(e, h, { capture: true, passive: true }); });
    return off;
  }
  // --m-ease-smooth, cubic-bezier(.22, 1, .36, 1), for animations driven from JS
  var easeSmooth = (function (x1, y1, x2, y2) {
    var cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    return function (x) {
      var t = x;
      for (var i = 0; i < 6; i++) {
        var fx = ((ax * t + bx) * t + cx) * t - x, d = (3 * ax * t + 2 * bx) * t + cx;
        if (Math.abs(fx) < 1e-5 || !d) break;
        t -= fx / d;
      }
      t = Math.max(0, Math.min(1, t));
      return ((ay * t + by) * t + cy) * t;
    };
  })(0.22, 1, 0.36, 1);

  /* ---------- Count-up numbers (spec §2): once per page view, only numbers below the fold ---------- */
  // The final value is in the HTML, so a number on screen when the page opens just stays. One further down shows 0 and
  // counts up when it scrolls into view: 700 ms under 100, 1000 ms under 10,000, 1200 ms above. Screen readers get the
  // final value throughout (the counting digits are aria-hidden).
  if (!reduceMotion && "IntersectionObserver" in window) $$("[data-count]").forEach(function (el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    if (!target) return;
    var b = el.getBoundingClientRect();
    if (b.top < window.innerHeight && b.bottom > 0) return;
    var suffix = el.getAttribute("data-suffix") || "", final = target + suffix;
    var sr = document.createElement("span");
    sr.className = "visually-hidden"; sr.textContent = final;
    el.parentNode.insertBefore(sr, el);
    el.setAttribute("aria-hidden", "true");
    el.textContent = "0" + suffix;
    var cio = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      cio.disconnect();
      var dur = target < 100 ? 700 : target < 10000 ? 1000 : 1200, t0 = performance.now(), raf = 0;
      var finish = function () { cancelAnimationFrame(raf); el.textContent = final; el.removeAttribute("aria-hidden"); sr.remove(); };
      var off = onSkip(finish);
      (function tick(now) {
        var k = Math.min(1, (now - t0) / dur);
        el.textContent = Math.round(target * easeSmooth(k)) + suffix;
        if (k < 1) raf = requestAnimationFrame(tick); else { off(); finish(); }
      })(t0);
    });
    cio.observe(el);
  });

  /* ---------- Mascots: eyes follow the cursor, gentle drift, tap to hop & talk ---------- */
  if (finePointer && !reduceMotion) {
    var pupils = $$(".meo-pupils");
    var mx = 0, my = 0, pending = false;
    var look = function () {
      pending = false;
      var vh = window.innerHeight, cx0 = mx / window.innerWidth - 0.5, cy0 = my / vh - 0.5;
      pupils.forEach(function (p) {
        var svg = p.ownerSVGElement; if (!svg) return;
        var b = svg.getBoundingClientRect();
        if (b.bottom < 0 || b.top > vh) return;
        var dx = mx - (b.left + b.width / 2), dy = my - (b.top + b.height * 0.52), d = Math.sqrt(dx * dx + dy * dy) || 1, k = Math.min(1, d / 300);
        p.setAttribute("transform", "translate(" + (dx / d * 4.5 * k).toFixed(2) + " " + (dy / d * 4.5 * k).toFixed(2) + ")");
      });
    };
    window.addEventListener("pointermove", function (e) { mx = e.clientX; my = e.clientY; if (!pending) { pending = true; requestAnimationFrame(look); } }, { passive: true });
  }
  var LINES = ["Egg on top? Always.", "Try a Buldak if you dare", "Noodles from across Asia", "Press 1, then 2", "Cheese and ramen, trust me", "Spin the roulette", "Mind the steam"];
  function talk(m, text) {
    var bubble = $(".meo-bubble", m);
    if (bubble && text) bubble.textContent = text;
    m.classList.remove("is-hop"); void m.offsetWidth; m.classList.add("is-hop", "is-talking");
    clearTimeout(m._t); m._t = setTimeout(function () { m.classList.remove("is-talking", "is-hop"); }, 2200);
    if (window.MeonMusic && window.MeonMusic.playing) window.MeonMusic.blip();
  }
  $$(".meo").forEach(function (m, i) {
    m.addEventListener("click", function () {
      talk(m, m.getAttribute("data-clicked") ? LINES[(i + Math.floor(Math.random() * LINES.length)) % LINES.length] : null);
      m.setAttribute("data-clicked", "1");
    });
  });

  /* ---------- Magnetic buttons (mouse only) ---------- */
  if (finePointer && !reduceMotion) {
    $$("[data-magnetic]").forEach(function (b) {
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        b.style.translate = ((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1) + "px " + ((e.clientY - r.top - r.height / 2) * 0.35).toFixed(1) + "px";
      });
      b.addEventListener("pointerleave", function () { b.style.translate = "0 0"; });
    });
  }

  /* ---------- Celebration (spec §2): a small burst at the thing that won, once per win per visit ---------- */
  // Timer done, roulette pick, review posted. 8 paper shapes in MEON's colours fly up to 48 px out from its edge and fade
  // (600 ms) while it pops to 1.04 and back. Reduced motion: a still red outline for the same 900 ms instead.
  function celebrate(el, key) {
    if (!el) return;
    try { if (sessionStorage.getItem("meon-won-" + key)) return; sessionStorage.setItem("meon-won-" + key, "1"); } catch (e) {}
    if (reduceMotion) { el.classList.add("m-won"); setTimeout(function () { el.classList.remove("m-won"); }, 900); return; }
    var r = el.getBoundingClientRect(), edge = Math.min(r.width, r.height) / 2;
    var colors = ["#ec1b25", "#121010", "#ffc83d", "#ffffff"];
    var box = document.createElement("div");
    box.className = "m-burst"; box.setAttribute("aria-hidden", "true");
    box.style.left = (r.left + r.width / 2) + "px"; box.style.top = (r.top + r.height / 2) + "px";
    for (var i = 0; i < 8; i++) {
      var a = (i / 8) * Math.PI * 2 + Math.random() * 0.5, out = edge + 24 + Math.random() * 24;
      var s = document.createElement("i");
      s.style.background = colors[i % colors.length];
      if (i % 4 === 3) s.style.boxShadow = "0 0 0 1px rgba(18,16,16,.15)";
      if (i % 3 === 0) s.style.borderRadius = "50%";
      s.style.setProperty("--x0", (Math.cos(a) * edge).toFixed(1) + "px"); s.style.setProperty("--y0", (Math.sin(a) * edge).toFixed(1) + "px");
      s.style.setProperty("--x1", (Math.cos(a) * out).toFixed(1) + "px"); s.style.setProperty("--y1", (Math.sin(a) * out).toFixed(1) + "px");
      s.style.setProperty("--r", Math.round((Math.random() - 0.5) * 360) + "deg");
      box.appendChild(s);
    }
    document.body.appendChild(box);
    el.classList.remove("m-pop"); void el.offsetWidth; el.classList.add("m-pop");
    var t = 0, off = function () {};
    var end = function () { clearTimeout(t); off(); box.remove(); el.classList.remove("m-pop"); };
    off = onSkip(end);
    t = setTimeout(end, 900);
  }

  /* ---------- Site-wide search (Cmd/Ctrl K or "/") ---------- */
  var overlay = $("#search");
  var sInput = $("#site-search");
  var sResults = $("#search-results"), sStatus = $("#search-status");
  var index = null, loading = null, indexFailed = false, active = -1, lastFocus = null;
  // A failed load is remembered as a failure (not as an empty index), so search says it didn't load instead of "no matches".
  function loadIndex() {
    if (index) return Promise.resolve(index);
    if (loading) return loading;
    indexFailed = false;
    loading = fetch(ROOT + "search-index.json").then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) {
      index = d.map(function (x) { x._h = norm(x.t + " " + x.s + " " + (x.k || "")); x._t = norm(x.t); return x; });
      return index;
    }).catch(function () { indexFailed = true; loading = null; return null; });
    return loading;
  }
  // A popular search shows only while it finds something (e.g. "Vegetarian" waits until a noodle's vegetarian label has the
  // maker's ingredient list behind it), so no pill leads to "No noodles match".
  var POPULAR = ["Buldak", "Tom yum", "Vegetarian", "Japan", "Mi goreng", "Carbonara", "Curry", "Spicy"];
  function popularPills(cls) {
    var live = POPULAR.filter(function (s) { var terms = queryTerms(s); return !index || index.some(function (x) { return matchesAll(x._h, terms, false); }); });
    return '<div class="search-suggest' + (cls || "") + '">' + live.map(function (s) { return '<button class="pill" type="button" data-suggest="' + s + '">' + s + "</button>"; }).join("") + "</div>";
  }
  function thumb(x) {
    if (x.i) return '<span class="thumb"><img src="' + ROOT + esc(x.i) + '" alt="" width="44" height="44" loading="lazy"></span>';
    if (x.f) return '<span class="thumb">' + flagImg(x.f, 28) + "</span>";
    return '<span class="thumb">' + useIcon(x.ic || "bowl") + "</span>";
  }
  function item(x) {
    return '<a class="search-item" role="option" aria-selected="false" href="' + ROOT + esc(x.u) + '">' + thumb(x) + '<span><span class="t">' + esc(x.t) + '</span><br><span class="s">' + esc(x.s) + '</span></span><span class="go" aria-hidden="true">↵</span></a>';
  }
  function renderResults(q) {
    if (!sResults) return;
    var nq = norm(q.trim()), html = "", note = [];
    if (!index) {
      // Still loading: show nothing yet (openSearch renders again once it arrives). Failed: say so and offer a retry.
      if (indexFailed) {
        note = ["Search didn't load. Check your connection and try again."];
        html = '<div class="search-none"><button class="btn btn--red btn--sm" type="button" data-search-retry>Try again</button><a class="btn btn--line btn--sm" href="' + ROOT + 'noodles/">Browse the noodle wall</a></div>';
      }
    } else if (!nq) {
      html = '<div class="search-group">Popular searches</div>' + popularPills();
      html += '<div class="search-group">Jump to</div>' + index.filter(function (x) { return x.g === "Pages"; }).slice(0, 6).map(item).join("");
    } else {
      var terms = queryTerms(q);
      var hits = index.filter(function (x) { return matchesAll(x._h, terms, false); });
      var close = !hits.length;
      if (close) hits = index.filter(function (x) { return matchesAll(x._h, terms, true); });
      hits.sort(function (a, b) {
        var sa = a._t.indexOf(nq) === 0 ? 0 : a._t.indexOf(nq) > -1 ? 1 : 2, sb = b._t.indexOf(nq) === 0 ? 0 : b._t.indexOf(nq) > -1 ? 1 : 2;
        return sa - sb;
      });
      if (!hits.length) {
        // No dead end: the popular searches stay, plus the whole library
        note = ["No noodles match “" + q.trim() + "”.", "Check the spelling, or try one of these."];
        html = popularPills(" search-suggest--center") + '<div class="search-none"><a class="btn btn--red btn--sm" href="' + ROOT + 'noodles/">Browse all ' + index.filter(function (x) { return x.g === "Noodles"; }).length + " noodles</a></div>";
      }
      else if (close) note = ["No exact matches for “" + q.trim() + "”. Showing close spellings."];
      var groups = {};
      hits.slice(0, 40).forEach(function (x) { (groups[x.g] = groups[x.g] || []).push(x); });
      ["Noodles", "Countries", "Pairings and sides", "Pages"].forEach(function (g) { if (groups[g]) html += '<div class="search-group">' + g + " · " + groups[g].length + "</div>" + groups[g].map(item).join(""); });
    }
    if (sStatus) { sStatus.innerHTML = note.map(function (l) { return "<span>" + esc(l) + "</span>"; }).join(""); sStatus.hidden = !note.length; }
    sResults.innerHTML = html;
    active = -1;
    if (nq && $(".search-item", sResults)) setActive(0);
  }
  function setActive(i) {
    var items = $$(".search-item", sResults);
    if (!items.length) return;
    active = (i + items.length) % items.length;
    items.forEach(function (el, k) { el.setAttribute("aria-selected", k === active ? "true" : "false"); });
    items[active].scrollIntoView({ block: "nearest" });
  }
  function openSearch() {
    if (!overlay) return;
    closeMenu();
    lastFocus = document.activeElement;
    overlay.classList.add("is-open");
    document.body.classList.add("is-locked");
    inertOutside(overlay, true);
    // First open: the index is still on its way. Past 200 ms a skeleton of 4 results holds the panel (spec §2), and the
    // results fade in when it lands. Later opens have it in memory, so nothing animates.
    var skelT = index ? 0 : setTimeout(function () {
      if (index || indexFailed) return;
      sResults.setAttribute("aria-busy", "true");
      sResults.innerHTML = '<span class="visually-hidden">Loading search</span>' + new Array(5).join('<div class="m-skel-row" aria-hidden="true"><span class="m-skel-b m-skel-thumb"></span><span><span class="m-skel-b m-skel-w60"></span><span class="m-skel-b m-skel-w40"></span></span></div>');
    }, 200);
    loadIndex().then(function () {
      clearTimeout(skelT);
      var was = sResults.getAttribute("aria-busy") === "true";
      sResults.removeAttribute("aria-busy");
      renderResults(sInput.value);
      if (was) { sResults.classList.remove("m-fade-in"); void sResults.offsetWidth; sResults.classList.add("m-fade-in"); }
    });
    setTimeout(function () { sInput.focus(); sInput.select(); }, 40);
  }
  function closeSearch() {
    if (!overlay || !overlay.classList.contains("is-open")) return;
    overlay.classList.remove("is-open");
    document.body.classList.remove("is-locked");
    inertOutside(overlay, false);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  if (overlay) {
    $$("[data-search-open]").forEach(function (b) { b.addEventListener("click", openSearch); });
    $$("[data-search-close]", overlay).forEach(function (b) { b.addEventListener("click", closeSearch); });
    overlay.addEventListener("keydown", function (e) { wrapTab(overlay, e); });
    sInput.addEventListener("input", function () { renderResults(sInput.value); });
    sInput.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
      else if (e.key === "Enter") { var items = $$(".search-item", sResults); if (items[active]) { e.preventDefault(); location.href = items[active].href; } }
    });
    sResults.addEventListener("click", function (e) {
      var s = e.target.closest("[data-suggest]");
      if (s) { sInput.value = s.getAttribute("data-suggest"); renderResults(sInput.value); sInput.focus(); }
      if (e.target.closest("[data-search-retry]")) {
        sInput.focus();
        loadIndex().then(function () { renderResults(sInput.value); });
      }
    });
    document.addEventListener("keydown", function (e) {
      var tag = (e.target.tagName || "").toLowerCase();
      var typing = tag === "input" || tag === "textarea" || tag === "select" || e.target.isContentEditable;
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); overlay.classList.contains("is-open") ? closeSearch() : openSearch(); }
      else if (e.key === "/" && !typing) { e.preventDefault(); openSearch(); }
      else if (e.key === "Escape") closeSearch();
    });
    if (!/Mac|iPhone|iPad/.test(navigator.platform || "")) $$(".search-btn kbd").forEach(function (k) { k.textContent = "Ctrl K"; });
  }

  /* ---------- 404: "Did you mean" for a mistyped noodle address (up to 3 noodles whose name or address has its words) ---------- */
  var lostBox = $("[data-lost-suggest]");
  var lostSlug = lostBox && /^\/noodles\/([^\/]+)\/?$/.exec(location.pathname);
  if (lostSlug) loadIndex().then(function (idx) {
    var raw = lostSlug[1];
    try { raw = decodeURIComponent(raw); } catch (e) { /* malformed %-escape: use it as typed */ }
    var words = queryTerms(raw.replace(/[^A-Za-z0-9]+/g, " ")).filter(function (w) { return w.length > 1; });
    if (!idx || !words.length) return;
    var all = idx.filter(function (x) { return x.g === "Noodles"; }).map(function (x) { return { x: x, h: x._h + " " + x.u, len: x.u.split("-").length }; });
    var hits = all.filter(function (c) { return matchesAll(c.h, words, false); });
    if (!hits.length) hits = all.filter(function (c) { return matchesAll(c.h, words, true); });
    if (!hits.length) hits = all.filter(function (c) { return (c.n = words.filter(function (w) { return hasTerm(c.h, w, true); }).length); }).sort(function (a, b) { return b.n - a.n; });
    hits = hits.sort(function (a, b) { return (b.n || 0) - (a.n || 0) || a.len - b.len; }).slice(0, 3);
    if (!hits.length) return;
    $("ul", lostBox).innerHTML = hits.map(function (c) { return '<li><a href="' + ROOT + esc(c.x.u) + '">' + esc(c.x.s.split(" · ")[0] + " " + c.x.t) + "</a></li>"; }).join("");
    lostBox.hidden = false;
  });

  /* ---------- Noodle library filters ---------- */
  var library = $("[data-library]");
  if (library) {
    var cards = $$(".noodle-card", library);
    var search = $("#q");
    var selCountry = $("#f-country"), selType = $("#f-type"), selSpice = $("#f-spice"), selDiet = $("#f-diet"), selSort = $("#f-sort");
    var countEl = $("[data-result-count]");
    var empty = $(".empty-state", library);
    // A typed search gets its own empty copy (Design, 31 Oct 2026); filters alone keep the built copy
    var emptyParts = empty ? [$("h2", empty), $(".lead", empty), $("[data-reset]", empty)] : [];
    var emptyFilters = emptyParts.map(function (el) { return el.textContent; });
    var pills = $$(".pill[data-pill]", library);
    var grid = $(".card-grid", library);
    var original = cards.slice();
    var map = { country: selCountry, type: selType, spice: selSpice, diet: selDiet };
    var readParams = function () {
      var p = new URLSearchParams(location.search);
      if (search && p.get("q")) search.value = p.get("q");
      Object.keys(map).forEach(function (k) { if (map[k] && p.get(k)) map[k].value = p.get(k); });
      if (selSort && p.get("sort")) selSort.value = p.get("sort");
      [selCountry, selType, selSpice, selDiet, selSort].forEach(function (el) { if (el && el.selectedIndex === -1) el.selectedIndex = 0; });
    };
    var writeParams = function () {
      var p = new URLSearchParams();
      if (search && search.value.trim()) p.set("q", search.value.trim());
      Object.keys(map).forEach(function (k) { if (map[k] && map[k].value !== "all") p.set(k, map[k].value); });
      if (selSort && selSort.value !== "featured") p.set("sort", selSort.value);
      var qs = p.toString();
      history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
    };
    // Staggered arrival (spec §2): after a filter change, the cards that just came into view (the first 8 in grid order)
    // fade and rise in, 70 ms apart. Cards already showing don't move; a sort alone or the first load animates nothing.
    var applied = false;
    grid.addEventListener("animationend", function (e) { if (e.animationName === "m-arrive") e.target.classList.remove("m-arrive"); });
    var apply = function () {
      cards.forEach(function (card) { card._wasHidden = card.hidden; });
      var terms = queryTerms(search ? search.value : "");
      var c = selCountry.value, t = selType.value, s = selSpice.value, d = selDiet.value;
      var run = function (typo) {
        var n = 0;
        cards.forEach(function (card) {
          var ds = card.dataset;
          var ok = matchesAll(norm(ds.search), terms, typo);
          if (ok && c !== "all") ok = ds.country === c;
          if (ok && t !== "all") ok = ds.type === t;
          if (ok && s !== "all") {
            var sp = parseInt(ds.spice, 10);
            if (s === "mild") ok = sp === 0;
            else if (sp < 0) ok = false;
            else if (s === "medium") ok = sp >= 1 && sp <= 2;
            else if (s === "hot") ok = sp >= 3;
            else ok = sp === parseInt(s, 10);
          }
          if (ok && d !== "all") ok = (" " + ds.diet + " ").indexOf(" " + d + " ") !== -1;
          card.hidden = !ok;
          if (ok) n++;
        });
        return n;
      };
      var shown = run(false), close = !shown && terms.length > 0;
      if (close) shown = run(true);
      var sorted = original.slice(), v = selSort ? selSort.value : "featured";
      if (v === "az") sorted.sort(function (a, b) { return a.dataset.name.localeCompare(b.dataset.name); });
      else if (v === "hot") sorted.sort(function (a, b) { return b.dataset.spice - a.dataset.spice; });
      else if (v === "mild") sorted.sort(function (a, b) { return a.dataset.spice - b.dataset.spice; });
      else if (v === "photo") sorted.sort(function (a, b) { return b.dataset.photo - a.dataset.photo; });
      sorted.forEach(function (el) { grid.appendChild(el); });
      if (applied && !reduceMotion) {
        var k = 0;
        sorted.forEach(function (el) {
          if (k >= 8 || el.hidden || !el._wasHidden) return;
          el.style.setProperty("--m-i", k++);
          el.classList.remove("m-arrive"); void el.offsetWidth; el.classList.add("m-arrive");
        });
      }
      applied = true;
      if (countEl) countEl.textContent = (shown === cards.length ? "All " + cards.length + " noodles" : shown === 1 ? "1 noodle" : shown + " noodles") + (close && shown ? ", close spellings" : "");
      if (empty) {
        empty.classList.toggle("is-visible", shown === 0);
        var typed = search ? search.value.trim() : "";
        var copy = typed ? ["No noodles match “" + typed + "”.", "Clear the search or a filter, or ask the crew in store.", "Clear search and filters"] : emptyFilters;
        emptyParts.forEach(function (el, k) { el.textContent = copy[k]; });
      }
      pills.forEach(function (b) { var sel = map[b.getAttribute("data-pill")]; b.setAttribute("aria-pressed", sel && sel.value === b.getAttribute("data-value") ? "true" : "false"); });
      writeParams();
      requestFrame();
    };
    readParams();
    var debounce;
    if (search) search.addEventListener("input", function () { clearTimeout(debounce); debounce = setTimeout(apply, 90); });
    [selCountry, selType, selSpice, selDiet, selSort].forEach(function (el) { if (el) el.addEventListener("change", apply); });
    pills.forEach(function (b) {
      b.addEventListener("click", function () {
        var sel = map[b.getAttribute("data-pill")];
        if (!sel) return;
        sel.value = sel.value === b.getAttribute("data-value") ? "all" : b.getAttribute("data-value");
        apply();
      });
    });
    $$("[data-reset]", library).forEach(function (b) {
      b.addEventListener("click", function () {
        if (search) search.value = "";
        Object.keys(map).forEach(function (k) { map[k].value = "all"; });
        if (selSort) selSort.value = "featured";
        apply();
      });
    });
    apply();
  }

  /* ---------- Noodle photo gallery (thumbnails swap the main photo) ---------- */
  var galleryMain = $("[data-gallery-main]");
  if (galleryMain) {
    var mainImg = $("img", galleryMain);
    $$("[data-gallery-src]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var src = btn.getAttribute("data-gallery-src");
        if (!mainImg || mainImg.getAttribute("src") === src) return;
        $$("[data-gallery-src]").forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
        var pre = new Image();
        pre.onload = function () {
          galleryMain.classList.add("is-swapping");
          var first = btn === $("[data-gallery-src]");
          setTimeout(function () { mainImg.src = src; mainImg.alt = btn.getAttribute("data-gallery-alt") || mainImg.alt; galleryMain.classList.toggle("is-alt", !first); galleryMain.classList.remove("is-swapping"); }, reduceMotion ? 0 : 200);
        };
        pre.src = src;
      });
    });
  }

  /* ---------- Noodle roulette ---------- */
  var roulette = $("[data-roulette]");
  var dataEl = $("#noodle-data");
  if (roulette && dataEl) {
    var all = [];
    try { all = JSON.parse(dataEl.textContent); } catch (e) { all = []; }
    var reel = $(".roulette-reel", roulette);
    var spinBtn = $("[data-spin]", roulette);
    var heat = $("#roulette-heat", roulette);
    var root = roulette.getAttribute("data-root") || "";
    var itemH = function () { var it = $(".roulette-item", roulette); return it ? it.getBoundingClientRect().height : 160; };
    var itemHTML = function (n) {
      var img = n.img ? '<img src="' + root + esc(n.img) + '" alt="" width="160" height="160" loading="lazy">' : '<span class="roulette-ph">' + useIcon("bowl") + "</span>";
      var spice = n.spice > 0 ? "Spice " + n.spice + "/5" : n.spice < 0 ? "Spice rating soon" : "No heat";
      return '<a class="roulette-item" href="' + root + "noodles/" + esc(n.slug) + '/">' + img +
        '<span><span class="nc-meta">' + flagImg(n.cc, 16) + "<span>" + esc(n.country) + " · " + esc(n.brand) + "</span></span><h3>" + esc(n.name) + "</h3>" +
        '<span class="tags"><span>' + spice + "</span>" + (n.type ? "<span>" + esc(n.type) + "</span>" : "") + "</span></span></a>";
    };
    var spinning = false, current = null, recent = [];
    spinBtn.addEventListener("click", function () {
      if (spinning || !all.length) return;
      var h = heat ? heat.value : "any";
      var pool = all.filter(function (n) {
        if (h === "mild") return n.spice === 0;
        if (n.spice < 0) return h === "any";
        if (h === "some") return n.spice >= 1 && n.spice <= 2;
        if (h === "fire") return n.spice >= 3;
        return true;
      });
      if (!pool.length) pool = all;
      var fresh = pool.filter(function (n) { return recent.indexOf(n.slug) === -1; });
      if (!fresh.length) fresh = pool;
      var picks = current ? [current] : [];
      for (var i = 0; i < 13; i++) picks.push(pool[Math.floor(Math.random() * pool.length)]);
      var winner = fresh[Math.floor(Math.random() * fresh.length)];
      picks.push(winner);
      reel.style.transition = "none";
      reel.style.transform = "translateY(0)";
      reel.innerHTML = picks.map(itemHTML).join("");
      var hgt = itemH();
      void reel.offsetHeight;
      spinning = true; spinBtn.disabled = true;
      reel.style.transition = reduceMotion ? "none" : "";
      reel.style.transform = "translateY(-" + (picks.length - 1) * hgt + "px)";
      var done = function () {
        spinning = false; spinBtn.disabled = false; current = winner;
        recent.push(winner.slug); if (recent.length > 5) recent.shift();
        reel.style.transition = "none";
        reel.innerHTML = itemHTML(winner);
        reel.style.transform = "translateY(0)";
        var live = $("[data-roulette-live]", roulette);
        if (live) live.textContent = "You got " + winner.brand + " " + winner.name;
        celebrate($(".roulette-window", roulette), "roulette");
        if (window.MeonMusic && window.MeonMusic.playing) window.MeonMusic.chime();
      };
      if (reduceMotion) done(); else setTimeout(done, 2700);
    });
  }

  /* ---------- Cook timer ---------- */
  $$("[data-timer]").forEach(function (timer) {
    var readout = $(".timer-readout", timer), prog = $(".prog", timer);
    var startBtn = $("[data-timer-start]", timer), resetBtn = $("[data-timer-reset]", timer);
    var status = $("[data-timer-status]", timer);
    var buddy = $(".timer-buddy .meo", timer);
    var circ = 2 * Math.PI * 54;
    var total = parseInt(timer.getAttribute("data-seconds"), 10) || 230;
    var left = total, running = false, endAt = 0, raf = 0, iv = 0, wakeLock = null;
    // The countdown also shows in the tab title, and a 1 s interval keeps it (and the alarm) going
    // when the tab is in the background, where requestAnimationFrame stops.
    var baseTitle = document.title, shownTitle = baseTitle;
    var setTitle = function (t) { if (t !== shownTitle) { shownTitle = t; document.title = t; } };
    var stopLoop = function () { cancelAnimationFrame(raf); clearInterval(iv); };
    prog.style.strokeDasharray = circ;
    var fmt = function (s) { var m = Math.floor(s / 60), r = s % 60; return m + ":" + (r < 10 ? "0" : "") + r; };
    var draw = function () { readout.textContent = fmt(Math.max(0, Math.ceil(left))); prog.style.strokeDashoffset = String(circ * (1 - left / total)); };
    var beep = function () {
      try {
        var Ctx = window.AudioContext || window.webkitAudioContext, ctx = new Ctx();
        [0, 0.32, 0.64].forEach(function (t, k) {
          var o = ctx.createOscillator(), g = ctx.createGain();
          o.type = "sine"; o.frequency.value = [784, 988, 1175][k];
          g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
          g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.4);
          o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.45);
        });
      } catch (e) { /* audio not available */ }
      if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
    };
    var releaseWake = function () { if (wakeLock) { wakeLock.release().catch(function () {}); wakeLock = null; } };
    var requestWake = function () {
      if (navigator.wakeLock && navigator.wakeLock.request) navigator.wakeLock.request("screen").then(function (l) { wakeLock = l; l.addEventListener("release", function () { if (wakeLock === l) wakeLock = null; }); }).catch(function () {});
    };
    // The browser drops the wake lock whenever the page is hidden; take it back on return.
    document.addEventListener("visibilitychange", function () { if (running && !document.hidden && !wakeLock) requestWake(); });
    var tick = function () {
      left = (endAt - Date.now()) / 1000;
      if (left <= 0) {
        stopLoop();
        left = 0; running = false; draw();
        timer.classList.remove("is-running"); timer.classList.add("is-done"); startBtn.textContent = "Start timer";
        if (status) status.textContent = "Ready. Time to eat.";
        setTitle("Ready · " + baseTitle);
        beep(); releaseWake(); celebrate($(".timer-dial", timer), "timer");
        if (buddy) talk(buddy, "Noodles ready");
        return;
      }
      draw(); setTitle(fmt(Math.ceil(left)) + " · " + baseTitle);
      cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
    };
    var reset = function () {
      stopLoop(); running = false; releaseWake(); setTitle(baseTitle);
      left = total;
      timer.classList.remove("is-done", "is-running"); startBtn.textContent = "Start timer";
      if (status) status.textContent = "";
      draw();
    };
    startBtn.addEventListener("click", function () {
      if (running) { stopLoop(); running = false; timer.classList.remove("is-running"); startBtn.textContent = "Resume"; releaseWake(); setTitle("Paused · " + baseTitle); if (status) status.textContent = "Paused"; return; }
      if (left <= 0) { left = total; timer.classList.remove("is-done"); }
      running = true; endAt = Date.now() + left * 1000; startBtn.textContent = "Pause";
      timer.classList.add("is-running");
      if (status) status.textContent = "Cooking. Keep this page open.";
      requestWake();
      clearInterval(iv); iv = setInterval(tick, 1000);
      tick();
    });
    resetBtn.addEventListener("click", reset);
    draw();
  });

  /* ---------- Share ---------- */
  $$("[data-share]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var url = btn.getAttribute("data-url") || location.href.split("?")[0];
      var title = btn.getAttribute("data-title") || document.title;
      if (navigator.share) navigator.share({ title: title, url: url }).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () {
        var old = btn.innerHTML; btn.textContent = "Link copied";
        setTimeout(function () { btn.innerHTML = old; }, 1800);
      }).catch(function () {});
    });
  });

  /* ---------- In-store QR scan banner ---------- */
  var qrBanner = $("[data-qr-banner]");
  if (qrBanner && /(^|[?&])src=qr(&|$)/.test(location.search)) qrBanner.hidden = false;

  /* ---------- QR sheet filter + print ---------- */
  var qrFilter = $("[data-qr-filter]");
  if (qrFilter) qrFilter.addEventListener("input", function () {
    var q = norm(qrFilter.value);
    $$(".qr-card").forEach(function (c) { c.hidden = norm(c.textContent).indexOf(q) === -1; });
  });
  $$("[data-print]").forEach(function (b) { b.addEventListener("click", function () { window.print(); }); });

  /* ---------- QR generator ---------- */
  var gen = $("[data-qrgen]");
  if (gen) $(".qrgen-form", gen).addEventListener("submit", function (e) { e.preventDefault(); });
  if (gen && window.qrcode) {
    var siteUrl = gen.getAttribute("data-site");
    var logo = new Image(), logoReady = false;
    logo.onload = function () { logoReady = true; drawQR(); };
    logo.src = gen.getAttribute("data-logo");
    var el = {
      preset: $("#qg-preset"), url: $("#qg-url"), src: $("#qg-src"), label: $("#qg-label"), fg: $("#qg-fg"), bg: $("#qg-bg"),
      size: $("#qg-size"), logo: $("#qg-logo"), round: $("#qg-round"), canvas: $("#qg-canvas"), info: $("[data-qg-info]"), sizeOut: $("[data-qg-size]"),
    };
    var payload = function () {
      var v = el.url.value.trim() || siteUrl + "/";
      if (el.src.checked && /^https?:\/\//i.test(v) && !/[?&]src=/.test(v)) v += (v.indexOf("?") === -1 ? "?" : "&") + "src=qr";
      return v;
    };
    var build = function () { var qr = window.qrcode(0, el.logo.checked ? "H" : "M"); qr.addData(unescape(encodeURIComponent(payload()))); qr.make(); return qr; };
    var drawQR = function () {
      var qr;
      try { qr = build(); } catch (e) { el.info.textContent = "That's too much text for one QR code. Try a shorter link."; return; }
      var size = parseInt(el.size.value, 10), label = el.label.value.trim();
      el.sizeOut.textContent = size;
      var n = qr.getModuleCount(), quiet = 4, labelH = label ? Math.round(size * 0.12) : 0, cell = size / (n + quiet * 2);
      var c = el.canvas; c.width = size; c.height = size + labelH;
      var ctx = c.getContext("2d");
      ctx.fillStyle = el.bg.value; ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = el.fg.value;
      for (var r = 0; r < n; r++) for (var col = 0; col < n; col++) {
        if (!qr.isDark(r, col)) continue;
        var x = (col + quiet) * cell, y = (r + quiet) * cell;
        if (el.round.checked) { ctx.beginPath(); ctx.arc(x + cell / 2, y + cell / 2, cell * 0.46, 0, Math.PI * 2); ctx.fill(); }
        else ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(cell), Math.ceil(cell));
      }
      if (el.logo.checked && logoReady) {
        var ls = size * 0.22, lx = (size - ls) / 2;
        ctx.fillStyle = el.bg.value; ctx.fillRect(lx - cell, lx - cell, ls + cell * 2, ls + cell * 2);
        ctx.drawImage(logo, lx, lx, ls, ls);
      }
      if (label) {
        ctx.fillStyle = el.fg.value;
        ctx.font = "600 " + Math.round(labelH * 0.5) + "px 'Bricolage Grotesque', sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(label, size / 2, size + labelH * 0.42);
      }
      el.info.textContent = "Encodes: " + payload();
    };
    var svgString = function () {
      var qr = build(), n = qr.getModuleCount(), quiet = 4, dim = n + quiet * 2, d = "";
      for (var r = 0; r < n; r++) for (var col = 0; col < n; col++) if (qr.isDark(r, col)) d += "M" + (col + quiet) + " " + (r + quiet) + "h1v1h-1z";
      var label = el.label.value.trim(), extra = label ? 3 : 0;
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + dim + " " + (dim + extra) + '" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="' + el.bg.value + '"/><path d="' + d + '" fill="' + el.fg.value + '"/>' +
        (label ? '<text x="' + dim / 2 + '" y="' + (dim + 1.4) + '" font-family="Bricolage Grotesque, sans-serif" font-weight="600" font-size="1.6" text-anchor="middle" fill="' + el.fg.value + '">' + esc(label) + "</text>" : "") + "</svg>";
    };
    var fileBase = function () { var o = el.preset.selectedOptions[0]; return "meon-qr-" + ((o && o.value) ? o.value.replace(/^\/|\/$/g, "").replace(/[^a-z0-9]+/gi, "-") || "home" : "custom"); };
    var download = function (blob, name) { var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
    el.preset.addEventListener("change", function () {
      var o = el.preset.selectedOptions[0];
      if (o && o.value) { el.url.value = siteUrl + o.value; if (o.getAttribute("data-label")) el.label.value = o.getAttribute("data-label"); }
      drawQR();
    });
    ["input", "change"].forEach(function (ev) { [el.url, el.src, el.label, el.fg, el.bg, el.size, el.logo, el.round].forEach(function (x) { x.addEventListener(ev, drawQR); }); });
    $("[data-qg-png]").addEventListener("click", function () { el.canvas.toBlob(function (b) { if (b) download(b, fileBase() + ".png"); }); });
    $("[data-qg-svg]").addEventListener("click", function () { download(new Blob([svgString()], { type: "image/svg+xml" }), fileBase() + ".svg"); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawQR);
    drawQR();
  }

  /* ---------- Reviews (Supabase: meon_reviews) ---------- */
  $$("[data-reviews]").forEach(function (box) {
    var base = box.getAttribute("data-endpoint") + "/rest/v1/", key = box.getAttribute("data-key"), table = box.getAttribute("data-table") || "meon_reviews";
    var slug = box.getAttribute("data-slug") || "";
    var list = $("[data-rv-list]", box), summary = $("[data-rv-summary]", box), form = $("[data-rv-form]", box), status = $("[data-rv-status]", box);
    var headers = { apikey: key, "Content-Type": "application/json" };
    var names = {};
    try { JSON.parse(($("#noodle-data") || {}).textContent || "[]").forEach(function (n) { names[n.slug] = n.brand + " " + n.name; }); } catch (e) {}
    var starSvg = function (on) { return '<svg class="i ' + (on ? "on" : "off") + '" viewBox="0 0 24 24" aria-hidden="true"><use href="' + ROOT + 'assets/img/icons.svg#i-star"/></svg>'; };
    var stars = function (v) { var out = ""; for (var i = 1; i <= 5; i++) out += starSvg(i <= Math.round(v)); return out; };
    var when = function (iso) { try { return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return ""; } };
    var itemHTML = function (rv, isNew) {
      return '<article class="rv-item' + (isNew ? " is-new" : "") + '"><div class="rv-top"><span class="rv-name">' + esc(rv.name) + '</span><span class="rv-date">' + esc(when(rv.created_at)) + "</span></div>" +
        '<span class="rv-stars" role="img" aria-label="' + rv.rating + ' out of 5 stars">' + stars(rv.rating) + "</span><p>" + esc(rv.comment) + "</p>" +
        (!slug && rv.noodle_slug && names[rv.noodle_slug] ? '<a class="rv-noodle" href="' + ROOT + "noodles/" + esc(rv.noodle_slug) + '/">About ' + esc(names[rv.noodle_slug]) + "</a>" : "") + "</article>";
    };
    var total = 0, sum = 0, offset = 0, PAGE = 8;
    var drawSummary = function () {
      if (!summary) return;
      summary.hidden = !total;
      var avg = total ? sum / total : 0;
      $(".rv-avg", summary).textContent = total ? avg.toFixed(1) : "–";
      $(".rv-stars", summary).innerHTML = stars(avg);
      $(".rv-count", summary).textContent = total ? total + (total === 1 ? " review" : " reviews") : "No reviews yet";
    };
    var loadMore = function () {
      var q = base + table + "?select=id,created_at,name,rating,comment,noodle_slug&order=created_at.desc&limit=" + PAGE + "&offset=" + offset + (slug ? "&noodle_slug=eq." + encodeURIComponent(slug) : "");
      return fetch(q, { headers: headers }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (rows) {
        var old = $(".rv-more", list); if (old) old.remove();
        if (rows.length) { var empty = $(".rv-empty", list); if (empty) empty.remove(); }
        list.insertAdjacentHTML("beforeend", rows.map(function (x) { return itemHTML(x, false); }).join(""));
        offset += rows.length;
        if (rows.length === PAGE) {
          var more = document.createElement("button");
          more.className = "btn btn--line btn--sm rv-more"; more.type = "button"; more.textContent = "Show more reviews";
          more.addEventListener("click", loadMore);
          list.appendChild(more);
        }
      });
    };
    var loadStats = function () {
      return fetch(base + "meon_review_stats?select=slug,reviews,average" + (slug ? "&slug=eq." + encodeURIComponent(slug) : ""), { headers: headers })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (rows) { total = 0; sum = 0; rows.forEach(function (x) { total += x.reviews; sum += x.reviews * Number(x.average); }); drawSummary(); });
    };
    // The list can't load (Supabase down or offline): say so with a retry instead of the false "No reviews yet". The form stays usable.
    // While the first load is on its way, "No reviews yet" stays hidden, because it isn't known yet (Design, 4 Nov 2026). Past
    // 200 ms a skeleton of 2 reviews holds the same space (spec §2), and the list or the empty state fades in when it lands.
    var started = false;
    var start = function () {
      if (started) return;
      started = true;
      var first = !$(".rv-down", list), empty0 = $(".rv-empty", list), skel = null, skelT = 0;
      if (first) {
        list.style.minHeight = list.offsetHeight + "px";
        if (empty0) empty0.hidden = true;
        list.setAttribute("aria-busy", "true");
        skelT = setTimeout(function () {
          skel = document.createElement("div");
          skel.className = "rv-skel"; skel.style.height = list.style.minHeight;
          skel.innerHTML = '<span class="visually-hidden">Loading reviews</span>' + new Array(3).join('<div class="rv-skel-i" aria-hidden="true"><span class="m-skel-b m-skel-w30"></span><span class="m-skel-b rv-skel-stars"></span><span class="m-skel-b"></span><span class="m-skel-b m-skel-w60"></span></div>');
          list.insertBefore(skel, list.firstChild);
        }, 200);
      }
      var settle = function () {
        clearTimeout(skelT); list.removeAttribute("aria-busy"); list.style.minHeight = "";
        var shown = !!skel;
        if (skel) skel.remove();
        skel = null;
        return shown;
      };
      Promise.all([loadStats(), loadMore()]).then(function () {
        var faded = settle();
        var empty = $(".rv-empty", list); if (empty) empty.hidden = false; // still in the list only when there are no reviews
        if (faded) $$(".rv-item, .rv-empty, .rv-more", list).forEach(function (el) { el.classList.add("m-fade-in"); });
        var down = $(".rv-down", list);
        if (!down) return;
        var had = down.contains(document.activeElement);
        down.remove();
        if (had) { list.setAttribute("tabindex", "-1"); list.focus(); list.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" }); } // start: the list can be taller than the screen
      }).catch(function () {
        settle();
        started = false; offset = 0;
        $$(".rv-item, .rv-more", list).forEach(function (el) { el.remove(); });
        var empty = $(".rv-empty", list); if (empty) empty.hidden = true;
        if (!$(".rv-down", list)) {
          list.insertAdjacentHTML("afterbegin", '<div class="rv-down"><p>Reviews didn\'t load.</p><button class="btn btn--line btn--sm" type="button" data-rv-retry>Try again</button></div>');
          $("[data-rv-retry]", list).addEventListener("click", start);
        }
      });
    };
    if ("IntersectionObserver" in window) {
      var rio = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { rio.disconnect(); start(); } }, { rootMargin: "400px" });
      rio.observe(box);
    } else start();

    var doneKey = "meon-reviewed-" + (slug || "home");
    var t0 = Date.now();
    var btn = $("button[type=submit]", form), alt = $("[data-rv-alt]", form), errBox = $("[data-rv-errors]", form), posting = false;
    var markDone = function (msg) { form.classList.add("is-done"); status.classList.remove("is-error"); status.textContent = msg; if (alt) alt.hidden = true; };
    try { if (localStorage.getItem(doneKey)) markDone("Thanks, you've already reviewed this. We appreciate it."); } catch (e) {}
    // [rule, field that gets aria-invalid, field the summary link focuses (if different), message]
    var RULES = [
      ["rating", ".rv-rate", "input[name=rating][value='1']", "Choose a star rating"],
      ["name", "input[name=name]", "", "Enter your first name"],
      ["comment", "textarea[name=comment]", "", "Write a few words about it"],
      ["consent", "input[name=consent]", "", "Tick the box so we can publish your review"]
    ];
    var showErrors = function (bad) {
      var links = "";
      RULES.forEach(function (rule) {
        var el = $(rule[1], form), err = $('[data-rv-err="' + rule[0] + '"]', form), on = bad.indexOf(rule[0]) !== -1;
        var desc = (el.getAttribute("aria-describedby") || "").split(" ").filter(function (x) { return x && x !== err.id; });
        if (on) { el.setAttribute("aria-invalid", "true"); desc.unshift(err.id); links += '<li><a href="#' + (rule[2] ? $(rule[2], form) : el).id + '">' + rule[3] + "</a></li>"; }
        else el.removeAttribute("aria-invalid");
        if (desc.length) el.setAttribute("aria-describedby", desc.join(" ")); else el.removeAttribute("aria-describedby");
        err.hidden = !on;
      });
      errBox.hidden = !bad.length;
      if (!bad.length) return;
      $(".rv-errors-h", errBox).textContent = "Fix " + bad.length + (bad.length === 1 ? " thing" : " things") + " to post your review";
      $("ul", errBox).innerHTML = links;
      // focus() alone doesn't scroll a box that is already on screen, even under the fixed header or tab bar
      errBox.focus();
      errBox.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
    };
    errBox.addEventListener("click", function (e) {
      var a = e.target.closest("a"), t = a && document.getElementById(a.getAttribute("href").slice(1));
      if (!t) return;
      e.preventDefault();
      t.focus();
      (t.closest(".field, .rv-rate, .rv-consent") || t).scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (posting) return; // the button stays focusable while posting (aria-disabled), so ignore repeat presses
      var fd = new FormData(form);
      var rating = parseInt(fd.get("rating"), 10), name = String(fd.get("name") || "").trim(), comment = String(fd.get("comment") || "").trim();
      if (fd.get("website")) return; // bot
      var bad = [];
      if (!rating) bad.push("rating");
      if (!name) bad.push("name");
      if (comment.length < 3) bad.push("comment");
      if (!$("input[name=consent]", form).checked) bad.push("consent");
      showErrors(bad);
      if (bad.length) { status.classList.remove("is-error"); status.textContent = ""; return; }
      if (Date.now() - t0 < 2500) { status.classList.add("is-error"); status.textContent = "One moment, then try again."; return; }
      posting = true; btn.setAttribute("aria-disabled", "true"); if (alt) alt.hidden = true;
      status.classList.remove("is-error"); status.textContent = "Posting…";
      var body = { name: name.slice(0, 40), rating: rating, comment: comment.slice(0, 600), noodle_slug: slug || null, source: /(^|[?&])src=qr(&|$)/.test(location.search) ? "qr" : "web", consent_version: form.getAttribute("data-consent") };
      fetch(base + table, { method: "POST", headers: Object.assign({ Prefer: "return=minimal" }, headers), body: JSON.stringify(body) })
        .then(function (r) {
          if (!r.ok) return r.json().catch(function () { return {}; }).then(function (j) { throw new Error(j.message || "Something went wrong."); });
          posting = false; btn.removeAttribute("aria-disabled");
          var empty = $(".rv-empty", list); if (empty) empty.remove();
          list.insertAdjacentHTML("afterbegin", itemHTML({ name: body.name, rating: rating, comment: body.comment, created_at: new Date().toISOString(), noodle_slug: body.noodle_slug }, true));
          total += 1; sum += rating; drawSummary();
          try { localStorage.setItem(doneKey, "1"); } catch (e2) {}
          markDone("Thank you. Your review is live.");
          celebrate($(".rv-item.is-new", list), "review");
        })
        .catch(function (err) {
          // The typed words stay; focus moves to the message, and Google is offered as another way to post
          posting = false; btn.removeAttribute("aria-disabled"); btn.textContent = "Try again";
          status.classList.add("is-error");
          // One neutral line for every failure (Design, 31 Oct 2026): true for a refusal, a rate limit or an outage; server text is never shown
          status.textContent = "Your review didn't post. Your words are still here, so you can try again or post it on Google instead.";
          if (alt) alt.hidden = false;
          status.focus();
          status.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
        });
    });
  });

  /* ---------- Background music (original, generated in the browser; off by default) ---------- */
  var soundBtn = $("[data-sound]");
  if (soundBtn) {
    var KEY = "meon-sound";
    var pref = function () { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
    var setPref = function (v) { try { localStorage.setItem(KEY, v); } catch (e) {} };
    var loadMusic = function () {
      if (window.MeonMusic) return Promise.resolve(window.MeonMusic);
      return new Promise(function (res, rej) {
        var s = document.createElement("script");
        s.src = ROOT + "assets/js/music.js?v=4"; s.onload = function () { res(window.MeonMusic); }; s.onerror = rej;
        document.head.appendChild(s);
      });
    };
    // The name stays "Sound (background music)", matching the visible label; on/off is aria-pressed.
    var reflect = function (on) { soundBtn.setAttribute("aria-pressed", String(on)); };
    soundBtn.addEventListener("click", function () {
      loadMusic().then(function (m) {
        if (m.playing) { m.stop(); setPref("off"); reflect(false); }
        else { m.start(); setPref("on"); reflect(true); }
      }).catch(function () {});
    });
    // If the visitor turned music on before, resume on their first interaction (browsers block autoplay).
    if (pref() === "on") {
      var resume = function () {
        window.removeEventListener("pointerdown", resume, true); window.removeEventListener("keydown", resume, true);
        loadMusic().then(function (m) { if (!m.playing) { m.start(); reflect(true); } }).catch(function () {});
      };
      window.addEventListener("pointerdown", resume, true); window.addEventListener("keydown", resume, true);
    }
  }

  /* ---------- Home hero noodle strip: a focused card scrolls fully into view ----------
     The phone row (and the still desktop row once a card has focus) scrolls sideways; Chrome can leave a focused card half
     past the scroller's edge after Tab, so on focus it's scrolled to the nearest edge inside the scroll-padding. */
  var hstrip = $(".hstrip-view");
  if (hstrip) hstrip.addEventListener("focusin", function (e) {
    if (e.target.classList.contains("hcard")) e.target.scrollIntoView({ block: "nearest", inline: "nearest" });
  });

  /* ---------- Home gallery: Noodles / Drinks switch ----------
     Without JS both grids show, one after the other. With it, the two pills show one grid at a time. */
  var galSwitch = $(".gal-switch");
  if (galSwitch) {
    var galBtns = $$("[data-gal-show]", galSwitch);
    var galShow = function (which) {
      galBtns.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-gal-show") === which)); });
      $$("[data-gal-panel]").forEach(function (p) { p.hidden = p.getAttribute("data-gal-panel") !== which; });
    };
    galBtns.forEach(function (b) { b.addEventListener("click", function () { galShow(b.getAttribute("data-gal-show")); }); });
    galShow("noodles");
    galSwitch.hidden = false;
  }

  /* ---------- Year ---------- */
  $$("[data-year]").forEach(function (el) { el.textContent = String(new Date().getFullYear()); });
})();
