import type { ArenaExperience } from '../types';

const experience: ArenaExperience = {
  id: 'wingchun', number: '02', title: { zh: '咏春', en: 'Wing Chun' },
  assets: { sceneUrl: null, actorUrl: null, filmUrl: null, ambientAudio: null, stageAudio: null },
  // React: { kind: 'react', load: () => import('./Experience') }
  // Standalone: { kind: 'iframe', src: 'experiences/wingchun/index.html' }
  entry: null,
};
export default experience;
