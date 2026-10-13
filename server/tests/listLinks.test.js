import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { Link } from '../src/models/Link.js';
import { clearDatabase, connectTestDatabase, dropTestDatabase } from './helpers/db.js';
import { newClient, newUser } from './helpers/client.js';

before(connectTestDatabase);
beforeEach(clearDatabase);
after(dropTestDatabase);

const app = createApp();
const DAY = 24 * 60 * 60 * 1000;

// Inserts links directly (bypassing Mongoose defaults) so tests control dates, clicks, and status.
let seedCounter = 0;
async function seedLinks(ownerId, specs) {
  const now = Date.now();
  const docs = specs.map((spec, i) => {
    seedCounter += 1;
    return {
      originalUrl: spec.url ?? `https://example.com/page-${seedCounter}`,
      shortCode: spec.code ?? `Seed${String(seedCounter).padStart(3, '0')}`,
      owner: new mongoose.Types.ObjectId(ownerId),
      guestKeyHash: null,
      clickCount: spec.clicks ?? 0,
      lastClickedAt: null,
      expiresAt: spec.expiresAt ?? null,
      isActive: spec.isActive ?? true,
      createdAt: spec.createdAt ?? new Date(now - i * 1000),
      updatedAt: new Date(now),
    };
  });
  await Link.collection.insertMany(docs);
}

const codesOf = (response) => response.body.links.map((link) => link.shortCode);

describe('who can list links', () => {
  test('logged-out visitors get 401, even if this browser created guest links', async () => {
    const guest = await newClient(app);
    await guest.post('/api/links', { url: 'https://example.com' }).expect(201);
    const response = await guest.get('/api/links').expect(401);
    assert.equal(response.body.message, 'Please log in to continue.');
  });

  test('a logged-in user sees the links they created', async () => {
    const alice = await newUser(app);
    const created = await alice.post('/api/links', { url: 'https://example.com/mine' }).expect(201);
    const list = await alice.get('/api/links').expect(200);
    assert.deepEqual(codesOf(list), [created.body.link.shortCode]);
  });

  test("users never see each other's links, not even through search", async () => {
    const alice = await newUser(app);
    const bob = await newUser(app);
    await alice.post('/api/links', { url: 'https://alice.example.com/a' }).expect(201);
    await alice.post('/api/links', { url: 'https://alice.example.com/b' }).expect(201);
    await bob.post('/api/links', { url: 'https://bob.example.com/a' }).expect(201);

    const aliceList = await alice.get('/api/links').expect(200);
    const bobList = await bob.get('/api/links').expect(200);
    assert.equal(aliceList.body.pagination.total, 2);
    assert.ok(aliceList.body.links.every((link) => link.originalUrl.startsWith('https://alice.')));
    assert.equal(bobList.body.pagination.total, 1);

    const bobSearch = await bob.get('/api/links?search=alice').expect(200);
    assert.equal(bobSearch.body.pagination.total, 0);
  });

  test('responses never include owner ids or guest hashes', async () => {
    const alice = await newUser(app);
    await alice.post('/api/links', { url: 'https://example.com' }).expect(201);
    const list = await alice.get('/api/links').expect(200);
    const link = list.body.links[0];
    assert.equal(link.owner, undefined);
    assert.equal(link.guestKeyHash, undefined);
    assert.equal(JSON.stringify(list.body).includes(alice.user.id), false);
  });

  test('links persist across a server restart (new app instance, same session)', async () => {
    const alice = await newUser(app);
    const created = await alice.post('/api/links', { url: 'https://example.com' }).expect(201);
    const restartedApp = createApp();
    const response = await request(restartedApp)
      .get('/api/links')
      .set('Cookie', `shortify_session=${alice.sessionToken}`)
      .expect(200);
    assert.deepEqual(codesOf(response), [created.body.link.shortCode]);
  });
});

