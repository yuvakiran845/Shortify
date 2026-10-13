import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { Click } from '../src/models/Click.js';
import { DailySalt, SALT_LIFETIME_SECONDS } from '../src/models/DailySalt.js';
import { visitorIdFor } from '../src/services/visitorService.js';
import { daysInRange } from '../src/utils/analyticsQuery.js';
import { deviceTypeFromUserAgent } from '../src/utils/visitor.js';
import { clearDatabase, connectTestDatabase, dropTestDatabase } from './helpers/db.js';
import { newClient, newUser } from './helpers/client.js';

before(connectTestDatabase);
beforeEach(clearDatabase);
after(dropTestDatabase);

const app = createApp();

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';
const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36';
const IPAD = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';
const ANDROID_TABLET = 'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 Chrome/130.0 Safari/537.36';
const ANDROID_PHONE = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36';

async function userWithLinks(paths = ['a', 'b']) {
  const user = await newUser(app);
  const links = [];
  for (const path of paths) links.push((await user.post('/api/links', { url: `https://example.com/${path}` }).expect(201)).body.link);
  return { ...user, links };
}

const open = (code, { userAgent = WINDOWS, referer } = {}) => {
  const req = request(app).get(`/${code}`).set('User-Agent', userAgent);
  return (referer ? req.set('Referer', referer) : req).expect(302);
};

const analyticsQuery = (params) => `/api/analytics?${new URLSearchParams(params)}`;
const LAST_DAY = { from: new Date(Date.now() - 24 * 3600e3).toISOString(), to: new Date(Date.now() + 60e3).toISOString() };

describe('what a click records (privacy)', () => {
  test('referrer domain only, device type, and a visitor hash - never the IP or full URL', async () => {
    const ana = await userWithLinks(['a']);
    await open(ana.links[0].shortCode, { userAgent: IPHONE, referer: 'https://www.news.ycombinator.com/item?id=123&user=secret' });

    const click = await Click.findOne().lean();
    assert.deepEqual(Object.keys(click).sort(), ['_id', 'clickedAt', 'deviceType', 'link', 'owner', 'referrerHost', 'visitorId']);
    assert.equal(click.referrerHost, 'news.ycombinator.com', 'www. removed, path and query dropped');
    assert.equal(click.deviceType, 'mobile');
    assert.match(click.visitorId, /^[0-9a-f]{16}$/);
    assert.equal(String(click.owner), ana.user.id);
    assert.equal(JSON.stringify(click).includes('127.0.0.1'), false);
    assert.equal(JSON.stringify(click).includes('secret'), false);
  });

  test('no or invalid referrer is stored as null ("direct")', async () => {
    const ana = await userWithLinks(['a', 'b']);
    await open(ana.links[0].shortCode);
    await open(ana.links[1].shortCode, { referer: 'not a url' });
    const clicks = await Click.find().lean();
    assert.deepEqual(clicks.map((click) => click.referrerHost), [null, null]);
  });

  const devices = [
    [WINDOWS, 'desktop'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) Safari/605.1.15', 'desktop'],
    [IPHONE, 'mobile'],
    [ANDROID_PHONE, 'mobile'],
    [IPAD, 'tablet'],
    [ANDROID_TABLET, 'tablet'],
    ['curl/8.4.0', 'other'],
  ];
  for (const [userAgent, expected] of devices) {
    test(`device type: ${expected} for ${userAgent.slice(13, 45)}`, () => {
      assert.equal(deviceTypeFromUserAgent(userAgent), expected);
    });
  }
});

