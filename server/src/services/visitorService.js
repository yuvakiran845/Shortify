import { createHmac, randomBytes } from 'node:crypto';
import { DailySalt } from '../models/DailySalt.js';

// Only today's salt is kept in memory; it is re-read from MongoDB when the day changes.
const cache = { day: null, salt: null };

export const utcDay = (date) => date.toISOString().slice(0, 10);

// Returns the random salt for a UTC day, creating it on first use.
// Upsert + unique index: concurrent requests on a new day still agree on one salt.
export async function getDailySalt(day) {
  if (cache.day === day) return cache.salt;
  const doc = await DailySalt.findOneAndUpdate(
    { day },
    { $setOnInsert: { day, salt: randomBytes(32).toString('hex'), createdAt: new Date() } },
    { upsert: true, returnDocument: 'after' },
  ).lean();
  cache.day = day;
  cache.salt = doc.salt;
  return doc.salt;
}

/**
 * A short anonymous id for "the same visitor on the same day":
 * HMAC-SHA256(daily salt, IP + User-Agent), first 16 hex characters.
 * Same person + same browser + same day = same id. A new day (new salt),
 * another browser, or another network gives a different id.
 */
export async function visitorIdFor({ ip, userAgent }, now = new Date()) {
  const salt = await getDailySalt(utcDay(now));
  return createHmac('sha256', salt).update(`${ip}|${userAgent ?? ''}`).digest('hex').slice(0, 16);
}

// For tests: forget the cached salt.
export function resetSaltCache() {
  cache.day = null;
  cache.salt = null;
}
