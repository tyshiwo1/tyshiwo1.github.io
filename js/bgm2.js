/*
 * BGM2 - "Serenity": an original, fully written-out Web Audio composition.
 *
 * The melody and harmony are newly written for this site; nothing is
 * sampled or transcribed.
 *
 * Mood target: a long, drifting, slightly fated feeling - NOT a lament.
 *   - harmony starts on the major side (Gmaj7) and the loop ends on an
 *     unresolved Asus4, so it never "closes"
 *   - melodies are singable: a short motif, repeated and lifted, with chord
 *     tones on the strong beats and passing notes between them
 *   - a soft rolling piano keeps gentle forward motion
 *
 * Deterministic: the same notes on every loop. Key D major / B minor (the
 * same pitch set as the homepage's D major ambient bed). 68 BPM, 4/4, one
 * chord per bar, 16 bars (~56s).
 *
 * Chords per 8-bar phrase:  Gmaj7  D/F#  Em7  Bm7  Gmaj7  D/F#  Em7  Asus4
 *
 * Instruments (all through one bowed-string voice, see bowed()):
 *   violin       - melody, and one soft inner chord tone
 *   viola        - three inner chord tones
 *   cello        - root of each chord (second half), doubles the melody an octave down
 *   double bass  - root two octaves below the chord, plus a quiet octave-up sine so small speakers hear it
 *   piano        - slow rolling figure, one note per beat
 */
