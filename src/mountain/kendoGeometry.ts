import { BufferGeometry, Color, Float32BufferAttribute, Vector3 } from 'three';
import { randomSource } from './model';

const ink = new Color('#27392e');
const sage = new Color('#839276');
const paper = new Color('#e0e4d2');
type V = [number, number, number];

class Cloud {
  private positions: number[] = [];
  private colors: number[] = [];
  private sizes: number[] = [];
  private seeds: number[] = [];
  private bends: number[] = [];
  readonly random: () => number;

  constructor(seed: number) { this.random = randomSource(seed); }

  dot(x: number, y: number, z: number, tone: number, size: number, bend = 0) {
    const col = ink.clone().lerp(sage, Math.min(tone * 1.7, 1)).lerp(paper, Math.max(0, tone * 1.8 - .8));
    this.positions.push(x, y, z);
    this.colors.push(col.r, col.g, col.b);
    this.sizes.push(size);
    this.seeds.push(this.random());
    this.bends.push(bend);
  }

  box(center: V, width: number, height: number, depth: number, count: number, tone: number) {
    const [x, y, z] = center, r = this.random;
    for (let i = 0; i < count; i++) {
      const face = r(), a = r() - .5, b = r() - .5;
      const px = face < .65 ? x + a * width : x + (face > .82 ? .5 : -.5) * width;
      const py = face < .49 || face > .65 ? y + b * height : y + height * .5;
      const pz = face < .49 ? z + depth * .5 : z + (face < .65 ? b : a) * depth;
      this.dot(px, py, pz, tone + (face < .49 ? .16 : .02) + r() * .09, .27 + r() * .24);
    }
    for (let i = 0; i < Math.max(24, count * .65); i++) {
      const s = r(), top = i % 2 ? .5 : -.5, side = i % 4 < 2 ? .5 : -.5;
      const edge = i % 3;
      this.dot(x + (edge === 0 ? (s - .5) : side) * width,
        y + (edge === 1 ? (s - .5) : top) * height,
        z + (edge === 2 ? (s - .5) : .502) * depth,
        Math.max(.05, tone - .12), .25 + r() * .16);
    }
  }

  tube(a: V, b: V, base: number, tip: number, count: number, tone: number, size = .24) {
    const start = new Vector3(...a), end = new Vector3(...b);
    const direction = end.clone().sub(start).normalize();
    const tangent = direction.clone().cross(Math.abs(direction.y) > .8 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0)).normalize();
    const bitangent = direction.clone().cross(tangent);
    const p = new Vector3(), r = this.random;
    for (let i = 0; i < count; i++) {
      const t = r(), angle = r() * Math.PI * 2, radius = base + (tip - base) * t;
      p.lerpVectors(start, end, t).addScaledVector(tangent, radius * Math.cos(angle)).addScaledVector(bitangent, radius * Math.sin(angle));
      this.dot(p.x, p.y, p.z, tone + r() * .18, size * (.65 + .8 * r()));
    }
  }

  build() {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(this.positions, 3));
    g.setAttribute('color', new Float32BufferAttribute(this.colors, 3));
    g.setAttribute('aSize', new Float32BufferAttribute(this.sizes, 1));
    g.setAttribute('aSeed', new Float32BufferAttribute(this.seeds, 1));
    g.setAttribute('aBend', new Float32BufferAttribute(this.bends, 1));
    return g;
  }
}

function ground(c: Cloud, shot: number) {
  const r = c.random;
  for (let i = 0; i < 9500; i++) {
    const z = 9 - r() * 76, x = (r() - .5) * (22 + (9 - z) * .35);
    const path = Math.abs(x) < (shot === 2 ? 2.7 : 1.5) + .17 * Math.sin(z * .4);
    const slope = Math.sin(x * .46 + z * .27) * .15 + Math.cos(z * .34) * .12;
    c.dot(x, slope, z, path ? .67 + r() * .24 : .33 + r() * .35, .20 + r() * .37);
  }
  // The distant ridge is deliberately paler than the two banks of the path.
  for (let i = 0; i < 2700; i++) {
    const x = (r() - .5) * 135, z = -55 - r() * 47;
    const ridge = 6 + 4 * Math.cos(x * .09) + 1.5 * Math.sin(x * .39);
    c.dot(x, r() * ridge, z, .65 + r() * .22, .48 + r() * .85);
  }
}

