import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { safeRedirectPath, validateLoginForm, validateSignupForm } from '../src/lib/validateAuth.js';
import { welcomeMessage } from '../src/lib/authMessages.js';

describe('validateLoginForm', () => {
  test('valid input has no errors', () => {
    assert.deepEqual(validateLoginForm({ email: 'ana@example.com', password: 'x' }), {});
  });

  test('reports every missing or invalid field', () => {
    assert.deepEqual(Object.keys(validateLoginForm({ email: '', password: '' })), ['email', 'password']);
    assert.match(validateLoginForm({ email: 'nope', password: 'x' }).email, /valid email/);
  });
});

describe('validateSignupForm', () => {
  const valid = { name: 'Ana Lima', email: 'ana@example.com', password: 'long enough' };

  test('valid input has no errors', () => {
    assert.deepEqual(validateSignupForm(valid), {});
  });

  const cases = [
    [{ name: '   ' }, 'name', /Enter your name/],
    [{ name: 'x'.repeat(81) }, 'name', /at most 80/],
    [{ email: 'a@b' }, 'email', /valid email/],
    [{ password: 'short' }, 'password', /at least 8/],
    [{ password: 'é'.repeat(37) }, 'password', /too long/],
    [{ password: '          ' }, 'password', /only spaces/],
  ];
  for (const [change, field, message] of cases) {
    test(`flags ${field}: ${JSON.stringify(Object.values(change)[0]).slice(0, 20)}`, () => {
      const errors = validateSignupForm({ ...valid, ...change });
      assert.deepEqual(Object.keys(errors), [field]);
      assert.match(errors[field], message);
    });
  }
});

describe('safeRedirectPath', () => {
  test('keeps internal paths', () => {
    assert.equal(safeRedirectPath('/links?page=2', '/'), '/links?page=2');
  });

  test('refuses anything that could leave the site', () => {
    for (const path of ['//evil.com', '/\\evil.com', 'https://evil.com', 'javascript:alert(1)', undefined, 42]) {
      assert.equal(safeRedirectPath(path, '/links'), '/links');
    }
  });
});

describe('welcomeMessage', () => {
  const user = { name: 'Ana Lima' };
  test('greets by first name', () => {
    assert.equal(welcomeMessage(user, 0), 'Welcome back, Ana!');
    assert.equal(welcomeMessage(user, 0, { isNewAccount: true }), 'Welcome to Shortify, Ana!');
  });
  test('mentions moved guest links with correct grammar', () => {
    assert.match(welcomeMessage(user, 1), /1 link you created on this browser was added/);
    assert.match(welcomeMessage(user, 3), /3 links you created on this browser were added/);
  });
});
