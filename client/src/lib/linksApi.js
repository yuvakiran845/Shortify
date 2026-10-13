import { apiRequest } from './api';

// POST /api/links { url, alias?, title?, expiresAt? }
// -> { link: { id, shortCode, shortUrl, originalUrl, title, clickCount, status, expiresAt, createdAt, ... } }
// The options are for logged-in users only; the server answers 401 for guests.
export async function createLink(url, options = {}) {
  const data = await apiRequest('/links', { method: 'POST', body: { url, ...options } });
  return data.link;
}

// GET /api/links/:id -> one of the user's links
export async function getLink(id, { signal } = {}) {
  const data = await apiRequest(`/links/${encodeURIComponent(id)}`, { signal });
  return data.link;
}

// GET /api/links?page=&limit=&search=&sort=&status=&clicks=
// -> { links: [...], pagination: { page, limit, total, totalPages } }
export function listLinks(query, { signal } = {}) {
  return apiRequest('/links', { query, signal });
}

// PATCH /api/links/:id { url?, title?, alias?, expiresAt?, isActive? } -> the updated link.
// Only send the fields that changed.
export async function updateLink(id, changes) {
  const data = await apiRequest(`/links/${encodeURIComponent(id)}`, { method: 'PATCH', body: changes });
  return data.link;
}

// DELETE /api/links/:id -> 204 No Content.
// Also deletes the link's click history and QR history (see the server's deleteLink).
export async function deleteLink(id) {
  await apiRequest(`/links/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
