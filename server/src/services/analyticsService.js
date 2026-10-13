import { Click } from '../models/Click.js';
import { Link } from '../models/Link.js';
import { HttpError } from '../utils/HttpError.js';
import { daysInRange } from '../utils/analyticsQuery.js';
import { buildShortUrl, NOT_DELETED } from './linkService.js';

const TOP_LINKS = 5;
const TOP_SOURCES = 7; // the rest are folded into one "Other sites" row
const RECENT_CLICKS = 10;

/**
 * Click analytics for one user over a date range, optionally for one link.
 *
 * $match uses the { owner, clickedAt } index to read only this user's clicks
 * in the range. $facet then runs several small pipelines over those same
 * documents in one round trip: totals, clicks per day, top links, sources,
 * devices, and the latest clicks.
 */
export async function getAnalytics(ownerId, { from, to, timeZone, linkId }) {
  let link = null;
  if (linkId) {
    // Filtering by owner here means another user's link id is simply "not found".
    link = await Link.findOne({ _id: linkId, owner: ownerId, ...NOT_DELETED }).select('shortCode originalUrl').lean();
    if (!link) throw new HttpError(404, 'Link not found.');
  }

  const match = { owner: ownerId, clickedAt: { $gte: from, $lte: to } };
  if (link) match.link = link._id;

  const [facets] = await Click.aggregate([
    { $match: match },
    {
      $facet: {
        clicks: [{ $count: 'value' }],
        // Distinct daily visitor hashes (see visitorService.js). Clicks without a
        // hash are still counted as clicks, just not as visitors.
        uniqueVisitors: [
          { $match: { visitorId: { $type: 'string' } } },
          { $group: { _id: '$visitorId' } },
          { $count: 'value' },
        ],
        // Group by calendar day in the user's own time zone.
        byDay: [
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$clickedAt', timezone: timeZone } },
              clicks: { $sum: 1 },
              visitors: { $addToSet: '$visitorId' },
            },
          },
          { $project: { clicks: 1, uniqueVisitors: { $size: { $setDifference: ['$visitors', [null]] } } } },
        ],
        topLinks: [
          { $group: { _id: '$link', clicks: { $sum: 1 } } },
          { $sort: { clicks: -1, _id: 1 } },
          { $limit: TOP_LINKS },
        ],
        sources: [{ $group: { _id: '$referrerHost', clicks: { $sum: 1 } } }, { $sort: { clicks: -1, _id: 1 } }],
        devices: [{ $group: { _id: '$deviceType', clicks: { $sum: 1 } } }, { $sort: { clicks: -1, _id: 1 } }],
        recent: [
          { $sort: { clickedAt: -1, _id: -1 } },
          { $limit: RECENT_CLICKS },
          { $project: { link: 1, clickedAt: 1, referrerHost: 1, deviceType: 1 } },
        ],
      },
    },
  ]);

  // Short code + original URL for every link mentioned above, in one query.
  const linkIds = [...facets.topLinks.map((row) => row._id), ...facets.recent.map((click) => click.link)];
  const linkDocs = await Link.find({ _id: { $in: linkIds }, owner: ownerId, ...NOT_DELETED })
    .select('shortCode originalUrl')
    .lean();
  const linksById = new Map(linkDocs.map((doc) => [String(doc._id), doc]));
  const linkInfo = (id) => {
    const doc = linksById.get(String(id));
    // A link deleted later (Level 9) keeps its old clicks in the totals.
    if (!doc) return { id: String(id), deleted: true };
    return { id: String(id), shortCode: doc.shortCode, shortUrl: buildShortUrl(doc.shortCode), originalUrl: doc.originalUrl };
  };

  // Every day in the range, including days with zero clicks.
  const byDay = new Map(facets.byDay.map((row) => [row._id, row]));
  const timeline = daysInRange(from, to, timeZone).map((date) => ({
    date,
    clicks: byDay.get(date)?.clicks ?? 0,
    uniqueVisitors: byDay.get(date)?.uniqueVisitors ?? 0,
  }));

  const sources = facets.sources.slice(0, TOP_SOURCES).map((row) => ({ source: row._id, clicks: row.clicks }));
  const otherSourceClicks = facets.sources.slice(TOP_SOURCES).reduce((sum, row) => sum + row.clicks, 0);
  if (otherSourceClicks > 0) sources.push({ source: 'other', clicks: otherSourceClicks, isOther: true });

  return {
    range: { from, to, timeZone, days: timeline.length },
    link: link ? linkInfo(link._id) : null,
    totals: {
      clicks: facets.clicks[0]?.value ?? 0,
      uniqueVisitors: facets.uniqueVisitors[0]?.value ?? 0,
    },
    timeline,
    topLinks: facets.topLinks.map((row) => ({ link: linkInfo(row._id), clicks: row.clicks })),
    sources,
    devices: facets.devices.map((row) => ({ device: row._id, clicks: row.clicks })),
    recentClicks: facets.recent.map((click) => ({
      id: String(click._id),
      clickedAt: click.clickedAt,
      link: linkInfo(click.link),
      source: click.referrerHost,
      device: click.deviceType,
    })),
  };
}
