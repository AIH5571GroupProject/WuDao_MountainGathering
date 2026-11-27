(function (global) {
  'use strict';

  var I18N = global.WUDAO_I18N;
  var Bridge = global.WuDaoBridge;
  var AudioCtor = global.EchoAudioEngine;
  var RendererCtor = global.EchoRenderer;

  var PAL = {
    ink: '#394c39',
    inkDeep: '#263526',
    cedar: '#986c50',
    bamboo: '#77826e',
    cinnabar: '#b93a2c',
    ochre: '#c48f32'
  };

  var ROUND_CFG = {
    1: { duration: 50, maxHp: 320, isFinal: false, redChance: 0.0, telegraph: 0.78, idleMin: 0.92, idleSpan: 0.55, guardChance: 0.0 },
    2: { duration: 55, maxHp: 420, isFinal: false, redChance: 0.34, telegraph: 0.58, idleMin: 0.65, idleSpan: 0.42, guardChance: 0.34 },
    3: { duration: 60, maxHp: 520, isFinal: true, redChance: 0.42, telegraph: 0.50, idleMin: 0.48, idleSpan: 0.34, guardChance: 0.42 }
  };

  var ACT1_DURATION = 30;
  var REST_DURATION = 6;
  var FLOW_THRESHOLD = 25;

  function clamp(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  function formatMMSS(sec) {
    var s = Math.max(0, Math.ceil(sec));
    var m = Math.floor(s / 60);
    var r = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
  }

  function $(id) {
    return document.getElementById(id);
  }

  function EchoBoxingEngine() {
    this.dom = {
      canvas: $('stage'),
      cornerSeal: $('corner-seal'),
      cornerTitle: $('corner-title'),
      btnLang: $('btn-lang'),
      btnSound: $('btn-sound'),
      btnMotion: $('btn-motion'),
      jumpWrap: $('jump-wrap'),
      btnJumpToggle: $('btn-jump-toggle'),
      jumpMenu: $('jump-menu'),
      jumpMenuTitle: $('jump-menu-title'),
      jumpPrologue: $('jump-opt-prologue'),
      jumpAct1: $('jump-opt-act1'),
      jumpR1: $('jump-opt-r1'),
      jumpR2: $('jump-opt-r2'),
      jumpR3: $('jump-opt-r3'),
      jumpEpilogue: $('jump-opt-epilogue'),
      hud: $('hud'),
      playerNameLabel: $('player-name-label'),
      playerResolveKind: $('player-resolve-kind'),
      playerResolveText: $('player-resolve-text'),
      playerResolveBar: $('player-resolve-bar'),
      playerBreathKind: $('player-breath-kind'),
      playerBreathBar: $('player-breath-bar'),
      comboPill: $('combo-pill'),
      actBadge: $('act-badge'),
      timerDisplay: $('timer-display'),
      phaseSubtitle: $('phase-subtitle'),
      hudOpponent: $('hud-opponent'),
      opponentBarKind: $('opponent-bar-kind'),
      opponentBarText: $('opponent-bar-text'),
      opponentNameLabel: $('opponent-name-label'),
      opponentBarFill: $('opponent-bar-fill'),
      breaksBadge: $('breaks-badge'),
      hudRhythm: $('hud-rhythm'),
      rhythmAccText: $('rhythm-acc-text'),
      rhythmMeterLabel: $('rhythm-meter-label'),
      rhythmBarFill: $('rhythm-bar-fill'),
      rhythmStreakText: $('rhythm-streak-text'),
      calibPanel: $('calib-panel'),
      calibHeading: $('calib-heading'),
      calibSub: $('calib-sub'),
      btnSkipWarmup: $('btn-skip-warmup'),
      calibStep1: $('calib-step-1'),
      calibStep2: $('calib-step-2'),
      calibStep3: $('calib-step-3'),
      calibStep4: $('calib-step-4'),
      calibStep1Text: $('calib-step-1-text'),
      calibStep2Text: $('calib-step-2-text'),
      calibStep3Text: $('calib-step-3-text'),
      calibStep4Text: $('calib-step-4-text'),
      calibGuardFill: $('calib-guard-fill'),
      secondWindBanner: $('second-wind-banner'),
      secondWindTitle: $('second-wind-title'),
      secondWindCount: $('second-wind-count'),
      secondWindSub: $('second-wind-sub'),
      bottomBar: $('bottom-bar'),
      controlsHint: $('controls-hint'),
      hintSlipLeft: $('hint-slip-left'),
      hintSlipRight: $('hint-slip-right'),
      hintJab: $('hint-jab'),
      hintCross: $('hint-cross'),
      hintGuard: $('hint-guard'),
      btnDodgeLeft: $('btn-dodge-left'),
      btnDodgeRight: $('btn-dodge-right'),
      btnGuard: $('btn-guard'),
      btnPunchLeft: $('btn-punch-left'),
      btnPunchRight: $('btn-punch-right'),
      prologueOverlay: $('prologue-overlay'),
      prologueEyebrow: $('prologue-eyebrow'),
      prologueSeal: $('prologue-seal'),
      prologueTitle: $('prologue-title'),
      prologueSubtitleEn: $('prologue-subtitle-en'),
      prologueQuote: $('prologue-quote'),
      prologueLead: $('prologue-lead'),
      guideControlsTitle: $('guide-controls-title'),
      guideControlsList: $('guide-controls-list'),
      guideRulesTitle: $('guide-rules-title'),
      guideRulesList: $('guide-rules-list'),
      btnStart: $('btn-start'),
      restOverlay: $('rest-overlay'),
      restEyebrow: $('rest-eyebrow'),
      restHeading: $('rest-heading'),
      restBody: $('rest-body'),
      restRecovery: $('rest-recovery'),
      restCountdown: $('rest-countdown'),
      btnRestReady: $('btn-rest-ready'),
      pauseOverlay: $('pause-overlay'),
      pausedTitle: $('paused-title'),
      pausedSub: $('paused-sub'),
      epilogueOverlay: $('epilogue-overlay'),
      epilogueEyebrow: $('epilogue-eyebrow'),
      epilogueSeal: $('epilogue-seal'),
      epilogueOutcome: $('epilogue-outcome'),
      epilogueOutcomeSub: $('epilogue-outcome-sub'),
      epilogueArchTitle: $('epilogue-arch-title'),
      epilogueArchDesc: $('epilogue-arch-desc'),
      statLabelRhythm: $('stat-label-rhythm'),
      statLabelDodges: $('stat-label-dodges'),
      statLabelCombo: $('stat-label-combo'),
      statLabelBlocks: $('stat-label-blocks'),
      statLabelBreaks: $('stat-label-breaks'),
      statLabelDuration: $('stat-label-duration'),
      statRhythm: $('stat-rhythm'),
      statPerfectDodges: $('stat-perfect-dodges'),
      statMaxCombo: $('stat-max-combo'),
      statBlocks: $('stat-blocks'),
      statBreaks: $('stat-breaks'),
      statDuration: $('stat-duration'),
      btnReplay: $('btn-replay'),
      btnBack: $('btn-back'),
      toast: $('toast')
    };

    this.lang = 'zh';
    this.soundEnabled = true;
    this.reducedMotion = Boolean(
      global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
    this.paused = false;
    this.disposed = false;
    this.embedded = false;

    this.audio = new AudioCtor();
    this.renderer = new RendererCtor(this.dom.canvas);

    this.rafId = null;
    this.lastTimestamp = 0;
    this.timers = [];
    this.listeners = [];
    this.toastTimer = null;

    this.state = this._createInitialState();
  }

  EchoBoxingEngine.prototype._createInitialState = function () {
    return {
      phase: 'PROLOGUE', // PROLOGUE | CALIB | ACT1 | ACT2 | REST | EPILOGUE
      clock: 0,
      sessionElapsed: 0,
      reducedMotion: this.reducedMotion,
      shake: 0,
      windGust: 0,
      flowActive: false,
      hitstopTimer: 0,
      slowMoTimer: 0,
      hurtFlash: 0,

      // Calibration
      calib: {
        slipLeft: false,
        slipRight: false,
        jabDone: false,
        crossDone: false,
        guardHold: 0,
        guardDone: false,
        completing: false
      },

      // Act I Speed Bag
      act1TimeLeft: ACT1_DURATION,
      act1Wave: 1,
      act1CueIndex: 0,
      act1NextCueTimer: 0.7,
      act1Finished: false,
      bag: { angle: 0, vel: 0, squash: 0, flash: 0 },
      bagCue: null,

      // Act II 3-Round Sparring
      round: 1,
      roundTimeLeft: ROUND_CFG[1].duration,
      roundBreaks: 0,
      roundEnding: false,
      restTimeLeft: REST_DURATION,
      restNextRound: 2,
      secondWindUsed: false,
      secondWindTimer: 0,
      outcomeKey: 'decisionWin',

      player: {
        hp: 100,
        maxHp: 100,
        breath: 100,
        maxBreath: 100,
        exhausted: false,
        guarding: false,
        dodgeDir: 'none',
        dodgeTimer: 0,
        dodgeDuration: 0.36,
        dodgeCooldown: 0,
        dodgeX: 0,
        punchSide: 'none',
        punchTimer: 0,
        punchDuration: 0.22,
        punchHitApplied: false,
        punchCooldown: 0,
        leftPunch: 0,
        rightPunch: 0,
        counterEmpowered: false,
        hurtShakeTimer: 0,
        hurtShakeAmp: 0
      },

      opp: {
        hp: ROUND_CFG[1].maxHp,
        maxHp: ROUND_CFG[1].maxHp,
        state: 'idle',
        stateTimer: 1.2,
        stateDuration: 1.2,
        stateProgress: 0,
        currentAttack: null,
        telegraphLabel: '',
        guarding: false,
        staggerTimer: 0,
        hitFlash: 0,
        hitRecoilX: 0,
        hitRecoilY: 0,
        knockdownProgress: 0,
        comboLeft: 0
      },

      stats: {
        bagTotal: 0,
        bagHits: 0,
        bagPerfects: 0,
        bagStreak: 0,
        bagBestStreak: 0,
        combo: 0,
        maxCombo: 0,
        perfectDodges: 0,
        blocks: 0,
        totalHits: 0,
        postureBreaks: 0,
        knockdownsSuffered: 0
      },

      ripples: [],
      particles: [],
      floats: [],
      banner: null
    };
  };

  EchoBoxingEngine.prototype.t = function (key, vars) {
    return I18N.t(this.lang, key, vars);
  };

  EchoBoxingEngine.prototype._scheduleTimeout = function (fn, ms) {
    var self = this;
    var id = global.setTimeout(function () {
      var idx = self.timers.indexOf(id);
      if (idx !== -1) self.timers.splice(idx, 1);
      if (!self.disposed) fn();
    }, ms);
    this.timers.push(id);
    return id;
  };

  EchoBoxingEngine.prototype._clearAllTimeouts = function () {
    for (var i = 0; i < this.timers.length; i++) {
      global.clearTimeout(this.timers[i]);
    }
    this.timers = [];
    if (this.toastTimer) {
      global.clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
  };

  EchoBoxingEngine.prototype._on = function (el, ev, fn, opts) {
    if (!el) return;
    el.addEventListener(ev, fn, opts);
    this.listeners.push({ el: el, ev: ev, fn: fn, opts: opts });
  };

  EchoBoxingEngine.prototype.start = function () {
    var self = this;
    this.embedded = Bridge.init({
      onInit: function (ctx) { self._applyHostContext(ctx); },
      onContext: function (ctx) { self._applyHostContext(ctx); },
      onPause: function (p) { self.setPaused(p); },
      onDispose: function () { self.dispose(); }
    });

    if (this.embedded) {
      document.body.classList.add('embedded');
    }

    this._applyReducedMotionClass();
    this._bindEvents();
    this._handleResize();
    this._applyTranslations();
    this._syncOverlays();
    this._updateHUD();

    Bridge.ready();

    this.lastTimestamp = 0;
    var tick = function (ts) {
      if (self.disposed) return;
      if (!self.lastTimestamp) self.lastTimestamp = ts;
      var rawDt = (ts - self.lastTimestamp) / 1000;
      self.lastTimestamp = ts;
      if (!self.paused) {
        self._update(clamp(rawDt, 0, 0.05));
      }
      self.renderer.render(self.state);
      self.rafId = global.requestAnimationFrame(tick);
    };
    this.rafId = global.requestAnimationFrame(tick);
  };

  EchoBoxingEngine.prototype._applyHostContext = function (ctx) {
    if (!ctx || typeof ctx !== 'object') return;
    if (ctx.language === 'zh' || ctx.language === 'en') {
      this.lang = ctx.language;
    }
    if (typeof ctx.soundEnabled === 'boolean') {
      this.soundEnabled = ctx.soundEnabled;
      this.audio.setEnabled(this.soundEnabled);
    }
    if (typeof ctx.reducedMotion === 'boolean') {
      this.reducedMotion = ctx.reducedMotion;
      this.state.reducedMotion = this.reducedMotion;
      this._applyReducedMotionClass();
    }
    this._applyTranslations();
    this._updateHUD();
  };

  EchoBoxingEngine.prototype._applyReducedMotionClass = function () {
    document.body.classList.toggle('reduced-motion', this.reducedMotion);
    if (this.dom.btnMotion) {
      this.dom.btnMotion.setAttribute('aria-pressed', String(this.reducedMotion));
      this.dom.btnMotion.classList.toggle('active', this.reducedMotion);
    }
  };

  EchoBoxingEngine.prototype.setPaused = function (paused) {
    var next = Boolean(paused);
    if (this.paused === next) return;
    this.paused = next;
    this.audio.setPaused(next);
    if (next) {
      this.state.player.guarding = false;
    } else {
      this.lastTimestamp = 0;
    }
    if (this.dom.pauseOverlay) {
      this.dom.pauseOverlay.classList.toggle('hidden', !next);
    }
  };

  EchoBoxingEngine.prototype._handleResize = function () {
    var w = global.innerWidth || 960;
    var h = global.innerHeight || 600;
    this.renderer.resize(w, h, global.devicePixelRatio || 1);
  };

  EchoBoxingEngine.prototype._applyTranslations = function () {
    var d = this.dom;
    document.title = this.t('pageTitle');
    document.documentElement.lang = this.lang === 'en' ? 'en' : 'zh-CN';

    d.cornerSeal.textContent = this.t('sealText');
    d.cornerTitle.textContent = this.t('mainTitle');
    d.btnLang.textContent = this.t('langBtn');
    d.btnSound.textContent = this.soundEnabled ? this.t('soundOn') : this.t('soundOff');
    d.btnSound.setAttribute('aria-pressed', String(this.soundEnabled));
    d.btnMotion.textContent = this.reducedMotion ? this.t('motionReduced') : this.t('motionNormal');
    d.btnJumpToggle.textContent = this.t('jumpBtn') + ' ▾';
    d.jumpMenuTitle.textContent = this.t('jumpTitle');
    d.jumpPrologue.textContent = this.t('jumpPrologue');
    d.jumpAct1.textContent = this.t('jumpAct1');
    d.jumpR1.textContent = this.t('jumpR1');
    d.jumpR2.textContent = this.t('jumpR2');
    d.jumpR3.textContent = this.t('jumpR3');
    d.jumpEpilogue.textContent = this.t('jumpEpilogue');

    d.playerNameLabel.textContent = this.t('playerLabel');
    d.playerResolveKind.textContent = this.t('resolveLabel');
    d.playerBreathKind.textContent = this.t('breathLabel');
    d.opponentNameLabel.textContent = this.t('opponentLabel');
    d.rhythmMeterLabel.textContent = this.t('rhythmMeterLabel');

    d.calibHeading.textContent = this.t('calibHeading');
    d.calibSub.textContent = this.t('calibSub');
    d.btnSkipWarmup.textContent = this.t('skipWarmupBtn');
    d.calibStep1Text.textContent = this.t('calibStep1');
    d.calibStep2Text.textContent = this.t('calibStep2');
    d.calibStep3Text.textContent = this.t('calibStep3');
    d.calibStep4Text.textContent = this.t('calibStep4');

    d.secondWindTitle.textContent = this.t('calloutSecondWindTitle');
    d.secondWindSub.textContent = this.t('calloutSecondWindSub');

    d.hintSlipLeft.textContent = this.t('keySlipLeft');
    d.hintSlipRight.textContent = this.t('keySlipRight');
    d.hintJab.textContent = this.t('keyJab');
    d.hintCross.textContent = this.t('keyCross');
    d.hintGuard.textContent = this.t('keyGuard');
    d.btnDodgeLeft.textContent = this.t('touchSlipLeft');
    d.btnDodgeRight.textContent = this.t('touchSlipRight');
    d.btnGuard.textContent = this.t('touchGuard');
    d.btnPunchLeft.textContent = this.t('touchJab');
    d.btnPunchRight.textContent = this.t('touchCross');

    d.prologueEyebrow.textContent = this.t('exhibitionTag');
    this._renderVerticalSeal(d.prologueSeal, this.t('sealText'));
    d.prologueTitle.textContent = this.t('mainTitle');
    d.prologueSubtitleEn.textContent = this.t('mainTitleSub');
    d.prologueQuote.textContent = this.t('poeticQuote');
    d.prologueLead.textContent = this.t('prologueLead');
    d.guideControlsTitle.textContent = this.t('guideControlsTitle');
    d.guideRulesTitle.textContent = this.t('guideRulesTitle');
    this._renderList(d.guideControlsList, this.t('guideControlsList'));
    this._renderList(d.guideRulesList, this.t('guideRulesList'));
    d.btnStart.textContent = this.t('startBtn');

    d.restEyebrow.textContent = this.t('restEyebrow');
    d.restRecovery.textContent = this.t('restRecovery');
    d.btnRestReady.textContent = this.t('restReadyBtn');

    d.pausedTitle.textContent = this.t('pausedTitle');
    d.pausedSub.textContent = this.t('pausedSub');

    d.epilogueEyebrow.textContent = this.t('epilogueEyebrow');
    this._renderVerticalSeal(d.epilogueSeal, this.t('sealText'));
    d.statLabelRhythm.textContent = this.t('statRhythm');
    d.statLabelDodges.textContent = this.t('statPerfectDodges');
    d.statLabelCombo.textContent = this.t('statMaxCombo');
    d.statLabelBlocks.textContent = this.t('statBlocks');
    d.statLabelBreaks.textContent = this.t('statBreaks');
    d.statLabelDuration.textContent = this.t('statDuration');
    d.btnReplay.textContent = this.t('replayBtn');
    d.btnBack.textContent = this.t('backBtn');

    if (this.state.phase === 'REST') this._refreshRestCopy();
    if (this.state.phase === 'EPILOGUE') this._renderEpilogue();
    if (this.state.bagCue && !this.state.bagCue.resolved) {
      this.state.bagCue.label = this._bagCueLabel(this.state.bagCue.type);
    }
    if (this.state.opp.currentAttack && this.state.opp.currentAttack.kind === 'cinnabar') {
      this.state.opp.telegraphLabel = this.state.opp.currentAttack.safeDir === 'left'
        ? this.t('arrowSlipLeft')
        : this.t('arrowSlipRight');
    }
  };

  EchoBoxingEngine.prototype._renderVerticalSeal = function (el, text) {
    if (!el) return;
    var parts = String(text || '拳 · 04').split('·');
    el.innerHTML = '';
    if (parts.length === 2) {
      var s1 = document.createElement('span');
      s1.textContent = parts[0].trim();
      var dot = document.createElement('span');
      dot.className = 'seal-dot';
      dot.textContent = '·';
      var s2 = document.createElement('span');
      s2.className = 'seal-num';
      s2.textContent = parts[1].trim();
      el.appendChild(s1);
      el.appendChild(dot);
      el.appendChild(s2);
    } else {
      el.textContent = text;
    }
  };

  EchoBoxingEngine.prototype._renderList = function (ul, items) {
    if (!ul || !Array.isArray(items)) return;
    ul.innerHTML = '';
    for (var i = 0; i < items.length; i++) {
      var li = document.createElement('li');
      li.textContent = items[i];
      ul.appendChild(li);
    }
  };

  // ==========================================================================
  // EFFECTS & SPAWNERS
  // ==========================================================================
  EchoBoxingEngine.prototype._triggerShake = function (amount) {
    if (this.reducedMotion) return;
    this.state.shake = Math.max(this.state.shake, amount);
  };

  EchoBoxingEngine.prototype._spawnRipple = function (x, y, color, r0, r1, width, alpha, life) {
    this.state.ripples.push({
      x: x,
      y: y,
      color: color || PAL.ink,
      r0: r0 || 16,
      r1: r1 || 190,
      width: width || 2.6,
      alpha: alpha || 0.48,
      age: 0,
      life: life || 0.9
    });
  };

  EchoBoxingEngine.prototype._spawnParticles = function (x, y, color, count, speed, kind) {
    var actual = this.reducedMotion ? Math.min(count, 4) : count;
    for (var i = 0; i < actual; i++) {
      var a = Math.random() * Math.PI * 2;
      var spd = speed * (0.4 + Math.random() * 0.75);
      this.state.particles.push({
        x: x,
        y: y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - (kind === 'leaf' ? 40 : 70),
        gravity: kind === 'leaf' ? 65 : 340,
        size: kind === 'leaf' ? (5 + Math.random() * 4) : (2.6 + Math.random() * 3.8),
        color: color || PAL.ink,
        kind: kind || 'ink',
        alpha: kind === 'leaf' ? 0.72 : 0.85,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 6,
        age: 0,
        life: kind === 'leaf' ? (1.2 + Math.random() * 0.9) : (0.35 + Math.random() * 0.35)
      });
    }
  };

  EchoBoxingEngine.prototype._spawnFloat = function (text, x, y, color, size, life) {
    this.state.floats.push({
      text: text,
      x: x,
      y: y,
      vy: -56,
      color: color || PAL.inkDeep,
      size: size || 22,
      age: 0,
      life: life || 0.9
    });
  };

  EchoBoxingEngine.prototype._showBanner = function (text, color, duration) {
    this.state.banner = {
      text: text,
      color: color || PAL.inkDeep,
      alpha: 1,
      timer: duration || 1.65,
      duration: duration || 1.65
    };
  };

  EchoBoxingEngine.prototype._showToast = function (msg) {
    var d = this.dom.toast;
    if (!d) return;
    d.textContent = msg;
    d.classList.remove('hidden');
    if (this.toastTimer) global.clearTimeout(this.toastTimer);
    var self = this;
    this.toastTimer = global.setTimeout(function () {
      d.classList.add('hidden');
      self.toastTimer = null;
    }, 2400);
  };

  // ==========================================================================
  // PHASE TRANSITIONS & CHAPTER JUMP
  // ==========================================================================
  EchoBoxingEngine.prototype._syncOverlays = function () {
    var p = this.state.phase;
    var d = this.dom;
    d.prologueOverlay.classList.toggle('hidden', p !== 'PROLOGUE');
    d.calibPanel.classList.toggle('hidden', p !== 'CALIB');
    d.restOverlay.classList.toggle('hidden', p !== 'REST');
    d.epilogueOverlay.classList.toggle('hidden', p !== 'EPILOGUE');
    d.hud.classList.toggle('hidden', p === 'PROLOGUE' || p === 'EPILOGUE');
    d.bottomBar.classList.toggle('hidden', p === 'PROLOGUE' || p === 'EPILOGUE' || p === 'REST');
    d.hudOpponent.classList.toggle('hidden', p !== 'ACT2' && p !== 'REST');
    d.hudRhythm.classList.toggle('hidden', p !== 'ACT1');
    if (p !== 'ACT2') {
      d.secondWindBanner.classList.add('hidden');
    }
  };

  EchoBoxingEngine.prototype._resetPlayer = function (fullHp) {
    var pl = this.state.player;
    if (fullHp) pl.hp = pl.maxHp;
    pl.breath = pl.maxBreath;
    pl.exhausted = false;
    pl.guarding = false;
    pl.dodgeDir = 'none';
    pl.dodgeTimer = 0;
    pl.dodgeCooldown = 0;
    pl.dodgeX = 0;
    pl.punchSide = 'none';
    pl.punchTimer = 0;
    pl.punchCooldown = 0;
    pl.leftPunch = 0;
    pl.rightPunch = 0;
    pl.counterEmpowered = false;
    pl.hurtShakeTimer = 0;
    pl.hurtShakeAmp = 0;
  };

  EchoBoxingEngine.prototype.startExperience = function () {
    this._clearAllTimeouts();
    this.audio.init();
    this.audio.setEnabled(this.soundEnabled);
    this.audio.startAmbient();
    this.state = this._createInitialState();
    this.enterCalibration();
  };

  EchoBoxingEngine.prototype.enterCalibration = function () {
    this._clearAllTimeouts();
    this.state.phase = 'CALIB';
    this.state.flowActive = false;
    this.state.slowMoTimer = 0;
    this.state.calib = {
      slipLeft: false,
      slipRight: false,
      jabDone: false,
      crossDone: false,
      guardHold: 0,
      guardDone: false,
      completing: false
    };
    this._resetPlayer(true);
    this._updateCalibUI();
    this._syncOverlays();
    this._updateHUD();
    this.audio.playBell(1);
  };

  EchoBoxingEngine.prototype.enterAct1 = function () {
    this._clearAllTimeouts();
    this.state.phase = 'ACT1';
    this.state.flowActive = false;
    this.state.slowMoTimer = 0;
    this.state.act1TimeLeft = ACT1_DURATION;
    this.state.act1Wave = 1;
    this.state.act1CueIndex = 0;
    this.state.act1NextCueTimer = 0.6;
    this.state.act1Finished = false;
    this.state.bag = { angle: 0, vel: 0, squash: 0, flash: 0 };
    this.state.bagCue = null;
    this._resetPlayer(true);
    this._syncOverlays();
    this._updateHUD();
    this.audio.playBell(1);
    this._showBanner(this.t('wave1Banner'), PAL.inkDeep, 1.8);
  };

  EchoBoxingEngine.prototype.enterRound = function (roundNum) {
    this._clearAllTimeouts();
    var cfg = ROUND_CFG[roundNum] || ROUND_CFG[1];
    this.state.phase = 'ACT2';
    this.state.round = roundNum;
    this.state.roundTimeLeft = cfg.duration;
    this.state.roundBreaks = 0;
    this.state.roundEnding = false;
    this.state.flowActive = false;
    this.state.slowMoTimer = 0;
    this.state.secondWindTimer = 0;
    this.dom.secondWindBanner.classList.add('hidden');

    this._resetPlayer(roundNum === 1);
    if (roundNum > 1) {
      this.state.player.hp = Math.min(this.state.player.maxHp, this.state.player.hp + 38);
    }

    this.state.opp = {
      hp: cfg.maxHp,
      maxHp: cfg.maxHp,
      state: 'idle',
      stateTimer: 1.35,
      stateDuration: 1.35,
      stateProgress: 0,
      currentAttack: null,
      telegraphLabel: '',
      guarding: false,
      staggerTimer: 0,
      hitFlash: 0,
      hitRecoilX: 0,
      hitRecoilY: 0,
      knockdownProgress: 0,
      comboLeft: 0
    };

    this._syncOverlays();
    this._updateHUD();
    this.audio.playBell(2);
    this._showBanner(this.t('roundStartBanner', { n: roundNum }), roundNum === 3 ? PAL.cinnabar : PAL.inkDeep, 1.7);
  };

  EchoBoxingEngine.prototype.enterRest = function (completedRound) {
    this._clearAllTimeouts();
    this.state.phase = 'REST';
    this.state.flowActive = false;
    this.state.slowMoTimer = 0;
    this.state.restTimeLeft = REST_DURATION;
    this.state.restNextRound = completedRound + 1;
    this.state.player.guarding = false;
    this.state.player.hp = Math.min(this.state.player.maxHp, this.state.player.hp + 35);
    this.state.player.breath = this.state.player.maxBreath;
    this.state.player.exhausted = false;
    this._refreshRestCopy();
    this._syncOverlays();
    this._updateHUD();
    this.audio.playBell(1);
  };

  EchoBoxingEngine.prototype._refreshRestCopy = function () {
    var isFirst = this.state.restNextRound === 2;
    this.dom.restHeading.textContent = this.t(isFirst ? 'rest1Heading' : 'rest2Heading');
    this.dom.restBody.textContent = this.t(isFirst ? 'rest1Body' : 'rest2Body');
    this.dom.restCountdown.textContent = this.t('restTimer', { s: Math.max(1, Math.ceil(this.state.restTimeLeft)) });
  };

  EchoBoxingEngine.prototype.enterEpilogue = function (outcomeKey) {
    this._clearAllTimeouts();
    this.state.phase = 'EPILOGUE';
    this.state.flowActive = false;
    this.state.slowMoTimer = 0;
    this.state.outcomeKey = outcomeKey || 'decisionWin';
    this.state.player.guarding = false;
    this._renderEpilogue();
    this._syncOverlays();
    this._updateHUD();

    var summary = this._computeSummary();
    Bridge.complete({
      score: summary.score,
      completed: true,
      summary: summary.archetypeTitle + ' · ' + summary.score
    });
  };

  EchoBoxingEngine.prototype.jumpToChapter = function (target) {
    this.audio.init();
    this.audio.setEnabled(this.soundEnabled);
    this.audio.startAmbient();
    this._toggleJumpMenu(false);
    if (target === 'prologue') {
      this.enterCalibration();
    } else if (target === 'act1') {
      this.enterAct1();
    } else if (target === 'r1') {
      this.enterRound(1);
    } else if (target === 'r2') {
      this.enterRound(2);
    } else if (target === 'r3') {
      this.enterRound(3);
    } else if (target === 'epilogue') {
      this.enterEpilogue('decisionWin');
    }
  };

  EchoBoxingEngine.prototype._computeSummary = function () {
    var st = this.state.stats;
    var acc = st.bagTotal > 0 ? Math.round((st.bagHits / st.bagTotal) * 100) : 0;

    var archKey = 'Scholar';
    if (st.perfectDodges >= 4) {
      archKey = 'Wind';
    } else if (st.maxCombo >= 8 || st.postureBreaks >= 3) {
      archKey = 'Thunder';
    } else if (st.bagTotal >= 6 && acc >= 75) {
      archKey = 'Bell';
    } else if (st.blocks >= 5) {
      archKey = 'Mountain';
    }

    var score = Math.round(
      st.totalHits * 18 +
      st.perfectDodges * 120 +
      st.postureBreaks * 150 +
      st.blocks * 35 +
      acc * 4 +
      (this.state.outcomeKey === 'ko' ? 400 : (this.state.outcomeKey === 'decisionWin' ? 220 : 80))
    );

    return {
      acc: acc,
      archKey: archKey,
      archetypeTitle: this.t('arch' + archKey + 'Title'),
      archetypeDesc: this.t('arch' + archKey + 'Desc'),
      score: score
    };
  };

  EchoBoxingEngine.prototype._renderEpilogue = function () {
    var d = this.dom;
    var st = this.state.stats;
    var sum = this._computeSummary();
    var map = {
      ko: ['outcomeKO', 'outcomeKOSub'],
      decisionWin: ['outcomeDecisionWin', 'outcomeDecisionWinSub'],
      decisionDraw: ['outcomeDecisionDraw', 'outcomeDecisionDrawSub'],
      decisionClose: ['outcomeDecisionClose', 'outcomeDecisionCloseSub'],
      defeat: ['outcomeDefeat', 'outcomeDefeatSub']
    };
    var pair = map[this.state.outcomeKey] || map.decisionWin;
    d.epilogueOutcome.textContent = this.t(pair[0]);
    d.epilogueOutcome.classList.toggle('outcome-ko', this.state.outcomeKey === 'ko');
    d.epilogueOutcomeSub.textContent = this.t(pair[1]);
    d.epilogueArchTitle.textContent = sum.archetypeTitle;
    d.epilogueArchDesc.textContent = sum.archetypeDesc;
    d.statRhythm.textContent = st.bagTotal > 0 ? (sum.acc + '%') : '--';
    d.statPerfectDodges.textContent = String(st.perfectDodges);
    d.statMaxCombo.textContent = String(st.maxCombo);
    d.statBlocks.textContent = String(st.blocks);
    d.statBreaks.textContent = String(st.postureBreaks);
    d.statDuration.textContent = formatMMSS(this.state.sessionElapsed);
  };

  // ==========================================================================
  // PLAYER ACTIONS (CALIB + ACT I + ACT II)
  // ==========================================================================
  EchoBoxingEngine.prototype._flashKeyChip = function (keyName) {
    if (!this.dom.controlsHint) return;
    var chip = this.dom.controlsHint.querySelector('[data-key="' + keyName + '"]');
    if (!chip) return;
    chip.classList.add('pressed');
    this._scheduleTimeout(function () {
      chip.classList.remove('pressed');
    }, 150);
  };

  EchoBoxingEngine.prototype.doSlip = function (dir) {
    var p = this.state.phase;
    if (this.paused || (p !== 'CALIB' && p !== 'ACT1' && p !== 'ACT2')) return;
    if (p === 'ACT2' && (this.state.roundEnding || this.state.secondWindTimer > 0)) return;

    var pl = this.state.player;
    if (pl.dodgeTimer > 0 || pl.dodgeCooldown > 0) return;

    this.audio.init();
    pl.guarding = false;
    pl.dodgeDir = dir;
    pl.dodgeTimer = pl.dodgeDuration;
    pl.dodgeCooldown = 0.14;
    this.state.windGust = dir === 'left' ? -1.0 : 1.0;
    this.audio.playWhoosh(1.32);
    this._flashKeyChip(dir === 'left' ? 'slipLeft' : 'slipRight');

    var w = this.renderer.w;
    var h = this.renderer.h;
    this._spawnRipple(w * (dir === 'left' ? 0.36 : 0.64), h * 0.62, PAL.bamboo, 16, 150, 2.2, 0.4, 0.7);
    this._spawnParticles(w * 0.5, h * 0.58, PAL.ink, 4, 140, 'leaf');

    if (p === 'CALIB') {
      this._recordCalib(dir === 'left' ? 'slipLeft' : 'slipRight');
      return;
    }

    if (p === 'ACT1') {
      this._evaluateBagInput(dir === 'left' ? 'slipLeft' : 'slipRight');
      return;
    }

    // ACT II Perfect Dodge check
    var opp = this.state.opp;
    var atk = opp.currentAttack;
    if (atk) {
      var inTeleWindow = (opp.state === 'telegraph' && opp.stateTimer <= 0.27);
      var inStrikeWindow = (opp.state === 'strike' && !atk.strikeChecked);
      if (inTeleWindow || inStrikeWindow) {
        var dirValid = (atk.kind === 'ochre') || (dir === atk.safeDir);
        if (dirValid) {
          this._triggerPerfectDodge();
        }
      }
    }
  };

  EchoBoxingEngine.prototype._triggerPerfectDodge = function () {
    if (this.state.slowMoTimer > 0.35) return;
    this.state.slowMoTimer = 0.72;
    this.state.player.counterEmpowered = true;
    this.state.player.breath = Math.min(this.state.player.maxBreath, this.state.player.breath + 26);
    this.state.player.exhausted = false;
    this.state.stats.perfectDodges += 1;

    this.audio.playPerfectDodge();
    this._triggerShake(6);
    var w = this.renderer.w;
    var h = this.renderer.h;
    this._spawnRipple(w * 0.5, h * 0.52, PAL.ochre, 22, 260, 3.6, 0.65, 1.05);
    this._spawnParticles(w * 0.5, h * 0.54, PAL.ochre, 10, 240, 'ink');
    this._spawnParticles(w * 0.5, h * 0.5, PAL.ink, 5, 160, 'leaf');
    this._spawnFloat(this.t('calloutPerfectDodge'), w * 0.5, h * 0.36, PAL.inkDeep, 28, 1.05);
  };

  EchoBoxingEngine.prototype.doPunch = function (side) {
    var p = this.state.phase;
    if (this.paused || (p !== 'CALIB' && p !== 'ACT1' && p !== 'ACT2')) return;
    if (p === 'ACT2' && (this.state.roundEnding || this.state.secondWindTimer > 0)) return;

    var pl = this.state.player;
    if (pl.punchTimer > 0 || pl.punchCooldown > 0) return;

    if (p === 'ACT2' && pl.exhausted) {
      this._spawnFloat(this.t('calloutExhausted'), this.renderer.w * 0.5, this.renderer.h * 0.66, PAL.cinnabar, 19, 0.55);
      return;
    }

    this.audio.init();
    if (p === 'ACT2' && !this.state.flowActive) {
      pl.breath = Math.max(0, pl.breath - 9);
      if (pl.breath <= 0) pl.exhausted = true;
    }

    pl.guarding = false;
    pl.punchSide = side;
    pl.punchTimer = pl.punchDuration;
    pl.punchHitApplied = false;
    pl.punchCooldown = 0.075;
    this.audio.playWhoosh(side === 'left' ? 1.06 : 0.94);
    this._flashKeyChip(side === 'left' ? 'jab' : 'cross');

    if (p === 'CALIB') {
      this._recordCalib(side === 'left' ? 'jab' : 'cross');
    } else if (p === 'ACT1') {
      this._evaluateBagInput(side === 'left' ? 'jab' : 'cross');
    }
  };

  EchoBoxingEngine.prototype.setGuard = function (active) {
    var p = this.state.phase;
    var pl = this.state.player;
    if (!active) {
      pl.guarding = false;
      return;
    }
    if (this.paused || (p !== 'CALIB' && p !== 'ACT1' && p !== 'ACT2')) {
      pl.guarding = false;
      return;
    }
    if (p === 'ACT2' && (pl.exhausted || this.state.roundEnding || this.state.secondWindTimer > 0)) {
      pl.guarding = false;
      return;
    }
    if (pl.dodgeTimer <= 0 && pl.punchTimer <= 0) {
      pl.guarding = true;
      this._flashKeyChip('guard');
    }
  };

  // ==========================================================================
  // PROLOGUE CALIBRATION LOGIC
  // ==========================================================================
  EchoBoxingEngine.prototype._recordCalib = function (kind) {
    var c = this.state.calib;
    if (c.completing) return;
    var changed = false;
    if (kind === 'slipLeft' && !c.slipLeft) { c.slipLeft = true; changed = true; }
    if (kind === 'slipRight' && !c.slipRight) { c.slipRight = true; changed = true; }
    if (kind === 'jab' && !c.jabDone) { c.jabDone = true; changed = c.crossDone; }
    if (kind === 'cross' && !c.crossDone) { c.crossDone = true; changed = c.jabDone; }

    if (changed) {
      this.audio.playCalibTick();
      this._spawnRipple(this.renderer.w * 0.5, this.renderer.h * 0.48, PAL.cedar, 18, 175, 2.4, 0.5, 0.85);
    }
    this._updateCalibUI();
    this._checkCalibComplete();
  };

  EchoBoxingEngine.prototype._updateCalibUI = function () {
    var c = this.state.calib;
    this.dom.calibStep1.classList.toggle('done', c.slipLeft);
    this.dom.calibStep2.classList.toggle('done', c.slipRight);
    this.dom.calibStep3.classList.toggle('done', c.jabDone && c.crossDone);
    this.dom.calibStep4.classList.toggle('done', c.guardDone);
    this.dom.calibGuardFill.style.width = Math.round(clamp(c.guardHold / 0.4, 0, 1) * 100) + '%';
  };

  EchoBoxingEngine.prototype._checkCalibComplete = function () {
    var c = this.state.calib;
    if (c.completing) return;
    if (c.slipLeft && c.slipRight && c.jabDone && c.crossDone && c.guardDone) {
      c.completing = true;
      this._showBanner(this.t('calibDoneBanner'), PAL.cedar, 1.35);
      var self = this;
      this._scheduleTimeout(function () {
        if (self.state.phase === 'CALIB') self.enterAct1();
      }, 1350);
    }
  };

  // ==========================================================================
  // ACT I: SPEED BAG & ECHO RHYTHM (60s, 3 PROGRESSIVE WAVES)
  // ==========================================================================
  EchoBoxingEngine.prototype._bagCueLabel = function (type) {
    if (type === 'jab') return this.t('cueJab');
    if (type === 'cross') return this.t('cueCross');
    if (type === 'slipLeft') return this.t('cueSlipLeft');
    return this.t('cueSlipRight');
  };

  EchoBoxingEngine.prototype._spawnNextBagCue = function () {
    var wave = this.state.act1Wave;
    var idx = this.state.act1CueIndex++;
    var type = 'jab';
    var beatDur = 1.05;

    if (wave === 1) {
      type = idx % 2 === 0 ? 'jab' : 'cross';
      beatDur = 1.08;
    } else if (wave === 2) {
      var seq2 = ['jab', 'cross', 'jab', 'cross'];
      type = seq2[idx % seq2.length];
      beatDur = idx % 2 === 1 ? 0.72 : 0.96;
    } else {
      var seq3 = ['slipLeft', 'cross', 'slipRight', 'jab', 'jab', 'cross'];
      type = seq3[idx % seq3.length];
      beatDur = (type === 'slipLeft' || type === 'slipRight') ? 0.98 : 0.76;
    }

    this.state.bagCue = {
      type: type,
      elapsed: 0,
      beatDuration: beatDur,
      progress: 0,
      resolved: false,
      label: this._bagCueLabel(type)
    };
    this.audio.playMetronomeTick(type === 'slipLeft' || type === 'slipRight' || idx % 2 === 0);
  };

  EchoBoxingEngine.prototype._evaluateBagInput = function (inputType) {
    var cue = this.state.bagCue;
    var w = this.renderer.w;
    var h = this.renderer.h;
    var bagX = w * 0.5;
    var bagY = h * 0.42;

    // Even outside a cue window, punching still snaps the speed bag tactilely!
    if (inputType === 'jab' || inputType === 'cross') {
      var dir = inputType === 'jab' ? 1 : -1;
      this.state.bag.vel += dir * 6.8;
      this.state.bag.squash = 0.85;
      this.state.bag.flash = 0.8;
    }

    if (!cue || cue.resolved) {
      if (inputType === 'jab' || inputType === 'cross') {
        this.audio.playSpeedBagHit('good');
        this._spawnRipple(bagX, bagY, PAL.cedar, 16, 130, 2.0, 0.35, 0.65);
      }
      return;
    }

    if (inputType !== cue.type) {
      return; // Ignore wrong key gently so player can press right one before beat passes
    }

    var delta = Math.abs(1 - cue.progress);
    if (cue.progress < 0.42) return; // Too early, wait for ring convergence

    cue.resolved = true;
    this.state.stats.bagTotal += 1;
    this.state.stats.bagHits += 1;
    this.state.stats.bagStreak += 1;
    if (this.state.stats.bagStreak > this.state.stats.bagBestStreak) {
      this.state.stats.bagBestStreak = this.state.stats.bagStreak;
    }

    var isPerfect = delta <= 0.2;
    if (isPerfect) this.state.stats.bagPerfects += 1;

    if (inputType === 'slipLeft' || inputType === 'slipRight') {
      this.audio.playCalibTick();
      this._spawnRipple(bagX, bagY, PAL.cinnabar, 20, 210, 3.0, 0.55, 0.85);
      this._spawnFloat(this.t('cueWindSlip'), bagX, bagY - 40, PAL.cinnabar, 24, 0.8);
    } else {
      this.audio.playSpeedBagHit(isPerfect ? 'perfect' : 'good');
      this._spawnRipple(bagX, bagY, isPerfect ? PAL.ochre : PAL.cedar, 18, isPerfect ? 220 : 165, 3.0, 0.58, 0.85);
      this._spawnParticles(bagX, bagY, isPerfect ? PAL.ochre : PAL.cedar, isPerfect ? 10 : 6, 220, 'ink');
      this._spawnFloat(this.t(isPerfect ? 'cuePerfect' : 'cueGood'), bagX, bagY - 42, isPerfect ? PAL.ochre : PAL.inkDeep, isPerfect ? 26 : 21, 0.78);
    }
    this.state.act1NextCueTimer = this.state.act1Wave === 1 ? 0.32 : 0.22;
  };

  EchoBoxingEngine.prototype._updateAct1 = function (dt) {
    // Spring-pendulum physics for speed bag
    var bag = this.state.bag;
    var springK = 42;
    var damping = 5.4;
    var acc = -springK * bag.angle - damping * bag.vel;
    bag.vel += acc * dt;
    bag.angle = clamp(bag.angle + bag.vel * dt, -0.85, 0.85);
    bag.squash = Math.max(0, bag.squash - dt * 4.5);
    bag.flash = Math.max(0, bag.flash - dt * 4.0);

    if (this.state.act1Finished) return;

    this.state.act1TimeLeft = Math.max(0, this.state.act1TimeLeft - dt);
    var elapsed = ACT1_DURATION - this.state.act1TimeLeft;
    var nextWave = elapsed < 10 ? 1 : (elapsed < 20 ? 2 : 3);
    if (nextWave !== this.state.act1Wave) {
      this.state.act1Wave = nextWave;
      this.audio.playBell(1);
      this._showBanner(this.t(nextWave === 2 ? 'wave2Banner' : 'wave3Banner'), nextWave === 3 ? PAL.cinnabar : PAL.cedar, 1.65);
      this._spawnParticles(this.renderer.w * 0.5, this.renderer.h * 0.35, PAL.ink, 6, 150, 'leaf');
    }

    if (this.state.act1TimeLeft <= 0) {
      this.state.act1Finished = true;
      this.state.bagCue = null;
      this.audio.playBell(2);
      this._showBanner(this.t('act1CompleteBanner'), PAL.inkDeep, 1.75);
      var self = this;
      this._scheduleTimeout(function () {
        if (self.state.phase === 'ACT1') self.enterRound(1);
      }, 1750);
      return;
    }

    var cue = this.state.bagCue;
    if (cue && !cue.resolved) {
      cue.elapsed += dt;
      cue.progress = cue.elapsed / cue.beatDuration;
      if (cue.progress >= 1.24) {
        cue.resolved = true;
        this.state.stats.bagTotal += 1;
        this.state.stats.bagStreak = 0;
        this._spawnFloat(this.t('cueMiss'), this.renderer.w * 0.5, this.renderer.h * 0.44, PAL.bamboo, 18, 0.6);
        this.state.act1NextCueTimer = 0.38;
      }
    } else {
      this.state.act1NextCueTimer -= dt;
      if (this.state.act1NextCueTimer <= 0) {
        this._spawnNextBagCue();
      }
    }
  };

  // ==========================================================================
  // ACT II: 3-ROUND ECHO BOUT
  // ==========================================================================
  EchoBoxingEngine.prototype._resolvePlayerPunch = function () {
    var opp = this.state.opp;
    var pl = this.state.player;
    var w = this.renderer.w;
    var h = this.renderer.h;
    var cx = w * 0.5;
    var cy = h * 0.46;
    var dirSign = pl.punchSide === 'left' ? 1 : -1;
    var isCounter = pl.counterEmpowered || this.state.slowMoTimer > 0;

    // Opponent active Guard (broken by Echo Slow counter!)
    if (opp.guarding && !isCounter) {
      this.audio.playBlock();
      var chip = this.state.flowActive ? 6 : 3;
      opp.hp = Math.max(1, opp.hp - chip);
      opp.hitRecoilX = dirSign * 6;
      this._triggerShake(3);
      this._spawnRipple(cx, cy, PAL.bamboo, 14, 110, 2.0, 0.35, 0.55);
      this._spawnFloat(this.t('calloutOppBlock', { dmg: chip }), cx + dirSign * 36, cy - 28, PAL.bamboo, 19, 0.65);
      return;
    }

    var isStaggered = opp.staggerTimer > 0;
    this.state.stats.combo += 1;
    this.state.stats.totalHits += 1;
    if (this.state.stats.combo > this.state.stats.maxCombo) {
      this.state.stats.maxCombo = this.state.stats.combo;
    }

    var isHeavy = isCounter || (isStaggered && this.state.stats.combo >= 3);
    var base = isCounter ? 36 : (isStaggered ? 20 : 14);
    var comboMult = 1 + Math.min(0.45, (this.state.stats.combo - 1) * 0.055);
    var dmg = Math.round(base * comboMult * (this.state.flowActive ? 2 : 1));

    opp.hp = Math.max(0, opp.hp - dmg);
    opp.hitFlash = 1.0;
    opp.hitRecoilX = dirSign * (isHeavy ? 26 : 14);
    opp.hitRecoilY = isHeavy ? -10 : -5;

    if (isCounter) {
      pl.counterEmpowered = false;
      this.state.slowMoTimer = Math.min(this.state.slowMoTimer, 0.14);
      this.state.hitstopTimer = 0.068;
      this.audio.playHeavyHit();
      this._triggerShake(12);
      opp.guarding = false;
      opp.state = 'stagger';
      opp.staggerTimer = 1.65;
      opp.stateDuration = 1.65;
      opp.stateTimer = 1.65;
      opp.currentAttack = null;
      opp.telegraphLabel = '';
      opp.comboLeft = 0;

      this._spawnRipple(cx, cy, PAL.ochre, 22, 240, 3.8, 0.62, 0.95);
      this._spawnParticles(cx, cy, PAL.ochre, 14, 320, 'ink');
      this._spawnParticles(cx, cy, PAL.ink, 6, 180, 'leaf');
      this._spawnFloat(this.t('calloutCrit', { dmg: dmg }), cx + dirSign * 42, cy - 46, PAL.ochre, 29, 0.95);
    } else if (isHeavy) {
      this.state.hitstopTimer = 0.052;
      this.audio.playHeavyHit();
      this._triggerShake(9);
      this._spawnRipple(cx, cy, PAL.cinnabar, 18, 195, 3.0, 0.5, 0.8);
      this._spawnParticles(cx, cy, PAL.cedar, 11, 260, 'ink');
      this._spawnFloat(this.t('calloutHeavy', { dmg: dmg }), cx + dirSign * 36, cy - 38, PAL.cinnabar, 25, 0.8);
    } else {
      this.audio.playLightHit();
      this._triggerShake(4);
      this._spawnRipple(cx, cy, PAL.ink, 14, 140, 2.2, 0.4, 0.65);
      this._spawnParticles(cx, cy, PAL.ink, 7, 200, 'ink');
      this._spawnFloat(this.t('calloutHit', { dmg: dmg }), cx + dirSign * 32, cy - 32, PAL.inkDeep, 22, 0.65);

      var cfg = ROUND_CFG[this.state.round];
      if (opp.state === 'idle' && cfg.guardChance > 0 && Math.random() < cfg.guardChance) {
        opp.state = 'guard';
        opp.guarding = true;
        opp.stateDuration = 0.82;
        opp.stateTimer = 0.82;
      }
    }

    // Check Posture Break (R1/R2) or K.O. (R3)
    if (opp.hp <= 0) {
      this._handleOpponentDepleted();
    }
  };

  EchoBoxingEngine.prototype._handleOpponentDepleted = function () {
    var cfg = ROUND_CFG[this.state.round];
    var opp = this.state.opp;

    if (cfg.isFinal) {
      // Round 3 full K.O.!
      this.state.roundEnding = true;
      opp.state = 'knockdown';
      opp.guarding = false;
      opp.currentAttack = null;
      opp.telegraphLabel = '';
      this.state.hitstopTimer = 0.11;
      this._triggerShake(18);
      this.audio.playBell(3);
      this._spawnRipple(this.renderer.w * 0.5, this.renderer.h * 0.48, PAL.cinnabar, 24, 340, 4.5, 0.72, 1.3);
      this._spawnParticles(this.renderer.w * 0.5, this.renderer.h * 0.45, PAL.ink, 12, 220, 'leaf');
      this._showBanner(this.t('calloutKO'), PAL.cinnabar, 1.85);
      var self = this;
      this._scheduleTimeout(function () {
        if (self.state.phase === 'ACT2') self.enterEpilogue('ko');
      }, 1850);
      return;
    }

    // R1 / R2: Posture Break bonus — keeps pacing within 4–5 min!
    this.state.roundBreaks += 1;
    this.state.stats.postureBreaks += 1;
    this.audio.playBell(1);
    this._triggerShake(14);
    this._spawnRipple(this.renderer.w * 0.5, this.renderer.h * 0.48, PAL.ochre, 24, 290, 4.0, 0.65, 1.1);
    this._showBanner(this.t('calloutPostureBreak'), PAL.ochre, 1.45);

    var elapsedInRound = cfg.duration - this.state.roundTimeLeft;
    if (this.state.roundBreaks >= 2 && elapsedInRound >= 34) {
      this.state.roundEnding = true;
      var self2 = this;
      this._scheduleTimeout(function () {
        if (self2.state.phase === 'ACT2') self2.enterRest(self2.state.round);
      }, 1350);
    } else {
      opp.hp = Math.round(opp.maxHp * 0.78);
      opp.state = 'stagger';
      opp.staggerTimer = 1.4;
      opp.stateDuration = 1.4;
      opp.stateTimer = 1.4;
      opp.guarding = false;
      opp.currentAttack = null;
      opp.telegraphLabel = '';
    }
  };

  EchoBoxingEngine.prototype._startOpponentAttack = function (isFollowUp) {
    var opp = this.state.opp;
    var cfg = ROUND_CFG[this.state.round];
    opp.state = 'telegraph';
    opp.guarding = false;

    var prevSide = opp.currentAttack ? opp.currentAttack.screenSide : 0;
    var side = isFollowUp && prevSide ? -prevSide : (Math.random() < 0.5 ? -1 : 1);

    if (!isFollowUp) {
      if (this.state.round === 1) {
        opp.comboLeft = 0;
      } else if (this.state.round === 2) {
        opp.comboLeft = Math.random() < 0.45 ? 1 : 0;
      } else {
        var r = Math.random();
        opp.comboLeft = r < 0.36 ? 2 : (r < 0.76 ? 1 : 0);
      }
    }

    var redChance = cfg.redChance + (isFollowUp && opp.comboLeft === 0 && this.state.round >= 2 ? 0.22 : 0);
    var kind = Math.random() < redChance ? 'cinnabar' : 'ochre';
    var teleDur = isFollowUp ? Math.max(0.42, cfg.telegraph - 0.08) : cfg.telegraph;
    if (this.state.flowActive) teleDur = Math.max(0.42, teleDur - 0.04);
    if (kind === 'cinnabar') teleDur += 0.1; // Extra readability for directional slip

    // Safe dodge is AWAY from glowing glove: screenSide -1 (left) -> slip right; +1 (right) -> slip left
    var safeDir = side < 0 ? 'right' : 'left';
    opp.currentAttack = {
      kind: kind,
      screenSide: side,
      safeDir: safeDir,
      strikeChecked: false
    };
    opp.telegraphLabel = kind === 'cinnabar'
      ? (safeDir === 'left' ? this.t('arrowSlipLeft') : this.t('arrowSlipRight'))
      : '';
    opp.stateDuration = teleDur;
    opp.stateTimer = teleDur;
    opp.stateProgress = 0;

    if (kind === 'cinnabar') {
      this.audio.playCinnabarTelegraph();
    } else {
      this.audio.playOchreTelegraph();
    }
  };

  EchoBoxingEngine.prototype._resolveOpponentStrike = function () {
    var opp = this.state.opp;
    var pl = this.state.player;
    var atk = opp.currentAttack;
    if (!atk || atk.strikeChecked) return;
    atk.strikeChecked = true;

    var isCinn = atk.kind === 'cinnabar';
    var baseDmg = (isCinn ? 21 : 12) * (this.state.flowActive ? 1.5 : 1);
    var w = this.renderer.w;
    var h = this.renderer.h;

    // 1. Check slip dodge
    if (pl.dodgeTimer > 0) {
      var safe = !isCinn || pl.dodgeDir === atk.safeDir;
      if (safe) {
        if (this.state.slowMoTimer <= 0) {
          this._spawnFloat(this.t('calloutDodge'), w * 0.5, h * 0.6, PAL.inkDeep, 22, 0.6);
        }
        return;
      }
    }

    // 2. Check high guard
    if (pl.guarding) {
      if (isCinn) {
        // Guard break on cinnabar heavy hook
        this.audio.playHeavyHit();
        this.state.hitstopTimer = 0.065;
        this._triggerShake(14);
        this.state.hurtFlash = 0.9;
        pl.hurtShakeTimer = 0.32;
        pl.hurtShakeAmp = 12;
        pl.guarding = false;
        pl.breath = 0;
        pl.exhausted = true;
        pl.hp = Math.max(0, pl.hp - Math.round(baseDmg));
        this.state.stats.combo = 0;
        this._spawnParticles(w * 0.5, h * 0.62, PAL.cinnabar, 14, 300, 'ink');
        this._spawnFloat(this.t('calloutGuardBreak', { dmg: Math.round(baseDmg) }), w * 0.5, h * 0.54, PAL.cinnabar, 28, 0.9);
      } else {
        // Solid block: 80% reduction + light recoil tremor on player gloves
        this.audio.playBlock();
        var chip = Math.max(1, Math.round(baseDmg * 0.2));
        pl.hp = Math.max(0, pl.hp - chip);
        pl.hurtShakeTimer = 0.16;
        pl.hurtShakeAmp = 5;
        if (!this.state.flowActive) {
          pl.breath = Math.max(0, pl.breath - 16);
          if (pl.breath <= 0) pl.exhausted = true;
        }
        this.state.stats.blocks += 1;
        this._triggerShake(5);
        this._spawnRipple(w * 0.5, h * 0.64, PAL.ochre, 16, 150, 2.5, 0.45, 0.65);
        this._spawnFloat(this.t('calloutBlock', { dmg: chip }), w * 0.5, h * 0.6, PAL.cedar, 22, 0.65);
      }
    } else {
      // 3. Clean hit on player + subtle foreground glove vibration
      this.audio.playHeavyHit();
      this.state.hitstopTimer = isCinn ? 0.065 : 0.04;
      this._triggerShake(isCinn ? 15 : 10);
      this.state.hurtFlash = isCinn ? 0.95 : 0.65;
      pl.hurtShakeTimer = isCinn ? 0.30 : 0.22;
      pl.hurtShakeAmp = isCinn ? 11 : 7.5;
      pl.hp = Math.max(0, pl.hp - Math.round(baseDmg));
      this.state.stats.combo = 0;
      this._spawnParticles(w * 0.5, h * 0.62, PAL.cinnabar, 12, 260, 'ink');
      this._spawnFloat(this.t('calloutHurt', { dmg: Math.round(baseDmg) }), w * 0.5, h * 0.56, PAL.cinnabar, 25, 0.8);
    }

    if (pl.hp <= 0) {
      this._handlePlayerDown();
    }
  };

  EchoBoxingEngine.prototype._handlePlayerDown = function () {
    var cfg = ROUND_CFG[this.state.round];
    this.state.stats.knockdownsSuffered += 1;

    // Exhibition-friendly Second Wind in R1/R2 (once) so visitors see the full arc!
    if (!cfg.isFinal && !this.state.secondWindUsed) {
      this.state.secondWindUsed = true;
      this.state.secondWindTimer = 2.55;
      this.state.player.guarding = false;
      this.state.opp.state = 'idle';
      this.state.opp.stateTimer = 1.4;
      this.state.opp.currentAttack = null;
      this.state.opp.telegraphLabel = '';
      this.audio.playBell(1);
      this.dom.secondWindBanner.classList.remove('hidden');
      this.dom.secondWindCount.textContent = '1';
      return;
    }

    // Round 3 or second knockdown -> honorable Defeat
    this.state.roundEnding = true;
    this.audio.playBell(3);
    this._showBanner(this.t('calloutDefeat'), PAL.cinnabar, 1.7);
    var self = this;
    this._scheduleTimeout(function () {
      if (self.state.phase === 'ACT2') self.enterEpilogue('defeat');
    }, 1700);
  };

  EchoBoxingEngine.prototype._updateAct2 = function (dt, worldDt) {
    var st = this.state;
    var cfg = ROUND_CFG[st.round];

    // Second Wind recovery pause
    if (st.secondWindTimer > 0) {
      st.secondWindTimer = Math.max(0, st.secondWindTimer - dt);
      var step = st.secondWindTimer > 1.7 ? '1' : (st.secondWindTimer > 0.85 ? '2' : '3');
      this.dom.secondWindCount.textContent = step;
      if (st.secondWindTimer <= 0) {
        this.dom.secondWindBanner.classList.add('hidden');
        st.player.hp = Math.round(st.player.maxHp * 0.48);
        st.player.breath = st.player.maxBreath;
        st.player.exhausted = false;
        this.audio.playCalibTick();
        this._spawnRipple(this.renderer.w * 0.5, this.renderer.h * 0.6, PAL.ochre, 20, 220, 3.2, 0.55, 0.9);
      }
      return;
    }

    if (st.roundEnding) {
      if (st.opp.state === 'knockdown') {
        st.opp.knockdownProgress = Math.min(1, st.opp.knockdownProgress + dt * 1.45);
      }
      return;
    }

    // Round Timer & Round 3 Echo Flow
    st.roundTimeLeft = Math.max(0, st.roundTimeLeft - worldDt);

    if (cfg.isFinal && !st.flowActive && st.roundTimeLeft <= FLOW_THRESHOLD && st.roundTimeLeft > 0) {
      st.flowActive = true;
      st.player.breath = st.player.maxBreath;
      st.player.exhausted = false;
      this.audio.playFlowTrigger();
      this._triggerShake(8);
      this._spawnParticles(this.renderer.w * 0.5, this.renderer.h * 0.4, PAL.ink, 14, 240, 'leaf');
      this._showBanner(this.t('calloutFlowStart'), PAL.cinnabar, 1.85);
    }

    if (st.roundTimeLeft <= 0) {
      st.roundEnding = true;
      if (!cfg.isFinal) {
        this.enterRest(st.round);
      } else {
        this.audio.playBell(3);
        this._showBanner(this.t('calloutTimeUp'), PAL.inkDeep, 1.65);
        var pRatio = st.player.hp / st.player.maxHp;
        var oRatio = st.opp.hp / st.opp.maxHp;
        var outcome = (pRatio > oRatio + 0.05 || st.stats.postureBreaks >= 2)
          ? 'decisionWin'
          : (Math.abs(pRatio - oRatio) <= 0.05 ? 'decisionDraw' : 'decisionClose');
        var self = this;
        this._scheduleTimeout(function () {
          if (self.state.phase === 'ACT2') self.enterEpilogue(outcome);
        }, 1650);
      }
      return;
    }

    // Update Opponent AI State Machine
    var opp = st.opp;
    opp.hitRecoilX *= Math.pow(0.001, dt);
    opp.hitRecoilY *= Math.pow(0.001, dt);
    opp.hitFlash = Math.max(0, opp.hitFlash - dt * 5.0);
    if (opp.staggerTimer > 0) opp.staggerTimer = Math.max(0, opp.staggerTimer - worldDt);

    opp.stateTimer -= worldDt;
    opp.stateProgress = opp.stateDuration > 0 ? clamp(1 - opp.stateTimer / opp.stateDuration, 0, 1) : 1;

    if (opp.state === 'strike' && opp.stateProgress >= 0.34) {
      this._resolveOpponentStrike();
    }

    if (opp.stateTimer <= 0) {
      if (opp.state === 'idle') {
        this._startOpponentAttack(false);
      } else if (opp.state === 'telegraph') {
        opp.state = 'strike';
        opp.stateDuration = 0.28;
        opp.stateTimer = 0.28;
        opp.stateProgress = 0;
        this.audio.playWhoosh(opp.currentAttack && opp.currentAttack.kind === 'cinnabar' ? 0.68 : 0.9);
      } else if (opp.state === 'strike') {
        opp.state = 'recover';
        opp.stateDuration = 0.16;
        opp.stateTimer = 0.16;
        opp.stateProgress = 0;
      } else if (opp.state === 'recover') {
        if (opp.comboLeft > 0) {
          opp.comboLeft -= 1;
          this._startOpponentAttack(true);
        } else {
          opp.state = 'idle';
          opp.currentAttack = null;
          opp.telegraphLabel = '';
          var idleDur = cfg.idleMin + Math.random() * cfg.idleSpan;
          opp.stateDuration = idleDur;
          opp.stateTimer = idleDur;
        }
      } else if (opp.state === 'guard' || opp.state === 'stagger') {
        opp.state = 'idle';
        opp.guarding = false;
        opp.staggerTimer = 0;
        opp.stateDuration = 0.55;
        opp.stateTimer = 0.55;
      }
    }
  };

  // ==========================================================================
  // MASTER UPDATE LOOP & HUD SYNC
  // ==========================================================================
  EchoBoxingEngine.prototype._update = function (dt) {
    var st = this.state;
    st.clock += dt;

    if (st.phase === 'CALIB' || st.phase === 'ACT1' || st.phase === 'ACT2' || st.phase === 'REST') {
      st.sessionElapsed += dt;
    }

    if (st.hitstopTimer > 0) {
      st.hitstopTimer = Math.max(0, st.hitstopTimer - dt);
      return;
    }

    st.shake = Math.max(0, st.shake - dt * 42);
    st.windGust *= Math.pow(0.08, dt);
    st.hurtFlash = Math.max(0, st.hurtFlash - dt * 2.1);

    // Update Banner
    if (st.banner) {
      st.banner.timer -= dt;
      if (st.banner.timer <= 0) {
        st.banner = null;
      } else if (st.banner.timer < 0.35) {
        st.banner.alpha = st.banner.timer / 0.35;
      }
    }

    // Update Ripples, Particles & Floats
    for (var i = st.ripples.length - 1; i >= 0; i--) {
      st.ripples[i].age += dt;
      if (st.ripples[i].age >= st.ripples[i].life) st.ripples.splice(i, 1);
    }
    for (var j = st.particles.length - 1; j >= 0; j--) {
      var pt = st.particles[j];
      pt.age += dt;
      if (pt.age >= pt.life) {
        st.particles.splice(j, 1);
      } else {
        pt.x += pt.vx * dt + (st.flowActive ? 35 * dt : 0);
        pt.y += pt.vy * dt;
        pt.vy += pt.gravity * dt;
        pt.rot += pt.vrot * dt;
      }
    }
    for (var k = st.floats.length - 1; k >= 0; k--) {
      var fl = st.floats[k];
      fl.age += dt;
      if (fl.age >= fl.life) {
        st.floats.splice(k, 1);
      } else {
        fl.y += fl.vy * dt;
        fl.vy *= 0.95;
      }
    }

    // Ambient drifting bamboo leaves during Echo Flow
    if (st.flowActive && !this.reducedMotion && Math.random() < dt * 4.5) {
      this._spawnParticles(Math.random() < 0.5 ? 20 : this.renderer.w - 20, Math.random() * this.renderer.h * 0.45, PAL.ink, 1, 95, 'leaf');
    }

    // Slow-motion scaling
    var worldDt = dt;
    if (st.slowMoTimer > 0) {
      st.slowMoTimer = Math.max(0, st.slowMoTimer - dt);
      worldDt = dt * 0.22;
      if (st.slowMoTimer <= 0) {
        st.player.counterEmpowered = false;
      }
    }

    // Player dodge & punch kinematics
    var pl = st.player;
    if (pl.hurtShakeTimer > 0) {
      pl.hurtShakeTimer = Math.max(0, pl.hurtShakeTimer - dt);
    }
    if (pl.dodgeTimer > 0) {
      pl.dodgeTimer = Math.max(0, pl.dodgeTimer - dt);
      if (pl.dodgeTimer <= 0) pl.dodgeDir = 'none';
    } else if (pl.dodgeCooldown > 0) {
      pl.dodgeCooldown = Math.max(0, pl.dodgeCooldown - dt);
    }
    var targetDodgeX = pl.dodgeDir === 'left' ? -1 : (pl.dodgeDir === 'right' ? 1 : 0);
    pl.dodgeX += (targetDodgeX - pl.dodgeX) * Math.min(1, dt * 20);

    if (pl.punchTimer > 0) {
      pl.punchTimer = Math.max(0, pl.punchTimer - dt);
      var prog = 1 - pl.punchTimer / pl.punchDuration;
      if (pl.punchSide === 'left') {
        pl.leftPunch = prog;
        pl.rightPunch *= 0.7;
      } else {
        pl.rightPunch = prog;
        pl.leftPunch *= 0.7;
      }
      if (!pl.punchHitApplied && prog >= 0.42 && st.phase === 'ACT2' && !st.roundEnding) {
        pl.punchHitApplied = true;
        this._resolvePlayerPunch();
      }
      if (pl.punchTimer <= 0) {
        pl.punchSide = 'none';
        pl.leftPunch = 0;
        pl.rightPunch = 0;
      }
    } else {
      pl.leftPunch *= 0.7;
      pl.rightPunch *= 0.7;
      if (pl.punchCooldown > 0) pl.punchCooldown = Math.max(0, pl.punchCooldown - dt);
    }

    // Breath recovery
    if (st.flowActive) {
      pl.breath = pl.maxBreath;
      pl.exhausted = false;
    } else if (!pl.guarding && pl.punchTimer <= 0) {
      pl.breath = Math.min(pl.maxBreath, pl.breath + 26 * dt);
      if (pl.exhausted && pl.breath >= 24) pl.exhausted = false;
    }

    // Phase-specific updates
    if (st.phase === 'CALIB') {
      if (pl.guarding && !st.calib.guardDone) {
        st.calib.guardHold += dt;
        if (st.calib.guardHold >= 0.4) {
          st.calib.guardDone = true;
          this.audio.playCalibTick();
          this._spawnRipple(this.renderer.w * 0.5, this.renderer.h * 0.55, PAL.ochre, 20, 180, 2.8, 0.5, 0.85);
          this._checkCalibComplete();
        }
        this._updateCalibUI();
      }
    } else if (st.phase === 'ACT1') {
      this._updateAct1(dt);
    } else if (st.phase === 'ACT2') {
      this._updateAct2(dt, worldDt);
    } else if (st.phase === 'REST') {
      st.restTimeLeft = Math.max(0, st.restTimeLeft - dt);
      this.dom.restCountdown.textContent = this.t('restTimer', { s: Math.max(1, Math.ceil(st.restTimeLeft)) });
      if (st.restTimeLeft <= 0) {
        this.enterRound(st.restNextRound);
      }
    }

    this._updateHUD();
  };

  EchoBoxingEngine.prototype._updateHUD = function () {
    var st = this.state;
    var pl = st.player;
    var d = this.dom;

    // Player bars
    var hpPct = clamp((pl.hp / pl.maxHp) * 100, 0, 100);
    d.playerResolveBar.style.width = hpPct + '%';
    d.playerResolveBar.classList.toggle('low', hpPct <= 30);
    d.playerResolveText.textContent = Math.ceil(pl.hp) + ' / ' + pl.maxHp;

    var brPct = clamp((pl.breath / pl.maxBreath) * 100, 0, 100);
    d.playerBreathBar.style.width = brPct + '%';
    d.playerBreathBar.classList.toggle('exhausted', pl.exhausted);
    d.playerBreathBar.classList.toggle('flow', st.flowActive);

    // Combo
    if (st.phase === 'ACT2' && st.stats.combo >= 2) {
      d.comboPill.textContent = this.t('comboText', { n: st.stats.combo });
      d.comboPill.classList.add('active');
    } else {
      d.comboPill.classList.remove('active');
    }

    // Center Badge, Timer & Subtitle
    d.actBadge.classList.toggle('flow', st.flowActive);
    d.timerDisplay.classList.toggle('flow', st.flowActive);

    if (st.phase === 'CALIB') {
      d.actBadge.textContent = this.t('actPrologueTitle');
      d.phaseSubtitle.textContent = this.t('actPrologueSub');
      d.timerDisplay.textContent = formatMMSS(st.sessionElapsed);
    } else if (st.phase === 'ACT1') {
      d.actBadge.textContent = this.t('act1Title');
      var wKey = st.act1Wave === 1 ? 'act1SubWave1' : (st.act1Wave === 2 ? 'act1SubWave2' : 'act1SubWave3');
      d.phaseSubtitle.textContent = this.t(wKey);
      d.timerDisplay.textContent = formatMMSS(st.act1TimeLeft);

      var acc = st.stats.bagTotal > 0 ? Math.round((st.stats.bagHits / st.stats.bagTotal) * 100) : 100;
      d.rhythmAccText.textContent = acc + '%';
      d.rhythmBarFill.style.width = acc + '%';
      d.rhythmStreakText.textContent = this.t('rhythmStreak', { n: st.stats.bagStreak });
    } else if (st.phase === 'ACT2') {
      if (st.flowActive) {
        d.actBadge.textContent = this.t('act2FlowTitle');
        d.phaseSubtitle.textContent = this.t('act2FlowSub');
      } else {
        d.actBadge.textContent = this.t('act2R' + st.round + 'Title');
        d.phaseSubtitle.textContent = this.t('act2R' + st.round + 'Sub');
      }
      d.timerDisplay.textContent = formatMMSS(st.roundTimeLeft);

      var opp = st.opp;
      var oppPct = clamp((opp.hp / opp.maxHp) * 100, 0, 100);
      d.opponentBarKind.textContent = this.t(ROUND_CFG[st.round].isFinal ? 'finalResolveLabel' : 'postureLabel');
      d.opponentBarText.textContent = Math.ceil(opp.hp) + ' / ' + opp.maxHp;
      d.opponentBarFill.style.width = oppPct + '%';
      d.opponentBarFill.classList.toggle('final-round', ROUND_CFG[st.round].isFinal);

      if (st.stats.postureBreaks > 0) {
        d.breaksBadge.textContent = this.t('breaksBadge', { n: st.stats.postureBreaks });
        d.breaksBadge.classList.remove('hidden');
      } else {
        d.breaksBadge.classList.add('hidden');
      }
    } else if (st.phase === 'REST') {
      d.actBadge.textContent = this.t(st.restNextRound === 2 ? 'rest1Title' : 'rest2Title');
      d.phaseSubtitle.textContent = this.t('restRecovery');
      d.timerDisplay.textContent = formatMMSS(st.restTimeLeft);
    }
  };

  // ==========================================================================
  // INPUTS, UTILITY CONTROLS & TEARDOWN
  // ==========================================================================
  EchoBoxingEngine.prototype._toggleJumpMenu = function (force) {
    var open = force !== undefined ? force : this.dom.jumpMenu.classList.contains('hidden');
    this.dom.jumpMenu.classList.toggle('hidden', !open);
    this.dom.btnJumpToggle.setAttribute('aria-expanded', String(open));
  };

  EchoBoxingEngine.prototype._bindEvents = function () {
    var self = this;
    var d = this.dom;

    this._on(global, 'resize', function () { self._handleResize(); });
    this._on(document, 'visibilitychange', function () {
      if (!self.embedded) self.setPaused(document.hidden);
    });

    // Keyboard
    this._on(global, 'keydown', function (e) {
      if (e.code === 'Escape') {
        if (!d.jumpMenu.classList.contains('hidden')) {
          self._toggleJumpMenu(false);
          return;
        }
        if (self.embedded) {
          Bridge.exit();
        }
        return;
      }
      if (e.code === 'Tab' && !self.embedded) {
        e.preventDefault();
        self._toggleJumpMenu();
        return;
      }
      if (self.paused) return;
      var p = self.state.phase;
      if (p !== 'CALIB' && p !== 'ACT1' && p !== 'ACT2') return;

      if (e.code === 'Space' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        e.preventDefault();
      }
      if (e.repeat && e.code !== 'Space') return;

      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        self.doSlip('left');
      } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        self.doSlip('right');
      } else if (e.code === 'KeyJ') {
        self.doPunch('left');
      } else if (e.code === 'KeyK') {
        self.doPunch('right');
      } else if (e.code === 'Space') {
        self.setGuard(true);
      }
    });

    this._on(global, 'keyup', function (e) {
      if (e.code === 'Space') self.setGuard(false);
    });

    // Mouse punch on canvas
    this._on(d.canvas, 'contextmenu', function (e) { e.preventDefault(); });
    this._on(d.canvas, 'mousedown', function (e) {
      if (self.paused) return;
      if (e.button === 0) self.doPunch('left');
      else if (e.button === 2) self.doPunch('right');
    });

    // Responsive touch buttons
    var bindTouch = function (el, downFn, upFn) {
      if (!el) return;
      var onDown = function (e) { e.preventDefault(); downFn(); };
      var onUp = function (e) { e.preventDefault(); if (upFn) upFn(); };
      self._on(el, 'touchstart', onDown, { passive: false });
      self._on(el, 'mousedown', onDown);
      if (upFn) {
        self._on(el, 'touchend', onUp, { passive: false });
        self._on(el, 'touchcancel', onUp, { passive: false });
        self._on(el, 'mouseup', onUp);
        self._on(el, 'mouseleave', onUp);
      }
    };
    bindTouch(d.btnDodgeLeft, function () { self.doSlip('left'); });
    bindTouch(d.btnDodgeRight, function () { self.doSlip('right'); });
    bindTouch(d.btnPunchLeft, function () { self.doPunch('left'); });
    bindTouch(d.btnPunchRight, function () { self.doPunch('right'); });
    bindTouch(d.btnGuard, function () { self.setGuard(true); }, function () { self.setGuard(false); });

    // Buttons & Utility Bar
    this._on(d.btnStart, 'click', function () { self.startExperience(); });
    this._on(d.btnSkipWarmup, 'click', function () { self.enterAct1(); });
    this._on(d.btnRestReady, 'click', function () { self.enterRound(self.state.restNextRound); });
    this._on(d.btnReplay, 'click', function () { self.startExperience(); });
    this._on(d.btnBack, 'click', function () {
      if (!Bridge.exit()) {
        self._clearAllTimeouts();
        self.state = self._createInitialState();
        self._syncOverlays();
        self._updateHUD();
        self._showToast(self.t('backStandaloneToast'));
      }
    });

    this._on(d.btnLang, 'click', function () {
      self.lang = self.lang === 'zh' ? 'en' : 'zh';
      self._applyTranslations();
      self._updateHUD();
    });
    this._on(d.btnSound, 'click', function () {
      self.audio.init();
      self.soundEnabled = self.audio.toggle();
      self._applyTranslations();
    });
    this._on(d.btnMotion, 'click', function () {
      self.reducedMotion = !self.reducedMotion;
      self.state.reducedMotion = self.reducedMotion;
      self._applyReducedMotionClass();
      self._applyTranslations();
    });
    this._on(d.btnJumpToggle, 'click', function (e) {
      e.stopPropagation();
      self._toggleJumpMenu();
    });
    this._on(document, 'click', function (e) {
      if (d.jumpWrap && !d.jumpWrap.contains(e.target)) {
        self._toggleJumpMenu(false);
      }
    });

    var jumpBtns = d.jumpMenu ? d.jumpMenu.querySelectorAll('[data-jump]') : [];
    for (var i = 0; i < jumpBtns.length; i++) {
      (function (btn) {
        self._on(btn, 'click', function () {
          self.jumpToChapter(btn.getAttribute('data-jump'));
        });
      })(jumpBtns[i]);
    }
  };

  EchoBoxingEngine.prototype.dispose = function () {
    if (this.disposed) return;
    this.disposed = true;
    if (this.rafId !== null) {
      global.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this._clearAllTimeouts();
    for (var i = 0; i < this.listeners.length; i++) {
      var item = this.listeners[i];
      try {
        item.el.removeEventListener(item.ev, item.fn, item.opts);
      } catch (_) {}
    }
    this.listeners = [];
    if (this.audio) this.audio.dispose();
    if (this.renderer) this.renderer.dispose();
  };

  // Boot cleanly on DOMContentLoaded
  function boot() {
    var engine = new EchoBoxingEngine();
    global.__ECHO_BOXING_ENGINE__ = engine;
    engine.start();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
