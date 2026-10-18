import { expect } from '@playwright/test';
import { API_URL } from '../playwright.config.js';

export { API_URL };

// Test-only password for the throwaway accounts these tests create.
export const PASSWORD = 'e2e-correct-horse-battery';

// A different account for every test, so tests can run in parallel safely.
let counter = 0;
export const uniqueEmail = (tag = 'user') =>
  `e2e-${tag}-${Date.now().toString(36)}-${process.pid}-${(counter += 1)}@example.com`;
export const uniqueAlias = (tag = 'link') => `${tag}-${Date.now().toString(36)}${(counter += 1)}`;

// A short URL looks like http://localhost:5100/<7 letters and digits> (or an alias).
export const SHORT_URL = new RegExp(`^${API_URL}/[A-Za-z0-9_-]{3,50}$`);
export const shortPath = (shortUrl) => new URL(shortUrl).pathname;

// ----- Fast setup through the API (shares cookies with the browser page) -----

async function csrfToken(page) {
  const response = await page.request.get('/api/csrf-token');
  return (await response.json()).csrfToken;
}

/** Creates an account and leaves the page's browser context logged in. */
export async function signUpViaApi(page, { name = 'E2E Tester', email = uniqueEmail() } = {}) {
  const token = await csrfToken(page);
  const response = await page.request.post('/api/auth/register', {
    data: { name, email, password: PASSWORD },
    headers: { 'X-CSRF-Token': token },
  });
  expect(response.status(), 'sign-up should succeed').toBe(201);
  return { name, email };
}

/** Creates a link for the logged-in user and returns it as the API does. */
export async function createLinkViaApi(page, body) {
  const token = await csrfToken(page);
  const response = await page.request.post('/api/links', { data: body, headers: { 'X-CSRF-Token': token } });
  expect(response.status(), 'link creation should succeed').toBe(201);
  return (await response.json()).link;
}

/** Opens a short link without following the redirect, the way a visitor's browser would ask. */
export async function visitShortLink(request, shortUrl, userAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0 Safari/537.36 e2e-${Math.random()}`) {
  return request.get(shortUrl, { maxRedirects: 0, headers: { 'User-Agent': userAgent, Accept: 'text/html' } });
}
