import { arenaExperiences } from '../experiences/registry';
import type { ArenaId } from '../data';
import { isTrainingFilm, trainingFilmPose } from './trainingFilm';

export type MountainArenaId = ArenaId | 'kendo';
export type Phase = 'welcome' | 'arrival' | 'overview' | 'approach' | 'arena' | 'details' | 'returning' | 'opening' | 'closing' | 'game';
export type Quality = 'airy' | 'balanced' | 'full';
export type Vec3 = [number, number, number];
export type MountainArena = {
  id: MountainArenaId; cn: string; en: string; place: string; placeEn: string;
  x: number; z: number; elevation: number; angle: number; color: string;
  line: string; lineEn: string; invitation: string;
  media: { sceneUrl: string | null; actorUrl: string | null; filmUrl: string | null; ambientAudio: string | null; stageAudio: string | null };
};
export type CameraCommand = { sequence: number; kind: 'begin' | 'enter' | 'return' | 'zoom' | 'reset' | 'chapter' | 'encounter'; id?: MountainArenaId; direction?: number };

export function smoothstep(a: number, b: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
export const OUTER_PEAKS = [
  [-132, -106, 62, 46], [14, -177, 89, 51], [136, -104, 74, 48],
  [-209, 26, 53, 62], [204, 21, 69, 57], [-128, 156, 47, 62],
  [131, 178, 54, 68], [-292, -195, 91, 68], [233, -271, 105, 80],
] as const;
export function outerHeight(x: number, z: number) {
  let h = -3;
  for (const [px, pz, height, width] of OUTER_PEAKS) {
    const distance = ((x - px) ** 2 + (z - pz) ** 2) / (width * width);
    h += height * Math.exp(-distance * 1.45);
  }
  return h + Math.sin(x * .031 + z * .017) * 2.4;
}
export function rawHeight(x: number, z: number) {
  const peak = 49 * Math.exp(-(x * x / 1050 + (z + 8) ** 2 / 920));
  const shoulder = 11 * Math.exp(-((x + 24) ** 2 / 430 + (z - 4) ** 2 / 500));
  const ridge = 8 * Math.exp(-((x - 25) ** 2 / 510 + (z + 20) ** 2 / 450));
  const detail = Math.sin(x * .19 + z * .1) * Math.sin(z * .16) * 1.6;
  const outerBlend = smoothstep(61, 95, Math.hypot(x, z));
  return Math.max(-1.5, peak + shoulder + ridge + detail - 2) + outerHeight(x, z) * outerBlend;
}
const definitions = [
  { id: 'shaolin', cn: '少林', en: 'Shaolin', place: '松风院', placeEn: 'Pinewind Court', x: -23, z: -9, color: '#829274', line: '拳从静处起，山风替你记住每一招。', lineEn: 'A quiet stance. A mountain breeze. Every movement leaves an echo.', invitation: '先站稳，再听山风。' },
  { id: 'wingchun', cn: '咏春', en: 'Wing Chun', place: '听竹坪', placeEn: 'Listening Grove', x: -17, z: 23, color: '#9aa37b', line: '寸劲落在竹影间，前方留出一处空地。', lineEn: 'Short strikes meet long shadows in a clearing among the bamboo.', invitation: '一寸之间，自有天地。' },
  { id: 'taekwondo', cn: '跆拳道', en: 'Taekwondo', place: '云石台', placeEn: 'Cloudstone Terrace', x: 18, z: -20, color: '#b0aa7d', line: '一声喝，惊起林梢几片新叶。', lineEn: 'A sharp breath. A few new leaves rise above the grove.', invitation: '让一声呼吸，穿过云雾。' },
  { id: 'boxing', cn: '拳击', en: 'Boxing', place: '回声谷', placeEn: 'Echo Hollow', x: 27, z: 15, color: '#8b9b85', line: '拳风绕过山坳，在竹海里兜一圈再回来。', lineEn: 'A swift cross circles the hollow and returns as an echo.', invitation: '跟着脚步，找自己的节奏。' },
  { id: 'sumo', cn: '相扑', en: 'Sumo', place: '大地席', placeEn: 'Earth Ring', x: 1, z: 37, color: '#a49b79', line: '脚步一沉，整片山林都轻轻晃了一下。', lineEn: 'A grounded step. Even the mountain seems to sway.', invitation: '脚下是山，心中是定。' },
  { id: 'kendo', cn: '剑道', en: 'Kendo', place: '御风台', placeEn: 'Windborne Terrace', x: 0, z: -40, color: '#829274', line: '御剑乘风，在竹影之间读懂来势。', lineEn: 'Ride the wind. Read the next move among the bamboo.', invitation: '循着剑意，进入御风。' },
] as const;
export const mountainArenas: MountainArena[] = definitions.map((a) => ({ ...a,
  elevation: rawHeight(a.x, a.z), angle: Math.atan2(a.x, a.z),
  media: a.id === 'kendo' ? { sceneUrl: null, actorUrl: null, filmUrl: null, ambientAudio: null, stageAudio: null } : arenaExperiences[a.id].assets,
}));
export function terrainHeight(x: number, z: number) {
  let y = rawHeight(x, z);
  for (const arena of mountainArenas) {
    const distance = Math.hypot(x - arena.x, z - arena.z);
    const flat = 1 - smoothstep(4.1, 7, distance);
    y = y * (1 - flat) + arena.elevation * flat;
  }
  return y;
}
export function nearClearing(x: number, z: number, padding = 0) {
  return mountainArenas.some((a) => Math.hypot(x - a.x, z - a.z) < 4.7 + padding);
}
export function randomSource(seed: number) {
  let state = seed >>> 0;
  return () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 4294967296; };
}
export const WELCOME_EYE: Vec3 = [165, 137, 252];
export const WELCOME_TARGET: Vec3 = [0, 35, -38];
export const OVERVIEW_EYE: Vec3 = [72, 70, 104];
export const OVERVIEW_TARGET: Vec3 = [0, 23, 0];
export function stagePose(arena: MountainArena): { eye: Vec3; target: Vec3 } {
  if (isTrainingFilm(arena.id)) return trainingFilmPose(arena, 0);
  if (arena.id === 'kendo') {
    const y = arena.elevation + 3.1;
    return { eye: [arena.x, y, arena.z - 11.2], target: [arena.x, y, arena.z + 30] };
  }
  return { eye: [arena.x + Math.sin(arena.angle) * 8.4, arena.elevation + 3.6, arena.z + Math.cos(arena.angle) * 8.4],
    target: [arena.x, arena.elevation + 1.4, arena.z] };
}
export function safeCameraPoint(point: Vec3): Vec3 {
  return [point[0], Math.max(point[1], terrainHeight(point[0], point[2]) + 2.8), point[2]];
}
export function approachPath(start: Vec3, arena: MountainArena): Vec3[] {
  const end = stagePose(arena).eye;
  const outer: Vec3 = [arena.x + Math.sin(arena.angle) * 25, arena.elevation + 23, arena.z + Math.cos(arena.angle) * 25];
  return [start, safeCameraPoint([start[0] * .65 + outer[0] * .35, Math.max(start[1], outer[1]) + 9, start[2] * .65 + outer[2] * .35]), safeCameraPoint(outer), end];
}
export function qualityFraction(quality: Quality) { return quality === 'airy' ? .48 : quality === 'balanced' ? .73 : 1; }
export function canReturnByZoom(phase: Phase, distance: number, animating: boolean) { return phase === 'arena' && !animating && distance > 19.5; }

export type AudioIntent = { kind: 'near' | 'enter' | 'leave' | 'enabled'; arenaId?: MountainArenaId; enabled: boolean };
export function dispatchAudioIntent(detail: AudioIntent) {
  window.dispatchEvent(new CustomEvent<AudioIntent>('wudao:audio', { detail }));
}
