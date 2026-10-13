/**
 * Remembers recent clicks for a short time so that the same visitor opening
 * the same link twice in quick succession (double-click, double-tap, browser
 * retry) is counted once.
 *
 * Stored in memory as Map<key, expiresAt>. Because every entry lives for the
 * same window, the Map's insertion order is also its expiry order, so old
 * entries can be removed from the front cheaply.
 */
export class RecentClickCache {
  constructor({ windowMs, maxEntries = 50_000 }) {
    this.windowMs = windowMs;
    this.maxEntries = maxEntries;
    this.entries = new Map();
  }

  // true  -> first click from this visitor within the window (count it)
  // false -> repeat click within the window (do not count it)
  isFirstClick(key, now = Date.now()) {
    if (this.windowMs <= 0) return true;

    const expiresAt = this.entries.get(key);
    if (expiresAt !== undefined && expiresAt > now) return false;

    this.entries.delete(key); // re-insert so the Map stays in expiry order
    this.entries.set(key, now + this.windowMs);
    if (this.entries.size > this.maxEntries) this.prune(now);
    return true;
  }

  prune(now = Date.now()) {
    for (const [key, expiresAt] of this.entries) {
      if (expiresAt > now) break;
      this.entries.delete(key);
    }
    // Traffic spike: still too many live entries, so drop the oldest ones.
    while (this.entries.size > this.maxEntries) {
      this.entries.delete(this.entries.keys().next().value);
    }
  }
}
