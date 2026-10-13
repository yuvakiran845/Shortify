import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { config } from '../src/config/env.js';
import { Link } from '../src/models/Link.js';
import { User } from '../src/models/User.js';
import { clearDatabase, connectTestDatabase, dropTestDatabase } from './helpers/db.js';
import { cookieHeader, cookieValue, newClient, newUser } from './helpers/client.js';

before(connectTestDatabase);
beforeEach(clearDatabase);
after(dropTestDatabase);

const app = createApp();
const PASSWORD = 'correct horse battery staple';

const meWithToken = (token) => request(app).get('/api/auth/me').set('Cookie', `shortify_session=${token}`);

describe('CSRF protection', () => {
  test('GET /api/csrf-token issues a token in an HttpOnly cookie and reuses it', async () => {
    const agent = request.agent(app);
    const first = await agent.get('/api/csrf-token').expect(200);
    assert.match(first.body.csrfToken, /^[A-Za-z0-9_-]{43}$/);
    const cookie = cookieHeader(first, 'shortify_csrf');
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
    assert.match(cookie, /Path=\/api/);

    const second = await agent.get('/api/csrf-token').expect(200);
    assert.equal(second.body.csrfToken, first.body.csrfToken);
    assert.equal(cookieHeader(second, 'shortify_csrf'), undefined);
  });

  for (const path of ['/api/auth/register', '/api/auth/login', '/api/auth/logout', '/api/links']) {
    test(`POST ${path} without the CSRF header is rejected (403)`, async () => {
      const client = await newClient(app);
      const response = await client.agent.post(path).send({}).expect(403);
      assert.equal(response.body.code, 'CSRF_INVALID');
    });
  }

  test('a wrong CSRF header is rejected', async () => {
    const client = await newClient(app);
    const wrong = `${client.csrfToken.slice(0, -1)}${client.csrfToken.endsWith('A') ? 'B' : 'A'}`;
    await client.agent.post('/api/links').set('X-CSRF-Token', wrong).send({ url: 'https://example.com' }).expect(403);
  });

  test('a header without the matching cookie (another site guessing) is rejected', async () => {
    const client = await newClient(app);
    await request(app).post('/api/links').set('X-CSRF-Token', client.csrfToken).send({ url: 'https://example.com' }).expect(403);
    assert.equal(await Link.countDocuments(), 0);
  });

  test('read-only requests do not need a token', async () => {
    await request(app).get('/api/auth/me').expect(200);
  });
});

describe('registration', () => {
  test('creates an account, starts a session, and never returns the password', async () => {
    const client = await newClient(app);
    const response = await client
      .post('/api/auth/register', { name: 'Ana Lima', email: 'ana@example.com', password: PASSWORD })
      .expect(201);

    assert.deepEqual(Object.keys(response.body.user).sort(), ['createdAt', 'email', 'id', 'name']);
    assert.equal(response.body.user.name, 'Ana Lima');
    assert.equal(response.body.claimedLinks, 0);
    assert.equal(JSON.stringify(response.body).includes(PASSWORD), false);

    const session = cookieHeader(response, 'shortify_session');
    assert.match(session, /HttpOnly/);
    assert.match(session, /SameSite=Lax/);
    assert.match(session, /Path=\/api/);
    assert.match(session, new RegExp(`Max-Age=${config.sessionDays * 24 * 60 * 60}`));

    const me = await client.get('/api/auth/me').expect(200);
    assert.equal(me.body.user.email, 'ana@example.com');
  });

  test('stores a bcrypt hash, not the password', async () => {
    await newUser(app, { email: 'hash@example.com' });
    const saved = await User.findOne({ email: 'hash@example.com' }).select('+passwordHash').lean();
    assert.match(saved.passwordHash, /^\$2[aby]\$\d{2}\$/);
    assert.notEqual(saved.passwordHash, PASSWORD);
    assert.equal(await bcrypt.compare(PASSWORD, saved.passwordHash), true);
  });

  test('normalizes the email (trim + lowercase) and trims the name', async () => {
    const client = await newClient(app);
    const response = await client
      .post('/api/auth/register', { name: '  Ana  ', email: '  Ana@Example.COM ', password: PASSWORD })
      .expect(201);
    assert.equal(response.body.user.email, 'ana@example.com');
    assert.equal(response.body.user.name, 'Ana');
  });

  test('rejects a second account with the same email, in any letter case (409)', async () => {
    await newUser(app, { email: 'taken@example.com' });
    const client = await newClient(app);
    const response = await client
      .post('/api/auth/register', { name: 'Copy', email: 'TAKEN@example.com', password: PASSWORD })
      .expect(409);
    assert.equal(response.body.field, 'email');
    assert.equal(await User.countDocuments(), 1);
  });

  test('two simultaneous sign-ups with one email create only one account', async () => {
    const [a, b] = await Promise.all([newClient(app), newClient(app)]);
    const body = { name: 'Race', email: 'race@example.com', password: PASSWORD };
    const statuses = (await Promise.all([a.post('/api/auth/register', body), b.post('/api/auth/register', body)]))
      .map((response) => response.status)
      .sort();
    assert.deepEqual(statuses, [201, 409]);
    assert.equal(await User.countDocuments(), 1);
  });

  const invalid = [
    [{ email: 'a@example.com', password: PASSWORD }, 'name', 'missing name'],
    [{ name: '   ', email: 'a@example.com', password: PASSWORD }, 'name', 'blank name'],
    [{ name: 'x'.repeat(81), email: 'a@example.com', password: PASSWORD }, 'name', 'name over 80 characters'],
    [{ name: 'Ana', password: PASSWORD }, 'email', 'missing email'],
    [{ name: 'Ana', email: 'not-an-email', password: PASSWORD }, 'email', 'invalid email'],
    [{ name: 'Ana', email: 'a@b', password: PASSWORD }, 'email', 'email without a domain dot'],
    [{ name: 'Ana', email: 42, password: PASSWORD }, 'email', 'email that is not text'],
    [{ name: 'Ana', email: 'a@example.com' }, 'password', 'missing password'],
    [{ name: 'Ana', email: 'a@example.com', password: 'short7!' }, 'password', 'password under 8 characters'],
    [{ name: 'Ana', email: 'a@example.com', password: 'é'.repeat(37) }, 'password', 'password over 72 bytes'],
    [{ name: 'Ana', email: 'a@example.com', password: '          ' }, 'password', 'password of only spaces'],
    [{ name: 'Ana', email: 'a@example.com', password: 12345678 }, 'password', 'password that is not text'],
  ];
  for (const [body, field, reason] of invalid) {
    test(`rejects ${reason} (400, field "${field}")`, async () => {
      const client = await newClient(app);
      const response = await client.post('/api/auth/register', body).expect(400);
      assert.equal(response.body.field, field);
      assert.equal(await User.countDocuments(), 0);
    });
  }
});

