import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getAnalytics } from '../services/analyticsService.js';
import { parseAnalyticsQuery } from '../utils/analyticsQuery.js';

export function analyticsRoutes() {
  const router = Router();

  // GET /api/analytics?from=<ISO>&to=<ISO>&tz=<IANA zone>&linkId=<optional>
  router.get('/', requireAuth, async (req, res) => {
    const query = parseAnalyticsQuery(req.query);
    res.set('Cache-Control', 'no-store').json(await getAnalytics(req.user._id, query));
  });

  return router;
}
