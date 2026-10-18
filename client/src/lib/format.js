// Formatting helpers using the browser's built-in Intl APIs (no date library needed).

const dateFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const numberFormatter = new Intl.NumberFormat();

export const formatDate = (value) => dateFormatter.format(new Date(value)); // "Oct 12, 2026"
export const formatDateTime = (value) => dateTimeFormatter.format(new Date(value)); // "Oct 12, 2026, 5:36 PM"
export const formatNumber = (value) => numberFormatter.format(value); // 12,345

// "localhost:5000/Abc1234" instead of "http://localhost:5000/Abc1234"
export const withoutProtocol = (url) => url.replace(/^https?:\/\//, '');
