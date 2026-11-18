import { build, preview } from 'vite';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const origin = 'http://127.0.0.1:5173';
const marker = 'wudao-local-review';

async function main() {
  let running;
  try {
    running = await fetch(origin, { signal: AbortSignal.timeout(2000), cache: 'no-store' });
  } catch { /* No existing server. Build and start this project's preview below. */ }
  if (running) {
    if (running.ok && running.headers.get('X-WuDao-Preview') === marker) {
      console.log('WuDao preview is already running: ' + origin);
      return;
    }
    throw new Error('Port 5173 is occupied by another server. Close that server before starting WuDao.');
  }

  console.log('Preparing the WuDao review build...');
  await build({ root: projectRoot, base: './', build: { outDir: 'review-dist', emptyOutDir: true } });
  const server = await preview({
    root: projectRoot,
    configFile: false,
    base: './',
    build: { outDir: resolve(projectRoot, 'review-dist') },
    preview: {
      host: '127.0.0.1', port: 5173, strictPort: true,
      headers: { 'Cache-Control': 'no-store', 'X-WuDao-Preview': marker },
    },
  });
  console.log('WuDao is ready: ' + origin);
  console.log('Keep this process running while reviewing. Ctrl+C stops the preview.');
  const stop = () => server.httpServer.close(() => process.exit(0));
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
