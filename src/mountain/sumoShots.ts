import type { MountainArena, Vec3 } from './model';

export const sumoShots = [
  { title: '土俵', en: 'The ring', caption: '沿屋形中轴缓缓靠近，土俵在檐下显露。', captionEn: 'Follow the pavilion’s axis as the ring comes into view beneath the eaves.', duration: 7500,
    eye: [0, 2.45, 19.2], target: [0, 3.4, 0] },
  { title: '撒盐', en: 'Salt ritual', caption: '两位力士先后撒盐，静候盐粒落在土俵上。', captionEn: 'The wrestlers take turns casting salt and let it settle on the ring.', duration: 6500,
    eye: [0, 2.7, 10], target: [0, 1.6, 0] },
  { title: '仕切', en: 'Ready position', caption: '两人隔着仕切线沉身相对，比赛尚未开始。', captionEn: 'Across the starting lines, both wrestlers crouch and wait.', duration: 0,
    eye: [-4.6, 2.2, 4.2], target: [.3, 1.05, -.2] },
] as const;

export function sumoCameraPose(arena: MountainArena, shot: number, time = 0) {
  const frame = sumoShots[shot] ?? sumoShots[0];
  const sin = Math.sin(arena.angle), cos = Math.cos(arena.angle);
  const toWorld = ([x, y, z]: readonly [number, number, number]): Vec3 =>
    [arena.x + x * cos + z * sin, arena.elevation + .2 + y, arena.z - x * sin + z * cos];
  // Leave a quiet beat at each end, then move forward on the same axis at a nearly fixed height.
  const t = shot === 0 ? Math.max(0, Math.min(1, (time - .7) / 5.95)) : 0;
  const glide = t * t * (3 - 2 * t);
  const eye = toWorld([frame.eye[0], frame.eye[1] - .12 * glide, frame.eye[2] - 6.5 * glide]);
  const target = toWorld([frame.target[0], frame.target[1] + .54 * glide, frame.target[2]]);
  return { eye, target };
}

export function sumoLens(shot: number, aspect: number) {
  const horizontal = (shot === 0 ? 72 : 58) * Math.PI / 180;
  const vertical = 2 * Math.atan(Math.tan(horizontal / 2) / aspect) * 180 / Math.PI;
  return Math.min(86, Math.max(shot === 0 ? 71 : 44, vertical));
}
