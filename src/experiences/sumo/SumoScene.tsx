import { useEffect, useRef, type MutableRefObject } from 'react';
import type { Quality } from '../../mountain/model';
import { SUMO_PALETTE, currentOpponent, type SumoGameState } from './sumoEngine';
import {
  PLAYER_STYLE,
  createWashiPattern,
  opponentStyle,
  renderUkiyoStage,
  type UkiyoParticle,
} from './sumoUkiyoPainter';
import {
  choreographUkiyoFrame,
  lerpSkeleton,
  type RikishiSkeleton,
} from './sumoUkiyoPose';

const QUALITY_BUDGET: Record<Quality, number> = { airy: 0.55, balanced: 0.85, full: 1.0 };

export type SceneRigInput = {
  /** 0..1 leg-raise charge during Shiko ritual. */
  shikoCharge: number;
};

export default function SumoScene({
  state,
  paused,
  quality,
  reducedMotion,
  rigInputRef,
}: {
  state: SumoGameState;
  paused: boolean;
  quality: Quality;
  reducedMotion: boolean;
  rigInputRef: MutableRefObject<SceneRigInput>;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const qualityRef = useRef(quality);
  qualityRef.current = quality;
  const calmRef = useRef(reducedMotion);
  calmRef.current = reducedMotion;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const washiPattern = createWashiPattern(ctx);
    let width = canvas.clientWidth || 960;
    let height = canvas.clientHeight || 640;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      width = canvas.clientWidth || 960;
      height = canvas.clientHeight || 640;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Subtle pointer parallax for true 2.5D woodblock stage depth
    const pointer = { targetX: 0, targetY: 0, x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointer.targetX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.targetY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    const onLeave = () => {
      pointer.targetX = 0;
      pointer.targetY = 0;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    canvas.addEventListener('pointerleave', onLeave);

    const particles: UkiyoParticle[] = [];
    const spawn = (
      kind: UkiyoParticle['kind'],
      originX: number,
      originY: number,
      count: number,
      strength = 1,
    ) => {
      const budget = QUALITY_BUDGET[qualityRef.current] ?? 0.85;
      const total = Math.max(1, Math.round(count * budget));
      const maxPool = Math.round(320 * budget);
      for (let i = 0; i < total; i += 1) {
        if (particles.length >= maxPool) particles.shift();
        if (kind === 'salt') {
          particles.push({
            x: originX + (Math.random() - 0.5) * 0.14,
            y: originY + Math.random() * 0.16,
            vx: 0.9 + Math.random() * 1.45,
            vy: 1.4 + Math.random() * 1.35,
            life: 0,
            maxLife: 1.2 + Math.random() * 0.7,
            size: 1.4 + Math.random() * 1.1,
            color: '#fcfdf9',
            gravity: 3.2,
            kind: 'salt',
          });
        } else if (kind === 'dust') {
          const dir = Math.random() > 0.5 ? 1 : -1;
          particles.push({
            x: originX + (Math.random() - 0.5) * 0.35,
            y: 0.04 + Math.random() * 0.08,
            vx: dir * (0.45 + Math.random() * 1.5) * strength,
            vy: (0.45 + Math.random() * 0.95) * strength,
            life: 0,
            maxLife: 0.65 + Math.random() * 0.5,
            size: 1.7 + Math.random() * 1.6,
            color: '#b8aa8a',
            gravity: 1.7,
            kind: 'dust',
          });
        } else if (kind === 'mote') {
          particles.push({
            x: (Math.random() - 0.5) * 3.4,
            y: 0.25 + Math.random() * 2.1,
            vx: (Math.random() - 0.5) * 0.07,
            vy: 0.05 + Math.random() * 0.08,
            life: 0,
            maxLife: 2.8 + Math.random() * 2.0,
            size: 0.9 + Math.random() * 0.6,
            color: '#f5f2e1',
            gravity: 0,
            kind: 'mote',
          });
        } else {
          const ang = Math.random() * Math.PI * 2;
          const spd = (1.1 + Math.random() * 2.2) * strength;
          particles.push({
            x: originX + (Math.random() - 0.5) * 0.15,
            y: originY + (Math.random() - 0.5) * 0.18,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd * 0.8 + 0.6,
            life: 0,
            maxLife: 0.42 + Math.random() * 0.32,
            size: 1.5 + Math.random() * 1.3,
            color: Math.random() < 0.58 ? SUMO_PALETTE.vermilion : SUMO_PALETTE.ink,
            gravity: 2.6,
            kind: 'ink',
          });
        }
      }
    };

    const fx = {
      clock: 0,
      eventSeen: 0,
      clapAnim: 1,
      saltAnim: 1,
      stompImpact: 0,
      shock: 0,
      shockRadius: 0,
      shockX: 0,
      shake: 0,
      saltGlow: 0,
      edgeAlert: 0,
      moteClock: 0,
      camZoom: 1,
      camPanX: 0,
      camPanY: 0,
    };

    let smoothPlayer: RikishiSkeleton | null = null;
    let smoothOpp: RikishiSkeleton | null = null;
    let lastTime = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const rawDt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;
      const dt = pausedRef.current ? 0 : rawDt;
      const st = stateRef.current;
      const calm = calmRef.current;
      fx.clock += dt;

      // Ambient drifting sunlit motes
      if (!calm && dt > 0) {
        fx.moteClock += dt;
        if (fx.moteClock > 0.28) {
          fx.moteClock = 0;
          spawn('mote', 0, 1, 1, 1);
        }
      }

      // Respond to engine events with salt arcs, clay dust, shockwaves, & ink sparks
      if (st.eventSeq !== fx.eventSeen) {
        fx.eventSeen = st.eventSeq;
        const cx = st.bout.ringPos * 0.88;
        if (st.lastEvent === 'clap') {
          fx.clapAnim = 0;
        } else if (st.lastEvent === 'salt') {
          fx.saltAnim = 0;
          fx.saltGlow = Math.min(1, fx.saltGlow + 0.38);
          spawn('salt', -0.58, 1.25, 78, 1);
        } else if (st.lastEvent === 'shiko_heavy') {
          fx.stompImpact = 1;
          fx.shock = 1;
          fx.shockRadius = 0.2;
          fx.shockX = 0;
          fx.shake = calm ? 0.08 : 0.42 * st.lastEventStrength;
          spawn('dust', 0, 0.05, 52, 1.2);
        } else if (st.lastEvent === 'shiko_light') {
          fx.stompImpact = 0.45;
          fx.shock = 0.45;
          fx.shockRadius = 0.16;
          fx.shockX = 0;
          spawn('dust', 0, 0.05, 18, 0.65);
        } else if (st.lastEvent === 'tachiai_win' || st.lastEvent === 'clash_win') {
          fx.shock = 0.9;
          fx.shockRadius = 0.18;
          fx.shockX = cx;
          fx.shake = calm ? 0.08 : 0.34;
          spawn('ink', cx, 1.05, 42, 1.25);
          spawn('dust', cx, 0.05, 28, 1.0);
        } else if (st.lastEvent === 'tachiai_miss' || st.lastEvent === 'clash_lose') {
          fx.shock = 0.65;
          fx.shockRadius = 0.18;
          fx.shockX = cx;
          fx.shake = calm ? 0.06 : 0.25;
          spawn('dust', cx, 0.05, 26, 0.9);
        } else if (st.lastEvent === 'clash_even') {
          fx.shake = calm ? 0.04 : 0.14;
          spawn('ink', cx, 1.0, 16, 0.7);
        } else if (st.lastEvent === 'kimarite_win' || st.lastEvent === 'kimarite_lose') {
          fx.shock = 1.25;
          fx.shockRadius = 0.2;
          fx.shockX = cx;
          fx.shake = calm ? 0.1 : 0.52;
          spawn('ink', cx, 1.1, 64, 1.5);
          spawn('dust', cx, 0.05, 44, 1.3);
        }
      }

      fx.clapAnim = Math.min(1, fx.clapAnim + dt * 1.15);
      fx.saltAnim = Math.min(1, fx.saltAnim + dt * 1.45);
      fx.stompImpact *= Math.exp(-dt * 5.0);
      fx.shock *= Math.exp(-dt * 2.4);
      if (fx.shock > 0.02) fx.shockRadius = Math.min(2.6, fx.shockRadius + dt * 2.8);
      fx.shake *= Math.exp(-dt * 8.2);

      const edgeTarget = st.mode === 'bout' ? Math.max(0, (Math.abs(st.bout.ringPos) - 0.55) / 0.45) : 0;
      fx.edgeAlert += (edgeTarget - fx.edgeAlert) * Math.min(1, dt * 8);

      // Step particles
      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const p = particles[i];
        p.life += dt;
        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
          continue;
        }
        p.vy -= p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.y < 0.02 && p.gravity > 0) {
          p.y = 0.02;
          p.vx *= 0.72;
          p.vy = 0;
        }
      }

      // Compute target biomechanical skeletons & Gyōji state
      const targetFrame = choreographUkiyoFrame(
        st,
        fx.clock,
        rigInputRef.current.shikoCharge,
        fx.clapAnim,
        fx.saltAnim,
        fx.stompImpact,
      );

      const poseRate = dt === 0 ? 1 : Math.min(1, dt * (st.mode === 'kimarite_freeze' ? 16 : 12));
      if (!smoothPlayer || smoothPlayer.facing !== targetFrame.player.facing) {
        smoothPlayer = targetFrame.player;
      } else {
        smoothPlayer = lerpSkeleton(smoothPlayer, targetFrame.player, poseRate);
      }
      if (!smoothOpp || smoothOpp.facing !== targetFrame.opponent.facing) {
        smoothOpp = targetFrame.opponent;
      } else {
        smoothOpp = lerpSkeleton(smoothOpp, targetFrame.opponent, poseRate);
      }

      // Smooth camera zoom, pan, and mouse parallax
      const camRate = dt === 0 ? 1 : Math.min(1, dt * 6);
      fx.camZoom += (targetFrame.fx.camZoom - fx.camZoom) * camRate;
      fx.camPanX += (targetFrame.fx.camPanX - fx.camPanX) * camRate;
      fx.camPanY += (targetFrame.fx.camPanY - fx.camPanY) * camRate;

      const pTargetX = calm ? 0 : pointer.targetX;
      const pTargetY = calm ? 0 : pointer.targetY;
      pointer.x += (pTargetX - pointer.x) * Math.min(1, dt * 4.5);
      pointer.y += (pTargetY - pointer.y) * Math.min(1, dt * 4.5);

      const opp = currentOpponent(st);
      const playerEarnedYokozuna =
        st.mode === 'banzuke' && st.history.filter((h) => h.won).length >= 3;

      renderUkiyoStage(
        ctx,
        width,
        height,
        washiPattern,
        smoothPlayer,
        smoothOpp,
        targetFrame.opponentVisible,
        { ...PLAYER_STYLE, hasTsuna: playerEarnedYokozuna },
        opponentStyle(opp),
        targetFrame.gyoji,
        {
          ...targetFrame.fx,
          camZoom: fx.camZoom,
          camPanX: fx.camPanX,
          camPanY: fx.camPanY,
        },
        particles,
        {
          time: fx.clock,
          parallaxX: pointer.x,
          parallaxY: pointer.y,
          shakeX: Math.sin(fx.clock * 54) * fx.shake,
          shakeY: Math.cos(fx.clock * 46) * fx.shake * 0.75,
          shock: fx.shock,
          shockRadius: fx.shockRadius,
          shockX: fx.shockX,
          saltGlow: fx.saltGlow,
          edgeAlert: fx.edgeAlert,
          ringPos: st.bout.ringPos,
          reducedMotion: calm,
        },
      );

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
    };
  }, [rigInputRef]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
      aria-label="Edo Nishiki-e Sumo Stage"
    />
  );
}
