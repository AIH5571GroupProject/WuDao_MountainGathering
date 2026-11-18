import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { approachPath, canReturnByZoom, mountainArenas, OUTER_PEAKS, OVERVIEW_EYE, qualityFraction, rawHeight, safeCameraPoint, stagePose, terrainHeight } from '../src/mountain/model';
import { makeDepthTerrain, makeFighters, makeMountainField, makeSurroundingMountains } from '../src/mountain/geometry';

describe('mountain layout and continuous camera paths', () => {
  it('has one high summit above six separated clearings', () => {
    let summit = 0;
    for (let x = -55; x <= 55; x += 2) for (let z = -55; z <= 55; z += 2) summit = Math.max(summit, terrainHeight(x, z));
    expect(summit).toBeGreaterThan(47);
    expect(summit - Math.max(...mountainArenas.map((a) => a.elevation))).toBeGreaterThan(7);
    expect(new Set(mountainArenas.map((a) => a.id)).size).toBe(6);
    for (let i = 0; i < mountainArenas.length; i++) for (let j = i + 1; j < mountainArenas.length; j++) {
      expect(Math.hypot(mountainArenas[i].x - mountainArenas[j].x, mountainArenas[i].z - mountainArenas[j].z)).toBeGreaterThan(14);
    }
  });
  it('flattens real practice grounds into the slope without abrupt edges', () => {
    for (const a of mountainArenas) {
      for (let i = 0; i < 20; i++) {
        const angle = i * Math.PI / 10;
        expect(terrainHeight(a.x + Math.cos(angle) * 3.8, a.z + Math.sin(angle) * 3.8)).toBeCloseTo(a.elevation, 8);
      }
      expect(a.elevation).toBeCloseTo(rawHeight(a.x, a.z));
      const inside = terrainHeight(a.x + 6.999, a.z), outside = terrainHeight(a.x + 7.001, a.z);
      expect(Math.abs(inside - outside)).toBeLessThan(.01);
    }
  });
  it('keeps every sampled approach above the mountain and arrives at human scale', () => {
    for (const a of mountainArenas) {
      const pose = stagePose(a);
      const curve = new THREE.CatmullRomCurve3(approachPath(OVERVIEW_EYE, a).map((p) => new THREE.Vector3(...p)));
      for (let i = 0; i <= 120; i++) {
        const p = safeCameraPoint(curve.getPoint(i / 120).toArray() as [number, number, number]);
        expect(p.every(Number.isFinite)).toBe(true);
        expect(p[1] - terrainHeight(p[0], p[2])).toBeGreaterThanOrEqual(2.799999);
      }
      expect(curve.getPoint(1).distanceTo(new THREE.Vector3(...pose.eye))).toBeLessThan(.0001);
      const camera = new THREE.PerspectiveCamera(44, 1920 / 1080, .1, 700);
      camera.position.set(...pose.eye); camera.lookAt(new THREE.Vector3(...pose.target)); camera.updateMatrixWorld();
      const head = new THREE.Vector3(a.x, a.elevation + 2.4, a.z).project(camera);
      const feet = new THREE.Vector3(a.x, a.elevation + .2, a.z).project(camera);
      const pixelHeight = Math.abs(head.y - feet.y) * 540;
      if (a.id === 'kendo') {
        expect(pose.eye[0]).toBe(pose.target[0]);
        expect(pose.eye[1]).toBe(pose.target[1]);
        expect(pixelHeight).toBeGreaterThan(200);
      } else {
        expect(pixelHeight).toBeGreaterThan(280);
      }
      expect(pixelHeight).toBeLessThan(580);
    }
  });
  it('only returns from an established arena, never in the middle of an approach', () => {
    expect(canReturnByZoom('arena', 20, false)).toBe(true);
    expect(canReturnByZoom('arena', 10, false)).toBe(false);
    expect(canReturnByZoom('approach', 100, false)).toBe(false);
    expect(canReturnByZoom('arena', 100, true)).toBe(false);
    expect(canReturnByZoom('details', 100, false)).toBe(false);
  });
});

describe('procedural buffers remain repeatable and finite', () => {
  it('changes the visible budget without changing point identities', () => {
    const first = makeMountainField(), second = makeMountainField();
    const positions = first.getAttribute('position').array;
    expect(Array.from(positions.slice(0, 60))).toEqual(Array.from(second.getAttribute('position').array.slice(0, 60)));
    expect(Array.from(positions).every(Number.isFinite)).toBe(true);
    expect(positions.length / 3).toBeGreaterThan(20000);
    const saved = Array.from(positions.slice(0, 60));
    const full = first.getAttribute('position').count;
    first.setDrawRange(0, Math.floor(full * qualityFraction('airy')));
    expect(first.drawRange.count).toBeLessThan(full * .5);
    expect(Array.from(positions.slice(0, 60))).toEqual(saved);
    first.dispose(); second.dispose();
  });
  it('extends the landscape beyond the old platform and adds distant peaks on every side', () => {
    const landscape = makeSurroundingMountains(), points = landscape.getAttribute('position');
    const xs: number[] = [], zs: number[] = [];
    for (let i = 0; i < points.count; i++) { xs.push(points.getX(i)); zs.push(points.getZ(i)); }
    expect(Math.min(...xs)).toBeLessThan(-450); expect(Math.max(...xs)).toBeGreaterThan(450);
    expect(Math.min(...zs)).toBeLessThan(-450); expect(Math.max(...zs)).toBeGreaterThan(450);
    for (const [x,z] of OUTER_PEAKS) expect(terrainHeight(x,z)).toBeGreaterThan(35);
    expect([...xs,...zs].every(Number.isFinite)).toBe(true);
    landscape.dispose();
  });
  it('uses the same terrain function for the visible field and occlusion mesh', () => {
    const mesh = makeDepthTerrain(), positions = mesh.getAttribute('position');
    for (let i = 0; i < positions.count; i += 117) {
      expect(positions.getY(i)).toBeCloseTo(terrainHeight(positions.getX(i), positions.getZ(i)) - .08, 3);
    }
    mesh.dispose();
  });
  it('provides stable parts for two GPU animated placeholder fighters', () => {
    const g = makeFighters();
    const parts = Array.from(g.getAttribute('aPart').array), sides = Array.from(g.getAttribute('aSide').array);
    expect(new Set(parts).size).toBe(9);
    expect(new Set(sides)).toEqual(new Set([-1, 1]));
    expect(g.getAttribute('aSize').count).toBeGreaterThan(2000);
    expect(Array.from(g.getAttribute('aOffset').array).every(Number.isFinite)).toBe(true);
    g.dispose();
  });
});
