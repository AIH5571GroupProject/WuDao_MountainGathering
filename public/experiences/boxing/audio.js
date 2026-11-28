(function (global) {
  'use strict';

  function EchoAudioEngine() {
    this.ctx = null;
    this.masterGain = null;
    this.echoSend = null;
    this.echoDelay = null;
    this.echoFilter = null;
    this.echoFeedback = null;
    this.echoReturn = null;
    this.noiseBuffer = null;

    this.ambientSource = null;
    this.ambientGain = null;
    this.ambientLfo = null;
    this.ambientActive = false;

    this.enabled = true;
    this.paused = false;
    this.disposed = false;
  }

  EchoAudioEngine.prototype.init = function () {
    if (this.disposed) return false;
    try {
      if (!this.ctx) {
        var AudioCtx = global.AudioContext || global.webkitAudioContext;
        if (!AudioCtx) return false;
        this.ctx = new AudioCtx();

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.enabled ? 0.85 : 0.0001;
        this.masterGain.connect(this.ctx.destination);

        // Subtle Valley Echo Delay Bus
        this.echoSend = this.ctx.createGain();
        this.echoSend.gain.value = 0.72;

        this.echoDelay = this.ctx.createDelay(1.0);
        this.echoDelay.delayTime.value = 0.31;

        this.echoFilter = this.ctx.createBiquadFilter();
        this.echoFilter.type = 'lowpass';
        this.echoFilter.frequency.value = 1180;
        this.echoFilter.Q.value = 0.6;

        this.echoFeedback = this.ctx.createGain();
        this.echoFeedback.gain.value = 0.27;

        this.echoReturn = this.ctx.createGain();
        this.echoReturn.gain.value = 0.3;

        this.echoSend.connect(this.echoDelay);
        this.echoDelay.connect(this.echoFilter);
        this.echoFilter.connect(this.echoReturn);
        this.echoReturn.connect(this.masterGain);

        this.echoFilter.connect(this.echoFeedback);
        this.echoFeedback.connect(this.echoDelay);

        this.noiseBuffer = this._buildNoiseBuffer(1.2);
      }

      if (this.ctx.state === 'suspended' && !this.paused) {
        this.ctx.resume().catch(function () {});
      }
      return true;
    } catch (_) {
      return false;
    }
  };

  EchoAudioEngine.prototype._buildNoiseBuffer = function (duration) {
    var sr = this.ctx.sampleRate;
    var length = Math.floor(sr * duration);
    var buffer = this.ctx.createBuffer(1, length, sr);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  };

  EchoAudioEngine.prototype._canPlay = function () {
    return !this.disposed && this.enabled && !this.paused && !!this.ctx && this.ctx.state !== 'closed';
  };

  EchoAudioEngine.prototype.setEnabled = function (flag) {
    this.enabled = Boolean(flag);
    if (this.ctx && this.masterGain && this.ctx.state !== 'closed') {
      var now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(this.enabled ? 0.85 : 0.0001, now, 0.04);
    }
    if (this.enabled && this.ambientActive && !this.paused) {
      this.startAmbient();
    } else if (!this.enabled) {
      this._pauseAmbientGain(true);
    }
    return this.enabled;
  };

  EchoAudioEngine.prototype.toggle = function () {
    return this.setEnabled(!this.enabled);
  };

  EchoAudioEngine.prototype.setPaused = function (paused) {
    this.paused = Boolean(paused);
    if (!this.ctx || this.ctx.state === 'closed') return;
    try {
      if (this.paused) {
        if (this.ctx.state === 'running') {
          this.ctx.suspend().catch(function () {});
        }
      } else {
        if (this.ctx.state === 'suspended') {
          this.ctx.resume().catch(function () {});
        }
      }
    } catch (_) {
      // Ignore state race
    }
  };

  EchoAudioEngine.prototype._pauseAmbientGain = function (mute) {
    if (!this.ambientGain || !this.ctx || this.ctx.state === 'closed') return;
    var now = this.ctx.currentTime;
    this.ambientGain.gain.cancelScheduledValues(now);
    this.ambientGain.gain.setTargetAtTime(mute ? 0.0001 : 0.026, now, 0.25);
  };

  // Subtle bamboo-hollow mountain breeze ambient bed
  EchoAudioEngine.prototype.startAmbient = function () {
    this.ambientActive = true;
    if (!this.ctx || this.disposed || this.ctx.state === 'closed') return;
    if (this.ambientSource) {
      this._pauseAmbientGain(!this.enabled);
      return;
    }
    try {
      var now = this.ctx.currentTime;
      var src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      src.loop = true;

      var bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(340, now);
      bp.Q.value = 1.9;

      var lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 820;

      // Gentle slow wind sway LFO
      var lfo = this.ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.14;
      var lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 110;
      lfo.connect(lfoGain);
      lfoGain.connect(bp.frequency);

      var gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      if (this.enabled) {
        gain.gain.setTargetAtTime(0.026, now, 0.8);
      }

      src.connect(bp);
      bp.connect(lp);
      lp.connect(gain);
      gain.connect(this.masterGain);

      src.start(now);
      lfo.start(now);

      this.ambientSource = src;
      this.ambientGain = gain;
      this.ambientLfo = lfo;
    } catch (_) {
      // Ignore if unable to start
    }
  };

  EchoAudioEngine.prototype.stopAmbient = function () {
    this.ambientActive = false;
    if (this.ambientSource) {
      try {
        this.ambientSource.stop();
        this.ambientSource.disconnect();
      } catch (_) {}
      this.ambientSource = null;
    }
    if (this.ambientLfo) {
      try {
        this.ambientLfo.stop();
        this.ambientLfo.disconnect();
      } catch (_) {}
      this.ambientLfo = null;
    }
    if (this.ambientGain) {
      try {
        this.ambientGain.disconnect();
      } catch (_) {}
      this.ambientGain = null;
    }
  };

  // 1. Brass Boxing Ring Bell with valley echo
  EchoAudioEngine.prototype.playBell = function (strikes) {
    if (!this._canPlay()) return;
    var count = strikes || 2;
    var now = this.ctx.currentTime;
    var partials = [660, 1023, 1584, 2310, 3168];

    for (var s = 0; s < count; s++) {
      var t = now + s * 0.3;
      for (var i = 0; i < partials.length; i++) {
        var osc = this.ctx.createOscillator();
        var gain = this.ctx.createGain();
        osc.type = i === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(partials[i], t);

        var peak = i === 0 ? 0.2 : 0.1 / (i + 0.6);
        var decay = i === 0 ? 1.35 : 0.95 / (1 + i * 0.25);

        gain.gain.setValueAtTime(0.0008, t);
        gain.gain.linearRampToValueAtTime(peak, t + 0.007);
        gain.gain.exponentialRampToValueAtTime(0.0005, t + decay);

        osc.connect(gain);
        gain.connect(this.masterGain);
        if (i <= 2) {
          gain.connect(this.echoSend);
        }

        osc.start(t);
        osc.stop(t + decay + 0.05);
      }
    }
  };

  // 2. Speed Bag crisp leather double-rebound thump
  EchoAudioEngine.prototype.playSpeedBagHit = function (quality) {
    if (!this._canPlay()) return;
    var now = this.ctx.currentTime;
    var isPerfect = quality === 'perfect';
    var hits = [
      { offset: 0.0, amp: isPerfect ? 0.42 : 0.3, freq: isPerfect ? 215 : 185, echo: isPerfect },
      { offset: 0.088, amp: isPerfect ? 0.22 : 0.16, freq: 270, echo: false },
      { offset: 0.168, amp: isPerfect ? 0.11 : 0.07, freq: 320, echo: false }
    ];

    for (var i = 0; i < hits.length; i++) {
      var h = hits[i];
      var t = now + h.offset;

      // Leather body thump
      var osc = this.ctx.createOscillator();
      var oGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(h.freq, t);
      osc.frequency.exponentialRampToValueAtTime(68, t + 0.07);
      oGain.gain.setValueAtTime(h.amp, t);
      oGain.gain.exponentialRampToValueAtTime(0.0008, t + 0.08);
      osc.connect(oGain);
      oGain.connect(this.masterGain);
      if (h.echo) oGain.connect(this.echoSend);
      osc.start(t);
      osc.stop(t + 0.09);

      // Cedar bracket snap
      var noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      var filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1450 + i * 260, t);
      filter.Q.value = 1.6;
      var nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(h.amp * 0.65, t);
      nGain.gain.exponentialRampToValueAtTime(0.0008, t + 0.055);
      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.masterGain);
      noise.start(t);
      noise.stop(t + 0.065);
    }

    if (isPerfect) {
      // Subtle harmonic cedar overtone
      var chime = this.ctx.createOscillator();
      var cGain = this.ctx.createGain();
      chime.type = 'sine';
      chime.frequency.setValueAtTime(784, now);
      cGain.gain.setValueAtTime(0.08, now);
      cGain.gain.exponentialRampToValueAtTime(0.0006, now + 0.2);
      chime.connect(cGain);
      cGain.connect(this.masterGain);
      cGain.connect(this.echoSend);
      chime.start(now);
      chime.stop(now + 0.22);
    }
  };

  // 3. Soft wooden bamboo metronome pulse
  EchoAudioEngine.prototype.playMetronomeTick = function (accent) {
    if (!this._canPlay()) return;
    var now = this.ctx.currentTime;
    var osc = this.ctx.createOscillator();
    var gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(accent ? 760 : 540, now);
    osc.frequency.exponentialRampToValueAtTime(accent ? 520 : 390, now + 0.045);

    gain.gain.setValueAtTime(accent ? 0.13 : 0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.07);
  };

  // 4. Glove air whoosh
  EchoAudioEngine.prototype.playWhoosh = function (pitch) {
    if (!this._canPlay()) return;
    var p = pitch || 1.0;
    var now = this.ctx.currentTime;
    var src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    var filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(580 * p, now);
    filter.frequency.exponentialRampToValueAtTime(175 * p, now + 0.14);
    filter.Q.value = 1.4;

    var gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.15);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(now);
    src.stop(now + 0.16);
  };

  // 5. Crisp jab snap
  EchoAudioEngine.prototype.playLightHit = function () {
    if (!this._canPlay()) return;
    var now = this.ctx.currentTime;

    var noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    var filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1380, now);
    var nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.28, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.095);

    var osc = this.ctx.createOscillator();
    var oGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(185, now);
    osc.frequency.exponentialRampToValueAtTime(54, now + 0.09);
    oGain.gain.setValueAtTime(0.32, now);
    oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(oGain);
    oGain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.11);
  };

  // 6. Heavy counter / body thud with valley echo
  EchoAudioEngine.prototype.playHeavyHit = function () {
    if (!this._canPlay()) return;
    var now = this.ctx.currentTime;

    var osc = this.ctx.createOscillator();
    var oGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(148, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.23);
    oGain.gain.setValueAtTime(0.58, now);
    oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(oGain);
    oGain.connect(this.masterGain);
    oGain.connect(this.echoSend);
    osc.start(now);
    osc.stop(now + 0.26);

    var noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    var filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1680, now);
    filter.frequency.exponentialRampToValueAtTime(210, now + 0.16);
    var nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.4, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.masterGain);
    nGain.connect(this.echoSend);
    noise.start(now);
    noise.stop(now + 0.18);
  };

  // 7. Leather high-guard block thump
  EchoAudioEngine.prototype.playBlock = function () {
    if (!this._canPlay()) return;
    var now = this.ctx.currentTime;
    var osc = this.ctx.createOscillator();
    var filter = this.ctx.createBiquadFilter();
    var gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(118, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.11);

    filter.type = 'lowpass';
    filter.frequency.value = 340;

    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.13);
  };

  // 8. Ochre telegraph chime (blockable)
  EchoAudioEngine.prototype.playOchreTelegraph = function () {
    if (!this._canPlay()) return;
    var now = this.ctx.currentTime;
    var osc = this.ctx.createOscillator();
    var gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(640, now);
    osc.frequency.exponentialRampToValueAtTime(980, now + 0.11);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.16);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.17);
  };

  // 9. Cinnabar heavy warning cue (unblockable hook)
  EchoAudioEngine.prototype.playCinnabarTelegraph = function () {
    if (!this._canPlay()) return;
    var now = this.ctx.currentTime;
    var offsets = [0, 0.13];
    for (var i = 0; i < offsets.length; i++) {
      var t = now + offsets[i];
      var osc = this.ctx.createOscillator();
      var filter = this.ctx.createBiquadFilter();
      var gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(215, t);
      osc.frequency.linearRampToValueAtTime(155, t + 0.11);

      filter.type = 'lowpass';
      filter.frequency.value = 680;

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.14);
    }
  };

  // 10. Perfect-dodge "听劲·缓时" bass sweep + valley harmonic chime
  EchoAudioEngine.prototype.playPerfectDodge = function () {
    if (!this._canPlay()) return;
    var now = this.ctx.currentTime;

    var sub = this.ctx.createOscillator();
    var sGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(240, now);
    sub.frequency.exponentialRampToValueAtTime(42, now + 0.44);
    sGain.gain.setValueAtTime(0.42, now);
    sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
    sub.connect(sGain);
    sGain.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 0.5);

    var notes = [587.33, 880, 1174.66];
    for (var i = 0; i < notes.length; i++) {
      var chime = this.ctx.createOscillator();
      var cGain = this.ctx.createGain();
      var t = now + i * 0.035;
      chime.type = 'triangle';
      chime.frequency.setValueAtTime(notes[i], t);
      cGain.gain.setValueAtTime(0.11 / (1 + i * 0.3), t);
      cGain.gain.exponentialRampToValueAtTime(0.0006, t + 0.34);
      chime.connect(cGain);
      cGain.connect(this.masterGain);
      cGain.connect(this.echoSend);
      chime.start(t);
      chime.stop(t + 0.36);
    }
  };

  // 11. Round-3 Echo Flow activation swell
  EchoAudioEngine.prototype.playFlowTrigger = function () {
    if (!this._canPlay()) return;
    var now = this.ctx.currentTime;
    var freqs = [220, 330, 440];
    for (var i = 0; i < freqs.length; i++) {
      var osc = this.ctx.createOscillator();
      var filter = this.ctx.createBiquadFilter();
      var gain = this.ctx.createGain();

      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freqs[i] * 0.75, now);
      osc.frequency.exponentialRampToValueAtTime(freqs[i], now + 0.45);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(420, now);
      filter.frequency.exponentialRampToValueAtTime(2200, now + 0.55);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.14 / (1 + i * 0.25), now + 0.22);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.9);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      gain.connect(this.echoSend);
      osc.start(now);
      osc.stop(now + 0.95);
    }
  };

  // 12. Jade/ceramic calibration chime
  EchoAudioEngine.prototype.playCalibTick = function () {
    if (!this._canPlay()) return;
    var now = this.ctx.currentTime;
    var osc = this.ctx.createOscillator();
    var gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.14);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.28);
    osc.connect(gain);
    gain.connect(this.masterGain);
    gain.connect(this.echoSend);
    osc.start(now);
    osc.stop(now + 0.3);
  };

  EchoAudioEngine.prototype.dispose = function () {
    if (this.disposed) return;
    this.disposed = true;
    this.stopAmbient();
    if (this.ctx) {
      try {
        if (this.ctx.state !== 'closed') {
          this.ctx.close().catch(function () {});
        }
      } catch (_) {}
      this.ctx = null;
    }
    this.masterGain = null;
    this.echoSend = null;
    this.echoDelay = null;
    this.echoFilter = null;
    this.echoFeedback = null;
    this.echoReturn = null;
    this.noiseBuffer = null;
  };

  global.EchoAudioEngine = EchoAudioEngine;
})(window);
