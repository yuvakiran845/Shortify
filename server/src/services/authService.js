import bcrypt from 'bcryptjs';
import { config } from '../config/env.js';
import { Click } from '../models/Click.js';
import { Link } from '../models/Link.js';
import { User } from '../models/User.js';
import { HttpError } from '../utils/HttpError.js';

const INVALID_CREDENTIALS = 'Incorrect email or password.';

// Shape returned to clients. Listing fields explicitly guarantees the
// password hash and session version can never be sent by accident.
export const toUserResponse = (user) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  createdAt: user.createdAt,
});

export async function createUser({ name, email, password }) {
  // bcrypt adds a random salt automatically and is deliberately slow,
  // which makes guessing passwords from a leaked hash very expensive.
  const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
  try {
    return await User.create({ name, email, passwordHash });
  } catch (error) {
    // The unique index on email also protects against two sign-ups racing each other.
    if (error?.code === 11000 && error.keyPattern?.email) {
      throw new HttpError(409, 'An account with this email already exists. Try logging in instead.', { field: 'email' });
    }
    throw error;
  }
}

// A hash of a random value, compared against when the email is unknown, so
// "no such user" takes as long as "wrong password". Otherwise response timing
// would reveal which emails have accounts.
let dummyHashPromise;
const getDummyHash = () => {
  dummyHashPromise ??= bcrypt.hash('timing-equalizer-not-a-real-password', config.bcryptRounds);
  return dummyHashPromise;
};

export async function verifyCredentials(email, password) {
  const user = await User.findOne({ email }).select('+passwordHash');
  const hashToCheck = user?.passwordHash ?? (await getDummyHash());
  const passwordMatches = await bcrypt.compare(password, hashToCheck);

  // Same message for both cases, so the response never says which part was wrong.
  if (!user || !passwordMatches) throw new HttpError(401, INVALID_CREDENTIALS);
  return user;
}

// Logout: invalidates every session token issued so far for this user.
export function revokeSessions(userId) {
  return User.updateOne({ _id: userId }, { $inc: { sessionVersion: 1 } });
}

/**
 * Moves links this browser created while logged out into the user's account.
 * Returns how many links were moved.
 */
export async function claimGuestLinks(guestKeyHash, userId) {
  if (!guestKeyHash) return 0;
  const linkIds = (await Link.find({ guestKeyHash, owner: null }).select('_id').lean()).map((link) => link._id);
  if (linkIds.length === 0) return 0;

  const result = await Link.updateMany(
    { _id: { $in: linkIds }, owner: null },
    { $set: { owner: userId, guestKeyHash: null } },
  );
  // Clicks those links already received now belong to the account too,
  // so they show up in the user's analytics.
  await Click.updateMany({ link: { $in: linkIds } }, { $set: { owner: userId } });
  return result.modifiedCount;
}