function graves(c: Cloud) {
  const r = c.random;
  for (const side of [-1, 1]) for (let row = 0; row < 15; row++) for (let lane = 0; lane < 4; lane++) {
    const z = 4.9 - row * 2.75 + r() * 1.25;
    const x = side * (2.25 + lane * 1.75 + r() * .57);
    const height = .98 + r() * 1.67, width = .50 + r() * .58;
    const tone = .16 + r() * .22, count = row < 5 ? 154 : 63;
    c.box([x, .18, z], width * 1.75, .36, .91, count, tone);
    c.box([x, .42, z], width * 1.33, .16, .69, count, tone + .07);
    c.box([x, .5 + height * .5, z], width, height, .46, count * 2, tone);
    c.box([x, .56 + height, z], width * 1.17, .14, .53, count, tone + .04);
    for (let glyph = 0; glyph < 20 && row < 6; glyph++) {
      c.dot(x + (r() - .5) * .16, .62 + r() * height * .78, z + .236, .10, .17 + r() * .16);
    }
  }
  c.tube([-5.1, 0, 4], [-4.2, 11, 2], .72, .39, 4800, .07, .34);
  c.tube([-4.8, 5.8, 3.4], [.9, 7.8, -5], .38, .06, 1100, .10, .29);
  c.tube([6.2, 0, -.7], [5.9, 10, -2.8], .65, .31, 2600, .12, .32);
}

function bamboo(c: Cloud) {
  const r = c.random;
  for (const side of [-1, 1]) for (let stem = 0; stem < 46; stem++) {
    const near = stem < 8;
    const z = near ? 5.3 - stem * 1.1 : -4 - r() * 49;
    const x = side * (near ? 2.55 + r() * 2.9 : 1.9 + r() * 14);
    const h = 5.1 + r() * 7, lean = (r() - .5) * 2.1;
    const thickness = near ? .19 + r() * .11 : .08 + r() * .12;
    const n = near ? 1350 : 290;
    const tone = near ? .07 + r() * .11 : .22 + r() * .35;
    for (let i = 0; i < n; i++) {
      const joint = i % 6 === 0;
      const y = joint ? Math.floor(r() * (h / .74)) * .74 + r() * .044 : h * r();
      const a = r() * Math.PI * 2, ring = y % .74 < .055;
      const radius = thickness * (1 - .29 * y / h) * (ring ? 1.14 : 1);
      c.dot(x + lean * (y / h) ** 2 + Math.cos(a) * radius, y, z + Math.sin(a) * radius,
        tone + (ring ? .24 : 0) + .12 * (Math.cos(a) + 1), .26 + r() * .26, .20 * (y / h) ** 2);
    }
    for (let sprig = 0; sprig < 5; sprig++) {
      const y = h * (.48 + .10 * sprig), reach = (r() > .5 ? 1 : -1) * (.7 + r() * 1.5);
      for (let j = 0; j < 34; j++) {
        const t = r();
        c.dot(x + lean * (y / h) ** 2 + reach * t, y + .43 * Math.sin(t * 2.7) + (r() - .5) * .38 * t,
          z + (r() - .5) * .75 * t, tone + .24 + r() * .22, .24 + r() * .38, .4 + .25 * t);
      }
    }
  }
}

