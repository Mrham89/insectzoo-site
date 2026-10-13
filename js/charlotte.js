/* Charlotte roams the site. While the visitor stays on a page she keeps finding new places to spin:
   about one web a minute, in gutters and section corners, never over a link, button, field or canvas.
   Every web stays tied to her by a faint signal line. A real orb weaver keeps one web and senses only
   through silk connected to her; Charlotte keeps them all wired to her, which is the Animus part. When
   the cursor touches sticky silk on any web, Argos is stuck there; the line flashes, she runs back
   along it, wraps him, holds him, cuts him loose and mends the hole. Past 8 webs she takes the oldest
   down and eats the silk (orb weavers really recycle it). The overlay never takes a click
   (pointer-events: none). She only comes out for a fine pointer and without reduced motion, and a
   footer toggle shoos her away. Needs js/argos.js and js/orbplan.js; not js/exhibits.js. */
(function () {
  if (!window.OrbWeb || !window.Argos) return;
  var CONTROLS = 'a, button, input, select, textarea, label, canvas, [role=button]';
  var BLANK = { HTML: 1, BODY: 1, MAIN: 1, SECTION: 1, HEADER: 1, FOOTER: 1, DIV: 1, NAV: 0 };
  var EVERY = 60000, FIRST = 3000, RETRY = 5000, CAP = 8, HOLD = 2000, RESIDUE = 2500, RUN_MAX = 1200, AH = Argos.H, STICK = 4, WALK = 3;
  var KEY = 'charlotte:' + location.pathname, OFF = 'charlotte-off';
  var html = document.documentElement, cv = null, ctx = null, raf = 0, on = false;
  var webs, me, mode, task, nextAt, ptr = { x: 0, y: 0, in: false }, argos, grab, residueUntil, mend, resume, spinning;

  function now() { return performance.now(); }
  function mq(q) { return !!(window.matchMedia && window.matchMedia(q).matches); }
  function able() { return mq('(pointer: fine)') && !mq('(prefers-reduced-motion: reduce)'); }
  function box(name) { try { return window[name]; } catch (e) { return null; } }
  function get(name, k) { try { var s = box(name); return s ? s.getItem(k) : null; } catch (e) { return null; } }
  function put(name, k, v) { try { var s = box(name); if (s) { if (v == null) s.removeItem(k); else s.setItem(k, v); } } catch (e) { /* storage blocked: she just forgets */ } }
  function emit(evt) {
    if (window.ZooSims) ZooSims.emit('charlotte', evt);
    try { window.dispatchEvent(new CustomEvent(evt)); } catch (e) { /* old browser: the quest hook is optional */ }
  }
  function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
  function segDist(px, py, s, ox, oy) {
    var x1 = s.x1 + ox, y1 = s.y1 + oy, vx = s.x2 - s.x1, vy = s.y2 - s.y1, l2 = vx * vx + vy * vy;
    var t = l2 ? Math.max(0, Math.min(1, ((px - x1) * vx + (py - y1) * vy) / l2)) : 0;
    return dist(px, py, x1 + vx * t, y1 + vy * t);
  }

  /* --- webs: a plan in local coordinates placed at (x, y) in document coordinates --- */
  function makeWeb(x, y, w, h, built) {
    var plan = OrbWeb.plan(w, h), web = { x: x, y: y, w: w, h: h, plan: plan, segs: plan.segs, b: null, n: plan.segs.length };
    if (built) plan.segs.forEach(function (s) { if (s.kind === 'aux') s.gone = true; });
    else { web.b = OrbWeb.builder(plan); web.n = 0; }
    return web;
  }
  function hub(web) { return { x: web.x + web.plan.hub.x, y: web.y + web.plan.hub.y }; }
  function save() {
    put('sessionStorage', KEY, JSON.stringify({ webs: webs.filter(function (w) { return !w.b; }).map(function (w) { return [w.x, w.y, w.w, w.h]; }) }));
  }
  function restore() {
    try {
      var d = JSON.parse(get('sessionStorage', KEY) || 'null');
      if (d && d.webs) d.webs.slice(-CAP).forEach(function (a) { if (a.length === 4 && a.every(isFinite)) webs.push(makeWeb(a[0], a[1], a[2], a[3], true)); });
    } catch (e) { webs.length = 0; }   // corrupt store: start the page fresh
  }

  /* --- where to spin: a 90-160 px box in view, clear of controls, other webs and canvases --- */
  function clear(x, y, w, h) {   // x, y in viewport coordinates
    if (x < 4 || y < 4 || x + w > innerWidth - 4 || y + h > innerHeight - 4) return -1;
    var sx = scrollX, sy = scrollY;
    for (var i = 0; i < webs.length; i++) {
      var o = webs[i];
      if (x + sx < o.x + o.w + 12 && o.x < x + sx + w + 12 && y + sy < o.y + o.h + 12 && o.y < y + sy + h + 12) return -1;
    }
    var blank = 0;
    for (var gx = 0; gx <= 4; gx++) for (var gy = 0; gy <= 4; gy++) {
      var els = document.elementsFromPoint(x + w * gx / 4, y + h * gy / 4) || [];
      for (var k = 0; k < els.length; k++) if (els[k].closest && els[k].closest(CONTROLS)) return -1;
      if (!els.length || BLANK[els[0].tagName]) blank++;
    }
    return blank;   // how much of it is empty background (higher is better)
  }
  function pickSite() {
    var w = 90 + Math.random() * 70, h = Math.round(w * (1 + Math.random() * 0.15)), cands = [], best = null, score = -1;
    w = Math.round(w);
    Array.prototype.forEach.call(document.querySelectorAll('section, header, footer, main'), function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      cands.push([r.left + 8, r.top + 8], [r.right - w - 8, r.top + 8], [r.left + 8, r.bottom - h - 8], [r.right - w - 8, r.bottom - h - 8]);
    });
    var gutter = (innerWidth - 1100) / 2;   // style.css --max-width
    for (var i = 0; i < 6; i++) {
      var y = 8 + Math.random() * Math.max(0, innerHeight - h - 16);
      if (gutter > w + 16) cands.push([8 + Math.random() * (gutter - w - 16), y], [innerWidth - gutter + 8 + Math.random() * (gutter - w - 16), y]);
      cands.push([8 + Math.random() * (innerWidth - w - 16), y]);
    }
    cands.forEach(function (c) { var s = clear(c[0], c[1], w, h); if (s > score) { score = s; best = c; } });
    return best ? { x: best[0] + scrollX, y: best[1] + scrollY, w: w, h: h } : null;
  }

  /* --- what she does --- */
  function walkTo(x, y, then) { mode = 'walk'; task = { x: x, y: y, then: then }; }
  function rest() {
    mode = 'rest'; task = null;
    var home = webs.length ? hub(webs[webs.length - 1]) : null;
    if (home && dist(me.x, me.y, home.x, home.y) > 1) walkTo(home.x, home.y, function () { mode = 'rest'; });
  }
  function startWeb() {
    if (webs.filter(function (w) { return !w.b; }).length >= CAP) {   // eat the oldest web first
      var old = webs[0], h0 = hub(old);
      return walkTo(h0.x, h0.y, function () { mode = 'eat'; task = { web: old }; });
    }
    var site = pickSite();
    if (!site) { nextAt = now() + RETRY; return rest(); }
    nextAt = now() + EVERY;
    var web = makeWeb(site.x, site.y, site.w, site.h, false); webs.push(web);
    walkTo(web.x + web.b.spider.x, web.y + web.b.spider.y, function () { mode = 'spin'; spinning = web; });
  }
  function caught(p, web) {   // Argos touched sticky silk: pin him there and send her running
    resume = { mode: mode, task: task };
    grab = { x: p.x, y: p.y, web: web, t: now(), from: { x: me.x, y: me.y } };
    grab.dur = Math.min(RUN_MAX, Math.max(250, dist(me.x, me.y, p.x, p.y) / 1.2));
    argos.x = p.x; argos.y = p.y; argos.seen = true; argos.pin();
    html.style.cursor = 'none'; mode = 'run'; emit('charlotte_caught');
  }
  function free(t) {   // too big to eat: cut him loose, leaving holes to mend
    argos.release(RESIDUE); residueUntil = t + RESIDUE;
    webs.forEach(function (w) {
      w.segs.forEach(function (s, i) {
        if (s.kind === 'capture' && i < w.n && !s.broken && segDist(grab.x, grab.y, s, w.x, w.y) < 16) { s.broken = true; mend.push({ web: w, s: s }); }
      });
    });
    grab = null; mode = 'mend';
  }
  function afterMend() {
    var r = resume; resume = null;
    if (r && r.mode === 'spin' && spinning && spinning.b) {
      var sp = spinning.b.spider, web = spinning;
      return walkTo(web.x + sp.x, web.y + sp.y, function () { mode = 'spin'; spinning = web; });
    }
    if (r && r.mode === 'walk' && r.task) return walkTo(r.task.x, r.task.y, r.task.then);
    if (r && r.mode === 'eat') { mode = 'eat'; task = r.task; return; }
    rest();
  }
  function stepTo(x, y, speed) {
    var d = dist(me.x, me.y, x, y);
    if (d > 0.5) { var m = Math.min(d, speed); me.a = Math.atan2(y - me.y, x - me.x); me.x += (x - me.x) / d * m; me.y += (y - me.y) / d * m; }
    return d;
  }

  function step() {
    var t = now();
    if (mode === 'rest' && t >= nextAt) startWeb();
    if (mode === 'walk') { if (stepTo(task.x, task.y, WALK) <= 0.5) task.then(); }
    else if (mode === 'spin') {
      var web = spinning, b = web.b;
      b.step(); web.n = b.done ? web.segs.length : Math.floor(b.built) + 1;
      me.x = web.x + b.spider.x; me.y = web.y + b.spider.y; me.a = b.spider.a;
      var cur = web.segs[Math.min(web.segs.length - 1, Math.floor(b.built))], ph = web.plan.hub;
      if (cur.kind === 'capture') web.segs.forEach(function (o) {   // she takes up the temporary spiral as the sticky one closes in
        if (o.kind === 'aux' && !o.gone && dist(o.x1, o.y1, ph.x, ph.y) > dist(cur.x1, cur.y1, ph.x, ph.y)) o.gone = true;
      });
      if (b.done) {
        web.segs.forEach(function (o) { if (o.kind === 'aux') o.gone = true; });
        web.b = null; spinning = null; save(); emit('charlotte_spun'); rest();
      }
    } else if (mode === 'eat') {   // she rolls the old web up from the last thread back, and eats it
      task.web.n = Math.max(0, task.web.n - 4);
      if (!task.web.n) { webs.splice(webs.indexOf(task.web), 1); save(); startWeb(); }
    } else if (mode === 'run') {
      var k = Math.min(1, (t - grab.t) / grab.dur);
      me.x = grab.from.x + (grab.x - grab.from.x) * k; me.y = grab.from.y + (grab.y + AH * 0.55 - grab.from.y) * k;
      me.a = Math.atan2(grab.y - grab.from.y, grab.x - grab.from.x);
      if (k >= 1) { mode = 'wrap'; grab.wrapT = t; }
    } else if (mode === 'wrap') { if (t - grab.wrapT > HOLD) free(t); }
    else if (mode === 'mend') {
      if (!mend.length) afterMend();
      else {
        var m = mend[0], s = m.s;
        if (stepTo(m.web.x + (s.x1 + s.x2) / 2, m.web.y + (s.y1 + s.y2) / 2, WALK) < 1) { s.broken = false; mend.shift(); }
      }
    }
    // Argos: stuck the moment he touches sticky silk; gummed up for a while after she cuts him loose
    if (residueUntil && t > residueUntil) { residueUntil = 0; html.style.cursor = ''; argos.lose(); }
    if (residueUntil && ptr.in) argos.follow(ptr);
    if (!grab && !residueUntil && ptr.in) {
      for (var i = 0; i < webs.length; i++) {
        var w = webs[i];
        if (ptr.x < w.x - STICK || ptr.y < w.y - STICK || ptr.x > w.x + w.w + STICK || ptr.y > w.y + w.h + STICK) continue;
        for (var j = 0; j < w.n; j++) {
          var sg = w.segs[j];
          if (sg.kind === 'capture' && !sg.broken && segDist(ptr.x, ptr.y, sg, w.x, w.y) < STICK) { caught(ptr, w); break; }
        }
        if (grab) break;
      }
    }
  }

  /* --- drawing: the overlay is the viewport; webs live in document coordinates --- */
  function draw() {
    var t = now(), ox = scrollX, oy = scrollY;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.save(); ctx.translate(-ox, -oy);
    webs.forEach(function (w) {
      if (w.x > ox + innerWidth || w.x + w.w < ox || w.y > oy + innerHeight || w.y + w.h < oy) return;
      var shake = grab && grab.web === w ? 1 : 0;
      for (var i = 0; i < w.n; i++) {
        var s = w.segs[i]; if (s.gone || s.broken) continue;
        var j = shake ? Math.sin(t / 18 + i) * shake : 0, end = 1;
        if (w.b && i === w.n - 1) end = w.b.built % 1 || 1;   // the thread she is spinning ends at her spinnerets
        ctx.strokeStyle = s.kind === 'capture' ? 'rgba(225,238,248,0.34)' : s.kind === 'aux' ? 'rgba(225,238,248,0.14)' : 'rgba(225,238,248,0.24)';
        ctx.lineWidth = s.kind === 'frame' || s.kind === 'bridge' || s.kind === 'mooring' ? 1 : 0.6;
        ctx.beginPath(); ctx.moveTo(w.x + s.x1 + j, w.y + s.y1 - j);
        ctx.lineTo(w.x + s.x1 + (s.x2 - s.x1) * end - j, w.y + s.y1 + (s.y2 - s.y1) * end + j); ctx.stroke();
      }
    });
    webs.forEach(function (w) {   // signal lines: every web wired back to her
      if (w.b) return;
      var h0 = hub(w), hot = grab && grab.web === w;
      ctx.strokeStyle = hot ? 'rgba(34,230,198,' + (0.45 + 0.35 * Math.sin(t / 60)) + ')' : 'rgba(225,238,248,0.08)';
      ctx.lineWidth = hot ? 1.2 : 0.6; ctx.setLineDash(hot ? [] : [2, 5]);
      ctx.beginPath(); ctx.moveTo(h0.x, h0.y); ctx.lineTo(me.x, me.y); ctx.stroke(); ctx.setLineDash([]);
    });
    if (grab) {
      var held = mode === 'wrap' ? t - grab.wrapT : 0;
      Argos.draw(ctx, grab.x, grab.y, AH, { wrap: held / 1000, jitter: mode === 'wrap' ? (held > HOLD - 600 ? 2.4 : 0.8) : 1.5 });
    }
    OrbWeb.drawSpider(ctx, me.x, me.y, mode === 'rest' ? Math.PI : me.a + Math.PI / 2, mode === 'rest' ? 0 : t / 55);
    if (residueUntil && argos.seen) Argos.draw(ctx, argos.x, argos.y, AH, { residue: argos.sticky() });
    ctx.restore();
  }

  function size() {
    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = innerWidth * DPR; cv.height = innerHeight * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  function loop() { step(); draw(); raf = on ? requestAnimationFrame(loop) : 0; }
  function track(e) {
    if (e.pointerType === 'touch') return;
    ptr.x = e.clientX + scrollX; ptr.y = e.clientY + scrollY; ptr.cx = e.clientX; ptr.cy = e.clientY; ptr.in = true;
  }
  function rescroll() { if (ptr.in) { ptr.x = ptr.cx + scrollX; ptr.y = ptr.cy + scrollY; } }
  function out() { ptr.in = false; }

  function start() {
    if (on) return;
    on = true; webs = []; mend = []; grab = null; residueUntil = 0; resume = null; spinning = null; argos = new Argos.Body();
    restore();
    var home = webs.length ? hub(webs[webs.length - 1]) : { x: scrollX + innerWidth - 40, y: scrollY + 40 };
    me = { x: home.x, y: home.y, a: 0 }; mode = 'rest'; task = null; nextAt = now() + (webs.length ? EVERY / 2 : FIRST);
    cv = document.createElement('canvas'); cv.className = 'charlotte-layer'; cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:40';
    document.body.appendChild(cv); ctx = cv.getContext('2d'); size();
    window.addEventListener('resize', size);
    document.addEventListener('pointermove', track, { passive: true });
    window.addEventListener('scroll', rescroll, { passive: true });
    html.addEventListener('pointerleave', out);
    raf = requestAnimationFrame(loop);
  }
  function stop() {
    if (!on) return;
    on = false; if (raf) cancelAnimationFrame(raf); raf = 0;
    window.removeEventListener('resize', size);
    document.removeEventListener('pointermove', track);
    window.removeEventListener('scroll', rescroll);
    html.removeEventListener('pointerleave', out);
    if (cv && cv.parentNode) cv.parentNode.removeChild(cv);
    html.style.cursor = ''; cv = ctx = null;
  }
  function toggle() {
    var foot = document.querySelector('footer'); if (!foot) return;
    var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'charlotte-toggle';
    function label() { btn.textContent = on ? 'Shoo Charlotte' : 'Let Charlotte back'; btn.setAttribute('aria-pressed', on ? 'false' : 'true'); }
    btn.addEventListener('click', function () {
      if (on) { stop(); put('localStorage', OFF, '1'); } else { put('localStorage', OFF, null); start(); }
      label();
    });
    foot.appendChild(btn); label();
  }

  function boot() {
    if (!able()) return;   // touch screens and reduced motion: no Charlotte, no toggle
    if (get('localStorage', OFF) !== '1') start();
    toggle();
  }
  window.Charlotte = {   // for tests and the quest layer
    peek: function () { return on ? { mode: mode, x: me.x, y: me.y, webs: webs.length, spinning: !!spinning, grabbed: !!grab, mending: mend.length, residue: !!residueUntil } : null; },
    webs: function () { return on ? webs : []; },
    step: function () { if (on) step(); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
