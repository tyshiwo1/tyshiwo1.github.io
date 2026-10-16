(function () {
  var btn = document.getElementById('sound');
  if (!btn) return;
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) { btn.style.display = 'none'; return; }

  var CYCLE_MS = 48000;

  /*
   * Voyage: all four colours live in D major and move I - IV(lydian) - V - I(sus2, high).
   * Every colour has its own voices; colours are crossfaded, never pitch-slid,
   * so there is no falling / being-pulled-away feeling.
   * order = same as the particles: gold, deep purple, crimson, nano pale blue
   */
  var MOODS = [
    { bass: 73.42,  pad: [146.83, 220.00, 293.66, 369.99], cut: 1500,
      scale: [293.66, 329.63, 369.99, 440.00, 493.88, 587.33] },             /* D  : dawn, warm */
    { bass: 98.00,  pad: [196.00, 293.66, 369.99, 493.88], cut: 1300,
      scale: [293.66, 329.63, 369.99, 392.00, 493.88, 587.33] },             /* G lydian : wonder */
    { bass: 110.00, pad: [220.00, 329.63, 440.00, 554.37], cut: 1700,
      scale: [329.63, 369.99, 440.00, 493.88, 554.37, 659.25] },             /* A  : lift-off */
    { bass: 73.42,  pad: [293.66, 440.00, 587.33, 659.25], cut: 2400,
      scale: [440.00, 493.88, 587.33, 659.25, 739.99, 880.00] }              /* Dsus2 high : starlight */
  ];

  var ctx = null, master, filter, wet, started = false, moodGain = [];
  var on = false, noteTimer = null, tickTimer = null, ownT0 = 0, lastIdx = 2;

  function phase() {
    if (typeof window.__homePhase === 'number') return window.__homePhase;
    return (performance.now() - ownT0) / CYCLE_MS;
  }
  function moodAt(ph) {
    var n = MOODS.length, p = (((ph % 1) + 1) % 1) * n;
    var i = Math.floor(p), f = p - i;
    f = f * f * (3 - 2 * f);
    return { i: i % n, j: (i + 1) % n, f: f };
  }

  function impulse(c, sec, decay) {
    var len = Math.floor(c.sampleRate * sec);
    var buf = c.createBuffer(2, len, c.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch);
      for (var k = 0; k < len; k++) d[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / len, decay);
    }
    return buf;
  }

  function build() {
    ctx = new AC();
    ownT0 = performance.now();

    master = ctx.createGain();
    master.gain.value = 0;
    /* safety net: gently squash any sudden peak */
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -30; comp.knee.value = 30; comp.ratio.value = 6;
    comp.attack.value = 0.05; comp.release.value = 0.6;
    master.connect(comp); comp.connect(ctx.destination);

    filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = MOODS[0].cut;
    filter.Q.value = 0.3;

    var dry = ctx.createGain(); dry.gain.value = 0.6;
    var conv = ctx.createConvolver(); conv.buffer = impulse(ctx, 6.5, 2.4);
    wet = ctx.createGain(); wet.gain.value = 0.85;
    filter.connect(dry); dry.connect(master);
    filter.connect(conv); conv.connect(wet); wet.connect(master);

    MOODS.forEach(function (m, mi) {
      var mg = ctx.createGain(); mg.gain.value = mi === 0 ? 1 : 0;
      mg.connect(filter);
      moodGain.push(mg);

      /* gentle root: soft, not a rumble */
      var bo = ctx.createOscillator(); bo.type = 'sine'; bo.frequency.value = m.bass;
      var bg = ctx.createGain(); bg.gain.value = 0.06;
      bo.connect(bg); bg.connect(mg); bo.start();

      /* open, wide pad: each chord note = two slightly detuned voices, with a slow breathing swell */
      m.pad.forEach(function (f, k) {
        var g = ctx.createGain(); g.gain.value = 0.04;
        var lfo = ctx.createOscillator(); lfo.frequency.value = 0.05 + Math.random() * 0.06;
        var lg = ctx.createGain(); lg.gain.value = 0.022;
        lfo.connect(lg); lg.connect(g.gain);
        [-4, 4].forEach(function (cents) {
          var o = ctx.createOscillator();
          o.type = k === 0 ? 'triangle' : 'sine';
          o.frequency.value = f; o.detune.value = cents;
          o.connect(g); o.start();
        });
        g.connect(mg); lfo.start();
      });

      /* star-glow: the top chord note an octave up, very quiet, shimmering */
      var so = ctx.createOscillator(); so.type = 'sine'; so.frequency.value = m.pad[m.pad.length - 1] * 2;
      var sg = ctx.createGain(); sg.gain.value = 0.012;
      var sl = ctx.createOscillator(); sl.frequency.value = 0.11;
      var slg = ctx.createGain(); slg.gain.value = 0.01;
      sl.connect(slg); slg.connect(sg.gain);
      so.connect(sg); sg.connect(mg); so.start(); sl.start();
    });
    started = true;
  }

  function steer() {
    if (!ctx || !on) return;
    var s = moodAt(phase()), now = ctx.currentTime;
    var a = MOODS[s.i], b = MOODS[s.j];
    filter.frequency.setTargetAtTime(a.cut + (b.cut - a.cut) * s.f, now, 0.8);
    var wi = Math.cos(s.f * Math.PI / 2), wj = Math.sin(s.f * Math.PI / 2);
    moodGain.forEach(function (g, k) {
      var w = k === s.i ? wi : (k === s.j ? wj : 0);
      g.gain.setTargetAtTime(w, now, 0.8);
    });
  }

  /* soft swell: slow fade-in, slow fade-out, pure tone only (no strike, no bright overtones) */
  function bell(freq, vel, when, pan) {
    var t = when || ctx.currentTime;
    var p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (p) p.pan.value = pan === undefined ? (Math.random() * 1.0 - 0.5) : pan;
    var out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(vel, t + 2.2);
    out.gain.exponentialRampToValueAtTime(0.0001, t + 9);
    [[1, 1], [2.0, 0.06]].forEach(function (h) {
      var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq * h[0];
      var g = ctx.createGain(); g.gain.value = h[1];
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t + 9.2);
    });
    if (p) { out.connect(p); p.connect(filter); } else { out.connect(filter); }
  }

  function currentMood() {
    var s = moodAt(phase());
    return MOODS[s.f < 0.5 ? s.i : s.j];
  }

  /* single notes drift upward more often than downward, and arrive slowly */
  function pluck() {
    if (!ctx || !on) return;
    var m = currentMood();
    var steps = [-1, 0, 1, 1, 2, 2];
    lastIdx += steps[Math.floor(Math.random() * steps.length)];
    if (lastIdx > m.scale.length - 1) lastIdx = 1;
    if (lastIdx < 0) lastIdx = 0;
    bell(m.scale[lastIdx], 0.05);
  }
  function scheduleNotes() {
    clearTimeout(noteTimer);
    if (!on) return;
    noteTimer = setTimeout(function () { pluck(); scheduleNotes(); }, 5000 + Math.random() * 5000);
  }

  var LABELS = ['Sound off', 'Ambient'];
  var mode = 0;   /* 0 = off, 1 = ambient */

  function setUI() {
    btn.classList.toggle('on', mode > 0);
    btn.setAttribute('aria-pressed', mode > 0 ? 'true' : 'false');
    var l = btn.querySelector('.lbl');
    if (l) l.textContent = LABELS[mode];
  }

  function start() {
    if (!started) build();
    on = true; setUI();
    ctx.resume();
    var now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0.5, now + 3);
    steer();
    clearInterval(tickTimer); tickTimer = setInterval(steer, 400);
    scheduleNotes();
    setTimeout(pluck, 2500);
  }
  function stop() {
    on = false; setUI();
    clearTimeout(noteTimer); clearInterval(tickTimer);
    if (ctx) {
      var now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0, now + 1.6);
      setTimeout(function () { if (!on && ctx) ctx.suspend(); }, 1900);
    }
  }

  /* one button, two states: ambient / off.
   * Serenity (js/bgm2.js) is parked: to bring it back, restore the script tag in
   * index.html and change this to a three-state cycle (off -> ambient -> serenity). */
  btn.addEventListener('click', function () {
    mode = (mode + 1) % 2;
    if (mode === 1) start();
    else stop();
    setUI();
  });

  document.addEventListener('visibilitychange', function () {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else if (on) ctx.resume();
  });

  /* sound starts only when the visitor presses the toggle - never from a stray click elsewhere */
  setUI();
})();
