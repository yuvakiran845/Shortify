import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_QUERY, hasActiveFilters, readLinkQuery, toSearchParams } from '../src/lib/linkQuery.js';

describe('readLinkQuery', () => {
  test('uses defaults for an empty URL', () => {
    assert.deepEqual(readLinkQuery(new URLSearchParams('')), DEFAULT_QUERY);
  });

  test('reads valid values', () => {
    const query = readLinkQuery(new URLSearchParams('page=3&search=github&sort=most-clicks&status=expired&clicks=clicked'));
    assert.deepEqual(query, { page: 3, search: 'github', sort: 'most-clicks', status: 'expired', clicks: 'clicked' });
  });

  test('ignores invalid values instead of breaking the page', () => {
    const query = readLinkQuery(new URLSearchParams('page=-2&sort=random&status=deleted&clicks=lots'));
    assert.deepEqual(query, DEFAULT_QUERY);
    assert.equal(readLinkQuery(new URLSearchParams('page=1.5')).page, 1);
    assert.equal(readLinkQuery(new URLSearchParams('page=abc')).page, 1);
  });

  test('trims and limits the search text', () => {
    assert.equal(readLinkQuery(new URLSearchParams('search=%20%20git%20%20')).search, 'git');
    assert.equal(readLinkQuery(new URLSearchParams(`search=${'a'.repeat(300)}`)).search.length, 200);
  });
});

describe('toSearchParams', () => {
  test('omits default values so URLs stay short', () => {
    assert.equal(toSearchParams(DEFAULT_QUERY).toString(), '');
    assert.equal(toSearchParams({ ...DEFAULT_QUERY, page: 2, sort: 'oldest' }).toString(), 'page=2&sort=oldest');
  });

  test('round-trips with readLinkQuery', () => {
    const query = { page: 4, search: 'docs site', sort: 'fewest-clicks', status: 'disabled', clicks: 'unclicked' };
    assert.deepEqual(readLinkQuery(toSearchParams(query)), query);
  });
});

describe('hasActiveFilters', () => {
  test('sorting and paging are not filters', () => {
    assert.equal(hasActiveFilters({ ...DEFAULT_QUERY, page: 5, sort: 'oldest' }), false);
  });

  test('search, status, and clicks are filters', () => {
    assert.equal(hasActiveFilters({ ...DEFAULT_QUERY, search: 'x' }), true);
    assert.equal(hasActiveFilters({ ...DEFAULT_QUERY, status: 'active' }), true);
    assert.equal(hasActiveFilters({ ...DEFAULT_QUERY, clicks: 'clicked' }), true);
  });
});
