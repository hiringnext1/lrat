import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import Landing from './pages/Landing';

/**
 * Build-time rendering entry point.
 *
 * The app is a client-side SPA, so crawlers used to receive an empty
 * <div id="root"></div>. This renders the public landing page to HTML during
 * the build, which is injected into dist/index.html by scripts/prerender.mjs.
 * The client then hydrates that markup (see main.jsx).
 */
export function render(url = '/') {
  return renderToString(
    <StaticRouter location={url}>
      <Landing />
    </StaticRouter>
  );
}
