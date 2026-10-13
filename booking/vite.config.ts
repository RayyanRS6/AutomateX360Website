import { defineConfig, type Plugin } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';

// The code is written against the React API. At build time it runs on
// Preact through preact/compat (the preset aliases react and react-dom),
// which ships about a third of the JavaScript: a real difference on low-end
// phones. To switch back to React, swap this preset for @vitejs/plugin-react.

// Preload the latin Instrument Serif files, so the hero headline renders in
// the brand face without a late swap. Inter Tight is not preloaded: its swap
// doesn't move the layout, and skipping it leaves bandwidth for the hero.
function preloadFonts(): Plugin {
  const wanted = [/instrument-serif-latin-400-normal.*\.woff2$/, /instrument-serif-latin-400-italic.*\.woff2$/];
  return {
    name: 'preload-fonts',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html;
        const tags = Object.keys(ctx.bundle)
          .filter((f) => wanted.some((r) => r.test(f)))
          .map((f) => `<link rel="preload" href="/${f}" as="font" type="font/woff2" crossorigin>`)
          .join('\n    ');
        return html.replace('<!--font-preloads-->', tags);
      },
    },
  };
}

export default defineConfig({
  plugins: [preact(), tailwindcss(), preloadFonts()],
  // Bundle dependencies into the prerender build too, so libraries that
  // import "react" (lucide-react) get the same Preact alias as the browser.
  ssr: { noExternal: true },
  server: { port: 5184 },
  preview: { port: 4184 },
});
