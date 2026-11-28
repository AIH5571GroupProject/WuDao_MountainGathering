import { boxingCameraPose, boxingLens, boxingShots } from './boxingShots';
import { sumoCameraPose, sumoLens, sumoShots } from './sumoShots';
import type { MountainArena } from './model';

export type TrainingFilmId = 'sumo' | 'boxing';

export function isTrainingFilm(id: string | null | undefined): id is TrainingFilmId {
  return id === 'sumo' || id === 'boxing';
}

export const trainingFilms = {
  sumo: { shots: sumoShots, pose: sumoCameraPose, lens: sumoLens },
  boxing: { shots: boxingShots, pose: boxingCameraPose, lens: boxingLens },
};

export function trainingFilmPose(arena: MountainArena, shot: number, time = 0) {
  return trainingFilms[arena.id === 'boxing' ? 'boxing' : 'sumo'].pose(arena, shot, time);
}
