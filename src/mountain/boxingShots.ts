import type { MountainArena } from './model';
import { filmWorldPoint } from './filmWorldPoint';

export const boxingShots = [
  {
    title: '空击', en: 'Shadowboxing', caption: '隔着围绳，看一人在空拳台上缓缓移步。', captionEn: 'Beyond the ropes, a lone boxer moves across an empty ring.',
    credit: '《愤怒的公牛》 · 1980', creditEn: 'Raging Bull · 1980', duration: 7000,
    eye: [0, 1.52, 9.3], target: [0, 1.38, -.4],
  },
  {
    title: '找拍', en: 'Find the rhythm', caption: '拳馆一角，速度球在灯下往复，短促的回弹逐渐连成节拍。', captionEn: 'Under a gym light, the speed bag rebounds in a steady rhythm.',
    credit: '《百万美元宝贝》 · 2004', creditEn: 'Million Dollar Baby · 2004', duration: 6500,
    eye: [1.65, 2.02, 6.05], target: [.06, 1.82, -.6],
  },
  {
    title: '蓄势', en: 'Strength', caption: '镜头贴近帆布，拳手单臂下沉、撑起，反复练习。', captionEn: 'From canvas height, watch the boxer repeat one-arm push-ups.',
    credit: '《洛奇》 · 1976', creditEn: 'Rocky · 1976', duration: 0,
    eye: [1.15, .62, 5.9], target: [.03, .93, -.12],
  },
] as const;

export function boxingCameraPose(arena: MountainArena, shot: number, time = 0) {
  const frame = boxingShots[shot] ?? boxingShots[0];
  const t = Math.max(0, Math.min(1, (time - .55) / 5.4));
  const glide = t * t * (3 - 2 * t);
  return {
    eye: filmWorldPoint(arena, [frame.eye[0] - (shot === 1 ? .36 * glide : 0), frame.eye[1], frame.eye[2] - (shot === 0 ? .85 * glide : 0)]),
    target: filmWorldPoint(arena, frame.target),
  };
}

export function boxingLens(shot: number, aspect: number) {
  const minHorizontal = (shot === 0 ? 58 : 57) * Math.PI / 180;
  const portrait = 2 * Math.atan(Math.tan(minHorizontal / 2) / aspect) * 180 / Math.PI;
  return Math.min(84, Math.max(shot === 0 ? 44 : 43, portrait));
}
