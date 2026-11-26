import type { ArenaExperience } from '../types';

const experience: ArenaExperience = {
  id: 'taekwondo', number: '03', title: { zh: '跆拳道', en: 'Taekwondo' },
  assets: { sceneUrl: null, actorUrl: null, filmUrl: null, ambientAudio: null, stageAudio: null },
  // React: { kind: 'react', load: () => import('./Experience') }
  // Standalone: { kind: 'iframe', src: 'experiences/taekwondo/index.html' }
  entry: null,
};
export default experience;
