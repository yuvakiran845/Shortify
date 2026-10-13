import { Router } from 'express';
import { login, logout, me, register } from '../controllers/authController.js';
import { loginRateLimit, registerRateLimit } from '../middleware/rateLimit.js';

export function authRoutes({ loginLimitPer15Minutes, registerLimitPerHour }) {
  const router = Router();
  router.post('/register', registerRateLimit(registerLimitPerHour), register);
  router.post('/login', loginRateLimit(loginLimitPer15Minutes), login);
  router.post('/logout', logout);
  router.get('/me', me);
  return router;
}
