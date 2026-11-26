/**
 * 2.5D Anatomical Sumo Skeleton & Gyōji Referee Choreography.
 *
 * Pure TypeScript (zero Canvas/DOM dependencies).
 * Coordinates live in normalized stage space:
 *   x ∈ [-2.2, +2.2]  (left = East/Player, right = West/Opponent, 0 = Dohyo center)
 *   y ∈ [0, +2.6]     (0 = Dohyo clay floor, +y = upward)
 *   depthOffset       (subtle front/back sorting offset during sidesteps & belt locks)
 *
 * Uses analytical 2-bone IK for grounded legs so feet stay planted firmly on the clay
 * during deep koshi-wari squats, tachiai crouches, shiko weight shifts, and drives.
 */

import { SUMO_PALETTE, type MoveId, type SumoGameState } from './sumoEngine';

export type Vec2 = { x: number; y: number };

export type RikishiSkeleton = {
  /** +1 facing right (East), -1 facing left (West). */
  facing: 1 | -1;
  /** Whole body tilt for airborne throws / face-plants (radians, + = clockwise). */
  bodyTilt: number;
  /** Subtle depth sorting shift (-1 back, +1 front). */
  depth: number;
  pelvis: Vec2;
  chest: Vec2;
  neck: Vec2;
  head: Vec2;
  headTilt: number;
  /** Far (back-layer) arm: shoulder -> elbow -> hand. */
  armFar: [Vec2, Vec2, Vec2];
  /** Near (front-layer) arm: shoulder -> elbow -> hand. */
  armNear: [Vec2, Vec2, Vec2];
  /** Far leg: hip -> knee -> ankle -> toe. */
  legFar: [Vec2, Vec2, Vec2, Vec2];
  /** Near leg: hip -> knee -> ankle -> toe. */
  legNear: [Vec2, Vec2, Vec2, Vec2];
  /** Open palm ('palm'), clenched fist ('fist'), or grabbing belt ('grip'). */
  handMode: 'palm' | 'fist' | 'grip';
  /** Facial expression intensity: calm, fierce, strained. */
  expression: 'calm' | 'fierce' | 'strained';
  /** Telegraph / impact rim color & intensity (0..1). */
  aura: number;
  auraColor: string;
};

export type GyojiState = {
  x: number;
  /** -1 pointing East (player), 0 neutral, +1 pointing West (opponent). */
  gunbaiAngle: number;
  /** 0 calm, 1 dramatic high raise ("Hakkeyoi!" or decisive finish). */
  excitement: number;
  crouch: number;
};

export type StageFxCue = {
  /** Dramatic radial woodblock speed lines (shūchūsen) intensity 0..1. */
  speedLines: number;
  /** Floating Japanese calligraphic impact kanji (e.g. 推, 寄, 避, 踏, 決). */
  calligraphy: string;
  calligraphyAlpha: number;
  calligraphyColor: string;
  /** Dynamic camera framing offsets (zoom 1.0 = standard, panX, panY). */
  camZoom: number;
  camPanX: number;
  camPanY: number;
  /** Slash arc VFX across the arena. */
  slash: {
    kind: 'none' | 'oshi' | 'yori' | 'hataki' | 'shiko' | 'salt';
    intensity: number;
    x: number;
    y: number;
    dir: 1 | -1;
    color: string;
  };
};

export type UkiyoFrame = {
  player: RikishiSkeleton;
  opponent: RikishiSkeleton;
  opponentVisible: boolean;
  gyoji: GyojiState;
  fx: StageFxCue;
};

