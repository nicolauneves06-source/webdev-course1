import express from 'express';
import { fileURLToPath } from 'node:url';
import { createAuthRepository } from './data/auth-repository.js';
import { createAuthService } from './services/auth-service.js';
import { createAuthRouter } from './routes/auth.js';
import { createBookingRepository } from './data/booking-repository.js';
import { createBookingsService } from './services/bookings-service.js';
import { createBookingsRouter } from './routes/bookings.js';
import { getSessionToken } from './http/session-cookie.js';

const loginPagePath = fileURLToPath(new URL('../public/login.html', import.meta.url));
const bookingsPagePath = fileURLToPath(new URL('./views/bookings.html', import.meta.url));
const publicDirectory = fileURLToPath(new URL('../public/', import.meta.url));

export function createApp(database) {
  const app = express();
  const authService = createAuthService(createAuthRepository(database));
  const bookingsService = createBookingsService(createBookingRepository(database));

  app.disable('x-powered-by');
  app.use(express.json({ limit: '10kb' }));
  app.use(express.static(publicDirectory, { index: false }));
  app.get('/login', (request, response) => response.sendFile(loginPagePath));
  app.get('/bookings', (request, response) => {
    if (!authService.authenticateSession(getSessionToken(request))) {
      return response.redirect('/login');
    }

    return response.sendFile(bookingsPagePath);
  });
  app.use('/api/auth', createAuthRouter(authService));
  app.use('/api/bookings', createBookingsRouter(authService, bookingsService));
  app.use((error, request, response, next) => {
    if (response.headersSent) {
      return next(error);
    }

    const status = error.status === 400 ? 400 : 500;
    return response.status(status).json({
      message: status === 400 ? 'Request body must be valid JSON.' : 'Sign-in is temporarily unavailable.',
    });
  });

  return app;
}