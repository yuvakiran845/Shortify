import { validateUrl } from './validateUrl.js';

// Form helpers for creating and editing links. They mirror the server rules
// (server/src/utils/linkFields.js) for instant feedback; the server re-checks everything.

export const ALIAS_MIN_LENGTH = 3;
export const ALIAS_MAX_LENGTH = 50;
export const TITLE_MAX_LENGTH = 100;
const ALIAS_PATTERN = /^[A-Za-z0-9_-]+$/;
const RESERVED_ALIASES = new Set([
  'api', 'admin', 'app', 'auth', 'login', 'logout', 'signup', 'register', 'account', 'settings',
  'dashboard', 'links', 'analytics', 'qr', 'shorten', 'help', 'about', 'health', 'status',
  'static', 'assets', 'robots', 'favicon', 'www', 'ui',
]);

// Returns an error message, or null when valid. An empty alias means "pick a random code".
export function aliasError(value) {
  const alias = value.trim();
  if (!alias) return null;
  if (alias.length < ALIAS_MIN_LENGTH || alias.length > ALIAS_MAX_LENGTH) {
    return `Aliases must be ${ALIAS_MIN_LENGTH}-${ALIAS_MAX_LENGTH} characters long.`;
  }
  if (!ALIAS_PATTERN.test(alias)) return 'Use only letters, numbers, hyphens (-), and underscores (_).';
  if (RESERVED_ALIASES.has(alias.toLowerCase())) return `"${alias}" is reserved. Please choose another alias.`;
  return null;
}

export function titleError(value) {
  return value.trim().length > TITLE_MAX_LENGTH ? `Titles can be at most ${TITLE_MAX_LENGTH} characters.` : null;
}

// <input type="datetime-local"> works in local time with values like "2026-10-13T15:30".
const pad = (number) => String(number).padStart(2, '0');
export function toLocalInputValue(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
// "2026-10-13T15:30" is read as local time by the Date constructor.
export const fromLocalInputValue = (value) => new Date(value).toISOString();

export function expiryError(localValue, now = new Date()) {
  if (!localValue) return 'Choose when the link should expire.';
  const date = new Date(localValue);
  if (Number.isNaN(date.getTime())) return 'Enter a valid date and time.';
  if (date <= now) return 'The expiration date must be in the future.';
  return null;
}

// A sensible default for "add an expiration date": one week from now.
export const defaultExpiryInput = (now = new Date()) =>
  toLocalInputValue(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));

/**
 * Compares the edit form with the saved link and returns
 *   { changes, errors }
 * `changes` only contains fields that really changed (that is what PATCH sends),
 * so re-saving an untouched past expiry date can never cause an error.
 * form: { url, title, alias, hasExpiry, expiresAt (local input value), isActive }
 */
export function buildLinkChanges(link, form, now = new Date()) {
  const changes = {};
  const errors = {};

  const urlCheck = validateUrl(form.url);
  if (!urlCheck.ok) errors.url = urlCheck.message;
  else if (urlCheck.url !== link.originalUrl) changes.url = form.url.trim();

  const title = form.title.trim();
  const titleProblem = titleError(form.title);
  if (titleProblem) errors.title = titleProblem;
  else if ((title || null) !== (link.title ?? null)) changes.title = title || null;

  const alias = form.alias.trim();
  if (!alias) errors.alias = 'Enter an alias for this link.';
  else if (aliasError(alias)) errors.alias = aliasError(alias);
  else if (alias !== link.shortCode) changes.alias = alias;

  if (!form.hasExpiry) {
    if (link.expiresAt) changes.expiresAt = null;
  } else {
    const unchanged = link.expiresAt && form.expiresAt === toLocalInputValue(link.expiresAt);
    if (!unchanged) {
      const problem = expiryError(form.expiresAt, now);
      if (problem) errors.expiresAt = problem;
      else changes.expiresAt = fromLocalInputValue(form.expiresAt);
    }
  }

  if (form.isActive !== link.isActive) changes.isActive = form.isActive;

  return { changes, errors };
}
