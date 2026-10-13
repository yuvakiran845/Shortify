import { createContext } from 'react';

// Holds { status, user, loggedOut, login, register, logout, retry }. Provided by <AuthProvider>.
// status: 'loading' | 'authenticated' | 'anonymous' | 'error'
// loggedOut: true right after the user clicked "Log out" (vs. a session that expired).
export const AuthContext = createContext(null);
