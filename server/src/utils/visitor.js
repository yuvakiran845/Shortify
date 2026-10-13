import { createHash } from 'node:crypto';

// Crawlers, link-preview fetchers (Slack, WhatsApp, Facebook...) and headless
// browsers open links automatically. They are redirected but not counted.
const AUTOMATED_AGENT_PATTERN =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|whatsapp|skypeuripreview|vkshare|pinterest|lighthouse|headless/i;

/**
 * Decides whether a redirect request should count as a click.
 * Not counted:
 *  - HEAD requests (only check that the link exists, nobody is visiting)
 *  - browser prefetch / prerender (the user has not actually clicked yet)
 *  - requests with no User-Agent, and known bots / link previewers
 */
export function isCountableVisit(req) {
  if (req.method !== 'GET') return false;

  const purpose = `${req.get('sec-purpose') || ''} ${req.get('purpose') || ''}`;
  if (/prefetch|prerender/i.test(purpose)) return false;

  const userAgent = req.get('user-agent');
  if (!userAgent) return false;
  return !AUTOMATED_AGENT_PATTERN.test(userAgent);
}

/**
 * Coarse device type from the User-Agent. Only this one word is stored, never
 * the full User-Agent string (which can help fingerprint a person).
 * Tablets are checked first: Android tablets omit "Mobile"; iPads say "iPad".
 */
export function deviceTypeFromUserAgent(userAgent = '') {
  if (/iPad|Tablet|PlayBook|Silk|Kindle|Android(?!.*Mobile)/i.test(userAgent)) return 'tablet';
  if (/Mobi|iPhone|iPod|Android|Windows Phone|Opera Mini/i.test(userAgent)) return 'mobile';
  if (/Windows NT|Macintosh|Mac OS X|X11|Linux|CrOS/i.test(userAgent)) return 'desktop';
  return 'other';
}

/**
 * The referring website's domain, e.g. "news.ycombinator.com".
 * Only the hostname is kept: paths and query strings can contain personal
 * data (search terms, ids, tokens), so they are thrown away.
 * Returns null when there is no (valid http/https) referrer: a "direct" visit.
 */
export function referrerHostFrom(req) {
  const referrer = req.get('referer');
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.hostname.toLowerCase().replace(/^www\./, '').slice(0, 255) || null;
  } catch {
    return null;
  }
}

// A one-way hash of link + IP + browser. Used only as an in-memory key for a
// few seconds to spot repeat clicks; it is never written to the database.
export function visitorKey(linkId, req) {
  return createHash('sha256')
    .update(`${linkId}|${req.ip}|${req.get('user-agent') || ''}`)
    .digest('base64url');
}
