import { config } from '../config/env.js';

// Settings shared by every cookie Shortify sets.
export const baseCookieOptions = {
  httpOnly: true, // JavaScript in the page cannot read it (protects against XSS theft)
  sameSite: 'lax', // not sent on cross-site POST/PUT/DELETE requests (first CSRF defense)
  secure: config.isProduction, // only over HTTPS in production
  path: '/api', // only sent to the API, never to short-link redirects
};

// To delete a cookie the browser needs the same path/sameSite/secure it was set with.
export function clearCookie(res, name) {
  res.clearCookie(name, baseCookieOptions);
}
