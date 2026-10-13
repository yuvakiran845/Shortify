import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { Click } from '../src/models/Click.js';
import { Link } from '../src/models/Link.js';
import { QrCode } from '../src/models/QrCode.js';
import { clearDatabase, connectTestDatabase, dropTestDatabase } from './helpers/db.js';
import { newClient, newUser } from './helpers/client.js';

before(connectTestDatabase);
beforeEach(clearDatabase);
after(dropTestDatabase);

const app = createApp();
const BROWSER = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0 Safari/537.36';
const HOUR = 60 * 60 * 1000;
const inHours = (hours) => new Date(Date.now() + hours * HOUR).toISOString();

const open = (code, visitor = 1) => request(app).get(`/${code}`).set('User-Agent', `${BROWSER} visitor-${visitor}`);

async function userWithLink(fields = {}) {
  const user = await newUser(app);
  const link = (await user.post('/api/links', { url: 'https://example.com/original', ...fields }).expect(201)).body.link;
  return { ...user, link };
}

describe('custom aliases', () => {
  test('a logged-in user can choose an alias, and it works as the short link', async () => {
    const ana = await newUser(app);
    const { body } = await ana.post('/api/links', { url: 'https://example.com/sale', alias: 'spring-sale_2026' }).expect(201);
    assert.equal(body.link.shortCode, 'spring-sale_2026');
    assert.equal(body.link.shortUrl, 'https://sho.rt/spring-sale_2026');
    const redirect = await open('spring-sale_2026').expect(302);
    assert.equal(redirect.headers.location, 'https://example.com/sale');
  });

  test('visitors without an account cannot pick an alias, title, or expiry (401)', async () => {
    const guest = await newClient(app);
    for (const extra of [{ alias: 'mine' }, { title: 'Hi' }, { expiresAt: inHours(5) }]) {
      await guest.post('/api/links', { url: 'https://example.com', ...extra }).expect(401);
    }
    assert.equal(await Link.countDocuments(), 0);
  });

  const invalidAliases = [
    ['ab', 'too short'],
    ['a'.repeat(51), 'too long'],
    ['my alias', 'contains a space'],
    ['a/b', 'contains a slash'],
    ['../etc', 'path traversal'],
    ['café', 'non-ASCII letter'],
    ['api', 'reserved'],
    ['Dashboard', 'reserved in another letter case'],
    [42, 'not text'],
  ];
  for (const [alias, reason] of invalidAliases) {
    test(`rejects an alias that is ${reason} (400, field "alias")`, async () => {
      const ana = await newUser(app);
      const { body } = await ana.post('/api/links', { url: 'https://example.com', alias }).expect(400);
      assert.equal(body.field, 'alias');
      assert.equal(await Link.countDocuments(), 0);
    });
  }

  test("an alias someone else uses is a 409 conflict with a clear message", async () => {
    const ana = await newUser(app);
    const bob = await newUser(app);
    await ana.post('/api/links', { url: 'https://ana.example.com', alias: 'launch' }).expect(201);
    const { body } = await bob.post('/api/links', { url: 'https://bob.example.com', alias: 'launch' }).expect(409);
    assert.equal(body.field, 'alias');
    assert.match(body.message, /already taken/);
  });

  test('an alias cannot collide with an existing random short code', async () => {
    const ana = await userWithLink();
    await ana.post('/api/links', { url: 'https://example.com/x', alias: ana.link.shortCode }).expect(409);
  });

  test('two people requesting the same alias at once: the database lets exactly one win', async () => {
    const [ana, bob] = await Promise.all([newUser(app), newUser(app)]);
    const statuses = (
      await Promise.all([
        ana.post('/api/links', { url: 'https://example.com/a', alias: 'race' }),
        bob.post('/api/links', { url: 'https://example.com/b', alias: 'race' }),
      ])
    ).map((response) => response.status).sort();
    assert.deepEqual(statuses, [201, 409]);
    assert.equal(await Link.countDocuments({ shortCode: 'race' }), 1);
  });

  test('aliases are case-sensitive, like generated codes', async () => {
    const ana = await newUser(app);
    await ana.post('/api/links', { url: 'https://example.com/1', alias: 'Promo' }).expect(201);
    await ana.post('/api/links', { url: 'https://example.com/2', alias: 'promo' }).expect(201);
  });
});

