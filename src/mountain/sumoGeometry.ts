import { BufferGeometry, Color, Float32BufferAttribute, Vector3 } from 'three';
import type { Vec3 } from './model';

const shades = (colors: string[]) => colors.map(color => new Color(color));
const clay = shades(['#88765a', '#a79777', '#c3b092', '#d9c9a8', '#e7d8bc']);
const wood = shades(['#423d2d', '#59604a', '#716349', '#947c5e', '#b39971']);
const grass = shades(['#59664e', '#78846a', '#9ba68b', '#bcc1a7', '#d1d4bd']);
const skin = shades(['#6c5340', '#966e52', '#b58e6e', '#c9a986', '#dec3a1']);
const belts = [shades(['#593e30', '#815842', '#9d7257']), shades(['#33473c', '#4d6753', '#769077'])];

class Points {
  private positions: number[] = [];
  private colors: number[] = [];
  private styles: number[] = [];
  constructor(private seed: number) {}

  random() {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  range(min: number, max: number) { return min + (max - min) * this.random(); }

  point(x: number, y: number, z: number, palette: Color[], size: number, tone = this.random()) {
    const c = palette[Math.min(palette.length - 1, Math.max(0, Math.floor(tone * palette.length)))];
    this.positions.push(x, y, z);
    this.colors.push(c.r, c.g, c.b);
    this.styles.push(size * this.range(.7, 1.38), this.random());
  }

  box([x, y, z]: Vec3, [w, h, d]: Vec3, count: number, palette: Color[], size: number) {
    for (let i = 0; i < count; i++) {
      const a = this.range(-1, 1), b = this.range(-1, 1);
      const sign = this.random() < .5 ? -1 : 1;
      const face = this.random() * (w * d + h * (w + d));
      const [u, v, r] = face < w * d ? [a, sign, b] : face < w * d + h * d ? [sign, a, b] : [a, b, sign];
      this.point(x + u * w / 2, y + v * h / 2, z + r * d / 2, palette, size, .08 + .5 * this.random() + (v > 0 ? .36 : 0));
    }
  }

  ellipsoid([x, y, z]: Vec3, radii: Vec3, count: number, palette: Color[], size = .21) {
    for (let i = 0; i < count; i++) {
      const v = this.range(-1, 1), a = this.range(0, 2 * Math.PI), r = Math.sqrt(1 - v * v);
      const u = r * Math.cos(a), w = r * Math.sin(a);
      this.point(x + u * radii[0], y + v * radii[1], z + w * radii[2], palette, size,
        .44 + .23 * v - .21 * u + .24 * this.random());
    }
  }

  limb(from: Vec3, to: Vec3, radius: number, endRadius: number, count: number, palette: Color[]) {
    const a = new Vector3(...from), axis = new Vector3(...to).sub(a);
    const cross = new Vector3(0, 0, 1).cross(axis).normalize();
    if (!cross.lengthSq()) cross.set(1, 0, 0);
    const side = new Vector3().crossVectors(axis, cross).normalize();
    for (let i = 0; i < count; i++) {
      const t = this.random(), theta = this.range(0, 2 * Math.PI);
      const r = (radius + (endRadius - radius) * t) * (0.68 + .32 * Math.sin(Math.PI * t));
      const p = a.clone().addScaledVector(axis, t).addScaledVector(cross, Math.cos(theta) * r).addScaledVector(side, Math.sin(theta) * r);
      this.point(p.x, p.y, p.z, palette, .205, .32 + .25 * Math.cos(theta) + .40 * this.random());
    }
  }

  geometry() {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(this.positions, 3));
    g.setAttribute('color', new Float32BufferAttribute(this.colors, 3));
    g.setAttribute('aStyle', new Float32BufferAttribute(this.styles, 2));
    return g;
  }
}