describe('unique visitor hashes', () => {
  test('same person + browser + day = same id, across different links', async () => {
    const ana = await userWithLinks(['a', 'b']);
    await open(ana.links[0].shortCode);
    await open(ana.links[1].shortCode);
    const ids = (await Click.find().lean()).map((click) => click.visitorId);
    assert.equal(ids[0], ids[1]);
  });

  test('another browser, or another day, gives a different id', async () => {
    const today = new Date('2026-10-13T10:00:00Z');
    const tomorrow = new Date('2026-10-14T10:00:00Z');
    const base = await visitorIdFor({ ip: '203.0.113.7', userAgent: WINDOWS }, today);
    assert.equal(await visitorIdFor({ ip: '203.0.113.7', userAgent: WINDOWS }, today), base);
    assert.notEqual(await visitorIdFor({ ip: '203.0.113.7', userAgent: IPHONE }, today), base);
    assert.notEqual(await visitorIdFor({ ip: '203.0.113.7', userAgent: WINDOWS }, tomorrow), base);
  });

  test('daily salts are random and MongoDB deletes them after two days (TTL index)', async () => {
    await visitorIdFor({ ip: '203.0.113.7', userAgent: WINDOWS }, new Date('2026-10-13T10:00:00Z'));
    const salt = await DailySalt.findOne({ day: '2026-10-13' }).lean();
    assert.match(salt.salt, /^[0-9a-f]{64}$/);
    const ttl = (await DailySalt.collection.indexes()).find((index) => index.key.createdAt);
    assert.equal(ttl.expireAfterSeconds, SALT_LIFETIME_SECONDS);
    assert.equal(SALT_LIFETIME_SECONDS, 2 * 24 * 60 * 60);
  });
});