describe('pagination', () => {
  test('pages through 25 links with no duplicates or gaps', async () => {
    const alice = await newUser(app);
    await seedLinks(alice.user.id, Array.from({ length: 25 }, () => ({})));

    const page1 = await alice.get('/api/links?page=1').expect(200);
    const page2 = await alice.get('/api/links?page=2').expect(200);
    const page3 = await alice.get('/api/links?page=3').expect(200);
    const page4 = await alice.get('/api/links?page=4').expect(200);

    assert.deepEqual(page1.body.pagination, { page: 1, limit: 10, total: 25, totalPages: 3 });
    assert.equal(page1.body.links.length, 10);
    assert.equal(page2.body.links.length, 10);
    assert.equal(page3.body.links.length, 5);
    assert.equal(page4.body.links.length, 0, 'a page past the end is empty, not an error');

    const allCodes = [...codesOf(page1), ...codesOf(page2), ...codesOf(page3)];
    assert.equal(new Set(allCodes).size, 25);
  });

  test('respects a custom page size', async () => {
    const alice = await newUser(app);
    await seedLinks(alice.user.id, Array.from({ length: 10 }, () => ({})));
    const response = await alice.get('/api/links?limit=4&page=3').expect(200);
    assert.equal(response.body.links.length, 2);
    assert.deepEqual(response.body.pagination, { page: 3, limit: 4, total: 10, totalPages: 3 });
  });
});

describe('sorting', () => {
  async function seedSortable() {
    const alice = await newUser(app);
    const now = Date.now();
    await seedLinks(alice.user.id, [
      { code: 'Old0001', createdAt: new Date(now - 3 * DAY), clicks: 5 },
      { code: 'Mid0001', createdAt: new Date(now - 2 * DAY), clicks: 50 },
      { code: 'New0001', createdAt: new Date(now - 1 * DAY), clicks: 0 },
      { code: 'Tie0001', createdAt: new Date(now - 4 * DAY), clicks: 5 },
    ]);
    return alice;
  }

  test('newest first by default', async () => {
    const alice = await seedSortable();
    assert.deepEqual(codesOf(await alice.get('/api/links')), ['New0001', 'Mid0001', 'Old0001', 'Tie0001']);
  });

  test('oldest first', async () => {
    const alice = await seedSortable();
    assert.deepEqual(codesOf(await alice.get('/api/links?sort=oldest')), ['Tie0001', 'Old0001', 'Mid0001', 'New0001']);
  });

  test('most clicks, ties broken consistently', async () => {
    const alice = await seedSortable();
    const first = codesOf(await alice.get('/api/links?sort=most-clicks'));
    const again = codesOf(await alice.get('/api/links?sort=most-clicks'));
    assert.equal(first[0], 'Mid0001');
    assert.equal(first[3], 'New0001');
    assert.deepEqual(first, again);
  });

  test('fewest clicks', async () => {
    const alice = await seedSortable();
    const codes = codesOf(await alice.get('/api/links?sort=fewest-clicks'));
    assert.equal(codes[0], 'New0001');
    assert.equal(codes[3], 'Mid0001');
  });
});

describe('search', () => {
  async function seedSearchable() {
    const alice = await newUser(app);
    await seedLinks(alice.user.id, [
      { url: 'https://github.com/shortify/app', code: 'GhLink1' },
      { url: 'https://docs.github.com/en/rest', code: 'GhDocs1' },
      { url: 'https://example.com/a.c', code: 'DotLnk1' },
      { url: 'https://example.com/abc', code: 'AbcLnk1' },
      { url: 'https://news.ycombinator.com', code: 'Promo42' },
    ]);
    return alice;
  }

  test('matches part of the original URL, ignoring case', async () => {
    const alice = await seedSearchable();
    const response = await alice.get('/api/links?search=GITHUB').expect(200);
    assert.deepEqual(codesOf(response).sort(), ['GhDocs1', 'GhLink1']);
    assert.equal(response.body.pagination.total, 2);
  });

  test('matches the short code', async () => {
    const alice = await seedSearchable();
    assert.deepEqual(codesOf(await alice.get('/api/links?search=promo4')), ['Promo42']);
  });

  test('treats regex characters as plain text', async () => {
    const alice = await seedSearchable();
    assert.deepEqual(codesOf(await alice.get('/api/links?search=a.c')), ['DotLnk1']);
    assert.equal((await alice.get('/api/links?search=.*').expect(200)).body.pagination.total, 0);
    assert.equal((await alice.get(`/api/links?search=${encodeURIComponent('(')}`).expect(200)).body.pagination.total, 0);
  });
});

