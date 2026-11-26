import shaolin from './shaolin';
import wingchun from './wingchun';
import taekwondo from './taekwondo';
import boxing from './boxing';
import sumo from './sumo';
import type { ArenaExperience, CollaborativeArenaId } from './types';

export const arenaExperiences: Record<CollaborativeArenaId, ArenaExperience> = { shaolin, wingchun, taekwondo, boxing, sumo };
