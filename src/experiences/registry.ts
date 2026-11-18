import shaolin from './shaolin';
import wingchun from './wingchun';
import karate from './karate';
import boxing from './boxing';
import sumo from './sumo';
import type { ArenaExperience, CollaborativeArenaId } from './types';

export const arenaExperiences: Record<CollaborativeArenaId, ArenaExperience> = { shaolin, wingchun, karate, boxing, sumo };
