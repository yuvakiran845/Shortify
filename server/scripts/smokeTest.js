/**
 * End-to-end smoke test against a RUNNING Shortify API (local or deployed).
 *
 *   npm run smoke                                  # http://localhost:5000/api
 *   npm run smoke -- https://your-app.example.com/api
 *   npm run smoke -- https://your-app.example.com/api --redirect-via https://shortify-api.onrender.com
 *
 * --redirect-via sends the short-link visits to that server instead of the
 * short domain itself (the /<code> path is kept): useful right after setting
 * up your own domain, while its DNS is still propagating.
 *
 * It behaves like a real browser (cookies + CSRF header) and checks the
 * important flows: guest links, sign-up and claiming, redirects and click
 * counting, dashboard/analytics numbers, QR history, editing, ownership
 * boundaries, CSRF, deletion, and logout revoking the session.
 *
 * It creates two throwaway accounts (smoke-...@example.com) and deletes the
 * links it made; there is no "delete account" endpoint, so the accounts stay.
 * Uses only Node built-ins (fetch), so it needs no extra packages.
 */
import { randomUUID } from 'node:crypto';

const args = process.argv.slice(2);
const viaIndex = args.indexOf('--redirect-via');
const REDIRECT_VIA = (viaIndex >= 0 ? args.splice(viaIndex, 2)[1] : process.env.SMOKE_REDIRECT_VIA)?.replace(/\/+$/, '');
const API = (args[0] || process.env.SMOKE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const run = randomUUID().slice(0, 8);

let failures = 0;
function check(condition, description, detail = '') {
  if (condition) console.log(`  ✔ ${description}`);
  else {
    failures += 1;
    console.log(`  ✖ ${description}${detail ? `  (${detail})` : ''}`);
  }
  return condition;
}

// A minimal browser: remembers cookies and sends the CSRF token on writes.
function newBrowser() {
  const cookies = new Map();
  let csrfToken = null;

  async function call(method, path, body) {
    if (method !== 'GET' && !csrfToken) {
      csrfToken = (await call('GET', '/csrf-token')).body.csrfToken;
    }
    const headers = { 'User-Agent': BROWSER_UA, Accept: 'application/json' };
    if (cookies.size) headers.Cookie = [...cookies].map(([name, value]) => `${name}=${value}`).join('; ');
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (method !== 'GET') headers['X-CSRF-Token'] = csrfToken;

    const response = await fetch(`${API}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    for (const header of response.headers.getSetCookie()) {
      const [pair, ...attributes] = header.split(';');
      const [name, value] = [pair.slice(0, pair.indexOf('=')).trim(), pair.slice(pair.indexOf('=') + 1).trim()];
      const expired = attributes.some((attribute) => /expires=thu, 01 jan 1970/i.test(attribute) || /max-age=0/i.test(attribute));
      if (expired || value === '') cookies.delete(name);
      else cookies.set(name, value);
    }
    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // not JSON
    }
    return { status: response.status, body: json };
  }

  return {
    cookies,
    get: (path) => call('GET', path),
    post: (path, body = {}) => call('POST', path, body),
    patch: (path, body) => call('PATCH', path, body),
    delete: (path) => call('DELETE', path),
  };
}

// Opens a short link like a visitor would, without following the redirect.
async function visit(shortUrl, accept = 'text/html') {
  const target = REDIRECT_VIA ? `${REDIRECT_VIA}${new URL(shortUrl).pathname}` : shortUrl;
  const response = await fetch(target, { redirect: 'manual', headers: { 'User-Agent': `${BROWSER_UA} ${run}`, Accept: accept } });
  return { status: response.status, location: response.headers.get('location') };
}

const credentials = (who) => ({ name: `Smoke ${who}`, email: `smoke-${run}-${who}@example.com`, password: randomUUID() });

async function main() {
  console.log(`Shortify smoke test against ${API}${REDIRECT_VIA ? ` (short links opened via ${REDIRECT_VIA})` : ''}\n`);

  console.log('API');
  const health = await fetch(`${API}/health`).then((response) => response.json());
  check(health.status === 'ok' && health.database === 'connected', 'health check: API up, database connected', JSON.stringify(health));
  const { shortLinkBaseUrl } = await fetch(`${API}/config`).then((response) => response.json());
  check(/^https?:\/\//.test(shortLinkBaseUrl), `short links are served from ${shortLinkBaseUrl}`);

  console.log('\nGuest');
  const guest = newBrowser();
  const guestLink = await guest.post('/links', { url: 'example.com/smoke-guest' });
  check(guestLink.status === 201, 'a visitor without an account can shorten a URL', `status ${guestLink.status}`);
  check(guestLink.body?.link?.originalUrl === 'https://example.com/smoke-guest', 'the URL is normalized (https:// added)');
  const guestVisit = await visit(guestLink.body.link.shortUrl);
  check(guestVisit.status === 302 && guestVisit.location === 'https://example.com/smoke-guest', 'the short link redirects (302) to the original URL');
  check((await guest.get('/links')).status === 401, 'guests cannot list links (401)');
  check((await guest.post('/links', { url: 'javascript:alert(1)' })).status === 400, 'unsafe URLs are rejected (400)');
  check((await guest.post('/links', { url: 'example.com', alias: 'smoke' })).status === 401, 'custom aliases need an account (401)');

  console.log('\nAccount');
  const ana = newBrowser();
  const anaCredentials = credentials('ana');
  // Reuse the guest cookie, as the same browser would, so the guest link is claimed.
  for (const [name, value] of guest.cookies) ana.cookies.set(name, value);
  const signup = await ana.post('/auth/register', anaCredentials);
  check(signup.status === 201, 'sign up', `status ${signup.status} ${signup.body?.message ?? ''}`);
  check(signup.body?.claimedLinks === 1, 'the guest link moved into the new account');
  check((await ana.get('/auth/me')).body?.user?.email === anaCredentials.email, 'the session cookie identifies the user');
  check(!JSON.stringify(signup.body).includes('passwordHash'), 'the password hash is never returned');

  const alias = `smoke-${run}`;
  const random = await ana.post('/links', { url: 'https://example.org/random-code' });
  const randomUrl = random.body?.link?.shortUrl ?? '';
  check(randomUrl.startsWith(`${shortLinkBaseUrl}/`) && /^[A-Za-z0-9]{7}$/.test(randomUrl.slice(shortLinkBaseUrl.length + 1)),
    `new links look like ${shortLinkBaseUrl}/<7 random letters and digits>`, randomUrl);
  const created = await ana.post('/links', { url: 'https://example.org/smoke', alias, title: 'Smoke test' });
  check(created.status === 201 && created.body.link.shortCode === alias, 'create a link with a custom alias and title');
  const link = created.body.link;
  check((await ana.post('/links', { url: 'https://example.org/other', alias })).status === 409, 'a taken alias is a 409 conflict');

  const firstVisit = await visit(link.shortUrl);
  check(firstVisit.status === 302 && firstVisit.location === 'https://example.org/smoke', 'the alias redirects');
  const counted = await ana.get(`/links/${link.id}`);
  check(counted.body?.link?.clickCount === 1, 'the click was counted', `clickCount ${counted.body?.link?.clickCount}`);
  await visit(link.shortUrl);
  check((await ana.get(`/links/${link.id}`)).body?.link?.clickCount === 1, 'an immediate repeat click by the same visitor is not double-counted');

  const dashboard = await ana.get('/dashboard');
  check(dashboard.body?.stats?.totalLinks === 3 && dashboard.body?.stats?.totalClicks === 2,
    'dashboard totals match real data (3 links, 2 clicks)', JSON.stringify(dashboard.body?.stats));
  const to = new Date();
  const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
  const analytics = await ana.get(`/analytics?from=${from.toISOString()}&to=${to.toISOString()}&tz=UTC&linkId=${link.id}`);
  check(analytics.body?.totals?.clicks === 1, 'analytics for the link show its recorded click', JSON.stringify(analytics.body?.totals));

  const qr = await ana.post('/qr-codes', { linkId: link.id });
  check(qr.status === 201 && qr.body.qrCode.content === link.shortUrl, 'a QR code for the link is saved with the exact short URL');

  console.log('\nEditing');
  check((await ana.patch(`/links/${link.id}`, { isActive: false })).status === 200, 'switch the link off');
  check((await visit(link.shortUrl)).status === 410, 'a switched-off link answers 410');
  const renamed = await ana.patch(`/links/${link.id}`, { isActive: true, alias: `${alias}-new` });
  check(renamed.status === 200, 'switch it on and change the alias');
  check((await visit(renamed.body.link.shortUrl)).status === 302, 'the new alias redirects');
  check((await visit(link.shortUrl)).status === 404, 'the old alias is gone (404)');
  const qrList = await ana.get('/qr-codes');
  check(qrList.body?.qrCodes?.[0]?.content === renamed.body.link.shortUrl, 'saved QR history follows the new alias');

  console.log('\nOwnership and CSRF');
  const bob = newBrowser();
  check((await bob.post('/auth/register', credentials('bob'))).status === 201, 'a second user signs up');
  check((await bob.get(`/links/${link.id}`)).status === 404, "another user cannot read the link (404)");
  check((await bob.patch(`/links/${link.id}`, { url: 'https://evil.example.com' })).status === 404, 'another user cannot edit it (404)');
  check((await bob.delete(`/links/${link.id}`)).status === 404, 'another user cannot delete it (404)');
  check((await bob.post('/qr-codes', { linkId: link.id })).status === 404, "another user cannot make a QR code from it (404)");
  check((await bob.get('/links')).body?.pagination?.total === 0, "the other user's list is empty");
  const withoutCsrf = await fetch(`${API}/links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: [...ana.cookies].map(([n, v]) => `${n}=${v}`).join('; ') },
    body: JSON.stringify({ url: 'https://example.com/csrf' }),
  });
  check(withoutCsrf.status === 403, 'a write without the CSRF header is rejected (403)');

  console.log('\nDelete and logout');
  check((await ana.delete(`/links/${link.id}`)).status === 204, 'delete the link');
  check((await visit(renamed.body.link.shortUrl)).status === 410, 'a deleted link answers 410');
  check((await ana.post('/links', { url: 'https://example.com/x', alias: `${alias}-new` })).status === 409, "a deleted link's alias cannot be reused");
  const remaining = (await ana.get('/links')).body?.links ?? [];
  for (const other of remaining) await ana.delete(`/links/${other.id}`);

  const oldSession = new Map(ana.cookies);
  check((await ana.post('/auth/logout')).status === 204, 'log out');
  const replay = newBrowser();
  for (const [name, value] of oldSession) replay.cookies.set(name, value);
  check((await replay.get('/links')).status === 401, 'a copied session cookie stops working after logout (401)');
  const login = await newBrowser().post('/auth/login', { email: anaCredentials.email, password: anaCredentials.password });
  check(login.status === 200, 'log in again with the same password');
  check((await newBrowser().post('/auth/login', { email: anaCredentials.email, password: 'wrong password!' })).status === 401,
    'a wrong password is rejected (401)');

  console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) FAILED.`}`);
  console.log(`Test accounts left behind: ${anaCredentials.email}, smoke-${run}-bob@example.com`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error(`\nSmoke test crashed: ${error.message}`);
  process.exitCode = 1;
});
