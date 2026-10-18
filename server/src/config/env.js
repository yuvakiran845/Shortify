// Reads and validates environment variables once, so the rest of the code
// can import a clean `config` object instead of touching process.env.
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const isProduction = process.env.NODE_ENV === 'production';

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable ${name}. See server/.env.example.`);
  }
  return value;
}

function parsePositiveInteger(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a whole number`);
  }
  return value;
}

/**
 * True for addresses that only work on this computer or this local network:
 * localhost, 127.x, private LAN ranges (10.x, 172.16–31.x, 192.168.x),
 * link-local 169.254.x, IPv6 addresses, and *.local / *.localhost names.
 * Short links built on these cannot be opened from other devices on the internet.
 */
export function isLocalOnlyHost(hostname) {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true;
  if (host.startsWith('[')) return true; // IPv6 literal such as [::1]
  return /^(127|10)\.|^192\.168\.|^169\.254\.|^172\.(1[6-9]|2\d|3[01])\./.test(host);
}

/**
 * PUBLIC_BASE_URL: the public address short links are built from,
 * "<PUBLIC_BASE_URL>/<code>", e.g. https://shortify.onrender.com/aB7xK9p.
 * It must be the domain that serves this API's redirect route (see README → Deployment).
 * In production it must be a public HTTPS domain: localhost or a private IP
 * would give links that other devices cannot open.
 */
export function parsePublicBaseUrl(value, { production = isProduction } = {}) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('PUBLIC_BASE_URL must be an absolute URL, for example https://shortify.onrender.com');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('PUBLIC_BASE_URL must start with http:// or https://');
  }
  // Short links are served at the root ("/<code>"), so a path would make every link 404.
  if (url.pathname !== '/' || url.search || url.hash) {
    throw new Error('PUBLIC_BASE_URL must be only the address, without a path, for example https://shortify.onrender.com');
  }
  if (production) {
    if (url.protocol !== 'https:') throw new Error('PUBLIC_BASE_URL must use https:// in production');
    // A raw IP address (even a public one) is not accepted either: links need a real domain with HTTPS.
    const isIpAddress = /^\d{1,3}(\.\d{1,3}){3}$/.test(url.hostname);
    if (isLocalOnlyHost(url.hostname) || isIpAddress || !url.hostname.includes('.')) {
      throw new Error(
        'PUBLIC_BASE_URL must be a public domain in production (e.g. https://shortify.onrender.com), not localhost or a local/private IP address',
      );
    }
  }
  return url.origin; // "https://shortify.onrender.com" (no trailing slash; a non-default port is kept)
}

/**
 * Picks the public base URL from the environment.
 * - PUBLIC_BASE_URL is the setting; APP_BASE_URL (its name in an earlier
 *   version) is still accepted so older .env files keep working.
 * - Production: required. There is deliberately no fallback, so a missing
 *   value stops the server instead of producing localhost links.
 * - Development: defaults to http://localhost:<PORT>, with a warning.
 */
export function readPublicBaseUrl({ env = process.env, production = isProduction, port = 5000 } = {}) {
  const current = env.PUBLIC_BASE_URL?.trim();
  const legacy = env.APP_BASE_URL?.trim();
  if (current && legacy && current !== legacy) {
    throw new Error('PUBLIC_BASE_URL and APP_BASE_URL are both set to different values. Keep only PUBLIC_BASE_URL.');
  }
  const value = current || legacy;
  if (value) return parsePublicBaseUrl(value, { production });
  if (production) {
    throw new Error(
      'PUBLIC_BASE_URL is required in production: the public HTTPS address of this server, e.g. https://shortify.onrender.com',
    );
  }
  console.warn(`PUBLIC_BASE_URL is not set: short links will use http://localhost:${port} (this computer only).`);
  return `http://localhost:${port}`;
}

/**
 * COOKIE_SAME_SITE: "lax" (default) or "none".
 * "lax" is right when the browser loads the app from the same site as the API
 * (one-service deployment, or a frontend that proxies /api). "none" is only for
 * a frontend on a different site calling the API directly; browsers then
 * require HTTPS ("Secure"), and some (e.g. Safari) may still block such cookies.
 */
export function parseCookieSameSite(value, { production = isProduction } = {}) {
  const sameSite = (value || 'lax').trim().toLowerCase();
  if (!['lax', 'strict', 'none'].includes(sameSite)) {
    throw new Error('COOKIE_SAME_SITE must be "lax", "strict", or "none"');
  }
  if (sameSite === 'none' && !production) {
    throw new Error('COOKIE_SAME_SITE=none needs HTTPS, so it is only allowed with NODE_ENV=production');
  }
  return sameSite;
}

