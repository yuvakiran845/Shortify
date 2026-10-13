import { HttpError } from './HttpError.js';

export const NAME_MAX_LENGTH = 80;
export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MIN_LENGTH = 8;
// bcrypt only uses the first 72 bytes of a password; longer ones would be
// silently truncated, so we reject them instead.
export const PASSWORD_MAX_BYTES = 72;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const invalid = (field, message) => new HttpError(400, message, { field });

function readString(body, field, label) {
  const value = body?.[field];
  if (value === undefined || value === null || value === '') throw invalid(field, `${label} is required.`);
  if (typeof value !== 'string') throw invalid(field, `${label} must be text.`);
  return value;
}

function validateEmail(body) {
  const email = readString(body, 'email', 'Email').trim().toLowerCase();
  if (email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email)) {
    throw invalid('email', 'Enter a valid email address, like name@example.com.');
  }
  return email;
}

// Sign-up rules. Passwords follow current NIST guidance: a minimum length,
// no forced symbols/digits, and no silent truncation.
export function validateRegistration(body) {
  const name = readString(body, 'name', 'Name').trim();
  if (!name) throw invalid('name', 'Name is required.');
  if (name.length > NAME_MAX_LENGTH) throw invalid('name', `Name can be at most ${NAME_MAX_LENGTH} characters.`);

  const email = validateEmail(body);

  const password = readString(body, 'password', 'Password');
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw invalid('password', `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  }
  if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) {
    throw invalid('password', 'Password is too long (maximum 72 bytes).');
  }
  if (!password.trim()) throw invalid('password', 'Password cannot be only spaces.');

  return { name, email, password };
}

// Login only checks that something was typed; the credentials check decides the rest.
export function validateLogin(body) {
  const email = validateEmail(body);
  const password = readString(body, 'password', 'Password');
  if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) {
    throw new HttpError(401, 'Incorrect email or password.');
  }
  return { email, password };
}
