/* MEON play layer: throwable mascots, build-your-bowl, heat check and the sound prompt.
   Kept deliberately light: nothing runs until someone touches it, so scrolling and
   loading stay fast. Everything respects "reduce motion". */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var M = window.MEON || {};
  var sfx = function (kind) { if (window.MeonMusic && window.MeonMusic.playing && window.MeonMusic[kind]) window.MeonMusic[kind](); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };

  /* ---------- Throwable mascots around the hero ---------- */
  var crewBox = $(".hero .crew");
  if (crewBox && !reduceMotion) {
    $$(".meo", crewBox).forEach(function (m) {
      var drag = null, block = false;
      m.addEventListener("pointerdown", function (e) {
        if (e.button !== 0) return;
        var box = crewBox.getBoundingClientRect(), r = m.getBoundingClientRect();
        drag = { id: e.pointerId, ox: e.clientX - r.left, oy: e.clientY - r.top, sx: e.clientX, sy: e.clientY, moved: false, vx: 0, vy: 0, lx: e.clientX, ly: e.clientY, lt: performance.now(), box: box };
        cancelAnimationFrame(m._fly);
        m.setPointerCapture(e.pointerId);
      });
      m.addEventListener("pointermove", function (e) {
        if (!drag || e.pointerId !== drag.id) return;
        if (!drag.moved && Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) < 6) return;
        if (!drag.moved) { drag.moved = true; m.classList.add("is-dragging"); }
        var now = performance.now(), dt = Math.max(8, now - drag.lt);
        drag.vx = (e.clientX - drag.lx) / dt * 16; drag.vy = (e.clientY - drag.ly) / dt * 16;
        drag.lx = e.clientX; drag.ly = e.clientY; drag.lt = now;
        m.style.left = (e.clientX - drag.box.left - drag.ox) + "px";
        m.style.top = (e.clientY - drag.box.top - drag.oy) + "px";
        m.style.rotate = Math.max(-25, Math.min(25, drag.vx * 2)) + "deg";
      });
      var release = function (e) {
        if (!drag || e.pointerId !== drag.id) return;
        var d = drag; drag = null;
        m.classList.remove("is-dragging");
        if (!d.moved) return;
        block = true; setTimeout(function () { block = false; }, 50);
        if (M.talk) M.talk(m, ["Wheee!", "Again!", "I can fly", "Put me down!", "Noodle launch"][Math.floor(Math.random() * 5)]);
        var x = parseFloat(m.style.left), y = parseFloat(m.style.top), vx = d.vx, vy = d.vy, rot = parseFloat(m.style.rotate) || 0;
        var W = d.box.width - m.offsetWidth, H = d.box.height - m.offsetHeight;
        var fly = function () {
          vx *= 0.94; vy *= 0.94; x += vx; y += vy; rot *= 0.92;
          if (x < 0) { x = 0; vx = -vx * 0.6; } if (x > W) { x = W; vx = -vx * 0.6; }
          if (y < 0) { y = 0; vy = -vy * 0.6; } if (y > H) { y = H; vy = -vy * 0.6; }
          m.style.left = x + "px"; m.style.top = y + "px"; m.style.rotate = rot.toFixed(1) + "deg";
          if (Math.abs(vx) + Math.abs(vy) > 0.3) m._fly = requestAnimationFrame(fly); else m.style.rotate = "0deg";
        };
        m._fly = requestAnimationFrame(fly);
      };
      m.addEventListener("pointerup", release);
      m.addEventListener("pointercancel", release);
      m.addEventListener("click", function (e) { if (block) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
    });
  }

  /* ---------- Build your bowl ---------- */
  var bowl = $("[data-bowl]");
  if (bowl) {
    var stage = $("[data-bowl-stage]", bowl), itemsBox = $("[data-bowl-items]", bowl), count = $("[data-bowl-count]", bowl);
    var added = [];
    var LINES = ["Your bowl is empty. Add something.", "Good start.", "Now we're talking.", "Now we're talking.", "That's a proper bowl.", "That's a proper bowl.", "Chef's kiss.", "Absolute unit of a bowl."];
    var say = function () {
      var names = added.map(function (a) { return a.name; });
      var uniq = names.filter(function (n, i) { return names.indexOf(n) === i; });
      var list = uniq.slice(0, 4).join(", ") + (uniq.length > 4 ? " and more" : "");
      count.textContent = added.length ? LINES[Math.min(added.length, LINES.length - 1)].replace(/\.$/, "") + ": " + list + "." : LINES[0];
    };
    var drop = function (btn, quiet) {
      var item = document.createElement("span");
      item.className = "bb-item";
      item.innerHTML = $(".bb-ic", btn).innerHTML;
      var x = 8 + Math.random() * 84, y = 20 + Math.random() * 70;
      item.style.left = x + "%"; item.style.top = y + "%";
      item.style.setProperty("--rot", ((Math.random() * 70) - 35).toFixed(0) + "deg");
      itemsBox.appendChild(item);
      added.push({ el: item, name: btn.getAttribute("data-name").toLowerCase() });
      if (added.length > 14) { var old = added.shift(); old.el.remove(); }
      if (!reduceMotion && item.animate) {
        item.animate([{ transform: "translate(-50%, -360%) rotate(0deg) scale(.7)", opacity: 0 }, { opacity: 1, offset: 0.25 }, { transform: "translate(-50%, -50%) rotate(var(--rot)) scale(1.12)", offset: 0.75 }, { transform: "translate(-50%, -50%) rotate(var(--rot)) scale(1)" }], { duration: 650, easing: "cubic-bezier(.3,.7,.3,1.2)" });
        stage.classList.remove("is-wobble"); void stage.offsetWidth; stage.classList.add("is-wobble");
      }
      if (!quiet) sfx("blip");
      say();
    };
    $$("[data-topping]", bowl).forEach(function (btn) { btn.addEventListener("click", function () { drop(btn); }); });
    $("[data-bowl-reset]", bowl).addEventListener("click", function () {
      added.forEach(function (a, i) {
        if (!reduceMotion && a.el.animate) a.el.animate([{ opacity: 1 }, { transform: "translate(-50%, -420%) rotate(90deg)", opacity: 0 }], { duration: 450, delay: i * 25, easing: "ease-in", fill: "forwards" }).onfinish = function () { a.el.remove(); };
        else a.el.remove();
      });
      added = []; say();
    });
    if ("IntersectionObserver" in window) {
      var bio = new IntersectionObserver(function (en) {
        if (!en[0].isIntersecting) return;
        bio.disconnect();
        var chips = $$("[data-topping]", bowl);
        [0, 4].forEach(function (k, i) { setTimeout(function () { if (!added.length || i) drop(chips[k], true); }, 500 + i * 450); });
      }, { threshold: 0.5 });
      bio.observe(stage);
    }
  }

  /* ---------- Heat check ---------- */
  var heat = $("[data-heat]");
  var dataEl = $("#noodle-data");
  if (heat && dataEl) {
    var all = [], ladder = [];
    try { all = JSON.parse(dataEl.textContent); ladder = JSON.parse($("#heat-copy").textContent); } catch (e) {}
    var root = ($("[data-roulette]") || {}).getAttribute ? $("[data-roulette]").getAttribute("data-root") || "" : "";
    var input = $("[data-heat-input]", heat), picks = $("[data-heat-picks]", heat);
    var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
    var offset = 0;
    var update = function (lvl, bump) {
      var row = ladder[lvl] || [lvl, "", ""];
      heat.setAttribute("data-level", lvl);
      heat.style.setProperty("--heat", (lvl / 5).toFixed(2));
      $("[data-heat-level]", heat).textContent = lvl + " · " + row[1];
      $("[data-heat-desc]", heat).textContent = row[2];
      $("[data-heat-n]", heat).textContent = lvl;
      $("[data-heat-link]", heat).setAttribute("href", root + "noodles/?spice=" + lvl);
      input.setAttribute("aria-valuetext", lvl + ", " + row[1]);
      var meo = $("[data-heat-meo]", heat); if (meo) meo.style.transform = "scale(" + (0.9 + lvl * 0.05) + ")";
      var pool = all.filter(function (n) { return n.spice === lvl; });
      pool.sort(function (a, b) { return (b.img ? 1 : 0) - (a.img ? 1 : 0); });
      if (bump) offset += 3;
      var pick = pool.length ? [0, 1, 2].map(function (i) { return pool[(offset + i) % pool.length]; }).filter(function (n, i, arr) { return arr.indexOf(n) === i; }) : [];
      picks.innerHTML = pick.map(function (n, i) {
        var media = n.img ? '<img src="' + root + esc(n.img) + '" alt="" width="64" height="64" loading="lazy">' : '<img class="hp-flag" src="' + root + "assets/img/flags/" + esc(n.cc) + '.svg" alt="" width="40" height="30">';
        return '<li style="--n:' + i + '"><a href="' + root + "noodles/" + esc(n.slug) + '/"><span class="hp-media' + (n.img ? "" : " hp-media--flag") + '">' + media + "</span><span><strong>" + esc(n.name) + "</strong><small>" + esc(n.brand) + " · " + esc(n.country) + "</small></span>" + '<span aria-hidden="true">→</span></a></li>';
      }).join("") || "<li><small>No noodles at this level right now.</small></li>";
    };
    input.addEventListener("input", function () { update(+input.value, false); sfx("blip"); });
    update(+input.value, false);
  }

  /* ---------- Sound prompt: offer the soundtrack on the first visit to the home page ---------- */
  var soundBtn = $("[data-sound]");
  if (soundBtn && $(".hero--launch") && store.get("meon-sound") === null) {
    var vibe = document.createElement("div");
    vibe.className = "vibe";
    vibe.setAttribute("role", "dialog");
    vibe.setAttribute("aria-label", "Turn on the MEON soundtrack");
    vibe.innerHTML = '<span class="vibe-eq" aria-hidden="true"><i></i><i></i><i></i></span><p>Turn the vibes on?</p><button class="vibe-yes" type="button">Sound on</button><button class="vibe-no" type="button">Not now</button>';
    document.body.appendChild(vibe);
    var close = function () { vibe.classList.remove("is-on"); setTimeout(function () { vibe.remove(); }, 800); };
    $(".vibe-yes", vibe).addEventListener("click", function () { soundBtn.click(); close(); });
    $(".vibe-no", vibe).addEventListener("click", function () { store.set("meon-sound", "off"); close(); });
    setTimeout(function () { vibe.classList.add("is-on"); }, 1800);
    setTimeout(function () { if (document.body.contains(vibe)) close(); }, 16000);
  }
})();
