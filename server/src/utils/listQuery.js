import { HttpError } from './HttpError.js';

export const LINK_SORTS = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  'most-clicks': { clickCount: -1, _id: -1 },
  'fewest-clicks': { clickCount: 1, _id: 1 },
};
export const LINK_STATUSES = ['all', 'active', 'expired', 'disabled'];
export const CLICK_FILTERS = ['all', 'clicked', 'unclicked'];

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 50;
export const MAX_SEARCH_LENGTH = 200;
const MAX_PAGE = 10_000;

const badRequest = (message) => new HttpError(400, message);

// Reads one query-string value. "?search=a&search=b" arrives as an array; we reject that.
function single(query, name) {
  const value = query[name];
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string') throw badRequest(`"${name}" must be a single value.`);
  return value;
}

function integer(query, name, { fallback, min, max }) {
  const raw = single(query, name);
  if (raw === undefined) return fallback;
  if (!/^\d+$/.test(raw)) throw badRequest(`"${name}" must be a whole number.`);
  const value = Number(raw);
  if (value < min || value > max) throw badRequest(`"${name}" must be between ${min} and ${max}.`);
  return value;
}

function oneOf(query, name, allowed, fallback) {
  const value = single(query, name) ?? fallback;
  if (!allowed.includes(value)) throw badRequest(`"${name}" must be one of: ${allowed.join(', ')}.`);
  return value;
}

/**
 * Validates GET /api/links query parameters and fills in defaults:
 *   page    1..10000            (default 1)
 *   limit   1..50               (default 10)
 *   search  text, max 200 chars (default "")
 *   sort    newest | oldest | most-clicks | fewest-clicks
 *   status  all | active | expired | disabled
 *   clicks  all | clicked | unclicked
 */
export function parseListQuery(query) {
  const search = (single(query, 'search') ?? '').trim();
  if (search.length > MAX_SEARCH_LENGTH) {
    throw badRequest(`"search" can be at most ${MAX_SEARCH_LENGTH} characters.`);
  }

  return {
    page: integer(query, 'page', { fallback: 1, min: 1, max: MAX_PAGE }),
    limit: integer(query, 'limit', { fallback: DEFAULT_PAGE_SIZE, min: 1, max: MAX_PAGE_SIZE }),
    search,
    sort: oneOf(query, 'sort', Object.keys(LINK_SORTS), 'newest'),
    status: oneOf(query, 'status', LINK_STATUSES, 'all'),
    clicks: oneOf(query, 'clicks', CLICK_FILTERS, 'all'),
  };
}

// Makes user text safe to use inside a RegExp ("a.c" matches only "a.c", not "abc").
export const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
