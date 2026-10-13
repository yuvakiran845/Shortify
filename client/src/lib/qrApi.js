import { apiRequest } from './api';

// QR code history (logged-in users only).

// GET /api/qr-codes?limit= -> [{ id, content, linkId, generatedCount, lastGeneratedAt, createdAt }]
export async function listQrCodes({ limit = 10, signal } = {}) {
  const data = await apiRequest('/qr-codes', { query: { limit }, signal });
  return data.qrCodes;
}

// POST /api/qr-codes with { url } or { linkId } -> the saved history entry
export async function saveQrCode(target) {
  const data = await apiRequest('/qr-codes', { method: 'POST', body: target });
  return data.qrCode;
}

// DELETE /api/qr-codes/:id
export function deleteQrCode(id) {
  return apiRequest(`/qr-codes/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
