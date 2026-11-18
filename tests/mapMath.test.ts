import { describe, expect, it } from 'vitest';
import { atlasSize, boundView, easeOut, focusView, HOME_VIEW, zoomAt } from '../src/mapMath';
import { arenas } from '../src/data';

describe('map navigation stays finite and covers the viewport', () => {
  for (const size of [{ width: 1280, height: 720 }, { width: 1600, height: 900 }, { width: 2556, height: 1078 }, { width: 1024, height: 768 }]) {
    it(`keeps all five clearings visible when focused at ${size.width} × ${size.height}`, () => {
      const art = atlasSize(size);
      for (const arena of arenas) {
        const view = focusView(arena.mapPoint, size);
        const x = size.width / 2 + view.x + (arena.mapPoint[0] - .5) * art.width * view.zoom;
        const y = size.height / 2 + view.y + (arena.mapPoint[1] - .5) * art.height * view.zoom;
        expect(x).toBeGreaterThan(70);
        expect(x).toBeLessThan(size.width - 70);
        expect(y).toBeGreaterThan(110);
        expect(y).toBeLessThan(size.height - 130);
        // The detail card is on the opposite side of the focused clearing.
        if (arena.mapPoint[0] > .65) expect(x).toBeGreaterThan(size.width * .5);
        else expect(x).toBeLessThan(size.width * .56);
      }
    });
    it(`never reveals empty space after repeated extreme input at ${size.width} × ${size.height}`, () => {
      const art = atlasSize(size);
      let view = HOME_VIEW;
      for (let i = 0; i < 1000; i++) {
        view = zoomAt(view, view.zoom * (i % 11 < 5 ? 1.3 : .7), { x: Math.sin(i) * size.width, y: Math.cos(i) * size.height }, size);
        view = boundView({ ...view, x: view.x + Math.sin(i) * 10000, y: view.y + Math.cos(i) * 10000 }, size);
        expect(Object.values(view).every(Number.isFinite)).toBe(true);
        expect(view.zoom).toBeGreaterThanOrEqual(1);
        expect(view.zoom).toBeLessThanOrEqual(2.4);
        expect(Math.abs(view.x) + size.width / 2).toBeLessThanOrEqual(art.width * view.zoom / 2 + 1e-6);
        expect(Math.abs(view.y) + size.height / 2).toBeLessThanOrEqual(art.height * view.zoom / 2 + 1e-6);
      }
      expect(boundView(HOME_VIEW, size)).toEqual(HOME_VIEW);
    });
  }
  it('zooms around the cursor instead of jumping back to the center', () => {
    const before = { x: 20, y: -30, zoom: 1.5 }, cursor = { x: 110, y: 85 };
    const after = zoomAt(before, 1.8, cursor, { width: 1600, height: 900 });
    expect((cursor.x - after.x) / after.zoom).toBeCloseTo((cursor.x - before.x) / before.zoom);
    expect((cursor.y - after.y) / after.zoom).toBeCloseTo((cursor.y - before.y) / before.zoom);
  });
  it('interpolation converges without the old negative damping overshoot', () => {
    let previous = 0;
    for (let i = 0; i <= 100; i++) {
      const value = easeOut(i / 100);
      expect(value).toBeGreaterThanOrEqual(previous);
      expect(value).toBeLessThanOrEqual(1);
      previous = value;
    }
    expect(easeOut(1)).toBe(1);
  });
});
