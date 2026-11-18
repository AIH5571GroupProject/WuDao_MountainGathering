import type { ArenaExperience } from '../types';

const experience: ArenaExperience = {
  id: 'karate', number: '03', title: { zh: '空手道', en: 'Karate' },
  assets: { sceneUrl: null, actorUrl: null, filmUrl: null, ambientAudio: null, stageAudio: null },
  // React: { kind: 'react', load: () => import('./Experience') }
  // Standalone: { kind: 'iframe', src: 'experiences/karate/index.html' }
  entry: null,
};
export default experience;
