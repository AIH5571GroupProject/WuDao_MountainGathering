import type { ArenaExperience } from '../types';

const experience: ArenaExperience = {
  id: 'sumo', number: '05', title: { zh: '相扑', en: 'Sumo' },
  assets: { sceneUrl: null, actorUrl: null, filmUrl: null, ambientAudio: null, stageAudio: null },
  // Standalone alternative: { kind: 'iframe', src: 'experiences/sumo/index.html' }
  entry: { kind: 'react', load: () => import('./Experience') },
};
export default experience;
