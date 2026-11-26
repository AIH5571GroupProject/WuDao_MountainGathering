/**
 * Edo Nishiki-e (江户套色锦绘) Woodblock Print Canvas Renderer.
 *
 * Uses Path2D + 2-Pass Unified Woodblock Silhouettes so arms, legs, torso,
 * and hands merge into clean, hand-carved ukiyo-e ink linework with zero
 * internal seam boxes or clipping artifacts.
 */

import { SUMO_PALETTE, type OpponentProfile } from './sumoEngine';
import type { GyojiState, RikishiSkeleton, StageFxCue, Vec2 } from './sumoUkiyoPose';

export type UkiyoParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
  kind: 'salt' | 'dust' | 'ink' | 'mote';
};

export type RikishiStyle = {
  skinBase: string;
  skinShadow: string;
  skinHighlight: string;
  mawashiBase: string;
  mawashiTrim: string;
  mawashiDark: string;
  hasTsuna: boolean;
  scale: number;
};

export const PLAYER_STYLE: RikishiStyle = {
  skinBase: '#e2c7a8',
  skinShadow: '#c49f7b',
  skinHighlight: '#f0dec6',
  mawashiBase: '#1f383d', // Edo Ai-iro indigo-pine silk
  mawashiTrim: '#caa756', // Woven gold brocade trim
  mawashiDark: '#132226',
  hasTsuna: false,
  scale: 1.0,
};

export function opponentStyle(opp: OpponentProfile): RikishiStyle {
  if (opp.id === 'raizan') {
    return {
      skinBase: '#d6b18f',
      skinShadow: '#b28460',
      skinHighlight: '#e8cba9',
      mawashiBase: '#8c3b28', // Kakishibu persimmon rust-red
      mawashiTrim: '#e0cb9c',
      mawashiDark: '#572215',
      hasTsuna: false,
      scale: 0.99,
    };
  }
  if (opp.id === 'matsukaze') {
    return {
      skinBase: '#cea786',
      skinShadow: '#a87c5b',
      skinHighlight: '#e1c1a2',
      mawashiBase: '#2c3d4f', // Deep iron-slate indigo
      mawashiTrim: '#9eb6c2',
      mawashiDark: '#182430',
      hasTsuna: false,
      scale: 1.04,
    };
  }
  return {
    skinBase: '#cca483',
    skinShadow: '#9e7251',
    skinHighlight: '#e0bfa0',
    mawashiBase: '#1d201d', // Lacquered black-gold + white Yokozuna tsuna
    mawashiTrim: '#d1ad56',
    mawashiDark: '#0f120f',
    hasTsuna: true,
    scale: 1.08,
  };
}

/** Bake a tileable washi-paper + subtle horizontal sakura-woodblock grain pattern once. */
export function createWashiPattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  const tile = document.createElement('canvas');
  tile.width = 160;
  tile.height = 160;
  const g = tile.getContext('2d');
  if (!g) return null;

  for (let y = 0; y < 160; y += 3) {
    const a = 0.011 + (Math.sin(y * 0.45) * 0.5 + 0.5) * 0.014;
    g.fillStyle = `rgba(58, 52, 38, ${a.toFixed(4)})`;
    g.fillRect(0, y, 160, 1);
  }
  let seed = 0x51a7f3;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  for (let i = 0; i < 95; i += 1) {
    const x = rand() * 160;
    const y = rand() * 160;
    const len = 6 + rand() * 15;
    const ang = (rand() - 0.5) * 1.4;
    g.strokeStyle = rand() > 0.5 ? 'rgba(255, 255, 248, 0.14)' : 'rgba(72, 66, 48, 0.04)';
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    g.stroke();
  }
  return ctx.createPattern(tile, 'repeat');
}

type CameraMap = {
  sx: (wx: number) => number;
  sy: (wy: number) => number;
  unit: number;
  width: number;
  height: number;
  floorY: number;
};

/** Builds a smooth tapered muscular capsule Path2D between two joints. */
function makeCapsulePath(p0: Vec2, p1: Vec2, r0: number, r1: number): Path2D {
  const path = new Path2D();
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const angle = Math.atan2(dy, dx);
  const mx = (p0.x + p1.x) * 0.5;
  const my = (p0.y + p1.y) * 0.5;
  const rMid = (r0 + r1) * 0.55;

  path.arc(p0.x, p0.y, r0, angle + Math.PI * 0.5, angle + Math.PI * 1.5);
  path.quadraticCurveTo(mx - nx * rMid, my - ny * rMid, p1.x - nx * r1, p1.y - ny * r1);
  path.arc(p1.x, p1.y, r1, angle - Math.PI * 0.5, angle + Math.PI * 0.5);
  path.quadraticCurveTo(mx + nx * rMid, my + ny * rMid, p0.x + nx * r0, p0.y + ny * r0);
  path.closePath();
  return path;
}

/** Builds a smooth foot silhouette Path2D. */
function makeFootPath(ankle: Vec2, toe: Vec2, unit: number, pad = 0): Path2D {
  const dx = toe.x - ankle.x;
  const dy = toe.y - ankle.y;
  const len = Math.max(unit * 0.145, Math.hypot(dx, dy));
  const ang = Math.atan2(dy, dx);
  const ux = Math.cos(ang);
  const uy = Math.sin(ang);
  const nx = -uy;
  const ny = ux;

  const pt = (f: number, n: number): Vec2 => ({
    x: ankle.x + ux * f + nx * n,
    y: ankle.y + uy * f + ny * n,
  });

  const pHeelTop = pt(-unit * 0.055 - pad, -unit * 0.032 - pad);
  const pArchTop = pt(len * 0.48, -unit * 0.048 - pad);
  const pToeTip = pt(len + unit * 0.02 + pad, unit * 0.008);
  const pSoleFront = pt(len * 0.78, unit * 0.046 + pad);
  const pHeelBot = pt(-unit * 0.06 - pad, unit * 0.044 + pad);

  const path = new Path2D();
  path.moveTo(pHeelTop.x, pHeelTop.y);
  path.quadraticCurveTo(pArchTop.x, pArchTop.y, pToeTip.x, pToeTip.y);
  path.quadraticCurveTo(pToeTip.x, pSoleFront.y, pSoleFront.x, pSoleFront.y);
  path.lineTo(pHeelBot.x, pHeelBot.y);
  path.quadraticCurveTo(pHeelBot.x - ux * unit * 0.03, ankle.y, pHeelTop.x, pHeelTop.y);
  path.closePath();
  return path;
}

