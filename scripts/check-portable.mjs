import { readFile } from 'node:fs/promises';
import { Script } from 'node:vm';
const html = await readFile('demo/wudao-mountain-demo.html', 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)];
if (scripts.length !== 1) throw new Error('Expected one embedded script.');
if (/<script[^>]+src\s*=|<link[^>]+href\s*=|@import\s+url/i.test(html)) throw new Error('Portable page contains an external script or stylesheet.');
if (!html.includes('<div id="root"></div>') || !html.includes('<style>')) throw new Error('Portable page is missing its app root or CSS.');
new Script(scripts[0][1], { filename: 'wudao-portable.js' });
console.log('Portable HTML verified: one syntactically valid embedded script, embedded CSS, app root, no external script or stylesheet tags.');
