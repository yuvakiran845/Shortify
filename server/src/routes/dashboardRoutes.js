import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getDashboard } from '../services/dashboardService.js';

export function dashboardRoutes() {
  const router = Router();

  // GET /api/dashboard -> { stats: { totalLinks, totalClicks, activeLinks, qrCodes }, recentLinks }
  router.get('/', requireAuth, async (req, res) => {
    res.set('Cache-Control', 'no-store').json(await getDashboard(req.user._id));
  });

  return router;
}
