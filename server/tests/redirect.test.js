import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { Link } from '../src/models/Link.js';
import { Click } from '../src/models/Click.js';
import { RecentClickCache } from '../src/utils/RecentClickCache.js';
import { clearDatabase, connectTestDatabase, dropTestDatabase } from './helpers/db.js';
import { newClient } from './helpers/client.js';

before(connectTestDatabase);
beforeEach(clearDatabase);
after(dropTestDatabase);

const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const FIREFOX = 'Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0';
const DESTINATION = 'https://example.com/landing?ref=abc&x=%20y#top';

const makeLink = (fields = {}) => Link.create({ originalUrl: DESTINATION, shortCode: 'Abc1234', ...fields });

const visit = (app, path, userAgent = CHROME) => request(app).get(path).set('User-Agent', userAgent);

async function clickStats(shortCode = 'Abc1234') {
  const link = await Link.findOne({ shortCode }).lean();
  return {
    count: link.clickCount,
    events: await Click.countDocuments({ link: link._id }),
    lastClickedAt: link.lastClickedAt,
  };
}

describe('GET /:code redirects', () => {
  const app = createApp();

  test('redirects with 302 to the exact original URL', async () => {
    await makeLink();
    const response = await visit(app, '/Abc1234').expect(302);
    assert.equal(response.headers.location, DESTINATION);
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.equal(response.headers['x-robots-tag'], 'noindex');
  });

  test('counts the click on the link and stores a click event', async () => {
    await makeLink();
    await visit(app, '/Abc1234').expect(302);
    const stats = await clickStats();
    assert.equal(stats.count, 1);
    assert.equal(stats.events, 1);
    assert.ok(stats.lastClickedAt instanceof Date);
  });

  test('works end to end with a link created through the API', async () => {
    const client = await newClient(app);
    const created = await client.post('/api/links', { url: 'example.org/docs?page=2' }).expect(201);
    assert.equal(created.body.link.clickCount, 0);
    const response = await visit(app, `/${created.body.link.shortCode}`).expect(302);
    assert.equal(response.headers.location, 'https://example.org/docs?page=2');
  });

  test('short codes are case-sensitive', async () => {
    await makeLink();
    await visit(app, '/abc1234').expect(404);
  });
});

describe('links that cannot be opened', () => {
  const app = createApp();

  test('unknown code: 404 HTML page for browsers', async () => {
    const response = await visit(app, '/Nope123').expect(404);
    assert.match(response.headers['content-type'], /text\/html/);
    assert.match(response.text, /Link not found/);
    assert.equal(response.headers.location, undefined);
    assert.equal(response.headers['cache-control'], 'no-store');
  });

  test('unknown code: 404 JSON for API clients', async () => {
    const response = await visit(app, '/Nope123').set('Accept', 'application/json').expect(404);
    assert.match(response.body.message, /does not exist/);
  });

  for (const path of ['/bad.code', '/favicon.ico', `/${'a'.repeat(65)}`, '/abc%20def']) {
    test(`malformed code ${path.slice(0, 20)} -> 404`, async () => {
      await visit(app, path).expect(404);
    });
  }

  test('expired link: 410 Gone and no click counted', async () => {
    await makeLink({ expiresAt: new Date(Date.now() - 60_000) });
    const response = await visit(app, '/Abc1234').expect(410);
    assert.match(response.text, /expired/);
    assert.equal((await clickStats()).count, 0);
  });

  test('link with a future expiry still redirects', async () => {
    await makeLink({ expiresAt: new Date(Date.now() + 60 * 60_000) });
    await visit(app, '/Abc1234').expect(302);
    assert.equal((await clickStats()).count, 1);
  });

  test('disabled link: 410 Gone and no click counted', async () => {
    await makeLink({ isActive: false });
    const response = await visit(app, '/Abc1234').expect(410);
    assert.match(response.text, /turned off/);
    assert.equal((await clickStats()).count, 0);
  });

  const unsafeDestinations = [
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'ftp://example.com/file',
    'example.com/missing-scheme',
    'https://user:secret@example.com',
    'https://sho.rt/loop', // our own short domain (redirect loop)
  ];
  for (const originalUrl of unsafeDestinations) {
    test(`refuses unsafe stored destination ${originalUrl.slice(0, 30)} with 403`, async (t) => {
      t.mock.method(console, 'warn', () => {});
      await makeLink({ originalUrl });
      const response = await visit(app, '/Abc1234').expect(403);
      assert.equal(response.headers.location, undefined);
      assert.equal((await clickStats()).count, 0);
    });
  }

  test('database failure during lookup: 503 page, not a crash', async (t) => {
    t.mock.method(console, 'error', () => {});
    t.mock.method(Link, 'findOne', () => ({ select: () => ({ lean: () => Promise.reject(new Error('db down')) }) }));
    const response = await visit(app, '/Abc1234').expect(503);
    assert.match(response.text, /Temporarily unavailable/);
  });
});