(function () {
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;

  var BPM = 68;
  var BEAT = 60 / BPM;
  var BAR = BEAT * 4;

  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  /* ---------------- score ---------------- */

  /* bass = MIDI of the bass note; t = chord tones (MIDI) */
  var CH = {
    Gmaj7: { bass: 43, t: [55, 59, 62, 66] },   /* G  B  D  F#  */
    DF:    { bass: 42, t: [57, 62, 66, 69] },   /* D/F#: A D F# A */
    Em7:   { bass: 40, t: [55, 59, 62, 67] },   /* E  G  B  D   */
    Bm7:   { bass: 47, t: [54, 57, 62, 66] },   /* B  F# A  D   */
    Asus4: { bass: 45, t: [52, 57, 62, 64] }    /* A  E  A  D  E (sus4) */
  };
  var PHRASE = ['Gmaj7', 'DF', 'Em7', 'Bm7', 'Gmaj7', 'DF', 'Em7', 'Asus4'];
  var SONG = PHRASE.concat(PHRASE);
  var NBARS = SONG.length;

  /* Seven original melodies over the same eight-bar chord loop. Per bar:
   * [beat, MIDI, length in beats]. Pick one with ?mel=1..7 in the URL, the
   * 1-7 keys while Serenity plays, or __bgm2.melody(n) from the console. */
  var MELODIES = [
    /* 1 Song: long-short-long motif (B4 D5 then a held note) lifted each time,
     *   two four-bar phrases, the second climbing to the peak A5 */
    { name: 'Song', bars: [
      [[0, 71, 1.5], [1.5, 74, 0.5], [2, 78, 2]],     /* Gmaj7 : B4 D5 F#5       */
      [[0, 76, 1.5], [1.5, 74, 0.5], [2, 69, 2]],     /* D/F#  : E5 D5 A4        */
      [[0, 71, 1.5], [1.5, 74, 0.5], [2, 79, 2]],     /* Em7   : B4 D5 G5        */
      [[0, 78, 1.5], [1.5, 76, 0.5], [2, 74, 1], [3, 73, 1]], /* Bm7 : F#5 E5 D5 C#5 */
      [[0, 71, 1.5], [1.5, 74, 0.5], [2, 79, 1], [3, 81, 1]], /* Gmaj7 : B4 D5 G5 A5 */
      [[0, 81, 1.5], [1.5, 79, 0.5], [2, 78, 2]],     /* D/F#  : A5 G5 F#5       */
      [[0, 79, 1], [1, 78, 1], [2, 76, 2]],           /* Em7   : G5 F#5 E5       */
      [[0, 74, 2], [2, 76, 2]]                        /* Asus4 : D5 E5 (open)    */
    ] },
    /* 2 Echo: rising arpeggio, then a stepwise answer that falls back */
    { name: 'Echo', bars: [
      [[0, 74, 1], [1, 78, 1], [2, 81, 2]],           /* Gmaj7 : D5 F#5 A5       */
      [[0, 78, 1.5], [1.5, 76, 0.5], [2, 74, 2]],     /* D/F#  : F#5 E5 D5       */
      [[0, 76, 1], [1, 79, 1], [2, 83, 2]],           /* Em7   : E5 G5 B5        */
      [[0, 81, 1.5], [1.5, 78, 0.5], [2, 74, 2]],     /* Bm7   : A5 F#5 D5       */
      [[0, 74, 1], [1, 78, 1], [2, 81, 2]],           /* Gmaj7 : D5 F#5 A5       */
      [[0, 78, 1.5], [1.5, 79, 0.5], [2, 81, 2]],     /* D/F#  : F#5 G5 A5       */
      [[0, 79, 2], [2, 76, 2]],                       /* Em7   : G5 E5           */
      [[0, 74, 2], [2, 76, 2]]                        /* Asus4 : D5 E5 (open)    */
    ] },
    /* 3 Arch: long stepwise arcs that rise for two bars, then ease over */
    { name: 'Arch', bars: [
      [[0, 71, 1], [1, 73, 1], [2, 74, 2]],           /* Gmaj7 : B4 C#5 D5       */
      [[0, 76, 2], [2, 78, 2]],                       /* D/F#  : E5 F#5          */
      [[0, 79, 3], [3, 78, 1]],                       /* Em7   : G5 F#5          */
      [[0, 76, 2], [2, 74, 2]],                       /* Bm7   : E5 D5           */
      [[0, 74, 1], [1, 76, 1], [2, 78, 2]],           /* Gmaj7 : D5 E5 F#5       */
      [[0, 79, 2], [2, 81, 2]],                       /* D/F#  : G5 A5           */
      [[0, 83, 3], [3, 81, 1]],                       /* Em7   : B5 A5           */
      [[0, 79, 2], [2, 76, 2]]                        /* Asus4 : G5 E5 (open)    */
    ] },
    /* 4 Syncopated: 3+3+2 grouping (dotted, dotted, short) pulls against the bar */
    { name: 'Syncopated', bars: [
      [[0, 74, 1.5], [1.5, 71, 1.5], [3, 74, 1]],     /* Gmaj7 : D5 B4 D5        */
      [[0, 78, 1.5], [1.5, 74, 1.5], [3, 69, 1]],     /* D/F#  : F#5 D5 A4       */
      [[0, 71, 1.5], [1.5, 76, 1.5], [3, 79, 1]],     /* Em7   : B4 E5 G5        */
      [[0, 78, 1.5], [1.5, 74, 1.5], [3, 73, 1]],     /* Bm7   : F#5 D5 C#5      */
      [[0, 71, 1.5], [1.5, 74, 1.5], [3, 79, 1]],     /* Gmaj7 : B4 D5 G5        */
      [[0, 81, 1.5], [1.5, 78, 1.5], [3, 76, 1]],     /* D/F#  : A5 F#5 E5       */
      [[0, 79, 1.5], [1.5, 76, 1.5], [3, 74, 1]],     /* Em7   : G5 E5 D5        */
      [[0, 76, 3], [3, 71, 1]]                        /* Asus4 : E5 B4 (leads back) */
    ] },
    /* 5 Flowing: a little eighth-note wave, then a held note to land on */
    { name: 'Flowing', bars: [
      [[0, 71, 0.5], [0.5, 74, 0.5], [1, 79, 0.5], [1.5, 78, 0.5], [2, 74, 2]],  /* Gmaj7 : B4 D5 G5 F#5 D5 */
      [[0, 69, 0.5], [0.5, 74, 0.5], [1, 78, 0.5], [1.5, 76, 0.5], [2, 74, 2]],  /* D/F#  : A4 D5 F#5 E5 D5 */
      [[0, 71, 0.5], [0.5, 76, 0.5], [1, 79, 0.5], [1.5, 78, 0.5], [2, 76, 2]],  /* Em7   : B4 E5 G5 F#5 E5 */
      [[0, 78, 0.5], [0.5, 74, 0.5], [1, 71, 0.5], [1.5, 74, 0.5], [2, 78, 2]],  /* Bm7   : F#5 D5 B4 D5 F#5 */
      [[0, 71, 0.5], [0.5, 74, 0.5], [1, 79, 0.5], [1.5, 83, 0.5], [2, 81, 2]],  /* Gmaj7 : B4 D5 G5 B5 A5  */
      [[0, 78, 0.5], [0.5, 81, 0.5], [1, 79, 0.5], [1.5, 78, 0.5], [2, 74, 2]],  /* D/F#  : F#5 A5 G5 F#5 D5 */
      [[0, 76, 0.5], [0.5, 79, 0.5], [1, 83, 0.5], [1.5, 81, 0.5], [2, 79, 2]],  /* Em7   : E5 G5 B5 A5 G5  */
      [[0, 76, 1], [1, 74, 1], [2, 76, 2]]                                       /* Asus4 : E5 D5 E5 (open) */
    ] },
    /* 6 Motif: bars 0-3 state a nine-note stepwise idea supplied by the site owner
     *   (scale degrees 3 4 5 4 5 4 4 3 2 in B minor = D E F# E F# E E D C#), each
     *   note landing on a different chord; bars 4-7 are an original answer that
     *   rises a little higher and ends on an open E5. Rhythm and harmony are new. */
    { name: 'Motif', bars: [
      [[0, 74, 1.5], [1.5, 76, 2.5]],                 /* Gmaj7 : D5 E5           (3 4)   */
      [[0, 78, 1.5], [1.5, 76, 2.5]],                 /* D/F#  : F#5 E5          (5 4)   */
      [[0, 78, 1], [1, 76, 1], [2, 76, 2]],           /* Em7   : F#5 E5 E5       (5 4 4) */
      [[0, 74, 2], [2, 73, 2]],                       /* Bm7   : D5 C#5          (3 2)   */
      [[0, 71, 2], [2, 74, 2]],                       /* Gmaj7 : B4 D5                   */
      [[0, 76, 2], [2, 78, 2]],                       /* D/F#  : E5 F#5                  */
      [[0, 74, 1.5], [1.5, 76, 0.5], [2, 79, 2]],     /* Em7   : D5 E5 G5                */
      [[0, 76, 4]]                                    /* Asus4 : E5 (open)               */
    ] },
    /* 7 Return: a two-bar phrase that falls from a high B, answered by a lower
     *   ending, then restated unchanged; the last two bars press on one repeated
     *   note (G5) and settle on an open E5. Original pitches and rhythm. */
    { name: 'Return', bars: [
      [[0, 83, 2], [2, 81, 1], [3, 78, 1]],           /* Gmaj7 : B5 A5 F#5       A     */
      [[0, 81, 2], [2, 78, 2]],                       /* D/F#  : A5 F#5                */
      [[0, 83, 2], [2, 81, 1], [3, 79, 1]],           /* Em7   : B5 A5 G5        A'    */
      [[0, 78, 2], [2, 74, 2]],                       /* Bm7   : F#5 D5                */
      [[0, 83, 2], [2, 81, 1], [3, 78, 1]],           /* Gmaj7 : B5 A5 F#5       A     */
      [[0, 81, 2], [2, 78, 2]],                       /* D/F#  : A5 F#5                */
      [[0, 79, 1], [1, 79, 1], [2, 79, 1], [3, 78, 1]], /* Em7 : G5 G5 G5 F#5      B     */
      [[0, 76, 4]]                                    /* Asus4 : E5 (open)             */
    ] }
  ];
  var melIdx = 6;
  (function () {
    var q = /[?&]mel=(\d+)/.exec((window.location && window.location.search) || '');
    if (q && +q[1] >= 1 && +q[1] <= MELODIES.length) melIdx = +q[1] - 1;
  })();
  function setMelody(n) {
    if (n >= 1 && n <= MELODIES.length) melIdx = n - 1;
    return MELODIES[melIdx].name;
  }

  /* gentle build: the second half is a little fuller and brighter */
  function level(bar) {
    var late = bar >= 8;
    return {
      pad:   late ? 0.95 : 0.80,
      cut:   late ? 1500 : 1100,
      vln:   late ? 0.115 : 0.100,
      cello: late ? 0.070 : 0,
      dub:   late,
      piano: late ? 0.060 : 0.050
    };
  }

  /* ---------------- audio graph ---------------- */

  var ctx = null, master, tone, comp, bus, padLP, noiseBuf, built = false;
  var on = false, timer = null, barIdx = 0, nextT = 0;

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
    master = ctx.createGain(); master.gain.value = 0;

    /* global tone: warm, but with some air */
    tone = ctx.createBiquadFilter();
    tone.type = 'lowpass'; tone.frequency.value = 3400; tone.Q.value = 0.4;

    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20; comp.knee.value = 12; comp.ratio.value = 3;
    comp.attack.value = 0.03; comp.release.value = 0.5;
    master.connect(tone); tone.connect(comp); comp.connect(ctx.destination);

    bus = ctx.createGain();
    var dry = ctx.createGain(); dry.gain.value = 0.70;
    var conv = ctx.createConvolver(); conv.buffer = impulse(ctx, 5.4, 2.1);
    var wet = ctx.createGain(); wet.gain.value = 0.42;
    bus.connect(dry); dry.connect(master);
    bus.connect(conv); conv.connect(wet); wet.connect(master);

    padLP = ctx.createBiquadFilter();
    padLP.type = 'lowpass'; padLP.frequency.value = 1100; padLP.Q.value = 0.3;
    padLP.connect(bus);

    /* one second of white noise, reused for the bow scrape at each note start */
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    var nd = noiseBuf.getChannelData(0);
    for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    built = true;
  }

  function panNode(p) {
    if (!ctx.createStereoPanner) return null;
    var n = ctx.createStereoPanner(); n.pan.value = p; return n;
  }
  function toBus(node, pan) {
    var p = panNode(pan || 0);
    if (p) { node.connect(p); p.connect(bus); } else { node.connect(bus); }
  }

  /* ---------------- instruments ---------------- */

  /* The four bowed strings share one voice: a sawtooth (the bow's stick-slip
   * spectrum) blended with a triangle for body, run through a few resonant
   * peaks that stand in for the instrument's wooden body, then a low-pass.
   * They differ by attack speed, brightness, resonances and vibrato.
   * formants: [centre Hz, gain dB, Q]. sub: extra sine one octave up (bass only). */
  var INST = {
    violin: { att: 0.20, rel: 0.50, hp: 180, lp: 3300, tri: 0.42, saw: 0.26, sub: 0,
              vibHz: 5.5, vibCents: 11, vibDelay: 0.35, noise: 0.6,
              formants: [[500, 3, 1.0], [1250, 3, 1.2], [3000, 2, 1.0]] },
    viola:  { att: 0.26, rel: 0.60, hp: 120, lp: 2400, tri: 0.48, saw: 0.28, sub: 0,
              vibHz: 5.0, vibCents: 9, vibDelay: 0.40, noise: 0.5,
              formants: [[400, 3, 1.0], [1000, 3, 1.2], [2200, 1.5, 1.0]] },
    cello:  { att: 0.34, rel: 0.70, hp: 60, lp: 1700, tri: 0.55, saw: 0.28, sub: 0,
              vibHz: 4.8, vibCents: 8, vibDelay: 0.50, noise: 0.4,
              formants: [[250, 3, 1.0], [600, 3, 1.0], [1400, 1.5, 1.0]] },
    bass:   { att: 0.45, rel: 0.80, hp: 35, lp: 750, tri: 0.60, saw: 0.22, sub: 0.35,
              vibHz: 4.2, vibCents: 5, vibDelay: 0.60, noise: 0.25,
              formants: [[100, 3, 1.0], [250, 2, 1.0], [600, 1, 1.0]] }
  };
  var SOLO = [[-5, -0.45], [5, 0.45]];     /* [detune cents, pan] */
  var SECT = [[-7, -0.60], [7, 0.60]];

  /* o (all optional): att, rel, voices, dest, vib (vibrato multiplier),
   * noise (false = no bow scrape), section (use the wider SECT voices) */
  function bowed(name, midi, t, lenSec, vel, o) {
    o = o || {};
    var P = INST[name], f = mtof(midi);
    var att = o.att || P.att, rel = o.rel || P.rel;
    var end = t + lenSec + rel;
    var dest = o.dest || bus;
    var voices = o.voices || (o.section ? SECT : SOLO);

    var out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.linearRampToValueAtTime(vel, t + att);
    out.gain.setValueAtTime(vel, t + Math.max(att + 0.02, lenSec - 0.05));
    out.gain.linearRampToValueAtTime(0.0001, end);
    out.connect(dest);

    /* body: high-pass, resonant peaks in series, low-pass */
    var hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = P.hp; hp.Q.value = 0.5;
    var node = hp;
    P.formants.forEach(function (fm) {
      var pk = ctx.createBiquadFilter();
      pk.type = 'peaking'; pk.frequency.value = fm[0]; pk.gain.value = fm[1]; pk.Q.value = fm[2];
      node.connect(pk); node = pk;
    });
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = P.lp; lp.Q.value = 0.5;
    node.connect(lp); lp.connect(out);

    /* vibrato blooms after the note has spoken */
    var cents = P.vibCents * (typeof o.vib === 'number' ? o.vib : 1);
    var vg = null;
    if (cents > 0) {
      var vib = ctx.createOscillator(); vib.frequency.value = P.vibHz;
      vg = ctx.createGain();
      vg.gain.setValueAtTime(0, t);
      vg.gain.setValueAtTime(0, t + P.vibDelay);
      vg.gain.linearRampToValueAtTime(cents, t + P.vibDelay + 0.7);
      vib.connect(vg);
      vib.start(t); vib.stop(end + 0.05);
    }

    voices.forEach(function (v) {
      var side = ctx.createGain(); side.gain.value = 1;
      [['triangle', P.tri, 1], ['sawtooth', P.saw, 1], ['sine', P.sub, 2]].forEach(function (w) {
        if (!w[1]) return;
        var os = ctx.createOscillator(); os.type = w[0];
        os.frequency.value = f * w[2]; os.detune.value = v[0];
        if (vg) vg.connect(os.detune);
        var g = ctx.createGain(); g.gain.value = w[1];
        os.connect(g); g.connect(side);
        os.start(t); os.stop(end + 0.05);
      });
      var p = panNode(v[1]);
      if (p) { side.connect(p); p.connect(hp); } else { side.connect(hp); }
    });

    /* bow scrape: a short band of noise at the start, not shaped by the slow swell */
    if (P.noise && o.noise !== false && noiseBuf && ctx.createBufferSource) {
      var ns = ctx.createBufferSource(); ns.buffer = noiseBuf; ns.loop = true;
      var nb = ctx.createBiquadFilter();
      nb.type = 'bandpass'; nb.frequency.value = Math.min(4000, Math.max(600, f * 3)); nb.Q.value = 0.8;
      var ng = ctx.createGain();
      ng.gain.setValueAtTime(0.0001, t);
      ng.gain.linearRampToValueAtTime(vel * P.noise, t + 0.04);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.30);
      ns.connect(nb); nb.connect(ng); ng.connect(dest);
      ns.start(t); ns.stop(t + 0.35);
    }
  }

  /* the string section for one bar: violas on the inner tones, one soft violin
   * on the top tone, cello on the root (second half), double bass underneath */
  function section(chord, t, lv) {
    var v = 0.036 * lv.pad, len = BAR - 0.1;
    var o = { section: true, att: 1.0, rel: 1.4, dest: padLP, vib: 0.4, noise: false };
    bowed('viola', chord.t[0], t, len, v, o);
    bowed('viola', chord.t[1], t, len, v, o);
    bowed('viola', chord.t[2], t, len, v, o);
    bowed('violin', chord.t[3], t, len, v * 0.8, o);
    if (lv.cello) bowed('cello', chord.bass + 12, t, len, v * 1.2, o);
    bowed('bass', chord.bass - 12, t, BAR, 0.16,
          { voices: [[0, 0]], att: 0.5, rel: 0.8, vib: 0.5, noise: false });
  }

  /* piano: one soft note with a 40ms attack and a long decay. Used for a slow
   * rolling figure (one note per beat), so it never sounds plucked or busy. */
  function pianoNote(midi, t, vel, pan) {
    var f = mtof(midi);
    var ring = 3.0;
    var out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.linearRampToValueAtTime(vel, t + 0.04);
    out.gain.exponentialRampToValueAtTime(vel * 0.30, t + 1.0);
    out.gain.exponentialRampToValueAtTime(0.0001, t + ring);
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 1700; lp.Q.value = 0.3;
    [['sine', 1], ['triangle', 0.20], ['sine', 0.10]].forEach(function (v, i) {
      var o = ctx.createOscillator(); o.type = v[0]; o.frequency.value = f * (i === 2 ? 2 : 1);
      var g = ctx.createGain(); g.gain.value = v[1];
      o.connect(g); g.connect(lp);
      o.start(t); o.stop(t + ring + 0.1);
    });
    lp.connect(out);
    toBus(out, pan);
  }

  /* ---------------- scheduling ---------------- */

  /* rolling figure: chord tones 0,1,2,1 on each beat; the same shape every bar */
  var ROLL = [0, 1, 2, 1];

  function scheduleBar(bar, t) {
    var chord = CH[SONG[bar]], lv = level(bar), pb = bar % 8;

    padLP.frequency.setTargetAtTime(lv.cut, t, 0.8);
    section(chord, t, lv);

    ROLL.forEach(function (idx, k) {
      pianoNote(chord.t[idx % chord.t.length], t + k * BEAT, lv.piano, (k % 2 ? 0.18 : -0.18));
    });

    MELODIES[melIdx].bars[pb].forEach(function (n) {
      bowed('violin', n[1], t + n[0] * BEAT, n[2] * BEAT, lv.vln);
      if (lv.dub) bowed('cello', n[1] - 12, t + n[0] * BEAT, n[2] * BEAT, lv.cello * 0.8);
    });
  }

  function pump() {
    if (!on || !ctx) return;
    while (nextT < ctx.currentTime + 2.5) {
      scheduleBar(barIdx % NBARS, nextT);
      nextT += BAR;
      barIdx++;
    }
  }

  function start() {
    if (!built) build();
    on = true;
    ctx.resume();
    var now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0.6, now + 2.5);
    barIdx = 0; nextT = now + 0.2;
    pump();
    clearInterval(timer); timer = setInterval(pump, 300);
  }

  function stop() {
    on = false;
    clearInterval(timer);
    if (ctx) {
      var now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0, now + 2.0);
      setTimeout(function () { if (!on && ctx) ctx.suspend(); }, 2300);
    }
  }

  /* the single #sound button in js/ambient.js cycles: off -> ambient -> serenity -> off */
  window.__bgm2 = {
    start: start,
    stop: stop,
    melody: setMelody,
    melodies: MELODIES.map(function (m) { return m.name; })
  };

  /* audition keys: 1-7 pick a melody while Serenity is playing (takes effect within a few seconds) */
  document.addEventListener('keydown', function (e) {
    if (!on || e.ctrlKey || e.metaKey || e.altKey) return;
    var tg = e.target && e.target.tagName;
    if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT') return;
    var n = parseInt(e.key, 10);
    if (n >= 1 && n <= MELODIES.length) setMelody(n);
  });

  document.addEventListener('visibilitychange', function () {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else if (on) ctx.resume();
  });
})();
