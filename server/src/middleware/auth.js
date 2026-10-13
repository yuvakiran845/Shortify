import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import { baseCookieOptions, clearCookie } from '../utils/cookies.js';
import { HttpError } from '../utils/HttpError.js';

export const SESSION_COOKIE = 'shortify_session';

/**
 * Starts a login session: a signed JWT stored in an HttpOnly cookie.
 * Payload: sub = user id, sv = the user's sessionVersion (see User model).
 * The token is signed with HS256 and JWT_SECRET, so it cannot be edited
 * without the signature check failing.
 */
export function startSession(res, user) {
  const token = jwt.sign({ sub: String(user._id), sv: user.sessionVersion }, config.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: `${config.sessionDays}d`,
  });
  res.cookie(SESSION_COOKIE, token, { ...baseCookieOptions, maxAge: config.sessionDays * 24 * 60 * 60 * 1000 });
}

export function endSession(res) {
  clearCookie(res, SESSION_COOKIE);
}

/**
 * Runs on every API request. If a valid session cookie is present, loads the
 * user into req.user; otherwise req.user stays null (the request is anonymous).
 * Bad, expired, or revoked tokens are treated as "not logged in" and the cookie is removed.
 */
export async function authenticate(req, res, next) {
  req.user = null;
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return next();

  let payload;
  try {
    // Pinning the algorithm blocks "alg: none" and algorithm-confusion attacks.
    payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
  } catch {
    endSession(res);
    return next();
  }

  const user = mongoose.isValidObjectId(payload.sub)
    ? await User.findById(payload.sub).select('name email sessionVersion createdAt').lean()
    : null;

  // Deleted user, or a token issued before the last logout: no longer valid.
  if (!user || user.sessionVersion !== payload.sv) {
    endSession(res);
    return next();
  }

  req.user = user;
  return next();
}

// Use on routes that only logged-in users may call.
export function requireAuth(req, res, next) {
  if (!req.user) return next(new HttpError(401, 'Please log in to continue.'));
  return next();
}
