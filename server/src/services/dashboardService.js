import { Link } from '../models/Link.js';
import { countQrCodes } from './qrService.js';
import { NOT_DELETED, toLinkResponse } from './linkService.js';

export const RECENT_LINKS_LIMIT = 5;

/**
 * Link totals for one user, computed inside MongoDB in a single pass:
 * $match picks the user's links (uses the owner index), $group adds them up.
 * "Active" means switched on and not past its expiry date (same rule as the
 * status filter on My Links).
 */
async function linkTotals(userId, now) {
  const [totals] = await Link.aggregate([
    { $match: { owner: userId, ...NOT_DELETED } },
    {
      $group: {
        _id: null,
        totalLinks: { $sum: 1 },
        totalClicks: { $sum: '$clickCount' },
        activeLinks: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$isActive', true] },
                  {
                    $or: [
                      { $eq: [{ $ifNull: ['$expiresAt', null] }, null] },
                      { $gt: ['$expiresAt', now] },
                    ],
                  },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);
  // A user with no links gets no group at all, so default everything to 0.
  return {
    totalLinks: totals?.totalLinks ?? 0,
    totalClicks: totals?.totalClicks ?? 0,
    activeLinks: totals?.activeLinks ?? 0,
  };
}

// Everything the Overview page needs, fetched in parallel.
export async function getDashboard(userId, now = new Date()) {
  const [totals, qrCodes, recent] = await Promise.all([
    linkTotals(userId, now),
    countQrCodes(userId),
    Link.find({ owner: userId, ...NOT_DELETED }).sort({ createdAt: -1, _id: -1 }).limit(RECENT_LINKS_LIMIT).lean(),
  ]);

  return {
    stats: { ...totals, qrCodes },
    recentLinks: recent.map((link) => toLinkResponse(link, now)),
  };
}
