import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { QrCode } from '../src/models/QrCode.js';
import { syncLinkQrCodes } from '../src/services/qrService.js';
import { clearDatabase, connectTestDatabase, dropTestDatabase } from './helpers/db.js';
import { newClient, newUser } from './helpers/client.js';

before(connectTestDatabase);
beforeEach(clearDatabase);
after(dropTestDatabase);

const app = createApp();

describe('GET /api/config', () => {
  test('tells the frontend which domain short links use', async () => {
    const response = await request(app).get('/api/config').expect(200);
    assert.deepEqual(response.body, { shortLinkBaseUrl: 'https://sho.rt' });
  });
});

describe('GET /api/links/:id', () => {
  test('returns one of your own links', async () => {
    const ana = await newUser(app);
    const created = await ana.post('/api/links', { url: 'https://example.com/mine' }).expect(201);
    const response = await ana.get(`/api/links/${created.body.link.id}`).expect(200);
    assert.equal(response.body.link.shortUrl, created.body.link.shortUrl);
  });

  test("someone else's link, an unknown id, and a malformed id all look the same (404)", async () => {
    const ana = await newUser(app);
    const bob = await newUser(app);
    const anasLink = await ana.post('/api/links', { url: 'https://example.com/private' }).expect(201);

    const others = await bob.get(`/api/links/${anasLink.body.link.id}`).expect(404);
    const unknown = await bob.get('/api/links/507f1f77bcf86cd799439011').expect(404);
    const malformed = await bob.get('/api/links/not-an-id').expect(404);
    assert.equal(others.body.message, unknown.body.message);
    assert.equal(malformed.body.message, unknown.body.message);
  });

  test('requires login', async () => {
    await request(app).get('/api/links/507f1f77bcf86cd799439011').expect(401);
  });
});

describe('QR code history: access', () => {
  test('every QR history route requires login', async () => {
    const guest = await newClient(app);
    await guest.get('/api/qr-codes').expect(401);
    await guest.post('/api/qr-codes', { url: 'https://example.com' }).expect(401);
    await guest.delete('/api/qr-codes/507f1f77bcf86cd799439011').expect(401);
  });

  test('state-changing QR routes require the CSRF header', async () => {
    const ana = await newUser(app);
    await ana.agent.post('/api/qr-codes').send({ url: 'https://example.com' }).expect(403);
  });
});

describe('POST /api/qr-codes', () => {
  test('saves a QR code for a website URL (normalized like the shortener)', async () => {
    const ana = await newUser(app);
    const response = await ana.post('/api/qr-codes', { url: 'Example.com/menu' }).expect(201);
    assert.equal(response.body.qrCode.content, 'https://example.com/menu');
    assert.equal(response.body.qrCode.linkId, null);
    assert.equal(response.body.qrCode.generatedCount, 1);
  });

  test('a QR code for your Shortify link uses the configured public short URL', async () => {
    const ana = await newUser(app);
    const link = (await ana.post('/api/links', { url: 'https://example.com/long/page' }).expect(201)).body.link;
    const response = await ana.post('/api/qr-codes', { linkId: link.id }).expect(201);
    assert.equal(response.body.qrCode.content, `https://sho.rt/${link.shortCode}`);
    assert.equal(response.body.qrCode.linkId, link.id);
  });

  test('a pasted Shortify short link is allowed as a URL', async () => {
    const ana = await newUser(app);
    const response = await ana.post('/api/qr-codes', { url: 'https://sho.rt/Abc1234' }).expect(201);
    assert.equal(response.body.qrCode.content, 'https://sho.rt/Abc1234');
  });

  test("cannot make a history entry for someone else's link (404)", async () => {
    const ana = await newUser(app);
    const bob = await newUser(app);
    const anasLink = (await ana.post('/api/links', { url: 'https://example.com/private' }).expect(201)).body.link;
    const response = await bob.post('/api/qr-codes', { linkId: anasLink.id }).expect(404);
    assert.equal(response.body.field, 'linkId');
    assert.equal(await QrCode.countDocuments(), 0);
  });

  const invalid = [
    [{}, 400, 'url', 'nothing to encode'],
    [{ url: 'javascript:alert(1)' }, 400, 'url', 'javascript: URL'],
    [{ url: 'https://user:pw@example.com' }, 400, 'url', 'URL with credentials'],
    [{ linkId: 'not-an-id' }, 404, 'linkId', 'malformed link id'],
  ];
  for (const [body, status, field, reason] of invalid) {
    test(`rejects ${reason} (${status})`, async () => {
      const ana = await newUser(app);
      const response = await ana.post('/api/qr-codes', body).expect(status);
      assert.equal(response.body.field, field);
      assert.equal(await QrCode.countDocuments(), 0);
    });
  }

  test('generating the same URL again moves it to the top instead of duplicating it', async () => {
    const ana = await newUser(app);
    const first = await ana.post('/api/qr-codes', { url: 'https://example.com/a' }).expect(201);
    await ana.post('/api/qr-codes', { url: 'https://example.com/b' }).expect(201);
    const again = await ana.post('/api/qr-codes', { url: 'example.com/a' }).expect(200);

    assert.equal(again.body.qrCode.id, first.body.qrCode.id);
    assert.equal(again.body.qrCode.generatedCount, 2);
    const list = await ana.get('/api/qr-codes').expect(200);
    assert.deepEqual(
      list.body.qrCodes.map((qr) => qr.content),
      ['https://example.com/a', 'https://example.com/b'],
    );
  });

  test('ten simultaneous requests for one URL still make a single entry', async () => {
    const ana = await newUser(app);
    const responses = await Promise.all(
      Array.from({ length: 10 }, () => ana.post('/api/qr-codes', { url: 'https://example.com/race' })),
    );
    assert.ok(responses.every((response) => [200, 201].includes(response.status)));
    const saved = await QrCode.find().lean();
    assert.equal(saved.length, 1);
    assert.equal(saved[0].generatedCount, 10);
  });
});