export function makeDohyo() {
  const p = new Points(4205);
  for (let i = 0; i < 4200; i++) {
    const x = p.range(-3.65, 3.65), z = p.range(-3.65, 3.65);
    p.point(x, p.range(-.018, .018), z, clay, p.range(.17, .34), .37 + .55 * p.random());
  }
  // The packed-clay platform widens toward its base.
  for (let i = 0; i < 1600; i++) {
    const y = p.range(-.55, 0), edge = 3.65 - y * .48, side = i % 4;
    const along = p.range(-edge, edge), fixed = side % 2 ? edge : -edge;
    p.point(side < 2 ? along : fixed, y, side < 2 ? fixed : along, clay, .27, p.range(.05, .59));
  }
  const chalk = shades(['#efe2c6', '#f9f3df', '#fff9ed']);
  const chalkEdge = shades(['#968467', '#ab9674', '#c3ad87']);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 200; i++) p.point(side * .37 + p.range(-.061, .061), .035, p.range(-.49, .49), chalkEdge, .205);
    for (let i = 0; i < 265; i++) p.point(side * .37 + p.range(-.035, .035), .053, p.range(-.46, .46), chalk, .21);
  }
  return p.geometry();
}

export function makeDohyoRim() {
  const p = new Points(857);
  const straw = shades(['#8c764f', '#a08a60', '#bc9f71', '#d3bb8a', '#e4d1a4']);
  for (let bale = 0; bale < 20; bale++) {
    for (let j = 0; j < 110; j++) {
      const a = (bale + p.range(.065, .935)) * Math.PI / 10, v = p.range(0, Math.PI);
      const r = 2.275 + .09 * Math.cos(v);
      p.point(r * Math.cos(a), .11 * Math.sin(v), r * Math.sin(a), straw, .205, .2 + .7 * Math.sin(v));
    }
  }
  return p.geometry();
}

export function makeDohyoRoof() {
  const p = new Points(1917);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4550; i++) {
      const x = p.range(0, 4.16), z = p.range(-4.65, 4.65);
      const y = 6.6 - x * .69 + .23 * Math.pow(x / 4.16, 5);
      const grain = .08 * Math.sin(z * 78) + .12 * Math.sin(z * 16);
      p.point(side * x, y + p.range(-.026, .026), z, wood, .36, p.range(.05, .55) + grain + (side < 0 ? .24 : 0));
    }
    for (const z of [-4.62, 4.62]) {
      for (let i = 0; i < 650; i++) {
        const x = p.range(0, 3.85), height = 6.57 - x * .69;
        p.point(side * x, p.range(3.93, height), z, clay, .255, p.range(.52, .95));
      }
      p.limb([side * 4.25, 3.89, z], [0, 6.65, z], .105, .105, 440, wood);
      p.limb([side * .70, 6.13, z * .95], [-side * .95, 7.77, z * 1.035], .14, .085, 240, wood);
      p.box([side * 3.22, 1.96, z * .7], [.28, 4.65, .28], 635, wood, .27);
    }
    for (let i = 0; i < 1120; i++) {
      const z = p.range(-4.55, 4.55), base = 3.28 + .19 * Math.cos(z * 2.1);
      const y = p.range(base, 3.91), stripe = Math.abs(y - base - .11) < .045;
      p.point(side * 4.05, y, z, stripe ? clay : wood, .23, stripe ? .94 : p.range(.05, .46));
    }
  }
  p.limb([0, 6.65, -4.92], [0, 6.65, 4.92], .14, .14, 700, wood);
  p.box([0, 4.02, 4.63], [8.2, .13, .12], 410, wood, .24);
  p.box([0, 4.02, -4.63], [8.2, .13, .12], 410, wood, .24);
  return p.geometry();
}

