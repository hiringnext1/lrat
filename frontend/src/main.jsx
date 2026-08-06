import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  document.documentElement.classList.add('dark');
}

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
