import { Router } from 'express';
import {
  createLink,
  deleteMyLink,
  getMyLink,
  listMyLinks,
  updateMyLink,
} from '../controllers/linkController.js';
import { requireAuth } from '../middleware/auth.js';
import { createLinkRateLimit } from '../middleware/rateLimit.js';
import { ensureGuest } from '../middleware/guest.js';

// A function (not a shared router) so every app instance gets its own
// rate-limit counter. Tests rely on this to start from a clean state.
export function linkRoutes({ createLimitPerMinute }) {
  const router = Router();
  // Viewing and managing links needs an account; every query is limited to the caller's links.
  router.get('/', requireAuth, listMyLinks);
  router.get('/:id', requireAuth, getMyLink);
  router.patch('/:id', requireAuth, updateMyLink);
  router.delete('/:id', requireAuth, deleteMyLink);
  // Anyone may create a link. Logged-out visitors get a guest identity, and
  // their links move into their account when they sign up or log in.
  // Rate limit first, so a blocked request does not receive a guest cookie.
  router.post('/', createLinkRateLimit(createLimitPerMinute), ensureGuest, createLink);
  return router;
}
