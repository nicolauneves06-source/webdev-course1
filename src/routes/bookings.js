import { Router } from 'express';
import { getSessionToken } from '../http/session-cookie.js';

export function createBookingsRouter(authService, bookingsService) {
  const router = Router();

  router.get('/', (request, response) => {
    const user = authService.authenticateSession(getSessionToken(request));
    if (!user) {
      return response.status(401).json({ message: 'Sign in to view your bookings.' });
    }

    return response.json({ bookings: bookingsService.listForUser(user.id) });
  });

  return router;
}