export function makeRingSurroundings() {
  const p = new Points(6205);
  for (let i = 0; i < 2750; i++) {
    const x = p.range(-23, 23), z = p.range(-19, 13);
    if (Math.max(Math.abs(x), Math.abs(z)) < 3.94) continue;
    p.point(x, p.range(-.59, -.55), z, clay, p.range(.2, .40));
  }
  // The lower tiers read as a distant audience through broad, irregular ink clusters.
  for (let i = 0; i < 690; i++) {
    const a = p.range(0, Math.PI * 2), row = Math.floor(p.range(0, 7)), r = 5.5 + row * .93;
    const x = r * Math.cos(a), z = r * Math.sin(a);
    if (z > 3.8 && Math.abs(x) < 7.6) continue;
    const y = row * .26 - .2;
    p.ellipsoid([x, y + .14, z], [.17, .36, .15], 16, grass, .22);
    p.ellipsoid([x, y + .54, z], [.12, .13, .12], 5, grass, .23);
  }
  for (let i = 0; i < 1800; i++) {
    const side = i % 2 ? -1 : 1;
    p.point(side * p.range(3, 18), p.range(.3, 8), p.range(-23, -6), grass, p.range(.18, .46), p.range(.46, 1));
  }
  return p.geometry();
}

export function makeRikishi(side: number, ready: boolean) {
  const body = new Points(90 + side), arm = new Points(298 + side);
  const belt = belts[side];
  const hip: Vec3 = ready ? [0, .78, -.20] : [0, 1.08, 0];
  const shoulder: Vec3 = ready ? [0, 1.28, .27] : [0, 1.81, 0];
  body.ellipsoid(ready ? [0, 1.04, .04] : [0, 1.48, .01], ready ? [.47, .37, .56] : [.47, .58, .34], 1690, skin);
  body.ellipsoid(hip, [.45, .235, .35], 1150, belt, .198);
  const head: Vec3 = ready ? [0, 1.43, .55] : [0, 2.11, .035];
  body.ellipsoid(head, [.226, .259, .217], 680, skin, .17);
  const hair = shades(['#282d25', '#444337', '#6a5d48']);
  body.ellipsoid([head[0], head[1] + .151, head[2] - .085], [.212, .134, .16], 245, hair, .18);
  body.ellipsoid([head[0], head[1] + .248, head[2] - .13], [.10, .061, .095], 115, hair, .17);
  for (const s of [-1, 1]) {
    const knee: Vec3 = ready ? [s * .62, .52, .20] : [s * .32, .59, .035];
    const ankle: Vec3 = ready ? [s * .65, .145, -.16] : [s * .34, .15, .02];
    body.limb([s * .225, hip[1], hip[2]], knee, .265, .205, 555, skin);
    body.limb(knee, ankle, .19, .13, 400, skin);
    body.ellipsoid([ankle[0], .08, ankle[2] + .085], [.15, .08, .235], 205, skin, .18);
    const pivot: Vec3 = [s * .385, shoulder[1], shoulder[2]];
    const elbow: Vec3 = ready ? [s * .32, .57, .51] : [s * .52, 1.44, .12];
    const hand: Vec3 = ready ? [s * .215, s === 1 ? .095 : .40, .67] : [s * .45, 1.25, .43];
    if (!ready && s === 1) {
      arm.limb([0, 0, 0], [.16, -.35, 0], .17, .123, 365, skin);
      arm.limb([.16, -.35, 0], [.19, -.58, .29], .119, .085, 330, skin);
      arm.ellipsoid([.19, -.60, .33], [.092, .119, .09], 180, skin, .17);
    } else {
      body.limb(pivot, elbow, .18, .125, 375, skin);
      body.limb(elbow, hand, .125, .086, 310, skin);
      body.ellipsoid(hand, [.099, .091, .101], 160, skin, .17);
    }
  }
  return { body: body.geometry(), arm: arm.geometry() };
}

export function makeSalt() {
  const p = new Points(188);
  const salt = shades(['#c0af8f', '#e9d9ad', '#fff2d6', '#fff9ee']);
  for (let i = 0; i < 620; i++) p.point(p.range(-1, 1), p.range(-1, 1), p.range(-1, 1), salt, p.range(.075, .24));
  return p.geometry();
}
