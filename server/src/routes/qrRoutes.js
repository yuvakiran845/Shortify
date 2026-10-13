import { Router } from 'express';
import { createQrCode, listMyQrCodes, removeQrCode } from '../controllers/qrController.js';
import { requireAuth } from '../middleware/auth.js';

// QR code history belongs to an account, so every route needs a logged-in user.
// (Anyone can still generate and download QR codes in the browser without one.)
export function qrRoutes() {
  const router = Router();
  router.use(requireAuth);
  router.get('/', listMyQrCodes);
  router.post('/', createQrCode);
  router.delete('/:id', removeQrCode);
  return router;
}
