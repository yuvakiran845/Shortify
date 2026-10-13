import { HttpError } from './HttpError.js';

// Validation for the editable parts of a link (used when creating and editing).

export const ALIAS_MIN_LENGTH = 3;
export const ALIAS_MAX_LENGTH = 50;
export const TITLE_MAX_LENGTH = 100;
const MAX_EXPIRY_YEARS = 10;

const ALIAS_PATTERN = /^[A-Za-z0-9_-]+$/;

// Names that look like pages or system paths. Blocked (in any letter case) so a
// short link can never be confused with part of the app or the API.
export const RESERVED_ALIASES = new Set([
  'api', 'admin', 'app', 'auth', 'login', 'logout', 'signup', 'register', 'account', 'settings',
  'dashboard', 'links', 'analytics', 'qr', 'shorten', 'help', 'about', 'health', 'status',
  'static', 'assets', 'robots', 'favicon', 'www', 'ui',
]);

const invalid = (field, message) => new HttpError(400, message, { field });

// Custom alias: 3-50 letters, digits, "-" or "_", not reserved.
export function validateAlias(value) {
  if (typeof value !== 'string') throw invalid('alias', 'The alias must be text.');
  const alias = value.trim();
  if (alias.length < ALIAS_MIN_LENGTH || alias.length > ALIAS_MAX_LENGTH) {
    throw invalid('alias', `Aliases must be ${ALIAS_MIN_LENGTH}-${ALIAS_MAX_LENGTH} characters long.`);
  }
  if (!ALIAS_PATTERN.test(alias)) {
    throw invalid('alias', 'Use only letters, numbers, hyphens (-), and underscores (_).');
  }
  if (RESERVED_ALIASES.has(alias.toLowerCase())) {
    throw invalid('alias', `"${alias}" is reserved. Please choose another alias.`);
  }
  return alias;
}

// Optional label shown in your link list. Empty means "no title".
export function validateTitle(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') throw invalid('title', 'The title must be text.');
  const title = value.trim();
  if (title.length > TITLE_MAX_LENGTH) throw invalid('title', `Titles can be at most ${TITLE_MAX_LENGTH} characters.`);
  return title || null;
}

// Expiration: null (never expires) or an ISO date-time in the future, at most 10 years ahead.
export function validateExpiresAt(value, now = new Date()) {
  if (value === null || value === '') return null;
  if (typeof value !== 'string') throw invalid('expiresAt', 'The expiration date must be a date-time.');
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw invalid('expiresAt', 'Enter a valid expiration date and time.');
  if (date <= now) throw invalid('expiresAt', 'The expiration date must be in the future.');
  const limit = new Date(now);
  limit.setFullYear(limit.getFullYear() + MAX_EXPIRY_YEARS);
  if (date > limit) throw invalid('expiresAt', `Links can expire at most ${MAX_EXPIRY_YEARS} years from now.`);
  return date;
}

export function validateIsActive(value) {
  if (typeof value !== 'boolean') throw invalid('isActive', '"isActive" must be true or false.');
  return value;
}
