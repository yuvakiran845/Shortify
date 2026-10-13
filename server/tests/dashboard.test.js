import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { Link } from '../src/models/Link.js';
import { clearDatabase, connectTestDatabase, dropTestDatabase } from './helpers/db.js';
import { newUser } from './helpers/client.js';

before(connectTestDatabase);
beforeEach(clearDatabase);
after(dropTestDatabase);

const app = createApp();
const DAY = 24 * 60 * 60 * 1000;

// Opens a short link the way a real visitor does (browser User-Agent), so the
// click goes through the actual redirect + counting code.
const visit = (code, visitor) =>
  request(app).get(`/${code}`).set('User-Agent', `Mozilla/5.0 (Windows NT 10.0) Chrome/130.0 visitor-${visitor}`).expect(302);

describe('GET /api/dashboard', () => {
  test('requires login', async () => {
    await request(app).get('/api/dashboard').expect(401);
  });

  test('a brand-new account sees zeros and no recent links', async () => {
    const ana = await newUser(app);
    const response = await ana.get('/api/dashboard').expect(200);
    assert.deepEqual(response.body, {
      stats: { totalLinks: 0, totalClicks: 0, activeLinks: 0, qrCodes: 0 },
      recentLinks: [],
    });
    assert.equal(response.headers['cache-control'], 'no-store');
  });

  test('stats come from real activity: links, redirect clicks, and QR codes', async () => {
    const ana = await newUser(app);
    const created = [];
    for (const path of ['a', 'b', 'c']) {
      created.push((await ana.post('/api/links', { url: `https://example.com/${path}` }).expect(201)).body.link);
    }

    // 3 different visitors open link a, 1 opens link b, and a bot opens link c (not counted).
    for (const visitor of [1, 2, 3]) await visit(created[0].shortCode, visitor);
    await visit(created[1].shortCode, 4);
    await request(app).get(`/${created[2].shortCode}`).set('User-Agent', 'Googlebot/2.1').expect(302);

    await ana.post('/api/qr-codes', { linkId: created[0].id }).expect(201);
    await ana.post('/api/qr-codes', { url: 'https://example.org/menu' }).expect(201);
    await ana.post('/api/qr-codes', { url: 'https://example.org/menu' }).expect(200); // same URL: no new entry

    const { body } = await ana.get('/api/dashboard').expect(200);
    assert.deepEqual(body.stats, { totalLinks: 3, totalClicks: 4, activeLinks: 3, qrCodes: 2 });
  });

  test('active links exclude expired and switched-off links', async () => {
    const ana = await newUser(app);
    const ids = [];
    for (const path of ['live', 'future', 'expired', 'off']) {
      ids.push((await ana.post('/api/links', { url: `https://example.com/${path}` }).expect(201)).body.link.id);
    }
    await Link.updateOne({ _id: ids[1] }, { expiresAt: new Date(Date.now() + DAY) });
    await Link.updateOne({ _id: ids[2] }, { expiresAt: new Date(Date.now() - DAY) });
    await Link.updateOne({ _id: ids[3] }, { isActive: false });

    const { body } = await ana.get('/api/dashboard').expect(200);
    assert.equal(body.stats.totalLinks, 4);
    assert.equal(body.stats.activeLinks, 2);
  });

  test('recent links are the 5 newest, newest first, with their status', async () => {
    const ana = await newUser(app);
    for (let i = 1; i <= 7; i += 1) {
      await ana.post('/api/links', { url: `https://example.com/${i}` }).expect(201);
    }
    const { body } = await ana.get('/api/dashboard').expect(200);
    assert.deepEqual(
      body.recentLinks.map((link) => link.originalUrl),
      ['https://example.com/7', 'https://example.com/6', 'https://example.com/5', 'https://example.com/4', 'https://example.com/3'],
    );
    assert.ok(body.recentLinks.every((link) => link.status === 'active' && link.shortUrl.startsWith('https://sho.rt/')));
  });

  test("never includes another user's links, clicks, or QR codes", async () => {
    const ana = await newUser(app);
    const bob = await newUser(app);
    const bobsLink = (await bob.post('/api/links', { url: 'https://bob.example.com' }).expect(201)).body.link;
    await visit(bobsLink.shortCode, 9);
    await bob.post('/api/qr-codes', { url: 'https://bob.example.com' }).expect(201);
    await ana.post('/api/links', { url: 'https://ana.example.com' }).expect(201);

    const anas = (await ana.get('/api/dashboard').expect(200)).body;
    assert.deepEqual(anas.stats, { totalLinks: 1, totalClicks: 0, activeLinks: 1, qrCodes: 0 });
    assert.equal(anas.recentLinks.length, 1);
    assert.equal(anas.recentLinks[0].originalUrl, 'https://ana.example.com/');

    const bobs = (await bob.get('/api/dashboard').expect(200)).body;
    assert.deepEqual(bobs.stats, { totalLinks: 1, totalClicks: 1, activeLinks: 1, qrCodes: 1 });
  });

  test('guest links count only after they move into the account', async () => {
    const browser = await newUser(app, { email: 'later@example.com' });
    await browser.post('/api/auth/logout').expect(204);
    await browser.post('/api/links', { url: 'https://example.com/made-as-guest' }).expect(201);
    await browser.post('/api/auth/login', { email: 'later@example.com', password: browser.credentials.password }).expect(200);
    const { body } = await browser.get('/api/dashboard').expect(200);
    assert.equal(body.stats.totalLinks, 1);
  });
});