describe('click counting rules', () => {
  test('HEAD requests are answered but not counted', async () => {
    const app = createApp();
    await makeLink();
    await request(app).head('/Abc1234').set('User-Agent', CHROME).expect(302);
    assert.equal((await clickStats()).count, 0);
  });

  const automatedAgents = [
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
    'WhatsApp/2.23.20.0',
    'Twitterbot/1.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/130.0 Safari/537.36',
  ];
  for (const userAgent of automatedAgents) {
    test(`bots and link previews are redirected but not counted: ${userAgent.slice(0, 28)}`, async () => {
      const app = createApp();
      await makeLink();
      await visit(app, '/Abc1234', userAgent).expect(302);
      assert.equal((await clickStats()).count, 0);
    });
  }

  test('requests without a User-Agent are not counted', async () => {
    const app = createApp();
    await makeLink();
    await visit(app, '/Abc1234', '').expect(302);
    assert.equal((await clickStats()).count, 0);
  });

  test('browser prefetches are not counted', async () => {
    const app = createApp();
    await makeLink();
    await visit(app, '/Abc1234').set('Sec-Purpose', 'prefetch').expect(302);
    assert.equal((await clickStats()).count, 0);
  });

  test('the same visitor clicking twice quickly is counted once', async () => {
    const app = createApp({ clickDedupeWindowMs: 30_000 });
    await makeLink();
    await visit(app, '/Abc1234').expect(302);
    await visit(app, '/Abc1234').expect(302);
    const stats = await clickStats();
    assert.equal(stats.count, 1);
    assert.equal(stats.events, 1);
  });

  test('different browsers are counted separately', async () => {
    const app = createApp({ clickDedupeWindowMs: 30_000 });
    await makeLink();
    await visit(app, '/Abc1234', CHROME).expect(302);
    await visit(app, '/Abc1234', FIREFOX).expect(302);
    assert.equal((await clickStats()).count, 2);
  });

  test('the same visitor is counted again after the window passes', async () => {
    const app = createApp({ clickDedupeWindowMs: 50 });
    await makeLink();
    await visit(app, '/Abc1234').expect(302);
    await new Promise((resolve) => setTimeout(resolve, 80));
    await visit(app, '/Abc1234').expect(302);
    assert.equal((await clickStats()).count, 2);
  });

  test('30 simultaneous clicks are all counted exactly once (atomic $inc)', async () => {
    const app = createApp();
    await makeLink();
    await Promise.all(Array.from({ length: 30 }, (_, i) => visit(app, '/Abc1234', `${CHROME} visitor/${i}`).expect(302)));
    const stats = await clickStats();
    assert.equal(stats.count, 30);
    assert.equal(stats.events, 30);
  });

  test('a failure while recording the click still redirects the visitor', async (t) => {
    t.mock.method(console, 'error', () => {});
    t.mock.method(Click, 'create', async () => {
      throw new Error('write failed');
    });
    const app = createApp();
    await makeLink();
    const response = await visit(app, '/Abc1234').expect(302);
    assert.equal(response.headers.location, DESTINATION);
  });
});

describe('routing and abuse protection', () => {
  test('API routes are never treated as short codes', async () => {
    const app = createApp();
    await request(app).get('/api/health').expect(200);
    const bareApi = await request(app).get('/api').expect(404);
    assert.equal(bareApi.body.message, 'Not found.');
    const unknownApi = await request(app).get('/api/xyz').expect(404);
    assert.match(unknownApi.headers['content-type'], /json/);
  });

  test('the bare short domain redirects to the app', async () => {
    const response = await request(createApp()).get('/').expect(302);
    assert.equal(response.headers.location, 'http://localhost:5173');
  });

  test('robots.txt asks crawlers not to follow short links', async () => {
    const response = await request(createApp()).get('/robots.txt').expect(200);
    assert.match(response.text, /Disallow: \//);
  });

  test('an IP scanning many codes gets rate limited (429)', async () => {
    const app = createApp({ redirectLimitPerMinute: 5 });
    for (let i = 0; i < 5; i += 1) {
      await visit(app, `/Guess${i}xx`).expect(404);
    }
    const blocked = await visit(app, '/Guess6xx').expect(429);
    assert.match(blocked.text, /Too many requests/);
  });
});

describe('RecentClickCache', () => {
  test('first click true, repeat within window false, after window true', () => {
    const cache = new RecentClickCache({ windowMs: 1000 });
    assert.equal(cache.isFirstClick('visitor', 0), true);
    assert.equal(cache.isFirstClick('visitor', 999), false);
    assert.equal(cache.isFirstClick('visitor', 1000), true);
  });

  test('never grows beyond maxEntries', () => {
    const cache = new RecentClickCache({ windowMs: 60_000, maxEntries: 3 });
    for (let i = 0; i < 10; i += 1) cache.isFirstClick(`visitor-${i}`, i);
    assert.ok(cache.entries.size <= 3);
  });

  test('removes expired entries when pruning', () => {
    const cache = new RecentClickCache({ windowMs: 10, maxEntries: 100 });
    cache.isFirstClick('a', 0);
    cache.isFirstClick('b', 5);
    cache.prune(12);
    assert.deepEqual([...cache.entries.keys()], ['b']);
  });

  test('a zero window disables de-duplication', () => {
    const cache = new RecentClickCache({ windowMs: 0 });
    assert.equal(cache.isFirstClick('visitor'), true);
    assert.equal(cache.isFirstClick('visitor'), true);
  });
});
