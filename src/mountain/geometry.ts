import * as THREE from 'three';
import { mountainArenas, nearClearing, randomSource, smoothstep, terrainHeight } from './model';

type Field = { positions: number[]; colors: number[]; sizes: number[]; seeds: number[]; kinds: number[]; wander: number[] };
const palette = ['#425f49', '#69845e', '#8c9f76', '#b5bf96', '#cdd2af'].map((v) => new THREE.Color(v));
function tint(value: number) {
  const t = THREE.MathUtils.clamp(value, 0, .9999) * (palette.length - 1), index = Math.floor(t);
  return palette[index].clone().lerp(palette[index + 1], t - index);
}
function field(): Field { return { positions: [], colors: [], sizes: [], seeds: [], kinds: [], wander: [] }; }
function push(f: Field, x: number, y: number, z: number, color: THREE.Color, size: number, seed: number, kind: number, wander: number) {
  f.positions.push(x, y, z); f.colors.push(color.r, color.g, color.b); f.sizes.push(size); f.seeds.push(seed); f.kinds.push(kind); f.wander.push(wander);
}
function buffer(f: Field) {
  // Shuffle once so density settings retain both terrain and every bamboo stand.
  const order = f.sizes.map((_, i) => i), rnd = randomSource(811);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const g = new THREE.BufferGeometry();
  for (const [name, values, itemSize] of [['position', f.positions, 3], ['color', f.colors, 3], ['aSize', f.sizes, 1], ['aSeed', f.seeds, 1], ['aKind', f.kinds, 1], ['aWander', f.wander, 1]] as const) {
    g.setAttribute(name, new THREE.Float32BufferAttribute(order.flatMap((i) => values.slice(i * itemSize, (i + 1) * itemSize)), itemSize));
  }
  g.computeBoundingSphere(); return g;
}

export function makeMountainField() {
  const f = field(), rnd = randomSource(4031);
  for (let i = 0; i < 18500; i++) {
    const x = rnd() * 136 - 68, z = rnd() * 134 - 62;
    if (nearClearing(x, z, .4) && rnd() > .035) continue;
    const y = terrainHeight(x, z);
    const level = .10 + (1 - y / 60) * .42 + Math.sin(x * .07 + z * .04) * .13 + rnd() * .12;
    push(f, x, y + .10 + rnd() * .08, z, tint(level), .9 + rnd() * 1.15, rnd(), 0, .016);
  }
  // Sparse bamboo stands at different altitudes, with open clearings kept clear.
  for (let cluster = 0; cluster < 110; cluster++) {
    const x = rnd() * 100 - 50, z = rnd() * 98 - 45;
    if (nearClearing(x, z, 4) || Math.hypot(x, z + 5) < 9) continue;
    if (terrainHeight(x, z) < 2) continue;
    for (let stem = 0; stem < 3; stem++) {
      const sx = x + (rnd() - .5) * 1.6, sz = z + (rnd() - .5) * 1.6;
      const h = 2.7 + rnd() * 3, y = terrainHeight(sx, sz), lean = (rnd() - .5) * .5;
      for (let k = 0; k < 20; k++) {
        const t = k / 19;
        push(f, sx + lean * t, y + t * h, sz, palette[1 + (stem % 2)], 1 + rnd() * .5, rnd(), 2, .05 * t);
      }
      for (const t of [.5, .73, .92]) for (const sign of [-1, 1]) for (let k = 0; k < 9; k++) {
        const u = k / 8, length = .45 + rnd() * .55;
        push(f, sx + lean * t + sign * u * length, y + h * t + Math.sin(u * 2.4) * .32, sz + (rnd() - .5) * .3,
          tint(.18 + rnd() * .57), 1.1 + rnd() * .6, rnd(), 2, .12 * u);
      }
    }
  }
  return buffer(f);
}

