(function (global) {
  'use strict';

  var PAL = {
    paper: '#e9ecdf',
    paperLight: '#f3f5ec',
    paperWarm: '#dfe3d2',
    ink: '#394c39',
    inkDeep: '#263526',
    inkDark: '#1c281c',
    cedar: '#986c50',
    cedarDark: '#6b4934',
    cedarLight: '#bf9578',
    bamboo: '#77826e',
    sage: '#8b9b85',
    sagePale: '#c4ceb9',
    cinnabar: '#b93a2c',
    cinnabarBright: '#cf4c3d',
    ochre: '#c48f32',
    ochreLight: '#deb15a',
    ivory: '#f7f8f0'
  };

  function clamp(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function EchoRenderer(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.w = 960;
    this.h = 600;
    this.dpr = 1;
    this.paperCache = null;

    // Pre-seeded deterministic bamboo stalk layouts (left & right edges)
    this.bambooStalks = [
      { side: -1, xFrac: 0.028, width: 11, lean: 0.055, segs: 6, phase: 0.4, alpha: 0.78, scale: 1.05 },
      { side: -1, xFrac: 0.072, width: 7.5, lean: 0.09, segs: 5, phase: 1.9, alpha: 0.5, scale: 0.86 },
      { side: -1, xFrac: 0.115, width: 5.5, lean: 0.04, segs: 5, phase: 3.1, alpha: 0.3, scale: 0.72 },
      { side: 1, xFrac: 0.972, width: 11, lean: -0.055, segs: 6, phase: 1.1, alpha: 0.78, scale: 1.05 },
      { side: 1, xFrac: 0.928, width: 7.5, lean: -0.09, segs: 5, phase: 2.5, alpha: 0.5, scale: 0.86 },
      { side: 1, xFrac: 0.885, width: 5.5, lean: -0.04, segs: 5, phase: 4.0, alpha: 0.3, scale: 0.72 }
    ];
  }

  EchoRenderer.prototype.resize = function (width, height, dpr) {
    this.w = Math.max(320, Math.floor(width));
    this.h = Math.max(320, Math.floor(height));
    this.dpr = clamp(dpr || 1, 1, 2);
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
    this._buildPaperTexture();
  };

  EchoRenderer.prototype._buildPaperTexture = function () {
    var tile = document.createElement('canvas');
    tile.width = 256;
    tile.height = 256;
    var g = tile.getContext('2d');

    g.fillStyle = PAL.paper;
    g.fillRect(0, 0, 256, 256);

    // Subtle organic rice-paper fibers & mineral speckles (deterministic pseudo-random)
    var seed = 4219;
    function rand() {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    }

    for (var i = 0; i < 650; i++) {
      var x = rand() * 256;
      var y = rand() * 256;
      var r = 0.4 + rand() * 1.3;
      g.fillStyle = rand() > 0.5 ? 'rgba(57, 76, 57, 0.024)' : 'rgba(152, 108, 80, 0.022)';
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }

    g.lineWidth = 0.7;
    for (var j = 0; j < 75; j++) {
      var fx = rand() * 256;
      var fy = rand() * 256;
      var len = 8 + rand() * 22;
      var ang = (rand() - 0.5) * 0.55;
      g.strokeStyle = rand() > 0.5 ? 'rgba(243, 245, 236, 0.24)' : 'rgba(119, 130, 110, 0.05)';
      g.beginPath();
      g.moveTo(fx, fy);
      g.lineTo(fx + Math.cos(ang) * len, fy + Math.sin(ang) * len);
      g.stroke();
    }

    this.paperCache = tile;
  };

  EchoRenderer.prototype.render = function (state) {
    var ctx = this.ctx;
    var w = this.w;
    var h = this.h;
    var reduced = !!state.reducedMotion;
    var sc = clamp(Math.min(w / 980, h / 680), 0.58, 1.24);

    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    // Camera micro-shake + subtle player dodge parallax
    var shakeMag = reduced ? 0 : (state.shake || 0);
    var sx = shakeMag > 0.1 ? (Math.random() - 0.5) * 2 * shakeMag : 0;
    var sy = shakeMag > 0.1 ? (Math.random() - 0.5) * 2 * shakeMag : 0;
    var camX = (state.player ? -state.player.dodgeX * 26 * sc : 0) + sx;
    var camY = sy;

    // 1. Rice-Paper Ground & Atmospheric Wash
    this._drawPaperBackdrop(ctx, w, h, state);

    ctx.save();
    ctx.translate(camX * 0.35, camY * 0.35);

    // 2. Layered Ink-Wash Mountain Ridges & Drifting Mist
    this._drawValleyMist(ctx, w, h, state, reduced);

    // 3. Swaying Bamboo Stalks on Frame Margins
    this._drawBambooMargins(ctx, w, h, state, reduced);

    ctx.restore();

    ctx.save();
    ctx.translate(camX * 0.72, camY * 0.72);

    // 4. Minimal Cedar & Ink Ring Architecture
    this._drawRingArchitecture(ctx, w, h, sc, state);

    // 5. Concentric Acoustic Echo Ripples
    this._drawEchoRipples(ctx, w, h, sc, state.ripples || []);

    // 6. Phase-Specific Centerpiece
    if (state.phase === 'ACT1') {
      this._drawSpeedBagScene(ctx, w, h, sc, state, reduced);
    } else if (state.phase === 'ACT2' || state.phase === 'REST' || state.phase === 'EPILOGUE') {
      this._drawEchoSparrer(ctx, w, h, sc, state, reduced);
    } else {
      this._drawPrologueHollow(ctx, w, h, sc, state, reduced);
    }

    // 7. Drifting Bamboo Leaves & Ink Impact Particles
    this._drawParticles(ctx, state.particles || []);

    ctx.restore();

    // 8. Foreground Translucent First-Person Player Gloves (hidden only on Prologue Placard & Epilogue)
    if (state.phase !== 'PROLOGUE' && state.phase !== 'EPILOGUE') {
      this._drawPlayerGloves(ctx, w, h, sc, state, reduced);
    }

    // 9. Impact / Bullet-Time / Flow Rim & Calligraphic Floating Text + Banners
    this._drawAtmosphereOverlay(ctx, w, h, state, reduced);
    this._drawFloats(ctx, state.floats || [], sc);
    if (state.banner && state.banner.alpha > 0.01) {
      this._drawBanner(ctx, w, h, sc, state.banner);
    }

    ctx.restore();
  };

  EchoRenderer.prototype._drawPaperBackdrop = function (ctx, w, h, state) {
    if (this.paperCache) {
      var pat = ctx.createPattern(this.paperCache, 'repeat');
      if (pat) {
        ctx.fillStyle = pat;
        ctx.fillRect(0, 0, w, h);
      } else {
        ctx.fillStyle = PAL.paper;
        ctx.fillRect(0, 0, w, h);
      }
    } else {
      ctx.fillStyle = PAL.paper;
      ctx.fillRect(0, 0, w, h);
    }

    // Soft top sunlight wash in rice-paper ivory
    var skyGrad = ctx.createRadialGradient(w * 0.5, h * 0.22, 20, w * 0.5, h * 0.42, Math.max(w, h) * 0.75);
    skyGrad.addColorStop(0, 'rgba(247, 248, 240, 0.72)');
    skyGrad.addColorStop(0.55, 'rgba(233, 236, 223, 0.12)');
    skyGrad.addColorStop(1, 'rgba(119, 130, 110, 0.16)');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Round-3 Echo Flow warm ochre-cinnabar sunlit glow
    if (state.flowActive) {
      var pulse = state.reducedMotion ? 0.13 : (0.11 + Math.sin(state.clock * 3.8) * 0.035);
      var flowGrad = ctx.createRadialGradient(w * 0.5, h * 0.48, 40, w * 0.5, h * 0.5, Math.max(w, h) * 0.65);
      flowGrad.addColorStop(0, 'rgba(196, 143, 50, ' + (pulse * 0.9) + ')');
      flowGrad.addColorStop(0.65, 'rgba(185, 58, 44, ' + (pulse * 0.45) + ')');
      flowGrad.addColorStop(1, 'rgba(185, 58, 44, 0)');
      ctx.fillStyle = flowGrad;
      ctx.fillRect(0, 0, w, h);
    }
  };

  EchoRenderer.prototype._drawValleyMist = function (ctx, w, h, state, reduced) {
    var t = reduced ? 0 : state.clock;
    var horizon = h * 0.62;

    // Subtle distant ink-wash sun / moon seal disc
    var discR = Math.min(w, h) * 0.11;
    ctx.save();
    ctx.fillStyle = state.flowActive ? 'rgba(196, 143, 50, 0.14)' : 'rgba(243, 245, 236, 0.55)';
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.31, discR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(152, 108, 80, 0.14)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // 3 Layered ink-wash mountain ridges
    var ridges = [
      { yBase: horizon - h * 0.14, amp: h * 0.095, freq: 0.0031, phase: 0.6, colTop: 'rgba(139, 155, 133, 0.22)', colBot: 'rgba(233, 236, 223, 0.02)' },
      { yBase: horizon - h * 0.075, amp: h * 0.075, freq: 0.0044, phase: 2.3, colTop: 'rgba(119, 130, 110, 0.25)', colBot: 'rgba(233, 236, 223, 0.04)' },
      { yBase: horizon - h * 0.01, amp: h * 0.048, freq: 0.006, phase: 4.1, colTop: 'rgba(57, 76, 57, 0.16)', colBot: 'rgba(233, 236, 223, 0.02)' }
    ];

    for (var r = 0; r < ridges.length; r++) {
      var rg = ridges[r];
      var grad = ctx.createLinearGradient(0, rg.yBase - rg.amp, 0, horizon + h * 0.18);
      grad.addColorStop(0, rg.colTop);
      grad.addColorStop(1, rg.colBot);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(-40, h);
      for (var x = -40; x <= w + 40; x += 28) {
        var nx = x * rg.freq + rg.phase;
        var y = rg.yBase - Math.sin(nx) * rg.amp * 0.62 - Math.cos(nx * 1.9 + r) * rg.amp * 0.38;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w + 40, h);
      ctx.closePath();
      ctx.fill();
    }

    // Drifting valley mist bands
    for (var m = 0; m < 3; m++) {
      var drift = Math.sin(t * (0.22 + m * 0.07) + m * 2.1) * 32;
      var my = horizon - h * 0.04 + m * h * 0.065;
      var mg = ctx.createLinearGradient(0, my - 26, 0, my + 26);
      mg.addColorStop(0, 'rgba(243, 245, 236, 0)');
      mg.addColorStop(0.5, 'rgba(243, 245, 236, ' + (0.34 - m * 0.06) + ')');
      mg.addColorStop(1, 'rgba(243, 245, 236, 0)');
      ctx.fillStyle = mg;
      ctx.fillRect(-40 + drift, my - 26, w + 80, 52);
    }
  };

  EchoRenderer.prototype._drawBambooMargins = function (ctx, w, h, state, reduced) {
    var t = reduced ? 0 : state.clock;
    var gust = reduced ? 0 : (state.windGust || 0);
    var flowBoost = state.flowActive && !reduced ? 1.55 : 1.0;

    for (var i = 0; i < this.bambooStalks.length; i++) {
      var b = this.bambooStalks[i];
      var baseX = w * b.xFrac;
      var baseY = h + 18;
      var sway = reduced ? 0 : (Math.sin(t * 1.15 * flowBoost + b.phase) * 0.036 * flowBoost + gust * 0.085);
      var totalLean = b.lean + sway;
      var segLen = (h * 0.195) * b.scale;

      ctx.save();
      ctx.globalAlpha = b.alpha;
      ctx.strokeStyle = PAL.ink;
      ctx.fillStyle = PAL.ink;
      ctx.lineCap = 'round';

      var px = baseX;
      var py = baseY;
      for (var s = 0; s < b.segs; s++) {
        var frac = (s + 1) / b.segs;
        var ang = -Math.PI / 2 + totalLean * (0.45 + frac * 1.35);
        var nx = px + Math.cos(ang) * segLen;
        var ny = py + Math.sin(ang) * segLen;
        var segW = Math.max(2, b.width * (1 - frac * 0.42));

        // Bamboo internode stalk
        ctx.lineWidth = segW;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(nx, ny);
        ctx.stroke();

        // Subtle pale highlight edge
        ctx.strokeStyle = 'rgba(233, 236, 223, 0.25)';
        ctx.lineWidth = Math.max(1, segW * 0.22);
        ctx.beginPath();
        ctx.moveTo(px + segW * 0.2, py);
        ctx.lineTo(nx + segW * 0.2, ny);
        ctx.stroke();
        ctx.strokeStyle = PAL.ink;

        // Bamboo joint node
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(nx - segW * 0.65, ny + 1);
        ctx.lineTo(nx + segW * 0.65, ny - 1);
        ctx.stroke();

        // Ink leaf clusters from upper nodes inward
        if (s >= 1) {
          var dir = -b.side; // reach subtly inward
          this._drawBambooLeafCluster(ctx, nx, ny, dir, b.scale, sway, s);
        }

        px = nx;
        py = ny;
      }
      ctx.restore();
    }
  };

  EchoRenderer.prototype._drawBambooLeafCluster = function (ctx, x, y, dir, scale, sway, idx) {
    var count = idx % 2 === 0 ? 3 : 2;
    ctx.fillStyle = PAL.ink;
    for (var k = 0; k < count; k++) {
      var a = (dir > 0 ? -0.35 : Math.PI + 0.35) + (k - 1) * 0.34 * dir + sway * 1.4;
      var len = (26 + k * 7) * scale;
      var wid = 4.2 * scale;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(len * 0.42, -wid, len, 0);
      ctx.quadraticCurveTo(len * 0.42, wid, 0, 0);
      ctx.fill();
      ctx.restore();
    }
  };

  EchoRenderer.prototype._drawRingArchitecture = function (ctx, w, h, sc, state) {
    var matTopY = h * 0.68;
    var matBotY = h + 10;

    // Minimal rice-paper / woven tatami ring deck
    var deckGrad = ctx.createLinearGradient(0, matTopY, 0, matBotY);
    deckGrad.addColorStop(0, 'rgba(223, 227, 210, 0.55)');
    deckGrad.addColorStop(0.45, 'rgba(214, 218, 198, 0.78)');
    deckGrad.addColorStop(1, 'rgba(182, 189, 168, 0.85)');
    ctx.fillStyle = deckGrad;
    ctx.beginPath();
    ctx.moveTo(w * 0.08, matTopY);
    ctx.lineTo(w * 0.92, matTopY);
    ctx.lineTo(w + 40, matBotY);
    ctx.lineTo(-40, matBotY);
    ctx.closePath();
    ctx.fill();

    // Subtle ink horizon deck line & perspective wood-planks
    ctx.strokeStyle = 'rgba(57, 76, 57, 0.22)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(w * 0.06, matTopY);
    ctx.lineTo(w * 0.94, matTopY);
    ctx.stroke();

    // Center acoustic ring inscribed on floor
    ctx.save();
    ctx.strokeStyle = state.flowActive ? 'rgba(185, 58, 44, 0.25)' : 'rgba(152, 108, 80, 0.22)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.77, w * 0.24, h * 0.055, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Cedar Corner Posts (minimalist timber silhouettes at far left/right of ring)
    var postLX = w * 0.14;
    var postRX = w * 0.86;
    var postTop = h * 0.45;
    var postBot = matTopY + 12;

    var postPositions = [postLX, postRX];
    for (var p = 0; p < postPositions.length; p++) {
      var px = postPositions[p];
      ctx.fillStyle = PAL.cedar;
      ctx.fillRect(px - 6 * sc, postTop, 12 * sc, postBot - postTop);
      ctx.fillStyle = PAL.cedarDark;
      ctx.fillRect(px + 2 * sc, postTop, 4 * sc, postBot - postTop);
      // Ink cap
      ctx.fillStyle = PAL.inkDeep;
      ctx.fillRect(px - 8 * sc, postTop - 4 * sc, 16 * sc, 5 * sc);
    }

    // Three taut ink-and-hemp ring ropes spanning between cedar posts
    var ropeYs = [postTop + (postBot - postTop) * 0.18, postTop + (postBot - postTop) * 0.48, postTop + (postBot - postTop) * 0.78];
    for (var r = 0; r < ropeYs.length; r++) {
      var ry = ropeYs[r];
      ctx.strokeStyle = r === 0 ? 'rgba(152, 108, 80, 0.5)' : 'rgba(57, 76, 57, 0.34)';
      ctx.lineWidth = (r === 0 ? 2.4 : 1.7) * sc;
      ctx.beginPath();
      ctx.moveTo(postLX, ry);
      ctx.quadraticCurveTo(w * 0.5, ry + 5 * sc, postRX, ry);
      ctx.stroke();
    }
  };

  EchoRenderer.prototype._drawEchoRipples = function (ctx, w, h, sc, ripples) {
    for (var i = 0; i < ripples.length; i++) {
      var rp = ripples[i];
      var progress = clamp(rp.age / rp.life, 0, 1);
      var alpha = (1 - progress) * (rp.alpha || 0.48);
      if (alpha <= 0.01) continue;

      var rad = lerp(rp.r0 || 14 * sc, rp.r1 || 170 * sc, 1 - Math.pow(1 - progress, 2.2));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = rp.color || PAL.ink;
      ctx.lineWidth = Math.max(0.8, (rp.width || 2.5) * (1 - progress * 0.65));
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, rad, 0, Math.PI * 2);
      ctx.stroke();

      // Secondary trailing acoustic ring for echo depth
      if (rad > 28 * sc) {
        ctx.globalAlpha = alpha * 0.45;
        ctx.lineWidth = Math.max(0.6, (rp.width || 2.5) * 0.45);
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rad * 0.78, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  };

  EchoRenderer.prototype._drawPrologueHollow = function (ctx, w, h, sc, state, reduced) {
    // Calm breathing ink enso circle in valley center during Prologue & Calibration
    var cx = w * 0.5;
    var cy = h * 0.47;
    var breath = reduced ? 0 : Math.sin(state.clock * 1.6) * 6 * sc;
    var rad = 68 * sc + breath;

    ctx.save();
    ctx.strokeStyle = 'rgba(57, 76, 57, 0.22)';
    ctx.lineWidth = 4.2 * sc;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, rad, -Math.PI * 0.4, Math.PI * 1.38);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(152, 108, 80, 0.2)';
    ctx.lineWidth = 1.6 * sc;
    ctx.beginPath();
    ctx.arc(cx, cy, rad + 16 * sc, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };

  // ============================================================================
  // ACT I: Suspended Cedar-and-Ink Leather Speed Bag & Echo Rhythm Ring
  // ============================================================================
  EchoRenderer.prototype._drawSpeedBagScene = function (ctx, w, h, sc, state, reduced) {
    var bag = state.bag || { angle: 0, squash: 0, flash: 0 };
    var cx = w * 0.5;
    var boardY = h * 0.24;

    // 1. Cedar Overhead Rebound Drum Platform
    ctx.save();
    ctx.fillStyle = PAL.cedarDark;
    ctx.fillRect(cx - 88 * sc, boardY - 12 * sc, 176 * sc, 10 * sc);
    ctx.fillStyle = PAL.cedar;
    ctx.beginPath();
    ctx.ellipse(cx, boardY, 92 * sc, 12 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PAL.inkDeep;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Vertical timber suspension beams rising into top margin
    ctx.fillStyle = 'rgba(107, 73, 52, 0.72)';
    ctx.fillRect(cx - 46 * sc, 0, 7 * sc, boardY - 10 * sc);
    ctx.fillRect(cx + 39 * sc, 0, 7 * sc, boardY - 10 * sc);

    // Brass swivel ring
    ctx.fillStyle = PAL.ochre;
    ctx.beginPath();
    ctx.arc(cx, boardY + 12 * sc, 7 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PAL.inkDeep;
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // 2. Swinging Leather-and-Ink Teardrop Speed Bag
    var pivotY = boardY + 16 * sc;
    var bagLen = 132 * sc;
    var bagCenterX = cx + Math.sin(bag.angle) * bagLen * 0.72;
    var bagCenterY = pivotY + Math.cos(bag.angle) * bagLen * 0.72;

    ctx.save();
    ctx.translate(cx, pivotY);
    ctx.rotate(-bag.angle);
    var sq = reduced ? 0 : (bag.squash || 0);
    ctx.scale(1 + sq * 0.22, 1 - sq * 0.16);

    // Leather strap neck
    ctx.strokeStyle = PAL.inkDeep;
    ctx.lineWidth = 5 * sc;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 22 * sc);
    ctx.stroke();

    // Teardrop leather body
    var bGrad = ctx.createRadialGradient(-16 * sc, 76 * sc, 8 * sc, 0, 88 * sc, 64 * sc);
    bGrad.addColorStop(0, PAL.cedarLight);
    bGrad.addColorStop(0.55, PAL.cedar);
    bGrad.addColorStop(1, PAL.cedarDark);

    ctx.fillStyle = bGrad;
    ctx.beginPath();
    ctx.moveTo(0, 18 * sc);
    ctx.bezierCurveTo(38 * sc, 36 * sc, 56 * sc, 86 * sc, 40 * sc, 122 * sc);
    ctx.quadraticCurveTo(0, 148 * sc, -40 * sc, 122 * sc);
    ctx.bezierCurveTo(-56 * sc, 86 * sc, -38 * sc, 36 * sc, 0, 18 * sc);
    ctx.closePath();
    ctx.fill();

    // Ink woodblock outline & stitched panels
    ctx.strokeStyle = PAL.inkDeep;
    ctx.lineWidth = 2.4 * sc;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(38, 53, 38, 0.35)';
    ctx.lineWidth = 1.3 * sc;
    ctx.beginPath();
    ctx.moveTo(0, 22 * sc);
    ctx.quadraticCurveTo(-18 * sc, 84 * sc, -12 * sc, 134 * sc);
    ctx.moveTo(0, 22 * sc);
    ctx.quadraticCurveTo(18 * sc, 84 * sc, 12 * sc, 134 * sc);
    ctx.stroke();

    // Subtle cinnabar valley seal emblem on leather face
    ctx.strokeStyle = 'rgba(185, 58, 44, 0.58)';
    ctx.lineWidth = 1.8 * sc;
    ctx.beginPath();
    ctx.arc(0, 88 * sc, 16 * sc, 0, Math.PI * 2);
    ctx.stroke();

    // Impact highlight flash on hit
    if (bag.flash > 0.02 && !reduced) {
      ctx.fillStyle = 'rgba(247, 248, 240, ' + (bag.flash * 0.45) + ')';
      ctx.beginPath();
      ctx.arc(0, 88 * sc, 42 * sc, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 3. Concentric Contracting Echo Rhythm Ring & Cue Prompt
    var cue = state.bagCue;
    var targetR = 54 * sc;
    var ringY = bagCenterY + 12 * sc;

    // Static target beat circle
    ctx.strokeStyle = 'rgba(57, 76, 57, 0.28)';
    ctx.lineWidth = 2 * sc;
    ctx.setLineDash([6 * sc, 6 * sc]);
    ctx.beginPath();
    ctx.arc(bagCenterX, ringY, targetR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    if (cue && !cue.resolved) {
      var p = clamp(cue.progress, 0, 1.25);
      var isSlip = cue.type === 'slipLeft' || cue.type === 'slipRight';
      var ringColor = isSlip ? PAL.cinnabar : (cue.type === 'cross' ? PAL.cedar : PAL.ochre);
      var curR = Math.max(targetR * 0.72, lerp(targetR * 2.45, targetR, clamp(p, 0, 1)));
      var nearPerfect = Math.abs(1 - p) < 0.16;

      // Sweeping bamboo wind-gust ribbons on Wave 3 slip cues
      if (isSlip) {
        var dir = cue.type === 'slipLeft' ? -1 : 1; // slipLeft means gust sweeps from right toward left
        var startX = dir < 0 ? w * 0.88 : w * 0.12;
        var gustX = lerp(startX, cx, clamp(p, 0, 1));
        ctx.save();
        ctx.strokeStyle = PAL.cinnabar;
        ctx.globalAlpha = 0.24 + clamp(p, 0, 1) * 0.55;
        ctx.lineWidth = 3.2 * sc;
        for (var gLine = -1; gLine <= 1; gLine++) {
          var ly = ringY + gLine * 28 * sc;
          ctx.beginPath();
          ctx.moveTo(gustX - dir * 95 * sc, ly - gLine * 8 * sc);
          ctx.quadraticCurveTo(gustX - dir * 35 * sc, ly + gLine * 12 * sc, gustX, ly);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Contracting rhythm ring
      ctx.save();
      ctx.strokeStyle = nearPerfect ? PAL.cinnabar : ringColor;
      ctx.lineWidth = (nearPerfect ? 4.4 : 3.0) * sc;
      ctx.globalAlpha = clamp(0.25 + p * 0.75, 0, 0.95);
      ctx.beginPath();
      ctx.arc(bagCenterX, ringY, curR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Calligraphic Cue Pill below bag
      if (cue.label) {
        this._drawPromptBadge(ctx, cx, ringY + targetR + 40 * sc, cue.label, isSlip ? PAL.cinnabar : PAL.inkDeep, sc);
      }
    }

    ctx.restore();
  };

  // ============================================================================
  // ACT II: Expressive Ink-Wash & Woodblock Echo Sparrer (谷中拳师)
  // ============================================================================
  EchoRenderer.prototype._drawEchoSparrer = function (ctx, w, h, sc, state, reduced) {
    var opp = state.opp;
    if (!opp) return;

    var t = reduced ? 0 : state.clock;
    var kd = clamp(opp.knockdownProgress || 0, 0, 1);
    var bob = reduced ? 0 : Math.sin(t * 3.1) * 5 * sc * (1 - kd);
    var sway = reduced ? 0 : Math.sin(t * 1.55) * 9 * sc * (1 - kd);
    var hitOffX = (opp.hitRecoilX || 0) * sc;
    var hitOffY = (opp.hitRecoilY || 0) * sc;
    var staggerX = (!reduced && opp.staggerTimer > 0) ? Math.sin(t * 19) * 8 * sc : 0;

    var baseX = w * 0.5 + sway + hitOffX + staggerX;
    var baseY = h * 0.46 + bob + hitOffY + kd * 150 * sc;
    var footY = baseY + 206 * sc;

    // Ground ink wash shadow anchored right beneath the boxing boots
    ctx.save();
    ctx.fillStyle = 'rgba(38, 53, 38, ' + (0.2 * (1 - kd * 0.45)) + ')';
    ctx.beginPath();
    ctx.ellipse(baseX, Math.min(h * 0.86, footY + 10 * sc), (84 + kd * 28) * sc, 17 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(baseX, baseY);
    if (kd > 0.01) {
      ctx.rotate(kd * 0.36);
      ctx.globalAlpha = 1 - kd * 0.35;
    }

    // 0. Lower Body: Boxing Stance Legs, Ankle Wraps, Laced Boots & Martial Trunks
    var kneeFlex = reduced ? 0 : Math.sin(t * 3.1) * 3.5 * sc * (1 - kd);
    var lungeShift = 0;
    if (opp.state === 'strike') {
      lungeShift = Math.sin(clamp(opp.stateProgress || 0, 0, 1) * Math.PI) * 10 * sc;
    } else if (opp.state === 'telegraph') {
      lungeShift = -clamp(opp.stateProgress || 0, 0, 1) * 7 * sc;
    }

    // Helper to draw one athletic leg + ankle wrap + laced woodblock boxing boot
    var drawLeg = function (hipX, kneeX, kneeY, ankleX, ankleY, bootDir, isRear) {
      var skinCol = isRear ? '#c9bca6' : '#dcd0bc';
      var bootCol = isRear ? PAL.inkDark : PAL.inkDeep;

      // Thigh & calf silhouette
      ctx.strokeStyle = PAL.inkDeep;
      ctx.fillStyle = skinCol;
      ctx.lineWidth = 2.2 * sc;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(hipX - 18 * sc, 108 * sc);
      ctx.quadraticCurveTo(kneeX - 20 * sc, kneeY, ankleX - 10 * sc, ankleY);
      ctx.lineTo(ankleX + 10 * sc, ankleY);
      ctx.quadraticCurveTo(kneeX + 20 * sc, kneeY - 4 * sc, hipX + 18 * sc, 108 * sc);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Subtle calf contour brushstroke
      ctx.strokeStyle = 'rgba(38, 53, 38, 0.28)';
      ctx.lineWidth = 1.6 * sc;
      ctx.beginPath();
      ctx.moveTo(kneeX - bootDir * 6 * sc, kneeY + 10 * sc);
      ctx.quadraticCurveTo(kneeX - bootDir * 10 * sc, (kneeY + ankleY) * 0.52, ankleX - bootDir * 4 * sc, ankleY - 12 * sc);
      ctx.stroke();

      // Linen ankle wrap / sock top
      ctx.fillStyle = PAL.paperLight;
      ctx.strokeStyle = PAL.inkDeep;
      ctx.lineWidth = 1.8 * sc;
      ctx.beginPath();
      ctx.rect(ankleX - 11.5 * sc, ankleY - 16 * sc, 23 * sc, 18 * sc);
      ctx.fill();
      ctx.stroke();

      // Laced boxing boot planted on mat
      ctx.fillStyle = bootCol;
      ctx.strokeStyle = PAL.inkDark;
      ctx.lineWidth = 2.1 * sc;
      ctx.beginPath();
      ctx.moveTo(ankleX - 11 * sc, ankleY - 2 * sc);
      ctx.lineTo(ankleX + 11 * sc, ankleY - 2 * sc);
      ctx.lineTo(ankleX + bootDir * 24 * sc, ankleY + 14 * sc);
      ctx.quadraticCurveTo(ankleX + bootDir * 14 * sc, ankleY + 21 * sc, ankleX - bootDir * 14 * sc, ankleY + 18 * sc);
      ctx.lineTo(ankleX - bootDir * 13 * sc, ankleY + 8 * sc);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cedar sole & lace accent
      ctx.strokeStyle = PAL.cedarLight;
      ctx.lineWidth = 2.2 * sc;
      ctx.beginPath();
      ctx.moveTo(ankleX - bootDir * 12 * sc, ankleY + 17 * sc);
      ctx.lineTo(ankleX + bootDir * 21 * sc, ankleY + 15.5 * sc);
      ctx.stroke();

      ctx.strokeStyle = PAL.paperLight;
      ctx.lineWidth = 1.3 * sc;
      ctx.beginPath();
      ctx.moveTo(ankleX - 4 * sc, ankleY + 3 * sc);
      ctx.lineTo(ankleX + 4 * sc, ankleY + 3 * sc);
      ctx.moveTo(ankleX - 3 * sc, ankleY + 8 * sc);
      ctx.lineTo(ankleX + 5 * sc, ankleY + 8 * sc);
      ctx.stroke();
    };

    // Rear right leg (slightly further back in orthodox boxing stance)
    drawLeg(30 * sc, 45 * sc - lungeShift * 0.4, 152 * sc + kneeFlex * 0.6, 56 * sc - lungeShift * 0.5, 192 * sc, 1, true);
    // Lead left leg (forward stance anchor)
    drawLeg(-30 * sc, -47 * sc + lungeShift * 0.4, 156 * sc + kneeFlex, -55 * sc + lungeShift * 0.6, 200 * sc, -1, false);

    // Boxing Trunks / Martial Fight Shorts (Deep Ink-Pine with Cedar Side Trim)
    ctx.fillStyle = '#253525';
    ctx.strokeStyle = PAL.inkDark;
    ctx.lineWidth = 2.4 * sc;
    ctx.beginPath();
    ctx.moveTo(-58 * sc, 66 * sc);
    ctx.lineTo(58 * sc, 66 * sc);
    ctx.lineTo(66 * sc, 126 * sc);
    ctx.lineTo(13 * sc, 129 * sc);
    ctx.lineTo(0, 106 * sc);
    ctx.lineTo(-13 * sc, 129 * sc);
    ctx.lineTo(-66 * sc, 126 * sc);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cedar side trim stripes & hem line on boxing shorts
    ctx.strokeStyle = PAL.cedarLight;
    ctx.lineWidth = 3.2 * sc;
    ctx.beginPath();
    ctx.moveTo(-55 * sc, 72 * sc);
    ctx.lineTo(-61 * sc, 122 * sc);
    ctx.moveTo(55 * sc, 72 * sc);
    ctx.lineTo(61 * sc, 122 * sc);
    ctx.stroke();

    // 1. Torso & Martial Vest (Deep Ink-Green with Cedar Trim)
    ctx.fillStyle = PAL.ink;
    ctx.beginPath();
    ctx.moveTo(-59 * sc, 70 * sc);
    ctx.quadraticCurveTo(-74 * sc, 20 * sc, -58 * sc, -30 * sc);
    ctx.lineTo(58 * sc, -30 * sc);
    ctx.quadraticCurveTo(74 * sc, 20 * sc, 59 * sc, 70 * sc);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PAL.inkDeep;
    ctx.lineWidth = 2.4 * sc;
    ctx.stroke();

    // Crossed robe lapel & cedar sash
    ctx.strokeStyle = PAL.cedarLight;
    ctx.lineWidth = 4.2 * sc;
    ctx.beginPath();
    ctx.moveTo(-26 * sc, -28 * sc);
    ctx.lineTo(18 * sc, 48 * sc);
    ctx.moveTo(26 * sc, -28 * sc);
    ctx.lineTo(-4 * sc, 18 * sc);
    ctx.stroke();

    ctx.fillStyle = PAL.cedar;
    ctx.fillRect(-58 * sc, 56 * sc, 116 * sc, 15 * sc);
    ctx.strokeStyle = PAL.inkDeep;
    ctx.lineWidth = 1.6 * sc;
    ctx.strokeRect(-58 * sc, 56 * sc, 116 * sc, 15 * sc);

    // Hanging cedar sash knot & swaying ribbon tails over trunks
    var sashWave = reduced ? 0 : Math.sin(t * 3.4) * 5 * sc;
    ctx.strokeStyle = PAL.cedar;
    ctx.lineWidth = 5.5 * sc;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4 * sc, 70 * sc);
    ctx.quadraticCurveTo(-14 * sc + sashWave, 96 * sc, -18 * sc + sashWave * 1.3, 116 * sc);
    ctx.moveTo(5 * sc, 70 * sc);
    ctx.quadraticCurveTo(14 * sc + sashWave * 0.7, 94 * sc, 10 * sc + sashWave, 110 * sc);
    ctx.stroke();

    // Subtle rice-paper shoulder light wash
    ctx.fillStyle = 'rgba(243, 245, 236, 0.14)';
    ctx.beginPath();
    ctx.ellipse(-44 * sc, -14 * sc, 22 * sc, 14 * sc, -0.35, 0, Math.PI * 2);
    ctx.ellipse(44 * sc, -14 * sc, 22 * sc, 14 * sc, 0.35, 0, Math.PI * 2);
    ctx.fill();

    // 2. Neck & Head (Woodblock Warm Parchment + Expressive Ink Features)
    ctx.fillStyle = '#d7cbb8';
    ctx.fillRect(-15 * sc, -48 * sc, 30 * sc, 22 * sc);

    // Headband tails fluttering behind right ear
    var tailWave = reduced ? 0 : Math.sin(t * 5.2) * 8 * sc;
    ctx.strokeStyle = state.flowActive ? PAL.cinnabar : PAL.cedar;
    ctx.lineWidth = 6 * sc;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(32 * sc, -88 * sc);
    ctx.quadraticCurveTo(64 * sc, -84 * sc + tailWave, 86 * sc, -62 * sc + tailWave * 1.4);
    ctx.moveTo(30 * sc, -84 * sc);
    ctx.quadraticCurveTo(56 * sc, -70 * sc - tailWave * 0.5, 72 * sc, -44 * sc + tailWave);
    ctx.stroke();

    // Head silhouette
    ctx.fillStyle = '#e5dcc8';
    ctx.beginPath();
    ctx.ellipse(0, -78 * sc, 36 * sc, 43 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PAL.inkDeep;
    ctx.lineWidth = 2.4 * sc;
    ctx.stroke();

    // Ink hair crown & headband
    ctx.fillStyle = PAL.inkDeep;
    ctx.beginPath();
    ctx.arc(0, -86 * sc, 36 * sc, Math.PI * 1.05, Math.PI * 1.95);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = state.flowActive ? PAL.cinnabar : PAL.cedar;
    ctx.fillRect(-35 * sc, -96 * sc, 70 * sc, 10 * sc);
    ctx.strokeStyle = PAL.inkDeep;
    ctx.lineWidth = 1.4 * sc;
    ctx.strokeRect(-35 * sc, -96 * sc, 70 * sc, 10 * sc);

    // Expressive Brows & Eyes
    var isStaggered = opp.staggerTimer > 0;
    var isTelegraph = opp.state === 'telegraph' || opp.state === 'strike';
    var isHurt = opp.hitFlash > 0.08;

    ctx.strokeStyle = PAL.inkDark;
    ctx.fillStyle = PAL.inkDark;
    ctx.lineWidth = 2.4 * sc;
    ctx.lineCap = 'round';

    if (kd > 0.35) {
      // Closed calm eyes on knockdown
      ctx.beginPath();
      ctx.moveTo(-18 * sc, -76 * sc); ctx.lineTo(-7 * sc, -76 * sc);
      ctx.moveTo(7 * sc, -76 * sc); ctx.lineTo(18 * sc, -76 * sc);
      ctx.stroke();
    } else if (isHurt) {
      // Wince eyes
      ctx.beginPath();
      ctx.moveTo(-19 * sc, -79 * sc); ctx.lineTo(-8 * sc, -75 * sc); ctx.lineTo(-19 * sc, -72 * sc);
      ctx.moveTo(19 * sc, -79 * sc); ctx.lineTo(8 * sc, -75 * sc); ctx.lineTo(19 * sc, -72 * sc);
      ctx.stroke();
    } else {
      // Focused martial brows
      var browTilt = isTelegraph ? 5 * sc : (isStaggered ? -4 * sc : 2.5 * sc);
      ctx.beginPath();
      ctx.moveTo(-21 * sc, -84 * sc - browTilt * 0.4);
      ctx.lineTo(-6 * sc, -82 * sc + browTilt * 0.6);
      ctx.moveTo(21 * sc, -84 * sc - browTilt * 0.4);
      ctx.lineTo(6 * sc, -82 * sc + browTilt * 0.6);
      ctx.stroke();

      // Pupils
      ctx.beginPath();
      ctx.arc(-13 * sc, -75 * sc, isStaggered ? 3.5 * sc : 2.8 * sc, 0, Math.PI * 2);
      ctx.arc(13 * sc, -75 * sc, isStaggered ? 3.5 * sc : 2.8 * sc, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mouth line
    ctx.lineWidth = 2 * sc;
    ctx.beginPath();
    if (isStaggered || isHurt) {
      ctx.ellipse(0, -56 * sc, 6 * sc, 4 * sc, 0, 0, Math.PI * 2);
    } else {
      ctx.moveTo(-9 * sc, -57 * sc);
      ctx.lineTo(9 * sc, -57 * sc);
    }
    ctx.stroke();

    // 3. Stagger Ink Swirl Halo above head
    if (isStaggered && kd < 0.2) {
      ctx.save();
      ctx.translate(0, -134 * sc);
      ctx.strokeStyle = PAL.ochre;
      ctx.lineWidth = 2.4 * sc;
      var spin = reduced ? 0 : t * 5.4;
      ctx.beginPath();
      ctx.ellipse(0, 0, 32 * sc, 10 * sc, 0, spin, spin + Math.PI * 1.45);
      ctx.stroke();
      ctx.fillStyle = PAL.cinnabar;
      ctx.beginPath();
      ctx.arc(Math.cos(spin) * 32 * sc, Math.sin(spin) * 10 * sc, 3.6 * sc, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 4. Opponent Arms, Gloves & Ochre/Cinnabar Telegraphs
    this._drawSparrerGloves(ctx, sc, opp, t, reduced);

    // 5. Opponent Active Ink Guard Arc
    if (opp.guarding && kd < 0.1) {
      ctx.save();
      ctx.strokeStyle = PAL.inkDeep;
      ctx.lineWidth = 5 * sc;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.72;
      ctx.beginPath();
      ctx.arc(0, -14 * sc, 78 * sc, -Math.PI * 0.78, -Math.PI * 0.22);
      ctx.stroke();

      ctx.strokeStyle = PAL.sage;
      ctx.lineWidth = 10 * sc;
      ctx.globalAlpha = 0.24;
      ctx.beginPath();
      ctx.arc(0, -14 * sc, 78 * sc, -Math.PI * 0.78, -Math.PI * 0.22);
      ctx.stroke();
      ctx.restore();
    }

    // Hit flash ink tint on body
    if (opp.hitFlash > 0.04 && !reduced) {
      ctx.fillStyle = 'rgba(247, 248, 240, ' + (opp.hitFlash * 0.35) + ')';
      ctx.beginPath();
      ctx.ellipse(0, 12 * sc, 76 * sc, 118 * sc, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // 6. Bold Directional Slip Arrow Cue on Cinnabar Heavy Hook (in screen space above sparrer)
    if (opp.state === 'telegraph' && opp.currentAttack && opp.currentAttack.kind === 'cinnabar' && opp.telegraphLabel) {
      var pulse = reduced ? 1 : (0.94 + Math.sin(t * 16) * 0.06);
      ctx.save();
      ctx.translate(w * 0.5, Math.max(138, baseY - 156 * sc));
      ctx.scale(pulse, pulse);
      this._drawPromptBadge(ctx, 0, 0, opp.telegraphLabel, PAL.cinnabar, sc * 1.06, true);
      ctx.restore();
    }
  };

  EchoRenderer.prototype._drawSparrerGloves = function (ctx, sc, opp, t, reduced) {
    // Viewer-left glove = side -1, Viewer-right glove = side +1
    var atk = opp.currentAttack;
    var atkSide = atk ? atk.screenSide : 0; // -1 = viewer-left glove, +1 = viewer-right glove
    var sides = [-1, 1];

    for (var i = 0; i < sides.length; i++) {
      var side = sides[i];
      var isAtkGlove = atk && atkSide === side && (opp.state === 'telegraph' || opp.state === 'strike' || opp.state === 'recover');
      var idleBob = reduced ? 0 : Math.sin(t * 3.8 + (side > 0 ? 1.6 : 0)) * 5 * sc;

      // Default poised boxing guard position
      var gx = side * 56 * sc;
      var gy = -16 * sc + idleBob;
      var gScale = 1.0;

      if (opp.guarding) {
        gx = side * 32 * sc;
        gy = -48 * sc;
      } else if (opp.staggerTimer > 0) {
        gx = side * 88 * sc;
        gy = 24 * sc;
      }

      if (isAtkGlove) {
        var prog = clamp(opp.stateProgress || 0, 0, 1);
        var isHeavy = atk.kind === 'cinnabar';
        if (opp.state === 'telegraph') {
          // Wind-up wide and back
          gx = side * (isHeavy ? 116 : 86) * sc * lerp(0.7, 1.0, prog);
          gy = (isHeavy ? -10 : -34) * sc;
          gScale = lerp(1.0, isHeavy ? 1.24 : 1.12, prog);
        } else if (opp.state === 'strike') {
          // Lunge toward viewer center!
          var ext = Math.sin(prog * Math.PI);
          gx = lerp(side * 96 * sc, side * 12 * sc, ext);
          gy = lerp(-24 * sc, 26 * sc, ext);
          gScale = lerp(1.12, 1.92, ext);
        } else if (opp.state === 'recover') {
          gx = lerp(side * 22 * sc, side * 56 * sc, prog);
          gy = lerp(18 * sc, -16 * sc, prog);
          gScale = lerp(1.4, 1.0, prog);
        }
      }

      // Forearm connecting shoulder to glove
      ctx.strokeStyle = PAL.inkDeep;
      ctx.lineWidth = 17 * sc;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(side * 54 * sc, -14 * sc);
      ctx.quadraticCurveTo(side * 78 * sc, 22 * sc, gx, gy + 12 * sc);
      ctx.stroke();

      // Telegraph brush-ring aura around active attacking glove
      if (isAtkGlove && opp.state === 'telegraph') {
        var isCinn = atk.kind === 'cinnabar';
        var teleCol = isCinn ? PAL.cinnabar : PAL.ochre;
        var progT = clamp(opp.stateProgress || 0, 0, 1);
        var haloR = lerp(56 * sc, 29 * sc, progT);

        ctx.save();
        ctx.strokeStyle = teleCol;
        ctx.lineWidth = (isCinn ? 5.2 : 3.6) * sc;
        ctx.globalAlpha = 0.35 + progT * 0.65;
        ctx.beginPath();
        ctx.arc(gx, gy, haloR, 0, Math.PI * 2);
        ctx.stroke();

        // Fill warm glow inside ring
        ctx.fillStyle = isCinn ? 'rgba(185, 58, 44, 0.2)' : 'rgba(196, 143, 50, 0.18)';
        ctx.beginPath();
        ctx.arc(gx, gy, haloR * 0.85, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Stitched Woodblock Boxing Glove
      ctx.save();
      ctx.translate(gx, gy);
      ctx.scale(gScale, gScale);

      var fillCol = PAL.cedar;
      if (isAtkGlove && (opp.state === 'telegraph' || opp.state === 'strike')) {
        fillCol = atk.kind === 'cinnabar' ? PAL.cinnabar : PAL.ochre;
      }
      ctx.fillStyle = fillCol;
      ctx.beginPath();
      ctx.ellipse(0, 0, 25 * sc, 27 * sc, side * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PAL.inkDeep;
      ctx.lineWidth = 2.4 * sc;
      ctx.stroke();

      // Thumb contour & ivory cuff wrap
      ctx.fillStyle = PAL.paperLight;
      ctx.fillRect(-16 * sc, 18 * sc, 32 * sc, 11 * sc);
      ctx.strokeRect(-16 * sc, 18 * sc, 32 * sc, 11 * sc);

      ctx.strokeStyle = 'rgba(247, 248, 240, 0.42)';
      ctx.lineWidth = 2 * sc;
      ctx.beginPath();
      ctx.arc(-6 * sc * side, -8 * sc, 9 * sc, -Math.PI * 0.8, -Math.PI * 0.15);
      ctx.stroke();
      ctx.restore();
    }
  };

  // ============================================================================
  // FOREGROUND: Translucent First-Person Player Gloves + Brush Trails + High Guard
  // ============================================================================
  EchoRenderer.prototype._drawPlayerGloves = function (ctx, w, h, sc, state, reduced) {
    var pl = state.player;
    if (!pl) return;

    var t = reduced ? 0 : state.clock;
    var breath = reduced ? 0 : Math.sin(t * 2.7) * 5 * sc;
    var dodgeShift = pl.dodgeX * 118 * sc;
    var targetY = state.phase === 'ACT1' ? h * 0.42 : h * 0.44;

    // Subtle tactile glove vibration when taking a hit or absorbing a heavy guard impact
    var hurtDecay = pl.hurtShakeTimer > 0 ? clamp(pl.hurtShakeTimer / 0.28, 0, 1) : 0;
    var hurtAmp = hurtDecay > 0 ? (pl.hurtShakeAmp || 8) * hurtDecay * sc : 0;
    var guardRecoilY = hurtDecay > 0 ? (reduced ? hurtAmp * 0.5 : Math.abs(Math.sin(t * 62)) * hurtAmp * 0.55) : 0;

    // High-guard arching translucent ink-ochre shield arc
    if (pl.guarding) {
      var gx = w * 0.5 + dodgeShift * 0.5;
      var gy = h * 0.64 + guardRecoilY;
      ctx.save();
      ctx.strokeStyle = 'rgba(196, 143, 50, 0.65)';
      ctx.lineWidth = 4.5 * sc;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(gx, gy + 56 * sc, 138 * sc, -Math.PI * 0.82, -Math.PI * 0.18);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(57, 76, 57, 0.24)';
      ctx.lineWidth = 14 * sc;
      ctx.beginPath();
      ctx.arc(gx, gy + 56 * sc, 138 * sc, -Math.PI * 0.82, -Math.PI * 0.18);
      ctx.stroke();
      ctx.restore();
    }

    var hands = [
      { side: -1, punch: pl.leftPunch || 0 },
      { side: 1, punch: pl.rightPunch || 0 }
    ];

    for (var i = 0; i < hands.length; i++) {
      var hd = hands[i];
      var p = clamp(hd.punch, 0, 1);
      var ext = Math.sin(p * Math.PI); // 0 -> 1 -> 0 smooth lunge

      var tremorX = 0;
      var tremorY = 0;
      var tremorRot = 0;
      if (hurtDecay > 0) {
        if (reduced) {
          tremorY = hurtAmp * 0.65;
        } else {
          tremorX = Math.sin(t * 72 + hd.side * 1.45) * hurtAmp;
          tremorY = Math.cos(t * 58 + hd.side * 0.9) * hurtAmp * 0.65 + hurtAmp * 0.45;
          tremorRot = Math.sin(t * 64 + hd.side * 0.8) * 0.055 * hurtDecay;
        }
      }

      var restX = w * 0.5 + hd.side * (pl.guarding ? 78 : 178) * sc + dodgeShift + tremorX;
      var restY = h * (pl.guarding ? 0.67 : 0.84) + breath + (pl.guarding ? 0 : hd.side * 4 * sc) + tremorY;
      var aimX = w * 0.5 + hd.side * 16 * sc + dodgeShift * 0.25 + tremorX * 0.4;
      var aimY = targetY + tremorY * 0.4;

      var x = lerp(restX, aimX, ext);
      var y = lerp(restY, aimY, ext);
      var gScale = lerp(1.0, 0.72, ext);

      // Brush-stroke ink punch trail when punching
      if (ext > 0.08) {
        ctx.save();
        var trailCol = state.flowActive ? PAL.cinnabar : (pl.counterEmpowered ? PAL.ochre : PAL.ink);
        var grad = ctx.createLinearGradient(restX, restY, x, y);
        grad.addColorStop(0, 'rgba(57, 76, 57, 0)');
        grad.addColorStop(1, trailCol);
        ctx.strokeStyle = grad;
        ctx.globalAlpha = ext * 0.48;
        ctx.lineWidth = 26 * sc * ext;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(restX, restY);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.restore();
      }

      // Translucent leather-and-ink player glove (slightly transparent while guarding so telegraphs stay crystal clear!)
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(hd.side * (pl.guarding ? -0.22 : -0.1) + pl.dodgeX * 0.14 + tremorRot);
      ctx.scale(gScale, gScale);
      ctx.globalAlpha = pl.guarding ? 0.62 : 0.86;

      // Forearm wrist wrap
      ctx.fillStyle = PAL.paperWarm;
      ctx.strokeStyle = PAL.inkDeep;
      ctx.lineWidth = 2.4 * sc;
      ctx.beginPath();
      ctx.rect(-32 * sc, 36 * sc, 64 * sc, 64 * sc);
      ctx.fill();
      ctx.stroke();

      // Main glove body (ink-sage leather with cedar cuff)
      var glvGrad = ctx.createRadialGradient(-12 * sc * hd.side, -12 * sc, 8 * sc, 0, 8 * sc, 62 * sc);
      if (state.flowActive) {
        glvGrad.addColorStop(0, '#c75946');
        glvGrad.addColorStop(1, '#7c2b20');
      } else if (pl.counterEmpowered) {
        glvGrad.addColorStop(0, PAL.ochreLight);
        glvGrad.addColorStop(1, '#7e591c');
      } else {
        glvGrad.addColorStop(0, '#5a6f59');
        glvGrad.addColorStop(1, PAL.inkDeep);
      }

      ctx.fillStyle = glvGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, 48 * sc, 52 * sc, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PAL.inkDark;
      ctx.lineWidth = 2.8 * sc;
      ctx.stroke();

      // Knuckle seam & highlight
      ctx.strokeStyle = 'rgba(243, 245, 236, 0.34)';
      ctx.lineWidth = 2.4 * sc;
      ctx.beginPath();
      ctx.arc(0, -14 * sc, 28 * sc, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();

      // Cedar wrist tape band
      ctx.fillStyle = PAL.cedar;
      ctx.fillRect(-35 * sc, 34 * sc, 70 * sc, 16 * sc);
      ctx.strokeStyle = PAL.inkDark;
      ctx.lineWidth = 2 * sc;
      ctx.strokeRect(-35 * sc, 34 * sc, 70 * sc, 16 * sc);

      ctx.restore();
    }
  };

  EchoRenderer.prototype._drawParticles = function (ctx, particles) {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var a = clamp(1 - p.age / p.life, 0, 1);
      if (a <= 0.01) continue;
      ctx.save();
      ctx.globalAlpha = a * (p.alpha || 0.85);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot || 0);
      ctx.fillStyle = p.color || PAL.ink;

      if (p.kind === 'leaf') {
        var len = p.size * 2.2;
        var wid = p.size * 0.55;
        ctx.beginPath();
        ctx.moveTo(-len * 0.5, 0);
        ctx.quadraticCurveTo(0, -wid, len * 0.5, 0);
        ctx.quadraticCurveTo(0, wid, -len * 0.5, 0);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * (0.45 + 0.55 * a), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  };

  EchoRenderer.prototype._drawAtmosphereOverlay = function (ctx, w, h, state, reduced) {
    // Echo Slow bullet-time meditative focus border
    if (state.slowMoTimer > 0) {
      var a = clamp(state.slowMoTimer / 0.7, 0, 1) * 0.34;
      var rad = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.25, w * 0.5, h * 0.5, Math.max(w, h) * 0.68);
      rad.addColorStop(0, 'rgba(233, 236, 223, 0)');
      rad.addColorStop(1, 'rgba(38, 53, 38, ' + a + ')');
      ctx.fillStyle = rad;
      ctx.fillRect(0, 0, w, h);
    }

    // Brief subtle hurt cinnabar vignette (suppressed in reduced motion)
    if (!reduced && state.hurtFlash > 0.02) {
      var ha = clamp(state.hurtFlash, 0, 1) * 0.28;
      var hGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.22, w * 0.5, h * 0.5, Math.max(w, h) * 0.65);
      hGrad.addColorStop(0, 'rgba(185, 58, 44, 0)');
      hGrad.addColorStop(1, 'rgba(185, 58, 44, ' + ha + ')');
      ctx.fillStyle = hGrad;
      ctx.fillRect(0, 0, w, h);
    }
  };

  EchoRenderer.prototype._drawPromptBadge = function (ctx, x, y, text, color, sc, boldBorder) {
    ctx.save();
    ctx.font = '700 ' + Math.round(16 * sc) + 'px "Noto Serif SC", "Songti SC", Georgia, serif';
    var tw = ctx.measureText(text).width;
    var padX = 18 * sc;
    var boxW = tw + padX * 2;
    var boxH = 34 * sc;

    ctx.fillStyle = 'rgba(243, 245, 236, 0.94)';
    ctx.strokeStyle = color;
    ctx.lineWidth = (boldBorder ? 2.4 : 1.5) * sc;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x - boxW / 2, y - boxH / 2, boxW, boxH, 999) : ctx.rect(x - boxW / 2, y - boxH / 2, boxW, boxH);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 1);
    ctx.restore();
  };

  EchoRenderer.prototype._drawFloats = function (ctx, floats, sc) {
    for (var i = 0; i < floats.length; i++) {
      var f = floats[i];
      var p = clamp(f.age / f.life, 0, 1);
      var a = p < 0.15 ? p / 0.15 : (1 - Math.pow((p - 0.15) / 0.85, 1.8));
      if (a <= 0.01) continue;

      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = '700 ' + Math.round((f.size || 22) * sc) + 'px "Noto Serif SC", "Songti SC", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4.5 * sc;
      ctx.strokeStyle = 'rgba(243, 245, 236, 0.92)';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color || PAL.inkDeep;
      ctx.fillText(f.text, f.x, f.y);
      ctx.restore();
    }
  };

  EchoRenderer.prototype._drawBanner = function (ctx, w, h, sc, banner) {
    ctx.save();
    ctx.globalAlpha = clamp(banner.alpha, 0, 1);
    var cy = h * 0.34;
    ctx.font = '700 ' + Math.round(28 * sc) + 'px "Noto Serif SC", "Songti SC", Georgia, serif';
    var tw = ctx.measureText(banner.text).width;
    var boxW = Math.min(w * 0.88, tw + 66 * sc);
    var boxH = 56 * sc;

    ctx.fillStyle = 'rgba(243, 245, 236, 0.9)';
    ctx.strokeStyle = banner.color || PAL.ink;
    ctx.lineWidth = 1.8 * sc;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(w * 0.5 - boxW / 2, cy - boxH / 2, boxW, boxH, 8 * sc) : ctx.rect(w * 0.5 - boxW / 2, cy - boxH / 2, boxW, boxH);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = banner.color || PAL.inkDeep;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(banner.text, w * 0.5, cy + 1);
    ctx.restore();
  };

  EchoRenderer.prototype.dispose = function () {
    this.paperCache = null;
    this.ctx = null;
    this.canvas = null;
  };

  global.EchoRenderer = EchoRenderer;
})(window);