function grass(c: Cloud) {
  const r = c.random;
  for (let i = 0; i < 5400; i++) {
    const x = (r() - .5) * 69, z = -22 - r() * 29;
    const rise = 3.7 + 2.8 * Math.sin(x * .13 + z * .071) + Math.sin(x * .38) * 1.5;
    c.dot(x, rise * r() * (.37 + .63 * Math.min(1, Math.abs(x) / 13)), z, .47 + r() * .24, .35 + r() * .55);
  }
  for (let clump = 0; clump < 390; clump++) {
    const cz = 8.4 - r() * 63, cx = (r() - .5) * (23 + (8 - cz) * .53);
    if (Math.abs(cx) < 2.9 && cz > -12) continue;
    const base = .29 + r() * .95, tone = .17 + r() * .44;
    for (let blade = 0; blade < 13; blade++) {
      const x = cx + (r() - .5) * 1.48, z = cz + (r() - .5) * .78;
      const h = base * (.38 + r() * .91), tilt = .35 + r() * .52;
      const size = .18 + r() * .12;
      for (let p = 0; p < 10; p++) {
        const t = p / 9;
        c.dot(x + tilt * t * t, h * t, z, tone + t * .27, size * (1 - .31 * t), t * t * h);
      }
    }
  }
  for (let i = 0; i < 530; i++) {
    const x = (r() - .5) * 55, y = .25 + r() * 5, z = 6 - r() * 42;
    c.dot(x, y, z, .55 + r() * .26, .16 + r() * .18, 1.4 + r());
  }
}

export function makeKendoLandscape(shot: number) {
  const c = new Cloud(1936 + shot * 73);
  ground(c, shot);
  if (shot === 0) graves(c);
  else if (shot === 1) bamboo(c);
  else grass(c);
  return c.build();
}

export function makeSwordsmanParts(light: boolean, hat: boolean, walking: boolean) {
  const c = new Cloud(light ? 97 : 119), tone = light ? .45 : .075;
  // Hakama and jacket are separate volumes; the sleeves and blade can pivot as a group.
  c.tube([0, 1.02, 0], [0, 1.76, 0], .28, .32, 1100, tone);
  c.tube([0, 1.70, 0], [0, 1.83, 0], .29, .14, 280, tone + .04);
  c.tube([0, 1.03, 0], [0, 1.14, 0], .31, .30, 260, .13);
  c.tube([0, 1.81, 0], [0, 2.15, 0], .145, .11, 440, .36);
  c.tube([0, 2.11, 0], [0, 2.20, 0], .128, .07, 150, .08);
  if (hat) c.tube([0, 2.12, 0], [0, 2.42, 0], .46, .017, 640, .59);
  const torso = c.build();
  const leg = new Cloud(153);
  leg.tube([0, -.06, 0], [0, -.91, .015], .18, .25, 750, tone + .03);
  leg.tube([0, -.90, -.04], [0, -.99, .10], .10, .12, 160, .11);
  const arms = new Cloud(289);
  if (walking) {
    arms.tube([-.24, 0, 0], [-.34, -.57, -.03], .155, .105, 590, tone);
    arms.tube([.24, 0, 0], [.35, -.54, .025], .155, .105, 590, tone);
    arms.tube([-.34, -.57, -.03], [-.34, -.71, .01], .075, .056, 135, .36);
    arms.tube([.35, -.54, .025], [.35, -.67, .06], .075, .056, 135, .36);
    arms.tube([-.29, -.57, .14], [.04, -.90, -.91], .04, .026, 260, .13, .22);
    return { torso, leg: leg.build(), arms: arms.build() };
  }
  arms.tube([-.24, 0, 0], [-.30, -.29, .24], .14, .14, 450, tone);
  arms.tube([.24, 0, 0], [.26, -.33, .20], .14, .14, 450, tone);
  arms.tube([-.30, -.29, .24], [.03, -.37, .49], .13, .075, 410, tone);
  arms.tube([.26, -.33, .20], [.01, -.39, .50], .13, .075, 410, tone);
  arms.tube([.02, -.41, .47], [.03, -.30, .55], .077, .054, 125, .42);
  arms.tube([.02, -.36, .50], [.03, -.07, .67], .038, .031, 100, .14);
  arms.tube([.03, -.10, .65], [.10, .83, .94], .032, .009, 260, .34, .22);
  return { torso, leg: leg.build(), arms: arms.build() };
}
