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
 * Extra head tags for the prerendered page. The hero's laptop and phone are
 * drawn in HTML and CSS (no screenshot to preload), so there's nothing to add.
 */
export function head() {
  return '';
}
