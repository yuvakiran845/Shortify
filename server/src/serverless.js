import { config } from './config/env.js';
import { connectDatabase } from './config/db.js';
import { createApp } from './app.js';
import { syncLinkQrCodes } from './services/qrService.js';

/**
 * Entry point for serverless hosting (Vercel, see api/index.js and vercel.json).
 *
 * On a normal server, server.js connects to MongoDB once and then listens.
 * A serverless function has no "start": the platform calls this handler for
 * each request, and keeps the instance warm between requests for a while. So:
 * - the Express app is built once per instance (at import time);
 * - the MongoDB connection is opened on the first request and then reused by
 *   every later request on the same instance (a new connection per request
 *   would be slow and quickly hit Atlas's connection limit);
 * - if connecting fails, the next request tries again, and this one gets a
 *   clear 503 instead of hanging.
 */
export function createServerlessHandler({ app = createApp(), connect = defaultConnect } = {}) {
  let ready = null;

  return async function handler(req, res) {
    ready ??= connect().catch((error) => {
      ready = null; // allow a retry on the next request
      throw error;
    });

    try {
      await ready;
    } catch (error) {
      console.error(`Could not connect to MongoDB: ${error.message}`);
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify({ message: 'Shortify is temporarily unavailable. Please try again in a moment.' }));
      return;
    }

    app(req, res);
  };
}

async function defaultConnect() {
  await connectDatabase(config.mongoUri);
  // Same start-up housekeeping as server.js: if PUBLIC_BASE_URL changed,
  // bring saved QR codes up to date. A failure here never blocks requests.
  try {
    await syncLinkQrCodes();
  } catch (error) {
    console.error('Could not update saved QR codes:', error.message);
  }
}

export default createServerlessHandler();
