import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createServerlessHandler } from '../src/serverless.js';
import { createShortLink } from '../src/services/linkService.js';
import { clearDatabase, connectTestDatabase, dropTestDatabase } from './helpers/db.js';

before(connectTestDatabase);
beforeEach(clearDatabase);
after(dropTestDatabase);

// The test database is already connected, so "connecting" only needs counting.
function countingConnect() {
  const connect = async () => {
    connect.calls += 1;
  };
  connect.calls = 0;
  return connect;
}

describe('serverless handler (Vercel)', () => {
  test('connects once per warm instance and reuses the connection', async () => {
    const connect = countingConnect();
    const handler = createServerlessHandler({ app: createApp(), connect });

    await request(handler).get('/api/health').expect(200);
    await request(handler).get('/api/config').expect(200);
    await request(handler).get('/api/health').expect(200);
    assert.equal(connect.calls, 1);
  });

  test('serves short-link redirects and the API from the same function', async () => {
    const handler = createServerlessHandler({ app: createApp(), connect: countingConnect() });
    const link = await createShortLink('https://example.com/serverless', {});

    const redirect = await request(handler).get(`/${link.shortCode}`).expect(302);
    assert.equal(redirect.headers.location, 'https://example.com/serverless');
    const created = await request(handler).get('/api/csrf-token').expect(200);
    assert.ok(created.body.csrfToken);
  });

  test('a database outage is a clear 503, and the next request tries again', async () => {
    let attempts = 0;
    const connect = async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('getaddrinfo ENOTFOUND cluster0.example.mongodb.net');
    };
    const handler = createServerlessHandler({ app: createApp(), connect });

    const originalError = console.error;
    console.error = () => {};
    try {
      const failed = await request(handler).get('/api/health').expect(503);
      assert.match(failed.body.message, /temporarily unavailable/);
      assert.equal(failed.headers['cache-control'], 'no-store');
    } finally {
      console.error = originalError;
    }

    await request(handler).get('/api/health').expect(200);
    assert.equal(attempts, 2);
  });
});