describe('filters', () => {
  async function seedStatuses() {
    const alice = await newUser(app);
    const now = Date.now();
    await seedLinks(alice.user.id, [
      { code: 'Active1', clicks: 3 },
      { code: 'Future1', expiresAt: new Date(now + DAY) },
      { code: 'Expire1', expiresAt: new Date(now - DAY), clicks: 7 },
      { code: 'Disabl1', isActive: false },
      { code: 'DisExp1', isActive: false, expiresAt: new Date(now - DAY), clicks: 1 },
    ]);
    return alice;
  }
  const sortedCodes = async (client, query) => codesOf(await client.get(`/api/links?${query}`).expect(200)).sort();

  test('status=active includes links that have not expired yet', async () => {
    const alice = await seedStatuses();
    assert.deepEqual(await sortedCodes(alice, 'status=active'), ['Active1', 'Future1']);
  });

  test('status=expired excludes switched-off links', async () => {
    const alice = await seedStatuses();
    assert.deepEqual(await sortedCodes(alice, 'status=expired'), ['Expire1']);
  });

  test('status=disabled', async () => {
    const alice = await seedStatuses();
    assert.deepEqual(await sortedCodes(alice, 'status=disabled'), ['DisExp1', 'Disabl1']);
  });

  test('clicks=clicked and clicks=unclicked', async () => {
    const alice = await seedStatuses();
    assert.deepEqual(await sortedCodes(alice, 'clicks=clicked'), ['Active1', 'DisExp1', 'Expire1']);
    assert.deepEqual(await sortedCodes(alice, 'clicks=unclicked'), ['Disabl1', 'Future1']);
  });

  test('filters combine with each other and with search', async () => {
    const alice = await seedStatuses();
    assert.deepEqual(await sortedCodes(alice, 'status=disabled&clicks=clicked'), ['DisExp1']);
    assert.deepEqual(await sortedCodes(alice, 'status=active&search=future'), ['Future1']);
  });

  test('each link reports its computed status', async () => {
    const alice = await seedStatuses();
    const response = await alice.get('/api/links').expect(200);
    const statuses = Object.fromEntries(response.body.links.map((link) => [link.shortCode, link.status]));
    assert.deepEqual(statuses, { Active1: 'active', Future1: 'active', Expire1: 'expired', Disabl1: 'disabled', DisExp1: 'disabled' });
  });
});

describe('query validation', () => {
  const badQueries = [
    'page=0',
    'page=-1',
    'page=abc',
    'page=1.5',
    'limit=0',
    'limit=51',
    'sort=random',
    'status=deleted',
    'clicks=lots',
    `search=${'x'.repeat(201)}`,
    'search=a&search=b',
  ];
  for (const query of badQueries) {
    test(`rejects ?${query.slice(0, 30)} with 400`, async () => {
      const alice = await newUser(app);
      const response = await alice.get(`/api/links?${query}`).expect(400);
      assert.equal(typeof response.body.message, 'string');
    });
  }
});

describe('query performance', () => {
  test('the default list query reads from an index without an in-memory sort', async () => {
    const alice = await newUser(app);
    const plan = await Link.find({ $and: [{ owner: new mongoose.Types.ObjectId(alice.user.id) }] })
      .sort({ createdAt: -1, _id: -1 })
      .limit(10)
      .explain('queryPlanner');
    const winningPlan = JSON.stringify(plan.queryPlanner?.winningPlan ?? plan);
    assert.match(winningPlan, /IXSCAN/);
    assert.match(winningPlan, /owner_1_createdAt_-1__id_-1/);
    assert.doesNotMatch(winningPlan, /"stage":"SORT"/);
  });

  test('the indexes exist in MongoDB', async () => {
    const names = (await mongoose.connection.db.collection('links').indexes()).map((index) => index.name);
    for (const name of ['owner_1_createdAt_-1__id_-1', 'owner_1_clickCount_-1__id_-1', 'guestKeyHash_1', 'shortCode_1']) {
      assert.ok(names.includes(name), `missing index ${name}`);
    }
  });
});
