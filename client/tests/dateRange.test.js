import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { daysBetween, parseDateKey, resolveRange, toDateKey } from '../src/lib/dateRange.js';

// A fixed "now" (local time) so results do not depend on when the tests run.
const NOW = new Date(2026, 9, 13, 15, 30); // Oct 13, 2026, 3:30 PM local
const params = (query) => new URLSearchParams(query);

describe('resolveRange', () => {
  test('defaults to the last 30 days, ending today', () => {
    const range = resolveRange(params(''), NOW);
    assert.equal(range.preset, '30d');
    assert.equal(range.fromKey, '2026-09-14');
    assert.equal(range.toKey, '2026-10-13');
    assert.equal(range.days, 30);
  });

  test('"Last 7 days" includes today', () => {
    const range = resolveRange(params('range=7d'), NOW);
    assert.deepEqual([range.fromKey, range.toKey, range.days], ['2026-10-07', '2026-10-13', 7]);
  });

  test('sends exact instants: start of the first local day to the end of the last', () => {
    const range = resolveRange(params('range=7d'), NOW);
    assert.equal(range.from, new Date(2026, 9, 7, 0, 0, 0, 0).toISOString());
    assert.equal(range.to, new Date(2026, 9, 13, 23, 59, 59, 999).toISOString());
  });

  test('reads a valid custom range', () => {
    const range = resolveRange(params('from=2026-10-01&to=2026-10-05'), NOW);
    assert.deepEqual([range.preset, range.fromKey, range.toKey, range.days], [null, '2026-10-01', '2026-10-05', 5]);
    assert.equal(range.invalidCustom, undefined);
  });

  const badCustom = [
    'from=2026-10-05&to=2026-10-01', // reversed
    'from=2026-10-01&to=2026-12-01', // ends in the future
    'from=2026-02-30&to=2026-03-01', // not a real date
    'from=2025-01-01&to=2026-10-01', // longer than 366 days
    'from=2026-10-01', // missing end
  ];
  for (const query of badCustom) {
    test(`falls back to the default for ${query}`, () => {
      const range = resolveRange(params(query), NOW);
      assert.equal(range.preset, '30d');
      assert.equal(range.invalidCustom, true);
    });
  }

  test('ignores an unknown preset', () => {
    assert.equal(resolveRange(params('range=1y'), NOW).preset, '30d');
  });
});

describe('date helpers', () => {
  test('toDateKey uses the local calendar date', () => {
    assert.equal(toDateKey(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
  });

  test('parseDateKey rejects impossible dates', () => {
    assert.equal(parseDateKey('2026-02-30'), null);
    assert.equal(parseDateKey('13-10-2026'), null);
    assert.equal(toDateKey(parseDateKey('2026-02-28')), '2026-02-28');
  });

  test('daysBetween counts both ends', () => {
    assert.equal(daysBetween(new Date(2026, 9, 1), new Date(2026, 9, 1)), 1);
    assert.equal(daysBetween(new Date(2026, 9, 1), new Date(2026, 9, 31)), 31);
  });
});
