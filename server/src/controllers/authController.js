import { endSession, startSession } from '../middleware/auth.js';
import { clearGuest } from '../middleware/guest.js';
import { claimGuestLinks, createUser, revokeSessions, toUserResponse, verifyCredentials } from '../services/authService.js';
import { validateLogin, validateRegistration } from '../utils/authValidation.js';

// After sign-up or login: move this browser's guest links into the account,
// start the session, and drop the guest cookie (it is no longer needed).
async function finishLogin(req, res, user, status) {
  const claimedLinks = await claimGuestLinks(req.guestKeyHash, user._id);
  if (req.guestKeyHash) clearGuest(res);
  startSession(res, user);
  res.status(status).json({ user: toUserResponse(user), claimedLinks });
}

// POST /api/auth/register  { name, email, password }
export async function register(req, res) {
  const user = await createUser(validateRegistration(req.body));
  await finishLogin(req, res, user, 201);
}

// POST /api/auth/login  { email, password }
export async function login(req, res) {
  const { email, password } = validateLogin(req.body);
  const user = await verifyCredentials(email, password);
  await finishLogin(req, res, user, 200);
}

// POST /api/auth/logout
export async function logout(req, res) {
  if (req.user) await revokeSessions(req.user._id);
  endSession(res);
  res.status(204).end();
}

// GET /api/auth/me -> { user } or { user: null }.
// Logged-out visitors get 200 with null (not 401), because "not logged in"
// is a normal answer to "who am I?" and should not show as an error.
export function me(req, res) {
  res.set('Cache-Control', 'no-store').json({ user: req.user ? toUserResponse(req.user) : null });
}
