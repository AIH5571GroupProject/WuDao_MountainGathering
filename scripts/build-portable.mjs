import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const result = await build({
  configFile: false,
  plugins: [react()],
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    write: false,
    lib: { entry: resolve('src/main.tsx'), name: 'WuDaoMountain', formats: ['iife'], fileName: () => 'wudao.js' },
    cssCodeSplit: false,
    minify: 'esbuild',
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
const outputs = (Array.isArray(result) ? result : [result]).flatMap((r) => r.output);
const js = outputs.filter((o) => o.type === 'chunk').map((o) => o.code).join('\n').replace(/<\/script/gi, '<\\/script');
const css = outputs.filter((o) => o.type === 'asset' && o.fileName.endsWith('.css')).map((o) => String(o.source)).join('\n');
if (!js || !css) throw new Error('Portable build did not contain both JavaScript and CSS.');
const html = `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="description" content="武道山集：一座高山、六处场地与剑道三幕。"><title>武道山集 · 高山探索 Demo</title><style>${css}</style></head><body><div id="root"></div><script>${js}</script></body></html>`;
await mkdir('demo', { recursive: true });
const destination = resolve('demo/wudao-mountain-demo.html');
await writeFile(destination, html, 'utf8');
console.log(`Portable demo: ${destination} (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB)`);
