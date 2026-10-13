// Client-side check that mirrors the server rules (server/src/utils/url.js).
// It gives instant feedback; the server still validates every request,
// because anyone can call the API without using this form.

export const MAX_URL_LENGTH = 2048;
const SCHEME_PATTERN = /^[a-z][a-z\d+.-]*:(?!\d)/i;

const fail = (message) => ({ ok: false, message });

export function validateUrl(input) {
  const value = typeof input === 'string' ? input.trim() : '';
  if (!value) return fail('Enter a URL to shorten.');
  if (value.length > MAX_URL_LENGTH) return fail(`URLs can be at most ${MAX_URL_LENGTH} characters long.`);

  let url;
  try {
    url = new URL(SCHEME_PATTERN.test(value) ? value : `https://${value}`);
  } catch {
    return fail('Enter a valid URL, like https://example.com/page.');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return fail('Only http:// and https:// links are supported.');
  }
  if (url.username || url.password) {
    return fail('URLs containing a username or password are not allowed.');
  }
  const hostname = url.hostname.toLowerCase();
  if (hostname === 'localhost' || !hostname.includes('.') || hostname.endsWith('.')) {
    return fail('Enter a complete web address with a domain, like example.com.');
  }

  return { ok: true, url: url.href };
}

/**
 * URLs allowed in a QR code: everything validateUrl accepts, plus Shortify
 * short links themselves (even on "localhost" during development).
 * `shortLinkBaseUrl` comes from GET /api/config. Mirrors normalizeQrUrl on the server.
 */
export function validateQrUrl(input, { shortLinkBaseUrl } = {}) {
  const value = typeof input === 'string' ? input.trim() : '';
  if (shortLinkBaseUrl && /^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const isShortLink = url.origin === new URL(shortLinkBaseUrl).origin;
      if (isShortLink && !url.username && !url.password && url.href.length <= MAX_URL_LENGTH) {
        return { ok: true, url: url.href };
      }
    } catch {
      // not a valid URL: the normal rules below report the problem
    }
  }
  return validateUrl(input);
}
