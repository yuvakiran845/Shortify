import request from 'supertest';

/**
 * A test "browser": keeps cookies between requests (like a real browser) and
 * sends the CSRF header on state-changing requests (like the real frontend).
 */
export async function newClient(app) {
  const agent = request.agent(app);
  const { body } = await agent.get('/api/csrf-token').expect(200);
  const csrfToken = body.csrfToken;
  const withCsrf = (req) => req.set('X-CSRF-Token', csrfToken);

  return {
    agent,
    csrfToken,
    get: (path) => agent.get(path),
    post: (path, data = {}) => withCsrf(agent.post(path)).send(data),
    put: (path, data = {}) => withCsrf(agent.put(path)).send(data),
    delete: (path) => withCsrf(agent.delete(path)),
  };
}

let userCounter = 0;

// Creates an account through the real API and returns a logged-in client.
export async function newUser(app, overrides = {}) {
  // Take the number before any await, so users created in parallel never share an email.
  userCounter += 1;
  const id = userCounter;
  const client = await newClient(app);
  const credentials = {
    name: `Test User ${id}`,
    email: `user${id}@example.com`,
    password: 'correct horse battery staple',
    ...overrides,
  };
  const response = await client.post('/api/auth/register', credentials).expect(201);
  return {
    ...client,
    user: response.body.user,
    credentials,
    sessionToken: cookieValue(response, 'shortify_session'),
  };
}

// The value of a cookie from a response's Set-Cookie headers (or undefined).
export function cookieValue(response, name) {
  const header = (response.headers['set-cookie'] ?? []).find((cookie) => cookie.startsWith(`${name}=`));
  return header ? header.slice(name.length + 1).split(';')[0] : undefined;
}

export function cookieHeader(response, name) {
  return (response.headers['set-cookie'] ?? []).find((cookie) => cookie.startsWith(`${name}=`));
}
