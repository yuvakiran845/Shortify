// Human-readable names for analytics values coming from the API.

export const sourceLabel = (source) => {
  if (source === null) return 'Direct or unknown';
  if (source === 'other') return 'Other sites';
  return source;
};

export const deviceLabel = (device) =>
  ({ desktop: 'Desktop', mobile: 'Mobile', tablet: 'Tablet', other: 'Other' })[device] ?? 'Other';
