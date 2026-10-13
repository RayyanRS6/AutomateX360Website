// Runs after `vite build`: renders the page to static HTML so it paints
// before any JavaScript loads (important for ad traffic on slow phones), and
// inlines the stylesheet to save a network round trip.
import { readFileSync, rmSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const ssrDir = resolve(root, 'dist-ssr');

const entry = readdirSync(ssrDir).find((f) => /^entry-server\.(m?js)$/.test(f));
const { render, head } = await import(pathToFileURL(resolve(ssrDir, entry)).href);

const htmlPath = resolve(dist, 'index.html');
let html = readFileSync(htmlPath, 'utf8');

// Replacer functions, not strings: the page copy is full of "$" amounts, and
// string replacements would treat "$&", "$'" and "$$" as special patterns.
html = html.replace('<!--app-html-->', () => render());
html = html.replace('<!--head-tags-->', () => head());

// Inline the CSS file(s).
html = html.replace(/<link rel="stylesheet"[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/g, (_, href) => {
  const css = readFileSync(resolve(dist, href.slice(1)), 'utf8');
  return `<style>${css}</style>`;
});

writeFileSync(htmlPath, html);
rmSync(ssrDir, { recursive: true, force: true });
console.log(`prerendered ${htmlPath} (${(Buffer.byteLength(html) / 1024).toFixed(1)} KB)`);
