import { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import Container from '../layout/Container';
import ErrorState from '../ui/ErrorState';
import PageLoader from '../ui/PageLoader';
import useAuth from '../../hooks/useAuth';
import { ROUTES } from '../../lib/routes';

/**
 * Wraps routes that need a logged-in user (see App.jsx).
 * Logged-out visitors are sent to /login, remembering where they wanted to go
 * so the login page can bring them back afterwards.
 *
 * This only controls what the browser shows. The real protection is on the
 * server: every private API route checks the session itself.
 */
export default function RequireAuth() {
  const { status, loggedOut, retry } = useAuth();
  const location = useLocation();

  // Remember whether this page was showing a logged-in user. (Updating state
  // during render like this is React's recommended way to track a change.)
  const [hadUser, setHadUser] = useState(false);
  if (status === 'authenticated' && !hadUser) setHadUser(true);

  if (status === 'loading') return <PageLoader label="Checking your session…" />;

  if (status === 'error') {
    return (
      <Container size="narrow" className="py-16">
        <ErrorState
          title="Could not check your session"
          message="We could not reach the Shortify server. Check your connection and try again."
          onRetry={retry}
        />
      </Container>
    );
  }

  if (status === 'anonymous') {
    // The user was on this page and clicked "Log out": go home.
    if (loggedOut && hadUser) return <Navigate to={ROUTES.home} replace />;
    // Never logged in, or the session expired: log in, then come back here.
    return <Navigate to={ROUTES.login} replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  return <Outlet />;
}
