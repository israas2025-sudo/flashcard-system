/**
 * types.ts -- Type definitions for the authentication and user profile subsystem.
 *
 * Covers JWT payloads, authentication results, user profiles,
 * user settings, and password reset tokens.
 */

// ---------------------------------------------------------------------------
// JWT
// ---------------------------------------------------------------------------

/**
 * Payload encoded within a JWT access token.
 */
export interface JWTPayload {
  /** The user's unique identifier. */
  userId: string;

  /** The user's email address. */
  email: string;

  /** Token issued-at timestamp (seconds since epoch). */
  iat: number;

  /** Token expiration timestamp (seconds since epoch). */
  exp: number;
}

/**
 * Payload encoded within a JWT refresh token.
 */
export interface RefreshTokenPayload {
  /** The user's unique identifier. */
  userId: string;

  /** Token type discriminator. */
  type: 'refresh';

  /** Token issued-at timestamp (seconds since epoch). */
  iat: number;

  /** Token expiration timestamp (seconds since epoch). */
  exp: number;
}

// ---------------------------------------------------------------------------
// Authentication Results
// ---------------------------------------------------------------------------

/**
 * Returned on successful login or registration.
 */
export interface AuthResult {
  /** Short-lived JWT access token (15 minutes). */
  token: string;

  /** Long-lived JWT refresh token (7 days). */
  refreshToken: string;

  /** The authenticated user's profile. */
  user: UserProfile;
}

// ---------------------------------------------------------------------------
// User Profile
// ---------------------------------------------------------------------------

/**
 * Complete user profile with stats and settings.
 */
export interface UserProfile {
  /** Unique identifier (UUID). */
  id: string;

  /** User's email address. */
  email: string;

  /** Display name shown in the UI. */
  displayName: string;

  /** URL to the user's avatar image, or null if not set. */
  avatarUrl: string | null;

  /** When the account was created. */
  createdAt: Date;

  /** User-configurable settings. */
  settings: UserSettings;

  /** Aggregated statistics. */
  stats: UserStats;
}

/**
 * Aggregated user statistics for profile display.
 */
export interface UserStats {
  /** Total number of cards across all decks. */
  totalCards: number;

  /** Total number of reviews completed. */
  totalReviews: number;

  /** Current consecutive study day streak. */
  streakDays: number;

  /** Current level derived from XP. */
  level: number;

  /** Total accumulated experience points. */
  xp: number;
}

// ---------------------------------------------------------------------------
// User Settings
// ---------------------------------------------------------------------------

/**
 * User-configurable settings stored as JSONB in the users table.
 */
export interface UserSettings {
  /** Hour (0-23) at which a new study day begins. */
  dayBoundaryHour: number;

  /** Default desired retention for FSRS (0-1). */
  defaultDesiredRetention: number;

  /** UI theme preference. */
  theme: 'light' | 'dark' | 'auto';

  /** Primary accent color hex code. */
  accentColor: string;

  /** Whether to reduce motion/animations for accessibility. */
  reducedMotion: boolean;

  /** Whether sound effects are enabled. */
  soundEnabled: boolean;

  /** Sound volume level (0-1). */
  soundVolume: number;

  /** Whether the gamification system is enabled. */
  gamificationEnabled: boolean;

  /** Ordered list of language priorities for study. */
  languagePriorities: string[];

  /** User's timezone identifier (e.g., 'America/New_York'). */
  timezone: string;
}

// ---------------------------------------------------------------------------
// Password Reset
// ---------------------------------------------------------------------------

/**
 * A password reset token stored in the database.
 */
export interface PasswordResetToken {
  /** Unique identifier. */
  id: string;

  /** The user this token belongs to. */
  userId: string;

  /** The hashed reset token. */
  tokenHash: string;

  /** When this token expires. */
  expiresAt: Date;

  /** Whether this token has already been used. */
  used: boolean;

  /** When this token was created. */
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Express Request Extension
// ---------------------------------------------------------------------------

/**
 * Extends the Express Request type to include the authenticated user ID.
 */
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}
