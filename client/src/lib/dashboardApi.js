import { apiRequest } from './api';

// GET /api/dashboard ->
// { stats: { totalLinks, totalClicks, activeLinks, qrCodes }, recentLinks: [link, ...] }
export function getDashboard({ signal } = {}) {
  return apiRequest('/dashboard', { signal });
}
