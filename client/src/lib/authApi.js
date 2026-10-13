import { apiRequest } from './api';

// GET /api/auth/me -> the logged-in user, or null
export async function fetchCurrentUser({ signal } = {}) {
  const data = await apiRequest('/auth/me', { signal });
  return data.user;
}

// POST /api/auth/login -> { user, claimedLinks }
// A 401 here just means "wrong email or password", not "session expired".
export function loginRequest(email, password) {
  return apiRequest('/auth/login', { method: 'POST', body: { email, password }, reportUnauthorized: false });
}

// POST /api/auth/register -> { user, claimedLinks }
export function registerRequest(name, email, password) {
  return apiRequest('/auth/register', { method: 'POST', body: { name, email, password } });
}

// POST /api/auth/logout -> 204
export function logoutRequest() {
  return apiRequest('/auth/logout', { method: 'POST', reportUnauthorized: false });
}