describe('expiration dates', () => {
  test('a link can be created with a future expiry and is active until then', async () => {
    const ana = await userWithLink({ expiresAt: inHours(24) });
    assert.equal(ana.link.status, 'active');
    assert.ok(Date.parse(ana.link.expiresAt) > Date.now());
    await open(ana.link.shortCode).expect(302);
  });

  const invalidExpiry = [
    [new Date(Date.now() - HOUR).toISOString(), 'in the past'],
    ['not-a-date', 'not a date'],
    [new Date(Date.now() + 11 * 365 * 24 * HOUR).toISOString(), 'more than 10 years away'],
  ];
  for (const [expiresAt, reason] of invalidExpiry) {
    test(`rejects an expiry ${reason} (400)`, async () => {
      const ana = await newUser(app);
      const { body } = await ana.post('/api/links', { url: 'https://example.com', expiresAt }).expect(400);
      assert.equal(body.field, 'expiresAt');
    });
  }

  test('once expired the link answers 410 but keeps its clicks; extending it brings it back', async () => {
    const ana = await userWithLink({ expiresAt: inHours(1) });
    await open(ana.link.shortCode, 1).expect(302);
    await Link.updateOne({ _id: ana.link.id }, { expiresAt: new Date(Date.now() - 1000) }); // time passes

    await open(ana.link.shortCode, 2).expect(410);
    const expired = (await ana.get(`/api/links/${ana.link.id}`).expect(200)).body.link;
    assert.equal(expired.status, 'expired');
    assert.equal(expired.clickCount, 1);
    assert.equal(await Click.countDocuments(), 1, 'click history is kept');

    await ana.agent.patch(`/api/links/${ana.link.id}`).set('X-CSRF-Token', ana.csrfToken).send({ expiresAt: inHours(48) }).expect(200);
    await open(ana.link.shortCode, 3).expect(302);
  });

  test('expiry can be removed with null', async () => {
    const ana = await userWithLink({ expiresAt: inHours(5) });
    const { body } = await ana.agent.patch(`/api/links/${ana.link.id}`).set('X-CSRF-Token', ana.csrfToken).send({ expiresAt: null }).expect(200);
    assert.equal(body.link.expiresAt, null);
  });
});

