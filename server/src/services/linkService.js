import mongoose from 'mongoose';
import { Link } from '../models/Link.js';
import { Click } from '../models/Click.js';
import { QrCode } from '../models/QrCode.js';
import { config } from '../config/env.js';
import { HttpError } from '../utils/HttpError.js';
import { generateShortCode } from '../utils/shortCode.js';
import { RESERVED_ALIASES } from '../utils/linkFields.js';
import { escapeRegex, LINK_SORTS } from '../utils/listQuery.js';
import { visitorIdFor } from './visitorService.js';

export const MAX_CODE_ATTEMPTS = 5;

// Deleted links stay in the collection as tombstones; every "my links" query skips them.
export const NOT_DELETED = { deletedAt: null };

const isDuplicateShortCodeError = (error) => error?.code === 11000 && Boolean(error.keyPattern?.shortCode);

/**
 * The full public short URL for a code, e.g. https://shortify.onrender.com/aB7xK9p.
 * Built from PUBLIC_BASE_URL every time (MongoDB stores only the code), so
 * changing the domain updates every existing link, and no record ever holds
 * a hard-coded localhost address.
 */
export const buildShortUrl = (shortCode) => new URL(encodeURIComponent(shortCode), `${config.publicBaseUrl}/`).href;

// "disabled" wins over "expired": a switched-off link is off regardless of its date.
export function linkStatus(link, now = new Date()) {
  if (!link.isActive) return 'disabled';
  if (link.expiresAt && link.expiresAt <= now) return 'expired';
  return 'active';
}

// Shape returned to API clients. Fields are listed explicitly so internal
// data (owner hash, __v) can never leak by accident.
export const toLinkResponse = (link, now = new Date()) => ({
  id: String(link._id),
  shortCode: link.shortCode,
  shortUrl: buildShortUrl(link.shortCode),
  originalUrl: link.originalUrl,
  title: link.title ?? null,
  clickCount: link.clickCount,
  lastClickedAt: link.lastClickedAt ?? null,
  expiresAt: link.expiresAt ?? null,
  isActive: link.isActive,
  status: linkStatus(link, now),
  createdAt: link.createdAt,
});

// 409 for an alias that is already used. Aliases of deleted or renamed links
// stay reserved, so old shared links and printed QR codes never get a new owner.
async function aliasConflictError(alias) {
  const existing = await Link.findOne({ shortCode: alias }).select('deletedAt formerCodeOf').lean();
  let message = 'That alias is already taken. Please choose another one.';
  if (existing?.formerCodeOf) {
    message = 'That alias was used by a link that has since been renamed, so it cannot be reused. Please choose another one.';
  } else if (existing?.deletedAt) {
    message = 'That alias belonged to a deleted link and cannot be reused. Please choose another one.';
  }
  return new HttpError(409, message, { field: 'alias' });
}

/**
 * Saves a new link.
 * - With `alias`: that exact short code, or 409 if it is taken.
 * - Without: a random short code. Instead of "check if the code exists, then
 *   insert" (two requests could both pass the check), we insert and let the
 *   unique index reject duplicates, retrying with a new code up to
 *   MAX_CODE_ATTEMPTS times.
 * `generateCode` can be replaced in tests to force collisions.
 */
export async function createShortLink(
  originalUrl,
  { owner = null, guestKeyHash = null, alias, title = null, expiresAt = null, generateCode = generateShortCode } = {},
) {
  const fields = { originalUrl, owner, guestKeyHash, title, expiresAt };

  if (alias) {
    try {
      return await Link.create({ ...fields, shortCode: alias });
    } catch (error) {
      if (isDuplicateShortCodeError(error)) throw await aliasConflictError(alias);
      throw error;
    }
  }

  for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt += 1) {
    const shortCode = generateCode();
    // Never hand out a word the app uses for its own pages (e.g. "shorten"),
    // so a short link can never hide a page when the website is served from here.
    if (RESERVED_ALIASES.has(shortCode.toLowerCase())) continue;
    try {
      return await Link.create({ ...fields, shortCode });
    } catch (error) {
      if (!isDuplicateShortCodeError(error)) throw error;
    }
  }
  throw new HttpError(503, 'Could not generate a unique short link. Please try again.');
}

/**
 * One page of the owner's links. Filtering, sorting, and pagination all run
 * inside MongoDB, so only `limit` documents ever travel to the server/browser.
 *
 * `owner` is a filter such as { owner: userId } (from ownerFilter) and is
 * ALWAYS applied first, so a query can never return another owner's links.
 */
