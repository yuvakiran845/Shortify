import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createShortLink } from '../src/services/linkService.js';
import { clearDatabase, connectTestDatabase, dropTestDatabase } from './helpers/db.js';

// A tiny stand-in for the built React app (client/dist).
const distDir = mkdtempSync(join(tmpdir(), 'shortify-dist-'));
mkdirSync(join(distDir, 'assets'));
writeFileSync(join(distDir, 'index.html'), '<!doctype html><title>Shortify app</title><div id="root"></div>');
writeFileSync(join(distDir, 'assets', 'index-abc123.js'), 'console.log("app")');
writeFileSync(join(distDir, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');

before(connectTestDatabase);
beforeEach(clearDatabase);
after(async () => {
  await dropTestDatabase();
  rmSync(distDir, { recursive: true, force: true });
});

const app = createApp({ clientDistDir: distDir });

describe('one-service deployment: website, API, and short links on one address', () => {
  test('app pages load the React app (refreshing /dashboard works)', async () => {
    for (const path of ['/', '/login', '/signup', '/shorten', '/qr', '/dashboard', '/links']) {
      const response = await request(app).get(path).expect(200);
      assert.match(response.text, /Shortify app/, path);
      assert.equal(response.headers['cache-control'], 'no-cache', path);
    }
  });

  test('built files are served with long caching; other public files too', async () => {
    const asset = await request(app).get('/assets/index-abc123.js').expect(200);
    assert.match(asset.headers['cache-control'], /max-age=31536000/);
    assert.match(asset.headers['cache-control'], /immutable/);
    await request(app).get('/favicon.svg').expect(200);
  });

  test('short links still redirect, unknown codes are 404, and the API is untouched', async () => {
    const link = await createShortLink('https://example.com/target', {});
    const redirect = await request(app).get(`/${link.shortCode}`).expect(302);
    assert.equal(redirect.headers.location, 'https://example.com/target');

    await request(app).get('/Zz9Zz9Z').set('Accept', 'application/json').expect(404);
    const health = await request(app).get('/api/health').expect(200);
    assert.equal(health.body.status, 'ok');
    await request(app).get('/api/nope').expect(404);
  });

  test('random codes never use a word reserved for app pages', async () => {
    const codes = ['shorten', 'Abc1234'];
    const link = await createShortLink('https://example.com/x', { generateCode: () => codes.shift() });
    assert.equal(link.shortCode, 'Abc1234');
  });
});

describe('without CLIENT_DIST_DIR (API-only deployment)', () => {
  test('the bare domain sends visitors to the frontend', async () => {
    const response = await request(createApp({ clientDistDir: null })).get('/').expect(302);
    assert.equal(response.headers.location, 'http://localhost:5173');
  });
});
