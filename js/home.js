(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- fog + dust canvas ---------- */
  var canvas = document.getElementById('fog');
  if (canvas && !reduce) {
    var ctx = canvas.getContext('2d');
    var W, H, dpr, blobs = [], motes = [];
    var mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.width = innerWidth * dpr;
      H = canvas.height = innerHeight * dpr;
    }
    function rnd(a, b) { return a + Math.random() * (b - a); }

    /* colour cycle, starting at gold: gold -> deep purple -> crimson -> nano pale blue -> (loop) */
    var CYCLE_MS = 48000;
    var MOTE_COLORS = [
      [255, 205, 112],
      [138, 76, 240],
      [235, 28, 64],
      [140, 225, 255]
    ];
    var t0 = null;
    function moteColor(phase) {
      var n = MOTE_COLORS.length;
      var p = ((phase % 1) + 1) % 1 * n;
      var i = Math.floor(p), f = p - i;
      f = f * f * (3 - 2 * f);
      var a = MOTE_COLORS[i % n], b = MOTE_COLORS[(i + 1) % n];
      return Math.round(a[0] + (b[0] - a[0]) * f) + ',' +
             Math.round(a[1] + (b[1] - a[1]) * f) + ',' +
             Math.round(a[2] + (b[2] - a[2]) * f);
    }
    function init() {
      resize();
      blobs = [];
      for (var i = 0; i < 7; i++) {
        blobs.push({
          x: rnd(0, 1), y: rnd(0, 1), r: rnd(0.28, 0.55),
          vx: rnd(-0.00006, 0.00006), vy: rnd(-0.00004, 0.00004),
          off: rnd(0, 0.04), a: rnd(0.04, 0.075), z: rnd(0.3, 1)
        });
      }
      motes = [];
      for (var j = 0; j < 70; j++) {
        motes.push({ x: rnd(0, 1), y: rnd(0, 1), s: rnd(0.4, 1.6), v: rnd(0.00004, 0.00015), p: rnd(0, 6.28), z: rnd(0.2, 1) });
      }
    }
    function frame(t) {
      if (t0 === null) t0 = t;
      var ph = (t - t0) / CYCLE_MS;
      window.__homePhase = ph;
      mouse.x += (mouse.tx - mouse.x) * 0.03;
      mouse.y += (mouse.ty - mouse.y) * 0.03;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < blobs.length; i++) {
        var b = blobs[i];
        b.x += b.vx * 16; b.y += b.vy * 16;
        if (b.x < -0.2 || b.x > 1.2) b.vx *= -1;
        if (b.y < -0.2 || b.y > 1.2) b.vy *= -1;
        var cx = (b.x + (mouse.x - 0.5) * 0.06 * b.z) * W;
        var cy = (b.y + (mouse.y - 0.5) * 0.06 * b.z) * H;
        var r = b.r * Math.max(W, H);
        var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        var bc = moteColor(ph + b.off);
        g.addColorStop(0, 'rgba(' + bc + ',' + b.a + ')');
        g.addColorStop(1, 'rgba(' + bc + ',0)');
        ctx.fillStyle = g;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      }
      for (var k = 0; k < motes.length; k++) {
        var m = motes[k];
        m.y -= m.v * 16;
        if (m.y < -0.02) { m.y = 1.02; m.x = Math.random(); }
        var px = (m.x + Math.sin(t * 0.0003 + m.p) * 0.01 + (mouse.x - 0.5) * 0.03 * m.z) * W;
        var py = m.y * H;
        var tw = 0.35 + 0.65 * Math.abs(Math.sin(t * 0.001 + m.p));
        var col = moteColor(ph + (1 - m.y) * 0.06);
        var a = 0.5 * tw * m.z;
        ctx.fillStyle = 'rgba(' + col + ',' + (a * 0.16) + ')';
        ctx.beginPath();
        ctx.arc(px, py, m.s * dpr * 4, 0, 6.283);
        ctx.fill();
        ctx.fillStyle = 'rgba(' + col + ',' + a + ')';
        ctx.beginPath();
        ctx.arc(px, py, m.s * dpr, 0, 6.283);
        ctx.fill();
      }
      requestAnimationFrame(frame);
    }
    addEventListener('resize', resize);
    addEventListener('mousemove', function (e) { mouse.tx = e.clientX / innerWidth; mouse.ty = e.clientY / innerHeight; });
    init();
    requestAnimationFrame(frame);
  }

  /* ---------- starry sky + aurora: fades in while pressing, slowly fades out on release ---------- */
  if (!reduce) (function () {
    var cv = document.createElement('canvas');
    cv.id = 'aurora';
    cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;display:none;';
    var fogEl = document.getElementById('fog');
    if (fogEl && fogEl.parentNode) fogEl.parentNode.insertBefore(cv, fogEl.nextSibling);
    else document.body.insertBefore(cv, document.body.firstChild);
    var c = cv.getContext('2d');
    var W, H, D, stars = [];
    var FADE_IN = 2200, FADE_OUT = 6500;   // ms: time to fully appear / fully vanish
    var level = 0, pressing = false, running = false, last = 0;
    var tx = innerWidth / 2, ty = innerHeight / 2;
    var px = tx, py = ty, maskR = 0;

    function size() {
      D = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.width = Math.round(innerWidth * D);
      H = cv.height = Math.round(innerHeight * D);
    }
    function reach() { return Math.max(230, Math.min(innerWidth, innerHeight) * 0.62); }
    function seed() {
      stars = [];
      var n = Math.round(innerWidth * innerHeight / 3200);
      for (var i = 0; i < n; i++) {
        var warm = Math.random();
        stars.push({
          x: Math.random(), y: Math.pow(Math.random(), 1.25) * 0.92,
          r: Math.random() < 0.06 ? 1.3 + Math.random() * 0.9 : 0.35 + Math.random() * 0.75,
          p: Math.random() * 6.28, s: 0.0008 + Math.random() * 0.002,
          c: warm < 0.12 ? '255,226,190' : warm < 0.4 ? '190,215,255' : '255,255,255'
        });
      }
    }
    size(); seed();
    addEventListener('resize', function () { size(); seed(); });

    var LAYERS = [
      { y: 0.60, amp: 0.05, h: 0.46, sp: 1.0, ph: 0.0, k: 4.2, a: 0.62, c: ['90,255,170', '50,210,200', '150,110,255'] },
      { y: 0.52, amp: 0.06, h: 0.38, sp: 0.8, ph: 2.1, k: 3.1, a: 0.45, c: ['70,240,210', '70,160,255', '190,90,255'] },
      { y: 0.67, amp: 0.04, h: 0.30, sp: 1.3, ph: 4.0, k: 5.6, a: 0.36, c: ['140,255,150', '60,220,190', '120,130,255'] }
    ];

    function milkyWay(e) {
      c.save();
      c.translate(W * 0.55, H * 0.28);
      c.rotate(-0.55);
      var g = c.createLinearGradient(0, -H * 0.28, 0, H * 0.28);
      g.addColorStop(0, 'rgba(120,150,230,0)');
      g.addColorStop(0.5, 'rgba(150,170,235,' + (0.17 * e) + ')');
      g.addColorStop(1, 'rgba(120,150,230,0)');
      c.fillStyle = g;
      c.fillRect(-W, -H * 0.28, W * 2, H * 0.56);
      c.restore();
    }
    function skyGlow(e) {
      var g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(4,10,34,' + (0.78 * e) + ')');
      g.addColorStop(0.6, 'rgba(8,24,56,' + (0.45 * e) + ')');
      g.addColorStop(1, 'rgba(10,22,40,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
    }
    function curtains(t, e) {
      var step = Math.max(3, Math.round(4 * D));
      c.globalCompositeOperation = 'lighter';
      for (var li = 0; li < LAYERS.length; li++) {
        var L = LAYERS[li];
        var g = c.createLinearGradient(0, 0, 0, -1);
        g.addColorStop(0, 'rgba(' + L.c[0] + ',0)');
        g.addColorStop(0.07, 'rgba(' + L.c[0] + ',0.85)');
        g.addColorStop(0.45, 'rgba(' + L.c[1] + ',0.32)');
        g.addColorStop(1, 'rgba(' + L.c[2] + ',0)');
        c.fillStyle = g;
        var tt = t * L.sp;
        for (var x = 0; x < W; x += step) {
          var u = x / W;
          var base = H * (L.y + L.amp * Math.sin(u * L.k * 1.7 + tt * 0.00021 + L.ph)
                              + L.amp * 0.6 * Math.sin(u * L.k * 4.1 - tt * 0.00033));
          var body = 0.5 + 0.5 * Math.sin(u * L.k + tt * 0.00027 + L.ph * 1.3);
          var rays = 0.55 + 0.45 * Math.sin(u * 61 + tt * 0.0011 + Math.sin(u * 7 + L.ph) * 3);
          var env = Math.sin(Math.PI * Math.min(1, Math.max(0, (u - 0.02) / 0.96)));
          var strength = Math.pow(body, 1.3) * (0.4 + 0.6 * rays) * (0.35 + 0.65 * env);
          var h = H * L.h * (0.3 + 0.9 * body) * e * (0.65 + 0.35 * rays);
          if (h < 2) continue;
          c.globalAlpha = Math.min(1, L.a * strength * e * 1.5);
          c.setTransform(1, 0, 0, h, 0, base);
          c.fillRect(x, -1, step + 1, 1);
          c.setTransform(1, 0, 0, 1, 0, 0);
        }
      }
      c.globalAlpha = 1;
    }
    function draw(t, e) {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, W, H);
      c.globalCompositeOperation = 'source-over';
      skyGlow(e);
      milkyWay(e);
      c.globalCompositeOperation = 'lighter';
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var tw = 0.55 + 0.45 * Math.sin(t * s.s + s.p);
        var vis = Math.min(1, Math.max(0, e * 1.4 - s.y * 0.35 - (i % 7) * 0.02));
        var a = vis * tw;
        if (a < 0.02) continue;
        var px = s.x * W, py = s.y * H;
        if (s.r > 1.2) {
          c.fillStyle = 'rgba(' + s.c + ',' + (a * 0.14) + ')';
          c.beginPath(); c.arc(px, py, s.r * D * 4, 0, 6.283); c.fill();
        }
        c.fillStyle = 'rgba(' + s.c + ',' + a + ')';
        c.beginPath(); c.arc(px, py, s.r * D, 0, 6.283); c.fill();
      }
      curtains(t, e);
      c.globalCompositeOperation = 'source-over';
    }
    function tick(t) {
      var dt = Math.min(64, t - (last || t));
      last = t;
      level += pressing ? dt / FADE_IN : -dt / FADE_OUT;
      level = Math.min(1, Math.max(0, level));
      if (level <= 0 && !pressing) {
        c.clearRect(0, 0, W, H);
        cv.style.maskImage = cv.style.webkitMaskImage = 'none';
        cv.style.display = 'none';
        running = false; last = 0;
        return;
      }
      var e = level * level * (3 - 2 * level);
      cv.style.opacity = Math.min(1, e * 3);
      if (pressing) { px += (tx - px) * 0.18; py += (ty - py) * 0.18; }
      maskR += ((e * e * reach()) - maskR) * 0.14;
      var m = 'radial-gradient(circle ' + maskR.toFixed(1) + 'px at ' +
              px.toFixed(1) + 'px ' + py.toFixed(1) + 'px, #000 0%, #000 52%, rgba(0,0,0,0) 100%)';
      cv.style.maskImage = m;
      cv.style.webkitMaskImage = m;
      draw(t, e);
      requestAnimationFrame(tick);
    }
    function wake() {
      if (running) return;
      running = true; last = 0;
      if (!pressing) { px = tx; py = ty; }
      cv.style.display = 'block';
      requestAnimationFrame(tick);
    }
    function press(e) {
      if (e.button !== undefined && e.button !== 0) return;
      if (e.target.closest && e.target.closest('a,button,input,textarea,select,summary,label')) return;
      tx = e.clientX; ty = e.clientY;
      if (!running) { px = tx; py = ty; maskR = 0; }
      pressing = true; wake();
    }
    function release() { pressing = false; }
    document.addEventListener('selectstart', function (e) {
      if (pressing && !e.target.closest('input,textarea')) e.preventDefault();
    });
    function track(e) {
      tx = e.clientX; ty = e.clientY;
      if (pressing) { px = tx; py = ty; }
    }
    addEventListener('pointerdown', press);
    addEventListener('pointermove', track);
    addEventListener('pointerup', release);
    addEventListener('pointercancel', release);
    addEventListener('blur', release);
    addEventListener('dragstart', release);
    document.addEventListener('mouseleave', release);
    document.addEventListener('visibilitychange', function () { if (document.hidden) release(); });
  })();

  /* ---------- distant thunder ---------- */
  var bolt = document.querySelector('.lightning');
  function strike() {
    if (!bolt) return;
    bolt.style.setProperty('--lx', (20 + Math.random() * 60) + '%');
    bolt.classList.remove('flash');
    void bolt.offsetWidth;
    bolt.classList.add('flash');
  }
  if (bolt && !reduce) {
    setTimeout(strike, 1400);
    (function loop() { setTimeout(function () { strike(); loop(); }, 22000 + Math.random() * 25000); })();
  }

  /* ---------- typing roles ---------- */
  var roleEl = document.getElementById('role-text');
  if (roleEl) {
    var roles = [
      'image / video generation',
      'video tokenizer & autoencoder',
      'autoregressive acceleration',
      'world model',
      'object detection'
    ];
    if (reduce) {
      roleEl.textContent = roles[0];
    } else {
      var ri = 0, ci = 0, del = false;
      (function type() {
        var s = roles[ri];
        ci += del ? -1 : 1;
        roleEl.textContent = s.slice(0, ci);
        var wait = del ? 28 : 62;
        if (!del && ci === s.length) { wait = 1700; del = true; }
        else if (del && ci === 0) { del = false; ri = (ri + 1) % roles.length; wait = 380; }
        setTimeout(type, wait);
      })();
    }
  }

  /* ---------- reveal on scroll ---------- */
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    items.forEach(function (el, i) { el.style.transitionDelay = (i % 3) * 60 + 'ms'; io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- nav active section ---------- */
  var links = document.querySelectorAll('nav.links a[href^="#"]');
  var secs = [];
  links.forEach(function (a) { var s = document.querySelector(a.getAttribute('href')); if (s) secs.push([a, s]); });
  function onScroll() {
    var y = scrollY + innerHeight * 0.35, cur = null;
    secs.forEach(function (p) { if (p[1].offsetTop <= y) cur = p[0]; });
    links.forEach(function (a) { a.classList.toggle('active', a === cur); });
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- card spotlight ---------- */
  document.querySelectorAll('.paper, .proj').forEach(function (card) {
    card.addEventListener('mousemove', function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ---------- co-authored deck: auto-rotating tabs ---------- */
  var deck = document.getElementById('co-deck');
  var deckApi = { refresh: function () {} };
  if (deck) {
    var tabs = [].slice.call(deck.querySelectorAll('.co-tab'));
    var slides = [].slice.call(deck.querySelectorAll('.co-card'));
    var bar = deck.querySelector('.co-bar i');
    var countEl = document.getElementById('co-count');
    var DWELL = 5500;
    var cur = 0, timer = null, hovering = false, inView = true, filterKey = 'all';

    function visible() {
      return tabs.map(function (_, i) { return i; }).filter(function (i) {
        return !tabs[i].classList.contains('hide');
      });
    }
    function runBar() {
      if (!bar) return;
      bar.classList.remove('run');
      void bar.offsetWidth;
      bar.style.setProperty('--dur', DWELL + 'ms');
      if (!reduce && !hovering && inView) bar.classList.add('run');
    }
    function show(i) {
      cur = i;
      tabs.forEach(function (t, k) {
        t.classList.toggle('on', k === i);
        t.setAttribute('aria-selected', k === i ? 'true' : 'false');
      });
      slides.forEach(function (s, k) { s.classList.toggle('on', k === i); });
      var on = tabs[i];
      if (on && on.offsetParent) {
        var box = on.parentNode;
        if (box.scrollHeight > box.clientHeight) {
          box.scrollTo({ top: on.offsetTop - box.clientHeight / 2 + on.offsetHeight / 2, behavior: 'smooth' });
        } else if (box.scrollWidth > box.clientWidth) {
          box.scrollTo({ left: on.offsetLeft - box.clientWidth / 2 + on.offsetWidth / 2, behavior: 'smooth' });
        }
      }
      runBar();
    }
    function next() {
      var v = visible();
      if (!v.length) return;
      var pos = v.indexOf(cur);
      show(v[(pos + 1) % v.length]);
    }
    function schedule() {
      clearTimeout(timer);
      if (reduce || hovering || !inView || visible().length < 2) return;
      timer = setTimeout(function () { next(); schedule(); }, DWELL);
    }
    function restart() { runBar(); schedule(); }

    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { show(i); restart(); });
    });
    deck.addEventListener('mouseenter', function () { hovering = true; clearTimeout(timer); if (bar) bar.classList.remove('run'); });
    deck.addEventListener('mouseleave', function () { hovering = false; restart(); });
    deck.addEventListener('focusin', function () { hovering = true; clearTimeout(timer); if (bar) bar.classList.remove('run'); });
    deck.addEventListener('focusout', function () { hovering = false; restart(); });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        inView = es[0].isIntersecting;
        if (inView) restart(); else { clearTimeout(timer); if (bar) bar.classList.remove('run'); }
      }, { threshold: 0.25 }).observe(deck);
    }

    deckApi.refresh = function (f) {
      filterKey = f;
      tabs.forEach(function (t, i) {
        var tags = (slides[i].dataset.tags || '').split(' ');
        t.classList.toggle('hide', !(f === 'all' || tags.indexOf(f) > -1));
      });
      var v = visible();
      var block = deck.closest('.co-block');
      if (block) block.style.display = v.length ? '' : 'none';
      if (countEl) countEl.textContent = v.length ? v.length + ' papers' : '';
      if (v.length && v.indexOf(cur) === -1) show(v[0]);
      restart();
    };
    deckApi.refresh('all');
    show(0);
    schedule();
  }

  /* ---------- paper filters ---------- */
  var btns = document.querySelectorAll('.filters button');
  var cards = document.querySelectorAll('.paper');
  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      btns.forEach(function (x) { x.classList.toggle('on', x === b); });
      var f = b.dataset.filter;
      cards.forEach(function (c) {
        var show = f === 'all' || (c.dataset.tags || '').split(' ').indexOf(f) > -1;
        c.classList.toggle('hide', !show);
      });
      deckApi.refresh(f);
    });
  });

  var yr = document.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();
})();
