import { HttpError } from '../utils/HttpError.js';
import {
  deleteQrCode,
  listQrCodes,
  MAX_QR_HISTORY,
  recordQrCode,
  resolveQrContent,
  toQrCodeResponse,
} from '../services/qrService.js';

// GET /api/qr-codes?limit=10 -> the user's most recently generated QR codes
export async function listMyQrCodes(req, res) {
  const raw = req.query.limit ?? '10';
  const limit = typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : NaN;
  if (!(limit >= 1 && limit <= MAX_QR_HISTORY)) {
    throw new HttpError(400, `"limit" must be a whole number between 1 and ${MAX_QR_HISTORY}.`);
  }
  const qrCodes = await listQrCodes(req.user._id, limit);
  res.json({ qrCodes: qrCodes.map(toQrCodeResponse) });
}

// POST /api/qr-codes  { url } or { linkId }
// 201 when a new history entry is created, 200 when an existing one moves to the top.
export async function createQrCode(req, res) {
  const resolved = await resolveQrContent(req.user._id, req.body ?? {});
  const { qrCode, created } = await recordQrCode(req.user._id, resolved);
  res.status(created ? 201 : 200).json({ qrCode: toQrCodeResponse(qrCode) });
}

// DELETE /api/qr-codes/:id
export async function removeQrCode(req, res) {
  const deleted = await deleteQrCode(req.user._id, req.params.id);
  if (!deleted) throw new HttpError(404, 'QR code not found.');
  res.status(204).end();
}
