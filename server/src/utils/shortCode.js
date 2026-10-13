import { randomInt } from 'node:crypto';

// 62 URL-safe characters. 7 characters gives 62^7 ≈ 3.5 trillion combinations.
const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
export const SHORT_CODE_LENGTH = 7;

// What a code in a short URL may look like. Hyphens/underscores are allowed so
// custom aliases (Level 9) fit too. Anything else (e.g. "favicon.ico") is
// rejected before touching the database.
export const SHORT_CODE_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

// crypto.randomInt is cryptographically secure, so codes cannot be predicted
// (Math.random could be guessed, letting someone enumerate other people's links).
export function generateShortCode(length = SHORT_CODE_LENGTH) {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}
