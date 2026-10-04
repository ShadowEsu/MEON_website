/* MEON — progressive enhancement. Every page works without this file. */
(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.remove("no-js");
  doc.classList.add("js");

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ROOT = document.body.getAttribute("data-root") || "./";

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]; }); }
  function norm(s) { return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }

  /* ---------- Header, scroll progress, back to top ---------- */
  var header = $(".site-header");
  var progress = $(".scroll-progress span");
  var backTop = $(".back-top");
  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.scrollY;
    if (header) header.classList.toggle("is-scrolled", y > 8);
    if (progress) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.setProperty("--p", max > 0 ? Math.min(1, y / max).toFixed(4) : 0);
    }
    if (backTop) backTop.classList.toggle("is-visible", y > 900);
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  if (backTop) backTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }); });

  var toggle = $(".nav-toggle");
  var nav = $("#site-nav");
  if (toggle && nav) {
    var setOpen = function (open) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      nav.classList.toggle("is-open", open);
    };
    toggle.addEventListener("click", function () { setOpen(toggle.getAttribute("aria-expanded") !== "true"); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });
    document.addEventListener("click", function (e) { if (nav.classList.contains("is-open") && !nav.contains(e.target) && !toggle.contains(e.target)) setOpen(false); });
  }

  /* ---------- Reveal on scroll ---------- */
  var reveals = $$(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
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
    var started = false;
    var cio = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting || started) return;
      started = true; cio.disconnect();
      var t0 = performance.now(), dur = 1300;
      (function tick(now) {
        var k = Math.min(1, (now - t0) / dur);
        el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3))) + (el.getAttribute("data-suffix") || "");
        if (k < 1) requestAnimationFrame(tick);
      })(t0);
    });
    cio.observe(el);
  });

  /* ---------- Typewriter ---------- */
  var typed = $("[data-typer]");
  if (typed && !reduceMotion) {
    var words = [];
    try { words = JSON.parse(typed.getAttribute("data-typer")); } catch (e) { words = []; }
    if (words.length > 1) {
      var wi = 0, ci = words[0].length, deleting = true;
      var stepType = function () {
        var w = Array.from(words[wi]);
        if (deleting) {
          ci--;
          typed.textContent = w.slice(0, ci).join("");
          if (ci <= 0) { deleting = false; wi = (wi + 1) % words.length; }
          setTimeout(stepType, 38);
        } else {
          var nw = Array.from(words[wi]);
          ci++;
          typed.textContent = nw.slice(0, ci).join("");
          if (ci >= nw.length) { deleting = true; setTimeout(stepType, 1700); } else setTimeout(stepType, 70);
        }
      };
      setTimeout(stepType, 2200);
    }
  }

  /* ---------- Mascots: eyes follow the cursor, tap to hop & talk ---------- */
  var pupils = $$(".meo-pupils");
  if (pupils.length && !reduceMotion && window.matchMedia("(pointer: fine)").matches) {
    var mx = 0, my = 0, pending = false;
    var lookAt = function () {
      pending = false;
      pupils.forEach(function (p) {
        var svg = p.ownerSVGElement;
        if (!svg) return;
        var b = svg.getBoundingClientRect();
        if (b.bottom < 0 || b.top > window.innerHeight) return;
        var cx = b.left + b.width / 2, cy = b.top + b.height * 0.52;
        var dx = mx - cx, dy = my - cy, d = Math.sqrt(dx * dx + dy * dy) || 1;
        var k = Math.min(1, d / 300);
        p.setAttribute("transform", "translate(" + (dx / d * 4.5 * k).toFixed(2) + " " + (dy / d * 4.5 * k).toFixed(2) + ")");
      });
    };
    window.addEventListener("pointermove", function (e) { mx = e.clientX; my = e.clientY; if (!pending) { pending = true; requestAnimationFrame(lookAt); } }, { passive: true });
  }
  var LINES = ["Slurp slurp! 🍜", "Try the Buldak… if you dare 🔥", "Egg on top? Always 🥚", "12 countries, one wall!", "Have you scanned a shelf QR?", "Cheese + ramen = ❤️", "Spin the roulette!", "Members save 10% 💳"];
  $$(".meo").forEach(function (m, i) {
    var t;
    m.addEventListener("click", function () {
      var bubble = $(".meo-bubble", m);
      if (bubble && m.getAttribute("data-clicked")) bubble.textContent = LINES[(i + Math.floor(Math.random() * LINES.length)) % LINES.length];
      m.setAttribute("data-clicked", "1");
      m.classList.remove("is-hop"); void m.offsetWidth; m.classList.add("is-hop");
      m.classList.add("is-talking");
      clearTimeout(t); t = setTimeout(function () { m.classList.remove("is-talking", "is-hop"); }, 2200);
    });
  });

  /* ---------- Confetti ---------- */
  function confetti(chars) {
    if (reduceMotion) return;
    var box = document.createElement("div");
    box.className = "confetti";
    box.setAttribute("aria-hidden", "true");
    for (var i = 0; i < 36; i++) {
      var s = document.createElement("i");
      s.textContent = chars[i % chars.length];
      s.style.left = (Math.random() * 100) + "vw";
      s.style.setProperty("--x", ((Math.random() - 0.5) * 30) + "vw");
      s.style.setProperty("--r", ((Math.random() - 0.5) * 900) + "deg");
      s.style.setProperty("--t", (1.6 + Math.random() * 1.6) + "s");
      s.style.animationDelay = (Math.random() * 0.4) + "s";
      s.style.fontSize = (18 + Math.random() * 18) + "px";
      box.appendChild(s);
    }
    document.body.appendChild(box);
    setTimeout(function () { box.remove(); }, 3800);
  }

  /* ---------- Site-wide search (⌘K / Ctrl+K / "/") ---------- */
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
    return '<span class="thumb" aria-hidden="true">' + esc(x.e || "🍜") + "</span>";
  }
  function renderResults(q) {
    if (!sResults) return;
    var nq = norm(q.trim());
    var html = "";
    if (!nq) {
      html = '<div class="search-group">Popular searches</div><div class="search-suggest">' +
        ["Buldak", "Tom yum", "Vegan", "Japan", "Mi Goreng", "Carbonara", "Curry", "Spicy"].map(function (s) { return '<button class="pill" type="button" data-suggest="' + s + '">' + s + "</button>"; }).join("") + "</div>";
      var picks = (index || []).filter(function (x) { return x.g === "Pages"; }).slice(0, 6);
      html += '<div class="search-group">Jump to</div>' + picks.map(item).join("");
    } else {
      var terms = nq.split(/\s+/);
      var hits = (index || []).filter(function (x) { return terms.every(function (t) { return x._h.indexOf(t) !== -1; }); });
      hits.sort(function (a, b) {
        var sa = (a._t.indexOf(nq) === 0 ? 0 : a._t.indexOf(nq) > -1 ? 1 : 2), sb = (b._t.indexOf(nq) === 0 ? 0 : b._t.indexOf(nq) > -1 ? 1 : 2);
        return sa - sb;
      });
      if (!hits.length) html = '<div class="search-empty">No matches for “' + esc(q) + '”. Try a flavour like “kimchi” or a country like “Japan”.</div>';
      var groups = {};
      hits.slice(0, 40).forEach(function (x) { (groups[x.g] = groups[x.g] || []).push(x); });
      ["Noodles", "Countries", "Toppings", "Pages"].forEach(function (g) {
        if (groups[g]) html += '<div class="search-group">' + g + " · " + groups[g].length + "</div>" + groups[g].map(item).join("");
      });
    }
    sResults.innerHTML = html;
    active = -1;
    var first = $(".search-item", sResults);
    if (first && nq) setActive(0);
  }
  function item(x) {
    return '<a class="search-item" role="option" aria-selected="false" href="' + ROOT + esc(x.u) + '">' + thumb(x) + '<span><span class="t">' + esc(x.t) + '</span><br><span class="s">' + esc(x.s) + '</span></span><span class="go">↵</span></a>';
  }
  function setActive(i) {
    var items = $$(".search-item", sResults);
    if (!items.length) return;
    active = (i + items.length) % items.length;
    items.forEach(function (el, k) { el.setAttribute("aria-selected", k === active ? "true" : "false"); });
    items[active].scrollIntoView({ block: "nearest" });
  }
  function openSearch(prefill) {
    if (!overlay) return;
    lastFocus = document.activeElement;
    overlay.classList.add("is-open");
    document.body.classList.add("is-locked");
    if (typeof prefill === "string") sInput.value = prefill;
    loadIndex().then(function () { renderResults(sInput.value); });
    setTimeout(function () { sInput.focus(); sInput.select(); }, 30);
  }
  function closeSearch() {
    if (!overlay || !overlay.classList.contains("is-open")) return;
    overlay.classList.remove("is-open");
    document.body.classList.remove("is-locked");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  if (overlay) {
    $$("[data-search-open]").forEach(function (b) { b.addEventListener("click", function () { openSearch(); }); });
    $$("[data-search-close]", overlay).forEach(function (b) { b.addEventListener("click", closeSearch); });
    sInput.addEventListener("input", function () { renderResults(sInput.value); });
    sInput.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
      else if (e.key === "Enter") {
        var items = $$(".search-item", sResults);
        if (items[active]) { e.preventDefault(); location.href = items[active].href; }
      }
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
    // Platform-aware shortcut hint
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
        var ds = card.dataset;
        var hay = norm(ds.search);
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
      var sorted = original.slice();
      var v = selSort ? selSort.value : "featured";
      if (v === "az") sorted.sort(function (a, b) { return a.dataset.name.localeCompare(b.dataset.name); });
      else if (v === "hot") sorted.sort(function (a, b) { return b.dataset.spice - a.dataset.spice; });
      else if (v === "mild") sorted.sort(function (a, b) { return a.dataset.spice - b.dataset.spice; });
      else if (v === "photo") sorted.sort(function (a, b) { return b.dataset.photo - a.dataset.photo; });
      sorted.forEach(function (el) { grid.appendChild(el); });
      if (countEl) countEl.textContent = shown === 1 ? "1 noodle" : shown + " noodles";
      if (empty) empty.classList.toggle("is-visible", shown === 0);
      pills.forEach(function (b) { var sel = map[b.getAttribute("data-pill")]; b.setAttribute("aria-pressed", sel && sel.value === b.getAttribute("data-value") ? "true" : "false"); });
      writeParams();
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
    var itemHTML = function (n) {
      var img = n.img ? '<img src="' + root + esc(n.img) + '" alt="" width="130" height="130" loading="lazy">' : '<span class="placeholder-art" aria-hidden="true">🍜</span>';
      return '<a class="roulette-item" href="' + root + "noodles/" + esc(n.slug) + '/">' + img +
        '<span><span class="noodle-card-brand">' + esc(n.flag) + " " + esc(n.brand) + "</span><h3>" + esc(n.name) + "</h3>" +
        '<span class="chip chip--yellow">' + (n.spice > 0 ? "🌶️ " + n.spice + "/5" : n.spice < 0 ? "🌶️ Ask the crew" : "No heat") + "</span> " +
        (n.type ? '<span class="chip">' + esc(n.type) + "</span>" : "") + "</span></a>";
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
      void reel.offsetHeight;
      spinning = true; spinBtn.disabled = true;
      reel.style.transition = reduceMotion ? "none" : "";
      reel.style.transform = "translateY(-" + (picks.length - 1) * 300 + "px)";
      var done = function () {
        spinning = false; spinBtn.disabled = false; current = winner;
        reel.style.transition = "none";
        reel.innerHTML = itemHTML(winner);
        reel.style.transform = "translateY(0)";
        var live = $("[data-roulette-live]", roulette);
        if (live) live.textContent = "You got " + winner.brand + " " + winner.name;
        confetti(winner.spice >= 3 ? ["🌶️", "🔥", "🍜"] : ["🍜", "🥢", "🥚", "✨"]);
      };
      if (reduceMotion) done(); else setTimeout(done, 2700);
    });
  }

  /* ---------- Cook timer ---------- */
  $$("[data-timer]").forEach(function (timer) {
    var readout = $(".timer-readout", timer);
    var prog = $(".prog", timer);
    var startBtn = $("[data-timer-start]", timer);
    var resetBtn = $("[data-timer-reset]", timer);
    var presets = $$("[data-minutes]", timer);
    var status = $("[data-timer-status]", timer);
    var circ = 2 * Math.PI * 54;
    var total = parseInt(timer.getAttribute("data-default"), 10) * 60 || 240;
    var left = total, running = false, endAt = 0, raf = 0, wakeLock = null;
    prog.style.strokeDasharray = circ;
    var fmt = function (s) { var m = Math.floor(s / 60), r = s % 60; return m + ":" + (r < 10 ? "0" : "") + r; };
    var draw = function () { readout.textContent = fmt(Math.max(0, Math.ceil(left))); prog.style.strokeDashoffset = String(circ * (1 - left / total)); };
    var beep = function () {
      try {
        var Ctx = window.AudioContext || window.webkitAudioContext, ctx = new Ctx();
        [0, 0.35, 0.7].forEach(function (t) {
          var o = ctx.createOscillator(), g = ctx.createGain();
          o.type = "sine"; o.frequency.value = 880;
          g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
          g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + t + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.28);
          o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.3);
        });
      } catch (e) { /* audio not available */ }
      if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
    };
    var releaseWake = function () { if (wakeLock) { wakeLock.release().catch(function () {}); wakeLock = null; } };
    var tick = function () {
      left = (endAt - Date.now()) / 1000;
      if (left <= 0) {
        left = 0; running = false; draw();
        timer.classList.add("is-done"); startBtn.textContent = "Start";
        if (status) status.textContent = "Ready! Time to eat 🍜";
        beep(); releaseWake(); confetti(["🍜", "🥢", "✨"]);
        return;
      }
      draw(); raf = requestAnimationFrame(tick);
    };
    var setTotal = function (mins) {
      cancelAnimationFrame(raf); running = false; releaseWake();
      total = mins * 60; left = total;
      timer.classList.remove("is-done"); startBtn.textContent = "Start";
      if (status) status.textContent = "";
      presets.forEach(function (b) { b.setAttribute("aria-pressed", String(parseFloat(b.getAttribute("data-minutes")) === mins)); });
      draw();
    };
    startBtn.addEventListener("click", function () {
      if (running) { cancelAnimationFrame(raf); running = false; startBtn.textContent = "Resume"; releaseWake(); if (status) status.textContent = "Paused"; return; }
      if (left <= 0) { left = total; timer.classList.remove("is-done"); }
      running = true; endAt = Date.now() + left * 1000; startBtn.textContent = "Pause";
      if (status) status.textContent = "Cooking…";
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
        var old = btn.innerHTML; btn.textContent = "Link copied!";
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
    var logo = new Image();
    var logoReady = false;
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
    var build = function () {
      var qr = window.qrcode(0, el.logo.checked ? "H" : "M");
      qr.addData(unescape(encodeURIComponent(payload())));
      qr.make();
      return qr;
    };
    var drawQR = function () {
      var qr;
      try { qr = build(); } catch (e) { el.info.textContent = "That's too much text for one QR code — try a shorter link."; return; }
      var size = parseInt(el.size.value, 10), label = el.label.value.trim();
      el.sizeOut.textContent = size;
      var n = qr.getModuleCount(), quiet = 4, labelH = label ? Math.round(size * 0.12) : 0;
      var cell = size / (n + quiet * 2);
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
        ctx.font = "800 " + Math.round(labelH * 0.5) + "px 'Bricolage Grotesque', 'DM Sans', sans-serif";
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
        (label ? '<text x="' + dim / 2 + '" y="' + (dim + 1.4) + '" font-family="Bricolage Grotesque, DM Sans, sans-serif" font-weight="800" font-size="1.6" text-anchor="middle" fill="' + el.fg.value + '">' + esc(label) + "</text>" : "") + "</svg>";
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

  /* ---------- Mega menu (Noodles) ---------- */
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
    item.addEventListener("mouseleave", function () { if (window.matchMedia("(min-width: 961px)").matches) set(false); });
  });

  /* ---------- Split headline words for a staggered rise ---------- */
  if (!reduceMotion) {
    $$("[data-split]").forEach(function (el) {
      var i = 0;
      var walk = function (node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (child) {
          if (child.nodeType === 3) {
            var parts = child.textContent.split(/(\s+)/);
            var frag = document.createDocumentFragment();
            parts.forEach(function (part) {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
              var w = document.createElement("span");
              w.className = "w";
              var inner = document.createElement("span");
              inner.style.setProperty("--i", i++);
              inner.textContent = part;
              w.appendChild(inner);
              frag.appendChild(w);
            });
            node.replaceChild(frag, child);
          } else if (child.nodeType === 1) walk(child);
        });
      };
      if (!el.getAttribute("aria-label")) el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
      walk(el);
      $$(".w", el).forEach(function (w) { w.setAttribute("aria-hidden", "true"); });
      el.classList.add("is-split");
    });
  }

  /* ---------- Card tilt + spotlight (mouse / pen only) ---------- */
  var finePointer = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (finePointer && !reduceMotion) {
    $$(".noodle-card, .country-tile, .step, .topping, .info-card, .roulette-item, .qr-card").forEach(function (card) {
      card.classList.add("tilt");
      var raf = 0, ev = null;
      var paint = function () {
        raf = 0;
        if (!ev) return;
        var b = card.getBoundingClientRect();
        var px = (ev.clientX - b.left) / b.width, py = (ev.clientY - b.top) / b.height;
        card.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
        card.style.setProperty("--my", (py * 100).toFixed(1) + "%");
        card.style.transform = "perspective(900px) rotateX(" + ((0.5 - py) * 7).toFixed(2) + "deg) rotateY(" + ((px - 0.5) * 9).toFixed(2) + "deg) translateY(-4px)";
      };
      card.addEventListener("pointerenter", function () { card.classList.add("is-tilting"); });
      card.addEventListener("pointermove", function (e) { ev = e; if (!raf) raf = requestAnimationFrame(paint); });
      card.addEventListener("pointerleave", function () { ev = null; card.classList.remove("is-tilting"); card.style.transform = ""; });
    });

    /* Crew parallax: the floating mascots drift away from the cursor */
    var crews = $$(".crew");
    if (crews.length) {
      var cx = 0, cy = 0, pend = false;
      var drift = function () {
        pend = false;
        crews.forEach(function (crew) {
          $$(".meo", crew).forEach(function (m, k) {
            var depth = 6 + (k % 4) * 5;
            m.style.translate = (-cx * depth).toFixed(1) + "px " + (-cy * depth).toFixed(1) + "px";
          });
        });
      };
      window.addEventListener("pointermove", function (e) {
        cx = e.clientX / window.innerWidth - 0.5; cy = e.clientY / window.innerHeight - 0.5;
        if (!pend) { pend = true; requestAnimationFrame(drift); }
      }, { passive: true });
    }
  }

  /* ---------- Year ---------- */
  $$("[data-year]").forEach(function (el) { el.textContent = String(new Date().getFullYear()); });
})();
