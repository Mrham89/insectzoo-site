/* Argos the calculator, as the visitor's cursor inside every exhibit canvas.
   Sims draw him themselves (so silk, ants or a spider can sit on top of him) and own
   where he is: an ArgosBody follows the real pointer until a sim pins it, which is how
   the spider can hold him in the web while the actual mouse moves on. */
(function () {
  var TAU = Math.PI * 2, ASPECT = 300 / 330;   // argos.svg viewBox
  var img = new Image(), ready = false;
  img.onload = function () { ready = true; };
  img.src = (document.currentScript && document.currentScript.src.replace(/js\/argos\.js.*$/, '') || '') + 'argos.svg';

  function now() { return performance.now(); }

  // until the SVG loads: a plain little calculator, LCD up top, keypad below
  function fallback(ctx, h) {
    var w = h * ASPECT;
    ctx.fillStyle = '#1f2d3d'; ctx.strokeStyle = '#d2d9e4'; ctx.lineWidth = 1;
    ctx.fillRect(-w * 0.4, -h * 0.4, w * 0.8, h * 0.8); ctx.strokeRect(-w * 0.4, -h * 0.4, w * 0.8, h * 0.8);
    ctx.fillStyle = '#22e6c6'; ctx.fillRect(-w * 0.3, -h * 0.32, w * 0.6, h * 0.2);
    ctx.fillStyle = '#f0c850';
    for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) ctx.fillRect(-w * 0.28 + c * w * 0.2, -h * 0.04 + r * h * 0.13, w * 0.14, h * 0.09);
  }

  /* opts: wrap 0..1 (cocoon building up), residue 0..1 (leftover silk fading out),
           jitter px (struggling), alpha */
  function draw(ctx, x, y, h, opts) {
    opts = opts || {};
    var t = now(), w = h * ASPECT;
    ctx.save();
    if (opts.jitter) { x += Math.sin(t / 23) * opts.jitter; y += Math.cos(t / 31) * opts.jitter * 0.6; ctx.translate(x, y); ctx.rotate(Math.sin(t / 47) * 0.08 * opts.jitter); }
    else ctx.translate(x, y);
    if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
    if (ready) ctx.drawImage(img, -w / 2, -h / 2, w, h); else fallback(ctx, h);
    ctx.globalAlpha = 1;
    if (opts.wrap) silk(ctx, w, h, Math.min(1, opts.wrap), 1, 0);
    if (opts.residue) {
      silk(ctx, w, h, 0.45, opts.residue, 1);
      ctx.strokeStyle = 'rgba(255,255,255,' + 0.6 * opts.residue + ')'; ctx.lineWidth = 0.8;
      for (var k = -1; k <= 1; k++) {   // strands dangling off him, swaying as he moves
        var sx = k * w * 0.22, sway = Math.sin(t / 180 + k * 1.3) * 6;
        ctx.beginPath(); ctx.moveTo(sx, h * 0.3);
        ctx.quadraticCurveTo(sx + sway, h * 0.55, sx + sway * 1.6, h * (0.55 + 0.25 * opts.residue)); ctx.stroke();
      }
    }
    ctx.restore();
  }

  // silk bands wound round his body; `torn` leaves gaps where he ripped free
  function silk(ctx, w, h, k, alpha, torn) {
    ctx.fillStyle = 'rgba(240,245,250,' + 0.5 * k * alpha + ')';
    ctx.beginPath(); ctx.ellipse(0, 0, w * 0.52, h * 0.5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,' + 0.85 * alpha + ')'; ctx.lineWidth = 0.9;
    var n = Math.floor(k * 11);
    for (var i = 0; i < n; i++) {
      var a0 = torn ? 0.6 + i : 0, a1 = torn ? a0 + 3.4 : TAU;
      ctx.beginPath(); ctx.ellipse(0, (i / 10 - 0.5) * h * 0.8, w * 0.55, h * 0.12, (i % 3 - 1) * 0.35, a0, a1); ctx.stroke();
    }
  }

  /* Where Argos actually is. follow() every frame with the real pointer; pin() holds him in
     place; release(ms) lets him go but he stays gummed up (sluggish) for ms afterwards. */
  function ArgosBody() { this.x = 0; this.y = 0; this.seen = false; this.pinned = false; this.stickyUntil = 0; this.stickyMs = 1; }
  ArgosBody.prototype.follow = function (p) {
    if (this.pinned || !p) return;
    if (!this.seen) { this.x = p.x; this.y = p.y; this.seen = true; return; }
    var left = this.stickyUntil - now(), k = left > 0 ? 0.06 + 0.5 * (1 - left / this.stickyMs) : 1;
    this.x += (p.x - this.x) * k; this.y += (p.y - this.y) * k;
  };
  ArgosBody.prototype.pin = function () { this.pinned = true; };
  ArgosBody.prototype.release = function (ms) { this.pinned = false; this.stickyMs = ms || 1; this.stickyUntil = now() + (ms || 0); };
  ArgosBody.prototype.sticky = function () { return Math.max(0, (this.stickyUntil - now()) / this.stickyMs); };
  ArgosBody.prototype.lose = function () { if (!this.pinned) this.seen = false; };

  // H: his height in px, shared by every exhibit and by roaming Charlotte
  window.Argos = { H: 44, draw: draw, Body: ArgosBody, ready: function () { return ready; } };
})();
