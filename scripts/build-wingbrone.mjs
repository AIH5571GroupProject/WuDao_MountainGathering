import { build } from 'vite';
import { resolve } from 'node:path';
// Source is kept beside Budo; shared MediaPipe models already live in the public bundle.
// To update: npm ci --prefix integrations/wingbrone, then npm run build:wingbrone.
await build({ root: resolve('integrations/wingbrone'), base: './', publicDir: false,
  build: { outDir: resolve('public/experiences/wingbrone'), emptyOutDir: false, sourcemap: false } });
