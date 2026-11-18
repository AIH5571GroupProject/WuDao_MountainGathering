import type { ArenaExperience } from '../types';

const experience: ArenaExperience = {
  id: 'sumo', number: '05', title: { zh: '相扑', en: 'Sumo' },
  assets: { sceneUrl: null, actorUrl: null, filmUrl: null, ambientAudio: null, stageAudio: null },
  // React: { kind: 'react', load: () => import('./Experience') }
  // Standalone: { kind: 'iframe', src: 'experiences/sumo/index.html' }
  entry: null,
};
export default experience;