export function makeSurroundingMountains() {
  const f = field(), rnd = randomSource(1891);
  for (let i = 0; i < 43000; i++) {
    const angle = rnd() * Math.PI * 2;
    const radius = 67 + Math.sqrt(rnd()) * 470;
    const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
    const y = terrainHeight(x, z);
    const distanceFade = smoothstep(85, 410, radius);
    const col = tint(.35 + distanceFade * .35 + rnd() * .15).lerp(new THREE.Color('#e9ecdf'), .19 + distanceFade * .36);
    push(f, x, y + .1, z, col, 1.8 + rnd() * 3.2, rnd(), 0, .035);
  }
  // Continue the foothill beyond the old rectangle before thinning into the distant ridges.
  for (let i = 0; i < 13000; i++) {
    const x = (rnd() - .5) * 270, z = (rnd() - .5) * 270;
    if (x > -68 && x < 68 && z > -62 && z < 72) continue;
    const col = tint(.42 + rnd() * .30);
    push(f, x, terrainHeight(x, z) + .1, z, col, 1.25 + rnd() * 1.8, rnd(), 0, .016);
  }
  return buffer(f);
}

export function makeDepthTerrain() {
  const n = 176, positions: number[] = [], indices: number[] = [];
  for (let z = 0; z <= n; z++) for (let x = 0; x <= n; x++) {
    // Concentrate occlusion vertices around the practice grounds; extend the same mesh far past the camera.
    const tx = x / n * 2 - 1, tz = z / n * 2 - 1;
    const px = Math.sign(tx) * tx * tx * 550, pz = Math.sign(tz) * tz * tz * 550;
    positions.push(px, terrainHeight(px, pz) - .08, pz);
  }
  for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) {
    const a = z * (n + 1) + x, b = a + 1, c = a + n + 1, d = c + 1;
    indices.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setIndex(indices); g.computeVertexNormals(); return g;
}

export function makeContours() {
  const vertices: number[] = [];
  const step = 2;
  for (const level of [6, 13, 21, 29, 37, 45, 52]) for (let x = -64; x < 64; x += step) for (let z = -58; z < 64; z += step) {
    const corners = [[x, z], [x + step, z], [x + step, z + step], [x, z + step]];
    const cross: [number, number][] = [];
    for (let i = 0; i < 4; i++) {
      const a = corners[i], b = corners[(i + 1) % 4], ha = terrainHeight(a[0], a[1]), hb = terrainHeight(b[0], b[1]);
      if ((ha < level) !== (hb < level)) { const t = (level - ha) / (hb - ha); cross.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    }
    if (cross.length >= 2) for (const p of cross.slice(0, 2)) vertices.push(p[0], level + .18, p[1]);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); return g;
}

export function makeAtmosphere(local = false) {
  const f = field(), rnd = randomSource(local ? 775 : 902);
  for (let i = 0; i < (local ? 1100 : 2100); i++) {
    const x = (rnd() - .5) * (local ? 40 : 200), z = (rnd() - .5) * (local ? 38 : 190);
    const y = rnd() * (local ? 14 : 70) - 1;
    push(f, x, y, z, tint(.45 + rnd() * .5), .5 + rnd() * 1.5, rnd(), 1, .28 + rnd() * .6);
  }
  return buffer(f);
}

export function makeClouds(local = false) {
  const f = field(), rnd = randomSource(local ? 7839 : 9023);
  const centers = local ? [[-9, 1.6, -8], [9, 2.5, -12], [0, .3, -16]] : [[-28, 22, 9], [24, 30, -10], [-8, 42, -15], [8, 12, 30]];
  for (const [cx, cy, cz] of centers) for (let i = 0; i < 280; i++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()), scale = local ? 9 : 18;
    push(f, cx + Math.cos(a) * r * scale, cy + (rnd() - .5) * (local ? 2 : 3), cz + Math.sin(a) * r * scale * .4,
      palette[3 + (i % 2)], 3 + rnd() * 6, rnd(), 3, .3 + rnd() * .5);
  }
  return buffer(f);
}

