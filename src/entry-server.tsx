import { StrictMode } from 'react';
import { renderToString } from 'preact-render-to-string';
import App from './App';
import { heroWork } from './content';
import { HERO_FOLD_SIZES, HERO_FOLD_WIDTHS } from './sections/Hero';
import { workSrcSet } from './components/ui';

export function render() {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

/**
 * Head tags for the prerendered page: preload the hero screenshot on desktop,
 * where it is the largest thing on screen. On phones the headline is, so the
 * image is left to load normally behind the fonts.
 */
export function head() {
  const set = workSrcSet(heroWork, 'fold', HERO_FOLD_WIDTHS);
  return `<link rel="preload" as="image" type="image/webp" imagesrcset="${set}" imagesizes="${HERO_FOLD_SIZES}" media="(min-width: 1024px)" fetchpriority="high">`;
}
