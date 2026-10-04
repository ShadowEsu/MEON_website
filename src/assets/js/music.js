/* MEON background music: an original, endlessly varying lo-fi loop generated with the Web Audio API.
   Soft electric piano chords, a round bass, brushed drums and a little vinyl crackle. Nothing is downloaded.
   Exposes window.MeonMusic = { start, stop, blip, chime, playing }. */
(function () {
  "use strict";
  var Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) { window.MeonMusic = { start: function () {}, stop: function () {}, blip: function () {}, chime: function () {}, playing: false }; return; }

  var ctx = null, master, bus, wet, noise, crackleSrc, timer = null;
  var BPM = 76, STEP = 60 / BPM / 4, SWING = 0.14, LOOKAHEAD = 0.14;
  var nextTime = 0, step = 0, bar = 0;
  // Fmaj9 – Em7 – Dm9 – Cmaj7(add9): warm, unresolved, easy to listen to for a long time.
  var CHORDS = [[53, 57, 60, 64, 67], [52, 55, 59, 62, 66], [50, 53, 57, 60, 64], [48, 52, 55, 59, 62]];
  var SCALE = [60, 62, 64, 67, 69, 72, 74, 76];
  var hz = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };

  function setup() {
    ctx = new Ctx();
    master = ctx.createGain(); master.gain.value = 0;
    var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;
    var tone = ctx.createBiquadFilter(); tone.type = "lowpass"; tone.frequency.value = 5200; tone.Q.value = 0.3;
    bus = ctx.createGain(); bus.gain.value = 1;
    // Small generated room reverb
    var conv = ctx.createConvolver(), len = Math.floor(ctx.sampleRate * 2.2), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var c = 0; c < 2; c++) { var d = ir.getChannelData(c); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    conv.buffer = ir;
    wet = ctx.createGain(); wet.gain.value = 0.22;
    bus.connect(tone); bus.connect(conv); conv.connect(wet); wet.connect(tone);
    tone.connect(comp); comp.connect(master); master.connect(ctx.destination);
    // Shared white-noise buffer (drums + crackle)
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    var nd = noise.getChannelData(0); for (var k = 0; k < nd.length; k++) nd[k] = Math.random() * 2 - 1;
  }

  function env(g, t, a, peak, dec, sus, rel, end) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sus), t + a + dec);
    g.gain.setValueAtTime(Math.max(0.0001, sus), end);
    g.gain.exponentialRampToValueAtTime(0.0001, end + rel);
  }

  function keys(notes, t, len, vel) {
    var lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1900 + Math.random() * 400; lp.connect(bus);
    var trem = ctx.createGain(); trem.gain.value = 1; trem.connect(lp);
    var lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.frequency.value = 4.2; lfoG.gain.value = 0.12; lfo.connect(lfoG); lfoG.connect(trem.gain);
    lfo.start(t); lfo.stop(t + len + 1.2);
    notes.forEach(function (m, i) {
      var tt = t + i * 0.012; // a tiny human strum
      [["sine", 0], ["triangle", 6]].forEach(function (o, j) {
        var osc = ctx.createOscillator(), g = ctx.createGain();
        osc.type = o[0]; osc.frequency.value = hz(m); osc.detune.value = o[1];
        env(g, tt, 0.012, (j ? 0.035 : 0.06) * vel, 1.2, (j ? 0.008 : 0.014) * vel, 0.9, tt + len);
        osc.connect(g); g.connect(trem); osc.start(tt); osc.stop(tt + len + 1.1);
      });
    });
  }

  function bass(m, t, len) {
    var osc = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    osc.type = "sine"; osc.frequency.value = hz(m - 24); lp.type = "lowpass"; lp.frequency.value = 420;
    env(g, t, 0.02, 0.32, 0.4, 0.16, 0.25, t + len);
    osc.connect(lp); lp.connect(g); g.connect(bus); osc.start(t); osc.stop(t + len + 0.4);
  }

  function kick(t, vel) {
    var osc = ctx.createOscillator(), g = ctx.createGain();
    osc.frequency.setValueAtTime(115, t); osc.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.55 * vel, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    osc.connect(g); g.connect(bus); osc.start(t); osc.stop(t + 0.35);
  }

  function hit(t, type, vel) {
    var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noise;
    if (type === "snare") { f.type = "bandpass"; f.frequency.value = 1700; f.Q.value = 0.8; }
    else { f.type = "highpass"; f.frequency.value = 7200; }
    var dur = type === "snare" ? 0.22 : 0.05;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime((type === "snare" ? 0.16 : 0.045) * vel, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(bus); src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
    if (type === "snare") { var o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.value = 185; og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.06 * vel, t + 0.004); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.09); o.connect(og); og.connect(bus); o.start(t); o.stop(t + 0.1); }
  }

  function lead(m, t, len) {
    var osc = ctx.createOscillator(), g = ctx.createGain(), vib = ctx.createOscillator(), vg = ctx.createGain();
    osc.type = "sine"; osc.frequency.value = hz(m + 12);
    vib.frequency.value = 5; vg.gain.value = 3.5; vib.connect(vg); vg.connect(osc.frequency);
    env(g, t, 0.05, 0.045, 0.3, 0.025, 0.6, t + len);
    osc.connect(g); g.connect(bus); osc.start(t); vib.start(t); osc.stop(t + len + 0.7); vib.stop(t + len + 0.7);
  }

  function crackle() {
    crackleSrc = ctx.createBufferSource(); crackleSrc.buffer = noise; crackleSrc.loop = true;
    var hp = ctx.createBiquadFilter(), g = ctx.createGain(); hp.type = "highpass"; hp.frequency.value = 3000; g.gain.value = 0.006;
    crackleSrc.connect(hp); hp.connect(g); g.connect(master); crackleSrc.start();
  }

  function schedule() {
    while (nextTime < ctx.currentTime + LOOKAHEAD) {
      var s = step % 16, t = nextTime + (s % 2 ? STEP * SWING : 0);
      var chord = CHORDS[bar % CHORDS.length];
      if (s === 0) { keys(chord.slice(1), t, STEP * 12, 0.9 + Math.random() * 0.2); bass(chord[0], t, STEP * 5); }
      if (s === 6 && Math.random() < 0.55) keys(chord.slice(2), t, STEP * 5, 0.55);
      if (s === 8) bass(chord[0] + (Math.random() < 0.3 ? 7 : 0), t, STEP * 3);
      if (s === 14 && Math.random() < 0.5) bass(chord[0] + 12, t, STEP * 1.5);
      if (s === 0 || s === 10 || (s === 7 && Math.random() < 0.35)) kick(t, s === 0 ? 1 : 0.8);
      if (s === 4 || s === 12) hit(t, "snare", 0.9 + Math.random() * 0.2);
      if (s % 2 === 0) hit(t, "hat", s % 4 === 0 ? 1 : 0.6 + Math.random() * 0.3);
      if (bar % 4 >= 2 && (s === 2 || s === 9) && Math.random() < 0.45) lead(SCALE[Math.floor(Math.random() * SCALE.length)], t, STEP * 3);
      nextTime += STEP; step++;
      if (step % 16 === 0) bar++;
    }
  }

  var api = {
    playing: false,
    start: function () {
      if (!ctx) { setup(); crackle(); }
      if (ctx.state === "suspended") ctx.resume();
      var now = ctx.currentTime;
      master.gain.cancelScheduledValues(now); master.gain.setValueAtTime(master.gain.value, now); master.gain.linearRampToValueAtTime(0.32, now + 2.4);
      nextTime = now + 0.06; step = 0;
      clearInterval(timer); timer = setInterval(schedule, 25); schedule();
      api.playing = true;
    },
    stop: function () {
      if (!ctx) return;
      var now = ctx.currentTime;
      master.gain.cancelScheduledValues(now); master.gain.setValueAtTime(master.gain.value, now); master.gain.linearRampToValueAtTime(0, now + 0.6);
      clearInterval(timer); timer = null;
      setTimeout(function () { if (!api.playing && ctx) ctx.suspend(); }, 700);
      api.playing = false;
    },
    blip: function () {
      if (!ctx || !api.playing) return;
      var t = ctx.currentTime + 0.01, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(hz(84), t); o.frequency.exponentialRampToValueAtTime(hz(91), t + 0.08);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.08, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.25);
    },
    chime: function () {
      if (!ctx || !api.playing) return;
      [72, 76, 79, 84].forEach(function (m, i) { lead(m - 12, ctx.currentTime + 0.02 + i * 0.09, 0.25); });
    },
  };
  window.MeonMusic = api;
})();
