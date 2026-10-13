import { useNavigate } from 'react-router';
import useAuth from './useAuth';
import { ROUTES } from '../lib/routes';
import { toast } from '../lib/toast';

// Logs out and returns to the home page. Used by the desktop and mobile menus.
export default function useLogout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return async function handleLogout() {
    try {
      await logout();
      toast.success('You have been logged out.');
      // On a protected page, RequireAuth has already sent us home; elsewhere, go home now.
      navigate(ROUTES.home, { replace: true });
    } catch (error) {
      toast.error(error.message);
    }
  };
}