describe('GET /api/analytics', () => {
  // Seeds clicks directly with exact times, so aggregations can be checked precisely.
  async function seed() {
    const ana = await userWithLinks(['first', 'second', 'third']);
    const bob = await userWithLinks(['bobs']);
    const [l1, l2, l3] = ana.links.map((link) => new mongoose.Types.ObjectId(link.id));
    const owner = new mongoose.Types.ObjectId(ana.user.id);
    const click = (link, at, extra = {}) => ({ link, owner, clickedAt: new Date(at), referrerHost: null, deviceType: 'desktop', visitorId: null, ...extra });
    await Click.insertMany([
      click(l1, '2026-10-01T09:00:00Z', { visitorId: 'v1', referrerHost: 't.co', deviceType: 'mobile' }),
      click(l1, '2026-10-01T10:00:00Z', { visitorId: 'v1', referrerHost: 't.co', deviceType: 'mobile' }),
      click(l1, '2026-10-02T12:00:00Z', { visitorId: 'v2', referrerHost: 'news.ycombinator.com' }),
      click(l2, '2026-10-02T13:00:00Z', { visitorId: 'v3', deviceType: 'tablet' }),
      click(l1, '2026-10-04T20:00:00Z', { visitorId: 'v4' }), // Oct 5 in India (UTC+5:30)
      click(l3, '2026-09-20T12:00:00Z', { visitorId: 'v9' }), // outside the range below
      click(new mongoose.Types.ObjectId(bob.links[0].id), '2026-10-02T12:00:00Z', {
        owner: new mongoose.Types.ObjectId(bob.user.id),
        visitorId: 'b1',
      }),
    ]);
    return { ana, bob };
  }
  const OCT_1_TO_5_UTC = { from: '2026-10-01T00:00:00.000Z', to: '2026-10-05T23:59:59.999Z', tz: 'UTC' };

  test('requires login', async () => {
    await request(app).get(analyticsQuery(OCT_1_TO_5_UTC)).expect(401);
  });

  test('totals, unique visitors, and a zero-filled daily timeline (UTC)', async () => {
    const { ana } = await seed();
    const { body } = await ana.get(analyticsQuery(OCT_1_TO_5_UTC)).expect(200);

    assert.deepEqual(body.totals, { clicks: 5, uniqueVisitors: 4 });
    assert.deepEqual(body.timeline, [
      { date: '2026-10-01', clicks: 2, uniqueVisitors: 1 },
      { date: '2026-10-02', clicks: 2, uniqueVisitors: 2 },
      { date: '2026-10-03', clicks: 0, uniqueVisitors: 0 },
      { date: '2026-10-04', clicks: 1, uniqueVisitors: 1 },
      { date: '2026-10-05', clicks: 0, uniqueVisitors: 0 },
    ]);
    assert.equal(body.range.days, 5);
  });

  test("days follow the user's time zone", async () => {
    const { ana } = await seed();
    // The same five days, but as seen in India (UTC+5:30)
    const params = { from: '2026-09-30T18:30:00.000Z', to: '2026-10-05T18:29:59.999Z', tz: 'Asia/Kolkata' };
    const { body } = await ana.get(analyticsQuery(params)).expect(200);
    const clicksByDay = Object.fromEntries(body.timeline.map((day) => [day.date, day.clicks]));
    assert.equal(clicksByDay['2026-10-04'], 0);
    assert.equal(clicksByDay['2026-10-05'], 1, 'the 20:00 UTC click lands on the next local day');
    assert.equal(body.timeline.length, 5);
  });

  test('the date range is a filter: clicks outside it are excluded, edges included', async () => {
    const { ana } = await seed();
    const exactDay = { from: '2026-10-02T12:00:00.000Z', to: '2026-10-02T13:00:00.000Z', tz: 'UTC' };
    const { body } = await ana.get(analyticsQuery(exactDay)).expect(200);
    assert.equal(body.totals.clicks, 2);
  });

  test('top links, sources, and devices are sorted by clicks', async () => {
    const { ana } = await seed();
    const { body } = await ana.get(analyticsQuery(OCT_1_TO_5_UTC)).expect(200);

    assert.deepEqual(
      body.topLinks.map((row) => [row.link.originalUrl, row.clicks]),
      [['https://example.com/first', 4], ['https://example.com/second', 1]],
    );
    assert.ok(body.topLinks[0].link.shortUrl.startsWith('https://sho.rt/'));
    assert.deepEqual(body.sources, [
      { source: null, clicks: 2 },
      { source: 't.co', clicks: 2 },
      { source: 'news.ycombinator.com', clicks: 1 },
    ]);
    assert.deepEqual(body.devices, [
      { device: 'desktop', clicks: 2 },
      { device: 'mobile', clicks: 2 },
      { device: 'tablet', clicks: 1 },
    ]);
  });

  test('recent clicks are newest first and expose no visitor ids', async () => {
    const { ana } = await seed();
    const { body } = await ana.get(analyticsQuery(OCT_1_TO_5_UTC)).expect(200);
    assert.deepEqual(
      body.recentClicks.map((click) => click.clickedAt),
      ['2026-10-04T20:00:00.000Z', '2026-10-02T13:00:00.000Z', '2026-10-02T12:00:00.000Z', '2026-10-01T10:00:00.000Z', '2026-10-01T09:00:00.000Z'],
    );
    assert.equal(JSON.stringify(body).includes('"v1"'), false);
    assert.equal(JSON.stringify(body).includes('visitorId'), false);
  });

  test("another user's clicks never appear", async () => {
    const { bob } = await seed();
    const { body } = await bob.get(analyticsQuery(OCT_1_TO_5_UTC)).expect(200);
    assert.deepEqual(body.totals, { clicks: 1, uniqueVisitors: 1 });
  });

  test('linkId narrows everything to one link', async () => {
    const { ana } = await seed();
    const { body } = await ana.get(analyticsQuery({ ...OCT_1_TO_5_UTC, linkId: ana.links[1].id })).expect(200);
    assert.deepEqual(body.totals, { clicks: 1, uniqueVisitors: 1 });
    assert.equal(body.link.originalUrl, 'https://example.com/second');
    assert.deepEqual(body.devices, [{ device: 'tablet', clicks: 1 }]);
  });

  test("someone else's linkId and a malformed one are both 404", async () => {
    const { ana, bob } = await seed();
    await ana.get(analyticsQuery({ ...OCT_1_TO_5_UTC, linkId: bob.links[0].id })).expect(404);
    await ana.get(analyticsQuery({ ...OCT_1_TO_5_UTC, linkId: 'not-an-id' })).expect(404);
  });

  test('a brand-new account gets zeros, a zero-filled timeline, and empty lists', async () => {
    const ana = await newUser(app);
    const { body } = await ana.get(analyticsQuery(OCT_1_TO_5_UTC)).expect(200);
    assert.deepEqual(body.totals, { clicks: 0, uniqueVisitors: 0 });
    assert.equal(body.timeline.length, 5);
    assert.ok(body.timeline.every((day) => day.clicks === 0));
    assert.deepEqual([body.topLinks, body.sources, body.devices, body.recentClicks], [[], [], [], []]);
  });

  const invalid = [
    [{ to: OCT_1_TO_5_UTC.to }, 'missing from'],
    [{ from: 'yesterday', to: OCT_1_TO_5_UTC.to }, 'unparseable from'],
    [{ from: OCT_1_TO_5_UTC.to, to: OCT_1_TO_5_UTC.from }, 'to before from'],
    [{ from: '2024-01-01T00:00:00Z', to: '2026-01-01T00:00:00Z' }, 'range over 366 days'],
    [{ ...OCT_1_TO_5_UTC, tz: 'Mars/Olympus_Mons' }, 'unknown time zone'],
  ];
  for (const [params, reason] of invalid) {
    test(`rejects ${reason} (400)`, async () => {
      const ana = await newUser(app);
      await ana.get(analyticsQuery(params)).expect(400);
    });
  }

  test('the main query reads from the { owner, clickedAt } index', async () => {
    const { ana } = await seed();
    const plan = await Click.collection
      .find({ owner: new mongoose.Types.ObjectId(ana.user.id), clickedAt: { $gte: new Date('2026-10-01'), $lte: new Date('2026-10-06') } })
      .explain('queryPlanner');
    const winning = JSON.stringify(plan.queryPlanner.winningPlan);
    assert.match(winning, /IXSCAN/);
    assert.match(winning, /owner_1_clickedAt_-1/);
  });
});

