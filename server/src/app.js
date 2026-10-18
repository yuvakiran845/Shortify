import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { config } from './config/env.js';
import { authenticate } from './middleware/auth.js';
import { issueCsrfToken, requireCsrfToken } from './middleware/csrf.js';
import { readGuest } from './middleware/guest.js';
import { apiRateLimit } from './middleware/rateLimit.js';
import { authRoutes } from './routes/authRoutes.js';
import { linkRoutes } from './routes/linkRoutes.js';
import { qrRoutes } from './routes/qrRoutes.js';
import { dashboardRoutes } from './routes/dashboardRoutes.js';
import { analyticsRoutes } from './routes/analyticsRoutes.js';
import { redirectRoutes } from './routes/redirectRoutes.js';
import { websiteRoutes } from './routes/websiteRoutes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

/**
 * Builds the Express app without starting a server or connecting to MongoDB.
 * server.js calls this for the real server; tests call it to send requests
 * with supertest. Options let tests override settings such as rate limits.
 */
export function createApp({
  apiLimitPerMinute = config.apiLimitPerMinute,
  createLinkLimitPerMinute = config.createLinkLimitPerMinute,
  redirectLimitPerMinute = config.redirectLimitPerMinute,
  clickDedupeWindowMs = config.clickDedupeWindowMs,
  loginLimitPer15Minutes = config.loginLimitPer15Minutes,
  registerLimitPerHour = config.registerLimitPerHour,
  clientDistDir = config.clientDistDir,
} = {}) {
  const app = express();

  // Behind a hosting proxy, use the real visitor IP from X-Forwarded-For (needed for rate limiting).
  app.set('trust proxy', config.trustProxy);

  // Secure HTTP headers. "upgrade-insecure-requests" asks browsers to load
  // everything over HTTPS, so it is only sent in production (where HTTPS exists).
  app.use(helmet({ contentSecurityPolicy: { directives: { upgradeInsecureRequests: config.isProduction ? [] : null } } }));
  app.use(express.json({ limit: '10kb' }));

  // ----- JSON API -----
  const api = express.Router();
  // Only our frontend origin(s) may call the API from a browser, with cookies.
  api.use(
    cors({
      origin: config.clientOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    }),
  );
  // After CORS, so the browser can read the 429 message.
  api.use(apiRateLimit(apiLimitPerMinute));
  api.use(cookieParser());
  api.get('/csrf-token', issueCsrfToken);
  api.use(requireCsrfToken); // every POST/PUT/PATCH/DELETE below needs the CSRF header
  api.use(authenticate); // sets req.user from the session cookie (or null)
  api.use(readGuest); // sets req.guestKeyHash from the guest cookie (or null)

  api.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    });
  });
  // Public settings the frontend needs, e.g. to recognize Shortify links.
  api.get('/config', (req, res) => {
    res.json({ shortLinkBaseUrl: config.publicBaseUrl });
  });
  api.use('/auth', authRoutes({ loginLimitPer15Minutes, registerLimitPerHour }));
  api.use('/links', linkRoutes({ createLimitPerMinute: createLinkLimitPerMinute }));
  api.use('/qr-codes', qrRoutes());
  api.use('/dashboard', dashboardRoutes());
  api.use('/analytics', analyticsRoutes());
  api.use(notFound); // unknown /api/... paths get a JSON 404, never the redirect handler
  app.use('/api', api);

  // ----- The React website, when this server also hosts it (CLIENT_DIST_DIR) -----
  if (clientDistDir) app.use(websiteRoutes(clientDistDir));

  // ----- Public short links: GET /:code -----
  app.use(redirectRoutes({ redirectLimitPerMinute, clickDedupeWindowMs }));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
