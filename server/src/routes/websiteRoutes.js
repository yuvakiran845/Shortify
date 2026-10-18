import { join } from 'node:path';
import express, { Router } from 'express';

/**
 * The pages of the React app (see client/src/App.jsx). Only these exact paths
 * load the website; every other single-segment path is a short code handled by
 * the redirect route. Random codes and aliases can never be one of these words
 * (they are reserved, see utils/linkFields.js), so the two never collide.
 */
export const APP_PAGES = ['/', '/login', '/signup', '/shorten', '/qr', '/dashboard', '/links'];

/**
 * Serves the built React app (client/dist) from this server, so the website,
 * the API, and the short links share one public address. Used only when
 * CLIENT_DIST_DIR is set (one-service deployment).
 */
export function websiteRoutes(distDir) {
  const router = Router();
  const indexHtml = join(distDir, 'index.html');

  // Built files have a content hash in their name (index-3f2a1c.js), so they never
  // change: browsers may keep them for a year.
  router.use('/assets', express.static(join(distDir, 'assets'), { immutable: true, maxAge: '1y', index: false }));
  // Other public files such as favicon.svg.
  router.use(express.static(distDir, { index: false }));

  router.get(APP_PAGES, (req, res) => {
    // Always check for a new index.html, which points at the latest built files.
    res.set('Cache-Control', 'no-cache');
    res.sendFile(indexHtml);
  });

  return router;
}