/** Exact 2-bone IK solver in 2D (bendDir: +1 bends knee/elbow forward, -1 backward). */
function solve2BoneIK(
  root: Vec2,
  target: Vec2,
  len1: number,
  len2: number,
  bendDir: 1 | -1,
): [Vec2, Vec2] {
  const dx = target.x - root.x;
  const dy = target.y - root.y;
  const rawDist = Math.hypot(dx, dy) || 0.0001;
  const maxReach = (len1 + len2) * 0.992;
  const minReach = Math.abs(len1 - len2) + 0.02;
  const dist = Math.max(minReach, Math.min(maxReach, rawDist));

  const baseAngle = Math.atan2(dy, dx);
  const cosA = (len1 * len1 + dist * dist - len2 * len2) / (2 * len1 * dist);
  const a = Math.acos(Math.max(-1, Math.min(1, cosA)));
  const jointAngle = baseAngle + bendDir * a;

  const mid: Vec2 = {
    x: root.x + Math.cos(jointAngle) * len1,
    y: root.y + Math.sin(jointAngle) * len1,
  };
  const end: Vec2 =
    rawDist > maxReach
      ? { x: root.x + (dx / rawDist) * maxReach, y: root.y + (dy / rawDist) * maxReach }
      : { x: target.x, y: target.y };

  return [mid, end];
}

export function moveAuraColor(move: MoveId | null): string {
  if (move === 'oshi') return SUMO_PALETTE.vermilion;
  if (move === 'yori') return '#235a58';
  if (move === 'hataki') return '#b0862e';
  return SUMO_PALETTE.vermilion;
}

type PoseSpec = {
  x: number;
  y?: number;
  facing: 1 | -1;
  pelvisY: number;
  /** Forward torso lean in radians (+ leans toward facing direction). */
  lean: number;
  bodyTilt?: number;
  depth?: number;
  /** Foot positions relative to x (in facing direction: + = front foot, - = rear foot). */
  footNear: Vec2;
  footFar: Vec2;
  /** Hand targets relative to chest (in facing space: x = forward, y = up). */
  handNear: Vec2;
  handFar: Vec2;
  /** Elbow bend hint (+1 elbows down/natural, -1 elbows flared high). */
  elbowDirNear?: 1 | -1;
  elbowDirFar?: 1 | -1;
  handMode?: 'palm' | 'fist' | 'grip';
  expression?: 'calm' | 'fierce' | 'strained';
  headTilt?: number;
  aura?: number;
  auraColor?: string;
};

/** Constructs a coherent anatomical Rikishi skeleton from high-level biomechanical intent. */
function buildSkeleton(spec: PoseSpec): RikishiSkeleton {
  const f = spec.facing;
  const baseY = spec.y ?? 0;
  const pelvis: Vec2 = { x: spec.x, y: baseY + spec.pelvisY };

  // Spine rises from pelvis along `lean` angle
  const torsoLen = 0.56;
  const chest: Vec2 = {
    x: pelvis.x + f * Math.sin(spec.lean) * torsoLen,
    y: pelvis.y + Math.cos(spec.lean) * torsoLen,
  };
  const neck: Vec2 = {
    x: chest.x + f * Math.sin(spec.lean * 0.85) * 0.16,
    y: chest.y + Math.cos(spec.lean * 0.85) * 0.16,
  };
  const head: Vec2 = {
    x: neck.x + f * Math.sin(spec.lean * 0.55) * 0.16,
    y: neck.y + Math.cos(spec.lean * 0.55) * 0.16,
  };

  // Hips offset slightly front/back along stance line
  const hipNear: Vec2 = { x: pelvis.x - f * 0.08, y: pelvis.y - 0.05 };
  const hipFar: Vec2 = { x: pelvis.x + f * 0.1, y: pelvis.y - 0.03 };

  const footNearTarget: Vec2 = { x: spec.x + f * spec.footNear.x, y: baseY + spec.footNear.y };
  const footFarTarget: Vec2 = { x: spec.x + f * spec.footFar.x, y: baseY + spec.footFar.y };

  // Knees bend FORWARD (+f) naturally!
  const thighLen = 0.42;
  const shinLen = 0.41;
  const kneeBend: 1 | -1 = f === 1 ? 1 : -1;
  const [kneeNear, ankleNear] = solve2BoneIK(hipNear, footNearTarget, thighLen, shinLen, kneeBend);
  const [kneeFar, ankleFar] = solve2BoneIK(hipFar, footFarTarget, thighLen, shinLen, kneeBend);

  const toeNear: Vec2 = {
    x: ankleNear.x + f * 0.16,
    y: Math.max(baseY + 0.01, ankleNear.y - 0.02),
  };
  const toeFar: Vec2 = {
    x: ankleFar.x + f * 0.16,
    y: Math.max(baseY + 0.01, ankleFar.y - 0.02),
  };

  // Shoulders offset naturally from chest
  const shNear: Vec2 = { x: chest.x - f * 0.1, y: chest.y + 0.02 };
  const shFar: Vec2 = { x: chest.x + f * 0.12, y: chest.y + 0.04 };

  const handNearTarget: Vec2 = {
    x: chest.x + f * spec.handNear.x,
    y: chest.y + spec.handNear.y,
  };
  const handFarTarget: Vec2 = {
    x: chest.x + f * spec.handFar.x,
    y: chest.y + spec.handFar.y,
  };

  // Elbows bend DOWNWARD (-f) naturally!
  const upperArmLen = 0.34;
  const forearmLen = 0.32;
  const naturalElbow: 1 | -1 = f === 1 ? -1 : 1;
  const ebNear = (naturalElbow * (spec.elbowDirNear ?? 1)) as 1 | -1;
  const ebFar = (naturalElbow * (spec.elbowDirFar ?? 1)) as 1 | -1;

  const [elbowNear, wristNear] = solve2BoneIK(shNear, handNearTarget, upperArmLen, forearmLen, ebNear);
  const [elbowFar, wristFar] = solve2BoneIK(shFar, handFarTarget, upperArmLen, forearmLen, ebFar);

  return {
    facing: f,
    bodyTilt: spec.bodyTilt ?? 0,
    depth: spec.depth ?? 0,
    pelvis,
    chest,
    neck,
    head,
    headTilt: spec.headTilt ?? spec.lean * 0.28,
    armFar: [shFar, elbowFar, wristFar],
    armNear: [shNear, elbowNear, wristNear],
    legFar: [hipFar, kneeFar, ankleFar, toeFar],
    legNear: [hipNear, kneeNear, ankleNear, toeNear],
    handMode: spec.handMode ?? 'palm',
    expression: spec.expression ?? 'fierce',
    aura: spec.aura ?? 0,
    auraColor: spec.auraColor ?? SUMO_PALETTE.vermilion,
  };
}

