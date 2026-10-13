import mongoose from 'mongoose';
import { HttpError } from './HttpError.js';

export const MAX_RANGE_DAYS = 366;
const DAY_MS = 24 * 60 * 60 * 1000;

const badRequest = (message) => new HttpError(400, message);

// true for real IANA time zones such as "Asia/Kolkata" or "America/New_York".
export function isValidTimeZone(timeZone) {
  if (typeof timeZone !== 'string' || timeZone.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

function parseInstant(value, name) {
  if (typeof value !== 'string' || !value) throw badRequest(`"${name}" is required (an ISO date-time).`);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw badRequest(`"${name}" must be a valid ISO date-time.`);
  return date;
}

/**
 * Validates GET /api/analytics query parameters:
 *   from, to   ISO date-times (the browser sends the start of the first day
 *              and the end of the last day in the user's own time zone)
 *   tz         IANA time zone used to group clicks into the user's days (default UTC)
 *   linkId     optional: analytics for one link only
 */
export function parseAnalyticsQuery(query) {
  const from = parseInstant(query.from, 'from');
  const to = parseInstant(query.to, 'to');
  if (to < from) throw badRequest('"to" must be after "from".');
  if (to - from > MAX_RANGE_DAYS * DAY_MS) throw badRequest(`The date range can be at most ${MAX_RANGE_DAYS} days.`);

  const timeZone = query.tz ?? 'UTC';
  if (!isValidTimeZone(timeZone)) throw badRequest('"tz" must be a valid time zone, like "Asia/Kolkata".');

  const linkId = query.linkId || null;
  if (linkId !== null && (typeof linkId !== 'string' || !mongoose.isValidObjectId(linkId))) {
    throw new HttpError(404, 'Link not found.');
  }

  return { from, to, timeZone, linkId };
}

/**
 * Every calendar day (YYYY-MM-DD, in `timeZone`) between two instants.
 * Used to fill days without clicks with 0, so the chart shows real gaps
 * instead of silently skipping them. Steps 6 hours at a time so days that
 * are 23 or 25 hours long (daylight-saving changes) are never skipped.
 */
export function daysInRange(from, to, timeZone) {
  const format = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const days = [];
  for (let time = from.getTime(); time <= to.getTime(); time += 6 * 60 * 60 * 1000) {
    const day = format.format(new Date(time));
    if (days.at(-1) !== day) days.push(day);
  }
  const lastDay = format.format(to);
  if (days.at(-1) !== lastDay) days.push(lastDay);
  return days;
}
