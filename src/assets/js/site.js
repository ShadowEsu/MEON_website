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
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function flagImg(cc, w) { return '<img class="flag" src="' + ROOT + "assets/img/flags/" + esc(cc) + '.svg" alt="" width="' + (w || 20) + '" height="' + Math.round((w || 20) * 0.75) + '">'; }
  function useIcon(name) { return '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><use href="' + ROOT + "assets/img/icons.svg#i-" + esc(name) + '"/></svg>'; }

  /* ---------- Smooth scrolling (Lenis) ---------- */
  var lenis = null;
  if (!reduceMotion && window.Lenis) {
    try {
      lenis = new window.Lenis({ duration: 1.1, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
      var lraf = function (t) { lenis.raf(t); requestAnimationFrame(lraf); };
      requestAnimationFrame(lraf);
    } catch (e) { lenis = null; }
  }
  function scrollToY(y) { if (lenis) lenis.scrollTo(y, { duration: 1.2 }); else window.scrollTo({ top: y, behavior: reduceMotion ? "auto" : "smooth" }); }

  /* ---------- One scroll loop: header, progress, parallax, scroll-linked rows ---------- */
  var header = $("[data-header]");
  var progress = $(".scroll-progress span");
  var backTop = $(".back-top");
  var parallax = reduceMotion ? [] : $$("[data-parallax]");
  var hscroll = reduceMotion ? [] : $$("[data-hscroll]");
  var how = $("[data-how]");
  var howBar = $(".how-progress span");
  var lastY = window.scrollY, ticking = false;
  var navOpen = function () { var n = $("#site-nav"); return n && n.classList.contains("is-open"); };
  function frame() {
    ticking = false;
    var y = window.scrollY, vh = window.innerHeight;
    if (header) {
      header.classList.toggle("is-scrolled", y > 8);
      if (y > 320 && y > lastY + 4 && !navOpen() && !document.body.classList.contains("is-locked")) header.classList.add("is-hidden");
      else if (y < lastY - 4 || y < 320) header.classList.remove("is-hidden");
    }
    lastY = y;
    if (progress) {
      var max = document.documentElement.scrollHeight - vh;
      progress.style.setProperty("--p", max > 0 ? (y / max).toFixed(4) : 0);
    }
    if (backTop) backTop.classList.toggle("is-visible", y > 900);
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
    if (how && howBar) {
      var hb = how.getBoundingClientRect();
      howBar.style.setProperty("--hp", clamp((vh * 0.6 - hb.top) / hb.height, 0, 1).toFixed(3));
    }
  }
  function requestFrame() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  if (lenis) lenis.on("scroll", requestFrame);
  window.addEventListener("scroll", requestFrame, { passive: true });
  window.addEventListener("resize", requestFrame, { passive: true });
  frame();
  if (backTop) backTop.addEventListener("click", function () { scrollToY(0); });

  /* ---------- Navigation ---------- */
  var toggle = $(".nav-toggle");
  var nav = $("#site-nav");
  if (toggle && nav) {
    var setOpen = function (open) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      nav.classList.toggle("is-open", open);
      document.body.classList.toggle("is-locked", open);
      if (lenis) open ? lenis.stop() : lenis.start();
    };
    toggle.addEventListener("click", function () { setOpen(toggle.getAttribute("aria-expanded") !== "true"); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && nav.classList.contains("is-open")) setOpen(false); });
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
  // Smooth in-page anchors
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href").slice(1), t = id && document.getElementById(id);
      if (!t) return;
      e.preventDefault();
      scrollToY(t.getBoundingClientRect().top + window.scrollY - 90);
      history.replaceState(null, "", "#" + id);
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

  /* ---------- Reveal on scroll ---------- */
  var heroTitle = $(".hero-title, .page-title, .noodle h1");
  var reveals = $$(".reveal, .img-reveal, [data-split], [data-reveal-letters]").filter(function (el) { return el !== heroTitle; });
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else reveals.forEach(function (el) { el.classList.add("is-in"); });

  /* ---------- Intro (home, first visit this session) ---------- */
  function showHero() {
    if (heroTitle) heroTitle.classList.add("is-in");
    var crew = $(".crew"); if (crew) crew.classList.add("is-ready");
  }
  if (doc.classList.contains("intro-on")) {
    if (lenis) lenis.stop();
    requestAnimationFrame(function () { doc.classList.add("intro-play"); });
    setTimeout(function () { doc.classList.add("intro-out"); }, 1250);
    setTimeout(showHero, 1650);
    setTimeout(function () {
      doc.classList.remove("intro-on", "intro-play", "intro-out");
      try { sessionStorage.setItem("meon-intro", "1"); } catch (e) {}
      if (lenis) lenis.start();
    }, 2350);
  } else requestAnimationFrame(function () { setTimeout(showHero, 60); });

  /* ---------- Pause decorative loops when off-screen ---------- */
  if ("IntersectionObserver" in window) {
    var po = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target.classList.toggle("is-off", !en.isIntersecting); });
    }, { rootMargin: "120px" });
    $$(".crew, .peeker, .logo-anim, .cta-mascots, .member-card, .mascot-stage, .flag--hero, .footer-big, .noodle-photo").forEach(function (el) { po.observe(el); });
  }

  /* ---------- Autoplay videos only when visible ---------- */
  var vids = $$("video[data-autoplay]");
  if (vids.length && "IntersectionObserver" in window) {
    var vio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var v = en.target;
        if (en.isIntersecting && !reduceMotion) { if (v.preload === "none") v.preload = "auto"; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        else v.pause();
      });
    }, { threshold: 0.25 });
    vids.forEach(function (v) { vio.observe(v); });
  }

  /* ---------- Count-up numbers ---------- */
  $$("[data-count]").forEach(function (el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    if (!target || reduceMotion || !("IntersectionObserver" in window)) return;
    var suffix = el.getAttribute("data-suffix") || "";
    el.textContent = "0" + suffix;
    var cio = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      cio.disconnect();
      var t0 = performance.now(), dur = 1400;
      (function tick(now) {
        var k = Math.min(1, (now - t0) / dur);
        el.textContent = Math.round(target * (1 - Math.pow(1 - k, 4))) + suffix;
        if (k < 1) requestAnimationFrame(tick);
      })(t0);
    });
    cio.observe(el);
  });

  /* ---------- Mascots: eyes follow the cursor, gentle drift, tap to hop & talk ---------- */
  if (finePointer && !reduceMotion) {
    var pupils = $$(".meo-pupils");
    var drifters = $$(".crew .meo");
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
      drifters.forEach(function (m, i) { var depth = 8 + (i % 4) * 6; m.style.translate = (-cx0 * depth).toFixed(1) + "px " + (-cy0 * depth).toFixed(1) + "px"; });
    };
    window.addEventListener("pointermove", function (e) { mx = e.clientX; my = e.clientY; if (!pending) { pending = true; requestAnimationFrame(look); } }, { passive: true });
  }
  var LINES = ["Egg on top? Always.", "Try a Buldak if you dare", "Twelve countries, one wall", "Scan a shelf QR code", "Cheese and ramen, trust me", "Spin the roulette", "Members save 10%", "Mind the steam"];
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

  /* ---------- Confetti (paper shapes in brand colours) ---------- */
  function confetti() {
    if (reduceMotion) return;
    var colors = ["#ec1b25", "#121010", "#ffc83d", "#ffffff"];
    var box = document.createElement("div");
    box.className = "confetti"; box.setAttribute("aria-hidden", "true");
    for (var i = 0; i < 44; i++) {
      var s = document.createElement("i");
      s.style.left = (Math.random() * 100) + "vw";
      s.style.background = colors[i % colors.length];
      if (i % 4 === 3) s.style.boxShadow = "0 0 0 1px rgba(18,16,16,.15)";
      s.style.setProperty("--x", ((Math.random() - 0.5) * 30) + "vw");
      s.style.setProperty("--r", ((Math.random() - 0.5) * 1080) + "deg");
      s.style.setProperty("--t", (1.8 + Math.random() * 1.6) + "s");
      s.style.animationDelay = (Math.random() * 0.4) + "s";
      if (i % 3 === 0) { s.style.width = "8px"; s.style.height = "8px"; s.style.borderRadius = "50%"; }
      box.appendChild(s);
    }
    document.body.appendChild(box);
    setTimeout(function () { box.remove(); }, 4000);
  }

  /* ---------- Site-wide search (Cmd/Ctrl K or "/") ---------- */
  var overlay = $("#search");
  var sInput = $("#site-search");
  var sResults = $("#search-results");
  var index = null, loading = null, active = -1, lastFocus = null;
  function loadIndex() {
    if (index) return Promise.resolve(index);
    if (loading) return loading;
    loading = fetch(ROOT + "search-index.json").then(function (r) { return r.json(); }).then(function (d) {
      index = d.map(function (x) { x._h = norm(x.t + " " + x.s + " " + (x.k || "")); x._t = norm(x.t); return x; });
      return index;
    }).catch(function () { index = []; return index; });
    return loading;
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
    var nq = norm(q.trim()), html = "";
    if (!nq) {
      html = '<div class="search-group">Popular searches</div><div class="search-suggest">' +
        ["Buldak", "Tom yum", "Vegan", "Japan", "Mi goreng", "Carbonara", "Curry", "Spicy"].map(function (s) { return '<button class="pill" type="button" data-suggest="' + s + '">' + s + "</button>"; }).join("") + "</div>";
      html += '<div class="search-group">Jump to</div>' + (index || []).filter(function (x) { return x.g === "Pages"; }).slice(0, 6).map(item).join("");
    } else {
      var terms = nq.split(/\s+/);
      var hits = (index || []).filter(function (x) { return terms.every(function (t) { return x._h.indexOf(t) !== -1; }); });
      hits.sort(function (a, b) {
        var sa = a._t.indexOf(nq) === 0 ? 0 : a._t.indexOf(nq) > -1 ? 1 : 2, sb = b._t.indexOf(nq) === 0 ? 0 : b._t.indexOf(nq) > -1 ? 1 : 2;
        return sa - sb;
      });
      if (!hits.length) html = '<div class="search-empty">No matches for “' + esc(q) + '”. Try a flavour like “kimchi” or a country like “Japan”.</div>';
      var groups = {};
      hits.slice(0, 40).forEach(function (x) { (groups[x.g] = groups[x.g] || []).push(x); });
      ["Noodles", "Countries", "Toppings", "Pages"].forEach(function (g) { if (groups[g]) html += '<div class="search-group">' + g + " · " + groups[g].length + "</div>" + groups[g].map(item).join(""); });
    }
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
    lastFocus = document.activeElement;
    overlay.classList.add("is-open");
    document.body.classList.add("is-locked");
    if (lenis) lenis.stop();
    loadIndex().then(function () { renderResults(sInput.value); });
    setTimeout(function () { sInput.focus(); sInput.select(); }, 40);
  }
  function closeSearch() {
    if (!overlay || !overlay.classList.contains("is-open")) return;
    overlay.classList.remove("is-open");
    document.body.classList.remove("is-locked");
    if (lenis) lenis.start();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  if (overlay) {
    $$("[data-search-open]").forEach(function (b) { b.addEventListener("click", openSearch); });
    $$("[data-search-close]", overlay).forEach(function (b) { b.addEventListener("click", closeSearch); });
    sInput.addEventListener("input", function () { renderResults(sInput.value); });
    sInput.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
      else if (e.key === "Enter") { var items = $$(".search-item", sResults); if (items[active]) { e.preventDefault(); location.href = items[active].href; } }
    });
    sResults.addEventListener("click", function (e) {
      var s = e.target.closest("[data-suggest]");
      if (s) { sInput.value = s.getAttribute("data-suggest"); renderResults(sInput.value); sInput.focus(); }
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

  /* ---------- Noodle library filters ---------- */
  var library = $("[data-library]");
  if (library) {
    var cards = $$(".noodle-card", library);
    var search = $("#q");
    var selCountry = $("#f-country"), selType = $("#f-type"), selSpice = $("#f-spice"), selDiet = $("#f-diet"), selSort = $("#f-sort");
    var countEl = $("[data-result-count]");
    var empty = $(".empty-state", library);
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
    var apply = function () {
      var q = norm(search ? search.value.trim() : "");
      var terms = q ? q.split(/\s+/) : [];
      var c = selCountry.value, t = selType.value, s = selSpice.value, d = selDiet.value;
      var shown = 0;
      cards.forEach(function (card) {
        var ds = card.dataset, hay = norm(ds.search);
        var ok = terms.every(function (term) { return hay.indexOf(term) !== -1; });
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
        if (ok) { shown++; card.classList.add("is-in"); }
      });
      var sorted = original.slice(), v = selSort ? selSort.value : "featured";
      if (v === "az") sorted.sort(function (a, b) { return a.dataset.name.localeCompare(b.dataset.name); });
      else if (v === "hot") sorted.sort(function (a, b) { return b.dataset.spice - a.dataset.spice; });
      else if (v === "mild") sorted.sort(function (a, b) { return a.dataset.spice - b.dataset.spice; });
      else if (v === "photo") sorted.sort(function (a, b) { return b.dataset.photo - a.dataset.photo; });
      sorted.forEach(function (el) { grid.appendChild(el); });
      if (countEl) countEl.textContent = shown === 1 ? "1 noodle" : shown + " noodles";
      if (empty) empty.classList.toggle("is-visible", shown === 0);
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
    var spinning = false, current = null;
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
      var picks = current ? [current] : [];
      for (var i = 0; i < 14; i++) picks.push(pool[Math.floor(Math.random() * pool.length)]);
      var winner = picks[picks.length - 1];
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
        reel.style.transition = "none";
        reel.innerHTML = itemHTML(winner);
        reel.style.transform = "translateY(0)";
        var live = $("[data-roulette-live]", roulette);
        if (live) live.textContent = "You got " + winner.brand + " " + winner.name;
        confetti();
        if (window.MeonMusic && window.MeonMusic.playing) window.MeonMusic.chime();
      };
      if (reduceMotion) done(); else setTimeout(done, 2700);
    });
  }

  /* ---------- Cook timer ---------- */
  $$("[data-timer]").forEach(function (timer) {
    var readout = $(".timer-readout", timer), prog = $(".prog", timer);
    var startBtn = $("[data-timer-start]", timer), resetBtn = $("[data-timer-reset]", timer);
    var presets = $$("[data-minutes]", timer), status = $("[data-timer-status]", timer);
    var buddy = $(".timer-buddy .meo", timer);
    var circ = 2 * Math.PI * 54;
    var total = parseInt(timer.getAttribute("data-default"), 10) * 60 || 240;
    var left = total, running = false, endAt = 0, raf = 0, wakeLock = null;
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
    var tick = function () {
      left = (endAt - Date.now()) / 1000;
      if (left <= 0) {
        left = 0; running = false; draw();
        timer.classList.remove("is-running"); timer.classList.add("is-done"); startBtn.textContent = "Start timer";
        if (status) status.textContent = "Ready. Time to eat.";
        beep(); releaseWake(); confetti();
        if (buddy) talk(buddy, "Noodles ready");
        return;
      }
      draw(); raf = requestAnimationFrame(tick);
    };
    var setTotal = function (mins) {
      cancelAnimationFrame(raf); running = false; releaseWake();
      total = mins * 60; left = total;
      timer.classList.remove("is-done", "is-running"); startBtn.textContent = "Start timer";
      if (status) status.textContent = "";
      presets.forEach(function (b) { b.setAttribute("aria-pressed", String(parseFloat(b.getAttribute("data-minutes")) === mins)); });
      draw();
    };
    startBtn.addEventListener("click", function () {
      if (running) { cancelAnimationFrame(raf); running = false; timer.classList.remove("is-running"); startBtn.textContent = "Resume"; releaseWake(); if (status) status.textContent = "Paused"; return; }
      if (left <= 0) { left = total; timer.classList.remove("is-done"); }
      running = true; endAt = Date.now() + left * 1000; startBtn.textContent = "Pause";
      timer.classList.add("is-running");
      if (status) status.textContent = "Cooking. Keep this page open.";
      if (navigator.wakeLock && navigator.wakeLock.request) navigator.wakeLock.request("screen").then(function (l) { wakeLock = l; }).catch(function () {});
      tick();
    });
    resetBtn.addEventListener("click", function () { setTotal(total / 60); });
    presets.forEach(function (b) { b.addEventListener("click", function () { setTotal(parseFloat(b.getAttribute("data-minutes"))); }); });
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
        s.src = ROOT + "assets/js/music.js?v=3"; s.onload = function () { res(window.MeonMusic); }; s.onerror = rej;
        document.head.appendChild(s);
      });
    };
    var reflect = function (on) {
      soundBtn.setAttribute("aria-pressed", String(on));
      soundBtn.setAttribute("aria-label", on ? "Pause background music" : "Play background music");
    };
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

  /* ---------- Year ---------- */
  $$("[data-year]").forEach(function (el) { el.textContent = String(new Date().getFullYear()); });
})();
