// Small wrapper around fetch for talking to the Shortify API.
// It always returns parsed JSON, or throws an ApiError with a user-friendly message.

const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

const UNREACHABLE_MESSAGE = 'Could not reach the Shortify server. Check your connection and try again.';
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export class ApiError extends Error {
  constructor(message, { status = 0, field, code } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status; // 0 means the request never reached the server
    this.field = field; // which form field the error belongs to, if any
    this.code = code; // machine-readable reason, e.g. "CSRF_INVALID"
  }
}

// ----- CSRF token -----
// State-changing requests must echo a token the server gave us (see
// server/src/middleware/csrf.js). It is fetched once and kept in memory.
let csrfTokenPromise = null;

function getCsrfToken() {
  csrfTokenPromise ??= fetch(`${API_BASE_URL}/csrf-token`, { credentials: 'include' })
    .then((response) => {
      if (!response.ok) throw new Error(`CSRF token request failed (${response.status})`);
      return response.json();
    })
    .then((data) => data.csrfToken)
    .catch(() => {
      csrfTokenPromise = null; // try again next time
      throw new ApiError(UNREACHABLE_MESSAGE);
    });
  return csrfTokenPromise;
}

// ----- Session ended -----
// The auth provider registers a callback here. Any 401 response means the
// session expired or was revoked, so the app can switch to "logged out".
let unauthorizedHandler = null;
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

/**
 * @param path    API path such as "/links"
 * @param method  HTTP method
 * @param body    object sent as JSON
 * @param query   object turned into "?key=value" (empty values are skipped)
 * @param signal  AbortController signal, to cancel requests that are no longer needed
 * @param reportUnauthorized  false for requests where 401 is a normal answer (login)
 */
export async function apiRequest(path, { method = 'GET', body, query, signal, reportUnauthorized = true, isRetry = false } = {}) {
  const queryString = new URLSearchParams(
    Object.entries(query ?? {}).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  ).toString();
  const url = `${API_BASE_URL}${path}${queryString ? `?${queryString}` : ''}`;

  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (UNSAFE_METHODS.has(method)) headers['X-CSRF-Token'] = await getCsrfToken();

  let response;
  try {
    response = await fetch(url, {
      method,
      signal,
      credentials: 'include', // send the HttpOnly session/guest cookies
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error; // cancelled on purpose, not a network failure
    throw new ApiError(UNREACHABLE_MESSAGE);
  }

  const data = await response.json().catch(() => null); // 204 No Content has no body

  if (!response.ok) {
    // The CSRF cookie can expire (e.g. browser restarted): get a fresh token and retry once.
    if (response.status === 403 && data?.code === 'CSRF_INVALID' && !isRetry) {
      csrfTokenPromise = null;
      return apiRequest(path, { method, body, query, signal, reportUnauthorized, isRetry: true });
    }
    if (response.status === 401 && reportUnauthorized) unauthorizedHandler?.();

    // A non-JSON 5xx usually means a proxy or gateway could not reach the API.
    const message = data?.message || (response.status >= 500 ? UNREACHABLE_MESSAGE : 'The request failed. Please try again.');
    throw new ApiError(message, { status: response.status, field: data?.field, code: data?.code });
  }
  return data;
}
