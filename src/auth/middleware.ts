// @ts-nocheck
/**
 * middleware.ts -- JWT authentication middleware for Express.
 *
 * Extracts the Bearer token from the Authorization header, verifies it
 * using the AuthService, and attaches the user ID to the request object.
 *
 * Provides two middleware variants:
 * - `authMiddleware` -- Strict: requests without valid tokens are rejected (401).
 * - `optionalAuthMiddleware` -- Lenient: unauthenticated requests pass through
 *   with `req.userId` set to undefined.
 */

import { Request, Response, NextFunction } from 'express';
import { AuthService, AuthError } from './auth-service';

// ---------------------------------------------------------------------------
// Strict Authentication Middleware
// ---------------------------------------------------------------------------

/**
 * Create Express middleware that requires a valid JWT access token.
 *
 * Extracts the token from the `Authorization: Bearer <token>` header,
 * verifies it with the AuthService, and sets `req.userId` on success.
 *
 * Returns 401 Unauthorized if:
 * - No Authorization header is present
 * - The header does not use the Bearer scheme
 * - The token is invalid, expired, or malformed
 *
 * @param authService - The AuthService instance for token verification.
 * @returns Express middleware function.
 *
 * @example
 * const auth = authMiddleware(authService);
 * router.get('/profile', auth, (req, res) => {
 *   const userId = req.userId; // guaranteed to be set
 * });
 */
export function authMiddleware(authService: AuthService) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    // Extract token from "Bearer <token>"
    const token = authHeader.replace('Bearer ', '');

    if (!token || token === authHeader) {
      return res.status(401).json({
        error: {
          code: 'INVALID_AUTH_HEADER',
          message: 'Authorization header must use Bearer scheme',
        },
      });
    }

    try {
      const payload = authService.verifyToken(token);
      req.userId = payload.userId;
      next();
    } catch (err) {
      const statusCode = err instanceof AuthError ? err.statusCode : 401;
      const code = err instanceof AuthError ? err.code : 'INVALID_TOKEN';
      const message =
        err instanceof AuthError
          ? err.message
          : 'Invalid or expired token';

      return res.status(statusCode).json({
        error: { code, message },
      });
    }
  };
}

// ---------------------------------------------------------------------------
// Optional Authentication Middleware
// ---------------------------------------------------------------------------

/**
 * Create Express middleware that optionally authenticates requests.
 *
 * If a valid Bearer token is present, `req.userId` is set.
 * If no token is present or the token is invalid, the request
 * proceeds without authentication (req.userId remains undefined).
 *
 * Useful for endpoints that behave differently for authenticated vs.
 * anonymous users (e.g., marketplace browse showing "my downloads").
 *
 * @param authService - The AuthService instance for token verification.
 * @returns Express middleware function.
 */
export function optionalAuthMiddleware(authService: AuthService) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');

      if (token && token !== authHeader) {
        try {
          const payload = authService.verifyToken(token);
          req.userId = payload.userId;
        } catch {
          // Token is invalid -- proceed without authentication
          req.userId = undefined;
        }
      }
    }

    next();
  };
}

// ---------------------------------------------------------------------------
// Rate Limiting Middleware (simple in-memory)
// ---------------------------------------------------------------------------

/**
 * Simple in-memory rate limiter for authentication endpoints.
 *
 * Tracks request counts per IP address within a sliding window.
 * Returns 429 Too Many Requests when the limit is exceeded.
 *
 * Note: In production, use Redis or a dedicated rate-limiting service
 * for distributed rate limiting across multiple server instances.
 *
 * @param maxRequests - Maximum requests per window.
 * @param windowMs - Time window in milliseconds.
 * @returns Express middleware function.
 */
export function rateLimitMiddleware(
  maxRequests: number = 10,
  windowMs: number = 15 * 60 * 1000
) {
  const requests = new Map<string, { count: number; resetAt: number }>();

  // Cleanup expired entries every minute
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of requests.entries()) {
      if (entry.resetAt < now) {
        requests.delete(key);
      }
    }
  }, 60 * 1000);

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = requests.get(key);

    if (!entry || entry.resetAt < now) {
      // New window
      requests.set(key, { count: 1, resetAt: now + windowMs });
      res.setHeader('X-RateLimit-Remaining', maxRequests - 1);
      return next();
    }

    entry.count++;

    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      res.setHeader('X-RateLimit-Remaining', 0);

      return res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.',
          retryAfter,
        },
      });
    }

    res.setHeader('X-RateLimit-Remaining', maxRequests - entry.count);
    next();
  };
}
