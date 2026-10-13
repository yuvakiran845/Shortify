// Date ranges for the Analytics page, kept in the URL:
//   /analytics?range=7d                       (a preset), or
//   /analytics?from=2026-10-01&to=2026-10-13  (a custom range, in the user's own days)
// The API receives exact instants (start of the first day, end of the last day,
// in the browser's time zone) plus the time zone name for grouping by day.

export const RANGE_PRESETS = [
  { value: '7d', label: 'Last 7 days', days: 7 },
  { value: '30d', label: 'Last 30 days', days: 30 },
  { value: '90d', label: 'Last 90 days', days: 90 },
];
export const DEFAULT_PRESET = '30d';
export const MAX_RANGE_DAYS = 366;

const DAY_MS = 24 * 60 * 60 * 1000;
const pad = (number) => String(number).padStart(2, '0');

// Local calendar date -> "2026-10-13" (not toISOString, which would use UTC).
export const toDateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

// "2026-10-13" -> local midnight Date, or null if it is not a real date (e.g. "2026-02-30").
export function parseDateKey(key) {
  if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
// Inclusive number of calendar days; Math.round absorbs 23/25-hour daylight-saving days.
export const daysBetween = (start, end) => Math.round((startOfDay(end) - startOfDay(start)) / DAY_MS) + 1;

function build(preset, start, end) {
  const endOfLastDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
  return {
    preset, // "7d" | "30d" | "90d" | null for custom
    fromKey: toDateKey(start),
    toKey: toDateKey(end),
    from: start.toISOString(),
    to: endOfLastDay.toISOString(),
    days: daysBetween(start, end),
  };
}

/**
 * Reads the range from URL search params. Invalid custom ranges fall back to
 * the default preset and set `invalidCustom` so the page can say so.
 */
export function resolveRange(searchParams, now = new Date()) {
  const today = startOfDay(now);
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');

  if (fromParam || toParam) {
    const start = parseDateKey(fromParam);
    const end = parseDateKey(toParam);
    if (start && end && start <= end && end <= today && daysBetween(start, end) <= MAX_RANGE_DAYS) {
      return build(null, start, end);
    }
  }

  const preset = RANGE_PRESETS.find((option) => option.value === searchParams.get('range')) ??
    RANGE_PRESETS.find((option) => option.value === DEFAULT_PRESET);
  const range = build(preset.value, addDays(today, -(preset.days - 1)), today);
  return fromParam || toParam ? { ...range, invalidCustom: true } : range;
}

// The browser's IANA time zone, e.g. "Asia/Kolkata".
export const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
