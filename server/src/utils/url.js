import { HttpError } from './HttpError.js';

export const MAX_URL_LENGTH = 2048;

// "javascript:", "mailto:", "data:" ... A colon followed by a digit is a port
// ("example.com:8080"), not a scheme, so it is excluded.
const SCHEME_PATTERN = /^[a-z][a-z\d+.-]*:(?!\d)/i;

const invalid = (message) => new HttpError(400, message, { field: 'url' });

/**
 * Validates a destination URL typed by a user and returns its normalized form.
 * Rules:
 *  - "example.com/page" (no scheme) is treated as "https://example.com/page"
 *  - only http and https are allowed (blocks javascript:, data:, file:, ftp: ...)
 *  - must have a real domain (contains a dot), not "localhost"
 *  - must not contain a username/password (used in phishing: https://bank.com@evil.com)
 *  - must not point back to our own short-link domain (would create redirect loops)
 * The URL is only parsed, never requested, so the server cannot be used to probe other hosts.
 */
export function normalizeDestinationUrl(input, { ownHost } = {}) {
  if (typeof input !== 'string' || input.trim() === '') {
    throw invalid('Enter a URL to shorten.');
  }

  let value = input.trim();
  if (value.length > MAX_URL_LENGTH) {
    throw invalid(`URLs can be at most ${MAX_URL_LENGTH} characters long.`);
  }

  if (!SCHEME_PATTERN.test(value)) {
    value = `https://${value}`;
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw invalid('Enter a valid URL, like https://example.com/page.');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw invalid('Only http:// and https:// links are supported.');
  }
  if (url.username || url.password) {
    throw invalid('URLs containing a username or password are not allowed.');
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname === 'localhost' || !hostname.includes('.') || hostname.endsWith('.')) {
    throw invalid('Enter a complete web address with a domain, like example.com.');
  }
  if (ownHost && url.host.toLowerCase() === ownHost.toLowerCase()) {
    throw invalid('This is already a Shortify link.');
  }

  const normalized = url.href;
  if (normalized.length > MAX_URL_LENGTH) {
    throw invalid(`URLs can be at most ${MAX_URL_LENGTH} characters long.`);
  }
  return normalized;
}

/**
 * URL rules for QR codes: the same as for shortening, except that a Shortify
 * short link itself is allowed (making a QR code for a short link is the point),
 * even when the short-link domain is "localhost" during development.
 */
export function normalizeQrUrl(input, { shortLinkBaseUrl }) {
  if (typeof input === 'string' && /^https?:\/\//i.test(input.trim())) {
    let url;
    try {
      url = new URL(input.trim());
    } catch {
      url = null;
    }
    const base = new URL(shortLinkBaseUrl);
    if (url && url.origin === base.origin && !url.username && !url.password && url.href.length <= MAX_URL_LENGTH) {
      return url.href;
    }
  }
  return normalizeDestinationUrl(input);
}

/**
 * Re-checks a stored destination right before redirecting (defense in depth:
 * protects visitors even if a bad value reached the database some other way).
 * Unlike user input, a stored URL must already include http:// or https://,
 * otherwise the browser would treat it as a path on our own domain.
 */
export function isSafeRedirectTarget(value, { ownHost } = {}) {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) return false;
  try {
    normalizeDestinationUrl(value, { ownHost });
    return true;
  } catch {
    return false;
  }
}
