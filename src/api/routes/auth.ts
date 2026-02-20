// @ts-nocheck
/**
 * Auth API Routes
 *
 * Authentication, authorization, and user profile management endpoints.
 *
 * Routes:
 * - POST   /api/auth/register        -- Create a new account
 * - POST   /api/auth/login            -- Authenticate with email/password
 * - POST   /api/auth/refresh          -- Refresh access token
 * - POST   /api/auth/change-password  -- Change password (authenticated)
 * - POST   /api/auth/forgot-password  -- Request password reset email
 * - POST   /api/auth/reset-password   -- Reset password with token
 * - GET    /api/auth/profile          -- Get current user's profile
 * - PUT    /api/auth/profile          -- Update current user's profile
 * - DELETE /api/auth/account          -- Delete account (authenticated)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { AuthService, AuthError } from '../../auth/auth-service';
import { authMiddleware, rateLimitMiddleware } from '../../auth/middleware';

// ---------------------------------------------------------------------------
// Router Factory
// ---------------------------------------------------------------------------

/**
 * Create the auth router with the given database pool and JWT secret.
 *
 * @param pool - PostgreSQL connection pool.
 * @param jwtSecret - Secret key for JWT signing and verification.
 * @returns Express Router with all auth endpoints mounted.
 */
export function createAuthRouter(pool: Pool, jwtSecret: string): Router {
  const router = Router();
  const authService = new AuthService(pool, jwtSecret);
  const requireAuth = authMiddleware(authService);
  const loginRateLimit = rateLimitMiddleware(10, 15 * 60 * 1000); // 10 attempts per 15 min
  const registerRateLimit = rateLimitMiddleware(5, 60 * 60 * 1000); // 5 per hour

  // -------------------------------------------------------------------------
  // POST /api/auth/register -- Create a new account
  // -------------------------------------------------------------------------

  router.post(
    '/register',
    registerRateLimit,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { email, password, displayName } = req.body;

        if (!email || !password || !displayName) {
          return res.status(400).json({
            error: {
              code: 'MISSING_FIELDS',
              message: 'Email, password, and displayName are required',
            },
          });
        }

        const result = await authService.register(email, password, displayName);

        res.status(201).json({
          data: {
            token: result.token,
            refreshToken: result.refreshToken,
            user: result.user,
          },
        });
      } catch (err) {
        if (err instanceof AuthError) {
          return res.status(err.statusCode).json({
            error: { code: err.code, message: err.message },
          });
        }
        next(err);
      }
    }
  );

  // -------------------------------------------------------------------------
  // POST /api/auth/login -- Authenticate with email/password
  // -------------------------------------------------------------------------

  router.post(
    '/login',
    loginRateLimit,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { email, password } = req.body;

        if (!email || !password) {
          return res.status(400).json({
            error: {
              code: 'MISSING_FIELDS',
              message: 'Email and password are required',
            },
          });
        }

        const result = await authService.login(email, password);

        res.json({
          data: {
            token: result.token,
            refreshToken: result.refreshToken,
            user: result.user,
          },
        });
      } catch (err) {
        if (err instanceof AuthError) {
          return res.status(err.statusCode).json({
            error: { code: err.code, message: err.message },
          });
        }
        next(err);
      }
    }
  );

  // -------------------------------------------------------------------------
  // POST /api/auth/refresh -- Refresh access token
  // -------------------------------------------------------------------------

  router.post(
    '/refresh',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
          return res.status(400).json({
            error: {
              code: 'MISSING_FIELDS',
              message: 'refreshToken is required',
            },
          });
        }

        const result = await authService.refreshToken(refreshToken);

        res.json({
          data: {
            token: result.token,
            refreshToken: result.refreshToken,
            user: result.user,
          },
        });
      } catch (err) {
        if (err instanceof AuthError) {
          return res.status(err.statusCode).json({
            error: { code: err.code, message: err.message },
          });
        }
        next(err);
      }
    }
  );

  // -------------------------------------------------------------------------
  // POST /api/auth/change-password -- Change password (authenticated)
  // -------------------------------------------------------------------------

  router.post(
    '/change-password',
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
          return res.status(400).json({
            error: {
              code: 'MISSING_FIELDS',
              message: 'oldPassword and newPassword are required',
            },
          });
        }

        await authService.changePassword(
          req.userId!,
          oldPassword,
          newPassword
        );

        res.json({
          data: { message: 'Password changed successfully' },
        });
      } catch (err) {
        if (err instanceof AuthError) {
          return res.status(err.statusCode).json({
            error: { code: err.code, message: err.message },
          });
        }
        next(err);
      }
    }
  );

  // -------------------------------------------------------------------------
  // POST /api/auth/forgot-password -- Request password reset email
  // -------------------------------------------------------------------------

  router.post(
    '/forgot-password',
    loginRateLimit,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { email } = req.body;

        if (!email) {
          return res.status(400).json({
            error: {
              code: 'MISSING_FIELDS',
              message: 'Email is required',
            },
          });
        }

        await authService.requestPasswordReset(email);

        // Always return success to prevent email enumeration
        res.json({
          data: {
            message:
              'If an account with that email exists, a password reset link has been sent.',
          },
        });
      } catch (err) {
        next(err);
      }
    }
  );

  // -------------------------------------------------------------------------
  // POST /api/auth/reset-password -- Reset password with token
  // -------------------------------------------------------------------------

  router.post(
    '/reset-password',
    loginRateLimit,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
          return res.status(400).json({
            error: {
              code: 'MISSING_FIELDS',
              message: 'token and newPassword are required',
            },
          });
        }

        await authService.resetPassword(token, newPassword);

        res.json({
          data: { message: 'Password has been reset successfully' },
        });
      } catch (err) {
        if (err instanceof AuthError) {
          return res.status(err.statusCode).json({
            error: { code: err.code, message: err.message },
          });
        }
        next(err);
      }
    }
  );

  // -------------------------------------------------------------------------
  // GET /api/auth/profile -- Get current user's profile
  // -------------------------------------------------------------------------

  router.get(
    '/profile',
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const profile = await authService.getProfile(req.userId!);

        res.json({ data: { user: profile } });
      } catch (err) {
        if (err instanceof AuthError) {
          return res.status(err.statusCode).json({
            error: { code: err.code, message: err.message },
          });
        }
        next(err);
      }
    }
  );

  // -------------------------------------------------------------------------
  // PUT /api/auth/profile -- Update current user's profile
  // -------------------------------------------------------------------------

  router.put(
    '/profile',
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { displayName, avatarUrl, settings } = req.body;

        const updatedProfile = await authService.updateProfile(req.userId!, {
          displayName,
          avatarUrl,
          settings,
        });

        res.json({ data: { user: updatedProfile } });
      } catch (err) {
        if (err instanceof AuthError) {
          return res.status(err.statusCode).json({
            error: { code: err.code, message: err.message },
          });
        }
        next(err);
      }
    }
  );

  // -------------------------------------------------------------------------
  // DELETE /api/auth/account -- Delete account (authenticated)
  // -------------------------------------------------------------------------

  router.delete(
    '/account',
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { password } = req.body;

        if (!password) {
          return res.status(400).json({
            error: {
              code: 'MISSING_FIELDS',
              message: 'Password confirmation is required to delete your account',
            },
          });
        }

        await authService.deleteAccount(req.userId!, password);

        res.json({
          data: {
            message: 'Account has been permanently deleted',
          },
        });
      } catch (err) {
        if (err instanceof AuthError) {
          return res.status(err.statusCode).json({
            error: { code: err.code, message: err.message },
          });
        }
        next(err);
      }
    }
  );

  return router;
}

/**
 * Default export for simple mounting when pool/secret are available
 * from environment. For advanced usage, use createAuthRouter().
 */
export const authRouter = Router();

// The router is a placeholder -- mount createAuthRouter() in server.ts
// with the actual pool and jwtSecret:
//
//   import { createAuthRouter } from './routes/auth';
//   app.use('/api/auth', createAuthRouter(pool, process.env.JWT_SECRET!));
