import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDestinationUrl, normalizeQrUrl } from '../src/utils/url.js';
import { generateShortCode, SHORT_CODE_LENGTH } from '../src/utils/shortCode.js';

describe('normalizeDestinationUrl', () => {
  const accepted = [
    ['https://example.com/page?x=1#top', 'https://example.com/page?x=1#top'],
    ['http://example.com', 'http://example.com/'],
    ['example.com/docs', 'https://example.com/docs'],
    ['  www.example.com  ', 'https://www.example.com/'],
    ['HTTPS://Example.COM/Path', 'https://example.com/Path'],
    ['example.com:8080/app', 'https://example.com:8080/app'],
    ['https://例え.jp', 'https://xn--r8jz45g.jp/'],
    ['https://93.184.216.34/page', 'https://93.184.216.34/page'],
  ];

  for (const [input, expected] of accepted) {
    test(`accepts ${JSON.stringify(input)}`, () => {
      assert.equal(normalizeDestinationUrl(input), expected);
    });
  }

  const rejected = [
    ['', 'empty string'],
    ['   ', 'only spaces'],
    [undefined, 'missing value'],
    [42, 'a number'],
    ['javascript:alert(1)', 'javascript: scheme'],
    ['JavaScript:alert(1)', 'javascript: scheme in mixed case'],
    ['data:text/html,<script>alert(1)</script>', 'data: scheme'],
    ['file:///etc/passwd', 'file: scheme'],
    ['ftp://example.com/file', 'ftp: scheme'],
    ['mailto:someone@example.com', 'mailto: scheme'],
    ['https://user:pass@example.com', 'embedded credentials'],
    ['https://bank.com@evil.example', 'username trick'],
    ['https://localhost:3000', 'localhost'],
    ['http://intranet/page', 'host without a domain'],
    ['https://', 'scheme with no host'],
    ['not a url', 'plain words'],
    [`https://example.com/${'a'.repeat(2048)}`, 'longer than 2048 characters'],
  ];

  for (const [input, reason] of rejected) {
    test(`rejects ${reason}`, () => {
      assert.throws(
        () => normalizeDestinationUrl(input),
        (error) => error.status === 400 && error.field === 'url' && error.message.length > 0,
      );
    });
  }

  test('rejects links that point at our own short-link domain', () => {
    assert.throws(() => normalizeDestinationUrl('https://sho.rt/abc1234', { ownHost: 'sho.rt' }), /already a Shortify link/);
  });
});

describe('normalizeQrUrl', () => {
  // Development setup: short links live on localhost, which normal URLs may not use.
  const options = { shortLinkBaseUrl: 'http://localhost:5000' };

  test('allows a Shortify short link, even on localhost', () => {
    assert.equal(normalizeQrUrl('http://localhost:5000/Abc1234', options), 'http://localhost:5000/Abc1234');
  });

  test('allows ordinary websites with the usual rules', () => {
    assert.equal(normalizeQrUrl('example.com/menu', options), 'https://example.com/menu');
  });

  const lookAlikes = [
    ['http://localhost:5001/Abc1234', 'a different port'],
    ['https://localhost:5000/Abc1234', 'a different scheme'],
    ['http://user:pw@localhost:5000/Abc1234', 'embedded credentials'],
    ['http://localhost/Abc1234', 'no port'],
    ['javascript:alert(1)', 'a javascript: URL'],
  ];
  for (const [input, reason] of lookAlikes) {
    test(`does not treat ${reason} as a Shortify link`, () => {
      assert.throws(() => normalizeQrUrl(input, options), (error) => error.status === 400);
    });
  }
});

describe('generateShortCode', () => {
  test(`creates ${SHORT_CODE_LENGTH}-character URL-safe codes`, () => {
    for (let i = 0; i < 200; i += 1) {
      assert.match(generateShortCode(), /^[0-9A-Za-z]{7}$/);
    }
  });

  test('does not repeat codes in 10,000 generations', () => {
    const codes = new Set(Array.from({ length: 10_000 }, () => generateShortCode()));
    assert.equal(codes.size, 10_000);
  });
});
