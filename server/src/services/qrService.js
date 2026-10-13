import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { Link } from '../models/Link.js';
import { QrCode } from '../models/QrCode.js';
import { HttpError } from '../utils/HttpError.js';
import { normalizeQrUrl } from '../utils/url.js';
import { buildShortUrl, NOT_DELETED } from './linkService.js';

export const MAX_QR_HISTORY = 50;

export const toQrCodeResponse = (qrCode) => ({
  id: String(qrCode._id),
  content: qrCode.content,
  linkId: qrCode.link ? String(qrCode.link) : null,
  generatedCount: qrCode.generatedCount,
  lastGeneratedAt: qrCode.lastGeneratedAt,
  createdAt: qrCode.createdAt,
});

/**
 * Works out what the QR code should contain.
 * - { linkId }: one of the user's Shortify links. The server builds the URL
 *   from PUBLIC_BASE_URL, so the code always points at the real short link.
 * - { url }: any web address, validated like the shortener does.
 */
export async function resolveQrContent(userId, { url, linkId }) {
  if (linkId !== undefined && linkId !== null && linkId !== '') {
    // Unknown, malformed, or someone else's link: all "not found", so the
    // response never reveals whether another user's link exists.
    const link = mongoose.isValidObjectId(linkId)
      ? await Link.findOne({ _id: linkId, owner: userId, ...NOT_DELETED }).select('shortCode').lean()
      : null;
    if (!link) throw new HttpError(404, 'That link was not found in your account.', { field: 'linkId' });
    return { content: buildShortUrl(link.shortCode), link: link._id };
  }

  if (url === undefined || url === null || url === '') {
    throw new HttpError(400, 'Enter a URL or choose one of your links.', { field: 'url' });
  }
  return { content: normalizeQrUrl(url, { shortLinkBaseUrl: config.publicBaseUrl }), link: null };
}

/**
 * Adds a QR code to the user's history, or moves an existing one to the top.
 * A single atomic upsert (update-or-insert) protected by the unique
 * { owner, content } index, so two clicks at once cannot create duplicates.
 * ($inc on a brand-new document starts from 0, so the first generation counts as 1.)
 */
export async function recordQrCode(userId, { content, link }) {
  const result = await QrCode.findOneAndUpdate(
    { owner: userId, content },
    { $set: { lastGeneratedAt: new Date(), link }, $inc: { generatedCount: 1 } },
    { upsert: true, returnDocument: 'after', includeResultMetadata: true, setDefaultsOnInsert: false },
  );
  return { qrCode: result.value, created: !result.lastErrorObject?.updatedExisting };
}

export function listQrCodes(userId, limit) {
  return QrCode.find({ owner: userId }).sort({ lastGeneratedAt: -1, _id: -1 }).limit(limit).lean();
}

export function countQrCodes(userId) {
  return QrCode.countDocuments({ owner: userId });
}

// Returns true if something was deleted. Matching on owner means users can
// only ever delete their own entries.
export async function deleteQrCode(userId, id) {
  if (!mongoose.isValidObjectId(id)) return false;
  const result = await QrCode.deleteOne({ _id: id, owner: userId });
  return result.deletedCount === 1;
}
