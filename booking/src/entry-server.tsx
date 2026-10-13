import { StrictMode } from 'react';
import { renderToString } from 'preact-render-to-string';
import App from './App';

export function render() {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

/**
 * Extra head tags for the prerendered page. The hero is drawn in HTML and CSS
 * (no hero image to preload), so there's nothing to add today.
 */
export function head() {
  return '';
}
