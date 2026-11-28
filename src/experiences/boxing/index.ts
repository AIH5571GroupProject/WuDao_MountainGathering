import type { ArenaExperience } from '../types';

const experience: ArenaExperience = {
  id: 'boxing', number: '04', title: { zh: '拳击', en: 'Boxing' },
  assets: { sceneUrl: null, actorUrl: null, filmUrl: null, ambientAudio: null, stageAudio: null },
  // React: { kind: 'react', load: () => import('./Experience') }
  // Standalone: { kind: 'iframe', src: 'experiences/boxing/index.html' }
  // Leave null until the game is merged. The mountain portal renders the reserved page automatically.
  entry: null,
};
export default experience;
