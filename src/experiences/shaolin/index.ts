import type { ArenaExperience } from '../types';

const experience: ArenaExperience = {
  id: 'shaolin', number: '01', title: { zh: '少林', en: 'Shaolin' },
  assets: { sceneUrl: null, actorUrl: null, filmUrl: null, ambientAudio: null, stageAudio: null },
  // React: { kind: 'react', load: () => import('./Experience') }
  // Standalone: { kind: 'iframe', src: 'experiences/shaolin/index.html' }
  entry: null,
};
export default experience;
