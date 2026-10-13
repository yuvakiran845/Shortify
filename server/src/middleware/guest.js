import { createHash, randomBytes } from 'node:crypto';
import { baseCookieOptions, clearCookie } from '../utils/cookies.js';

/**
 * Guest ownership: lets people shorten links before creating an account.
 *
 * The browser that creates a link while logged out receives a random secret in
 * an HttpOnly cookie. Links store only the SHA-256 hash of that secret. When
 * the person signs up or logs in, those links move into their account
 * (see claimGuestLinks in services/authService.js).
 */
export const GUEST_COOKIE = 'shortify_guest';

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/; // 32 random bytes, base64url-encoded

const hashToken = (token) => createHash('sha256').update(token).digest('hex');

// Reads the guest cookie (if any) into req.guestKeyHash. Never creates one.
export function readGuest(req, res, next) {
  const token = req.cookies?.[GUEST_COOKIE];
  req.guestKeyHash = typeof token === 'string' && TOKEN_PATTERN.test(token) ? hashToken(token) : null;
  next();
}

// Logged-out visitors get a guest identity the first time they create a link.
export function ensureGuest(req, res, next) {
  if (!req.user && !req.guestKeyHash) {
    const token = randomBytes(32).toString('base64url');
    res.cookie(GUEST_COOKIE, token, { ...baseCookieOptions, maxAge: ONE_YEAR_MS });
    req.guestKeyHash = hashToken(token);
  }
  next();
}

export function clearGuest(res) {
  clearCookie(res, GUEST_COOKIE);
}

/**
 * The single place that decides "whose links can this request see?".
 * Every query for private link data starts with this filter.
 */
export function ownerFilter(req) {
  if (req.user) return { owner: req.user._id };
  if (req.guestKeyHash) return { guestKeyHash: req.guestKeyHash };
  return null;
}
