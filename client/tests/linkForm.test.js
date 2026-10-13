import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  aliasError,
  buildLinkChanges,
  expiryError,
  fromLocalInputValue,
  toLocalInputValue,
} from '../src/lib/linkForm.js';

const NOW = new Date(2026, 9, 13, 12, 0); // Oct 13, 2026 12:00 local

const savedLink = {
  originalUrl: 'https://example.com/original',
  title: null,
  shortCode: 'abc1234',
  expiresAt: null,
  isActive: true,
};
const formFor = (link) => ({
  url: link.originalUrl,
  title: link.title ?? '',
  alias: link.shortCode,
  hasExpiry: Boolean(link.expiresAt),
  expiresAt: link.expiresAt ? toLocalInputValue(link.expiresAt) : '',
  isActive: link.isActive,
});

describe('aliasError', () => {
  test('empty means "random code" and is fine', () => assert.equal(aliasError('  '), null));
  test('accepts letters, digits, - and _', () => assert.equal(aliasError('Spring-sale_2026'), null));
  for (const bad of ['ab', 'a'.repeat(51), 'has space', 'a/b', 'café', 'api', 'Dashboard']) {
    test(`rejects ${JSON.stringify(bad.slice(0, 12))}`, () => assert.ok(aliasError(bad)));
  }
});

describe('datetime-local conversion', () => {
  test('round-trips in local time', () => {
    const local = '2026-10-20T09:30';
    assert.equal(toLocalInputValue(fromLocalInputValue(local)), local);
  });

  test('past or missing expiry is an error', () => {
    assert.ok(expiryError('', NOW));
    assert.ok(expiryError('2026-10-13T11:59', NOW));
    assert.equal(expiryError('2026-10-14T12:00', NOW), null);
  });
});

describe('buildLinkChanges', () => {
  test('an untouched form has no changes', () => {
    assert.deepEqual(buildLinkChanges(savedLink, formFor(savedLink), NOW), { changes: {}, errors: {} });
  });

  test('only changed fields are sent', () => {
    const form = { ...formFor(savedLink), title: '  Launch  ', isActive: false };
    assert.deepEqual(buildLinkChanges(savedLink, form, NOW).changes, { title: 'Launch', isActive: false });
  });

  test('a new destination is detected after normalizing', () => {
    const same = { ...formFor(savedLink), url: 'EXAMPLE.com/original' };
    assert.deepEqual(buildLinkChanges(savedLink, same, NOW).changes, {});
    const changed = { ...formFor(savedLink), url: 'example.org' };
    assert.deepEqual(buildLinkChanges(savedLink, changed, NOW).changes, { url: 'example.org' });
  });

  test('adding, keeping, and removing an expiry', () => {
    const add = { ...formFor(savedLink), hasExpiry: true, expiresAt: '2026-10-20T09:30' };
    assert.equal(buildLinkChanges(savedLink, add, NOW).changes.expiresAt, fromLocalInputValue('2026-10-20T09:30'));

    // An expiry already in the past that the user did not touch is not re-sent (no error).
    const expiredLink = { ...savedLink, expiresAt: new Date(2026, 9, 1, 8, 0).toISOString() };
    assert.deepEqual(buildLinkChanges(expiredLink, formFor(expiredLink), NOW), { changes: {}, errors: {} });

    const removed = { ...formFor(expiredLink), hasExpiry: false };
    assert.deepEqual(buildLinkChanges(expiredLink, removed, NOW).changes, { expiresAt: null });
  });

  test('reports errors per field', () => {
    const form = { ...formFor(savedLink), url: 'javascript:alert(1)', alias: 'a b', title: 'x'.repeat(101), hasExpiry: true, expiresAt: '2020-01-01T00:00' };
    assert.deepEqual(Object.keys(buildLinkChanges(savedLink, form, NOW).errors).sort(), ['alias', 'expiresAt', 'title', 'url']);
    const blankAlias = { ...formFor(savedLink), alias: '' };
    assert.ok(buildLinkChanges(savedLink, blankAlias, NOW).errors.alias);
  });
});
