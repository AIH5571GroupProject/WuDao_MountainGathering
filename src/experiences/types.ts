import type { ComponentType } from 'react';
import type { MountainArenaId, Quality } from '../mountain/model';

export type CollaborativeArenaId = Exclude<MountainArenaId, 'kendo'>;
export type ExperienceAssets = { sceneUrl: string | null; actorUrl: string | null; filmUrl: string | null; ambientAudio: string | null; stageAudio: string | null };
export type ExperienceResult = { score?: number; completed?: boolean; summary?: string };
export type ExperienceContext = {
  version: 1; arenaId: CollaborativeArenaId; language: 'zh' | 'en'; soundEnabled: boolean;
  reducedMotion: boolean; quality: Quality; assets: ExperienceAssets;
};
export type ExperienceProps = ExperienceContext & { paused: boolean; onExit: () => void; onComplete: (result: ExperienceResult) => void };
export type ExperienceEntry =
  | { kind: 'react'; load: () => Promise<{ default: ComponentType<ExperienceProps> }> }
  | { kind: 'iframe'; src: string; camera?: boolean };
export type ArenaExperience = {
  id: CollaborativeArenaId; number: '01' | '02' | '03' | '04' | '05';
  title: { zh: string; en: string }; assets: ExperienceAssets;
  // Null keeps the finished mountain/encounter/chapter flow available while a module is in preparation.
  entry: ExperienceEntry | null;
};