describe('login', () => {
  test('logs in with the right password, ignoring email case and spaces', async () => {
    await newUser(app, { email: 'ana@example.com' });
    const client = await newClient(app);
    const response = await client.post('/api/auth/login', { email: ' ANA@example.com ', password: PASSWORD }).expect(200);
    assert.equal(response.body.user.email, 'ana@example.com');
    assert.ok(cookieValue(response, 'shortify_session'));
    assert.equal(JSON.stringify(response.body).includes('$2'), false, 'no password hash in the response');
    assert.equal((await client.get('/api/auth/me')).body.user.email, 'ana@example.com');
  });

  test('wrong password and unknown email get the same 401 message', async () => {
    await newUser(app, { email: 'ana@example.com' });
    const client = await newClient(app);
    const wrongPassword = await client.post('/api/auth/login', { email: 'ana@example.com', password: 'wrong password' }).expect(401);
    const unknownEmail = await client.post('/api/auth/login', { email: 'nobody@example.com', password: PASSWORD }).expect(401);
    assert.equal(wrongPassword.body.message, 'Incorrect email or password.');
    assert.equal(unknownEmail.body.message, wrongPassword.body.message);
    assert.equal(cookieValue(wrongPassword, 'shortify_session'), undefined);
    assert.equal((await client.get('/api/auth/me')).body.user, null);
  });

  test('an invalid email format is a 400 field error', async () => {
    const client = await newClient(app);
    const response = await client.post('/api/auth/login', { email: 'nope', password: PASSWORD }).expect(400);
    assert.equal(response.body.field, 'email');
  });

  test('repeated failed logins from one IP are rate limited (429)', async () => {
    const limitedApp = createApp({ loginLimitPer15Minutes: 3 });
    await newUser(limitedApp, { email: 'ana@example.com' });
    const client = await newClient(limitedApp);
    for (let i = 0; i < 3; i += 1) {
      await client.post('/api/auth/login', { email: 'ana@example.com', password: 'guess' + i }).expect(401);
    }
    const blocked = await client.post('/api/auth/login', { email: 'ana@example.com', password: PASSWORD }).expect(429);
    assert.match(blocked.body.message, /Too many failed login attempts/);
  });

  test('successful logins do not count toward the limit', async () => {
    const limitedApp = createApp({ loginLimitPer15Minutes: 2 });
    await newUser(limitedApp, { email: 'ana@example.com' });
    const client = await newClient(limitedApp);
    for (let i = 0; i < 5; i += 1) {
      await client.post('/api/auth/login', { email: 'ana@example.com', password: PASSWORD }).expect(200);
    }
  });

  test('registration is rate limited per IP (429)', async () => {
    const limitedApp = createApp({ registerLimitPerHour: 2 });
    await newUser(limitedApp);
    await newUser(limitedApp);
    const client = await newClient(limitedApp);
    await client.post('/api/auth/register', { name: 'Third', email: 'third@example.com', password: PASSWORD }).expect(429);
  });
});

