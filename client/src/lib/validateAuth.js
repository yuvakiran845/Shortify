// Instant form feedback that mirrors the server rules (server/src/utils/authValidation.js).
// The server still checks everything; this only saves a round trip.

export const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_BYTES = 72;
const NAME_MAX_LENGTH = 80;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const byteLength = (text) => new TextEncoder().encode(text).length;

function emailError(email) {
  const value = email.trim();
  if (!value) return 'Enter your email address.';
  if (value.length > 254 || !EMAIL_PATTERN.test(value)) return 'Enter a valid email address, like name@example.com.';
  return null;
}

// Each function returns { fieldName: message } for every invalid field ({} = valid).
export function validateLoginForm({ email, password }) {
  const errors = {};
  const emailProblem = emailError(email);
  if (emailProblem) errors.email = emailProblem;
  if (!password) errors.password = 'Enter your password.';
  return errors;
}

export function validateSignupForm({ name, email, password }) {
  const errors = {};

  const trimmedName = name.trim();
  if (!trimmedName) errors.name = 'Enter your name.';
  else if (trimmedName.length > NAME_MAX_LENGTH) errors.name = `Name can be at most ${NAME_MAX_LENGTH} characters.`;

  const emailProblem = emailError(email);
  if (emailProblem) errors.email = emailProblem;

  if (password.length < PASSWORD_MIN_LENGTH) errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  else if (byteLength(password) > PASSWORD_MAX_BYTES) errors.password = 'Password is too long (maximum 72 bytes).';
  else if (!password.trim()) errors.password = 'Password cannot be only spaces.';

  return errors;
}

// Only allow redirects to our own pages after login ("/links"), never to
// another site ("//evil.com", "/\evil.com", or "https://evil.com").
export function safeRedirectPath(path, fallback) {
  const isInternal = typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\');
  return isInternal ? path : fallback;
}
