import { Router } from 'express';

export function createAuthRouter(authService) {
  const router = Router();

  router.post('/login', async (request, response, next) => {
    const { email, password } = request.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      return response.status(400).json({ message: 'Enter your email and password.' });
    }

    try {
      const result = await authService.signIn(email, password);
      if (!result) {
        return response.status(401).json({ message: 'Email or password is incorrect.' });
      }

      const maxAge = Math.floor((result.expiresAt.getTime() - Date.now()) / 1000);
      const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
      response.setHeader(
        'Set-Cookie',
        `session=${result.token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`
      );
      response.setHeader('Cache-Control', 'no-store');
      return response.status(200).json({ user: result.user });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}