export async function listLinks(owner, { page, limit, search, sort, status, clicks }, now = new Date()) {
  if (!owner) throw new Error('listLinks requires an owner filter');
  const conditions = [owner, NOT_DELETED];

  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    conditions.push({ $or: [{ originalUrl: pattern }, { shortCode: pattern }, { title: pattern }] });
  }

  if (status === 'active') {
    conditions.push({ isActive: true, $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] });
  } else if (status === 'expired') {
    conditions.push({ isActive: true, expiresAt: { $lte: now } });
  } else if (status === 'disabled') {
    conditions.push({ isActive: false });
  }

  if (clicks === 'clicked') conditions.push({ clickCount: { $gt: 0 } });
  if (clicks === 'unclicked') conditions.push({ clickCount: 0 });

  const filter = { $and: conditions };

  const [links, total] = await Promise.all([
    Link.find(filter)
      .sort(LINK_SORTS[sort])
      .skip((page - 1) * limit)
      .limit(limit)
      .select('shortCode originalUrl title clickCount lastClickedAt expiresAt isActive createdAt')
      .lean(),
    Link.countDocuments(filter),
  ]);

  return {
    links: links.map((link) => toLinkResponse(link, now)),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// One link, but only if it belongs to `owner` (a filter from ownerFilter) and
// is not deleted. Filtering by owner inside the query (not checking afterwards)
// means another user's link is simply "not found".
export function findOwnedLink(owner, id) {
  if (!owner || !mongoose.isValidObjectId(id)) return null;
  return Link.findOne({ _id: id, ...owner, ...NOT_DELETED }).lean();
}

/**
 * Applies validated changes ({ originalUrl, title, shortCode, expiresAt, isActive },
 * any subset) to one of the owner's links. Returns null if the link is not theirs.
 *
 * Changing the short code:
 * - the old short URL stops working (404), but the old code stays reserved by a
 *   placeholder document, so nobody else can take it over and receive the
 *   traffic from links and QR codes that were already shared;
 * - the same link may move back to one of its own earlier aliases;
 * - saved QR history entries for this link are updated to the new URL, so
 *   downloading them again gives a working code (printed copies cannot change).
 */
export async function updateLink(owner, id, changes, now = new Date()) {
  if (!owner || !mongoose.isValidObjectId(id)) return null;
  const link = await Link.findOne({ _id: id, ...owner, ...NOT_DELETED });
  if (!link) return null;

  const previousCode = link.shortCode;
  const renaming = changes.shortCode !== undefined && changes.shortCode !== previousCode;
  if (renaming) {
    // Going back to an alias this link used before: release its own placeholder.
    await Link.deleteOne({ shortCode: changes.shortCode, formerCodeOf: link._id });
  }

  link.set(changes);
  try {
    await link.save();
  } catch (error) {
    if (isDuplicateShortCodeError(error)) throw await aliasConflictError(changes.shortCode);
    throw error;
  }

  if (renaming) {
    await reserveFormerCode(link, previousCode, now);
    await QrCode.updateMany({ link: link._id }, { $set: { content: buildShortUrl(link.shortCode) } });
  }
  return link;
}

// The placeholder is a tombstone (deletedAt set, no destination), so every
// "my links" query already skips it and the redirect answers 404 for it.
async function reserveFormerCode(link, shortCode, now) {
  try {
    await Link.create({
      shortCode,
      owner: link.owner,
      guestKeyHash: link.guestKeyHash,
      originalUrl: null,
      isActive: false,
      deletedAt: now,
      formerCodeOf: link._id,
    });
  } catch (error) {
    // Without a transaction there is a split second between saving the new
    // code and reserving the old one; if another request took it in between,
    // the rename itself still succeeded, so log instead of failing.
    if (!isDuplicateShortCodeError(error)) throw error;
    console.warn(`Could not reserve the former short code "${shortCode}": it was taken during the rename.`);
  }
}

/**
 * Deletes one of the owner's links:
 * - the link becomes a tombstone: its destination and title are erased and
 *   its short code is reserved forever (the short URL answers 410 Gone);
 * - its click events and QR code history entries are permanently deleted, so
 *   the dashboard and analytics totals stay consistent.
 * Returns null if the link is not theirs (or already deleted).
 */
export async function deleteLink(owner, id, now = new Date()) {
  if (!owner || !mongoose.isValidObjectId(id)) return null;
  const link = await Link.findOneAndUpdate(
    { _id: id, ...owner, ...NOT_DELETED },
    {
      $set: {
        deletedAt: now,
        isActive: false,
        originalUrl: null,
        title: null,
        expiresAt: null,
        clickCount: 0,
        lastClickedAt: null,
      },
    },
    { returnDocument: 'after' },
  ).lean();
  if (!link) return null;

  const [clicks, qrCodes] = await Promise.all([
    Click.deleteMany({ link: link._id }),
    QrCode.deleteMany({ link: link._id }),
  ]);
  return { deletedClicks: clicks.deletedCount, deletedQrCodes: qrCodes.deletedCount };
}

// Loads only the fields the redirect needs, by the uniquely indexed short code.
export function findLinkForRedirect(shortCode) {
  return Link.findOne({ shortCode }).select('originalUrl isActive expiresAt owner deletedAt formerCodeOf').lean();
}

/**
 * Counts one click: increments the link's counter and stores a Click event
 * with privacy-conscious context (see models/Click.js).
 * $inc is atomic inside MongoDB, so simultaneous clicks are never lost.
 * Analytics must never break the redirect, so errors are logged, not thrown.
 *
 * `visitor` is { ip, userAgent, referrerHost, deviceType }. The IP and
 * User-Agent are only used to compute the daily visitor hash; they are not saved.
 */
export async function recordClick(link, visitor = {}, clickedAt = new Date()) {
  try {
    const visitorId = visitor.ip ? await visitorIdFor(visitor, clickedAt) : null;
    await Promise.all([
      Link.updateOne({ _id: link._id }, { $inc: { clickCount: 1 }, $set: { lastClickedAt: clickedAt } }),
      Click.create({
        link: link._id,
        owner: link.owner ?? null,
        clickedAt,
        referrerHost: visitor.referrerHost ?? null,
        deviceType: visitor.deviceType ?? 'other',
        visitorId,
      }),
    ]);
    return true;
  } catch (error) {
    console.error(`Could not record click for link ${link._id}:`, error.message);
    return false;
  }
}
