# Shortify

Shorten links. Share smarter.

**Live demo: [getshortify.vercel.app](https://getshortify.vercel.app)**

![Shortify landing page: paste a long URL to get a short link and a QR code](docs/screenshots/landing.png)

Shortify is a full-stack URL shortener and QR code generator built with React, Node.js, Express, and MongoDB. Every number in the app comes from real data: clicks are recorded events, not counters made up for the UI.

## Features

- **Shorten links** with or without an account. Random 7-character codes (cryptographically secure, collision-safe), or a **custom alias** for logged-in users.
- **Fast redirects** (`302`, never cached) with branded error pages for links that are unknown (`404`), expired, switched off, or deleted (`410`).
- **Accounts**: sign-up/login with bcrypt-hashed passwords, JWT session in an HttpOnly cookie, CSRF protection, logout that revokes the session everywhere. Links created before signing up move into the new account.
- **My links**: search (title, URL, short code), filter (status, clicks), sort, and pagination, all done in MongoDB. Edit destination, title, alias, on/off, and expiry; delete with a confirmation.
- **Dashboard**: total links, total clicks, active links, QR codes, and recent links.
- **Click counts**: every link shows how many real visits it got (bots, link previews, and quick repeat clicks are not counted), and the dashboard shows the totals.
- **QR codes**: for any URL or one of your short links, in three colors and three sizes, downloaded as PNG. Scannability is verified by decoding the generated pixels in tests. Logged-in users get a QR history.
- **Privacy-conscious click tracking**: no IP addresses or full user agents are stored; bots, link previews, prefetches, and quick repeat clicks are not counted.
- **Responsive and accessible**: works from 375 px phones to desktops, keyboard-friendly dialogs and menus, labelled forms, visible focus states.

## Screenshots

<table>
  <tr>
    <td width="50%">
      <img src="docs/screenshots/shorten-result.png" alt="A long URL shortened on the home page, with Copy link and QR code buttons">
      <p align="center"><b>Shorten without an account</b><br><sub>Paste a URL, get a short link and a QR code instantly.</sub></p>
    </td>
    <td width="50%">
      <img src="docs/screenshots/dashboard.png" alt="Dashboard with total links, total clicks, active links, QR codes, and recent links">
      <p align="center"><b>Dashboard</b><br><sub>Totals for links, real clicks, active links, and QR codes.</sub></p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="docs/screenshots/my-links.png" alt="My links: search, filters, sorting, and each link's clicks, date, status, and actions">
      <p align="center"><b>My links</b><br><sub>Search, filter, sort, copy, edit, or delete every link.</sub></p>
    </td>
    <td width="50%">
      <img src="docs/screenshots/create-link.png" alt="Create a short link dialog with a custom alias and title">
      <p align="center"><b>Custom aliases</b><br><sub>Pick your own short code, add a title, or set an expiry date.</sub></p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="docs/screenshots/qr-generator.png" alt="QR code generator showing a teal QR code for a short link, with download and history">
      <p align="center"><b>QR codes</b><br><sub>For any URL or short link, in three colors and sizes, saved to history.</sub></p>
    </td>
    <td width="50%">
      <p align="center">
        <img src="docs/screenshots/mobile-home.png" alt="Shortify home page on a phone" width="46%">
        &nbsp;
        <img src="docs/screenshots/mobile-links.png" alt="My links on a phone, shown as cards" width="46%">
      </p>
      <p align="center"><b>On phones</b><br><sub>The whole app works from 375 px screens up.</sub></p>
    </td>
  </tr>
</table>

<sub>Screenshots show demo data.</sub>

## Architecture

```
 Browser (React SPA)                        Visitors opening short links
   │  fetch /api/...  (cookies + X-CSRF-Token)        │  GET /<code>
   ▼                                                  ▼
 ┌────────────────────────── Express API (server/) ──────────────────────────┐
 │ helmet → CORS → rate limit → cookies → CSRF check → session → guest id    │
 │ routes → controllers (validate input) → services (business logic)         │
 │ redirect route: look up code → safety re-check → record click → 302       │
 └───────────────────────────────────┬────────────────────────────────────────┘
                                     ▼
                       MongoDB (Mongoose models)
            users · links · clicks · qrcodes · dailysalts (TTL)
```

- **Frontend** (`client/`): React 19 single-page app. `lib/api.js` is the only place that talks to the API (adds the CSRF header, turns errors into messages); pages read data through small hooks built on `useApiData` (aborts outdated requests, keeps old data visible while reloading).
- **Backend** (`server/`): Express 5 in layers: *routes* map URLs, *controllers* validate input, *services* hold the logic and every database query. `createApp()` builds the app without listening, so tests run the real app in memory with supertest.
- **Ownership** is enforced inside each database query (`ownerFilter`), so another user's data is simply "not found".
- **Clicks** are stored as events (`clicks` collection) and also counted on the link (`clickCount`) so lists can sort by popularity cheaply; analytics run one MongoDB aggregation over an `{ owner, clickedAt }` index.

## Project structure

```
Shortify/
├── .github/workflows/ci.yml   CI: lint, tests (with MongoDB), and build on every push
├── api/index.js               Vercel serverless function (the API and short-link redirects)
├── vercel.json                Vercel build and routing config (recommended deployment, no secrets)
├── package.json               Repository root marker for Vercel (ES modules, Node version)
├── render.yaml                Alternative: one Render service (Blueprint, no secrets)
├── netlify.toml               Alternative: website on Netlify (build, /api proxy, SPA fallback)
├── docs/screenshots/          Images used in this README
├── client/                    React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/            Reusable design-system components (Button, Input, Dialog, ...)
│   │   │   ├── layout/        Navbar, Footer, page shell
│   │   │   ├── landing/       Landing page sections
│   │   │   ├── links/         Shorten form, result card, link list
│   │   │   ├── qr/            QR preview, history, result panel
│   │   │   ├── auth/          Login/sign-up layout and route guard
│   │   │   ├── app/           Signed-in app shell: sidebar, mobile drawer, Create link dialog
│   │   │   └── dashboard/     Overview page stat cards and get-started guide
│   │   ├── hooks/             Custom React hooks (data loading, auth, URL state)
│   │   ├── lib/               API client, URL validation, clipboard, toast store
│   │   ├── pages/             Route-level pages
│   │   ├── App.jsx            Route definitions
│   │   └── index.css          Tailwind v4 design tokens
│   ├── tests/                 Unit tests (Node test runner)
│   └── .env.example           Frontend settings template
└── server/                    Express + MongoDB API
    ├── src/
    │   ├── config/            Environment variables and database connection
    │   ├── controllers/       Request handlers
    │   ├── middleware/        Auth session, CSRF, guest identity, rate limiting, error handling
    │   ├── models/            Mongoose schemas
    │   ├── routes/            URL → controller mapping
    │   ├── services/          Business logic and database queries (links, auth, analytics, QR)
    │   ├── utils/             URL validation, short-code generator, bot detection, click de-duplication
    │   ├── views/             HTML error page for short links that cannot be opened
    │   ├── app.js             Builds the Express app (used by server and tests)
    │   └── server.js          Entry point: connect to MongoDB, start listening
    ├── scripts/smokeTest.js   End-to-end check against a running API (local or deployed)
    ├── tests/                 API and unit tests (Node test runner + supertest)
    └── .env.example           Server settings template (placeholders only)
```

## Requirements

- Node.js 20.19+ (or 22.12+)
- MongoDB 6+ (local) or a free MongoDB Atlas cluster

## MongoDB setup

**Local (recommended for development)**

1. Install MongoDB Community Server (https://www.mongodb.com/try/download/community). On Windows, keep "Install as a Service" checked so it starts automatically; on macOS use `brew install mongodb-community` and `brew services start mongodb-community`; on Linux follow the guide for your distribution. Docker also works: `docker run -d -p 27017:27017 --name mongo mongo:7`.
2. Keep the default `MONGO_URI=mongodb://127.0.0.1:27017/shortify` in `server/.env`. The database and collections are created automatically on first use, and Mongoose builds the indexes (unique short codes, unique emails, query indexes) at startup.
3. Tests use a separate `shortify_test` database that is wiped after every run, so development data is never touched.

**MongoDB Atlas (for deployment)**

1. Create a free M0 cluster at https://www.mongodb.com/cloud/atlas.
2. *Database Access*: add a database user with a long generated password (read/write).
3. *Network Access*: allow the API host's IP addresses. Hosts such as Vercel (serverless) and Render have changing IPs, so you need `0.0.0.0/0`; the strong password is then the protection.
4. *Connect → Drivers*: copy the `mongodb+srv://...` string, insert the password, and add the database name: `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/shortify?retryWrites=true&w=majority`. Put it only in the hosting dashboard (`MONGO_URI`), never in a committed file.

## Run locally

Start the API (terminal 1):

```bash
cd server
npm install
cp .env.example .env
```

On Windows PowerShell use `Copy-Item .env.example .env` instead of `cp`.

Generate a session secret and paste it into `server/.env` as `JWT_SECRET=...` (the server refuses to start with the example placeholder):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Then start the API, which runs on http://localhost:5000:

```bash
npm run dev
```

Start the frontend (terminal 2):

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173. In development, Vite forwards `/api` requests to the API, so no extra frontend configuration is needed.

In development, http://localhost:5173/ui shows every shared UI component (excluded from production builds).

## Open short links on your phone

Short links are built from `PUBLIC_BASE_URL`. With the default `http://localhost:5000`, a link only opens on this computer: on a phone, "localhost" means the phone itself. To test with phones and tablets on the **same Wi-Fi**:

```bash
cd server
npm run lan
```

This finds the computer's network address (skipping WSL, Hyper-V, VirtualBox, and VPN adapters) and sets `PUBLIC_BASE_URL` (e.g. `http://192.168.1.20:5000`) and `CLIENT_ORIGIN` in `server/.env`. Restart the API afterwards. Every link, and the QR codes made for them, then uses that address: short URLs are built from the setting on every request, and saved QR codes are brought up to date when the API starts.

To use the app itself on the phone as well, start the frontend with `npm run dev:lan` (in `client/`) and open `http://<network address>:5173`. The first time, Windows may ask whether Node.js may accept connections; allow it for private networks.

The address can change when you switch networks: run `npm run lan` again. `npm run lan -- off` goes back to `localhost`. Links only work while this computer is on and in the same network; to share links with anyone, anywhere, deploy the app (see [Deployment](#deployment)).

## Pages

| Path | Who | Layout |
|---|---|---|
| `/` | everyone | Public website (navbar + footer) |
| `/login`, `/signup` | logged-out visitors (logged-in users are sent to `/dashboard`) | Public website |
| `/shorten`, `/qr` | everyone | App shell when logged in, public website otherwise |
| `/dashboard` (Overview), `/links` (My links) | logged-in users only (others go to `/login` and come back afterwards) | App shell |

**Design:** one brand colour (deep teal, `#0F766E`) on neutral zinc greys; green, amber, and red appear only where they carry meaning (link status, errors, delete). All colours are design tokens in `client/src/index.css`.

The **app shell** has a fixed sidebar on desktop (Create link, Overview, My links, QR codes, account menu) and a top bar with a slide-in drawer on phones. The **Create link** dialog works from every app page; Overview and My links refresh automatically after a link is created. Its **More options** section (also on `/shorten` when logged in) sets a custom alias, a title, and an expiry date. Each row on **My links** has Copy, QR code, **Edit** (destination, title, alias, on/off, expiry) and **Delete** (with a confirmation that lists exactly what will be removed).

## Environment variables

### Server (`server/.env`)

| Variable | Example | Purpose |
|---|---|---|
| `PORT` | `5000` | Port the API listens on |
| `NODE_ENV` | `development` | `production` requires HTTPS for `PUBLIC_BASE_URL` and `CLIENT_ORIGIN`, and secure cookies |
| `MONGO_URI` | `mongodb://127.0.0.1:27017/shortify` | MongoDB connection string |
| `PUBLIC_BASE_URL` | `http://localhost:5000` | The short-link domain: links are `<PUBLIC_BASE_URL>/<code>`, e.g. `https://yourdomain.com/aB7xK9p`. Address only (no path). In production it must be a public HTTPS domain that points at this API (see [Use your own short domain](#use-your-own-short-domain)). |
| `CLIENT_DIST_DIR` | *(unset)* | Folder with the built website (`client/dist`). When set, this server also serves the site: one address for the website, API, and short links (deployment option B, Render). Not used on Vercel, which serves the website itself. |
| `COOKIE_SAME_SITE` | `lax` | `none` only for a website on another site calling the API directly (deployment option C, HTTPS only). |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Frontend origin(s) allowed by CORS, comma-separated. Origins only (no path); a trailing slash is removed. Required in production. |
| `TRUST_PROXY` | `0` | Number of reverse proxies in front of the API (usually `1` when hosted) |
| `API_LIMIT_PER_MINUTE` | `300` | All API requests from one IP address per minute (safety net for every endpoint) |
| `CREATE_LINK_LIMIT_PER_MINUTE` | `20` | Links one IP address can create per minute |
| `REDIRECT_LIMIT_PER_MINUTE` | `120` | Short links one IP address can open per minute (blocks code scanning) |
| `CLICK_DEDUPE_SECONDS` | `30` | Repeat clicks by the same visitor on the same link within this window count once |
| `JWT_SECRET` | *(64 random characters)* | Signs login sessions. **Required, at least 32 characters, keep secret.** Generate with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `SESSION_DAYS` | `7` | How long a login lasts |
| `BCRYPT_ROUNDS` | `12` | bcrypt cost factor for password hashing |
| `LOGIN_LIMIT_PER_15_MINUTES` | `10` | Failed logins allowed per IP every 15 minutes |
| `REGISTER_LIMIT_PER_HOUR` | `10` | Accounts one IP address can create per hour |

### Client (`client/.env`)

| Variable | Example | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `/api` | Where the API is. Keep `/api` in development (Vite proxy) and on Vercel or Render (options A and B: the website and API share one address); set `https://<your-api>/api` only when the website is hosted separately and calls the API directly (option C). |

## API

All `POST`, `PUT`, `PATCH`, and `DELETE` requests must send the `X-CSRF-Token` header (see [Security](#security)). Errors always have the form `{ "message": "...", "field"?: "..." }`.

### Accounts

| Endpoint | Body | Success | Errors |
|---|---|---|---|
| `GET /api/csrf-token` | – | `200 { csrfToken }` | – |
| `POST /api/auth/register` | `{ name, email, password }` | `201 { user, claimedLinks }` + session cookie | `400` invalid field, `409` email taken, `429` too many sign-ups |
| `POST /api/auth/login` | `{ email, password }` | `200 { user, claimedLinks }` + session cookie | `400` invalid email, `401` wrong email or password, `429` too many failures |
| `POST /api/auth/logout` | – | `204` (session revoked, cookie cleared) | – |
| `GET /api/auth/me` | – | `200 { user }` or `200 { user: null }` when logged out | – |

`user` is `{ id, name, email, createdAt }`. The password hash is never returned. `claimedLinks` is the number of links this browser created while logged out that were moved into the account.

Rules: name 1–80 characters; valid email (stored lowercase, unique); password at least 8 characters and at most 72 bytes (bcrypt's limit).

### `POST /api/links`

Creates a short link. Works logged in (the link belongs to the account) or logged out (the link belongs to this browser until the visitor signs up or logs in).

Request body:

```json
{ "url": "https://example.com/a/very/long/page" }
```

Logged-in users may also send `alias`, `title`, and `expiresAt` (see [Managing links](#managing-links)); logged-out visitors get `401` for those.

`url` must be an http or https address with a real domain. If the scheme is missing (`example.com/page`), `https://` is added. `javascript:`, `data:`, `file:`, `ftp:`, URLs with embedded usernames/passwords, `localhost`, and links to Shortify itself are rejected.

Responses:

| Status | Body |
|---|---|
| `201 Created` | `{ "link": { "id", "shortCode", "shortUrl", "originalUrl", "title", "clickCount", "expiresAt", "isActive", "status", "createdAt", ... } }` |
| `400 Bad Request` | `{ "message": "Only http:// and https:// links are supported.", "field": "url" }` |
| `401 Unauthorized` | alias/title/expiry sent while logged out |
| `409 Conflict` | `{ "message": "That alias is already taken. Please choose another one.", "field": "alias" }` |
| `429 Too Many Requests` | `{ "message": "Too many links created. Please wait a minute and try again." }` |
| `503 Service Unavailable` | `{ "message": "Could not generate a unique short link. Please try again." }` |

How short codes are generated: 7 random characters from `0-9A-Za-z` (62⁷ ≈ 3.5 trillion combinations) using Node's cryptographically secure `crypto.randomInt`. A unique index on `shortCode` makes MongoDB reject duplicates; on a duplicate-key error the server retries with a new code, up to 5 times.

### `GET /api/links`

**Requires login** (`401` otherwise). Returns one page of **the caller's own** links. Filtering, sorting, and pagination run inside MongoDB, so only one page of documents is ever sent.

| Query parameter | Values | Default |
|---|---|---|
| `page` | 1 – 10000 | `1` |
| `limit` | 1 – 50 | `10` |
| `search` | text (max 200 chars), matches the original URL, short code, or title, case-insensitive | none |
| `sort` | `newest`, `oldest`, `most-clicks`, `fewest-clicks` | `newest` |
| `status` | `all`, `active`, `expired`, `disabled` | `all` |
| `clicks` | `all`, `clicked`, `unclicked` | `all` |

Response:

```json
{
  "links": [
    { "id": "…", "shortCode": "Abc1234", "shortUrl": "http://localhost:5000/Abc1234",
      "originalUrl": "https://example.com/…", "title": null, "clickCount": 3, "lastClickedAt": "…",
      "expiresAt": null, "isActive": true, "status": "active", "createdAt": "…" }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 12, "totalPages": 2 }
}
```

Invalid parameters return `400` with a message. Search text is escaped before it is used in a regular expression, so characters such as `.` or `(` match literally.

Compound indexes `{ owner, createdAt, _id }` and `{ owner, clickCount, _id }` let MongoDB read each sorted page straight from an index.

### `GET /api/links/:id`

**Requires login.** Returns `{ link }` for one of the caller's links. Another user's link, an unknown id, and a malformed id all return the same `404`, so the API never reveals whether someone else's link exists.

### Managing links

**All require login and the CSRF header.** Another user's link, an unknown id, and a deleted link all return `404`.

| Endpoint | Body | Success |
|---|---|---|
| `PATCH /api/links/:id` | any of `url`, `title`, `alias`, `expiresAt`, `isActive` | `200 { link }` |
| `DELETE /api/links/:id` | – | `204` |

Field rules (checked on the server, mirrored in the browser for instant feedback):

| Field | Rule |
|---|---|
| `alias` | 3–50 characters from `A–Z a–z 0–9 - _`, case-sensitive like generated codes. Words used by the app (`api`, `login`, `dashboard`, `qr`, …) are reserved, ignoring case. Taken → `409` with `field: "alias"`. |
| `title` | up to 100 characters; `null` or `""` removes it. Only the owner sees it. |
| `expiresAt` | ISO date-time in the future (at most 10 years ahead), or `null` for "never expires". The browser converts the user's local time to UTC. |
| `isActive` | `true` / `false` (switch the link on or off). |
| `url` | same rules as `POST /api/links`. |

Sending nothing to change is a `400`. The edit form only sends the fields that actually changed.

Uniqueness is enforced by MongoDB's unique index on `shortCode`, not by a "check, then insert" in code: when two people ask for the same alias at the same moment, the database accepts exactly one and the other gets `409`.

What happens to clicks and QR codes:

| Action | Short URL afterwards | Click history | QR history | Can be undone |
|---|---|---|---|---|
| Switch off | `410` "turned off" page | kept | kept | yes, switch on |
| Expires | `410` "expired" page | kept | kept | yes, new date or remove it |
| Change alias | new URL works; old URL `404` | kept | entries updated to the new URL (printed copies still have the old one) | yes, the link can switch back to its old alias |
| Delete | `410` "deleted" page | permanently deleted | entries for the link deleted | no |

**Aliases are never handed to someone else.** A deleted link stays as a *tombstone* (destination and title erased, `deletedAt` set), and renaming leaves a placeholder for the old code (`formerCodeOf`). Both keep the code reserved, so an old shared link or printed QR code can never start pointing at another person's destination. Tombstones and placeholders are excluded from every list, total, analytics query, and QR lookup.

### QR code history

QR codes are drawn in the browser, so anyone can generate and download them. Logged-in users also get a saved history (one entry per URL; generating it again moves it to the top).

| Endpoint | Body / query | Success | Errors |
|---|---|---|---|
| `GET /api/qr-codes` | `?limit=1..50` (default 10) | `200 { qrCodes: [...] }` newest first | `400` bad limit, `401` |
| `POST /api/qr-codes` | `{ url }` or `{ linkId }` | `201 { qrCode }` (new) or `200` (moved to top) | `400` invalid URL, `404` link not in your account, `401` |
| `DELETE /api/qr-codes/:id` | – | `204` | `404` not found / not yours, `401` |

`qrCode` is `{ id, content, linkId, generatedCount, lastGeneratedAt, createdAt }`. With `{ linkId }` the server builds `content` from `PUBLIC_BASE_URL`, so a QR code for a short link always encodes the real short URL. `{ url }` follows the shortener's URL rules, except that Shortify short links themselves are allowed.

### `GET /api/dashboard`

**Requires login.** Everything the Overview page shows, computed from real data:

```json
{
  "stats": { "totalLinks": 3, "totalClicks": 4, "activeLinks": 3, "qrCodes": 2 },
  "recentLinks": [ { "id": "…", "shortUrl": "…", "clickCount": 3, "status": "active", "…": "…" } ]
}
```

- `totalLinks`, `totalClicks`, and `activeLinks` come from one MongoDB aggregation (`$match` on the indexed `owner` field, then `$group`). `totalClicks` is the sum of each link's counted clicks, so bots and repeat clicks are excluded (see [Click counting](#click-counting)). `activeLinks` counts links that are switched on and not past their expiry date.
- `qrCodes` is the number of entries in the user's QR code history.
- `recentLinks` are the 5 newest links.
- A new account gets zeros and an empty list.

### `GET /api/analytics`

*The web app no longer has an Analytics page; this endpoint is kept for API clients and future use.*

**Requires login.** Click analytics for a date range, computed from recorded click events.

| Query parameter | Meaning |
|---|---|
| `from`, `to` | ISO date-times. The browser sends the start of the first day and the end of the last day in the user's time zone. Max 366 days. |
| `tz` | IANA time zone (e.g. `Asia/Kolkata`) used to group clicks into the user's days. Default `UTC`. |
| `linkId` | Optional: one of the user's links. Another user's link returns `404`. |

Response: `range`, `link`, `totals { clicks, uniqueVisitors }`, `timeline` (every day in the range, including zero-click days), `topLinks` (top 5), `sources` (top 7 referring domains + "other"), `devices`, `recentClicks` (latest 10).

One `$match` on the `{ owner, clickedAt }` index selects the user's clicks in the range, then a single `$facet` stage computes every section in one database round trip.

### `GET /api/config`

Public settings for the frontend: `{ "shortLinkBaseUrl": "http://localhost:5000" }`.

### `GET /api/health`

Returns `{ "status": "ok", "database": "connected" }`.

## Short-link redirects

Short links are served by the API server at `<PUBLIC_BASE_URL>/<code>`, e.g. `http://localhost:5000/Abc1234`.

| Situation | Response |
|---|---|
| Link exists and is active | `302 Found` → `Location: <original URL>` with `Cache-Control: no-store` |
| Unknown or malformed code | `404 Not Found` |
| Link past its expiry date | `410 Gone` |
| Link switched off by its owner | `410 Gone` |
| Link deleted by its owner | `410 Gone` |
| Former alias of a renamed link | `404 Not Found` |
| Stored destination fails the safety re-check | `403 Forbidden` (no redirect) |
| Too many redirects from one IP | `429 Too Many Requests` |
| Database unavailable | `503 Service Unavailable` |

Browsers get a small branded HTML page for errors; clients sending `Accept: application/json` get `{ "message": "..." }`.

- **Why 302 and not 301?** Browsers cache 301 redirects permanently, so repeat visits would skip the server: clicks would not be counted and a link could not be changed or switched off later.
- **Route safety:** `/api/*` is handled first and always returns JSON. Codes may only contain letters, digits, `-` and `_`, so requests like `/favicon.ico` never reach the database. `/` redirects to the frontend and `/robots.txt` asks crawlers not to follow short links.

### Click counting

Each counted click atomically increments the link's `clickCount` (`$inc`) and stores a `Click` event (`link`, `clickedAt`) for analytics. No IP addresses are stored.

A request is **not** counted when it is:

- a `HEAD` request,
- a browser prefetch/prerender (`Sec-Purpose: prefetch`),
- from a bot or link-preview fetcher (Googlebot, Slack, WhatsApp, Facebook, headless browsers, ...) or has no User-Agent,
- a repeat click by the same visitor on the same link within `CLICK_DEDUPE_SECONDS`. Visitors are recognized by a SHA-256 hash of IP + User-Agent that lives only in server memory for that window.

If saving the click fails, the visitor is still redirected (the error is logged).

### What a click stores (privacy)

| Stored | Not stored |
|---|---|
| link, owner, time | IP address |
| referring site's **domain only** (`news.ycombinator.com`; `www.` removed) | full referrer URL (paths/queries can contain personal data) |
| coarse device type: desktop / mobile / tablet / other | full User-Agent string |
| a daily visitor hash (below) | cookies, location, fingerprints |

### Total clicks vs. unique visitors

- **Total clicks** = counted clicks (bots, prefetches, and repeat clicks within `CLICK_DEDUPE_SECONDS` excluded).
- **Unique visitors** uses a privacy-first daily hash: `visitorId = HMAC-SHA256(dailySalt, IP + User-Agent)`, first 16 hex characters. The salt is random, created once per UTC day, shared by all server instances (stored in the `dailysalts` collection), and **deleted automatically after 2 days** by a MongoDB TTL index. After that, a stored hash can no longer be linked to an IP address.
- What this means for the number: each person is counted **once per day per device/browser**. Someone who visits on two different days counts twice; someone using a phone and a laptop counts twice. The UI labels it that way.

## QR codes

- **Encoding:** the [`qrcode`](https://www.npmjs.com/package/qrcode) library turns text into a grid of modules (Reed-Solomon error correction level **M**, ~15% damage tolerance). Shortify draws that grid itself: an SVG for the on-screen preview and raw pixels for the PNG (`client/src/lib/qr.js`).
- **Always scannable:** dark color on white only (black, navy, or blue), the standard 4-module quiet zone, and every module at least 3 pixels wide. Long URLs make the image grow instead of shrinking modules.
- **Proven by tests:** `client/tests/qr.test.js` renders the exact pixels used for the PNG and decodes them with [`jsQR`](https://www.npmjs.com/package/jsqr) for every size, every color, and a 2,000-character URL. Control tests confirm the decoder rejects a blank image and a damaged code.
- **Downloads:** PNG at 256, 512, or 1024 px, named like `shortify-qr-sho.rt-Abc1234.png`.
- **Code splitting:** the QR page and its library load only when `/qr` is opened.

## Security

### Sessions

- Logging in or signing up sets `shortify_session`: a JWT (HS256, signed with `JWT_SECRET`, expires after `SESSION_DAYS`) containing only the user id and a `sessionVersion`.
- The cookie is `HttpOnly` (JavaScript cannot read it, so an XSS bug cannot steal it), `SameSite=Lax`, `Path=/api`, and `Secure` in production.
- Every API request verifies the signature (algorithm pinned to HS256, so `alg: none` tokens are rejected) and reloads the user, so deleted users lose access immediately.
- **Logout** increments the user's `sessionVersion`, which invalidates every token issued before it — including a copied/stolen one. (Trade-off: logging out signs you out on all devices.)
- The frontend learns who is logged in from `GET /api/auth/me` on page load, so sessions survive refreshes. Protected pages (`/links`) redirect to `/login` and come back afterwards; any `401` from the API switches the app to logged-out.

### Passwords

- Hashed with bcrypt (`BCRYPT_ROUNDS`, default 12) before saving; never logged or returned.
- Login answers "Incorrect email or password" in both failure cases and still runs a bcrypt comparison for unknown emails, so neither the message nor the timing reveals which emails have accounts.
- Failed logins and sign-ups are rate limited per IP.

### CSRF

1. Session cookies are `SameSite=Lax`, so browsers do not send them on cross-site `POST`/`PUT`/`PATCH`/`DELETE`.
2. Double-submit token: `GET /api/csrf-token` returns a random token (also stored in the `HttpOnly` `shortify_csrf` cookie). Every state-changing request must echo it in `X-CSRF-Token`; the server compares the two in constant time. Other websites cannot read the token because CORS blocks them from reading our responses.

### CORS

Only the origins in `CLIENT_ORIGIN` may call the API from a browser (`credentials: true`, allowed headers `Content-Type` and `X-CSRF-Token`). Short-link redirects need no CORS. Each origin is checked at startup: a value with a path, or plain `http://` in production, stops the server with a clear message instead of silently breaking every request.

### Rate limits

| Limit | Default | Counts |
|---|---|---|
| All API requests | 300 / minute / IP | every `/api` request (`429` JSON with `RateLimit` headers) |
| Create link | 20 / minute / IP | `POST /api/links` |
| Failed logins | 10 / 15 minutes / IP | only failed attempts, so real users are never locked out by success |
| Sign-ups | 10 / hour / IP | `POST /api/auth/register` |
| Redirects | 120 / minute / IP | `GET /<code>` (blocks scripts guessing codes) |

### Errors

Every API error is JSON: `{ message, field? }`. Invalid input is `400` (with `field` for form errors), missing login `401`, CSRF problems `403`, not found / not yours `404`, conflicts `409`, rate limits `429`, and a database outage `503` ("temporarily unavailable") instead of a generic `500`. Unexpected errors are logged on the server; the response never contains stack traces or internal messages.

### Authorization

Every private query starts from `ownerFilter(req)` (`server/src/middleware/guest.js`), which returns `{ owner: <logged-in user id> }`. A user can never list, search, edit, or delete another user's links: the owner is part of the database query itself, so someone else's link is simply "not found" (`404`).

### Guest links

Visitors can shorten links without an account. Such links belong to the browser through the `shortify_guest` cookie (a random 256-bit secret, `HttpOnly`); the database stores only its SHA-256 hash. On sign-up or login, those links move into the account (`claimedLinks` in the response) and the guest cookie is removed.

## Testing

```bash
cd server && npm run lint   # ESLint
cd server && npm test       # 328 API + unit tests; needs MongoDB, uses the separate "shortify_test" database
cd client && npm run lint   # ESLint (incl. React hooks rules)
cd client && npm test       # 74 unit tests, incl. decoding generated QR codes with jsQR
cd client && npm run build  # production build
cd e2e && npm test          # 18 Playwright browser tests (see below)
```

**End-to-end browser tests (Playwright).** `e2e/` drives the real app in Chrome: landing page and FAQ, shortening as a visitor (copy to clipboard, redirect), URL validation, 404 pages, sign up / log out / log in back to the requested page, wrong-password and duplicate-email errors, guest links moving into a new account, creating links with alias + title + expiry, alias conflicts, editing (switch off, rename: old URL 404, new URL 410), deleting with confirmation, search and filters, click counting (bots ignored), QR generation and PNG download (file name and pixel size checked), plus a phone project (Pixel 7) for the mobile menu, link cards, navigation drawer, and no sideways scrolling.

```bash
cd e2e
npm install
npm test                 # headless; add --headed to watch, or "npm run report" for the HTML report
```

Playwright starts its own API (port 5100) and a production build of the frontend (port 5174) against a throwaway `shortify_e2e` database that is emptied before and after the run, so development data is never touched (MongoDB must be running). Locally it uses your installed Google Chrome; on CI it installs Playwright's Chromium. Failures keep a screenshot and a step-by-step trace (`npx playwright show-trace <file>`). To test the one-server shape (deployment option B: Express serving the website, API, and short links), run `E2E_SINGLE_SERVICE=1 npx playwright test` (PowerShell: `$env:E2E_SINGLE_SERVICE=1; npx playwright test`).

**Smoke test (end to end).** With the API running, `cd server && npm run smoke` walks through the real user flows over HTTP like a browser would (41 checks): guest link → redirect → sign-up claims it → alias, conflict, click counting, dashboard and analytics numbers, QR history, edit/rename/switch off, another user getting `404` for everything, CSRF rejection, delete, logout revoking a copied session cookie, and login. Point it at a deployment with `npm run smoke -- https://<your-project>.vercel.app/api`. It leaves two `smoke-...@example.com` accounts behind (there is no delete-account endpoint).

**CI.** `.github/workflows/ci.yml` runs the server lint and tests against a MongoDB 7 service container, the client lint, tests, and build, and the Playwright browser tests, on every push to `main` and every pull request.

What the automated tests cover: URL validation and normalization, short-code collisions and retries, aliases (rules, conflicts, race between two requests), redirects and their status codes, click counting rules (bots, HEAD, prefetch, repeat clicks), analytics math and time zones, dashboard totals, authentication (hashing, sessions, revocation, timing-safe login), CSRF, CORS, rate limits, ownership of every endpoint, guest link claiming, editing and deleting (what happens to clicks and QR history), error handling, and QR code scannability.

## Deployment

**Why links say `localhost` until you deploy.** Every short link is `<PUBLIC_BASE_URL>/<code>`, built by the server. On your computer `PUBLIC_BASE_URL` is `http://localhost:5000`, and "localhost" always means "this device", so those links cannot open on another phone or computer. Changing the displayed text would not help: the server itself must be reachable on the internet. Once Shortify runs on a public host and `PUBLIC_BASE_URL` is that host's HTTPS address, every link (old ones too, because MongoDB stores only the code) becomes `https://<your-host>/<code>` and works on any device. Until then, the dashboard shows a notice that links only work on this computer.

### Option A (recommended): Vercel + MongoDB Atlas

One Vercel project serves everything from one public address, e.g. `https://shortify.vercel.app`:

- the **website**: the React build (`client/dist`) from Vercel's CDN, including deep links such as `/dashboard`;
- the **API** (`/api/...`) and the **short links** (`/<code>`): the Express app running as a serverless function (`api/index.js` → `server/src/serverless.js`).

Because the website and the API share one address, cookies stay first-party and no CORS setup is needed. `vercel.json` holds the build commands and routing; the function opens one MongoDB connection per warm instance and reuses it.

1. **MongoDB Atlas** (see [MongoDB setup](#mongodb-setup)): a database user with `readWrite` on `shortify`, Network Access `0.0.0.0/0` (Vercel's addresses change; the strong password protects the database), and the connection string ending in `.mongodb.net/shortify?retryWrites=true&w=majority`. Check it locally first: `$env:MONGO_URI="…"; npm run check-db` (in `server/`; the string is never printed).
2. **GitHub**: the repository must be pushed (`.env` files are ignored by git, so no secret is uploaded).
3. **Vercel → Add New… → Project** → import the repository. Keep **Root Directory** at the repository root (`./`); `vercel.json` sets the rest (framework *Other*, install, build, output `client/dist`). Before clicking **Deploy**, open **Environment Variables** and add (Production):

   | Name | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `MONGO_URI` | your Atlas connection string |
   | `PUBLIC_BASE_URL` | `https://<project-name>.vercel.app` |
   | `CLIENT_ORIGIN` | the same address as `PUBLIC_BASE_URL` |
   | `JWT_SECRET` | 32+ random characters: run `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` and paste the output |
   | `TRUST_PROXY` | `1` |

4. **Deploy**, then open the project's **Domains** (or the deployment page) to see the production address. If it is not exactly the `PUBLIC_BASE_URL` you entered (Vercel adds a suffix when a name is taken), update `PUBLIC_BASE_URL` and `CLIENT_ORIGIN` under *Settings → Environment Variables* and **Redeploy**. Environment variable changes only apply to new deployments.
5. **Check** `https://<your-project>.vercel.app/api/health` returns `{"status":"ok","database":"connected"}`, then sign up and create a link: it starts with your public address. If something is wrong, *Deployments → (latest) → Functions/Logs* shows the server's message; in production it refuses a missing or local `PUBLIC_BASE_URL` and says which setting to fix.
6. **Test from other devices**: open a short link on your phone using mobile data and in a private window (it should redirect and its click count should rise), scan a downloaded QR code, and run `cd server && npm run smoke -- https://<your-project>.vercel.app/api` (leaves two `smoke-...@example.com` test accounts).

Serverless notes: the first request after a quiet period starts a new instance (a short delay while it connects to MongoDB). Rate-limit counters and the repeat-click cache live in memory per instance, so on serverless they are approximate (several instances may run at once). For lower latency, choose a Vercel function region close to your Atlas cluster's region (*Settings → Functions*).

### Option B: one Render service

`render.yaml` deploys the same app as one always-on Node service (Express also serves the website via `CLIENT_DIST_DIR=client/dist`): Render → **New → Blueprint** → choose the repository, then enter `MONGO_URI` and `PUBLIC_BASE_URL` (`https://<service>.onrender.com`). Free Render services sleep after inactivity.

### Option C: website and API on different hosts

If the website is hosted separately (e.g. Netlify) from the API: set `CLIENT_ORIGIN` on the API to the website's address, and either proxy `/api` through the website host (`netlify.toml`, replace `YOUR-API-HOST`; recommended, cookies stay first-party) or call the API directly with `VITE_API_BASE_URL=https://<your-api>/api` on the website and `COOKIE_SAME_SITE=none` on the API (browsers that block third-party cookies, such as Safari, will not keep users logged in). Short links still live on the API's address, so `PUBLIC_BASE_URL` is the API's address.

### Where each setting goes (Vercel)

| Setting | Where | Value |
|---|---|---|
| `MONGO_URI` | Vercel → Project → Settings → Environment Variables | Atlas connection string (secret) |
| `PUBLIC_BASE_URL` | same | `https://<your-project>.vercel.app` (or your own domain) |
| `CLIENT_ORIGIN` | same | the same address as `PUBLIC_BASE_URL` |
| `JWT_SECRET` | same | 32+ random characters (secret) |
| `NODE_ENV`, `TRUST_PROXY` | same | `production`, `1` |
| `VITE_API_BASE_URL` | not needed on Vercel | the app calls `/api` on its own address |
| Network access | MongoDB Atlas → Network Access | `0.0.0.0/0` |
| Build, output, routing | `vercel.json` (in the repository) | nothing to set by hand |

Templates with placeholders only: `server/.env.example` (development), `server/.env.production.example`, `client/.env.example`, `client/.env.production.example`. Never commit a real `.env`, the Atlas password, or the JWT secret.

Hosting notes:
- Vercel: a new serverless instance needs a moment to connect to MongoDB (cold start); Render's free plan sleeps after inactivity, and the first request after a pause can take tens of seconds.
- `TRUST_PROXY` must match the number of proxies in front of the API (Vercel: 1, Render: 1), otherwise per-IP rate limits see the proxy's address. With the Netlify `/api` proxy (option C), API rate limits count per Netlify edge address rather than per visitor.
- Rate-limit counters and the repeat-click cache are kept in memory, so they reset on restart and are per instance (on Vercel several instances can run at once, so the limits are approximate). Data in MongoDB is unaffected (verified: links and clicks survive an API restart).

### Use your own short domain

Professional shorteners give links like `https://l1nq.com/nbtbjef`: HTTPS, a short public domain, and a random code. Shortify already builds links exactly like that (`<PUBLIC_BASE_URL>/<7 random letters and digits>`); what makes them work for everyone is **a domain that points at your API**.

**You can only use a domain you control.** A short link works because the domain's DNS sends visitors to *your* server. Someone else's domain (for example `l1nq.com`, which belongs to the encurtador.dev service and sends every visit to their servers) cannot be used: only its owner can point it anywhere. Setting `PUBLIC_BASE_URL` to a domain you do not control would produce links that open the other service, not yours.

Two ways to get a working public domain:

| Option | Links look like | Cost |
|---|---|---|
| Vercel's free subdomain | `https://<your-project>.vercel.app/aB7xK9p` | free |
| Your own short domain | `https://yourdomain.com/aB7xK9p` | the domain's yearly price (short `.link`, `.xyz`, `.click` domains are often cheap; compare registrars such as Cloudflare, Namecheap, or Porkbun). Adding it to the Vercel project costs nothing extra. |

On Vercel the website, the API, and the short links share one address, so your own domain serves all three: `https://yourdomain.com` is the app, `https://yourdomain.com/<code>` the short links.

Steps (after the [Vercel deployment](#option-a-recommended-vercel--mongodb-atlas) works on the `.vercel.app` address):

1. **Buy the domain** at any registrar.
2. **Vercel → your project → Settings → Domains → Add** `yourdomain.com`. Vercel shows the DNS records to create at your registrar (usually an `A` record for the root domain and a `CNAME` for `www`); add exactly what it shows and remove conflicting old records for these names. Vercel issues the HTTPS certificate automatically once DNS is correct (changes can take up to a day to spread).
3. **Settings → Environment Variables**: `PUBLIC_BASE_URL=https://yourdomain.com` and `CLIENT_ORIGIN=https://yourdomain.com` (add the `.vercel.app` address too, comma-separated, if people still open the app there). **Redeploy.** Existing links switch to the new domain automatically (short URLs are built from the setting on every request), and saved QR codes are updated on the next start. QR codes that were already printed keep the old address, which keeps working as long as the `.vercel.app` domain stays on the project.
4. **Check**: `cd server && npm run smoke -- https://yourdomain.com/api`.

With Render instead (option B): Render → your service → *Settings → Custom Domains → Add*, create the DNS records Render shows, then set the same two variables on the service.

In production the API refuses to start if `PUBLIC_BASE_URL` is not HTTPS, has a path, or is `localhost`/an IP address, so a broken short-link domain is caught at deploy time instead of producing dead links.

Using another company's shortening API instead (Bitly, TinyURL, encurtador.dev, ...) would give their domain, but every click would go through their servers: Shortify's click tracking and analytics would no longer see those visits, API keys and paid credits or monthly limits apply, and the key would have to stay on the server. Your own domain keeps everything in Shortify.

## Known limitations

- Rate limits are per IP address and in memory (not shared between several API instances); there is no per-account lockout after failed logins.
- Sign-up reveals whether an email already has an account (`409`), a common trade-off for a clearer message (rate limited to 10 sign-ups per hour per IP).
- No email verification, password reset, or account deletion.
- Aliases are case-sensitive (`Promo` and `promo` are different links), and aliases of deleted links can never be reused, even by their owner.
- QR codes that were already printed stop working if their link's alias is changed (the edit dialog warns about this).
- Unique visitors are counted once per day per device/browser (daily rotating hash), so the same person on two days or two devices counts twice.
- Deleting is permanent (no trash or undo); there are no bulk actions.
- Renaming an alias reserves the old one a split second after the rename (a MongoDB transaction would close that gap but needs a replica set).

## Future improvements

- Email verification and password reset; account deletion that also removes the account's links and clicks.
- Shared rate-limit storage (e.g. Redis) for multiple API instances, plus per-account login throttling.
- A dedicated short domain, link-preview (Open Graph) handling, and optional password-protected links.
- Bulk actions (export CSV, switch off or delete several links), tags or folders, and a UTM builder.
- QR codes with logos and SVG download; scan tracking per QR code.
- Country-level analytics from an IP-to-country lookup done at click time (storing only the country).
- Browser end-to-end tests (Playwright) running in CI alongside the API smoke test.

## Tech stack

- Frontend: React 19, React Router 7, Vite 8, Tailwind CSS v4, Lucide icons, Inter (self-hosted), qrcode
- Backend: Node.js, Express 5, Mongoose 9, Helmet, express-rate-limit, CORS
- Testing: Node's built-in test runner, supertest, jsQR (QR decoding), ESLint, GitHub Actions