/** Smoothly interpolates two skeletons so transitions between poses feel fluid and weighty. */
export function lerpSkeleton(a: RikishiSkeleton, b: RikishiSkeleton, t: number): RikishiSkeleton {
  const k = Math.max(0, Math.min(1, t));
  const lv = (p: Vec2, q: Vec2): Vec2 => ({ x: p.x + (q.x - p.x) * k, y: p.y + (q.y - p.y) * k });
  const lf = (u: number, v: number) => u + (v - u) * k;

  return {
    facing: b.facing,
    bodyTilt: lf(a.bodyTilt, b.bodyTilt),
    depth: lf(a.depth, b.depth),
    pelvis: lv(a.pelvis, b.pelvis),
    chest: lv(a.chest, b.chest),
    neck: lv(a.neck, b.neck),
    head: lv(a.head, b.head),
    headTilt: lf(a.headTilt, b.headTilt),
    armFar: [lv(a.armFar[0], b.armFar[0]), lv(a.armFar[1], b.armFar[1]), lv(a.armFar[2], b.armFar[2])],
    armNear: [lv(a.armNear[0], b.armNear[0]), lv(a.armNear[1], b.armNear[1]), lv(a.armNear[2], b.armNear[2])],
    legFar: [
      lv(a.legFar[0], b.legFar[0]),
      lv(a.legFar[1], b.legFar[1]),
      lv(a.legFar[2], b.legFar[2]),
      lv(a.legFar[3], b.legFar[3]),
    ],
    legNear: [
      lv(a.legNear[0], b.legNear[0]),
      lv(a.legNear[1], b.legNear[1]),
      lv(a.legNear[2], b.legNear[2]),
      lv(a.legNear[3], b.legNear[3]),
    ],
    handMode: b.handMode,
    expression: b.expression,
    aura: lf(a.aura, b.aura),
    auraColor: b.auraColor,
  };
}

