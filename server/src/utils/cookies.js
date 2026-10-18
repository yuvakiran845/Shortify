import { config } from '../config/env.js';

// Settings shared by every cookie Shortify sets.
export const baseCookieOptions = {
  httpOnly: true, // JavaScript in the page cannot read it (protects against XSS theft)
  // "lax" (default): not sent on cross-site POST/PUT/DELETE requests (first CSRF defense).
  // "none" only for a frontend on another site that calls the API directly (see COOKIE_SAME_SITE).
  sameSite: config.cookieSameSite,
  secure: config.isProduction, // only over HTTPS in production (required for SameSite=None)
  path: '/api', // only sent to the API, never to short-link redirects
};

// To delete a cookie the browser needs the same path/sameSite/secure it was set with.
export function clearCookie(res, name) {
  res.clearCookie(name, baseCookieOptions);
}