/**
 * CLIENT_DIST_DIR: optional folder with the built React app (client/dist).
 * When set, this server also serves the website, so the app, the API, and the
 * short links share one public address (the simplest deployment).
 */
function parseClientDistDir(value) {
  if (!value?.trim()) return null;
  const dir = resolve(value.trim());
  if (!existsSync(join(dir, 'index.html'))) {
    throw new Error(`CLIENT_DIST_DIR "${dir}" has no index.html. Build the frontend first: npm run build (in client/).`);
  }
  return dir;
}

// The JWT secret signs every login session. Anyone who knows it can forge
// sessions, so it must be long and random (not a word like "secret").
function parseJwtSecret() {
  const secret = required('JWT_SECRET');
  const howToGenerate = `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`;
  if (secret.length < 32) {
    throw new Error(`JWT_SECRET must be at least 32 characters. Generate one with: ${howToGenerate}`);
  }
  // The placeholder in .env.example is public, so it must never be used as a real secret.
  if (secret.startsWith('replace-with')) {
    throw new Error(`JWT_SECRET is still the example placeholder. Generate a real one with: ${howToGenerate}`);
  }
  return secret;
}

/**
 * CLIENT_ORIGIN: the frontend address(es) allowed to call the API, comma-separated.
 * The browser compares origins exactly, so a common mistake such as a trailing
 * slash ("https://app.example.com/") would silently break every request.
 * Each entry is therefore parsed and reduced to its origin, and anything with
 * a path is rejected with a clear message at startup.
 */
export function parseClientOrigins(value, { production = isProduction } = {}) {
  if (!value?.trim()) {
    if (production) {
      throw new Error('CLIENT_ORIGIN is required in production: the frontend address, e.g. https://shortify.example.com');
    }
    return ['http://localhost:5173'];
  }
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      let url;
      try {
        url = new URL(entry);
      } catch {
        throw new Error(`CLIENT_ORIGIN "${entry}" is not a valid URL. Use the frontend address, e.g. https://shortify.example.com`);
      }
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error(`CLIENT_ORIGIN "${entry}" must start with http:// or https://`);
      }
      if (url.pathname !== '/' || url.search || url.hash) {
        throw new Error(`CLIENT_ORIGIN "${entry}" must be only an origin, without a path (e.g. https://shortify.example.com)`);
      }
      if (production && url.protocol !== 'https:') {
        throw new Error(`CLIENT_ORIGIN "${entry}" must use https:// in production`);
      }
      return url.origin;
    });
}

const port = parsePositiveInteger('PORT', 5000);
const publicBaseUrl = readPublicBaseUrl({ port });
const clientDistDir = parseClientDistDir(process.env.CLIENT_DIST_DIR);
// When this server also serves the website, the frontend lives at the public address itself.
const clientOrigins = parseClientOrigins(process.env.CLIENT_ORIGIN || (clientDistDir ? publicBaseUrl : undefined));

export const config = {
  isProduction,
  port,
  mongoUri: required('MONGO_URI'),
  publicBaseUrl,
  clientOrigins,
  // The frontend's address, used for "Go to Shortify" links on error pages.
  appUrl: clientOrigins[0],
  clientDistDir,
  cookieSameSite: parseCookieSameSite(process.env.COOKIE_SAME_SITE),
  trustProxy: parsePositiveInteger('TRUST_PROXY', 0),
  // Overall API requests per IP address per minute (a safety net for every endpoint).
  apiLimitPerMinute: parsePositiveInteger('API_LIMIT_PER_MINUTE', 300),
  createLinkLimitPerMinute: parsePositiveInteger('CREATE_LINK_LIMIT_PER_MINUTE', 20),
  redirectLimitPerMinute: parsePositiveInteger('REDIRECT_LIMIT_PER_MINUTE', 120),
  // Repeat clicks by the same visitor on the same link within this window count once.
  clickDedupeWindowMs: parsePositiveInteger('CLICK_DEDUPE_SECONDS', 30) * 1000,

  // ----- Accounts -----
  jwtSecret: parseJwtSecret(),
  sessionDays: parsePositiveInteger('SESSION_DAYS', 7),
  // bcrypt work factor: each +1 doubles hashing time. 12 ≈ a few hundred ms (tests use 4).
  bcryptRounds: parsePositiveInteger('BCRYPT_ROUNDS', 12),
  loginLimitPer15Minutes: parsePositiveInteger('LOGIN_LIMIT_PER_15_MINUTES', 10),
  registerLimitPerHour: parsePositiveInteger('REGISTER_LIMIT_PER_HOUR', 10),
};
