/* Meon play layer: the heat check and the sound prompt.
   Kept deliberately light: nothing runs until someone touches it, so scrolling and
   loading stay fast. Everything respects "reduce motion". */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var sfx = function (kind) { if (window.MeonMusic && window.MeonMusic.playing && window.MeonMusic[kind]) window.MeonMusic[kind](); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };

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
    // `keep`: the first call keeps the three picks the page was built with (the same ones), so nothing re-renders on load
    var update = function (lvl, bump, keep) {
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
      if (!keep) picks.innerHTML = pick.map(function (n, i) {
        var media = n.img ? '<img src="' + root + esc(n.img) + '" alt="" width="64" height="64" loading="lazy">' : '<img class="hp-flag" src="' + root + "assets/img/flags/" + esc(n.cc) + '.svg" alt="" width="40" height="30">';
        return '<li style="--n:' + i + '"><a href="' + root + "noodles/" + esc(n.slug) + '/"><span class="hp-media' + (n.img ? "" : " hp-media--flag") + '">' + media + "</span><span><strong>" + esc(n.name) + "</strong><small>" + esc(n.brand) + " · " + esc(n.country) + "</small></span>" + '<span aria-hidden="true">→</span></a></li>';
      }).join("") || "<li><small>No noodles at this level right now.</small></li>";
    };
    input.addEventListener("input", function () { update(+input.value, false); sfx("blip"); });
    update(+input.value, false, true);
  }

  /* ---------- Sound prompt: offer the soundtrack on the first visit to the home page ----------
     It waits until the full-screen hero has scrolled away, so it never covers the hero's buttons. Home only. */
  var soundBtn = $("[data-sound]");
  var vhero = $(".fhero");
  if (soundBtn && vhero && store.get("meon-sound") === null) {
    var offerSound = function () {
      var vibe = document.createElement("div");
      vibe.className = "vibe";
      vibe.setAttribute("role", "dialog");
      vibe.setAttribute("aria-label", "Turn on the Meon soundtrack");
      vibe.innerHTML = '<span class="vibe-eq" aria-hidden="true"><i></i><i></i><i></i></span><p>Turn the vibes on?</p><button class="vibe-yes" type="button">Sound on</button><button class="vibe-no" type="button">Not now</button>';
      document.body.appendChild(vibe);
      var close = function () { vibe.classList.remove("is-on"); setTimeout(function () { vibe.remove(); }, 800); };
      $(".vibe-yes", vibe).addEventListener("click", function () { soundBtn.click(); close(); });
      $(".vibe-no", vibe).addEventListener("click", function () { store.set("meon-sound", "off"); close(); });
      setTimeout(function () { vibe.classList.add("is-on"); }, 600);
      setTimeout(function () { if (document.body.contains(vibe)) close(); }, 14000);
    };
    var afterHero = function () {
      if (window.scrollY < vhero.offsetHeight * 0.8) return;
      window.removeEventListener("scroll", afterHero);
      offerSound();
    };
    window.addEventListener("scroll", afterHero, { passive: true });
  }
})();