describe('GET and DELETE /api/qr-codes', () => {
  test('lists only your own history, newest first, limited', async () => {
    const ana = await newUser(app);
    const bob = await newUser(app);
    for (const path of ['one', 'two', 'three']) await ana.post('/api/qr-codes', { url: `https://example.com/${path}` }).expect(201);
    await bob.post('/api/qr-codes', { url: 'https://bob.example.com' }).expect(201);

    const list = await ana.get('/api/qr-codes?limit=2').expect(200);
    assert.deepEqual(
      list.body.qrCodes.map((qr) => qr.content),
      ['https://example.com/three', 'https://example.com/two'],
    );
    const bobs = await bob.get('/api/qr-codes').expect(200);
    assert.equal(bobs.body.qrCodes.length, 1);
  });

  for (const limit of ['0', '51', 'abc']) {
    test(`rejects ?limit=${limit}`, async () => {
      const ana = await newUser(app);
      await ana.get(`/api/qr-codes?limit=${limit}`).expect(400);
    });
  }

  test('deletes your own entry; other people cannot delete it', async () => {
    const ana = await newUser(app);
    const bob = await newUser(app);
    const qr = (await ana.post('/api/qr-codes', { url: 'https://example.com' }).expect(201)).body.qrCode;

    await bob.delete(`/api/qr-codes/${qr.id}`).expect(404);
    assert.equal(await QrCode.countDocuments(), 1);

    await ana.delete(`/api/qr-codes/${qr.id}`).expect(204);
    assert.equal((await ana.get('/api/qr-codes').expect(200)).body.qrCodes.length, 0);
    await ana.delete(`/api/qr-codes/${qr.id}`).expect(404);
    await ana.delete('/api/qr-codes/not-an-id').expect(404);
  });
});

describe('saved QR codes follow the short-link address', () => {
  // Simulates QR codes saved while PUBLIC_BASE_URL was still http://localhost:5000.
  const makeOutdated = (id, code) => QrCode.updateOne({ _id: id }, { $set: { content: `http://localhost:5000/${code}` } });

  test('entries for links are updated to the current address; plain URLs are left alone', async () => {
    const ana = await newUser(app);
    const link = (await ana.post('/api/links', { url: 'https://example.com/flyer' }).expect(201)).body.link;
    const forLink = (await ana.post('/api/qr-codes', { linkId: link.id }).expect(201)).body.qrCode;
    const forUrl = (await ana.post('/api/qr-codes', { url: 'https://example.com/menu' }).expect(201)).body.qrCode;
    await makeOutdated(forLink.id, link.shortCode);

    assert.equal(await syncLinkQrCodes(), 1);
    const history = (await ana.get('/api/qr-codes').expect(200)).body.qrCodes;
    assert.equal(history.find((item) => item.id === forLink.id).content, link.shortUrl);
    assert.equal(history.find((item) => item.id === forUrl.id).content, 'https://example.com/menu');
    assert.equal(await syncLinkQrCodes(), 0, 'nothing left to update');
  });

  test('an outdated copy is removed when the owner already has the up-to-date entry', async () => {
    const ana = await newUser(app);
    const link = (await ana.post('/api/links', { url: 'https://example.com/poster' }).expect(201)).body.link;
    const old = (await ana.post('/api/qr-codes', { linkId: link.id }).expect(201)).body.qrCode;
    await makeOutdated(old.id, link.shortCode);
    await ana.post('/api/qr-codes', { linkId: link.id }).expect(201); // generated again after the address changed

    await syncLinkQrCodes();
    const contents = (await ana.get('/api/qr-codes').expect(200)).body.qrCodes.map((item) => item.content);
    assert.deepEqual(contents, [link.shortUrl]);
  });
});
