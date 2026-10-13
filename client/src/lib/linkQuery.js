// The My Links page keeps its search/sort/filter/page in the URL
// (e.g. /links?search=github&sort=most-clicks&page=2), so the view survives a
// refresh, can be bookmarked, and works with the browser's back button.

export const PAGE_SIZE = 10;

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'most-clicks', label: 'Most clicks' },
  { value: 'fewest-clicks', label: 'Fewest clicks' },
];

export const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'disabled', label: 'Turned off' },
];

export const CLICK_OPTIONS = [
  { value: 'all', label: 'Any clicks' },
  { value: 'clicked', label: 'Has clicks' },
  { value: 'unclicked', label: 'No clicks yet' },
];

export const DEFAULT_QUERY = { page: 1, search: '', sort: 'newest', status: 'all', clicks: 'all' };

const allowed = (options) => options.map((option) => option.value);

const pick = (value, options, fallback) => (allowed(options).includes(value) ? value : fallback);

// Reads the list state from URLSearchParams. Invalid values fall back to defaults.
export function readLinkQuery(searchParams) {
  const page = Number(searchParams.get('page'));
  return {
    page: Number.isInteger(page) && page >= 1 ? page : DEFAULT_QUERY.page,
    search: (searchParams.get('search') ?? '').trim().slice(0, 200),
    sort: pick(searchParams.get('sort'), SORT_OPTIONS, DEFAULT_QUERY.sort),
    status: pick(searchParams.get('status'), STATUS_OPTIONS, DEFAULT_QUERY.status),
    clicks: pick(searchParams.get('clicks'), CLICK_OPTIONS, DEFAULT_QUERY.clicks),
  };
}

// Builds URL params containing only non-default values, so URLs stay short.
export function toSearchParams(query) {
  const params = new URLSearchParams();
  for (const [key, defaultValue] of Object.entries(DEFAULT_QUERY)) {
    const value = query[key];
    if (value !== undefined && value !== '' && value !== defaultValue) params.set(key, String(value));
  }
  return params;
}

export const hasActiveFilters = (query) =>
  query.search !== DEFAULT_QUERY.search || query.status !== DEFAULT_QUERY.status || query.clicks !== DEFAULT_QUERY.clicks;