describe('end to end: real redirects feed the analytics', () => {
  test('clicks made through the redirect show up with their source and device', async () => {
    const ana = await userWithLinks(['live']);
    const code = ana.links[0].shortCode;
    await open(code, { userAgent: IPHONE, referer: 'https://t.co/abc' });
    await open(code, { userAgent: WINDOWS });
    await open(code, { userAgent: WINDOWS }); // same visitor within 30 s: not counted again
    await request(app).get(`/${code}`).set('User-Agent', 'Googlebot/2.1').expect(302); // bot: not counted

    const { body } = await ana.get(analyticsQuery(LAST_DAY)).expect(200);
    assert.deepEqual(body.totals, { clicks: 2, uniqueVisitors: 2 });
    assert.deepEqual(body.sources.map((row) => row.source).sort(), [null, 't.co'].sort());
    assert.deepEqual(body.devices.map((row) => row.device).sort(), ['desktop', 'mobile']);
  });

  test('clicks on guest links move into the account when the guest signs up', async () => {
    const browser = await newClient(app);
    const link = (await browser.post('/api/links', { url: 'https://example.com/guest' }).expect(201)).body.link;
    await open(link.shortCode);
    assert.equal((await Click.findOne().lean()).owner, null);

    await browser.post('/api/auth/register', { name: 'Guest', email: 'guest@example.com', password: 'long enough password' }).expect(201);
    const { body } = await browser.get(analyticsQuery(LAST_DAY)).expect(200);
    assert.equal(body.totals.clicks, 1);
  });
});

describe('daysInRange', () => {
  test('lists every local day once, even across a daylight-saving change', () => {
    // New York switches back from summer time on 2026-11-01 (a 25-hour day).
    const days = daysInRange(new Date('2026-10-31T04:00:00Z'), new Date('2026-11-03T04:59:59Z'), 'America/New_York');
    assert.deepEqual(days, ['2026-10-31', '2026-11-01', '2026-11-02']);
  });
});