export function makeStageBamboo() {
  const f = field(), rnd = randomSource(601);
  for (let i = 0; i < 54; i++) {
    const side = i % 2 ? -1 : 1, near = i < 12;
    const x = side * ((near ? 2.9 : 3.8) + rnd() * (near ? 3.1 : 11));
    const z = near ? -.5 - rnd() * 7 : -8 - rnd() * 27;
    const h = 5.5 + rnd() * 6, lean = (rnd() - .5) * 1.8;
    const width = near ? .15 + rnd() * .11 : .06 + rnd() * .11;
    const tone = near ? .06 + rnd() * .18 : .32 + rnd() * .42;
    for (let j = 0; j < (near ? 310 : 155); j++) {
      const t = rnd(), a = rnd() * Math.PI * 2, ring = (t * h) % .71 < .045;
      const r = width * (1 - t * .34) * (ring ? 1.16 : 1);
      push(f, x + lean * t * t + Math.cos(a) * r, h * t, z + Math.sin(a) * r,
        tint(tone + .18 * Math.cos(a) + (ring ? .17 : 0)), .25 + rnd() * .32, rnd(), 2, .12 * t * t);
    }
    for (const ht of [.54, .72, .88, .99]) for (const sign of [-1, 1]) {
      const length = .65 + rnd() * 1.1;
      for (let k = 0; k < 29; k++) {
        const t = rnd();
        push(f, x + lean * ht * ht + sign * t * length, h * ht + .45 * Math.sin(t * 2.65) + (rnd() - .5) * .35 * t,
          z + (rnd() - .5) * .65 * t, tint(tone + .10 + rnd() * .3), .27 + rnd() * .38, rnd(), 2, .24 * t);
      }
    }
  }
  return buffer(f);
}

export function makeFighters() {
  const rnd = randomSource(2109), positions: number[] = [], offsets: number[] = [], parts: number[] = [], ts: number[] = [], sides: number[] = [], sizes: number[] = [], colors: number[] = [], seeds: number[] = [];
  for (const side of [-1, 1]) for (let part = 0; part < 9; part++) {
    const n = part === 0 ? 300 : part === 1 ? 180 : 115;
    for (let i = 0; i < n; i++) {
      const angle = rnd() * Math.PI * 2, v = rnd() * 2 - 1, r = Math.sqrt(1 - v * v);
      const radius = part === 0 ? .23 : part === 1 ? .245 : .11;
      positions.push(0, 0, 0); offsets.push(Math.cos(angle) * r * radius, v * radius, Math.sin(angle) * r * radius * .7);
      parts.push(part); ts.push(rnd()); sides.push(side); sizes.push(.3 + rnd() * .4); seeds.push(rnd());
      const c = new THREE.Color(side < 0 ? '#526e50' : '#a4a275').lerp(new THREE.Color(side < 0 ? '#b5bf96' : '#d1cc9e'), rnd() * .7 + (part === 1 ? .2 : 0));
      colors.push(c.r, c.g, c.b);
    }
  }
  const g = new THREE.BufferGeometry();
  for (const [key, data, count] of [['position', positions, 3], ['aOffset', offsets, 3], ['aPart', parts, 1], ['aT', ts, 1], ['aSide', sides, 1], ['aSize', sizes, 1], ['color', colors, 3], ['aSeed', seeds, 1]] as const) g.setAttribute(key, new THREE.Float32BufferAttribute(data, count));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.2, 0), 5); return g;
}

export function makeTrail() {
  const order = [4, 1, 0, 2, 3];
  const route = order.map((index) => { const a = mountainArenas[index]; return new THREE.Vector3(a.x, 0, a.z); });
  const curve = new THREE.CatmullRomCurve3(route);
  const points = curve.getPoints(220).map((p) => new THREE.Vector3(p.x, terrainHeight(p.x, p.z) + .22, p.z));
  return new THREE.BufferGeometry().setFromPoints(points);
}