describe('PATCH /api/links/:id', () => {
  const patch = (client, id, body) => client.agent.patch(`/api/links/${id}`).set('X-CSRF-Token', client.csrfToken).send(body);

  test('updates destination (normalized), title, and on/off status', async () => {
    const ana = await userWithLink();
    const { body } = await patch(ana, ana.link.id, { url: 'Example.org/new', title: '  Spring newsletter  ', isActive: false }).expect(200);
    assert.equal(body.link.originalUrl, 'https://example.org/new');
    assert.equal(body.link.title, 'Spring newsletter');
    assert.equal(body.link.isActive, false);
    assert.equal(body.link.status, 'disabled');
    assert.equal(body.link.shortCode, ana.link.shortCode, 'unchanged fields stay the same');
  });

  test('turning a link off makes it answer 410 (clicks kept); turning it on restores it', async () => {
    const ana = await userWithLink();
    await open(ana.link.shortCode, 1).expect(302);
    await patch(ana, ana.link.id, { isActive: false }).expect(200);
    await open(ana.link.shortCode, 2).expect(410);
    assert.equal(await Click.countDocuments(), 1);
    await patch(ana, ana.link.id, { isActive: true }).expect(200);
    await open(ana.link.shortCode, 3).expect(302);
  });

  test('changing the alias: the new short URL works, the old one is gone, and saved QR codes follow', async () => {
    const ana = await userWithLink();
    const oldCode = ana.link.shortCode;
    await ana.post('/api/qr-codes', { linkId: ana.link.id }).expect(201);

    const { body } = await patch(ana, ana.link.id, { alias: 'renamed' }).expect(200);
    assert.equal(body.link.shortUrl, 'https://sho.rt/renamed');
    await open('renamed').expect(302);
    await open(oldCode).expect(404);

    const saved = await QrCode.findOne().lean();
    assert.equal(saved.content, 'https://sho.rt/renamed');
  });

  test("after a rename the old alias stays reserved: nobody else can take over its traffic", async () => {
    const ana = await userWithLink({ alias: 'printed-flyer' });
    await patch(ana, ana.link.id, { alias: 'new-flyer' }).expect(200);

    const bob = await newUser(app);
    const { body } = await bob.post('/api/links', { url: 'https://evil.example.com', alias: 'printed-flyer' }).expect(409);
    assert.equal(body.field, 'alias');
    assert.match(body.message, /renamed, so it cannot be reused/);
    await open('printed-flyer').expect(404);

    // The placeholder never shows up as a link of its own.
    const { body: list } = await ana.get('/api/links').expect(200);
    assert.deepEqual(list.links.map((link) => link.shortCode), ['new-flyer']);
  });

  test('a link can switch back to its own earlier alias', async () => {
    const ana = await userWithLink({ alias: 'first-name' });
    await patch(ana, ana.link.id, { alias: 'second-name' }).expect(200);
    await patch(ana, ana.link.id, { alias: 'first-name' }).expect(200);
    await open('first-name').expect(302);
    await open('second-name').expect(404);

    // ...but another of the owner's links cannot take that reserved alias.
    const other = (await ana.post('/api/links', { url: 'https://example.com/other' }).expect(201)).body.link;
    await patch(ana, other.id, { alias: 'second-name' }).expect(409);
    assert.equal(await Link.countDocuments({ formerCodeOf: ana.link.id }), 1);
  });

  test('setting the alias it already has is fine', async () => {
    const ana = await userWithLink({ alias: 'same-name' });
    await patch(ana, ana.link.id, { alias: 'same-name' }).expect(200);
  });

  test('renaming to an alias that is taken is a 409 and changes nothing', async () => {
    const ana = await userWithLink();
    const bob = await userWithLink({ alias: 'taken' });
    const { body } = await patch(ana, ana.link.id, { alias: 'taken', title: 'Also this' }).expect(409);
    assert.equal(body.field, 'alias');
    const unchanged = await Link.findById(ana.link.id).lean();
    assert.equal(unchanged.shortCode, ana.link.shortCode);
    assert.equal(unchanged.title, null);
    assert.ok(bob.link);
  });

  const invalidBodies = [
    [{}, null, 'nothing to update'],
    [{ color: 'red' }, null, 'only unknown fields'],
    [{ isActive: 'yes' }, 'isActive', 'isActive that is not a boolean'],
    [{ url: 'javascript:alert(1)' }, 'url', 'unsafe destination'],
    [{ title: 'x'.repeat(101) }, 'title', 'title over 100 characters'],
    [{ alias: 'a b' }, 'alias', 'invalid alias'],
    [{ expiresAt: '2001-01-01T00:00:00Z' }, 'expiresAt', 'expiry in the past'],
  ];
  for (const [body, field, reason] of invalidBodies) {
    test(`rejects ${reason} (400)`, async () => {
      const ana = await userWithLink();
      const response = await patch(ana, ana.link.id, body).expect(400);
      if (field) assert.equal(response.body.field, field);
    });
  }

  test("other users get 404 and the link does not change", async () => {
    const ana = await userWithLink();
    const bob = await newUser(app);
    await patch(bob, ana.link.id, { url: 'https://evil.example.com' }).expect(404);
    await patch(bob, 'not-an-id', { title: 'x' }).expect(404);
    assert.equal((await Link.findById(ana.link.id).lean()).originalUrl, 'https://example.com/original');
  });

  test('requires login and the CSRF header', async () => {
    const ana = await userWithLink();
    await request(app).patch(`/api/links/${ana.link.id}`).send({ title: 'x' }).expect(403);
    const guest = await newClient(app);
    await patch(guest, ana.link.id, { title: 'x' }).expect(401);
    await ana.agent.patch(`/api/links/${ana.link.id}`).send({ title: 'x' }).expect(403);
  });
});

