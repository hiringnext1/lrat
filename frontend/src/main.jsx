import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// GrowLeadz is a dark product: the landing page, auth screens and most of the
// dashboard are written dark-only, while ~17 files carry light styles with
// `dark:` overrides. Deriving the theme from the OS meant light-mode visitors
// got white panels with inherited near-white text — invisible copy on signup,
// onboarding and settings. Until every screen has a real light theme, the dark
// class is always on so both styles resolve to the same look.
document.documentElement.classList.add('dark');

const container = document.getElementById('root');
const app = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// The landing page is pre-rendered at build time (scripts/prerender.mjs), so on
// the homepage we hydrate that markup instead of throwing it away.
if (container.hasChildNodes()) {
  ReactDOM.hydrateRoot(container, app);
} else {
  ReactDOM.createRoot(container).render(app);
}
