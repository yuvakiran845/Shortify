import { Router } from 'express';
import { config } from '../config/env.js';
import { createRedirectHandler } from '../controllers/redirectController.js';
import { redirectRateLimit } from '../middleware/rateLimit.js';
import { RecentClickCache } from '../utils/RecentClickCache.js';

/**
 * Public routes on the short-link domain. Mounted AFTER all /api routes, so a
 * code can never shadow the API. "/:code" only matches a single path segment.
 */
export function redirectRoutes({ redirectLimitPerMinute, clickDedupeWindowMs }) {
  const router = Router();
  const clickCache = new RecentClickCache({ windowMs: clickDedupeWindowMs });

  // Ask well-behaved crawlers not to follow short links (they would not be counted anyway).
  router.get('/robots.txt', (req, res) => {
    res.type('text/plain').send('User-agent: *\nDisallow: /\n');
  });

  // The bare short domain sends people to the Shortify app.
  router.get('/', (req, res) => res.redirect(302, config.appUrl));

  router.get('/:code', redirectRateLimit(redirectLimitPerMinute), createRedirectHandler({ clickCache }));

  return router;
}
