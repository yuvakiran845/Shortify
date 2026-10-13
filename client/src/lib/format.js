// Formatting helpers using the browser's built-in Intl APIs (no date library needed).

const dateFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const numberFormatter = new Intl.NumberFormat();

export const formatDate = (value) => dateFormatter.format(new Date(value)); // "Oct 12, 2026"
export const formatDateTime = (value) => dateTimeFormatter.format(new Date(value)); // "Oct 12, 2026, 5:36 PM"
export const formatNumber = (value) => numberFormatter.format(value); // 12,345

// "localhost:5000/Abc1234" instead of "http://localhost:5000/Abc1234"
export const withoutProtocol = (url) => url.replace(/^https?:\/\//, '');

// "2026-10-13" (a calendar day from the API) -> "Oct 13" / "Tue, Oct 13, 2026".
// Built from the date parts, so the day never shifts because of time zones.
const dayShortFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const dayLongFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
const dayKeyToDate = (key) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
};
export const formatDayShort = (key) => dayShortFormatter.format(dayKeyToDate(key));
export const formatDayLong = (key) => dayLongFormatter.format(dayKeyToDate(key));

// 0.4567 -> "46%"
const percentFormatter = new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 0 });
export const formatPercent = (ratio) => percentFormatter.format(ratio);

// "5 minutes ago", "yesterday", "3 days ago"
const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const RELATIVE_UNITS = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];
export function formatRelativeTime(value, now = new Date()) {
  const seconds = (new Date(value) - now) / 1000;
  for (const [unit, unitSeconds] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= unitSeconds) return relativeFormatter.format(Math.round(seconds / unitSeconds), unit);
  }
  return 'just now';
}
