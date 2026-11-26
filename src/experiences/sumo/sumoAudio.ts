/**
 * Procedural Sumo Soundscape (Web Audio API).
 * Synthesizes authentic hyōshigi clappers, taiko drums, chirichōzu claps,
 * purifying salt hiss, clash impacts, matta warnings, and victory cadences
 * with zero external audio files.
 */

export type SumoSoundType =
  | 'clap'
  | 'salt'
  | 'shiko_light'
  | 'shiko_heavy'
  | 'hyoshigi'
  | 'hakkeyoi'
  | 'matta'
  | 'clash_win'
  | 'clash_lose'
  | 'clash_even'
  | 'kimarite_win'
  | 'kimarite_lose'
  | 'ui';

export class SumoAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private enabled = true;
  private disposed = false;
  private volume = 0.38;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!this.master || !this.context) return;
    this.master.gain.setTargetAtTime(enabled ? this.volume : 0, this.context.currentTime, 0.04);
  }

  unlock() {
    if (this.disposed) return;
    if (!this.context) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.context = new Ctor();
      this.master = this.context.createGain();
      this.master.gain.value = this.enabled ? this.volume : 0;
      this.master.connect(this.context.destination);
      this.noise = this.makeNoise(this.context);
    }
    if (this.context.state === 'suspended') void this.context.resume();
  }

  suspend() {
    if (this.context?.state === 'running') void this.context.suspend();
  }

  resume() {
    if (this.context?.state === 'suspended') void this.context.resume();
  }

  play(type: SumoSoundType, strength = 0.75) {
    const ctx = this.context;
    const master = this.master;
    if (!ctx || !master || !this.enabled || this.disposed) return;
    const s = Math.min(1, Math.max(0.2, strength));
    const now = ctx.currentTime;

    switch (type) {
      case 'clap':
        // Crisp chirichōzu palm snap.
        this.noiseBurst(now, 0.085, 2200, 0.22 * s, 1.1);
        this.noiseBurst(now + 0.005, 0.05, 4800, 0.12 * s, 0.8);
        this.tone(now, 180, 0.11, 'triangle', 0.1 * s, 110);
        break;

      case 'salt':
        // High shimmering sand/salt arc.
        this.noiseBurst(now, 0.42, 5200, 0.11 * s, 1.2);
        this.noiseBurst(now + 0.07, 0.34, 3200, 0.07 * s, 0.9);
        break;

      case 'shiko_light':
        this.tone(now, 72, 0.22, 'sine', 0.25 * s, 44);
        this.noiseBurst(now, 0.15, 280, 0.12 * s, 0.8);
        break;

      case 'shiko_heavy':
        // Deep odaiko thud + clay impact rumble.
        this.taiko(now, 52, 0.72, 0.68 * s);
        this.taiko(now + 0.015, 98, 0.38, 0.22 * s);
        this.noiseBurst(now, 0.32, 220, 0.28 * s, 0.7);
        break;

      case 'hyoshigi':
        // Twin wooden clappers opening the bout.
        this.woodClack(now, 0.48 * s, 1180);
        this.woodClack(now + 0.17, 0.4 * s, 1240);
        break;

      case 'hakkeyoi':
        // Sharp hyōshigi snap + low taiko ignition.
        this.woodClack(now, 0.62 * s, 1340);
        this.taiko(now + 0.01, 68, 0.42, 0.52 * s);
        break;

      case 'matta':
        // Quick wooden double-check warning.
        this.woodClack(now, 0.36 * s, 720);
        this.woodClack(now + 0.11, 0.36 * s, 680);
        break;

      case 'clash_win':
        // Heavy flesh-and-earth impact + crisp snap.
        this.taiko(now, 64, 0.45, 0.56 * s);
        this.noiseBurst(now, 0.12, 1650, 0.28 * s, 0.9);
        this.woodClack(now + 0.02, 0.28 * s, 980);
        break;

      case 'clash_lose':
        // Duller low thud signaling pushed-back weight.
        this.taiko(now, 48, 0.46, 0.54 * s);
        this.noiseBurst(now, 0.18, 460, 0.24 * s, 0.8);
        break;

      case 'clash_even':
        // Gritty chest-to-chest lock.
        this.taiko(now, 74, 0.24, 0.36 * s);
        this.noiseBurst(now, 0.11, 950, 0.16 * s, 1.0);
        break;

      case 'kimarite_win':
        // Dramatic finish: massive taiko strike + ceremonial hyōshigi flourish.
        this.taiko(now, 46, 0.95, 0.78 * s);
        this.noiseBurst(now, 0.22, 1400, 0.32 * s, 0.8);
        this.woodClack(now + 0.18, 0.5 * s, 1220);
        this.woodClack(now + 0.34, 0.55 * s, 1360);
        this.taiko(now + 0.48, 56, 0.85, 0.55 * s);
        break;

      case 'kimarite_lose':
        this.taiko(now, 42, 0.85, 0.65 * s);
        this.noiseBurst(now, 0.35, 320, 0.25 * s, 0.7);
        this.woodClack(now + 0.24, 0.34 * s, 740);
        break;

      case 'ui':
        this.woodClack(now, 0.2 * s, 960);
        break;

      default:
        break;
    }
  }

  dispose() {
    this.disposed = true;
    if (this.context) {
      void this.context.close().catch(() => undefined);
      this.context = null;
      this.master = null;
      this.noise = null;
    }
  }

  private makeNoise(ctx: AudioContext) {
    const length = Math.floor(ctx.sampleRate * 1.5);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 0x9e3779b9;
    for (let i = 0; i < length; i += 1) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      data[i] = (seed / 0xffffffff) * 2 - 1;
    }
    return buffer;
  }

  private taiko(at: number, startHz: number, duration: number, gain: number) {
    this.tone(at, startHz * 1.45, duration, 'sine', gain, startHz * 0.72);
    this.tone(at, startHz * 2.1, duration * 0.35, 'triangle', gain * 0.28, startHz * 1.1);
  }

  private tone(
    at: number,
    frequency: number,
    duration: number,
    shape: OscillatorType,
    gain: number,
    endFrequency?: number,
  ) {
    const ctx = this.context;
    if (!ctx || !this.master) return;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = shape;
    osc.frequency.setValueAtTime(frequency, at);
    if (endFrequency) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), at + duration);
    }
    amp.gain.setValueAtTime(0.0001, at);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), at + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(amp).connect(this.master);
    osc.start(at);
    osc.stop(at + duration + 0.05);
  }

  private noiseBurst(at: number, duration: number, cutoff: number, gain: number, q = 0.9) {
    const ctx = this.context;
    if (!ctx || !this.master || !this.noise) return;
    const source = ctx.createBufferSource();
    source.buffer = this.noise;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = cutoff;
    filter.Q.value = q;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, at);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), at + 0.015);
    amp.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.connect(filter).connect(amp).connect(this.master);
    source.start(at, Math.random() * 0.5);
    source.stop(at + duration + 0.05);
  }

  private woodClack(at: number, gain: number, pitch = 1100) {
    const ctx = this.context;
    if (!ctx || !this.master) return;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(pitch, at);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.52, at + 0.055);
    amp.gain.setValueAtTime(0.0001, at);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain * 0.35), at + 0.003);
    amp.gain.exponentialRampToValueAtTime(0.0001, at + 0.085);
    osc.connect(amp).connect(this.master);
    osc.start(at);
    osc.stop(at + 0.11);
    this.noiseBurst(at, 0.04, pitch * 1.9, gain * 0.16, 2.2);
  }
}
