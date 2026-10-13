import { useEffect, useMemo, useState } from 'react';
import { AuthContext } from './authContext';
import { setUnauthorizedHandler } from '../lib/api';
import { fetchCurrentUser, loginRequest, logoutRequest, registerRequest } from '../lib/authApi';

const LOGGED_OUT = { status: 'anonymous', user: null };

/**
 * Knows who is logged in and shares it with the whole app.
 *
 * The session itself lives in an HttpOnly cookie that JavaScript cannot read,
 * so on every page load we ask the server "who am I?" (GET /api/auth/me).
 * That is how a login survives a page refresh.
 */
export default function AuthProvider({ children }) {
  const [session, setSession] = useState({ status: 'loading', user: null });
  const [checkCount, setCheckCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchCurrentUser({ signal: controller.signal })
      .then((user) => setSession(user ? { status: 'authenticated', user } : LOGGED_OUT))
      .catch((error) => {
        // Server unreachable: we cannot tell whether the user is logged in.
        if (error.name !== 'AbortError') setSession({ status: 'error', user: null });
      });
    return () => controller.abort();
  }, [checkCount]);

  // Any API call answered with 401 means the session expired or was revoked.
  useEffect(() => {
    setUnauthorizedHandler(() => setSession(LOGGED_OUT));
    return () => setUnauthorizedHandler(null);
  }, []);

  const value = useMemo(
    () => ({
      ...session,
      retry() {
        setSession({ status: 'loading', user: null });
        setCheckCount((count) => count + 1);
      },
      async login(email, password) {
        const data = await loginRequest(email, password);
        setSession({ status: 'authenticated', user: data.user });
        return data;
      },
      async register(name, email, password) {
        const data = await registerRequest(name, email, password);
        setSession({ status: 'authenticated', user: data.user });
        return data;
      },
      async logout() {
        await logoutRequest();
        // `loggedOut` tells protected pages this was on purpose, so they send the
        // user home instead of to the login page (see RequireAuth).
        setSession({ ...LOGGED_OUT, loggedOut: true });
      },
    }),
    [session],
  );

  // React 19: a context object can be rendered directly as its provider.
  return <AuthContext value={value}>{children}</AuthContext>;
}
