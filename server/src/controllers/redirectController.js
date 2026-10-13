import { config } from '../config/env.js';
import { findLinkForRedirect, recordClick } from '../services/linkService.js';
import { SHORT_CODE_PATTERN } from '../utils/shortCode.js';
import { isSafeRedirectTarget } from '../utils/url.js';
import { deviceTypeFromUserAgent, isCountableVisit, referrerHostFrom, visitorKey } from '../utils/visitor.js';
import { LINK_ERRORS, sendLinkError } from '../views/linkErrorPage.js';

const ownHost = new URL(config.publicBaseUrl).host;

/**
 * GET /:code  ->  302 redirect to the link's original URL.
 *
 * Why 302 (temporary) and not 301 (permanent)? Browsers cache 301 redirects
 * forever, so later clicks would skip our server: they would not be counted,
 * and changing or disabling the link would have no effect for those visitors.
 *
 * `clickCache` remembers recent visitors so repeat clicks are not double-counted.
 */
export function createRedirectHandler({ clickCache }) {
  return async function redirectToOriginalUrl(req, res) {
    const { code } = req.params;
    if (!SHORT_CODE_PATTERN.test(code)) {
      return sendLinkError(req, res, LINK_ERRORS.notFound);
    }

    let link;
    try {
      link = await findLinkForRedirect(code);
    } catch (error) {
      console.error('Redirect lookup failed:', error.message);
      return sendLinkError(req, res, LINK_ERRORS.unavailable);
    }

    // A former alias of a renamed link is reserved but no longer a link: "not found".
    if (!link || link.formerCodeOf) return sendLinkError(req, res, LINK_ERRORS.notFound);
    if (link.deletedAt) return sendLinkError(req, res, LINK_ERRORS.deleted);
    if (!link.isActive) return sendLinkError(req, res, LINK_ERRORS.disabled);
    if (link.expiresAt && link.expiresAt <= new Date()) return sendLinkError(req, res, LINK_ERRORS.expired);

    if (!isSafeRedirectTarget(link.originalUrl, { ownHost })) {
      console.warn(`Blocked redirect for code "${code}": stored destination failed the safety check.`);
      return sendLinkError(req, res, LINK_ERRORS.blocked);
    }

    if (isCountableVisit(req) && clickCache.isFirstClick(visitorKey(link._id, req))) {
      const userAgent = req.get('user-agent');
      // never throws; a failure only means one uncounted click
      await recordClick(link, {
        ip: req.ip,
        userAgent,
        referrerHost: referrerHostFrom(req),
        deviceType: deviceTypeFromUserAgent(userAgent),
      });
    }

    res.set({
      'Cache-Control': 'no-store', // every click must reach the server
      'X-Robots-Tag': 'noindex', // keep short links out of search results
    });
    return res.redirect(302, link.originalUrl);
  };
}