/** Builds an expressive palm or fist Path2D. */
function makeHandPath(
  wrist: Vec2,
  elbow: Vec2,
  facing: 1 | -1,
  unit: number,
  mode: 'palm' | 'fist' | 'grip',
  pad = 0,
): Path2D {
  const ang = Math.atan2(wrist.y - elbow.y, wrist.x - elbow.x);
  const ux = Math.cos(ang);
  const uy = Math.sin(ang);
  const nx = -uy;
  const ny = ux;
  const pt = (f: number, n: number): Vec2 => ({
    x: wrist.x + ux * f + nx * n,
    y: wrist.y + uy * f + ny * n,
  });

  const path = new Path2D();
  if (mode === 'fist' || mode === 'grip') {
    const c = pt(unit * 0.042, 0);
    path.ellipse(c.x, c.y, unit * 0.068 + pad, unit * 0.058 + pad, ang, 0, Math.PI * 2);
  } else {
    const p0 = pt(-unit * 0.015, -unit * 0.048 - pad);
    const c1 = pt(unit * 0.055, -unit * 0.072 - pad);
    const p1 = pt(unit * 0.115 + pad, -unit * 0.032 - pad * 0.5);
    const c2 = pt(unit * 0.135 + pad, 0);
    const p2 = pt(unit * 0.108 + pad, unit * 0.042 + pad * 0.5);
    const c3 = pt(unit * 0.048, unit * 0.064 + pad);
    const p3 = pt(-unit * 0.015, unit * 0.044 + pad);
    path.moveTo(p0.x, p0.y);
    path.quadraticCurveTo(c1.x, c1.y, p1.x, p1.y);
    path.quadraticCurveTo(c2.x, c2.y, p2.x, p2.y);
    path.quadraticCurveTo(c3.x, c3.y, p3.x, p3.y);
    path.closePath();

    // Thumb contour merged cleanly
    const tCenter = pt(unit * 0.025, -facing * (unit * 0.058 + pad * 0.3));
    path.moveTo(tCenter.x, tCenter.y);
    path.ellipse(tCenter.x, tCenter.y, unit * 0.044 + pad, unit * 0.024 + pad * 0.8, ang - facing * 0.45, 0, Math.PI * 2);
  }
  return path;
}

/**
 * 2-Pass Unified Woodblock Leg Renderer:
 * Pass 1 draws an expanded sumi-ink silhouette behind thigh + calf + foot;
 * Pass 2 fills smooth flesh tone + underside woodblock shading on top;
 * Pass 3 adds a delicate hand-inked knee fold line.
 * Result: zero internal boxy seam cuts!
 */
