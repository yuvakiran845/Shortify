import { rateLimit } from 'express-rate-limit';
import { LINK_ERRORS, sendLinkError } from '../views/linkErrorPage.js';

const ONE_MINUTE = 60 * 1000;

// A generous limit for every API request from one IP address. Real users never
// reach it; it stops scripts from hammering expensive endpoints (analytics,
// edits) that have no stricter limit of their own.
export function apiRateLimit(limitPerMinute) {
  return rateLimit({
    windowMs: ONE_MINUTE,
    limit: limitPerMinute,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({ message: 'Too many requests. Please wait a minute and try again.' });
    },
  });
}

// Limits how many links one IP address can create per minute, so an
// anonymous script cannot flood the database.
export function createLinkRateLimit(limitPerMinute) {
  return rateLimit({
    windowMs: ONE_MINUTE,
    limit: limitPerMinute,
    standardHeaders: 'draft-8', // sends RateLimit-* headers so clients know when to retry
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({ message: 'Too many links created. Please wait a minute and try again.' });
    },
  });
}

// Slows down password guessing: only FAILED logins count toward the limit,
// so a person who logs in successfully is never locked out by it.
export function loginRateLimit(limitPer15Minutes) {
  return rateLimit({
    windowMs: 15 * ONE_MINUTE,
    limit: limitPer15Minutes,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({ message: 'Too many failed login attempts. Please wait 15 minutes and try again.' });
    },
  });
}

// Stops one IP address from mass-creating accounts.
export function registerRateLimit(limitPerHour) {
  return rateLimit({
    windowMs: 60 * ONE_MINUTE,
    limit: limitPerHour,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({ message: 'Too many accounts created from this network. Please try again later.' });
    },
  });
}

// Limits how many short links one IP can open per minute. Real visitors never
// get close; a script trying random codes to discover links gets blocked.
export function redirectRateLimit(limitPerMinute) {
  return rateLimit({
    windowMs: ONE_MINUTE,
    limit: limitPerMinute,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => sendLinkError(req, res, LINK_ERRORS.rateLimited),
  });
}
