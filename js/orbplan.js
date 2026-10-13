(function () {
  var TAU = Math.PI * 2;
  /* The orb weaver's build, in the order Araneus really lays it (ZooSims.orbPlan, also used by
     Charlotte): a bridge line floated across between two supports; the Y (its centre pulled down and
     fixed by a mooring line below), which makes the hub and the first three radii; more radii on
     alternating sides, with the frame threads laid as their tips reach the edge and moorings run out
     to the supports at the frame's corners; a hub ring; a temporary spiral laid outward; and last the
     sticky spiral laid inward, with turnbacks filling the longer lower half first and a free zone left
     round the hub. The frame is a few long straight threads, so the radii end on it at unequal
     lengths, and the hub sits high, leaving more catching area below. */
  function planIn(W, H) {
    var N = 24, R = Math.min((W - 16) / 2.1, (H - 16) / 1.75);
    var hub = { x: W / 2, y: H / 2 - 0.25 * R }, yb = hub.y - 0.6 * R, segs = [], len = [], tip = [], k, i;
    function ang(k) { return -Math.PI / 2 + k / N * TAU; }
    function seg(kind, a, b) { segs.push({ kind: kind, x1: a.x, y1: a.y, x2: b.x, y2: b.y }); }
    function at(k, r) { return { x: hub.x + r * Math.cos(ang(k)), y: hub.y + r * Math.sin(ang(k)) }; }
    var yl = 21, yr = 3, yd = 12, rgt = 7, lft = 17;   // the Y arms and the frame's corners, as radius numbers
    var top = (hub.y - yb) / -Math.sin(ang(yl));
    var corner = {}; corner[yl] = top; corner[yr] = top; corner[rgt] = 1.0 * R; corner[yd] = 1.05 * R; corner[lft] = 0.95 * R;
    var ring = [yr, rgt, yd, lft, yl].map(function (k) { return at(k, corner[k]); });   // frame sides run corner to corner; the top side is the bridge
    function hit(k) {   // where radius k meets the frame: nearest crossing of its ray with a side
      var dx = Math.cos(ang(k)), dy = Math.sin(ang(k)), best = 1e9;
      for (var j = 0; j < ring.length; j++) {
        var a = ring[j], b = ring[(j + 1) % ring.length], ex = b.x - a.x, ey = b.y - a.y, den = dx * ey - dy * ex;
        if (Math.abs(den) < 1e-9) continue;
        var t = ((a.x - hub.x) * ey - (a.y - hub.y) * ex) / den, u = ((a.x - hub.x) * dy - (a.y - hub.y) * dx) / den;
        if (t > 0 && u >= -1e-9 && u <= 1 + 1e-9 && t < best) best = t;
      }
      return best;
    }
    for (k = 0; k < N; k++) { len[k] = corner[k] || hit(k); tip[k] = at(k, len[k]); }
    var onBridge = function (k) { return Math.abs(tip[k].y - yb) < 0.01; };
    var moor = {};   // mooring lines from the frame's corners out to the supports (the canvas edges)
    moor[yd] = { x: tip[yd].x, y: H }; moor[rgt] = { x: W, y: tip[rgt].y - 0.12 * R }; moor[lft] = { x: 0, y: tip[lft].y - 0.04 * R };
    seg('bridge', { x: 0, y: yb }, { x: W, y: yb });
    seg('y', tip[yl], hub); seg('y', hub, tip[yr]); seg('y', hub, tip[yd]);
    seg('mooring', tip[yd], moor[yd]);   // she drops the Y line to something below and fixes it there
    if (yb > 1) { seg('mooring', tip[yl], { x: tip[yl].x, y: 0 }); seg('mooring', tip[yr], { x: tip[yr].x, y: 0 }); }   // and guys the bridge up to the support above
    var placed = {}, framed = {}, moored = {};
    placed[yl] = placed[yr] = placed[yd] = true; moored[yd] = true;
    var rest = []; for (k = 0; k < N; k++) if (!placed[k]) rest.push(k);
    var m = Math.ceil(rest.length / 2), order = [];
    for (i = 0; i < m; i++) { order.push(rest[i]); if (rest[m + i] != null) order.push(rest[m + i]); }
    function frame(a, b) {   // a frame thread between two radius tips, then a mooring at any corner it reaches
      var key = Math.min(a, b) + ':' + Math.max(a, b);
      if (framed[key] || (onBridge(a) && onBridge(b))) return;
      framed[key] = true; seg('frame', tip[a], tip[b]);
      [a, b].forEach(function (c) { if (moor[c] && !moored[c]) { moored[c] = true; seg('mooring', tip[c], moor[c]); } });
    }
    order.forEach(function (k) {   // a radius, then any frame thread its tip now makes possible
      seg('radius', hub, tip[k]); placed[k] = true;
      [(k + N - 1) % N, (k + 1) % N].forEach(function (n) { if (placed[n]) frame(k, n); });
    });
    for (k = 0; k < N; k++) frame(k, (k + 1) % N);   // close any frame gaps between the Y arms and their neighbours
    for (i = 0; i < 6; i++) seg('hub', at(i * 4, 0.06 * R), at((i + 1) * 4 % N, 0.06 * R));
    var auxSteps = N * 3, prev = null;   // temporary spiral, hub outward
    for (i = 0; i <= auxSteps; i++) {
      var p = at(i % N, 0.1 * R + 0.4 * R * i / auxSteps);
      if (prev) seg('aux', prev, p); prev = p;
    }
    /* Sticky spiral, evenly meshed: rows about `gap` apart, so the long radii below the hub carry more
       rows than the short ones above. Whole loops get as many rows as the upper half typically holds;
       she lays the extra outer rows of the lower half first, as turnback patches back and forth across
       the radii below the hub, then spirals inward round and round to the free zone at Rin. */
    var Rin = 0.25 * R, gap = Math.max(0.055 * R, 4), span = [], rows = [], lo = [], up = 0, nu = 0, last;
    for (k = 0; k < N; k++) {
      span[k] = 0.95 * (len[k] - Rin); rows[k] = Math.max(2, Math.round(span[k] / gap));
      if (Math.sin(ang(k)) > 0.01) lo.push(k); else { up += rows[k]; nu++; }
    }
    var loops = Math.max(2, Math.round(up / nu)), most = 0, flip = 0;
    for (k = 0; k < N; k++) { rows[k] = lo.indexOf(k) < 0 ? loops : Math.max(rows[k], loops); most = Math.max(most, rows[k]); }
    function row(k, j) { return at(k, Rin + j * span[k] / rows[k]); }   // row j on radius k (0 = edge of the free zone)
    for (var j = most; j > loops; j--) {   // turnback rows, outermost first, in runs over the lower radii long enough
      var runs = [], run = [];
      lo.concat([-1]).forEach(function (k) { if (k >= 0 && rows[k] >= j) run.push(k); else { if (run.length > 1) runs.push(run); run = []; } });
      runs.forEach(function (r) {
        prev = null; (flip++ % 2 ? r.slice().reverse() : r).forEach(function (k) { var q = row(k, j); if (prev) seg('capture', prev, q); prev = q; last = k; });
      });
    }
    var start = last != null ? last : 0, steps = N * loops; prev = null;   // ...then whole loops inward to the free zone
    for (i = 0; i <= steps; i++) {
      var kk = (start + i) % N, q2 = at(kk, Rin + loops * (1 - i / steps) * span[kk] / rows[kk]);
      if (prev) seg('capture', prev, q2); prev = q2;
    }
    return { hub: hub, R: R, segs: segs };
  }

  /* orbPlan(W, H) is one web filling the canvas. orbPlan(W, H, box) fits a web in box {x, y, w, h,
     mirror}: its moorings run to the box's edges (the supports: whatever is above, below and beside
     it), `mirror` flips it left-right, and it starts with a 'drag' line. She starts in the box's top
     corner (top-right when mirrored) and trails a dragline down her support to where she casts the bridge. */
  function orbPlan(W, H, box) {
    if (!box) return planIn(W, H);
    var p = planIn(box.w, box.h), m = !!box.mirror;
    function X(x) { return m ? box.x + box.w - x : box.x + x; }
    var b = p.segs[0], segs = [{ kind: 'drag', x1: X(0), y1: box.y, x2: X(b.x1), y2: box.y + b.y1 }];
    p.segs.forEach(function (s) { segs.push({ kind: s.kind, x1: X(s.x1), y1: box.y + s.y1, x2: X(s.x2), y2: box.y + s.y2 }); });
    return { hub: { x: X(p.hub.x), y: box.y + p.hub.y }, R: p.R, segs: segs, box: box };
  }

  /* Lays a plan's silk at a steady rate, the way she spins it: the thread end is always at her
     spinnerets, she pays out `spin` px of silk a frame (carrying on into the next thread when it starts
     where she is), walks along the silk already laid to reach a thread that starts elsewhere, and lets
     the bridge line drift out on the breeze while she waits at its start. */
  function builder(plan, o) {
    o = o || {};
    var segs = plan.segs, n = segs.length, spin = o.spin || Math.max(1.5, plan.R * 0.05), walk = o.walk || spin * 1.6;
    var drift = o.drift || spin * 0.3, i = 0, d = 0, me = { x: segs[0].x1, y: segs[0].y1, a: 0 };
    function L(s) { return Math.hypot(s.x2 - s.x1, s.y2 - s.y1); }
    var b = {
      spider: me, done: false, built: 0,
      step: function () {
        if (i >= n) return;
        var s = segs[i];
        if (s.kind === 'bridge') { d += drift; if (d >= L(s)) { i++; d = 0; } }
        else {
          var gx = s.x1 - me.x, gy = s.y1 - me.y, gap = Math.hypot(gx, gy);
          if (d === 0 && gap > 0.5) {   // walk to where the next thread starts, laying nothing
            var mv = Math.min(gap, walk); me.a = Math.atan2(gy, gx); me.x += gx / gap * mv; me.y += gy / gap * mv;
          } else {
            var budget = spin;
            while (budget > 1e-9 && i < n) {
              s = segs[i]; var l = L(s), take = Math.min(budget, l - d);
              d += take; budget -= take;
              me.a = Math.atan2(s.y2 - s.y1, s.x2 - s.x1); me.x = s.x1 + (s.x2 - s.x1) * (l ? d / l : 1); me.y = s.y1 + (s.y2 - s.y1) * (l ? d / l : 1);
              if (d >= l - 1e-9) { i++; d = 0; if (i < n && Math.hypot(segs[i].x1 - me.x, segs[i].y1 - me.y) > 0.5) break; }
            }
          }
        }
        b.built = i >= n ? n : i + d / (L(segs[i]) || 1); b.done = i >= n;
      }
    };
    return b;
  }
  /* Charlotte herself, a barn spider (Araneus cavaticus): an arachnid, not an insect, so 8 legs and two
     body parts. `rot` turns her (pi = head-down at the hub); `phase` animates the legs (0 = still). */
  function drawSpider(ctx, x, y, rot, phase) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.strokeStyle = '#a88a68'; ctx.lineWidth = 1;
    for (var s = -1; s <= 1; s += 2) for (var i = 0; i < 4; i++) {   // 4 pairs of jointed legs, all on the cephalothorax
      var base = -1.1 + i * 0.62, a = base + Math.sin(phase + i * 1.7 + (s > 0 ? 0 : Math.PI)) * 0.18;
      var kx = s * Math.cos(a) * 8, ky = Math.sin(a) * 8 - 3, len = i === 0 || i === 3 ? 1.7 : 1.4;
      ctx.beginPath(); ctx.moveTo(s * 1.5, -3 + i * 0.8); ctx.lineTo(kx, ky - 3); ctx.lineTo(kx * len, ky * len + 1); ctx.stroke();
    }
    ctx.fillStyle = '#7d6650'; ctx.strokeStyle = '#3b2c1e'; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.ellipse(0, -3, 3.2, 3.6, 0, 0, TAU); ctx.fill(); ctx.stroke();      // cephalothorax
    ctx.beginPath(); ctx.ellipse(0, 6, 5.8, 7, 0, 0, TAU); ctx.fill(); ctx.stroke();         // abdomen
    ctx.fillStyle = '#4a3726';                                                                // the dark leaf-shaped folium of a barn spider
    ctx.beginPath(); ctx.moveTo(0, 0.5); ctx.quadraticCurveTo(4, 5, 0, 12); ctx.quadraticCurveTo(-4, 5, 0, 0.5); ctx.fill();
    ctx.restore();
  }
  window.OrbWeb = { plan: orbPlan, builder: builder, drawSpider: drawSpider };
})();
