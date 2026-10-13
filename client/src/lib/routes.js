// Single source of truth for app paths, so links never drift out of sync.
export const ROUTES = {
  home: '/',
  dashboard: '/dashboard',
  analytics: '/analytics',
  shorten: '/shorten',
  links: '/links',
  qr: '/qr',
  login: '/login',
  signup: '/signup',
};

// QR generator pre-filled with a link: by id for the owner's links (the server
// builds the exact short URL), or by URL for links created while logged out.
export const qrPathForLink = (link, { byId = true } = {}) =>
  byId
    ? `${ROUTES.qr}?link=${encodeURIComponent(link.id)}`
    : `${ROUTES.qr}?url=${encodeURIComponent(link.shortUrl)}`;

// Analytics for one of the user's links.
export const analyticsPathForLink = (link) => `${ROUTES.analytics}?link=${encodeURIComponent(link.id)}`;

// In-page sections of the landing page.
export const SECTIONS = {
  features: '/#features',
  howItWorks: '/#how-it-works',
  faq: '/#faq',
};
