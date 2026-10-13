import { useContext } from 'react';
import { AuthContext } from '../context/authContext';

// const { status, user, login, register, logout } = useAuth();
export default function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth must be used inside <AuthProvider>.');
  return auth;
}
