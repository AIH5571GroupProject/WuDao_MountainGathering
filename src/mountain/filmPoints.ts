import { BufferGeometry, Color, Float32BufferAttribute, Vector3 } from 'three';
import type { Vec3 } from './model';

export const shades = (colors: string[]) => colors.map(color => new Color(color));
export class Points {
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