function drawUnifiedLeg(
  ctx: CanvasRenderingContext2D,
  pts: [Vec2, Vec2, Vec2, Vec2],
  unit: number,
  fill: string,
  shadow: string,
  ink: string,
  lineW: number,
) {
  const [hip, knee, ankle, toe] = pts;
  const rHip = unit * 0.168;
  const rKnee = unit * 0.116;
  const rAnkle = unit * 0.074;

  // Pass 1: Expanded unified ink silhouette
  ctx.fillStyle = ink;
  ctx.fill(makeCapsulePath(hip, knee, rHip + lineW, rKnee + lineW));
  ctx.fill(makeCapsulePath(knee, ankle, rKnee + lineW, rAnkle + lineW));
  ctx.fill(makeFootPath(ankle, toe, unit, lineW));

  // Pass 2: Inner flat woodblock flesh fill + clipped shadow band
  const thighPath = makeCapsulePath(hip, knee, rHip, rKnee);
  const calfPath = makeCapsulePath(knee, ankle, rKnee, rAnkle);
  const footPath = makeFootPath(ankle, toe, unit, 0);

  ctx.fillStyle = fill;
  ctx.fill(thighPath);
  ctx.fill(calfPath);
  ctx.fill(footPath);

  // Subtle underside calf/thigh shading clipped strictly via Path2D
  ctx.save();
  ctx.clip(calfPath);
  ctx.fillStyle = shadow;
  ctx.globalAlpha = 0.42;
  ctx.fillRect(
    Math.min(knee.x, ankle.x) - rKnee * 1.4,
    Math.min(knee.y, ankle.y) + (Math.abs(ankle.y - knee.y) * 0.25),
    Math.abs(ankle.x - knee.x) + rKnee * 2.8,
    Math.abs(ankle.y - knee.y) + rKnee * 1.5,
  );
  ctx.restore();

  // Pass 3: Delicate ukiyo-e knee crease tick
  ctx.strokeStyle = ink;
  ctx.lineWidth = lineW * 0.65;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.arc(knee.x, knee.y, rKnee * 0.52, Math.PI * 0.15, Math.PI * 0.65);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** 2-Pass Unified Woodblock Arm Renderer (zero elbow/wrist seam boxes!). */
function drawUnifiedArm(
  ctx: CanvasRenderingContext2D,
  pts: [Vec2, Vec2, Vec2],
  facing: 1 | -1,
  unit: number,
  mode: 'palm' | 'fist' | 'grip',
  fill: string,
  shadow: string,
  ink: string,
  lineW: number,
) {
  const [sh, el, wr] = pts;
  const rSh = unit * 0.132;
  const rEl = unit * 0.098;
  const rWr = unit * 0.068;

  // Pass 1: Unified expanded ink silhouette
  ctx.fillStyle = ink;
  ctx.fill(makeCapsulePath(sh, el, rSh + lineW, rEl + lineW));
  ctx.fill(makeCapsulePath(el, wr, rEl + lineW, rWr + lineW));
  ctx.fill(makeHandPath(wr, el, facing, unit, mode, lineW));

  // Pass 2: Smooth flesh fill
  const upperPath = makeCapsulePath(sh, el, rSh, rEl);
  const forePath = makeCapsulePath(el, wr, rEl, rWr);
  const handPath = makeHandPath(wr, el, facing, unit, mode, 0);

  ctx.fillStyle = fill;
  ctx.fill(upperPath);
  ctx.fill(forePath);
  ctx.fill(handPath);

  // Subtle underside arm woodblock shadow clipped via Path2D
  ctx.save();
  ctx.clip(forePath);
  ctx.fillStyle = shadow;
  ctx.globalAlpha = 0.36;
  ctx.fillRect(
    Math.min(el.x, wr.x) - rEl * 1.4,
    (el.y + wr.y) * 0.5,
    Math.abs(wr.x - el.x) + rEl * 2.8,
    rEl * 2.4,
  );
  ctx.restore();

  // Pass 3: Delicate ukiyo-e elbow fold tick
  ctx.strokeStyle = ink;
  ctx.lineWidth = lineW * 0.62;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.52;
  ctx.beginPath();
  ctx.arc(el.x, el.y, rEl * 0.45, Math.PI * 0.6, Math.PI * 1.15);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** Draws a complete Edo Nishiki-e woodblock Rikishi with Path2D clean outlines. */
function drawRikishi(
  ctx: CanvasRenderingContext2D,
  skel: RikishiSkeleton,
  cam: CameraMap,
  style: RikishiStyle,
  time: number,
) {
  const u = cam.unit * style.scale;
  const ink = '#19241a';
  const lineW = Math.max(1.9, u * 0.017);
  const f = skel.facing;

  const mapPt = (p: Vec2): Vec2 => ({ x: cam.sx(p.x), y: cam.sy(p.y) });
  const pelvis = mapPt(skel.pelvis);
  const chest = mapPt(skel.chest);
  const head = mapPt(skel.head);

  const legFar = skel.legFar.map(mapPt) as [Vec2, Vec2, Vec2, Vec2];
  const legNear = skel.legNear.map(mapPt) as [Vec2, Vec2, Vec2, Vec2];
  const armFar = skel.armFar.map(mapPt) as [Vec2, Vec2, Vec2];
  const armNear = skel.armNear.map(mapPt) as [Vec2, Vec2, Vec2];

  ctx.save();
  if (Math.abs(skel.bodyTilt) > 0.002) {
    ctx.translate(pelvis.x, pelvis.y);
    ctx.rotate(skel.bodyTilt);
    ctx.translate(-pelvis.x, -pelvis.y);
  }

  // Telegraph / impact soft radial woodblock wash behind fighter
  if (skel.aura > 0.05) {
    ctx.save();
    const grad = ctx.createRadialGradient(chest.x, chest.y, u * 0.1, chest.x, chest.y, u * 0.85);
    grad.addColorStop(0, skel.auraColor);
    grad.addColorStop(1, 'rgba(233, 236, 223, 0)');
    ctx.globalAlpha = skel.aura * 0.34;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(chest.x, chest.y, u * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 1. FAR ARM (shaded deeper for natural depth)
  drawUnifiedArm(ctx, armFar, f, u, skel.handMode, style.skinShadow, style.skinShadow, ink, lineW * 0.9);

  // 2. FAR LEG
  drawUnifiedLeg(ctx, legFar, u, style.skinShadow, style.skinShadow, ink, lineW * 0.94);

  // 3. SCULPTED TORSO & PROUD SUMO BELLY (using Path2D so outline is 100% pure!)
  const spineDx = chest.x - pelvis.x;
  const spineDy = chest.y - pelvis.y;
  const spineAng = Math.atan2(spineDy, spineDx) + Math.PI * 0.5;
  const spineLen = Math.hypot(spineDx, spineDy);

  ctx.save();
  ctx.translate(pelvis.x, pelvis.y);
  ctx.rotate(spineAng);

  const torsoPath = new Path2D();
  torsoPath.moveTo(-f * u * 0.24, u * 0.04);
  torsoPath.bezierCurveTo(
    -f * u * 0.36, -spineLen * 0.32,
    -f * u * 0.35, -spineLen * 0.82,
    -f * u * 0.15, -spineLen * 1.12,
  );
  torsoPath.quadraticCurveTo(0, -spineLen * 1.22, f * u * 0.16, -spineLen * 1.12);
  torsoPath.bezierCurveTo(
    f * u * 0.32, -spineLen * 0.9,
    f * u * 0.36, -spineLen * 0.5,
    f * u * 0.38, -spineLen * 0.15,
  );
  torsoPath.bezierCurveTo(
    f * u * 0.4, u * 0.08,
    f * u * 0.26, u * 0.16,
    0, u * 0.16,
  );
  torsoPath.quadraticCurveTo(-f * u * 0.2, u * 0.15, -f * u * 0.24, u * 0.04);
  torsoPath.closePath();

  ctx.fillStyle = style.skinBase;
  ctx.fill(torsoPath);

  // Clipped interior woodblock shadow & highlight (never overwrites torsoPath!)
  ctx.save();
  ctx.clip(torsoPath);
  ctx.fillStyle = style.skinShadow;
  ctx.globalAlpha = 0.52;
  ctx.beginPath();
  ctx.ellipse(-f * u * 0.26, -spineLen * 0.42, u * 0.23, spineLen * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = style.skinHighlight;
  ctx.globalAlpha = 0.52;
  ctx.beginPath();
  ctx.ellipse(f * u * 0.12, -spineLen * 0.78, u * 0.15, spineLen * 0.26, f * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Stroke the EXACT torsoPath!
  ctx.strokeStyle = ink;
  ctx.lineWidth = lineW * 1.08;
  ctx.stroke(torsoPath);

  // Delicate Ukiyo-e pectoral & belly fold ink strokes
  ctx.strokeStyle = ink;
  ctx.lineWidth = lineW * 0.62;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.62;
  ctx.beginPath();
  ctx.moveTo(f * u * 0.09, -spineLen * 0.66);
  ctx.quadraticCurveTo(f * u * 0.24, -spineLen * 0.57, f * u * 0.33, -spineLen * 0.63);
  ctx.moveTo(f * u * 0.08, -spineLen * 0.27);
  ctx.quadraticCurveTo(f * u * 0.22, -spineLen * 0.2, f * u * 0.34, -spineLen * 0.26);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // 4. SILK MAWASHI + FOLDED REAR MUSUBI BOW + FRONT SAGARI CORDS
  // Folded Edo rear musubi bow with short hanging tails (not a dark sphere!)
  const bowPath = new Path2D();
  bowPath.moveTo(-f * u * 0.27, -u * 0.07);
  bowPath.lineTo(-f * u * 0.38, -u * 0.11);
  bowPath.quadraticCurveTo(-f * u * 0.43, -u * 0.01, -f * u * 0.37, u * 0.09);
  bowPath.lineTo(-f * u * 0.26, u * 0.06);
  bowPath.closePath();
  ctx.fillStyle = style.mawashiDark;
  ctx.fill(bowPath);
  ctx.strokeStyle = ink;
  ctx.lineWidth = lineW * 0.95;
  ctx.stroke(bowPath);

  // Main wrapped mawashi silk band
  const beltPath = new Path2D();
  beltPath.moveTo(-f * u * 0.29, -u * 0.1);
  beltPath.quadraticCurveTo(0, -u * 0.03, f * u * 0.36, -u * 0.08);
  beltPath.lineTo(f * u * 0.34, u * 0.09);
  beltPath.quadraticCurveTo(0, u * 0.15, -f * u * 0.27, u * 0.08);
  beltPath.closePath();
  ctx.fillStyle = style.mawashiBase;
  ctx.fill(beltPath);
  ctx.strokeStyle = ink;
  ctx.lineWidth = lineW * 1.05;
  ctx.stroke(beltPath);

  // Woven horizontal gold/brocade silk fold line on mawashi
  ctx.beginPath();
  ctx.moveTo(-f * u * 0.25, -u * 0.01);
  ctx.quadraticCurveTo(0, u * 0.05, f * u * 0.32, -u * 0.01);
  ctx.strokeStyle = style.mawashiTrim;
  ctx.lineWidth = lineW * 0.72;
  ctx.stroke();

  // Hanging stiff sagari silk apron cords
  for (let s = 0; s < 5; s += 1) {
    const sx = f * (u * 0.15 + s * u * 0.036);
    const sway = Math.sin(time * 3.5 + s) * u * 0.012;
    ctx.beginPath();
    ctx.moveTo(sx, u * 0.06);
    ctx.quadraticCurveTo(sx + sway, u * 0.17, sx + sway * 1.4, u * 0.25);
    ctx.strokeStyle = ink;
    ctx.lineWidth = lineW * 1.3;
    ctx.stroke();
    ctx.strokeStyle = style.mawashiTrim;
    ctx.lineWidth = lineW * 0.62;
    ctx.stroke();
  }

  // YOKOZUNA SACRED BRAIDED WHITE TSUNA + ZIGZAG SHIDE STREAMERS
  if (style.hasTsuna) {
    ctx.beginPath();
    ctx.moveTo(-f * u * 0.31, -u * 0.13);
    ctx.quadraticCurveTo(0, -u * 0.05, f * u * 0.37, -u * 0.11);
    ctx.strokeStyle = ink;
    ctx.lineWidth = u * 0.11;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.strokeStyle = '#f8f9f1';
    ctx.lineWidth = u * 0.078;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(37, 52, 34, 0.55)';
    ctx.lineWidth = lineW * 0.65;
    for (let k = -3; k <= 3; k += 1) {
      const tx = k * u * 0.095;
      ctx.beginPath();
      ctx.moveTo(tx - u * 0.02, -u * 0.13);
      ctx.lineTo(tx + u * 0.03, -u * 0.06);
      ctx.stroke();
    }

    for (let s = 0; s < 4; s += 1) {
      const sx = -f * u * 0.12 + f * s * u * 0.14;
      const sy = -u * 0.05;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + f * u * 0.035, sy + u * 0.068);
      ctx.lineTo(sx - f * u * 0.025, sy + u * 0.136);
      ctx.lineTo(sx + f * u * 0.03, sy + u * 0.205);
      ctx.strokeStyle = ink;
      ctx.lineWidth = lineW * 2.0;
      ctx.lineJoin = 'miter';
      ctx.stroke();
      ctx.strokeStyle = '#fcfdf7';
      ctx.lineWidth = lineW * 1.1;
      ctx.stroke();
    }
  }

  ctx.restore(); // end torso local space

  // 5. HEAD, FIERCE UKIYO-E EXPRESSION, & ICONIC OICHO-MAGE GINKGO TOPKNOT
  ctx.save();
  ctx.translate(head.x, head.y);
  ctx.rotate(f * skel.headTilt);

  // Thick sumo neck
  ctx.beginPath();
  ctx.moveTo(-f * u * 0.1, u * 0.18);
  ctx.lineTo(-f * u * 0.115, u * 0.04);
  ctx.lineTo(f * u * 0.095, u * 0.04);
  ctx.lineTo(f * u * 0.085, u * 0.18);
  ctx.closePath();
  ctx.fillStyle = style.skinShadow;
  ctx.fill();

  // Head oval
  const headPath = new Path2D();
  headPath.ellipse(0, 0, u * 0.152, u * 0.168, -f * 0.06, 0, Math.PI * 2);
  ctx.fillStyle = style.skinBase;
  ctx.fill(headPath);
  ctx.strokeStyle = ink;
  ctx.lineWidth = lineW * 1.02;
  ctx.stroke(headPath);

  // Traditional hair cap & sideburn
  const hairPath = new Path2D();
  hairPath.moveTo(-f * u * 0.15, u * 0.05);
  hairPath.bezierCurveTo(-f * u * 0.18, -u * 0.14, -f * u * 0.05, -u * 0.19, f * u * 0.08, -u * 0.14);
  hairPath.quadraticCurveTo(f * u * 0.04, -u * 0.06, -f * u * 0.02, -u * 0.01);
  hairPath.quadraticCurveTo(-f * u * 0.08, u * 0.06, -f * u * 0.15, u * 0.05);
  hairPath.closePath();
  ctx.fillStyle = '#18201a';
  ctx.fill(hairPath);
  ctx.stroke(hairPath);

  // Iconic Oicho-mage ginkgo topknot folded over crown
  const knotPath = new Path2D();
  knotPath.moveTo(-f * u * 0.07, -u * 0.15);
  knotPath.bezierCurveTo(-f * u * 0.14, -u * 0.3, f * u * 0.04, -u * 0.34, f * u * 0.14, -u * 0.22);
  knotPath.quadraticCurveTo(f * u * 0.05, -u * 0.16, -f * u * 0.07, -u * 0.15);
  knotPath.closePath();
  ctx.fillStyle = '#18201a';
  ctx.fill(knotPath);
  ctx.stroke(knotPath);

  // Crisp white Motoyui paper cord
  ctx.beginPath();
  ctx.moveTo(-f * u * 0.07, -u * 0.175);
  ctx.lineTo(-f * u * 0.01, -u * 0.225);
  ctx.strokeStyle = '#f8f9f0';
  ctx.lineWidth = lineW * 1.05;
  ctx.stroke();

  // Expressive Ukiyo-e facial features
  ctx.strokeStyle = ink;
  ctx.lineCap = 'round';
  ctx.lineWidth = lineW * 1.15;
  ctx.beginPath();
  ctx.moveTo(f * u * 0.025, -u * 0.055);
  ctx.lineTo(f * u * 0.115, skel.expression === 'calm' ? -u * 0.045 : -u * 0.025);
  ctx.stroke();

  ctx.lineWidth = lineW * 0.85;
  ctx.beginPath();
  ctx.moveTo(f * u * 0.04, -u * 0.012);
  ctx.lineTo(f * u * 0.105, -u * 0.008);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(f * u * 0.125, -u * 0.02);
  ctx.lineTo(f * u * 0.145, u * 0.032);
  ctx.lineTo(f * u * 0.115, u * 0.04);
  ctx.stroke();

  ctx.beginPath();
  if (skel.expression === 'strained') {
    ctx.arc(f * u * 0.095, u * 0.088, u * 0.026, 0, Math.PI * 2);
  } else {
    ctx.moveTo(f * u * 0.055, u * 0.082);
    ctx.quadraticCurveTo(f * u * 0.09, u * 0.072, f * u * 0.12, u * 0.086);
  }
  ctx.stroke();

  ctx.lineWidth = lineW * 0.72;
  ctx.beginPath();
  ctx.arc(-f * u * 0.03, u * 0.015, u * 0.032, -Math.PI * 0.4, Math.PI * 0.55);
  ctx.stroke();

  ctx.restore(); // end head

  // 6. NEAR LEG (unified woodblock silhouette)
  drawUnifiedLeg(ctx, legNear, u, style.skinBase, style.skinShadow, ink, lineW);

  // 7. NEAR ARM (unified woodblock silhouette)
  drawUnifiedArm(ctx, armNear, f, u, skel.handMode, style.skinBase, style.skinShadow, ink, lineW);

  ctx.restore();
}

/** Draws the live animated Gyōji (Sumo Referee) poised behind the Dohyo with detailed robe & face. */
function drawGyoji(ctx: CanvasRenderingContext2D, gyoji: GyojiState, cam: CameraMap, time: number) {
  const u = cam.unit * 0.56;
  const x = cam.sx(gyoji.x);
  const footY = cam.sy(0.32);
  const crouchDrop = gyoji.crouch * u * 0.2;
  const ink = '#1c271d';
  const lw = Math.max(1.3, u * 0.022);

  ctx.save();
  ctx.translate(x, footY);

  // Soft cast shadow on rear clay
  ctx.fillStyle = 'rgba(37, 52, 34, 0.16)';
  ctx.beginPath();
  ctx.ellipse(0, u * 0.02, u * 0.28, u * 0.055, 0, 0, Math.PI * 2);
  ctx.fill();

  // White Tabi socks & straw sandals peeking cleanly below the hakama
  ctx.fillStyle = '#f5f6ec';
  ctx.strokeStyle = ink;
  ctx.lineWidth = lw * 0.9;
  for (const sx of [-u * 0.12, u * 0.12]) {
    ctx.beginPath();
    ctx.ellipse(sx, 0, u * 0.075, u * 0.038, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Pleated dark-indigo Hakama lower skirt
  const waistY = -u * 0.48 + crouchDrop;
  const hakamaPath = new Path2D();
  hakamaPath.moveTo(-u * 0.28, -u * 0.03);
  hakamaPath.lineTo(-u * 0.22, waistY);
  hakamaPath.lineTo(u * 0.22, waistY);
  hakamaPath.lineTo(u * 0.28, -u * 0.03);
  hakamaPath.quadraticCurveTo(0, u * 0.02, -u * 0.28, -u * 0.03);
  hakamaPath.closePath();
  ctx.fillStyle = '#334848';
  ctx.fill(hakamaPath);
  ctx.stroke(hakamaPath);

  // Hakama vertical pleat lines
  ctx.strokeStyle = 'rgba(20, 30, 26, 0.55)';
  ctx.lineWidth = lw * 0.65;
  for (const px of [-u * 0.11, 0, u * 0.11]) {
    ctx.beginPath();
    ctx.moveTo(px * 0.85, waistY + u * 0.04);
    ctx.lineTo(px * 1.15, -u * 0.03);
    ctx.stroke();
  }

  // Traditional Kariginu upper robe (moss-gold brocade)
  const shoulderY = -u * 1.04 + crouchDrop;
  const robePath = new Path2D();
  robePath.moveTo(-u * 0.26, waistY + u * 0.08);
  robePath.quadraticCurveTo(-u * 0.3, -u * 0.72 + crouchDrop, -u * 0.22, shoulderY);
  robePath.lineTo(u * 0.22, shoulderY);
  robePath.quadraticCurveTo(u * 0.3, -u * 0.72 + crouchDrop, u * 0.26, waistY + u * 0.08);
  robePath.quadraticCurveTo(0, waistY + u * 0.14, -u * 0.26, waistY + u * 0.08);
  robePath.closePath();
  ctx.fillStyle = '#9aa889';
  ctx.fill(robePath);
  ctx.strokeStyle = ink;
  ctx.lineWidth = lw;
  ctx.stroke(robePath);

  // Cream under-collar (juban) & vermilion chest rosette (kikutoji)
  ctx.beginPath();
  ctx.moveTo(-u * 0.11, shoulderY);
  ctx.lineTo(0, shoulderY + u * 0.22);
  ctx.lineTo(u * 0.11, shoulderY);
  ctx.fillStyle = '#f2f3e6';
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = SUMO_PALETTE.vermilion;
  ctx.beginPath();
  ctx.arc(0, shoulderY + u * 0.29, u * 0.042, 0, Math.PI * 2);
  ctx.fill();

  // Head + dignified woodblock facial features + tall black lacquered Eboshi hat
  const headY = shoulderY - u * 0.17;
  ctx.beginPath();
  ctx.ellipse(0, headY, u * 0.135, u * 0.15, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#e2c7a8';
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.stroke();

  // Calm focused Gyōji eyes, brows, and mouth
  ctx.strokeStyle = ink;
  ctx.lineWidth = lw * 0.75;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-u * 0.07, headY - u * 0.03);
  ctx.lineTo(-u * 0.025, headY - u * 0.022);
  ctx.moveTo(u * 0.025, headY - u * 0.022);
  ctx.lineTo(u * 0.07, headY - u * 0.03);
  ctx.moveTo(-u * 0.06, headY + u * 0.005);
  ctx.lineTo(-u * 0.03, headY + u * 0.005);
  ctx.moveTo(u * 0.03, headY + u * 0.005);
  ctx.lineTo(u * 0.06, headY + u * 0.005);
  ctx.moveTo(-u * 0.035, headY + u * 0.068);
  ctx.quadraticCurveTo(0, headY + u * 0.058, u * 0.035, headY + u * 0.068);
  ctx.stroke();

  // Curved black Eboshi ceremonial hat
  const hatPath = new Path2D();
  hatPath.moveTo(-u * 0.145, headY - u * 0.065);
  hatPath.quadraticCurveTo(-u * 0.16, headY - u * 0.44, 0, headY - u * 0.46);
  hatPath.quadraticCurveTo(u * 0.16, headY - u * 0.42, u * 0.145, headY - u * 0.065);
  hatPath.closePath();
  ctx.fillStyle = '#19221a';
  ctx.fill(hatPath);
  ctx.stroke(hatPath);

  // Wooden Gunbai war fan raised & angled dynamically (positioned cleanly above & behind wrestlers)
  const fanPivotX = u * 0.24;
  const fanPivotY = shoulderY + u * 0.24 - gyoji.excitement * u * 0.28;
  ctx.save();
  ctx.translate(fanPivotX, fanPivotY);
  ctx.rotate(gyoji.gunbaiAngle + Math.sin(time * 2.5) * 0.03);

  // Flowing kimono sleeve
  ctx.beginPath();
  ctx.moveTo(-u * 0.22, -u * 0.06);
  ctx.lineTo(u * 0.02, -u * 0.03);
  ctx.lineTo(u * 0.02, u * 0.15);
  ctx.lineTo(-u * 0.22, u * 0.12);
  ctx.closePath();
  ctx.fillStyle = '#829274';
  ctx.fill();
  ctx.stroke();

  // Gunbai handle + swinging vermilion tassel
  ctx.beginPath();
  ctx.moveTo(0, u * 0.1);
  ctx.lineTo(0, -u * 0.34);
  ctx.strokeStyle = '#4f3a2a';
  ctx.lineWidth = lw * 2.2;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, u * 0.1);
  ctx.quadraticCurveTo(u * 0.08, u * 0.22, u * 0.04 + Math.sin(time * 4) * u * 0.03, u * 0.34);
  ctx.strokeStyle = SUMO_PALETTE.vermilion;
  ctx.lineWidth = lw * 1.4;
  ctx.stroke();

  // Wooden hourglass Gunbai paddle
  const fanPath = new Path2D();
  fanPath.moveTo(0, -u * 0.56);
  fanPath.bezierCurveTo(u * 0.16, -u * 0.52, u * 0.2, -u * 0.28, u * 0.04, -u * 0.18);
  fanPath.lineTo(-u * 0.04, -u * 0.18);
  fanPath.bezierCurveTo(-u * 0.2, -u * 0.28, -u * 0.16, -u * 0.52, 0, -u * 0.56);
  fanPath.closePath();
  ctx.fillStyle = '#7c553b';
  ctx.fill(fanPath);
  ctx.strokeStyle = ink;
  ctx.lineWidth = lw;
  ctx.stroke(fanPath);

  ctx.fillStyle = SUMO_PALETTE.vermilion;
  ctx.beginPath();
  ctx.arc(-u * 0.06, -u * 0.36, u * 0.034, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2f3e6';
  ctx.beginPath();
  ctx.arc(u * 0.06, -u * 0.36, u * 0.028, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
  ctx.restore();
}

/** Draws a tapered calligraphic woodblock brushstroke arc (pointed tips, bold curved body). */
function drawBrushArc(
  ctx: CanvasRenderingContext2D,
  p0: Vec2,
  ctrl: Vec2,
  p1: Vec2,
  maxWidth: number,
  color: string,
  alpha: number,
) {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.quadraticCurveTo(ctrl.x - nx * maxWidth, ctrl.y - ny * maxWidth, p1.x, p1.y);
  ctx.quadraticCurveTo(ctrl.x + nx * maxWidth * 0.55, ctrl.y + ny * maxWidth * 0.55, p0.x, p0.y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Master frame renderer for the 2.5D Edo Nishiki-e Sumo Stage. */
export function renderUkiyoStage(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  washiPattern: CanvasPattern | null,
  player: RikishiSkeleton,
  opponent: RikishiSkeleton,
  opponentVisible: boolean,
  playerStyle: RikishiStyle,
  oppStyle: RikishiStyle,
  gyoji: GyojiState,
  fx: StageFxCue,
  particles: UkiyoParticle[],
  extras: {
    time: number;
    parallaxX: number;
    parallaxY: number;
    shakeX: number;
    shakeY: number;
    shock: number;
    shockRadius: number;
    shockX: number;
    saltGlow: number;
    edgeAlert: number;
    ringPos: number;
    reducedMotion: boolean;
  },
) {
  const ink = '#1c281d';

  const baseUnit = Math.min(width / 4.85, height / 3.15);
  const unit = baseUnit * fx.camZoom;
  const centerX = width * 0.5 - fx.camPanX * unit + extras.shakeX * 22;
  const floorY = height * 0.775 - fx.camPanY * unit + extras.shakeY * 18;

  const cam: CameraMap = {
    sx: (wx: number) => centerX + wx * unit,
    sy: (wy: number) => floorY - wy * unit,
    unit,
    width,
    height,
    floorY,
  };

  // =========================================================================
  // LAYER 0: RICE-PAPER BASE + BOKASHI SKY + HOKUSAI MT. FUJI + SUYARI-GASUMI
  // =========================================================================
  ctx.fillStyle = SUMO_PALETTE.paper;
  ctx.fillRect(0, 0, width, height);

  const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.54);
  skyGrad.addColorStop(0, 'rgba(68, 98, 98, 0.24)');
  skyGrad.addColorStop(0.45, 'rgba(130, 146, 116, 0.09)');
  skyGrad.addColorStop(1, 'rgba(233, 236, 223, 0)');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height * 0.54);

  const pxFar = extras.parallaxX * 12;
  const pyFar = extras.parallaxY * 7;

  // Soft vermilion woodblock sun disc
  ctx.save();
  ctx.fillStyle = 'rgba(184, 67, 46, 0.16)';
  ctx.beginPath();
  ctx.arc(width * 0.52 + pxFar * 0.6, height * 0.34 + pyFar * 0.5, baseUnit * 0.42, 0, Math.PI * 2);
  ctx.fill();

  // Iconic Hokusai Mt. Fuji silhouette with crisp woodblock snow-cap ridges
  const fujiX = width * 0.5 + pxFar;
  const fujiBaseY = floorY - baseUnit * 0.28 + pyFar;
  const fujiPeakY = fujiBaseY - baseUnit * 1.24;

  const fujiPath = new Path2D();
  fujiPath.moveTo(fujiX - baseUnit * 2.2, fujiBaseY);
  fujiPath.quadraticCurveTo(fujiX - baseUnit * 0.72, fujiBaseY - baseUnit * 0.52, fujiX - baseUnit * 0.17, fujiPeakY);
  fujiPath.lineTo(fujiX + baseUnit * 0.17, fujiPeakY);
  fujiPath.quadraticCurveTo(fujiX + baseUnit * 0.72, fujiBaseY - baseUnit * 0.52, fujiX + baseUnit * 2.2, fujiBaseY);
  fujiPath.closePath();

  const fujiGrad = ctx.createLinearGradient(0, fujiPeakY, 0, fujiBaseY);
  fujiGrad.addColorStop(0, 'rgba(54, 86, 90, 0.42)');
  fujiGrad.addColorStop(0.65, 'rgba(92, 116, 108, 0.18)');
  fujiGrad.addColorStop(1, 'rgba(130, 146, 116, 0.03)');
  ctx.fillStyle = fujiGrad;
  ctx.fill(fujiPath);

  ctx.beginPath();
  ctx.moveTo(fujiX - baseUnit * 0.17, fujiPeakY);
  ctx.lineTo(fujiX + baseUnit * 0.17, fujiPeakY);
  ctx.lineTo(fujiX + baseUnit * 0.48, fujiPeakY + baseUnit * 0.36);
  ctx.lineTo(fujiX + baseUnit * 0.24, fujiPeakY + baseUnit * 0.27);
  ctx.lineTo(fujiX + baseUnit * 0.04, fujiPeakY + baseUnit * 0.4);
  ctx.lineTo(fujiX - baseUnit * 0.19, fujiPeakY + baseUnit * 0.26);
  ctx.lineTo(fujiX - baseUnit * 0.48, fujiPeakY + baseUnit * 0.36);
  ctx.closePath();
  ctx.fillStyle = 'rgba(246, 248, 240, 0.78)';
  ctx.fill();

  // Traditional Japanese Suyari-gasumi horizontal gold-ochre & rice-paper cloud bands
  const drawCloud = (cx: number, cy: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(cx - w * 0.5, cy - h * 0.5, w, h, h * 0.5);
    ctx.fill();
  };
  drawCloud(width * 0.23 + pxFar * 1.2, height * 0.38 + pyFar, baseUnit * 1.45, baseUnit * 0.1, 'rgba(233, 236, 223, 0.76)');
  drawCloud(width * 0.77 + pxFar * 1.1, height * 0.34 + pyFar, baseUnit * 1.55, baseUnit * 0.11, 'rgba(233, 236, 223, 0.76)');
  drawCloud(width * 0.3 + pxFar * 1.35, height * 0.45 + pyFar, baseUnit * 1.15, baseUnit * 0.075, 'rgba(198, 175, 118, 0.22)');
  drawCloud(width * 0.71 + pxFar * 1.3, height * 0.43 + pyFar, baseUnit * 1.28, baseUnit * 0.075, 'rgba(198, 175, 118, 0.2)');
  ctx.restore();

  // =========================================================================
  // LAYER 1: EDO WOODEN PILLARS, MAKU CURTAIN, & CORNER SHIHŌ TASSELS
  // =========================================================================
  const pxMid = extras.parallaxX * 18;
  const pillarW = Math.max(18, baseUnit * 0.13);
  ctx.fillStyle = '#4e3c2d';
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.6;
  ctx.fillRect(-4 + pxMid * 0.35, 0, pillarW, height);
  ctx.strokeRect(-4 + pxMid * 0.35, 0, pillarW, height);
  ctx.fillRect(width - pillarW + 4 + pxMid * 0.35, 0, pillarW, height);
  ctx.strokeRect(width - pillarW + 4 + pxMid * 0.35, 0, pillarW, height);

  // Far-side ceremonial maku curtain line
  const makuY = floorY - baseUnit * 0.44;
  ctx.fillStyle = 'rgba(37, 52, 34, 0.08)';
  ctx.fillRect(pillarW, makuY, width - pillarW * 2, baseUnit * 0.22);
  ctx.strokeStyle = 'rgba(37, 52, 34, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pillarW, makuY);
  ctx.lineTo(width - pillarW, makuY);
  ctx.stroke();

  // Four swaying seasonal Shihō tassels anchored cleanly from the left/right shrine eaves
  // (tucked nicely along the outer pillars so top HUD cards stay 100% clear!)
  const sway = extras.reducedMotion ? 0 : Math.sin(extras.time * 1.4) * 0.05 + extras.shock * 0.09;
  const tasselTopY = Math.max(106, height * 0.125);
  const tasselConfigs: Array<[number, string, string, number]> = [
    [pillarW + baseUnit * 0.18, '#476f73', '#2d4b4e', 0.95], // Azure (East/Spring)
    [pillarW + baseUnit * 0.42, '#283129', '#141914', 0.72], // Black (North/Winter)
    [width - pillarW - baseUnit * 0.42, '#f0f1e5', '#b8bba8', 0.72], // White (West/Autumn)
    [width - pillarW - baseUnit * 0.18, '#b8432e', '#7d2a1c', 0.95], // Vermilion (South/Summer)
  ];
  for (const [tx, fill, shade, scale] of tasselConfigs) {
    ctx.save();
    ctx.translate(tx + pxMid * 0.5, tasselTopY);
    // Cord running smoothly upward into the eaves
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, -tasselTopY);
    ctx.lineTo(0, 0);
    ctx.stroke();

    ctx.rotate(sway * (tx < width * 0.5 ? 1 : -1));
    const h = baseUnit * 0.36 * scale;
    const r = baseUnit * 0.058 * scale;

    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(0, r * 0.6, r * 0.72, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-r * 0.52, r * 1.25);
    ctx.lineTo(r * 0.52, r * 1.25);
    ctx.lineTo(r * 0.98, h);
    ctx.lineTo(-r * 0.98, h);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.strokeStyle = shade;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-r * 0.22, r * 1.4);
    ctx.lineTo(-r * 0.42, h * 0.95);
    ctx.moveTo(r * 0.22, r * 1.4);
    ctx.lineTo(r * 0.42, h * 0.95);
    ctx.stroke();
    ctx.restore();
  }

  // =========================================================================
  // LAYER 2: PERSPECTIVE ARAKIDA CLAY DOHYO + HAND-INKED STRAW TAWARA
  // =========================================================================
  const dohyoW = unit * 2.15;
  const dohyoH = unit * 0.5;
  const dohyoCY = floorY - unit * 0.04;

  // Sloped earthen platform
  ctx.beginPath();
  ctx.moveTo(centerX - dohyoW * 1.12, dohyoCY - dohyoH * 0.65);
  ctx.lineTo(centerX + dohyoW * 1.12, dohyoCY - dohyoH * 0.65);
  ctx.lineTo(centerX + dohyoW * 1.34, dohyoCY + dohyoH * 1.12);
  ctx.lineTo(centerX - dohyoW * 1.34, dohyoCY + dohyoH * 1.12);
  ctx.closePath();
  const clayGrad = ctx.createLinearGradient(0, dohyoCY - dohyoH, 0, dohyoCY + dohyoH * 1.2);
  clayGrad.addColorStop(0, '#c2b698');
  clayGrad.addColorStop(0.55, '#b5aa8c');
  clayGrad.addColorStop(1, '#96846a');
  ctx.fillStyle = clayGrad;
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Front clay terrace vertical drop
  ctx.beginPath();
  ctx.moveTo(centerX - dohyoW * 1.34, dohyoCY + dohyoH * 1.12);
  ctx.lineTo(centerX + dohyoW * 1.34, dohyoCY + dohyoH * 1.12);
  ctx.lineTo(centerX + dohyoW * 1.42, height + 8);
  ctx.lineTo(centerX - dohyoW * 1.42, height + 8);
  ctx.closePath();
  ctx.fillStyle = '#85735c';
  ctx.fill();
  ctx.stroke();

  // Inner Arakida clay disc
  const ringRX = unit * 1.68;
  const ringRY = unit * 0.34;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(centerX, dohyoCY, ringRX, ringRY, 0, 0, Math.PI * 2);
  const innerGrad = ctx.createRadialGradient(centerX, dohyoCY - ringRY * 0.1, unit * 0.1, centerX, dohyoCY, ringRX);
  innerGrad.addColorStop(0, '#d2c7ac');
  innerGrad.addColorStop(0.75, '#bfb396');
  innerGrad.addColorStop(1, '#a6967a');
  ctx.fillStyle = innerGrad;
  ctx.fill();

  // Settled purifying salt crescent
  if (extras.saltGlow > 0.02) {
    ctx.clip();
    ctx.fillStyle = `rgba(251, 253, 249, ${(extras.saltGlow * 0.45).toFixed(3)})`;
    for (let i = 0; i < 42; i += 1) {
      const a = i * 2.39996;
      const rr = Math.sqrt((i + 1) / 42) * 0.85;
      ctx.beginPath();
      ctx.ellipse(
        centerX + Math.cos(a) * ringRX * rr,
        dohyoCY + Math.sin(a) * ringRY * rr,
        unit * 0.03,
        unit * 0.01,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }
  ctx.restore();

  // Crisp white Shikiri-sen starting lines
  ctx.strokeStyle = 'rgba(248, 250, 242, 0.92)';
  ctx.lineWidth = Math.max(3, unit * 0.03);
  ctx.lineCap = 'round';
  for (const sign of [-1, 1] as const) {
    const lx = centerX + sign * unit * 0.44;
    ctx.beginPath();
    ctx.moveTo(lx, dohyoCY - ringRY * 0.34);
    ctx.lineTo(lx, dohyoCY + ringRY * 0.34);
    ctx.stroke();
  }

  // Concentric woodblock shockwave ripple on Shiko / Clash
  if (extras.shock > 0.02) {
    ctx.save();
    const rx = Math.max(0.1, extras.shockRadius) * unit * 0.72;
    const ry = rx * 0.21;
    ctx.strokeStyle = SUMO_PALETTE.vermilion;
    ctx.globalAlpha = Math.min(0.72, extras.shock * 0.75);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(cam.sx(extras.shockX), dohyoCY, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = ink;
    ctx.globalAlpha = Math.min(0.48, extras.shock * 0.5);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(cam.sx(extras.shockX), dohyoCY, rx * 0.74, ry * 0.74, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Hand-inked woven straw Tawara circle
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(centerX, dohyoCY, ringRX, ringRY, 0, 0, Math.PI * 2);
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(11, unit * 0.12);
  ctx.stroke();
  ctx.strokeStyle = '#c8b683';
  ctx.lineWidth = Math.max(8, unit * 0.09);
  ctx.stroke();

  if (extras.edgeAlert > 0.05) {
    const startAng = extras.ringPos > 0 ? -0.65 : Math.PI - 0.65;
    const endAng = extras.ringPos > 0 ? 0.65 : Math.PI + 0.65;
    ctx.beginPath();
    ctx.ellipse(centerX, dohyoCY, ringRX, ringRY, 0, startAng, endAng);
    ctx.strokeStyle = SUMO_PALETTE.vermilion;
    ctx.globalAlpha = extras.edgeAlert * 0.82;
    ctx.lineWidth = Math.max(8, unit * 0.09);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 24; i += 1) {
    const a = (i / 24) * Math.PI * 2;
    const bx = centerX + Math.cos(a) * ringRX;
    const by = dohyoCY + Math.sin(a) * ringRY;
    const nx = Math.cos(a) * unit * 0.048;
    const ny = Math.sin(a) * unit * 0.048;
    ctx.beginPath();
    ctx.moveTo(bx - nx, by - ny);
    ctx.lineTo(bx + nx, by + ny);
    ctx.stroke();
  }
  ctx.restore();

  // =========================================================================
  // LAYER 3: LIVE GYŌJI REFEREE
  // =========================================================================
  drawGyoji(ctx, gyoji, cam, extras.time);

  // =========================================================================
  // LAYER 4: GROUNDED SHADOWS + UNIFIED WOODBLOCK RIKISHI
  // =========================================================================
  const drawShadow = (skel: RikishiSkeleton) => {
    const cx = cam.sx(skel.pelvis.x);
    ctx.fillStyle = 'rgba(28, 39, 28, 0.22)';
    ctx.beginPath();
    ctx.ellipse(cx, floorY + unit * 0.01, unit * 0.42, unit * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  drawShadow(player);
  if (opponentVisible) drawShadow(opponent);

  if (!opponentVisible) {
    drawRikishi(ctx, player, cam, playerStyle, extras.time);
  } else if (player.depth >= opponent.depth) {
    drawRikishi(ctx, opponent, cam, oppStyle, extras.time);
    drawRikishi(ctx, player, cam, playerStyle, extras.time);
  } else {
    drawRikishi(ctx, player, cam, playerStyle, extras.time);
    drawRikishi(ctx, opponent, cam, oppStyle, extras.time);
  }

  // =========================================================================
  // LAYER 5: TAPERED CALLIGRAPHIC BRUSH SLASHES, SPEED LINES, & PARTICLES
  // =========================================================================
  if (fx.slash.kind !== 'none' && fx.slash.intensity > 0.03) {
    const sx = cam.sx(fx.slash.x);
    const sy = cam.sy(fx.slash.y);
    const a = Math.min(0.86, fx.slash.intensity * 0.9);

    if (fx.slash.kind === 'oshi') {
      drawBrushArc(
        ctx,
        { x: sx - fx.slash.dir * unit * 0.62, y: sy - unit * 0.04 },
        { x: sx, y: sy - unit * 0.16 },
        { x: sx + fx.slash.dir * unit * 0.65, y: sy - unit * 0.02 },
        unit * 0.065 * fx.slash.intensity,
        fx.slash.color,
        a,
      );
      drawBrushArc(
        ctx,
        { x: sx - fx.slash.dir * unit * 0.48, y: sy + unit * 0.12 },
        { x: sx, y: sy + unit * 0.04 },
        { x: sx + fx.slash.dir * unit * 0.56, y: sy + unit * 0.14 },
        unit * 0.036 * fx.slash.intensity,
        ink,
        a * 0.65,
      );
    } else if (fx.slash.kind === 'yori') {
      drawBrushArc(
        ctx,
        { x: sx - fx.slash.dir * unit * 0.68, y: sy + unit * 0.18 },
        { x: sx, y: sy - unit * 0.62 },
        { x: sx + fx.slash.dir * unit * 0.72, y: sy + unit * 0.08 },
        unit * 0.075 * fx.slash.intensity,
        fx.slash.color,
        a,
      );
    } else if (fx.slash.kind === 'hataki') {
      drawBrushArc(
        ctx,
        { x: sx - fx.slash.dir * unit * 0.4, y: sy - unit * 0.5 },
        { x: sx + fx.slash.dir * unit * 0.18, y: sy - unit * 0.16 },
        { x: sx + fx.slash.dir * unit * 0.52, y: sy + unit * 0.46 },
        unit * 0.072 * fx.slash.intensity,
        fx.slash.color,
        a,
      );
    } else if (fx.slash.kind === 'salt') {
      drawBrushArc(
        ctx,
        { x: sx - unit * 0.34, y: sy + unit * 0.18 },
        { x: sx + unit * 0.2, y: sy - unit * 0.36 },
        { x: sx + unit * 0.72, y: sy + unit * 0.2 },
        unit * 0.035 * fx.slash.intensity,
        '#fcfdf9',
        a * 0.75,
      );
    }
  }

  // Refined particles: elongated ink-brush flicks, fine salt grains, soft clay puffs
  for (let i = 0; i < particles.length; i += 1) {
    const p = particles[i];
    const frac = p.life / p.maxLife;
    const alpha = p.kind === 'mote' ? Math.sin(frac * Math.PI) * 0.38 : Math.min(1, (1 - frac) * 1.35);
    if (alpha <= 0.02) continue;
    const px = cam.sx(p.x);
    const py = cam.sy(p.y);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;

    if (p.kind === 'ink') {
      // Tapered woodblock ink flick aligned along velocity vector (no confetti dots!)
      const ang = Math.atan2(-p.vy, p.vx);
      const len = Math.max(5, Math.hypot(p.vx, p.vy) * unit * 0.032);
      const w = Math.max(1.4, p.size * unit * 0.009);
      ctx.translate(px, py);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.ellipse(0, 0, len, w, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'salt') {
      ctx.beginPath();
      ctx.arc(px, py, Math.max(1.4, p.size * unit * 0.011), 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'dust') {
      ctx.beginPath();
      ctx.ellipse(px, py, p.size * unit * 0.022, p.size * unit * 0.014, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(px, py, Math.max(1.2, p.size * unit * 0.01), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Dramatic woodblock radial speed lines (shūchūsen) on big impacts
  if (fx.speedLines > 0.04 && !extras.reducedMotion) {
    ctx.save();
    ctx.strokeStyle = ink;
    ctx.globalAlpha = fx.speedLines * 0.2;
    const rays = 36;
    const outerR = Math.hypot(width, height) * 0.62;
    const innerR = Math.min(width, height) * 0.36;
    for (let i = 0; i < rays; i += 1) {
      const a = (i / rays) * Math.PI * 2 + Math.sin(i * 11.3) * 0.05;
      const r0 = innerR + ((i * 37) % 50);
      ctx.lineWidth = i % 3 === 0 ? 2.2 : 1.0;
      ctx.beginPath();
      ctx.moveTo(width * 0.5 + Math.cos(a) * r0, height * 0.52 + Math.sin(a) * r0);
      ctx.lineTo(width * 0.5 + Math.cos(a) * outerR, height * 0.52 + Math.sin(a) * outerR);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Floating Sumo-moji impact calligraphy watermark in upper sky
  if (fx.calligraphy && fx.calligraphyAlpha > 0.05) {
    ctx.save();
    ctx.globalAlpha = fx.calligraphyAlpha * 0.24;
    ctx.fillStyle = fx.calligraphyColor;
    ctx.font = `700 ${Math.round(baseUnit * 0.92)}px 'Noto Serif SC', 'Songti SC', serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fx.calligraphy, width * 0.5, height * 0.33);
    ctx.restore();
  }

  // =========================================================================
  // LAYER 6: SUBTLE WASHI WOODBLOCK GRAIN & HAIRLINE PRINT MARGIN
  // =========================================================================
  if (washiPattern) {
    ctx.save();
    ctx.fillStyle = washiPattern;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  ctx.strokeStyle = 'rgba(37, 52, 34, 0.16)';
  ctx.lineWidth = 1;
  ctx.strokeRect(8, 8, width - 16, height - 16);
}
