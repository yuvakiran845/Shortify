import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { Link } from '../src/models/Link.js';
import { createShortLink, MAX_CODE_ATTEMPTS } from '../src/services/linkService.js';
import { clearDatabase, connectTestDatabase, dropTestDatabase } from './helpers/db.js';
import { cookieValue, newClient, newUser } from './helpers/client.js';

before(connectTestDatabase);
beforeEach(clearDatabase);
after(dropTestDatabase);

describe('POST /api/links', () => {
  const app = createApp();

  test('creates a short link and stores it in MongoDB', async () => {
    const client = await newClient(app);
    const response = await client
      .post('/api/links', { url: 'https://example.com/a/very/long/path?utm_source=test' })
      .expect(201);

    const { link } = response.body;
    assert.match(link.shortCode, /^[0-9A-Za-z]{7}$/);
    assert.equal(link.shortUrl, `https://sho.rt/${link.shortCode}`);
    assert.equal(link.originalUrl, 'https://example.com/a/very/long/path?utm_source=test');
    assert.equal(link.clickCount, 0);
    assert.equal(link.status, 'active');
    assert.ok(link.id);
    assert.ok(!Number.isNaN(Date.parse(link.createdAt)));
    assert.equal(link.__v, undefined, 'internal fields are not exposed');
    assert.equal(link.owner, undefined, 'owner data is not exposed');

    const saved = await Link.findOne({ shortCode: link.shortCode }).lean();
    assert.equal(saved.originalUrl, link.originalUrl);
  });

  test('adds https:// when the scheme is missing', async () => {
    const client = await newClient(app);
    const response = await client.post('/api/links', { url: 'example.com/docs' }).expect(201);
    assert.equal(response.body.link.originalUrl, 'https://example.com/docs');
  });

  test('gives every request its own code, even for the same URL', async () => {
    const client = await newClient(app);
    const first = await client.post('/api/links', { url: 'https://example.com' }).expect(201);
    const second = await client.post('/api/links', { url: 'https://example.com' }).expect(201);
    assert.notEqual(first.body.link.shortCode, second.body.link.shortCode);
  });

  test('creates unique codes for 25 simultaneous requests', async () => {
    const client = await newClient(app);
    const responses = await Promise.all(
      Array.from({ length: 25 }, (_, i) => client.post('/api/links', { url: `https://example.com/${i}` })),
    );
    assert.ok(responses.every((response) => response.status === 201));
    const codes = new Set(responses.map((response) => response.body.link.shortCode));
    assert.equal(codes.size, 25);
    assert.equal(await Link.countDocuments(), 25);
  });

  const invalidBodies = [
    [{}, 'missing url field'],
    [{ url: '' }, 'empty url'],
    [{ url: 'javascript:alert(1)' }, 'javascript: url'],
    [{ url: 'ftp://example.com/file' }, 'ftp: url'],
    [{ url: 'https://user:pass@example.com' }, 'url with credentials'],
    [{ url: 'https://localhost:3000' }, 'localhost url'],
    [{ url: 'https://sho.rt/abc1234' }, 'existing Shortify link'],
    [{ url: ['https://example.com'] }, 'array instead of string'],
  ];

  for (const [body, reason] of invalidBodies) {
    test(`returns 400 for ${reason} and saves nothing`, async () => {
      const client = await newClient(app);
      const response = await client.post('/api/links', body).expect(400);
      assert.equal(response.body.field, 'url');
      assert.equal(typeof response.body.message, 'string');
      assert.equal(await Link.countDocuments(), 0);
    });
  }

  test('returns 400 JSON for a malformed request body', async () => {
    const client = await newClient(app);
    const response = await client.agent
      .post('/api/links')
      .set('X-CSRF-Token', client.csrfToken)
      .set('Content-Type', 'application/json')
      .send('{"url": ')
      .expect(400);
    assert.equal(response.body.message, 'Request body must be valid JSON.');
  });

  test('returns 413 for an oversized request body', async () => {
    const client = await newClient(app);
    await client.post('/api/links', { url: `https://example.com/${'a'.repeat(20_000)}` }).expect(413);
  });
});

