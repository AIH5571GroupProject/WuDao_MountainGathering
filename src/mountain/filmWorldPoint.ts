import type { MountainArena, Vec3 } from './model';

export function filmWorldPoint(arena: MountainArena, [x, y, z]: readonly [number, number, number]): Vec3 {
  const sin = Math.sin(arena.angle), cos = Math.cos(arena.angle);
  return [arena.x + x * cos + z * sin, arena.elevation + .2 + y, arena.z - x * sin + z * cos];
}
