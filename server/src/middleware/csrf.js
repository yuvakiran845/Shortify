import { randomBytes, timingSafeEqual } from 'node:crypto';
import { baseCookieOptions } from '../utils/cookies.js';

/**
 * CSRF protection (a malicious site making the user's browser send requests to our API).
 *
 * Layer 1: session cookies are SameSite=Lax, so browsers do not attach them to
 *          cross-site POST/PUT/PATCH/DELETE requests.
 * Layer 2 (this file): "double submit" token. The frontend asks
 *          GET /api/csrf-token for a random token (also stored in an HttpOnly
 *          cookie) and sends it back in the X-CSRF-Token header on every
 *          state-changing request. Another website cannot read our token (CORS
 *          blocks reading the response), so it cannot send a matching header.
 */
export const CSRF_COOKIE = 'shortify_csrf';
export const CSRF_HEADER = 'x-csrf-token';
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// GET /api/csrf-token -> { csrfToken }. Reuses the current token if there is one.
export function issueCsrfToken(req, res) {
  let token = req.cookies?.[CSRF_COOKIE];
  if (typeof token !== 'string' || !TOKEN_PATTERN.test(token)) {
    token = randomBytes(32).toString('base64url');
    res.cookie(CSRF_COOKIE, token, baseCookieOptions);
  }
  res.set('Cache-Control', 'no-store').json({ csrfToken: token });
}

function tokensMatch(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length || !TOKEN_PATTERN.test(a)) {
    return false;
  }
  // Constant-time comparison: does not leak how many characters matched.
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function requireCsrfToken(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  if (tokensMatch(req.get(CSRF_HEADER), req.cookies?.[CSRF_COOKIE])) return next();
  return res.status(403).json({
    message: 'Your session needs refreshing. Please reload the page and try again.',
    code: 'CSRF_INVALID',
  });
}