describe('link ownership on creation', () => {
  const app = createApp();

  test('a logged-out visitor gets a guest cookie and owns the link as a guest', async () => {
    const client = await newClient(app);
    const response = await client.post('/api/links', { url: 'https://example.com' }).expect(201);
    assert.ok(cookieValue(response, 'shortify_guest'));
    const saved = await Link.findById(response.body.link.id).lean();
    assert.equal(saved.owner, null);
    assert.match(saved.guestKeyHash, /^[0-9a-f]{64}$/);
  });

  test('a logged-in user owns the link directly and gets no guest cookie', async () => {
    const alice = await newUser(app);
    const response = await alice.post('/api/links', { url: 'https://example.com' }).expect(201);
    assert.equal(cookieValue(response, 'shortify_guest'), undefined);
    const saved = await Link.findById(response.body.link.id).lean();
    assert.equal(String(saved.owner), alice.user.id);
    assert.equal(saved.guestKeyHash, null);
  });
});

describe('rate limiting', () => {
  test('blocks an IP after the per-minute limit', async () => {
    const app = createApp({ createLinkLimitPerMinute: 3 });
    const client = await newClient(app);
    for (let i = 0; i < 3; i += 1) {
      await client.post('/api/links', { url: 'https://example.com' }).expect(201);
    }
    const blocked = await client.post('/api/links', { url: 'https://example.com' }).expect(429);
    assert.match(blocked.body.message, /Too many links/);
    assert.equal(await Link.countDocuments(), 3);
  });
});

describe('short code collisions', () => {
  // A fake generator that returns the given codes in order.
  const sequence = (...codes) => {
    let calls = 0;
    const generate = () => codes[Math.min(calls++, codes.length - 1)];
    generate.calls = () => calls;
    return generate;
  };

  test('retries with a new code when the generated code is already taken', async () => {
    await Link.create({ originalUrl: 'https://example.com/existing', shortCode: 'TAKEN01' });
    const generate = sequence('TAKEN01', 'TAKEN01', 'FRESH01');

    const link = await createShortLink('https://example.com/new', { generateCode: generate });

    assert.equal(link.shortCode, 'FRESH01');
    assert.equal(generate.calls(), 3);
    assert.equal(await Link.countDocuments(), 2);
  });

  test(`gives up with a 503 error after ${MAX_CODE_ATTEMPTS} collisions`, async () => {
    await Link.create({ originalUrl: 'https://example.com/existing', shortCode: 'TAKEN01' });
    const generate = sequence('TAKEN01');

    await assert.rejects(createShortLink('https://example.com/new', { generateCode: generate }), (error) => {
      assert.equal(error.status, 503);
      return true;
    });
    assert.equal(generate.calls(), MAX_CODE_ATTEMPTS);
    assert.equal(await Link.countDocuments(), 1, 'the existing link is untouched');
  });

  test('the database itself rejects a duplicate short code', async () => {
    await Link.create({ originalUrl: 'https://example.com/1', shortCode: 'SAME001' });
    await assert.rejects(Link.create({ originalUrl: 'https://example.com/2', shortCode: 'SAME001' }), { code: 11000 });
  });
});

describe('API basics', () => {
  const app = createApp();

  test('GET /api/health reports database status', async () => {
    const response = await request(app).get('/api/health').expect(200);
    assert.deepEqual(response.body, { status: 'ok', database: 'connected' });
  });

  test('unknown API routes return a JSON 404', async () => {
    const response = await request(app).get('/api/does-not-exist').expect(404);
    assert.equal(response.body.message, 'Not found.');
  });

  test('allows the configured frontend origin with credentials (CORS)', async () => {
    const response = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');
    assert.equal(response.headers['access-control-allow-origin'], 'http://localhost:5173');
    assert.equal(response.headers['access-control-allow-credentials'], 'true');
  });

  test('CORS preflight allows the CSRF header for the frontend origin', async () => {
    const response = await request(app)
      .options('/api/links')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type,x-csrf-token')
      .expect(204);
    assert.match(response.headers['access-control-allow-headers'], /X-CSRF-Token/i);
  });

  test('does not allow other origins (CORS)', async () => {
    const response = await request(app).get('/api/health').set('Origin', 'https://evil.example');
    assert.equal(response.headers['access-control-allow-origin'], undefined);
  });

  test('sends security headers', async () => {
    const response = await request(app).get('/api/health');
    assert.equal(response.headers['x-content-type-options'], 'nosniff');
    assert.equal(response.headers['x-powered-by'], undefined);
  });
});
