import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import '@fontsource/instrument-serif/latin-400.css';
import '@fontsource/instrument-serif/latin-400-italic.css';
import '@fontsource-variable/inter-tight/wght.css';
import './index.css';
import App from './App';

const root = document.getElementById('root')!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// The production build ships prerendered HTML (scripts/prerender.mjs), so the
// page is readable before any JavaScript runs; React then hydrates it. In dev
// the root only holds a placeholder comment, so it renders from scratch.
if (root.firstElementChild) hydrateRoot(root, app);
else createRoot(root).render(app);
// Lets the inline guard in index.html stop blocking form submits.
(window as Window & { __hydrated?: boolean }).__hydrated = true;
