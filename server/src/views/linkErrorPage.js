import { config } from '../config/env.js';

// Everything a visitor can see when a short link cannot be opened.
export const LINK_ERRORS = {
  notFound: {
    status: 404,
    title: 'Link not found',
    message: 'This short link does not exist. Check that it was copied correctly.',
  },
  expired: {
    status: 410,
    title: 'This link has expired',
    message: 'The owner set this short link to expire, so it no longer redirects anywhere.',
  },
  disabled: {
    status: 410,
    title: 'This link is turned off',
    message: 'The owner of this short link has switched it off.',
  },
  deleted: {
    status: 410,
    title: 'This link was deleted',
    message: 'The owner of this short link has deleted it, so it no longer redirects anywhere.',
  },
  blocked: {
    status: 403,
    title: 'Link blocked',
    message: 'This short link points to an address that Shortify does not allow.',
  },
  rateLimited: {
    status: 429,
    title: 'Too many requests',
    message: 'You have opened a lot of links in a short time. Please wait a minute and try again.',
  },
  unavailable: {
    status: 503,
    title: 'Temporarily unavailable',
    message: 'Shortify could not open this link right now. Please try again in a moment.',
  },
};

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

// A tiny self-contained HTML page (no external files) in the Shortify style.
function renderPage({ status, title, message }) {
  const home = escapeHtml(config.appUrl);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)} · Shortify</title>
<style>
  *{box-sizing:border-box;margin:0}
  body{min-height:100vh;display:grid;place-items:center;padding:24px 16px;background:#f6f8fb;color:#17243a;
    font-family:"Inter",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
  main{width:100%;max-width:440px;background:#fff;border:1px solid #e3e8ef;border-radius:16px;padding:40px 32px;text-align:center;
    box-shadow:0 12px 32px -12px rgb(23 36 58/.18)}
  .logo{display:inline-flex;align-items:center;gap:10px;font-weight:700;font-size:18px;color:#17243a;text-decoration:none}
  .code{margin-top:28px;font-size:13px;font-weight:600;color:#315ce8}
  h1{margin-top:6px;font-size:24px;line-height:1.25;letter-spacing:-.01em}
  p{margin-top:10px;color:#45526a;line-height:1.6;font-size:15px}
  .actions{margin-top:28px;display:flex;flex-direction:column;gap:10px}
  a.btn{display:block;padding:12px 16px;border-radius:8px;font-weight:600;font-size:15px;text-decoration:none}
  .primary{background:#315ce8;color:#fff}.primary:hover{background:#2549c8}
  .secondary{border:1px solid #cfd7e3;color:#17243a}.secondary:hover{background:#f6f8fb}
  a:focus-visible{outline:2px solid #315ce8;outline-offset:2px}
</style>
</head>
<body>
<main>
  <a class="logo" href="${home}">
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#315CE8"/><g transform="translate(4 4)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="#fff"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="#FFA3AF"/></g></svg>
    Shortify
  </a>
  <p class="code">Error ${status}</p>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(message)}</p>
  <div class="actions">
    <a class="btn primary" href="${home}/shorten">Create your own short link</a>
    <a class="btn secondary" href="${home}">Go to Shortify home</a>
  </div>
</main>
</body>
</html>`;
}

// Browsers get the HTML page; API clients (Accept: application/json) get JSON.
export function sendLinkError(req, res, error) {
  res.status(error.status).set({ 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' });
  if (req.accepts(['html', 'json']) === 'json') {
    return res.json({ message: error.message });
  }
  return res.type('html').send(renderPage(error));
}
