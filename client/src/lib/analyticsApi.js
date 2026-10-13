import { apiRequest } from './api';

// GET /api/analytics?from=&to=&tz=&linkId= ->
// { range, link, totals, timeline, topLinks, sources, devices, recentClicks }
export function getAnalytics({ from, to, timeZone, linkId }, { signal } = {}) {
  return apiRequest('/analytics', { query: { from, to, tz: timeZone, linkId }, signal });
}
