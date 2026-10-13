import { config } from '../config/env.js';
import { ownerFilter } from '../middleware/guest.js';
import { HttpError } from '../utils/HttpError.js';
import { validateAlias, validateExpiresAt, validateIsActive, validateTitle } from '../utils/linkFields.js';
import { parseListQuery } from '../utils/listQuery.js';
import { normalizeDestinationUrl } from '../utils/url.js';
import {
  createShortLink,
  deleteLink,
  findOwnedLink,
  listLinks,
  toLinkResponse,
  updateLink,
} from '../services/linkService.js';

const ownHost = new URL(config.publicBaseUrl).host;
const has = (body, field) => body[field] !== undefined;

// POST /api/links   { url, alias?, title?, expiresAt? }
// Logged in: the link belongs to the account. Logged out: to this browser's
// guest identity, and only a plain URL is allowed (aliases are for accounts,
// so anonymous visitors cannot reserve names).
// Express 5 forwards errors thrown in async handlers to the error middleware.
export async function createLink(req, res) {
  const body = req.body ?? {};
  const originalUrl = normalizeDestinationUrl(body.url, { ownHost });

  const wantsOptions = ['alias', 'title', 'expiresAt'].some((field) => has(body, field) && body[field] !== '' && body[field] !== null);
  if (wantsOptions && !req.user) {
    throw new HttpError(401, 'Log in to use custom aliases, titles, and expiration dates.', { field: 'alias' });
  }

  const link = await createShortLink(originalUrl, {
    owner: req.user?._id ?? null,
    guestKeyHash: req.user ? null : req.guestKeyHash,
    alias: has(body, 'alias') && body.alias !== '' && body.alias !== null ? validateAlias(body.alias) : undefined,
    title: has(body, 'title') ? validateTitle(body.title) : null,
    expiresAt: has(body, 'expiresAt') ? validateExpiresAt(body.expiresAt) : null,
  });
  res.status(201).json({ link: toLinkResponse(link) });
}

// GET /api/links?page=1&limit=10&search=&sort=newest&status=all&clicks=all
// Logged-in only (see routes). Returns only links owned by the caller.
export async function listMyLinks(req, res) {
  const query = parseListQuery(req.query);
  res.json(await listLinks(ownerFilter(req), query));
}

// GET /api/links/:id -> one of the caller's links.
// Malformed ids, missing links, and other people's links all return the same 404,
// so the API never reveals whether someone else's link exists.
export async function getMyLink(req, res) {
  const link = await findOwnedLink(ownerFilter(req), req.params.id);
  if (!link) throw new HttpError(404, 'Link not found.');
  res.json({ link: toLinkResponse(link) });
}

/**
 * Reads the fields a user may change. Any subset can be sent; each is
 * validated on the server no matter what the browser already checked.
 *   url        new destination
 *   title      label (null or "" removes it)
 *   alias      new short code (the old short URL stops working)
 *   expiresAt  ISO date-time in the future, or null to never expire
 *   isActive   true / false (switch the link on or off)
 */
function parseLinkChanges(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Send the changes as a JSON object.');
  }
  const changes = {};
  if (has(body, 'url')) changes.originalUrl = normalizeDestinationUrl(body.url, { ownHost });
  if (has(body, 'title')) changes.title = validateTitle(body.title);
  if (has(body, 'alias')) changes.shortCode = validateAlias(body.alias);
  if (has(body, 'expiresAt')) changes.expiresAt = validateExpiresAt(body.expiresAt);
  if (has(body, 'isActive')) changes.isActive = validateIsActive(body.isActive);

  if (Object.keys(changes).length === 0) {
    throw new HttpError(400, 'Nothing to update. Send url, title, alias, expiresAt, or isActive.');
  }
  return changes;
}

// PATCH /api/links/:id
export async function updateMyLink(req, res) {
  const changes = parseLinkChanges(req.body);
  const link = await updateLink(ownerFilter(req), req.params.id, changes);
  if (!link) throw new HttpError(404, 'Link not found.');
  res.json({ link: toLinkResponse(link) });
}

// DELETE /api/links/:id
export async function deleteMyLink(req, res) {
  const result = await deleteLink(ownerFilter(req), req.params.id);
  if (!result) throw new HttpError(404, 'Link not found.');
  res.status(204).end();
}
