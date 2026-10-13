/* ===== Exhibit 05: termites (Macrotermes) — a self-healing, self-building mound.
   Real Macrotermes: blind, pale workers and soldiers with big dark armoured heads, 6 legs each.
   - Workers foraging lay a trail pheromone on the way home, so a path to food gets stronger the more
     it is used. They eat plant matter (cellulose: wood, grass, paper) and carry it to the fungus
     comb inside the mound, where they farm the Termitomyces fungus on it.
   - Building is stigmergy (Grassé coined the word from termites, 1959): each soil pellet a worker
     sets down carries a cement pheromone that makes the next worker more likely to build there too.
   - A breach in the mound wall: soldiers rush to it first and stand guard facing out; then workers
     arrive with soil and seal it.
   Here the visitor paints with Argos: EAT lays trail pheromone (lead them to the paper and they eat
   the page's words, which grow back), BUILD lays cement pheromone (they build there), and a tap on
   the mound wall breaks it open. Nothing outside this canvas is ever touched. ===== */
(function () {
  if (!window.ZooSims) return;
  var TAU = Math.PI * 2, CS = 6;
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function dist(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }
  function turnTo(a, b) { var d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; }
  var TEXT = 'Termites eat paper. Paint a trail from the mound to this page and watch them read it.';

  function termites() {
    var W, H, keep, inner, gw, gh, soil, wall, trail, cement, paper, onSheet, bitten, mound, comb, gap, sheet, ants = [], mode = 'eat';
    var t = 0, eaten = 0, pellets = 0, healed = 0, fed = 0, breach = null, painting = false, paper0 = 0, last = null;
    function emit(e) { ZooSims.emit('termites', e); }
    function cell(x, y) { var i = x / CS | 0, j = y / CS | 0; return (i < 0 || j < 0 || i >= gw || j >= gh) ? -1 : j * gw + i; }
    function cx(i) { return (i % gw) * CS + CS / 2; }
    function cy(i) { return (i / gw | 0) * CS + CS / 2; }
    function clear(x, y, pad) { return ZooSims.clearOf(keep, x, y, pad); }
    function blocked(x, y) { var i = cell(x, y); return i < 0 || soil[i] >= 0.5 || y > mound.base; }

    function layout() {
      // the mound: a dome on the right, its base above anything that covers the bottom of the canvas
      var base = H * 0.8;
      keep.forEach(function (k) { if (k.x < W * 0.85 && k.x + k.w > W * 0.45 && k.y > H * 0.3) base = Math.min(base, k.y - 8); });
      var R = Math.max(40, Math.min(W * 0.17, base * 0.45, 150));
      mound = { x: W * 0.7, base: base, R: R };
      for (var tries = 0; tries < 8 && !(clear(mound.x + R, base, 4) && clear(mound.x - R, base, 4)); tries++) mound.x -= W * 0.04;
      comb = { x: mound.x, y: base - R * 0.35, r: R * 0.22 };
      gap = { x: mound.x - R - CS, y: base - 1.5 * CS };          // the tunnel mouth, at the foot of the wall
      inner = { x: mound.x - R + 5 * CS, y: base - 1.5 * CS };     // where the tunnel opens inside
      // the paper: upper left, clear of the copy panel
      var pw = Math.min(W * 0.46, 430), ph = Math.min(H * 0.22, 120), px = W * 0.06, py = Math.max(84, H * 0.12);
      while (py > 20 && !(clear(px, py + ph, 4) && clear(px + pw, py + ph, 4))) py -= 10;
      sheet = { x: px, y: py, w: pw, h: ph };
    }
    function build() {
      gw = Math.ceil(W / CS); gh = Math.ceil(H / CS);
      soil = new Float32Array(gw * gh); wall = new Uint8Array(gw * gh); trail = new Float32Array(gw * gh);
      cement = new Float32Array(gw * gh); paper = new Float32Array(gw * gh); onSheet = new Uint8Array(gw * gh); bitten = new Int32Array(gw * gh);
      for (var i = 0; i < gw * gh; i++) {
        var x = cx(i), y = cy(i), d = dist(x, y, mound.x, mound.base);
        var tunnel = Math.abs(y - gap.y) < 1.6 * CS && x >= gap.x - CS && x <= inner.x;
        if (y <= mound.base && d <= mound.R && d >= mound.R - 3 * CS && !tunnel) { soil[i] = 1; wall[i] = 1; }
        if (x >= sheet.x && x <= sheet.x + sheet.w && y >= sheet.y && y <= sheet.y + sheet.h) { paper[i] = 1; onSheet[i] = 1; paper0++; }
      }
    }
    function spawn(kind) {
      return { x: comb.x + rnd(-comb.r, comb.r), y: comb.y + rnd(-comb.r * 0.6, comb.r * 0.6), a: rnd(0, TAU), kind: kind,
               load: null, job: null, timer: 0, out: 0 };
    }
    function deposit(grid, x, y, amt, r) {
      var ci = x / CS | 0, cj = y / CS | 0;
      for (var j = cj - r; j <= cj + r; j++) for (var i = ci - r; i <= ci + r; i++)
        if (i >= 0 && j >= 0 && i < gw && j < gh && !wall[j * gw + i]) grid[j * gw + i] = Math.min(3, grid[j * gw + i] + amt);
    }
    function sense(grid, a) {   // antennae: three feelers ahead; blind, so smell and touch are all they have
      var best = 0, bv = 0.06;
      [-0.6, 0, 0.6].forEach(function (s) {
        var i = cell(a.x + Math.cos(a.a + s) * 9, a.y + Math.sin(a.a + s) * 9);
        if (i >= 0 && grid[i] > bv) { bv = grid[i]; best = s; }
      });
      return bv > 0.06 ? best : null;
    }
    function walk(a, speed) {
      var nx = a.x + Math.cos(a.a) * speed, ny = a.y + Math.sin(a.a) * speed;
      if (blocked(nx, ny) || nx < 3 || nx > W - 3 || ny < 3) { a.a += rnd(1.2, 2.4) * (Math.random() < 0.5 ? -1 : 1); return false; }
      a.x = nx; a.y = ny; return true;
    }
    function steer(a, x, y, k) { a.a += turnTo(a.a, Math.atan2(y - a.y, x - a.x)) * k; }
    function inTunnel(a) { return Math.abs(a.y - gap.y) < 2.5 * CS && a.x >= gap.x - 2 * CS && a.x <= inner.x + CS; }
    function inside(a) { return dist(a.x, a.y, mound.x, mound.base) < mound.R - 3 * CS; }
    function goHome(a) {   // out through the gap, then to the comb
      if (inside(a) && a.x > inner.x - CS) steer(a, comb.x, comb.y, 0.35);
      else if (inTunnel(a)) steer(a, inner.x + 2 * CS, inner.y, 0.5);
      else steer(a, gap.x - CS, gap.y, 0.35);
      a.a += rnd(-0.25, 0.25);
    }
    function deficit(a) {   // the breach cell still short of soil (nearest to worker a, if given)
      if (!breach) return null;
      var pick = null, best = 1e9;
      breach.cells.forEach(function (i) {
        if (1 - soil[i] <= 0.02) return;
        var d = a ? dist(a.x, a.y, cx(i), cy(i)) : 0;
        if (pick === null || d < best) { best = d; pick = i; }
      });
      return pick;
    }

    function worker(a) {
      a.timer++;
      if (a.job === 'repair') {
        var gi = deficit(a);
        if (gi === null) { a.job = null; a.load = null; return; }
        if (a.load !== 'soil') { goHome(a); walk(a, 0.9); if (dist(a.x, a.y, comb.x, comb.y) < comb.r + 4) a.load = 'soil'; return; }
        var bx = cx(gi), by = cy(gi);
        steer(a, bx, by, 0.3); a.a += rnd(-0.2, 0.2);
        if (!walk(a, 0.9) || dist(a.x, a.y, bx, by) < CS * 1.6) {
          if (dist(a.x, a.y, bx, by) < CS * 3.5) {
            if (breach.repairT === null) breach.repairT = t;
            soil[gi] = Math.min(1, soil[gi] + 0.34); a.load = null; pellets++;
          }
        }
        return;
      }
      if (a.load === 'paper') {   // carry it home, laying trail as she goes
        var ti = cell(a.x, a.y); if (ti >= 0 && !wall[ti]) trail[ti] = Math.min(3, trail[ti] + 0.5);
        goHome(a); walk(a, 0.85);
        if (dist(a.x, a.y, comb.x, comb.y) < comb.r) { a.load = null; fed++; a.a = rnd(0, TAU); }
        return;
      }
      if (a.load === 'soil') {   // follow the cement scent, set the pellet down where it is strongest
        var cs = sense(cement, a); if (cs !== null) a.a += cs * 0.5;
        a.a += rnd(-0.3, 0.3); walk(a, 0.8);
        var ci = cell(a.x, a.y);
        if (ci >= 0 && !wall[ci] && cement[ci] > 0.35 && soil[ci] < 1 && dist(a.x, a.y, mound.x, mound.base) > mound.R + CS) {
          soil[ci] = Math.min(1, soil[ci] + 0.34); pellets++; a.load = null; a.timer = 0;
          deposit(cement, a.x, a.y, 0.5, 1);   // the pellet carries cement pheromone: building draws more building
          emit('built');
        } else if (a.timer > 1500) { a.load = null; a.timer = 0; }
        return;
      }
      var pi = cell(a.x, a.y);
      if (pi >= 0 && paper[pi] > 0.05 && (trail[pi] > 0.02 || t - (a.led || -1e9) < 400)) {   // led here by a trail: chew (a lone wanderer just passes over)
        trail[pi] = Math.max(trail[pi], 0.3);   // feeding marks the food, so the others spread over it
        for (var dj = -1; dj <= 1; dj++) for (var di = -1; di <= 1; di++) {   // her mandibles work the paper around her head
          var q = pi + dj * gw + di;
          if (q >= 0 && q < paper.length && onSheet[q] && paper[q] > 0) { paper[q] = Math.max(0, paper[q] - 0.03); bitten[q] = t; eaten += 0.03; }
        }
        a.chew = (a.chew || 0) + 1;
        if (paper[pi] <= 0.05) a.a += rnd(-1, 1);   // this bit is gone: move along the edge to the next
        if (a.chew > 30) { a.chew = 0; a.load = 'paper'; a.timer = 0; emit('ate'); }
        return;
      }
      var tr = sense(trail, a), ce = tr === null ? sense(cement, a) : null;
      if (tr !== null) { a.a += tr * 0.5 + rnd(-0.15, 0.15); a.out = 0; a.led = t; }
      else if (ce !== null) { a.load = 'soil'; a.timer = 0; return; }   // she grabs soil from the ground and goes to build
      else if (inside(a)) {   // at home: mill about the comb, now and then head out to forage
        steer(a, comb.x, comb.y, 0.02); a.a += rnd(-0.4, 0.4);
        if (Math.random() < 0.004) { a.out = 1; a.a = Math.atan2(gap.y - a.y, gap.x - a.x); }
        if (a.out) { if (inTunnel(a) || dist(a.x, a.y, inner.x, inner.y) < 3 * CS) steer(a, gap.x - 3 * CS, gap.y, 0.5); else steer(a, inner.x, inner.y, 0.3); }
      } else {   // outside with nothing found: wander a while, then go home
        a.out++; a.a += rnd(-0.35, 0.35);
        if (a.out > 900) goHome(a);
      }
      walk(a, 0.8);
    }
    function soldier(a) {
      if (breach && breach.open) {   // rush to the breach and guard it, facing out
        var d = dist(a.x, a.y, a.post.x, a.post.y);
        if (d > 2) { steer(a, a.post.x, a.post.y, 0.4); a.a += rnd(-0.1, 0.1); if (!walk(a, 1.3)) { a.x += (a.post.x - a.x) * 0.05; a.y += (a.post.y - a.y) * 0.05; } }
        else { a.x = a.post.x; a.y = a.post.y; a.a = Math.atan2(a.y - mound.base, a.x - mound.x); a.there = true; }
        return;
      }
      a.there = false;
      steer(a, comb.x, comb.y - comb.r, 0.05); a.a += rnd(-0.4, 0.4); walk(a, 0.5);
    }

    var sim = {
      resize: function (w, h, k) {
        W = w; H = h; keep = k || []; t = 0; eaten = 0; pellets = 0; healed = 0; fed = 0; breach = null; paper0 = 0;
        layout(); build(); ants = [];
        for (var i = 0; i < 44; i++) ants.push(spawn('worker'));
        for (var j = 0; j < 8; j++) ants.push(spawn('soldier'));
      },
      step: function () {
        t++;
        for (var i = 0; i < trail.length; i++) {
          trail[i] *= 0.996; cement[i] *= 0.9985;
          if (onSheet[i] && paper[i] < 1 && t - bitten[i] > 3000) paper[i] = Math.min(1, paper[i] + 0.0002);   // left alone ~50 s, the page grows back
        }
        ants.forEach(function (a) { if (a.kind === 'soldier') soldier(a); else worker(a); });
        if (breach && breach.open) {
          var guards = ants.filter(function (a) { return a.kind === 'soldier' && a.there; }).length;
          if (breach.soldierT === null && guards >= 3) {   // soldiers hold the breach: now the workers come
            breach.soldierT = t;
            ants.filter(function (a) { return a.kind === 'worker' && !a.load; }).slice(0, 10).forEach(function (a) { a.job = 'repair'; });
          }
          if (breach.soldierT !== null && deficit() === null) {
            breach.open = false; breach.doneT = t; healed++; emit('repaired');
            breach.cells.forEach(function (c) { wall[c] = 1; });
          }
        }
      },
      draw: function (ctx) {
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(70,50,35,0.55)'; ctx.fillRect(0, mound.base, W, H - mound.base);   // the ground
        // the paper and its words, with holes where it was eaten
        ctx.fillStyle = 'rgba(240,232,210,0.92)'; ctx.fillRect(sheet.x, sheet.y, sheet.w, sheet.h);
        var fs = Math.round(Math.max(10, Math.min(22, sheet.h / 4.4, sheet.w / 15)));   // small sheets (phones) get smaller type
        ctx.fillStyle = '#2a2f3a'; ctx.font = '600 ' + fs + 'px Inter, sans-serif'; ctx.textBaseline = 'top';
        wrap(ctx, TEXT, sheet.x + 10, sheet.y + 8, sheet.w - 20, fs * 1.2);
        for (var i = 0; i < paper.length; i++) {
          if (trail[i] > 0.04) { ctx.fillStyle = 'rgba(255,190,80,' + Math.min(0.4, trail[i] * 0.15) + ')'; ctx.fillRect(cx(i) - CS / 2, cy(i) - CS / 2, CS, CS); }
          if (cement[i] > 0.04) { ctx.fillStyle = 'rgba(120,200,255,' + Math.min(0.4, cement[i] * 0.15) + ')'; ctx.fillRect(cx(i) - CS / 2, cy(i) - CS / 2, CS, CS); }
          if (onSheet[i] && paper[i] < 0.98) { ctx.fillStyle = 'rgba(11,18,28,' + (1 - paper[i]) + ')'; ctx.fillRect(cx(i) - CS / 2, cy(i) - CS / 2, CS, CS); }
          if (soil[i] > 0.02) { ctx.fillStyle = 'rgba(150,105,65,' + (0.35 + 0.6 * soil[i]) + ')'; ctx.fillRect(cx(i) - CS / 2, cy(i) - CS / 2, CS, CS); }
        }
        // the fungus comb they farm inside the mound
        ctx.fillStyle = 'rgba(235,225,200,0.75)';
        for (var k = 0; k < 9; k++) { var a = k / 9 * TAU; ctx.beginPath(); ctx.arc(comb.x + Math.cos(a) * comb.r * 0.55, comb.y + Math.sin(a) * comb.r * 0.4, comb.r * 0.38, 0, TAU); ctx.fill(); }
        ants.forEach(function (a) { drawTermite(ctx, a); });
      },
      down: function (p) {
        var i = cell(p.x, p.y);
        if (i >= 0 && wall[i] && soil[i] >= 0.5 && (!breach || !breach.open)) { open(p); return; }   // a tap on the wall breaks it open
        painting = true; last = p; paint(p);
      },
      move: function (p) {
        if (!painting) return;
        var d = last ? dist(last.x, last.y, p.x, p.y) : 0, n = Math.max(1, Math.ceil(d / CS));
        for (var s = 1; s <= n; s++) paint({ x: last.x + (p.x - last.x) * s / n, y: last.y + (p.y - last.y) * s / n });
        last = p;
      },
      up: function () { painting = false; last = null; },
      leave: function () { painting = false; last = null; },
      setMode: function (m) { mode = m === 'build' ? 'build' : 'eat'; },
      mode: function () { return mode; },
      peek: function () {
        // (inner tunnel end is internal)
        var left = 0; for (var i = 0; i < paper.length; i++) if (onSheet[i]) left += paper[i];
        return { mound: mound, comb: comb, gap: gap, sheet: sheet, paperLeft: left / Math.max(1, paper0), pellets: pellets, fed: fed, healed: healed,
          breach: breach && { x: breach.x, y: breach.y, open: breach.open, t0: breach.t0, soldierT: breach.soldierT, repairT: breach.repairT, doneT: breach.doneT },
          soilAt: function (x, y, r) { var s = 0; for (var j = 0; j < soil.length; j++) if (!wall[j] && dist(cx(j), cy(j), x, y) <= r) s += soil[j]; return s; },
          workers: ants.filter(function (a) { return a.kind === 'worker'; }).length, soldiers: ants.filter(function (a) { return a.kind === 'soldier'; }).length, t: t };
      },
      calm: function () {   // test hook: wipe the pheromones and send everyone home (as if the visitor walked away)
        for (var i = 0; i < trail.length; i++) { trail[i] = 0; cement[i] = 0; }
        ants.forEach(function (a) { a.load = null; a.job = null; a.x = comb.x + rnd(-comb.r, comb.r); a.y = comb.y + rnd(-comb.r * 0.5, comb.r * 0.5); a.out = 0; });
      },
      stat: function () {
        var left = sim.peek().paperLeft;
        return 'eaten ' + Math.round((1 - left) * 100) + '% · pellets ' + pellets + ' · healed ' + healed;
      }
    };
    function paint(p) { deposit(mode === 'build' ? cement : trail, p.x, p.y, 0.8, 2); }
    function open(p) {   // knock a hole in the wall; soldiers are called to it
      var cells = [];
      for (var i = 0; i < soil.length; i++) if (wall[i] && dist(cx(i), cy(i), p.x, p.y) <= 2.5 * CS) { soil[i] = 0; wall[i] = 0; cells.push(i); }
      breach = { x: p.x, y: p.y, cells: cells, open: true, t0: t, soldierT: null, repairT: null, doneT: null };
      var k = 0, sold = ants.filter(function (a) { return a.kind === 'soldier'; });
      sold.forEach(function (a) {   // posts in a ring just inside the hole
        var ang = Math.atan2(p.y - mound.base, p.x - mound.x) + (k++ - sold.length / 2) * 0.09;
        var r = mound.R - 4 * CS;
        a.post = { x: mound.x + Math.cos(ang) * r, y: Math.min(mound.base - CS, mound.base + Math.sin(ang) * r) }; a.there = false;
      });
      emit('breach');
    }
    function wrap(ctx, text, x, y, maxW, lh) {
      if (!ctx.measureText) return;
      var words = text.split(' '), line = '';
      words.forEach(function (w) {
        var test = line ? line + ' ' + w : w;
        var m = ctx.measureText(test), wd = m && m.width || 0;
        if (wd > maxW && line) { ctx.fillText(line, x, y); line = w; y += lh; } else line = test;
      });
      if (line) ctx.fillText(line, x, y);
    }
    function drawTermite(ctx, a) {
      var sold = a.kind === 'soldier';
      ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.a);
      ctx.strokeStyle = 'rgba(230,220,200,0.7)'; ctx.lineWidth = 0.5;   // 6 legs, 3 per side, on the thorax
      for (var s = -1; s <= 1; s += 2) for (var i = 0; i < 3; i++) {
        var sw = Math.sin(t * 0.4 + i * 2 + (s > 0 ? 0 : Math.PI)) * 0.6;
        ctx.beginPath(); ctx.moveTo(-0.6 + i * 1.1, 0); ctx.lineTo(-1.6 + i * 1.7 + sw, s * 2.8); ctx.stroke();
      }
      ctx.fillStyle = '#efe6cf'; ctx.beginPath(); ctx.ellipse(-2.2, 0, 2.4, 1.6, 0, 0, TAU); ctx.fill();   // pale soft abdomen
      ctx.beginPath(); ctx.arc(0.4, 0, 1.1, 0, TAU); ctx.fill();                                          // thorax
      if (sold) {   // soldier: a big dark armoured head with mandibles
        ctx.fillStyle = '#8a4b1c'; ctx.beginPath(); ctx.ellipse(2.8, 0, 2.2, 1.7, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#3a1e0a'; ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(4.6, -0.8); ctx.lineTo(6.2, -0.2); ctx.moveTo(4.6, 0.8); ctx.lineTo(6.2, 0.2); ctx.stroke();
      } else {
        ctx.fillStyle = '#d8b878'; ctx.beginPath(); ctx.arc(2, 0, 1.2, 0, TAU); ctx.fill();   // worker head (no eyes: they are blind)
      }
      if (a.load === 'paper') { ctx.fillStyle = '#f0e8d2'; ctx.fillRect(3, -0.8, 1.8, 1.6); }
      if (a.load === 'soil') { ctx.fillStyle = '#96693f'; ctx.beginPath(); ctx.arc(3.6, 0, 0.9, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    return sim;
  }

  ZooSims.register('termites', termites);

  // the EAT / BUILD buttons in the termite exhibit's copy panel choose what Argos paints
  function wire() {
    Array.prototype.forEach.call(document.querySelectorAll('.termite-mode'), function (btn) {
      btn.addEventListener('click', function () {
        var sec = btn.closest('section'), cv = sec && sec.querySelector('canvas.exhibit-sim'), m = btn.getAttribute('data-mode');
        if (cv && cv.__zooSim && cv.__zooSim.setMode) cv.__zooSim.setMode(m);
        Array.prototype.forEach.call(sec.querySelectorAll('.termite-mode'), function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();