export function choreographUkiyoFrame(
  state: SumoGameState,
  time: number,
  shikoCharge: number,
  clapAnim: number,
  saltAnim: number,
  stompImpact: number,
): UkiyoFrame {
  const breath = Math.sin(time * 2.1);

  const gyoji: GyojiState = {
    x: 0,
    gunbaiAngle: 0,
    excitement: 0,
    crouch: 0.1,
  };

  const fx: StageFxCue = {
    speedLines: 0,
    calligraphy: '',
    calligraphyAlpha: 0,
    calligraphyColor: SUMO_PALETTE.vermilion,
    camZoom: 1.0,
    camPanX: 0,
    camPanY: 0,
    slash: { kind: 'none', intensity: 0, x: 0, y: 1.0, dir: 1, color: SUMO_PALETTE.vermilion },
  };

  // Base poised koshi-wari specs
  const makeReady = (x: number, facing: 1 | -1, b: number): PoseSpec => ({
    x,
    facing,
    pelvisY: 0.65 + b * 0.015,
    lean: 0.16 + b * 0.02,
    footNear: { x: -0.28, y: 0.04 },
    footFar: { x: 0.28, y: 0.08 },
    handNear: { x: 0.28, y: -0.22 },
    handFar: { x: 0.44, y: -0.14 },
    handMode: 'palm',
    expression: 'calm',
  });

  // 1. TITLE: Ceremonial face-off
  if (state.mode === 'title') {
    return {
      player: buildSkeleton(makeReady(-1.02, 1, breath)),
      opponent: buildSkeleton(makeReady(1.02, -1, -breath)),
      opponentVisible: true,
      gyoji,
      fx,
    };
  }

  // 2. RITUAL 1: Chirichōzu & Purifying Salt
  if (state.mode === 'ritual_salt') {
    const pSpec = makeReady(-0.98, 1, breath);
    const oSpec = makeReady(1.12, -1, -breath);

    if (saltAnim < 0.98) {
      const release = Math.max(0, Math.min(1, (saltAnim - 0.18) / 0.52));
      pSpec.pelvisY = 0.68 + release * 0.08;
      pSpec.lean = 0.25 - release * 0.22;
      // Right/near arm scoops low then arcs high casting salt!
      pSpec.handNear = {
        x: 0.12 + release * 0.46,
        y: -0.32 + release * 0.78,
      };
      pSpec.handFar = { x: 0.3, y: -0.24 };
      fx.slash = {
        kind: 'salt',
        intensity: Math.sin(Math.min(1, saltAnim) * Math.PI),
        x: -0.42,
        y: 1.32,
        dir: 1,
        color: '#fbfdf9',
      };
      fx.calligraphy = '清';
      fx.calligraphyAlpha = Math.sin(Math.min(1, saltAnim) * Math.PI) * 0.65;
      fx.calligraphyColor = '#5d6b53';
    } else if (clapAnim < 0.98) {
      const clap = Math.sin(Math.min(1, clapAnim / 0.4) * Math.PI);
      const open = Math.max(0, Math.min(1, (clapAnim - 0.36) / 0.48));
      const settle = 1 - Math.max(0, (clapAnim - 0.84) / 0.16);
      const wing = open * settle;
      pSpec.pelvisY = 0.62;
      pSpec.lean = 0.1;
      pSpec.handNear = { x: 0.36 * clap - 0.42 * wing + 0.24 * (1 - clap - wing), y: 0.06 * clap + 0.12 * wing - 0.2 * (1 - clap - wing) };
      pSpec.handFar = { x: 0.38 * clap + 0.56 * wing + 0.34 * (1 - clap - wing), y: 0.06 * clap + 0.12 * wing - 0.18 * (1 - clap - wing) };
    }

    return {
      player: buildSkeleton(pSpec),
      opponent: buildSkeleton(oSpec),
      opponentVisible: true,
      gyoji,
      fx,
    };
  }

  // 3. RITUAL 2: Authentic Shiko Stomp
  //    Deep koshi-wari -> weight shifts onto planted rear foot -> front leg sweeps HIGH
  //    into the sky with torso counter-tilted -> vertical drive down into clay!
  if (state.mode === 'ritual_shiko') {
    const lift = shikoCharge;
    const isLeft = state.shiko.foot === 'left';
    const facing: 1 | -1 = isLeft ? 1 : -1;

    const pSpec: PoseSpec = {
      x: -facing * lift * 0.2,
      facing,
      pelvisY: 0.62 + lift * 0.22 - stompImpact * 0.08,
      lean: 0.14 - lift * 0.34 + stompImpact * 0.12,
      // Planted support foot stays anchored solidly on clay while lifting foot sweeps HIGH!
      footNear: { x: -0.22 + lift * 0.12, y: 0.04 },
      footFar: { x: 0.36 + lift * 0.34, y: 0.06 + lift * 0.96 },
      handNear: { x: -0.18 - lift * 0.26, y: -0.22 + lift * 0.34 },
      handFar: { x: 0.34 + lift * 0.16, y: -0.24 + lift * 0.42 },
      handMode: 'palm',
      expression: lift > 0.35 || stompImpact > 0.2 ? 'fierce' : 'calm',
    };

    if (stompImpact > 0.05) {
      fx.speedLines = stompImpact * 0.65;
      fx.calligraphy = '踏';
      fx.calligraphyAlpha = stompImpact * 0.85;
      fx.calligraphyColor = SUMO_PALETTE.ink;
      fx.slash = {
        kind: 'shiko',
        intensity: stompImpact,
        x: facing * 0.22,
        y: 0.08,
        dir: facing,
        color: SUMO_PALETTE.ink,
      };
    }

    gyoji.x = -facing * 0.55;
    gyoji.gunbaiAngle = 0;

    return {
      player: buildSkeleton(pSpec),
      opponent: buildSkeleton(makeReady(1.6, -1, 0)),
      opponentVisible: false,
      gyoji,
      fx,
    };
  }

  // 4. RITUAL 3: TACHIAI — Iconic low fists-to-clay crouch across the white shikiri-sen!
  if (state.mode === 'tachiai') {
    const isGo = state.tachiai.phase === 'hakkeyoi';
    const isMatta = state.tachiai.phase === 'matta';
    const tense = isGo ? 1 : 0.4 + Math.sin(time * 5.0) * 0.14;

    const crouchSpec = (x: number, facing: 1 | -1, recoil: boolean): PoseSpec => ({
      x: recoil ? x - facing * 0.24 : x,
      facing,
      pelvisY: recoil ? 0.68 : 0.56,
      lean: recoil ? 0.32 : 0.96 + tense * 0.06,
      footNear: { x: -0.34, y: 0.04 },
      footFar: { x: -0.04, y: 0.08 },
      // Both fists planted RIGHT ON THE CLAY behind the white shikiri-sen!
      handNear: { x: 0.06, y: -0.58 },
      handFar: { x: 0.24, y: -0.54 },
      handMode: 'fist',
      expression: 'fierce',
      headTilt: recoil ? 0 : -0.32,
      aura: isGo ? 0.7 : 0,
      auraColor: SUMO_PALETTE.vermilion,
    });

    gyoji.x = 0;
    gyoji.crouch = isGo ? 0.05 : 0.32;
    gyoji.excitement = isGo ? 1 : 0.2;
    gyoji.gunbaiAngle = isMatta ? -0.45 : isGo ? 0.02 : 0;

    fx.camZoom = isGo ? 1.09 : 1.04;
    fx.camPanY = -0.05;
    if (isGo) {
      fx.speedLines = 0.72;
      fx.calligraphy = '発';
      fx.calligraphyAlpha = 0.75;
    }

    // Distance = 2.04m so fists land cleanly behind the two shikiri-sen lines with wide open air between heads!
    return {
      player: buildSkeleton(crouchSpec(-1.02, 1, isMatta)),
      opponent: buildSkeleton(crouchSpec(1.02, -1, false)),
      opponentVisible: true,
      gyoji,
      fx,
    };
  }

  // 5. BANZUKE: Dignified Yokozuna Dohyo-iri victory posture
  if (state.mode === 'banzuke') {
    const pSpec: PoseSpec = {
      x: 0,
      facing: 1,
      pelvisY: 0.74 + breath * 0.015,
      lean: 0.04,
      footNear: { x: -0.28, y: 0.04 },
      footFar: { x: 0.28, y: 0.07 },
      handNear: { x: -0.48, y: 0.08 },
      handFar: { x: 0.56, y: 0.1 },
      handMode: 'palm',
      expression: 'calm',
    };
    gyoji.x = -0.75;
    gyoji.excitement = 0.8;
    gyoji.gunbaiAngle = -0.7;
    return {
      player: buildSkeleton(pSpec),
      opponent: buildSkeleton(makeReady(1.6, -1, 0)),
      opponentVisible: false,
      gyoji,
      fx,
    };
  }

  // 6. ACTIVE BOUT, KIMARITE FREEZE, & BOUT RESULT
  const center = state.bout.ringPos * 0.88;
  const sway = Math.sin(time * 3.4) * 0.025;

  const pSpec: PoseSpec = {
    x: center - 0.76,
    facing: 1,
    pelvisY: 0.66 + breath * 0.015,
    lean: 0.34,
    footNear: { x: -0.32, y: 0.04 },
    footFar: { x: 0.24, y: 0.08 },
    handNear: { x: 0.42, y: -0.02 + sway },
    handFar: { x: 0.54, y: 0.08 - sway },
    handMode: 'palm',
    expression: 'fierce',
  };

  const oSpec: PoseSpec = {
    x: center + 0.76,
    facing: -1,
    pelvisY: 0.66 - breath * 0.015,
    lean: 0.34,
    footNear: { x: -0.32, y: 0.04 },
    footFar: { x: 0.24, y: 0.08 },
    handNear: { x: 0.42, y: -0.02 - sway },
    handFar: { x: 0.54, y: 0.08 + sway },
    handMode: 'palm',
    expression: 'fierce',
  };

  gyoji.x = Math.max(-0.65, Math.min(0.65, center * 0.55));
  gyoji.crouch = 0.24;
  gyoji.gunbaiAngle = -Math.max(-0.55, Math.min(0.55, state.bout.ringPos * 0.65));

  fx.camPanX = center * 0.28;

  if (state.mode === 'bout') {
    const bout = state.bout;
    const prog = Math.min(1, bout.phaseTimer / Math.max(0.08, bout.phaseDuration));

    if (bout.phase === 'telegraph' && bout.opponentMove) {
      const wind = Math.sin(prog * Math.PI * 0.5);
      const pulse = 0.5 + 0.5 * Math.sin(time * 14);
      oSpec.aura = 0.35 + wind * 0.48 + pulse * 0.15;
      oSpec.auraColor = moveAuraColor(bout.opponentMove);

      if (bout.opponentMove === 'oshi') {
        // Oshi wind-up: coils elbows tightly back to ribs, chest forward, palms ready to explode!
        oSpec.x += 0.18 * wind;
        oSpec.pelvisY = 0.63;
        oSpec.lean = 0.44 * wind;
        oSpec.handNear = { x: 0.04, y: -0.06 };
        oSpec.handFar = { x: 0.12, y: 0.06 };
        oSpec.handMode = 'palm';
      } else if (bout.opponentMove === 'yori') {
        // Yori wind-up: sinks VERY low, extends wide scooping arms toward belt!
        oSpec.pelvisY = 0.54;
        oSpec.lean = 0.62 * wind;
        oSpec.handNear = { x: 0.56, y: -0.28 };
        oSpec.handFar = { x: 0.62, y: -0.18 };
        oSpec.handMode = 'grip';
      } else {
        // Hataki wind-up: rises light on toes, shifts back slightly, raises lead palm HIGH overhead!
        oSpec.x += 0.14 * wind;
        oSpec.pelvisY = 0.76;
        oSpec.lean = 0.08;
        oSpec.handNear = { x: 0.26, y: 0.58 * wind };
        oSpec.handFar = { x: 0.36, y: 0.04 };
        oSpec.elbowDirNear = -1;
        oSpec.handMode = 'palm';
      }
    } else if (bout.phase === 'resolve') {
      const snap = Math.sin(Math.min(1, prog * 1.45) * Math.PI * 0.5);
      const fade = Math.max(0, 1 - prog);
      const winMove = bout.lastWinningMove ?? 'oshi';

      if (bout.lastOutcome === 'win' || bout.lastOutcome === 'lose') {
        const playerWon = bout.lastOutcome === 'win';
        const atk = playerWon ? pSpec : oSpec;
        const def = playerWon ? oSpec : pSpec;
        const dir: 1 | -1 = playerWon ? 1 : -1;

        atk.aura = fade * 0.55;
        atk.auraColor = moveAuraColor(winMove);
        def.expression = 'strained';
        fx.speedLines = fade * 0.75;
        fx.camZoom = 1 + fade * 0.07;

        if (winMove === 'oshi') {
          // Explosive alternating tsuppari palm thrust — hands meet chest with zero body overlap!
          const alt = Math.sin(prog * Math.PI * 3);
          atk.x = center - dir * 0.62;
          def.x = center + dir * 0.88;
          atk.lean = 0.52 * snap;
          atk.handNear = { x: 0.64 + alt * 0.08, y: 0.08 };
          atk.handFar = { x: 0.64 - alt * 0.08, y: 0.14 };
          // Defender rocks back off heels with arms flying wide
          def.pelvisY = 0.72;
          def.lean = -0.38 * snap;
          def.handNear = { x: -0.18, y: 0.32 };
          def.handFar = { x: 0.28, y: 0.44 };
          fx.calligraphy = '推';
          fx.calligraphyAlpha = fade * 0.9;
          fx.calligraphyColor = SUMO_PALETTE.vermilion;
          fx.slash = { kind: 'oshi', intensity: fade, x: center + dir * 0.12, y: 1.15, dir, color: SUMO_PALETTE.vermilion };
        } else if (winMove === 'yori') {
          // Belt grip hoist — attacker sinks & lifts, defender tilted off balance!
          atk.x = center - dir * 0.54;
          def.x = center + dir * 0.62;
          atk.depth = 0.5;
          def.depth = -0.5;
          atk.pelvisY = 0.6;
          atk.lean = 0.42;
          atk.handNear = { x: 0.56, y: -0.18 };
          atk.handFar = { x: 0.6, y: -0.1 };
          atk.handMode = 'grip';
          def.y = 0.16 * snap;
          def.bodyTilt = dir * 0.24 * snap;
          def.lean = -0.2;
          def.footNear = { x: -0.16, y: 0.12 * snap };
          def.footFar = { x: 0.22, y: 0.18 * snap };
          fx.calligraphy = '寄';
          fx.calligraphyAlpha = fade * 0.9;
          fx.calligraphyColor = '#235a58';
          fx.slash = { kind: 'yori', intensity: fade, x: center, y: 1.05, dir, color: '#235a58' };
        } else {
          // Graceful Hatakikomi sidestep slap-down!
          atk.x = center - dir * 0.56;
          def.x = center + dir * 0.44;
          atk.depth = 0.8;
          def.depth = -0.8;
          atk.pelvisY = 0.76;
          atk.lean = 0.12;
          atk.handNear = { x: 0.52, y: -0.05 };
          atk.handFar = { x: -0.2, y: 0.16 };
          def.pelvisY = 0.52;
          def.lean = 0.98 * snap;
          def.handNear = { x: 0.42, y: -0.45 };
          def.handFar = { x: 0.52, y: -0.38 };
          fx.calligraphy = '避';
          fx.calligraphyAlpha = fade * 0.9;
          fx.calligraphyColor = '#b0862e';
          fx.slash = { kind: 'hataki', intensity: fade, x: center + dir * 0.1, y: 1.15, dir, color: '#b0862e' };
        }
      } else {
        // Locked even deadlock
        pSpec.x = center - 0.68;
        oSpec.x = center + 0.68;
        pSpec.lean = 0.44;
        oSpec.lean = 0.44;
        pSpec.handNear = { x: 0.54, y: 0.06 };
        oSpec.handNear = { x: 0.54, y: 0.06 };
        fx.calligraphy = '拮';
        fx.calligraphyAlpha = fade * 0.55;
        fx.calligraphyColor = SUMO_PALETTE.ink;
      }
    }
  }

  // 7. DECISIVE KIMARITE FINISH TABLEAU (Museum-grade Edo Woodblock Freeze-Frame!)
  if ((state.mode === 'kimarite_freeze' || state.mode === 'bout_result') && state.finish) {
    const { winner, kimarite } = state.finish;
    const playerWon = winner === 'player';
    const victor = playerWon ? pSpec : oSpec;
    const loser = playerWon ? oSpec : pSpec;
    const dir: 1 | -1 = playerWon ? 1 : -1;

    victor.aura = 0.45;
    victor.auraColor = SUMO_PALETTE.vermilion;
    loser.expression = 'strained';

    gyoji.x = -dir * 0.45;
    gyoji.excitement = 1;
    gyoji.gunbaiAngle = playerWon ? -0.95 : 0.95;

    fx.camZoom = 1.08;
    fx.speedLines = state.mode === 'kimarite_freeze' ? 0.88 : 0.22;

    if (kimarite === 'oshidashi') {
      victor.x = dir * 0.52;
      victor.lean = 0.54;
      victor.handNear = { x: 0.68, y: 0.1 };
      victor.handFar = { x: 0.65, y: 0.18 };

      loser.x = dir * 1.56;
      loser.pelvisY = 0.74;
      loser.lean = -0.56;
      loser.bodyTilt = dir * 0.22;
      loser.footFar = { x: 0.35, y: 0.16 };
      loser.handNear = { x: -0.22, y: 0.42 };
      loser.handFar = { x: 0.34, y: 0.48 };
      fx.slash = { kind: 'oshi', intensity: 0.9, x: dir * 0.95, y: 1.15, dir, color: SUMO_PALETTE.vermilion };
    } else if (kimarite === 'yorikiri') {
      victor.x = dir * 0.8;
      victor.depth = 0.5;
      victor.pelvisY = 0.62;
      victor.lean = 0.44;
      victor.handNear = { x: 0.58, y: -0.14 };
      victor.handFar = { x: 0.62, y: -0.06 };
      victor.handMode = 'grip';

      loser.x = dir * 1.54;
      loser.depth = -0.5;
      loser.pelvisY = 0.76;
      loser.lean = -0.48;
      loser.bodyTilt = dir * 0.18;
      loser.handNear = { x: 0.1, y: 0.36 };
      loser.handFar = { x: 0.38, y: 0.42 };
      fx.slash = { kind: 'yori', intensity: 0.9, x: dir * 1.15, y: 1.05, dir, color: '#235a58' };
    } else if (kimarite === 'uwatenage') {
      // Iconic sweeping mid-air overarm throw!
      victor.x = -dir * 0.25;
      victor.depth = 0.6;
      victor.pelvisY = 0.62;
      victor.lean = 0.32;
      victor.handNear = { x: 0.58, y: 0.35 };
      victor.handFar = { x: 0.42, y: -0.1 };
      victor.handMode = 'grip';

      loser.x = dir * 0.85;
      loser.y = 0.58;
      loser.depth = -0.6;
      loser.pelvisY = 0.68;
      loser.bodyTilt = dir * 1.18;
      loser.lean = -0.18;
      loser.footNear = { x: -0.24, y: 0.25 };
      loser.footFar = { x: 0.26, y: 0.34 };
      loser.handNear = { x: 0.45, y: 0.38 };
      loser.handFar = { x: -0.35, y: 0.32 };
      fx.slash = { kind: 'yori', intensity: 0.95, x: dir * 0.3, y: 1.25, dir, color: SUMO_PALETTE.vermilion };
    } else {
      // Hatakikomi slap-down: victor poised tall aside, loser plunging hands-first to clay!
      victor.x = -dir * 0.45;
      victor.depth = 0.8;
      victor.pelvisY = 0.78;
      victor.lean = 0.1;
      victor.handNear = { x: 0.58, y: -0.02 };
      victor.handFar = { x: -0.28, y: 0.14 };

      loser.x = dir * 0.52;
      loser.y = -0.08;
      loser.depth = -0.8;
      loser.pelvisY = 0.48;
      loser.lean = 1.22;
      loser.handNear = { x: 0.35, y: -0.45 };
      loser.handFar = { x: 0.48, y: -0.4 };
      fx.slash = { kind: 'hataki', intensity: 0.92, x: dir * 0.1, y: 1.05, dir, color: '#b0862e' };
    }
  }

  return {
    player: buildSkeleton(pSpec),
    opponent: buildSkeleton(oSpec),
    opponentVisible: true,
    gyoji,
    fx,
  };
}
