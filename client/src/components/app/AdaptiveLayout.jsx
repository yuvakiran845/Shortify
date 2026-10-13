import AppLayout from './AppLayout';
import PublicLayout from '../layout/PublicLayout';
import PageLoader from '../ui/PageLoader';
import useAuth from '../../hooks/useAuth';

/**
 * For pages anyone can use (/shorten, /qr): signed-in users see them inside
 * the app (with the sidebar), visitors see them on the public website.
 * While the session check runs we show a short loader instead of flashing
 * one layout and then swapping to the other.
 */
export default function AdaptiveLayout() {
  const { status } = useAuth();
  if (status === 'loading') return <PageLoader label="Loading…" />;
  return status === 'authenticated' ? <AppLayout /> : <PublicLayout />;
}
