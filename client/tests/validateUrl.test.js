// Run with: npm test (uses Node's built-in test runner, no extra packages)
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { validateQrUrl, validateUrl } from '../src/lib/validateUrl.js';

describe('validateQrUrl (client)', () => {
  const options = { shortLinkBaseUrl: 'http://localhost:5000' };

  test('accepts a Shortify short link on localhost', () => {
    assert.deepEqual(validateQrUrl('http://localhost:5000/Abc1234', options), { ok: true, url: 'http://localhost:5000/Abc1234' });
  });

  test('accepts normal websites', () => {
    assert.deepEqual(validateQrUrl('example.com/menu', options), { ok: true, url: 'https://example.com/menu' });
  });

  for (const input of ['http://localhost:5001/x', 'https://localhost:5000/x', 'javascript:alert(1)', '']) {
    test(`rejects ${JSON.stringify(input)}`, () => {
      assert.equal(validateQrUrl(input, options).ok, false);
    });
  }

  test('without config it falls back to the normal rules', () => {
    assert.equal(validateQrUrl('http://localhost:5000/Abc1234').ok, false);
  });
});

describe('validateUrl (client)', () => {
  const valid = [
    ['https://example.com/page?x=1', 'https://example.com/page?x=1'],
    ['example.com/docs', 'https://example.com/docs'],
    ['  http://Example.com  ', 'http://example.com/'],
    ['example.com:8080/app', 'https://example.com:8080/app'],
  ];
  for (const [input, expected] of valid) {
    test(`accepts ${JSON.stringify(input)}`, () => {
      assert.deepEqual(validateUrl(input), { ok: true, url: expected });
    });
  }

  const invalid = [
    ['', /Enter a URL/],
    ['javascript:alert(1)', /Only http/],
    ['ftp://example.com', /Only http/],
    ['mailto:a@example.com', /Only http/],
    ['https://user:pw@example.com', /username or password/],
    ['https://localhost:3000', /complete web address/],
    ['intranet', /complete web address/],
    ['not a url', /valid URL/],
    [`https://example.com/${'a'.repeat(2048)}`, /at most 2048/],
  ];
  for (const [input, message] of invalid) {
    test(`rejects ${JSON.stringify(input.slice(0, 40))}`, () => {
      const result = validateUrl(input);
      assert.equal(result.ok, false);
      assert.match(result.message, message);
    });
  }
});