describe('session tokens', () => {
  test('logged-out visitors get { user: null } (200, not an error)', async () => {
    const response = await request(app).get('/api/auth/me').expect(200);
    assert.deepEqual(response.body, { user: null });
  });

  test('an edited token is rejected and its cookie removed', async () => {
    const alice = await newUser(app);
    const [header, payload, signature] = alice.sessionToken.split('.');
    const forgedPayload = Buffer.from(JSON.stringify({ sub: alice.user.id, sv: 99 })).toString('base64url');
    const response = await meWithToken(`${header}.${forgedPayload}.${signature}`).expect(200);
    assert.equal(response.body.user, null);
    assert.match(cookieHeader(response, 'shortify_session'), /Expires=Thu, 01 Jan 1970/);
    assert.ok(payload);
  });

  test('a token signed with a different secret is rejected', async () => {
    const alice = await newUser(app);
    const token = jwt.sign({ sub: alice.user.id, sv: 0 }, 'some-other-secret-that-is-long-enough!!', { algorithm: 'HS256' });
    assert.equal((await meWithToken(token)).body.user, null);
  });

  test('an unsigned "alg: none" token is rejected', async () => {
    const alice = await newUser(app);
    const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const token = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sub: alice.user.id, sv: 0 })}.`;
    assert.equal((await meWithToken(token)).body.user, null);
  });

  test('an expired token is rejected', async () => {
    const alice = await newUser(app);
    const token = jwt.sign({ sub: alice.user.id, sv: 0, exp: Math.floor(Date.now() / 1000) - 60 }, config.jwtSecret);
    assert.equal((await meWithToken(token)).body.user, null);
  });

  test("a valid token for a deleted user is rejected", async () => {
    const alice = await newUser(app);
    await User.deleteOne({ email: alice.credentials.email });
    assert.equal((await meWithToken(alice.sessionToken)).body.user, null);
  });

  test('a token with a malformed user id is rejected', async () => {
    const token = jwt.sign({ sub: 'not-an-id', sv: 0 }, config.jwtSecret, { algorithm: 'HS256' });
    assert.equal((await meWithToken(token)).body.user, null);
  });
});

describe('logout', () => {
  test('ends the session and clears the cookie', async () => {
    const alice = await newUser(app);
    const response = await alice.post('/api/auth/logout').expect(204);
    assert.match(cookieHeader(response, 'shortify_session'), /Expires=Thu, 01 Jan 1970/);
    assert.equal((await alice.get('/api/auth/me')).body.user, null);
    await alice.get('/api/links').expect(401);
  });

  test('a copy of the old token stops working after logout (revoked server-side)', async () => {
    const alice = await newUser(app);
    const stolenCopy = alice.sessionToken;
    assert.equal((await meWithToken(stolenCopy)).body.user.id, alice.user.id);
    await alice.post('/api/auth/logout').expect(204);
    assert.equal((await meWithToken(stolenCopy)).body.user, null);
    await request(app).get('/api/links').set('Cookie', `shortify_session=${stolenCopy}`).expect(401);
  });

  test('logging out while logged out is harmless', async () => {
    const client = await newClient(app);
    await client.post('/api/auth/logout').expect(204);
  });
});

describe('moving guest links into an account', () => {
  test('signing up claims the links this browser created while logged out', async () => {
    const browser = await newClient(app);
    await browser.post('/api/links', { url: 'https://example.com/one' }).expect(201);
    await browser.post('/api/links', { url: 'https://example.com/two' }).expect(201);

    const response = await browser
      .post('/api/auth/register', { name: 'Ana', email: 'ana@example.com', password: PASSWORD })
      .expect(201);
    assert.equal(response.body.claimedLinks, 2);
    assert.match(cookieHeader(response, 'shortify_guest'), /Expires=Thu, 01 Jan 1970/, 'guest cookie removed');

    const list = await browser.get('/api/links').expect(200);
    assert.equal(list.body.pagination.total, 2);
    const saved = await Link.find().lean();
    assert.ok(saved.every((link) => String(link.owner) === response.body.user.id && link.guestKeyHash === null));
  });

  test('logging in claims them too', async () => {
    await newUser(app, { email: 'ana@example.com' });
    const browser = await newClient(app);
    await browser.post('/api/links', { url: 'https://example.com/made-before-login' }).expect(201);
    const response = await browser.post('/api/auth/login', { email: 'ana@example.com', password: PASSWORD }).expect(200);
    assert.equal(response.body.claimedLinks, 1);
    assert.equal((await browser.get('/api/links').expect(200)).body.pagination.total, 1);
  });

  test("another browser's guest links are never claimed", async () => {
    const otherBrowser = await newClient(app);
    await otherBrowser.post('/api/links', { url: 'https://example.com/not-yours' }).expect(201);

    const ana = await newUser(app);
    assert.equal((await ana.get('/api/links').expect(200)).body.pagination.total, 0);
    const untouched = await Link.findOne().lean();
    assert.equal(untouched.owner, null);
    assert.ok(untouched.guestKeyHash);
  });

  test('links created after logging in belong to the account', async () => {
    const ana = await newUser(app);
    await ana.post('/api/links', { url: 'https://example.com/after-login' }).expect(201);
    const saved = await Link.findOne().lean();
    assert.equal(String(saved.owner), ana.user.id);
  });
});
