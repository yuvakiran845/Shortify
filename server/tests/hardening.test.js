import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { parseClientOrigins, parsePublicBaseUrl } from '../src/config/env.js';
import { errorHandler, isDatabaseUnavailable } from '../src/middleware/errorHandler.js';
import { connectTestDatabase, dropTestDatabase } from './helpers/db.js';

before(connectTestDatabase);
after(dropTestDatabase);

describe('general API rate limit', () => {
  test('every API endpoint shares a per-IP limit and answers 429 in JSON', async () => {
    const app = createApp({ apiLimitPerMinute: 3 });
    for (let i = 0; i < 3; i += 1) await request(app).get('/api/health').expect(200);

    const blocked = await request(app).get('/api/links').set('Origin', 'http://localhost:5173').expect(429);
    assert.equal(blocked.body.message, 'Too many requests. Please wait a minute and try again.');
    assert.ok(blocked.headers.ratelimit, 'tells clients when to retry');
    // CORS headers are still sent, so the frontend can read the message.
    assert.equal(blocked.headers['access-control-allow-origin'], 'http://localhost:5173');
  });

  test('short-link redirects are not counted against the API limit', async () => {
    const app = createApp({ apiLimitPerMinute: 1 });
    await request(app).get('/api/health').expect(200);
    await request(app).get('/Abc1234').set('Accept', 'application/json').expect(404);
  });
});

describe('security headers', () => {
  test('API responses carry the helmet headers', async () => {
    const response = await request(createApp()).get('/api/health').expect(200);
    assert.equal(response.headers['x-content-type-options'], 'nosniff');
    assert.equal(response.headers['x-frame-options'], 'SAMEORIGIN');
    assert.equal(response.headers['x-powered-by'], undefined);
  });
});

// A minimal stand-in for Express's response object.
function fakeResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function handle(error) {
  const res = fakeResponse();
  const originalConsoleError = console.error;
  console.error = () => {}; // the handler logs unexpected errors; keep test output clean
  try {
    errorHandler(error, {}, res, () => {});
  } finally {
    console.error = originalConsoleError;
  }
  return res;
}

const namedError = (name, message = 'boom') => Object.assign(new Error(message), { name });

describe('error handler', () => {
  test('database outages become 503 with a friendly message', () => {
    for (const error of [
      namedError('MongoServerSelectionError'),
      namedError('MongooseServerSelectionError'),
      namedError('MongoNetworkError'),
      namedError('MongoNotConnectedError'),
      namedError('MongooseError', 'Operation `links.findOne()` buffering timed out after 10000ms'),
    ]) {
      assert.ok(isDatabaseUnavailable(error), error.name);
      const res = handle(error);
      assert.equal(res.statusCode, 503, error.name);
      assert.match(res.body.message, /temporarily unavailable/);
    }
  });

  test('schema validation and cast errors are 400, not 500', () => {
    assert.equal(handle(namedError('ValidationError')).statusCode, 400);
    assert.equal(handle(namedError('CastError')).statusCode, 400);
  });

  test('unexpected errors are 500 without internal details', () => {
    const res = handle(new Error('secret stack detail'));
    assert.equal(res.statusCode, 500);
    assert.doesNotMatch(JSON.stringify(res.body), /secret stack detail/);
  });
});

describe('CLIENT_ORIGIN parsing', () => {
  test('a trailing slash is removed (browsers compare exact origins)', () => {
    assert.deepEqual(parseClientOrigins('https://app.example.com/', { production: true }), ['https://app.example.com']);
  });

  test('several origins can be listed', () => {
    assert.deepEqual(parseClientOrigins(' http://localhost:5173 , https://app.example.com ', { production: false }), [
      'http://localhost:5173',
      'https://app.example.com',
    ]);
  });

  test('defaults to the Vite dev server outside production', () => {
    assert.deepEqual(parseClientOrigins('', { production: false }), ['http://localhost:5173']);
  });

  for (const [value, production, pattern] of [
    ['', true, /required in production/],
    ['http://app.example.com', true, /https:\/\/ in production/],
    ['https://app.example.com/dashboard', false, /without a path/],
    ['app.example.com', false, /not a valid URL|must start with http/],
    ['ftp://app.example.com', false, /must start with http/],
  ]) {
    test(`rejects ${JSON.stringify(value)}${production ? ' in production' : ''}`, () => {
      assert.throws(() => parseClientOrigins(value, { production }), pattern);
    });
  }
});

describe('PUBLIC_BASE_URL (the short-link domain)', () => {
  test('a public HTTPS domain gives links like https://yourdomain.com/<code>', () => {
    assert.equal(parsePublicBaseUrl('https://go.example.com/', { production: true }), 'https://go.example.com');
    assert.equal(parsePublicBaseUrl('http://192.168.1.20:5000', { production: false }), 'http://192.168.1.20:5000');
  });

  for (const [value, production, pattern] of [
    ['https://example.com/s', false, /without a path/],
    ['example.com', false, /absolute URL/],
    ['http://go.example.com', true, /https:\/\/ in production/],
    ['https://localhost:5000', true, /public domain in production/],
    ['https://192.168.1.20', true, /public domain in production/],
    ['https://intranet', true, /public domain in production/],
  ]) {
    test(`rejects ${JSON.stringify(value)}${production ? ' in production' : ''}`, () => {
      assert.throws(() => parsePublicBaseUrl(value, { production }), pattern);
    });
  }
});