describe('DELETE /api/links/:id', () => {
  const del = (client, id) => client.agent.delete(`/api/links/${id}`).set('X-CSRF-Token', client.csrfToken);

  test('deletes the link, its click events, and its QR history; the short URL answers 410', async () => {
    const ana = await userWithLink();
    await open(ana.link.shortCode, 1).expect(302);
    await open(ana.link.shortCode, 2).expect(302);
    await ana.post('/api/qr-codes', { linkId: ana.link.id }).expect(201);
    await ana.post('/api/qr-codes', { url: 'https://example.org/unrelated' }).expect(201);

    await del(ana, ana.link.id).expect(204);

    const page = await open(ana.link.shortCode, 3).expect(410);
    assert.match(page.text, /was deleted/);
    assert.equal(await Click.countDocuments(), 0, 'click events removed');
    assert.deepEqual((await QrCode.find().lean()).map((qr) => qr.content), ['https://example.org/unrelated']);

    const tombstone = await Link.findById(ana.link.id).lean();
    assert.ok(tombstone.deletedAt);
    assert.equal(tombstone.originalUrl, null, 'the destination is erased');
    assert.equal(tombstone.shortCode, ana.link.shortCode, 'the code stays reserved');
  });

  test('deleted links disappear from the list, lookups, dashboard, analytics, and QR picker', async () => {
    const ana = await userWithLink();
    const keep = (await ana.post('/api/links', { url: 'https://example.com/keep' }).expect(201)).body.link;
    await open(ana.link.shortCode, 1).expect(302);
    await open(keep.shortCode, 2).expect(302);
    await del(ana, ana.link.id).expect(204);

    assert.deepEqual((await ana.get('/api/links').expect(200)).body.links.map((link) => link.id), [keep.id]);
    await ana.get(`/api/links/${ana.link.id}`).expect(404);
    const dashboard = (await ana.get('/api/dashboard').expect(200)).body;
    assert.deepEqual(dashboard.stats, { totalLinks: 1, totalClicks: 1, activeLinks: 1, qrCodes: 0 });
    const range = new URLSearchParams({ from: new Date(Date.now() - HOUR).toISOString(), to: new Date(Date.now() + HOUR).toISOString() });
    const analytics = (await ana.get(`/api/analytics?${range}`).expect(200)).body;
    assert.equal(analytics.totals.clicks, dashboard.stats.totalClicks, 'dashboard and analytics agree');
    await ana.get(`/api/analytics?${range}&linkId=${ana.link.id}`).expect(404);
    await ana.post('/api/qr-codes', { linkId: ana.link.id }).expect(404);
  });

  test("a deleted link's alias can never be reused (protects old QR codes and shared links)", async () => {
    const ana = await userWithLink({ alias: 'old-campaign' });
    await del(ana, ana.link.id).expect(204);
    const bob = await newUser(app);
    const { body } = await bob.post('/api/links', { url: 'https://evil.example.com', alias: 'old-campaign' }).expect(409);
    assert.match(body.message, /deleted link and cannot be reused/);
  });

  test('deleting twice, or someone else deleting, is a 404', async () => {
    const ana = await userWithLink();
    const bob = await newUser(app);
    await del(bob, ana.link.id).expect(404);
    assert.equal((await Link.findById(ana.link.id).lean()).deletedAt, null);
    await del(ana, ana.link.id).expect(204);
    await del(ana, ana.link.id).expect(404);
  });

  test('a deleted link cannot be edited', async () => {
    const ana = await userWithLink();
    await del(ana, ana.link.id).expect(204);
    await ana.agent.patch(`/api/links/${ana.link.id}`).set('X-CSRF-Token', ana.csrfToken).send({ title: 'x' }).expect(404);
  });

  test('requires login and the CSRF header', async () => {
    const ana = await userWithLink();
    await ana.agent.delete(`/api/links/${ana.link.id}`).expect(403);
    const guest = await newClient(app);
    await del(guest, ana.link.id).expect(401);
    assert.equal((await Link.findById(ana.link.id).lean()).deletedAt, null);
  });
});

describe('titles in the list and search', () => {
  test('titles are returned and searchable', async () => {
    const ana = await userWithLink({ title: 'Black Friday banner' });
    await ana.post('/api/links', { url: 'https://example.com/other' }).expect(201);
    const { body } = await ana.get('/api/links?search=friday').expect(200);
    assert.deepEqual(body.links.map((link) => link.title), ['Black Friday banner']);
  });
});
