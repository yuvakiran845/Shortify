// Reads and validates environment variables once, so the rest of the code
// can import a clean `config` object instead of touching process.env.

const isProduction = process.env.NODE_ENV === 'production';

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable ${name}. See server/.env.example.`);
  }
  return value;
}

/**
 * PUBLIC_BASE_URL: the address every short link is built from,
 * "<PUBLIC_BASE_URL>/<code>", e.g. https://yourdomain.com/aB7xK9p.
 * It must be a domain that really points at this server (one you own and have
 * configured, see README → "Use your own short domain"). In production it must
 * be a public HTTPS domain: localhost or a private IP would give links that
 * other devices cannot open.
 */
export function parsePublicBaseUrl(value, { production = isProduction } = {}) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('PUBLIC_BASE_URL must be an absolute URL, for example https://yourdomain.com');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('PUBLIC_BASE_URL must start with http:// or https://');
  }
  // Short links are served at the root ("/<code>"), so a path would make every link 404.
  if (url.pathname !== '/' || url.search || url.hash) {
    throw new Error('PUBLIC_BASE_URL must be only the address, without a path, for example https://yourdomain.com');
  }
  if (production) {
    if (url.protocol !== 'https:') throw new Error('PUBLIC_BASE_URL must use https:// in production');
    const host = url.hostname;
    const isIpAddress = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith('[');
    if (host === 'localhost' || host.endsWith('.localhost') || isIpAddress || !host.includes('.')) {
      throw new Error('PUBLIC_BASE_URL must be a public domain in production (e.g. https://yourdomain.com), not localhost or an IP address');
    }
  }
  return url.origin; // "https://yourdomain.com" (no trailing slash; a non-default port is kept)
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

const clientOrigins = parseClientOrigins(process.env.CLIENT_ORIGIN);

export const config = {
  isProduction,
  port: parsePositiveInteger('PORT', 5000),
  mongoUri: required('MONGO_URI'),
  publicBaseUrl: parsePublicBaseUrl(required('PUBLIC_BASE_URL')),
  clientOrigins,
  // The frontend's address, used for "Go to Shortify" links on error pages.
  appUrl: clientOrigins[0],
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
