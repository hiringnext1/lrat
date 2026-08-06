/**
 * Injects the build-time rendered landing page into dist/index.html.
 *
 * Runs after both Vite builds:
 *   1. `vite build`                        → dist/ (client bundle + index.html)
 *   2. `vite build --ssr src/entry-server.jsx --outDir dist-ssr`
 *
 * Without this step crawlers (and every LLM crawler, which does not execute
 * JavaScript) see an empty <div id="root"></div> on growleadz.co.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const templatePath = resolve(root, 'dist/index.html');
const serverEntry = resolve(root, 'dist-ssr/entry-server.js');

if (!existsSync(templatePath)) {
  console.error('[prerender] dist/index.html not found — run `vite build` first');
  process.exit(1);
}
if (!existsSync(serverEntry)) {
  console.error('[prerender] dist-ssr/entry-server.js not found — run the SSR build first');
  process.exit(1);
}

const { render } = await import(pathToFileURL(serverEntry).href);
const html = render('/');

const template = readFileSync(templatePath, 'utf8');
const marker = '<div id="root"></div>';

if (!template.includes(marker)) {
  console.error(`[prerender] marker ${marker} not found in dist/index.html — skipping injection`);
  process.exit(1);
}

// Keep the untouched template as app.html — the backend serves it for every
// non-homepage route so /login, /dashboard etc. don't flash the landing page.
writeFileSync(resolve(root, 'dist/app.html'), template, 'utf8');

writeFileSync(templatePath, template.replace(marker, `<div id="root">${html}</div>`), 'utf8');

const textLength = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length;
console.log(`[prerender] landing page injected into dist/index.html (${html.length} bytes of HTML, ~${textLength} chars of text)`);
