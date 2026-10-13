/* ===== 4. The exhibits — every creature is a tiny autonomous agent: it senses only
   what's near it and decides for itself. Nothing is scripted; the behavior emerges. ===== */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TAU = Math.PI * 2;
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function dist(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }
  function turnTo(a, b) { var d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; }

  /* --- Exhibit 01: weaver ants — spray pheromone on leaves; the colony hauls them in and weaves the nest --- */
  function weaverAnts() {
    var W, H, CS = 6, gw, gh, ph, nest, leaves, ants, woven, keep = [], spraying = false;
    function newLeaf() {
      var x, y, n = 0;
      // fresh leaves grow out at the canopy's edge, away from the nest, never under the copy panel or the
      // guide (after 20 tries the distance from the nest gives way; staying in sight never does)
      do { x = rnd(18, W - 18); y = rnd(18, H - 18); n++; }
      while ((!ZooSims.clearOf(keep, x, y, 16) || (n < 20 && dist(x, y, nest.x, nest.y) < Math.min(W, H) * 0.4)) && n < 200);
      return { x: x, y: y, r: rnd(10, 13), rot: rnd(0, TAU), mark: 0, crew: [] };
    }
    function spray(p) {
      var ci = p.x / CS | 0, cj = p.y / CS | 0;
      for (var j = cj - 2; j <= cj + 2; j++) for (var i = ci - 2; i <= ci + 2; i++)
        if (i >= 0 && j >= 0 && i < gw && j < gh) ph[j * gw + i] = Math.min(3, ph[j * gw + i] + 0.8);
      leaves.forEach(function (l) { if (dist(p.x, p.y, l.x, l.y) < l.r + 14) l.mark = Math.min(1, l.mark + 0.3); });
    }
    function scent(x, y) {
      var i = x / CS | 0, j = y / CS | 0;
      return (i < 0 || j < 0 || i >= gw || j >= gh) ? -1 : ph[j * gw + i];
    }
    return {
      resize: function (w, h, k) {
        W = w; H = h; keep = k || []; gw = Math.ceil(W / CS); gh = Math.ceil(H / CS); ph = new Float32Array(gw * gh);
        nest = { x: W * 0.5, y: H * 0.5 }; woven = 4;
        leaves = []; for (var k = 0; k < 5; k++) leaves.push(newLeaf());
        ants = []; for (var i = 0; i < 34; i++) ants.push({ x: nest.x + rnd(-20, 20), y: nest.y + rnd(-20, 20), a: rnd(0, TAU), leaf: null, slot: 0 });
      },
      step: function () {
        for (var k = 0; k < ph.length; k++) ph[k] *= 0.985;
        var nestR = 12 + Math.sqrt(woven) * 4;
        ants.forEach(function (a) {
          if (a.leaf) return;   // on a leaf's crew: the leaf moves it
          // sense: user-sprayed trail ahead (3 feelers) and the scent of marked leaves nearby
          var best = 0, bv = 0.05;
          [-0.6, 0, 0.6].forEach(function (s) { var v = scent(a.x + Math.cos(a.a + s) * 14, a.y + Math.sin(a.a + s) * 14); if (v > bv) { bv = v; best = s; } });
          a.a += best * 0.4 + rnd(-0.35, 0.35);
          leaves.forEach(function (l) {
            var d = dist(a.x, a.y, l.x, l.y);
            if (l.mark > 0.05 && d < 40 + l.mark * 140) a.a += turnTo(a.a, Math.atan2(l.y - a.y, l.x - a.x)) * 0.12;
            // grab a leaf: always if it's marked, rarely on its own (a scout's discovery)
            if (!a.leaf && d < l.r + 2 && l.crew.length < 6 && (l.mark > 0.15 || Math.random() < 0.004)) {
              a.leaf = l; a.slot = Math.atan2(a.y - l.y, a.x - l.x); l.crew.push(a);
            }
          });
          a.x += Math.cos(a.a); a.y += Math.sin(a.a);
          if (a.x < 3 || a.x > W - 3) { a.a = Math.PI - a.a; a.x = Math.max(3, Math.min(W - 3, a.x)); }
          if (a.y < 3 || a.y > H - 3) { a.a = -a.a; a.y = Math.max(3, Math.min(H - 3, a.y)); }
        });
        leaves.forEach(function (l, idx) {
          l.mark *= 0.998;
          if (l.crew.length) l.mark = Math.max(l.mark, 0.45);   // a grabbing ant calls for help
          if (l.crew.length >= 3) {   // enough hands: haul it home
            var d = dist(l.x, l.y, nest.x, nest.y), sp = 0.15 + 0.1 * l.crew.length;
            l.x += (nest.x - l.x) / d * sp; l.y += (nest.y - l.y) / d * sp;
            if (d < nestR + l.r * 0.4) {   // weave it in, free the crew, grow a new leaf
              woven++;
              l.crew.forEach(function (a) { a.leaf = null; a.a = rnd(0, TAU); });
              leaves[idx] = newLeaf(); return;
            }
          }
          l.crew.forEach(function (a) {
            a.x = l.x + Math.cos(a.slot) * (l.r + 1); a.y = l.y + Math.sin(a.slot) * (l.r + 1);
            a.a = Math.atan2(nest.y - a.y, nest.x - a.x);
          });
        });
      },
      draw: function (ctx) {
        ctx.clearRect(0, 0, W, H);
        for (var j = 0; j < gh; j++) for (var i = 0; i < gw; i++) {
          var v = ph[j * gw + i]; if (v < 0.04) continue;
          ctx.fillStyle = 'rgba(255,61,157,' + Math.min(0.45, v * 0.18) + ')'; ctx.fillRect(i * CS, j * CS, CS, CS);
        }
        // the nest: woven leaves spiraling out from the center, stitched with silk
        var n = Math.min(woven, 90);
        for (var k = 0; k < n; k++) {
          var ang = k * 2.4, rr = 3 + Math.sqrt(k) * 4;
          ctx.save(); ctx.translate(nest.x + Math.cos(ang) * rr, nest.y + Math.sin(ang) * rr); ctx.rotate(ang);
          ctx.beginPath(); ctx.ellipse(0, 0, 9, 4.5, 0, 0, TAU);
          ctx.fillStyle = 'rgba(70,150,80,0.85)'; ctx.fill();
          ctx.strokeStyle = 'rgba(235,245,240,0.35)'; ctx.lineWidth = 0.5; ctx.stroke(); ctx.restore();
        }
        leaves.forEach(function (l) {
          ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(l.rot);
          if (l.mark > 0.05) { ctx.shadowColor = 'rgba(255,61,157,' + l.mark + ')'; ctx.shadowBlur = 14 * l.mark; }
          ctx.beginPath(); ctx.ellipse(0, 0, l.r, l.r * 0.5, 0, 0, TAU);
          ctx.fillStyle = '#5fbf6a'; ctx.fill(); ctx.shadowBlur = 0;
          ctx.strokeStyle = 'rgba(20,60,30,0.7)'; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(-l.r, 0); ctx.lineTo(l.r, 0); ctx.stroke(); ctx.restore();
          if (l.crew.length >= 3) {   // silk chain: the crew pulling toward the nest
            ctx.strokeStyle = 'rgba(235,245,240,0.25)'; ctx.setLineDash([2, 3]);
            ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(nest.x, nest.y); ctx.stroke(); ctx.setLineDash([]);
          }
        });
        ctx.fillStyle = '#ef9a3c';
        ants.forEach(function (a) {
          ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.a);
          ctx.beginPath(); ctx.ellipse(-2.6, 0, 2.2, 1.5, 0, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.arc(0, 0, 1.1, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.arc(2, 0, 1.3, 0, TAU); ctx.fill();
          ctx.restore();
        });
      },
      down: function (p) { spraying = true; spray(p); },
      move: function (p) { if (spraying) spray(p); },
      up: function () { spraying = false; },
      leave: function () { spraying = false; },
      peek: function () { return { nest: nest, leaves: leaves.map(function (l) { return { x: l.x, y: l.y }; }) }; },
      stat: function () { return 'nest: ' + woven + ' leaves'; }
    };
  }

  /* --- Exhibit 02: Charlotte, a barn spider (Araneus cavaticus, the orb weaver of Charlotte's Web) — an
     arachnid, not an insect: 8 legs, two body parts. She builds the way Araneus really does (js/orbplan.js):
     a straight-sided frame moored to the supports on every side, spun at a steady pace. Then she waits head-down at the hub reading vibrations on the radii. Only the capture spiral is
     sticky. Argos the calculator is far too big to eat, so after wrapping him she cuts him loose
     (orb weavers really do this with unwanted prey) and mends the strands he tore. --- */
  function spider() {
    var W, H, webs, band, caught = 0, tether = null, mouse = { x: 0, y: 0, in: false }, argos = new Argos.Body(), t0 = 0;
    var HOLD = 2000, RESIDUE = 2500, AH = Argos.H, LAG = 4000;   // ms pinned after wrapping, ms of leftover silk, Argos height px, ms before the second spider starts
    var FEEL = ['radius', 'frame', 'bridge', 'y', 'hub', 'mooring', 'drag'], ALL = FEEL.concat(['capture']);
    function emit(e) { if (window.ZooSims) ZooSims.emit('spider', e); }
    function segDist(p, s) {
      var vx = s.x2 - s.x1, vy = s.y2 - s.y1, l2 = vx * vx + vy * vy;
      var t = l2 ? Math.max(0, Math.min(1, ((p.x - s.x1) * vx + (p.y - s.y1) * vy) / l2)) : 0;
      return dist(p.x, p.y, s.x1 + vx * t, s.y1 + vy * t);
    }
    // nearest finished, intact strand of the given kinds on web w
    function nearest(w, p, kinds) {
      var best = null, bd = 1e9, n = Math.floor(w.built);
      for (var i = 0; i < n; i++) {
        var s = w.segs[i]; if (s.broken || kinds.indexOf(s.kind) < 0 || s.gone) continue;
        var d = segDist(p, s); if (d < bd) { bd = d; best = s; }
      }
      return { s: best, d: bd };
    }
    function busy(w) { return w.state === 'attack' || w.state === 'wrap'; }
    function holder() { for (var i = 0; i < webs.length; i++) if (busy(webs[i])) return webs[i]; return null; }
    function ready(w) { return w.state !== 'wait' && w.state !== 'build'; }
    function strike(w, p) { w.state = 'attack'; w.catchPt = { x: p.x, y: p.y }; argos.pin(); emit('caught'); }
    function moveSpider(sp, tx, ty, speed) {
      var d = dist(sp.x, sp.y, tx, ty);
      if (d > 0.5) { sp.a = Math.atan2(ty - sp.y, tx - sp.x); var m = Math.min(d, speed); sp.x += (tx - sp.x) / d * m; sp.y += (ty - sp.y) / d * m; }
      return d;
    }
    /* Two barn spiders, one per top corner, each spinning her own web in her own half of the screen
       above the hero copy (orb weavers are solitary, but neighbours' webs often share a support:
       here, a plant stem down the middle). `keep` tells us where the nav and the copy sit. */
    function layout(keep) {
      var top = 0, bottom = H;
      (keep || []).forEach(function (k) {
        if (k.w >= W * 0.9 && k.y <= 1) top = Math.max(top, k.y + k.h);            // a band across the top (the nav)
        else if (k.w >= W * 0.9 && k.y > H * 0.3) bottom = Math.min(bottom, k.y);   // everything below the hero copy
      });
      if (bottom - top < 160) bottom = H;   // too little room above the copy: let the webs run behind it
      band = { top: top, bottom: bottom };
      return [{ x: 0, y: top, w: W / 2, h: bottom - top }, { x: W / 2, y: top, w: W / 2, h: bottom - top, mirror: true }];
    }
    function makeWeb(box, delay) {
      var plan = OrbWeb.plan(W, H, box), weave = OrbWeb.builder(plan);
      return { hub: plan.hub, R: plan.R, segs: plan.segs, weave: weave, built: 0, state: 'wait', startAt: delay, mend: [],
               corner: { x: weave.spider.x, y: weave.spider.y }, sp: { x: weave.spider.x, y: weave.spider.y, a: Math.PI / 2 } };
    }
    function stepWeb(w, now) {
      var sp = w.sp;
      if (w.state === 'wait') { if (now - t0 < w.startAt) return; w.state = 'build'; }
      if (w.state === 'build') {
        w.weave.step(); w.built = w.weave.built;   // steady silk; she walks the laid lines between threads, and the bridge drifts out on the breeze
        sp.x = w.weave.spider.x; sp.y = w.weave.spider.y; sp.a = w.weave.spider.a;
        var s = w.segs[Math.min(w.segs.length - 1, Math.floor(w.built))];
        if (s.kind === 'capture') w.segs.forEach(function (o) {   // she takes up the temporary spiral as the sticky one closes in
          if (o.kind === 'aux' && !o.gone && dist(o.x1, o.y1, w.hub.x, w.hub.y) > dist(s.x1, s.y1, w.hub.x, w.hub.y)) o.gone = true;
        });
        if (w.weave.done) {   // the last of the scaffolding comes down at the free zone
          w.segs.forEach(function (o) { if (o.kind === 'aux') o.gone = true; });
          w.state = 'rest';
          if (webs.every(ready)) emit('built');
        }
      } else if (w.state === 'rest' || w.state === 'feel') {
        if (w.state === 'feel' && now - w.feelT > 900) w.state = 'rest';
        if (w.state === 'feel') { moveSpider(sp, w.hub.x, w.hub.y, 0.6); sp.a = Math.atan2(w.feelPt.y - w.hub.y, w.feelPt.x - w.hub.x); }
        else if (w.mend.length) {   // walk out and re-lay any strand Argos tore
          var m = w.mend[0];
          if (moveSpider(sp, (m.x1 + m.x2) / 2, (m.y1 + m.y2) / 2, 2.2) < 1) { m.broken = false; w.mend.shift(); if (!w.mend.length) emit('mended'); }
        } else moveSpider(sp, w.hub.x, w.hub.y, 1.4);
      } else if (w.state === 'check') {   // run out along the web to the plucked spot; nothing there, so back to the hub
        if (moveSpider(sp, w.feelPt.x, w.feelPt.y, 5) < 1) w.state = 'rest';
      } else if (busy(w)) {
        if (w.state === 'attack' && moveSpider(sp, w.catchPt.x, w.catchPt.y + AH * 0.55, 6) < 1) { w.state = 'wrap'; w.wrapT = now; }
        if (w.state === 'wrap' && now - w.wrapT > HOLD) {   // too big to be food: she cuts the lines holding him
          caught++; w.state = 'rest'; emit('freed');
          tether = { x: w.catchPt.x, y: w.catchPt.y, until: now + RESIDUE };
          w.segs.forEach(function (o) { if (o.kind === 'capture' && segDist(w.catchPt, o) < 16) { o.broken = true; w.mend.push(o); } });
          argos.release(RESIDUE);
        }
      }
    }
    function drawSpider(ctx, w) {   // at rest she hangs head-down at the hub; waiting, she sits still in her corner
      var still = w.state === 'rest' || w.state === 'wait';
      OrbWeb.drawSpider(ctx, w.sp.x, w.sp.y, still ? Math.PI : w.sp.a + Math.PI / 2, still ? 0 : performance.now() / 55);
    }
    function info(w) { return { x: w.sp.x, y: w.sp.y, state: w.state, hub: w.hub, R: w.R, corner: w.corner,
      bridge: w.segs[1], auxLeft: w.segs.filter(function (o) { return o.kind === 'aux' && !o.gone; }).length }; }
    return {
      ownsArgos: true,   // she pins and wraps him, so she draws him herself
      resize: function (w, h, keep) {
        W = w; H = h; t0 = performance.now(); tether = null;
        webs = layout(keep).map(function (box, i) { return makeWeb(box, i * LAG); });
      },
      step: function () {
        var now = performance.now();
        if (mouse.in) argos.follow(mouse);
        webs.forEach(function (w) { stepWeb(w, now); });
        if (tether && now > tether.until) tether = null;
        if (mouse.in && !holder() && !tether && argos.seen) {
          for (var i = 0; i < webs.length; i++) {
            var w = webs[i]; if (!ready(w)) continue;
            if (nearest(w, argos, ['capture']).d < AH * 0.3) { strike(w, { x: argos.x, y: argos.y }); break; }
            if (w.state === 'rest' && nearest(w, argos, FEEL).d < 4) { w.state = 'feel'; w.feelT = now; w.feelPt = { x: argos.x, y: argos.y }; }
          }
        }
      },
      draw: function (ctx) {
        var now = performance.now(), held = holder();
        ctx.clearRect(0, 0, W, H);
        // the shared support: a plant stem down the middle, between the two webs
        ctx.strokeStyle = 'rgba(120,150,90,0.55)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(W / 2, band.top); ctx.quadraticCurveTo(W / 2 + 6, (band.top + band.bottom) / 2, W / 2 - 2, band.bottom); ctx.stroke();
        webs.forEach(function (w) {
          var n = Math.floor(w.built), shake = busy(w) || w.state === 'feel' || w.state === 'check' ? 1.2 : 0;
          for (var i = 0; i < n; i++) {
            var s = w.segs[i]; if (s.gone || s.broken) continue;
            var j = shake ? Math.sin(now / 18 + i) * shake : 0;
            ctx.strokeStyle = s.kind === 'capture' ? 'rgba(225,238,248,0.42)' : s.kind === 'aux' ? 'rgba(225,238,248,0.18)' : 'rgba(225,238,248,0.3)';
            ctx.lineWidth = s.kind === 'frame' || s.kind === 'bridge' || s.kind === 'mooring' ? 1.1 : 0.7;
            ctx.beginPath(); ctx.moveTo(s.x1 + j, s.y1 - j); ctx.lineTo(s.x2 - j, s.y2 + j); ctx.stroke();
            if (s.kind === 'capture' && i % 2 === 0) {   // glue droplets on the sticky spiral
              ctx.fillStyle = 'rgba(240,250,255,0.5)'; ctx.beginPath(); ctx.arc((s.x1 + s.x2) / 2, (s.y1 + s.y2) / 2, 0.9, 0, TAU); ctx.fill();
            }
          }
          if (w.state === 'build' && n < w.segs.length) {   // the thread she is paying out right now
            var c = w.segs[n], f = w.built % 1, ex = c.x1 + (c.x2 - c.x1) * f, ey = c.y1 + (c.y2 - c.y1) * f;
            ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(c.x1, c.y1);
            if (c.kind === 'bridge') ctx.quadraticCurveTo((c.x1 + ex) / 2, c.y1 + 18 * (1 - f) + Math.sin(now / 300) * 8 * (1 - f), ex, ey);   // floating on the breeze until it snags
            else ctx.lineTo(ex, ey);
            ctx.stroke();
          }
        });
        if (tether && argos.seen) {   // the cut line still stuck to him, stretching as he pulls away
          var al = (tether.until - now) / RESIDUE;
          ctx.strokeStyle = 'rgba(255,255,255,' + 0.75 * al + ')'; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(tether.x, tether.y);
          ctx.quadraticCurveTo((tether.x + argos.x) / 2, Math.max(tether.y, argos.y) + 22, argos.x, argos.y); ctx.stroke();
        }
        if (held) {
          var hold = held.state === 'wrap' ? now - held.wrapT : 0;
          Argos.draw(ctx, held.catchPt.x, held.catchPt.y, AH, { wrap: hold / 1000, jitter: held.state === 'wrap' ? (hold > HOLD - 600 ? 2.4 : 0.8) : 1.5 });
        }
        webs.forEach(function (w) { drawSpider(ctx, w); });
        if (!held && mouse.in && argos.seen) Argos.draw(ctx, argos.x, argos.y, AH, { residue: argos.sticky() });
      },
      down: function (p) {   // pluck a strand: the spider whose web it is reads the vibration and rushes to check it
        if (holder()) return;
        var best = null, bd = 12;
        webs.forEach(function (w) {
          if (!ready(w) || w.state === 'check') return;
          var hit = nearest(w, p, ALL); if (hit.d < bd) { bd = hit.d; best = w; }
        });
        if (best) { best.state = 'check'; best.feelPt = p; emit('plucked'); }
      },
      move: function (p) { mouse.x = p.x; mouse.y = p.y; mouse.in = true; },
      leave: function () { mouse.in = false; argos.lose(); },
      peek: function () { return info(webs[0]); },
      peekAll: function () { return webs.map(info); },
      stat: function () { return 'Argos caught & cut loose: ' + caught; }
    };
  }

  /* --- Exhibit 03: fireflies — each flashes on its own clock, nudged only by neighbors' flashes --- */
  function fireflies() {
    var W, H, flies, R;
    function scramble() { flies.forEach(function (f) { f.p = Math.random(); }); }
    return {
      resize: function (w, h) {
        W = w; H = h; R = Math.max(W, H) * 0.45; flies = [];
        for (var i = 0; i < 28; i++) flies.push({ x: rnd(10, W - 10), y: rnd(10, H - 10), vx: rnd(-0.3, 0.3), vy: rnd(-0.3, 0.3), p: Math.random(), w: rnd(0.0075, 0.0085), glow: 0 });
      },
      step: function () {
        var fired = [];
        flies.forEach(function (f) {
          f.vx += rnd(-0.03, 0.03); f.vy += rnd(-0.03, 0.03); f.vx *= 0.98; f.vy *= 0.98;
          f.x += f.vx; f.y += f.vy;
          if (f.x < 6 || f.x > W - 6) f.vx *= -1; if (f.y < 6 || f.y > H - 6) f.vy *= -1;
          f.p += f.w; f.glow *= 0.9;
          if (f.p >= 1) fired.push(f);
        });
        // pulse coupling: a flash nudges nearby clocks forward (it can cascade)
        while (fired.length) {
          var f = fired.pop(); if (f.glow > 0.9) continue;
          f.p = 0; f.glow = 1;
          flies.forEach(function (g) {
            if (g === f || g.glow > 0.9 || dist(f.x, f.y, g.x, g.y) > R) return;
            g.p += 0.06; if (g.p >= 1) fired.push(g);
          });
        }
      },
      draw: function (ctx) {
        ctx.clearRect(0, 0, W, H);
        flies.forEach(function (f) {
          if (f.glow > 0.05) {
            var g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 16);
            g.addColorStop(0, 'rgba(210,255,120,' + 0.8 * f.glow + ')'); g.addColorStop(1, 'rgba(210,255,120,0)');
            ctx.fillStyle = g; ctx.fillRect(f.x - 16, f.y - 16, 32, 32);
          }
          ctx.fillStyle = 'rgba(210,255,140,' + (0.25 + 0.75 * f.glow) + ')';
          ctx.beginPath(); ctx.arc(f.x, f.y, 1.8, 0, TAU); ctx.fill();
        });
      },
      down: scramble,
      stat: function () {
        var c = 0, s = 0;
        flies.forEach(function (f) { c += Math.cos(f.p * TAU); s += Math.sin(f.p * TAU); });
        return 'in sync: ' + Math.round(Math.sqrt(c * c + s * s) / flies.length * 100) + '%';
      }
    };
  }

  /* --- Exhibit 04: honeybees (Apis mellifera) — scouts search, find flowers and waggle-dance the
     way back to the hive; recruits follow the dance, foragers beeline. Real bee behaviour:
     - scouts search with Levy-like flights: long straight legs, sharp turns between them, leg
       lengths heavy-tailed (many short, a few very long); they see and smell a flower from a
       distance and zig-zag in to land;
     - the waggle dance on the vertical comb: the waggle run's angle from straight up is the flower's
       bearing from the sun (here the sun is the top of the screen), the run lasts longer the farther
       the flower, and a richer flower gets more circuits of the figure-eight;
     - recruits fly the danced vector with error (about +-15 deg, +-20 %), then search the spot;
     - foragers that know a flower fly a straight beeline to it and back. --- */
  function honeybees() {
    var W, H, keep, hive, flowers, bees, links, t, found, reports, legs, dances, recruits;
    var SPEED = 1.6, SEE = 60, BOUT = 2400, LEG0 = 25, SEARCH = 900, SUN_UP = -Math.PI / 2;
    function clear(x, y, pad) { return ZooSims.clearOf(keep, x, y, pad); }
    function addFlower(x, y) {
      if (flowers.length >= 6) flowers.shift();
      flowers.push({ x: x, y: y, nectar: 1 });
    }
    function seedFlower() {
      for (var n = 0; n < 60; n++) {
        var x = rnd(30, W - 30), y = rnd(30, H - 30);
        if (clear(x, y, 20) && dist(x, y, hive.x, hive.y) > Math.min(W, H) * 0.3) { addFlower(x, y); return; }
      }
    }
    function placeHive() {
      var spots = [[0.82, 0.38], [0.82, 0.25], [0.6, 0.3], [0.18, 0.3], [0.5, 0.2]];
      for (var i = 0; i < spots.length; i++) {
        var x = W * spots[i][0], y = H * spots[i][1];
        if (clear(x, y, 30)) return { x: x, y: y };
      }
      return { x: W * 0.82, y: H * 0.38 };
    }
    function newLeg(b) {   // Levy-like: heading anew, length from a power law (P(L) ~ L^-2), capped by the field
      b.a = rnd(0, TAU); b.leg = Math.min(LEG0 / Math.max(Math.random(), 1e-3), Math.hypot(W, H) * 0.6); b.flown = 0;
      legs.push(b.leg); if (legs.length > 300) legs.shift();
    }
    function fly(b, speed, wobble) {
      b.a += rnd(-wobble, wobble);
      b.x += Math.cos(b.a) * speed; b.y += Math.sin(b.a) * speed;
      if (b.x < 6 || b.x > W - 6) { b.a = Math.PI - b.a; b.x = Math.max(6, Math.min(W - 6, b.x)); }
      if (b.y < 6 || b.y > H - 6) { b.a = -b.a; b.y = Math.max(6, Math.min(H - 6, b.y)); }
    }
    function toward(b, x, y, speed) { b.a = Math.atan2(y - b.y, x - b.x); var d = dist(b.x, b.y, x, y); var m = Math.min(d, speed); b.x += Math.cos(b.a) * m; b.y += Math.sin(b.a) * m; return d - m; }
    function spot(b) {   // a flower in sight/scent range
      for (var i = 0; i < flowers.length; i++) { var f = flowers[i]; if (f.nectar > 0.2 && dist(b.x, b.y, f.x, f.y) < SEE) return f; }
      return null;
    }
    function dance(b) {   // encode the flower she found: angle = bearing, run length grows with distance
      var f = b.mem, D = dist(hive.x, hive.y, f.x, f.y), bearing = Math.atan2(f.y - hive.y, f.x - hive.x);
      b.d = { angle: bearing, fromUp: bearing - SUN_UP, bearing: bearing, dist: D, ms: Math.round(250 + D * 3),
              circuits: 2 + Math.round(f.nectar * 4), k: 0, phase: 'run', tt: 0, side: 1, f: f };
      dances.push({ angle: b.d.angle, fromUp: b.d.fromUp, bearing: bearing, dist: D, ms: b.d.ms, circuits: b.d.circuits });
      if (dances.length > 50) dances.shift();
      b.state = 'dance'; reports++; links.push({ f: f, life: 120 });
    }
    function recruit(f, D, bearing) {   // an idle bee that followed the dance flies the vector, with error
      for (var i = 0; i < bees.length; i++) {
        var o = bees[i];
        if (o.state !== 'idle') continue;
        var aim = bearing + rnd(-1, 1) * Math.PI / 12, aimDist = D * (1 + rnd(-0.2, 0.2));
        o.state = 'recruit'; o.goal = { x: hive.x + Math.cos(aim) * aimDist, y: hive.y + Math.sin(aim) * aimDist }; o.timer = 0;
        o.rec = { aim: aim, aimDist: aimDist, bearing: bearing, dist: D, found: false };
        recruits.push(o.rec); if (recruits.length > 50) recruits.shift();
        return;
      }
    }
    function land(b, f) { b.state = 'approach'; b.tgt = f; b.timer = 0; }
    return {
      resize: function (w, h, k) {
        W = w; H = h; keep = k || []; hive = placeHive(); flowers = []; links = []; t = 0;
        found = 0; reports = 0; legs = []; dances = []; recruits = [];
        for (var n = 0; n < 3; n++) seedFlower();
        bees = [];
        for (var i = 0; i < 18; i++) {
          var b = { x: hive.x + rnd(-8, 8), y: hive.y + rnd(-8, 8), a: 0, state: 'idle', timer: rnd(0, 200), ph: rnd(0, TAU), scout: i < 3, mem: null };
          if (b.scout) { b.state = 'scout'; b.timer = 0; newLeg(b); }
          bees.push(b);
        }
      },
      step: function () {
        t++;
        flowers.forEach(function (f) { f.nectar = Math.min(1, f.nectar + 0.0006); });
        links = links.filter(function (l) { return --l.life > 0; });
        bees.forEach(function (b) {
          if (b.tgt && flowers.indexOf(b.tgt) < 0) b.tgt = null;
          if (b.mem && flowers.indexOf(b.mem) < 0) b.mem = null;
          b.timer++;
          if (b.state === 'idle') {   // on the comb, waiting for news
            b.x += (hive.x + Math.cos(t * 0.04 + b.ph) * 10 - b.x) * 0.05; b.y += (hive.y + Math.sin(t * 0.05 + b.ph) * 7 - b.y) * 0.05;
            if (b.scout && b.timer > 240) { b.state = 'scout'; b.timer = 0; newLeg(b); }
          } else if (b.state === 'scout') {
            fly(b, SPEED, 0.04); b.flown += SPEED;
            if (b.flown >= b.leg) newLeg(b);
            var f = spot(b);
            if (f) land(b, f);
            else if (b.timer > BOUT) { b.state = 'home'; b.mem = null; }   // a bout with no luck: back to the hive
          } else if (b.state === 'approach') {   // zig-zag in on the scent and colour, then land
            var zz = Math.sin(b.timer * 0.35) * 0.9;
            var left = toward(b, b.tgt ? b.tgt.x : b.x, b.tgt ? b.tgt.y : b.y, 1.1);
            b.x += Math.cos(b.a + Math.PI / 2) * zz * Math.min(1, left / 20); b.y += Math.sin(b.a + Math.PI / 2) * zz * Math.min(1, left / 20);
            if (!b.tgt) { b.state = 'home'; }
            else if (left < 2) { b.state = 'sip'; b.timer = 0; }
          } else if (b.state === 'sip') {
            if (b.timer > 45 && b.tgt) {
              b.tgt.nectar = Math.max(0, b.tgt.nectar - 0.1);
              if (!b.mem) found++;
              if (b.rec) { b.rec.found = true; b.rec = null; }
              b.mem = b.tgt; b.tgt = null; b.state = 'home';
            }
          } else if (b.state === 'home' || b.state === 'forage') {   // beelines: home with nectar, or out to a known flower
            var g = b.state === 'home' ? hive : b.mem;
            if (!g) { b.state = 'home'; return; }
            var rest = toward(b, g.x, g.y, SPEED * 1.25);
            if (b.state === 'forage' && rest < SEE * 0.5) land(b, b.mem);
            else if (b.state === 'home' && rest < 3) {
              if (b.mem && b.mem.nectar > 0.3 && (b.scout || Math.random() < 0.5)) dance(b);
              else { b.state = 'unload'; b.timer = 0; }
            }
          } else if (b.state === 'unload') {
            if (b.timer > 40) {
              if (b.mem && b.mem.nectar > 0.2 && !b.scout) { b.state = 'forage'; }
              else { b.mem = null; b.state = 'idle'; b.timer = 0; }
            }
          } else if (b.state === 'dance') {   // the figure-eight: waggle run along the bearing, return loop, other side
            var d = b.d, frames = d.ms / 16.7;
            d.tt++;
            if (d.phase === 'run') {
              var u = d.tt / frames;
              b.a = d.angle;
              b.x = hive.x + Math.cos(d.angle) * (u * 14 - 7) + Math.cos(d.angle + Math.PI / 2) * Math.sin(d.tt * 1.4) * 2;
              b.y = hive.y + Math.sin(d.angle) * (u * 14 - 7) + Math.sin(d.angle + Math.PI / 2) * Math.sin(d.tt * 1.4) * 2;
              if (d.tt >= frames) { d.phase = 'loop'; d.tt = 0; }
            } else {
              var v = d.tt / 40, th = d.angle + Math.PI * v * d.side;   // a half circle back to the start, alternating sides
              b.a = th + Math.PI / 2 * d.side;
              b.x = hive.x + Math.cos(d.angle) * 7 * Math.cos(Math.PI * v) - Math.cos(d.angle + Math.PI / 2) * 7 * Math.sin(Math.PI * v) * d.side;
              b.y = hive.y + Math.sin(d.angle) * 7 * Math.cos(Math.PI * v) - Math.sin(d.angle + Math.PI / 2) * 7 * Math.sin(Math.PI * v) * d.side;
              if (d.tt >= 40) {
                d.k++; d.side = -d.side; d.phase = 'run'; d.tt = 0;
                recruit(d.f, d.dist, d.bearing);
                if (d.k >= d.circuits) {
                  b.d = null; b.timer = 0;
                  if (b.scout) { b.state = 'scout'; b.mem = null; newLeg(b); }
                  else b.state = b.mem && b.mem.nectar > 0.2 ? 'forage' : 'idle';
                }
              }
            }
          } else if (b.state === 'recruit') {   // fly the danced vector...
            if (toward(b, b.goal.x, b.goal.y, SPEED * 1.15) < 2) { b.state = 'search'; b.timer = 0; b.leg = 0; }
            var seen = spot(b); if (seen) land(b, seen);
          } else if (b.state === 'search') {   // ...then search the spot in widening loops
            b.a += 0.09 - Math.min(0.07, b.timer * 0.0001); b.x += Math.cos(b.a) * SPEED; b.y += Math.sin(b.a) * SPEED;
            var fs = spot(b);
            if (fs) land(b, fs);
            else if (b.timer > SEARCH) { b.state = 'home'; b.mem = null; if (b.rec) b.rec = null; }
          }
        });
      },
      draw: function (ctx) {
        ctx.clearRect(0, 0, W, H);
        links.forEach(function (l) {   // what the dance tells the hive: the way to the flower
          ctx.strokeStyle = 'rgba(34,230,198,' + 0.45 * l.life / 120 + ')'; ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(hive.x, hive.y); ctx.lineTo(l.f.x, l.f.y); ctx.stroke(); ctx.setLineDash([]);
        });
        flowers.forEach(function (f) {
          var r = 3 + f.nectar * 3;
          ctx.fillStyle = 'rgba(255,61,157,' + (0.4 + 0.6 * f.nectar) + ')';
          for (var k = 0; k < 5; k++) { var a = k / 5 * TAU; ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r, r * 0.7, 0, TAU); ctx.fill(); }
          ctx.fillStyle = '#f0c850'; ctx.beginPath(); ctx.arc(f.x, f.y, r * 0.6, 0, TAU); ctx.fill();
        });
        // the hive: a patch of comb
        ctx.strokeStyle = 'rgba(240,200,80,0.7)'; ctx.lineWidth = 1; ctx.fillStyle = 'rgba(240,200,80,0.12)';
        for (var c = 0; c < 7; c++) {
          var cx = hive.x + (c ? Math.cos(c / 6 * TAU) * 11 : 0), cy = hive.y + (c ? Math.sin(c / 6 * TAU) * 11 : 0);
          ctx.beginPath(); for (var k2 = 0; k2 < 6; k2++) { var a2 = k2 / 6 * TAU + Math.PI / 6; ctx.lineTo(cx + Math.cos(a2) * 6, cy + Math.sin(a2) * 6); }
          ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        bees.forEach(function (b) {
          ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.state === 'idle' ? Math.sin(t * 0.1 + b.ph) : b.a); ctx.scale(1.6, 1.6);
          ctx.strokeStyle = 'rgba(40,40,40,0.8)'; ctx.lineWidth = 0.5;   // 6 legs, 3 per side, all on the thorax
          for (var s = -1; s <= 1; s += 2) for (var i = 0; i < 3; i++) {
            ctx.beginPath(); ctx.moveTo(-0.5 + i * 1.1, 0); ctx.lineTo(-1.5 + i * 1.6, s * 3); ctx.stroke();
          }
          var flap = b.state === 'idle' || b.state === 'sip' ? 0.2 : Math.sin(t * 2 + b.ph) * 0.5;   // two wing pairs (fore and hind)
          ctx.fillStyle = 'rgba(230,240,255,0.55)';
          ctx.beginPath(); ctx.ellipse(-0.5, -2.6, 2.3, 1.2, 0.5 + flap, 0, TAU); ctx.ellipse(-0.5, 2.6, 2.3, 1.2, -0.5 - flap, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.ellipse(-1.6, -2, 1.5, 0.8, 0.8 + flap, 0, TAU); ctx.ellipse(-1.6, 2, 1.5, 0.8, -0.8 - flap, 0, TAU); ctx.fill();
          ctx.fillStyle = '#f0c850'; ctx.beginPath(); ctx.ellipse(-1.6, 0, 2.4, 1.8, 0, 0, TAU); ctx.fill();   // abdomen
          ctx.fillStyle = '#2a2f3a'; ctx.fillRect(-2.6, -1.6, 0.8, 3.2); ctx.fillRect(-1.2, -1.75, 0.8, 3.5);   // its dark bands
          ctx.fillStyle = '#c9a03e'; ctx.beginPath(); ctx.arc(0.8, 0, 1.3, 0, TAU); ctx.fill();   // thorax
          ctx.fillStyle = '#2a2f3a'; ctx.beginPath(); ctx.arc(2.4, 0, 0.9, 0, TAU); ctx.fill();   // head
          ctx.restore();
        });
      },
      down: function (p) { addFlower(p.x, p.y); },
      peek: function () {
        return { hive: hive, flowers: flowers, found: found, reports: reports, legs: legs, dances: dances, recruits: recruits,
          bees: bees.map(function (b) { return { x: b.x, y: b.y, state: b.state }; }) };
      },
      stat: function () { return 'flowers found: ' + found + ' · dances: ' + reports; }
    };
  }

  /* Keep-out: rects (canvas px) where the exhibit's copy or Argos the guide sit over the canvas.
     clearOf() says whether a point is at least `pad` px clear of all of them. */
  function clearOf(keep, x, y, pad) {
    pad = pad || 0;
    for (var i = 0; keep && i < keep.length; i++) {
      var k = keep[i];
      if (x > k.x - pad && x < k.x + k.w + pad && y > k.y - pad && y < k.y + k.h + pad) return false;
    }
    return true;
  }

  /* --- registry: sims register a factory; mount() runs the harness on one canvas --- */
  var MAKERS = {}, LISTENERS = [], MOUNTED = [];
  window.ZooSims = {
    registry: MAKERS,
    register: function (name, factory) {   // a sim in its own file (deferred after this one) still mounts
      MAKERS[name] = factory;
      if (document.readyState !== 'loading' && document.querySelectorAll)
        Array.prototype.forEach.call(document.querySelectorAll('canvas.exhibit-sim[data-sim="' + name + '"]'), mount);
    },
    on: function (fn) { LISTENERS.push(fn); },
    emit: function (sim, evt, data) { LISTENERS.forEach(function (fn) { try { fn(sim, evt, data); } catch (e) { if (window.console) console.error('ZooSims listener failed:', sim, evt, e); } }); },
    mount: mount,
    clearOf: clearOf,
    orbPlan: window.OrbWeb && OrbWeb.plan
  };
  ZooSims.register('ants', weaverAnts); ZooSims.register('spider', spider);
  ZooSims.register('fireflies', fireflies); ZooSims.register('bees', honeybees);

  /* --- harness: size each canvas, route pointer events, run only while on screen --- */
  function mount(cv) {
    var make = MAKERS[cv.getAttribute('data-sim')]; if (!make || MOUNTED.indexOf(cv) >= 0) return; MOUNTED.push(cv);
    var sim = make(cv), ctx = cv.getContext('2d'), statEl = cv.parentNode.querySelector('.exhibit-stat');
    cv.__zooSim = sim;   // page controls (the termite mode buttons) reach their sim through its canvas
    var visible = false, raf = 0, frames = 0, w0 = 0;
    // Argos is the cursor in every exhibit: the harness draws him unless the sim does it itself
    var argos = !sim.ownsArgos && window.Argos ? new Argos.Body() : null, ptr = { x: 0, y: 0, in: false };
    function keepOut(cr) {   // the copy panel (measured expanded) and the docked guide, in canvas px
      var out = [], ov = cv.parentNode.querySelector('.exhibit-overlay'), guide = document.getElementById('argos-guide');
      if (ov && !/\bexhibit--hero\b/.test(cv.parentNode.className)) {
        var shut = ov.classList.contains('is-collapsed');
        if (shut) ov.classList.remove('is-collapsed');
        var o = ov.getBoundingClientRect();
        if (shut) ov.classList.add('is-collapsed');
        if (o.width) out.push({ x: o.left - cr.left, y: o.top - cr.top, w: o.width, h: o.height });
      }
      if (ov && /\bexhibit--hero\b/.test(cv.parentNode.className)) {   // hero copy: everything below its top edge
        var hc = ov.getBoundingClientRect();
        if (hc.width) out.push({ x: 0, y: hc.top - cr.top, w: cr.width, h: cr.bottom - hc.top });
      }
      var nav = document.querySelector && document.querySelector('nav');
      if (nav) {   // the fixed nav bar hides the top of the canvas
        var nr = nav.getBoundingClientRect();
        if (nr.height && nr.bottom > cr.top && nr.top <= cr.top + 1) out.push({ x: 0, y: 0, w: cr.width, h: nr.bottom - cr.top });
      }
      if (guide) {   // fixed bottom-right: it covers the canvas's bottom-right whenever the exhibit fills the screen.
        var g = guide.getBoundingClientRect(), big = cr.width > 480;   // on a desktop reserve his open size (his bubble
        var gw = big ? Math.max(g.width, 300) : g.width, gh = big ? Math.max(g.height, 250) : g.height;   // fills in later)
        if (gw) out.push({ x: cr.width - gw - 16, y: cr.height - gh - 16, w: gw + 16, h: gh + 16 });
      }
      return out;
    }
    function size() {
      var r = cv.getBoundingClientRect(), DPR = Math.min(window.devicePixelRatio || 1, 2);
      if (!r.width || Math.abs(r.width - w0) < 1) return;
      w0 = r.width; cv.width = r.width * DPR; cv.height = r.height * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0); sim.resize(r.width, r.height, keepOut(r));
      if (reduce) { for (var i = 0; i < 600; i++) sim.step(); render(); }
    }
    function drawArgos() {
      if (!argos || !ptr.in) return;
      argos.follow(ptr); Argos.draw(ctx, argos.x, argos.y, Argos.H);
    }
    function render() { sim.draw(ctx); drawArgos(); if (statEl && sim.stat) statEl.textContent = sim.stat(); }
    function loop() {
      sim.step(); sim.draw(ctx); drawArgos();
      if (statEl && sim.stat && frames++ % 15 === 0) statEl.textContent = sim.stat();
      raf = visible ? requestAnimationFrame(loop) : 0;
    }
    function pos(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    function poke(fn, e) { if (!fn) return; fn(pos(e)); if (reduce) { sim.step(); render(); } }
    cv.addEventListener('pointerdown', function (e) { if (sim.down) { e.preventDefault(); poke(sim.down, e); } });
    cv.addEventListener('pointermove', function (e) {
      if (argos && e.pointerType !== 'touch') { var p = pos(e); ptr.x = p.x; ptr.y = p.y; ptr.in = true; }
      poke(sim.move, e);
    });
    cv.addEventListener('pointerup', function (e) { poke(sim.up, e); });
    cv.addEventListener('pointerleave', function () { ptr.in = false; if (argos) argos.lose(); if (sim.leave) sim.leave(); });
    size();
    window.addEventListener('resize', function () { clearTimeout(cv.__rz); cv.__rz = setTimeout(size, 150); });
    if (reduce) return;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (ents) {
        visible = ents[0].isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(loop);
      }).observe(cv);
    } else { visible = true; raf = requestAnimationFrame(loop); }
  }
  function mountAll() { Array.prototype.forEach.call(document.querySelectorAll('canvas.exhibit-sim'), mount); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAll); else mountAll();
})();
