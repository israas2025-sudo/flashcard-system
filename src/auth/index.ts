// @ts-nocheck
/**
 * Auth Module -- Public API surface.
 *
 * Re-exports the AuthService, middleware functions, AuthError,
 * and all type definitions for the authentication subsystem.
 */

// Service
export { AuthService, AuthError } from './auth-service';

// Middleware
export {
  authMiddleware,
  optionalAuthMiddleware,
  rateLimitMiddleware,
} from './middleware';

// Types
export type {
  AuthResult,
  JWTPayload,
  RefreshTokenPayload,
  UserProfile,
  UserSettings,
  UserStats,
  PasswordResetToken,
} from './types';
